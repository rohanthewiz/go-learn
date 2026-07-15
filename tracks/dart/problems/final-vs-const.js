/* final vs const — Values & Functions (lesson). Go has one `const` (typed
 * compile-time scalars); Dart has two immutability keywords with different
 * machinery: final is a single runtime assignment, const is a compile-time
 * VALUE — deeply immutable and canonicalized, so equal literals are the
 * same object. The learner implements the canonicalization pool.
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	T.lesson({
		id: 'final-vs-const',
		title: 'final vs const',
		nav: 'final vs const',
		category: 'Values & Functions',

		prose: [
			'<h2><code>final</code> vs <code>const</code></h2>' +
			'<p>Go\'s <code>const</code> stops at scalars — you cannot have a constant ' +
			'slice or struct. Dart splits immutability into two keywords, and the ' +
			'difference is <em>when</em> the value exists:</p>' +
			'<ul>' +
			'<li><code>final</code> — assigned once, at <strong>runtime</strong>. The ' +
			'binding is frozen; the object is whatever it is (a final ' +
			'<code>List</code> can still be <code>.add()</code>-ed to).</li>' +
			'<li><code>const</code> — a <strong>compile-time value</strong>. Deeply ' +
			'immutable (mutation throws <code>UnsupportedError</code>), and ' +
			'<em>canonicalized</em>: every mention of an equal const literal is the ' +
			'same object.</li>' +
			'</ul>',
			{ lang: 'dart', code: "identical(const [1, 2], const [1, 2]);  // true  — one canonical object\nidentical(final1, final2);              // false — two runtime allocations\n                                        //         (final1 = [1,2] etc.)\nconst [1, 2].add(3);                    // UnsupportedError at runtime" },
			'<p>Canonicalization is why Flutter code is littered with <code>const ' +
			'Text(\'hi\')</code>: a const widget is allocated once, ever, and the ' +
			'framework can skip rebuilding an identical object. The compiler interns ' +
			'const values exactly like Go interns identical string literals — but for ' +
			'arbitrary object graphs.</p>' +
			'<h3>Your job</h3>' +
			'<p>The program models both keywords as list constructors. ' +
			'<code>finalList</code> (done) allocates fresh every call — that is what ' +
			'"assigned at runtime" means. Implement <code>constList</code>: intern the ' +
			'value in the pool, keyed by its contents, so two <code>const [1,2]</code> ' +
			'mentions return the <em>same pointer</em> and the identity checks print ' +
			'<code>true</code> / <code>false</code> like real Dart.</p>' +
			'<div class="tip">The pool key is the value\'s printed contents — ' +
			'<code>fmt.Sprint(vals)</code> is enough here. The real compiler keys on ' +
			'the full structural value, type included, and does it at compile time so ' +
			'the pool doesn\'t even exist at runtime.</div>',
		],

		task: 'Implement constList: intern in the pool by contents so equal const literals are the identical object.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// pool is the canonicalization table: one entry per distinct const',
			'// VALUE, shared by every literal that spells it.',
			'var pool = map[string]*[]int{}',
			'',
			'// constList models `const [vals...]`.',
			'func constList(vals ...int) *[]int {',
			'	// TODO: look the value up in the pool (key: fmt.Sprint(vals));',
			'	// allocate only on first sight, return the canonical pointer after.',
			'	s := append([]int(nil), vals...)',
			'	return &s',
			'}',
			'',
			'// finalList models `final x = [vals...]` — a single assignment, but a',
			'// RUNTIME one: each evaluation is its own allocation.',
			'func finalList(vals ...int) *[]int {',
			'	s := append([]int(nil), vals...)',
			'	return &s',
			'}',
			'',
			'func main() {',
			'	a, b := constList(1, 2), constList(1, 2)',
			'	fmt.Println("const [1,2] identical:", a == b)',
			'',
			'	c, d := finalList(1, 2), finalList(1, 2)',
			'	fmt.Println("final [1,2] identical:", c == d)',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('const [1,2] identical: true') !== -1 &&
				flat.indexOf('final [1,2] identical: false') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// pool is the canonicalization table: one entry per distinct const',
			'// VALUE, shared by every literal that spells it.',
			'var pool = map[string]*[]int{}',
			'',
			'// constList models `const [vals...]`. Intern-on-first-sight: the first',
			'// literal with these contents allocates, every later equal literal gets',
			'// the same pointer back. Identity now follows from equality — which is',
			'// exactly the property canonicalization exists to create.',
			'func constList(vals ...int) *[]int {',
			'	key := fmt.Sprint(vals)',
			'	if canonical, seen := pool[key]; seen {',
			'		return canonical',
			'	}',
			'	s := append([]int(nil), vals...)',
			'	pool[key] = &s',
			'	return &s',
			'}',
			'',
			'// finalList models `final x = [vals...]` — a single assignment, but a',
			'// RUNTIME one: each evaluation is its own allocation.',
			'func finalList(vals ...int) *[]int {',
			'	s := append([]int(nil), vals...)',
			'	return &s',
			'}',
			'',
			'func main() {',
			'	a, b := constList(1, 2), constList(1, 2)',
			'	fmt.Println("const [1,2] identical:", a == b)',
			'',
			'	c, d := finalList(1, 2), finalList(1, 2)',
			'	fmt.Println("final [1,2] identical:", c == d)',
			'}',
			'',
		].join('\n'),
	});
})();
