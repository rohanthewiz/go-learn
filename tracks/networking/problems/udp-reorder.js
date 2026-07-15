/* UDP Reordering — UDP (Medium). Sequence numbers plus a reorder buffer:
 * the mechanism every UDP-based protocol (QUIC, RTP, game netcode) rebuilds
 * because UDP hands datagrams up in whatever order the network felt like.
 * The harness replays arrival scripts — in-order, gapped, duplicated,
 * interleaved — and checks what each Deliver call releases to the app.
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// Arrival order 1,3,4,2 on the left; the receiver holds 3 and 4 while
	// the gap at 2 is open, then one Deliver(2) releases the whole run.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 220" width="520" height="220" role="img" aria-label="datagrams arrive 1,3,4,2; 3 and 4 wait in the reorder buffer; when 2 arrives the whole run is delivered in order">' +
		'<text x="20" y="22" class="lbl">arrival order — the network is free to reorder</text>' +
		'<rect x="20" y="32" width="46" height="28" rx="5" fill="none" stroke="var(--ok)"/>' +
		'<text x="43" y="51" text-anchor="middle">1</text>' +
		'<rect x="76" y="32" width="46" height="28" rx="5" fill="none" stroke="var(--warn)"/>' +
		'<text x="99" y="51" text-anchor="middle">3</text>' +
		'<rect x="132" y="32" width="46" height="28" rx="5" fill="none" stroke="var(--warn)"/>' +
		'<text x="155" y="51" text-anchor="middle">4</text>' +
		'<rect x="188" y="32" width="46" height="28" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="211" y="51" text-anchor="middle">2</text>' +
		'<text x="128" y="80" text-anchor="middle" class="lbl">1 delivers · 3, 4 buffered (gap at 2) · 2 closes the gap</text>' +
		'<rect x="300" y="26" width="200" height="52" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="400" y="46" text-anchor="middle" class="lbl">Receiver: next=2</text>' +
		'<text x="400" y="64" text-anchor="middle" class="lbl">buf = {3: m3, 4: m4}</text>' +
		'<path d="M 240 46 L 294 46" stroke="var(--accent)" stroke-width="1.6" fill="none" marker-end="url(#dgArrowNRO)"/>' +
		'<path d="M 400 84 L 400 124" stroke="var(--ok)" stroke-width="1.6" fill="none" marker-end="url(#dgArrowNROok)"/>' +
		'<text x="408" y="108" class="lbl">Deliver(2, m2)</text>' +
		'<rect x="288" y="130" width="46" height="28" rx="5" fill="none" stroke="var(--ok)"/>' +
		'<text x="311" y="149" text-anchor="middle">2</text>' +
		'<rect x="344" y="130" width="46" height="28" rx="5" fill="none" stroke="var(--ok)"/>' +
		'<text x="367" y="149" text-anchor="middle">3</text>' +
		'<rect x="400" y="130" width="46" height="28" rx="5" fill="none" stroke="var(--ok)"/>' +
		'<text x="423" y="149" text-anchor="middle">4</text>' +
		'<text x="394" y="180" text-anchor="middle" class="lbl">one call returns [m2 m3 m4] — in order</text>' +
		'<text x="20" y="208" class="lbl">until 2 arrives, 3 and 4 sit ready but undeliverable — head-of-line blocking</text>' +
		'<defs>' +
		'<marker id="dgArrowNRO" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowNROok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'udp-reorder',
		title: 'UDP Reordering: The Reorder Buffer',
		nav: 'UDP reorder',
		difficulty: 'Medium',
		category: 'UDP',
		task: 'Implement Deliver — buffer early datagrams, drop duplicates, drain the contiguous run when a gap closes.',

		prose: [
			'<h2>UDP Reordering: The Reorder Buffer</h2>' +
			'<p>tcpdump on the sender shows your datagrams leaving as 1, 2, 3, 4. The ' +
			'receiver logs 1, 3, 4, 2 — and once in a while 3 twice. Nothing is broken: ' +
			'UDP adds exactly two things to IP (ports and a checksum), and ordering is ' +
			'not one of them. Routes flap, packets take different paths, a retransmit ' +
			'races its original — IP is allowed to reorder, duplicate, and drop, so UDP ' +
			'is too.</p>' +
			'<p>Every serious protocol built on UDP — QUIC, RTP, most game netcode — ' +
			'rebuilds ordering the same way: the sender stamps each datagram with a ' +
			'<strong>sequence number</strong>, and the receiver keeps a ' +
			'<strong>reorder buffer</strong>. The receiver tracks <code>next</code>, the ' +
			'sequence number the application is waiting for, and answers one question ' +
			'per arrival:</p>' +
			'<ul>' +
			'<li><code>seq &lt; next</code>, or seq already seen → a <strong>duplicate</strong>: ' +
			'nothing new, return nil.</li>' +
			'<li><code>seq &gt; next</code> → <strong>early</strong>: park it in the buffer, ' +
			'return nil — the app must not see it before its predecessors.</li>' +
			'<li><code>seq == next</code> → the gap just closed: deliver it, <em>plus every ' +
			'contiguous buffered successor</em>, advancing <code>next</code> past the run.</li>' +
			'</ul>' +
			DIAGRAM +
			'<div class="tip">This is exactly what TCP\'s receive side does in the ' +
			'kernel, just over byte ranges instead of whole datagrams. Implement it ' +
			'once here and TCP\'s receive queue, SACK, and QUIC streams all become ' +
			'the same picture.</div>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Deliver(seq, data)</code> on <code>*Receiver</code> ' +
			'(the constructor is given; sequence numbers start at 1). Return whatever ' +
			'becomes deliverable <em>in order</em> as a result of this datagram — nil ' +
			'when nothing does. A duplicate must never deliver twice, whether its ' +
			'original was already handed to the app or is still sitting in the buffer.</p>',
			{ code: 'r := NewReceiver()            // next = 1\nr.Deliver(1, "m1") → [m1]     // in order: straight through\nr.Deliver(3, "m3") → []       // early: buffered, waiting on 2\nr.Deliver(4, "m4") → []       // early: buffered\nr.Deliver(2, "m2") → [m2 m3 m4] // gap closes — the whole run drains', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Receiver reassembles an ordered stream from datagrams that may arrive',
			'// out of order or duplicated. next is the sequence number the',
			'// application is waiting for; buf parks datagrams that arrived early,',
			'// keyed by seq; seen records every sequence number ever accepted, so a',
			'// duplicate is recognized even after its data has left buf.',
			'type Receiver struct {',
			'	next int',
			'	buf  map[int]string',
			'	seen map[int]bool',
			'}',
			'',
			'// NewReceiver starts an empty stream: the first expected sequence',
			'// number is 1, nothing buffered, nothing seen.',
			'func NewReceiver() *Receiver {',
			'	return &Receiver{next: 1, buf: map[int]string{}, seen: map[int]bool{}}',
			'}',
			'',
			'// Deliver processes one arriving datagram and returns what becomes',
			'// deliverable to the application IN ORDER as a result — nil if nothing.',
			'// Rules:',
			'//   - seq < next, or seq already seen → duplicate: return nil',
			'//   - seq > next                      → early: buffer it, return nil',
			'//   - seq == next                     → deliver it plus every contiguous',
			'//     buffered successor (advance next past the whole run, emptying buf)',
			'func (r *Receiver) Deliver(seq int, data string) []string {',
			'	// TODO: implement the reorder buffer. This naive passthrough hands',
			'	// every datagram straight to the application — duplicates, wrong',
			'	// order and all.',
			'	return []string{data}',
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
			'	type step struct {',
			'		seq  int',
			'		data string',
			'	}',
			'	type tc struct {',
			'		name  string',
			'		steps []step',
			'		want  string',
			'	}',
			'	cases := []tc{',
			'		{"in-order stream: each datagram delivers immediately",',
			'			[]step{{1, "a"}, {2, "b"}, {3, "c"}},',
			'			"[a] | [b] | [c]"},',
			'		{"gap: 3 and 4 wait buffered until 2 arrives, then the run drains",',
			'			[]step{{1, "m1"}, {3, "m3"}, {4, "m4"}, {2, "m2"}},',
			'			"[m1] | [] | [] | [m2 m3 m4]"},',
			'		{"duplicate of a delivered seq: nothing new, nil",',
			'			[]step{{1, "a"}, {1, "a"}},',
			'			"[a] | []"},',
			'		{"duplicate of a buffered seq: buffered once, drained once",',
			'			[]step{{2, "b"}, {2, "b"}, {1, "a"}},',
			'			"[] | [] | [a b]"},',
			'		{"interleaved gaps: each fill drains exactly its contiguous run",',
			'			[]step{{3, "m3"}, {1, "m1"}, {2, "m2"}, {5, "m5"}, {4, "m4"}},',
			'			"[] | [m1] | [m2 m3] | [] | [m4 m5]"},',
			'		{"nothing lost: shuffled arrival still yields the full stream, in order, once",',
			'			[]step{{2, "m2"}, {4, "m4"}, {1, "m1"}, {6, "m6"}, {3, "m3"}, {5, "m5"}},',
			'			"[] | [] | [m1 m2] | [] | [m3 m4] | [m5 m6]"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			// Fresh receiver per case: reorder state must never leak',
			'			// from one arrival script into the next.',
			'			rcv := NewReceiver()',
			'			outs := make([]string, 0, len(c.steps))',
			'			for _, st := range c.steps {',
			'				// %v prints nil and []string{} identically as [] —',
			'				// "nothing deliverable" may be either.',
			'				outs = append(outs, fmt.Sprintf("%v", rcv.Deliver(st.seq, st.data)))',
			'			}',
			'			got := strings.Join(outs, " | ")',
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
			'// Receiver reassembles an ordered stream from datagrams that may arrive',
			'// out of order or duplicated. next is the sequence number the',
			'// application is waiting for; buf parks datagrams that arrived early,',
			'// keyed by seq; seen records every sequence number ever accepted, so a',
			'// duplicate is recognized even after its data has left buf.',
			'type Receiver struct {',
			'	next int',
			'	buf  map[int]string',
			'	seen map[int]bool',
			'}',
			'',
			'// NewReceiver starts an empty stream: the first expected sequence',
			'// number is 1, nothing buffered, nothing seen.',
			'func NewReceiver() *Receiver {',
			'	return &Receiver{next: 1, buf: map[int]string{}, seen: map[int]bool{}}',
			'}',
			'',
			'// Deliver processes one arriving datagram and returns what becomes',
			'// deliverable to the application IN ORDER as a result — nil if nothing.',
			'func (r *Receiver) Deliver(seq int, data string) []string {',
			'	// seen makes "is this a duplicate?" one uniform question, whether',
			'	// the original was already delivered or is still parked in buf.',
			'	// The seq < next half also rejects nonsense below the stream start.',
			'	// Dedup must come first: a retransmit racing its original is the',
			'	// NORMAL case on UDP, not an error, and must be silently absorbed.',
			'	if seq < r.next || r.seen[seq] {',
			'		return nil',
			'	}',
			'	r.seen[seq] = true',
			'',
			'	if seq > r.next {',
			'		// Early: hold it. The app must never observe a gap — better',
			'		// to sit on ready data than to deliver out of order. This is',
			'		// the choice that CREATES head-of-line blocking; protocols',
			'		// accept it because reordering corrupts streams, waiting',
			'		// only delays them.',
			'		r.buf[seq] = data',
			'		return nil',
			'	}',
			'',
			'	// seq == next: the gap just closed. Deliver this datagram, then',
			'	// drain the contiguous run behind it — every arrival while the gap',
			'	// was open has been waiting for exactly this moment. Deleting as',
			'	// we go keeps buf holding only datagrams that are still early.',
			'	out := []string{data}',
			'	r.next++',
			'	for {',
			'		d, ok := r.buf[r.next]',
			'		if !ok {',
			'			break // next gap starts here; the run is fully drained',
			'		}',
			'		out = append(out, d)',
			'		delete(r.buf, r.next)',
			'		r.next++',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>TCP\'s receive buffer, in miniature</h3>' +
			'<p>What you just built is the receive side of TCP with the serial numbers ' +
			'filed off. A TCP receiver keeps <code>rcv.nxt</code> (your ' +
			'<code>next</code>, in bytes), parks out-of-order segments in the ' +
			'out-of-order queue (your <code>buf</code>), and only moves data into the ' +
			'readable buffer — and only advances the ACK number — when the gap fills ' +
			'and a contiguous run drains. SACK exists precisely because the sender ' +
			'can\'t see your buffer: it tells the sender <em>which</em> early ranges ' +
			'are already parked so only the actual gap gets retransmitted. QUIC runs ' +
			'the same algorithm per stream, keyed by byte offset.</p>' +
			'<h3>Head-of-line blocking falls out of "wait for the gap"</h3>' +
			'<p>Look at what the drain rule costs: when datagram 2 is lost, datagrams ' +
			'3–100 can all be sitting in <code>buf</code>, complete and ready, and the ' +
			'application gets <em>nothing</em> until the retransmit of 2 lands. That ' +
			'is head-of-line blocking, and it is not a bug — it is the price of the ' +
			'ordering guarantee, paid at the worst possible time (right after a ' +
			'loss).</p>',
			{ code: 'out := []string{data} // seq == next: the gap closed\nr.next++\nfor {                 // drain the contiguous run\n\td, ok := r.buf[r.next]\n\tif !ok {\n\t\tbreak // stop at the NEXT gap — later runs keep waiting\n\t}\n\tout = append(out, d)\n\tdelete(r.buf, r.next)\n\tr.next++\n}' },
			'<p>This is why QUIC multiplexes <strong>many independent streams</strong> ' +
			'over one connection, each with its own <code>next</code> and its own ' +
			'buffer: a lost packet stalls only the streams whose data it carried. ' +
			'HTTP/2 over TCP has one shared byte stream underneath, so one lost ' +
			'segment freezes <em>every</em> request on the connection — the exact ' +
			'problem HTTP/3 moved to QUIC to solve.</p>' +
			'<h3>In the real world</h3>' +
			'<p><code>netstat -s</code> counts these events on Linux: look for ' +
			'"out-of-order segments received" spiking when a multipath route or a ' +
			'flapping LACP bond starts reordering. VoIP jitter buffers are the ' +
			'time-domain version of the same structure — they hold early RTP packets ' +
			'just long enough to reorder them. And note what this exercise leaves ' +
			'unbounded: a real receiver caps <code>buf</code> and refuses datagrams ' +
			'beyond the cap — advertise that cap to the sender and you have invented ' +
			'the TCP receive window (two items from now).</p>',
		],
		complexity: { time: 'O(1) amortized per datagram — each message enters and leaves buf at most once', space: 'O(g) — datagrams buffered while a gap is open' },
	});
})();
