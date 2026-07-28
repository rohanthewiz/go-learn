/* Overflow Operators — Numbers & Layout (Medium). Zig refuses to pick one
 * overflow behavior for you: plain `+` is a checked operation that panics
 * in safe builds, `+%` wraps in two's complement, `+|` saturates at the
 * type's bounds, and @addWithOverflow hands back the wrapped value plus a
 * carry bit. Go silently wraps everywhere. The learner implements all
 * three semantics for u8 and i8 values carried in a Go int, including the
 * two's-complement fold for signed wrap.
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// Two mental models side by side: wrapping arithmetic is a circle
	// (255 rolls over to 0), saturating arithmetic is a line with a wall
	// at each end. Marker id namespaced (dgArrowZGIO) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 210" width="540" height="210" role="img" aria-label="wrapping addition as a circle where 255 rolls over to 0, versus saturating addition as a number line with a wall at 255">' +
		'<text x="20" y="24" class="lbl">+% thinks in circles; +| thinks in walls</text>' +
		// left: the wrap circle (an odometer)
		'<circle cx="130" cy="120" r="56" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="130" y="52" text-anchor="middle" class="lbl">0</text>' +
		'<text x="76" y="90" text-anchor="middle" class="lbl">255</text>' +
		'<text x="188" y="92" text-anchor="middle" class="lbl">4</text>' +
		// 250+10 travels clockwise PAST the 255|0 seam and lands on 4
		'<path d="M 96 74 A 56 56 0 0 1 168 84" fill="none" stroke="var(--warn)" stroke-width="2" marker-end="url(#dgArrowZGIO)"/>' +
		'<text x="130" y="126" text-anchor="middle" class="lbl">250 +% 10</text>' +
		'<text x="130" y="144" text-anchor="middle" class="lbl" style="fill:var(--warn)">crosses the seam → 4</text>' +
		// right: the saturation wall
		'<line x1="300" y1="120" x2="480" y2="120" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="480" y="92" width="8" height="56" fill="var(--warn)"/>' +
		'<text x="484" y="84" text-anchor="middle" class="lbl">255</text>' +
		'<text x="300" y="140" class="lbl">250</text>' +
		'<path d="M 340 108 L 472 108" fill="none" stroke="var(--warn)" stroke-width="2" marker-end="url(#dgArrowZGIO)"/>' +
		'<text x="400" y="160" text-anchor="middle" class="lbl" style="fill:var(--warn)">250 +| 10 hits the wall → 255</text>' +
		'<text x="20" y="196" class="lbl">plain + in safe Zig takes a third path: it refuses to answer at all (panic)</text>' +
		'<defs><marker id="dgArrowZGIO" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'integer-overflow-ops',
		title: 'Overflow Operators',
		nav: 'overflow operators',
		difficulty: 'Medium',
		category: 'Numbers & Layout',
		task: 'Implement Zig\'s three overflow semantics for u8 and i8 carried in Go ints: checked (AddU8/AddI8 with a flag), wrapping (+%), and saturating (+|).',

		prose: [
			'<h2>Overflow Operators</h2>' +
			'<p>A VPN gateway starts refusing every packet from one peer, exactly ' +
			'once a day. The replay-protection window compares packet counters — ' +
			'and the counter is a small integer that quietly wrapped past its ' +
			'maximum back to zero, so every legitimate packet now looks like an ' +
			'ancient replay. Nothing crashed. Nothing logged. The number just ' +
			'went around the circle, because in most languages that is what ' +
			'numbers silently do. Zig\'s position is that overflow is too ' +
			'important to have one default: <em>you</em> say what should happen, ' +
			'at every operation:</p>',
			{ lang: 'txt', code: 'var a: u8 = 250;\nconst b: u8 = 10;\n\nconst s1 = a + b;                  // safe build: panic: integer overflow\nconst s2 = a +% b;                 // 4    — wrapping add (two\'s complement)\nconst s3 = a +| b;                 // 255  — saturating add (clamps at max)\nconst s4 = @addWithOverflow(a, b); // .{ 4, 1 } — wrapped value + overflow bit' },
			'<ul>' +
			'<li><strong>Plain <code>+</code> is a claim:</strong> "this cannot ' +
			'overflow." In Debug and ReleaseSafe builds Zig checks the claim and ' +
			'panics when it is false — overflow is illegal behavior, caught. The ' +
			'packet-counter bug above would have been a loud crash on day one ' +
			'instead of a silent outage on day 365.</li>' +
			'<li><strong><code>+%</code> is wrapping:</strong> two\'s-complement ' +
			'modular arithmetic, the circle. This is what hash functions, PRNGs, ' +
			'and checksums <em>want</em> — wraparound is the algorithm there, not ' +
			'a bug — and the operator documents that intent at the call site.</li>' +
			'<li><strong><code>+|</code> is saturating:</strong> the result pins ' +
			'at the type\'s max (or min) instead of wrapping. Audio samples, ' +
			'brightness values, and progress counters want a wall, not a circle: ' +
			'251 + 10 as "full brightness" beats 5 as "suddenly dark".</li>' +
			'<li><strong><code>@addWithOverflow</code> returns both:</strong> the ' +
			'wrapped result <em>and</em> a did-it-overflow bit — the raw material ' +
			'the other three are built from, and what you use to implement ' +
			'multi-word arithmetic.</li>' +
			'</ul>' +
			'<p>Go made the opposite call: <code>uint8(250) + 10</code> is ' +
			'<code>4</code>, always, silently — well-defined (unlike C, where ' +
			'signed overflow is undefined behavior) but invisible. That is a ' +
			'design decision too, just an implicit one you cannot see in the ' +
			'source. Zig makes every arithmetic site spell out which of the ' +
			'three behaviors it means.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement all three semantics for 8-bit values carried in Go ' +
			'<code>int</code>s. Unsigned trio: <code>AddU8</code> (the ' +
			'<code>@addWithOverflow</code> shape — wrapped result mod 256 plus an ' +
			'overflowed flag; the flag is exactly what safe Zig turns into a ' +
			'panic), <code>WrapAddU8</code> (<code>+%</code>), and ' +
			'<code>SatAddU8</code> (<code>+|</code>, clamps to 255). Signed trio ' +
			'on [−128,&nbsp;127]: <code>AddI8</code>, <code>WrapAddI8</code> ' +
			'(fold the true sum through two\'s complement: ' +
			'<code>((sum+128) mod 256) − 128</code>, with a mathematical mod that ' +
			'never goes negative), and <code>SatAddI8</code> (clamps to −128 or ' +
			'127). Inputs are always in range; only <em>results</em> can ' +
			'overflow.</p>',
		],

		starter: [
			'package main',
			'',
			'// AddU8 adds two u8 values (a, b in [0,255]) the @addWithOverflow',
			'// way: it returns the wrapped 8-bit result — (a+b) mod 256 — plus an',
			'// overflowed flag, true iff the true sum exceeded 255. The flag is',
			'// exactly the condition a safe Zig build turns into a panic when the',
			'// code says plain `+`. Touching 255 exactly is NOT overflow.',
			'func AddU8(a, b int) (int, bool) {',
			'	// your code here',
			'	return 0, false',
			'}',
			'',
			'// WrapAddU8 is Zig\'s a +% b on u8: modular arithmetic on the circle',
			'// of 256 values. 250 +% 10 = 4.',
			'func WrapAddU8(a, b int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// SatAddU8 is Zig\'s a +| b on u8: the sum clamps at the wall.',
			'// 250 +| 10 = 255. (Unsigned addition cannot underflow, so only the',
			'// top needs a wall here.)',
			'func SatAddU8(a, b int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// AddI8 is @addWithOverflow on i8 (a, b in [-128,127]): the wrapped',
			'// two\'s-complement result plus an overflowed flag, true iff the true',
			'// sum left [-128,127]. 127+1 reports (-128, true).',
			'func AddI8(a, b int) (int, bool) {',
			'	// your code here',
			'	return 0, false',
			'}',
			'',
			'// WrapAddI8 is a +% b on i8: fold the true sum back into [-128,127]',
			'// via two\'s complement — ((sum+128) mod 256) - 128, where mod is the',
			'// MATHEMATICAL mod (never negative). Beware: Go\'s % operator keeps',
			'// the sign of its dividend, so (-129+128)%256 is -1, not 255 — you',
			'// must correct for that. 127 +% 1 = -128; -128 +% -1 = 127.',
			'func WrapAddI8(a, b int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// SatAddI8 is a +| b on i8: clamps to 127 above and -128 below.',
			'// Signed saturation needs walls at BOTH ends.',
			'func SatAddI8(a, b int) int {',
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
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// Formats a (value, overflowed) pair the way the table displays it.',
			'	pair := func(v int, ov bool) string { return fmt.Sprintf("%d %v", v, ov) }',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"250+10 where plain + would PANIC in safe Zig: AddU8 reports the wrapped 4 and raises the flag",',
			'			"4 true",',
			'			func() string { v, ov := AddU8(250, 10); return pair(v, ov) }},',
			'		{"+% wrapping: 250+10 crosses the 255|0 seam and lands on 4 — the odometer rolls",',
			'			"4",',
			'			func() string { return fmt.Sprint(WrapAddU8(250, 10)) }},',
			'		{"+| saturating: 250+10 hits the wall and pins at 255 — full is full",',
			'			"255",',
			'			func() string { return fmt.Sprint(SatAddU8(250, 10)) }},',
			'		{"signed 127+1: the two\'s-complement wrap lands at -128, and the flag mirrors safe Zig\'s panic",',
			'			"-128 true",',
			'			func() string { v, ov := AddI8(127, 1); return pair(v, ov) }},',
			'		{"signed +%: 127 +% 1 = -128 — the sign flip every C programmer has debugged at 2am",',
			'			"-128",',
			'			func() string { return fmt.Sprint(WrapAddI8(127, 1)) }},',
			'		{"signed +|: 127 +| 1 stays 127 — saturation never changes sign",',
			'			"127",',
			'			func() string { return fmt.Sprint(SatAddI8(127, 1)) }},',
			'		{"saturating floor: -128 +| -1 pins at -128 — the bottom wall, not a wrap to +127",',
			'			"-128",',
			'			func() string { return fmt.Sprint(SatAddI8(-128, -1)) }},',
			'		{"wrapping floor: -128 +% -1 goes all the way around to +127 — where Go\'s % operator alone gets the fold wrong",',
			'			"127",',
			'			func() string { return fmt.Sprint(WrapAddI8(-128, -1)) }},',
			'		{"no overflow: 100+50 passes through checked, wrapping, and saturating identically",',
			'			"150 false | 150 | 150",',
			'			func() string {',
			'				v, ov := AddU8(100, 50)',
			'				return fmt.Sprintf("%s | %d | %d", pair(v, ov), WrapAddU8(100, 50), SatAddU8(100, 50))',
			'			}},',
			'		{"exact ceiling: 200+55 = 255 touches the max without exceeding it — the flag must stay false",',
			'			"255 false",',
			'			func() string { v, ov := AddU8(200, 55); return pair(v, ov) }},',
			'		{"exact floor: -100 + -28 = -128 touches the min without exceeding it — not an overflow either",',
			'			"-128 false",',
			'			func() string { v, ov := AddI8(-100, -28); return pair(v, ov) }},',
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
			'// AddU8 is the @addWithOverflow shape: wrapped result + carry-out.',
			'// The other unsigned operators are one-liners over the same true',
			'// sum, which is why Zig exposes this builtin — checked, wrapping,',
			'// and saturating arithmetic are all views of the same addition.',
			'func AddU8(a, b int) (int, bool) {',
			'	sum := a + b',
			'	// Inputs are in [0,255], so sum is in [0,510]: a plain % is safe',
			'	// (never negative) and the overflow test is a single compare.',
			'	// Note the strict >: landing exactly ON 255 is a legal u8 value,',
			'	// not an overflow — the flag models "did a bit carry out", and',
			'	// 255 needs no ninth bit.',
			'	return sum % 256, sum > 255',
			'}',
			'',
			'// WrapAddU8 is +% — keep the low 8 bits, drop the carry. This IS',
			'// what Go\'s own uint8 addition does; the point of the exercise is',
			'// that Zig makes you write the % (or the operator) where Go hides it.',
			'func WrapAddU8(a, b int) int {',
			'	return (a + b) % 256',
			'}',
			'',
			'// SatAddU8 is +| — a wall instead of a circle. Only the top needs',
			'// clamping: two non-negative inputs cannot sum below zero.',
			'func SatAddU8(a, b int) int {',
			'	sum := a + b',
			'	if sum > 255 {',
			'		return 255',
			'	}',
			'	return sum',
			'}',
			'',
			'// AddI8 is @addWithOverflow on i8: wrapped two\'s-complement result',
			'// plus the did-it-leave-the-range flag. The wrap is delegated to',
			'// WrapAddI8 so the fold logic lives in exactly one place.',
			'func AddI8(a, b int) (int, bool) {',
			'	sum := a + b',
			'	return WrapAddI8(a, b), sum < -128 || sum > 127',
			'}',
			'',
			'// WrapAddI8 is +% on i8. The fold ((sum+128) mod 256) - 128 is the',
			'// standard trick for reducing into a SIGNED range: shift the window',
			'// [-128,127] up to [0,255], reduce mod 256, shift back.',
			'//',
			'//	sum:      -129            128',
			'//	+128:       -1            256',
			'//	mod 256:   255              0     <- needs a mathematical mod',
			'//	-128:      127           -128',
			'//',
			'// Go\'s % is truncated division (the result keeps the dividend\'s',
			'// sign), so (-1)%256 is -1, not 255 — the "+256 then % again" idiom',
			'// converts it into the mathematical mod the fold requires. Inputs',
			'// in [-128,127] bound sum+128 to [-128,382], so one correction pass',
			'// is enough.',
			'func WrapAddI8(a, b int) int {',
			'	sum := a + b',
			'	return ((sum+128)%256+256)%256 - 128',
			'}',
			'',
			'// SatAddI8 is +| on i8: walls at both ends, because signed addition',
			'// can escape the range in either direction. Saturation preserves',
			'// ORDER (bigger true sums never report smaller results) — the',
			'// property that makes it right for audio samples and brightness,',
			'// where wrapping would turn "very loud" into "very negative".',
			'func SatAddI8(a, b int) int {',
			'	sum := a + b',
			'	if sum > 127 {',
			'		return 127',
			'	}',
			'	if sum < -128 {',
			'		return -128',
			'	}',
			'	return sum',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Every language chose — most chose silently</h3>' +
			'<p>C declared signed overflow <em>undefined behavior</em>, which ' +
			'modern optimizers exploit: <code>if (x + 1 &lt; x)</code> as an ' +
			'overflow check can be deleted entirely, because the compiler may ' +
			'assume overflow never happens. Go went the other way — overflow is ' +
			'fully defined two\'s-complement wrapping, so your program is ' +
			'predictable but your counter bug is invisible. Zig\'s position is ' +
			'that both defaults are wrong <em>as defaults</em>: plain ' +
			'<code>+</code> asserts "no overflow here" and safe builds enforce ' +
			'it, while <code>+%</code> and <code>+|</code> let the rare code that ' +
			'genuinely wants wrapping or clamping say so in the source. The ' +
			'operator <em>is</em> the documentation.</p>' +
			'<h3>The bugs each operator would have caught</h3>' +
			'<p>Wraparound bugs are folklore for a reason. The Boeing 787 had an ' +
			'airworthiness directive requiring a power cycle every 248 days — a ' +
			'centisecond counter overflowing a signed 32-bit integer. Donkey ' +
			'Kong\'s kill screen is an 8-bit timer calculation overflowing at ' +
			'level 22. And nearly every TLS or VPN stack has a "rekey before the ' +
			'sequence number wraps" rule precisely because a wrapped counter ' +
			'breaks replay protection. In Zig, each of those sites would have ' +
			'been a checked <code>+</code> (crash loudly in testing) or an ' +
			'explicit <code>+%</code>/<code>+|</code> (reviewer sees the intent). ' +
			'Saturation, meanwhile, is what DSP hardware has always done: audio ' +
			'mixers clamp rather than wrap, because a clipped waveform is ' +
			'distortion but a wrapped one is a full-amplitude shriek.</p>' +
			'<h3>The signed fold, and why the checks can vanish</h3>' +
			'<p>The <code>((sum+128) mod 256) − 128</code> fold you wrote is the ' +
			'general recipe for reducing into any signed range — shift the window ' +
			'to start at zero, reduce, shift back — and the Go-specific wrinkle ' +
			'(truncated <code>%</code> needs the <code>+256</code> correction) is ' +
			'a real portability trap: Python\'s <code>%</code> is already ' +
			'mathematical, C\'s truncates like Go\'s. One more Zig detail worth ' +
			'knowing: the safety checks on plain <code>+</code> exist in Debug ' +
			'and ReleaseSafe builds; <code>ReleaseFast</code> compiles them out, ' +
			'at which point overflow really is illegal behavior with no referee — ' +
			'the contract is "you proved this can\'t happen; we stopped ' +
			'checking." That build-mode dial, per-scope via ' +
			'<code>@setRuntimeSafety</code>, is Zig\'s answer to "checks are too ' +
			'slow": pay for them in test, drop them where you\'ve earned it.</p>',
		],
		complexity: { time: 'O(1) — a fixed handful of adds, compares, and one mod per call', space: 'O(1)' },
	});
})();
