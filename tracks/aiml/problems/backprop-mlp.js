/* Backpropagation: Train an MLP on XOR — Neural Networks (Hard). The chain
 * rule as bookkeeping: forward pass, output/hidden deltas, per-sample SGD on
 * a 2-2-1 sigmoid net with pinned asymmetric init. The harness pins the
 * forward values, the first update step (via go run), strictly decreasing
 * loss checkpoints, converged XOR outputs, and the symmetric-init trap —
 * identical hidden rows stay identical forever, so the net can never learn.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// 2-2-1 network: activations flow left-to-right (accent), deltas flow
	// right-to-left (warn). Marker ids suffixed AIMLP — every track's SVGs
	// share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="a 2-2-1 network: inputs feed two sigmoid hidden units feeding one sigmoid output; activations flow forward, deltas flow backward along the same edges">' +
		'<text x="20" y="20" class="lbl">forward: activations left to right — backward: deltas retrace the same edges</text>' +
		// input nodes
		'<circle cx="70" cy="70" r="16" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="70" y="75" text-anchor="middle">x1</text>' +
		'<circle cx="70" cy="150" r="16" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="70" y="155" text-anchor="middle">x2</text>' +
		// hidden nodes
		'<circle cx="240" cy="70" r="16" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="240" y="75" text-anchor="middle">h1</text>' +
		'<circle cx="240" cy="150" r="16" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="240" y="155" text-anchor="middle">h2</text>' +
		// output node
		'<circle cx="410" cy="110" r="16" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="410" y="115" text-anchor="middle">out</text>' +
		// forward edges
		'<path d="M 86 70 L 220 70" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIMLP)"/>' +
		'<path d="M 86 150 L 220 150" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIMLP)"/>' +
		'<path d="M 86 76 L 220 144" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIMLP)"/>' +
		'<path d="M 86 144 L 220 76" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIMLP)"/>' +
		'<path d="M 256 76 L 390 106" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIMLP)"/>' +
		'<path d="M 256 144 L 390 114" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIMLP)"/>' +
		// backward delta arrows (offset below the forward edges)
		'<path d="M 392 130 C 330 168 300 168 262 160" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowBackAIMLP)"/>' +
		'<text x="335" y="186" text-anchor="middle" class="lbl" style="fill:var(--warn)">delta_out = (out−y)·out·(1−out)</text>' +
		'<text x="160" y="196" text-anchor="middle" class="lbl" style="fill:var(--warn)">delta_h[j] = delta_out·w2[j]·h[j]·(1−h[j])</text>' +
		'<text x="240" y="44" text-anchor="middle" class="lbl">h[j] = sigmoid(w1[j]·x + b1[j])</text>' +
		'<text x="440" y="80" text-anchor="middle" class="lbl">sigmoid</text>' +
		'<defs>' +
		'<marker id="dgArrowAIMLP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowBackAIMLP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'backprop-mlp',
		title: 'Backpropagation: Train an MLP on XOR',
		nav: 'backprop',
		difficulty: 'Hard',
		category: 'Neural Networks',
		task: 'Implement the forward pass, the chain-rule deltas, and per-sample SGD for a 2-2-1 sigmoid MLP — and train it to solve XOR.',

		prose: [
			'<h2>Backpropagation: Train an MLP on XOR</h2>' +
			'<p>You call <code>loss.backward()</code> every day, and one day it bites: ' +
			'a from-scratch net whose loss freezes at exactly the predict-the-mean ' +
			'plateau, every output stuck near 0.5, gradients flowing but going ' +
			'nowhere. The cause turns out to be one line — every hidden unit was ' +
			'initialized with the <em>same</em> weights. You cannot debug that ' +
			'without knowing what backward() actually computes. This item makes ' +
			'gradients stop being magic: you will build the forward pass, derive ' +
			'the two delta formulas, and train a 2-2-1 network on XOR — the ' +
			'dataset that famously has no linear solution (Minsky and Papert, ' +
			'1969) and therefore <em>needs</em> the hidden layer.</p>' +
			'<h3>The network</h3>' +
			'<p>Two inputs, two sigmoid hidden units, one sigmoid output:</p>' +
			'<ul>' +
			'<li><code>h[j] = sigmoid(w1[j][0]·x[0] + w1[j][1]·x[1] + b1[j])</code> — <code>w1</code> is indexed <code>[hidden][input]</code></li>' +
			'<li><code>out = sigmoid(w2[0]·h[0] + w2[1]·h[1] + b2)</code></li>' +
			'<li>per-sample loss <code>L = 0.5·(out − y)²</code>; the dataset loss is the mean over samples</li>' +
			'</ul>' +
			'<h3>Backward: the chain rule as two deltas</h3>' +
			'<p>Sigmoid has the tidy derivative <code>s·(1−s)</code>, so the whole ' +
			'chain rule collapses into two local quantities:</p>' +
			'<ul>' +
			'<li><strong>Output delta</strong>: <code>dOut = (out − y)·out·(1−out)</code> — loss slope times activation slope.</li>' +
			'<li><strong>Hidden delta</strong>: <code>dHid[j] = dOut·w2[j]·h[j]·(1−h[j])</code> — the output delta, routed backward through the edge weight, times the local slope. Use the <em>old</em> <code>w2</code> here (all gradients are evaluated at the current weights, then everything updates at once).</li>' +
			'<li><strong>Updates</strong> (gradient = delta × upstream activation): <code>w2[j] -= lr·dOut·h[j]</code>, <code>b2 -= lr·dOut</code>, <code>w1[j][i] -= lr·dHid[j]·x[i]</code>, <code>b1[j] -= lr·dHid[j]</code>.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>Worked numbers with the pinned initial weights ' +
			'<code>w1 = [[0.5, −0.3], [−0.4, 0.6]]</code>, <code>b1 = [0.1, −0.2]</code>, ' +
			'<code>w2 = [0.7, −0.5]</code>, <code>b2 = 0.05</code> — deliberately ' +
			'small and <em>asymmetric</em>:</p>',
			{ lang: 'txt', code: 'forward (1,0):  h1 = sigmoid(0.5+0.1)  = 0.6457\n                h2 = sigmoid(-0.4-0.2) = 0.3543\n                out = sigmoid(0.7*0.6457 - 0.5*0.3543 + 0.05) = 0.5805\n\nbackprop step on (1,0), y=1, lr=0.9:\n  dOut = (0.5805-1)*0.5805*(1-0.5805) = -0.1021\n  w2 becomes [0.7594 -0.4674], b2 becomes 0.1419\n  w1[0][0] becomes 0.5147 — but w1[0][1] stays -0.3000 (x[1] is 0:\n  a weight only learns when its input fires)' },
			'<h3>Training</h3>' +
			'<p><code>Train</code> is plain online SGD: for each epoch, walk the ' +
			'samples in index order and apply <code>BackpropStep</code> after every ' +
			'sample. With the pinned init and <code>lr = 0.9</code>, 2000 epochs take ' +
			'XOR from loss 0.1266 to 0.0007 and all four outputs past the 0.9 / 0.1 ' +
			'thresholds. Real training differs in scale, not kind: minibatches ' +
			'instead of single samples, shuffled order instead of fixed, ' +
			'cross-entropy instead of MSE, and matrices instead of these loops — ' +
			'every simplification here is disclosed so the harness stays ' +
			'deterministic with exactly one right answer per case.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Sigmoid</code>, <code>Forward</code>, ' +
			'<code>Loss</code>, <code>BackpropStep</code>, and <code>Train</code> ' +
			'exactly as specified in the doc comments. <code>BackpropStep</code> ' +
			'must return <em>fresh</em> slices and leave its inputs untouched — the ' +
			'harness checks.</p>' +
			'<div class="tip">Why the plateau in the war story is inevitable: if two ' +
			'hidden units start with identical weights they compute identical ' +
			'activations, receive identical deltas, and take identical updates — ' +
			'forever. Gradient descent preserves the symmetry it starts with; only ' +
			'asymmetric initialization lets the units specialize. The harness ' +
			'trains a symmetric init for 500 epochs and watches it stay stuck.</div>',
		],

		starter: [
			'package main',
			'',
			'import "math"',
			'',
			'var _ = math.Exp // remove once you use math',
			'',
			'// Sigmoid is the logistic function 1/(1+e^-z). It squashes any real',
			'// number into (0,1) and has the derivative Sigmoid(z)*(1-Sigmoid(z)),',
			'// which is what makes the delta formulas below so compact.',
			'func Sigmoid(z float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Forward runs the 2-2-1 network and returns (hidden, out):',
			'//',
			'//   hidden[j] = Sigmoid(w1[j][0]*x[0] + w1[j][1]*x[1] + b1[j])',
			'//   out       = Sigmoid(w2[0]*hidden[0] + w2[1]*hidden[1] + b2)',
			'//',
			'// w1 is indexed [hidden unit][input]; hidden has len(w1) entries.',
			'func Forward(x []float64, w1 [][]float64, b1 []float64, w2 []float64, b2 float64) ([]float64, float64) {',
			'	// your code here',
			'	return nil, 0',
			'}',
			'',
			'// Loss is the mean per-sample squared error over the dataset:',
			'//',
			'//   mean over i of 0.5 * (Forward(X[i])out - Y[i])^2',
			'func Loss(X [][]float64, Y []float64, w1 [][]float64, b1 []float64, w2 []float64, b2 float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// BackpropStep performs ONE gradient-descent update for ONE sample',
			'// (x, y) and returns the updated (w1, b1, w2, b2) as FRESH slices —',
			'// it must NOT mutate any of its inputs. The chain rule:',
			'//',
			'//   dOut    = (out - y) * out * (1 - out)',
			'//   dHid[j] = dOut * w2[j] * h[j] * (1 - h[j])   // OLD w2, before its update',
			'//',
			'//   w2[j] -= lr * dOut * h[j]      b2 -= lr * dOut',
			'//   w1[j][i] -= lr * dHid[j] * x[i]   b1[j] -= lr * dHid[j]',
			'//',
			'// All gradients are evaluated at the incoming weights; every update',
			'// then applies at once.',
			'func BackpropStep(x []float64, y float64, w1 [][]float64, b1 []float64, w2 []float64, b2 float64, lr float64) ([][]float64, []float64, []float64, float64) {',
			'	// your code here',
			'	return nil, nil, nil, 0',
			'}',
			'',
			'// Train runs online SGD: epochs full passes over the dataset, applying',
			'// BackpropStep to each sample in index order (no shuffling — the fixed',
			'// order keeps every run deterministic). Returns the final weights.',
			'func Train(X [][]float64, Y []float64, w1 [][]float64, b1 []float64, w2 []float64, b2 float64, epochs int, lr float64) ([][]float64, []float64, []float64, float64) {',
			'	// your code here',
			'	return nil, nil, nil, 0',
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
			'	// XOR: the canonical not-linearly-separable dataset.',
			'	X := [][]float64{{0, 0}, {0, 1}, {1, 0}, {1, 1}}',
			'	Y := []float64{0, 1, 1, 0}',
			'	// Pinned asymmetric init — small values, no two hidden rows equal.',
			'	initW1 := [][]float64{{0.5, -0.3}, {-0.4, 0.6}}',
			'	initB1 := []float64{0.1, -0.2}',
			'	initW2 := []float64{0.7, -0.5}',
			'	initB2 := 0.05',
			'	lr := 0.9',
			'',
			'	cloneMat := func(m [][]float64) [][]float64 {',
			'		out := make([][]float64, len(m))',
			'		for i := range m {',
			'			out[i] = append([]float64(nil), m[i]...)',
			'		}',
			'		return out',
			'	}',
			'	cloneVec := func(v []float64) []float64 { return append([]float64(nil), v...) }',
			'',
			'	// Trained weights, filled by the checkpoint case and reused by the',
			'	// XOR-outputs case (chained so the 2000 epochs run only once).',
			'	var tw1 [][]float64',
			'	var tb1 []float64',
			'	var tw2 []float64',
			'	var tb2 float64',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"Sigmoid worked values: s(0)=0.5, s(2), s(-2) — symmetric around 0.5",',
			'			"0.5000 0.8808 0.1192",',
			'			func() string { return fmt.Sprintf("%.4f %.4f %.4f", Sigmoid(0), Sigmoid(2), Sigmoid(-2)) }},',
			'		{"Forward (0,0) with the pinned init: biases alone decide (zero inputs)",',
			'			"h=[0.5250 0.4502] out=0.5480",',
			'			func() string {',
			'				h, out := Forward([]float64{0, 0}, cloneMat(initW1), cloneVec(initB1), cloneVec(initW2), initB2)',
			'				return fmt.Sprintf("h=[%.4f %.4f] out=%.4f", h[0], h[1], out)',
			'			}},',
			'		{"Forward (1,0) with the pinned init — the worked example from the prose",',
			'			"h=[0.6457 0.3543] out=0.5805",',
			'			func() string {',
			'				h, out := Forward([]float64{1, 0}, cloneMat(initW1), cloneVec(initB1), cloneVec(initW2), initB2)',
			'				return fmt.Sprintf("h=[%.4f %.4f] out=%.4f", h[0], h[1], out)',
			'			}},',
			'		{"Loss at init: near the predict-the-mean plateau of 0.125",',
			'			"0.1266",',
			'			func() string {',
			'				return fmt.Sprintf("%.4f", Loss(X, Y, cloneMat(initW1), cloneVec(initB1), cloneVec(initW2), initB2))',
			'			}},',
			'		{"One BackpropStep on (1,0) y=1: w1[0][1] must NOT move — its input x[1] is 0",',
			'			"w1=[[0.5147 -0.3000] [-0.4105 0.6000]] b1=[0.1147 -0.2105] w2=[0.7594 -0.4674] b2=0.1419",',
			'			func() string {',
			'				nw1, nb1, nw2, nb2 := BackpropStep([]float64{1, 0}, 1, cloneMat(initW1), cloneVec(initB1), cloneVec(initW2), initB2, lr)',
			'				return fmt.Sprintf("w1=[[%.4f %.4f] [%.4f %.4f]] b1=[%.4f %.4f] w2=[%.4f %.4f] b2=%.4f",',
			'					nw1[0][0], nw1[0][1], nw1[1][0], nw1[1][1], nb1[0], nb1[1], nw2[0], nw2[1], nb2)',
			'			}},',
			'		{"BackpropStep returns fresh slices: the caller\'s weights must be untouched",',
			'			"w1[0][0]=0.5000 w2[0]=0.7000",',
			'			func() string {',
			'				w1 := cloneMat(initW1)',
			'				w2 := cloneVec(initW2)',
			'				BackpropStep([]float64{1, 0}, 1, w1, cloneVec(initB1), w2, initB2, lr)',
			'				return fmt.Sprintf("w1[0][0]=%.4f w2[0]=%.4f", w1[0][0], w2[0])',
			'			}},',
			'		{"Loss strictly decreases across checkpoints 200/1000/2000 epochs (lr=0.9)",',
			'			"0.1249 0.0078 0.0007 dec=true",',
			'			func() string {',
			'				l0 := Loss(X, Y, cloneMat(initW1), cloneVec(initB1), cloneVec(initW2), initB2)',
			'				// Chained: 200, +800, +1000 epochs — identical to fresh runs',
			'				// of 200/1000/2000 because training is deterministic.',
			'				w1, b1, w2, b2 := Train(X, Y, cloneMat(initW1), cloneVec(initB1), cloneVec(initW2), initB2, 200, lr)',
			'				l1 := Loss(X, Y, w1, b1, w2, b2)',
			'				w1, b1, w2, b2 = Train(X, Y, w1, b1, w2, b2, 800, lr)',
			'				l2 := Loss(X, Y, w1, b1, w2, b2)',
			'				w1, b1, w2, b2 = Train(X, Y, w1, b1, w2, b2, 1000, lr)',
			'				l3 := Loss(X, Y, w1, b1, w2, b2)',
			'				tw1, tb1, tw2, tb2 = w1, b1, w2, b2',
			'				dec := l0 > l1 && l1 > l2 && l2 > l3',
			'				return fmt.Sprintf("%.4f %.4f %.4f dec=%v", l1, l2, l3, dec)',
			'			}},',
			'		{"Trained net solves XOR: outputs past 0.9 (ones) and below 0.1 (zeros)",',
			'			"0110",',
			'			func() string {',
			'				if tw1 == nil {',
			'					return "untrained"',
			'				}',
			'				preds := ""',
			'				for i := range X {',
			'					_, out := Forward(X[i], tw1, tb1, tw2, tb2)',
			'					if out > 0.9 {',
			'						preds += "1"',
			'					} else if out < 0.1 {',
			'						preds += "0"',
			'					} else {',
			'						preds += "?"',
			'					}',
			'				}',
			'				return preds',
			'			}},',
			'		{"Symmetric init stays symmetric: identical hidden rows after 500 epochs, loss stuck",',
			'			"rows [-0.0854 -0.6257] [-0.0854 -0.6257] loss=0.1250",',
			'			func() string {',
			'				sw1, sb1, sw2, sb2 := Train(X, Y, [][]float64{{0.5, 0.5}, {0.5, 0.5}}, []float64{0.3, 0.3}, []float64{0.5, 0.5}, 0.1, 500, lr)',
			'				return fmt.Sprintf("rows [%.4f %.4f] [%.4f %.4f] loss=%.4f",',
			'					sw1[0][0], sw1[0][1], sw1[1][0], sw1[1][1], Loss(X, Y, sw1, sb1, sw2, sb2))',
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
			'// Sigmoid squashes any real into (0,1). Its derivative s*(1-s) needs',
			'// only the OUTPUT of the forward pass — the reason the deltas below',
			'// reuse h and out instead of recomputing anything. (This is also the',
			'// trick autodiff frameworks exploit: cache activations forward, spend',
			'// them backward.)',
			'func Sigmoid(z float64) float64 {',
			'	return 1.0 / (1.0 + math.Exp(-z))',
			'}',
			'',
			'// Forward computes the two-layer pass. Written as explicit loops over',
			'// len(w1) rather than matrix ops: at this size the loops ARE the',
			'// matrix multiply, and every index is visible for the backward pass',
			'// to mirror.',
			'func Forward(x []float64, w1 [][]float64, b1 []float64, w2 []float64, b2 float64) ([]float64, float64) {',
			'	hidden := make([]float64, len(w1))',
			'	for j := range w1 {',
			'		z := b1[j]',
			'		for i := range x {',
			'			z += w1[j][i] * x[i]',
			'		}',
			'		hidden[j] = Sigmoid(z)',
			'	}',
			'	z2 := b2',
			'	for j := range hidden {',
			'		z2 += w2[j] * hidden[j]',
			'	}',
			'	return hidden, Sigmoid(z2)',
			'}',
			'',
			'// Loss is mean 0.5*(out-y)^2. The 0.5 is the classic convenience',
			'// factor: it cancels the 2 from the derivative, leaving dL/dout =',
			'// (out - y) with no stray constant in every delta.',
			'func Loss(X [][]float64, Y []float64, w1 [][]float64, b1 []float64, w2 []float64, b2 float64) float64 {',
			'	total := 0.0',
			'	for i := range X {',
			'		_, out := Forward(X[i], w1, b1, w2, b2)',
			'		diff := out - Y[i]',
			'		total += 0.5 * diff * diff',
			'	}',
			'	return total / float64(len(X))',
			'}',
			'',
			'// BackpropStep is the chain rule made concrete. Two invariants matter:',
			'//',
			'//   1. dHid uses the OLD w2 — all gradients are partial derivatives at',
			'//      the CURRENT point; updating w2 first and then using it for dHid',
			'//      computes a gradient of a network that never existed. (At lr this',
			'//      small the bug is subtle: training still sort of works, which is',
			'//      exactly why the harness pins the first step to 4 decimals.)',
			'//   2. Fresh slices out, inputs untouched — callers hold references to',
			'//      the old weights (the harness literally checks), and in-place',
			'//      mutation is the classic aliasing bug when the same init is',
			'//      reused across experiments.',
			'func BackpropStep(x []float64, y float64, w1 [][]float64, b1 []float64, w2 []float64, b2 float64, lr float64) ([][]float64, []float64, []float64, float64) {',
			'	h, out := Forward(x, w1, b1, w2, b2)',
			'	// dOut = dL/dout * dout/dz2: loss slope times sigmoid slope, both',
			'	// available from cached forward values.',
			'	dOut := (out - y) * out * (1 - out)',
			'	newW1 := make([][]float64, len(w1))',
			'	newB1 := make([]float64, len(b1))',
			'	newW2 := make([]float64, len(w2))',
			'	for j := range w1 {',
			'		// Route the output delta backward through edge w2[j], then',
			'		// through hidden unit j\'s own sigmoid slope h*(1-h).',
			'		dHid := dOut * w2[j] * h[j] * (1 - h[j])',
			'		newW1[j] = make([]float64, len(w1[j]))',
			'		for i := range w1[j] {',
			'			// Gradient of a weight = its delta times its input. A weight',
			'			// whose input is 0 gets exactly zero gradient this step —',
			'			// the harness pins w1[0][1] staying put on x=(1,0).',
			'			newW1[j][i] = w1[j][i] - lr*dHid*x[i]',
			'		}',
			'		newB1[j] = b1[j] - lr*dHid',
			'		newW2[j] = w2[j] - lr*dOut*h[j]',
			'	}',
			'	newB2 := b2 - lr*dOut',
			'	return newW1, newB1, newW2, newB2',
			'}',
			'',
			'// Train is online (per-sample) SGD in fixed index order. Real loaders',
			'// shuffle every epoch precisely to BREAK this determinism — fixed',
			'// order can bias the walk (the last sample always gets the final',
			'// word). Here determinism is the point: one right answer per case.',
			'func Train(X [][]float64, Y []float64, w1 [][]float64, b1 []float64, w2 []float64, b2 float64, epochs int, lr float64) ([][]float64, []float64, []float64, float64) {',
			'	for e := 0; e < epochs; e++ {',
			'		for i := range X {',
			'			w1, b1, w2, b2 = BackpropStep(X[i], Y[i], w1, b1, w2, b2, lr)',
			'		}',
			'	}',
			'	return w1, b1, w2, b2',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Backprop is bookkeeping, not calculus</h3>' +
			'<p>The only calculus in this item is two one-line derivatives: ' +
			'<code>d/dz sigmoid = s(1−s)</code> and <code>d/dout 0.5(out−y)² = ' +
			'(out−y)</code>. Everything else is the chain rule applied ' +
			'<em>mechanically</em>: multiply local slopes along every path from the ' +
			'loss back to a weight, sum over paths. That mechanical quality is why ' +
			'it automates. PyTorch and JAX record the forward pass as a tape of ' +
			'primitive ops, each knowing its own local derivative, then replay the ' +
			'tape backward multiplying deltas — <code>loss.backward()</code> is ' +
			'exactly your <code>BackpropStep</code> generalized to arbitrary graphs, ' +
			'with your cached <code>h</code> and <code>out</code> becoming the ' +
			'saved-for-backward activations that dominate GPU memory during ' +
			'training (and that gradient checkpointing deliberately recomputes to ' +
			'trade FLOPs for memory).</p>' +
			'<h3>Why sigmoid hidden layers died</h3>' +
			'<p>Look at the delta product: each layer multiplies the gradient by ' +
			'<code>w·s(1−s)</code>, and <code>s(1−s)</code> peaks at 0.25. Stack ten ' +
			'sigmoid layers and the gradient reaching layer one carries a factor of ' +
			'at most <code>0.25¹⁰ ≈ 10⁻⁶</code> — the vanishing-gradient problem ' +
			'that stalled deep learning for two decades. ReLU (slope exactly 1 ' +
			'where active) plus residual connections (a gradient highway that skips ' +
			'the multiplications entirely) is what made 100-layer networks ' +
			'trainable. Sigmoid survives where its (0,1) range is the point: output ' +
			'probabilities and gate activations — you will meet it again in the ' +
			'LSTM item.</p>' +
			'<h3>Initialization is not a detail</h3>' +
			'<p>The symmetric-init case is the cleanest demonstration in the track ' +
			'of a production truth: gradient descent preserves whatever symmetry ' +
			'you hand it. Identical rows get identical gradients forever, so a ' +
			'thousand-unit layer initialized to a constant is functionally one ' +
			'unit. Real schemes — Xavier/Glorot for tanh/sigmoid, He for ReLU — ' +
			'draw small random values with variance tuned to the fan-in so that ' +
			'activations neither saturate (sigmoid at 0.999 has slope ~0.001: no ' +
			'learning) nor collapse toward zero as depth grows. When a net trains ' +
			'to the predict-the-mean loss and stops, the checklist is: init scheme, ' +
			'learning rate, then data — in that order.</p>' +
			'<h3>From here to real training</h3>' +
			'<p>Scale this loop and you have modern deep learning: minibatches ' +
			'average <code>BackpropStep</code> gradients over 32–4096 samples ' +
			'(better gradient estimates, GPU-friendly matmuls); cross-entropy ' +
			'replaces MSE for classification (its gradient <code>(p−y)</code> ' +
			'does not vanish when the sigmoid saturates — see the logistic ' +
			'regression item); and the raw SGD update gets replaced by Adam, which ' +
			'is the next item. In interviews, "derive backprop for a small MLP" is ' +
			'a standing filter question — the two-delta structure you implemented ' +
			'here, stated in exactly this order (cache forward, dOut, dHid with ' +
			'old weights, update all at once), is the expected answer.</p>',
		],
		complexity: { time: 'O(epochs · samples · weights) — each step touches every weight once forward, once backward', space: 'O(weights) — plus the cached activations of one sample' },
	});
})();
