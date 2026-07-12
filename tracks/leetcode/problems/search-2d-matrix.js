/* Search a 2D Matrix — Binary Search (Medium). The fully-sorted matrix is
 * secretly ONE sorted array of m×n elements — a single binary search with
 * index arithmetic (mid/n, mid%n) finds the target without ever flattening.
 * Tested with a boolean case table including single-row/column edges.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 240" width="520" height="240" role="img" aria-label="binary search over the matrix treated as one virtual flat sorted array">' +
		'<text x="20" y="18" class="lbl">matrix — every row sorted, each row starts above the previous row’s end</text>' +
		// 3x4 grid of matrix cells (row 1, col 2 = 16 highlighted)
		'<g>' +
		'<rect x="20" y="28" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="64" y="28" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="108" y="28" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="152" y="28" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="20" y="60" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="64" y="60" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="108" y="60" width="40" height="28" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="152" y="60" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="20" y="92" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="64" y="92" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="108" y="92" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="152" y="92" width="40" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="40" y="47" text-anchor="middle">1</text>' +
		'<text x="84" y="47" text-anchor="middle">3</text>' +
		'<text x="128" y="47" text-anchor="middle">5</text>' +
		'<text x="172" y="47" text-anchor="middle">7</text>' +
		'<text x="40" y="79" text-anchor="middle">10</text>' +
		'<text x="84" y="79" text-anchor="middle">11</text>' +
		'<text x="128" y="79" text-anchor="middle" style="fill:var(--accent)">16</text>' +
		'<text x="172" y="79" text-anchor="middle">20</text>' +
		'<text x="40" y="111" text-anchor="middle">23</text>' +
		'<text x="84" y="111" text-anchor="middle">30</text>' +
		'<text x="128" y="111" text-anchor="middle">34</text>' +
		'<text x="172" y="111" text-anchor="middle">60</text>' +
		'</g>' +
		// virtual flat array (never materialized)
		'<text x="20" y="150" class="lbl">the same values as one virtual index 0–11 — never actually built</text>' +
		'<g>' +
		'<rect x="20" y="158" width="36" height="26" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="58" y="158" width="36" height="26" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="96" y="158" width="36" height="26" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="134" y="158" width="36" height="26" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="172" y="158" width="36" height="26" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="210" y="158" width="36" height="26" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="248" y="158" width="36" height="26" rx="3" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="286" y="158" width="36" height="26" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="324" y="158" width="36" height="26" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="362" y="158" width="36" height="26" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="400" y="158" width="36" height="26" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<rect x="438" y="158" width="36" height="26" rx="3" fill="none" stroke="var(--edge)"/>' +
		'<text x="38" y="176" text-anchor="middle" class="lbl">1</text>' +
		'<text x="76" y="176" text-anchor="middle" class="lbl">3</text>' +
		'<text x="114" y="176" text-anchor="middle" class="lbl">5</text>' +
		'<text x="152" y="176" text-anchor="middle" class="lbl">7</text>' +
		'<text x="190" y="176" text-anchor="middle" class="lbl">10</text>' +
		'<text x="228" y="176" text-anchor="middle" class="lbl">11</text>' +
		'<text x="266" y="176" text-anchor="middle" style="fill:var(--accent)">16</text>' +
		'<text x="304" y="176" text-anchor="middle" class="lbl">20</text>' +
		'<text x="342" y="176" text-anchor="middle" class="lbl">23</text>' +
		'<text x="380" y="176" text-anchor="middle" class="lbl">30</text>' +
		'<text x="418" y="176" text-anchor="middle" class="lbl">34</text>' +
		'<text x="456" y="176" text-anchor="middle" class="lbl">60</text>' +
		'<text x="38" y="200" text-anchor="middle" class="lbl">0</text>' +
		'<text x="266" y="200" text-anchor="middle" style="fill:var(--accent)">mid=6</text>' +
		'<text x="456" y="200" text-anchor="middle" class="lbl">11</text>' +
		'</g>' +
		// arrow: flat index mid maps back into the grid
		'<path d="M 266 156 C 266 128 190 110 138 92" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowS2D)"/>' +
		'<text x="250" y="228" class="lbl">mid = 6  →  row = 6/4 = 1, col = 6%4 = 2  →  matrix[1][2] = 16</text>' +
		'<defs><marker id="dgArrowS2D" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'search-2d-matrix',
		title: 'Search a 2D Matrix',
		nav: 'Search 2D Matrix',
		difficulty: 'Medium',
		category: 'Binary Search',
		task: 'Implement searchMatrix — make all 6 tests pass.',

		prose: [
			'<h2>Search a 2D Matrix</h2>' +
			'<p>Given an <code>m×n</code> matrix and a <code>target</code>, report whether ' +
			'the target appears in the matrix. The matrix has two properties:</p>' +
			'<ul><li>Each row is sorted ascending.</li>' +
			'<li>The first element of each row is greater than the last element of the ' +
			'previous row — so the whole matrix, read row by row, is one sorted sequence.</li></ul>' +
			'<p>Do it in <code>O(log(m·n))</code> — one binary search, not one per row.</p>' +
			'<h3>Example</h3>',
			{ code: 'searchMatrix([[1,3,5,7],[10,11,16,20],[23,30,34,60]], 3)   →  true\nsearchMatrix([[1,3,5,7],[10,11,16,20],[23,30,34,60]], 8)   →  false', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Because the rows chain, the matrix <em>is</em> a sorted array of ' +
			'<code>m·n</code> elements — it just happens to be stored in rows. Binary-search ' +
			'that virtual array: an index <code>mid</code> maps to a cell with two divisions, ' +
			'<code>matrix[mid/n][mid%n]</code>. The flat array never needs to exist:</p>' +
			DIAGRAM +
			'<p>All binary search needs is <em>random access by index</em> — and the index ' +
			'arithmetic provides exactly that.</p>',
		],

		starter: [
			'package main',
			'',
			'// searchMatrix reports whether target appears in matrix.',
			'// The matrix is m×n with every row sorted and each row’s first',
			'// element greater than the previous row’s last — i.e. fully sorted',
			'// when read row by row. Aim for O(log(m·n)): ONE binary search.',
			'func searchMatrix(matrix [][]int, target int) bool {',
			'	// your code here (hint: index i in the virtual flat array is',
			'	// the cell matrix[i/n][i%n] where n = len(matrix[0]))',
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
			'		m      [][]int',
			'		target int',
			'		want   bool',
			'	}',
			'	classic := [][]int{{1, 3, 5, 7}, {10, 11, 16, 20}, {23, 30, 34, 60}}',
			'	cases := []tc{',
			'		{classic, 3, true},',
			'		{classic, 8, false},  // falls in the gap between row 0 and row 1',
			'		{classic, 1, true},   // very first element',
			'		{classic, 60, true},  // very last element',
			'		{[][]int{{1, 3, 5, 7}}, 5, true},          // single row',
			'		{[][]int{{1}, {3}, {5}}, 4, false},        // single column, miss',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("matrix=%v target=%d", c.m, c.target),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// deep-copy the rows so a mutating solution can’t corrupt',
			'			// the shared `classic` matrix for later cases',
			'			cp := make([][]int, len(c.m))',
			'			for i := range c.m {',
			'				cp[i] = append([]int(nil), c.m[i]...)',
			'			}',
			'			got := searchMatrix(cp, c.target)',
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
			'// searchMatrix reports whether target appears in matrix.',
			'//',
			'// One binary search over the VIRTUAL flat array of m·n elements.',
			'// The matrix is never flattened — flattening would cost O(m·n) and',
			'// defeat the point. Instead the index arithmetic does the work:',
			'// flat index i lives at row i/n, column i%n (n = row width),',
			'// because each row contributes exactly n consecutive flat indices.',
			'func searchMatrix(matrix [][]int, target int) bool {',
			'	if len(matrix) == 0 || len(matrix[0]) == 0 {',
			'		return false',
			'	}',
			'	m, n := len(matrix), len(matrix[0])',
			'',
			'	// Classic half-open binary search over flat indices [0, m*n).',
			'	lo, hi := 0, m*n-1',
			'	for lo <= hi {',
			'		mid := lo + (hi-lo)/2 // overflow-safe midpoint',
			'		v := matrix[mid/n][mid%n]',
			'		switch {',
			'		case v == target:',
			'			return true',
			'		case v < target:',
			'			lo = mid + 1',
			'		default:',
			'			hi = mid - 1',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Scan every cell — O(m·n), ignores both sort guarantees. A first improvement ' +
			'uses them separately: binary-search the row (last element ≥ target picks the row), ' +
			'then binary-search within that row — O(log m + log n). Correct, but it takes two ' +
			'searches and two sets of edge cases.</p>' +
			'<h3>The insight: the matrix is already one sorted array</h3>' +
			'<p>The row-chaining guarantee makes the whole matrix a single sorted sequence in ' +
			'row-major order. Binary search never needed a real slice — it only needs to fetch ' +
			'the element at an arbitrary index. Two integer ops provide that fetch:</p>',
			{ code: 'lo, hi := 0, m*n-1\nfor lo <= hi {\n\tmid := lo + (hi-lo)/2\n\tv := matrix[mid/n][mid%n] // the whole trick: flat index → (row, col)\n\tswitch {\n\tcase v == target:\n\t\treturn true\n\tcase v < target:\n\t\tlo = mid + 1\n\tdefault:\n\t\thi = mid - 1\n\t}\n}\nreturn false' },
			'<p>Why <code>mid/n</code> and <code>mid%n</code>? Each row holds exactly ' +
			'<code>n</code> consecutive flat indices, so dividing by the row width counts how ' +
			'many <em>whole rows</em> precede the index, and the remainder is the offset inside ' +
			'the row. It is the same arithmetic that maps a 2-D array onto linear memory — done ' +
			'in reverse.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Binary search over an implicit (virtual) array</strong> — reach for it ' +
			'whenever a sorted sequence exists <em>conceptually</em> but not as a slice: a ' +
			'matrix in row-major order, a numeric answer range, a function of an index that is ' +
			'monotonic. Binary search only requires random access by index, so an O(1) ' +
			'index→value mapping is as good as a real array, and the cost stays ' +
			'O(log&nbsp;size) with zero extra space. The same idea drives ' +
			'<em>Koko Eating Bananas</em> (the “array” is the answer space of eating speeds, ' +
			'indexed by candidate speed) and <em>Median of Two Sorted Arrays</em> (the search ' +
			'runs over partition positions, not elements). Plain <em>Binary Search</em> is the ' +
			'degenerate case where the array actually exists.</p>',
		],
		complexity: { time: 'O(log(m·n))', space: 'O(1)' },
	});
})();
