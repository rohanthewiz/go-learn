/* Longest Substring Without Repeating Characters — Sliding Window (Medium).
 * The classic variable-width window: grow the right edge, and on a duplicate
 * JUMP the left edge past the previous occurrence (never walk it backward —
 * "dvdf" is the test that catches that bug).
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 150" width="500" height="150" role="img" aria-label="sliding window over abcabcbb hitting a duplicate a">' +
		'<text x="340" y="14" class="lbl">s = "abcabcbb"</text>' +
		// window bracket over cells 0..2 ("abc")
		'<path d="M 20 26 v -6 h 132 v 6" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="86" y="12" text-anchor="middle" style="fill:var(--accent)">window · len 3</text>' +
		// letter cells: first 'a' in ok (the remembered occurrence),
		// second 'a' in accent (the duplicate just scanned)
		'<g>' +
		'<rect x="20" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="66" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="112" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="158" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="204" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="250" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="296" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="342" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="40" y="52" text-anchor="middle">a</text>' +
		'<text x="86" y="52" text-anchor="middle">b</text>' +
		'<text x="132" y="52" text-anchor="middle">c</text>' +
		'<text x="178" y="52" text-anchor="middle">a</text>' +
		'<text x="224" y="52" text-anchor="middle">b</text>' +
		'<text x="270" y="52" text-anchor="middle">c</text>' +
		'<text x="316" y="52" text-anchor="middle">b</text>' +
		'<text x="362" y="52" text-anchor="middle">b</text>' +
		'<text x="40" y="80" text-anchor="middle" class="lbl">0</text>' +
		'<text x="86" y="80" text-anchor="middle" class="lbl">1</text>' +
		'<text x="132" y="80" text-anchor="middle" class="lbl">2</text>' +
		'<text x="178" y="80" text-anchor="middle" class="lbl">3</text>' +
		'<text x="224" y="80" text-anchor="middle" class="lbl">4</text>' +
		'<text x="270" y="80" text-anchor="middle" class="lbl">5</text>' +
		'<text x="316" y="80" text-anchor="middle" class="lbl">6</text>' +
		'<text x="362" y="80" text-anchor="middle" class="lbl">7</text>' +
		'</g>' +
		'<text x="178" y="104" text-anchor="middle" style="fill:var(--accent)">right = 3: ‘a’ again</text>' +
		// left pointer jumps past the first 'a' (index 0 → 1)
		'<path d="M 40 92 C 50 108 76 108 84 96" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowLSW)"/>' +
		'<text x="140" y="136" text-anchor="middle" class="lbl">left jumps to lastSeen[a] + 1 = 1 — never backward</text>' +
		'<defs><marker id="dgArrowLSW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'longest-substring-without-repeating',
		title: 'Longest Substring Without Repeating Characters',
		nav: 'Longest Substring',
		difficulty: 'Medium',
		category: 'Sliding Window',
		task: 'Implement lengthOfLongestSubstring — make all 6 tests pass.',

		prose: [
			'<h2>Longest Substring Without Repeating Characters</h2>' +
			'<p>Given a string <code>s</code>, return the length of the longest ' +
			'<em>substring</em> (contiguous — not a subsequence) that contains no ' +
			'repeating characters.</p>' +
			'<ul><li><code>s</code> consists of ASCII characters.</li>' +
			'<li>The empty string has answer <code>0</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'lengthOfLongestSubstring("abcabcbb")  →  3   // "abc"\nlengthOfLongestSubstring("pwwkew")    →  3   // "wke" — "pwke" is a subsequence, not a substring', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Keep a window <code>[left, right]</code> that never contains a repeat. ' +
			'Slide <code>right</code> forward one character at a time; when the new ' +
			'character was already seen <em>inside</em> the window, jump <code>left</code> ' +
			'just past that earlier occurrence:</p>' +
			DIAGRAM +
			'<p>Both edges only move forward, so the whole scan is O(n).</p>',
		],

		starter: [
			'package main',
			'',
			'// lengthOfLongestSubstring returns the length of the longest',
			'// substring of s (ASCII) with no repeating characters.',
			'func lengthOfLongestSubstring(s string) int {',
			'	// your code here',
			'	return 0',
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
			'		{"abcabcbb", 3},',
			'		{"bbbbb", 1},',
			'		{"pwwkew", 3},',
			'		{"", 0},',
			'		{"au", 2},',
			'		{"dvdf", 3},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("s=%q", c.s),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := lengthOfLongestSubstring(c.s)',
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
			'// lengthOfLongestSubstring returns the length of the longest',
			'// substring of s with no repeating characters.',
			'//',
			'// Sliding window over bytes with a last-seen-index table. A fixed',
			'// [128]int beats a map here: the problem guarantees ASCII, the table',
			'// lives on the stack, and lookups are a bounds-checked array index',
			'// instead of a hash. -1 means "never seen".',
			'func lengthOfLongestSubstring(s string) int {',
			'	var lastSeen [128]int',
			'	for i := range lastSeen {',
			'		lastSeen[i] = -1',
			'	}',
			'	best, left := 0, 0',
			'	for right := 0; right < len(s); right++ {',
			'		c := s[right]',
			'		// If c was seen INSIDE the current window, jump left past that',
			'		// occurrence. The guard (only move if it advances left) is the',
			'		// whole trick: a stale sighting BEFORE the window ("dvdf" — the',
			'		// second d recalls index 0 while left is already 1 when v was',
			'		// passed... then f arrives with d at 0 < left) must not drag',
			'		// left backward and resurrect a duplicate already excluded.',
			'		if lastSeen[c]+1 > left {',
			'			left = lastSeen[c] + 1',
			'		}',
			'		lastSeen[c] = right',
			'		if right-left+1 > best {',
			'			best = right - left + 1',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Check every substring for uniqueness — O(n³), or O(n²) with a set per ' +
			'starting index. The wasted work: after finding <code>"abc"</code> unique, ' +
			'restarting from <code>b</code> re-verifies characters we just examined.</p>' +
			'<h3>Slide a window instead</h3>' +
			'<p>Maintain the invariant “<code>s[left..right]</code> has no repeats”. Each ' +
			'new <code>right</code> can break the invariant in exactly one way — the new ' +
			'character already appears in the window — and a last-seen-index table tells ' +
			'us where, so <code>left</code> can jump straight past it:</p>',
			{ code: 'for right := 0; right < len(s); right++ {\n\tc := s[right]\n\tif lastSeen[c]+1 > left {\n\t\tleft = lastSeen[c] + 1 // jump PAST the previous occurrence\n\t}\n\tlastSeen[c] = right\n\tif right-left+1 > best {\n\t\tbest = right - left + 1\n\t}\n}' },
			'<p>The details that matter:</p>' +
			'<ul>' +
			'<li><strong>Jump, never decrement.</strong> The guard ' +
			'<code>lastSeen[c]+1 &gt; left</code> ignores sightings that fell out of the ' +
			'window. <code>"dvdf"</code> is the canary: at the final <code>f</code> the ' +
			'stale <code>d@0</code> must not pull <code>left</code> back from 1 to 1... ' +
			'without the guard, the second <code>d</code>’s own record would later shrink ' +
			'a valid <code>"vdf"</code> window and you’d report 2 instead of 3.</li>' +
			'<li><strong>Amortized O(n).</strong> <code>right</code> advances n times and ' +
			'<code>left</code> only ever moves forward, so the pair of pointers does at ' +
			'most 2n steps total.</li>' +
			'<li><strong>Beyond ASCII.</strong> For full Unicode, range over runes and ' +
			'swap the array for <code>map[rune]int</code> — same algorithm, indices in ' +
			'runes instead of bytes.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
