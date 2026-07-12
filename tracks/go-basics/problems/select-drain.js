/* Non-blocking Receive — Concurrency (Easy). select with a default arm is
 * Go's "try, do not wait" primitive. Drain(ch) is the smallest real function
 * that needs it: take everything already buffered, touch nothing else, never
 * block. The closed-channel test case forces the two-value receive — an
 * implementation that ignores ok spins forever on a closed channel (and
 * times out here), which is exactly the bug this item exists to teach.
 */
(function () {
	'use strict';
	var T = GoLearnGoBasics;

	// select as a fork: a ready receive goes one way, "would block" the other.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 180" width="540" height="180" role="img" aria-label="select tries the receive; if a value is ready it loops, if the channel would block the default arm returns immediately">' +
		'<text x="20" y="24" class="lbl">select { case v := &lt;-ch: … default: … } — never waits</text>' +
		'<rect x="30" y="70" width="110" height="40" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="85" y="95" text-anchor="middle">select</text>' +
		'<path d="M 140 80 L 230 52" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowGBSD)"/>' +
		'<rect x="234" y="32" width="170" height="36" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="319" y="55" text-anchor="middle" class="lbl">value ready → append, loop</text>' +
		'<path d="M 140 100 L 230 128" stroke="var(--err-edge)" stroke-width="2" marker-end="url(#dgArrowGBSDe)"/>' +
		'<rect x="234" y="112" width="170" height="36" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="319" y="135" text-anchor="middle" class="lbl">would block → default: return</text>' +
		'<path d="M 404 50 C 470 50 470 90 404 122" stroke="var(--edge)" stroke-width="1.2" fill="none" stroke-dasharray="4 4"/>' +
		'<text x="452" y="92" class="lbl">closed?</text>' +
		'<text x="452" y="107" class="lbl">ok=false</text>' +
		'<defs>' +
		'<marker id="dgArrowGBSD" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowGBSDe" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'select-drain',
		title: 'Non-blocking Receive',
		nav: 'select & default',
		difficulty: 'Easy',
		category: 'Concurrency',
		task: 'Implement Drain — collect every value already available in the channel without ever blocking. All 5 tests.',

		prose: [
			'<h2>Non-blocking Receive</h2>' +
			'<p>Every channel operation so far <em>waits</em>. Usually that is what you ' +
			'want — the waiting is the synchronization — but sometimes the question is ' +
			'&ldquo;is there anything for me <em>right now</em>?&rdquo;: polling a ' +
			'progress channel in a UI loop, flushing whatever accumulated, checking for ' +
			'a cancel signal between work items. Go&rsquo;s answer is ' +
			'<code>select</code> with a <code>default</code> arm:</p>',
			{ code: 'select {\ncase v := <-ch:\n\t// a value was ready — took it without waiting\ndefault:\n\t// ch had nothing ready (or no receiver/sender counterpart)\n\t// this arm runs IMMEDIATELY instead of blocking\n}' },
			'<p><code>select</code> normally blocks until one of its channel cases can ' +
			'proceed (picking uniformly at random among ready ones — starvation ' +
			'insurance). A <code>default</code> arm changes the contract: if no case is ' +
			'ready <em>this instant</em>, run <code>default</code> and move on.</p>' +
			DIAGRAM +
			'<p>One wrinkle deserves respect: a <strong>closed</strong> channel is ' +
			'always ready — it delivers zero values forever. A drain loop that only ' +
			'looks at the value will collect zeros until the end of time. The two-value ' +
			'receive tells the cases apart: <code>v, ok := &lt;-ch</code> gives ' +
			'<code>ok == false</code> exactly when the channel is closed and empty.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Drain(ch)</code>: repeatedly take values that are ' +
			'already available and return the moment the channel would block ' +
			'<em>or</em> turns out to be closed. Never wait, never close the channel — ' +
			'the caller keeps using it.</p>',
			{ code: 'ch has 7, 8 buffered   → Drain(ch) == [7 8], ch still open and usable\nch is empty            → Drain(ch) == [],    returns immediately\nch closed, 1 2 inside  → Drain(ch) == [1 2], then stops — no zero spam', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Drain receives every value already available in ch and returns them',
			'// in order — WITHOUT ever blocking. If ch is empty, return at once.',
			'// If ch is closed, collect what remains and stop. Never close ch.',
			'func Drain(ch <-chan int) []int {',
			'	out := []int{}',
			'	// your code here',
			'	return out',
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
			'	results := make([]map[string]any, 0, 5)',
			'	add := func(name string, want string, body func() string) {',
			'		r := map[string]any{"input": name, "want": want}',
			'		runCase(r, func() {',
			'			got := body()',
			'			r["pass"] = got == want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	// One open channel reused across three cases: Drain must neither',
			'	// block on it nor close it, or the later cases break — that reuse',
			'	// IS the test of "leave the channel usable".',
			'	ch := make(chan int, 4)',
			'	ch <- 7',
			'	ch <- 8',
			'	add("open channel holding 7 8", "[7 8]", func() string {',
			'		return fmt.Sprint(Drain(ch))',
			'	})',
			'	add("same channel, now empty", "[]", func() string {',
			'		return fmt.Sprint(Drain(ch))',
			'	})',
			'	add("still usable: send 5 after draining", "[5]", func() string {',
			'		ch <- 5 // panics here if Drain closed the channel',
			'		return fmt.Sprint(Drain(ch))',
			'	})',
			'',
			'	closed := make(chan int, 2)',
			'	closed <- 1',
			'	closed <- 2',
			'	close(closed)',
			'	add("closed channel with 1 2 left inside", "[1 2]", func() string {',
			'		return fmt.Sprint(Drain(closed))',
			'	})',
			'	add("closed and empty", "[]", func() string {',
			'		return fmt.Sprint(Drain(closed))',
			'	})',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// Drain receives every value already available in ch, never blocking.',
			'//',
			'// The loop has exactly three exits and each is a different channel',
			'// state: default fires when a receive would block (open but empty),',
			'// ok==false fires when the channel is closed and drained, and a ready',
			'// value takes another lap. Dropping the ok check is the classic bug:',
			'// a closed channel is ALWAYS ready, so the select never reaches',
			'// default and the loop appends zeros forever.',
			'func Drain(ch <-chan int) []int {',
			'	out := []int{}',
			'	for {',
			'		select {',
			'		case v, ok := <-ch:',
			'			if !ok {',
			'				return out // closed and empty — stop, no zero spam',
			'			}',
			'			out = append(out, v)',
			'		default:',
			'			return out // open but nothing ready — would block, so leave',
			'		}',
			'	}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Three channel states, three exits</h3>' +
			'<p>The whole function is a case analysis on what a receive would do: ' +
			'<em>ready with a value</em> (take it, loop), <em>would block</em> ' +
			'(<code>default</code> — return), <em>closed</em> (<code>ok</code> is false ' +
			'— return). The test that reuses one channel across three calls is checking ' +
			'the contract most drain implementations get wrong in the wild: draining ' +
			'must be an observation, not a mutation. The caller still owns the channel; ' +
			'closing it here would be the receiver closing, which the channels lesson ' +
			'called out as the wrong side.</p>' +
			'<h3>The same shape does non-blocking send</h3>' +
			'<p><code>select { case ch &lt;- v: default: }</code> is &ldquo;deliver if ' +
			'anyone is listening, drop otherwise&rdquo; — how you publish progress ' +
			'updates without ever letting a slow listener stall the worker. Metrics and ' +
			'log-shipping code is full of this.</p>' +
			'<h3>Where select goes from here</h3>' +
			'<p>Multiple real cases in one select is the heart of production Go: a ' +
			'worker blocking on <code>case job := &lt;-jobs</code> and ' +
			'<code>case &lt;-ctx.Done()</code> simultaneously is how cancellation ' +
			'works everywhere. Two more idioms to file away: a <em>nil</em> channel ' +
			'blocks forever, so setting one case&rsquo;s channel to nil disables just ' +
			'that arm of a select loop; and <code>time.After</code> as a case gives ' +
			'timeouts (no timers in this sandbox, but the shape is the same select).</p>',
		],
		complexity: { time: 'O(n) — one receive per buffered value', space: 'O(n) for the result' },
	});
})();
