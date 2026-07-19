/* scale-fingering — At the Piano (Medium). Right-hand major-scale fingering
 * derived as an algorithm instead of a memorized chart: for C, G, D, A, E the
 * one-octave RH fingering is 1 2 3 1 2 3 4 5, and F major flips to
 * 1 2 3 4 1 2 3 4 because the thumb must never land on the black Bb. The
 * harness pins all six tonics' fingerings plus the thumb notes for C (C, F)
 * and F (F, C).
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// The thumb-under crossing: fingers 1-2-3 play, the thumb passes UNDER
	// the hand while 3 holds, and lands ready for the next group of four.
	// Marker id namespaced (dgArrowMusSF) — all tracks share the page's id
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 200" width="560" height="200" role="img" aria-label="C major right-hand fingering 1 2 3 1 2 3 4 5: the thumb passes under after finger 3; F major shifts to 1 2 3 4 1 2 3 4 so the thumb skips the black B-flat">' +
		'<text x="20" y="22" class="lbl">C major, right hand: two groups — 1 2 3, then 1 2 3 4 5 — stitched by a thumb-under</text>' +
		// C major note row
		'<g text-anchor="middle">' +
		'<text x="60" y="58">C</text><text x="120" y="58">D</text><text x="180" y="58">E</text>' +
		'<text x="240" y="58">F</text><text x="300" y="58">G</text><text x="360" y="58">A</text>' +
		'<text x="420" y="58">B</text><text x="480" y="58">C</text>' +
		'<text x="60" y="82" style="fill:var(--accent)">1</text><text x="120" y="82">2</text><text x="180" y="82">3</text>' +
		'<text x="240" y="82" style="fill:var(--accent)">1</text><text x="300" y="82">2</text><text x="360" y="82">3</text>' +
		'<text x="420" y="82">4</text><text x="480" y="82">5</text>' +
		'</g>' +
		// thumb-under arc from finger 3 (E) to thumb (F)
		'<path d="M 180 92 C 195 116 225 116 238 92" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowMusSF)"/>' +
		'<text x="210" y="126" text-anchor="middle" class="lbl" style="fill:var(--warn)">thumb passes under</text>' +
		// F major row: the shifted pattern
		'<text x="20" y="152" class="lbl">F major: Bb is black, the thumb may not take it — the crossing moves one note later</text>' +
		'<g text-anchor="middle" class="lbl">' +
		'<text x="60" y="176">F</text><text x="120" y="176">G</text><text x="180" y="176">A</text>' +
		'<text x="240" y="176" style="fill:var(--warn)">Bb</text><text x="300" y="176">C</text><text x="360" y="176">D</text>' +
		'<text x="420" y="176">E</text><text x="480" y="176">F</text>' +
		'<text x="60" y="194" style="fill:var(--accent)">1</text><text x="120" y="194">2</text><text x="180" y="194">3</text>' +
		'<text x="240" y="194" style="fill:var(--warn)">4</text><text x="300" y="194" style="fill:var(--accent)">1</text><text x="360" y="194">2</text>' +
		'<text x="420" y="194">3</text><text x="480" y="194">4</text>' +
		'</g>' +
		'<defs><marker id="dgArrowMusSF" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'scale-fingering',
		title: 'Right-Hand Scale Fingering',
		nav: 'scale fingering',
		difficulty: 'Medium',
		category: 'At the Piano',
		task: 'Derive the right-hand one-octave major-scale fingering (and the notes the thumb takes) for C, G, D, A, E, and F from one rule: the thumb never plays a black key.',

		prose: [
			'<h2>Right-Hand Scale Fingering</h2>' +
			'<p>Sit at the piano and play a one-octave C major scale with the ' +
			'right hand: eight notes, five fingers. The arithmetic alone forces ' +
			'a <strong>crossing</strong> — somewhere, the hand has to relocate. ' +
			'Piano technique solves it with the <em>thumb-under</em>: fingers ' +
			'1&nbsp;2&nbsp;3 play, then the thumb passes underneath the hand ' +
			'while finger 3 holds its key, landing ready to start a fresh group ' +
			'of 1&nbsp;2&nbsp;3&nbsp;4&nbsp;5. Eight notes split 3&nbsp;+&nbsp;5, ' +
			'one crossing, done: <code>1 2 3 1 2 3 4 5</code>.</p>' +
			'<p>Method books print a fingering chart per key, and students ' +
			'memorize it. But for the sharp-side keys the chart is not arbitrary ' +
			'— it is <em>derivable</em> from a single physical fact: ' +
			'<strong>the thumb is short</strong>. It hangs below the hand, and ' +
			'the black keys are raised and set back toward the fallboard. ' +
			'Putting the thumb on a black key drags the whole hand into the ' +
			'keys and wrecks the line. Hence the master rule:</p>' +
			'<div class="tip"><strong>The thumb never plays a black key.</strong> ' +
			'Every standard scale fingering, in every key, both hands, is a ' +
			'solution to that one constraint.</div>' +
			'<p>Scope this honestly: for <strong>C, G, D, A, E major</strong> ' +
			'the right hand plays <code>1 2 3 1 2 3 4 5</code> — in each of ' +
			'those keys, scale degrees 1 and 4 are white, so the thumb lands ' +
			'legally and the chart is pure rule. <strong>F major</strong> is the ' +
			'taught exception: its 4th note is B♭, a black key, exactly where ' +
			'the thumb would land. The crossing moves one note later — ' +
			'<code>1 2 3 4 1 2 3 4</code> — putting the thumb on F and C ' +
			'(both white) instead of F and B♭. Same rule, different solution.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>RHFingering(tonic)</code> returning the eight ' +
			'finger numbers, tonic to tonic, for tonics C, G, D, A, E, F — ' +
			'derived, not looked up: spell the major scale, and <em>if the 4th ' +
			'scale note is a black key</em> (only F major\'s B♭ among these ' +
			'six), answer <code>1 2 3 4 1 2 3 4</code>; otherwise ' +
			'<code>1 2 3 1 2 3 4 5</code>. Also implement ' +
			'<code>ThumbNotes(tonic)</code>: the spelled scale notes on which ' +
			'the thumb (finger 1) lands.</p>',
			{ lang: 'txt', code: 'C major:  C  D  E  F  G  A  B  C     F major:  F  G  A  Bb C  D  E  F\n          1  2  3  1  2  3  4  5               1  2  3  4  1  2  3  4\nthumb on: C, F  (degrees 1 and 4)    thumb on: F, C  (degrees 1 and 5)' },
			'<div class="tip">Flat-side keys (B♭, E♭, A♭ major&hellip;) obey the ' +
			'same thumb-on-white rule but their tonic itself is black or the ' +
			'white notes fall differently, so the pattern starts <em>mid-group</em> ' +
			'— B♭ major RH begins with finger 2 and still puts the thumb only on ' +
			'C and F. Deriving those start offsets is a fine exercise; it is out ' +
			'of scope here.</div>',
		],

		starter: [
			'package main',
			'',
			'// RHFingering returns the right-hand fingering for a one-octave major',
			'// scale, tonic to tonic: exactly 8 finger numbers (1 = thumb .. 5 =',
			'// pinky). Valid tonics: "C", "G", "D", "A", "E", "F".',
			'//',
			'// Derive it, don\'t table it:',
			'//   - spell the major scale from the tonic (whole/half steps',
			'//     2 2 1 2 2 2 1, one of each letter C D E F G A B in cycle)',
			'//   - if the 4th scale note is a BLACK key (pitch classes 1, 3, 6,',
			'//     8, 10) the thumb may not take it: return 1 2 3 4 1 2 3 4',
			'//   - otherwise return 1 2 3 1 2 3 4 5',
			'// Among these six tonics only F major (4th note Bb) hits the first',
			'// branch.',
			'func RHFingering(tonic string) []int {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// ThumbNotes returns the spelled scale notes (no octave numbers, e.g.',
			'// "Bb") on which the thumb lands — the scale positions fingered 1 in',
			'// RHFingering, in playing order.',
			'func ThumbNotes(tonic string) []string {',
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
			'	// Render finger slices as "1 2 3 1 2 3 4 5" and note slices as',
			'	// "C F" so want/got compare as exact strings.',
			'	fmtInts := func(xs []int) string {',
			'		parts := make([]string, 0, len(xs))',
			'		for _, x := range xs {',
			'			parts = append(parts, fmt.Sprintf("%d", x))',
			'		}',
			'		return strings.Join(parts, " ")',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"C major: no black keys anywhere, the pure 3+5 pattern",',
			'			"1 2 3 1 2 3 4 5",',
			'			func() string { return fmtInts(RHFingering("C")) }},',
			'		{"G major: the F# sits under finger 4, never the thumb — same pattern as C",',
			'			"1 2 3 1 2 3 4 5",',
			'			func() string { return fmtInts(RHFingering("G")) }},',
			'		{"D major: two sharps (F#, C#) under fingers 3 and 4 — thumb degrees still white",',
			'			"1 2 3 1 2 3 4 5",',
			'			func() string { return fmtInts(RHFingering("D")) }},',
			'		{"A major: three sharps, and still 1 2 3 1 2 3 4 5 — the rule, not a coincidence",',
			'			"1 2 3 1 2 3 4 5",',
			'			func() string { return fmtInts(RHFingering("A")) }},',
			'		{"E major: four sharps and the thumb notes E and A are both white",',
			'			"1 2 3 1 2 3 4 5",',
			'			func() string { return fmtInts(RHFingering("E")) }},',
			'		{"F major: the 4th note is the black Bb — the crossing moves one note later",',
			'			"1 2 3 4 1 2 3 4",',
			'			func() string { return fmtInts(RHFingering("F")) }},',
			'		{"thumb notes in C: degrees 1 and 4 (C and F)",',
			'			"C F",',
			'			func() string { return strings.Join(ThumbNotes("C"), " ") }},',
			'		{"thumb notes in F: degrees 1 and 5 (F and C) — Bb is refused",',
			'			"F C",',
			'			func() string { return strings.Join(ThumbNotes("F"), " ") }},',
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
			'import "strings"',
			'',
			'// letterPC maps each natural letter to its semitone within the C-based',
			'// octave (C=0 D=2 E=4 F=5 G=7 A=9 B=11). Everything below runs on two',
			'// number lines at once — the 7-step LETTER cycle for spelling, the',
			'// 12-step SEMITONE cycle for which physical key — and this map is the',
			'// bridge between them.',
			'var letterPC = map[byte]int{\'C\': 0, \'D\': 2, \'E\': 4, \'F\': 5, \'G\': 7, \'A\': 9, \'B\': 11}',
			'',
			'// pitchClass of a spelled note like "Bb" or "F#": letter semitone plus',
			'// accidental offset, normalized into 0..11. Single accidentals suffice',
			'// for these six keys.',
			'func pitchClass(note string) int {',
			'	pc := letterPC[note[0]]',
			'	for _, r := range note[1:] {',
			'		switch r {',
			'		case \'#\':',
			'			pc++',
			'		case \'b\':',
			'			pc--',
			'		}',
			'	}',
			'	return ((pc % 12) + 12) % 12',
			'}',
			'',
			'// isBlack reports whether a spelled note falls on a black key. The',
			'// black keys are pitch classes {1, 3, 6, 8, 10} — the five gaps in',
			'// the white-key pattern.',
			'func isBlack(note string) bool {',
			'	switch pitchClass(note) {',
			'	case 1, 3, 6, 8, 10:',
			'		return true',
			'	}',
			'	return false',
			'}',
			'',
			'// spellMajor returns the 8 spelled notes of a one-octave major scale,',
			'// tonic to tonic. Spelling is letters-first: each scale step advances',
			'// exactly one letter in the C D E F G A B cycle, then the accidental',
			'// is whatever makes the semitone step match the major pattern',
			'// 2 2 1 2 2 2 1. That guarantees one of each letter — the definition',
			'// of correct spelling — instead of picking enharmonic spellings by',
			'// accident (F major must contain Bb, never A#).',
			'func spellMajor(tonic string) []string {',
			'	const letters = "CDEFGAB"',
			'	steps := []int{2, 2, 1, 2, 2, 2, 1}',
			'	start := strings.IndexByte(letters, tonic[0])',
			'	notes := []string{tonic}',
			'	pc := pitchClass(tonic)',
			'	for i, st := range steps {',
			'		pc = (pc + st) % 12',
			'		letter := letters[(start+i+1)%7]',
			'		// diff = how far the required pitch sits from the natural',
			'		// letter, normalized to the nearest representative so the',
			'		// wraparound at B/C compares -1 rather than +11.',
			'		diff := pc - letterPC[letter]',
			'		if diff > 6 {',
			'			diff -= 12',
			'		} else if diff < -6 {',
			'			diff += 12',
			'		}',
			'		acc := ""',
			'		if diff == 1 {',
			'			acc = "#"',
			'		} else if diff == -1 {',
			'			acc = "b"',
			'		}',
			'		notes = append(notes, string(letter)+acc)',
			'	}',
			'	return notes',
			'}',
			'',
			'// RHFingering derives the fingering instead of tabling it. The only',
			'// decision is WHERE the single thumb-under crossing goes, and the',
			'// thumb-never-on-black rule decides it: the default pattern puts the',
			'// thumb on scale degrees 1 and 4, so if degree 4 is black (F major\'s',
			'// Bb among these tonics) the crossing slides one note later and the',
			'// thumb takes degree 5 instead.',
			'func RHFingering(tonic string) []int {',
			'	scale := spellMajor(tonic)',
			'	if isBlack(scale[3]) {',
			'		// Groups 1234 + 1234: thumb on degrees 1 and 5, both white.',
			'		return []int{1, 2, 3, 4, 1, 2, 3, 4}',
			'	}',
			'	// Groups 123 + 12345: thumb on degrees 1 and 4, top tonic under',
			'	// the pinky — the hand finishes closed, ready to reverse.',
			'	return []int{1, 2, 3, 1, 2, 3, 4, 5}',
			'}',
			'',
			'// ThumbNotes reads the answer back off the fingering: the scale notes',
			'// at the positions fingered 1. Deriving it from RHFingering (rather',
			'// than re-deciding) keeps the two functions incapable of disagreeing.',
			'func ThumbNotes(tonic string) []string {',
			'	scale := spellMajor(tonic)',
			'	fingers := RHFingering(tonic)',
			'	var out []string',
			'	for i, f := range fingers {',
			'		if f == 1 {',
			'			out = append(out, scale[i])',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why crossings exist at all</h3>' +
			'<p>Five fingers, seven letters per octave — every scale longer than ' +
			'a five-finger position needs the hand to relocate, and the ' +
			'thumb-under is the relocation that keeps the notes connected: ' +
			'finger 3 (or 4) holds its key while the thumb travels underneath, ' +
			'so there is never a gap in sound. The fingering chart is really a ' +
			'<em>crossing schedule</em>: it answers one question — after which ' +
			'note does the thumb pass under? Groups of 3&nbsp;+&nbsp;5 or ' +
			'4&nbsp;+&nbsp;4 both cover the octave\'s eight notes with one ' +
			'crossing; the thumb rule picks between them.</p>' +
			'<h3>Why "thumb on white" is the master rule</h3>' +
			'<p>The thumb is shorter than the other fingers and strikes with its ' +
			'side, near the front edge of the keyboard. Black keys are raised ' +
			'and recessed; a thumb on one forces the whole hand up and in, ' +
			'ruining the geometry for every finger around it. So fingerings are ' +
			'solved backwards: fix the thumb on white keys, then distribute ' +
			'2&ndash;3&ndash;4 (long fingers, happy on black keys) over whatever ' +
			'lies between. In G, D, A, E major the sharps all land under fingers ' +
			'3 and 4 <em>automatically</em> — which is why five different keys ' +
			'share one fingering, and why that fingering was never arbitrary.</p>' +
			'<h3>The classic misconception</h3>' +
			'<p>Students assume F major is "irregular", one more thing to ' +
			'memorize. It is the opposite: F major is the rule <em>working</em>. ' +
			'<code>1 2 3 1 2 3 4 5</code> would put the thumb squarely on B♭; ' +
			'the constraint rejects it, and <code>1 2 3 4 1 2 3 4</code> is the ' +
			'nearest legal solution — thumb on F and C. The same logic run on ' +
			'flat keys (where even the tonic may be black) yields fingerings ' +
			'that start mid-group, like B♭ major\'s RH beginning on finger 2 with ' +
			'the thumb still touching only C and F. One rule, every chart.</p>' +
			'<h3>At the piano</h3>' +
			'<p>Practice the crossing, not the scale: play just degrees ' +
			'3&ndash;4 (E&ndash;F in C major, fingers 3&ndash;1) as a two-note ' +
			'loop until the thumb arrives under a quiet, level hand. Teachers ' +
			'call the habit <em>thumb preparation</em> — the thumb starts ' +
			'traveling the moment it is released, so it is already hovering over ' +
			'its next key when the time comes. If the elbow swings out on the ' +
			'crossing, the thumb was late.</p>',
		],
		complexity: { time: 'O(1) — a fixed 8-note spelling pass and one black-key test', space: 'O(1)' },
	});
})();
