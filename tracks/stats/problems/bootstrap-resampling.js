/* The Bootstrap — Modeling & Advanced (Hard). Confidence intervals for
 * statistics that have no closed-form standard error: treat the sample as
 * the population and simulate. A fixed LCG makes every draw deterministic,
 * so the harness pins the exact first resample, the first bootstrap
 * medians, and the R-7 percentile CI endpoints.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// The bootstrap pipeline: one observed sample fans out into resamples
	// (drawn WITH replacement — values repeat and go missing), each yields
	// a median, the medians pile into a distribution, and the middle 95%
	// of that pile is the interval. Marker id namespaced (dgArrowSTBS):
	// all tracks share one SVG id space.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 236" width="520" height="236" role="img" aria-label="one original sample fans out into three resamples drawn with replacement, some values doubled and some missing; each resample yields a median; the medians form a histogram with confidence interval brackets at the 2.5 and 97.5 percentiles">' +
		'<text x="20" y="22" class="lbl">resample with replacement, take the median of each, read off the middle 95%</text>' +
		// original sample box
		'<rect x="30" y="40" width="130" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="95" y="62" text-anchor="middle">3 5 2 8 6</text>' +
		'<text x="95" y="92" text-anchor="middle" class="lbl">observed sample</text>' +
		// arrows to three resamples
		'<path d="M 160 48 C 210 36 240 36 268 42" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSTBS)"/>' +
		'<path d="M 160 57 L 268 84" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSTBS)"/>' +
		'<path d="M 160 66 C 210 92 240 110 268 124" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSTBS)"/>' +
		// three resamples: doubles and gaps visible
		'<text x="278" y="50" class="lbl">5 5 2 8 3&#8201;&#8201;&#8594; median 5</text>' +
		'<text x="278" y="92" class="lbl">2 3 3 6 8&#8201;&#8201;&#8594; median 3</text>' +
		'<text x="278" y="132" class="lbl">8 6 5 6 2&#8201;&#8201;&#8594; median 6</text>' +
		'<text x="278" y="66" class="lbl" style="fill:var(--warn)">5 doubled, 6 missing</text>' +
		// histogram of medians
		'<rect x="70" y="188" width="26" height="22" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<rect x="96" y="164" width="26" height="46" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<rect x="122" y="150" width="26" height="60" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<rect x="148" y="170" width="26" height="40" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<rect x="174" y="194" width="26" height="16" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="135" y="230" text-anchor="middle" class="lbl">b medians</text>' +
		// CI brackets at the 2.5 / 97.5 percentiles
		'<line x1="84" y1="144" x2="84" y2="214" stroke="var(--warn)" stroke-width="2" stroke-dasharray="4,3"/>' +
		'<line x1="187" y1="144" x2="187" y2="214" stroke="var(--warn)" stroke-width="2" stroke-dasharray="4,3"/>' +
		'<text x="212" y="170" class="lbl" style="fill:var(--warn)">2.5th and 97.5th percentiles</text>' +
		'<text x="212" y="188" class="lbl" style="fill:var(--warn)">of the medians = the 95% CI</text>' +
		'<defs><marker id="dgArrowSTBS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'bootstrap-resampling',
		title: 'The Bootstrap',
		nav: 'bootstrap',
		difficulty: 'Hard',
		category: 'Modeling & Advanced',
		task: 'Implement Resample (draws with replacement from a seeded LCG), BootstrapMedians, and the R-7 percentile confidence interval.',

		prose: [
			'<h2>The Bootstrap</h2>' +
			'<p>You need a confidence interval for the <strong>median</strong> ' +
			'latency of a service. For the <em>mean</em> you have machinery: ' +
			'standard error σ/√n, t-multiplier, done. For the median there is no ' +
			'σ/√n — no tidy formula at all for most statistics you actually care ' +
			'about (medians, p99s, ratios, correlations of weird things). Efron’s ' +
			'1979 bootstrap is the move that sidesteps the missing formula: ' +
			'<em>treat the sample as the population and simulate</em>. If the ' +
			'sample is a decent stand-in for the population, then drawing from ' +
			'the sample mimics drawing from the population — and the scatter of ' +
			'the statistic across simulated draws mimics its real sampling ' +
			'distribution.</p>' +
			'<ul>' +
			'<li><strong>Resample WITH replacement.</strong> This is the whole ' +
			'trick. Each resample has the same size n as the original, but ' +
			'values repeat and go missing — each original point has probability ' +
			'<code>1 − (1−1/n)ⁿ ≈ 1 − 1/e ≈ 63.2%</code> of appearing at least ' +
			'once. Sampling <em>without</em> replacement would just reproduce ' +
			'the original sample, and the variation you are trying to measure ' +
			'would vanish.</li>' +
			'<li><strong>Deterministic randomness.</strong> Real bootstrap code ' +
			'seeds its RNG for reproducibility; here the RNG is a fixed LCG ' +
			'given in the starter, so the harness can pin exact draws. Index ' +
			'selection is <code>int(nextRand(seed) * float64(n))</code>.</li>' +
			'<li><strong>Collect the statistic.</strong> b resamples, the ' +
			'median of each — b replicate medians approximating the median’s ' +
			'sampling distribution.</li>' +
			'<li><strong>Percentile CI.</strong> Sort the replicates and read ' +
			'off the 2.5th and 97.5th percentiles (R-7 interpolation: ' +
			'<code>h = p/100·(n−1)</code>, interpolate between the neighboring ' +
			'order statistics). The middle 95% of the simulated world is the ' +
			'interval.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Resample</code>, <code>BootstrapMedians</code>, ' +
			'and <code>PercentileCI</code>. The LCG is provided in the starter — ' +
			'use it exactly as given, or none of your draws will match the ' +
			'pinned expectations.</p>',
			{ lang: 'txt', code: 'seed' + String.fromCharCode(39) + ' = seed*1664525 + 1013904223 (mod 2^32)      // the LCG step\nu     = float64(seed' + String.fromCharCode(39) + ' >> 8) / 2^24               // uniform in [0, 1)\nindex = int(u * n)                              // one draw\n\nR-7 percentile on sorted s (n values):\nh = p/100 * (n-1);  lo = floor(h)\nresult = s[lo] + (h - lo) * (s[lo+1] - s[lo])' },
			'<div class="tip">The percentile interval is the <em>simplest</em> ' +
			'bootstrap CI, not the best: it assumes the bootstrap distribution ' +
			'is centered and symmetric around the estimate. Skewed statistics ' +
			'call for the bias-corrected BCa interval — same replicates, ' +
			'smarter endpoints.</div>',
		],

		starter: [
			'package main',
			'',
			'// The bootstrap: simulate the sampling distribution of a statistic',
			'// by redrawing from the observed sample itself. All randomness',
			'// flows through nextRand below — a fixed LCG, so every draw is',
			'// reproducible and the harness can pin exact values.',
			'',
			'// nextRand advances a 32-bit LCG and returns a uniform value in',
			'// [0, 1). Provided — use as-is; do not modify the constants.',
			'func nextRand(seed *uint32) float64 { *seed = *seed*1664525 + 1013904223; return float64(*seed>>8) / float64(1<<24) }',
			'',
			'// Resample draws len(xs) values from xs WITH replacement: for each',
			'// slot, index := int(nextRand(seed)*float64(n)). The same seed',
			'// pointer threads through all draws, advancing the stream.',
			'func Resample(xs []float64, seed *uint32) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// BootstrapMedians runs b resamples starting from the given seed',
			'// value and returns the median of each. Median: sort a COPY (never',
			'// the caller\'s slice), take the middle element, or the average of',
			'// the middle two when the length is even.',
			'func BootstrapMedians(xs []float64, b int, seed uint32) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// PercentileCI returns the (lo-th, hi-th) percentiles of stats',
			'// (lo and hi given in percent, e.g. 2.5 and 97.5), using R-7',
			'// interpolation on a sorted copy: h := p/100*(n-1); the result',
			'// interpolates linearly between the floor(h) and ceil(h) order',
			'// statistics. Returns the low endpoint first, then the high.',
			'func PercentileCI(stats []float64, lo, hi float64) (float64, float64) {',
			'	// your code here',
			'	return 0, 0',
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
			'	// Latency-style sample: 8 values, no closed-form CI for its',
			'	// median. Every pinned value below was generated by running the',
			'	// specified algorithm with the specified LCG — nothing hand-waved.',
			'	lat := []float64{3.1, 4.8, 2.2, 5.9, 4.1, 3.7, 6.3, 2.9}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	fmtSlice := func(vs []float64) string {',
			'		parts := make([]string, len(vs))',
			'		for i, v := range vs {',
			'			parts[i] = fmt.Sprintf("%.1f", v)',
			'		}',
			'		return "[" + strings.Join(parts, " ") + "]"',
			'	}',
			'	cases := []tc{',
			'		{"exact first resample, seed 42: WITH replacement — 3.1 drawn three times, 3.7/6.3/2.9 never",',
			'			"[2.2 3.1 4.1 4.8 5.9 3.1 5.9 3.1]",',
			'			func() string {',
			'				s := uint32(42)',
			'				return fmtSlice(Resample(lat, &s))',
			'			}},',
			'		{"first three of 200 bootstrap medians (seed 42): each is the median of one resample",',
			'			"3.6000 5.0000 3.5000",',
			'			func() string {',
			'				meds := BootstrapMedians(lat, 200, 42)',
			'				if len(meds) < 3 {',
			'					return fmt.Sprintf("only %d medians", len(meds))',
			'				}',
			'				return f4(meds[0]) + " " + f4(meds[1]) + " " + f4(meds[2])',
			'			}},',
			'		{"seeded determinism: rerunning with the same seed reproduces the medians exactly",',
			'			"true",',
			'			func() string {',
			'				a := BootstrapMedians(lat, 50, 7)',
			'				b := BootstrapMedians(lat, 50, 7)',
			'				if len(a) != 50 || len(b) != 50 {',
			'					return fmt.Sprintf("lengths %d and %d", len(a), len(b))',
			'				}',
			'				for i := range a {',
			'					if a[i] != b[i] {',
			'						return fmt.Sprintf("diverged at %d", i)',
			'					}',
			'				}',
			'				return "true"',
			'			}},',
			'		{"R-7 percentiles, hand-checkable: on 1..10, h=0.225 gives 1.225 and h=8.775 gives 9.775",',
			'			"(1.2250, 9.7750)",',
			'			func() string {',
			'				lo, hi := PercentileCI([]float64{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}, 2.5, 97.5)',
			'				return fmt.Sprintf("(%s, %s)", f4(lo), f4(hi))',
			'			}},',
			'		{"the payoff: 95% bootstrap CI for the median from 200 replicates (seed 42)",',
			'			"(2.8937, 5.3550)",',
			'			func() string {',
			'				meds := BootstrapMedians(lat, 200, 42)',
			'				if len(meds) == 0 {',
			'					return "no medians"',
			'				}',
			'				lo, hi := PercentileCI(meds, 2.5, 97.5)',
			'				return fmt.Sprintf("(%s, %s)", f4(lo), f4(hi))',
			'			}},',
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
			'import (',
			'	"math"',
			'	"sort"',
			')',
			'',
			'// nextRand advances a 32-bit LCG (Numerical Recipes constants) and',
			'// returns a uniform value in [0, 1). Dropping the LOW 8 bits before',
			'// scaling matters: an LCG\'s low-order bits cycle with tiny periods',
			'// (bit 0 just alternates), so the high 24 bits are the usable ones.',
			'func nextRand(seed *uint32) float64 { *seed = *seed*1664525 + 1013904223; return float64(*seed>>8) / float64(1<<24) }',
			'',
			'// Resample draws n values from xs with replacement. Because',
			'// nextRand is strictly below 1.0, int(u*n) lands in [0, n-1] with',
			'// no clamping needed. The seed pointer is shared state on purpose:',
			'// consecutive resamples must continue the stream, not restart it.',
			'func Resample(xs []float64, seed *uint32) []float64 {',
			'	n := len(xs)',
			'	out := make([]float64, n)',
			'	for i := 0; i < n; i++ {',
			'		out[i] = xs[int(nextRand(seed)*float64(n))]',
			'	}',
			'	return out',
			'}',
			'',
			'// median sorts a copy — the resample buffer is reused conceptually',
			'// by the caller, and sorting in place would also reorder draws in a',
			'// way that is invisible here but a landmine for anyone extending',
			'// the code. Even length averages the two middle order statistics.',
			'func median(xs []float64) float64 {',
			'	cp := append([]float64(nil), xs...)',
			'	sort.Float64s(cp)',
			'	n := len(cp)',
			'	if n%2 == 1 {',
			'		return cp[n/2]',
			'	}',
			'	return (cp[n/2-1] + cp[n/2]) / 2.0',
			'}',
			'',
			'// BootstrapMedians is the bootstrap loop: b resamples, one median',
			'// each. The seed arrives by VALUE — the function owns its local',
			'// copy, which makes the whole run a pure function of (xs, b, seed):',
			'// same inputs, same medians, every time. That determinism is what',
			'// the harness pins and what real experiments log seeds for.',
			'func BootstrapMedians(xs []float64, b int, seed uint32) []float64 {',
			'	s := seed',
			'	out := make([]float64, b)',
			'	for i := 0; i < b; i++ {',
			'		out[i] = median(Resample(xs, &s))',
			'	}',
			'	return out',
			'}',
			'',
			'// percentileAt reads the p-th percentile from an already-sorted',
			'// slice using R-7 interpolation (the default in R, NumPy, and',
			'// Excel): the percentile position h = p/100*(n-1) generally falls',
			'// between two order statistics, and we take the linear blend. When',
			'// h is exactly integral, floor == ceil and the blend degenerates',
			'// to the order statistic itself.',
			'func percentileAt(sorted []float64, p float64) float64 {',
			'	h := p / 100.0 * float64(len(sorted)-1)',
			'	f := math.Floor(h)',
			'	c := math.Ceil(h)',
			'	if f == c {',
			'		return sorted[int(h)]',
			'	}',
			'	return sorted[int(f)] + (h-f)*(sorted[int(c)]-sorted[int(f)])',
			'}',
			'',
			'// PercentileCI sorts one copy and reads both endpoints from it —',
			'// sorting twice (once per endpoint) would be the quiet O(n log n)',
			'// duplication this factoring avoids. Endpoints return low first.',
			'func PercentileCI(stats []float64, lo, hi float64) (float64, float64) {',
			'	cp := append([]float64(nil), stats...)',
			'	sort.Float64s(cp)',
			'	return percentileAt(cp, lo), percentileAt(cp, hi)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why such a simple idea took until 1979</h3>' +
			'<p>The bootstrap is almost insultingly simple — “pretend the sample ' +
			'is the population” — and it was computationally unthinkable before ' +
			'cheap computing. Efron’s insight was that the <em>plug-in ' +
			'principle</em> (substitute the empirical distribution for the ' +
			'unknown true one) turns an intractable analytic problem into a ' +
			'loop. The empirical distribution is provably the best ' +
			'nonparametric estimate of the true distribution, so functionals of ' +
			'it — like “the spread of the median across samples of size n” — ' +
			'inherit good behavior. That is also the bootstrap’s honest limit: ' +
			'it can never know about population features the sample missed. ' +
			'With n = 8 latencies, the resampled world contains no value larger ' +
			'than 6.3, and the CI can never extend past data it has seen — one ' +
			'reason bootstrap intervals on tiny samples run narrow.</p>' +
			'<h3>Where it earns its keep in engineering</h3>' +
			'<p>The bootstrap is the standard answer whenever the statistic is ' +
			'awkward: p99 latency differences between builds (pair it with the ' +
			'Mann-Whitney item — U answers “did it move?”, the bootstrap ' +
			'answers “by how much?”), conversion-rate ratios, model quality ' +
			'metrics like AUC. A/B testing platforms bootstrap entire metric ' +
			'pipelines rather than derive standard errors per metric. Two ' +
			'practical dials: b = 1000–10000 for stable interval endpoints ' +
			'(the 200 here keeps the harness fast — endpoint estimates are the ' +
			'noisiest part, sitting in the tails), and always log the seed, ' +
			'because a CI you cannot reproduce is a CI you cannot debug. One ' +
			'trap: resampling assumes exchangeable observations, so ' +
			'time-series and clustered data need block or hierarchical ' +
			'bootstraps — naively resampling autocorrelated latencies ' +
			'understates the variance.</p>' +
			'<h3>Beyond the percentile interval</h3>' +
			'<p>The percentile method you built is rated “simple, often good ' +
			'enough”: it uses the replicate distribution’s quantiles directly, ' +
			'which implicitly assumes that distribution is unbiased and ' +
			'symmetric around the point estimate. When the statistic is skewed ' +
			'(ratios, variances), the BCa interval — bias-corrected and ' +
			'accelerated, still just post-processing the same replicates — has ' +
			'markedly better coverage, and it is what R’s <code>boot.ci</code> ' +
			'and SciPy’s <code>bootstrap</code> default to or recommend. The ' +
			'~63.2% fact from the prose has a second life too: the ~36.8% of ' +
			'points a resample misses are “out-of-bag”, and random forests use ' +
			'exactly that leftover as a free validation set.</p>',
		],
		complexity: { time: 'O(b · n log n) — b resamples, each sorted for its median', space: 'O(b + n) for the replicates and the resample buffer' },
	});
})();
