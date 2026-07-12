/* Copy or Move — Ownership (Easy). The rule that decides whether `let t = s`
 * moves or copies: is the type Copy? Structural and recursive — primitives
 * yes, heap owners no, shared refs yes, &mut no, aggregates iff every field
 * is. The learner implements the predicate rustc's derive machinery checks.
 */
(function () {
	'use strict';
	var T = GoLearnRust;

	// Two columns: bit-copyable vs heap-owning. The &mut cell is the one
	// people get wrong, so it gets the error color despite being "just a
	// pointer".
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-label="Copy types duplicate on assignment; non-Copy types move">' +
		'<text x="20" y="24" class="lbl">Copy: assignment duplicates the bits — both bindings stay usable</text>' +
		'<rect x="30" y="44" width="220" height="120" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="140" y="68" text-anchor="middle" style="fill:var(--ok)">Copy</text>' +
		'<text x="140" y="92" text-anchor="middle">i32  f64  bool  char</text>' +
		'<text x="140" y="114" text-anchor="middle">&amp;T (shared ref)</text>' +
		'<text x="140" y="136" text-anchor="middle">(i32, bool) — all fields Copy</text>' +
		'<text x="140" y="156" text-anchor="middle" class="lbl">no heap, no exclusivity: safe to duplicate</text>' +
		'<rect x="270" y="44" width="220" height="120" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="380" y="68" text-anchor="middle" style="fill:var(--err-fg)">not Copy — moves</text>' +
		'<text x="380" y="92" text-anchor="middle">String  Vec&lt;T&gt;  Box&lt;T&gt;</text>' +
		'<text x="380" y="114" text-anchor="middle">&amp;mut T (exclusive ref)</text>' +
		'<text x="380" y="136" text-anchor="middle">(i32, String) — one bad field</text>' +
		'<text x="380" y="156" text-anchor="middle" class="lbl">duplicating = double free or two &amp;mut</text>' +
		'</svg>';

	T.problem({
		id: 'copy-or-move',
		title: 'Copy or Move?',
		nav: 'Copy or move',
		difficulty: 'Easy',
		category: 'Ownership',
		task: 'Implement IsCopy — the structural rule deciding whether assignment copies or moves, all 8 tests.',

		prose: [
			'<h2>Copy or Move?</h2>' +
			'<p>The previous lesson said assignment moves — yet this compiles, and both ' +
			'bindings stay usable:</p>',
			{ lang: 'rust', code: 'let a: i32 = 5;\nlet b = a;          // copies — i32 is Copy\nprintln!("{} {}", a, b);   // fine' },
			'<p>Moving exists to prevent two owners freeing one heap allocation. An ' +
			'<code>i32</code> owns no heap — duplicating its four bytes creates two ' +
			'independent values with nothing shared, so Rust marks such types ' +
			'<strong>Copy</strong> and lets assignment duplicate them, exactly like Go. ' +
			'Whether <code>let b = a</code> moves or copies is decided entirely by ' +
			'<code>a</code>’s <em>type</em>:</p>' +
			'<ul>' +
			'<li><strong>Primitives</strong> (<code>i32</code>, <code>f64</code>, ' +
			'<code>bool</code>, <code>char</code>) — Copy.</li>' +
			'<li><strong>Heap owners</strong> (<code>String</code>, <code>Vec&lt;T&gt;</code>, ' +
			'<code>Box&lt;T&gt;</code>) — never Copy: duplicating the pointer bits would ' +
			'mean a double free when both owners drop.</li>' +
			'<li><strong><code>&amp;T</code></strong> (shared reference) — Copy: many ' +
			'read-only aliases are always safe.</li>' +
			'<li><strong><code>&amp;mut T</code></strong> (exclusive reference) — ' +
			'<em>not</em> Copy, even though it is just a pointer: two usable copies would ' +
			'be two simultaneous exclusive borrows, the exact thing the borrow checker ' +
			'exists to forbid.</li>' +
			'<li><strong>Tuples and structs</strong> — Copy if and only if <em>every</em> ' +
			'field is Copy. One <code>String</code> field poisons the whole aggregate.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>IsCopy(t)</code> over the little type tree below — the ' +
			'same structural check <code>#[derive(Copy)]</code> performs when it decides ' +
			'whether to compile.</p>',
			{ code: 'IsCopy(i32)                 → true\nIsCopy(String)              → false\nIsCopy(&String)             → true   // the REF is copied, not the String\nIsCopy(&mut i32)            → false  // exclusivity must not be duplicated\nIsCopy((i32, bool))         → true\nIsCopy((i32, String))       → false  // one field poisons the tuple\nIsCopy(Box<(i32, bool)>)    → false  // Box owns heap no matter what it holds', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Type is a Rust type shape. Kind is one of:',
			'//   "i32", "f64", "bool", "char"   primitives',
			'//   "String", "Vec", "Box"         heap owners (Vec/Box: Elems[0] is the element)',
			'//   "ref", "refmut"                &T / &mut T (Elems[0] is the pointee)',
			'//   "tuple", "struct"              aggregates (Elems are the fields)',
			'type Type struct {',
			'	Kind  string',
			'	Elems []Type',
			'}',
			'',
			'// IsCopy reports whether assignment of this type copies (true) or',
			'// moves (false), per the rules in the statement.',
			'func IsCopy(t Type) bool {',
			'	// your code here',
			'	return false',
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
			'	// Small constructors keep the case table readable.',
			'	prim := func(k string) Type { return Type{Kind: k} }',
			'	wrap := func(k string, e Type) Type { return Type{Kind: k, Elems: []Type{e}} }',
			'	tuple := func(es ...Type) Type { return Type{Kind: "tuple", Elems: es} }',
			'',
			'	type tc struct {',
			'		name string',
			'		t    Type',
			'		want bool',
			'	}',
			'	cases := []tc{',
			'		{"i32 is Copy", prim("i32"), true},',
			'		{"String owns heap: moves", prim("String"), false},',
			'		{"&String: the reference itself is Copy", wrap("ref", prim("String")), true},',
			'		{"&mut i32: exclusivity cannot be duplicated", wrap("refmut", prim("i32")), false},',
			'		{"(i32, bool): all fields Copy", tuple(prim("i32"), prim("bool")), true},',
			'		{"(i32, String): one field poisons the tuple", tuple(prim("i32"), prim("String")), false},',
			'		{"Box<(i32, bool)>: Box owns heap regardless of contents", wrap("Box", tuple(prim("i32"), prim("bool"))), false},',
			'		{"struct{f64, (char, &Vec<i32>)}: Copy all the way down", Type{Kind: "struct", Elems: []Type{prim("f64"), tuple(prim("char"), wrap("ref", wrap("Vec", prim("i32"))))}}, true},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := IsCopy(c.t)',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%v", got)',
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
			'// Type is a Rust type shape. Kind is one of:',
			'//   "i32", "f64", "bool", "char"   primitives',
			'//   "String", "Vec", "Box"         heap owners (Vec/Box: Elems[0] is the element)',
			'//   "ref", "refmut"                &T / &mut T (Elems[0] is the pointee)',
			'//   "tuple", "struct"              aggregates (Elems are the fields)',
			'type Type struct {',
			'	Kind  string',
			'	Elems []Type',
			'}',
			'',
			'// IsCopy reports whether assignment of this type copies (true) or',
			'// moves (false).',
			'//',
			'// The predicate mirrors the type grammar, so the natural shape is',
			'// structural recursion: leaves decide immediately, aggregates ask',
			'// their children. Only tuple/struct recurse — a heap owner is not',
			'// Copy no matter how innocent its element type is, and a shared ref',
			'// is Copy no matter how non-Copy its pointee is (the POINTEE never',
			'// gets duplicated, only the pointer).',
			'func IsCopy(t Type) bool {',
			'	switch t.Kind {',
			'	case "i32", "f64", "bool", "char":',
			'		return true // plain bits: duplication shares nothing',
			'	case "String", "Vec", "Box":',
			'		return false // owns an allocation: duplication = double free',
			'	case "ref":',
			'		return true // many shared aliases are always allowed',
			'	case "refmut":',
			'		return false // a second usable &mut would break exclusivity',
			'	case "tuple", "struct":',
			'		// Copy iff EVERY field is: one counterexample decides,',
			'		// which is exactly why one String field poisons a struct.',
			'		for _, e := range t.Elems {',
			'			if !IsCopy(e) {',
			'				return false',
			'			}',
			'		}',
			'		return true',
			'	}',
			'	return false // unknown kinds default to the safe answer: move',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why &amp;mut is the interesting row</h3>' +
			'<p>Every other row follows from “no double free”: primitives share nothing, ' +
			'heap owners share everything. <code>&amp;mut T</code> is different — copying ' +
			'it frees nothing twice, yet it is still not Copy, because Copy would let two ' +
			'live bindings both claim <em>exclusive</em> access. The Copy rule is really ' +
			'guarding two invariants at once: single ownership of heap data <em>and</em> ' +
			'uniqueness of mutable access. The next problem is entirely about that second ' +
			'invariant.</p>' +
			'<h3>Structural recursion</h3>' +
			'<p>Aggregates delegate to their fields and everything else answers at the ' +
			'leaf — the function is the type grammar with a boolean attached:</p>',
			{ code: 'case "tuple", "struct":\n\tfor _, e := range t.Elems {\n\t\tif !IsCopy(e) {\n\t\t\treturn false\n\t\t}\n\t}\n\treturn true' },
			'<p>Note what does <em>not</em> recurse: <code>Box&lt;T&gt;</code> is non-Copy ' +
			'before looking at <code>T</code>, and <code>&amp;T</code> is Copy before ' +
			'looking at <code>T</code>. Ownership questions are answered at the outermost ' +
			'layer that owns something.</p>' +
			'<h3>In real Rust</h3>' +
			'<p>Copy is opt-in even when the structural check would pass: you write ' +
			'<code>#[derive(Copy, Clone)]</code>, and the compiler verifies every field is ' +
			'Copy — the exact predicate you just wrote. Library authors deliberately ' +
			'withhold the derive when a type is <em>semantically</em> an owner (a file ' +
			'handle wrapping an integer fd, say), because Copy is a public promise you ' +
			'cannot take back without breaking users. Rule of thumb when reading Rust: ' +
			'small plain-data types are Copy and behave like Go values; everything else ' +
			'moves, and a surprise E0382 usually means a type you assumed was plain data ' +
			'owns something after all.</p>',
		],
		complexity: { time: 'O(n) — each node of the type tree visited once', space: 'O(d) recursion depth' },
	});
})();
