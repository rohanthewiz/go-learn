/* RNNs & the LSTM Cell — Neural Networks (Medium). Scalar-state recurrence:
 * RNNStep/RNNRun, the vanishing-gradient product measured directly
 * (SensitivityProduct), then the LSTM gate equations with hand-set weights
 * that carry a marker bit across 20 silent steps while the plain RNN's
 * signal decays to 0.000001. Every number pinned via go run.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// The LSTM cell: the cell state runs as a straight conveyor across the
	// top (multiply by forget, add gated input) — the gradient highway.
	// Ids suffixed AILSTM; SVG ids share the page namespace across tracks.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="LSTM cell: the cell state flows straight across the top, scaled by the forget gate and incremented by the gated candidate; the hidden output reads the cell through the output gate">' +
		'<text x="20" y="20" class="lbl">the cell state is a conveyor: one multiply, one add — nothing else touches it</text>' +
		// cell-state conveyor
		'<path d="M 30 60 L 200 60" fill="none" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<circle cx="220" cy="60" r="14" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="220" y="65" text-anchor="middle" style="fill:var(--warn)">&#215;</text>' +
		'<path d="M 234 60 L 310 60" fill="none" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<circle cx="330" cy="60" r="14" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="330" y="65" text-anchor="middle" style="fill:var(--warn)">+</text>' +
		'<path d="M 344 60 L 490 60" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#dgArrowAILSTM)"/>' +
		'<text x="60" y="50" class="lbl">c[t-1]</text>' +
		'<text x="450" y="50" class="lbl">c[t]</text>' +
		// forget gate feeding the multiply
		'<rect x="190" y="110" width="60" height="30" rx="5" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<text x="220" y="130" text-anchor="middle" class="lbl">f = &#963;</text>' +
		'<path d="M 220 110 L 220 76" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAILSTM)"/>' +
		// input gate * candidate feeding the add
		'<rect x="290" y="110" width="80" height="30" rx="5" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<text x="330" y="130" text-anchor="middle" class="lbl">i&#183;g = &#963;&#183;tanh</text>' +
		'<path d="M 330 110 L 330 76" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAILSTM)"/>' +
		// output gate reading the cell
		'<rect x="400" y="110" width="70" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="435" y="130" text-anchor="middle" class="lbl">h = o&#183;tanh(c)</text>' +
		'<path d="M 435 110 L 435 78" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAILSTM)" opacity="0.7"/>' +
		// inputs x,h feeding the gates
		'<text x="240" y="196" class="lbl">every gate reads (x[t], h[t-1]) through its own weights [wx, wh, b]</text>' +
		'<path d="M 220 176 L 220 144" fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.6"/>' +
		'<path d="M 330 176 L 330 144" fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.6"/>' +
		'<path d="M 435 176 L 435 144" fill="none" stroke="var(--accent)" stroke-width="1" opacity="0.6"/>' +
		'<defs><marker id="dgArrowAILSTM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'rnn-lstm',
		title: 'RNNs & the LSTM Cell',
		nav: 'LSTM',
		difficulty: 'Medium',
		category: 'Neural Networks',
		task: 'Implement the RNN recurrence, measure its vanishing sensitivity product, then build the LSTM gate equations and carry a bit across 20 steps.',

		prose: [
			'<h2>RNNs &amp; the LSTM Cell</h2>' +
			'<p>It is 2016 and your team ships translation. The model reads a ' +
			'sentence one token at a time, carrying everything it knows in a ' +
			'single state vector — and it keeps making the same maddening error: ' +
			'by the end of a long sentence it has forgotten the gender of the ' +
			'subject it read twenty words ago. This item builds the mechanism, the ' +
			'disease, and the cure: the recurrent step, the vanishing-gradient ' +
			'product you can <em>measure</em>, and the gated cell that fixed it.</p>' +
			'<p>Everything here is <strong>scalar</strong> — 1-D state instead of ' +
			'vectors, so every number is inspectable. Real cells do exactly this ' +
			'arithmetic with matrices; nothing conceptual is lost, and the ' +
			'simplification is disclosed wherever it matters.</p>' +
			'<h3>The RNN and its disease</h3>' +
			'<p>One equation: <code>h[t] = tanh(wx&#183;x[t] + wh&#183;h[t-1] + b)</code>. ' +
			'The same three weights process every timestep — weight sharing over ' +
			'<em>time</em>, exactly as convolution shares over space. The disease ' +
			'hides in the chain rule: how much does the first input still ' +
			'influence the state after T steps? Each step contributes a factor ' +
			'<code>wh&#183;(1&#8722;h[t]&#178;)</code> (the local Jacobian), and ' +
			'influence is their <em>product</em>. With <code>|wh| &lt; 1</code> and ' +
			'<code>tanh</code> slope &#8804; 1, that product decays geometrically — ' +
			'you will implement <code>SensitivityProduct</code> and pin it: 0.009698 ' +
			'after 5 steps, 0.001168 after 20. Gradients from the distant past round ' +
			'to zero, so the distant past cannot be learned.</p>' +
			'<h3>The LSTM answer: gate the memory</h3>' +
			'<p>Give the cell a separate memory line <code>c</code> that is only ' +
			'ever <em>multiplied by a gate</em> and <em>added to</em> — no tanh ' +
			'squashing on the through-path. Four little networks (each with its own ' +
			'<code>[wx, wh, b]</code>) read the current input and previous hidden ' +
			'state:</p>',
			{ lang: 'txt', code: 'f = sigmoid(wF[0]*x + wF[1]*h + wF[2])   forget gate: keep how much of c?\ni = sigmoid(wI[0]*x + wI[1]*h + wI[2])   input gate:  admit how much?\no = sigmoid(wO[0]*x + wO[1]*h + wO[2])   output gate: reveal how much?\ng = tanh(wG[0]*x + wG[1]*h + wG[2])      candidate:   admit WHAT?\n\nc[t] = f*c[t-1] + i*g        the conveyor: one multiply, one add\nh[t] = o * tanh(c[t])        the working output' },
			DIAGRAM +
			'<p>The harness hand-sets the gates to make memory visible: forget ' +
			'bias +5 (<code>f = 0.9933</code>, keep nearly everything), input gate ' +
			'wired to open only on a marker token (<code>i = &#963;(8x&#8722;4)</code>: ' +
			'0.982 when x=1, 0.018 when x=0), output gate open. Feed a marker then ' +
			'20 steps of silence: the cell walks down as <code>0.9813 &#215; ' +
			'0.9933&#178;&#8304;</code> and the LSTM still reports ' +
			'<code>h = 0.6906</code>. The plain RNN given the same marker decays ' +
			'to <code>0.000001</code>. Same task, same horizon — the gate ' +
			'structure IS the memory.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>RNNStep</code>, <code>RNNRun</code>, ' +
			'<code>SensitivityProduct</code>, <code>LSTMGates</code>, ' +
			'<code>LSTMStep</code>, and <code>LSTMRun</code> per the doc comments ' +
			'(gate order <code>[f, i, o, g]</code>; weight layout ' +
			'<code>[wx, wh, b]</code>).</p>' +
			'<div class="tip">Why the conveyor beats the tanh chain: the gradient ' +
			'along <code>c</code> multiplies by <code>f</code> per step — and ' +
			'<code>f</code> is a <em>learned, input-dependent</em> value that can ' +
			'sit at 0.99 for "keep remembering" or drop to 0.01 for "wipe it". The ' +
			'RNN multiplies by a fixed-tendency <code>wh&#183;(1&#8722;h&#178;)</code> ' +
			'whether it wants to or not. Forgetting becomes a decision instead of ' +
			'a decay law.</div>',
		],

		starter: [
			'package main',
			'',
			'import "math"',
			'',
			'var _ = math.Tanh // remove once you use math',
			'',
			'// RNNStep advances the scalar recurrence one timestep:',
			'//',
			'//   hNew = tanh(wx*x + wh*h + b)',
			'//',
			'// (1-D state: real RNNs use vectors and matrices; the arithmetic is',
			'// identical.)',
			'func RNNStep(h, x, wx, wh, b float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// RNNRun feeds the sequence xs through RNNStep starting from h0 and',
			'// returns ALL hidden states: out[t] is the state AFTER consuming',
			'// xs[t], so len(out) == len(xs).',
			'func RNNRun(xs []float64, wx, wh, b, h0 float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// SensitivityProduct measures how much h0 still influences the final',
			'// state: the product of the per-step Jacobians of the recurrence,',
			'//',
			'//   product over t of  wh * (1 - hs[t]*hs[t])',
			'//',
			'// where hs are the hidden states from RNNRun. This is d(h_T)/d(h_0)',
			'// by the chain rule — the quantity that vanishes.',
			'func SensitivityProduct(hs []float64, wh float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// LSTMGates evaluates the four gates in order [f, i, o, g]. Each',
			'// weight slice is [wx, wh, b]:',
			'//',
			'//   f = sigmoid(wF[0]*x + wF[1]*h + wF[2])',
			'//   i = sigmoid(wI[0]*x + wI[1]*h + wI[2])',
			'//   o = sigmoid(wO[0]*x + wO[1]*h + wO[2])',
			'//   g = tanh   (wG[0]*x + wG[1]*h + wG[2])',
			'//',
			'// sigmoid(z) = 1/(1+e^-z). Note the gates read h (not c).',
			'func LSTMGates(c, h, x float64, wF, wI, wO, wG []float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// LSTMStep advances the cell one timestep and returns (cNew, hNew):',
			'//',
			'//   cNew = f*c + i*g',
			'//   hNew = o * tanh(cNew)',
			'func LSTMStep(c, h, x float64, wF, wI, wO, wG []float64) (float64, float64) {',
			'	// your code here',
			'	return 0, 0',
			'}',
			'',
			'// LSTMRun feeds xs through LSTMStep from (c0, h0) and returns the',
			'// full cell-state and hidden-state trajectories (cs, hs), each the',
			'// same length as xs.',
			'func LSTMRun(xs []float64, wF, wI, wO, wG []float64, c0, h0 float64) ([]float64, []float64) {',
			'	// your code here',
			'	return nil, nil',
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
			'	// A marker followed by silence: the memory stress test.',
			'	marker20 := make([]float64, 20)',
			'	marker20[0] = 1',
			'	marker21 := make([]float64, 21)',
			'	marker21[0] = 1',
			'',
			'	// Hand-set LSTM weights [wx, wh, b]: forget almost 1, input gate',
			'	// keyed to the marker, output open, candidate reads the marker.',
			'	wF := []float64{0, 0, 5}',
			'	wI := []float64{8, 0, -4}',
			'	wO := []float64{0, 0, 5}',
			'	wG := []float64{4, 0, 0}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"RNNStep from rest on x=1 (wx=0.8, wh=0.9, b=0.1): tanh(0.9)",',
			'			"0.7163",',
			'			func() string { return fmt.Sprintf("%.4f", RNNStep(0, 1, 0.8, 0.9, 0.1)) }},',
			'		{"RNNRun threads the state: each h depends on the whole prefix, not just x[t]",',
			'			"[0.7163 0.8160 0.4090 0.4366 0.4566]",',
			'			func() string {',
			'				hs := RNNRun([]float64{1, 0.5, -0.5, 0, 0}, 0.8, 0.9, 0.1, 0)',
			'				return fmt.Sprintf("[%.4f %.4f %.4f %.4f %.4f]", hs[0], hs[1], hs[2], hs[3], hs[4])',
			'			}},',
			'		{"wh=0 means NO memory: different histories, same last input, same final state",',
			'			"hA=0.5784 hB=0.5784 same=true",',
			'			func() string {',
			'				a := RNNRun([]float64{1, -1, 0.7}, 0.8, 0, 0.1, 0)',
			'				b := RNNRun([]float64{-0.3, 0.9, 0.7}, 0.8, 0, 0.1, 0)',
			'				sa := fmt.Sprintf("%.4f", a[len(a)-1])',
			'				sb := fmt.Sprintf("%.4f", b[len(b)-1])',
			'				return fmt.Sprintf("hA=%s hB=%s same=%v", sa, sb, sa == sb)',
			'			}},',
			'		{"The vanishing product: influence of h0 after 5/10/20 steps (wh=0.9) decays geometrically",',
			'			"T5=0.009698 T10=0.003895 T20=0.001168 shrinking=true",',
			'			func() string {',
			'				hs := RNNRun(marker20, 2.0, 0.9, 0, 0)',
			'				p5 := SensitivityProduct(hs[:5], 0.9)',
			'				p10 := SensitivityProduct(hs[:10], 0.9)',
			'				p20 := SensitivityProduct(hs[:20], 0.9)',
			'				shrink := p5 > p10 && p10 > p20 && p20 > 0',
			'				return fmt.Sprintf("T5=%.6f T10=%.6f T20=%.6f shrinking=%v", p5, p10, p20, shrink)',
			'			}},',
			'		{"RNN forgetting in state space too: the marker\'s trace after 20 steps (wh=0.5)",',
			'			"h1=0.9640 h5=0.054788 h20=0.000002",',
			'			func() string {',
			'				hs := RNNRun(marker20, 2.0, 0.5, 0, 0)',
			'				return fmt.Sprintf("h1=%.4f h5=%.6f h20=%.6f", hs[0], hs[4], hs[19])',
			'			}},',
			'		{"LSTMGates on the marker vs on silence: only the input gate is keyed to x",',
			'			"marker=[0.9933 0.9820 0.9933 0.9993] silence=[0.9933 0.0180 0.9933 0.0000]",',
			'			func() string {',
			'				gm := LSTMGates(0, 0, 1, wF, wI, wO, wG)',
			'				gs := LSTMGates(0, 0, 0, wF, wI, wO, wG)',
			'				return fmt.Sprintf("marker=[%.4f %.4f %.4f %.4f] silence=[%.4f %.4f %.4f %.4f]",',
			'					gm[0], gm[1], gm[2], gm[3], gs[0], gs[1], gs[2], gs[3])',
			'			}},',
			'		{"One LSTMStep from rest on the marker: c = i*g, h = o*tanh(c)",',
			'			"c=0.9814 h=0.7486",',
			'			func() string {',
			'				c, h := LSTMStep(0, 0, 1, wF, wI, wO, wG)',
			'				return fmt.Sprintf("c=%.4f h=%.4f", c, h)',
			'			}},',
			'		{"THE demo: the LSTM carries the marker across 20 silent steps; the RNN\'s trace is gone",',
			'			"lstm c=0.8580 h=0.6906 | rnn h=0.000001",',
			'			func() string {',
			'				cs, hs := LSTMRun(marker21, wF, wI, wO, wG, 0, 0)',
			'				hrnn := RNNRun(marker21, 2.0, 0.5, 0, 0)',
			'				return fmt.Sprintf("lstm c=%.4f h=%.4f | rnn h=%.6f", cs[20], hs[20], hrnn[20])',
			'			}},',
			'		{"Forgetting is a DECISION: flip the forget bias to -5 and one step wipes c from 1.0",',
			'			"c=0.0067 h=0.0066",',
			'			func() string {',
			'				wFwipe := []float64{0, 0, -5}',
			'				c, h := LSTMStep(1, 0.5, 0, wFwipe, wI, wO, wG)',
			'				return fmt.Sprintf("c=%.4f h=%.4f", c, h)',
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
			'// sigmoidAILSTM is the logistic function, named to stay out of the',
			'// way of any harness helpers. Gates use sigmoid because a gate is a',
			'// soft switch in (0,1); the candidate uses tanh because content',
			'// should be signed.',
			'func sigmoidAILSTM(z float64) float64 {',
			'	return 1.0 / (1.0 + math.Exp(-z))',
			'}',
			'',
			'// RNNStep: three weights, reused at every timestep — weight sharing',
			'// across time, the temporal twin of convolution\'s sharing across',
			'// space. tanh keeps the state bounded in (-1, 1) so the recurrence',
			'// cannot blow up, at the price of slopes < 1 that feed the vanishing',
			'// product below.',
			'func RNNStep(h, x, wx, wh, b float64) float64 {',
			'	return math.Tanh(wx*x + wh*h + b)',
			'}',
			'',
			'// RNNRun threads one scalar through the whole sequence. This loop is',
			'// inherently SEQUENTIAL — h[t] cannot exist before h[t-1] — which is',
			'// the property that eventually killed RNNs at scale: no parallelism',
			'// across the time axis, no matter how many GPUs you own.',
			'func RNNRun(xs []float64, wx, wh, b, h0 float64) []float64 {',
			'	hs := make([]float64, len(xs))',
			'	h := h0',
			'	for t := range xs {',
			'		h = RNNStep(h, xs[t], wx, wh, b)',
			'		hs[t] = h',
			'	}',
			'	return hs',
			'}',
			'',
			'// SensitivityProduct: the chain rule down the time axis. Each step\'s',
			'// local Jacobian is d(h_t)/d(h_{t-1}) = wh * (1 - h_t^2) (tanh\'s',
			'// derivative expressed via its output), and influence across T steps',
			'// is their product. |wh| < 1 and (1-h^2) <= 1 make it geometric',
			'// decay; |wh| > 1 flips the same algebra into exploding gradients —',
			'// same product, opposite catastrophe.',
			'func SensitivityProduct(hs []float64, wh float64) float64 {',
			'	product := 1.0',
			'	for t := range hs {',
			'		product *= wh * (1 - hs[t]*hs[t])',
			'	}',
			'	return product',
			'}',
			'',
			'// LSTMGates: four tiny networks over the same (x, h) pair. Order',
			'// [f, i, o, g] as documented. Note c is NOT read by the gates in',
			'// this standard formulation (peephole variants add it) — it is',
			'// accepted here so the signature matches LSTMStep\'s state.',
			'func LSTMGates(c, h, x float64, wF, wI, wO, wG []float64) []float64 {',
			'	_ = c // standard (non-peephole) gates read only x and h',
			'	f := sigmoidAILSTM(wF[0]*x + wF[1]*h + wF[2])',
			'	i := sigmoidAILSTM(wI[0]*x + wI[1]*h + wI[2])',
			'	o := sigmoidAILSTM(wO[0]*x + wO[1]*h + wO[2])',
			'	g := math.Tanh(wG[0]*x + wG[1]*h + wG[2])',
			'	return []float64{f, i, o, g}',
			'}',
			'',
			'// LSTMStep: the two-line core. c is only multiplied by f and',
			'// incremented by i*g — no squashing nonlinearity ON THE PATH, so the',
			'// gradient along c multiplies by f per step instead of by',
			'// wh*(1-h^2). With f learned to sit near 1, that product barely',
			'// decays: the "constant error carousel" from the 1997 LSTM paper.',
			'func LSTMStep(c, h, x float64, wF, wI, wO, wG []float64) (float64, float64) {',
			'	gates := LSTMGates(c, h, x, wF, wI, wO, wG)',
			'	f := gates[0]',
			'	i := gates[1]',
			'	o := gates[2]',
			'	g := gates[3]',
			'	cNew := f*c + i*g',
			'	hNew := o * math.Tanh(cNew)',
			'	return cNew, hNew',
			'}',
			'',
			'// LSTMRun mirrors RNNRun with the two-part state threaded through.',
			'// Returning BOTH trajectories lets the harness show the conveyor',
			'// (cs barely decays) separately from the reported output (hs).',
			'func LSTMRun(xs []float64, wF, wI, wO, wG []float64, c0, h0 float64) ([]float64, []float64) {',
			'	cs := make([]float64, len(xs))',
			'	hs := make([]float64, len(xs))',
			'	c := c0',
			'	h := h0',
			'	for t := range xs {',
			'		c, h = LSTMStep(c, h, xs[t], wF, wI, wO, wG)',
			'		cs[t] = c',
			'		hs[t] = h',
			'	}',
			'	return cs, hs',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>BPTT and the two catastrophes</h3>' +
			'<p>Training an RNN means unrolling the loop into a T-layer network ' +
			'that shares weights and running backprop through it — ' +
			'backpropagation through time. Your <code>SensitivityProduct</code> is ' +
			'the quantity BPTT actually propagates, and it has exactly two failure ' +
			'modes: <code>|wh| &lt; 1</code> vanishes (the past becomes ' +
			'unlearnable — your 0.001168 at T=20), <code>|wh| &gt; 1</code> ' +
			'explodes (one long sequence NaNs the run). The explosion has a crude ' +
			'effective fix — <strong>gradient clipping</strong>, still in every ' +
			'training loop today, transformers included. Vanishing has no such ' +
			'patch: you cannot rescale a gradient that arrived as zero, which is ' +
			'why the fix had to be architectural. The LSTM&rsquo;s conveyor ' +
			'(Hochreiter &amp; Schmidhuber, 1997 — they called it the constant ' +
			'error carousel) reroutes the gradient through <code>c</code>, where ' +
			'the per-step factor is the <em>learned</em> forget gate instead of a ' +
			'fixed decay law. Practical footnote: real LSTMs initialize the ' +
			'forget bias positive (+1 or so) for exactly the reason your ' +
			'hand-set +5 works — start remembering, learn to forget.</p>' +
			'<h3>The 2014–2017 reign, and the cheaper cousin</h3>' +
			'<p>Gated recurrence ran the seq2seq era: Google Translate switched ' +
			'to stacked LSTMs in 2016, speech recognition (CTC over ' +
			'bidirectional LSTMs) lived on them, and "LSTM + attention" was ' +
			'state of the art in translation — attention was invented as a ' +
			'<em>bolt-on</em> to fix the single-vector bottleneck between an ' +
			'encoder LSTM and a decoder LSTM. The GRU is the popular diet ' +
			'version: it merges forget/input into one update gate and drops the ' +
			'separate cell state (two gates instead of three, no c/h split) — ' +
			'fewer parameters, usually indistinguishable accuracy, still a solid ' +
			'choice for small on-device sequence models.</p>' +
			'<h3>The punchline that leads out of this item</h3>' +
			'<p>Look again at <code>RNNRun</code>: <code>h[t]</code> cannot be ' +
			'computed before <code>h[t-1]</code>. Training throughput is bounded ' +
			'by sequence length <em>serially</em> — a 512-token sentence is 512 ' +
			'dependent steps, and GPUs, which want thousands of independent ' +
			'operations, sit idle. The transformer&rsquo;s core trade is exactly ' +
			'here: replace the recurrence with attention, where every token reads ' +
			'every other token in one parallel matrix multiply, and the time axis ' +
			'trains as a batch dimension. That — not accuracy on short sequences — ' +
			'is why attention won: the 2017 title "Attention Is All You Need" is ' +
			'an engineering claim about deleting the loop you just wrote. LSTMs ' +
			'survive where streaming state in O(1) memory per step matters ' +
			'(keyword spotting, control loops, tiny edge models) — and their ' +
			'core idea, gated linear state, is back in fashion inside modern ' +
			'state-space models (Mamba) that challenge attention&rsquo;s ' +
			'quadratic cost. Next category: the attention mechanism itself.</p>',
		],
		complexity: { time: 'O(T) sequential steps — the recurrence cannot parallelize across time', space: 'O(T) for the returned trajectories; O(1) live state per step' },
	});
})();
