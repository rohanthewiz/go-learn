/* transposition — At the Piano (Hard). Move a spelled melody to another key:
 * letters first (interval number - 1 letter steps, with octave carry at the
 * B/C seam), then choose the accidental so the semitone change equals the
 * interval\'s size. The harness pins C4 E4 G4 up M2 = D4 F#4 A4, Happy
 * Birthday\'s opening down P4 (C major to G major), B3 up m2 = C4 across the
 * octave boundary, Ode to Joy\'s first phrase up P5, an Eb-major triad going
 * flat-ward up P4, and a sharps-to-naturals m3 case.
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// Letters-first, accidental second: the two number lines are computed
	// independently and the accidental is their difference. Marker id
	// namespaced (dgArrowMusTR) — all tracks share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 200" width="560" height="200" role="img" aria-label="transposing E4 up a major second: the letter line moves one step E to F, the semitone line moves two steps 52 to 54, and the accidental sharp is the difference">' +
		'<text x="20" y="24" class="lbl">E4 up M2 — run both number lines, the accidental is their disagreement</text>' +
		// letter line
		'<rect x="40" y="44" width="200" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="140" y="64" text-anchor="middle">LETTER line</text>' +
		'<text x="140" y="82" text-anchor="middle" class="lbl">E + (2-1) letters = F</text>' +
		// semitone line
		'<rect x="40" y="112" width="200" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="140" y="132" text-anchor="middle">SEMITONE line</text>' +
		'<text x="140" y="150" text-anchor="middle" class="lbl">52 + 2 semitones = 54</text>' +
		// merge arrows into the result
		'<path d="M 246 66 C 300 66 330 90 356 96" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowMusTR)"/>' +
		'<path d="M 246 134 C 300 134 330 110 356 104" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowMusTRw)"/>' +
		'<rect x="364" y="72" width="160" height="56" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="444" y="96" text-anchor="middle">natural F = 53</text>' +
		'<text x="444" y="116" text-anchor="middle">need 54 &rarr; F#4</text>' +
		'<text x="20" y="186" class="lbl">accidental = target semitone &minus; natural letter semitone: +1 = #, &minus;1 = b, +2 = x, &minus;2 = bb</text>' +
		'<defs>' +
		'<marker id="dgArrowMusTR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowMusTRw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'transposition',
		title: 'Transposing a Melody',
		nav: 'transposition',
		difficulty: 'Hard',
		category: 'At the Piano',
		task: 'Implement Transpose: shift every spelled note of a melody by a named interval, up or down — letters move by the interval number, accidentals absorb the semitone difference.',

		prose: [
			'<h2>Transposing a Melody</h2>' +
			'<p>Someone starts singing Happy Birthday and the room joins in — in ' +
			'whatever key the first singer happened to pick. The pianist\'s job ' +
			'is to play the same melody from a different starting note, ' +
			'<em>right now</em>. That skill is <strong>transposition</strong>, ' +
			'and it is also why a saxophone player reads different sheet music ' +
			'than the pianist for the same tune: transposing instruments sound ' +
			'a fixed interval away from what they read, so their parts are ' +
			'pre-transposed on paper.</p>' +
			'<p>The na&iuml;ve algorithm — add N semitones to every note — gets ' +
			'the piano <em>keys</em> right and the <em>music</em> wrong. ' +
			'C4&nbsp;E4 up a major second must become D4&nbsp;F#4: the same ' +
			'physical key as G♭4, but G♭ would be a <em>diminished third</em> ' +
			'above E — a different interval on paper, nonsense in the key of D. ' +
			'Transposition preserves <strong>interval spelling</strong>, not ' +
			'just semitone distance. So the algorithm runs letters-first:</p>' +
			'<ul>' +
			'<li><strong>Letter line.</strong> An interval named "M2", "P5", ' +
			'"m6"&hellip; has a NUMBER (2, 5, 6) meaning it spans that many ' +
			'letter names inclusive — so the letter advances by ' +
			'<code>number&nbsp;&minus;&nbsp;1</code> steps in the cycle ' +
			'C&nbsp;D&nbsp;E&nbsp;F&nbsp;G&nbsp;A&nbsp;B. Walking up past B ' +
			'wraps to C <em>and carries the octave</em> (that is where octave ' +
			'numbers increment); walking down below C borrows one.</li>' +
			'<li><strong>Semitone line.</strong> The interval\'s QUALITY fixes ' +
			'its exact size: m2=1, M2=2, m3=3, M3=4, P4=5, P5=7, m6=8, M6=9, ' +
			'm7=10, M7=11, P8=12 semitones. Compute each note\'s absolute ' +
			'semitone (octave&nbsp;&times;&nbsp;12 + letter semitone + ' +
			'accidental) and shift it by exactly that much.</li>' +
			'<li><strong>Accidental = the difference.</strong> The new letter ' +
			'at the new octave has a natural semitone value; the accidental is ' +
			'whatever closes the gap to the target: +1&nbsp;=&nbsp;<code>#</code>, ' +
			'&minus;1&nbsp;=&nbsp;<code>b</code>, +2&nbsp;=&nbsp;<code>x</code> ' +
			'(double sharp), &minus;2&nbsp;=&nbsp;<code>bb</code>.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Transpose(notes, interval, up)</code> over ' +
			'spelled notes <em>with</em> octave numbers (<code>"C4"</code>, ' +
			'<code>"F#4"</code>, <code>"Eb5"</code>, accidentals ' +
			'<code>#&nbsp;b&nbsp;x&nbsp;bb</code> or none) for the intervals ' +
			'listed above, in either direction. Every note moves independently ' +
			'— the melody\'s shape moves rigidly.</p>',
			{ lang: 'txt', code: 'Happy Birthday, opening (in C):  G4 G4 A4 G4 C5 B4\ndown P4 (letters -3, semitones -5): D4 D4 E4 D4 G4 F#4   <- now in G major\n\nthe B4: letter B-3 -> F; semitone 59-5 = 54; natural F4 = 53; 54-53 = +1 -> F#4' },
			'<div class="tip">The octave seam is at C, not A: B3 up a half step ' +
			'is C4. On the letter line that is index 6 wrapping to index 0 with ' +
			'a carry — treat letters as base-7 digits and octaves as the carry ' +
			'column, and both directions fall out of div/mod arithmetic.</div>',
		],

		starter: [
			'package main',
			'',
			'// Transpose shifts every note of a spelled melody by a named interval.',
			'//',
			'//   notes:    spelled pitches with octaves, e.g. "C4", "F#4", "Bb3".',
			'//             Accidentals: "#" +1, "b" -1, "x" +2, "bb" -2, "" 0.',
			'//             Octave numbers increment at C (B3 is a half step below C4).',
			'//   interval: one of "m2","M2","m3","M3","P4","P5","m6","M6","m7","M7","P8".',
			'//   up:       true = transpose up, false = down.',
			'//',
			'// Per note: the LETTER advances (or retreats) by interval number - 1',
			'// positions in the cycle C D E F G A B, carrying/borrowing the octave',
			'// when it wraps past B (or under C); then the ACCIDENTAL is chosen so',
			'// the note\'s absolute semitone (octave*12 + letter semitone +',
			'// accidental) changed by exactly the interval\'s size in semitones',
			'// (m2=1 M2=2 m3=3 M3=4 P4=5 P5=7 m6=8 M6=9 m7=10 M7=11 P8=12).',
			'// Output uses the same spelling scheme ("", "#", "b", "x", "bb").',
			'// Returns a new slice; the input is not modified.',
			'func Transpose(notes []string, interval string, up bool) []string {',
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
			'	// Melodies render as space-joined note lists so want/got compare',
			'	// as exact strings.',
			'	j := func(ns []string) string { return strings.Join(ns, " ") }',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"C major triad up M2: E4 must become F#4, not Gb4 — spelling is preserved",',
			'			"D4 F#4 A4",',
			'			func() string { return j(Transpose([]string{"C4", "E4", "G4"}, "M2", true)) }},',
			'		{"Happy Birthday opening down P4: C major lands in G major, the B4 picks up a sharp",',
			'			"D4 D4 E4 D4 G4 F#4",',
			'			func() string { return j(Transpose([]string{"G4", "G4", "A4", "G4", "C5", "B4"}, "P4", false)) }},',
			'		{"octave seam: B3 up m2 crosses into C4 — letters wrap at B/C and the octave carries",',
			'			"C4",',
			'			func() string { return j(Transpose([]string{"B3"}, "m2", true)) }},',
			'		{"Ode to Joy first phrase up P5: E4 E4 F4 G4 — the F4 and G4 carry into octave 5",',
			'			"B4 B4 C5 D5",',
			'			func() string { return j(Transpose([]string{"E4", "E4", "F4", "G4"}, "P5", true)) }},',
			'		{"flat-ward: Eb major triad up P4 lands in Ab major — flats in, flats out",',
			'			"Ab4 C5 Eb5",',
			'			func() string { return j(Transpose([]string{"Eb4", "G4", "Bb4"}, "P4", true)) }},',
			'		{"D major triad up m3 = F major triad: the F#4 must come out A4, sharps can vanish",',
			'			"F4 A4 C5",',
			'			func() string { return j(Transpose([]string{"D4", "F#4", "A4"}, "m3", true)) }},',
			'		{"P8 is the identity on spelling: only the octave digit moves",',
			'			"G3 B3 D4",',
			'			func() string { return j(Transpose([]string{"G4", "B4", "D5"}, "P8", false)) }},',
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
			'import "strconv"',
			'',
			'// The two facts every step of the algorithm consults: where each',
			'// natural letter sits on the semitone line, and how big each named',
			'// interval is on BOTH lines — letter steps (number - 1) and semitones',
			'// (fixed by quality). Keeping the interval table two-column is the',
			'// whole design: transposition is the same shift applied to two',
			'// independent number lines, and the accidental reconciles them.',
			'var trLetters = []byte("CDEFGAB")',
			'var trLetterPC = []int{0, 2, 4, 5, 7, 9, 11} // C D E F G A B',
			'',
			'var trIntervals = map[string][2]int{ // name -> {letter steps, semitones}',
			'	"m2": {1, 1}, "M2": {1, 2}, "m3": {2, 3}, "M3": {2, 4},',
			'	"P4": {3, 5}, "P5": {4, 7}, "m6": {5, 8}, "M6": {5, 9},',
			'	"m7": {6, 10}, "M7": {6, 11}, "P8": {7, 12},',
			'}',
			'',
			'// parseNote splits "F#4" into letter index (C=0..B=6), accidental',
			'// offset in semitones, and octave. The accidental is everything',
			'// between the letter and the first digit, so "bb" and "x" parse for',
			'// free by summing per-byte offsets (b=-1 each, #=+1, x=+2). Plain',
			'// locals (not named returns) on purpose: the sandboxed interpreter',
			'// this track runs on mis-carries named return values across calls',
			'// when a return sits inside a switch, so the function stays on the',
			'// boring construction that is unambiguous everywhere.',
			'func parseNote(s string) (int, int, int) {',
			'	li, acc, oct := 0, 0, 0',
			'	for i, b := range trLetters {',
			'		if b == s[0] {',
			'			li = i',
			'		}',
			'	}',
			'	for i := 1; i < len(s); i++ {',
			'		c := s[i]',
			'		if c == \'#\' {',
			'			acc++',
			'		} else if c == \'x\' {',
			'			acc += 2',
			'		} else if c == \'b\' {',
			'			acc--',
			'		} else {',
			'			// First digit reached: the rest is the octave number.',
			'			oct, _ = strconv.Atoi(s[i:])',
			'			break',
			'		}',
			'	}',
			'	return li, acc, oct',
			'}',
			'',
			'// accString renders a semitone offset back into spelling. Anything',
			'// beyond double accidentals means the caller asked for a spelling',
			'// this notation cannot write — panic loudly rather than emit garbage',
			'// (runCase converts the panic into a failed case).',
			'func accString(off int) string {',
			'	switch off {',
			'	case -2:',
			'		return "bb"',
			'	case -1:',
			'		return "b"',
			'	case 0:',
			'		return ""',
			'	case 1:',
			'		return "#"',
			'	case 2:',
			'		return "x"',
			'	}',
			'	panic("accidental out of range: " + strconv.Itoa(off))',
			'}',
			'',
			'// Transpose runs the letters-first algorithm per note. Order matters',
			'// conceptually: the letter/octave move is decided ONLY by the',
			'// interval number, the semitone target ONLY by the interval size,',
			'// and the accidental is forced — there is never a choice to make,',
			'// which is exactly why transposed music stays correctly spelled.',
			'func Transpose(notes []string, interval string, up bool) []string {',
			'	iv := trIntervals[interval]',
			'	steps, semis := iv[0], iv[1]',
			'	out := make([]string, 0, len(notes))',
			'	for _, n := range notes {',
			'		li, acc, oct := parseNote(n)',
			'		// Absolute semitone with the octave incrementing at C —',
			'		// B3 = 47 sits one below C4 = 48, so the seam needs no',
			'		// special case on this line.',
			'		abs := oct*12 + trLetterPC[li] + acc',
			'		var nli, nOct, nAbs int',
			'		if up {',
			'			// Letters are base-7 digits with the octave as the',
			'			// carry column: index 6 (B) + 1 step = index 7 ->',
			'			// carry one octave, wrap to 0 (C).',
			'			nli = li + steps',
			'			nOct = oct + nli/7',
			'			nli %= 7',
			'			nAbs = abs + semis',
			'		} else {',
			'			// Downward the mod must stay non-negative: borrow',
			'			// whole octaves until the letter index is back in',
			'			// range (steps <= 7, so one borrow always suffices,',
			'			// but the loop states the invariant).',
			'			nli = li - steps',
			'			nOct = oct',
			'			for nli < 0 {',
			'				nli += 7',
			'				nOct--',
			'			}',
			'			nAbs = abs - semis',
			'		}',
			'		// The accidental is the gap between where the semitone',
			'		// line landed and where the bare letter sits.',
			'		off := nAbs - (nOct*12 + trLetterPC[nli])',
			'		out = append(out, string(trLetters[nli])+accString(off)+strconv.Itoa(nOct))',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why letters-first, not semitones-first</h3>' +
			'<p>Adding semitones and then picking "a" spelling for the resulting ' +
			'piano key loses information: pitch class 6 could be F# or G♭, and ' +
			'which one is <em>correct</em> depends on the letter the source note ' +
			'had. The interval name carries both coordinates — number for the ' +
			'letter line, quality for the semitone line — so running the two ' +
			'shifts independently and letting the accidental absorb the ' +
			'difference reproduces exactly the spelling a copyist would write. ' +
			'That is the deep fact this problem pins: <strong>transposition is ' +
			'an isomorphism on spelled intervals</strong>, not on piano keys. ' +
			'Every interval between any two notes of the melody — spelled, not ' +
			'just counted in semitones — survives the move.</p>' +
			'<h3>The classic misconceptions</h3>' +
			'<p>First: "just add 2 to everything" (semitone thinking) writes ' +
			'G♭4 for E4&nbsp;up&nbsp;M2 half the time, and the error compounds — ' +
			'a melody transposed twice by semitone-arithmetic can end up ' +
			'unreadably respelled. Second: the octave seam. Musicians raised on ' +
			'"A B C" alphabetical order expect the octave number to change at A; ' +
			'it changes at C, so B3&nbsp;up&nbsp;m2 is C4 — same-looking letter ' +
			'jump, new octave digit. Treating letters as base-7 digits with the ' +
			'octave as the carry column makes both directions pure div/mod and ' +
			'removes the seam as a special case. Third: assuming sharps map to ' +
			'sharps — D major\'s F# transposed up m3 comes out plain A; ' +
			'accidentals are outputs of the algorithm, never passed through.</p>' +
			'<h3>At the piano</h3>' +
			'<p>This algorithm is why transposing instruments work at all: a ' +
			'B♭ trumpet sounds a M2 below what it reads, so its parts are ' +
			'printed up a M2 — your exact <code>Transpose(notes, "M2", true)</code> ' +
			'— and the player never knows. For the pianist accompanying singers, ' +
			'the practical trick is to transpose the <em>key</em>, not the ' +
			'notes: think "Happy Birthday, but in G — degrees 5 5 6 5 1 7", and ' +
			'the fingers find the new key\'s scale. Scale-degree thinking is this ' +
			'same algorithm run once for the key signature instead of once per ' +
			'note.</p>',
		],
		complexity: { time: 'O(n) — one constant-work pass per note', space: 'O(n) for the transposed copy' },
	});
})();
