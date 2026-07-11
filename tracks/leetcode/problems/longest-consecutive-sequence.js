/* Longest Consecutive Sequence — Arrays & Hashing (Medium). Looks like a
 * sorting problem, but the O(n) answer never sorts: dump everything into
 * a set, then count upward only from values that BEGIN a run (n-1 absent
 * from the set). The start-only guard is what keeps the double loop
 * linear — each value is walked over at most once across the whole scan.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="counting a consecutive run upward from its start">' +
		'<text x="20" y="16" class="lbl">nums = [100, 4, 200, 1, 3, 2] → set {1, 2, 3, 4, 100, 200}</text>' +
		// number line cells: 1 2 3 4 gap 100 gap 200
		'<g>' +
		'<rect x="20" y="36" width="44" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="70" y="36" width="44" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="120" y="36" width="44" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="170" y="36" width="44" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="250" y="36" width="52" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="330" y="36" width="52" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="42" y="58" text-anchor="middle">1</text>' +
		'<text x="92" y="58" text-anchor="middle">2</text>' +
		'<text x="142" y="58" text-anchor="middle">3</text>' +
		'<text x="192" y="58" text-anchor="middle">4</text>' +
		'<text x="276" y="58" text-anchor="middle">100</text>' +
		'<text x="356" y="58" text-anchor="middle">200</text>' +
		'<text x="228" y="58" text-anchor="middle" class="lbl">…</text>' +
		'<text x="312" y="58" text-anchor="middle" class="lbl">…</text>' +
		'</g>' +
		// start marker for 1
		'<text x="42" y="94" text-anchor="middle" style="fill:var(--accent)">start</text>' +
		'<text x="42" y="112" text-anchor="middle" class="lbl">0 ∉ set</text>' +
		// count-up arcs 1→2→3→4
		'<g fill="none" stroke="var(--ok)" stroke-width="1.5">' +
		'<path d="M 50 34 C 58 22 76 22 84 34" marker-end="url(#dgArrowLCS)"/>' +
		'<path d="M 100 34 C 108 22 126 22 134 34" marker-end="url(#dgArrowLCS)"/>' +
		'<path d="M 150 34 C 158 22 176 22 184 34" marker-end="url(#dgArrowLCS)"/>' +
		'</g>' +
		// non-starts
		'<text x="276" y="94" text-anchor="middle" class="lbl">start too</text>' +
		'<text x="276" y="112" text-anchor="middle" class="lbl">run of 1</text>' +
		'<text x="356" y="94" text-anchor="middle" class="lbl">start too</text>' +
		'<text x="356" y="112" text-anchor="middle" class="lbl">run of 1</text>' +
		// skip annotation: 2,3,4 never start a count
		'<text x="142" y="94" text-anchor="middle" class="lbl">2, 3, 4 are skipped as starts (n−1 is in the set)</text>' +
		'<text x="20" y="150" style="fill:var(--ok)">longest run: 1 → 2 → 3 → 4, length 4</text>' +
		'<text x="20" y="174" class="lbl">every value is visited at most twice — the scan stays O(n)</text>' +
		'<defs><marker id="dgArrowLCS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'longest-consecutive-sequence',
		title: 'Longest Consecutive Sequence',
		nav: 'Longest Consecutive',
		difficulty: 'Medium',
		category: 'Arrays & Hashing',
		task: 'Implement longestConsecutive — make all 6 tests pass.',

		prose: [
			'<h2>Longest Consecutive Sequence</h2>' +
			'<p>Given an unsorted slice of integers <code>nums</code>, return the length of ' +
			'the longest run of <em>consecutive</em> values (e.g. <code>3, 4, 5, 6</code>) ' +
			'that can be formed from its elements — regardless of where they sit in the ' +
			'slice.</p>' +
			'<ul><li>The algorithm must run in O(n) time — so sorting is off the table.</li>' +
			'<li>Duplicates may appear; they don’t lengthen a run.</li>' +
			'<li>An empty slice has answer 0.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'longestConsecutive([]int{100, 4, 200, 1, 3, 2})  →  4   // the run 1,2,3,4\nlongestConsecutive([]int{1, 2, 0, 1})            →  3   // the run 0,1,2 (dup 1 ignored)', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Put every value in a set — now “is <code>n+1</code> present?” is O(1), and a ' +
			'run can be counted upward from its start. The trick that keeps it linear: only ' +
			'count from values that <em>begin</em> a run, i.e. where <code>n−1</code> is ' +
			'<strong>not</strong> in the set. Everything mid-run is skipped as a starting ' +
			'point and only ever visited by its own run’s upward walk:</p>' +
			DIAGRAM +
			'<p>Sorting would be O(n log n); the set + start-guard does it in O(n).</p>',
		],

		starter: [
			'package main',
			'',
			'// longestConsecutive returns the length of the longest run of',
			'// consecutive integers formable from nums (order and duplicates in',
			'// the slice are irrelevant). Must run in O(n).',
			'func longestConsecutive(nums []int) int {',
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
			'		{[]int{100, 4, 200, 1, 3, 2}, 4},',
			'		{[]int{0, 3, 7, 2, 5, 8, 4, 6, 0, 1}, 9},',
			'		{[]int{}, 0},',
			'		{[]int{1, 2, 0, 1}, 3},',
			'		{[]int{9}, 1},',
			'		{[]int{-1, -3, -2}, 3},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v", c.nums),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := longestConsecutive(append([]int(nil), c.nums...))',
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
			'// longestConsecutive returns the length of the longest run of',
			'// consecutive integers formable from nums, in O(n).',
			'//',
			'// Plan: load all values into a set (which also collapses',
			'// duplicates), then for each value that STARTS a run — meaning n−1',
			'// is absent — walk upward counting members. The start-only guard is',
			'// the whole complexity argument: a run of length L is walked exactly',
			'// once (from its start), never re-walked from its middle, so the',
			'// total work across all upward walks is bounded by the set size.',
			'func longestConsecutive(nums []int) int {',
			'	// Membership set; struct{} values cost nothing, and inserting',
			'	// duplicates is a harmless overwrite.',
			'	set := make(map[int]struct{}, len(nums))',
			'	for _, n := range nums {',
			'		set[n] = struct{}{}',
			'	}',
			'',
			'	best := 0',
			'	for n := range set {',
			'		// Only sequence starts may launch a count. If n−1 exists,',
			'		// n sits mid-run and its run will be (or was) counted from',
			'		// its true start — recounting from here would turn the scan',
			'		// quadratic on inputs like a single long run.',
			'		if _, ok := set[n-1]; ok {',
			'			continue',
			'		}',
			'		length := 1',
			'		for {',
			'			if _, ok := set[n+length]; !ok {',
			'				break',
			'			}',
			'			length++',
			'		}',
			'		if length > best {',
			'			best = length',
			'		}',
			'	}',
			'	return best // 0 for an empty slice: the range loop never runs',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The sorting instinct</h3>' +
			'<p>Sort, then scan for the longest stretch of adjacent values differing by 1 ' +
			'(skipping equal neighbours). Completely valid — but it’s O(n log n), and the ' +
			'problem explicitly asks for O(n). The follow-up question is really: what does ' +
			'sorting buy you here, and can a hash set buy the same thing cheaper?</p>' +
			'<h3>A set answers “is n+1 here?” — that’s all a run is</h3>' +
			'<p>With every value in a set, a run is just repeated O(1) lookups: ' +
			'<code>n, n+1, n+2, …</code> until a gap. The naive version walks upward from ' +
			'<em>every</em> value — O(n²) on one long run, because each element re-counts ' +
			'its whole tail. The fix is one guard:</p>',
			{ code: 'for n := range set {\n\tif _, ok := set[n-1]; ok {\n\t\tcontinue // mid-run: not a start, skip\n\t}\n\tlength := 1\n\tfor {\n\t\tif _, ok := set[n+length]; !ok {\n\t\t\tbreak\n\t\t}\n\t\tlength++\n\t}\n\tif length > best {\n\t\tbest = length\n\t}\n}' },
			'<p>Why this works, and the edges it quietly handles:</p>' +
			'<ul>' +
			'<li><strong>The amortized argument.</strong> Each upward walk starts only at a ' +
			'run’s first element, so every set member is stepped on by exactly one walk. ' +
			'Outer loop O(n) + all walks O(n) combined = O(n) total, despite the nested loop ' +
			'shape.</li>' +
			'<li><strong>Duplicates vanish in the set.</strong> <code>[1,2,0,1]</code> ' +
			'becomes <code>{0,1,2}</code> before any counting happens — a repeated value ' +
			'can neither lengthen a run nor trigger a second walk.</li>' +
			'<li><strong>Empty input costs nothing.</strong> The set is empty, the loop body ' +
			'never runs, and <code>best</code> stays 0.</li>' +
			'<li><strong>Negatives are just numbers.</strong> <code>{−3,−2,−1}</code> is a ' +
			'run of 3; nothing in the set logic cares about sign.</li>' +
			'<li><strong>Iterate the set, not the slice.</strong> Ranging over the ' +
			'deduplicated set (rather than <code>nums</code>) means duplicate-heavy inputs ' +
			'don’t even pay for repeated guard checks.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(n)' },
	});
})();
