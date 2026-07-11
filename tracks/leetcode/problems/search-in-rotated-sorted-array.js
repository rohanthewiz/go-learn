/* Search in Rotated Sorted Array — Binary Search (Medium). Binary search
 * survives the rotation because of one structural fact: cut a rotated
 * array at any index and AT LEAST ONE side of the cut is still sorted.
 * Identify the sorted side, range-check the target against it, discard
 * half — O(log n) with no need to find the pivot first.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// Three rows, like the binary-search diagram: each iteration redraws the
	// 7-cell array with the discarded region shaded and lo/mid/hi carets.
	// Cell centers land at x = 36 + 44*i.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="three iterations of rotated binary search narrowing on 0">' +
		'<text x="16" y="12" class="lbl">nums · target = 0</text>' +
		// --- iteration 1: lo=0 hi=6, mid=3 holds 7; left half 4..7 sorted ---
		'<g>' +
		'<rect x="16" y="20" width="40" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="60" y="20" width="40" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="104" y="20" width="40" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="148" y="20" width="40" height="28" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="192" y="20" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="236" y="20" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="280" y="20" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="36" y="39" text-anchor="middle">4</text><text x="80" y="39" text-anchor="middle">5</text>' +
		'<text x="124" y="39" text-anchor="middle">6</text><text x="168" y="39" text-anchor="middle">7</text>' +
		'<text x="212" y="39" text-anchor="middle">0</text><text x="256" y="39" text-anchor="middle">1</text>' +
		'<text x="300" y="39" text-anchor="middle">2</text>' +
		'<text x="36" y="62" text-anchor="middle" class="lbl">lo</text>' +
		'<text x="168" y="62" text-anchor="middle" style="fill:var(--accent)">mid</text>' +
		'<text x="300" y="62" text-anchor="middle" class="lbl">hi</text>' +
		'<text x="340" y="32" class="lbl">4..7 sorted (green)</text>' +
		'<text x="340" y="48" class="lbl">0 ∉ [4,7] → go right</text>' +
		'</g>' +
		// --- iteration 2: lo=4 hi=6, mid=5 holds 1; left half 0..1 sorted ---
		'<g>' +
		'<rect x="16" y="86" width="172" height="28" rx="4" fill="var(--edge)" opacity="0.18"/>' +
		'<rect x="16" y="86" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="60" y="86" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="104" y="86" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="148" y="86" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="192" y="86" width="40" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="236" y="86" width="40" height="28" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="280" y="86" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="36" y="105" text-anchor="middle" class="lbl">4</text><text x="80" y="105" text-anchor="middle" class="lbl">5</text>' +
		'<text x="124" y="105" text-anchor="middle" class="lbl">6</text><text x="168" y="105" text-anchor="middle" class="lbl">7</text>' +
		'<text x="212" y="105" text-anchor="middle">0</text><text x="256" y="105" text-anchor="middle">1</text>' +
		'<text x="300" y="105" text-anchor="middle">2</text>' +
		'<text x="212" y="128" text-anchor="middle" class="lbl">lo</text>' +
		'<text x="256" y="128" text-anchor="middle" style="fill:var(--accent)">mid</text>' +
		'<text x="300" y="128" text-anchor="middle" class="lbl">hi</text>' +
		'<text x="340" y="98" class="lbl">0..1 sorted (green)</text>' +
		'<text x="340" y="114" class="lbl">0 ∈ [0,1) → go left</text>' +
		'</g>' +
		// --- found: only index 4 remains live ---
		'<g>' +
		'<rect x="16" y="152" width="172" height="28" rx="4" fill="var(--edge)" opacity="0.18"/>' +
		'<rect x="236" y="152" width="84" height="28" rx="4" fill="var(--edge)" opacity="0.18"/>' +
		'<rect x="16" y="152" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="60" y="152" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="104" y="152" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="148" y="152" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="192" y="152" width="40" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<rect x="236" y="152" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="280" y="152" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="36" y="171" text-anchor="middle" class="lbl">4</text><text x="80" y="171" text-anchor="middle" class="lbl">5</text>' +
		'<text x="124" y="171" text-anchor="middle" class="lbl">6</text><text x="168" y="171" text-anchor="middle" class="lbl">7</text>' +
		'<text x="212" y="171" text-anchor="middle" style="fill:var(--ok)">0</text><text x="256" y="171" text-anchor="middle" class="lbl">1</text>' +
		'<text x="300" y="171" text-anchor="middle" class="lbl">2</text>' +
		'<text x="212" y="194" text-anchor="middle" class="lbl">index 4</text>' +
		'<text x="340" y="171" style="fill:var(--ok)">return 4</text>' +
		'</g>' +
		'</svg>';

	LC.problem({
		id: 'search-in-rotated-sorted-array',
		title: 'Search in Rotated Sorted Array',
		nav: 'Rotated Search',
		difficulty: 'Medium',
		category: 'Binary Search',
		task: 'Implement search — make all 6 tests pass.',

		prose: [
			'<h2>Search in Rotated Sorted Array</h2>' +
			'<p>An ascending-sorted slice of <em>distinct</em> integers has been rotated at ' +
			'some unknown pivot (<code>[0,1,2,4,5,6,7]</code> might become ' +
			'<code>[4,5,6,7,0,1,2]</code>). Given the rotated slice <code>nums</code> and a ' +
			'<code>target</code>, return the index of <code>target</code>, or <code>-1</code> ' +
			'if it is not present.</p>' +
			'<ul><li>All values are distinct.</li>' +
			'<li>The rotation may be zero places — a plain sorted slice is valid input.</li>' +
			'<li>Your algorithm must run in O(log n) time.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'search([]int{4, 5, 6, 7, 0, 1, 2}, 0)  →  4\nsearch([]int{4, 5, 6, 7, 0, 1, 2}, 3)  →  -1', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Rotation breaks the “one comparison picks a half” trick — until you notice ' +
			'that cutting a rotated array at <code>mid</code> leaves <em>at least one side ' +
			'still sorted</em> (the pivot can only be in one of them). Compare ' +
			'<code>nums[lo]</code> with <code>nums[mid]</code> to identify the sorted side, ' +
			'then a simple range check on that side tells you where the target can live:</p>' +
			DIAGRAM +
			'<p>Every probe still discards half the window — O(log n), no pivot hunt needed.</p>',
		],

		starter: [
			'package main',
			'',
			'// search returns the index of target in nums — an ascending-sorted',
			'// slice of distinct integers rotated at an unknown pivot — or -1 if',
			'// target is not present. Must run in O(log n).',
			'func search(nums []int, target int) int {',
			'	// your code here',
			'	return -2',
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
			'		nums   []int',
			'		target int',
			'		want   int',
			'	}',
			'	cases := []tc{',
			'		{[]int{4, 5, 6, 7, 0, 1, 2}, 0, 4},',
			'		{[]int{4, 5, 6, 7, 0, 1, 2}, 5, 1},',
			'		{[]int{4, 5, 6, 7, 0, 1, 2}, 3, -1},',
			'		{[]int{1, 2, 3, 4, 5}, 4, 3},',
			'		{[]int{3, 1}, 1, 1},',
			'		{[]int{1}, 1, 0},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v, target=%d", c.nums, c.target),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := search(append([]int(nil), c.nums...), c.target)',
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
			'// search returns the index of target in a rotated ascending-sorted',
			'// slice of distinct values, or -1.',
			'//',
			'// Standard binary search plus one extra decision per probe. The pivot',
			'// (the one place order breaks) lies on exactly one side of mid, so the',
			'// OTHER side is a perfectly ordinary sorted run. Sorted runs are the',
			'// only thing we can range-check, so the branch logic is always:',
			'//',
			'//   1. which side of mid is sorted?   (nums[lo] <= nums[mid] ⇒ left)',
			'//   2. is target inside that sorted side\'s value range?',
			'//      yes → search the sorted side; no → it must be in the other side.',
			'//',
			'// Either way half the window is discarded, preserving O(log n).',
			'func search(nums []int, target int) int {',
			'	lo, hi := 0, len(nums)-1',
			'	for lo <= hi {',
			'		mid := lo + (hi-lo)/2 // overflow-safe midpoint',
			'		if nums[mid] == target {',
			'			return mid',
			'		}',
			'		if nums[lo] <= nums[mid] {',
			'			// Left side nums[lo..mid] is sorted. (<= not <: when lo == mid',
			'			// the one-element run is trivially sorted, and with distinct',
			'			// values equality can ONLY mean lo == mid.)',
			'			if nums[lo] <= target && target < nums[mid] {',
			'				hi = mid - 1 // target sits inside the sorted left run',
			'			} else {',
			'				lo = mid + 1 // not in the sorted run ⇒ must be right of mid',
			'			}',
			'		} else {',
			'			// Pivot is on the left, so the right side nums[mid..hi] is sorted.',
			'			if nums[mid] < target && target <= nums[hi] {',
			'				lo = mid + 1 // target sits inside the sorted right run',
			'			} else {',
			'				hi = mid - 1',
			'			}',
			'		}',
			'	}',
			'	return -1 // window emptied without a hit',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why plain binary search breaks</h3>' +
			'<p>In <code>[4,5,6,7,0,1,2]</code> with target 0, the first probe reads ' +
			'<code>nums[3] = 7</code>. Ordinary binary search says “0 &lt; 7, go left” — ' +
			'and walks away from the answer, because the rotation moved the small values ' +
			'to the <em>right</em>. A linear scan works, of course, but it burns the O(log n) ' +
			'requirement. The O(n)-vs-O(log n) gap is the whole problem.</p>' +
			'<h3>The structural rescue: one side is always sorted</h3>' +
			'<p>A rotated array is two sorted runs glued together, with a single ' +
			'“pivot” where order breaks. Cut anywhere: the pivot falls on one side of the ' +
			'cut, so the other side is an intact sorted run. Sorted is exactly what a range ' +
			'check needs — <code>nums[lo] &lt;= target &lt; nums[mid]</code> is only ' +
			'meaningful over a sorted run. So each iteration asks two questions instead ' +
			'of one:</p>',
			{ code: 'if nums[lo] <= nums[mid] { // left run sorted?\n\tif nums[lo] <= target && target < nums[mid] {\n\t\thi = mid - 1 // target provably inside the sorted left run\n\t} else {\n\t\tlo = mid + 1 // provably NOT there ⇒ only the right remains\n\t}\n} else { // pivot is left of mid ⇒ right run sorted\n\tif nums[mid] < target && target <= nums[hi] {\n\t\tlo = mid + 1\n\t} else {\n\t\thi = mid - 1\n\t}\n}' },
			'<p>Note the logic is a <em>process of elimination</em>: we never reason about ' +
			'the unsorted side directly. We only ever prove the target is (or is not) in ' +
			'the sorted side, and let the other half inherit the leftovers.</p>' +
			'<ul>' +
			'<li><strong><code>nums[lo] &lt;= nums[mid]</code>, not <code>&lt;</code>.</strong> ' +
			'When the window shrinks to one element, <code>lo == mid</code> and the values ' +
			'are equal; a one-element run is sorted. With distinct values, equality cannot ' +
			'mean anything else.</li>' +
			'<li><strong>Half-open range checks.</strong> <code>target &lt; nums[mid]</code> ' +
			'(strict) — <code>nums[mid] == target</code> was already handled, so the ' +
			'endpoints need no second look.</li>' +
			'<li><strong>Zero rotation costs nothing.</strong> A never-rotated slice always ' +
			'takes the “left side sorted” branch and the code degenerates to plain binary ' +
			'search.</li>' +
			'<li><strong>Distinctness matters.</strong> With duplicates ' +
			'(<code>[3,1,3,3,3]</code>), <code>nums[lo] == nums[mid]</code> can no longer ' +
			'identify the sorted side — that harder variant degrades to O(n) worst case.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(log n)', space: 'O(1)' },
	});
})();
