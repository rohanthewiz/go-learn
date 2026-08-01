/* The Perceptron: One Neuron, One Line — Neural Networks (Easy). Rosenblatt's
 * 1958 unit: step activation, mistake-driven updates, train-until-clean-pass.
 * The harness pins the Step(0)=1 boundary convention, one update on a
 * misclassified sample, the no-op on a correct one, exact converged weights
 * for AND and OR (all-integer arithmetic at lr=1, so floats are exact), and
 * the Minsky–Papert wall: XOR exhausts every epoch and never converges —
 * which is precisely the cliffhanger the next item (backprop-mlp) resolves.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// A single neuron: weighted sum, then a hard threshold. Same visual
	// grammar as the MLP diagram next door so the "stack these into layers"
	// hand-off is literal. Marker ids suffixed AIPRC — every track's SVGs
	// share the page's id namespace.
	var NEURON_DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-label="a single perceptron: two inputs feed a weighted sum plus bias, which passes through a hard step threshold to produce a 0 or 1 output">' +
		'<text x="20" y="20" class="lbl">one neuron: weighted sum, then a hard yes/no</text>' +
		// input nodes
		'<circle cx="70" cy="70" r="16" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="70" y="75" text-anchor="middle">x1</text>' +
		'<circle cx="70" cy="140" r="16" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="70" y="145" text-anchor="middle">x2</text>' +
		// weighted edges into the sum
		'<path d="M 86 70 L 214 98" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIPRC)"/>' +
		'<path d="M 86 140 L 214 112" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIPRC)"/>' +
		'<text x="150" y="72" text-anchor="middle" class="lbl">w[0]</text>' +
		'<text x="150" y="146" text-anchor="middle" class="lbl">w[1]</text>' +
		// sum node
		'<circle cx="240" cy="105" r="20" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="240" y="110" text-anchor="middle">&#931;+b</text>' +
		// step box
		'<path d="M 264 105 L 320 105" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIPRC)"/>' +
		'<rect x="326" y="82" width="70" height="46" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="361" y="109" text-anchor="middle">step</text>' +
		// output
		'<path d="M 400 105 L 452 105" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIPRC)"/>' +
		'<text x="472" y="110" text-anchor="middle">0/1</text>' +
		'<text x="240" y="160" text-anchor="middle" class="lbl">z = w[0]&#183;x[0] + w[1]&#183;x[1] + b</text>' +
		'<text x="361" y="160" text-anchor="middle" class="lbl">out = 1 if z &#8805; 0 else 0</text>' +
		'<defs>' +
		'<marker id="dgArrowAIPRC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	// Why AND is learnable and XOR is not, as geometry: the perceptron's
	// entire hypothesis space is "one straight line". Unit squares drawn
	// side by side; filled dots are class 1, open dots class 0.
	var SEPARABILITY_DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 230" width="520" height="230" role="img" aria-label="two scatter plots of the unit square: AND has a single dashed line separating the one positive corner from the three negative corners; XOR has its positive and negative corners on opposite diagonals, which no single straight line can separate">' +
		'<text x="130" y="24" text-anchor="middle" class="lbl">AND &#8212; one line suffices</text>' +
		'<text x="390" y="24" text-anchor="middle" class="lbl">XOR &#8212; no single line works</text>' +
		// AND axes
		'<path d="M 60 185 L 210 185" fill="none" stroke="var(--muted)" stroke-width="1"/>' +
		'<path d="M 60 185 L 60 60" fill="none" stroke="var(--muted)" stroke-width="1"/>' +
		// AND points: (1,1) is the lone positive corner
		'<circle cx="70" cy="175" r="7" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<circle cx="70" cy="85" r="7" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<circle cx="160" cy="175" r="7" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<circle cx="160" cy="85" r="7" fill="var(--accent)"/>' +
		// the separating line x1 + x2 = 1.5, dashed
		'<path d="M 205 165 L 95 55" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="6 4"/>' +
		// XOR axes
		'<path d="M 320 185 L 470 185" fill="none" stroke="var(--muted)" stroke-width="1"/>' +
		'<path d="M 320 185 L 320 60" fill="none" stroke="var(--muted)" stroke-width="1"/>' +
		// XOR points: positives on one diagonal, negatives on the other
		'<circle cx="330" cy="175" r="7" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<circle cx="420" cy="85" r="7" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<circle cx="330" cy="85" r="7" fill="var(--warn)"/>' +
		'<circle cx="420" cy="175" r="7" fill="var(--warn)"/>' +
		'<text x="390" y="135" text-anchor="middle" class="lbl" style="fill:var(--warn)">?</text>' +
		'<text x="130" y="215" text-anchor="middle" class="lbl">&#9679; class 1&#160;&#160;&#9675; class 0</text>' +
		'<text x="390" y="215" text-anchor="middle" class="lbl">opposite diagonals: provably stuck</text>' +
		'</svg>';

	T.problem({
		id: 'perceptron',
		title: 'The Perceptron: One Neuron, One Line',
		nav: 'perceptron',
		difficulty: 'Easy',
		category: 'Neural Networks',
		task: 'Implement the step activation, the perceptron prediction, and the mistake-driven learning rule — train it to learn AND and OR, and watch it provably fail on XOR.',

		prose: [
			'<h2>The Perceptron: One Neuron, One Line</h2>' +
			'<p>In 1958 Frank Rosenblatt demonstrated a machine that <em>learned</em> ' +
			'from examples — no reprogramming, just weight nudges — and the New ' +
			'York Times promptly promised an electronic brain that would "walk, ' +
			'talk, see, write, reproduce itself and be conscious of its ' +
			'existence." That machine was the perceptron: a single artificial ' +
			'neuron, and the direct ancestor of every network in this track. ' +
			'Eleven years later Minsky and Papert proved it could never learn a ' +
			'function as small as XOR, funding evaporated, and the first AI ' +
			'winter set in. Both halves of that story are yours to build here: ' +
			'the learning rule that genuinely works, and the wall it genuinely ' +
			'hits. The next item breaks through the wall by stacking these ' +
			'neurons into a <em>multi-layer perceptron</em> — the "MLP" you will ' +
			'see abbreviated everywhere from PyTorch modules to transformer ' +
			'blocks is nothing more than this unit, layered.</p>' +
			'<h3>The neuron</h3>' +
			'<p>A perceptron is a weighted sum pushed through a hard threshold:</p>' +
			'<ul>' +
			'<li><code>z = w[0]&middot;x[0] + w[1]&middot;x[1] + &hellip; + b</code> — the same linear score as regression</li>' +
			'<li><code>out = Step(z)</code>, where <code>Step(z)</code> is <code>1</code> if <code>z &ge; 0</code>, else <code>0</code> — note the boundary fires</li>' +
			'</ul>' +
			NEURON_DIAGRAM +
			'<h3>The learning rule: only mistakes teach</h3>' +
			'<p>No loss function, no derivatives. Compare the prediction to the ' +
			'label and let the error — always <code>-1</code>, <code>0</code>, or ' +
			'<code>+1</code> — steer the weights:</p>' +
			'<ul>' +
			'<li><code>err = y - Predict(x)</code></li>' +
			'<li><code>w[i] += lr &middot; err &middot; x[i]</code> &nbsp; <code>b += lr &middot; err</code></li>' +
			'</ul>' +
			'<p>When the prediction is right, <code>err = 0</code> and nothing ' +
			'moves. When it fires and should not (<code>err = -1</code>), the rule ' +
			'subtracts the input from the weights, dragging the score down for ' +
			'that region; a miss in the other direction adds it. A weight whose ' +
			'input is 0 never moves — the same only-active-inputs-learn behavior ' +
			'you will meet again in backprop. First epoch on AND, from ' +
			'<code>w = [0, 0]</code>, <code>b = 0</code>, <code>lr = 1</code>:</p>',
			{ lang: 'txt', code: 'sample (0,0) y=0:  z=0    -> pred 1  err=-1   w=[0 0]  b=-1   (only b moves: x is 0)\nsample (0,1) y=0:  z=-1   -> pred 0  err=0    no change\nsample (1,0) y=0:  z=-1   -> pred 0  err=0    no change\nsample (1,1) y=1:  z=-1   -> pred 0  err=+1   w=[1 1]  b=0\n\n...five more epochs of nudges settle at w=[2 1] b=-3,\nwhich classifies all four AND rows perfectly.' },
			'<h3>Convergence — and the wall</h3>' +
			'<p>Geometrically, <code>w&middot;x + b = 0</code> is a straight line ' +
			'(a hyperplane in higher dimensions), and the perceptron\'s entire ' +
			'hypothesis space is "one line". The perceptron convergence theorem ' +
			'(Novikoff, 1962) guarantees that if <em>any</em> separating line ' +
			'exists, the mistake-driven rule finds one in finitely many updates. ' +
			'The converse is the trap: XOR puts its positive corners on one ' +
			'diagonal and its negative corners on the other, no line separates ' +
			'them, so a mistake-free pass is impossible and training churns ' +
			'forever. This is not a tuning problem — no learning rate, epoch ' +
			'count, or initialization fixes it.</p>' +
			SEPARABILITY_DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Step</code>, <code>Predict</code>, ' +
			'<code>Mistakes</code>, <code>PerceptronStep</code>, and ' +
			'<code>Train</code> exactly as specified in the doc comments. ' +
			'<code>PerceptronStep</code> must return a <em>fresh</em> weight ' +
			'slice and leave its inputs untouched, and <code>Train</code> stops ' +
			'early after its first mistake-free pass — the harness checks both, ' +
			'and checks that XOR exhausts every epoch.</p>' +
			'<div class="tip">The boundary convention is a real trap: ' +
			'<code>Step(0)</code> must return 1. From an all-zero start every ' +
			'score begins at exactly 0, so a <code>z &gt; 0</code> neuron ' +
			'predicts all zeros, never errs on negative samples, and learns a ' +
			'different (wrong) trajectory. The very first harness case pins ' +
			'this before anything else can go sideways.</div>',
		],

		starter: [
			'package main',
			'',
			'// Step is the hard threshold: 1 if z >= 0, else 0. The boundary',
			'// fires — Step(0) must be 1 (the harness pins it, and the AND/OR',
			'// training traces depend on it).',
			'func Step(z float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Predict runs the neuron: Step(w[0]*x[0] + ... + w[n-1]*x[n-1] + b).',
			'func Predict(x []float64, w []float64, b float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Mistakes counts how many samples the current weights misclassify:',
			'// the number of i where Predict(X[i], w, b) != Y[i].',
			'func Mistakes(X [][]float64, Y []float64, w []float64, b float64) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// PerceptronStep applies the learning rule for ONE sample (x, y) and',
			'// returns the updated (w, b) as a FRESH slice — it must NOT mutate',
			'// its inputs. With err = y - Predict(x, w, b):',
			'//',
			'//   w[i] += lr * err * x[i]',
			'//   b    += lr * err',
			'//',
			'// A correctly classified sample has err = 0 and changes nothing.',
			'func PerceptronStep(x []float64, y float64, w []float64, b float64, lr float64) ([]float64, float64) {',
			'	// your code here',
			'	return nil, 0',
			'}',
			'',
			'// Train runs passes over the dataset in index order (no shuffling —',
			'// determinism is a track rule), applying PerceptronStep to every',
			'// sample. It stops after the first pass that misclassified nothing,',
			'// or after maxEpochs passes, whichever comes first. Returns the final',
			'// weights, bias, and the number of passes actually run (counting the',
			'// final clean pass).',
			'func Train(X [][]float64, Y []float64, w []float64, b float64, maxEpochs int, lr float64) ([]float64, float64, int) {',
			'	// your code here',
			'	return nil, 0, 0',
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
			'	// The three gates share inputs; only the labels differ. AND and OR',
			'	// are linearly separable, XOR famously is not.',
			'	X := [][]float64{{0, 0}, {0, 1}, {1, 0}, {1, 1}}',
			'	andY := []float64{0, 0, 0, 1}',
			'	orY := []float64{0, 1, 1, 1}',
			'	xorY := []float64{0, 1, 1, 0}',
			'',
			'	cloneVec := func(v []float64) []float64 { return append([]float64(nil), v...) }',
			'',
			'	// lr=1 from all-zero weights keeps every quantity an exact integer,',
			'	// so float comparisons below are exact, not approximate.',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"Step boundary convention: Step(0)=1 (the boundary fires), Step(0.7), Step(-0.7)",',
			'			"1 1 0",',
			'			func() string { return fmt.Sprintf("%.0f %.0f %.0f", Step(0), Step(0.7), Step(-0.7)) }},',
			'		{"Predict with w=[0.5 -0.5] b=0.1: (1,1) scores 0.1, (0,1) scores -0.4",',
			'			"1 0",',
			'			func() string {',
			'				w := []float64{0.5, -0.5}',
			'				return fmt.Sprintf("%.0f %.0f", Predict([]float64{1, 1}, w, 0.1), Predict([]float64{0, 1}, w, 0.1))',
			'			}},',
			'		{"PerceptronStep on a misclassified sample: (1,1) y=0 with w=[0.5 -0.5] b=0 lr=0.5",',
			'			"w=[0.00 -1.00] b=-0.50",',
			'			func() string {',
			'				nw, nb := PerceptronStep([]float64{1, 1}, 0, []float64{0.5, -0.5}, 0, 0.5)',
			'				return fmt.Sprintf("w=[%.2f %.2f] b=%.2f", nw[0], nw[1], nb)',
			'			}},',
			'		{"PerceptronStep on a CORRECT sample is a no-op: only mistakes teach",',
			'			"w=[0.50 -0.50] b=0.00",',
			'			func() string {',
			'				nw, nb := PerceptronStep([]float64{0, 1}, 0, []float64{0.5, -0.5}, 0, 0.5)',
			'				return fmt.Sprintf("w=[%.2f %.2f] b=%.2f", nw[0], nw[1], nb)',
			'			}},',
			'		{"PerceptronStep returns a fresh slice: the caller\'s weights must be untouched",',
			'			"w[0]=0.50",',
			'			func() string {',
			'				w := []float64{0.5, -0.5}',
			'				PerceptronStep([]float64{1, 1}, 0, w, 0, 0.5)',
			'				return fmt.Sprintf("w[0]=%.2f", w[0])',
			'			}},',
			'		{"Train learns AND from zeros (lr=1): exact weights, clean pass on epoch 6",',
			'			"w=[2 1] b=-3 epochs=6 mistakes=0",',
			'			func() string {',
			'				w, b, ep := Train(X, andY, []float64{0, 0}, 0, 25, 1)',
			'				return fmt.Sprintf("w=[%.0f %.0f] b=%.0f epochs=%d mistakes=%d", w[0], w[1], b, ep, Mistakes(X, andY, w, b))',
			'			}},',
			'		{"Train learns OR from zeros (lr=1): exact weights, clean pass on epoch 4",',
			'			"w=[1 1] b=-1 epochs=4 mistakes=0",',
			'			func() string {',
			'				w, b, ep := Train(X, orY, []float64{0, 0}, 0, 25, 1)',
			'				return fmt.Sprintf("w=[%.0f %.0f] b=%.0f epochs=%d mistakes=%d", w[0], w[1], b, ep, Mistakes(X, orY, w, b))',
			'			}},',
			'		{"XOR is not linearly separable: 25 epochs all run, never a clean pass (Minsky-Papert, 1969)",',
			'			"epochs=25 solved=false",',
			'			func() string {',
			'				w, b, ep := Train(X, xorY, cloneVec([]float64{0, 0}), 0, 25, 1)',
			'				return fmt.Sprintf("epochs=%d solved=%v", ep, Mistakes(X, xorY, w, b) == 0)',
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
			'// Step fires ON the boundary: z >= 0, not z > 0. From an all-zero',
			'// init every score starts at exactly 0, so a strict > here predicts',
			'// all zeros, never errs on negative samples, and walks a different',
			'// weight trajectory — the harness\'s pinned AND/OR traces would all',
			'// diverge from this one character.',
			'func Step(z float64) float64 {',
			'	if z >= 0 {',
			'		return 1',
			'	}',
			'	return 0',
			'}',
			'',
			'// Predict is the whole forward pass of a one-neuron network: the same',
			'// linear score as regression, hard-thresholded. Loop over len(x) so',
			'// the neuron works for any input width, not just the 2-D gates here.',
			'func Predict(x []float64, w []float64, b float64) float64 {',
			'	z := b',
			'	for i := range x {',
			'		z += w[i] * x[i]',
			'	}',
			'	return Step(z)',
			'}',
			'',
			'// Mistakes is the perceptron\'s only "metric": a count, not a loss.',
			'// There is no gradient to take — Step is flat everywhere it is',
			'// differentiable — which is exactly why the next item swaps in',
			'// sigmoid before deriving backprop.',
			'func Mistakes(X [][]float64, Y []float64, w []float64, b float64) int {',
			'	count := 0',
			'	for i := range X {',
			'		if Predict(X[i], w, b) != Y[i] {',
			'			count++',
			'		}',
			'	}',
			'	return count',
			'}',
			'',
			'// PerceptronStep: err is always -1, 0, or +1, so the update is "add',
			'// the input to the weights, signed by which way we were wrong". A',
			'// fresh slice comes back even when err = 0 — callers hold references',
			'// to the old weights (the harness literally checks), and returning',
			'// the input slice only on the no-op path would make mutation bugs',
			'// appear and disappear with the data.',
			'func PerceptronStep(x []float64, y float64, w []float64, b float64, lr float64) ([]float64, float64) {',
			'	err := y - Predict(x, w, b)',
			'	newW := make([]float64, len(w))',
			'	for i := range w {',
			'		newW[i] = w[i] + lr*err*x[i]',
			'	}',
			'	return newW, b + lr*err',
			'}',
			'',
			'// Train is the classic run-until-clean-pass loop. The mistake count',
			'// is tallied DURING the pass (a sample misclassified at its moment',
			'// of visit), not by re-scanning afterward — mid-pass updates can fix',
			'// or break earlier samples, and the convergence theorem\'s "finitely',
			'// many updates" guarantee is stated in terms of visits. For XOR no',
			'// clean pass can exist (a clean pass IS a separating line), so the',
			'// loop provably exhausts maxEpochs — the harness counts on it.',
			'func Train(X [][]float64, Y []float64, w []float64, b float64, maxEpochs int, lr float64) ([]float64, float64, int) {',
			'	for epoch := 1; epoch <= maxEpochs; epoch++ {',
			'		missed := 0',
			'		for i := range X {',
			'			if Predict(X[i], w, b) != Y[i] {',
			'				missed++',
			'			}',
			'			w, b = PerceptronStep(X[i], Y[i], w, b, lr)',
			'		}',
			'		if missed == 0 {',
			'			return w, b, epoch',
			'		}',
			'	}',
			'	return w, b, maxEpochs',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the rule works: geometry, not calculus</h3>' +
			'<p>Every update adds <code>&plusmn;x</code> to <code>w</code>, which ' +
			'rotates and shifts the decision line <em>toward</em> the ' +
			'misclassified point: a false negative pulls the positive half-plane ' +
			'over the sample, a false positive pushes it away. The convergence ' +
			'theorem makes this quantitative — if a separating line exists with ' +
			'margin <code>&gamma;</code> and inputs are bounded by <code>R</code>, ' +
			'the perceptron makes at most <code>(R/&gamma;)&sup2;</code> mistakes ' +
			'total, ever. Notice what is absent: no loss surface, no learning-rate ' +
			'schedule, no epoch budget in the bound. With err locked to ' +
			'<code>&plusmn;1</code>, <code>lr</code> only scales the weights ' +
			'uniformly, which never changes the sign of any score — the reason ' +
			'the harness can safely pin <code>lr = 1</code>.</p>' +
			'<h3>The neuron that survived</h3>' +
			'<p>Replace <code>Step</code> with <code>Sigmoid</code> and this exact ' +
			'unit becomes logistic regression from earlier in the track — same ' +
			'score, soft threshold, and now a gradient exists everywhere. That ' +
			'swap is the whole unlock for what follows: Step is flat wherever it ' +
			'is differentiable, so there is nothing for the chain rule to ' +
			'propagate through, and no way to assign blame to a <em>hidden</em> ' +
			'unit whose output feeds another unit. Differentiable activations are ' +
			'what let the multi-layer perceptron — MLP, the next item — train ' +
			'its hidden layer at all. Modern networks are this progression at ' +
			'scale: a transformer\'s feed-forward block is an MLP, which is ' +
			'Rosenblatt\'s neuron, layered, with the threshold softened.</p>' +
			'<h3>What Minsky and Papert actually proved</h3>' +
			'<p><em>Perceptrons</em> (1969) was not a bug report; it was a ' +
			'characterization of the hypothesis class. One neuron computes one ' +
			'linear boundary, and XOR — parity on two bits — needs a region no ' +
			'half-plane can carve. The fix was already imaginable (a hidden ' +
			'layer computing intermediate features: XOR is <code>OR AND NOT ' +
			'AND</code>, three gates this item just learned), but with no ' +
			'training rule for hidden weights the observation stood for ' +
			'seventeen years, until backpropagation was popularized in 1986. ' +
			'That gap is the historical hinge the next item walks you across: ' +
			'the 2-2-1 network there solves XOR with two hidden neurons, and the ' +
			'chain rule is the missing credit-assignment rule.</p>' +
			'<h3>Reading the trained weights</h3>' +
			'<p>The converged AND weights <code>w = [2, 1], b = -3</code> are ' +
			'legible in a way deep-net weights never are: the score reaches 0 ' +
			'only when both inputs fire (2 + 1 - 3 = 0 — and the boundary fires, ' +
			'which is why the <code>Step(0) = 1</code> convention was pinned ' +
			'first). The asymmetry between the two weights is a fingerprint of ' +
			'visiting samples in fixed index order — a shuffled pass would land ' +
			'on a different valid line. One-line linear separators still earn ' +
			'their keep in production as fast, auditable baselines: a spam ' +
			'filter\'s "score above threshold" stage is this neuron with better ' +
			'features.</p>',
		],
		complexity: { time: 'O(epochs · samples · features) — one score and at most one update per sample visit', space: 'O(features) — the weight vector is the entire model' },
	});
})();
