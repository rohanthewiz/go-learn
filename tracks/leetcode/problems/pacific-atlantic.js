/* Pacific Atlantic Water Flow — Graphs (Medium). The "reverse the search"
 * grid problem: instead of simulating water downhill from every cell (a DFS
 * per cell, O((mn)^2)), climb uphill FROM each ocean's shore once and
 * intersect the two reachable sets. Output order is unspecified, so the
 * harness sorts both got and want (row, then col) before comparing.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 210" width="500" height="210" role="img" aria-label="climbing uphill from both ocean shores and intersecting the reachable sets">' +
		'<text x="20" y="16" class="lbl">think backwards: start at each shore, climb to equal-or-higher cells</text>' +
		// ocean labels
		'<text x="150" y="38" text-anchor="middle" style="fill:var(--accent)">Pacific (top + left)</text>' +
		'<text x="150" y="196" text-anchor="middle" style="fill:var(--ok)">Atlantic (bottom + right)</text>' +
		// 3x3 grid at (96,48), 36px cells; heights: 1 3 4 / 2 5 4 / 2 2 3
		// cells reaching BOTH oceans: (0,2), (1,1), (2,0)
		'<g fill="none" stroke="var(--edge)">' +
		'<rect x="96" y="48" width="36" height="36"/><rect x="132" y="48" width="36" height="36"/>' +
		'<rect x="96" y="84" width="36" height="36"/><rect x="168" y="84" width="36" height="36"/>' +
		'<rect x="132" y="120" width="36" height="36"/><rect x="168" y="120" width="36" height="36"/>' +
		'</g>' +
		'<g fill="var(--panel)" stroke="var(--ok)" stroke-width="2">' +
		'<rect x="168" y="48" width="36" height="36"/>' +   // (0,2)
		'<rect x="132" y="84" width="36" height="36"/>' +   // (1,1)
		'<rect x="96" y="120" width="36" height="36"/>' +   // (2,0)
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="114" y="71">1</text><text x="150" y="71">3</text><text x="186" y="71" style="fill:var(--ok)">4</text>' +
		'<text x="114" y="107">2</text><text x="150" y="107" style="fill:var(--ok)">5</text><text x="186" y="107">4</text>' +
		'<text x="114" y="143" style="fill:var(--ok)">2</text><text x="150" y="143">2</text><text x="186" y="143">3</text>' +
		'</g>' +
		// Pacific climb arrow: shore cell (0,1)=3 up into (1,1)=5
		'<path d="M 150 60 C 150 70 150 80 150 88" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowPA)"/>' +
		// Atlantic climb arrow: shore cell (2,1)=2 up into (1,1)=5
		'<path d="M 150 148 C 150 140 150 130 150 118" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowPAok)"/>' +
		// annotations
		'<text x="250" y="66" class="lbl">Pacific climb: 3 → 5 (5 ≥ 3, water could</text>' +
		'<text x="250" y="80" class="lbl">have flowed 5 → 3 → Pacific)</text>' +
		'<text x="250" y="112" class="lbl">Atlantic climb: 2 → 5 from the south shore</text>' +
		'<text x="250" y="144" style="fill:var(--ok)">in BOTH sets → answer cell</text>' +
		'<text x="250" y="162" class="lbl">two flood fills total, not one per cell</text>' +
		'<defs>' +
		'<marker id="dgArrowPA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowPAok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'pacific-atlantic',
		title: 'Pacific Atlantic Water Flow',
		nav: 'Pacific Atlantic',
		difficulty: 'Medium',
		category: 'Graphs',
		task: 'Implement pacificAtlantic — make all 6 tests pass.',

		prose: [
			'<h2>Pacific Atlantic Water Flow</h2>' +
			'<p>An <code>m×n</code> grid of heights sits on an island. The <strong>Pacific</strong> ' +
			'touches the <em>top and left</em> edges; the <strong>Atlantic</strong> touches the ' +
			'<em>bottom and right</em> edges. Rain water on a cell can flow to any 4-directional ' +
			'neighbor whose height is <em>equal or lower</em>, and into an ocean from any edge ' +
			'cell bordering it.</p>' +
			'<p>Return the coordinates <code>[r, c]</code> of every cell from which water can ' +
			'reach <strong>both</strong> oceans.</p>' +
			'<ul><li>Flow is transitive: water keeps moving cell to cell as long as heights are ' +
			'non-increasing.</li>' +
			'<li>Return the answer in any order — the harness sorts both your output and the ' +
			'expected set (by row, then column) before comparing.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'heights:                 cells reaching both oceans:\n1 2 2 3 5                . . . . P&A\n3 2 3 4 4                . . . P&A P&A\n2 4 5 3 1        →       . . P&A . .\n6 7 1 4 5                P&A P&A . . .\n5 1 1 2 4                P&A . . . .\n\npacificAtlantic(...)  →  [[0 4] [1 3] [1 4] [2 2] [3 0] [3 1] [4 0]]', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Simulating flow <em>from</em> each cell means one flood fill per cell. Flip the ' +
			'direction instead: which cells can water arrive at an ocean <em>from</em>? Start at ' +
			'each ocean’s shore cells and walk <em>uphill</em> (to equal-or-higher neighbors) — ' +
			'that traces every downhill path in reverse. Two flood fills, one per ocean, then ' +
			'intersect:</p>' +
			DIAGRAM +
			'<p>Cells marked by <em>both</em> climbs are exactly the answer.</p>',
		],

		starter: [
			'package main',
			'',
			'// pacificAtlantic returns the [r, c] coordinates of every cell from',
			'// which rain water can flow to BOTH oceans. The Pacific borders the',
			'// top and left edges, the Atlantic the bottom and right. Water moves',
			'// to 4-directional neighbors of equal or lower height. Any order is',
			'// fine — the harness sorts before comparing.',
			'func pacificAtlantic(heights [][]int) [][]int {',
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
			'func main() {',
			'	type tc struct {',
			'		heights [][]int',
			'		want    [][]int',
			'	}',
			'	cases := []tc{',
			'		// the classic LeetCode 5×5 — 7 qualifying cells',
			'		{[][]int{{1, 2, 2, 3, 5}, {3, 2, 3, 4, 4}, {2, 4, 5, 3, 1}, {6, 7, 1, 4, 5}, {5, 1, 1, 2, 4}},',
			'			[][]int{{0, 4}, {1, 3}, {1, 4}, {2, 2}, {3, 0}, {3, 1}, {4, 0}}},',
			'		// single row: top edge IS the bottom edge, so every cell reaches both',
			'		{[][]int{{1, 2, 3}}, [][]int{{0, 0}, {0, 1}, {0, 2}}},',
			'		// single cell touches all four shores',
			'		{[][]int{{7}}, [][]int{{0, 0}}},',
			'		// strictly decreasing toward bottom-right: everything drains to the',
			'		// Atlantic, but only the top row and left column can reach the Pacific',
			'		{[][]int{{5, 4, 3}, {4, 3, 2}, {3, 2, 1}}, [][]int{{0, 0}, {0, 1}, {0, 2}, {1, 0}, {2, 0}}},',
			'		// flat grid: equal heights flow everywhere — all cells qualify',
			'		{[][]int{{1, 1, 1}, {1, 1, 1}}, [][]int{{0, 0}, {0, 1}, {0, 2}, {1, 0}, {1, 1}, {1, 2}}},',
			'		// 2×2: every cell is on an edge, but (0,0)=1 is a pit that cannot',
			'		// send water to the Atlantic — catches "all edge cells qualify"',
			'		{[][]int{{1, 2}, {4, 3}}, [][]int{{0, 1}, {1, 0}, {1, 1}}},',
			'	}',
			'	// Row-then-column comparator: the answer set is order-free, so both',
			'	// got and want are normalized to one canonical order before compare.',
			'	sortCells := func(cells [][]int) {',
			'		sort.Slice(cells, func(i, j int) bool {',
			'			if cells[i][0] != cells[j][0] {',
			'				return cells[i][0] < cells[j][0]',
			'			}',
			'			return cells[i][1] < cells[j][1]',
			'		})',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("heights=%v", c.heights),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Deep copy of the grid: nothing stops a solution from',
			'			// scribbling visited marks into heights itself.',
			'			in := make([][]int, len(c.heights))',
			'			for i, row := range c.heights {',
			'				in[i] = append([]int(nil), row...)',
			'			}',
			'			got := pacificAtlantic(in)',
			'			sortCells(got)',
			'			want := append([][]int(nil), c.want...)',
			'			sortCells(want)',
			'			r["pass"] = fmt.Sprintf("%v", got) == fmt.Sprintf("%v", want)',
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
			'// pacificAtlantic finds all cells whose rain water can reach both',
			'// oceans by running the flow BACKWARDS: instead of asking "where can',
			'// water from cell X go?" (one flood fill per cell), it asks "which',
			'// cells can feed this ocean?" — start at the shore and climb to',
			'// equal-or-higher neighbors, since water flows downhill along',
			'// exactly the reverse of that path. Two flood fills total, then an',
			'// intersection of the two reachability masks.',
			'func pacificAtlantic(heights [][]int) [][]int {',
			'	rows := len(heights)',
			'	if rows == 0 || len(heights[0]) == 0 {',
			'		return [][]int{}',
			'	}',
			'	cols := len(heights[0])',
			'',
			'	// One boolean mask per ocean. A cell being true means "water from',
			'	// here can reach that ocean" — proven by the uphill walk below.',
			'	pac := make([][]bool, rows)',
			'	atl := make([][]bool, rows)',
			'	for r := 0; r < rows; r++ {',
			'		pac[r] = make([]bool, cols)',
			'		atl[r] = make([]bool, cols)',
			'	}',
			'',
			'	dr := []int{-1, 1, 0, 0}',
			'	dc := []int{0, 0, -1, 1}',
			'',
			'	// climb marks every cell reachable from (r, c) by moving to',
			'	// neighbors of EQUAL OR HIGHER height — the reverse of the flow',
			'	// rule (water descends, so the search ascends). The mask doubles',
			'	// as the visited set: marking before recursing bounds the work at',
			'	// one visit per cell per ocean.',
			'	var climb func(reach [][]bool, r, c int)',
			'	climb = func(reach [][]bool, r, c int) {',
			'		reach[r][c] = true',
			'		for k := 0; k < 4; k++ {',
			'			nr, nc := r+dr[k], c+dc[k]',
			'			if nr < 0 || nr >= rows || nc < 0 || nc >= cols {',
			'				continue // off the island',
			'			}',
			'			if reach[nr][nc] || heights[nr][nc] < heights[r][c] {',
			'				continue // already proven, or downhill (water could not have come from there)',
			'			}',
			'			climb(reach, nr, nc)',
			'		}',
			'	}',
			'',
			'	// Multi-source start: every shore cell trivially drains into its',
			'	// ocean, so each one seeds a climb. The visited check inside climb',
			'	// makes the re-seeding of already-marked corners free.',
			'	for c := 0; c < cols; c++ {',
			'		climb(pac, 0, c)      // top edge → Pacific',
			'		climb(atl, rows-1, c) // bottom edge → Atlantic',
			'	}',
			'	for r := 0; r < rows; r++ {',
			'		climb(pac, r, 0)      // left edge → Pacific',
			'		climb(atl, r, cols-1) // right edge → Atlantic',
			'	}',
			'',
			'	// Row-major collection: emitting in scan order is deterministic',
			'	// and already sorted (row, then col), which keeps output stable',
			'	// even though the problem allows any order.',
			'	out := [][]int{}',
			'	for r := 0; r < rows; r++ {',
			'		for c := 0; c < cols; c++ {',
			'			if pac[r][c] && atl[r][c] {',
			'				out = append(out, []int{r, c})',
			'			}',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force: simulate every raindrop</h3>' +
			'<p>The literal reading suggests: for each of the m·n cells, flood fill ' +
			'<em>downhill</em> and check whether the walk touches a Pacific edge and an ' +
			'Atlantic edge. Each fill is O(m·n), so the whole thing is O((m·n)²) — a 200×200 ' +
			'grid already costs 1.6 billion cell visits. Worse, the per-cell fills redo each ' +
			'other’s work constantly: neighboring cells trace nearly identical downhill ' +
			'paths.</p>' +
			'<h3>Insight: reverse the direction of search</h3>' +
			'<p>The question is really about the <em>oceans</em>, not the cells: which cells ' +
			'can feed the Pacific? Water flows downhill, so a cell feeds the Pacific exactly ' +
			'when there is a path of non-increasing heights from it to a top/left edge — ' +
			'equivalently, a path of non-<em>decreasing</em> heights <em>from the shore to ' +
			'it</em>. So start at the shore cells (a multi-source start: every one of them ' +
			'trivially drains into its ocean) and climb to equal-or-higher neighbors:</p>',
			{ code: 'climb = func(reach [][]bool, r, c int) {\n\treach[r][c] = true // mask doubles as the visited set\n\tfor k := 0; k < 4; k++ {\n\t\tnr, nc := r+dr[k], c+dc[k]\n\t\tif nr < 0 || nr >= rows || nc < 0 || nc >= cols {\n\t\t\tcontinue\n\t\t}\n\t\tif reach[nr][nc] || heights[nr][nc] < heights[r][c] {\n\t\t\tcontinue // visited, or downhill — flow could not have come this way\n\t\t}\n\t\tclimb(reach, nr, nc)\n\t}\n}' },
			'<p>Run that once seeded from the Pacific shore and once from the Atlantic shore. ' +
			'Each climb visits every cell at most once (the mask is the visited set), so the ' +
			'total is two O(m·n) fills plus an O(m·n) intersection scan — the O((m·n)²) ' +
			'simulation collapses to O(m·n).</p>' +
			'<ul>' +
			'<li><strong>Equal heights go both ways.</strong> Water moves to equal-or-lower ' +
			'cells, so the reverse walk accepts equal-or-higher — using strict <code>&gt;</code> ' +
			'breaks the flat-grid test where every cell qualifies.</li>' +
			'<li><strong>Edge cells are not automatic.</strong> Touching one ocean is free, but ' +
			'the 2×2 test has a pit at <code>(0,0)</code> that borders the Pacific yet cannot ' +
			'send water anywhere higher — it never reaches the Atlantic.</li>' +
			'<li><strong>Order-free output.</strong> The harness sorts both sides; the solution ' +
			'emits in row-major order anyway, which is deterministic for free.</li>' +
			'</ul>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Reverse the direction of search (multi-source flood fill from the goal ' +
			'set)</strong> — when many sources ask "can I reach goal G?", flip it to "what can ' +
			'G reach?" along reversed edges and answer everyone with one traversal. The ' +
			'triggers: a per-source simulation that repeats itself, and a small, well-defined ' +
			'goal set (here: the shores). Cost: one O(V+E) fill per goal set instead of one ' +
			'per source. The same multi-source seeding drives Rotting Oranges (all rotten ' +
			'cells start the BFS together) and Surrounded Regions (climb inward from the ' +
			'border to find the <em>un</em>-captured cells), and the plain grid-DFS machinery ' +
			'is the one from Number of Islands.</p>',
		],
		complexity: { time: 'O(m·n)', space: 'O(m·n)' },
	});
})();
