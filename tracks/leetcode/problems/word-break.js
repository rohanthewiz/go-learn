/* Word Break — Dynamic Programming (Medium). DP over string PREFIXES rather
 * than indices-with-values: ok[i] answers "can s[:i] be segmented?", and each
 * prefix asks whether some dictionary word can be its final piece. The classic
 * demonstration of why memoization matters — naive recursion re-solves the
 * same suffix exponentially many times ("aaaa...b" is the killer input).
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 195" width="500" height="195" role="img" aria-label="prefix DP over the string leetcode with dictionary words as jumps">' +
		'<text x="20" y="16" class="lbl">s = "leetcode" · dict = {leet, code} · ok[i]: can s[:i] be segmented?</text>' +
		// letter cells: x = 30 + i*44 (w=40, h=34), y = 56
		'<g fill="var(--panel)">' +
		'<rect x="30" y="56" width="40" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="74" y="56" width="40" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="118" y="56" width="40" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="162" y="56" width="40" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="206" y="56" width="40" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="250" y="56" width="40" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="294" y="56" width="40" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="338" y="56" width="40" height="34" rx="4" stroke="var(--edge)"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="50" y="78">l</text><text x="94" y="78">e</text><text x="138" y="78">e</text><text x="182" y="78">t</text>' +
		'<text x="226" y="78">c</text><text x="270" y="78">o</text><text x="314" y="78">d</text><text x="358" y="78">e</text>' +
		'</g>' +
		// dictionary-word jumps between segmentation boundaries 0 → 4 → 8
		'<g fill="none" stroke="var(--ok)" stroke-width="1.5">' +
		'<path d="M 28 52 C 70 20 160 20 200 48" marker-end="url(#dgArrowWB)"/>' +
		'<path d="M 204 52 C 246 20 336 20 376 48" marker-end="url(#dgArrowWB)"/>' +
		'</g>' +
		'<text x="114" y="30" text-anchor="middle" style="fill:var(--ok)">"leet" ∈ dict</text>' +
		'<text x="290" y="30" text-anchor="middle" style="fill:var(--ok)">"code" ∈ dict</text>' +
		// ok[] values under each boundary (x = 28 + i*44)
		'<g text-anchor="middle" class="lbl">' +
		'<text x="28" y="112">i=0</text><text x="204" y="112">i=4</text><text x="380" y="112">i=8</text>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="28" y="132" style="fill:var(--ok)">T</text>' +
		'<text x="72" y="132" class="lbl">F</text><text x="116" y="132" class="lbl">F</text>' +
		'<text x="160" y="132" class="lbl">F</text>' +
		'<text x="204" y="132" style="fill:var(--ok)">T</text>' +
		'<text x="248" y="132" class="lbl">F</text><text x="292" y="132" class="lbl">F</text>' +
		'<text x="336" y="132" class="lbl">F</text>' +
		'<text x="380" y="132" style="fill:var(--accent)">T</text>' +
		'</g>' +
		'<text x="20" y="160">ok[8] = ok[4] && dict["code"]  —  ok[0] = true seeds the chain</text>' +
		'<text x="20" y="182" class="lbl">a boundary is reachable iff some dict word lands on it from an earlier reachable one</text>' +
		'<defs><marker id="dgArrowWB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'word-break',
		title: 'Word Break',
		nav: 'Word Break',
		difficulty: 'Medium',
		category: 'Dynamic Programming',
		task: 'Implement wordBreak — make all 5 tests pass.',

		prose: [
			'<h2>Word Break</h2>' +
			'<p>Given a string <code>s</code> and a dictionary <code>wordDict</code>, return ' +
			'<code>true</code> if <code>s</code> can be split into a sequence of one or more ' +
			'dictionary words.</p>' +
			'<ul><li>Dictionary words may be reused any number of times.</li>' +
			'<li>The <em>whole</em> string must be consumed — no leftover characters.</li>' +
			'<li>Words must not overlap; the split is a clean segmentation.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'wordBreak("leetcode", []string{"leet", "code"})\n\t→  true   // "leet" + "code"\nwordBreak("applepenapple", []string{"apple", "pen"})\n\t→  true   // "apple" + "pen" + "apple" (reuse is fine)\nwordBreak("catsandog", []string{"cats", "dog", "sand", "and", "cat"})\n\t→  false  // every split strands something', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Think of the positions <em>between</em> characters as stepping stones. ' +
			'Stone 0 (the empty prefix) is reachable; stone i is reachable if some ' +
			'dictionary word ends exactly there, starting from an already-reachable stone. ' +
			'Answer: is the last stone reachable?</p>' +
			DIAGRAM +
			'<p>There are only <code>len(s)+1</code> stones, and each is decided once — ' +
			'that single observation collapses an exponential search into a small table.</p>',
		],

		starter: [
			'package main',
			'',
			'// wordBreak reports whether s can be segmented into a sequence of',
			'// one or more words from wordDict. Words may be reused any number',
			'// of times, and the whole of s must be consumed.',
			'func wordBreak(s string, wordDict []string) bool {',
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
			'		dict []string',
			'		want bool',
			'	}',
			'	cases := []tc{',
			'		{"leetcode", []string{"leet", "code"}, true},',
			'		{"applepenapple", []string{"apple", "pen"}, true},                 // word reuse',
			'		{"catsandog", []string{"cats", "dog", "sand", "and", "cat"}, false}, // the classic trap',
			'		{"a", []string{"b"}, false},',
			'		{"cars", []string{"car", "ca", "rs"}, true},                       // "ca"+"rs" wins, "car" strands "s"',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("s=%q, dict=%v", c.s, c.dict),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := wordBreak(c.s, append([]string(nil), c.dict...))',
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
			'// wordBreak reports whether s can be segmented into dictionary',
			'// words (reuse allowed, whole string consumed).',
			'//',
			'// DP over PREFIXES: ok[i] means s[:i] is segmentable. A prefix is',
			'// segmentable iff its LAST word is some dict entry s[j:i] sitting',
			'// on top of a segmentable shorter prefix s[:j]:',
			'//',
			'//	ok[i] = OR over j of ( ok[j] && dict[s[j:i]] )',
			'//',
			'// ok[0] = true (empty prefix, zero words) seeds the chain. Filling',
			'// i in increasing order means every ok[j] (j < i) is final when',
			'// read — the bottom-up mirror of memoized recursion on suffixes.',
			'func wordBreak(s string, wordDict []string) bool {',
			'	// Set for O(1) membership; scanning wordDict per probe would',
			'	// multiply the runtime by the dictionary size.',
			'	dict := make(map[string]bool, len(wordDict))',
			'	maxLen := 0 // longest dict word bounds how far back j must look',
			'	for _, w := range wordDict {',
			'		dict[w] = true',
			'		if len(w) > maxLen {',
			'			maxLen = len(w)',
			'		}',
			'	}',
			'',
			'	ok := make([]bool, len(s)+1)',
			'	ok[0] = true // the empty prefix needs zero words',
			'	for i := 1; i <= len(s); i++ {',
			'		// Try every candidate last word s[j:i]. Walking j backward',
			'		// and stopping at maxLen skips splits no dict word could',
			'		// ever match — a big win when words are short and s is long.',
			'		for j := i - 1; j >= 0 && i-j <= maxLen; j-- {',
			'			if ok[j] && dict[s[j:i]] {',
			'				ok[i] = true',
			'				break // one witness suffices; ok[i] is a bool, not a count',
			'			}',
			'		}',
			'	}',
			'	return ok[len(s)]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force: recursion on the remainder</h3>' +
			'<p>Peel a dictionary word off the front and recurse on what remains:</p>',
			{ code: 'func canBreak(s string) bool {\n\tif s == "" {\n\t\treturn true\n\t}\n\tfor _, w := range wordDict {\n\t\tif strings.HasPrefix(s, w) && canBreak(s[len(w):]) {\n\t\t\treturn true\n\t\t}\n\t}\n\treturn false\n}' },
			'<p>Correct — and exponential. On <code>"aaaa...ab"</code> with dict ' +
			'<code>{"a", "aa", "aaa"}</code>, every way of chopping the a’s eventually hits ' +
			'the unmatchable <code>b</code> and fails, but the recursion explores each ' +
			'chopping <em>separately</em>: the suffix <code>"aab"</code> is re-solved from ' +
			'scratch every time a different split reaches it.</p>' +
			'<h3>The insight: only n+1 distinct subproblems</h3>' +
			'<p>Every recursive call is on a <em>suffix</em> of s — and a string has only ' +
			'<code>len(s)+1</code> of those. Cache the verdict per suffix (memoize) and each ' +
			'is computed once: exponential → polynomial. Bottom-up, the same idea reads more ' +
			'cleanly over prefixes: <code>ok[i]</code> = “is <code>s[:i]</code> ' +
			'segmentable?”, decided by trying every dictionary word as the prefix’s ' +
			'<em>last</em> piece:</p>',
			{ code: 'dict := make(map[string]bool, len(wordDict))\nmaxLen := 0\nfor _, w := range wordDict {\n\tdict[w] = true\n\tif len(w) > maxLen {\n\t\tmaxLen = len(w)\n\t}\n}\nok := make([]bool, len(s)+1)\nok[0] = true\nfor i := 1; i <= len(s); i++ {\n\tfor j := i - 1; j >= 0 && i-j <= maxLen; j-- {\n\t\tif ok[j] && dict[s[j:i]] {\n\t\t\tok[i] = true\n\t\t\tbreak\n\t\t}\n\t}\n}\nreturn ok[len(s)]' },
			'<p>Key details:</p>' +
			'<ul>' +
			'<li><strong><code>ok[0] = true</code> is the whole foundation.</strong> The ' +
			'empty prefix is segmentable with zero words, so a word starting at position 0 ' +
			'has something to stand on. Without it nothing is ever reachable.</li>' +
			'<li><strong>Reuse costs nothing.</strong> The recurrence never records ' +
			'<em>which</em> words were used, only that a segmentation exists — so ' +
			'<code>"applepenapple"</code> using <code>"apple"</code> twice needs no special ' +
			'handling.</li>' +
			'<li><strong>The <code>maxLen</code> cutoff.</strong> A candidate last word ' +
			'<code>s[j:i]</code> longer than every dictionary word can’t possibly match; ' +
			'bounding the inner loop turns O(n²) substring probes into O(n·maxLen).</li>' +
			'<li><strong>Why <code>"catsandog"</code> fails.</strong> Both openings look ' +
			'fine (<code>cat</code>+<code>sand</code>…, <code>cats</code>+<code>and</code>…) ' +
			'but each leaves <code>"og"</code>, and no combination covers it: positions 8 ' +
			'and 9 stay unreachable, so <code>ok[9]</code> is false. The DP proves the ' +
			'negative by exhausting every split — exactly what a greedy matcher can’t do.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n · maxLen) substring probes', space: 'O(n) + dictionary set' },
	});
})();
