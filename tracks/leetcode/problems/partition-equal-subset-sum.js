/* Partition Equal Subset Sum — Dynamic Programming (Medium). Can a
 * multiset split into two equal-sum halves? Reduces to subset-sum for
 * target = total/2, solved with a 1-D boolean dp swept BACKWARDS per
 * element — the 0/1-knapsack loop order, contrasted head-on with Coin
 * Change's forward sweep (unbounded reuse). The harness includes
 * [2,2,3,5], which a forward sweep wrongly accepts by using a 2 twice.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 235" width="500" height="235" role="img" aria-label="backward versus forward sweep of the subset-sum boolean array">' +
		'<text x="20" y="16" class="lbl">nums = [2 2 3 5] · total 12 → target 6 · processing the SECOND 2, dp = reachable sums {0, 2}</text>' +
		// backward sweep row: cells t=0..6, x = 30 + t*62, w=52, h=32, y=42
		'<text x="20" y="38" class="lbl" style="fill:var(--ok)">backward sweep (correct): t = 6 → 2</text>' +
		'<g fill="var(--panel)">' +
		'<rect x="30" y="42" width="52" height="32" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="92" y="42" width="52" height="32" rx="4" stroke="var(--edge)"/>' +
		'<rect x="154" y="42" width="52" height="32" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="216" y="42" width="52" height="32" rx="4" stroke="var(--edge)"/>' +
		'<rect x="278" y="42" width="52" height="32" rx="4" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="340" y="42" width="52" height="32" rx="4" stroke="var(--edge)"/>' +
		'<rect x="402" y="42" width="52" height="32" rx="4" stroke="var(--edge)"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="56" y="63">T</text><text x="118" y="63">·</text><text x="180" y="63">T</text>' +
		'<text x="242" y="63">·</text><text x="304" y="63" style="fill:var(--accent)">T</text>' +
		'<text x="366" y="63">·</text><text x="428" y="63">·</text>' +
		'</g>' +
		'<g text-anchor="middle" class="lbl">' +
		'<text x="56" y="90">0</text><text x="118" y="90">1</text><text x="180" y="90">2</text>' +
		'<text x="242" y="90">3</text><text x="304" y="90">4</text><text x="366" y="90">5</text>' +
		'<text x="428" y="90">6</text>' +
		'</g>' +
		// legit propagation: dp[2] (old) → dp[4]
		'<path d="M 190 38 C 220 20 270 20 296 36" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowPES)"/>' +
		'<text x="243" y="20" class="lbl" style="fill:var(--ok)">dp[4] |= dp[4−2] — dp[2] is still LAST round\'s value ✓</text>' +
		// forward trap row
		'<text x="20" y="130" class="lbl" style="fill:var(--err-edge)">forward sweep (bug): t = 2 → 6 reuses this same 2</text>' +
		'<g fill="var(--panel)">' +
		'<rect x="30" y="138" width="52" height="32" rx="4" stroke="var(--edge)"/>' +
		'<rect x="154" y="138" width="52" height="32" rx="4" stroke="var(--edge)"/>' +
		'<rect x="278" y="138" width="52" height="32" rx="4" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<rect x="402" y="138" width="52" height="32" rx="4" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="56" y="159">T</text><text x="180" y="159">T</text>' +
		'<text x="304" y="159" style="fill:var(--err-edge)">T</text>' +
		'<text x="428" y="159" style="fill:var(--err-edge)">T!</text>' +
		'</g>' +
		'<g text-anchor="middle" class="lbl">' +
		'<text x="56" y="186">0</text><text x="180" y="186">2</text><text x="304" y="186">4</text><text x="428" y="186">6</text>' +
		'</g>' +
		'<g fill="none" stroke="var(--err-edge)" stroke-width="1.5">' +
		'<path d="M 200 134 C 230 116 274 116 294 132" marker-end="url(#dgArrowPESerr)"/>' +
		'<path d="M 324 134 C 354 116 398 116 418 132" marker-end="url(#dgArrowPESerr)"/>' +
		'</g>' +
		'<text x="20" y="215" class="lbl">forward: dp[4] was set THIS round, then feeds dp[6] — the single 2 counted twice.</text>' +
		'<text x="20" y="230" class="lbl">true answer for [2,2,3,5]: no subset sums to 6 → false.</text>' +
		'<defs>' +
		'<marker id="dgArrowPES" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowPESerr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'partition-equal-subset-sum',
		title: 'Partition Equal Subset Sum',
		nav: 'Partition Equal Subset',
		difficulty: 'Medium',
		category: 'Dynamic Programming',
		task: 'Implement canPartition — make all 6 tests pass.',

		prose: [
			'<h2>Partition Equal Subset Sum</h2>' +
			'<p>Given a slice of <em>positive</em> integers <code>nums</code>, return ' +
			'<code>true</code> if it can be split into two subsets with equal sums, ' +
			'<code>false</code> otherwise.</p>' +
			'<ul><li>Every element must land in exactly one of the two subsets.</li>' +
			'<li>Each element is used <strong>once</strong> — this is the 0/1 flavor, ' +
			'unlike Coin Change where a denomination repeats freely.</li>' +
			'<li>An odd total is an instant <code>false</code> — no arithmetic can halve ' +
			'it.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'canPartition([]int{1, 5, 11, 5})  →  true    // {1, 5, 5} and {11}\ncanPartition([]int{1, 2, 3, 5})   →  false   // total 11 is odd\ncanPartition([]int{2, 2, 3, 5})   →  false   // total 12 is even, yet no subset sums to 6', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Two equal halves must each sum to <code>total/2</code> — and once one ' +
			'subset hits that target, the rest is automatically the other half. So the ' +
			'real question is <strong>subset-sum</strong>: can some subset reach ' +
			'<code>target = total/2</code>? Track a boolean array of reachable sums and ' +
			'fold elements in one at a time, sweeping the array <em>backwards</em> so the ' +
			'current element can’t feed on sums it created itself this round:</p>' +
			DIAGRAM +
			'<p>Sweep direction is the whole ballgame here — the diagram’s bottom row is ' +
			'the classic bug, and the test case <code>[2, 2, 3, 5]</code> catches it.</p>',
		],

		starter: [
			'package main',
			'',
			'// canPartition reports whether nums (positive ints) can be split into',
			'// two subsets with equal sums, every element used exactly once.',
			'func canPartition(nums []int) bool {',
			'	// your code here',
			'	return false',
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
			'		want bool',
			'	}',
			'	cases := []tc{',
			'		{[]int{1, 5, 11, 5}, true},     // {1,5,5} vs {11}',
			'		{[]int{1, 2, 3, 5}, false},     // total 11: odd, instant reject',
			'		{[]int{2, 2, 3, 5}, false},     // even total 12 but no subset hits 6 —',
			'		                                // a forward sweep says true (reuses a 2)',
			'		{[]int{2, 2}, true},            // smallest split: one each',
			'		{[]int{3, 3, 3, 3}, true},      // pairs of pairs',
			'		{[]int{1, 2, 5, 2, 1, 5}, true}, // {1,2,5} vs {2,1,5}: target 8',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v", c.nums),',
			'			"want":  fmt.Sprintf("%t", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := canPartition(append([]int(nil), c.nums...))',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%t", got)',
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
			'// canPartition reports whether nums splits into two equal-sum subsets.',
			'//',
			'// Reduction: the halves must each sum to total/2, and finding ONE',
			'// subset that reaches total/2 forces the remainder to be the other',
			'// half. So this is subset-sum with target = total/2 — the 0/1',
			'// knapsack feasibility question.',
			'//',
			'// dp[t] answers "is sum t reachable using each element AT MOST once',
			'// among those folded in so far?". Per element the sweep runs',
			'// BACKWARDS (t from target down to num): dp[t] reads dp[t-num], and',
			'// going high-to-low guarantees dp[t-num] still holds the PREVIOUS',
			'// round\'s value — a sum built without the current element. A forward',
			'// sweep would read a dp[t-num] this same element just set, silently',
			'// spending it twice ([2,2,3,5] would wrongly report true via',
			'// 2+2+2 = 6). Coin Change sweeps forward on purpose for exactly the',
			'// mirror reason: reuse is allowed there.',
			'func canPartition(nums []int) bool {',
			'	total := 0',
			'	for _, n := range nums {',
			'		total += n',
			'	}',
			'	// Odd totals cannot split into two equal integer halves; bailing',
			'	// here also keeps the array size total/2+1 honest below.',
			'	if total%2 != 0 {',
			'		return false',
			'	}',
			'	target := total / 2',
			'',
			'	dp := make([]bool, target+1)',
			'	dp[0] = true // the empty subset sums to 0',
			'	for _, num := range nums {',
			'		// t < num is skipped: this element cannot participate in a',
			'		// sum smaller than itself, and those entries must carry over',
			'		// unchanged (which, in-place, means: leave them alone).',
			'		for t := target; t >= num; t-- {',
			'			if dp[t-num] {',
			'				dp[t] = true',
			'			}',
			'		}',
			'		// Early exit: once the target is reachable, later elements',
			'		// can only be dumped into the other half — done.',
			'		if dp[target] {',
			'			return true',
			'		}',
			'	}',
			'	return dp[target]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Try all 2^n subsets and compare each sum against total/2. The reduction ' +
			'itself is the first insight: “split into two equal halves” sounds like it ' +
			'needs both halves tracked, but fixing one subset determines the other, so ' +
			'the problem collapses to <em>subset-sum</em> — can any subset reach ' +
			'<code>target = total/2</code>? (After the free rejection: an odd total can ' +
			'never split evenly.)</p>' +
			'<h3>Reachable sums as a boolean table</h3>' +
			'<p>The subsets themselves don’t matter, only which <em>sums</em> are ' +
			'achievable — and sums are bounded by target. Keep <code>dp[t]</code> = “some ' +
			'subset of the elements processed so far sums to t”, seed <code>dp[0] = ' +
			'true</code> (empty subset), and fold elements in one at a time: a new element ' +
			'<code>num</code> makes <code>t</code> reachable exactly when <code>t − ' +
			'num</code> was reachable <em>before this element arrived</em>:</p>',
			{ code: 'dp := make([]bool, target+1)\ndp[0] = true\nfor _, num := range nums {\n\tfor t := target; t >= num; t-- { // BACKWARDS — load-bearing\n\t\tif dp[t-num] {\n\t\t\tdp[t] = true\n\t\t}\n\t}\n}\nreturn dp[target]' },
			'<h3>Why backwards? The 0/1 vs unbounded distinction</h3>' +
			'<p>This one loop direction is the single most valuable lesson in the DP ' +
			'section, so slowly: the update <code>dp[t] |= dp[t−num]</code> is only ' +
			'correct if <code>dp[t−num]</code> describes the world <em>before</em> the ' +
			'current element — each element may be used once. Sweeping <code>t</code> ' +
			'high-to-low guarantees that: every <code>dp[t−num]</code> read sits at a ' +
			'<em>lower</em> index than any cell written so far this round, so it still ' +
			'holds last round’s value. Sweeping low-to-high does the opposite — ' +
			'<code>dp[t−num]</code> may have been set moments ago <em>by this very ' +
			'element</em>, and the element gets spent twice. Concretely, on ' +
			'<code>[2, 2, 3, 5]</code> (target 6) a forward sweep marks 2, then 4 ' +
			'(= 2+2, same coin!), then 6 — reporting <code>true</code> where the honest ' +
			'answer is <code>false</code>. Now contrast Coin Change: it sweeps amounts ' +
			'<em>forward</em>, and that is not sloppiness — reading a value the current ' +
			'coin already updated is exactly how “use this coin again” is expressed, and ' +
			'coins there are unbounded. Same recurrence shape, opposite loop order, and ' +
			'the direction alone decides whether the knapsack is 0/1 or unbounded. ' +
			'(The 2-D formulation <code>dp[i][t]</code> with an explicit ' +
			'“first i elements” axis makes this fully explicit; the 1-D array is that ' +
			'table with the i-axis compressed away, and the sweep direction is what keeps ' +
			'row i from contaminating itself.)</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>0/1 knapsack via 1-D DP with reverse iteration</strong> — ' +
			'triggers: “split/choose a subset hitting an exact sum or capacity, each item ' +
			'usable once”. Cost O(n·target) time, O(target) space — pseudo-polynomial, ' +
			'fine for the small sums typical of these problems. <strong>The rule to ' +
			'engrave: each item once → sweep the sum axis backwards; unlimited reuse → ' +
			'sweep forwards.</strong> Coin Change is the forward/unbounded sibling in ' +
			'this track; Target Sum is this exact problem in disguise (assigning +/− ' +
			'signs splits the array into two subsets with a fixed difference, and counting ' +
			'ways swaps the booleans for counts); Last Stone Weight’s optimal variant is ' +
			'“minimize the difference of two halves” — the same dp array, answered by the ' +
			'highest reachable t ≤ total/2.</p>',
		],
		complexity: { time: 'O(n · total/2)', space: 'O(total/2)' },
	});
})();
