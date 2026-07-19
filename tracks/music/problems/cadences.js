/* cadences — Harmony (Medium). How phrases end: classify the last two
 * chords of a phrase, given as Roman numerals with optional figures ("V7",
 * "ii6"), into authentic (V->I), plagal (IV->I), half (anything->V),
 * deceptive (V->vi), or none. The harness pins all four categories, the
 * figure-stripping rule via V7->I and ii6->V, and a mid-phrase pair that is
 * no cadence at all.
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// The four ways a phrase can land, as arrows. Resolutions to I in the
	// accent color; the two that withhold resolution (half, deceptive) in
	// warn. Marker ids namespaced per file (dgArrowMusCa / dgArrowMusCaW)
	// because all tracks' SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 196" width="540" height="196" role="img" aria-label="four cadence types: V to I authentic, IV to I plagal, anything to V half, V to vi deceptive">' +
		'<text x="20" y="24" class="lbl">the four ways a phrase can land</text>' +
		'<text x="52" y="60" text-anchor="middle">V</text>' +
		'<line x1="78" y1="55" x2="140" y2="55" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowMusCa)"/>' +
		'<text x="162" y="60" text-anchor="middle">I</text>' +
		'<text x="200" y="60" style="fill:var(--accent)">authentic</text>' +
		'<text x="300" y="60" class="lbl">the full stop — home, case closed</text>' +
		'<text x="52" y="96" text-anchor="middle">IV</text>' +
		'<line x1="78" y1="91" x2="140" y2="91" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowMusCa)"/>' +
		'<text x="162" y="96" text-anchor="middle">I</text>' +
		'<text x="200" y="96" style="fill:var(--accent)">plagal</text>' +
		'<text x="300" y="96" class="lbl">the “Amen” — softer, no leading tone</text>' +
		'<text x="52" y="132" text-anchor="middle">any</text>' +
		'<line x1="78" y1="127" x2="140" y2="127" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowMusCaW)"/>' +
		'<text x="162" y="132" text-anchor="middle">V</text>' +
		'<text x="200" y="132" style="fill:var(--warn)">half</text>' +
		'<text x="300" y="132" class="lbl">the comma — stops ON the tension</text>' +
		'<text x="52" y="168" text-anchor="middle">V</text>' +
		'<line x1="78" y1="163" x2="140" y2="163" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowMusCaW)"/>' +
		'<text x="162" y="168" text-anchor="middle">vi</text>' +
		'<text x="200" y="168" style="fill:var(--warn)">deceptive</text>' +
		'<text x="300" y="168" class="lbl">the rug-pull — promised I, delivered vi</text>' +
		'<defs>' +
		'<marker id="dgArrowMusCa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowMusCaW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'cadences',
		title: 'Cadences: How Phrases End',
		nav: 'cadences',
		difficulty: 'Medium',
		category: 'Harmony',
		task: 'Implement Cadence(from, to): classify a phrase ending as authentic, plagal, half, deceptive, or none from its last two Roman numerals.',

		prose: [
			'<h2>Cadences: How Phrases End</h2>' +
			'<p>Music has punctuation. A phrase — the musical sentence, usually ' +
			'four or eight bars — ends on a <strong>cadence</strong>: a two-chord ' +
			'formula that tells the ear “full stop,” “comma,” or ' +
			'“wait, what?” Composers from Bach to Nashville use the same ' +
			'four, and each has a sound you already know:</p>' +
			'<ul>' +
			'<li><strong>Authentic (V&nbsp;→&nbsp;I).</strong> The full stop. ' +
			'The dominant’s leading tone and seventh both resolve home. Play the ' +
			'famous opening phrase of Für Elise: the moment it lands and the line ' +
			'finally rests — that arrival is V resolving to i. Nearly every piece ' +
			'you know ends with this move, usually as V7&nbsp;→&nbsp;I.</li>' +
			'<li><strong>Plagal (IV&nbsp;→&nbsp;I).</strong> The “Amen.” ' +
			'Sing the last two chords of any hymn — “A-men” — and you have ' +
			'sung IV&nbsp;→&nbsp;I. Softer than authentic because IV has no leading ' +
			'tone; it settles rather than resolves.</li>' +
			'<li><strong>Half (anything&nbsp;→&nbsp;V).</strong> The comma. The ' +
			'phrase stops <em>on</em> the tension chord and just… hangs there. ' +
			'Question-and-answer phrase pairs do this constantly: the first phrase ' +
			'ends on V (the question mark), the second answers with ' +
			'V&nbsp;→&nbsp;I. Any approach counts — I&nbsp;→&nbsp;V, ' +
			'ii6&nbsp;→&nbsp;V, IV&nbsp;→&nbsp;V — what makes it a half ' +
			'cadence is where it stops, not how it got there.</li>' +
			'<li><strong>Deceptive (V&nbsp;→&nbsp;vi).</strong> The rug-pull. ' +
			'Everything about V promises I; the bass steps up one degree too far and ' +
			'lands on vi instead — same two shared tones as I, wrong root. ' +
			'Composers use it to <em>extend an ending</em>: fake the final cadence ' +
			'with V&nbsp;→&nbsp;vi, spin out a few more bars, then deliver the real ' +
			'V&nbsp;→&nbsp;I. Listen for it near the end of almost any classical ' +
			'slow movement — the ending that almost happens.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Cadence(from, to)</code> over Roman-numeral strings. ' +
			'Real charts decorate numerals with <strong>figures</strong> — ' +
			'<code>V7</code> (add the seventh), <code>ii6</code> (first inversion) ' +
			'— that change the chord’s color, not its cadence category. Strip ' +
			'the digits to the core numeral first, then classify:</p>',
			{ lang: 'txt', code: 'core(from) -> core(to)      category\nV   -> I     "authentic"     (so V7 -> I too)\nIV  -> I     "plagal"\nany -> V     "half"          (so ii6 -> V too)\nV   -> vi    "deceptive"\notherwise    "none"' },
			'<div class="tip">Order your checks so each pair has exactly one home. ' +
			'The rules never actually collide — a cadence ending on I cannot also ' +
			'end on V — but putting the <code>to == &quot;V&quot;</code> ' +
			'catch-all last makes that obvious in code. And note ' +
			'<code>&quot;none&quot;</code> is a real answer: most chord changes are ' +
			'mid-sentence motion, not punctuation.</div>',
		],

		starter: [
			'package main',
			'',
			'// Cadence classifies how a phrase ends from its last two chords,',
			'// given as Roman numerals in a major key ("I", "IV", "V", "vi", ...),',
			'// possibly carrying figures like "V7" or "ii6". Strip any digits',
			'// after the numeral letters to get the core numeral, then classify:',
			'//',
			'//   V  -> I    "authentic"   (V7 -> I is still authentic)',
			'//   IV -> I    "plagal"',
			'//   any -> V   "half"        (whatever precedes the V)',
			'//   V  -> vi   "deceptive"',
			'//   otherwise  "none"',
			'//',
			'// Numerals are case-sensitive: "V" and "vi" are exactly as shown.',
			'func Cadence(from, to string) string {',
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
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"V -> I: the full stop that ends nearly every piece",',
			'			"authentic",',
			'			func() string { return Cadence("V", "I") }},',
			'		{"V7 -> I: the figure 7 colors the chord but not the cadence",',
			'			"authentic",',
			'			func() string { return Cadence("V7", "I") }},',
			'		{"IV -> I: the Amen at the end of a hymn",',
			'			"plagal",',
			'			func() string { return Cadence("IV", "I") }},',
			'		{"I -> V: the phrase stops ON the tension chord — a comma, not a period",',
			'			"half",',
			'			func() string { return Cadence("I", "V") }},',
			'		{"ii6 -> V: the textbook approach to a half cadence, figure stripped",',
			'			"half",',
			'			func() string { return Cadence("ii6", "V") }},',
			'		{"V -> vi: the rug-pull that fakes an ending to extend the piece",',
			'			"deceptive",',
			'			func() string { return Cadence("V", "vi") }},',
			'		{"I -> IV: mid-phrase motion, not punctuation",',
			'			"none",',
			'			func() string { return Cadence("I", "IV") }},',
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
			'// core strips figures from a Roman numeral: "V7" -> "V", "ii6" -> "ii",',
			'// "V65" -> "V". Figures mark sevenths and inversions — the chord\'s',
			'// voicing and color — but cadence classification only cares about the',
			'// harmony\'s root function, so we keep the leading run of numeral',
			'// letters and drop the rest. Case is preserved: it carries quality.',
			'func core(rn string) string {',
			'	i := 0',
			'	for i < len(rn) {',
			'		c := rn[i]',
			'		if c != \'I\' && c != \'V\' && c != \'i\' && c != \'v\' {',
			'			break',
			'		}',
			'		i++',
			'	}',
			'	return rn[:i]',
			'}',
			'',
			'// Cadence classifies the last two chords of a phrase. The switch is',
			'// ordered from most specific to least: the two resolutions to I first,',
			'// then the "ends on V" catch-all (a half cadence is defined by its',
			'// destination alone), then the one named exception V -> vi. The',
			'// branches are mutually exclusive anyway — a pair cannot end on both',
			'// I and V — but this order makes the taxonomy read like the theory.',
			'func Cadence(from, to string) string {',
			'	f, t := core(from), core(to)',
			'	switch {',
			'	case t == "I" && f == "V":',
			'		return "authentic"',
			'	case t == "I" && f == "IV":',
			'		return "plagal"',
			'	case t == "V":',
			'		return "half"',
			'	case t == "vi" && f == "V":',
			'		return "deceptive"',
			'	}',
			'	// Most chord changes are mid-sentence motion, not punctuation.',
			'	return "none"',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why these four, and why V is the hinge</h3>' +
			'<p>Three of the four categories have V in them, and that is no ' +
			'accident. V contains the key’s two most unstable notes: the leading ' +
			'tone (a half step below the tonic — the B–C squeeze in C major) ' +
			'and, once you add the seventh, the fourth degree a tritone away from it. ' +
			'Both scream to resolve into members of I. A cadence is really a ' +
			'statement about that tension: authentic releases it, half sustains it, ' +
			'deceptive redirects it. Plagal is the odd one out — no leading tone ' +
			'at all — which is exactly why it sounds like a benediction rather ' +
			'than an arrival.</p>' +
			'<h3>The classic misconceptions</h3>' +
			'<p>First: thinking the half cadence is a specific pair like ' +
			'I&nbsp;→&nbsp;V. It is defined by the <em>destination only</em> — ' +
			'stopping on V is the whole definition, which is why your code checks ' +
			'<code>to</code> alone for it. Second: treating figures as part of the ' +
			'identity. <code>V7&nbsp;→&nbsp;I</code> and ' +
			'<code>V&nbsp;→&nbsp;I</code> are the same cadence with different ' +
			'voltage; classifiers that string-match whole symbols break on the ' +
			'first real chart they see. Third: assuming every two-chord motion is a ' +
			'cadence. Cadences happen at phrase <em>ends</em>; ' +
			'<code>I&nbsp;→&nbsp;IV</code> in bar two is just the sentence ' +
			'continuing — hence <code>&quot;none&quot;</code>.</p>' +
			'<h3>At the piano</h3>' +
			'<p>Play, in C: G7&nbsp;→&nbsp;C (authentic), F&nbsp;→&nbsp;C ' +
			'(plagal), C&nbsp;→&nbsp;G (half — feel how your hands want one ' +
			'more chord), G7&nbsp;→&nbsp;Am (deceptive — the bass walks up ' +
			'G–A instead of dropping to C). Then listen for the deceptive ' +
			'cadence in the wild: when a piece seems to end and then keeps going for ' +
			'another delicious minute, you almost certainly just heard ' +
			'V&nbsp;→&nbsp;vi. Naming it in real time is the fastest ear-training ' +
			'win in all of harmony.</p>',
		],
		complexity: { time: 'O(n) in the numeral length — one strip pass, then O(1) classification', space: 'O(1)' },
	});
})();
