/* Single Number — Bit Manipulation (Easy). The track's introduction to
 * bit tricks: every element appears twice except one, find it in O(n)
 * time and O(1) space. XOR's self-cancellation (a^a = 0) plus its
 * identity (a^0 = a) — and the commutativity that lets the pairs find
 * each other no matter how the slice is ordered.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 180" width="500" height="180" role="img" aria-label="XOR cancels the paired values, leaving the single one">' +
		'<text x="20" y="16" class="lbl">nums · fold everything together with ⊕ (XOR)</text>' +
		// value cells
		'<g text-anchor="middle">' +
		'<rect x="60" y="30" width="44" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="82" y="52">4</text>' +
		'<rect x="120" y="30" width="44" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="142" y="52">1</text>' +
		'<rect x="180" y="30" width="44" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="202" y="52">2</text>' +
		'<rect x="240" y="30" width="44" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="262" y="52">1</text>' +
		'<rect x="300" y="30" width="44" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="322" y="52">2</text>' +
		'</g>' +
		// pairing arcs
		'<g fill="none" stroke="var(--accent)" stroke-width="1.5">' +
		'<path d="M 142 68 C 162 100 242 100 262 68"/>' +
		'</g>' +
		'<g fill="none" stroke="var(--edge)" stroke-width="1.5">' +
		'<path d="M 202 68 C 226 110 298 110 322 68"/>' +
		'</g>' +
		'<text x="202" y="98" text-anchor="middle" style="fill:var(--accent)">1 ⊕ 1 = 0</text>' +
		'<text x="262" y="124" text-anchor="middle" class="lbl">2 ⊕ 2 = 0</text>' +
		// survivor
		'<path d="M 82 68 C 82 120 82 138 82 144" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowSN)"/>' +
		'<text x="96" y="156" style="fill:var(--ok)">4 ⊕ 0 ⊕ 0 = 4 — the pairs vanish, the single survives</text>' +
		'<text x="368" y="42" class="lbl">a ⊕ a = 0</text>' +
		'<text x="368" y="60" class="lbl">a ⊕ 0 = a</text>' +
		'<defs><marker id="dgArrowSN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'single-number',
		title: 'Single Number',
		nav: 'Single Number',
		difficulty: 'Easy',
		category: 'Bit Manipulation',
		task: 'Implement singleNumber — make all 5 tests pass.',

		prose: [
			'<h2>Single Number</h2>' +
			'<p>Given a non-empty slice of integers <code>nums</code> in which every element ' +
			'appears exactly <em>twice</em> except for one element that appears once, return ' +
			'that single element.</p>' +
			'<ul><li>Required: O(n) time and — the interesting part — O(1) extra space.</li>' +
			'<li>Values may be negative; the pairs can appear in any order.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'singleNumber([]int{2, 2, 1})        →  1\nsingleNumber([]int{4, 1, 2, 1, 2})  →  4', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>XOR is addition where every value is its own negative: <code>a ⊕ a = 0</code> ' +
			'and <code>a ⊕ 0 = a</code>. Fold the whole slice together with <code>^</code> and ' +
			'every pair annihilates itself — whatever survives is the single number:</p>' +
			DIAGRAM +
			'<p>One pass, one accumulator variable — no map, no sort.</p>',
		],

		starter: [
			'package main',
			'',
			'// singleNumber returns the one element of nums that appears exactly',
			'// once; every other element appears exactly twice.',
			'// Required: O(n) time, O(1) extra space.',
			'func singleNumber(nums []int) int {',
			'	// your code here',
			'	return 0',
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
			LC.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		nums []int',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{[]int{2, 2, 1}, 1},',
			'		{[]int{4, 1, 2, 1, 2}, 4},',
			'		// A single element is already the answer.',
			'		{[]int{7}, 7},',
			'		// Negative numbers XOR just as well (two\'s complement bits).',
			'		{[]int{-1, -1, -2}, -2},',
			'		// Pairs split far apart: order doesn\'t matter to XOR.',
			'		{[]int{10, -5, 3, -5, 10}, 3},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.nums),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := singleNumber(append([]int(nil), c.nums...))',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%d", got)',
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
			'// singleNumber finds the element that appears once (all others appear',
			'// twice) by XOR-folding the whole slice.',
			'//',
			'// Why this works: XOR is commutative and associative, so the fold can',
			'// be mentally reordered to put each pair side by side. Every pair',
			'// then cancels (a ^ a == 0), zeros drop out (a ^ 0 == a), and the',
			'// lone unpaired value is all that remains. Negative numbers need no',
			'// special handling — XOR operates on the raw two\'s-complement bits,',
			'// and identical values have identical bits regardless of sign.',
			'func singleNumber(nums []int) int {',
			'	acc := 0 // XOR identity, so starting the fold at 0 is a no-op',
			'	for _, n := range nums {',
			'		acc ^= n',
			'	}',
			'	return acc',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The obvious answers spend memory</h3>' +
			'<p>A <code>map[int]int</code> of counts solves this in one pass — but that’s O(n) ' +
			'extra space. Sorting first puts pairs side by side and needs no map — but that’s ' +
			'O(n log n) time (and mutates the input). The problem dares you to do better: ' +
			'O(n) time <em>and</em> O(1) space.</p>' +
			'<h3>XOR: every value is its own eraser</h3>' +
			'<p>Two facts about <code>^</code> do all the work. First, <code>a ^ a = 0</code> — ' +
			'identical bit patterns cancel bit-by-bit (each bit is 0⊕0 or 1⊕1, both 0). ' +
			'Second, <code>a ^ 0 = a</code> — zero is the identity, so those cancellations ' +
			'leave no residue behind. Now fold the whole slice:</p>',
			{ code: 'acc := 0\nfor _, n := range nums {\n\tacc ^= n\n}\nreturn acc\n\n// 4 ^ 1 ^ 2 ^ 1 ^ 2\n//   = 4 ^ (1^1) ^ (2^2)   // reorder freely: ^ is commutative + associative\n//   = 4 ^ 0 ^ 0\n//   = 4' },
			'<p>Why the pieces hold up:</p>' +
			'<ul>' +
			'<li><strong>Order is irrelevant.</strong> Commutativity and associativity mean the ' +
			'running fold behaves as if the pairs were adjacent, however scattered they are in ' +
			'the slice — no sorting required.</li>' +
			'<li><strong>Negatives are free.</strong> XOR works on the raw two’s-complement ' +
			'bits; <code>-5 ^ -5</code> is 0 like any other self-pair, so <code>[10, -5, 3, -5, 10]</code> ' +
			'folds to 3.</li>' +
			'<li><strong>The trick is exact, not approximate.</strong> This isn’t a hash or a ' +
			'probabilistic filter — the algebra guarantees the survivor is the unpaired ' +
			'element, always.</li>' +
			'<li><strong>Know its limits.</strong> The cancellation argument needs “everything ' +
			'else appears an <em>even</em> number of times”. The follow-up where elements ' +
			'appear three times needs a different (per-bit counting) trick.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
