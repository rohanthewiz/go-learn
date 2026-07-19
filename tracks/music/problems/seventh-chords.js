/* seventh-chords — Chords (Medium). The five seventh-chord qualities as
 * semitone stacks: maj7 {0,4,7,11}, dominant 7 {0,4,7,10}, m7 {0,3,7,10},
 * m7b5 {0,3,6,10}, dim7 {0,3,6,9}; the seventh's letter is root + 6. The
 * harness pins Cmaj7, G7 (THE dominant of C, carrying the B-F tritone),
 * Dm7 (the ii of C), Bm7b5 (half-diminished, ii of C minor), Bdim7 (the
 * seventh flattens again: Ab), and F7 (whose seventh Eb must be spelled
 * with the letter E).
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// The five qualities drawn as dot-stacks on one semitone axis. What the
	// eye should take away: the left four are lopsided, dim7 alone is evenly
	// spaced (3+3+3, and 3 more back to the octave); the dominant column
	// carries the tritone between its third and seventh. No <marker>
	// elements, so nothing needs id-namespacing.
	var DIAGRAM = (function () {
		var y = function (s) { return 205 - 14 * s; };
		var cols = [
			{ x: 110, name: 'maj7', iv: [0, 4, 7, 11] },
			{ x: 195, name: '7', iv: [0, 4, 7, 10] },
			{ x: 280, name: 'm7', iv: [0, 3, 7, 10] },
			{ x: 365, name: 'm7b5', iv: [0, 3, 6, 10] },
			{ x: 450, name: 'dim7', iv: [0, 3, 6, 9] },
		];
		var s = '<svg class="dg" viewBox="0 0 520 252" width="520" height="252" role="img" ' +
			'aria-label="the five seventh qualities as semitone stacks from 0; dim7 is the only evenly spaced one; the dominant column holds a tritone between third and seventh">' +
			'<text x="20" y="20" class="lbl">the five qualities as semitone stacks — dim7 is the evenly spaced one</text>';
		// left axis: tick labels for every semitone any stack uses
		var ticks = [0, 3, 4, 6, 7, 9, 10, 11];
		for (var t = 0; t < ticks.length; t++) {
			s += '<text x="64" y="' + (y(ticks[t]) + 4) + '" text-anchor="end" class="lbl">' + ticks[t] + '</text>';
		}
		for (var c = 0; c < cols.length; c++) {
			var col = cols[c];
			s += '<line x1="' + col.x + '" y1="' + y(0) + '" x2="' + col.x + '" y2="' + y(col.iv[3]) +
				'" stroke="currentColor" stroke-opacity="0.3"/>';
			for (var k = 0; k < 4; k++) {
				// root = accent; dim7 all ok (the even stack); sevenths = warn
				var fill = k === 0 ? 'var(--accent)' : col.name === 'dim7' ? 'var(--ok)' : k === 3 ? 'var(--warn)' : 'currentColor';
				s += '<circle cx="' + col.x + '" cy="' + y(col.iv[k]) + '" r="7" fill="' + fill + '"/>';
			}
			s += '<text x="' + col.x + '" y="228" text-anchor="middle" class="lbl">' + col.name + '</text>';
		}
		// the dominant's tritone: 3rd (4) to 7th (10) is 6 semitones
		s += '<line x1="207" y1="' + y(4) + '" x2="207" y2="' + y(10) + '" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="4 3"/>' +
			'<text x="214" y="' + (y(7) + 4) + '" class="lbl" style="fill:var(--warn)">tritone</text>' +
			// dim7's equal gaps
			'<text x="464" y="' + (y(1.5) + 4) + '" class="lbl" style="fill:var(--ok)">3</text>' +
			'<text x="464" y="' + (y(4.5) + 4) + '" class="lbl" style="fill:var(--ok)">3</text>' +
			'<text x="464" y="' + (y(7.5) + 4) + '" class="lbl" style="fill:var(--ok)">3</text>' +
			'<text x="20" y="246" class="lbl">dim7: 0-3-6-9, and 9 is 3 below 12 — minor thirds all the way around the octave</text>' +
			'</svg>';
		return s;
	})();

	T.problem({
		id: 'seventh-chords',
		title: 'Seventh Chords: The Five Qualities',
		nav: 'seventh chords',
		difficulty: 'Medium',
		category: 'Chords',
		task: 'Implement Seventh(root, quality) — spell maj7 / 7 / m7 / m7b5 / dim7 chords; the seventh sits 6 letters above the root.',

		prose: [
			'<h2>Seventh Chords: The Five Qualities</h2>' +
			'<p>Stack one more third on a triad and you get a <em>seventh chord</em> ' +
			'— four notes, and the sound of essentially all jazz and most of what ' +
			'came after Bach. The construction is the triad algorithm plus one row: ' +
			'the seventh\'s letter is <strong>6 letters</strong> above the root ' +
			'(root, +2, +4, +6 — every other letter, one full snowman), and its ' +
			'accidental is chosen by semitone count exactly as before. Five ' +
			'qualities cover the repertoire:</p>',
			{ lang: 'txt', code: 'quality   semitones      triad + seventh          lead-sheet\nmaj7      {0,4,7,11}     major  + major 7th       Cmaj7\n7         {0,4,7,10}     major  + minor 7th       C7      ("dominant")\nm7        {0,3,7,10}     minor  + minor 7th       Cm7\nm7b5      {0,3,6,10}     dim    + minor 7th       Cm7b5   ("half-diminished")\ndim7      {0,3,6,9}      dim    + diminished 7th  Cdim7   ("fully diminished")' },
			'<p>Why these five matter more than the arithmetic suggests:</p>' +
			'<ul>' +
			'<li><strong>ii&ndash;V&ndash;I lives here.</strong> The most-played ' +
			'progression in jazz is three seventh chords: in C, ' +
			'<code>Dm7&nbsp;&rarr;&nbsp;G7&nbsp;&rarr;&nbsp;Cmaj7</code> — m7, ' +
			'dominant, maj7. Learn to spell the five qualities and you can build ' +
			'the progression in any key mechanically.</li>' +
			'<li><strong>The dominant 7 contains a tritone that demands ' +
			'resolution.</strong> G7 is G&nbsp;B&nbsp;D&nbsp;F, and B&ndash;F — its ' +
			'third and seventh — are 6 semitones apart, the most restless interval ' +
			'there is. B leans up a semitone to C; F leans down a semitone to E; ' +
			'together they collapse onto C&ndash;E, the heart of the C&nbsp;major ' +
			'chord. That two-semitone squeeze is <em>why</em> V7 resolves to I, ' +
			'not a convention someone decreed.</li>' +
			'<li><strong>dim7 divides the octave evenly.</strong> {0,3,6,9} is a ' +
			'stack of minor thirds all the way around: 3+3+3, and 3 more returns ' +
			'to the octave. The chord has 3-fold symmetry — Cdim7, Ebdim7, Gbdim7, ' +
			'and Adim7 are the same four keys under your hand — which is exactly ' +
			'what makes it music\'s universal pivot for sliding between keys.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Seventh(root, quality)</code>: four letters by ' +
			'+0/+2/+4/+6 steps, four accidentals by semitone count. Watch the ' +
			'harness pins where letter and key diverge: Bdim7\'s seventh is Ab ' +
			'(the letter A, flattened), and F7\'s seventh is Eb (the letter E, ' +
			'flattened) — never G# or D#.</p>' +
			'<div class="tip">Same engine as the triads problem, one extra ' +
			'chord tone. If you factor the &ldquo;letter + target pitch class ' +
			'&rarr; spelled note&rdquo; step into a helper, this problem is a ' +
			'table swap — and that helper is the single most reusable function ' +
			'in all of music theory.</div>',
		],

		starter: [
			'package main',
			'',
			'// Seventh returns the four spelled notes of the seventh chord built',
			'// on root: [root, third, fifth, seventh]. quality is one of "maj7",',
			'// "7" (dominant), "m7", "m7b5", "dim7"; any other returns nil.',
			'//',
			'// Semitones above the root:',
			'//',
			'//	maj7 {0,4,7,11}   7 {0,4,7,10}   m7 {0,3,7,10}',
			'//	m7b5 {0,3,6,10}   dim7 {0,3,6,9}',
			'//',
			'// Letters: +2, +4, and +6 letters above the root on the cycle',
			'// C D E F G A B (wrapping B -> C). Each upper note takes whatever',
			'// accidental lands its pitch class the required semitones above the',
			'// root: "" natural, "#" / "b" one semitone up / down, "x" / "bb" two.',
			'//',
			'// root is a letter A-G plus an optional accidental suffix ("C", "Eb",',
			'// "F#"). Natural-letter pitch classes: C=0 D=2 E=4 F=5 G=7 A=9 B=11.',
			'func Seventh(root, quality string) []string {',
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
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		name    string',
			'		root    string',
			'		quality string',
			'		want    string',
			'	}',
			'	cases := []tc{',
			'		{"Cmaj7 — major triad + major seventh: B, one semitone shy of the octave", "C", "maj7", "C E G B"},',
			'		{"G7 — THE dominant of C: its third and seventh (B, F) are the tritone that collapses onto C-E", "G", "7", "G B D F"},',
			'		{"Dm7 — the ii of C; Dm7 G7 Cmaj7 is the ii-V-I these five qualities exist for", "D", "m7", "D F A C"},',
			'		{"Bm7b5 — half-diminished: dim triad, plain minor seventh (A stays natural)", "B", "m7b5", "B D F A"},',
			'		{"Bdim7 — fully diminished: the seventh flattens again, A becomes Ab", "B", "dim7", "B D F Ab"},',
			'		{"F7 — the flat seventh is Eb, spelled with the letter E, never D#", "F", "7", "F A C Eb"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			got := strings.Join(Seventh(c.root, c.quality), " ")',
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
			'// naturalPC maps letters to pitch classes (C=0 .. B=11); the uneven',
			'// gaps (E-F and B-C are 1 semitone) are why the same quality needs',
			'// different accidentals on different roots.',
			'var naturalPC = map[byte]int{\'C\': 0, \'D\': 2, \'E\': 4, \'F\': 5, \'G\': 7, \'A\': 9, \'B\': 11}',
			'',
			'var accSemis = map[string]int{"": 0, "#": 1, "b": -1, "x": 2, "bb": -2}',
			'var accName = map[int]string{-2: "bb", -1: "b", 0: "", 1: "#", 2: "x"}',
			'',
			'// seventhIv: semitones above the root. Read the table down a column',
			'// and each quality differs from its neighbor by ONE semitone in ONE',
			'// slot — the five qualities are a gradual darkening: maj7 -> 7 drops',
			'// the seventh, 7 -> m7 drops the third, m7 -> m7b5 drops the fifth,',
			'// m7b5 -> dim7 drops the seventh again.',
			'var seventhIv = map[string][4]int{',
			'	"maj7": {0, 4, 7, 11},',
			'	"7":    {0, 4, 7, 10},',
			'	"m7":   {0, 3, 7, 10},',
			'	"m7b5": {0, 3, 6, 10},',
			'	"dim7": {0, 3, 6, 9},',
			'}',
			'',
			'// spellAbove is the reusable core of all chord spelling: given the',
			'// root\'s letter index and pitch class, produce the note letterSteps',
			'// letters up whose pitch class sits semis above the root. The letter',
			'// is forced by mod-7 arithmetic; only the accidental is computed.',
			'func spellAbove(li, rootPC, letterSteps, semis int) string {',
			'	const letters = "CDEFGAB"',
			'	tl := letters[(li+letterSteps)%7]',
			'	target := (rootPC + semis) % 12',
			'	// Pitch-class differences are mod-12 ambiguous (a flat shows up',
			'	// as +11); renormalize to the nearest representative. Chords in',
			'	// this problem land in -2..+2, covered by the five accidentals.',
			'	delta := ((target-naturalPC[tl])%12 + 12) % 12',
			'	if delta > 6 {',
			'		delta -= 12',
			'	}',
			'	return string(tl) + accName[delta]',
			'}',
			'',
			'func Seventh(root, quality string) []string {',
			'	iv, ok := seventhIv[quality]',
			'	if !ok {',
			'		return nil',
			'	}',
			'	const letters = "CDEFGAB"',
			'	li := 0',
			'	for i := 0; i < len(letters); i++ {',
			'		if letters[i] == root[0] {',
			'			li = i',
			'		}',
			'	}',
			'	rootPC := ((naturalPC[root[0]]+accSemis[root[1:]])%12 + 12) % 12',
			'	// A seventh chord is the triad algorithm plus one more letter',
			'	// step: every chord tone is "skip a letter" from the last, which',
			'	// is why a correctly spelled seventh chord stacks on consecutive',
			'	// staff lines (or spaces) with no gaps and no repeats.',
			'	steps := [4]int{0, 2, 4, 6}',
			'	out := make([]string, 4)',
			'	for k, step := range steps {',
			'		out[k] = spellAbove(li, rootPC, step, iv[k])',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The tritone engine</h3>' +
			'<p>The dominant seventh is the only quality here containing a tritone ' +
			'between its third and seventh — count it in the table: 10&nbsp;&minus;' +
			'&nbsp;4&nbsp;=&nbsp;6. That interval is the engine of tonal harmony. ' +
			'In G7, the B wants to rise to C (it is the <em>leading tone</em>, one ' +
			'semitone below the tonic) and the F wants to fall to E; both moves ' +
			'are single semitones, the smallest steps the system has, and they ' +
			'land on the root and third of C&nbsp;major. A ii&ndash;V&ndash;I is ' +
			'this machine with a preparation stage bolted on: Dm7 shares two ' +
			'notes with G7 (F and A... and D moving to D), so the bass falls in ' +
			'fifths — D,&nbsp;G,&nbsp;C — while the upper voices barely move. ' +
			'Maximum harmonic motion, minimum finger motion.</p>' +
			'<h3>m7b5 vs dim7 — the pair people mix up</h3>' +
			'<p>Both sit on a diminished triad; the seventh tells them apart. ' +
			'm7b5 keeps a plain minor seventh (Bm7b5 has A&nbsp;natural — it is ' +
			'&ldquo;half&rdquo; diminished), while dim7 diminishes the seventh ' +
			'too (Bdim7 has Ab — &ldquo;fully&rdquo; diminished). One is a workaday ' +
			'ii chord in minor keys; the other is the symmetric pivot. The ' +
			'symmetry is worth staring at: {0,3,6,9} is invariant under rotation ' +
			'by 3, so only <strong>three distinct dim7 chords exist</strong> on ' +
			'the whole piano — every one of the twelve roots lands on one of ' +
			'three shapes. Composers exploit this shamelessly: respell one note ' +
			'of a dim7 and it becomes a dominant of somewhere else entirely, ' +
			'which is how 19th-century music teleports between distant keys.</p>' +
			'<h3>At the piano</h3>' +
			'<p>Practice the five qualities on one root as a <em>melting</em> ' +
			'exercise — Cmaj7, C7, Cm7, Cm7b5, Cdim7 — because each step lowers ' +
			'exactly one note by exactly one key (seventh, third, fifth, seventh ' +
			'again). Your hand learns the qualities as a gradient of darkening ' +
			'color rather than five unrelated shapes, and the table in the ' +
			'solution (<code>seventhIv</code>) is literally that exercise written ' +
			'as data.</p>',
		],
		complexity: { time: 'O(1) — four chord tones, each a table lookup plus constant mod arithmetic', space: 'O(1)' },
	});
})();
