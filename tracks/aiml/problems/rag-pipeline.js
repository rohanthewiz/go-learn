/* RAG: Retrieval-Augmented Generation — Applied AI (Medium). The grounding
 * pipeline minus the LLM call: chunk a corpus with overlap, embed chunks as
 * TF-IDF vectors over a pinned vocabulary, rank by cosine against a query,
 * and assemble a budgeted, citation-prefixed context block. The harness pins
 * chunk boundaries, df/idf values, rankings for two queries (including the
 * zero-score tie rule), and exact context strings under a word budget.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// The retrieval pipeline. Ids suffixed AIRAG — every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="RAG pipeline: documents are chunked with overlap, embedded as vectors, ranked by cosine similarity against the query vector, and the top chunks are stuffed into the prompt with citations">' +
		'<text x="20" y="22" class="lbl">the pipeline is identical whether vectors come from TF-IDF or a neural encoder</text>' +
		'<rect x="20" y="44" width="80" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="60" y="66" text-anchor="middle">docs</text>' +
		'<text x="60" y="82" text-anchor="middle" class="lbl">word stream</text>' +
		'<path d="M 100 66 L 126 66" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIRAG)"/>' +
		'<rect x="128" y="44" width="86" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="171" y="66" text-anchor="middle">chunk</text>' +
		'<text x="171" y="82" text-anchor="middle" class="lbl">size + overlap</text>' +
		'<path d="M 214 66 L 240 66" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIRAG)"/>' +
		'<rect x="242" y="44" width="86" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="285" y="66" text-anchor="middle">embed</text>' +
		'<text x="285" y="82" text-anchor="middle" class="lbl">tf·idf vector</text>' +
		'<path d="M 328 66 L 354 66" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIRAG)"/>' +
		'<rect x="356" y="44" width="86" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="399" y="66" text-anchor="middle">rank</text>' +
		'<text x="399" y="82" text-anchor="middle" class="lbl">cosine vs query</text>' +
		'<path d="M 442 66 L 468 66" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIRAG)"/>' +
		'<rect x="470" y="44" width="36" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="488" y="70" text-anchor="middle">ctx</text>' +
		// the query feeding the rank stage from below
		'<rect x="300" y="140" width="120" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="360" y="163" text-anchor="middle">query → vector</text>' +
		'<path d="M 385 138 L 397 92" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAIRAG)"/>' +
		'<text x="20" y="163" class="lbl">same vocabulary, same embedding for both sides —</text>' +
		'<text x="20" y="180" class="lbl">a query and a chunk only match if they live in one space</text>' +
		'<text x="20" y="202" class="lbl">ctx = top chunks in rank order, budgeted, each line cited “[i] …”</text>' +
		'<defs><marker id="dgArrowAIRAG" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'rag-pipeline',
		title: 'RAG: Retrieval-Augmented Generation',
		nav: 'RAG',
		difficulty: 'Medium',
		category: 'Applied AI & Reinforcement Learning',
		task: 'Implement the grounding pipeline: ChunkWords, TF-IDF embedding (TermFreq, IDF, TFIDFVector), CosineSim/CosineRank, and budgeted TopKContext with citations.',

		prose: [
			'<h2>RAG: Retrieval-Augmented Generation</h2>' +
			'<p>Your support bot confidently tells a customer the refund window is ' +
			'90 days. It is 30. The model was trained before the policy changed, ' +
			'and no amount of prompt-engineering fixes a fact the weights never ' +
			'saw. The industry answer is not a smarter model — it is ' +
			'<strong>grounding</strong>: retrieve the relevant paragraph from the ' +
			'<em>current</em> policy doc and paste it into the prompt, so the ' +
			'model answers from evidence instead of memory. That is RAG, and the ' +
			'entire pipeline — minus the final LLM call — is what you build ' +
			'here:</p>' +
			'<ul>' +
			'<li><strong>Chunk</strong> — split the corpus into windows of ' +
			'<code>size</code> words, consecutive windows starting ' +
			'<code>size − overlap</code> apart. Overlap exists so a sentence ' +
			'straddling a boundary appears whole in at least one chunk.</li>' +
			'<li><strong>Embed</strong> — turn each chunk into a vector over a ' +
			'pinned sorted vocabulary: term frequency × inverse document ' +
			'frequency, <code>idf = ln(N/df)</code>. A word in 4 of 6 chunks ' +
			'(“the”: <code>ln(6/4) = 0.4055</code>) scores near zero; a word in ' +
			'one chunk (“session”: <code>ln(6/1) = 1.7918</code>) is a strong ' +
			'signal. Rarity <em>is</em> information.</li>' +
			'<li><strong>Retrieve</strong> — embed the query with the <em>same</em> ' +
			'vocabulary and idf, rank chunks by cosine similarity (score ' +
			'descending; ties and zero scores by index ascending).</li>' +
			'<li><strong>Stuff</strong> — assemble the top chunks into a context ' +
			'block under a word budget, each line prefixed with its chunk id as ' +
			'a citation: <code>[4] records restart the cache …</code>. The ' +
			'citation is what lets the final answer say <em>where</em> a claim ' +
			'came from.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>Worked example — a 24-word ops runbook, chunked at size 6 with ' +
			'overlap 2 (starts step by 4; the last chunk may be short):</p>',
			{ lang: 'txt', code: 'corpus: the cache stores session tokens and evicts stale entries the\n        database stores user accounts and billing records restart the\n        cache to clear stale sessions\n\nchunk 0: the cache stores session tokens and      ┐ overlap: chunk 1\nchunk 1: tokens and evicts stale entries the      ┘ re-covers "tokens and"\nchunk 2: entries the database stores user accounts\nchunk 3: user accounts and billing records restart\nchunk 4: records restart the cache to clear\nchunk 5: to clear stale sessions                  (short tail: 4 words)\n\nquery "cache session tokens"   → ranking [0 4 1 2 3 5], cos(top) = 0.8674\nquery "database user accounts" → ranking [2 3 0 1 4 5]' },
			'<h3>Your job</h3>' +
			'<p>Implement <code>ChunkWords</code>, <code>TermFreq</code>, ' +
			'<code>IDF</code>, <code>TFIDFVector</code>, <code>CosineSim</code>, ' +
			'<code>CosineRank</code>, and <code>TopKContext</code>. One honest ' +
			'simplification: real RAG embeds with a neural text encoder (dense ' +
			'768-dim vectors that match “restart” to “reboot”), and here TF-IDF ' +
			'stands in — sparse, exact-match, and fully inspectable. Everything ' +
			'else — chunk, embed, index, retrieve, budget, cite — is the ' +
			'production pipeline, unchanged.</p>' +
			'<div class="tip">Both sides of the match must live in one vector ' +
			'space: the query is embedded with the <em>chunks’</em> vocabulary ' +
			'and the <em>chunks’</em> idf weights. Embedding queries and ' +
			'documents inconsistently (different models, different ' +
			'preprocessing, stale idf after re-chunking) is the single most ' +
			'common way production RAG silently degrades.</div>',
		],

		starter: [
			'package main',
			'',
			'// ChunkWords splits words into overlapping chunks: each chunk holds',
			'// up to size words, and consecutive chunks start size-overlap words',
			'// apart (callers guarantee 0 <= overlap < size). The final chunk may',
			'// be shorter; chunking stops with the chunk that contains the last',
			'// word. Empty input returns no chunks.',
			'func ChunkWords(words []string, size, overlap int) [][]string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// TermFreq counts occurrences of each vocabulary word in chunk,',
			'// returned in vocab order. Words absent from vocab are ignored.',
			'func TermFreq(chunk []string, vocab []string) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// IDF computes inverse document frequency per vocab word:',
			'//',
			'//	idf_j = ln(N / df_j)',
			'//',
			'// where N = number of chunks and df_j = number of chunks containing',
			'// vocab[j] at least once (presence, not occurrence count). A word',
			'// appearing in no chunk (df = 0) gets idf 0.0 — guard it, never',
			'// divide by zero.',
			'func IDF(chunks [][]string, vocab []string) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// TFIDFVector embeds one chunk (or a query) as TermFreq weighted',
			'// elementwise by idf.',
			'func TFIDFVector(chunk []string, vocab []string, idf []float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// CosineSim returns the cosine similarity dot(a,b)/(|a|·|b|) of two',
			'// equal-length vectors. If either vector is all zeros, return 0.0',
			'// (guard, never divide by zero).',
			'func CosineSim(a, b []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// CosineRank returns ALL chunk indices ordered by cosine similarity',
			'// to the query vector: score descending; equal scores (including',
			'// the zero-score chunks) in ascending index order.',
			'func CosineRank(docVecs [][]float64, query []float64) []int {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// TopKContext assembles the retrieved context: walk ranked in order,',
			'// taking at most k chunks. A chunk whose word count would push the',
			'// running total past budget is SKIPPED — but keep scanning, a later',
			'// smaller chunk may still fit. Each taken chunk becomes the line',
			'//',
			'//	[i] word1 word2 ...',
			'//',
			'// (i = the chunk index, its citation), lines joined with "\\n".',
			'// If nothing fits, return the empty string.',
			'func TopKContext(chunks [][]string, ranked []int, k, budget int) string {',
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
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// A 24-word ops runbook — the corpus from the prose.',
			'	corpus := []string{',
			'		"the", "cache", "stores", "session", "tokens", "and",',
			'		"evicts", "stale", "entries", "the", "database", "stores",',
			'		"user", "accounts", "and", "billing", "records", "restart",',
			'		"the", "cache", "to", "clear", "stale", "sessions",',
			'	}',
			'	// The pinned vocabulary: the sorted unique corpus words. Indexes',
			'	// the pinned cases use: 0=accounts 3=cache 10=session 14=the.',
			'	vocab := []string{',
			'		"accounts", "and", "billing", "cache", "clear", "database",',
			'		"entries", "evicts", "records", "restart", "session", "sessions",',
			'		"stale", "stores", "the", "to", "tokens", "user",',
			'	}',
			'	// Helpers call the learner functions lazily (inside cases), so a',
			'	// stub starter fails cleanly instead of crashing the harness.',
			'	buildChunks := func() [][]string { return ChunkWords(corpus, 6, 2) }',
			'	buildVecs := func() ([][]float64, []float64) {',
			'		chunks := buildChunks()',
			'		idf := IDF(chunks, vocab)',
			'		vecs := make([][]float64, len(chunks))',
			'		for i, c := range chunks {',
			'			vecs[i] = TFIDFVector(c, vocab, idf)',
			'		}',
			'		return vecs, idf',
			'	}',
			'	q1 := []string{"cache", "session", "tokens"}',
			'	q2 := []string{"database", "user", "accounts"}',
			'	joinWords := func(ws []string) string {',
			'		s := ""',
			'		for i, w := range ws {',
			'			if i > 0 {',
			'				s += " "',
			'			}',
			'			s += w',
			'		}',
			'		return s',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"chunk boundaries: starts step by size-overlap=4, the tail chunk may be short",',
			'			"chunks=6 chunk1=tokens and evicts stale entries the last=4",',
			'			func() string {',
			'				chunks := buildChunks()',
			'				if len(chunks) != 6 {',
			'					return fmt.Sprintf("chunks=%d", len(chunks))',
			'				}',
			'				return fmt.Sprintf("chunks=%d chunk1=%s last=%d", len(chunks), joinWords(chunks[1]), len(chunks[5]))',
			'			}},',
			'		{"overlap property: the last 2 words of chunk 0 reappear as the first 2 of chunk 1",',
			'			"tokens and == tokens and",',
			'			func() string {',
			'				chunks := buildChunks()',
			'				if len(chunks) < 2 || len(chunks[0]) < 6 || len(chunks[1]) < 2 {',
			'					return "too few chunks/words"',
			'				}',
			'				return fmt.Sprintf("%s == %s", joinWords(chunks[0][4:6]), joinWords(chunks[1][0:2]))',
			'			}},',
			'		{"idf = ln(N/df): the glue word (df=4) is nearly worthless, the rare word (df=1) is signal",',
			'			"the=0.4055 session=1.7918 cache=1.0986",',
			'			func() string {',
			'				idf := IDF(buildChunks(), vocab)',
			'				if len(idf) != len(vocab) {',
			'					return fmt.Sprintf("len=%d", len(idf))',
			'				}',
			'				return fmt.Sprintf("the=%.4f session=%.4f cache=%.4f", idf[14], idf[10], idf[3])',
			'			}},',
			'		{"tf-idf embedding of chunk 0: present words carry their idf, absent words contribute 0",',
			'			"cache=1.0986 accounts=0.0000 the=0.4055",',
			'			func() string {',
			'				chunks := buildChunks()',
			'				if len(chunks) == 0 {',
			'					return "no chunks"',
			'				}',
			'				v := TFIDFVector(chunks[0], vocab, IDF(chunks, vocab))',
			'				if len(v) != len(vocab) {',
			'					return fmt.Sprintf("len=%d", len(v))',
			'				}',
			'				return fmt.Sprintf("cache=%.4f accounts=%.4f the=%.4f", v[3], v[0], v[14])',
			'			}},',
			'		{"query \\"cache session tokens\\": chunk 0 wins; zero-score chunks trail in index order",',
			'			"[0 4 1 2 3 5]",',
			'			func() string {',
			'				vecs, idf := buildVecs()',
			'				return fmt.Sprint(CosineRank(vecs, TFIDFVector(q1, vocab, idf)))',
			'			}},',
			'		{"query \\"database user accounts\\": a different question retrieves a different chunk",',
			'			"[2 3 0 1 4 5]",',
			'			func() string {',
			'				vecs, idf := buildVecs()',
			'				return fmt.Sprint(CosineRank(vecs, TFIDFVector(q2, vocab, idf)))',
			'			}},',
			'		{"cosine scores: the best chunk scores 0.8674; a no-shared-words chunk scores exactly 0",',
			'			"top=0.8674 unrelated=0.0000",',
			'			func() string {',
			'				vecs, idf := buildVecs()',
			'				if len(vecs) < 6 {',
			'					return "too few vecs"',
			'				}',
			'				qv := TFIDFVector(q1, vocab, idf)',
			'				return fmt.Sprintf("top=%.4f unrelated=%.4f", CosineSim(vecs[0], qv), CosineSim(vecs[2], qv))',
			'			}},',
			'		{"context assembly: rank order, one citation line per chunk, joined by newline",',
			'			"[0] the cache stores session tokens and\\n[4] records restart the cache to clear",',
			'			func() string {',
			'				vecs, idf := buildVecs()',
			'				chunks := buildChunks()',
			'				ranked := CosineRank(vecs, TFIDFVector(q1, vocab, idf))',
			'				return TopKContext(chunks, ranked, 2, 100)',
			'			}},',
			'		{"budget=16 skips rank-3 chunk 1 (6 words would overflow) but the 4-word chunk 5 still fits",',
			'			"[0] the cache stores session tokens and\\n[4] records restart the cache to clear\\n[5] to clear stale sessions",',
			'			func() string {',
			'				vecs, idf := buildVecs()',
			'				chunks := buildChunks()',
			'				ranked := CosineRank(vecs, TFIDFVector(q1, vocab, idf))',
			'				return TopKContext(chunks, ranked, 3, 16)',
			'			}},',
			'		{"budget too small for any chunk: the context is the empty string, not a partial chunk",',
			'			"\\"\\"",',
			'			func() string {',
			'				vecs, idf := buildVecs()',
			'				chunks := buildChunks()',
			'				ranked := CosineRank(vecs, TFIDFVector(q1, vocab, idf))',
			'				return fmt.Sprintf("%q", TopKContext(chunks, ranked, 1, 3))',
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
			'	"fmt"',
			'	"math"',
			'	"sort"',
			'	"strings"',
			')',
			'',
			'// ChunkWords: fixed-size windows whose starts step by size-overlap.',
			'// The loop breaks as soon as a chunk reaches the final word — without',
			'// that break, a short tail would be re-emitted as a fully-contained',
			'// duplicate of the previous chunk end, polluting retrieval with',
			'// near-identical entries (a real bug in naive chunkers).',
			'func ChunkWords(words []string, size, overlap int) [][]string {',
			'	chunks := [][]string{}',
			'	if size <= 0 || len(words) == 0 {',
			'		return chunks',
			'	}',
			'	step := size - overlap',
			'	if step < 1 {',
			'		step = 1 // defensive: overlap >= size would loop forever',
			'	}',
			'	for start := 0; start < len(words); start += step {',
			'		end := start + size',
			'		if end > len(words) {',
			'			end = len(words)',
			'		}',
			'		// Copy, so later mutation of the corpus cannot alias into chunks.',
			'		chunks = append(chunks, append([]string(nil), words[start:end]...))',
			'		if end == len(words) {',
			'			break',
			'		}',
			'	}',
			'	return chunks',
			'}',
			'',
			'// TermFreq is a bag-of-words count. The vocab position map makes it',
			'// O(chunk + vocab) instead of O(chunk x vocab); out-of-vocabulary',
			'// words simply miss the map and are dropped, per the contract.',
			'func TermFreq(chunk []string, vocab []string) []float64 {',
			'	pos := make(map[string]int, len(vocab))',
			'	for i, w := range vocab {',
			'		pos[w] = i',
			'	}',
			'	tf := make([]float64, len(vocab))',
			'	for _, w := range chunk {',
			'		if i, ok := pos[w]; ok {',
			'			tf[i]++',
			'		}',
			'	}',
			'	return tf',
			'}',
			'',
			'// IDF: ln(N/df). df counts CHUNKS containing the word, not total',
			'// occurrences — a word repeated ten times in one chunk is still',
			'// df=1. The df=0 guard returns 0.0 rather than ln of infinity: a',
			'// word no chunk contains can never help ranking anyway.',
			'func IDF(chunks [][]string, vocab []string) []float64 {',
			'	n := float64(len(chunks))',
			'	idf := make([]float64, len(vocab))',
			'	for j, w := range vocab {',
			'		df := 0',
			'		for _, c := range chunks {',
			'			for _, cw := range c {',
			'				if cw == w {',
			'					df++',
			'					break // presence, not count: one hit per chunk',
			'				}',
			'			}',
			'		}',
			'		if df > 0 {',
			'			idf[j] = math.Log(n / float64(df))',
			'		}',
			'	}',
			'	return idf',
			'}',
			'',
			'// TFIDFVector: the embedding. tf says "how much of this chunk is',
			'// about w"; idf says "how discriminating is w corpus-wide". The',
			'// product downweights glue words toward zero without a stopword',
			'// list — the corpus statistics ARE the stopword list.',
			'func TFIDFVector(chunk []string, vocab []string, idf []float64) []float64 {',
			'	tf := TermFreq(chunk, vocab)',
			'	for j := range tf {',
			'		if j < len(idf) {',
			'			tf[j] *= idf[j]',
			'		}',
			'	}',
			'	return tf',
			'}',
			'',
			'// CosineSim compares DIRECTION, not magnitude: a long chunk and a',
			'// three-word query can still score 1.0 if they use words in the',
			'// same proportions. That length-invariance is why cosine (not raw',
			'// dot product) is the default for retrieval over variable-length',
			'// text.',
			'func CosineSim(a, b []float64) float64 {',
			'	dot, na, nb := 0.0, 0.0, 0.0',
			'	n := len(a)',
			'	if len(b) < n {',
			'		n = len(b) // defensive: mismatched lengths must not panic',
			'	}',
			'	for i := 0; i < n; i++ {',
			'		dot += a[i] * b[i]',
			'		na += a[i] * a[i]',
			'		nb += b[i] * b[i]',
			'	}',
			'	if na == 0 || nb == 0 {',
			'		return 0 // a zero vector has no direction — define, do not divide',
			'	}',
			'	return dot / (math.Sqrt(na) * math.Sqrt(nb))',
			'}',
			'',
			'// CosineRank scores every chunk once, then sorts indices. The',
			'// stable sort with a strictly-greater comparator implements the',
			'// tie rule (equal scores keep ascending index order) without',
			'// comparing indices explicitly — chunks sharing no words with the',
			'// query all score 0.0 and trail in index order.',
			'func CosineRank(docVecs [][]float64, query []float64) []int {',
			'	scores := make([]float64, len(docVecs))',
			'	for i, v := range docVecs {',
			'		scores[i] = CosineSim(v, query)',
			'	}',
			'	idx := make([]int, len(docVecs))',
			'	for i := range idx {',
			'		idx[i] = i',
			'	}',
			'	sort.SliceStable(idx, func(a, b int) bool {',
			'		return scores[idx[a]] > scores[idx[b]]',
			'	})',
			'	return idx',
			'}',
			'',
			'// TopKContext is the "stuff the prompt" step. Skip-and-continue',
			'// (rather than stopping at the first over-budget chunk) mirrors how',
			'// production context builders squeeze value from a fixed token',
			'// window: one large mid-rank chunk should not starve a small lower-',
			'// rank one. The [i] prefix is the citation the final answer will',
			'// echo — the thing that makes RAG output auditable.',
			'func TopKContext(chunks [][]string, ranked []int, k, budget int) string {',
			'	lines := []string{}',
			'	used := 0',
			'	taken := 0',
			'	for _, i := range ranked {',
			'		if taken == k {',
			'			break',
			'		}',
			'		if i < 0 || i >= len(chunks) {',
			'			continue // defensive: a bad rank index must not panic',
			'		}',
			'		if used+len(chunks[i]) > budget {',
			'			continue // over budget — but a later smaller chunk may fit',
			'		}',
			'		lines = append(lines, fmt.Sprintf("[%d] %s", i, strings.Join(chunks[i], " ")))',
			'		used += len(chunks[i])',
			'		taken++',
			'	}',
			'	return strings.Join(lines, "\\n")',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>You just built the real thing</h3>' +
			'<p>Swap one function and this is production RAG: replace ' +
			'<code>TFIDFVector</code> with a call to a neural text encoder ' +
			'(<code>text-embedding-3</code>, E5, BGE — 768–3072 dense dims) and ' +
			'every other line survives contact with production. Chunk with ' +
			'overlap, embed both sides consistently, rank by cosine, budget the ' +
			'context, cite the sources — LangChain and LlamaIndex are, at their ' +
			'core, these seven functions with plugins. The practical difference ' +
			'is <em>semantic</em> match: TF-IDF cannot connect “restart the ' +
			'cache” to “reboot memcached”; dense embeddings can. The flip side: ' +
			'dense retrieval fumbles exact identifiers (error codes, SKUs, ' +
			'function names) that sparse matching nails — which is why serious ' +
			'systems run <strong>hybrid retrieval</strong>: BM25 (an ' +
			'industrial-strength TF-IDF descendant) plus dense vectors, fused, ' +
			'with a cross-encoder <strong>reranker</strong> re-scoring the top ' +
			'~50 candidates using full query-chunk attention.</p>' +
			'<h3>Chunking is where quality is won and lost</h3>' +
			'<p>Practitioners joke that RAG performance is 80% chunking. Windows ' +
			'too small orphan facts from their context (“it defaults to 30 days” ' +
			'— what does?); too large dilute the embedding until nothing matches ' +
			'sharply. Overlap — your <code>size − overlap</code> step — is cheap ' +
			'insurance against boundary-straddling sentences, paid for in index ' +
			'size. Real systems chunk along document structure (headings, ' +
			'paragraphs, code blocks) before falling back to fixed windows, and ' +
			'store metadata (source, section, timestamp) beside each vector so ' +
			'the citation <code>[4]</code> renders as “Runbook §3, updated May ' +
			'2026”. At scale the linear scan inside <code>CosineRank</code> ' +
			'becomes an approximate-nearest-neighbor index (HNSW — the same ' +
			'trade the kNN item foreshadowed), which is the entire pitch of the ' +
			'vector-database industry.</p>' +
			'<h3>Evaluation, and RAG vs fine-tuning</h3>' +
			'<p>RAG fails in two separable stages, so measure them separately: ' +
			'<strong>retrieval</strong> (hit rate / recall@k — is the right ' +
			'chunk in the context at all?) and <strong>generation</strong> ' +
			'(faithfulness — does the answer claim only what the context ' +
			'supports?). Most “hallucinations” in RAG systems are retrieval ' +
			'misses wearing a trench coat: the model never saw the right ' +
			'paragraph and improvised. And the standing architecture question — ' +
			'RAG or fine-tuning? — has a crisp default: fine-tuning (next item) ' +
			'teaches <em>behavior</em> — style, format, tool use — but is a ' +
			'terrible database. Facts baked into weights go stale the day the ' +
			'policy changes and cannot cite sources; a retrieval store updates ' +
			'in seconds, audits line by line, and enforces per-user access. ' +
			'Freshness, provenance, and permissions live on the retrieval side; ' +
			'behavior lives in the weights.</p>',
		],
		complexity: { time: 'O(C·V) to embed all chunks; O(C·V + C log C) per query (score + sort); TopKContext is O(C)', space: 'O(C·V) for the chunk vectors — sparse in real systems, dense here for clarity' },
	});
})();
