/* Naive Bayes spam filter — Classical Algorithms (Medium). Multinomial NB
 * over word counts: priors + Laplace-smoothed likelihoods over the sorted
 * vocabulary, scored in log space. The harness pins a worked spam/ham corpus,
 * the smoothing rule (an unseen-in-class word must not zero a posterior),
 * the unknown-word skip rule, the tie-break, and the underflow demo — a
 * repeated-word document whose raw probability product hits exactly 0.0 for
 * BOTH classes while log space still classifies it fine.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// Log space vs raw products: multiplying 800 small probabilities slides
	// off the bottom of float64; adding 800 logs stays comfortably finite.
	// Marker id namespaced (dgArrowAINB) — SVG ids share the page namespace
	// across every track.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="two scoring paths for the same document: multiplying raw probabilities underflows float64 to zero, while summing log probabilities stays finite and comparable">' +
		'<text x="20" y="22" class="lbl">same 800-word document, two ways to score it</text>' +
		// raw product path
		'<rect x="30" y="40" width="210" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="135" y="62" text-anchor="middle">P(c) &middot; &Pi; P(w|c)</text>' +
		'<text x="135" y="78" text-anchor="middle" class="lbl">0.4 &times; 0.2143&#8312;&#8304;&#8304; &asymp; 1e-540</text>' +
		'<path d="M 135 92 L 135 128" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAINB)"/>' +
		'<rect x="55" y="134" width="160" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="135" y="152" text-anchor="middle" style="fill:var(--warn)">0.0 for BOTH classes</text>' +
		'<text x="135" y="168" text-anchor="middle" class="lbl">underflow &mdash; argmax undecidable</text>' +
		// log sum path
		'<rect x="280" y="40" width="210" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="385" y="62" text-anchor="middle">ln P(c) + &Sigma; ln P(w|c)</text>' +
		'<text x="385" y="78" text-anchor="middle" class="lbl">&minus;0.916 + 800 &times; ln 0.2143</text>' +
		'<path d="M 385 92 L 385 128" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAINB)"/>' +
		'<rect x="305" y="134" width="160" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="385" y="152" text-anchor="middle">&minus;1233.27 vs &minus;2218.58</text>' +
		'<text x="385" y="168" text-anchor="middle" class="lbl">finite &mdash; spam wins cleanly</text>' +
		'<text x="20" y="194" class="lbl">ln is monotone: the winner never changes &mdash; only the arithmetic survives</text>' +
		'<defs><marker id="dgArrowAINB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'naive-bayes-spam',
		title: 'Naive Bayes Spam Filter',
		nav: 'naive bayes',
		difficulty: 'Medium',
		category: 'Classical Algorithms',
		task: 'Implement multinomial Naive Bayes: priors + Laplace-smoothed word likelihoods over the sorted vocabulary, log-space posteriors, and argmax classification.',

		prose: [
			'<h2>Naive Bayes Spam Filter</h2>' +
			'<p>It is 2002 and your inbox is drowning. Paul Graham&rsquo;s ' +
			'&ldquo;A Plan for Spam&rdquo; has just shown that a probabilistic ' +
			'word-count model kills 99% of it &mdash; and twenty years later the ' +
			'same model is still the baseline every text classifier is measured ' +
			'against, because it trains in one counting pass, classifies in ' +
			'microseconds, and is embarrassingly hard to beat on small corpora. ' +
			'Bayes&rsquo; rule, per class c for a document d:</p>' +
			'<p><code>P(c|d) &prop; P(c) &middot; &Pi;<sub>w in d</sub> ' +
			'P(w|c)</code></p>' +
			'<p>The <em>naive</em> part: words are assumed independent given the ' +
			'class &mdash; flagrantly false (&ldquo;win&rdquo; and ' +
			'&ldquo;money&rdquo; co-occur constantly) and yet the argmax lands ' +
			'on the right class anyway. Three pieces make it real:</p>' +
			'<ul>' +
			'<li><strong>Priors.</strong> <code>P(c)</code> = fraction of ' +
			'training documents with label c.</li>' +
			'<li><strong>Laplace smoothing (&alpha;=1).</strong> ' +
			'<code>P(w|c) = (count(w,c) + 1) / (totalWords(c) + V)</code> over ' +
			'the sorted vocabulary of V distinct words. Without the +1, a single ' +
			'word never seen in a class makes that class&rsquo;s whole product ' +
			'0 &mdash; one novel word would veto everything else in the ' +
			'message.</li>' +
			'<li><strong>Log space.</strong> Score ' +
			'<code>ln P(c) + &Sigma; ln P(w|c)</code> instead of the raw ' +
			'product. Products of hundreds of small probabilities underflow ' +
			'float64 to exactly 0.0; sums of logs do not, and ln is monotone so ' +
			'the argmax is unchanged.</li>' +
			'</ul>' +
			'<p>Worked corpus &mdash; the one the harness trains on. Two spam ' +
			'documents, three ham; V&nbsp;=&nbsp;8 sorted words; spam has 6 ' +
			'total word tokens, ham has 8:</p>',
			{ lang: 'txt', code: 'spam(1): [win money now]        ham(0): [meeting now project]\nspam(1): [win prize money]       ham(0): [project review meeting]\n                                 ham(0): [lunch meeting]\n\nvocab (sorted): lunch meeting money now prize project review win\npriors: P(ham)=3/5=0.6000  P(spam)=2/5=0.4000\nP(money|spam) = (2+1)/(6+8) = 0.2143    P(money|ham) = (0+1)/(8+8) = 0.0625\n\nscore [win money] for spam: ln 0.4 + ln 0.2143 + ln 0.2143 = -3.9972\nscore [win money] for ham:  ln 0.6 + ln 0.0625 + ln 0.0625 = -6.0560  -> spam' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Vocab</code>, <code>Train</code>, ' +
			'<code>LogPosterior</code>, <code>NaiveProduct</code> (the raw ' +
			'product, kept on purpose so the underflow is something you watch ' +
			'happen, not read about), and <code>Classify</code>. Conventions ' +
			'the doc comments pin: likelihood columns follow the <em>sorted</em> ' +
			'vocabulary; words not in the vocabulary are <em>skipped</em> at ' +
			'scoring time; a posterior tie goes to the lowest class.</p>' +
			'<div class="tip">These scores are unnormalized log posteriors, not ' +
			'probabilities &mdash; classification never needs the denominator ' +
			'P(d), because it is identical for every class. Compare numerators, ' +
			'skip the normalizer: that one observation is the workhorse trick ' +
			'of Bayesian classification.</div>',
		],

		starter: [
			'package main',
			'',
			'// Vocab returns the sorted list of distinct words across all',
			'// documents. Sorting pins the column order of the likelihood table',
			'// — every implementation must agree on which column is which word.',
			'func Vocab(docs [][]string) []string {',
			'	// your code here',
			'	return []string{}',
			'}',
			'',
			'// Train fits multinomial Naive Bayes and returns (priors, likes):',
			'//',
			'//   priors[c]   = (# docs labeled c) / (# docs)',
			'//   likes[c][j] = (count of vocab[j] tokens in class-c docs + 1) /',
			'//                 (total word tokens in class-c docs + V)',
			'//',
			'// — Laplace smoothing with alpha=1, V = len(Vocab(docs)). Classes',
			'// are 0..max(labels); likes columns follow the SORTED vocabulary.',
			'func Train(docs [][]string, labels []int) ([]float64, [][]float64) {',
			'	// your code here',
			'	return []float64{}, [][]float64{}',
			'}',
			'',
			'// LogPosterior scores doc for class:',
			'//',
			'//   ln(priors[class]) + sum over words w in doc of ln(likes[class][w])',
			'//',
			'// with one term per word OCCURRENCE (repeats count each time).',
			'// Words NOT in vocab are SKIPPED — they contribute nothing. The',
			'// harness probes this.',
			'func LogPosterior(priors []float64, likes [][]float64, vocab []string, doc []string, class int) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// NaiveProduct is the same score WITHOUT the log: priors[class]',
			'// times the product of raw likelihoods (unknown words skipped).',
			'// Kept deliberately: on long documents this underflows float64 to',
			'// exactly 0.0 — the harness makes you watch it happen.',
			'func NaiveProduct(priors []float64, likes [][]float64, vocab []string, doc []string, class int) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Classify returns the class with the highest LogPosterior.',
			'// Ties go to the LOWEST class index.',
			'func Classify(priors []float64, likes [][]float64, vocab []string, doc []string) int {',
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
			'	// The worked corpus from the prose: 2 spam (label 1), 3 ham (0).',
			'	docs := [][]string{',
			'		{"win", "money", "now"},',
			'		{"win", "prize", "money"},',
			'		{"meeting", "now", "project"},',
			'		{"project", "review", "meeting"},',
			'		{"lunch", "meeting"},',
			'	}',
			'	labels := []int{1, 1, 0, 0, 0}',
			'	vocab := Vocab(docs)',
			'	priors, likes := Train(docs, labels)',
			'',
			'	// An 800-word document: "money" repeated. The raw probability',
			'	// products are ~1e-540 (spam) and ~1e-964 (ham) — both far below',
			'	// float64\'s ~5e-324 floor — while the log scores stay finite.',
			'	longDoc := make([]string, 800)',
			'	for i := range longDoc {',
			'		longDoc[i] = "money"',
			'	}',
			'',
			'	joinStrs := func(xs []string) string {',
			'		s := ""',
			'		for i, v := range xs {',
			'			if i > 0 {',
			'				s += ","',
			'			}',
			'			s += v',
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
			'		{"Vocab: sorted distinct words — the pinned column order of the likelihood table",',
			'			"lunch,meeting,money,now,prize,project,review,win",',
			'			func() string { return joinStrs(vocab) }},',
			'		{"priors: 3 ham of 5 docs, 2 spam of 5",',
			'			"0.6000,0.4000",',
			'			func() string { return fmt.Sprintf("%.4f,%.4f", priors[0], priors[1]) }},',
			'		{"Laplace worked values: P(money|spam)=(2+1)/(6+8), P(money|ham)=(0+1)/(8+8)",',
			'			"0.2143,0.0625",',
			'			func() string { return fmt.Sprintf("%.4f,%.4f", likes[1][2], likes[0][2]) }},',
			'		{"the prose worked example: [win money] scores spam -3.9972 over ham -6.0560",',
			'			"-3.9972,-6.0560,1",',
			'			func() string {',
			'				d := []string{"win", "money"}',
			'				return fmt.Sprintf("%.4f,%.4f,%d",',
			'					LogPosterior(priors, likes, vocab, d, 1),',
			'					LogPosterior(priors, likes, vocab, d, 0),',
			'					Classify(priors, likes, vocab, d))',
			'			}},',
			'		{"office words classify as ham",',
			'			"0",',
			'			func() string { return fmt.Sprintf("%d", Classify(priors, likes, vocab, []string{"project", "meeting", "now"})) }},',
			'		{"unknown word is SKIPPED: adding \\"xylophone\\" must not change the spam score at all",',
			'			"-3.9972,1",',
			'			func() string {',
			'				d := []string{"win", "money", "xylophone"}',
			'				return fmt.Sprintf("%.4f,%d", LogPosterior(priors, likes, vocab, d, 1), Classify(priors, likes, vocab, d))',
			'			}},',
			'		{"smoothing: \\"prize\\" never appears in ham, yet ham\'s posterior stays finite (no zero veto)",',
			'			"-4.6697,0",',
			'			func() string {',
			'				d := []string{"prize", "meeting"}',
			'				return fmt.Sprintf("%.4f,%d", LogPosterior(priors, likes, vocab, d, 0), Classify(priors, likes, vocab, d))',
			'			}},',
			'		{"underflow: 800 repeated words drive the raw product to exactly 0 for BOTH classes — argmax undecidable",',
			'			"0,0",',
			'			func() string {',
			'				return fmt.Sprintf("%g,%g",',
			'					NaiveProduct(priors, likes, vocab, longDoc, 1),',
			'					NaiveProduct(priors, likes, vocab, longDoc, 0))',
			'			}},',
			'		{"the same document in log space: finite scores, spam wins cleanly",',
			'			"-1233.2723,-2218.5818,1",',
			'			func() string {',
			'				return fmt.Sprintf("%.4f,%.4f,%d",',
			'					LogPosterior(priors, likes, vocab, longDoc, 1),',
			'					LogPosterior(priors, likes, vocab, longDoc, 0),',
			'					Classify(priors, likes, vocab, longDoc))',
			'			}},',
			'		{"exact posterior tie (symmetric corpus, unknown-only doc): lowest class wins",',
			'			"0",',
			'			func() string {',
			'				tDocs := [][]string{{"alpha"}, {"beta"}}',
			'				tLabels := []int{0, 1}',
			'				tv := Vocab(tDocs)',
			'				tp, tl := Train(tDocs, tLabels)',
			'				return fmt.Sprintf("%d", Classify(tp, tl, tv, []string{"gamma"}))',
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
			'// wordIndex builds the word -> column lookup for a vocabulary.',
			'// Factored out because every scoring function needs it; building it',
			'// once per call is O(V), versus O(V) per WORD with a linear scan.',
			'func wordIndex(vocab []string) map[string]int {',
			'	idx := make(map[string]int, len(vocab))',
			'	for i, w := range vocab {',
			'		idx[w] = i',
			'	}',
			'	return idx',
			'}',
			'',
			'// Vocab collects distinct words, then sorts. The sort is not',
			'// cosmetic: Go randomizes map iteration order on purpose, and the',
			'// likelihood table\'s columns must mean the same thing in every',
			'// implementation and every run — determinism is a contract here.',
			'func Vocab(docs [][]string) []string {',
			'	seen := map[string]bool{}',
			'	for _, d := range docs {',
			'		for _, w := range d {',
			'			seen[w] = true',
			'		}',
			'	}',
			'	out := make([]string, 0, len(seen))',
			'	for w := range seen {',
			'		out = append(out, w)',
			'	}',
			'	sort.Strings(out)',
			'	return out',
			'}',
			'',
			'// Train is one counting pass — the whole "training" of Naive Bayes.',
			'// No iteration, no learning rate, no convergence check: that is why',
			'// NB retrains in milliseconds on corpora where gradient methods',
			'// take minutes, and why it was THE deployable spam filter of the',
			'// 2000s (per-user models updated on every "mark as spam" click).',
			'func Train(docs [][]string, labels []int) ([]float64, [][]float64) {',
			'	vocab := Vocab(docs)',
			'	idx := wordIndex(vocab)',
			'	numClasses := 0',
			'	for _, l := range labels {',
			'		if l+1 > numClasses {',
			'			numClasses = l + 1',
			'		}',
			'	}',
			'	wordCounts := make([][]float64, numClasses) // wordCounts[c][j]: tokens of vocab[j] in class c',
			'	tokenTotals := make([]float64, numClasses)  // total word tokens per class',
			'	docCounts := make([]float64, numClasses)    // documents per class (for priors)',
			'	for c := 0; c < numClasses; c++ {',
			'		wordCounts[c] = make([]float64, len(vocab))',
			'	}',
			'	for i, d := range docs {',
			'		c := labels[i]',
			'		docCounts[c]++',
			'		for _, w := range d {',
			'			wordCounts[c][idx[w]]++',
			'			tokenTotals[c]++',
			'		}',
			'	}',
			'	priors := make([]float64, numClasses)',
			'	likes := make([][]float64, numClasses)',
			'	v := float64(len(vocab))',
			'	for c := 0; c < numClasses; c++ {',
			'		priors[c] = docCounts[c] / float64(len(docs))',
			'		likes[c] = make([]float64, len(vocab))',
			'		for j := range vocab {',
			'			// Laplace alpha=1: pretend every vocab word appeared once',
			'			'+'// more in every class. The +V in the denominator keeps',
			'			'+'// each class\'s likelihoods summing to 1 — a proper',
			'			'+'// probability redistribution, not a fudge factor.',
			'			likes[c][j] = (wordCounts[c][j] + 1) / (tokenTotals[c] + v)',
			'		}',
			'	}',
			'	return priors, likes',
			'}',
			'',
			'// LogPosterior scores in log space: ln prior + sum of ln likelihoods,',
			'// one term per word OCCURRENCE (multinomial — repeats count).',
			'// Unknown words are skipped: the model has no likelihood for them,',
			'// and dropping them matches what real implementations (sklearn\'s',
			'// MultinomialNB behind a fitted CountVectorizer) do with',
			'// out-of-vocabulary tokens at prediction time.',
			'func LogPosterior(priors []float64, likes [][]float64, vocab []string, doc []string, class int) float64 {',
			'	idx := wordIndex(vocab)',
			'	logPost := math.Log(priors[class])',
			'	for _, w := range doc {',
			'		if j, ok := idx[w]; ok {',
			'			logPost += math.Log(likes[class][j])',
			'		}',
			'	}',
			'	return logPost',
			'}',
			'',
			'// NaiveProduct is the textbook formula taken literally — and that is',
			'// the lesson. Each factor is fine; 800 of them multiply down to',
			'// ~1e-540, far below float64\'s smallest subnormal (~5e-324), so the',
			'// product is EXACTLY 0.0 — for every class — and the argmax is',
			'// gone. The bug is silent: no panic, no NaN, just a classifier that',
			'// answers "class 0" for every long email.',
			'func NaiveProduct(priors []float64, likes [][]float64, vocab []string, doc []string, class int) float64 {',
			'	idx := wordIndex(vocab)',
			'	product := priors[class]',
			'	for _, w := range doc {',
			'		if j, ok := idx[w]; ok {',
			'			product *= likes[class][j]',
			'		}',
			'	}',
			'	return product',
			'}',
			'',
			'// Classify is argmax over log posteriors. The comparison is STRICT',
			'// (>): scanning classes in ascending order, a later class must beat',
			'// — not merely match — the incumbent, so an exact tie keeps the',
			'// lowest class, exactly as documented.',
			'func Classify(priors []float64, likes [][]float64, vocab []string, doc []string) int {',
			'	best := 0',
			'	bestLP := math.Inf(-1)',
			'	for c := 0; c < len(priors); c++ {',
			'		lp := LogPosterior(priors, likes, vocab, doc, c)',
			'		if lp > bestLP {',
			'			best, bestLP = c, lp',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why &ldquo;naive&rdquo; works anyway</h3>' +
			'<p>The independence assumption is wildly wrong &mdash; ' +
			'&ldquo;win&rdquo; and &ldquo;prize&rdquo; are practically glued ' +
			'together in spam &mdash; so NB&rsquo;s probability ' +
			'<em>estimates</em> are badly miscalibrated: correlated evidence ' +
			'gets double-counted, pushing scores toward the extremes. But ' +
			'classification only needs the <em>argmax</em>, and the argmax is ' +
			'far more robust than the probabilities behind it &mdash; as long ' +
			'as the double-counting distorts both classes in roughly the same ' +
			'direction, the winner is unchanged. NB is the canonical example of ' +
			'a model that is wrong as a probability model and right as a ' +
			'decision rule. The practical corollary: never feed raw NB scores ' +
			'into anything that needs calibrated probabilities (bid pricing, ' +
			'medical triage thresholds) without recalibrating first &mdash; ' +
			'Platt scaling or isotonic regression are the standard fixes.</p>' +
			'<h3>The spam-filter lineage, and where NB still wins</h3>' +
			'<p>Graham&rsquo;s 2002 essay and its sequel &ldquo;Better Bayesian ' +
			'Filtering&rdquo; put this exact model into Bogofilter, ' +
			'SpamAssassin, and every mail client of the 2000s; the spammers&rsquo; ' +
			'countermeasures &mdash; word salad appended to poison the ' +
			'likelihoods, image-only spam to dodge tokenization entirely ' +
			'&mdash; are an early chapter of adversarial ML. Today this model ' +
			'is sklearn&rsquo;s <code>MultinomialNB</code> (its ' +
			'<code>alpha=1</code> default is literally this item&rsquo;s ' +
			'smoothing knob), and it still earns its keep where its trade-offs ' +
			'shine: tiny labeled datasets (high bias means it barely overfits), ' +
			'online updates that are just count increments (try that with a ' +
			'fine-tuned transformer), and as the baseline every text-' +
			'classification paper must report. On small corpora, NB over ' +
			'TF-IDF features remains hard to beat by more than a couple of ' +
			'points; the complement-NB variant patches its bias on imbalanced ' +
			'classes.</p>' +
			'<h3>The log-space habit</h3>' +
			'<p>The underflow case is the most transferable lesson here: ' +
			'<strong>probabilities are combined in log space or not at ' +
			'all</strong>. The same discipline appears as log-likelihoods in ' +
			'every MLE fit, as PyTorch&rsquo;s <code>log_softmax</code> + NLL ' +
			'(never <code>log(softmax(x))</code> in two steps &mdash; same ' +
			'underflow, different victim), as the log-sum-exp trick you will ' +
			'meet again in the attention item&rsquo;s stable softmax, and as ' +
			'perplexity being defined in log space for LLM evals. When you do ' +
			'need probabilities back, normalize in log space first: subtract ' +
			'the max, then exponentiate. A model that silently returns ' +
			'<code>0 vs 0</code> and defaults to class 0 on every long input ' +
			'is this bug in production &mdash; real spam filters hit it on ' +
			'long emails, and the fix was exactly the function you just ' +
			'wrote.</p>',
		],
		complexity: { time: 'Train O(T + C·V) for T total tokens, C classes, V vocab words; scoring O(V + L) per length-L doc', space: 'O(C·V) for the likelihood table' },
	});
})();
