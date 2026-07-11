/* Jump Game — Greedy (Medium). The track's first greedy problem, chosen
 * because the greedy insight is unusually crisp: the ONLY thing that
 * matters at any point is the furthest index reachable so far — one
 * integer replaces an O(n²) DP table. The starter returns a constant
 * false so it can never vacuously pass (false IS the right answer for
 * some cases); tests include several that want true.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="furthest-reach scan over nums = [2 3 1 1 4]">' +
		'<text x="20" y="16" class="lbl">nums = [2 3 1 1 4] — reach = furthest index any visited cell can touch</text>' +
		// array cells
		'<g fill="var(--panel)">' +
		'<rect x="30" y="76" width="44" height="34" rx="4" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="80" y="76" width="44" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="130" y="76" width="44" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="180" y="76" width="44" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="230" y="76" width="44" height="34" rx="4" stroke="var(--ok)" stroke-width="2"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="52" y="98">2</text><text x="102" y="98">3</text><text x="152" y="98">1</text>' +
		'<text x="202" y="98">1</text><text x="252" y="98" style="fill:var(--ok)">4</text>' +
		'</g>' +
		'<g text-anchor="middle" class="lbl">' +
		'<text x="52" y="126">0</text><text x="102" y="126">1</text><text x="152" y="126">2</text>' +
		'<text x="202" y="126">3</text><text x="252" y="126">4 = goal</text>' +
		'</g>' +
		// reach arcs: from index 0 (reach 2), then from index 1 (reach 4 = end)
		'<path d="M 52 72 C 80 40 130 40 150 70" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowJG)"/>' +
		'<text x="101" y="42" text-anchor="middle" class="lbl">i=0: reach 0+2=2</text>' +
		'<path d="M 102 74 C 150 24 220 26 250 68" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowJGok)"/>' +
		'<text x="230" y="26" text-anchor="middle" style="fill:var(--ok)">i=1: reach 1+3=4 ✓ goal</text>' +
		// notes on the right / bottom
		'<text x="320" y="92" class="lbl">reach only ever grows:</text>' +
		'<text x="320" y="110" class="lbl">reach = max(reach, i+nums[i])</text>' +
		'<text x="30" y="156">visit i only while i ≤ reach — the moment i outruns reach, you are stuck: false</text>' +
		'<text x="30" y="178" class="lbl">e.g. [3 2 1 0 4]: reach stalls at 3, so index 4 is never legal</text>' +
		'<defs>' +
		'<marker id="dgArrowJG" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowJGok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'jump-game',
		title: 'Jump Game',
		nav: 'Jump Game',
		difficulty: 'Medium',
		category: 'Greedy',
		task: 'Implement canJump — make all 5 tests pass.',

		prose: [
			'<h2>Jump Game</h2>' +
			'<p>You start at index 0 of <code>nums</code>, where <code>nums[i]</code> is the ' +
			'<em>maximum</em> jump length from index i (any shorter jump is also allowed). ' +
			'Return <code>true</code> if you can reach the last index, <code>false</code> ' +
			'otherwise.</p>' +
			'<ul><li><code>nums</code> is non-empty and its values are non-negative.</li>' +
			'<li>A single-element slice counts as already at the last index: <code>true</code>.</li>' +
			'<li>A zero is only a wall if you cannot jump <em>over</em> it from earlier.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'canJump([]int{2, 3, 1, 1, 4})  →  true    // 0 → 1 → 4 (jump 1, then 3)\ncanJump([]int{3, 2, 1, 0, 4})  →  false   // every route lands on the 0 at index 3\ncanJump([]int{0})              →  true    // already there', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>You never need to decide <em>which</em> jump to take. Scan left to right and ' +
			'track a single number — the furthest index reachable so far:</p>' +
			DIAGRAM +
			'<p>If the scan ever stands on an index beyond <code>reach</code>, no sequence of ' +
			'jumps gets there — answer <code>false</code>. If <code>reach</code> touches the ' +
			'last index, answer <code>true</code>.</p>',
		],

		starter: [
			'package main',
			'',
			'// canJump reports whether the last index of nums is reachable from',
			'// index 0, where nums[i] is the maximum jump length from index i.',
			'// nums is non-empty with non-negative values; a single element is',
			'// trivially reachable.',
			'func canJump(nums []int) bool {',
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
			'		{[]int{2, 3, 1, 1, 4}, true},',
			'		{[]int{3, 2, 1, 0, 4}, false},',
			'		{[]int{0}, true},',
			'		{[]int{2, 0, 0}, true},',
			'		{[]int{1, 0, 1}, false},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v", c.nums),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := canJump(append([]int(nil), c.nums...))',
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
			'// canJump reports whether the last index is reachable from index 0.',
			'//',
			'// Greedy furthest-reach scan. The whole state is ONE integer: reach,',
			'// the furthest index any visited cell can touch. That compression is',
			'// sound because reachability here has no trade-offs — a jump that',
			'// lands further never costs anything (from a further index you can',
			'// still reach every index a nearer one could, since shorter jumps',
			'// are allowed). So "furthest so far" dominates every other route,',
			'// and remembering WHICH cells are reachable (the DP view) is wasted',
			'// bookkeeping.',
			'func canJump(nums []int) bool {',
			'	reach := 0 // furthest index reachable using cells visited so far',
			'	for i, n := range nums {',
			'		if i > reach {',
			'			// The scan outran every jump: index i is unreachable,',
			'			// and so is everything after it.',
			'			return false',
			'		}',
			'		if i+n > reach {',
			'			reach = i + n',
			'		}',
			'		if reach >= len(nums)-1 {',
			'			// Covers len(nums) == 1 too: reach 0 ≥ 0 immediately.',
			'			return true',
			'		}',
			'	}',
			'	return true // unreachable: one of the two exits above fires first',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The DP instinct — and its price</h3>' +
			'<p>“Is index i reachable?” smells like DP: <code>can[i]</code> is true if some ' +
			'earlier j with <code>can[j]</code> satisfies <code>j + nums[j] ≥ i</code>. ' +
			'Correct, but each of the n cells re-scans up to n predecessors — O(n²) time and ' +
			'O(n) space, and at n = 10⁵ that is real pain.</p>' +
			'<h3>The greedy insight: one number dominates the whole table</h3>' +
			'<p>Reachability has no trade-offs here. Reaching a <em>further</em> index is ' +
			'never worse than a nearer one — shorter jumps are allowed, so a further position ' +
			'can do everything a nearer one can. That means the entire boolean table collapses ' +
			'into its frontier: <code>reach</code>, the furthest index touched so far. Index i ' +
			'is reachable if and only if <code>i ≤ reach</code>.</p>',
			{ code: 'reach := 0\nfor i, n := range nums {\n\tif i > reach {\n\t\treturn false // the scan outran every jump — stuck\n\t}\n\tif i+n > reach {\n\t\treach = i + n\n\t}\n\tif reach >= len(nums)-1 {\n\t\treturn true\n\t}\n}' },
			'<p>Key details:</p>' +
			'<ul>' +
			'<li><strong>The order of the checks matters.</strong> Test <code>i &gt; reach</code> ' +
			'<em>before</em> using <code>nums[i]</code> to extend — a cell you cannot stand on ' +
			'must not contribute its jump. In <code>[1 0 1]</code> the 1 at index 2 would ' +
			'happily reach the end, but you can never get there.</li>' +
			'<li><strong>Zeros are not special.</strong> A 0 just fails to extend ' +
			'<code>reach</code>; it only kills you if <code>reach</code> stalls exactly on it, ' +
			'which the <code>i &gt; reach</code> check discovers one step later ' +
			'(<code>[2 0 0]</code> is fine, <code>[3 2 1 0 4]</code> is not).</li>' +
			'<li><strong>Why greedy is safe here but not everywhere.</strong> Contrast with ' +
			'Coin Change, where taking the biggest coin first can be wrong: coins have ' +
			'trade-offs, so it needs DP. Here “further is never worse” is provable, and that ' +
			'domination argument is exactly what licenses a greedy answer.</li>' +
			'<li><strong>The backward alternative.</strong> Scan right-to-left keeping the ' +
			'smallest index known to reach the end: <code>if i+nums[i] ≥ goal { goal = i }</code>, ' +
			'answer <code>goal == 0</code>. Same O(n)/O(1), sometimes easier to convince ' +
			'yourself of — the invariant is “goal is the leftmost sure thing”.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
