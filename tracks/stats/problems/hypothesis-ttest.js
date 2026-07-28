/* The One-Sample t-Test — Hypothesis Testing (Medium). The t-statistic as
 * "how many standard errors is the sample mean from the hypothesized
 * mean", degrees of freedom, and the two-sided decision rule |t| > crit.
 * The harness pins a sample that just clears its critical value, a
 * one-reading tweak of it that fails the same threshold, and the same t
 * rejecting at df=29 but not at df=4 — the critical value moves with df.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// The two-sided rejection region: both tails beyond ±crit, each holding
	// α/2 of the area. Marker id namespaced (dgArrowSTHT) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="a t distribution curve with shaded rejection regions in both tails beyond minus and plus the critical value, each tail labeled alpha over two">' +
		'<text x="20" y="22" class="lbl">two-sided test: reject when t lands in EITHER shaded tail — |t| &gt; t crit</text>' +
		// shaded rejection tails (drawn first, curve overlays them)
		'<polygon points="30,148.3 40,147.6 50,146.7 60,145.4 70,143.7 80,141.6 90,139.0 90,150 30,150" fill="var(--warn)" opacity="0.35"/>' +
		'<polygon points="430,139.0 440,141.6 450,143.7 460,145.4 470,146.7 480,147.6 490,148.3 490,150 430,150" fill="var(--warn)" opacity="0.35"/>' +
		// the t curve (slightly fatter-tailed bell)
		'<polyline points="30,148.3 50,146.7 70,143.7 90,139.0 110,131.9 130,122.0 150,109.2 170,94.2 190,78.4 210,63.6 230,52.1 250,45.8 270,45.8 290,52.1 310,63.6 330,78.4 350,94.2 370,109.2 390,122.0 410,131.9 430,139.0 450,143.7 470,146.7 490,148.3" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<line x1="20" y1="150" x2="500" y2="150" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>' +
		// critical boundaries
		'<line x1="90" y1="60" x2="90" y2="150" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="4 3"/>' +
		'<line x1="430" y1="60" x2="430" y2="150" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="4 3"/>' +
		'<text x="90" y="168" text-anchor="middle" class="lbl">−t crit</text>' +
		'<text x="430" y="168" text-anchor="middle" class="lbl">+t crit</text>' +
		'<text x="260" y="168" text-anchor="middle" class="lbl">0 — H₀’s home ground</text>' +
		// tail labels with pointers
		'<path d="M 92 44 C 76 46 66 56 60 70" fill="none" stroke="var(--warn)" stroke-width="1.4" marker-end="url(#dgArrowSTHT)"/>' +
		'<text x="96" y="42" class="lbl" style="fill:var(--warn)">α/2</text>' +
		'<path d="M 428 44 C 444 46 454 56 460 70" fill="none" stroke="var(--warn)" stroke-width="1.4" marker-end="url(#dgArrowSTHT2)"/>' +
		'<text x="424" y="42" text-anchor="end" class="lbl" style="fill:var(--warn)">α/2</text>' +
		'<text x="20" y="192" class="lbl">α = P(landing in a tail when H₀ is TRUE) — the false-alarm rate you chose up front</text>' +
		'<defs>' +
		'<marker id="dgArrowSTHT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowSTHT2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'hypothesis-ttest',
		title: 'The One-Sample t-Test',
		nav: 'one-sample t-test',
		difficulty: 'Medium',
		category: 'Hypothesis Testing',
		task: 'Implement TStat ((x̄−μ0)/(s/√n)), DF (n−1), and the two-sided Decide rule |t| > crit.',

		prose: [
			'<h2>The One-Sample t-Test</h2>' +
			'<p>The deploy went out Tuesday, and by Friday the team is ' +
			'celebrating: mean p95 latency across the fleet looks better than ' +
			'the 250ms SLO. But every week’s numbers wobble — machines get noisy ' +
			'neighbors, caches run hot and cold. Would this week have looked ' +
			'just as good <em>without</em> the deploy? That question has a ' +
			'400-year-old shape: a skeptic proposes “nothing happened” and asks ' +
			'whether the data can embarrass that position. The skeptic’s stance ' +
			'is the <strong>null hypothesis</strong> H₀: μ = μ₀ (the true mean ' +
			'is still 250, the deploy did nothing; the wobble is luck). The test ' +
			'measures how far your sample sits from H₀’s prediction:</p>' +
			'<ul>' +
			'<li><strong>The t-statistic</strong> is a distance in ' +
			'<em>standard-error units</em>: <code>t = (x̄ − μ₀)/(s/√n)</code>, ' +
			'with s the <em>sample</em> standard deviation (divide by n−1). ' +
			'Read it aloud: “the sample mean is t standard errors from where H₀ ' +
			'says it should be.” t = 0.5 is nothing; t = 3 is hard to wave ' +
			'away.</li>' +
			'<li><strong>Degrees of freedom = n − 1.</strong> Computing s used ' +
			'the sample’s own mean, and the n deviations from x̄ must sum to ' +
			'zero — one of them is determined by the others. n numbers, n−1 ' +
			'free ones.</li>' +
			'<li><strong>The decision rule</strong> is two-sided: reject when ' +
			'<code>|t| &gt; crit</code> — the deploy could plausibly have made ' +
			'things better <em>or</em> worse, so both tails are rejection ' +
			'territory, each holding α/2. The critical value depends on df ' +
			'(two-sided, 95%): df 4 → 2.776, df 9 → 2.262, df 19 → 2.093, ' +
			'df 29 → 2.045. Fewer observations → fatter tails → a higher bar, ' +
			'because a small sample’s s is itself untrustworthy.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>α is the false-alarm budget: the probability of landing in a ' +
			'tail <em>when H₀ is actually true</em> — a Type I error. α = 0.05 ' +
			'means the skeptic gets wrongly convicted once per twenty true ' +
			'nulls. And note the asymmetry in the verdicts: “reject H₀” never ' +
			'proves the alternative, and “fail to reject” never proves H₀ — an ' +
			'underpowered test fails to reject almost everything (absence of ' +
			'evidence, not evidence of absence).</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>TStat(xs, mu0)</code>, <code>DF(xs)</code>, and ' +
			'<code>Decide(t, crit)</code> returning exactly ' +
			'<code>"reject H0"</code> or <code>"fail to reject H0"</code>.</p>',
			{ lang: 'txt', code: 'xs = {5.2, 5.4, 4.9, 5.6, 5.3, 5.2, 5.5, 5.0, 4.9, 4.9}, mu0 = 5\n  x̄ = 5.19   s = 0.2601   se = s/√10 = 0.0823\n  t = (5.19 − 5)/0.0823 = 2.3098   df = 9 → crit 2.262\n  |2.3098| > 2.262 → reject H0 — barely. Change ONE reading and it flips.' },
			'<div class="tip">The verdict is binary but the evidence is not: ' +
			't = 2.31 against crit 2.26 and t = 12 against the same crit print ' +
			'the same “reject H0”. That cliff-edge is why journals increasingly ' +
			'ask for the t and the effect size, not just the verdict.</div>',
		],

		starter: [
			'package main',
			'',
			'import "math"',
			'',
			'// Two-sided 95% critical values for Student\'s t (alpha = 0.05):',
			'//',
			'//   df 4  -> 2.776',
			'//   df 9  -> 2.262',
			'//   df 19 -> 2.093',
			'//   df 29 -> 2.045',
			'//',
			'// Fewer degrees of freedom -> fatter tails -> a higher bar.',
			'',
			'// TStat returns the one-sample t-statistic against the hypothesized',
			'// mean mu0:',
			'//',
			'//   t = (mean(xs) - mu0) / (s / sqrt(n))',
			'//',
			'// where s is the SAMPLE standard deviation (sum of squared',
			'// deviations divided by n-1, then square-rooted). Assume len(xs) >= 2.',
			'func TStat(xs []float64, mu0 float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// DF returns the test\'s degrees of freedom: n - 1. Estimating s',
			'// consumed the sample\'s own mean, pinning one deviation.',
			'func DF(xs []float64) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Decide applies the two-sided rule at critical value crit:',
			'//',
			'//   |t| > crit  ->  "reject H0"',
			'//   otherwise   ->  "fail to reject H0"',
			'//',
			'// Two-sided means the sign of t is irrelevant: far below mu0 is',
			'// just as damning as far above.',
			'func Decide(t, crit float64) string {',
			'	// your code here',
			'	return ""',
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
			'	// Two latency-style samples (n=10) differing in ONE reading:',
			'	// sampleA[0]=5.2 vs sampleB[0]=5.1. That 0.1 moves t across the',
			'	// df=9 critical value 2.262 — the verdict flips on one number.',
			'	sampleA := []float64{5.2, 5.4, 4.9, 5.6, 5.3, 5.2, 5.5, 5.0, 4.9, 4.9}',
			'	sampleB := []float64{5.1, 5.4, 4.9, 5.6, 5.3, 5.2, 5.5, 5.0, 4.9, 4.9}',
			'	// A small n=5 sample (df=4, crit 2.776).',
			'	sampleC := []float64{248, 252, 251, 249, 253}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"sample A vs mu0=5: x̄=5.19, s=0.2601 → t just clears the df=9 bar of 2.262",',
			'			"2.3098",',
			'			func() string { return fmt.Sprintf("%.4f", TStat(sampleA, 5)) }},',
			'		{"Decide(2.3098, 2.262) — barely over the line still rejects; the rule is a cliff, not a slope",',
			'			"reject H0",',
			'			func() string { return Decide(TStat(sampleA, 5), 2.262) }},',
			'		{"sample B differs from A by ONE reading (5.2→5.1): t drops below the same bar",',
			'			"2.1757",',
			'			func() string { return fmt.Sprintf("%.4f", TStat(sampleB, 5)) }},',
			'		{"Decide(2.1757, 2.262) — fail to reject: NOT proof that mu0 is true, only that this sample can\'t embarrass it",',
			'			"fail to reject H0",',
			'			func() string { return Decide(TStat(sampleB, 5), 2.262) }},',
			'		{"DF is n-1: 10 readings → 9, 5 readings → 4 (one deviation is pinned by the sample mean)",',
			'			"9 4",',
			'			func() string { return fmt.Sprintf("%d %d", DF(sampleA), DF(sampleC)) }},',
			'		{"same evidence t=2.30, big sample df=29 (crit 2.045): reject",',
			'			"reject H0",',
			'			func() string { return Decide(2.30, 2.045) }},',
			'		{"same evidence t=2.30, tiny sample df=4 (crit 2.776): fail — small samples must clear a higher bar",',
			'			"fail to reject H0",',
			'			func() string { return Decide(2.30, 2.776) }},',
			'		{"two-sided means |t|: sample C vs mu0=253 gives a NEGATIVE t (mean below the hypothesis)",',
			'			"-2.5880",',
			'			func() string { return fmt.Sprintf("%.4f", TStat(sampleC, 253)) }},',
			'		{"Decide(-3.5, 2.776) — far below counts like far above: |−3.5| > 2.776 rejects",',
			'			"reject H0",',
			'			func() string { return Decide(-3.5, 2.776) }},',
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
			'// meanOf is a private helper: TStat needs the mean twice (once',
			'// directly, once inside the sd), so it is factored out rather than',
			'// recomputed inline.',
			'func meanOf(xs []float64) float64 {',
			'	sum := 0.0',
			'	for _, x := range xs {',
			'		sum += x',
			'	}',
			'	return sum / float64(len(xs))',
			'}',
			'',
			'// sampleSD is the n-1 (Bessel-corrected) standard deviation. The',
			'// n-1 is not pedantry here: dividing by n would shrink s, inflate',
			'// every t, and reject too often — the test\'s advertised 5% false-',
			'// alarm rate depends on this exact estimator feeding the t table.',
			'func sampleSD(xs []float64) float64 {',
			'	m := meanOf(xs)',
			'	sumSq := 0.0',
			'	for _, x := range xs {',
			'		d := x - m',
			'		sumSq += d * d',
			'	}',
			'	return math.Sqrt(sumSq / float64(len(xs)-1))',
			'}',
			'',
			'// TStat measures the gap between the sample mean and H0\'s claim in',
			'// standard-error units. The denominator is s/√n — the estimated',
			'// spread of SAMPLE MEANS, not of individual observations: the',
			'// question is "could a mean this far out arise by luck?", and means',
			'// wander √n times less than single readings do. Using s (not a',
			'// known σ) is precisely what makes this a t-test rather than a',
			'// z-test, and why the critical value must come from Student\'s',
			'// fatter-tailed distribution.',
			'func TStat(xs []float64, mu0 float64) float64 {',
			'	n := float64(len(xs))',
			'	stdErr := sampleSD(xs) / math.Sqrt(n)',
			'	return (meanOf(xs) - mu0) / stdErr',
			'}',
			'',
			'// DF: n observations minus the one constraint already spent — the',
			'// deviations from x̄ sum to zero by construction, so only n-1 of',
			'// them carry information. df selects the row of the t table:',
			'// smaller df, fatter tails, higher critical value.',
			'func DF(xs []float64) int {',
			'	return len(xs) - 1',
			'}',
			'',
			'// Decide is the two-sided rule: |t| > crit rejects. The absolute',
			'// value IS the two-sidedness — a mean far below mu0 lands in the',
			'// left tail and is exactly as damning as one far above. Strict',
			'// inequality on the boundary: t equal to crit sits at the edge of',
			'// the rejection region, not inside it. The verdicts are returned as',
			'// strings (not a bool) to force the honest phrasing: the weak',
			'// outcome is "fail to reject", never "accept".',
			'func Decide(t, crit float64) string {',
			'	if math.Abs(t) > crit {',
			'		return "reject H0"',
			'	}',
			'	return "fail to reject H0"',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Reject is not proof, and neither is failing to</h3>' +
			'<p>The test’s logic is proof by embarrassment, not proof: assume ' +
			'the skeptic is right, compute how surprising the data would then ' +
			'be, and reject if the surprise crosses a pre-chosen line. Rejecting ' +
			'H₀ says “luck alone rarely produces this” — with α = 0.05, ' +
			'<em>rarely</em> still means once per twenty true nulls, which is ' +
			'exactly how a team running twenty metrics past every deploy ' +
			'manufactures one bogus “significant” result per release. Failing ' +
			'to reject is weaker still: it certifies nothing about H₀ being ' +
			'true, only that <em>this</em> sample, at <em>this</em> size, ' +
			'couldn’t embarrass it. An n=5 test fails to reject almost any ' +
			'plausible μ₀ — the power problem, which gets its own item later in ' +
			'this track.</p>' +
			'<h3>Why Student, why Guinness</h3>' +
			'<p>If σ were known, (x̄−μ₀)/(σ/√n) would be exactly standard ' +
			'normal and the bar would be 1.96 at every n. Replacing σ with the ' +
			'estimate s adds a second source of noise — s itself bounces sample ' +
			'to sample, and at small n it is often flukishly small, which ' +
			'inflates t. William Gosset, quality-testing barley at Guinness ' +
			'with n≈4, worked out the exact distribution of the ratio in 1908 ' +
			'and published as “Student” under the brewery’s trade-secret ' +
			'policy. His distribution’s tails fatten as df drops — hence 2.262 ' +
			'at df=9 but 2.776 at df=4 — and melt into the normal’s 1.96 as df ' +
			'grows, which is why the harness’s t=2.30 convicts at df=29 yet ' +
			'walks at df=4: same evidence, different reliability of s.</p>' +
			'<h3>From tables to p-values</h3>' +
			'<p>Comparing |t| against a critical value is the table-lookup era ' +
			'of testing, and it survives in code because it needs only a ' +
			'handful of constants. Software instead reports a p-value — the ' +
			'tail area beyond your observed t, computed from the t CDF — and ' +
			'“p &lt; 0.05” is literally the same decision as “|t| &gt; crit”, ' +
			'just phrased as area instead of distance. The practical failure ' +
			'modes are also the same: the cliff edge (t = 2.26 vs 2.27 is no ' +
			'real difference in evidence), and significance-vs-importance (with ' +
			'n = 10⁶ a latency regression of 40 microseconds is statistically ' +
			'significant and operationally meaningless). Modern practice pairs ' +
			'the verdict with a confidence interval — the previous problem — so ' +
			'the reader sees the effect’s <em>size</em>, not just its ' +
			'detectability.</p>',
		],
		complexity: { time: 'O(n) — two passes over the sample (mean, then squared deviations)', space: 'O(1)' },
	});
})();
