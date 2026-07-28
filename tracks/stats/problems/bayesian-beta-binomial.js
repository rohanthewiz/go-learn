/* Bayesian Beta-Binomial — Modeling & Advanced (Hard). Conjugate updating
 * for a rate: the Beta prior plus binomial data gives a Beta posterior by
 * pure addition. The harness pins the posterior parameters after 3/10, the
 * mean and mode, the prior washing out under big data, and a 95% credible
 * interval computed by grid approximation.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// Prior, likelihood, posterior on one probability axis: the flat prior
	// contributes nothing sharp, the likelihood is spiky around the observed
	// rate, and the posterior sits between them — pulled toward the prior
	// exactly as much as the data is weak. Marker id namespaced
	// (dgArrowSTBB): all tracks share one SVG id space.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 220" width="520" height="220" role="img" aria-label="three curves over the rate axis from 0 to 1: a flat prior line, a spiky likelihood curve peaked near 0.3, and a posterior curve between them, slightly wider and shifted toward the prior">' +
		'<text x="20" y="22" class="lbl">posterior &#8733; prior &#215; likelihood — a compromise weighted by evidence</text>' +
		// axis
		'<line x1="40" y1="170" x2="500" y2="170" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="40" y="192" text-anchor="middle" class="lbl">0</text>' +
		'<text x="270" y="192" text-anchor="middle" class="lbl">p (signup rate)</text>' +
		'<text x="500" y="192" text-anchor="middle" class="lbl">1</text>' +
		// flat prior: horizontal dashed line
		'<line x1="40" y1="140" x2="500" y2="140" stroke="var(--warn)" stroke-width="1.8" stroke-dasharray="6,5"/>' +
		'<text x="428" y="132" class="lbl" style="fill:var(--warn)">prior Beta(1,1): flat</text>' +
		// likelihood: narrow spike near p = 0.3
		'<path d="M 40 170 C 120 168 140 160 156 120 C 168 88 176 82 184 82 C 192 82 200 88 212 120 C 228 160 250 168 330 170" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="150" y="72" class="lbl">likelihood: peaks at 3/10</text>' +
		// posterior: between the two, wider than the likelihood, mode near 0.3
		'<path d="M 40 170 C 110 166 130 156 150 118 C 166 90 180 62 196 62 C 212 62 228 92 248 130 C 274 162 320 168 420 170" fill="none" stroke="var(--accent)" stroke-width="2.6" stroke-dasharray="2,3"/>' +
		'<path d="M 262 46 L 208 58" fill="none" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowSTBB)"/>' +
		'<text x="268" y="50" class="lbl">posterior Beta(4,8): the compromise</text>' +
		'<text x="40" y="214" class="lbl">more data &#8594; likelihood sharpens &#8594; posterior forgets the prior</text>' +
		'<defs><marker id="dgArrowSTBB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'bayesian-beta-binomial',
		title: 'Bayesian Beta-Binomial',
		nav: 'beta-binomial',
		difficulty: 'Hard',
		category: 'Modeling & Advanced',
		task: 'Implement conjugate Beta-Binomial updating: posterior parameters, mean, mode, and a grid-approximated credible interval.',

		prose: [
			'<h2>Bayesian Beta-Binomial</h2>' +
			'<p>Day one of your signup page: <strong>3 signups from 10 ' +
			'visitors</strong>. What is the signup rate? The frequentist ' +
			'machinery you built earlier is garbage at n = 10 — the normal ' +
			'approximation behind the standard CI needs np and n(1−p) ' +
			'comfortably large, and “3 of 10” satisfies neither. But you are not ' +
			'clueless about signup rates: you have run pages before. Bayesian ' +
			'inference is the machinery for combining that prior knowledge with ' +
			'thin data:</p>' +
			'<ul>' +
			'<li><strong>Prior → likelihood → posterior.</strong> Encode beliefs ' +
			'about the rate p as a <code>Beta(α, β)</code> distribution — ' +
			'<code>Beta(1,1)</code> is uniform, total agnosticism. Observing s ' +
			'successes and f failures multiplies in the binomial likelihood ' +
			'<code>p^s(1−p)^f</code>, and the algebra collapses beautifully: ' +
			'<code>p^(α−1)(1−p)^(β−1) · p^s(1−p)^f</code> is again a Beta. This ' +
			'is <em>conjugacy</em>, and it makes updating pure addition: ' +
			'<code>Beta(α+s, β+f)</code>. Think of α and β as pseudo-counts — ' +
			'prior successes and failures you pretend to have seen.</li>' +
			'<li><strong>Point estimates.</strong> Posterior mean ' +
			'<code>α/(α+β)</code>; posterior mode <code>(α−1)/(α+β−2)</code> ' +
			'(the peak — defined for α, β &gt; 1). After 3/10 with a flat ' +
			'prior: mean 4/12 ≈ 0.333, gently <em>shrunk</em> from the raw 0.3 ' +
			'toward the prior’s 0.5. Shrinkage is a feature: raw ratios from ' +
			'tiny n are noise, and the prior damps them.</li>' +
			'<li><strong>Credible interval.</strong> The 95% interval is read ' +
			'directly off the posterior: cut 2.5% of probability from each ' +
			'tail. No closed form needed — evaluate the unnormalized density ' +
			'<code>p^(α−1)(1−p)^(β−1)</code> on a grid of 10,000 points, ' +
			'normalize the cumulative sum, and find where it crosses the tail ' +
			'marks. Grid approximation is the honest workhorse behind lots of ' +
			'real Bayesian code.</li>' +
			'<li><strong>The prior washes out.</strong> At 3000/10000 the ' +
			'pseudo-counts are rounding errors: a flat prior and an opinionated ' +
			'<code>Beta(20,5)</code> land within 0.002 of each other. Priors ' +
			'matter exactly when data is scarce — which is when you need help ' +
			'most.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>PosteriorParams</code>, <code>PosteriorMean</code>, ' +
			'<code>PosteriorMode</code> (return 0.5 for the uniform ' +
			'<code>Beta(1,1)</code>, per the doc contract), and ' +
			'<code>CredibleInterval</code> via the grid method — the starter ' +
			'comments spec the grid exactly, and the harness pins its output.</p>',
			{ lang: 'txt', code: 'prior Beta(1,1)  +  3 successes, 7 failures\n  -> posterior Beta(1+3, 1+7) = Beta(4, 8)\n  mean = 4/12 = 0.3333    (raw rate 0.3, shrunk toward prior 0.5)\n  mode = 3/10 = 0.3000\n  95% credible interval (grid): (0.1093, 0.6097)\n  read as: 95% probability the true rate lies in here' },
			'<div class="tip">“95% probability the rate is in this interval” is ' +
			'the sentence everyone <em>wants</em> to say. For a credible ' +
			'interval it is literally true; for the frequentist confidence ' +
			'interval you built earlier it is not — there, 95% describes the ' +
			'procedure’s long-run capture rate, and any single interval either ' +
			'contains the fixed truth or does not.</div>',
		],

		starter: [
			'package main',
			'',
			'// Beta-Binomial conjugate updating: a Beta(alpha, beta) prior over',
			'// a rate p, plus binomial data, yields a Beta posterior. alpha and',
			'// beta act as pseudo-counts of successes and failures.',
			'',
			'// PosteriorParams applies the conjugate update: observing',
			'// `successes` and `failures` turns Beta(alpha, beta) into',
			'// Beta(alpha+successes, beta+failures). Returns the new alpha',
			'// first, then the new beta. Conjugacy means updating is addition —',
			'// no integrals, no normalizing constants.',
			'func PosteriorParams(alpha, beta float64, successes, failures int) (float64, float64) {',
			'	// your code here',
			'	return 0, 0',
			'}',
			'',
			'// PosteriorMean is the mean of Beta(alpha, beta): alpha/(alpha+beta)',
			'// — the pseudo-count success fraction.',
			'func PosteriorMean(alpha, beta float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// PosteriorMode is the peak of Beta(alpha, beta):',
			'// (alpha-1)/(alpha+beta-2), defined for alpha, beta > 1. For the',
			'// uniform Beta(1, 1) — every rate equally likely, no unique peak —',
			'// return 0.5 by contract.',
			'func PosteriorMode(alpha, beta float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// CredibleInterval returns the central credible interval at the',
			'// given level (e.g. 0.95) for Beta(alpha, beta), by grid',
			'// approximation — implement EXACTLY this recipe:',
			'//   1. evaluate the unnormalized pdf p^(alpha-1) * (1-p)^(beta-1)',
			'//      at p = i/10000 for i = 1..9999 (math.Pow is available)',
			'//   2. normalize by the total so the values sum to 1, accumulating',
			'//      a running cumulative sum in grid order',
			'//   3. the low endpoint is the FIRST grid p where the cumulative',
			'//      sum reaches (1-level)/2; the high endpoint is the FIRST',
			'//      grid p where it reaches 1-(1-level)/2',
			'// Returns the low endpoint first, then the high.',
			'func CredibleInterval(alpha, beta float64, level float64) (float64, float64) {',
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
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	cases := []tc{',
			'		{"conjugate update: flat Beta(1,1) prior + 3 signups, 7 non-signups = Beta(4, 8)",',
			'			"Beta(4.0000, 8.0000)",',
			'			func() string {',
			'				a, b := PosteriorParams(1, 1, 3, 7)',
			'				return fmt.Sprintf("Beta(%s, %s)", f4(a), f4(b))',
			'			}},',
			'		{"posterior mean of Beta(4,8): 4/12 — the raw 0.3 shrunk toward the prior 0.5",',
			'			"0.3333",',
			'			func() string { return f4(PosteriorMean(4, 8)) }},',
			'		{"posterior mode of Beta(4,8): (4-1)/(4+8-2) recovers the raw rate 3/10 exactly",',
			'			"0.3000",',
			'			func() string { return f4(PosteriorMode(4, 8)) }},',
			'		{"uniform Beta(1,1): no unique peak, 0.5 by the doc contract",',
			'			"0.5000",',
			'			func() string { return f4(PosteriorMode(1, 1)) }},',
			'		{"big data, flat prior: Beta(1,1) + 3000/7000 gives mean 3001/10002",',
			'			"0.3000",',
			'			func() string {',
			'				a, b := PosteriorParams(1, 1, 3000, 7000)',
			'				return f4(PosteriorMean(a, b))',
			'			}},',
			'		{"big data, opinionated Beta(20,5) prior, SAME data: mean 3020/10025 — within 0.01 of flat",',
			'			"0.3012",',
			'			func() string {',
			'				a, b := PosteriorParams(20, 5, 3000, 7000)',
			'				return f4(PosteriorMean(a, b))',
			'			}},',
			'		{"95% credible interval for Beta(4,8) by the 10000-point grid: 2.5% cut from each tail",',
			'			"(0.1093, 0.6097)",',
			'			func() string {',
			'				lo, hi := CredibleInterval(4, 8, 0.95)',
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
			'import "math"',
			'',
			'// PosteriorParams is the entire Bayesian update for this model.',
			'// Conjugacy is why: the Beta prior and the binomial likelihood',
			'// share the p^a * (1-p)^b shape, so multiplying them just adds',
			'// exponents. The successes/failures arrive as ints (they are',
			'// counts) and convert here — keeping alpha/beta float64 lets',
			'// fractional pseudo-counts like the Jeffreys prior Beta(0.5, 0.5)',
			'// flow through the same code path.',
			'func PosteriorParams(alpha, beta float64, successes, failures int) (float64, float64) {',
			'	return alpha + float64(successes), beta + float64(failures)',
			'}',
			'',
			'// PosteriorMean: alpha/(alpha+beta). Reading alpha and beta as',
			'// pseudo-counts makes this the "success fraction counting the',
			'// prior\'s imaginary observations" — which is exactly why the mean',
			'// sits between the raw rate and the prior mean (shrinkage), and',
			'// why the prior\'s pull fades as real counts swamp the pseudo ones.',
			'func PosteriorMean(alpha, beta float64) float64 {',
			'	return alpha / (alpha + beta)',
			'}',
			'',
			'// PosteriorMode: the density\'s peak, (alpha-1)/(alpha+beta-2) for',
			'// alpha, beta > 1. The -1s fall out of maximizing',
			'// p^(alpha-1)*(1-p)^(beta-1) — and they make mode-of-posterior',
			'// under a flat prior equal the maximum-likelihood estimate (the',
			'// harness pins mode(Beta(4,8)) = 3/10, the raw rate). Beta(1,1) is',
			'// flat with no unique peak, so 0.5 is returned by contract rather',
			'// than evaluating the indeterminate 0/0.',
			'func PosteriorMode(alpha, beta float64) float64 {',
			'	if alpha == 1 && beta == 1 {',
			'		return 0.5',
			'	}',
			'	return (alpha - 1) / (alpha + beta - 2)',
			'}',
			'',
			'// CredibleInterval computes the central interval by grid',
			'// approximation. Two design points worth noting:',
			'//   - The pdf can stay UNNORMALIZED on the grid: the Beta',
			'//     normalizing constant B(alpha, beta) divides out when the',
			'//     cumulative sum is expressed as a fraction of the total, so',
			'//     it is never computed at all.',
			'//   - Endpoints i=0 and i=10000 are excluded: for alpha < 1 or',
			'//     beta < 1 the density diverges there, and 0^negative is +Inf.',
			'//     The open grid 1..9999 sidesteps both poles.',
			'func CredibleInterval(alpha, beta float64, level float64) (float64, float64) {',
			'	const grid = 10000',
			'	pdf := make([]float64, grid)',
			'	total := 0.0',
			'	for i := 1; i < grid; i++ {',
			'		p := float64(i) / grid',
			'		v := math.Pow(p, alpha-1) * math.Pow(1-p, beta-1)',
			'		pdf[i] = v',
			'		total += v',
			'	}',
			'',
			'	// One forward walk finds both endpoints: the FIRST grid point',
			'	// where the normalized cumulative mass reaches each tail mark.',
			'	// "First crossing" makes the answer exact-by-definition for the',
			'	// harness — no interpolation ambiguity between grid points.',
			'	tail := (1 - level) / 2',
			'	loP, hiP := 0.0, 0.0',
			'	foundLo := false',
			'	cum := 0.0',
			'	for i := 1; i < grid; i++ {',
			'		cum += pdf[i] / total',
			'		if !foundLo && cum >= tail {',
			'			loP = float64(i) / grid',
			'			foundLo = true',
			'		}',
			'		if cum >= 1-tail {',
			'			hiP = float64(i) / grid',
			'			break',
			'		}',
			'	}',
			'	return loP, hiP',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Conjugacy: the shortcut that built a field</h3>' +
			'<p>Before computers, Bayesian inference lived or died by conjugate ' +
			'pairs — prior families algebraically closed under a likelihood, so ' +
			'the posterior needs no integration. Beta-Binomial is the canonical ' +
			'one; Gamma-Poisson (event rates) and Normal-Normal (Kalman ' +
			'filters — literally conjugate updating run over time) are its ' +
			'siblings. Modern probabilistic programming (Stan, PyMC) uses MCMC ' +
			'precisely to escape the conjugate menu, but the grid method you ' +
			'implemented is the conceptual bridge: evaluate an unnormalized ' +
			'density everywhere, normalize numerically, read off whatever you ' +
			'want. On one parameter a 10,000-point grid is effectively exact; ' +
			'the reason all of statistics doesn’t just do this is the curse of ' +
			'dimensionality — ten parameters at this resolution would need ' +
			'10⁴⁰ evaluations, which is why MCMC exists.</p>' +
			'<h3>Where you have already met this model</h3>' +
			'<p>Laplace used exactly this machinery in 1774 for “what fraction ' +
			'of births are girls?”, and his <em>rule of succession</em> — after ' +
			's successes in n trials, estimate (s+1)/(n+2) — is precisely the ' +
			'posterior mean under a flat prior: your <code>Beta(1+s, 1+f)</code> ' +
			'mean. The same +1s appear in software as <em>Laplace smoothing</em> ' +
			'in naive Bayes classifiers (no word gets probability zero just ' +
			'because the training set missed it). Reddit-style comment ranking ' +
			'and multi-armed bandits leap from estimation to decision the same ' +
			'way: Thompson sampling draws one random rate from each option’s ' +
			'Beta posterior and picks the winner — thin-data options get wide ' +
			'posteriors and therefore occasional exploratory wins, fat-data ' +
			'options get exploited. A/B testing with Beta posteriors is this ' +
			'item plus a loop.</p>' +
			'<h3>Reading intervals honestly</h3>' +
			'<p>The credible/confidence distinction from the prose has teeth in ' +
			'review meetings: “95% probability the rate is between 0.11 and ' +
			'0.61” is a statement about the <em>parameter</em>, licensed by the ' +
			'prior; the frequentist version is a statement about the ' +
			'<em>procedure</em>. The price of the nicer sentence is that ' +
			'someone can ask “whose prior?” — with n = 10 the flat-prior and ' +
			'Beta(20,5) posteriors genuinely disagree, and reporting both is ' +
			'the honest move (a sensitivity analysis). The harness’s big-data ' +
			'pair is the flip side: at n = 10,000 the disagreement is 0.0012, ' +
			'and arguing about priors is arguing about nothing. One refinement ' +
			'to know exists: the central interval you built cuts equal tails, ' +
			'but for skewed posteriors the <em>highest density interval</em> ' +
			'(HDI) — the shortest interval holding 95% — is preferred, and for ' +
			'Beta(4,8)’s right skew it would sit slightly left of yours.</p>',
		],
		complexity: { time: 'O(G) — one pass to build the 10,000-point grid, one to walk the cumulative sum', space: 'O(G) for the grid densities' },
	});
})();
