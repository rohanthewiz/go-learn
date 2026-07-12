/* Ownership & Moves — Ownership (lesson). The single biggest mental-model
 * shift coming from Go: assignment of a non-Copy value MOVES it, and the old
 * binding becomes a compile error. A lesson, not a problem: the "algorithm"
 * is two map writes, and the habit being taught is reading `let t = s` as a
 * transfer of ownership, not a copy.
 */
(function () {
	'use strict';
	var T = GoLearnRust;

	// One heap value, ownership arrow flipping from s to t: the whole model
	// in one picture. Marker id is namespaced (dgArrowRSMV) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-label="let t = s moves the heap value: t now owns it, s is invalid">' +
		'<text x="20" y="24" class="lbl">let t = s; — the String is not copied, its ownership moves</text>' +
		// the one heap value
		'<rect x="200" y="120" width="120" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="260" y="147" text-anchor="middle">"hi" (heap)</text>' +
		// s: dashed, invalidated
		'<rect x="60" y="48" width="80" height="36" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="100" y="71" text-anchor="middle" class="lbl">s</text>' +
		'<path d="M 110 84 L 210 118" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="100" y="104" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">moved out — using s is E0382</text>' +
		// t: solid, the new owner
		'<rect x="380" y="48" width="80" height="36" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="420" y="71" text-anchor="middle">t</text>' +
		'<path d="M 410 84 L 312 118" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowRSMV)"/>' +
		'<text x="420" y="104" text-anchor="middle" class="lbl" style="fill:var(--ok)">sole owner</text>' +
		'<defs><marker id="dgArrowRSMV" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	T.lesson({
		id: 'ownership-moves',
		title: 'Ownership & Moves',
		nav: 'ownership & moves',
		category: 'Ownership',

		prose: [
			'<h2>Ownership &amp; Moves</h2>' +
			'<p>In Go, assignment always copies — a struct is copied field by field, a ' +
			'slice header is copied and both slices stay usable (they just alias the same ' +
			'array). The garbage collector cleans up whenever the last reference dies, so ' +
			'the language never has to care <em>who</em> owns a value.</p>' +
			'<p>Rust has no garbage collector. Instead, every value has exactly ' +
			'<strong>one owner</strong>, and the value is freed at the precise moment its ' +
			'owner goes out of scope. One owner, one free — no GC needed. But that rule ' +
			'has a consequence Go never prepared you for: if assignment copied, a value ' +
			'would have two owners and be freed twice. So for heap-owning types, ' +
			'assignment <strong>moves</strong> ownership instead, and the old binding ' +
			'becomes unusable — at <em>compile time</em>:</p>',
			{ lang: 'rust', code: 'let s = String::from("hi");\nlet t = s;              // ownership of the String MOVES to t\nprintln!("{}", s);      // error[E0382]: borrow of moved value: `s`\nprintln!("{}", t);      // fine: t is the owner now' },
			DIAGRAM +
			'<p>Nothing happens at runtime — a move compiles to the same cheap pointer ' +
			'copy Go would do. The difference is entirely in what the compiler lets you ' +
			'write next: the moved-from binding is dead. Passing a value to a function ' +
			'moves it too, and so does returning one (that is how constructors hand ' +
			'ownership to the caller).</p>' +
			'<h3>Your job</h3>' +
			'<p>The program on the right replays the four lines above through a tiny ' +
			'ownership tracker: <code>owns[name]</code> records which bindings currently ' +
			'own their value. The <code>let</code> and <code>use</code> cases are done; ' +
			'the <code>move</code> case is a TODO — make it transfer ownership so the ' +
			'tracker reports exactly what rustc reports: using <code>s</code> is an ' +
			'error, using <code>t</code> is fine.</p>' +
			'<div class="tip">If you want the old binding to stay usable, you ask for a ' +
			'copy explicitly: <code>let t = s.clone();</code>. Rust makes the expensive ' +
			'operation the loud one — the opposite of accidental.</div>',
		],

		task: 'Complete the move case: ownership transfers from src to dst, so "use s" reports E0382 and "use t" is ok.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// step is one line of the Rust program being replayed:',
			'//   {"let", name, ""}     let name = String::from(...)',
			'//   {"move", dst, src}    let dst = src',
			'//   {"use", name, ""}     println!("{}", name)',
			'type step struct {',
			'	op   string',
			'	name string',
			'	src  string',
			'}',
			'',
			'func main() {',
			'	// The exact program from the lesson text.',
			'	steps := []step{',
			'		{"let", "s", ""},',
			'		{"move", "t", "s"},',
			'		{"use", "s", ""},',
			'		{"use", "t", ""},',
			'	}',
			'',
			'	// owns[name] == true means the binding currently owns its value.',
			'	// This one map IS the mental model: rustc tracks exactly this.',
			'	owns := map[string]bool{}',
			'',
			'	for _, st := range steps {',
			'		switch st.op {',
			'		case "let":',
			'			owns[st.name] = true',
			'			fmt.Printf("let %s\\n", st.name)',
			'		case "move":',
			'			// TODO: the value has ONE owner. Transfer ownership:',
			'			// dst owns it now, src no longer does.',
			'			fmt.Printf("move %s -> %s\\n", st.src, st.name)',
			'		case "use":',
			'			if owns[st.name] {',
			'				fmt.Printf("use %s: ok\\n", st.name)',
			'			} else {',
			'				fmt.Printf("use %s: error[E0382] borrow of moved value\\n", st.name)',
			'			}',
			'		}',
			'	}',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('use s: error[E0382] borrow of moved value') !== -1 &&
				flat.indexOf('use t: ok') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// step is one line of the Rust program being replayed:',
			'//   {"let", name, ""}     let name = String::from(...)',
			'//   {"move", dst, src}    let dst = src',
			'//   {"use", name, ""}     println!("{}", name)',
			'type step struct {',
			'	op   string',
			'	name string',
			'	src  string',
			'}',
			'',
			'func main() {',
			'	// The exact program from the lesson text.',
			'	steps := []step{',
			'		{"let", "s", ""},',
			'		{"move", "t", "s"},',
			'		{"use", "s", ""},',
			'		{"use", "t", ""},',
			'	}',
			'',
			'	// owns[name] == true means the binding currently owns its value.',
			'	// This one map IS the mental model: rustc tracks exactly this.',
			'	owns := map[string]bool{}',
			'',
			'	for _, st := range steps {',
			'		switch st.op {',
			'		case "let":',
			'			owns[st.name] = true',
			'			fmt.Printf("let %s\\n", st.name)',
			'		case "move":',
			'			// Both writes together are the move: exactly one owner',
			'			// before, exactly one owner after. Drop either line and',
			'			// the invariant breaks (zero owners, or a double free).',
			'			owns[st.name] = true',
			'			owns[st.src] = false',
			'			fmt.Printf("move %s -> %s\\n", st.src, st.name)',
			'		case "use":',
			'			if owns[st.name] {',
			'				fmt.Printf("use %s: ok\\n", st.name)',
			'			} else {',
			'				fmt.Printf("use %s: error[E0382] borrow of moved value\\n", st.name)',
			'			}',
			'		}',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
