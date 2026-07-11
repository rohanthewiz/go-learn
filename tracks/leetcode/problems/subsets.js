/* Subsets — Backtracking (Medium). The track's first backtracking problem,
 * so the prose draws the full decision tree: at every element you either
 * take it or skip it, and the 2^n leaves of that tree ARE the power set.
 * Output order is unspecified, so the harness normalizes both got and want
 * (sort each subset, then sort the list) before comparing — any correct
 * answer passes regardless of generation order.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="decision tree for subsets of [1 2]">' +
		'<text x="20" y="16" class="lbl">decision tree for nums = [1 2] — take or skip at each level</text>' +
		// edges root → level 1
		'<g stroke="var(--edge)">' +
		'<line x1="238" y1="52" x2="148" y2="86"/>' +
		'<line x1="262" y1="52" x2="352" y2="86"/>' +
		// level 1 → leaves
		'<line x1="128" y1="112" x2="78" y2="146"/>' +
		'<line x1="152" y1="112" x2="202" y2="146"/>' +
		'<line x1="332" y1="112" x2="282" y2="146"/>' +
		'<line x1="356" y1="112" x2="406" y2="146"/>' +
		'</g>' +
		// edge labels
		'<g class="lbl" text-anchor="middle">' +
		'<text x="176" y="66">take 1</text><text x="326" y="66">skip 1</text>' +
		'<text x="82" y="132">take 2</text><text x="192" y="132">skip 2</text>' +
		'<text x="288" y="132">take 2</text><text x="398" y="132">skip 2</text>' +
		'</g>' +
		// root (path so far = [])
		'<rect x="225" y="28" width="50" height="24" rx="4" fill="var(--panel)" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="250" y="45" text-anchor="middle">[ ]</text>' +
		// level 1 nodes
		'<rect x="115" y="88" width="50" height="24" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="140" y="105" text-anchor="middle">[1]</text>' +
		'<rect x="319" y="88" width="50" height="24" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="344" y="105" text-anchor="middle">[ ]</text>' +
		// leaves — the four subsets
		'<g fill="var(--panel)" stroke="var(--ok)" stroke-width="1.6">' +
		'<rect x="40" y="148" width="60" height="24" rx="4"/>' +
		'<rect x="180" y="148" width="50" height="24" rx="4"/>' +
		'<rect x="260" y="148" width="50" height="24" rx="4"/>' +
		'<rect x="386" y="148" width="50" height="24" rx="4"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="70" y="165">[1 2]</text><text x="205" y="165">[1]</text>' +
		'<text x="285" y="165">[2]</text><text x="411" y="165">[ ]</text>' +
		'</g>' +
		'<text x="250" y="192" text-anchor="middle" class="lbl">2 choices × 2 choices = 4 leaves = every subset, exactly once</text>' +
		'</svg>';

	LC.problem({
		id: 'subsets',
		title: 'Subsets',
		nav: 'Subsets',
		difficulty: 'Medium',
		category: 'Backtracking',
		task: 'Implement subsets — make all 5 tests pass.',

		prose: [
			'<h2>Subsets</h2>' +
			'<p>Given a slice of <em>distinct</em> integers <code>nums</code>, return ' +
			'<em>all possible subsets</em> (the power set).</p>' +
			'<ul><li>The solution set must not contain duplicate subsets.</li>' +
			'<li>Return the subsets in <em>any order</em> — the tests normalize before ' +
			'comparing (each subset is sorted, then the list of subsets is sorted), so ' +
			'any correct answer passes.</li>' +
			'<li>The empty slice has exactly one subset: the empty subset, so the answer ' +
			'is <code>[[]]</code>, never <code>[]</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'subsets([]int{1, 2, 3})  →  [[] [1] [2] [3] [1 2] [1 3] [2 3] [1 2 3]]   // any order\nsubsets([]int{0})        →  [[] [0]]\nsubsets([]int{})         →  [[]]', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>A subset is fully described by one yes/no decision <em>per element</em>: ' +
			'in or out. Make those decisions one at a time and you get a binary decision ' +
			'tree — each root-to-leaf path is one subset, and the 2ⁿ leaves are ' +
			'<em>all</em> of them, each exactly once:</p>' +
			DIAGRAM +
			'<p>Backtracking walks this tree with a single shared <code>path</code> slice: ' +
			'push the element, explore, pop it, explore again.</p>',
		],

		starter: [
			'package main',
			'',
			'// subsets returns all possible subsets (the power set) of nums.',
			'// nums contains distinct integers. Subsets may be returned in any',
			'// order; the empty set counts, so subsets of an empty slice is [[]].',
			'func subsets(nums []int) [][]int {',
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
			'// normalizeSubsets makes subset lists comparable regardless of the',
			'// order the solution generated them in: copy every subset (never',
			'// mutate what the user returned), sort each one, then sort the list',
			'// of subsets lexicographically (shorter prefix first). Applied to',
			'// both got and want, so ANY correct answer compares equal.',
			'func normalizeSubsets(ss [][]int) [][]int {',
			'	out := make([][]int, 0, len(ss))',
			'	for _, s := range ss {',
			'		cp := append([]int(nil), s...)',
			'		sort.Ints(cp)',
			'		out = append(out, cp)',
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
			'		{[]int{1, 2, 3}, [][]int{{}, {1}, {2}, {3}, {1, 2}, {1, 3}, {2, 3}, {1, 2, 3}}},',
			'		{[]int{0}, [][]int{{}, {0}}},',
			'		{[]int{}, [][]int{{}}},',
			'		{[]int{9, 3}, [][]int{{}, {9}, {3}, {3, 9}}},',
			'		{[]int{5, 1, 6}, [][]int{{}, {5}, {1}, {6}, {1, 5}, {5, 6}, {1, 6}, {1, 5, 6}}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v", c.nums),',
			'			"want":  fmt.Sprintf("%v (any order)", normalizeSubsets(c.want)),',
			'		}',
			'		runCase(r, func() {',
			'			got := subsets(append([]int(nil), c.nums...))',
			'			r["pass"] = fmt.Sprintf("%v", normalizeSubsets(got)) == fmt.Sprintf("%v", normalizeSubsets(c.want))',
			'			r["got"] = fmt.Sprintf("%v", normalizeSubsets(got))',
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
			'// subsets returns the power set of nums (distinct integers).',
			'//',
			'// Classic include/skip backtracking: at position pos the recursion',
			'// branches twice — once with nums[pos] appended to the shared path,',
			'// once without — so every root-to-leaf route through the decision',
			'// tree spells out exactly one subset. One shared path slice is',
			'// mutated in place (push, recurse, pop), which is why the leaf must',
			'// COPY it before recording: every level above will keep rewriting',
			'// the same backing array after we return.',
			'func subsets(nums []int) [][]int {',
			'	res := [][]int{}',
			'	path := []int{} // the choices made so far on the current tree branch',
			'',
			'	var walk func(pos int)',
			'	walk = func(pos int) {',
			'		if pos == len(nums) {',
			'			// Leaf: all n decisions made — path IS one subset.',
			'			// Snapshot it; the shared slice keeps changing after this.',
			'			res = append(res, append([]int(nil), path...))',
			'			return',
			'		}',
			'		// Branch 1: take nums[pos].',
			'		path = append(path, nums[pos])',
			'		walk(pos + 1)',
			'		path = path[:len(path)-1] // backtrack: undo the choice',
			'		// Branch 2: skip nums[pos].',
			'		walk(pos + 1)',
			'	}',
			'	walk(0)',
			'	return res',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why not iterate bitmasks?</h3>' +
			'<p>There is a cute non-recursive answer: every subset of n elements matches an ' +
			'n-bit number (bit i set ⇔ take <code>nums[i]</code>), so counting from 0 to ' +
			'2ⁿ−1 and reading bits enumerates the power set. It works — but it does not ' +
			'generalize. Add a constraint (“subsets that sum to k”, “combinations of size ' +
			'r”, permutations) and the bitmask trick dies while backtracking barely ' +
			'changes. This problem is the cleanest place to learn the pattern.</p>' +
			'<h3>The backtracking template</h3>' +
			'<p>Keep one shared <code>path</code> (the choices made so far) and a position ' +
			'<code>pos</code> (the next decision to make). At each position, try a choice, ' +
			'recurse, then <em>undo it</em> — that undo is the “backtrack”:</p>',
			{ code: 'var walk func(pos int)\nwalk = func(pos int) {\n\tif pos == len(nums) {\n\t\tres = append(res, append([]int(nil), path...)) // COPY the leaf\n\t\treturn\n\t}\n\tpath = append(path, nums[pos]) // choose\n\twalk(pos + 1)                  // explore\n\tpath = path[:len(path)-1]      // un-choose (backtrack)\n\twalk(pos + 1)                  // explore the other branch\n}\nwalk(0)' },
			'<p>The details that bite people:</p>' +
			'<ul>' +
			'<li><strong>Copy at the leaf.</strong> <code>path</code> is one shared slice; ' +
			'appending it directly stores an alias into <code>res</code> that later ' +
			'push/pop operations rewrite. <code>append([]int(nil), path...)</code> ' +
			'snapshots it.</li>' +
			'<li><strong>Every leaf is distinct.</strong> Two different root-to-leaf paths ' +
			'differ in at least one take/skip decision, so no dedup is needed — the inputs ' +
			'are distinct by contract.</li>' +
			'<li><strong>The empty input still has a leaf.</strong> With n=0 the recursion ' +
			'hits the base case immediately and records the empty path: the answer is ' +
			'<code>[[]]</code>, one subset, not zero.</li>' +
			'<li><strong>Order is a non-issue.</strong> The tests sort both sides before ' +
			'comparing, so take-first or skip-first traversal both pass.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n · 2ⁿ)', space: 'O(n) beyond the output' },
	});
})();
