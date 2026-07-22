/* Logistic Regression — Foundations (Medium). Classification as squashed
 * linear regression: Sigmoid, PredictProba, clamped CrossEntropy, full-batch
 * Gradients, Fit, Classify on a tiny hours-studied/hours-slept dataset. The
 * harness pins sigmoid worked values, the log(0) clamp (27.6310, not +Inf),
 * the (p-y)*x gradient shape shared with linear regression, and the trained
 * model's probabilities on four unseen students.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// The sigmoid: any linear score z = w·x + b, squashed into (0,1), with
	// the 0.5 threshold marking the linear decision boundary. No SVG ids
	// needed here — but any would be suffixed AILOG (shared page namespace).
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 220" width="520" height="220" role="img" aria-label="the sigmoid curve mapping a linear score z to a probability between 0 and 1; the 0.5 crossing at z=0 is the decision boundary">' +
		'<text x="20" y="20" class="lbl">&#963;(z) = 1/(1+e&#8315;&#7611;): a linear score in, a probability out</text>' +
		// axes
		'<line x1="40" y1="180" x2="480" y2="180" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>' +
		'<line x1="40" y1="40" x2="480" y2="40" stroke="var(--accent)" stroke-width="1" opacity="0.5" stroke-dasharray="2 4"/>' +
		'<text x="486" y="184" class="lbl">p=0</text>' +
		'<text x="486" y="44" class="lbl">p=1</text>' +
		// the S-curve (points computed from sigma at z=-6..6)
		'<polyline points="40,180 77,179 113,177 150,173 187,163 223,142 260,110 297,78 333,57 370,47 407,42 443,41 480,40" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		// the 0.5 threshold and the z=0 boundary
		'<line x1="40" y1="110" x2="480" y2="110" stroke="var(--warn)" stroke-width="1.4" stroke-dasharray="4 3"/>' +
		'<text x="46" y="104" class="lbl" style="fill:var(--warn)">p = 0.5 &#8594; the classification threshold</text>' +
		'<line x1="260" y1="40" x2="260" y2="180" stroke="var(--warn)" stroke-width="1.4" stroke-dasharray="4 3"/>' +
		'<text x="260" y="198" text-anchor="middle" class="lbl" style="fill:var(--warn)">z = w&#183;x + b = 0: a LINE in feature space</text>' +
		'<text x="20" y="214" class="lbl">far left: confidently 0 &#8226; far right: confidently 1 &#8226; near the boundary: honestly unsure</text>' +
		'</svg>';

	T.problem({
		id: 'logistic-regression',
		title: 'Logistic Regression & Cross-Entropy',
		nav: 'logistic regression',
		difficulty: 'Medium',
		category: 'Foundations: Learning as Optimization',
		task: 'Implement Sigmoid, PredictProba, clamped CrossEntropy, full-batch Gradients, Fit, and Classify — the first real classifier, trained by the same gradient shape as linear regression.',

		prose: [
			'<h2>Logistic Regression &amp; Cross-Entropy</h2>' +
			'<p>New task: predict pass/fail for students from hours studied and ' +
			'hours slept. The tempting hack is linear regression on 0/1 labels — ' +
			'and it fails in two instructive ways: predictions escape ' +
			'<code>[0,1]</code> (what is a probability of 1.7?), and squared error ' +
			'barely punishes a <em>confidently wrong</em> answer. Classification ' +
			'needs two upgrades, and together they are logistic regression — still ' +
			'the most-deployed classifier in industry, and the exact output layer ' +
			'of every neural network that ends in a probability.</p>' +
			'<ul>' +
			'<li><strong>The sigmoid squashes the score.</strong> Keep the linear ' +
			'model <code>z = w&middot;x + b</code>, then map ' +
			'<code>&sigma;(z) = 1/(1+e&#8315;&#7611;)</code>: any real score becomes ' +
			'a probability. <code>&sigma;(0)=0.5</code>, ' +
			'<code>&sigma;(2)=0.8808</code>, <code>&sigma;(&minus;2)=0.1192</code>, ' +
			'and <code>&sigma;(z)+&sigma;(&minus;z)=1</code> exactly.</li>' +
			'<li><strong>Cross-entropy prices confidence.</strong> ' +
			'<code>loss = &minus;(y&middot;ln&nbsp;p + ' +
			'(1&minus;y)&middot;ln(1&minus;p))</code>, averaged over the batch. ' +
			'Right and sure (p=0.9, y=1) costs 0.1054; wrong and sure (p=0.1, y=1) ' +
			'costs 2.3026 — twenty times more. As p &rarr; the wrong extreme the ' +
			'loss &rarr; &infin;, which is exactly the incentive you want.</li>' +
			'<li><strong>The gradient is an old friend:</strong> ' +
			'<code>dw&#11388; = (1/n)&middot;&Sigma;(p&minus;y)&middot;x&#11388;</code>, ' +
			'<code>db = (1/n)&middot;&Sigma;(p&minus;y)</code>. Differentiating ' +
			'cross-entropy through the sigmoid, the &sigma;&prime; terms cancel and ' +
			'leave <em>error times input</em> — the same shape as linear ' +
			'regression, without even the factor 2. That cancellation is why this ' +
			'loss/activation pair is standard.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>The training data — ten students, two features — and what training ' +
			'must achieve:</p>',
			{ lang: 'txt', code: 'studied: 0.5  1.0  1.5  2.0  3.5 | 3.0  4.0  4.5  5.0  2.5\nslept:   6    4    7    5    4  | 6    7    5    6    8\npassed:  0    0    0    0    0  | 1    1    1    1    1\n\nat w=(0,0), b=0: every p = 0.5, loss = ln 2 = 0.6931  (coin-flip baseline)\nafter Fit (lr=0.5, 1000 full-batch steps):\n  w = (2.2796, 1.3572)   b = -14.2300   loss = 0.1221,  10/10 correct\nread the weights: an hour of study is worth ~1.7 hours of sleep' },
			'<div class="tip">Note the student at (3.5h studied, 4h slept): decent ' +
			'study, failed anyway. No line through &ldquo;studied&rdquo; alone ' +
			'separates the data — the model must learn that sleep matters too. ' +
			'That is what <code>w</code> being a <em>vector</em> buys, and the ' +
			'decision boundary <code>w&middot;x+b=0</code> is still just a line in ' +
			'feature space: logistic regression is a linear classifier with honest ' +
			'probabilities.</div>' +
			'<h3>Your job</h3>' +
			'<p>Implement the six starter functions (add <code>import "math"</code> ' +
			'for <code>Exp</code>/<code>Log</code>). Conventions the tests pin: ' +
			'<code>CrossEntropy</code> clamps every p into ' +
			'<code>[1e-12, 1&minus;1e-12]</code> before taking logs — a p of ' +
			'exactly 0 or 1 must cost ~27.63, never panic or return ' +
			'<code>+Inf</code>; <code>Fit</code> starts from zeros; ' +
			'<code>Classify</code> maps p&nbsp;&ge;&nbsp;0.5 to 1. Simplifications, ' +
			'disclosed: two features, full-batch updates, a fixed step count — ' +
			'real trainers minibatch and early-stop, but every formula is ' +
			'identical.</p>',
		],

		starter: [
			'package main',
			'',
			'// You will want:  import "math"  (Exp and Log).',
			'',
			'// Sigmoid returns 1/(1+e^(-z)) — it maps any real score to (0,1).',
			'func Sigmoid(z float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// PredictProba returns Sigmoid(w·x + b), where w·x is the dot',
			'// product over the feature vector (w and x have equal length).',
			'func PredictProba(w []float64, b float64, x []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// CrossEntropy is the mean binary cross-entropy of predicted',
			'// probabilities ps against labels ys (each y is 0 or 1):',
			'//',
			'//   (1/n) * Sum -( y*ln(p) + (1-y)*ln(1-p) )',
			'//',
			'// CLAMP each p into [1e-12, 1-1e-12] BEFORE the logs: a model that',
			'// says exactly 0 or 1 must cost -ln(1e-12) = 27.6310, not +Inf and',
			'// never a panic. Empty input returns 0.',
			'func CrossEntropy(ps, ys []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Gradients returns (dw, db) of the mean cross-entropy at (w, b)',
			'// over the full batch — with p[i] = PredictProba(w, b, xs[i]):',
			'//',
			'//   dw[j] = (1/n) * Sum (p[i]-ys[i]) * xs[i][j]',
			'//   db    = (1/n) * Sum (p[i]-ys[i])',
			'//',
			'// No factor 2 here: differentiating cross-entropy through the',
			'// sigmoid cancels to exactly (p-y). Empty xs returns (len(w) zeros, 0).',
			'func Gradients(w []float64, b float64, xs [][]float64, ys []float64) ([]float64, float64) {',
			'	// your code here',
			'	return nil, 0',
			'}',
			'',
			'// Fit runs `steps` full-batch gradient updates starting from',
			'// w = all zeros (length = number of features) and b = 0, at learning',
			'// rate lr, and returns the final (w, b).',
			'func Fit(xs [][]float64, ys []float64, lr float64, steps int) ([]float64, float64) {',
			'	// your code here',
			'	return nil, 0',
			'}',
			'',
			'// Classify thresholds the probability: 1 if PredictProba >= 0.5,',
			'// else 0. (Exactly 0.5 -> 1, pinned by convention.)',
			'func Classify(w []float64, b float64, x []float64) int {',
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
			'	// Ten students: {hours studied, hours slept} -> passed. Neither',
			'	// feature separates the classes alone (see the 3.5h-study fail),',
			'	// so the trained w must weight both.',
			'	xs := [][]float64{',
			'		{0.5, 6}, {1.0, 4}, {1.5, 7}, {2.0, 5}, {3.5, 4},',
			'		{3.0, 6}, {4.0, 7}, {4.5, 5}, {5.0, 6}, {2.5, 8},',
			'	}',
			'	ys := []float64{0, 0, 0, 0, 0, 1, 1, 1, 1, 1}',
			'	// probaAll runs PredictProba over the whole dataset — used to',
			'	// score the model before and after training.',
			'	probaAll := func(w []float64, b float64) []float64 {',
			'		ps := make([]float64, len(xs))',
			'		for i := range xs {',
			'			ps[i] = PredictProba(w, b, xs[i])',
			'		}',
			'		return ps',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"sigmoid worked values: s(0)=0.5 always, s(2), s(-2), s(4) — the squash that makes scores probabilities",',
			'			"0.5000 0.8808 0.1192 0.9820",',
			'			func() string {',
			'				return fmt.Sprintf("%.4f %.4f %.4f %.4f", Sigmoid(0), Sigmoid(2), Sigmoid(-2), Sigmoid(4))',
			'			}},',
			'		{"symmetry: s(z) + s(-z) = 1 exactly — flipping the score flips the probability",',
			'			"1.0000",',
			'			func() string { return fmt.Sprintf("%.4f", Sigmoid(1.3)+Sigmoid(-1.3)) }},',
			'		{"PredictProba is sigmoid of the same w·x+b linear regression uses (w={0.9,0.5}, b=-6)",',
			'			"0.7503 0.0431",',
			'			func() string {',
			'				w := []float64{0.9, 0.5}',
			'				return fmt.Sprintf("%.4f %.4f", PredictProba(w, -6, []float64{4, 7}), PredictProba(w, -6, []float64{1, 4}))',
			'			}},',
			'		{"cross-entropy prices confidence: right-and-sure (p=0.9,y=1) vs wrong-and-sure (p=0.1,y=1) — 20x the cost",',
			'			"0.1054 2.3026",',
			'			func() string {',
			'				a := CrossEntropy([]float64{0.9}, []float64{1})',
			'				b := CrossEntropy([]float64{0.1}, []float64{1})',
			'				return fmt.Sprintf("%.4f %.4f", a, b)',
			'			}},',
			'		{"the clamp: p=1.0 with y=0 costs -ln(1e-12)=27.6310 — finite, no Inf, no panic on log(0)",',
			'			"27.6310",',
			'			func() string { return fmt.Sprintf("%.4f", CrossEntropy([]float64{1.0}, []float64{0})) }},',
			'		{"the untrained baseline: at w=0 every p is 0.5 and the loss is ln 2 — a coin flip",',
			'			"0.6931",',
			'			func() string { return fmt.Sprintf("%.4f", CrossEntropy(probaAll([]float64{0, 0}, 0), ys)) }},',
			'		{"the gradient is (1/n)*Sum (p-y)*x — linear regression\'s shape, no factor 2 (sigma\' cancels it)",',
			'			"dw0=-0.2761 dw1=-0.3560 db=0.0049",',
			'			func() string {',
			'				dw, db := Gradients([]float64{0.5, -0.25}, 0.1, xs, ys)',
			'				if len(dw) != 2 {',
			'					return fmt.Sprintf("len=%d", len(dw))',
			'				}',
			'				return fmt.Sprintf("dw0=%.4f dw1=%.4f db=%.4f", dw[0], dw[1], db)',
			'			}},',
			'		{"training works: loss falls from 0.6931 to 0.1221 after 1000 steps at lr=0.5",',
			'			"0.6931 -> 0.1221",',
			'			func() string {',
			'				before := CrossEntropy(probaAll([]float64{0, 0}, 0), ys)',
			'				w, b := Fit(xs, ys, 0.5, 1000)',
			'				after := CrossEntropy(probaAll(w, b), ys)',
			'				return fmt.Sprintf("%.4f -> %.4f", before, after)',
			'			}},',
			'		{"the trained weights: study 2.28, sleep 1.36 — both positive, an hour of study worth ~1.7 of sleep",',
			'			"w0=2.2796 w1=1.3572 b=-14.2300",',
			'			func() string {',
			'				w, b := Fit(xs, ys, 0.5, 1000)',
			'				if len(w) != 2 {',
			'					return fmt.Sprintf("len=%d", len(w))',
			'				}',
			'				return fmt.Sprintf("w0=%.4f w1=%.4f b=%.4f", w[0], w[1], b)',
			'			}},',
			'		{"four unseen students: (2h,8h) passes on sleep, (3h,4h) fails on none — probabilities, then calls",',
			'			"0.7662/1 0.8422/1 0.1232/0 0.2561/0",',
			'			func() string {',
			'				w, b := Fit(xs, ys, 0.5, 1000)',
			'				tests := [][]float64{{2.0, 8.0}, {4.0, 5.0}, {3.0, 4.0}, {2.5, 5.5}}',
			'				out := ""',
			'				for i, t := range tests {',
			'					if i > 0 {',
			'						out += " "',
			'					}',
			'					out += fmt.Sprintf("%.4f/%d", PredictProba(w, b, t), Classify(w, b, t))',
			'				}',
			'				return out',
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
			'// Sigmoid: the canonical squash. For very negative z, Exp(-z) is',
			'// huge and the result underflows gracefully toward 0; for very',
			'// positive z it approaches 1 — float64 handles the harness range',
			'// without any special-casing.',
			'func Sigmoid(z float64) float64 {',
			'	return 1 / (1 + math.Exp(-z))',
			'}',
			'',
			'// PredictProba: the model is STILL linear — same w·x+b as linear',
			'// regression — with the sigmoid bolted on the end. That is why the',
			'// decision boundary (p=0.5, i.e. z=0) is a straight line in feature',
			'// space no matter how the sigmoid curves.',
			'func PredictProba(w []float64, b float64, x []float64) float64 {',
			'	z := b',
			'	for j := range w {',
			'		z += w[j] * x[j]',
			'	}',
			'	return Sigmoid(z)',
			'}',
			'',
			'// CrossEntropy with the documented clamp. The clamp matters even in',
			'// well-behaved training: a single confident-wrong prediction at',
			'// p=1e-300 would otherwise dominate the mean with ln(1e-300)=-690,',
			'// and a p of exactly 0 or 1 (which sigmoid CAN return once e^-z',
			'// underflows) would produce -Inf. Real frameworks do the same thing',
			'// (PyTorch clamps log inputs inside BCELoss).',
			'func CrossEntropy(ps, ys []float64) float64 {',
			'	if len(ps) == 0 {',
			'		return 0 // documented guard: empty batch has zero loss, not a panic',
			'	}',
			'	sum := 0.0',
			'	for i := range ps {',
			'		p := ps[i]',
			'		if p < 1e-12 {',
			'			p = 1e-12',
			'		}',
			'		if p > 1-1e-12 {',
			'			p = 1 - 1e-12',
			'		}',
			'		sum += -(ys[i]*math.Log(p) + (1-ys[i])*math.Log(1-p))',
			'	}',
			'	return sum / float64(len(ps))',
			'}',
			'',
			'// Gradients: the celebrated cancellation. dLoss/dp = (p-y)/(p(1-p)),',
			'// dp/dz = p(1-p) — multiply and the denominators vanish, leaving',
			'// dLoss/dz = p-y. Then the chain rule through z = w·x+b hands each',
			'// weight (p-y)*x[j] and the bias (p-y)*1: error times input, exactly',
			'// linear regression\'s shape. This is not a coincidence — both are',
			'// maximum-likelihood in the same exponential family.',
			'func Gradients(w []float64, b float64, xs [][]float64, ys []float64) ([]float64, float64) {',
			'	dw := make([]float64, len(w))',
			'	if len(xs) == 0 {',
			'		return dw, 0',
			'	}',
			'	db := 0.0',
			'	for i := range xs {',
			'		e := PredictProba(w, b, xs[i]) - ys[i] // signed error in probability',
			'		for j := range w {',
			'			dw[j] += e * xs[i][j]',
			'		}',
			'		db += e',
			'	}',
			'	n := float64(len(xs))',
			'	for j := range dw {',
			'		dw[j] /= n',
			'	}',
			'	return dw, db / n',
			'}',
			'',
			'// Fit: full-batch descent from zeros. Unlike MSE for a line, this',
			'// loss has NO closed form — iteration is the only way, which is the',
			'// historical moment gradient descent became mandatory rather than',
			'// convenient. Cross-entropy through a sigmoid is still convex, so',
			'// the zero start is safe: there is one basin.',
			'func Fit(xs [][]float64, ys []float64, lr float64, steps int) ([]float64, float64) {',
			'	if len(xs) == 0 {',
			'		return nil, 0',
			'	}',
			'	w := make([]float64, len(xs[0]))',
			'	b := 0.0',
			'	for s := 0; s < steps; s++ {',
			'		dw, db := Gradients(w, b, xs, ys)',
			'		for j := range w {',
			'			w[j] -= lr * dw[j]',
			'		}',
			'		b -= lr * db',
			'	}',
			'	return w, b',
			'}',
			'',
			'// Classify: thresholding is a POLICY decision layered on top of the',
			'// probability, not part of the model. 0.5 is the default; fraud and',
			'// medical systems move it deliberately (see the metrics item).',
			'func Classify(w []float64, b float64, x []float64) int {',
			'	if PredictProba(w, b, x) >= 0.5 {',
			'		return 1',
			'	}',
			'	return 0',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why cross-entropy and not MSE</h3>' +
			'<p>You <em>can</em> train a sigmoid with squared error — and people ' +
			'did, badly, for years. Two things go wrong. First, ' +
			'<strong>convexity</strong>: MSE composed with a sigmoid is non-convex ' +
			'in w, with flat regions where optimization stalls; cross-entropy ' +
			'through a sigmoid is convex — one basin, any start works. Second, ' +
			'<strong>gradient vanish at the worst moment</strong>: the MSE ' +
			'gradient carries a factor &sigma;&prime;(z) = p(1&minus;p), which is ' +
			'nearly 0 when the model is <em>confidently wrong</em> (p&asymp;0, ' +
			'y=1) — precisely when you need the biggest correction. ' +
			'Cross-entropy&rsquo;s cancellation deletes that factor: the gradient ' +
			'is plain (p&minus;y), largest exactly when the model is most wrong. ' +
			'That pairing — a loss whose derivative cancels the activation&rsquo;s ' +
			'saturation — recurs everywhere: softmax + cross-entropy in every ' +
			'classifier head, including the output layer of every LLM.</p>' +
			'<h3>From two classes to a thousand</h3>' +
			'<p>The multiclass jump is small: replace the sigmoid with ' +
			'<strong>softmax</strong> (exponentiate K scores, normalize to sum to ' +
			'1), replace binary cross-entropy with its K-class form, and the ' +
			'gradient is <em>still</em> (p&minus;y)&middot;x per class. ' +
			'sklearn&rsquo;s <code>LogisticRegression</code> does exactly this ' +
			'(plus L2 regularization by default — worth knowing: its ' +
			'<code>C</code> is the <em>inverse</em> regularization strength, a ' +
			'classic interview trap), solved with LBFGS rather than plain ' +
			'gradient descent, but on the same convex loss. And a neural ' +
			'network&rsquo;s final layer <em>is</em> this model: everything ' +
			'below it just learns the features x that make the classes linearly ' +
			'separable.</p>' +
			'<h3>Production notes</h3>' +
			'<p>Logistic regression persists in industry — credit scoring, ' +
			'click-through prediction, medical risk — for two properties your ' +
			'implementation makes visible. The weights are ' +
			'<strong>auditable</strong>: w&#8320;=2.28 on study hours is a ' +
			'statement a regulator can read (and exponentiated, log-odds become ' +
			'odds ratios: each study hour multiplies the odds of passing by ' +
			'e<sup>2.28</sup> &asymp; 9.8). And the outputs are honest ' +
			'<strong>probabilities</strong> you can threshold per business cost — ' +
			'a fraud team runs the same model at 0.9 for auto-block and 0.3 for ' +
			'review queues. Two cautions from the field: probabilities are only ' +
			'trustworthy if the model is <em>calibrated</em> (deep nets usually ' +
			'are not; Platt scaling — fitting exactly this sigmoid on held-out ' +
			'scores — is the standard fix), and on perfectly separable data the ' +
			'unregularized weights diverge to &infin; chasing p=1, which is why ' +
			'the sklearn default regularizes and why your fixed step count ' +
			'quietly matters. The linear boundary is the real ceiling — when ' +
			'classes are not linearly separable, you need features (or a network ' +
			'to learn them: the backprop item), not a better optimizer.</p>',
		],
		complexity: { time: 'O(steps · n · d) — each full-batch update touches every feature of every point', space: 'O(d) for weights and gradients — the batch is read, not copied' },
	});
})();
