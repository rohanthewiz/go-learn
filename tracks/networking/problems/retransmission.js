/* Retransmission — TCP (Medium). Loss detection as a tiny state machine:
 * the fast path (three duplicate ACKs pinpoint the missing byte) and the
 * slow path (RTO expiry with exponential backoff). The harness replays
 * ACK/timeout scripts and compares the emitted retransmission events,
 * including the traces that catch real bugs: dup counters that never reset,
 * backoff that never restores, and stale ACKs miscounted as duplicates.
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// Sender/receiver ladder: segment 2000 is lost, the next three arriving
	// segments each provoke the same ACK, and the third one triggers the
	// retransmit — long before any timer would have fired. Marker ids are
	// namespaced (dgArrowNRT*) because every track's SVGs share the page.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 268" width="520" height="268" role="img" aria-label="segment 2000 is lost; segments 3000-5000 each trigger a duplicate ACK 2000; the third duplicate triggers fast retransmit of segment 2000">' +
		'<text x="120" y="24" text-anchor="middle">sender</text>' +
		'<text x="400" y="24" text-anchor="middle">receiver</text>' +
		'<line x1="120" y1="32" x2="120" y2="248" stroke="var(--edge)" stroke-width="1"/>' +
		'<line x1="400" y1="32" x2="400" y2="248" stroke="var(--edge)" stroke-width="1"/>' +
		'<path d="M 128 40 L 392 54" fill="none" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowNRT)"/>' +
		'<text x="260" y="40" text-anchor="middle" class="lbl">seq=1000</text>' +
		'<path d="M 392 62 L 128 76" fill="none" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowNRT)"/>' +
		'<text x="260" y="62" text-anchor="middle" class="lbl">ACK ack=2000</text>' +
		'<path d="M 128 84 L 258 91" fill="none" stroke="var(--err-edge)" stroke-width="1.4" stroke-dasharray="5 4"/>' +
		'<text x="268" y="96" class="lbl" style="fill:var(--err-fg)">✗ seq=2000 lost</text>' +
		'<path d="M 128 106 L 392 120" fill="none" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowNRT)"/>' +
		'<text x="260" y="106" text-anchor="middle" class="lbl">seq=3000</text>' +
		'<path d="M 392 128 L 128 142" fill="none" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowNRT)"/>' +
		'<text x="260" y="128" text-anchor="middle" class="lbl">ACK ack=2000 (dup 1)</text>' +
		'<path d="M 128 150 L 392 164" fill="none" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowNRT)"/>' +
		'<text x="260" y="150" text-anchor="middle" class="lbl">seq=4000</text>' +
		'<path d="M 392 172 L 128 186" fill="none" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowNRT)"/>' +
		'<text x="260" y="172" text-anchor="middle" class="lbl">ACK ack=2000 (dup 2)</text>' +
		'<path d="M 392 196 L 128 210" fill="none" stroke="var(--warn)" stroke-width="1.8" marker-end="url(#dgArrowNRTw)"/>' +
		'<text x="260" y="196" text-anchor="middle" class="lbl" style="fill:var(--warn)">ACK ack=2000 (dup 3!)</text>' +
		'<path d="M 128 220 L 392 234" fill="none" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowNRTok)"/>' +
		'<text x="260" y="220" text-anchor="middle" class="lbl" style="fill:var(--ok)">fast-retransmit seq=2000</text>' +
		'<text x="20" y="262" class="lbl">three identical ACKs = the receiver shouting “still missing byte 2000” — no timer needed</text>' +
		'<defs>' +
		'<marker id="dgArrowNRT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowNRTw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowNRTok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'retransmission',
		title: 'Loss Detection: Fast Retransmit & RTO',
		nav: 'Retransmission',
		difficulty: 'Medium',
		category: 'TCP',
		task: 'Implement OnAck and OnTimeout: fire fast retransmit on the 3rd duplicate ACK, double the RTO on expiry — all 6 traces.',

		prose: [
			'<h2>Loss Detection: Fast Retransmit &amp; RTO</h2>' +
			'<p>A bulk transfer stalls for exactly one RTO, then resumes; ' +
			'<code>tcpdump</code> shows the same ACK number arriving four times in a ' +
			'row just before a retransmission. Nothing is broken — you are watching ' +
			'the sender <em>decide</em> that a segment died. TCP has two detectors ' +
			'for loss, and which one fires determines whether the stall is ' +
			'milliseconds or seconds:</p>' +
			'<ul>' +
			'<li><strong>Fast retransmit (3 duplicate ACKs).</strong> TCP ACKs are ' +
			'cumulative: <code>ack=2000</code> means “I have every byte below 2000 — ' +
			'send me 2000 next.” When a segment is lost but later ones arrive, the ' +
			'receiver ACKs <em>each</em> arrival with that same number. Every ' +
			'duplicate is a message: <em>more data got through, but I am still ' +
			'missing byte 2000</em>. One or two duplicates can be mere reordering; ' +
			'the third is treated as proof of loss, and the sender immediately ' +
			'retransmits the segment <em>starting at the ACK number</em> — that is ' +
			'exactly the byte the receiver named.</li>' +
			'<li><strong>Retransmission timeout (RTO).</strong> The detector of last ' +
			'resort: nothing came back at all for a full RTO. Each expiry ' +
			'<em>doubles</em> the RTO (exponential backoff) before retransmitting ' +
			'from <code>LastAck</code>; fresh ACK progress snaps the RTO back to its ' +
			'initial value.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>OnAck(ackNo)</code> and <code>OnTimeout()</code> on ' +
			'<code>Detector</code>. Progress (<code>ackNo &gt; LastAck</code>) records ' +
			'the ACK, resets <code>DupCount</code> and the RTO, and returns ' +
			'<code>""</code>. A duplicate (<code>ackNo == LastAck</code>) counts up; ' +
			'the third duplicate for an ack number that has not fired before returns ' +
			'the fast-retransmit event and marks <code>Fired</code>. A stale ACK ' +
			'(<code>ackNo &lt; LastAck</code>) is ignored. A timeout doubles ' +
			'<code>RTO</code> and reports the new value.</p>',
			{ code: 'OnAck(1000)  → ""                                 progress: LastAck=1000\nOnAck(1000)  → ""                                 dup 1 — could be reordering\nOnAck(1000)  → ""                                 dup 2 — still could be\nOnAck(1000)  → "fast-retransmit seq=1000"         dup 3 — the hole is real\nOnAck(1000)  → ""                                 dup 4+ — already fired\nOnTimeout()  → "rto-retransmit seq=1000 rto=400"  RTO 200 doubled first', lang: 'txt' },
			'<div class="tip">The ack number in a duplicate ACK is doing double duty: ' +
			'it identifies the hole <em>and</em> tells the sender exactly which ' +
			'sequence number to retransmit. Fast retransmit needs no extra ' +
			'bookkeeping about which segment to resend — the receiver has been ' +
			'naming it all along.</div>',
		],

		starter: [
			'package main',
			'',
			'// Detector is the sender-side loss detector for one TCP connection.',
			'// TCP finds a lost segment two ways: the fast way (three duplicate ACKs',
			'// pinpoint the missing byte) and the slow way (the retransmission timer',
			'// expires). This struct carries the state both detectors need.',
			'type Detector struct {',
			'	LastAck  int          // highest cumulative ACK seen so far',
			'	DupCount int          // consecutive repeats of LastAck',
			'	RTO      int          // CURRENT retransmission timeout, ms (doubles on expiry)',
			'	Fired    map[int]bool // ack numbers that already triggered a fast retransmit',
			'',
			'	initialRTO int // RTO snaps back here whenever new data is ACKed',
			'}',
			'',
			'// NewDetector starts a detector with the given initial RTO in ms.',
			'func NewDetector(rto int) *Detector {',
			'	return &Detector{RTO: rto, initialRTO: rto, Fired: make(map[int]bool)}',
			'}',
			'',
			'// OnAck processes one incoming cumulative ACK and returns the',
			'// retransmission event it triggers, or "" for none:',
			'//   - ackNo > LastAck: progress. Record it, reset DupCount to 0 and RTO',
			'//     to the initial value. Return "".',
			'//   - ackNo == LastAck: a duplicate. Count it; when DupCount reaches 3',
			'//     and this ack number has not fired before, set Fired[ackNo] and',
			'//     return fmt.Sprintf("fast-retransmit seq=%d", ackNo) — retransmit',
			'//     the segment STARTING at the ack number: that is the byte the',
			'//     receiver is missing. Any further duplicates return "".',
			'//   - ackNo < LastAck: stale (an old ACK finally arrived). Return "".',
			'func (d *Detector) OnAck(ackNo int) string {',
			'	// TODO: implement the three cases above',
			'	return ""',
			'}',
			'',
			'// OnTimeout handles a retransmission-timer expiry: double RTO',
			'// (exponential backoff), then return',
			'// fmt.Sprintf("rto-retransmit seq=%d rto=%d", LastAck, RTO)',
			'// with the RTO value AFTER doubling.',
			'func (d *Detector) OnTimeout() string {',
			'	// TODO',
			'	return ""',
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
			'func main() {',
			'	// replay feeds one event script ("ack <n>" / "timeout") to a fresh',
			'	// detector and pipe-joins the non-empty retransmission events, so a',
			'	// whole scenario compares as a single string.',
			'	replay := func(rto int, script []string) string {',
			'		d := NewDetector(rto)',
			'		events := []string{}',
			'		for _, ev := range script {',
			'			out := ""',
			'			if ev == "timeout" {',
			'				out = d.OnTimeout()',
			'			} else {',
			'				n, _ := strconv.Atoi(strings.TrimPrefix(ev, "ack "))',
			'				out = d.OnAck(n)',
			'			}',
			'			if out != "" {',
			'				events = append(events, out)',
			'			}',
			'		}',
			'		if len(events) == 0 {',
			'			return "(no retransmissions)"',
			'		}',
			'		return strings.Join(events, " | ")',
			'	}',
			'	type tc struct {',
			'		name   string',
			'		rto    int',
			'		script []string',
			'		want   string',
			'	}',
			'	cases := []tc{',
			'		{"3rd duplicate ACK fires fast retransmit once; the 4th is silent",',
			'			200,',
			'			[]string{"ack 1000", "ack 1000", "ack 1000", "ack 1000", "ack 1000"},',
			'			"fast-retransmit seq=1000"},',
			'		{"progress resets the dup counter: 2 dups + 2 dups never fire",',
			'			200,',
			'			[]string{"ack 1000", "ack 1000", "ack 1000", "ack 2000", "ack 2000", "ack 2000"},',
			'			"(no retransmissions)"},',
			'		{"two different holes: each ack number fires its own retransmit",',
			'			200,',
			'			[]string{"ack 1000", "ack 1000", "ack 1000", "ack 1000", "ack 2000", "ack 2000", "ack 2000", "ack 2000"},',
			'			"fast-retransmit seq=1000 | fast-retransmit seq=2000"},',
			'		{"exponential backoff: two expiries double the RTO 200 -> 400 -> 800",',
			'			200,',
			'			[]string{"ack 1000", "timeout", "timeout"},',
			'			"rto-retransmit seq=1000 rto=400 | rto-retransmit seq=1000 rto=800"},',
			'		{"ACK progress snaps the RTO back to its initial value",',
			'			200,',
			'			[]string{"ack 1000", "timeout", "ack 2000", "timeout"},',
			'			"rto-retransmit seq=1000 rto=400 | rto-retransmit seq=2000 rto=400"},',
			'		{"stale ACK below LastAck is a no-op, not a duplicate",',
			'			200,',
			'			[]string{"ack 2000", "ack 1000", "ack 1000", "ack 1000", "timeout"},',
			'			"rto-retransmit seq=2000 rto=400"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  c.want,',
			'		}',
			'		runCase(r, func() {',
			'			// Copy the script slice: user code must not be able to corrupt',
			'			// the case table for later comparisons.',
			'			got := replay(c.rto, append([]string(nil), c.script...))',
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
			'import "fmt"',
			'',
			'// Detector is the sender-side loss detector for one TCP connection.',
			'// TCP finds a lost segment two ways: the fast way (three duplicate ACKs',
			'// pinpoint the missing byte) and the slow way (the retransmission timer',
			'// expires). This struct carries the state both detectors need.',
			'type Detector struct {',
			'	LastAck  int          // highest cumulative ACK seen so far',
			'	DupCount int          // consecutive repeats of LastAck',
			'	RTO      int          // CURRENT retransmission timeout, ms (doubles on expiry)',
			'	Fired    map[int]bool // ack numbers that already triggered a fast retransmit',
			'',
			'	initialRTO int // RTO snaps back here whenever new data is ACKed',
			'}',
			'',
			'// NewDetector starts a detector with the given initial RTO in ms.',
			'func NewDetector(rto int) *Detector {',
			'	return &Detector{RTO: rto, initialRTO: rto, Fired: make(map[int]bool)}',
			'}',
			'',
			'// OnAck classifies one cumulative ACK against connection state. The',
			'// three-way split mirrors what the ACK actually tells the sender:',
			'// progress, "still missing the same byte", or old news.',
			'func (d *Detector) OnAck(ackNo int) string {',
			'	switch {',
			'	case ackNo > d.LastAck:',
			'		// New data reached the receiver: the path is alive and the RTT',
			'		// estimate is trustworthy again, so the dup count starts over',
			'		// and the backed-off RTO snaps back to its base value. Without',
			'		// this reset, one bad episode would leave the connection with a',
			'		// multi-second timer forever.',
			'		d.LastAck = ackNo',
			'		d.DupCount = 0',
			'		d.RTO = d.initialRTO',
			'		return ""',
			'	case ackNo == d.LastAck:',
			'		// Each duplicate means "another segment arrived, but I am STILL',
			'		// missing the byte at ackNo". One or two can be reordering on a',
			'		// multipath network; three is treated as proof of loss.',
			'		d.DupCount++',
			'		if d.DupCount >= 3 && !d.Fired[ackNo] {',
			'			// Fired makes the trigger edge-triggered: dup 4, 5, ... keep',
			'			// arriving while the retransmit is in flight, and resending',
			'			// on every one of them would multiply the very traffic a',
			'			// lossy path cannot absorb.',
			'			d.Fired[ackNo] = true',
			'			return fmt.Sprintf("fast-retransmit seq=%d", ackNo)',
			'		}',
			'		return ""',
			'	default:',
			'		// ackNo < LastAck: a reordered old ACK. Cumulative ACKs are',
			'		// monotone, so it carries no information newer ACKs have not',
			'		// already delivered — counting it as a duplicate of anything',
			'		// would invent a hole that does not exist.',
			'		return ""',
			'	}',
			'}',
			'',
			'// OnTimeout is the detector of last resort: nothing at all came back',
			'// for a full RTO. Doubling BEFORE retransmitting is exponential',
			'// backoff — a timeout usually means congestion, and retransmitting on',
			'// a fixed short timer would pour more traffic into the very queue that',
			'// is already overflowing.',
			'func (d *Detector) OnTimeout() string {',
			'	d.RTO *= 2',
			'	return fmt.Sprintf("rto-retransmit seq=%d rto=%d", d.LastAck, d.RTO)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why exactly three duplicates?</h3>' +
			'<p>A duplicate ACK is generated whenever the receiver gets a segment it ' +
			'cannot append to the in-order stream. That happens for two very ' +
			'different reasons: the earlier segment was <em>lost</em>, or it was ' +
			'merely <em>reordered</em> and will arrive a moment later. Reordering on ' +
			'real paths is usually shallow — a segment leapfrogs one or two others — ' +
			'so one or two duplicates prove nothing. By the third, the odds that the ' +
			'segment is still merely “late” are small enough that waiting the rest of ' +
			'an RTO (often hundreds of ms) costs more than an occasional spurious ' +
			'retransmit. That trade-off, three dups vs. a timer, is the entire reason ' +
			'fast retransmit exists: it converts loss detection from ' +
			'<em>time-triggered</em> to <em>data-triggered</em>.</p>' +
			'<p>The core of the detector is one three-way classification:</p>',
			{ code: 'switch {\ncase ackNo > d.LastAck:   // progress: reset DupCount AND the backed-off RTO\ncase ackNo == d.LastAck:  // "still missing byte ackNo" — 3rd one fires, once\ndefault:                  // stale: monotone cumulative ACKs make it old news\n}' },
			'<h3>Backoff is congestion manners, not just retry logic</h3>' +
			'<p>An RTO expiry is the network saying <em>nothing you sent in the last ' +
			'RTO produced any response</em> — often because a router queue somewhere ' +
			'is full and dropping everything. Retransmitting immediately and ' +
			'repeatedly into that queue makes it worse for everyone; this is exactly ' +
			'how the 1986 congestion collapses happened, and why every TCP since ' +
			'Van Jacobson’s fixes doubles its timer on each successive expiry. The ' +
			'flip side matters just as much: the moment an ACK shows progress, the ' +
			'RTO resets to its base value — backoff is a penalty box, not a life ' +
			'sentence.</p>' +
			'<h3>In the real world</h3>' +
			'<p>Modern stacks refine both detectors. <strong>SACK</strong> (selective ' +
			'acknowledgment) lets the receiver list exactly which byte ranges it ' +
			'holds, so after one loss the sender retransmits only the true holes ' +
			'instead of guessing from cumulative ACKs; <strong>RACK-TLP</strong> goes ' +
			'further and detects loss by per-segment timestamps rather than dup ' +
			'counts. When debugging, <code>ss -ti</code> shows the live ' +
			'<code>rto</code> and <code>retrans</code> counters per connection, and in ' +
			'a capture the signature tells you which detector fired: a retransmission ' +
			'preceded by a burst of identical ACKs was fast retransmit (mild, ' +
			'millisecond-scale); a retransmission after a silent gap was an RTO — and ' +
			'repeated gaps that double each time mean the path, not the peer, is the ' +
			'problem.</p>',
		],
		complexity: { time: 'O(1) per ACK or timer event', space: 'O(f) — one Fired entry per fast-retransmitted hole' },
	});
})();
