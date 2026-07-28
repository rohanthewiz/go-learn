/* Bayes' Theorem — Probability (Medium). The base-rate fallacy, computed:
 * Posterior for a positive diagnostic test, PosteriorNeg for a negative one,
 * and SequentialUpdate folding repeated independent results with each
 * posterior becoming the next prior. The harness pins the classic
 * 1%-prevalence / 99%-sensitivity / 95%-specificity case (≈0.1667, not the
 * 95% most doctors guess), a negative-result posterior, a two-positive
 * sequential chain, and the 50% prior sanity check.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// Natural-frequency tree: the representation Gigerenzer showed makes
	// Bayes intuitive. 10,000 people flow through prevalence, then the
	// test; the punchline is that healthy false positives outnumber sick
	// true positives 5:1. Marker id namespaced (dgArrowSTBT).
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="natural frequency tree: 10,000 people split into 100 sick and 9,900 healthy; the sick split into 99 test-positive and 1 test-negative; the healthy split into 495 test-positive and 9,405 test-negative">' +
		'<text x="20" y="20" class="lbl">10,000 people, 1% prevalence, 99% sensitivity, 95% specificity</text>' +
		// root
		'<rect x="20" y="88" width="96" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="68" y="110" text-anchor="middle">10,000</text>' +
		// prevalence split
		'<line x1="116" y1="98" x2="196" y2="62" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<line x1="116" y1="112" x2="196" y2="150" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<rect x="198" y="46" width="104" height="32" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="250" y="67" text-anchor="middle">sick 100</text>' +
		'<rect x="198" y="136" width="104" height="32" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="250" y="157" text-anchor="middle">healthy 9,900</text>' +
		// test splits
		'<line x1="302" y1="55" x2="374" y2="38" stroke="var(--warn)" stroke-width="1.4"/>' +
		'<line x1="302" y1="70" x2="374" y2="86" stroke="var(--warn)" stroke-width="1.4"/>' +
		'<line x1="302" y1="145" x2="374" y2="128" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<line x1="302" y1="160" x2="374" y2="178" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<text x="382" y="42" class="lbl">test + :  99   ← true positives</text>' +
		'<text x="382" y="90" class="lbl">test − :  1</text>' +
		'<text x="382" y="132" class="lbl" style="fill:var(--warn)">test + :  495  ← false positives</text>' +
		'<text x="382" y="182" class="lbl">test − :  9,405</text>' +
		// the punchline arrow
		'<path d="M 200 200 C 290 204 350 170 376 142" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSTBT)"/>' +
		'<text x="20" y="204" class="lbl" style="fill:var(--warn)">P(sick | +) = 99 / (99 + 495) ≈ 16.7%</text>' +
		'<defs><marker id="dgArrowSTBT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'bayes-theorem',
		title: 'Bayes\' Theorem',
		nav: 'bayes\' theorem',
		difficulty: 'Medium',
		category: 'Probability',
		task: 'Implement Posterior and PosteriorNeg (P(disease | test result) from prior, sensitivity, specificity) and SequentialUpdate (fold repeated results, posterior becoming prior).',

		prose: [
			'<h2>Bayes’ Theorem</h2>' +
			'<p>A screening test is 99% sensitive (catches 99% of the sick) and 95% ' +
			'specific (clears 95% of the healthy). The disease affects 1% of the ' +
			'population. Your test comes back positive — how likely are you to be ' +
			'sick? When Gigerenzer put this question to physicians, most answered ' +
			'“around 95%”. The right answer is <strong>about 16.7%</strong>. That ' +
			'gap is the <em>base-rate fallacy</em>: the intuition ignores that ' +
			'healthy people vastly outnumber sick ones, so even a small ' +
			'false-positive rate generates a crowd of false alarms that swamps the ' +
			'true positives. Bayes’ theorem is the bookkeeping that gets it right:</p>' +
			'<ul>' +
			'<li><strong>The three inputs.</strong> <em>Prior</em>: P(disease) ' +
			'before any evidence — the base rate. <em>Sensitivity</em>: P(+ | ' +
			'disease), the true-positive rate. <em>Specificity</em>: P(− | ' +
			'healthy), the true-negative rate — so the false-positive rate is ' +
			'1 − specificity.</li>' +
			'<li><strong>The formula is just two paths to a positive test.</strong> ' +
			'Either you’re sick and the test caught it (prior·sens), or you’re ' +
			'healthy and the test misfired ((1−prior)·(1−spec)). The posterior is ' +
			'the sick path’s share of both paths together: ' +
			'<code>prior·sens / (prior·sens + (1−prior)·(1−spec))</code>.</li>' +
			'<li><strong>A negative result updates too</strong> — downward. The ' +
			'two paths to a negative are the miss (prior·(1−sens)) and the correct ' +
			'all-clear ((1−prior)·spec); the posterior is the miss’s share.</li>' +
			'<li><strong>Evidence chains.</strong> After one positive, 16.7% is ' +
			'your <em>new prior</em>. A second independent positive updates from ' +
			'there — to about 80% — which is why confirmatory testing works, and ' +
			'why one cheap test plus one follow-up beats one expensive test.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Posterior(prior, sens, spec)</code> = P(disease | ' +
			'positive), <code>PosteriorNeg(prior, sens, spec)</code> = P(disease | ' +
			'negative), and <code>SequentialUpdate(prior, sens, spec, ' +
			'results)</code>, which folds a slice of independent test results ' +
			'(<code>true</code> = positive) through the appropriate update, each ' +
			'posterior becoming the next call’s prior.</p>',
			{ lang: 'txt', code: 'prior 1%, sens 99%, spec 95% — the two paths to a positive:\n  sick    and caught:   0.01 · 0.99          = 0.0099\n  healthy and misfired: 0.99 · 0.05          = 0.0495   ← 5× bigger!\n  P(sick | +) = 0.0099 / (0.0099 + 0.0495)  ≈ 0.1667' },
			'<div class="tip">Sanity anchor: at a 50% prior the base rate stops ' +
			'mattering — with a symmetric test (sens = spec = 0.9) the posterior ' +
			'is exactly the sensitivity, 0.9. If your implementation disagrees, ' +
			'the numerator and denominator are keeping different books.</div>',
		],

		starter: [
			'package main',
			'',
			'// Posterior returns P(disease | positive test) by Bayes\' rule:',
			'//',
			'//   prior·sens / (prior·sens + (1−prior)·(1−spec))',
			'//',
			'// prior is P(disease) before the test (the base rate), sens is',
			'// P(+ | disease) (sensitivity), and spec is P(− | healthy)',
			'// (specificity) — so 1−spec is the false-positive rate. The',
			'// denominator is the total probability of a positive from either',
			'// path: a caught case or a healthy misfire.',
			'func Posterior(prior, sens, spec float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// PosteriorNeg returns P(disease | negative test) — the downward',
			'// update. The two paths to a negative are the missed case',
			'// (prior·(1−sens)) and the correct all-clear ((1−prior)·spec):',
			'//',
			'//   prior·(1−sens) / (prior·(1−sens) + (1−prior)·spec)',
			'func PosteriorNeg(prior, sens, spec float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// SequentialUpdate folds a series of INDEPENDENT test results into',
			'// one belief. Starting from prior, apply Posterior for each true',
			'// (positive) and PosteriorNeg for each false (negative), feeding',
			'// each posterior in as the next update\'s prior. An empty slice',
			'// returns the prior unchanged — no evidence, no update.',
			'func SequentialUpdate(prior, sens, spec float64, results []bool) float64 {',
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
			'	// The Gigerenzer screening test: 1% prevalence, 99% sensitivity,',
			'	// 95% specificity. Every case below reuses these three numbers.',
			'	prior := 0.01',
			'	sens := 0.99',
			'	spec := 0.95',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	cases := []tc{',
			'		{"the base-rate fallacy pin: 1% prior, 99% sens, 95% spec — most doctors guess 95%, truth is 1/6",',
			'			"0.1667",',
			'			func() string { return f4(Posterior(prior, sens, spec)) }},',
			'		{"negative result: P(disease | −) collapses to ~0.01% — small, but never exactly zero",',
			'			"0.0001",',
			'			func() string { return f4(PosteriorNeg(prior, sens, spec)) }},',
			'		{"two independent positives: yesterday\'s 16.7% posterior is today\'s prior — belief compounds to ~80%",',
			'			"0.7984",',
			'			func() string { return f4(SequentialUpdate(prior, sens, spec, []bool{true, true})) }},',
			'		{"positive then negative: the follow-up all-clear drags belief back below 1%",',
			'			"0.0021",',
			'			func() string { return f4(SequentialUpdate(prior, sens, spec, []bool{true, false})) }},',
			'		{"50% prior sanity check: base rate neutral, symmetric 90/90 test ⇒ posterior = sensitivity exactly",',
			'			"0.9000",',
			'			func() string { return f4(Posterior(0.5, 0.9, 0.9)) }},',
			'		{"no evidence, no update: an empty results slice returns the prior unchanged",',
			'			"0.0100",',
			'			func() string { return f4(SequentialUpdate(prior, sens, spec, nil)) }},',
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
			'// Posterior is Bayes\' rule specialized to a binary test. Naming the',
			'// two branches makes the structure visible: the posterior is simply',
			'// the true-positive path\'s share of all paths that produce a "+".',
			'// This is the odds-form bookkeeping every diagnostic calculator does.',
			'func Posterior(prior, sens, spec float64) float64 {',
			'	// Path 1: sick, and the test caught it.',
			'	truePos := prior * sens',
			'	// Path 2: healthy, and the test misfired. 1−spec is the',
			'	// false-positive rate — the number the base-rate fallacy forgets',
			'	// to multiply by the (huge) healthy population.',
			'	falsePos := (1 - prior) * (1 - spec)',
			'	// Normalize: given that a "+" happened, which path produced it?',
			'	return truePos / (truePos + falsePos)',
			'}',
			'',
			'// PosteriorNeg is the same computation conditioned on a "−". Not',
			'// 1 − Posterior(...): a negative is DIFFERENT evidence, not the',
			'// absence of evidence, and it carries its own two paths.',
			'func PosteriorNeg(prior, sens, spec float64) float64 {',
			'	// Path 1: sick, but the test missed (the false negative).',
			'	falseNeg := prior * (1 - sens)',
			'	// Path 2: healthy, and the test correctly cleared.',
			'	trueNeg := (1 - prior) * spec',
			'	return falseNeg / (falseNeg + trueNeg)',
			'}',
			'',
			'// SequentialUpdate is Bayesian updating as a fold: belief is an',
			'// accumulator, each result is an update step, and the posterior of',
			'// step i is the prior of step i+1. The independence assumption is',
			'// what licenses the chaining — correlated retests (same lab, same',
			'// interfering antibody) would double-count evidence and overshoot.',
			'func SequentialUpdate(prior, sens, spec float64, results []bool) float64 {',
			'	belief := prior',
			'	for _, positive := range results {',
			'		if positive {',
			'			belief = Posterior(belief, sens, spec)',
			'		} else {',
			'			belief = PosteriorNeg(belief, sens, spec)',
			'		}',
			'	}',
			'	// Empty slice: the loop never runs and the prior passes through',
			'	// untouched — no evidence, no update, by construction.',
			'	return belief',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the intuition fails, precisely</h3>' +
			'<p>The physicians who answered “95%” were reporting P(+ | disease) ' +
			'when the question asked for P(disease | +) — the classic transposed ' +
			'conditional. The two differ by exactly the ratio of base rates, and ' +
			'at 1% prevalence that ratio is brutal: the healthy crowd is 99× the ' +
			'sick one, so its 5% misfire rate produces 495 false positives against ' +
			'99 true ones. Gigerenzer’s repair wasn’t teaching doctors the formula ' +
			'— it was the <em>natural frequency</em> reframing in the diagram: ' +
			'stated as counts of 10,000 people, the same physicians mostly got it ' +
			'right. When you must reason under pressure, convert to counts.</p>' +
			'<h3>The same math runs your inbox</h3>' +
			'<p>Paul Graham’s “A Plan for Spam” (2002) made naive-Bayes filtering ' +
			'famous: each token in a message is a little diagnostic test for ' +
			'spam, and the filter chains them exactly like your ' +
			'<code>SequentialUpdate</code> — posterior in, posterior out. ' +
			'Production systems work in log-odds so the chained multiplications ' +
			'become additions (no underflow after a thousand tokens), but it is ' +
			'the same fold. The independence assumption is false there too — ' +
			'“viagra” and “pills” co-occur — which is why it’s called ' +
			'<em>naive</em> Bayes, and why it still works: correlated evidence ' +
			'overshoots confidence but usually not the decision boundary.</p>' +
			'<h3>Priors are the whole argument</h3>' +
			'<p>Notice what the theorem makes explicit: the same test result means ' +
			'different things for different priors. A positive screen in a ' +
			'symptomatic patient (prior maybe 30%) means ~86%, not 16.7%. This is ' +
			'the statistical argument against mass screening for rare conditions ' +
			'— at a low enough base rate, almost every alarm is false, which is ' +
			'also the on-call engineer’s lament: a 99.9%-accurate alert on a ' +
			'service that fails once a year still pages you mostly for nothing. ' +
			'Raising the prior (test the symptomatic; alert on correlated ' +
			'signals) beats raising sensitivity. The next problems make the prior ' +
			'itself a distribution — that’s the Beta-Binomial item at the end of ' +
			'this track.</p>',
		],
		complexity: { time: 'O(k) — one constant-time update per test result', space: 'O(1)' },
	});
})();
