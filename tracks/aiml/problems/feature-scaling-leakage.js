/* Feature Scaling & Data Leakage — Data Craft & Evaluation (Easy). The
 * unglamorous step that decides whether every distance- and gradient-based
 * model downstream works at all — and the classic way to cheat by accident:
 * fitting the scaler on data the model is later evaluated on. The harness
 * pins a worked mu/sigma, the leakage demo (train+test stats measurably shift
 * the test vectors), min-max under an outlier, and the one-hot
 * unknown-category rule.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// Fit on TRAIN only; apply to both. The red path — test rows feeding the
	// fit — is the leak. Marker ids namespaced (…AIFSL) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="scaler statistics are fit on the training rows only and then applied to both train and test; an arrow from the test rows into the fit is crossed out as leakage">' +
		'<text x="20" y="24" class="lbl">fit statistics on TRAIN only — then apply the frozen transform to both</text>' +
		'<rect x="40" y="44" width="150" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="115" y="69" text-anchor="middle">train rows</text>' +
		'<rect x="40" y="130" width="150" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<text x="115" y="155" text-anchor="middle">test rows</text>' +
		'<rect x="320" y="44" width="160" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="400" y="69" text-anchor="middle">fit: &#956;, &#963;</text>' +
		'<path d="M 190 64 L 313 64" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIFSL)"/>' +
		'<text x="252" y="56" text-anchor="middle" class="lbl">only source of stats</text>' +
		'<path d="M 400 84 C 400 150 260 150 197 150" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIFSL)"/>' +
		'<text x="368" y="140" text-anchor="middle" class="lbl">z = (x &#8722; &#956;) / &#963; applied to BOTH</text>' +
		'<path d="M 190 138 C 260 110 300 96 316 88" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="4 4" marker-end="url(#dgArrowWarnAIFSL)"/>' +
		'<text x="242" y="106" text-anchor="middle" style="fill:var(--warn)">&#10007; leakage</text>' +
		'<text x="20" y="198" class="lbl">test rows in the fit &#8594; test vectors shift &#8594; offline metrics inflate, production disappoints</text>' +
		'<defs>' +
		'<marker id="dgArrowAIFSL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowWarnAIFSL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'feature-scaling-leakage',
		title: 'Feature Scaling & Data Leakage',
		nav: 'scaling & leakage',
		difficulty: 'Easy',
		category: 'Data Craft & Evaluation',
		task: 'Implement MeanStd, Standardize, MinMax, and OneHot — fitting every statistic on the training rows only — and pin what leakage does to test vectors.',

		prose: [
			'<h2>Feature Scaling &amp; Data Leakage</h2>' +
			'<p>A churn model ships with an offline AUC of 0.91 and limps along at ' +
			'0.74 in production. The postmortem finds no bug in the model — the bug ' +
			'is one line <em>before</em> it: the feature scaler was fit on the full ' +
			'dataset and the train/test split happened afterwards. Every test row ' +
			'had already whispered its mean and spread into the transform, so the ' +
			'offline evaluation graded the model on data it had partially seen. ' +
			'That is <strong>data leakage</strong>, and preprocessing is where it ' +
			'sneaks in most often.</p>' +
			'<p>First, why scale at all? Distance-based models (kNN, k-means, SVMs) ' +
			'and anything trained by gradient descent care about the <em>units</em> ' +
			'of your columns: a salary-in-dollars column (spread ~50,000) will ' +
			'drown an age column (spread ~12) in every Euclidean distance and ' +
			'stretch the loss surface into a canyon that gradient descent zigzags ' +
			'through. Two standard fixes:</p>' +
			'<ul>' +
			'<li><strong>Standardization (z-score):</strong> ' +
			'<code>z = (x &#8722; &#956;) / &#963;</code> with the mean and the ' +
			'<em>population</em> standard deviation (divide by <code>n</code>, not ' +
			'<code>n&#8722;1</code> — the same convention sklearn&rsquo;s ' +
			'<code>StandardScaler</code> uses). A constant column has ' +
			'<code>&#963; = 0</code>: output 0 for every value rather than ' +
			'dividing by zero.</li>' +
			'<li><strong>Min-max:</strong> <code>(x &#8722; min) / (max &#8722; min)</code> ' +
			'maps the training range onto [0,&nbsp;1]. Do <em>not</em> clamp test ' +
			'values — a test point outside the training range should be allowed to ' +
			'land outside [0,&nbsp;1], because that is true information. If ' +
			'<code>max == min</code>, output 0. And note the fragility: one outlier ' +
			'owns the whole range and squashes everything else toward 0.</li>' +
			'</ul>' +
			'<p>Categorical columns get <strong>one-hot encoding</strong>: a vector ' +
			'with one slot per known category, 1.0 in the matching slot. The ' +
			'category list is <em>also</em> a fitted statistic — at inference time ' +
			'you will meet values that were not in training. Convention here: an ' +
			'unknown value encodes as the all-zeros vector (no slot lights up), ' +
			'never a crash.</p>' +
			DIAGRAM +
			'<h3>The leak, with numbers</h3>' +
			'<p>The harness works one feature end to end. Fit on train only, and ' +
			'the test values standardize one way; let the test rows into the fit ' +
			'and the same test values standardize to <em>different numbers</em> — ' +
			'which means every downstream metric was computed on vectors the ' +
			'production model will never see:</p>',
			{ lang: 'txt', code: 'train = [2 4 4 4 5 5 7 9]                test = [6 10]\nmu    = 40/8 = 5.0    sigma = sqrt(32/8) = 2.0        (TRAIN only)\ntest′ = [(6−5)/2  (10−5)/2] = [0.5000  2.5000]\n\nleaky fit on train+test: mu = 5.6, sigma = 2.3324\ntest′ = [0.1715  1.8865]   ← different vectors, inflated offline metrics' },
			'<div class="tip">The rule is bigger than scalers: <em>any</em> number ' +
			'computed from data — imputation means, vocabularies, target ' +
			'encodings, PCA components — is part of the model and must be fit on ' +
			'training data only, then frozen. If a statistic saw the test set, ' +
			'your evaluation did too.</div>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>MeanStd</code> (mean + population &#963;), ' +
			'<code>Standardize(train, test)</code> and <code>MinMax(train, test)</code> ' +
			'— both fit on <code>train</code> only and transform both slices — and ' +
			'<code>OneHot(categories, value)</code> with the unknown&#8594;zeros rule. ' +
			'The harness compares floats as <code>%.4f</code> strings.</p>',
		],

		starter: [
			'package main',
			'',
			'// MeanStd returns the mean and the POPULATION standard deviation of',
			'// values: sigma = sqrt( sum((x-mu)^2) / n ) — divide by n, not n-1',
			'// (the StandardScaler convention). Empty input returns (0, 0).',
			'func MeanStd(values []float64) (float64, float64) {',
			'	// your code here',
			'	return 0, 0',
			'}',
			'',
			'// Standardize fits mu/sigma on train ONLY and returns z-scored copies',
			'// of train and test: z = (x - mu) / sigma. If sigma == 0 (constant',
			'// feature), every output is 0 — never divide by zero.',
			'func Standardize(train, test []float64) ([]float64, []float64) {',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
			'// MinMax fits min/max on train ONLY and returns (x-min)/(max-min) for',
			'// both slices. Test values outside the training range are NOT clamped',
			'// (they may map below 0 or above 1). If max == min, every output is 0.',
			'func MinMax(train, test []float64) ([]float64, []float64) {',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
			'// OneHot encodes value against the fitted category list: a vector of',
			'// len(categories) with 1.0 at the index of value. A value not present',
			'// in categories yields the all-zeros vector (unknown at inference',
			'// time must not crash the pipeline).',
			'func OneHot(categories []string, value string) []float64 {',
			'	// your code here',
			'	return nil',
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
			'	// One feature, fit-worthy on paper: mu = 5, sigma = 2 exactly.',
			'	train := []float64{2, 4, 4, 4, 5, 5, 7, 9}',
			'	test := []float64{6, 10}',
			'	// The leaky variant: the scaler sees train AND test before the split.',
			'	combined := append(append([]float64{}, train...), test...)',
			'',
			'	fv := func(xs []float64) string {',
			'		parts := make([]string, 0, len(xs))',
			'		for _, v := range xs {',
			'			parts = append(parts, fmt.Sprintf("%.4f", v))',
			'		}',
			'		return strings.Join(parts, " ")',
			'	}',
			'	fh := func(xs []float64) string { // one-hot: integers read cleaner',
			'		parts := make([]string, 0, len(xs))',
			'		for _, v := range xs {',
			'			parts = append(parts, fmt.Sprintf("%.0f", v))',
			'		}',
			'		return strings.Join(parts, " ")',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"worked example: mean 5, POPULATION sigma 2 (divide by n, not n-1)",',
			'			"mu=5.0000 sigma=2.0000",',
			'			func() string {',
			'				mu, sigma := MeanStd(train)',
			'				return fmt.Sprintf("mu=%.4f sigma=%.4f", mu, sigma)',
			'			}},',
			'		{"standardized train: mean 0 and spread 1 by construction",',
			'			"-1.5000 -0.5000 -0.5000 -0.5000 0.0000 0.0000 1.0000 2.0000",',
			'			func() string {',
			'				trOut, _ := Standardize(train, test)',
			'				return fv(trOut)',
			'			}},',
			'		{"test standardized with TRAIN-ONLY stats — the correct pipeline",',
			'			"0.5000 2.5000",',
			'			func() string {',
			'				_, teOut := Standardize(train, test)',
			'				return fv(teOut)',
			'			}},',
			'		{"THE LEAK: fit on train+test and the same test rows become different vectors",',
			'			"0.1715 1.8865",',
			'			func() string {',
			'				_, teLeaky := Standardize(combined, test)',
			'				return fv(teLeaky)',
			'			}},',
			'		{"constant feature (sigma = 0): zeros out, never divides by zero",',
			'			"0.0000 0.0000",',
			'			func() string {',
			'				_, teOut := Standardize([]float64{3, 3, 3}, []float64{3, 7})',
			'				return fv(teOut)',
			'			}},',
			'		{"min-max: train range maps to [0,1]; test interpolates and may exceed 1",',
			'			"train: 0.0000 0.5000 1.0000 | test: 0.7500 1.2000",',
			'			func() string {',
			'				trOut, teOut := MinMax([]float64{0, 5, 10}, []float64{7.5, 12})',
			'				return "train: " + fv(trOut) + " | test: " + fv(teOut)',
			'			}},',
			'		{"one outlier owns the range: the four normal values squash into [0, 0.016]",',
			'			"0.0000 0.0105 0.0053 0.0158 1.0000",',
			'			func() string {',
			'				trOut, _ := MinMax([]float64{10, 12, 11, 13, 200}, []float64{15})',
			'				return fv(trOut)',
			'			}},',
			'		{"one-hot: a known category lights exactly one slot",',
			'			"0 1 0",',
			'			func() string {',
			'				return fh(OneHot([]string{"electronics", "clothing", "grocery"}, "clothing"))',
			'			}},',
			'		{"one-hot: a category unseen in training encodes as all zeros, not a crash",',
			'			"0 0 0",',
			'			func() string {',
			'				return fh(OneHot([]string{"electronics", "clothing", "grocery"}, "furniture"))',
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
			'// MeanStd computes the two statistics a standardizer "learns". The',
			'// population sigma (divide by n) is deliberate: the scaler describes',
			'// exactly the rows it saw, it is not estimating a wider population —',
			'// and it matches sklearn StandardScaler, so numbers cross-check.',
			'func MeanStd(values []float64) (float64, float64) {',
			'	if len(values) == 0 {',
			'		return 0, 0',
			'	}',
			'	sum := 0.0',
			'	for _, v := range values {',
			'		sum += v',
			'	}',
			'	mu := sum / float64(len(values))',
			'	// Two-pass variance: sum squared deviations from the already-known',
			'	// mean. Numerically safer than the one-pass E[x^2]-mu^2 form, which',
			'	// cancels catastrophically when values are large and close together.',
			'	sumSq := 0.0',
			'	for _, v := range values {',
			'		d := v - mu',
			'		sumSq += d * d',
			'	}',
			'	return mu, math.Sqrt(sumSq / float64(len(values)))',
			'}',
			'',
			'// applyZ maps one slice through a frozen (mu, sigma). Package-level',
			'// helper so Standardize stays a pure statement of the pipeline rule:',
			'// fit once on train, apply the SAME frozen transform everywhere.',
			'func applyZ(xs []float64, mu, sigma float64) []float64 {',
			'	out := make([]float64, len(xs))',
			'	for i, v := range xs {',
			'		// sigma == 0 means a constant feature: it carries no information,',
			'		// so 0 (the mean of any standardized column) is the safe encoding.',
			'		// The guard is exact — sigma is a true 0.0 here, not an epsilon.',
			'		if sigma == 0 {',
			'			out[i] = 0',
			'		} else {',
			'			out[i] = (v - mu) / sigma',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// Standardize is the whole leakage lesson in one signature: the fit',
			'// reads ONLY train; test is transformed with statistics it never',
			'// influenced. Pass a combined slice as "train" and you have exactly',
			'// reproduced the leak the harness pins.',
			'func Standardize(train, test []float64) ([]float64, []float64) {',
			'	mu, sigma := MeanStd(train)',
			'	return applyZ(train, mu, sigma), applyZ(test, mu, sigma)',
			'}',
			'',
			'// applyMinMax maps one slice through a frozen (min, span). No clamping:',
			'// a test value outside the training range landing outside [0,1] is',
			'// real signal (distribution shift), and hiding it would be a quiet lie.',
			'func applyMinMax(xs []float64, lo, span float64) []float64 {',
			'	out := make([]float64, len(xs))',
			'	for i, v := range xs {',
			'		if span == 0 {',
			'			out[i] = 0',
			'		} else {',
			'			out[i] = (v - lo) / span',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// MinMax fits the range on train only. Note what the harness shows:',
			'// min and max are the two LEAST robust statistics a dataset has — a',
			'// single outlier owns the denominator and crushes every normal value',
			'// toward 0. Standardization degrades more gracefully.',
			'func MinMax(train, test []float64) ([]float64, []float64) {',
			'	if len(train) == 0 {',
			'		return []float64{}, make([]float64, len(test))',
			'	}',
			'	lo, hi := train[0], train[0]',
			'	for _, v := range train {',
			'		if v < lo {',
			'			lo = v',
			'		}',
			'		if v > hi {',
			'			hi = v',
			'		}',
			'	}',
			'	return applyMinMax(train, lo, hi-lo), applyMinMax(test, lo, hi-lo)',
			'}',
			'',
			'// OneHot treats the category list as a fitted vocabulary. The unknown',
			'// value returns all zeros by DESIGN, not as a fallback: at inference',
			'// time new categories WILL appear, and the encoder must degrade to',
			'// "none of the known kinds" instead of panicking mid-request.',
			'func OneHot(categories []string, value string) []float64 {',
			'	out := make([]float64, len(categories))',
			'	for i, c := range categories {',
			'		if c == value {',
			'			out[i] = 1',
			'			break // categories are assumed unique; first match wins',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Leakage is a family, not a bug</h3>' +
			'<p>What you pinned — preprocessing statistics contaminated by test ' +
			'rows — is the mildest member of a family that has embarrassed teams at ' +
			'every scale:</p>' +
			'<ul>' +
			'<li><strong>Preprocessing leakage</strong> (this item): the scaler, ' +
			'imputer, vocabulary, or PCA saw the test set. Offline metrics inflate ' +
			'by a little — or a lot when the test rows include outliers that move ' +
			'the statistics.</li>' +
			'<li><strong>Target leakage:</strong> a feature encodes the label ' +
			'itself. The classic incident shape: a churn feature like ' +
			'<code>days_since_cancellation_call</code>, or a medical model where ' +
			'&ldquo;was given antibiotic X&rdquo; predicts the infection it is ' +
			'prescribed for. The model looks superhuman offline and is useless at ' +
			'decision time, because the feature does not exist yet when the ' +
			'prediction is needed.</li>' +
			'<li><strong>Temporal leakage:</strong> randomly splitting time-ordered ' +
			'data trains on Tuesday to predict Monday. Anything with trends ' +
			'(prices, demand, fraud patterns) grades wildly optimistic. The fix is ' +
			'splitting on time — the cross-validation item picks this up.</li>' +
			'</ul>' +
			'<h3>How the industry institutionalized the fix</h3>' +
			'<p>sklearn&rsquo;s answer is the <code>Pipeline</code>: chain ' +
			'<code>StandardScaler</code> (or any transformer) with the model into ' +
			'one object whose <code>fit</code> only ever sees training data, and ' +
			'whose <code>transform</code> replays the frozen statistics. The point ' +
			'is not convenience — it is that <code>cross_val_score(pipeline, X, y)</code> ' +
			'automatically <em>refits the scaler inside every fold</em>, which is ' +
			'nearly impossible to get right by hand and is exactly the discipline ' +
			'your <code>Standardize(train, test)</code> signature enforces: the ' +
			'fit target and the apply targets are different arguments, so the leak ' +
			'has to be visible in the call site to happen at all. Production ' +
			'feature stores push the same idea further: the scaler&rsquo;s ' +
			'<code>&#956;/&#963;</code> are versioned artifacts shipped with the ' +
			'model, so serving applies byte-identical statistics to what training ' +
			'fit.</p>' +
			'<h3>Field notes</h3>' +
			'<p>Not everything needs scaling: tree-based models (decision trees, ' +
			'random forests, gradient boosting) split on thresholds and are ' +
			'invariant to any monotone rescaling — one reason they are so forgiving ' +
			'on messy tabular data. Distance models and neural networks are the ' +
			'sensitive ones. When you suspect leakage in the wild, the tell is a ' +
			'gap that opens between offline and online metrics the day a model ' +
			'ships, or an offline score that is simply too good — a fraud AUC of ' +
			'0.999 is not a triumph, it is a subpoena to go read the feature ' +
			'pipeline. And the unknown-category rule you implemented is a real ' +
			'production contract: serving systems meet new categories constantly ' +
			'(new device models, new country codes), and the all-zeros convention ' +
			'is what keeps a novel value from becoming a 3 a.m. page.</p>',
		],
		complexity: { time: 'O(n) — each fit and transform is one or two passes over the slice', space: 'O(n) for the transformed copies' },
	});
})();
