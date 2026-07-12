/* Security Group Evaluation — Security & IAM (Medium). Implement the SG
 * inbound decision: a packet is allowed iff ANY rule matches on protocol,
 * port range, and source CIDR. The CIDR check is real mask arithmetic on a
 * hand-rolled uint32 IP (the trimmed stdlib has no net package). Exact
 * table harness.
 */
(function () {
	'use strict';
	var T = GoLearnAWS;

	// A packet against the rule list: union semantics — first hit admits it,
	// no rule can reject it, silence means drop.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 190" width="560" height="190" role="img" aria-label="a packet is checked against every security group rule; any match allows it, otherwise it is dropped">' +
		'<defs><marker id="dgArrowSGE" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker>' +
		'<marker id="dgArrowSGEok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		// packet
		'<rect x="14" y="70" width="128" height="50" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="78" y="90" text-anchor="middle" class="lbl">tcp :443</text>' +
		'<text x="78" y="106" text-anchor="middle" class="lbl">from 10.0.1.255</text>' +
		'<path d="M 142 95 L 182 95" fill="none" stroke="var(--dim)" stroke-width="1.5" marker-end="url(#dgArrowSGE)"/>' +
		// rule list
		'<text x="186" y="30" class="lbl">security group (allow rules only)</text>' +
		'<rect x="186" y="40" width="230" height="30" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="198" y="60" class="lbl">tcp 22–22 · 203.0.113.7/32 — no</text>' +
		'<rect x="186" y="78" width="230" height="30" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.8"/>' +
		'<text x="198" y="98" class="lbl">tcp 443–443 · 10.0.1.0/24 — MATCH</text>' +
		'<rect x="186" y="116" width="230" height="30" rx="5" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'<text x="198" y="136" class="lbl">udp 53–53 · 0.0.0.0/0 — not reached</text>' +
		'<path d="M 416 93 L 458 93" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowSGEok)"/>' +
		'<text x="464" y="97" style="fill:var(--ok)">allow</text>' +
		'<text x="186" y="172" class="lbl">no rule matched → drop. There are no deny rules to write — silence is the deny.</text>' +
		'</svg>';

	T.problem({
		id: 'security-group-eval',
		title: 'Security Group Evaluation',
		nav: 'Security group eval',
		difficulty: 'Medium',
		category: 'Security & IAM',
		task: 'Implement AllowInbound (and its CIDR check) — make all 7 tests pass.',

		prose: [
			'<h2>Security Group Evaluation</h2>' +
			'<p>You are designing the network perimeter for an EC2 fleet. A packet ' +
			'arrives — protocol, destination port, source IP — and the instance’s ' +
			'security group must decide: let it in or drop it. Security groups are ' +
			'pure <em>allow-lists</em>: rules can only admit traffic, never reject ' +
			'it, so the decision is a union — <strong>any</strong> matching rule ' +
			'allows the packet, and no match means drop.</p>',
			{ code: 'type Rule struct {\n\tProto    string // "tcp", "udp", "icmp", or "-1" = all protocols\n\tFromPort int    // inclusive\n\tToPort   int    // inclusive\n\tCIDR     string // e.g. "10.0.1.0/24", "0.0.0.0/0"\n}', lang: 'txt' },
			'<p>Implement <code>AllowInbound(rules []Rule, proto string, port int, ' +
			'srcIP string) bool</code>. A rule matches when <em>all three</em> hold:</p>' +
			'<ul>' +
			'<li><strong>Protocol:</strong> <code>rule.Proto == proto</code>, or the rule’s ' +
			'proto is <code>"-1"</code> (AWS’s “all protocols”).</li>' +
			'<li><strong>Port:</strong> <code>FromPort ≤ port ≤ ToPort</code> (inclusive ' +
			'range).</li>' +
			'<li><strong>Source:</strong> <code>srcIP</code> lies inside the rule’s CIDR ' +
			'block.</li>' +
			'</ul>' +
			'<h3>CIDR containment by hand</h3>' +
			'<p>An IPv4 address is just a 32-bit integer (the provided ' +
			'<code>parseIPv4</code> builds it). A block <code>10.0.1.0/24</code> means: ' +
			'the top 24 bits are fixed, the rest are free. So containment is mask ' +
			'arithmetic — build a mask with the top <code>prefix</code> bits set and ' +
			'compare the masked address to the masked network:</p>',
			{ code: '10.0.1.0/24  →  network 00001010.00000000.00000001.xxxxxxxx\nmask /24     →          11111111.11111111.11111111.00000000\ncontains ip  ⇔  ip & mask == network & mask', lang: 'txt' },
			'<div class="tip">Watch the <code>/0</code> edge: <code>0.0.0.0/0</code> must ' +
			'match <em>everything</em>, but building its mask by shifting a ' +
			'<code>uint32</code> left by 32 is a classic trap (in many languages that ' +
			'shift is undefined; here it just isn’t the mask you want to reason about). ' +
			'Handle prefix 0 as an explicit “matches all” case.</div>' +
			DIAGRAM,
		],

		starter: [
			'package main',
			'',
			'import (',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// Rule is one inbound security-group rule. Proto "-1" means all',
			'// protocols; FromPort/ToPort are an inclusive range; CIDR is the',
			'// allowed source block ("0.0.0.0/0" = anywhere).',
			'type Rule struct {',
			'	Proto    string',
			'	FromPort int',
			'	ToPort   int',
			'	CIDR     string',
			'}',
			'',
			'// parseIPv4 converts a dotted-quad address ("10.0.1.7") into one',
			'// uint32 so containment becomes plain mask arithmetic. Hand-rolled',
			'// because the trimmed stdlib here has no net package: each octet',
			'// occupies 8 bits, most significant first — exactly the order the',
			'// dotted form is written in. (Provided — use it as-is.)',
			'func parseIPv4(s string) uint32 {',
			'	var ip uint32',
			'	for _, part := range strings.Split(s, ".") {',
			'		n, _ := strconv.Atoi(part)',
			'		ip = ip<<8 | uint32(n)',
			'	}',
			'	return ip',
			'}',
			'',
			'// cidrContains reports whether ip (dotted quad) lies inside the',
			'// CIDR block ("10.0.1.0/24"). Split on "/", parse both sides, then',
			'// compare under the prefix mask. Careful: prefix 0 must match',
			'// everything — handle it before doing any shifting.',
			'func cidrContains(cidr, ip string) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// AllowInbound decides a packet\'s fate: allowed iff ANY rule',
			'// matches on protocol (or rule proto "-1"), inclusive port range,',
			'// and source CIDR. No matching rule means drop.',
			'func AllowInbound(rules []Rule, proto string, port int, srcIP string) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		name  string',
			'		rules []Rule',
			'		proto string',
			'		port  int',
			'		src   string',
			'		want  bool',
			'	}',
			'	ssh := []Rule{{"tcp", 22, 22, "203.0.113.7/32"}}',
			'	web := []Rule{{"tcp", 443, 443, "10.0.1.0/24"}}',
			'	open := []Rule{{"tcp", 80, 80, "0.0.0.0/0"}}',
			'	dns := []Rule{{"udp", 53, 53, "0.0.0.0/0"}}',
			'	all := []Rule{{"-1", 0, 65535, "10.0.0.0/8"}}',
			'	cases := []tc{',
			'		{"/32 exact host + exact port", ssh, "tcp", 22, "203.0.113.7", true},',
			'		{"port outside range", ssh, "tcp", 80, "203.0.113.7", false},',
			'		{"last address inside /24", web, "tcp", 443, "10.0.1.255", true},',
			'		{"first address outside /24", web, "tcp", 443, "10.0.2.0", false},',
			'		{"0.0.0.0/0 matches anything", open, "tcp", 80, "198.51.100.9", true},',
			'		{"proto mismatch", dns, "tcp", 53, "8.8.8.8", false},',
			'		{"proto -1 matches all", all, "icmp", 0, "10.200.3.4", true},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%s: %s :%d from %s", c.name, c.proto, c.port, c.src),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := AllowInbound(append([]Rule(nil), c.rules...), c.proto, c.port, c.src)',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%v", got)',
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
			'import (',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// Rule is one inbound security-group rule. Proto "-1" means all',
			'// protocols; FromPort/ToPort are an inclusive range; CIDR is the',
			'// allowed source block ("0.0.0.0/0" = anywhere).',
			'type Rule struct {',
			'	Proto    string',
			'	FromPort int',
			'	ToPort   int',
			'	CIDR     string',
			'}',
			'',
			'// parseIPv4 converts a dotted-quad address ("10.0.1.7") into one',
			'// uint32 so containment becomes plain mask arithmetic. Hand-rolled',
			'// because the trimmed stdlib here has no net package: each octet',
			'// occupies 8 bits, most significant first — exactly the order the',
			'// dotted form is written in.',
			'func parseIPv4(s string) uint32 {',
			'	var ip uint32',
			'	for _, part := range strings.Split(s, ".") {',
			'		n, _ := strconv.Atoi(part)',
			'		ip = ip<<8 | uint32(n)',
			'	}',
			'	return ip',
			'}',
			'',
			'// cidrContains reports whether ip lies inside the CIDR block.',
			'// The mask has the top `prefix` bits set: shift all-ones left by',
			'// the number of free host bits. Prefix 0 is special-cased FIRST:',
			'// a 32-bit shift by 32 is the classic off-the-edge trap (undefined',
			'// in C, zero in Go — but "mask of zero" still needs the compare to',
			'// mean "match everything", so saying it explicitly is clearer and',
			'// portable).',
			'func cidrContains(cidr, ip string) bool {',
			'	parts := strings.Split(cidr, "/")',
			'	prefix, _ := strconv.Atoi(parts[1])',
			'	if prefix == 0 {',
			'		return true // 0.0.0.0/0 — the whole internet',
			'	}',
			'	mask := ^uint32(0) << uint(32-prefix)',
			'	return parseIPv4(ip)&mask == parseIPv4(parts[0])&mask',
			'}',
			'',
			'// AllowInbound is a pure union: scan the rules and admit on the',
			'// first full match. There is no deny branch to consider — security',
			'// groups cannot express deny, so rule order is irrelevant and the',
			'// default (fall off the loop) is drop.',
			'func AllowInbound(rules []Rule, proto string, port int, srcIP string) bool {',
			'	for _, r := range rules {',
			'		if r.Proto != "-1" && r.Proto != proto {',
			'			continue // wrong protocol and not the all-protocols rule',
			'		}',
			'		if port < r.FromPort || port > r.ToPort {',
			'			continue // outside the inclusive port range',
			'		}',
			'		if cidrContains(r.CIDR, srcIP) {',
			'			return true // any single matching rule admits the packet',
			'		}',
			'	}',
			'	return false // silence is the deny',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Union of allows, and nothing else</h3>' +
			'<p>The whole evaluator is three guards and a default. The design fact ' +
			'that makes it this simple: <strong>security groups are stateful ' +
			'allow-lists</strong>. No deny rules exist, so rules cannot conflict, ' +
			'order cannot matter, and the decision is “does <em>any</em> rule match?” ' +
			'(Stateful also means return traffic for an allowed connection flows back ' +
			'automatically — no outbound rule needed for the response.)</p>',
			{ code: 'if prefix == 0 {\n\treturn true // /0: special-cased — do NOT shift a uint32 by 32\n}\nmask := ^uint32(0) << uint(32-prefix)\nreturn parseIPv4(ip)&mask == parseIPv4(net)&mask' },
			'<p>The CIDR test is the only real logic: mask both addresses and compare ' +
			'the fixed bits. The boundary cases in the tests are the point — ' +
			'<code>10.0.1.255</code> is the <em>last</em> address of ' +
			'<code>10.0.1.0/24</code> (inside), <code>10.0.2.0</code> is one past it ' +
			'(outside). Off-by-one on the mask flips exactly those two.</p>' +
			'<h3>Contrast: network ACLs</h3>' +
			'<p>The exam loves this contrast, so hold the table in your head:</p>' +
			'<ul>' +
			'<li><strong>Security group</strong> — instance/ENI level · allow rules only · ' +
			'<em>stateful</em> (replies auto-allowed) · all rules evaluated as a union.</li>' +
			'<li><strong>Network ACL</strong> — subnet level · allow <em>and deny</em> rules · ' +
			'<em>stateless</em> (return traffic needs its own rule, including ephemeral ' +
			'ports) · rules evaluated in <em>number order</em>, first match wins.</li>' +
			'</ul>' +
			'<h3>Exam takeaway</h3>' +
			'<p>Security groups: stateful, allow-only, union of rules, default deny by ' +
			'silence. NACLs: stateless, numbered allow/deny rules, first match wins, ' +
			'applied at the subnet boundary. When a question needs to <em>block</em> a ' +
			'specific IP or range, a security group cannot do it — that answer is ' +
			'always a NACL deny rule.</p>',
		],
		complexity: { time: 'O(r) over the rule list', space: 'O(1)' },
	});
})();
