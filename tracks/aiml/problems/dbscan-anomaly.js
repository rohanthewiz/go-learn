/* DBSCAN & Anomaly Detection — Unsupervised Learning (Medium). Density-based
 * clustering: core points (eps-neighborhood of at least minPts) grow clusters
 * by FIFO expansion; everything no cluster reaches is noise, label -1 — which
 * is exactly what an anomaly detector wants to report. The harness pins a
 * loose blob, a denser blob, a border point that is adopted without being
 * core, and three outliers — then shows eps and minPts each redrawing the
 * map.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// Core / border / noise: the three roles a point can play. Ids namespaced
	// with AIDB because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 220" width="520" height="220" role="img" aria-label="DBSCAN roles: a core point has at least minPts neighbors within eps and grows the cluster; a border point is inside a core point&apos;s neighborhood but not core itself; a noise point is reached by nobody and stays labeled -1">' +
		'<text x="20" y="24" class="lbl">minPts=4: a cluster is grown from CORE points; noise is whatever nobody reaches</text>' +
		// eps-neighborhood of the core point
		'<circle cx="150" cy="120" r="62" fill="none" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="5 4"/>' +
		'<circle cx="150" cy="120" r="5" fill="var(--accent)"/>' +
		'<circle cx="118" cy="96" r="4" fill="var(--accent)"/>' +
		'<circle cx="176" cy="90" r="4" fill="var(--accent)"/>' +
		'<circle cx="122" cy="150" r="4" fill="var(--accent)"/>' +
		'<text x="150" y="200" text-anchor="middle" class="lbl">core: 5 points within eps (incl. itself) — grows the cluster</text>' +
		// border point on the rim: inside the core's eps, but its own neighborhood is sparse
		'<circle cx="205" cy="105" r="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<path d="M 236 64 L 212 98" fill="none" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowAIDB)"/>' +
		'<text x="240" y="58" class="lbl">border: reached by a core point,</text>' +
		'<text x="240" y="74" class="lbl">but not core itself — joins, cannot grow</text>' +
		// noise point, far away
		'<circle cx="420" cy="150" r="4" fill="var(--warn)"/>' +
		'<text x="420" y="178" text-anchor="middle" class="lbl" style="fill:var(--warn)">noise: label -1 — the anomaly</text>' +
		'<defs><marker id="dgArrowAIDB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'dbscan-anomaly',
		title: 'DBSCAN & Anomaly Detection',
		nav: 'DBSCAN',
		difficulty: 'Medium',
		category: 'Unsupervised Learning',
		task: 'Implement RegionQuery and DBSCAN — density-based clustering where points no cluster reaches are labeled -1: the anomalies.',

		prose: [
			'<h2>DBSCAN &amp; Anomaly Detection</h2>' +
			'<p>Payments telemetry: millions of transactions where almost ' +
			'everything falls into a few dense behavioral clumps, and the rows ' +
			'worth waking someone up for are the ones that sit in <em>no</em> ' +
			'clump. k-means (previous item) is structurally unable to say that — ' +
			'it assigns EVERY point to its nearest centroid, so a fraudulent ' +
			'outlier gets filed into an ordinary cluster and quietly drags the ' +
			'centroid toward itself. DBSCAN flips the definition: a cluster is a ' +
			'<em>region dense enough in points</em>, discovered by walking ' +
			'neighbor-to-neighbor, and anything density never reaches is ' +
			'<strong>noise, label −1</strong> — a first-class answer, and exactly ' +
			'the output an anomaly detector wants. No k to choose, either: the ' +
			'number of clusters falls out of the data.</p>' +
			'<p>Two parameters replace k, and three roles follow from them:</p>' +
			'<ul>' +
			'<li><strong>eps-neighborhood.</strong> <code>RegionQuery(points, i, ' +
			'eps)</code> = indices of all points within Euclidean distance ' +
			'<strong>≤ eps</strong> of point i — boundary INCLUSIVE, and always ' +
			'including i itself (a point is its own neighbor).</li>' +
			'<li><strong>Core point:</strong> neighborhood size ≥ minPts. Only ' +
			'core points grow a cluster. <strong>Border point:</strong> inside ' +
			'some core point\'s neighborhood, but not core itself — it joins the ' +
			'cluster without expanding it. <strong>Noise:</strong> neither — ' +
			'label −1.</li>' +
			'<li><strong>Expansion.</strong> Scan points in index order. An ' +
			'unvisited core point founds the next cluster (ids 0, 1, 2… in ' +
			'discovery order) and pushes its neighbors onto a FIFO queue; each ' +
			'dequeued point joins the cluster, and if IT is core too, its own ' +
			'neighbors are appended. Density flows through core points only — ' +
			'that is the entire algorithm.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>The harness pins this 14-point world — a loose 5-point blob (its ' +
			'rightmost member only <em>borders</em> the cluster), a denser ' +
			'6-point blob, and three scattered outliers:</p>',
			{ lang: 'txt', code: 'index   0..4  blob A: (1,1) (2,1) (1,2) (2,2) (3,1)     <- (3,1) has only 3 neighbors\nindex   5..10 blob B: (8,8) (9,8) (10,8) (8,9) (9,9) (10,9)\nindex  11..13 outliers: (5,5) (12,1) (1,12)\n\neps=1.5 minPts=4  ->  [0 0 0 0 0 1 1 1 1 1 1 -1 -1 -1]\neps=0.5 minPts=4  ->  all -1 (nothing is dense at that radius)\neps=1.5 minPts=6  ->  [-1 -1 -1 -1 -1 0 0 0 0 0 0 -1 -1 -1]\n                      blob A dissolves; denser blob B survives and is now cluster 0' },
			'<p>Note what happens to point 4 = (3,1) in the main case: its own ' +
			'neighborhood is just {1, 3, 4} — three points, below minPts — so it ' +
			'can never found or grow a cluster. But it lies within eps of core ' +
			'point (2,1), so the expansion adopts it: a border point. And in the ' +
			'minPts=6 run, cluster numbering restarts at the first cluster ' +
			'actually <em>discovered</em> — blob B becomes cluster 0 because blob ' +
			'A no longer clusters at all.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>RegionQuery</code> and <code>DBSCAN</code> exactly ' +
			'as the starter doc comments specify — the scan order, FIFO queue, and ' +
			'noise-adoption rule are what make every run land on the same pinned ' +
			'labels. One disclosed simplification: this RegionQuery is a brute ' +
			'force O(n) scan per call; real implementations back it with a ' +
			'spatial index (see the explanation).</p>' +
			'<div class="tip">A noise label is <em>provisional</em> during the ' +
			'scan: a point labeled −1 early can be adopted as a border point ' +
			'later, when a neighbor scanned after it turns out to be core (in the ' +
			'minPts=6 run, point 5 is provisionally noise until core point 6 ' +
			'founds the cluster and adopts it). Whether a point ends up noise ' +
			'depends only on the data and parameters — never on scan order. ' +
			'Cluster NUMBERING is scan-order-dependent in any DBSCAN ' +
			'implementation; only the fixed index order here makes it ' +
			'reproducible.</div>',
		],

		starter: [
			'package main',
			'',
			'// RegionQuery returns the indices of every point within Euclidean',
			'// distance eps of points[i], in ascending index order.',
			'//',
			'//   - boundary INCLUSIVE: distance == eps counts',
			'//   - i itself is always included (distance 0)',
			'func RegionQuery(points [][]float64, i int, eps float64) []int {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// DBSCAN clusters points by density and returns one label per point:',
			'// cluster ids 0, 1, 2, ... or -1 for noise.',
			'//',
			'// Deterministic contract (the pinned tests depend on it):',
			'//   - scan candidate points in index order 0..n-1, skipping any point',
			'//     already labeled',
			'//   - a scanned point with fewer than minPts neighbors (RegionQuery',
			'//     count, self included) is labeled -1 — PROVISIONALLY: it may be',
			'//     adopted by a later cluster as a border point',
			'//   - a scanned point with >= minPts neighbors is CORE: it founds the',
			'//     next cluster (ids assigned 0,1,2,... in discovery order) and its',
			'//     neighbors go onto a FIFO queue',
			'//   - expansion pops the queue front: a point labeled -1 is adopted',
			'//     into the cluster (border); an unvisited point is labeled with',
			'//     the cluster and, if IT has >= minPts neighbors, its neighbors',
			'//     are APPENDED to the queue (points already in a cluster are',
			'//     left alone)',
			'//',
			'// Use an internal "unvisited" marker distinct from -1 (e.g. -2) so',
			'// provisional noise and never-seen points stay distinguishable.',
			'func DBSCAN(points [][]float64, eps float64, minPts int) []int {',
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
			'	// A loose blob (0-4, with 4=(3,1) only border-close), a denser 3x2',
			'	// blob (5-10), and three scattered outliers (11-13).',
			'	pts := [][]float64{',
			'		{1, 1}, {2, 1}, {1, 2}, {2, 2}, {3, 1},',
			'		{8, 8}, {9, 8}, {10, 8}, {8, 9}, {9, 9}, {10, 9},',
			'		{5, 5}, {12, 1}, {1, 12},',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"RegionQuery includes the point itself: (1,1) plus its three neighbors within 1.5",',
			'			"[0 1 2 3]",',
			'			func() string { return fmt.Sprint(RegionQuery(pts, 0, 1.5)) }},',
			'		{"boundary is INCLUSIVE: at eps=1.0 the points at distance exactly 1.0 still count",',
			'			"[0 1 3 4]",',
			'			func() string { return fmt.Sprint(RegionQuery(pts, 1, 1.0)) }},',
			'		{"(3,1) is NOT core: only 3 neighbors within eps=1.5, below minPts=4",',
			'			"[1 3 4]",',
			'			func() string { return fmt.Sprint(RegionQuery(pts, 4, 1.5)) }},',
			'		{"eps=1.5 minPts=4: two clusters in discovery order, outliers labeled -1",',
			'			"[0 0 0 0 0 1 1 1 1 1 1 -1 -1 -1]",',
			'			func() string { return fmt.Sprint(DBSCAN(pts, 1.5, 4)) }},',
			'		{"border point: (3,1) is adopted into cluster 0 WITHOUT being core — density flows to it, not through it",',
			'			"core=false label=0",',
			'			func() string {',
			'				labels := DBSCAN(pts, 1.5, 4)',
			'				if len(labels) != 14 {',
			'					return "wrong length"',
			'				}',
			'				return fmt.Sprintf("core=%v label=%d", len(RegionQuery(pts, 4, 1.5)) >= 4, labels[4])',
			'			}},',
			'		{"anomaly report: exactly the three scattered points end up with label -1",',
			'			"[11 12 13]",',
			'			func() string {',
			'				labels := DBSCAN(pts, 1.5, 4)',
			'				if len(labels) != 14 {',
			'					return "wrong length"',
			'				}',
			'				noise := []int{}',
			'				for i, l := range labels {',
			'					if l == -1 {',
			'						noise = append(noise, i)',
			'					}',
			'				}',
			'				return fmt.Sprint(noise)',
			'			}},',
			'		{"eps too small (0.5): nothing is dense, EVERY point is noise",',
			'			"[-1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1 -1]",',
			'			func() string { return fmt.Sprint(DBSCAN(pts, 0.5, 4)) }},',
			'		{"minPts raised to 6: the loose blob dissolves into noise; the denser blob survives and is renumbered cluster 0",',
			'			"[-1 -1 -1 -1 -1 0 0 0 0 0 0 -1 -1 -1]",',
			'			func() string { return fmt.Sprint(DBSCAN(pts, 1.5, 6)) }},',
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
			'// euclid is plain Euclidean distance. DBSCAN compares against eps,',
			'// so an optimized version would compare SQUARED distance to eps*eps',
			'// and skip the sqrt; the plain form keeps the <= eps contract',
			'// readable and exact for the pinned boundary case.',
			'func euclid(a, b []float64) float64 {',
			'	s := 0.0',
			'	for i := range a {',
			'		d := a[i] - b[i]',
			'		s += d * d',
			'	}',
			'	return math.Sqrt(s)',
			'}',
			'',
			'// RegionQuery is the density probe: everything within eps of point i,',
			'// inclusive of the boundary and of i itself. Self-inclusion matters',
			'// for the core test — minPts counts the point too, matching the',
			'// original DBSCAN paper (and sklearn). Brute force O(n) per call;',
			'// production implementations answer this from a kd-tree/ball-tree.',
			'func RegionQuery(points [][]float64, i int, eps float64) []int {',
			'	out := []int{}',
			'	// Index order in, index order out: j ascends, so the returned',
			'	// neighbor list is already sorted — determinism for free.',
			'	for j := range points {',
			'		if euclid(points[i], points[j]) <= eps {',
			'			out = append(out, j)',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// DBSCAN grows clusters by breadth-first expansion from core points.',
			'// Three-state labeling: unvisited (-2), noise (-1), or a cluster id.',
			'// The -2/-1 distinction is load-bearing: noise is PROVISIONAL (a',
			'// later cluster may adopt the point as border), while a point',
			'// already inside a cluster must never be relabeled.',
			'func DBSCAN(points [][]float64, eps float64, minPts int) []int {',
			'	const unvisited = -2',
			'	labels := make([]int, len(points))',
			'	for i := range labels {',
			'		labels[i] = unvisited',
			'	}',
			'	next := 0 // next cluster id — assigned in discovery order',
			'	for i := range points {',
			'		if labels[i] != unvisited {',
			'			continue // already clustered, or provisionally noise',
			'		}',
			'		neighbors := RegionQuery(points, i, eps)',
			'		if len(neighbors) < minPts {',
			'			// Not core. Mark noise for now — if some later core point',
			'			// reaches it, the expansion below adopts it as border.',
			'			labels[i] = -1',
			'			continue',
			'		}',
			'		// i is core: found the next cluster and expand it fully',
			'		// before the outer scan moves on. FIFO order (a queue, not a',
			'		// stack) is part of this item\'s determinism contract.',
			'		c := next',
			'		next++',
			'		labels[i] = c',
			'		queue := append([]int(nil), neighbors...)',
			'		for len(queue) > 0 {',
			'			j := queue[0]',
			'			queue = queue[1:]',
			'			if labels[j] == -1 {',
			'				// Provisional noise reached by density: border point.',
			'				// It joins the cluster but is NOT re-expanded — the',
			'				// core test below is guarded by the unvisited check.',
			'				labels[j] = c',
			'			}',
			'			if labels[j] != unvisited {',
			'				continue // already settled (this cluster or an earlier one)',
			'			}',
			'			labels[j] = c',
			'			nj := RegionQuery(points, j, eps)',
			'			if len(nj) >= minPts {',
			'				// j is core too: density flows THROUGH it. Border',
			'				// points (the else-case) absorb density but never',
			'				// transmit it — that asymmetry is what stops a',
			'				// cluster from leaking outward through its rim.',
			'				queue = append(queue, nj...)',
			'			}',
			'		}',
			'	}',
			'	// Everything still unvisited was never scanned as core and never',
			'	// adopted — but the scan visits every index, so by now each label',
			'	// is either a cluster id or -1. (No pass needed: the loop above',
			'	// labels every point it scans.)',
			'	return labels',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Density vs. centroids</h3>' +
			'<p>k-means partitions space into convex Voronoi cells around ' +
			'centroids — it literally cannot represent a ring, two interleaved ' +
			'moons, or a snake-shaped cluster, and it has no vocabulary for ' +
			'"none of the above". DBSCAN\'s cluster definition — a maximal set of ' +
			'density-connected points — handles arbitrary shapes (the classic ' +
			'sklearn moons/circles demos) and returns noise as a first-class ' +
			'label. The trade: k-means needs k, DBSCAN needs eps and minPts, and ' +
			'a single global eps is DBSCAN\'s own blind spot — a dataset with one ' +
			'tight clump and one diffuse clump has no eps that serves both, which ' +
			'is exactly what the harness\'s minPts=6 case demonstrates in ' +
			'miniature (the loose blob dies, the dense one survives).</p>' +
			'<h3>Choosing eps and minPts, and the production toolchain</h3>' +
			'<p>The standard recipe for eps is the <strong>k-distance plot</strong>: ' +
			'for every point compute the distance to its k-th nearest neighbor ' +
			'(k = minPts − 1), sort descending, and look for the knee — the ' +
			'distance where the curve bends is the radius separating "inside a ' +
			'cluster" from "between clusters". For minPts the folk rule is at ' +
			'least dim + 1, more commonly 2·dim, raised further for noisy data. ' +
			'sklearn\'s <code>DBSCAN</code> backs RegionQuery with a ball tree or ' +
			'kd-tree, turning the naive O(n²) pairwise scan into roughly ' +
			'O(n log n) — same algorithm, indexed probe. The modern successor is ' +
			'<strong>HDBSCAN</strong>, which effectively runs DBSCAN over ALL eps ' +
			'values at once, builds a cluster hierarchy, and keeps the stable ' +
			'clusters — solving the one-global-eps problem and leaving only ' +
			'minPts to choose; it has become the default density clusterer (and ' +
			'the standard companion to UMAP for clustering embeddings).</p>' +
			'<h3>DBSCAN as an anomaly detector</h3>' +
			'<p>In production, the −1 label is often the entire point of running ' +
			'DBSCAN: fraud rings show up as unexpected dense clumps of ' +
			'coordinated accounts while one-off fraud lands in noise; intrusion ' +
			'detection clusters normal traffic patterns and alerts on what falls ' +
			'outside; sensor-fault triage separates systematic drift (a new ' +
			'cluster) from glitches (noise). Two operational cautions. First, ' +
			'DBSCAN is distance-based, so unscaled features corrupt it exactly as ' +
			'they corrupt kNN and k-means — standardize first. Second, in high ' +
			'dimensions distances concentrate (the curse-of-dimensionality lesson ' +
			'from the kNN item) and the density contrast DBSCAN depends on fades ' +
			'— the usual fix is to cluster in a reduced space: PCA (previous ' +
			'item) or UMAP first, then density clustering. Alternatives worth ' +
			'knowing by name for the anomaly use-case specifically: Isolation ' +
			'Forest and Local Outlier Factor (LOF) — LOF is essentially DBSCAN\'s ' +
			'density idea turned into a per-point outlier score.</p>',
		],
		complexity: { time: 'O(n² · d) — each point\'s RegionQuery scans all n points (an index makes it ~O(n log n))', space: 'O(n) for labels and the expansion queue' },
	});
})();
