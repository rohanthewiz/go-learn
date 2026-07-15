/* IPv4 Addressing — IP: Addressing (lesson). The load-bearing fact of the
 * whole IP layer: an address is one uint32, dotted quad is just presentation,
 * and the /prefix mask splits it into network|host. The lesson has the
 * learner implement networkOf (mask-and-AND) because every other decision in
 * the track — subnet membership, routing, aggregation — is this one line.
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// A 32-bit ruler split at bit 8: the /24 mask keeps the top 24 bits
	// (network) and throws away the bottom 8 (host). Marker id namespaced
	// (dgArrowNIP) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-label="an IPv4 address as 32 bits: the /24 mask keeps the top 24 network bits and zeroes the 8 host bits">' +
		'<text x="20" y="24" class="lbl">10.1.2.3/24 — one uint32, split by the mask</text>' +
		// network part: bits 31..8
		'<rect x="20" y="44" width="360" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="200" y="71" text-anchor="middle">10 . 1 . 2</text>' +
		// host part: bits 7..0
		'<rect x="380" y="44" width="120" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="440" y="71" text-anchor="middle">3</text>' +
		// bit ruler
		'<text x="24" y="104" class="lbl">bit 31</text>' +
		'<text x="374" y="104" text-anchor="end" class="lbl">8</text>' +
		'<text x="386" y="104" class="lbl">7</text>' +
		'<text x="500" y="104" text-anchor="end" class="lbl">0</text>' +
		'<text x="200" y="126" text-anchor="middle" class="lbl" style="fill:var(--ok)">network bits — routers compare ONLY these</text>' +
		'<text x="440" y="126" text-anchor="middle" class="lbl">host bits</text>' +
		// the mask boundary
		'<path d="M 380 158 L 380 96" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowNIP)"/>' +
		'<text x="380" y="176" text-anchor="middle" class="lbl">the /24 mask cuts here — nothing about the dots decides it</text>' +
		'<defs><marker id="dgArrowNIP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.lesson({
		id: 'ipv4-addressing',
		title: 'IPv4 Addressing: One uint32',
		nav: 'IPv4 addressing',
		category: 'IP: Addressing',

		prose: [
			'<h2>IPv4 Addressing: One uint32</h2>' +
			'<p>Two pods on the same node: one reaches the database directly, the ' +
			'other’s packets detour through a gateway and hit a firewall rule. ' +
			'<code>ping</code> works for both, so what’s different? Nothing you can see ' +
			'in the dotted addresses — the difference is arithmetic. Before sending ' +
			'<em>any</em> packet, a host computes “is the destination on my subnet?”, ' +
			'and everything downstream (ARP or gateway, direct or routed) follows from ' +
			'that one comparison.</p>' +
			'<p>Strip the presentation away and an IPv4 address is a single ' +
			'<code>uint32</code>. The dotted quad <code>10.1.2.3</code> is just how we ' +
			'print the number <code>0x0A010203</code> — four octets, most significant ' +
			'first. The <code>/24</code> in <code>10.1.2.3/24</code> is the real ' +
			'structure: it says the top 24 bits name the <strong>network</strong> and ' +
			'the bottom 8 bits name the <strong>host</strong> on it. The netmask is ' +
			'those 24 ones followed by 8 zeros, and ANDing it in keeps the network ' +
			'part:</p>',
			{ lang: 'txt', code: '10.1.2.3   = 00001010 00000001 00000010 00000011 = 0x0A010203\n/24 mask   = 11111111 11111111 11111111 00000000 = 0xFFFFFF00\naddr&mask  = 00001010 00000001 00000010 00000000 = 10.1.2.0  (network)\naddr^netwk =                            00000011 = 0.0.0.3   (host)' },
			DIAGRAM +
			'<p>Routers only ever look at the network part — that’s the entire reason ' +
			'the split exists. A core router can’t hold a row per host on the ' +
			'internet, but it can hold a row per <em>network</em>: “anything whose ' +
			'top 24 bits are <code>10.1.2</code> goes out interface 3”. Masking is ' +
			'lossy on purpose: by throwing the host bits away, millions of addresses ' +
			'collapse into one forwarding-table entry, and the host bits only regain ' +
			'meaning on the final hop, where the last router ARPs for the exact ' +
			'machine.</p>' +
			'<h3>Your job</h3>' +
			'<p><code>parseQuad</code> and <code>formatQuad</code> (presentation in, ' +
			'presentation out) are done. Implement <code>networkOf</code>: build the ' +
			'mask — <code>prefix</code> ones, then zeros — and AND it into the ' +
			'address, so the printed networks, hosts, and same-subnet answers come ' +
			'out right. Right now it returns the address unmasked, which is why every ' +
			'“network” below is wrong and the two <code>/24</code> neighbors look ' +
			'like strangers.</p>' +
			'<div class="tip"><code>/28</code> cuts <em>inside</em> the last octet: ' +
			'<code>192.168.100.17/28</code> is on network <code>192.168.100.16</code>, ' +
			'which no amount of staring at the dots will tell you. The dotted quad ' +
			'hides bit boundaries; the uint32 view is the one the hardware — and your ' +
			'mask — actually uses.</div>',
		],

		task: 'Implement networkOf: mask off the host bits so the networks, hosts, and same-subnet answers print correctly.',

		starter: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// parseQuad turns dotted-quad presentation into the number an interface',
			'// actually holds. Four octets, eight bits each: shift the accumulator',
			'// left one octet and OR the next one in. "10.1.2.3" -> 0x0A010203.',
			'func parseQuad(s string) uint32 {',
			'	var addr uint32',
			'	for _, part := range strings.Split(s, ".") {',
			'		n, _ := strconv.Atoi(part)',
			'		addr = addr<<8 | uint32(n)',
			'	}',
			'	return addr',
			'}',
			'',
			'// formatQuad is the inverse: peel the four octets off, most significant',
			'// first. Presentation only — no router ever stores this string.',
			'func formatQuad(addr uint32) string {',
			'	return fmt.Sprintf("%d.%d.%d.%d", addr>>24&0xff, addr>>16&0xff, addr>>8&0xff, addr&0xff)',
			'}',
			'',
			'// networkOf keeps the first prefix bits of addr — the network part, the',
			'// only part a router ever compares — and zeroes the host bits.',
			'func networkOf(addr uint32, prefix int) uint32 {',
			'	// TODO: build the netmask (prefix ones, then zeros) and AND it in:',
			'	//   mask := ^uint32(0) << (32 - prefix)',
			'	// Edge case worth calling out: prefix 0 needs mask 0. Go defines',
			'	// unsigned shifts by >= the width to yield 0 (no C-style undefined',
			'	// behavior), so the formula already covers it — but an explicit',
			'	// branch documents the intent instead of leaning on a spec footnote.',
			'	return addr',
			'}',
			'',
			'func main() {',
			'	pairs := []struct {',
			'		addr   string',
			'		prefix int',
			'	}{',
			'		{"10.1.2.3", 24},',
			'		{"192.168.100.17", 28},',
			'		{"203.0.113.7", 0},',
			'	}',
			'	for _, p := range pairs {',
			'		addr := parseQuad(p.addr)',
			'		network := networkOf(addr, p.prefix)',
			'		// XOR recovers exactly the bits the mask threw away: the host part.',
			'		host := addr ^ network',
			'		fmt.Printf("%s/%d -> network %s host %s\\n", p.addr, p.prefix, formatQuad(network), formatQuad(host))',
			'	}',
			'',
			'	// The question every host answers before sending every packet:',
			'	// same network -> deliver directly (ARP); different -> hand to gateway.',
			'	a, b := parseQuad("10.1.2.3"), parseQuad("10.1.2.99")',
			'	fmt.Printf("10.1.2.3 and 10.1.2.99 same /24 subnet: %v\\n", networkOf(a, 24) == networkOf(b, 24))',
			'	fmt.Printf("10.1.2.3 and 10.1.2.99 same /28 subnet: %v\\n", networkOf(a, 28) == networkOf(b, 28))',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('10.1.2.3/24 -> network 10.1.2.0 host 0.0.0.3') !== -1 &&
				flat.indexOf('192.168.100.17/28 -> network 192.168.100.16 host 0.0.0.1') !== -1 &&
				flat.indexOf('203.0.113.7/0 -> network 0.0.0.0 host 203.0.113.7') !== -1 &&
				flat.indexOf('same /24 subnet: true') !== -1 &&
				flat.indexOf('same /28 subnet: false') !== -1;
		},

		solution: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// parseQuad turns dotted-quad presentation into the number an interface',
			'// actually holds. Four octets, eight bits each: shift the accumulator',
			'// left one octet and OR the next one in. "10.1.2.3" -> 0x0A010203.',
			'func parseQuad(s string) uint32 {',
			'	var addr uint32',
			'	for _, part := range strings.Split(s, ".") {',
			'		n, _ := strconv.Atoi(part)',
			'		addr = addr<<8 | uint32(n)',
			'	}',
			'	return addr',
			'}',
			'',
			'// formatQuad is the inverse: peel the four octets off, most significant',
			'// first. Presentation only — no router ever stores this string.',
			'func formatQuad(addr uint32) string {',
			'	return fmt.Sprintf("%d.%d.%d.%d", addr>>24&0xff, addr>>16&0xff, addr>>8&0xff, addr&0xff)',
			'}',
			'',
			'// networkOf keeps the first prefix bits of addr and zeroes the rest.',
			'// This single AND is the decision procedure behind subnet membership,',
			'// route matching, and aggregation: it is deliberately lossy, collapsing',
			'// every address in the block onto one representative number.',
			'func networkOf(addr uint32, prefix int) uint32 {',
			'	// Shift all-ones LEFT (not right): that keeps the ones at the TOP,',
			'	// where the network bits live — /24 gives 0xFFFFFF00, not 0x00FFFFFF.',
			'	// prefix 0 wants mask 0, and Go\'s spec already delivers it: shifting',
			'	// a uint32 by 32 is defined to yield 0 (unlike C, where it is UB).',
			'	// The explicit branch states that intent rather than relying on the',
			'	// reader knowing the footnote.',
			'	if prefix <= 0 {',
			'		return 0 // /0 means "no network bits": every address collapses together',
			'	}',
			'	mask := ^uint32(0) << uint(32-prefix)',
			'	return addr & mask',
			'}',
			'',
			'func main() {',
			'	pairs := []struct {',
			'		addr   string',
			'		prefix int',
			'	}{',
			'		{"10.1.2.3", 24},',
			'		{"192.168.100.17", 28},',
			'		{"203.0.113.7", 0},',
			'	}',
			'	for _, p := range pairs {',
			'		addr := parseQuad(p.addr)',
			'		network := networkOf(addr, p.prefix)',
			'		// XOR recovers exactly the bits the mask threw away: the host part.',
			'		host := addr ^ network',
			'		fmt.Printf("%s/%d -> network %s host %s\\n", p.addr, p.prefix, formatQuad(network), formatQuad(host))',
			'	}',
			'',
			'	// The question every host answers before sending every packet:',
			'	// same network -> deliver directly (ARP); different -> hand to gateway.',
			'	// Note the /28 answer flips: the mask reaches into the last octet,',
			'	// and .3 (nibble 0) and .99 (nibble 6) land in different blocks.',
			'	a, b := parseQuad("10.1.2.3"), parseQuad("10.1.2.99")',
			'	fmt.Printf("10.1.2.3 and 10.1.2.99 same /24 subnet: %v\\n", networkOf(a, 24) == networkOf(b, 24))',
			'	fmt.Printf("10.1.2.3 and 10.1.2.99 same /28 subnet: %v\\n", networkOf(a, 28) == networkOf(b, 28))',
			'}',
			'',
		].join('\n'),
	});
})();
