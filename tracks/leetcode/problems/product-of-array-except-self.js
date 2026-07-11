/* Product of Array Except Self — Arrays & Hashing (Medium). Division is
 * banned (and a zero in the input breaks it anyway), so the trick is to
 * split "everything except me" into "everything to my left" times
 * "everything to my right" — a prefix pass and a suffix pass, with the
 * suffix folded into the output slice so extra space stays O(1).
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="prefix and suffix product passes combining into the answer">' +
		'<text x="20" y="16" class="lbl">nums = [1, 2, 3, 4] · answer[i] = (product left of i) × (product right of i)</text>' +
		// prefix row
		'<text x="20" y="46" class="lbl">prefix →</text>' +
		'<g>' +
		'<rect x="90" y="30" width="44" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="140" y="30" width="44" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="190" y="30" width="44" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="240" y="30" width="44" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="112" y="48" text-anchor="middle">1</text>' +
		'<text x="162" y="48" text-anchor="middle">1</text>' +
		'<text x="212" y="48" text-anchor="middle">2</text>' +
		'<text x="262" y="48" text-anchor="middle">6</text>' +
		'</g>' +
		'<text x="300" y="48" class="lbl">product of everything BEFORE i</text>' +
		// suffix row
		'<text x="20" y="92" class="lbl">← suffix</text>' +
		'<g>' +
		'<rect x="90" y="76" width="44" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="140" y="76" width="44" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="190" y="76" width="44" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="240" y="76" width="44" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="112" y="94" text-anchor="middle">24</text>' +
		'<text x="162" y="94" text-anchor="middle">12</text>' +
		'<text x="212" y="94" text-anchor="middle">4</text>' +
		'<text x="262" y="94" text-anchor="middle">1</text>' +
		'</g>' +
		'<text x="300" y="94" class="lbl">product of everything AFTER i</text>' +
		// multiply arrows into the answer row
		'<g stroke="var(--ok)" stroke-width="1.5" fill="none">' +
		'<line x1="212" y1="60" x2="212" y2="72"/>' +
		'<line x1="212" y1="106" x2="212" y2="130" marker-end="url(#dgArrowPAES)"/>' +
		'</g>' +
		'<text x="228" y="122" class="lbl">2 × 4</text>' +
		// answer row
		'<text x="20" y="156" class="lbl">answer</text>' +
		'<g>' +
		'<rect x="90" y="140" width="44" height="26" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="140" y="140" width="44" height="26" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="190" y="140" width="44" height="26" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="240" y="140" width="44" height="26" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="112" y="158" text-anchor="middle">24</text>' +
		'<text x="162" y="158" text-anchor="middle">12</text>' +
		'<text x="212" y="158" text-anchor="middle">8</text>' +
		'<text x="262" y="158" text-anchor="middle">6</text>' +
		'</g>' +
		'<text x="300" y="158" style="fill:var(--ok)">prefix × suffix, per index</text>' +
		'<text x="90" y="188" class="lbl">both passes write into the same output slice — no extra arrays</text>' +
		'<defs><marker id="dgArrowPAES" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'product-of-array-except-self',
		title: 'Product of Array Except Self',
		nav: 'Product Except Self',
		difficulty: 'Medium',
		category: 'Arrays & Hashing',
		task: 'Implement productExceptSelf — make all 6 tests pass.',

		prose: [
			'<h2>Product of Array Except Self</h2>' +
			'<p>Given a slice of integers <code>nums</code>, return a slice ' +
			'<code>answer</code> where <code>answer[i]</code> is the product of every ' +
			'element of <code>nums</code> <em>except</em> <code>nums[i]</code>.</p>' +
			'<ul><li><strong>Division is not allowed.</strong></li>' +
			'<li>The algorithm must run in O(n) time.</li>' +
			'<li>Zeros and negative numbers may appear.</li>' +
			'<li>For a single element, the product of “everything else” is the empty ' +
			'product: <code>1</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'productExceptSelf([]int{1, 2, 3, 4})      →  []int{24, 12, 8, 6}\nproductExceptSelf([]int{-1, 1, 0, -3, 3})  →  []int{0, 0, 9, 0, 0}', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>“Everything except me” splits cleanly at the element itself: it is ' +
			'(everything to my <em>left</em>) × (everything to my <em>right</em>). Each ' +
			'half is a running product — one left-to-right pass fills in the prefixes, one ' +
			'right-to-left pass multiplies in the suffixes:</p>' +
			DIAGRAM +
			'<p>Two passes, both writing into the answer slice — no division, no extra ' +
			'arrays.</p>',
		],

		starter: [
			'package main',
			'',
			'// productExceptSelf returns a slice where index i holds the product',
			'// of every element of nums except nums[i]. Division is not allowed,',
			'// and the algorithm must run in O(n).',
			'func productExceptSelf(nums []int) []int {',
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
			'	"reflect"',
			')',
			'',
			LC.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		nums []int',
			'		want []int',
			'	}',
			'	cases := []tc{',
			'		{[]int{1, 2, 3, 4}, []int{24, 12, 8, 6}},',
			'		{[]int{-1, 1, 0, -3, 3}, []int{0, 0, 9, 0, 0}},',
			'		{[]int{2, 3}, []int{3, 2}},',
			'		{[]int{-2, -3, 4}, []int{-12, -8, 6}},',
			'		{[]int{5}, []int{1}},',
			'		{[]int{0, 0}, []int{0, 0}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v", c.nums),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := productExceptSelf(append([]int(nil), c.nums...))',
			'			r["pass"] = reflect.DeepEqual(got, c.want)',
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
			'// productExceptSelf returns, for each index, the product of every',
			'// other element — without division, in O(n).',
			'//',
			'// The decomposition: answer[i] = (product of nums[:i]) × (product of',
			'// nums[i+1:]). Both factors are running products, so two sweeps',
			'// suffice — and by writing the prefix products into the output slice',
			'// first, the suffix sweep can multiply into them in place. Only two',
			'// scalar accumulators are needed beyond the output itself.',
			'//',
			'//   pass 1 →   out[i] = nums[0]·…·nums[i-1]   (prefix so far)',
			'//   pass 2 ←   out[i] *= nums[i+1]·…·nums[n-1] (suffix so far)',
			'func productExceptSelf(nums []int) []int {',
			'	n := len(nums)',
			'	out := make([]int, n)',
			'',
			'	// Pass 1 (left → right): out[i] gets the product of everything',
			'	// strictly before i. The first element has nothing to its left,',
			'	// so its prefix is the empty product, 1.',
			'	prefix := 1',
			'	for i := 0; i < n; i++ {',
			'		out[i] = prefix',
			'		prefix *= nums[i]',
			'	}',
			'',
			'	// Pass 2 (right → left): fold in the product of everything',
			'	// strictly after i. Same trick mirrored — update out[i] BEFORE',
			'	// rolling nums[i] into the suffix, so the element itself is',
			'	// never included.',
			'	suffix := 1',
			'	for i := n - 1; i >= 0; i-- {',
			'		out[i] *= suffix',
			'		suffix *= nums[i]',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why not divide?</h3>' +
			'<p>The tempting shortcut — compute the total product once, then ' +
			'<code>total / nums[i]</code> per index — is banned by the problem, and for good ' +
			'reason: one zero in the input and it divides by zero. (Handling “exactly one ' +
			'zero” and “two-plus zeros” as special cases is possible but fiddly.) The naive ' +
			'legal alternative, re-multiplying the other n−1 elements for every index, is ' +
			'O(n²).</p>' +
			'<h3>Split “everything except me” at the element</h3>' +
			'<p>The product of all-but-<code>nums[i]</code> is exactly ' +
			'<code>prefix(i) × suffix(i)</code> — everything left of i times everything ' +
			'right of i. Running products give each side in one sweep, and the output ' +
			'slice can host both:</p>',
			{ code: 'prefix := 1\nfor i := 0; i < n; i++ {\n\tout[i] = prefix   // product of nums[:i]\n\tprefix *= nums[i] // roll i in AFTER writing\n}\nsuffix := 1\nfor i := n - 1; i >= 0; i-- {\n\tout[i] *= suffix  // fold in product of nums[i+1:]\n\tsuffix *= nums[i]\n}' },
			'<p>The load-bearing details:</p>' +
			'<ul>' +
			'<li><strong>Write before you multiply.</strong> In both passes the accumulator ' +
			'is applied to <code>out[i]</code> <em>before</em> <code>nums[i]</code> is rolled ' +
			'into it — that ordering is what keeps the element itself out of its own answer.</li>' +
			'<li><strong>Zeros need no special case.</strong> A zero simply zeroes every ' +
			'prefix/suffix that crosses it: with one zero, only that index (whose two halves ' +
			'avoid it) is non-zero — see <code>[-1,1,0,-3,3] → [0,0,9,0,0]</code>.</li>' +
			'<li><strong>Signs need no special case either.</strong> Negatives ride along in ' +
			'the running products: <code>[-2,-3,4] → [-12,-8,6]</code>.</li>' +
			'<li><strong>Space:</strong> the output slice doesn’t count against the space ' +
			'bound (it <em>is</em> the answer), so the extra space is the two accumulators — O(1).</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(1) extra (output aside)' },
	});
})();
