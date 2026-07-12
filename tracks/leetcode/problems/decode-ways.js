/* Decode Ways — Dynamic Programming (Medium). Climbing Stairs where a step
 * can be disallowed: count decodings of a digit string under A=1..Z=26.
 * The recurrence is the Fibonacci shape, but every transition carries a
 * validity predicate, and the '0' cases carry the whole difficulty.
 * Starter returns −1 because 0 is a legitimate expected answer.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 210" width="500" height="210" role="img" aria-label="prefix DP over the string 226">' +
		'<text x="20" y="16" class="lbl">s = "226" · ways[i] = decodings of the first i digits — each arrow is a VALID last chunk</text>' +
		// prefix boxes: "", "2", "22", "226"
		'<g fill="var(--panel)">' +
		'<rect x="30" y="70" width="80" height="40" rx="4" stroke="var(--edge)"/>' +
		'<rect x="150" y="70" width="80" height="40" rx="4" stroke="var(--edge)"/>' +
		'<rect x="270" y="70" width="80" height="40" rx="4" stroke="var(--edge)"/>' +
		'<rect x="390" y="70" width="80" height="40" rx="4" stroke="var(--accent)" stroke-width="2"/>' +
		'</g>' +
		'<g text-anchor="middle" class="lbl">' +
		'<text x="70" y="86">&quot;&quot;</text><text x="190" y="86">&quot;2&quot;</text>' +
		'<text x="310" y="86">&quot;22&quot;</text><text x="430" y="86">&quot;226&quot;</text>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="70" y="103">1</text><text x="190" y="103">1</text><text x="310" y="103">2</text>' +
		'<text x="430" y="103" style="fill:var(--accent)">3</text>' +
		'</g>' +
		// one-digit transitions along the top
		'<path d="M 112 74 C 126 60 136 60 148 74" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowDW)"/>' +
		'<path d="M 232 74 C 246 60 256 60 268 74" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowDW)"/>' +
		'<path d="M 352 74 C 366 60 376 60 388 74" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowDW)"/>' +
		'<text x="130" y="52" text-anchor="middle" class="lbl">&quot;2&quot;=B ✓</text>' +
		'<text x="250" y="52" text-anchor="middle" class="lbl">&quot;2&quot;=B ✓</text>' +
		'<text x="370" y="52" text-anchor="middle" class="lbl">&quot;6&quot;=F ✓</text>' +
		// two-digit transitions along the bottom
		'<path d="M 80 114 C 140 156 250 156 300 114" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowDWok)"/>' +
		'<path d="M 200 118 C 260 166 370 166 420 118" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowDWok)"/>' +
		'<text x="190" y="152" text-anchor="middle" class="lbl" style="fill:var(--ok)">&quot;22&quot;=V ✓ (10–26)</text>' +
		'<text x="330" y="176" text-anchor="middle" class="lbl" style="fill:var(--ok)">&quot;26&quot;=Z ✓ → ways = 2 + 1 = 3</text>' +
		'<text x="20" y="200" class="lbl">an invalid chunk contributes NOTHING: &quot;0&quot; alone never decodes, &quot;27&quot; &gt; 26, &quot;06&quot; ≠ &quot;6&quot;</text>' +
		'<defs>' +
		'<marker id="dgArrowDW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowDWok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'decode-ways',
		title: 'Decode Ways',
		nav: 'Decode Ways',
		difficulty: 'Medium',
		category: 'Dynamic Programming',
		task: 'Implement numDecodings — make all 7 tests pass.',

		prose: [
			'<h2>Decode Ways</h2>' +
			'<p>A message of capital letters was encoded digit-by-digit with ' +
			'<code>A=1, B=2, …, Z=26</code> and the results concatenated. Given the digit ' +
			'string <code>s</code>, return the number of ways it can be decoded back.</p>' +
			'<ul><li>Chunks are <code>1</code>–<code>26</code> with no leading zeros: ' +
			'<code>"06"</code> is not a valid chunk, <code>"6"</code> is.</li>' +
			'<li>A string that cannot be fully decoded has <code>0</code> ways.</li>' +
			'<li><code>s</code> is non-empty and contains only digits.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'numDecodings("12")   →  2   // "AB" (1,2) or "L" (12)\nnumDecodings("226")  →  3   // "BZ" (2,26), "VF" (22,6), "BBF" (2,2,6)\nnumDecodings("06")   →  0   // no chunk starts with 0', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Any decoding of the first i digits ends with a last chunk of one digit or two ' +
			'digits — so <code>ways[i] = ways[i−1] + ways[i−2]</code>, <em>except</em> that each ' +
			'term only counts if its chunk is actually legal:</p>' +
			DIAGRAM +
			'<p>It is the Climbing Stairs recurrence with a validity test bolted onto every ' +
			'step — and the zeros are where all the failures hide.</p>',
		],

		starter: [
			'package main',
			'',
			'// numDecodings returns the number of ways the digit string s can be',
			'// decoded under A=1, B=2, ..., Z=26. Chunks have no leading zeros',
			'// ("06" is invalid; "6" is fine). An undecodable string yields 0.',
			'func numDecodings(s string) int {',
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
			'		{"12", 2},    // "AB" or "L"',
			'		{"226", 3},   // both transitions valid at every step',
			'		{"06", 0},    // leading zero — dead on arrival',
			'		{"10", 1},    // the 0 survives ONLY as part of "10"',
			'		{"27", 1},    // 27 > 26: the pair is invalid, singles still work',
			'		{"100", 0},   // second 0 has no 1 or 2 to lean on',
			'		{"11106", 2}, // interior zero: (1)(1)(10)(6) and (11)(10)(6)',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("s=%q", c.s),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := numDecodings(c.s)',
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
			'// numDecodings counts the decodings of s under A=1..Z=26.',
			'//',
			'// Prefix DP: ways(i) = number of decodings of the first i digits.',
			'// Every decoding ends with a last chunk of one or two digits, and the',
			'// two pools are disjoint, so',
			'//',
			'//	ways(i) = [s[i-1] is a valid 1-digit chunk] * ways(i-1)',
			'//	        + [s[i-2:i] is a valid 2-digit chunk] * ways(i-2)',
			'//',
			'// The predicates are where the problem lives: a lone \'0\' is never',
			'// valid (so it MUST pair leftward as 10 or 20), and a pair is valid',
			'// only in 10..26 — which both rejects 27+ and rejects "06"-style',
			'// leading zeros, since "06" is 6 < 10. Only two previous values are',
			'// read, so two rolling variables replace the table: O(1) space.',
			'func numDecodings(s string) int {',
			'	if len(s) == 0 || s[0] == \'0\' {',
			'		// A leading zero can never start a chunk — zero ways. This',
			'		// also seeds the loop safely: ways(1) below is always 1.',
			'		return 0',
			'	}',
			'	// prev2 = ways(i-2), prev1 = ways(i-1). ways(0) = 1 — the empty',
			'	// prefix has exactly one decoding (the empty one); that seed is',
			'	// what lets a leading valid PAIR like "12" count ways(0) once.',
			'	prev2, prev1 := 1, 1',
			'	for i := 2; i <= len(s); i++ {',
			'		cur := 0',
			'		if s[i-1] != \'0\' {',
			'			cur += prev1 // last chunk is the single digit s[i-1]',
			'		}',
			'		// Numeric value of the two-digit tail s[i-2:i]. The 10..26',
			'		// window does double duty: it caps at Z=26 AND rejects',
			'		// leading zeros (e.g. "06" evaluates to 6, below 10).',
			'		pair := int(s[i-2]-\'0\')*10 + int(s[i-1]-\'0\')',
			'		if pair >= 10 && pair <= 26 {',
			'			cur += prev2 // last chunk is the pair',
			'		}',
			'		// If both predicates failed, cur is 0 and stays 0 for every',
			'		// longer prefix — an undecodable string reports 0 naturally.',
			'		prev2, prev1 = prev1, cur',
			'	}',
			'	return prev1 // ways(len(s))',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Recurse on "peel one digit or two off the front": correct, but the two branches ' +
			're-decode the same suffixes over and over — O(2ⁿ), the same explosion as naive ' +
			'Climbing Stairs. And the counting skeleton really <em>is</em> Climbing Stairs: a ' +
			'decoding of the first i digits ends with a chunk of length 1 or 2, the two pools ' +
			'are disjoint, so <code>ways(i) = ways(i−1) + ways(i−2)</code>… if every chunk were ' +
			'legal. It is not, and that is the entire problem.</p>' +
			'<h3>The zeros are the problem</h3>' +
			'<p>Each term of the sum only counts when its chunk passes a validity test: a single ' +
			'digit must be <code>1</code>–<code>9</code>, a pair must be <code>10</code>–' +
			'<code>26</code>. Walk the traps:</p>' +
			'<ul>' +
			'<li><strong>"06" → 0.</strong> A chunk can’t start with 0, and the 10–26 window ' +
			'encodes that for free: "06" evaluates to 6, below 10, so neither predicate ever ' +
			'fires and the count is 0 from the first character.</li>' +
			'<li><strong>"10" → 1.</strong> The 0 is invalid alone, so it contributes nothing ' +
			'via <code>ways(1)</code>; but "10" is in range, so it inherits ' +
			'<code>ways(0) = 1</code>. Exactly one decoding: "J".</li>' +
			'<li><strong>"30" → 0.</strong> The 0 is invalid alone <em>and</em> 30 &gt; 26 — ' +
			'both doors shut, <code>cur = 0</code>, and once a prefix hits 0 ways every longer ' +
			'prefix stays 0 (both future terms multiply off it).</li>' +
			'<li><strong>"27" → 1.</strong> The other boundary: 27 &gt; 26 kills the pair, but ' +
			'both singles are fine — only "BG" remains.</li>' +
			'</ul>' +
			'<p>For a fully-valid string like <code>"226"</code> the table is pure Fibonacci:</p>',
			{ code: 'prefix   ""   "2"   "22"          "226"\nways      1    1     2             3\n                     = 1("2") +    = 2("6") +\n                       1("22")       1("26")', lang: 'txt' },
			'<p>Only <code>ways(i−1)</code> and <code>ways(i−2)</code> are ever read, so two ' +
			'rolling variables carry the whole computation:</p>',
			{ code: 'prev2, prev1 := 1, 1 // ways(0)=1 (empty prefix), ways(1)=1 (s[0] != \'0\')\nfor i := 2; i <= len(s); i++ {\n\tcur := 0\n\tif s[i-1] != \'0\' {\n\t\tcur += prev1\n\t}\n\tpair := int(s[i-2]-\'0\')*10 + int(s[i-1]-\'0\')\n\tif pair >= 10 && pair <= 26 {\n\t\tcur += prev2\n\t}\n\tprev2, prev1 = prev1, cur\n}' },
			'<p>The <code>ways(0) = 1</code> seed is not a hack: the empty prefix has exactly ' +
			'one decoding (decode nothing), and it is what makes a leading pair like "12" ' +
			'count once through the two-digit door.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>1-D DP over prefixes with a validity predicate per transition</strong> — ' +
			'reach for it when the statement says "count (or check) the ways to segment a ' +
			'sequence into legal chunks": the recurrence is "last chunk has length k, for each ' +
			'allowed k", and each term is gated by a legality test. Cost: O(n · k) time — here ' +
			'k = 2, so O(n) with O(1) rolling space. It is <em>Climbing Stairs</em> where steps ' +
			'can be disallowed, and the same shape with a richer predicate is <em>Word ' +
			'Break</em> ("does this chunk appear in the dictionary?" instead of "is this chunk ' +
			'in 10–26?"). The Fibonacci-family compression — look back a fixed distance, keep ' +
			'that many rolling variables — is shared with <em>House Robber</em> and <em>Min ' +
			'Cost Climbing Stairs</em>; what this problem adds is the discipline of proving ' +
			'each transition legal before letting it contribute.</p>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
