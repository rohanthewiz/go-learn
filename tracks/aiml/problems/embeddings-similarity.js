/* Embeddings & Vector Similarity — Transformers & LLMs (Medium). Meaning as
 * geometry: cosine similarity, nearest neighbors, and the king−man+woman
 * arithmetic — on a hand-crafted 10-word × 4-dim embedding table whose two
 * analogy families (royalty/gender, country/capital) resolve exactly. The
 * harness pins the dot-vs-cosine disagreement (a long vector wins raw dot,
 * loses cosine) and an exact-tie alphabetical ranking case.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// Two vectors, same direction, different length: dot product rewards
	// length, cosine measures only angle. Marker id namespaced (dgArrowAIEMB)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="two vectors at a small angle and one long vector at a wide angle: dot product prefers the long vector, cosine prefers the aligned one">' +
		'<text x="20" y="24" class="lbl">dot product rewards LENGTH — cosine measures only ANGLE</text>' +
		'<line x1="60" y1="170" x2="500" y2="170" stroke="var(--fg-dim,#888)" stroke-width="1" opacity="0.4"/>' +
		'<line x1="60" y1="170" x2="60" y2="40" stroke="var(--fg-dim,#888)" stroke-width="1" opacity="0.4"/>' +
		// query vector
		'<line x1="60" y1="170" x2="240" y2="70" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#dgArrowAIEMB)"/>' +
		'<text x="248" y="64" class="lbl" style="fill:var(--accent)">query (paris)</text>' +
		// aligned short vector
		'<line x1="60" y1="170" x2="195" y2="105" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIEMB)"/>' +
		'<text x="203" y="102" class="lbl">france — small angle, cosine wins</text>' +
		// long misaligned vector
		'<line x1="60" y1="170" x2="470" y2="140" stroke="var(--warn)" stroke-width="2.5" marker-end="url(#dgArrowAIEMBw)"/>' +
		'<text x="298" y="132" class="lbl" style="fill:var(--warn)">pizza — huge norm, wide angle: wins dot, loses cosine</text>' +
		'<text x="20" y="192" class="lbl">cos(a,b) = a·b / (‖a‖‖b‖): dividing by the norms strips length out of the comparison</text>' +
		'<defs>' +
		'<marker id="dgArrowAIEMB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowAIEMBw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'embeddings-similarity',
		title: 'Embeddings & Vector Similarity',
		nav: 'embeddings',
		difficulty: 'Medium',
		category: 'Transformers & LLMs',
		task: 'Implement dot product, norm, cosine similarity, top-k nearest neighbors, and vector analogy (king − man + woman) over an embedding table.',

		prose: [
			'<h2>Embeddings &amp; Vector Similarity</h2>' +
			'<p>Your product&rsquo;s search box matches substrings, so a user typing ' +
			'&ldquo;laptop won&rsquo;t start&rdquo; never finds the doc titled ' +
			'&ldquo;notebook fails to boot&rdquo; — zero shared words. The fix ' +
			'powering every modern search bar, RAG system, and recommender is to ' +
			'stop comparing <em>strings</em> and start comparing ' +
			'<strong>embeddings</strong>: each text becomes a vector of floats, ' +
			'positioned so that similar meanings sit at similar <em>angles</em>. ' +
			'Meaning becomes geometry, and search becomes nearest-neighbor math — ' +
			'the math you implement here.</p>' +
			'<p>Three tools do all the work:</p>' +
			'<ul>' +
			'<li><strong>Dot product</strong> <code>a·b = Σ aᵢbᵢ</code> — large ' +
			'when vectors point the same way <em>and</em> are long.</li>' +
			'<li><strong>Norm</strong> <code>‖a‖ = √(a·a)</code> — a vector&rsquo;s ' +
			'length.</li>' +
			'<li><strong>Cosine similarity</strong> <code>a·b / (‖a‖‖b‖)</code> — ' +
			'the dot product with length divided out: pure direction, in [−1, 1]. ' +
			'This is the metric that makes embeddings comparable, because embedding ' +
			'norms vary for reasons unrelated to meaning (word frequency, chunk ' +
			'length).</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>You get a hand-crafted table of 10 words in 4 dimensions. Real ' +
			'embeddings have 300-3,000 <em>learned</em> dimensions with no labels; ' +
			'ours are tiny and interpretable on purpose (roughly: royalty, ' +
			'femininity, geography, capital-ness) so every number is checkable by ' +
			'hand. The famous structure survives the shrinking — directions encode ' +
			'<em>relations</em>, so analogies become arithmetic:</p>',
			{ lang: 'txt', code: 'king  = [0.9, 0.1, 0.0, 0.0]      man   = [0.2, 0.1, 0.0, 0.0]\nqueen = [0.9, 0.9, 0.0, 0.0]      woman = [0.2, 0.9, 0.0, 0.0]\n\nking − man + woman = [0.9−0.2+0.2, 0.1−0.1+0.9, 0, 0] = [0.9, 0.9, 0, 0]\n                   = queen, exactly: the "royalty" offset plus the "female" offset\n\nfrance = [0, 0, 0.9, 0.1]   paris = [0, 0, 0.9, 0.8]\nitaly  = [0, 0, 0.6, 0.1]   rome  = [0, 0, 0.6, 0.8]   (paris − france + italy = rome)' },
			'<h3>Your job</h3>' +
			'<p>Implement <code>Dot</code>, <code>Norm</code>, <code>Cosine</code> ' +
			'(any zero vector → 0.0), <code>TopKSimilar</code> — rank the table by ' +
			'cosine against a query, skipping entries whose vector equals the ' +
			'query exactly (a vector DB returns the query document itself as hit ' +
			'#1; excluding it is the useful behavior), ties broken alphabetically — ' +
			'and <code>Analogy(a, b, c)</code>: the nearest word to ' +
			'<code>vec(b) − vec(a) + vec(c)</code>, never answering with a, b, or ' +
			'c themselves (the standard word2vec evaluation rule — without it, the ' +
			'nearest vector to the target is almost always <code>c</code>).</p>' +
			'<div class="tip">The dot-vs-cosine trap is a production bug, not ' +
			'trivia: <code>pizza</code> in our table has a huge norm, so by raw ' +
			'dot product it outranks <code>france</code> as a match for ' +
			'<code>paris</code> — and loses badly once cosine divides the length ' +
			'out. Long documents and frequent words get long vectors; rank by raw ' +
			'dot and your search engine develops a loudness bias.</div>',
		],

		starter: [
			'package main',
			'',
			'// Dot returns the dot product Σ a[i]*b[i]. If the slices differ in',
			'// length, use only the overlapping prefix (defensive, not exercised',
			'// with mismatched lengths by the tests).',
			'func Dot(a, b []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Norm returns the Euclidean length √(a·a).',
			'func Norm(a []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Cosine returns a·b / (‖a‖·‖b‖), the cosine of the angle between a',
			'// and b, in [-1, 1]. If EITHER vector has zero norm the angle is',
			'// undefined; return 0.0 (never divide by zero).',
			'func Cosine(a, b []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// TopKSimilar ranks the vocabulary by cosine similarity to query,',
			'// descending, and returns the first k names. Rules:',
			'//   - skip any entry whose vector is exactly equal to query',
			'//     (element-wise ==): a search index should not return the query',
			'//     document itself',
			'//   - equal similarity ties break alphabetically by name',
			'//   - if k exceeds the remaining entries, return all of them',
			'// names[i] labels vecs[i]; the sort must be deterministic.',
			'func TopKSimilar(names []string, vecs [][]float64, query []float64, k int) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Analogy answers "a is to b as c is to ?": build the target vector',
			'// vec(b) - vec(a) + vec(c), then return the name closest to it by',
			'// cosine — EXCLUDING a, b, and c themselves (the word2vec evaluation',
			'// rule; without it the answer is nearly always c). Ties break',
			'// alphabetically. If any of a, b, c is not in names, return "".',
			'func Analogy(names []string, vecs [][]float64, a, b, c string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// Hand-crafted embedding table: 10 words, 4 interpretable dims',
			'	// (roughly: royalty, femininity, geography, capital-ness). Both',
			'	// analogy families resolve EXACTLY by construction.',
			'	names := []string{"apple", "france", "italy", "king", "man", "paris", "pizza", "queen", "rome", "woman"}',
			'	vecs := [][]float64{',
			'		{0.1, 0.3, 0.1, 0.1}, // apple',
			'		{0.0, 0.0, 0.9, 0.1}, // france',
			'		{0.0, 0.0, 0.6, 0.1}, // italy',
			'		{0.9, 0.1, 0.0, 0.0}, // king',
			'		{0.2, 0.1, 0.0, 0.0}, // man',
			'		{0.0, 0.0, 0.9, 0.8}, // paris',
			'		{0.0, 2.0, 1.5, 0.0}, // pizza — deliberately huge norm',
			'		{0.9, 0.9, 0.0, 0.0}, // queen',
			'		{0.0, 0.0, 0.6, 0.8}, // rome',
			'		{0.2, 0.9, 0.0, 0.0}, // woman',
			'	}',
			'	vec := func(w string) []float64 {',
			'		for i := range names {',
			'			if names[i] == w {',
			'				return vecs[i]',
			'			}',
			'		}',
			'		return nil',
			'	}',
			'	joinList := func(xs []string) string {',
			'		if xs == nil {',
			'			return "nil"',
			'		}',
			'		return strings.Join(xs, " ")',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"Dot worked example: king·queen = 0.9·0.9 + 0.1·0.9",',
			'			"0.9000",',
			'			func() string { return fmt.Sprintf("%.4f", Dot(vec("king"), vec("queen"))) }},',
			'		{"Norm worked example: ‖paris‖ = √(0.81 + 0.64) = √1.45",',
			'			"1.2042",',
			'			func() string { return fmt.Sprintf("%.4f", Norm(vec("paris"))) }},',
			'		{"Cosine worked example: cos(king, queen) — same royalty, different femininity",',
			'			"0.7809",',
			'			func() string { return fmt.Sprintf("%.4f", Cosine(vec("king"), vec("queen"))) }},',
			'		{"Cosine of a vector with itself is 1.0; with the zero vector, 0.0 by convention (no division by zero)",',
			'			"1.0000 0.0000",',
			'			func() string {',
			'				return fmt.Sprintf("%.4f %.4f", Cosine(vec("king"), vec("king")), Cosine([]float64{0, 0, 0, 0}, vec("king")))',
			'			}},',
			'		{"Raw dot has a loudness bias: huge-norm pizza outscores france as a match for paris",',
			'			"pizza=1.3500 france=0.8900",',
			'			func() string {',
			'				return fmt.Sprintf("pizza=%.4f france=%.4f", Dot(vec("paris"), vec("pizza")), Dot(vec("paris"), vec("france")))',
			'			}},',
			'		{"Cosine divides the length out: france now beats pizza for paris — the normalization lesson",',
			'			"pizza=0.4484 france=0.8162",',
			'			func() string {',
			'				return fmt.Sprintf("pizza=%.4f france=%.4f", Cosine(vec("paris"), vec("pizza")), Cosine(vec("paris"), vec("france")))',
			'			}},',
			'		{"TopKSimilar(king, 3): king itself excluded (exact vector match), neighbors by angle",',
			'			"man queen apple",',
			'			func() string { return joinList(TopKSimilar(names, vecs, vec("king"), 3)) }},',
			'		{"Exact tie breaks alphabetically: alpha = 2×beta has bit-identical cosine to any query",',
			'			"alpha beta",',
			'			func() string {',
			'				tn := []string{"beta", "alpha"}',
			'				tv := [][]float64{{0, 1, 1, 0}, {0, 2, 2, 0}}',
			'				return joinList(TopKSimilar(tn, tv, []float64{1, 1, 0, 0}, 2))',
			'			}},',
			'		{"Analogy: man is to king as woman is to ? — the royalty offset plus the female offset",',
			'			"queen",',
			'			func() string { return Analogy(names, vecs, "man", "king", "woman") }},',
			'		{"Analogy: france is to paris as italy is to ? — the capital direction transfers",',
			'			"rome",',
			'			func() string { return Analogy(names, vecs, "france", "paris", "italy") }},',
			'		{"Analogy with an unknown word returns empty, not a guess",',
			'			"[]",',
			'			func() string { return "[" + Analogy(names, vecs, "man", "king", "banana") + "]" }},',
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
			'// Dot is the workhorse: every similarity metric below reduces to it.',
			'// Guarding on both lengths makes mismatched inputs degrade to the',
			'// overlapping prefix instead of panicking.',
			'func Dot(a, b []float64) float64 {',
			'	sum := 0.0',
			'	for i := 0; i < len(a) && i < len(b); i++ {',
			'		sum += a[i] * b[i]',
			'	}',
			'	return sum',
			'}',
			'',
			'// Norm reuses Dot: ‖a‖² = a·a. One definition, one bug surface.',
			'func Norm(a []float64) float64 {',
			'	return math.Sqrt(Dot(a, a))',
			'}',
			'',
			'// Cosine strips length out of the comparison. The zero-norm guard is',
			'// a real-world case, not pedantry: all-zero vectors show up from',
			'// empty documents and zero-initialized rows, and returning NaN from',
			'// 0/0 silently poisons every downstream sort (NaN compares false',
			'// with everything, so orderings become arbitrary).',
			'func Cosine(a, b []float64) float64 {',
			'	na, nb := Norm(a), Norm(b)',
			'	if na == 0 || nb == 0 {',
			'		return 0.0',
			'	}',
			'	return Dot(a, b) / (na * nb)',
			'}',
			'',
			'// sameVec is exact element-wise equality — the "do not return the',
			'// query document itself" test. Deliberately not approximate: two',
			'// different words at nearly the same angle are a legitimate result.',
			'func sameVec(a, b []float64) bool {',
			'	if len(a) != len(b) {',
			'		return false',
			'	}',
			'	for i := range a {',
			'		if a[i] != b[i] {',
			'			return false',
			'		}',
			'	}',
			'	return true',
			'}',
			'',
			'// rankBySim is the shared ranking core for TopKSimilar and Analogy:',
			'// filter, then sort by (cosine desc, name asc). The alphabetical',
			'// tie-break makes the ordering total — without it, equal-similarity',
			'// entries would come back in input order, and callers building the',
			'// table in a different order would get different "correct" answers.',
			'func rankBySim(names []string, vecs [][]float64, query []float64, skip map[string]bool, skipExact bool) []string {',
			'	idx := []int{}',
			'	for i := range names {',
			'		if skip[names[i]] {',
			'			continue',
			'		}',
			'		if skipExact && sameVec(vecs[i], query) {',
			'			continue',
			'		}',
			'		idx = append(idx, i)',
			'	}',
			'	sort.SliceStable(idx, func(x, y int) bool {',
			'		cx, cy := Cosine(vecs[idx[x]], query), Cosine(vecs[idx[y]], query)',
			'		if cx != cy {',
			'			return cx > cy',
			'		}',
			'		return names[idx[x]] < names[idx[y]]',
			'	})',
			'	out := make([]string, len(idx))',
			'	for i, j := range idx {',
			'		out[i] = names[j]',
			'	}',
			'	return out',
			'}',
			'',
			'// TopKSimilar is brute-force exact search: score all n entries, sort.',
			'// Real vector databases replace exactly this function with an ANN',
			'// index (HNSW, IVF) — same contract, sublinear time, approximate',
			'// recall. Everything else in the pipeline is unchanged.',
			'func TopKSimilar(names []string, vecs [][]float64, query []float64, k int) []string {',
			'	ranked := rankBySim(names, vecs, query, map[string]bool{}, true)',
			'	if k >= 0 && k < len(ranked) {',
			'		ranked = ranked[:k]',
			'	}',
			'	return ranked',
			'}',
			'',
			'// Analogy: target = vec(b) - vec(a) + vec(c). The exclusion set is',
			'// load-bearing — the target usually sits closest to c itself (the',
			'// b−a offset is small relative to c), so without exclusion word2vec-',
			'// style analogy evaluation would score ~0. This mirrors the original',
			'// word2vec eval protocol exactly.',
			'func Analogy(names []string, vecs [][]float64, a, b, c string) string {',
			'	find := func(w string) []float64 {',
			'		for i := range names {',
			'			if names[i] == w {',
			'				return vecs[i]',
			'			}',
			'		}',
			'		return nil',
			'	}',
			'	va, vb, vc := find(a), find(b), find(c)',
			'	if va == nil || vb == nil || vc == nil {',
			'		return ""',
			'	}',
			'	target := make([]float64, len(va))',
			'	for i := range target {',
			'		target[i] = vb[i] - va[i] + vc[i]',
			'	}',
			'	skip := map[string]bool{a: true, b: true, c: true}',
			'	ranked := rankBySim(names, vecs, target, skip, false)',
			'	if len(ranked) == 0 {',
			'		return ""',
			'	}',
			'	return ranked[0]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Where the vectors actually come from</h3>' +
			'<p>This item hand-crafted the table; real embeddings are ' +
			'<em>learned</em>, and the recipe matured in three steps. ' +
			'<strong>word2vec</strong> (2013) trained a tiny network to predict a ' +
			'word from its neighbors; the side effect — words in similar contexts ' +
			'get similar vectors — was the product, and the king−man+woman ' +
			'arithmetic you implemented was its famous party trick. ' +
			'<strong>Sentence/text encoders</strong> (SBERT and every modern ' +
			'embedding API) train transformer encoders with a contrastive ' +
			'objective: pull matched (query, passage) pairs together, push ' +
			'mismatched pairs apart — directly optimizing the cosine geometry you ' +
			'ranked with. And inside every LLM, the first layer is literally an ' +
			'embedding table lookup: token id → row of a matrix, the same data ' +
			'structure as your <code>vecs</code>, just 100k × 4096 and learned.</p>' +
			'<h3>Cosine vs dot, and the vector-DB industry</h3>' +
			'<p>Your brute-force <code>TopKSimilar</code> is exact O(n·d) search. ' +
			'At n = a billion chunks that is the entire product category of vector ' +
			'databases (Pinecone, Weaviate, Qdrant, pgvector, FAISS underneath): ' +
			'approximate-nearest-neighbor indexes — HNSW graphs, IVF partitions, ' +
			'product quantization — that trade a point of recall for orders of ' +
			'magnitude of speed. The metric detail you tested matters ' +
			'operationally: production systems usually <strong>normalize ' +
			'embeddings to unit length at write time</strong>, after which cosine ' +
			'and dot product rank identically and the index can use the cheaper ' +
			'dot. When someone mixes normalized and unnormalized vectors in one ' +
			'index — say, after switching embedding models mid-migration — they ' +
			'recreate your pizza-beats-france bug at scale, and it presents as ' +
			'&ldquo;search quality mysteriously degraded for long documents.&rdquo; ' +
			'Also remember both metrics are <em>model-relative</em>: cosine scores ' +
			'from different embedding models are not comparable, so a relevance ' +
			'threshold tuned for one model silently breaks when the model is ' +
			'upgraded.</p>' +
			'<h3>The dark side of learned geometry</h3>' +
			'<p>Embeddings inherit their training text, biases included. The same ' +
			'arithmetic that gives king−man+woman ≈ queen famously gave ' +
			'doctor−man+woman ≈ nurse in early word2vec releases — occupational ' +
			'stereotypes encoded as directions. Debiasing (projecting out a ' +
			'&ldquo;gender direction&rdquo;) helps less than hoped: Gonen &amp; ' +
			'Goldberg&rsquo;s &ldquo;Lipstick on a Pig&rdquo; showed biased ' +
			'neighborhoods survive the projection. If you rank r&eacute;sum&eacute;s, ' +
			'moderate content, or route support tickets by embedding similarity, ' +
			'you are shipping those directions to production — measure on your own ' +
			'domain rather than trusting the model card. This item&rsquo;s ' +
			'geometry feeds directly into the RAG pipeline item, where these same ' +
			'primitives retrieve grounding context for an LLM.</p>',
		],
		complexity: { time: 'O(n·d) per query for exact search (n vectors, d dims) + O(n log n) for the sort', space: 'O(n) for the ranked index list' },
	});
})();
