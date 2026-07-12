/* Reverse Bits — Bit Manipulation (Easy). Mirror the 32 bits of a uint32:
 * bit 0 swaps with bit 31, bit 1 with bit 30, and so on. The workhorse is
 * the 32-step rebuild loop (peel n's low bit, append it to a growing
 * result); the explanation adds the O(log w) mask-and-swap cascade and
 * points at math/bits.Reverse32, the stdlib answer.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// One step of the rebuild loop, shown on an 8-bit mini example
	// (00001101, three bits already consumed). n sheds its low bit; result
	// shifts left and absorbs it — 32 rounds mirror the whole word.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="one step of the rebuild loop: the low bit of n moves to the low end of a left-shifting result">' +
		'<text x="20" y="16" class="lbl">one step of the rebuild (8-bit mini example, 3 bits already moved)</text>' +
		// n — remaining bits, low bit highlighted
		'<text x="20" y="38" class="lbl">n · consumed from the right</text>' +
		'<g text-anchor="middle">' +
		'<rect x="20" y="44" width="30" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="54" y="44" width="30" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="88" y="44" width="30" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="122" y="44" width="30" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="156" y="44" width="30" height="28" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="35" y="64">0</text><text x="69" y="64">0</text><text x="103" y="64">0</text><text x="137" y="64">0</text><text x="171" y="64">1</text>' +
		'</g>' +
		'<text x="171" y="90" text-anchor="middle" class="lbl">n &amp; 1</text>' +
		// result — bits placed so far, dashed slot for the incoming bit
		'<text x="330" y="38" class="lbl">result · grows on the right, older bits slide left</text>' +
		'<g text-anchor="middle">' +
		'<rect x="330" y="44" width="30" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="364" y="44" width="30" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="398" y="44" width="30" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="432" y="44" width="30" height="28" rx="4" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3"/>' +
		'<text x="345" y="64">1</text><text x="379" y="64">0</text><text x="413" y="64">1</text>' +
		'</g>' +
		// transfer arrow
		'<path d="M 186 78 C 250 130 380 130 442 78" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowRVB)"/>' +
		'<text x="310" y="126" text-anchor="middle" style="fill:var(--accent)">result = result&lt;&lt;1 | n&amp;1</text>' +
		'<text x="310" y="144" text-anchor="middle" class="lbl">n &gt;&gt;= 1 — one bit moves per step</text>' +
		'<text x="20" y="182" style="fill:var(--ok)">after all 8 steps: 00001101 → 10110000 — the bit string mirrored (uint32 takes 32 steps)</text>' +
		'<defs><marker id="dgArrowRVB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'reverse-bits',
		title: 'Reverse Bits',
		nav: 'Reverse Bits',
		difficulty: 'Easy',
		category: 'Bit Manipulation',
		task: 'Implement reverseBits — make all 5 tests pass.',

		prose: [
			'<h2>Reverse Bits</h2>' +
			'<p>Given an unsigned 32-bit integer <code>n</code>, return the integer whose ' +
			'binary representation is <code>n</code>&rsquo;s <em>reversed</em>: bit 0 (the LSB) ' +
			'moves to bit 31 (the MSB), bit 1 to bit 30, and so on.</p>' +
			'<ul><li>All 32 positions count — reversing <code>1</code> gives ' +
			'<code>1&lt;&lt;31</code>, not <code>1</code>. Leading zeros become trailing zeros.</li>' +
			'<li>The stdlib has <code>math/bits.Reverse32</code> — the point here is to build ' +
			'it yourself.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'reverseBits(43261596)    →  964176192\n// 00000010100101000001111010011100₂\n// 00111001011110000010100101000000₂  (mirrored)\n\nreverseBits(1)  →  2147483648   // 1 becomes 1<<31', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Rebuild the answer one bit at a time: peel <code>n</code>&rsquo;s lowest bit and ' +
			'append it to a result that keeps shifting left. The first bit peeled gets shifted ' +
			'31 more times, landing exactly at the top — the mirror falls out of the loop:</p>' +
			DIAGRAM +
			'<p>Fixed 32 iterations, two shifts and an OR each — no lookup tables needed.</p>',
		],

		starter: [
			'package main',
			'',
			'// reverseBits returns n with its 32 bits in reverse order:',
			'// bit 0 (LSB) moves to bit 31 (MSB), bit 1 to bit 30, and so on.',
			'func reverseBits(n uint32) uint32 {',
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
			'		n    uint32',
			'		want uint32',
			'	}',
			'	cases := []tc{',
			'		// The LeetCode classic.',
			'		{43261596, 964176192},',
			'		// Near-max value: only bit 1 is clear, so the mirror clears bit 30.',
			'		{4294967293, 3221225471},',
			'		// The killer for "stop when n hits zero": 1 must travel to the top.',
			'		{1, 2147483648},',
			'		{0, 0},',
			'		// Alternating 1010... flips to 0101... — every bit moves.',
			'		{2863311530, 1431655765},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("n=%d (%032b)", c.n, c.n),',
			'			"want":  fmt.Sprintf("%d (%032b)", c.want, c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := reverseBits(c.n)',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%d (%032b)", got, got)',
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
			'// reverseBits returns n with its 32 bits mirrored (bit i moves to',
			'// bit 31-i) by rebuilding the answer LSB-first.',
			'//',
			'// Each round peels the lowest bit off n and appends it to the low end',
			'// of result — after shifting result left to make room. A bit peeled',
			'// on round i gets shifted left on each of the remaining 31-i rounds,',
			'// so it finishes at position 31-i: exactly its mirror slot.',
			'//',
			'// The loop must run all 32 rounds even once n reaches zero: the',
			'// remaining shifts are what push the already-placed bits up to their',
			'// final positions (stopping early would leave reverseBits(1) == 1',
			'// instead of 1<<31). That is why the bound is the fixed word width,',
			'// not a "for n != 0" condition.',
			'//',
			'// Production code calls math/bits.Reverse32 — the compiler lowers it',
			'// to a short mask-and-shift sequence (a single RBIT instruction on',
			'// ARM). The exercise is knowing what that call does.',
			'func reverseBits(n uint32) uint32 {',
			'	var result uint32',
			'	for i := 0; i < 32; i++ {',
			'		result = result<<1 | n&1 // make room, drop n\'s low bit in',
			'		n >>= 1                  // consume that bit',
			'	}',
			'	return result',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Bit-by-bit rebuild: 32 rounds, no cleverness needed</h3>' +
			'<p>The direct translation of &ldquo;bit i goes to bit 31−i&rdquo; tests each ' +
			'position and sets its mirror. Tidier: peel bits off one end while pushing them ' +
			'onto the other, the way you&rsquo;d reverse a string by popping characters:</p>',
			{ code: 'var result uint32\nfor i := 0; i < 32; i++ {\n\tresult = result<<1 | n&1 // shift result left, append n\'s low bit\n\tn >>= 1\n}\nreturn result' },
			'<p>The subtle bug this problem loves to catch: looping <code>for n != 0</code>. ' +
			'That skips the trailing shifts, so <code>reverseBits(1)</code> returns 1 instead ' +
			'of <code>1&lt;&lt;31</code> — the loop bound must be the <em>word width</em>, ' +
			'because leading zeros of the input are real bits of the output.</p>' +
			'<h3>The O(log w) version: swap halves, then quarters, then&hellip;</h3>' +
			'<p>Reversing a word is swapping its two halves, then reversing each half — ' +
			'recursion that unrolls into five mask-and-shift lines. Each line swaps ' +
			'<em>every</em> pair of blocks at one granularity simultaneously; the masks are ' +
			'the alternating-block patterns:</p>',
			{ code: 'n = n>>1&0x55555555 | n&0x55555555<<1 // swap adjacent bits      0101...\nn = n>>2&0x33333333 | n&0x33333333<<2 // swap 2-bit pairs        0011...\nn = n>>4&0x0F0F0F0F | n&0x0F0F0F0F<<4 // swap nibbles            00001111...\nn = n>>8&0x00FF00FF | n&0x00FF00FF<<8 // swap bytes\nn = n>>16 | n<<16                     // swap 16-bit halves\nreturn n' },
			'<p>Five steps instead of 32 — log₂(width) rounds, each O(1). This is how ' +
			'<code>math/bits.Reverse32</code> is implemented on machines without a ' +
			'reverse instruction, and the same cascade structure computes popcount and ' +
			'byte-swaps (<code>bits.ReverseBytes32</code> is just the last two lines).</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Bit-by-bit reconstruction vs. logarithmic swap cascades</strong> — ' +
			'when a problem transforms a <em>fixed-width</em> integer (reverse, popcount, ' +
			'byte-swap, parity), the O(w) peel-one-bit loop is the reliable interview answer, ' +
			'and the O(log w) divide-and-conquer masks (0x55555555, 0x33333333, 0x0F0F0F0F&hellip;) ' +
			'are the follow-up. The trigger: output bits are a pure rearrangement or ' +
			'aggregation of input bits, so blocks can be processed in parallel inside one ' +
			'word. Costs: O(w) time / O(1) space for the loop, O(log w) for the cascade. ' +
			'The same peel-and-test loop drives Number of 1 Bits and Counting Bits, and the ' +
			'fold-over-bits mindset powers Single Number. The meta-lesson: before hand-rolling, ' +
			'check <code>math/bits</code> — <code>Reverse32</code>, <code>OnesCount32</code>, ' +
			'<code>LeadingZeros32</code> already exist, compile to single instructions, and ' +
			'are what production Go should call.</p>',
		],
		complexity: { time: 'O(32) loop — O(log 32) with the swap cascade', space: 'O(1)' },
	});
})();
