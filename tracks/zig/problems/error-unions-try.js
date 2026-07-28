/* Error Unions & try — Values & Errors (Easy). Zig's ParseError!i64 is
 * Go's (int, error) fused into one type — with two upgrades: ignoring it
 * is a compile error, and propagation is the single keyword `try`. The
 * learner builds the propagation machine over a {V, Err} struct: Try
 * (propagate, zeroing the payload), Catch (swallow with a default),
 * ParseDigits (a real error-producing parser), and SumLines (try in a
 * loop — first error short-circuits). The harness pins the zeroed payload
 * on propagation, both catch arms, every ParseDigits case, and SumLines
 * returning the FIRST error unchanged.
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// The try-propagation machine: SumLines feeds each line to ParseDigits;
	// the first error exits sideways past the remaining lines, straight out
	// of SumLines. Marker id namespaced (dgArrowZGEU) — SVG ids share one
	// page namespace across all tracks.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="SumLines tries ParseDigits on each line; the first error short-circuits back out past the remaining lines">' +
		'<text x="20" y="24" class="lbl">try in a loop — the first error exits SumLines; later lines are never parsed</text>' +
		'<rect x="30" y="40" width="500" height="40" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="120" y="65">SumLines([&quot;10&quot;, &quot;x9&quot;, &quot;30&quot;])</text>' +
		// per-line calls
		'<path d="M 90 80 L 90 108" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowZGEU)"/>' +
		'<rect x="40" y="112" width="130" height="38" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="105" y="136" text-anchor="middle">parse(&quot;10&quot;) → 10</text>' +
		'<path d="M 250 80 L 250 108" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowZGEU)"/>' +
		'<rect x="185" y="112" width="150" height="38" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="260" y="136" text-anchor="middle" style="fill:var(--warn)">parse(&quot;x9&quot;) ✗</text>' +
		'<rect x="380" y="112" width="140" height="38" rx="6" fill="none" stroke="var(--edge)" stroke-width="1" stroke-dasharray="4 3"/>' +
		'<text x="450" y="136" text-anchor="middle" class="lbl">parse(&quot;30&quot;) never runs</text>' +
		// the short-circuit arrow back up and out
		'<path d="M 260 150 C 260 195 45 195 32 84" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowZGEU)"/>' +
		'<text x="160" y="180" text-anchor="middle" class="lbl" style="fill:var(--warn)">try: error.InvalidCharacter returns NOW — unchanged</text>' +
		'<defs><marker id="dgArrowZGEU" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'error-unions-try',
		title: 'Error Unions & try',
		nav: 'error unions',
		difficulty: 'Easy',
		category: 'Values & Errors',
		task: 'Implement Try (propagate, payload zeroed), Catch (swallow with default), ParseDigits, and SumLines (try in a loop — first error wins).',

		prose: [
			'<h2>Error Unions &amp; try</h2>' +
			'<p>Run <code>errcheck</code> on a legacy Go codebase and brace yourself: ' +
			'dozens of silently dropped errors — <code>json.Unmarshal</code> return ' +
			'values tossed, a <code>defer f.Close()</code> whose failure nobody will ' +
			'ever see. Go’s compiler complains about an unused <em>variable</em> but ' +
			'shrugs at an unused <em>error</em>; an entire linter ecosystem exists to ' +
			'patch that gap. Zig closes it in the type system. A function that can ' +
			'fail returns an <strong>error union</strong>, <code>ParseError!i64</code> ' +
			'— <em>either</em> an error from the set <em>or</em> an i64, never both — ' +
			'and using one is not optional:</p>',
			{ lang: 'txt', code: 'const ParseError = error{ EmptyInput, InvalidCharacter };\n\nfn parse(s: []const u8) ParseError!i64 { ... }\n\nconst n = try parse(line);       // error? return it to MY caller, right now\nconst m = parse(line) catch 0;   // error? swallow it, use 0\nconst k = parse(line) catch |e| handle(e); // error? capture and decide\n\nparse(line);                     // COMPILE ERROR: error union is discarded' },
			'<ul>' +
			'<li><strong><code>try x</code></strong> is exactly ' +
			'<code>x catch |e| return e</code> — Go’s famous three lines ' +
			'(<code>if err != nil { return err }</code>) as one keyword. On success it ' +
			'yields the payload; on error the enclosing function returns that same ' +
			'error, and nothing after the <code>try</code> executes.</li>' +
			'<li><strong><code>catch</code></strong> is the other verdict: the error ' +
			'stops here, replaced by a default or handled in a capture. After a ' +
			'<code>catch</code>, the result is a plain <code>i64</code>.</li>' +
			'<li><strong>No hidden control flow.</strong> This is Zig’s creed applied ' +
			'to errors: unlike exceptions, a call can only redirect control if you ' +
			'can <em>see</em> <code>try</code> at the call site. Grep for ' +
			'<code>try</code> and you have found every early exit in the function. Go ' +
			'shares this virtue — Zig just spends fewer lines on it.</li>' +
			'<li><strong>The payload is zeroed on propagation.</strong> An error ' +
			'union never holds both halves, so when an error comes out, there is no ' +
			'value — model that as the zero value plus the error string.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Model an error union as <code>Res{V, Err}</code> — empty ' +
			'<code>Err</code> means success. Implement <code>Try</code> and ' +
			'<code>Catch</code> (the two call-site verdicts), then a real error ' +
			'producer, <code>ParseDigits</code>: <code>""</code> → error ' +
			'<code>EmptyInput</code>, any non-digit → error ' +
			'<code>InvalidCharacter</code>, otherwise the decimal value. Finally wire ' +
			'the machine together in <code>SumLines</code>: <code>try</code> each ' +
			'parse, propagate the <em>first</em> error unchanged, or return the ' +
			'sum.</p>',
			{ lang: 'txt', code: 'Try(Res{V: 42})               → 42, ""\nTry(Res{V: 99, Err: "Boom"})  → 0, "Boom"      // payload zeroed on the error path\nCatch(Res{Err: "Boom"}, 8080) → 8080\nParseDigits("12a4")           → error.InvalidCharacter\nSumLines(["10", "20", "12"])  → 42\nSumLines(["10", "x9", "30"])  → error.InvalidCharacter   // "30" never parsed' },
		],

		starter: [
			'package main',
			'',
			'// Res models a Zig error union like ParseError!i64: EITHER a value',
			'// (Err == "") OR an error (Err != ""), never meaningfully both. The',
			'// error is a plain name, like Zig\'s error.InvalidCharacter — Zig',
			'// errors carry no message payload.',
			'type Res struct {',
			'	V   int',
			'	Err string',
			'}',
			'',
			'// Try models Zig\'s `try r`: on success return (payload, ""); on error',
			'// return (0, the SAME error string) — propagation hands the error to',
			'// the caller unchanged, and the payload slot is the zero value (an',
			'// error union never holds both halves, even if r.V is non-zero).',
			'func Try(r Res) (int, string) {',
			'	// your code here',
			'	return 0, ""',
			'}',
			'',
			'// Catch models `r catch def`: the error stops here. On success return',
			'// the payload; on error return def.',
			'func Catch(r Res, def int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// ParseDigits parses a decimal string by hand:',
			'//   - empty string        -> Res{Err: "EmptyInput"}',
			'//   - any non-digit byte  -> Res{Err: "InvalidCharacter"}',
			'//   - otherwise           -> Res{V: the value} (inputs stay small; no',
			'//     overflow handling needed)',
			'func ParseDigits(s string) Res {',
			'	// your code here',
			'	return Res{}',
			'}',
			'',
			'// SumLines runs the try machine in a loop: ParseDigits each line; the',
			'// FIRST error propagates out unchanged (later lines are never parsed);',
			'// if every line parses, return the sum. No lines sums to 0.',
			'func SumLines(lines []string) Res {',
			'	// your code here',
			'	return Res{}',
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
			'	// Printers: an error union renders as its value or "error.Name",',
			'	// matching how Zig spells error values.',
			'	showRes := func(r Res) string {',
			'		if r.Err == "" {',
			'			return fmt.Sprintf("ok %d", r.V)',
			'		}',
			'		return "error." + r.Err',
			'	}',
			'	showTry := func(v int, e string) string {',
			'		if e == "" {',
			'			return fmt.Sprintf("ok %d", v)',
			'		}',
			'		return fmt.Sprintf("v=%d error.%s", v, e)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"try on success: the payload comes out, no error",',
			'			"ok 42",',
			'			func() string { return showTry(Try(Res{V: 42})) }},',
			'		{"try on error: the SAME error propagates and the payload is ZEROED — not the stale 99",',
			'			"v=0 error.Overflow",',
			'			func() string { return showTry(Try(Res{V: 99, Err: "Overflow"})) }},',
			'		{"catch on error: the default stands in, the error stops here",',
			'			"8080",',
			'			func() string { return fmt.Sprintf("%d", Catch(Res{Err: "InvalidCharacter"}, 8080)) }},',
			'		{"catch on success: the payload wins — the default is dead code",',
			'			"443",',
			'			func() string { return fmt.Sprintf("%d", Catch(Res{V: 443}, 8080)) }},',
			'		{"ParseDigits on clean input: plain decimal accumulation",',
			'			"ok 2048",',
			'			func() string { return showRes(ParseDigits("2048")) }},',
			'		{"ParseDigits on the empty string: error.EmptyInput, not ok 0",',
			'			"error.EmptyInput",',
			'			func() string { return showRes(ParseDigits("")) }},',
			'		{"ParseDigits on \\"12a4\\": one bad byte poisons the parse — error.InvalidCharacter",',
			'			"error.InvalidCharacter",',
			'			func() string { return showRes(ParseDigits("12a4")) }},',
			'		{"SumLines on clean lines: every parse succeeds, the sum comes out",',
			'			"ok 42",',
			'			func() string { return showRes(SumLines([]string{"10", "20", "12"})) }},',
			'		{"SumLines with \\"x9\\" then \\"\\": the FIRST error (InvalidCharacter) propagates, not the later EmptyInput",',
			'			"error.InvalidCharacter",',
			'			func() string { return showRes(SumLines([]string{"10", "x9", "", "30"})) }},',
			'		{"SumLines on no lines: vacuous success, sum 0",',
			'			"ok 0",',
			'			func() string { return showRes(SumLines([]string{})) }},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			got := c.got()',
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
			'// Res models a Zig error union: EITHER a value (Err == "") OR an error',
			'// name (Err != ""), never meaningfully both. Redeclared here because',
			'// the solution replaces the starter wholesale.',
			'type Res struct {',
			'	V   int',
			'	Err string',
			'}',
			'',
			'// Try is Zig\'s `try` desugared: `x catch |e| return e`. The one subtle',
			'// choice is returning 0 — not r.V — on the error path. An error union',
			'// holds one half or the other, so on error there IS no payload; passing',
			'// r.V through would leak a value the type system says does not exist',
			'// (the harness plants a stale 99 to catch exactly that).',
			'func Try(r Res) (int, string) {',
			'	if r.Err != "" {',
			'		return 0, r.Err',
			'	}',
			'	return r.V, ""',
			'}',
			'',
			'// Catch is the opposite verdict: the error is consumed here and the',
			'// default stands in. After this call the result is a plain int — the',
			'// fallibility has been discharged, mirroring how `x catch 0` has type',
			'// i64, not !i64.',
			'func Catch(r Res, def int) int {',
			'	if r.Err != "" {',
			'		return def',
			'	}',
			'	return r.V',
			'}',
			'',
			'// ParseDigits is a real error producer: a hand-rolled decimal parser.',
			'// Order matters — the emptiness check must come first, because the',
			'// digit loop vacuously "succeeds" on zero iterations and would report',
			'// ok 0 for "", turning missing input into a plausible-looking value.',
			'func ParseDigits(s string) Res {',
			'	if len(s) == 0 {',
			'		return Res{Err: "EmptyInput"}',
			'	}',
			'	value := 0',
			'	for i := 0; i < len(s); i++ {',
			'		c := s[i]',
			'		if c < \'0\' || c > \'9\' {',
			'			// One bad byte poisons the whole parse: partial results',
			'			// never escape, exactly like Zig returning the error',
			'			// mid-function. Inputs are small by contract, so no',
			'			// overflow guard is needed.',
			'			return Res{Err: "InvalidCharacter"}',
			'		}',
			'		value = value*10 + int(c-\'0\')',
			'	}',
			'	return Res{V: value}',
			'}',
			'',
			'// SumLines is the try machine in a loop. It deliberately routes each',
			'// result through Try rather than poking r.Err directly: the early',
			'// return on a non-empty error string IS the `try` keyword, and placing',
			'// it inside the loop is what makes the first failure short-circuit the',
			'// remaining lines — they are never parsed, not parsed-and-ignored.',
			'func SumLines(lines []string) Res {',
			'	sum := 0',
			'	for _, line := range lines {',
			'		v, err := Try(ParseDigits(line))',
			'		if err != "" {',
			'			// Propagate UNCHANGED: no wrapping, no rewriting. The',
			'			// caller sees the same error.InvalidCharacter the parser',
			'			// produced, exactly as `try` forwards the error value.',
			'			return Res{Err: err}',
			'		}',
			'		sum += v',
			'	}',
			'	return Res{V: sum}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Same model as Go — with the loopholes closed</h3>' +
			'<p>Zig’s error handling is Go’s, structurally: errors are values, they ' +
			'travel in the return channel, and there is no unwinding machinery ' +
			'waiting to teleport control out of your function. The differences are ' +
			'enforcement and syntax. Go lets you write <code>val, _ := parse(s)</code> ' +
			'or simply drop a bare error return on the floor — hence ' +
			'<code>errcheck</code>, and hence real production incidents traced to an ' +
			'ignored <code>Close()</code>. In Zig, discarding an error union is a ' +
			'<em>compile error</em>; the closest legal spelling is ' +
			'<code>_ = parse(line) catch {};</code>, which is loud enough to fail code ' +
			'review on sight. And where Go spends three lines per propagation, ' +
			'<code>try</code> spends one token — which is why a 2019 Go proposal ' +
			'(<code>try()</code>, issue #32437) attempted almost exactly this and was ' +
			'declined after enormous debate: many Gophers felt even one keyword of ' +
			'invisible <code>return</code> was too much hidden control flow. Zig’s ' +
			'counterargument is that <code>try</code> is <em>visible at the call ' +
			'site</em> — which is precisely what exceptions lack.</p>' +
			'<h3>Errors are names, not payloads</h3>' +
			'<p>Your <code>Err string</code> field is more faithful than it looks: a ' +
			'Zig error value really is just an identity — a small integer with a ' +
			'name like <code>error.InvalidCharacter</code>, comparable and ' +
			'switchable, carrying no message, no wrapped cause, no stack. That makes ' +
			'an error union cheap (roughly a u16 tag plus the payload) but pushes ' +
			'context elsewhere: where Go wraps with ' +
			'<code>fmt.Errorf("parsing %s: %w", name, err)</code>, Zig code logs at ' +
			'the failure site or threads a diagnostics struct alongside. Neither ' +
			'design is free; Zig chose predictable size and zero allocation on the ' +
			'error path.</p>' +
			'<h3>The zeroed payload is a real bug class</h3>' +
			'<p>The harness case that plants <code>V: 99</code> behind an error is ' +
			'the moral of the whole item. In Go, a function that fails can still ' +
			'return a half-filled struct, and callers sometimes use it — the classic ' +
			'“ignored error, garbage value” bug that <code>(T, error)</code> permits ' +
			'because both halves always exist. An error union makes the halves ' +
			'mutually exclusive: success <em>or</em> error, enforced by the type. ' +
			'When you modeled <code>Try</code> as returning <code>0</code> rather than ' +
			'<code>r.V</code>, you implemented that exclusivity by hand — the same ' +
			'discipline as Go’s convention “on error, return the zero value”, except ' +
			'in Zig it is not a convention.</p>',
		],
		complexity: { time: 'O(n) over total input bytes — each line parsed at most once; the first error exits early', space: 'O(1)' },
	});
})();
