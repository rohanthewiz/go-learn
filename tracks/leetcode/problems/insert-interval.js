/* Insert Interval — Intervals (Medium). Merge Intervals' follow-up: the
 * input is ALREADY sorted and non-overlapping, so no sort is needed — the
 * result is three contiguous zones (strictly before, overlapping, strictly
 * after) and one linear pass with three loops emits them in order. The
 * only interval that ever grows is the new one.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// intervals = [1,2],[3,5],[6,7],[8,10],[12,16], newInterval = [4,8]:
	// [3,5],[6,7],[8,10] all touch [4,8] and fuse into [3,10]; [1,2] and
	// [12,16] pass through untouched. Time→x mapping: x = 20 + 28*t.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="new interval absorbing every overlapping interval on a number line">' +
		'<text x="20" y="16" class="lbl">already sorted &amp; disjoint · three zones: before | overlap | after</text>' +
		// input row: existing intervals
		'<text x="20" y="42" class="lbl">input</text>' +
		'<g fill="none" stroke-width="6" stroke-linecap="round">' +
		'<line x1="48" y1="56" x2="76" y2="56" stroke="var(--edge)"/>' +   // [1,2]
		'<line x1="104" y1="56" x2="160" y2="56" stroke="var(--edge)"/>' + // [3,5]
		'<line x1="188" y1="56" x2="216" y2="56" stroke="var(--edge)"/>' + // [6,7]
		'<line x1="244" y1="56" x2="300" y2="56" stroke="var(--edge)"/>' + // [8,10]
		'<line x1="356" y1="56" x2="468" y2="56" stroke="var(--edge)"/>' + // [12,16]
		'</g>' +
		// the new interval on its own lane
		'<g fill="none" stroke-width="6" stroke-linecap="round">' +
		'<line x1="132" y1="78" x2="244" y2="78" stroke="var(--accent)"/>' + // [4,8]
		'</g>' +
		'<text x="188" y="98" text-anchor="middle" style="fill:var(--accent)">new [4,8]</text>' +
		'<text x="330" y="98" text-anchor="middle" class="lbl">overlaps [3,5], [6,7], [8,10]</text>' +
		// absorb arrow into the merged row
		'<path d="M 188 104 C 188 112 190 116 194 122" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowII)"/>' +
		// merged row
		'<text x="20" y="118" class="lbl">merged</text>' +
		'<g fill="none" stroke-width="6" stroke-linecap="round">' +
		'<line x1="48" y1="132" x2="76" y2="132" stroke="var(--ok)"/>' +     // [1,2]
		'<line x1="104" y1="132" x2="300" y2="132" stroke="var(--accent)"/>' + // [3,10]
		'<line x1="356" y1="132" x2="468" y2="132" stroke="var(--ok)"/>' +   // [12,16]
		'</g>' +
		'<text x="62" y="118" text-anchor="middle" style="fill:var(--ok)">[1,2]</text>' +
		'<text x="238" y="118" text-anchor="middle" style="fill:var(--accent)">[3,10]</text>' +
		'<text x="412" y="118" text-anchor="middle" style="fill:var(--ok)">[12,16]</text>' +
		// number line with ticks
		'<line x1="20" y1="152" x2="480" y2="152" stroke="var(--edge)"/>' +
		'<g class="lbl" text-anchor="middle">' +
		'<text x="48" y="170">1</text><text x="104" y="170">3</text>' +
		'<text x="132" y="170">4</text><text x="244" y="170">8</text>' +
		'<text x="300" y="170">10</text><text x="356" y="170">12</text>' +
		'<text x="468" y="170">16</text>' +
		'</g>' +
		'<text x="20" y="188" class="lbl">start = min(3, 4) · end = max(10, 8) — the new interval swallows everything it touches</text>' +
		'<defs><marker id="dgArrowII" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'insert-interval',
		title: 'Insert Interval',
		nav: 'Insert Interval',
		difficulty: 'Medium',
		category: 'Intervals',
		task: 'Implement insert — make all 5 tests pass.',

		prose: [
			'<h2>Insert Interval</h2>' +
			'<p>You are given <code>intervals</code>, a slice of <code>[start, end]</code> ' +
			'pairs <em>sorted by start</em> and pairwise <em>non-overlapping</em>, plus a ' +
			'single <code>newInterval</code>. Insert <code>newInterval</code> so the ' +
			'result is still sorted and non-overlapping — merging where necessary — and ' +
			'return it.</p>' +
			'<ul><li><code>intervals</code> may be empty.</li>' +
			'<li>Touching counts as overlapping: inserting <code>[4,8]</code> next to ' +
			'<code>[8,10]</code> merges them.</li>' +
			'<li>The input is already sorted — a full re-sort (or calling your ' +
			'Merge Intervals solution) works but wastes that guarantee. Aim for one ' +
			'O(n) pass.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'insert([][]int{{1, 3}, {6, 9}}, []int{2, 5})  →  [[1 5] [6 9]]\ninsert([][]int{{1, 2}, {3, 5}, {6, 7}, {8, 10}, {12, 16}}, []int{4, 8})\n                                              →  [[1 2] [3 10] [12 16]]', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Because the input is sorted and disjoint, <code>newInterval</code> splits ' +
			'it into three contiguous zones: intervals that end <em>before</em> it starts ' +
			'(copy through), intervals that <em>overlap</em> it (fuse them into it, ' +
			'widening its start and end), and intervals that begin <em>after</em> it ends ' +
			'(copy through):</p>' +
			DIAGRAM +
			'<p>Three loops in sequence, each a single comparison per interval — no ' +
			'sorting, no second pass.</p>',
		],

		starter: [
			'package main',
			'',
			'// insert adds newInterval to intervals — a slice of [start, end]',
			'// pairs sorted by start and pairwise non-overlapping — merging',
			'// overlaps so the result is again sorted and non-overlapping.',
			'// Touching counts as overlapping: [4,8] and [8,10] merge.',
			'// intervals may be empty.',
			'func insert(intervals [][]int, newInterval []int) [][]int {',
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
			')',
			'',
			LC.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		intervals [][]int',
			'		newIv     []int',
			'		want      [][]int',
			'	}',
			'	cases := []tc{',
			'		{[][]int{{1, 3}, {6, 9}}, []int{2, 5}, [][]int{{1, 5}, {6, 9}}},              // overlaps the first only',
			'		{[][]int{{1, 2}, {3, 5}, {6, 7}, {8, 10}, {12, 16}}, []int{4, 8},',
			'			[][]int{{1, 2}, {3, 10}, {12, 16}}},                                       // fuses three middle intervals',
			'		{[][]int{}, []int{5, 7}, [][]int{{5, 7}}},                                     // empty input',
			'		{[][]int{{1, 2}, {5, 6}}, []int{3, 4}, [][]int{{1, 2}, {3, 4}, {5, 6}}},       // no overlap: slots into the gap',
			'		{[][]int{{3, 4}, {7, 8}}, []int{1, 10}, [][]int{{1, 10}}},                     // newInterval swallows everything',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("intervals=%v, new=%v", c.intervals, c.newIv),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Deep clone (outer slice AND each pair, AND newInterval):',
			'			// a solution may alias or widen the pairs it was handed, so',
			'			// shallow copies would let it corrupt the shared test data.',
			'			in := make([][]int, len(c.intervals))',
			'			for i, iv := range c.intervals {',
			'				in[i] = append([]int(nil), iv...)',
			'			}',
			'			got := insert(in, append([]int(nil), c.newIv...))',
			'			r["pass"] = fmt.Sprintf("%v", got) == fmt.Sprintf("%v", c.want)',
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
			'// insert places newInterval into a sorted, non-overlapping interval',
			'// slice, merging where it overlaps.',
			'//',
			'// Sortedness means the intervals overlapping newInterval form ONE',
			'// contiguous run, so the input decomposes into three zones:',
			'//',
			'//   [ ends before new ) [ overlaps new ] ( starts after new ]',
			'//     copy through        fuse into new     copy through',
			'//',
			'// Three loops over a single index i walk those zones in order.',
			'// Only the middle zone does arithmetic: each overlapping interval',
			'// widens newInterval (min start / max end) and disappears. No',
			'// sorting — the O(n log n) of Merge Intervals came entirely from',
			'// its unsorted input, and this problem hands us the order for free.',
			'func insert(intervals [][]int, newInterval []int) [][]int {',
			'	out := make([][]int, 0, len(intervals)+1)',
			'	i, n := 0, len(intervals)',
			'',
			'	// Zone 1 — strictly before: ends before newInterval starts.',
			'	// Strict <, because touching (end == new start) must merge.',
			'	for i < n && intervals[i][1] < newInterval[0] {',
			'		out = append(out, intervals[i])',
			'		i++',
			'	}',
			'',
			'	// Zone 2 — overlap: starts no later than newInterval ends.',
			'	// Work on fresh variables (not newInterval[0/1]) so we never',
			'	// write into the caller\'s slice.',
			'	start, end := newInterval[0], newInterval[1]',
			'	for i < n && intervals[i][0] <= end {',
			'		// The FIRST overlapper has the smallest start (sorted input),',
			'		// but min/max on every round keeps the loop uniform.',
			'		if intervals[i][0] < start {',
			'			start = intervals[i][0]',
			'		}',
			'		if intervals[i][1] > end {',
			'			end = intervals[i][1]',
			'		}',
			'		i++',
			'	}',
			'	out = append(out, []int{start, end})',
			'',
			'	// Zone 3 — strictly after: everything left starts past end.',
			'	out = append(out, intervals[i:]...)',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Append <code>newInterval</code>, then run Merge Intervals: sort by start ' +
			'and sweep. Correct, and a fine interview fallback — but it re-derives with an ' +
			'O(n log n) sort a fact the problem already guarantees: the input is sorted ' +
			'and disjoint. The follow-up is to exploit that guarantee for O(n).</p>' +
			'<h3>Three zones, three loops</h3>' +
			'<p>In a sorted, disjoint slice, the intervals that overlap ' +
			'<code>newInterval</code> are consecutive — everything before them ends too ' +
			'early, everything after starts too late. So classify each interval with one ' +
			'comparison and emit the result in order:</p>',
			{ code: '// zone 1: ends before new starts — copy through\nfor i < n && intervals[i][1] < newInterval[0] {\n\tout = append(out, intervals[i]); i++\n}\n\n// zone 2: overlaps — fuse into [start, end]\nstart, end := newInterval[0], newInterval[1]\nfor i < n && intervals[i][0] <= end {\n\tif intervals[i][0] < start { start = intervals[i][0] }\n\tif intervals[i][1] > end   { end = intervals[i][1] }\n\ti++\n}\nout = append(out, []int{start, end})\n\n// zone 3: starts after new ends — copy through\nout = append(out, intervals[i:]...)' },
			'<p>The boundaries carry all the correctness:</p>' +
			'<ul>' +
			'<li><strong>Zone 1 uses strict <code>&lt;</code>.</strong> An interval ending ' +
			'exactly where <code>newInterval</code> starts <em>touches</em> it and must ' +
			'merge, so it may not slip through as “before”.</li>' +
			'<li><strong>Zone 2’s test is against the <em>growing</em> ' +
			'<code>end</code>.</strong> As overlappers fuse in, <code>end</code> can ' +
			'stretch rightward and capture intervals that didn’t overlap the ' +
			'<em>original</em> <code>newInterval</code> — with <code>[4,8]</code> ' +
			'absorbing <code>[8,10]</code>, the end becomes 10. (With sorted <em>and ' +
			'disjoint</em> input the original end actually suffices, but testing the ' +
			'grown one is the version that stays correct if the disjointness guarantee ' +
			'is ever relaxed.)</li>' +
			'<li><strong>Both extremes are ordinary.</strong> Empty input: zones 1 and 3 ' +
			'run zero times and the answer is <code>[[start end]]</code>. ' +
			'<code>newInterval</code> swallowing everything: zone 2 consumes the whole ' +
			'slice. Neither needs a special case.</li>' +
			'<li><strong>Fresh <code>start</code>/<code>end</code> variables</strong> keep ' +
			'the function from writing into the caller’s <code>newInterval</code> slice — ' +
			'mutating your arguments is a side effect nobody asked for.</li>' +
			'</ul>' +
			'<p>One pass, one appended pair: O(n) time, O(n) only for the output itself. ' +
			'The three-zone decomposition returns in scheduling problems constantly — ' +
			'“what does this new booking collide with?” is exactly zone 2.</p>',
		],
		complexity: { time: 'O(n)', space: 'O(n)' },
	});
})();
