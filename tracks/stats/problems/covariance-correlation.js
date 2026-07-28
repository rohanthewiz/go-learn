/* Covariance & Correlation — Describing Data (Medium). Sample covariance,
 * Pearson's r, and a plain-English strength label. The harness pins the two
 * exact extremes (a perfect line gives r = ±1), a real-shaped latency-vs-
 * payload dataset, and the classic trap: a symmetric parabola — perfectly
 * related data — scoring r = 0, because r only measures LINEAR association.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// Three mini-scatters: what r rewards (lines) and what it is blind to
	// (curves). Marker id namespaced (dgArrowSTCC) because every track's
	// SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="three scatter plots: a rising line with r near plus one, a symmetric parabola with r near zero, and a falling line with r near minus one">' +
		'<text x="20" y="20" class="lbl">three shapes, one statistic — r only measures LINEAR association</text>' +
		// panel 1: perfect positive line
		'<rect x="30" y="32" width="140" height="100" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.2" opacity="0.5"/>' +
		'<circle cx="44" cy="120" r="3.5" fill="var(--accent)"/>' +
		'<circle cx="70" cy="99" r="3.5" fill="var(--accent)"/>' +
		'<circle cx="98" cy="76" r="3.5" fill="var(--accent)"/>' +
		'<circle cx="126" cy="55" r="3.5" fill="var(--accent)"/>' +
		'<circle cx="152" cy="38" r="3.5" fill="var(--accent)"/>' +
		'<text x="100" y="150" text-anchor="middle" class="lbl">r ≈ +1</text>' +
		// panel 2: the parabola r cannot see
		'<rect x="190" y="32" width="140" height="100" rx="4" fill="none" stroke="var(--warn)" stroke-width="1.2" opacity="0.7"/>' +
		'<circle cx="204" cy="46" r="3.5" fill="var(--warn)"/>' +
		'<circle cx="228" cy="86" r="3.5" fill="var(--warn)"/>' +
		'<circle cx="260" cy="110" r="3.5" fill="var(--warn)"/>' +
		'<circle cx="292" cy="86" r="3.5" fill="var(--warn)"/>' +
		'<circle cx="316" cy="46" r="3.5" fill="var(--warn)"/>' +
		'<text x="260" y="150" text-anchor="middle" class="lbl">r ≈ 0 — yet perfectly related</text>' +
		// panel 3: perfect negative line
		'<rect x="350" y="32" width="140" height="100" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.2" opacity="0.5"/>' +
		'<circle cx="364" cy="38" r="3.5" fill="var(--accent)"/>' +
		'<circle cx="390" cy="56" r="3.5" fill="var(--accent)"/>' +
		'<circle cx="416" cy="77" r="3.5" fill="var(--accent)"/>' +
		'<circle cx="442" cy="99" r="3.5" fill="var(--accent)"/>' +
		'<circle cx="468" cy="120" r="3.5" fill="var(--accent)"/>' +
		'<text x="420" y="150" text-anchor="middle" class="lbl">r ≈ −1</text>' +
		// the trap, called out
		'<path d="M 160 178 C 205 178 240 162 252 140" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSTCC)"/>' +
		'<text x="20" y="182" class="lbl" style="fill:var(--warn)">r is blind to curves</text>' +
		'<defs><marker id="dgArrowSTCC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'covariance-correlation',
		title: 'Covariance & Correlation',
		nav: 'covariance & correlation',
		difficulty: 'Medium',
		category: 'Describing Data',
		task: 'Implement CovS (sample covariance), Pearson (r = cov / sdX·sdY), and Strength (map |r| to none/weak/moderate/strong).',

		prose: [
			'<h2>Covariance &amp; Correlation</h2>' +
			'<p>p99 latency is creeping up and someone in the incident channel is ' +
			'sure it’s the payloads: “the big responses are the slow ones.” You pull ' +
			'the numbers — response size in KB, latency in ms — and now you need one ' +
			'number that says how strongly the two move together, because eyeballing ' +
			'a scatter plot is how confirmation bias wins arguments. That number is ' +
			'Pearson’s <em>r</em>, and it’s built in two steps:</p>' +
			'<ul>' +
			'<li><strong>Covariance</strong> is the average cross-product of ' +
			'deviations: center each series on its mean, multiply pairwise, average. ' +
			'When x and y sit on the <em>same</em> side of their means together the ' +
			'products are positive; opposite sides, negative. The <em>sign</em> is ' +
			'meaningful — the <em>magnitude</em> is not, because its units are ' +
			'X·Y (ms·KB here, cm·kg in a height/weight study): a number nobody can ' +
			'read, and one that changes if you switch KB to bytes.</li>' +
			'<li><strong>Divide by n−1, not n</strong> (Bessel’s correction): the ' +
			'means were estimated from this same sample, which costs a degree of ' +
			'freedom — dividing by n would bias the estimate low.</li>' +
			'<li><strong>Correlation fixes the units problem</strong>: divide the ' +
			'covariance by both sample standard deviations and every unit cancels. ' +
			'The result r is dimensionless, always in [−1, 1], and hits ±1 exactly ' +
			'when the points sit on a perfect straight line. Rescale KB to bytes ' +
			'and r doesn’t budge.</li>' +
			'<li><strong>r only sees straight lines.</strong> A symmetric parabola ' +
			'— y perfectly determined by x — has r = 0, because the positive and ' +
			'negative cross-products cancel exactly. r ≈ 0 means “no <em>linear</em> ' +
			'trend”, never “no relationship”. Plot first, always.</li>' +
			'<li><strong>And correlation is not causation.</strong> Ice cream sales ' +
			'correlate with drownings — summer causes both. r measures ' +
			'co-movement; it cannot see confounders or direction.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>CovS(xs, ys)</code> — sample covariance, ' +
			'Σ(x−x̄)(y−ȳ)/(n−1) — then <code>Pearson(xs, ys)</code> = ' +
			'CovS / (sdX·sdY) using <em>sample</em> standard deviations, and ' +
			'<code>Strength(r)</code>, mapping |r| to <code>"none"</code> ' +
			'(&lt; 0.1), <code>"weak"</code> (&lt; 0.4), <code>"moderate"</code> ' +
			'(&lt; 0.7), <code>"strong"</code> (≥ 0.7).</p>',
			{ lang: 'txt', code: 'payload KB: 1   2   4   8   16  32\nlatency ms: 12  15  14  20  24  40\n\ncov  = 121.9  ms·KB  — positive, but is that big? unreadable units\nr    = 0.9918        — unitless: an almost perfectly linear climb' },
			'<div class="tip">Check the extremes to test your understanding: on ' +
			'y&nbsp;=&nbsp;2x the covariance equals sdX·sdY exactly, so r = 1 — the ' +
			'normalization is <em>why</em> r is bounded (it’s the Cauchy–Schwarz ' +
			'inequality wearing a statistics hat).</div>',
		],

		starter: [
			'package main',
			'',
			'// CovS returns the SAMPLE covariance of xs and ys:',
			'//',
			'//   cov = Σ (xs[i] − meanX)(ys[i] − meanY) / (n − 1)',
			'//',
			'// The n−1 divisor is Bessel\'s correction — both means were estimated',
			'// from this same sample. Assumes len(xs) == len(ys) and n >= 2.',
			'func CovS(xs, ys []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Pearson returns the sample correlation coefficient',
			'//',
			'//   r = CovS(xs, ys) / (sdX · sdY)',
			'//',
			'// where sdX and sdY are SAMPLE standard deviations (variance divided',
			'// by n−1, then square-rooted). r is unitless and always in [−1, 1];',
			'// it reaches ±1 exactly when the points lie on a straight line.',
			'// Assumes both series have nonzero spread.',
			'func Pearson(xs, ys []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Strength maps the magnitude |r| to a conventional label:',
			'//',
			'//   |r| < 0.1  ->  "none"',
			'//   |r| < 0.4  ->  "weak"',
			'//   |r| < 0.7  ->  "moderate"',
			'//   |r| >= 0.7 ->  "strong"',
			'//',
			'// The sign of r (direction) is deliberately ignored: strength and',
			'// direction are separate questions.',
			'func Strength(r float64) string {',
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
			'	// The incident-channel dataset: response payload (KB) against',
			'	// observed latency (ms). Real-shaped: a strong but not perfect climb.',
			'	payload := []float64{1, 2, 4, 8, 16, 32}',
			'	latency := []float64{12, 15, 14, 20, 24, 40}',
			'',
			'	xsLine := []float64{1, 2, 3, 4, 5}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	cases := []tc{',
			'		{"perfect positive line y = 2x: r must hit its ceiling, exactly +1",',
			'			"1.0000",',
			'			func() string { return f4(Pearson(xsLine, []float64{2, 4, 6, 8, 10})) }},',
			'		{"perfect negative line y = 12 − 2x: same strength, opposite sign",',
			'			"-1.0000",',
			'			func() string { return f4(Pearson(xsLine, []float64{10, 8, 6, 4, 2})) }},',
			'		{"latency vs payload: bigger really is slower here — a near-perfect linear climb",',
			'			"0.9918",',
			'			func() string { return f4(Pearson(payload, latency)) }},',
			'		{"symmetric parabola y = x²: y perfectly determined by x, yet r = 0 — r only sees LINES",',
			'			"0.0000",',
			'			func() string { return f4(Pearson([]float64{-2, -1, 0, 1, 2}, []float64{4, 1, 0, 1, 4})) }},',
			'		{"covariance sign: rising together ⇒ positive (magnitude in unreadable X·Y units)",',
			'			"2.0000",',
			'			func() string { return f4(CovS([]float64{1, 2, 3}, []float64{2, 4, 6})) }},',
			'		{"covariance sign: one rises while the other falls ⇒ negative",',
			'			"-2.0000",',
			'			func() string { return f4(CovS([]float64{1, 2, 3}, []float64{6, 4, 2})) }},',
			'		{"raw covariance of the latency data: 121.9 ms·KB — meaningless magnitude, why r exists",',
			'			"121.9000",',
			'			func() string { return f4(CovS(payload, latency)) }},',
			'		{"Strength(0.05): below 0.1 there is effectively no linear association",',
			'			"none",',
			'			func() string { return Strength(0.05) }},',
			'		{"Strength(−0.35): the label uses |r| — direction does not change strength",',
			'			"weak",',
			'			func() string { return Strength(-0.35) }},',
			'		{"Strength(0.55): moderate band, 0.4 ≤ |r| < 0.7",',
			'			"moderate",',
			'			func() string { return Strength(0.55) }},',
			'		{"Strength(0.7) boundary: 0.7 itself lands in strong (the ≥ edge)",',
			'			"strong",',
			'			func() string { return Strength(0.7) }},',
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
			'import "math"',
			'',
			'// meanOf returns the arithmetic mean. Factored out because covariance,',
			'// standard deviation, and correlation all begin the same way: center',
			'// the data on its mean. One definition, no drift between callers.',
			'func meanOf(vs []float64) float64 {',
			'	sum := 0.0',
			'	for _, v := range vs {',
			'		sum += v',
			'	}',
			'	return sum / float64(len(vs))',
			'}',
			'',
			'// CovS is the sample covariance: the averaged cross-product of',
			'// deviations from each mean.',
			'func CovS(xs, ys []float64) float64 {',
			'	meanX := meanOf(xs)',
			'	meanY := meanOf(ys)',
			'	// Each term is positive when the pair sits on the SAME side of both',
			'	// means (both above or both below) and negative on opposite sides —',
			'	// the sum literally tallies co-movement, signed.',
			'	sum := 0.0',
			'	for i := range xs {',
			'		sum += (xs[i] - meanX) * (ys[i] - meanY)',
			'	}',
			'	// n−1, not n: the two means were estimated from this very sample,',
			'	// which consumes a degree of freedom. Dividing by n systematically',
			'	// underestimates the population covariance (Bessel\'s correction).',
			'	return sum / float64(len(xs)-1)',
			'}',
			'',
			'// sdSample is the sample standard deviation — squared deviations over',
			'// n−1, then the square root. Kept unexported: the surface of this',
			'// problem is covariance and correlation, and sd is an implementation',
			'// detail of the normalization.',
			'func sdSample(vs []float64) float64 {',
			'	m := meanOf(vs)',
			'	sum := 0.0',
			'	for _, v := range vs {',
			'		d := v - m',
			'		sum += d * d',
			'	}',
			'	return math.Sqrt(sum / float64(len(vs)-1))',
			'}',
			'',
			'// Pearson normalizes the covariance by both spreads. The units cancel',
			'// top and bottom (ms·KB over ms times KB), leaving a pure number in',
			'// [−1, 1] — Cauchy–Schwarz guarantees the bound, with equality exactly',
			'// when one series is a linear function of the other. Note the n−1',
			'// appears in numerator and denominator alike, so the divisor',
			'// convention cancels: r comes out identical under /n or /(n−1), as',
			'// long as the choice is consistent on both sides.',
			'func Pearson(xs, ys []float64) float64 {',
			'	return CovS(xs, ys) / (sdSample(xs) * sdSample(ys))',
			'}',
			'',
			'// Strength buckets |r| into the conventional labels. Absolute value',
			'// first: direction (the sign) and strength (the magnitude) are',
			'// independent questions, and the label answers only the second.',
			'func Strength(r float64) string {',
			'	a := math.Abs(r)',
			'	// Ordered guards make the half-open bands explicit; each case',
			'	// implies "and >= the previous threshold". 0.7 itself falls through',
			'	// every guard and lands in strong — the >= edge the spec requires.',
			'	switch {',
			'	case a < 0.1:',
			'		return "none"',
			'	case a < 0.4:',
			'		return "weak"',
			'	case a < 0.7:',
			'		return "moderate"',
			'	}',
			'	return "strong"',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Where r comes from</h3>' +
			'<p>Francis Galton noticed in the 1880s that tall parents have tall — ' +
			'but less extreme — children, and called it “regression towards ' +
			'mediocrity”. Karl Pearson turned Galton’s idea into the formula you ' +
			'just implemented (1896), and it is still the single most-computed ' +
			'statistic in science. The normalization is the genius move: covariance ' +
			'answers “do they move together?” but its magnitude is hostage to ' +
			'units, so Pearson divided by both standard deviations to get a pure ' +
			'number. The bound |r| ≤ 1 isn’t a convention — it’s the Cauchy–Schwarz ' +
			'inequality, with equality exactly at perfect linearity.</p>' +
			'<h3>Anscombe’s warning</h3>' +
			'<p>In 1973 Frank Anscombe constructed four datasets with identical ' +
			'means, variances, and r = 0.816 — one a clean line, one a curve, one a ' +
			'line with a single outlier, one a vertical stack with one stray point. ' +
			'That is the lesson your parabola case teaches in miniature: r ' +
			'compresses a whole scatter into one number, and radically different ' +
			'shapes can compress to the same value. A single outlier can also ' +
			'manufacture a strong r out of noise (or destroy a real one), because ' +
			'the deviations are <em>multiplied</em> — an outlier is extreme in both ' +
			'factors at once. Rank-based alternatives (Spearman’s ρ, which is just ' +
			'Pearson computed on the ranks) trade some sensitivity for robustness ' +
			'and also catch monotone-but-curved relationships.</p>' +
			'<h3>Reading r in the wild</h3>' +
			'<p>Squaring r gives the fraction of variance in y that a linear fit on ' +
			'x explains: the latency data’s r = 0.9918 means r² ≈ 98% of latency ' +
			'variance tracks payload size — a genuinely strong engineering signal. ' +
			'But strength is not causation: latency and payload might both be ' +
			'driven by a third variable (one endpoint that is both chatty and ' +
			'slow). The classic teaching example — ice cream sales correlate with ' +
			'drowning deaths — has a confounder, summer, driving both. The fix is ' +
			'never more correlation; it is an experiment, a natural experiment, or ' +
			'an explicit causal model. r tells you where to look, not what to ' +
			'blame.</p>',
		],
		complexity: { time: 'O(n) — a constant number of passes over the data', space: 'O(1)' },
	});
})();
