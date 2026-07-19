/* intervals — Intervals (Easy). Intervals as semitone distances: Semitones
 * (absolute distance between two MIDI numbers), IntervalName (0..12 to the
 * canonical simple-interval names P1..P8), and Invert (complement to the
 * octave). The harness pins the unison, the tritone, the octave, one
 * inversion pair in both directions, and the fact that distance carries no
 * direction — G4 down to C4 is the same perfect fifth as C4 up to G4.
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// The semitone number line 0..12 with every simple interval on it, plus
	// the inversion arcs: m3 (3) and M6 (9) tile one octave between them.
	// Built in a loop because the 13 ticks are pure repetition; no <marker>
	// elements, so nothing needs id-namespacing.
	var DIAGRAM = (function () {
		var names = ['P1', 'm2', 'M2', 'm3', 'M3', 'P4', 'TT', 'P5', 'm6', 'M6', 'm7', 'M7', 'P8'];
		var s = '<svg class="dg" viewBox="0 0 560 212" width="560" height="212" role="img" ' +
			'aria-label="the semitone number line from 0 to 12 with interval names; arcs show m3 plus M6 tiling one octave">' +
			'<text x="20" y="24" class="lbl">the semitone number line — every simple interval is a distance on it</text>' +
			'<line x1="40" y1="135" x2="520" y2="135" stroke="var(--accent)" stroke-width="2"/>';
		for (var i = 0; i <= 12; i++) {
			var x = 40 + 40 * i;
			var warn = (i === 6); // the tritone: the octave\'s exact midpoint
			s += '<line x1="' + x + '" y1="129" x2="' + x + '" y2="141" stroke="var(--accent)" stroke-width="2"/>' +
				'<text x="' + x + '" y="158" text-anchor="middle" class="lbl">' + i + '</text>' +
				'<text x="' + x + '" y="176" text-anchor="middle" class="lbl"' +
				(warn ? ' style="fill:var(--warn)"' : '') + '>' + names[i] + '</text>';
		}
		s += '<path d="M 40 125 C 70 88 130 88 160 125" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
			'<text x="100" y="92" text-anchor="middle" class="lbl" style="fill:var(--ok)">m3 = 3</text>' +
			'<path d="M 160 125 C 250 62 430 62 520 125" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
			'<text x="340" y="76" text-anchor="middle" class="lbl" style="fill:var(--warn)">M6 = 9</text>' +
			'<text x="280" y="200" text-anchor="middle" class="lbl">m3 + M6 = 12 — inversion slides the bottom note up an octave, and the two pieces swap</text>' +
			'</svg>';
		return s;
	})();

	T.problem({
		id: 'intervals',
		title: 'Intervals: Distances, Not Notes',
		nav: 'intervals',
		difficulty: 'Easy',
		category: 'Intervals',
		task: 'Implement Semitones (absolute distance between MIDI numbers), IntervalName (0..12 to P1..P8), and Invert (complement to the octave).',

		prose: [
			'<h2>Intervals: Distances, Not Notes</h2>' +
			'<p>Ask a pianist to play a perfect fifth and they don’t think about ' +
			'note names at all — the hand just opens to a fixed span. C up to G, ' +
			'F&nbsp;up to C, B&nbsp;up to F#: different keys, identical shape, ' +
			'because all three pairs are exactly <strong>7 piano keys apart</strong> ' +
			'(black keys included). That is the whole idea of this problem: an ' +
			'<em>interval</em> is not a pair of notes, it is the <strong>distance ' +
			'between them</strong>, measured in semitones — and on a keyboard, a ' +
			'distance is a physical shape you can feel in the dark.</p>' +
			'<ul>' +
			'<li><strong>Semitone = one key to the very next key</strong>, white or ' +
			'black. MIDI numbers count keys, so the distance between two notes is ' +
			'just <code>|m1&nbsp;−&nbsp;m2|</code>. C4&nbsp;=&nbsp;60, ' +
			'G4&nbsp;=&nbsp;67, distance&nbsp;7.</li>' +
			'<li><strong>Distance has no direction.</strong> C4 up to G4 and G4 ' +
			'down to C4 are the same perfect fifth — the same 7 keys, walked either ' +
			'way. That’s why <code>Semitones</code> takes an absolute value.</li>' +
			'<li><strong>Each distance 0..12 has a canonical name</strong>, built ' +
			'from a quality letter (<code>P</code>&nbsp;perfect, <code>m</code>&nbsp;minor, ' +
			'<code>M</code>&nbsp;major) and a number — except 6, the ' +
			'<strong>tritone</strong> (<code>TT</code>), which splits the octave ' +
			'exactly in half and refuses to pick a side.</li>' +
			'</ul>',
			{ lang: 'txt', code: 'semitones:  0    1    2    3    4    5    6    7    8    9   10   11   12\nname:      P1   m2   M2   m3   M3   P4   TT   P5   m6   M6   m7   M7   P8\n\nC4 (60) up to G4 (67):   |67 - 60| = 7  ->  "P5"\nG4 (67) down to C4 (60): |60 - 67| = 7  ->  "P5"  (same distance, same name)' },
			'<h3>Inversion: the octave’s two pieces</h3>' +
			'<p>Take C4–E4 (a major third, 4 semitones) and slide the bottom note ' +
			'up an octave: now it’s E4–C5, a minor sixth, 8 semitones. The two ' +
			'intervals <strong>tile one octave between them</strong> — that flip is ' +
			'called <em>inversion</em>, and it is pure arithmetic:</p>' +
			'<ul>' +
			'<li><strong>Semitones sum to 12</strong>: an interval of <code>s</code> ' +
			'inverts to <code>12&nbsp;−&nbsp;s</code>.</li>' +
			'<li><strong>Numbers sum to 9</strong>: 3rd&nbsp;↔&nbsp;6th, ' +
			'4th&nbsp;↔&nbsp;5th, unison&nbsp;↔&nbsp;octave.</li>' +
			'<li><strong>Quality flips</strong> <code>m&nbsp;↔&nbsp;M</code>, while ' +
			'<code>P</code> stays perfect (that’s what “perfect” means) and the ' +
			'tritone — 6 semitones, dead center — inverts to itself.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the three functions in the starter. One 13-entry table is ' +
			'enough to drive all of them — <code>Invert</code> is just ' +
			'<code>IntervalName(12&nbsp;−&nbsp;s)</code> in disguise.</p>' +
			'<div class="tip">Why does 6 get the odd name <code>TT</code> instead of ' +
			'a quality+number? Because by semitone count alone you can’t tell an ' +
			'augmented fourth (F→B) from a diminished fifth (B→F) — both are 6. ' +
			'Telling them apart needs note <em>spelling</em>, not just distance; ' +
			'that’s exactly the next problem.</div>',
		],

		starter: [
			'package main',
			'',
			'// Semitones returns the distance in semitones between two MIDI note',
			'// numbers, always non-negative: an interval is a distance, not a',
			'// direction, so Semitones(60, 67) == Semitones(67, 60) == 7.',
			'// (C4 = MIDI 60; each adjacent piano key, black or white, is one',
			'// semitone.)',
			'func Semitones(m1, m2 int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// IntervalName names a semitone distance 0..12:',
			'//',
			'//	 0 "P1"   1 "m2"   2 "M2"   3 "m3"   4 "M3"   5 "P4"   6 "TT"',
			'//	 7 "P5"   8 "m6"   9 "M6"  10 "m7"  11 "M7"  12 "P8"',
			'//',
			'// Any input outside 0..12 returns "".',
			'func IntervalName(semitones int) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// Invert returns the inversion of a simple interval name: the interval',
			'// that stacks on top of it to complete one octave. Semitones sum to',
			'// 12, interval numbers sum to 9, and quality flips m<->M while P stays',
			'// P and TT stays TT: m3<->M6, P4<->P5, P1<->P8, TT<->TT.',
			'// Input is always one of the 13 names IntervalName can return.',
			'func Invert(name string) string {',
			'	// your code here',
			'	return ""',
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
			'		{"unison: a note to itself is zero semitones — P1, the identity interval",',
			'			"P1",',
			'			func() string { return IntervalName(Semitones(60, 60)) }},',
			'		{"C4 (60) up to G4 (67): 7 semitones — the perfect fifth, the pianist\'s fixed hand-span",',
			'			"P5",',
			'			func() string { return IntervalName(Semitones(60, 67)) }},',
			'		{"distance is direction-free: G4 DOWN to C4 is the same 7 semitones",',
			'			"7",',
			'			func() string { return fmt.Sprintf("%d", Semitones(67, 60)) }},',
			'		{"6 semitones splits the octave exactly in half — the tritone, TT",',
			'			"TT",',
			'			func() string { return IntervalName(6) }},',
			'		{"C4 (60) to C5 (72): 12 semitones — the octave, P8",',
			'			"P8",',
			'			func() string { return IntervalName(Semitones(60, 72)) }},',
			'		{"inversion: m3 (3 semitones) flips to M6 (9) — semitones 3+9=12, numbers 3+6=9, quality m->M",',
			'			"M6",',
			'			func() string { return Invert("m3") }},',
			'		{"inversion round-trips: M6 flips back to m3",',
			'			"m3",',
			'			func() string { return Invert("M6") }},',
			'		{"perfect stays perfect (P4->P5) and the octave\'s midpoint inverts to itself (TT->TT)",',
			'			"P5 TT",',
			'			func() string { return Invert("P4") + " " + Invert("TT") }},',
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
			'// names indexes interval names by semitone count, 0..12. One table',
			'// drives the whole problem: IntervalName reads it forward, and Invert',
			'// reads it through the complement 12-s — because inversion IS',
			'// complement-to-the-octave, no second table (and no chance of the two',
			'// tables drifting apart) is needed.',
			'var names = []string{',
			'	"P1", "m2", "M2", "m3", "M3", "P4", "TT",',
			'	"P5", "m6", "M6", "m7", "M7", "P8",',
			'}',
			'',
			'// Semitones: absolute difference of the two MIDI numbers. The',
			'// branch (rather than math.Abs) keeps everything in integers —',
			'// MIDI numbers are ints, and float round-trips are noise here.',
			'func Semitones(m1, m2 int) int {',
			'	if m1 > m2 {',
			'		return m1 - m2',
			'	}',
			'	return m2 - m1',
			'}',
			'',
			'// IntervalName is a bounds-checked table lookup. Out-of-range input',
			'// returns "" rather than panicking: callers may feed raw differences',
			'// wider than an octave, and a zero value is the contract for "not a',
			'// simple interval".',
			'func IntervalName(semitones int) string {',
			'	if semitones < 0 || semitones >= len(names) {',
			'		return ""',
			'	}',
			'	return names[semitones]',
			'}',
			'',
			'// Invert finds the name\'s semitone count and names the complement.',
			'// This one line of arithmetic subsumes all three memorized rules:',
			'//   - semitones sum to 12    (s and 12-s, by construction)',
			'//   - numbers sum to 9       (12 semitones = 7 letter steps, so the',
			'//                             step counts split 7, and each number is',
			'//                             steps+1: (a+1)+(b+1) = 7+2 = 9)',
			'//   - quality flips m<->M, P stays, TT stays (visible by symmetry in',
			'//                             the table: it reads m/M-mirrored from',
			'//                             both ends, with P1/P4/P5/P8 and the',
			'//                             central TT sitting on the axis)',
			'func Invert(name string) string {',
			'	for s, n := range names {',
			'		if n == name {',
			'			return names[12-s]',
			'		}',
			'	}',
			'	return ""',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why a distance, not a pair of notes</h3>' +
			'<p>Everything melodic and harmonic is <em>translation-invariant</em>: ' +
			'shift every note of a tune up 7 semitones and it is the same tune, ' +
			'just higher. What survives the shift is exactly the set of distances ' +
			'between the notes — the intervals. That’s why ear training drills ' +
			'intervals and not note names: your ear has no absolute reference (for ' +
			'most people), but it measures distances superbly. It is also why the ' +
			'piano is such a good interval instrument — equal distances are equal ' +
			'physical spans, so a P5 <em>looks and feels</em> identical everywhere ' +
			'on the keyboard, regardless of which keys are black.</p>' +
			'<h3>The inversion arithmetic, and the classic off-by-one</h3>' +
			'<p>People are often surprised that interval numbers sum to 9 rather ' +
			'than 8 when the pieces make one octave. The reason is that interval ' +
			'numbers are <strong>inclusive counts of letter names</strong>, not ' +
			'step counts: C→E is a “third” because you count C,&nbsp;D,&nbsp;E — ' +
			'three letters for two steps. Two intervals tiling an octave share the ' +
			'middle note, so it gets counted twice: 7 steps split into a+b, but ' +
			'the numbers are (a+1)+(b+1)&nbsp;=&nbsp;9. The semitone form has no ' +
			'such trap — s and 12−s, done — which is exactly why the solution ' +
			'computes inversion on the semitone line and lets the table translate ' +
			'back to names.</p>' +
			'<h3>At the piano</h3>' +
			'<p>Inversion is a working tool, not trivia. To play a note a minor ' +
			'third <em>below</em> a target, think “major sixth up, drop an ' +
			'octave” — same key, and often the easier mental move. Chord shapes ' +
			'invert the same way: the m3+M3 stack of a C major triad reappears as ' +
			'M3+P4, then P4+m3, in its inversions, and recognizing those interval ' +
			'shapes by feel is how pianists read chords faster than note-by-note. ' +
			'And the one distance with no inversion partner — the tritone — is the ' +
			'engine of dominant-seventh tension you’ll meet again in the chord ' +
			'problems.</p>',
		],
		complexity: { time: 'O(1) — a fixed 13-entry table lookup (Invert scans at most 13 names)', space: 'O(1)' },
	});
})();
