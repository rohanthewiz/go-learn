/* TCP State Machine — TCP (Medium). RFC 9293's connection diagram as a
 * transition table: Next(state, event) with ok=false for every pair the
 * spec has no arrow for (a live stack answers those with RST). The harness
 * walks the full client and server lifetimes, the simultaneous-close
 * corner, and the invalid pairs that must be refused.
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// The teardown half of the diagram, where production incidents live:
	// the active closer (left) walks FIN_WAIT_* into TIME_WAIT, the passive
	// closer (right) parks in CLOSE_WAIT until the APP calls Close. The
	// dashed middle path is simultaneous close.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 315" width="520" height="315" role="img" aria-label="TCP teardown: active closer via FIN_WAIT_1, FIN_WAIT_2, TIME_WAIT; passive closer via CLOSE_WAIT, LAST_ACK; simultaneous close via CLOSING">' +
		'<rect x="190" y="16" width="140" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="260" y="36" text-anchor="middle">ESTABLISHED</text>' +
		'<text x="110" y="72" text-anchor="middle" class="lbl">active closer</text>' +
		'<text x="410" y="72" text-anchor="middle" class="lbl">passive closer</text>' +
		// active path (left)
		'<path d="M 200 46 L 122 76" stroke="var(--accent)" stroke-width="1.6" fill="none" marker-end="url(#dgArrowNSM)"/>' +
		'<text x="142" y="56" text-anchor="middle" class="lbl">close</text>' +
		'<rect x="45" y="80" width="130" height="30" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="110" y="100" text-anchor="middle">FIN_WAIT_1</text>' +
		'<path d="M 110 110 L 110 146" stroke="var(--accent)" stroke-width="1.6" fill="none" marker-end="url(#dgArrowNSM)"/>' +
		'<text x="118" y="132" class="lbl">rcv-ack</text>' +
		'<rect x="45" y="150" width="130" height="30" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="110" y="170" text-anchor="middle">FIN_WAIT_2</text>' +
		'<path d="M 110 180 L 110 216" stroke="var(--accent)" stroke-width="1.6" fill="none" marker-end="url(#dgArrowNSM)"/>' +
		'<text x="118" y="202" class="lbl">rcv-fin</text>' +
		'<rect x="45" y="220" width="130" height="30" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="110" y="240" text-anchor="middle">TIME_WAIT</text>' +
		'<path d="M 130 250 L 202 272" stroke="var(--accent)" stroke-width="1.6" fill="none" marker-end="url(#dgArrowNSM)"/>' +
		'<text x="126" y="268" class="lbl">timeout-2msl</text>' +
		// passive path (right)
		'<path d="M 320 46 L 398 76" stroke="var(--warn)" stroke-width="1.6" fill="none" marker-end="url(#dgArrowNSMw)"/>' +
		'<text x="378" y="56" text-anchor="middle" class="lbl">rcv-fin</text>' +
		'<rect x="345" y="80" width="130" height="30" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="410" y="100" text-anchor="middle">CLOSE_WAIT</text>' +
		'<path d="M 410 110 L 410 146" stroke="var(--warn)" stroke-width="1.6" fill="none" marker-end="url(#dgArrowNSMw)"/>' +
		'<text x="418" y="132" class="lbl">close (your app!)</text>' +
		'<rect x="345" y="150" width="130" height="30" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="410" y="170" text-anchor="middle">LAST_ACK</text>' +
		'<path d="M 392 180 L 318 272" stroke="var(--warn)" stroke-width="1.6" fill="none" marker-end="url(#dgArrowNSMw)"/>' +
		'<text x="372" y="232" class="lbl">rcv-ack</text>' +
		// simultaneous close (dashed, through the middle)
		'<rect x="215" y="150" width="90" height="30" rx="5" fill="none" stroke="var(--edge)" stroke-dasharray="5 4"/>' +
		'<text x="260" y="170" text-anchor="middle">CLOSING</text>' +
		'<path d="M 160 110 L 242 146" stroke="var(--edge)" stroke-width="1.6" stroke-dasharray="5 4" fill="none" marker-end="url(#dgArrowNSMe)"/>' +
		'<text x="216" y="122" class="lbl">rcv-fin</text>' +
		'<path d="M 242 180 L 160 216" stroke="var(--edge)" stroke-width="1.6" stroke-dasharray="5 4" fill="none" marker-end="url(#dgArrowNSMe)"/>' +
		'<text x="212" y="206" class="lbl">rcv-ack</text>' +
		'<rect x="190" y="276" width="140" height="30" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="260" y="296" text-anchor="middle">CLOSED</text>' +
		'<text x="20" y="313" class="lbl">both paths end CLOSED — but only the side that closed FIRST pays the 2MSL TIME_WAIT</text>' +
		'<defs>' +
		'<marker id="dgArrowNSM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowNSMw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowNSMe" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'tcp-state-machine',
		title: 'The TCP Connection State Machine',
		nav: 'TCP state machine',
		difficulty: 'Medium',
		category: 'TCP',
		task: 'Implement Next(state, event) as a transition table — ok=false for every pair RFC 9293 has no arrow for.',

		prose: [
			'<h2>The TCP Connection State Machine</h2>' +
			'<p>Run <code>ss -tan</code> on any busy box and read the State column: ' +
			'<code>ESTAB</code>, <code>TIME-WAIT</code>, <code>CLOSE-WAIT</code>, ' +
			'<code>FIN-WAIT-2</code>. Every one of those words is a node in a single ' +
			'diagram — RFC 9293\'s connection state machine — and half of TCP triage ' +
			'is knowing which node a pile-up points at. Thousands of ' +
			'<code>CLOSE_WAIT</code>? That is not a network problem; that is ' +
			'<em>your process</em> forgetting to call <code>Close()</code>.</p>' +
			'<p>A TCP endpoint is exactly this: a current state, plus a table saying ' +
			'which <strong>events</strong> — application calls (<code>close</code>, the ' +
			'opens), arriving segments (<code>rcv-syn</code>, <code>rcv-ack</code>, ' +
			'<code>rcv-fin</code>...), and one timer — move it where. The full table ' +
			'for this exercise:</p>',
			{ code: 'CLOSED       passive-open → LISTEN       active-open → SYN_SENT\nLISTEN       rcv-syn      → SYN_RCVD\nSYN_SENT     rcv-syn-ack  → ESTABLISHED\nSYN_RCVD     rcv-ack      → ESTABLISHED\nESTABLISHED  close   → FIN_WAIT_1        rcv-fin → CLOSE_WAIT\nFIN_WAIT_1   rcv-ack → FIN_WAIT_2        rcv-fin → CLOSING (simultaneous close)\nFIN_WAIT_2   rcv-fin      → TIME_WAIT\nCLOSING      rcv-ack      → TIME_WAIT\nCLOSE_WAIT   close        → LAST_ACK\nLAST_ACK     rcv-ack      → CLOSED\nTIME_WAIT    timeout-2msl → CLOSED', lang: 'txt' },
			'<p>Teardown is where the diagram earns its keep — each direction of the ' +
			'byte stream is closed independently (a FIN each way, an ACK each way), so ' +
			'the two sides walk different paths depending on who closed first:</p>' +
			DIAGRAM +
			'<div class="tip">Note what <code>rcv-ack</code> means in four different ' +
			'states, and that <code>TIME_WAIT</code> ignores every segment — only the ' +
			'2MSL timer leaves it. The state machine is the whole answer to "why is ' +
			'this connection stuck?"</div>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Next(state, event) (string, bool)</code>. For any ' +
			'(state, event) pair in the table, return the next state and ' +
			'<code>true</code>; for any pair <em>not</em> in it, return ' +
			'<code>"", false</code> — that is the pair a real stack answers with RST ' +
			'(or silently drops), because the segment makes no sense in this state. ' +
			'Make the solution <strong>table-driven</strong>: the table is data, not a ' +
			'forest of switches.</p>',
		],

		starter: [
			'package main',
			'',
			'// Next is the TCP connection state machine (RFC 9293): given the',
			'// current state and an event, it returns the next state. ok=false',
			'// means the pair has no transition — a real stack answers such a',
			'// segment with RST, or drops it.',
			'//',
			'// States: CLOSED LISTEN SYN_SENT SYN_RCVD ESTABLISHED FIN_WAIT_1',
			'//         FIN_WAIT_2 CLOSING TIME_WAIT CLOSE_WAIT LAST_ACK',
			'//',
			'// Events and the arrows they drive:',
			'//   passive-open  CLOSED → LISTEN            (bind + listen)',
			'//   active-open   CLOSED → SYN_SENT          (connect: SYN goes out)',
			'//   rcv-syn       LISTEN → SYN_RCVD',
			'//   rcv-syn-ack   SYN_SENT → ESTABLISHED',
			'//   rcv-ack       SYN_RCVD → ESTABLISHED,    FIN_WAIT_1 → FIN_WAIT_2,',
			'//                 CLOSING  → TIME_WAIT,      LAST_ACK   → CLOSED',
			'//   close         ESTABLISHED → FIN_WAIT_1,  CLOSE_WAIT → LAST_ACK',
			'//   rcv-fin       ESTABLISHED → CLOSE_WAIT,  FIN_WAIT_1 → CLOSING,',
			'//                 FIN_WAIT_2  → TIME_WAIT',
			'//   timeout-2msl  TIME_WAIT → CLOSED',
			'func Next(state, event string) (string, bool) {',
			'	// TODO: encode the arrows above. Prefer a transition table',
			'	// (map of maps) over a switch forest — the table IS the spec.',
			'	return "", false',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		name   string',
			'		start  string',
			'		events []string',
			'		want   string',
			'	}',
			'	cases := []tc{',
			'		{"full client lifetime: connect, talk, close first, wait out 2MSL",',
			'			"CLOSED",',
			'			[]string{"active-open", "rcv-syn-ack", "close", "rcv-ack", "rcv-fin", "timeout-2msl"},',
			'			"SYN_SENT ESTABLISHED FIN_WAIT_1 FIN_WAIT_2 TIME_WAIT CLOSED"},',
			'		{"full server lifetime: listen, accept, peer closes first, app Closes",',
			'			"CLOSED",',
			'			[]string{"passive-open", "rcv-syn", "rcv-ack", "rcv-fin", "close", "rcv-ack"},',
			'			"LISTEN SYN_RCVD ESTABLISHED CLOSE_WAIT LAST_ACK CLOSED"},',
			'		{"simultaneous close: both FINs cross in flight, meet in CLOSING",',
			'			"ESTABLISHED",',
			'			[]string{"close", "rcv-fin", "rcv-ack", "timeout-2msl"},',
			'			"FIN_WAIT_1 CLOSING TIME_WAIT CLOSED"},',
			'		{"no arrow: rcv-fin in LISTEN is answered with RST",',
			'			"LISTEN",',
			'			[]string{"rcv-fin"},',
			'			"RST"},',
			'		{"ESTABLISHED via the active path (client handshake)",',
			'			"SYN_SENT",',
			'			[]string{"rcv-syn-ack"},',
			'			"ESTABLISHED"},',
			'		{"ESTABLISHED via the passive path (server handshake)",',
			'			"SYN_RCVD",',
			'			[]string{"rcv-ack"},',
			'			"ESTABLISHED"},',
			'		{"TIME_WAIT ignores close: only timeout-2msl leaves it",',
			'			"TIME_WAIT",',
			'			[]string{"close"},',
			'			"RST"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			// Walk the event sequence; the first refused pair ends the',
			'			// walk as RST — exactly what the segment would get on the',
			'			// wire.',
			'			state := c.start',
			'			path := make([]string, 0, len(c.events))',
			'			for _, ev := range c.events {',
			'				next, ok := Next(state, ev)',
			'				if !ok {',
			'					path = append(path, "RST")',
			'					break',
			'				}',
			'				state = next',
			'				path = append(path, next)',
			'			}',
			'			got := strings.Join(path, " ")',
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
			'// transitions is RFC 9293\'s connection state machine (its figure 5)',
			'// as data. A table instead of a switch forest, on purpose: the table',
			'// IS the spec — you can diff it row by row against the RFC, count',
			'// exactly how many arrows exist, and add a corner case (CLOSING) by',
			'// adding an entry, never by touching control flow. Real stacks make',
			'// the same shape: tcp_input dispatches on the connection\'s state',
			'// first and the segment\'s flags second.',
			'var transitions = map[string]map[string]string{',
			'	"CLOSED": {',
			'		"passive-open": "LISTEN",   // server: bind+listen, no packets yet',
			'		"active-open":  "SYN_SENT", // client: connect() puts a SYN on the wire',
			'	},',
			'	"LISTEN":   {"rcv-syn": "SYN_RCVD"},',
			'	"SYN_SENT": {"rcv-syn-ack": "ESTABLISHED"},',
			'	"SYN_RCVD": {"rcv-ack": "ESTABLISHED"},',
			'	"ESTABLISHED": {',
			'		"close":   "FIN_WAIT_1", // we close first: the active closer\'s road',
			'		"rcv-fin": "CLOSE_WAIT", // peer closed first: now OUR app must Close()',
			'	},',
			'	// Each direction of the stream closes independently, so the active',
			'	// closer\'s path forks on which arrives first: the ACK of our FIN',
			'	// (normal) or the peer\'s own FIN (simultaneous close).',
			'	"FIN_WAIT_1": {',
			'		"rcv-ack": "FIN_WAIT_2",',
			'		"rcv-fin": "CLOSING", // both FINs crossed in flight',
			'	},',
			'	"FIN_WAIT_2": {"rcv-fin": "TIME_WAIT"},',
			'	"CLOSING":    {"rcv-ack": "TIME_WAIT"},',
			'	"CLOSE_WAIT": {"close": "LAST_ACK"},',
			'	"LAST_ACK":   {"rcv-ack": "CLOSED"},',
			'	// TIME_WAIT exits only by timer: 2×MSL is long enough for every',
			'	// stray segment of this incarnation to die in the network before',
			'	// the port pair can be reused — no segment event appears here.',
			'	"TIME_WAIT": {"timeout-2msl": "CLOSED"},',
			'}',
			'',
			'// Next answers "given this state and this event, where does the',
			'// connection go?". ok=false means the table has no arrow: a live',
			'// stack answers those segments with RST (or drops them) — it never',
			'// invents a transition.',
			'func Next(state, event string) (string, bool) {',
			'	// Indexing a nil inner map is safe in Go and yields the zero',
			'	// value, so unknown states fall out as ok=false with no extra',
			'	// check — the double lookup is the entire implementation.',
			'	next, ok := transitions[state][event]',
			'	return next, ok',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The table is the spec</h3>' +
			'<p>A switch-on-state with nested switch-on-event would compute the same ' +
			'function, but the map-of-maps form buys three things: you can ' +
			'<em>diff</em> it against RFC 9293\'s diagram arrow by arrow, you can ' +
			'enumerate it (how many transitions consume <code>rcv-ack</code>? — four), ' +
			'and invalid pairs need no code at all — the failed lookup <em>is</em> the ' +
			'RST decision. Whenever a protocol hands you a finite state diagram, ' +
			'transcribing it as data keeps the implementation honest:</p>',
			{ code: '// the whole engine — every arrow lives in the table, not in code\nnext, ok := transitions[state][event]\nreturn next, ok // ok=false ⇒ the stack answers RST' },
			'<h3>Reading ss output with the diagram in your head</h3>' +
			'<p><strong><code>CLOSE_WAIT</code> piling up is an application bug, ' +
			'yours.</strong> Trace the arrow: the peer\'s FIN moved the connection ' +
			'ESTABLISHED → CLOSE_WAIT, the kernel ACKed it, and the only exit is the ' +
			'<code>close</code> <em>application call</em>. The kernel is waiting on ' +
			'your process — a leaked <code>net.Conn</code>, a response body never ' +
			'closed, a connection pool that lost track of a socket. No timer saves ' +
			'you; the count grows until file descriptors run out.</p>' +
			'<p><strong><code>TIME_WAIT</code> belongs to whoever closes first.</strong> ' +
			'The active closer sends the final ACK of the exchange — and can never ' +
			'know that ACK arrived (acking an ACK would recurse forever). So it must ' +
			'linger 2×MSL, ready to re-ACK a retransmitted FIN, and meanwhile the ' +
			'port pair stays reserved so delayed segments from the old incarnation ' +
			'cannot corrupt a new connection. That is why servers that close ' +
			'connections first (classic non-keep-alive HTTP) accumulate tens of ' +
			'thousands of TIME_WAIT entries and exhaust ephemeral ports — and why ' +
			'protocols are usually designed so the <em>client</em> closes first.</p>' +
			'<p><strong><code>FIN_WAIT_2</code> forever</strong> is the mirror image: ' +
			'you closed, the peer ACKed, and its app never sent the answering FIN — ' +
			'the peer is sitting in CLOSE_WAIT with the bug described above. The two ' +
			'stuck states are the two ends of the same broken teardown.</p>' +
			'<h3>When debugging</h3>' +
			'<p><code>ss -tan state close-wait</code> and ' +
			'<code>ss -tan state time-wait | wc -l</code> are the one-liners; map ' +
			'each count back to an arrow and the diagram tells you which side owns ' +
			'the fix. And when a segment arrives that fits no arrow — a stray ACK to ' +
			'a port in LISTEN, data to a socket in CLOSED — the RST you see in ' +
			'tcpdump is precisely this function returning <code>ok=false</code>.</p>',
		],
		complexity: { time: 'O(1) — two map lookups per event', space: 'O(S·E) — the transition table, ~12 entries' },
	});
})();
