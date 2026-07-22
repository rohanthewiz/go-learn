/* Precision, Recall & ROC-AUC — Data Craft & Evaluation (Medium). The
 * confusion matrix and the metrics built on it, plus rank-based ROC-AUC
 * (P(random positive outranks random negative), ties 0.5). The harness pins
 * the accuracy trap (95% accurate, catches nothing), a worked matrix,
 * harmonic-vs-arithmetic F1, AUC at 1.0 / 0.5 / a hand-worked tie case, and
 * AUC's invariance to monotone score transforms.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// The confusion matrix, with the two questions drawn on it: precision
	// reads down the predicted-positive column, recall reads across the
	// actual-positive row — and they share exactly one cell, TP. No <defs>
	// ids needed (no markers), so nothing to collide across tracks.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 220" width="520" height="220" role="img" aria-label="two-by-two confusion matrix; precision is TP over the predicted-positive column, recall is TP over the actual-positive row">' +
		'<text x="20" y="22" class="lbl">the four ways a binary prediction can land</text>' +
		'<text x="220" y="48" text-anchor="middle">predicted 1</text>' +
		'<text x="345" y="48" text-anchor="middle">predicted 0</text>' +
		'<text x="120" y="86" text-anchor="end">actual 1</text>' +
		'<text x="120" y="141" text-anchor="end">actual 0</text>' +
		'<rect x="160" y="60" width="120" height="50" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="220" y="90" text-anchor="middle">TP</text>' +
		'<rect x="285" y="60" width="120" height="50" fill="none" stroke="var(--accent)" stroke-width="1"/>' +
		'<text x="345" y="90" text-anchor="middle">FN (miss)</text>' +
		'<rect x="160" y="115" width="120" height="50" fill="none" stroke="var(--accent)" stroke-width="1"/>' +
		'<text x="220" y="145" text-anchor="middle">FP (false alarm)</text>' +
		'<rect x="285" y="115" width="120" height="50" fill="none" stroke="var(--accent)" stroke-width="1"/>' +
		'<text x="345" y="145" text-anchor="middle">TN</text>' +
		'<rect x="153" y="53" width="134" height="119" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="6 4"/>' +
		'<text x="220" y="192" text-anchor="middle" class="lbl" style="fill:var(--accent)">precision = TP / column</text>' +
		'<rect x="149" y="57" width="263" height="57" rx="6" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="6 4"/>' +
		'<text x="440" y="90" text-anchor="start" class="lbl" style="fill:var(--warn)">recall =</text>' +
		'<text x="440" y="104" text-anchor="start" class="lbl" style="fill:var(--warn)">TP / row</text>' +
		'<text x="20" y="214" class="lbl">accuracy = (TP+TN)/all — and on imbalanced data TN does almost all the talking</text>' +
		'</svg>';

	T.problem({
		id: 'classification-metrics',
		title: 'Precision, Recall & ROC-AUC',
		nav: 'metrics',
		difficulty: 'Medium',
		category: 'Data Craft & Evaluation',
		task: 'Implement Confusion, Precision, Recall, F1, and rank-based ROCAUC — and expose the 95%-accurate model that catches nothing.',

		prose: [
			'<h2>Precision, Recall &amp; ROC-AUC</h2>' +
			'<p>The fraud team demos a new model: &ldquo;95% accurate.&rdquo; ' +
			'Applause. Then someone asks how many of last month&rsquo;s frauds it ' +
			'caught, and the answer is <em>zero</em> — with fraud at 1 transaction ' +
			'in 20, a model that predicts &ldquo;legit&rdquo; for everything is 95% ' +
			'accurate and 100% useless. Accuracy measured the class balance, not ' +
			'the model. Every metric in this item exists to stop that meeting from ' +
			'happening to you.</p>' +
			'<p>Start from the <strong>confusion matrix</strong>. With the positive ' +
			'class labeled 1, each prediction lands in one of four cells: TP ' +
			'(predicted 1, was 1), FP (predicted 1, was 0 — false alarm), FN ' +
			'(predicted 0, was 1 — a miss), TN (predicted 0, was 0). From it:</p>' +
			'<ul>' +
			'<li><strong>Precision = TP / (TP + FP)</strong> — when we alarm, how ' +
			'often are we right? The metric of alert fatigue.</li>' +
			'<li><strong>Recall = TP / (TP + FN)</strong> — of the real positives, ' +
			'how many did we catch? The metric of what slips through.</li>' +
			'<li><strong>F1 = 2PR / (P + R)</strong> — the <em>harmonic</em> mean. ' +
			'Unlike the arithmetic mean, it collapses toward the worse of the two: ' +
			'a model with precision 1.0 and recall 0.1 averages 0.55 but scores F1 ' +
			'0.1818. You cannot buy back a terrible recall with a perfect ' +
			'precision.</li>' +
			'</ul>' +
			'<p>Convention (document-and-guard, not panic): any zero denominator — ' +
			'no predicted positives, no actual positives, P + R = 0 — returns 0.0.</p>' +
			DIAGRAM +
			'<h3>ROC-AUC: grading the ranking, not the threshold</h3>' +
			'<p>Precision and recall depend on where you set the alarm threshold. ' +
			'<strong>ROC-AUC</strong> grades the scores <em>before</em> any ' +
			'threshold: it is exactly the probability that a randomly chosen ' +
			'positive receives a higher score than a randomly chosen negative. ' +
			'That yields a direct implementation — compare every (positive, ' +
			'negative) pair: score a win as 1, a tie as 0.5, then divide by the ' +
			'number of pairs. Perfect ranking gives 1.0; a constant score (all ' +
			'ties) gives exactly 0.5 — the same as coin-flipping, because AUC ' +
			'measures <em>ordering</em> and a constant orders nothing. If either ' +
			'class is empty, return 0.5 (no pairs to judge). A worked run:</p>',
			{ lang: 'txt', code: 'yTrue = [1 0 1 1 0 0 0 1 0 0]\nyPred = [1 0 0 1 1 1 0 1 0 0]\n         TP=3  FP=2  FN=1  TN=4\nprecision = 3/5 = 0.6000     recall = 3/4 = 0.7500\nF1 = 2·0.6·0.75 / 1.35 = 0.6667\n\nAUC by pairs: yTrue=[0 0 1 1 0], scores=[0.1 0.4 0.35 0.8 0.35]\npositives {0.35, 0.8} × negatives {0.1, 0.4, 0.35} = 6 pairs\n0.35>0.1 ✓  0.35<0.4 ✗  0.35=0.35 half  0.8>all ✓✓✓  →  4.5/6 = 0.7500' },
			'<div class="tip">AUC only sees the <em>order</em> of the scores, so any ' +
			'monotone transform — doubling, adding 1, even a sigmoid — leaves it ' +
			'unchanged. That makes it robust for comparing models, and useless for ' +
			'judging whether a &ldquo;0.9&rdquo; from your model actually means 90% ' +
			'probable (that is calibration, a different audit).</div>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Confusion(yTrue, yPred)</code> returning ' +
			'(TP,&nbsp;FP,&nbsp;FN,&nbsp;TN) in that order, <code>Precision</code>, ' +
			'<code>Recall</code>, <code>F1</code>, and the pairwise ' +
			'<code>ROCAUC(yTrue, scores)</code>. Floats are compared as ' +
			'<code>%.4f</code> strings.</p>',
		],

		starter: [
			'package main',
			'',
			'// Confusion tallies binary predictions against truth. Labels are',
			'// ints; the positive class is 1, everything else counts as negative.',
			'// Returns (tp, fp, fn, tn) in exactly that order:',
			'//   tp: yTrue=1 yPred=1     fp: yTrue=0 yPred=1',
			'//   fn: yTrue=1 yPred=0     tn: yTrue=0 yPred=0',
			'// yTrue and yPred have equal length (the harness guarantees it).',
			'func Confusion(yTrue, yPred []int) (int, int, int, int) {',
			'	// your code here',
			'	return 0, 0, 0, 0',
			'}',
			'',
			'// Precision = tp / (tp + fp): of everything we flagged, how much was',
			'// real. Zero denominator (nothing flagged) returns 0.0.',
			'func Precision(tp, fp int) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Recall = tp / (tp + fn): of everything real, how much we caught.',
			'// Zero denominator (no actual positives) returns 0.0.',
			'func Recall(tp, fn int) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// F1 is the HARMONIC mean of precision and recall: 2pr / (p + r).',
			'// If p + r == 0, return 0.0.',
			'func F1(p, r float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// ROCAUC computes the area under the ROC curve by its probabilistic',
			'// definition: over every (positive, negative) index pair, count 1.0',
			'// when the positive\'s score is strictly higher, 0.5 on an exact tie,',
			'// 0 otherwise; divide by the number of pairs. yTrue holds 0/1 labels,',
			'// scores holds one real-valued score per example (higher = more',
			'// positive). If there are no positives or no negatives, return 0.5.',
			'func ROCAUC(yTrue []int, scores []float64) float64 {',
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
			'	// Worked example from the prose: 10 transactions, 4 real frauds.',
			'	yTrue := []int{1, 0, 1, 1, 0, 0, 0, 1, 0, 0}',
			'	yPred := []int{1, 0, 0, 1, 1, 1, 0, 1, 0, 0}',
			'',
			'	// The accuracy trap: 1 fraud in 20, model predicts all-negative.',
			'	trapTrue := make([]int, 20)',
			'	trapTrue[7] = 1',
			'	trapPred := make([]int, 20)',
			'',
			'	// AUC worked case with one tie (0.35 appears as a positive AND a',
			'	// negative score): 4.5 wins over 6 pairs = 0.75.',
			'	aucTrue := []int{0, 0, 1, 1, 0}',
			'	aucScores := []float64{0.1, 0.4, 0.35, 0.8, 0.35}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"worked confusion matrix: 3 caught, 2 false alarms, 1 missed, 4 correctly ignored",',
			'			"tp=3 fp=2 fn=1 tn=4",',
			'			func() string {',
			'				tp, fp, fn, tn := Confusion(yTrue, yPred)',
			'				return fmt.Sprintf("tp=%d fp=%d fn=%d tn=%d", tp, fp, fn, tn)',
			'			}},',
			'		{"precision and recall answer different questions about the same matrix",',
			'			"precision=0.6000 recall=0.7500",',
			'			func() string {',
			'				tp, fp, fn, _ := Confusion(yTrue, yPred)',
			'				return fmt.Sprintf("precision=%.4f recall=%.4f", Precision(tp, fp), Recall(tp, fn))',
			'			}},',
			'		{"THE ACCURACY TRAP: all-negative on 1-in-20 fraud is 95% accurate and catches nothing",',
			'			"accuracy=0.95 precision=0.0000 recall=0.0000",',
			'			func() string {',
			'				tp, fp, fn, tn := Confusion(trapTrue, trapPred)',
			'				acc := float64(tp+tn) / float64(len(trapTrue))',
			'				return fmt.Sprintf("accuracy=%.2f precision=%.4f recall=%.4f", acc, Precision(tp, fp), Recall(tp, fn))',
			'			}},',
			'		{"F1 of the worked matrix",',
			'			"0.6667",',
			'			func() string {',
			'				tp, fp, fn, _ := Confusion(yTrue, yPred)',
			'				return fmt.Sprintf("%.4f", F1(Precision(tp, fp), Recall(tp, fn)))',
			'			}},',
			'		{"harmonic beats arithmetic: precision 1.0 + recall 0.1 averages 0.55 but F1 collapses",',
			'			"0.1818",',
			'			func() string { return fmt.Sprintf("%.4f", F1(1.0, 0.1)) }},',
			'		{"F1 zero-denominator convention: p = r = 0 returns 0, not NaN",',
			'			"0.0000",',
			'			func() string { return fmt.Sprintf("%.4f", F1(0, 0)) }},',
			'		{"AUC = 1.0: every positive outranks every negative",',
			'			"1.0000",',
			'			func() string {',
			'				return fmt.Sprintf("%.4f", ROCAUC([]int{0, 0, 1, 1}, []float64{0.1, 0.2, 0.8, 0.9}))',
			'			}},',
			'		{"AUC = 0.5: a constant score ranks nothing — every pair is a tie worth 0.5",',
			'			"0.5000",',
			'			func() string {',
			'				return fmt.Sprintf("%.4f", ROCAUC([]int{0, 1, 0, 1}, []float64{0.5, 0.5, 0.5, 0.5}))',
			'			}},',
			'		{"hand-worked middle ground with one tied pair: 4.5 wins / 6 pairs",',
			'			"0.7500",',
			'			func() string { return fmt.Sprintf("%.4f", ROCAUC(aucTrue, aucScores)) }},',
			'		{"property: AUC is rank-based — a monotone transform (2s+1) changes nothing",',
			'			"0.7500 0.7500",',
			'			func() string {',
			'				transformed := make([]float64, len(aucScores))',
			'				for i, s := range aucScores {',
			'					transformed[i] = 2*s + 1',
			'				}',
			'				return fmt.Sprintf("%.4f %.4f", ROCAUC(aucTrue, aucScores), ROCAUC(aucTrue, transformed))',
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
			'// Confusion is one pass, four counters. Everything else in this item',
			'// is arithmetic on these four numbers — which is the real lesson:',
			'// precision, recall, F1, accuracy, FPR are all VIEWS of one matrix,',
			'// and reporting only one view is how the accuracy trap happens.',
			'func Confusion(yTrue, yPred []int) (int, int, int, int) {',
			'	tp, fp, fn, tn := 0, 0, 0, 0',
			'	for i := range yTrue {',
			'		switch {',
			'		case yTrue[i] == 1 && yPred[i] == 1:',
			'			tp++',
			'		case yTrue[i] != 1 && yPred[i] == 1:',
			'			fp++',
			'		case yTrue[i] == 1 && yPred[i] != 1:',
			'			fn++',
			'		default:',
			'			tn++',
			'		}',
			'	}',
			'	return tp, fp, fn, tn',
			'}',
			'',
			'// Precision: the denominator is what WE flagged, so an all-negative',
			'// model has no denominator at all. Returning 0 (not NaN, not a panic)',
			'// keeps downstream F1 math total — the sklearn zero_division=0',
			'// convention.',
			'func Precision(tp, fp int) float64 {',
			'	if tp+fp == 0 {',
			'		return 0',
			'	}',
			'	return float64(tp) / float64(tp+fp)',
			'}',
			'',
			'// Recall: the denominator is what is actually out there — the model',
			'// cannot shrink it by staying quiet. That asymmetry is why recall,',
			'// not accuracy, is the number that exposes the all-negative model.',
			'func Recall(tp, fn int) float64 {',
			'	if tp+fn == 0 {',
			'		return 0',
			'	}',
			'	return float64(tp) / float64(tp+fn)',
			'}',
			'',
			'// F1: harmonic, not arithmetic, by design. The harmonic mean of two',
			'// rates is dominated by the smaller one (2pr/(p+r) <= 2·min·1/1 =',
			'// 2·min), so a degenerate model cannot hide a near-zero recall behind',
			'// a perfect precision.',
			'func F1(p, r float64) float64 {',
			'	if p+r == 0 {',
			'		return 0',
			'	}',
			'	return 2 * p * r / (p + r)',
			'}',
			'',
			'// ROCAUC implements the probabilistic definition literally: the',
			'// fraction of (positive, negative) pairs the scores order correctly,',
			'// ties worth half. O(P·N) pairwise is fine at harness scale; real',
			'// libraries get the same number in O(n log n) by sorting and summing',
			'// ranks (AUC is the Mann-Whitney U statistic, rescaled).',
			'func ROCAUC(yTrue []int, scores []float64) float64 {',
			'	wins := 0.0',
			'	pairs := 0',
			'	for i := range yTrue {',
			'		if yTrue[i] != 1 {',
			'			continue',
			'		}',
			'		for j := range yTrue {',
			'			if yTrue[j] == 1 {',
			'				continue',
			'			}',
			'			pairs++',
			'			// Strict inequality matters: awarding ties a full point',
			'			// would let a constant scorer claim AUC 1.0.',
			'			if scores[i] > scores[j] {',
			'				wins += 1.0',
			'			} else if scores[i] == scores[j] {',
			'				wins += 0.5',
			'			}',
			'		}',
			'	}',
			'	// One-class inputs have no pairs to judge; 0.5 ("no evidence of',
			'	// ranking skill either way") is the safe, conventional answer.',
			'	if pairs == 0 {',
			'		return 0.5',
			'	}',
			'	return wins / float64(pairs)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Threshold metrics vs ranking metrics</h3>' +
			'<p>Precision, recall, and F1 are <em>threshold</em> metrics: they ' +
			'grade the model <em>plus</em> a decision rule. Move the threshold and ' +
			'the same model sweeps out a whole curve of (precision, recall) ' +
			'trade-offs — which is why serious evaluations plot the curve rather ' +
			'than report one point, and why &ldquo;we improved recall&rdquo; means ' +
			'nothing without &ldquo;at the same precision.&rdquo; ROC-AUC is the ' +
			'<em>ranking</em> metric: threshold-free, monotone-invariant (your ' +
			'property case), and therefore the standard single number for ' +
			'comparing scorers. Its blind spot is the flip side of its strength: ' +
			'it says nothing about where a usable threshold lives or whether the ' +
			'scores are calibrated probabilities. sklearn names for what you ' +
			'built: <code>confusion_matrix</code>, ' +
			'<code>precision_recall_fscore_support</code>, and ' +
			'<code>roc_auc_score</code> — the last computed via sorted ranks ' +
			'(Mann-Whitney U) instead of your O(P&middot;N) pair loop, but ' +
			'numerically the same definition, ties-at-0.5 included.</p>' +
			'<h3>Extreme imbalance: where ROC-AUC flatters</h3>' +
			'<p>On heavily imbalanced data, ROC-AUC can look great while the model ' +
			'is operationally poor. The false-positive <em>rate</em> divides by ' +
			'all negatives — a huge number — so a model can admit thousands of ' +
			'false alarms while FPR barely moves and the ROC curve hugs the ' +
			'corner. Precision divides by <em>your alerts</em>, so it feels every ' +
			'one of those false alarms. This is why fraud, intrusion, and ' +
			'rare-disease work reports <strong>PR-AUC</strong> (average precision) ' +
			'instead: under a 1:1000 base rate, PR-AUC collapses for a mediocre ' +
			'ranker while ROC-AUC still reads 0.95. Rule of thumb: the rarer and ' +
			'more expensive the positive class, the more you should distrust ROC ' +
			'and read the PR curve.</p>' +
			'<h3>What to say to stakeholders</h3>' +
			'<p>Never lead with accuracy — lead with the base rate, then two ' +
			'operational numbers: at the deployed threshold, <em>when we alarm, ' +
			'X% are real</em> (precision — the analysts&rsquo; workload), and ' +
			'<em>we catch Y% of what happens</em> (recall — the exposure). Those ' +
			'map to costs a business can weigh; F1 exists mostly to give ' +
			'optimization loops a single target, and its equal weighting of ' +
			'precision and recall is itself an assumption (F&#946; generalizes it ' +
			'when misses cost more than alarms, as in medicine). In incident ' +
			'reviews, the confusion matrix is the ground truth artifact: a ' +
			'quarter&rsquo;s worth of TP/FP/FN counts settles arguments that ' +
			'months of single-number dashboards started. And when a model&rsquo;s ' +
			'offline AUC is suspiciously perfect, revisit the previous item — ' +
			'leakage inflates ranking metrics just as happily as accuracy.</p>',
		],
		complexity: { time: 'O(n) for the matrix; O(P·N) pairwise for AUC (real libraries: O(n log n) via ranks)', space: 'O(1) beyond the inputs' },
	});
})();
