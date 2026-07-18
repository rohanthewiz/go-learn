/* Parametric Polymorphism ($T) — Procedures & Errors (Hard). Odin generics:
 * $T binds from the call site and the compiler MONOMORPHIZES — each distinct
 * binding stamps a separate concrete procedure at compile time. The learner
 * implements the instantiation engine: unify each call's argument types
 * against the signature (first concrete wins the binding, later occurrences
 * must agree), emit instantiation keys, and count DISTINCT stamps.
 */
(function () {
	'use strict';
	var T = GoLearnOdin;

	T.problem({
		id: 'parametric-procs',
		title: 'Parametric Polymorphism ($T)',
		nav: 'parametric $T',
		difficulty: 'Hard',
		category: 'Procedures & Errors',
		task: 'Implement Instantiate — unify call-site types against a $T signature, emit instantiation keys or conflict errors, count distinct stamps. All 9 tests.',

		prose: [
			'<h2>Parametric Polymorphism ($T)</h2>' +
			'<p>The overload sets of the previous problem list concrete procedures by ' +
			'hand. Odin’s <code>$T</code> lets the compiler write the list for you:</p>',
			{ lang: 'odin', code: 'max_of :: proc(a, b: $T) -> T {\n\treturn a if a > b else b\n}\n\nx := max_of(3, 9)        // stamps max_of(int, int)\ny := max_of(2.5, 1.0)    // stamps max_of(f64, f64)\nz := max_of(4, 7)        // int again — REUSES the first stamp\nw := max_of(3, "hi")     // error: $T cannot be int and string at once' },
			'<p><code>$T</code> is a <strong>type variable bound at the call site</strong>: ' +
			'the first argument it meets fixes it, and every later occurrence must ' +
			'agree. And the binding is not a runtime affair — the compiler ' +
			'<strong>monomorphizes</strong>: each distinct <code>T</code> stamps out a ' +
			'separate, fully concrete procedure at compile time. The two calls above ' +
			'produce two independent <code>max_of</code>s in the binary, each with the ' +
			'exact comparison instruction for its type, and calling one is a plain ' +
			'direct call — zero runtime dispatch, no boxing, nothing to look up.</p>' +
			'<p>Go developers should feel the contrast precisely here. Go generics ' +
			'<em>may</em> stencil per type, but the gc compiler shares one ' +
			'implementation across all types with the same <em>GC shape</em> — every ' +
			'pointer instantiates the same code — and passes a hidden ' +
			'<em>dictionary</em> argument at runtime to recover what the type ' +
			'parameter was. That is a deliberate trade: less code bloat, some runtime ' +
			'indirection. Odin always stamps: more code, but every instantiation is as ' +
			'fast as if you had written it by hand — the compiler is doing exactly what ' +
			'a C programmer with a macro would do, with type checking.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement the instantiation engine. <code>sig</code> is the parameter ' +
			'type list — type variables spelled <code>"$T"</code>, <code>"$E"</code>, … ' +
			'mixed with concrete types (variables appear in params only; ignore return ' +
			'types). For each call’s argument-type list, <em>unify</em>: a variable ' +
			'binds to the first concrete type it meets; later occurrences must match ' +
			'or the call fails with ' +
			'<code>"conflict: $T=int vs string"</code>. A concrete param must be met by ' +
			'the identical arg type or the call fails with ' +
			'<code>"mismatch: int vs f64"</code> (param vs arg). Successful calls yield ' +
			'an instantiation key; the second result is the number of ' +
			'<strong>distinct</strong> keys — the monomorphization count, i.e. how many ' +
			'procedures the compiler actually emits.</p>',
			{ code: 'Key format — one type variable or none:  substituted param list\n    Instantiate("max_of", [$T, $T], [[int, int]])   → "max_of(int, int)"\nTwo or more variables:  the bindings, in order of first appearance\n    Instantiate("zip", [$T, $E], [[int, string]])   → "zip($T=int, $E=string)"\nDistinct count dedupes repeats and ignores errors:\n    calls [[int,int], [f64,f64], [int,int]]         → 3 results, distinct = 2', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Instantiate simulates the compiler instantiating a parametric proc.',
			'//',
			'//   name — the procedure name, used to build instantiation keys.',
			'//   sig  — parameter types: type variables ("$T", "$E", ...) mixed',
			'//          with concrete types ("int", "string", ...). Variables occur',
			'//          in params only (return types are out of scope here).',
			'//   args — one argument-type list per call site; every list has',
			'//          len(sig) entries and contains only concrete types.',
			'//',
			'// Per call, unify args against sig:',
			'//   - a variable binds to the FIRST concrete type it meets; a later',
			'//     occurrence bound differently fails the call with',
			'//     "conflict: $T=int vs string" (variable, bound type, new type);',
			'//   - a concrete param requires the identical arg type, else',
			'//     "mismatch: int vs f64" (param type vs arg type).',
			'//',
			'// A successful call\'s result is its instantiation key:',
			'//   - 0 or 1 type variables → the substituted param list:',
			'//         "max_of(int, int)"',
			'//   - 2+ type variables → the bindings, in order of first appearance',
			'//     in sig:  "zip($T=int, $E=string)"',
			'//',
			'// Returns the per-call results (key or error string, same order as',
			'// args) and the number of DISTINCT successful keys — how many concrete',
			'// procedures monomorphization actually emits.',
			'func Instantiate(name string, sig []string, args [][]string) ([]string, int) {',
			'	// your code here',
			'	return nil, 0',
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
			'	// show renders (results, count) as one comparable line; the empty',
			'	// result list gets an explicit marker so nil vs [] cannot hide.',
			'	show := func(res []string, n int) string {',
			'		body := "(no calls)"',
			'		if len(res) > 0 {',
			'			body = strings.Join(res, "; ")',
			'		}',
			'		return fmt.Sprintf("%s | distinct=%d", body, n)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		proc string',
			'		sig  []string',
			'		args [][]string',
			'		want string',
			'	}',
			'	cases := []tc{',
			'		{"one call, one stamp", "max_of", []string{"$T", "$T"},',
			'			[][]string{{"int", "int"}},',
			'			"max_of(int, int) | distinct=1"},',
			'		{"repeat calls dedupe: the compiler stamps each T once", "max_of", []string{"$T", "$T"},',
			'			[][]string{{"int", "int"}, {"f64", "f64"}, {"int", "int"}},',
			'			"max_of(int, int); max_of(f64, f64); max_of(int, int) | distinct=2"},',
			'		{"conflict: $T cannot be int and string at once", "max_of", []string{"$T", "$T"},',
			'			[][]string{{"int", "string"}},',
			'			"conflict: $T=int vs string | distinct=0"},',
			'		{"two variables bind independently", "zip", []string{"$T", "$E"},',
			'			[][]string{{"int", "string"}},',
			'			"zip($T=int, $E=string) | distinct=1"},',
			'		{"swapped bindings are a DIFFERENT instantiation", "zip", []string{"$T", "$E"},',
			'			[][]string{{"int", "string"}, {"string", "int"}},',
			'			"zip($T=int, $E=string); zip($T=string, $E=int) | distinct=2"},',
			'		{"concrete params must match exactly — no conversions", "index_of", []string{"$T", "int"},',
			'			[][]string{{"string", "int"}, {"string", "f64"}},',
			'			"index_of(string, int); mismatch: int vs f64 | distinct=1"},',
			'		{"third occurrence still checks the first binding", "clamp", []string{"$T", "$T", "$T"},',
			'			[][]string{{"int", "int", "f64"}},',
			'			"conflict: $T=int vs f64 | distinct=0"},',
			'		{"failed calls do not instantiate anything", "max_of", []string{"$T", "$T"},',
			'			[][]string{{"int", "int"}, {"int", "f64"}, {"int", "int"}},',
			'			"max_of(int, int); conflict: $T=int vs f64; max_of(int, int) | distinct=1"},',
			'		{"no calls: nothing stamped (generic code costs nothing unused)", "max_of", []string{"$T", "$T"},',
			'			[][]string{},',
			'			"(no calls) | distinct=0"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  c.want,',
			'		}',
			'		runCase(r, func() {',
			'			res, n := Instantiate(c.proc, append([]string(nil), c.sig...), c.args)',
			'			got := show(res, n)',
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
			'// Instantiate simulates the compiler instantiating a parametric proc:',
			'// unify each call, build its key, count distinct stamps. See the',
			'// starter comment for the exact key/error formats.',
			'//',
			'// Design notes:',
			'//   - Unification here is the degenerate (and real!) first-order case:',
			'//     variables bind only to concrete types, never to each other, so a',
			'//     plain map is the whole substitution — no occurs check needed.',
			'//   - varOrder is tracked separately because Go maps do not preserve',
			'//     insertion order, and the multi-var key format promises "$T" and',
			'//     "$E" in order of first appearance in sig.',
			'//   - seen deduplicates keys: monomorphization is keyed by the BOUND',
			'//     TYPES, so textual repeats of a call cost nothing extra — exactly',
			'//     why generic-heavy Odin code does not explode the binary per call',
			'//     site, only per distinct type.',
			'func Instantiate(name string, sig []string, args [][]string) ([]string, int) {',
			'	// The variables and their order are properties of the SIGNATURE,',
			'	// shared by every call, so compute them once up front.',
			'	varOrder := []string{}',
			'	for _, p := range sig {',
			'		if len(p) > 0 && p[0] == \'$\' && !contains(varOrder, p) {',
			'			varOrder = append(varOrder, p)',
			'		}',
			'	}',
			'',
			'	results := make([]string, 0, len(args))',
			'	seen := map[string]bool{} // distinct successful keys',
			'',
			'	for _, call := range args {',
			'		bind := map[string]string{} // fresh bindings per call site',
			'		errMsg := ""',
			'',
			'		for i, p := range sig {',
			'			a := call[i]',
			'			if len(p) > 0 && p[0] == \'$\' {',
			'				prev, bound := bind[p]',
			'				if !bound {',
			'					bind[p] = a // first concrete wins the binding',
			'				} else if prev != a {',
			'					// A later occurrence disagrees: the call is',
			'					// untypeable. Report against the ORIGINAL',
			'					// binding — that is what the programmer',
			'					// committed to first.',
			'					errMsg = "conflict: " + p + "=" + prev + " vs " + a',
			'					break',
			'				}',
			'			} else if p != a {',
			'				// Concrete params take no conversions, same rule as',
			'				// the overloading lesson: identical or nothing.',
			'				errMsg = "mismatch: " + p + " vs " + a',
			'				break',
			'			}',
			'		}',
			'',
			'		if errMsg != "" {',
			'			results = append(results, errMsg)',
			'			continue // errors never reach the stamp set',
			'		}',
			'',
			'		// Build the instantiation key. With 2+ variables the bindings',
			'		// themselves are the clearest identity; with 0 or 1 the fully',
			'		// substituted param list reads like a normal signature.',
			'		key := ""',
			'		if len(varOrder) >= 2 {',
			'			for i, v := range varOrder {',
			'				if i > 0 {',
			'					key += ", "',
			'				}',
			'				key += v + "=" + bind[v]',
			'			}',
			'		} else {',
			'			for i, p := range sig {',
			'				if i > 0 {',
			'					key += ", "',
			'				}',
			'				if len(p) > 0 && p[0] == \'$\' {',
			'					key += bind[p] // substitute the binding',
			'				} else {',
			'					key += p',
			'				}',
			'			}',
			'		}',
			'		key = name + "(" + key + ")"',
			'',
			'		results = append(results, key)',
			'		seen[key] = true // set semantics: repeats collapse',
			'	}',
			'',
			'	distinct := len(seen)',
			'	return results, distinct',
			'}',
			'',
			'// contains reports whether xs already holds s — a linear scan is right',
			'// for the 1-3 variables a real signature has.',
			'func contains(xs []string, s string) bool {',
			'	for _, x := range xs {',
			'		if x == s {',
			'			return true',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Unification, minus the scary parts</h3>' +
			'<p>The core loop is textbook unification specialized to the case Odin ' +
			'actually needs: variables meet only concrete types, so a binding map ' +
			'<em>is</em> the substitution and “unify” degrades to three branches:</p>',
			{ code: 'if isVar(p) {\n\tif !bound { bind[p] = a }          // first concrete wins\n\telse if prev != a { /* conflict */ } // later occurrences must agree\n} else if p != a { /* mismatch */ }    // concretes: identical or nothing' },
			'<p>Full Hindley–Milner inference adds variables-meeting-variables and an ' +
			'occurs check; Odin deliberately stops before that, which is why its ' +
			'error messages stay as blunt and readable as the strings you formatted.</p>' +
			'<h3>The distinct count is the cost model</h3>' +
			'<p>The second return value is the number a compiler engineer cares ' +
			'about: how many copies of the procedure exist in the binary. Your tests ' +
			'showed the two forces that shape it — repeat calls <em>dedupe</em> (a ' +
			'thousand <code>max_of(int, int)</code> call sites cost one stamp) and ' +
			'distinct bindings <em>multiply</em> (every new <code>T</code> is a whole ' +
			'new procedure). Monomorphization trades binary size for speed: each stamp ' +
			'is direct-callable, inlinable, and knows its types down to the ' +
			'instruction. C++ templates made the same trade decades ago; Odin keeps ' +
			'it, but with unification errors at the signature instead of a 40-line ' +
			'template backtrace.</p>' +
			'<h3>Go chose the other lane</h3>' +
			'<p>Go’s gc compiler groups instantiations by <em>GC shape</em> — ' +
			'<code>*Foo</code> and <code>*Bar</code> share one compiled body — and ' +
			'passes a hidden dictionary so the shared body can still find its ' +
			'type-specific operations at runtime. That keeps binaries small and ' +
			'compilation fast, at the price of indirect calls the inliner sometimes ' +
			'cannot see through — the classic reason a hand-specialized Go function ' +
			'occasionally beats its generic twin. Odin’s answer is the one your ' +
			'<code>seen</code> set models: always stamp, never dispatch. Neither is ' +
			'free; the point of this lesson is that you can now name exactly what ' +
			'each language is paying.</p>',
		],
		complexity: { time: 'O(c·p) — c calls × p params, each position visited once', space: 'O(v + k) — bindings per call plus the distinct-key set' },
	});
})();
