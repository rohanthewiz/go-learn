/* Ensembles: Random Forests & Boosting — AI/ML: Classical Algorithms (Hard).
 * Two halves of the ensemble idea, built on this item's own depth-1 stumps.
 * (A) Bagging: bootstrap sampling via a pinned LCG (the constants are the
 * contract — one case pins the raw uniform stream), misclassification-
 * minimizing classification stumps, majority vote; the harness pins the
 * single-stump accuracy ceiling (0.8125) and the 15-stump forest beating it
 * (0.9375). (B) Gradient boosting for regression: SSE-minimizing stumps fit
 * to residuals, added with shrinkage nu; staged train MSE after 1/5/20
 * rounds and the nu=1.0 vs nu=0.1 pace difference are pinned as %.4f
 * strings. Fully deterministic — no math/rand anywhere.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// Bagging trains stumps in parallel on bootstrap copies and votes;
	// boosting chains stumps, each fit to what the running sum still gets
	// wrong. Marker id suffixed AIENS: all tracks' SVGs share one page
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 230" width="520" height="230" role="img" aria-label="left: bagging trains three stumps in parallel on bootstrap samples of the data and combines them by vote; right: boosting starts from the mean and adds shrunken stumps sequentially, each fit to the previous residuals">' +
		'<text x="130" y="24" text-anchor="middle" class="lbl">bagging: parallel, attacks variance</text>' +
		'<text x="390" y="24" text-anchor="middle" class="lbl">boosting: sequential, attacks bias</text>' +
		'<line x1="260" y1="14" x2="260" y2="216" stroke="currentColor" stroke-width="0.6" stroke-dasharray="3 4"/>' +
		// bagging panel
		'<rect x="90" y="38" width="80" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="130" y="58" text-anchor="middle">data</text>' +
		'<path d="M 112 72 C 90 88 62 96 50 104" fill="none" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowAIENS)"/>' +
		'<path d="M 130 72 L 130 104" fill="none" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowAIENS)"/>' +
		'<path d="M 148 72 C 170 88 198 96 210 104" fill="none" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowAIENS)"/>' +
		'<text x="130" y="94" text-anchor="middle" class="lbl">bootstrap samples (LCG)</text>' +
		'<rect x="15" y="108" width="70" height="28" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
		'<text x="50" y="127" text-anchor="middle" class="lbl">stump 1</text>' +
		'<rect x="95" y="108" width="70" height="28" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
		'<text x="130" y="127" text-anchor="middle" class="lbl">stump 2</text>' +
		'<rect x="175" y="108" width="70" height="28" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
		'<text x="210" y="127" text-anchor="middle" class="lbl">stump 3</text>' +
		'<path d="M 50 140 C 62 158 100 168 118 172" fill="none" stroke="var(--warn)" stroke-width="1.4" marker-end="url(#dgArrowAIENS)"/>' +
		'<path d="M 130 140 L 130 168" fill="none" stroke="var(--warn)" stroke-width="1.4" marker-end="url(#dgArrowAIENS)"/>' +
		'<path d="M 210 140 C 198 158 160 168 142 172" fill="none" stroke="var(--warn)" stroke-width="1.4" marker-end="url(#dgArrowAIENS)"/>' +
		'<rect x="95" y="172" width="70" height="28" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="130" y="191" text-anchor="middle">vote</text>' +
		// boosting panel
		'<rect x="278" y="96" width="60" height="32" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="308" y="117" text-anchor="middle">mean</text>' +
		'<path d="M 338 112 L 358 112" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#dgArrowAIENS)"/>' +
		'<rect x="360" y="96" width="60" height="32" rx="5" fill="none" stroke="currentColor" stroke-width="1.4"/>' +
		'<text x="390" y="117" text-anchor="middle">+ν·h₁</text>' +
		'<path d="M 420 112 L 440 112" fill="none" stroke="currentColor" stroke-width="1.4" marker-end="url(#dgArrowAIENS)"/>' +
		'<rect x="442" y="96" width="60" height="32" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="472" y="117" text-anchor="middle">+ν·h₂</text>' +
		'<text x="390" y="86" text-anchor="middle" class="lbl">each hₘ is fit to the residuals of the sum so far</text>' +
		'<text x="390" y="150" text-anchor="middle" class="lbl">shrinkage ν scales every correction:</text>' +
		'<text x="390" y="166" text-anchor="middle" class="lbl">small steps, many rounds</text>' +
		'<defs><marker id="dgArrowAIENS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="currentColor"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'ensembles-forests-boosting',
		title: 'Ensembles: Random Forests & Boosting',
		nav: 'ensembles',
		difficulty: 'Hard',
		category: 'Classical Algorithms',
		task: 'Implement LCG bootstrap sampling, classification stumps with bagged majority voting, and gradient boosting of regression stumps with shrinkage.',

		prose: [
			'<h2>Ensembles: Random Forests &amp; Boosting</h2>' +
			'<p>Your fraud tree scored 99% on training data and 71% in ' +
			'production. You retrain it a week later on nearly identical data and ' +
			'get a <em>structurally different tree</em> — new root split, new ' +
			'rules, new mistakes. That instability is <strong>variance</strong>, ' +
			'the signature failure of single trees, and the two fixes discovered ' +
			'for it power essentially every winning tabular-data model of the ' +
			'last two decades: average many overfit models trained in parallel ' +
			'(<strong>bagging</strong> → random forests), or chain many weak ' +
			'models trained in sequence, each correcting the last ' +
			'(<strong>boosting</strong> → XGBoost). You will build both from one ' +
			'shared part: the <em>decision stump</em>, a depth-1 tree that asks a ' +
			'single question — <code>x[f] &lt;= t ?</code> — and answers with one ' +
			'of two values.</p>' +
			'<h3>Half A — bagging: vote away the variance</h3>' +
			'<p>A <em>bootstrap sample</em> draws n rows from an n-row dataset ' +
			'<em>with replacement</em>: duplicates and omissions are the point ' +
			'(each draw misses ~36.8% of rows), because they give every stump a ' +
			'different view of the data. Real libraries roll dice; this track ' +
			'pins them. Randomness comes from an explicit LCG so every run has ' +
			'exactly one right answer:</p>',
			{ lang: 'go', code: 'state = state*1664525 + 1013904223 // uint32 arithmetic: wraps mod 2^32\nu = float64(state) / 4294967296.0  // uniform in [0,1), from the NEW state\nindex = int(u * float64(n))        // one bootstrap draw' },
			'<p>Each classification stump picks the (feature, threshold) that ' +
			'<em>misclassifies the fewest training rows</em>, labeling each side ' +
			'with its majority. (Real forests grow deep trees on Gini impurity; ' +
			'a stump minimizing errors keeps this item self-contained — and ' +
			'weak, which is exactly what makes the ensemble lesson visible.) The ' +
			'harness dataset has a <em>diagonal</em> boundary — fraud when amount ' +
			'and velocity are jointly high — which no single axis-aligned cut can ' +
			'match: the best stump caps out at 13/16 = 0.8125. Fifteen stumps, ' +
			'each trained on its own bootstrap sample and combined by majority ' +
			'vote, reach 0.9375: their cuts land at different thresholds on both ' +
			'features, and the vote traces a staircase along the diagonal that no ' +
			'individual voter can draw.</p>' +
			'<h3>Half B — boosting: additive corrections</h3>' +
			'<p>Boosting builds one strong model as a <em>sum</em> of weak ones. ' +
			'For regression under squared loss the recipe is beautifully plain — ' +
			'fit the errors, add a damped correction, repeat:</p>',
			{ lang: 'txt', code: 'F0(x) = mean(y)                       // start from the constant predictor\nrepeat for m = 1..rounds:\n  r_i  = y_i - F(x_i)                 // residuals: what F still gets wrong\n  h_m  = SSE-best stump fit to (x, r) // a weak model OF THE ERRORS\n  F    = F + nu * h_m                 // shrinkage nu damps each correction\n\nstep data (xs=1..8, three plateaus 1.1 / 4.0 / 8.0), nu = 0.5:\n  F0 = mean = 3.9125          train MSE 7.1611\n  after 1 round               train MSE 2.9842\n  after 5 rounds              train MSE 0.0600\n  after 20 rounds             train MSE 0.0024' },
			'<p>The first stump on the residuals splits at <code>x &lt;= 6.50</code> ' +
			'with values −1.3625 / +4.0875 — it fixes the biggest error (the top ' +
			'plateau) first, and later rounds chip at what remains. Shrinkage ' +
			'<code>nu</code> is the tension knob: <code>nu=1.0</code> devours the ' +
			'training residuals in a few rounds (and, on real data, the noise ' +
			'with them); <code>nu=0.1</code> creeps — after 5 rounds its train ' +
			'MSE is still 3.32 vs 0.0175 — but small steps plus many rounds is ' +
			'the combination that generalizes, and every serious boosting library ' +
			'defaults near <code>nu=0.1</code>.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the LCG (<code>LCGUniform</code>, ' +
			'<code>Bootstrap</code>), the classification side ' +
			'(<code>TrainStumpClf</code>, <code>PredictStumpClf</code>, ' +
			'<code>BaggedForest</code>, <code>PredictForest</code>) and the ' +
			'regression side (<code>TrainStumpReg</code>, ' +
			'<code>GradientBoost</code>). Every convention — tie-breaks, state ' +
			'threading, degenerate inputs — is pinned in the doc comments; the ' +
			'first harness case checks your raw LCG stream so a sampling bug ' +
			'cannot masquerade as a modeling bug.</p>' +
			'<div class="tip">Bagging and boosting fix <em>opposite</em> diseases. ' +
			'Averaging independent-ish overfit models cancels their ' +
			'uncorrelated errors — it reduces <strong>variance</strong> but can ' +
			'never fix a shared blind spot. Summing weak models adds expressive ' +
			'power step by step — it reduces <strong>bias</strong> but, run too ' +
			'long, happily fits noise. Diagnose which disease your model has ' +
			'before picking the cure.</div>',
		],

		starter: [
			'package main',
			'',
			'// LCGUniform advances the pinned linear congruential generator one step',
			'// and returns (newState, u):',
			'//',
			'//   newState = state*1664525 + 1013904223   (uint32: wraps mod 2^32)',
			'//   u        = float64(newState) / 4294967296.0   — in [0,1)',
			'//',
			'// Note u is computed from the NEW state, not the old one.',
			'func LCGUniform(state uint32) (uint32, float64) {',
			'	// your code here',
			'	return 0, 0',
			'}',
			'',
			'// Bootstrap draws a bootstrap sample: n indices in [0,n), each drawn as',
			'// int(u * float64(n)) from one LCGUniform step, threading the state',
			'// through all n draws. Returns the indices and the final state (so the',
			'// caller can keep drawing — duplicates and gaps are expected).',
			'func Bootstrap(n int, state uint32) ([]int, uint32) {',
			'	// your code here',
			'	return nil, 0',
			'}',
			'',
			'// TrainStumpClf fits a depth-1 classifier: the (feature, threshold)',
			'// cut minimizing the number of misclassified rows when each side',
			'// predicts its own majority label. Conventions:',
			'//   - scan features in index order; thresholds are the midpoints of',
			'//     consecutive sorted UNIQUE values, in increasing order',
			'//   - accept a candidate only on STRICTLY fewer errors (ties keep the',
			'//     first found: lowest feature, then lowest threshold)',
			'//   - each side\'s label is its majority; a tied vote -> smaller label',
			'//   - degenerate input (no feature has two distinct values): return',
			'//     (0, 0, m, m) where m is the overall majority label',
			'// Returns (feature, threshold, leftLabel, rightLabel); left is the',
			'// side with x[feature] <= threshold.',
			'func TrainStumpClf(X [][]float64, y []int) (int, float64, int, int) {',
			'	// your code here',
			'	return 0, 0, 0, 0',
			'}',
			'',
			'// PredictStumpClf answers the stump\'s one question: leftLabel when',
			'// x[feature] <= threshold, rightLabel otherwise.',
			'func PredictStumpClf(feature int, threshold float64, leftLabel int, rightLabel int, x []float64) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// BaggedForest trains nStumps stumps, each on its own bootstrap sample',
			'// of the n rows. The LCG state starts at seed and THREADS through the',
			'// stumps: stump 0 uses draws 1..n, stump 1 uses draws n+1..2n, and so',
			'// on. Returns four parallel slices (features, thresholds, leftLabels,',
			'// rightLabels), one entry per stump in training order.',
			'func BaggedForest(X [][]float64, y []int, nStumps int, seed uint32) ([]int, []float64, []int, []int) {',
			'	// your code here',
			'	return nil, nil, nil, nil',
			'}',
			'',
			'// PredictForest asks every stump for its vote and returns the majority',
			'// label; a tied vote -> the smallest label.',
			'func PredictForest(features []int, thresholds []float64, leftLabels []int, rightLabels []int, x []float64) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// TrainStumpReg fits a depth-1 regressor to 1-D data: the threshold',
			'// (a midpoint of consecutive sorted UNIQUE xs, in increasing order)',
			'// minimizing the total squared error when each side predicts its own',
			'// mean. Accept a candidate only on STRICTLY smaller SSE (ties keep the',
			'// lowest threshold). Degenerate input (fewer than two distinct xs):',
			'// return (xs[0], m, m) with m = mean(ys). Returns (threshold,',
			'// leftMean, rightMean); left is xs[i] <= threshold.',
			'func TrainStumpReg(xs []float64, ys []float64) (float64, float64, float64) {',
			'	// your code here',
			'	return 0, 0, 0',
			'}',
			'',
			'// GradientBoost runs gradient boosting for regression under squared',
			'// loss. Start every prediction at mean(ys); each round, fit',
			'// TrainStumpReg to the residuals ys[i] - pred[i] and add nu times the',
			'// stump\'s output to every prediction. Returns the final predictions',
			'// for the training xs (empty input -> empty slice).',
			'func GradientBoost(xs []float64, ys []float64, rounds int, nu float64) []float64 {',
			'	// your code here',
			'	return make([]float64, len(xs))',
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
			'	// Classification set: fraud when amount and velocity are JOINTLY',
			'	// high (label 1 iff x0+x1 > 6) — a diagonal boundary no single',
			'	// axis-aligned stump can match.',
			'	clfX := [][]float64{',
			'		{1, 1}, {2, 1}, {1, 3}, {3, 2}, {2, 4}, {4, 1}, {3, 3}, {1, 5},',
			'		{5, 4}, {4, 5}, {6, 2}, {2, 6}, {5, 5}, {6, 4}, {3, 6}, {6, 6},',
			'	}',
			'	clfY := []int{0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1}',
			'	// Regression set: three plateaus — the shape stumps love.',
			'	regX := []float64{1, 2, 3, 4, 5, 6, 7, 8}',
			'	regY := []float64{1.2, 1.0, 1.1, 3.8, 4.2, 4.0, 7.9, 8.1}',
			'	regMSE := func(pred []float64) float64 {',
			'		s := 0.0',
			'		for i := range regY {',
			'			d := pred[i] - regY[i]',
			'			s += d * d',
			'		}',
			'		return s / float64(len(regY))',
			'	}',
			'	clfAcc := func(predict func(x []float64) int) string {',
			'		correct := 0',
			'		for i := range clfX {',
			'			if predict(clfX[i]) == clfY[i] {',
			'				correct++',
			'			}',
			'		}',
			'		return fmt.Sprintf("%.4f", float64(correct)/float64(len(clfX)))',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"the pinned LCG, seed 42: state*1664525+1013904223 (uint32), u from the NEW state",',
			'			"u1=0.2523 u2=0.0881 u3=0.5773",',
			'			func() string {',
			'				s1, u1 := LCGUniform(42)',
			'				s2, u2 := LCGUniform(s1)',
			'				_, u3 := LCGUniform(s2)',
			'				return fmt.Sprintf("u1=%.4f u2=%.4f u3=%.4f", u1, u2, u3)',
			'			}},',
			'		{"bootstrap = n draws WITH replacement, index int(u*n): seed 7 repeats 7 and 0, skips 3 and 5",',
			'			"[1 7 4 7 0 6 2 0]",',
			'			func() string {',
			'				idx, _ := Bootstrap(8, 7)',
			'				return fmt.Sprintf("%v", idx)',
			'			}},',
			'		{"one stump on all 16 rows: the best single cut is amount <= 3.50",',
			'			"f=0 t=3.50 L=0 R=1",',
			'			func() string {',
			'				f, t, l, r := TrainStumpClf(clfX, clfY)',
			'				return fmt.Sprintf("f=%d t=%.2f L=%d R=%d", f, t, l, r)',
			'			}},',
			'		{"the single-stump ceiling: one axis cut cannot match a diagonal boundary",',
			'			"0.8125",',
			'			func() string {',
			'				f, t, l, r := TrainStumpClf(clfX, clfY)',
			'				return clfAcc(func(x []float64) int { return PredictStumpClf(f, t, l, r, x) })',
			'			}},',
			'		{"15 bagged stumps vote a staircase along the diagonal — past any single voter",',
			'			"0.9375",',
			'			func() string {',
			'				fs, ts, ls, rs := BaggedForest(clfX, clfY, 15, 42)',
			'				return clfAcc(func(x []float64) int { return PredictForest(fs, ts, ls, rs, x) })',
			'			}},',
			'		{"a tied vote goes to the smallest label (two handcrafted stumps disagree)",',
			'			"0",',
			'			func() string {',
			'				got := PredictForest([]int{0, 0}, []float64{5, 5}, []int{0, 1}, []int{0, 1}, []float64{1})',
			'				return fmt.Sprintf("%d", got)',
			'			}},',
			'		{"a regression stump minimizes SSE: the step data cuts at x <= 6.50, sides predict their means",',
			'			"t=6.50 L=2.5500 R=8.0000",',
			'			func() string {',
			'				t, l, r := TrainStumpReg(regX, regY)',
			'				return fmt.Sprintf("t=%.2f L=%.4f R=%.4f", t, l, r)',
			'			}},',
			'		{"boosting shrinks the residuals: train MSE after 1, 5, 20 rounds (nu=0.5, from 7.1611 at round 0)",',
			'			"mse1=2.9842 mse5=0.0600 mse20=0.0024",',
			'			func() string {',
			'				p1 := GradientBoost(regX, regY, 1, 0.5)',
			'				p5 := GradientBoost(regX, regY, 5, 0.5)',
			'				p20 := GradientBoost(regX, regY, 20, 0.5)',
			'				return fmt.Sprintf("mse1=%.4f mse5=%.4f mse20=%.4f", regMSE(p1), regMSE(p5), regMSE(p20))',
			'			}},',
			'		{"staged predictions at x=8 creep toward the target 8.1: F after 1, 5, 20 rounds (nu=0.5)",',
			'			"5.9563 7.6159 8.0721",',
			'			func() string {',
			'				p1 := GradientBoost(regX, regY, 1, 0.5)',
			'				p5 := GradientBoost(regX, regY, 5, 0.5)',
			'				p20 := GradientBoost(regX, regY, 20, 0.5)',
			'				return fmt.Sprintf("%.4f %.4f %.4f", p1[7], p5[7], p20[7])',
			'			}},',
			'		{"shrinkage is a brake: after 5 rounds nu=1.0 has devoured the train error, nu=0.1 has barely bitten",',
			'			"nu1.0=0.0175 nu0.1=3.3227",',
			'			func() string {',
			'				pFast := GradientBoost(regX, regY, 5, 1.0)',
			'				pSlow := GradientBoost(regX, regY, 5, 0.1)',
			'				return fmt.Sprintf("nu1.0=%.4f nu0.1=%.4f", regMSE(pFast), regMSE(pSlow))',
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
			'import "sort"',
			'',
			'// LCGUniform is the track\'s pinned dice: a linear congruential',
			'// generator with the classic Numerical Recipes constants. uint32',
			'// arithmetic wraps mod 2^32 for free, which IS the generator\'s',
			'// modulus — no explicit masking needed. Returning the new state makes',
			'// the caller thread it explicitly, so every random-looking draw in',
			'// this item is a pure function of the seed.',
			'func LCGUniform(state uint32) (uint32, float64) {',
			'	next := state*1664525 + 1013904223',
			'	// Divide by 2^32: maps the full uint32 range onto [0,1). The',
			'	// contract says u comes from the NEW state — deriving it from the',
			'	// old one would make the first draw of every seed identical junk.',
			'	return next, float64(next) / 4294967296.0',
			'}',
			'',
			'// Bootstrap: n draws with replacement. int(u*n) buckets [0,1) evenly',
			'// into indices 0..n-1. Duplicates and omissions are the FEATURE: on',
			'// average a bootstrap sample contains ~63.2% of distinct rows, so each',
			'// stump sees a genuinely different dataset — the decorrelation that',
			'// makes voting work.',
			'func Bootstrap(n int, state uint32) ([]int, uint32) {',
			'	idx := make([]int, 0, n)',
			'	s := state',
			'	for i := 0; i < n; i++ {',
			'		var u float64',
			'		s, u = LCGUniform(s)',
			'		idx = append(idx, int(u*float64(n)))',
			'	}',
			'	return idx, s',
			'}',
			'',
			'// majorityLabel returns the most frequent label. Counting into a dense',
			'// slice (labels are small non-negative ints) and scanning it in',
			'// ascending order with a strict > gives the documented tie-break —',
			'// smallest label — for free, with no map iteration (Go randomizes map',
			'// order per run; determinism is this track\'s design rule).',
			'func majorityLabel(labels []int) int {',
			'	maxLabel := 0',
			'	for _, l := range labels {',
			'		if l > maxLabel {',
			'			maxLabel = l',
			'		}',
			'	}',
			'	counts := make([]int, maxLabel+1)',
			'	for _, l := range labels {',
			'		counts[l]++',
			'	}',
			'	best := 0',
			'	for l, c := range counts {',
			'		if c > counts[best] {',
			'			best = l',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
			'// uniqueSorted returns the distinct values of vs in increasing order —',
			'// the raw material for midpoint thresholds. Midpoints between',
			'// consecutive distinct values enumerate every partition an axis cut',
			'// can produce; any other threshold duplicates one of them.',
			'func uniqueSorted(vs []float64) []float64 {',
			'	sorted := append([]float64(nil), vs...)',
			'	sort.Float64s(sorted)',
			'	uniq := sorted[:0]',
			'	for i, v := range sorted {',
			'		if i == 0 || v != sorted[i-1] {',
			'			uniq = append(uniq, v)',
			'		}',
			'	}',
			'	return uniq',
			'}',
			'',
			'// TrainStumpClf minimizes misclassification count directly — the',
			'// crudest split criterion there is, and exactly weak enough to make',
			'// the ensemble effect visible. (Deep trees use entropy or Gini, which',
			'// reward purity progress even when the majority label does not flip;',
			'// for a depth-1 tree whose only output IS the majority labels, raw',
			'// error count is an honest criterion.)',
			'func TrainStumpClf(X [][]float64, y []int) (int, float64, int, int) {',
			'	overall := majorityLabel(y)',
			'	bestFeature := 0',
			'	bestThreshold := 0.0',
			'	bestLeft, bestRight := overall, overall',
			'	bestErrs := len(y) + 1 // sentinel: any real split beats it',
			'	if len(X) == 0 {',
			'		return bestFeature, bestThreshold, bestLeft, bestRight',
			'	}',
			'	d := len(X[0])',
			'	for f := 0; f < d; f++ {',
			'		vals := make([]float64, 0, len(X))',
			'		for i := range X {',
			'			vals = append(vals, X[i][f])',
			'		}',
			'		uniq := uniqueSorted(vals)',
			'		for j := 0; j+1 < len(uniq); j++ {',
			'			t := (uniq[j] + uniq[j+1]) / 2.0',
			'			var yLeft, yRight []int',
			'			for i := range X {',
			'				if X[i][f] <= t {',
			'					yLeft = append(yLeft, y[i])',
			'				} else {',
			'					yRight = append(yRight, y[i])',
			'				}',
			'			}',
			'			// Midpoints of distinct values guarantee both sides are',
			'			// non-empty, so majorityLabel never sees an empty slice.',
			'			leftLabel := majorityLabel(yLeft)',
			'			rightLabel := majorityLabel(yRight)',
			'			errs := 0',
			'			for _, v := range yLeft {',
			'				if v != leftLabel {',
			'					errs++',
			'				}',
			'			}',
			'			for _, v := range yRight {',
			'				if v != rightLabel {',
			'					errs++',
			'				}',
			'			}',
			'			// STRICTLY fewer errors: ties keep the first candidate,',
			'			// pinning the (lowest feature, lowest threshold) contract.',
			'			if errs < bestErrs {',
			'				bestErrs = errs',
			'				bestFeature, bestThreshold = f, t',
			'				bestLeft, bestRight = leftLabel, rightLabel',
			'			}',
			'		}',
			'	}',
			'	// If no feature had two distinct values, the loop never ran and the',
			'	// degenerate (0, 0, majority, majority) defaults fall through.',
			'	return bestFeature, bestThreshold, bestLeft, bestRight',
			'}',
			'',
			'// PredictStumpClf: the whole model is one comparison.',
			'func PredictStumpClf(feature int, threshold float64, leftLabel int, rightLabel int, x []float64) int {',
			'	if x[feature] <= threshold {',
			'		return leftLabel',
			'	}',
			'	return rightLabel',
			'}',
			'',
			'// BaggedForest: the LCG state threads through ALL stumps — stump k',
			'// consumes draws kn+1..kn+n of the seed\'s stream. Re-seeding per stump',
			'// would hand every stump the same bootstrap sample, collapsing the',
			'// forest into one stump voting 15 times (a real bug class: parallel',
			'// workers all seeded with the same value).',
			'func BaggedForest(X [][]float64, y []int, nStumps int, seed uint32) ([]int, []float64, []int, []int) {',
			'	n := len(X)',
			'	features := make([]int, 0, nStumps)',
			'	thresholds := make([]float64, 0, nStumps)',
			'	leftLabels := make([]int, 0, nStumps)',
			'	rightLabels := make([]int, 0, nStumps)',
			'	state := seed',
			'	for s := 0; s < nStumps; s++ {',
			'		var idx []int',
			'		idx, state = Bootstrap(n, state)',
			'		sampleX := make([][]float64, 0, n)',
			'		sampleY := make([]int, 0, n)',
			'		for _, i := range idx {',
			'			sampleX = append(sampleX, X[i])',
			'			sampleY = append(sampleY, y[i])',
			'		}',
			'		f, t, l, r := TrainStumpClf(sampleX, sampleY)',
			'		features = append(features, f)',
			'		thresholds = append(thresholds, t)',
			'		leftLabels = append(leftLabels, l)',
			'		rightLabels = append(rightLabels, r)',
			'	}',
			'	return features, thresholds, leftLabels, rightLabels',
			'}',
			'',
			'// PredictForest: collect every stump\'s vote and take the majority.',
			'// majorityLabel\'s ascending scan supplies the documented tie rule.',
			'func PredictForest(features []int, thresholds []float64, leftLabels []int, rightLabels []int, x []float64) int {',
			'	votes := make([]int, 0, len(features))',
			'	for s := range features {',
			'		votes = append(votes, PredictStumpClf(features[s], thresholds[s], leftLabels[s], rightLabels[s], x))',
			'	}',
			'	return majorityLabel(votes)',
			'}',
			'',
			'// meanOf guards the empty slice so no harness input can divide by zero.',
			'func meanOf(vs []float64) float64 {',
			'	if len(vs) == 0 {',
			'		return 0.0',
			'	}',
			'	s := 0.0',
			'	for _, v := range vs {',
			'		s += v',
			'	}',
			'	return s / float64(len(vs))',
			'}',
			'',
			'// TrainStumpReg: same exhaustive midpoint scan, but the criterion is',
			'// total squared error and each side predicts its mean — the mean is',
			'// exactly the constant that minimizes SSE for its side, so for a given',
			'// threshold no better leaf values exist. This makes the stump the true',
			'// SSE-optimal depth-1 regressor, found by brute force.',
			'func TrainStumpReg(xs []float64, ys []float64) (float64, float64, float64) {',
			'	uniq := uniqueSorted(xs)',
			'	if len(uniq) < 2 {',
			'		// Degenerate: nothing to split on. Predict the global mean on',
			'		// both sides so the stump is still a usable (flat) model.',
			'		m := meanOf(ys)',
			'		t := 0.0',
			'		if len(xs) > 0 {',
			'			t = xs[0]',
			'		}',
			'		return t, m, m',
			'	}',
			'	bestThreshold, bestLeft, bestRight := 0.0, 0.0, 0.0',
			'	bestSSE := -1.0 // sentinel: first candidate always accepted',
			'	for j := 0; j+1 < len(uniq); j++ {',
			'		t := (uniq[j] + uniq[j+1]) / 2.0',
			'		var yLeft, yRight []float64',
			'		for i := range xs {',
			'			if xs[i] <= t {',
			'				yLeft = append(yLeft, ys[i])',
			'			} else {',
			'				yRight = append(yRight, ys[i])',
			'			}',
			'		}',
			'		leftMean, rightMean := meanOf(yLeft), meanOf(yRight)',
			'		sse := 0.0',
			'		for _, v := range yLeft {',
			'			sse += (v - leftMean) * (v - leftMean)',
			'		}',
			'		for _, v := range yRight {',
			'			sse += (v - rightMean) * (v - rightMean)',
			'		}',
			'		// Strict < keeps the lowest threshold on ties (thresholds are',
			'		// scanned in increasing order).',
			'		if bestSSE < 0 || sse < bestSSE {',
			'			bestSSE = sse',
			'			bestThreshold, bestLeft, bestRight = t, leftMean, rightMean',
			'		}',
			'	}',
			'	return bestThreshold, bestLeft, bestRight',
			'}',
			'',
			'// GradientBoost, squared-loss edition. The name is earned: the',
			'// residual y - F(x) IS the negative gradient of squared loss',
			'// (1/2)(y - F)^2 with respect to the prediction F, so "fit a stump to',
			'// the residuals and add it" is literally gradient descent in function',
			'// space — one stump-shaped step per round. Real gradient boosting',
			'// swaps in other losses (log-loss, Huber, quantile) by fitting stumps',
			'// to THEIR negative gradients instead; the loop does not change.',
			'func GradientBoost(xs []float64, ys []float64, rounds int, nu float64) []float64 {',
			'	n := len(xs)',
			'	pred := make([]float64, n)',
			'	if n == 0 {',
			'		return pred',
			'	}',
			'	// F0: the best constant predictor under squared loss is the mean.',
			'	base := meanOf(ys)',
			'	for i := range pred {',
			'		pred[i] = base',
			'	}',
			'	for m := 0; m < rounds; m++ {',
			'		resid := make([]float64, n)',
			'		for i := range resid {',
			'			resid[i] = ys[i] - pred[i]',
			'		}',
			'		t, leftVal, rightVal := TrainStumpReg(xs, resid)',
			'		// Shrinkage: nu scales the whole correction. Small nu means',
			'		// each stump fixes only part of the error it saw, leaving',
			'		// later rounds room to correct the corrections — the',
			'		// regularization that lets boosted models generalize.',
			'		for i := range pred {',
			'			if xs[i] <= t {',
			'				pred[i] += nu * leftVal',
			'			} else {',
			'				pred[i] += nu * rightVal',
			'			}',
			'		}',
			'	}',
			'	return pred',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Variance vs bias: why two opposite recipes both work</h3>' +
			'<p>Averaging k models whose errors were independent would cut error ' +
			'variance by a factor of k; bootstrap replicas are correlated, so the ' +
			'payoff is smaller but real — and it is pure variance reduction: the ' +
			'vote of 15 stumps can trace a staircase no single stump can, but ' +
			'only because their <em>individual</em> mistakes disagree. Breiman\'s ' +
			'random forest adds the second decorrelator this item omits: ' +
			'<strong>feature subsampling</strong>, considering only ~√d random ' +
			'features per split, so the trees cannot all agree on one dominant ' +
			'feature. Forests also ship a free honest metric: each tree\'s ' +
			'bootstrap misses ~36.8% of rows, and scoring every row only on trees ' +
			'that never saw it gives the <strong>out-of-bag estimate</strong> — ' +
			'cross-validation-quality feedback with zero extra training. Boosting ' +
			'is the mirror image: each stump is high-bias (yours caps at 0.8125 ' +
			'alone), but fitting the <em>residuals</em> means each round adds ' +
			'exactly the capacity the current model lacks. Run long enough it ' +
			'will fit noise — which is why shrinkage, early stopping on a ' +
			'validation set, and depth limits are not optional in practice.</p>' +
			'<h3>From your loop to XGBoost</h3>' +
			'<p>What you wrote is Friedman\'s 2001 gradient boosting machine with ' +
			'squared loss. The industrial descendants — <strong>XGBoost</strong>, ' +
			'<strong>LightGBM</strong>, <strong>CatBoost</strong> — keep the loop ' +
			'and industrialize the step: second-order (Newton) updates using both ' +
			'gradient and Hessian of an arbitrary loss, explicit L1/L2 ' +
			'regularization terms in the split criterion itself, histogram-binned ' +
			'thresholds (256 buckets instead of your every-midpoint scan — this ' +
			'is why LightGBM trains on 100M rows), leaf-wise rather than ' +
			'level-wise growth, and native handling of missing values and ' +
			'categoricals. On tabular data this family still routinely beats ' +
			'deep networks — trees natively capture sharp thresholds and ' +
			'high-order feature interactions that MLPs spend enormous capacity ' +
			'approximating — which is why "gradient-boosted trees" remains the ' +
			'default answer for fraud scores, credit risk, churn, and most ' +
			'Kaggle tabular leaderboards. In sklearn the names are ' +
			'<code>RandomForestClassifier</code>, ' +
			'<code>GradientBoostingRegressor</code>, and the LightGBM-style ' +
			'<code>HistGradientBoostingRegressor</code>; the knobs you now ' +
			'understand from the inside are <code>n_estimators</code> ' +
			'(nStumps/rounds), <code>learning_rate</code> (nu), and ' +
			'<code>max_depth</code>.</p>' +
			'<h3>Field notes</h3>' +
			'<p>Three lessons from this item recur in production postmortems. ' +
			'<em>Seed threading:</em> the forest case works only because the LCG ' +
			'state flows through all 15 stumps — the parallel-workers-all-seeded-' +
			'alike bug produces an ensemble of identical models that looks ' +
			'healthy and adds nothing, and it has shipped at real companies. ' +
			'<em>The learning-rate/rounds trade:</em> nu=1.0 reaching train MSE ' +
			'0.0175 in 5 rounds is not a win — on held-out data the nu=0.1 model ' +
			'given 10× the rounds almost always generalizes better; tune the ' +
			'pair together, never separately. <em>Ensembles are opaque:</em> you ' +
			'traded the single tree\'s auditability for accuracy — the previous ' +
			'item\'s compliance argument no longer holds, and explaining a ' +
			'500-tree model takes SHAP values or a distilled surrogate tree. ' +
			'When an interviewer asks "bagging vs boosting?", the crisp answer ' +
			'you can now defend with pinned numbers: bagging trains ' +
			'independently in parallel and votes to cut <em>variance</em>; ' +
			'boosting trains sequentially on residuals to cut <em>bias</em>; ' +
			'forests are hard to overfit with more trees, boosting is easy to ' +
			'overfit with more rounds.</p>',
		],
		complexity: { time: 'O(nStumps · n · d · u) to bag; O(rounds · n · u) to boost — each stump is an exhaustive scan of u midpoints per feature', space: 'O(nStumps + n) — four parallel slices of stump parameters plus per-round residuals' },
	});
})();
