/* The ? Operator — Error Handling (Easy). Result<T, E> and the ? operator
 * are Go's `if err != nil { return err }` compressed to one character. The
 * learner implements ?'s exact control flow — short-circuit on the first
 * Err, skip everything after — as a chain runner, with the harness counting
 * step executions to prove the short-circuit is real.
 */
(function () {
	'use strict';
	var T = GoLearnRust;

	// A pipeline of steps with an early exit at the first Err.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 170" width="540" height="170" role="img" aria-label="a chain of fallible steps: the first Err exits the function immediately; later steps never run">' +
		'<text x="20" y="24" class="lbl">each ? either unwraps the Ok value or returns the Err — immediately</text>' +
		'<rect x="30" y="60" width="110" height="40" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="85" y="85" text-anchor="middle">step1? → Ok</text>' +
		'<path d="M 140 80 L 172 80" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowRSQM)"/>' +
		'<rect x="176" y="60" width="110" height="40" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="231" y="85" text-anchor="middle">step2? → Err</text>' +
		'<path d="M 231 100 L 231 132" stroke="var(--err-edge)" stroke-width="2" marker-end="url(#dgArrowRSQMe)"/>' +
		'<text x="231" y="152" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">return Err(e) — the whole function exits here</text>' +
		'<rect x="322" y="60" width="110" height="40" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="377" y="85" text-anchor="middle" class="lbl">step3 — never runs</text>' +
		'<defs>' +
		'<marker id="dgArrowRSQM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowRSQMe" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'question-mark',
		title: 'The ? Operator',
		nav: '? operator',
		difficulty: 'Easy',
		category: 'Error Handling',
		task: 'Implement Chain — run fallible steps left to right, short-circuiting on the first Err. All 5 tests.',

		prose: [
			'<h2>The ? Operator</h2>' +
			'<p>Rust has no exceptions and no <code>(T, error)</code> tuples. A fallible ' +
			'function returns <code>Result&lt;T, E&gt;</code> — an enum with exactly two ' +
			'variants, <code>Ok(T)</code> and <code>Err(E)</code> — and the match ' +
			'exhaustiveness you just implemented means the compiler will not let you ' +
			'touch the <code>T</code> without deciding what happens on ' +
			'<code>Err</code>. Where Go trusts you not to skip the ' +
			'<code>if err != nil</code>, Rust makes ignoring the error unrepresentable.</p>' +
			'<p>Handling every step verbosely would drown real logic, so Rust compresses ' +
			'the Go idiom into one character. These are the same function:</p>',
			{ lang: 'rust', code: 'fn read_num(path: &str) -> Result<i32, MyErr> {\n    let s = fs::read_to_string(path)?;   // Err(e)? return Err(e.into())\n    let n = s.trim().parse()?;           // ditto\n    Ok(n * 2)\n}' },
			{ lang: 'go', code: 'func readNum(path string) (int, error) {\n\ts, err := os.ReadFile(path)\n\tif err != nil {\n\t\treturn 0, err\n\t}\n\tn, err := strconv.Atoi(strings.TrimSpace(string(s)))\n\tif err != nil {\n\t\treturn 0, err\n\t}\n\treturn n * 2, nil\n}' },
			'<p>Each <code>?</code> unwraps an <code>Ok</code> and keeps going, or ' +
			'returns the <code>Err</code> from the <em>enclosing function</em> on the ' +
			'spot — everything after it never executes.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Chain(start, steps)</code>: thread a value through the ' +
			'steps left to right with <code>?</code> semantics. The harness counts how ' +
			'many steps actually execute, so returning the right <code>Err</code> is not ' +
			'enough — steps after the failure must genuinely not run.</p>',
			{ code: 'Chain(3, [double, addOne])        → Ok(7)\nChain(3, [double, fail, addOne])  → Err("boom")   addOne never runs\nChain(3, [])                      → Ok(3)         nothing to do', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Result models Rust\'s Result<i32, String> in Go terms:',
			'// Err == "" means Ok(Val); anything else is Err(Err), Val ignored.',
			'type Result struct {',
			'	Val int',
			'	Err string',
			'}',
			'',
			'func Ok(v int) Result       { return Result{Val: v} }',
			'func Errf(msg string) Result { return Result{Err: msg} }',
			'',
			'// Chain threads start through steps left to right with ? semantics:',
			'// each step receives the current value; an Ok result feeds the next',
			'// step, and the FIRST Err returns immediately — later steps must not',
			'// execute at all.',
			'func Chain(start int, steps []func(int) Result) Result {',
			'	// your code here',
			'	return Result{}',
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
			'	// Steps are built fresh per case around a shared counter, so the',
			'	// harness can verify the short-circuit: not just WHAT came back,',
			'	// but how many steps actually ran.',
			'	var ran int',
			'	double := func(v int) Result { ran++; return Ok(v * 2) }',
			'	addOne := func(v int) Result { ran++; return Ok(v + 1) }',
			'	boom := func(v int) Result { ran++; return Errf("boom") }',
			'',
			'	type tc struct {',
			'		name    string',
			'		start   int',
			'		steps   []func(int) Result',
			'		want    Result',
			'		wantRan int',
			'	}',
			'	cases := []tc{',
			'		{"all Ok: value threads through", 3,',
			'			[]func(int) Result{double, addOne}, Ok(7), 2},',
			'		{"middle Err: later steps must not run", 3,',
			'			[]func(int) Result{double, boom, addOne}, Errf("boom"), 2},',
			'		{"first step errs: nothing else runs", 3,',
			'			[]func(int) Result{boom, double, double}, Errf("boom"), 1},',
			'		{"no steps: Ok(start)", 3,',
			'			[]func(int) Result{}, Ok(3), 0},',
			'		{"long happy path", 1,',
			'			[]func(int) Result{double, double, double, addOne}, Ok(9), 4},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%+v after %d step(s)", c.want, c.wantRan),',
			'		}',
			'		runCase(r, func() {',
			'			ran = 0',
			'			got := Chain(c.start, c.steps)',
			'			r["pass"] = got == c.want && ran == c.wantRan',
			'			r["got"] = fmt.Sprintf("%+v after %d step(s)", got, ran)',
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
			'// Result models Rust\'s Result<i32, String> in Go terms:',
			'// Err == "" means Ok(Val); anything else is Err(Err), Val ignored.',
			'type Result struct {',
			'	Val int',
			'	Err string',
			'}',
			'',
			'func Ok(v int) Result       { return Result{Val: v} }',
			'func Errf(msg string) Result { return Result{Err: msg} }',
			'',
			'// Chain threads start through steps left to right with ? semantics.',
			'//',
			'// The loop body IS the ? operator: call, inspect, and either return',
			'// the Err from the enclosing function immediately or unwrap the Ok',
			'// into the running value. The early return inside the loop is the',
			'// entire trick — a break would still fall through to Ok(v) below and',
			'// launder the failure into a success.',
			'func Chain(start int, steps []func(int) Result) Result {',
			'	v := start',
			'	for _, step := range steps {',
			'		res := step(v)',
			'		if res.Err != "" {',
			'			return res // ?: the first Err exits the whole chain',
			'		}',
			'		v = res.Val // ?: Ok(v) unwraps and execution continues',
			'	}',
			'	return Ok(v)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>? is control flow, not sugar for a check</h3>' +
			'<p>The loop body is the desugaring of <code>?</code>, nearly verbatim from ' +
			'the reference:</p>',
			{ code: 'res := step(v)\nif res.Err != "" {\n\treturn res // return Err(e) from the ENCLOSING function\n}\nv = res.Val    // the expression evaluates to the unwrapped value' },
			'<p>Which is, of course, Go’s <code>if err != nil { return err }</code> — the ' +
			'two languages agree completely about how errors should flow (values, ' +
			'checked at every call, no unwinding). They differ in who enforces it: Go ' +
			'lets an unchecked <code>err</code> compile, Rust will not give you the ' +
			'<code>T</code> until the <code>Err</code> case is dealt with. The harness ' +
			'counting executed steps is the point of the exercise: <code>?</code> is an ' +
			'early <em>return</em>, and any implementation that runs the remaining steps ' +
			'has implemented error <em>collection</em>, not error handling.</p>' +
			'<h3>The vocabulary around Result</h3>' +
			'<p>Real code composes Results without matching every time: ' +
			'<code>unwrap_or(default)</code> swaps a fallback for the error, ' +
			'<code>map</code> transforms the Ok side, <code>ok_or</code> bridges from ' +
			'<code>Option</code>, and <code>?</code> quietly converts error types on the ' +
			'way out (via <code>From</code>, the <code>e.into()</code> in the lesson ' +
			'snippet) so a function can return one error enum while its callees each ' +
			'fail differently. <code>unwrap()</code> — panic on Err — is the one to be ' +
			'suspicious of in production code; it is Rust’s “I checked, this cannot ' +
			'fail”, and it is exactly as reliable as the comment saying so.</p>' +
			'<h3>Option is the same machine</h3>' +
			'<p><code>Option&lt;T&gt;</code> (<code>Some</code>/<code>None</code>) is ' +
			'Result minus the error payload, and <code>?</code> works on it too: ' +
			'<code>None</code> propagates the way <code>Err</code> does. Together they ' +
			'replace both of Go’s “absent value” conventions — <code>nil</code> pointers ' +
			'and the <code>v, ok := m[k]</code> two-value form — with one type the ' +
			'exhaustiveness checker refuses to let you forget about. There is no nil in ' +
			'safe Rust to dereference by accident.</p>',
		],
		complexity: { time: 'O(n) — each step runs at most once', space: 'O(1)' },
	});
})();
