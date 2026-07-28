/* Quartiles & Outliers — Describing Data (Easy). Percentiles are how
 * production systems actually describe latency, and the boxplot's 1.5·IQR
 * fences are the standard first-pass outlier detector. The harness pins
 * the R-7 (NumPy default) interpolation on a small set, the p=0/p=100
 * edges, IQR, a latency set with outliers in both tails (returned sorted),
 * and an outlier-free set.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// Boxplot anatomy: the box spans Q1..Q3 (the IQR), whiskers reach the
	// last points inside the 1.5*IQR fences, and anything beyond the
	// fences is plotted alone — an outlier. Marker id namespaced
	// (dgArrowSTQO) because every track's SVGs share the page's id
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="boxplot anatomy: a box from Q1 to Q3 with the median inside, whiskers out to the 1.5 IQR fences, and an outlier point beyond the upper fence">' +
		'<text x="20" y="24" class="lbl">boxplot anatomy: box = middle 50%, fences = Q1/Q3 ± 1.5·IQR</text>' +
		// axis
		'<line x1="40" y1="150" x2="490" y2="150" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>' +
		// whiskers
		'<line x1="80" y1="95" x2="170" y2="95" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<line x1="80" y1="80" x2="80" y2="110" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<line x1="310" y1="95" x2="390" y2="95" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<line x1="390" y1="80" x2="390" y2="110" stroke="var(--accent)" stroke-width="1.6"/>' +
		// the box: Q1..Q3 with the median inside
		'<rect x="170" y="65" width="140" height="60" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<line x1="225" y1="65" x2="225" y2="125" stroke="var(--accent)" stroke-width="2.5"/>' +
		'<text x="170" y="145" text-anchor="middle" class="lbl">Q1</text>' +
		'<text x="225" y="145" text-anchor="middle" class="lbl">median</text>' +
		'<text x="310" y="145" text-anchor="middle" class="lbl">Q3</text>' +
		'<text x="240" y="52" text-anchor="middle" class="lbl">IQR = Q3 − Q1 (middle 50%)</text>' +
		// fences (dashed) and the outlier beyond the upper one
		'<line x1="60" y1="60" x2="60" y2="130" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 3"/>' +
		'<line x1="430" y1="60" x2="430" y2="130" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 3"/>' +
		'<text x="60" y="168" text-anchor="middle" class="lbl" style="fill:var(--warn)">Q1 − 1.5·IQR</text>' +
		'<text x="430" y="168" text-anchor="middle" class="lbl" style="fill:var(--warn)">Q3 + 1.5·IQR</text>' +
		'<circle cx="465" cy="95" r="5" fill="var(--warn)"/>' +
		'<path d="M 430 40 C 448 40 458 60 463 84" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSTQO)"/>' +
		'<text x="360" y="38" text-anchor="middle" class="lbl" style="fill:var(--warn)">beyond the fence: outlier</text>' +
		'<text x="20" y="192" class="lbl">whiskers stop at the last data point INSIDE each fence — the fences themselves are usually invisible</text>' +
		'<defs><marker id="dgArrowSTQO" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'quartiles-outliers',
		title: 'Quartiles & Outliers',
		nav: 'quartiles & outliers',
		difficulty: 'Easy',
		category: 'Describing Data',
		task: 'Implement Percentile (R-7 linear interpolation), IQR (P75 - P25), and Outliers (values beyond the 1.5·IQR fences, sorted).',

		prose: [
			'<h2>Quartiles &amp; Outliers</h2>' +
			'<p>Your API’s mean latency is 16ms and the on-call channel is still ' +
			'on fire. The boxplot on the latency dashboard explains why: the box ' +
			'(the middle 50% of requests) sits at 13–15ms, but a lone dot floats ' +
			'at 250ms — some requests are hitting a cold cache and timing out ' +
			'clients. This is why SLOs are written against <strong>p95</strong> ' +
			'and <strong>p99</strong>, never the mean: a percentile tells you ' +
			'what a real fraction of your users actually experience, and the tail ' +
			'is where the pain lives. The machinery:</p>' +
			'<ul>' +
			'<li><strong>Percentile.</strong> “The value below which p% of the ' +
			'data falls.” The subtlety: for, say, p=25 on 10 points there is ' +
			'usually no data point sitting <em>exactly</em> at the 25% position, ' +
			'so you must interpolate between neighbors — and there are at least ' +
			'nine published ways to do it. This problem uses <strong>R-7</strong>, ' +
			'the default in NumPy, R, Excel, and pandas: the rank position is ' +
			'<code>h = p/100 · (n−1)</code> (a fraction!), and the answer is a ' +
			'linear blend of the two sorted values that straddle <code>h</code>.</li>' +
			'<li><strong>Quartiles</strong> are just the 25th/50th/75th ' +
			'percentiles: Q1, the median, Q3. The <strong>IQR</strong> ' +
			'(interquartile range) <code>Q3 − Q1</code> spans the middle 50% — a ' +
			'spread measure that, like the median, ignores the extremes ' +
			'entirely.</li>' +
			'<li><strong>Tukey’s fences.</strong> John Tukey’s 1977 rule of thumb: ' +
			'anything outside <code>[Q1 − 1.5·IQR, Q3 + 1.5·IQR]</code> is ' +
			'flagged as an outlier. Because the fences are built from quartiles, ' +
			'the outliers themselves can’t move the fences much — the detector is ' +
			'robust to the very points it hunts.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Percentile</code> exactly to the R-7 spec in the ' +
			'starter comment (sort a copy; <code>h = p/100·(n−1)</code>; ' +
			'interpolate), then build <code>IQR</code> and <code>Outliers</code> ' +
			'on top of it. <code>Outliers</code> returns the flagged values in ' +
			'ascending order. All functions are defined only for non-empty input.</p>',
			{ lang: 'txt', code: 'P25 of {1..10}:  h = 25/100 * (10-1) = 2.25\n  lo = floor(h) = 2\n  answer = xs[2] + 0.25*(xs[3]-xs[2]) = 3 + 0.25*1 = 3.25\n\nlatencies {3,12,13,13,14,14,15,15,16,250}:\n  Q1 = 13   Q3 = 15   IQR = 2   fences = [10, 18]\n  outliers -> [3 250]   (both tails, sorted)' },
			'<div class="tip">p=100 gives <code>h = n−1</code>, the last index — ' +
			'there is no <code>xs[lo+1]</code> to blend with. Guard that edge or ' +
			'you’ll index past the end.</div>',
		],

		starter: [
			'package main',
			'',
			'// Percentile returns the p-th percentile of xs (0 <= p <= 100) using',
			'// the R-7 method — the default in NumPy, R, and Excel:',
			'//',
			'//   1. sort a COPY of xs (do not reorder the caller\'s slice)',
			'//   2. h := p / 100 * float64(n-1)   // fractional rank position',
			'//   3. lo := floor(h)',
			'//   4. if lo >= n-1, return sorted[n-1]   // p=100 edge: nothing above to blend',
			'//   5. return sorted[lo] + (h-lo)*(sorted[lo+1]-sorted[lo])',
			'//',
			'// Defined only for non-empty xs (the harness never passes empty).',
			'func Percentile(xs []float64, p float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// IQR returns the interquartile range: Percentile(xs,75) minus',
			'// Percentile(xs,25) — the width of the middle 50% of the data.',
			'func IQR(xs []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Outliers returns every value of xs lying OUTSIDE the Tukey fences',
			'// [Q1 - 1.5*IQR, Q3 + 1.5*IQR] (strictly below the lower fence or',
			'// strictly above the upper), in ascending order. Values exactly on',
			'// a fence are NOT outliers. Return an empty (or nil) slice when',
			'// nothing is flagged.',
			'func Outliers(xs []float64) []float64 {',
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
			'	// {1..10}: every R-7 quartile lands between two integers, so a',
			'	// wrong interpolation method produces visibly different numbers.',
			'	deca := []float64{1, 2, 3, 4, 5, 6, 7, 8, 9, 10}',
			'	// API latencies (ms), deliberately unsorted, with a too-fast',
			'	// health-check response (3) and a cold-cache stall (250).',
			'	lat := []float64{14, 3, 13, 15, 250, 13, 12, 15, 16, 14}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	cases := []tc{',
			'		{"Q1 of {1..10}: h=2.25 falls between xs[2]=3 and xs[3]=4 — blend to 3.25",',
			'			"3.2500",',
			'			func() string { return f4(Percentile(deca, 25)) }},',
			'		{"P50 of {1..10}: h=4.5, halfway between 5 and 6 — R-7 reproduces the even-n median",',
			'			"5.5000",',
			'			func() string { return f4(Percentile(deca, 50)) }},',
			'		{"Q3 of {1..10}: h=6.75 — three quarters of the way from 7 to 8",',
			'			"7.7500",',
			'			func() string { return f4(Percentile(deca, 75)) }},',
			'		{"P90 of {1..10}: h=8.1 — a slim blend, 9 + 0.1*(10-9)",',
			'			"9.1000",',
			'			func() string { return f4(Percentile(deca, 90)) }},',
			'		{"edges p=0 and p=100: the min and the max — p=100 must not index past the end",',
			'			"1.0000 10.0000",',
			'			func() string { return f4(Percentile(deca, 0)) + " " + f4(Percentile(deca, 100)) }},',
			'		{"IQR of {1..10}: 7.75 - 3.25 — the width of the middle 50%",',
			'			"4.5000",',
			'			func() string { return f4(IQR(deca)) }},',
			'		{"latencies: Q1=13 Q3=15 fences [10,18] — flags BOTH tails, returned sorted",',
			'			"[3 250]",',
			'			func() string { return fmt.Sprint(Outliers(lat)) }},',
			'		{"{1..10} has no outliers: fences [-3.5, 14.5] swallow everything — empty result",',
			'			"[]",',
			'			func() string { return fmt.Sprint(Outliers(deca)) }},',
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
			'// Percentile implements R-7 — the linear-interpolation method that',
			'// NumPy, R, and Excel all default to, chosen here so the harness',
			'// numbers match what any of those tools would print.',
			'func Percentile(xs []float64, p float64) float64 {',
			'	// Sort a copy: append to nil allocates fresh backing storage, so',
			'	// the caller\'s slice keeps its order.',
			'	sorted := append([]float64(nil), xs...)',
			'	sort.Float64s(sorted)',
			'	n := len(sorted)',
			'	// h is a FRACTIONAL rank: p percent of the way along the n-1',
			'	// gaps between sorted values. Mapping onto n-1 gaps (not n) is',
			'	// what makes p=0 hit the min and p=100 hit the max exactly.',
			'	h := p / 100 * float64(n-1)',
			'	lo := int(math.Floor(h))',
			'	// p=100 gives h = n-1 exactly: lo is the last index and there is',
			'	// no sorted[lo+1] to blend with. (>= also shields tiny float',
			'	// overshoot in h from indexing past the end.)',
			'	if lo >= n-1 {',
			'		return sorted[n-1]',
			'	}',
			'	// Linear blend between the two straddling values: h-lo is the',
			'	// fraction of the gap to cross. h-lo = 0 returns sorted[lo]',
			'	// untouched, so exact hits cost nothing.',
			'	return sorted[lo] + (h-float64(lo))*(sorted[lo+1]-sorted[lo])',
			'}',
			'',
			'// IQR is defined in terms of Percentile so all three functions',
			'// share one interpolation method — mixing methods between Q1 and Q3',
			'// is a real bug that yields slightly-off fences.',
			'func IQR(xs []float64) float64 {',
			'	return Percentile(xs, 75) - Percentile(xs, 25)',
			'}',
			'',
			'// Outliers applies Tukey\'s 1.5*IQR fences. The quartiles are',
			'// computed from ALL the data, outliers included — that is safe',
			'// precisely because quartiles are robust: a 250ms stall cannot drag',
			'// Q3 the way it drags the mean.',
			'func Outliers(xs []float64) []float64 {',
			'	q1 := Percentile(xs, 25)',
			'	q3 := Percentile(xs, 75)',
			'	iqr := q3 - q1',
			'	loFence := q1 - 1.5*iqr',
			'	hiFence := q3 + 1.5*iqr',
			'	out := []float64{}',
			'	for _, x := range xs {',
			'		// Strict inequalities: a value sitting exactly ON a fence is',
			'		// inside it, per the contract.',
			'		if x < loFence || x > hiFence {',
			'			out = append(out, x)',
			'		}',
			'	}',
			'	// The input arrives in arbitrary order; sorting the flagged',
			'	// values makes the output deterministic and scan-friendly.',
			'	sort.Float64s(out)',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Nine ways to compute a percentile</h3>' +
			'<p>Hyndman &amp; Fan’s 1996 survey catalogued nine sample-quantile ' +
			'methods in statistical packages, named R-1 through R-9 after R’s ' +
			'<code>type=</code> argument — and they genuinely disagree on small ' +
			'data. R-7, the one you implemented, maps p onto the <code>n−1</code> ' +
			'gaps between order statistics; R-6 (SPSS, Minitab) uses ' +
			'<code>n+1</code> positions and gives Q1 of {1..10} as 2.75, not ' +
			'3.25. Classroom textbooks often teach yet another (“split the data ' +
			'at the median, take medians of the halves” — Tukey’s own hinges). ' +
			'None is wrong; they converge as n grows. But when your unit test ' +
			'says 3.25 and a teammate’s SPSS printout says 2.75, this is why — ' +
			'always pin the method, which is exactly what the starter comment ' +
			'does.</p>' +
			'<h3>Why the tail is the SLO</h3>' +
			'<p>A mean hides tails by construction, and at scale tails compound: ' +
			'if one page load fans out to 100 backend calls, a p99 stall of ' +
			'250ms is hit by roughly <code>1 − 0.99¹⁰⁰ ≈ 63%</code> of page ' +
			'loads. This is the “tail at scale” argument (Dean &amp; Barroso, ' +
			'2013) and the reason latency SLOs are phrased as “p99 &lt; 100ms” ' +
			'— your <code>Percentile</code> function, pointed at a window of ' +
			'request durations, is the primitive under every such dashboard. ' +
			'(Production systems approximate it with sketches like t-digest or ' +
			'HDR histograms rather than sorting every window, but the contract ' +
			'is the one you implemented.)</p>' +
			'<h3>1.5 is a rule of thumb, not a theorem</h3>' +
			'<p>Tukey reportedly chose 1.5 because “1 is too small and 2 is too ' +
			'large.” Under a normal distribution the fences sit at roughly ' +
			'±2.7σ, flagging about 0.7% of clean data — a tolerable false-alarm ' +
			'rate. The rule’s real virtue is robustness: because fences are ' +
			'built from quartiles, a handful of wild values can’t widen them to ' +
			'hide themselves, whereas a mean±3σ detector is sabotaged by the ' +
			'very outliers it seeks (they inflate σ). The honest workflow: ' +
			'fences <em>flag</em>, humans <em>decide</em> — that 3ms “latency” ' +
			'was a health check, not a miracle; deleting it silently is how ' +
			'datasets get quietly falsified.</p>',
		],
		complexity: { time: 'O(n log n) — each Percentile call sorts a copy', space: 'O(n) — the sorted copy' },
	});
})();
