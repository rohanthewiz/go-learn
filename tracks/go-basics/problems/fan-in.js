/* Fan-in — Concurrency (Medium). Merge two channels into one: a forwarding
 * goroutine per input, a WaitGroup counting them, and a closer goroutine
 * that closes the output after Wait. The item drills the one rule that
 * makes multi-producer channels hard: exactly one party may close, and it
 * must be someone who KNOWS both senders are finished.
 *
 * API note: two named parameters rather than a []<-chan slice, because the
 * sandbox interpreter mishandles `for v := range ch` when ch is itself a
 * range-loop value variable (yaegi types it as the element index) — the
 * idiomatic slice solution would hit a cryptic interpreter error. Two
 * params keep every natural solution on supported ground.
 */
(function () {
	'use strict';
	var T = GoLearnGoBasics;

	// Two streams converging into one output; the WaitGroup guards close.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="two input channels each forwarded by a goroutine into one output channel; a closer goroutine waits for both forwarders then closes the output">' +
		'<text x="20" y="24" class="lbl">one forwarder per input; close(out) only after BOTH are done</text>' +
		'<rect x="30" y="48" width="80" height="36" rx="18" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="70" y="71" text-anchor="middle" class="lbl">a</text>' +
		'<rect x="30" y="120" width="80" height="36" rx="18" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="70" y="143" text-anchor="middle" class="lbl">b</text>' +
		'<rect x="150" y="48" width="130" height="36" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="215" y="71" text-anchor="middle" class="lbl">for v := range a</text>' +
		'<rect x="150" y="120" width="130" height="36" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="215" y="143" text-anchor="middle" class="lbl">for v := range b</text>' +
		'<path d="M 110 66 L 146 66" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowGBFI)"/>' +
		'<path d="M 110 138 L 146 138" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowGBFI)"/>' +
		'<path d="M 280 66 L 350 92" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowGBFIo)"/>' +
		'<path d="M 280 138 L 350 112" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowGBFIo)"/>' +
		'<rect x="354" y="84" width="90" height="36" rx="18" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="399" y="107" text-anchor="middle">out</text>' +
		'<path d="M 215 84 L 215 104 L 300 178 L 380 178" stroke="var(--err-edge)" stroke-width="1.4" fill="none" stroke-dasharray="5 4"/>' +
		'<path d="M 215 156 L 215 166 L 300 178" stroke="var(--err-edge)" stroke-width="1.4" fill="none" stroke-dasharray="5 4"/>' +
		'<text x="388" y="182" class="lbl" style="fill:var(--err-fg)">wg.Wait(); close(out)</text>' +
		'<defs>' +
		'<marker id="dgArrowGBFI" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowGBFIo" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'fan-in',
		title: 'Fan-in: Merge Channels',
		nav: 'fan-in (merge)',
		difficulty: 'Medium',
		category: 'Concurrency',
		task: 'Implement Merge — forward every value from both inputs into one output channel, closing it when both inputs are exhausted. All 4 tests.',

		prose: [
			'<h2>Fan-in: Merge Channels</h2>' +
			'<p>Fan-in is the pattern behind &ldquo;N producers, one consumer&rdquo;: ' +
			'several goroutines each emit results on their own channel, and downstream ' +
			'code wants a single stream. Merging two channels sounds like a loop, but ' +
			'the interesting part is entirely about <em>shutdown</em>:</p>' +
			'<ul>' +
			'<li>The consumer will read <code>out</code> with <code>range</code>, so ' +
			'<strong>someone must close it</strong> — otherwise the consumer waits ' +
			'forever.</li>' +
			'<li>Neither forwarder may close it, because the <em>other</em> forwarder ' +
			'may still be sending — and a send on a closed channel panics.</li>' +
			'</ul>' +
			'<p>The resolution is the shape from the goroutines lesson, one level up: ' +
			'a WaitGroup counts the forwarders, and a third goroutine — the only party ' +
			'who knows when <em>everyone</em> is done — performs the close:</p>',
			{ code: 'var wg sync.WaitGroup\nforward := func(ch <-chan int) {\n\tdefer wg.Done()\n\tfor v := range ch {\n\t\tout <- v\n\t}\n}\nwg.Add(2)\ngo forward(a)\ngo forward(b)\n\ngo func() {\n\twg.Wait()   // both forwarders exited → both inputs are closed and drained\n\tclose(out)  // NOW closing is safe\n}()' },
			DIAGRAM +
			'<p>Why must the <code>Wait</code>-then-<code>close</code> live in its own ' +
			'goroutine? Because <code>Merge</code> should <em>return the channel ' +
			'immediately</em> — the values have nowhere to go until the caller starts ' +
			'receiving, so waiting inline would deadlock: forwarders blocked sending ' +
			'into <code>out</code>, <code>Merge</code> blocked waiting for ' +
			'forwarders.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Merge(a, b)</code>. Order across the two inputs is ' +
			'unspecified (the tests sort), but every value must arrive exactly once, ' +
			'and <code>out</code> must be closed when both inputs are done.</p>',
		],

		starter: [
			'package main',
			'',
			'// Merge fans a and b into one channel: every value from either input',
			'// is forwarded to the returned channel, which is closed once BOTH',
			'// inputs are closed and drained. Merge must return immediately —',
			'// the forwarding happens in goroutines.',
			'func Merge(a, b <-chan int) <-chan int {',
			'	out := make(chan int)',
			'	// your code here (replace the close below: it is only here so the',
			'	// starter terminates instead of deadlocking the test harness)',
			'	close(out)',
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
			'	"sort"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'// feed returns a channel pre-loaded with vals and already closed —',
			'// a finished producer, so tests are deterministic and cannot block.',
			'func feed(vals ...int) chan int {',
			'	ch := make(chan int, len(vals))',
			'	for _, v := range vals {',
			'		ch <- v',
			'	}',
			'	close(ch)',
			'	return ch',
			'}',
			'',
			'// collect drains the merged channel, sorting because arrival order',
			'// across the two inputs is legitimately unspecified.',
			'func collect(ch <-chan int) []int {',
			'	got := []int{}',
			'	for v := range ch { // never ends if the solution forgets close(out)',
			'		got = append(got, v)',
			'	}',
			'	sort.Ints(got)',
			'	return got',
			'}',
			'',
			'func main() {',
			'	results := make([]map[string]any, 0, 4)',
			'	add := func(name, want string, body func() string) {',
			'		r := map[string]any{"input": name, "want": want}',
			'		runCase(r, func() {',
			'			got := body()',
			'			r["pass"] = got == want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	add("[1 4 6] + [2 2]  (dup values must both arrive)", "[1 2 2 4 6]", func() string {',
			'		return fmt.Sprint(collect(Merge(feed(1, 4, 6), feed(2, 2))))',
			'	})',
			'	add("[9] + []  (one side already empty)", "[9]", func() string {',
			'		return fmt.Sprint(collect(Merge(feed(9), feed())))',
			'	})',
			'	add("[] + []  (out must still be closed)", "[]", func() string {',
			'		return fmt.Sprint(collect(Merge(feed(), feed())))',
			'	})',
			'	add("evens + odds, 0..9", "[0 1 2 3 4 5 6 7 8 9]", func() string {',
			'		return fmt.Sprint(collect(Merge(feed(0, 2, 4, 6, 8), feed(1, 3, 5, 7, 9))))',
			'	})',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'import "sync"',
			'',
			'// Merge fans a and b into one output channel.',
			'//',
			'// Three kinds of goroutine, three responsibilities: forwarders move',
			'// values (one per input, so a slow or empty input never stalls the',
			'// other); the WaitGroup counts forwarders; the closer is the single',
			'// party that knows both senders are finished, so it alone may close.',
			'// Merge itself does none of the work — it wires the machine and',
			'// returns the channel so the caller can start receiving, which is',
			'// what un-blocks the forwarders in the first place.',
			'func Merge(a, b <-chan int) <-chan int {',
			'	out := make(chan int)',
			'',
			'	var wg sync.WaitGroup',
			'	forward := func(ch <-chan int) {',
			'		defer wg.Done()',
			'		for v := range ch { // ends when this input is closed and drained',
			'			out <- v',
			'		}',
			'	}',
			'	wg.Add(2) // before go, in the parent — the WaitGroup skeleton',
			'	go forward(a)',
			'	go forward(b)',
			'',
			'	// Waiting inline would deadlock: nothing drains out until Merge',
			'	// returns. The close gets its own goroutine.',
			'	go func() {',
			'		wg.Wait()',
			'		close(out)',
			'	}()',
			'',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Who may close a multi-producer channel?</h3>' +
			'<p>Only someone who can prove all producers have stopped. Each forwarder ' +
			'knows about itself; the WaitGroup aggregates that knowledge; so the ' +
			'closer-goroutine is the unique safe place for <code>close(out)</code>. ' +
			'Every incorrect variant maps to a concrete failure: close in a forwarder ' +
			'→ the other forwarder panics on send; close in <code>Merge</code> after ' +
			'launching → panic or lost values; no close → the consumer&rsquo;s range ' +
			'never ends (in this sandbox, a timeout; in production, a leaked goroutine ' +
			'and a hung request).</p>' +
			'<h3>Why Merge must not wait</h3>' +
			'<p><code>out</code> is unbuffered, so the very first forward blocks until ' +
			'the caller receives — and the caller cannot receive until ' +
			'<code>Merge</code> returns the channel. Returning immediately is not a ' +
			'style point; it is the difference between a pipeline stage and a ' +
			'deadlock. The same reasoning explains why pipeline stages in general ' +
			'return their output channel and do all work asynchronously.</p>' +
			'<h3>Scaling past two inputs</h3>' +
			'<p>The real-world version takes a slice and loops <code>wg.Add(1); go ' +
			'forward(chs[i])</code> — same machine, N forwarders (this sandbox&rsquo;s ' +
			'interpreter has a quirk ranging over channels taken from a slice, hence ' +
			'two named parameters here). With <em>dynamic</em> membership — inputs ' +
			'appearing after the merge starts — the WaitGroup no longer suffices and ' +
			'you graduate to reflect.Select or a redesign; a good sign the two-stage ' +
			'&ldquo;count, then close&rdquo; design has hit its limit.</p>',
		],
		complexity: { time: 'O(n) — every value forwarded once', space: 'O(1) beyond the channels themselves' },
	});
})();
