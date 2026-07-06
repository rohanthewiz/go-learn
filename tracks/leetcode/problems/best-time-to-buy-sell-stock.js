/* Best Time to Buy & Sell Stock — Sliding Window (Easy). One buy, one sell,
 * sell after buy. The gateway problem for "carry a running best while you
 * scan": track the cheapest price seen so far and the best profit against it.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 180" width="500" height="180" role="img" aria-label="price chart with buy at the minimum and sell at the later maximum">' +
		'<text x="20" y="18" class="lbl">prices = [7, 1, 5, 3, 6, 4]</text>' +
		// price polyline over the 6 days
		'<polyline points="40,42 120,150 200,78 280,114 360,60 440,96" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		// buy point (day 2, price 1) and sell point (day 5, price 6)
		'<circle cx="120" cy="150" r="5" fill="var(--accent)"/>' +
		'<circle cx="360" cy="60" r="5" fill="var(--ok)"/>' +
		'<text x="120" y="170" text-anchor="middle" style="fill:var(--accent)">buy @ 1</text>' +
		'<text x="360" y="44" text-anchor="middle" style="fill:var(--ok)">sell @ 6</text>' +
		// guide lines out to the profit bracket
		'<path d="M 128 150 H 460" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'<path d="M 368 60 H 460" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		// vertical profit bracket
		'<path d="M 454 60 h 8 M 458 60 V 150 M 454 150 h 8" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="470" y="110" style="fill:var(--ok)">+5</text>' +
		'</svg>';

	LC.problem({
		id: 'best-time-to-buy-sell-stock',
		title: 'Best Time to Buy & Sell Stock',
		nav: 'Buy & Sell Stock',
		difficulty: 'Easy',
		category: 'Sliding Window',
		task: 'Implement maxProfit — make all 5 tests pass.',

		prose: [
			'<h2>Best Time to Buy &amp; Sell Stock</h2>' +
			'<p>You are given <code>prices</code>, where <code>prices[i]</code> is the price of ' +
			'a stock on day <code>i</code>. Choose one day to buy and a <em>later</em> day to ' +
			'sell, and return the maximum profit you can achieve.</p>' +
			'<ul><li>You must buy before you sell — at most one transaction.</li>' +
			'<li>If no profitable transaction exists, return <code>0</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'maxProfit([]int{7, 1, 5, 3, 6, 4})  →  5   // buy at 1 (day 2), sell at 6 (day 5)\nmaxProfit([]int{7, 6, 4, 3, 1})     →  0   // prices only fall — don’t trade', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>The best sale on day <code>i</code> always buys at the <em>cheapest price seen ' +
			'before</em> day <code>i</code>. So one pass suffices: carry the minimum so far, and ' +
			'test each price against it:</p>' +
			DIAGRAM +
			'<p>One scan, two variables — no need to compare every pair of days.</p>',
		],

		starter: [
			'package main',
			'',
			'// maxProfit returns the maximum profit from one buy followed by one',
			'// later sell. If no profitable transaction exists, it returns 0.',
			'func maxProfit(prices []int) int {',
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
			'		prices []int',
			'		want   int',
			'	}',
			'	cases := []tc{',
			'		{[]int{7, 1, 5, 3, 6, 4}, 5},',
			'		{[]int{7, 6, 4, 3, 1}, 0},',
			'		{[]int{2, 4, 1}, 2},',
			'		{[]int{1}, 0},',
			'		{[]int{}, 0},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("prices=%v", c.prices),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := maxProfit(append([]int(nil), c.prices...))',
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
			'// maxProfit returns the maximum profit from one buy followed by one',
			'// later sell (0 if prices only fall).',
			'//',
			'// Single pass: for each day, the only buy worth considering is the',
			'// cheapest price seen so far — buying any earlier-but-pricier day',
			'// can only shrink the profit, and looking back (never forward)',
			'// enforces "buy before sell" by construction. So two variables',
			'// replace the O(n²) all-pairs scan.',
			'func maxProfit(prices []int) int {',
			'	if len(prices) == 0 {',
			'		return 0',
			'	}',
			'	minSoFar := prices[0] // cheapest buy available strictly before today',
			'	best := 0             // 0 = "don’t trade", so a falling market never goes negative',
			'	for _, p := range prices[1:] {',
			'		if p-minSoFar > best {',
			'			best = p - minSoFar',
			'		}',
			'		// Update the minimum AFTER evaluating a sale at p: today can',
			'		// serve as a future buy, but not as its own sell.',
			'		if p < minSoFar {',
			'			minSoFar = p',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Try every (buy, sell) pair with <code>j &gt; i</code> and keep the best ' +
			'difference — O(n²) time. The wasted work: when we evaluate selling on day ' +
			'<code>j</code>, we re-scan all earlier days even though only <em>one</em> of ' +
			'them matters — the cheapest.</p>' +
			'<h3>Carry the minimum with you</h3>' +
			'<p>Walk left to right holding two numbers: the lowest price seen so far and ' +
			'the best profit so far. Each new price is a candidate <em>sell</em> against ' +
			'that minimum, then a candidate future <em>buy</em>:</p>',
			{ code: 'minSoFar := prices[0]\nbest := 0\nfor _, p := range prices[1:] {\n\tif p-minSoFar > best {\n\t\tbest = p - minSoFar // sell today against the cheapest past buy\n\t}\n\tif p < minSoFar {\n\t\tminSoFar = p // today becomes the cheapest future buy\n\t}\n}' },
			'<p>Why this is enough:</p>' +
			'<ul>' +
			'<li><strong>Looking back at the min suffices.</strong> A sale can only pair ' +
			'with an earlier buy, and among earlier buys the cheapest always wins — so ' +
			'<code>minSoFar</code> is the only history worth keeping.</li>' +
			'<li><strong>Order of the two ifs.</strong> Sell-check before min-update, so a ' +
			'day is never both the buy and the sell of the same trade.</li>' +
			'<li><strong>Falling market.</strong> <code>best</code> starts at 0 and only ' +
			'moves up, so <code>[7, 6, 4, 3, 1]</code> correctly returns 0 (don’t trade) ' +
			'rather than the least-bad loss.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
