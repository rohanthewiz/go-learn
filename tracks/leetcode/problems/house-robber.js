/* House Robber — Dynamic Programming (Medium). The classic "DP without the
 * array": at each house the only question is rob-it or skip-it, and both
 * answers depend on just the previous house's two answers — so the whole
 * memo table collapses into two rolling variables. Builds directly on
 * Climbing Stairs (same rolling-pair trick, now with a max instead of a sum).
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="rolling rob and skip values across a row of houses">' +
		'<text x="20" y="16" class="lbl">nums = [2 7 9 3 1] · the two rolling values after each house</text>' +
		// house boxes (x = 60 + i*80, w=56) — houses 0,2,4 are the winning picks
		'<g fill="var(--panel)">' +
		'<rect x="60" y="30" width="56" height="34" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="140" y="30" width="56" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="220" y="30" width="56" height="34" rx="4" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="300" y="30" width="56" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="380" y="30" width="56" height="34" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="88" y="52">2</text><text x="168" y="52">7</text><text x="248" y="52">9</text>' +
		'<text x="328" y="52">3</text><text x="408" y="52">1</text>' +
		'</g>' +
		// row labels
		'<text x="10" y="102" class="lbl">rob</text>' +
		'<text x="10" y="134" class="lbl">skip</text>' +
		// rob row: 2 7 11 10 12
		'<g text-anchor="middle">' +
		'<text x="88" y="102">2</text><text x="168" y="102">7</text>' +
		'<text x="248" y="102" style="fill:var(--accent)">11</text>' +
		'<text x="328" y="102">10</text><text x="408" y="102" style="fill:var(--ok)">12</text>' +
		'</g>' +
		// skip row: 0 2 7 11 11
		'<g text-anchor="middle" class="lbl">' +
		'<text x="88" y="134">0</text><text x="168" y="134">2</text><text x="248" y="134">7</text>' +
		'<text x="328" y="134">11</text><text x="408" y="134">11</text>' +
		'</g>' +
		// arrows into rob(9): skip at house 7 (=2) + 9
		'<path d="M 176 124 C 200 122 220 112 238 100" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowHR)"/>' +
		'<text x="196" y="152" class="lbl">rob 9: skip so far (2) + 9 = 11</text>' +
		'<text x="196" y="170" class="lbl">skip 9: max(rob 7, skip 7) = 7</text>' +
		'<text x="408" y="170" text-anchor="middle" style="fill:var(--ok)">answer: max(12, 11) = 12</text>' +
		'<defs><marker id="dgArrowHR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'house-robber',
		title: 'House Robber',
		nav: 'House Robber',
		difficulty: 'Medium',
		category: 'Dynamic Programming',
		task: 'Implement rob — make all 5 tests pass.',

		prose: [
			'<h2>House Robber</h2>' +
			'<p>A row of houses each holds a non-negative amount of money, ' +
			'<code>nums[i]</code>. Adjacent houses share an alarm: robbing two houses ' +
			'<em>next to each other</em> calls the police. Return the maximum amount you ' +
			'can rob without ever robbing two adjacent houses.</p>' +
			'<ul><li>You may rob any subset of houses with no two adjacent.</li>' +
			'<li>An empty street yields 0.</li>' +
			'<li>Skipping two (or more) in a row is allowed — sometimes it pays.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'rob([]int{1, 2, 3, 1})     →  4    // rob house 0 and house 2: 1 + 3\nrob([]int{2, 7, 9, 3, 1})  →  12   // rob houses 0, 2, 4: 2 + 9 + 1', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Walk the street once carrying two numbers: the best loot if you ' +
			'<em>robbed</em> the house you just passed, and the best if you ' +
			'<em>skipped</em> it. Robbing the current house is only legal on top of a ' +
			'skip; skipping it lets you keep the better of both:</p>' +
			DIAGRAM +
			'<p>Two variables, one pass — the whole DP table you might have built ' +
			'collapses into the last column.</p>',
		],

		starter: [
			'package main',
			'',
			'// rob returns the maximum total that can be robbed from the row of',
			'// houses nums without robbing two adjacent houses. An empty row',
			'// yields 0.',
			'func rob(nums []int) int {',
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
			'		{[]int{1, 2, 3, 1}, 4},',
			'		{[]int{2, 7, 9, 3, 1}, 12},',
			'		{[]int{5}, 5},        // single house: take it',
			'		{[]int{2, 7}, 7},     // two houses: the richer one',
			'		{[]int{}, 0},         // empty street',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v", c.nums),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := rob(append([]int(nil), c.nums...))',
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
			'// rob returns the max loot from non-adjacent houses.',
			'//',
			'// State per house: either you robbed it or you didn\'t, and the',
			'// best total under each choice depends only on the PREVIOUS',
			'// house\'s two bests:',
			'//',
			'//	robbed(i) = skipped(i−1) + nums[i]   // must have skipped i−1',
			'//	skipped(i) = max(robbed(i−1), skipped(i−1))',
			'//',
			'// Since only the (i−1) column is ever read, the whole DP table',
			'// collapses into two rolling variables — O(1) space. Both start at',
			'// 0 (an empty street has nothing robbed under either reading),',
			'// which also makes the empty-input answer fall out with no special',
			'// case.',
			'func rob(nums []int) int {',
			'	robbed, skipped := 0, 0 // best totals ending at the previous house',
			'	for _, v := range nums {',
			'		// Compute both new values from the OLD pair before writing',
			'		// either — tuple assignment keeps the update atomic, so',
			'		// robbed on the right still means "previous house robbed".',
			'		newSkipped := skipped',
			'		if robbed > newSkipped {',
			'			newSkipped = robbed // free to keep the better history',
			'		}',
			'		robbed, skipped = skipped+v, newSkipped',
			'	}',
			'	// The last house was either robbed or skipped; take the better.',
			'	if robbed > skipped {',
			'		return robbed',
			'	}',
			'	return skipped',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The exponential version</h3>' +
			'<p>Direct recursion mirrors the choice: <code>best(i) = max(nums[i] + ' +
			'best(i+2), best(i+1))</code> — rob house i and jump past the neighbor, or ' +
			'skip it. Correct, but the two branches recompute the same suffixes over and ' +
			'over: O(2ⁿ). Memoize <code>best(i)</code> and it drops to O(n) — the classic ' +
			'top-down fix. But look at what the memo actually holds.</p>' +
			'<h3>The table nobody needs</h3>' +
			'<p>Bottom-up, <code>dp[i]</code> (best loot for the first i houses) reads only ' +
			'<code>dp[i−1]</code> and <code>dp[i−2]</code>. A cleaner formulation carries the ' +
			'choice explicitly: track the best total <em>if the previous house was robbed</em> ' +
			'and <em>if it was skipped</em>. Each step reads only the previous pair — so keep ' +
			'just the pair:</p>',
			{ code: 'robbed, skipped := 0, 0\nfor _, v := range nums {\n\tnewSkipped := skipped\n\tif robbed > newSkipped {\n\t\tnewSkipped = robbed\n\t}\n\trobbed, skipped = skipped+v, newSkipped\n}\n// answer: max(robbed, skipped)' },
			'<p>Why each piece is the way it is:</p>' +
			'<ul>' +
			'<li><strong><code>robbed = skipped + v</code></strong> — robbing house i is only ' +
			'legal if house i−1 was skipped, so it builds on <code>skipped</code>, never on ' +
			'<code>robbed</code>. That single constraint IS the alarm rule.</li>' +
			'<li><strong><code>skipped = max(both)</code></strong> — skipping is ' +
			'unconditional, so it inherits the better of the two histories. This is also how ' +
			'“skip two in a row” happens for free: <code>skipped</code> can chain off ' +
			'<code>skipped</code>.</li>' +
			'<li><strong>Atomic tuple assignment.</strong> Both new values must be computed ' +
			'from the <em>old</em> pair; updating one variable before reading the other is the ' +
			'classic bug in rolling DP.</li>' +
			'<li><strong>Zero seeds handle the edges.</strong> Empty input never enters the ' +
			'loop and returns 0; a single house yields <code>max(0+v, 0) = v</code>. No length ' +
			'checks anywhere.</li>' +
			'</ul>' +
			'<p>The takeaway pattern: when a DP recurrence looks back a fixed number of ' +
			'steps, the table compresses into that many rolling variables. Climbing Stairs ' +
			'was the additive version; this is the max version; Fibonacci-style compression ' +
			'shows up everywhere.</p>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
