/* Number of Islands — Graphs (Medium). The gateway grid-DFS problem: a 2-D
 * grid is an implicit graph (cells are nodes, 4-directional adjacency is the
 * edge set), and flood fill that "sinks" visited land in place counts the
 * connected components with no separate visited set. Test grids are written
 * as []string for readability; the harness converts each to [][]byte so the
 * user's function is free to mutate.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="flood fill sinking one island in a grid">' +
		'<text x="20" y="16" class="lbl">grid mid-run · scan found land at row 1, col 4 — flood fill spreads</text>' +
		// grid: 5 cols x 4 rows, 34px cells at (20,28)
		// row 0: 1 1 0 0 0   (island 1 — already sunk, shown done/ok)
		// row 1: 1 1 0 0 1   (right cell = current flood, accent)
		// row 2: 0 0 0 1 1   (accent: being flooded)
		// row 3: 0 0 0 0 0
		// water cells (dashed edge)
		'<g fill="none" stroke="var(--edge)" stroke-dasharray="3 3">' +
		'<rect x="88" y="28" width="34" height="34"/><rect x="122" y="28" width="34" height="34"/><rect x="156" y="28" width="34" height="34"/>' +
		'<rect x="88" y="62" width="34" height="34"/><rect x="122" y="62" width="34" height="34"/>' +
		'<rect x="20" y="96" width="34" height="34"/><rect x="54" y="96" width="34" height="34"/><rect x="88" y="96" width="34" height="34"/>' +
		'<rect x="20" y="130" width="34" height="34"/><rect x="54" y="130" width="34" height="34"/><rect x="88" y="130" width="34" height="34"/>' +
		'<rect x="122" y="130" width="34" height="34"/><rect x="156" y="130" width="34" height="34"/>' +
		'</g>' +
		// island 1 — counted and sunk (ok)
		'<g fill="var(--panel)" stroke="var(--ok)" stroke-width="1.6">' +
		'<rect x="20" y="28" width="34" height="34"/><rect x="54" y="28" width="34" height="34"/>' +
		'<rect x="20" y="62" width="34" height="34"/><rect x="54" y="62" width="34" height="34"/>' +
		'</g>' +
		'<g text-anchor="middle" style="fill:var(--ok)">' +
		'<text x="37" y="50">0</text><text x="71" y="50">0</text><text x="37" y="84">0</text><text x="71" y="84">0</text>' +
		'</g>' +
		// island 2 — currently being flooded (accent)
		'<g fill="var(--panel)" stroke="var(--accent)" stroke-width="2">' +
		'<rect x="156" y="62" width="34" height="34"/>' +
		'<rect x="122" y="96" width="34" height="34"/><rect x="156" y="96" width="34" height="34"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="173" y="84" style="fill:var(--accent)">1</text>' +
		'<text x="139" y="118">1</text><text x="173" y="118">1</text>' +
		'</g>' +
		// DFS spread arrows from the current cell
		'<g fill="none" stroke="var(--accent)" stroke-width="1.5">' +
		'<path d="M 173 90 L 173 100" marker-end="url(#dgArrowNOI)"/>' +
		'<path d="M 160 108 L 152 112" marker-end="url(#dgArrowNOI)"/>' +
		'</g>' +
		// right-hand annotations
		'<text x="230" y="52" style="fill:var(--ok)">island #1 — sunk: 1 → 0</text>' +
		'<text x="230" y="84" style="fill:var(--accent)">island #2 — DFS in progress</text>' +
		'<text x="230" y="106" class="lbl">each visited ‘1’ is overwritten with ‘0’,</text>' +
		'<text x="230" y="122" class="lbl">so the outer scan can never count it again</text>' +
		'<text x="230" y="152" class="lbl">count so far = 2</text>' +
		'<defs><marker id="dgArrowNOI" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'number-of-islands',
		title: 'Number of Islands',
		nav: 'Number of Islands',
		difficulty: 'Medium',
		category: 'Graphs',
		task: 'Implement numIslands — make all 5 tests pass.',

		prose: [
			'<h2>Number of Islands</h2>' +
			'<p>Given an <code>m×n</code> grid of bytes where <code>\'1\'</code> is land and ' +
			'<code>\'0\'</code> is water, return the number of <em>islands</em>. An island is a ' +
			'maximal group of land cells connected <em>horizontally or vertically</em> ' +
			'(not diagonally).</p>' +
			'<ul><li>The grid is a <code>[][]byte</code> — you may mutate it freely.</li>' +
			'<li>All cells outside the grid count as water.</li>' +
			'<li>Diagonal neighbors do <em>not</em> connect.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'numIslands([][]byte{           numIslands([][]byte{\n\t[]byte("11000"),               []byte("111"),\n\t[]byte("11000"),               []byte("010"),\n\t[]byte("00100"),               []byte("111"),\n\t[]byte("00011"),           })  →  1   // all connected\n})  →  3', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Scan the grid left-to-right, top-to-bottom. Every time the scan steps on ' +
			'un-visited land, that is a <em>new</em> island — count it, then <em>flood ' +
			'fill</em>: DFS outward in all four directions, overwriting every reachable ' +
			'<code>\'1\'</code> with <code>\'0\'</code> (“sinking” the island) so no other cell ' +
			'of it can ever start a second count:</p>' +
			DIAGRAM +
			'<p>The grid itself becomes the visited set — no extra memory, one pass.</p>',
		],

		starter: [
			'package main',
			'',
			"// numIslands returns the number of islands in grid, where '1' is",
			"// land and '0' is water. Land cells connect horizontally and",
			'// vertically (not diagonally). The grid may be mutated.',
			'func numIslands(grid [][]byte) int {',
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
			'		grid []string',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{[]string{"11000", "11000", "00100", "00011"}, 3},',
			'		{[]string{"000", "000", "000"}, 0},',
			'		{[]string{"1"}, 1},',
			'		{[]string{"111", "001", "111", "100", "111"}, 1}, // one snake-shaped island',
			'		{[]string{"11", "11"}, 1},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("grid=%v", c.grid),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// []byte(row) copies, so each case hands the user a fresh',
			"			// mutable grid — a sinking solution can't poison later cases.",
			'			grid := make([][]byte, len(c.grid))',
			'			for i, row := range c.grid {',
			'				grid[i] = []byte(row)',
			'			}',
			'			got := numIslands(grid)',
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
			'// numIslands counts connected components of land in grid by flood',
			"// fill: each time the row-major scan finds a '1', that cell belongs",
			'// to an island no previous iteration has seen (anything reachable',
			'// from an earlier find was already sunk), so count it and sink the',
			'// whole component in place.',
			'//',
			"// Mutating the grid IS the visited set — overwriting '1' with '0'",
			'// makes “visited land” and “water” indistinguishable, which is',
			'// exactly what the scan wants: both mean “nothing new here”.',
			'func numIslands(grid [][]byte) int {',
			'	rows := len(grid)',
			'	if rows == 0 {',
			'		return 0',
			'	}',
			'	cols := len(grid[0])',
			'',
			'	// sink floods one component. Bounds and water checks live at the',
			'	// TOP of the recursion rather than before each call — four dumb',
			'	// recursive calls beat four guarded ones, and the base case makes',
			'	// termination obvious: every call either returns immediately or',
			"	// permanently turns a '1' into a '0', so at most rows·cols",
			'	// productive calls can ever happen.',
			'	var sink func(r, c int)',
			'	sink = func(r, c int) {',
			"		if r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] != '1' {",
			'			return // off the map, water, or already sunk',
			'		}',
			"		grid[r][c] = '0' // sink before recursing — this is the visited mark",
			'		sink(r-1, c)',
			'		sink(r+1, c)',
			'		sink(r, c-1)',
			'		sink(r, c+1)',
			'	}',
			'',
			'	count := 0',
			'	for r := 0; r < rows; r++ {',
			'		for c := 0; c < cols; c++ {',
			"			if grid[r][c] == '1' {",
			'				count++ // first cell of a never-seen island',
			'				sink(r, c)',
			'			}',
			'		}',
			'	}',
			'	return count',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>It’s a graph problem in disguise</h3>' +
			'<p>Nothing here mentions nodes or edges, but the structure is pure graph ' +
			'theory: land cells are vertices, 4-directional adjacency is the edge set, and ' +
			'“number of islands” is “number of connected components”. The textbook answer ' +
			'is: keep a <code>visited</code> set, and for every unvisited vertex run a ' +
			'DFS/BFS marking everything reachable, incrementing a counter per start. ' +
			'That works — at the cost of an extra O(m·n) boolean grid and constant ' +
			'bookkeeping to keep it in sync.</p>' +
			'<h3>Sink the land instead</h3>' +
			'<p>Because we own the grid (the harness hands each test a fresh mutable ' +
			'<code>[][]byte</code>), the visited set can be the grid itself: when the DFS ' +
			'touches a land cell, overwrite it with water. A sunk cell is exactly as ' +
			'uninteresting as a wet one, so a single <code>!= \'1\'</code> check covers ' +
			'water and already-visited land at once:</p>',
			{ code: "sink = func(r, c int) {\n\tif r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] != '1' {\n\t\treturn // off-grid, water, or already sunk — same thing\n\t}\n\tgrid[r][c] = '0' // mark BEFORE recursing\n\tsink(r-1, c)\n\tsink(r+1, c)\n\tsink(r, c-1)\n\tsink(r, c+1)\n}" },
			'<p>What makes it correct and fast:</p>' +
			'<ul>' +
			'<li><strong>Mark before recursing.</strong> Sinking the cell first is what stops ' +
			'two adjacent cells from recursing into each other forever — the second visit ' +
			'sees <code>\'0\'</code> and stops.</li>' +
			'<li><strong>Count only at the scan.</strong> The outer loop increments once per ' +
			'flood-fill <em>start</em>; the fill guarantees the rest of that island can never ' +
			'trigger another start. Shape is irrelevant — the snake-shaped test island is one ' +
			'component, so it counts once.</li>' +
			'<li><strong>Each cell is touched O(1) times.</strong> The scan reads it once and ' +
			'the fill sinks it at most once, so the whole thing is O(m·n) even though the ' +
			'recursion looks wild.</li>' +
			'<li><strong>Recursion depth is the one caveat.</strong> A grid that is one giant ' +
			'island can push the stack to O(m·n) deep. Fine at these sizes; on huge inputs ' +
			'you’d swap the recursion for an explicit stack or BFS queue — the sinking trick ' +
			'is unchanged.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(m·n)', space: 'O(m·n) recursion worst case' },
	});
})();
