/* Longest Common Subsequence — Dynamic Programming (Medium). The track's
 * introduction to 2-D DP over TWO sequences: the state is a pair of
 * prefixes, dp[i][j] = LCS of text1[:i] and text2[:j]. Diagonal move on a
 * character match, best-of-above/left otherwise. The same grid — with a
 * different move set — solves Edit Distance next.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 220" width="500" height="220" role="img" aria-label="the three grid moves that feed one LCS cell">' +
		'<text x="20" y="16" class="lbl">dp[i][j] = LCS of text1[:i] and text2[:j] · three neighbors feed each cell</text>' +
		// axis hints
		'<text x="150" y="40" text-anchor="middle" class="lbl">j−1</text>' +
		'<text x="300" y="40" text-anchor="middle" class="lbl">j  (text2 →)</text>' +
		'<text x="60" y="78" text-anchor="end" class="lbl">i−1</text>' +
		'<text x="60" y="152" text-anchor="end" class="lbl">i  (text1 ↓)</text>' +
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
		'<path d="M 190 98 L 258 128" fill="none" stroke="var(--ok)" stroke-width="1.8" marker-end="url(#dgArrowLCSQok)"/>' +
		'<path d="M 300 98 L 300 118" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowLCSQ)"/>' +
		'<path d="M 209 146 L 239 146" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowLCSQ)"/>' +
		// move labels
		'<text x="190" y="118" class="lbl" style="fill:var(--ok)">match: +1</text>' +
		'<text x="310" y="112" class="lbl">skip text1[i−1]</text>' +
		'<text x="196" y="184" class="lbl">skip text2[j−1]</text>' +
		'<text x="20" y="208">chars equal → diagonal + 1 · otherwise → max(above, left)</text>' +
		'<defs>' +
		'<marker id="dgArrowLCSQ" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowLCSQok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'longest-common-subsequence',
		title: 'Longest Common Subsequence',
		nav: 'Longest Common Subseq.',
		difficulty: 'Medium',
		category: 'Dynamic Programming',
		task: 'Implement longestCommonSubsequence — make all 6 tests pass.',

		prose: [
			'<h2>Longest Common Subsequence</h2>' +
			'<p>Given two strings <code>text1</code> and <code>text2</code>, return the ' +
			'length of their longest common <em>subsequence</em> — the longest string that ' +
			'can be obtained from <strong>both</strong> by deleting characters without ' +
			'reordering the rest. Return 0 if they share none.</p>' +
			'<ul><li>Subsequence, not substring: the kept characters need not be adjacent, ' +
			'only in order.</li>' +
			'<li>Only the <em>length</em> is required, not the subsequence itself.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'longestCommonSubsequence("abcde", "ace")  →  3   // "ace"\nlongestCommonSubsequence("abc", "def")    →  0   // nothing in common\nlongestCommonSubsequence("abc", "abc")    →  3   // the whole string', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>One sequence gives a 1-D DP; <em>two</em> sequences need a state that is a ' +
			'<strong>pair of prefixes</strong>: <code>dp[i][j]</code> = LCS length of the ' +
			'first <code>i</code> chars of text1 and the first <code>j</code> chars of ' +
			'text2. Compare the two last characters of the prefixes — equal means they can ' +
			'end the common subsequence together (diagonal + 1); unequal means at least one ' +
			'of them is dead weight, so drop whichever hurts less (best of above/left):</p>' +
			DIAGRAM +
			'<p>Row 0 and column 0 (an empty prefix) are all zeros, and the answer sits in ' +
			'the far corner <code>dp[m][n]</code>.</p>',
		],

		starter: [
			'package main',
			'',
			'// longestCommonSubsequence returns the length of the longest string',
			'// obtainable from BOTH text1 and text2 by deleting characters',
			'// (keeping the rest in order). Returns 0 when nothing is shared.',
			'func longestCommonSubsequence(text1, text2 string) int {',
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
			'		{"abcde", "ace", 3},              // the classic: "ace"',
			'		{"abc", "def", 0},                // disjoint alphabets',
			'		{"kitten", "kitten", 6},          // identical strings: whole length',
			'		{"", "abc", 0},                   // empty string: the base row IS the answer',
			'		{"bsbininm", "jmjkbkjkv", 1},     // shares b and m but never in order',
			'		{"oxcpqrsvwf", "shmtulqrypy", 2}, // "qr" hides mid-string',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("text1=%q, text2=%q", c.a, c.b),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := longestCommonSubsequence(c.a, c.b)',
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
			'// longestCommonSubsequence returns the LCS length of text1 and text2.',
			'//',
			'// State: dp[i][j] = LCS of the prefixes text1[:i] and text2[:j].',
			'// Indexing by PREFIX LENGTH (not last index) buys a free base case:',
			'// row 0 and column 0 mean "one string is empty" and stay zero, so',
			'// the transitions never bounds-check.',
			'//',
			'// Transition — look at the prefixes\' last characters:',
			'//   equal   → they can jointly end the common subsequence, and no',
			'//             longer LCS could avoid using them (exchange argument:',
			'//             any LCS not ending in this pair can be rewritten to),',
			'//             so dp[i][j] = dp[i-1][j-1] + 1.',
			'//   unequal → they cannot BOTH be in the LCS, so one is droppable:',
			'//             dp[i][j] = max(dp[i-1][j], dp[i][j-1]).',
			'func longestCommonSubsequence(text1, text2 string) int {',
			'	m, n := len(text1), len(text2)',
			'',
			'	// (m+1)×(n+1): the +1 rows/cols are the empty-prefix base cases.',
			'	dp := make([][]int, m+1)',
			'	for i := range dp {',
			'		dp[i] = make([]int, n+1)',
			'	}',
			'',
			'	for i := 1; i <= m; i++ {',
			'		for j := 1; j <= n; j++ {',
			'			// dp index i corresponds to string index i-1 — the',
			'			// price of the prefix-length convention, paid once here.',
			'			if text1[i-1] == text2[j-1] {',
			'				dp[i][j] = dp[i-1][j-1] + 1',
			'			} else if dp[i-1][j] >= dp[i][j-1] {',
			'				dp[i][j] = dp[i-1][j] // dropping text1[i-1] is no worse',
			'			} else {',
			'				dp[i][j] = dp[i][j-1] // dropping text2[j-1] wins',
			'			}',
			'		}',
			'	}',
			'	return dp[m][n]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Try every subsequence of text1 (2^m of them) and check each against text2. ' +
			'Even the smarter recursion — “compare last characters, branch on dropping one” ' +
			'— is exponential without caching, because the same prefix pair is reached ' +
			'along many different drop orders.</p>' +
			'<h3>The state: a pair of prefixes</h3>' +
			'<p>That recursion only ever asks about a <em>prefix of text1</em> versus a ' +
			'<em>prefix of text2</em> — there are just (m+1)·(n+1) distinct questions. ' +
			'Name them: <code>dp[i][j]</code> = LCS of <code>text1[:i]</code> and ' +
			'<code>text2[:j]</code>. This “index by prefix lengths of both inputs” move is ' +
			'the single most reusable idea in string DP. The recurrence compares the two ' +
			'prefixes’ last characters: if they match, they extend the diagonal subproblem ' +
			'by 1; if not, at least one of them is not in the LCS, so take the better of ' +
			'dropping either.</p>' +
			'<h3>Walkthrough: "abcde" vs "ace"</h3>' +
			'<p>Rows are prefixes of <code>"abcde"</code>, columns of <code>"ace"</code>. ' +
			'Matches (a·a, c·c, e·e) step diagonally and add 1; everything else copies the ' +
			'larger of the cell above and the cell to the left:</p>',
			{ code: '        ""   a   c   e\n    ""   0   0   0   0\n    a    0   1*  1   1     * a == a: diag 0 + 1\n    b    0   1   1   1\n    c    0   1   2*  2     * c == c: diag 1 + 1\n    d    0   1   2   2\n    e    0   1   2   3*    * e == e: diag 2 + 1 → answer 3', lang: 'txt' },
			'<p>The three starred cells are exactly the characters of <code>"ace"</code> ' +
			'being locked in; between them the values just flow right and down unchanged.</p>' +
			'<h3>Space: two rows suffice</h3>' +
			'<p>Row <code>i</code> reads only row <code>i−1</code> and its own left ' +
			'neighbor, so the full table can shrink to two rolling rows — O(min(m, n)) ' +
			'memory if the shorter string is made the column axis:</p>',
			{ code: 'prev := make([]int, n+1)\ncur := make([]int, n+1)\nfor i := 1; i <= m; i++ {\n\tfor j := 1; j <= n; j++ {\n\t\tif text1[i-1] == text2[j-1] {\n\t\t\tcur[j] = prev[j-1] + 1\n\t\t} else if prev[j] >= cur[j-1] {\n\t\t\tcur[j] = prev[j]\n\t\t} else {\n\t\t\tcur[j] = cur[j-1]\n\t\t}\n\t}\n\tprev, cur = cur, prev // swap: cur is overwritten next pass\n}\nreturn prev[n]' },
			'<p>(Unlike Unique Paths it cannot drop to <em>one</em> row with a plain ' +
			'in-place sweep, because the diagonal <code>prev[j-1]</code> would already be ' +
			'overwritten — the two-row swap sidesteps that.)</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>2-D DP over prefix pairs</strong> — whenever a problem aligns, ' +
			'compares, or transforms <em>two</em> sequences (“common”, “edit”, “interleave” ' +
			'are the trigger words), define the state as a pair of prefix lengths and fill ' +
			'an (m+1)×(n+1) grid where the diagonal means “consume a character from both” ' +
			'and the edges mean “skip one side”. Cost: O(m·n) time, O(min(m,n)) space after ' +
			'row-rolling. Edit Distance is the same grid with a different move set — ' +
			'match is still the free diagonal, but the skip moves become insert/delete/' +
			'replace with cost 1 — and the real world runs on it: <code>diff</code> and ' +
			'git’s hunk computation are LCS on lines, and DNA sequence alignment is the ' +
			'same grid with biological scoring.</p>',
		],
		complexity: { time: 'O(m·n)', space: 'O(m·n), O(min(m,n)) with two rows' },
	});
})();
