/* Median of Two Sorted Arrays — Binary Search (Hard). The classic
 * partition-point binary search: instead of merging, search for HOW MANY
 * elements the shorter array contributes to the combined left half.
 * Expected medians are exact in binary floating point (x.0 / x.5), so the
 * harness compares float64 results with == and displays them as %.1f.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="a valid partition of two sorted arrays: every left element is at most every right element">' +
		'<text x="20" y="18" class="lbl">partition both arrays so the left halves together hold ⌈(m+n)/2⌉ = 4 elements</text>' +
		// array a: [1,3 | 8]
		'<text x="30" y="60" class="lbl">a</text>' +
		'<g>' +
		'<rect x="50" y="40" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="98" y="40" width="44" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="152" y="40" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="72" y="60" text-anchor="middle">1</text>' +
		'<text x="120" y="60" text-anchor="middle">3</text>' +
		'<text x="174" y="60" text-anchor="middle">8</text>' +
		'</g>' +
		// array b: [2,4 | 6,10]
		'<text x="30" y="130" class="lbl">b</text>' +
		'<g>' +
		'<rect x="50" y="110" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="98" y="110" width="44" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="152" y="110" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="200" y="110" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="72" y="130" text-anchor="middle">2</text>' +
		'<text x="120" y="130" text-anchor="middle">4</text>' +
		'<text x="174" y="130" text-anchor="middle">6</text>' +
		'<text x="222" y="130" text-anchor="middle">10</text>' +
		'</g>' +
		// the shared partition line (between column 2 and 3)
		'<path d="M 147 30 L 147 150" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 4" fill="none"/>' +
		'<text x="147" y="166" text-anchor="middle" style="fill:var(--accent)">i + j = 4</text>' +
		'<path d="M 200 185 C 180 185 160 178 150 168" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowMTA)"/>' +
		'<text x="206" y="190" class="lbl">slide i until the cross-check holds</text>' +
		// the invariant, spelled out
		'<g>' +
		'<text x="300" y="52" class="lbl">maxLeft = max(3, 4) = 4</text>' +
		'<text x="300" y="76" class="lbl">minRight = min(8, 6) = 6</text>' +
		'<text x="300" y="104" style="fill:var(--ok)">4 ≤ 6 ✓  valid partition</text>' +
		'<text x="300" y="132" style="fill:var(--ok)">odd total → median = 4</text>' +
		'</g>' +
		'<defs><marker id="dgArrowMTA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'median-of-two-sorted-arrays',
		title: 'Median of Two Sorted Arrays',
		nav: 'Median of Two Arrays',
		difficulty: 'Hard',
		category: 'Binary Search',
		task: 'Implement findMedianSortedArrays — make all 6 tests pass.',

		prose: [
			'<h2>Median of Two Sorted Arrays</h2>' +
			'<p>Given two sorted slices <code>a</code> (length m) and <code>b</code> (length n), ' +
			'return the median of the combined sorted data as a <code>float64</code>.</p>' +
			'<ul><li>Required complexity: <code>O(log(min(m,n)))</code> — merging is too slow.</li>' +
			'<li>At least one slice is non-empty; either one may be empty.</li>' +
			'<li>Even total count → the median is the mean of the two middle values.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'findMedianSortedArrays([]int{1, 3}, []int{2})     →  2.0   // merged: 1 2 3\nfindMedianSortedArrays([]int{1, 2}, []int{3, 4})  →  2.5   // merged: 1 2 3 4', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>The median is not really about sorting — it is about a <em>cut</em>: split the ' +
			'combined data into a left half and a right half of the right sizes, where ' +
			'everything on the left ≤ everything on the right. Choosing how many elements the ' +
			'first array contributes (<code>i</code>) forces the second array’s contribution ' +
			'(<code>j = half − i</code>), so there is only ONE number to search for:</p>' +
			DIAGRAM +
			'<p>Binary-search <code>i</code> over the shorter array. The comparison that steers ' +
			'the search is the cross-check <code>aLeft ≤ bRight</code> and ' +
			'<code>bLeft ≤ aRight</code>.</p>',
		],

		starter: [
			'package main',
			'',
			'// findMedianSortedArrays returns the median of the combined data of',
			'// two sorted slices in O(log(min(m,n))) time. Either slice may be',
			'// empty (never both). For an even total, return the mean of the two',
			'// middle values.',
			'func findMedianSortedArrays(a, b []int) float64 {',
			'	// your code here (hint: binary-search how many elements the',
			'	// SHORTER slice contributes to the combined left half)',
			'	return -12345.5 // sentinel: no legitimate median in the tests',
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
			'		a, b []int',
			'		want float64',
			'	}',
			'	// Every expected median is a x.0 or x.5 value — exactly',
			'	// representable in binary floating point, so == is safe here.',
			'	cases := []tc{',
			'		{[]int{1, 3}, []int{2}, 2.0},',
			'		{[]int{1, 2}, []int{3, 4}, 2.5},',
			'		{[]int{}, []int{1}, 1.0},                      // one side empty',
			'		{[]int{1, 2}, []int{10, 20}, 6.0},             // disjoint ranges',
			'		{[]int{2, 2}, []int{2, 2}, 2.0},               // all equal',
			'		{[]int{-5, -3, -1}, []int{-2, 0}, -2.0},       // negatives, odd total',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("a=%v b=%v", c.a, c.b),',
			'			"want":  fmt.Sprintf("%.1f", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := findMedianSortedArrays(append([]int(nil), c.a...), append([]int(nil), c.b...))',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%.1f", got)',
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
			'import "math"',
			'',
			'// findMedianSortedArrays returns the median of the combined data of',
			'// two sorted slices in O(log(min(m,n))) time.',
			'//',
			'// Strategy: binary-search the PARTITION, not the values. Take i',
			'// elements from a and j = half − i from b so the combined left part',
			'// holds exactly ⌈(m+n)/2⌉ elements. The partition is correct when',
			'// every left element ≤ every right element; within each (sorted)',
			'// slice that is free, so only the two cross-checks matter:',
			'//',
			'//	a: a[0..i)   | a[i..m)          aLeft = a[i-1], aRight = a[i]',
			'//	b: b[0..j)   | b[j..n)          bLeft = b[j-1], bRight = b[j]',
			'//	valid  ⇔  aLeft ≤ bRight  &&  bLeft ≤ aRight',
			'//',
			'// The check is monotonic in i (growing i only raises aLeft and',
			'// lowers the room on b’s side), which is exactly what binary search',
			'// needs. Searching the shorter slice caps the work at',
			'// O(log(min(m,n))) and guarantees j is never negative.',
			'func findMedianSortedArrays(a, b []int) float64 {',
			'	if len(a) > len(b) {',
			'		a, b = b, a // always binary-search the shorter slice',
			'	}',
			'	m, n := len(a), len(b)',
			'	half := (m + n + 1) / 2 // left-part size; the +1 parks the extra element on the left for odd totals',
			'',
			'	lo, hi := 0, m // i ranges over 0..m inclusive: taking zero or all of a is legal',
			'	for lo <= hi {',
			'		i := lo + (hi-lo)/2',
			'		j := half - i',
			'',
			'		// The ±∞ trick: when a cut sits at a slice boundary there is',
			'		// no element on that side, so substitute a sentinel that can',
			'		// never win a max (−∞) or a min (+∞). math.MinInt32/MaxInt32',
			'		// are safely outside any test value, and they make the four',
			'		// boundary cases (i==0, i==m, j==0, j==n) fall out of the',
			'		// same comparison instead of needing special-case branches.',
			'		aLeft, aRight := math.MinInt32, math.MaxInt32',
			'		if i > 0 {',
			'			aLeft = a[i-1]',
			'		}',
			'		if i < m {',
			'			aRight = a[i]',
			'		}',
			'		bLeft, bRight := math.MinInt32, math.MaxInt32',
			'		if j > 0 {',
			'			bLeft = b[j-1]',
			'		}',
			'		if j < n {',
			'			bRight = b[j]',
			'		}',
			'',
			'		switch {',
			'		case aLeft <= bRight && bLeft <= aRight:',
			'			// Valid partition. The median is read straight off the cut:',
			'			// odd total → the single middle value is the biggest of the',
			'			// left part; even total → mean of the two values straddling',
			'			// the cut (largest-left and smallest-right).',
			'			if (m+n)%2 == 1 {',
			'				return float64(maxInt(aLeft, bLeft))',
			'			}',
			'			return float64(maxInt(aLeft, bLeft)+minInt(aRight, bRight)) / 2.0',
			'		case aLeft > bRight:',
			'			hi = i - 1 // a contributes too much: its left spills past b’s right',
			'		default:',
			'			lo = i + 1 // a contributes too little: b’s left spills past a’s right',
			'		}',
			'	}',
			'	// Unreachable: a valid partition always exists for sorted input.',
			'	return 0',
			'}',
			'',
			'func maxInt(x, y int) int {',
			'	if x > y {',
			'		return x',
			'	}',
			'	return y',
			'}',
			'',
			'func minInt(x, y int) int {',
			'	if x < y {',
			'		return x',
			'	}',
			'	return y',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Merge the two slices (or just count your way through a virtual merge with two ' +
			'pointers) and read the middle — O(m+n) time. Perfectly fine in practice, but the ' +
			'problem demands O(log(min(m,n))), and that demand is the lesson: a median never ' +
			'needed the merged order, only the <em>cut point</em>.</p>' +
			'<h3>Reframe: search for the cut, not the value</h3>' +
			'<p>A median splits the combined data into a left part of ⌈(m+n)/2⌉ elements and a ' +
			'right part, with every left element ≤ every right element. Decide that ' +
			'<code>a</code> contributes its first <code>i</code> elements; then <code>b</code> ' +
			'must contribute exactly <code>j = half − i</code>. One unknown, a small integer ' +
			'range (0…m) — a textbook binary-search space.</p>' +
			'<h3>The invariant, carefully</h3>' +
			'<p>Within each slice the split is sorted for free, so validity reduces to two ' +
			'cross-comparisons: <code>aLeft ≤ bRight</code> and <code>bLeft ≤ aRight</code>. ' +
			'And the check is monotonic in <code>i</code>: increase <code>i</code> and ' +
			'<code>aLeft</code> grows while <code>bRight</code> shrinks (j drops), so once ' +
			'<code>aLeft &gt; bRight</code> every larger <code>i</code> is also invalid — ' +
			'shrink toward <code>hi = i−1</code>. Symmetrically, <code>bLeft &gt; aRight</code> ' +
			'means <code>a</code> gave too few — grow toward <code>lo = i+1</code>. Each probe ' +
			'discards half the candidate cuts, hence the logarithm.</p>',
			{ code: 'aLeft, aRight := math.MinInt32, math.MaxInt32 // ±∞ sentinels for cuts\nif i > 0 { aLeft = a[i-1] }                    // at a slice boundary —\nif i < m { aRight = a[i] }                     // no branch explosion later\n// ... same for bLeft/bRight with j ...\nif aLeft <= bRight && bLeft <= aRight {        // valid cut found\n\tif (m+n)%2 == 1 {\n\t\treturn float64(maxInt(aLeft, bLeft))   // odd: max of the left part\n\t}\n\treturn float64(maxInt(aLeft, bLeft)+minInt(aRight, bRight)) / 2.0\n}' },
			'<p>The ±∞ sentinels are what keep the code short: when a cut sits at a boundary ' +
			'(taking none or all of a slice) the “missing” neighbor becomes a value that can ' +
			'never win a max or a min, so the empty-side cases — including an entirely empty ' +
			'slice — flow through the same two comparisons. Searching the <em>shorter</em> ' +
			'slice matters twice: it gives the promised bound and it guarantees ' +
			'<code>j = half − i</code> stays within <code>0…n</code>.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Binary search on a partition point</strong> — the search space is not ' +
			'the data but the answer to “how many elements come from A?”. Reach for it when a ' +
			'problem asks for an order statistic or a split of sorted data faster than a merge: ' +
			'the triggers are “sorted” + “k-th / median” + a logarithmic bound in the ' +
			'constraints. Cost: O(log(min(m,n))) time, O(1) space, but the invariant must be ' +
			'monotonic in the partition variable or the search is unsound. It is the same ' +
			'search-a-derived-space move as <em>Koko Eating Bananas</em> (answer space of ' +
			'speeds) and <em>Search a 2D Matrix</em> (virtual flat indices), and the ' +
			'boundary-sentinel discipline echoes the ±∞ guards in ' +
			'<em>Find Minimum in Rotated Sorted Array</em>’s edge handling.</p>',
		],
		complexity: { time: 'O(log(min(m,n)))', space: 'O(1)' },
	});
})();
