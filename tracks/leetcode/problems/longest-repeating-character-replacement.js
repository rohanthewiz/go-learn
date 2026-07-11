/* Longest Repeating Character Replacement — Sliding Window (Medium).
 * The window problem with the famous subtlety: validity is
 * windowLen − maxCount ≤ k, and maxCount is allowed to go STALE when the
 * window slides — yet the answer stays correct, because the window never
 * shrinks below the best length already achieved. Uses a counts[26] array
 * (input is uppercase A–Z), not a map.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// s = "AABABBA", k = 1, window on [0..3] = "AABA":
	// counts A:3 B:1, maxCount 3, 4 − 3 = 1 ≤ k → valid, best = 4.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="sliding window over AABABBA with counts and the validity test">' +
		'<text x="26" y="16" class="lbl">s = &quot;AABABBA&quot; · k = 1</text>' +
		// window band behind the first four cells
		'<rect x="24" y="24" width="194" height="46" rx="6" fill="var(--accent)" opacity="0.14"/>' +
		'<rect x="24" y="24" width="194" height="46" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		// the seven character cells
		'<g>' +
		'<rect x="30" y="30" width="40" height="34" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<rect x="76" y="30" width="40" height="34" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<rect x="122" y="30" width="40" height="34" rx="4" fill="var(--panel)" stroke="var(--accent)" stroke-width="1.8" stroke-dasharray="4 3"/>' +
		'<rect x="168" y="30" width="40" height="34" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<rect x="214" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="260" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="306" y="30" width="40" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="50" y="52" text-anchor="middle">A</text>' +
		'<text x="96" y="52" text-anchor="middle">A</text>' +
		'<text x="142" y="52" text-anchor="middle">B</text>' +
		'<text x="188" y="52" text-anchor="middle">A</text>' +
		'<text x="234" y="52" text-anchor="middle" class="lbl">B</text>' +
		'<text x="280" y="52" text-anchor="middle" class="lbl">B</text>' +
		'<text x="326" y="52" text-anchor="middle" class="lbl">A</text>' +
		'</g>' +
		// pointer labels
		'<text x="50" y="88" text-anchor="middle" style="fill:var(--accent)">left</text>' +
		'<text x="188" y="88" text-anchor="middle" style="fill:var(--accent)">right</text>' +
		'<text x="142" y="88" text-anchor="middle" class="lbl">1 change</text>' +
		// counts panel
		'<g>' +
		'<text x="370" y="16" class="lbl">counts (window)</text>' +
		'<rect x="370" y="26" width="110" height="26" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="380" y="44">A → 3</text>' +
		'<text x="436" y="44" style="fill:var(--ok)">maxCount</text>' +
		'<rect x="370" y="58" width="110" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="380" y="76">B → 1</text>' +
		'</g>' +
		// the validity formula
		'<text x="26" y="126">valid: windowLen − maxCount ≤ k</text>' +
		'<text x="26" y="150" style="fill:var(--ok)">4 − 3 = 1 ≤ 1 ✓   →  best = 4  (&quot;AABA&quot; → &quot;AAAA&quot;)</text>' +
		'<text x="26" y="174" class="lbl">turn every non-majority letter into the majority one — that costs windowLen − maxCount changes</text>' +
		'</svg>';

	LC.problem({
		id: 'longest-repeating-character-replacement',
		title: 'Longest Repeating Character Replacement',
		nav: 'Repeating Char Replace',
		difficulty: 'Medium',
		category: 'Sliding Window',
		task: 'Implement characterReplacement — make all 5 tests pass.',

		prose: [
			'<h2>Longest Repeating Character Replacement</h2>' +
			'<p>You are given a string <code>s</code> of uppercase English letters and an ' +
			'integer <code>k</code>. You may change at most <code>k</code> characters to ' +
			'any other uppercase letter. Return the length of the longest substring ' +
			'containing a single repeated letter you can obtain.</p>' +
			'<ul><li><code>s</code> contains only <code>A</code>–<code>Z</code>, so a ' +
			'<code>[26]int</code> array beats a map for the window counts.</li>' +
			'<li><code>k</code> may be <code>0</code>: then the answer is just the longest ' +
			'existing run of one letter.</li>' +
			'<li>A window is fixable iff its non-majority characters number at most ' +
			'<code>k</code>: <code>windowLen − maxCount ≤ k</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'characterReplacement("ABAB", 2)     →  4  // change both A\'s (or both B\'s)\ncharacterReplacement("AABABBA", 1)  →  4  // "AABA" → "AAAA" (or "ABBA" → "BBBB")', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Fixing a window means turning everything into its most frequent letter, ' +
			'which costs <code>windowLen − maxCount</code> changes. Grow a window rightward, ' +
			'tracking letter counts; while the cost exceeds <code>k</code>, slide the left ' +
			'edge. The longest valid window ever seen is the answer:</p>' +
			DIAGRAM +
			'<p>Each index enters and leaves the window at most once — O(n) with a ' +
			'26-slot counter.</p>',
		],

		starter: [
			'package main',
			'',
			'// characterReplacement returns the length of the longest substring',
			'// of s consisting of a single repeated letter, after changing at',
			'// most k characters. s contains only uppercase letters A-Z.',
			'func characterReplacement(s string, k int) int {',
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
			'		k    int',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{"ABAB", 2, 4},',
			'		{"AABABBA", 1, 4},',
			'		{"AABBBAA", 0, 3},',
			'		{"A", 0, 1},',
			'		{"BBBB", 2, 4},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("s=%q, k=%d", c.s, c.k),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := characterReplacement(c.s, c.k)',
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
			'// characterReplacement returns the longest substring of one repeated',
			'// letter obtainable with at most k changes (s is uppercase A-Z).',
			'//',
			'// Sliding window over s with per-letter counts. A window is valid',
			'// when windowLen − maxCount ≤ k (change every non-majority letter',
			'// into the majority one). The famous subtlety: maxCount is NOT',
			'// recomputed when the left edge moves, so it can run stale (higher',
			'// than any count actually in the window). That is deliberate and',
			'// safe — see below — and it is what keeps each step O(1) instead of',
			'// an O(26) rescan.',
			'func characterReplacement(s string, k int) int {',
			'	var counts [26]int // window letter counts; array, not map: A-Z only',
			'	maxCount := 0      // highest single-letter count any window has had',
			'	best := 0',
			'	left := 0',
			'	for right := 0; right < len(s); right++ {',
			'		counts[s[right]-\'A\']++',
			'		if c := counts[s[right]-\'A\']; c > maxCount {',
			'			maxCount = c // only the letter just added can set a record',
			'		}',
			'		// Invalid means MORE than k changes needed. Slide (don\'t',
			'		// shrink) the window: one step left for the one step right',
			'		// took, so the window length never decreases. maxCount is',
			'		// left alone even though the departing letter\'s count drops.',
			'		if (right-left+1)-maxCount > k {',
			'			counts[s[left]-\'A\']--',
			'			left++',
			'		}',
			'		// Why a stale maxCount can\'t overreport: best only improves',
			'		// when the window GROWS, the window only grows while',
			'		// windowLen − maxCount ≤ k holds, and a grown window sets a',
			'		// new record only on the iteration where maxCount itself was',
			'		// just genuinely increased. Stale values merely let an',
			'		// invalid window coast at its old (already-achieved) length.',
			'		if wl := right - left + 1; wl > best {',
			'			best = wl',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Every substring, and for each the cost to unify it: ' +
			'<code>len − maxCount</code>, where <code>maxCount</code> is its most frequent ' +
			'letter’s count. O(n²) substrings × O(n) counting. The insight that saves the ' +
			'day is that the cost formula is <em>windowable</em>: letter counts update in ' +
			'O(1) as a window edge moves.</p>' +
			'<h3>The window and its validity test</h3>' +
			'<p>Keep <code>counts[26]</code> for the current window (the input is uppercase ' +
			'A–Z — an array indexed by <code>s[i] − \'A\'</code> is smaller and faster than ' +
			'any map). A window is fixable with at most <code>k</code> changes exactly when ' +
			'<code>windowLen − maxCount ≤ k</code>: keep the majority letter, rewrite the ' +
			'rest. Grow <code>right</code> every step; when the test fails, move ' +
			'<code>left</code> one step too:</p>',
			{ code: 'var counts [26]int\nmaxCount, best, left := 0, 0, 0\nfor right := 0; right < len(s); right++ {\n\tcounts[s[right]-\'A\']++\n\tif c := counts[s[right]-\'A\']; c > maxCount {\n\t\tmaxCount = c\n\t}\n\tif (right-left+1)-maxCount > k { // too many changes needed\n\t\tcounts[s[left]-\'A\']--        // slide, don\'t shrink\n\t\tleft++                       // (maxCount deliberately not fixed)\n\t}\n\tif wl := right - left + 1; wl > best {\n\t\tbest = wl\n\t}\n}' },
			'<h3>The classic subtlety: maxCount goes stale</h3>' +
			'<p>When <code>left</code> advances, the departing letter’s count drops — but ' +
			'<code>maxCount</code> is not recomputed, so it may now exceed every count ' +
			'actually in the window. The window can even be <em>invalid</em> under the true ' +
			'max. Why is that fine?</p>' +
			'<ul>' +
			'<li><strong>The window never shrinks.</strong> Each iteration moves ' +
			'<code>right</code> once and <code>left</code> at most once, so ' +
			'<code>right − left + 1</code> never decreases. It is a ruler locked at the best ' +
			'length so far, not a live “current candidate”.</li>' +
			'<li><strong><code>best</code> only improves on genuine evidence.</strong> A new ' +
			'record needs the window to grow, growth requires the validity test to pass, and ' +
			'passing at a <em>new, larger</em> length requires <code>maxCount</code> to have ' +
			'just been genuinely increased (by the letter <code>right</code> added — the only ' +
			'way <code>maxCount</code> ever rises). At that moment it is exact, so every ' +
			'recorded length is real.</li>' +
			'<li><strong>Stale values only make the test conservative about growth.</strong> ' +
			'An inflated <code>maxCount</code> lets an invalid window coast along at its old ' +
			'length without shrinking — harmless, since that length was already achieved — ' +
			'while never letting it grow past a length that some real window justified.</li>' +
			'<li><strong>Only the added letter can set a record.</strong> That is why the ' +
			'update is one comparison, not a 26-way scan: no other count changed upward this ' +
			'step.</li>' +
			'<li><strong><code>k = 0</code> falls out for free.</strong> The test becomes ' +
			'<code>windowLen ≤ maxCount</code>, so the ruler stretches only over existing ' +
			'runs of a single letter.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(1) — a fixed 26-slot array' },
	});
})();
