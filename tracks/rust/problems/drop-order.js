/* Drop Order — Ownership (Medium). Where Go says "the GC will get to it",
 * Rust specifies the exact moment: owners drop in reverse declaration order
 * at scope end, moved-from bindings drop nothing, shadowed bindings still
 * drop. The learner implements the bookkeeping rustc compiles into every
 * closing brace.
 */
(function () {
	'use strict';
	var T = GoLearnRust;

	// A scope as a stack: declared top to bottom, dropped bottom to top,
	// with one moved-out binding skipped.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="bindings drop in reverse declaration order; moved-from bindings drop nothing">' +
		'<text x="20" y="24" class="lbl">declared downward, dropped upward — a moved-from binding is skipped</text>' +
		'<rect x="60" y="44" width="180" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="150" y="66" text-anchor="middle">let a = String::…</text>' +
		'<rect x="60" y="90" width="180" height="34" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="150" y="112" text-anchor="middle" class="lbl">let b = …  (moved to c)</text>' +
		'<rect x="60" y="136" width="180" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="150" y="158" text-anchor="middle">let c = b</text>' +
		// drop order column
		'<text x="330" y="66" class="lbl" style="fill:var(--ok)">dropped 2nd</text>' +
		'<text x="330" y="112" class="lbl" style="fill:var(--err-fg)">drops nothing — not the owner</text>' +
		'<text x="330" y="158" class="lbl" style="fill:var(--ok)">dropped 1st (last declared)</text>' +
		'<text x="60" y="192" class="lbl">} ← scope end: [c, a]</text>' +
		'</svg>';

	T.problem({
		id: 'drop-order',
		title: 'Drop Order',
		nav: 'drop order',
		difficulty: 'Medium',
		category: 'Ownership',
		task: 'Implement DropOrder — reverse declaration order, skipping moved-from bindings, keeping shadowed ones. All 6 tests.',

		prose: [
			'<h2>Drop Order</h2>' +
			'<p>Go frees memory “eventually” — the GC runs when it runs, and ' +
			'<code>defer</code> exists precisely because finalization needed something ' +
			'deterministic. Rust frees at an exact, specified moment: when a binding that ' +
			'still <em>owns</em> its value goes out of scope, the value’s ' +
			'<code>Drop</code> impl runs (close the file, unlock the mutex, free the ' +
			'buffer). This is RAII — the destructor <em>is</em> the ' +
			'<code>defer</code>, written once in the type instead of at every call ' +
			'site.</p>' +
			'<p>Three rules pin down the order at a closing brace:</p>' +
			'<ul>' +
			'<li><strong>Reverse declaration order</strong> — the last binding declared ' +
			'drops first (later values may borrow earlier ones, so they must die ' +
			'first).</li>' +
			'<li><strong>Moved-from bindings drop nothing</strong> — ownership left; ' +
			'whoever received the value drops it. Passing a value <em>into</em> a ' +
			'function is also a move: the callee drops it, and by scope end there is ' +
			'nothing left here to drop.</li>' +
			'<li><strong>Shadowed bindings still drop</strong> — <code>let x = …; let x ' +
			'= …;</code> makes the first <code>x</code> unnameable, but its value lives ' +
			'(and drops) at scope end, in its normal reverse-declaration slot. Shadowing ' +
			'is a new binding, not an assignment.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>DropOrder(stmts)</code>: replay the statements of one ' +
			'scope and return, in order, the declaration labels whose bindings still own ' +
			'their value when the brace closes. A <code>let</code> with ' +
			'<code>From: ""</code> creates a fresh value; with <code>From: "x"</code> it ' +
			'moves out of the most recent live binding named <code>x</code>. ' +
			'<code>consume</code> moves a binding into a function call.</p>',
			{ code: 'let a; let b; let c            → drops [c a]  after b moved:  let c = b\nlet s; consume(s)              → drops []     the callee dropped it\nlet x; let x                   → drops [x#2 x#1]   both drop, reverse order', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Stmt is one statement of a single Rust scope:',
			'//   {Op: "let", Name: "a", From: ""}    let a = String::from(...)  (fresh value)',
			'//   {Op: "let", Name: "c", From: "b"}   let c = b                  (move out of b)',
			'//   {Op: "consume", Name: "s"}          take(s)                    (move into a call)',
			'type Stmt struct {',
			'	Op   string',
			'	Name string',
			'	From string',
			'}',
			'',
			'// DropOrder returns the labels of the bindings that still own a value',
			'// at scope end, in the order they drop. Label the k-th declaration of',
			'// a name "name#k" (so plain unshadowed names read "a#1").',
			'//',
			'// "Most recent live binding named x" is always the one a move refers',
			'// to — earlier same-named bindings are shadowed and unnameable.',
			'func DropOrder(stmts []Stmt) []string {',
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
			'	let := func(n string) Stmt { return Stmt{Op: "let", Name: n} }',
			'	mv := func(n, from string) Stmt { return Stmt{Op: "let", Name: n, From: from} }',
			'	consume := func(n string) Stmt { return Stmt{Op: "consume", Name: n} }',
			'',
			'	type tc struct {',
			'		name  string',
			'		stmts []Stmt',
			'		want  []string',
			'	}',
			'	cases := []tc{',
			'		{"three lets: reverse declaration order",',
			'			[]Stmt{let("a"), let("b"), let("c")},',
			'			[]string{"c#1", "b#1", "a#1"}},',
			'		{"moved-from binding drops nothing",',
			'			[]Stmt{let("a"), let("b"), mv("c", "b")},',
			'			[]string{"c#1", "a#1"}},',
			'		{"consumed by a call: the callee already dropped it",',
			'			[]Stmt{let("s"), consume("s")},',
			'			[]string{}},',
			'		{"shadowing: both bindings drop, reverse order",',
			'			[]Stmt{let("x"), let("x")},',
			'			[]string{"x#2", "x#1"}},',
			'		{"move then consume the receiver: only the untouched binding drops",',
			'			[]Stmt{let("a"), let("b"), mv("t", "b"), consume("t")},',
			'			[]string{"a#1"}},',
			'		{"move out of a shadowing binding, original still drops",',
			'			[]Stmt{let("x"), let("x"), mv("y", "x")},',
			'			[]string{"y#1", "x#1"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := DropOrder(append([]Stmt(nil), c.stmts...))',
			'			r["pass"] = fmt.Sprintf("%v", got) == fmt.Sprintf("%v", c.want)',
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
			'// Stmt is one statement of a single Rust scope:',
			'//   {Op: "let", Name: "a", From: ""}    let a = String::from(...)  (fresh value)',
			'//   {Op: "let", Name: "c", From: "b"}   let c = b                  (move out of b)',
			'//   {Op: "consume", Name: "s"}          take(s)                    (move into a call)',
			'type Stmt struct {',
			'	Op   string',
			'	Name string',
			'	From string',
			'}',
			'',
			'// binding is one declaration slot: bindings are appended in',
			'// declaration order and NEVER removed — shadowing and moving only',
			'// flip owns. Keeping dead entries in place is what makes the final',
			'// answer a single reverse scan.',
			'type binding struct {',
			'	label string',
			'	name  string',
			'	owns  bool',
			'}',
			'',
			'// DropOrder returns the labels of the bindings that still own a value',
			'// at scope end, in the order they drop.',
			'func DropOrder(stmts []Stmt) []string {',
			'	var scope []binding',
			'	count := map[string]int{} // declarations seen per name, for #k labels',
			'',
			'	// liveIdx finds the binding a NAME currently refers to: the most',
			'	// recent declaration of it. Shadowed entries sit earlier in the',
			'	// slice, so scanning from the end finds the visible one first.',
			'	liveIdx := func(name string) int {',
			'		for i := len(scope) - 1; i >= 0; i-- {',
			'			if scope[i].name == name {',
			'				return i',
			'			}',
			'		}',
			'		return -1',
			'	}',
			'',
			'	for _, st := range stmts {',
			'		switch st.Op {',
			'		case "let":',
			'			if st.From != "" {',
			'				// A move: the source keeps its slot (it still',
			'				// occupies a declaration position) but no longer',
			'				// owns, so scope-end skips it.',
			'				if i := liveIdx(st.From); i >= 0 {',
			'					scope[i].owns = false',
			'				}',
			'			}',
			'			count[st.Name]++',
			'			scope = append(scope, binding{',
			'				label: fmt.Sprintf("%s#%d", st.Name, count[st.Name]),',
			'				name:  st.Name,',
			'				owns:  true,',
			'			})',
			'		case "consume":',
			'			// Moved into the call: the callee drops it there, so',
			'			// this scope owes nothing at the brace.',
			'			if i := liveIdx(st.Name); i >= 0 {',
			'				scope[i].owns = false',
			'			}',
			'		}',
			'	}',
			'',
			'	// The closing brace: walk declarations backwards, dropping every',
			'	// binding that still owns. This one loop IS rules 1–3: reverse',
			'	// order from the direction, moves from the owns flag, shadowing',
			'	// from never having removed anything.',
			'	drops := []string{}',
			'	for i := len(scope) - 1; i >= 0; i-- {',
			'		if scope[i].owns {',
			'			drops = append(drops, scope[i].label)',
			'		}',
			'	}',
			'	return drops',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The scope is an append-only stack</h3>' +
			'<p>The trap in this problem is modeling shadowing or moves as ' +
			'<em>removal</em>. Nothing is ever removed: a shadowed binding is merely ' +
			'unnameable, and a moved-from binding merely owns nothing — both keep their ' +
			'declaration position, because that position decides <em>when</em> they would ' +
			'drop. Once the scope is append-only with an <code>owns</code> flag, the ' +
			'closing brace is a single reverse scan:</p>',
			{ code: 'for i := len(scope) - 1; i >= 0; i-- {\n\tif scope[i].owns {\n\t\tdrops = append(drops, scope[i].label)\n\t}\n}' },
			'<p>Name resolution goes the same direction for the same reason: the most ' +
			'recent declaration of a name is the visible one, so <code>liveIdx</code> ' +
			'scans from the end.</p>' +
			'<h3>Why reverse order is not a convention</h3>' +
			'<p>Later bindings are allowed to borrow earlier ones — <code>let file = …; ' +
			'let reader = BufReader::new(&amp;file);</code>. If <code>file</code> dropped ' +
			'first, <code>reader</code> would spend an instant holding a dangling ' +
			'reference. Reverse order guarantees every borrower dies before what it ' +
			'borrows, which is the same reason Go programmers stack <code>defer</code>s ' +
			'in acquisition order and let them unwind LIFO.</p>' +
			'<h3>Reading Rust with this model</h3>' +
			'<p>This is why Rust needs no <code>defer</code>: a <code>MutexGuard</code> ' +
			'unlocks in its <code>Drop</code>, and the brace decides the moment. It is ' +
			'also why you sometimes see <code>drop(guard)</code> mid-function — an ' +
			'explicit early move into a consuming call, exactly your ' +
			'<code>consume</code> case — to release a lock before slow work. And when a ' +
			'value is returned, it is moved to the caller, so the callee drops nothing: ' +
			'returns, arguments, and braces are all the same two mechanisms, moves and ' +
			'drops, composed.</p>',
		],
		complexity: { time: 'O(n²) worst case — each move scans the scope for its source; fine at scope scale', space: 'O(n) for the scope stack' },
	});
})();
