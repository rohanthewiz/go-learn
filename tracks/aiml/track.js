/* aiml — AI & Machine Learning: the algorithms themselves, as runnable Go.
 *
 * Every other "learn ML" course hands you a library and teaches you its API;
 * fit() hides exactly the part that makes someone a data scientist. This
 * track takes the opposite bet, the same one the networking and database
 * tracks made: ML is a small set of beautiful algorithms — gradient descent,
 * entropy splits, Bellman updates, scaled dot-product attention — and the
 * only way to own them is to implement them. Each item motivates a real
 * modeling situation, pins the math with a worked example, then has the
 * learner build the algorithm in pure Go against a deterministic test
 * harness: from a first gradient step, through the classical toolkit and
 * backprop, to a working transformer forward pass, RAG retrieval, LoRA
 * arithmetic, and reinforcement learning. Deployment is deliberately out of
 * scope (the k8s and networking tracks cover serving); this track is the
 * math and the algorithms. Zero engine changes, same kind:'problem'
 * machinery.
 *
 * Determinism is a design rule, not a limitation: anywhere the real
 * algorithm rolls dice (bootstrap samples, k-means init, top-p sampling,
 * epsilon-greedy), items pin seeds via a tiny explicit LCG or pin the
 * initialization outright — so every test has exactly one right answer and
 * "flaky" never blames the learner.
 *
 * Items live in problems/<slug>.js and register through GoLearnAIML.
 * HARNESS_RT is duplicated from the other tracks on purpose: tracks are
 * independent plugins, and sharing runtime snippets across tracks would
 * couple their load order.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'aiml',
		title: 'AI & Machine Learning',
		runner: 'go-wasm',
		order: [
			// Foundations: Learning as Optimization
			'gradient-descent', 'linear-regression', 'logistic-regression',
			// Data Craft & Evaluation
			'feature-scaling-leakage', 'classification-metrics', 'cross-validation',
			// Classical Algorithms
			'knn-classifier', 'naive-bayes-spam', 'decision-tree', 'ensembles-forests-boosting', 'svm-margin',
			// Unsupervised Learning
			'kmeans-clustering', 'pca-dimensionality', 'dbscan-anomaly',
			// Neural Networks
			'backprop-mlp', 'optimizers-adam', 'cnn-convolution', 'rnn-lstm',
			// Transformers & LLMs
			'bpe-tokenizer', 'embeddings-similarity', 'attention-mechanism', 'transformer-block', 'sampling-decoding',
			// Applied AI & Reinforcement Learning
			'rag-pipeline', 'lora-finetuning', 'q-learning-gridworld', 'policy-gradient-rlhf',
		],
	});

	// Every harness splices this in, so every harness import block includes
	// fmt and encoding/json. runCase isolates one test: a panicking user
	// implementation records a failure for that case but the harness still
	// reports every result (the sentinel must always print).
	var HARNESS_RT = [
		'// runCase executes one test body, converting a panic into a failed case.',
		'func runCase(r map[string]any, body func()) {',
		'	defer func() {',
		'		if p := recover(); p != nil {',
		'			r["pass"] = false',
		'			r["got"] = fmt.Sprintf("panic: %v", p)',
		'		}',
		'	}()',
		'	body()',
		'}',
		'',
		'// emitResults prints the sentinel-delimited JSON block the UI parses.',
		'// Printed last, so user output can never spoof it (the parser splits',
		'// on the LAST marker).',
		'func emitResults(results []map[string]any) {',
		'	buf, _ := json.Marshal(results)',
		'	fmt.Println("\\n__GOLEARN_RESULTS__")',
		'	fmt.Println(string(buf))',
		'	fmt.Println("__GOLEARN_END__")',
		'}',
	].join('\n');

	// globalThis (not window) so the Node verification harness can load
	// track files unchanged.
	globalThis.GoLearnAIML = {
		HARNESS_RT: HARNESS_RT,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('aiml', def);
		},
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('aiml', def);
		},
	};
})();
