/* The Mann-Whitney U Test — Modeling & Advanced (Hard). The rank-based
 * two-sample test: throw away magnitudes, keep order, and ask which group
 * tends to be bigger. The harness pins midrank tie handling, the
 * Ux + Uy = nx·ny invariant, U on pinned samples, the complete-separation
 * extreme U = 0, and the normal-approximation z.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// Two samples merged onto one rank axis: ranks replace values, and a
	// tie run shares the average of the ranks it straddles (the midrank).
	// Marker id namespaced (dgArrowSTMW): all tracks share one SVG id space.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="two samples of dots merge onto a single rank axis; tied values are bracketed and share a midrank; U counts how many x,y pairs have x ahead of y">' +
		'<text x="20" y="22" class="lbl">merge both samples, rank them 1..n — ties share the midrank</text>' +
		// sample X row
		'<text x="30" y="58" class="lbl">build A</text>' +
		'<circle cx="120" cy="54" r="5" fill="var(--accent)"/><circle cx="238" cy="54" r="5" fill="var(--accent)"/><circle cx="330" cy="54" r="5" fill="var(--accent)"/>' +
		// sample Y row
		'<text x="30" y="96" class="lbl">build B</text>' +
		'<circle cx="238" cy="92" r="5" fill="none" stroke="var(--warn)" stroke-width="2"/><circle cx="390" cy="92" r="5" fill="none" stroke="var(--warn)" stroke-width="2"/><circle cx="454" cy="92" r="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		// merge arrows down to the shared rank axis
		'<path d="M 120 62 L 120 128" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowSTMW)"/>' +
		'<path d="M 238 100 L 232 128" stroke="var(--warn)" stroke-width="1.4" marker-end="url(#dgArrowSTMW)"/>' +
		'<path d="M 238 62 L 244 128" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowSTMW)"/>' +
		'<path d="M 330 62 L 330 128" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowSTMW)"/>' +
		'<path d="M 390 100 L 390 128" stroke="var(--warn)" stroke-width="1.4" marker-end="url(#dgArrowSTMW)"/>' +
		'<path d="M 454 100 L 454 128" stroke="var(--warn)" stroke-width="1.4" marker-end="url(#dgArrowSTMW)"/>' +
		// the rank axis
		'<line x1="90" y1="140" x2="490" y2="140" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="120" y="162" text-anchor="middle" class="lbl">1</text>' +
		'<text x="232" y="162" text-anchor="middle" class="lbl">2.5</text>' +
		'<text x="244" y="162" text-anchor="middle" class="lbl">2.5</text>' +
		'<text x="330" y="162" text-anchor="middle" class="lbl">4</text>' +
		'<text x="390" y="162" text-anchor="middle" class="lbl">5</text>' +
		'<text x="454" y="162" text-anchor="middle" class="lbl">6</text>' +
		// tie bracket over the shared midrank
		'<path d="M 224 174 L 224 182 L 252 182 L 252 174" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<text x="262" y="198" class="lbl" style="fill:var(--warn)">tied values: ranks 2 and 3 average to midrank 2.5 each</text>' +
		'<defs><marker id="dgArrowSTMW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="6" markerHeight="6" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'mann-whitney',
		title: 'The Mann-Whitney U Test',
		nav: 'mann-whitney u',
		difficulty: 'Hard',
		category: 'Modeling & Advanced',
		task: 'Implement midrank-tied Ranks, the U statistic pair (Ux, Uy), and the normal-approximation z for the Mann-Whitney test.',

		prose: [
			'<h2>The Mann-Whitney U Test</h2>' +
			'<p>You are comparing <strong>p99 latencies</strong> between two builds ' +
			'of a service. Latency distributions are heavy-tailed and wildly ' +
			'non-normal: most requests take 8&nbsp;ms, a few take 4&nbsp;seconds. ' +
			'A t-test compares <em>means</em>, and a mean is hostage to one ' +
			'outlier — a single GC pause in build&nbsp;A’s sample can swing the ' +
			'verdict. The Mann-Whitney U test (also called Wilcoxon rank-sum) ' +
			'asks a more robust question: <em>which group tends to be bigger?</em> ' +
			'It never looks at the values themselves, only at their ranks.</p>' +
			'<ul>' +
			'<li><strong>Rank the pooled data.</strong> Merge both samples, sort, ' +
			'and assign ranks 1..n. <strong>Ties get the midrank:</strong> if ' +
			'three equal values would occupy ranks 3, 4, 5, each gets ' +
			'(3+4+5)/3 = 4. Sort <em>index</em> pairs so you can hand each rank ' +
			'back to its original position, then walk runs of equal values.</li>' +
			'<li><strong>U from the rank-sum.</strong> With Rx the sum of the ' +
			'ranks that landed on xs: <code>Ux = Rx − nx(nx+1)/2</code>. The ' +
			'subtracted term is the smallest Rx can possibly be (xs occupying ' +
			'ranks 1..nx), so Ux counts the <em>excess</em> — precisely the ' +
			'number of (x,&nbsp;y) pairs where x outranks y, ties counting ½. ' +
			'And <code>Uy = nx·ny − Ux</code>: every pair is won, lost, or split.</li>' +
			'<li><strong>Extremes anchor the intuition.</strong> Complete ' +
			'separation (every y beats every x) gives Ux = 0; perfectly ' +
			'interleaved samples put U near the midpoint nx·ny/2.</li>' +
			'<li><strong>The z approximation.</strong> For decently sized ' +
			'samples, U is approximately normal under H0: ' +
			'<code>z = (min(Ux,Uy) − nx·ny/2) / √(nx·ny(nx+ny+1)/12)</code>. ' +
			'Compare |z| against 1.96 for a 5% two-sided test.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Ranks</code> (midrank ties), <code>UStat</code> ' +
			'(returning Ux then Uy), and <code>UZ</code>. Ranking throws away ' +
			'magnitudes <em>on purpose</em> — that is the robustness trade: a ' +
			'4-second outlier is just “the biggest one”, rank n, no matter how ' +
			'extreme it is.</p>',
			{ lang: 'txt', code: 'xs = {1.2 3.4 2.2 5.1}   ys = {2.2 4.5 6.1 3.3 7.0}\nsorted: 1.2  2.2  2.2  3.3  3.4  4.5  5.1  6.1  7.0\nranks : 1    2.5  2.5  4    5    6    7    8    9   (tie -> midrank)\nRx = 1 + 5 + 2.5 + 7 = 15.5\nUx = 15.5 - 4*5/2 = 5.5     Uy = 20 - 5.5 = 14.5' },
			'<div class="tip">Sanity check you get for free: <code>Ux + Uy</code> ' +
			'must equal <code>nx·ny</code>, always — each of the nx·ny pairs ' +
			'contributes exactly 1 to the two U’s combined. The harness pins the ' +
			'invariant as its own case; if it fails, your rank-sum or the ' +
			'subtraction is off.</div>',
		],

		starter: [
			'package main',
			'',
			'// Mann-Whitney U: a two-sample test on RANKS, robust to outliers',
			'// and non-normality. sort.Slice is available for the index sort.',
			'',
			'// Ranks assigns ranks 1..n to a combined sample, with TIED values',
			'// all receiving the average of the ranks they straddle (the',
			'// midrank): three equal values at sorted positions 3,4,5 each get',
			'// rank 4. The result is aligned with the INPUT order: out[i] is the',
			'// rank of all[i]. Sort index pairs, then walk runs of equal values.',
			'func Ranks(all []float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// UStat returns (Ux, Uy) for samples xs and ys. Rank the combined',
			'// sequence xs followed by ys, sum the ranks belonging to xs to get',
			'// Rx, then Ux = Rx - nx(nx+1)/2 and Uy = nx*ny - Ux. Ux counts the',
			'// (x, y) pairs where x outranks y, with ties counting one half.',
			'func UStat(xs, ys []float64) (float64, float64) {',
			'	// your code here',
			'	return 0, 0',
			'}',
			'',
			'// UZ is the large-sample normal approximation for the U test:',
			'//   z = (min(Ux,Uy) - nx*ny/2) / sqrt(nx*ny*(nx+ny+1)/12)',
			'// This is the plain variance WITHOUT the tie correction — with',
			'// heavy ties the true variance is slightly smaller, making this z',
			'// slightly conservative.',
			'func UZ(xs, ys []float64) float64 {',
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
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// p99 latency samples from two builds; 2.2 appears in BOTH',
			'	// samples, so the combined ranking exercises the midrank path.',
			'	xs := []float64{1.2, 3.4, 2.2, 5.1}',
			'	ys := []float64{2.2, 4.5, 6.1, 3.3, 7.0}',
			'	// Complete separation: every y beats every x.',
			'	sepX := []float64{1, 2, 3}',
			'	sepY := []float64{10, 20, 30, 40}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	// fmtRanks renders a rank slice as "[r1 r2 ...]" with fixed',
			'	// precision — float slices are never compared raw.',
			'	fmtRanks := func(rs []float64) string {',
			'		parts := make([]string, len(rs))',
			'		for i, r := range rs {',
			'			parts[i] = f4(r)',
			'		}',
			'		return "[" + strings.Join(parts, " ") + "]"',
			'	}',
			'	cases := []tc{',
			'		{"no ties: ranks are just the 1-based sort positions, returned in input order",',
			'			"[1.0000 3.0000 2.0000]",',
			'			func() string { return fmtRanks(Ranks([]float64{10, 30, 20})) }},',
			'		{"tie run: the three 3s straddle ranks 3,4,5 and each gets midrank 4",',
			'			"[4.0000 1.0000 6.0000 4.0000 2.0000 4.0000]",',
			'			func() string { return fmtRanks(Ranks([]float64{3, 1, 4, 3, 2, 3})) }},',
			'		{"pinned samples (with a cross-sample tie): Rx = 15.5, so Ux = 5.5 and Uy = 20 - 5.5",',
			'			"Ux=5.5000 Uy=14.5000",',
			'			func() string { ux, uy := UStat(xs, ys); return fmt.Sprintf("Ux=%s Uy=%s", f4(ux), f4(uy)) }},',
			'		{"invariant: Ux + Uy = nx*ny = 20 — every (x,y) pair is won, lost, or split",',
			'			"20.0000",',
			'			func() string { ux, uy := UStat(xs, ys); return f4(ux + uy) }},',
			'		{"complete separation: every y beats every x, so Ux = 0 and Uy = nx*ny = 12",',
			'			"Ux=0.0000 Uy=12.0000",',
			'			func() string { ux, uy := UStat(sepX, sepY); return fmt.Sprintf("Ux=%s Uy=%s", f4(ux), f4(uy)) }},',
			'		{"normal approximation on the pinned samples: z = (5.5 - 10)/sqrt(200/12)",',
			'			"-1.1023",',
			'			func() string { return f4(UZ(xs, ys)) }},',
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
			'// Ranks assigns midrank-tied ranks 1..n, aligned with input order.',
			'//',
			'// Design: sort INDICES rather than values. The sorted index slice',
			'// gives, for each sorted position, where that value came from — so',
			'// after computing a rank we can deposit it straight back into the',
			'// original slot without a second lookup structure.',
			'func Ranks(all []float64) []float64 {',
			'	n := len(all)',
			'	idx := make([]int, n)',
			'	for i := range idx {',
			'		idx[i] = i',
			'	}',
			'	sort.Slice(idx, func(a, b int) bool { return all[idx[a]] < all[idx[b]] })',
			'',
			'	rs := make([]float64, n)',
			'	// Walk runs of equal values. A run occupying sorted positions',
			'	// i..j (0-based) would take ranks i+1..j+1; their average is',
			'	// (i+j+2)/2 — the midrank every member of the run receives.',
			'	// Assigning sequential ranks to ties instead would make the test',
			'	// depend on sort order among equals, which is meaningless.',
			'	i := 0',
			'	for i < n {',
			'		j := i',
			'		for j+1 < n && all[idx[j+1]] == all[idx[i]] {',
			'			j++',
			'		}',
			'		mid := float64(i+j+2) / 2.0',
			'		for t := i; t <= j; t++ {',
			'			rs[idx[t]] = mid',
			'		}',
			'		i = j + 1',
			'	}',
			'	return rs',
			'}',
			'',
			'// UStat returns (Ux, Uy). The rank-sum route is O(n log n) versus',
			'// the O(nx*ny) definition "count pairs where x beats y" — and the',
			'// two agree exactly, midranks handling the half-credit for ties.',
			'func UStat(xs, ys []float64) (float64, float64) {',
			'	nx, ny := len(xs), len(ys)',
			'	// Combined sample with xs first: their ranks are the first nx',
			'	// entries of the result, so no bookkeeping of origins is needed.',
			'	combined := make([]float64, 0, nx+ny)',
			'	combined = append(combined, xs...)',
			'	combined = append(combined, ys...)',
			'	rs := Ranks(combined)',
			'',
			'	rankSumX := 0.0',
			'	for i := 0; i < nx; i++ {',
			'		rankSumX += rs[i]',
			'	}',
			'	// nx(nx+1)/2 is the minimum possible Rx (xs holding ranks',
			'	// 1..nx); subtracting it converts the rank-sum into a count of',
			'	// won pairs. Uy needs no second pass: the nx*ny pairs split',
			'	// exactly between the two statistics.',
			'	ux := rankSumX - float64(nx*(nx+1))/2.0',
			'	return ux, float64(nx*ny) - ux',
			'}',
			'',
			'// UZ is the normal approximation WITHOUT the tie correction: under',
			'// H0, U has mean nx*ny/2 and variance nx*ny*(nx+ny+1)/12. With',
			'// heavy ties the true variance is a bit smaller, so this z is',
			'// slightly conservative — fine for a first read, and stated in the',
			'// contract so callers are not surprised against R\'s wilcox.test.',
			'func UZ(xs, ys []float64) float64 {',
			'	ux, uy := UStat(xs, ys)',
			'	// Convention: test the smaller U (the tables and the classic',
			'	// formulation are written for it), giving a negative z.',
			'	u := ux',
			'	if uy < u {',
			'		u = uy',
			'	}',
			'	nx, ny := float64(len(xs)), float64(len(ys))',
			'	mean := nx * ny / 2.0',
			'	sd := math.Sqrt(nx * ny * (nx + ny + 1) / 12.0)',
			'	return (u - mean) / sd',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What U actually counts</h3>' +
			'<p>The cleanest way to think about U is not ranks at all: Ux is the ' +
			'number of (x,&nbsp;y) pairs in which x is larger, ties counting ½. ' +
			'Divide by the number of pairs and <code>Ux/(nx·ny)</code> becomes a ' +
			'probability estimate: <em>P(a random X exceeds a random Y)</em> — ' +
			'a quantity modern texts call the common-language effect size, and ' +
			'the exact number the ROC AUC computes in machine learning. A ' +
			'classifier’s AUC <em>is</em> a Mann-Whitney U statistic on the ' +
			'scores of positive vs negative examples, rescaled to [0,&nbsp;1]. ' +
			'The rank-sum formula you implemented is just the O(n&nbsp;log&nbsp;n) ' +
			'way to count those pairs.</p>' +
			'<h3>What the test does and does not assume</h3>' +
			'<p>Mann-Whitney is often sold as “the t-test without assumptions”, ' +
			'which oversells it. It drops normality, but to read a rejection as ' +
			'“the median shifted” you need the two distributions to have the ' +
			'same <em>shape</em>, differing only by location. With different ' +
			'shapes — one build bimodal, the other not — a significant U says ' +
			'only that one group <em>stochastically dominates</em> the other. ' +
			'For latency work that is usually the question you wanted anyway. ' +
			'The price of robustness is efficiency: under truly normal data the ' +
			'U test needs about 5% more samples than the t-test (asymptotic ' +
			'relative efficiency 3/π ≈ 0.955) — a famously cheap insurance ' +
			'premium against heavy tails, where the ordering flips dramatically ' +
			'in U’s favor.</p>' +
			'<h3>History and practice</h3>' +
			'<p>Wilcoxon published the rank-sum test in 1945 for equal sample ' +
			'sizes; Mann and Whitney generalized it in 1947 and worked out the ' +
			'U distribution — hence the double name (R’s ' +
			'<code>wilcox.test</code>, SciPy’s <code>mannwhitneyu</code>). For ' +
			'tiny samples, exact U tables replace the z approximation; the ' +
			'normal form you built is standard once both groups pass ' +
			'~10 observations. Two production notes: real latency data has ' +
			'<em>many</em> ties (clock granularity), where the tie-corrected ' +
			'variance matters — and if you need “by how much did p99 move”, a ' +
			'rank test cannot answer; pair it with a bootstrap confidence ' +
			'interval on the difference, which is exactly the next item.</p>',
		],
		complexity: { time: 'O(n log n) — dominated by the index sort in Ranks', space: 'O(n) for the index and rank slices' },
	});
})();
