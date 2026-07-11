/* Longest Increasing Subsequence — Dynamic Programming (Medium). The classic
 * O(n²) DP with a famous O(n log n) upgrade: instead of "best length ending
 * at each index", maintain `tails` — the smallest possible tail value for
 * each subsequence length — and binary-search into it. The array stays
 * sorted by construction, which is exactly what makes the search legal.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 235" width="500" height="235" role="img" aria-label="tails array evolving while scanning the input">' +
		'<text x="20" y="16" class="lbl">nums = [10 9 2 5 3 7 101 18] · tails[k] = smallest tail of a length-(k+1) increasing run</text>' +
		// snapshot rows of the tails array (cells: x = 130 + k*46, w=40, h=28)
		'<g fill="var(--panel)">' +
		// after 2 (10 and 9 each overwrote tails[0] first)
		'<rect x="130" y="28" width="40" height="28" rx="4" stroke="var(--edge)"/>' +
		// after 5
		'<rect x="130" y="64" width="40" height="28" rx="4" stroke="var(--edge)"/>' +
		'<rect x="176" y="64" width="40" height="28" rx="4" stroke="var(--edge)"/>' +
		// after 3 — the replacement move
		'<rect x="130" y="100" width="40" height="28" rx="4" stroke="var(--edge)"/>' +
		'<rect x="176" y="100" width="40" height="28" rx="4" stroke="var(--accent)" stroke-width="2"/>' +
		// after 7
		'<rect x="130" y="136" width="40" height="28" rx="4" stroke="var(--edge)"/>' +
		'<rect x="176" y="136" width="40" height="28" rx="4" stroke="var(--edge)"/>' +
		'<rect x="222" y="136" width="40" height="28" rx="4" stroke="var(--edge)"/>' +
		// after 101 then 18
		'<rect x="130" y="172" width="40" height="28" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="176" y="172" width="40" height="28" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="222" y="172" width="40" height="28" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="268" y="172" width="40" height="28" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'</g>' +
		// step labels
		'<g class="lbl">' +
		'<text x="20" y="47">after 10, 9, 2</text>' +
		'<text x="20" y="83">after 5</text>' +
		'<text x="20" y="119">after 3</text>' +
		'<text x="20" y="155">after 7</text>' +
		'<text x="20" y="191">after 101, 18</text>' +
		'</g>' +
		// cell values
		'<g text-anchor="middle">' +
		'<text x="150" y="47">2</text>' +
		'<text x="150" y="83">2</text><text x="196" y="83">5</text>' +
		'<text x="150" y="119">2</text><text x="196" y="119" style="fill:var(--accent)">3</text>' +
		'<text x="150" y="155">2</text><text x="196" y="155">3</text><text x="242" y="155">7</text>' +
		'<text x="150" y="191">2</text><text x="196" y="191">3</text><text x="242" y="191">7</text><text x="288" y="191">18</text>' +
		'</g>' +
		// arrow: 3 replaces 5 (same length, lower tail)
		'<path d="M 240 78 C 280 78 280 106 222 112" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowLIS)"/>' +
		'<text x="300" y="86" class="lbl">3 replaces 5: same length,</text>' +
		'<text x="300" y="102" class="lbl">lower tail → easier to extend</text>' +
		'<text x="330" y="191" class="lbl">18 replaced 101 the same way</text>' +
		'<text x="20" y="224" style="fill:var(--ok)">answer = len(tails) = 4   (e.g. 2, 3, 7, 18 — or 2, 3, 7, 101)</text>' +
		'<defs><marker id="dgArrowLIS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'longest-increasing-subsequence',
		title: 'Longest Increasing Subsequence',
		nav: 'Longest Incr. Subseq.',
		difficulty: 'Medium',
		category: 'Dynamic Programming',
		task: 'Implement lengthOfLIS — make all 5 tests pass.',

		prose: [
			'<h2>Longest Increasing Subsequence</h2>' +
			'<p>Given a non-empty slice of integers <code>nums</code>, return the length of ' +
			'the longest <em>strictly increasing</em> subsequence. A subsequence keeps the ' +
			'original order but may skip elements.</p>' +
			'<ul><li>Strictly increasing: equal neighbors do not extend a run, so ' +
			'<code>[7, 7, 7]</code> has answer 1.</li>' +
			'<li>Only the <em>length</em> is asked for, not the subsequence itself.</li>' +
			'<li><code>nums</code> is non-empty, so the answer is always ≥ 1.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'lengthOfLIS([]int{10, 9, 2, 5, 3, 7, 101, 18})  →  4   // 2, 3, 7, 101\nlengthOfLIS([]int{0, 1, 0, 3, 2, 3})            →  4   // 0, 1, 2, 3\nlengthOfLIS([]int{7, 7, 7, 7})                  →  1   // strictly increasing', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Keep <code>tails</code>, where <code>tails[k]</code> is the <em>smallest ' +
			'value that can end</em> an increasing subsequence of length k+1 seen so far. ' +
			'For each new number: if it beats every tail, append it (a longer run exists); ' +
			'otherwise it <em>replaces</em> the first tail ≥ it — same length, but a cheaper ' +
			'ending that future numbers can extend more easily:</p>' +
			DIAGRAM +
			'<p><code>tails</code> stays sorted by construction, so “first tail ≥ x” is a ' +
			'binary search — the whole scan runs in O(n log n).</p>',
		],

		starter: [
			'package main',
			'',
			'// lengthOfLIS returns the length of the longest strictly increasing',
			'// subsequence of nums (order preserved, elements may be skipped).',
			'// nums is non-empty, so the answer is always at least 1.',
			'func lengthOfLIS(nums []int) int {',
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
			'		{[]int{10, 9, 2, 5, 3, 7, 101, 18}, 4}, // 2,3,7,101 (or 18)',
			'		{[]int{0, 1, 0, 3, 2, 3}, 4},           // 0,1,2,3',
			'		{[]int{7, 7, 7, 7, 7, 7, 7}, 1},        // strict: equal never extends',
			'		{[]int{1, 2, 3, 4, 5}, 5},              // already increasing',
			'		{[]int{5, 4, 3, 2, 1}, 1},              // strictly decreasing',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v", c.nums),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := lengthOfLIS(append([]int(nil), c.nums...))',
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
			'import "sort"',
			'',
			'// lengthOfLIS returns the length of the longest strictly increasing',
			'// subsequence in O(n log n) via the patience/tails technique.',
			'//',
			'// Invariant: tails[k] holds the SMALLEST value that ends any',
			'// increasing subsequence of length k+1 found so far. Two facts make',
			'// the algorithm work:',
			'//',
			'//  1. tails is strictly increasing. If tails[k] ≥ tails[k+1], the',
			'//     length-(k+2) run ending at tails[k+1] contains a length-(k+1)',
			'//     prefix ending on something even smaller — contradiction.',
			'//     Sorted order is what licenses the binary search below.',
			'//  2. Replacing (not shifting) preserves correctness: overwriting',
			'//     tails[i] with a smaller x keeps every recorded length',
			'//     achievable while making that length easier to extend later.',
			'//',
			'// Note tails is NOT itself an increasing subsequence of nums — only',
			'// its length is meaningful. That is fine: the problem asks for the',
			'// length alone.',
			'func lengthOfLIS(nums []int) int {',
			'	tails := make([]int, 0, len(nums))',
			'	for _, n := range nums {',
			'		// First index whose tail is ≥ n. Using ≥ (SearchInts is a',
			'		// lower bound) enforces STRICT increase: an equal value',
			'		// replaces its twin instead of extending past it.',
			'		i := sort.SearchInts(tails, n)',
			'		if i == len(tails) {',
			'			// n beats every tail → a strictly longer run now exists.',
			'			tails = append(tails, n)',
			'		} else {',
			'			// Same length as before, but a cheaper ending.',
			'			tails[i] = n',
			'		}',
			'	}',
			'	return len(tails)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The O(n²) DP first</h3>' +
			'<p>The classic table: <code>dp[i]</code> = length of the longest increasing ' +
			'subsequence <em>ending at</em> index i. Each element scans everything before it ' +
			'for a smaller value to extend:</p>',
			{ code: 'dp := make([]int, len(nums))\nbest := 0\nfor i := range nums {\n\tdp[i] = 1 // the element alone\n\tfor j := 0; j < i; j++ {\n\t\tif nums[j] < nums[i] && dp[j]+1 > dp[i] {\n\t\t\tdp[i] = dp[j] + 1\n\t\t}\n\t}\n\tif dp[i] > best {\n\t\tbest = dp[i]\n\t}\n}' },
			'<p>Correct, and worth knowing cold — but the inner scan repeats the same ' +
			'question (“what is the longest run I can extend with this value?”) against an ' +
			'ever-growing prefix: O(n²).</p>' +
			'<h3>The insight: index by length, not by position</h3>' +
			'<p>Flip the table around. Instead of “best length ending at index i”, keep ' +
			'<code>tails[k]</code> = the <em>smallest value that ends</em> some increasing run ' +
			'of length k+1. Smaller tails are strictly better — they are easier to extend — ' +
			'so each new number either appends (it extends the longest run) or replaces the ' +
			'first tail ≥ it (same length, cheaper ending). Since a longer run’s tail must ' +
			'exceed some shorter run’s tail, <code>tails</code> is always sorted, and “first ' +
			'tail ≥ x” becomes a binary search:</p>',
			{ code: 'tails := make([]int, 0, len(nums))\nfor _, n := range nums {\n\ti := sort.SearchInts(tails, n) // lower bound: first tail ≥ n\n\tif i == len(tails) {\n\t\ttails = append(tails, n) // new longest length\n\t} else {\n\t\ttails[i] = n // same length, smaller tail\n\t}\n}\nreturn len(tails)' },
			'<p>Key details:</p>' +
			'<ul>' +
			'<li><strong>Lower bound gives strictness.</strong> <code>SearchInts</code> returns ' +
			'the first index with <code>tails[i] ≥ n</code>, so an equal value replaces its ' +
			'twin rather than appending after it — <code>[7, 7, 7]</code> stays at length 1. ' +
			'(For a non-strict variant you would search for the first tail <em>&gt;</em> n.)</li>' +
			'<li><strong>Replacement never lies.</strong> Overwriting a tail with a smaller ' +
			'value keeps every recorded length achievable — some run of that length really ' +
			'does end at the new value — while opening the door wider for what follows.</li>' +
			'<li><strong><code>tails</code> is not the answer sequence.</strong> After ' +
			'<code>[10, 9, 2, 5, 3, 7, 101, 18]</code> it reads <code>[2, 3, 7, 18]</code>, ' +
			'but 18 arrived after 101 was counted. Only <code>len(tails)</code> is ' +
			'trustworthy — which is all the problem asks for.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n log n)', space: 'O(n)' },
	});
})();
