/* Palindromic Substrings — Dynamic Programming (Medium). Count every
 * palindromic substring occurrence. Taught with expand-around-center
 * (O(n²) time, O(1) space) over the 2n−1 centers; the explanation also
 * sketches the isPal[i][j] DP-table alternative and says when the table
 * is worth its O(n²) memory (when a later step needs it again, e.g.
 * palindrome partitioning).
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="expand around center on the string abba">' +
		'<text x="20" y="16" class="lbl">s = "abba" · n = 4 → 2n − 1 = 7 centers (4 chars + 3 gaps)</text>' +
		// string cells: x = 30 + i*58, w=50, y=30, h=34
		'<g fill="var(--panel)">' +
		'<rect x="30" y="30" width="50" height="34" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="88" y="30" width="50" height="34" rx="4" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="146" y="30" width="50" height="34" rx="4" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="204" y="30" width="50" height="34" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="55" y="52">a</text><text x="113" y="52">b</text>' +
		'<text x="171" y="52">b</text><text x="229" y="52">a</text>' +
		'</g>' +
		'<g text-anchor="middle" class="lbl">' +
		'<text x="55" y="80">0</text><text x="113" y="80">1</text>' +
		'<text x="171" y="80">2</text><text x="229" y="80">3</text>' +
		'</g>' +
		// the even center: caret at the gap between the two b's (x = 142)
		'<path d="M 142 100 L 142 70" fill="none" stroke="var(--accent)" stroke-width="1.8" marker-end="url(#dgArrowPSS)"/>' +
		'<text x="142" y="118" text-anchor="middle" class="lbl">even center: the b|b gap</text>' +
		// expansion arrows: first ring b↔b, second ring a↔a
		'<g fill="none" stroke="var(--accent)" stroke-width="1.5">' +
		'<path d="M 138 24 C 130 12 120 12 114 24" marker-end="url(#dgArrowPSS)"/>' +
		'<path d="M 146 24 C 154 12 164 12 170 24" marker-end="url(#dgArrowPSS)"/>' +
		'</g>' +
		'<g fill="none" stroke="var(--ok)" stroke-width="1.5">' +
		'<path d="M 130 8 C 100 -8 66 2 56 24" marker-end="url(#dgArrowPSSok)"/>' +
		'<path d="M 154 8 C 184 -8 218 2 228 24" marker-end="url(#dgArrowPSSok)"/>' +
		'</g>' +
		// right-hand tally
		'<text x="300" y="52" class="lbl">ring 1: b == b → count "bb"</text>' +
		'<text x="300" y="70" class="lbl">ring 2: a == a → count "abba"</text>' +
		'<text x="300" y="88" class="lbl">next ring: off the ends → stop</text>' +
		'<text x="20" y="152">char centers give a, b, b, a (4) · this gap gives bb, abba (2)</text>' +
		'<text x="20" y="176" style="fill:var(--ok)">total for "abba": 6 palindromic substrings</text>' +
		'<defs>' +
		'<marker id="dgArrowPSS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowPSSok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'palindromic-substrings',
		title: 'Palindromic Substrings',
		nav: 'Palindromic Substrings',
		difficulty: 'Medium',
		category: 'Dynamic Programming',
		task: 'Implement countSubstrings — make all 6 tests pass.',

		prose: [
			'<h2>Palindromic Substrings</h2>' +
			'<p>Given a string <code>s</code>, return the number of <em>palindromic ' +
			'substrings</em> in it. Count <strong>occurrences</strong>, not distinct ' +
			'strings: in <code>"aaa"</code> the substring <code>"aa"</code> appears at two ' +
			'positions and counts twice.</p>' +
			'<ul><li>Every single character is a palindrome of length 1.</li>' +
			'<li>Substrings are contiguous — this is not the subsequence problem.</li>' +
			'<li>The empty string contains 0 palindromic substrings.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'countSubstrings("abc")   →  3   // "a", "b", "c"\ncountSubstrings("aaa")   →  6   // "a"×3, "aa"×2, "aaa"\ncountSubstrings("abba")  →  6   // "a", "b", "b", "a", "bb", "abba"', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Instead of testing all O(n²) substrings from the outside in, grow ' +
			'palindromes from the inside out. Every palindrome has a center — either a ' +
			'character (odd length) or a gap between two characters (even length). That is ' +
			'<code>2n − 1</code> centers total; expand each one outward while the ends ' +
			'match, counting one palindrome per successful ring:</p>' +
			DIAGRAM +
			'<p>Each center expands in O(n), so the whole count is O(n²) time with O(1) ' +
			'extra space — no table needed.</p>',
		],

		starter: [
			'package main',
			'',
			'// countSubstrings returns how many substrings of s are palindromes,',
			'// counting every occurrence separately ("aaa" contains "aa" twice).',
			'// Single characters count; the empty string contains none.',
			'func countSubstrings(s string) int {',
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
			'		s    string',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{"abc", 3},      // no multi-char palindromes: just the 3 singles',
			'		{"aaa", 6},      // occurrences, not distinct: a,a,a,aa,aa,aaa',
			'		{"z", 1},        // single char',
			'		{"abba", 6},     // even-length centers: bb and abba need the gap centers',
			'		{"racecar", 10}, // 7 singles + cec + aceca + racecar',
			'		{"", 0},         // empty string: nothing to count',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("s=%q", c.s),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := countSubstrings(c.s)',
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
			'// countSubstrings counts palindromic substring occurrences in s.',
			'//',
			'// Expand around center: every palindrome is symmetric about a center,',
			'// and a string of length n has exactly 2n−1 of them — n characters',
			'// (odd-length palindromes) and n−1 gaps (even-length ones). Growing',
			'// outward from each center visits every palindrome exactly once,',
			'// because a palindrome determines its center uniquely.',
			'//',
			'// Encoding both center kinds in one loop: for center index c in',
			'// [0, 2n−1), the left arm starts at c/2 and the right arm at',
			'// c/2 + c%2 — even c puts both arms on the same character (odd',
			'// palindrome), odd c straddles the gap (even palindrome). One loop',
			'// body instead of two near-identical helpers.',
			'func countSubstrings(s string) int {',
			'	n := len(s)',
			'	count := 0',
			'	for c := 0; c < 2*n-1; c++ {',
			'		l, r := c/2, c/2+c%2',
			'		// Each successful ring is one more palindrome anchored at',
			'		// this center. The expansion stops at the first mismatch:',
			'		// once the outer pair differs, no wider ring can be a',
			'		// palindrome either, so breaking early loses nothing.',
			'		for l >= 0 && r < n && s[l] == s[r] {',
			'			count++',
			'			l--',
			'			r++',
			'		}',
			'	}',
			'	// n == 0 falls out naturally: 2n−1 is negative, the loop never',
			'	// runs, and the count stays 0.',
			'	return count',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Enumerate all O(n²) substrings and check each for palindromicity in O(n) — ' +
			'O(n³) total. The waste is glaring: checking <code>"abba"</code> re-compares ' +
			'the inner <code>"bb"</code> that a previous check already verified.</p>' +
			'<h3>Flip it inside out</h3>' +
			'<p>A palindrome is defined by symmetry about its center, and there are only ' +
			'<code>2n − 1</code> possible centers: each of the n characters (odd lengths) ' +
			'and each of the n−1 gaps between characters (even lengths — this is the half ' +
			'people forget, and why <code>"abba"</code> is a test case). Expanding a center ' +
			'outward while the end characters match discovers every palindrome anchored ' +
			'there, largest last, and each successful ring is exactly one palindrome:</p>',
			{ code: 'for c := 0; c < 2*n-1; c++ {\n\tl, r := c/2, c/2+c%2 // even c: same char · odd c: the gap\n\tfor l >= 0 && r < n && s[l] == s[r] {\n\t\tcount++ // one palindrome per matching ring\n\t\tl--\n\t\tr++\n\t}\n}' },
			'<p>Each of the 2n−1 centers expands at most n/2 steps: O(n²) time, O(1) ' +
			'space, and the early break is sound because a mismatched outer pair dooms ' +
			'every wider ring too.</p>' +
			'<h3>The DP-table alternative</h3>' +
			'<p>The same answer falls out of a boolean table: <code>isPal[i][j]</code> is ' +
			'true when <code>s[i] == s[j]</code> and the inside <code>isPal[i+1][j−1]</code> ' +
			'is true (length ≤ 2 needs no inside check). Fill by increasing substring ' +
			'length and count the true cells — O(n²) time but also O(n²) space. For pure ' +
			'counting, expand-around-center strictly wins. The table pays off when a later ' +
			'step needs <em>random access</em> to “is s[i..j] a palindrome?” — palindrome ' +
			'partitioning, for instance, queries that predicate constantly while searching ' +
			'over cut positions, and precomputing the table turns each query into O(1).</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Expand around center</strong> — when a problem quantifies over ' +
			'palindromic substrings (count them, find the longest), reach for the 2n−1 ' +
			'centers instead of enumerating substrings: it turns “check all O(n²) ' +
			'substrings in O(n) each” into “grow each of 2n−1 centers in O(n)”, an O(n³) → ' +
			'O(n²) drop with zero extra memory. The trigger is the word <em>palindrome</em> ' +
			'plus <em>contiguous</em>. Longest Palindromic Substring is the direct sibling ' +
			'— the identical center loop, tracking the widest ring instead of counting ' +
			'rings — and the two-pointer symmetry check at its core is the same test ' +
			'Valid Palindrome runs from the outside in.</p>',
		],
		complexity: { time: 'O(n²)', space: 'O(1)' },
	});
})();
