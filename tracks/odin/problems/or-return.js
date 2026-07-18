/* or_return & or_else — Procedures & Errors (Medium). Odin keeps Go's
 * error model (ordinary values, returned last) but adds two operators of
 * sugar: or_return propagates the error out of the enclosing proc, or_else
 * swallows it with a default. The learner implements both evaluation
 * strategies over a simulated call chain, pinning the part that matters:
 * or_return stops executing at the first failure, or_else never stops.
 */
(function () {
	'use strict';
	var T = GoLearnOdin;

	// Two evaluations of the same 3-step chain: or_return exits sideways at
	// the failing step (step 3 never runs); or_else patches the hole with a
	// default and keeps going.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="or_return exits at the first failing step; or_else substitutes a default and continues">' +
		'<text x="20" y="24" class="lbl">or_return — first failure exits the enclosing proc</text>' +
		'<rect x="30" y="38" width="90" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="75" y="60" text-anchor="middle">read</text>' +
		'<path d="M 120 55 L 148 55" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<rect x="150" y="38" width="90" height="34" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="195" y="60" text-anchor="middle" style="fill:var(--err-fg)">parse ✗</text>' +
		'<path d="M 195 72 L 195 96" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<text x="205" y="100" class="lbl" style="fill:var(--err-fg)">return &quot;&quot;, err — build never executes</text>' +
		'<rect x="270" y="38" width="90" height="34" rx="6" fill="none" stroke="var(--edge)" stroke-width="1" stroke-dasharray="4 3"/>' +
		'<text x="315" y="60" text-anchor="middle" class="lbl">build</text>' +
		'<text x="20" y="140" class="lbl">or_else — failure becomes the default, chain continues</text>' +
		'<rect x="30" y="152" width="90" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="75" y="174" text-anchor="middle">read</text>' +
		'<path d="M 120 169 L 148 169" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<rect x="150" y="152" width="110" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="205" y="174" text-anchor="middle">parse → default</text>' +
		'<path d="M 260 169 L 288 169" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<rect x="290" y="152" width="90" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="335" y="174" text-anchor="middle">build</text>' +
		'<text x="395" y="174" class="lbl" style="fill:var(--ok)">no error escapes</text>' +
		'</svg>';

	T.problem({
		id: 'or-return',
		title: 'or_return & or_else',
		nav: 'or_return',
		difficulty: 'Medium',
		category: 'Procedures & Errors',
		task: 'Implement RunChain — evaluate a call chain under or_return (stop at first failure) and or_else (substitute defaults), all 8 tests.',

		prose: [
			'<h2>or_return &amp; or_else</h2>' +
			'<p>Odin error handling starts exactly where Go’s does: errors are ' +
			'ordinary values, returned <em>last</em>, and there are no exceptions. A Go ' +
			'developer reads an Odin signature like ' +
			'<code>parse :: proc(s: string) -&gt; (Tree, Error)</code> and feels at home. ' +
			'The difference is what happens at the <em>call site</em>. Where Go writes ' +
			'the famous three lines per call, Odin folds them into one operator:</p>',
			{ lang: 'odin', code: 'read_config :: proc(path: string) -> (cfg: Config, err: Error) {\n\tdata := read_entire_file(path) or_return   // on failure: err = that error; return\n\ttree := parse(data)            or_return\n\tcfg   = build(tree)            or_return\n\treturn                                     // bare return — results are named\n}' },
			'<p><code>or_return</code> checks the <em>last</em> return value of the call; ' +
			'if it is a failure, it assigns it to the enclosing procedure’s last ' +
			'(error) result and returns immediately — everything after the failing call ' +
			'simply never executes. The Go equivalent of that proc is three times as ' +
			'tall, and every block says the same thing:</p>',
			{ code: 'func readConfig(path string) (Config, error) {\n\tdata, err := readFile(path)\n\tif err != nil {\n\t\treturn Config{}, err\n\t}\n\ttree, err := parse(data)\n\tif err != nil {\n\t\treturn Config{}, err\n\t}\n\tcfg, err := build(tree)\n\tif err != nil {\n\t\treturn Config{}, err\n\t}\n\treturn cfg, nil\n}' },
			'<p>The sibling operator <code>or_else</code> goes the other way: instead of ' +
			'propagating the error it <em>swallows</em> it and substitutes a default, so ' +
			'the chain keeps going and the enclosing proc never sees a failure:</p>',
			{ lang: 'odin', code: 'port := parse_int(get_env("PORT")) or_else 8080   // bad input? use 8080' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the evaluator for both operators. A chain is a slice of ' +
			'<code>Step</code>s — each simulates one call: <code>Val</code> on success, a ' +
			'non-empty <code>Err</code> on failure, and <code>Default</code> as the value ' +
			'<code>or_else</code> would substitute. <code>RunChain</code> returns ' +
			'<code>(value, err, executed)</code>; the executed count is how the tests ' +
			'catch an evaluator that keeps running past a failure.</p>',
			{ code: 'RunChain([ok "a", ok "b"], "or_return")        → ("b", "", 2)\nRunChain([ok "a", ERR "boom", ok "c"], "or_return")\n                                               → ("", "boom", 2)   // step 3 never ran\nRunChain([ok "a", ERR/dflt "x", ok "c"], "or_else")\n                                               → ("a,x,c", "", 3)  // hole patched, no error', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Step simulates one call in a chain of error-returning procedures.',
			'// Err != "" means the call fails; Val is its success value; Default is',
			'// what or_else substitutes when the call fails.',
			'type Step struct {',
			'	Val     string',
			'	Err     string',
			'	Default string',
			'}',
			'',
			'// RunChain evaluates the steps in order under one of Odin\'s two error',
			'// operators and returns (value, err, executed), where executed counts',
			'// how many steps actually ran.',
			'//',
			'// mode "or_return": the FIRST step with Err != "" aborts the chain —',
			'// return ("", that Err, count including the failing step). Steps after',
			'// it must NOT execute. If every step succeeds, return the LAST step\'s',
			'// Val with err "" and executed len(steps).',
			'//',
			'// mode "or_else": every step executes; a failing step contributes its',
			'// Default instead of its Val. Return all contributions joined with ",",',
			'// err "" (or_else never fails), executed len(steps).',
			'//',
			'// An empty chain returns ("", "", 0) in both modes.',
			'func RunChain(steps []Step, mode string) (string, string, int) {',
			'	// your code here',
			'	return "", "", 0',
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
			'	// Constructors keep the case table readable.',
			'	ok := func(v string) Step { return Step{Val: v} }',
			'	bad := func(e, d string) Step { return Step{Err: e, Default: d} }',
			'	show := func(v, e string, n int) string { return fmt.Sprintf("val=%q err=%q exec=%d", v, e, n) }',
			'',
			'	type tc struct {',
			'		name  string',
			'		steps []Step',
			'		mode  string',
			'		wantV string',
			'		wantE string',
			'		wantN int',
			'	}',
			'	cases := []tc{',
			'		{"or_return: clean 3-step chain — last value out, all steps ran",',
			'			[]Step{ok("data"), ok("tree"), ok("cfg")}, "or_return", "cfg", "", 3},',
			'		{"or_return: first step fails — nothing after it executes",',
			'			[]Step{bad("open failed", ""), ok("tree"), ok("cfg")}, "or_return", "", "open failed", 1},',
			'		{"or_return: middle step fails — step 3 must NOT run (exec=2)",',
			'			[]Step{ok("data"), bad("parse error", ""), ok("cfg")}, "or_return", "", "parse error", 2},',
			'		{"or_return: last step fails — its error escapes",',
			'			[]Step{ok("data"), ok("tree"), bad("build error", "")}, "or_return", "", "build error", 3},',
			'		{"or_else: clean chain joins every value",',
			'			[]Step{ok("data"), ok("tree"), ok("cfg")}, "or_else", "data,tree,cfg", "", 3},',
			'		{"or_else: mid-chain failure becomes its default, chain continues",',
			'			[]Step{ok("data"), bad("parse error", "empty-tree"), ok("cfg")}, "or_else", "data,empty-tree,cfg", "", 3},',
			'		{"or_else: every step fails — all defaults, still no error",',
			'			[]Step{bad("a", "0"), bad("b", "1")}, "or_else", "0,1", "", 2},',
			'		{"empty chain (or_return): zero work, zero error — the ZII answer",',
			'			[]Step{}, "or_return", "", "", 0},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  show(c.wantV, c.wantE, c.wantN),',
			'		}',
			'		runCase(r, func() {',
			'			v, e, n := RunChain(append([]Step(nil), c.steps...), c.mode)',
			'			got := show(v, e, n)',
			'			r["pass"] = got == show(c.wantV, c.wantE, c.wantN)',
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
			'// Step simulates one call in a chain of error-returning procedures.',
			'// Err != "" means the call fails; Val is its success value; Default is',
			'// what or_else substitutes when the call fails.',
			'type Step struct {',
			'	Val     string',
			'	Err     string',
			'	Default string',
			'}',
			'',
			'// RunChain evaluates the steps under or_return or or_else semantics.',
			'//',
			'// The two modes differ in exactly one decision — what a failing step',
			'// does to CONTROL FLOW — so the natural shape is one loop with a branch',
			'// inside, not two separate loops. That mirrors the language: or_return',
			'// and or_else are the same call with a different operator bolted on,',
			'// not two different kinds of call.',
			'func RunChain(steps []Step, mode string) (string, string, int) {',
			'	executed := 0',
			'	last := ""   // or_return result: value of the most recent step',
			'	joined := "" // or_else result: every contribution, comma-separated',
			'',
			'	for _, s := range steps {',
			'		// The step "runs" before its result is inspected — a failing',
			'		// call still executed, which is why the failing step itself',
			'		// counts toward executed. Only the steps AFTER it are skipped.',
			'		executed++',
			'',
			'		if s.Err != "" {',
			'			if mode == "or_return" {',
			'				// or_return: assign the error to the enclosing',
			'				// proc\'s error slot and return NOW. The value is',
			'				// the zero value — ZII means "", never garbage.',
			'				return "", s.Err, executed',
			'			}',
			'			// or_else: the error is consumed right here; the',
			'			// default stands in for the value and the chain',
			'			// proceeds as if the call had succeeded.',
			'			last = s.Default',
			'		} else {',
			'			last = s.Val',
			'		}',
			'',
			'		// Manual join (keeps the user file import-free): first',
			'		// contribution bare, later ones comma-prefixed.',
			'		if executed == 1 {',
			'			joined = last',
			'		} else {',
			'			joined += "," + last',
			'		}',
			'	}',
			'',
			'	if mode == "or_else" {',
			'		// or_else can never fail: the entire point of the operator',
			'		// is that the error stops here.',
			'		return joined, "", executed',
			'	}',
			'	// Clean or_return chain: the final step\'s value is the result,',
			'	// exactly like the Go version returning cfg, nil at the bottom.',
			'	return last, "", executed',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The executed count is the point</h3>' +
			'<p>Returning <code>executed</code> is how the tests distinguish a real ' +
			'<code>or_return</code> from a fake one. An evaluator that runs every step ' +
			'and merely <em>reports</em> the first error produces the same value and ' +
			'error strings — but <code>exec=3</code> instead of <code>exec=2</code>. In ' +
			'real code that difference is everything: the steps after a failed ' +
			'<code>read_entire_file</code> would be parsing garbage. ' +
			'<code>or_return</code> is control flow, not error formatting.</p>' +
			'<h3>One loop, one branch</h3>',
			{ code: 'if s.Err != "" {\n\tif mode == "or_return" {\n\t\treturn "", s.Err, executed // exit NOW — later steps never run\n\t}\n\tlast = s.Default // or_else: patch the hole, keep going\n}' },
			'<p>Note where each operator sends the error: <code>or_return</code> hands ' +
			'it <em>up</em> (to the caller, via the last return slot), ' +
			'<code>or_else</code> throws it <em>away</em>. Neither hides it in a side ' +
			'channel — there is no exception unwinding to intercept, no panic to ' +
			'recover. Both desugar to the same multi-return that Go developers ' +
			'already write by hand.</p>' +
			'<h3>Why Odin can make this an operator and Go cannot (yet)</h3>' +
			'<p>Two Odin conventions make <code>or_return</code> a one-token desugar: ' +
			'the error is always the <em>last</em> result (so the operator knows which ' +
			'value to test), and named results plus ZII mean a bare ' +
			'<code>return</code> yields sensible zero values for everything else. Go has ' +
			'the same convention by culture rather than by rule, which is why every ' +
			'<code>try</code>-style proposal for Go has had to answer “what if the ' +
			'error isn’t last?” — Odin defined that question away. When you read Odin, ' +
			'treat each <code>or_return</code> as exactly one ' +
			'<code>if err != nil { return }</code> block the language wrote for you, and ' +
			'<code>or_else</code> as the <code>if err != nil { v = fallback }</code> you ' +
			'write around config parsing.</p>',
		],
		complexity: { time: 'O(n) — each step visited at most once; or_return exits early', space: 'O(n) for the joined or_else output' },
	});
})();
