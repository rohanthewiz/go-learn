/* pitch-frequency — Pitch & the Keyboard (Medium). Equal temperament as
 * arithmetic: f(m) = 440·2^((m−69)/12), its log2 inverse rounded to the
 * nearest key, and the tuner's cents = 1200·log2(f2/f1). All comparisons go
 * through fmt.Sprintf("%.2f"). The harness pins A4 = 440.00, middle C =
 * 261.63, exact octave doubling (880.00 and ±1200.00 cents), the piano's
 * ends (27.50 / 4186.01), the detuned-string case 442 vs 440 = +7.85 cents,
 * a between-the-keys rounding case (270 Hz -> C#4), and baroque A415 -> G#4.
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// Same notes on two axes: the keyboard's equal pitch steps vs the linear
	// Hz line, where each octave occupies twice the length of the one below.
	// No <marker> ids used, so nothing to namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="the same four A notes on a pitch axis with equal spacing and on a linear frequency axis where each octave doubles in length">' +
		'<text x="20" y="22" class="lbl">pitch is the logarithm of frequency: equal steps of pitch = equal RATIOS of Hz</text>' +
		// pitch axis: equal spacing
		'<line x1="30" y1="66" x2="490" y2="66" stroke="var(--accent)" stroke-width="2"/>' +
		'<line x1="40" y1="58" x2="40" y2="74" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<line x1="187" y1="58" x2="187" y2="74" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<line x1="333" y1="58" x2="333" y2="74" stroke="var(--ok)" stroke-width="2"/>' +
		'<line x1="480" y1="58" x2="480" y2="74" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="40" y="50" text-anchor="middle" class="lbl">A2 (45)</text>' +
		'<text x="187" y="50" text-anchor="middle" class="lbl">A3 (57)</text>' +
		'<text x="333" y="50" text-anchor="middle" class="lbl" style="fill:var(--ok)">A4 (69)</text>' +
		'<text x="480" y="50" text-anchor="middle" class="lbl">A5 (81)</text>' +
		'<text x="20" y="92" class="lbl">keyboard / MIDI: +12 keys each time, equal strides</text>' +
		// connectors pitch tick -> Hz tick
		'<line x1="40" y1="74" x2="88" y2="150" stroke="var(--accent)" stroke-width="1.2"/>' +
		'<line x1="187" y1="74" x2="137" y2="150" stroke="var(--accent)" stroke-width="1.2"/>' +
		'<line x1="333" y1="74" x2="234" y2="150" stroke="var(--ok)" stroke-width="1.4"/>' +
		'<line x1="480" y1="74" x2="427" y2="150" stroke="var(--accent)" stroke-width="1.2"/>' +
		// frequency axis: linear Hz, x = 40 + Hz*0.44
		'<line x1="30" y1="158" x2="490" y2="158" stroke="var(--warn)" stroke-width="2"/>' +
		'<line x1="88" y1="150" x2="88" y2="166" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<line x1="137" y1="150" x2="137" y2="166" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<line x1="234" y1="150" x2="234" y2="166" stroke="var(--ok)" stroke-width="2"/>' +
		'<line x1="427" y1="150" x2="427" y2="166" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<text x="88" y="182" text-anchor="middle" class="lbl">110</text>' +
		'<text x="137" y="182" text-anchor="middle" class="lbl">220</text>' +
		'<text x="234" y="182" text-anchor="middle" class="lbl" style="fill:var(--ok)">440</text>' +
		'<text x="427" y="182" text-anchor="middle" class="lbl">880</text>' +
		'<text x="20" y="202" class="lbl" style="fill:var(--warn)">frequency in Hz: each octave DOUBLES — twice the length of the one below on a linear axis</text>' +
		'</svg>';

	T.problem({
		id: 'pitch-frequency',
		title: 'Pitch & Frequency: Equal Temperament',
		nav: 'pitch ↔ frequency',
		difficulty: 'Medium',
		category: 'Pitch & the Keyboard',
		task: 'Implement Freq (440·2^((m−69)/12)), NearestMIDI (round the log2 inverse to the nearest key), and Cents (1200·log2(f2/f1)).',

		prose: [
			'<h2>Pitch &amp; Frequency: Equal Temperament</h2>' +
			'<p>Everything so far was integers — key numbers, pitch classes. But a ' +
			'vibrating string doesn\'t know about keys; it has a <em>frequency</em>, ' +
			'and the bridge between the two number worlds is one formula. Two ' +
			'physical facts anchor it:</p>' +
			'<ul>' +
			'<li><strong>The octave is 2:1.</strong> Halve a string\'s length and it ' +
			'vibrates exactly twice as fast; our ears hear the doubled tone as “the ' +
			'same note, higher.” This ratio is physics, not convention — every ' +
			'musical culture that has octaves has <em>this</em> octave.</li>' +
			'<li><strong>Pitch perception is logarithmic.</strong> The ear judges ' +
			'<em>ratios</em>, not differences. 110→220&nbsp;Hz and 440→880&nbsp;Hz ' +
			'are both “up one octave,” though one spans 110&nbsp;Hz and the other ' +
			'440.</li>' +
			'</ul>' +
			'<p><strong>Equal temperament</strong> is then a single design decision: ' +
			'chop the octave into 12 steps that are equal <em>as ratios</em>. Each ' +
			'semitone multiplies frequency by the same constant <em>r</em>, and 12 ' +
			'of them must stack to an exact octave: <code>r¹² = 2</code>, so ' +
			'<code>r = 2^(1/12) ≈ 1.059463</code>. That one irrational number buys ' +
			'the piano\'s superpower — every key is equally in tune, so music can be ' +
			'transposed anywhere and sound the same. Anchor the scale at the modern ' +
			'reference <strong>A4 = MIDI 69 = 440&nbsp;Hz</strong> and every key ' +
			'follows:</p>',
			{ lang: 'txt', code: 'f(m)  = 440 × 2^((m−69)/12)\n\nf(69) = 440 × 2^0        = 440.00 Hz   (A4, the anchor)\nf(60) = 440 × 2^(−9/12)  = 261.63 Hz   (middle C)\nf(81) = 440 × 2^(12/12)  = 880.00 Hz   (A5: exactly double)\n\ninverse:  m = round(69 + 12 × log2(f/440))' },
			DIAGRAM +
			'<h3>The tuner\'s unit: cents</h3>' +
			'<p>Piano tuners and every tuning app slice the semitone into 100 ' +
			'<strong>cents</strong>, so the octave is 1200. Cents are logarithmic ' +
			'for the same reason pitch is: <code>cents(f1→f2) = 1200 × ' +
			'log2(f2/f1)</code>. A log of a ratio behaves like a difference, so ' +
			'cents <em>add</em> along a chain of intervals — stack +700 on +500 and ' +
			'you are +1200, an exact octave. A string at 442&nbsp;Hz against a ' +
			'440&nbsp;Hz fork is +7.85 cents sharp; a trained tuner hears it not as ' +
			'pitch but as a slow <em>beat</em> — 2 pulses per second of interference ' +
			'— and turns the pin until the beating stops.</p>' +
			'<p>And A440 itself? Pure convention, standardized only in 1939. ' +
			'Baroque ensembles commonly tune to <strong>A&nbsp;=&nbsp;415&nbsp;Hz</strong> ' +
			'— almost exactly one equal-tempered semitone flat (415.30 would be ' +
			'exact), which is why a baroque recording can sound “in G#” to modern ' +
			'ears, and why your <code>NearestMIDI(415)</code> should answer 68, not ' +
			'69. Many modern orchestras sit at 442–443.</p>' +
			'<div class="tip">Floats never get compared with <code>==</code> — the ' +
			'harness formats through <code>fmt.Sprintf("%.2f", ...)</code> and ' +
			'compares strings, the same round-at-the-boundary discipline production ' +
			'float code uses. Inside your functions keep full <code>float64</code> ' +
			'precision; format only at the edge.</div>',
		],

		starter: [
			'package main',
			'',
			'import (',
			'	"math"',
			')',
			'',
			'// Freq returns the equal-tempered frequency in Hz of MIDI note m,',
			'// anchored at A4 = MIDI 69 = 440 Hz:',
			'//',
			'//	f(m) = 440 × 2^((m−69)/12)',
			'//',
			'// Every +12 doubles the frequency; every +1 multiplies by 2^(1/12).',
			'// Mind the integer division trap: (m-69)/12 must be computed in',
			'// float64, or Go truncates it.',
			'func Freq(m int) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// NearestMIDI returns the MIDI number of the key nearest to',
			'// frequency f (f > 0). Invert Freq, then round to the nearest',
			'// integer:',
			'//',
			'//	m = round(69 + 12 × log2(f/440))',
			'//',
			'// "Nearest" is measured on the pitch (log) axis — the one ears use —',
			'// not in raw Hz.',
			'func NearestMIDI(f float64) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Cents returns the signed size of the interval from f1 to f2:',
			'//',
			'//	cents = 1200 × log2(f2/f1)',
			'//',
			'// 100 cents = one equal-tempered semitone, 1200 = one octave.',
			'// Positive when f2 is above f1, negative when below.',
			'func Cents(f1, f2 float64) float64 {',
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
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f2 := func(v float64) string { return fmt.Sprintf("%.2f", v) }',
			'	cases := []tc{',
			'		{"the anchor is exact: Freq(69) = 440.00 — A4 IS the definition, no rounding involved",',
			'			"440.00",',
			'			func() string { return f2(Freq(69)) }},',
			'		{"middle C: 261.63 Hz — the most-quoted frequency in music tech",',
			'			"261.63",',
			'			func() string { return f2(Freq(60)) }},',
			'		{"octaves double exactly: A5 (81) = 880.00, because 2^(12/12) = 2 — no drift after 12 steps",',
			'			"880.00",',
			'			func() string { return f2(Freq(81)) }},',
			'		{"the piano\'s ends: A0 = 27.50 Hz (a felt rumble), C8 = 4186.01 Hz",',
			'			"27.50 4186.01",',
			'			func() string { return fmt.Sprintf("%s %s", f2(Freq(21)), f2(Freq(108))) }},',
			'		{"an octave is 1200.00 cents by definition — and the sign flips with direction",',
			'			"1200.00 -1200.00",',
			'			func() string { return fmt.Sprintf("%s %s", f2(Cents(440, 880)), f2(Cents(880, 440))) }},',
			'		{"the detuned string: 442 Hz vs a 440 fork = +7.85 cents — heard as ~2 beats per second",',
			'			"7.85",',
			'			func() string { return f2(Cents(440, 442)) }},',
			'		{"NearestMIDI snaps: 440 -> 69; 261.63 (already-rounded Hz) -> 60; 270 sits between C4 and C#4 but is nearer C#4",',
			'			"69 60 61",',
			'			func() string {',
			'				return fmt.Sprintf("%d %d %d", NearestMIDI(440), NearestMIDI(261.63), NearestMIDI(270))',
			'			}},',
			'		{"baroque pitch: A = 415 Hz rounds to MIDI 68 (G#4) — a semitone flat of modern A, not \'a flat A\'",',
			'			"68",',
			'			func() string { return fmt.Sprintf("%d", NearestMIDI(415)) }},',
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
			'import (',
			'	"math"',
			')',
			'',
			'// Freq: 440 · 2^((m−69)/12). One Pow call, not a loop of twelve',
			'// ×1.059463 multiplications — the loop form accumulates rounding',
			'// error and, worse, bakes in a truncated constant. Exponentiating',
			'// the exact exponent keeps octaves EXACT: 2^(12/12) is precisely 2,',
			'// so Freq(81) is precisely 880, not 879.999...',
			'func Freq(m int) float64 {',
			'	// float64(m-69)/12: the subtraction is safe in int, but the',
			'	// division must happen in float64 — (m-69)/12 in ints would',
			'	// truncate -9/12 to 0 and silently return 440 for middle C.',
			'	return 440 * math.Pow(2, float64(m-69)/12)',
			'}',
			'',
			'// NearestMIDI inverts Freq: log2 of the ratio to A4 gives the',
			'// (fractional) semitone distance, and rounding happens on THAT',
			'// axis. Rounding on the pitch axis is not a convenience — it is the',
			'// perceptually correct notion of "nearest": the boundary between two',
			'// keys sits at the geometric mean of their frequencies (±50 cents),',
			'// not at the arithmetic midpoint in Hz.',
			'func NearestMIDI(f float64) int {',
			'	// math.Round, not int(x+0.5): Round is symmetric about zero, so',
			'	// the formula stays correct even for sub-audio f where the pitch',
			'	// value goes negative. int(x+0.5) breaks on negatives.',
			'	return int(math.Round(69 + 12*math.Log2(f/440)))',
			'}',
			'',
			'// Cents is the same log2, rescaled: 1200 per octave, 100 per',
			'// semitone. Taking the log turns ratios into differences, which is',
			'// the whole point of the unit — cents add along a chain of',
			'// intervals, and sign encodes direction (f2 above f1 is positive).',
			'func Cents(f1, f2 float64) float64 {',
			'	return 1200 * math.Log2(f2/f1)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why 2^(1/12) and not something nicer</h3>' +
			'<p>The “natural” intervals are small whole-number ratios: the pure ' +
			'fifth is 3:2, the pure major third 5:4. But no stack of pure fifths ' +
			'ever lands exactly on a stack of octaves — (3/2)¹² ≈ 129.75 vs 2⁷ = 128 ' +
			'— so keyboard tuning is forced to cheat <em>somewhere</em>. Historical ' +
			'temperaments hid the cheat in remote keys (making each key sound ' +
			'different — the old idea of “key color”); equal temperament spreads it ' +
			'perfectly evenly. The price, in the unit you just implemented: the ' +
			'equal-tempered fifth is 700 cents against the pure 701.96 — nobody ' +
			'notices — while the major third is 400 against the pure 386.31, a ' +
			'genuinely audible sharpening that gives pianos their slightly bright ' +
			'thirds. The reward is total transposability: every song works in every ' +
			'key, which is why <code>Freq</code> can be one formula instead of a ' +
			'per-key table.</p>' +
			'<h3>Misconceptions and fine print</h3>' +
			'<ul>' +
			'<li><strong>“Nearest key means nearest in Hz.”</strong> No — nearest ' +
			'in <em>log</em> frequency. The 270&nbsp;Hz test guards this: the ' +
			'crossover between C4 (261.63) and C#4 (277.18) sits at their geometric ' +
			'mean ≈&nbsp;269.29, not the arithmetic 269.41. The two means are close ' +
			'because a semitone is small, but code that rounds in Hz space is wrong ' +
			'by construction and drifts further on wider searches.</li>' +
			'<li><strong>“440 is physics.”</strong> It\'s a committee decision ' +
			'(ISO&nbsp;16, standardized 1939, reaffirmed 1975). Baroque pitch ' +
			'A≈415, French opera pitch 435, modern European orchestras 442–443 — ' +
			'the formula\'s anchor constant is a parameter of culture. Only the 2:1 ' +
			'octave and the 12th-root spacing are math.</li>' +
			'<li><strong>“A real piano matches Freq exactly.”</strong> Real strings ' +
			'are stiff, so their overtones run slightly sharp (inharmonicity); ' +
			'tuners compensate by stretching octaves a few cents wide at the ends ' +
			'of the instrument (the Railsback curve). Your function is the ideal ' +
			'grid; a concert tuning deviates from it on purpose.</li>' +
			'</ul>' +
			'<h3>At the piano</h3>' +
			'<p>The beat trick makes cents audible. Play A4 while a tuning app ' +
			'sounds 440: if the string is at 442, you hear the loudness pulse ' +
			'~2 times per second (|442−440| Hz), which your <code>Cents</code> ' +
			'says is +7.85. Tuners chase beats, not pitch — the ear detects a ' +
			'0.5&nbsp;Hz beat far more reliably than a 2-cent pitch difference. ' +
			'When the pulsing slows to nothing, the unison is pure.</p>',
		],
		complexity: { time: 'O(1) — a Pow or a Log2 per call', space: 'O(1)' },
	});
})();
