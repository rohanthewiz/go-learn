/* VPC CIDR & Subnetting — Networking (Medium). The address-planning math the
 * SAA exam tests constantly: usable IPs per subnet (minus AWS's 5 reserved
 * addresses) and carving a VPC CIDR into equal child subnets. Pure integer
 * bit arithmetic — the parse/format helpers are provided so the learner
 * focuses on the CIDR math itself.
 */
(function () {
	'use strict';
	var T = GoLearnAWS;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="a /16 VPC quartered into four /18 subnets">' +
		// outer VPC box
		'<rect x="120" y="34" width="320" height="130" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="120" y="22" class="lbl">VPC 10.0.0.0/16 — 65,536 addresses</text>' +
		// quarter dividers
		'<line x1="280" y1="34" x2="280" y2="164" stroke="var(--edge)"/>' +
		'<line x1="120" y1="99" x2="440" y2="99" stroke="var(--edge)"/>' +
		// quarter labels
		'<text x="200" y="62" text-anchor="middle">10.0.0.0/18</text>' +
		'<text x="200" y="82" text-anchor="middle" class="lbl">AZ-a public</text>' +
		'<text x="360" y="62" text-anchor="middle">10.0.64.0/18</text>' +
		'<text x="360" y="82" text-anchor="middle" class="lbl">AZ-a private</text>' +
		'<text x="200" y="127" text-anchor="middle">10.0.128.0/18</text>' +
		'<text x="200" y="147" text-anchor="middle" class="lbl">AZ-b public</text>' +
		'<text x="360" y="127" text-anchor="middle">10.0.192.0/18</text>' +
		'<text x="360" y="147" text-anchor="middle" class="lbl">AZ-b private</text>' +
		// split annotation
		'<path d="M 78 99 L 112 99" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowVPC)"/>' +
		'<text x="8" y="88" class="lbl">split ×4 =</text>' +
		'<text x="8" y="104" class="lbl">prefix +2 bits</text>' +
		'<text x="120" y="182" class="lbl">each /18 = 16,384 addresses, 16,379 usable (AWS reserves 5 per subnet)</text>' +
		'<defs><marker id="dgArrowVPC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'vpc-cidr-subnets',
		title: 'VPC CIDR & Subnetting',
		nav: 'VPC CIDR Math',
		difficulty: 'Medium',
		category: 'Networking',
		task: 'Implement UsableIPs and SplitSubnets — make all 6 tests pass.',

		prose: [
			'<h2>VPC CIDR &amp; Subnetting</h2>' +
			'<p>You are designing a VPC for a three-tier application that must span two ' +
			'Availability Zones, with a public and a private subnet in each AZ. The network ' +
			'team hands you <code>10.0.0.0/16</code> and two questions every Solutions ' +
			'Architect answers before clicking “Create subnet”: <em>how many hosts fit in ' +
			'each subnet</em>, and <em>what are the child CIDR blocks</em>?</p>' +
			'<p>Two wrinkles make this an exam favorite rather than plain binary math:</p>' +
			'<ul>' +
			'<li><strong>AWS reserves 5 addresses in every subnet</strong>, not the 2 classic ' +
			'networking reserves: the <em>network address</em> (.0), the <em>VPC router</em> ' +
			'(.1), the <em>DNS server</em> (.2), one <em>reserved for future use</em> (.3), ' +
			'and the <em>broadcast address</em> (the last one — VPCs don’t support broadcast, ' +
			'but AWS keeps it anyway). So a /24 gives 251 hosts, not 254.</li>' +
			'<li>The smallest subnet AWS allows is a <code>/28</code> — 16 addresses, only ' +
			'11 usable. The largest is a /16.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement two functions (the CIDR parse/format helpers are provided):</p>' +
			'<ul>' +
			'<li><code>UsableIPs(prefixLen int) int</code> — 2<sup>32−prefixLen</sup> minus ' +
			'the 5 AWS-reserved addresses.</li>' +
			'<li><code>SplitSubnets(cidr string, n int) []string</code> — split the block ' +
			'into <code>n</code> equal child subnets (<code>n</code> is always a power of ' +
			'two). Splitting into n children adds log₂(n) bits to the prefix; return the ' +
			'child CIDR strings in address order. Splitting into 1 returns the block itself.</li>' +
			'</ul>' +
			'<h3>Examples</h3>',
			{ code: 'UsableIPs(24)                     →  251        // 256 − 5\nUsableIPs(28)                     →  11         // smallest AWS subnet\nSplitSubnets("10.0.0.0/16", 4)    →  [10.0.0.0/18 10.0.64.0/18 10.0.128.0/18 10.0.192.0/18]\nSplitSubnets("192.168.1.0/24", 2) →  [192.168.1.0/25 192.168.1.128/25]', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'import (',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// parseCIDR splits "a.b.c.d/len" into the address as a big-endian',
			'// uint32 and the prefix length. A uint32 makes subnet math trivial:',
			'// adding a block size steps to the next subnet, shifting extracts',
			'// octets. Input is assumed well-formed (the harness only sends valid',
			'// CIDRs), so parse errors are ignored.',
			'func parseCIDR(s string) (uint32, int) {',
			'	parts := strings.Split(s, "/")',
			'	prefixLen, _ := strconv.Atoi(parts[1])',
			'	var ip uint32',
			'	for _, oct := range strings.Split(parts[0], ".") {',
			'		v, _ := strconv.Atoi(oct)',
			'		ip = ip<<8 | uint32(v)',
			'	}',
			'	return ip, prefixLen',
			'}',
			'',
			'// formatIPv4 renders a big-endian uint32 back to dotted-quad form.',
			'func formatIPv4(ip uint32) string {',
			'	octs := make([]string, 4)',
			'	for i := 3; i >= 0; i-- {',
			'		octs[i] = strconv.Itoa(int(ip & 255))',
			'		ip >>= 8',
			'	}',
			'	return strings.Join(octs, ".")',
			'}',
			'',
			'// UsableIPs returns the number of host addresses available in a',
			'// subnet with the given prefix length, after subtracting the 5',
			'// addresses AWS reserves in every subnet (network, VPC router,',
			'// DNS, future use, broadcast).',
			'func UsableIPs(prefixLen int) int {',
			'	return -1 // your code here',
			'}',
			'',
			'// SplitSubnets divides cidr into n equal child subnets (n is a',
			'// power of two) and returns their CIDR strings in address order.',
			'// Splitting into n children adds log2(n) bits to the prefix.',
			'func SplitSubnets(cidr string, n int) []string {',
			'	return nil // your code here',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"reflect"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		// usable-mode fields (cidr == "" means this is a UsableIPs case)',
			'		prefixLen int',
			'		wantN     int',
			'		// split-mode fields',
			'		cidr  string',
			'		n     int',
			'		wantS []string',
			'	}',
			'	cases := []tc{',
			'		{name: "UsableIPs(/24) — the classic subnet", prefixLen: 24, wantN: 251},',
			'		{name: "UsableIPs(/28) — smallest AWS allows", prefixLen: 28, wantN: 11},',
			'		{name: "UsableIPs(/16) — a whole VPC as one subnet", prefixLen: 16, wantN: 65531},',
			'		{name: "split 10.0.0.0/16 into 4", cidr: "10.0.0.0/16", n: 4,',
			'			wantS: []string{"10.0.0.0/18", "10.0.64.0/18", "10.0.128.0/18", "10.0.192.0/18"}},',
			'		{name: "split 192.168.1.0/24 into 2", cidr: "192.168.1.0/24", n: 2,',
			'			wantS: []string{"192.168.1.0/25", "192.168.1.128/25"}},',
			'		{name: "split into 1 returns the block itself", cidr: "172.16.4.0/22", n: 1,',
			'			wantS: []string{"172.16.4.0/22"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name}',
			'		if c.cidr == "" {',
			'			r["want"] = fmt.Sprintf("%d", c.wantN)',
			'			runCase(r, func() {',
			'				got := UsableIPs(c.prefixLen)',
			'				r["pass"] = got == c.wantN',
			'				r["got"] = fmt.Sprintf("%d", got)',
			'			})',
			'		} else {',
			'			r["want"] = fmt.Sprintf("%v", c.wantS)',
			'			runCase(r, func() {',
			'				got := SplitSubnets(c.cidr, c.n)',
			'				r["pass"] = reflect.DeepEqual(got, c.wantS)',
			'				r["got"] = fmt.Sprintf("%v", got)',
			'			})',
			'		}',
			'		results = append(results, r)',
			'	}',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'import (',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// parseCIDR splits "a.b.c.d/len" into the address as a big-endian',
			'// uint32 and the prefix length. A uint32 makes subnet math trivial:',
			'// adding a block size steps to the next subnet, shifting extracts',
			'// octets. Input is assumed well-formed (the harness only sends valid',
			'// CIDRs), so parse errors are ignored.',
			'func parseCIDR(s string) (uint32, int) {',
			'	parts := strings.Split(s, "/")',
			'	prefixLen, _ := strconv.Atoi(parts[1])',
			'	var ip uint32',
			'	for _, oct := range strings.Split(parts[0], ".") {',
			'		v, _ := strconv.Atoi(oct)',
			'		ip = ip<<8 | uint32(v)',
			'	}',
			'	return ip, prefixLen',
			'}',
			'',
			'// formatIPv4 renders a big-endian uint32 back to dotted-quad form.',
			'func formatIPv4(ip uint32) string {',
			'	octs := make([]string, 4)',
			'	for i := 3; i >= 0; i-- {',
			'		octs[i] = strconv.Itoa(int(ip & 255))',
			'		ip >>= 8',
			'	}',
			'	return strings.Join(octs, ".")',
			'}',
			'',
			'// UsableIPs returns the host addresses available at a prefix length.',
			'//',
			'// The block holds 2^(32−prefixLen) addresses; AWS then takes 5 off',
			'// the top in EVERY subnet regardless of size: the network address,',
			'// the VPC router (base+1), the DNS resolver (base+2), one reserved',
			'// for future use (base+3), and the broadcast address (the last).',
			'// That constant −5 is why small subnets hurt disproportionately:',
			'// a /28 loses 5 of its 16 addresses — over 30% overhead.',
			'func UsableIPs(prefixLen int) int {',
			'	return (1 << uint(32-prefixLen)) - 5',
			'}',
			'',
			'// SplitSubnets divides cidr into n equal child subnets (n is a',
			'// power of two) and returns their CIDR strings in address order.',
			'//',
			'// The whole procedure is two facts about binary prefixes:',
			'//   1. halving a block once = lengthening the prefix by 1 bit,',
			'//      so n children need prefix + log2(n);',
			'//   2. consecutive children are exactly one block size apart',
			'//      (2^(32−newPrefix) addresses), so child i starts at',
			'//      base + i×blockSize — no per-octet carrying to reason about,',
			'//      because the address lives in a uint32.',
			'func SplitSubnets(cidr string, n int) []string {',
			'	base, prefixLen := parseCIDR(cidr)',
			'',
			'	// log2(n) by counting doublings; n is guaranteed a power of two,',
			'	// so the loop lands exactly (no math.Log2 float round-off risk).',
			'	extraBits := 0',
			'	for 1<<uint(extraBits) < n {',
			'		extraBits++',
			'	}',
			'	newPrefix := prefixLen + extraBits',
			'	blockSize := uint32(1) << uint(32-newPrefix)',
			'',
			'	children := make([]string, 0, n)',
			'	for i := 0; i < n; i++ {',
			'		start := base + uint32(i)*blockSize',
			'		children = append(children, formatIPv4(start)+"/"+strconv.Itoa(newPrefix))',
			'	}',
			'	return children',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force: memorize a table</h3>' +
			'<p>Most exam-prep decks hand you a lookup table (/24 → 251, /26 → 59, …) and ' +
			'hope it sticks. It doesn’t need to, because the whole topic is one formula.</p>' +
			'<h3>The insight: it’s all powers of two</h3>' +
			'<p>The general principle is <strong>CIDR arithmetic</strong>: a /p block holds ' +
			'2<sup>32−p</sup> addresses, and every extra prefix bit halves the block. That ' +
			'single fact answers both questions:</p>',
			{ code: '// hosts: size minus AWS\'s 5 reserved (network, router, DNS, future, broadcast)\nusable := (1 << uint(32-prefixLen)) - 5\n\n// splitting into n children = adding log2(n) prefix bits;\n// child i starts one block size (2^(32-newPrefix)) after child i-1\nstart := base + uint32(i)*blockSize' },
			'<p>Two details the exam probes:</p>' +
			'<ul>' +
			'<li><strong>The −5 bites hardest at the bottom.</strong> AWS reserves the same ' +
			'five addresses whether the subnet is a /16 or a /28. In a /16 that overhead is ' +
			'0.008%; in a /28 (the smallest AWS permits) it eats 5 of 16 addresses, leaving ' +
			'11. Questions that say “each subnet must hold at least N instances” expect you ' +
			'to add 5 before sizing, then round up to the next power of two.</li>' +
			'<li><strong>Keeping the address in a uint32</strong> turns subnetting into plain ' +
			'integer addition — the dotted-quad form is just presentation. This is exactly how ' +
			'routing tables, IPAM tools, and <code>net/netip</code> do it internally.</li>' +
			'</ul>' +
			'<h3>Exam takeaway</h3>' +
			'<p>Usable IPs per AWS subnet = 2<sup>32−prefix</sup> − 5 (network, router, DNS, ' +
			'future-use, broadcast); the smallest subnet is a /28 with 11 usable, the largest ' +
			'VPC block a /16. And because VPC peering and Transit Gateway <em>refuse ' +
			'overlapping CIDRs</em> — there is no NAT between peered VPCs — plan every VPC’s ' +
			'block up front from one non-overlapping scheme (e.g. 10.0.0.0/16, 10.1.0.0/16, ' +
			'10.2.0.0/16 per environment). A question about “VPCs that can’t communicate ' +
			'after peering” is nearly always an overlapping-CIDR question.</p>',
		],
		complexity: { time: 'O(n) for n child subnets', space: 'O(n)' },
	});
})();
