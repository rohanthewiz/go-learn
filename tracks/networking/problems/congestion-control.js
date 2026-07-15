/* Congestion Control — TCP (Hard). TCP Reno in whole MSS units: slow start
 * doubles, congestion avoidance adds one, three dup ACKs halve, a timeout
 * resets to one. The harness replays event scripts and compares the full
 * cwnd trace, so an off-by-one at the ssthresh cap or a missing floor shows
 * up as a diverging sequence, not a vague failure.
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// The famous sawtooth: exponential up to ssthresh, linear probing, a
	// multiplicative cut on 3 dup ACKs, a cliff to 1 on timeout, repeat.
	// Marker ids namespaced (dgArrowNCC) — every track's SVGs share the page.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 250" width="560" height="250" role="img" aria-label="cwnd over time: exponential slow start up to ssthresh, linear congestion avoidance, halved on 3 duplicate ACKs, dropped to 1 on timeout, then the cycle repeats">' +
		'<line x1="36" y1="212" x2="540" y2="212" stroke="var(--edge)" stroke-width="1" marker-end="url(#dgArrowNCC)"/>' +
		'<line x1="36" y1="212" x2="36" y2="30" stroke="var(--edge)" stroke-width="1" marker-end="url(#dgArrowNCC)"/>' +
		'<text x="20" y="22" class="lbl">cwnd</text>' +
		'<text x="470" y="228" class="lbl">time (RTT rounds)</text>' +
		// initial ssthresh = 16
		'<line x1="36" y1="84" x2="170" y2="84" stroke="var(--warn)" stroke-width="1.2" stroke-dasharray="5 4"/>' +
		'<text x="44" y="78" class="lbl" style="fill:var(--warn)">ssthresh = 16</text>' +
		// slow start 1,2,4,8,16 then avoidance 17..20
		'<path d="M 40 204 L 70 196 L 100 180 L 130 148 L 160 84 L 190 76 L 220 68 L 250 60 L 280 52" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="52" y="118" class="lbl">slow start: ×2 per RTT</text>' +
		'<text x="220" y="40" text-anchor="middle" class="lbl">congestion avoidance: +1 per RTT</text>' +
		// 3-dup cut: 20 -> 10
		'<line x1="280" y1="52" x2="280" y2="132" stroke="var(--err-edge)" stroke-width="1.8" stroke-dasharray="5 4"/>' +
		'<text x="288" y="94" class="lbl" style="fill:var(--err-fg)">3 dup ACKs: halve</text>' +
		// avoidance 10..14
		'<path d="M 280 132 L 310 124 L 340 116 L 370 108 L 400 100" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		// timeout cliff: 14 -> 1
		'<line x1="400" y1="100" x2="400" y2="204" stroke="var(--err-edge)" stroke-width="1.8" stroke-dasharray="5 4"/>' +
		'<text x="408" y="170" class="lbl" style="fill:var(--err-fg)">timeout: back to 1</text>' +
		// new ssthresh = 7, slow start again 2,4,7(cap),8
		'<line x1="410" y1="156" x2="540" y2="156" stroke="var(--warn)" stroke-width="1.2" stroke-dasharray="5 4"/>' +
		'<text x="448" y="150" class="lbl" style="fill:var(--warn)">new ssthresh = 14/2</text>' +
		'<path d="M 400 204 L 430 196 L 460 180 L 490 156 L 520 148" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="40" y="244" class="lbl">AIMD: probe additively, back off multiplicatively — the sawtooth is TCP breathing</text>' +
		'<defs>' +
		'<marker id="dgArrowNCC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'congestion-control',
		title: 'Congestion Control: TCP Reno (AIMD)',
		nav: 'Congestion control',
		difficulty: 'Hard',
		category: 'TCP',
		task: 'Implement OnRoundAcked, OnTripleDup, and OnTimeout so every cwnd trace matches — all 7 tests.',

		prose: [
			'<h2>Congestion Control: TCP Reno (AIMD)</h2>' +
			'<p>A single flow on a clean 10&nbsp;Gb path tops out at a fraction of ' +
			'link speed, and its throughput graph is a perfect sawtooth. That shape ' +
			'is not a bug in your service — it is the sender’s ' +
			'<strong>congestion window</strong> (<code>cwnd</code>) at work: a ' +
			'sender-side limit on how much unacknowledged data may be in flight. ' +
			'Unlike the receive window, it appears in no header; it exists only in ' +
			'the sender’s memory, and it moves in response to exactly three kinds of ' +
			'events:</p>' +
			'<ul>' +
			'<li><strong>A whole window acked (one RTT of progress).</strong> Below ' +
			'<code>Ssthresh</code> the connection is in <em>slow start</em>: ' +
			'<code>cwnd</code> doubles each round — but caps <em>at</em> ' +
			'<code>Ssthresh</code>, never overshooting past it. At or above ' +
			'<code>Ssthresh</code> it is in <em>congestion avoidance</em>: ' +
			'<code>cwnd += 1</code>, a gentle linear probe for spare capacity.</li>' +
			'<li><strong>Three duplicate ACKs.</strong> One segment died but data is ' +
			'still flowing — a mild signal. <code>Ssthresh = max(cwnd/2, 2)</code>, ' +
			'and <code>cwnd</code> drops <em>to</em> that halved value: multiplicative ' +
			'decrease, then straight back to linear probing.</li>' +
			'<li><strong>Timeout.</strong> Nothing at all is getting through — the ' +
			'severe signal. <code>Ssthresh = max(cwnd/2, 2)</code> as before, but ' +
			'<code>cwnd</code> resets to <code>1</code>: the connection re-earns its ' +
			'window from scratch via slow start.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the three event methods on <code>Reno</code> (units are ' +
			'whole MSS, all integer math). The harness replays event scripts and ' +
			'records <code>Cwnd</code> after every event — your traces must match ' +
			'exactly, including the cap <em>at</em> <code>Ssthresh</code> and the ' +
			'floor of 2 on the halved threshold.</p>',
			{ code: 'fresh connection: cwnd=1 ssthresh=64\nOnRoundAcked() ×5 → cwnd 2, 4, 8, 16, 32    slow start: ×2 per RTT\nOnTripleDup()     → ssthresh 16, cwnd 16    halve, keep probing linearly\nOnRoundAcked()    → cwnd 17                 additive increase from here\nOnTimeout()       → ssthresh 8,  cwnd 1     total silence: start over', lang: 'txt' },
			'<div class="tip">Keep the two loss reactions distinct in your head: ' +
			'3&nbsp;dup ACKs means <em>the pipe still works</em> (later segments got ' +
			'through and provoked those ACKs), so Reno stays at half speed. A timeout ' +
			'means <em>the pipe may be gone</em>, so Reno assumes nothing and ' +
			'restarts from one segment.</div>',
		],

		starter: [
			'package main',
			'',
			'// Reno models TCP Reno\'s congestion window in whole MSS units. The',
			'// real algorithm works in bytes, but every interesting decision is',
			'// visible at MSS granularity, and integers keep the traces exact.',
			'type Reno struct {',
			'	Cwnd     int // congestion window: segments allowed in flight per RTT',
			'	Ssthresh int // slow-start threshold: where exponential hands over to linear',
			'}',
			'',
			'// NewReno starts a connection the classic way: a minimal window, and a',
			'// threshold high enough that the first loss (not the threshold)',
			'// usually ends slow start.',
			'func NewReno() *Reno {',
			'	return &Reno{Cwnd: 1, Ssthresh: 64}',
			'}',
			'',
			'// OnRoundAcked models one full RTT in which the entire window was',
			'// acknowledged:',
			'//   - Cwnd < Ssthresh (slow start): double Cwnd, but cap it AT',
			'//     Ssthresh — never overshoot past the threshold.',
			'//   - Cwnd >= Ssthresh (congestion avoidance): Cwnd += 1.',
			'func (r *Reno) OnRoundAcked() {',
			'	// TODO',
			'}',
			'',
			'// OnTripleDup models loss detected by three duplicate ACKs (fast',
			'// retransmit → fast recovery): Ssthresh = max(Cwnd/2, 2), and Cwnd',
			'// drops TO the new Ssthresh — multiplicative decrease, staying in',
			'// congestion avoidance.',
			'func (r *Reno) OnTripleDup() {',
			'	// TODO',
			'}',
			'',
			'// OnTimeout models an RTO expiry: Ssthresh = max(Cwnd/2, 2), and Cwnd',
			'// resets to 1 — back to slow start from scratch, because a timeout',
			'// means NOTHING is getting through.',
			'func (r *Reno) OnTimeout() {',
			'	// TODO',
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
			'	// replay drives one Reno instance through a script of events and',
			'	// records Cwnd after every event: comparing whole traces pins down',
			'	// WHERE a wrong implementation diverges, not just that it did.',
			'	replay := func(cwnd, ssthresh int, script []string) string {',
			'		r := NewReno()',
			'		r.Cwnd, r.Ssthresh = cwnd, ssthresh',
			'		trace := []string{}',
			'		for _, ev := range script {',
			'			switch ev {',
			'			case "ack":',
			'				r.OnRoundAcked()',
			'			case "3dup":',
			'				r.OnTripleDup()',
			'			case "timeout":',
			'				r.OnTimeout()',
			'			}',
			'			trace = append(trace, strconv.Itoa(r.Cwnd))',
			'		}',
			'		return strings.Join(trace, ",")',
			'	}',
			'	type tc struct {',
			'		name           string',
			'		cwnd, ssthresh int',
			'		script         []string',
			'		want           string',
			'	}',
			'	cases := []tc{',
			'		{"slow start doubles the window every RTT", 1, 64,',
			'			[]string{"ack", "ack", "ack", "ack"},',
			'			"2,4,8,16"},',
			'		{"doubling caps AT ssthresh, then goes additive", 1, 12,',
			'			[]string{"ack", "ack", "ack", "ack", "ack", "ack"},',
			'			"2,4,8,12,13,14"},',
			'		{"congestion avoidance: +1 per RTT, no doubling", 16, 16,',
			'			[]string{"ack", "ack", "ack"},',
			'			"17,18,19"},',
			'		{"triple dup: halve to ssthresh, stay additive", 20, 64,',
			'			[]string{"3dup", "ack", "ack"},',
			'			"10,11,12"},',
			'		{"timeout: cwnd 1, then slow-start up to the halved ssthresh", 20, 64,',
			'			[]string{"timeout", "ack", "ack", "ack", "ack", "ack"},',
			'			"1,2,4,8,10,11"},',
			'		{"ssthresh floors at 2 MSS on loss at a tiny window", 3, 64,',
			'			[]string{"3dup", "ack"},',
			'			"2,3"},',
			'		{"full sawtooth: mixed trace from cwnd=1 ssthresh=8", 1, 8,',
			'			[]string{"ack", "ack", "ack", "ack", "ack", "3dup", "ack", "ack", "timeout", "ack", "ack", "ack"},',
			'			"2,4,8,9,10,5,6,7,1,2,3,4"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  c.want,',
			'		}',
			'		runCase(r, func() {',
			'			got := replay(c.cwnd, c.ssthresh, append([]string(nil), c.script...))',
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
			'// Reno models TCP Reno\'s congestion window in whole MSS units. The',
			'// real algorithm works in bytes, but every interesting decision is',
			'// visible at MSS granularity, and integers keep the traces exact.',
			'type Reno struct {',
			'	Cwnd     int // congestion window: segments allowed in flight per RTT',
			'	Ssthresh int // slow-start threshold: where exponential hands over to linear',
			'}',
			'',
			'// NewReno starts a connection the classic way: a minimal window, and a',
			'// threshold high enough that the first loss (not the threshold)',
			'// usually ends slow start.',
			'func NewReno() *Reno {',
			'	return &Reno{Cwnd: 1, Ssthresh: 64}',
			'}',
			'',
			'// halfCwnd is the multiplicative-decrease step shared by both loss',
			'// reactions: half the window, floored at 2 MSS. Without the floor a',
			'// loss at cwnd 2 or 3 would set ssthresh to 1, slow start would end',
			'// after a single segment, and the connection would crawl upward from',
			'// nothing at +1 per RTT — punishing far beyond what one loss proves.',
			'func halfCwnd(cwnd int) int {',
			'	half := cwnd / 2',
			'	if half < 2 {',
			'		return 2',
			'	}',
			'	return half',
			'}',
			'',
			'// OnRoundAcked grows the window after one clean RTT. The cap AT',
			'// Ssthresh matters: the threshold marks where loss happened before, so',
			'// blasting PAST it in one doubling step would re-enter the danger zone',
			'// at exactly the moment the algorithm should turn cautious. Reno',
			'// lands on the threshold, then probes beyond it one MSS at a time.',
			'func (r *Reno) OnRoundAcked() {',
			'	if r.Cwnd < r.Ssthresh {',
			'		r.Cwnd *= 2',
			'		if r.Cwnd > r.Ssthresh {',
			'			r.Cwnd = r.Ssthresh',
			'		}',
			'		return',
			'	}',
			'	// Additive increase: at threshold or above, capacity is probed',
			'	// linearly so a fleet of competing flows creeps up together instead',
			'	// of stampeding.',
			'	r.Cwnd++',
			'}',
			'',
			'// OnTripleDup is the mild loss reaction. Duplicate ACKs are proof the',
			'// path still delivers data (later segments arrived and provoked them),',
			'// so Reno halves and keeps transmitting in congestion-avoidance mode',
			'// rather than restarting — this is fast recovery\'s essence.',
			'func (r *Reno) OnTripleDup() {',
			'	r.Ssthresh = halfCwnd(r.Cwnd)',
			'	r.Cwnd = r.Ssthresh',
			'}',
			'',
			'// OnTimeout is the severe reaction. A full RTO with no ACK at all is',
			'// evidence the path may be badly congested or down, so every',
			'// assumption is discarded: the halved threshold remembers roughly',
			'// where trouble started, but the window restarts from 1 and must',
			'// re-earn its size through slow start.',
			'func (r *Reno) OnTimeout() {',
			'	r.Ssthresh = halfCwnd(r.Cwnd)',
			'	r.Cwnd = 1',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>AIMD is why the internet does not collapse</h3>' +
			'<p>Additive increase / multiplicative decrease is not an arbitrary pair ' +
			'of rules — it is the combination with a proof behind it. Chiu and Jain ' +
			'showed that when competing flows all add a constant on success and ' +
			'multiply by a fraction on loss, their shares <em>converge to a fair ' +
			'split</em> of the bottleneck: the flow with the bigger window loses more ' +
			'in each halving, so every loss event closes the gap between flows. ' +
			'Additive/additive never converges; multiplicative/multiplicative ' +
			'preserves whatever unfairness existed at the start. The sawtooth you see ' +
			'in throughput graphs is this negotiation running forever — each flow ' +
			'gently probing for spare capacity, then conceding half the moment the ' +
			'network pushes back. Before these rules (1986, pre-Van Jacobson), ' +
			'senders retried into congestion at full rate and the ARPANET repeatedly ' +
			'melted down to ~0.1% of capacity: congestion <em>collapse</em>.</p>' +
			'<p>The entire algorithm fits in three reactions:</p>',
			{ code: '// one clean RTT\nif cwnd < ssthresh { cwnd = min(cwnd*2, ssthresh) } // slow start, capped\nelse               { cwnd++ }                       // additive probe\n\nssthresh = max(cwnd/2, 2)  // any loss: remember half as the safe zone\ncwnd = ssthresh            // 3 dup ACKs — pipe alive, stay at half speed\ncwnd = 1                   // timeout — pipe silent, re-earn everything' },
			'<h3>Two losses, two severities</h3>' +
			'<p>The asymmetry between the reactions is the deepest idea in Reno. ' +
			'Three duplicate ACKs carry good news inside the bad: segments ' +
			'<em>after</em> the lost one are still being delivered, so the bottleneck ' +
			'is dropping the occasional packet, not failing. Halving is a ' +
			'proportionate response. A timeout carries no news at all — for a full ' +
			'RTO not one ACK returned — which is consistent with a dead path, a ' +
			'rerouted flow, or a queue dropping everything. Restarting at ' +
			'<code>cwnd=1</code> costs little if the path is truly broken and ' +
			'protects the network if it is drowning. Slow start’s exponential climb ' +
			'then recovers most of the window in a handful of RTTs — log-time, not ' +
			'linear — which is why the “start from 1” penalty is affordable.</p>' +
			'<h3>In the real world</h3>' +
			'<p>Linux has defaulted to <strong>Cubic</strong> since 2006: it replaces ' +
			'Reno’s linear probe with a cubic curve of <em>time since last loss</em>, ' +
			'so long-RTT flows are no longer punished for their distance. ' +
			'<strong>BBR</strong> abandons loss as the primary signal entirely, ' +
			'estimating bottleneck bandwidth and min-RTT and pacing to match. But ' +
			'both keep AIMD’s contract with the network — back off hard when it ' +
			'hurts. When debugging throughput, <code>ss -ti</code> prints the live ' +
			'<code>cwnd</code> and <code>ssthresh</code> per connection: a cwnd stuck ' +
			'in single digits with a climbing <code>retrans</code> counter means you ' +
			'are watching this sawtooth grind against a lossy path, and no amount of ' +
			'application tuning will fix it.</p>',
		],
		complexity: { time: 'O(1) per RTT event', space: 'O(1)' },
	});
})();
