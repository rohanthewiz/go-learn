/* The Event Loop — Async (Hard). Dart's concurrency model is two queues and
 * one rule: drain EVERY microtask before touching the next event. Predicting
 * print order across scheduleMicrotask / Future() / .then is the interview
 * question; implementing the loop is how you stop having to memorize it.
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	// The two queues feeding the single thread, with the priority arrow that
	// decides everything. Marker id namespaced (dgArrowDEL).
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="microtask queue and event queue feed one thread; all microtasks drain before each event">' +
		'<text x="20" y="22" class="lbl">one thread, two queues — microtasks always cut the line</text>' +
		'<rect x="30" y="44" width="210" height="44" rx="7" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="135" y="62" text-anchor="middle">microtask queue</text>' +
		'<text x="135" y="79" text-anchor="middle" class="lbl">scheduleMicrotask, .then on a done Future</text>' +
		'<rect x="30" y="120" width="210" height="44" rx="7" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="135" y="138" text-anchor="middle">event queue</text>' +
		'<text x="135" y="155" text-anchor="middle" class="lbl">Future(fn), timers, I/O, taps</text>' +
		'<rect x="400" y="82" width="110" height="44" rx="7" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="455" y="109" text-anchor="middle">run next</text>' +
		'<path d="M 240 66 C 330 66 360 92 396 100" stroke="var(--warn)" stroke-width="2" fill="none" marker-end="url(#dgArrowDEL)"/>' +
		'<text x="318" y="58" text-anchor="middle" class="lbl" style="fill:var(--warn)">first — until empty</text>' +
		'<path d="M 240 142 C 330 142 360 116 396 108" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="5 4" fill="none" marker-end="url(#dgArrowDEL)"/>' +
		'<text x="318" y="162" text-anchor="middle" class="lbl">one, only when microtasks are empty</text>' +
		'<defs><marker id="dgArrowDEL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'event-loop',
		title: 'The Event Loop',
		nav: 'event loop',
		difficulty: 'Hard',
		category: 'Async',
		task: 'Implement RunLoop: run main, then drain ALL microtasks before EACH event — tasks can schedule more tasks. All 6 tests.',

		prose: [
			'<h2>The Event Loop</h2>' +
			'<p>Go\'s scheduler is preemptive and multi-core: goroutines interleave ' +
			'whenever, wherever. Dart\'s is the opposite in every way — one thread, ' +
			'and tasks run <em>to completion</em> in an order you can compute on ' +
			'paper. The machinery is two queues:</p>' +
			'<ul>' +
			'<li>the <strong>microtask queue</strong> — <code>scheduleMicrotask</code>, ' +
			'and <code>.then</code> callbacks on already-completed Futures;</li>' +
			'<li>the <strong>event queue</strong> — <code>Future(fn)</code>, timers, ' +
			'I/O results, user input.</li>' +
			'</ul>' +
			'<p>And one rule: after the current task finishes, <strong>drain the ' +
			'entire microtask queue</strong> (including microtasks scheduled by ' +
			'microtasks) before taking <em>one</em> event. Hence the classic:</p>',
			{ lang: 'dart', code: "void main() {\n  print('A');\n  scheduleMicrotask(() => print('B'));\n  Future(() => print('C'));                 // event queue\n  Future.value().then((_) => print('D'));   // then on a DONE future: microtask\n  print('E');\n}\n// A E B D C" },
			DIAGRAM +
			'<p>Synchronous code first (<code>A</code>, <code>E</code> — nothing ' +
			'preempts it), then the microtasks in order (<code>B</code>, ' +
			'<code>D</code>), then the event (<code>C</code>). This is also the model ' +
			'behind <code>await</code>: it desugars to <code>.then</code>, so an await ' +
			'on a completed future resumes as a microtask, and I/O resumes as an ' +
			'event.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>RunLoop(main)</code>. A task body is a list of ' +
			'<code>Action</code>s: <code>print</code> (record the text), ' +
			'<code>micro</code> / <code>event</code> (schedule the action\'s ' +
			'<code>Body</code> on the corresponding queue). Run main, then loop by the ' +
			'rule above until both queues are empty, returning everything printed in ' +
			'order. Scheduling is reentrant — bodies schedule more bodies.</p>',
		],

		starter: [
			'package main',
			'',
			'// Action is one step of a task body:',
			'//   {Op: "print", Text: t}  — record t in the output',
			'//   {Op: "micro", Body: b}  — schedule b on the microtask queue',
			'//   {Op: "event", Body: b}  — schedule b on the event queue',
			'type Action struct {',
			'	Op   string',
			'	Text string',
			'	Body []Action',
			'}',
			'',
			'// RunLoop executes main synchronously, then runs the event loop:',
			'// drain ALL microtasks (they may schedule more), then ONE event,',
			'// repeat until both queues are empty. Returns the prints in order.',
			'func RunLoop(main []Action) []string {',
			'	// your code here',
			'	return nil',
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
			'	pr := func(t string) Action { return Action{Op: "print", Text: t} }',
			'	micro := func(b ...Action) Action { return Action{Op: "micro", Body: b} }',
			'	event := func(b ...Action) Action { return Action{Op: "event", Body: b} }',
			'',
			'	type tc struct {',
			'		name string',
			'		main []Action',
			'		want []string',
			'	}',
			'	cases := []tc{',
			'		{"synchronous code runs to completion",',
			'			[]Action{pr("A"), pr("B")},',
			'			[]string{"A", "B"}},',
			'		{"the classic: A E B D C",',
			'			[]Action{pr("A"), micro(pr("B")), event(pr("C")), micro(pr("D")), pr("E")},',
			'			[]string{"A", "E", "B", "D", "C"}},',
			'		{"a microtask\'s microtasks drain before any event",',
			'			[]Action{micro(pr("M1"), micro(pr("M2"))), event(pr("E1"))},',
			'			[]string{"M1", "M2", "E1"}},',
			'		{"an event\'s microtask runs before the NEXT event",',
			'			[]Action{event(pr("E1"), micro(pr("M1"))), event(pr("E2"))},',
			'			[]string{"E1", "M1", "E2"}},',
			'		{"an event\'s event goes to the back of the line",',
			'			[]Action{event(pr("E1"), event(pr("E3"))), event(pr("E2"))},',
			'			[]string{"E1", "E2", "E3"}},',
			'		{"empty main: nothing to do",',
			'			[]Action{},',
			'			[]string{}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprint(c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := RunLoop(c.main)',
			'			r["pass"] = fmt.Sprint(got) == fmt.Sprint(c.want)',
			'			r["got"] = fmt.Sprint(got)',
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
			'// Action is one step of a task body:',
			'//   {Op: "print", Text: t}  — record t in the output',
			'//   {Op: "micro", Body: b}  — schedule b on the microtask queue',
			'//   {Op: "event", Body: b}  — schedule b on the event queue',
			'type Action struct {',
			'	Op   string',
			'	Text string',
			'	Body []Action',
			'}',
			'',
			'// RunLoop executes main synchronously, then runs the event loop.',
			'//',
			'// exec is "run one task to completion": tasks are never preempted,',
			'// they only append to the queues. The loop encodes the single',
			'// priority rule — the inner microtask drain sits BEFORE each',
			'// one-event step, and `continue` re-checks microtasks after every',
			'// event, because the event may have scheduled some.',
			'func RunLoop(main []Action) []string {',
			'	out := []string{}',
			'	microQ := [][]Action{}',
			'	eventQ := [][]Action{}',
			'',
			'	exec := func(body []Action) {',
			'		for _, a := range body {',
			'			switch a.Op {',
			'			case "print":',
			'				out = append(out, a.Text)',
			'			case "micro":',
			'				microQ = append(microQ, a.Body)',
			'			case "event":',
			'				eventQ = append(eventQ, a.Body)',
			'			}',
			'		}',
			'	}',
			'',
			'	exec(main)',
			'	for len(microQ) > 0 || len(eventQ) > 0 {',
			'		if len(microQ) > 0 {',
			'			next := microQ[0]',
			'			microQ = microQ[1:]',
			'			exec(next)',
			'			continue // a microtask may have scheduled more microtasks',
			'		}',
			'		next := eventQ[0]',
			'		eventQ = eventQ[1:]',
			'		exec(next)',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why two queues at all</h3>' +
			'<p>Microtasks exist so the async machinery can keep its own invariants: ' +
			'when a Future completes, its <code>.then</code> chain should run ' +
			'<em>before</em> unrelated outside work (a timer, a tap) barges in and ' +
			'observes half-updated state. "Finish the internal bookkeeping, then face ' +
			'the world" — that is the drain-all-microtasks rule, stated as engineering ' +
			'intent.</p>' +
			'<h3>Reading the classic without memorizing it</h3>' +
			'<p><code>Future(fn)</code> means "run fn as a fresh <em>event</em>"; ' +
			'<code>Future.value()</code> is already complete, so its <code>.then</code> ' +
			'is bookkeeping — a microtask. Once you tag each line with its queue, the ' +
			'output writes itself: sync (A, E), microtasks in schedule order (B, D), ' +
			'events (C). <code>await</code> inherits all of this by desugaring to ' +
			'<code>.then</code> — which queue an await resumes on depends only on ' +
			'whether the thing awaited was already done.</p>' +
			'<h3>The dark side of priority</h3>' +
			'<p>The microtask queue can <em>starve</em> the event queue: a microtask ' +
			'that schedules another microtask forever means no event ever runs — no ' +
			'timers, no I/O, a frozen UI that is technically very busy. (Your test 3 is ' +
			'two steps down that road.) Go\'s preemptive scheduler makes starvation ' +
			'hard; Dart trades that safety for run-to-completion semantics, where no ' +
			'data race can exist because nothing ever interleaves. Both models are ' +
			'coherent — the queues are just where Dart chose to spend its complexity ' +
			'budget.</p>',
		],
		complexity: { time: 'O(actions) — every scheduled body is executed exactly once', space: 'O(pending tasks) for the two queues' },
	});
})();
