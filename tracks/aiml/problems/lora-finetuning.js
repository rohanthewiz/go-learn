/* Fine-Tuning & LoRA — Applied AI (Medium). The arithmetic that made
 * fine-tuning affordable: keep W frozen, learn a rank-r update as two thin
 * matrices B·A scaled by alpha/r. The harness pins a worked 3x3 example with
 * r=1, the merged-equals-unmerged equivalence (THE property that gives LoRA
 * zero inference overhead), the rank-1 span (every input maps to the same
 * update direction), an r=2 case that catches hardcoded scaling, and the
 * parameter counts at 4096x4096 that explain the entire economics.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// Frozen base path plus the low-rank bypass. Ids suffixed AILORA —
	// every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 220" width="520" height="220" role="img" aria-label="LoRA: the input flows through the frozen weight matrix W and, in parallel, through a thin down-projection A and up-projection B; the bypass output is scaled by alpha over r and added to Wx">' +
		'<text x="20" y="22" class="lbl">LoRA: a thin trainable bypass around a frozen matrix</text>' +
		'<rect x="20" y="86" width="56" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="48" y="111" text-anchor="middle">x</text>' +
		// frozen main path
		'<path d="M 76 106 L 128 106" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAILORA)"/>' +
		'<rect x="130" y="66" width="120" height="80" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="190" y="102" text-anchor="middle">W (frozen)</text>' +
		'<text x="190" y="122" text-anchor="middle" class="lbl">d_out × d_in</text>' +
		'<path d="M 250 106 L 392 106" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAILORA)"/>' +
		// low-rank bypass
		'<path d="M 48 128 C 48 176 88 184 126 184" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAILORA)"/>' +
		'<rect x="128" y="168" width="74" height="32" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="165" y="189" text-anchor="middle">A  (r×d_in)</text>' +
		'<path d="M 202 184 L 240 184" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAILORA)"/>' +
		'<rect x="242" y="168" width="74" height="32" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="279" y="189" text-anchor="middle">B  (d_out×r)</text>' +
		'<path d="M 316 184 C 372 184 404 152 404 128" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAILORA)"/>' +
		'<text x="352" y="212" text-anchor="middle" class="lbl" style="fill:var(--warn)">× α/r — trainable: only 2·r·d values</text>' +
		// sum node
		'<circle cx="404" cy="106" r="14" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="404" y="111" text-anchor="middle">+</text>' +
		'<path d="M 418 106 L 458 106" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAILORA)"/>' +
		'<rect x="460" y="86" width="44" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="482" y="111" text-anchor="middle">y</text>' +
		'<text x="20" y="48" class="lbl">y = Wx + (α/r)·B(Ax) — and Merge folds the bypass into W′ = W + (α/r)·BA, so serving costs nothing extra</text>' +
		'<defs><marker id="dgArrowAILORA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'lora-finetuning',
		title: 'Fine-Tuning & LoRA',
		nav: 'LoRA',
		difficulty: 'Medium',
		category: 'Applied AI & Reinforcement Learning',
		task: 'Implement MatVec, LoRAForward (Wx + (alpha/r)·B(Ax)), Merge (fold BA into W), and the parameter-count arithmetic that makes LoRA ~0.4% of full fine-tuning.',

		prose: [
			'<h2>Fine-Tuning &amp; LoRA</h2>' +
			'<p>Your team wants the 7B model to follow the house answer format. ' +
			'Full fine-tuning updates all 7 billion weights: with Adam’s two ' +
			'optimizer states that is ~84&nbsp;GB of GPU memory before the first ' +
			'batch, and every experiment checkpoint is another 28&nbsp;GB — per ' +
			'variant, per customer. The 2021 LoRA paper (Hu et al.) starts from ' +
			'an empirical observation: the <em>change</em> a fine-tune makes to a ' +
			'weight matrix has very low intrinsic rank — the task lives in a few ' +
			'directions, not in all d² of them. So freeze <code>W</code> and ' +
			'learn only a rank-<code>r</code> update factored as two thin ' +
			'matrices:</p>' +
			'<ul>' +
			'<li><strong>Shapes</strong> — for <code>W</code> of size ' +
			'<code>d_out × d_in</code>: <code>A</code> is <code>r × d_in</code> ' +
			'(the down-projection), <code>B</code> is <code>d_out × r</code> ' +
			'(the up-projection), with <code>r = rows(A)</code> tiny (1–64).</li>' +
			'<li><strong>Forward</strong> — <code>y = Wx + (α/r)·B(Ax)</code>. ' +
			'Compute the bypass as two thin mat-vecs — <code>Ax</code> first, ' +
			'then <code>B·(Ax)</code> — never by forming the d_out×d_in matrix ' +
			'<code>BA</code>. The <code>α/r</code> scale decouples the learning ' +
			'rate from the choice of <code>r</code>.</li>' +
			'<li><strong>Merge</strong> — since <code>B(Ax) = (BA)x</code>, the ' +
			'adapter folds into <code>W′ = W + (α/r)·BA</code> once training is ' +
			'done. Merged and unmerged forwards are <em>identical</em>, so ' +
			'serving a LoRA-tuned model costs exactly what the base model ' +
			'costs.</li>' +
			'<li><strong>The economics</strong> — a 4096×4096 attention matrix ' +
			'has 16,777,216 weights; its r=8 adapter has ' +
			'<code>8·4096 + 4096·8 = 65,536</code> — about 0.4%.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>Worked example — 3×3, r=1, α=2 (so α/r = 2):</p>',
			{ lang: 'txt', code: 'W = [1 0 2]   A = [0.5 -1 0.25]   B = [ 2.0]   x = [1 2 3]\n    [0 1 1]       (1×3)             [ 0.4]\n    [2 1 0]                         [-1.0]  (3×1)\n\nWx        = [7 5 4]\nAx        = 0.5·1 − 1·2 + 0.25·3 = −0.75          (a single number: r=1)\n(α/r)B·Ax = 2 · (−0.75) · [2 0.4 −1] = [−3 −0.6 1.5]\ny         = [4.0000 4.4000 5.5000]\n\nMerge: W′ = W + 2·B·A → W′x = [4.0000 4.4000 5.5000]   (identical)' },
			'<h3>Your job</h3>' +
			'<p>Implement <code>MatVec</code>, <code>LoRAForward</code>, ' +
			'<code>Merge</code>, and the bookkeeping trio ' +
			'<code>LoRAParams</code> / <code>FullParams</code> / ' +
			'<code>SavingsRatio</code>. One honest simplification: real LoRA ' +
			'<em>trains</em> <code>A</code> and <code>B</code> by gradient ' +
			'descent (<code>A</code> starts random, <code>B</code> starts at ' +
			'zero so the model is initially unchanged); here the adapter ' +
			'weights are given and you build the forward/merge arithmetic those ' +
			'gradients flow through.</p>' +
			'<div class="tip">Rank is a budget on <em>directions</em>, not on ' +
			'magnitude: with r=1, every input x — whatever it is — produces an ' +
			'update <code>(α/r)·B·(Ax)</code> that points along the single ' +
			'column of B, only scaled by the number <code>Ax</code>. The ' +
			'adapter can say “push outputs toward this one direction, more or ' +
			'less depending on the input” — and stacking r such directions is ' +
			'exactly what higher rank buys.</div>',
		],

		starter: [
			'package main',
			'',
			'// MatVec returns W·x for a row-major matrix W (len(W) rows). Sum',
			'// each row against x, reading only the overlapping length if a row',
			'// and x disagree (defensive — never index past either).',
			'func MatVec(W [][]float64, x []float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// LoRAForward computes the adapted layer output',
			'//',
			'//	y = W·x + (alpha/r) · B·(A·x)',
			'//',
			'// where r = len(A), A is r × d_in (down-projection), and B is',
			'// d_out × r (up-projection). Compute the bypass as two thin',
			'// mat-vecs (A·x, then B·that) — never materialize B·A here.',
			'// If r == 0 the bypass is absent: return W·x unchanged (guard the',
			'// alpha/r division).',
			'func LoRAForward(W, A, B [][]float64, alpha float64, x []float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Merge folds the adapter into the base weights, returning the NEW',
			'// matrix',
			'//',
			'//	W\' = W + (alpha/r) · B·A',
			'//',
			'// with (B·A)[i][j] = sum_k B[i][k]·A[k][j] and r = len(A). W must',
			'// NOT be modified — return a fresh matrix (r == 0 returns a copy',
			'// of W).',
			'func Merge(W, A, B [][]float64, alpha float64) [][]float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// LoRAParams counts trainable adapter parameters for a d_out x d_in',
			'// layer at rank r: r*dIn (for A) + dOut*r (for B).',
			'func LoRAParams(dOut, dIn, r int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// FullParams counts the parameters full fine-tuning would touch on',
			'// the same layer: dOut*dIn.',
			'func FullParams(dOut, dIn int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// SavingsRatio = LoRAParams / FullParams as a float64 (0.0 if the',
			'// full count is zero — guard the division).',
			'func SavingsRatio(dOut, dIn, r int) float64 {',
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
			'	// The worked 3x3 example from the prose: frozen W, a rank-1',
			'	// adapter (A: 1x3 down, B: 3x1 up), alpha=2.',
			'	W := [][]float64{{1, 0, 2}, {0, 1, 1}, {2, 1, 0}}',
			'	A := [][]float64{{0.5, -1, 0.25}}',
			'	B := [][]float64{{2}, {0.4}, {-1}}',
			'	x := []float64{1, 2, 3}',
			'	vecf := func(xs []float64) string {',
			'		s := "["',
			'		for i, v := range xs {',
			'			if i > 0 {',
			'				s += " "',
			'			}',
			'			s += fmt.Sprintf("%.4f", v)',
			'		}',
			'		return s + "]"',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"MatVec: the frozen path Wx of the worked example",',
			'			"[7.0000 5.0000 4.0000]",',
			'			func() string { return vecf(MatVec(W, x)) }},',
			'		{"LoRAForward r=1: Wx plus the scaled bypass (alpha/r)B(Ax)",',
			'			"[4.0000 4.4000 5.5000]",',
			'			func() string { return vecf(LoRAForward(W, A, B, 2.0, x)) }},',
			'		{"Merge folds the adapter into fresh weights W\' = W + (alpha/r)BA",',
			'			"row0=[3.0000 -4.0000 3.0000] row1=[0.4000 0.2000 1.2000] row2=[1.0000 3.0000 -0.5000]",',
			'			func() string {',
			'				m := Merge(W, A, B, 2.0)',
			'				if len(m) != 3 {',
			'					return fmt.Sprintf("rows=%d", len(m))',
			'				}',
			'				return fmt.Sprintf("row0=%s row1=%s row2=%s", vecf(m[0]), vecf(m[1]), vecf(m[2]))',
			'			}},',
			'		{"THE property: merged forward == unmerged forward (why serving LoRA costs nothing)",',
			'			"merged=[4.0000 4.4000 5.5000] equal=true",',
			'			func() string {',
			'				merged := vecf(MatVec(Merge(W, A, B, 2.0), x))',
			'				unmerged := vecf(LoRAForward(W, A, B, 2.0, x))',
			'				return fmt.Sprintf("merged=%s equal=%v", merged, unmerged == merged)',
			'			}},',
			'		{"Merge returns a NEW matrix: the frozen base W must be untouched afterwards",',
			'			"W[0]=[1.0000 0.0000 2.0000]",',
			'			func() string {',
			'				Merge(W, A, B, 2.0)',
			'				return fmt.Sprintf("W[0]=%s", vecf(W[0]))',
			'			}},',
			'		{"rank-1 span: two different inputs yield updates that are scalar multiples of B",',
			'			"ratios=[-1.5000 -1.5000 -1.5000]",',
			'			func() string {',
			'				x2 := []float64{1, 0, 0}',
			'				base1, base2 := MatVec(W, x), MatVec(W, x2)',
			'				out1 := LoRAForward(W, A, B, 2.0, x)',
			'				out2 := LoRAForward(W, A, B, 2.0, x2)',
			'				if len(base1) != 3 || len(base2) != 3 || len(out1) != 3 || len(out2) != 3 {',
			'					return "bad shapes"',
			'				}',
			'				ratios := make([]float64, 3)',
			'				for i := range ratios {',
			'					d1, d2 := out1[i]-base1[i], out2[i]-base2[i]',
			'					if d2 != 0 {',
			'						ratios[i] = d1 / d2',
			'					}',
			'				}',
			'				return "ratios=" + vecf(ratios)',
			'			}},',
			'		{"r=2 adapter: r comes from len(A) and the scale is alpha/r, not alpha",',
			'			"[9.0000 6.0000 7.0000]",',
			'			func() string {',
			'				A2 := [][]float64{{1, 0, 1}, {0, 1, 0}}',
			'				B2 := [][]float64{{1, 0}, {0, 1}, {1, 1}}',
			'				return vecf(LoRAForward(W, A2, B2, 1.0, x))',
			'			}},',
			'		{"the economics at 4096x4096, r=8: the adapter is ~0.4% of the layer",',
			'			"lora=65536 full=16777216 ratio=0.0039",',
			'			func() string {',
			'				return fmt.Sprintf("lora=%d full=%d ratio=%.4f", LoRAParams(4096, 4096, 8), FullParams(4096, 4096), SavingsRatio(4096, 4096, 8))',
			'			}},',
			'		{"rank buys capacity linearly: r=64 is 8x the parameters of r=8, still ~3%",',
			'			"lora=524288 ratio=0.0312",',
			'			func() string {',
			'				return fmt.Sprintf("lora=%d ratio=%.4f", LoRAParams(4096, 4096, 64), SavingsRatio(4096, 4096, 64))',
			'			}},',
			'		{"sanity at toy scale: the 3x3 r=1 adapter is 6 numbers vs 9 in W",',
			'			"lora=6 full=9",',
			'			func() string { return fmt.Sprintf("lora=%d full=%d", LoRAParams(3, 3, 1), FullParams(3, 3)) }},',
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
			'// MatVec: one dot product per row. The min-length guard makes the',
			'// routine total (no panic on ragged input) — a deliberate contract',
			'// so shape bugs surface as wrong numbers in tests rather than as',
			'// crashes in a serving path.',
			'func MatVec(W [][]float64, x []float64) []float64 {',
			'	out := make([]float64, len(W))',
			'	for i, row := range W {',
			'		s := 0.0',
			'		n := len(row)',
			'		if len(x) < n {',
			'			n = len(x)',
			'		}',
			'		for j := 0; j < n; j++ {',
			'			s += row[j] * x[j]',
			'		}',
			'		out[i] = s',
			'	}',
			'	return out',
			'}',
			'',
			'// LoRAForward: the order of operations IS the memory saving. B(Ax)',
			'// costs r*dIn + dOut*r multiplies; forming (BA)x would first build',
			'// a dOut x dIn matrix — the very thing LoRA exists to avoid',
			'// materializing. During training this same associativity keeps the',
			'// gradient computation thin.',
			'func LoRAForward(W, A, B [][]float64, alpha float64, x []float64) []float64 {',
			'	base := MatVec(W, x)',
			'	r := len(A)',
			'	if r == 0 {',
			'		return base // no adapter: guard the alpha/r division',
			'	}',
			'	// alpha/r decouples tuning from rank: doubling r halves each',
			'	// direction\'s scale, so a learning rate tuned at r=8 still',
			'	// behaves at r=64 (the LoRA paper\'s stated reason for the term).',
			'	scale := alpha / float64(r)',
			'	ax := MatVec(A, x)   // down-project: d_in -> r',
			'	bax := MatVec(B, ax) // up-project:   r -> d_out',
			'	for i := range base {',
			'		if i < len(bax) {',
			'			base[i] += scale * bax[i]',
			'		}',
			'	}',
			'	return base',
			'}',
			'',
			'// Merge materializes BA exactly once, at deploy time, where the',
			'// dOut x dIn cost is paid once instead of per token. Deep-copying',
			'// W first matters: the base model is SHARED by every adapter, and',
			'// mutating it in place would corrupt every other tenant\'s merge —',
			'// the aliasing bug the harness checks for explicitly.',
			'func Merge(W, A, B [][]float64, alpha float64) [][]float64 {',
			'	out := make([][]float64, len(W))',
			'	for i := range W {',
			'		out[i] = append([]float64(nil), W[i]...)',
			'	}',
			'	r := len(A)',
			'	if r == 0 {',
			'		return out',
			'	}',
			'	scale := alpha / float64(r)',
			'	for i := range out {',
			'		for j := range out[i] {',
			'			// (BA)[i][j]: row i of B against column j of A. Guard',
			'			// both index directions so ragged adapters cannot panic.',
			'			s := 0.0',
			'			for k := 0; k < r; k++ {',
			'				if i < len(B) && k < len(B[i]) && j < len(A[k]) {',
			'					s += B[i][k] * A[k][j]',
			'				}',
			'			}',
			'			out[i][j] += scale * s',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// LoRAParams: A holds r*dIn numbers, B holds dOut*r. Linear in r —',
			'// which is why rank is THE capacity/cost dial of a LoRA run.',
			'func LoRAParams(dOut, dIn, r int) int {',
			'	return r*dIn + dOut*r',
			'}',
			'',
			'// FullParams: what full fine-tuning updates (and what Adam keeps',
			'// TWO extra states for — the real memory killer).',
			'func FullParams(dOut, dIn int) int {',
			'	return dOut * dIn',
			'}',
			'',
			'// SavingsRatio: the headline number. At 4096x4096 r=8 this is',
			'// 65536/16777216 = 0.0039 — the "train 0.4% of the weights" pitch.',
			'func SavingsRatio(dOut, dIn, r int) float64 {',
			'	full := FullParams(dOut, dIn)',
			'	if full == 0 {',
			'		return 0',
			'	}',
			'	return float64(LoRAParams(dOut, dIn, r)) / float64(full)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why low rank is enough</h3>' +
			'<p>The bet underneath LoRA was measured before it was exploited: ' +
			'Aghajanyan et al. (2020) showed that fine-tuning a pretrained model ' +
			'succeeds even when the update is confined to a random subspace of ' +
			'startlingly low dimension — the <em>task</em> is low-dimensional ' +
			'even though the model is not. Pretraining already built the ' +
			'features; adaptation mostly re-weights and re-routes them, and ' +
			're-routing is a few directions per matrix. That is also LoRA’s ' +
			'failure boundary: teaching format, tone, tool protocols, or a ' +
			'domain’s phrasing works at r=8–64, but forcing genuinely new ' +
			'knowledge or a new language into an adapter fights the hypothesis ' +
			'itself — the update you need stops being low-rank (which is why ' +
			'the previous item’s RAG, not fine-tuning, is the default for ' +
			'knowledge).</p>' +
			'<h3>Where it attaches, and what it costs in practice</h3>' +
			'<p>In a transformer, adapters attach to the attention projections — ' +
			'the W<sub>q</sub>/W<sub>v</sub> matrices you met in the attention ' +
			'item (the original paper’s ablation found q and v the best ' +
			'value-per-parameter; many modern recipes adapt all four plus the ' +
			'FFN). Training memory collapses for two compounding reasons: 99.6% ' +
			'of gradients are never computed, and Adam’s two per-parameter ' +
			'moment tensors (the <em>optimizers</em> item) exist only for the ' +
			'adapter. <strong>QLoRA</strong> (2023) pushes further — freeze the ' +
			'base in 4-bit quantization and train fp16 adapters on top — putting ' +
			'a 65B fine-tune on one 48&nbsp;GB card. And because ' +
			'<code>Merge</code> is exact (your harness property), you can ship ' +
			'either a merged checkpoint with zero serving overhead, or keep ' +
			'adapters unmerged and hot-swap them per request — one frozen base ' +
			'serving hundreds of per-customer fine-tunes, each a ~50&nbsp;MB ' +
			'file. That multi-tenant pattern is why the base must never be ' +
			'mutated in place: the aliasing bug your harness catches corrupts ' +
			'every tenant at once.</p>' +
			'<h3>The adaptation decision table</h3>' +
			'<p>The choices, in the order a team should try them: ' +
			'<strong>prompting</strong> (zero training, bounded by context and ' +
			'instruction-following) → <strong>RAG</strong> (fresh, citable ' +
			'knowledge; no behavior change) → <strong>LoRA</strong> (behavior, ' +
			'style, format at ~0.4% of the parameters) → <strong>full ' +
			'fine-tuning</strong> (maximum capacity; maximum cost, and maximum ' +
			'exposure to <em>catastrophic forgetting</em> — gradient descent on ' +
			'the new task happily overwrites capabilities the old data no ' +
			'longer defends). LoRA’s frozen base is itself a hedge against ' +
			'forgetting: the pretrained weights are untouched by construction, ' +
			'and turning the adapter off restores the original model exactly. ' +
			'In the HuggingFace ecosystem all of this is the <code>peft</code> ' +
			'library — <code>LoraConfig(r=8, lora_alpha=16, ' +
			'target_modules=["q_proj","v_proj"])</code> — and the arithmetic it ' +
			'wires into each layer is precisely the three functions you just ' +
			'wrote.</p>',
		],
		complexity: { time: 'LoRAForward: O(dOut·dIn + r·(dIn + dOut)) — the frozen path dominates; Merge: O(dOut·dIn·r), paid once at deploy', space: 'O(r·(dIn + dOut)) extra for the adapter — the entire point' },
	});
})();
