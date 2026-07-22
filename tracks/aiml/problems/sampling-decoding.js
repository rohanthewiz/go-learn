/* Decoding: Temperature, Top-k, Top-p — Transformers & LLMs (Medium). The
 * model only ever produces logits; every visible "personality" difference
 * between a rambling bot and a precise one is the decoder. The harness pins a
 * worked 6-token distribution end-to-end: greedy argmax with tie-break,
 * temperature sharpening/flattening, max-subtraction stability, top-k and
 * top-p filtering with renormalization, CDF sampling driven by a pinned LCG,
 * and a CTRL-style repetition penalty.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// The decoding pipeline: one distribution, reshaped by each knob in turn,
	// then collapsed to a single token by a uniform draw walking the CDF.
	// All ids suffixed AISD — every track's SVGs share the page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="decoding pipeline: logits divided by temperature, softmax, top-k or top-p filter, then a uniform draw walks the CDF to pick one token">' +
		'<text x="20" y="22" class="lbl">every decoding knob is a reshaping of ONE distribution</text>' +
		'<rect x="20" y="44" width="90" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="65" y="66" text-anchor="middle">logits</text>' +
		'<text x="65" y="82" text-anchor="middle" class="lbl">one per token</text>' +
		'<path d="M 110 66 L 138 66" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAISD)"/>' +
		'<rect x="140" y="44" width="110" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="195" y="66" text-anchor="middle">÷T → softmax</text>' +
		'<text x="195" y="82" text-anchor="middle" class="lbl">risk dial</text>' +
		'<path d="M 250 66 L 278 66" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAISD)"/>' +
		'<rect x="280" y="44" width="110" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="335" y="66" text-anchor="middle">top-k / top-p</text>' +
		'<text x="335" y="82" text-anchor="middle" class="lbl">cut the tail</text>' +
		'<path d="M 390 66 L 418 66" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAISD)"/>' +
		'<rect x="420" y="44" width="80" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="460" y="66" text-anchor="middle">sample</text>' +
		'<text x="460" y="82" text-anchor="middle" class="lbl">CDF walk</text>' +
		// CDF strip: buckets sized by probability, u landing in one of them
		'<rect x="60" y="128" width="66" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<rect x="126" y="128" width="15" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<rect x="141" y="128" width="179" height="26" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="320" y="128" width="54" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<rect x="374" y="128" width="108" height="26" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<text x="230" y="146" text-anchor="middle" class="lbl">p=0.4154</text>' +
		'<path d="M 168 108 L 168 124" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAISD)"/>' +
		'<text x="168" y="104" text-anchor="middle" class="lbl" style="fill:var(--warn)">u = 0.2523</text>' +
		'<text x="60" y="176" class="lbl">buckets are cumulative probability — the first bucket whose running sum exceeds u wins</text>' +
		'<defs><marker id="dgArrowAISD" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'sampling-decoding',
		title: 'Decoding: Temperature, Top-k, Top-p',
		nav: 'decoding',
		difficulty: 'Medium',
		category: 'Transformers & LLMs',
		task: 'Implement Greedy, SoftmaxT, TopKFilter, TopPFilter, SampleWithU (CDF walk), and RepetitionPenalty — the knobs between logits and text.',

		prose: [
			'<h2>Decoding: Temperature, Top-k, Top-p</h2>' +
			'<p>Your support bot ships on Monday. By Tuesday it answers every ' +
			'ticket with “Thank you for reaching out. Thank you for reaching out. ' +
			'Thank you for reaching out.” Nothing is wrong with the model — the ' +
			'<em>decoder</em> is greedy, and greedy decoding famously walks into ' +
			'repetition loops: once a phrase becomes likely, repeating it becomes ' +
			'<em>more</em> likely. The transformer (previous item) only ever emits ' +
			'<strong>logits</strong> — one raw score per vocabulary token, every ' +
			'step. Everything you recognize as the “temperature” slider or ' +
			'<code>top_p</code> in an API call happens after the model is done, in ' +
			'a few dozen lines of arithmetic you can own completely:</p>' +
			'<ul>' +
			'<li><strong>Greedy</strong> — take the argmax. Deterministic, ' +
			'sensible for extraction, deadly for open-ended text (tie → lowest ' +
			'index).</li>' +
			'<li><strong>Temperature</strong> — divide logits by <code>T</code> ' +
			'before softmax: <code>p_i = exp((l_i − max)/T) / Σ exp((l_j − ' +
			'max)/T)</code>. <code>T&lt;1</code> sharpens the mode, ' +
			'<code>T&gt;1</code> flattens toward uniform; as <code>T→0</code> the ' +
			'distribution approaches one-hot argmax. Subtracting the max first ' +
			'changes nothing mathematically (it cancels in the ratio) but keeps ' +
			'<code>exp</code> finite — logits of 1000 overflow ' +
			'<code>float64</code> without it.</li>' +
			'<li><strong>Top-k</strong> — keep only the <code>k</code> most ' +
			'probable tokens, zero the rest, renormalize the kept mass to 1.</li>' +
			'<li><strong>Top-p (nucleus)</strong> — sort descending, keep the ' +
			'smallest prefix whose cumulative probability reaches <code>p</code>, ' +
			'renormalize. Unlike top-k, the kept set <em>resizes with the ' +
			'model’s confidence</em>.</li>' +
			'<li><strong>Sampling</strong> — a uniform draw <code>u ∈ [0,1)</code> ' +
			'walks the CDF in index order; the first bucket whose running sum ' +
			'exceeds <code>u</code> is the token.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>Worked example — a 6-token toy vocabulary after the prompt ' +
			'“the cat”:</p>',
			{ lang: 'txt', code: 'vocab:  0:the   1:cat   2:sat   3:on    4:mat   5:dog\nlogits: [1.0   -0.5    2.0    0.8    1.5   -1.0]\nT=1.0:  [0.1528 0.0341 0.4154 0.1251 0.2519 0.0207]\nT=0.5:  max p = 0.6238   (sharper — the mode dominates)\nT=2.0:  max p = 0.2904   (flatter — more risk)\nCDF:     0.1528 0.1869 0.6023 0.7274 0.9793 1.0000\nu=0.2523 → first cum > u is index 2 → "sat"' },
			'<h3>Your job</h3>' +
			'<p>Implement the whole pipeline: <code>Greedy</code>, ' +
			'<code>SoftmaxT</code>, <code>TopKFilter</code>, ' +
			'<code>TopPFilter</code>, <code>SampleWithU</code>, and a CTRL-style ' +
			'<code>RepetitionPenalty</code>. The harness supplies every uniform ' +
			'draw <code>u</code> from a pinned LCG, so each test has exactly one ' +
			'right answer. Real decoders do this over ~100k logits with the knobs ' +
			'chained in a fixed order (penalties → temperature → top-k → top-p → ' +
			'sample); here the vocabulary is 6 and each knob is tested in ' +
			'isolation so the arithmetic stays legible.</p>' +
			'<div class="tip">Top-k asks “how many candidates?” — a fixed-size ' +
			'club regardless of confidence. Top-p asks “how much probability ' +
			'mass?” — when the model is sure, the nucleus shrinks to one token; ' +
			'when it is torn, the nucleus widens. That adaptivity is why nucleus ' +
			'sampling (Holtzman 2019) displaced plain top-k almost everywhere.</div>',
		],

		starter: [
			'package main',
			'',
			'// Greedy returns the index of the largest logit — deterministic',
			'// argmax decoding. Ties break to the LOWEST index. An empty slice',
			'// returns 0 (guard, not exercised by the tests).',
			'func Greedy(logits []float64) int {',
			'	// your code here',
			'	return -1',
			'}',
			'',
			'// SoftmaxT converts logits to probabilities at temperature T:',
			'//',
			'//	p_i = exp((l_i - max)/T) / sum_j exp((l_j - max)/T)',
			'//',
			'// Subtract the maximum logit BEFORE exponentiating: it cancels in',
			'// the ratio, but without it exp(1000) overflows float64 to +Inf.',
			'// The caller guarantees T > 0 (the T->0 one-hot limit is reached by',
			'// passing a small T like 0.01, never by dividing by zero).',
			'// Returns a new slice; an empty input returns an empty slice.',
			'func SoftmaxT(logits []float64, T float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// TopKFilter keeps the k highest-probability entries (equal probs:',
			'// the LOWER index is kept first), zeroes the rest, and renormalizes',
			'// the kept entries so they sum to 1. k is clamped to [1, len(probs)].',
			'// Returns a new slice; probs is not modified.',
			'func TopKFilter(probs []float64, k int) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// TopPFilter (nucleus sampling) keeps the smallest set of tokens',
			'// whose probabilities sum to at least p: consider entries in',
			'// descending probability order (equal probs: lower index first),',
			'// accumulate until the running sum reaches >= p, keep exactly those,',
			'// zero the rest, renormalize the kept mass to 1.',
			'// Returns a new slice; probs is not modified.',
			'func TopPFilter(probs []float64, p float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// SampleWithU maps a uniform draw u in [0,1) to a token index: walk',
			'// the CDF in index order and return the FIRST index where the',
			'// running sum strictly exceeds u (cum > u). If float rounding leaves',
			'// u unclaimed after the loop, return the last index.',
			'func SampleWithU(probs []float64, u float64) int {',
			'	// your code here',
			'	return -1',
			'}',
			'',
			'// RepetitionPenalty (CTRL-style, Keskar 2019) discourages tokens',
			'// already generated: for each id listed in seen (applied once per',
			'// listed id; out-of-range ids ignored), divide the logit by penalty',
			'// if it is positive, multiply by penalty if it is <= 0 — both push',
			'// the score DOWN for penalty > 1. Returns a new slice.',
			'func RepetitionPenalty(logits []float64, seen []int, penalty float64) []float64 {',
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
			'	// The worked 6-token distribution from the prose: the model has',
			'	// just seen "the cat" and clearly favors token 2 ("sat").',
			'	logits := []float64{1.0, -0.5, 2.0, 0.8, 1.5, -1.0}',
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
			'	maxOf := func(xs []float64) float64 {',
			'		m := 0.0',
			'		for _, v := range xs {',
			'			if v > m {',
			'				m = v',
			'			}',
			'		}',
			'		return m',
			'	}',
			'	countKept := func(xs []float64) int {',
			'		n := 0',
			'		for _, v := range xs {',
			'			if v > 0 {',
			'				n++',
			'			}',
			'		}',
			'		return n',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"greedy is argmax, and equal logits break to the LOWEST index",',
			'			"argmax=2 tie=1",',
			'			func() string {',
			'				return fmt.Sprintf("argmax=%d tie=%d", Greedy(logits), Greedy([]float64{1.5, 3.0, 3.0, 0.2}))',
			'			}},',
			'		{"softmax at T=1 over the worked logits (the prose table row)",',
			'			"[0.1528 0.0341 0.4154 0.1251 0.2519 0.0207]",',
			'			func() string { return vecf(SoftmaxT(logits, 1.0)) }},',
			'		{"temperature is a risk dial: T=0.5 sharpens, T=2 flattens, T=0.01 is argmax",',
			'			"T=0.5 max=0.6238 T=2.0 max=0.2904 T=0.01 max=1.0000",',
			'			func() string {',
			'				return fmt.Sprintf("T=0.5 max=%.4f T=2.0 max=%.4f T=0.01 max=%.4f",',
			'					maxOf(SoftmaxT(logits, 0.5)), maxOf(SoftmaxT(logits, 2.0)), maxOf(SoftmaxT(logits, 0.01)))',
			'			}},',
			'		{"stability: logits {1000,999,998} must equal shifted {2,1,0} — subtract the max before exp",',
			'			"[0.6652 0.2447 0.0900] shiftInvariant=true",',
			'			func() string {',
			'				big := vecf(SoftmaxT([]float64{1000, 999, 998}, 1.0))',
			'				small := vecf(SoftmaxT([]float64{2, 1, 0}, 1.0))',
			'				return fmt.Sprintf("%s shiftInvariant=%v", big, big == small)',
			'			}},',
			'		{"top-k keeps the k best and RENORMALIZES the kept mass to 1",',
			'			"[0.1863 0.0000 0.5065 0.0000 0.3072 0.0000]",',
			'			func() string { return vecf(TopKFilter(SoftmaxT(logits, 1.0), 3)) }},',
			'		{"top-k tie at the boundary: equal probs keep the lower index",',
			'			"[0.3750 0.2500 0.0000 0.3750]",',
			'			func() string { return vecf(TopKFilter([]float64{0.3, 0.2, 0.2, 0.3}, 3)) }},',
			'		{"top-p adapts: same p=0.8 keeps 1 token of a peaked dist but 5 of a flat one",',
			'			"peaked=1 flat=5 flatProb=0.2000",',
			'			func() string {',
			'				peaked := TopPFilter([]float64{0.90, 0.04, 0.03, 0.02, 0.007, 0.003}, 0.8)',
			'				u := 1.0 / 6.0',
			'				flat := TopPFilter([]float64{u, u, u, u, u, u}, 0.8)',
			'				return fmt.Sprintf("peaked=%d flat=%d flatProb=%.4f", countKept(peaked), countKept(flat), maxOf(flat))',
			'			}},',
			'		{"pinned-LCG sampling: three uniform draws walk the CDF to pinned tokens",',
			'			"u=0.2523->2 u=0.0881->0 u=0.5773->2",',
			'			func() string {',
			'				probs := SoftmaxT(logits, 1.0)',
			'				// lcg is a tiny deterministic PRNG so every run pins the same answer.',
			'				state := uint32(42)',
			'				out := ""',
			'				for i := 0; i < 3; i++ {',
			'					state = state*1664525 + 1013904223',
			'					u := float64(state) / 4294967296.0',
			'					if i > 0 {',
			'						out += " "',
			'					}',
			'					out += fmt.Sprintf("u=%.4f->%d", u, SampleWithU(probs, u))',
			'				}',
			'				return out',
			'			}},',
			'		{"property: softmax output is a distribution — it sums to 1.0000 at any T",',
			'			"sum=1.0000",',
			'			func() string {',
			'				sum := 0.0',
			'				for _, v := range SoftmaxT(logits, 2.0) {',
			'					sum += v',
			'				}',
			'				return fmt.Sprintf("sum=%.4f", sum)',
			'			}},',
			'		{"repetition penalty: dividing the repeated token 2 by 1.5 dethrones it",',
			'			"before=2 after=4 penalized[2]=1.3333",',
			'			func() string {',
			'				pen := RepetitionPenalty(logits, []int{2}, 1.5)',
			'				p2 := 0.0',
			'				if len(pen) > 2 {',
			'					p2 = pen[2]',
			'				}',
			'				return fmt.Sprintf("before=%d after=%d penalized[2]=%.4f", Greedy(logits), Greedy(pen), p2)',
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
			'import (',
			'	"math"',
			'	"sort"',
			')',
			'',
			'// Greedy is plain argmax. Scanning left to right and replacing only',
			'// on a STRICTLY greater value gives the tie rule (lowest index wins)',
			'// for free — no special-casing.',
			'func Greedy(logits []float64) int {',
			'	if len(logits) == 0 {',
			'		return 0',
			'	}',
			'	best := 0',
			'	for i := 1; i < len(logits); i++ {',
			'		if logits[i] > logits[best] {',
			'			best = i',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
			'// SoftmaxT: divide by temperature, exponentiate, normalize. The max',
			'// subtraction is the classic numerical-stability trick — softmax is',
			'// shift-invariant (a common factor exp(-max/T) cancels top and',
			'// bottom), so we may translate the logits to put the largest at 0.',
			'// After the shift every exponent is <= 0, so exp() lands in (0, 1]',
			'// and can never overflow, no matter how large the raw logits were.',
			'func SoftmaxT(logits []float64, T float64) []float64 {',
			'	out := make([]float64, len(logits))',
			'	if len(logits) == 0 {',
			'		return out',
			'	}',
			'	m := logits[0]',
			'	for _, v := range logits {',
			'		if v > m {',
			'			m = v',
			'		}',
			'	}',
			'	sum := 0.0',
			'	for i, v := range logits {',
			'		e := math.Exp((v - m) / T)',
			'		out[i] = e',
			'		sum += e',
			'	}',
			'	// sum >= 1 always: the max-logit entry contributes exp(0) = 1,',
			'	// so this division needs no zero guard.',
			'	for i := range out {',
			'		out[i] /= sum',
			'	}',
			'	return out',
			'}',
			'',
			'// rankByProb returns indices sorted by (probability desc, index asc).',
			'// Shared by both filters: top-k and top-p differ only in WHERE they',
			'// cut this ranking — after k entries, or after p cumulative mass.',
			'// SliceStable + strict > comparison preserves index order among',
			'// equals, which IS the documented tie rule.',
			'func rankByProb(probs []float64) []int {',
			'	idx := make([]int, len(probs))',
			'	for i := range idx {',
			'		idx[i] = i',
			'	}',
			'	sort.SliceStable(idx, func(a, b int) bool {',
			'		return probs[idx[a]] > probs[idx[b]]',
			'	})',
			'	return idx',
			'}',
			'',
			'// renormKept divides the kept entries (nonzero slots of out) by',
			'// their total, restoring a proper distribution. Filtering without',
			'// renormalizing is the classic bug: the CDF walk then never reaches',
			'// some u values and sampling silently biases toward the last token.',
			'func renormKept(out []float64, kept float64) []float64 {',
			'	if kept > 0 {',
			'		for i := range out {',
			'			out[i] /= kept',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// TopKFilter: rank, keep the first k, zero the rest, renormalize.',
			'func TopKFilter(probs []float64, k int) []float64 {',
			'	if k < 1 {',
			'		k = 1',
			'	}',
			'	if k > len(probs) {',
			'		k = len(probs)',
			'	}',
			'	out := make([]float64, len(probs))',
			'	kept := 0.0',
			'	for _, i := range rankByProb(probs)[:k] {',
			'		out[i] = probs[i]',
			'		kept += probs[i]',
			'	}',
			'	return renormKept(out, kept)',
			'}',
			'',
			'// TopPFilter: walk the same ranking, but stop after cumulative mass',
			'// reaches p. The >= (not >) matters: a single token holding exactly',
			'// p of the mass satisfies the nucleus on its own. Note the kept SET',
			'// SIZE is decided by the distribution, not by the caller — that',
			'// adaptivity is the whole point of nucleus sampling.',
			'func TopPFilter(probs []float64, p float64) []float64 {',
			'	out := make([]float64, len(probs))',
			'	cum := 0.0',
			'	kept := 0.0',
			'	for _, i := range rankByProb(probs) {',
			'		out[i] = probs[i]',
			'		cum += probs[i]',
			'		kept += probs[i]',
			'		if cum >= p {',
			'			break',
			'		}',
			'	}',
			'	return renormKept(out, kept)',
			'}',
			'',
			'// SampleWithU is inverse-CDF sampling: partition [0,1) into buckets',
			'// sized by the probabilities, in index order, and report which',
			'// bucket u falls into. Strict cum > u makes bucket i own the',
			'// half-open interval [cdf(i-1), cdf(i)) — consistent with u drawn',
			'// from [0,1). The fallback return covers float rounding leaving the',
			'// final cumulative sum a hair below u (e.g. 0.99999999 vs u=1-eps).',
			'func SampleWithU(probs []float64, u float64) int {',
			'	cum := 0.0',
			'	for i, p := range probs {',
			'		cum += p',
			'		if cum > u {',
			'			return i',
			'		}',
			'	}',
			'	return len(probs) - 1',
			'}',
			'',
			'// RepetitionPenalty divides positive logits and multiplies negative',
			'// ones — the asymmetry is deliberate (from the CTRL paper): both',
			'// branches move the score DOWN for penalty > 1. Dividing a negative',
			'// logit would push it UP, rewarding repetition of unlikely tokens.',
			'func RepetitionPenalty(logits []float64, seen []int, penalty float64) []float64 {',
			'	out := append([]float64(nil), logits...)',
			'	for _, id := range seen {',
			'		if id < 0 || id >= len(out) {',
			'			continue',
			'		}',
			'		if out[id] > 0 {',
			'			out[id] /= penalty',
			'		} else {',
			'			out[id] *= penalty',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why greedy loops, precisely</h3>' +
			'<p>Holtzman et al. (“The Curious Case of Neural Text Degeneration”, ' +
			'2019) measured it: maximum-likelihood decoding from a language model ' +
			'produces text far <em>more</em> probable than human text — humans ' +
			'constantly say surprising things — and the failure mode is a ' +
			'positive-feedback loop where a repeated phrase raises its own ' +
			'probability of appearing again. Beam search (keeping the B best ' +
			'partial sequences instead of 1) makes this <em>worse</em> for open ' +
			'text, which is why it survives in machine translation and speech ' +
			'recognition — short outputs with a strong notion of a correct ' +
			'answer — but no chat model uses it. Chat models sample, then use ' +
			'the knobs you built to control the risk.</p>' +
			'<h3>The knobs in production</h3>' +
			'<p>The parameters in every LLM API map one-to-one onto this item: ' +
			'<code>temperature</code> is your <code>SoftmaxT</code> divisor ' +
			'(≈0 for extraction and code-fix tasks, 0.7–1.0 for creative chat); ' +
			'<code>top_p</code> is your <code>TopPFilter</code>; ' +
			'<code>top_k</code> survives mostly in open-source stacks; ' +
			'<code>frequency_penalty</code> and <code>presence_penalty</code> are ' +
			'additive cousins of your multiplicative <code>RepetitionPenalty</code> ' +
			'(subtract <code>count·f + present·p</code> from the logit rather ' +
			'than dividing). HuggingFace’s <code>model.generate()</code> chains ' +
			'them as <code>LogitsProcessor</code>s in a pinned order — penalties ' +
			'first, then temperature, then top-k, then top-p, then the ' +
			'multinomial draw — exactly the pipeline in the diagram, just over ' +
			'a ~50k–200k-entry logit vector on the GPU. vLLM and friends do the ' +
			'same per-request inside a batch.</p>' +
			'<h3>Numerics you now own</h3>' +
			'<p>Two details in your implementation are load-bearing at scale. ' +
			'The max-subtraction in softmax is not optional: real logits reach ' +
			'magnitudes where naive <code>exp</code> returns <code>+Inf</code> ' +
			'and the whole distribution becomes <code>NaN</code> — every serious ' +
			'framework subtracts the max (or fuses it into a log-sum-exp). And ' +
			'renormalizing after filtering is where hand-rolled samplers go ' +
			'wrong: skip it and your CDF tops out below 1, so large <code>u</code> ' +
			'draws silently hit the fallback branch and over-select whatever ' +
			'token happens to sit last — a bias no unit test on “does it return ' +
			'a valid index” will ever catch.</p>' +
			'<h3>Beyond one token at a time</h3>' +
			'<p>Decoding is also where inference performance lives. ' +
			'<strong>Speculative decoding</strong> lets a small draft model ' +
			'propose several tokens which the big model verifies in one forward ' +
			'pass — accepted drafts are provably distributed exactly as if the ' +
			'big model had sampled them, so you get 2–3× speedups with zero ' +
			'quality change. Constrained decoding (JSON mode, grammar-guided ' +
			'generation) works by masking logits to −∞ for tokens that would ' +
			'violate the grammar — your <code>TopKFilter</code> zeroing is the ' +
			'same move with a different mask. Once you see decoding as “reshape ' +
			'the distribution, then draw,” every one of these techniques is a ' +
			'one-line variation.</p>',
		],
		complexity: { time: 'O(n log n) per filtered step (the rank sort dominates; softmax and the CDF walk are O(n))', space: 'O(n) — each knob returns a fresh distribution' },
	});
})();
