/* Append & Aliasing — Gotchas (Medium). The deepest slice gotcha: append
 * writes into spare capacity IN PLACE, so a function can return the right
 * answer while corrupting memory its caller still sees. The starter is the
 * classic nested-append Insert — it passes every value test and fails the
 * two aliasing tests, which is the whole point: correctness of the return
 * value and safety of the caller's data are separate properties.
 */
(function () {
	'use strict';
	var T = GoLearnGoBasics;

	// Two headers over one array; append writing into the shared tail.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="orig is a 5-element slice; s is orig sliced to length 3 over the same array; appending through s writes into the array cells orig still sees">' +
		'<text x="20" y="24" class="lbl">two headers, ONE array — append(s, …) has room, so it writes in place</text>' +
		'<rect x="120" y="86" width="300" height="40" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<line x1="180" y1="86" x2="180" y2="126" stroke="var(--edge)" stroke-width="1.2"/>' +
		'<line x1="240" y1="86" x2="240" y2="126" stroke="var(--edge)" stroke-width="1.2"/>' +
		'<line x1="300" y1="86" x2="300" y2="126" stroke="var(--edge)" stroke-width="1.2"/>' +
		'<line x1="360" y1="86" x2="360" y2="126" stroke="var(--edge)" stroke-width="1.2"/>' +
		'<text x="150" y="111" text-anchor="middle">1</text>' +
		'<text x="210" y="111" text-anchor="middle">2</text>' +
		'<text x="270" y="111" text-anchor="middle">3</text>' +
		'<text x="330" y="111" text-anchor="middle" style="fill:var(--err-fg)">4→99</text>' +
		'<text x="390" y="111" text-anchor="middle">5</text>' +
		'<path d="M 90 56 L 130 84" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowGBAA)"/>' +
		'<text x="82" y="50" text-anchor="end" class="lbl">orig — len 5, sees every cell</text>' +
		'<path d="M 200 168 L 160 130" stroke="var(--err-edge)" stroke-width="1.6" marker-end="url(#dgArrowGBAAe)"/>' +
		'<text x="206" y="182" class="lbl" style="fill:var(--err-fg)">s := orig[:3] — len 3, cap 5: append(s, 99) lands in cell 4</text>' +
		'<defs>' +
		'<marker id="dgArrowGBAA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowGBAAe" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'append-aliasing',
		title: 'Append & Aliasing',
		nav: 'append & aliasing',
		difficulty: 'Medium',
		category: 'Gotchas',
		task: 'Rewrite Insert so the result is correct AND the caller&rsquo;s slice survives untouched. All 6 tests.',

		prose: [
			'<h2>Append &amp; Aliasing</h2>' +
			'<p>A slice is a three-word header — pointer, length, capacity — over a ' +
			'backing array it usually shares. <code>append</code> checks capacity: no ' +
			'room means allocate a fresh array and copy (safe), but <em>room to ' +
			'spare</em> means <strong>write into the existing array, in place</strong>. ' +
			'Whoever else holds a slice over that array just had their data ' +
			'changed.</p>' +
			DIAGRAM +
			'<p>The starter below is the textbook one-liner for inserting into a ' +
			'slice, and it carries this exact bug:</p>',
			{ code: 'func Insert(s []int, i, v int) []int {\n\treturn append(s[:i], append([]int{v}, s[i:]...)...)\n}' },
			'<p>Run the tests: <strong>the returned values are right</strong> — and ' +
			'the caller&rsquo;s slice is corrupted anyway, because ' +
			'<code>append(s[:i], …)</code> found spare capacity and bulldozed the ' +
			'original elements sitting after position <code>i</code>. Functions like ' +
			'this pass unit tests that only inspect the return value, then corrupt a ' +
			'caller&rsquo;s data in production. The two failing tests here are the ' +
			'tests most codebases forget to write.</p>' +
			'<h3>Your job</h3>' +
			'<p>Rewrite <code>Insert</code> so it allocates its own result: make a ' +
			'slice with room for <code>len(s)+1</code>, copy the pieces in around ' +
			'<code>v</code>. Nothing the caller holds may change, and the returned ' +
			'slice must not alias the input.</p>',
		],

		starter: [
			'package main',
			'',
			'// Insert returns s with v inserted at index i (0 <= i <= len(s)),',
			'// WITHOUT modifying s or anything that shares its backing array.',
			'//',
			'// The classic one-liner below returns the right VALUES — but when s',
			'// has spare capacity, the inner append writes straight into the',
			'// caller\'s array. Watch the aliasing tests fail, then rewrite it.',
			'func Insert(s []int, i, v int) []int {',
			'	return append(s[:i], append([]int{v}, s[i:]...)...)',
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
			'	results := make([]map[string]any, 0, 6)',
			'	add := func(name, want string, body func() string) {',
			'		r := map[string]any{"input": name, "want": want}',
			'		runCase(r, func() {',
			'			got := body()',
			'			r["pass"] = got == want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	add("insert mid: ([1 2 3], i=1, v=99)", "[1 99 2 3]", func() string {',
			'		return fmt.Sprint(Insert([]int{1, 2, 3}, 1, 99))',
			'	})',
			'	add("insert at 0", "[99 1 2]", func() string {',
			'		return fmt.Sprint(Insert([]int{1, 2}, 0, 99))',
			'	})',
			'	add("insert at end (i == len)", "[1 2 99]", func() string {',
			'		return fmt.Sprint(Insert([]int{1, 2}, 2, 99))',
			'	})',
			'	add("empty input", "[99]", func() string {',
			'		return fmt.Sprint(Insert([]int{}, 0, 99))',
			'	})',
			'',
			'	// The aliasing tests: s is a length-3 window over a length-5 array,',
			'	// so a lazy Insert has 2 cells of spare capacity to trample.',
			'	add("caller array survives: s=orig[:3] of [1 2 3 4 5]", "orig=[1 2 3 4 5]", func() string {',
			'		orig := []int{1, 2, 3, 4, 5}',
			'		_ = Insert(orig[:3], 1, 99)',
			'		return fmt.Sprintf("orig=%v", orig)',
			'	})',
			'	add("result is independent: mutating it leaves s alone", "s=[1 2 3]", func() string {',
			'		orig := []int{1, 2, 3, 4, 5}',
			'		s := orig[:3]',
			'		res := Insert(s, 1, 99)',
			'		for j := range res {',
			'			res[j] = -1 // vandalize the result; s must not notice',
			'		}',
			'		return fmt.Sprintf("s=%v", s)',
			'	})',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// Insert returns s with v inserted at index i, without modifying s',
			'// or anything that shares its backing array.',
			'//',
			'// The fix is ownership, not cleverness: allocate the result, so no',
			'// append can ever "helpfully" reuse the caller\'s array. Exact-size',
			'// make means the three appends below can never grow past capacity,',
			'// so they cost three copies and zero further allocations.',
			'func Insert(s []int, i, v int) []int {',
			'	out := make([]int, 0, len(s)+1)',
			'	out = append(out, s[:i]...)',
			'	out = append(out, v)',
			'	out = append(out, s[i:]...)',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Reading the failing starter precisely</h3>' +
			'<p>With <code>s = orig[:3]</code> (len 3, cap 5) and <code>i = 1</code>: ' +
			'the inner <code>append([]int{v}, s[i:]...)</code> safely builds ' +
			'<code>[99 2 3]</code> in a new array — but the outer ' +
			'<code>append(s[:1], 99, 2, 3)</code> sees len 1, cap 5, concludes it has ' +
			'room for 4, and writes <code>99 2 3</code> over the array cells holding ' +
			'<code>2 3 4</code>. <code>orig</code> becomes ' +
			'<code>[1 99 2 3 5]</code>. The return value is a correct-looking window ' +
			'over the wreckage — which is what makes this bug so hard to attribute ' +
			'when it finally surfaces three functions away.</p>' +
			'<h3>The toolbox</h3>' +
			'<p>Three idioms, by intent. <em>Own your result</em>: ' +
			'<code>make</code> + <code>append</code>/<code>copy</code>, as here (or ' +
			'<code>slices.Insert</code> / <code>slices.Clone</code> from the stdlib ' +
			'<code>slices</code> package, which do this for you). <em>Cap the ' +
			'window</em>: the full slice expression <code>s[:i:i]</code> sets capacity ' +
			'equal to length, so a later append <em>must</em> reallocate — the idiom ' +
			'for handing out sub-slices you do not want extended into your tail. ' +
			'<em>Detach on keep</em>: when you slice a small piece out of a huge ' +
			'buffer and store it, clone it — otherwise that little slice pins the ' +
			'entire buffer in memory (the aliasing gotcha&rsquo;s quieter sibling: a ' +
			'memory leak).</p>' +
			'<h3>The rule that generalizes</h3>' +
			'<p>Ask of every slice: <em>who else can see this array?</em> Append into ' +
			'a slice you exclusively own — one you made — and every behavior is ' +
			'yours. Append into a slice you were handed, and spare capacity makes ' +
			'you a writer into someone else&rsquo;s memory. The signature ' +
			'<code>func f(s []T) []T</code> is a contract question, and ' +
			'&ldquo;does f alias its input?&rdquo; belongs in its doc comment.</p>',
		],
		complexity: { time: 'O(n) — three copies over n+1 elements', space: 'O(n) for the owned result' },
	});
})();
