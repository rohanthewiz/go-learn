/* Two Sum — Arrays & Hashing (Easy). The canonical hash-map problem, and
 * the template all other problem files follow:
 *   prose       — statement + examples + an inline SVG intuition diagram
 *   starter     — complete Go file the learner edits (no func main)
 *   harness     — Go file merged in by the engine; runs the test table
 *   explanation — revealed on solve (or via the summary toggle)
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 170" width="500" height="170" role="img" aria-label="hash map approach to Two Sum">' +
		// array cells
		'<g>' +
		'<rect x="20" y="30" width="44" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="70" y="30" width="44" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="120" y="30" width="44" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="170" y="30" width="44" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="42" y="52" text-anchor="middle">2</text>' +
		'<text x="92" y="52" text-anchor="middle">7</text>' +
		'<text x="142" y="52" text-anchor="middle">11</text>' +
		'<text x="192" y="52" text-anchor="middle">15</text>' +
		'<text x="42" y="80" text-anchor="middle" class="lbl">0</text>' +
		'<text x="92" y="80" text-anchor="middle" class="lbl">1</text>' +
		'<text x="142" y="80" text-anchor="middle" class="lbl">2</text>' +
		'<text x="192" y="80" text-anchor="middle" class="lbl">3</text>' +
		'<text x="20" y="18" class="lbl">nums · target = 9</text>' +
		'</g>' +
		// current-element annotation
		'<text x="92" y="110" text-anchor="middle" style="fill:var(--accent)">cur = 7</text>' +
		'<text x="92" y="128" text-anchor="middle" class="lbl">need 9 − 7 = 2</text>' +
		// seen map
		'<g>' +
		'<text x="330" y="18" class="lbl">seen (value → index)</text>' +
		'<rect x="330" y="28" width="120" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="345" y="48">2 → 0</text>' +
		'<rect x="330" y="64" width="120" height="30" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'<text x="345" y="84" class="lbl">7 → 1 (next)</text>' +
		'</g>' +
		// lookup arrow
		'<path d="M 150 122 C 230 122 280 60 322 46" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowTS)"/>' +
		'<text x="255" y="98" class="lbl">in the map? yes ✓</text>' +
		'<text x="330" y="130" style="fill:var(--ok)">answer: [0, 1]</text>' +
		'<defs><marker id="dgArrowTS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'two-sum',
		title: 'Two Sum',
		nav: 'Two Sum',
		difficulty: 'Easy',
		category: 'Arrays & Hashing',
		task: 'Implement twoSum — make all 5 tests pass.',

		prose: [
			'<h2>Two Sum</h2>' +
			'<p>Given a slice of integers <code>nums</code> and an integer <code>target</code>, ' +
			'return the <em>indices</em> of the two numbers that add up to <code>target</code>.</p>' +
			'<ul><li>Exactly one solution exists.</li>' +
			'<li>You may not use the same element twice.</li>' +
			'<li>Return the indices in ascending order.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'twoSum([]int{2, 7, 11, 15}, 9)  →  []int{0, 1}   // nums[0] + nums[1] == 9\ntwoSum([]int{3, 2, 4}, 6)       →  []int{1, 2}', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>For each number, the partner it needs is <code>target − cur</code>. A map of ' +
			'the values <em>already seen</em> answers “have I met that partner?” in O(1):</p>' +
			DIAGRAM +
			'<p>One pass, one map — no nested loops.</p>',
		],

		starter: [
			'package main',
			'',
			'// twoSum returns the indices (ascending) of the two numbers in nums',
			'// that add up to target. Exactly one answer exists; an element may',
			'// not be used twice.',
			'func twoSum(nums []int, target int) []int {',
			'	// your code here',
			'	return nil',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"reflect"',
			')',
			'',
			LC.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		nums   []int',
			'		target int',
			'		want   []int',
			'	}',
			'	cases := []tc{',
			'		{[]int{2, 7, 11, 15}, 9, []int{0, 1}},',
			'		{[]int{3, 2, 4}, 6, []int{1, 2}},',
			'		{[]int{3, 3}, 6, []int{0, 1}},',
			'		{[]int{-1, -2, -3, -4, -5}, -8, []int{2, 4}},',
			'		{[]int{0, 4, 3, 0}, 0, []int{0, 3}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v, target=%d", c.nums, c.target),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := twoSum(append([]int(nil), c.nums...), c.target)',
			'			r["pass"] = reflect.DeepEqual(got, c.want)',
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
			'// twoSum returns the indices (ascending) of the two numbers in nums',
			'// that add up to target.',
			'//',
			'// One pass with a value→index map: for each number ask whether its',
			'// needed partner (target − n) has already been seen. Inserting AFTER',
			'// the lookup guarantees we never pair an element with itself, and',
			'// because the partner was seen earlier its index is always the',
			'// smaller one — the answer comes out ascending for free.',
			'func twoSum(nums []int, target int) []int {',
			'	seen := make(map[int]int, len(nums)) // value → index',
			'	for i, n := range nums {',
			'		if j, ok := seen[target-n]; ok {',
			'			return []int{j, i}',
			'		}',
			'		seen[n] = i',
			'	}',
			'	return nil // unreachable: the problem guarantees a solution',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Check every pair with two nested loops — O(n²) time, O(1) space. Fine at ' +
			'n=10, painful at n=10⁵. The wasted work: when the outer loop sits on ' +
			'<code>7</code>, we <em>re-scan</em> the slice looking for <code>2</code> even ' +
			'though we already walked past it.</p>' +
			'<h3>Trade space for time</h3>' +
			'<p>Remember every value we’ve walked past in a <code>map[int]int</code> ' +
			'(value → index). Then “is <code>target − cur</code> back there somewhere?” is a ' +
			'single O(1) lookup instead of a scan:</p>',
			{ code: 'seen := make(map[int]int, len(nums))\nfor i, n := range nums {\n\tif j, ok := seen[target-n]; ok {\n\t\treturn []int{j, i} // partner seen earlier → j < i\n\t}\n\tseen[n] = i // record AFTER the lookup\n}' },
			'<p>Two details do the heavy lifting:</p>' +
			'<ul>' +
			'<li><strong>Insert after lookup.</strong> The current element can’t match itself ' +
			'(<code>[3, 3]</code> with target 6 still works: the second 3 finds the first).</li>' +
			'<li><strong>Ascending for free.</strong> The found partner was seen earlier, so its ' +
			'index is always the smaller — no sorting needed.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(n)' },
	});
})();
