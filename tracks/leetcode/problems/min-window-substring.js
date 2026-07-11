/* Minimum Window Substring — Sliding Window (Hard). The capstone window
 * problem: find the shortest substring of s containing every char of t
 * WITH multiplicity. The expand/contract two-pointer with a need map and
 * a `have` counter of fully-satisfied characters turns an O(n²)-windows
 * problem into a single O(|s| + |t|) sweep. The classic bug it tests:
 * t = "aa" needs BOTH a's, so satisfaction must compare counts, not
 * mere presence.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// s = "ADOBECODEBANC", t = "ABC": expand to the first covering window
	// "ADOBEC", keep sliding, contract to the minimal one "BANC".
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 214" width="540" height="214" role="img" aria-label="window expands until it covers ABC, then contracts to the minimal window BANC">' +
		'<text x="15" y="16" class="lbl">s = &quot;ADOBECODEBANC&quot; · t = &quot;ABC&quot; · need = {A:1 B:1 C:1}</text>' +
		// first covering window (dashed accent) and final minimal window (solid ok)
		'<rect x="11" y="38" width="232" height="42" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="5 3"/>' +
		'<rect x="353" y="38" width="156" height="42" rx="6" fill="var(--ok)" opacity="0.12"/>' +
		'<rect x="353" y="38" width="156" height="42" rx="6" fill="none" stroke="var(--ok)" stroke-width="1.8"/>' +
		// the thirteen character cells; chars of t drawn full-strength
		'<g text-anchor="middle">' +
		'<rect x="15" y="42" width="34" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="53" y="42" width="34" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="91" y="42" width="34" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="129" y="42" width="34" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="167" y="42" width="34" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="205" y="42" width="34" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="243" y="42" width="34" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="281" y="42" width="34" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="319" y="42" width="34" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="357" y="42" width="34" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="395" y="42" width="34" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="433" y="42" width="34" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="471" y="42" width="34" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="32" y="64">A</text><text x="70" y="64" class="lbl">D</text>' +
		'<text x="108" y="64" class="lbl">O</text><text x="146" y="64">B</text>' +
		'<text x="184" y="64" class="lbl">E</text><text x="222" y="64">C</text>' +
		'<text x="260" y="64" class="lbl">O</text><text x="298" y="64" class="lbl">D</text>' +
		'<text x="336" y="64" class="lbl">E</text><text x="374" y="64">B</text>' +
		'<text x="412" y="64">A</text><text x="450" y="64" class="lbl">N</text>' +
		'<text x="488" y="64">C</text>' +
		'</g>' +
		// phase arrows: expansion under the first window, left edge sliding into the last
		'<path d="M 15 90 L 238 90" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowMWS)"/>' +
		'<path d="M 308 90 L 350 90" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowMWSok)"/>' +
		'<text x="15" y="114" style="fill:var(--accent)">1. expand → &quot;ADOBEC&quot; is the first window covering A, B, C (len 6)</text>' +
		'<text x="15" y="138">2. contract: drop the left &quot;A&quot; — coverage breaks (have &lt; need) → expand again</text>' +
		'<text x="15" y="162" style="fill:var(--ok)">3. whenever coverage holds, shrink from the left and record → best = &quot;BANC&quot; (len 4)</text>' +
		'<text x="15" y="186" class="lbl">counts, not presence: t = &quot;aa&quot; is satisfied only when the window holds BOTH a&#39;s</text>' +
		'<text x="15" y="204" class="lbl">each index enters the window once and leaves once — O(n) despite the nested-looking loops</text>' +
		'<defs>' +
		'<marker id="dgArrowMWS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowMWSok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'min-window-substring',
		title: 'Minimum Window Substring',
		nav: 'Min Window Substring',
		difficulty: 'Hard',
		category: 'Sliding Window',
		task: 'Implement minWindow — make all 5 tests pass.',

		prose: [
			'<h2>Minimum Window Substring</h2>' +
			'<p>Given strings <code>s</code> and <code>t</code>, return the <em>shortest</em> ' +
			'substring of <code>s</code> that contains every character of <code>t</code> — ' +
			'<strong>including duplicates</strong>. If no such window exists, return ' +
			'<code>&quot;&quot;</code>.</p>' +
			'<ul><li>Multiplicity counts: if <code>t = &quot;aa&quot;</code>, the window must ' +
			'contain <em>two</em> <code>a</code>’s.</li>' +
			'<li>The test cases have a unique shortest window, so there’s no tie to break.</li>' +
			'<li>Target: O(|s| + |t|) — one sweep, no per-window rescans.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'minWindow("ADOBECODEBANC", "ABC")  →  "BANC"\nminWindow("a", "aa")               →  ""     // only one a available\nminWindow("a", "a")                →  "a"', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Grow the right edge until the window covers all of <code>t</code>; then ' +
			'shrink the left edge while it still does, recording each valid length. A ' +
			'<code>have</code> counter of <em>fully satisfied</em> characters makes the ' +
			'“covers all of t?” test O(1) instead of a map comparison:</p>' +
			DIAGRAM +
			'<p>Expand to become valid, contract to become minimal — repeat to the end ' +
			'of <code>s</code>.</p>',
		],

		starter: [
			'package main',
			'',
			'// minWindow returns the shortest substring of s containing every',
			'// character of t, counting duplicates (t = "aa" needs two a\'s).',
			'// If no such window exists it returns "".',
			'func minWindow(s, t string) string {',
			'	// your code here',
			'	return ""',
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
			'		want string',
			'	}',
			'	cases := []tc{',
			'		{"ADOBECODEBANC", "ABC", "BANC"},',
			'		// s == t: the whole string is the (only) window.',
			'		{"a", "a", "a"},',
			'		// t longer than s: no window can ever exist.',
			'		{"a", "aa", ""},',
			'		// Duplicates in t: the window needs BOTH a\'s, not just one.',
			'		{"acbbaca", "aba", "baca"},',
			'		// No window: t\'s character never appears in s.',
			'		{"xyz", "d", ""},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("s=%q, t=%q", c.s, c.t),',
			'			"want":  fmt.Sprintf("%q", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := minWindow(c.s, c.t)',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%q", got)',
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
			'// minWindow returns the shortest substring of s containing every char',
			'// of t with multiplicity ("" if none exists).',
			'//',
			'// Expand/contract sliding window. need holds t\'s required counts;',
			'// window holds the current window\'s counts of needed chars; have is',
			'// the number of DISTINCT chars whose requirement is currently met in',
			'// full. have makes the validity test O(1): the window covers t',
			'// exactly when have == len(need), no map comparison per step.',
			'//',
			'// The have bookkeeping hinges on crossing the boundary EXACTLY:',
			'// increment when a char\'s window count reaches its need (==, not >=,',
			'// or duplicates would double-count), decrement when it drops below.',
			'// That is also what makes multiplicity work: for t = "aa", have',
			'// credits \'a\' only once the window holds both a\'s.',
			'func minWindow(s, t string) string {',
			'	if len(t) == 0 || len(t) > len(s) {',
			'		return "" // no window can cover t',
			'	}',
			'	need := make(map[byte]int, len(t))',
			'	for i := 0; i < len(t); i++ {',
			'		need[t[i]]++ // duplicates accumulate: t="aa" → need[\'a\']=2',
			'	}',
			'	window := make(map[byte]int, len(need))',
			'	have := 0',
			'	// bestLen starts impossibly large so any real window beats it;',
			'	// it doubles as the "no window found" sentinel at the end.',
			'	bestLen, bestStart := len(s)+1, 0',
			'	left := 0',
			'	for right := 0; right < len(s); right++ {',
			'		c := s[right]',
			'		if cnt, needed := need[c]; needed {',
			'			window[c]++',
			'			if window[c] == cnt { // this char just became fully satisfied',
			'				have++',
			'			}',
			'		}',
			'		// Contract while valid: every stop of the left edge inside a',
			'		// valid window is a candidate, and the shortest window ending',
			'		// at this right edge is reached just before validity breaks.',
			'		for have == len(need) {',
			'			if wl := right - left + 1; wl < bestLen {',
			'				bestLen, bestStart = wl, left',
			'			}',
			'			lc := s[left]',
			'			if cnt, needed := need[lc]; needed {',
			'				window[lc]--',
			'				if window[lc] < cnt { // dropped below requirement',
			'					have--',
			'				}',
			'			}',
			'			left++',
			'		}',
			'	}',
			'	if bestLen > len(s) {',
			'		return "" // never became valid',
			'	}',
			'	return s[bestStart : bestStart+bestLen]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Try every window: O(n²) of them, and checking “does it cover ' +
			'<code>t</code>?” costs another O(n) scan — O(n³), or O(n²) with incremental ' +
			'counts. The waste is rechecking from scratch what one character’s arrival or ' +
			'departure barely changed. Both window edges only ever need to move ' +
			'<em>forward</em>: if <code>[left, right]</code> is the shortest valid window ' +
			'ending at <code>right</code>, no later window’s best left edge is to the left ' +
			'of <code>left</code> — that’s the monotonicity the two-pointer sweep exploits.</p>' +
			'<h3>need, window, and the have counter</h3>' +
			'<p>Build <code>need</code> from <code>t</code> (duplicates accumulate: ' +
			'<code>&quot;aa&quot;</code> → <code>need[\'a\'] = 2</code>). The window is valid when ' +
			'every char’s window count reaches its need — but comparing maps per step is ' +
			'O(|Σ|). Instead keep <code>have</code>: how many <em>distinct</em> chars are ' +
			'currently satisfied in full. Validity becomes <code>have == len(need)</code>, ' +
			'one integer compare.</p>',
			{ code: 'for right := 0; right < len(s); right++ {\n\tc := s[right]\n\tif cnt, needed := need[c]; needed {\n\t\twindow[c]++\n\t\tif window[c] == cnt { // == not >=: cross the boundary exactly once\n\t\t\thave++\n\t\t}\n\t}\n\tfor have == len(need) { // valid → contract to minimal\n\t\tif wl := right - left + 1; wl < bestLen {\n\t\t\tbestLen, bestStart = wl, left\n\t\t}\n\t\tlc := s[left]\n\t\tif cnt, needed := need[lc]; needed {\n\t\t\twindow[lc]--\n\t\t\tif window[lc] < cnt {\n\t\t\t\thave--\n\t\t\t}\n\t\t}\n\t\tleft++\n\t}\n}' },
			'<h3>Key details</h3>' +
			'<ul>' +
			'<li><strong>The <code>==</code> is the duplicates bug-guard.</strong> ' +
			'<code>have</code> must tick up only when a char’s count <em>reaches</em> its ' +
			'need. With <code>&gt;=</code>, the third <code>a</code> in a window would bump ' +
			'<code>have</code> again and validity would fire early. This is exactly the ' +
			'<code>t = &quot;aa&quot;</code> trap: presence isn’t coverage, counts are.</li>' +
			'<li><strong>Contract <em>while</em> valid, not once.</strong> After the right ' +
			'edge makes the window valid, the inner loop keeps popping from the left until ' +
			'validity breaks — recording a candidate at every stop. The shortest window ' +
			'ending at this <code>right</code> is the one just before the break.</li>' +
			'<li><strong>O(n) despite nested loops.</strong> <code>left</code> only moves ' +
			'forward: each index enters the window once and leaves once, so the total work ' +
			'across all inner-loop iterations is 2n pointer moves.</li>' +
			'<li><strong>Record positions, not strings.</strong> <code>bestLen, ' +
			'bestStart</code> plus one final slice avoids building a substring per ' +
			'candidate; <code>bestLen = len(s)+1</code> doubles as the “never valid” ' +
			'sentinel that returns <code>&quot;&quot;</code>.</li>' +
			'<li><strong>The <code>len(t) &gt; len(s)</code> early-out is optional</strong> ' +
			'— the sweep would simply never reach <code>have == len(need)</code> — but it ' +
			'documents the impossible case for free.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(|s| + |t|)', space: 'O(k) — k distinct characters in t' },
	});
})();
