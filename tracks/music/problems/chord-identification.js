/* chord-identification — Chords (Hard). The inverse problem: given 3 or 4
 * spelled notes with octaves in low-to-high played order, name the chord
 * and its inversion ("C maj, 1st inversion", "G 7, 2nd inversion"). The
 * algorithm: try each played note as candidate root (low to high), compute
 * pitch-class intervals from it, match against the triad/seventh quality
 * tables; the bass note's slot in the matched stack is the inversion.
 * Probing bass-first doubles as the tiebreak for dim7's 3-fold symmetry —
 * the lowest note is declared root, which is what a player assumes without
 * more context. The harness pins all three inversions of C maj, Bm7b5 and
 * F7 in root position, G7 and Dm7 inverted, and one symmetric dim7.
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// Same three pitch classes, three different chords-in-the-hand: the bass
	// alone decides root position vs 1st vs 2nd inversion. Boxes stack low
	// (bottom) to high (top); the warm box is the bass. No <marker>
	// elements, so nothing needs id-namespacing.
	var DIAGRAM = (function () {
		var groups = [
			{ x: 60, label: 'root position', notes: ['C', 'E', 'G'] },
			{ x: 220, label: '1st inversion', notes: ['E', 'G', 'C'] },
			{ x: 380, label: '2nd inversion', notes: ['G', 'C', 'E'] },
		];
		var s = '<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" ' +
			'aria-label="C major stacked three ways: C E G root position, E G C first inversion, G C E second inversion; the lowest note is highlighted as the bass">' +
			'<text x="20" y="22" class="lbl">one chord, three hand positions — the bass (warm box) names the inversion</text>';
		for (var g = 0; g < groups.length; g++) {
			var grp = groups[g];
			for (var i = 0; i < 3; i++) {
				// i=0 is the bass, drawn at the BOTTOM (y decreases as pitch rises)
				var y = 130 - 38 * i;
				var stroke = i === 0 ? 'var(--warn)' : 'var(--accent)';
				s += '<rect x="' + grp.x + '" y="' + y + '" width="90" height="32" rx="5" fill="none" stroke="' + stroke + '" stroke-width="2"/>' +
					'<text x="' + (grp.x + 45) + '" y="' + (y + 21) + '" text-anchor="middle">' + grp.notes[i] + '</text>';
			}
			s += '<text x="' + (grp.x + 45) + '" y="186" text-anchor="middle" class="lbl">' + grp.label + '</text>';
		}
		return s + '</svg>';
	})();

	T.problem({
		id: 'chord-identification',
		title: 'Chord Identification: Naming What You See',
		nav: 'chord id',
		difficulty: 'Hard',
		category: 'Chords',
		task: 'Implement IdentifyChord(notes) — from 3 or 4 played notes, recover the root, quality, and inversion.',

		prose: [
			'<h2>Chord Identification: Naming What You See</h2>' +
			'<p>The last two problems went chord symbol &rarr; notes. Real playing ' +
			'runs the arrow backwards constantly: you look at a hand position — ' +
			'yours on the keys, or four notes stacked on a staff — and must say ' +
			'what it <em>is</em>. E&nbsp;G&nbsp;C under the fingers is not an ' +
			'&ldquo;E&nbsp;something&rdquo;: it is C&nbsp;major with its root ' +
			'moved to the top, a <strong>1st inversion</strong>. This inverse ' +
			'problem is harder than the forward one for exactly the reason ' +
			'inverse problems usually are — the root is no longer handed to you, ' +
			'so you must <em>search</em> for it.</p>' +
			'<h3>The algorithm</h3>' +
			'<ul>' +
			'<li><strong>Strip octaves, keep order.</strong> The input is spelled ' +
			'notes with octaves, low to high as played (<code>G3 C4 E4</code>). ' +
			'Octaves matter only for one thing: the first note is the ' +
			'<strong>bass</strong>.</li>' +
			'<li><strong>Try each played note as the candidate root</strong>, low ' +
			'to high. Compute every note\'s pitch-class interval from the ' +
			'candidate (<code>(pc &minus; rootPC) mod 12</code>) and compare the ' +
			'<em>set</em> against the quality tables — triads maj/min/dim/aug for ' +
			'3 notes, maj7/7/m7/m7b5/dim7 for 4. A wrong candidate produces a ' +
			'set like {0,3,8} that matches nothing; the right one produces ' +
			'{0,4,7}.</li>' +
			'<li><strong>The bass\'s slot in the matched stack is the ' +
			'inversion.</strong> Stack = intervals sorted ascending (root, third, ' +
			'fifth, seventh). Bass at slot 0 &rarr; root position, slot 1 &rarr; ' +
			'1st inversion, slot 2 &rarr; 2nd, slot 3 &rarr; 3rd.</li>' +
			'</ul>',
			{ lang: 'txt', code: 'E4 G4 C5  (bass = E)\n  try E: {E-E, G-E, C-E} = {0, 3, 8}   -> matches nothing\n  try G: {0, 5, 9}                     -> matches nothing\n  try C: {C-C, E-C, G-C} = {0, 4, 7}   -> maj!\n  bass E is 4 above C -> slot 1 of {0,4,7} -> "C maj, 1st inversion"' },
			DIAGRAM +
			'<h3>The symmetric special case</h3>' +
			'<p>dim7 is a stack of minor thirds — {0,3,6,9} — and rotating it ' +
			'gives {0,3,6,9} again. So for a dim7 <em>every</em> candidate root ' +
			'matches, and the notes genuinely do not determine the root. The ' +
			'convention this problem uses (and the one players fall back on ' +
			'without more context): <strong>declare the lowest note the ' +
			'root</strong> — D&nbsp;F&nbsp;Ab&nbsp;B is &ldquo;D&nbsp;dim7, root ' +
			'position&rdquo;, even though a composer might have meant it as ' +
			'B&nbsp;dim7 over its third. Probing candidates in low-to-high order ' +
			'implements the convention for free: the bass is tried first and ' +
			'wins. (The augmented triad, {0,4,8}, is symmetric the same way and ' +
			'gets the same treatment.)</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>IdentifyChord(notes)</code>, returning exactly ' +
			'<code>&quot;&lt;root&gt; &lt;quality&gt;, &lt;position&gt;&quot;</code> ' +
			'— root spelled as it appears in the input (octave stripped), quality ' +
			'one of <code>maj min dim aug maj7 7 m7 m7b5 dim7</code>, position ' +
			'one of <code>root position</code>, <code>1st inversion</code>, ' +
			'<code>2nd inversion</code>, <code>3rd inversion</code>.</p>' +
			'<div class="tip">A real ambiguity this problem deliberately leaves ' +
			'out: A&nbsp;C&nbsp;E&nbsp;G is both Am7 and C6 (a C&nbsp;major ' +
			'triad plus a sixth) — identical keys, and musicians argue about ' +
			'which name fits from context. Since our tables carry no 6th chords, ' +
			'the m7 reading always wins here; know that the argument exists ' +
			'before you trust any chord-naming algorithm, including this ' +
			'one.</div>',
		],

		starter: [
			'package main',
			'',
			'// IdentifyChord names the chord formed by 3 or 4 spelled notes with',
			'// octaves (e.g. "G3", "C4", "Eb4"), given in low-to-high played',
			'// order. It returns "<root> <quality>, <position>", e.g.',
			'//',
			'//	"C maj, root position"    "C maj, 1st inversion"',
			'//	"G 7, 2nd inversion"      "D m7, 3rd inversion"',
			'//',
			'// The root is spelled as it appears in the input, octave stripped.',
			'// Qualities (pitch-class intervals from the root):',
			'//',
			'//	3 notes: maj {0,4,7}  min {0,3,7}  dim {0,3,6}  aug {0,4,8}',
			'//	4 notes: maj7 {0,4,7,11}  7 {0,4,7,10}  m7 {0,3,7,10}',
			'//	         m7b5 {0,3,6,10}  dim7 {0,3,6,9}',
			'//',
			'// Method: try each played note as candidate root in LOW-TO-HIGH',
			'// order; the first whose interval set matches a table wins. The',
			'// bass\'s slot in the matched (ascending) stack is the inversion:',
			'// slot 0 root position, 1/2/3 -> 1st/2nd/3rd inversion. Trying the',
			'// bass first is also the tiebreak for the rotation-symmetric chords',
			'// (dim7, aug): their lowest note is declared root. If nothing',
			'// matches, return "".',
			'//',
			'// Pitch classes: C=0 D=2 E=4 F=5 G=7 A=9 B=11; "#" +1, "b" -1,',
			'// "x" +2, "bb" -2. Octave digits follow the accidental ("Eb4").',
			'func IdentifyChord(notes []string) string {',
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
			'		name  string',
			'		notes []string',
			'		want  string',
			'	}',
			'	cases := []tc{',
			'		{"closed C major, root on the bottom — the reference answer",',
			'			[]string{"C4", "E4", "G4"}, "C maj, root position"},',
			'		{"same three pitch classes, E in the bass — the bass alone changes the answer",',
			'			[]string{"E4", "G4", "C5"}, "C maj, 1st inversion"},',
			'		{"G under middle C in the bass — 2nd inversion, the cadential 6/4 shape",',
			'			[]string{"G3", "C4", "E4"}, "C maj, 2nd inversion"},',
			'		{"four notes on white keys: half-diminished, not m7 — the fifth F is only 6 above B",',
			'			[]string{"B3", "D4", "F4", "A4"}, "B m7b5, root position"},',
			'		{"a dominant seventh built on F — the Eb in the input must survive into the name",',
			'			[]string{"F3", "A3", "C4", "Eb4"}, "F 7, root position"},',
			'		{"G7 with D in the bass — only the candidate G yields a table match",',
			'			[]string{"D4", "F4", "G4", "B4"}, "G 7, 2nd inversion"},',
			'		{"Dm7 with its seventh in the bass — slot 3 of the stack, 3rd inversion",',
			'			[]string{"C4", "D4", "F4", "A4"}, "D m7, 3rd inversion"},',
			'		{"dim7 symmetry: every rotation matches, so the LOWEST note is declared root",',
			'			[]string{"D4", "F4", "Ab4", "B4"}, "D dim7, root position"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name + " [" + strings.Join(c.notes, " ") + "]", "want": c.want}',
			'		runCase(r, func() {',
			'			got := IdentifyChord(c.notes)',
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
			'var naturalPC = map[byte]int{\'C\': 0, \'D\': 2, \'E\': 4, \'F\': 5, \'G\': 7, \'A\': 9, \'B\': 11}',
			'var accSemis = map[string]int{"": 0, "#": 1, "b": -1, "x": 2, "bb": -2}',
			'',
			'// qual pairs an output name with its interval stack, sorted ascending',
			'// — which is chord-tone order (root, third, fifth[, seventh]), so a',
			'// slot index in the stack IS the inversion number.',
			'type qual struct {',
			'	name  string',
			'	stack []int',
			'}',
			'',
			'// Within one candidate root at most one entry can match (the sets',
			'// are pairwise distinct), so probe order inside a table is free.',
			'var triadTable = []qual{',
			'	{"maj", []int{0, 4, 7}},',
			'	{"min", []int{0, 3, 7}},',
			'	{"dim", []int{0, 3, 6}},',
			'	{"aug", []int{0, 4, 8}},',
			'}',
			'var seventhTable = []qual{',
			'	{"maj7", []int{0, 4, 7, 11}},',
			'	{"7", []int{0, 4, 7, 10}},',
			'	{"m7", []int{0, 3, 7, 10}},',
			'	{"m7b5", []int{0, 3, 6, 10}},',
			'	{"dim7", []int{0, 3, 6, 9}},',
			'}',
			'',
			'var posName = []string{"root position", "1st inversion", "2nd inversion", "3rd inversion"}',
			'',
			'// parseNote splits "Eb4" into its spelling ("Eb") and pitch class',
			'// (3). The octave digits are stripped, not used: once the caller has',
			'// given us the notes in played order, register never matters again —',
			'// chord quality is a pitch-class fact.',
			'func parseNote(note string) (string, int) {',
			'	j := len(note)',
			'	for j > 0 && note[j-1] >= \'0\' && note[j-1] <= \'9\' {',
			'		j--',
			'	}',
			'	spelled := note[:j]',
			'	pc := ((naturalPC[spelled[0]]+accSemis[spelled[1:]])%12 + 12) % 12',
			'	return spelled, pc',
			'}',
			'',
			'func equalInts(a, b []int) bool {',
			'	if len(a) != len(b) {',
			'		return false',
			'	}',
			'	for i := range a {',
			'		if a[i] != b[i] {',
			'			return false',
			'		}',
			'	}',
			'	return true',
			'}',
			'',
			'func IdentifyChord(notes []string) string {',
			'	names := make([]string, len(notes))',
			'	pcs := make([]int, len(notes))',
			'	for i, n := range notes {',
			'		names[i], pcs[i] = parseNote(n)',
			'	}',
			'	table := triadTable',
			'	if len(notes) == 4 {',
			'		table = seventhTable',
			'	}',
			'	// Candidate roots in LOW-TO-HIGH played order. For asymmetric',
			'	// chords exactly one candidate matches, so order is irrelevant;',
			'	// for the symmetric ones (dim7, aug — stacks that rotate onto',
			'	// themselves) EVERY candidate matches, and bass-first probing is',
			'	// precisely the "lowest note is the root" convention.',
			'	for c := range pcs {',
			'		iv := make([]int, len(pcs))',
			'		for i, pc := range pcs {',
			'			iv[i] = ((pc-pcs[c])%12 + 12) % 12',
			'		}',
			'		bass := iv[0] // input is played order, so index 0 is the bass',
			'		sorted := append([]int(nil), iv...)',
			'		sort.Ints(sorted)',
			'		for _, q := range table {',
			'			if !equalInts(sorted, q.stack) {',
			'				continue',
			'			}',
			'			// The stack ascends root..top, so the bass\'s slot in it',
			'			// is the inversion number directly — no second lookup',
			'			// table needed.',
			'			for k, s := range q.stack {',
			'				if s == bass {',
			'					return names[c] + " " + q.name + ", " + posName[k]',
			'				}',
			'			}',
			'		}',
			'	}',
			'	// Not a tertian chord these tables know (clusters, 6th chords,',
			'	// suspensions...). Returning "" keeps the contract honest instead',
			'	// of guessing.',
			'	return ""',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why search, not solve</h3>' +
			'<p>The forward problems were pure functions: root and quality in, ' +
			'notes out. The inverse has no closed form because the information ' +
			'was thrown away — a pile of pitch classes does not carry its root. ' +
			'The standard move (in music software and in trained ears alike) is ' +
			'<strong>hypothesize-and-test</strong>: at most four candidate roots ' +
			'exist, each is O(1) to check against nine small tables, so brute ' +
			'force is not a compromise, it is the algorithm. Jazz educators teach ' +
			'the same search to humans as &ldquo;stack it in thirds&rdquo;: ' +
			'mentally rotate the notes until they pile up as every-other-letter, ' +
			'and the bottom of the pile is the root. Rotating until the sorted ' +
			'intervals match {0,3/4,6/7/8,&hellip;} is that trick, formalized.</p>' +
			'<h3>What the bass adds</h3>' +
			'<p>Note the clean split the algorithm exposes: <strong>quality is a ' +
			'set property</strong> (any octave scrambling of C,E,G is some C ' +
			'major), but <strong>inversion is solely the bass\'s doing</strong> — ' +
			'the middle voices can sit anywhere. That is why the code only ever ' +
			'consults <code>iv[0]</code> after matching. It is also why ' +
			'inversions have such distinct personalities to the ear: the 1st ' +
			'inversion sounds lighter (a third in the bass), the 2nd sounds ' +
			'unstable and traditionally resolves like a suspension — the ' +
			'&ldquo;cadential 6/4&rdquo; pinned in the harness. The classic bug ' +
			'in home-grown identifiers is sorting the notes by pitch class ' +
			'before finding the bass, which silently turns every input into ' +
			'root position; keep the played order sacred.</p>' +
			'<h3>At the piano</h3>' +
			'<p>Drill this as a game: play any white-key triad shape, name it ' +
			'aloud with inversion, then check by restacking it in thirds. When ' +
			'you hit D&nbsp;F&nbsp;A&#9837;&nbsp;B (or any dim7), notice that ' +
			'restacking never settles — every rotation looks like thirds. That ' +
			'physical experience <em>is</em> the symmetry in {0,3,6,9}, and the ' +
			'&ldquo;call the bottom note the root&rdquo; convention you just ' +
			'implemented is what working players do until the next chord reveals ' +
			'where the music was actually going.</p>',
		],
		complexity: { time: 'O(n² q) with n ≤ 4 notes and q ≤ 5 qualities — a few dozen comparisons, constant in practice', space: 'O(n)' },
	});
})();
