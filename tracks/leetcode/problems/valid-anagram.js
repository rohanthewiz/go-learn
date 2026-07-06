/* Valid Anagram — Arrays & Hashing (Easy). The counting-array warm-up:
 * two strings are anagrams exactly when their letter multisets match,
 * and a single fixed-size array can check that in one pass.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 170" width="500" height="170" role="img" aria-label="one count array balancing both strings">' +
		// the two words, each feeding the same count array
		'<text x="20" y="18" class="lbl">one array, both strings</text>' +
		'<text x="20" y="55">s = “anagram”</text>' +
		'<text x="24" y="74" class="lbl" style="fill:var(--ok)">+1 per letter</text>' +
		'<text x="20" y="112">t = “nagaram”</text>' +
		'<text x="24" y="131" class="lbl" style="fill:var(--accent)">−1 per letter</text>' +
		// arrows into the histogram
		'<path d="M 150 50 C 215 42 245 54 292 62" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowVAp)"/>' +
		'<path d="M 150 108 C 215 116 245 88 292 78" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowVAm)"/>' +
		// count histogram: every slot cancels to zero
		'<g>' +
		'<text x="300" y="38" class="lbl">count[26] after both</text>' +
		'<rect x="300" y="50" width="32" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="338" y="50" width="32" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="376" y="50" width="32" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="414" y="50" width="32" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="452" y="50" width="32" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="316" y="72" text-anchor="middle">0</text>' +
		'<text x="354" y="72" text-anchor="middle">0</text>' +
		'<text x="392" y="72" text-anchor="middle">0</text>' +
		'<text x="430" y="72" text-anchor="middle">0</text>' +
		'<text x="468" y="72" text-anchor="middle">0</text>' +
		'<text x="316" y="102" text-anchor="middle" class="lbl">a</text>' +
		'<text x="354" y="102" text-anchor="middle" class="lbl">g</text>' +
		'<text x="392" y="102" text-anchor="middle" class="lbl">m</text>' +
		'<text x="430" y="102" text-anchor="middle" class="lbl">n</text>' +
		'<text x="468" y="102" text-anchor="middle" class="lbl">r</text>' +
		'</g>' +
		'<text x="300" y="132" style="fill:var(--ok)">all zeros → anagram ✓</text>' +
		'<defs>' +
		'<marker id="dgArrowVAp" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowVAm" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'valid-anagram',
		title: 'Valid Anagram',
		nav: 'Valid Anagram',
		difficulty: 'Easy',
		category: 'Arrays & Hashing',
		task: 'Implement isAnagram — make all 5 tests pass.',

		prose: [
			'<h2>Valid Anagram</h2>' +
			'<p>Given two strings <code>s</code> and <code>t</code>, return <code>true</code> ' +
			'if <code>t</code> is an <em>anagram</em> of <code>s</code> — the same letters, ' +
			'each appearing the same number of times, in any order.</p>' +
			'<ul><li>Both strings contain only lowercase letters <code>a</code>–<code>z</code>.</li>' +
			'<li>Two empty strings are anagrams of each other.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'isAnagram("anagram", "nagaram")  →  true\nisAnagram("rat", "car")          →  false', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>An anagram is a statement about <em>letter counts</em>, not letter order. ' +
			'One <code>[26]int</code> array can tally both strings at once: <code>+1</code> ' +
			'for every letter of <code>s</code>, <code>−1</code> for every letter of ' +
			'<code>t</code>. Anagrams cancel perfectly:</p>' +
			DIAGRAM +
			'<p>One pass over the letters, one fixed-size array — no sorting.</p>',
		],

		starter: [
			'package main',
			'',
			'// isAnagram reports whether t is an anagram of s: the same letters',
			'// with the same multiplicities, in any order. Both strings contain',
			'// only lowercase letters a–z.',
			'func isAnagram(s string, t string) bool {',
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
			'		s    string',
			'		t    string',
			'		want bool',
			'	}',
			'	cases := []tc{',
			'		{"anagram", "nagaram", true},',
			'		{"rat", "car", false},',
			'		{"", "", true},',
			'		{"a", "ab", false},',
			'		{"aacc", "ccac", false},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("s=%q, t=%q", c.s, c.t),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := isAnagram(c.s, c.t)',
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
			'// isAnagram reports whether t is an anagram of s.',
			'//',
			'// Anagrams must be the same length, so that check comes first — it is',
			'// the cheapest possible reject. Then one [26]int array tallies both',
			'// strings in a single pass: +1 for each letter of s, −1 for each',
			'// letter of t. True anagrams cancel to all zeros; any non-zero slot',
			'// means some letter appears more often in one string than the other.',
			'// A fixed array beats a map here because the alphabet is known',
			'// (lowercase a–z): indexing is a byte subtraction, no hashing, no',
			'// allocation.',
			'func isAnagram(s string, t string) bool {',
			'	if len(s) != len(t) {',
			'		return false',
			'	}',
			'	var count [26]int',
			'	for i := 0; i < len(s); i++ {',
			'		count[s[i]-\'a\']++ // s deposits…',
			'		count[t[i]-\'a\']-- // …t withdraws; anagrams balance the books',
			'	}',
			'	for _, c := range count {',
			'		if c != 0 {',
			'			return false',
			'		}',
			'	}',
			'	return true',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Sort both strings and compare: <code>"anagram"</code> and ' +
			'<code>"nagaram"</code> both sort to <code>"aaagmnr"</code>. Correct, ' +
			'but O(n log n) and it allocates two sorted copies — all to answer a ' +
			'question that is really about <em>counts</em>, not order.</p>' +
			'<h3>Count instead of sort</h3>' +
			'<p>Tally letter frequencies in one <code>[26]int</code> array, using it as a ' +
			'ledger: <code>s</code> deposits, <code>t</code> withdraws. Anagrams leave every ' +
			'slot at exactly zero:</p>',
			{ code: 'if len(s) != len(t) {\n\treturn false // different lengths can never balance\n}\nvar count [26]int\nfor i := 0; i < len(s); i++ {\n\tcount[s[i]-\'a\']++\n\tcount[t[i]-\'a\']--\n}\nfor _, c := range count {\n\tif c != 0 {\n\t\treturn false\n\t}\n}\nreturn true' },
			'<p>The details worth noticing:</p>' +
			'<ul>' +
			'<li><strong>Length check first.</strong> It is O(1) and lets the counting loop ' +
			'walk both strings with a single index.</li>' +
			'<li><strong>One array, two directions.</strong> Incrementing for <code>s</code> ' +
			'and decrementing for <code>t</code> means “all zeros” is the entire test — no ' +
			'second array to compare against.</li>' +
			'<li><strong>Beyond a–z.</strong> For full Unicode input, swap the array for ' +
			'<code>map[rune]int</code> and range over the strings by rune — same ledger idea, ' +
			'at the cost of hashing.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
