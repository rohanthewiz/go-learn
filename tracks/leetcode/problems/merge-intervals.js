/* Merge Intervals — Intervals (Medium). The archetype of the interval
 * pattern: sort by start, then a single left-to-right sweep where each new
 * interval either extends the last merged one or opens a fresh one. First
 * Intervals problem in the track, so the prose spells out why sorting makes
 * the one-pass sweep sufficient. Touching intervals ([1,4],[4,5]) merge.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="intervals on a number line merging after sorting by start">' +
		'<text x="20" y="16" class="lbl">sorted by start · sweep left to right</text>' +
		// number line (t → x: x = 20 + t*25, t in 0..18)
		'<line x1="20" y1="150" x2="475" y2="150" stroke="var(--edge)"/>' +
		'<g class="lbl" text-anchor="middle">' +
		'<text x="45" y="168">1</text><text x="170" y="168">6</text>' +
		'<text x="220" y="168">8</text><text x="270" y="168">10</text>' +
		'<text x="395" y="168">15</text><text x="470" y="168">18</text>' +
		'</g>' +
		// input row: [1,3] then [2,6] overlapping
		'<text x="20" y="42" class="lbl">input</text>' +
		'<g fill="none" stroke-width="6" stroke-linecap="round">' +
		'<line x1="45" y1="56" x2="95" y2="56" stroke="var(--edge)"/>' +      // [1,3]
		'<line x1="70" y1="72" x2="170" y2="72" stroke="var(--edge)"/>' +     // [2,6]
		'<line x1="220" y1="56" x2="270" y2="56" stroke="var(--edge)"/>' +    // [8,10]
		'<line x1="395" y1="56" x2="470" y2="56" stroke="var(--edge)"/>' +    // [15,18]
		'</g>' +
		'<text x="105" y="47" class="lbl">1–3 and 2–6 overlap (2 ≤ 3)</text>' +
		// merged row
		'<text x="20" y="112" class="lbl">merged</text>' +
		'<g fill="none" stroke-width="6" stroke-linecap="round">' +
		'<line x1="45" y1="126" x2="170" y2="126" stroke="var(--accent)"/>' + // [1,6]
		'<line x1="220" y1="126" x2="270" y2="126" stroke="var(--ok)"/>' +    // [8,10]
		'<line x1="395" y1="126" x2="470" y2="126" stroke="var(--ok)"/>' +    // [15,18]
		'</g>' +
		'<text x="107" y="112" text-anchor="middle" style="fill:var(--accent)">[1,6]</text>' +
		'<text x="245" y="112" text-anchor="middle" style="fill:var(--ok)">[8,10]</text>' +
		'<text x="432" y="112" text-anchor="middle" style="fill:var(--ok)">[15,18]</text>' +
		// extend arrow: end 3 stretched to 6
		'<path d="M 95 62 C 120 88 140 108 162 120" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowMI)"/>' +
		'<text x="150" y="92" class="lbl">extend end: max(3, 6)</text>' +
		'<defs><marker id="dgArrowMI" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'merge-intervals',
		title: 'Merge Intervals',
		nav: 'Merge Intervals',
		difficulty: 'Medium',
		category: 'Intervals',
		task: 'Implement merge — make all 5 tests pass.',

		prose: [
			'<h2>Merge Intervals</h2>' +
			'<p>Given a slice of intervals where <code>intervals[i] = [startᵢ, endᵢ]</code>, ' +
			'merge all overlapping intervals and return the non-overlapping intervals that ' +
			'cover exactly the same ranges, <em>sorted by start</em>.</p>' +
			'<ul><li>The input is in no particular order.</li>' +
			'<li>Intervals that merely <em>touch</em> merge too: <code>[1,4]</code> and ' +
			'<code>[4,5]</code> become <code>[1,5]</code>.</li>' +
			'<li>An interval fully inside another (<code>[2,3]</code> in <code>[1,4]</code>) ' +
			'disappears into it.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'merge([][]int{{2, 6}, {1, 3}, {15, 18}, {8, 10}})  →  [[1 6] [8 10] [15 18]]\nmerge([][]int{{1, 4}, {4, 5}})                     →  [[1 5]]', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>In arbitrary order, any interval might overlap any other — that smells like ' +
			'O(n²) pair checks. <em>Sort by start</em> and the chaos collapses: every interval ' +
			'that can touch the one you are building must come next in line, so a single ' +
			'sweep suffices — each new interval either <em>extends</em> the last merged one ' +
			'or <em>starts</em> a new one:</p>' +
			DIAGRAM +
			'<p>Sort once, sweep once. The sort is the algorithm; the loop is bookkeeping.</p>',
		],

		starter: [
			'package main',
			'',
			'// merge collapses all overlapping intervals ([start, end] pairs,',
			'// given in no particular order) and returns the non-overlapping',
			'// result sorted by start. Touching counts as overlapping:',
			'// [1,4] and [4,5] merge into [1,5].',
			'func merge(intervals [][]int) [][]int {',
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
			'		want      [][]int',
			'	}',
			'	cases := []tc{',
			'		{[][]int{{2, 6}, {1, 3}, {15, 18}, {8, 10}}, [][]int{{1, 6}, {8, 10}, {15, 18}}}, // classic, unsorted input',
			'		{[][]int{{1, 4}, {4, 5}}, [][]int{{1, 5}}},                                        // touching endpoints merge',
			'		{[][]int{{1, 4}, {2, 3}}, [][]int{{1, 4}}},                                        // contained interval vanishes',
			'		{[][]int{{1, 2}, {4, 5}, {7, 8}}, [][]int{{1, 2}, {4, 5}, {7, 8}}},                // already disjoint',
			'		{[][]int{{5, 7}}, [][]int{{5, 7}}},                                                // single interval',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.intervals),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Deep clone (outer slice AND each pair): the expected',
			'			// solution sorts in place and may extend endpoints, so a',
			'			// shallow copy would let it corrupt the shared test data.',
			'			in := make([][]int, len(c.intervals))',
			'			for i, iv := range c.intervals {',
			'				in[i] = append([]int(nil), iv...)',
			'			}',
			'			got := merge(in)',
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
			'import "sort"',
			'',
			'// merge collapses overlapping [start, end] intervals.',
			'//',
			'// Sorting by start is what buys the single pass: once sorted, the',
			'// only interval the current one can possibly overlap is the LAST',
			'// merged interval — anything before that ended too early to be',
			'// reachable (ends only ever grow as we merge). So each interval',
			'// faces exactly one question: does my start fall on or before the',
			'// last merged end? Yes → extend that end; no → open a new interval.',
			'func merge(intervals [][]int) [][]int {',
			'	if len(intervals) == 0 {',
			'		return [][]int{}',
			'	}',
			'',
			'	// In-place sort is fine: the caller handed us the slice to merge.',
			'	sort.Slice(intervals, func(i, j int) bool {',
			'		return intervals[i][0] < intervals[j][0]',
			'	})',
			'',
			'	// Seed with a COPY of the first interval — merged endpoints get',
			'	// mutated below, and writing through to the input would be a',
			'	// surprising side effect to leak.',
			'	merged := [][]int{append([]int(nil), intervals[0]...)}',
			'	for _, iv := range intervals[1:] {',
			'		last := merged[len(merged)-1]',
			'		if iv[0] <= last[1] {',
			'			// Overlaps (or touches: iv[0] == last[1]) the open interval.',
			'			// Extend the end — max, not assignment, because a contained',
			'			// interval like [2,3] inside [1,4] must not SHRINK it.',
			'			if iv[1] > last[1] {',
			'				last[1] = iv[1]',
			'			}',
			'		} else {',
			'			// Gap → the open interval is final; start a new one.',
			'			merged = append(merged, append([]int(nil), iv...))',
			'		}',
			'	}',
			'	return merged',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Without sorting: pairwise soup</h3>' +
			'<p>Unsorted, overlap is a global property — <code>[8,10]</code> in position 0 ' +
			'might merge with something in position 40, and merging two intervals can newly ' +
			'connect a third. A direct attack compares every pair and re-runs until nothing ' +
			'changes: O(n²) per round and fiddly to get right.</p>' +
			'<h3>Sort by start, then one sweep</h3>' +
			'<p>Sorting imposes the order the sweep needs: when intervals arrive by ascending ' +
			'start, the interval being built (“the last merged one”) can only be overlapped ' +
			'by the <em>very next</em> arrivals — anything later starts even further right. ' +
			'So one question per interval settles everything:</p>',
			{ code: 'sort.Slice(intervals, func(i, j int) bool {\n\treturn intervals[i][0] < intervals[j][0]\n})\nmerged := [][]int{append([]int(nil), intervals[0]...)}\nfor _, iv := range intervals[1:] {\n\tlast := merged[len(merged)-1]\n\tif iv[0] <= last[1] {\n\t\tif iv[1] > last[1] {\n\t\t\tlast[1] = iv[1] // extend, never shrink\n\t\t}\n\t} else {\n\t\tmerged = append(merged, append([]int(nil), iv...))\n\t}\n}' },
			'<p>The three places this goes wrong when rushed:</p>' +
			'<ul>' +
			'<li><strong><code>&lt;=</code>, not <code>&lt;</code>.</strong> Touching intervals ' +
			'share a point (<code>[1,4]</code>, <code>[4,5]</code>) and must merge — the test ' +
			'for it exists because the off-by-one is that common.</li>' +
			'<li><strong>Extend with max.</strong> A contained interval (<code>[2,3]</code> ' +
			'inside <code>[1,4]</code>) satisfies the overlap test but has a <em>smaller</em> ' +
			'end; blind assignment <code>last[1] = iv[1]</code> would shrink the merged ' +
			'interval and corrupt every comparison after it.</li>' +
			'<li><strong><code>last</code> aliases the stored pair.</strong> It is a ' +
			'<code>[]int</code> sharing backing memory with <code>merged</code>’s final ' +
			'element, so <code>last[1] = …</code> updates the result in place — no ' +
			're-append needed. That’s also why the seed is a copy, not the input’s slice.</li>' +
			'</ul>' +
			'<p>Complexity is dominated by the sort: O(n log n) time, and the sweep is O(n). ' +
			'Every later interval problem in the genre — insert interval, meeting rooms, ' +
			'non-overlapping intervals — opens with this exact sort-then-sweep move.</p>',
		],
		complexity: { time: 'O(n log n)', space: 'O(n)' },
	});
})();
