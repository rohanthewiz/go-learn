/* Unique Paths — Dynamic Programming (Medium). The canonical grid-counting
 * DP: paths into a cell = paths from above + paths from the left. Taught
 * with the space trick front and center — because each row depends only on
 * the row above it, the 2-D table compresses into one rolling 1-D row.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 205" width="500" height="205" role="img" aria-label="3 by 4 grid with the number of paths into each cell">' +
		'<text x="20" y="16" class="lbl">3 × 4 grid · each cell = paths from above + paths from the left</text>' +
		// grid cells: x = 40 + col*62 (w=56), y = 30 + row*42 (h=34)
		'<g fill="var(--panel)">' +
		// row 0
		'<rect x="40" y="30" width="56" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="102" y="30" width="56" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="164" y="30" width="56" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="226" y="30" width="56" height="34" rx="4" stroke="var(--edge)"/>' +
		// row 1
		'<rect x="40" y="72" width="56" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="102" y="72" width="56" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="164" y="72" width="56" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="226" y="72" width="56" height="34" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		// row 2
		'<rect x="40" y="114" width="56" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="102" y="114" width="56" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="164" y="114" width="56" height="34" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="226" y="114" width="56" height="34" rx="4" stroke="var(--accent)" stroke-width="2"/>' +
		'</g>' +
		// path counts
		'<g text-anchor="middle">' +
		'<text x="68" y="52">1</text><text x="130" y="52">1</text><text x="192" y="52">1</text><text x="254" y="52">1</text>' +
		'<text x="68" y="94">1</text><text x="130" y="94">2</text><text x="192" y="94">3</text><text x="254" y="94" style="fill:var(--ok)">4</text>' +
		'<text x="68" y="136">1</text><text x="130" y="136">3</text><text x="192" y="136" style="fill:var(--ok)">6</text><text x="254" y="136" style="fill:var(--accent)">10</text>' +
		'</g>' +
		// arrows into the corner cell: from above (4) and from the left (6)
		'<g fill="none" stroke="var(--accent)" stroke-width="1.5">' +
		'<path d="M 254 108 L 254 118" marker-end="url(#dgArrowUP)"/>' +
		'<path d="M 222 131 L 232 131" marker-end="url(#dgArrowUP)"/>' +
		'</g>' +
		// annotations
		'<text x="310" y="52" class="lbl">top row and left column: 1 path each</text>' +
		'<text x="310" y="70" class="lbl">(forced straight line)</text>' +
		'<text x="310" y="118">10 = 4 (above)</text>' +
		'<text x="310" y="136">   + 6 (left)</text>' +
		'<text x="20" y="180" style="fill:var(--ok)">answer for 3 × 4: 10 unique paths</text>' +
		'<text x="20" y="198" class="lbl">moves are right or down only — no cell is ever revisited, so counts just add</text>' +
		'<defs><marker id="dgArrowUP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'unique-paths',
		title: 'Unique Paths',
		nav: 'Unique Paths',
		difficulty: 'Medium',
		category: 'Dynamic Programming',
		task: 'Implement uniquePaths — make all 5 tests pass.',

		prose: [
			'<h2>Unique Paths</h2>' +
			'<p>A robot starts in the <em>top-left</em> corner of an <code>m × n</code> grid ' +
			'(m rows, n columns) and wants to reach the <em>bottom-right</em> corner. It can ' +
			'only move <strong>right</strong> or <strong>down</strong>. Return the number of ' +
			'distinct paths.</p>' +
			'<ul><li><code>1 ≤ m, n</code> — a single row or column has exactly one path.</li>' +
			'<li>Every path takes exactly <code>(m−1) + (n−1)</code> moves; paths differ ' +
			'only in <em>where</em> the downs and rights happen.</li>' +
			'<li>Counts fit in an <code>int</code> for the tested sizes.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'uniquePaths(3, 7)  →  28\nuniquePaths(3, 2)  →  3    // down-down-right, down-right-down, right-down-down\nuniquePaths(1, 5)  →  1    // single row: forced straight right', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>The only ways <em>into</em> a cell are from above or from the left, and no ' +
			'path visits a cell twice — so the number of paths into a cell is simply the sum ' +
			'of the counts of those two neighbors. Seed the top row and left column with 1 ' +
			'(forced straight lines) and fill:</p>' +
			DIAGRAM +
			'<p>Each row depends only on the row above it, so one reusable 1-D row is all ' +
			'the memory the table needs.</p>',
		],

		starter: [
			'package main',
			'',
			'// uniquePaths returns the number of distinct right/down-only paths',
			'// from the top-left to the bottom-right corner of an m×n grid',
			'// (m rows, n columns). A single row or column has exactly one path.',
			'func uniquePaths(m, n int) int {',
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
			'		m, n int',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{3, 7, 28},   // the classic LeetCode example',
			'		{3, 2, 3},',
			'		{1, 5, 1},    // single row: no choices at all',
			'		{3, 3, 6},',
			'		{7, 3, 28},   // symmetric to 3×7 — transposing the grid mirrors paths',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("m=%d, n=%d", c.m, c.n),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := uniquePaths(c.m, c.n)',
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
			'// uniquePaths counts right/down-only paths across an m×n grid.',
			'//',
			'// Full-table recurrence: paths(r,c) = paths(r−1,c) + paths(r,c−1),',
			'// with the top row and left column all 1 (forced straight lines).',
			'// Because row r reads ONLY row r−1 and the cell just written to its',
			'// left, the 2-D table compresses into a single rolling row:',
			'//',
			'//	row[j] += row[j-1]',
			'//	   ↑        ↑',
			'//	 old row[j] is "above"; new row[j-1] is "left"',
			'//',
			'// Before the +=, row[j] still holds the previous row\'s value (the',
			'// cell above); row[j-1] was already updated this pass (the cell to',
			'// the left). One line does both reads — the trick only works',
			'// sweeping j left-to-right, which matches the dependency direction.',
			'func uniquePaths(m, n int) int {',
			'	// row starts as the grid\'s top row: all 1s. This also finishes',
			'	// the m == 1 case before the loop even runs.',
			'	row := make([]int, n)',
			'	for j := range row {',
			'		row[j] = 1',
			'	}',
			'',
			'	// Each outer pass turns row from grid-row i−1 into grid-row i.',
			'	// j starts at 1: column 0 is always 1 (forced straight down),',
			'	// so it doubles as this row\'s seed.',
			'	for i := 1; i < m; i++ {',
			'		for j := 1; j < n; j++ {',
			'			row[j] += row[j-1]',
			'		}',
			'	}',
			'	return row[n-1]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force: walk every path</h3>' +
			'<p>Recurse on the two moves: <code>paths(r, c) = paths(r+1, c) + ' +
			'paths(r, c+1)</code>, bottoming out at 1 on the last row/column. Correct, but ' +
			'the recursion tree has one leaf <em>per path</em> — and a 3×7 grid already has ' +
			'28, growing as a binomial coefficient. Exponential blowup from recomputing the ' +
			'same cells along different routes.</p>' +
			'<h3>The insight: count arrivals, not routes</h3>' +
			'<p>There are only <code>m × n</code> distinct subproblems. Since the only moves ' +
			'are right and down, a path can enter a cell from exactly two places — above and ' +
			'left — and can never loop back. So the counts just add, and filling the table ' +
			'row by row visits each cell once:</p>',
			{ code: '// full 2-D table (before compression)\ndp[0][j] = 1; dp[i][0] = 1 // forced straight lines\ndp[i][j] = dp[i-1][j] + dp[i][j-1]' },
			'<h3>Compressing 2-D into 1-D</h3>' +
			'<p>Look at what <code>dp[i][j]</code> actually reads: one value from the ' +
			'<em>previous</em> row directly above, one from the <em>current</em> row just ' +
			'written. Nothing older is ever touched — so keep a single row and update it ' +
			'in place, left to right:</p>',
			{ code: 'row := make([]int, n)\nfor j := range row {\n\trow[j] = 1 // top row\n}\nfor i := 1; i < m; i++ {\n\tfor j := 1; j < n; j++ {\n\t\trow[j] += row[j-1] // old row[j] = above, new row[j-1] = left\n\t}\n}\nreturn row[n-1]' },
			'<p>Details worth internalizing:</p>' +
			'<ul>' +
			'<li><strong>Sweep direction is load-bearing.</strong> Left-to-right means ' +
			'<code>row[j-1]</code> is already this row’s value while <code>row[j]</code> is ' +
			'still last row’s — exactly the two operands the recurrence wants. Sweeping ' +
			'right-to-left would read a stale left neighbor.</li>' +
			'<li><strong>Edges cost nothing.</strong> The all-1s initial row answers ' +
			'<code>m = 1</code> outright, and skipping <code>j = 0</code> keeps column 0 at 1 ' +
			'forever — both “forced straight line” cases with no special-casing.</li>' +
			'<li><strong>Closed form exists.</strong> Every path is a shuffle of ' +
			'<code>m−1</code> downs among <code>m+n−2</code> moves, so the answer is ' +
			'C(m+n−2, m−1) — but computing binomials without overflow is its own puzzle; ' +
			'the DP is the robust, generalizable answer (it extends directly to grids ' +
			'with obstacles, Unique Paths II).</li>' +
			'</ul>',
		],
		complexity: { time: 'O(m·n)', space: 'O(n)' },
	});
})();
