/* Range Copies — Gotchas (Easy). The starter IS the bug: a Raise that
 * mutates the range value variable, compiles cleanly, reads naturally, and
 * changes nothing the caller can see. Purest form of the gotcha — the test
 * table failing on code that "obviously works" is the lesson. Fix is one
 * line: index into the slice instead of writing through the copy.
 */
(function () {
	'use strict';
	var T = GoLearnGoBasics;

	// The range value is a copy in a separate box; writes land there.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 190" width="540" height="190" role="img" aria-label="range copies each element into the loop variable p; p.Y += dy modifies the copy, which is discarded next iteration; the slice is untouched">' +
		'<text x="20" y="24" class="lbl">for _, p := range pts — p is a COPY of the element, remade each lap</text>' +
		'<rect x="40" y="60" width="240" height="50" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="70" y="90" text-anchor="middle" class="lbl">pts</text>' +
		'<line x1="100" y1="60" x2="100" y2="110" stroke="var(--edge)" stroke-width="1.2"/>' +
		'<text x="145" y="90" text-anchor="middle">{1, 1}</text>' +
		'<line x1="190" y1="60" x2="190" y2="110" stroke="var(--edge)" stroke-width="1.2"/>' +
		'<text x="235" y="90" text-anchor="middle">{2, 5}</text>' +
		'<path d="M 145 110 L 145 132 L 356 148" stroke="var(--edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowGBRC)"/>' +
		'<text x="212" y="132" class="lbl">copied each iteration</text>' +
		'<rect x="360" y="128" width="90" height="40" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="405" y="153" text-anchor="middle">p (copy)</text>' +
		'<path d="M 455 138 C 500 118 500 178 455 160" stroke="var(--err-edge)" stroke-width="1.6" fill="none" marker-end="url(#dgArrowGBRCe)"/>' +
		'<text x="470" y="185" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">p.Y += dy lands here, then p is discarded</text>' +
		'<text x="330" y="66" class="lbl" style="fill:var(--ok)">pts[i].Y += dy writes here ✓</text>' +
		'<path d="M 326 62 L 250 66" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowGBRCo)"/>' +
		'<defs>' +
		'<marker id="dgArrowGBRC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowGBRCe" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'<marker id="dgArrowGBRCo" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'range-copies',
		title: 'Range Copies',
		nav: 'range copies',
		difficulty: 'Easy',
		category: 'Gotchas',
		task: 'Fix Raise so it actually mutates the points in the slice. All 4 tests.',

		prose: [
			'<h2>Range Copies</h2>' +
			'<p>This one starts differently: <strong>the code below is already ' +
			'written, and it is wrong.</strong> Run it, watch the tests fail, and ' +
			'figure out why — the function compiles, loops over every point, adds ' +
			'<code>dy</code> to each… and the slice comes back unchanged.</p>',
			{ code: 'func Raise(pts []Point, dy int) {\n\tfor _, p := range pts {\n\t\tp.Y += dy // modifies… what, exactly?\n\t}\n}' },
			'<p>The range value variable is a <strong>copy</strong>. Each iteration, ' +
			'<code>range</code> assigns <code>pts[i]</code> — element by element, like ' +
			'any struct assignment in Go — into <code>p</code>. Writing through ' +
			'<code>p</code> edits that private copy, which the next iteration ' +
			'overwrites and the function exit discards. Nothing ever points back at ' +
			'the slice.</p>' +
			DIAGRAM +
			'<p>Go is relentlessly consistent about this: <em>assignment copies, ' +
			'everywhere</em> — function arguments, struct fields, and the range value ' +
			'variable alike. The reason slices themselves seem to break the rule is ' +
			'that a slice is a small header pointing at a shared array: the ' +
			'<em>header</em> is copied, the elements are not. So ' +
			'<code>pts[i]</code> reaches the real element through the header, while ' +
			'<code>p</code> is a detached copy of one element.</p>' +
			'<h3>Your job</h3>' +
			'<p>Make <code>Raise</code> mutate the caller&rsquo;s points. Range over ' +
			'the <em>index</em> and write through <code>pts[i]</code>.</p>',
		],

		starter: [
			'package main',
			'',
			'// Point is a plain value struct — assignment copies it field by field.',
			'type Point struct {',
			'	X, Y int',
			'}',
			'',
			'// Raise shifts every point up by dy, in place. Or so it claims:',
			'// this compiles, looks idiomatic, and does nothing. Fix it.',
			'func Raise(pts []Point, dy int) {',
			'	for _, p := range pts {',
			'		p.Y += dy',
			'	}',
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
			'	results := make([]map[string]any, 0, 4)',
			'	add := func(name string, pts []Point, dy int, want string) {',
			'		r := map[string]any{"input": name, "want": want}',
			'		runCase(r, func() {',
			'			Raise(pts, dy)',
			'			got := fmt.Sprint(pts)',
			'			r["pass"] = got == want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	add("two points, dy=10", []Point{{1, 1}, {2, 5}}, 10, "[{1 11} {2 15}]")',
			'	add("negative dy", []Point{{0, 7}, {3, 3}, {9, 0}}, -3, "[{0 4} {3 0} {9 -3}]")',
			'	add("single point", []Point{{4, 4}}, 1, "[{4 5}]")',
			'	add("empty slice (no panic, no effect)", []Point{}, 99, "[]")',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// Point is a plain value struct — assignment copies it field by field.',
			'type Point struct {',
			'	X, Y int',
			'}',
			'',
			'// Raise shifts every point up by dy, in place.',
			'//',
			'// Ranging over the index and writing through pts[i] reaches the real',
			'// element via the slice header. The two-variable form materializes a',
			'// copy; the index form is an lvalue into the backing array. (For big',
			'// structs the index form also skips a per-iteration copy — the gotcha',
			'// fix doubles as the performance idiom.)',
			'func Raise(pts []Point, dy int) {',
			'	for i := range pts {',
			'		pts[i].Y += dy',
			'	}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Spotting it in review</h3>' +
			'<p>The tell is a write through the range value variable: ' +
			'<code>p.Field = …</code>, <code>p.Y += …</code>, any mutation of ' +
			'<code>p</code> itself, inside <code>for _, p := range</code>. It always ' +
			'compiles and never works. (Since Go 1.22, tools even lean on this: the ' +
			'value variable being per-iteration makes the useless write easier for ' +
			'vet-style analyzers to flag.) Slices of <em>pointers</em> are the ' +
			'exception that proves the rule — there <code>p</code> is a copy of the ' +
			'pointer, and <code>p.Y += dy</code> follows it to shared data and works. ' +
			'Which is why this bug often appears right after someone refactors ' +
			'<code>[]*Point</code> to <code>[]Point</code>.</p>' +
			'<h3>The same copy, elsewhere</h3>' +
			'<p>Two siblings worth knowing. Map values are not addressable: ' +
			'<code>m[k].Y = 5</code> does not even compile — read the struct out, ' +
			'modify, store back (or keep <code>map[K]*V</code>). And ranging over an ' +
			'<em>array</em> (not a slice) copies the whole array before iteration ' +
			'begins; a slice is three words, an array is its entire contents. The ' +
			'mental model that unifies all of it: every <code>=</code> in Go is a ' +
			'copy, and the only sharing comes from pointers, slice headers, maps and ' +
			'channels — types whose <em>values</em> are references to something ' +
			'else.</p>',
		],
		complexity: { time: 'O(n)', space: 'O(1) — mutation in place' },
	});
})();
