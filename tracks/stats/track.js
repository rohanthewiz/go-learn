/* stats — Statistics from first principles: every formula as runnable Go.
 *
 * Statistics is usually taught as formulas to memorize and tables to look
 * up; here the learner IMPLEMENTS each one — Bessel's correction, the
 * t-statistic, the chi-square fold, the bootstrap loop — and the harness
 * pins the numbers a textbook (or R) would give. Implementing the formula
 * is the fastest way to stop confusing "standard deviation" with "standard
 * error", because the code makes you choose. The arc runs beginner to
 * advanced: describing data → probability → sampling & estimation →
 * hypothesis testing → modeling, resampling, and Bayesian updating.
 *
 * Determinism note: anything stochastic (bootstrap, CLT demos) uses a
 * small seeded LCG written in the problem itself — the harness must get
 * identical numbers in the browser and in verify, so math/rand (whose
 * default source could change across Go versions) is never used.
 *
 * Problems live in problems/<slug>.js and register through
 * GoLearnStats.problem(). HARNESS_RT is duplicated from the other tracks
 * on purpose: tracks are independent plugins, and sharing runtime snippets
 * across tracks would couple their load order.
 *
 * Curriculum (20 items): mean/median/mode → variance & spread → quartiles
 * & outliers → z-scores → covariance & correlation → probability rules →
 * Bayes → binomial & Poisson → the normal curve → sampling & the CLT →
 * confidence intervals → one-sample t → Welch's t → chi-square → power &
 * effect size → regression inference → one-way ANOVA → Mann-Whitney →
 * the bootstrap → Beta-Binomial Bayesian updating.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'stats',
		title: 'Statistics',
		runner: 'go-wasm',
		order: [
			// Describing Data
			'mean-median-mode', 'variance-spread', 'quartiles-outliers',
			'zscores-empirical-rule', 'covariance-correlation',
			// Probability
			'probability-rules', 'bayes-theorem', 'binomial-poisson', 'normal-distribution',
			// Sampling & Estimation
			'sampling-clt', 'confidence-intervals',
			// Hypothesis Testing
			'hypothesis-ttest', 'two-sample-welch', 'chi-square-independence', 'power-effect-size',
			// Modeling & Advanced
			'linear-regression-inference', 'anova-oneway', 'mann-whitney',
			'bootstrap-resampling', 'bayesian-beta-binomial',
		],
	});

	// Every harness splices this in, so every harness import block includes
	// fmt and encoding/json. runCase isolates one test: a panicking user
	// implementation records a failure for that case but the harness still
	// reports every result (the sentinel must always print).
	var HARNESS_RT = [
		'// runCase executes one test body, converting a panic into a failed case.',
		'func runCase(r map[string]any, body func()) {',
		'	defer func() {',
		'		if p := recover(); p != nil {',
		'			r["pass"] = false',
		'			r["got"] = fmt.Sprintf("panic: %v", p)',
		'		}',
		'	}()',
		'	body()',
		'}',
		'',
		'// emitResults prints the sentinel-delimited JSON block the UI parses.',
		'// Printed last, so user output can never spoof it (the parser splits',
		'// on the LAST marker).',
		'func emitResults(results []map[string]any) {',
		'	buf, _ := json.Marshal(results)',
		'	fmt.Println("\\n__GOLEARN_RESULTS__")',
		'	fmt.Println(string(buf))',
		'	fmt.Println("__GOLEARN_END__")',
		'}',
	].join('\n');

	// globalThis (not window) so the Node verification harness can load
	// track files unchanged.
	globalThis.GoLearnStats = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('stats', def);
		},
	};
})();
