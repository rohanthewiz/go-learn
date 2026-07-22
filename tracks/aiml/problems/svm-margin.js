/* SVM: Margins & Hinge Loss — Classical Algorithms (Medium). A linear SVM
 * trained by full-batch subgradient descent on the regularized hinge loss.
 * The harness pins the hinge's three regimes (zero beyond the margin, linear
 * inside, exactly 1 on the boundary), the kink convention (points at or
 * beyond the margin contribute zero subgradient — the support-vector fact),
 * a hand-workable first training step, the trained separator on a pinned
 * blob dataset, and the measured lambda -> margin direction.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// Max-margin geometry: the decision line, the two margin lines at
	// distance 1/||w||, and the width 2/||w|| between them. Marker id
	// namespaced (dgArrowAISVM) — SVG ids share the page namespace across
	// every track.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 220" width="520" height="220" role="img" aria-label="two classes of points separated by a line, with dashed margin lines on both sides; the points touching the margin lines are the support vectors, and the distance between the margin lines is 2 over the norm of w">' +
		'<text x="20" y="22" class="lbl">of all separating lines, the SVM picks the one with the widest street</text>' +
		// decision boundary (diagonal) and margins
		'<line x1="150" y1="200" x2="330" y2="40" stroke="var(--accent)" stroke-width="2"/>' +
		'<line x1="105" y1="185" x2="275" y2="34" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="5 4"/>' +
		'<line x1="200" y1="212" x2="378" y2="52" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="5 4"/>' +
		// negative class (hollow circles, left)
		'<circle cx="70" cy="90" r="7" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<circle cx="95" cy="150" r="7" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<circle cx="140" cy="98" r="7" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="52" y="130" class="lbl">y = &minus;1</text>' +
		// positive class (filled, right)
		'<circle cx="420" cy="120" r="7" fill="var(--warn)"/>' +
		'<circle cx="452" cy="80" r="7" fill="var(--warn)"/>' +
		'<circle cx="405" cy="180" r="7" fill="var(--warn)"/>' +
		'<text x="440" y="160" class="lbl">y = +1</text>' +
		// support vectors ON the margin lines, highlighted with halos
		'<circle cx="140" cy="98" r="12" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="3 2"/>' +
		'<circle cx="300" cy="122" r="7" fill="var(--warn)"/>' +
		'<circle cx="300" cy="122" r="12" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="3 2"/>' +
		'<text x="285" y="152" class="lbl" style="fill:var(--warn)">support vectors: the only points that matter</text>' +
		// margin width arrow
		'<path d="M 196 120 L 245 164" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAISVM)"/>' +
		'<path d="M 245 164 L 196 120" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAISVM)"/>' +
		'<text x="130" y="178" class="lbl">width 2/&#8214;w&#8214;</text>' +
		'<text x="20" y="214" class="lbl">everything at margin distance or farther has ZERO hinge loss &mdash; and zero gradient</text>' +
		'<defs><marker id="dgArrowAISVM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'svm-margin',
		title: 'SVM: Margins & Hinge Loss',
		nav: 'SVM',
		difficulty: 'Medium',
		category: 'Classical Algorithms',
		task: 'Implement hinge loss, its subgradient, full-batch subgradient training of a linear SVM, the geometric margin 2/||w||, and sign prediction.',

		prose: [
			'<h2>SVM: Margins &amp; Hinge Loss</h2>' +
			'<p>Your abuse classifier is 99% accurate offline and melting down ' +
			'in production: real traffic sits <em>near</em> the decision ' +
			'boundary, where tiny feature noise flips predictions back and ' +
			'forth. Plenty of lines separate the training data perfectly &mdash; ' +
			'logistic regression picks one of them &mdash; but they are not ' +
			'equally safe. The support vector machine formalizes ' +
			'&ldquo;safe&rdquo;: among all separating hyperplanes, pick the one ' +
			'with the <strong>widest margin</strong>, the fattest street between ' +
			'the classes, so borderline points have the most room before noise ' +
			'flips them.</p>' +
			'<p>With labels <code>y &isin; {&minus;1, +1}</code> and score ' +
			'<code>s = w&middot;x + b</code>, the <strong>hinge loss</strong> ' +
			'makes that preference trainable:</p>' +
			'<p><code>hinge = max(0, 1 &minus; y&middot;s)</code></p>' +
			'<ul>' +
			'<li><code>y&middot;s &ge; 1</code>: correctly classified <em>with ' +
			'room to spare</em> &mdash; loss 0, and (unlike logistic loss) ' +
			'exactly 0, not merely small.</li>' +
			'<li><code>0 &le; y&middot;s &lt; 1</code>: right side, but inside ' +
			'the street &mdash; penalized linearly.</li>' +
			'<li><code>y&middot;s &lt; 0</code>: wrong side &mdash; penalized ' +
			'harder the wronger it is.</li>' +
			'</ul>' +
			'<p>The full objective adds L2 regularization, and shrinking ' +
			'<code>&#8214;w&#8214;</code> IS widening the street &mdash; the ' +
			'margin lines <code>w&middot;x + b = &plusmn;1</code> sit ' +
			'<code>2/&#8214;w&#8214;</code> apart:</p>' +
			'<p><code>L(w, b) = (&lambda;/2)&#8214;w&#8214;&sup2; + (1/n) ' +
			'&Sigma; max(0, 1 &minus; y<sub>i</sub>(w&middot;x<sub>i</sub> + ' +
			'b))</code></p>' +
			'<p>The hinge has a kink at <code>y&middot;s = 1</code>, so we ' +
			'descend the <em>subgradient</em>: where the loss is 0 (at or ' +
			'beyond the margin, <code>y&middot;s &ge; 1</code> &mdash; our ' +
			'pinned convention includes the kink itself) a sample contributes ' +
			'<strong>nothing</strong>; inside it contributes ' +
			'<code>(&minus;y&middot;x, &minus;y)</code>. That asymmetry is the ' +
			'famous fact about SVMs: comfortable points have zero gradient, so ' +
			'only the points at or violating the margin &mdash; the ' +
			'<em>support vectors</em> &mdash; shape the final boundary. Worked ' +
			'values with <code>w=(1,0), b=&minus;1</code> (boundary at ' +
			'x&#8320;=1, margins at x&#8320;=0 and x&#8320;=2):</p>',
			{ lang: 'txt', code: 'point      y     s = w.x+b   y*s    hinge = max(0, 1-y*s)\n(3, 0)    +1        2         2     0.0     beyond the margin\n(2, 0)    +1        1         1     0.0     ON the margin (the kink)\n(1.5, 0)  +1        0.5       0.5   0.5     inside the street\n(1, 0)    +1        0         0     1.0     on the decision boundary\n(0, 0)    +1       -1        -1     2.0     wrong side\n(0, 0)    -1       -1         1     0.0     right side for y=-1' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Hinge</code>, <code>HingeGrad</code> (per-sample ' +
			'subgradient, regularization NOT included), <code>TrainSVM</code> ' +
			'(full-batch: average the per-sample subgradients, add ' +
			'<code>&lambda;w</code> &mdash; b is not regularized &mdash; and ' +
			'step by <code>lr</code>, starting from zeros), ' +
			'<code>Margin</code>, and <code>PredictSVM</code>. Real SVM ' +
			'solvers use SMO on the dual (libsvm) or stochastic subgradients ' +
			'(Pegasos); we pin deterministic full-batch descent so every ' +
			'run &mdash; and every learner &mdash; lands on identical ' +
			'numbers.</p>' +
			'<div class="tip">First training step from w=0, b=0 is hand-' +
			'checkable: every margin is 0&middot;x+0 = 0 &lt; 1, so ALL points ' +
			'are active and the subgradient is just ' +
			'&minus;mean(y&middot;x) with &lambda;w = 0. One step at lr=0.1 on ' +
			'the harness data gives w = (0.1188, 0.1000) &mdash; if your first ' +
			'step disagrees, your averaging or sign is off, and no amount of ' +
			'extra steps will fix it.</div>',
		],

		starter: [
			'package main',
			'',
			'// Hinge returns the hinge loss of one sample: max(0, 1 - y*(w.x+b)),',
			'// where y is -1 or +1. Zero means "correct with at least margin',
			'// distance to spare"; 1 means "sitting exactly on the decision',
			'// boundary"; greater than 1 means the wrong side.',
			'func Hinge(w []float64, b float64, x []float64, y float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// HingeGrad returns the subgradient (gw, gb) of that single-sample',
			'// hinge loss, WITHOUT any regularization term:',
			'//',
			'//   y*(w.x+b) >= 1 (at or beyond the margin, kink included):',
			'//       gw = all zeros, gb = 0 — the sample contributes NOTHING',
			'//   y*(w.x+b) <  1 (inside the street or wrong side):',
			'//       gw[i] = -y * x[i],  gb = -y',
			'func HingeGrad(w []float64, b float64, x []float64, y float64) ([]float64, float64) {',
			'	// your code here',
			'	return []float64{}, 0',
			'}',
			'',
			'// TrainSVM minimizes  (lambda/2)*||w||^2 + (1/n)*sum_i hinge_i',
			'// by full-batch subgradient descent for `steps` iterations,',
			'// starting from w = zeros, b = 0. Each step:',
			'//',
			'//   gw = lambda*w + (1/n) * sum_i HingeGrad_i.gw',
			'//   gb =            (1/n) * sum_i HingeGrad_i.gb   (b unregularized)',
			'//   w -= lr*gw ;  b -= lr*gb',
			'//',
			'// Returns the trained (w, b). len(w) = len(X[0]).',
			'func TrainSVM(X [][]float64, y []float64, lambda, lr float64, steps int) ([]float64, float64) {',
			'	// your code here',
			'	return []float64{}, 0',
			'}',
			'',
			'// Margin returns the geometric width of the street: 2/||w||.',
			'// If ||w|| == 0 (untrained), return 0 — never divide by zero.',
			'func Margin(w []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// PredictSVM returns the predicted label of x: +1 if w.x+b >= 0,',
			'// else -1. A score of exactly 0 maps to +1 (documented convention).',
			'func PredictSVM(w []float64, b float64, x []float64) float64 {',
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
			'	// Reference weights for the worked hinge values in the prose:',
			'	// boundary at x0=1, margin lines at x0=0 and x0=2.',
			'	wRef := []float64{1, 0}',
			'	bRef := -1.0',
			'',
			'	// Pinned linearly separable blobs: +1 near (2.5, 2.5), -1 near',
			'	// the origin. Balanced 4 vs 4, so the first-step gb is 0.',
			'	X := [][]float64{',
			'		{2, 2}, {2.5, 2}, {2, 3}, {3, 2.5},',
			'		{0, 0}, {0.5, 0}, {0, 1}, {-0.5, 0.5},',
			'	}',
			'	y := []float64{1, 1, 1, 1, -1, -1, -1, -1}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"hinge is EXACTLY 0 beyond the margin (y*s=2) — comfortable points cost nothing",',
			'			"0.0000",',
			'			func() string { return fmt.Sprintf("%.4f", Hinge(wRef, bRef, []float64{3, 0}, 1)) }},',
			'		{"hinge at the kink itself (y*s=1): still 0 — the margin line is the last free spot",',
			'			"0.0000",',
			'			func() string { return fmt.Sprintf("%.4f", Hinge(wRef, bRef, []float64{2, 0}, 1)) }},',
			'		{"hinge on the decision boundary (s=0) is exactly 1",',
			'			"1.0000",',
			'			func() string { return fmt.Sprintf("%.4f", Hinge(wRef, bRef, []float64{1, 0}, 1)) }},',
			'		{"hinge grows linearly inside the street (y*s=0.5) and doubles on the wrong side (y*s=-1)",',
			'			"0.5000,2.0000",',
			'			func() string {',
			'				return fmt.Sprintf("%.4f,%.4f",',
			'					Hinge(wRef, bRef, []float64{1.5, 0}, 1),',
			'					Hinge(wRef, bRef, []float64{0, 0}, 1))',
			'			}},',
			'		{"subgradient property: a point at or beyond the margin contributes ZERO — only support vectors shape w",',
			'			"0.0000,0.0000,0.0000",',
			'			func() string {',
			'				gw, gb := HingeGrad(wRef, bRef, []float64{2, 0}, 1)',
			'				return fmt.Sprintf("%.4f,%.4f,%.4f", gw[0], gw[1], gb)',
			'			}},',
			'		{"subgradient inside the margin: (-y*x, -y) for x=(0.5,2), y=+1",',
			'			"-0.5000,-2.0000,-1.0000",',
			'			func() string {',
			'				gw, gb := HingeGrad(wRef, bRef, []float64{0.5, 2}, 1)',
			'				return fmt.Sprintf("%.4f,%.4f,%.4f", gw[0], gw[1], gb)',
			'			}},',
			'		{"first step from zeros (hand-checkable): all points active, w = lr*mean(y*x), gb = 0 on balanced classes",',
			'			"0.1188,0.1000,0.0000",',
			'			func() string {',
			'				w, b := TrainSVM(X, y, 0.01, 0.1, 1)',
			'				return fmt.Sprintf("%.4f,%.4f,%.4f", w[0], w[1], b)',
			'			}},',
			'		{"trained separator (lambda=0.01, lr=0.1, 200 steps): every training point classified correctly, plus two held-out points",',
			'			"true,1,-1",',
			'			func() string {',
			'				w, b := TrainSVM(X, y, 0.01, 0.1, 200)',
			'				allOK := true',
			'				for i := range X {',
			'					if PredictSVM(w, b, X[i]) != y[i] {',
			'						allOK = false',
			'					}',
			'				}',
			'				return fmt.Sprintf("%v,%.0f,%.0f", allOK,',
			'					PredictSVM(w, b, []float64{3, 3}),',
			'					PredictSVM(w, b, []float64{-1, 0}))',
			'			}},',
			'		{"lambda steers the street: heavier regularization shrinks ||w|| — margin 2.1982 at lambda=0.01 vs 2.7235 at 0.5",',
			'			"2.1982,2.7235",',
			'			func() string {',
			'				wSmall, _ := TrainSVM(X, y, 0.01, 0.1, 200)',
			'				wBig, _ := TrainSVM(X, y, 0.5, 0.1, 200)',
			'				return fmt.Sprintf("%.4f,%.4f", Margin(wSmall), Margin(wBig))',
			'			}},',
			'		{"edge conventions: Margin of a zero w is 0 (no divide-by-zero), and a score of exactly 0 predicts +1",',
			'			"0.0000,1",',
			'			func() string {',
			'				return fmt.Sprintf("%.4f,%.0f",',
			'					Margin([]float64{0, 0}),',
			'					PredictSVM(wRef, bRef, []float64{1, 0}))',
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
			'// score is the raw decision value w.x + b — shared by Hinge,',
			'// HingeGrad, and PredictSVM so the three can never disagree about',
			'// what side of the street a point is on.',
			'func score(w []float64, b float64, x []float64) float64 {',
			'	s := b',
			'	for i := range w {',
			'		s += w[i] * x[i]',
			'	}',
			'	return s',
			'}',
			'',
			'// Hinge: max(0, 1 - y*s). The "1" is not arbitrary — it fixes the',
			'// scale of (w, b), since scaling both scales every score. Demanding',
			'// y*s >= 1 (not just > 0) is what carves out a street of width',
			'// 2/||w|| instead of a zero-width line.',
			'func Hinge(w []float64, b float64, x []float64, y float64) float64 {',
			'	margin := 1 - y*score(w, b, x)',
			'	if margin < 0 {',
			'		return 0',
			'	}',
			'	return margin',
			'}',
			'',
			'// HingeGrad picks one subgradient at the kink. For y*s > 1 the',
			'// gradient is genuinely zero; AT y*s == 1 the subdifferential is the',
			'// whole interval between 0 and (-y*x, -y), and we pin the zero end',
			'// (the >= comparison). Any choice in the interval is valid for',
			'// convergence — but tests need ONE answer, so the convention is part',
			'// of the contract.',
			'func HingeGrad(w []float64, b float64, x []float64, y float64) ([]float64, float64) {',
			'	gw := make([]float64, len(w))',
			'	if y*score(w, b, x) >= 1 {',
			'		return gw, 0 // comfortable point: contributes nothing at all',
			'	}',
			'	for i := range w {',
			'		gw[i] = -y * x[i]',
			'	}',
			'	return gw, -y',
			'}',
			'',
			'// TrainSVM is deterministic full-batch subgradient descent on',
			'//',
			'//   (lambda/2)*||w||^2 + (1/n)*sum hinge_i',
			'//',
			'// The lambda*w term is the derivative of the L2 penalty — it pulls w',
			'// toward zero every step (weight decay), which geometrically WIDENS',
			'// the street. b is left unregularized: shifting the boundary',
			'// sideways should cost nothing, only tilting it should. Real',
			'// solvers differ (libsvm runs SMO on the dual, Pegasos samples',
			'// minibatches with a decaying step); full batch at fixed lr keeps',
			'// every run bit-identical, which is what a test harness needs.',
			'func TrainSVM(X [][]float64, y []float64, lambda, lr float64, steps int) ([]float64, float64) {',
			'	dim := 0',
			'	if len(X) > 0 {',
			'		dim = len(X[0])',
			'	}',
			'	w := make([]float64, dim)',
			'	b := 0.0',
			'	if len(X) == 0 {',
			'		return w, b // nothing to fit; avoid dividing by n=0 below',
			'	}',
			'	n := float64(len(X))',
			'	for t := 0; t < steps; t++ {',
			'		gw := make([]float64, dim)',
			'		gb := 0.0',
			'		for i := range X {',
			'			gwi, gbi := HingeGrad(w, b, X[i], y[i])',
			'			for j := range gw {',
			'				gw[j] += gwi[j] / n',
			'			}',
			'			gb += gbi / n',
			'		}',
			'		for j := range w {',
			'			gw[j] += lambda * w[j] // regularization joins AFTER the averaging',
			'		}',
			'		for j := range w {',
			'			w[j] -= lr * gw[j]',
			'		}',
			'		b -= lr * gb',
			'	}',
			'	return w, b',
			'}',
			'',
			'// Margin converts w back into geometry: the lines w.x+b = +1 and -1',
			'// sit 2/||w|| apart. Small ||w|| = wide street. The zero guard is',
			'// the documented untrained-model convention, not a numerical hack.',
			'func Margin(w []float64) float64 {',
			'	normSq := 0.0',
			'	for _, v := range w {',
			'		normSq += v * v',
			'	}',
			'	if normSq == 0 {',
			'		return 0',
			'	}',
			'	return 2 / math.Sqrt(normSq)',
			'}',
			'',
			'// PredictSVM is just the sign of the score — all the margin',
			'// machinery exists only to place the boundary well. s == 0 maps to',
			'// +1 so the function is total and deterministic on boundary points.',
			'func PredictSVM(w []float64, b float64, x []float64) float64 {',
			'	if score(w, b, x) >= 0 {',
			'		return 1',
			'	}',
			'	return -1',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Support vectors: sparsity you can see in the gradient</h3>' +
			'<p>The zero-subgradient case is the whole personality of the SVM. ' +
			'Once a point clears the margin, it stops influencing training ' +
			'entirely &mdash; delete it and the trained boundary does not move. ' +
			'On the harness dataset the trained model ends with every point at ' +
			'<code>y&middot;s &ge; 1.0</code> and a handful sitting almost ' +
			'exactly on the margin lines: those are the support vectors, and in ' +
			'the dual formulation the entire model can be written as a weighted ' +
			'sum over just them. Compare logistic regression, where every point ' +
			'contributes gradient forever (the sigmoid never quite reaches 0 or ' +
			'1) &mdash; hinge loss buys a boundary determined by the hard cases ' +
			'only, which is also why SVMs were historically robust on ' +
			'medium-sized noisy datasets.</p>' +
			'<h3>The kernel trick, in one paragraph</h3>' +
			'<p>Everything this item computes touches the data only through dot ' +
			'products. The dual makes that explicit: training and prediction ' +
			'need <code>x<sub>i</sub>&middot;x<sub>j</sub></code>, never the ' +
			'coordinates themselves. Replace that dot product with a kernel ' +
			'function <code>K(x<sub>i</sub>, x<sub>j</sub>)</code> &mdash; RBF, ' +
			'polynomial &mdash; and you have implicitly mapped the data into a ' +
			'huge (even infinite-dimensional) feature space and found a ' +
			'max-margin separator there, without ever materializing a single ' +
			'high-dimensional vector. That is how a &ldquo;linear&rdquo; method ' +
			'draws wiggly boundaries, and it made SVMs the state of the art for ' +
			'a decade (text with TF-IDF, MNIST pre-CNN). We pin the primal, ' +
			'linear, subgradient version because it is the one that scales and ' +
			'the one whose every number is checkable by hand.</p>' +
			'<h3>Where SVMs stand now, and what transfers</h3>' +
			'<p>In modern stacks: sklearn&rsquo;s <code>LinearSVC</code> ' +
			'(liblinear) and <code>SGDClassifier(loss=&quot;hinge&quot;)</code> ' +
			'are exactly this item at industrial scale; Pegasos showed the ' +
			'subgradient approach converges in time independent of dataset ' +
			'size; kernel SVMs (libsvm&rsquo;s SMO) still win on small, clean, ' +
			'tabular problems where a deep net would overfit and gradient ' +
			'boosting feels like overkill. The load-bearing ideas outlived the ' +
			'model: <strong>hinge-style losses</strong> reappear in ranking ' +
			'(triplet loss, contrastive margins in embedding training), ' +
			'<strong>&lambda;&#8214;w&#8214;&sup2;</strong> is the same weight ' +
			'decay every transformer trains with, and ' +
			'<strong>margin</strong> survives as a diagnostic &mdash; ' +
			'confidence margins on logits are still how people find the ' +
			'borderline examples worth human review. Interview classic worth ' +
			'rehearsing from this item: <em>why does hinge loss produce sparse ' +
			'support vectors while logistic loss does not?</em> The answer is ' +
			'the flat-zero region you implemented in ' +
			'<code>HingeGrad</code>.</p>',
		],
		complexity: { time: 'TrainSVM O(steps · n · d); Hinge/HingeGrad/PredictSVM O(d)', space: 'O(d) for w and the per-step gradient' },
	});
})();
