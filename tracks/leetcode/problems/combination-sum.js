/* Combination Sum — Backtracking (Medium). Backtracking with two twists on
 * the subsets template: a candidate may be reused any number of times (the
 * recursion passes i, not i+1), and duplicate COMBINATIONS are prevented
 * structurally by a start index — never revisit earlier candidates, so
 * [2 2 3] is reachable but [3 2 2] is not. Output order is unspecified, so
 * the harness normalizes copies of got and want (sort inside each combo,
 * then sort the list) before comparing.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="remaining-target chain for combination sum with candidates 2,3,6,7 and target 7">' +
		'<text x="20" y="16" class="lbl">candidates = [2 3 6 7], target = 7 — subtract as you choose; remaining 0 = a hit</text>' +
		// remaining-target boxes: 7 → 5 → 3 → 0
		'<g fill="var(--panel)">' +
		'<rect x="30" y="44" width="48" height="34" rx="4" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="150" y="44" width="48" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="270" y="44" width="48" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="390" y="44" width="48" height="34" rx="4" stroke="var(--ok)" stroke-width="2"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="54" y="66">7</text><text x="174" y="66">5</text><text x="294" y="66">3</text>' +
		'<text x="414" y="66" style="fill:var(--ok)">0 ✓</text>' +
		'</g>' +
		// choose arrows along the chain (note: reuse of 2 — same start index)
		'<g fill="none" stroke="var(--edge)" stroke-width="1.5">' +
		'<path d="M 82 61 L 146 61" marker-end="url(#dgArrowCSM)"/>' +
		'<path d="M 202 61 L 266 61" marker-end="url(#dgArrowCSM)"/>' +
		'</g>' +
		'<path d="M 322 61 L 386 61" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowCSMok)"/>' +
		'<g class="lbl" text-anchor="middle">' +
		'<text x="114" y="52">take 2</text><text x="234" y="52">take 2 again</text><text x="354" y="52">take 3</text>' +
		'</g>' +
		'<text x="390" y="100" class="lbl">path [2 2 3] recorded</text>' +
		// pruned branch: from remaining 3, taking another 2 overshoots
		'<path d="M 294 82 L 294 118" fill="none" stroke="var(--edge)" stroke-width="1.5" stroke-dasharray="4 3" marker-end="url(#dgArrowCSM)"/>' +
		'<rect x="270" y="122" width="48" height="30" rx="4" fill="var(--panel)" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'<text x="294" y="142" text-anchor="middle" class="lbl">1 ✗</text>' +
		'<text x="330" y="134" class="lbl">take 2 → overshoot next step: dead end, backtrack</text>' +
		'<text x="20" y="186" class="lbl">start index rule: reuse the CURRENT candidate or move right, never back — [2 2 3] appears once, [3 2 2] never</text>' +
		'<defs>' +
		'<marker id="dgArrowCSM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowCSMok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'combination-sum',
		title: 'Combination Sum',
		nav: 'Combination Sum',
		difficulty: 'Medium',
		category: 'Backtracking',
		task: 'Implement combinationSum — make all 5 tests pass.',

		prose: [
			'<h2>Combination Sum</h2>' +
			'<p>Given a slice of <em>distinct</em> positive integers <code>candidates</code> ' +
			'and a positive integer <code>target</code>, return <em>all unique combinations</em> ' +
			'of candidates that sum to <code>target</code>.</p>' +
			'<ul><li>The <em>same</em> candidate may be used an unlimited number of times.</li>' +
			'<li>Two combinations are the same if they use the same candidates with the same ' +
			'counts — <code>[2 2 3]</code> and <code>[3 2 2]</code> are one combination, and it ' +
			'must appear only once.</li>' +
			'<li>Return the combinations in <em>any order</em> (and in any order within each ' +
			'combination) — the tests normalize copies of both sides before comparing, so any ' +
			'correct answer passes.</li>' +
			'<li>If no combination reaches the target, return an empty list.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'combinationSum([]int{2, 3, 6, 7}, 7)  →  [[2 2 3] [7]]                 // any order\ncombinationSum([]int{2, 3, 5}, 8)     →  [[2 2 2 2] [2 3 3] [3 5]]\ncombinationSum([]int{2}, 1)           →  []                          // unreachable', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Backtrack on the <em>remaining</em> target: choosing a candidate subtracts it, ' +
			'hitting exactly 0 records the path, and overshooting abandons the branch. Reuse ' +
			'is just recursing without advancing the candidate index:</p>' +
			DIAGRAM +
			'<p>The start index kills duplicates before they exist: each combination can only ' +
			'be built in one canonical left-to-right order.</p>',
		],

		starter: [
			'package main',
			'',
			'// combinationSum returns all unique combinations of candidates that',
			'// sum to target. candidates holds distinct positive integers, and',
			'// each may be reused any number of times. The list (and each',
			'// combination) may be in any order; return an empty list if the',
			'// target is unreachable.',
			'func combinationSum(candidates []int, target int) [][]int {',
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
			'// normalizeCombos makes combination lists comparable regardless of',
			'// generation order: copy every combination (never mutate what the',
			'// user returned), sort each one — a combination is a multiset, so',
			'// internal order is irrelevant — then sort the list of combinations',
			'// lexicographically (shorter prefix first). Applied to both got and',
			'// want, so ANY correct answer compares equal.',
			'func normalizeCombos(cs [][]int) [][]int {',
			'	out := make([][]int, 0, len(cs))',
			'	for _, c := range cs {',
			'		cp := append([]int(nil), c...)',
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
			'		candidates []int',
			'		target     int',
			'		want       [][]int',
			'	}',
			'	cases := []tc{',
			'		{[]int{2, 3, 6, 7}, 7, [][]int{{2, 2, 3}, {7}}},',
			'		{[]int{2, 3, 5}, 8, [][]int{{2, 2, 2, 2}, {2, 3, 3}, {3, 5}}},',
			'		{[]int{2}, 1, [][]int{}},',
			'		{[]int{3}, 9, [][]int{{3, 3, 3}}},',
			'		{[]int{7, 3, 2}, 7, [][]int{{2, 2, 3}, {7}}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("candidates=%v, target=%d", c.candidates, c.target),',
			'			"want":  fmt.Sprintf("%v (any order)", normalizeCombos(c.want)),',
			'		}',
			'		runCase(r, func() {',
			'			got := combinationSum(append([]int(nil), c.candidates...), c.target)',
			'			r["pass"] = fmt.Sprintf("%v", normalizeCombos(got)) == fmt.Sprintf("%v", normalizeCombos(c.want))',
			'			r["got"] = fmt.Sprintf("%v", normalizeCombos(got))',
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
			'// combinationSum returns every unique multiset of candidates that',
			'// sums to target (unlimited reuse of each candidate).',
			'//',
			'// Backtracking on the remaining target with a start index. Two',
			'// design choices carry the whole solution:',
			'//',
			'//   1. Reuse: after taking cands[i] we recurse with start=i, NOT',
			'//      i+1 — the same candidate stays available. Advancing past it',
			'//      only happens when the loop moves on.',
			'//   2. No duplicates by construction: the loop never looks LEFT of',
			'//      start, so every combination is built in exactly one order',
			'//      (non-decreasing, since we sorted). [2 2 3] is reachable;',
			'//      [3 2 2] simply cannot be spelled — no dedup pass needed.',
			'//',
			'// Sorting also enables the prune: once cands[i] > remaining, every',
			'// later candidate is bigger still, so break — not continue.',
			'func combinationSum(candidates []int, target int) [][]int {',
			'	// Sort a copy so pruning works and callers keep their order.',
			'	cands := append([]int(nil), candidates...)',
			'	sort.Ints(cands)',
			'',
			'	res := [][]int{}',
			'	path := []int{} // candidates chosen on the current branch',
			'',
			'	var walk func(start, remaining int)',
			'	walk = func(start, remaining int) {',
			'		if remaining == 0 {',
			'			// Exact hit — snapshot the shared path (see Subsets:',
			'			// storing it directly would alias a buffer we keep',
			'			// rewriting on the way back up).',
			'			res = append(res, append([]int(nil), path...))',
			'			return',
			'		}',
			'		for i := start; i < len(cands); i++ {',
			'			if cands[i] > remaining {',
			'				break // sorted: everything to the right overshoots too',
			'			}',
			'			path = append(path, cands[i]) // choose',
			'			walk(i, remaining-cands[i])   // explore — i again: reuse OK',
			'			path = path[:len(path)-1]     // un-choose (backtrack)',
			'		}',
			'	}',
			'	walk(0, target)',
			'	return res',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The two problems inside the problem</h3>' +
			'<p>Plain take/skip backtracking (Subsets) breaks down here twice: an element ' +
			'may be taken <em>more than once</em>, and the output must contain each ' +
			'combination <em>exactly once</em> even though it could be assembled in many ' +
			'orders ([2 2 3], [2 3 2], [3 2 2]…). Both are solved by one parameter: a ' +
			'<code>start</code> index.</p>' +
			'<h3>Recurse on the remaining target</h3>',
			{ code: 'var walk func(start, remaining int)\nwalk = func(start, remaining int) {\n\tif remaining == 0 {\n\t\tres = append(res, append([]int(nil), path...)) // COPY the hit\n\t\treturn\n\t}\n\tfor i := start; i < len(cands); i++ {\n\t\tif cands[i] > remaining {\n\t\t\tbreak // sorted → all later candidates overshoot too\n\t\t}\n\t\tpath = append(path, cands[i])\n\t\twalk(i, remaining-cands[i]) // i, not i+1: reuse allowed\n\t\tpath = path[:len(path)-1]\n\t}\n}\nwalk(0, target)' },
			'<p>Why it works:</p>' +
			'<ul>' +
			'<li><strong>Reuse is <code>walk(i, …)</code>, not <code>walk(i+1, …)</code>.</strong> ' +
			'Staying at index i keeps the current candidate on the menu, so [2 2 2 2] is one ' +
			'branch that takes 2 four times. (In Combination Sum II, where each candidate is ' +
			'single-use, that one character changes to i+1 — the rest is identical.)</li>' +
			'<li><strong>The start index is the dedup.</strong> The loop never revisits ' +
			'candidates left of <code>start</code>, so every combination has exactly one ' +
			'spelling: non-decreasing order. No “generate then dedup with a set” pass, which ' +
			'would cost more than the search itself.</li>' +
			'<li><strong>Termination.</strong> Candidates are positive, so <code>remaining</code> ' +
			'strictly decreases on every choice — the recursion must bottom out at 0 (record) ' +
			'or negative territory (pruned before entering, thanks to the sorted ' +
			'<code>break</code>).</li>' +
			'<li><strong>Unreachable targets need no special case.</strong> Every branch dies ' +
			'in the pruning check and <code>res</code> is simply returned empty.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n^(T/m)) — tree depth T/m for smallest candidate m', space: 'O(T/m) recursion depth beyond the output' },
	});
})();
