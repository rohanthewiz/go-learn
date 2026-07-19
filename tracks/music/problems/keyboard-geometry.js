/* keyboard-geometry — Pitch & the Keyboard (Easy). The physical 88-key
 * keyboard as arithmetic: which MIDI numbers are black keys (pitch classes
 * {1,3,6,8,10}), the technician's 1-based key numbering (A0 = key 1, so
 * key = m − 20, with 0 as the off-the-piano sentinel), and counting white
 * keys in a range. The harness pins the 52-white/36-black split of the full
 * keyboard, the 7 white keys per octave, the 2+3 black-key clusters, the
 * blackless E–F and B–C cracks, middle C = key 40, and both range edges.
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// One octave drawn to scale: 7 white keys, 5 black keys in their 2+3
	// clusters, and the two "cracks" where no black key sits. No <marker>
	// ids needed here, so nothing to namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 230" width="520" height="230" role="img" aria-label="one keyboard octave: seven white keys C D E F G A B, five black keys in a group of two then a group of three, no black key between E and F or between B and C">' +
		'<text x="20" y="22" class="lbl">one octave of the keyboard — the 2+3 black-key clusters are the map your fingers read</text>' +
		// white keys C4..B4 (x = 40 + i*44, w 44, y 44..164)
		'<rect x="40" y="44" width="44" height="120" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<rect x="84" y="44" width="44" height="120" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<rect x="128" y="44" width="44" height="120" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<rect x="172" y="44" width="44" height="120" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<rect x="216" y="44" width="44" height="120" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<rect x="260" y="44" width="44" height="120" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<rect x="304" y="44" width="44" height="120" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		// black keys, straddling the boundaries (w 26, y 44..118)
		'<rect x="71" y="44" width="26" height="74" fill="var(--warn)" fill-opacity="0.35" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<rect x="115" y="44" width="26" height="74" fill="var(--warn)" fill-opacity="0.35" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<rect x="203" y="44" width="26" height="74" fill="var(--warn)" fill-opacity="0.35" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<rect x="247" y="44" width="26" height="74" fill="var(--warn)" fill-opacity="0.35" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<rect x="291" y="44" width="26" height="74" fill="var(--warn)" fill-opacity="0.35" stroke="var(--warn)" stroke-width="1.6"/>' +
		// black-key pitch classes
		'<text x="84" y="36" text-anchor="middle" class="lbl" style="fill:var(--warn)">1</text>' +
		'<text x="128" y="36" text-anchor="middle" class="lbl" style="fill:var(--warn)">3</text>' +
		'<text x="216" y="36" text-anchor="middle" class="lbl" style="fill:var(--warn)">6</text>' +
		'<text x="260" y="36" text-anchor="middle" class="lbl" style="fill:var(--warn)">8</text>' +
		'<text x="304" y="36" text-anchor="middle" class="lbl" style="fill:var(--warn)">10</text>' +
		// white-key letters + pitch classes on the lower, always-white part
		'<text x="62" y="150" text-anchor="middle">C</text><text x="62" y="180" text-anchor="middle" class="lbl">0</text>' +
		'<text x="106" y="150" text-anchor="middle">D</text><text x="106" y="180" text-anchor="middle" class="lbl">2</text>' +
		'<text x="150" y="150" text-anchor="middle">E</text><text x="150" y="180" text-anchor="middle" class="lbl">4</text>' +
		'<text x="194" y="150" text-anchor="middle">F</text><text x="194" y="180" text-anchor="middle" class="lbl">5</text>' +
		'<text x="238" y="150" text-anchor="middle">G</text><text x="238" y="180" text-anchor="middle" class="lbl">7</text>' +
		'<text x="282" y="150" text-anchor="middle">A</text><text x="282" y="180" text-anchor="middle" class="lbl">9</text>' +
		'<text x="326" y="150" text-anchor="middle">B</text><text x="326" y="180" text-anchor="middle" class="lbl">11</text>' +
		// cluster braces and the cracks
		'<text x="106" y="132" text-anchor="middle" class="lbl" style="fill:var(--warn)">2</text>' +
		'<text x="260" y="132" text-anchor="middle" class="lbl" style="fill:var(--warn)">+3</text>' +
		'<text x="172" y="132" text-anchor="middle" class="lbl" style="fill:var(--ok)">gap</text>' +
		'<text x="348" y="132" text-anchor="middle" class="lbl" style="fill:var(--ok)">gap</text>' +
		'<text x="370" y="60" class="lbl">black = pitch classes</text>' +
		'<text x="370" y="76" class="lbl">{1, 3, 6, 8, 10}</text>' +
		'<text x="370" y="100" class="lbl" style="fill:var(--ok)">E–F and B–C have no</text>' +
		'<text x="370" y="116" class="lbl" style="fill:var(--ok)">black key between them</text>' +
		'<text x="20" y="208" class="lbl">88 keys, A0 (MIDI 21) .. C8 (MIDI 108) = 52 white + 36 black; find any C by touch: it sits just left of a 2-cluster</text>' +
		'</svg>';

	T.problem({
		id: 'keyboard-geometry',
		title: 'Keyboard Geometry: Black, White & 88',
		nav: 'keyboard geometry',
		difficulty: 'Easy',
		category: 'Pitch & the Keyboard',
		task: 'Implement IsBlack (pitch classes {1,3,6,8,10}), KeyNumber (88-key numbering, A0 = key 1, 0 if off the piano), and WhiteKeysBetween (inclusive white-key count).',

		prose: [
			'<h2>Keyboard Geometry: Black, White &amp; 88</h2>' +
			'<p>Watch a pianist find middle C with their eyes shut. They are not ' +
			'counting 40 keys from the left — they brush the keyboard, feel a ' +
			'<strong>group of two black keys</strong>, and drop onto the white key ' +
			'just left of it. That works from any position, in the dark, because the ' +
			'black keys repeat in an unmistakable 2+3 pattern every octave: two ' +
			'together, then three together, then a gap. The keyboard\'s irregularity ' +
			'is not a design flaw — it <em>is</em> the navigation system. A keyboard ' +
			'with evenly alternating colors would give your hands nothing to ' +
			'read.</p>' +
			'<p>The pattern is pure pitch-class arithmetic. Take any MIDI number ' +
			'<code>m</code>; its <em>pitch class</em> is <code>m mod 12</code> — ' +
			'which of the 12 keys within the octave it is. Exactly five classes are ' +
			'black:</p>',
			{ lang: 'txt', code: 'pitch class:  0  1  2  3  4  5  6  7  8  9 10 11\nkey:          C  C# D  D# E  F  F# G  G# A  A# B\ncolor:        W  B  W  B  W  W  B  W  B  W  B  W\n                 \\__2__/        \\_____3_____/\n              ^ no black between E-F ^   ^ none between B-C' },
			'<p>The black classes are <strong>{1, 3, 6, 8, 10}</strong>. The two ' +
			'places with <em>no</em> black key — between classes 4–5 (E–F) and 11–0 ' +
			'(B–C) — are the same two 1-semitone letter gaps from the previous ' +
			'problem, now visible as physical cracks in the pattern.</p>' +
			DIAGRAM +
			'<h3>Three views of one key</h3>' +
			'<p>A full-size piano has <strong>88 keys</strong>: A0 (MIDI 21) up to ' +
			'C8 (MIDI 108). Count the whites: 52. The blacks: 36. Piano technicians ' +
			'number the keys 1..88 from the bottom — A0 is key 1, so ' +
			'<code>key = m − 20</code>, and middle C comes out as the famous ' +
			'<strong>key 40</strong>. So one physical key now has three numbers: a ' +
			'MIDI number (61), a key number (41), and a pitch class (1). Keep the ' +
			'offsets straight and the three never collide.</p>' +
			'<p>Implement <code>IsBlack</code>, <code>KeyNumber</code> (return ' +
			'<code>0</code> for MIDI numbers outside 21..108 — there is no key 0, so ' +
			'it is an unambiguous “not on this piano” sentinel), and ' +
			'<code>WhiteKeysBetween(lo, hi)</code>, the inclusive count of white ' +
			'keys in a MIDI range (empty range if <code>lo &gt; hi</code>: 0).</p>' +
			'<div class="tip">Go\'s <code>%</code> truncates toward zero, so ' +
			'<code>-3 % 12 == -3</code>, not <code>9</code>. If <code>IsBlack</code> ' +
			'should survive any integer (MIDI 0..127 is all you strictly need, but ' +
			'theory code loves relative offsets that go negative), normalize with ' +
			'<code>((m%12)+12)%12</code>.</div>',
		],

		starter: [
			'package main',
			'',
			'// IsBlack reports whether MIDI note m falls on a black key. The',
			'// black keys are pitch classes {1, 3, 6, 8, 10} — C# D# F# G# A# —',
			'// in every octave. Pitch class = m mod 12, normalized to 0..11',
			'// (Go\'s % truncates toward zero, so negative m needs care).',
			'func IsBlack(m int) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// KeyNumber converts a MIDI number to the piano technician\'s',
			'// 1-based numbering on an 88-key instrument: A0 (MIDI 21) is key 1,',
			'// C8 (MIDI 108) is key 88 — so key = m - 20. For m outside 21..108',
			'// there is no such key: return 0 (the sentinel; real keys start at 1).',
			'func KeyNumber(m int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// WhiteKeysBetween counts the white keys in the INCLUSIVE MIDI range',
			'// [lo, hi]. If lo > hi the range is empty: return 0.',
			'// Sanity anchors: the full piano [21,108] holds 52; one octave',
			'// [60,71] holds 7.',
			'func WhiteKeysBetween(lo, hi int) int {',
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
			'	cases := []tc{',
			'		{"the full 88: white keys from A0 (21) to C8 (108) — 52 white, so 36 black",',
			'			"52",',
			'			func() string { return fmt.Sprintf("%d", WhiteKeysBetween(21, 108)) }},',
			'		{"one octave C4..B4 (60..71) holds exactly 7 white keys — one per letter",',
			'			"7",',
			'			func() string { return fmt.Sprintf("%d", WhiteKeysBetween(60, 71)) }},',
			'		{"the 2+3 clusters: C#4 D#4 then F#4 G#4 A#4 are all black",',
			'			"true true true true true",',
			'			func() string {',
			'				return fmt.Sprintf("%v %v %v %v %v", IsBlack(61), IsBlack(63), IsBlack(66), IsBlack(68), IsBlack(70))',
			'			}},',
			'		{"the cracks: no black key at E4, F4, B4, or C5 — the E-F and B-C half steps are white-on-white",',
			'			"false false false false",',
			'			func() string {',
			'				return fmt.Sprintf("%v %v %v %v", IsBlack(64), IsBlack(65), IsBlack(71), IsBlack(72))',
			'			}},',
			'		{"middle C is key 40 — the piano technician\'s most famous number",',
			'			"40",',
			'			func() string { return fmt.Sprintf("%d", KeyNumber(60)) }},',
			'		{"the ends of the instrument: A0 is key 1, C8 is key 88",',
			'			"1 88",',
			'			func() string { return fmt.Sprintf("%d %d", KeyNumber(21), KeyNumber(108)) }},',
			'		{"off the piano: MIDI 20 (G#0) and 109 (C#8) exist in MIDI but not on 88 keys — sentinel 0",',
			'			"0 0",',
			'			func() string { return fmt.Sprintf("%d %d", KeyNumber(20), KeyNumber(109)) }},',
			'		{"E4-F4 are BOTH counted (inclusive range, 2 whites one semitone apart); reversed range is empty",',
			'			"2 0",',
			'			func() string { return fmt.Sprintf("%d %d", WhiteKeysBetween(64, 65), WhiteKeysBetween(65, 64)) }},',
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
			'// blackPC marks the five black-key pitch classes {1,3,6,8,10}. A',
			'// lookup table, not a formula: the 2+3 clustering is an irregular',
			'// pattern (the residue of laying the C-major scale on white keys and',
			'// wedging the other five notes between), so a table is the honest',
			'// encoding — any arithmetic trick would just obfuscate this array.',
			'var blackPC = [12]bool{1: true, 3: true, 6: true, 8: true, 10: true}',
			'',
			'func IsBlack(m int) bool {',
			'	// ((m%12)+12)%12 is the standard Euclidean-mod idiom: Go\'s %',
			'	// truncates toward zero (-3%12 == -3), and an array index must',
			'	// land in 0..11 for ANY input, negative offsets included.',
			'	return blackPC[((m%12)+12)%12]',
			'}',
			'',
			'// KeyNumber is a bounds check plus a constant offset. The piano has',
			'// every chromatic key from A0 to C8 with no gaps, which is the only',
			'// reason a flat "-20" works: contiguous ranges shift, they don\'t map.',
			'func KeyNumber(m int) int {',
			'	if m < 21 || m > 108 {',
			'		return 0 // not on an 88-key piano; real keys are 1..88',
			'	}',
			'	return m - 20 // A0: 21-20 = key 1 ... C8: 108-20 = key 88',
			'}',
			'',
			'// WhiteKeysBetween scans the range and counts non-black keys.',
			'// Deliberately O(hi-lo) rather than closed-form octave arithmetic:',
			'// the widest musically meaningful range is 88 keys, and the scan',
			'// reuses IsBlack — one source of truth for the color pattern, so the',
			'// two functions can never disagree about a key.',
			'func WhiteKeysBetween(lo, hi int) int {',
			'	n := 0',
			'	// lo > hi never enters the loop, so the empty range returns 0',
			'	// without a special case.',
			'	for m := lo; m <= hi; m++ {',
			'		if !IsBlack(m) {',
			'			n++',
			'		}',
			'	}',
			'	return n',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the keyboard is irregular — and why that\'s the feature</h3>' +
			'<p>The layout froze in the 1300s: organ keyboards had the seven ' +
			'diatonic notes of C major as big front keys, and the five chromatic ' +
			'notes were added as short raised keys <em>in the gaps between whole ' +
			'steps</em>. E–F and B–C are half steps — no room, no black key — and ' +
			'that historical accident produces the 2+3 clusters. The payoff is ' +
			'tactile: every octave looks and feels identical, and every white key is ' +
			'identifiable purely by its position relative to a cluster. C sits left ' +
			'of the 2-group, F sits left of the 3-group. Uniform-grid keyboards have ' +
			'been invented repeatedly (the Jankó keyboard, 1882, is the famous one) ' +
			'and never displaced this layout — isomorphic elegance lost to ' +
			'find-your-place-by-feel.</p>' +
			'<h3>The numbers worth keeping</h3>' +
			'<ul>' +
			'<li><strong>52 + 36 = 88.</strong> Seven octaves of 7 white keys ' +
			'(C1..B7 contributes 49) plus the extras at the ends. The harness pins ' +
			'52 because off-by-one range bugs love inclusive counts.</li>' +
			'<li><strong>Middle C = key 40 = MIDI 60.</strong> Two numbering systems ' +
			'for the same key, offset by exactly 20. When a piano-adjacent API and a ' +
			'MIDI API disagree by 20, this is why (compare the octave-label ' +
			'disagreements of the previous problem, which differ by 12).</li>' +
			'<li><strong>0 as “no such key”.</strong> Returning a sentinel instead ' +
			'of panicking keeps the function total; 0 is safe precisely because ' +
			'real key numbers start at 1. The same design shows up in Go\'s stdlib ' +
			'anywhere a zero value can mean absent.</li>' +
			'</ul>' +
			'<h3>At the piano</h3>' +
			'<p>Sit down, close your eyes, touch anywhere. Feel for two black keys ' +
			'together: the white key just left is a C — every time, in every ' +
			'octave, on every piano on earth. That gesture is <code>IsBlack</code> ' +
			'run by fingertips: you located pitch class 0 by probing the {1,3} ' +
			'cluster. Teachers hand this to five-year-olds in lesson one; now you ' +
			'know it\'s modular arithmetic.</p>',
		],
		complexity: { time: 'O(hi−lo) for WhiteKeysBetween (≤ 88 in practice); IsBlack and KeyNumber are O(1)', space: 'O(1)' },
	});
})();
