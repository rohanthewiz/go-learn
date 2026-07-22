/* Linear Regression — Foundations (Medium). Fit a line by gradient descent
 * on a tiny experience-vs-salary dataset: Predict, MSE, full-batch
 * Gradients, GradStep, Fit, and R-squared. The harness pins the gradient at
 * (0,0), one step, and the punchline — 5000 GD steps land on w=0.7800,
 * b=3.6867, identical to the OLS closed form to all four printed decimals.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// R-squared as a picture: the flat mean line leaves big residuals
	// (SStot), the fitted line leaves tiny ones (SSres). Ids namespaced
	// AILIN because all tracks share the page's SVG id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 230" width="520" height="230" role="img" aria-label="scatter of experience vs salary; the flat mean line has large vertical residuals, the fitted line has tiny ones; R-squared compares the two">' +
		'<text x="20" y="20" class="lbl">R&#178; = 1 &#8722; SSres/SStot: how much smaller are the fitted line&#8217;s residuals than the mean&#8217;s?</text>' +
		// residuals to the flat mean line (warn, dashed) — drawn first, under the points
		'<line x1="120" y1="175" x2="120" y2="118" stroke="var(--warn)" stroke-width="1.4" stroke-dasharray="3 3"/>' +
		'<line x1="180" y1="154" x2="180" y2="118" stroke="var(--warn)" stroke-width="1.4" stroke-dasharray="3 3"/>' +
		'<line x1="360" y1="88" x2="360" y2="118" stroke="var(--warn)" stroke-width="1.4" stroke-dasharray="3 3"/>' +
		'<line x1="420" y1="55" x2="420" y2="118" stroke="var(--warn)" stroke-width="1.4" stroke-dasharray="3 3"/>' +
		// the flat baseline: predict mean(y) for everyone
		'<line x1="90" y1="118" x2="450" y2="118" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<text x="456" y="122" class="lbl" style="fill:var(--warn)">mean(y)</text>' +
		// the fitted line
		'<line x1="90" y1="188" x2="450" y2="47" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="456" y="52" class="lbl" style="fill:var(--accent)">w&#183;x+b</text>' +
		// data points
		'<circle cx="120" cy="175" r="4" fill="var(--accent)"/>' +
		'<circle cx="180" cy="154" r="4" fill="var(--accent)"/>' +
		'<circle cx="240" cy="127" r="4" fill="var(--accent)"/>' +
		'<circle cx="300" cy="106" r="4" fill="var(--accent)"/>' +
		'<circle cx="360" cy="88" r="4" fill="var(--accent)"/>' +
		'<circle cx="420" cy="55" r="4" fill="var(--accent)"/>' +
		'<text x="20" y="222" class="lbl">x = years of experience &#8594; y = salary; dashed gaps are what "just predict the average" gets wrong</text>' +
		'</svg>';

	T.problem({
		id: 'linear-regression',
		title: 'Linear Regression from Scratch',
		nav: 'linear regression',
		difficulty: 'Medium',
		category: 'Foundations: Learning as Optimization',
		task: 'Implement Predict, MSE, full-batch Gradients, GradStep, Fit, and R2 — fit a salary line by gradient descent and match the OLS closed form.',

		prose: [
			'<h2>Linear Regression from Scratch</h2>' +
			'<p>Comp asks for a sanity model: given years of experience, what salary ' +
			'should an offer center on? A black-box model is useless here — the ' +
			'first question in the meeting will be <em>&ldquo;how much is one more ' +
			'year worth?&rdquo;</em>, and only a model with readable coefficients can ' +
			'answer. Linear regression is that model, it is the &ldquo;hello ' +
			'world&rdquo; of supervised learning, and — more importantly for this ' +
			'track — training it end-to-end exercises the entire ML recipe: a model, ' +
			'a loss, gradients, a training loop, and an evaluation metric.</p>' +
			'<ul>' +
			'<li><strong>Model:</strong> <code>&#375; = w&middot;x + b</code>. One ' +
			'feature here, so <code>w</code> reads directly as ' +
			'&ldquo;salary units per year of experience&rdquo;.</li>' +
			'<li><strong>Loss — mean squared error:</strong> ' +
			'<code>MSE = (1/n)&middot;&Sigma;(&#375;&minus;y)&sup2;</code>. ' +
			'Squaring punishes big misses hard and makes the loss a smooth bowl in ' +
			'<code>(w, b)</code> — one global minimum, so gradient descent cannot ' +
			'get stuck.</li>' +
			'<li><strong>Gradients</strong> (full batch, keep the factor 2 from ' +
			'differentiating <code>e&sup2;</code>): ' +
			'<code>dw = (2/n)&middot;&Sigma;(&#375;&minus;y)&middot;x</code>, ' +
			'<code>db = (2/n)&middot;&Sigma;(&#375;&minus;y)</code>. ' +
			'Note the shape: <em>error times input</em>. Remember it — logistic ' +
			'regression and backprop reuse it verbatim.</li>' +
			'<li><strong>Evaluation — R&sup2;:</strong> ' +
			'<code>1 &minus; SSres/SStot</code>. It compares your residuals against ' +
			'the dumbest baseline, predicting <code>mean(y)</code> for everyone. ' +
			'R&sup2;=0 means &ldquo;no better than the mean&rdquo;; 1 means ' +
			'perfect.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>The dataset (salary in $10k units, so the numbers stay tame) and ' +
			'the first moves of training:</p>',
			{ lang: 'txt', code: 'x (years):  1     2     3     4     5     6\ny (salary): 4.5   5.2   6.1   6.8   7.4   8.5\n\nat w=0, b=0 every prediction is 0, every error is -y:\n  dw = (2/6)*Sum(-y*x) = -49.4667      db = (2/6)*Sum(-y) = -12.8333\nboth negative => the step INCREASES w and b:\n  w1 = 0 - 0.01*(-49.4667) = 0.4947    b1 = 0 - 0.01*(-12.8333) = 0.1283\n\n5000 steps at lr=0.01:  w=0.7800  b=3.6867   (MSE 0.0102, R2 0.9943)' },
			'<div class="tip">This loss has a closed-form solution — ordinary least ' +
			'squares gives <code>w = cov(x,y)/var(x)</code>, no loop needed — and ' +
			'your <code>Fit</code> must land on it to four decimals: ' +
			'<code>w=0.7800, b=3.6867</code>. That agreement is the real lesson: ' +
			'on a convex loss, gradient descent is not an approximation of the ' +
			'answer — it is a solver that finds <em>the</em> answer.</div>' +
			'<h3>Your job</h3>' +
			'<p>Implement the six functions in the starter. Conventions the tests ' +
			'pin: gradients keep the factor 2; <code>Fit</code> starts from ' +
			'<code>w=0, b=0</code>; <code>MSE</code> and <code>R2</code> return 0 ' +
			'on empty input or zero variance instead of dividing by zero. One ' +
			'simplification to be honest about: real regression has many features ' +
			'(<code>w</code> becomes a vector and the products become dot ' +
			'products), but every formula above survives that jump unchanged.</p>',
		],

		starter: [
			'package main',
			'',
			'// Predict returns w*x + b for every x in xs, in input order.',
			'func Predict(w, b float64, xs []float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// MSE is the mean squared error between preds and ys (equal length):',
			'// (1/n) * Sum (preds[i]-ys[i])^2. Empty input returns 0 — guard the',
			'// division, never panic.',
			'func MSE(preds, ys []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Gradients returns (dw, db): the partial derivatives of MSE with',
			'// respect to w and b at (w, b), over the FULL batch:',
			'//',
			'//   dw = (2/n) * Sum (w*xs[i] + b - ys[i]) * xs[i]',
			'//   db = (2/n) * Sum (w*xs[i] + b - ys[i])',
			'//',
			'// Keep the factor 2 (from differentiating e^2) — some texts fold it',
			'// into the learning rate, but the tests pin the convention WITH it.',
			'// Empty input returns (0, 0).',
			'func Gradients(w, b float64, xs, ys []float64) (float64, float64) {',
			'	// your code here',
			'	return 0, 0',
			'}',
			'',
			'// GradStep applies one full-batch gradient-descent update and returns',
			'// the new pair: (w - lr*dw, b - lr*db).',
			'func GradStep(w, b float64, xs, ys []float64, lr float64) (float64, float64) {',
			'	// your code here',
			'	return 0, 0',
			'}',
			'',
			'// Fit runs `steps` GradSteps starting from w=0, b=0 and returns the',
			'// final (w, b).',
			'func Fit(xs, ys []float64, lr float64, steps int) (float64, float64) {',
			'	// your code here',
			'	return 0, 0',
			'}',
			'',
			'// R2 is the coefficient of determination of preds against ys:',
			'//',
			'//   R2 = 1 - SSres/SStot',
			'//   SSres = Sum (ys[i]-preds[i])^2     (your residuals)',
			'//   SStot = Sum (ys[i]-mean(ys))^2     (the mean-baseline residuals)',
			'//',
			'// Convention: return 0 when the input is empty or SStot is 0 (all ys',
			'// identical) — never divide by zero.',
			'func R2(preds, ys []float64) float64 {',
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
			'	// Years of experience -> salary in $10k units. Small integer xs',
			'	// keep every pinned gradient hand-checkable.',
			'	xs := []float64{1, 2, 3, 4, 5, 6}',
			'	ys := []float64{4.5, 5.2, 6.1, 6.8, 7.4, 8.5}',
			'	meanY := (4.5 + 5.2 + 6.1 + 6.8 + 7.4 + 8.5) / 6',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"Predict maps the whole feature column through w*x+b (guess line w=0.8, b=3.7)",',
			'			"4.50 5.30 6.10 6.90 7.70 8.50",',
			'			func() string {',
			'				p := Predict(0.8, 3.7, xs)',
			'				if len(p) != 6 {',
			'					return fmt.Sprintf("len=%d", len(p))',
			'				}',
			'				return fmt.Sprintf("%.2f %.2f %.2f %.2f %.2f %.2f", p[0], p[1], p[2], p[3], p[4], p[5])',
			'			}},',
			'		{"MSE of the zero line (predict 0 for everyone): the loss training starts from",',
			'			"42.9583",',
			'			func() string { return fmt.Sprintf("%.4f", MSE(Predict(0, 0, xs), ys)) }},',
			'		{"MSE of the guess line: eyeballing gets close — gradient descent will still beat it",',
			'			"0.0183",',
			'			func() string { return fmt.Sprintf("%.4f", MSE(Predict(0.8, 3.7, xs), ys)) }},',
			'		{"Gradients at (0,0): both negative — predictions are all too LOW, so w and b must rise",',
			'			"dw=-49.4667 db=-12.8333",',
			'			func() string {',
			'				dw, db := Gradients(0, 0, xs, ys)',
			'				return fmt.Sprintf("dw=%.4f db=%.4f", dw, db)',
			'			}},',
			'		{"one GradStep from (0,0) at lr=0.01: the gradient, scaled down and subtracted",',
			'			"w=0.4947 b=0.1283",',
			'			func() string {',
			'				w1, b1 := GradStep(0, 0, xs, ys, 0.01)',
			'				return fmt.Sprintf("w=%.4f b=%.4f", w1, b1)',
			'			}},',
			'		{"Fit, 5000 steps at lr=0.01: lands on the OLS closed form to all four decimals",',
			'			"w=0.7800 b=3.6867",',
			'			func() string {',
			'				w, b := Fit(xs, ys, 0.01, 5000)',
			'				return fmt.Sprintf("w=%.4f b=%.4f", w, b)',
			'			}},',
			'		{"the fitted line beats the hand guess: MSE 0.0102 < 0.0183",',
			'			"0.0102",',
			'			func() string {',
			'				w, b := Fit(xs, ys, 0.01, 5000)',
			'				return fmt.Sprintf("%.4f", MSE(Predict(w, b, xs), ys))',
			'			}},',
			'		{"R^2 of the fit: 99.4% of salary variance explained by experience",',
			'			"0.9943",',
			'			func() string {',
			'				w, b := Fit(xs, ys, 0.01, 5000)',
			'				return fmt.Sprintf("%.4f", R2(Predict(w, b, xs), ys))',
			'			}},',
			'		{"R^2 baseline: predicting mean(y) for everyone scores exactly 0 — R^2 measures improvement OVER the mean",',
			'			"0.0000",',
			'			func() string { return fmt.Sprintf("%.4f", R2(Predict(0, meanY, xs), ys)) }},',
			'		{"guards: MSE and R^2 of empty slices are 0 by convention, not a divide-by-zero panic",',
			'			"0.0000 0.0000",',
			'			func() string { return fmt.Sprintf("%.4f %.4f", MSE(nil, nil), R2(nil, nil)) }},',
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
			'// Predict evaluates the model on a whole column. Kept separate from',
			'// the loss so every later function (MSE, Gradients, R2) composes from',
			'// it — the same layering real libraries use (model.predict, then a',
			'// metric over the predictions).',
			'func Predict(w, b float64, xs []float64) []float64 {',
			'	preds := make([]float64, len(xs))',
			'	for i, x := range xs {',
			'		preds[i] = w*x + b',
			'	}',
			'	return preds',
			'}',
			'',
			'// MSE: squaring punishes a miss of 2 four times harder than a miss',
			'// of 1 — which is exactly what makes the loss smooth and',
			'// differentiable AND what makes it outlier-sensitive (see the',
			'// explanation on MAE/Huber).',
			'func MSE(preds, ys []float64) float64 {',
			'	if len(preds) == 0 {',
			'		return 0 // documented guard: mean of nothing is 0 here, not a panic',
			'	}',
			'	sum := 0.0',
			'	for i := range preds {',
			'		d := preds[i] - ys[i]',
			'		sum += d * d',
			'	}',
			'	return sum / float64(len(preds))',
			'}',
			'',
			'// Gradients: differentiate MSE and the chain rule hands you',
			'// "error times input":',
			'//',
			'//   d/dw (1/n)Sum(wx+b-y)^2 = (2/n)Sum(wx+b-y)*x',
			'//   d/db (1/n)Sum(wx+b-y)^2 = (2/n)Sum(wx+b-y)',
			'//',
			'// db is just dw with input 1 — the bias is a weight on a constant',
			'// feature, which is why libraries can fold b into w as a column of',
			'// ones.',
			'func Gradients(w, b float64, xs, ys []float64) (float64, float64) {',
			'	if len(xs) == 0 {',
			'		return 0, 0',
			'	}',
			'	dw, db := 0.0, 0.0',
			'	for i := range xs {',
			'		e := (w*xs[i] + b) - ys[i] // signed error: >0 means predicting high',
			'		dw += 2 * e * xs[i]',
			'		db += 2 * e',
			'	}',
			'	n := float64(len(xs))',
			'	return dw / n, db / n',
			'}',
			'',
			'// GradStep: the update rule from the gradient-descent item, applied',
			'// to two coordinates at once. Both partials come from the SAME',
			'// gradient evaluation — compute both, then move; updating w first',
			'// and re-evaluating for b would be a subtly different algorithm.',
			'func GradStep(w, b float64, xs, ys []float64, lr float64) (float64, float64) {',
			'	dw, db := Gradients(w, b, xs, ys)',
			'	return w - lr*dw, b - lr*db',
			'}',
			'',
			'// Fit is deliberately simple: a fixed step count from a zero start,',
			'// no tolerance logic. On this convex bowl that suffices to match the',
			'// OLS closed form to 4 printed decimals — the determinism the tests',
			'// pin.',
			'func Fit(xs, ys []float64, lr float64, steps int) (float64, float64) {',
			'	w, b := 0.0, 0.0',
			'	for s := 0; s < steps; s++ {',
			'		w, b = GradStep(w, b, xs, ys, lr)',
			'	}',
			'	return w, b',
			'}',
			'',
			'// R2 compares residuals against the mean baseline. It is a RELATIVE',
			'// metric: MSE carries units (squared salary), R2 is unitless — which',
			'// is why stakeholders get told R2 and dashboards track both.',
			'func R2(preds, ys []float64) float64 {',
			'	if len(ys) == 0 {',
			'		return 0',
			'	}',
			'	mean := 0.0',
			'	for _, y := range ys {',
			'		mean += y',
			'	}',
			'	mean /= float64(len(ys))',
			'	ssRes, ssTot := 0.0, 0.0',
			'	for i := range ys {',
			'		dr := ys[i] - preds[i]',
			'		dt := ys[i] - mean',
			'		ssRes += dr * dr',
			'		ssTot += dt * dt',
			'	}',
			'	// All-identical ys make SStot 0: "fraction of variance explained"',
			'	// is meaningless with zero variance, so return the documented 0',
			'	// instead of dividing.',
			'	if ssTot == 0 {',
			'		return 0',
			'	}',
			'	return 1 - ssRes/ssTot',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The closed form you just matched</h3>' +
			'<p>Minimizing MSE for a line has an exact solution — set both partial ' +
			'derivatives to zero and solve: <code>w = cov(x,y)/var(x)</code>, ' +
			'<code>b = mean(y) &minus; w&middot;mean(x)</code>. In matrix form for ' +
			'many features it is the <em>normal equation</em> ' +
			'<code>w = (X&#7488;X)&#8315;&sup1;X&#7488;y</code>, and it is what ' +
			'sklearn&rsquo;s <code>LinearRegression</code> actually computes (via ' +
			'an SVD-based least-squares solver — not gradient descent). Your ' +
			'<code>Fit</code> landing on <code>w=0.7800, b=3.6867</code>, the ' +
			'closed form to four decimals, is the convexity guarantee made ' +
			'visible. So why ever iterate? Scale and generality. Solving the ' +
			'normal equation is O(d&sup3;) in the feature count and wants the ' +
			'whole dataset in memory; gradient descent streams. And the moment ' +
			'the loss changes (logistic, hinge) or the model has no closed form ' +
			'(anything deep), iteration is the <em>only</em> option — ' +
			'sklearn&rsquo;s <code>SGDRegressor</code> is exactly your loop with ' +
			'minibatches and a learning-rate schedule bolted on.</p>' +
			'<h3>Reading the model, and where it lies</h3>' +
			'<p><code>w=0.78</code> reads as &ldquo;each year of experience adds ' +
			'$7,800&rdquo; and <code>b=3.69</code> is the zero-experience ' +
			'intercept — readable coefficients are why regulated industries ' +
			'(credit, insurance, clinical) still run on linear models. But squared ' +
			'error has sharp edges in production: it is ' +
			'<strong>outlier-hungry</strong> (one executive salary drags the whole ' +
			'line toward it; MAE or Huber loss resists), and training-set ' +
			'R&sup2; only ever goes up as you add features, which is why adjusted ' +
			'R&sup2; and held-out evaluation exist. Also note what R&sup2;=0.9943 ' +
			'does <em>not</em> say: nothing about causality, and nothing about ' +
			'extrapolation — this line saw 1&ndash;6 years of experience, and its ' +
			'opinion about 30 years is fiction. The evaluation items later in the ' +
			'track (scaling leakage, cross-validation) are the professional ' +
			'response to exactly these traps.</p>' +
			'<h3>The gradient shape that keeps coming back</h3>' +
			'<p>The gradient you implemented — <code>(prediction &minus; truth) ' +
			'&times; input</code> — is the most important pattern in this track. ' +
			'Logistic regression&rsquo;s gradient is the <em>same expression</em> ' +
			'with probabilities in place of raw predictions (the next item pins ' +
			'that), and backpropagation is this rule applied layer by layer ' +
			'through the chain rule. Interviewers probe it constantly: ' +
			'&ldquo;derive the MSE gradient&rdquo;, &ldquo;why does the bias get ' +
			'the plain errors without the x&rdquo; (its input is the constant 1), ' +
			'&ldquo;what changes with a thousand features&rdquo; (w becomes a ' +
			'vector, products become dot products, nothing else moves). Learn the ' +
			'shape here, where every number is hand-checkable — you will meet it ' +
			'again wearing a sigmoid, and then wearing a transformer.</p>',
		],
		complexity: { time: 'O(steps · n) — each full-batch gradient is one pass over the n points', space: 'O(n) for a prediction column; the model itself is two floats — O(1)' },
	});
})();
