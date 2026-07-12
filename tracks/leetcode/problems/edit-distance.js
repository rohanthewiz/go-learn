/* Edit Distance — Dynamic Programming (Medium). Levenshtein distance:
 * fewest insert/delete/replace operations turning word1 into word2. Same
 * (m+1)×(n+1) prefix-pair grid as Longest Common Subsequence, but the
 * transitions are the three edits — the teaching point is the mapping
 * from each edit to its grid direction (replace=diagonal, delete=up,
 * insert=left), which is what students routinely miss.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 230" width="500" height="230" role="img" aria-label="the three edit operations mapped to grid directions">' +
		'<text x="20" y="16" class="lbl">dp[i][j] = edits turning word1[:i] into word2[:j] · each move IS an edit</text>' +
		// axis hints
		'<text x="150" y="40" text-anchor="middle" class="lbl">j−1</text>' +
		'<text x="300" y="40" text-anchor="middle" class="lbl">j  (word2 →)</text>' +
		'<text x="60" y="78" text-anchor="end" class="lbl">i−1</text>' +
		'<text x="60" y="152" text-anchor="end" class="lbl">i  (word1 ↓)</text>' +
		// four cells: w=110, h=44
		'<g fill="var(--panel)">' +
		'<rect x="95" y="50" width="110" height="44" rx="4" stroke="var(--edge)"/>' +
		'<rect x="245" y="50" width="110" height="44" rx="4" stroke="var(--edge)"/>' +
		'<rect x="95" y="124" width="110" height="44" rx="4" stroke="var(--edge)"/>' +
		'<rect x="245" y="124" width="110" height="44" rx="4" stroke="var(--accent)" stroke-width="2"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="150" y="77">dp[i−1][j−1]</text>' +
		'<text x="300" y="77">dp[i−1][j]</text>' +
		'<text x="150" y="151">dp[i][j−1]</text>' +
		'<text x="300" y="151" style="fill:var(--accent)">dp[i][j]</text>' +
		'</g>' +
		// the three arrows into dp[i][j]
		'<path d="M 190 98 L 258 128" fill="none" stroke="var(--accent)" stroke-width="1.8" marker-end="url(#dgArrowED)"/>' +
		'<path d="M 300 98 L 300 118" fill="none" stroke="var(--err-edge)" stroke-width="1.5" marker-end="url(#dgArrowEDdel)"/>' +
		'<path d="M 209 146 L 239 146" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowEDins)"/>' +
		// move labels
		'<text x="176" y="118" class="lbl" style="fill:var(--accent)">replace (or free match)</text>' +
		'<text x="310" y="112" class="lbl" style="fill:var(--err-edge)">delete word1[i−1]</text>' +
		'<text x="182" y="184" class="lbl" style="fill:var(--ok)">insert word2[j−1]</text>' +
		'<text x="20" y="210">chars equal → diagonal, free · else → 1 + min(replace, delete, insert)</text>' +
		'<defs>' +
		'<marker id="dgArrowED" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowEDdel" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'<marker id="dgArrowEDins" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'edit-distance',
		title: 'Edit Distance',
		nav: 'Edit Distance',
		difficulty: 'Medium',
		category: 'Dynamic Programming',
		task: 'Implement minDistance — make all 6 tests pass.',

		prose: [
			'<h2>Edit Distance</h2>' +
			'<p>Given two strings <code>word1</code> and <code>word2</code>, return the ' +
			'minimum number of operations to convert <code>word1</code> into ' +
			'<code>word2</code>. Three operations are allowed, each costing 1:</p>' +
			'<ul><li><strong>Insert</strong> a character</li>' +
			'<li><strong>Delete</strong> a character</li>' +
			'<li><strong>Replace</strong> a character</li></ul>' +
			'<p>Equal strings need 0 edits; turning the empty string into a word takes ' +
			'one insert per character (and the reverse, one delete per character).</p>' +
			'<h3>Example</h3>',
			{ code: 'minDistance("horse", "ros")          →  3   // horse →(replace h→r) rorse →(delete r) rose →(delete e) ros\nminDistance("intention", "execution")  →  5\nminDistance("", "abc")                 →  3   // three inserts', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Same state as Longest Common Subsequence — <code>dp[i][j]</code> is the ' +
			'answer for the <strong>prefix pair</strong> <code>word1[:i]</code>, ' +
			'<code>word2[:j]</code> — but now every grid move is one of the three edits. ' +
			'If the last characters already match, the diagonal is free; otherwise pay 1 ' +
			'and take the cheapest neighbor:</p>' +
			DIAGRAM +
			'<p>The base cases are no longer zero: row 0 is <code>j</code> (build word2 by ' +
			'inserts) and column 0 is <code>i</code> (erase word1 by deletes).</p>',
		],

		starter: [
			'package main',
			'',
			'// minDistance returns the minimum number of single-character edits',
			'// (insert, delete, or replace — each cost 1) needed to turn word1',
			'// into word2. Equal strings need 0 edits.',
			'func minDistance(word1, word2 string) int {',
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
			'		a, b string',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{"horse", "ros", 3},           // the classic walkthrough',
			'		{"intention", "execution", 5}, // longer mix of all three edits',
			'		{"same", "same", 0},           // equal strings: whole diagonal free',
			'		{"", "abc", 3},                // empty → word: pure inserts (base row)',
			'		{"abcd", "", 4},               // word → empty: pure deletes (base column)',
			'		{"cat", "cut", 1},             // single replace beats delete+insert (2)',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("word1=%q, word2=%q", c.a, c.b),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := minDistance(c.a, c.b)',
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
			'// minDistance returns the Levenshtein distance between word1 and word2:',
			'// the fewest unit-cost inserts, deletes, and replaces turning one into',
			'// the other.',
			'//',
			'// State: dp[i][j] = edits to turn word1[:i] into word2[:j] — the same',
			'// prefix-pair grid as LCS, richer move set. Each neighbor of a cell IS',
			'// one edit applied as the LAST step of an optimal script:',
			'//',
			'//	dp[i-1][j-1] ↘ replace word1[i-1] with word2[j-1]  (free if equal)',
			'//	dp[i-1][j]   ↓ delete  word1[i-1]  (word2 prefix already done)',
			'//	dp[i][j-1]   → insert  word2[j-1]  (append it after the rest)',
			'//',
			'// Optimal substructure holds because edit scripts can be reordered to',
			'// touch positions left-to-right without changing their length, so the',
			'// last operation always splits off a strictly smaller prefix pair.',
			'func minDistance(word1, word2 string) int {',
			'	m, n := len(word1), len(word2)',
			'',
			'	dp := make([][]int, m+1)',
			'	for i := range dp {',
			'		dp[i] = make([]int, n+1)',
			'	}',
			'	// Base cases are NOT zero (unlike LCS): against an empty prefix',
			'	// the only option is pure inserts (row 0) or pure deletes (col 0).',
			'	for j := 0; j <= n; j++ {',
			'		dp[0][j] = j',
			'	}',
			'	for i := 0; i <= m; i++ {',
			'		dp[i][0] = i',
			'	}',
			'',
			'	for i := 1; i <= m; i++ {',
			'		for j := 1; j <= n; j++ {',
			'			if word1[i-1] == word2[j-1] {',
			'				// Matching last characters cost nothing — an optimal',
			'				// script never edits a character it can keep.',
			'				dp[i][j] = dp[i-1][j-1]',
			'				continue',
			'			}',
			'			// Pay 1 for whichever edit leaves the cheapest subproblem.',
			'			best := dp[i-1][j-1] // replace: consumes a char of BOTH',
			'			if dp[i-1][j] < best {',
			'				best = dp[i-1][j] // delete: consumes a char of word1 only',
			'			}',
			'			if dp[i][j-1] < best {',
			'				best = dp[i][j-1] // insert: consumes a char of word2 only',
			'			}',
			'			dp[i][j] = best + 1',
			'		}',
			'	}',
			'	return dp[m][n]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Search over all edit scripts — branch three ways at every mismatch and ' +
			'recurse. Exponential, and rife with repeats: “fix the first characters, then ' +
			'handle the rest” reaches the same <em>pair of remaining suffixes</em> along ' +
			'countless different edit orders. Only (m+1)·(n+1) distinct pairs exist.</p>' +
			'<h3>The grid, and what each direction means</h3>' +
			'<p>Reuse the LCS state — <code>dp[i][j]</code> = edits turning ' +
			'<code>word1[:i]</code> into <code>word2[:j]</code> — and consider the ' +
			'<em>last</em> operation of an optimal script. There are exactly three ' +
			'choices, and each maps to one grid neighbor. This mapping is the part worth ' +
			'memorizing, because every prefix-pair DP reuses it:</p>' +
			'<ul>' +
			'<li><strong>Replace = diagonal ↘</strong> <code>dp[i−1][j−1] + 1</code>: turn ' +
			'<code>word1[i−1]</code> into <code>word2[j−1]</code> — one character of ' +
			'<em>both</em> strings is consumed. When the characters already match, the ' +
			'diagonal is free: that is the “match” move, replace with cost 0.</li>' +
			'<li><strong>Delete = from above ↓</strong> <code>dp[i−1][j] + 1</code>: drop ' +
			'<code>word1[i−1]</code>; only word1 shrinks, the word2 target is unchanged.</li>' +
			'<li><strong>Insert = from the left →</strong> <code>dp[i][j−1] + 1</code>: ' +
			'append <code>word2[j−1]</code>; only the word2 side advances.</li>' +
			'</ul>' +
			'<p>The base cases stop being all-zero: with one prefix empty, the other must ' +
			'be built by pure inserts (<code>dp[0][j] = j</code>) or destroyed by pure ' +
			'deletes (<code>dp[i][0] = i</code>).</p>' +
			'<h3>Walkthrough: "horse" → "ros"</h3>',
			{ code: '        ""   r   o   s\n    ""   0   1   2   3      ← row 0: j inserts\n    h    1   1   2   3      h→r is a replace (diag 0 + 1)\n    o    2   2   1*  2      * o == o: free diagonal\n    r    3   2   2   2\n    s    4   3   3   2*     * s == s: free diagonal\n    e    5   4   4   3      answer: dp[5][3] = 3\n    ↑ col 0: i deletes', lang: 'txt' },
			'<p>Tracing the winning arrows backwards from <code>dp[5][3]</code> recovers ' +
			'an actual script: delete e (up), match s (free diagonal), delete r (up), ' +
			'match o (free diagonal), replace h→r (paid diagonal) — 3 edits, the same ' +
			'count as the statement’s <code>horse → rorse → rose → ros</code> even though ' +
			'the operations differ. Multiple optimal scripts, one distance.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>2-D DP over prefix pairs, transitions = the allowed edits</strong> ' +
			'— the same state space as Longest Common Subsequence with a richer move set: ' +
			'the grid is fixed by the two inputs, and the <em>problem</em> only decides ' +
			'which arrows exist and what they cost. Triggers: “minimum operations to ' +
			'transform”, “align two sequences”, any pairwise string comparison. Cost ' +
			'O(m·n) time, and two rolling rows cut space to O(min(m,n)) exactly as in LCS. ' +
			'Siblings: Longest Common Subsequence (delete-only edits — in fact ' +
			'edits = m + n − 2·LCS when replace is banned), and in the real world this is ' +
			'<em>Levenshtein distance</em> by name: spellcheckers ranking candidate ' +
			'corrections, <code>diff</code> tools minimizing patch size, and DNA/protein ' +
			'alignment (Needleman–Wunsch is this grid with biological costs).</p>',
		],
		complexity: { time: 'O(m·n)', space: 'O(m·n), O(min(m,n)) with two rows' },
	});
})();
