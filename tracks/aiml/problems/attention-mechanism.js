/* Scaled Dot-Product Attention — Transformers & LLMs (Hard). The equation
 * that ended the RNN era: softmax(QKᵀ/√d)V, plus the causal mask and the
 * multi-head column split. The harness pins a worked 3-token d=4 example,
 * the max-subtraction stability trick (softmax(1000..) must equal
 * softmax(0..)), the √d scaling lesson at d=64 (unscaled saturates to
 * one-hot, scaled stays soft), and the exactly-zero causal upper triangle.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// Attention as a soft dictionary lookup: a query scores every key, the
	// softmax turns scores into mixing weights, the output is the weighted
	// blend of values. Marker id namespaced (dgArrowAIATT) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="attention as a soft dictionary lookup: the query is scored against every key, softmax turns scores into weights, the output is the weighted mix of the values">' +
		'<text x="20" y="22" class="lbl">attention = a dictionary lookup that returns a weighted MIX instead of one value</text>' +
		'<rect x="20" y="40" width="90" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="65" y="63" text-anchor="middle">query q</text>' +
		'<rect x="180" y="40" width="130" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="245" y="63" text-anchor="middle">q·kⱼ / √d</text>' +
		'<text x="245" y="92" text-anchor="middle" class="lbl">score every key</text>' +
		'<rect x="380" y="40" width="120" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="440" y="63" text-anchor="middle">softmax</text>' +
		'<text x="440" y="92" text-anchor="middle" class="lbl">weights sum to 1</text>' +
		'<path d="M 110 58 L 173 58" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIATT)"/>' +
		'<path d="M 310 58 L 373 58" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIATT)"/>' +
		'<rect x="180" y="130" width="320" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="340" y="153" text-anchor="middle">out = Σⱼ weightⱼ · vⱼ</text>' +
		'<path d="M 440 76 L 440 123" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAIATT)"/>' +
		'<text x="20" y="153" class="lbl">values vⱼ ↗</text>' +
		'<text x="20" y="196" class="lbl">causal mask: position i may only look at j ≤ i — score(j&gt;i) = −1e9 → weight exactly 0</text>' +
		'<defs><marker id="dgArrowAIATT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'attention-mechanism',
		title: 'Scaled Dot-Product Attention',
		nav: 'attention',
		difficulty: 'Hard',
		category: 'Transformers & LLMs',
		task: 'Implement stable Softmax, scaled dot-product Attention returning (output, weights), the causal mask, and multi-head column splitting.',

		prose: [
			'<h2>Scaled Dot-Product Attention</h2>' +
			'<p>The RNN item ended on a cliffhanger: recurrent models process ' +
			'tokens one at a time, so signal from token 0 decays geometrically ' +
			'before it reaches token 500 — and nothing parallelizes. In 2017, ' +
			'&ldquo;Attention Is All You Need&rdquo; deleted the recurrence and ' +
			'kept one mechanism, an equation short enough to memorize and rich ' +
			'enough to run a trillion-dollar industry:</p>',
			{ lang: 'txt', code: 'Attention(Q, K, V) = softmax(QKᵀ/√d) · V' },
			'<p>Read it as a <strong>soft dictionary lookup</strong>. Every token ' +
			'publishes a <em>key</em> (&ldquo;what I contain&rdquo;) and a ' +
			'<em>value</em> (&ldquo;what I&rsquo;ll contribute&rdquo;), and asks a ' +
			'<em>query</em> (&ldquo;what I&rsquo;m looking for&rdquo;). A hard map ' +
			'lookup returns the single value whose key matches. Attention scores ' +
			'the query against <em>every</em> key (dot product), softmaxes the ' +
			'scores into weights that sum to 1, and returns the weighted blend of ' +
			'all values. Token 0 reaches token 500 in one step, and every ' +
			'position&rsquo;s lookup is an independent matrix product — that ' +
			'parallelism is what made trillion-token training runs possible.</p>' +
			DIAGRAM +
			'<p>Three details carry the engineering weight, and each is a pinned ' +
			'test:</p>' +
			'<ul>' +
			'<li><strong>Stable softmax.</strong> exp(1000) overflows float64 to ' +
			'+Inf. Subtract the row max before exponentiating: mathematically a ' +
			'no-op (softmax is shift-invariant), numerically the difference ' +
			'between answers and NaNs. Your <code>Softmax([1000,1001,1002])</code> ' +
			'must equal <code>Softmax([1,2,3])</code>.</li>' +
			'<li><strong>The √d scale.</strong> Dot products of d-dimensional ' +
			'vectors grow like √d (sum of d random-ish terms), so at d = 64 raw ' +
			'scores like ±8 saturate softmax into a one-hot — gradients vanish and ' +
			'the "soft" lookup hardens. Dividing by √d keeps scores O(1). The ' +
			'harness pins both worlds: unscaled max-weight 1.0000 vs scaled ' +
			'0.8808.</li>' +
			'<li><strong>The causal mask.</strong> A language model must not read ' +
			'the future. Set score(j &gt; i) = −1e9 <em>before</em> softmax: ' +
			'exp(−1e9 − max) is exactly 0.0, so future tokens get weight 0 and ' +
			'the remaining weights still sum to 1. Masking scores (not zeroing ' +
			'weights after) is the trick — the renormalization comes free.</li>' +
			'</ul>' +
			'<h3>Your job</h3>' +
			'<p><code>Softmax</code>, <code>Attention(Q,K,V)</code> returning ' +
			'<em>both</em> the output and the weight matrix (weights[i][j] = how ' +
			'much position i draws from position j; d is <code>len(K[0])</code>), ' +
			'<code>CausalAttention</code> (same, with the mask), and ' +
			'<code>MultiHead(Q,K,V,nHeads)</code>: split the d<sub>model</sub> ' +
			'columns into nHeads contiguous slices, run plain Attention per head ' +
			'(each head scales by its own √(d/nHeads)), and concatenate the head ' +
			'outputs in order. Disclosed simplification: real multi-head attention ' +
			'learns projection matrices W<sub>Q</sub>, W<sub>K</sub>, ' +
			'W<sub>V</sub>, W<sub>O</sub> around this core; here projections are ' +
			'identity so the split-attend-concat skeleton is the whole exercise — ' +
			'the transformer-block item adds the learned projections.</p>' +
			'<div class="tip">Softmax rows summing to exactly 1.0 is not just a ' +
			'sanity check — it means attention computes a <em>convex combination</em> ' +
			'of values. The output always lies inside the values&rsquo; convex ' +
			'hull: attention can mix and route information but never invent or ' +
			'amplify it. That is why transformers interleave attention with FFN ' +
			'layers, which do the amplifying.</div>',
		],

		starter: [
			'package main',
			'',
			'// Softmax maps scores to a probability distribution:',
			'// out[i] = exp(xs[i]) / Σ exp(xs[j]), computed STABLY by subtracting',
			'// max(xs) from every entry before exponentiating (shift-invariance',
			'// makes this a mathematical no-op; it prevents exp overflow to +Inf).',
			'// An empty input returns an empty non-nil slice.',
			'func Softmax(xs []float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Attention is scaled dot-product attention over row vectors:',
			'//   scores[i][j] = (Q[i] · K[j]) / √d      with d = len(K[0])',
			'//   weights[i]   = Softmax(scores[i])',
			'//   out[i]       = Σ_j weights[i][j] * V[j]',
			'// Returns (out, weights) — weights[i][j] is how much position i',
			'// draws from position j. Q rows are queries; K and V have one row',
			'// per position (len(K) == len(V)).',
			'func Attention(q, k, v [][]float64) ([][]float64, [][]float64) {',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
			'// CausalAttention is Attention with the autoregressive mask: BEFORE',
			'// the softmax, set scores[i][j] = -1e9 for every j > i, so position i',
			'// can only attend to positions 0..i. exp(-1e9 - max) underflows to',
			'// exactly 0.0, and the surviving weights renormalize to sum 1 for',
			'// free — mask scores, never post-zero the weights.',
			'func CausalAttention(q, k, v [][]float64) ([][]float64, [][]float64) {',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
			'// MultiHead splits the dModel = len(q[0]) columns into nHeads',
			'// contiguous slices of headDim = dModel/nHeads columns each (dModel',
			'// is always a multiple of nHeads here), runs plain Attention',
			'// independently on each (q, k, v) column slice — so each head scales',
			'// by √headDim, not √dModel — and concatenates the head outputs in',
			'// head order. Projections are identity in this exercise (real MHA',
			'// wraps this skeleton in learned WQ/WK/WV/WO matrices).',
			'func MultiHead(q, k, v [][]float64, nHeads int) [][]float64 {',
			'	// your code here',
			'	return nil',
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
			'	// The worked 3-token, d=4 example from the prose.',
			'	Q := [][]float64{{1, 0, 1, 0}, {0, 1, 0, 1}, {1, 1, 0, 0}}',
			'	K := [][]float64{{1, 0, 1, 0}, {0, 1, 0, 1}, {1, 0, 0, 1}}',
			'	V := [][]float64{{1, 2, 0, 0}, {0, 0, 3, 1}, {2, 0, 1, 0}}',
			'',
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
			'	row := func(m [][]float64, i int) []float64 {',
			'		if i < len(m) {',
			'			return m[i]',
			'		}',
			'		return nil',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"Softmax worked example: softmax(1,2,3) — each step of 1 multiplies the odds by e",',
			'			"0.0900 0.2447 0.6652",',
			'			func() string { return fv(Softmax([]float64{1, 2, 3})) }},',
			'		{"Stability: softmax(1000,1001,1002) must equal softmax(1,2,3) — naive exp(1002) is +Inf → NaN",',
			'			"0.0900 0.2447 0.6652",',
			'			func() string { return fv(Softmax([]float64{1000, 1001, 1002})) }},',
			'		{"Attention weights, row 0: query 0 matches key 0 hardest (dot 2 vs 0 vs 1, scaled by 1/√4)",',
			'			"0.5065 0.1863 0.3072",',
			'			func() string {',
			'				_, w := Attention(Q, K, V)',
			'				return fv(row(w, 0))',
			'			}},',
			'		{"Attention output, row 0: the weighted blend of all three value rows",',
			'			"1.1209 1.0130 0.8662 0.1863",',
			'			func() string {',
			'				out, _ := Attention(Q, K, V)',
			'				return fv(row(out, 0))',
			'			}},',
			'		{"Every weight row sums to exactly 1: attention outputs are convex combinations of values",',
			'			"1.0000 1.0000 1.0000",',
			'			func() string {',
			'				_, w := Attention(Q, K, V)',
			'				if len(w) < 3 {',
			'					return "nil"',
			'				}',
			'				sums := make([]float64, 3)',
			'				for i := 0; i < 3; i++ {',
			'					for _, x := range w[i] {',
			'						sums[i] += x',
			'					}',
			'				}',
			'				return fv(sums)',
			'			}},',
			'		{"√d scaling at d=64: raw scores ±8 saturate softmax to one-hot; scaling by 1/√64 keeps it soft",',
			'			"unscaled=1.0000 scaled=0.8808",',
			'			func() string {',
			'				d := 64',
			'				q := [][]float64{make([]float64, d)}',
			'				k := [][]float64{make([]float64, d), make([]float64, d)}',
			'				v := [][]float64{make([]float64, d), make([]float64, d)}',
			'				for c := 0; c < d; c++ {',
			'					q[0][c] = 0.5    // q·k0 = 64·0.5·0.25 = +8',
			'					k[0][c] = 0.25   // q·k1 = -8',
			'					k[1][c] = -0.25',
			'				}',
			'				raw := Softmax([]float64{8, -8})',
			'				_, w := Attention(q, k, v)',
			'				if len(raw) < 1 || len(w) < 1 || len(w[0]) < 1 {',
			'					return "nil"',
			'				}',
			'				return fmt.Sprintf("unscaled=%.4f scaled=%.4f", raw[0], w[0][0])',
			'			}},',
			'		{"Causal mask: row 0 sees only itself — and masked future weights are exactly 0.0, not merely small",',
			'			"1.0000 0.0000 0.0000",',
			'			func() string {',
			'				_, w := CausalAttention(Q, K, V)',
			'				return fv(row(w, 0))',
			'			}},',
			'		{"Causal row 1: attends over positions 0..1 only, weights renormalize to sum 1 for free",',
			'			"0.2689 0.7311 0.0000",',
			'			func() string {',
			'				_, w := CausalAttention(Q, K, V)',
			'				return fv(row(w, 1))',
			'			}},',
			'		{"A query attends hardest to the key it matches: q = k2 → weight row is ~one-hot at index 2",',
			'			"0.0000 0.0000 1.0000",',
			'			func() string {',
			'				km := [][]float64{{5, 0, 0, 0}, {0, 5, 0, 0}, {0, 0, 5, 0}}',
			'				qm := [][]float64{{0, 0, 5, 0}}',
			'				vm := [][]float64{{1, 0, 0, 0}, {0, 1, 0, 0}, {0, 0, 1, 0}}',
			'				_, w := Attention(qm, km, vm)',
			'				return fv(row(w, 0))',
			'			}},',
			'		{"MultiHead with 2 heads: each head attends over its own 2 columns (scale √2), outputs concatenated",',
			'			"1.2033 0.8022 0.9930 0.2483",',
			'			func() string { return fv(row(MultiHead(Q, K, V, 2), 0)) }},',
			'		{"Property: MultiHead with 1 head degenerates to plain Attention exactly",',
			'			"same same same",',
			'			func() string {',
			'				mh := MultiHead(Q, K, V, 1)',
			'				out, _ := Attention(Q, K, V)',
			'				if len(mh) < 3 || len(out) < 3 {',
			'					return "nil"',
			'				}',
			'				s := ""',
			'				for i := 0; i < 3; i++ {',
			'					if i > 0 {',
			'						s += " "',
			'					}',
			'					if fv(mh[i]) == fv(out[i]) {',
			'						s += "same"',
			'					} else {',
			'						s += "diff"',
			'					}',
			'				}',
			'				return s',
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
			'// Softmax with the max-subtraction trick. Shift-invariance:',
			'// exp(x-m)/Σexp(xj-m) = exp(x)/Σexp(xj) exactly, so subtracting the',
			'// max changes nothing mathematically — but it pins the largest',
			'// exponent at exp(0)=1, so nothing overflows no matter how large the',
			'// logits. (Underflow of tiny terms to 0 is harmless: they contribute',
			'// ~nothing to the sum anyway.) Every real framework does exactly',
			'// this; PyTorch\'s logsumexp exists for the same reason.',
			'func Softmax(xs []float64) []float64 {',
			'	out := make([]float64, len(xs))',
			'	if len(xs) == 0 {',
			'		return out',
			'	}',
			'	max := xs[0]',
			'	for _, x := range xs {',
			'		if x > max {',
			'			max = x',
			'		}',
			'	}',
			'	sum := 0.0',
			'	for i, x := range xs {',
			'		out[i] = math.Exp(x - max)',
			'		sum += out[i]',
			'	}',
			'	// sum >= 1 always (the max entry contributes exp(0) = 1), so this',
			'	// division can never be by zero.',
			'	for i := range out {',
			'		out[i] /= sum',
			'	}',
			'	return out',
			'}',
			'',
			'// attendMasked is the shared core: Attention and CausalAttention are',
			'// the same computation with the mask toggled, so the algorithm lives',
			'// once. Masking happens on SCORES, before softmax: setting a score to',
			'// -1e9 makes exp(-1e9 - max) underflow to exactly 0.0 and the',
			'// surviving weights renormalize automatically. Zeroing weights after',
			'// softmax instead is the classic bug — rows stop summing to 1 and the',
			'// output leaks magnitude.',
			'func attendMasked(q, k, v [][]float64, causal bool) ([][]float64, [][]float64) {',
			'	n := len(q)',
			'	if n == 0 || len(k) == 0 || len(k[0]) == 0 || len(v) == 0 {',
			'		return [][]float64{}, [][]float64{}',
			'	}',
			'	// Scale by 1/√d_k: dot products of d-dim vectors have magnitude',
			'	// ~√d (variance adds across terms), and softmax saturates once',
			'	// scores exceed ~4-5. Without this, large d silently turns soft',
			'	// attention into a hard argmax — and kills gradients in training.',
			'	scale := 1.0 / math.Sqrt(float64(len(k[0])))',
			'	weights := make([][]float64, n)',
			'	out := make([][]float64, n)',
			'	for i := 0; i < n; i++ {',
			'		scores := make([]float64, len(k))',
			'		for j := range k {',
			'			dot := 0.0',
			'			for c := 0; c < len(q[i]) && c < len(k[j]); c++ {',
			'				dot += q[i][c] * k[j][c]',
			'			}',
			'			scores[j] = dot * scale',
			'			if causal && j > i {',
			'				scores[j] = -1e9',
			'			}',
			'		}',
			'		weights[i] = Softmax(scores)',
			'		// out[i] = weights[i] · V — a convex combination of value rows.',
			'		row := make([]float64, len(v[0]))',
			'		for j := range v {',
			'			for c := range v[j] {',
			'				row[c] += weights[i][j] * v[j][c]',
			'			}',
			'		}',
			'		out[i] = row',
			'	}',
			'	return out, weights',
			'}',
			'',
			'// Attention: every position may look everywhere (BERT-style,',
			'// bidirectional).',
			'func Attention(q, k, v [][]float64) ([][]float64, [][]float64) {',
			'	return attendMasked(q, k, v, false)',
			'}',
			'',
			'// CausalAttention: position i sees only j <= i (GPT-style). This mask',
			'// is what lets one forward pass train next-token prediction at EVERY',
			'// position simultaneously — each row is a valid "predict from prefix"',
			'// problem, which is the parallelism win over RNNs.',
			'func CausalAttention(q, k, v [][]float64) ([][]float64, [][]float64) {',
			'	return attendMasked(q, k, v, true)',
			'}',
			'',
			'// sliceCols copies a contiguous column range out of each row. Copies,',
			'// not subslices — heads must not alias each other\'s storage.',
			'func sliceCols(m [][]float64, lo, hi int) [][]float64 {',
			'	out := make([][]float64, len(m))',
			'	for i := range m {',
			'		out[i] = append([]float64{}, m[i][lo:hi]...)',
			'	}',
			'	return out',
			'}',
			'',
			'// MultiHead: split columns into nHeads bands, attend per band,',
			'// concatenate. Each head sees only headDim = dModel/nHeads columns,',
			'// so its scale is √headDim — running one head per subspace lets',
			'// different heads learn different relations (syntax here, coreference',
			'// there) at the SAME total cost as one full-width head: nHeads ×',
			'// (n² · headDim) = n² · dModel either way. The heads-for-free trade',
			'// is why every transformer uses them.',
			'func MultiHead(q, k, v [][]float64, nHeads int) [][]float64 {',
			'	if len(q) == 0 || nHeads <= 0 {',
			'		return [][]float64{}',
			'	}',
			'	dModel := len(q[0])',
			'	headDim := dModel / nHeads',
			'	out := make([][]float64, len(q))',
			'	for i := range out {',
			'		out[i] = make([]float64, 0, dModel)',
			'	}',
			'	for h := 0; h < nHeads; h++ {',
			'		lo, hi := h*headDim, (h+1)*headDim',
			'		headOut, _ := Attention(sliceCols(q, lo, hi), sliceCols(k, lo, hi), sliceCols(v, lo, hi))',
			'		for i := range headOut {',
			'			out[i] = append(out[i], headOut[i]...)',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the causal mask is the whole business model</h3>' +
			'<p>The mask looks like a correctness detail; it is actually the ' +
			'training-efficiency breakthrough. With causal masking, one forward ' +
			'pass over a 1,000-token document is simultaneously 1,000 supervised ' +
			'examples — position i predicts token i+1 using exactly the prefix it ' +
			'would see at inference. An RNN gets the same examples but must ' +
			'process them <em>sequentially</em> through a bottleneck state; ' +
			'attention computes all rows as one matrix multiply on hardware built ' +
			'for matrix multiplies. &ldquo;Parallel training over trillions of ' +
			'tokens&rdquo; is the direct consequence of masking scores instead of ' +
			'recurring through time — that, more than any accuracy claim, is why ' +
			'transformers replaced LSTMs in about two years.</p>' +
			'<h3>The KV cache: attention economics at inference</h3>' +
			'<p>At generation time the picture inverts. Producing token n+1 needs ' +
			'the new query against <em>all previous</em> keys and values — which ' +
			'never change once computed. So inference servers cache K and V per ' +
			'position: each new token costs one row of attention, not a full ' +
			'recompute. That cache is the dominant memory consumer in LLM serving ' +
			'(for a 70B-class model, easily gigabytes per long conversation), and ' +
			'it is why long-context pricing is superlinear, why ' +
			'&ldquo;context-window trimming&rdquo; exists, and what techniques ' +
			'like grouped-query attention (share K/V across head groups) and ' +
			'paged attention (vLLM&rsquo;s virtual-memory trick) are optimizing. ' +
			'When you read a model card boasting GQA, it is talking about ' +
			'shrinking the K/V tensors you just implemented.</p>' +
			'<h3>FlashAttention, and what to say in the interview</h3>' +
			'<p>Attention&rsquo;s n² cost is real but the modern bottleneck is ' +
			'memory traffic, not FLOPs: naively materializing the n×n weight ' +
			'matrix in GPU HBM is what hurts. FlashAttention computes the same ' +
			'exact softmax(QKᵀ/√d)V — no approximation — by tiling the ' +
			'computation through fast on-chip SRAM and using the <em>online ' +
			'softmax</em> trick (a running max and running sum, generalizing the ' +
			'max-subtraction you implemented) so the full weight matrix never ' +
			'exists in memory. Interviewers probe exactly the three details this ' +
			'item pinned: why √d (score variance grows with d; softmax ' +
			'saturates), why subtract the max (exp overflow; shift-invariance ' +
			'makes it free), and why mask before softmax (renormalization comes ' +
			'free; post-zeroing breaks the convex combination). You now hold the ' +
			'worked numbers for all three.</p>',
		],
		complexity: { time: 'O(n² · d) per attention call — n² query-key scores of d dims each; multi-head is the same total (nHeads × n² × d/nHeads)', space: 'O(n² + n·d) for the weight matrix and outputs' },
	});
})();
