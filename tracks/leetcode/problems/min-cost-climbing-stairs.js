/* Min Cost Climbing Stairs — Dynamic Programming (Easy). Climbing Stairs
 * with a price tag: the same look-back-two recurrence, but now each step
 * carries a cost and the combiner is min instead of +. Teaches deriving a
 * recurrence from "what do I decide at step i?" and collapsing the table
 * into two rolling variables. Starter returns −1 (costs are non-negative,
 * so −1 can never be a legitimate answer — but 0 can, hence not 0).
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="dp values over cost=[10 15 20] with the winning 15 path">' +
		'<text x="20" y="16" class="lbl">cost = [10 15 20] · dp[i] = cost[i] + min(dp[i+1], dp[i+2]) — cheapest exit from step i</text>' +
		// staircase: three priced steps plus the free top platform
		'<g fill="var(--panel)">' +
		'<rect x="20" y="140" width="90" height="30" rx="3" stroke="var(--edge)"/>' +
		'<rect x="120" y="110" width="90" height="60" rx="3" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="220" y="80" width="90" height="90" rx="3" stroke="var(--edge)"/>' +
		'<rect x="320" y="50" width="150" height="120" rx="3" stroke="var(--ok)" stroke-width="1.6"/>' +
		'</g>' +
		// step costs inside, dp values above
		'<g text-anchor="middle">' +
		'<text x="65" y="160" class="lbl">cost 10</text>' +
		'<text x="165" y="130" class="lbl">cost 15</text>' +
		'<text x="265" y="100" class="lbl">cost 20</text>' +
		'<text x="395" y="115" style="fill:var(--ok)">top (free)</text>' +
		'<text x="65" y="130">dp=25</text>' +
		'<text x="165" y="100" style="fill:var(--accent)">dp=15</text>' +
		'<text x="265" y="70">dp=20</text>' +
		'</g>' +
		// index labels
		'<g text-anchor="middle" class="lbl">' +
		'<text x="65" y="186">0</text><text x="165" y="186">1</text><text x="265" y="186">2</text>' +
		'</g>' +
		// winning path: start on step 1 (free), pay 15, two-step over step 2 to the top
		'<path d="M 175 96 C 230 30 320 26 380 44" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowMCC)"/>' +
		'<text x="285" y="24" text-anchor="middle" style="fill:var(--ok)">start at 1 free, pay 15, jump 2 — done</text>' +
		'<text x="20" y="52" class="lbl">answer = min(dp[0], dp[1])</text>' +
		'<text x="20" y="68" class="lbl">= min(25, 15) = 15</text>' +
		'<defs><marker id="dgArrowMCC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'min-cost-climbing-stairs',
		title: 'Min Cost Climbing Stairs',
		nav: 'Min Cost Stairs',
		difficulty: 'Easy',
		category: 'Dynamic Programming',
		task: 'Implement minCostClimbingStairs — make all 6 tests pass.',

		prose: [
			'<h2>Min Cost Climbing Stairs</h2>' +
			'<p>Each stair step has a price: paying <code>cost[i]</code> lets you <em>leave</em> ' +
			'step i, climbing either 1 or 2 steps up. You may start standing on step 0 or step 1 ' +
			'for free. Return the minimum total cost to reach the top — the platform just ' +
			'<em>past</em> the last step.</p>' +
			'<ul><li><code>len(cost) ≥ 2</code>; costs are non-negative.</li>' +
			'<li>You pay a step’s cost only when you jump <em>off</em> it.</li>' +
			'<li>The top is index <code>len(cost)</code> — one past the end, and free.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'minCostClimbingStairs([]int{10, 15, 20})                          →  15  // start at 1, pay 15, jump 2\nminCostClimbingStairs([]int{1, 100, 1, 1, 1, 100, 1, 1, 100, 1})  →  6   // hop the 100s', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Standing on step i there is exactly one decision: jump 1 or jump 2. Either way ' +
			'you pay <code>cost[i]</code>, so the cheapest exit is ' +
			'<code>dp[i] = cost[i] + min(dp[i+1], dp[i+2])</code>, with dp = 0 past the end:</p>' +
			DIAGRAM +
			'<p>Each dp value looks ahead only two slots — two rolling variables replace ' +
			'the whole table.</p>',
		],

		starter: [
			'package main',
			'',
			'// minCostClimbingStairs returns the minimum total cost to reach the',
			'// platform one past the last step, when paying cost[i] lets you leave',
			'// step i by climbing 1 or 2 steps, and you may start on step 0 or',
			'// step 1 for free. len(cost) >= 2; costs are non-negative.',
			'func minCostClimbingStairs(cost []int) int {',
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
			'		cost []int',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{[]int{10, 15, 20}, 15},                              // classic: start at 1, one paid jump',
			'		{[]int{1, 100, 1, 1, 1, 100, 1, 1, 100, 1}, 6},       // classic: weave around the 100s',
			'		{[]int{5, 10}, 5},                                    // two steps: the cheaper single jump',
			'		{[]int{3, 3, 3, 3}, 6},                               // equal costs: pay for exactly half',
			'		{[]int{0, 2, 2, 1}, 2},                               // zeros mixed in: free launch pad',
			'		{[]int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, 25},          // longer slice: evens vs odds',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("cost=%v", c.cost),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := minCostClimbingStairs(append([]int(nil), c.cost...))',
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
			'// minCostClimbingStairs returns the cheapest total to pass the last step.',
			'//',
			'// Derivation from the decision at step i: leaving i costs cost[i] no',
			'// matter which jump is taken, and afterwards the problem restarts at',
			'// i+1 or i+2 — whichever finishes cheaper. Hence',
			'//',
			'//	dp[i] = cost[i] + min(dp[i+1], dp[i+2])',
			'//',
			'// with dp = 0 beyond the end (standing at or past the top costs',
			'// nothing more). Walking BACKWARDS makes both dependencies already',
			'// computed, and since only two future values are ever read, the whole',
			'// table collapses into a rolling pair — O(1) space. The free choice',
			'// of starting step becomes min(dp[0], dp[1]) at the end.',
			'func minCostClimbingStairs(cost []int) int {',
			'	// dpNext = dp[i+1], dpAfter = dp[i+2] for the i about to be',
			'	// computed. Both seed to 0: from the top (or one past it, for a',
			'	// 2-jump that overshoots) there is nothing left to pay.',
			'	dpNext, dpAfter := 0, 0',
			'	for i := len(cost) - 1; i >= 0; i-- {',
			'		cheaper := dpNext',
			'		if dpAfter < cheaper {',
			'			cheaper = dpAfter // the better of the two landing spots',
			'		}',
			'		// Slide the window: new dp[i] takes dpNext\'s seat.',
			'		dpNext, dpAfter = cost[i]+cheaper, dpNext',
			'	}',
			'	// Loop done: dpNext = dp[0], dpAfter = dp[1]. Starting on 0 or 1',
			'	// is free, so the answer is simply the cheaper launch pad.',
			'	if dpAfter < dpNext {',
			'		return dpAfter',
			'	}',
			'	return dpNext',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Deriving the recurrence from the decision</h3>' +
			'<p>DP recurrences are not guessed — they fall out of asking "standing at step i, ' +
			'what must I decide?" Here the answer is: jump 1 or jump 2, and either way ' +
			'<code>cost[i]</code> is paid on the way out. Everything after the jump is the ' +
			'<em>same problem from a later step</em>, so if <code>dp[i]</code> means "cheapest ' +
			'way to finish from step i", the decision transcribes directly:</p>',
			{ code: 'dp[i] = cost[i] + min(dp[i+1], dp[i+2])   // dp = 0 past the end\nanswer = min(dp[0], dp[1])                // free choice of start' },
			'<p>Naive recursion on this branches twice per step — O(2ⁿ), with the same ' +
			'subproblems recomputed all over the call tree, exactly like Climbing Stairs. ' +
			'Memoization fixes the time; going bottom-up fixes it more cleanly; and then one ' +
			'more observation kills the table itself.</p>' +
			'<h3>Two variables carry the whole table</h3>' +
			'<p><code>dp[i]</code> reads only <code>dp[i+1]</code> and <code>dp[i+2]</code> — a ' +
			'look-back (here look-<em>ahead</em>) of exactly two. So the table collapses into a ' +
			'rolling pair, updated right-to-left:</p>',
			{ code: 'dpNext, dpAfter := 0, 0 // dp[i+1], dp[i+2]\nfor i := len(cost) - 1; i >= 0; i-- {\n\tcheaper := dpNext\n\tif dpAfter < cheaper {\n\t\tcheaper = dpAfter\n\t}\n\tdpNext, dpAfter = cost[i]+cheaper, dpNext // slide the pair\n}\n// dpNext = dp[0], dpAfter = dp[1]' },
			'<ul>' +
			'<li><strong>Zero seeds encode the goal.</strong> dp past the last step is 0 — being ' +
			'at (or over) the top costs nothing. No special case for a final 2-jump that ' +
			'overshoots by one.</li>' +
			'<li><strong>The free start becomes a final min, not a special case.</strong> ' +
			'"Start at 0 or 1" just means both <code>dp[0]</code> and <code>dp[1]</code> are ' +
			'legitimate answers; taking their min at the end keeps the loop uniform.</li>' +
			'<li><strong>Pay-on-exit is why the model works.</strong> Because the price attaches ' +
			'to <em>leaving</em> a step, standing on a step for free (the start, the top) costs ' +
			'nothing — [0, 2, 2, 1] is solved by launching from the free 0 and paying 2 once.</li>' +
			'<li><strong>Tuple assignment keeps the slide atomic</strong> — both new values ' +
			'derive from the old pair, the standard rolling-DP discipline.</li>' +
			'</ul>' +
			'<h3>The pattern</h3>' +
			'<p><strong>1-D DP with O(1) rolling state</strong> — reach for it when the ' +
			'decision at each index depends only on a fixed number of neighboring subproblem ' +
			'answers; the trigger is a statement of the form "from position i you may move to ' +
			'i+1 or i+2 (at some cost)". Cost of the technique: O(n) time, O(1) space once the ' +
			'look-back distance is fixed. This is exactly the <em>Climbing Stairs</em> ' +
			'recurrence with a price attached (sum of ways becomes min of costs), and the same ' +
			'decision-at-each-index framing scales to <em>House Robber</em> (take/skip with a ' +
			'constraint), <em>Decode Ways</em> (transitions can be disallowed), and — with the ' +
			'combiner switched to max-of-running-sum — Kadane’s <em>Maximum Subarray</em>. ' +
			'Whenever a recurrence looks back k slots, the table compresses to k variables.</p>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
