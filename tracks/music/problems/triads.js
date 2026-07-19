/* triads — Chords (Easy). Building spelled triads: Triad(root, quality) for
 * maj/min/dim/aug. The letter line fixes WHICH names the chord tones get
 * (root, +2 letters, +4 letters); the semitone line ({0,4,7} / {0,3,7} /
 * {0,3,6} / {0,4,8}) fixes WHERE they sound; the accidental on each upper
 * note is the bridge between the two. The harness pins hand-checked
 * spellings: C maj, A min, B dim (the white-key diminished triad), C aug
 * (G#, not Ab), Eb maj, F# min, and D dim — whose fifth is Ab, never G#,
 * because the fifth of D must be spelled with the letter A.
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// One keyboard octave with C major's notes dotted in. The point the
	// picture makes: C-E-G vs C-Eb-G differ by ONE key in the middle, and
	// the fifth G has a squeezed neighbor (Gb, dim) and a stretched one
	// (G#, aug). No <marker> elements, so nothing needs id-namespacing.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 214" width="520" height="214" role="img" aria-label="one keyboard octave: C major is C E G; the minor third Eb is one key left of E; dim pulls the fifth to Gb, aug pushes it to G#">' +
		'<text x="20" y="22" class="lbl">C maj vs C min at the keys — the outer notes stay put, the middle finger slides one key</text>' +
		// white keys C..B
		'<rect x="50" y="36" width="60" height="120" fill="none" stroke="currentColor" stroke-opacity="0.5"/>' +
		'<rect x="110" y="36" width="60" height="120" fill="none" stroke="currentColor" stroke-opacity="0.5"/>' +
		'<rect x="170" y="36" width="60" height="120" fill="none" stroke="currentColor" stroke-opacity="0.5"/>' +
		'<rect x="230" y="36" width="60" height="120" fill="none" stroke="currentColor" stroke-opacity="0.5"/>' +
		'<rect x="290" y="36" width="60" height="120" fill="none" stroke="currentColor" stroke-opacity="0.5"/>' +
		'<rect x="350" y="36" width="60" height="120" fill="none" stroke="currentColor" stroke-opacity="0.5"/>' +
		'<rect x="410" y="36" width="60" height="120" fill="none" stroke="currentColor" stroke-opacity="0.5"/>' +
		// black keys C# D# F# G# A#
		'<rect x="93" y="36" width="34" height="74" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.5"/>' +
		'<rect x="153" y="36" width="34" height="74" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.5"/>' +
		'<rect x="273" y="36" width="34" height="74" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.5"/>' +
		'<rect x="333" y="36" width="34" height="74" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.5"/>' +
		'<rect x="393" y="36" width="34" height="74" fill="currentColor" fill-opacity="0.25" stroke="currentColor" stroke-opacity="0.5"/>' +
		// C major dots: C (root), E (major 3rd), G (fifth)
		'<circle cx="80" cy="140" r="8" fill="var(--accent)"/>' +
		'<circle cx="200" cy="140" r="8" fill="var(--ok)"/>' +
		'<circle cx="320" cy="140" r="8" fill="var(--accent)"/>' +
		// the minor third Eb (on the D# key) and the altered fifths Gb / G#
		'<circle cx="170" cy="95" r="7" fill="var(--warn)"/>' +
		'<circle cx="290" cy="95" r="7" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<circle cx="350" cy="95" r="7" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		// letter labels under the white keys
		'<text x="80" y="174" text-anchor="middle" class="lbl">C</text>' +
		'<text x="140" y="174" text-anchor="middle" class="lbl">D</text>' +
		'<text x="200" y="174" text-anchor="middle" class="lbl">E</text>' +
		'<text x="260" y="174" text-anchor="middle" class="lbl">F</text>' +
		'<text x="320" y="174" text-anchor="middle" class="lbl">G</text>' +
		'<text x="380" y="174" text-anchor="middle" class="lbl">A</text>' +
		'<text x="440" y="174" text-anchor="middle" class="lbl">B</text>' +
		'<text x="20" y="200" class="lbl">solid dots: C maj (C E G, spans 0-4-7).  Eb dot: the minor third (0-3-7).  hollow dots: dim squeezes the fifth to Gb (6), aug stretches it to G# (8)</text>' +
		'</svg>';

	T.problem({
		id: 'triads',
		title: 'Triads: Stacking Thirds',
		nav: 'triads',
		difficulty: 'Easy',
		category: 'Chords',
		task: 'Implement Triad(root, quality) — spell the maj/min/dim/aug triad on any root, letters by +2/+4 steps, accidentals by semitone count.',

		prose: [
			'<h2>Triads: Stacking Thirds</h2>' +
			'<p>Play C, then skip a white key, play E, skip another, play G — ' +
			'every-other-key is the shape of Western harmony. A <em>triad</em> is a ' +
			'<strong>stack of thirds</strong>: three notes, each a third above the ' +
			'last, and on the staff it draws as a tidy snowman of every-other line ' +
			'or every-other space. Nearly every chord symbol on a lead sheet — ' +
			'<code>C</code>, <code>Am</code>, <code>Bdim</code> — is one of four ' +
			'triad qualities, and all four are computable from two facts:</p>' +
			'<ul>' +
			'<li><strong>The letter line picks the names.</strong> The third is ' +
			'<strong>2 letters</strong> above the root and the fifth is <strong>4 ' +
			'letters</strong> above, on the cycle C&nbsp;D&nbsp;E&nbsp;F&nbsp;G&nbsp;' +
			'A&nbsp;B (wrapping B&nbsp;&rarr;&nbsp;C). The fifth of D is some kind ' +
			'of A — always. Whether it ends up A, A&#9837;, or A&#9839; is the ' +
			'accidental\'s job, but the <em>letter</em> is not negotiable.</li>' +
			'<li><strong>The semitone line picks the sound.</strong> Measured up ' +
			'from the root: <strong>maj {0,4,7}</strong>, <strong>min {0,3,7}</strong>, ' +
			'<strong>dim {0,3,6}</strong>, <strong>aug {0,4,8}</strong>. Major and ' +
			'minor share their outer notes and differ only in the middle — at the ' +
			'keyboard that is literally <strong>one key under your middle ' +
			'finger</strong> (E vs E&#9837; over a held C and G). Diminished ' +
			'squeezes the fifth in a semitone; augmented stretches it out one.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Triad(root, quality)</code>. Walk the letters, then ' +
			'for each upper note choose the accidental that lands its pitch class ' +
			'exactly the required semitones above the root. Worked example, the ' +
			'trickiest pin in the harness:</p>',
			{ lang: 'txt', code: 'D dim  ->  intervals {0,3,6}, letters D, F, A\n\nthird: letter F (natural pc 5); target pc = (2+3)%12 = 5   ->  F  (no accidental)\nfifth: letter A (natural pc 9); target pc = (2+6)%12 = 8\n       8 - 9 = -1 semitone   ->  flat  ->  Ab\n\nD dim = D F Ab      (never G#: the fifth of D is spelled with the letter A)' },
			'<div class="tip">The accidental delta is <code>(targetPC &minus; ' +
			'naturalPC) mod 12</code>, renormalized into &minus;2..+2 (treat ' +
			'anything above 6 as negative: 11 means &minus;1, i.e. a flat). Five ' +
			'accidentals — <code>bb b (natural) # x</code> — cover every triad this ' +
			'problem can ask for, so the mapping is a five-entry table, not a ' +
			'special-case ladder.</div>',
		],

		starter: [
			'package main',
			'',
			'// Triad returns the three spelled notes of the triad built on root:',
			'// [root, third, fifth]. quality is "maj", "min", "dim", or "aug"',
			'// (any other quality returns nil).',
			'//',
			'// Semitones above the root:',
			'//',
			'//	maj {0,4,7}   min {0,3,7}   dim {0,3,6}   aug {0,4,8}',
			'//',
			'// Letters: the third is 2 letters above the root and the fifth is 4',
			'// letters above, on the cycle C D E F G A B (wrapping B -> C). Each',
			'// upper note then takes whatever accidental lands its pitch class the',
			'// required semitones above the root\'s pitch class: "" natural,',
			'// "#" / "b" one semitone up / down, "x" / "bb" two.',
			'//',
			'// root is a letter A-G plus an optional accidental suffix, e.g. "C",',
			'// "Eb", "F#". Natural-letter pitch classes: C=0 D=2 E=4 F=5 G=7 A=9',
			'// B=11 (the 1-semitone gaps sit at E-F and B-C).',
			'func Triad(root, quality string) []string {',
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
			'		{"C maj — the reference stack: 0, 4, 7 semitones on white keys", "C", "maj", "C E G"},',
			'		{"A min — same white keys as C maj, darker color: the third is 3, not 4", "A", "min", "A C E"},',
			'		{"B dim — the one diminished triad that needs no accidentals (B up to F is 6)", "B", "dim", "B D F"},',
			'		{"C aug — the stretched fifth is G#, NOT Ab: the fifth letter of C must be G", "C", "aug", "C E G#"},',
			'		{"Eb maj — flat root: letters E G B, and B takes a flat to sit 7 above Eb", "Eb", "maj", "Eb G Bb"},',
			'		{"F# min — sharp root: the fifth is C#, spelled with the letter C (B->C wraps)", "F#", "min", "F# A C#"},',
			'		{"D dim — the squeezed fifth is Ab, NOT G#: letter arithmetic decides spelling", "D", "dim", "D F Ab"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			got := strings.Join(Triad(c.root, c.quality), " ")',
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
			'// naturalPC maps each letter to its pitch class (C=0 .. B=11). The',
			'// uneven gaps ARE the keyboard: E-F and B-C are the only 1-semitone',
			'// neighbors, which is exactly why the same quality needs different',
			'// accidentals on different roots.',
			'var naturalPC = map[byte]int{\'C\': 0, \'D\': 2, \'E\': 4, \'F\': 5, \'G\': 7, \'A\': 9, \'B\': 11}',
			'',
			'// accSemis / accName translate an accidental suffix to and from its',
			'// semitone offset. Tertian chords never need more than two sharps or',
			'// flats of correction, so five entries are total coverage.',
			'var accSemis = map[string]int{"": 0, "#": 1, "b": -1, "x": 2, "bb": -2}',
			'var accName = map[int]string{-2: "bb", -1: "b", 0: "", 1: "#", 2: "x"}',
			'',
			'// triadIv: semitones above the root for each quality. maj/min share',
			'// the fifth and differ in the third; dim/aug alter the fifth.',
			'var triadIv = map[string][3]int{',
			'	"maj": {0, 4, 7},',
			'	"min": {0, 3, 7},',
			'	"dim": {0, 3, 6},',
			'	"aug": {0, 4, 8},',
			'}',
			'',
			'func Triad(root, quality string) []string {',
			'	iv, ok := triadIv[quality]',
			'	if !ok {',
			'		return nil',
			'	}',
			'	const letters = "CDEFGAB"',
			'	letter := root[0]',
			'	li := 0',
			'	for i := 0; i < len(letters); i++ {',
			'		if letters[i] == letter {',
			'			li = i',
			'		}',
			'	}',
			'	// The root\'s sounding pitch class: natural letter + accidental.',
			'	// The +12 guard keeps Go\'s %-of-negative from leaking a negative',
			'	// pitch class (e.g. Cb: 0 + (-1)).',
			'	rootPC := ((naturalPC[letter]+accSemis[root[1:]])%12 + 12) % 12',
			'',
			'	// Two number lines, resolved independently per chord tone:',
			'	//   letter line:   +0, +2, +4 letters  ->  WHICH name it gets',
			'	//   semitone line: iv[k] above rootPC   ->  WHERE it sounds',
			'	// The accidental is the bridge: the offset that moves the natural',
			'	// letter onto the required pitch class.',
			'	steps := [3]int{0, 2, 4}',
			'	out := make([]string, 3)',
			'	for k, step := range steps {',
			'		tl := letters[(li+step)%7]',
			'		target := (rootPC + iv[k]) % 12',
			'		delta := ((target-naturalPC[tl])%12 + 12) % 12',
			'		// A pitch-class difference is mod-12 ambiguous (a flat looks',
			'		// like +11). Renormalize to the nearest representative in',
			'		// -6..+6; real triads only ever land in -2..+2.',
			'		if delta > 6 {',
			'			delta -= 12',
			'		}',
			'		out[k] = string(tl) + accName[delta]',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why letters first, semitones second</h3>' +
			'<p>The algorithm\'s order matters. If you picked pitch classes first ' +
			'and then hunted for names, D&nbsp;dim\'s fifth (pitch class 8) could ' +
			'come out G# or Ab and you\'d need a tiebreak. Letter-first makes the ' +
			'choice for you: the fifth of D is the letter A, full stop, and the ' +
			'accidental is forced to <code>b</code>. This is not pedantry — on the ' +
			'staff, a triad spelled correctly stacks as three notes on consecutive ' +
			'lines or consecutive spaces (the &ldquo;snowman&rdquo;), and a reader ' +
			'sees the chord <em>as a shape</em> before naming a single note. Spell ' +
			'that same chord D&nbsp;F&nbsp;G# and the shape lies: it looks like a ' +
			'cluster with a seventh in it, and sight-readers will hesitate every ' +
			'time.</p>' +
			'<h3>The classic misconception</h3>' +
			'<p>&ldquo;G# and Ab are the same key, so it doesn\'t matter.&rdquo; ' +
			'Same key, yes — same <em>note</em>, no. The spelling encodes ' +
			'<strong>function</strong>: C&nbsp;aug wants G# because an augmented ' +
			'fifth is a stretched fifth (letter G), while D&nbsp;dim wants Ab ' +
			'because a diminished fifth is a squeezed fifth (letter A). Get the ' +
			'letter arithmetic right and enharmonic questions never even come ' +
			'up — which is why the solution computes the letter with mod-7 ' +
			'arithmetic and never consults a &ldquo;preferred spelling&rdquo; ' +
			'table.</p>' +
			'<h3>At the piano</h3>' +
			'<p>Drill the qualities as <em>hand shapes</em>, not spellings: hold ' +
			'C&nbsp;maj, then move only the middle finger down one key ' +
			'(&rarr;&nbsp;min), then only the top finger down one (&rarr;&nbsp;dim), ' +
			'then reset and push the top finger up one (&rarr;&nbsp;aug). Four ' +
			'qualities, two moving fingers. Note the symmetry buried in aug: ' +
			'{0,4,8} splits the octave into three equal major thirds, so C&nbsp;aug, ' +
			'E&nbsp;aug, and G#&nbsp;aug are the same three keys — a fact that ' +
			'returns with a vengeance in the next problem\'s dim7.</p>',
		],
		complexity: { time: 'O(1) — three chord tones, each a table lookup plus constant mod arithmetic', space: 'O(1)' },
	});
})();
