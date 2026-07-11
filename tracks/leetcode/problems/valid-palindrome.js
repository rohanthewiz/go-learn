/* Valid Palindrome — Two Pointers (Easy). The gateway two-pointer problem:
 * two indices converge from the ends of a string, but each must SKIP
 * characters that don't count (non-alphanumerics) before comparing.
 * Introduces unicode.IsLetter / unicode.IsDigit / unicode.ToLower.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="two pointers converging over a string, skipping punctuation">' +
		'<text x="25" y="16" class="lbl">s = &quot;Race, car!&quot; · compare letters and digits only, case-insensitive</text>' +
		// character cells: R a c e , ␣ c a r !
		'<g>' +
		// matched pairs (green): R/r and a/a
		'<rect x="25" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="71" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		// current pair (accent): c and c
		'<rect x="117" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="163" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		// skipped punctuation (dashed)
		'<rect x="209" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'<rect x="255" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'<rect x="301" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="347" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="393" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="439" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'<text x="45" y="52" text-anchor="middle">R</text>' +
		'<text x="91" y="52" text-anchor="middle">a</text>' +
		'<text x="137" y="52" text-anchor="middle">c</text>' +
		'<text x="183" y="52" text-anchor="middle">e</text>' +
		'<text x="229" y="52" text-anchor="middle">,</text>' +
		'<text x="275" y="52" text-anchor="middle" class="lbl">␣</text>' +
		'<text x="321" y="52" text-anchor="middle">c</text>' +
		'<text x="367" y="52" text-anchor="middle">a</text>' +
		'<text x="413" y="52" text-anchor="middle">r</text>' +
		'<text x="459" y="52" text-anchor="middle">!</text>' +
		'<text x="45" y="80" text-anchor="middle" class="lbl">0</text>' +
		'<text x="137" y="80" text-anchor="middle" class="lbl">2</text>' +
		'<text x="229" y="80" text-anchor="middle" class="lbl">4</text>' +
		'<text x="321" y="80" text-anchor="middle" class="lbl">6</text>' +
		'<text x="413" y="80" text-anchor="middle" class="lbl">8</text>' +
		'<text x="459" y="80" text-anchor="middle" class="lbl">9</text>' +
		'</g>' +
		// pointer arrows
		'<g stroke="var(--accent)" stroke-width="1.5" fill="none">' +
		'<line x1="137" y1="118" x2="137" y2="70" marker-end="url(#dgArrowVP)"/>' +
		'<line x1="321" y1="118" x2="321" y2="70" marker-end="url(#dgArrowVP)"/>' +
		'</g>' +
		'<text x="137" y="134" text-anchor="middle" style="fill:var(--accent)">l</text>' +
		'<text x="321" y="134" text-anchor="middle" style="fill:var(--accent)">r</text>' +
		'<text x="229" y="134" text-anchor="middle" class="lbl">toLower(c) == toLower(c) ✓</text>' +
		// skip annotations
		'<text x="252" y="16" text-anchor="middle" class="lbl"></text>' +
		'<text x="229" y="160" text-anchor="middle" class="lbl">dashed cells (, ␣ !) are skipped — they never take part in a comparison</text>' +
		'<text x="45" y="160" text-anchor="middle" style="fill:var(--ok)">R = r ✓</text>' +
		'<defs><marker id="dgArrowVP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'valid-palindrome',
		title: 'Valid Palindrome',
		nav: 'Valid Palindrome',
		difficulty: 'Easy',
		category: 'Two Pointers',
		task: 'Implement isPalindrome — make all 6 tests pass.',

		prose: [
			'<h2>Valid Palindrome</h2>' +
			'<p>Given a string <code>s</code>, return <code>true</code> if it is a ' +
			'<em>palindrome</em> considering only alphanumeric characters (letters and ' +
			'digits) and ignoring case.</p>' +
			'<ul><li>Punctuation, spaces, and other symbols are ignored entirely.</li>' +
			'<li>Comparisons are case-insensitive: <code>A</code> matches <code>a</code>.</li>' +
			'<li>A string with no alphanumeric characters at all (including the empty string) ' +
			'counts as a palindrome — there is nothing to mismatch.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'isPalindrome("A man, a plan, a canal: Panama")  →  true   // "amanaplanacanalpanama"\nisPalindrome("race a car")                       →  false  // "raceacar" reversed is "racaecar"\nisPalindrome(".,!")                              →  true   // nothing left to compare', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>You could clean the string first, then check it — but that copies the whole ' +
			'thing. Instead, walk two pointers inward from the ends. Whenever a pointer ' +
			'sits on a character that doesn’t count, step past it; only when <em>both</em> ' +
			'pointers rest on alphanumerics do you compare (lower-cased):</p>' +
			DIAGRAM +
			'<p>Every index is visited at most once by one of the pointers — one pass, no copy.</p>',
		],

		starter: [
			'package main',
			'',
			'// isPalindrome reports whether s is a palindrome considering only',
			'// alphanumeric characters (letters and digits) and ignoring case.',
			'// A string with no alphanumeric characters is a palindrome.',
			'func isPalindrome(s string) bool {',
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
			'		want bool',
			'	}',
			'	cases := []tc{',
			'		{"A man, a plan, a canal: Panama", true},',
			'		{"race a car", false},',
			'		{"", true},',
			'		{".,!?", true},',
			'		{"0P", false},',
			'		{"Was it a car or a cat I saw?", true},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("s=%q", c.s),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := isPalindrome(c.s)',
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
			'import "unicode"',
			'',
			'// isAlnum reports whether r counts for the palindrome check.',
			'// unicode.IsLetter/IsDigit cover the full Unicode ranges, so the',
			'// same code handles plain ASCII and accented letters alike.',
			'func isAlnum(r rune) bool {',
			'	return unicode.IsLetter(r) || unicode.IsDigit(r)',
			'}',
			'',
			'// isPalindrome reports whether s is a palindrome considering only',
			'// alphanumeric characters, ignoring case.',
			'//',
			'// Converting once to []rune makes rs[i] a whole character even when',
			'// the input holds multi-byte UTF-8; indexing the raw string bytes',
			'// would split such characters. Two pointers then converge from the',
			'// ends. The key structural choice: each "skip" advances exactly one',
			'// pointer and re-enters the loop, so the l < r bound is re-checked',
			'// between every step — a punctuation-only string drains to l >= r',
			'// without ever comparing, and correctly returns true.',
			'func isPalindrome(s string) bool {',
			'	rs := []rune(s)',
			'	l, r := 0, len(rs)-1',
			'	for l < r {',
			'		if !isAlnum(rs[l]) {',
			'			l++ // left pointer sits on noise: step past it',
			'			continue',
			'		}',
			'		if !isAlnum(rs[r]) {',
			'			r-- // right pointer sits on noise: step past it',
			'			continue',
			'		}',
			'		// Both pointers rest on characters that count — compare',
			'		// case-insensitively, then move BOTH inward.',
			'		if unicode.ToLower(rs[l]) != unicode.ToLower(rs[r]) {',
			'			return false',
			'		}',
			'		l++',
			'		r--',
			'	}',
			'	return true',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Clean-then-check first</h3>' +
			'<p>The obvious plan: build a filtered, lower-cased copy ' +
			'(<code>"amanaplanacanalpanama"</code>), then compare it with its reverse. ' +
			'Correct, but it allocates one or two full copies of the string just to answer ' +
			'a yes/no question — and the copy teaches you nothing you can reuse on harder ' +
			'two-pointer problems.</p>' +
			'<h3>Skip in place</h3>' +
			'<p>Run the classic converging pointers directly on the raw string, and fold ' +
			'the “cleaning” into the walk: a pointer that lands on a non-alphanumeric ' +
			'simply steps again. Only when both pointers rest on characters that count ' +
			'does a comparison happen:</p>',
			{ code: 'rs := []rune(s)\nl, r := 0, len(rs)-1\nfor l < r {\n\tif !isAlnum(rs[l]) {\n\t\tl++\n\t\tcontinue // re-check l < r before doing anything else\n\t}\n\tif !isAlnum(rs[r]) {\n\t\tr--\n\t\tcontinue\n\t}\n\tif unicode.ToLower(rs[l]) != unicode.ToLower(rs[r]) {\n\t\treturn false\n\t}\n\tl++\n\tr--\n}\nreturn true' },
			'<p>The details that bite people:</p>' +
			'<ul>' +
			'<li><strong>Skip one step at a time, re-checking <code>l &lt; r</code>.</strong> ' +
			'An inner <code>for</code> that skips without a bound check can run the pointers ' +
			'past each other on inputs like <code>".,!?"</code>. The ' +
			'<code>continue</code> pattern makes the loop condition the single gatekeeper.</li>' +
			'<li><strong><code>[]rune</code>, not byte indexing.</strong> ' +
			'<code>s[i]</code> is a byte; a multi-byte character would be compared piecemeal. ' +
			'<code>unicode.IsLetter</code>/<code>IsDigit</code>/<code>ToLower</code> all ' +
			'operate on runes.</li>' +
			'<li><strong>Digits count but don’t case-fold.</strong> <code>"0P"</code> is ' +
			'false: <code>ToLower(\'0\') == \'0\'</code> and <code>ToLower(\'P\') == \'p\'</code> ' +
			'— no amount of lower-casing makes a digit match a letter.</li>' +
			'<li><strong>Empty is vacuously true.</strong> With nothing to compare, the loop ' +
			'never runs and the function falls through to <code>true</code>.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(n) for the rune slice (O(1) extra beyond it)' },
	});
})();
