/* Variance & Spread — Describing Data (Easy). Two datasets can share a
 * mean and describe completely different worlds; spread is the other half
 * of the summary. The harness pins Range, population vs sample variance on
 * the same set (the /n vs /(n-1) split), the sample standard deviation,
 * the n<2 contract, and a same-mean/different-spread pair.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// Why n-1: deviations are measured from the sample mean, which is
	// itself fitted to the data — it sits closer to the sample than the
	// true mean does, so squared deviations come out systematically small.
	// Marker id namespaced (dgArrowSTVS) because every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-label="the same sample measured from its own mean and from the true population mean: deviations from the sample mean are systematically smaller, which is why sample variance divides by n-1">' +
		'<text x="20" y="24" class="lbl">same five points, two reference lines — deviations from x̄ are always the smaller set</text>' +
		// the number line and sample points (clustered left of the true mean)
		'<line x1="40" y1="90" x2="480" y2="90" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>' +
		'<circle cx="90" cy="90" r="5" fill="var(--accent)"/>' +
		'<circle cx="130" cy="90" r="5" fill="var(--accent)"/>' +
		'<circle cx="165" cy="90" r="5" fill="var(--accent)"/>' +
		'<circle cx="205" cy="90" r="5" fill="var(--accent)"/>' +
		'<circle cx="250" cy="90" r="5" fill="var(--accent)"/>' +
		// sample mean: dead center of the points, by construction
		'<line x1="168" y1="48" x2="168" y2="132" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 3"/>' +
		'<text x="168" y="42" text-anchor="middle" class="lbl">sample mean x̄ — fitted to these points</text>' +
		// true mean: off to the side, where this sample happened not to land
		'<line x1="330" y1="48" x2="330" y2="132" stroke="var(--warn)" stroke-width="2" stroke-dasharray="5 3"/>' +
		'<text x="330" y="42" text-anchor="middle" class="lbl" style="fill:var(--warn)">true mean μ — unknown</text>' +
		// deviation arrows from the farthest point to each reference line
		'<path d="M 96 112 L 162 112" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowSTVS)"/>' +
		'<path d="M 96 152 L 324 152" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSTVS)"/>' +
		'<text x="20" y="178" class="lbl">deviations from x̄ understate the truth — /(n−1) repays the stolen degree of freedom</text>' +
		'<defs><marker id="dgArrowSTVS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'variance-spread',
		title: 'Variance & Spread',
		nav: 'variance & spread',
		difficulty: 'Easy',
		category: 'Describing Data',
		task: 'Implement Range, population variance (/n), sample variance (/(n-1), 0 when n<2), and sample standard deviation.',

		prose: [
			'<h2>Variance &amp; Spread</h2>' +
			'<p>Two API endpoints both report a mean latency of 50ms. One returns ' +
			'in 48–52ms every single time; the other alternates between 5ms cache ' +
			'hits and 95ms database misses. Same mean, opposite user experience — ' +
			'and nothing about the center can tell them apart. Spread is the ' +
			'second number every summary needs, and there’s a ladder of them:</p>' +
			'<ul>' +
			'<li><strong>Range</strong> — <code>max − min</code>. One subtraction, ' +
			'and it looks only at the two most extreme (least trustworthy) values. ' +
			'Useful as a sanity check, weak as a statistic.</li>' +
			'<li><strong>Variance</strong> — the mean of <em>squared</em> ' +
			'deviations from the mean. Squaring kills the sign (raw deviations ' +
			'sum to exactly zero — try it) and weights big misses more than small ' +
			'ones. But there are two variances, and confusing them is the classic ' +
			'stats bug:</li>' +
			'<li><strong>Population variance</strong> <code>VarP = Σ(x−μ)²/n</code> ' +
			'— correct when your data IS the whole population.</li>' +
			'<li><strong>Sample variance</strong> <code>VarS = Σ(x−x̄)²/(n−1)</code> ' +
			'— correct when your data is a <em>sample</em> used to estimate the ' +
			'population’s variance. The <code>n−1</code> is Bessel’s correction, ' +
			'and it isn’t folklore: you measure deviations from the ' +
			'<em>sample</em> mean <code>x̄</code>, but <code>x̄</code> was itself ' +
			'fitted to these very points — it sits at their exact least-squares ' +
			'center, closer to them than the true mean <code>μ</code> is. So the ' +
			'squared deviations come out systematically too small, by exactly one ' +
			'point’s worth. The sample “spent” one degree of freedom estimating ' +
			'its own mean; <code>n−1</code> is what’s left.</li>' +
			'<li><strong>Standard deviation</strong> — <code>√variance</code>, ' +
			'which undoes the squaring and lands back in the original units: ' +
			'“±2.1 <em>ms</em>”, not “4.6 ms²”.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Range</code>, <code>VarP</code>, <code>VarS</code>, ' +
			'and <code>StdDevS</code>. All are defined only for non-empty input; ' +
			'<code>VarS</code> and <code>StdDevS</code> additionally return ' +
			'<code>0</code> when <code>n &lt; 2</code> — one observation has no ' +
			'spread to estimate, and dividing by <code>n−1 = 0</code> would ' +
			'produce a NaN that poisons everything downstream.</p>',
			{ lang: 'txt', code: 'xs = {2, 4, 4, 4, 5, 5, 7, 9}   mean = 5\nsquared deviations: 9+1+1+1+0+0+4+16 = 32\nVarP = 32/8 = 4.0000        (data IS the population)\nVarS = 32/7 = 4.5714        (data is a sample: Bessel inflates)\nStdDevS = sqrt(4.5714) = 2.1381  (back in original units)' },
			'<div class="tip">Every mainstream library made a default choice here ' +
			'and they disagree: R’s <code>var()</code> and Excel’s ' +
			'<code>STDEV</code> divide by n−1; NumPy’s <code>np.var()</code> ' +
			'divides by n unless you pass <code>ddof=1</code>. Cross-language ' +
			'“my numbers don’t match” bugs are very often exactly this.</div>',
		],

		starter: [
			'package main',
			'',
			'// Range returns max(xs) - min(xs).',
			'// Defined only for non-empty xs (the harness never passes empty).',
			'func Range(xs []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// VarP returns the POPULATION variance: the mean of squared',
			'// deviations from the mean, sum((x-m)^2) / n. Use this when xs is',
			'// the entire population. Defined only for non-empty xs.',
			'func VarP(xs []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// VarS returns the SAMPLE variance with Bessel\'s correction:',
			'// sum((x-m)^2) / (n-1). Use this when xs is a sample and you are',
			'// estimating the population\'s variance. Return 0 when n < 2 — a',
			'// single observation has no spread to estimate.',
			'func VarS(xs []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// StdDevS returns the sample standard deviation: sqrt(VarS(xs)),',
			'// back in the same units as the data. Returns 0 when n < 2.',
			'func StdDevS(xs []float64) float64 {',
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
			'	// The textbook set: mean 5, squared deviations sum to 32 — so',
			'	// VarP and VarS come out as clean, checkable fractions.',
			'	xs := []float64{2, 4, 4, 4, 5, 5, 7, 9}',
			'	// Same mean (5), wildly different spread.',
			'	tight := []float64{4, 5, 6}',
			'	wide := []float64{0, 5, 10}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	cases := []tc{',
			'		{"Range {2..9}: max - min looks only at the two extremes",',
			'			"7.0000",',
			'			func() string { return f4(Range(xs)) }},',
			'		{"VarP: squared deviations sum to 32, divided by n=8",',
			'			"4.0000",',
			'			func() string { return f4(VarP(xs)) }},',
			'		{"VarS on the SAME data: 32/(n-1)=32/7 — Bessel inflates the estimate",',
			'			"4.5714",',
			'			func() string { return f4(VarS(xs)) }},',
			'		{"StdDevS: sqrt undoes the squaring, back into the data\'s units",',
			'			"2.1381",',
			'			func() string { return f4(StdDevS(xs)) }},',
			'		{"n=1 contract: one observation has no spread — VarS and StdDevS return 0, not NaN",',
			'			"0.0000 0.0000",',
			'			func() string {',
			'				one := []float64{42}',
			'				return f4(VarS(one)) + " " + f4(StdDevS(one))',
			'			}},',
			'		{"same mean, different worlds: VarP of {4,5,6} vs {0,5,10} — the mean can\'t tell them apart",',
			'			"0.6667 vs 16.6667",',
			'			func() string { return f4(VarP(tight)) + " vs " + f4(VarP(wide)) }},',
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
			'// mean is redeclared here because the solution replaces the starter',
			'// wholesale — it must be self-contained.',
			'func mean(xs []float64) float64 {',
			'	sum := 0.0',
			'	for _, x := range xs {',
			'		sum += x',
			'	}',
			'	return sum / float64(len(xs))',
			'}',
			'',
			'// sumSqDev is the shared core: the sum of squared deviations from',
			'// the mean. Both variances are this quantity with different',
			'// denominators, so it lives in one place — the /n vs /(n-1) choice',
			'// is the ONLY difference between them, and factoring it out makes',
			'// that visible in the code.',
			'func sumSqDev(xs []float64) float64 {',
			'	m := mean(xs)',
			'	total := 0.0',
			'	for _, x := range xs {',
			'		d := x - m',
			'		// Squaring, not abs: it kills the sign (raw deviations sum',
			'		// to exactly zero by definition of the mean) and it is',
			'		// smooth, which is why least-squares theory is built on it',
			'		// rather than on |d|.',
			'		total += d * d',
			'	}',
			'	return total',
			'}',
			'',
			'// Range scans once for both extremes. Starting min and max at xs[0]',
			'// (not at 0) is the classic correctness point: an all-negative or',
			'// all-positive dataset breaks a zero-initialized scan.',
			'func Range(xs []float64) float64 {',
			'	minV, maxV := xs[0], xs[0]',
			'	for _, x := range xs[1:] {',
			'		if x < minV {',
			'			minV = x',
			'		}',
			'		if x > maxV {',
			'			maxV = x',
			'		}',
			'	}',
			'	return maxV - minV',
			'}',
			'',
			'// VarP divides by n: correct when xs IS the population, so the mean',
			'// deviations are taken from is the true mean and no correction is',
			'// owed.',
			'func VarP(xs []float64) float64 {',
			'	return sumSqDev(xs) / float64(len(xs))',
			'}',
			'',
			'// VarS divides by n-1 (Bessel\'s correction): deviations were taken',
			'// from the sample mean, which is fitted to these very points and so',
			'// sits closer to them than the true mean does. The sample spent one',
			'// degree of freedom estimating its own center; n-1 is what remains.',
			'func VarS(xs []float64) float64 {',
			'	// Guard first: n=1 would divide by zero and return NaN, and NaN',
			'	// silently poisons every computation it touches downstream. A',
			'	// defined 0 is the contract instead.',
			'	if len(xs) < 2 {',
			'		return 0',
			'	}',
			'	return sumSqDev(xs) / float64(len(xs)-1)',
			'}',
			'',
			'// StdDevS is sqrt(VarS): the square root undoes the squaring and',
			'// reports spread in the data\'s own units. The n<2 case rides on',
			'// VarS\'s guard: sqrt(0) is 0.',
			'func StdDevS(xs []float64) float64 {',
			'	return math.Sqrt(VarS(xs))',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Bessel’s correction, made concrete</h3>' +
			'<p>The hand-wave “n−1 because degrees of freedom” hides a precise ' +
			'fact you can verify: for any dataset, the sum of squared deviations ' +
			'is <em>minimized</em> by taking them from the sample mean — that’s ' +
			'what the mean is, the least-squares center. Deviations from the true ' +
			'mean <code>μ</code> (which your sample almost never lands on ' +
			'exactly) are therefore larger on average, and the algebra works out ' +
			'to exactly a factor of <code>(n−1)/n</code>: ' +
			'<code>E[Σ(x−x̄)²] = (n−1)σ²</code>. Divide by <code>n−1</code> and ' +
			'the estimator is unbiased. The correction matters enormously at ' +
			'<code>n=5</code> (a 25% inflation) and not at all at ' +
			'<code>n=10,000</code> — which is why physicists with millions of ' +
			'events shrug at it and psychologists with 12 subjects cannot.</p>' +
			'<h3>The one-pass trap</h3>' +
			'<p>This solution makes two passes: one for the mean, one for the ' +
			'deviations. There is a famous one-pass shortcut — ' +
			'<code>Σx² − (Σx)²/n</code> — and it is a numerical landmine: for ' +
			'data with a large mean and small spread (timestamps, sensor ' +
			'readings around a big offset) it subtracts two huge, nearly equal ' +
			'numbers, and catastrophic cancellation can return garbage — even ' +
			'<em>negative</em> variance. Real streaming systems use Welford’s ' +
			'algorithm instead: a genuinely one-pass update of running mean and ' +
			'sum-of-squares that stays stable. It is what most metrics libraries ' +
			'and big-data accumulators (Spark included) implement.</p>' +
			'<h3>Why standard deviation, not variance, on dashboards</h3>' +
			'<p>Variance is the mathematically natural object — variances of ' +
			'independent quantities <em>add</em>, which is the backbone of every ' +
			'error-propagation formula and of the CLT later in this track. But ' +
			'its units are squared (ms², dollars²), so humans read the square ' +
			'root. The pairing is everywhere: mean ± sd is the two-number summary ' +
			'that the empirical rule (two problems from now) turns into actual ' +
			'probability statements, and the sd you just implemented is the ' +
			'denominator inside every z-score, t-statistic, and effect size to ' +
			'come.</p>',
		],
		complexity: { time: 'O(n) — two passes: one for the mean, one for squared deviations', space: 'O(1)' },
	});
})();
