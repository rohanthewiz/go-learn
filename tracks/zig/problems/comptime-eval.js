/* comptime Evaluation — Types & Comptime (Medium). Zig's comptime runs
 * ordinary Zig inside the compiler, and the killer app is std.fmt: format
 * strings are parsed at compile time, so an arity mismatch or a bad
 * specifier is a COMPILE error — where Go prints %!d(MISSING) at runtime.
 * The learner implements that checker: parse {d}/{s}/{} placeholders,
 * enforce arity and kinds, and render by substitution.
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// Two lanes for the same mistake: Zig's comptime interpreter rejects a
	// bad format string before a binary exists; Go ships the binary and the
	// log finds out. Marker id namespaced (dgArrowZGCE) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 214" width="520" height="214" role="img" aria-label="comptime lane: format string plus arg types flow through the comptime interpreter to ok or compile error; runtime lane below: the Go binary ships and production logs show percent bang d MISSING">' +
		'<text x="20" y="22" class="lbl">comptime lane (Zig): the check runs INSIDE the compiler</text>' +
		'<rect x="30" y="34" width="130" height="48" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="95" y="54" text-anchor="middle">format string</text>' +
		'<text x="95" y="72" text-anchor="middle">+ arg types</text>' +
		'<path d="M 166 58 L 202 58" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowZGCE)"/>' +
		'<rect x="210" y="34" width="150" height="48" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="285" y="54" text-anchor="middle">comptime</text>' +
		'<text x="285" y="72" text-anchor="middle">interpreter</text>' +
		'<path d="M 366 58 L 402 58" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowZGCE)"/>' +
		'<rect x="410" y="34" width="90" height="48" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="455" y="54" text-anchor="middle">ok — or</text>' +
		'<text x="455" y="72" text-anchor="middle">compile error</text>' +
		'<text x="20" y="116" class="lbl" style="fill:var(--warn)">runtime lane (Go): the same mistake rides along to production</text>' +
		'<rect x="30" y="128" width="130" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="95" y="155" text-anchor="middle">binary ships</text>' +
		'<path d="M 166 150 L 240 150" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowZGCEW)"/>' +
		'<rect x="248" y="128" width="252" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="374" y="155" text-anchor="middle">prod log: 42 %!s(MISSING)</text>' +
		'<text x="20" y="200" class="lbl">the check is free because the language can already run at compile time</text>' +
		'<defs>' +
		'<marker id="dgArrowZGCE" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowZGCEW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'comptime-eval',
		title: 'comptime Evaluation',
		nav: 'comptime eval',
		difficulty: 'Medium',
		category: 'Types & Comptime',
		task: 'Implement the comptime format checker: CheckFormat validates {d}/{s}/{} placeholders against arg kinds; RenderFormat substitutes them.',

		prose: [
			'<h2>comptime Evaluation</h2>' +
			'<p>Somewhere in your Go service there is a ' +
			'<code>fmt.Errorf</code> whose argument list drifted during a ' +
			'refactor, and the first anyone hears of it is a log line reading ' +
			'<code>user 42 %!s(MISSING)</code> — at 3am, in production. Zig ' +
			'closes that gap with one idea taken seriously: ' +
			'<code>comptime</code> runs <em>ordinary Zig</em> at compile time. ' +
			'Not macros, not a template language — the same loops and ' +
			'functions, partially evaluated by the compiler:</p>',
			{ lang: 'txt', code: 'comptime {\n    var sum: u32 = 0;\n    var i: u32 = 0;\n    while (i < 5) : (i += 1) sum += i;   // runs in the COMPILER\n    // sum is 10 before a single byte of machine code exists\n}\n\n// The killer app — std.fmt parses format strings at comptime:\nstd.debug.print("{d} {s}\\n", .{42});\n// error: expected tuple with 2 fields, found 1     <- COMPILE error\nstd.debug.print("{q}\\n", .{42});\n// error: invalid format specifier \'q\'              <- COMPILE error\n\n// Go, same mistakes:\nfmt.Printf("%d %s\\n", 42)   // compiles fine; prints "42 %!s(MISSING)"' },
			'<p><code>std.fmt.format</code> is not special-cased in the ' +
			'compiler — it is a library function that happens to loop over the ' +
			'format string with <code>comptime</code> machinery, so arity and ' +
			'specifier checking fall out for free. You are going to build that ' +
			'checker. The placeholder grammar:</p>' +
			'<ul>' +
			'<li><code>{d}</code> demands an <code>"int"</code> argument, ' +
			'<code>{s}</code> demands a <code>"str"</code>, and the empty ' +
			'<code>{}</code> accepts either — Zig\'s "infer from the type" ' +
			'placeholder.</li>' +
			'<li><code>{{</code> and <code>}}</code> are escaped literal ' +
			'braces: they render as <code>{</code> and <code>}</code> and ' +
			'consume no argument.</li>' +
			'<li>Errors, checked in the order you meet them: a <code>{</code> ' +
			'that never closes is <code>unclosed brace</code>; anything ' +
			'between braces other than <code>d</code>, <code>s</code>, or ' +
			'nothing is <code>unknown specifier: &lt;spec&gt;</code>; more ' +
			'placeholders than args is <code>too few args</code>, fewer is ' +
			'<code>too many args</code>; a kind mismatch is ' +
			'<code>arg &lt;i&gt; is &lt;kind&gt;, {&lt;spec&gt;} wants ' +
			'&lt;want&gt;</code>.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>CheckFormat(format, argKinds)</code> — the ' +
			'full comptime check — and <code>RenderFormat(format, args)</code>, ' +
			'which substitutes pre-stringified args positionally. Render ' +
			'cannot see kinds, so it enforces only the structural rules: ' +
			'unclosed braces, unknown specifiers, and arity. Go\'s answer to ' +
			'this problem is <code>go vet</code>\'s printf checker — a ' +
			'separate tool bolted onto the side, because the language itself ' +
			'cannot run at compile time.</p>',
		],

		starter: [
			'package main',
			'',
			'// CheckFormat validates a format string against the kinds of the',
			'// args that will be supplied — the work Zig\'s std.fmt does at',
			'// compile time. argKinds entries are "int" or "str".',
			'//',
			'// Grammar: "{d}" requires "int"; "{s}" requires "str"; "{}" accepts',
			'// either; "{{" and "}}" are escaped literal braces consuming no arg.',
			'// A lone "}" is ordinary text.',
			'//',
			'// Errors (exact strings, first one met wins; scan left to right):',
			'//   "unclosed brace"            — a "{" with no matching "}"',
			'//   "unknown specifier: <spec>" — braces holding anything but d/s/empty',
			'//   "too few args"              — more placeholders than argKinds',
			'//   "too many args"             — fewer placeholders than argKinds',
			'//   "arg <i> is <kind>, {<spec>} wants <want>"',
			'//                               — kind mismatch; <i> is the 0-INDEXED',
			'//                                 arg position (like a slice index,',
			'//                                 not a human count)',
			'// Returns nil when the format and args agree.',
			'func CheckFormat(format string, argKinds []string) error {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// RenderFormat substitutes args positionally into the format string:',
			'// each of "{d}", "{s}", "{}" consumes the next arg verbatim (args',
			'// arrive pre-stringified, so the three specifiers render alike);',
			'// "{{" and "}}" become literal "{" and "}".',
			'//',
			'// Kinds are unknown here, so only the structural errors apply, same',
			'// strings as CheckFormat: "unclosed brace", "unknown specifier:',
			'// <spec>", "too few args", "too many args". On error the returned',
			'// string is "".',
			'func RenderFormat(format string, args []string) (string, error) {',
			'	// your code here',
			'	return "", nil',
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
			'	// ck renders CheckFormat\'s error as a comparable string; nil',
			'	// becomes "ok" so passing and failing formats share a column.',
			'	ck := func(format string, kinds []string) string {',
			'		if err := CheckFormat(format, kinds); err != nil {',
			'			return err.Error()',
			'		}',
			'		return "ok"',
			'	}',
			'	// rd does the same for RenderFormat\'s (string, error) pair.',
			'	rd := func(format string, args []string) string {',
			'		s, err := RenderFormat(format, args)',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return s',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"valid: three {d} against three ints — the check Zig runs before codegen",',
			'			"ok",',
			'			func() string { return ck("{d} + {d} = {d}", []string{"int", "int", "int"}) }},',
			'		{"valid: {} is the any-kind placeholder — int or str both satisfy it",',
			'			"ok",',
			'			func() string { return ck("{} greets {s}", []string{"int", "str"}) }},',
			'		{"valid: {{ and }} are escaped literals — they consume NO argument",',
			'			"ok",',
			'			func() string { return ck("{{gauge}} at {d}%", []string{"int"}) }},',
			'		{"a { that never closes — caught before any arg checking",',
			'			"unclosed brace",',
			'			func() string { return ck("value: {d", []string{"int"}) }},',
			'		{"{x} is not a specifier this fmt knows",',
			'			"unknown specifier: x",',
			'			func() string { return ck("{x}", []string{"int"}) }},',
			'		{"two placeholders, one arg — Zig: error: expected tuple with 2 fields",',
			'			"too few args",',
			'			func() string { return ck("{d} and {d}", []string{"int"}) }},',
			'		{"one placeholder, two args — the unused arg is also a compile error in Zig",',
			'			"too many args",',
			'			func() string { return ck("{d}", []string{"int", "int"}) }},',
			'		{"kind mismatch at arg 0 (0-indexed): {d} handed a str",',
			'			"arg 0 is str, {d} wants int",',
			'			func() string { return ck("{d}", []string{"str"}) }},',
			'		{"mismatch deeper in: {} lets the int pass, then {s} refuses the second int",',
			'			"arg 1 is int, {s} wants str",',
			'			func() string { return ck("{} then {s}", []string{"int", "int"}) }},',
			'		{"RenderFormat round-trip: positional substitution, specifiers render alike",',
			'			"sum of 2 and 3 is 5",',
			'			func() string { return rd("sum of {d} and {d} is {d}", []string{"2", "3", "5"}) }},',
			'		{"RenderFormat: {{{d}}} is escaped brace + placeholder + escaped brace",',
			'			"{42}",',
			'			func() string { return rd("{{{d}}}", []string{"42"}) }},',
			'		{"RenderFormat still enforces arity — kinds unknown, structure still checked",',
			'			"error: too few args",',
			'			func() string { return rd("{s} {s}", []string{"hi"}) }},',
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
			'import (',
			'	"errors"',
			'	"fmt"',
			')',
			'',
			'// fmtToken is one lexed unit of a format string: either literal text',
			'// (isPh false, lit holds the — already unescaped — characters) or a',
			'// placeholder (isPh true, spec is "", "d", or "s"). Lexing once and',
			'// interpreting twice keeps CheckFormat and RenderFormat in lockstep:',
			'// they cannot disagree about where the placeholders are, which is',
			'// exactly how std.fmt shares one comptime parser between checking',
			'// and formatting.',
			'type fmtToken struct {',
			'	lit  string',
			'	isPh bool',
			'	spec string',
			'}',
			'',
			'// lexFormat splits format into tokens, raising the two errors that',
			'// are properties of the STRING alone (no args needed): unclosed',
			'// braces and unknown specifiers.',
			'func lexFormat(format string) ([]fmtToken, error) {',
			'	toks := []fmtToken{}',
			'	i := 0',
			'	for i < len(format) {',
			'		c := format[i]',
			'		if c == \'{\' {',
			'			// "{{" first: the escape must win before "{" starts a',
			'			// placeholder, or "{{d}}" would misparse.',
			'			if i+1 < len(format) && format[i+1] == \'{\' {',
			'				toks = append(toks, fmtToken{lit: "{"})',
			'				i += 2',
			'				continue',
			'			}',
			'			// Scan for the closing brace; running off the end is the',
			'			// unclosed-brace error, reported without guessing at what',
			'			// the spec might have been.',
			'			j := i + 1',
			'			for j < len(format) && format[j] != \'}\' {',
			'				j++',
			'			}',
			'			if j == len(format) {',
			'				return nil, errors.New("unclosed brace")',
			'			}',
			'			spec := format[i+1 : j]',
			'			if spec != "" && spec != "d" && spec != "s" {',
			'				return nil, errors.New("unknown specifier: " + spec)',
			'			}',
			'			toks = append(toks, fmtToken{isPh: true, spec: spec})',
			'			i = j + 1',
			'			continue',
			'		}',
			'		if c == \'}\' && i+1 < len(format) && format[i+1] == \'}\' {',
			'			toks = append(toks, fmtToken{lit: "}"})',
			'			i += 2',
			'			continue',
			'		}',
			'		// Ordinary text — including a lone "}", which the grammar',
			'		// treats as literal. Byte-at-a-time is fine: braces are ASCII,',
			'		// so UTF-8 multi-byte text passes through untouched.',
			'		toks = append(toks, fmtToken{lit: string(c)})',
			'		i++',
			'	}',
			'	return toks, nil',
			'}',
			'',
			'// CheckFormat is the comptime checker: lex, then walk placeholders',
			'// against argKinds left to right. Error indices are 0-INDEXED (a',
			'// slice index, not a human count) — stated here because off-by-one',
			'// in diagnostics is its own class of bug.',
			'func CheckFormat(format string, argKinds []string) error {',
			'	toks, err := lexFormat(format)',
			'	if err != nil {',
			'		return err',
			'	}',
			'	idx := 0 // next arg each placeholder will consume',
			'	for _, t := range toks {',
			'		if !t.isPh {',
			'			continue',
			'		}',
			'		// Arity before kind: a placeholder with no arg left has',
			'		// nothing to kind-check against.',
			'		if idx >= len(argKinds) {',
			'			return errors.New("too few args")',
			'		}',
			'		// Map the spec to its demanded kind; "" ({}) demands nothing,',
			'		// mirroring Zig\'s infer-from-type placeholder.',
			'		want := ""',
			'		if t.spec == "d" {',
			'			want = "int"',
			'		} else if t.spec == "s" {',
			'			want = "str"',
			'		}',
			'		if want != "" && argKinds[idx] != want {',
			'			return fmt.Errorf("arg %d is %s, {%s} wants %s", idx, argKinds[idx], t.spec, want)',
			'		}',
			'		idx++',
			'	}',
			'	// Leftover args: Zig rejects unused tuple fields too — silence',
			'	// here is how Go format-string drift starts.',
			'	if idx < len(argKinds) {',
			'		return errors.New("too many args")',
			'	}',
			'	return nil',
			'}',
			'',
			'// RenderFormat substitutes args into the lexed tokens. Kinds are',
			'// unknown at render time, so only structural errors apply — but',
			'// arity is checked BEFORE building output, so a bad call yields',
			'// ("", error), never a half-rendered string.',
			'func RenderFormat(format string, args []string) (string, error) {',
			'	toks, err := lexFormat(format)',
			'	if err != nil {',
			'		return "", err',
			'	}',
			'	phCount := 0',
			'	for _, t := range toks {',
			'		if t.isPh {',
			'			phCount++',
			'		}',
			'	}',
			'	if phCount > len(args) {',
			'		return "", errors.New("too few args")',
			'	}',
			'	if phCount < len(args) {',
			'		return "", errors.New("too many args")',
			'	}',
			'	out := ""',
			'	idx := 0',
			'	for _, t := range toks {',
			'		if t.isPh {',
			'			// Args arrive pre-stringified, so {d}, {s}, and {} all',
			'			// render identically — the spec only mattered to Check.',
			'			out += args[idx]',
			'			idx++',
			'		} else {',
			'			out += t.lit',
			'		}',
			'	}',
			'	return out, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Partial evaluation, not macros</h3>' +
			'<p>The sharpest way to place <code>comptime</code>: C ' +
			'preprocessor macros manipulate <em>text</em>, Rust macros ' +
			'manipulate <em>syntax trees</em>, C++ templates are a separate ' +
			'accidentally-Turing-complete language — but <code>comptime</code> ' +
			'is just Zig, <em>partially evaluated</em>. The compiler embeds an ' +
			'interpreter for the whole language; anything whose inputs are ' +
			'known at compile time can run in it, with the same semantics ' +
			'it would have at runtime. That is why <code>std.fmt</code> needs ' +
			'no compiler hook: <code>format</code> is an ordinary function ' +
			'that happens to loop over a <code>comptime fmt</code> parameter, ' +
			'and the loop you wrote in <code>lexFormat</code> is a fair sketch ' +
			'of the one it runs — including emitting a compile error, which in ' +
			'Zig is just <code>@compileError(...)</code> reached by ordinary ' +
			'control flow.</p>' +
			'<h3>Go\'s answer is a second program</h3>' +
			'<p>Go cannot run user code at compile time, so format checking ' +
			'lives in <code>go vet</code>\'s <code>printf</code> analyzer — a ' +
			'static-analysis pass that pattern-matches calls to known ' +
			'formatting functions. It works remarkably well, and it is still ' +
			'a bolt-on: it must be <em>told</em> about wrappers ' +
			'(<code>-printf.funcs</code>, or naming your function ' +
			'<code>...f</code> and ending the signature with ' +
			'<code>...any</code>), it cannot see a format string built at ' +
			'runtime, and nothing forces it to run. The lesson generalizes ' +
			'past printf: every "checked at compile time" feature Zig gets ' +
			'from comptime — typed SQL strings, validated regexes, ' +
			'state-machine tables — Go recreates as a vet check, a code ' +
			'generator, or a runtime panic.</p>' +
			'<h3>Where the lane metaphor breaks</h3>' +
			'<p>Zig\'s guarantee has edges worth knowing. It only covers ' +
			'strings the compiler can see — build a format string at runtime ' +
			'and you are back to runtime errors (Zig makes this awkward on ' +
			'purpose). Comptime execution is sandboxed (no I/O, no syscalls) ' +
			'and budgeted: the compiler caps evaluation backward branches ' +
			'(<code>@setEvalBranchQuota</code> raises it), so the interpreter ' +
			'terminates even on hostile input. And each distinct comptime ' +
			'input can stamp distinct code — the flip side, monomorphization, ' +
			'is exactly where the next problem picks up.</p>',
		],
		complexity: { time: 'O(n + a) — one pass to lex the format, one over placeholders and args', space: 'O(n) — the token list mirrors the format string' },
	});
})();
