/* Regression & Inference — Modeling & Advanced (Hard). Ordinary least
 * squares from first principles, then the inference layer on top: r² as
 * variance explained, the residual standard error on n-2 df, and the
 * slope t-statistic that asks "could this trend be noise?". The harness
 * pins slope/intercept on a latency-vs-conversion dataset, an exact-fit
 * line (r² = 1, residual SE = 0), r² on a noisy set, and SlopeT both for
 * a real trend and for a flat cloud.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// A scatter with the fitted line, one residual drawn as a vertical bar,
	// and the two sums the r² ratio compares. Marker id namespaced
	// (dgArrowSTLR) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="scatter plot with a fitted regression line; one point\'s vertical distance to the line is labeled residual; SSres sums squared residuals, SStot sums squared distances from the flat mean line">' +
		'<text x="20" y="22" class="lbl">OLS: the line minimizing the sum of SQUARED vertical gaps</text>' +
		// axes
		'<line x1="50" y1="170" x2="490" y2="170" stroke="var(--fg,currentColor)" stroke-width="1"/>' +
		'<line x1="50" y1="40" x2="50" y2="170" stroke="var(--fg,currentColor)" stroke-width="1"/>' +
		// the flat mean(y) line, dashed — the SStot baseline
		'<line x1="50" y1="105" x2="470" y2="105" stroke="var(--fg,currentColor)" stroke-width="1" stroke-dasharray="5 4" opacity="0.55"/>' +
		'<text x="474" y="109" class="lbl">y&#772;</text>' +
		// fitted line (downward)
		'<line x1="60" y1="58" x2="470" y2="152" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="415" y="136" class="lbl" style="fill:var(--accent)">y&#770; = a + bx</text>' +
		// scatter points around the line
		'<circle cx="90" cy="70" r="4" fill="var(--accent)"/>' +
		'<circle cx="160" cy="86" r="4" fill="var(--accent)"/>' +
		'<circle cx="230" cy="92" r="4" fill="var(--accent)"/>' +
		'<circle cx="300" cy="122" r="4" fill="var(--accent)"/>' +
		'<circle cx="370" cy="128" r="4" fill="var(--accent)"/>' +
		'<circle cx="440" cy="150" r="4" fill="var(--accent)"/>' +
		// one residual: point at (300,122), line height there ~ 113
		'<line x1="300" y1="122" x2="300" y2="113" stroke="var(--warn)" stroke-width="3"/>' +
		'<path d="M 336 88 C 320 94 308 102 302 112" fill="none" stroke="var(--warn)" stroke-width="1.4" marker-end="url(#dgArrowSTLR)"/>' +
		'<text x="340" y="84" class="lbl" style="fill:var(--warn)">residual: y &#8722; y&#770;</text>' +
		'<text x="20" y="192" class="lbl">SSres = &#931;(y&#8722;y&#770;)&#178; (gaps to the LINE) &#160;&#160;SStot = &#931;(y&#8722;y&#772;)&#178; (gaps to the flat mean)</text>' +
		'<text x="20" y="208" class="lbl">r&#178; = 1 &#8722; SSres/SStot — the share of y&#8217;s variance the line explains</text>' +
		'<defs><marker id="dgArrowSTLR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'linear-regression-inference',
		title: 'Regression & Inference',
		nav: 'regression inference',
		difficulty: 'Hard',
		category: 'Modeling & Advanced',
		task: 'Implement FitOLS (least-squares slope and intercept), RSquared (variance explained), ResidualSE (√(SSres/(n−2))), and SlopeT (the t-statistic for H0: slope = 0).',

		prose: [
			'<h2>Regression &amp; Inference</h2>' +
			'<p>“Every extra 100ms of latency costs 1% conversion.” Sentences like ' +
			'that steer roadmaps — and every one of them is a fitted regression ' +
			'slope. Someone plotted conversion against latency, drew the ' +
			'least-squares line, and read the slope as a price. Before you repeat ' +
			'it in a planning meeting, you should be able to answer two questions: ' +
			'where does the line come from, and how sure is that slope — could a ' +
			'flat, do-nothing relationship have produced it by luck? Fitting ' +
			'answers the first; inference answers the second:</p>' +
			'<ul>' +
			'<li><strong>The fit.</strong> OLS picks the line minimizing the sum ' +
			'of squared <em>vertical</em> errors. Calculus collapses that to two ' +
			'closed forms: <code>slope = &Sigma;(x&minus;x&#772;)(y&minus;y&#772;) ' +
			'/ &Sigma;(x&minus;x&#772;)&#178;</code> — covariance over variance — ' +
			'and <code>intercept = y&#772; &minus; slope&middot;x&#772;</code>, ' +
			'because the line always passes through (x&#772;, y&#772;).</li>' +
			'<li><strong>r&#178;, variance explained.</strong> Compare the line’s ' +
			'leftover error <code>SSres = &Sigma;(y&minus;y&#770;)&#178;</code> ' +
			'against the no-model baseline <code>SStot = ' +
			'&Sigma;(y&minus;y&#772;)&#178;</code>: <code>r&#178; = 1 &minus; ' +
			'SSres/SStot</code>. 1.0 is an exact fit; 0 means the line does no ' +
			'better than predicting the mean.</li>' +
			'<li><strong>Residual standard error.</strong> The typical miss, ' +
			'<code>&#8730;(SSres/(n&minus;2))</code>. The n&minus;2 is Bessel’s ' +
			'idea again, twice over: the residuals were measured against a line ' +
			'that spent two fitted parameters chasing them, so two degrees of ' +
			'freedom are already gone.</li>' +
			'<li><strong>The slope’s t-statistic.</strong> The standard error of ' +
			'the slope is <code>ResidualSE / &#8730;&Sigma;(x&minus;x&#772;)&#178;</code> ' +
			'— noisier data hurts, and a wider spread of x <em>helps</em> ' +
			'(leverage). Then <code>t = slope / SE(slope)</code> tests H0: slope ' +
			'= 0. |t| &gt; ~2 says the trend is unlikely to be noise; t &asymp; 0 ' +
			'says the flat line explains your data just as well.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>FitOLS(xs, ys)</code> returning ' +
			'<code>(slope, intercept)</code>, then <code>RSquared</code>, ' +
			'<code>ResidualSE</code>, and <code>SlopeT</code> built on top of the ' +
			'fit, exactly per the formulas above.</p>',
			{ lang: 'txt', code: 'latency x (100ms units):  1     2     3     4     5     6\nconversion y (%):         9.8   9.1   8.4   8.0   7.2   6.5\n\nslope = −0.646  → "each 100ms costs ~0.65% conversion"\nSlopeT = −28.2  → a flat truth essentially cannot fake this trend' },
			'<div class="tip">r&#178; measures fit to a <em>line</em>, not truth. ' +
			'Anscombe’s quartet is four datasets with identical slope, intercept, ' +
			'and r&#178; — one is linear, one is a clean curve, one has a single ' +
			'outlier dragging the line. A high r&#178; over a residual plot with ' +
			'curvature is a lie with good grades: always look at the ' +
			'residuals.</div>',
		],

		starter: [
			'package main',
			'',
			'// You will want:  import "math"  (Sqrt).',
			'',
			'// FitOLS returns the least-squares (slope, intercept) — in that',
			'// order — for the line y = intercept + slope*x:',
			'//',
			'//   slope     = Sum (x-xbar)*(y-ybar) / Sum (x-xbar)^2',
			'//   intercept = ybar - slope*xbar',
			'//',
			'// xs and ys have equal length n >= 3 with at least two distinct xs.',
			'func FitOLS(xs, ys []float64) (float64, float64) {',
			'	// your code here',
			'	return 0, 0',
			'}',
			'',
			'// RSquared returns the coefficient of determination:',
			'//',
			'//   r2 = 1 - SSres/SStot',
			'//',
			'// where SSres = Sum (y - yhat)^2 over the FitOLS line and',
			'// SStot = Sum (y - ybar)^2. Exact fit -> 1; no better than the',
			'// mean -> 0.',
			'func RSquared(xs, ys []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// ResidualSE returns the residual standard error:',
			'//',
			'//   sqrt( SSres / (n-2) )',
			'//',
			'// n-2, not n: the residuals are measured against a line whose two',
			'// parameters were themselves fitted to these points.',
			'func ResidualSE(xs, ys []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// SlopeT returns the t-statistic testing H0: slope = 0,',
			'//',
			'//   t = slope / ( ResidualSE / sqrt(Sum (x-xbar)^2) )',
			'//',
			'// i.e. the slope divided by its standard error. Assumes the fit is',
			'// not exact (ResidualSE > 0).',
			'func SlopeT(xs, ys []float64) float64 {',
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
			'	// Page latency (units of 100ms) vs conversion rate (%): the',
			'	// dataset behind a "latency costs conversion" headline. A clean,',
			'	// strong downward trend with a little measurement noise.',
			'	latency := []float64{1, 2, 3, 4, 5, 6}',
			'	conversion := []float64{9.8, 9.1, 8.4, 8.0, 7.2, 6.5}',
			'	// An exact line y = 2x + 1: zero residuals, the degenerate',
			'	// boundary where r2 = 1 and ResidualSE = 0 (so SlopeT is',
			'	// undefined there — never computed on this data).',
			'	exactX := []float64{1, 2, 3, 4}',
			'	exactY := []float64{3, 5, 7, 9}',
			'	// A genuinely noisy upward drift: the line helps but leaves a',
			'	// visible fraction of the variance unexplained.',
			'	noisyX := []float64{1, 2, 3, 4, 5, 6, 7, 8}',
			'	noisyY := []float64{2.3, 3.1, 2.7, 4.0, 3.4, 4.4, 3.9, 4.8}',
			'	// A flat cloud: y wobbles around 5.0 with no relationship to x.',
			'	flatX := []float64{1, 2, 3, 4, 5, 6}',
			'	flatY := []float64{5.1, 4.9, 5.2, 4.8, 5.0, 5.1}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	cases := []tc{',
			'		{"FitOLS on latency vs conversion: slope -0.65 per 100ms — the number the headline quotes — and the line passes through (xbar, ybar)",',
			'			"slope=-0.6457 intercept=10.4267",',
			'			func() string {',
			'				slope, intercept := FitOLS(latency, conversion)',
			'				return fmt.Sprintf("slope=%s intercept=%s", f4(slope), f4(intercept))',
			'			}},',
			'		{"exact fit y=2x+1: SSres = 0, so r2 is exactly 1 — every bit of y\'s variance is the line",',
			'			"1.0000",',
			'			func() string { return f4(RSquared(exactX, exactY)) }},',
			'		{"ResidualSE on the exact fit is 0 — and dividing by it is why SlopeT must never be computed on a perfect line",',
			'			"0.0000",',
			'			func() string { return f4(ResidualSE(exactX, exactY)) }},',
			'		{"r2 on a noisy drift: 0.79 — the trend is real but a fifth of the variance is scatter the line cannot claim",',
			'			"0.7867",',
			'			func() string { return f4(RSquared(noisyX, noisyY)) }},',
			'		{"SlopeT on the latency data: |t| = 28 — a flat truth producing this trend by luck is essentially impossible",',
			'			"-28.1767",',
			'			func() string { return f4(SlopeT(latency, conversion)) }},',
			'		{"SlopeT on a flat cloud: t = -0.07, nowhere near the ~2 bar — the apparent slope is pure noise",',
			'			"-0.0727",',
			'			func() string { return f4(SlopeT(flatX, flatY)) }},',
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
			'// mean: plain average; inputs are never empty here.',
			'func mean(xs []float64) float64 {',
			'	sum := 0.0',
			'	for _, v := range xs {',
			'		sum += v',
			'	}',
			'	return sum / float64(len(xs))',
			'}',
			'',
			'// FitOLS returns (slope, intercept). Minimizing Sum (y - a - bx)²',
			'// and setting both partial derivatives to zero yields the normal',
			'// equations; centering on the means collapses them to a single',
			'// division: slope = Sxy/Sxx, i.e. cov(x,y)/var(x) — regression IS',
			'// covariance rescaled by the spread of x.',
			'func FitOLS(xs, ys []float64) (float64, float64) {',
			'	xBar := mean(xs)',
			'	yBar := mean(ys)',
			'	sxy := 0.0',
			'	sxx := 0.0',
			'	for i := range xs {',
			'		dx := xs[i] - xBar',
			'		sxy += dx * (ys[i] - yBar)',
			'		sxx += dx * dx',
			'	}',
			'	slope := sxy / sxx',
			'	// The intercept drops out of the first normal equation: the',
			'	// residuals sum to zero only if the line passes through the',
			'	// centroid (xBar, yBar). Solve that point for the intercept.',
			'	return slope, yBar - slope*xBar',
			'}',
			'',
			'// ssRes is the sum of squared residuals against the fitted line —',
			'// the quantity OLS minimized, shared by r², ResidualSE, and SlopeT',
			'// so the fit happens in exactly one place.',
			'func ssRes(xs, ys []float64) float64 {',
			'	slope, intercept := FitOLS(xs, ys)',
			'	sum := 0.0',
			'	for i := range xs {',
			'		residual := ys[i] - (intercept + slope*xs[i])',
			'		sum += residual * residual',
			'	}',
			'	return sum',
			'}',
			'',
			'// RSquared compares the line\'s leftover error to the no-model',
			'// baseline of always predicting yBar. Because OLS can always choose',
			'// slope 0 and reproduce that baseline, SSres <= SStot and the ratio',
			'// lands in [0, 1] for any least-squares fit.',
			'func RSquared(xs, ys []float64) float64 {',
			'	yBar := mean(ys)',
			'	ssTot := 0.0',
			'	for _, y := range ys {',
			'		d := y - yBar',
			'		ssTot += d * d',
			'	}',
			'	return 1 - ssRes(xs, ys)/ssTot',
			'}',
			'',
			'// ResidualSE estimates the SD of the noise around the true line.',
			'// The n-2 divisor is the regression version of Bessel\'s correction:',
			'// the residuals are measured against a line that spent two fitted',
			'// parameters (slope and intercept) minimizing exactly these',
			'// residuals, so they are systematically too small by two degrees',
			'// of freedom.',
			'func ResidualSE(xs, ys []float64) float64 {',
			'	return math.Sqrt(ssRes(xs, ys) / float64(len(xs)-2))',
			'}',
			'',
			'// SlopeT: the slope\'s standard error is ResidualSE/sqrt(Sxx) —',
			'// vertical noise scaled DOWN by the spread of x, which is why',
			'// sampling a wide x range buys certainty about the trend. The',
			'// ratio slope/SE follows a t distribution on n-2 df under',
			'// H0: slope = 0, so |t| >~ 2 rejects at the usual 5% level.',
			'func SlopeT(xs, ys []float64) float64 {',
			'	slope, _ := FitOLS(xs, ys)',
			'	xBar := mean(xs)',
			'	sxx := 0.0',
			'	for _, x := range xs {',
			'		dx := x - xBar',
			'		sxx += dx * dx',
			'	}',
			'	return slope / (ResidualSE(xs, ys) / math.Sqrt(sxx))',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why squared vertical errors</h3>' +
			'<p>Squares are not the only choice — minimizing absolute errors ' +
			'(LAD) predates OLS — but they won for three connected reasons. ' +
			'Squared loss is differentiable, so the minimum has a closed form ' +
			'(Legendre and Gauss, ~1805, fitting comet orbits) instead of ' +
			'needing iteration. If the noise is Gaussian, OLS <em>is</em> ' +
			'maximum likelihood. And the geometry is exact: fitting is an ' +
			'orthogonal projection of the y vector onto the plane spanned by ' +
			'{1, x}, which is what makes SStot = SSreg + SSres decompose ' +
			'cleanly — Pythagoras, in n dimensions. The price is famous too: ' +
			'squaring amplifies outliers, so one bad point can commandeer the ' +
			'line. Robust variants (Huber loss, Theil–Sen) trade the closed ' +
			'form for resistance.</p>' +
			'<h3>What the slope t does and does not say</h3>' +
			'<p>|t| = 28 on the latency data means: <em>if</em> the truth were ' +
			'flat, a sample this trended is astronomically unlikely. It does ' +
			'<strong>not</strong> mean latency causes the conversion drop — slow ' +
			'pages and low conversion could share a cause (heavy pages, ' +
			'struggling markets, bot traffic). Observational slopes become ' +
			'causal claims only through experiments or careful controls, and ' +
			'the “100ms costs 1%” folklore is credible precisely because ' +
			'companies like Amazon and Google ran <em>randomized</em> ' +
			'slowdown experiments, not because someone fit a line to logs. ' +
			'Also beware significance without size: with a million points, t ' +
			'clears 2 for slopes too small to matter. Report the slope with ' +
			'units — that is the number decisions actually consume.</p>' +
			'<h3>The n&minus;2 thread</h3>' +
			'<p>Track the degrees of freedom across this whole track: variance ' +
			'divides by n&minus;1 because the mean was estimated; here the ' +
			'residual variance divides by n&minus;2 because slope <em>and</em> ' +
			'intercept were; multiple regression with p predictors divides by ' +
			'n&minus;p&minus;1. Each fitted parameter is one direction in which ' +
			'the model already bent toward the data, and the correction stops ' +
			'you from counting that flexibility as skill. The same accounting ' +
			'is why r&#178; only ever rises as you add predictors — the fit ' +
			'spends more freedom chasing noise — and why adjusted r&#178; and ' +
			'cross-validation exist to take the flattery back out.</p>',
		],
		complexity: { time: 'O(n) per function — constant number of passes over the points', space: 'O(1)' },
	});
})();
