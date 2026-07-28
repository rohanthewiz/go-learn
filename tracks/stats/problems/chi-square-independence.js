/* Chi-Square Independence — Hypothesis Testing (Medium). The contingency
 * table test: expected counts from the margins alone, squared surprise
 * per cell, (r-1)(c-1) degrees of freedom, verdict against a critical
 * value. The harness pins the full expected table, a clearly dependent
 * 2x2 (rejects at 3.841), an independent-ish table (fails to reject),
 * the df of a 2x3, and a perfectly proportional table where chi2 = 0.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// Observed table -> margins -> expected table, with one cell's O vs E
	// singled out. Marker id namespaced (dgArrowSTCS) because every track's
	// SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="a 2 by 2 observed table with row and column margins feeding an expected table; one cell highlights observed 40 versus expected 30">' +
		'<text x="20" y="22" class="lbl">observed counts + margins &#8594; what independence PREDICTS</text>' +
		// observed table (2x2 grid) — top-left cell highlighted
		'<text x="95" y="46" text-anchor="middle" class="lbl">observed</text>' +
		'<rect x="40" y="54" width="110" height="64" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<line x1="95" y1="54" x2="95" y2="118" stroke="var(--accent)" stroke-width="1"/>' +
		'<line x1="40" y1="86" x2="150" y2="86" stroke="var(--accent)" stroke-width="1"/>' +
		'<rect x="41" y="55" width="53" height="30" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="68" y="75" text-anchor="middle" style="fill:var(--warn)">40</text>' +
		'<text x="122" y="75" text-anchor="middle">10</text>' +
		'<text x="68" y="107" text-anchor="middle">20</text>' +
		'<text x="122" y="107" text-anchor="middle">30</text>' +
		// margins
		'<text x="170" y="75" class="lbl">row 50</text>' +
		'<text x="170" y="107" class="lbl">row 50</text>' +
		'<text x="68" y="138" text-anchor="middle" class="lbl">col 60</text>' +
		'<text x="122" y="138" text-anchor="middle" class="lbl">col 40</text>' +
		'<text x="95" y="158" text-anchor="middle" class="lbl">grand 100</text>' +
		// arrow into the expected table
		'<path d="M 228 86 L 292 86" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowSTCS)"/>' +
		'<text x="260" y="76" text-anchor="middle" class="lbl">row&#183;col/grand</text>' +
		// expected table
		'<text x="365" y="46" text-anchor="middle" class="lbl">expected (if independent)</text>' +
		'<rect x="310" y="54" width="110" height="64" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<line x1="365" y1="54" x2="365" y2="118" stroke="var(--accent)" stroke-width="1"/>' +
		'<line x1="310" y1="86" x2="420" y2="86" stroke="var(--accent)" stroke-width="1"/>' +
		'<text x="338" y="75" text-anchor="middle" style="fill:var(--warn)">30</text>' +
		'<text x="392" y="75" text-anchor="middle">20</text>' +
		'<text x="338" y="107" text-anchor="middle">30</text>' +
		'<text x="392" y="107" text-anchor="middle">20</text>' +
		'<text x="365" y="140" text-anchor="middle" class="lbl" style="fill:var(--warn)">this cell: O=40 vs E=30 &#8594; (40&#8722;30)&#178;/30 = 3.33</text>' +
		'<text x="20" y="182" class="lbl">&#967;&#178; = &#931; (O&#8722;E)&#178;/E over every cell — total squared surprise, in units of E</text>' +
		'<text x="20" y="202" class="lbl">df = (rows&#8722;1)(cols&#8722;1): margins are fixed, so only that many cells are free</text>' +
		'<defs><marker id="dgArrowSTCS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'chi-square-independence',
		title: 'Chi-Square Independence',
		nav: 'chi-square',
		difficulty: 'Medium',
		category: 'Hypothesis Testing',
		task: 'Implement Expected (margin-predicted counts), ChiSquare (Σ (O−E)²/E), ChiDF ((r−1)(c−1)), and Decide (compare against a critical value).',

		prose: [
			'<h2>Chi-Square Independence</h2>' +
			'<p>Product wants to know: does dark-mode preference depend on OS? You ' +
			'pull the numbers — of 50 macOS users, 40 chose dark mode; of 50 ' +
			'Windows users, only 20 did. That <em>looks</em> like a real ' +
			'difference. But counts wobble: flip 100 fair coins twice and the two ' +
			'tallies won’t match either. The question is never “are the columns ' +
			'different?” — they always are — but “are they more different than ' +
			'<strong>independence plus noise</strong> can explain?” Pearson’s ' +
			'chi-square test answers it in three moves:</p>' +
			'<ul>' +
			'<li><strong>Expected counts.</strong> If preference were independent ' +
			'of OS, each cell would just inherit the overall rates: ' +
			'<code>E = rowTotal &times; colTotal / grandTotal</code>. With 60% dark ' +
			'overall and 50 macOS users, independence predicts 30 dark macOS users ' +
			'— computed from the <em>margins alone</em>, no cell values used.</li>' +
			'<li><strong>Squared surprise.</strong> The statistic accumulates ' +
			'<code>&chi;&#178; = &Sigma; (O&minus;E)&#178;/E</code> over every ' +
			'cell. Dividing by E makes surprise relative: being off by 10 on an ' +
			'expected 30 is shocking; off by 10 on an expected 3000 is Tuesday.</li>' +
			'<li><strong>Degrees of freedom.</strong> With the margins pinned, an ' +
			'r&times;c table has only <code>(r&minus;1)(c&minus;1)</code> free ' +
			'cells — fill those and the rest are forced. A 2&times;2 has just ' +
			'one.</li>' +
			'<li><strong>The verdict.</strong> Compare &chi;&#178; against the ' +
			'critical value for that df. Above it: the association is bigger than ' +
			'noise explains — call it <em>dependent</em>. Below it: you have ' +
			'<em>no evidence of dependence</em> — which is not proof of ' +
			'independence, just an absence of evidence.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Expected(obs)</code> (a same-shaped table of ' +
			'margin-predicted counts), <code>ChiSquare(obs)</code> (the summed ' +
			'squared surprise), <code>ChiDF(obs)</code>, and ' +
			'<code>Decide(chi2, crit)</code> returning <code>"dependent"</code> ' +
			'when <code>chi2 &gt; crit</code> and ' +
			'<code>"no evidence of dependence"</code> otherwise.</p>',
			{ lang: 'txt', code: 'dark-mode by OS      dark  light  | row      expected under independence\nmacOS                 40    10   |  50        30    20\nWindows               20    30   |  50        30    20\ncol                   60    40   | 100\n\nχ² = 10²/30 + 10²/20 + 10²/30 + 10²/20 = 16.67   df=1, critical 3.841 → dependent' },
			'<div class="tip">The test is an approximation — the discrete counts ' +
			'are being matched to a continuous chi-square curve — and it degrades ' +
			'when cells are thin. The standard rule: every <em>expected</em> count ' +
			'should be at least 5 (expected, not observed!). Below that, use ' +
			'Fisher’s exact test, which enumerates tables instead of ' +
			'approximating.</div>',
		],

		starter: [
			'package main',
			'',
			'// 95% critical values for reference (used by the harness verdicts):',
			'//   df 1 -> 3.841,  df 2 -> 5.991,  df 4 -> 9.488',
			'',
			'// Expected returns a table with the same shape as obs where each',
			'// cell holds the count independence predicts from the margins:',
			'//',
			'//   E[i][j] = rowTotal(i) * colTotal(j) / grandTotal',
			'//',
			'// Only the margins matter — the individual cell values never enter',
			'// except through their row/column sums.',
			'func Expected(obs [][]float64) [][]float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// ChiSquare returns Pearson\'s statistic: the sum over every cell of',
			'//',
			'//   (O - E)^2 / E',
			'//',
			'// with E from Expected. It is total squared surprise, each cell\'s',
			'// contribution scaled by the count independence expected there.',
			'func ChiSquare(obs [][]float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// ChiDF returns the degrees of freedom of an r x c table:',
			'// (r-1) * (c-1). With margins fixed, only that many cells are free.',
			'func ChiDF(obs [][]float64) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Decide compares the statistic against a critical value:',
			'// "dependent" if chi2 > crit, else "no evidence of dependence".',
			'func Decide(chi2, crit float64) string {',
			'	// your code here',
			'	return ""',
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
			'	// Dark-mode preference by OS: rows = {macOS, Windows}, cols =',
			'	// {dark, light}. macOS leans 80/20 dark, Windows 40/60 — a real',
			'	// association, well past what margin noise explains.',
			'	dependent := [][]float64{{40, 10}, {20, 30}}',
			'	// Nearly identical column splits: the tiny differences are the',
			'	// kind independence produces on its own.',
			'	independentIsh := [][]float64{{28, 22}, {26, 24}}',
			'	// A 2x3: two OS rows, three theme columns (dark/light/auto).',
			'	twoByThree := [][]float64{{12, 15, 9}, {8, 10, 6}}',
			'	// Perfectly proportional rows (1:2 in both): O equals E in every',
			'	// cell, the statistic\'s true zero.',
			'	proportional := [][]float64{{10, 20}, {30, 60}}',
			'',
			'	// fmtTable renders a 2x2 as one comparable string; the shape',
			'	// guard keeps a nil/misshapen starter return from panicking.',
			'	fmtTable := func(t [][]float64) string {',
			'		if len(t) != 2 || len(t[0]) != 2 || len(t[1]) != 2 {',
			'			return "not a 2x2 table"',
			'		}',
			'		return fmt.Sprintf("%.4f %.4f | %.4f %.4f", t[0][0], t[0][1], t[1][0], t[1][1])',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"Expected from margins alone: 60% dark overall x 50 per row -> 30/20 in BOTH rows, whatever the observed cells say",',
			'			"30.0000 20.0000 | 30.0000 20.0000",',
			'			func() string { return fmtTable(Expected(dependent)) }},',
			'		{"chi2 on the dark-mode table: 2x(10²/30) + 2x(10²/20) — four cells of squared surprise",',
			'			"16.6667",',
			'			func() string { return fmt.Sprintf("%.4f", ChiSquare(dependent)) }},',
			'		{"verdict at df=1: 16.67 far exceeds the 3.841 critical — preference depends on OS",',
			'			"dependent",',
			'			func() string { return Decide(ChiSquare(dependent), 3.841) }},',
			'		{"independent-ish table: chi2 = 0.16 stays under 3.841 — the column differences are just noise",',
			'			"0.1610 no evidence of dependence",',
			'			func() string {',
			'				chi2 := ChiSquare(independentIsh)',
			'				return fmt.Sprintf("%.4f %s", chi2, Decide(chi2, 3.841))',
			'			}},',
			'		{"df of a 2x3 table: (2-1)x(3-1) = 2 — margins pin all but two cells",',
			'			"2",',
			'			func() string { return fmt.Sprintf("%d", ChiDF(twoByThree)) }},',
			'		{"perfectly proportional rows (1:2 and 1:2): O = E everywhere, chi2 is exactly zero",',
			'			"0.0000",',
			'			func() string { return fmt.Sprintf("%.4f", ChiSquare(proportional)) }},',
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
			'// margins computes row totals, column totals, and the grand total in',
			'// one pass. Every other function needs some subset of these, and',
			'// computing them together keeps the table walk in exactly one place.',
			'func margins(obs [][]float64) ([]float64, []float64, float64) {',
			'	rowTotals := make([]float64, len(obs))',
			'	colTotals := make([]float64, len(obs[0]))',
			'	grand := 0.0',
			'	for i, row := range obs {',
			'		for j, v := range row {',
			'			rowTotals[i] += v',
			'			colTotals[j] += v',
			'			grand += v',
			'		}',
			'	}',
			'	return rowTotals, colTotals, grand',
			'}',
			'',
			'// Expected: independence means P(row i AND col j) = P(row i)*P(col j),',
			'// so the predicted count is grand * (rowTot/grand) * (colTot/grand),',
			'// which simplifies to rowTot*colTot/grand. Note the observed cell',
			'// values appear only through their sums — that is the whole point:',
			'// the expected table is what the margins ALONE predict.',
			'func Expected(obs [][]float64) [][]float64 {',
			'	rowTotals, colTotals, grand := margins(obs)',
			'	expected := make([][]float64, len(obs))',
			'	for i := range obs {',
			'		expected[i] = make([]float64, len(obs[i]))',
			'		for j := range obs[i] {',
			'			expected[i][j] = rowTotals[i] * colTotals[j] / grand',
			'		}',
			'	}',
			'	return expected',
			'}',
			'',
			'// ChiSquare folds every cell\'s squared deviation, scaled by its',
			'// expected count. The division by E is what makes the statistic',
			'// comparable across cells of very different size — each term is',
			'// (roughly) a squared z-score for that cell\'s count.',
			'func ChiSquare(obs [][]float64) float64 {',
			'	expected := Expected(obs)',
			'	chi2 := 0.0',
			'	for i := range obs {',
			'		for j := range obs[i] {',
			'			d := obs[i][j] - expected[i][j]',
			'			chi2 += d * d / expected[i][j]',
			'		}',
			'	}',
			'	return chi2',
			'}',
			'',
			'// ChiDF: fixing r row totals and c column totals costs r+c-1',
			'// constraints (the two sets share the grand total), leaving',
			'// rc - (r+c-1) = (r-1)(c-1) cells free to vary.',
			'func ChiDF(obs [][]float64) int {',
			'	return (len(obs) - 1) * (len(obs[0]) - 1)',
			'}',
			'',
			'// Decide: strict inequality on purpose — landing exactly on the',
			'// critical value (measure-zero in theory, possible with rounded',
			'// tables in practice) conventionally fails to reject. The phrasing',
			'// "no evidence of dependence" is deliberate: failing to reject is',
			'// absence of evidence, never proof of independence.',
			'func Decide(chi2, crit float64) string {',
			'	if chi2 > crit {',
			'		return "dependent"',
			'	}',
			'	return "no evidence of dependence"',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Where the chi-square curve comes from</h3>' +
			'<p>Each cell count, under independence, is approximately normal with ' +
			'mean E and variance close to E (it is binomial, and for modest ' +
			'cell probabilities the binomial variance &approx; its mean — the ' +
			'Poisson regime). So <code>(O&minus;E)/&#8730;E</code> is roughly a ' +
			'standard normal z, and the statistic is a sum of squared z’s. A sum ' +
			'of k independent squared standard normals is <em>defined</em> to be ' +
			'chi-square with k df — but the cells are not independent (the margins ' +
			'tie them together), and accounting for those constraints is exactly ' +
			'what drops the df from <code>rc</code> to ' +
			'<code>(r&minus;1)(c&minus;1)</code>. Pearson published the statistic ' +
			'in 1900 with the df wrong; Fisher corrected it in 1922, one of the ' +
			'more famous feuds in statistics.</p>' +
			'<h3>What the test does not tell you</h3>' +
			'<p>Chi-square answers “is there an association?” — never “how big?” ' +
			'or “which way?”. With n large enough, a trivially small association ' +
			'becomes “significant”: double every count in a table and &chi;&#178; ' +
			'doubles too, with df unchanged. Effect-size companions like ' +
			'Cram&eacute;r’s V (<code>&#8730;(&chi;&#178;/(n&middot;min(r&minus;1,' +
			'c&minus;1)))</code>) rescale the statistic into [0,1] to answer the ' +
			'size question. And to see <em>which</em> cells drive a rejection, ' +
			'inspect the per-cell standardized residuals ' +
			'<code>(O&minus;E)/&#8730;E</code> — the terms you summed, before ' +
			'squaring away their signs.</p>' +
			'<h3>In the wild</h3>' +
			'<p>This test is everywhere counts meet categories: A/B tests with ' +
			'convert/don’t-convert columns (the 2&times;2 here <em>is</em> that ' +
			'analysis), log analysis (does error type depend on region?), ' +
			'genetics (Mendel’s ratios were checked with it — famously, Fisher ' +
			'argued his data fit <em>too</em> well), and the goodness-of-fit ' +
			'variant validates random number generators in test suites like ' +
			'dieharder. The classic production bug is running it on ' +
			'<em>percentages</em> instead of raw counts — the statistic scales ' +
			'with n, so feeding it rates silently destroys its calibration. ' +
			'Always sum real, whole observations.</p>',
		],
		complexity: { time: 'O(r·c) — a constant number of passes over the table', space: 'O(r·c) for the expected table' },
	});
})();
