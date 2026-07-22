/* Gradient Descent — Foundations (Easy). The optimization loop underneath
 * ALL of machine learning: evaluate the gradient, step against it, repeat.
 * The harness pins the first iterates at lr=0.1 on f(x)=(x-3)^2, convergence
 * with a tolerance stop, and the three learning-rate regimes — converge,
 * oscillate forever at lr=1.0, and diverge at lr=1.05 (the miniature version
 * of a training loss going NaN).
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// The loss bowl with descent steps that shrink near the bottom — because
	// the gradient itself shrinks there. Marker id namespaced (dgArrowAIGD)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 220" width="520" height="220" role="img" aria-label="a loss bowl; gradient descent steps move downhill and get smaller as the gradient shrinks near the minimum">' +
		'<text x="20" y="24" class="lbl">loss L(w): step against the gradient — big steps on the slope, tiny steps near the bottom</text>' +
		// the bowl (quadratic Bezier: vertex at x=260)
		'<path d="M 40 50 Q 260 290 480 50" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		// descent steps down the left slope (points sit on the curve)
		'<path d="M 66 77 L 116 118" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAIGD)"/>' +
		'<path d="M 119 121 L 169 148" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAIGD)"/>' +
		'<path d="M 172 151 L 213 163" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAIGD)"/>' +
		'<path d="M 216 165 L 239 168" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAIGD)"/>' +
		'<circle cx="66" cy="77" r="4" fill="var(--warn)"/>' +
		'<circle cx="119" cy="121" r="4" fill="var(--warn)"/>' +
		'<circle cx="172" cy="151" r="4" fill="var(--warn)"/>' +
		'<circle cx="216" cy="165" r="4" fill="var(--warn)"/>' +
		'<circle cx="242" cy="169" r="4" fill="var(--warn)"/>' +
		'<text x="60" y="64" class="lbl">start</text>' +
		// the minimum
		'<line x1="260" y1="170" x2="260" y2="200" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="4 3"/>' +
		'<circle cx="260" cy="170" r="3.5" fill="var(--accent)"/>' +
		'<text x="260" y="214" text-anchor="middle" class="lbl">minimum w*: gradient = 0, steps stop</text>' +
		'<text x="330" y="130" class="lbl">step size = lr &#215; gradient</text>' +
		'<defs><marker id="dgArrowAIGD" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'gradient-descent',
		title: 'Gradient Descent: How Machines Learn',
		nav: 'gradient descent',
		difficulty: 'Easy',
		category: 'Foundations: Learning as Optimization',
		task: 'Implement Step (move against the gradient, scaled by the learning rate) and Minimize (the loop with a tolerance stop) — the update rule underneath all of ML.',

		prose: [
			'<h2>Gradient Descent: How Machines Learn</h2>' +
			'<p>Training is crawling, so you bump the learning rate — and the loss ' +
			'curve goes vertical, then <code>NaN</code>. Halve it instead and the ' +
			'model converges to a better score than either attempt. Every framework ' +
			'knob you will ever tune (learning rate, schedules, warmup, Adam&rsquo;s ' +
			'betas) is a knob on <em>one</em> loop, and this item builds that loop ' +
			'from scratch. Training a model — linear regression, a spam filter, ' +
			'GPT-4 — means minimizing a <strong>loss function</strong>: a single ' +
			'number measuring how wrong the current parameters are. Learning is ' +
			'nothing more than walking downhill on that surface.</p>' +
			'<ul>' +
			'<li><strong>The gradient points uphill.</strong> The derivative of the ' +
			'loss with respect to a parameter says which way the loss <em>increases</em>. ' +
			'To reduce the loss, step the other way: ' +
			'<code>x = x &minus; lr&middot;grad(x)</code>.</li>' +
			'<li><strong>The learning rate <code>lr</code> scales the step</strong> — ' +
			'and it is THE hyperparameter. Too small: thousands of steps to converge. ' +
			'Slightly too big: overshoot and oscillate. Bigger still: each overshoot ' +
			'is worse than the last and the loss explodes.</li>' +
			'<li><strong>Stopping:</strong> near the minimum the gradient shrinks, so ' +
			'the steps shrink. When a step moves less than a tolerance, declare ' +
			'convergence — or give up after a step budget.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>Work it by hand on <code>f(x) = (x&minus;3)&sup2;</code>, whose ' +
			'gradient is <code>2(x&minus;3)</code>, starting from <code>x=0</code> ' +
			'at <code>lr=0.1</code>:</p>',
			{ lang: 'txt', code: 'f(x) = (x-3)^2    grad(x) = 2(x-3)    x0 = 0, lr = 0.1\nstep 1: x = 0      - 0.1*(-6.00) = 0.6000\nstep 2: x = 0.6    - 0.1*(-4.80) = 1.0800\nstep 3: x = 1.08   - 0.1*(-3.84) = 1.4640\n\neach step closes 20% of the remaining gap to 3:  x_k = 3 - 3*(0.8)^k\n=> fast progress far away, slow progress near the bottom, 61 steps to tol=1e-6' },
			'<div class="tip">On this bowl the three regimes have exact thresholds: ' +
			'<code>lr &lt; 1.0</code> converges, <code>lr = 1.0</code> reflects ' +
			'<code>x</code> across the minimum forever (error never shrinks), ' +
			'<code>lr &gt; 1.0</code> amplifies the error every step. Real training ' +
			'never prints its thresholds — but a loss that suddenly reads ' +
			'<code>NaN</code> is exactly the third regime at scale.</div>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Step</code> — one update — and <code>Minimize</code>, ' +
			'the loop with a tolerance stop and a step budget. The harness hands you ' +
			'gradients as Go closures (<code>func(float64) float64</code>). Two ' +
			'honest simplifications: this is 1-D (real models have millions of ' +
			'coordinates, but the update rule is applied to each one identically), ' +
			'and the gradient is handed to you (real frameworks compute it with ' +
			'backpropagation — a later item builds that too).</p>',
		],

		starter: [
			'package main',
			'',
			'// Step takes one gradient-descent step from x: evaluate the gradient',
			'// at x and move AGAINST it, scaled by the learning rate:',
			'//',
			'//   xNew = x - lr*grad(x)',
			'//',
			'// grad is the derivative of the function being minimized; the harness',
			'// passes closures such as grad(x) = 2*(x-3) for f(x) = (x-3)^2.',
			'func Step(x, lr float64, grad func(float64) float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Minimize runs gradient descent from x0 and returns (finalX, steps',
			'// taken). The exact contract the tests pin:',
			'//',
			'//   - each step: xNew = x - lr*grad(x)',
			'//   - stop when the MOVE is small: |xNew - x| < tol (strictly less).',
			'//     The step that triggers the stop IS counted, and xNew is what you',
			'//     return — so starting exactly at the minimum returns after 1 step.',
			'//   - if maxSteps steps pass without converging, return the current x',
			'//     and maxSteps.',
			'//',
			'// No need to import math for the absolute value:',
			'// if d < 0 { d = -d } does it.',
			'func Minimize(grad func(float64) float64, x0, lr, tol float64, maxSteps int) (float64, int) {',
			'	// your code here',
			'	return 0, 0',
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
			'	// f(x) = (x-3)^2 — the bowl most cases descend. Minimize never sees',
			'	// f itself, only its derivative: gradient descent needs nothing else.',
			'	gradQuad := func(x float64) float64 { return 2 * (x - 3) }',
			'	// f(x) = x^2 + 2x, minimum at x = -1 — proves the loop is generic,',
			'	// not hard-coded to one bowl.',
			'	gradShifted := func(x float64) float64 { return 2*x + 2 }',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"one Step from x=0 at lr=0.1: move AGAINST grad(0)=-6, landing 20% of the way to the minimum",',
			'			"0.6000",',
			'			func() string { return fmt.Sprintf("%.4f", Step(0, 0.1, gradQuad)) }},',
			'		{"three Steps: each covers 20% of the REMAINING gap — progress slows as the gradient shrinks",',
			'			"0.6000 1.0800 1.4640",',
			'			func() string {',
			'				x1 := Step(0, 0.1, gradQuad)',
			'				x2 := Step(x1, 0.1, gradQuad)',
			'				x3 := Step(x2, 0.1, gradQuad)',
			'				return fmt.Sprintf("%.4f %.4f %.4f", x1, x2, x3)',
			'			}},',
			'		{"Minimize converges to the true minimum x=3 (lr=0.1, tol=1e-6)",',
			'			"3.0000",',
			'			func() string {',
			'				x, _ := Minimize(gradQuad, 0, 0.1, 1e-6, 10000)',
			'				return fmt.Sprintf("%.4f", x)',
			'			}},',
			'		{"the tolerance stop: error shrinks by 0.8 per step, so tol=1e-6 takes exactly 61 counted steps",',
			'			"61",',
			'			func() string {',
			'				_, n := Minimize(gradQuad, 0, 0.1, 1e-6, 10000)',
			'				return fmt.Sprintf("%d", n)',
			'			}},',
			'		{"a different bowl (f=x^2+2x, minimum at -1): the same loop minimizes anything with a gradient",',
			'			"-1.0000",',
			'			func() string {',
			'				x, _ := Minimize(gradShifted, 4, 0.1, 1e-6, 10000)',
			'				return fmt.Sprintf("%.4f", x)',
			'			}},',
			'		{"starting exactly at the minimum: grad=0 so the first move is 0 < tol — 1 step, not 0, not maxSteps",',
			'			"3.0000 in 1",',
			'			func() string {',
			'				x, n := Minimize(gradQuad, 3, 0.1, 1e-6, 10000)',
			'				return fmt.Sprintf("%.4f in %d", x, n)',
			'			}},',
			'		{"lr=1.0: each step reflects x across the minimum — oscillates 1<->5 forever, exits by maxSteps",',
			'			"5.0000 1.0000 10",',
			'			func() string {',
			'				x9, _ := Minimize(gradQuad, 1, 1.0, 1e-6, 9)',
			'				x10, n10 := Minimize(gradQuad, 1, 1.0, 1e-6, 10)',
			'				return fmt.Sprintf("%.4f %.4f %d", x9, x10, n10)',
			'			}},',
			'		{"lr=1.05 DIVERGES: every overshoot amplifies the error by 1.1 — 20 steps later x=-17.18, farther than it started",',
			'			"-17.1825",',
			'			func() string {',
			'				x, _ := Minimize(gradQuad, 0, 1.05, 1e-9, 20)',
			'				return fmt.Sprintf("%.4f", x)',
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
			'// Step is the whole idea in one line: the gradient points uphill, so',
			'// subtract it. lr converts "which direction" into "how far" — the',
			'// gradient alone has the wrong units and magnitude to be a step size,',
			'// which is exactly why lr exists and why it needs tuning.',
			'func Step(x, lr float64, grad func(float64) float64) float64 {',
			'	return x - lr*grad(x)',
			'}',
			'',
			'// Minimize iterates Step until the move falls below tol or the step',
			'// budget runs out. Two design choices worth noticing:',
			'//',
			'//   - The stop tests the MOVE |xNew-x| = lr*|grad|, not the gradient',
			'//     itself. Near a minimum the gradient (and hence the move) shrinks',
			'//     toward zero, so a small move signals convergence; but at lr=1.0',
			'//     on the test bowl the move stays constant forever — the loop',
			'//     correctly never declares convergence and exits by maxSteps.',
			'//   - The converging step is counted and its RESULT is returned:',
			'//     compute xNew first, then test. Starting at the exact minimum',
			'//     costs 1 step (evaluate, move zero, stop) — not 0, which would',
			'//     mean never evaluating the gradient at all.',
			'func Minimize(grad func(float64) float64, x0, lr, tol float64, maxSteps int) (float64, int) {',
			'	x := x0',
			'	for step := 1; step <= maxSteps; step++ {',
			'		xNew := Step(x, lr, grad)',
			'		// Absolute move without importing math: flip the sign if',
			'		// negative. (No named returns anywhere — see track notes.)',
			'		d := xNew - x',
			'		if d < 0 {',
			'			d = -d',
			'		}',
			'		if d < tol {',
			'			return xNew, step',
			'		}',
			'		x = xNew',
			'	}',
			'	// Budget exhausted. Returning x (not an error) mirrors real',
			'	// training: you stop when you stop, and the caller inspects the',
			'	// result. Divergence shows up as a huge |x|, not a panic.',
			'	return x, maxSteps',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>From this loop to every training run</h3>' +
			'<p>Scale this up and you have deep learning. Three things change, and ' +
			'none of them touch the update rule. First, <strong>dimension</strong>: ' +
			'a model has a vector (GPT-class models: many billions) of parameters, ' +
			'and the gradient is a vector too — the update ' +
			'<code>w = w &minus; lr&middot;&nabla;L</code> is applied to every ' +
			'coordinate independently, exactly your one-liner run in parallel. ' +
			'Second, <strong>where the gradient comes from</strong>: here the ' +
			'harness hands you <code>2(x&minus;3)</code>; real frameworks compute ' +
			'gradients mechanically from the loss by backpropagation — ' +
			'PyTorch&rsquo;s <code>loss.backward()</code> fills in ' +
			'<code>grad</code>, then <code>optimizer.step()</code> is literally ' +
			'your <code>Step</code>. Third, <strong>the data</strong>: the true ' +
			'loss averages over the whole dataset, which is too expensive per ' +
			'step, so SGD estimates the gradient from a random minibatch — a ' +
			'noisy but unbiased downhill direction, and the reason loss curves ' +
			'wiggle.</p>' +
			'<h3>The learning rate in production</h3>' +
			'<p>Your three pinned regimes — converge, oscillate, diverge — are the ' +
			'daily reality of training. Practitioners rarely pick one fixed ' +
			'<code>lr</code>: they <em>schedule</em> it. Warmup (start tiny, ramp ' +
			'up — early gradients are wild) followed by cosine or step decay ' +
			'(shrink near the end to settle into the minimum) is the default recipe ' +
			'for transformers. Adaptive optimizers — Adam, covered in its own item ' +
			'— rescale each coordinate&rsquo;s step by a running estimate of its ' +
			'gradient magnitude, which mostly rescues you from a mediocre ' +
			'<code>lr</code> but does not repeal the regimes: too high still ' +
			'diverges. When a loss spikes to <code>NaN</code> mid-run, the ' +
			'checklist is: lower <code>lr</code>, add warmup, clip gradients — ' +
			'all three are managing the exact overshoot mechanism your ' +
			'<code>lr=1.05</code> case pins.</p>' +
			'<h3>Convexity, and what this bowl hides</h3>' +
			'<p>The quadratic here is convex: one minimum, and gradient descent ' +
			'finds it from anywhere. Deep-network losses are wildly non-convex — ' +
			'saddle points, plateaus, many minima — and yet SGD works, partly ' +
			'because minibatch noise helps escape saddles and because ' +
			'high-dimensional minima found by SGD generalize well in practice. ' +
			'That is an empirical fact, not a theorem, and it is why "just train ' +
			'it again with a different seed" is a legitimate debugging step. ' +
			'Interviews love this loop: "what does the learning rate do", "what ' +
			'happens if it is too large", "why does the loss plateau" — you have ' +
			'now watched all three answers happen with pinned numbers, on the ' +
			'simplest function that exhibits them.</p>',
		],
		complexity: { time: 'O(maxSteps) gradient evaluations — each step is O(1)', space: 'O(1)' },
	});
})();
