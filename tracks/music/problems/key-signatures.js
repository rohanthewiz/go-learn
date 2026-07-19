/* key-signatures — Scales & Keys (Medium). The accidental count and the
 * ordered accidental list of any major key, computed from position on the
 * line of fifths instead of memorized. The harness pins C (empty), the
 * sharp side G / D / A, the flat side F / Ab, and both 7-accidental
 * extremes C# major (every letter sharp, ending B#) and Cb major (every
 * letter flat, ending Fb) — plus the fixed entry orders F C G D A E B
 * for sharps and its exact reverse B E A D G C F for flats.
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// Sharps enter left-to-right along the line of fifths; flats enter along
	// the SAME line read right-to-left. One list, two directions.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 214" width="560" height="214" role="img" aria-label="sharp order F C G D A E B, each a perfect fifth up from the last; flat order B E A D G C F is the same list reversed, each a perfect fifth down">' +
		'<text x="20" y="22" class="lbl">sharps enter in fifths going UP: each new sharp is a P5 above the last</text>' +
		'<rect x="30" y="34" width="44" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="52" y="56" text-anchor="middle">F#</text>' +
		'<rect x="102" y="34" width="44" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="124" y="56" text-anchor="middle">C#</text>' +
		'<rect x="174" y="34" width="44" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="196" y="56" text-anchor="middle">G#</text>' +
		'<rect x="246" y="34" width="44" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="268" y="56" text-anchor="middle">D#</text>' +
		'<rect x="318" y="34" width="44" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="340" y="56" text-anchor="middle">A#</text>' +
		'<rect x="390" y="34" width="44" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="412" y="56" text-anchor="middle">E#</text>' +
		'<rect x="462" y="34" width="44" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="484" y="56" text-anchor="middle">B#</text>' +
		'<line x1="76" y1="51" x2="99" y2="51" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowMusKS)"/>' +
		'<line x1="148" y1="51" x2="171" y2="51" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowMusKS)"/>' +
		'<line x1="220" y1="51" x2="243" y2="51" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowMusKS)"/>' +
		'<line x1="292" y1="51" x2="315" y2="51" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowMusKS)"/>' +
		'<line x1="364" y1="51" x2="387" y2="51" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowMusKS)"/>' +
		'<line x1="436" y1="51" x2="459" y2="51" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowMusKS)"/>' +
		'<text x="20" y="106" class="lbl">flats enter in fifths going DOWN: the same seven letters, read backwards</text>' +
		'<rect x="30" y="118" width="44" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="52" y="140" text-anchor="middle">Bb</text>' +
		'<rect x="102" y="118" width="44" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="124" y="140" text-anchor="middle">Eb</text>' +
		'<rect x="174" y="118" width="44" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="196" y="140" text-anchor="middle">Ab</text>' +
		'<rect x="246" y="118" width="44" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="268" y="140" text-anchor="middle">Db</text>' +
		'<rect x="318" y="118" width="44" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="340" y="140" text-anchor="middle">Gb</text>' +
		'<rect x="390" y="118" width="44" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="412" y="140" text-anchor="middle">Cb</text>' +
		'<rect x="462" y="118" width="44" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="484" y="140" text-anchor="middle">Fb</text>' +
		'<line x1="76" y1="135" x2="99" y2="135" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowMusKS)"/>' +
		'<line x1="148" y1="135" x2="171" y2="135" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowMusKS)"/>' +
		'<line x1="220" y1="135" x2="243" y2="135" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowMusKS)"/>' +
		'<line x1="292" y1="135" x2="315" y2="135" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowMusKS)"/>' +
		'<line x1="364" y1="135" x2="387" y2="135" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowMusKS)"/>' +
		'<line x1="436" y1="135" x2="459" y2="135" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowMusKS)"/>' +
		'<text x="20" y="182" class="lbl">a key takes a PREFIX of one row: G major stops after [F#]; Ab major takes [Bb Eb Ab Db]</text>' +
		'<text x="20" y="202" class="lbl">C# major takes all seven sharps; Cb major all seven flats — the two ends of the line</text>' +
		'<defs><marker id="dgArrowMusKS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'key-signatures',
		title: 'Key Signatures',
		nav: 'key signatures',
		difficulty: 'Medium',
		category: 'Scales & Keys',
		task: 'Implement SharpsOrFlats (signed accidental count of a major key) and KeySignature (the ordered accidental list: sharps in F C G D A E B order, flats in the reverse).',

		prose: [
			'<h2>Key Signatures</h2>' +
			'<p>Open any piece of sheet music and the first thing after the clef ' +
			'is a cluster of sharps or flats — the <em>key signature</em>, the ' +
			'seven accidentals of the scale compressed into a standing ' +
			'declaration. Two facts about it are pure structure, and both become ' +
			'one-line computations:</p>' +
			'<ul>' +
			'<li><strong>How many accidentals a key carries.</strong> Line the ' +
			'major keys up by fifths — F&nbsp;C&nbsp;G&nbsp;D&nbsp;A&nbsp;E&nbsp;B&nbsp;F#&nbsp;C#… ' +
			'— and the sharp count simply increments: C=0, G=1, D=2, A=3, E=4, ' +
			'B=5, F#=6, C#=7. Walk the other way and flats increment instead: ' +
			'F=1, Bb=2, Eb=3, Ab=4, Db=5, Gb=6, Cb=7. Model that as one signed ' +
			'number — the key’s <em>position on the line of fifths</em>, positive ' +
			'= sharps, negative = flats.</li>' +
			'<li><strong>Which accidentals, in which order.</strong> Sharps always ' +
			'enter as F#&nbsp;C#&nbsp;G#&nbsp;D#&nbsp;A#&nbsp;E#&nbsp;B#; flats always as ' +
			'Bb&nbsp;Eb&nbsp;Ab&nbsp;Db&nbsp;Gb&nbsp;Cb&nbsp;Fb. A key with <code>n</code> ' +
			'accidentals takes the first <code>n</code> of the appropriate list — ' +
			'a <em>prefix</em>, never a subset.</li>' +
			'</ul>' +
			'<p>Why are the two orders exact reverses of each other? Because they ' +
			'are the same object read in opposite directions. Each new sharp key ' +
			'sits a perfect fifth <em>up</em> from the last, and the sharp it adds ' +
			'is its new leading tone — also a fifth up from the previous sharp. ' +
			'Each new flat key sits a fifth <em>down</em>, and its new flat lands a ' +
			'fifth down from the previous one. One line of fifths, ' +
			'…Fb&nbsp;Cb&nbsp;Gb&nbsp;Db&nbsp;Ab&nbsp;Eb&nbsp;Bb&nbsp;<strong>F&nbsp;C&nbsp;G&nbsp;D&nbsp;A&nbsp;E&nbsp;B</strong>&nbsp;F#&nbsp;C#…, ' +
			'traversed rightward for sharps and leftward for flats.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>SharpsOrFlats(major)</code> and ' +
			'<code>KeySignature(major)</code>. The count needs no lookup table for ' +
			'every key — position the tonic’s <em>letter</em> on the line of fifths ' +
			'(F=−1 C=0 G=1 D=2 A=3 E=4 B=5) and shift ±7 per accidental on the ' +
			'tonic:</p>',
			{ lang: 'txt', code: 'fifths(letter):  F=-1  C=0  G=+1  D=+2  A=+3  E=+4  B=+5\nfifths(key) = fifths(letter) + 7 * accidentals-on-the-tonic\n\nfifths("Eb") = 4 - 7  = -3   -> 3 flats  [Bb Eb Ab]\nfifths("F#") = -1 + 7 = 6    -> 6 sharps [F# C# G# D# A# E#]\nfifths("Cb") = 0 - 7  = -7   -> 7 flats  [Bb Eb Ab Db Gb Cb Fb]' },
			'<div class="tip">Why ±7? Sharpening a tonic raises it one semitone, ' +
			'and one semitone is seven fifths on the line (7&nbsp;×&nbsp;7&nbsp;=&nbsp;49 ' +
			'semitones = 4 octaves + 1). So F→F# jumps the key from −1 to +6: ' +
			'F major’s one flat becomes F# major’s six sharps. The pianist’s ' +
			'mnemonic checks out too: the LAST sharp is the key’s leading tone ' +
			'(ti), one letter below the tonic — F# major’s sixth sharp is E#.</div>',
		],

		starter: [
			'package main',
			'',
			'// SharpsOrFlats returns the signed accidental count of a major key:',
			'// positive = sharps, negative = flats, 0 for C major.',
			'// Sharp side: C=0 G=1 D=2 A=3 E=4 B=5 F#=6 C#=7.',
			'// Flat side:  F=-1 Bb=-2 Eb=-3 Ab=-4 Db=-5 Gb=-6 Cb=-7.',
			'//',
			'// major is a letter A-G plus an optional "#" or "b" on the tonic.',
			'// Hint: position the LETTER on the line of fifths (F=-1 C=0 G=1 D=2',
			'// A=3 E=4 B=5), then shift +7 per "#" and -7 per "b".',
			'func SharpsOrFlats(major string) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// KeySignature returns the ordered accidental list of the key',
			'// signature, spelled like "F#" / "Bb":',
			'//   - sharp keys: a prefix of F# C# G# D# A# E# B#',
			'//   - flat keys:  a prefix of Bb Eb Ab Db Gb Cb Fb',
			'//   - C major: an empty list.',
			'// Examples: "D" -> [F# C#]; "Ab" -> [Bb Eb Ab Db].',
			'func KeySignature(major string) []string {',
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
			'	// One formatted string pins both functions at once: the signed',
			'	// count, then the ordered list in brackets. C major must render',
			'	// as "0 []" — an EMPTY list, not a nil-panic or a lone space.',
			'	sig := func(k string) string {',
			'		return fmt.Sprintf("%d [%s]", SharpsOrFlats(k), strings.Join(KeySignature(k), " "))',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"C major — the origin of the line of fifths: zero accidentals, empty list",',
			'			"0 []",',
			'			func() string { return sig("C") }},',
			'		{"G major — one step clockwise: the first sharp is always F#",',
			'			"1 [F#]",',
			'			func() string { return sig("G") }},',
			'		{"D major — sharps accumulate as a prefix: F# stays, C# joins",',
			'			"2 [F# C#]",',
			'			func() string { return sig("D") }},',
			'		{"A major — count only: three sharps",',
			'			"3",',
			'			func() string { return fmt.Sprintf("%d", SharpsOrFlats("A")) }},',
			'		{"F major — one step counter-clockwise: the first flat is always Bb",',
			'			"-1 [Bb]",',
			'			func() string { return sig("F") }},',
			'		{"Ab major — four flats, in entry order Bb Eb Ab Db (never sorted by letter)",',
			'			"-4 [Bb Eb Ab Db]",',
			'			func() string { return sig("Ab") }},',
			'		{"C# major — a sharp on the tonic shifts the whole key +7: all seven sharps, ending B#",',
			'			"7 [F# C# G# D# A# E# B#]",',
			'			func() string { return sig("C#") }},',
			'		{"Cb major — the mirror extreme: all seven flats, ending Fb",',
			'			"-7 [Bb Eb Ab Db Gb Cb Fb]",',
			'			func() string { return sig("Cb") }},',
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
			'// sharpOrder is the line of fifths restricted to the seven letters,',
			'// read left to right: F C G D A E B. Reading it forward IS the sharp',
			'// entry order; reading it backward IS the flat entry order. Storing',
			'// one list and indexing it from both ends makes the "the two orders',
			'// are reverses" fact structural instead of coincidental.',
			'var sharpOrder = []string{"F", "C", "G", "D", "A", "E", "B"}',
			'',
			'// SharpsOrFlats computes the key\'s position on the line of fifths.',
			'// The letter table is the anchor: F sits one fifth below C (hence -1),',
			'// and each entry rightward is a fifth up. An accidental on the TONIC',
			'// shifts the whole key by 7 — a semitone equals seven fifths on the',
			'// line (7 fifths = 49 semitones = 4 octaves + 1), which is why',
			'// F major (-1, one flat) sharpens into F# major (+6, six sharps).',
			'func SharpsOrFlats(major string) int {',
			'	pos := map[byte]int{\'F\': -1, \'C\': 0, \'G\': 1, \'D\': 2, \'A\': 3, \'E\': 4, \'B\': 5}',
			'	n := pos[major[0]]',
			'	for _, r := range major[1:] {',
			'		switch r {',
			'		case \'#\':',
			'			n += 7',
			'		case \'b\':',
			'			n -= 7',
			'		}',
			'	}',
			'	return n',
			'}',
			'',
			'// KeySignature materializes the count as an accidental list: the first',
			'// n entries of the sharp order (suffixed "#"), or the first n of the',
			'// same order read BACKWARD (suffixed "b"). The prefix property is the',
			'// key structural fact: signatures never skip — a key with D# in it',
			'// necessarily also has F#, C#, and G#.',
			'func KeySignature(major string) []string {',
			'	n := SharpsOrFlats(major)',
			'	switch {',
			'	case n > 0:',
			'		out := make([]string, n)',
			'		for i := 0; i < n; i++ {',
			'			out[i] = sharpOrder[i] + "#"',
			'		}',
			'		return out',
			'	case n < 0:',
			'		out := make([]string, -n)',
			'		for i := 0; i < -n; i++ {',
			'			// Index from the far end: B E A D G C F is F C G D A E B',
			'			// reversed, because each new flat enters a fifth DOWN.',
			'			out[i] = sharpOrder[6-i] + "b"',
			'		}',
			'		return out',
			'	}',
			'	// C major: explicitly empty (not nil) — "no accidentals" is a',
			'	// real signature, and callers should be able to range over it.',
			'	return []string{}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>One line, two readings</h3>' +
			'<p>The mnemonics every student memorizes — “Father Charles Goes Down ' +
			'And Ends Battle” for sharps, “Battle Ends And Down Goes Charles’ ' +
			'Father” for flats — are the same seven letters in opposite ' +
			'directions, and the solution makes that literal: one array, indexed ' +
			'<code>[i]</code> for sharps and <code>[6-i]</code> for flats. The ' +
			'reason is the line of fifths itself. Moving a key a fifth up adds ' +
			'exactly one sharp, and the sharp it adds is the new key’s leading ' +
			'tone — which sits a fifth above the previous key’s leading tone. So ' +
			'the sequence of <em>added accidentals</em> marches up the line in ' +
			'lockstep with the sequence of <em>keys</em>. Flats are the identical ' +
			'argument run downhill.</p>' +
			'<h3>Why ±7 per tonic accidental is exact, not approximate</h3>' +
			'<p>Seven fifths span 49 semitones; 49 mod 12 is 1. So transposing a ' +
			'key by one semitone (C→C#) moves it seven positions along the line ' +
			'of fifths (0→+7), and every one of its seven letters picks up one ' +
			'more sharp’s worth of alteration. That is why C# major’s signature ' +
			'is <em>all seven</em> sharps — it is C major’s empty signature ' +
			'shifted 7 — and why the enharmonic pairs frame the same sound two ' +
			'ways: C#&nbsp;(+7) vs Db&nbsp;(−5), B&nbsp;(+5) vs Cb&nbsp;(−7), ' +
			'always 12 apart on the line.</p>' +
			'<h3>Misconceptions worth killing</h3>' +
			'<ul>' +
			'<li><strong>“A signature is a set of accidentals.”</strong> It is a ' +
			'<em>prefix</em> of a fixed sequence. No real key signature contains ' +
			'C# without F#, or Eb without Bb. If your output ever needs sorting, ' +
			'the model is wrong.</li>' +
			'<li><strong>“The order on the staff is by pitch.”</strong> Engravers ' +
			'write the sharps in entry order F# C# G# D# A# E# B# (zigzagging ' +
			'octaves for readability), not ascending pitch — the order you ' +
			'computed is the order printed.</li>' +
			'<li><strong>“7 sharps is theoretical.”</strong> C# major is rare but ' +
			'real (Bach wrote in it); more practically, its existence is what ' +
			'makes the ±7 shift rule total — every letter+accidental tonic has a ' +
			'well-defined signature, even the ones nobody performs in.</li>' +
			'</ul>' +
			'<h3>At the piano</h3>' +
			'<p>Two lookups pianists actually run mid-read: sharp keys — the last ' +
			'sharp is <em>ti</em>, so the tonic is one letter up (signature ends ' +
			'D#? Key of E). Flat keys — the second-to-last flat <em>names the ' +
			'key</em> (signature Bb&nbsp;Eb&nbsp;Ab? Key of Eb). Both tricks are ' +
			'corollaries of the prefix structure you just implemented, which is ' +
			'why they never fail.</p>',
		],
		complexity: { time: 'O(1) — a letter lookup plus at most seven appends', space: 'O(1) — at most a seven-entry list' },
	});
})();
