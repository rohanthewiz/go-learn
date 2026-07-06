/* Maximum Subarray — Dynamic Programming (Medium). Kadane's algorithm:
 * one pass, two variables. The all-negative test cases guard the classic
 * "reset the running sum to zero" bug.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 180" width="500" height="180" role="img" aria-label="Kadane scan over the example array">' +
		// winning-window bracket
		'<path d="M 180 45 L 180 38 L 364 38 L 364 45" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="272" y="30" text-anchor="middle" style="fill:var(--ok)">sum 6</text>' +
		// baseline axis
		'<line x1="20" y1="95" x2="480" y2="95" stroke="var(--edge)"/>' +
		// bars: [-2, 1, -3, 4, -1, 2, 1, -5, 4] — window [4,-1,2,1] in ok
		'<g>' +
		'<rect x="30" y="95" width="34" height="20" fill="none" stroke="var(--edge)"/>' +
		'<rect x="80" y="85" width="34" height="10" fill="none" stroke="var(--edge)"/>' +
		'<rect x="130" y="95" width="34" height="30" fill="none" stroke="var(--edge)"/>' +
		'<rect x="180" y="55" width="34" height="40" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="230" y="95" width="34" height="10" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="280" y="75" width="34" height="20" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="330" y="85" width="34" height="10" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="380" y="95" width="34" height="50" fill="none" stroke="var(--edge)"/>' +
		'<rect x="430" y="55" width="34" height="40" fill="none" stroke="var(--edge)"/>' +
		'</g>' +
		// values: above positive bars, below negative bars
		'<text x="47" y="128" text-anchor="middle" class="lbl">-2</text>' +
		'<text x="97" y="80" text-anchor="middle" class="lbl">1</text>' +
		'<text x="147" y="138" text-anchor="middle" class="lbl">-3</text>' +
		'<text x="197" y="50" text-anchor="middle" class="lbl">4</text>' +
		'<text x="247" y="118" text-anchor="middle" class="lbl">-1</text>' +
		'<text x="297" y="70" text-anchor="middle" class="lbl">2</text>' +
		'<text x="347" y="80" text-anchor="middle" class="lbl">1</text>' +
		'<text x="397" y="158" text-anchor="middle" class="lbl">-5</text>' +
		'<text x="447" y="50" text-anchor="middle" class="lbl">4</text>' +
		// reset marker: the running prefix (-2+1-3 = -4) is dropped here
		'<text x="147" y="156" text-anchor="middle" style="fill:var(--accent)">×</text>' +
		'<text x="197" y="168" text-anchor="middle" class="lbl">running sum restarts at 4</text>' +
		'</svg>';

	LC.problem({
		id: 'maximum-subarray',
		title: 'Maximum Subarray',
		nav: 'Maximum Subarray',
		difficulty: 'Medium',
		category: 'Dynamic Programming',
		task: 'Implement maxSubArray — make all 5 tests pass.',

		prose: [
			'<h2>Maximum Subarray</h2>' +
			'<p>Given a slice of integers <code>nums</code>, find the <em>contiguous</em> ' +
			'subarray with the largest sum and return that sum.</p>' +
			'<ul><li>The subarray must contain at least one element.</li>' +
			'<li><code>nums</code> is never empty.</li>' +
			'<li>The answer can be negative (when every element is).</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'maxSubArray([]int{-2, 1, -3, 4, -1, 2, 1, -5, 4})  →  6   // [4, -1, 2, 1]\nmaxSubArray([]int{-2, -1})                         →  -1  // [-1]', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Scan once, keeping a running sum. Whenever the prefix behind you has gone ' +
			'negative, drop it — dead weight can only drag down whatever comes next:</p>' +
			DIAGRAM +
			'<p>One pass, two variables — Kadane’s algorithm.</p>',
		],

		starter: [
			'package main',
			'',
			'// maxSubArray returns the largest sum of any contiguous subarray of',
			'// nums (at least one element). nums is never empty.',
			'func maxSubArray(nums []int) int {',
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
			'		{[]int{-2, 1, -3, 4, -1, 2, 1, -5, 4}, 6},',
			'		{[]int{1}, 1},',
			'		{[]int{5, 4, -1, 7, 8}, 23},',
			'		{[]int{-1}, -1},',
			'		{[]int{-2, -1}, -1},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v", c.nums),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := maxSubArray(append([]int(nil), c.nums...))',
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
			'// maxSubArray returns the largest sum over all contiguous subarrays',
			'// of nums (Kadane\'s algorithm).',
			'//',
			'// The key observation: the best subarray ending at index i either',
			'// extends the best subarray ending at i−1, or starts fresh at',
			'// nums[i]. Extending is only worth it while the running prefix is',
			'// positive — a negative prefix can never help any future subarray,',
			'// it only drags the total down, so the moment it would, we restart.',
			'//',
			'// best is seeded with nums[0], not 0: an empty subarray isn\'t',
			'// allowed, and with all-negative input the answer is the least',
			'// negative element — a zero seed would wrongly beat it.',
			'func maxSubArray(nums []int) int {',
			'	best := nums[0] // best sum seen anywhere so far',
			'	cur := nums[0]  // best sum of a subarray ending right here',
			'	for _, n := range nums[1:] {',
			'		// Extend or start fresh, whichever is larger. Spelled out',
			'		// as an explicit comparison (no max builtin here): cur+n < n',
			'		// exactly when the old prefix cur is negative.',
			'		if cur+n < n {',
			'			cur = n',
			'		} else {',
			'			cur += n',
			'		}',
			'		if cur > best {',
			'			best = cur',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Try every (start, end) pair and sum each window — O(n³), or O(n²) with a ' +
			'running sum per start. Correct, but at n=10⁵ that’s billions of additions. ' +
			'The wasted work: window sums overlap massively, and we keep re-adding the ' +
			'same elements.</p>' +
			'<h3>Think in “best ending here”</h3>' +
			'<p>Define <code>cur</code> as the best sum of a subarray that <em>ends at the ' +
			'current index</em>. That subarray either extends the best one ending just ' +
			'before (<code>cur + n</code>) or starts fresh (<code>n</code>) — and extending ' +
			'only wins while the old prefix is positive. A negative prefix can never help ' +
			'any future subarray, so it gets dropped the instant it turns into dead weight:</p>',
			{ code: 'best := nums[0]\ncur := nums[0]\nfor _, n := range nums[1:] {\n\tif cur+n < n { // old prefix is negative — drop it\n\t\tcur = n\n\t} else {\n\t\tcur += n\n\t}\n\tif cur > best {\n\t\tbest = cur\n\t}\n}' },
			'<p>The subtleties that separate a right Kadane from a nearly-right one:</p>' +
			'<ul>' +
			'<li><strong>Seed with nums[0], not 0.</strong> The popular “reset to zero” variant ' +
			'silently assumes an empty subarray is allowed; on <code>[-2, -1]</code> it answers ' +
			'0 instead of -1. Starting both variables at <code>nums[0]</code> and looping from ' +
			'index 1 handles all-negative inputs for free.</li>' +
			'<li><strong><code>cur+n &lt; n</code> ⟺ <code>cur &lt; 0</code>.</strong> The two ' +
			'phrasings are the same test; the first reads as “extend or restart”, the second ' +
			'as “is the prefix dead weight?”.</li>' +
			'<li><strong>Two variables, two jobs.</strong> <code>cur</code> is local (best ' +
			'ending here), <code>best</code> is global (best anywhere) — the answer window ' +
			'usually ends before the scan does.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
