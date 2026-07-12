/* Rotting Oranges — Graphs (Medium). The track's multi-source BFS problem:
 * rot spreads from ALL rotten oranges simultaneously, so the queue is
 * seeded with every source at minute 0 and processed level by level —
 * each level is one minute, and a fresh cell's rot time is its distance
 * to the NEAREST source. The harness deep-copies the grid per case since
 * solutions typically rot it in place.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="two rot wavefronts advancing one cell per minute and meeting in the middle">' +
		'<text x="20" y="16" class="lbl">grid = [2 1 1 1 2] — two sources, wavefronts advance one ring per minute</text>' +
		// the five cells: sources at both ends (err-edge), fresh between
		'<rect x="60" y="36" width="44" height="34" rx="4" fill="var(--panel)" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<rect x="108" y="36" width="44" height="34" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<rect x="156" y="36" width="44" height="34" rx="4" fill="var(--panel)" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="204" y="36" width="44" height="34" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<rect x="252" y="36" width="44" height="34" rx="4" fill="var(--panel)" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<g text-anchor="middle">' +
		'<text x="82" y="58" style="fill:var(--err-edge)">2</text>' +
		'<text x="130" y="58">1</text>' +
		'<text x="178" y="58" style="fill:var(--accent)">1</text>' +
		'<text x="226" y="58">1</text>' +
		'<text x="274" y="58" style="fill:var(--err-edge)">2</text>' +
		'</g>' +
		// minute-of-rot labels under each cell
		'<g text-anchor="middle" class="lbl">' +
		'<text x="82" y="90">min 0</text><text x="130" y="90">min 1</text>' +
		'<text x="178" y="90">min 2</text>' +
		'<text x="226" y="90">min 1</text><text x="274" y="90">min 0</text>' +
		'</g>' +
		// converging wavefront arrows
		'<g fill="none" stroke="var(--err-edge)" stroke-width="1.5">' +
		'<path d="M 106 105 C 120 112 138 114 152 112" marker-end="url(#dgArrowRO)"/>' +
		'<path d="M 250 105 C 236 112 218 114 204 112" marker-end="url(#dgArrowRO)"/>' +
		'</g>' +
		'<text x="178" y="106" text-anchor="middle" class="lbl">fronts meet</text>' +
		// annotations
		'<text x="20" y="140" class="lbl">rot time of a fresh cell = BFS distance to its nearest source ⇒ answer = 2, not 4</text>' +
		'<text x="20" y="158" class="lbl">DFS from one source at a time would claim the middle rots at minute 2 from the left</text>' +
		'<text x="20" y="174" class="lbl">AND overwrite/skip the faster right front — levels from a pre-seeded queue can’t</text>' +
		'<defs><marker id="dgArrowRO" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'rotting-oranges',
		title: 'Rotting Oranges',
		nav: 'Rotting Oranges',
		difficulty: 'Medium',
		category: 'Graphs',
		task: 'Implement orangesRotting — make all 6 tests pass.',

		prose: [
			'<h2>Rotting Oranges</h2>' +
			'<p>A grid holds <code>0</code> (empty), <code>1</code> (fresh orange), or ' +
			'<code>2</code> (rotten orange). Every minute, each fresh orange <em>4-directionally ' +
			'adjacent</em> to a rotten one becomes rotten. Return the number of minutes ' +
			'until no fresh orange remains — or <code>-1</code> if some fresh orange can ' +
			'never rot.</p>' +
			'<ul><li>All rotten oranges spread <em>simultaneously</em>, every minute.</li>' +
			'<li>If there are no fresh oranges to begin with, the answer is <code>0</code>.</li>' +
			'<li>You may mutate the grid — each test hands you a fresh copy.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'orangesRotting([][]int{\n\t{2, 1, 1},\n\t{1, 1, 0},\n\t{0, 1, 1},\n})  →  4\n\norangesRotting([][]int{{2, 1, 1}, {0, 1, 1}, {1, 0, 1}})  →  -1   // (2,0) is cut off', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>“Minutes until rot” is a <em>distance</em>: each fresh cell rots at its ' +
			'grid-distance from the <em>nearest</em> rotten orange. BFS computes nearest-' +
			'source distances if the queue starts with <em>every</em> source at level 0 — ' +
			'then processing level by level replays the minutes exactly:</p>' +
			DIAGRAM +
			'<p>The answer is the last level that actually rotted something; any fresh ' +
			'orange left after the queue drains means <code>-1</code>.</p>',
		],

		starter: [
			'package main',
			'',
			'// orangesRotting returns how many minutes pass until no cell of grid',
			'// is fresh (1), where rot spreads every minute from each rotten cell',
			'// (2) to 4-directionally adjacent fresh ones. It returns -1 if some',
			'// fresh orange can never rot, and 0 if nothing is fresh to begin',
			'// with. The grid may be mutated.',
			'func orangesRotting(grid [][]int) int {',
			'	// your code here (-2 is a placeholder: -1 and 0 are real answers)',
			'	return -2',
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
			'		grid [][]int',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{[][]int{{2, 1, 1}, {1, 1, 0}, {0, 1, 1}}, 4}, // the classic: one source, farthest cell 4 away',
			'		{[][]int{{2, 1, 1}, {0, 1, 1}, {1, 0, 1}}, -1}, // (2,0) fresh but walled off — impossible',
			'		{[][]int{{0, 2}}, 0}, // nothing fresh → 0 minutes, even with a rotten one around',
			'		{[][]int{{2, 2}, {2, 2}}, 0}, // all rotten already → 0',
			'		{[][]int{{1}}, -1}, // one fresh orange, no source anywhere → -1',
			'		// Two sources converging: nearest-source distance makes the',
			'		// middle rot at minute 2. Anything that spreads from one',
			'		// source at a time (DFS-style) overestimates this.',
			'		{[][]int{{2, 1, 1, 1, 2}}, 2},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("grid=%v", c.grid),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Deep-copy row by row: solutions rot the grid in place,',
			'			// and the case table must survive to be reported.',
			'			grid := make([][]int, len(c.grid))',
			'			for i, row := range c.grid {',
			'				grid[i] = append([]int(nil), row...)',
			'			}',
			'			got := orangesRotting(grid)',
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
			'// orangesRotting simulates rot spread with a multi-source BFS.',
			'//',
			'// Seeding the queue with EVERY rotten cell before the loop starts is',
			'// the whole trick: BFS then explores in rings of equal distance from',
			'// the nearest source, which is exactly how simultaneous spread',
			'// behaves. One queue "generation" = one minute. Rotting a cell the',
			'// moment it is enqueued (grid write = visited mark) guarantees each',
			'// cell is claimed once, by the front that reaches it first.',
			'func orangesRotting(grid [][]int) int {',
			'	rows := len(grid)',
			'	if rows == 0 {',
			'		return 0',
			'	}',
			'	cols := len(grid[0])',
			'',
			'	// Census pass: collect all sources, count the fresh. The fresh',
			'	// count is the loop\'s progress meter — cheaper and simpler than',
			'	// re-scanning the grid afterward to see if any 1 survived.',
			'	queue := make([][2]int, 0, rows*cols)',
			'	fresh := 0',
			'	for r := 0; r < rows; r++ {',
			'		for c := 0; c < cols; c++ {',
			'			switch grid[r][c] {',
			'			case 1:',
			'				fresh++',
			'			case 2:',
			'				queue = append(queue, [2]int{r, c}) // all sources enter at minute 0',
			'			}',
			'		}',
			'	}',
			'',
			'	dirs := [4][2]int{{-1, 0}, {1, 0}, {0, -1}, {0, 1}}',
			'	minutes := 0',
			'	// Level-by-level: everything in queue rotted at the same minute;',
			'	// next collects the ring that rots one minute later. The fresh>0',
			'	// guard stops the clock the instant the last orange turns —',
			'	// without it a final no-op generation would inflate the answer,',
			'	// and grids with nothing fresh correctly report 0 (loop never runs).',
			'	for len(queue) > 0 && fresh > 0 {',
			'		next := make([][2]int, 0, len(queue))',
			'		for _, cell := range queue {',
			'			for _, d := range dirs {',
			'				nr, nc := cell[0]+d[0], cell[1]+d[1]',
			'				if nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 1 {',
			'					grid[nr][nc] = 2 // rot immediately — the visited mark',
			'					fresh--',
			'					next = append(next, [2]int{nr, nc})',
			'				}',
			'			}',
			'		}',
			'		queue = next',
			'		minutes++',
			'	}',
			'',
			'	if fresh > 0 {',
			'		return -1 // the wave drained but oranges survive: unreachable',
			'	}',
			'	return minutes',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force: replay the minutes</h3>' +
			'<p>Simulate literally — every minute, scan the whole grid, rot every fresh ' +
			'cell adjacent to a rotten one (into a copy, so this minute’s new rot doesn’t ' +
			'cascade), repeat until a scan changes nothing. Correct, but each minute costs ' +
			'a full O(m·n) sweep even when only two cells changed, for O((m·n)²) total on ' +
			'a long thin grid. And a DFS “fix” is worse than slow — it is <em>wrong</em>: ' +
			'DFS from one source at a time assigns the first-found path length, but a cell ' +
			'reached in 7 steps from source A may be 2 steps from source B. Simultaneous ' +
			'sources need the nearest-source distance, and that is BFS territory.</p>' +
			'<h3>Insight: all sources enter the queue at minute 0</h3>' +
			'<p>Standard BFS from one start gives shortest distance from that start. Seed ' +
			'the queue with <em>every</em> rotten orange instead and the very same loop ' +
			'yields distance to the <em>nearest</em> source — as if all sources were ' +
			'connected to one imaginary super-source one step upstream. Each queue ' +
			'generation is one minute; each cell is visited once, when the first front ' +
			'arrives:</p>',
			{ code: 'for len(queue) > 0 && fresh > 0 { // stop the instant the last orange turns\n\tnext := make([][2]int, 0, len(queue))\n\tfor _, cell := range queue {\n\t\tfor _, d := range dirs {\n\t\t\tnr, nc := cell[0]+d[0], cell[1]+d[1]\n\t\t\tif nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == 1 {\n\t\t\t\tgrid[nr][nc] = 2 // rot = visited: each cell claimed once\n\t\t\t\tfresh--\n\t\t\t\tnext = append(next, [2]int{nr, nc})\n\t\t\t}\n\t\t}\n\t}\n\tqueue = next\n\tminutes++\n}' },
			'<p>The bookkeeping details that decide the edge cases:</p>' +
			'<ul>' +
			'<li><strong>Count fresh up front.</strong> <code>fresh == 0</code> after the ' +
			'loop means success; <code>fresh &gt; 0</code> means unreachable oranges → ' +
			'<code>-1</code>. No second grid scan.</li>' +
			'<li><strong>The <code>fresh &gt; 0</code> loop guard sets the clock right.</strong> ' +
			'It exits the moment the last orange rots, so the final generation isn’t ' +
			'followed by a phantom minute — and “no fresh at all” never enters the loop, ' +
			'returning 0 whether the grid is all-rotten or just empty of fruit.</li>' +
			'<li><strong>Rot on enqueue, not on dequeue.</strong> Writing <code>2</code> ' +
			'immediately stops two fronts (or two neighbors in the same ring) from ' +
			'claiming one cell twice and double-decrementing <code>fresh</code>.</li>' +
			'</ul>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Multi-source BFS — shortest distance from a SET of sources, all ' +
			'seeded at level 0</strong> — reach for it when a problem says things spread ' +
			'or propagate <em>simultaneously</em> from several origins, or asks each cell ' +
			'for its distance to the <em>nearest</em> anything (walls-and-gates style ' +
			'“distance to nearest exit”, 0/1-matrix “distance to nearest zero”, network ' +
			'broadcast reach — all the same wavefront). Cost: the plain BFS O(m·n) time ' +
			'and queue, regardless of source count. Contrast <em>Number of Islands</em>: ' +
			'also grid traversal, but it asks <em>connectivity</em> (any order works, DFS ' +
			'is fine); the moment the question is <em>distance or time</em>, level-order ' +
			'BFS is the only traversal whose visit order means anything.</p>',
		],
		complexity: { time: 'O(m·n)', space: 'O(m·n) queue worst case' },
	});
})();
