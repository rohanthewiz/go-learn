/* CIDR Subnetting — IP: Addressing (Medium). Contains, Broadcast, and
 * UsableHosts as pure functions over a CIDR block. The harness probes the
 * boundaries people get wrong on real networks: the network id and broadcast
 * are inside the block but not usable, adjacent /25s do not overlap, and the
 * RFC 3021 special cases (/31, /32) break the "2^h − 2" formula on purpose.
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// The 256 addresses of a /24 as one bar: the first and last are consumed
	// by the protocol itself, everything between is assignable. No <marker>
	// needed, so no id to collide (prefix would be dgArrowNCS).
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 170" width="520" height="170" role="img" aria-label="a /24 block: network id .0 and broadcast .255 are reserved, .1 through .254 are usable hosts">' +
		'<text x="20" y="24" class="lbl">10.0.0.0/24 — 256 addresses, 254 hosts</text>' +
		// network id cell
		'<rect x="20" y="44" width="66" height="44" rx="5" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="53" y="71" text-anchor="middle">.0</text>' +
		'<text x="53" y="106" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">network id</text>' +
		'<text x="53" y="120" text-anchor="middle" class="lbl">names the wire</text>' +
		// usable range
		'<rect x="94" y="44" width="332" height="44" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="260" y="71" text-anchor="middle">.1 … .254</text>' +
		'<text x="260" y="106" text-anchor="middle" class="lbl" style="fill:var(--ok)">254 usable hosts</text>' +
		// broadcast cell
		'<rect x="434" y="44" width="66" height="44" rx="5" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="467" y="71" text-anchor="middle">.255</text>' +
		'<text x="467" y="106" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">broadcast</text>' +
		'<text x="467" y="120" text-anchor="middle" class="lbl">everyone here</text>' +
		'<text x="20" y="152" class="lbl">a /31 has only 2 addresses — no room for either reservation, so RFC 3021 keeps both usable</text>' +
		'</svg>';

	T.problem({
		id: 'cidr-subnetting',
		title: 'CIDR Subnetting: Contains, Broadcast, Usable Hosts',
		nav: 'CIDR subnetting',
		difficulty: 'Medium',
		category: 'IP: Addressing',
		task: 'Implement Contains, Broadcast, and UsableHosts over a CIDR block — including the RFC 3021 /31 and /32 cases.',

		prose: [
			'<h2>CIDR Subnetting: Contains, Broadcast, Usable Hosts</h2>' +
			'<p>You carve a VPC into subnets, hand a <code>/24</code> to a team, and ' +
			'capacity planning says 256 pods will fit. They won’t: two of those ' +
			'addresses were never yours to assign, and the cloud provider quietly ' +
			'reserves a few more. Meanwhile a peering request gets rejected because ' +
			'the two ranges “overlap” — a claim you can only check with a mask, not ' +
			'by eyeballing dotted quads. All of this is three small functions over a ' +
			'<code>CIDR</code>:</p>' +
			'<ul>' +
			'<li><strong>Contains.</strong> An address is inside a block iff it agrees ' +
			'with it on every network bit: <code>ip &amp; mask == Addr &amp; mask</code>. ' +
			'Masking <em>both</em> sides matters — it makes ' +
			'<code>10.0.0.7/24</code> and <code>10.0.0.0/24</code> name the same ' +
			'block, so the answer never depends on which member address the config ' +
			'happened to write down.</li>' +
			'<li><strong>Broadcast.</strong> The all-ones-host address: network bits ' +
			'kept, every host bit set — <code>(Addr &amp; mask) | ^mask</code>. A ' +
			'packet sent there is delivered to every host on the subnet.</li>' +
			'<li><strong>UsableHosts.</strong> A prefix of length <em>p</em> leaves ' +
			'<code>32−p</code> host bits, so <code>2^(32−p)</code> addresses — minus ' +
			'the all-zeros host (the network id) and the all-ones host (broadcast): ' +
			'<code>2^(32−p) − 2</code>. Except at the bottom: a <code>/31</code> has ' +
			'only two addresses, and RFC&nbsp;3021 declares both usable for ' +
			'point-to-point links (answer: 2); a <code>/32</code> is a single host ' +
			'route (answer: 1).</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the three functions. <code>mask()</code> is provided. ' +
			'<code>Contains</code> must mask both sides; <code>Broadcast</code> must ' +
			'work even when <code>Addr</code> isn’t the network address; ' +
			'<code>UsableHosts</code> must apply the general formula for ' +
			'<code>p ≤ 30</code> and the special cases above it.</p>',
			{ lang: 'txt', code: 'c := 10.0.0.0/25            mask = 0xFFFFFF80\nContains(c, 10.0.0.127)  -> true   (last address of the lower half)\nContains(c, 10.0.0.128)  -> false  (first address of the NEXT /25)\nBroadcast(c)             -> 10.0.0.127\nUsableHosts(c)           -> 126    (2^7 - 2)' },
		],

		starter: [
			'package main',
			'',
			'// CIDR is a block in prefix notation: Addr is any address inside it',
			'// (configs often write the network address, but nothing guarantees it)',
			'// and Prefix is how many leading bits name the network.',
			'type CIDR struct {',
			'	Addr   uint32',
			'	Prefix int',
			'}',
			'',
			'// mask returns the netmask: Prefix ones followed by zeros. Shifting',
			'// all-ones LEFT keeps the ones at the top, where network bits live.',
			'// Prefix 0 is explicit: /0 has no network bits at all.',
			'func (c CIDR) mask() uint32 {',
			'	if c.Prefix <= 0 {',
			'		return 0',
			'	}',
			'	return ^uint32(0) << uint(32-c.Prefix)',
			'}',
			'',
			'// Contains reports whether ip falls inside the block: ip and the block',
			'// must agree on every network bit. Mask BOTH sides — c.Addr may be any',
			'// member of the block, not necessarily its network address.',
			'func Contains(c CIDR, ip uint32) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// Broadcast returns the block\'s all-ones-host address: network bits',
			'// kept, every host bit set.',
			'func Broadcast(c CIDR) uint32 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// UsableHosts returns how many addresses in the block can be assigned',
			'// to hosts: 2^(32-Prefix) minus the network id and broadcast for',
			'// Prefix <= 30; per RFC 3021 a /31 point-to-point link uses both of',
			'// its addresses (2), and a /32 is a single host route (1).',
			'func UsableHosts(c CIDR) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'// parseQuad/parseCIDR/quad live harness-side so the cases read in the',
			'// notation engineers actually use, not raw uint32 literals.',
			'func parseQuad(s string) uint32 {',
			'	var addr uint32',
			'	for _, part := range strings.Split(s, ".") {',
			'		n, _ := strconv.Atoi(part)',
			'		addr = addr<<8 | uint32(n)',
			'	}',
			'	return addr',
			'}',
			'',
			'func parseCIDR(s string) CIDR {',
			'	parts := strings.Split(s, "/")',
			'	p, _ := strconv.Atoi(parts[1])',
			'	return CIDR{Addr: parseQuad(parts[0]), Prefix: p}',
			'}',
			'',
			'func quad(addr uint32) string {',
			'	return fmt.Sprintf("%d.%d.%d.%d", addr>>24&0xff, addr>>16&0xff, addr>>8&0xff, addr&0xff)',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"network id and broadcast are both INSIDE the block (contained, just not assignable)",',
			'			"contains .0: true, contains .255: true",',
			'			func() string {',
			'				c := parseCIDR("10.0.0.0/24")',
			'				return fmt.Sprintf("contains .0: %v, contains .255: %v",',
			'					Contains(c, parseQuad("10.0.0.0")), Contains(c, parseQuad("10.0.0.255")))',
			'			}},',
			'		{"adjacent /25s do not overlap: .127 is the last of the lower half, .128 starts the upper",',
			'			"contains .127: true, contains .128: false",',
			'			func() string {',
			'				c := parseCIDR("10.0.0.0/25")',
			'				return fmt.Sprintf("contains .127: %v, contains .128: %v",',
			'					Contains(c, parseQuad("10.0.0.127")), Contains(c, parseQuad("10.0.0.128")))',
			'			}},',
			'		{"aggregation: the /16 covers every /24 carved out of it",',
			'			"contains 10.1.42.7: true",',
			'			func() string {',
			'				return fmt.Sprintf("contains 10.1.42.7: %v", Contains(parseCIDR("10.1.0.0/16"), parseQuad("10.1.42.7")))',
			'			}},',
			'		{"UsableHosts(/24): 256 addresses minus network id minus broadcast",',
			'			"254",',
			'			func() string { return strconv.Itoa(UsableHosts(parseCIDR("10.0.0.0/24"))) }},',
			'		{"UsableHosts(/30): the classic 4-address WAN link — 2 hosts",',
			'			"2",',
			'			func() string { return strconv.Itoa(UsableHosts(parseCIDR("192.0.2.0/30"))) }},',
			'		{"RFC 3021: /31 point-to-point uses BOTH addresses; /32 is one host route",',
			'			"/31: 2, /32: 1",',
			'			func() string {',
			'				return fmt.Sprintf("/31: %d, /32: %d",',
			'					UsableHosts(parseCIDR("192.0.2.0/31")), UsableHosts(parseCIDR("192.0.2.1/32")))',
			'			}},',
			'		{"Broadcast(10.0.0.0/24) is the all-ones-host address",',
			'			"10.0.0.255",',
			'			func() string { return quad(Broadcast(parseCIDR("10.0.0.0/24"))) }},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			got := c.got()',
			'			r["pass"] = got == c.want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// CIDR is a block in prefix notation: Addr is any address inside it',
			'// (configs often write the network address, but nothing guarantees it)',
			'// and Prefix is how many leading bits name the network.',
			'type CIDR struct {',
			'	Addr   uint32',
			'	Prefix int',
			'}',
			'',
			'// mask returns the netmask: Prefix ones followed by zeros. Shifting',
			'// all-ones LEFT keeps the ones at the top, where network bits live.',
			'// Prefix 0 is explicit: /0 has no network bits at all.',
			'func (c CIDR) mask() uint32 {',
			'	if c.Prefix <= 0 {',
			'		return 0',
			'	}',
			'	return ^uint32(0) << uint(32-c.Prefix)',
			'}',
			'',
			'// Contains reports whether ip falls inside the block. Masking BOTH',
			'// sides normalizes c.Addr to its network address first, so',
			'// {10.0.0.7, /24} and {10.0.0.0, /24} behave identically — membership',
			'// is a property of the block, not of which member named it.',
			'func Contains(c CIDR, ip uint32) bool {',
			'	m := c.mask()',
			'	return ip&m == c.Addr&m',
			'}',
			'',
			'// Broadcast keeps the network bits and sets every host bit. ^m is',
			'// exactly the host-bits mask (the complement of the netmask), so',
			'// network|^m is "this block, all-ones host" with no arithmetic on',
			'// block sizes — it works unchanged for any prefix.',
			'func Broadcast(c CIDR) uint32 {',
			'	m := c.mask()',
			'	return (c.Addr & m) | ^m',
			'}',
			'',
			'// UsableHosts: 32-Prefix host bits give 2^(32-Prefix) addresses; the',
			'// all-zeros host (network id) and all-ones host (broadcast) are',
			'// reserved by the protocol, hence -2. The formula collapses at the',
			'// bottom — a /31 would yield 0 and a /32 would yield -1 — which is',
			'// precisely why RFC 3021 redefines them: a point-to-point link has',
			'// exactly two endpoints and needs no broadcast, so both addresses',
			'// are usable; a /32 names one host outright.',
			'func UsableHosts(c CIDR) int {',
			'	switch {',
			'	case c.Prefix >= 32:',
			'		return 1 // host route: the address IS the host',
			'	case c.Prefix == 31:',
			'		return 2 // RFC 3021 point-to-point: no network id, no broadcast',
			'	}',
			'	return 1<<uint(32-c.Prefix) - 2',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why minus two</h3>' +
			'<p>The two reserved addresses are protocol machinery, not convention. ' +
			'The <strong>all-ones host</strong> is the subnet broadcast: ARP requests, ' +
			'DHCP discovery, and anything that must reach “everyone here” is sent to ' +
			'it, so no single host may claim it. The <strong>all-zeros host</strong> ' +
			'is the network’s own name — it is what routing tables store and what ' +
			'<code>Contains</code> effectively compares against — and very old BSD ' +
			'stacks also treated it as a second broadcast form, which cemented the ' +
			'reservation. Every subnet you will ever size pays this two-address tax' +
			'… except the smallest ones:</p>' +
			'<ul>' +
			'<li><strong>/31 (RFC 3021):</strong> a router-to-router link has exactly ' +
			'two endpoints and nothing to broadcast to that unicast can’t reach. ' +
			'Before RFC 3021 these links burned a /30 — four addresses for two ' +
			'machines. At ISP scale (thousands of point-to-point links) the /31 ' +
			'halved that overhead, and it is the standard link prefix in modern ' +
			'datacenter fabrics.</li>' +
			'<li><strong>/32:</strong> zero host bits — the block <em>is</em> one ' +
			'address. Loopbacks on routers, host routes, and every ' +
			'<code>kubectl get svc</code> ClusterIP behave this way: an identity, ' +
			'not a network.</li>' +
			'</ul>' +
			'<h3>Mask both sides</h3>' +
			'<p>The one-line body of <code>Contains</code> hides the choice that ' +
			'matters:</p>',
			{ code: 'm := c.mask()\nreturn ip&m == c.Addr&m // NOT ip&m == c.Addr\n\nm = c.mask()\nreturn (c.Addr & m) | ^m // ^m is the host-bits mask: broadcast = all ones there' },
			'<p>Comparing against an unmasked <code>c.Addr</code> works only while ' +
			'configs are disciplined about writing network addresses. The moment ' +
			'someone writes <code>10.0.0.7/24</code> (their <em>interface</em> ' +
			'address with its prefix — which is exactly what <code>ip addr</code> ' +
			'shows), the unmasked version reports every membership as false. ' +
			'Normalizing both sides makes the function total over sloppy input, ' +
			'which is the input real systems have.</p>' +
			'<h3>In the real world</h3>' +
			'<p>This trio is the arithmetic under <code>ipcalc</code>, VPC subnet ' +
			'sizing, and every “CIDR ranges must not overlap” validation in ' +
			'Terraform or a peering request (two blocks overlap iff one contains ' +
			'the other’s network address). When a “/24 subnet” mysteriously holds ' +
			'fewer pods than 254: cloud providers reserve extra addresses beyond ' +
			'the protocol’s two — AWS takes five per subnet (.0, .1 router, .2 DNS, ' +
			'.3 spare, .255) — so capacity math that starts from 2<sup>h</sup> is ' +
			'wrong twice.</p>',
		],
		complexity: { time: 'O(1) per query — a mask, an AND, a compare', space: 'O(1)' },
	});
})();
