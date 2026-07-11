/* Number of 1 Bits — Bit Manipulation (Easy). Popcount by hand: count the
 * set bits of a uint32. The teaching point is Kernighan's n & (n-1) trick —
 * subtracting 1 turns the lowest set bit into a borrow that AND then wipes,
 * so the loop runs once per SET bit instead of once per bit position.
 * (Real code reaches for math/bits.OnesCount32; here we build it.)
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// n = 11 (1011): three applications of n &= n-1 reach zero → 3 set bits.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="n and n minus 1 clears the lowest set bit until n is zero">' +
		'<text x="20" y="16" class="lbl">n = 11 = 1011₂ · each n &amp; (n−1) deletes exactly one set bit</text>' +
		// row 1: 1011, lowest set bit highlighted
		'<g text-anchor="middle">' +
		'<rect x="30" y="28" width="34" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="68" y="28" width="34" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="106" y="28" width="34" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="144" y="28" width="34" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="47" y="48">1</text><text x="85" y="48">0</text><text x="123" y="48">1</text><text x="161" y="48">1</text>' +
		'</g>' +
		'<text x="196" y="42">n = 1011</text>' +
		'<text x="196" y="58" class="lbl">n−1 = 1010 · &amp; wipes the low 1</text>' +
		'<path d="M 104 62 L 104 72" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowNOB)"/>' +
		// row 2: 1010
		'<g text-anchor="middle">' +
		'<rect x="30" y="78" width="34" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="68" y="78" width="34" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="106" y="78" width="34" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="144" y="78" width="34" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="47" y="98">1</text><text x="85" y="98">0</text><text x="123" y="98">1</text><text x="161" y="98">0</text>' +
		'</g>' +
		'<text x="196" y="92">1011 &amp; 1010 = 1010</text>' +
		'<text x="196" y="108" class="lbl">count = 1</text>' +
		'<path d="M 104 112 L 104 122" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowNOB)"/>' +
		// row 3: 1000
		'<g text-anchor="middle">' +
		'<rect x="30" y="128" width="34" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="68" y="128" width="34" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="106" y="128" width="34" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="144" y="128" width="34" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="47" y="148">1</text><text x="85" y="148">0</text><text x="123" y="148">0</text><text x="161" y="148">0</text>' +
		'</g>' +
		'<text x="196" y="142">1010 &amp; 1001 = 1000</text>' +
		'<text x="196" y="158" class="lbl">count = 2</text>' +
		'<path d="M 104 162 L 104 174" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowNOBok)"/>' +
		'<text x="30" y="192" style="fill:var(--ok)">1000 &amp; 0111 = 0 → loop ends · count = 3 = answer</text>' +
		'<defs>' +
		'<marker id="dgArrowNOB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowNOBok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'number-of-1-bits',
		title: 'Number of 1 Bits',
		nav: 'Number of 1 Bits',
		difficulty: 'Easy',
		category: 'Bit Manipulation',
		task: 'Implement hammingWeight — make all 5 tests pass.',

		prose: [
			'<h2>Number of 1 Bits</h2>' +
			'<p>Given an unsigned 32-bit integer <code>n</code>, return the number of ' +
			'<code>1</code> bits it contains (its <em>Hamming weight</em>, a.k.a. popcount).</p>' +
			'<ul><li><code>n</code> is a <code>uint32</code>: all 32 bit positions are in play, ' +
			'no sign bit to worry about.</li>' +
			'<li>The stdlib has <code>math/bits.OnesCount32</code> — the point here is to ' +
			'build it yourself.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'hammingWeight(11)          →  3   // 1011₂\nhammingWeight(128)         →  1   // 10000000₂\nhammingWeight(4294967295)  →  32  // all 32 bits set', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Subtracting 1 from <code>n</code> flips its lowest set bit to 0 (and the ' +
			'zeros below it to 1s — the borrow). ANDing wipes all of that: ' +
			'<code>n &amp; (n−1)</code> is <code>n</code> with its lowest set bit deleted. ' +
			'Repeat until zero, counting deletions:</p>' +
			DIAGRAM +
			'<p>The loop runs once per <em>set</em> bit, not once per bit position — ' +
			'<code>128</code> takes one iteration, not eight.</p>',
		],

		starter: [
			'package main',
			'',
			'// hammingWeight returns the number of 1 bits in the binary',
			'// representation of n (its Hamming weight / popcount).',
			'func hammingWeight(n uint32) int {',
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
			'		n    uint32',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{11, 3},',
			'		// A single set bit: Kernighan does ONE iteration here.',
			'		{128, 1},',
			'		// Zero has no set bits — the loop body must never run.',
			'		{0, 0},',
			'		// All 32 bits set: the max uint32. A signed-int assumption breaks here.',
			'		{4294967295, 32},',
			'		// 0xAAAAAAAA — alternating 10 pattern, half the bits set.',
			'		{2863311530, 16},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("n=%d (%b)", c.n, c.n),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := hammingWeight(c.n)',
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
			'// hammingWeight counts the 1 bits of n with Kernighan\'s trick:',
			'// n & (n-1) is n with its lowest set bit deleted.',
			'//',
			'// Why that identity holds: subtracting 1 borrows through the trailing',
			'// zeros — ...x1000 becomes ...x0111 — so n and n-1 agree on every bit',
			'// ABOVE the lowest set bit and disagree on it and everything below.',
			'// ANDing keeps the agreeing high bits and zeroes the rest. Each',
			'// iteration therefore removes exactly one set bit, so the loop runs',
			'// popcount(n) times — at most 32, and just once for a power of two.',
			'// (Production code would call math/bits.OnesCount32, which compiles',
			'// to a single POPCNT instruction; the exercise is the trick itself.)',
			'func hammingWeight(n uint32) int {',
			'	count := 0',
			'	for n != 0 {',
			'		n &= n - 1 // delete the lowest set bit',
			'		count++',
			'	}',
			'	return count',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Shift and test: 32 iterations, always</h3>' +
			'<p>The obvious loop inspects every bit position — mask the low bit, shift ' +
			'right, repeat:</p>',
			{ code: 'count := 0\nfor i := 0; i < 32; i++ {\n\tif n&1 == 1 {\n\t\tcount++\n\t}\n\tn >>= 1\n}' },
			'<p>Correct, O(32), fine. But it does the same work for <code>128</code> ' +
			'(one set bit) as for <code>0xFFFFFFFF</code> (thirty-two). The set bits are ' +
			'what we’re counting — can the loop visit <em>only</em> those?</p>' +
			'<h3>Kernighan: n &amp; (n−1) deletes the lowest set bit</h3>' +
			'<p>Subtracting 1 borrows through the trailing zeros: <code>…x1000 − 1 = ' +
			'…x0111</code>. So <code>n</code> and <code>n−1</code> agree on all bits above ' +
			'the lowest set bit, and disagree on it and everything below. AND keeps the ' +
			'agreement, zeroes the disagreement — one set bit gone per step:</p>',
			{ code: 'count := 0\nfor n != 0 {\n\tn &= n - 1 // delete the lowest set bit\n\tcount++\n}\nreturn count\n\n// n = 1011 → 1010 → 1000 → 0000   (3 steps = 3 set bits)' },
			'<p>Details worth having ready:</p>' +
			'<ul>' +
			'<li><strong>The loop count IS the answer.</strong> Each iteration removes ' +
			'exactly one 1 bit, so it runs popcount(n) times — the loop measures the very ' +
			'thing it counts.</li>' +
			'<li><strong><code>uint32</code> keeps the arithmetic honest.</strong> On an ' +
			'unsigned type, <code>n−1</code> at <code>n = 0</code> would wrap — which is why ' +
			'the loop condition is <code>n != 0</code> checked <em>before</em> the ' +
			'subtraction, and why <code>0</code> correctly answers <code>0</code> without ' +
			'entering the body.</li>' +
			'<li><strong>The same identity powers other tricks.</strong> ' +
			'<code>n &amp; (n−1) == 0</code> is the classic power-of-two test, and Counting ' +
			'Bits (the next problem) builds a DP on it.</li>' +
			'<li><strong>In real code:</strong> <code>math/bits.OnesCount32(n)</code> — the ' +
			'compiler lowers it to the CPU’s <code>POPCNT</code> instruction. Interviews ' +
			'want the trick; production wants the intrinsic.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(k) — k = number of set bits (≤ 32)', space: 'O(1)' },
	});
})();
