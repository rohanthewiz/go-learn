/* diatonic-chords — Harmony (Medium). The seven triads a major key owns:
 * build the correctly spelled major scale (letter-advance + 2212221), stack
 * scale thirds on every degree, and the qualities fall out as the fixed
 * pattern maj min min maj maj min dim — I ii iii IV V vi vii° in Roman
 * numerals. The harness pins the full C major and E-flat major chord lists,
 * the vii° of G major (F#dim — the sharp must be spelled), and Roman
 * numerals across four keys, including the '°' on vii.
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// Seven boxes, one per scale degree, stroke-coded by triad quality.
	// The point of the picture: the pattern row (I ii iii IV V vi vii°) is
	// identical in every major key — only the letter row changes.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 168" width="560" height="168" role="img" aria-label="the seven diatonic triads of C major with their Roman numerals; major, minor and diminished qualities always fall on the same degrees">' +
		'<text x="20" y="22" class="lbl">C major’s seven chords — the quality pattern is the same in EVERY major key</text>' +
		// degree boxes: major = accent, minor = ok, diminished = warn
		'<rect x="20"  y="38" width="68" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="96"  y="38" width="68" height="40" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<rect x="172" y="38" width="68" height="40" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<rect x="248" y="38" width="68" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="324" y="38" width="68" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="400" y="38" width="68" height="40" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<rect x="476" y="38" width="68" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="54"  y="63" text-anchor="middle">C</text>' +
		'<text x="130" y="63" text-anchor="middle">Dm</text>' +
		'<text x="206" y="63" text-anchor="middle">Em</text>' +
		'<text x="282" y="63" text-anchor="middle">F</text>' +
		'<text x="358" y="63" text-anchor="middle">G</text>' +
		'<text x="434" y="63" text-anchor="middle">Am</text>' +
		'<text x="510" y="63" text-anchor="middle">Bdim</text>' +
		// the numeral row — what a band actually calls out
		'<text x="54"  y="102" text-anchor="middle" style="fill:var(--accent)">I</text>' +
		'<text x="130" y="102" text-anchor="middle" style="fill:var(--ok)">ii</text>' +
		'<text x="206" y="102" text-anchor="middle" style="fill:var(--ok)">iii</text>' +
		'<text x="282" y="102" text-anchor="middle" style="fill:var(--accent)">IV</text>' +
		'<text x="358" y="102" text-anchor="middle" style="fill:var(--accent)">V</text>' +
		'<text x="434" y="102" text-anchor="middle" style="fill:var(--ok)">vi</text>' +
		'<text x="510" y="102" text-anchor="middle" style="fill:var(--warn)">vii°</text>' +
		'<text x="20" y="130" class="lbl">uppercase = major · lowercase = minor · ° = diminished</text>' +
		'<text x="20" y="152" class="lbl">stack scale thirds on each degree: root, +2 scale steps, +4 scale steps — quality falls out of the scale itself</text>' +
		'</svg>';

	T.problem({
		id: 'diatonic-chords',
		title: 'Diatonic Chords: the Chords a Key Owns',
		nav: 'diatonic chords',
		difficulty: 'Medium',
		category: 'Harmony',
		task: 'Implement DiatonicTriads (the seven triads of a major key, spelled from the scale) and RomanNumeral (I ii iii IV V vi vii°).',

		prose: [
			'<h2>Diatonic Chords: the Chords a Key Owns</h2>' +
			'<p>Watch a Nashville session band cut a song they heard thirty seconds ' +
			'ago: nobody passes out sheet music, someone just says “it’s a ' +
			'1&ndash;5&ndash;6&ndash;4 in E” and everyone plays it. That works because ' +
			'every major key <em>owns</em> exactly seven chords — one built on each ' +
			'scale degree — and the pattern of qualities is identical in all twelve ' +
			'keys. Learn the pattern once and a number names a chord in any key. That ' +
			'is the Nashville Number System, and it is also what Roman-numeral analysis ' +
			'in classical harmony writes down: not <em>which</em> chord, but which ' +
			'<em>degree of the key</em> the chord sits on.</p>' +
			'<p>Where do the seven chords come from? Take the major scale and, on each ' +
			'degree, stack two more <strong>scale</strong> notes a third apart — ' +
			'skip-a-note, skip-a-note. No new accidentals, no choices: the key signature ' +
			'decides everything. Because the major scale’s step pattern ' +
			'(2&nbsp;2&nbsp;1&nbsp;2&nbsp;2&nbsp;2&nbsp;1) is fixed, the sizes of those ' +
			'stacked thirds are fixed too, so the triad qualities land on the same ' +
			'degrees in every key:</p>',
			{ lang: 'txt', code: 'C major scale: C  D  E  F  G  A  B\n\ndegree  triad    semitones     quality      name    numeral\n  1     C E G    4 + 3 = M3+m3  major       "C"       I\n  2     D F A    3 + 4 = m3+M3  minor       "Dm"      ii\n  3     E G B    3 + 4          minor       "Em"      iii\n  4     F A C    4 + 3          major       "F"       IV\n  5     G B D    4 + 3          major       "G"       V\n  6     A C E    3 + 4          minor       "Am"      vi\n  7     B D F    3 + 3 = m3+m3  diminished  "Bdim"    vii°' },
			'<p>Same construction in E-flat major (scale ' +
			'Eb&nbsp;F&nbsp;G&nbsp;Ab&nbsp;Bb&nbsp;C&nbsp;D) yields Eb, Fm, Gm, Ab, Bb, ' +
			'Cm, Ddim — different letters, same quality on every slot. The vi of ' +
			'E-flat is Cm just as surely as the vi of C is Am.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p><code>DiatonicTriads(major)</code> returns the seven triads of a major ' +
			'key as <code>&quot;&lt;root&gt;&lt;suffix&gt;&quot;</code> — suffix ' +
			'<code>&quot;&quot;</code> for major, <code>&quot;m&quot;</code> for minor, ' +
			'<code>&quot;dim&quot;</code> for diminished. Roots must be the correctly ' +
			'spelled scale degrees (G major’s seventh chord is ' +
			'<code>F#dim</code>, never <code>Gbdim</code>). ' +
			'<code>RomanNumeral(major, degree)</code> returns the analysis label: ' +
			'uppercase for major, lowercase for minor, lowercase plus the literal ' +
			'<code>°</code> character for diminished.</p>' +
			'<div class="tip">Build the spelled scale first — advance the letter ' +
			'every step, force the accidental with the 2212221 pattern — then ' +
			'derive each triad’s quality from the <em>pitch classes</em> of root, ' +
			'third and fifth ({0,4,7} major, {0,3,7} minor, {0,3,6} diminished). ' +
			'Deriving quality instead of hardcoding the pattern is the whole lesson: ' +
			'the pattern is a <em>theorem</em> about the scale, and your code proves ' +
			'it for every key.</div>',
		],

		starter: [
			'package main',
			'',
			'// DiatonicTriads returns the seven triads a major key owns, one per',
			'// scale degree, as "<root><suffix>": suffix "" for major, "m" for',
			'// minor, "dim" for diminished. Roots are the correctly spelled scale',
			'// degrees of the key (one of each letter A-G in sequence, accidentals',
			'// forced by the major step pattern 2 2 1 2 2 2 1).',
			'//',
			'//   DiatonicTriads("C")  = [C Dm Em F G Am Bdim]',
			'//   DiatonicTriads("Eb") = [Eb Fm Gm Ab Bb Cm Ddim]',
			'//',
			'// Each triad stacks scale thirds: degree i uses scale notes i, i+2,',
			'// i+4 (wrapping past the octave). Quality comes from the semitone',
			'// spans root->third and root->fifth: (4,7) major, (3,7) minor,',
			'// (3,6) diminished.',
			'func DiatonicTriads(major string) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// RomanNumeral labels scale degree 1..7 of a major key for harmonic',
			'// analysis: the numeral is uppercase for a major triad, lowercase for',
			'// minor, and lowercase followed by the literal \'°\' character for',
			'// diminished — "I ii iii IV V vi vii°".',
			'func RomanNumeral(major string, degree int) string {',
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
			'	"strings"',
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
			'		{"C major, the all-white-key case: maj min min maj maj min dim",',
			'			"C Dm Em F G Am Bdim",',
			'			func() string { return strings.Join(DiatonicTriads("C"), " ") }},',
			'		{"Eb major: three flats carried by the key, and the vi chord is Cm",',
			'			"Eb Fm Gm Ab Bb Cm Ddim",',
			'			func() string { return strings.Join(DiatonicTriads("Eb"), " ") }},',
			'		{"A major, the sharp side: every minor triad root keeps its sharp spelling",',
			'			"A Bm C#m D E F#m G#dim",',
			'			func() string { return strings.Join(DiatonicTriads("A"), " ") }},',
			'		{"the vii° of G major is F#dim — spelled with the sharp, never Gb",',
			'			"F#dim",',
			'			func() string { return DiatonicTriads("G")[6] }},',
			'		{"RomanNumeral: degree 1 is the uppercase tonic I",',
			'			"I",',
			'			func() string { return RomanNumeral("C", 1) }},',
			'		{"RomanNumeral: degree 2 is lowercase ii — in Eb exactly as in C",',
			'			"ii",',
			'			func() string { return RomanNumeral("Eb", 2) }},',
			'		{"RomanNumeral: degree 5 is the uppercase dominant V",',
			'			"V",',
			'			func() string { return RomanNumeral("D", 5) }},',
			'		{"RomanNumeral: degree 7 is diminished — lowercase plus the ° sign",',
			'			"vii°",',
			'			func() string { return RomanNumeral("G", 7) }},',
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
			'// naturalPC maps a letter to its white-key pitch class. The gaps between',
			'// consecutive letters (2 2 1 2 2 2 1 starting from C) are what make the',
			'// accidental arithmetic below nontrivial — E->F and B->C are only one',
			'// semitone apart.',
			'func naturalPC(letter byte) int {',
			'	switch letter {',
			'	case \'C\':',
			'		return 0',
			'	case \'D\':',
			'		return 2',
			'	case \'E\':',
			'		return 4',
			'	case \'F\':',
			'		return 5',
			'	case \'G\':',
			'		return 7',
			'	case \'A\':',
			'		return 9',
			'	}',
			'	return 11 // B',
			'}',
			'',
			'// pitchClass parses a spelled note ("Eb", "F#", "Bb") into 0-11.',
			'// Accidentals are cumulative so double sharps/flats cost nothing extra.',
			'func pitchClass(note string) int {',
			'	pc := naturalPC(note[0])',
			'	for _, c := range note[1:] {',
			'		switch c {',
			'		case \'#\':',
			'			pc++',
			'		case \'b\':',
			'			pc--',
			'		case \'x\':',
			'			pc += 2',
			'		}',
			'	}',
			'	return ((pc % 12) + 12) % 12',
			'}',
			'',
			'// majorScale spells the seven notes of a major scale. The two number',
			'// lines run in lockstep: the LETTER line advances one letter per degree',
			'// (that is what "correctly spelled" means), while the SEMITONE line',
			'// advances by the fixed major pattern 2 2 1 2 2 2. The accidental on',
			'// each degree is whatever reconciles the two — the difference between',
			'// the pitch class the pattern demands and the letter\'s white key.',
			'func majorScale(tonic string) []string {',
			'	const letters = "CDEFGAB"',
			'	steps := [6]int{2, 2, 1, 2, 2, 2}',
			'	li := strings.IndexByte(letters, tonic[0])',
			'	pc := pitchClass(tonic)',
			'	scale := []string{tonic}',
			'	for i := 0; i < 6; i++ {',
			'		li = (li + 1) % 7',
			'		pc = (pc + steps[i]) % 12',
			'		letter := letters[li]',
			'		// Wrap the letter->pc distance into -2..+2 so that, e.g., needing',
			'		// pc 10 on letter B reads as -1 (Bb), not +11. Standard major keys',
			'		// only ever need single accidentals, but the wrap keeps the math',
			'		// honest for theoretical keys.',
			'		diff := ((pc-naturalPC(letter))%12 + 12) % 12',
			'		if diff > 6 {',
			'			diff -= 12',
			'		}',
			'		acc := ""',
			'		switch diff {',
			'		case 1:',
			'			acc = "#"',
			'		case 2:',
			'			acc = "x"',
			'		case -1:',
			'			acc = "b"',
			'		case -2:',
			'			acc = "bb"',
			'		}',
			'		scale = append(scale, string(letter)+acc)',
			'	}',
			'	return scale',
			'}',
			'',
			'// DiatonicTriads stacks scale thirds on every degree and derives each',
			'// quality from the semitone spans. Deriving (rather than hardcoding',
			'// maj/min/min/maj/maj/min/dim) is deliberate: the fixed quality pattern',
			'// is a CONSEQUENCE of the scale pattern, and computing it per key is',
			'// what demonstrates that — the same code would expose the different',
			'// pattern of any other scale.',
			'func DiatonicTriads(major string) []string {',
			'	scale := majorScale(major)',
			'	pcs := make([]int, 7)',
			'	for i, n := range scale {',
			'		pcs[i] = pitchClass(n)',
			'	}',
			'	triads := make([]string, 7)',
			'	for i := 0; i < 7; i++ {',
			'		// Scale-third stacking: degree i, i+2, i+4, wrapping past the',
			'		// octave (the fifth of degree 6 is degree 3 an octave up).',
			'		third := ((pcs[(i+2)%7]-pcs[i])%12 + 12) % 12',
			'		fifth := ((pcs[(i+4)%7]-pcs[i])%12 + 12) % 12',
			'		suffix := "" // (4,7): major',
			'		switch {',
			'		case third == 3 && fifth == 7:',
			'			suffix = "m"',
			'		case third == 3 && fifth == 6:',
			'			suffix = "dim"',
			'		}',
			'		triads[i] = scale[i] + suffix',
			'	}',
			'	return triads',
			'}',
			'',
			'// RomanNumeral reads the quality straight off the triad name: case',
			'// carries major/minor, ° marks diminished. Checking "dim" before "m"',
			'// matters — "dim" ends in \'m\' too.',
			'func RomanNumeral(major string, degree int) string {',
			'	numerals := [7]string{"I", "II", "III", "IV", "V", "VI", "VII"}',
			'	t := DiatonicTriads(major)[degree-1]',
			'	n := numerals[degree-1]',
			'	switch {',
			'	case strings.HasSuffix(t, "dim"):',
			'		return strings.ToLower(n) + "°"',
			'	case strings.HasSuffix(t, "m"):',
			'		return strings.ToLower(n)',
			'	}',
			'	return n',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why every major key has the same seven chords</h3>' +
			'<p>The triad on degree <em>i</em> uses scale steps <em>i</em>, ' +
			'<em>i</em>+2, <em>i</em>+4 — so its interval content is two adjacent ' +
			'chunks of the step pattern 2212221, read starting at position ' +
			'<em>i</em>. The pattern is the same rotation in every key, so the chunk ' +
			'sums — and therefore the qualities — are the same on every ' +
			'degree in every key. Degrees 1, 4, 5 get 4+3 (major); 2, 3, 6 get 3+4 ' +
			'(minor); degree 7 alone gets 3+3 (diminished), because both of the ' +
			'scale’s half steps fall inside its stack. One consequence worth ' +
			'noticing: the three <em>major</em> triads of a key — I, IV, V — ' +
			'between them contain all seven scale notes. That is why thousands of ' +
			'songs get by on three chords.</p>' +
			'<h3>The classic misconceptions</h3>' +
			'<p>First: “Dm in the key of C is a different chord from Dm in the ' +
			'key of F.” It is the same chord — what changes is its ' +
			'<em>function</em>: ii in C, vi in F. The numeral, not the letter, tells ' +
			'you how the chord behaves. Second: treating vii° as “the weird ' +
			'one to skip.” It is really the top of a dominant seventh missing its ' +
			'root (B–D–F is G7 without the G), which is why it pulls to I so ' +
			'hard. Third: numbering by counting letters without spelling the scale ' +
			'first — that is how you end up calling G major’s seventh chord ' +
			'“Gbdim.” Letter-advance plus the step pattern makes the wrong ' +
			'spelling unrepresentable.</p>' +
			'<h3>At the piano</h3>' +
			'<p>Practice each major scale in <em>chords</em>: play degree 1–7 as ' +
			'triads, saying the numerals aloud. Then take any chart — a pop song ' +
			'is usually I–V–vi–IV or some rotation — translate it to ' +
			'numbers once, and you can play it in any key the singer asks for. That ' +
			'translation step is exactly the function you just wrote, run in reverse; ' +
			'Nashville players run both directions in real time.</p>',
		],
		complexity: { time: 'O(1) — seven degrees, constant work each', space: 'O(1) — two seven-slot arrays' },
	});
})();
