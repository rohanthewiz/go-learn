/* Decision Trees: Entropy & Information Gain — AI/ML: Classical Algorithms
 * (Hard). The learner implements the full CART-style pipeline: Shannon
 * entropy, information gain of a threshold split, exhaustive best-split
 * search over midpoint candidates, recursive tree growth with pre-pruning
 * stops, and prediction by routing. The harness pins a worked 10-row fraud
 * dataset: entropy values, the best root split, a depth-1 stump disagreeing
 * with the full tree on one specific point, a pure-branch early stop, and
 * minSamples pre-pruning — every float compared as a %.4f string.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// Feature space of the worked fraud dataset with the tree's axis-aligned
	// cuts drawn in. Marker id suffixed AIDT: every track's SVGs share the
	// page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 230" width="520" height="230" role="img" aria-label="2-D feature space (amount vs account age) carved by axis-aligned splits: a vertical cut at amount=4, then a horizontal cut at age=5 on the right side, then a vertical cut at amount=7.5 above it">' +
		'<text x="20" y="20" class="lbl">a tree is a recursive partition of feature space by axis-aligned cuts</text>' +
		// axes
		'<line x1="40" y1="196" x2="490" y2="196" stroke="currentColor" stroke-width="1"/>' +
		'<line x1="40" y1="36" x2="40" y2="196" stroke="currentColor" stroke-width="1"/>' +
		'<text x="265" y="222" text-anchor="middle" class="lbl">amount ($100s) →</text>' +
		'<text x="30" y="116" text-anchor="middle" class="lbl" transform="rotate(-90 30 116)">account age →</text>' +
		// split 1: amount <= 4 (root)
		'<line x1="216" y1="36" x2="216" y2="196" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="216" y="32" text-anchor="middle" class="lbl" style="fill:var(--accent)">1: amount ≤ 4</text>' +
		// split 2: age <= 5 (right side only)
		'<line x1="216" y1="101" x2="490" y2="101" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="465" y="95" text-anchor="middle" class="lbl" style="fill:var(--warn)">2: age ≤ 5</text>' +
		// split 3: amount <= 7.5 (right side, above age 5)
		'<line x1="370" y1="36" x2="370" y2="101" stroke="var(--warn)" stroke-width="2" stroke-dasharray="4 3"/>' +
		'<text x="370" y="48" text-anchor="middle" class="lbl" style="fill:var(--warn)">3: amount ≤ 7.5</text>' +
		// legit points (hollow)
		'<circle cx="84" cy="111" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
		'<circle cx="106" cy="187" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
		'<circle cx="128" cy="145" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
		'<circle cx="172" cy="77" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
		'<circle cx="304" cy="94" r="5" fill="none" stroke="currentColor" stroke-width="1.6"/>' +
		// fraud points (filled)
		'<circle cx="260" cy="187" r="5" fill="var(--warn)"/>' +
		'<circle cx="282" cy="179" r="5" fill="var(--warn)"/>' +
		'<circle cx="348" cy="190" r="5" fill="var(--warn)"/>' +
		'<circle cx="392" cy="128" r="5" fill="var(--warn)"/>' +
		'<circle cx="436" cy="60" r="5" fill="var(--warn)"/>' +
		// the one point the stump gets wrong
		'<path d="M 258 66 C 280 70 296 78 302 86" fill="none" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowAIDT)"/>' +
		'<text x="230" y="62" text-anchor="middle" class="lbl" style="fill:var(--accent)">stump calls this fraud</text>' +
		'<text x="120" y="170" class="lbl">left of cut 1: pure legit → leaf at depth 1</text>' +
		'<defs><marker id="dgArrowAIDT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'decision-tree',
		title: 'Decision Trees: Entropy & Information Gain',
		nav: 'decision tree',
		difficulty: 'Hard',
		category: 'Classical Algorithms',
		task: 'Implement Entropy, SplitGain, BestSplit (midpoint thresholds, first-found ties), recursive BuildTree with pre-pruning stops, and PredictTree.',

		prose: [
			'<h2>Decision Trees: Entropy &amp; Information Gain</h2>' +
			'<p>The compliance team rejects your fraud model. Not because it is ' +
			'inaccurate — because when a customer\'s transaction is declined, the ' +
			'bank must be able to say <em>why</em>, and "a 4096-dimensional dot ' +
			'product crossed a threshold" does not survive an audit. A decision ' +
			'tree does: it <em>is</em> the explanation. "Declined because amount ' +
			'&gt; $400 and account age ≤ 5 years" is a sentence a regulator, a ' +
			'support agent, and the customer can all read. Trees are the model ' +
			'that turns data into if-statements — and the greedy algorithm that ' +
			'grows them runs on one idea: <strong>entropy</strong>.</p>' +
			'<h3>Entropy: surprise, in bits</h3>' +
			'<p>For a set of labels with class proportions <code>p_c</code>:</p>' +
			'<p><code>H = −Σ p_c · log2(p_c)</code>, with the convention ' +
			'<code>0·log2(0) = 0</code> (an absent class adds no surprise — and ' +
			'no NaN).</p>' +
			'<p>A 50/50 mix is maximal uncertainty: exactly 1 bit. A pure node is ' +
			'0 bits — nothing left to learn. A split is good exactly when it ' +
			'moves labels toward purity, and <strong>information gain</strong> ' +
			'measures that: parent entropy minus the size-weighted entropies of ' +
			'the two children produced by the test <code>x[feature] &lt;= ' +
			'threshold</code>.</p>' +
			'<h3>A worked split</h3>' +
			'<p>Ten transactions, two features — amount (in $100s) and account ' +
			'age (years) — labeled fraud (1) or legit (0):</p>',
			{ lang: 'txt', code: 'rows: (amount, age) -> fraud?\n(1.0, 5.0)->0  (1.5, 0.5)->0  (2.0, 3.0)->0  (3.0, 7.0)->0\n(5.0, 0.5)->1  (5.5, 1.0)->1  (6.0, 6.0)->0  (7.0, 0.3)->1\n(8.0, 4.0)->1  (9.0, 8.0)->1\n\nparent: 5 fraud / 5 legit               -> H = 1.0000\nsplit amount <= 4.0 (midpoint of 3.0 and 5.0):\n  left  = 4 rows, all legit             -> H = 0.0000\n  right = 6 rows, 5 fraud + 1 legit     -> H = 0.6500\ngain = 1.0000 - (4/10)*0.0000 - (6/10)*0.6500 = 0.6100' },
			'<p>Where do candidate thresholds come from? Only the data: for each ' +
			'feature, sort the <em>unique</em> values and test the midpoint ' +
			'between each consecutive pair. Any threshold between the same two ' +
			'data points produces the same partition, so midpoints cover every ' +
			'distinct split that exists. <code>BestSplit</code> scans features in ' +
			'index order and thresholds in increasing order, keeping the first ' +
			'strictly-better gain — so ties resolve to the lowest feature index, ' +
			'then the lowest threshold.</p>' +
			'<h3>Growing the tree</h3>' +
			'<p>Recursion does the rest: split the rows, grow a left subtree on ' +
			'<code>x[f] &lt;= t</code> and a right subtree on the remainder, and ' +
			'stop — making a leaf that predicts the majority label (tie → ' +
			'smallest label) — when any of four conditions hits: depth reached ' +
			'<code>maxDepth</code>, fewer than <code>minSamples</code> rows, the ' +
			'node is already pure, or no split has positive gain. In the dataset ' +
			'above the left branch goes pure immediately: recursion stops at ' +
			'depth 1 there while the fraud-heavy right side keeps splitting.</p>' +
			DIAGRAM +
			'<p>You will return the tree as five parallel slices indexed by node ' +
			'id — a flat, GC-friendly layout real libraries use too (sklearn ' +
			'stores exactly such arrays). Nodes are numbered in preorder: a node, ' +
			'then its whole left subtree, then its right — so the root is 0 and ' +
			'a node\'s left child is always the next id.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Entropy</code>, <code>SplitGain</code>, ' +
			'<code>BestSplit</code>, <code>BuildTree</code>, and ' +
			'<code>PredictTree</code> exactly as specified in the doc comments. ' +
			'Every rule you need — the 0·log0 convention, midpoint candidates, ' +
			'tie-breaks, the four stopping conditions, preorder numbering — is ' +
			'spelled out there.</p>' +
			'<div class="tip">The algorithm is <em>greedy</em>: it takes the best ' +
			'single split now, with no lookahead. On XOR-shaped data every first ' +
			'split has zero gain, so a greedy tree can stall even though a ' +
			'two-level tree would be perfect. Real libraries accept this — ' +
			'optimal tree construction is NP-complete, and greedy trees are ' +
			'redeemed later by averaging many of them (next item: ensembles).</div>',
		],

		starter: [
			'package main',
			'',
			'// Entropy returns the Shannon entropy, in bits, of a label list:',
			'//',
			'//   H = -Σ p_c · log2(p_c)   over classes c, with 0·log2(0) taken as 0',
			'//',
			'// Labels are small non-negative ints (this problem uses 0 and 1).',
			'// An empty list has entropy 0.',
			'func Entropy(labels []int) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// SplitGain returns the information gain of partitioning the rows by',
			'// the test X[i][feature] <= threshold:',
			'//',
			'//   gain = Entropy(y) - (nL/n)·Entropy(yLeft) - (nR/n)·Entropy(yRight)',
			'//',
			'// An empty side contributes 0 (its weight is 0), so a split that',
			'// separates nothing has gain 0.',
			'func SplitGain(X [][]float64, y []int, feature int, threshold float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// BestSplit searches every feature in index order; for each feature the',
			'// candidate thresholds are the midpoints between consecutive sorted',
			'// UNIQUE values of that feature, tried in increasing order. It returns',
			'// (feature, threshold, gain) of the best split, accepting a candidate',
			'// only when its gain is STRICTLY greater than the best so far — so ties',
			'// keep the first candidate found (lowest feature index, then lowest',
			'// threshold). If no candidate has positive gain it returns (-1, 0, 0).',
			'func BestSplit(X [][]float64, y []int) (int, float64, float64) {',
			'	// your code here',
			'	return -1, 0, 0',
			'}',
			'',
			'// BuildTree grows a tree depth-first and returns it as five parallel',
			'// slices indexed by node id, numbered in PREORDER (a node, then its',
			'// entire left subtree, then its right subtree; root = 0):',
			'//',
			'//   feature[i]        split feature of node i, or -1 if i is a leaf',
			'//   thresh[i]         split threshold (0 for a leaf)',
			'//   left[i], right[i] child node ids (-1 for a leaf); the LEFT child',
			'//                     holds the rows with x[feature] <= thresh',
			'//   label[i]          majority label of the node\'s rows (tie -> the',
			'//                     smallest label); filled for every node',
			'//',
			'// A node becomes a leaf when ANY of these holds:',
			'//   depth == maxDepth (root is depth 0), or the node has fewer than',
			'//   minSamples rows, or the node is pure (entropy 0), or BestSplit',
			'//   finds no positive-gain split.',
			'func BuildTree(X [][]float64, y []int, maxDepth int, minSamples int) ([]int, []float64, []int, []int, []int) {',
			'	// your code here',
			'	return []int{-1}, []float64{0}, []int{-1}, []int{-1}, []int{0}',
			'}',
			'',
			'// PredictTree routes x from the root: while the current node is not a',
			'// leaf, step to left[node] when x[feature[node]] <= thresh[node] and to',
			'// right[node] otherwise. Returns the label of the leaf reached.',
			'func PredictTree(feature []int, thresh []float64, left []int, right []int, label []int, x []float64) int {',
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
			'	// The worked fraud dataset from the prose: feature 0 = amount in',
			'	// $100s, feature 1 = account age in years, label 1 = fraud.',
			'	X := [][]float64{',
			'		{1.0, 5.0}, {1.5, 0.5}, {2.0, 3.0}, {3.0, 7.0},',
			'		{5.0, 0.5}, {5.5, 1.0}, {6.0, 6.0}, {7.0, 0.3},',
			'		{8.0, 4.0}, {9.0, 8.0},',
			'	}',
			'	y := []int{0, 0, 0, 0, 1, 1, 0, 1, 1, 1}',
			'	// Both features split this set perfectly with equal gain: the',
			'	// tie-break contract decides which one BestSplit must report.',
			'	tieX := [][]float64{{0.0, 0.0}, {1.0, 1.0}}',
			'	tieY := []int{0, 1}',
			'	// The old-account big spender: right of the root cut (looks like',
			'	// fraud to a stump) but exonerated by the deeper age/amount cuts.',
			'	probe := []float64{6.0, 6.0}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	cases := []tc{',
			'		{"a 50/50 label mix is maximum surprise: exactly 1 bit",',
			'			"1.0000",',
			'			func() string { return f4(Entropy([]int{0, 1})) }},',
			'		{"a pure node has zero entropy — 0·log2(0) is defined as 0, not NaN",',
			'			"0.0000",',
			'			func() string { return f4(Entropy([]int{1, 1, 1})) }},',
			'		{"a 5-vs-3 mix sits between pure and 50/50",',
			'			"0.9544",',
			'			func() string { return f4(Entropy([]int{0, 0, 0, 0, 0, 1, 1, 1})) }},',
			'		{"worked split: amount <= 4.0 carves off a pure legit side (1.0000 − 0.6·0.6500)",',
			'			"0.6100",',
			'			func() string { return f4(SplitGain(X, y, 0, 4.0)) }},',
			'		{"BestSplit tries midpoints of sorted unique values and finds amount <= 4.00",',
			'			"f=0 t=4.00 gain=0.6100",',
			'			func() string {',
			'				f, t, g := BestSplit(X, y)',
			'				return fmt.Sprintf("f=%d t=%.2f gain=%.4f", f, t, g)',
			'			}},',
			'		{"tie-break: equal gain on both features -> lowest feature index wins",',
			'			"f=0 t=0.50 gain=1.0000",',
			'			func() string {',
			'				f, t, g := BestSplit(tieX, tieY)',
			'				return fmt.Sprintf("f=%d t=%.2f gain=%.4f", f, t, g)',
			'			}},',
			'		{"depth-1 stump flags the old-account big spender; the depth-3 tree exonerates it",',
			'			"stump=1 tree=0",',
			'			func() string {',
			'				sf, st, sl, sr, sb := BuildTree(X, y, 1, 2)',
			'				ff, ft, fl, fr, fb := BuildTree(X, y, 3, 2)',
			'				return fmt.Sprintf("stump=%d tree=%d",',
			'					PredictTree(sf, st, sl, sr, sb, probe),',
			'					PredictTree(ff, ft, fl, fr, fb, probe))',
			'			}},',
			'		{"the pure legit branch stops at depth 1: the depth-3 tree has 7 nodes, not 15",',
			'			"7",',
			'			func() string {',
			'				ff, _, _, _, _ := BuildTree(X, y, 3, 2)',
			'				return fmt.Sprintf("%d", len(ff))',
			'			}},',
			'		{"minSamples=7 pre-pruning: the 6-row fraud side may not split again",',
			'			"nodes=3 predict=1",',
			'			func() string {',
			'				mf, mt, ml, mr, mb := BuildTree(X, y, 3, 7)',
			'				return fmt.Sprintf("nodes=%d predict=%d", len(mf),',
			'					PredictTree(mf, mt, ml, mr, mb, probe))',
			'			}},',
			'		{"property: the depth-3 tree reproduces every training label",',
			'			"10/10",',
			'			func() string {',
			'				ff, ft, fl, fr, fb := BuildTree(X, y, 3, 2)',
			'				correct := 0',
			'				for i := range X {',
			'					if PredictTree(ff, ft, fl, fr, fb, X[i]) == y[i] {',
			'						correct++',
			'					}',
			'				}',
			'				return fmt.Sprintf("%d/10", correct)',
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
			'// countLabels tallies labels into a dense slice indexed by label value.',
			'// Labels are small non-negative ints, so a slice beats a map — and,',
			'// crucially, iterating it visits classes in ascending order. Go map',
			'// iteration order is randomized per run; summing float terms in a',
			'// random order could flip the last printed digit between runs, and the',
			'// harness compares fixed-format strings. Determinism is a design rule.',
			'func countLabels(labels []int) []int {',
			'	maxLabel := 0',
			'	for _, l := range labels {',
			'		if l > maxLabel {',
			'			maxLabel = l',
			'		}',
			'	}',
			'	counts := make([]int, maxLabel+1)',
			'	for _, l := range labels {',
			'		counts[l]++',
			'	}',
			'	return counts',
			'}',
			'',
			'// Entropy is Shannon entropy in bits: expected surprise of drawing a',
			'// label. It only looks at label PROPORTIONS — which is why a pure node',
			'// scores 0 and a 50/50 node scores exactly 1 bit regardless of size.',
			'func Entropy(labels []int) float64 {',
			'	n := len(labels)',
			'	if n == 0 {',
			'		return 0.0',
			'	}',
			'	h := 0.0',
			'	for _, c := range countLabels(labels) {',
			'		if c == 0 {',
			'			// The 0·log2(0) convention: skipping the term IS the math',
			'			// (the limit of p·log p as p->0 is 0). Calling Log2(0)',
			'			// here would poison the sum with -Inf·0 = NaN.',
			'			continue',
			'		}',
			'		p := float64(c) / float64(n)',
			'		h -= p * math.Log2(p)',
			'	}',
			'	return h',
			'}',
			'',
			'// SplitGain: how many bits of uncertainty the test x[feature] <= t',
			'// removes. Children are weighted by their share of the rows — a pure',
			'// child that holds 2 rows out of 100 should barely move the score.',
			'func SplitGain(X [][]float64, y []int, feature int, threshold float64) float64 {',
			'	var yLeft, yRight []int',
			'	for i := range X {',
			'		if X[i][feature] <= threshold {',
			'			yLeft = append(yLeft, y[i])',
			'		} else {',
			'			yRight = append(yRight, y[i])',
			'		}',
			'	}',
			'	n := float64(len(y))',
			'	// Entropy(empty) is 0 and its weight is 0, so a degenerate split',
			'	// (everything on one side) naturally scores parent − parent = 0.',
			'	return Entropy(y) -',
			'		float64(len(yLeft))/n*Entropy(yLeft) -',
			'		float64(len(yRight))/n*Entropy(yRight)',
			'}',
			'',
			'// BestSplit is an exhaustive scan — features in index order, midpoint',
			'// thresholds in increasing order. Midpoints between consecutive sorted',
			'// UNIQUE values are sufficient: any threshold strictly between the same',
			'// two data values induces the identical partition, so midpoints',
			'// enumerate every distinct split that exists in the data.',
			'func BestSplit(X [][]float64, y []int) (int, float64, float64) {',
			'	bestFeature := -1',
			'	bestThreshold := 0.0',
			'	bestGain := 0.0',
			'	if len(X) == 0 {',
			'		return bestFeature, bestThreshold, bestGain',
			'	}',
			'	d := len(X[0])',
			'	for f := 0; f < d; f++ {',
			'		vals := make([]float64, 0, len(X))',
			'		for i := range X {',
			'			vals = append(vals, X[i][f])',
			'		}',
			'		sort.Float64s(vals)',
			'		// Dedupe in place: uniq shares vals\' backing array, writing',
			'		// each first occurrence forward.',
			'		uniq := vals[:0]',
			'		for i, v := range vals {',
			'			if i == 0 || v != vals[i-1] {',
			'				uniq = append(uniq, v)',
			'			}',
			'		}',
			'		for j := 0; j+1 < len(uniq); j++ {',
			'			t := (uniq[j] + uniq[j+1]) / 2.0',
			'			g := SplitGain(X, y, f, t)',
			'			// STRICTLY greater: on a tie the earlier candidate stands,',
			'			// which pins the documented (lowest feature, lowest',
			'			// threshold) contract. bestGain starts at 0, so only',
			'			// positive-gain splits are ever accepted.',
			'			if g > bestGain {',
			'				bestFeature, bestThreshold, bestGain = f, t, g',
			'			}',
			'		}',
			'	}',
			'	return bestFeature, bestThreshold, bestGain',
			'}',
			'',
			'// majorityLabel returns the most frequent label; scanning counts in',
			'// ascending label order with a strict > means ties keep the SMALLEST',
			'// label — the documented tie-break.',
			'func majorityLabel(labels []int) int {',
			'	counts := countLabels(labels)',
			'	best := 0',
			'	for l, c := range counts {',
			'		if c > counts[best] {',
			'			best = l',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
			'// BuildTree grows the tree with a recursive closure appending to five',
			'// parallel slices. Appending at entry and recursing left-then-right',
			'// yields preorder ids for free: a node\'s left child is always the next',
			'// id allocated. Flat parallel arrays are also how sklearn stores trees',
			'// (tree_.feature, tree_.threshold, ...) — cache-friendly and trivially',
			'// serializable, unlike a web of node pointers.',
			'func BuildTree(X [][]float64, y []int, maxDepth int, minSamples int) ([]int, []float64, []int, []int, []int) {',
			'	feature := []int{}',
			'	thresh := []float64{}',
			'	left := []int{}',
			'	right := []int{}',
			'	label := []int{}',
			'',
			'	var grow func(rowsX [][]float64, rowsY []int, depth int) int',
			'	grow = func(rowsX [][]float64, rowsY []int, depth int) int {',
			'		// Allocate this node first (preorder), as a leaf by default;',
			'		// it is promoted to an internal node only if a split happens.',
			'		idx := len(feature)',
			'		feature = append(feature, -1)',
			'		thresh = append(thresh, 0.0)',
			'		left = append(left, -1)',
			'		right = append(right, -1)',
			'		label = append(label, majorityLabel(rowsY))',
			'',
			'		// Pre-pruning stops. Purity (entropy 0) is checked explicitly:',
			'		// cheaper than running BestSplit to discover zero gain, and it',
			'		// is the stop that fires on the all-legit branch of the demo',
			'		// dataset at depth 1.',
			'		if depth >= maxDepth || len(rowsY) < minSamples || Entropy(rowsY) == 0.0 {',
			'			return idx',
			'		}',
			'		f, t, g := BestSplit(rowsX, rowsY)',
			'		if f == -1 || g <= 0.0 {',
			'			return idx',
			'		}',
			'',
			'		var leftX, rightX [][]float64',
			'		var leftY, rightY []int',
			'		for i := range rowsX {',
			'			if rowsX[i][f] <= t {',
			'				leftX = append(leftX, rowsX[i])',
			'				leftY = append(leftY, rowsY[i])',
			'			} else {',
			'				rightX = append(rightX, rowsX[i])',
			'				rightY = append(rightY, rowsY[i])',
			'			}',
			'		}',
			'		feature[idx] = f',
			'		thresh[idx] = t',
			'		// Left subtree fully built before right — that ordering IS the',
			'		// preorder numbering contract the harness pins.',
			'		leftChild := grow(leftX, leftY, depth+1)',
			'		rightChild := grow(rightX, rightY, depth+1)',
			'		left[idx] = leftChild',
			'		right[idx] = rightChild',
			'		return idx',
			'	}',
			'	grow(X, y, 0)',
			'	return feature, thresh, left, right, label',
			'}',
			'',
			'// PredictTree is the entire inference cost of a tree: one comparison',
			'// per level, O(depth). This is why trees serve in microsecond-budget',
			'// systems (ad ranking, fraud checks) where a neural net cannot.',
			'func PredictTree(feature []int, thresh []float64, left []int, right []int, label []int, x []float64) int {',
			'	if len(feature) == 0 {',
			'		return 0',
			'	}',
			'	node := 0',
			'	for feature[node] != -1 {',
			'		if x[feature[node]] <= thresh[node] {',
			'			node = left[node]',
			'		} else {',
			'			node = right[node]',
			'		}',
			'	}',
			'	return label[node]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Gini vs entropy, and the CART family tree</h3>' +
			'<p>You implemented the ID3-style criterion (entropy / information ' +
			'gain). sklearn\'s <code>DecisionTreeClassifier</code> defaults to ' +
			'<strong>Gini impurity</strong>, <code>1 − Σ p_c²</code> — same shape, ' +
			'same zero at purity, same maximum at 50/50, no logarithm to compute. ' +
			'Empirically they disagree on about 2% of splits and almost never on ' +
			'final accuracy; Gini won as the default on speed, not quality. The ' +
			'lineage worth knowing by name: ID3 (Quinlan, entropy, categorical ' +
			'splits) → C4.5 (gain <em>ratio</em>, which penalizes many-valued ' +
			'features that gain rewards unfairly — a real bias your implementation ' +
			'has) → CART (Breiman, binary threshold splits, Gini, regression ' +
			'trees), which is what you just built and what every modern library ' +
			'descends from.</p>' +
			'<h3>What axis-aligned buys you — and costs you</h3>' +
			'<p>Because every test is <code>x[f] &lt;= t</code>, trees are ' +
			'<strong>invariant to any monotone feature transform</strong>: log it, ' +
			'standardize it, rank it — the same splits exist and the same tree ' +
			'comes back. No feature scaling, ever (contrast with kNN, SVMs, and ' +
			'anything gradient-trained). The cost is geometry: a diagonal decision ' +
			'boundary must be approximated by a staircase of many splits, and a ' +
			'45° rotation of your data can turn a 3-node tree into a 50-node one. ' +
			'The cost that bites harder in production is <strong>variance</strong>: ' +
			'the greedy split choice is a knife-edge — perturb a few rows and a ' +
			'different root split wins, and everything below it changes. A deep ' +
			'tree is a low-bias, high-variance memorizer; your depth-3 tree ' +
			'fitting 10/10 training rows is the small-scale version of the tree ' +
			'that aces training data and embarrasses you in production. The fixes ' +
			'are pruning — sklearn\'s <code>max_depth</code> / ' +
			'<code>min_samples_split</code> are exactly your <code>maxDepth</code> ' +
			'/ <code>minSamples</code>, plus cost-complexity pruning ' +
			'(<code>ccp_alpha</code>) which prunes bottom-up after growing — and, ' +
			'far more powerfully, averaging many decorrelated trees. That is the ' +
			'next item: bagging attacks exactly the variance you just observed.</p>' +
			'<h3>In interviews and in incident reviews</h3>' +
			'<p>"Why did the model decline this customer?" is the question that ' +
			'keeps trees in production at banks and insurers — regulated ' +
			'industries often require models whose decisions decompose into ' +
			'readable rules, and a shallow tree (or a tree distilled from a ' +
			'black-box model as a <em>surrogate</em>) is the standard answer. ' +
			'Interviewers reliably probe three things you now own: the 0·log0 ' +
			'convention (does entropy NaN on a pure node?), why candidate ' +
			'thresholds are midpoints of observed values (any other threshold ' +
			'induces a duplicate partition), and greediness (optimal tree ' +
			'building is NP-complete; XOR data defeats every single first split). ' +
			'One production caveat to carry: tree <em>feature importances</em> ' +
			'(summed gain per feature) are biased toward high-cardinality ' +
			'features and are computed on training data — permutation importance ' +
			'or SHAP values are the trustworthy replacements when the compliance ' +
			'team asks which features drove the model.</p>',
		],
		complexity: { time: 'O(nodes · n · d · u) — every node scans d features × u midpoint candidates, each evaluated over its rows', space: 'O(nodes + n) — five parallel slices plus the recursion\'s row partitions' },
	});
})();
