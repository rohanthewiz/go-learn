/* Optimizers: SGD to Adam — Neural Networks (Medium). Four step rules on the
 * pinned ravine f(x,y) = x^2 + 10y^2 from the same start: SGD crawls the
 * shallow axis, momentum overshoots the steep one, RMSProp's uncorrected
 * early steps are ~3x oversized, and Adam's bias correction pins the first
 * step to exactly lr. All trajectory numbers pinned via go run.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// The ravine: elongated contour ellipses, a zigzag SGD path down the
	// steep wall vs an adaptive path cutting along the valley floor.
	// Marker ids suffixed AIOPT — SVG ids share the page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="elongated loss contours: gradient descent zigzags across the steep direction while an adaptive optimizer moves along the shallow valley floor">' +
		'<text x="20" y="20" class="lbl">f(x,y) = x&#178; + 10y&#178; — contours are 10:1 ellipses: one steep wall, one shallow floor</text>' +
		'<ellipse cx="230" cy="115" rx="200" ry="62" fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.35"/>' +
		'<ellipse cx="230" cy="115" rx="150" ry="46" fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>' +
		'<ellipse cx="230" cy="115" rx="100" ry="30" fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.7"/>' +
		'<ellipse cx="230" cy="115" rx="50" ry="15" fill="none" stroke="var(--accent)" stroke-width="1"/>' +
		'<circle cx="230" cy="115" r="3" fill="var(--accent)"/>' +
		// SGD zigzag: large vertical bounces, tiny horizontal progress
		'<path d="M 460 62 L 442 158 L 426 76 L 411 150 L 397 82 L 384 144 L 372 92" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAIOPT)"/>' +
		'<text x="415" y="180" text-anchor="middle" class="lbl" style="fill:var(--warn)">SGD: zigzags the steep wall, crawls the floor</text>' +
		// adaptive path: straight along the valley floor
		'<path d="M 460 50 C 380 96 310 112 242 114" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIOPT2)"/>' +
		'<text x="330" y="42" text-anchor="middle" class="lbl">adaptive: per-coordinate steps cut along the floor</text>' +
		'<defs>' +
		'<marker id="dgArrowAIOPT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowAIOPT2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'optimizers-adam',
		title: 'Optimizers: Momentum, RMSProp, Adam',
		nav: 'optimizers',
		difficulty: 'Medium',
		category: 'Neural Networks',
		task: 'Implement SGDStep, MomentumStep, RMSPropStep, and AdamStep with explicit state, and race them down the ravine f(x,y) = x² + 10y².',

		prose: [
			'<h2>Optimizers: Momentum, RMSProp, Adam</h2>' +
			'<p>Your loss curve has flatlined, and the team chat splits into two ' +
			'camps: "lower the learning rate" and "just use Adam". Both camps are ' +
			'reasoning about the same geometry, and you can hold the whole argument ' +
			'in one tiny function: <code>f(x,y) = x&#178; + 10y&#178;</code>. A ' +
			'ravine — curvature 20 along y, only 2 along x. Real loss surfaces are ' +
			'ravines in millions of dimensions (the ratio is the <em>condition ' +
			'number</em>, and in deep nets it is far worse than 10). Every optimizer ' +
			'in this item is a different answer to the ravine.</p>' +
			'<ul>' +
			'<li><strong>SGD</strong>: <code>pos -= lr·g</code>. Stability on the ' +
			'steep axis demands <code>lr &lt; 2/20 = 0.1</code>, so the shallow ' +
			'axis moves by factor 0.92 per step — y is solved in 5 steps, x needs ' +
			'100. One global lr cannot serve both axes.</li>' +
			'<li><strong>Momentum</strong> (β=0.9): <code>v = β·v + g; pos -= ' +
			'lr·v</code>. Velocity accumulates along consistent directions — an ' +
			'effective 10× lr once it winds up — but inertia also amplifies the ' +
			'steep axis: watch y overshoot straight through the valley floor and ' +
			'swing back.</li>' +
			'<li><strong>RMSProp</strong> (β=0.999, ε=1e-8): <code>s = β·s + ' +
			'(1−β)·g&#178;; pos -= lr·g/(&#8730;s + ε)</code>. Dividing by the ' +
			'running RMS of the gradient gives each coordinate its own effective ' +
			'step — the ravine flattens. But <code>s</code> starts at 0, so after ' +
			'one step <code>&#8730;s = &#8730;(1−β)·|g| ≈ 0.032·|g|</code> and the ' +
			'early steps come out ~3× oversized at these settings.</li>' +
			'<li><strong>Adam</strong> (β1=0.9, β2=0.999, ε=1e-8): momentum on the ' +
			'first moment <em>and</em> RMS scaling on the second, plus the fix for ' +
			'that startup transient — <strong>bias correction</strong>: with the ' +
			'timestep <code>t</code> starting at 1, <code>mHat = m/(1−β1&#7511;)</code>, ' +
			'<code>vHat = v/(1−β2&#7511;)</code>, <code>pos -= lr·mHat/(&#8730;vHat ' +
			'+ ε)</code>. At t=1 the corrections exactly undo the zero-init shrink, ' +
			'and the first step is lr-sized on <em>every</em> coordinate no matter ' +
			'the gradient scale.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>Worked numbers from the pinned start <code>(2, 1)</code> with ' +
			'<code>lr = 0.04</code> (gradient <code>(2x, 20y) = (4, 20)</code>):</p>',
			{ lang: 'txt', code: 'SGD t=1:      (1.8400, 0.2000)   y multiplied by (1-20*0.04) = 0.2 each step\nMomentum t=2: y = -0.6800        overshot through the floor (SGD: y = 0.0400)\nRMSProp t=1:  (0.7351, -0.2649)  step ~ lr/sqrt(1-beta2) = 3.16x too big\nAdam t=1:     (1.9600, 0.9600)   exactly lr on both axes: the 4x-vs-20x\n                                 gradient difference erased by sqrt(vHat)' },
			'<h3>Your job</h3>' +
			'<p>Implement the four step functions with <em>explicit state</em>: ' +
			'each takes the current position (and its accumulators) and returns ' +
			'fresh slices — no package-level state, no mutating inputs. The ' +
			'harness threads the state through loops and races all four for 100 ' +
			'steps. Real optimizers keep this exact state per parameter tensor; ' +
			'passing it explicitly here is the same bookkeeping with the plumbing ' +
			'visible. One simplification to note: this is <em>full-batch</em> ' +
			'gradient descent on a fixed function — the "S" in real SGD is ' +
			'minibatch noise, absent here so every trajectory is pinned to one ' +
			'right answer.</p>' +
			'<div class="tip">Adam&rsquo;s first step is <code>lr·sign(g)</code>: ' +
			'at t=1, <code>mHat = g</code> and <code>&#8730;vHat = |g|</code>, so ' +
			'the ratio is ±1 per coordinate. That scale-invariance is why one ' +
			'default (3e-4) works across wildly different architectures — and why ' +
			'Adam can feel "too aggressive" on parameters whose gradients are tiny ' +
			'but meaningful.</div>',
		],

		starter: [
			'package main',
			'',
			'import "math"',
			'',
			'var _ = math.Sqrt // remove once you use math',
			'',
			'// SGDStep takes one plain gradient-descent step:',
			'//',
			'//   newPos[i] = pos[i] - lr*grad[i]',
			'//',
			'// Returns a FRESH slice; pos must not be mutated.',
			'func SGDStep(pos, grad []float64, lr float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// MomentumStep folds the gradient into a velocity and steps along it:',
			'//',
			'//   newVel[i] = beta*vel[i] + grad[i]',
			'//   newPos[i] = pos[i] - lr*newVel[i]',
			'//',
			'// (The "heavy ball" form: the gradient is ADDED to the decayed',
			'// velocity, not averaged in.) Returns (newPos, newVel), both fresh',
			'// slices; inputs untouched.',
			'func MomentumStep(pos, vel, grad []float64, lr, beta float64) ([]float64, []float64) {',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
			'// RMSPropStep divides each coordinate by the running RMS of its',
			'// gradient:',
			'//',
			'//   newSq[i]  = beta*sq[i] + (1-beta)*grad[i]*grad[i]',
			'//   newPos[i] = pos[i] - lr*grad[i]/(math.Sqrt(newSq[i]) + eps)',
			'//',
			'// eps sits OUTSIDE the square root. No bias correction — that is the',
			'// flaw Adam fixes. Returns (newPos, newSq) as fresh slices.',
			'func RMSPropStep(pos, sq, grad []float64, lr, beta, eps float64) ([]float64, []float64) {',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
			'// AdamStep combines both moments with bias correction. t is the',
			'// timestep of THIS step and starts at 1 (t=0 would divide by zero):',
			'//',
			'//   newM[i]   = beta1*m[i] + (1-beta1)*grad[i]',
			'//   newV[i]   = beta2*v[i] + (1-beta2)*grad[i]*grad[i]',
			'//   mHat      = newM[i] / (1 - beta1^t)',
			'//   vHat      = newV[i] / (1 - beta2^t)',
			'//   newPos[i] = pos[i] - lr*mHat/(math.Sqrt(vHat) + eps)',
			'//',
			'// eps outside the root (the paper and the PyTorch default agree).',
			'// Returns (newPos, newM, newV) as fresh slices.',
			'func AdamStep(pos, m, v, grad []float64, lr, beta1, beta2, eps float64, t int) ([]float64, []float64, []float64) {',
			'	// your code here',
			'	return nil, nil, nil',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"math"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// The ravine f(x,y) = x^2 + 10y^2: gradient (2x, 20y). Condition',
			'	// number 10 — mild by deep-learning standards, vivid enough here.',
			'	grad := func(p []float64) []float64 { return []float64{2 * p[0], 20 * p[1]} }',
			'	start := []float64{2, 1}',
			'	lr := 0.04',
			'	clone := func(v []float64) []float64 { return append([]float64(nil), v...) }',
			'	fp := func(p []float64) string { return fmt.Sprintf("[%.4f %.4f]", p[0], p[1]) }',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"SGD first step from (2,1): y jumps 5x further than x — same lr, 10x the curvature",',
			'			"[1.8400 0.2000]",',
			'			func() string { return fp(SGDStep(clone(start), grad(start), lr)) }},',
			'		{"SGD trajectory: y is solved by step 5 while x has barely moved — then x needs 100",',
			'			"t5=[1.3182 0.0003] t100=[0.0005 0.0000]",',
			'			func() string {',
			'				p := clone(start)',
			'				t5 := ""',
			'				for t := 1; t <= 100; t++ {',
			'					p = SGDStep(p, grad(p), lr)',
			'					if t == 5 {',
			'						t5 = fp(p)',
			'					}',
			'				}',
			'				return "t5=" + t5 + " t100=" + fp(p)',
			'			}},',
			'		{"Momentum first step equals plain SGD — the velocity starts at zero",',
			'			"[1.8400 0.2000]",',
			'			func() string {',
			'				p, _ := MomentumStep(clone(start), []float64{0, 0}, grad(start), lr, 0.9)',
			'				return fp(p)',
			'			}},',
			'		{"Momentum overshoot: by step 2 the y coordinate blasts THROUGH the valley floor",',
			'			"sgdY=0.0400 momY=-0.6800",',
			'			func() string {',
			'				ps := clone(start)',
			'				pm := clone(start)',
			'				vel := []float64{0, 0}',
			'				for t := 1; t <= 2; t++ {',
			'					ps = SGDStep(ps, grad(ps), lr)',
			'					pm, vel = MomentumStep(pm, vel, grad(pm), lr, 0.9)',
			'				}',
			'				return fmt.Sprintf("sgdY=%.4f momY=%.4f", ps[1], pm[1])',
			'			}},',
			'		{"RMSProp first step: sq starts at 0, so sqrt(s) = 0.032|g| makes the step ~3x oversized",',
			'			"[0.7351 -0.2649]",',
			'			func() string {',
			'				p, _ := RMSPropStep(clone(start), []float64{0, 0}, grad(start), lr, 0.999, 1e-8)',
			'				return fp(p)',
			'			}},',
			'		{"Adam first step: bias correction makes it exactly lr-sized on BOTH axes (grad 4 vs 20)",',
			'			"[1.9600 0.9600]",',
			'			func() string {',
			'				p, _, _ := AdamStep(clone(start), []float64{0, 0}, []float64{0, 0}, grad(start), lr, 0.9, 0.999, 1e-8, 1)',
			'				return fp(p)',
			'			}},',
			'		{"Bias correction vs none: the uncorrected first step is 0.1/sqrt(0.001) = 3.16x too big",',
			'			"corrected=0.0400 uncorrected=0.1265",',
			'			func() string {',
			'				p, _, _ := AdamStep(clone(start), []float64{0, 0}, []float64{0, 0}, grad(start), lr, 0.9, 0.999, 1e-8, 1)',
			'				corrected := start[0] - p[0]',
			'				// The uncorrected step, computed inline: m=0.1g, v=0.001g^2.',
			'				g := grad(start)[0]',
			'				uncorrected := lr * (0.1 * g) / (math.Sqrt(0.001*g*g) + 1e-8)',
			'				return fmt.Sprintf("corrected=%.4f uncorrected=%.4f", corrected, uncorrected)',
			'			}},',
			'		{"The race at t=100: all four reach the valley — the paths differed, not the destination",',
			'			"sgd=[0.0005 0.0000] mom=[-0.0097 0.0009] rms=[0.0000 0.0000] adam=[-0.0156 -0.0010]",',
			'			func() string {',
			'				ps := clone(start)',
			'				pm := clone(start)',
			'				vel := []float64{0, 0}',
			'				pr := clone(start)',
			'				sq := []float64{0, 0}',
			'				pa := clone(start)',
			'				m := []float64{0, 0}',
			'				v := []float64{0, 0}',
			'				for t := 1; t <= 100; t++ {',
			'					ps = SGDStep(ps, grad(ps), lr)',
			'					pm, vel = MomentumStep(pm, vel, grad(pm), lr, 0.9)',
			'					pr, sq = RMSPropStep(pr, sq, grad(pr), lr, 0.999, 1e-8)',
			'					pa, m, v = AdamStep(pa, m, v, grad(pa), lr, 0.9, 0.999, 1e-8, t)',
			'				}',
			'				return "sgd=" + fp(ps) + " mom=" + fp(pm) + " rms=" + fp(pr) + " adam=" + fp(pa)',
			'			}},',
			'		{"Steps return fresh slices: the caller\'s pos and state must be untouched",',
			'			"pos=[2.0000 1.0000] m=[0.0000 0.0000]",',
			'			func() string {',
			'				p := clone(start)',
			'				m := []float64{0, 0}',
			'				v := []float64{0, 0}',
			'				AdamStep(p, m, v, grad(start), lr, 0.9, 0.999, 1e-8, 1)',
			'				SGDStep(p, grad(start), lr)',
			'				return fmt.Sprintf("pos=[%.4f %.4f] m=[%.4f %.4f]", p[0], p[1], m[0], m[1])',
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
			'// SGDStep: the baseline every other rule modifies. One global lr for',
			'// every coordinate is exactly what the ravine punishes — stability on',
			'// the stiffest axis caps the lr for all of them, so the shallow axis',
			'// crawls.',
			'func SGDStep(pos, grad []float64, lr float64) []float64 {',
			'	newPos := make([]float64, len(pos))',
			'	for i := range pos {',
			'		newPos[i] = pos[i] - lr*grad[i]',
			'	}',
			'	return newPos',
			'}',
			'',
			'// MomentumStep: heavy-ball form, v = beta*v + g. The velocity is a',
			'// geometric sum of past gradients, so a persistent direction compounds',
			'// toward g/(1-beta) — an effective 10x lr at beta=0.9. That is both',
			'// the speedup on the shallow axis AND the overshoot on the steep one:',
			'// the ball has inertia, and inertia does not care which you wanted.',
			'func MomentumStep(pos, vel, grad []float64, lr, beta float64) ([]float64, []float64) {',
			'	newVel := make([]float64, len(pos))',
			'	newPos := make([]float64, len(pos))',
			'	for i := range pos {',
			'		newVel[i] = beta*vel[i] + grad[i]',
			'		newPos[i] = pos[i] - lr*newVel[i]',
			'	}',
			'	return newPos, newVel',
			'}',
			'',
			'// RMSPropStep: per-coordinate normalization. Dividing by the running',
			'// RMS makes the EFFECTIVE step roughly lr-sized on every axis',
			'// regardless of curvature — which is what defeats the ravine. The',
			'// flaw: sq is zero-initialized, so early estimates are biased low by',
			'// the factor (1-beta^t) and the first steps are oversized. (History:',
			'// RMSProp was published in a Coursera lecture slide, not a paper.)',
			'func RMSPropStep(pos, sq, grad []float64, lr, beta, eps float64) ([]float64, []float64) {',
			'	newSq := make([]float64, len(pos))',
			'	newPos := make([]float64, len(pos))',
			'	for i := range pos {',
			'		newSq[i] = beta*sq[i] + (1-beta)*grad[i]*grad[i]',
			'		// eps OUTSIDE the sqrt: it guards the division when the RMS is',
			'		// genuinely ~0 without inflating moderate denominators.',
			'		newPos[i] = pos[i] - lr*grad[i]/(math.Sqrt(newSq[i])+eps)',
			'	}',
			'	return newPos, newSq',
			'}',
			'',
			'// AdamStep: momentum on m, RMS on v, and the bias correction that',
			'// makes step 1 sane. Why the correction is exact: after t steps of a',
			'// constant gradient g, m = (1-beta1^t)*g — the zero init leaks in as',
			'// precisely that factor. Dividing it back out gives an unbiased',
			'// estimate at EVERY t, not just asymptotically; at t=1, mHat = g and',
			'// vHat = g^2 exactly, so the step is lr*g/|g| = lr*sign(g) —',
			'// scale-invariant from the very first update.',
			'func AdamStep(pos, m, v, grad []float64, lr, beta1, beta2, eps float64, t int) ([]float64, []float64, []float64) {',
			'	newM := make([]float64, len(pos))',
			'	newV := make([]float64, len(pos))',
			'	newPos := make([]float64, len(pos))',
			'	// The correction factors depend only on t — hoist them out of the',
			'	// coordinate loop. (Real implementations fold them into lr as a',
			'	// per-step size: alpha_t = lr*sqrt(1-beta2^t)/(1-beta1^t).)',
			'	c1 := 1 - math.Pow(beta1, float64(t))',
			'	c2 := 1 - math.Pow(beta2, float64(t))',
			'	for i := range pos {',
			'		newM[i] = beta1*m[i] + (1-beta1)*grad[i]',
			'		newV[i] = beta2*v[i] + (1-beta2)*grad[i]*grad[i]',
			'		mHat := newM[i] / c1',
			'		vHat := newV[i] / c2',
			'		newPos[i] = pos[i] - lr*mHat/(math.Sqrt(vHat)+eps)',
			'	}',
			'	return newPos, newM, newV',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why Adam is the transformer default</h3>' +
			'<p>Transformer gradients are wildly anisotropic: embedding rows for ' +
			'rare tokens see huge sparse gradients, LayerNorm gains see tiny dense ' +
			'ones — a ravine with a condition number in the millions. Adam&rsquo;s ' +
			'per-coordinate normalization is the only rule in this item that ' +
			'survives that regime, which is why every LLM you have heard of was ' +
			'trained with Adam or a descendant. The production version is almost ' +
			'always <strong>AdamW</strong>: original Adam pushes L2 weight decay ' +
			'<em>through</em> the adaptive scaling (so high-gradient weights are ' +
			'barely decayed at all), while AdamW decouples it — the decay ' +
			'<code>pos -= lr·wd·pos</code> is applied separately from the adaptive ' +
			'step. One line of difference, consistently better generalization; it ' +
			'is the standard optimizer for transformer training.</p>' +
			'<h3>What surrounds the optimizer in a real run</h3>' +
			'<p>The step rule is one third of the recipe. The other two thirds: ' +
			'<strong>LR schedules</strong> — warmup ramps lr from 0 over the first ' +
			'few thousand steps (early second-moment estimates are noisy even with ' +
			'bias correction; warmup is the empirical fix), then cosine decay ' +
			'toward ~10% of peak — and <strong>gradient clipping</strong>, the ' +
			'global-norm cap (~1.0) that is the seatbelt against loss-spike death ' +
			'spirals. When you read a training config — <code>lr=3e-4, ' +
			'betas=(0.9, 0.95), warmup=2000, clip=1.0</code> — you are reading ' +
			'exactly the knobs in this item plus those two. Note the 0.95: ' +
			'large-model configs lower beta2 from 0.999 because a ~20-step ' +
			'variance memory reacts to shifts in the data stream far faster than a ' +
			'~1000-step one.</p>' +
			'<h3>When plain SGD still wins</h3>' +
			'<p>On vision CNNs, SGD with momentum and a tuned schedule reliably ' +
			'generalizes a point or two better than Adam — the adaptive scaling ' +
			'that helps optimization can work against the flat-minimum bias that ' +
			'helps test accuracy, and ResNet-family recipes are still ' +
			'SGD+momentum to this day. The practical decision table: transformers ' +
			'and sparse gradients → AdamW; CNNs with time to tune → SGD+momentum; ' +
			'"it needs to train today" → AdamW at 3e-4. Interviews probe exactly ' +
			'the two mechanisms you pinned: <em>why does momentum overshoot?</em> ' +
			'(velocity integrates past gradients — inertia) and <em>what does bias ' +
			'correction fix?</em> (zero-initialized moments shrink early estimates ' +
			'by 1−β&#7511;; dividing it out makes step 1 lr-sized — your 0.0400 vs ' +
			'0.1265 case). Deeper water, named for the road ahead: Nesterov ' +
			'momentum (gradient at the lookahead point), Adafactor (factored ' +
			'second moments to shrink optimizer memory — which is 2x the model ' +
			'size under Adam), and Lion (sign-based updates found by program ' +
			'search).</p>',
		],
		complexity: { time: 'O(d) per step — one pass over the coordinates for every rule', space: 'O(d) — one or two accumulator slices matching the parameter shape' },
	});
})();
