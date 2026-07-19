/* voice-leading — Harmony (Hard). Moving between chords with minimal hand
 * motion: chords are 3-note right-hand voicings as MIDI triples, the next
 * chord offers root position and two inversions at every octave, and
 * BestVoicing picks the candidate (lowest note within an octave of the
 * current lowest) minimizing total semitone motion under sorted
 * note-to-note pairing, tie-broken by top-note movement then lower bass.
 * The harness pins C->F landing on second-inversion F (C stays put), C->G
 * on G/B, C->Am keeping two common tones, a round trip home, the
 * leading-tone diminished chord, a deliberate tritone tie that forces the
 * tie-break rule, and TotalMotion's sort-before-pairing contract.
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// C major -> F major as a pianist plays it: not a leap to root-position
	// F, but a pivot onto second-inversion F. The common tone C holds
	// (dashed, ok), the other two fingers each move a step (accent).
	// Marker id namespaced (dgArrowMusVL): all tracks' SVGs share the
	// page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 208" width="540" height="208" role="img" aria-label="voice leading C major to F major: G moves up two semitones to A, E moves up one to F, C stays as a common tone; total motion 3 semitones">' +
		'<text x="20" y="24" class="lbl">C major → F major: pivot, don’t jump — total motion 3 semitones</text>' +
		'<text x="120" y="52" text-anchor="middle">C maj (60 64 67)</text>' +
		'<text x="420" y="52" text-anchor="middle">F maj (60 65 69)</text>' +
		'<text x="120" y="88" text-anchor="middle">G = 67</text>' +
		'<text x="420" y="80" text-anchor="middle">A = 69</text>' +
		'<line x1="165" y1="84" x2="368" y2="76" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowMusVL)"/>' +
		'<text x="266" y="70" text-anchor="middle" class="lbl" style="fill:var(--accent)">+2</text>' +
		'<text x="120" y="128" text-anchor="middle">E = 64</text>' +
		'<text x="420" y="120" text-anchor="middle">F = 65</text>' +
		'<line x1="165" y1="124" x2="368" y2="117" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowMusVL)"/>' +
		'<text x="266" y="110" text-anchor="middle" class="lbl" style="fill:var(--accent)">+1</text>' +
		'<text x="120" y="168" text-anchor="middle">C = 60</text>' +
		'<text x="420" y="168" text-anchor="middle">C = 60</text>' +
		'<line x1="165" y1="164" x2="368" y2="164" stroke="var(--ok)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="266" y="156" text-anchor="middle" class="lbl" style="fill:var(--ok)">common tone stays</text>' +
		'<text x="20" y="196" class="lbl">root-position F (65 69 72) would cost 5+5+5 = 15 — the inversion costs 3</text>' +
		'<defs><marker id="dgArrowMusVL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'voice-leading',
		title: 'Voice Leading: the Nearest Chord Wins',
		nav: 'voice leading',
		difficulty: 'Hard',
		category: 'Harmony',
		task: 'Implement TotalMotion (semitone cost between two voicings under sorted pairing) and BestVoicing (the inversion-and-octave of the next chord that minimizes it).',

		prose: [
			'<h2>Voice Leading: the Nearest Chord Wins</h2>' +
			'<p>Here is the thing that separates someone who <em>plays chords</em> ' +
			'from someone who <em>plays progressions</em>: the beginner learns C, F, ' +
			'and G as three root-position shapes and leaps the whole hand between ' +
			'them; the pianist barely moves. Going C&nbsp;→&nbsp;F, the hand does ' +
			'<strong>not</strong> jump a fourth to root-position F — it pivots onto ' +
			'<em>second-inversion</em> F: the thumb’s C stays put (F major contains ' +
			'a C!), E slides up a half step to F, G up a whole step to A. Three ' +
			'semitones of total motion instead of fifteen. This principle — ' +
			'<strong>keep common tones, move the rest by step</strong> — is voice ' +
			'leading, and it is centuries old: the rules of chorale writing are ' +
			'largely this idea formalized.</p>' +
			'<h3>The mini-model, precisely</h3>' +
			'<p>To compute it we need an exact model of “a chord under the ' +
			'hand”:</p>' +
			'<ul>' +
			'<li>A <strong>voicing</strong> is three MIDI notes in ascending order ' +
			'— a close-position right-hand shape.</li>' +
			'<li>A triad has three close-position shapes, one per choice of lowest ' +
			'note, described as semitone offsets from that lowest (bass) note. With ' +
			'(third,&nbsp;fifth) = (4,7) major, (3,7) minor, (3,6) diminished:</li>' +
			'</ul>',
			{ lang: 'txt', code: 'root position   {0, third, fifth}             C maj: C E G = {0,4,7}\n1st inversion   {0, fifth-third, 12-third}    C maj: E G C = {0,3,8}\n2nd inversion   {0, 12-fifth, 12-fifth+third} C maj: G C E = {0,5,9}' },
			'<ul>' +
			'<li><strong>Candidates</strong> for the next chord: each of the three ' +
			'shapes placed at every octave, keeping only those whose lowest note is ' +
			'within 12 semitones (inclusive) of the current voicing’s lowest note ' +
			'— the hand does not teleport.</li>' +
			'<li><strong>Cost</strong>: sort both voicings ascending, pair note to ' +
			'note by index, sum the absolute semitone differences. That is ' +
			'<code>TotalMotion</code>.</li>' +
			'<li><strong>Ties</strong>: prefer the candidate whose top note moves ' +
			'less (the top voice is the one the listener tracks as melody), then the ' +
			'candidate with the lower bass note.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p><code>TotalMotion(a, b)</code> implements the cost. ' +
			'<code>BestVoicing(current, nextRoot, nextQuality)</code> enumerates the ' +
			'candidates — <code>nextRoot</code> is a pitch class 0&ndash;11, ' +
			'<code>nextQuality</code> is <code>&quot;maj&quot;</code>, ' +
			'<code>&quot;min&quot;</code> or <code>&quot;dim&quot;</code> — and ' +
			'returns the winner in ascending order. Work through C&nbsp;(60&nbsp;64' +
			'&nbsp;67)&nbsp;→&nbsp;F by hand first: the second-inversion candidate ' +
			'(60&nbsp;65&nbsp;69) costs 0+1+2&nbsp;=&nbsp;3 and wins against every ' +
			'root-position placement.</p>' +
			'<div class="tip">Enumerating candidates is easiest bass-first: each ' +
			'shape’s bass has a fixed pitch class (the chord’s root, third, or ' +
			'fifth), so scan every MIDI note within ±12 of the current lowest note ' +
			'and keep the ones whose pitch class matches. Each surviving bass plus ' +
			'its shape’s two offsets IS a candidate, already sorted.</div>',
		],

		starter: [
			'package main',
			'',
			'// A voicing is three MIDI notes forming a close-position right-hand',
			'// chord shape. A triad has three such shapes, given as semitone',
			'// offsets from the lowest (bass) note, where (third, fifth) is',
			'// (4,7) for "maj", (3,7) for "min", (3,6) for "dim":',
			'//',
			'//   root position  {0, third, fifth}              C maj: C E G = {0,4,7}',
			'//   1st inversion  {0, fifth-third, 12-third}     C maj: E G C = {0,3,8}',
			'//   2nd inversion  {0, 12-fifth, 12-fifth+third}  C maj: G C E = {0,5,9}',
			'',
			'// TotalMotion is the semitone cost of moving between two voicings:',
			'// sort both triples ascending, pair note to note by index, and sum',
			'// the absolute differences. Inputs are not necessarily sorted.',
			'func TotalMotion(a, b [3]int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// BestVoicing picks the voicing of the next chord that a pianist',
			'// would grab. nextRoot is a pitch class 0-11 (C=0 ... B=11);',
			'// nextQuality is "maj", "min", or "dim".',
			'//',
			'// Candidates: each of the next chord\'s three shapes (above) placed',
			'// at every octave such that the candidate\'s LOWEST note is within',
			'// 12 semitones, inclusive, of current\'s lowest note. Among the',
			'// candidates, minimize TotalMotion(current, candidate); break ties',
			'// by the smaller absolute movement of the TOP note (current\'s',
			'// highest to candidate\'s highest), and any remaining tie by the',
			'// lower bass note. Return the winner in ascending order.',
			'func BestVoicing(current [3]int, nextRoot int, nextQuality string) [3]int {',
			'	// your code here',
			'	return [3]int{}',
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
			'	// The reference hand position all cases start from: middle-C major,',
			'	// C E G = MIDI 60 64 67.',
			'	cmaj := [3]int{60, 64, 67}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"C -> F: pivot to SECOND-INVERSION F (60 65 69) — the thumb\'s C never moves",',
			'			"[60 65 69]",',
			'			func() string { return fmt.Sprintf("%v", BestVoicing(cmaj, 5, "maj")) }},',
			'		{"C -> G: first-inversion G/B (59 62 67) — common tone G stays on top",',
			'			"[59 62 67]",',
			'			func() string { return fmt.Sprintf("%v", BestVoicing(cmaj, 7, "maj")) }},',
			'		{"C -> Am: two common tones (C and E) hold; only G walks up to A",',
			'			"[60 64 69]",',
			'			func() string { return fmt.Sprintf("%v", BestVoicing(cmaj, 9, "min")) }},',
			'		{"round trip: from F/C (60 65 69) the nearest C major is home, (60 64 67)",',
			'			"[60 64 67]",',
			'			func() string { return fmt.Sprintf("%v", BestVoicing([3]int{60, 65, 69}, 0, "maj")) }},',
			'		{"C -> Bdim: the leading-tone chord sits right under the hand (59 62 65)",',
			'			"[59 62 65]",',
			'			func() string { return fmt.Sprintf("%v", BestVoicing(cmaj, 11, "dim")) }},',
			'		{"C -> F#: up- and down-shift candidates tie at 6 semitones; smaller top-note move wins",',
			'			"[58 61 66]",',
			'			func() string { return fmt.Sprintf("%v", BestVoicing(cmaj, 6, "maj")) }},',
			'		{"TotalMotion sorts before pairing: (67 60 64) vs (60 65 69) is 3, not 17",',
			'			"3",',
			'			func() string { return fmt.Sprintf("%d", TotalMotion([3]int{67, 60, 64}, [3]int{60, 65, 69})) }},',
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
			'import "sort"',
			'',
			'// sorted3 returns an ascending copy of a voicing. Sorting before',
			'// pairing is what makes the cost model sane: it matches nearest',
			'// finger to nearest finger regardless of the order notes were listed,',
			'// and it means candidate voicings (built bass-up, already ascending)',
			'// compare correctly against any input order.',
			'func sorted3(v [3]int) [3]int {',
			'	s := []int{v[0], v[1], v[2]}',
			'	sort.Ints(s)',
			'	return [3]int{s[0], s[1], s[2]}',
			'}',
			'',
			'// TotalMotion sums absolute semitone movement under sorted index-wise',
			'// pairing — the "how far do my three fingers travel" number.',
			'func TotalMotion(a, b [3]int) int {',
			'	as, bs := sorted3(a), sorted3(b)',
			'	total := 0',
			'	for i := 0; i < 3; i++ {',
			'		d := as[i] - bs[i]',
			'		if d < 0 {',
			'			d = -d',
			'		}',
			'		total += d',
			'	}',
			'	return total',
			'}',
			'',
			'// BestVoicing enumerates every legal placement of the next chord and',
			'// keeps the cheapest under (motion, top-note move, bass) ordering.',
			'func BestVoicing(current [3]int, nextRoot int, nextQuality string) [3]int {',
			'	// The triad in offsets-from-bass form. Only third and fifth vary',
			'	// by quality; the three inversion shapes are pure arithmetic on',
			'	// them (rotate the triad, subtract the new bass, add 12 to what',
			'	// wrapped under it).',
			'	third, fifth := 4, 7 // "maj"',
			'	switch nextQuality {',
			'	case "min":',
			'		third, fifth = 3, 7',
			'	case "dim":',
			'		third, fifth = 3, 6',
			'	}',
			'	shapes := [3][3]int{',
			'		{0, third, fifth},                    // root position',
			'		{0, fifth - third, 12 - third},       // 1st inversion: bass = the third',
			'		{0, 12 - fifth, 12 - fifth + third},  // 2nd inversion: bass = the fifth',
			'	}',
			'	// Each shape\'s bass has a fixed pitch class: the chord\'s root,',
			'	// third, or fifth. That turns candidate generation into a scan:',
			'	// every MIDI note within +/-12 of the current lowest note whose',
			'	// pitch class matches is a legal bass for that shape.',
			'	bassPC := [3]int{',
			'		nextRoot % 12,',
			'		(nextRoot + third) % 12,',
			'		(nextRoot + fifth) % 12,',
			'	}',
			'',
			'	cur := sorted3(current)',
			'	low, top := cur[0], cur[2]',
			'',
			'	var best [3]int',
			'	// Sentinels above any reachable value: motion within +/-1 octave is',
			'	// bounded by 3 voices * 24 semitones.',
			'	bestMotion, bestTopMove, bestBass := 1<<30, 1<<30, 1<<30',
			'	for s := 0; s < 3; s++ {',
			'		for bass := low - 12; bass <= low+12; bass++ {',
			'			if ((bass%12)+12)%12 != bassPC[s] {',
			'				continue',
			'			}',
			'			// Shapes are ascending offsets, so the candidate is born sorted.',
			'			cand := [3]int{bass, bass + shapes[s][1], bass + shapes[s][2]}',
			'			motion := TotalMotion(cur, cand)',
			'			topMove := cand[2] - top',
			'			if topMove < 0 {',
			'				topMove = -topMove',
			'			}',
			'			// Lexicographic (motion, topMove, bass) minimum. Strict',
			'			// comparisons at each level implement the stated tie-break',
			'			// chain; two distinct candidates can never tie on all three',
			'			// (same shape family + same bass = same voicing).',
			'			if motion < bestMotion ||',
			'				(motion == bestMotion && (topMove < bestTopMove ||',
			'					(topMove == bestTopMove && bass < bestBass))) {',
			'				best, bestMotion, bestTopMove, bestBass = cand, motion, topMove, bass',
			'			}',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why minimal motion is the right objective</h3>' +
			'<p>Voice leading predates the piano: in choral writing each of four ' +
			'singers holds one melodic line, and lines that leap are hard to sing ' +
			'and hard to hear as continuous. The distilled rule — <em>keep common ' +
			'tones, move remaining voices by the smallest step available</em> — ' +
			'is exactly a minimization of total motion, and it explains why chord ' +
			'inversions exist at all. Inversions are not alternative flavors of a ' +
			'chord so much as the mechanism that lets adjacent chords ' +
			'<em>interlock</em>: within our one-octave window, some inversion of the ' +
			'next triad always lies within a few semitones of where you are. The ' +
			'I&ndash;IV&ndash;V of every beginner method — C, F/C, G/B — is ' +
			'precisely the output of your function.</p>' +
			'<h3>The subtleties the model pins down</h3>' +
			'<p>Sorted pairing matters: pairing unsorted note lists would charge ' +
			'phantom motion for mere reordering (the harness’s 3-vs-17 case). The ' +
			'octave window on the <em>bass</em> matters: without it, minimizing ' +
			'motion alone would still behave, but the search space becomes ' +
			'unbounded. And the tie-break is not decoration — moves by a tritone ' +
			'(the C&nbsp;→&nbsp;F# case) produce genuinely symmetric costs up and ' +
			'down, and preferring the stabler top note is the musical choice: the ' +
			'top voice is the one the ear follows as melody. Real four-part harmony ' +
			'adds constraints this model omits — voices must not cross, parallel ' +
			'fifths and octaves are forbidden, the leading tone must resolve up — ' +
			'but every one of them is layered on top of this same nearest-chord ' +
			'core.</p>' +
			'<h3>At the piano</h3>' +
			'<p>Practice progressions, not chords: play I&nbsp;→&nbsp;IV&nbsp;→' +
			'&nbsp;V&nbsp;→&nbsp;I in C as (60&nbsp;64&nbsp;67)&nbsp;→&nbsp;(60' +
			'&nbsp;65&nbsp;69)&nbsp;→&nbsp;(59&nbsp;62&nbsp;67)&nbsp;→&nbsp;(60' +
			'&nbsp;64&nbsp;67) and watch how little the hand travels — each ' +
			'transition is your function’s output. Then run the same numbers in ' +
			'every key. When you later meet a lead sheet, this is the skill that ' +
			'turns a column of chord symbols into a smooth accompaniment: the next ' +
			'chord is always nearer than it looks.</p>',
		],
		complexity: { time: 'O(1) — at most ~9 candidates in the 25-semitone bass window, constant work each', space: 'O(1)' },
	});
})();
