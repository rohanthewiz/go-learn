/* Permutations — Backtracking (Medium). The second backtracking problem:
 * where Subsets branches take/skip per element, Permutations branches over
 * every UNUSED element per level, so the tree fans out n × (n−1) × … × 1.
 * Output order is unspecified, so the harness sorts COPIES of got and want
 * (list order only — the order INSIDE a permutation is the answer itself)
 * before comparing; any correct generation order passes.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 232" width="500" height="232" role="img" aria-label="decision tree for permutations of [1 2 3]">' +
		'<text x="20" y="16" class="lbl">decision tree for nums = [1 2 3] — pick any unused element at each level</text>' +
		// edges root → level 1
		'<g stroke="var(--edge)">' +
		'<line x1="236" y1="50" x2="110" y2="78"/>' +
		'<line x1="250" y1="50" x2="250" y2="78"/>' +
		'<line x1="264" y1="50" x2="390" y2="78"/>' +
		// [1] → level 2
		'<line x1="90" y1="102" x2="62" y2="130"/>' +
		'<line x1="110" y1="102" x2="152" y2="130"/>' +
		'</g>' +
		// edge labels
		'<g class="lbl" text-anchor="middle">' +
		'<text x="152" y="66">pick 1</text><text x="264" y="70">pick 2</text><text x="352" y="66">pick 3</text>' +
		'<text x="48" y="122">pick 2</text><text x="158" y="122">pick 3</text>' +
		'</g>' +
		// root (path so far = [])
		'<rect x="225" y="26" width="50" height="24" rx="4" fill="var(--panel)" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="250" y="43" text-anchor="middle">[ ]</text>' +
		// level 1 nodes
		'<rect x="75" y="78" width="50" height="24" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="100" y="95" text-anchor="middle">[1]</text>' +
		'<rect x="225" y="78" width="50" height="24" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="250" y="95" text-anchor="middle">[2]</text>' +
		'<rect x="375" y="78" width="50" height="24" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="400" y="95" text-anchor="middle">[3]</text>' +
		// elided branches under [2] and [3]
		'<text x="250" y="148" text-anchor="middle" class="lbl">…</text>' +
		'<text x="400" y="148" text-anchor="middle" class="lbl">…</text>' +
		// level 2 under [1]
		'<rect x="30" y="130" width="56" height="24" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="58" y="147" text-anchor="middle">[1 2]</text>' +
		'<rect x="130" y="130" width="56" height="24" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="158" y="147" text-anchor="middle">[1 3]</text>' +
		'<text x="158" y="176" text-anchor="middle" class="lbl">…</text>' +
		// forced last pick: only 3 remains unused → leaf
		'<path d="M 58 156 L 58 178" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowPRM)"/>' +
		'<text x="100" y="172" class="lbl">only 3 left</text>' +
		'<rect x="26" y="182" width="64" height="24" rx="4" fill="var(--panel)" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="58" y="199" text-anchor="middle">[1 2 3]</text>' +
		'<text x="250" y="226" text-anchor="middle" class="lbl">3 × 2 × 1 = 6 leaves — every ordering, exactly once</text>' +
		'<defs><marker id="dgArrowPRM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'permutations',
		title: 'Permutations',
		nav: 'Permutations',
		difficulty: 'Medium',
		category: 'Backtracking',
		task: 'Implement permute — make all 5 tests pass.',

		prose: [
			'<h2>Permutations</h2>' +
			'<p>Given a slice of <em>distinct</em> integers <code>nums</code>, return ' +
			'<em>all possible permutations</em> — every ordering of the elements.</p>' +
			'<ul><li>All of the integers are distinct, so no two permutations are equal.</li>' +
			'<li>Return the permutations in <em>any order</em> — the tests sort copies of ' +
			'both your answer and the expected list before comparing, so any correct ' +
			'answer passes. (The order <em>inside</em> each permutation is, of course, ' +
			'exactly what is being asked for.)</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'permute([]int{1, 2, 3})  →  [[1 2 3] [1 3 2] [2 1 3] [2 3 1] [3 1 2] [3 2 1]]   // any order\npermute([]int{0, 1})     →  [[0 1] [1 0]]\npermute([]int{1})        →  [[1]]', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Build a permutation one slot at a time. For the first slot you have n ' +
			'choices; whichever you take is now <em>used</em>, so the next slot has n−1 ' +
			'choices, and so on down to 1. That is a decision tree whose n! leaves are ' +
			'exactly the permutations:</p>' +
			DIAGRAM +
			'<p>Backtracking walks the tree with one shared <code>path</code> and a ' +
			'<code>used</code> marker per element: choose, recurse, un-choose.</p>',
		],

		starter: [
			'package main',
			'',
			'// permute returns all possible permutations of nums (every ordering',
			'// of its elements). nums contains distinct integers. The list of',
			'// permutations may be returned in any order.',
			'func permute(nums []int) [][]int {',
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
			'	"sort"',
			')',
			'',
			LC.HARNESS_RT,
			'',
			'// normalizePerms makes permutation lists comparable regardless of the',
			'// order the solution generated them in: copy every permutation (never',
			'// mutate what the user returned) and sort the OUTER list',
			'// lexicographically. Crucially the inner slices are NOT sorted — the',
			'// element order inside a permutation IS the answer; sorting it would',
			'// collapse all n! permutations into one and let wrong answers pass.',
			'// Applied to both got and want, so ANY correct ordering compares equal.',
			'func normalizePerms(ps [][]int) [][]int {',
			'	out := make([][]int, 0, len(ps))',
			'	for _, p := range ps {',
			'		out = append(out, append([]int(nil), p...))',
			'	}',
			'	sort.Slice(out, func(i, j int) bool {',
			'		a, b := out[i], out[j]',
			'		for k := 0; k < len(a) && k < len(b); k++ {',
			'			if a[k] != b[k] {',
			'				return a[k] < b[k]',
			'			}',
			'		}',
			'		return len(a) < len(b)',
			'	})',
			'	return out',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		nums []int',
			'		want [][]int',
			'	}',
			'	cases := []tc{',
			'		{[]int{1, 2, 3}, [][]int{{1, 2, 3}, {1, 3, 2}, {2, 1, 3}, {2, 3, 1}, {3, 1, 2}, {3, 2, 1}}},',
			'		{[]int{0, 1}, [][]int{{0, 1}, {1, 0}}},',
			'		{[]int{1}, [][]int{{1}}},',
			'		{[]int{5, 4, 6}, [][]int{{5, 4, 6}, {5, 6, 4}, {4, 5, 6}, {4, 6, 5}, {6, 4, 5}, {6, 5, 4}}},',
			'		{[]int{-1, 7}, [][]int{{-1, 7}, {7, -1}}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v", c.nums),',
			'			"want":  fmt.Sprintf("%v (any order)", normalizePerms(c.want)),',
			'		}',
			'		runCase(r, func() {',
			'			got := permute(append([]int(nil), c.nums...))',
			'			r["pass"] = fmt.Sprintf("%v", normalizePerms(got)) == fmt.Sprintf("%v", normalizePerms(c.want))',
			'			r["got"] = fmt.Sprintf("%v", normalizePerms(got))',
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
			'// permute returns every ordering of nums (distinct integers).',
			'//',
			'// Backtracking with a used[] marker: each recursion level fills the',
			'// next slot of one shared path by trying every element not already',
			'// on it. The three-beat rhythm — choose (mark + push), explore',
			'// (recurse), un-choose (pop + unmark) — restores the state exactly,',
			'// so when the loop moves on to the next candidate the world looks',
			'// as if the previous choice never happened. used[] makes the',
			'// "is it already on the path?" check O(1) instead of an O(n) scan.',
			'func permute(nums []int) [][]int {',
			'	res := make([][]int, 0)',
			'	path := make([]int, 0, len(nums)) // the slots filled so far',
			'	used := make([]bool, len(nums))   // used[i] ⇔ nums[i] is on path',
			'',
			'	var walk func()',
			'	walk = func() {',
			'		if len(path) == len(nums) {',
			'			// Leaf: every slot filled — path IS one permutation.',
			'			// Append a COPY: path is one shared slice that the levels',
			'			// above keep push/popping after we return; storing it',
			'			// directly would alias a buffer that gets rewritten, and',
			'			// every "permutation" in res would end up identical.',
			'			res = append(res, append([]int(nil), path...))',
			'			return',
			'		}',
			'		for i, n := range nums {',
			'			if used[i] {',
			'				continue // already occupies an earlier slot',
			'			}',
			'			used[i] = true',
			'			path = append(path, n) // choose',
			'			walk()                 // explore',
			'			path = path[:len(path)-1]',
			'			used[i] = false // un-choose: state exactly as before',
			'		}',
			'	}',
			'	walk()',
			'	return res',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>From subsets to permutations</h3>' +
			'<p>Subsets asked a yes/no question <em>per element</em> (take or skip). Here ' +
			'every element must appear exactly once — the question is not <em>whether</em> ' +
			'but <em>where</em>. So instead of two branches per level, each level asks ' +
			'“which still-unused element fills the next slot?” and branches over all of ' +
			'them: n choices, then n−1, then n−2… giving n! leaves.</p>' +
			'<h3>The choose → explore → un-choose loop</h3>' +
			'<p>One shared <code>path</code> plus a <code>used</code> flag per element. ' +
			'The un-choose step is what makes the single shared state work — after trying ' +
			'a candidate, restore everything so the loop can try the next one from an ' +
			'identical starting point:</p>',
			{ code: 'for i, n := range nums {\n\tif used[i] {\n\t\tcontinue\n\t}\n\tused[i] = true\n\tpath = append(path, n) // choose\n\twalk()                 // explore this branch fully\n\tpath = path[:len(path)-1]\n\tused[i] = false        // un-choose — try the next candidate fresh\n}' },
			'<p>The details that bite people:</p>' +
			'<ul>' +
			'<li><strong>Copy at the leaf — the classic aliasing bug.</strong> ' +
			'<code>res = append(res, path)</code> stores a slice <em>header</em> pointing ' +
			'at the shared backing array; the pops and pushes that follow rewrite it, and ' +
			'you end up with n! copies of whatever the buffer held last. ' +
			'<code>append([]int(nil), path...)</code> snapshots the values.</li>' +
			'<li><strong>Un-choose both halves.</strong> Forgetting <code>used[i] = false</code> ' +
			'(or the pop) leaves the state corrupted for the loop’s next iteration — ' +
			'symptoms are missing permutations, not a crash, which makes it sneaky.</li>' +
			'<li><strong>Swap variant.</strong> The same tree can be walked by swapping ' +
			'<code>nums[pos]</code> with each <code>nums[i], i ≥ pos</code>, recursing, and ' +
			'swapping back — O(1) extra space, but the used[] version reads closer to the ' +
			'template that generalizes to combinations and constrained searches.</li>' +
			'<li><strong>Order is a non-issue.</strong> The tests sort copies of both lists ' +
			'before comparing, so any generation order passes.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n · n!)', space: 'O(n) beyond the output' },
	});
})();
