/* Word Search — Backtracking (Medium). Grid DFS where the state is a PATH,
 * not a flood: each cell may appear at most once in the current path, so
 * the visited mark must be undone on backtrack (mark → recurse → unmark).
 * The board arrives as []string — immutable rows — so the reference
 * solution tracks visited in a separate [][]bool; the classic overwrite-
 * in-place trick (needs [][]byte) is shown in the explanation.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 180" width="500" height="180" role="img" aria-label="DFS path tracing ABCCED through the board">' +
		'<text x="20" y="16" class="lbl">word = “ABCCED” — one path, each cell used at most once</text>' +
		// non-path cells (plain edge)
		'<g fill="none" stroke="var(--edge)">' +
		'<rect x="122" y="28" width="34" height="34"/>' + // E (0,3)
		'<rect x="20" y="62" width="34" height="34"/>' +  // S (1,0)
		'<rect x="54" y="62" width="34" height="34"/>' +  // F (1,1)
		'<rect x="122" y="62" width="34" height="34"/>' + // S (1,3)
		'<rect x="20" y="96" width="34" height="34"/>' +  // A (2,0)
		'<rect x="122" y="96" width="34" height="34"/>' + // E (2,3)
		'</g>' +
		// path cells (accent)
		'<g fill="var(--panel)" stroke="var(--accent)" stroke-width="2">' +
		'<rect x="20" y="28" width="34" height="34"/>' +  // A (0,0)
		'<rect x="54" y="28" width="34" height="34"/>' +  // B (0,1)
		'<rect x="88" y="28" width="34" height="34"/>' +  // C (0,2)
		'<rect x="88" y="62" width="34" height="34"/>' +  // C (1,2)
		'<rect x="88" y="96" width="34" height="34"/>' +  // E (2,2)
		'<rect x="54" y="96" width="34" height="34"/>' +  // D (2,1)
		'</g>' +
		// letters
		'<g text-anchor="middle">' +
		'<text x="37" y="50">A</text><text x="71" y="50">B</text><text x="105" y="50">C</text><text x="139" y="50">E</text>' +
		'<text x="37" y="84">S</text><text x="71" y="84">F</text><text x="105" y="84">C</text><text x="139" y="84">S</text>' +
		'<text x="37" y="118">A</text><text x="71" y="118">D</text><text x="105" y="118">E</text><text x="139" y="118">E</text>' +
		'</g>' +
		// path arrows A→B→C→C→E→D
		'<g fill="none" stroke="var(--accent)" stroke-width="1.5">' +
		'<path d="M 44 45 L 58 45" marker-end="url(#dgArrowWS)"/>' +
		'<path d="M 78 45 L 92 45" marker-end="url(#dgArrowWS)"/>' +
		'<path d="M 105 54 L 105 66" marker-end="url(#dgArrowWS)"/>' +
		'<path d="M 105 88 L 105 100" marker-end="url(#dgArrowWS)"/>' +
		'<path d="M 96 113 L 82 113" marker-end="url(#dgArrowWS)"/>' +
		'</g>' +
		// annotations
		'<text x="185" y="50" style="fill:var(--accent)">A→B→C→C→E→D found ✓</text>' +
		'<text x="185" y="76" class="lbl">a cell already on the path is off-limits:</text>' +
		'<text x="185" y="92" class="lbl">“ABCB” fails — B is still marked when the</text>' +
		'<text x="185" y="108" class="lbl">path tries to return to it</text>' +
		'<text x="185" y="134" class="lbl">dead end ⇒ UNmark and retreat, so the cell</text>' +
		'<text x="185" y="150" class="lbl">is free for a different path to use later</text>' +
		'<text x="20" y="160" class="lbl">mark → recurse → unmark</text>' +
		'<defs><marker id="dgArrowWS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'word-search',
		title: 'Word Search',
		nav: 'Word Search',
		difficulty: 'Medium',
		category: 'Backtracking',
		task: 'Implement exist — make all 6 tests pass.',

		prose: [
			'<h2>Word Search</h2>' +
			'<p>Given a board of letters (a <code>[]string</code>, one string per row) and a ' +
			'non-empty <code>word</code>, return whether the word can be traced through ' +
			'<em>horizontally or vertically adjacent</em> cells.</p>' +
			'<ul><li>Each cell may be used <em>at most once per path</em>.</li>' +
			'<li>Rows are Go strings — immutable — so index bytes (<code>board[r][c]</code>) ' +
			'and track “on the current path” in a separate <code>[][]bool</code>.</li>' +
			'<li>All rows have equal length; diagonal steps do not count.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'board := []string{\n\t"ABCE",\n\t"SFCS",\n\t"ADEE",\n}\nexist(board, "ABCCED")  →  true\nexist(board, "SEE")     →  true\nexist(board, "ABCB")    →  false   // would need to reuse the B', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Try to start the word at <em>every</em> cell. From a cell that matches ' +
			'<code>word[i]</code>, mark it as on-path, recurse into the four neighbors for ' +
			'<code>word[i+1]</code>, and — crucially — <em>unmark it</em> when the recursion ' +
			'comes back empty-handed, so other paths may route through it:</p>' +
			DIAGRAM +
			'<p>Forget the unmark and correct answers get blocked by the ghosts of failed ' +
			'attempts.</p>',
		],

		starter: [
			'package main',
			'',
			'// exist reports whether word (non-empty) can be spelled by walking',
			'// horizontally/vertically adjacent cells of board, using each cell',
			'// at most once per path. Rows are immutable strings — track visited',
			'// cells separately (e.g. a [][]bool).',
			'func exist(board []string, word string) bool {',
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
			'		board []string',
			'		word  string',
			'		want  bool',
			'	}',
			'	// Rows are strings, hence immutable — no per-case deep copy needed.',
			'	classic := []string{"ABCE", "SFCS", "ADEE"}',
			'	cases := []tc{',
			'		{classic, "ABCCED", true},',
			'		{classic, "SEE", true},',
			'		// THE trap: A(0,0)→B(0,1)→C(0,2) then back to B — the B is',
			'		// already on the path. Passes only if cells can\'t be reused.',
			'		{classic, "ABCB", false},',
			'		{[]string{"A"}, "A", true}, // 1×1 board, single-letter hit',
			'		{[]string{"AB", "CD"}, "ABCDA", false}, // 5 letters > 4 cells',
			'		// Snake path covering most of the board — exercises deep',
			'		// backtracking through several dead ends before succeeding.',
			'		{[]string{"ABCE", "SFES", "ADEE"}, "ABCESEEEFS", true},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("board=%v, word=%q", c.board, c.word),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := exist(c.board, c.word)',
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
			'// exist reports whether word can be traced through adjacent board',
			'// cells, each used at most once per path.',
			'//',
			'// DFS from every cell. The visited grid records "on the CURRENT',
			'// path" — not "ever seen" — which is why every mark is undone on the',
			'// way out: a cell that dead-ended for one route is still fair game',
			'// for a different route. That mark→recurse→unmark discipline is the',
			'// whole trick; a permanent mark (flood-fill style) would wrongly',
			'// reject words whose correct path crosses an earlier failed attempt.',
			'func exist(board []string, word string) bool {',
			'	rows := len(board)',
			'	if rows == 0 {',
			'		return false',
			'	}',
			'	cols := len(board[0])',
			'	if len(word) > rows*cols {',
			'		return false // cheap prune: more letters than cells can never fit',
			'	}',
			'',
			'	// Rows are immutable strings, so path membership lives in a',
			'	// parallel bool grid instead of overwriting letters in place.',
			'	visited := make([][]bool, rows)',
			'	for r := range visited {',
			'		visited[r] = make([]bool, cols)',
			'	}',
			'',
			'	// dfs: does word[i:] start at (r, c)? Preconditions checked at the',
			'	// top (bounds, on-path, letter match) keep the four recursive',
			'	// calls guard-free.',
			'	var dfs func(r, c, i int) bool',
			'	dfs = func(r, c, i int) bool {',
			'		if r < 0 || r >= rows || c < 0 || c >= cols || visited[r][c] || board[r][c] != word[i] {',
			'			return false',
			'		}',
			'		if i == len(word)-1 {',
			'			return true // last letter matched — path complete',
			'		}',
			'		visited[r][c] = true // mark: this cell is on the current path',
			'		found := dfs(r-1, c, i+1) || dfs(r+1, c, i+1) ||',
			'			dfs(r, c-1, i+1) || dfs(r, c+1, i+1)',
			'		visited[r][c] = false // unmark: free the cell for other paths',
			'		return found',
			'	}',
			'',
			'	// The word can start anywhere — try every cell. dfs bails on the',
			'	// first-letter mismatch immediately, so this scan is cheap.',
			'	for r := 0; r < rows; r++ {',
			'		for c := 0; c < cols; c++ {',
			'			if dfs(r, c, 0) {',
			'				return true',
			'			}',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why flood fill isn’t enough</h3>' +
			'<p>This looks like Number of Islands — grid, DFS, four directions — but the ' +
			'state is different in kind. Flood fill asks “is this cell <em>reachable</em>?” ' +
			'and may mark cells visited forever. Here the question is “does an <em>ordered ' +
			'path</em> spelling the word run through here?”, and a cell blocked for one ' +
			'candidate path must be available to the next. Permanent marks fail the ' +
			'snake-word test: the right path often crosses cells an earlier dead-end ' +
			'attempt already touched.</p>' +
			'<h3>Mark, recurse, unmark</h3>' +
			'<p>So the visited grid tracks membership in the <em>current</em> path only. ' +
			'Set the flag before exploring the neighbors, clear it after — success or ' +
			'failure:</p>',
			{ code: 'visited[r][c] = true // on the path while my subtree is explored\nfound := dfs(r-1, c, i+1) || dfs(r+1, c, i+1) ||\n\tdfs(r, c-1, i+1) || dfs(r, c+1, i+1)\nvisited[r][c] = false // ALWAYS undo — this is the backtrack' },
			'<p>The <code>"ABCB"</code> case is the reuse trap in miniature: A→B→C matches, ' +
			'then the path needs a B — the only B is <em>already on the path</em>, so the ' +
			'DFS correctly refuses. An implementation without per-path marking happily ' +
			'reuses it and returns true. Note Go’s <code>||</code> short-circuits, so the ' +
			'first successful direction stops the other three — but the unmark still runs ' +
			'before returning.</p>' +
			'<h3>The in-place variant</h3>' +
			'<p>When the board is mutable (<code>[][]byte</code>), the classic trick drops ' +
			'the bool grid: overwrite the cell with a sentinel on the way in and restore ' +
			'the letter on the way out. Same discipline, the board doubles as the visited ' +
			'set:</p>',
			{ code: 'saved := board[r][c]\nboard[r][c] = \'#\' // no letter matches \'#\', so revisits fail the compare\nfound := ...       // the four recursive calls\nboard[r][c] = saved // restore — the board is intact when exist returns' },
			'<p>Our board is <code>[]string</code> — immutable rows — so the solution keeps ' +
			'the explicit <code>[][]bool</code>. Cost either way: worst case ' +
			'O(m·n·3<sup>L</sup>) — every start cell, three directions per step after the ' +
			'first (never straight back), path length L — with O(L) recursion depth.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Backtracking with undo — mark → recurse → unmark</strong> — reach ' +
			'for it whenever the search state is a <em>path or partial assignment</em> and ' +
			'a resource claimed by the current branch must be released when that branch is ' +
			'abandoned (triggers: “each … used at most once”, “place N pieces so that…”). ' +
			'Cost: exponential in path length, tamed by early pruning (the letter-mismatch ' +
			'check kills most branches at depth 1). It is the same choose–explore–undo ' +
			'skeleton as <em>Subsets</em> and <em>Generate Parentheses</em> (there the undo ' +
			'is popping the shared buffer; here it is clearing a grid flag), and the exact ' +
			'visited-state discipline that powers N-Queens and Sudoku solvers. Contrast ' +
			'<em>Number of Islands</em>, where marks are deliberately permanent — ' +
			'connectivity, not paths.</p>',
		],
		complexity: { time: 'O(m·n · 3^L)', space: 'O(m·n) visited + O(L) stack' },
	});
})();
