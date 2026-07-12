/* Permutation in String — Sliding Window (Medium). Does s2 contain any
 * permutation of s1 as a substring? A fixed-size window of len(s1) slides
 * across s2, its letter counts maintained incrementally — never recounted.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="fixed-size window sliding over s2 with letter counts compared to s1">' +
		'<text x="20" y="18" class="lbl">s1 = "ab" · window size 2 sliding over s2</text>' +
		// s2 cells: e i d b a o o o — window on b,a
		'<g>' +
		'<rect x="20" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="66" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="112" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--dim)" stroke-dasharray="4 3"/>' +
		'<rect x="158" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<rect x="204" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<rect x="250" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="296" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="342" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="40" y="52" text-anchor="middle">e</text>' +
		'<text x="86" y="52" text-anchor="middle">i</text>' +
		'<text x="132" y="52" text-anchor="middle">d</text>' +
		'<text x="178" y="52" text-anchor="middle">b</text>' +
		'<text x="224" y="52" text-anchor="middle">a</text>' +
		'<text x="270" y="52" text-anchor="middle">o</text>' +
		'<text x="316" y="52" text-anchor="middle">o</text>' +
		'<text x="362" y="52" text-anchor="middle">o</text>' +
		'</g>' +
		// slide annotations: d leaves, a enters
		'<path d="M 132 74 v 18" fill="none" stroke="var(--err-edge)" stroke-width="1.5" marker-end="url(#dgArrowPISout)"/>' +
		'<text x="132" y="108" text-anchor="middle" class="lbl">d leaves: count--</text>' +
		'<path d="M 224 92 v -18" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowPIS)"/>' +
		'<text x="240" y="108" text-anchor="middle" class="lbl">a enters: count++</text>' +
		// counts comparison
		'<g>' +
		'<text x="330" y="122" class="lbl" text-anchor="middle">need (from s1)</text>' +
		'<rect x="280" y="130" width="100" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="330" y="150" text-anchor="middle">a:1 b:1</text>' +
		'<text x="120" y="122" class="lbl" text-anchor="middle">window counts</text>' +
		'<rect x="70" y="130" width="100" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="120" y="150" text-anchor="middle">a:1 b:1</text>' +
		'<text x="212" y="150" text-anchor="middle" style="fill:var(--ok)">= ✓ → true</text>' +
		'</g>' +
		'<defs>' +
		'<marker id="dgArrowPIS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowPISout" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'permutation-in-string',
		title: 'Permutation in String',
		nav: 'Permutation in String',
		difficulty: 'Medium',
		category: 'Sliding Window',
		task: 'Implement checkInclusion — make all 6 tests pass.',

		prose: [
			'<h2>Permutation in String</h2>' +
			'<p>Given two strings <code>s1</code> and <code>s2</code> (lowercase ' +
			'<code>a</code>–<code>z</code>), return <code>true</code> if <code>s2</code> ' +
			'contains a <em>permutation</em> of <code>s1</code> as a contiguous ' +
			'substring, and <code>false</code> otherwise.</p>' +
			'<ul><li>A permutation of <code>s1</code> is any rearrangement of exactly its ' +
			'letters — same multiset of characters, any order.</li>' +
			'<li>If <code>s1</code> is longer than <code>s2</code>, the answer is ' +
			'<code>false</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'checkInclusion("ab", "eidbaooo")  →  true    // "ba" is a permutation of "ab"\ncheckInclusion("ab", "eidboaoo")  →  false   // no window holds exactly {a, b}', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Any qualifying substring has length exactly <code>len(s1)</code> — so only ' +
			'windows of that one size matter, and “is a permutation” just means “has the ' +
			'same letter counts”. Slide the window one step at a time, updating its counts ' +
			'incrementally instead of recounting:</p>' +
			DIAGRAM +
			'<p>One character enters, one leaves — O(1) bookkeeping per step over two ' +
			'<code>[26]int</code> tables.</p>',
		],

		starter: [
			'package main',
			'',
			'// checkInclusion reports whether s2 contains a permutation of s1 as',
			'// a contiguous substring. Both strings are lowercase a-z; if s1 is',
			'// longer than s2 the answer is false.',
			'func checkInclusion(s1, s2 string) bool {',
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
			'		s1, s2 string',
			'		want   bool',
			'	}',
			'	cases := []tc{',
			'		{"ab", "eidbaooo", true},   // classic: "ba" hides in the middle',
			'		{"ab", "eidboaoo", false},  // a and b present but never adjacent',
			'		{"abc", "ab", false},       // s1 longer than s2',
			'		{"hello", "hello", true},   // exact equality is a permutation too',
			'		{"ab", "ooooba", true},     // match sits at the very end of s2',
			'		{"aab", "eidbaaoo", true},  // repeated letters: window "baa" must count a twice',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("s1=%q, s2=%q", c.s1, c.s2),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := checkInclusion(c.s1, c.s2)',
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
			'// checkInclusion reports whether s2 contains a permutation of s1',
			'// as a contiguous substring.',
			'//',
			'// Fixed-size sliding window. Two [26]int tables: need holds s1’s',
			'// letter counts, win holds the counts of the current len(s1)-wide',
			'// window of s2. A window is a permutation of s1 exactly when the',
			'// tables are equal. Arrays (not maps) on purpose: the a-z alphabet',
			'// is fixed, arrays are comparable with == in Go (element-wise), and',
			'// zero counts compare correctly for free — a map would need manual',
			'// deletion of zero entries to compare cleanly.',
			'func checkInclusion(s1, s2 string) bool {',
			'	n := len(s1)',
			'	if n > len(s2) {',
			'		return false // a longer string can’t fit in a shorter one',
			'	}',
			'',
			'	var need, win [26]int',
			'	for i := 0; i < n; i++ {',
			'		need[s1[i]-\'a\']++ // target multiset',
			'		win[s2[i]-\'a\']++  // seed the first window s2[0:n]',
			'	}',
			'	if win == need {',
			'		return true',
			'	}',
			'',
			'	// Slide by one: the character at i enters on the right, the one',
			'	// at i-n falls off the left. Two count updates replace a full',
			'	// recount of the window — that’s the entire trick.',
			'	for i := n; i < len(s2); i++ {',
			'		win[s2[i]-\'a\']++',
			'		win[s2[i-n]-\'a\']--',
			'		if win == need {',
			'			return true',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Generating the permutations of <code>s1</code> and searching each is ' +
			'factorial — dead on arrival. The saner brute force flips the question: a ' +
			'permutation of <code>s1</code> is any string with the <em>same letter ' +
			'counts</em>, so count the letters of every length-<code>len(s1)</code> ' +
			'substring of <code>s2</code> and compare. That recounts n characters per ' +
			'window — O(len(s2) · len(s1)) — and almost all of that work is repeated: ' +
			'adjacent windows share all but two characters.</p>' +
			'<h3>Maintain the counts, don’t recompute them</h3>' +
			'<p>Because every candidate window has the <em>same fixed size</em>, sliding ' +
			'one step changes exactly two counts — the entering and the leaving ' +
			'character:</p>',
			{ code: 'var need, win [26]int\nfor i := 0; i < n; i++ {\n\tneed[s1[i]-\'a\']++\n\twin[s2[i]-\'a\']++ // seed the first window\n}\nif win == need { // arrays compare element-wise in Go\n\treturn true\n}\nfor i := n; i < len(s2); i++ {\n\twin[s2[i]-\'a\']++   // right edge enters\n\twin[s2[i-n]-\'a\']-- // left edge leaves\n\tif win == need {\n\t\treturn true\n\t}\n}' },
			'<p>Details worth noticing:</p>' +
			'<ul>' +
			'<li><strong>Counts, not sets.</strong> <code>"aab"</code> needs <em>two</em> ' +
			'a’s — a window containing one a and one b isn’t enough. The count tables ' +
			'handle multiplicity automatically; the <code>("aab", "eidbaaoo")</code> case ' +
			'exists to punish set-based shortcuts.</li>' +
			'<li><strong><code>win == need</code> costs O(26).</strong> Cheap and obvious. ' +
			'The classic refinement keeps a <code>matches</code> counter of how many of ' +
			'the 26 letters currently agree, updating it only for the two letters that ' +
			'changed — O(1) per slide. Worth knowing; rarely worth the extra code at ' +
			'alphabet size 26.</li>' +
			'<li><strong>Guard <code>len(s1) &gt; len(s2)</code> first</strong> — otherwise ' +
			'the window seed indexes past the end of <code>s2</code>.</li>' +
			'</ul>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Fixed-size sliding window with frequency counts</strong> — reach ' +
			'for it when the statement fixes the window length for you (“substring that is ' +
			'a permutation/anagram of s1”, “any subarray of length k”): maintain the ' +
			'window’s summary incrementally — add the entering element, drop the leaving ' +
			'one — for O(1) work per step instead of recounting. <em>Find All Anagrams in ' +
			'a String</em> is this exact problem returning every match index instead of a ' +
			'bool. Contrast the <em>variable-size</em> windows of <em>Longest Substring ' +
			'Without Repeating Characters</em> and <em>Minimum Window Substring</em>, ' +
			'where the right edge stretches and the left edge contracts on a validity ' +
			'condition rather than a fixed width.</p>',
		],
		complexity: { time: 'O(len(s2) · 26) ≈ O(n)', space: 'O(1) — two [26]int tables' },
	});
})();
