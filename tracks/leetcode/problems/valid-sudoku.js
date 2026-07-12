/* Valid Sudoku — Arrays & Hashing (Medium). Hash-set membership as
 * constraint checking: one pass, three seen-sets (row/col/box), and the
 * boxIndex = r/3*3 + c/3 trick. Harness builds each board fresh from a
 * compact string encoding, so user mutation can never leak across cases.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 220" width="520" height="220" role="img" aria-label="Sudoku box numbering and the r/3*3 + c/3 formula">' +
		// 9x9 grid, 18px cells → 162px square at (20,30)
		'<g stroke="var(--edge)" fill="none">' +
		'<rect x="20" y="30" width="162" height="162"/>' +
		'<path d="M38 30v162M56 30v162M92 30v162M110 30v162M146 30v162M164 30v162" stroke-width="0.5"/>' +
		'<path d="M20 48h162M20 66h162M20 102h162M20 120h162M20 156h162M20 174h162" stroke-width="0.5"/>' +
		// heavy 3x3 box lines
		'<path d="M74 30v162M128 30v162M20 84h162M20 138h162" stroke-width="1.8"/>' +
		'</g>' +
		'<text x="20" y="18" class="lbl">boxes are numbered 0–8 in reading order</text>' +
		// box index labels (centers of the nine 54px boxes)
		'<g style="fill:var(--dim)">' +
		'<text x="47" y="62" text-anchor="middle">0</text>' +
		'<text x="101" y="62" text-anchor="middle">1</text>' +
		'<text x="155" y="62" text-anchor="middle">2</text>' +
		'<text x="47" y="116" text-anchor="middle">3</text>' +
		'<text x="155" y="116" text-anchor="middle">5</text>' +
		'<text x="47" y="170" text-anchor="middle">6</text>' +
		'<text x="101" y="170" text-anchor="middle">7</text>' +
		'<text x="155" y="170" text-anchor="middle">8</text>' +
		'</g>' +
		// highlighted box 4 with the duplicate pair that rows/cols alone miss
		'<rect x="74" y="84" width="54" height="54" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="83" y="102" style="fill:var(--err-edge)">5</text>' +
		'<text x="119" y="134" style="fill:var(--err-edge)">5</text>' +
		'<text x="101" y="116" text-anchor="middle" style="fill:var(--accent)">4</text>' +
		// cell → box mapping annotation
		'<circle cx="86" cy="97" r="9" fill="none" stroke="var(--err-edge)"/>' +
		'<path d="M 96 96 C 180 70 240 70 300 88" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowVSD)"/>' +
		'<g>' +
		'<text x="308" y="80" class="lbl">cell (r=3, c=3)</text>' +
		'<text x="308" y="100">box = r/3*3 + c/3</text>' +
		'<text x="308" y="120" class="lbl">= 3/3*3 + 3/3 = 4</text>' +
		'<text x="308" y="152" style="fill:var(--err-edge)">both 5s land in box 4 → invalid,</text>' +
		'<text x="308" y="170" class="lbl">yet every row and column is clean —</text>' +
		'<text x="308" y="186" class="lbl">the box check is not optional</text>' +
		'</g>' +
		'<defs><marker id="dgArrowVSD" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'valid-sudoku',
		title: 'Valid Sudoku',
		nav: 'Valid Sudoku',
		difficulty: 'Medium',
		category: 'Arrays & Hashing',
		task: 'Implement isValidSudoku — make all 6 tests pass.',

		prose: [
			'<h2>Valid Sudoku</h2>' +
			'<p>Given a 9×9 Sudoku board (<code>board[r][c]</code> is a digit ' +
			'<code>"1"</code>–<code>"9"</code> or <code>"."</code> for empty), report whether ' +
			'the board is <em>valid</em>:</p>' +
			'<ul>' +
			'<li>no digit repeats in any <strong>row</strong>,</li>' +
			'<li>no digit repeats in any <strong>column</strong>,</li>' +
			'<li>no digit repeats in any of the nine <strong>3×3 boxes</strong>.</li>' +
			'</ul>' +
			'<p>Only the cells already filled in must obey the rules — <em>valid</em> does ' +
			'<strong>not</strong> mean <em>solvable</em>. A half-empty board with no conflicts ' +
			'is valid even if no completion exists.</p>' +
			'<h3>Example</h3>',
			{ code: 'row 0:  5 3 . | . 7 . | . . .\nrow 1:  6 . . | 1 9 5 | . . .\nrow 2:  . 9 8 | . . . | . 6 .\n...                            →  true (no conflicts among filled cells)', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Every filled cell belongs to exactly three groups — its row, its column, and ' +
			'its box. Keep a seen-set per group and ask “has this digit appeared in this ' +
			'group before?” The only non-obvious part is naming the box a cell lives in:</p>' +
			DIAGRAM +
			'<p>Integer division collapses each coordinate to its 3-wide band, and ' +
			'<code>r/3*3 + c/3</code> numbers the boxes 0–8 in reading order. One pass over ' +
			'81 cells, three O(1) membership checks each.</p>',
		],

		starter: [
			'package main',
			'',
			'// isValidSudoku reports whether a 9×9 Sudoku board is valid: no digit',
			'// "1"–"9" appears twice in any row, any column, or any 3×3 box.',
			'// board[r][c] is "1"–"9" or "." (empty; ignored). Validity does NOT',
			'// require the board to be solvable — only the filled cells matter.',
			'func isValidSudoku(board [][]string) bool {',
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
			'// parseBoard expands compact row strings ("53..7....") into the',
			'// [][]string board the user function receives. Built fresh inside',
			'// each case, so a solution that mutates the board cannot leak state',
			'// into later cases.',
			'func parseBoard(rows []string) [][]string {',
			'	board := make([][]string, len(rows))',
			'	for i, row := range rows {',
			'		cells := make([]string, len(row))',
			'		for j := 0; j < len(row); j++ {',
			'			cells[j] = string(row[j])',
			'		}',
			'		board[i] = cells',
			'	}',
			'	return board',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		rows []string',
			'		want bool',
			'	}',
			'	classic := []string{',
			'		"53..7....",',
			'		"6..195...",',
			'		".98....6.",',
			'		"8...6...3",',
			'		"4..8.3..1",',
			'		"7...2...6",',
			'		".6....28.",',
			'		"...419..5",',
			'		"....8..79",',
			'	}',
			'	// classic board with row 3 col 4 changed 6→9: column 4 now holds',
			'	// two 9s (rows 1 and 3) while every row and every box stays clean —',
			'	// this catches solutions that only check rows.',
			'	colDup := append([]string(nil), classic...)',
			'	colDup[3] = "8...9...3"',
			'	empty := []string{',
			'		".........", ".........", ".........",',
			'		".........", ".........", ".........",',
			'		".........", ".........", ".........",',
			'	}',
			'	// two 1s in box 0 at (0,0) and (1,1): different row, different',
			'	// column — ONLY the box check can reject this board.',
			'	boxDup := append([]string(nil), empty...)',
			'	boxDup[0] = "1........"',
			'	boxDup[1] = ".1......."',
			'	// two 2s in row 4 at columns 2 and 7: different columns, different',
			'	// boxes (3 and 5) — only the row check fires.',
			'	rowDup := append([]string(nil), empty...)',
			'	rowDup[4] = "..2....2."',
			'	// sparse but conflict-free: 1,2,3 share box 0 yet are distinct.',
			'	sparse := append([]string(nil), empty...)',
			'	sparse[0] = "1........"',
			'	sparse[1] = ".2......."',
			'	sparse[2] = "..3......"',
			'	cases := []tc{',
			'		{"classic LC board (valid)", classic, true},',
			'		{"classic with a column duplicate (9 twice in col 4)", colDup, false},',
			'		{"duplicate confined to a box (rows & cols clean)", boxDup, false},',
			'		{"empty board", empty, true},',
			'		{"duplicate in a row (2 twice in row 4)", rowDup, false},',
			'		{"sparse valid board", sparse, true},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := isValidSudoku(parseBoard(c.rows))',
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
			'// isValidSudoku reports whether a 9×9 Sudoku board is valid: no digit',
			'// "1"–"9" appears twice in any row, any column, or any 3×3 box.',
			'// board[r][c] is "1"–"9" or "." (empty; ignored). Validity does NOT',
			'// require the board to be solvable — only the filled cells matter.',
			'//',
			'// One pass. Each filled cell must be NEW to three groups — its row,',
			'// its column, and its box — so we keep one seen-set per group kind.',
			'// The bounds are fixed at 9×9, so plain bool arrays beat hash maps:',
			'// same O(1) membership answer, zero hashing and zero allocation.',
			'// (With unbounded coordinates the idiom would be map[[2]int]bool',
			'// keyed by (group, digit) — the shape of the idea is identical.)',
			'func isValidSudoku(board [][]string) bool {',
			'	// [group index][digit 0..8] — rows[r][d] means digit d+1 was',
			'	// already seen somewhere in row r.',
			'	var rows, cols, boxes [9][9]bool',
			'',
			'	for r := 0; r < 9; r++ {',
			'		for c := 0; c < 9; c++ {',
			'			cell := board[r][c]',
			'			if cell == "." {',
			'				continue',
			'			}',
			'			d := int(cell[0] - \'1\') // "1".."9" → 0..8',
			'',
			'			// Boxes tile the board 3×3. Integer division collapses',
			'			// each coordinate to its band (0, 1, or 2); band*3 + band',
			'			// numbers the boxes 0..8 in reading order:',
			'			//',
			'			//   0 | 1 | 2',
			'			//   --+---+--',
			'			//   3 | 4 | 5',
			'			//   --+---+--',
			'			//   6 | 7 | 8',
			'			b := r/3*3 + c/3',
			'',
			'			// Second sighting of d in ANY of the three groups → invalid.',
			'			// Checking before marking keeps the pass single and early-',
			'			// exiting: the first conflict ends the scan.',
			'			if rows[r][d] || cols[c][d] || boxes[b][d] {',
			'				return false',
			'			}',
			'			rows[r][d], cols[c][d], boxes[b][d] = true, true, true',
			'		}',
			'	}',
			'	return true',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Validate each of the 27 groups independently: for every row, scan it for ' +
			'duplicates; repeat for every column and every box. That is 27 scans of 9 cells ' +
			'— actually fine for a fixed 9×9 board, but it walks the board three times and ' +
			'the box-scanning loops are fiddly to index. The common <em>wrong</em> shortcut ' +
			'is checking only rows and columns: two equal digits placed diagonally inside ' +
			'one box pass both checks and slip through (test 3 exists precisely for this).</p>' +
			'<h3>One pass, three seen-sets</h3>' +
			'<p>Flip the loop inside-out: instead of iterating groups and scanning cells, ' +
			'iterate cells once and ask each cell’s three groups “have you seen this digit ' +
			'before?” — a set-membership question, answered in O(1):</p>',
			{ code: 'var rows, cols, boxes [9][9]bool // seen-sets: [group][digit]\n\nd := int(cell[0] - \'1\')   // "1".."9" → 0..8\nb := r/3*3 + c/3          // box index, 0..8 in reading order\nif rows[r][d] || cols[c][d] || boxes[b][d] {\n\treturn false // second sighting in some group\n}\nrows[r][d], cols[c][d], boxes[b][d] = true, true, true' },
			'<p>The whole trick is <code>r/3*3 + c/3</code>: integer division maps rows ' +
			'0–2, 3–5, 6–8 to bands 0, 1, 2 (and likewise for columns), and ' +
			'<code>band*3 + band</code> flattens the 3×3 grid of boxes into indices 0–8. ' +
			'Note <code>r/3*3 ≠ r</code> — the division truncates first; that “loss” is ' +
			'exactly the grouping we want.</p>' +
			'<p>Also worth internalizing: the problem asks about <em>consistency</em>, not ' +
			'<em>solvability</em>. Checking the constraints that filled cells impose is ' +
			'O(81); deciding solvability is a full backtracking search. Read the ' +
			'requirement before reaching for the big hammer.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Hash-set membership as constraint checking</strong> — reach for it ' +
			'whenever a rule reads “no X may repeat within group G”: one seen-set per ' +
			'group, one pass over the elements, O(1) per membership test, O(groups × ' +
			'alphabet) space. When the groups and alphabet are small and fixed (9×9 here), ' +
			'the “hash set” degrades gracefully into a bool array — same idea, cheaper ' +
			'constant. The same membership move drives Contains Duplicate (one global set), ' +
			'Valid Anagram and Group Anagrams (per-letter counts as the set/key), and ' +
			'Longest Consecutive Sequence (set lookups replace sorting).</p>',
		],
		complexity: { time: 'O(81) = O(1) — one pass over a fixed 9×9 board', space: 'O(3·9·9) = O(1) — three fixed seen-sets' },
	});
})();
