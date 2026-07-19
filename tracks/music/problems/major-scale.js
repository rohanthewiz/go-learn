/* major-scale — Scales & Keys (Medium). Build a correctly SPELLED major
 * scale: advance exactly one letter per degree, compute each degree’s
 * required pitch class from the 2 2 1 2 2 2 1 pattern, and choose the
 * accidental that reconciles the two. The harness pins C (zero
 * accidentals), G (the single sharp F#), E (four sharps on degrees
 * 2 3 6 7), Eb and F (the flat side, where Ab — never G# — is forced),
 * and F# major, where the letter rule conjures E# into existence.
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// Eb major laid out on both number lines: the letter line advances one
	// step per degree, the semitone line advances by the major pattern, and
	// accidentals absorb every disagreement. Warn-colored boxes are the
	// degrees where an accidental was forced.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="Eb major: letters advance one per degree while the 2212221 semitone pattern runs underneath; accidentals reconcile the two lines">' +
		'<text x="20" y="24" class="lbl">Eb major: one letter per degree (E F G A B C D), accidentals make the pattern true</text>' +
		'<rect x="28" y="62" width="48" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="52" y="88" text-anchor="middle">Eb</text>' +
		'<rect x="90" y="62" width="48" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="114" y="88" text-anchor="middle">F</text>' +
		'<rect x="152" y="62" width="48" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="176" y="88" text-anchor="middle">G</text>' +
		'<rect x="214" y="62" width="48" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="238" y="88" text-anchor="middle">Ab</text>' +
		'<rect x="276" y="62" width="48" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="300" y="88" text-anchor="middle">Bb</text>' +
		'<rect x="338" y="62" width="48" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="362" y="88" text-anchor="middle">C</text>' +
		'<rect x="400" y="62" width="48" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="424" y="88" text-anchor="middle">D</text>' +
		'<rect x="462" y="62" width="48" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="486" y="88" text-anchor="middle">Eb</text>' +
		'<text x="83" y="125" text-anchor="middle" class="lbl">2</text>' +
		'<text x="145" y="125" text-anchor="middle" class="lbl">2</text>' +
		'<text x="207" y="125" text-anchor="middle" class="lbl" style="fill:var(--warn)">1</text>' +
		'<text x="269" y="125" text-anchor="middle" class="lbl">2</text>' +
		'<text x="331" y="125" text-anchor="middle" class="lbl">2</text>' +
		'<text x="393" y="125" text-anchor="middle" class="lbl">2</text>' +
		'<text x="455" y="125" text-anchor="middle" class="lbl" style="fill:var(--warn)">1</text>' +
		'<text x="20" y="150" class="lbl">semitone steps between degrees — the half steps land wherever the key puts them</text>' +
		'<text x="20" y="180" class="lbl">degree 4: letter must be A, required pc is 8, A’s natural pc is 9 → 8−9 = −1 → Ab (G# would repeat the letter G)</text>' +
		'</svg>';

	T.problem({
		id: 'major-scale',
		title: 'Spelling the Major Scale',
		nav: 'major scale',
		difficulty: 'Medium',
		category: 'Scales & Keys',
		task: 'Implement MajorScale: seven correctly spelled notes — one letter per degree, accidentals chosen so each degree lands on the 2 2 1 2 2 2 1 pitch-class pattern.',

		prose: [
			'<h2>Spelling the Major Scale</h2>' +
			'<p>Every major scale is the same <em>shape</em>: seven notes whose ' +
			'semitone steps run <code>2&nbsp;2&nbsp;1&nbsp;2&nbsp;2&nbsp;2&nbsp;1</code>. ' +
			'Play it from C and it falls entirely on white keys; start anywhere ' +
			'else and some steps land on black keys. Which is where the classic ' +
			'confusion begins: the black key between G and A — is the fourth note ' +
			'of E-flat major spelled <code>G#</code> or <code>Ab</code>? A pianist ' +
			'presses one physical key either way, but on the staff exactly one ' +
			'spelling is correct, and the rule that decides it is an algorithm, ' +
			'not taste:</p>' +
			'<ul>' +
			'<li><strong>The letter line advances one letter per degree.</strong> ' +
			'Seven degrees, seven letters, each used exactly once, in cyclic order ' +
			'from the tonic’s letter. This <em>is</em> the definition of correct ' +
			'spelling — a scale on E-flat uses the letters E&nbsp;F&nbsp;G&nbsp;A&nbsp;B&nbsp;C&nbsp;D, ' +
			'no letter skipped, none repeated.</li>' +
			'<li><strong>The semitone line advances by the pattern.</strong> ' +
			'Starting from the tonic’s pitch class (C=0 … B=11, mod 12), each ' +
			'degree’s required pitch class is the previous one plus the next step ' +
			'of <code>2 2 1 2 2 2 1</code>.</li>' +
			'<li><strong>The accidental is the difference.</strong> Each letter has ' +
			'a natural pitch class (C=0 D=2 E=4 F=5 G=7 A=9 B=11 — note the ' +
			'1-semitone E–F and B–C gaps). Subtract it from the required pitch ' +
			'class, normalize to the shortest signed distance, and map: ' +
			'−2&nbsp;→&nbsp;<code>bb</code>, −1&nbsp;→&nbsp;<code>b</code>, 0&nbsp;→&nbsp;natural, ' +
			'+1&nbsp;→&nbsp;<code>#</code>, +2&nbsp;→&nbsp;<code>x</code>.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>MajorScale(tonic)</code> returning the seven spelled ' +
			'notes, no octave numbers. The tonic is a letter plus an optional ' +
			'<code>#</code> or <code>b</code>. Here is the full trace for the ' +
			'spiciest pinned case — F# major, where degree 7 must use the letter E ' +
			'and the pattern demands pitch class 5, one above E’s natural 4:</p>',
			{ lang: 'txt', code: 'F# major — the letter rule forces E#\nletter (one per degree):       F   G   A   B   C   D   E\nrequired pc (2 2 1 2 2 2 1):   6   8   10  11  1   3   5\nletter\'s natural pc:           5   7   9   11  0   2   4\naccidental (required-natural): +1  +1  +1  0   +1  +1  +1\nspelled:                       F#  G#  A#  B   C#  D#  E#' },
			'<div class="tip">If you ever catch yourself writing G# inside E-flat ' +
			'major, check the letter line: Eb&nbsp;F&nbsp;G&nbsp;G#… — two Gs and ' +
			'no A. On a staff that is unreadable: the A line would stay empty all ' +
			'piece while the G line carries both a natural and a sharp. The letter ' +
			'rule is not pedantry; it is what makes notation a positional code.</div>',
		],

		starter: [
			'package main',
			'',
			'// MajorScale returns the seven notes of the major scale on tonic, in',
			'// ascending order, correctly spelled, without octave numbers.',
			'// Example: "Eb" -> [Eb F G Ab Bb C D].',
			'//',
			'// Conventions:',
			'//   - tonic is a letter A-G plus an optional accidental suffix:',
			'//     "#" = +1 semitone, "b" = -1. Examples: "C", "G", "Eb", "F#".',
			'//   - pitch classes are mod 12: C=0 C#=1 D=2 ... B=11.',
			'//   - natural letter pitch classes: C=0 D=2 E=4 F=5 G=7 A=9 B=11.',
			'//   - the major pattern in semitone steps is 2 2 1 2 2 2 1.',
			'//   - correct spelling: the seven letters appear exactly once each, in',
			'//     cyclic order starting from the tonic\'s letter; each degree\'s',
			'//     accidental ("bb", "b", "", "#", "x") is whatever moves that',
			'//     letter\'s natural pitch class onto the degree\'s required one.',
			'func MajorScale(tonic string) []string {',
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
			'	// Join with spaces so a wrong accidental reads instantly in the',
			'	// want/got diff ("Ab" vs "G#" jumps out of the line).',
			'	sc := func(tonic string) string { return strings.Join(MajorScale(tonic), " ") }',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"C major — the all-white-key baseline: the pattern with zero accidentals",',
			'			"C D E F G A B",',
			'			func() string { return sc("C") }},',
			'		{"G major — one sharp: degree 7 needs pc 6 on the letter F, so F# (never Gb)",',
			'			"G A B C D E F#",',
			'			func() string { return sc("G") }},',
			'		{"E major — four sharps, landing on degrees 2, 3, 6, 7",',
			'			"E F# G# A B C# D#",',
			'			func() string { return sc("E") }},',
			'		{"Eb major — flat side: degree 4 is Ab, because G# would repeat the letter G",',
			'			"Eb F G Ab Bb C D",',
			'			func() string { return sc("Eb") }},',
			'		{"F major — the single flat: letter B must fall to pc 10, so Bb",',
			'			"F G A Bb C D E",',
			'			func() string { return sc("F") }},',
			'		{"F# major — E# exists: degree 7 must use the letter E, and pc 5 on letter E is E#",',
			'			"F# G# A# B C# D# E#",',
			'			func() string { return sc("F#") }},',
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
			'// The two number lines every spelling question lives on: letters is',
			'// the 7-cycle the STAFF runs on, letterPC pins each letter to the',
			'// SEMITONE line. The gaps are uneven — E-F and B-C are only 1 — which',
			'// is the whole reason spelling is an algorithm and not a lookup: the',
			'// same 2s-and-1s pattern collides with the letter grid differently',
			'// depending on where you start.',
			'var letters = []string{"C", "D", "E", "F", "G", "A", "B"}',
			'var letterPC = []int{0, 2, 4, 5, 7, 9, 11}',
			'',
			'// accOffset turns an accidental suffix into its semitone shift: each',
			'// \'#\' +1, each \'b\' -1, \'x\' (double sharp) +2. Unknown runes are',
			'// ignored rather than guessed at — a malformed tonic surfaces as a',
			'// visibly wrong scale, not a hidden panic.',
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
			'// accSuffix is the inverse map, for the deltas a tonal scale can',
			'// produce: delta is how far the required pitch class sits from the',
			'// letter\'s natural one, already normalized to the shortest signed',
			'// distance. 0 falls through to "" — a natural needs no mark.',
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
			'// MajorScale walks the two lines in lockstep. The letter line advances',
			'// exactly one letter per degree — that IS the definition of correct',
			'// spelling — while the semitone line advances by 2 2 1 2 2 2 1.',
			'// Wherever the two disagree, an accidental absorbs the difference.',
			'func MajorScale(tonic string) []string {',
			'	steps := []int{2, 2, 1, 2, 2, 2, 1}',
			'',
			'	// Locate the tonic on both lines: its index in the letter cycle,',
			'	// and its pitch class (the letter\'s natural pc shifted by the',
			'	// accidental). The +12 guard keeps Go\'s %-of-negative away: in Go,',
			'	// (-1)%12 == -1, not 11, so "Cb"-style inputs would go negative.',
			'	li := 0',
			'	for i, l := range letters {',
			'		if l[0] == tonic[0] {',
			'			li = i',
			'		}',
			'	}',
			'	pc := ((letterPC[li]+accOffset(tonic[1:]))%12 + 12) % 12',
			'',
			'	out := make([]string, 7)',
			'	for deg := 0; deg < 7; deg++ {',
			'		L := (li + deg) % 7 // one letter per degree, no exceptions',
			'		// delta = required pc minus the letter\'s natural pc, taken',
			'		// mod 12 then re-centered to the shortest signed distance',
			'		// (a raw mod-12 delta of 11 is really -1: think Ab, not G-ten-',
			'		// sharps). This is the line where E# is born: in F# major,',
			'		// degree 7 must use letter E, the pattern demands pc 5, E\'s',
			'		// natural pc is 4 -> delta +1 -> "E#".',
			'		delta := ((pc-letterPC[L])%12 + 12) % 12',
			'		if delta > 6 {',
			'			delta -= 12',
			'		}',
			'		out[deg] = letters[L] + accSuffix(delta)',
			'		pc = (pc + steps[deg]) % 12 // advance the semitone line',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the letter rule is the algorithm, not a convention on top</h3>' +
			'<p>Notice what the solution never does: it never asks whether a note ' +
			'“should” be sharp or flat. The letter for each degree is forced ' +
			'(<code>(li + deg) % 7</code>), the pitch class for each degree is ' +
			'forced (the running sum of the pattern), and the accidental is just ' +
			'their difference. Spelling questions that sound like matters of ' +
			'taste — G# vs Ab, why F# major needs an E# — all collapse into one ' +
			'subtraction. That’s the deep point of this problem: <em>staff ' +
			'notation is a two-coordinate system</em>, letter × accidental, and a ' +
			'scale is a straight line in letter-space whose accidentals are the ' +
			'error term against the semitone pattern.</p>' +
			'<h3>The classic misconceptions</h3>' +
			'<ul>' +
			'<li><strong>“Sharps and flats are interchangeable.”</strong> On the ' +
			'keyboard, yes — pitch class 8 is one physical key. In a key, no: ' +
			'E-flat major <em>must</em> write Ab, because its letter-4 slot is A. ' +
			'Enharmonic equivalence is a fact about the semitone line only.</li>' +
			'<li><strong>“E# and Cb are theoretical nonsense.”</strong> They are ' +
			'forced outputs: any key whose letter line puts E in a slot requiring ' +
			'pc 5 writes E#. F# major is the first place most pianists meet ' +
			'one.</li>' +
			'<li><strong>“Normalize the delta with a plain mod.”</strong> A raw ' +
			'mod-12 difference of 11 must become −1 (a flat), not eleven sharps — ' +
			'hence the re-centering step. Skipping it is the classic ' +
			'implementation bug, and Go’s negative-<code>%</code> behavior adds a ' +
			'second trap on top.</li>' +
			'</ul>' +
			'<h3>At the piano</h3>' +
			'<p>This is why every major scale is fingered and read as “the same ' +
			'thing transposed”: the key signature absorbs all seven accidentals, ' +
			'and what remains on the staff is seven note-heads climbing one ' +
			'staff-position per degree — the letter line made visible. Your hand ' +
			'learns where the black keys fall (the 2s and 1s); your eye only ever ' +
			'reads the straight line.</p>',
		],
		complexity: { time: 'O(1) — seven degrees, constant work each', space: 'O(1) — the seven-slot result' },
	});
})();
