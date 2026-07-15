/* TTL & Traceroute — IP: Delivery (lesson). Every router decrements TTL;
 * at zero the packet dies right there and ICMP Time Exceeded goes back to
 * the SOURCE. Traceroute is nothing but that mechanism used on purpose:
 * probes with TTL 1, 2, 3, … make each router along the path identify
 * itself. The lesson replays a 3-router path; the learner implements the
 * per-hop decrement-and-drop inside forward().
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// The traceroute ladder: four probes, each TTL reaching one hop further.
	// Marker ids namespaced (dgArrowNTR*) — every track's SVGs share the
	// page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 214" width="560" height="214" role="img" aria-label="probes with TTL 1 through 4: each dies one router further along and triggers ICMP Time Exceeded; TTL 4 reaches the server">' +
		// hop columns
		'<text x="60" y="24" text-anchor="middle" class="lbl">you</text>' +
		'<text x="185" y="24" text-anchor="middle" class="lbl">gw.home</text>' +
		'<text x="305" y="24" text-anchor="middle" class="lbl">isp-edge</text>' +
		'<text x="425" y="24" text-anchor="middle" class="lbl">core-1</text>' +
		'<text x="527" y="24" text-anchor="middle" class="lbl">server</text>' +
		'<path d="M 185 32 L 185 172" stroke="var(--edge)" stroke-width="1" stroke-dasharray="3 4"/>' +
		'<path d="M 305 32 L 305 172" stroke="var(--edge)" stroke-width="1" stroke-dasharray="3 4"/>' +
		'<path d="M 425 32 L 425 172" stroke="var(--edge)" stroke-width="1" stroke-dasharray="3 4"/>' +
		'<path d="M 527 32 L 527 172" stroke="var(--edge)" stroke-width="1" stroke-dasharray="3 4"/>' +
		// probe rows: each TTL dies one hop further
		'<text x="20" y="60" class="lbl">ttl=1</text>' +
		'<path d="M 60 56 L 176 56" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowNTR)"/>' +
		'<text x="194" y="60" class="lbl" style="fill:var(--err-fg)">✗ 0 → ICMP Time Exceeded</text>' +
		'<text x="20" y="94" class="lbl">ttl=2</text>' +
		'<path d="M 60 90 L 296 90" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowNTR)"/>' +
		'<text x="314" y="94" class="lbl" style="fill:var(--err-fg)">✗ 0</text>' +
		'<text x="20" y="128" class="lbl">ttl=3</text>' +
		'<path d="M 60 124 L 416 124" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowNTR)"/>' +
		'<text x="434" y="128" class="lbl" style="fill:var(--err-fg)">✗ 0</text>' +
		'<text x="20" y="162" class="lbl">ttl=4</text>' +
		'<path d="M 60 158 L 518 158" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowNTRok)"/>' +
		'<text x="300" y="180" text-anchor="middle" class="lbl" style="fill:var(--ok)">ttl=4 survives all three routers — delivered with TTL 1 to spare</text>' +
		'<text x="20" y="204" class="lbl">traceroute = probes with TTL 1, 2, 3, … reading the source addresses of the ICMP errors</text>' +
		'<defs>' +
		'<marker id="dgArrowNTR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowNTRok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'ttl-traceroute',
		title: 'TTL & Traceroute',
		nav: 'TTL & traceroute',
		category: 'IP: Delivery',

		prose: [
			'<h2>TTL &amp; Traceroute</h2>' +
			'<p>A routing misconfiguration can send a packet in a circle: router A ' +
			'forwards to B, B forwards back to A, forever. Without a countermeasure one ' +
			'looping packet would circulate until the heat death of the router — and a ' +
			'stream of them would melt the loop. The countermeasure is one byte in the ' +
			'IP header: <strong>TTL</strong>. Every router that forwards a packet ' +
			'decrements it, and the router that decrements it to <strong>zero drops ' +
			'the packet</strong> and sends an ICMP <em>Time Exceeded</em> message back ' +
			'to the packet’s <em>source</em> address.</p>' +
			'<p>RFC 791 named the field “time to live” and specified <em>seconds</em>; ' +
			'in practice no router ever measured time — each just subtracted one — so ' +
			'the field quietly became a hop count (IPv6 renamed it honestly: ' +
			'<em>Hop Limit</em>). A loop now dies in at most 64 or so hops. But the ' +
			'error path is the interesting part: the ICMP message carries the ' +
			'<strong>router’s own address</strong> as its source. Set TTL=1 and the ' +
			'first router names itself. TTL=2 names the second. That is the entire ' +
			'design of <code>traceroute</code> — there is no “trace” protocol, only ' +
			'deliberately tiny TTLs and a list of return addresses.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>The program on the right sends probes with TTL 1–4 along a fixed path ' +
			'(three routers, then the destination host as the last element). ' +
			'<code>forward</code> currently teleports every probe to the destination — ' +
			'make it walk the path instead: each <em>router</em> decrements TTL before ' +
			'forwarding, and the router that hits 0 answers ' +
			'<code>time exceeded at &lt;router&gt;</code>; only a probe whose TTL ' +
			'survives every router prints <code>reached server</code>.</p>' +
			'<div class="tip">Real traceroute rows full of <code>* * *</code> don’t mean ' +
			'the hop is down — routers deprioritize generating ICMP (it happens on the ' +
			'slow control-plane path) or are configured never to answer. The packets ' +
			'still flow <em>through</em> them at full speed; they just won’t gossip ' +
			'about it.</div>',
		],

		task: 'Complete forward(): decrement TTL at each router so ttl=1..3 report time exceeded at successive routers and ttl=4 reaches the server.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// forward simulates one probe packet entering the path with the given',
			'// TTL. path lists the routers in order; the LAST element is the',
			'// destination host itself (hosts deliver — they don\'t forward, so',
			'// they never decrement).',
			'func forward(path []string, ttl int) string {',
			'	// TODO: walk the path. Each router decrements TTL before',
			'	// forwarding; the router that decrements it to 0 drops the packet',
			'	// and the probe reports "time exceeded at <router>". A probe that',
			'	// survives every router reports "reached <destination>".',
			'	// For now every probe magically arrives:',
			'	return "reached " + path[len(path)-1]',
			'}',
			'',
			'func main() {',
			'	// Three routers, then the destination host.',
			'	path := []string{"gw.home", "isp-edge", "core-1", "server"}',
			'',
			'	// Traceroute in four lines: probe with TTL 1, 2, 3, ... and let',
			'	// each router along the way identify itself in the error.',
			'	for ttl := 1; ttl <= len(path); ttl++ {',
			'		fmt.Printf("ttl=%d: %s\\n", ttl, forward(path, ttl))',
			'	}',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('ttl=1: time exceeded at gw.home') !== -1 &&
				flat.indexOf('ttl=2: time exceeded at isp-edge') !== -1 &&
				flat.indexOf('ttl=3: time exceeded at core-1') !== -1 &&
				flat.indexOf('ttl=4: reached server') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// forward simulates one probe packet entering the path with the given',
			'// TTL. path lists the routers in order; the LAST element is the',
			'// destination host itself (hosts deliver — they don\'t forward, so',
			'// they never decrement).',
			'func forward(path []string, ttl int) string {',
			'	for i, hop := range path {',
			'		// The destination host delivers the packet up its own stack —',
			'		// no forwarding decision, no decrement. This is why a probe',
			'		// with TTL exactly equal to the hop count arrives (with 1 to',
			'		// spare here, since only the 3 routers decrement).',
			'		if i == len(path)-1 {',
			'			return "reached " + hop',
			'		}',
			'		// A router decrements TTL BEFORE forwarding; if that reaches',
			'		// 0 the packet is dropped right here, and this router — not',
			'		// the destination — sources the ICMP Time Exceeded back to',
			'		// the sender. The error\'s return address is the whole basis',
			'		// of traceroute: it is how hop N learns to name itself.',
			'		ttl--',
			'		if ttl == 0 {',
			'			return "time exceeded at " + hop',
			'		}',
			'	}',
			'	// Unreachable: the loop always returns at the last element.',
			'	return "lost"',
			'}',
			'',
			'func main() {',
			'	// Three routers, then the destination host.',
			'	path := []string{"gw.home", "isp-edge", "core-1", "server"}',
			'',
			'	// Traceroute in four lines: probe with TTL 1, 2, 3, ... and let',
			'	// each router along the way identify itself in the error.',
			'	for ttl := 1; ttl <= len(path); ttl++ {',
			'		fmt.Printf("ttl=%d: %s\\n", ttl, forward(path, ttl))',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
