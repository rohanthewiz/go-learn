/* Mean, Median, Mode — Describing Data (Easy). The three classic centers
 * of a dataset, and the reason "average income" is a rhetorical trick: the
 * mean chases outliers, the median ignores them. The harness pins a
 * symmetric set (mean == median), even-length median interpolation, a
 * salary set with one huge outlier (mean >> median), the smallest-value
 * tiebreak for Mode, and the contract that Median must not reorder the
 * caller's slice.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// A right-skewed distribution: the long tail drags the mean toward it
	// while the median stays put at the bulk of the data. Marker id
	// namespaced (dgArrowSTMM) because every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-label="a right-skewed distribution: the median sits under the bulk of the data while the long tail drags the mean to the right">' +
		'<text x="20" y="24" class="lbl">right-skewed data: the tail drags the mean, not the median</text>' +
		// the skewed curve: steep rise, long shallow tail to the right
		'<path d="M 40 150 C 70 150 80 52 120 52 C 175 52 230 130 330 143 C 400 149 450 150 480 150" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<line x1="40" y1="150" x2="480" y2="150" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>' +
		// median: under the bulk
		'<line x1="150" y1="60" x2="150" y2="150" stroke="var(--accent)" stroke-width="2" stroke-dasharray="5 3"/>' +
		'<text x="150" y="170" text-anchor="middle" class="lbl">median</text>' +
		// mean: dragged toward the tail
		'<line x1="235" y1="60" x2="235" y2="150" stroke="var(--warn)" stroke-width="2" stroke-dasharray="5 3"/>' +
		'<text x="235" y="170" text-anchor="middle" class="lbl" style="fill:var(--warn)">mean</text>' +
		// the drag
		'<path d="M 158 78 C 180 70 205 70 228 78" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSTMM)"/>' +
		'<text x="345" y="120" text-anchor="middle" class="lbl" style="fill:var(--warn)">outliers live here — every one tugs the mean</text>' +
		'<defs><marker id="dgArrowSTMM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'mean-median-mode',
		title: 'Mean, Median, Mode',
		nav: 'mean median mode',
		difficulty: 'Easy',
		category: 'Describing Data',
		task: 'Implement Mean, Median (sorted copy, middle-two average for even n), and Mode (most frequent value, smallest on ties).',

		prose: [
			'<h2>Mean, Median, Mode</h2>' +
			'<p>A recruiter tells you the “average salary” at an eight-person ' +
			'startup is $1.16M. True — the founder pays herself $9M and everyone ' +
			'else makes about $44k. One person in the room moved the mean by a ' +
			'factor of 26; the median barely noticed. This is why economists ' +
			'report <em>median</em> household income, why latency dashboards show ' +
			'percentiles instead of averages, and why “average” is the most ' +
			'abused word in statistics. The three centers answer different ' +
			'questions:</p>' +
			'<ul>' +
			'<li><strong>Mean</strong> — the balance point: <code>sum / n</code>. ' +
			'It uses every value, which is its strength (it feeds variance, ' +
			'z-scores, regression — nearly everything downstream) and its ' +
			'weakness: every value tugs on it, so one outlier drags it.</li>' +
			'<li><strong>Median</strong> — the middle of the <em>sorted</em> ' +
			'data. Odd <code>n</code>: the middle element. Even <code>n</code>: ' +
			'the average of the two middle elements. Half the data sits on each ' +
			'side no matter how extreme the extremes are — statisticians call ' +
			'this <em>robustness</em> (its breakdown point is 50%: half the data ' +
			'must go bad before it does).</li>' +
			'<li><strong>Mode</strong> — the most frequent value. The only ' +
			'center that works for categorical data (there is no “mean shirt ' +
			'size”), and the peak of a histogram. Ties are real: this problem ' +
			'resolves them by returning the <em>smallest</em> tied value, which ' +
			'keeps the answer deterministic.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Mean</code>, <code>Median</code>, and ' +
			'<code>Mode</code>. All three are defined only for non-empty input ' +
			'(the harness never passes an empty slice). <code>Median</code> must ' +
			'sort a <em>copy</em> — the harness checks that the caller’s slice ' +
			'keeps its original order, because a summary statistic that silently ' +
			'reorders your data is a real bug class (Go’s <code>sort.Float64s</code> ' +
			'works in place).</p>',
			{ lang: 'txt', code: 'salaries (k$): 41 45 38 52 47 43 40 9000\nmean   = 9306 / 8       = 1163.25   <- dragged by one founder\nmedian = (43 + 45) / 2  = 44.00     <- what a typical person makes' },
			'<div class="tip">Rule of thumb when reading someone else’s summary: ' +
			'if mean and median are far apart, the distribution is skewed and the ' +
			'mean alone is hiding something — ask for the histogram.</div>',
		],

		starter: [
			'package main',
			'',
			'// Mean returns the arithmetic mean of xs: sum / n.',
			'// Defined only for non-empty xs (the harness never passes empty).',
			'func Mean(xs []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Median returns the middle of the sorted data. Sort a COPY of xs —',
			'// the caller\'s slice must keep its original order. For odd n return',
			'// the middle element; for even n return the average of the two',
			'// middle elements. Defined only for non-empty xs.',
			'func Median(xs []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Mode returns the most frequent value in xs. If several values tie',
			'// for the highest count, return the SMALLEST of them (this makes the',
			'// answer deterministic). Defined only for non-empty xs.',
			'func Mode(xs []float64) float64 {',
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
			'	// Startup salaries in k$: seven ordinary numbers and one founder.',
			'	salaries := []float64{41, 45, 38, 52, 47, 43, 40, 9000}',
			'	// Deliberately unsorted: the mutation check below only means',
			'	// something if sorting WOULD change the order.',
			'	scrambled := []float64{9, 1, 5, 3}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	cases := []tc{',
			'		{"symmetric set {2,4,6,8,10}: mean and median agree — no skew, no story",',
			'			"6.0000 6.0000",',
			'			func() string {',
			'				xs := []float64{2, 4, 6, 8, 10}',
			'				return f4(Mean(xs)) + " " + f4(Median(xs))',
			'			}},',
			'		{"even n {1,2,3,4}: no single middle element — median interpolates (2+3)/2",',
			'			"2.5000",',
			'			func() string { return f4(Median([]float64{1, 2, 3, 4})) }},',
			'		{"salaries with one 9000k founder: mean dragged to 1163.25, median stays at 44",',
			'			"1163.2500 44.0000",',
			'			func() string { return f4(Mean(salaries)) + " " + f4(Median(salaries)) }},',
			'		{"Mode {5,7,5,7,5}: 5 appears three times, 7 twice",',
			'			"5.0000",',
			'			func() string { return f4(Mode([]float64{5, 7, 5, 7, 5})) }},',
			'		{"Mode tie {3,1,1,3,2}: 1 and 3 both appear twice — smallest tied value wins",',
			'			"1.0000",',
			'			func() string { return f4(Mode([]float64{3, 1, 1, 3, 2})) }},',
			'		{"Median must sort a COPY: after the call the caller\'s slice keeps its order",',
			'			"4.0000 [9 1 5 3]",',
			'			func() string {',
			'				med := Median(scrambled)',
			'				// fmt.Sprint of the ORIGINAL slice after the call:',
			'				// an in-place sort would print [1 3 5 9] here.',
			'				return f4(med) + " " + fmt.Sprint(scrambled)',
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
			'import "sort"',
			'',
			'// Mean is the balance point: every value contributes 1/n of its',
			'// weight, which is exactly why one extreme value can move it so far.',
			'func Mean(xs []float64) float64 {',
			'	sum := 0.0',
			'	for _, x := range xs {',
			'		sum += x',
			'	}',
			'	return sum / float64(len(xs))',
			'}',
			'',
			'// Median sorts a COPY and takes the middle. The copy is the',
			'// load-bearing decision: sort.Float64s works in place, and a summary',
			'// statistic that reorders its caller\'s data is a bug that only',
			'// surfaces later, far from this function.',
			'func Median(xs []float64) float64 {',
			'	// append to a nil slice allocates fresh backing storage, so the',
			'	// sort below cannot touch the caller\'s array.',
			'	sorted := append([]float64(nil), xs...)',
			'	sort.Float64s(sorted)',
			'	n := len(sorted)',
			'	mid := n / 2',
			'	if n%2 == 1 {',
			'		// Odd n: integer division lands exactly on the middle',
			'		// element (n=5 -> mid=2, elements 0..4).',
			'		return sorted[mid]',
			'	}',
			'	// Even n: no single middle element exists, so interpolate',
			'	// between the two that straddle the center (n=4 -> indices 1,2).',
			'	return (sorted[mid-1] + sorted[mid]) / 2',
			'}',
			'',
			'// Mode counts occurrences in a map, then scans for the winner. The',
			'// scan order over a Go map is deliberately randomized by the runtime,',
			'// so determinism has to come from the comparison itself: strict >',
			'// on count, with a smallest-value tiebreak on equality.',
			'func Mode(xs []float64) float64 {',
			'	counts := make(map[float64]int)',
			'	for _, x := range xs {',
			'		counts[x]++',
			'	}',
			'	best := xs[0]',
			'	bestCount := 0',
			'	for v, c := range counts {',
			'		// bestCount starts at 0 so the first value examined always',
			'		// installs itself; after that, only a strictly higher count',
			'		// or an equal count with a smaller value can replace it.',
			'		if c > bestCount || (c == bestCount && v < best) {',
			'			best = v',
			'			bestCount = c',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Robustness is a spectrum</h3>' +
			'<p>Statisticians quantify what you just saw with the <em>breakdown ' +
			'point</em>: the fraction of the data an adversary must corrupt before ' +
			'the statistic can be pushed arbitrarily far. The mean’s breakdown ' +
			'point is 0 — a single value can move it anywhere (make the founder’s ' +
			'salary $9B and the “average” is $1.1B). The median’s is 50%, the best ' +
			'possible. That’s why robust pipelines — sensor fusion, financial ' +
			'tick data, anything that ingests values it doesn’t control — reach ' +
			'for medians and trimmed means, and why the median-of-medians idea ' +
			'shows up everywhere from quickselect pivots to Google’s SRE ' +
			'latency dashboards.</p>' +
			'<h3>Why the mean survives anyway</h3>' +
			'<p>Because it’s algebraically friendly in ways the median is not. ' +
			'Means combine: the mean of two merged datasets is a weighted mean of ' +
			'their means, so it can be computed in one streaming pass, sharded ' +
			'across machines, and updated incrementally — <code>count</code> and ' +
			'<code>sum</code> are a sufficient summary. The median has no such ' +
			'decomposition: merging two medians tells you almost nothing, which ' +
			'is why exact streaming medians need clever structures (two heaps) ' +
			'and why large systems settle for approximations like t-digest. ' +
			'Nearly every formula later in this track — variance, z-scores, ' +
			'correlation, regression — is built on the mean for exactly this ' +
			'algebraic reason.</p>' +
			'<h3>The bugs people actually write</h3>' +
			'<p>Three classics. Sorting the caller’s slice inside a median ' +
			'function — the harness checks this because it happens in real code ' +
			'reviews weekly. Forgetting the even-length interpolation and always ' +
			'taking <code>sorted[n/2]</code> — wrong for every even ' +
			'<code>n</code>, and tests with odd-length fixtures never catch it. ' +
			'And nondeterministic mode: iterating a Go map and returning the ' +
			'first maximal value found gives an answer that changes run to run, ' +
			'because Go randomizes map iteration order on purpose. The ' +
			'smallest-on-tie rule isn’t pedantry; it’s what makes the function ' +
			'testable at all.</p>',
		],
		complexity: { time: 'O(n log n) — Median’s sort dominates; Mean and Mode are one pass', space: 'O(n) — Median’s copy and Mode’s count map' },
	});
})();
