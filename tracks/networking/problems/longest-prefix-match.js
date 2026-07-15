/* Longest Prefix Match — IP: Routing (Medium). The one rule the entire
 * forwarding plane runs on: of every route whose prefix contains the
 * destination, the longest prefix wins. The harness covers the full ladder
 * (/32 host route beats /24 beats /16 beats /0 default), the misses (empty
 * table, no default), and order-independence — because a real FIB is a set,
 * not a first-match list.
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// Nested prefix boxes: every box contains the destination dot, and the
	// innermost (longest prefix) supplies the next hop. Marker id namespaced
	// (dgArrowNLP) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 250" width="520" height="250" role="img" aria-label="nested prefixes: 0.0.0.0/0 contains 10.0.0.0/16 contains 10.0.42.0/24; the destination falls inside all three and the innermost wins">' +
		// default route: the whole address space
		'<rect x="20" y="30" width="480" height="180" rx="8" fill="none" stroke="var(--edge)"/>' +
		'<text x="34" y="52" class="lbl">0.0.0.0/0 → via isp (default: matches EVERYTHING)</text>' +
		// the /16 aggregate
		'<rect x="60" y="68" width="400" height="126" rx="8" fill="none" stroke="var(--accent)"/>' +
		'<text x="74" y="90" class="lbl" style="fill:var(--accent)">10.0.0.0/16 → via core</text>' +
		// the /24 — most specific
		'<rect x="100" y="106" width="280" height="72" rx="8" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="114" y="128" class="lbl" style="fill:var(--ok)">10.0.42.0/24 → via rack-42 ✓ longest</text>' +
		// the destination, inside all three boxes
		'<circle cx="240" cy="156" r="5" fill="var(--warn)"/>' +
		'<path d="M 330 226 C 300 210 264 180 246 162" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowNLP)"/>' +
		'<text x="336" y="234" class="lbl">dst 10.0.42.7</text>' +
		'<text x="20" y="234" class="lbl" style="fill:var(--ok)">all three contain it — the smallest box (longest prefix) wins</text>' +
		'<defs><marker id="dgArrowNLP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'longest-prefix-match',
		title: 'Routing: Longest Prefix Match',
		nav: 'longest prefix match',
		difficulty: 'Medium',
		category: 'IP: Routing',
		task: 'Implement Lookup: among the routes whose prefix contains dst, return the one with the longest prefix — or ok=false.',

		prose: [
			'<h2>Routing: Longest Prefix Match</h2>' +
			'<p>Traffic to one database VM goes over the VPN; traffic to its neighbor ' +
			'— same <code>/16</code>, one address over — goes out the internet ' +
			'gateway. Nobody wrote a rule about either machine. What happened is that ' +
			'someone added <code>10.0.42.0/24 via vpn</code>, and that route now ' +
			'silently outranks the <code>10.0.0.0/16</code> everything else rides on. ' +
			'Routers don’t match rules in order, and there is no “priority” field: ' +
			'<strong>the most specific matching prefix wins</strong>, always.</p>' +
			'<p>A forwarding table is a set of <code>prefix → next hop</code> entries. ' +
			'For a destination address, the lookup is:</p>' +
			'<ul>' +
			'<li><strong>Filter:</strong> keep the routes whose prefix contains ' +
			'<code>dst</code> — same masked compare you built for ' +
			'<code>Contains</code>: <code>dst &amp; mask == Net.Addr &amp; mask</code>.</li>' +
			'<li><strong>Pick:</strong> of those, return the route with the ' +
			'<em>longest</em> prefix. A <code>/24</code> pins down 24 bits; a ' +
			'<code>/16</code> only 16 — the /24 is the stronger claim about where ' +
			'this address lives.</li>' +
			'<li><strong>Default:</strong> <code>0.0.0.0/0</code> has a zero-bit mask, ' +
			'so it contains every address — but at length 0 it loses to any other ' +
			'match. That is the entire mechanism of a default gateway: not a special ' +
			'case, just the weakest possible claim.</li>' +
			'<li><strong>Miss:</strong> no route contains <code>dst</code> → ' +
			'<code>ok=false</code>. The packet is dropped and the sender gets the ' +
			'classic <code>connect: no route to host</code>.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Lookup(table, dst)</code>. Scan the whole table (order ' +
			'must not matter), track the best match by prefix length, and mind the ' +
			'default route: a <code>/0</code> match must beat “no match”, so ' +
			'initialize your best length to something below 0. Equal-length ties ' +
			'don’t occur in the tests.</p>' +
			'<div class="tip">On Linux, <code>ip route get 10.0.42.7</code> runs ' +
			'exactly this function against the kernel’s table and prints the winning ' +
			'route — the first tool to reach for when a packet leaves by the wrong ' +
			'interface.</div>',
		],

		starter: [
			'package main',
			'',
			'// CIDR is a block in prefix notation: Addr is any address inside it',
			'// and Prefix is how many leading bits name the network.',
			'type CIDR struct {',
			'	Addr   uint32',
			'	Prefix int',
			'}',
			'',
			'// mask returns the netmask: Prefix ones followed by zeros. Prefix 0',
			'// (the default route) is explicit: no network bits, mask 0 — which is',
			'// what lets 0.0.0.0/0 contain every address.',
			'func (c CIDR) mask() uint32 {',
			'	if c.Prefix <= 0 {',
			'		return 0',
			'	}',
			'	return ^uint32(0) << uint(32-c.Prefix)',
			'}',
			'',
			'// Route is one forwarding-table entry: destinations inside Net are',
			'// handed to the next hop named by Via.',
			'type Route struct {',
			'	Net CIDR',
			'	Via string',
			'}',
			'',
			'// Lookup returns the route that forwards dst: among all routes whose',
			'// Net contains dst, the one with the LONGEST prefix. ok=false means',
			'// no route matched — the packet is undeliverable ("no route to host").',
			'// Table order must not affect the answer.',
			'func Lookup(table []Route, dst uint32) (Route, bool) {',
			'	// your code here',
			'	return Route{}, false',
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
			'// parseQuad/route live harness-side so the case tables read like the',
			'// output of `ip route`, not like uint32 soup.',
			'func parseQuad(s string) uint32 {',
			'	var addr uint32',
			'	for _, part := range strings.Split(s, ".") {',
			'		n, _ := strconv.Atoi(part)',
			'		addr = addr<<8 | uint32(n)',
			'	}',
			'	return addr',
			'}',
			'',
			'func route(cidr, via string) Route {',
			'	parts := strings.Split(cidr, "/")',
			'	p, _ := strconv.Atoi(parts[1])',
			'	return Route{Net: CIDR{Addr: parseQuad(parts[0]), Prefix: p}, Via: via}',
			'}',
			'',
			'// show renders a lookup result the way a human reads a routing decision.',
			'func show(r Route, ok bool) string {',
			'	if !ok {',
			'		return "no route to host"',
			'	}',
			'	return "via " + r.Via',
			'}',
			'',
			'func main() {',
			'	// The ladder every test walks: default < /16 < /24 < /32.',
			'	table := []Route{',
			'		route("0.0.0.0/0", "isp"),',
			'		route("10.0.0.0/16", "core"),',
			'		route("10.0.42.0/24", "rack-42"),',
			'		route("10.0.42.9/32", "tunnel"),',
			'	}',
			'	// Same routes, most-specific FIRST: the answers must not move.',
			'	reversed := []Route{',
			'		route("10.0.42.9/32", "tunnel"),',
			'		route("10.0.42.0/24", "rack-42"),',
			'		route("10.0.0.0/16", "core"),',
			'		route("0.0.0.0/0", "isp"),',
			'	}',
			'	type tc struct {',
			'		name  string',
			'		table []Route',
			'		dst   string',
			'		want  string',
			'	}',
			'	cases := []tc{',
			'		{"most specific wins: dst inside the /24 (and the /16, and the default)",',
			'			table, "10.0.42.7", "via rack-42"},',
			'		{"inside the /16 but outside the /24: the aggregate carries it",',
			'			table, "10.0.7.7", "via core"},',
			'		{"stranger destination: only the default route (/0 contains everything) matches",',
			'			table, "8.8.8.8", "via isp"},',
			'		{"host route: the /32 beats every shorter prefix, including its own /24",',
			'			table, "10.0.42.9", "via tunnel"},',
			'		{"empty table: nothing matches, ok=false",',
			'			[]Route{}, "10.0.42.7", "no route to host"},',
			'		{"no default route: a dst outside every prefix is undeliverable",',
			'			[]Route{route("10.0.0.0/16", "core")}, "192.168.1.1", "no route to host"},',
			'		{"order-independence: most-specific listed first, same answers",',
			'			reversed, "10.0.42.7", "via rack-42"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			// Copy the table: a user implementation that sorts or mutates',
			'			// its input must not corrupt the shared tables for later cases.',
			'			rt, ok := Lookup(append([]Route(nil), c.table...), parseQuad(c.dst))',
			'			got := show(rt, ok)',
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
			'// and Prefix is how many leading bits name the network.',
			'type CIDR struct {',
			'	Addr   uint32',
			'	Prefix int',
			'}',
			'',
			'// mask returns the netmask: Prefix ones followed by zeros. Prefix 0',
			'// (the default route) is explicit: no network bits, mask 0 — which is',
			'// what lets 0.0.0.0/0 contain every address.',
			'func (c CIDR) mask() uint32 {',
			'	if c.Prefix <= 0 {',
			'		return 0',
			'	}',
			'	return ^uint32(0) << uint(32-c.Prefix)',
			'}',
			'',
			'// Route is one forwarding-table entry: destinations inside Net are',
			'// handed to the next hop named by Via.',
			'type Route struct {',
			'	Net CIDR',
			'	Via string',
			'}',
			'',
			'// Lookup scans the whole table and keeps the longest-prefix match.',
			'// A linear scan makes the order-independence obvious: every route is',
			'// examined, so listing the default first or last cannot change the',
			'// winner. (Real routers get the same semantics from a bit-trie or',
			'// TCAM — the data structure is an optimization, the RULE is this.)',
			'func Lookup(table []Route, dst uint32) (Route, bool) {',
			'	best := Route{}',
			'	// -1, not 0: the default route matches at prefix length 0, and a',
			'	// /0 match must still beat "no match at all". Starting the bar at',
			'	// 0 would silently swallow the default gateway.',
			'	bestLen := -1',
			'	for _, r := range table {',
			'		m := r.Net.mask()',
			'		if dst&m != r.Net.Addr&m {',
			'			continue // this prefix does not contain dst',
			'		}',
			'		// Strictly greater: a longer prefix pins down more of the',
			'		// address, so it is the more specific — stronger — claim.',
			'		if r.Net.Prefix > bestLen {',
			'			best, bestLen = r, r.Net.Prefix',
			'		}',
			'	}',
			'	return best, bestLen >= 0',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>One rule is the whole forwarding plane</h3>' +
			'<p>Everything a router does with a data packet is this function. There ' +
			'is no rule ordering, no priority field, no fall-through: the table is a ' +
			'set, and specificity is the only tiebreaker. That single design choice ' +
			'buys the two properties the internet runs on:</p>' +
			'<ul>' +
			'<li><strong>Aggregation.</strong> A backbone router doesn’t store a ' +
			'route per subnet of a customer — it stores one <code>/16</code>. ' +
			'Millions of destinations, one row. This is why the global IPv4 table is ' +
			'~a million routes instead of four billion.</li>' +
			'<li><strong>Punching holes.</strong> Need one <code>/24</code> of that ' +
			'aggregate to go somewhere else — a VPN, a scrubbing center, a ' +
			'migration? Just announce the /24. No one edits the /16; the longer ' +
			'prefix simply outranks it for that slice of address space. Exceptions ' +
			'compose without coordination, which is the only kind of coordination ' +
			'the internet can do.</li>' +
			'</ul>' +
			'<p>The default gateway falls out for free: <code>0.0.0.0/0</code> is ' +
			'not special-cased anywhere — it is just the weakest possible claim, ' +
			'containing everything and losing to anything. Which is why the ' +
			'initialization matters:</p>',
			{ code: 'bestLen := -1            // NOT 0: a /0 match must beat "no match"\nfor _, r := range table {\n\tm := r.Net.mask()\n\tif dst&m != r.Net.Addr&m { continue }\n\tif r.Net.Prefix > bestLen { best, bestLen = r, r.Net.Prefix }\n}\nreturn best, bestLen >= 0 // no match at all: "no route to host"' },
			'<h3>When debugging</h3>' +
			'<p><code>ip route get &lt;dst&gt;</code> asks the kernel to run exactly ' +
			'this lookup and print the winner — route, egress interface, source ' +
			'address. When traffic leaves by the wrong interface, don’t read the ' +
			'table top to bottom like a firewall ruleset; ask which prefix is ' +
			'<em>longest</em>, because that’s all the kernel asked. The classic ' +
			'incident shape: a VPN client installs <code>10.0.0.0/8</code>, and ' +
			'suddenly a <code>/24</code> someone adds for a lab outranks it for just ' +
			'that slice — “only some hosts unreachable” is the signature of a ' +
			'longer prefix you forgot about. And <code>no route to host</code> ' +
			'before any packet leaves usually means exactly what this function’s ' +
			'<code>ok=false</code> means: no prefix contained the destination — a ' +
			'missing default route, not a remote failure.</p>' +
			'<p>The rule’s power is also its attack surface: <strong>BGP ' +
			'hijacking</strong> is longest-prefix match used maliciously. Announce a ' +
			'more specific prefix of someone else’s space — two /9s cover a /8 — ' +
			'and every router on earth prefers your announcement, no questions ' +
			'asked. The 2008 Pakistan/YouTube outage was one hijacked /24 outranking ' +
			'YouTube’s own /22 globally. RPKI exists to check who may originate a ' +
			'prefix, but the forwarding rule itself never authenticates anything.</p>',
		],
		complexity: { time: 'O(n) per lookup — a linear scan; real FIBs use tries/TCAM for O(32)', space: 'O(1)' },
	});
})();
