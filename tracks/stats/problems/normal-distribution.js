/* The Normal Distribution — Probability (Medium). The bell curve as three
 * functions: the PDF (a height, NOT a probability), the CDF via math.Erf
 * (the area that IS the probability), and the quantile as a bisection on
 * the CDF — no rational approximations, just the monotone inverse. The
 * harness pins Φ(0)=0.5, the famous Φ(1.96)=0.975, the peak height
 * 1/(σ√2π), a quantile round-trip, and the IQ scale (μ=100, σ=15).
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// The bell with the area left of x shaded: the picture that separates
	// "height of the curve" (PDF) from "area under it" (CDF). Marker id
	// namespaced (dgArrowSTND) because every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="a bell curve with the area under it to the left of a point x shaded and labeled Phi of x; the curve height at x is the PDF, the shaded area is the CDF">' +
		'<text x="20" y="22" class="lbl">the PDF is the curve’s height — the CDF Φ(x) is the shaded area to the left</text>' +
		// shaded area up to x = 320 (about +0.8σ on this drawing)
		'<polygon points="40,168.2 60,166.3 80,162.7 100,156.6 120,147.2 140,133.9 160,116.6 180,96.4 200,75.6 220,57.2 240,44.5 260,40.0 280,44.5 300,57.2 320,75.6 320,170 40,170" fill="var(--accent)" opacity="0.18"/>' +
		// the bell itself
		'<polyline points="40,168.2 60,166.3 80,162.7 100,156.6 120,147.2 140,133.9 160,116.6 180,96.4 200,75.6 220,57.2 240,44.5 260,40.0 280,44.5 300,57.2 320,75.6 340,96.4 360,116.6 380,133.9 400,147.2 420,156.6 440,162.7 460,166.3 480,168.2" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		// baseline, the mean, and the point x
		'<line x1="30" y1="170" x2="490" y2="170" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>' +
		'<line x1="320" y1="75.6" x2="320" y2="170" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="4 3"/>' +
		'<text x="320" y="186" text-anchor="middle" class="lbl">x</text>' +
		'<text x="260" y="186" text-anchor="middle" class="lbl">μ</text>' +
		'<text x="200" y="140" text-anchor="middle" class="lbl">area = Φ(x)</text>' +
		// height-vs-area callout
		'<path d="M 388 60 C 360 52 340 60 324 74" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSTND)"/>' +
		'<text x="392" y="58" class="lbl" style="fill:var(--warn)">PDF(x): a height — P(X=x) is 0</text>' +
		'<text x="20" y="205" class="lbl">quantile(p) runs the picture backwards: find the x whose shaded area is p</text>' +
		'<defs><marker id="dgArrowSTND" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'normal-distribution',
		title: 'The Normal Distribution',
		nav: 'normal distribution',
		difficulty: 'Medium',
		category: 'Probability',
		task: 'Implement NormalPDF, NormalCDF via math.Erf, and NormalQuantile by bisection on the CDF — height, area, and the area run backwards.',

		prose: [
			'<h2>The Normal Distribution</h2>' +
			'<p>Adult heights. Measurement error in a lab. Sensor noise. The ' +
			'average of almost <em>anything</em>, averaged enough times. Plot ' +
			'them and the same bell keeps appearing — so reliably that when a ' +
			'dashboard shows p99 latency, someone inevitably computes ' +
			'“mean&nbsp;+&nbsp;2.33σ” and calls it the 99th percentile. (Latency ' +
			'is heavily right-skewed; that formula is percentile math done ' +
			'wrong, and wrong in the dangerous direction. Knowing <em>when</em> ' +
			'the bell applies is half the skill.) The curve is one formula with ' +
			'two knobs — center μ and spread σ — and three views of it:</p>' +
			'<ul>' +
			'<li><strong>PDF — the height.</strong> ' +
			'<code>exp(−(x−μ)²/(2σ²)) / (σ√(2π))</code>. This is <em>density</em>, ' +
			'not probability: for a continuous variable <code>P(X=x)</code> is ' +
			'exactly 0, and the height can exceed 1 when σ is small. Only ' +
			'<em>area</em> is probability.</li>' +
			'<li><strong>CDF — the area.</strong> The bell has no closed-form ' +
			'integral, but the standard library ships the error function: ' +
			'<code>Φ(x) = 0.5·(1 + erf((x−μ)/(σ√2)))</code> with ' +
			'<code>math.Erf</code>. Φ(x) is the probability of landing at or ' +
			'below x — the shaded area in the diagram.</li>' +
			'<li><strong>Quantile — the area run backwards.</strong> “Which x ' +
			'has 97.5% of the area below it?” The CDF is strictly increasing, so ' +
			'its inverse exists but has no formula. You don’t need one: ' +
			'<strong>bisect</strong>. Everything interesting lives inside ' +
			'<code>[μ−10σ, μ+10σ]</code> (the area outside is ~10⁻²³), so halve ' +
			'that bracket against <code>NormalCDF</code> until it is 1e-10 wide. ' +
			'About 67 iterations, no cleverness, correct to more digits than you ' +
			'can print.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>Why is the bell <em>everywhere</em>? The Central Limit Theorem: ' +
			'sums and averages of many independent contributions tend toward a ' +
			'normal shape <em>no matter what shape the contributions have</em>. ' +
			'Height is thousands of small genetic and environmental nudges added ' +
			'up; measurement error is many tiny independent perturbations. The ' +
			'next problem makes you watch it happen.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>NormalPDF(x, mu, sigma)</code>, ' +
			'<code>NormalCDF(x, mu, sigma)</code> using <code>math.Erf</code>, and ' +
			'<code>NormalQuantile(p, mu, sigma)</code> by bisection on your own ' +
			'CDF over <code>[mu−10σ, mu+10σ]</code> to a bracket width of 1e-10.</p>',
			{ lang: 'txt', code: 'Φ(0)      = 0.5      half the area sits left of the mean\nΦ(1.96)   ≈ 0.975    hence “±1.96σ covers 95%” — the z behind every CI\nquantile(0.975) = 1.96      the same fact, inverted\npeak height     = 1/(σ√(2π)) ≈ 0.3989/σ — a height, not a probability' },
			'<div class="tip">The 10σ bracket is not superstition: Φ(−10) ≈ ' +
			'7.6·10⁻²⁴, so the quantile of any p you would actually ask for lies ' +
			'safely inside. Bisection needs nothing but a monotone function — ' +
			'which the CDF is, everywhere, for every μ and σ.</div>',
		],

		starter: [
			'package main',
			'',
			'import "math"',
			'',
			'// NormalPDF returns the DENSITY of the normal distribution with mean',
			'// mu and standard deviation sigma at x:',
			'//',
			'//   exp(-(x-mu)^2 / (2*sigma^2)) / (sigma * sqrt(2*pi))',
			'//',
			'// A height, not a probability: P(X=x) is 0 for a continuous variable,',
			'// and this value exceeds 1 whenever sigma < 1/sqrt(2*pi).',
			'func NormalPDF(x, mu, sigma float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// NormalCDF returns P(X <= x) — the area under the PDF to the left',
			'// of x — via the standard-library error function:',
			'//',
			'//   0.5 * (1 + math.Erf((x-mu) / (sigma*math.Sqrt2)))',
			'func NormalCDF(x, mu, sigma float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// NormalQuantile inverts the CDF by BISECTION: for p in (0,1) it',
			'// returns the x with NormalCDF(x, mu, sigma) = p.',
			'//',
			'//   - bracket [lo, hi] = [mu - 10*sigma, mu + 10*sigma]',
			'//   - repeat: mid = (lo+hi)/2; if NormalCDF(mid, mu, sigma) < p the',
			'//     answer lies right of mid (lo = mid), else left (hi = mid)',
			'//   - stop when hi-lo <= 1e-10; return the bracket midpoint',
			'//',
			'// No rational approximations — the CDF is strictly increasing, so',
			'// halving the bracket is all the math required.',
			'func NormalQuantile(p, mu, sigma float64) float64 {',
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
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	cases := []tc{',
			'		{"Φ(0) on the standard normal — symmetry puts exactly half the area left of the mean",',
			'			"0.5000",',
			'			func() string { return f4(NormalCDF(0, 0, 1)) }},',
			'		{"Φ(1.96) — the fact behind every \\"95%\\": ±1.96σ brackets 95% of the area",',
			'			"0.9750",',
			'			func() string { return f4(NormalCDF(1.96, 0, 1)) }},',
			'		{"PDF peak of the standard normal = 1/√(2π) — a height, not a probability",',
			'			"0.3989",',
			'			func() string { return f4(NormalPDF(0, 0, 1)) }},',
			'		{"PDF peak at σ=15 (IQ scale) = 1/(15√(2π)) — widening the curve lowers it, the area stays 1",',
			'			"0.0266",',
			'			func() string { return f4(NormalPDF(100, 100, 15)) }},',
			'		{"quantile(0.975) — bisection inverts the CDF and recovers 1.96, the round-trip of case 2",',
			'			"1.9600",',
			'			func() string { return f4(NormalQuantile(0.975, 0, 1)) }},',
			'		{"non-standard: Φ(130; μ=100, σ=15) = Φ(2) — being 2σ out is the same area on every scale",',
			'			"0.9772",',
			'			func() string { return f4(NormalCDF(130, 100, 15)) }},',
			'		{"non-standard quantile: the 90th percentile of IQ (μ=100, σ=15) = 100 + 15·z₀.₉₀",',
			'			"119.2233",',
			'			func() string { return f4(NormalQuantile(0.9, 100, 15)) }},',
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
			'// NormalPDF is the density: the bell\'s height at x. Standardizing to',
			'// z = (x-mu)/sigma first keeps the exponent numerically tame and makes',
			'// the σ-scaling visible: the shape is exp(-z²/2), and the 1/(σ√2π)',
			'// factor rescales the height so the total area is exactly 1 for ANY',
			'// σ — which is why wide curves are low and narrow curves are tall (a',
			'// density can exceed 1; only areas are probabilities).',
			'func NormalPDF(x, mu, sigma float64) float64 {',
			'	z := (x - mu) / sigma',
			'	return math.Exp(-z*z/2) / (sigma * math.Sqrt(2*math.Pi))',
			'}',
			'',
			'// NormalCDF leans on math.Erf, the one special function the stdlib',
			'// ships for exactly this purpose. erf integrates exp(-t²) while the',
			'// bell integrates exp(-z²/2), so the change of variable costs a √2',
			'// in the argument — forget it and Φ(1) comes out 0.9214 instead of',
			'// 0.8413, a classic off-by-√2 that still passes the Φ(0)=0.5 smoke',
			'// test (the bug is invisible at the point of symmetry).',
			'func NormalCDF(x, mu, sigma float64) float64 {',
			'	return 0.5 * (1 + math.Erf((x-mu)/(sigma*math.Sqrt2)))',
			'}',
			'',
			'// NormalQuantile inverts the CDF by bisection rather than a rational',
			'// approximation (Acklam, AS241). The trade: ~67 CDF evaluations',
			'// instead of ~5 flops. In exchange the code is obviously correct —',
			'// bisection needs nothing but monotonicity, which the CDF has',
			'// everywhere — and it inherits erf\'s full precision instead of an',
			'// approximation\'s error floor.',
			'func NormalQuantile(p, mu, sigma float64) float64 {',
			'	// ±10σ brackets everything: Φ(-10) ≈ 7.6e-24, so any quantile a',
			'	// caller can meaningfully ask for lies strictly inside.',
			'	lo, hi := mu-10*sigma, mu+10*sigma',
			'	// Invariant: CDF(lo) < p <= CDF(hi). Each halving preserves it,',
			'	// and the bracket shrinks by half per step: 20σ · 2⁻ⁿ <= 1e-10',
			'	// takes n ≈ 67 steps at σ=1 — constant-time in practice.',
			'	for hi-lo > 1e-10 {',
			'		mid := (lo + hi) / 2',
			'		if NormalCDF(mid, mu, sigma) < p {',
			'			lo = mid // area at mid still short of p: answer is right of mid',
			'		} else {',
			'			hi = mid // area at mid already >= p: answer is at or left of mid',
			'		}',
			'	}',
			'	// Midpoint of the final bracket halves the worst-case error one',
			'	// last time.',
			'	return (lo + hi) / 2',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Density is not probability</h3>' +
			'<p>The most persistent confusion in continuous probability is ' +
			'reading the PDF as “the probability of x”. It cannot be: there are ' +
			'uncountably many x, so each individual one has probability 0, and ' +
			'the density for σ=0.1 peaks at ≈3.99 — no probability is 3.99. The ' +
			'PDF only means something under an integral: ' +
			'<code>P(a ≤ X ≤ b) = Φ(b) − Φ(a)</code>. This is also why the ' +
			'quantile inverts the <em>CDF</em> and not the PDF — the PDF isn’t ' +
			'even injective (every height below the peak occurs twice, once per ' +
			'side of the bell).</p>' +
			'<h3>Where the bell comes from — and where it doesn’t apply</h3>' +
			'<p>The bell is not a law of nature; it is the fingerprint of ' +
			'<em>addition</em>. The CLT says sums of many small independent ' +
			'effects converge to normal regardless of the effects’ own shapes — ' +
			'heights (many genes), measurement error (many tiny perturbations), ' +
			'daily returns aggregated monthly. It fails exactly where that story ' +
			'fails: quantities built by <em>multiplication</em> go log-normal ' +
			'(file sizes, incomes), and heavy-tailed processes like latency ' +
			'never lose their tail. That is why “p99 = mean + 2.33σ” on a ' +
			'latency dashboard understates the real p99, sometimes wildly. If ' +
			'you need percentiles of skewed data, sort the data.</p>' +
			'<h3>Bisection vs. the fancy inverses</h3>' +
			'<p>Production libraries (R’s <code>qnorm</code>, SciPy’s ' +
			'<code>ndtri</code>) use rational approximations like Wichura’s ' +
			'AS241 — a handful of polynomial coefficients, ~16 digits, constant ' +
			'time. Bisection is what you reach for when no such approximation ' +
			'exists: it inverts <em>any</em> monotone function you can evaluate, ' +
			'at one bit of answer per step. The pattern — bracket, halve, test ' +
			'an invariant — is the same one behind binary search and ' +
			'<code>sort.Search</code>; the normal quantile is just a place where ' +
			'you can check it against a printed table. One production note: ' +
			'Newton’s method converges faster here (the derivative is the PDF ' +
			'you already wrote) but overshoots in the tails where the CDF is ' +
			'nearly flat; bisection never overshoots, which is why it makes the ' +
			'better reference implementation.</p>',
		],
		complexity: { time: 'O(1) for PDF/CDF; the quantile runs ~log₂(20σ/1e-10) ≈ 67 bisection steps — constant in practice', space: 'O(1)' },
	});
})();
