/* Z-Scores & the Empirical Rule — Describing Data (Easy). Standardization
 * puts every scale on one ruler — "how many standard deviations from the
 * mean" — and the 68/95/99.7 rule turns that ruler into probability for
 * roughly normal data. The harness pins the SAT-vs-IQ comparison, exact
 * z-score values, the mean-0/sd-1 property of a standardized slice (and
 * that the input is not mutated), and WithinKSigma fractions on a fixed
 * dataset.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// The normal curve with its 1/2/3-sigma bands: 68% of the data within
	// one sd of the mean, 95% within two, 99.7% within three. Marker id
	// namespaced (dgArrowSTZS) because every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="a normal curve with bands at plus and minus one, two, and three standard deviations holding 68, 95, and 99.7 percent of the data">' +
		'<text x="20" y="22" class="lbl">the empirical rule: for roughly normal data, σ-bands hold fixed fractions</text>' +
		// the bell curve (schematic): peak at x=260, sigma ~ 55px
		'<path d="M 95 140 C 150 138 205 45 260 45 C 315 45 370 138 425 140" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<line x1="60" y1="140" x2="460" y2="140" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>' +
		// sigma ticks along the axis
		'<line x1="260" y1="45" x2="260" y2="140" stroke="var(--accent)" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>' +
		'<line x1="205" y1="82" x2="205" y2="140" stroke="var(--accent)" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>' +
		'<line x1="315" y1="82" x2="315" y2="140" stroke="var(--accent)" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>' +
		'<line x1="150" y1="127" x2="150" y2="140" stroke="var(--accent)" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>' +
		'<line x1="370" y1="127" x2="370" y2="140" stroke="var(--accent)" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>' +
		'<text x="260" y="155" text-anchor="middle" class="lbl">μ</text>' +
		'<text x="205" y="155" text-anchor="middle" class="lbl">−1σ</text>' +
		'<text x="315" y="155" text-anchor="middle" class="lbl">+1σ</text>' +
		'<text x="150" y="155" text-anchor="middle" class="lbl">−2σ</text>' +
		'<text x="370" y="155" text-anchor="middle" class="lbl">+2σ</text>' +
		'<text x="95" y="155" text-anchor="middle" class="lbl">−3σ</text>' +
		'<text x="425" y="155" text-anchor="middle" class="lbl">+3σ</text>' +
		// band spans with their fractions
		'<path d="M 208 170 L 312 170" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-start="url(#dgArrowSTZS)" marker-end="url(#dgArrowSTZS)"/>' +
		'<text x="260" y="184" text-anchor="middle" class="lbl">68%</text>' +
		'<path d="M 153 170 L 200 170" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-start="url(#dgArrowSTZS)"/>' +
		'<path d="M 320 170 L 367 170" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSTZS)"/>' +
		'<text x="150" y="184" text-anchor="middle" class="lbl" style="fill:var(--warn)">95% within ±2σ</text>' +
		'<text x="380" y="184" text-anchor="middle" class="lbl" style="fill:var(--warn)">99.7% within ±3σ</text>' +
		'<text x="20" y="204" class="lbl">z = (x − μ) / σ  — beyond |z| = 3, a value is either precious or broken</text>' +
		'<defs><marker id="dgArrowSTZS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'zscores-empirical-rule',
		title: 'Z-Scores & the Empirical Rule',
		nav: 'z-scores',
		difficulty: 'Easy',
		category: 'Describing Data',
		task: 'Implement ZScore, Standardize (z-score a slice with its own mean and population sd, without mutating it), and WithinKSigma (the fraction of values within k sds of the mean).',

		prose: [
			'<h2>Z-Scores &amp; the Empirical Rule</h2>' +
			'<p>Which is more impressive: an IQ of 130, or an SAT score of 720? ' +
			'The raw numbers are incomparable — different tests, different ' +
			'scales, different populations. But both tests publish their mean ' +
			'and standard deviation (IQ: 100 ± 15; SAT: 500 ± 100), and that is ' +
			'enough to put both on one ruler: distance from the mean, ' +
			'<em>measured in standard deviations</em>. IQ 130 is ' +
			'<code>(130−100)/15 = 2.0</code> sds up; SAT 720 is ' +
			'<code>(720−500)/100 = 2.2</code> sds up. The SAT score is the rarer ' +
			'feat. That ruler is the z-score:</p>' +
			'<ul>' +
			'<li><strong>ZScore</strong> — <code>z = (x − mean) / sd</code>. ' +
			'Negative means below the mean, positive above; the magnitude is ' +
			'“how many sds away”. Unit-free, so z-scores from different scales ' +
			'compare directly.</li>' +
			'<li><strong>Standardize</strong> — z-score every element of a slice ' +
			'using the slice’s <em>own</em> mean and <em>population</em> sd ' +
			'(divide by n — you have the whole slice, so no Bessel correction). ' +
			'The result always has mean 0 and sd 1: the original units are gone. ' +
			'This is the “normalization” step before k-means, PCA, ridge ' +
			'regression, neural nets — any algorithm that would otherwise let ' +
			'the feature with the biggest units dominate.</li>' +
			'<li><strong>The empirical rule.</strong> For roughly bell-shaped ' +
			'data, the z-ruler converts to probability: about <strong>68%</strong> ' +
			'of values fall within 1 sd of the mean, <strong>95%</strong> within ' +
			'2, <strong>99.7%</strong> within 3. It’s why “a 3-sigma event” means ' +
			'<em>rare</em> (≈1 in 370) and why monitoring alerts often fire at ' +
			'3σ. <code>WithinKSigma</code> measures the actual fraction for your ' +
			'data — comparing it against 68/95/99.7 is a quick normality ' +
			'sniff-test.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>ZScore</code>, <code>Standardize</code> (return a ' +
			'<em>new</em> slice — the harness checks the input is not mutated), ' +
			'and <code>WithinKSigma</code>, which returns the <em>fraction</em> ' +
			'(0..1) of values <code>x</code> with <code>|x − mean| ≤ k·sd</code> ' +
			'— inclusive, so a value sitting exactly on the band edge counts. ' +
			'Slices are non-empty with nonzero spread (the harness never passes ' +
			'empty or constant data).</p>',
			{ lang: 'txt', code: 'xs = {2, 4, 4, 4, 5, 5, 7, 9}   mean = 5   population sd = 2\nStandardize -> {-1.5, -0.5, -0.5, -0.5, 0, 0, 1, 2}   (mean 0, sd 1)\nWithinKSigma(xs, 1) -> 6/8 = 0.75    (values in [3, 7])\nWithinKSigma(xs, 2) -> 8/8 = 1.00    (9 sits EXACTLY at +2σ: inclusive)' },
			'<div class="tip">Population sd, not sample sd, is the right ' +
			'denominator here: Standardize describes <em>this</em> slice, it ' +
			'isn’t estimating some larger population’s spread. Using the sample ' +
			'sd is the subtle bug that leaves your “standardized” data with sd ' +
			'0.98-something instead of exactly 1.</div>',
		],

		starter: [
			'package main',
			'',
			'// ZScore returns (x - mean) / sd: how many standard deviations x',
			'// sits from the mean. sd is always > 0 in the harness.',
			'func ZScore(x, mean, sd float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Standardize returns a NEW slice where each element is the z-score',
			'// of the corresponding input element, computed with the slice\'s OWN',
			'// mean and POPULATION standard deviation (variance divided by n,',
			'// not n-1). The input slice must not be modified. The result has',
			'// mean 0 and population sd 1. xs is non-empty with nonzero spread.',
			'func Standardize(xs []float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// WithinKSigma returns the FRACTION (0..1) of values x in xs with',
			'// |x - mean| <= k*sd, where mean and sd are the slice\'s own mean',
			'// and population standard deviation. The comparison is inclusive:',
			'// a value exactly k sds away counts as within. For roughly normal',
			'// data the answers approach 0.68, 0.95, 0.997 at k = 1, 2, 3.',
			'func WithinKSigma(xs []float64, k float64) float64 {',
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
			'	"math"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// Mean 5, population sd exactly 2 — every z-score below is an',
			'	// exact binary fraction, so string comparison is safe.',
			'	data := []float64{2, 4, 4, 4, 5, 5, 7, 9}',
			'',
			'	// Harness-local checkers (closures, so they can\'t collide with',
			'	// user-defined helpers): recompute mean and population sd of',
			'	// whatever Standardize returns.',
			'	hMean := func(v []float64) float64 {',
			'		sum := 0.0',
			'		for _, x := range v {',
			'			sum += x',
			'		}',
			'		return sum / float64(len(v))',
			'	}',
			'	hPopSD := func(v []float64) float64 {',
			'		m := hMean(v)',
			'		ss := 0.0',
			'		for _, x := range v {',
			'			d := x - m',
			'			ss += d * d',
			'		}',
			'		return math.Sqrt(ss / float64(len(v)))',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	cases := []tc{',
			'		{"SAT 720 (500±100) vs IQ 130 (100±15): one ruler settles it — the SAT score is rarer",',
			'			"SAT 2.2000 vs IQ 2.0000",',
			'			func() string {',
			'				return fmt.Sprintf("SAT %.4f vs IQ %.4f", ZScore(720, 500, 100), ZScore(130, 100, 15))',
			'			}},',
			'		{"below the mean: ZScore(60, 70, 10) — the sign carries direction",',
			'			"-1.0000",',
			'			func() string { return f4(ZScore(60, 70, 10)) }},',
			'		{"Standardize {2,4,4,4,5,5,7,9} (mean 5, pop sd 2): each value becomes its z-score",',
			'			"[-1.5 -0.5 -0.5 -0.5 0 0 1 2]",',
			'			func() string { return fmt.Sprint(Standardize(data)) }},',
			'		{"the defining property: a standardized slice has mean 0 and population sd 1",',
			'			"0.0000 1.0000",',
			'			func() string {',
			'				zs := Standardize(data)',
			'				return f4(hMean(zs)) + " " + f4(hPopSD(zs))',
			'			}},',
			'		{"Standardize must return a NEW slice: the input keeps its original values",',
			'			"[2 4 4 4 5 5 7 9]",',
			'			func() string {',
			'				Standardize(data)',
			'				return fmt.Sprint(data)',
			'			}},',
			'		{"WithinKSigma k=1: values in [3,7] — 6 of 8",',
			'			"0.7500",',
			'			func() string { return f4(WithinKSigma(data, 1)) }},',
			'		{"WithinKSigma k=0.5: band [4,6], boundary values 4 count (inclusive) — 5 of 8",',
			'			"0.6250",',
			'			func() string { return f4(WithinKSigma(data, 0.5)) }},',
			'		{"WithinKSigma k=2: 9 sits EXACTLY at +2 sigma and must count — 8 of 8",',
			'			"1.0000",',
			'			func() string { return f4(WithinKSigma(data, 2)) }},',
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
			'// meanOf is redeclared here because the solution replaces the',
			'// starter wholesale — it must be self-contained.',
			'func meanOf(xs []float64) float64 {',
			'	sum := 0.0',
			'	for _, x := range xs {',
			'		sum += x',
			'	}',
			'	return sum / float64(len(xs))',
			'}',
			'',
			'// popSDOf is the POPULATION standard deviation: divide by n, not',
			'// n-1. Standardize describes this exact slice rather than',
			'// estimating a larger population\'s spread, so no Bessel correction',
			'// is owed — and only /n makes the standardized sd come out as',
			'// exactly 1.',
			'func popSDOf(xs []float64) float64 {',
			'	m := meanOf(xs)',
			'	ss := 0.0',
			'	for _, x := range xs {',
			'		d := x - m',
			'		ss += d * d',
			'	}',
			'	return math.Sqrt(ss / float64(len(xs)))',
			'}',
			'',
			'// ZScore is the whole idea in one line: recenter (subtract the',
			'// mean), then rescale (divide by the sd). What remains is a pure,',
			'// unit-free count of standard deviations.',
			'func ZScore(x, mean, sd float64) float64 {',
			'	return (x - mean) / sd',
			'}',
			'',
			'// Standardize computes the slice\'s own center and spread ONCE, then',
			'// maps every element through the same affine transform. Computing',
			'// them per-element would be quadratic; recomputing them from a',
			'// partially-written output would be nonsense — both are real bugs',
			'// this shape rules out.',
			'func Standardize(xs []float64) []float64 {',
			'	m := meanOf(xs)',
			'	sd := popSDOf(xs)',
			'	// A fresh slice, never an in-place rewrite: callers reasonably',
			'	// expect their raw data to survive a descriptive transform.',
			'	zs := make([]float64, len(xs))',
			'	for i, x := range xs {',
			'		zs[i] = (x - m) / sd',
			'	}',
			'	return zs',
			'}',
			'',
			'// WithinKSigma counts values inside the band [m-k*sd, m+k*sd].',
			'// |x-m| <= k*sd is the inclusive form of that band in one',
			'// comparison — inclusive per the contract, so a value landing',
			'// exactly on the edge (like 9 at +2 sigma in the harness data)',
			'// counts as within.',
			'func WithinKSigma(xs []float64, k float64) float64 {',
			'	m := meanOf(xs)',
			'	sd := popSDOf(xs)',
			'	count := 0',
			'	for _, x := range xs {',
			'		if math.Abs(x-m) <= k*sd {',
			'			count++',
			'		}',
			'	}',
			'	// A fraction, not a count: fractions compare directly against',
			'	// the 0.68 / 0.95 / 0.997 landmarks regardless of n.',
			'	return float64(count) / float64(len(xs))',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>One ruler for everything</h3>' +
			'<p>The z-score’s power is that it composes: once two quantities are ' +
			'both in “sds from their own mean”, they can be compared, averaged, ' +
			'and fed into the same model. That’s why standardization is the ' +
			'silent first step of so much machine learning — k-means distances, ' +
			'PCA components, and regularization penalties are all dominated by ' +
			'whichever raw feature has the largest units unless you standardize ' +
			'first (a salary column in dollars will simply erase an age column ' +
			'in years). It’s also the mechanism of grading “on a curve” and of ' +
			'combining scores across differently-calibrated judges, tests, and ' +
			'sensors.</p>' +
			'<h3>Where 68/95/99.7 comes from — and when to distrust it</h3>' +
			'<p>The fractions are areas under the standard normal curve: ' +
			'<code>P(|Z| ≤ k)</code> for k = 1, 2, 3. They are properties of ' +
			'<em>that curve</em>, not of data in general. Chebyshev’s inequality ' +
			'gives the distribution-free floor — at least <code>1 − 1/k²</code> ' +
			'within k sds, i.e. at least 75% within 2 (versus the normal’s 95%) ' +
			'— and heavy-tailed data lives in the gap. Finance learned this the ' +
			'hard way: daily returns produce “25-sigma events” that a normal ' +
			'model says should never occur in the universe’s lifetime, because ' +
			'returns aren’t normal. Comparing <code>WithinKSigma</code> against ' +
			'68/95/99.7 is a cheap first normality check before you lean on the ' +
			'rule.</p>' +
			'<h3>Field notes</h3>' +
			'<p>Three practical points. First, the population-vs-sample sd choice ' +
			'in <code>Standardize</code> isn’t academic: scikit-learn’s ' +
			'<code>StandardScaler</code> divides by n (population), R’s ' +
			'<code>scale()</code> by n−1 — another cross-tool “numbers don’t ' +
			'match” classic. Second, in ML pipelines the scaler must be ' +
			'<em>fitted on training data only</em> and reused on test data; ' +
			'standardizing the whole dataset first leaks test-set statistics ' +
			'into training. Third, z-scores against a <em>rolling</em> mean and ' +
			'sd are the classic anomaly detector on metrics dashboards — the ' +
			'“3-sigma alert” you just built the arithmetic for.</p>',
		],
		complexity: { time: 'O(n) — constant number of passes over the slice', space: 'O(n) — the standardized output slice' },
	});
})();
