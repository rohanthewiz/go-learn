/* defer: Scope, Not Function — Scope & Context (Medium). The sharpest Go
 * contrast in the track: the identical keyword with one word changed in its
 * spec. Odin's defer fires at the end of the enclosing BLOCK; Go's waits for
 * the FUNCTION. The learner implements both schedulers behind one switch and
 * feeds the same trace through each — the diff between the two outputs (and
 * the defer-in-a-loop case, Go's classic resource leak) is the lesson.
 */
(function () {
	'use strict';
	var T = GoLearnOdin;

	// Two copies of the same code shape. Left: the defer's arrow stops at
	// its block's bottom edge. Right: the arrow escapes the block and runs
	// to the function's bottom edge — the whole difference in one picture.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 230" width="540" height="230" role="img" aria-label="the same defer fires at the end of its block in Odin but at the end of the function in Go">' +
		'<defs>' +
		'<marker id="dgODDSarrOk" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgODDSarrErr" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M 0 0 L 10 5 L 0 10 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		// left: Odin — arrow ends at the block
		'<text x="30" y="24" class="lbl" style="fill:var(--ok)">Odin — defer belongs to its block</text>' +
		'<rect x="30" y="36" width="210" height="180" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="42" y="56" class="lbl">demo :: proc() {</text>' +
		'<rect x="50" y="66" width="176" height="74" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="64" y="90">defer close()</text>' +
		'<text x="64" y="112" class="lbl">work…</text>' +
		'<path d="M 170 96 L 170 132" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgODDSarrOk)"/>' +
		'<text x="64" y="158" class="lbl" style="fill:var(--ok)">} ← close() runs here</text>' +
		'<text x="64" y="180" class="lbl">more work…</text>' +
		'<text x="42" y="206" class="lbl">}</text>' +
		// right: Go — arrow escapes to the function's end
		'<text x="300" y="24" class="lbl" style="fill:var(--err-fg)">Go — defer belongs to the function</text>' +
		'<rect x="300" y="36" width="210" height="180" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="312" y="56" class="lbl">func demo() {</text>' +
		'<rect x="320" y="66" width="176" height="74" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="334" y="90">defer close()</text>' +
		'<text x="334" y="112" class="lbl">work…</text>' +
		'<path d="M 440 96 L 440 198" stroke="var(--err-edge)" stroke-width="2" marker-end="url(#dgODDSarrErr)"/>' +
		'<text x="334" y="158" class="lbl">}  (nothing happens)</text>' +
		'<text x="334" y="180" class="lbl">more work…</text>' +
		'<text x="312" y="212" class="lbl" style="fill:var(--err-fg)">} ← close() runs here</text>' +
		'</svg>';

	T.problem({
		id: 'defer-scope',
		title: 'defer: Scope, Not Function',
		nav: 'defer scope',
		difficulty: 'Medium',
		category: 'Scope & Context',
		task: 'Implement RunScript — one defer scheduler switchable between Odin’s scope-exit and Go’s function-exit rule, all 8 tests.',

		prose: [
			'<h2>defer: Scope, Not Function</h2>' +
			'<p>Odin has <code>defer</code>, spelled exactly like Go’s. One word in ' +
			'its definition differs — Odin runs a deferred statement at the end of the ' +
			'enclosing <strong>scope</strong>, Go at the end of the enclosing ' +
			'<strong>function</strong> — and that one word changes what programs print. ' +
			'Here is the same shape in both languages, with its real output:</p>',
			{ lang: 'odin', code: 'demo :: proc() {\n\tfmt.println("start")\n\t{\n\t\tdefer fmt.println("inner")\n\t\tfmt.println("work")\n\t}                        // <- block ends: "inner" prints HERE\n\tfmt.println("end")\n}\n// output: start, work, inner, end' },
			{ code: 'func demo() {\n\tfmt.Println("start")\n\t{\n\t\tdefer fmt.Println("inner")\n\t\tfmt.Println("work")\n\t}                        // <- block ends: nothing happens\n\tfmt.Println("end")\n}                                // <- "inner" prints HERE, at return\n// output: start, work, end, inner' },
			DIAGRAM +
			'<p>Within one scope both languages agree: multiple defers run LIFO. The ' +
			'disagreement is only about <em>which</em> scope a defer belongs to — and ' +
			'it bites hardest in a loop. In Odin a loop body is a scope, so a defer ' +
			'inside it runs every iteration. In Go the same defer accumulates until ' +
			'the function returns — the classic “opened 10,000 files in a loop” ' +
			'leak that Go programmers learn to break out into a helper function.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement both schedulers behind one switch. The input is a flattened ' +
			'execution trace: <code>"enter"</code>/<code>"exit"</code> bracket a scope ' +
			'(the first <code>enter</code> is the function body itself; a loop is one ' +
			'enter/exit pair per iteration), <code>"do"</code> emits its Arg, and ' +
			'<code>"defer"</code> registers its Arg in the current scope. In mode ' +
			'<code>"odin"</code>, an exit flushes the defers of the scope it closes, ' +
			'LIFO. In mode <code>"go"</code>, defers pile up and only the final exit ' +
			'— the function’s own — flushes them all, LIFO across the whole run. ' +
			'Return the emitted strings in order.</p>',
			{ lang: 'txt', code: 'trace:  enter · do open · enter · defer close-inner · do work · exit\n        · do after-block · defer close-fn · exit\n\nmode "odin" → open work close-inner after-block close-fn\nmode "go"   → open work after-block close-fn close-inner\n                                            ^ the inner defer escaped its block' },
		],

		starter: [
			'package main',
			'',
			'// Event is one step of a straight-line execution trace.',
			'// Op is one of:',
			'//   "enter"  a scope opens (the first enter is the function body;',
			'//            each loop iteration is its own enter/exit pair)',
			'//   "exit"   the innermost open scope closes',
			'//   "do"     a plain statement runs: emit Arg',
			'//   "defer"  register Arg as deferred in the CURRENT scope',
			'// Traces are balanced: every enter has a matching exit.',
			'type Event struct {',
			'	Op  string',
			'	Arg string',
			'}',
			'',
			'// RunScript replays the trace under one of two defer disciplines and',
			'// returns everything emitted, in order:',
			'//   mode "odin": an exit flushes the closing scope’s defers, LIFO.',
			'//   mode "go":   defers accumulate; only the FINAL exit (the function’s',
			'//                own) flushes them, LIFO across the whole run.',
			'func RunScript(events []Event, mode string) []string {',
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
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	ent := func() Event { return Event{Op: "enter"} }',
			'	ex := func() Event { return Event{Op: "exit"} }',
			'	act := func(a string) Event { return Event{Op: "do", Arg: a} }',
			'	def := func(a string) Event { return Event{Op: "defer", Arg: a} }',
			'',
			'	// The exhibit’s shape: a function body containing one inner block.',
			'	block := []Event{ent(), act("open"), ent(), def("close-inner"), act("work"), ex(), act("after-block"), def("close-fn"), ex()}',
			'	// A block inside a block, with work and a defer between the exits.',
			'	nested := []Event{ent(), ent(), def("B"), ex(), act("x"), def("A"), ex()}',
			'	// A three-iteration loop: each body is its own scope.',
			'	loop := []Event{ent(),',
			'		ent(), act("iter1"), def("close1"), ex(),',
			'		ent(), act("iter2"), def("close2"), ex(),',
			'		ent(), act("iter3"), def("close3"), ex(),',
			'		ex()}',
			'',
			'	type tc struct {',
			'		name   string',
			'		events []Event',
			'		mode   string',
			'		want   string',
			'	}',
			'	cases := []tc{',
			'		{"block trace, odin: inner defer fires at its block’s }", block, "odin",',
			'			"open work close-inner after-block close-fn"},',
			'		{"SAME trace, go: inner defer waits for the function", block, "go",',
			'			"open work after-block close-fn close-inner"},',
			'		{"nested blocks, odin: B fires before x even runs", nested, "odin", "B x A"},',
			'		{"nested blocks, go: B registered first, so it fires LAST", nested, "go", "x A B"},',
			'		{"defer in a loop, odin: every iteration cleans up", loop, "odin",',
			'			"iter1 close1 iter2 close2 iter3 close3"},',
			'		{"defer in a loop, go: the classic leak — all held to the end", loop, "go",',
			'			"iter1 iter2 iter3 close3 close2 close1"},',
			'		{"three defers, one scope: LIFO either way", []Event{ent(), def("1"), def("2"), def("3"), ex()}, "odin", "3 2 1"},',
			'		{"empty inner scope: nothing to flush", []Event{ent(), ent(), ex(), act("solo"), ex()}, "odin", "solo"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%q", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := strings.Join(RunScript(append([]Event(nil), c.events...), c.mode), " ")',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%q", got)',
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
			'// Event is one step of a straight-line execution trace.',
			'// Op: "enter" | "exit" | "do" | "defer" — see the statement.',
			'type Event struct {',
			'	Op  string',
			'	Arg string',
			'}',
			'',
			'// RunScript replays the trace under Odin’s or Go’s defer rule.',
			'//',
			'// Both rules keep one deferred-list per open scope; the entire',
			'// difference lives in what "exit" does with the closing scope’s list:',
			'//',
			'//   odin: drain it, LIFO — the scope settles its own debts on the',
			'//         way out, so nothing deferred ever outlives its block.',
			'//   go:   hoist it into the parent scope, preserving registration',
			'//         order — the defers survive the block and keep climbing',
			'//         until the outermost exit (the function return) drains',
			'//         one function-wide list, LIFO.',
			'//',
			'// The final exit takes the SAME drain branch in both modes, which is',
			'// why the two languages agree on single-scope programs and diverge',
			'// the moment an inner block or loop body registers a defer.',
			'func RunScript(events []Event, mode string) []string {',
			'	out := []string{}',
			'	scopes := [][]string{} // scopes[len-1] is the innermost open scope',
			'	for _, e := range events {',
			'		switch e.Op {',
			'		case "enter":',
			'			scopes = append(scopes, []string{})',
			'		case "do":',
			'			out = append(out, e.Arg)',
			'		case "defer":',
			'			top := len(scopes) - 1',
			'			scopes[top] = append(scopes[top], e.Arg)',
			'		case "exit":',
			'			top := len(scopes) - 1',
			'			frame := scopes[top]',
			'			scopes = scopes[:top]',
			'			if mode == "odin" || len(scopes) == 0 {',
			'				// Odin: every exit drains. Go: only the outermost',
			'				// exit reaches this branch — the function return.',
			'				for i := len(frame) - 1; i >= 0; i-- {',
			'					out = append(out, frame[i]) // LIFO within the list',
			'				}',
			'			} else {',
			'				// Go, inner scope: the block’s defers escape it.',
			'				// Appending keeps global registration order, so the',
			'				// final LIFO drain is LIFO over the whole function —',
			'				// and a loop’s defers pile up here, one batch per',
			'				// iteration: the classic Go resource leak, modeled.',
			'				scopes[top-1] = append(scopes[top-1], frame...)',
			'			}',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>One word, two schedulers</h3>' +
			'<p>The whole divergence fits in the exit handler — the enter/do/defer ' +
			'arms are identical in both modes:</p>',
			{ code: 'if mode == "odin" || len(scopes) == 0 {\n\tfor i := len(frame) - 1; i >= 0; i-- { // drain, LIFO\n\t\tout = append(out, frame[i])\n\t}\n} else {\n\tscopes[top-1] = append(scopes[top-1], frame...) // go: hoist to parent\n}' },
			'<p>Note that Go’s rule reaches the drain branch too — once, at the ' +
			'outermost exit. That is why the two languages agree whenever every defer ' +
			'sits directly in the function body (the “three defers, LIFO” case runs ' +
			'identically in both), and disagree exactly when a defer sits inside a ' +
			'block or loop body.</p>' +
			'<h3>The loop case is the payoff</h3>' +
			'<p>Run the loop trace through both modes and read the outputs side by ' +
			'side: Odin interleaves <code>iterN close-N</code> — each iteration’s ' +
			'resource is released before the next iteration starts — while Go holds ' +
			'all three closes until the end, in reverse. That Go behavior is the ' +
			'documented footgun behind “don’t <code>defer f.Close()</code> in a ' +
			'loop”: ten thousand iterations means ten thousand open files. The Go ' +
			'idiom — moving the loop body into its own function so the defer has a ' +
			'nearer function-end — is manually reconstructing the scope Odin gives ' +
			'the defer for free.</p>' +
			'<h3>What the model leaves out</h3>' +
			'<p>Two real differences didn’t make it into the trace. First, argument ' +
			'timing is <em>reversed</em>: Go evaluates a deferred call’s arguments ' +
			'immediately at the <code>defer</code> statement, while Odin evaluates ' +
			'the whole deferred statement at scope end — <code>defer ' +
			'fmt.println(i)</code> prints the loop variable’s <em>final</em> value in ' +
			'Odin but the <em>registration-time</em> value in Go. Second, Go’s defer ' +
			'doubles as its panic machinery (<code>recover</code> only works inside ' +
			'one); Odin’s defer is purely a scheduling construct. Both differences ' +
			'follow from the same design split: Go’s defer is a runtime record pushed ' +
			'onto a per-goroutine list, Odin’s is a compile-time reordering of code ' +
			'to the scope’s exit paths.</p>',
		],
		complexity: { time: 'O(n) — each event handled once; each deferred entry drained (or hoisted, then drained) O(depth) times at most', space: 'O(n) for the scope stack and pending defers' },
	});
})();
