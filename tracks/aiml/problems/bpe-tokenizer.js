/* BPE Tokenization — Transformers & LLMs (Medium). Byte-Pair Encoding: the
 * compression algorithm every LLM runs before it sees a single number. The
 * harness pins the classic low/lower/newest/widest corpus — the tie-broken
 * first merge, the ordered merge table, and the payoff: "lowest", a word the
 * corpus never contained, encoding to the two learned subwords "low est".
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// One training round: count adjacent pairs across the corpus, merge the
	// winner everywhere, repeat. Marker id namespaced (dgArrowAIBPE) because
	// every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="one BPE training round: count adjacent symbol pairs weighted by word frequency, pick the most frequent pair, merge it everywhere, repeat">' +
		'<text x="20" y="24" class="lbl">one merge round (corpus: newest ×6, widest ×3, …)</text>' +
		'<rect x="20" y="40" width="215" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="127" y="62" text-anchor="middle">n e w [e s] t</text>' +
		'<text x="127" y="78" text-anchor="middle" class="lbl">count pairs: (e,s) seen 6+3 = 9×</text>' +
		'<rect x="285" y="40" width="215" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="392" y="62" text-anchor="middle">n e w [es] t</text>' +
		'<text x="392" y="78" text-anchor="middle" class="lbl">merge the winner everywhere</text>' +
		'<path d="M 235 62 L 278 62" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAIBPE)"/>' +
		'<rect x="285" y="112" width="215" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="392" y="134" text-anchor="middle">n e w [es t]</text>' +
		'<text x="392" y="150" text-anchor="middle" class="lbl">next round: (es,t) now wins → est</text>' +
		'<path d="M 392 84 L 392 105" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAIBPE)"/>' +
		'<text x="20" y="186" class="lbl">the merge LIST is the tokenizer: encoding replays it, in training order, on any word</text>' +
		'<defs><marker id="dgArrowAIBPE" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'bpe-tokenizer',
		title: 'BPE Tokenization: How LLMs Read',
		nav: 'BPE tokenizer',
		difficulty: 'Medium',
		category: 'Transformers & LLMs',
		task: 'Implement Byte-Pair Encoding: count symbol pairs, merge the most frequent, train an ordered merge list, and encode unseen words with it.',

		prose: [
			'<h2>BPE Tokenization: How LLMs Read</h2>' +
			'<p>Your team ships an LLM feature and the invoice makes no sense: a ' +
			'600-word English prompt bills as ~800 tokens, the same prompt from a ' +
			'German customer bills as ~1,900, and the model that aces your eval ' +
			'cannot count the r&rsquo;s in <code>strawberry</code>. All three facts ' +
			'have one cause. Before any neural network runs, text is chopped into ' +
			'<strong>tokens</strong> by a tokenizer trained with a compression ' +
			'algorithm from 1994: <strong>Byte-Pair Encoding</strong>. The model ' +
			'never sees letters — it sees the chunks BPE decided were frequent, ' +
			'and you pay by the chunk.</p>' +
			'<p>Why chunks at all? <strong>Whole words</strong> fail on the first ' +
			'name or typo not in the vocabulary (the classic OOV — out-of-vocabulary ' +
			'— problem: one <code>&lt;UNK&gt;</code> token destroys the input). ' +
			'<strong>Single characters</strong> never fail but make every sequence ' +
			'~5&times; longer — and attention cost grows with sequence length. BPE ' +
			'is the middle path, and it is <em>learned from data</em>:</p>' +
			'<ul>' +
			'<li><strong>Start</strong> with words as sequences of single-character ' +
			'symbols, each word carrying its corpus frequency.</li>' +
			'<li><strong>Count</strong> every adjacent symbol pair, weighted by ' +
			'word frequency.</li>' +
			'<li><strong>Merge</strong> the most frequent pair into one new symbol, ' +
			'everywhere it occurs. Record the merge.</li>' +
			'<li><strong>Repeat</strong> for a budget of merges. The ordered merge ' +
			'list <em>is</em> the trained tokenizer.</li>' +
			'</ul>' +
			'<p>The classic worked corpus: <code>low</code>&times;5, ' +
			'<code>lower</code>&times;2, <code>newest</code>&times;6, ' +
			'<code>widest</code>&times;3. Count the pairs: (e,s) appears in ' +
			'<code>newest</code> and <code>widest</code> — 6+3 = 9 times. So does ' +
			'(s,t) — a tie, broken here by taking the lexicographically smaller ' +
			'pair (real tokenizers pin an arbitrary-but-fixed rule too; an ' +
			'unversioned tie-break means two builds of the &ldquo;same&rdquo; ' +
			'tokenizer disagree forever). Six merges in, something remarkable has ' +
			'happened:</p>',
			{ lang: 'txt', code: 'merge 1: e s    (9×)  newest → n e w es t    widest → w i d es t\nmerge 2: es t   (9×)  newest → n e w est    widest → w i d est\nmerge 3: l o    (7×)  low → lo w            lower → lo w e r\nmerge 4: lo w   (7×)  low → low             lower → low e r\nmerge 5: e w    (6×)  newest → n ew est\nmerge 6: ew est (6×)  newest → n ewest\n\nEncode "lowest" (NEVER in the corpus): l o w e s t\n  → l o w es t → l o w est → lo w est → low est   =  [low] [est]' },
			'<p><code>lowest</code> was never in the training data, yet it encodes ' +
			'to two meaningful subwords, <code>low</code> + <code>est</code> — stem ' +
			'and suffix, discovered by nothing but counting. That is the whole ' +
			'trick behind every modern tokenizer.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the five functions: <code>PairCounts</code> (pair ' +
			'frequencies, keys as <code>"left right"</code>), <code>BestPair</code> ' +
			'(max count, ties to the lexicographically smallest key), ' +
			'<code>MergePair</code> (one left-to-right non-overlapping pass per ' +
			'word), <code>TrainBPE</code> (the loop), and <code>Encode</code> — ' +
			'split a word into characters, then repeatedly apply the ' +
			'<em>earliest-trained</em> merge that occurs, until none apply.</p>' +
			'<p>One disclosed simplification: real BPE marks word boundaries (an ' +
			'end-of-word symbol like <code>&lt;/w&gt;</code>, or GPT-2&rsquo;s ' +
			'leading-space convention) so <code>est</code>-the-suffix and ' +
			'<code>est</code>-the-prefix (&ldquo;establish&rdquo;) can become ' +
			'different tokens. Here words are plain symbol slices — the algorithm ' +
			'is identical, the bookkeeping lighter.</p>' +
			'<div class="tip">Encoding replays merges by <em>training order</em>, ' +
			'not by what looks best locally: after any merge fires, rescan from ' +
			'the top of the list, because an early merge may newly apply to the ' +
			'output of a later one. Priority order is what makes encoding ' +
			'deterministic — a merge table is versioned like an API contract.</div>',
		],

		starter: [
			'package main',
			'',
			'// PairCounts counts adjacent symbol pairs across a corpus. words[i] is',
			'// one word as a slice of symbols (initially single characters); it',
			'// occurs freqs[i] times in the corpus, and each of its adjacent pairs',
			'// counts freqs[i] toward that pair\'s total. The map key for the pair',
			'// (a, b) is the string a + " " + b (symbols never contain spaces).',
			'func PairCounts(words [][]string, freqs []int) map[string]int {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// BestPair returns the key with the highest count. Ties are broken by',
			'// the lexicographically SMALLEST key (Go string <). An empty map',
			'// returns "" — the trainer\'s stop signal.',
			'func BestPair(counts map[string]int) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// MergePair replaces every adjacent occurrence of pair ("left right")',
			'// in every word with the single concatenated symbol left+right. Scan',
			'// each word once, left to right, non-overlapping: in [a a a] the pair',
			'// "a a" merges the FIRST two symbols, leaving [aa a]. Returns new',
			'// slices; the input is not mutated.',
			'func MergePair(words [][]string, pair string) [][]string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// TrainBPE runs up to numMerges rounds: count pairs, pick BestPair,',
			'// record it, merge it everywhere, recount. Stops early when no pairs',
			'// remain (BestPair == ""). Returns the merges in training order —',
			'// this ordered list IS the trained tokenizer.',
			'func TrainBPE(words [][]string, freqs []int, numMerges int) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Encode tokenizes one word with a trained merge list. Start from the',
			'// word\'s single characters. Then repeatedly: find the EARLIEST merge',
			'// in the list whose pair occurs somewhere in the word, apply one full',
			'// left-to-right MergePair pass of it, and rescan from the start of',
			'// the list (an early merge may newly apply after a later one fires).',
			'// Stop when no merge applies. Characters never seen in training just',
			'// pass through as single-symbol tokens — BPE cannot fail with OOV.',
			'func Encode(word string, merges []string) []string {',
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
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// The classic BPE worked corpus (Sennrich et al. 2016). Rebuilt',
			'	// fresh per case: MergePair must not mutate its input, but a buggy',
			'	// implementation that does should not poison later cases.',
			'	corpus := func() [][]string {',
			'		split := func(s string) []string {',
			'			out := []string{}',
			'			for _, r := range s {',
			'				out = append(out, string(r))',
			'			}',
			'			return out',
			'		}',
			'		return [][]string{split("low"), split("lower"), split("newest"), split("widest")}',
			'	}',
			'	freqs := []int{5, 2, 6, 3}',
			'	join := func(w []string) string {',
			'		if w == nil {',
			'			return "nil"',
			'		}',
			'		return strings.Join(w, " ")',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"PairCounts weights by word frequency: (e,s) = 6+3 across newest/widest, 11 distinct pairs",',
			'			"es=9 we=8 pairs=11",',
			'			func() string {',
			'				c := PairCounts(corpus(), freqs)',
			'				return fmt.Sprintf("es=%d we=%d pairs=%d", c["e s"], c["w e"], len(c))',
			'			}},',
			'		{"BestPair tie-break: (e,s) and (s,t) both count 9 — lexicographically smaller key wins",',
			'			"e s",',
			'			func() string { return BestPair(PairCounts(corpus(), freqs)) }},',
			'		{"MergePair rewrites every word: merging \\"e s\\" turns n-e-w-e-s-t into n e w es t",',
			'			"n e w es t",',
			'			func() string {',
			'				m := MergePair(corpus(), "e s")',
			'				if len(m) < 4 {',
			'					return "nil"',
			'				}',
			'				return join(m[2])',
			'			}},',
			'		{"MergePair is non-overlapping left-to-right: \\"a a\\" on [a a a] gives [aa a], not [a aa]",',
			'			"aa a",',
			'			func() string {',
			'				m := MergePair([][]string{{"a", "a", "a"}}, "a a")',
			'				if len(m) < 1 {',
			'					return "nil"',
			'				}',
			'				return join(m[0])',
			'			}},',
			'		{"TrainBPE order: 6 merges on the corpus, each round recounted after the previous merge",',
			'			"e s | es t | l o | lo w | e w | ew est",',
			'			func() string {',
			'				m := TrainBPE(corpus(), freqs, 6)',
			'				if m == nil {',
			'					return "nil"',
			'				}',
			'				return strings.Join(m, " | ")',
			'			}},',
			'		{"Encode generalizes: \\"lowest\\" never appeared in training, yet tokenizes to low + est",',
			'			"low est",',
			'			func() string { return join(Encode("lowest", TrainBPE(corpus(), freqs, 6))) }},',
			'		{"Encode a training word: \\"low\\" collapses through l-o then lo-w to a single token",',
			'			"low",',
			'			func() string { return join(Encode("low", TrainBPE(corpus(), freqs, 6))) }},',
			'		{"Unknown characters pass through: \\"zoo\\" matches no trained merge, stays as characters",',
			'			"z o o",',
			'			func() string { return join(Encode("zoo", TrainBPE(corpus(), freqs, 6))) }},',
			'		{"Single-character word: no pairs to merge, encodes to itself",',
			'			"t",',
			'			func() string { return join(Encode("t", TrainBPE(corpus(), freqs, 6))) }},',
			'		{"Subword payoff: \\"slowest\\" = unknown prefix s + learned stem low + learned suffix est",',
			'			"s low est",',
			'			func() string { return join(Encode("slowest", TrainBPE(corpus(), freqs, 6))) }},',
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
			'import "sort"',
			'',
			'// cutPair splits a "left right" pair key at its single space. Symbols',
			'// never contain spaces (they are concatenations of word characters),',
			'// so the first space is unambiguous — the key format stays an',
			'// implementation detail of this file.',
			'func cutPair(pair string) (string, string) {',
			'	for i := 0; i < len(pair); i++ {',
			'		if pair[i] == \' \' {',
			'			return pair[:i], pair[i+1:]',
			'		}',
			'	}',
			'	return pair, ""',
			'}',
			'',
			'// PairCounts counts adjacent pairs across the corpus, weighted by word',
			'// frequency. The weighting is the point: BPE never re-reads raw text —',
			'// the (word, freq) table is a sufficient statistic, which is why',
			'// training a tokenizer over terabytes of text is feasible at all.',
			'func PairCounts(words [][]string, freqs []int) map[string]int {',
			'	counts := map[string]int{}',
			'	for w, word := range words {',
			'		f := 1',
			'		if w < len(freqs) {',
			'			f = freqs[w]',
			'		}',
			'		for i := 0; i+1 < len(word); i++ {',
			'			counts[word[i]+" "+word[i+1]] += f',
			'		}',
			'	}',
			'	return counts',
			'}',
			'',
			'// BestPair scans keys in SORTED order so the max-scan itself resolves',
			'// ties toward the lexicographically smallest key. Iterating the map',
			'// directly would be the classic Go determinism bug: map order is',
			'// randomized per run, so an unsorted argmax breaks ties differently',
			'// on every execution — and a tokenizer that trains differently every',
			'// run is useless as an artifact.',
			'func BestPair(counts map[string]int) string {',
			'	keys := make([]string, 0, len(counts))',
			'	for k := range counts {',
			'		keys = append(keys, k)',
			'	}',
			'	sort.Strings(keys)',
			'	best := ""',
			'	bestN := 0',
			'	for _, k := range keys {',
			'		// Strict > : the first (smallest) key at the max count sticks.',
			'		if counts[k] > bestN {',
			'			best, bestN = k, counts[k]',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
			'// mergeWord is one left-to-right non-overlapping pass over one word.',
			'// After consuming a match, jump past BOTH symbols (i += 2): in a run',
			'// like [a a a] this yields [aa a] — the freshly built "aa" is never',
			'// immediately reused as the left half of another match in this pass.',
			'func mergeWord(word []string, left, right string) []string {',
			'	out := make([]string, 0, len(word))',
			'	i := 0',
			'	for i < len(word) {',
			'		if i+1 < len(word) && word[i] == left && word[i+1] == right {',
			'			out = append(out, left+right)',
			'			i += 2',
			'		} else {',
			'			out = append(out, word[i])',
			'			i++',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// MergePair applies one pass to every word, building new slices so the',
			'// caller\'s corpus is untouched — TrainBPE relies on that to keep each',
			'// round a pure function of the previous one.',
			'func MergePair(words [][]string, pair string) [][]string {',
			'	left, right := cutPair(pair)',
			'	out := make([][]string, len(words))',
			'	for w, word := range words {',
			'		out[w] = mergeWord(word, left, right)',
			'	}',
			'	return out',
			'}',
			'',
			'// TrainBPE is the whole training loop: count, argmax, merge — up to',
			'// numMerges rounds. Note the recount every round: merge 2 ("es t")',
			'// only exists because merge 1 created the symbol "es". The vocabulary',
			'// is base characters + one new symbol per merge, so numMerges is',
			'// exactly the vocab-size budget knob real tokenizers expose.',
			'func TrainBPE(words [][]string, freqs []int, numMerges int) []string {',
			'	merges := []string{}',
			'	cur := words',
			'	for m := 0; m < numMerges; m++ {',
			'		best := BestPair(PairCounts(cur, freqs))',
			'		if best == "" {',
			'			break // every word is a single symbol; nothing left to merge',
			'		}',
			'		merges = append(merges, best)',
			'		cur = MergePair(cur, best)',
			'	}',
			'	return merges',
			'}',
			'',
			'// pairOccurs reports whether (left, right) appears adjacently in word.',
			'func pairOccurs(word []string, left, right string) bool {',
			'	for i := 0; i+1 < len(word); i++ {',
			'		if word[i] == left && word[i+1] == right {',
			'			return true',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
			'// Encode replays training on one word: always apply the EARLIEST',
			'// applicable merge, then rescan from the top of the list. Rescanning',
			'// matters — merging "l o" creates the "lo" that lets "lo w" match.',
			'// Priority-by-rank is exactly what GPT-2\'s encoder does (with a heap',
			'// instead of a rescan; same result, better asymptotics). Unknown',
			'// characters simply never match any merge and survive as single-symbol',
			'// tokens: BPE has no <UNK> failure mode, which is the property that',
			'// made it win.',
			'func Encode(word string, merges []string) []string {',
			'	syms := []string{}',
			'	for _, r := range word {',
			'		syms = append(syms, string(r))',
			'	}',
			'	for {',
			'		applied := false',
			'		for _, m := range merges {',
			'			left, right := cutPair(m)',
			'			if pairOccurs(syms, left, right) {',
			'				syms = mergeWord(syms, left, right)',
			'				applied = true',
			'				break // restart from the highest-priority merge',
			'			}',
			'		}',
			'		if !applied {',
			'			break',
			'		}',
			'	}',
			'	return syms',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>From this toy to GPT&rsquo;s tokenizer</h3>' +
			'<p>What you built is structurally the real thing. GPT-2 made one ' +
			'decisive change: it runs BPE over <strong>bytes</strong>, not ' +
			'characters. The base vocabulary is all 256 byte values, so ' +
			'<em>any</em> input — emoji, Mongolian, malformed UTF-8 — tokenizes ' +
			'without an <code>&lt;UNK&gt;</code>, and ~50,000 merges are learned ' +
			'on top. GPT-4&rsquo;s <code>cl100k_base</code> and its successors are ' +
			'the same algorithm with ~100k merges plus a regex pre-splitter that ' +
			'stops merges from crossing word and number boundaries. The other ' +
			'families you&rsquo;ll meet: <strong>WordPiece</strong> (BERT) picks ' +
			'merges by likelihood gain rather than raw count, and ' +
			'<strong>SentencePiece/Unigram</strong> (T5, LLaMA) goes top-down — ' +
			'start from a huge candidate vocabulary and prune. All of them ship ' +
			'the same artifact you just trained: a frozen, versioned merge/vocab ' +
			'table that must match the model <em>exactly</em>. Tokenizer and ' +
			'weights are a matched pair; loading a model with the wrong tokenizer ' +
			'produces confident garbage — a real production-incident class.</p>' +
			'<h3>Tokens are money and latency</h3>' +
			'<p>Vocabulary size is an economic dial. More merges → fewer tokens ' +
			'per sentence → shorter sequences → less attention compute and fewer ' +
			'dollars per request (APIs bill per token) — but a bigger embedding ' +
			'matrix and rarer, worse-trained tail tokens. English runs roughly 3-4 ' +
			'characters per token on modern tokenizers; languages underrepresented ' +
			'in tokenizer training pay a real tax. A German or Thai user asking ' +
			'the same question can pay 2-4&times; the tokens of the English user — ' +
			'same model, same answer, different bill and a smaller effective ' +
			'context window. Teams localizing LLM products discover this in the ' +
			'invoice, not in the docs.</p>' +
			'<h3>Tokenization pathologies</h3>' +
			'<p>Many famous LLM failures are tokenizer artifacts, not reasoning ' +
			'failures. A model struggles to count the r&rsquo;s in ' +
			'<code>strawberry</code> because it never sees letters — it sees ' +
			'something like <code>st</code>+<code>raw</code>+<code>berry</code>, ' +
			'and knowing what letters live inside a token is memorization, not ' +
			'perception. Arithmetic suffers because numbers used to split ' +
			'inconsistently (<code>1234</code> one token, <code>1235</code> two), ' +
			'which is why newer tokenizers force digit-splitting. Trailing ' +
			'whitespace flips answers because <code>"hello"</code> and ' +
			'<code>" hello"</code> are different token ids. When an LLM behaves ' +
			'bizarrely on structured strings — IDs, URLs, code — your first ' +
			'debugging move is the one this exercise trained: run the tokenizer by ' +
			'hand and look at the actual token boundaries.</p>',
		],
		complexity: { time: 'O(merges × corpus) training — each round recounts every pair; O(word² × merges) worst-case encode due to the rescan loop', space: 'O(distinct pairs) for the count table + O(merges)' },
	});
})();
