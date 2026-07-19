/* interval-quality — Intervals (Medium). Interval quality from SPELLED
 * notes: letter steps fix the interval NUMBER, semitones fix the QUALITY by
 * comparison against the major/perfect baseline for that number. The harness
 * pins the enharmonic showpiece C4->E4 = M3 vs C4->Fb4 = d4 (both 4
 * semitones), both spellings of the tritone (F4->B4 = A4 vs F4->Cb5 = d5 and
 * B3->F4 = d5), the octave, the E-F natural half step as m2, and a perfect
 * fifth on a sharped root (C#4->G#4).
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// Same 4 semitones, different letter counts, different intervals — the
	// two number lines (letters vs semitones) computed side by side. Pure
	// shapes and text, no <marker> elements, so no id-namespacing needed.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 208" width="560" height="208" role="img" ' +
		'aria-label="C4 to E4 and C4 to Fb4 both span 4 semitones, but 3 letters make a major third while 4 letters make a diminished fourth">' +
		'<text x="20" y="24" class="lbl">same 4 semitones — the letter count decides the NUMBER, the semitone gap decides the QUALITY</text>' +
		// row 1: C4 -> E4, the major third
		'<text x="20" y="72">C4 → E4</text>' +
		'<rect x="110" y="50" width="168" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="194" y="73" text-anchor="middle" class="lbl">letters C·D·E → a 3rd</text>' +
		'<rect x="292" y="50" width="120" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="352" y="73" text-anchor="middle" class="lbl">4 semitones</text>' +
		'<text x="426" y="73" class="lbl">baseline(3)=4, diff 0 →</text>' +
		'<text x="540" y="74" text-anchor="end" style="fill:var(--ok)">M3</text>' +
		// row 2: C4 -> Fb4, the diminished fourth — same piano key as E4
		'<text x="20" y="136">C4 → Fb4</text>' +
		'<rect x="110" y="114" width="168" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="194" y="137" text-anchor="middle" class="lbl">letters C·D·E·F → a 4th</text>' +
		'<rect x="292" y="114" width="120" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="352" y="137" text-anchor="middle" class="lbl">4 semitones</text>' +
		'<text x="426" y="137" class="lbl">baseline(4)=5, diff −1 →</text>' +
		'<text x="540" y="138" text-anchor="end" style="fill:var(--warn)">d4</text>' +
		'<text x="280" y="182" text-anchor="middle" class="lbl">E4 and Fb4 are the SAME piano key (MIDI 64) — only the spelling tells the two intervals apart</text>' +
		'</svg>';

	T.problem({
		id: 'interval-quality',
		title: 'Interval Quality from Spelled Notes',
		nav: 'interval quality',
		difficulty: 'Medium',
		category: 'Intervals',
		task: 'Implement Interval(n1, n2): letter steps give the interval number, semitones vs the major/perfect baseline give the quality — "M3", "d4", "A4", "P8".',

		prose: [
			'<h2>Interval Quality from Spelled Notes</h2>' +
			'<p>Play C4 with your thumb and the E-key above it with your middle ' +
			'finger. Is that a major third? If the score spells the upper note ' +
			'<strong>E</strong>, yes — but if it spells it <strong>F♭</strong>, you ' +
			'are playing a <em>diminished fourth</em>, on exactly the same two ' +
			'keys. Your ear cannot tell the difference; the <em>spelling</em> can, ' +
			'and harmony cares deeply — a d4 appears in different keys, resolves ' +
			'differently, and is written on a different staff line than a M3. The ' +
			'previous problem measured distance on the semitone line alone; this ' +
			'one runs <strong>both number lines at once</strong>:</p>' +
			'<ul>' +
			'<li><strong>(a) The LETTER line fixes the interval NUMBER.</strong> ' +
			'Count letters inclusively through the cycle C&nbsp;D&nbsp;E&nbsp;F&nbsp;G&nbsp;A&nbsp;B: ' +
			'C→E spans C,D,E — a <em>3rd</em>; C→F spans C,D,E,F — a <em>4th</em>. ' +
			'Accidentals are invisible here: E and F♭ are different letters, full ' +
			'stop. In code: <code>number = letterSteps&nbsp;+&nbsp;1</code>.</li>' +
			'<li><strong>(b) The SEMITONE line fixes the raw distance.</strong> ' +
			'Convert each spelled note to a MIDI number — natural pitch classes ' +
			'C=0 D=2 E=4 F=5 G=7 A=9 B=11, then <code>#</code>&nbsp;+1, ' +
			'<code>b</code>&nbsp;−1, <code>x</code>&nbsp;+2, <code>bb</code>&nbsp;−2, ' +
			'octave number incrementing at C — and subtract.</li>' +
			'<li><strong>(c) Compare against the baseline.</strong> Each number ' +
			'1..8 has a canonical major/perfect width; the difference from it names ' +
			'the quality. Numbers 1, 4, 5, 8 come in ' +
			'<em>diminished–Perfect–Augmented</em>; numbers 2, 3, 6, 7 come in ' +
			'<em>diminished–minor–Major–Augmented</em>.</li>' +
			'</ul>',
			{ lang: 'txt', code: 'number:            1   2   3   4   5   6   7   8\nbaseline semis:    0   2   4   5   7   9  11  12     (the MAJOR/PERFECT widths)\n\ndiff = semitones - baseline\n  1/4/5/8:        -1 d    0 P   +1 A\n  2/3/6/7:  -2 d  -1 m    0 M   +1 A' },
			'<h3>Worked example: the same two keys, twice</h3>',
			{ lang: 'txt', code: 'C4 -> E4     letters C D E    -> number 3     C4=60, E4=64  -> 4 semis\n             baseline(3) = 4  -> diff  0     -> "M3"\n\nC4 -> Fb4    letters C D E F  -> number 4     Fb4 = 65-1 = 64 -> 4 semis\n             baseline(4) = 5  -> diff -1     -> "d4"' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Interval(n1, n2)</code> for spelled notes with ' +
			'octaves (<code>n2</code> at or above <code>n1</code>, never more than ' +
			'an octave apart, so the number stays in 1..8). Parse letter + ' +
			'accidentals + octave, then run (a), (b), (c).</p>' +
			'<div class="tip">This is where the tritone’s two names come from: ' +
			'F→B (four letters, 6 semitones, baseline 5) is an <strong>augmented ' +
			'fourth</strong>, while B→F (five letters, the same 6 semitones, ' +
			'baseline 7) is a <strong>diminished fifth</strong>. Same piano keys, ' +
			'same sound — but in a dominant seventh chord (G7: G–B–D–F) it is the ' +
			'B→F diminished fifth that squeezes inward to C–E, resolving to C ' +
			'major. The spelling encodes where the tension wants to go.</div>',
		],

		starter: [
			'package main',
			'',
			'// Interval names the interval between two spelled notes, e.g.',
			'// Interval("C4", "E4") == "M3" and Interval("C4", "Fb4") == "d4".',
			'//',
			'// Input format: letter A-G, then an accidental suffix ("#" +1,',
			'// "b" -1, "x" +2, "bb" -2, none 0), then the octave number (octaves',
			'// increment at C; C4 = MIDI 60). n2 is at or above n1 and at most an',
			'// octave away, so the interval number stays within 1..8.',
			'//',
			'// Algorithm:',
			'//	(a) letter steps (inclusive letter count minus one, through the',
			'//	    cycle C D E F G A B, octave = 7 letters) -> number = steps+1',
			'//	(b) semitone distance via MIDI: (octave+1)*12 + natural pitch',
			'//	    class (C=0 D=2 E=4 F=5 G=7 A=9 B=11) + accidental',
			'//	(c) diff = semitones - baseline[number], with baselines',
			'//	    1:0 2:2 3:4 4:5 5:7 6:9 7:11 8:12;',
			'//	    numbers 1/4/5/8: diff -1 "d", 0 "P", +1 "A"',
			'//	    numbers 2/3/6/7: diff -2 "d", -1 "m", 0 "M", +1 "A"',
			'//',
			'// Return quality+number, like "M3", "m2", "P5", "d5", "A4".',
			'func Interval(n1, n2 string) string {',
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
			'		n1   string',
			'		n2   string',
			'	}',
			'	cases := []tc{',
			'		{"C4->E4: letters C,D,E = a 3rd; 4 semitones = the major baseline",',
			'			"M3", "C4", "E4"},',
			'		{"C4->Fb4: SAME 4 semitones as C4->E4, but four letters make it a diminished 4th",',
			'			"d4", "C4", "Fb4"},',
			'		{"F4->B4: the tritone spelled as an augmented 4th (four letters, 6 semitones, baseline 5)",',
			'			"A4", "F4", "B4"},',
			'		{"F4->Cb5: the same 6 semitones spelled as a diminished 5th (five letters, baseline 7)",',
			'			"d5", "F4", "Cb5"},',
			'		{"B3->F4: the naturals\' own tritone — B up to F is a diminished 5th",',
			'			"d5", "B3", "F4"},',
			'		{"C4->C5: 7 letter steps and 12 semitones — a perfect octave",',
			'			"P8", "C4", "C5"},',
			'		{"E4->F4: the built-in half step between naturals — two letters but only 1 semitone: m2",',
			'			"m2", "E4", "F4"},',
			'		{"C#4->G#4: accidentals on BOTH notes shift both semitone counts — still a perfect 5th",',
			'			"P5", "C#4", "G#4"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": fmt.Sprintf("%s (%s -> %s)", c.name, c.n1, c.n2), "want": c.want}',
			'		runCase(r, func() {',
			'			got := Interval(c.n1, c.n2)',
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
			'// The two coordinate systems of note spelling, indexed by letter.',
			'// letterIdx is the LETTER line (position in the 7-letter cycle);',
			'// letterPC is the SEMITONE line (natural pitch class). Keeping them',
			'// as two parallel tables — not one — is the whole lesson: an interval',
			'// number lives on the first line, its quality on the second.',
			'var letterIdx = map[byte]int{\'C\': 0, \'D\': 1, \'E\': 2, \'F\': 3, \'G\': 4, \'A\': 5, \'B\': 6}',
			'var letterPC = map[byte]int{\'C\': 0, \'D\': 2, \'E\': 4, \'F\': 5, \'G\': 7, \'A\': 9, \'B\': 11}',
			'',
			'// baseline[n] is the semitone width of the MAJOR or PERFECT interval',
			'// of number n (index 0 unused). These are just the major scale\'s',
			'// degrees measured from the tonic — the major scale IS the baseline.',
			'var baseline = [9]int{0, 0, 2, 4, 5, 7, 9, 11, 12}',
			'',
			'// parse splits a spelled note into its two coordinates:',
			'//   diatonic  — absolute position on the letter line: octave*7 + idx,',
			'//               so subtracting two of them counts letter steps across',
			'//               octave boundaries for free (Cb5 is letter-C in octave 5',
			'//               even though it SOUNDS in octave 4 — spelling wins here)',
			'//   chromatic — the MIDI number: (octave+1)*12 + pc + accidental',
			'func parse(s string) (diatonic, chromatic int) {',
			'	letter := s[0]',
			'	// Accidentals sum, which handles \'bb\' with the same loop that',
			'	// handles \'b\' — and would handle theoretical spellings like \'#x\'',
			'	// without extra cases. The loop stops at the first octave digit.',
			'	acc := 0',
			'	i := 1',
			'	for i < len(s) && (s[i] == \'#\' || s[i] == \'b\' || s[i] == \'x\') {',
			'		switch s[i] {',
			'		case \'#\':',
			'			acc++',
			'		case \'b\':',
			'			acc--',
			'		case \'x\':',
			'			acc += 2',
			'		}',
			'		i++',
			'	}',
			'	oct, _ := strconv.Atoi(s[i:])',
			'	return oct*7 + letterIdx[letter], (oct+1)*12 + letterPC[letter] + acc',
			'}',
			'',
			'// Interval runs the two lines independently and only combines them at',
			'// the end. The order matters conceptually: the NUMBER is decided',
			'// before any semitone is counted — C->Fb is a fourth no matter what',
			'// the accidental does to the distance. Quality is then whatever label',
			'// reconciles that number with the actual semitone gap.',
			'func Interval(n1, n2 string) string {',
			'	d1, c1 := parse(n1)',
			'	d2, c2 := parse(n2)',
			'',
			'	number := d2 - d1 + 1 // inclusive letter count: steps + 1',
			'	diff := (c2 - c1) - baseline[number]',
			'',
			'	// 1/4/5/8 are the "perfect" numbers: their baseline width is the',
			'	// only consonant size, so there is no major/minor split — one step',
			'	// off is already diminished or augmented. 2/3/6/7 have two common',
			'	// sizes (major and minor), pushing d and A one step further out.',
			'	var q string',
			'	if number == 1 || number == 4 || number == 5 || number == 8 {',
			'		switch diff {',
			'		case -1:',
			'			q = "d"',
			'		case 0:',
			'			q = "P"',
			'		case 1:',
			'			q = "A"',
			'		}',
			'	} else {',
			'		switch diff {',
			'		case -2:',
			'			q = "d"',
			'		case -1:',
			'			q = "m"',
			'		case 0:',
			'			q = "M"',
			'		case 1:',
			'			q = "A"',
			'		}',
			'	}',
			'	return q + strconv.Itoa(number)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why two number lines instead of one</h3>' +
			'<p>The piano keyboard is a ruler for the semitone line, and by that ' +
			'ruler E4 and F♭4 are the same point. Notation, though, lives on the ' +
			'letter line — seven letters per octave, one staff position each — and by ' +
			'that ruler E and F are always neighbors, never equal. An interval ' +
			'name is a <strong>pair of measurements</strong>: the number is pure ' +
			'letter geometry (where the notes sit on the staff), the quality is ' +
			'the semitone correction (what the accidentals did to the distance). ' +
			'That is why the algorithm computes <code>diatonic</code> and ' +
			'<code>chromatic</code> coordinates separately and never lets one ' +
			'contaminate the other: the classic bug is deriving the number from ' +
			'semitones (“4 semitones, must be a third”) — which collapses M3 and ' +
			'd4 into one and makes correct chord spelling impossible.</p>' +
			'<h3>The baseline is just the major scale</h3>' +
			'<p>The baseline table 0,&nbsp;2,&nbsp;4,&nbsp;5,&nbsp;7,&nbsp;9,&nbsp;11,&nbsp;12 ' +
			'is nothing new — it is the major scale measured in semitones from its ' +
			'tonic. “Major or perfect” intervals are exactly the ones a major ' +
			'scale makes above its tonic; every other quality is named by how far ' +
			'it falls from that reference. Why do 1, 4, 5, 8 refuse the ' +
			'major/minor split? History and acoustics agree here: those are the ' +
			'intervals whose frequency ratios are simplest (1:1, 4:3, 3:2, 2:1), ' +
			'treated since medieval theory as a single “perfect” size — shrink one ' +
			'and it is immediately <em>diminished</em>, no minor stop on the ' +
			'way.</p>' +
			'<h3>At the piano</h3>' +
			'<p>Spelling is the composer telling you where the music is going. ' +
			'When you see G#→F in a score, that d7 (not “m7 misspelled”) is ' +
			'begging to collapse inward to A–E — it belongs to A harmonic minor. ' +
			'The same two keys spelled Ab→F# would pull the opposite way, ' +
			'outward. Play both spellings and <em>voice-lead them where they ' +
			'point</em>; after a few repetitions your eye starts reading ' +
			'accidentals as arrows, not obstacles. That skill — hearing with your ' +
			'eyes — is what this little function mechanizes.</p>',
		],
		complexity: { time: 'O(k) — one pass over each note string of length k; everything after parsing is table lookups', space: 'O(1)' },
	});
})();
