/* Power & Effect Size — Hypothesis Testing (Hard). The planning side of
 * inference: Cohen's d (a scale-free effect size via the pooled SD), the
 * power of a two-sample z-test as Phi(d*sqrt(n/2) - zAlpha), and the
 * sample size needed to hit a target power. The harness pins d on fixed
 * samples, the textbook power(d=0.5, n=64) ~ 0.81, power rising with n,
 * the classic n=63 per group for 80% power at d=0.5, and the huge n a
 * tiny effect demands.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// H0 and H1 sampling distributions of the test statistic with the
	// critical line between them: the area of H1 left of the line is beta
	// (a miss), the area right of it is power. Marker id namespaced
	// (dgArrowSTPW) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="two overlapping bell curves for the null and alternative hypotheses; a vertical critical line splits the alternative bell into beta on its left and power on its right">' +
		'<text x="20" y="22" class="lbl">where your test statistic lands if H0 is true — vs if the effect is REAL</text>' +
		// H0 bell (centered ~170)
		'<path d="M 40 150 C 100 150 115 56 170 56 C 225 56 240 150 300 150" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="130" y="76" text-anchor="middle" class="lbl">H0: no effect</text>' +
		// H1 bell (centered ~330, shifted right by d*sqrt(n/2))
		'<path d="M 200 150 C 260 150 275 56 330 56 C 385 56 400 150 460 150" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="392" y="46" text-anchor="middle" class="lbl" style="fill:var(--warn)">H1: shifted by d&#183;&#8730;(n/2)</text>' +
		// beta region: part of H1 left of the critical line (hatched by a filled sliver)
		'<path d="M 200 150 C 235 150 245 108 262 88 L 262 150 Z" fill="var(--warn)" opacity="0.25" stroke="none"/>' +
		// critical line at ~262 (zAlpha on the H0 axis)
		'<line x1="262" y1="40" x2="262" y2="158" stroke="var(--fg,currentColor)" stroke-width="1.4" stroke-dasharray="5 4"/>' +
		'<text x="262" y="176" text-anchor="middle" class="lbl">critical value zAlpha</text>' +
		'<text x="228" y="140" text-anchor="middle" class="lbl" style="fill:var(--warn)">&#946;: miss</text>' +
		'<path d="M 286 118 L 330 118" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowSTPW)"/>' +
		'<text x="352" y="122" class="lbl">power = 1&#8722;&#946;</text>' +
		'<text x="20" y="200" class="lbl">grow n and H1 slides right (d&#183;&#8730;(n/2) grows): &#946; shrinks, power &#8594; 1</text>' +
		'<defs><marker id="dgArrowSTPW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'power-effect-size',
		title: 'Power & Effect Size',
		nav: 'power & effect size',
		difficulty: 'Hard',
		category: 'Hypothesis Testing',
		task: 'Implement CohenD (standardized effect size via the pooled SD), Power (Φ(d·√(n/2) − zAlpha) using math.Erf), and NeededN (per-group sample size for a target power).',

		prose: [
			'<h2>Power &amp; Effect Size</h2>' +
			'<p>Your A/B test “found no difference” — p = 0.34, ship nothing, move ' +
			'on. But with 20 users per arm, what were the odds the test would have ' +
			'<em>detected</em> a real, medium-sized improvement? Run the numbers: ' +
			'about 35%. The experiment was a coin flip against a truth that was ' +
			'actually there. Underpowered studies don’t just miss effects — the ' +
			'rare times they <em>do</em> reject, they overestimate wildly (only ' +
			'lucky, exaggerated samples clear the bar: the “winner’s curse”). ' +
			'Power analysis is the arithmetic that prevents both failures, and it ' +
			'runs on three quantities:</p>' +
			'<ul>' +
			'<li><strong>Effect size, Cohen’s d.</strong> A raw difference in ' +
			'means is meaningless without a scale — 3ms is huge for a cache, ' +
			'nothing for a cold start. <code>d = (x&#772;&minus;y&#772;) / ' +
			'pooledSD</code> measures the gap in standard-deviation units, with ' +
			'pooled variance <code>((nx&minus;1)sx&#178; + (ny&minus;1)sy&#178;) / ' +
			'(nx+ny&minus;2)</code>. Cohen’s benchmarks: 0.2 small, 0.5 medium, ' +
			'0.8 large.</li>' +
			'<li><strong>Power = P(reject | the effect is real) = 1&minus;&beta;.</strong> ' +
			'For a two-sample z-test with n per group, the test statistic under ' +
			'H1 centers at <code>d&middot;&#8730;(n/2)</code> instead of 0. Power ' +
			'is the part of that shifted bell beyond the critical value: ' +
			'<code>&Phi;(d&middot;&#8730;(n/2) &minus; zAlpha)</code>.</li>' +
			'<li><strong>The four-way tradeoff.</strong> &alpha;, power, d, and n ' +
			'are one equation with four unknowns — fix any three and the fourth ' +
			'is determined. Solving for n gives the planning formula: ' +
			'<code>n = &#8968;2&middot;((zAlpha+zBeta)/d)&#178;&#8969;</code> ' +
			'per group, where zBeta is the normal quantile of the target power ' +
			'(0.842 for 80%).</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>CohenD(xs, ys)</code>, <code>Power(d, n, ' +
			'zAlpha)</code>, and <code>NeededN(d, zAlpha, zBeta)</code>. For ' +
			'&Phi; use the error function: <code>&Phi;(x) = 0.5&middot;(1 + ' +
			'math.Erf(x/&#8730;2))</code>. This Power is the standard one-tail ' +
			'approximation of the two-sided test — the far tail’s sliver of ' +
			'probability is ignored, exactly as planning tools do.</p>',
			{ lang: 'txt', code: 'd = 0.5, n = 64 per group, α = 0.05 two-sided (zAlpha = 1.96):\n  shift = 0.5·√(64/2) = 0.5·5.657 = 2.828\n  power = Φ(2.828 − 1.96) = Φ(0.868) ≈ 0.81      ← the standard "80% power" design\n\nneeded n at 80% power (zBeta = 0.842):  n = ⌈2·((1.96+0.842)/0.5)²⌉ = ⌈62.81⌉ = 63' },
			'<div class="tip">Do the power analysis <em>before</em> collecting ' +
			'data. “Post-hoc power” computed from the observed effect after a ' +
			'null result is a pure function of the p-value you already have — it ' +
			'adds zero information, and reviewers who ask for it are asking for ' +
			'numerology.</div>',
		],

		starter: [
			'package main',
			'',
			'// You will want:  import "math"  (Sqrt, Erf, Ceil, Sqrt2).',
			'',
			'// CohenD returns the standardized effect size between xs and ys:',
			'//',
			'//   d = (mean(xs) - mean(ys)) / pooledSD',
			'//',
			'// where pooledSD is the square root of the pooled variance',
			'//',
			'//   ( (nx-1)*sx2 + (ny-1)*sy2 ) / (nx + ny - 2)',
			'//',
			'// and sx2, sy2 are the (n-1) sample variances. Pooling weights each',
			'// variance by its degrees of freedom.',
			'func CohenD(xs, ys []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Power returns the power of a two-sided two-sample z-test with n',
			'// subjects PER GROUP against a true effect d, using the standard',
			'// one-tail approximation (the far rejection tail is ignored):',
			'//',
			'//   power = Phi( d*sqrt(n/2) - zAlpha )',
			'//',
			'// with Phi the standard normal CDF via the error function:',
			'//   Phi(x) = 0.5 * (1 + math.Erf(x / math.Sqrt2))',
			'func Power(d float64, n int, zAlpha float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// NeededN returns the per-group sample size for target power,',
			'// solving the power equation for n and rounding UP:',
			'//',
			'//   n = ceil( 2 * ((zAlpha + zBeta) / d)^2 )',
			'//',
			'// zBeta is the normal quantile of the target power (0.842 for 80%).',
			'func NeededN(d, zAlpha, zBeta float64) int {',
			'	// your code here',
			'	return 0',
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
			'	// Two arms of an experiment (conversion-adjacent metric). The',
			'	// treatment mean is 0.35 higher on a pooled SD of ~0.22: a LARGE',
			'	// standardized effect (~1.57) even though the raw gap looks small.',
			'	treat := []float64{2.1, 2.5, 2.3, 2.7, 2.4, 2.6, 2.2, 2.8}',
			'	control := []float64{2.0, 2.2, 1.9, 2.3, 2.1, 2.4, 1.8, 2.1}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	cases := []tc{',
			'		{"CohenD on the pinned arms: a 0.35 raw gap over a ~0.22 pooled SD is d~1.57 — the SCALE, not the gap, decides the size",',
			'			"1.5652",',
			'			func() string { return f4(CohenD(treat, control)) }},',
			'		{"the textbook design point: Power(d=0.5, n=64, zAlpha=1.96) = Phi(2.828-1.96) — just over 80%",',
			'			"0.8074",',
			'			func() string { return f4(Power(0.5, 64, 1.96)) }},',
			'		{"power rises with n at fixed d=0.5: n=20 is a 35% coin flip, n=128 nearly certain — same truth, different odds of seeing it",',
			'			"0.3524 0.9793",',
			'			func() string { return f4(Power(0.5, 20, 1.96)) + " " + f4(Power(0.5, 128, 1.96)) }},',
			'		{"NeededN(d=0.5, zAlpha=1.96, zBeta=0.842): ceil(2*(2.802/0.5)^2) = 63 per group — the classic 80%-power answer",',
			'			"63",',
			'			func() string { return fmt.Sprintf("%d", NeededN(0.5, 1.96, 0.842)) }},',
			'		{"tiny effect d=0.1: detecting a tenth of an SD at 80% power needs 1571 PER GROUP — 25x the d=0.5 requirement",',
			'			"1571",',
			'			func() string { return fmt.Sprintf("%d", NeededN(0.1, 1.96, 0.842)) }},',
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
			'// mean: plain average; the harness never passes empty slices.',
			'func mean(xs []float64) float64 {',
			'	sum := 0.0',
			'	for _, v := range xs {',
			'		sum += v',
			'	}',
			'	return sum / float64(len(xs))',
			'}',
			'',
			'// sampleVar is the Bessel-corrected (n-1) sample variance — the',
			'// ingredient the pooled variance weights by degrees of freedom.',
			'func sampleVar(xs []float64) float64 {',
			'	m := mean(xs)',
			'	sumSq := 0.0',
			'	for _, v := range xs {',
			'		d := v - m',
			'		sumSq += d * d',
			'	}',
			'	return sumSq / float64(len(xs)-1)',
			'}',
			'',
			'// CohenD standardizes the mean gap by the pooled SD. Pooling here is',
			'// legitimate (unlike in Welch\'s test) because d is DESCRIPTIVE — it',
			'// wants one common yardstick for "how many SDs apart", and weighting',
			'// each sample\'s variance by its df is the least-biased single',
			'// estimate of that yardstick.',
			'func CohenD(xs, ys []float64) float64 {',
			'	nx := float64(len(xs))',
			'	ny := float64(len(ys))',
			'	pooledVar := ((nx-1)*sampleVar(xs) + (ny-1)*sampleVar(ys)) / (nx + ny - 2)',
			'	return (mean(xs) - mean(ys)) / math.Sqrt(pooledVar)',
			'}',
			'',
			'// phi is the standard normal CDF, exactly via the error function:',
			'// Erf integrates the Gaussian over (-x, x), so rescaling by sqrt(2)',
			'// and shifting by 1/2 turns it into the one-sided CDF.',
			'func phi(x float64) float64 {',
			'	return 0.5 * (1 + math.Erf(x/math.Sqrt2))',
			'}',
			'',
			'// Power: under H1 the two-sample z statistic is normal with mean',
			'// d*sqrt(n/2) (the sqrt(n/2) is the SE of a two-group comparison:',
			'// var(x̄-ȳ) = 2σ²/n) and SD 1. Power is the mass of that shifted',
			'// bell beyond +zAlpha. The far tail (below -zAlpha) also rejects,',
			'// but its mass is negligible for any positive d — dropping it is',
			'// the standard planning approximation, and it keeps the formula',
			'// invertible for NeededN.',
			'func Power(d float64, n int, zAlpha float64) float64 {',
			'	return phi(d*math.Sqrt(float64(n)/2) - zAlpha)',
			'}',
			'',
			'// NeededN inverts the power equation. Setting',
			'// d*sqrt(n/2) - zAlpha = zBeta and solving for n gives',
			'// n = 2*((zAlpha+zBeta)/d)². Ceil, because n is a headcount and',
			'// rounding down would deliver slightly less than the target power.',
			'// The d² in the denominator is the brutal part: halving the effect',
			'// quadruples the study.',
			'func NeededN(d, zAlpha, zBeta float64) int {',
			'	ratio := (zAlpha + zBeta) / d',
			'	return int(math.Ceil(2 * ratio * ratio))',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The winner’s curse, quantified</h3>' +
			'<p>Suppose the true effect is d = 0.2 and you run n = 20 per group ' +
			'(power &asymp; 10%). Most such studies correctly stay quiet. But the ' +
			'ones that <em>do</em> clear the 1.96 bar are precisely the samples ' +
			'whose noise happened to inflate the effect — conditional on ' +
			'rejecting, the estimated d can average two to three times the truth. ' +
			'This is why “significant” results from small studies shrink or vanish ' +
			'on replication, and why the replication crisis is at heart a power ' +
			'crisis: a field running at 30% power doesn’t just miss two-thirds of ' +
			'true effects, it systematically exaggerates the ones it reports.</p>' +
			'<h3>The d&#178; law and what it buys</h3>' +
			'<p>The planning formula puts d in the denominator <em>squared</em>: ' +
			'detecting d = 0.1 takes 25&times; the sample of d = 0.5, as the ' +
			'harness pins (1571 vs 63 per group). This single fact drives real ' +
			'experimental design: big tech runs A/B tests on millions of users ' +
			'because the effects worth money are tiny (fractions of a percent); ' +
			'clinical trials define a “minimum clinically important difference” ' +
			'first, because powering for the effect you <em>hope</em> for rather ' +
			'than the smallest one that matters is how trials end up ' +
			'uninterpretable. The other levers are cheaper: variance reduction ' +
			'(stratification, CUPED in industry A/B testing) shrinks the SD under ' +
			'd, buying power without a single extra subject.</p>' +
			'<h3>From z to t, and beyond</h3>' +
			'<p>The z-based formula assumes known variance; a real study uses a ' +
			't-test, which costs a few percent of power at small n — proper tools ' +
			'(G*Power, R’s <code>pwr</code>, <code>statsmodels</code>) solve the ' +
			'noncentral-t version, which is this same computation with &Phi; ' +
			'replaced by a noncentral CDF and d&middot;&#8730;(n/2) as the ' +
			'noncentrality parameter. The structure — shift the alternative, ' +
			'measure the mass past the critical value — carries unchanged to ' +
			'ANOVA, chi-square, and regression power analyses. Learn it once ' +
			'here, reuse it everywhere.</p>',
		],
		complexity: { time: 'O(nx + ny) for CohenD; O(1) for Power and NeededN', space: 'O(1)' },
	});
})();
