/* Confidence Intervals — Sampling & Estimation (Medium). Turn a point
 * estimate into an honest range: mean ± crit·sd/√n, with the critical
 * value deciding the coverage (z=1.96 when σ is known / n is large,
 * t=2.262 at df=9 when the sd itself was estimated). The harness pins a
 * z- and a t-interval on the same data (t is wider), the margin-halving-
 * needs-4×n law, and NeededN's ceiling including an exact-boundary case.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// Twenty intervals from twenty samples: ~19 catch the fixed true μ,
	// ~1 misses. THAT is what "95%" quantifies — the procedure's hit rate,
	// not a probability about any single interval. Marker id namespaced
	// (dgArrowSTCI) because every track's SVGs share the page's id
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="twenty vertical confidence interval bars from twenty repeated samples crossing a horizontal true-mean line; one bar misses the line, labeled about one in twenty miss">' +
		'<text x="20" y="22" class="lbl">20 samples → 20 intervals; the true μ (dashed) never moved</text>' +
		// the fixed truth
		'<line x1="35" y1="100" x2="485" y2="100" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="6 4"/>' +
		'<text x="497" y="104" class="lbl">μ</text>' +
		// nineteen intervals that capture μ...
		'<line x1="45" y1="66" x2="45" y2="116" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="67" y1="72" x2="67" y2="118" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="89" y1="77" x2="89" y2="138" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="111" y1="57" x2="111" y2="115" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="133" y1="62" x2="133" y2="111" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="155" y1="85" x2="155" y2="134" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="177" y1="70" x2="177" y2="121" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="199" y1="72" x2="199" y2="129" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="221" y1="70" x2="221" y2="123" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="243" y1="80" x2="243" y2="132" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="265" y1="58" x2="265" y2="117" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="287" y1="87" x2="287" y2="132" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="309" y1="70" x2="309" y2="117" stroke="var(--accent)" stroke-width="2.5"/>' +
		// ...and the one that missed (its sample happened to run low)
		'<line x1="331" y1="46" x2="331" y2="88" stroke="var(--warn)" stroke-width="2.5"/>' +
		'<line x1="353" y1="64" x2="353" y2="127" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="375" y1="81" x2="375" y2="140" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="397" y1="93" x2="397" y2="138" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="419" y1="66" x2="419" y2="125" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="441" y1="60" x2="441" y2="108" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<line x1="463" y1="88" x2="463" y2="136" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<path d="M 300 38 C 312 30 322 32 329 42" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSTCI)"/>' +
		'<text x="296" y="36" text-anchor="end" class="lbl" style="fill:var(--warn)">~1 in 20 miss — by design</text>' +
		'<text x="20" y="190" class="lbl">“95% confident” describes the PROCEDURE’s hit rate, not any single interval</text>' +
		'<defs><marker id="dgArrowSTCI" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'confidence-intervals',
		title: 'Confidence Intervals',
		nav: 'confidence intervals',
		difficulty: 'Medium',
		category: 'Sampling & Estimation',
		task: 'Implement CI (mean ± crit·sd/√n), MarginOfError, and NeededN — the sample size that buys a target margin.',

		prose: [
			'<h2>Confidence Intervals</h2>' +
			'<p>Your A/B test comes back: the new checkout flow converts ' +
			'<strong>+2.3%</strong> better. Ship it? The number alone can’t say — ' +
			'+2.3% measured on 200 users is a coin flip; on 200,000 it’s a ' +
			'discovery. A point estimate without its uncertainty is half a ' +
			'measurement. The fix is to report a <em>range</em> built from the ' +
			'standard error you met in the last problem:</p>' +
			'<ul>' +
			'<li><strong>The interval:</strong> <code>mean ± crit·sd/√n</code>. ' +
			'The half-width <code>crit·sd/√n</code> is the <em>margin of ' +
			'error</em> — the “±3 points” in every poll headline.</li>' +
			'<li><strong>The critical value sets the coverage.</strong> ' +
			'<code>z = 1.96</code> comes straight from the normal curve ' +
			'(Φ(1.96)=0.975, so ±1.96 standard errors bracket 95%) and applies ' +
			'when σ is known or n is large. With a small sample you estimated ' +
			'sd from the same data — extra uncertainty the interval must pay ' +
			'for — so the critical value comes from Student’s t instead: ' +
			'<code>t = 2.262</code> at df=9. Same data, wider interval, honest ' +
			'coverage.</li>' +
			'<li><strong>Buying precision:</strong> to guarantee a margin ≤ m ' +
			'you need <code>crit·sd/√n ≤ m</code>, i.e. ' +
			'<code>n ≥ (crit·sd/m)²</code> — and since n is a whole number of ' +
			'measurements, round <em>up</em>: <code>ceil((crit·sd/m)²)</code>. ' +
			'The square is the sting: halving the margin quadruples the ' +
			'sample.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>Now the part everyone gets wrong. “95% confident” does ' +
			'<strong>not</strong> mean your interval has a 95% chance of ' +
			'containing μ. Once computed, the interval is fixed and μ is fixed — ' +
			'it either contains μ or it doesn’t; nothing is random anymore. The ' +
			'95% belongs to the <em>procedure</em>: build intervals this way ' +
			'forever, and 95% of them capture the truth. The diagram is the ' +
			'whole story — twenty intervals bouncing around one unmoving μ, one ' +
			'of them missing, exactly on schedule.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>CI(mean, sd, n, crit)</code> returning the two ' +
			'endpoints <code>(lo, hi)</code>, ' +
			'<code>MarginOfError(sd, n, crit)</code>, and ' +
			'<code>NeededN(sd, moe, crit)</code> — the smallest n whose margin ' +
			'is ≤ moe.</p>',
			{ lang: 'txt', code: 'mean=5.2  sd=1.1  n=10\n  z (1.96):  5.2 ± 1.96·1.1/√10  →  (4.5182, 5.8818)\n  t (2.262): 5.2 ± 2.262·1.1/√10 →  (4.4132, 5.9868)   wider: sd was estimated\nNeededN: n ≥ (crit·sd/moe)², rounded UP — measurements come in whole units' },
			'<div class="tip">Watch the boundary in <code>NeededN</code>: when ' +
			'<code>(crit·sd/moe)²</code> lands exactly on an integer, that n ' +
			'already achieves the margin — <code>ceil</code> of an exact 144.0 ' +
			'is 144, not 145. The rounding only bumps <em>fractional</em> ' +
			'results.</div>',
		],

		starter: [
			'package main',
			'',
			'import "math"',
			'',
			'// CI returns the two endpoints (lo, hi) of the confidence interval',
			'//',
			'//   mean ± crit * sd / sqrt(n)',
			'//',
			'// crit is the critical value that sets the coverage. The two',
			'// standard 95% choices:',
			'//',
			'//   z = 1.96   sigma known, or n large (normal curve: Φ(1.96)=0.975)',
			'//   t = 2.262  sd estimated from the sample, df = n-1 = 9',
			'func CI(mean, sd float64, n int, crit float64) (float64, float64) {',
			'	// your code here',
			'	return 0, 0',
			'}',
			'',
			'// MarginOfError returns the interval\'s half-width: crit * sd / sqrt(n).',
			'// This is the "±3 points" of poll headlines.',
			'func MarginOfError(sd float64, n int, crit float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// NeededN returns the SMALLEST sample size n whose margin of error',
			'// is <= moe: solve crit*sd/sqrt(n) <= moe for n and round up,',
			'//',
			'//   n = ceil( (crit*sd/moe)^2 )',
			'//',
			'// An exact-integer result stays as is (144.0 -> 144); only',
			'// fractional results round up (216.09 -> 217).',
			'func NeededN(sd, moe, crit float64) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// keep the import used while the stubs are empty',
			'var _ = math.Sqrt',
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
			'	fmtCI := func(lo, hi float64) string { return fmt.Sprintf("(%.4f, %.4f)", lo, hi) }',
			'	cases := []tc{',
			'		{"z-interval: mean 5.2, sd 1.1, n=10, crit 1.96 — the σ-known/large-n 95% interval",',
			'			"(4.5182, 5.8818)",',
			'			func() string { lo, hi := CI(5.2, 1.1, 10, 1.96); return fmtCI(lo, hi) }},',
			'		{"t-interval on the SAME data, crit 2.262 (df=9): estimating sd from the sample widens the interval — the honesty tax",',
			'			"(4.4132, 5.9868)",',
			'			func() string { lo, hi := CI(5.2, 1.1, 10, 2.262); return fmtCI(lo, hi) }},',
			'		{"MarginOfError(sd=8, n=25, z=1.96) — the ± of a poll-style report",',
			'			"3.1360",',
			'			func() string { return fmt.Sprintf("%.4f", MarginOfError(8, 25, 1.96)) }},',
			'		{"halving the margin costs 4× the sample: n=25 → n=100 with everything else fixed",',
			'			"3.1360 -> 1.5680",',
			'			func() string {',
			'				return fmt.Sprintf("%.4f -> %.4f", MarginOfError(8, 25, 1.96), MarginOfError(8, 100, 1.96))',
			'			}},',
			'		{"NeededN exact boundary: sd=12, moe=2, crit=2 → (2·12/2)² = 144.0 exactly — ceil must NOT bump it to 145",',
			'			"144",',
			'			func() string { return fmt.Sprintf("%d", NeededN(12, 2, 2)) }},',
			'		{"NeededN just over the boundary: sd=15, moe=2, crit=1.96 → 216.09 → 217 (n=216 would leave the margin a hair too wide)",',
			'			"217",',
			'			func() string { return fmt.Sprintf("%d", NeededN(15, 2, 1.96)) }},',
			'		{"NeededN(sd=10, moe=1, z=1.96) = 385 — the classic \\"n for ±1 unit at 95%\\"",',
			'			"385",',
			'			func() string { return fmt.Sprintf("%d", NeededN(10, 1, 1.96)) }},',
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
			'// CI builds the interval from its margin rather than repeating the',
			'// formula, so the arithmetic lives in exactly one place — the two',
			'// endpoints cannot drift apart under a future edit. Returned',
			'// positionally as (lo, hi); callers rely on that order.',
			'func CI(mean, sd float64, n int, crit float64) (float64, float64) {',
			'	m := MarginOfError(sd, n, crit)',
			'	return mean - m, mean + m',
			'}',
			'',
			'// MarginOfError is crit standard errors: crit · sd/√n. The two',
			'// factors carry different jobs — sd/√n measures how much sample',
			'// means wander (the CLT\'s σ/√n), while crit converts "standard',
			'// errors" into a chosen coverage (1.96 of them bracket 95% under',
			'// the normal curve; Student\'s t asks for a bit more when sd was',
			'// estimated from the same few observations).',
			'func MarginOfError(sd float64, n int, crit float64) float64 {',
			'	return crit * sd / math.Sqrt(float64(n))',
			'}',
			'',
			'// NeededN inverts the margin formula for n. From crit·sd/√n <= moe:',
			'//',
			'//   √n >= crit·sd/moe   →   n >= (crit·sd/moe)²',
			'//',
			'// math.Ceil (not truncation, not Round) implements "smallest n at',
			'// least that large": truncating 216.09 to 216 would return a sample',
			'// size whose margin is still wider than requested — the one',
			'// direction a sizing function must never err. When the square lands',
			'// exactly on an integer (144.0), Ceil leaves it alone: that n',
			'// already meets the target with equality.',
			'func NeededN(sd, moe, crit float64) int {',
			'	k := crit * sd / moe',
			'	return int(math.Ceil(k * k))',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The interpretation that fails interviews</h3>' +
			'<p>“There is a 95% probability that μ lies in (4.52, 5.88)” sounds ' +
			'right and is wrong. In the frequentist framework μ is a constant — ' +
			'unknown, but not random — and once the interval is computed it is ' +
			'a pair of constants too. Constants don’t have probabilities of ' +
			'overlapping; the interval contains μ or it doesn’t, and you will ' +
			'never know which. What is random is the <em>sample</em>, and hence ' +
			'the interval-building <em>procedure</em>: run the experiment again ' +
			'and you get a different interval. 95% of such intervals cover μ. ' +
			'If you want to say “there’s a 95% probability the parameter is in ' +
			'this range”, that statement belongs to Bayesian credible ' +
			'intervals, which buy it by treating μ as random and paying with a ' +
			'prior — a trade this track’s final problem makes explicit.</p>' +
			'<h3>Why t exists at all</h3>' +
			'<p>The z-interval assumes you know σ. In practice you estimate sd ' +
			'from the same handful of observations you’re averaging — and a ' +
			'small sample’s sd estimate is itself noisy, sometimes flukishly ' +
			'small. Plugging a lucky-small sd into a z-interval yields an ' +
			'interval that claims 95% but covers less. William Gosset hit this ' +
			'at Guinness in 1908, quality-testing stout with n≈4 barley ' +
			'samples, and derived the correction; the brewery’s trade-secret ' +
			'policy pushed him to publish as “Student”. The t critical value ' +
			'inflates with shrinking df exactly enough to restore honest ' +
			'coverage: 2.262 at df=9, 2.776 at df=4, 12.71 at df=1, melting ' +
			'back to 1.96 as df grows (2.045 by df=29). By n≈30 the two are ' +
			'nearly indistinguishable — the origin of the folklore “30 is a ' +
			'large sample”.</p>' +
			'<h3>NeededN in the wild</h3>' +
			'<p>The ceil((crit·sd/moe)²) computation is the core of every ' +
			'sample-size calculator: clinical trial enrollment, poll sizing, ' +
			'and the “how long must this A/B test run?” question that opened ' +
			'the problem. The inputs deserve suspicion in exactly one place: ' +
			'sd must be guessed <em>before</em> collecting the data (from a ' +
			'pilot study or historical variance), and an optimistic guess ' +
			'silently under-powers the whole experiment. The square makes the ' +
			'economics brutal at the margins — a poll’s ±3% needs ~1,067 ' +
			'respondents, ±1% needs ~9,604 — which is why headline polls ' +
			'cluster near n=1,000 and why “we’ll just run the test a little ' +
			'longer for more precision” usually means 4× longer than anyone ' +
			'budgeted.</p>',
		],
		complexity: { time: 'O(1) — closed-form arithmetic for all three functions', space: 'O(1)' },
	});
})();
