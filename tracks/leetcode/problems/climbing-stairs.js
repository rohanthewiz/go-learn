/* Climbing Stairs — Dynamic Programming (Easy). The gateway DP problem:
 * a naive exponential recursion that collapses into Fibonacci once you
 * see that ways(n) only depends on ways(n−1) and ways(n−2).
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 180" width="500" height="180" role="img" aria-label="ways to reach each stair step">' +
		'<text x="20" y="18" class="lbl">ways to reach each step</text>' +
		// staircase — steps 3 and 4 (ok) feed step 5 (accent)
		'<g>' +
		'<rect x="20" y="136" width="80" height="22" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="110" y="114" width="80" height="44" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="200" y="92" width="80" height="66" rx="3" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="290" y="70" width="80" height="88" rx="3" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="380" y="48" width="80" height="110" rx="3" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'</g>' +
		// ways-count above each step
		'<text x="60" y="128" text-anchor="middle">1</text>' +
		'<text x="150" y="106" text-anchor="middle">2</text>' +
		'<text x="240" y="84" text-anchor="middle">3</text>' +
		'<text x="330" y="62" text-anchor="middle">5</text>' +
		'<text x="420" y="40" text-anchor="middle" style="fill:var(--accent)">8</text>' +
		// step numbers
		'<text x="60" y="172" text-anchor="middle" class="lbl">1</text>' +
		'<text x="150" y="172" text-anchor="middle" class="lbl">2</text>' +
		'<text x="240" y="172" text-anchor="middle" class="lbl">3</text>' +
		'<text x="330" y="172" text-anchor="middle" class="lbl">4</text>' +
		'<text x="420" y="172" text-anchor="middle" class="lbl">5</text>' +
		// arrows: ways(3) and ways(4) sum into ways(5)
		'<path d="M 252 78 C 310 40 360 26 402 33" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowCS)"/>' +
		'<path d="M 342 56 C 372 42 384 38 402 36" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowCS)"/>' +
		'<text x="315" y="16" text-anchor="middle" class="lbl">3 + 5 = 8</text>' +
		'<defs><marker id="dgArrowCS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'climbing-stairs',
		title: 'Climbing Stairs',
		nav: 'Climbing Stairs',
		difficulty: 'Easy',
		category: 'Dynamic Programming',
		task: 'Implement climbStairs — make all 5 tests pass.',

		prose: [
			'<h2>Climbing Stairs</h2>' +
			'<p>You are climbing a staircase of <code>n</code> steps. Each move climbs ' +
			'either <em>1</em> or <em>2</em> steps. In how many distinct ways can you ' +
			'reach the top?</p>' +
			'<ul><li><code>n ≥ 1</code>.</li>' +
			'<li>Order matters: <code>1+2</code> and <code>2+1</code> are different ways.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'climbStairs(3)  →  3    // 1+1+1, 1+2, 2+1\nclimbStairs(5)  →  8', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>The last move onto step <code>n</code> was either a 1-step from ' +
			'<code>n−1</code> or a 2-step from <code>n−2</code> — no other way in. So ' +
			'<code>ways(n) = ways(n−1) + ways(n−2)</code>:</p>' +
			DIAGRAM +
			'<p>That is the Fibonacci recurrence in disguise — two rolling variables ' +
			'walk it bottom-up.</p>',
		],

		starter: [
			'package main',
			'',
			'// climbStairs returns the number of distinct ways to climb a staircase',
			'// of n steps when each move climbs either 1 or 2 steps.',
			'func climbStairs(n int) int {',
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
			'		n    int',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{1, 1},',
			'		{2, 2},',
			'		{3, 3},',
			'		{5, 8},',
			'		{10, 89},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("n=%d", c.n),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := climbStairs(c.n)',
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
			'// climbStairs returns the number of distinct ways to climb n steps',
			'// taking 1 or 2 steps at a time.',
			'//',
			'// The last move onto step n was either a 1-step (from n−1) or a',
			'// 2-step (from n−2), and those two pools of paths are disjoint, so',
			'// ways(n) = ways(n−1) + ways(n−2) — it\'s Fibonacci in disguise.',
			'// Building bottom-up kills the exponential recursion, and because',
			'// each value depends on only the previous two, a pair of rolling',
			'// variables drops the O(n) memo table to O(1) space.',
			'func climbStairs(n int) int {',
			'	// prev = ways(i−2), cur = ways(i−1); seeded with ways(0)=1',
			'	// (one way to stand still) and ways(1)=1, so the loop body is',
			'	// uniform from i=2 onward with no special-casing of small n.',
			'	prev, cur := 1, 1',
			'	for i := 2; i <= n; i++ {',
			'		prev, cur = cur, prev+cur // slide the window one step up',
			'	}',
			'	return cur',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The recursion tree first</h3>' +
			'<p>The direct translation — <code>ways(n) = ways(n−1) + ways(n−2)</code> with ' +
			'recursion — is correct but exponential: the call tree for <code>ways(10)</code> ' +
			'computes <code>ways(6)</code> five separate times, and the duplication doubles ' +
			'roughly every level. That’s O(2ⁿ) work for answers that only ever take O(n) ' +
			'distinct values.</p>' +
			'<h3>Collapse it bottom-up</h3>' +
			'<p>Flip the direction: start at the base cases and build upward, so every ' +
			'subproblem is computed exactly once. And since <code>ways(i)</code> looks back ' +
			'only two slots, the whole memo table collapses into two rolling variables:</p>',
			{ code: 'prev, cur := 1, 1 // ways(0), ways(1)\nfor i := 2; i <= n; i++ {\n\tprev, cur = cur, prev+cur\n}\nreturn cur' },
			'<p>The details worth noticing:</p>' +
			'<ul>' +
			'<li><strong>Disjoint cases make the sum valid.</strong> Every path to step n ends ' +
			'in exactly one of a 1-step or a 2-step — no path is counted twice.</li>' +
			'<li><strong>Seeding with ways(0)=1</strong> (the empty climb) makes ' +
			'<code>ways(2) = 1 + 1 = 2</code> fall out of the same recurrence — no special case, ' +
			'and n=1 returns before the loop even runs.</li>' +
			'<li><strong>Tuple assignment</strong> <code>prev, cur = cur, prev+cur</code> slides ' +
			'the two-value window without a temp variable.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
