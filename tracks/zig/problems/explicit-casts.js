/* Explicit Casts — Numbers & Layout (Medium). Zig has no implicit lossy
 * conversions: widening coerces silently because it cannot lose a value,
 * narrowing demands @intCast (safety-checked) or @truncate (explicitly
 * keeps the low bits). Go requires syntax for every conversion but the
 * syntax lies — int8(300) compiles and silently truncates. The learner
 * implements the checked cast, the deliberate truncation, and Zig's
 * implicit-coercion rule itself.
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// A 16-bit value approaching a u8 destination can take two doors:
	// @truncate keeps the low 8 bits no questions asked; @intCast runs a
	// range check first and panics the value that does not fit. Marker id
	// namespaced (dgArrowZGEC) — SVG ids share one page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="a 16-bit value narrowing to u8 via two doors: truncate keeps the low 8 bits unconditionally, intCast range-checks the whole value first">' +
		'<text x="20" y="24" class="lbl">u16 0x1234 → u8: two doors, two meanings</text>' +
		// the 16-bit source: high byte (dropped) + low byte (kept)
		'<rect x="40" y="44" width="100" height="36" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="90" y="67" text-anchor="middle">0x12</text>' +
		'<rect x="140" y="44" width="100" height="36" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="190" y="67" text-anchor="middle">0x34</text>' +
		'<text x="90" y="96" text-anchor="middle" class="lbl">high 8 bits</text>' +
		'<text x="190" y="96" text-anchor="middle" class="lbl">low 8 bits</text>' +
		// door 1: @intCast — the whole value meets a range gate
		'<path d="M 250 62 L 330 62" fill="none" stroke="var(--warn)" stroke-width="2" marker-end="url(#dgArrowZGEC)"/>' +
		'<rect x="338" y="44" width="130" height="36" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="403" y="67" text-anchor="middle">fits in [0,255]?</text>' +
		'<text x="403" y="96" text-anchor="middle" class="lbl" style="fill:var(--warn)">@intCast: 0x1234 &gt; 255 → panic</text>' +
		// door 2: @truncate — only the low byte flows through
		'<path d="M 190 104 C 190 152 300 152 380 152" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#dgArrowZGEC)"/>' +
		'<rect x="388" y="134" width="120" height="36" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="448" y="157" text-anchor="middle">u8 = 0x34</text>' +
		'<text x="288" y="140" text-anchor="middle" class="lbl">@truncate: keep low bits, by declaration</text>' +
		'<text x="20" y="206" class="lbl">Go\'s uint8(x) is the truncate door wearing the checked door\'s syntax — no gate, no declaration</text>' +
		'<defs><marker id="dgArrowZGEC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'explicit-casts',
		title: 'Explicit Casts',
		nav: 'explicit casts',
		difficulty: 'Medium',
		category: 'Numbers & Layout',
		task: 'Implement IntCast (checked narrowing that reports instead of lying), Truncate (deliberate low-bits keep), and CanCoerce (Zig\'s implicit-widening rule).',

		prose: [
			'<h2>Explicit Casts</h2>' +
			'<p>A metrics dashboard shows a service handling 44 requests per ' +
			'second, forever, under any load. The counter upstream is fine — the ' +
			'bug is one line that copies it into a smaller field: in Go, ' +
			'<code>uint8(300)</code> compiles without a murmur and produces 44. ' +
			'The conversion <em>looks</em> explicit — you did write ' +
			'<code>uint8(...)</code> — but the syntax only marks that a ' +
			'conversion happens, not what happens to values that don\'t fit: ' +
			'they are silently truncated. Zig splits this one operation into ' +
			'three, each meaning something different:</p>',
			{ lang: 'txt', code: 'const big: u16 = 300;\n\nconst a: u16 = @as(u8, 44);     // widening u8→u16: implicit, can never lose\nconst b: u8  = big;             // compile error: cannot coerce u16 to u8\nconst c: u8  = @intCast(big);   // checked: PANICS — 300 does not fit in u8\nconst d: u8  = @truncate(big);  // 44 — keep the low 8 bits, ON PURPOSE' },
			'<ul>' +
			'<li><strong>Widening is free.</strong> <code>u8 → u16</code> coerces ' +
			'implicitly because every u8 value fits in a u16 — no information can ' +
			'be lost, so no ceremony is required. Zig\'s rule is exactly that: ' +
			'implicit iff <em>every</em> value of the source type fits the ' +
			'target.</li>' +
			'<li><strong><code>@intCast</code> is a claim with a referee.</strong> ' +
			'"This value fits." Safe builds check, and a value out of range is a ' +
			'panic at the cast — the metrics bug above dies at the exact line ' +
			'that lied, not later on a dashboard.</li>' +
			'<li><strong><code>@truncate</code> is honest lossiness.</strong> Keep ' +
			'the low bits of the two\'s-complement pattern, discard the rest — ' +
			'what hash mixing and byte extraction actually want. The name in the ' +
			'source says data is being dropped.</li>' +
			'<li><strong>Signedness is part of fitting.</strong> ' +
			'<code>u8 → i16</code> widens implicitly (255 fits in i16), but ' +
			'<code>u8 → i8</code> doesn\'t (255 doesn\'t), and ' +
			'<code>i8 → u16</code> never does — no unsigned type holds −1, ' +
			'however wide.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Model bit widths as data. Implement <code>IntCast(v, bits, ' +
			'signed)</code> — checked narrowing that returns <code>(v, true)</code> ' +
			'when v fits the target range ([0,&nbsp;2<sup>bits</sup>−1] unsigned, ' +
			'[−2<sup>bits−1</sup>,&nbsp;2<sup>bits−1</sup>−1] signed) and ' +
			'<code>(0, false)</code> when it doesn\'t (the condition safe Zig ' +
			'turns into a panic). Implement <code>Truncate(v, bits)</code> — keep ' +
			'the low <code>bits</code> of the two\'s-complement pattern, result ' +
			'read as unsigned: <code>((v mod 2<sup>bits</sup>) + 2<sup>bits</sup>) ' +
			'mod 2<sup>bits</sup></code>. And implement <code>CanCoerce(fromBits, ' +
			'toBits, fromSigned, toSigned)</code> — Zig\'s implicit-coercion rule ' +
			'itself: allowed iff every source value fits the target.</p>',
		],

		starter: [
			'package main',
			'',
			'// IntCast models Zig\'s @intCast: narrow v into an integer type of',
			'// the given width and signedness, but CHECK first. It returns',
			'// (v, true) when v is inside the target range:',
			'//',
			'//	unsigned: [0, 2^bits - 1]',
			'//	signed:   [-2^(bits-1), 2^(bits-1) - 1]',
			'//',
			'// and (0, false) when it is not — the condition a safe Zig build',
			'// turns into "panic: integer cast truncated bits". On success the',
			'// value passes through unchanged: a checked cast never alters what',
			'// it lets through. bits is 1..32.',
			'func IntCast(v int, bits int, signed bool) (int, bool) {',
			'	// your code here',
			'	return 0, false',
			'}',
			'',
			'// Truncate models Zig\'s @truncate: keep the low `bits` bits of v\'s',
			'// two\'s-complement pattern and read them as an UNSIGNED number —',
			'// ((v mod 2^bits) + 2^bits) mod 2^bits, with a mathematical mod.',
			'// Truncate(0x1234, 8) = 0x34; Truncate(-1, 8) = 0xff (all-ones is',
			'// -1\'s bit pattern at every width). Beware Go\'s % keeping the',
			'// dividend\'s sign on negative input. bits is 1..32.',
			'func Truncate(v, bits int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// CanCoerce is Zig\'s implicit-coercion rule for integers: coercion',
			'// is allowed iff EVERY value of the source type fits in the target',
			'// type — no run-time value can make it lossy.',
			'//',
			'//	same signedness:    toBits >= fromBits',
			'//	unsigned -> signed: toBits >  fromBits  (u8 max 255 needs i9 or wider)',
			'//	signed -> unsigned: never              (no unsigned type holds -1)',
			'func CanCoerce(fromBits, toBits int, fromSigned, toSigned bool) bool {',
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
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// (value, ok) rendered the way the table shows it.',
			'	pair := func(v int, ok bool) string { return fmt.Sprintf("%d %v", v, ok) }',
			'	hx := func(v int) string { return fmt.Sprintf("0x%x", v) }',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"IntCast 300 -> u8: does not fit [0,255] — Zig panics here; we report (0,false). Go\'s uint8(300)=44 reports nothing",',
			'			"0 false",',
			'			func() string { v, ok := IntCast(300, 8, false); return pair(v, ok) }},',
			'		{"IntCast 200 -> u8: fits, passes through unchanged — a checked cast never alters what it admits",',
			'			"200 true",',
			'			func() string { v, ok := IntCast(200, 8, false); return pair(v, ok) }},',
			'		{"IntCast -1 -> u8: no unsigned range contains -1, whatever the width",',
			'			"0 false",',
			'			func() string { v, ok := IntCast(-1, 8, false); return pair(v, ok) }},',
			'		{"IntCast -1 -> i8: same value, signed target — fits [-128,127] fine. Signedness is part of fitting",',
			'			"-1 true",',
			'			func() string { v, ok := IntCast(-1, 8, true); return pair(v, ok) }},',
			'		{"IntCast 128 -> i8: one past the signed ceiling 127 — the asymmetric range matters",',
			'			"0 false",',
			'			func() string { v, ok := IntCast(128, 8, true); return pair(v, ok) }},',
			'		{"Truncate 0x1234 to 8 bits: the high byte drops, the low byte survives — deliberate lossiness",',
			'			"0x34",',
			'			func() string { return hx(Truncate(0x1234, 8)) }},',
			'		{"Truncate -1 to 8 bits: -1\'s two\'s-complement pattern is all ones, so the low byte reads 0xff",',
			'			"0xff",',
			'			func() string { return hx(Truncate(-1, 8)) }},',
			'		{"Truncate -300 to 8 bits: -300 is 0xfed4 in 16-bit two\'s complement; the low byte is 0xd4 — naive Go % would go negative",',
			'			"0xd4",',
			'			func() string { return hx(Truncate(-300, 8)) }},',
			'		{"CanCoerce u8 -> u16: widening same-signedness — every u8 fits, implicit and free",',
			'			"true",',
			'			func() string { return fmt.Sprint(CanCoerce(8, 16, false, false)) }},',
			'		{"CanCoerce u16 -> u8: narrowing — some u16 values do not fit, so Zig demands @intCast or @truncate",',
			'			"false",',
			'			func() string { return fmt.Sprint(CanCoerce(16, 8, false, false)) }},',
			'		{"CanCoerce u8 -> i16: unsigned into a STRICTLY wider signed type — 255 fits in [-32768,32767]",',
			'			"true",',
			'			func() string { return fmt.Sprint(CanCoerce(8, 16, false, true)) }},',
			'		{"CanCoerce u8 -> i8: same width, sign flip — 255 does not fit in [-128,127]. Equal width is not enough",',
			'			"false",',
			'			func() string { return fmt.Sprint(CanCoerce(8, 8, false, true)) }},',
			'		{"CanCoerce i8 -> u16: signed into unsigned is NEVER implicit — -1 fits in no unsigned type, however wide",',
			'			"false",',
			'			func() string { return fmt.Sprint(CanCoerce(8, 16, true, false)) }},',
			'		{"CanCoerce i8 -> i16: signed widening — both bounds grow outward, always safe",',
			'			"true",',
			'			func() string { return fmt.Sprint(CanCoerce(8, 16, true, true)) }},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			got := c.got()',
			'			r["pass"] = got == c.want',
			'			r["got"] = got',
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
			'// IntCast is the checked door: compute the target\'s range from its',
			'// width and signedness, admit the value iff it fits. Shifts (not',
			'// floating-point pow) keep everything in exact integer arithmetic —',
			'// with bits <= 32 the bounds fit comfortably in an int.',
			'func IntCast(v int, bits int, signed bool) (int, bool) {',
			'	lo := 0',
			'	hi := 1<<bits - 1',
			'	if signed {',
			'		// The signed range is asymmetric: two\'s complement gives the',
			'		// negatives one extra value (the sign pattern 100...0 has no',
			'		// positive mirror). Hence -2^(bits-1) .. 2^(bits-1)-1.',
			'		lo = -(1 << (bits - 1))',
			'		hi = 1<<(bits-1) - 1',
			'	}',
			'	if v < lo || v > hi {',
			'		// The (0,false) arm is where safe Zig panics. Returning a',
			'		// zero value alongside false keeps the failure unmistakable:',
			'		// callers can never half-use a rejected cast.',
			'		return 0, false',
			'	}',
			'	// Fits: the value passes through untouched. A checked cast is a',
			'	// gate, not a transformation.',
			'	return v, true',
			'}',
			'',
			'// Truncate is the unconditional door: reduce v modulo 2^bits and',
			'// read the surviving pattern as unsigned. The double-mod idiom',
			'// converts Go\'s truncated % (which keeps the dividend\'s sign:',
			'// -300 % 256 == -44) into the mathematical mod the bit pattern',
			'// demands: -44 + 256 = 212 = 0xd4 — exactly the low byte of',
			'// -300\'s two\'s-complement representation at any machine width.',
			'// That equivalence (mathematical mod == low-bits reinterpretation)',
			'// is a big part of why two\'s complement won: add, subtract, and',
			'// truncate all agree without caring about sign.',
			'func Truncate(v, bits int) int {',
			'	m := 1 << bits',
			'	return (v%m + m) % m',
			'}',
			'',
			'// CanCoerce encodes Zig\'s rule: implicit conversion exists iff the',
			'// source RANGE is a subset of the target RANGE — a property of the',
			'// types alone, decidable at compile time, never of the value.',
			'func CanCoerce(fromBits, toBits int, fromSigned, toSigned bool) bool {',
			'	if fromSigned && !toSigned {',
			'		// Every signed type contains -1; no unsigned type does. The',
			'		// subset test fails before width even enters the picture.',
			'		return false',
			'	}',
			'	if !fromSigned && toSigned {',
			'		// Unsigned max is 2^from - 1; signed max is 2^(to-1) - 1.',
			'		// Subset requires 2^from - 1 <= 2^(to-1) - 1, i.e. to > from:',
			'		// the sign bit costs the target one bit of magnitude, so',
			'		// equal width (u8 -> i8) is not enough — 255 > 127.',
			'		return toBits > fromBits',
			'	}',
			'	// Same signedness: both bounds grow monotonically with width, so',
			'	// subset is exactly "at least as wide". Equal width is the',
			'	// identity coercion.',
			'	return toBits >= fromBits',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Three operations wearing one syntax</h3>' +
			'<p>Go\'s <code>T(v)</code> conversion syntax covers three genuinely ' +
			'different operations: lossless widening, checked narrowing (which Go ' +
			'simply doesn\'t offer — you write the range check by hand or you ' +
			'don\'t get one), and bit truncation. Zig gives each its own ' +
			'spelling — nothing, <code>@intCast</code>, <code>@truncate</code> — ' +
			'so a reviewer can tell from the call site which contract is being ' +
			'claimed. That reviewability is the practical payoff: ' +
			'<code>@truncate</code> in a hash function reads as intent, ' +
			'<code>@truncate</code> on a length field reads as a red flag, and in ' +
			'Go both are the same <code>uint8(x)</code>.</p>' +
			'<h3>The bug class is real and expensive</h3>' +
			'<p>Ariane 5 flight 501 was destroyed 37 seconds after launch when a ' +
			'64-bit float describing horizontal velocity was converted to a ' +
			'16-bit signed integer and overflowed — a value that fit fine on the ' +
			'slower Ariane 4 trajectory the code was written for. Closer to ' +
			'everyday work: truncated content-lengths, port numbers stuffed into ' +
			'16-bit fields, and database IDs crossing 2<sup>31</sup> have each ' +
			'produced famous outages. The pattern is always the shape of the ' +
			'dashboard bug in the prose — the conversion was written when values ' +
			'were small, and nothing re-checked the claim as the system grew. ' +
			'<code>@intCast</code> is precisely that re-check, executed on every ' +
			'value in safe builds, compiled out in ReleaseFast once the claim ' +
			'has survived testing.</p>' +
			'<h3>Why the coercion rule needs no run-time information</h3>' +
			'<p>Notice what <code>CanCoerce</code> takes: widths and signedness ' +
			'only — never a value. Zig\'s implicit-coercion rule is a ' +
			'<em>subset test on ranges</em>, decidable entirely at compile time, ' +
			'which is what makes it safe to apply silently. The moment a ' +
			'conversion\'s safety depends on the run-time value, Zig pushes the ' +
			'decision to you: assert it fits (<code>@intCast</code>) or declare ' +
			'the loss (<code>@truncate</code>). The same subset reasoning ' +
			'explains the one surprise in the table — <code>u8 → i8</code> fails ' +
			'at <em>equal</em> width because the sign bit costs a magnitude bit, ' +
			'a fact you computed yourself from both ranges. Rust landed on the ' +
			'same split with <code>TryFrom</code> (checked) versus ' +
			'<code>as</code> (truncating), and C++20 added ' +
			'<code>std::in_range</code> for the check — the industry converging ' +
			'on Zig\'s distinction, if not its insistence.</p>',
		],
		complexity: { time: 'O(1) — range bounds from shifts, one or two compares per call', space: 'O(1)' },
	});
})();
