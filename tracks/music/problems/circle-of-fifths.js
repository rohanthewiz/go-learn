/* circle-of-fifths — Scales & Keys (Medium). Navigating key space: the
 * relative major/minor pairing (same signature, tonics a 6th/3rd apart)
 * and signed distance around the circle via the line-of-fifths index.
 * The harness pins relative pairs in both directions — C↔A minor, A
 * major↔F# minor, Eb→C minor — and distances C→G = +1, C→F = −1, and
 * the flat-to-sharp crossing Eb→D = +5.
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// The key-signature table folded into a ring: majors outside, relative
	// minors inside, one sharp added per clockwise step. The dashed spoke
	// marks a relative pair (identical signature); the seam at 6 o'clock is
	// where the sharp and flat spellings of the same sound meet.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 344" width="500" height="344" role="img" aria-label="circle of fifths: twelve major keys clockwise C G D A E B F-sharp D-flat A-flat E-flat B-flat F, relative minors on an inner ring, sharps increasing clockwise and flats counter-clockwise">' +
		'<text x="20" y="24" class="lbl">clockwise: +1 fifth = +1 sharp</text>' +
		'<text x="480" y="24" text-anchor="end" class="lbl">counter-clockwise: +1 flat</text>' +
		'<circle cx="250" cy="170" r="100" fill="none" stroke="var(--accent)" stroke-width="1.2" opacity="0.5"/>' +
		'<path d="M 267 72 A 100 100 0 0 1 327 106" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowMusCF)"/>' +
		'<line x1="250" y1="56" x2="250" y2="90" stroke="var(--ok)" stroke-width="1.4" stroke-dasharray="3 3"/>' +
		'<text x="243" y="78" text-anchor="end" class="lbl" style="fill:var(--ok)">same sig</text>' +
		'<text x="250" y="49" text-anchor="middle">C</text>' +
		'<text x="313" y="66" text-anchor="middle">G</text>' +
		'<text x="359" y="112" text-anchor="middle">D</text>' +
		'<text x="376" y="175" text-anchor="middle">A</text>' +
		'<text x="359" y="238" text-anchor="middle">E</text>' +
		'<text x="313" y="284" text-anchor="middle">B</text>' +
		'<text x="250" y="301" text-anchor="middle" style="fill:var(--warn)">F#/Gb</text>' +
		'<text x="187" y="284" text-anchor="middle">Db</text>' +
		'<text x="141" y="238" text-anchor="middle">Ab</text>' +
		'<text x="124" y="175" text-anchor="middle">Eb</text>' +
		'<text x="141" y="112" text-anchor="middle">Bb</text>' +
		'<text x="187" y="66" text-anchor="middle">F</text>' +
		'<text x="250" y="102" text-anchor="middle" class="lbl">a</text>' +
		'<text x="286" y="112" text-anchor="middle" class="lbl">e</text>' +
		'<text x="312" y="138" text-anchor="middle" class="lbl">b</text>' +
		'<text x="322" y="174" text-anchor="middle" class="lbl">f#</text>' +
		'<text x="312" y="210" text-anchor="middle" class="lbl">c#</text>' +
		'<text x="286" y="236" text-anchor="middle" class="lbl">g#</text>' +
		'<text x="250" y="246" text-anchor="middle" class="lbl">d#</text>' +
		'<text x="214" y="236" text-anchor="middle" class="lbl">bb</text>' +
		'<text x="188" y="210" text-anchor="middle" class="lbl">f</text>' +
		'<text x="178" y="174" text-anchor="middle" class="lbl">c</text>' +
		'<text x="188" y="138" text-anchor="middle" class="lbl">g</text>' +
		'<text x="214" y="112" text-anchor="middle" class="lbl">d</text>' +
		'<text x="250" y="332" text-anchor="middle" class="lbl">outer: major keys · inner: relative minors (same signature) · 6 o’clock: the enharmonic seam</text>' +
		'<defs><marker id="dgArrowMusCF" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'circle-of-fifths',
		title: 'The Circle of Fifths',
		nav: 'circle of fifths',
		difficulty: 'Medium',
		category: 'Scales & Keys',
		task: 'Implement RelativeMinor, RelativeMajor, and FifthsDistance: relative-key pairing via scale degrees, and signed circle distance via sharp/flat counts.',

		prose: [
			'<h2>The Circle of Fifths</h2>' +
			'<p>Take the key-signature table — every major key with its signed ' +
			'sharp/flat count — and fold it into a ring, one key per step, one ' +
			'sharp added per clockwise step. That ring <em>is</em> the circle of ' +
			'fifths. It is not a new fact about music; it is the same ' +
			'line-of-fifths index you computed for key signatures, drawn mod 12 ' +
			'so that the sharp side (clockwise from C) and the flat side ' +
			'(counter-clockwise) meet at the enharmonic seam F#/Gb. Everything ' +
			'the circle is used for falls out of two computations:</p>' +
			'<ul>' +
			'<li><strong>Relative keys.</strong> Every major key has a twin minor ' +
			'key with the <em>identical</em> signature: the minor whose tonic is ' +
			'the major scale’s <strong>6th degree</strong> (A minor for C major, ' +
			'F# minor for A major). Inverting: the relative major sits on the ' +
			'natural minor scale’s <strong>3rd degree</strong>. Same seven notes, ' +
			'different center of gravity — which is why the inner ring of the ' +
			'diagram is just the outer ring rotated.</li>' +
			'<li><strong>Distance.</strong> How far apart are two keys? Subtract ' +
			'their line-of-fifths indexes: C→G is +1 (one step clockwise), C→F ' +
			'is −1, and Eb→D crosses from the flat side to the sharp side: ' +
			'(+2)&nbsp;−&nbsp;(−3)&nbsp;=&nbsp;+5. The magnitude counts how many ' +
			'accidentals change; keys at distance 1 share six of their seven ' +
			'notes — the closest two different keys can be.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement all three functions. For the relatives, resist the ' +
			'lookup table: <em>build the scale and take the degree</em>. That ' +
			'reuses the letter-advance spelling engine and gets every accidental ' +
			'right for free — including E-flat major’s relative C minor and ' +
			'A major’s relative F# minor:</p>',
			{ lang: 'txt', code: 'RelativeMinor("Eb"): Eb major = Eb F G Ab Bb C D -> degree 6 = "C"\nRelativeMajor("F#"): F# natural minor = F# G# A B C# D E -> degree 3 = "A"\n\nFifthsDistance("Eb", "D"): fifths(Eb) = -3, fifths(D) = +2\n                           +2 - (-3) = +5  (five accidentals change)' },
			'<div class="tip">Distance predicts how a key change <em>feels</em>. ' +
			'Adjacent keys (±1) share 6 of 7 notes, so a modulation to the ' +
			'dominant — one step clockwise, the single most common modulation in ' +
			'tonal music — slides in almost unnoticed: only one note changes, ' +
			'and that note (the new leading tone) actively pulls toward the new ' +
			'key. A pop song’s final-chorus lift to a distant key (+5, +6) is ' +
			'jarring <em>on purpose</em> — same metric, opposite end.</div>',
		],

		starter: [
			'package main',
			'',
			'// RelativeMinor returns the tonic of the relative minor of a major',
			'// key — the minor key sharing its exact key signature. It is the',
			'// major scale\'s 6th degree, correctly spelled.',
			'// Examples: "C" -> "A"; "A" -> "F#"; "Eb" -> "C".',
			'//',
			'// Conventions (same as the scale problems): keys are a letter A-G',
			'// plus optional "#" or "b"; natural letter pitch classes C=0 D=2 E=4',
			'// F=5 G=7 A=9 B=11; major pattern 2 2 1 2 2 2 1; one letter per',
			'// degree with accidentals ("bb","b","","#","x") closing the gap.',
			'func RelativeMinor(major string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// RelativeMajor is the inverse: the major key sharing a minor key\'s',
			'// signature — the natural minor scale\'s 3rd degree (pattern',
			'// 2 1 2 2 1 2 2), correctly spelled.',
			'// Examples: "A" -> "C"; "F#" -> "A"; "C" -> "Eb".',
			'func RelativeMajor(minor string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// FifthsDistance returns the signed number of clockwise steps around',
			'// the circle of fifths from major key k1 to major key k2 — that is,',
			'// fifths(k2) - fifths(k1), where fifths() is the key\'s signed',
			'// sharp/flat count (C=0, G=+1, D=+2, ... F=-1, Bb=-2, ...).',
			'// Examples: C->G = +1; C->F = -1; Eb->D = +5.',
			'// Hint: fifths(key) = letter position on the line of fifths (F=-1',
			'// C=0 G=1 D=2 A=3 E=4 B=5) + 7 per "#" on the tonic, - 7 per "b".',
			'func FifthsDistance(k1, k2 string) int {',
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
			'		{"RelativeMinor(C) — the canonical pair: A minor shares C major\'s empty signature",',
			'			"A",',
			'			func() string { return RelativeMinor("C") }},',
			'		{"RelativeMinor(A) — degree 6 of A major is F#, so the relative minor tonic is spelled F#",',
			'			"F#",',
			'			func() string { return RelativeMinor("A") }},',
			'		{"RelativeMinor(Eb) — flat side: degree 6 of Eb major is plain C",',
			'			"C",',
			'			func() string { return RelativeMinor("Eb") }},',
			'		{"RelativeMajor(A) — the inverse direction of the canonical pair",',
			'			"C",',
			'			func() string { return RelativeMajor("A") }},',
			'		{"RelativeMajor(F#) — degree 3 of F# natural minor is A: inverse of case 2",',
			'			"A",',
			'			func() string { return RelativeMajor("F#") }},',
			'		{"FifthsDistance(C, G) — one clockwise step: the dominant, one new sharp",',
			'			"+1",',
			'			func() string { return fmt.Sprintf("%+d", FifthsDistance("C", "G")) }},',
			'		{"FifthsDistance(C, F) — one counter-clockwise step: the subdominant, one new flat",',
			'			"-1",',
			'			func() string { return fmt.Sprintf("%+d", FifthsDistance("C", "F")) }},',
			'		{"FifthsDistance(Eb, D) — flat-to-sharp crossing: +2 - (-3) = +5",',
			'			"+5",',
			'			func() string { return fmt.Sprintf("%+d", FifthsDistance("Eb", "D")) }},',
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
			'// The letter-advance spelling engine once more — the relatives are',
			'// DEFINED as scale degrees, so building the scale and indexing into',
			'// it is the honest computation, and it gets every accidental right',
			'// (F# minor from A major, C minor from Eb major) with no table.',
			'var letters = []string{"C", "D", "E", "F", "G", "A", "B"}',
			'var letterPC = []int{0, 2, 4, 5, 7, 9, 11}',
			'',
			'func accOffset(suffix string) int {',
			'	off := 0',
			'	for _, r := range suffix {',
			'		switch r {',
			'		case \'#\':',
			'			off++',
			'		case \'x\':',
			'			off += 2',
			'		case \'b\':',
			'			off--',
			'		}',
			'	}',
			'	return off',
			'}',
			'',
			'func accSuffix(delta int) string {',
			'	switch delta {',
			'	case -2:',
			'		return "bb"',
			'	case -1:',
			'		return "b"',
			'	case 1:',
			'		return "#"',
			'	case 2:',
			'		return "x"',
			'	}',
			'	return ""',
			'}',
			'',
			'// spellScale is the two-line walk parameterized by step pattern: one',
			'// letter per degree, accidentals closing the gap between the letter\'s',
			'// natural pitch class and the pattern\'s required one. Shared by both',
			'// relative-key functions below — the only thing that differs is which',
			'// pattern runs and which degree gets plucked out.',
			'func spellScale(tonic string, steps []int) []string {',
			'	li := 0',
			'	for i, l := range letters {',
			'		if l[0] == tonic[0] {',
			'			li = i',
			'		}',
			'	}',
			'	// +12 guard: Go\'s % keeps the sign of the dividend, so flat',
			'	// tonics would otherwise go negative.',
			'	pc := ((letterPC[li]+accOffset(tonic[1:]))%12 + 12) % 12',
			'	out := make([]string, 7)',
			'	for deg := 0; deg < 7; deg++ {',
			'		L := (li + deg) % 7',
			'		delta := ((pc-letterPC[L])%12 + 12) % 12',
			'		if delta > 6 {',
			'			delta -= 12 // shortest signed distance: 11 sharps is really 1 flat',
			'		}',
			'		out[deg] = letters[L] + accSuffix(delta)',
			'		pc = (pc + steps[deg]) % 12',
			'	}',
			'	return out',
			'}',
			'',
			'// RelativeMinor: the major scale\'s 6th degree (index 5). Fun fact',
			'// hiding in the math: degree 6 sits +3 on the line of fifths from the',
			'// tonic (C->G->D->A), which is why the inner ring of the circle is',
			'// the outer ring rotated three steps clockwise.',
			'func RelativeMinor(major string) string {',
			'	return spellScale(major, []int{2, 2, 1, 2, 2, 2, 1})[5]',
			'}',
			'',
			'// RelativeMajor: the natural minor scale\'s 3rd degree (index 2).',
			'// Natural minor is the right form here BY DEFINITION — the relative',
			'// relationship is about the shared key signature, and the signature',
			'// is exactly the natural form (harmonic/melodic alterations are',
			'// written as in-line accidentals, never in the signature).',
			'func RelativeMajor(minor string) string {',
			'	return spellScale(minor, []int{2, 1, 2, 2, 1, 2, 2})[2]',
			'}',
			'',
			'// fifthsIndex positions a major key on the line of fifths — its signed',
			'// sharp count. Letters anchor at F=-1 C=0 G=1 D=2 A=3 E=4 B=5, and an',
			'// accidental on the tonic shifts the whole key by 7 (one semitone =',
			'// seven fifths, since 7*7 = 49 = 4 octaves + 1 semitone).',
			'func fifthsIndex(major string) int {',
			'	pos := map[byte]int{\'F\': -1, \'C\': 0, \'G\': 1, \'D\': 2, \'A\': 3, \'E\': 4, \'B\': 5}',
			'	n := pos[major[0]]',
			'	for _, r := range major[1:] {',
			'		switch r {',
			'		case \'#\':',
			'			n += 7',
			'		case \'b\':',
			'			n -= 7',
			'		}',
			'	}',
			'	return n',
			'}',
			'',
			'// FifthsDistance is a plain subtraction of positions — deliberately',
			'// NOT reduced mod 12. On spelled keys the line of fifths is a line,',
			'// not a circle: Eb and D# are different points (-3 vs +9) even though',
			'// they are the same piano key, and collapsing them would erase the',
			'// very distinction this track keeps computing.',
			'func FifthsDistance(k1, k2 string) int {',
			'	return fifthsIndex(k2) - fifthsIndex(k1)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The circle is a derived object</h3>' +
			'<p>Nothing on the circle is new information: the outer ring is the ' +
			'key-signature count you already compute (<code>fifthsIndex</code>), ' +
			'folded mod 12 so ±6/∓6 coincide at the F#/Gb seam. The inner ring is ' +
			'the outer ring rotated three steps — because a relative minor tonic ' +
			'sits at degree 6 of the major scale, and degree 6 is +3 fifths from ' +
			'the tonic (C→G→D→A). Once you see both rings as the same index ' +
			'viewed twice, the circle stops being a poster to memorize and ' +
			'becomes a coordinate system.</p>' +
			'<h3>Why the distance metric matters</h3>' +
			'<p>Keys at distance ±1 differ by one accidental, so they share six ' +
			'of seven notes; every chord that lives in both keys is a free pivot ' +
			'for modulation. That is why the dominant modulation (+1) is the ' +
			'workhorse of tonal music — a classical exposition moving to the ' +
			'dominant, a jazz ii–V pulling one step around the circle, a hymn ' +
			'brightening for its last verse: they all take the smoothest step ' +
			'available. Distant keys share little, and getting there gracefully ' +
			'means walking the circle through intermediate keys — or leaping and ' +
			'letting the jolt be the effect (the pop “truck-driver modulation” up ' +
			'a semitone is a ±5/∓7 leap, and it sounds like one).</p>' +
			'<h3>Design choices worth defending</h3>' +
			'<ul>' +
			'<li><strong>Relatives by scale degree, not by table.</strong> A ' +
			'12-entry lookup would pass the pinned cases but silently botch ' +
			'spelling on less common tonics; degree-of-the-spelled-scale is ' +
			'correct for every letter+accidental input by construction.</li>' +
			'<li><strong>Natural minor for RelativeMajor.</strong> The relative ' +
			'relationship is defined by the shared <em>signature</em>, and the ' +
			'signature encodes exactly the natural form — raised 6ths and 7ths ' +
			'are always in-line accidentals.</li>' +
			'<li><strong>No mod 12 in FifthsDistance.</strong> On spelled keys ' +
			'the line of fifths is genuinely a line: Gb (−6) and F# (+6) are ' +
			'twelve apart, and a signed answer preserves which way you traveled ' +
			'and how many accidentals changed. The piano collapses the seam; the ' +
			'notation does not.</li>' +
			'</ul>' +
			'<h3>At the piano</h3>' +
			'<p>Practice keys in circle order, not chromatic order: C, G, D, A… ' +
			'each new scale changes exactly one note from the last, so your hand ' +
			'carries six-sevenths of its knowledge forward every step. And when a ' +
			'chart says “same key, relative minor,” you now know it is literally ' +
			'the same seven keys under your fingers — only the note your ear ' +
			'calls home has moved.</p>',
		],
		complexity: { time: 'O(1) — a seven-degree spell or a two-lookup subtraction', space: 'O(1)' },
	});
})();
