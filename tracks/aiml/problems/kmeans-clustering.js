/* k-Means Clustering — Unsupervised Learning (Medium). Lloyd\'s algorithm:
 * assign each point to its nearest centroid, move each centroid to the mean
 * of its members, repeat to a fixpoint. The harness pins a worked 3-blob
 * dataset where a good init recovers the blobs in 2 updates — and a bad init
 * converges just as confidently to a fixpoint with 17x the inertia: the
 * local-optimum lesson, as a test case.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// The two-step loop: assignment pulls points to centroids, update pulls
	// centroids to the mean of their points. Ids namespaced with AIKM because
	// every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="k-means: points assigned to the nearest centroid; each centroid then moves to the mean of its assigned points; repeat until assignments stop changing">' +
		'<text x="20" y="24" class="lbl">assign points to nearest centroid, move centroid to the mean — repeat</text>' +
		// left blob
		'<circle cx="80" cy="110" r="4" fill="var(--accent)"/>' +
		'<circle cx="110" cy="100" r="4" fill="var(--accent)"/>' +
		'<circle cx="95" cy="140" r="4" fill="var(--accent)"/>' +
		'<circle cx="125" cy="130" r="4" fill="var(--accent)"/>' +
		// right blob
		'<circle cx="360" cy="80" r="4" fill="var(--accent)"/>' +
		'<circle cx="390" cy="70" r="4" fill="var(--accent)"/>' +
		'<circle cx="375" cy="110" r="4" fill="var(--accent)"/>' +
		'<circle cx="405" cy="100" r="4" fill="var(--accent)"/>' +
		// initial centroids (off-center) and their moves to the blob means
		'<path d="M 180 150 L 112 122" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="4 3" marker-end="url(#dgArrowAIKM)"/>' +
		'<path d="M 300 160 L 378 94" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="4 3" marker-end="url(#dgArrowAIKM)"/>' +
		'<text x="185" y="163" class="lbl" style="fill:var(--warn)">init centroid</text>' +
		'<text x="255" y="180" class="lbl" style="fill:var(--warn)">init centroid</text>' +
		'<text x="60" y="90" class="lbl">update: centroid jumps to the mean of its members</text>' +
		'<text x="20" y="200" class="lbl">stop when an update leaves every assignment unchanged — a fixpoint (a LOCAL optimum)</text>' +
		'<defs><marker id="dgArrowAIKM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'kmeans-clustering',
		title: 'k-Means Clustering',
		nav: 'k-means',
		difficulty: 'Medium',
		category: 'Unsupervised Learning',
		task: 'Implement AssignClusters, UpdateCentroids, the KMeans fixpoint loop, and Inertia — then watch a bad init converge to a worse answer.',

		prose: [
			'<h2>k-Means Clustering</h2>' +
			'<p>Product hands you 40,000 user sessions and asks for "the segments." ' +
			'There is no label column — nobody tagged sessions as <em>power user</em> ' +
			'or <em>churn risk</em>; the job is to discover structure, not predict a ' +
			'target. This is unsupervised learning, and the tool everyone reaches ' +
			'for first is k-means: pick k centroids, then alternate two steps until ' +
			'nothing moves.</p>' +
			'<ul>' +
			'<li><strong>Assign.</strong> Each point joins its nearest centroid by ' +
			'Euclidean distance. Comparing <em>squared</em> distances gives the same ' +
			'winner and skips the square root. Tie: the LOWER centroid index wins.</li>' +
			'<li><strong>Update.</strong> Each centroid moves to the mean of the ' +
			'points assigned to it — the mean is exactly the point that minimizes ' +
			'the summed squared distance to its members. A centroid that attracted ' +
			'NO points keeps its previous position (dividing by zero members is the ' +
			'classic crash; parking the centroid is the simplest fix).</li>' +
			'<li><strong>Stop.</strong> When an update leaves every assignment ' +
			'unchanged, the algorithm has reached a fixpoint: no step can improve ' +
			'it further. The quality score is <strong>inertia</strong> — the sum of ' +
			'squared distances from each point to its assigned centroid.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>Here is the full run the harness pins. Twelve points in three blobs ' +
			'whose true means are (1.5,1.5), (8.5,1.5), (5,7.5), starting from a ' +
			'mediocre-but-workable init:</p>',
			{ lang: 'txt', code: 'points  A=(1,1)(2,1)(1,2)(2,2)   B=(8,1)(9,1)(8,2)(9,2)   C=(4.5,7)(5.5,7)(4.5,8)(5.5,8)\ninit      c0=(1,1)      c1=(4,4)      c2=(9,9)\nassign    A-c0   B plus 3 of C-c1   only (5.5,8)-c2     init misfiles 4 points\nupdate 1  c0=(1.50,1.50)  c1=(6.93,4.00)  c2=(5.50,8.00)\nassign    A-c0   B-c1   C-c2                            labels changed, keep going\nupdate 2  c0=(1.50,1.50)  c1=(8.50,1.50)  c2=(5.00,7.50)\nassign    unchanged: converged in 2 updates, inertia 6.00' },
			'<p>Now the lesson that costs real money in production: start the SAME ' +
			'data from centroids (1,1), (2,2), (6,4) and k-means converges — just ' +
			'as confidently, in one update — to a fixpoint that splits blob A in ' +
			'two and merges B with C, with inertia <strong>101.83</strong> instead ' +
			'of 6.00. Each step of k-means can only decrease inertia, which is why ' +
			'it always converges — and also why it can never climb OUT of a bad ' +
			'basin. The algorithm gives you no warning; only comparing inertia ' +
			'across restarts reveals it.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>AssignClusters</code>, <code>UpdateCentroids</code>, ' +
			'the <code>KMeans</code> loop (returns final centroids, labels, and the ' +
			'number of updates performed), and <code>Inertia</code>. The doc ' +
			'comments pin every convention — tie-breaks, the empty-cluster rule, ' +
			'and what "iterations" counts.</p>' +
			'<div class="tip">Why does the update step use the mean? Because the ' +
			'mean is the unique minimizer of summed squared distance to a set of ' +
			'points — so BOTH steps of k-means are coordinate descent on the same ' +
			'inertia objective. Assignment optimizes labels with centroids fixed; ' +
			'update optimizes centroids with labels fixed. Monotone descent on a ' +
			'finite set of labelings is the entire convergence proof.</div>',
		],

		starter: [
			'package main',
			'',
			'// AssignClusters returns, for each point, the index of its nearest',
			'// centroid by Euclidean distance. Compare SQUARED distances (the',
			'// ordering is identical and needs no square root). On an exact tie,',
			'// the LOWER centroid index wins. len(result) == len(points).',
			'func AssignClusters(points, centroids [][]float64) []int {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// UpdateCentroids returns k new centroids (k = len(centroids)), each',
			'// the coordinate-wise MEAN of the points whose label selects it.',
			'// A cluster with zero assigned points keeps its previous centroid',
			'// unchanged (copy it — do not divide by zero). The input slices are',
			'// not modified.',
			'func UpdateCentroids(points [][]float64, labels []int, centroids [][]float64) [][]float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// KMeans runs Lloyd\'s algorithm from initCentroids and returns',
			'// (finalCentroids, labels, updates):',
			'//',
			'//   labels = AssignClusters(points, centroids)',
			'//   repeat while updates < maxIter:',
			'//     centroids = UpdateCentroids(...); updates++',
			'//     newLabels = AssignClusters(...)',
			'//     if newLabels == labels: stop (fixpoint)   else labels = newLabels',
			'//',
			'// updates counts UpdateCentroids calls, so a run that starts at a',
			'// fixpoint still performs exactly 1 confirming update. initCentroids',
			'// must not be mutated (copy before updating).',
			'func KMeans(points, initCentroids [][]float64, maxIter int) ([][]float64, []int, int) {',
			'	// your code here',
			'	return nil, nil, 0',
			'}',
			'',
			'// Inertia is the k-means objective: the sum over all points of the',
			'// SQUARED Euclidean distance to the point\'s assigned centroid.',
			'func Inertia(points, centroids [][]float64, labels []int) float64 {',
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
			'	// Three square blobs whose true means are (1.5,1.5), (8.5,1.5), (5,7.5).',
			'	points := [][]float64{',
			'		{1, 1}, {2, 1}, {1, 2}, {2, 2},',
			'		{8, 1}, {9, 1}, {8, 2}, {9, 2},',
			'		{4.5, 7}, {5.5, 7}, {4.5, 8}, {5.5, 8},',
			'	}',
			'	goodInit := [][]float64{{1, 1}, {4, 4}, {9, 9}}',
			'	badInit := [][]float64{{1, 1}, {2, 2}, {6, 4}}',
			'	// fmtC renders centroids at 2 decimals so float comparisons are',
			'	// string comparisons, never raw float equality.',
			'	fmtC := func(cs [][]float64) string {',
			'		s := "["',
			'		for j, c := range cs {',
			'			if j > 0 {',
			'				s += " "',
			'			}',
			'			if len(c) < 2 {',
			'				s += "(?)"',
			'				continue',
			'			}',
			'			s += fmt.Sprintf("(%.2f,%.2f)", c[0], c[1])',
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
			'		{"assign: every point to its nearest centroid — the init misfiles 3 of blob C plus all of B into c1",',
			'			"[0 0 0 0 1 1 1 1 1 1 1 2]",',
			'			func() string { return fmt.Sprint(AssignClusters(points, goodInit)) }},',
			'		{"assign tie: a point equidistant from two centroids goes to the LOWER index",',
			'			"[0]",',
			'			func() string {',
			'				return fmt.Sprint(AssignClusters([][]float64{{5, 0}}, [][]float64{{4, 0}, {6, 0}}))',
			'			}},',
			'		{"update: each centroid jumps to the mean of its assigned points",',
			'			"[(1.50,1.50) (6.93,4.00) (5.50,8.00)]",',
			'			func() string {',
			'				return fmtC(UpdateCentroids(points, AssignClusters(points, goodInit), goodInit))',
			'			}},',
			'		{"update: an EMPTY cluster keeps its previous centroid — no divide-by-zero, no NaN",',
			'			"[(0.50,0.50) (100.00,100.00)]",',
			'			func() string {',
			'				return fmtC(UpdateCentroids(',
			'					[][]float64{{0, 0}, {1, 0}, {0, 1}, {1, 1}},',
			'					[]int{0, 0, 0, 0},',
			'					[][]float64{{0.5, 0.5}, {100, 100}}))',
			'			}},',
			'		{"full run, good init: converges to the true blob means in 2 updates",',
			'			"after 2 updates: [(1.50,1.50) (8.50,1.50) (5.00,7.50)]",',
			'			func() string {',
			'				cg, _, itg := KMeans(points, goodInit, 50)',
			'				return fmt.Sprintf("after %d updates: %s", itg, fmtC(cg))',
			'			}},',
			'		{"good fixpoint: labels recover the three blobs, inertia 6.00",',
			'			"[0 0 0 0 1 1 1 1 2 2 2 2] inertia 6.00",',
			'			func() string {',
			'				cg, lg, _ := KMeans(points, goodInit, 50)',
			'				return fmt.Sprintf("%v inertia %.2f", lg, Inertia(points, cg, lg))',
			'			}},',
			'		{"bad init, SAME data: a different fixpoint with 17x the inertia — k-means is a local search",',
			'			"[(1.33,1.33) (2.00,2.00) (6.75,4.50)] inertia 101.83",',
			'			func() string {',
			'				cb, lb, _ := KMeans(points, badInit, 50)',
			'				return fmt.Sprintf("%s inertia %.2f", fmtC(cb), Inertia(points, cb, lb))',
			'			}},',
			'		{"property: restarting FROM a fixpoint changes nothing — 1 confirming update, same centroids",',
			'			"after 1 update(s): [(1.50,1.50) (8.50,1.50) (5.00,7.50)]",',
			'			func() string {',
			'				cg, _, _ := KMeans(points, goodInit, 50)',
			'				cr, _, itr := KMeans(points, cg, 50)',
			'				return fmt.Sprintf("after %d update(s): %s", itr, fmtC(cr))',
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
			'// sqDist is the squared Euclidean distance. Squared on purpose: the',
			'// assignment step only needs an ORDERING over distances, and x -> x*x',
			'// is monotone on non-negatives, so the nearest centroid by squared',
			'// distance is the nearest centroid, with no math.Sqrt in the hot loop.',
			'func sqDist(a, b []float64) float64 {',
			'	sum := 0.0',
			'	for i := range a {',
			'		d := a[i] - b[i]',
			'		sum += d * d',
			'	}',
			'	return sum',
			'}',
			'',
			'// AssignClusters gives each point to its nearest centroid. Strict',
			'// less-than in the comparison is what implements the tie-break: a',
			'// later centroid at exactly the same distance never displaces the',
			'// earlier winner, so the lower index wins for free.',
			'func AssignClusters(points, centroids [][]float64) []int {',
			'	labels := make([]int, len(points))',
			'	for i, p := range points {',
			'		best := 0',
			'		bestD := sqDist(p, centroids[0])',
			'		for j := 1; j < len(centroids); j++ {',
			'			d := sqDist(p, centroids[j])',
			'			if d < bestD {',
			'				bestD = d',
			'				best = j',
			'			}',
			'		}',
			'		labels[i] = best',
			'	}',
			'	return labels',
			'}',
			'',
			'// UpdateCentroids moves each centroid to the mean of its members —',
			'// the mean being the unique minimizer of summed squared distance,',
			'// which is what makes this step a descent step on inertia. One pass',
			'// accumulates sums and counts; a second pass divides. An empty',
			'// cluster keeps its old centroid: dividing by a zero count would',
			'// produce NaN and silently poison every later iteration.',
			'func UpdateCentroids(points [][]float64, labels []int, centroids [][]float64) [][]float64 {',
			'	k := len(centroids)',
			'	dim := len(centroids[0])',
			'	sums := make([][]float64, k)',
			'	counts := make([]int, k)',
			'	for j := 0; j < k; j++ {',
			'		sums[j] = make([]float64, dim)',
			'	}',
			'	for i, p := range points {',
			'		c := labels[i]',
			'		counts[c]++',
			'		for d := 0; d < dim; d++ {',
			'			sums[c][d] += p[d]',
			'		}',
			'	}',
			'	out := make([][]float64, k)',
			'	for j := 0; j < k; j++ {',
			'		out[j] = make([]float64, dim)',
			'		if counts[j] == 0 {',
			'			// Park the empty centroid where it was. Fancier schemes',
			'			// re-seed it at the farthest point; parking is the',
			'			// simplest deterministic rule.',
			'			copy(out[j], centroids[j])',
			'			continue',
			'		}',
			'		for d := 0; d < dim; d++ {',
			'			out[j][d] = sums[j][d] / float64(counts[j])',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// sameLabels reports whether two assignments are identical — the',
			'// fixpoint test. Comparing labels (not centroid floats) is the',
			'// robust convergence check: labels are discrete, so no epsilon.',
			'func sameLabels(a, b []int) bool {',
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
			'// KMeans is Lloyd\'s algorithm: alternate assignment and update until',
			'// an update leaves the assignment unchanged. Both steps monotonically',
			'// decrease inertia and there are finitely many labelings, so the loop',
			'// always terminates — at a LOCAL optimum determined entirely by the',
			'// init (the harness\'s bad-init case converges to inertia 101.83).',
			'func KMeans(points, initCentroids [][]float64, maxIter int) ([][]float64, []int, int) {',
			'	// Deep-copy the init: the caller\'s slice must survive the run',
			'	// (the harness restarts from a previous result\'s centroids).',
			'	centroids := make([][]float64, len(initCentroids))',
			'	for j := range initCentroids {',
			'		centroids[j] = append([]float64(nil), initCentroids[j]...)',
			'	}',
			'	labels := AssignClusters(points, centroids)',
			'	updates := 0',
			'	for updates < maxIter {',
			'		centroids = UpdateCentroids(points, labels, centroids)',
			'		updates++',
			'		newLabels := AssignClusters(points, centroids)',
			'		changed := !sameLabels(newLabels, labels)',
			'		labels = newLabels',
			'		if !changed {',
			'			// Fixpoint: the update moved centroids to means and no',
			'			// point switched sides. Stability can only be OBSERVED',
			'			// after an update, hence the minimum of 1 update.',
			'			break',
			'		}',
			'	}',
			'	return centroids, labels, updates',
			'}',
			'',
			'// Inertia is the within-cluster sum of squares — the single number',
			'// k-means descends. Comparable only across runs on the SAME data and',
			'// k: adding clusters always lowers it (k = n gives 0), which is why',
			'// choosing k needs the elbow/silhouette methods, not raw inertia.',
			'func Inertia(points, centroids [][]float64, labels []int) float64 {',
			'	sum := 0.0',
			'	for i, p := range points {',
			'		sum += sqDist(p, centroids[labels[i]])',
			'	}',
			'	return sum',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Init is everything: k-means++</h3>' +
			'<p>The harness\'s bad-init case is not an artificial trap — random ' +
			'init lands in bad basins constantly, and on real data you cannot ' +
			'eyeball the fixpoint to notice. The production fix is ' +
			'<strong>k-means++</strong> (Arthur &amp; Vassilvitskii, 2007): pick ' +
			'the first centroid at random, then pick each next centroid with ' +
			'probability proportional to its squared distance from the nearest ' +
			'centroid chosen so far — spreading seeds across the data and giving ' +
			'an O(log k) expected-quality guarantee. It is the default in ' +
			'scikit-learn\'s <code>KMeans</code>, which ALSO runs the whole ' +
			'algorithm <code>n_init</code> times and keeps the lowest-inertia run ' +
			'— institutionalizing the restart-and-compare habit this item\'s case ' +
			'pair teaches. Your deterministic harness pins inits outright instead; ' +
			'the algorithm under test is identical.</p>' +
			'<h3>Choosing k, and what k-means assumes</h3>' +
			'<p>Inertia alone cannot choose k — it decreases monotonically until ' +
			'k&nbsp;=&nbsp;n gives zero. The <em>elbow method</em> plots inertia ' +
			'against k and looks for the bend; the <em>silhouette score</em> ' +
			'compares each point\'s cohesion to its separation and actually peaks ' +
			'at good k. Deeper assumption to internalize: the assignment step ' +
			'carves space into <strong>Voronoi cells</strong> — convex regions ' +
			'around centroids. k-means is exactly the hard-assignment special case ' +
			'of EM on spherical, equal-variance Gaussians, so it fails predictably ' +
			'on elongated clusters, unequal densities, and anything ring- or ' +
			'moon-shaped — no init can save it, because the model class cannot ' +
			'express the answer. That failure is the opening argument of the ' +
			'DBSCAN item. Also remember distances mean nothing across unscaled ' +
			'features: standardize first (the feature-scaling item), or the ' +
			'feature with the biggest units silently owns the clustering.</p>' +
			'<h3>At scale</h3>' +
			'<p><strong>Minibatch k-means</strong> (sklearn ' +
			'<code>MiniBatchKMeans</code>) updates centroids from small random ' +
			'batches with a per-centroid learning rate — slightly worse inertia, ' +
			'orders of magnitude faster, standard for millions of rows. The ' +
			'algorithm you just wrote is also load-bearing infrastructure in ' +
			'vector search: IVF indexes in FAISS and friends run k-means over ' +
			'embedding corpora to build coarse quantizers (cluster the vectors, ' +
			'search only the nearest cells), and product quantization runs many ' +
			'small k-means fits to compress vectors. When the embeddings item and ' +
			'the RAG item talk about vector databases, this loop is inside them.</p>',
		],
		complexity: { time: 'O(updates · n · k · d) — each round scans every point against every centroid', space: 'O(n + k·d) for labels and centroid accumulators' },
	});
})();
