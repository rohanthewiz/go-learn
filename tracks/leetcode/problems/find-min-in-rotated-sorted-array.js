/* Find Minimum in Rotated Sorted Array — Binary Search (Medium). Binary search
 * with no target: each probe compares nums[mid] against nums[hi] to decide
 * which ramp of the rotated array it sits on — a structural invariant, not an
 * equality test.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="rotated sorted array drawn as two ascending ramps separated by a cliff">' +
		'<text x="20" y="18" class="lbl">nums = [4, 5, 6, 7, 0, 1, 2] — two ascending ramps, one cliff</text>' +
		// upper ramp: 4 5 6 7
		'<polyline points="40,120 105,105 170,90 235,75" fill="none" stroke="var(--edge)" stroke-width="1.8"/>' +
		// the cliff (dashed drop)
		'<path d="M 235 75 L 265 165" fill="none" stroke="var(--err-edge)" stroke-width="1.5" stroke-dasharray="5 4"/>' +
		// lower ramp: 0 1 2
		'<polyline points="265,165 330,150 395,135" fill="none" stroke="var(--edge)" stroke-width="1.8"/>' +
		// value dots and labels
		'<circle cx="40" cy="120" r="4" fill="var(--edge)"/>' +
		'<circle cx="235" cy="75" r="4" fill="var(--accent)"/>' +
		'<circle cx="265" cy="165" r="5" fill="var(--ok)"/>' +
		'<circle cx="395" cy="135" r="4" fill="var(--accent)"/>' +
		'<text x="40" y="110" text-anchor="middle" class="lbl">4</text>' +
		'<text x="235" y="63" text-anchor="middle" style="fill:var(--accent)">7 = mid</text>' +
		'<text x="265" y="188" text-anchor="middle" style="fill:var(--ok)">0 = min (the cliff base)</text>' +
		'<text x="395" y="123" text-anchor="middle" style="fill:var(--accent)">2 = hi</text>' +
		'<text x="150" y="130" class="lbl">upper ramp (≥ nums[0])</text>' +
		'<text x="300" y="120" class="lbl">lower ramp</text>' +
		// the decision
		'<path d="M 250 40 h 60" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowFMR)"/>' +
		'<text x="20" y="44" style="fill:var(--accent)">nums[mid]=7 &gt; nums[hi]=2</text>' +
		'<text x="330" y="44" class="lbl">→ mid is on the upper ramp; min is right of mid</text>' +
		'<defs><marker id="dgArrowFMR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'find-min-in-rotated-sorted-array',
		title: 'Find Minimum in Rotated Sorted Array',
		nav: 'Min in Rotated Array',
		difficulty: 'Medium',
		category: 'Binary Search',
		task: 'Implement findMin in O(log n) — make all 6 tests pass.',

		prose: [
			'<h2>Find Minimum in Rotated Sorted Array</h2>' +
			'<p>A sorted slice of <em>unique</em> integers has been rotated: some prefix ' +
			'was moved to the end (<code>[1,2,3,4,5]</code> rotated by 3 becomes ' +
			'<code>[4,5,1,2,3]</code>). Given such a slice <code>nums</code> — possibly ' +
			'rotated zero times — return its minimum element.</p>' +
			'<ul><li>All values are distinct.</li>' +
			'<li>Your solution must run in <strong>O(log n)</strong> — a linear scan ' +
			'ignores everything the structure gives you.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'findMin([]int{3, 4, 5, 1, 2})     →  1\nfindMin([]int{4, 5, 6, 7, 0, 1, 2})  →  0\nfindMin([]int{1, 2, 3, 4})        →  1   // rotated zero times', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Plot the values and a rotated array is two ascending ramps with a cliff ' +
			'between them — and the minimum is the first value after the cliff. There is ' +
			'no target to search for, but one comparison still splits the array: is ' +
			'<code>nums[mid]</code> above or below <code>nums[hi]</code>?</p>' +
			DIAGRAM +
			'<p><code>nums[mid] &gt; nums[hi]</code> can only happen when the cliff lies ' +
			'strictly between them — so the minimum is right of <code>mid</code>. ' +
			'Otherwise <code>mid</code> is on the lower ramp and the minimum is at ' +
			'<code>mid</code> or to its left. Either way half the array disappears.</p>',
		],

		starter: [
			'package main',
			'',
			'// findMin returns the minimum element of nums, a slice of unique',
			'// integers that was sorted ascending and then rotated (possibly by',
			'// zero). Required: O(log n) time.',
			'func findMin(nums []int) int {',
			'	// your code here',
			'	return -1 << 31 // sentinel: negatives are legitimate answers, so fail loudly',
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
			'		{[]int{3, 4, 5, 1, 2}, 1},',
			'		{[]int{4, 5, 6, 7, 0, 1, 2}, 0},',
			'		{[]int{1, 2, 3, 4}, 1},       // rotated zero times — the ambiguity trap',
			'		{[]int{2, 1}, 1},             // two elements',
			'		{[]int{-7}, -7},              // single element; negative answers are legal',
			'		{[]int{2, 3, 4, 5, 1}, 1},    // rotation by one — min at the far end',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v", c.nums),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := findMin(append([]int(nil), c.nums...))',
			'			r["pass"] = got == c.want',
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
			'// findMin returns the minimum of a rotated ascending slice of',
			'// unique integers in O(log n).',
			'//',
			'// Loop invariant: nums[lo..hi] always contains the minimum. Each',
			'// probe compares nums[mid] with nums[hi] — the right end, not the',
			'// left — because that comparison is unambiguous:',
			'//',
			'//	nums[mid] > nums[hi]  → ascending order is broken between mid',
			'//	                        and hi, so the cliff (and the min) lies',
			'//	                        strictly right of mid → lo = mid+1.',
			'//	nums[mid] < nums[hi]  → mid..hi is ascending, so nums[mid] is',
			'//	                        the smallest of that stretch; the min is',
			'//	                        mid itself or further left → hi = mid.',
			'//',
			'// Comparing against nums[lo] instead would be ambiguous: in an',
			'// unrotated array nums[mid] > nums[lo] even though the min sits at',
			'// lo — the same comparison result would demand two opposite moves.',
			'// (Equality never arises: values are unique and mid < hi inside',
			'// the loop.)',
			'//',
			'// The asymmetric shrink is deliberate: mid+1 is safe because mid is',
			'// provably NOT the min in that branch, while the other branch keeps',
			'// mid because it still might be. Since mid < hi always, lo and hi',
			'// strictly approach each other — no infinite loop — and they meet',
			'// exactly on the minimum.',
			'func findMin(nums []int) int {',
			'	lo, hi := 0, len(nums)-1',
			'	for lo < hi {',
			'		mid := lo + (hi-lo)/2 // overflow-safe midpoint, rounds down so mid < hi',
			'		if nums[mid] > nums[hi] {',
			'			lo = mid + 1 // cliff is right of mid; mid itself can’t be the min',
			'		} else {',
			'			hi = mid // mid..hi ascending; the min is mid or left of it',
			'		}',
			'	}',
			'	return nums[lo] // lo == hi: the invariant pins the min here',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>One linear scan finds any array’s minimum in O(n) — but it treats the ' +
			'input as random noise. This input is <em>almost sorted</em>: two ascending ' +
			'ramps, one cliff, and the minimum sitting at the cliff’s base. Structure that ' +
			'strong should buy a logarithm.</p>' +
			'<h3>Binary search without a target</h3>' +
			'<p>Classic binary search compares <code>nums[mid]</code> to a target value. ' +
			'Here there is no target — instead each probe asks a structural question, ' +
			'<em>“which ramp is mid on?”</em>, and one comparison against ' +
			'<code>nums[hi]</code> answers it:</p>',
			{ code: 'lo, hi := 0, len(nums)-1\nfor lo < hi {\n\tmid := lo + (hi-lo)/2\n\tif nums[mid] > nums[hi] {\n\t\tlo = mid + 1 // order broken right of mid → cliff (and min) is there\n\t} else {\n\t\thi = mid // mid..hi ascending → min is at mid or left of it\n\t}\n}\nreturn nums[lo]' },
			'<p>The three decisions that make it correct:</p>' +
			'<ul>' +
			'<li><strong>Compare with <code>nums[hi]</code>, not <code>nums[lo]</code>.</strong> ' +
			'Against <code>hi</code> the two outcomes point in opposite, unambiguous ' +
			'directions. Against <code>lo</code> the unrotated case breaks: in ' +
			'<code>[1,2,3,4]</code>, <code>nums[mid] &gt; nums[lo]</code> yet the minimum ' +
			'is at <code>lo</code> — while in <code>[3,4,5,1,2]</code> the same “greater ' +
			'than” means <em>go right</em>. One signal, two required moves: unusable.</li>' +
			'<li><strong>Asymmetric shrink.</strong> <code>lo = mid+1</code> is legal only ' +
			'because that branch <em>proves</em> mid isn’t the minimum; the other branch ' +
			'must keep <code>hi = mid</code> because mid still might be. Pair that with ' +
			'a floor midpoint (<code>mid &lt; hi</code> whenever <code>lo &lt; hi</code>) ' +
			'and the range strictly shrinks — no infinite loop on two elements.</li>' +
			'<li><strong>Loop invariant.</strong> “The min is always inside ' +
			'<code>[lo, hi]</code>” holds at entry and survives both moves, so when ' +
			'<code>lo == hi</code> the answer is forced.</li>' +
			'</ul>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Binary search on a structural invariant</strong> — no target value, ' +
			'just a predicate that cleanly splits the array (“which half is sorted?” / ' +
			'“is the answer left or right of mid?”). Reach for it whenever data is ' +
			'<em>mostly</em> sorted — rotated, bitonic, or sorted-with-one-anomaly — and ' +
			'O(log n) is demanded; the cost of getting it wrong is the classic off-by-one ' +
			'infinite loop, which the mid-rounding + asymmetric-shrink discipline above ' +
			'prevents. <em>Search in Rotated Sorted Array</em> literally starts with this ' +
			'problem (locate the pivot, then search a ramp), and <em>Koko Eating ' +
			'Bananas</em> pushes the idea further: binary search over the <em>answer ' +
			'space</em>, where the “array” being probed is imaginary.</p>',
		],
		complexity: { time: 'O(log n)', space: 'O(1)' },
	});
})();
