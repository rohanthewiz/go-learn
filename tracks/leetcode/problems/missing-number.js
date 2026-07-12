/* Missing Number — Bit Manipulation (Easy). nums holds n distinct values
 * from [0, n]; find the one that's absent in O(n) time and O(1) space.
 * XOR the full range against the slice: everything present pairs off and
 * cancels, the missing value is the lone survivor. (The Gauss sum works
 * too — the explanation weighs the two.)
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// nums = [3, 0, 1]: fold n plus every index against every value.
	// Each present number appears once as an index (or the seed n) and
	// once as a value — the pairs cancel, index 2 has no partner.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="XOR pairs each index with the equal value; the missing number has no partner and survives">' +
		'<text x="20" y="16" class="lbl">nums = [3, 0, 1] · fold seed n=3 ⊕ every index ⊕ every value</text>' +
		// top row: the full range 0..n (indices plus the seed n)
		'<text x="20" y="40" class="lbl">range 0..n</text>' +
		'<g text-anchor="middle">' +
		'<rect x="110" y="26" width="40" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="160" y="26" width="40" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="210" y="26" width="40" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<rect x="260" y="26" width="40" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="130" y="46">0</text><text x="180" y="46">1</text><text x="230" y="46">2</text><text x="280" y="46">3</text>' +
		'<text x="280" y="70" class="lbl">seed n</text>' +
		'</g>' +
		// bottom row: the values actually present
		'<text x="20" y="126" class="lbl">values</text>' +
		'<g text-anchor="middle">' +
		'<rect x="110" y="112" width="40" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="160" y="112" width="40" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="210" y="112" width="40" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="130" y="132">3</text><text x="180" y="132">0</text><text x="230" y="132">1</text>' +
		'</g>' +
		// pairing arcs (XOR is order-free, so crossings are harmless)
		'<g fill="none" stroke="var(--edge)" stroke-width="1.5">' +
		'<path d="M 130 56 C 140 90 170 90 180 112"/>' +
		'<path d="M 180 56 C 195 90 218 90 228 112"/>' +
		'</g>' +
		'<path d="M 280 56 C 250 100 160 90 133 112" fill="none" stroke="var(--accent)" stroke-width="1.5"/>' +
		'<text x="330" y="96" class="lbl">a ⊕ a = 0 — every pair vanishes</text>' +
		// the survivor
		'<path d="M 244 60 C 300 110 360 140 400 156" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowMN)"/>' +
		'<text x="408" y="162" style="fill:var(--ok)">unpaired → 2</text>' +
		'<text x="20" y="188" style="fill:var(--ok)">res = 3 ⊕ (0⊕3) ⊕ (1⊕0) ⊕ (2⊕1) = 2 — the missing number</text>' +
		'<defs><marker id="dgArrowMN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'missing-number',
		title: 'Missing Number',
		nav: 'Missing Number',
		difficulty: 'Easy',
		category: 'Bit Manipulation',
		task: 'Implement missingNumber — make all 5 tests pass.',

		prose: [
			'<h2>Missing Number</h2>' +
			'<p>Given a slice <code>nums</code> containing <code>n</code> <em>distinct</em> ' +
			'numbers drawn from the range <code>[0, n]</code> (where <code>n = len(nums)</code>), ' +
			'return the one number in that range that is missing.</p>' +
			'<ul><li>The range has n+1 candidates and the slice holds n of them — exactly one ' +
			'is absent (possibly <code>0</code>, possibly <code>n</code> itself).</li>' +
			'<li>Aim for O(n) time and O(1) extra space — no sorting, no set.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'missingNumber([]int{3, 0, 1})  →  2   // range [0,3], 2 absent\nmissingNumber([]int{0, 1})     →  2   // the missing one is n itself\nmissingNumber([]int{1})        →  0', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>XOR every number that <em>should</em> be there (0..n) against every number that ' +
			'<em>is</em> there. Present numbers appear on both sides and cancel ' +
			'(<code>a ⊕ a = 0</code>); the missing one appears only on the &ldquo;should&rdquo; ' +
			'side and survives the fold:</p>' +
			DIAGRAM +
			'<p>One pass, one accumulator — the indices supply 0..n−1 for free, and seeding ' +
			'with n completes the range.</p>',
		],

		starter: [
			'package main',
			'',
			'// missingNumber returns the one value in [0, n] that is absent from',
			'// nums, where n = len(nums) and nums holds n distinct values from',
			'// that range. Target: O(n) time, O(1) extra space.',
			'func missingNumber(nums []int) int {',
			'	// your code here',
			'	return -1',
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
			'		{[]int{3, 0, 1}, 2},',
			'		// The missing value is n itself — catches loops that only cover 0..n-1.',
			'		{[]int{0, 1}, 2},',
			'		{[]int{9, 6, 4, 2, 3, 5, 7, 0, 1}, 8},',
			'		// Single element, missing n: range [0,1] with 0 present.',
			'		{[]int{0}, 1},',
			'		// Single element, missing zero: catches "0 means absent" assumptions.',
			'		{[]int{1}, 0},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.nums),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := missingNumber(append([]int(nil), c.nums...))',
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
			'// missingNumber finds the absent value of [0, n] by XOR-folding the',
			'// full range against the slice contents.',
			'//',
			'// The fold is seeded with n and then absorbs both i and nums[i] at',
			'// every index. Between the seed and the indices, each number in 0..n',
			'// enters the fold exactly once; each PRESENT number enters a second',
			'// time as a value. Present numbers thus appear twice and cancel',
			'// (a ^ a == 0, and XOR\'s commutativity lets the pairs find each',
			'// other regardless of position); the missing number appears once and',
			'// is all that remains.',
			'//',
			'// The Gauss-sum alternative — n*(n+1)/2 minus the slice sum — is the',
			'// same O(n)/O(1), but its running total can exceed the largest input',
			'// value. XOR never grows past the operands\' bit width, so it is the',
			'// habit that generalizes to fixed-width or overflow-sensitive code.',
			'func missingNumber(nums []int) int {',
			'	res := len(nums) // seed with n: the one range member no index supplies',
			'	for i, v := range nums {',
			'		res ^= i ^ v',
			'	}',
			'	return res',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The obvious answers spend something</h3>' +
			'<p>Sort and scan for the gap: O(n log n) time. A <code>map[int]bool</code> of ' +
			'seen values: O(n) extra space. Both work; both pay more than the problem ' +
			'requires. The structure being wasted: we know <em>exactly</em> which numbers ' +
			'should be present — the complete range <code>0..n</code>.</p>' +
			'<h3>Cancel the expected against the actual</h3>' +
			'<p>XOR is a toggle: <code>a ⊕ a = 0</code> (identical bits cancel) and ' +
			'<code>a ⊕ 0 = a</code> (no residue). So fold together the numbers that should be ' +
			'there and the numbers that are — every present number gets toggled on and back ' +
			'off, and only the missing one is left standing. The loop indices already supply ' +
			'<code>0..n−1</code>; seeding the accumulator with <code>n</code> completes the range:</p>',
			{ code: 'res := len(nums) // n: the range member the indices don\'t cover\nfor i, v := range nums {\n\tres ^= i ^ v\n}\nreturn res\n\n// [3, 0, 1]:  3 ^ (0^3) ^ (1^0) ^ (2^1)\n//          =  (3^3) ^ (0^0) ^ (1^1) ^ 2   // reorder: XOR is commutative\n//          =  2' },
			'<p>The arithmetic twin is <strong>Gauss&rsquo;s sum</strong>: the range should ' +
			'total <code>n(n+1)/2</code>, so the missing number is that minus the slice sum. ' +
			'Same complexity, equally valid in an interview. The XOR version&rsquo;s edge is ' +
			'that its accumulator never grows beyond the operands&rsquo; bit width — ' +
			'<code>n(n+1)/2</code> can overflow a fixed-size integer long before n does ' +
			'(a real concern at int32, a theoretical one for Go&rsquo;s 64-bit int), while a ' +
			'XOR fold cannot overflow by construction.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>XOR cancellation — pair everything, the unpaired survives</strong> — ' +
			'reach for it when a problem guarantees that all but one (or two) elements can be ' +
			'matched into identical pairs: duplicates in the input, or, as here, the input ' +
			'matched against an ideal range it should equal. Cost: one pass, one word of ' +
			'state — O(n)/O(1). Single Number is the identical trick with the pairing given ' +
			'directly (every element appears twice except one); here the pairing is ' +
			'manufactured by XORing in the expected range. The follow-up with <em>two</em> ' +
			'missing numbers extends it: the full fold yields <code>x ⊕ y</code>, any set bit ' +
			'of that result is a bit where x and y differ, and partitioning all numbers by ' +
			'that bit splits the problem into two independent single-survivor folds. The same ' +
			'cancellation idea shows up in RAID parity and network checksums, where the ' +
			'&ldquo;missing&rdquo; block is reconstructed by XORing everything that survived.</p>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
