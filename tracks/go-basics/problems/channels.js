/* Channels — Concurrency (lesson). The producer/consumer handoff: send,
 * receive, close, range. Close-to-end-a-range is the load-bearing idea —
 * it is what makes the fan-in and worker-pool problems solvable, and
 * forgetting it is the first deadlock most people write (the prose says so
 * out loud, because in this sandbox that mistake surfaces as a timeout).
 */
(function () {
	'use strict';
	var T = GoLearnGoBasics;

	// One producer goroutine, one channel, main consuming with range.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 170" width="540" height="170" role="img" aria-label="a producer goroutine sends 1..5 into a channel and closes it; main ranges over the channel and the range ends at close">' +
		'<text x="20" y="24" class="lbl">the channel is the meeting point: send blocks until receive, close ends the range</text>' +
		'<rect x="30" y="60" width="120" height="44" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="90" y="82" text-anchor="middle" class="lbl">producer</text>' +
		'<text x="90" y="97" text-anchor="middle" class="lbl">ch &lt;- 1 … 5</text>' +
		'<path d="M 150 82 L 216 82" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowGBCH)"/>' +
		'<rect x="220" y="62" width="100" height="40" rx="20" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="270" y="87" text-anchor="middle">ch</text>' +
		'<path d="M 320 82 L 386 82" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowGBCH)"/>' +
		'<rect x="390" y="60" width="120" height="44" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="450" y="82" text-anchor="middle" class="lbl">main</text>' +
		'<text x="450" y="97" text-anchor="middle" class="lbl">for v := range ch</text>' +
		'<path d="M 90 104 L 90 136 L 262 136" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowGBCHe)"/>' +
		'<text x="300" y="140" class="lbl" style="fill:var(--err-fg)">close(ch) — the range loop exits</text>' +
		'<defs>' +
		'<marker id="dgArrowGBCH" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowGBCHe" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'channels',
		title: 'Channels',
		nav: 'channels',
		category: 'Concurrency',

		prose: [
			'<h2>Channels</h2>' +
			'<p>A channel is a typed conduit between goroutines: one sends, another ' +
			'receives, and the channel synchronizes them. On an <em>unbuffered</em> ' +
			'channel every send blocks until a receiver is ready (and vice versa) — the ' +
			'two goroutines meet at the exchange. That blocking is the feature: data ' +
			'transfer and synchronization in one operation, no locks in sight.</p>',
			{ code: 'ch := make(chan int)     // unbuffered: send meets receive\nch := make(chan int, 8)  // buffered: up to 8 sends park without a receiver\n\nch <- 42                 // send\nv := <-ch                // receive\nclose(ch)                // no more values will ever be sent' },
			'<p>The consumer side has a dedicated loop. <code>for v := range ch</code> ' +
			'receives until the channel is <em>closed and drained</em> — which is why ' +
			'the producer must <code>close(ch)</code> when it is done. Forget the close ' +
			'and the range waits forever: in a real program that goroutine leaks; in ' +
			'this sandbox the run times out. That is not the sandbox being fussy — it ' +
			'is showing you a real deadlock.</p>',
			{ code: 'go func() {\n\tfor i := 1; i <= 5; i++ {\n\t\tch <- i\n\t}\n\tclose(ch) // sender closes — ALWAYS the sender, never the receiver\n}()\n\nfor v := range ch { // ends when ch is closed and empty\n\ttotal += v\n}' },
			DIAGRAM +
			'<p>Ownership of the close matters: the <em>sender</em> closes, because only ' +
			'the sender knows when there is nothing left to send. Sending on a closed ' +
			'channel panics; receiving from one yields zero values immediately (the ' +
			'two-value form <code>v, ok := &lt;-ch</code> reports which case you are ' +
			'in).</p>' +
			'<h3>Your job</h3>' +
			'<p>Produce the numbers 1 through 5 on a channel from a goroutine, close ' +
			'it, and sum them in <code>main</code> with <code>range</code>.</p>',
		],
		task: 'Send 1..5 from a producer goroutine, sum them via range, and print exactly: total: 15',
		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	// make a channel, send 1..5 into it from a goroutine (then close!),',
			'	// and sum the values here with: for v := range ch',
			'	total := 0',
			'',
			'	fmt.Println("total:", total)',
			'}',
			'',
		].join('\n'),
		check: function (stdout, flat) { return flat.indexOf('total: 15') !== -1; },
		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	ch := make(chan int)',
			'',
			'	// The producer owns the send side, so the producer closes. Unbuffered',
			'	// channel: each send parks this goroutine until main receives — the',
			'	// two goroutines hand values across in lockstep.',
			'	go func() {',
			'		for i := 1; i <= 5; i++ {',
			'			ch <- i',
			'		}',
			'		close(ch)',
			'	}()',
			'',
			'	total := 0',
			'	for v := range ch { // exits when ch is closed and drained',
			'		total += v',
			'	}',
			'	fmt.Println("total:", total)',
			'}',
			'',
		].join('\n'),
		explanation: [
			'<h3>Unbuffered vs buffered</h3>' +
			'<p>This solution works identically with <code>make(chan int, 5)</code> — ' +
			'the producer would just finish all five sends without waiting, and main ' +
			'would drain the buffer. Buffering changes <em>throughput and coupling</em>, ' +
			'never correctness of a properly synchronized program. A useful default: ' +
			'start unbuffered, add capacity only when you can say what the buffer is ' +
			'for (smoothing bursts, a bounded queue). A buffer added to &ldquo;fix a ' +
			'deadlock&rdquo; has usually just moved the deadlock to a bigger input.</p>' +
			'<h3>The rules around close</h3>' +
			'<p>Three worth engraving: only the sender closes; closing twice panics; ' +
			'sending on a closed channel panics. Receivers never need to close anything ' +
			'— a receive from a closed channel returns immediately with the zero value ' +
			'and <code>ok == false</code>. And nil channels block forever on both send ' +
			'and receive, which sounds useless until you meet <code>select</code> ' +
			'(next item), where setting a channel to nil is the idiom for switching a ' +
			'case off.</p>' +
			'<h3>Channels or mutexes?</h3>' +
			'<p>The Go proverb is &ldquo;share memory by communicating&rdquo;: channels ' +
			'shine when data flows through stages — pipelines, fan-in, worker pools, ' +
			'all coming up. When goroutines merely need to touch the same counter or ' +
			'map, a mutex is smaller and clearer; that is the safe-counter item. ' +
			'Choosing between them is most of the craft of concurrent Go.</p>',
		],
	});
})();
