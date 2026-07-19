/* rhythm-durations — At the Piano (Easy). Note values and time signatures as
 * exact fractions: Beats converts a (possibly dotted) note value into beats
 * under a num/den time signature, FillsMeasure checks a run of values sums to
 * exactly one measure using integer 64th-note arithmetic. The harness pins
 * quarter in 4/4 = 1.00, eighth in 2/2 = 0.25, the dotted half filling 3/4,
 * six eighths filling 6/8, half. + quarter filling 4/4, and an over-full
 * false case.
 */
(function () {
	'use strict';
	var T = GoLearnMusic;

	// The halving tree: each value is exactly two of the next, and the time
	// signature's denominator picks which row counts as "one beat".
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="note value tree: one whole note equals two halves, four quarters, eight eighths; the time signature denominator selects which row is the beat">' +
		'<text x="20" y="22" class="lbl">every row lasts the same time — a whole note, halved and halved again</text>' +
		'<rect x="40" y="34" width="480" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="280" y="52" text-anchor="middle">whole</text>' +
		'<rect x="40" y="70" width="238" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<rect x="282" y="70" width="238" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<text x="159" y="88" text-anchor="middle">half</text><text x="401" y="88" text-anchor="middle">half</text>' +
		'<rect x="40" y="106" width="117" height="26" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="161" y="106" width="117" height="26" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="282" y="106" width="117" height="26" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="403" y="106" width="117" height="26" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="98" y="124" text-anchor="middle">quarter</text><text x="219" y="124" text-anchor="middle">quarter</text>' +
		'<text x="340" y="124" text-anchor="middle">quarter</text><text x="461" y="124" text-anchor="middle">quarter</text>' +
		'<g class="lbl" text-anchor="middle">' +
		'<rect x="40" y="142" width="56" height="22" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.2"/>' +
		'<rect x="100" y="142" width="56" height="22" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.2"/>' +
		'<rect x="161" y="142" width="56" height="22" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.2"/>' +
		'<rect x="221" y="142" width="57" height="22" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.2"/>' +
		'<rect x="282" y="142" width="56" height="22" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.2"/>' +
		'<rect x="342" y="142" width="57" height="22" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.2"/>' +
		'<rect x="403" y="142" width="56" height="22" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.2"/>' +
		'<rect x="463" y="142" width="57" height="22" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.2"/>' +
		'<text x="68" y="157">8th</text><text x="128" y="157">8th</text><text x="189" y="157">8th</text><text x="249" y="157">8th</text>' +
		'<text x="310" y="157">8th</text><text x="370" y="157">8th</text><text x="431" y="157">8th</text><text x="491" y="157">8th</text>' +
		'</g>' +
		'<text x="20" y="188" class="lbl">X/4 says: the quarter row is the beat (quarter = 1.00).  X/8 says: the 8th row is (eighth = 1.00).</text>' +
		'<text x="20" y="204" class="lbl">a dot stretches any value by half of itself: half. = half + quarter = 3 beats in X/4</text>' +
		'</svg>';

	T.problem({
		id: 'rhythm-durations',
		title: 'Note Values & Time Signatures',
		nav: 'rhythm durations',
		difficulty: 'Easy',
		category: 'At the Piano',
		task: 'Implement Beats (how many beats a possibly-dotted note value occupies under a num/den time signature) and FillsMeasure (does a run of values sum to exactly one measure).',

		prose: [
			'<h2>Note Values &amp; Time Signatures</h2>' +
			'<p>Open any piece of sheet music and the first thing after the clef ' +
			'is a stacked pair of numbers — <code>4/4</code>, <code>3/4</code>, ' +
			'<code>6/8</code>. Read it exactly like the fraction it looks like: ' +
			'the <strong>denominator names the beat unit</strong> (4 = the ' +
			'quarter note is one beat, 8 = the eighth note is, 2 = the half ' +
			'note is) and the <strong>numerator counts how many fit in a ' +
			'measure</strong>. Every note value is itself a fraction of a whole ' +
			'note — half = 1/2, quarter = 1/4, eighth = 1/8, sixteenth = 1/16 — ' +
			'each exactly two of the next, a pure halving tree.</p>' +
			'<p>Those two facts compose into one formula. A value\'s beat count ' +
			'under <code>num/den</code> is:</p>' +
			'<ul>' +
			'<li><code>beats = den &times; (value\'s whole-note fraction) &times; ' +
			'dot</code> — a quarter in any <code>X/4</code> is ' +
			'4&nbsp;&times;&nbsp;1/4&nbsp;=&nbsp;1 beat; an eighth in ' +
			'<code>6/8</code> is 8&nbsp;&times;&nbsp;1/8&nbsp;=&nbsp;1 beat; ' +
			'that same eighth in <code>2/2</code> is only ' +
			'2&nbsp;&times;&nbsp;1/8&nbsp;=&nbsp;0.25 — the note didn\'t change, ' +
			'the yardstick did.</li>' +
			'<li><strong>The dot</strong> stretches a value by half of itself ' +
			'(&times;1.5): a dotted half (<code>"half."</code>) is a half plus a ' +
			'quarter — 3 beats in <code>3/4</code>, a full measure.</li>' +
			'<li><strong>A measure must balance exactly.</strong> Notes in a ' +
			'measure sum to precisely <code>num</code> beats — engravers reject ' +
			'anything else. Exactness matters for the arithmetic too: sum in ' +
			'integer 64th-notes (whole = 64, half = 32, &hellip; sixteenth = 4, ' +
			'dot = &times;3/2 — always still an integer) rather than floats, so ' +
			'0.25&nbsp;+&nbsp;0.25&nbsp;+&hellip; can never drift past an ' +
			'equality test.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Beats(value, num, den)</code> for the values ' +
			'<code>whole half quarter eighth sixteenth</code> and their dotted ' +
			'forms (<code>"half."</code>, <code>"quarter."</code>&hellip; — a ' +
			'trailing dot), and <code>FillsMeasure(values, num, den)</code> ' +
			'reporting whether the run sums to exactly one measure.</p>',
			{ lang: 'txt', code: 'in 64ths:  whole=64  half=32  quarter=16  eighth=8  sixteenth=4   dotted: x3/2\nmeasure of num/den = num x (64/den) 64ths\n\n6/8:  eighth+eighth+eighth+eighth+eighth+eighth = 6x8 = 48 = 6 x (64/8)  -> fills\n4/4:  half. + quarter = 48+16 = 64 = 4 x (64/4)                         -> fills' },
			'<div class="tip">6/8 and 3/4 both contain 48 sixty-fourths per ' +
			'measure — <em>the same total time</em> — yet they are different ' +
			'meters: 3/4 groups it as three quarter-note beats (ONE-two-three), ' +
			'6/8 as two beats of three eighths each (ONE-and-a-TWO-and-a, ' +
			'compound meter). <code>Beats()</code> here is the arithmetic layer ' +
			'— honest but deaf: it will tell you an eighth in 6/8 is 1 beat, ' +
			'while a musician feels the dotted quarter as the beat. Grouping ' +
			'and feel live above the fractions.</div>',
		],

		starter: [
			'package main',
			'',
			'// Beats returns how many beats a note value occupies in a num/den',
			'// time signature.',
			'//',
			'//   value: "whole", "half", "quarter", "eighth", "sixteenth", or a',
			'//          dotted form with a trailing dot ("half.", "quarter.", ...).',
			'//          The dot multiplies the duration by 1.5.',
			'//   num/den: the time signature; den names the beat unit (the 1/den',
			'//          note = one beat), num is beats per measure (unused here).',
			'//',
			'// beats = den * (value\'s fraction of a whole note) * dot multiplier',
			'// e.g. Beats("quarter", 4, 4) = 1, Beats("eighth", 6, 8) = 1,',
			'// Beats("eighth", 2, 2) = 0.25.',
			'func Beats(value string, num, den int) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// FillsMeasure reports whether the values sum to EXACTLY one measure',
			'// of num/den — no less, no more. Sum in integer 64th-notes (whole=64,',
			'// half=32, quarter=16, eighth=8, sixteenth=4; dot = x3/2) and compare',
			'// against num*64/den, so repeated fractions can never float-drift.',
			'func FillsMeasure(values []string, num, den int) bool {',
			'	// your code here',
			'	return false',
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
			'	b := func(v string, num, den int) string { return fmt.Sprintf("%.2f", Beats(v, num, den)) }',
			'	f := func(vs []string, num, den int) string { return fmt.Sprintf("%v", FillsMeasure(vs, num, den)) }',
			'	cases := []tc{',
			'		{"quarter in 4/4: the denominator names the quarter as the beat — exactly 1",',
			'			"1.00",',
			'			func() string { return b("quarter", 4, 4) }},',
			'		{"eighth in 2/2 (cut time): same note, half-note yardstick — a quarter of a beat",',
			'			"0.25",',
			'			func() string { return b("eighth", 2, 2) }},',
			'		{"dotted half in 3/4: the dot adds half again — 2 becomes 3 beats",',
			'			"3.00",',
			'			func() string { return b("half.", 3, 4) }},',
			'		{"dotted quarter in 6/8: three eighth-note beats — the note a musician feels as ONE beat",',
			'			"3.00",',
			'			func() string { return b("quarter.", 6, 8) }},',
			'		{"one dotted half fills a 3/4 measure by itself",',
			'			"true",',
			'			func() string { return f([]string{"half."}, 3, 4) }},',
			'		{"six eighths fill 6/8 — the numerator counts eighths there, not quarters",',
			'			"true",',
			'			func() string { return f([]string{"eighth", "eighth", "eighth", "eighth", "eighth", "eighth"}, 6, 8) }},',
			'		{"half. + quarter fills 4/4: 3 + 1 — mixed values, exact total",',
			'			"true",',
			'			func() string { return f([]string{"half.", "quarter"}, 4, 4) }},',
			'		{"over-full: four quarters plus an eighth overflow 4/4 — exact means not more, either",',
			'			"false",',
			'			func() string { return f([]string{"quarter", "quarter", "quarter", "quarter", "eighth"}, 4, 4) }},',
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
			'// sixty4 returns a note value\'s length in 64th-notes — the track\'s',
			'// rational arithmetic trick. 64 is the least common denominator of',
			'// every value here, and the dot\'s x3/2 stays integral on all of them',
			'// (sixteenth. = 4*3/2 = 6), so durations sum EXACTLY in ints where',
			'// floats like 0.1+0.2 would drift. Same idea as doing money in cents.',
			'func sixty4(value string) int {',
			'	dotted := strings.HasSuffix(value, ".")',
			'	base := strings.TrimSuffix(value, ".")',
			'	n := 0',
			'	switch base {',
			'	case "whole":',
			'		n = 64',
			'	case "half":',
			'		n = 32',
			'	case "quarter":',
			'		n = 16',
			'	case "eighth":',
			'		n = 8',
			'	case "sixteenth":',
			'		n = 4',
			'	}',
			'	if dotted {',
			'		// The dot adds half the value again: n * 3/2, integer-exact',
			'		// for every base above.',
			'		n = n * 3 / 2',
			'	}',
			'	return n',
			'}',
			'',
			'// Beats converts to the time signature\'s yardstick: one beat is the',
			'// 1/den note, i.e. 64/den sixty-fourths, so beats = value / beat.',
			'// Only den participates — the numerator says how many beats a measure',
			'// HOLDS, not how long any note lasts. The float conversion happens',
			'// once, at the boundary, after all arithmetic was integral.',
			'func Beats(value string, num, den int) float64 {',
			'	return float64(sixty4(value)) / float64(64/den)',
			'}',
			'',
			'// FillsMeasure compares integer totals: the values\' 64ths against the',
			'// measure\'s num * (64/den). Exact equality — a measure is a container',
			'// with no slack, and under-full is as wrong as over-full. This is',
			'// precisely the check engraving software runs before it will let a',
			'// barline stand.',
			'func FillsMeasure(values []string, num, den int) bool {',
			'	total := 0',
			'	for _, v := range values {',
			'		total += sixty4(v)',
			'	}',
			'	return total == num*(64/den)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The time signature really is a fraction</h3>' +
			'<p>Musicians learn "4/4" as a symbol, but the arithmetic reading is ' +
			'the honest one: a measure of <code>num/den</code> lasts ' +
			'<code>num&nbsp;&times;&nbsp;1/den</code> of a whole note. That is ' +
			'why 3/4 and 6/8 contain identical total time ' +
			'(3/4&nbsp;=&nbsp;6/8&nbsp;=&nbsp;48/64) — and why they are ' +
			'nonetheless different time signatures: meter adds a grouping on top ' +
			'of the fraction. 3/4 is <em>simple</em> meter (three beats, each ' +
			'dividing in two), 6/8 is <em>compound</em> (two felt beats, each a ' +
			'dotted quarter dividing in three). <code>Beats()</code> computes ' +
			'the denominator\'s answer — an eighth in 6/8 is 1 beat — while a ' +
			'drummer counting a jig feels 1.5-beat groups. Both are right; they ' +
			'live at different layers, and notation software keeps both (the ' +
			'arithmetic for barline checking, the grouping for beaming).</p>' +
			'<h3>Why 64ths instead of floats</h3>' +
			'<p>Every duration here is a dyadic rational times an optional 3/2, ' +
			'so the least common denominator of one measure\'s worth of values is ' +
			'a small integer — 64 covers everything down to a dotted sixteenth. ' +
			'Integer totals make "exactly full" a real equality; float totals ' +
			'make it <code>abs(sum&nbsp;&minus;&nbsp;num)&nbsp;&lt;&nbsp;&epsilon;</code> ' +
			'with a magic epsilon, the classic accumulating-drift bug. MIDI ' +
			'files make the same choice: durations are integer <em>ticks</em> at ' +
			'some pulses-per-quarter resolution, never fractional beats. The ' +
			'harness compares <code>Beats</code> through ' +
			'<code>Sprintf("%.2f")</code> for the same reason — the printed ' +
			'string is the contract, not the raw float.</p>' +
			'<h3>At the piano</h3>' +
			'<p>Counting aloud is running <code>FillsMeasure</code> in real ' +
			'time: "1 2 3 4" in 4/4, "1 2 3" for a waltz, "1-2-3-4-5-6" (or the ' +
			'felt "1-and-a-2-and-a") in 6/8. When a passage keeps falling apart, ' +
			'the standard diagnosis is a measure that doesn\'t balance in your ' +
			'reading of it — a dot missed (2 beats held instead of 3) or an ' +
			'eighth rest skipped. Write the beat numbers over one bad measure, ' +
			'sum the fractions, and the arithmetic finds the missing 64ths ' +
			'faster than replaying ever does.</p>',
		],
		complexity: { time: 'O(n) — one table lookup per value', space: 'O(1)' },
	});
})();
