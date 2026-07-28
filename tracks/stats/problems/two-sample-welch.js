/* Welch's Two-Sample t-Test — Hypothesis Testing (Medium). The two-sample
 * comparison done right: each sample keeps its OWN variance, the standard
 * error is the sum of the per-sample pieces, and the degrees of freedom
 * come out fractional via Welch–Satterthwaite. The harness pins t and df
 * on an unequal-variance pair, a same-distribution pair (small |t|), the
 * df collapse when one sample is small and noisy, and the equal-variance
 * case where Welch quietly agrees with the pooled test.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// Two samples, two very different spreads: the narrow bell and the wide
	// bell each contribute their own s²/n to the combined standard error —
	// nothing is pooled. Marker id namespaced (dgArrowSTTW) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="two sample distributions, one narrow and one wide, each feeding its own variance over n into the combined standard error of Welch\'s t-test">' +
		'<text x="20" y="22" class="lbl">two samples, two spreads — each keeps its OWN variance</text>' +
		// narrow bell: build A (tight, larger n)
		'<path d="M 40 108 C 85 108 92 40 115 40 C 138 40 145 108 190 108" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="115" y="126" text-anchor="middle" class="lbl">build A: nx=8, small sx&#178;</text>' +
		// wide bell: build B (spread out, smaller n)
		'<path d="M 280 108 C 330 108 345 68 385 68 C 425 68 440 108 490 108" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="385" y="126" text-anchor="middle" class="lbl" style="fill:var(--warn)">build B: ny=6, LARGE sy&#178;</text>' +
		// both variances flow into the combined SE
		'<path d="M 115 132 C 115 168 200 176 236 178" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowSTTW)"/>' +
		'<path d="M 385 132 C 385 168 310 176 288 178" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSTTW)"/>' +
		'<text x="262" y="188" text-anchor="middle">SE = &#8730;(sx&#178;/nx + sy&#178;/ny)</text>' +
		'<text x="20" y="207" class="lbl">t = (x&#772; &#8722; y&#772;) / SE — and df goes FRACTIONAL, sliding toward min(n)&#8722;1 as the variances diverge</text>' +
		'<defs><marker id="dgArrowSTTW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'two-sample-welch',
		title: 'Welch\'s Two-Sample t-Test',
		nav: 'welch t-test',
		difficulty: 'Medium',
		category: 'Hypothesis Testing',
		task: 'Implement WelchT (each sample keeps its own variance in the standard error) and WelchDF (the fractional Welch–Satterthwaite degrees of freedom).',

		prose: [
			'<h2>Welch’s Two-Sample t-Test</h2>' +
			'<p>You benchmarked two builds. Build A ran 8 times on a quiet host: ' +
			'response times tightly clustered around 12ms. Build B ran 6 times on ' +
			'shared CI runners: anywhere from 11 to 17ms. Is B actually slower, or ' +
			'is that spread just noisy runners? The textbook two-sample t-test ' +
			'<em>pools</em> the two variances into one — which silently assumes ' +
			'both samples have the <strong>same</strong> spread. Yours obviously ' +
			'don’t (one sample variance is ~60&times; the other), and when that ' +
			'assumption breaks with unequal sample sizes, the pooled test’s ' +
			'p-values are simply wrong — sometimes too eager, sometimes too timid. ' +
			'Welch’s version drops the assumption entirely:</p>' +
			'<ul>' +
			'<li><strong>Separate variances.</strong> Compute each sample’s own ' +
			'Bessel-corrected variance (divide by n&minus;1) and never mix them. The ' +
			'standard error of the difference of means is ' +
			'<code>&#8730;(sx&#178;/nx + sy&#178;/ny)</code> — each sample ' +
			'contributes exactly the uncertainty of its own mean.</li>' +
			'<li><strong>The statistic</strong> is the familiar shape: ' +
			'<code>t = (x&#772; &minus; y&#772;) / SE</code>. Distance between the ' +
			'means, measured in units of how wobbly that distance is.</li>' +
			'<li><strong>Fractional degrees of freedom.</strong> The price of not ' +
			'pooling is that t’s null distribution no longer has a clean ' +
			'<code>nx+ny&minus;2</code> df. Welch–Satterthwaite approximates it: ' +
			'with <code>a = sx&#178;/nx</code> and <code>b = sy&#178;/ny</code>, ' +
			'<code>df = (a+b)&#178; / (a&#178;/(nx&minus;1) + b&#178;/(ny&minus;1))</code>. ' +
			'It is a float — df&nbsp;=&nbsp;5.12 is a perfectly good answer — ' +
			'and it always lies between <code>min(nx,ny)&minus;1</code> and ' +
			'<code>nx+ny&minus;2</code>.</li>' +
			'<li><strong>The df tells a story.</strong> When variances match, df ' +
			'climbs back up to (nearly) the pooled <code>nx+ny&minus;2</code>. When ' +
			'one sample is small <em>and</em> noisy, that sample dominates the SE ' +
			'and df collapses toward its own <code>n&minus;1</code> — the test ' +
			'honestly admits most of its information comes from very few points.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>WelchT(xs, ys)</code> and <code>WelchDF(xs, ys)</code> ' +
			'exactly as specified above — sample (n&minus;1) variances, separate ' +
			'per-sample terms, and the raw Welch–Satterthwaite float with no ' +
			'rounding.</p>',
			{ lang: 'txt', code: 'build A (n=8): mean 12.075, s² = 0.096   →  sx²/nx = 0.0121\nbuild B (n=6): mean 14.317, s² = 5.862   →  sy²/ny = 0.9770\n\nSE = √(0.0121 + 0.9770) = 0.9945    t = (12.075 − 14.317)/0.9945 = −2.25\ndf = (0.9891)² / (0.0121²/7 + 0.9770²/5) = 5.12    (pooled would claim 12)' },
			'<div class="tip">R’s <code>t.test()</code> has defaulted to Welch for ' +
			'decades; the pooled test is the one you must opt <em>into</em> ' +
			'(<code>var.equal=TRUE</code>). The reason: when variances happen to be ' +
			'equal, Welch costs almost nothing — its df drifts up to the pooled ' +
			'value — but when they differ, pooling can be badly miscalibrated. A ' +
			'test that is nearly free when you don’t need it and correct when you ' +
			'do is the right default.</div>',
		],

		starter: [
			'package main',
			'',
			'// You will want:  import "math"  (Sqrt).',
			'',
			'// WelchT returns Welch\'s two-sample t statistic for the difference in',
			'// means of xs and ys:',
			'//',
			'//   t = (mean(xs) - mean(ys)) / sqrt(sx2/nx + sy2/ny)',
			'//',
			'// where sx2 and sy2 are the SAMPLE variances (sum of squared',
			'// deviations divided by n-1, Bessel\'s correction) and nx, ny are the',
			'// sample sizes. The variances are never pooled: each sample',
			'// contributes its own s2/n term to the standard error.',
			'func WelchT(xs, ys []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// WelchDF returns the Welch–Satterthwaite degrees of freedom. With',
			'// a = sx2/nx and b = sy2/ny (same sample variances as WelchT):',
			'//',
			'//   df = (a + b)^2 / ( a^2/(nx-1) + b^2/(ny-1) )',
			'//',
			'// Return the raw float — no rounding. It is generally fractional,',
			'// and always lies between min(nx,ny)-1 and nx+ny-2.',
			'func WelchDF(xs, ys []float64) float64 {',
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
			'	// Response times (ms) for two builds. Build A ran on a quiet host:',
			'	// tight spread. Build B ran on shared CI runners: same code path,',
			'	// wildly noisier — its sample variance is ~60x A\'s. This is the',
			'	// exact shape (unequal n, unequal variance) where pooling lies.',
			'	buildA := []float64{12.1, 11.8, 12.5, 12.0, 11.6, 12.3, 12.4, 11.9}',
			'	buildB := []float64{15.9, 12.2, 17.1, 11.5, 16.4, 12.8}',
			'	// Two samples drawn from the same tight distribution: any',
			'	// difference in means is pure noise, so |t| must be small.',
			'	sameX := []float64{5.0, 5.2, 4.8, 5.1, 4.9}',
			'	sameY := []float64{5.1, 4.9, 5.0, 5.2, 4.7}',
			'	// The df-collapse setup: 12 tight measurements vs 4 wildly noisy',
			'	// ones. The noisy 4 dominate the standard error, so Welch df',
			'	// falls to ~3 — the pooled test would happily claim 14.',
			'	tight := []float64{10.0, 10.1, 9.9, 10.2, 9.8, 10.0, 10.1, 9.9, 10.0, 10.2, 9.8, 10.1}',
			'	noisy := []float64{8.0, 14.0, 6.0, 16.0}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	cases := []tc{',
			'		{"WelchT, build A (tight, n=8) vs build B (noisy, n=6): the noisy sample\'s s²/n dominates the SE",',
			'			"-2.2541",',
			'			func() string { return f4(WelchT(buildA, buildB)) }},',
			'		{"WelchDF on the same pair: fractional df 5.12 — NOT the pooled nx+ny-2 = 12",',
			'			"5.1236",',
			'			func() string { return f4(WelchDF(buildA, buildB)) }},',
			'		{"same distribution, same spread: the difference in means is noise, so |t| stays small",',
			'			"0.1796",',
			'			func() string { return f4(WelchT(sameX, sameY)) }},',
			'		{"equal variances: Welch df climbs back to nearly the pooled 5+5-2 = 8 — Welch costs ~nothing when pooling would have been fine",',
			'			"7.7111",',
			'			func() string { return f4(WelchDF(sameX, sameY)) }},',
			'		{"df collapse: 12 tight vs 4 noisy points — pooled df claims n1+n2-2 = 14, Welch answers ~3 (the noisy 4 carry almost all the uncertainty)",',
			'			"3.0017",',
			'			func() string { return f4(WelchDF(tight, noisy)) }},',
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
			'// mean is the arithmetic average. Both Welch pieces need it; the',
			'// harness never passes an empty slice, so no guard is needed.',
			'func mean(xs []float64) float64 {',
			'	sum := 0.0',
			'	for _, v := range xs {',
			'		sum += v',
			'	}',
			'	return sum / float64(len(xs))',
			'}',
			'',
			'// sampleVar is the Bessel-corrected (n-1) sample variance. Welch\'s',
			'// whole point is that each sample keeps its OWN variance — this is',
			'// called once per sample and the two results never mix until they',
			'// are summed, each already scaled by its own n, inside the SE.',
			'func sampleVar(xs []float64) float64 {',
			'	m := mean(xs)',
			'	sumSq := 0.0',
			'	for _, v := range xs {',
			'		d := v - m',
			'		sumSq += d * d',
			'	}',
			'	// n-1, not n: the deviations are measured from the sample\'s own',
			'	// mean, which eats one degree of freedom; dividing by n would',
			'	// systematically understate the spread of small samples.',
			'	return sumSq / float64(len(xs)-1)',
			'}',
			'',
			'// WelchT: distance between the means in units of the uncertainty of',
			'// that distance. The SE adds the per-sample terms sx²/nx + sy²/ny —',
			'// variances of independent estimates add, so the variance of the',
			'// difference (x̄ - ȳ) is exactly this sum. No pooled variance anywhere.',
			'func WelchT(xs, ys []float64) float64 {',
			'	seSquared := sampleVar(xs)/float64(len(xs)) + sampleVar(ys)/float64(len(ys))',
			'	return (mean(xs) - mean(ys)) / math.Sqrt(seSquared)',
			'}',
			'',
			'// WelchDF is the Welch–Satterthwaite approximation: it finds the df',
			'// of the chi-square shape that best matches the true (messy)',
			'// distribution of the combined SE² by matching its first two moments.',
			'func WelchDF(xs, ys []float64) float64 {',
			'	nx := float64(len(xs))',
			'	ny := float64(len(ys))',
			'	// a and b are each sample\'s share of SE². The formula rewards',
			'	// balance: if a ≈ b and nx ≈ ny = n, the numerator (a+b)² = 4a²',
			'	// sits over ≈ 2a²/(n-1), giving df ≈ 2(n-1) — the pooled answer.',
			'	// If one term dominates, say a >> b, the ratio degenerates to',
			'	// a²/(a²/(nx-1)) = nx-1: only the noisy sample\'s handful of',
			'	// points really constrain the estimate.',
			'	a := sampleVar(xs) / nx',
			'	b := sampleVar(ys) / ny',
			'	return (a + b) * (a + b) / (a*a/(nx-1) + b*b/(ny-1))',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why pooling fails, precisely</h3>' +
			'<p>The pooled test estimates ONE variance from both samples, weighted ' +
			'by their sizes. When the small sample is the noisy one, the pooled ' +
			'estimate is dominated by the large quiet sample — the test ' +
			'<em>understates</em> the real uncertainty and rejects too often ' +
			'(inflated false positives). Flip it — big noisy sample, small quiet ' +
			'one — and the test turns too conservative. This is the classical ' +
			'Behrens–Fisher problem, and it has no exact solution; Welch (1947) ' +
			'and Satterthwaite (1946) independently landed on the same practical ' +
			'fix: keep the variances separate and approximate the df by moment ' +
			'matching. Simulation studies ever since have confirmed the ' +
			'approximation is excellent, which is why R made it the default and ' +
			'why <code>scipy.stats.ttest_ind(equal_var=False)</code> exists.</p>' +
			'<h3>Reading the fractional df</h3>' +
			'<p>The df is an honesty meter. <code>df = 5.12</code> on samples of 8 ' +
			'and 6 says: after accounting for how lopsided the variances are, this ' +
			'comparison carries about as much information as a t-test on six ' +
			'points. The bounds are worth memorizing — Welch df never drops below ' +
			'<code>min(nx,ny)&minus;1</code> (you always have at least the noisier ' +
			'sample’s information) and never exceeds <code>nx+ny&minus;2</code> ' +
			'(you can’t beat the equal-variance case). A common bug is rounding df ' +
			'to an int to use a printed t-table; modern software evaluates the t ' +
			'distribution at the fractional df directly, and so should you.</p>' +
			'<h3>In the wild</h3>' +
			'<p>Unequal variances are the norm in engineering data, not the ' +
			'exception: a change that speeds up the cache-hit path often changes ' +
			'the <em>variance</em> of latency, not just its mean; an A/B arm that ' +
			'alters user behavior alters its spread too. That is why “just use ' +
			'Welch” is standard advice — the equal-variance t-test survives mostly ' +
			'in textbooks, where it is taught first for historical reasons. And ' +
			'one trap to avoid: <strong>never choose pooling by running an ' +
			'equality-of-variance pre-test</strong> (Levene, F-test) and branching ' +
			'on it — the two-stage procedure distorts the final p-value. Default ' +
			'to Welch, always.</p>',
		],
		complexity: { time: 'O(nx + ny) — two passes per sample (mean, then squared deviations)', space: 'O(1)' },
	});
})();
