/* Counting Bits — Bit Manipulation (Easy). Popcount for EVERY value 0..n
 * at once. Running hammingWeight n+1 times is O(n log n); the DP insight
 * is that i>>1 (i with its last bit dropped) was already solved, so
 * ans[i] = ans[i>>1] + (i & 1) fills the whole table in O(n).
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// Table of 0..8: each count is its half's count plus the last bit.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="bit counts for 0 to 8: each value reuses the count of itself shifted right by one">' +
		'<text x="20" y="16" class="lbl">ans[i] = ans[i&gt;&gt;1] + (i &amp; 1) — reuse the count of i with its last bit dropped</text>' +
		// index row (labels), binary cells, count row
		'<g text-anchor="middle">' +
		'<text x="44" y="38" class="lbl">0</text><text x="98" y="38" class="lbl">1</text>' +
		'<text x="152" y="38" class="lbl">2</text><text x="206" y="38" class="lbl">3</text>' +
		'<text x="260" y="38" class="lbl">4</text><text x="314" y="38" class="lbl">5</text>' +
		'<text x="368" y="38" class="lbl">6</text><text x="422" y="38" class="lbl">7</text>' +
		'<text x="476" y="38" class="lbl">8</text>' +
		'<rect x="20" y="44" width="48" height="32" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="74" y="44" width="48" height="32" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="128" y="44" width="48" height="32" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="182" y="44" width="48" height="32" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<rect x="236" y="44" width="48" height="32" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="290" y="44" width="48" height="32" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="344" y="44" width="48" height="32" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="398" y="44" width="48" height="32" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="452" y="44" width="48" height="32" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="44" y="65">0</text><text x="98" y="65">1</text>' +
		'<text x="152" y="65">10</text><text x="206" y="65">11</text>' +
		'<text x="260" y="65">100</text><text x="314" y="65">101</text>' +
		'<text x="368" y="65">110</text><text x="422" y="65">111</text>' +
		'<text x="476" y="65">1000</text>' +
		'<text x="44" y="96" style="fill:var(--ok)">0</text><text x="98" y="96" style="fill:var(--ok)">1</text>' +
		'<text x="152" y="96" style="fill:var(--ok)">1</text><text x="206" y="96" style="fill:var(--ok)">2</text>' +
		'<text x="260" y="96" style="fill:var(--ok)">1</text><text x="314" y="96" style="fill:var(--ok)">2</text>' +
		'<text x="368" y="96" style="fill:var(--ok)">2</text><text x="422" y="96" style="fill:var(--ok)">3</text>' +
		'<text x="476" y="96" style="fill:var(--ok)">1</text>' +
		'</g>' +
		// arrow from 6 back to its half, 3
		'<path d="M 368 104 C 340 148 240 148 212 106" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowCB)"/>' +
		'<text x="290" y="164" text-anchor="middle" style="fill:var(--accent)">ans[6] = ans[6&gt;&gt;1] + (6 &amp; 1) = ans[3] + 0 = 2</text>' +
		'<text x="290" y="184" text-anchor="middle" class="lbl">6 = 110₂ is just 3 = 11₂ shifted left with a 0 appended · 7 = 111₂ appends a 1 → ans[3] + 1 = 3</text>' +
		'<text x="290" y="202" text-anchor="middle" class="lbl">i&gt;&gt;1 &lt; i, so the value we reuse is always already filled in — left-to-right order works</text>' +
		'<defs><marker id="dgArrowCB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'counting-bits',
		title: 'Counting Bits',
		nav: 'Counting Bits',
		difficulty: 'Easy',
		category: 'Bit Manipulation',
		task: 'Implement countBits — make all 5 tests pass.',

		prose: [
			'<h2>Counting Bits</h2>' +
			'<p>Given an integer <code>n</code>, return a slice <code>ans</code> of length ' +
			'<code>n + 1</code> where <code>ans[i]</code> is the number of <code>1</code> ' +
			'bits in the binary representation of <code>i</code>, for every ' +
			'<code>i</code> from <code>0</code> to <code>n</code>.</p>' +
			'<ul><li><code>n ≥ 0</code>; for <code>n = 0</code> the answer is ' +
			'<code>[]int{0}</code>.</li>' +
			'<li>Follow-up (the real question): can you do it in O(n) total — ' +
			'<em>without</em> re-counting each number’s bits from scratch?</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'countBits(2)  →  []int{0, 1, 1}\ncountBits(5)  →  []int{0, 1, 1, 2, 1, 2}   // 0,1,10,11,100,101', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Drop the last bit of <code>i</code> and you get <code>i&gt;&gt;1</code> — a ' +
			'smaller number whose count is <em>already in the table</em>. The last bit ' +
			'itself contributes <code>i &amp; 1</code>. So each entry is one addition:</p>' +
			DIAGRAM +
			'<p>Every value reuses a solved subproblem — a one-line DP over the bit ' +
			'structure of the integers.</p>',
		],

		starter: [
			'package main',
			'',
			'// countBits returns a slice ans of length n+1 where ans[i] is the',
			'// number of 1 bits in the binary representation of i (0 <= i <= n).',
			'func countBits(n int) []int {',
			'	// your code here',
			'	return nil',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"reflect"',
			')',
			'',
			LC.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		n    int',
			'		want []int',
			'	}',
			'	cases := []tc{',
			'		{2, []int{0, 1, 1}},',
			'		{5, []int{0, 1, 1, 2, 1, 2}},',
			'		// Edge: n = 0 still returns a one-element table.',
			'		{0, []int{0}},',
			'		// Crossing a power of two: 8 = 1000 resets the count to 1.',
			'		{8, []int{0, 1, 1, 2, 1, 2, 2, 3, 1}},',
			'		// Two full power-of-two blocks: the 8..15 row is the 0..7 row plus one.',
			'		{16, []int{0, 1, 1, 2, 1, 2, 2, 3, 1, 2, 2, 3, 2, 3, 3, 4, 1}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("n=%d", c.n),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := countBits(c.n)',
			'			r["pass"] = reflect.DeepEqual(got, c.want)',
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
			'// countBits builds the popcount table for 0..n with the recurrence',
			'//',
			'//	ans[i] = ans[i>>1] + (i & 1)',
			'//',
			'// i>>1 is i with its last binary digit dropped — a strictly smaller',
			'// number, so by the time the loop reaches i its subproblem is already',
			'// filled in (plain left-to-right order is a valid topological order).',
			'// The dropped digit is i&1, contributing 1 iff i is odd. Each entry',
			'// costs one addition: O(n) total versus O(n log n) for re-counting',
			'// every value\'s bits from scratch.',
			'func countBits(n int) []int {',
			'	ans := make([]int, n+1) // ans[0] = 0 is the base case, free from make',
			'	for i := 1; i <= n; i++ {',
			'		ans[i] = ans[i>>1] + (i & 1)',
			'	}',
			'	return ans',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Run a popcount (say Kernighan’s <code>n &amp; (n−1)</code> loop from the ' +
			'previous problem) on each of the <code>n + 1</code> values independently. ' +
			'That’s O(n log n) — each count costs up to the bit-width of <code>i</code>. ' +
			'The waste: counting the bits of <code>6</code> redoes almost all the work of ' +
			'counting the bits of <code>3</code>, because <code>110₂</code> is just ' +
			'<code>11₂</code> with a zero appended.</p>' +
			'<h3>The recurrence: drop the last bit</h3>' +
			'<p>Every integer is a smaller integer plus one trailing bit: ' +
			'<code>i = (i&gt;&gt;1) * 2 + (i &amp; 1)</code>. Shifting doesn’t change how many ' +
			'1s are in the high part, so</p>',
			{ code: 'ans := make([]int, n+1) // ans[0] = 0\nfor i := 1; i <= n; i++ {\n\tans[i] = ans[i>>1] + (i & 1) // solved half + last bit\n}\nreturn ans' },
			'<p>Why this is airtight:</p>' +
			'<ul>' +
			'<li><strong>The dependency always points backward.</strong> ' +
			'<code>i&gt;&gt;1 &lt; i</code> for every <code>i ≥ 1</code>, so filling the table ' +
			'left to right means the subproblem is always ready — no memoization or ' +
			'recursion needed.</li>' +
			'<li><strong>The base case is free.</strong> <code>make([]int, n+1)</code> ' +
			'zero-fills, and <code>ans[0] = 0</code> is exactly right: zero has no set ' +
			'bits.</li>' +
			'<li><strong>An equivalent recurrence:</strong> <code>ans[i] = ' +
			'ans[i &amp; (i−1)] + 1</code>. Here <code>i &amp; (i−1)</code> is <code>i</code> ' +
			'with its lowest set bit deleted (Kernighan again) — also strictly smaller, also ' +
			'already solved, and by construction it has exactly one fewer 1 bit. Both are ' +
			'one addition per entry; pick whichever reading you find clearer.</li>' +
			'<li><strong>The power-of-two rhythm in the output</strong> — ' +
			'<code>[0 | 1 | 1 2 | 1 2 2 3 | 1 2 2 3 2 3 3 4 | …]</code> — each block ' +
			'<code>2^k..2^(k+1)−1</code> is the entire table so far with every entry ' +
			'bumped by one (the new leading bit). Spotting that pattern is another route ' +
			'to the same DP.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(n) — the answer itself' },
	});
})();
