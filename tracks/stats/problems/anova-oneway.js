/* One-Way ANOVA — Modeling & Advanced (Hard). The F test that replaces a
 * pile of pairwise t-tests with ONE question: is the variance between the
 * group means larger than the noise within the groups? The harness pins the
 * sum-of-squares decomposition on a dataset with a real difference (F = 72,
 * rejects), an all-similar dataset (F = 0.75, fails to reject), the df
 * bookkeeping, and the k = 2 collapse F = t².
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// Three dot-strips, one per group: each group scatters around its own
	// mean (within-spread), and the group means scatter around the grand
	// mean (between-spread). F is the ratio of those two spreads. Marker id
	// namespaced (dgArrowSTAN) because all tracks share one SVG id space.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 232" width="520" height="232" role="img" aria-label="three groups of dots, each scattered around its own group mean; the group means scatter around the grand mean line; F compares between-group spread to within-group spread">' +
		'<text x="20" y="22" class="lbl">F = spread of the group means / spread inside the groups</text>' +
		// grand mean: one dashed vertical line through all three strips
		'<line x1="262" y1="40" x2="262" y2="160" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5,4"/>' +
		'<text x="262" y="176" text-anchor="middle" class="lbl" style="fill:var(--warn)">grand mean</text>' +
		// group A strip: mean left of the grand mean
		'<circle cx="122" cy="60" r="4" fill="var(--accent)"/><circle cx="148" cy="60" r="4" fill="var(--accent)"/><circle cx="170" cy="60" r="4" fill="var(--accent)"/><circle cx="194" cy="60" r="4" fill="var(--accent)"/>' +
		'<line x1="158" y1="48" x2="158" y2="72" stroke="var(--accent)" stroke-width="2.4"/>' +
		'<text x="70" y="65" class="lbl">group A</text>' +
		// group B strip: mean sitting on the grand mean
		'<circle cx="224" cy="102" r="4" fill="var(--accent)"/><circle cx="250" cy="102" r="4" fill="var(--accent)"/><circle cx="276" cy="102" r="4" fill="var(--accent)"/><circle cx="298" cy="102" r="4" fill="var(--accent)"/>' +
		'<line x1="262" y1="90" x2="262" y2="114" stroke="var(--accent)" stroke-width="2.4"/>' +
		'<text x="70" y="107" class="lbl">group B</text>' +
		// group C strip: mean right of the grand mean
		'<circle cx="332" cy="144" r="4" fill="var(--accent)"/><circle cx="354" cy="144" r="4" fill="var(--accent)"/><circle cx="378" cy="144" r="4" fill="var(--accent)"/><circle cx="404" cy="144" r="4" fill="var(--accent)"/>' +
		'<line x1="366" y1="132" x2="366" y2="156" stroke="var(--accent)" stroke-width="2.4"/>' +
		'<text x="70" y="149" class="lbl">group C</text>' +
		// between-spread bracket: spans group-A mean to group-C mean
		'<path d="M 158 192 L 158 200 L 366 200 L 366 192" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<text x="262" y="220" text-anchor="middle" class="lbl" style="fill:var(--warn)">between-spread: group means vs grand mean (SSB)</text>' +
		// within-spread arrows over the group-A dots
		'<path d="M 122 40 L 194 40" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowSTAN)" marker-start="url(#dgArrowSTAN)"/>' +
		'<text x="330" y="44" class="lbl">within-spread: dots vs own mean (SSW)</text>' +
		'<defs><marker id="dgArrowSTAN" viewBox="0 0 8 8" refX="4" refY="4" markerWidth="6" markerHeight="6" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'anova-oneway',
		title: 'One-Way ANOVA',
		nav: 'one-way anova',
		difficulty: 'Hard',
		category: 'Modeling & Advanced',
		task: 'Implement the one-way ANOVA decomposition: SSBetween, SSWithin, the F statistic, and the (k−1, N−k) degrees of freedom.',

		prose: [
			'<h2>One-Way ANOVA</h2>' +
			'<p>You benchmarked <strong>three cache eviction policies</strong> — LRU, ' +
			'LFU, and a random-eviction baseline — five runs each, and now you want ' +
			'to know whether policy choice matters at all. The tempting move is ' +
			'three pairwise t-tests (LRU&nbsp;vs&nbsp;LFU, LRU&nbsp;vs&nbsp;random, ' +
			'LFU&nbsp;vs&nbsp;random). Resist it: each test carries its own 5% ' +
			'false-positive risk, and with three of them the chance that ' +
			'<em>at least one</em> fires by pure luck is ' +
			'<code>1 − 0.95³ ≈ 14%</code>. Your α quietly tripled. ANOVA ' +
			'(analysis of variance) asks <em>one</em> question with <em>one</em> ' +
			'α: are all the group means plausibly equal?</p>' +
			'<ul>' +
			'<li><strong>Partition the variation.</strong> Total scatter splits ' +
			'exactly into two pieces. <em>Between</em>: how far each group mean ' +
			'sits from the grand mean, weighted by group size — ' +
			'<code>SSB = Σ nᵢ(x̄ᵢ − x̄)²</code>. <em>Within</em>: how far each ' +
			'observation sits from its <em>own</em> group mean — ' +
			'<code>SSW = Σᵢ Σⱼ (xᵢⱼ − x̄ᵢ)²</code>. Within is pure noise; ' +
			'between is noise <em>plus</em> any real treatment effect.</li>' +
			'<li><strong>Normalize by degrees of freedom.</strong> With k groups ' +
			'and N total observations, between has <code>k − 1</code> df and ' +
			'within has <code>N − k</code>. Dividing gives two variance estimates ' +
			'(“mean squares”), and their ratio is the statistic: ' +
			'<code>F = (SSB/(k−1)) / (SSW/(N−k))</code>.</li>' +
			'<li><strong>Read F as signal-to-noise.</strong> If all groups share ' +
			'one mean, numerator and denominator estimate the <em>same</em> ' +
			'variance and F hovers around 1. A real difference inflates only the ' +
			'numerator, pushing F far above 1 — past the critical value from the ' +
			'F distribution, you reject.</li>' +
			'<li><strong>What a significant F does NOT say:</strong> only that ' +
			'<em>some</em> group differs — never which one. Naming the culprit is ' +
			'the job of post-hoc tests (Tukey HSD, Bonferroni), which control ' +
			'exactly the family-wise error that naive pairwise testing blows up.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>SSBetween</code>, <code>SSWithin</code>, ' +
			'<code>FStat</code>, and <code>ANOVADF</code> (returning ' +
			'<code>k−1, N−k</code>). The harness pins a dataset with a real ' +
			'difference, an all-similar one, and the neat identity that with two ' +
			'groups ANOVA collapses to the t-test: <code>F = t²</code>.</p>',
			{ lang: 'txt', code: 'groups: {12 14 11 13 15} {18 20 17 19 21} {24 26 23 25 27}\nmeans : 13, 19, 25          grand mean: 19\nSSB = 5·(13−19)² + 5·(19−19)² + 5·(25−19)² = 360\nSSW = 10 + 10 + 10                         = 30\nF   = (360/2) / (30/12) = 180 / 2.5        = 72   (≫ 3.885: reject)' },
			'<div class="tip">The 95% critical values for the harness data: ' +
			'df(2,12) → 3.885, df(2,27) → 3.354, df(3,16) → 3.239. F carries ' +
			'<em>two</em> df parameters because it is a ratio of two variance ' +
			'estimates, each with its own sample-size bookkeeping.</div>',
		],

		starter: [
			'package main',
			'',
			'// One-way ANOVA: does at least one of k group means differ? The F',
			'// statistic compares variance BETWEEN group means to variance WITHIN',
			'// groups. 95% F critical values for the harness datasets:',
			'//   df(2, 12) -> 3.885    df(2, 27) -> 3.354    df(3, 16) -> 3.239',
			'// Reject H0 (all means equal) when F exceeds the critical value.',
			'',
			'// SSBetween is the between-group sum of squares: for each group,',
			'// the squared distance from its mean to the grand mean, weighted by',
			'// group size — SSB = sum over groups of n_i*(mean_i - grand)^2.',
			'// The grand mean is the mean of ALL observations pooled (which only',
			'// equals the mean of the group means when group sizes are equal).',
			'func SSBetween(groups [][]float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// SSWithin is the within-group sum of squares: every observation\'s',
			'// squared distance from its OWN group mean, summed over all groups —',
			'// SSW = sum_i sum_j (x_ij - mean_i)^2. This is the pure-noise term.',
			'func SSWithin(groups [][]float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// FStat is the ANOVA F ratio: each sum of squares divided by its',
			'// degrees of freedom, then between over within —',
			'// F = (SSB/(k-1)) / (SSW/(N-k)), with k groups and N total points.',
			'func FStat(groups [][]float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// ANOVADF returns the two degrees of freedom for the F test, in',
			'// order: between df = k-1 first, then within df = N-k.',
			'func ANOVADF(groups [][]float64) (int, int) {',
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
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// Three cache eviction policies, five latency-score runs each.',
			'	// Group means 13, 19, 25 around a grand mean of 19 — a real,',
			'	// large difference against tight within-group noise.',
			'	realDiff := [][]float64{',
			'		{12, 14, 11, 13, 15},',
			'		{18, 20, 17, 19, 21},',
			'		{24, 26, 23, 25, 27},',
			'	}',
			'	// Three groups of ten drawn from what is essentially one',
			'	// population: means 50, 51, 50 with wide within-group scatter.',
			'	similar := [][]float64{',
			'		{50, 52, 48, 51, 49, 53, 47, 50, 52, 48},',
			'		{52, 50, 54, 49, 53, 51, 48, 55, 50, 48},',
			'		{49, 51, 50, 52, 48, 53, 47, 51, 50, 49},',
			'	}',
			'	// Four groups of five: only the df bookkeeping is pinned here.',
			'	fourGroups := [][]float64{',
			'		{5, 6, 7, 8, 9}, {6, 7, 8, 9, 10},',
			'		{7, 8, 9, 10, 11}, {4, 5, 6, 7, 8},',
			'	}',
			'	// Two groups whose pooled t-statistic is exactly -1 by hand:',
			'	// means 3 and 4, both sample variances 2.5, n = 5 each, so',
			'	// t = (3-4)/sqrt(2.5*(1/5+1/5)) = -1. ANOVA must give F = t^2.',
			'	twoGroups := [][]float64{{1, 2, 3, 4, 5}, {2, 3, 4, 5, 6}}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	cases := []tc{',
			'		{"SSB on the three-policy data: 5*36 + 5*0 + 5*36, weighted by group size",',
			'			"360.0000",',
			'			func() string { return f4(SSBetween(realDiff)) }},',
			'		{"SSW on the same data: each group contributes 1+1+4+0+4 = 10 of pure noise",',
			'			"30.0000",',
			'			func() string { return f4(SSWithin(realDiff)) }},',
			'		{"F = (360/2)/(30/12) = 72 — far past the 3.885 critical for df(2,12): reject",',
			'			"72.0000",',
			'			func() string { return f4(FStat(realDiff)) }},',
			'		{"df bookkeeping: k=3 groups, N=15 points gives (k-1, N-k)",',
			'			"(2, 12)",',
			'			func() string { dfB, dfW := ANOVADF(realDiff); return fmt.Sprintf("(%d, %d)", dfB, dfW) }},',
			'		{"all-similar groups: F near 1 (0.75), under the 3.354 critical for df(2,27) — fail to reject",',
			'			"0.7500",',
			'			func() string { return f4(FStat(similar)) }},',
			'		{"df with four groups of five: (3, 16)",',
			'			"(3, 16)",',
			'			func() string { dfB, dfW := ANOVADF(fourGroups); return fmt.Sprintf("(%d, %d)", dfB, dfW) }},',
			'		{"k=2 collapse: pooled t = -1 by hand, and ANOVA gives F = t^2 = 1 exactly",',
			'			"1.0000",',
			'			func() string { return f4(FStat(twoGroups)) }},',
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
			'// groupMean is the plain average of one group. Factored out because',
			'// every piece of the decomposition needs it, and recomputing it',
			'// inline three times is how the "used N instead of n_i" bug hides.',
			'func groupMean(g []float64) float64 {',
			'	sum := 0.0',
			'	for _, v := range g {',
			'		sum += v',
			'	}',
			'	return sum / float64(len(g))',
			'}',
			'',
			'// grandStats returns the grand mean over ALL observations pooled,',
			'// plus the total count N. Pooling matters: with unequal group sizes',
			'// the mean-of-group-means and the pooled mean differ, and only the',
			'// pooled mean makes SSB + SSW add up to the total sum of squares.',
			'func grandStats(groups [][]float64) (float64, int) {',
			'	sum, n := 0.0, 0',
			'	for _, g := range groups {',
			'		for _, v := range g {',
			'			sum += v',
			'		}',
			'		n += len(g)',
			'	}',
			'	return sum / float64(n), n',
			'}',
			'',
			'// SSBetween measures how far the group means stray from the grand',
			'// mean. The n_i weight is the key design point: a mean estimated',
			'// from more points is more trustworthy, so its deviation counts',
			'// proportionally more. Under H0 this term is pure sampling noise;',
			'// a real treatment effect inflates it and nothing else.',
			'func SSBetween(groups [][]float64) float64 {',
			'	grand, _ := grandStats(groups)',
			'	ssb := 0.0',
			'	for _, g := range groups {',
			'		m := groupMean(g)',
			'		ssb += float64(len(g)) * (m - grand) * (m - grand)',
			'	}',
			'	return ssb',
			'}',
			'',
			'// SSWithin measures scatter around each group\'s OWN mean — the',
			'// grand mean never appears here. Shifting an entire group up or',
			'// down leaves its contribution unchanged, which is exactly why SSW',
			'// is the noise yardstick: it is blind to between-group differences.',
			'func SSWithin(groups [][]float64) float64 {',
			'	ssw := 0.0',
			'	for _, g := range groups {',
			'		m := groupMean(g)',
			'		for _, v := range g {',
			'			ssw += (v - m) * (v - m)',
			'		}',
			'	}',
			'	return ssw',
			'}',
			'',
			'// FStat divides each sum of squares by its degrees of freedom to get',
			'// two honest variance estimates (mean squares), then takes the',
			'// ratio. Under H0 both estimate the same population variance, so',
			'// F sits near 1; the F distribution\'s critical value quantifies how',
			'// far above 1 sampling luck alone can plausibly push it.',
			'func FStat(groups [][]float64) float64 {',
			'	_, n := grandStats(groups)',
			'	k := len(groups)',
			'	msBetween := SSBetween(groups) / float64(k-1)',
			'	msWithin := SSWithin(groups) / float64(n-k)',
			'	return msBetween / msWithin',
			'}',
			'',
			'// ANOVADF returns (k-1, N-k). The arithmetic mirrors what each term',
			'// had to estimate: k group means measured against 1 grand mean',
			'// leaves k-1 free; N observations measured against their k group',
			'// means leaves N-k. The two sum to N-1, the total df — the',
			'// decomposition spends every degree of freedom exactly once.',
			'func ANOVADF(groups [][]float64) (int, int) {',
			'	_, n := grandStats(groups)',
			'	return len(groups) - 1, n - len(groups)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Fisher’s crop fields</h3>' +
			'<p>ANOVA was invented by R.&nbsp;A. Fisher in the 1920s at the ' +
			'Rothamsted agricultural station, comparing crop yields across ' +
			'fertilizer treatments — which is why textbooks still call the groups ' +
			'“treatments”. The deep idea outlived the crops: <em>partition</em> ' +
			'the total sum of squares into independent, interpretable pieces, ' +
			'give each its degrees of freedom, and compare mean squares. That ' +
			'template scales far beyond one factor — two-way ANOVA adds an ' +
			'interaction term, and regression’s F test is the same decomposition ' +
			'with SSB renamed “explained” and SSW renamed “residual”. ANOVA ' +
			'<em>is</em> linear regression on group-indicator variables; R’s ' +
			'<code>aov()</code> literally calls <code>lm()</code> underneath.</p>' +
			'<h3>Why not just run t-tests?</h3>' +
			'<p>The multiple-comparisons arithmetic is brutal: m independent ' +
			'tests at α = 0.05 give a family-wise false-positive rate of ' +
			'<code>1 − 0.95^m</code> — 14% at three tests, 40% at ten, 92% at ' +
			'fifty. This is the machinery behind the famous “dead salmon” fMRI ' +
			'poster (thousands of voxel-wise tests “found” brain activity in a ' +
			'dead fish) and behind p-hacking generally. ANOVA’s omnibus F spends ' +
			'exactly one α on “is anything going on at all?”; only after it ' +
			'fires do post-hoc procedures (Tukey’s HSD, Holm–Bonferroni) hunt ' +
			'for which pair differs, while keeping the family-wise rate ' +
			'controlled.</p>' +
			'<h3>Assumptions, and the k = 2 identity</h3>' +
			'<p>Classic one-way ANOVA assumes independent observations, roughly ' +
			'normal residuals, and — the one that bites in practice — ' +
			'<em>equal variances</em> across groups, because SSW pools all ' +
			'groups into one noise estimate exactly like the pooled t-test. ' +
			'Unequal variances call for Welch’s ANOVA, the k-group cousin of the ' +
			'Welch t-test you built earlier. And the harness’s last case is ' +
			'worth internalizing: with k = 2 the F statistic is <em>exactly</em> ' +
			'the square of the pooled t statistic, on df (1, N−2) matching t’s ' +
			'N−2. ANOVA is not a different philosophy — it is the t-test ' +
			'generalized to many groups, and squaring is why F needs only one ' +
			'tail: both of t’s tails fold into F’s upper one.</p>',
		],
		complexity: { time: 'O(N) — a constant number of passes over all observations', space: 'O(1) beyond the input' },
	});
})();
