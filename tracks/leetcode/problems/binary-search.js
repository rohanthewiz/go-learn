/* Binary Search — Binary Search (Easy). The algorithm the category is
 * named after: keep a [lo, hi] window where the target must live, probe
 * the middle, discard the half that can't contain it. Deceptively easy
 * to state, famously easy to get off by one.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// One <g> per iteration: the 6-cell array redrawn with the discarded
	// half shaded and lo/mid/hi carets underneath. Cell centers land at
	// x = 36 + 44*i.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="three iterations of binary search narrowing on 9">' +
		'<text x="16" y="12" class="lbl">nums · target = 9</text>' +
		// --- iteration 1: lo=0 hi=5, mid=2 holds 3 ---
		'<g>' +
		'<rect x="16" y="20" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="60" y="20" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="104" y="20" width="40" height="28" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="148" y="20" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="192" y="20" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="236" y="20" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="36" y="39" text-anchor="middle">-1</text><text x="80" y="39" text-anchor="middle">0</text>' +
		'<text x="124" y="39" text-anchor="middle">3</text><text x="168" y="39" text-anchor="middle">5</text>' +
		'<text x="212" y="39" text-anchor="middle">9</text><text x="256" y="39" text-anchor="middle">12</text>' +
		'<text x="36" y="62" text-anchor="middle" class="lbl">lo</text>' +
		'<text x="124" y="62" text-anchor="middle" style="fill:var(--accent)">mid</text>' +
		'<text x="256" y="62" text-anchor="middle" class="lbl">hi</text>' +
		'<text x="300" y="39" class="lbl">3 &lt; 9 → drop left half</text>' +
		'</g>' +
		// --- iteration 2: lo=3 hi=5, mid=4 holds 9 ---
		'<g>' +
		'<rect x="16" y="86" width="128" height="28" rx="4" fill="var(--edge)" opacity="0.18"/>' +
		'<rect x="16" y="86" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="60" y="86" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="104" y="86" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="148" y="86" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="192" y="86" width="40" height="28" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="236" y="86" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="36" y="105" text-anchor="middle" class="lbl">-1</text><text x="80" y="105" text-anchor="middle" class="lbl">0</text>' +
		'<text x="124" y="105" text-anchor="middle" class="lbl">3</text><text x="168" y="105" text-anchor="middle">5</text>' +
		'<text x="212" y="105" text-anchor="middle">9</text><text x="256" y="105" text-anchor="middle">12</text>' +
		'<text x="168" y="128" text-anchor="middle" class="lbl">lo</text>' +
		'<text x="212" y="128" text-anchor="middle" style="fill:var(--accent)">mid</text>' +
		'<text x="256" y="128" text-anchor="middle" class="lbl">hi</text>' +
		'<text x="300" y="105" class="lbl">nums[4] = 9 ✓</text>' +
		'</g>' +
		// --- found: only index 4 remains live ---
		'<g>' +
		'<rect x="16" y="152" width="172" height="28" rx="4" fill="var(--edge)" opacity="0.18"/>' +
		'<rect x="236" y="152" width="40" height="28" rx="4" fill="var(--edge)" opacity="0.18"/>' +
		'<rect x="16" y="152" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="60" y="152" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="104" y="152" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="148" y="152" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="192" y="152" width="40" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<rect x="236" y="152" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="36" y="171" text-anchor="middle" class="lbl">-1</text><text x="80" y="171" text-anchor="middle" class="lbl">0</text>' +
		'<text x="124" y="171" text-anchor="middle" class="lbl">3</text><text x="168" y="171" text-anchor="middle" class="lbl">5</text>' +
		'<text x="212" y="171" text-anchor="middle" style="fill:var(--ok)">9</text><text x="256" y="171" text-anchor="middle" class="lbl">12</text>' +
		'<text x="212" y="194" text-anchor="middle" class="lbl">index 4</text>' +
		'<text x="300" y="171" style="fill:var(--ok)">return 4</text>' +
		'</g>' +
		'</svg>';

	LC.problem({
		id: 'binary-search',
		title: 'Binary Search',
		nav: 'Binary Search',
		difficulty: 'Easy',
		category: 'Binary Search',
		task: 'Implement search — make all 5 tests pass.',

		prose: [
			'<h2>Binary Search</h2>' +
			'<p>Given a slice of integers <code>nums</code> sorted in ascending order and an ' +
			'integer <code>target</code>, return the index of <code>target</code>, or ' +
			'<code>-1</code> if it is not present.</p>' +
			'<ul><li>All values in <code>nums</code> are unique.</li>' +
			'<li>Your algorithm must run in O(log n) time.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'search([]int{-1, 0, 3, 5, 9, 12}, 9)  →  4\nsearch([]int{-1, 0, 3, 5, 9, 12}, 2)  →  -1', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Sortedness means one comparison tells you which <em>half</em> the target ' +
			'is in. Keep a window <code>[lo, hi]</code> that must contain the target (if ' +
			'present), probe its middle, and throw the wrong half away:</p>' +
			DIAGRAM +
			'<p>The window halves every step — 6 elements need at most 3 probes, a ' +
			'million need 20.</p>',
		],

		starter: [
			'package main',
			'',
			'// search returns the index of target in the ascending-sorted slice',
			'// nums, or -1 if target is not present. Must run in O(log n).',
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
			'		{[]int{-1, 0, 3, 5, 9, 12}, 9, 4},',
			'		{[]int{-1, 0, 3, 5, 9, 12}, 2, -1},',
			'		{[]int{5}, 5, 0},',
			'		{[]int{2, 5}, 5, 1},',
			'		{[]int{}, 7, -1},',
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
			'// search returns the index of target in ascending-sorted nums, or -1.',
			'//',
			'// Loop invariant: if target is in nums at all, it lies inside the',
			'// inclusive window nums[lo..hi]. Each probe either hits, or shrinks',
			'// the window past mid (mid±1, never mid itself — that is what rules',
			'// out infinite loops). The loop runs while lo <= hi because with an',
			'// inclusive hi, lo == hi is a live one-element window that still',
			'// needs checking; lo > hi means the window is empty and the target',
			'// was never there.',
			'func search(nums []int, target int) int {',
			'	lo, hi := 0, len(nums)-1',
			'	for lo <= hi {',
			'		// Written as lo + (hi-lo)/2 rather than (lo+hi)/2: the sum can',
			'		// overflow when both indices are huge, the difference cannot.',
			'		mid := lo + (hi-lo)/2',
			'		switch {',
			'		case nums[mid] == target:',
			'			return mid',
			'		case nums[mid] < target:',
			'			lo = mid + 1 // target, if present, is strictly right of mid',
			'		default:',
			'			hi = mid - 1 // strictly left of mid',
			'		}',
			'	}',
			'	return -1 // window emptied without a hit',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The scan you’re paying not to do</h3>' +
			'<p>A linear scan finds the target in O(n) and never even reads the word ' +
			'“sorted” in the problem statement. That’s the tell: sortedness is ' +
			'<em>information</em>, and the scan throws it away. One comparison against ' +
			'the middle element classifies the target as left-of-middle or ' +
			'right-of-middle — half the slice eliminated for the price of one read.</p>' +
			'<h3>The window and its invariant</h3>' +
			'<p>Everything hangs on one sentence: <em>if the target exists, it is inside ' +
			'<code>nums[lo..hi]</code></em> (inclusive). Every branch of the loop ' +
			'preserves that sentence while making the window strictly smaller:</p>',
			{ code: 'lo, hi := 0, len(nums)-1\nfor lo <= hi { // inclusive window: lo == hi is still one live candidate\n\tmid := lo + (hi-lo)/2 // overflow-safe midpoint\n\tswitch {\n\tcase nums[mid] == target:\n\t\treturn mid\n\tcase nums[mid] < target:\n\t\tlo = mid + 1\n\tdefault:\n\t\thi = mid - 1\n\t}\n}\nreturn -1' },
			'<p>The classic off-by-one traps, and how this shape dodges them:</p>' +
			'<ul>' +
			'<li><strong><code>lo &lt;= hi</code>, not <code>&lt;</code>.</strong> With an ' +
			'inclusive <code>hi</code>, a one-element window has <code>lo == hi</code> — ' +
			'stop at <code>&lt;</code> and <code>[5]</code>/target 5 is never examined.</li>' +
			'<li><strong>Move past mid, never to it.</strong> <code>lo = mid + 1</code> / ' +
			'<code>hi = mid - 1</code> shrink the window even when it’s two elements wide; ' +
			'<code>lo = mid</code> can spin forever.</li>' +
			'<li><strong><code>lo + (hi-lo)/2</code>.</strong> Same value as ' +
			'<code>(lo+hi)/2</code>, but the sum of two large indices can overflow while ' +
			'their difference cannot. Cheap habit, real bug class.</li>' +
			'<li><strong>Empty slice falls out free:</strong> <code>hi</code> starts at ' +
			'−1, the loop never runs, −1 comes back.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(log n)', space: 'O(1)' },
	});
})();
