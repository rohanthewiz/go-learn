/* PCA: Compressing Dimensions — Unsupervised Learning (Hard). Principal
 * component analysis from first principles: center, covariance (n-1), power
 * iteration to the top eigenvector, deflation for the second, explained
 * variance ratio, projection. The harness pins the classic 10-point 2-D
 * tutorial dataset — 96.3% of its variance lives along one direction — and
 * closes with the exact identity: 1-component reconstruction error equals
 * the variance you threw away, (n-1)·λ2.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// The variance ellipse and its principal axes. Ids namespaced with AIPCA
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="a correlated 2-D point cloud with its principal axes: the long axis PC1 carries most of the variance, the short axis PC2 carries the remainder">' +
		'<text x="20" y="24" class="lbl">eigenvectors of the covariance = the axes the data actually varies along</text>' +
		'<g transform="translate(230,120) rotate(-33)">' +
		'<ellipse cx="0" cy="0" rx="140" ry="34" fill="none" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="5 4" opacity="0.7"/>' +
		// sample points inside the ellipse
		'<circle cx="-110" cy="8" r="3" fill="var(--accent)"/>' +
		'<circle cx="-70" cy="-14" r="3" fill="var(--accent)"/>' +
		'<circle cx="-30" cy="18" r="3" fill="var(--accent)"/>' +
		'<circle cx="5" cy="-8" r="3" fill="var(--accent)"/>' +
		'<circle cx="45" cy="12" r="3" fill="var(--accent)"/>' +
		'<circle cx="85" cy="-16" r="3" fill="var(--accent)"/>' +
		'<circle cx="120" cy="6" r="3" fill="var(--accent)"/>' +
		// PC1 along the long axis, PC2 along the short axis
		'<path d="M 0 0 L 130 0" fill="none" stroke="var(--accent)" stroke-width="2.4" marker-end="url(#dgArrowAIPCA)"/>' +
		'<path d="M 0 0 L 0 -30" fill="none" stroke="var(--warn)" stroke-width="2.4" marker-end="url(#dgArrowWAIPCA)"/>' +
		'</g>' +
		'<text x="400" y="65" class="lbl" style="fill:var(--accent)">PC1: eigval 1.2840 (96.3%)</text>' +
		'<text x="150" y="70" class="lbl" style="fill:var(--warn)">PC2: eigval 0.0491 (3.7%)</text>' +
		'<text x="20" y="200" class="lbl">projecting onto PC1 keeps one number per point — and 96.3% of the variance</text>' +
		'<defs>' +
		'<marker id="dgArrowAIPCA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowWAIPCA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'pca-dimensionality',
		title: 'PCA: Compressing Dimensions',
		nav: 'PCA',
		difficulty: 'Hard',
		category: 'Unsupervised Learning',
		task: 'Implement Center, Covariance, PowerIteration, Deflate, ExplainedVarianceRatio, and Project — PCA from raw points to low-dimensional scores.',

		prose: [
			'<h2>PCA: Compressing Dimensions</h2>' +
			'<p>Your feature table has 40 columns and half of them move together — ' +
			'height correlates with weight, clicks with impressions, every latency ' +
			'percentile with every other. Models trained on it are slow and jumpy, ' +
			'distance-based methods (the kNN item) drown in redundant dimensions, ' +
			'and you cannot plot 40-D data to look at it. Principal component ' +
			'analysis answers one question: <em>along which directions does the ' +
			'data actually vary?</em> — then lets you keep only the few directions ' +
			'that matter.</p>' +
			'<ul>' +
			'<li><strong>Center.</strong> Subtract each column\'s mean. Variance is ' +
			'measured around the mean; skipping this step makes the "top ' +
			'component" point at the data\'s offset from the origin instead of its ' +
			'spread — a classic silent bug.</li>' +
			'<li><strong>Covariance.</strong> For centered data, ' +
			'<code>cov[a][b] = Σ x[i][a]·x[i][b] / (n−1)</code> — the SAMPLE ' +
			'covariance (divide by n−1, Bessel\'s correction), matching NumPy and ' +
			'sklearn. Diagonal entries are each column\'s variance; off-diagonals ' +
			'measure how columns move together.</li>' +
			'<li><strong>Power iteration.</strong> The top principal component is ' +
			'the covariance matrix\'s dominant eigenvector. Multiply any starting ' +
			'vector by the matrix and normalize, repeatedly: each multiply scales ' +
			'the eigen-directions by their eigenvalues, so the dominant one grows ' +
			'fastest and everything else dies off geometrically at rate ' +
			'|λ2/λ1|. The eigenvalue then falls out as the Rayleigh quotient ' +
			'<code>vᵀAv</code> (v unit-length).</li>' +
			'<li><strong>Deflation.</strong> Subtract the found component\'s share, ' +
			'<code>A − λ·vvᵀ</code>: the dominant direction\'s eigenvalue drops to ' +
			'0, so power iteration on the deflated matrix converges to the SECOND ' +
			'component. Repeat to get as many as you need.</li>' +
			'<li><strong>Project.</strong> A point\'s coordinates in the new basis ' +
			'are dot products of the centered point with each unit component — ' +
			'that dot-product-per-component is the whole "dimensionality ' +
			'reduction".</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>The harness pins this classic 10-point dataset (from Lindsay ' +
			'Smith\'s PCA tutorial — two correlated measurements per row):</p>',
			{ lang: 'txt', code: 'points  (2.5,2.4) (0.5,0.7) (2.2,2.9) (1.9,2.2) (3.1,3.0)\n        (2.3,2.7) (2.0,1.6) (1.0,1.1) (1.5,1.6) (1.1,0.9)\nmeans   x=1.81  y=1.91\ncov     [[0.6166 0.6154]\n         [0.6154 0.7166]]\nPC1     v1=(0.6779, 0.7352)   eigval 1.2840   96.32% of variance\nPC2     v2=(0.7352, -0.6779)  eigval 0.0491    3.68% of variance\nscores  point 0 projects to 0.8280 on PC1' },
			'<p>One wrinkle you must pin down: an eigenvector is only defined up to ' +
			'sign — v and −v span the same axis. This item\'s convention: flip the ' +
			'returned vector so its <strong>first non-zero component is ≥ 0</strong>. ' +
			'One disclosed simplification: real PCA libraries do NOT form the ' +
			'covariance matrix and power-iterate — they run SVD directly on the ' +
			'centered data (same answer, better numerics; see the explanation). ' +
			'Power iteration is the see-through version, and it is a real ' +
			'algorithm in its own right — it is how PageRank is computed.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Center</code>, <code>Covariance</code>, ' +
			'<code>PowerIteration</code>, <code>Deflate</code>, ' +
			'<code>ExplainedVarianceRatio</code>, and <code>Project</code>. The ' +
			'final harness case checks an exact identity: reconstructing every ' +
			'point from its PC1 score alone leaves a total squared error of ' +
			'exactly <code>(n−1)·λ2</code> — the variance you discarded is ' +
			'precisely the error you incur.</p>' +
			'<div class="tip">Power iteration\'s convergence rate is the eigenvalue ' +
			'ratio |λ2/λ1| per step. Here that is 0.0491/1.2840 ≈ 0.038 — each ' +
			'multiply crushes the off-axis remainder by 26×, so a handful of ' +
			'iterations nails 4 decimals. When the top two eigenvalues are nearly ' +
			'EQUAL the ratio approaches 1 and power iteration crawls — the data ' +
			'has no single dominant direction, and PCA\'s "top component" is ' +
			'barely meaningful there anyway.</div>',
		],

		starter: [
			'package main',
			'',
			'// Center returns a new matrix with each column\'s mean subtracted,',
			'// leaving every column with mean 0. The input is not modified.',
			'func Center(points [][]float64) [][]float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Covariance centers the points internally, then returns the d x d',
			'// SAMPLE covariance matrix: cov[a][b] = sum_i c[i][a]*c[i][b] / (n-1),',
			'// where c is the centered data. Divide by n-1 (Bessel\'s correction),',
			'// matching NumPy/sklearn. Assume n >= 2.',
			'func Covariance(points [][]float64) [][]float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// PowerIteration runs iters rounds of v = normalize(mat * v) starting',
			'// from v0, then returns (eigvec, eigval):',
			'//',
			'//   - each round: multiply, then divide by the Euclidean norm; if the',
			'//     norm is exactly 0, stop early and use v as-is (no panic)',
			'//   - SIGN CONVENTION: before returning, flip the whole vector if its',
			'//     first non-zero component is negative (eigenvectors are defined',
			'//     up to sign; this pins one answer)',
			'//   - eigval is the Rayleigh quotient vT * mat * v of the final unit v',
			'//',
			'// v0 is not modified.',
			'func PowerIteration(mat [][]float64, v0 []float64, iters int) ([]float64, float64) {',
			'	// your code here',
			'	return nil, 0',
			'}',
			'',
			'// Deflate returns mat - eigval * outer(eigvec, eigvec): subtracting a',
			'// found component\'s share sends its eigenvalue to 0, so the NEXT',
			'// power iteration converges to the next component. eigvec must be',
			'// unit-length. The input is not modified.',
			'func Deflate(mat [][]float64, eigvec []float64, eigval float64) [][]float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// ExplainedVarianceRatio divides each eigenvalue by the sum of all of',
			'// them: the fraction of total variance each component carries. If the',
			'// sum is 0, return all zeros (no division).',
			'func ExplainedVarianceRatio(eigvals []float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Project centers the points (using the points\' OWN column means),',
			'// then returns each point\'s coordinates in the component basis:',
			'// out[i][j] = dot(centered[i], components[j]). components are rows,',
			'// assumed unit-length.',
			'func Project(points, components [][]float64) [][]float64 {',
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
			'	"math"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// The classic 10-point 2-D dataset from Lindsay Smith\'s PCA',
			'	// tutorial: two strongly correlated measurements, means (1.81, 1.91).',
			'	pts := [][]float64{',
			'		{2.5, 2.4}, {0.5, 0.7}, {2.2, 2.9}, {1.9, 2.2}, {3.1, 3.0},',
			'		{2.3, 2.7}, {2.0, 1.6}, {1.0, 1.1}, {1.5, 1.6}, {1.1, 0.9},',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"center: point 0 minus the column means (1.81, 1.91)",',
			'			"(0.6900, 0.4900)",',
			'			func() string {',
			'				c := Center(pts)',
			'				if len(c) != 10 || len(c[0]) != 2 {',
			'					return "wrong shape"',
			'				}',
			'				return fmt.Sprintf("(%.4f, %.4f)", c[0][0], c[0][1])',
			'			}},',
			'		{"center property: both centered columns sum to 0 (forget this and PC1 points at the mean, not the spread)",',
			'			"0.0000 0.0000",',
			'			func() string {',
			'				c := Center(pts)',
			'				if len(c) != 10 {',
			'					return "wrong shape"',
			'				}',
			'				s0, s1 := 0.0, 0.0',
			'				for _, p := range c {',
			'					s0 += p[0]',
			'					s1 += p[1]',
			'				}',
			'				// math.Abs so a -0.0000 from float dust cannot fail the case',
			'				return fmt.Sprintf("%.4f %.4f", math.Abs(s0), math.Abs(s1))',
			'			}},',
			'		{"covariance: sample covariance (divide by n-1) of the worked dataset",',
			'			"[[0.6166 0.6154] [0.6154 0.7166]]",',
			'			func() string {',
			'				cov := Covariance(pts)',
			'				if len(cov) != 2 || len(cov[0]) != 2 || len(cov[1]) != 2 {',
			'					return "wrong shape"',
			'				}',
			'				return fmt.Sprintf("[[%.4f %.4f] [%.4f %.4f]]", cov[0][0], cov[0][1], cov[1][0], cov[1][1])',
			'			}},',
			'		{"power iteration from v0=(1,0): the unit direction of the correlation, and its eigenvalue",',
			'			"v=(0.6779, 0.7352) eigval=1.2840",',
			'			func() string {',
			'				v1, l1 := PowerIteration(Covariance(pts), []float64{1, 0}, 100)',
			'				if len(v1) != 2 {',
			'					return "wrong shape"',
			'				}',
			'				return fmt.Sprintf("v=(%.4f, %.4f) eigval=%.4f", v1[0], v1[1], l1)',
			'			}},',
			'		{"sign convention: v0=(-1,0) converges along -v — the flip rule pins the SAME answer",',
			'			"v=(0.6779, 0.7352) eigval=1.2840",',
			'			func() string {',
			'				v1, l1 := PowerIteration(Covariance(pts), []float64{-1, 0}, 100)',
			'				if len(v1) != 2 {',
			'					return "wrong shape"',
			'				}',
			'				return fmt.Sprintf("v=(%.4f, %.4f) eigval=%.4f", v1[0], v1[1], l1)',
			'			}},',
			'		{"deflate, then power-iterate again: the SECOND component appears, with the small eigenvalue",',
			'			"v=(0.7352, -0.6779) eigval=0.0491",',
			'			func() string {',
			'				cov := Covariance(pts)',
			'				v1, l1 := PowerIteration(cov, []float64{1, 0}, 100)',
			'				if len(v1) != 2 {',
			'					return "wrong shape"',
			'				}',
			'				v2, l2 := PowerIteration(Deflate(cov, v1, l1), []float64{1, 0}, 100)',
			'				if len(v2) != 2 {',
			'					return "wrong shape"',
			'				}',
			'				return fmt.Sprintf("v=(%.4f, %.4f) eigval=%.4f", v2[0], v2[1], l2)',
			'			}},',
			'		{"property: the two components are orthogonal — |v1 . v2| = 0",',
			'			"0.0000",',
			'			func() string {',
			'				cov := Covariance(pts)',
			'				v1, l1 := PowerIteration(cov, []float64{1, 0}, 100)',
			'				if len(v1) != 2 {',
			'					return "wrong shape"',
			'				}',
			'				v2, _ := PowerIteration(Deflate(cov, v1, l1), []float64{1, 0}, 100)',
			'				if len(v2) != 2 {',
			'					return "wrong shape"',
			'				}',
			'				return fmt.Sprintf("%.4f", math.Abs(v1[0]*v2[0]+v1[1]*v2[1]))',
			'			}},',
			'		{"explained variance ratio: PC1 carries 96.32% of the variance",',
			'			"[0.9632 0.0368]",',
			'			func() string {',
			'				evr := ExplainedVarianceRatio([]float64{1.2840, 0.0491})',
			'				if len(evr) != 2 {',
			'					return "wrong shape"',
			'				}',
			'				return fmt.Sprintf("[%.4f %.4f]", evr[0], evr[1])',
			'			}},',
			'		{"project onto PC1: one score per point (first three points)",',
			'			"0.8280 -1.7776 0.9922",',
			'			func() string {',
			'				v1, _ := PowerIteration(Covariance(pts), []float64{1, 0}, 100)',
			'				if len(v1) != 2 {',
			'					return "wrong shape"',
			'				}',
			'				sc := Project(pts, [][]float64{v1})',
			'				if len(sc) != 10 || len(sc[0]) != 1 {',
			'					return "wrong shape"',
			'				}',
			'				return fmt.Sprintf("%.4f %.4f %.4f", sc[0][0], sc[1][0], sc[2][0])',
			'			}},',
			'		{"identity: 1-component reconstruction SSE equals the discarded variance (n-1)*eigval2 exactly",',
			'			"0.4418 vs 0.4418",',
			'			func() string {',
			'				cov := Covariance(pts)',
			'				v1, l1 := PowerIteration(cov, []float64{1, 0}, 100)',
			'				if len(v1) != 2 {',
			'					return "wrong shape"',
			'				}',
			'				_, l2 := PowerIteration(Deflate(cov, v1, l1), []float64{1, 0}, 100)',
			'				sc := Project(pts, [][]float64{v1})',
			'				if len(sc) != 10 {',
			'					return "wrong shape"',
			'				}',
			'				// reconstruct: mean + score*v1, accumulate squared error',
			'				sse := 0.0',
			'				for i, p := range pts {',
			'					rx := 1.81 + sc[i][0]*v1[0]',
			'					ry := 1.91 + sc[i][0]*v1[1]',
			'					sse += (p[0]-rx)*(p[0]-rx) + (p[1]-ry)*(p[1]-ry)',
			'				}',
			'				return fmt.Sprintf("%.4f vs %.4f", sse, 9.0*l2)',
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
			'import "math"',
			'',
			'// Center subtracts each column\'s mean. PCA measures variance AROUND',
			'// the mean; on uncentered data the "dominant direction" degenerates',
			'// into the direction of the mean itself, which is why every PCA',
			'// pipeline centers first, unconditionally.',
			'func Center(points [][]float64) [][]float64 {',
			'	n := len(points)',
			'	if n == 0 {',
			'		return [][]float64{}',
			'	}',
			'	dim := len(points[0])',
			'	means := make([]float64, dim)',
			'	for _, p := range points {',
			'		for d := 0; d < dim; d++ {',
			'			means[d] += p[d]',
			'		}',
			'	}',
			'	for d := 0; d < dim; d++ {',
			'		means[d] /= float64(n)',
			'	}',
			'	out := make([][]float64, n)',
			'	for i, p := range points {',
			'		out[i] = make([]float64, dim)',
			'		for d := 0; d < dim; d++ {',
			'			out[i][d] = p[d] - means[d]',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// Covariance builds the d x d sample covariance. n-1 (not n) is',
			'// Bessel\'s correction: the centered columns already spent one degree',
			'// of freedom estimating the mean, and n-1 makes the estimator',
			'// unbiased — and makes these numbers match NumPy/sklearn exactly.',
			'// O(n*d^2) — exactly the cost that makes real PCA prefer SVD on the',
			'// data matrix once d gets large.',
			'func Covariance(points [][]float64) [][]float64 {',
			'	c := Center(points)',
			'	n := len(points)',
			'	dim := len(points[0])',
			'	cov := make([][]float64, dim)',
			'	for a := 0; a < dim; a++ {',
			'		cov[a] = make([]float64, dim)',
			'		for b := 0; b < dim; b++ {',
			'			sum := 0.0',
			'			for i := 0; i < n; i++ {',
			'				sum += c[i][a] * c[i][b]',
			'			}',
			'			cov[a][b] = sum / float64(n-1)',
			'		}',
			'	}',
			'	return cov',
			'}',
			'',
			'// matVec and vecNorm are the two primitives power iteration needs.',
			'func matVec(m [][]float64, v []float64) []float64 {',
			'	out := make([]float64, len(m))',
			'	for i, row := range m {',
			'		s := 0.0',
			'		for j, x := range row {',
			'			s += x * v[j]',
			'		}',
			'		out[i] = s',
			'	}',
			'	return out',
			'}',
			'',
			'func vecNorm(v []float64) float64 {',
			'	s := 0.0',
			'	for _, x := range v {',
			'		s += x * x',
			'	}',
			'	return math.Sqrt(s)',
			'}',
			'',
			'// PowerIteration: write v0 in the eigenbasis, v0 = sum a_i * e_i.',
			'// Then A^t v0 = sum a_i * lambda_i^t * e_i — the dominant term',
			'// outgrows the rest geometrically at rate |lambda2/lambda1|, and',
			'// per-step normalization keeps the numbers finite while preserving',
			'// direction. This same loop, on the web\'s link matrix, is PageRank.',
			'func PowerIteration(mat [][]float64, v0 []float64, iters int) ([]float64, float64) {',
			'	v := append([]float64(nil), v0...)',
			'	for t := 0; t < iters; t++ {',
			'		w := matVec(mat, v)',
			'		n := vecNorm(w)',
			'		if n == 0 {',
			'			// v landed in the null space (or v0 was zero): nothing to',
			'			// normalize, and iterating further cannot recover. Stop',
			'			// with the current v — guarded, never a panic.',
			'			break',
			'		}',
			'		for i := range w {',
			'			w[i] /= n',
			'		}',
			'		v = w',
			'	}',
			'	// Sign convention: e and -e are the same eigenvector, but tests',
			'	// (and reproducible pipelines) need ONE answer. Scan to the first',
			'	// non-zero component and flip the whole vector if it is negative —',
			'	// the same trick sklearn\'s svd_flip uses for deterministic output.',
			'	for _, x := range v {',
			'		if x != 0 {',
			'			if x < 0 {',
			'				for i := range v {',
			'					v[i] = -v[i]',
			'				}',
			'			}',
			'			break',
			'		}',
			'	}',
			'	// Rayleigh quotient vT A v: for a unit eigenvector this IS the',
			'	// eigenvalue, and for a near-eigenvector it is the best available',
			'	// estimate (its error is quadratic in the vector\'s error).',
			'	av := matVec(mat, v)',
			'	lambda := 0.0',
			'	for i := range v {',
			'		lambda += v[i] * av[i]',
			'	}',
			'	return v, lambda',
			'}',
			'',
			'// Deflate subtracts the found component\'s rank-1 share of the matrix.',
			'// For a symmetric matrix with orthogonal eigenvectors, subtracting',
			'// lambda*v*vT zeroes exactly the eigenvalue belonging to v and leaves',
			'// every other eigenpair untouched — so the previously-second',
			'// eigenvalue is now dominant, and power iteration finds it.',
			'func Deflate(mat [][]float64, eigvec []float64, eigval float64) [][]float64 {',
			'	dim := len(mat)',
			'	out := make([][]float64, dim)',
			'	for a := 0; a < dim; a++ {',
			'		out[a] = make([]float64, dim)',
			'		for b := 0; b < dim; b++ {',
			'			out[a][b] = mat[a][b] - eigval*eigvec[a]*eigvec[b]',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// ExplainedVarianceRatio: eigenvalues of the covariance ARE variances',
			'// (of the data projected onto each component), so each one over the',
			'// total is "the fraction of variance this component explains" — the',
			'// number behind every scree plot and every n_components=0.95.',
			'func ExplainedVarianceRatio(eigvals []float64) []float64 {',
			'	sum := 0.0',
			'	for _, l := range eigvals {',
			'		sum += l',
			'	}',
			'	out := make([]float64, len(eigvals))',
			'	if sum == 0 {',
			'		// All-zero spectrum: return zeros rather than divide by zero.',
			'		return out',
			'	}',
			'	for i, l := range eigvals {',
			'		out[i] = l / sum',
			'	}',
			'	return out',
			'}',
			'',
			'// Project expresses each centered point in the component basis. With',
			'// unit-length components the dot product is the signed length of the',
			'// point\'s shadow along that axis — keeping fewer components than',
			'// dimensions is the entire "reduction".',
			'func Project(points, components [][]float64) [][]float64 {',
			'	c := Center(points)',
			'	out := make([][]float64, len(c))',
			'	for i, p := range c {',
			'		out[i] = make([]float64, len(components))',
			'		for j, comp := range components {',
			'			s := 0.0',
			'			for d := range p {',
			'				s += p[d] * comp[d]',
			'			}',
			'			out[i][j] = s',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Real PCA is SVD</h3>' +
			'<p>sklearn\'s <code>PCA</code> never forms the covariance matrix. It ' +
			'runs singular value decomposition directly on the centered data: ' +
			'X = UΣVᵀ, where V\'s rows are exactly your eigenvectors and the ' +
			'eigenvalues are σᵢ²/(n−1). Two reasons this wins. Numerically, ' +
			'forming XᵀX <em>squares the condition number</em> — small directions ' +
			'get crushed into float round-off before you ever eigendecompose. ' +
			'Computationally, when d is large, randomized SVD finds just the top-k ' +
			'components without touching a full d×d matrix. Your ' +
			'power-iteration-plus-deflation loop is the see-through version — and ' +
			'a real production algorithm elsewhere: PageRank is power iteration ' +
			'on the web\'s link matrix, and the Lanczos/Arnoldi methods inside ' +
			'every sparse eigensolver are its industrial-strength descendants.</p>' +
			'<h3>Where PCA earns its keep</h3>' +
			'<p><strong>Before distance-based models:</strong> kNN in 40 ' +
			'correlated dimensions suffers the concentration-of-distances problem ' +
			'from the kNN item; projecting to the top components decorrelates and ' +
			'denoises, often improving accuracy while cutting compute. ' +
			'<strong>Whitening</strong> goes one step further — divide each score ' +
			'by √λ so every component has unit variance — a standard preprocessing ' +
			'step in classical vision pipelines and some init schemes. ' +
			'<strong>Eigenfaces</strong> is the historical showpiece: faces as ' +
			'a few dozen PCA scores over pixel space, which WAS face recognition ' +
			'through the 1990s. And <strong>compression-as-understanding:</strong> ' +
			'the identity the last harness case pins — reconstruction SSE equals ' +
			'(n−1)·(sum of discarded eigenvalues) — is the precise sense in which ' +
			'"keep 96% of the variance" means "lose 4% of the data".</p>' +
			'<h3>When NOT to reach for it</h3>' +
			'<p>Three standing cautions. <strong>Scale first:</strong> PCA chases ' +
			'variance, so a column measured in big units owns PC1 for free — ' +
			'standardize (the feature-scaling item) before PCA unless columns ' +
			'share units. <strong>Interpretability dies:</strong> each component ' +
			'is a blend of every original feature; "PC1 = 0.68·height + ' +
			'0.74·weight" survives a design review, but 40-feature blends do not, ' +
			'which is why regulated domains often prefer feature selection over ' +
			'projection. <strong>Linearity:</strong> PCA can only rotate and ' +
			'truncate — a spiral, ring, or Swiss-roll manifold defeats it. The ' +
			'nonlinear successors are kernel PCA, autoencoders (an encoder/decoder ' +
			'network whose bottleneck IS the low-dimensional code; with linear ' +
			'activations it provably re-derives PCA), and neighbor-graph methods ' +
			'like t-SNE/UMAP for visualization. One interview staple worth having ' +
			'cold: PCA is unsupervised — it never sees the labels, so the ' +
			'top-variance direction is not necessarily the most ' +
			'<em>predictive</em> one (LDA is the supervised counterpart).</p>',
		],
		complexity: { time: 'O(n·d²) for the covariance + O(iters·d²) per component of power iteration', space: 'O(d²) for the covariance and its deflations' },
	});
})();
