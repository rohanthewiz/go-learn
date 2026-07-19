/* minor-scales — Scales & Keys (Medium). The three minor forms as three
 * step patterns over one spelling engine: natural 2122122, harmonic
 * 2122131 (raised 7th, creating the augmented-second gap), melodic
 * ascending 2122221 (raised 6th and 7th). The harness pins A natural
 * (all white keys), A and C harmonic (the raised 7th as G# and as plain
 * B), F# harmonic (E# again), G melodic ascending (E natural + F#), and
 * Eb harmonic — where the letter rule spells the exotic gap as Cb→D.
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// The three forms differ only in how the top of the scale is filled in;
	// warn-colored cells mark where each form departs from natural minor.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="step patterns of the three minor forms: natural 2122122, harmonic 2122131 with a 3-semitone augmented second, melodic ascending 2122221">' +
		'<text x="20" y="24" class="lbl">all three forms share degrees 1–5; they differ only in degrees 6 and 7</text>' +
		'<text x="24" y="70">natural</text>' +
		'<text x="24" y="110">harmonic</text>' +
		'<text x="24" y="150">melodic ↑</text>' +
		'<text x="176" y="70" text-anchor="middle">2</text>' +
		'<text x="228" y="70" text-anchor="middle">1</text>' +
		'<text x="280" y="70" text-anchor="middle">2</text>' +
		'<text x="332" y="70" text-anchor="middle">2</text>' +
		'<text x="384" y="70" text-anchor="middle">1</text>' +
		'<text x="436" y="70" text-anchor="middle">2</text>' +
		'<text x="488" y="70" text-anchor="middle">2</text>' +
		'<text x="176" y="110" text-anchor="middle">2</text>' +
		'<text x="228" y="110" text-anchor="middle">1</text>' +
		'<text x="280" y="110" text-anchor="middle">2</text>' +
		'<text x="332" y="110" text-anchor="middle">2</text>' +
		'<text x="384" y="110" text-anchor="middle">1</text>' +
		'<text x="436" y="110" text-anchor="middle" style="fill:var(--warn)">3</text>' +
		'<text x="488" y="110" text-anchor="middle" style="fill:var(--warn)">1</text>' +
		'<rect x="420" y="92" width="32" height="26" rx="5" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<text x="176" y="150" text-anchor="middle">2</text>' +
		'<text x="228" y="150" text-anchor="middle">1</text>' +
		'<text x="280" y="150" text-anchor="middle">2</text>' +
		'<text x="332" y="150" text-anchor="middle">2</text>' +
		'<text x="384" y="150" text-anchor="middle" style="fill:var(--ok)">2</text>' +
		'<text x="436" y="150" text-anchor="middle" style="fill:var(--ok)">2</text>' +
		'<text x="488" y="150" text-anchor="middle" style="fill:var(--ok)">1</text>' +
		'<text x="20" y="184" class="lbl">the boxed 3 is the augmented 2nd — three semitones spelled over ADJACENT letters (Eb minor: Cb→D)</text>' +
		'</svg>';

	T.problem({
		id: 'minor-scales',
		title: 'The Three Minor Scales',
		nav: 'minor scales',
		difficulty: 'Medium',
		category: 'Scales & Keys',
		task: 'Implement MinorScale(tonic, form): the natural, harmonic, or melodic-ascending minor scale, correctly spelled with one letter per degree.',

		prose: [
			'<h2>The Three Minor Scales</h2>' +
			'<p>“Minor” is not one scale — it is a family of three, and every one ' +
			'of them is the same machine you built for the major scale with a ' +
			'different step pattern plugged in:</p>' +
			'<ul>' +
			'<li><strong>Natural minor</strong> — <code>2&nbsp;1&nbsp;2&nbsp;2&nbsp;1&nbsp;2&nbsp;2</code>. ' +
			'The white keys from A to A. This is what the key signature alone ' +
			'gives you.</li>' +
			'<li><strong>Harmonic minor</strong> — <code>2&nbsp;1&nbsp;2&nbsp;2&nbsp;1&nbsp;3&nbsp;1</code>. ' +
			'The 7th degree is raised a semitone so the scale has a <em>leading ' +
			'tone</em>, a note one half step below the tonic that pulls home ' +
			'(and gives the dominant chord its major third). Raising the 7th ' +
			'stretches the 6th→7th step to <strong>3 semitones</strong> — the ' +
			'famous augmented second, the “exotic” gap.</li>' +
			'<li><strong>Melodic minor (ascending)</strong> — <code>2&nbsp;1&nbsp;2&nbsp;2&nbsp;2&nbsp;2&nbsp;1</code>. ' +
			'Raise the 6th <em>as well</em> and the augmented second disappears: ' +
			'a smooth melodic climb with the leading tone intact. (Classically ' +
			'the descent reverts to natural minor; this problem asks only for ' +
			'the ascending form.)</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>MinorScale(tonic, form)</code>. The spelling ' +
			'machinery is identical to the major scale — advance one letter per ' +
			'degree, land each letter on the pattern’s required pitch class via ' +
			'an accidental — only the step table changes with <code>form</code>. ' +
			'Two spelling consequences are worth tracing by hand before you ' +
			'code:</p>',
			{ lang: 'txt', code: 'C harmonic minor — the raised 7th is plain "B", not "Cb-something"\nletter:        C  D  E  F  G  A  B\nrequired pc:   0  2  3  5  7  8  11\nnatural pc:    0  2  4  5  7  9  11\naccidental:    .  .  -1 .  .  -1 0      ->  C D Eb F G Ab B\n\nEb harmonic minor — the augmented 2nd in the wild\nEb F Gb Ab Bb Cb D:  Cb (pc 11) -> D (pc 2) is 3 semitones,\nyet written over adjacent letters C->D: an AUGMENTED SECOND' },
			'<div class="tip">The algorithm outputs absolute spellings: C harmonic ' +
			'minor’s 7th is simply <code>B</code>. On a printed page that same ' +
			'note wears a <em>natural sign</em>, because C minor’s key signature ' +
			'has already flattened B — accidentals in print are relative to the ' +
			'signature, accidentals in your output are relative to nothing. Keep ' +
			'the two frames straight and harmonic minor stops being ' +
			'confusing.</div>',
		],

		starter: [
			'package main',
			'',
			'// MinorScale returns the seven notes of the minor scale on tonic in',
			'// the given form, ascending, correctly spelled, no octave numbers.',
			'// Examples: ("A", "natural") -> [A B C D E F G];',
			'// ("C", "harmonic") -> [C D Eb F G Ab B].',
			'//',
			'// forms and their semitone step patterns:',
			'//   "natural"   2 1 2 2 1 2 2',
			'//   "harmonic"  2 1 2 2 1 3 1   (raised 7th; the 3 is an aug 2nd)',
			'//   "melodic"   2 1 2 2 2 2 1   (ascending: raised 6th AND 7th)',
			'//',
			'// Conventions (same as the major-scale problem):',
			'//   - tonic is a letter A-G plus optional "#" (+1) or "b" (-1).',
			'//   - pitch classes mod 12: C=0 C#=1 ... B=11.',
			'//   - natural letter pitch classes: C=0 D=2 E=4 F=5 G=7 A=9 B=11.',
			'//   - one letter per degree, in cyclic order from the tonic\'s letter;',
			'//     accidentals ("bb", "b", "", "#", "x") close the gap between each',
			'//     letter\'s natural pitch class and the degree\'s required one.',
			'func MinorScale(tonic, form string) []string {',
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
			'	sc := func(tonic, form string) string { return strings.Join(MinorScale(tonic, form), " ") }',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"A natural — the white-key baseline: the relative-minor mirror of C major",',
			'			"A B C D E F G",',
			'			func() string { return sc("A", "natural") }},',
			'		{"E natural — one sharp (F#), the same accidental as its relative G major",',
			'			"E F# G A B C D",',
			'			func() string { return sc("E", "natural") }},',
			'		{"A harmonic — the raised 7th appears as G#, giving A minor a leading tone",',
			'			"A B C D E F G#",',
			'			func() string { return sc("A", "harmonic") }},',
			'		{"C harmonic — the raised 7th is plain B (letter B, delta 0), never Cb",',
			'			"C D Eb F G Ab B",',
			'			func() string { return sc("C", "harmonic") }},',
			'		{"F# harmonic — the raised 7th on letter E at pc 5 forces E#",',
			'			"F# G# A B C# D E#",',
			'			func() string { return sc("F#", "harmonic") }},',
			'		{"G melodic ascending — raised 6th AND 7th: E natural then F#",',
			'			"G A Bb C D E F#",',
			'			func() string { return sc("G", "melodic") }},',
			'		{"Eb harmonic — the exotic gap: Cb to D is 3 semitones over adjacent letters (aug 2nd)",',
			'			"Eb F Gb Ab Bb Cb D",',
			'			func() string { return sc("Eb", "harmonic") }},',
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
			'// The same two number lines as the major-scale problem: letters is the',
			'// 7-cycle the staff runs on, letterPC pins each letter to the semitone',
			'// line. Minor scales need NOTHING new here — only the step table',
			'// changes, which is the whole lesson of this problem.',
			'var letters = []string{"C", "D", "E", "F", "G", "A", "B"}',
			'var letterPC = []int{0, 2, 4, 5, 7, 9, 11}',
			'',
			'// stepsFor maps a form name to its semitone pattern. A fresh slice per',
			'// call, so no caller can mutate a shared table; nil for unknown forms,',
			'// which MinorScale surfaces as a nil scale rather than a panic.',
			'func stepsFor(form string) []int {',
			'	switch form {',
			'	case "natural":',
			'		return []int{2, 1, 2, 2, 1, 2, 2}',
			'	case "harmonic":',
			'		// Natural minor with the 7th raised: the step INTO the 7th',
			'		// grows to 3 (the augmented 2nd) and the step out shrinks to',
			'		// 1 — the leading-tone half step the form exists to create.',
			'		return []int{2, 1, 2, 2, 1, 3, 1}',
			'	case "melodic":',
			'		// Ascending form: 6th and 7th both raised, which smooths the',
			'		// augmented 2nd back into two whole steps.',
			'		return []int{2, 1, 2, 2, 2, 2, 1}',
			'	}',
			'	return nil',
			'}',
			'',
			'// accOffset: accidental suffix -> semitone shift (\'#\' +1, \'b\' -1,',
			'// \'x\' +2). Unknown runes are ignored — bad input shows up as a',
			'// visibly wrong scale, not a panic.',
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
			'// accSuffix: normalized delta -> accidental mark. 0 falls through to',
			'// "" — this is exactly the C-harmonic-minor case, where the raised',
			'// 7th lands on letter B\'s own natural pitch class and needs no mark.',
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
			'// MinorScale is the letter-line/semitone-line walk with a pluggable',
			'// step table. Note what does NOT change between forms: the letters.',
			'// All three E-flat minors use E F G A B C D — the forms only move',
			'// degrees 6 and 7 along the semitone line, and the accidental math',
			'// absorbs the difference (Cb in harmonic, C in melodic).',
			'func MinorScale(tonic, form string) []string {',
			'	steps := stepsFor(form)',
			'	if steps == nil {',
			'		return nil',
			'	}',
			'',
			'	// Tonic on both lines; the +12 guard keeps Go\'s %-of-negative',
			'	// away ((-1)%12 == -1 in Go, not 11).',
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
			'		L := (li + deg) % 7 // one letter per degree, in every form',
			'		// Shortest signed distance from the letter\'s natural pc to',
			'		// the required pc: a raw mod-12 delta of 11 is really -1',
			'		// (Eb harmonic\'s 6th: letter C natural 0, required 11 -> Cb).',
			'		delta := ((pc-letterPC[L])%12 + 12) % 12',
			'		if delta > 6 {',
			'			delta -= 12',
			'		}',
			'		out[deg] = letters[L] + accSuffix(delta)',
			'		pc = (pc + steps[deg]) % 12',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why three forms exist at all</h3>' +
			'<p>Natural minor is what the key signature gives you, but it has a ' +
			'harmonic defect: its 7th degree sits a whole step below the tonic, so ' +
			'the chord built on the 5th degree is minor and nothing <em>pulls</em> ' +
			'toward home. Composers fixed it by force — raise the 7th and the ' +
			'dominant chord turns major, its third becoming a leading tone a half ' +
			'step under the tonic. That surgical fix is <strong>harmonic</strong> ' +
			'minor, and its scar is the 3-semitone gap between degrees 6 and 7. ' +
			'When a <em>melody</em> has to climb through that gap, the gap itself ' +
			'gets patched — raise the 6th too — giving <strong>melodic</strong> ' +
			'minor ascending. One defect, two patches, three scales.</p>' +
			'<h3>The spelling subtleties the harness pins</h3>' +
			'<ul>' +
			'<li><strong>A raised 7th is not always a sharp.</strong> In C ' +
			'harmonic minor the 7th is plain <code>B</code>: the letter rule ' +
			'assigns letter B, the pattern demands pc 11, and B’s natural pc ' +
			'<em>is</em> 11 — delta 0. In flat keys, “raising” a degree usually ' +
			'means <em>removing a flat</em>, not adding a sharp.</li>' +
			'<li><strong>The augmented second is a second.</strong> Eb harmonic ' +
			'minor runs …Bb&nbsp;Cb&nbsp;D…: Cb→D spans 3 semitones but only one ' +
			'letter step, so it is an augmented <em>second</em>, not a minor ' +
			'third. Interval names count letters first, semitones second — the ' +
			'same two-line split this whole track keeps computing.</li>' +
			'<li><strong>E# returns.</strong> Any time letter E must carry pc 5 ' +
			'(F# harmonic minor’s raised 7th), the algorithm writes E# without ' +
			'ceremony. If your implementation special-cases it, the letter line ' +
			'is not really in charge.</li>' +
			'</ul>' +
			'<h3>At the piano</h3>' +
			'<p>Practice the forms as <em>edits</em>, not as three unrelated ' +
			'fingerings: play natural minor, then replay it lifting only the 7th ' +
			'(harmonic — listen for the gap between 6 and 7), then lifting 6 and ' +
			'7 together (melodic — the gap closes). Your ear learns exactly what ' +
			'each accidental buys, which is the knowledge the algorithm encodes: ' +
			'same letters, same machinery, one different table.</p>',
		],
		complexity: { time: 'O(1) — seven degrees, constant work each', space: 'O(1) — the seven-slot result' },
	});
})();
