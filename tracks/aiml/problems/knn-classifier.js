/* k-Nearest Neighbors — Classical Algorithms (Easy). The simplest classifier
 * that actually works: no training, no parameters, just "what did similar
 * points do?". The harness pins the sorted-neighbor determinism contract
 * (distance, then index), the k=1 vs k=3 noise flip, the vote tie-break, and
 * the feature-scaling trap — the same data in different units changes the
 * neighbor set and flips the prediction.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// The k=1 vs k=3 lesson in one picture: the query sits in the class-0
	// cluster, but its single nearest neighbor is a mislabeled point. No
	// marker/gradient ids needed, so nothing to namespace beyond the classes.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="a query point inside a class-0 cluster whose single nearest neighbor is a class-1 noise point; the k=1 circle contains only the noise point, the k=3 circle contains two class-0 points that outvote it">' +
		'<text x="20" y="22" class="lbl">k=1 trusts one neighbor — even a mislabeled one. k=3 lets the cluster outvote it.</text>' +
		// class-0 cluster (hollow accent circles)
		'<circle cx="150" cy="120" r="7" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<circle cx="185" cy="150" r="7" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<circle cx="120" cy="95" r="7" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="100" y="180" class="lbl">class 0 cluster</text>' +
		// far class-1 cluster
		'<circle cx="450" cy="60" r="7" fill="var(--warn)"/>' +
		'<circle cx="475" cy="85" r="7" fill="var(--warn)"/>' +
		'<text x="420" y="115" class="lbl">class 1 cluster</text>' +
		// the noise point: class-1 label inside the class-0 cluster
		'<circle cx="222" cy="112" r="7" fill="var(--warn)"/>' +
		'<text x="240" y="95" class="lbl" style="fill:var(--warn)">noise: labeled 1</text>' +
		// the query
		'<path d="M 210 130 l 5 -12 l 5 12 l -12 -8 l 14 0 z" fill="var(--accent)"/>' +
		'<text x="196" y="158" class="lbl">query</text>' +
		// k=1 radius: reaches only the noise point
		'<circle cx="213" cy="124" r="22" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="4 3"/>' +
		// k=3 radius: pulls in two class-0 points
		'<circle cx="213" cy="124" r="72" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="4 3"/>' +
		'<text x="300" y="196" class="lbl">k=1 &rarr; predicts 1 &nbsp;&nbsp;|&nbsp;&nbsp; k=3 &rarr; two 0-votes beat one 1-vote</text>' +
		'</svg>';

	T.problem({
		id: 'knn-classifier',
		title: 'k-Nearest Neighbors',
		nav: 'kNN',
		difficulty: 'Easy',
		category: 'Classical Algorithms',
		task: 'Implement Euclidean distance, deterministic k-nearest-neighbor selection (distance then index), and majority-vote prediction with a smallest-label tie-break.',

		prose: [
			'<h2>k-Nearest Neighbors</h2>' +
			'<p>A fraud-review queue needs a first-pass label for each incoming ' +
			'transaction, and the team&rsquo;s deep model is three sprints away. ' +
			'The pragmatic baseline that ships this week: represent each ' +
			'transaction as a feature vector, keep the last few thousand ' +
			'human-labeled ones, and label a new case by what the most similar ' +
			'past cases were. That is the entire algorithm &mdash; kNN has ' +
			'<strong>no training step</strong>. It memorizes the data and defers ' +
			'all work to query time (a <em>lazy learner</em>), which also makes ' +
			'it the honest baseline every fancier model must beat.</p>' +
			'<ul>' +
			'<li><strong>Distance.</strong> Euclidean: ' +
			'<code>&radic;&Sigma;(a<sub>i</sub>&minus;b<sub>i</sub>)&sup2;</code>. ' +
			'The metric IS the model &mdash; everything kNN believes about ' +
			'similarity is encoded here.</li>' +
			'<li><strong>Neighbors.</strong> Sort training indices by distance to ' +
			'the query. Ties on distance break by <em>lower index first</em> ' +
			'&mdash; without an explicit tie rule, two correct implementations ' +
			'can disagree, which is exactly the kind of nondeterminism that makes ' +
			'model results unreproducible.</li>' +
			'<li><strong>Vote.</strong> The k nearest labels vote; majority wins. ' +
			'A tied vote goes to the <em>smallest label</em>.</li>' +
			'</ul>' +
			'<p>Worked example &mdash; the dataset the harness uses. Three ' +
			'class-0 points cluster near (1,1), one mislabeled class-1 point sits ' +
			'among them at (1.45,&nbsp;1.15), and the real class-1 cluster is far ' +
			'away near (3,3). Query x&nbsp;=&nbsp;(1.4,&nbsp;1.1):</p>',
			{ lang: 'txt', code: 'index  point         label   distance to (1.4, 1.1)\n  3    (1.45, 1.15)    1     0.0707   <- nearest is the noise point\n  1    (1.20, 0.80)    0     0.3606\n  0    (1.00, 1.00)    0     0.4123\n\nk=1: neighbors {3}        votes 1:1        -> predicts 1  (fooled)\nk=3: neighbors {3, 1, 0}  votes 0:2, 1:1   -> predicts 0  (outvoted)\nk=2: neighbors {3, 1}     votes 0:1, 1:1   -> tie -> smallest label 0' },
			DIAGRAM +
			'<p>One more trap the harness sets: <strong>units</strong>. Euclidean ' +
			'distance adds squared feature differences as if they were ' +
			'comparable. Re-express one feature in different units (say hours ' +
			'&rarr; minutes: multiply by a constant) and it dominates every ' +
			'distance &mdash; the neighbor set changes and predictions flip, on ' +
			'geometrically identical data. Real pipelines standardize features ' +
			'first (the feature-scaling item); here we pin both raw versions to ' +
			'make the failure visible.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Euclidean</code>, <code>Neighbors</code> (the ' +
			'deterministic sorted-index contract), and <code>PredictKNN</code> ' +
			'(majority vote, smallest-label tie-break). Guard the edges the doc ' +
			'comments spell out &mdash; k larger than the dataset, k &le; 0 ' +
			'&mdash; without panicking.</p>' +
			'<div class="tip">kNN with k=1 has zero training error &mdash; every ' +
			'training point is its own nearest neighbor. That sounds like a ' +
			'feature and is actually the disease: it memorizes noise, as the ' +
			'mislabeled point above shows. Raising k trades that variance for ' +
			'bias. Choosing k is the first hyperparameter most people ever ' +
			'tune.</div>',
		],

		starter: [
			'package main',
			'',
			'// Euclidean returns the L2 distance between a and b:',
			'// sqrt(sum over i of (a[i]-b[i])^2), summed over the first',
			'// min(len(a), len(b)) components — never index past the shorter',
			'// slice. (The harness always passes equal-length vectors; the min',
			'// rule just keeps the function total.)',
			'func Euclidean(a, b []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Neighbors returns the indices of the k training points nearest to',
			'// x, ordered by (distance ascending, then index ascending). The',
			'// index tie-break makes the result fully deterministic even when two',
			'// points are exactly equidistant from x.',
			'//',
			'//   - k > len(trainX): cap k at len(trainX)',
			'//   - k <= 0: return an empty (non-nil) slice',
			'func Neighbors(k int, trainX [][]float64, x []float64) []int {',
			'	// your code here',
			'	return []int{}',
			'}',
			'',
			'// PredictKNN classifies x by majority vote among its k nearest',
			'// neighbors (per Neighbors above). A tied vote goes to the SMALLEST',
			'// label. If there are no neighbors at all (empty training set or',
			'// k <= 0), return 0.',
			'func PredictKNN(k int, trainX [][]float64, trainY []int, x []float64) int {',
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
			'	// The worked dataset from the prose: a class-0 cluster near (1,1)',
			'	// with one mislabeled class-1 point inside it, and the true',
			'	// class-1 cluster far away near (3,3).',
			'	trainX := [][]float64{',
			'		{1.0, 1.0},   // 0: cluster A (class 0)',
			'		{1.2, 0.8},   // 1: cluster A (class 0)',
			'		{0.8, 1.2},   // 2: cluster A (class 0)',
			'		{1.45, 1.15}, // 3: noise — labeled 1 inside cluster A',
			'		{3.0, 3.0},   // 4: cluster B (class 1)',
			'		{3.2, 2.8},   // 5: cluster B (class 1)',
			'	}',
			'	trainY := []int{0, 0, 0, 1, 1, 1}',
			'	q := []float64{1.4, 1.1}',
			'',
			'	// The units trap: identical geometry, but feature 1 is expressed',
			'	// in units 100x larger in the second version (hours -> ~minutes).',
			'	unitX1 := [][]float64{{1.0, 1.0}, {3.0, 1.2}}',
			'	unitX2 := [][]float64{{1.0, 100}, {3.0, 120}}',
			'	unitY := []int{0, 1}',
			'',
			'	joinInts := func(xs []int) string {',
			'		s := ""',
			'		for i, v := range xs {',
			'			if i > 0 {',
			'				s += ","',
			'			}',
			'			s += fmt.Sprintf("%d", v)',
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
			'		{"Euclidean: the 3-4-5 triangle — sqrt(9+16)",',
			'			"5.0000",',
			'			func() string { return fmt.Sprintf("%.4f", Euclidean([]float64{0, 0}, []float64{3, 4})) }},',
			'		{"Euclidean: a point is at distance 0 from itself",',
			'			"0.0000",',
			'			func() string { return fmt.Sprintf("%.4f", Euclidean([]float64{1.5, 2.5}, []float64{1.5, 2.5})) }},',
			'		{"Neighbors k=3: sorted by distance — the mislabeled point (index 3) is nearest",',
			'			"3,1,0",',
			'			func() string { return joinInts(Neighbors(3, trainX, q)) }},',
			'		{"k=1 trusts the single nearest neighbor — the noise point fools it",',
			'			"1",',
			'			func() string { return fmt.Sprintf("%d", PredictKNN(1, trainX, trainY, q)) }},',
			'		{"k=3 lets the cluster outvote the noise point — same query flips to 0",',
			'			"0",',
			'			func() string { return fmt.Sprintf("%d", PredictKNN(3, trainX, trainY, q)) }},',
			'		{"k=2 splits the vote 1-1: tie goes to the SMALLEST label",',
			'			"0",',
			'			func() string { return fmt.Sprintf("%d", PredictKNN(2, trainX, trainY, q)) }},',
			'		{"equidistant neighbors: (0,1) and (1,0) are both at distance 1 from (0,0) — lower index first",',
			'			"0,1",',
			'			func() string { return joinInts(Neighbors(2, [][]float64{{0, 1}, {1, 0}, {2, 2}}, []float64{0, 0})) }},',
			'		{"units v1 (both features comparable): nearest neighbor is point 0 — predicts 0",',
			'			"0",',
			'			func() string { return fmt.Sprintf("%d", PredictKNN(1, unitX1, unitY, []float64{1.4, 1.15})) }},',
			'		{"units v2 (feature 1 scaled 100x): SAME geometry, but the big feature dominates — predicts 1",',
			'			"1",',
			'			func() string { return fmt.Sprintf("%d", PredictKNN(1, unitX2, unitY, []float64{1.4, 115})) }},',
			'		{"k=100 on 6 points: capped at the dataset size, no panic — full vote is 3-3, tie -> 0",',
			'			"0",',
			'			func() string { return fmt.Sprintf("%d", PredictKNN(100, trainX, trainY, q)) }},',
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
			'// Euclidean is the L2 distance. Iterating to min(len(a), len(b))',
			'// keeps the function total on ragged input instead of panicking —',
			'// the contract promised by the doc comment. The squared differences',
			'// are what make units matter: a feature measured in a 100x-larger',
			'// unit contributes 10,000x more to the sum.',
			'func Euclidean(a, b []float64) float64 {',
			'	n := len(a)',
			'	if len(b) < n {',
			'		n = len(b)',
			'	}',
			'	sum := 0.0',
			'	for i := 0; i < n; i++ {',
			'		d := a[i] - b[i]',
			'		sum += d * d',
			'	}',
			'	return math.Sqrt(sum)',
			'}',
			'',
			'// Neighbors returns the k nearest training indices, ordered by',
			'// (distance, then index).',
			'//',
			'// Distances are computed once up front — recomputing inside the sort',
			'// comparator would turn O(n) distance work into O(n log n).',
			'// sort.Slice is NOT stable, so the determinism contract cannot lean',
			'// on input order; the explicit index tie-break makes the comparator',
			'// a total order, which is what actually pins the result.',
			'func Neighbors(k int, trainX [][]float64, x []float64) []int {',
			'	idx := make([]int, len(trainX))',
			'	dist := make([]float64, len(trainX))',
			'	for i := range trainX {',
			'		idx[i] = i',
			'		dist[i] = Euclidean(trainX[i], x)',
			'	}',
			'	sort.Slice(idx, func(a, b int) bool {',
			'		ia, ib := idx[a], idx[b]',
			'		if dist[ia] != dist[ib] {',
			'			return dist[ia] < dist[ib]',
			'		}',
			'		return ia < ib // exact distance tie: lower index first',
			'	})',
			'	// Clamp k into [0, n] so oversized or negative k never panics —',
			'	// "k larger than the dataset" simply means "use everything".',
			'	if k > len(idx) {',
			'		k = len(idx)',
			'	}',
			'	if k < 0 {',
			'		k = 0',
			'	}',
			'	return idx[:k]',
			'}',
			'',
			'// PredictKNN is majority vote over the k nearest labels.',
			'//',
			'// The tie-break (smallest label wins) is implemented structurally:',
			'// candidate labels are visited in ascending order and only a STRICT',
			'// improvement replaces the current best, so the first (smallest)',
			'// label of any tied group sticks. Iterating the vote map directly',
			'// would be a determinism bug — Go randomizes map iteration order on',
			'// purpose, and a model whose predictions vary run-to-run is a',
			'// production incident, not a model.',
			'func PredictKNN(k int, trainX [][]float64, trainY []int, x []float64) int {',
			'	nb := Neighbors(k, trainX, x)',
			'	if len(nb) == 0 {',
			'		return 0 // documented convention: nothing to vote with',
			'	}',
			'	votes := map[int]int{}',
			'	for _, i := range nb {',
			'		votes[trainY[i]]++',
			'	}',
			'	labels := make([]int, 0, len(votes))',
			'	for l := range votes {',
			'		labels = append(labels, l)',
			'	}',
			'	sort.Ints(labels)',
			'	best, bestVotes := 0, -1',
			'	for _, l := range labels {',
			'		if votes[l] > bestVotes {',
			'			best, bestVotes = l, votes[l]',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The curse of dimensionality</h3>' +
			'<p>kNN&rsquo;s Achilles heel is not speed &mdash; it is geometry. As ' +
			'dimensions grow, pairwise distances <em>concentrate</em>: the gap ' +
			'between the nearest and farthest neighbor shrinks relative to their ' +
			'absolute magnitude, until &ldquo;nearest&rdquo; is barely more ' +
			'meaningful than &ldquo;random.&rdquo; In 2-D your query&rsquo;s ' +
			'neighborhood is a tidy disk; in 1000-D almost all of the volume of ' +
			'that disk sits in a thin shell at its boundary, and every point is ' +
			'roughly equally far from every other. This is why raw kNN on ' +
			'high-dimensional inputs (pixels, one-hot bags of words) disappoints, ' +
			'and why it comes back to life after a dimensionality reduction (PCA ' +
			'&mdash; a later item) or on <em>learned embeddings</em>, which pack ' +
			'meaning into a few hundred well-behaved dimensions.</p>' +
			'<h3>From brute force to production: kd-trees and ANN</h3>' +
			'<p>The implementation here scans all n points per query &mdash; ' +
			'sklearn&rsquo;s <code>KNeighborsClassifier(algorithm=&quot;brute&quot;)' +
			'</code>. Classic speedups: <strong>kd-trees</strong> and ball trees ' +
			'prune the scan to O(log n) in low dimensions but degrade to brute ' +
			'force past ~20 dimensions (that curse again). Modern practice gives ' +
			'up exactness for <strong>approximate nearest neighbor</strong> ' +
			'search: HNSW graphs (hnswlib, Faiss, and inside every vector ' +
			'database &mdash; pgvector, Pinecone, Qdrant), which navigate a ' +
			'multi-layer small-world graph to find near-nearest neighbors in ' +
			'sub-millisecond time over billions of vectors. That machinery is ' +
			'kNN &mdash; the algorithm you just wrote is the semantic-search ' +
			'core of the RAG item later in this track, with cosine similarity ' +
			'swapped in for Euclidean distance.</p>' +
			'<h3>What bites in practice</h3>' +
			'<p>Three field notes. <strong>Scaling is not optional:</strong> the ' +
			'units pair in the harness is the most common real kNN bug &mdash; ' +
			'one feature in cents and another in years means the model only sees ' +
			'cents; standardize features first (next category&rsquo;s ' +
			'feature-scaling item shows how, and where the train/test leakage ' +
			'hides). <strong>k is a bias&ndash;variance dial:</strong> k=1 ' +
			'memorizes noise (zero training error, high variance), k=n predicts ' +
			'the majority class everywhere (pure bias); tune k on a validation ' +
			'split, odd k avoids binary ties. <strong>Lazy learning has a ' +
			'cost model inverted from parametric models:</strong> training is ' +
			'free but every query costs O(n&middot;d) and the whole training set ' +
			'lives in memory forever &mdash; the opposite trade of the ' +
			'regression models earlier in this track, and the reason interviews ' +
			'love the question &ldquo;when would you NOT use kNN?&rdquo; ' +
			'(large n at query time, high d, or when you need calibrated ' +
			'probabilities and interpretable coefficients).</p>',
		],
		complexity: { time: 'O(n·d + n log n) per query — n distances of dimension d, then a sort', space: 'O(n) for the index/distance arrays (plus the memorized training set itself)' },
	});
})();
