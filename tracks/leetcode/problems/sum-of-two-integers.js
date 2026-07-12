/* Sum of Two Integers — Bit Manipulation (Medium). Add two ints without
 * + or -. The half-adder decomposition: XOR is the per-column sum with
 * carries ignored, AND<<1 is the carries; loop the pair until the carry
 * dies. Two's complement makes negatives (and hence subtraction) work
 * with zero extra code.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// 2 + 3 through the loop: the column where both bits are 1 generates
	// the carry; two rounds and the carry is gone.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="two rounds of the half-adder loop add 2 and 3: XOR keeps the sum bits, AND shifted left carries, until the carry is zero">' +
		'<text x="20" y="16" class="lbl">2 + 3 · each round: a ⊕ b = sum sans carry, (a &amp; b) &lt;&lt; 1 = carry</text>' +
		// round 1: a=010 b=011, middle column carries
		'<g text-anchor="middle">' +
		'<text x="30" y="48">a</text>' +
		'<rect x="46" y="28" width="30" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="80" y="28" width="30" height="28" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="114" y="28" width="30" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="61" y="48">0</text><text x="95" y="48">1</text><text x="129" y="48">0</text>' +
		'<text x="170" y="48">b</text>' +
		'<rect x="186" y="28" width="30" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="220" y="28" width="30" height="28" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="254" y="28" width="30" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="201" y="48">0</text><text x="235" y="48">1</text><text x="269" y="48">1</text>' +
		'</g>' +
		'<text x="310" y="42">a ⊕ b = 001</text>' +
		'<text x="310" y="60" style="fill:var(--accent)">(a &amp; b) &lt;&lt; 1 = 100 ← carry moves left</text>' +
		'<path d="M 150 64 L 150 82" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowSTI)"/>' +
		// round 2: a=001 b=100, no column has both bits set
		'<g text-anchor="middle">' +
		'<text x="30" y="108">a</text>' +
		'<rect x="46" y="88" width="30" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="80" y="88" width="30" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="114" y="88" width="30" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="61" y="108">0</text><text x="95" y="108">0</text><text x="129" y="108">1</text>' +
		'<text x="170" y="108">b</text>' +
		'<rect x="186" y="88" width="30" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="220" y="88" width="30" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="254" y="88" width="30" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="201" y="108">1</text><text x="235" y="108">0</text><text x="269" y="108">0</text>' +
		'</g>' +
		'<text x="310" y="102">a ⊕ b = 101</text>' +
		'<text x="310" y="120" class="lbl">(a &amp; b) &lt;&lt; 1 = 000 — no column has two 1s</text>' +
		'<path d="M 150 124 L 150 142" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowSTIok)"/>' +
		// done
		'<text x="46" y="164" style="fill:var(--ok)">b = 0 → done · a = 101₂ = 5</text>' +
		'<text x="20" y="194" class="lbl">the carry gains a trailing zero every round (it was shifted left) — it must reach 0</text>' +
		'<defs>' +
		'<marker id="dgArrowSTI" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowSTIok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'sum-of-two-integers',
		title: 'Sum of Two Integers',
		nav: 'Sum of Two Integers',
		difficulty: 'Medium',
		category: 'Bit Manipulation',
		task: 'Implement getSum — make all 6 tests pass.',

		prose: [
			'<h2>Sum of Two Integers</h2>' +
			'<p>Given two integers <code>a</code> and <code>b</code>, return their sum ' +
			'<em>without using the <code>+</code> or <code>-</code> operators</em>.</p>' +
			'<ul><li>Allowed: bitwise operators (<code>&amp;</code>, <code>|</code>, ' +
			'<code>^</code>, <code>&lt;&lt;</code>, <code>&gt;&gt;</code>), comparisons, loops.</li>' +
			'<li>Inputs may be negative — two&rsquo;s complement is on your side.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'getSum(1, 2)    →  3\ngetSum(2, 3)    →  5\ngetSum(-2, 3)   →  1\ngetSum(-1, -1)  →  -2', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Split binary addition the way a hardware half-adder does: ' +
			'<code>a ^ b</code> adds each bit column while <em>ignoring</em> carries ' +
			'(XOR is addition mod 2), and <code>(a &amp; b) &lt;&lt; 1</code> is exactly the ' +
			'carries — a column carries when both bits are 1, and the carry lands one column ' +
			'to the left. Then <code>a + b = (a ^ b) + ((a &amp; b) &lt;&lt; 1)</code>: same ' +
			'problem, new operands. Loop until the carry is zero:</p>' +
			DIAGRAM +
			'<p>Each round&rsquo;s carry ends in one more zero than the last, so the loop ' +
			'always terminates — at most one round per bit of the word.</p>',
		],

		starter: [
			'package main',
			'',
			'// getSum returns a + b computed WITHOUT the + or - operators.',
			'// Allowed: bitwise ops (&, |, ^, <<, >>), comparisons, loops.',
			'func getSum(a, b int) int {',
			'	// your code here',
			'	return -1 << 62 // sentinel: any real answer differs from this',
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
			'		a, b int',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{1, 2, 3},',
			'		// The classic trace: two carry rounds.',
			'		{2, 3, 5},',
			'		// Mixed signs: the loop must ride the carry through the sign bit.',
			'		{-2, 3, 1},',
			'		// Both negative: two\'s complement carries do the right thing.',
			'		{-1, -1, -2},',
			'		// Adding zero: the carry loop must not run at all.',
			'		{5, 0, 5},',
			'		// Large values: long carry chains resolve correctly.',
			'		{123456789, 987654321, 1111111110},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("a=%d, b=%d", c.a, c.b),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := getSum(c.a, c.b)',
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
			'// getSum adds a and b using only bitwise operations — a software',
			'// half-adder iterated until the carry dies out.',
			'//',
			'// One round of binary addition decomposes into two independent parts:',
			'//   a ^ b        — per-column sum with carries ignored (XOR is',
			'//                  addition mod 2: 1+1 = 0 carry 1, and XOR keeps',
			'//                  the 0 while discarding the carry)',
			'//   (a & b) << 1 — the discarded carries: a column carries exactly',
			'//                  when BOTH bits are 1, and the carry belongs one',
			'//                  column to the LEFT, hence the shift',
			'// So a+b == (a^b) + ((a&b)<<1): the same addition, restated with a',
			'// new pair of operands. Iterating replays that identity until the',
			'// carry operand is zero, at which point a holds the true sum.',
			'//',
			'// Termination: each round\'s carry was just shifted left, so it has',
			'// at least one more trailing zero than the round before. After at',
			'// most one round per bit of the word the carry shifts out entirely',
			'// (Go\'s signed left shift wraps rather than trapping, so the sign',
			'// bit is safe to carry through).',
			'//',
			'// Negatives cost nothing: int is two\'s complement, where this',
			'// bit-level algorithm IS what the hardware adder does — the sign bit',
			'// is just another column. Subtraction then falls out for free:',
			'// a - b = a + (-b) = getSum(a, getSum(^b, 1)), since two\'s-complement',
			'// negation is "flip the bits, add one".',
			'func getSum(a, b int) int {',
			'	for b != 0 {',
			'		carry := (a & b) << 1 // columns where both bits are 1, moved left',
			'		a = a ^ b             // per-column sum, carries dropped',
			'		b = carry             // feed the carries into the next round',
			'	}',
			'	return a',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What is addition, without +?</h3>' +
			'<p>Grade-school column addition does two things per column: write the sum bit, ' +
			'carry the overflow left. Hardware calls one column of that a <em>half-adder</em>, ' +
			'and both halves have exact bitwise names:</p>' +
			'<ul>' +
			'<li><strong>Sum sans carry:</strong> <code>a ^ b</code>. Per column: 0+0=0, ' +
			'0+1=1, 1+1=0-with-carry — XOR produces precisely the written bit.</li>' +
			'<li><strong>The carries:</strong> <code>(a &amp; b) &lt;&lt; 1</code>. A column ' +
			'overflows exactly when both bits are 1 (<code>&amp;</code>), and the overflow ' +
			'lands one column left (<code>&lt;&lt; 1</code>).</li>' +
			'</ul>' +
			'<p>Adding those two pieces would reassemble <code>a + b</code> — but that is ' +
			'itself an addition. No matter: it is a <em>smaller</em> one, and iterating the ' +
			'split drives the carry to zero:</p>',
			{ code: 'for b != 0 {\n\tcarry := (a & b) << 1 // both-bits-set columns, moved left\n\ta = a ^ b             // per-column sum, carries dropped\n\tb = carry             // next round adds the carries back in\n}\nreturn a\n\n// 2 + 3:\n// round 1: a=010, b=011 → a^b = 001, (a&b)<<1 = 100\n// round 2: a=001, b=100 → a^b = 101, (a&b)<<1 = 000\n// b == 0  → answer 101₂ = 5' },
			'<p>The load-bearing details:</p>' +
			'<ul>' +
			'<li><strong>Why it terminates.</strong> The new carry was just shifted left, so ' +
			'every round it gains at least one trailing zero. After at most one round per bit ' +
			'of the word (64 for Go&rsquo;s <code>int</code>) the carry has shifted out ' +
			'entirely. Go&rsquo;s signed shifts wrap silently rather than trapping, so the loop ' +
			'is safe even while carries ripple through the sign bit.</li>' +
			'<li><strong>Negatives are free.</strong> Two&rsquo;s complement was ' +
			'<em>designed</em> so the adder circuit needs no sign logic — the sign bit is just ' +
			'the top column. <code>-2 + 3</code> works because the carry ripples through the ' +
			'leading 1s of −2&rsquo;s representation and falls off the top.</li>' +
			'<li><strong>Subtraction falls out.</strong> Negation is <code>^b</code> then add ' +
			'one (both expressible here), so <code>a − b = getSum(a, getSum(^b, 1))</code> — ' +
			'the constraint bans <code>-</code>, not the concept.</li>' +
			'</ul>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Half-adder decomposition — XOR is addition without carry</strong> — ' +
			'the trigger is any &ldquo;arithmetic without arithmetic operators&rdquo; problem, ' +
			'or any setting where addition&rsquo;s carry chain is the enemy and XOR&rsquo;s ' +
			'carry-free, per-bit independence is the point. Cost: O(w) rounds worst case ' +
			'(one per bit), O(1) space. This is hardware&rsquo;s ripple-carry adder replayed ' +
			'in software — the same XOR/AND split every ALU is built from. The carry-free ' +
			'view of XOR is exactly why Single Number and Missing Number can &ldquo;add up&rdquo; ' +
			'values and have pairs cancel without overflow, and it powers real systems: ' +
			'checksums and RAID parity accumulate with XOR because bit columns never ' +
			'interact, and constant-time crypto code leans on XOR/AND because, unlike ' +
			'<code>+</code>, they have no data-dependent carry propagation to leak timing.</p>',
		],
		complexity: { time: 'O(w) — one round per bit of the word, worst case', space: 'O(1)' },
	});
})();
