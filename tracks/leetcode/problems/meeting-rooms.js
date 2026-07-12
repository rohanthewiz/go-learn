/* Meeting Rooms — Intervals (Easy). The gentlest interval problem: one
 * person can attend every meeting iff, after sorting by start, no meeting
 * starts before the previous one ends. Boolean-returning, so the starter's
 * constant false is caught by the four true-expecting cases; the harness
 * deep-copies each case because solutions sort in place.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="meetings on a timeline, an overlap detected between adjacent sorted meetings">' +
		'<text x="20" y="16" class="lbl">sorted by start · compare each meeting with the one before it</text>' +
		// timeline: t -> x = 40 + t*14, t in 0..30
		'<line x1="40" y1="150" x2="470" y2="150" stroke="var(--edge)"/>' +
		'<g class="lbl" text-anchor="middle">' +
		'<text x="40" y="168">0</text><text x="110" y="168">5</text><text x="180" y="168">10</text>' +
		'<text x="250" y="168">15</text><text x="320" y="168">20</text><text x="460" y="168">30</text>' +
		'</g>' +
		// meetings
		'<g fill="none" stroke-width="6" stroke-linecap="round">' +
		'<line x1="40" y1="56" x2="460" y2="56" stroke="var(--accent)"/>' +           // [0,30]
		'<line x1="110" y1="92" x2="180" y2="92" stroke="var(--err-edge)"/>' +        // [5,10]
		'<line x1="250" y1="122" x2="320" y2="122" stroke="var(--edge)"/>' +          // [15,20]
		'</g>' +
		'<text x="250" y="48" text-anchor="middle" class="lbl">[0,30]</text>' +
		'<text x="145" y="84" text-anchor="middle" style="fill:var(--err-edge)">[5,10]</text>' +
		'<text x="285" y="114" text-anchor="middle" class="lbl">[15,20]</text>' +
		// conflict arrow: start of [5,10] pointing back into [0,30]
		'<path d="M 200 88 C 240 78 280 68 320 62" fill="none" stroke="var(--err-edge)" stroke-width="1.5" marker-end="url(#dgArrowMR)"/>' +
		'<text x="210" y="106" style="fill:var(--err-edge)">starts at 5, previous still runs until 30 → clash</text>' +
		'<text x="20" y="184" class="lbl">one comparison per adjacent pair settles the whole schedule — back-to-back ([1,2] then [2,3]) is fine</text>' +
		'<defs><marker id="dgArrowMR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'meeting-rooms',
		title: 'Meeting Rooms',
		nav: 'Meeting Rooms',
		difficulty: 'Easy',
		category: 'Intervals',
		task: 'Implement canAttendMeetings — make all 6 tests pass.',

		prose: [
			'<h2>Meeting Rooms</h2>' +
			'<p>Given meeting time intervals <code>intervals[i] = [startᵢ, endᵢ]</code>, ' +
			'determine whether one person could attend <em>all</em> of them — i.e. no two ' +
			'meetings overlap.</p>' +
			'<ul><li>Back-to-back is fine: a meeting may start exactly when another ends ' +
			'(<code>[1,2]</code> then <code>[2,3]</code>).</li>' +
			'<li>The input is in no particular order (and you may reorder it).</li>' +
			'<li>An empty schedule is trivially attendable.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'canAttendMeetings([][]int{{0, 30}, {5, 10}, {15, 20}})  →  false  // [5,10] is inside [0,30]\ncanAttendMeetings([][]int{{7, 10}, {2, 4}})             →  true\ncanAttendMeetings([][]int{{1, 2}, {2, 3}})              →  true   // touching is fine', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Unsorted, any meeting might clash with any other — n²/2 pairs. Sort by start ' +
			'and clashes can only hide <em>between neighbors</em>: if meeting i doesn’t ' +
			'collide with meeting i−1, it can’t collide with anything earlier either ' +
			'(those end even sooner or start even earlier):</p>' +
			DIAGRAM +
			'<p>Sort once, then one linear scan of adjacent pairs.</p>',
		],

		starter: [
			'package main',
			'',
			'// canAttendMeetings reports whether one person can attend every',
			'// meeting, i.e. no two intervals overlap. Touching is allowed:',
			'// [1,2] and [2,3] can both be attended. The input may be reordered.',
			'func canAttendMeetings(intervals [][]int) bool {',
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
			'		intervals [][]int',
			'		want      bool',
			'	}',
			'	cases := []tc{',
			'		{[][]int{{0, 30}, {5, 10}, {15, 20}}, false}, // classic: everything sits inside [0,30]',
			'		{[][]int{{7, 10}, {2, 4}}, true},             // disjoint, given out of order',
			'		{[][]int{{1, 2}, {2, 3}}, true},              // back-to-back: touching is NOT overlap',
			'		{[][]int{}, true},                            // empty schedule',
			'		{[][]int{{5, 8}}, true},                      // single meeting',
			'		{[][]int{{1, 5}, {7, 9}, {3, 4}}, false},     // clash only visible AFTER sorting: [1,5] vs [3,4]',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.intervals),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Deep copy: the expected solution sorts its argument in',
			'			// place, and later cases must see pristine data.',
			'			in := make([][]int, len(c.intervals))',
			'			for i, iv := range c.intervals {',
			'				in[i] = append([]int(nil), iv...)',
			'			}',
			'			got := canAttendMeetings(in)',
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
			'import "sort"',
			'',
			'// canAttendMeetings reports whether no two meetings overlap.',
			'//',
			'// Sorting by start reduces the global question ("does ANY pair',
			'// clash?") to a local one: after the sort, if meeting i overlaps',
			'// anything earlier, it overlaps meeting i-1 in particular — of all',
			'// earlier meetings, i-1 starts latest, and any earlier meeting that',
			'// reaches past intervals[i][0] would also have swallowed i-1\'s',
			'// start. So adjacent checks cover every pair.',
			'func canAttendMeetings(intervals [][]int) bool {',
			'	// In-place sort is fine: the harness hands over a private copy.',
			'	sort.Slice(intervals, func(i, j int) bool {',
			'		return intervals[i][0] < intervals[j][0]',
			'	})',
			'',
			'	for i := 1; i < len(intervals); i++ {',
			'		// Strict <: starting exactly when the previous meeting ends',
			'		// ([1,2] then [2,3]) is attendable, so equality is NOT a clash.',
			'		if intervals[i][0] < intervals[i-1][1] {',
			'			return false',
			'		}',
			'	}',
			'	// Zero or one meeting falls through to true — the loop never runs.',
			'	return true',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force: check every pair</h3>' +
			'<p>Two meetings <code>[a,b]</code> and <code>[c,d]</code> overlap when ' +
			'<code>a &lt; d && c &lt; b</code>. Checking all n(n−1)/2 pairs is O(n²) — ' +
			'harmless at 10 meetings, but the structure of the problem gives the quadratic ' +
			'work away for a sort.</p>' +
			'<h3>Sort, then only neighbors matter</h3>' +
			'<p>Sort by start time. Now suppose meeting <code>i</code> clashes with some ' +
			'earlier meeting <code>j</code>: then <code>j</code> runs past <code>i</code>’s ' +
			'start, and since <code>i−1</code> starts between <code>j</code> and ' +
			'<code>i</code> (sort order), <code>j</code> runs past <code>i−1</code>’s start ' +
			'too — or <code>i−1</code> itself already clashes with <code>i</code>. Either ' +
			'way, <em>some adjacent pair clashes</em>. Contrapositive: if no adjacent pair ' +
			'clashes, no pair does at all. Hence one linear scan:</p>',
			{ code: 'sort.Slice(intervals, func(i, j int) bool {\n\treturn intervals[i][0] < intervals[j][0]\n})\nfor i := 1; i < len(intervals); i++ {\n\tif intervals[i][0] < intervals[i-1][1] { // strict: touching is fine\n\t\treturn false\n\t}\n}\nreturn true' },
			'<p>The comparison must be strict <code>&lt;</code>: back-to-back meetings ' +
			'(<code>[1,2]</code>, <code>[2,3]</code>) share only an instant and are ' +
			'attendable — <code>&lt;=</code> fails that test. And the last test exists ' +
			'because the clash (<code>[1,5]</code> vs <code>[3,4]</code>) is between ' +
			'meetings that are <em>not</em> adjacent in the input — scanning without ' +
			'sorting misses it.</p>' +
			'<h3>The famous follow-up: Meeting Rooms II</h3>' +
			'<p>The interview rarely stops here. "How many rooms do you need?" = the maximum ' +
			'number of meetings running at once. Split the intervals into a sorted list of ' +
			'start times and a sorted list of end times, then sweep: each start is a +1, and ' +
			'before taking it, retire every meeting that has already ended:</p>',
			{ code: '// Meeting Rooms II sketch: min rooms = max simultaneous meetings\nsort.Ints(starts)\nsort.Ints(ends)\nrooms, maxRooms, e := 0, 0, 0\nfor _, s := range starts {\n\tfor e < len(ends) && ends[e] <= s { // a room frees up (<=: back-to-back reuses it)\n\t\trooms--\n\t\te++\n\t}\n\trooms++\n\tif rooms > maxRooms {\n\t\tmaxRooms = rooms\n\t}\n}' },
			'<p>This problem is the answer to "is <code>maxRooms == 1</code> enough?" — same ' +
			'sort, coarser question.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Sort-then-scan-adjacent</strong> — sorting turns a global, all-pairs ' +
			'question ("does any pair conflict?") into a local one answered by neighbor ' +
			'checks, dropping O(n²) comparisons to O(n log n) sort + O(n) scan. The trigger: ' +
			'a pairwise property (overlap, closeness, duplicates) where sorting guarantees ' +
			'any violating pair has a violating <em>adjacent</em> pair. It is the opening ' +
			'move of the whole Intervals genre: Merge Intervals extends the neighbor check ' +
			'into coalescing, and Non-overlapping Intervals swaps the sort key to <em>end</em> ' +
			'and adds a greedy to count how many meetings to cancel.</p>',
		],
		complexity: { time: 'O(n log n)', space: 'O(1) extra (in-place sort)' },
	});
})();
