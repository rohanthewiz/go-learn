/* Coin Change — Dynamic Programming (Medium). The canonical unbounded-
 * knapsack DP: fewest coins to hit an exact amount, -1 if unreachable.
 * Deliberately includes the greedy-trap case ([1,3,4], amount 6) where
 * biggest-coin-first gives 3 coins but the true optimum is 2 — the reason
 * this needs DP at all. Taught bottom-up over amounts; the explanation
 * frames it as memoized recursion flipped on its head.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="bottom-up coin change table for coins 1,3,4">' +
		'<text x="20" y="16" class="lbl">coins = [1 3 4] · best[a] = fewest coins for amount a</text>' +
		// table cells: x = 30 + a*60, w=48, y=40, h=34  (amounts 0..6, best = 0 1 2 1 1 2 2)
		'<g fill="var(--panel)">' +
		'<rect x="30" y="40" width="48" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="90" y="40" width="48" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="150" y="40" width="48" height="34" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="210" y="40" width="48" height="34" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="270" y="40" width="48" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="330" y="40" width="48" height="34" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="390" y="40" width="48" height="34" rx="4" stroke="var(--accent)" stroke-width="2"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="54" y="62">0</text><text x="114" y="62">1</text><text x="174" y="62">2</text>' +
		'<text x="234" y="62">1</text><text x="294" y="62">1</text><text x="354" y="62">2</text>' +
		'<text x="414" y="62" style="fill:var(--accent)">2</text>' +
		'</g>' +
		// amount labels under cells
		'<g text-anchor="middle" class="lbl">' +
		'<text x="54" y="92">0</text><text x="114" y="92">1</text><text x="174" y="92">2</text>' +
		'<text x="234" y="92">3</text><text x="294" y="92">4</text><text x="354" y="92">5</text>' +
		'<text x="414" y="92">6</text>' +
		'</g>' +
		// arrows into best[6] from best[5] (+1), best[3] (+3), best[2] (+4)
		'<g fill="none" stroke="var(--accent)" stroke-width="1.5">' +
		'<path d="M 360 36 C 375 24 395 24 408 34" marker-end="url(#dgArrowCCH)"/>' +
		'<path d="M 240 36 C 300 6 380 10 410 32" marker-end="url(#dgArrowCCH)"/>' +
		'<path d="M 180 78 C 260 118 380 100 410 80" marker-end="url(#dgArrowCCH)"/>' +
		'</g>' +
		'<text x="384" y="16" class="lbl">+coin 1</text>' +
		'<text x="300" y="30" class="lbl">+coin 3</text>' +
		'<text x="300" y="120" class="lbl">+coin 4</text>' +
		'<text x="30" y="130">best[6] = 1 + min(best[5], best[3], best[2]) = 1 + 1 = 2</text>' +
		'<text x="30" y="158" class="lbl">greedy takes 4 first: 4+1+1 = 3 coins ✗ · DP finds 3+3 = 2 coins ✓</text>' +
		'<defs><marker id="dgArrowCCH" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'coin-change',
		title: 'Coin Change',
		nav: 'Coin Change',
		difficulty: 'Medium',
		category: 'Dynamic Programming',
		task: 'Implement coinChange — make all 5 tests pass.',

		prose: [
			'<h2>Coin Change</h2>' +
			'<p>Given coin denominations <code>coins</code> and a target ' +
			'<code>amount</code>, return the <em>fewest</em> coins needed to make exactly ' +
			'that amount, or <code>-1</code> if it cannot be made.</p>' +
			'<ul><li>Each denomination may be used any number of times (unbounded).</li>' +
			'<li><code>amount = 0</code> needs 0 coins — that is the answer, not -1.</li>' +
			'<li>Greedy (always grab the biggest coin) is <em>wrong</em> for general ' +
			'denominations — see the idea below.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'coinChange([]int{1, 2, 5}, 11)  →  3    // 5 + 5 + 1\ncoinChange([]int{2}, 3)         →  -1   // odd amounts unreachable\ncoinChange([]int{1, 3, 4}, 6)   →  2    // 3 + 3, NOT greedy’s 4+1+1', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>The last coin of an optimal answer for amount <code>a</code> is some coin ' +
			'<code>c</code> — and what remains is an optimal answer for <code>a − c</code>. ' +
			'So build a table from amount 0 upward: each entry is one plus the cheapest ' +
			'reachable smaller entry, trying every coin as “the last one”:</p>' +
			DIAGRAM +
			'<p>By considering <em>every</em> coin as the last, the table can never fall ' +
			'into greedy’s trap of committing to the biggest too early.</p>',
		],

		starter: [
			'package main',
			'',
			'// coinChange returns the fewest coins (denominations in coins, each',
			'// usable any number of times) that sum to exactly amount, or -1 if',
			'// amount cannot be made. Amount 0 needs 0 coins.',
			'func coinChange(coins []int, amount int) int {',
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
			'		coins  []int',
			'		amount int',
			'		want   int',
			'	}',
			'	cases := []tc{',
			'		{[]int{1, 2, 5}, 11, 3},  // 5+5+1',
			'		{[]int{2}, 3, -1},        // impossible: parity',
			'		{[]int{1}, 0, 0},         // zero amount needs zero coins',
			'		{[]int{1, 3, 4}, 6, 2},   // greedy trap: 3+3 beats 4+1+1',
			'		{[]int{5}, 5, 1},         // exact single coin',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("coins=%v, amount=%d", c.coins, c.amount),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := coinChange(append([]int(nil), c.coins...), c.amount)',
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
			'// coinChange returns the fewest coins summing to amount, or -1.',
			'//',
			'// Optimal substructure: if an optimal answer for amount a ends in',
			'// coin c, the rest is an optimal answer for a−c (were it not, we',
			'// could swap in a better one and improve a — contradiction). So:',
			'//',
			'//	best[a] = 1 + min over coins c ≤ a of best[a−c]',
			'//',
			'// Filling the table from 0 upward guarantees every best[a−c] is',
			'// final before best[a] reads it — the bottom-up mirror of memoized',
			'// recursion. Runs in O(amount × len(coins)).',
			'func coinChange(coins []int, amount int) int {',
			'	// Sentinel for "unreachable": amount+1 works because no real',
			'	// answer can use more than `amount` coins (the smallest possible',
			'	// coin is 1). Using a huge constant instead would risk overflow',
			'	// on the +1 below; this stays comfortably in range and makes the',
			'	// final unreachability test a simple comparison.',
			'	unreachable := amount + 1',
			'',
			'	best := make([]int, amount+1)',
			'	best[0] = 0 // base case: zero coins make zero (why amount 0 → 0)',
			'	for a := 1; a <= amount; a++ {',
			'		best[a] = unreachable',
			'		for _, c := range coins {',
			'			// Coin fits and the remainder is reachable with a better',
			'			// total than anything found so far → take c as the last',
			'			// coin. Trying EVERY coin here is what defeats greedy:',
			'			// no denomination gets preferential treatment.',
			'			if c <= a && best[a-c]+1 < best[a] {',
			'				best[a] = best[a-c] + 1',
			'			}',
			'		}',
			'	}',
			'',
			'	if best[amount] >= unreachable {',
			'		return -1 // no combination of coins reaches amount exactly',
			'	}',
			'	return best[amount]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why greedy fails</h3>' +
			'<p>With coins <code>[1, 3, 4]</code> and amount 6, biggest-first grabs a 4, ' +
			'leaving 2 to be covered by 1+1 — three coins. The optimum is <code>3+3</code>, ' +
			'two coins. Greedy works for “canonical” systems like US currency, but nothing ' +
			'guarantees it in general: committing to the biggest coin can strand the ' +
			'remainder in expensive territory. The fix is to consider <em>every</em> coin ' +
			'as a candidate last coin — which is exactly what the recurrence does.</p>' +
			'<h3>Top-down first: memoized recursion</h3>' +
			'<p>Define <code>best(a)</code> = fewest coins for amount a. Then ' +
			'<code>best(a) = 1 + min(best(a−c))</code> over coins that fit, with ' +
			'<code>best(0) = 0</code>. Naively this recursion tree is exponential ' +
			'(branching by len(coins) at every level), but there are only ' +
			'<code>amount+1</code> distinct arguments — memoize and each is computed once. ' +
			'That already solves the problem.</p>' +
			'<h3>Bottom-up: same table, no recursion</h3>' +
			'<p>Instead of recursing down and caching on the way back, fill the same table ' +
			'in increasing order of amount — every value the current entry needs ' +
			'(<code>best[a−c]</code>, all smaller) is already final:</p>',
			{ code: 'unreachable := amount + 1 // > any real answer\nbest := make([]int, amount+1)\nfor a := 1; a <= amount; a++ {\n\tbest[a] = unreachable\n\tfor _, c := range coins {\n\t\tif c <= a && best[a-c]+1 < best[a] {\n\t\t\tbest[a] = best[a-c] + 1\n\t\t}\n\t}\n}\nif best[amount] >= unreachable {\n\treturn -1\n}\nreturn best[amount]' },
			'<p>The load-bearing details:</p>' +
			'<ul>' +
			'<li><strong>The sentinel <code>amount+1</code>.</strong> “Unreachable” must be ' +
			'bigger than any real answer yet safe to add 1 to. Any real answer uses at most ' +
			'<code>amount</code> coins (all 1s), so <code>amount+1</code> is both — and ' +
			'unreachability propagates cleanly: an unreachable <code>best[a−c]</code> can ' +
			'never win the <code>min</code> against a real value.</li>' +
			'<li><strong><code>best[0] = 0</code> does double duty.</strong> It answers ' +
			'amount 0 directly (0 coins, not -1) and seeds every exact hit: a single 5-coin ' +
			'for amount 5 is <code>best[0] + 1</code>.</li>' +
			'<li><strong>Unbounded reuse is free.</strong> <code>best[a−c]</code> may itself ' +
			'have used coin c — nothing forbids it, which is precisely the unbounded-knapsack ' +
			'behavior. (The 0/1 variant needs a different loop order; here reuse is wanted.)</li>' +
			'<li><strong>This finds the count, not the coins.</strong> To recover which coins, ' +
			'store the winning c per amount and walk back from <code>amount</code> — a common ' +
			'follow-up.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(amount · k) for k coins', space: 'O(amount)' },
	});
})();
