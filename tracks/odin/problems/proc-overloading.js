/* Explicit Overloading — Procedures & Errors (Medium). Odin allows
 * overloading only as an explicit, visible set: print_val :: proc{a, b, c}.
 * Resolution is by exact parameter-type match — no implicit conversions
 * between concrete types; only untyped literals adapt. The learner writes
 * the resolver: exact match, the untyped-int int-over-f64 preference,
 * "no match", and "ambiguous".
 */
(function () {
	'use strict';
	var T = GoLearnOdin;

	T.problem({
		id: 'proc-overloading',
		title: 'Explicit Overloading',
		nav: 'overloading',
		difficulty: 'Medium',
		category: 'Procedures & Errors',
		task: 'Implement Resolve — pick the procedure an explicit overload set dispatches to, or report "no match"/"ambiguous", all 9 tests.',

		prose: [
			'<h2>Explicit Overloading</h2>' +
			'<p>Go famously refuses overloading: one name, one signature, and the FAQ ' +
			'defends it — resolution by type “can be confusing in practice.” C++ shows ' +
			'the failure mode: any header can add another <code>print</code> anywhere, ' +
			'and which one a call picks depends on conversion ranks half the committee ' +
			'can’t recite. Odin lands between them. Overloading exists, but it is ' +
			'<strong>opt-in and explicit</strong> — a distinct declaration that lists ' +
			'the entire set in one place:</p>',
			{ lang: 'odin', code: 'print_int    :: proc(v: int)    { fmt.println("int:", v) }\nprint_string :: proc(v: string) { fmt.println("str:", v) }\nprint_bool   :: proc(v: bool)   { fmt.println("bool:", v) }\n\n// The overload set. Nothing outside this list participates — ever.\nprint_val :: proc{print_int, print_string, print_bool}\n\nprint_val(42)      // → print_int   (untyped literal adapts to int)\nprint_val("hi")    // → print_string\nprint_val(true)    // → print_bool\nprint_val(3.5)     // compile error: no procedure in the set matches f64' },
			'<p>Resolution is deliberately dumb, and that is the feature: the call’s ' +
			'argument types must match one procedure’s parameter types ' +
			'<strong>exactly</strong>. Odin performs <em>no implicit conversions ' +
			'between concrete types</em> — an <code>f32</code> argument does not ' +
			'promote to <code>f64</code>, an <code>int</code> does not narrow to ' +
			'<code>i32</code>. The single soft spot is the same one Go has: an ' +
			'<em>untyped literal</em> like <code>42</code> has no concrete type yet, so ' +
			'it can adapt to whichever numeric parameter the set offers — and when both ' +
			'an <code>int</code> and an <code>f64</code> candidate would take it, the ' +
			'literal defaults to <code>int</code>, exactly as <code>42</code> defaults ' +
			'to <code>int</code> in Go.</p>' +
			'<p>Both languages reject the same enemy — invisible resolution magic. Go’s ' +
			'answer is “no overloading”; Odin’s is “overloading you can read”: the set ' +
			'is enumerated at the declaration, and membership never changes behind ' +
			'your back.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Resolve(set, args)</code> — the dispatch decision. ' +
			'<code>args</code> holds the call’s argument types; the pseudo-type ' +
			'<code>"untyped_int"</code> is an integer literal, which matches a param of ' +
			'<code>"int"</code> <em>or</em> <code>"f64"</code>. Rank matching ' +
			'candidates by how many untyped literals they bind to <code>"f64"</code> ' +
			'(fewer wins — that is the int-default rule). Zero candidates → ' +
			'<code>"no match"</code>; a tie at the top → <code>"ambiguous"</code>.</p>',
			{ code: 'Resolve({print_int(int), print_f64(f64)}, [int])         → "print_int"  exact\nResolve({print_f64(f64)},                 [f32])         → "no match"   no implicit f32→f64\nResolve({print_int(int), print_f64(f64)}, [untyped_int]) → "print_int"  literal prefers int\nResolve({a(int), b(int)},                 [int])         → "ambiguous"  two equally exact', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Proc is one concrete procedure inside an explicit overload set.',
			'// Params are concrete parameter types, e.g. ["int", "string"].',
			'type Proc struct {',
			'	Name   string',
			'	Params []string',
			'}',
			'',
			'// Resolve picks the procedure a call with the given argument types',
			'// dispatches to.',
			'//',
			'// A candidate matches when len(Params) == len(args) and every position',
			'// agrees:',
			'//   - a concrete arg type matches only the IDENTICAL param type (no',
			'//     implicit conversions between concrete types — f32 is not f64);',
			'//   - the arg "untyped_int" (an integer literal) adapts to a param of',
			'//     "int" OR "f64".',
			'//',
			'// Rank the matching candidates by how many untyped_int args they bind',
			'// to "f64" — fewer is better (untyped ints default to int). Return the',
			'// unique best candidate\'s Name; "no match" if none match; "ambiguous"',
			'// if two or more tie for best.',
			'func Resolve(set []Proc, args []string) string {',
			'	// your code here',
			'	return "no match"',
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
			'	p := func(name string, params ...string) Proc { return Proc{Name: name, Params: params} }',
			'	printers := []Proc{p("print_int", "int"), p("print_string", "string"), p("print_bool", "bool")}',
			'',
			'	type tc struct {',
			'		name string',
			'		set  []Proc',
			'		args []string',
			'		want string',
			'	}',
			'	cases := []tc{',
			'		{"exact match: int arg picks print_int", printers, []string{"int"}, "print_int"},',
			'		{"exact match: string arg picks print_string", printers, []string{"string"}, "print_string"},',
			'		{"no implicit conversions: f32 does not promote to f64",',
			'			[]Proc{p("print_f64", "f64")}, []string{"f32"}, "no match"},',
			'		{"untyped literal adapts: only an f64 candidate, literal takes it",',
			'			[]Proc{p("print_f64", "f64"), p("print_string", "string")}, []string{"untyped_int"}, "print_f64"},',
			'		{"untyped literal prefers int when both int and f64 exist",',
			'			[]Proc{p("print_f64", "f64"), p("print_int", "int")}, []string{"untyped_int"}, "print_int"},',
			'		{"two identical signatures: equally exact — ambiguous",',
			'			[]Proc{p("log_a", "int"), p("log_b", "int")}, []string{"int"}, "ambiguous"},',
			'		{"arity is part of the signature: one arg cannot call a binary proc",',
			'			printers, []string{"int", "int"}, "no match"},',
			'		{"multi-arg exact match: order of param types matters",',
			'			[]Proc{p("write_is", "int", "string"), p("write_si", "string", "int")}, []string{"string", "int"}, "write_si"},',
			'		{"two f64 candidates for one literal: equally good — ambiguous",',
			'			[]Proc{p("plot_x", "f64"), p("plot_y", "f64")}, []string{"untyped_int"}, "ambiguous"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%q", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := Resolve(append([]Proc(nil), c.set...), append([]string(nil), c.args...))',
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
			'// Proc is one concrete procedure inside an explicit overload set.',
			'// Params are concrete parameter types, e.g. ["int", "string"].',
			'type Proc struct {',
			'	Name   string',
			'	Params []string',
			'}',
			'',
			'// Resolve picks the procedure a call with the given argument types',
			'// dispatches to, or "no match" / "ambiguous".',
			'//',
			'// The design splits cleanly in two phases, and keeping them separate is',
			'// what keeps the rules readable:',
			'//',
			'//   1. MATCHING is per-candidate and binary: does this proc take these',
			'//      args at all? Concrete types must be identical; only the untyped',
			'//      literal has any freedom (int or f64).',
			'//   2. RANKING orders the survivors: each untyped literal that had to',
			'//      settle for f64 costs 1. Cost 0 means every literal got its',
			'//      preferred int. Lowest cost wins; a shared minimum is ambiguous.',
			'//',
			'// This mirrors real overload resolution engines (including C++\'s,',
			'// stripped of its 14 conversion ranks): filter by viability, then rank',
			'// by conversion cost, then demand a unique minimum.',
			'func Resolve(set []Proc, args []string) string {',
			'	const noMatch = -1',
			'',
			'	// cost reports how well one candidate matches: -1 for no match,',
			'	// otherwise the number of untyped literals bound to f64.',
			'	cost := func(p Proc) int {',
			'		if len(p.Params) != len(args) {',
			'			return noMatch // arity is part of the signature',
			'		}',
			'		c := 0',
			'		for i, a := range args {',
			'			switch {',
			'			case a == p.Params[i]:',
			'				// concrete-on-concrete: identical types only —',
			'				// Odin never implicitly converts f32→f64 etc.',
			'			case a == "untyped_int" && p.Params[i] == "int":',
			'				// the literal\'s default target: free',
			'			case a == "untyped_int" && p.Params[i] == "f64":',
			'				c++ // allowed, but ranked below an int binding',
			'			default:',
			'				return noMatch',
			'			}',
			'		}',
			'		return c',
			'	}',
			'',
			'	best, bestCount, winner := noMatch, 0, ""',
			'	for _, p := range set {',
			'		c := cost(p)',
			'		if c == noMatch {',
			'			continue',
			'		}',
			'		if best == noMatch || c < best {',
			'			best, bestCount, winner = c, 1, p.Name',
			'		} else if c == best {',
			'			bestCount++ // a tie at the current minimum',
			'		}',
			'	}',
			'',
			'	if best == noMatch {',
			'		return "no match"',
			'	}',
			'	if bestCount > 1 {',
			'		// Two equally-good candidates: Odin reports an error at the',
			'		// call site rather than inventing a tiebreak — explicit',
			'		// overloading refuses to guess.',
			'		return "ambiguous"',
			'	}',
			'	return winner',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Filter, then rank, then demand uniqueness</h3>' +
			'<p>The resolver is a two-phase pipeline. Matching is binary and local to ' +
			'one candidate; ranking compares only the survivors:</p>',
			{ code: 'case a == "untyped_int" && p.Params[i] == "int":\n\t// free — the literal\'s default\ncase a == "untyped_int" && p.Params[i] == "f64":\n\tc++ // allowed, but a worse fit than int' },
			'<p>Everything subtle lives in that cost function, and it has exactly two ' +
			'lines of subtlety. Compare C++, where the same phase has fourteen ' +
			'conversion categories with a partial order over sequences of them. Odin ' +
			'keeps overloading affordable by making the cost model almost trivial: ' +
			'identical or untyped, nothing else.</p>' +
			'<h3>Why the set is spelled out</h3>' +
			'<p><code>print_val :: proc{print_int, print_string}</code> is a ' +
			'<em>declaration</em>, not an emergent property of the namespace. Adding a ' +
			'new overload means editing that one line — the reader of a call site can ' +
			'jump to a single place and see every candidate that could ever win. In ' +
			'C++ (and Java, and C#) the candidate set is “whatever is visible here”, ' +
			'which changes with includes and imports; a new header can silently ' +
			're-route existing calls. Odin’s sets cannot grow behind your back, which ' +
			'is precisely the confusion the Go FAQ was worried about.</p>' +
			'<h3>The Go connection</h3>' +
			'<p>Go and Odin agree on the underlying value: dispatch you can predict by ' +
			'reading the code. Go achieves it by banning overloading — hence ' +
			'<code>strconv.FormatInt</code>, <code>FormatFloat</code>, ' +
			'<code>FormatBool</code> as three names. Odin achieves it by making the ' +
			'overload set a first-class, closed declaration. And the “untyped literal ' +
			'defaults to int” rule you implemented is lifted straight from Go’s own ' +
			'constant system: <code>var x = 42</code> gives an <code>int</code> there ' +
			'too. The next problem generalizes the idea — instead of listing concrete ' +
			'procedures by hand, <code>$T</code> lets the compiler stamp them out.</p>',
		],
		complexity: { time: 'O(n·m) — n candidates × m params each, one pass', space: 'O(1) beyond the inputs' },
	});
})();
