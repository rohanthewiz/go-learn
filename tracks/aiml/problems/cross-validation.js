/* Cross-Validation & the Overfitting Gap — Data Craft & Evaluation (Medium).
 * Deterministic contiguous k-fold splits, a tiny 1-D kNN as the model pair
 * (k=1 memorizer vs k=3 smoother), resubstitution TrainScore, and
 * CrossValScore as the mean of per-fold accuracies. The harness pins the
 * split shape and its disjoint/complete property, the memorizer's perfect
 * train score vs its 0.5 CV score (the gap), and CV correctly selecting k=3.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// k-fold rotation: every row is one training run; the shaded block is
	// the fold held out for validation that round. Pure rects and text — no
	// <defs> ids, so nothing to collide across the page's shared namespace
	// (per-item suffix would be AICV if any were added).
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 220" width="520" height="220" role="img" aria-label="four rows of four blocks; in each row a different block is shaded as the validation fold while the rest train; the final score is the mean of the four validation scores">' +
		'<text x="20" y="22" class="lbl">k-fold (k=4): every row is a full train/validate run — the held-out fold rotates</text>' +
		'<rect x="120" y="40" width="85" height="26" fill="var(--warn)" fill-opacity="0.25" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="210" y="40" width="85" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<rect x="300" y="40" width="85" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<rect x="390" y="40" width="85" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<text x="110" y="58" text-anchor="end" class="lbl">run 1</text>' +
		'<rect x="120" y="76" width="85" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<rect x="210" y="76" width="85" height="26" fill="var(--warn)" fill-opacity="0.25" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="300" y="76" width="85" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<rect x="390" y="76" width="85" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<text x="110" y="94" text-anchor="end" class="lbl">run 2</text>' +
		'<rect x="120" y="112" width="85" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<rect x="210" y="112" width="85" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<rect x="300" y="112" width="85" height="26" fill="var(--warn)" fill-opacity="0.25" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="390" y="112" width="85" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<text x="110" y="130" text-anchor="end" class="lbl">run 3</text>' +
		'<rect x="120" y="148" width="85" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<rect x="210" y="148" width="85" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<rect x="300" y="148" width="85" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<rect x="390" y="148" width="85" height="26" fill="var(--warn)" fill-opacity="0.25" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="110" y="166" text-anchor="end" class="lbl">run 4</text>' +
		'<text x="120" y="192" class="lbl"><tspan style="fill:var(--accent)">outlined = train</tspan>   <tspan style="fill:var(--warn)">shaded = validation</tspan></text>' +
		'<text x="20" y="212" class="lbl">CV score = mean of the k validation-fold scores — every example validates exactly once</text>' +
		'</svg>';

	T.problem({
		id: 'cross-validation',
		title: 'Cross-Validation & the Overfitting Gap',
		nav: 'cross-validation',
		difficulty: 'Medium',
		category: 'Data Craft & Evaluation',
		task: 'Implement KFoldSplits, a tiny 1-D kNN, TrainScore, and CrossValScore — and watch a memorizer ace training and flunk validation.',

		prose: [
			'<h2>Cross-Validation &amp; the Overfitting Gap</h2>' +
			'<p>A teammate reports a new classifier at <strong>100% accuracy</strong>. ' +
			'The model is 1-nearest-neighbor and the evaluation ran on the training ' +
			'set — where every point&rsquo;s nearest neighbor at distance zero is ' +
			'<em>itself</em>. The metric measured memory, not learning. Scoring on ' +
			'training data (the <em>resubstitution</em> score) always flatters, and ' +
			'it flatters most exactly when the model has overfit worst. The honest ' +
			'question is: how does the model do on data it never saw?</p>' +
			'<p><strong>k-fold cross-validation</strong> answers it without burning ' +
			'a big held-out set: split the n examples into k folds; for each fold, ' +
			'train on the other k&#8722;1 and score on the held-out fold; report the ' +
			'mean of the k validation scores. Every example gets used for training ' +
			'AND validated exactly once — just never in the same run.</p>' +
			DIAGRAM +
			'<p>To keep every answer exactly reproducible, this item pins the ' +
			'split rule (real CV shuffles first — see the explanation for why and ' +
			'when it must NOT):</p>' +
			'<ul>' +
			'<li><code>KFoldSplits(n, k)</code> returns k <em>contiguous</em> index ' +
			'folds in order: n/k indices each, with the first n%k folds taking one ' +
			'extra. So (n=10, k=3) &#8594; sizes 4,3,3 &#8594; ' +
			'<code>[0 1 2 3] [4 5 6] [7 8 9]</code>. Out-of-range k (k &#8804; 0 or ' +
			'k &gt; n) returns nil.</li>' +
			'<li>The model pair is a 1-D kNN classifier. ' +
			'<code>KNNPredict</code> ranks training points by ' +
			'(|x&#7488;&#691;&#7481;&#7482;&#8722;x| ascending, then index ascending — ' +
			'the tie rule that keeps it deterministic), takes the first ' +
			'kNeighbors (all of them if kNeighbors &gt; n), and majority-votes; a ' +
			'vote tie picks the smallest label. kNeighbors=1 is the ' +
			'<em>memorizer</em>; kNeighbors=3 must convince two neighbors to agree ' +
			'— it smooths over noise.</li>' +
			'<li><code>TrainScore</code> predicts every training point using the ' +
			'full training set itself (self-match included — that is the point). ' +
			'<code>CrossValScore</code> is the mean of per-fold validation ' +
			'accuracies over <code>KFoldSplits</code> folds.</li>' +
			'</ul>' +
			'<h3>The worked gap</h3>' +
			'<p>The dataset: 12 points in a pinned (unsorted) collection order, ' +
			'label 1 iff x &gt; 6.5, with two noisy flips at x=3 and x=10 — the ' +
			'kind of label noise every real dataset has:</p>',
			{ lang: 'txt', code: 'x:  7  1 10  4 12  3  6  9  2 11  5  8    (pinned collection order)\ny:  1  0  0  0  1  1  0  1  0  1  0  1    (1 iff x > 6.5; noise at x=3, x=10)\n\nfolds (n=12, k=4): [0 1 2] [3 4 5] [6 7 8] [9 10 11]\nTrainScore(k=1) = 12/12 = 1.0000          ← the memorizer aces its own data\nCV(k=1) = mean(1/3, 2/3, 1/3, 2/3) = 0.5000   ← the overfitting gap\nCV(k=3) = mean(2/3, 2/3, 3/3, 3/3) = 0.8333   ← smoothing wins on unseen data' },
			'<div class="tip">The gap IS the diagnosis: train score &#8811; ' +
			'validation score means variance (overfitting — simplify or get more ' +
			'data); both low means bias (underfitting — a richer model). And note ' +
			'k=3 scores <em>worse</em> than the memorizer on training data (0.8333 ' +
			'vs 1.0) while beating it where it counts. Optimizing train score ' +
			'would pick the wrong model every time.</div>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>KFoldSplits</code>, <code>KNNPredict</code>, ' +
			'<code>Accuracy</code>, <code>TrainScore</code>, and ' +
			'<code>CrossValScore</code> exactly as specified in the starter doc ' +
			'comments. The harness then uses YOUR CrossValScore to run the model ' +
			'selection k=1 vs k=3 and expects it to pick 3. Floats are compared as ' +
			'<code>%.4f</code> strings.</p>',
		],

		starter: [
			'package main',
			'',
			'// KFoldSplits partitions indices 0..n-1 into k contiguous folds,',
			'// returned in order. Sizes: every fold gets n/k indices, and the',
			'// FIRST n%k folds each take one extra. Example: (10, 3) -> [0 1 2 3]',
			'// [4 5 6] [7 8 9]. If k <= 0 or k > n, return nil.',
			'func KFoldSplits(n, k int) [][]int {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// KNNPredict classifies scalar x from 1-D training data by majority',
			'// vote among the kNeighbors nearest training points.',
			'// Determinism contract (test-relevant!):',
			'//   - rank training indices by (|trainX[i]-x| ascending, then index',
			'//     ascending for exact distance ties)',
			'//   - take the first kNeighbors (all of them if kNeighbors > n)',
			'//   - majority vote over their labels; a vote TIE picks the smallest',
			'//     label',
			'// Empty training data returns 0.',
			'func KNNPredict(trainX []float64, trainY []int, x float64, kNeighbors int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Accuracy returns the fraction of positions where yTrue[i] ==',
			'// yPred[i]. Empty input returns 0.',
			'func Accuracy(yTrue, yPred []int) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// TrainScore is the resubstitution score: predict EVERY point of',
			'// (xs, ys) with KNNPredict using the full (xs, ys) as training data —',
			'// each point may match itself at distance 0 — and return the accuracy.',
			'func TrainScore(xs []float64, ys []int, kNeighbors int) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// CrossValScore runs k-fold cross-validation: for each fold from',
			'// KFoldSplits(len(xs), kFolds), train on all OTHER indices (in their',
			'// original order) and predict the fold\'s points; return the MEAN of',
			'// the per-fold accuracies (folds may differ in size — average the',
			'// fold scores, not the pooled predictions). If KFoldSplits returns',
			'// nil, return 0.',
			'func CrossValScore(xs []float64, ys []int, kNeighbors, kFolds int) float64 {',
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
			'	// The prose dataset: values 1..12 in a pinned unsorted collection',
			'	// order; label = 1 iff x > 6.5, with noisy flips at x=3 and x=10.',
			'	xs := []float64{7, 1, 10, 4, 12, 3, 6, 9, 2, 11, 5, 8}',
			'	ys := []int{1, 0, 0, 0, 1, 1, 0, 1, 0, 1, 0, 1}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"KFoldSplits(10,3): the remainder goes one-extra-each to the FIRST n%k folds",',
			'			"[[0 1 2 3] [4 5 6] [7 8 9]]",',
			'			func() string { return fmt.Sprintf("%v", KFoldSplits(10, 3)) }},',
			'		{"KFoldSplits(12,4): even split, contiguous and in order",',
			'			"[[0 1 2] [3 4 5] [6 7 8] [9 10 11]]",',
			'			func() string { return fmt.Sprintf("%v", KFoldSplits(12, 4)) }},',
			'		{"property: KFoldSplits(13,5) — sizes [3 3 3 2 2], every index in exactly one fold",',
			'			"sizes=[3 3 3 2 2] cover=true",',
			'			func() string {',
			'				folds := KFoldSplits(13, 5)',
			'				sizes := make([]int, 0, len(folds))',
			'				count := make([]int, 13)',
			'				for _, fold := range folds {',
			'					sizes = append(sizes, len(fold))',
			'					for _, i := range fold {',
			'						if i >= 0 && i < 13 {',
			'							count[i]++',
			'						}',
			'					}',
			'				}',
			'				cover := true',
			'				for _, c := range count {',
			'					if c != 1 {',
			'						cover = false',
			'					}',
			'				}',
			'				return fmt.Sprintf("sizes=%v cover=%v", sizes, cover)',
			'			}},',
			'		{"kNN at x=2.9, k=1: trusts its single nearest neighbor — the noisy x=3",',
			'			"1",',
			'			func() string { return fmt.Sprintf("%d", KNNPredict(xs, ys, 2.9, 1)) }},',
			'		{"kNN at x=2.9, k=3: neighbors x=3,x=2,x=4 outvote the noise 2-1",',
			'			"0",',
			'			func() string { return fmt.Sprintf("%d", KNNPredict(xs, ys, 2.9, 3)) }},',
			'		{"tie discipline at x=6.5, k=2: distance tie -> lower index first; vote tie -> smaller label",',
			'			"0",',
			'			func() string { return fmt.Sprintf("%d", KNNPredict(xs, ys, 6.5, 2)) }},',
			'		{"resubstitution: the k=1 memorizer scores a perfect — and meaningless — 1.0 on its own data",',
			'			"1.0000",',
			'			func() string { return fmt.Sprintf("%.4f", TrainScore(xs, ys, 1)) }},',
			'		{"k=3 scores WORSE than the memorizer on training data (it refuses to memorize the noise)",',
			'			"0.8333",',
			'			func() string { return fmt.Sprintf("%.4f", TrainScore(xs, ys, 3)) }},',
			'		{"THE GAP: the memorizer\'s 1.0 train score collapses to 0.5 on held-out folds",',
			'			"0.5000",',
			'			func() string { return fmt.Sprintf("%.4f", CrossValScore(xs, ys, 1, 4)) }},',
			'		{"model selection: mean CV score picks the smoother k=3 over the memorizer",',
			'			"cv(k=1)=0.5000 cv(k=3)=0.8333 pick=3",',
			'			func() string {',
			'				cv1 := CrossValScore(xs, ys, 1, 4)',
			'				cv3 := CrossValScore(xs, ys, 3, 4)',
			'				pick := 1 // tie keeps the simpler (smaller-k) model',
			'				if cv3 > cv1 {',
			'					pick = 3',
			'				}',
			'				return fmt.Sprintf("cv(k=1)=%.4f cv(k=3)=%.4f pick=%d", cv1, cv3, pick)',
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
			'// KFoldSplits: contiguous, deterministic folds. base = n/k for all,',
			'// and the n%k leftover indices go one-each to the FIRST folds — the',
			'// same convention sklearn\'s KFold uses, and pinned here so every',
			'// learner produces byte-identical splits.',
			'func KFoldSplits(n, k int) [][]int {',
			'	if k <= 0 || k > n {',
			'		return nil',
			'	}',
			'	base := n / k',
			'	extra := n % k',
			'	folds := make([][]int, 0, k)',
			'	start := 0',
			'	for f := 0; f < k; f++ {',
			'		size := base',
			'		if f < extra {',
			'			size++',
			'		}',
			'		fold := make([]int, 0, size)',
			'		for i := start; i < start+size; i++ {',
			'			fold = append(fold, i)',
			'		}',
			'		folds = append(folds, fold)',
			'		start += size',
			'	}',
			'	return folds',
			'}',
			'',
			'// KNNPredict ranks ALL training indices by (distance, index) with an',
			'// insertion sort — no library sort, so the tie rule is explicit in',
			'// the comparison itself rather than buried in a comparator contract.',
			'// O(n^2) worst case is irrelevant at harness scale; determinism is',
			'// the design goal (an unstable sort with equal distances would make',
			'// the k-th neighbor platform-dependent).',
			'func KNNPredict(trainX []float64, trainY []int, x float64, kNeighbors int) int {',
			'	n := len(trainX)',
			'	if n == 0 {',
			'		return 0',
			'	}',
			'	if kNeighbors > n {',
			'		kNeighbors = n',
			'	}',
			'	order := make([]int, n)',
			'	for i := range order {',
			'		order[i] = i',
			'	}',
			'	for i := 1; i < n; i++ {',
			'		j := i',
			'		for j > 0 {',
			'			a, b := order[j-1], order[j]',
			'			da, db := math.Abs(trainX[a]-x), math.Abs(trainX[b]-x)',
			'			// Swap when strictly out of order OR when distances tie',
			'			// with indices inverted: (distance asc, index asc).',
			'			if da > db || (da == db && a > b) {',
			'				order[j-1], order[j] = order[j], order[j-1]',
			'				j--',
			'			} else {',
			'				break',
			'			}',
			'		}',
			'	}',
			'	// Tally votes among the first kNeighbors. The winner scan walks',
			'	// the NEIGHBOR list (deterministic order), never the map — map',
			'	// iteration order would silently break the vote-tie rule.',
			'	votes := map[int]int{}',
			'	for _, idx := range order[:kNeighbors] {',
			'		votes[trainY[idx]]++',
			'	}',
			'	best, bestVotes := 0, -1',
			'	for _, idx := range order[:kNeighbors] {',
			'		label := trainY[idx]',
			'		v := votes[label]',
			'		// Strictly more votes wins; equal votes fall to the smaller',
			'		// label — the documented tie-break.',
			'		if v > bestVotes || (v == bestVotes && label < best) {',
			'			best, bestVotes = label, v',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
			'// Accuracy: plain agreement rate. Kept as its own function because',
			'// both scores below are "accuracy of some prediction set" — the only',
			'// thing that differs is WHICH data the model was allowed to see.',
			'func Accuracy(yTrue, yPred []int) float64 {',
			'	if len(yTrue) == 0 {',
			'		return 0',
			'	}',
			'	correct := 0',
			'	for i := range yTrue {',
			'		if yTrue[i] == yPred[i] {',
			'			correct++',
			'		}',
			'	}',
			'	return float64(correct) / float64(len(yTrue))',
			'}',
			'',
			'// TrainScore deliberately commits the sin this item warns about:',
			'// every query point is present in its own training set, so with',
			'// kNeighbors=1 the nearest neighbor is the point itself at distance',
			'// 0 and the score is 1.0 by construction. That inevitability — not a',
			'// bug — is why resubstitution can never certify a model.',
			'func TrainScore(xs []float64, ys []int, kNeighbors int) float64 {',
			'	preds := make([]int, len(xs))',
			'	for i, x := range xs {',
			'		preds[i] = KNNPredict(xs, ys, x, kNeighbors)',
			'	}',
			'	return Accuracy(ys, preds)',
			'}',
			'',
			'// CrossValScore: each fold takes one turn as unseen data. Note the',
			'// mean is over FOLD accuracies, not pooled predictions — with unequal',
			'// fold sizes the two disagree, so the contract pins one (this is',
			'// also what sklearn\'s cross_val_score().mean() computes).',
			'func CrossValScore(xs []float64, ys []int, kNeighbors, kFolds int) float64 {',
			'	folds := KFoldSplits(len(xs), kFolds)',
			'	if folds == nil {',
			'		return 0',
			'	}',
			'	total := 0.0',
			'	for _, fold := range folds {',
			'		// inFold marks the held-out indices; training data is every',
			'		// OTHER index in original order (order matters: the kNN',
			'		// distance-tie rule references training indices).',
			'		inFold := make(map[int]bool, len(fold))',
			'		for _, i := range fold {',
			'			inFold[i] = true',
			'		}',
			'		trainX := make([]float64, 0, len(xs)-len(fold))',
			'		trainY := make([]int, 0, len(xs)-len(fold))',
			'		for i := range xs {',
			'			if !inFold[i] {',
			'				trainX = append(trainX, xs[i])',
			'				trainY = append(trainY, ys[i])',
			'			}',
			'		}',
			'		foldTrue := make([]int, 0, len(fold))',
			'		foldPred := make([]int, 0, len(fold))',
			'		for _, i := range fold {',
			'			foldTrue = append(foldTrue, ys[i])',
			'			foldPred = append(foldPred, KNNPredict(trainX, trainY, xs[i], kNeighbors))',
			'		}',
			'		total += Accuracy(foldTrue, foldPred)',
			'	}',
			'	return total / float64(len(folds))',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What real CV adds to what you built</h3>' +
			'<p>Three upgrades matter in practice. <strong>Shuffling:</strong> ' +
			'sklearn&rsquo;s <code>KFold(shuffle=True, random_state=...)</code> ' +
			'permutes indices before slicing, because contiguous folds on a file ' +
			'sorted by any feature (or by label — think a dataset exported as ' +
			'&ldquo;all positives, then all negatives&rdquo;) produce folds that ' +
			'are not representative and scores that swing wildly. This item ' +
			'pinned an unsorted collection order for determinism; re-run the ' +
			'split rule mentally on the same 12 points sorted by x and watch the ' +
			'fold accuracies crater — that experiment is worth doing. ' +
			'<strong>Stratification:</strong> <code>StratifiedKFold</code> ' +
			'preserves the class ratio inside every fold; with 12 samples and a ' +
			'near-even split it matters little, but at a 1:20 fraud rate an ' +
			'unstratified fold can easily contain zero positives, making its ' +
			'recall undefined and its accuracy a lie. <strong>Grouping:</strong> ' +
			'<code>GroupKFold</code> keeps all rows from one user/patient/session ' +
			'in the same fold — otherwise near-duplicate rows straddle the split ' +
			'and you have rebuilt the leakage bug from the scaling item at the ' +
			'row level.</p>' +
			'<h3>Time series: the one place shuffling is forbidden</h3>' +
			'<p>For temporal data, random k-fold trains on the future to predict ' +
			'the past — a leak that inflates every metric and evaporates in ' +
			'production. The honest scheme is walk-forward validation ' +
			'(<code>TimeSeriesSplit</code>): train on [0, t), validate on ' +
			'[t, t+h), slide forward. Folds are no longer symmetric and early ' +
			'folds train on less data; that asymmetry is the truth of the ' +
			'deployment, not a flaw. The tell that someone got this wrong: a ' +
			'demand-forecasting model whose offline MAPE doubles the week it ' +
			'ships.</p>' +
			'<h3>Selection pressure and the leaderboard</h3>' +
			'<p>The harness&rsquo;s final case — picking k=3 by CV score — is ' +
			'hyperparameter selection, and it quietly spends the validation ' +
			'signal: choose among enough configurations by CV and the winning ' +
			'score is optimistically biased, because you selected FOR high score ' +
			'on those folds. The honest report uses <strong>nested CV</strong> ' +
			'(an inner loop selects, an outer loop it never touched evaluates) — ' +
			'<code>GridSearchCV</code> inside <code>cross_val_score</code> in ' +
			'sklearn terms. The same mechanism at social scale is Kaggle ' +
			'leaderboard overfitting: thousands of submissions probing a fixed ' +
			'public test split amount to CV-selecting against it, which is why ' +
			'final standings on the private split regularly reshuffle — and why ' +
			'the overfitting gap you pinned (1.0 on train, 0.5 held out) is the ' +
			'single most useful diagnostic to keep on every model dashboard: ' +
			'train score and validation score, side by side, forever.</p>',
		],
		complexity: { time: 'O(kFolds · m · n²) for the toy kNN CV (each prediction re-ranks n points) — real CV cost is k × the model\'s training cost', space: 'O(n) per fold for the training copies' },
	});
})();
