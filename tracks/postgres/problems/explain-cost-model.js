/* EXPLAIN: The Cost Model — Planner (Medium). The numbers in EXPLAIN's
 * "cost=0.00..2000.00" are not milliseconds — they are arithmetic over five
 * GUC constants: pages × seq_page_cost + rows × cpu_tuple_cost for a seq
 * scan; selectivity-scaled random_page_cost and per-tuple CPU for an index
 * scan. The harness pins both formulas, the selectivity crossover where the
 * plans trade places, and the random_page_cost=1.1 SSD flip.
 */
(function () {
	'use strict';
	var T = GoLearnPG;

	// Cost vs selectivity: the seq scan is a flat line (it reads everything
	// regardless), the index scan is a rising line through the origin; plans
	// flip where they cross. Marker id namespaced (dgArrowPG07) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="cost versus selectivity: seq scan cost is a flat horizontal line, index scan cost rises with selectivity, and the planner switches plans where the lines cross">' +
		'<text x="20" y="24" class="lbl">cost vs selectivity — the planner picks whichever line is lower</text>' +
		// axes
		'<line x1="60" y1="170" x2="530" y2="170" stroke="var(--edge)" stroke-width="1.5"/>' +
		'<line x1="60" y1="170" x2="60" y2="40" stroke="var(--edge)" stroke-width="1.5"/>' +
		'<text x="295" y="192" text-anchor="middle" class="lbl">selectivity (fraction of rows matched)</text>' +
		'<text x="34" y="105" text-anchor="middle" class="lbl" transform="rotate(-90 34 105)">cost</text>' +
		// seq scan: flat line
		'<line x1="60" y1="100" x2="530" y2="100" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="466" y="92" class="lbl" style="fill:var(--accent)">seq scan (flat: reads all pages anyway)</text>' +
		// index scan: rising line
		'<line x1="60" y1="166" x2="450" y2="48" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="404" y="44" class="lbl" style="fill:var(--warn)">index scan (pays per match)</text>' +
		// crossover
		'<circle cx="232" cy="100" r="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<path d="M 232 140 L 232 110" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowPG07)"/>' +
		'<text x="232" y="158" text-anchor="middle" class="lbl" style="fill:var(--warn)">crossover: plans trade places</text>' +
		'<text x="72" y="60" class="lbl">lowering random_page_cost tilts the rising line down → crossover moves right</text>' +
		'<defs><marker id="dgArrowPG07" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'explain-cost-model',
		title: 'EXPLAIN: The Cost Model',
		nav: 'explain cost model',
		difficulty: 'Medium',
		category: 'Planner',
		task: 'Implement the planner’s arithmetic: SeqScanCost, a simplified IndexScanCost from selectivity, and PickPlan choosing the cheaper.',

		prose: [
			'<h2>EXPLAIN: The Cost Model</h2>' +
			'<p>A query that should use the index does a sequential scan, and the ' +
			'team’s first instinct is “the planner is broken”. Then you run ' +
			'<code>EXPLAIN</code> and read <code>Seq Scan … cost=0.00..2000.00</code> ' +
			'vs <code>Index Scan … cost=0.42..2750.00</code> — the planner ' +
			'<em>looked at the index and priced it as worse</em>. Those numbers ' +
			'are not milliseconds; they are unit-less arithmetic you can ' +
			'reproduce with five GUC constants (defaults in parentheses):</p>' +
			'<ul>' +
			'<li><code>seq_page_cost</code> (1.0) — reading a page sequentially, ' +
			'the unit everything else is measured in.</li>' +
			'<li><code>random_page_cost</code> (4.0) — reading a page “randomly”, ' +
			'priced 4x because the default was tuned for spinning disks.</li>' +
			'<li><code>cpu_tuple_cost</code> (0.01) — processing one row; ' +
			'<code>cpu_index_tuple_cost</code> (0.005) — one index entry.</li>' +
			'</ul>' +
			'<p><strong>Seq scan:</strong> read every page sequentially, process ' +
			'every row: <code>pages × seq_page_cost + rows × cpu_tuple_cost</code>. ' +
			'Note what is missing — the WHERE clause. A seq scan costs the same ' +
			'whether it returns 1 row or all of them, which is why its line in ' +
			'the diagram is flat.</p>' +
			'<p><strong>Index scan</strong> (simplified here): with selectivity ' +
			'<code>s</code> (the estimated fraction of rows matching), fetch ' +
			'<code>pages × s</code> heap pages at <code>random_page_cost</code> ' +
			'each, and pay <code>rows × s × (cpu_index_tuple_cost + ' +
			'cpu_tuple_cost)</code> for the entries and rows processed. The real ' +
			'planner adds btree descent, correlation, and Mackert–Lohman page ' +
			'estimates — but this linear skeleton already reproduces its ' +
			'decisions.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>SeqScanCost</code>, <code>IndexScanCost</code>, ' +
			'and <code>PickPlan</code> — return <code>"Index Scan"</code> only ' +
			'when it is strictly cheaper, else <code>"Seq Scan"</code>. The ' +
			'harness passes the GUCs in a <code>CostParams</code> struct, ' +
			'including the modern-hardware <code>random_page_cost = 1.1</code> ' +
			'that flips a plan.</p>',
			{ lang: 'txt', code: 'table: 1000 pages, 100,000 rows (defaults: 1.0 / 4.0 / 0.01 / 0.005)\n\nseq scan            = 1000*1.0 + 100000*0.01                    = 2000\nindex scan, s=0.001 = 1000*0.001*4.0 + 100*(0.005+0.01)         = 5.5     index wins\nindex scan, s=0.5   = 500*4.0 + 50000*0.015                     = 2750    seq wins\ncrossover           = 2000 / (4000 + 1500)  ≈  s = 0.36' },
			'<div class="tip">The model prices <em>I/O patterns</em>, not clock ' +
			'time — and it believes whatever <code>random_page_cost</code> tells ' +
			'it about your storage. On NVMe, leaving the spinning-disk default of ' +
			'4.0 makes the planner irrationally afraid of indexes; 1.1 is the ' +
			'widely used setting, and you will compute below exactly which plan ' +
			'it changes.</div>',
		],

		starter: [
			'package main',
			'',
			'// CostParams carries the planner GUCs. The harness passes defaults',
			'// (1.0, 4.0, 0.01, 0.005) and an SSD-tuned variant.',
			'type CostParams struct {',
			'	SeqPageCost       float64 // seq_page_cost',
			'	RandomPageCost    float64 // random_page_cost',
			'	CpuTupleCost      float64 // cpu_tuple_cost',
			'	CpuIndexTupleCost float64 // cpu_index_tuple_cost',
			'}',
			'',
			'// SeqScanCost: every page read sequentially, every row processed —',
			'// selectivity does not appear.',
			'func SeqScanCost(pages, rows int, p CostParams) float64 {',
			'	// your code here (missing the per-row CPU term)',
			'	return float64(pages) * p.SeqPageCost',
			'}',
			'',
			'// IndexScanCost, simplified: sel is the fraction of rows matched.',
			'// Fetch pages*sel heap pages at RandomPageCost; pay rows*sel *',
			'// (CpuIndexTupleCost + CpuTupleCost) for entries and rows.',
			'func IndexScanCost(pages, rows int, sel float64, p CostParams) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// PickPlan returns "Index Scan" when it is strictly cheaper than',
			'// the seq scan, otherwise "Seq Scan".',
			'func PickPlan(pages, rows int, sel float64, p CostParams) string {',
			'	// your code here',
			'	return "Seq Scan"',
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
			'	// The canonical table: 1000 pages, 100 rows per page.',
			'	def := CostParams{SeqPageCost: 1.0, RandomPageCost: 4.0, CpuTupleCost: 0.01, CpuIndexTupleCost: 0.005}',
			'	ssd := CostParams{SeqPageCost: 1.0, RandomPageCost: 1.1, CpuTupleCost: 0.01, CpuIndexTupleCost: 0.005}',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"seq scan, 1000 pages x 100k rows: 1000 + 1000 = 2000 — flat, WHERE-independent",',
			'			"2000.00",',
			'			func() string { return fmt.Sprintf("%.2f", SeqScanCost(1000, 100000, def)) }},',
			'		{"seq scan of a 1-page lookup table: 1 + 1 = 2",',
			'			"2.00",',
			'			func() string { return fmt.Sprintf("%.2f", SeqScanCost(1, 100, def)) }},',
			'		{"index scan at s=0.001 (100 rows): 4.0 of I/O + 1.5 of CPU",',
			'			"5.50",',
			'			func() string { return fmt.Sprintf("%.2f", IndexScanCost(1000, 100000, 0.001, def)) }},',
			'		{"index scan at s=0.5: 500 random pages at 4x = 2750 — pricier than reading everything",',
			'			"2750.00",',
			'			func() string { return fmt.Sprintf("%.2f", IndexScanCost(1000, 100000, 0.5, def)) }},',
			'		{"PickPlan s=0.001: highly selective — index",',
			'			"Index Scan",',
			'			func() string { return PickPlan(1000, 100000, 0.001, def) }},',
			'		{"PickPlan s=0.5: half the table — seq",',
			'			"Seq Scan",',
			'			func() string { return PickPlan(1000, 100000, 0.5, def) }},',
			'		{"crossover, left edge: s=0.35 still favors the index (1925 vs 2000)",',
			'			"Index Scan",',
			'			func() string { return PickPlan(1000, 100000, 0.35, def) }},',
			'		{"crossover, right edge: s=0.37 tips to seq (2035 vs 2000)",',
			'			"Seq Scan",',
			'			func() string { return PickPlan(1000, 100000, 0.37, def) }},',
			'		{"same s=0.5 query, random_page_cost=1.1 (SSD): 1300 vs 2000 — the plan flips to index",',
			'			"Index Scan",',
			'			func() string { return PickPlan(1000, 100000, 0.5, ssd) }},',
			'		{"s=1.0 (no filter at all): even on SSD the seq scan wins",',
			'			"Seq Scan",',
			'			func() string { return PickPlan(1000, 100000, 1.0, ssd) }},',
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
			'// CostParams carries the planner GUCs. The harness passes defaults',
			'// (1.0, 4.0, 0.01, 0.005) and an SSD-tuned variant.',
			'type CostParams struct {',
			'	SeqPageCost       float64 // seq_page_cost',
			'	RandomPageCost    float64 // random_page_cost',
			'	CpuTupleCost      float64 // cpu_tuple_cost',
			'	CpuIndexTupleCost float64 // cpu_index_tuple_cost',
			'}',
			'',
			'// SeqScanCost prices the two things a seq scan does: stream every',
			'// page (sequential rate) and evaluate every row. Selectivity is',
			'// deliberately absent — the scan cannot skip pages it has not read,',
			'// so a WHERE that rejects 99.9% of rows saves output, not cost.',
			'// That flatness is the whole reason a crossover point exists.',
			'func SeqScanCost(pages, rows int, p CostParams) float64 {',
			'	return float64(pages)*p.SeqPageCost + float64(rows)*p.CpuTupleCost',
			'}',
			'',
			'// IndexScanCost scales both the I/O and CPU terms by selectivity.',
			'// Heap pages are charged at RandomPageCost: index order rarely',
			'// matches heap order, so each matching row is presumed to land on',
			'// a "random" page. This is the model\'s load-bearing assumption —',
			'// and its biggest simplification: the real planner discounts it by',
			'// physical correlation (pg_stats.correlation) and by the chance of',
			'// revisiting an already-cached page (Mackert–Lohman). Both refine-',
			'// ments shrink the I/O term; neither changes its linear shape.',
			'func IndexScanCost(pages, rows int, sel float64, p CostParams) float64 {',
			'	pageIO := float64(pages) * sel * p.RandomPageCost',
			'	perTuple := float64(rows) * sel * (p.CpuIndexTupleCost + p.CpuTupleCost)',
			'	return pageIO + perTuple',
			'}',
			'',
			'// PickPlan: the index must be strictly cheaper to win; ties fall to',
			'// the seq scan, which is the safer default — sequential I/O has',
			'// predictable worst-case behavior and no dependence on the',
			'// selectivity estimate being right.',
			'func PickPlan(pages, rows int, sel float64, p CostParams) string {',
			'	if IndexScanCost(pages, rows, sel, p) < SeqScanCost(pages, rows, p) {',
			'		return "Index Scan"',
			'	}',
			'	return "Seq Scan"',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why an abstract cost, not time</h3>' +
			'<p>The planner must compare thousands of candidate plans in ' +
			'microseconds, on any hardware, before executing anything — so it ' +
			'prices plans in an invented unit (“the cost of one sequential page ' +
			'read”) and trusts five constants to describe the machine. This is a ' +
			'deliberate design: a model that is <em>consistent</em> matters more ' +
			'than one that is <em>calibrated</em>, because the planner only ever ' +
			'compares costs to each other, never to a clock. The failure mode ' +
			'follows directly: when the constants misdescribe the hardware (the ' +
			'4.0 spinning-disk default on NVMe) every comparison is skewed the ' +
			'same direction — systematically anti-index.</p>' +
			'<h3>What the real model adds</h3>' +
			'<ul>' +
			'<li><strong>Startup cost.</strong> EXPLAIN prints ' +
			'<code>cost=startup..total</code>; a btree descent charges a small ' +
			'startup, which is why 1-page tables seq scan even when an index ' +
			'exists. With <code>LIMIT</code>, the planner interpolates toward ' +
			'startup cost — the source of the classic ' +
			'<code>ORDER BY … LIMIT 1</code> pathology where a barely-started ' +
			'index scan is priced near zero and then runs forever.</li>' +
			'<li><strong>Selectivity comes from statistics.</strong> Your ' +
			'<code>sel</code> parameter is estimated from ' +
			'<code>pg_stats</code> histograms and most-common-value lists. ' +
			'Cross-column correlation breaks it (<code>city = &#39;SF&#39; AND state = ' +
			'&#39;CA&#39;</code> multiplies as if independent); ' +
			'<code>CREATE STATISTICS</code> exists for exactly that. Most “planner ' +
			'is broken” incidents are selectivity-estimate incidents: check ' +
			'<code>EXPLAIN ANALYZE</code>’s estimated-vs-actual rows first.</li>' +
			'<li><strong>Correlation and caching.</strong> ' +
			'<code>effective_cache_size</code> and the table’s physical ordering ' +
			'discount the random-I/O term — a freshly <code>CLUSTER</code>ed ' +
			'table gets index scans a shuffled one would not.</li>' +
			'</ul>' +
			'<h3>Operational levers, in order of preference</h3>' +
			'<p>1) Fix statistics (<code>ANALYZE</code>, raise ' +
			'<code>default_statistics_target</code>, extended statistics). ' +
			'2) Describe the hardware honestly: <code>random_page_cost = 1.1</code> ' +
			'and a realistic <code>effective_cache_size</code> on SSD-backed ' +
			'instances — the single highest-leverage pair of planner GUCs. ' +
			'3) Only then reach for the blunt instruments ' +
			'(<code>enable_seqscan = off</code> is a diagnostic, never a ' +
			'setting). The arithmetic you implemented is ' +
			'<code>cost_seqscan</code> and <code>cost_index</code> in ' +
			'<code>costsize.c</code> — readable C, and worth the visit.</p>',
		],
		complexity: { time: 'O(1) — closed-form cost formulas', space: 'O(1)' },
	});
})();
