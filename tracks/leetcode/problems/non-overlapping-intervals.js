/* Non-overlapping Intervals — Intervals (Medium). Interval scheduling in
 * disguise: minimizing removals is maximizing how many intervals you KEEP,
 * and the greedy that sorts by END and always keeps the earliest-ending
 * compatible interval is provably optimal (exchange argument). The nested
 * test case exists to kill the tempting sort-by-start greedy.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="sorting intervals by end and greedily keeping the earliest-ending compatible ones">' +
		'<text x="20" y="16" class="lbl">sort by END, keep whatever starts at/after the last kept end</text>' +
		// number line: v -> x = 30 + v*40, v in 1..10
		'<line x1="30" y1="150" x2="470" y2="150" stroke="var(--edge)"/>' +
		'<g class="lbl" text-anchor="middle">' +
		'<text x="70" y="168">1</text><text x="110" y="168">2</text><text x="150" y="168">3</text>' +
		'<text x="190" y="168">4</text><text x="230" y="168">5</text><text x="430" y="168">10</text>' +
		'</g>' +
		// the umbrella [1,10] — ends LAST, so the sort pushes it to the back
		'<g fill="none" stroke-width="6" stroke-linecap="round">' +
		'<line x1="70" y1="56" x2="430" y2="56" stroke="var(--err-edge)" stroke-dasharray="2 7"/>' +
		'<line x1="110" y1="96" x2="150" y2="96" stroke="var(--ok)"/>' +
		'<line x1="190" y1="126" x2="230" y2="126" stroke="var(--ok)"/>' +
		'</g>' +
		'<text x="250" y="48" style="fill:var(--err-edge)">[1,10] — removed (starts before last kept end)</text>' +
		'<text x="130" y="84" text-anchor="middle" style="fill:var(--ok)">[2,3] kept</text>' +
		'<text x="210" y="114" text-anchor="middle" style="fill:var(--ok)">[4,5] kept</text>' +
		// arrow: keeping the earliest end frees the most room
		'<path d="M 150 100 C 200 100 240 110 268 122" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowNOV)"/>' +
		'<text x="280" y="130" class="lbl">earliest end leaves the most room →</text>' +
		'<text x="20" y="192" class="lbl">sort by START would keep the umbrella [1,10] first and remove BOTH small ones (2 removals, not 1)</text>' +
		'<defs><marker id="dgArrowNOV" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'non-overlapping-intervals',
		title: 'Non-overlapping Intervals',
		nav: 'Non-overlap Intervals',
		difficulty: 'Medium',
		category: 'Intervals',
		task: 'Implement eraseOverlapIntervals — make all 6 tests pass.',

		prose: [
			'<h2>Non-overlapping Intervals</h2>' +
			'<p>Given intervals <code>intervals[i] = [startᵢ, endᵢ]</code>, return the ' +
			'<em>minimum</em> number of intervals to remove so that the rest do not ' +
			'overlap.</p>' +
			'<ul><li>Intervals that only <em>touch</em> do <strong>not</strong> overlap: ' +
			'<code>[1,2]</code> and <code>[2,3]</code> can coexist.</li>' +
			'<li>The input is in no particular order (and you may reorder it).</li>' +
			'<li>Duplicates are possible — identical intervals overlap each other.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'eraseOverlapIntervals([][]int{{1, 2}, {2, 3}, {3, 4}, {1, 3}})  →  1   // drop [1,3]\neraseOverlapIntervals([][]int{{1, 2}, {1, 2}, {1, 2}})          →  2   // keep one copy\neraseOverlapIntervals([][]int{{1, 2}, {2, 3}})                  →  0   // touching is fine', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Minimizing removals is the same as <em>keeping</em> as many intervals as ' +
			'possible. Sort by <em>end</em> and sweep: always keep the next interval that ' +
			'starts at or after the last kept end — the earliest finisher leaves the most ' +
			'room for everything after it:</p>' +
			DIAGRAM +
			'<p>Answer = total − kept. The nested case shows why sorting by <em>start</em> ' +
			'fails.</p>',
		],

		starter: [
			'package main',
			'',
			'// eraseOverlapIntervals returns the minimum number of intervals to',
			'// remove so no two of the remaining intervals overlap. Touching',
			'// endpoints ([1,2] and [2,3]) do NOT count as overlapping. The input',
			'// may be reordered freely.',
			'func eraseOverlapIntervals(intervals [][]int) int {',
			'	// your code here',
			'	return -1',
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
			'		want      int',
			'	}',
			'	cases := []tc{',
			'		{[][]int{{1, 2}, {2, 3}, {3, 4}, {1, 3}}, 1},   // classic: one umbrella to drop',
			'		{[][]int{{1, 2}, {1, 2}, {1, 2}}, 2},           // identical intervals: keep exactly one',
			'		{[][]int{{5, 6}, {1, 2}, {3, 4}}, 0},           // disjoint (and unsorted) — nothing to remove',
			'		{[][]int{{1, 10}, {2, 3}, {4, 5}}, 1},          // nested: kill the umbrella, NOT the two inner ones',
			'		{[][]int{{7, 9}}, 0},                           // single interval',
			'		{[][]int{{1, 2}, {2, 3}, {3, 4}, {4, 5}}, 0},   // chain of touching intervals — touching is legal',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.intervals),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Deep copy: the expected solution sorts in place, and the',
			'			// shared case table must survive for the report.',
			'			in := make([][]int, len(c.intervals))',
			'			for i, iv := range c.intervals {',
			'				in[i] = append([]int(nil), iv...)',
			'			}',
			'			got := eraseOverlapIntervals(in)',
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
			'// eraseOverlapIntervals minimizes removals by MAXIMIZING keeps: sort',
			'// by end, then greedily keep every interval that starts at or after',
			'// the end of the last kept one.',
			'//',
			'// Why sort by END and not start: among all intervals that could be',
			'// kept next, the one that finishes earliest constrains the future',
			'// least — every interval compatible with any other choice is also',
			'// compatible with it (its end is ≤ theirs). That is the exchange',
			'// argument: swap the earliest finisher into any optimal solution and',
			'// nothing breaks, so greedy keeps a maximum-size set.',
			'func eraseOverlapIntervals(intervals [][]int) int {',
			'	if len(intervals) == 0 {',
			'		return 0',
			'	}',
			'',
			'	// In-place sort is fine: the harness hands over a private copy.',
			'	sort.Slice(intervals, func(i, j int) bool {',
			'		return intervals[i][1] < intervals[j][1]',
			'	})',
			'',
			'	// The first finisher is always safe to keep (exchange argument',
			'	// applies to the very first pick too).',
			'	kept := 1',
			'	lastEnd := intervals[0][1]',
			'	for _, iv := range intervals[1:] {',
			'		// >= not >: touching endpoints do not overlap, so an interval',
			'		// starting exactly at lastEnd is keepable. Identical intervals',
			'		// (start < lastEnd) correctly fall through and get dropped.',
			'		if iv[0] >= lastEnd {',
			'			kept++',
			'			lastEnd = iv[1]',
			'		}',
			'		// else: overlaps the kept set — dropping THIS one is optimal,',
			'		// because its end is >= lastEnd (sort order), so keeping it',
			'		// instead could only tighten the room left for the rest.',
			'	}',
			'	return len(intervals) - kept',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Reframe: removals → keeps</h3>' +
			'<p>"Minimum removals so nothing overlaps" is exactly "maximum intervals you can ' +
			'keep pairwise non-overlapping", the classic <em>interval scheduling</em> problem ' +
			'— then answer <code>total − kept</code>. Brute force would try subsets ' +
			'(exponential) or a DP over sorted intervals (O(n²)); neither is needed, because ' +
			'a one-pass greedy is provably optimal here.</p>' +
			'<h3>Greedy by earliest end — and the proof</h3>' +
			'<p>Sort by <em>end</em>. Keep the first interval; then keep each next interval ' +
			'whose start is at or after the last kept end:</p>',
			{ code: 'sort.Slice(intervals, func(i, j int) bool {\n\treturn intervals[i][1] < intervals[j][1] // by END\n})\nkept, lastEnd := 1, intervals[0][1]\nfor _, iv := range intervals[1:] {\n\tif iv[0] >= lastEnd { // >= : touching is not overlap\n\t\tkept++\n\t\tlastEnd = iv[1]\n\t}\n}\nreturn len(intervals) - kept' },
			'<p><strong>The exchange argument</strong>, in full, because this is the cleanest ' +
			'greedy proof in the track. Let <code>g</code> be the earliest-ending interval ' +
			'overall, and take <em>any</em> optimal kept set <code>OPT</code>. Let ' +
			'<code>f</code> be the earliest-ending interval in <code>OPT</code>. Swap ' +
			'<code>f</code> out and <code>g</code> in: <code>g</code> ends no later than ' +
			'<code>f</code> (it is the global earliest finisher), so <code>g</code> cannot ' +
			'overlap anything <code>f</code> didn’t — every other interval in <code>OPT</code> ' +
			'starts at or after <code>f</code>’s end ≥ <code>g</code>’s end. The swapped set ' +
			'is the same size and still conflict-free, so <em>some</em> optimal solution ' +
			'keeps <code>g</code>. Remove <code>g</code> and every interval overlapping it, ' +
			'and the identical argument applies to the remainder — induction gives that the ' +
			'greedy’s whole sequence of picks matches an optimal solution pick for pick.</p>' +
			'<p>Contrast with sorting by <em>start</em>, which the nested test punishes: with ' +
			'<code>[[1,10],[2,3],[4,5]]</code>, a start-sorted greedy commits to the umbrella ' +
			'<code>[1,10]</code> first and must then remove both inner intervals — 2 removals ' +
			'where end-sorting achieves 1. Ending early is what buys freedom; starting early ' +
			'buys nothing. (Merge Intervals sorts by start because it asks a different ' +
			'question — coverage, not selection.)</p>' +
			'<p>Also note <code>&gt;=</code> on the keep test: touching intervals ' +
			'(<code>[1,2]</code>, <code>[2,3]</code>) are legal neighbors, so a chain of them ' +
			'needs 0 removals, while identical duplicates fail the test and are dropped.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Greedy by earliest end + exchange argument</strong> — the ' +
			'interval-scheduling classic. Triggers: "maximum number of non-conflicting ' +
			'things" or its mirror "minimum removals to eliminate conflicts", over items with ' +
			'a start and an end. Cost: O(n log n) for the sort, O(n) sweep, O(1) extra ' +
			'space. The exchange argument is the reusable part: to trust any greedy, show an ' +
			'optimal solution can be rewritten to agree with the greedy’s first choice ' +
			'without getting worse. Siblings in the genre: Meeting Rooms (same sort-and-scan ' +
			'skeleton asking only whether ANY conflict exists), Merge Intervals (sort by ' +
			'start instead, because it merges coverage rather than selecting), and the ' +
			'textbook activity-selection problem this one is a re-skin of.</p>',
		],
		complexity: { time: 'O(n log n)', space: 'O(1) extra (in-place sort)' },
	});
})();
