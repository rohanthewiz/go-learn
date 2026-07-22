/* Build a Transformer: Tiny GPT in Go — Transformers & LLMs (Hard). The
 * track's flagship: a complete GPT forward pass at toy scale — token +
 * positional embeddings, one pre-norm block (2-head causal self-attention
 * with learned projections, ReLU FFN, residuals), final LayerNorm, logits
 * through the tied embedding, argmax NextToken. All 664 weights come from a
 * pinned LCG with a documented draw order, so every logit is exact: the
 * harness pins the weight stream, LayerNorm/FFN/attention on worked inputs,
 * final logits, next-token picks, and the causality property (changing the
 * last token cannot move position 0's logits).
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// The full forward pass, top to bottom. Marker id namespaced (dgArrowAITB)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 240" width="520" height="240" role="img" aria-label="tiny GPT forward pass: token plus positional embeddings flow through layer norm, two-head causal self-attention with a residual connection, layer norm, feed-forward network with a residual connection, a final layer norm, and logits via the tied embedding">' +
		'<text x="20" y="20" class="lbl">tokens → embeddings → one pre-norm block → logits (this item, end to end)</text>' +
		'<rect x="20" y="32" width="225" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="132" y="54" text-anchor="middle">x = tokEmb[t] + posEmb[i]</text>' +
		'<rect x="20" y="88" width="225" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="132" y="110" text-anchor="middle">x += MHA(LN(x))</text>' +
		'<text x="255" y="110" class="lbl">← 2-head causal, Wq Wk Wv Wo</text>' +
		'<rect x="20" y="144" width="225" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="132" y="166" text-anchor="middle">x += FFN(LN(x))</text>' +
		'<text x="255" y="166" class="lbl">← ReLU(xW1+b1)W2+b2, 8→16→8</text>' +
		'<rect x="20" y="200" width="225" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="132" y="222" text-anchor="middle">logits = LN(x) · tokEmbᵀ</text>' +
		'<text x="255" y="222" class="lbl">← tied embedding: read = write matrix</text>' +
		'<path d="M 132 66 L 132 81" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAITB)"/>' +
		'<path d="M 132 122 L 132 137" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAITB)"/>' +
		'<path d="M 132 178 L 132 193" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAITB)"/>' +
		'<path d="M 380 100 C 470 100 470 155 380 158" fill="none" stroke="var(--warn)" stroke-width="1.4" opacity="0.7"/>' +
		'<text x="392" y="136" class="lbl" style="fill:var(--warn)">residual "+=" keeps a</text>' +
		'<text x="392" y="150" class="lbl" style="fill:var(--warn)">gradient highway open</text>' +
		'<defs><marker id="dgArrowAITB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	// The provided scaffolding is IDENTICAL in starter and solution: config,
	// weight storage, and the cursor that carves the LCG stream into
	// matrices. The learner implements everything that computes.
	var SCAFFOLD = [
		'// ---------- provided scaffolding (leave as is) ----------',
		'',
		'// The model\'s entire world: 10 tokens.',
		'var vocab = []string{"the", "a", "cat", "dog", "sat", "ran", "on", "mat", "moon", "."}',
		'',
		'const (',
		'	dModel = 8  // embedding width',
		'	nHeads = 2  // attention heads (headDim = 4)',
		'	dFF    = 16 // FFN hidden width (the usual 4×dModel... at toy scale 2×)',
		'	maxSeq = 6  // positional embeddings available',
		'	vocabN = 10',
		')',
		'',
		'// Every learned tensor in the model. LayerNorm gains/biases are pinned',
		'// at gamma=1, beta=0 (their init values) and are not stored.',
		'var (',
		'	tokEmb [][]float64 // vocabN × dModel — also the output head (tied)',
		'	posEmb [][]float64 // maxSeq × dModel',
		'	wq     [][]float64 // dModel × dModel',
		'	wk     [][]float64 // dModel × dModel',
		'	wv     [][]float64 // dModel × dModel',
		'	wo     [][]float64 // dModel × dModel',
		'	w1     [][]float64 // dModel × dFF',
		'	b1     []float64   // dFF',
		'	w2     [][]float64 // dFF × dModel',
		'	b2     []float64   // dFF → dModel biases (len dModel)',
		')',
		'',
		'// ensureModel carves LCGWeights(12345, 664) into the tensors above, in',
		'// EXACTLY this order (row-major, row by row):',
		'//   tokEmb[10][8] → posEmb[6][8] → wq[8][8] → wk[8][8] → wv[8][8]',
		'//   → wo[8][8] → w1[8][16] → b1[16] → w2[16][8] → b2[8]  = 664 draws.',
		'// The cursor returns 0 past the end, so a short stream yields a',
		'// zero-filled model instead of a panic.',
		'func ensureModel() {',
		'	if tokEmb != nil {',
		'		return',
		'	}',
		'	stream := LCGWeights(12345, 664)',
		'	i := 0',
		'	next := func() float64 {',
		'		if i < len(stream) {',
		'			v := stream[i]',
		'			i++',
		'			return v',
		'		}',
		'		return 0',
		'	}',
		'	mat := func(rows, cols int) [][]float64 {',
		'		m := make([][]float64, rows)',
		'		for r := range m {',
		'			m[r] = make([]float64, cols)',
		'			for c := range m[r] {',
		'				m[r][c] = next()',
		'			}',
		'		}',
		'		return m',
		'	}',
		'	vec := func(n int) []float64 {',
		'		v := make([]float64, n)',
		'		for c := range v {',
		'			v[c] = next()',
		'		}',
		'		return v',
		'	}',
		'	tokEmb = mat(vocabN, dModel)',
		'	posEmb = mat(maxSeq, dModel)',
		'	wq = mat(dModel, dModel)',
		'	wk = mat(dModel, dModel)',
		'	wv = mat(dModel, dModel)',
		'	wo = mat(dModel, dModel)',
		'	w1 = mat(dModel, dFF)',
		'	b1 = vec(dFF)',
		'	w2 = mat(dFF, dModel)',
		'	b2 = vec(dModel)',
		'}',
		'',
		'// onesVec/zerosVec: the pinned LayerNorm parameters (untrained init).',
		'func onesVec(n int) []float64 {',
		'	v := make([]float64, n)',
		'	for i := range v {',
		'		v[i] = 1.0',
		'	}',
		'	return v',
		'}',
		'',
		'func zerosVec(n int) []float64 {',
		'	return make([]float64, n)',
		'}',
		'',
		'// matVecMul computes y = x·W for W laid out [in][out]:',
		'// y[j] = Σ_i x[i]*W[i][j]. Every projection in the model uses it.',
		'func matVecMul(x []float64, w [][]float64) []float64 {',
		'	if len(w) == 0 {',
		'		return []float64{}',
		'	}',
		'	out := make([]float64, len(w[0]))',
		'	for i := 0; i < len(x) && i < len(w); i++ {',
		'		for j := range w[i] {',
		'			out[j] += x[i] * w[i][j]',
		'		}',
		'	}',
		'	return out',
		'}',
		'',
		'// ---------- your implementation below ----------',
	].join('\n');

	T.problem({
		id: 'transformer-block',
		title: 'Build a Transformer: Tiny GPT in Go',
		nav: 'transformer',
		difficulty: 'Hard',
		category: 'Transformers & LLMs',
		task: 'Build a complete tiny-GPT forward pass: LCG-pinned weights, LayerNorm, FFN, 2-head causal self-attention, a pre-norm block with residuals, tied-embedding logits, and NextToken.',

		prose: [
			'<h2>Build a Transformer: Tiny GPT in Go</h2>' +
			'<p>Every GPT-class model — the one autocompleting your code right ' +
			'now included — is the same machine at different scale: embeddings ' +
			'in, a stack of identical transformer blocks, logits out, argmax-ish ' +
			'sampling. This item has you build that machine, whole, in Go: a real ' +
			'GPT forward pass with vocab 10, d<sub>model</sub> 8, 2 heads, one ' +
			'block. Nothing is mocked — the same dataflow as a 70B-parameter ' +
			'model, shrunk until every number fits in a test case.</p>' +
			DIAGRAM +
			'<p>The pieces, in dataflow order:</p>' +
			'<ul>' +
			'<li><strong>Embeddings.</strong> Position i holding token t starts ' +
			'as <code>tokEmb[t] + posEmb[i]</code> — attention itself is order-' +
			'blind, so position must be injected as data.</li>' +
			'<li><strong>Pre-norm block.</strong> <code>x += MHA(LN(x))</code> ' +
			'then <code>x += FFN(LN(x))</code>. Normalize <em>before</em> each ' +
			'sublayer (GPT-2 style), and add the result back onto the residual ' +
			'stream. The residual &ldquo;+=&rdquo; is why 100-block stacks train: ' +
			'identity is the default and every sublayer is a learned correction.</li>' +
			'<li><strong>Causal self-attention with learned projections.</strong> ' +
			'The attention item gave you the core; here Q, K, V are ' +
			'<code>x·Wq</code>, <code>x·Wk</code>, <code>x·Wv</code>, heads are ' +
			'column bands of the projected vectors (headDim 4, scores scaled by ' +
			'1/√4), and the concatenated heads pass through <code>Wo</code>.</li>' +
			'<li><strong>FFN.</strong> <code>ReLU(x·W1+b1)·W2+b2</code>, 8→16→8, ' +
			'applied per position. Attention routes; the FFN transforms.</li>' +
			'<li><strong>Tied-embedding logits.</strong> After a final LayerNorm, ' +
			'<code>logits[i][v] = h[i] · tokEmb[v]</code> — the embedding matrix ' +
			'read backwards. One matrix both writes token meanings in and reads ' +
			'them out; GPT-2 ships exactly this tying.</li>' +
			'</ul>' +
			'<h3>Pinned weights: the LCG</h3>' +
			'<p>An untrained model still needs <em>definite</em> weights for its ' +
			'outputs to be testable. All 664 parameters come from a tiny linear ' +
			'congruential generator you implement — seed 12345, drawn in one ' +
			'documented order:</p>',
			{ lang: 'txt', code: 'state = state*1664525 + 1013904223        (uint32, wraps mod 2³²)\nu     = float64(state) / 4294967296.0     each draw, in [0, 1)\nw     = u - 0.5                           weight in [-0.5, 0.5)\n\ndraw order (row-major): tokEmb[10][8] → posEmb[6][8] → wq[8][8] → wk[8][8]\n                        → wv[8][8] → wo[8][8] → w1[8][16] → b1[16]\n                        → w2[16][8] → b2[8]        = 664 draws\n\nfirst draws: -0.4796  -0.4835  0.0432  0.1349 ...' },
			'<p>To be clear about what you are building: this net is ' +
			'<strong>untrained</strong> — its predictions are arbitrary (though ' +
			'exactly pinned, and amusingly, this one continues &ldquo;the cat ' +
			'sat&rdquo; with &ldquo;ran&rdquo;). What you are building is the ' +
			'<em>machine</em>. Training it is just gradient descent (the backprop ' +
			'item) run through this exact forward pass at scale; inference at ' +
			'OpenAI or Anthropic is <em>this code</em> with bigger constants.</p>' +
			'<h3>Your job</h3>' +
			'<p>The scaffolding (config, weight storage, the stream-to-matrix ' +
			'carving, <code>matVecMul</code>) is provided. You implement, bottom ' +
			'up: <code>LCGWeights</code>, <code>LayerNorm</code> (per-position, ' +
			'eps 1e-5, population variance), <code>FFN</code>, ' +
			'<code>CausalSelfAttention</code>, <code>Block</code>, ' +
			'<code>Forward</code>, and <code>NextToken</code> (argmax, ties to ' +
			'the lowest id). Each level is independently pinned by the tests, so ' +
			'you can debug layer by layer instead of staring at wrong logits.</p>' +
			'<div class="tip">The causality test is the deepest one: change the ' +
			'<em>last</em> prompt token and position 0&rsquo;s logits must not ' +
			'move a single bit. In a correct causal model, information flows ' +
			'strictly left to right — this is the property that lets one forward ' +
			'pass train a prediction at every position, and the property your ' +
			'masked attention must preserve through the residuals, norms, and ' +
			'per-position FFN (none of which mix positions).</div>',
		],

		starter: [
			'package main',
			'',
			SCAFFOLD,
			'',
			'// LCGWeights returns n pseudo-random weights in [-0.5, 0.5) from the',
			'// pinned linear congruential generator. Starting from state = seed,',
			'// each draw FIRST advances the state, then converts:',
			'//   state = state*1664525 + 1013904223   (uint32 arithmetic, wraps)',
			'//   w     = float64(state)/4294967296.0 - 0.5',
			'// Seed 12345 must yield -0.4796, -0.4835, 0.0432, 0.1349, ...',
			'func LCGWeights(seed uint32, n int) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// LayerNorm normalizes ONE position\'s vector to mean 0 and variance',
			'// ~1, then applies the learned scale and shift:',
			'//   mu    = mean(x)',
			'//   varP  = population variance (divide by len(x), not len-1)',
			'//   out[i] = gamma[i]*(x[i]-mu)/sqrt(varP+1e-5) + beta[i]',
			'// The 1e-5 epsilon keeps a constant vector (variance 0) finite.',
			'func LayerNorm(x, gamma, beta []float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// FFN is the position-wise feed-forward net:',
			'//   ReLU(x·wIn + bIn)·wOut + bOut',
			'// wIn is [in][hidden], wOut is [hidden][out] (use matVecMul). ReLU',
			'// clamps negatives to 0 between the two affine maps.',
			'func FFN(x []float64, wIn [][]float64, bIn []float64, wOut [][]float64, bOut []float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// CausalSelfAttention: project each position of x with wQ/wK/wV,',
			'// split the projected vectors into `heads` contiguous column bands',
			'// (headDim = d/heads), and for each head let position i attend over',
			'// positions j <= i only:',
			'//   score = (q_i · k_j) / sqrt(headDim)   over the head\'s columns',
			'//   weights via stable softmax (subtract the row max)',
			'//   ctx_i  = sum_j weight_j * v_j          per head, concatenated',
			'// Finally project the concatenated context through wO. Positions',
			'// j > i get NO score at all (only j <= i is computed) — equivalent',
			'// to the -1e9 mask, with nothing to mask out.',
			'func CausalSelfAttention(x [][]float64, wQ, wK, wV, wO [][]float64, heads int) [][]float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Block is one PRE-NORM transformer block over the whole sequence:',
			'//   x = x + CausalSelfAttention(LN(x), wq, wk, wv, wo, nHeads)',
			'//   x = x + FFN(LN(x), w1, b1, w2, b2)      (per position)',
			'// LN uses gamma=onesVec(dModel), beta=zerosVec(dModel). Call',
			'// ensureModel() first so the weights exist. Returns new slices.',
			'func Block(x [][]float64) [][]float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Forward runs the full model: for prompt tokens (valid ids 0..9,',
			'// len <= maxSeq), build x[i] = tokEmb[tokens[i]] + posEmb[i], apply',
			'// Block, LayerNorm each position (ones/zeros), and read logits',
			'// through the TIED embedding: logits[i][v] = final[i] · tokEmb[v].',
			'// Returns the seq × vocabN logit matrix. Call ensureModel() first.',
			'func Forward(tokens []int) [][]float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// NextToken returns the argmax over the LAST position\'s logits —',
			'// greedy decoding. Ties break to the lowest token id.',
			'func NextToken(tokens []int) int {',
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
			'	tokNames := []string{"the", "a", "cat", "dog", "sat", "ran", "on", "mat", "moon", "."}',
			'	fv := func(xs []float64) string {',
			'		if len(xs) == 0 {',
			'			return "nil"',
			'		}',
			'		s := ""',
			'		for i, x := range xs {',
			'			if i > 0 {',
			'				s += " "',
			'			}',
			'			s += fmt.Sprintf("%.4f", x)',
			'		}',
			'		return s',
			'	}',
			'	head := func(xs []float64, n int) []float64 {',
			'		if len(xs) < n {',
			'			return nil',
			'		}',
			'		return xs[:n]',
			'	}',
			'	row := func(m [][]float64, i int) []float64 {',
			'		if i < len(m) {',
			'			return m[i]',
			'		}',
			'		return nil',
			'	}',
			'	name := func(id int) string {',
			'		if id >= 0 && id < len(tokNames) {',
			'			return tokNames[id]',
			'		}',
			'		return "?"',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"LCG stream head: seed 12345 must produce these first four weights (advance state BEFORE converting)",',
			'			"-0.4796 -0.4835 0.0432 0.1349",',
			'			func() string { return fv(LCGWeights(12345, 4)) }},',
			'		{"LCG draw-order landmarks: draw 80 ends tokEmb, draw 81 starts posEmb, draw 664 is the last bias",',
			'			"-0.1282 0.3324 -0.4819",',
			'			func() string {',
			'				s := LCGWeights(12345, 664)',
			'				if len(s) != 664 {',
			'					return fmt.Sprintf("len=%d", len(s))',
			'				}',
			'				return fv([]float64{s[79], s[80], s[663]})',
			'			}},',
			'		{"LayerNorm worked vector: (1,2,3,4) with gamma=1, beta=0 — mean 0, symmetric, variance ~1",',
			'			"-1.3416 -0.4472 0.4472 1.3416",',
			'			func() string { return fv(LayerNorm([]float64{1, 2, 3, 4}, onesVec(4), zerosVec(4))) }},',
			'		{"LayerNorm applies gamma then beta: same vector with gamma=2, beta=1 is 2·normed + 1",',
			'			"-1.6833 0.1056 1.8944 3.6833",',
			'			func() string {',
			'				return fv(LayerNorm([]float64{1, 2, 3, 4}, []float64{2, 2, 2, 2}, []float64{1, 1, 1, 1}))',
			'			}},',
			'		{"LayerNorm epsilon guard: a constant vector has variance 0 — output is 0s, not NaNs",',
			'			"0.0000 0.0000 0.0000 0.0000",',
			'			func() string { return fv(LayerNorm([]float64{5, 5, 5, 5}, onesVec(4), zerosVec(4))) }},',
			'		{"FFN worked example: hidden pre-activations (1,-1,-5) — ReLU kills two of three hidden units",',
			'			"1.5000 -0.5000",',
			'			func() string {',
			'				fw1 := [][]float64{{1, 0, -1}, {0, 1, 2}}',
			'				fb1 := []float64{0, 1, 0}',
			'				fw2 := [][]float64{{1, 0}, {0, 1}, {1, 1}}',
			'				fb2 := []float64{0.5, -0.5}',
			'				return fv(FFN([]float64{1, -2}, fw1, fb1, fw2, fb2))',
			'			}},',
			'		{"Causal attention, position 0: may only attend to itself — with identity projections, out[0] = x[0]",',
			'			"1.0000 0.0000 2.0000 0.0000",',
			'			func() string {',
			'				id4 := [][]float64{{1, 0, 0, 0}, {0, 1, 0, 0}, {0, 0, 1, 0}, {0, 0, 0, 1}}',
			'				xa := [][]float64{{1, 0, 2, 0}, {0, 1, 0, 2}}',
			'				return fv(row(CausalSelfAttention(xa, id4, id4, id4, id4, 2), 0))',
			'			}},',
			'		{"Causal attention, position 1: blends positions 0-1 per head with 1/√headDim scaling (headDim 2)",',
			'			"0.3302 0.6698 0.1116 1.8884",',
			'			func() string {',
			'				id4 := [][]float64{{1, 0, 0, 0}, {0, 1, 0, 0}, {0, 0, 1, 0}, {0, 0, 0, 1}}',
			'				xa := [][]float64{{1, 0, 2, 0}, {0, 1, 0, 2}}',
			'				return fv(row(CausalSelfAttention(xa, id4, id4, id4, id4, 2), 1))',
			'			}},',
			'		{"Tied embedding shape: logits are seq × vocab — the output head IS tokEmb read backwards",',
			'			"3x10",',
			'			func() string {',
			'				lg := Forward([]int{0, 2, 4})',
			'				if len(lg) == 0 || len(lg[0]) == 0 {',
			'					return "nil"',
			'				}',
			'				return fmt.Sprintf("%dx%d", len(lg), len(lg[0]))',
			'			}},',
			'		{"Full forward pass: last-position logits for \\"the cat sat\\", first three vocab entries",',
			'			"-0.0701 -0.0514 -1.1554",',
			'			func() string { return fv(head(row(Forward([]int{0, 2, 4}), 2), 3)) }},',
			'		{"Greedy decoding: NextToken continues \\"the cat sat\\" → ran, \\"cat sat on\\" → moon, \\"moon .\\" → sat",',
			'			"ran moon sat",',
			'			func() string {',
			'				a := name(NextToken([]int{0, 2, 4}))',
			'				b := name(NextToken([]int{2, 4, 6}))',
			'				c := name(NextToken([]int{8, 9}))',
			'				return a + " " + b + " " + c',
			'			}},',
			'		{"THE causality property: swapping the LAST token (a→.) cannot change position 0\'s logits at all",',
			'			"row0=same last=diff",',
			'			func() string {',
			'				a := Forward([]int{2, 4, 1})',
			'				b := Forward([]int{2, 4, 9})',
			'				if len(a) < 3 || len(b) < 3 {',
			'					return "nil"',
			'				}',
			'				r0 := "diff"',
			'				if fv(a[0]) == fv(b[0]) {',
			'					r0 = "same"',
			'				}',
			'				last := "same"',
			'				if fv(a[2]) != fv(b[2]) {',
			'					last = "diff"',
			'				}',
			'				return "row0=" + r0 + " last=" + last',
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
			SCAFFOLD,
			'',
			'// LCGWeights: the numeric constants are Numerical Recipes\' classic',
			'// LCG. uint32 arithmetic wraps for free in Go, which IS the mod 2³²;',
			'// dividing the post-update state by 2³² gives u ∈ [0,1), and -0.5',
			'// centers the weights. Real inits (Xavier/He) also center at 0 and',
			'// scale with layer width — pinning ±0.5 keeps every downstream number',
			'// reproducible to the last bit, which is what makes this net testable.',
			'func LCGWeights(seed uint32, n int) []float64 {',
			'	state := seed',
			'	out := make([]float64, n)',
			'	for i := 0; i < n; i++ {',
			'		state = state*1664525 + 1013904223',
			'		out[i] = float64(state)/4294967296.0 - 0.5',
			'	}',
			'	return out',
			'}',
			'',
			'// LayerNorm re-centers and re-scales ONE position\'s activation',
			'// vector. Population variance (divide by n) is the convention every',
			'// framework uses here — LN normalizes a fixed set of activations, not',
			'// a sample from a population. The epsilon inside the sqrt keeps the',
			'// constant-vector case (variance 0) at 0/sqrt(1e-5) = 0 instead of',
			'// 0/0 = NaN, which would otherwise poison the whole residual stream.',
			'func LayerNorm(x, gamma, beta []float64) []float64 {',
			'	n := len(x)',
			'	if n == 0 {',
			'		return []float64{}',
			'	}',
			'	mean := 0.0',
			'	for _, v := range x {',
			'		mean += v',
			'	}',
			'	mean /= float64(n)',
			'	variance := 0.0',
			'	for _, v := range x {',
			'		variance += (v - mean) * (v - mean)',
			'	}',
			'	variance /= float64(n)',
			'	inv := 1.0 / math.Sqrt(variance+1e-5)',
			'	out := make([]float64, n)',
			'	for i, v := range x {',
			'		g, bt := 1.0, 0.0',
			'		if i < len(gamma) {',
			'			g = gamma[i]',
			'		}',
			'		if i < len(beta) {',
			'			bt = beta[i]',
			'		}',
			'		out[i] = g*(v-mean)*inv + bt',
			'	}',
			'	return out',
			'}',
			'',
			'// FFN: two affine maps around a ReLU, applied to one position.',
			'// This is where a transformer stores most of its parameters and —',
			'// per the key-value memory view of FFNs — most of its facts:',
			'// attention decides WHERE to look, the FFN decides WHAT to make of it.',
			'func FFN(x []float64, wIn [][]float64, bIn []float64, wOut [][]float64, bOut []float64) []float64 {',
			'	hidden := matVecMul(x, wIn)',
			'	for i := range hidden {',
			'		if i < len(bIn) {',
			'			hidden[i] += bIn[i]',
			'		}',
			'		if hidden[i] < 0 {',
			'			hidden[i] = 0 // ReLU: the only nonlinearity in the block',
			'		}',
			'	}',
			'	out := matVecMul(hidden, wOut)',
			'	for i := range out {',
			'		if i < len(bOut) {',
			'			out[i] += bOut[i]',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// CausalSelfAttention with learned projections — the real thing, not',
			'// the identity-projection version of the attention item. Design',
			'// choices worth noting:',
			'//   - Heads are column BANDS of the projected q/k/v; band h of every',
			'//     position forms one head\'s subspace. Splitting after projection',
			'//     is exactly how the big implementations lay it out (one fused',
			'//     Wq, viewed as [heads][headDim]).',
			'//   - The causal mask is structural: scores are only computed for',
			'//     j <= i, so there is nothing to mask out and no -1e9 sentinel',
			'//     needed. Same math, and provably incapable of future leakage.',
			'//   - Softmax subtracts the row max before exp (stability; see the',
			'//     attention item for why this is a mathematical no-op).',
			'func CausalSelfAttention(x [][]float64, wQ, wK, wV, wO [][]float64, heads int) [][]float64 {',
			'	n := len(x)',
			'	if n == 0 || heads <= 0 {',
			'		return [][]float64{}',
			'	}',
			'	d := len(x[0])',
			'	headDim := d / heads',
			'	q := make([][]float64, n)',
			'	k := make([][]float64, n)',
			'	v := make([][]float64, n)',
			'	for i := range x {',
			'		q[i] = matVecMul(x[i], wQ)',
			'		k[i] = matVecMul(x[i], wK)',
			'		v[i] = matVecMul(x[i], wV)',
			'	}',
			'	ctx := make([][]float64, n)',
			'	for i := range ctx {',
			'		ctx[i] = make([]float64, d)',
			'	}',
			'	scale := 1.0 / math.Sqrt(float64(headDim))',
			'	for h := 0; h < heads; h++ {',
			'		lo := h * headDim',
			'		for i := 0; i < n; i++ {',
			'			// Scores over the causal prefix j = 0..i only.',
			'			scores := make([]float64, i+1)',
			'			maxS := math.Inf(-1)',
			'			for j := 0; j <= i; j++ {',
			'				dot := 0.0',
			'				for c := 0; c < headDim; c++ {',
			'					dot += q[i][lo+c] * k[j][lo+c]',
			'				}',
			'				scores[j] = dot * scale',
			'				if scores[j] > maxS {',
			'					maxS = scores[j]',
			'				}',
			'			}',
			'			sum := 0.0',
			'			for j := range scores {',
			'				scores[j] = math.Exp(scores[j] - maxS)',
			'				sum += scores[j]',
			'			}',
			'			// sum >= 1 (the max score contributes exp(0)=1): safe divide.',
			'			for j := range scores {',
			'				w := scores[j] / sum',
			'				for c := 0; c < headDim; c++ {',
			'					ctx[i][lo+c] += w * v[j][lo+c]',
			'				}',
			'			}',
			'		}',
			'	}',
			'	// The output projection mixes the heads back together — without',
			'	// Wo, head subspaces would never exchange information.',
			'	out := make([][]float64, n)',
			'	for i := range ctx {',
			'		out[i] = matVecMul(ctx[i], wO)',
			'	}',
			'	return out',
			'}',
			'',
			'// Block: one pre-norm transformer block. Pre-norm (LN inside the',
			'// residual branch, GPT-2 style) rather than post-norm (original 2017',
			'// paper) because the residual stream then carries raw, un-normalized',
			'// activations end to end — the property that makes very deep stacks',
			'// trainable without warmup tricks. Note what NEVER mixes positions:',
			'// LN and FFN are strictly per-position; attention is the only place',
			'// tokens exchange information. That separation is what the causality',
			'// test leans on.',
			'func Block(x [][]float64) [][]float64 {',
			'	ensureModel()',
			'	n := len(x)',
			'	if n == 0 {',
			'		return [][]float64{}',
			'	}',
			'	d := len(x[0])',
			'	normed := make([][]float64, n)',
			'	for i := range x {',
			'		normed[i] = LayerNorm(x[i], onesVec(d), zerosVec(d))',
			'	}',
			'	attnOut := CausalSelfAttention(normed, wq, wk, wv, wo, nHeads)',
			'	h := make([][]float64, n)',
			'	for i := range x {',
			'		h[i] = make([]float64, d)',
			'		for c := 0; c < d; c++ {',
			'			h[i][c] = x[i][c] + attnOut[i][c] // residual 1',
			'		}',
			'	}',
			'	out := make([][]float64, n)',
			'	for i := range h {',
			'		f := FFN(LayerNorm(h[i], onesVec(d), zerosVec(d)), w1, b1, w2, b2)',
			'		out[i] = make([]float64, d)',
			'		for c := 0; c < d; c++ {',
			'			out[i][c] = h[i][c] + f[c] // residual 2',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// Forward: embeddings in, logits out. The tied output head is the',
			'// dot product of each final hidden state with every ROW of tokEmb —',
			'// "which token\'s embedding does this state now resemble?" Tying',
			'// saves a vocabN×dModel matrix and couples input and output',
			'// semantics; GPT-2 ships exactly this.',
			'func Forward(tokens []int) [][]float64 {',
			'	ensureModel()',
			'	n := len(tokens)',
			'	if n == 0 {',
			'		return [][]float64{}',
			'	}',
			'	x := make([][]float64, n)',
			'	for i, t := range tokens {',
			'		x[i] = make([]float64, dModel)',
			'		if t >= 0 && t < vocabN && i < maxSeq {',
			'			for c := 0; c < dModel; c++ {',
			'				x[i][c] = tokEmb[t][c] + posEmb[i][c]',
			'			}',
			'		}',
			'	}',
			'	h := Block(x)',
			'	logits := make([][]float64, n)',
			'	for i := range h {',
			'		final := LayerNorm(h[i], onesVec(dModel), zerosVec(dModel))',
			'		logits[i] = make([]float64, vocabN)',
			'		for t := 0; t < vocabN; t++ {',
			'			dot := 0.0',
			'			for c := 0; c < dModel; c++ {',
			'				dot += final[c] * tokEmb[t][c]',
			'			}',
			'			logits[i][t] = dot',
			'		}',
			'	}',
			'	return logits',
			'}',
			'',
			'// NextToken: greedy decoding — strict > keeps the LOWEST id on ties.',
			'// The sampling-decoding item replaces exactly this argmax with',
			'// temperature, top-k, and top-p; everything upstream stays as is.',
			'func NextToken(tokens []int) int {',
			'	logits := Forward(tokens)',
			'	if len(logits) == 0 {',
			'		return 0',
			'	}',
			'	last := logits[len(logits)-1]',
			'	best := 0',
			'	for t := 1; t < len(last); t++ {',
			'		if last[t] > last[best] {',
			'			best = t',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>From 664 parameters to GPT-4: the same machine, scaled</h3>' +
			'<p>Count what you built: embeddings 80 + positions 48 + four ' +
			'attention projections 256 + FFN 280 = 664 parameters. Now scale the ' +
			'recipe, changing <em>nothing structural</em>: GPT-2 is d<sub>model</sub> ' +
			'768, 12 heads, 12 of your blocks stacked, vocab 50k ≈ 124M params. ' +
			'GPT-3: d<sub>model</sub> 12288, 96 blocks ≈ 175B. The parameter ' +
			'count is dominated by exactly the two matrices families you wrote: ' +
			'per block ≈ 4·d² (attention) + 2·d·d<sub>ff</sub> ≈ 12·d² with the ' +
			'standard d<sub>ff</sub>=4d — multiply by blocks, add vocab·d for the ' +
			'(tied) embedding, and you can sanity-check any model card from your ' +
			'head. Modern refinements are local edits to functions you now own: ' +
			'RMSNorm simplifies your <code>LayerNorm</code> (drop the mean ' +
			'subtraction), SwiGLU replaces your FFN&rsquo;s ReLU, rotary ' +
			'embeddings (RoPE) replace your additive <code>posEmb</code> with a ' +
			'rotation inside <code>CausalSelfAttention</code>, and grouped-query ' +
			'attention shares your <code>wk</code>/<code>wv</code> across head ' +
			'groups to shrink the KV cache.</p>' +
			'<h3>What training adds — and what it doesn&rsquo;t</h3>' +
			'<p>Nothing about the forward pass changes when a model is trained: ' +
			'inference at any AI lab is this item&rsquo;s code path with bigger ' +
			'constants and fused GPU kernels. Training wraps your forward pass in ' +
			'three more steps: a loss (cross-entropy between ' +
			'<code>softmax(logits[i])</code> and the actual token i+1, at every ' +
			'position at once — the causal mask&rsquo;s gift), a backward pass ' +
			'(the backprop item&rsquo;s chain rule mechanically applied through ' +
			'every function you wrote), and an optimizer step (the Adam item, ' +
			'typically AdamW with warmup and cosine decay). Run that loop over ' +
			'trillions of tokens on thousands of GPUs and the pinned-LCG ' +
			'gibberish weights become weights that continue &ldquo;the cat ' +
			'sat&rdquo; with &ldquo;on the mat&rdquo; because the internet ' +
			'said so. Fine-tuning methods like LoRA (next category) attach ' +
			'low-rank correction factors to precisely your <code>wq</code> and ' +
			'<code>wv</code> matrices — you now know the exact tensors a LoRA ' +
			'adapter targets and why they sit on the model&rsquo;s information-' +
			'routing path.</p>' +
			'<h3>Pre-norm vs post-norm, and reading real code</h3>' +
			'<p>The original 2017 transformer put LayerNorm <em>after</em> each ' +
			'residual add (post-norm); GPT-2 moved it inside the branch ' +
			'(pre-norm, what you built), and essentially every LLM since ' +
			'followed. The reason is gradient flow: pre-norm leaves the residual ' +
			'stream as an unbroken identity path from loss to embeddings, so ' +
			'100-block stacks train without the fragile learning-rate warmup ' +
			'post-norm needs. The final LayerNorm you applied before the logits ' +
			'is pre-norm&rsquo;s closing bracket (without it, the residual ' +
			'stream&rsquo;s growing magnitude would inflate every logit). When ' +
			'you next read nanoGPT or a llama.cpp kernel, you&rsquo;ll recognize ' +
			'every line: <code>x + attn(ln1(x))</code>, <code>x + ' +
			'mlp(ln2(x))</code>, <code>ln_f</code>, tied <code>lm_head</code> — ' +
			'the file you just wrote, with the constants turned up.</p>',
		],
		complexity: { time: 'O(n²·d + n·d·d_ff) per forward — attention scores plus per-position FFN; at n≤6, d=8 a few thousand flops', space: 'O(n·d + vocab·d) activations plus the 664 pinned weights' },
	});
})();
