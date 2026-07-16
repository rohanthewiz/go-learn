/* Aggregates & GROUP BY — SQL: Foundations (Medium). GROUP BY, the
 * WHERE-vs-HAVING pipeline, and NULL's fingerprints on every aggregate:
 * count(*) vs count(col), avg() vs sum()/count(*) (they disagree the moment
 * a NULL appears — plus integer division), a HAVING that cannot be written
 * as WHERE (the engine itself says "aggregates are not allowed in WHERE"),
 * a WHERE+HAVING mix where moving the row filter into HAVING changes the
 * answer, and grouping by a CASE bucket. The harness seeds a sales table
 * with NULL amounts placed to make every naive query visibly wrong.
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// The logical query pipeline: WHERE and HAVING are both filters, but
	// they run at different STAGES — WHERE on rows before groups exist,
	// HAVING on groups after aggregation. Marker id namespaced
	// (dgArrowDBAG) — all tracks share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 208" width="560" height="208" role="img" aria-label="query pipeline: rows flow through WHERE (a row filter) into GROUP BY buckets, aggregates compute per bucket, then HAVING filters whole groups">' +
		'<text x="20" y="22" class="lbl">two gates, two stages: WHERE cuts rows before buckets exist; HAVING cuts whole groups after aggregation</text>' +
		// stage boxes
		'<rect x="20" y="56" width="70" height="48" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="55" y="77" text-anchor="middle">sales</text>' +
		'<text x="55" y="95" text-anchor="middle" class="lbl">10 rows</text>' +
		'<rect x="110" y="56" width="100" height="48" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="160" y="77" text-anchor="middle">WHERE</text>' +
		'<text x="160" y="95" text-anchor="middle" class="lbl">amount &gt;= 100</text>' +
		'<rect x="230" y="56" width="100" height="48" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="280" y="77" text-anchor="middle">GROUP BY</text>' +
		'<text x="280" y="95" text-anchor="middle" class="lbl">region → buckets</text>' +
		'<rect x="350" y="56" width="100" height="48" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="400" y="77" text-anchor="middle">HAVING</text>' +
		'<text x="400" y="95" text-anchor="middle" class="lbl">count(*) &gt;= 2</text>' +
		'<rect x="470" y="56" width="70" height="48" rx="5" fill="none" stroke="var(--ok)"/>' +
		'<text x="505" y="77" text-anchor="middle">result</text>' +
		'<text x="505" y="95" text-anchor="middle" class="lbl">2 rows</text>' +
		// flow arrows
		'<line x1="90" y1="80" x2="106" y2="80" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBAG)"/>' +
		'<line x1="210" y1="80" x2="226" y2="80" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBAG)"/>' +
		'<line x1="330" y1="80" x2="346" y2="80" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBAG)"/>' +
		'<line x1="450" y1="80" x2="466" y2="80" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBAG)"/>' +
		// stage annotations
		'<text x="160" y="130" text-anchor="middle" class="lbl" style="fill:var(--warn)">row filter — no groups yet,</text>' +
		'<text x="160" y="146" text-anchor="middle" class="lbl" style="fill:var(--warn)">so no aggregates; NULLs fail it too</text>' +
		'<text x="400" y="130" text-anchor="middle" class="lbl" style="fill:var(--warn)">group filter — aggregates exist now,</text>' +
		'<text x="400" y="146" text-anchor="middle" class="lbl" style="fill:var(--warn)">keeps or drops a whole bucket</text>' +
		'<text x="280" y="130" text-anchor="middle" class="lbl">count/sum/avg run</text>' +
		'<text x="280" y="146" text-anchor="middle" class="lbl">once per bucket</text>' +
		'<text x="20" y="186" class="lbl">the engine enforces the stages: put an aggregate in WHERE and it refuses — “aggregates are not allowed in WHERE; use HAVING”</text>' +
		'<defs><marker id="dgArrowDBAG" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'aggregates-groupby',
		title: 'Aggregates: GROUP BY, HAVING, and NULL’s Fingerprints',
		nav: 'group by & having',
		difficulty: 'Medium',
		category: 'SQL: Foundations',
		task: 'Write five aggregate queries over a sales table with NULL amounts: count(*) vs count(amount), a HAVING that WHERE cannot express, a WHERE+HAVING mix, avg vs sum/count(*), and a CASE-bucket GROUP BY.',

		prose: [
			'<h2>Aggregates: GROUP BY, HAVING, and NULL’s fingerprints</h2>' +
			'<p>The board deck says the average deal is <strong>266</strong>. ' +
			'Finance says <strong>400</strong>. Both queries ran this morning, ' +
			'against the same table, and both are “an average of ' +
			'<code>amount</code>” — one is <code>avg(amount)</code>, the other ' +
			'<code>sum(amount) / count(*)</code>. Neither analyst is wrong about ' +
			'their arithmetic; they disagree about what a NULL amount ' +
			'<em>means</em>. Every aggregate query over real data eventually has ' +
			'this argument, so this item makes you have it now:</p>' +
			'<ul>' +
			'<li><strong><code>GROUP BY</code> buckets rows,</strong> then each ' +
			'aggregate collapses one bucket to one value: one output row per ' +
			'group, always.</li>' +
			'<li><strong>Aggregates skip NULLs</strong> — all of them except ' +
			'<code>count(*)</code>, which counts <em>rows</em>. So ' +
			'<code>count(amount)</code> ≤ <code>count(*)</code>, and ' +
			'<code>avg(amount)</code> is <code>sum(amount) / count(amount)</code>, ' +
			'<em>not</em> <code>sum(amount) / count(*)</code>. A bucket that is ' +
			'all NULLs has <code>sum = NULL</code>, <code>avg = NULL</code>, ' +
			'<code>count(amount) = 0</code>.</li>' +
			'<li><strong><code>WHERE</code> and <code>HAVING</code> are the same ' +
			'idea at different stages.</strong> WHERE filters <em>rows</em> ' +
			'before any bucket exists — it cannot mention an aggregate (the ' +
			'engine will tell you so, verbatim). HAVING filters whole ' +
			'<em>groups</em> after aggregation — it is the only place a ' +
			'condition on <code>sum()</code> or <code>count()</code> can live.</li>' +
			'<li><strong>You can group by an expression,</strong> not just a ' +
			'column — a <code>CASE</code> that maps each row into a named bucket ' +
			'is the classic histogram move. Repeat the expression in ' +
			'<code>GROUP BY</code>: the SELECT alias isn’t visible there in this ' +
			'engine (SELECT is computed <em>after</em> grouping).</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>The harness has created and seeded this table (NULL amounts are ' +
			'deals still in negotiation — recorded, but priceless in the literal ' +
			'sense):</p>',
			{ lang: 'sql', code: 'CREATE TABLE sales (id INT PRIMARY KEY, region TEXT NOT NULL,\n                    rep TEXT NOT NULL, amount INT);   -- amount nullable\n\nINSERT INTO sales (id, region, rep, amount) VALUES\n  (1,\'east\',\'maya\',500), (2,\'east\',\'maya\',300), (3,\'east\',\'tom\',NULL),\n  (4,\'west\',\'ana\',100),  (5,\'west\',\'ana\',200),  (6,\'west\',\'raj\',NULL),\n  (7,\'south\',\'ivy\',50),  (8,\'south\',\'ivy\',80),  (9,\'south\',\'ivy\',90),\n  (10,\'north\',\'kim\',NULL);   -- north: nothing but a NULL' },
			'<h3>Your job</h3>' +
			'<p>Each function returns one SQL string; the harness executes it and ' +
			'compares exact rows, so use exactly the columns and ' +
			'<code>ORDER BY</code> asked for.</p>' +
			'<ul>' +
			'<li><code>RegionCounts</code> — <code>region, count(*), ' +
			'count(amount)</code> per region, <code>ORDER BY region</code>.</li>' +
			'<li><code>HighVolumeRegions</code> — <code>region, sum(amount)</code> ' +
			'for regions with <code>sum(amount) &gt;= 300</code>, ' +
			'<code>ORDER BY region</code>.</li>' +
			'<li><code>BigSaleRegions</code> — regions with at least two sales of ' +
			'100 or more: <code>region, count(*)</code> counting only those big ' +
			'sales, <code>ORDER BY region</code>.</li>' +
			'<li><code>AverageTwoWays</code> — <code>region, avg(amount), ' +
			'sum(amount) / count(*)</code> side by side, ' +
			'<code>ORDER BY region</code>.</li>' +
			'<li><code>DealSizeBuckets</code> — one row per bucket with its ' +
			'<code>count(*)</code>: <code>\'large\'</code> for amounts ≥ 300, ' +
			'<code>\'unknown\'</code> for NULL, <code>\'small\'</code> otherwise, ' +
			'<code>ORDER BY bucket</code>. (Test the NULL arm first — ' +
			'<code>NULL &gt;= 300</code> isn’t true, but explicit beats ' +
			'implicit.)</li>' +
			'</ul>' +
			'<div class="tip">Two starters are pre-filled with tempting drafts: ' +
			'one the engine rejects outright, one that returns rows — the wrong ' +
			'ones. The second kind is the dangerous kind.</div>',
		],

		starter: [
			'package main',
			'',
			'// The harness has already created and seeded:',
			'//',
			'//   sales(id INT PK, region TEXT NOT NULL, rep TEXT NOT NULL,',
			'//         amount INT)              -- amount is NULLABLE',
			'//',
			'// Each function returns ONE SQL string. The harness runs it and',
			'// compares exact rows — include the ORDER BY each doc comment',
			'// specifies. Watch where the NULL amounts leave fingerprints.',
			'',
			'// RegionCounts: region, count(*), count(amount) per region,',
			'// ORDER BY region. Two of the four regions make the counts differ',
			'// — predict which before you run.',
			'func RegionCounts() string {',
			'	// your code here',
			'	return ``',
			'}',
			'',
			'// HighVolumeRegions: region, sum(amount) for regions whose total',
			'// is at least 300, ORDER BY region. The draft below reads',
			'// naturally — "where the sum is big enough" — but filters at the',
			'// wrong stage. Run it and read the engine\'s answer.',
			'func HighVolumeRegions() string {',
			'	return `SELECT region, sum(amount)',
			'FROM sales',
			'WHERE sum(amount) >= 300',
			'GROUP BY region',
			'ORDER BY region`',
			'}',
			'',
			'// BigSaleRegions: regions with AT LEAST TWO sales of >= 100 each:',
			'// region, count(*) (counting only those big sales), ORDER BY',
			'// region. The draft counts every sale, so a region full of small',
			'// deals sneaks in. One filter is per-ROW, one per-GROUP — place',
			'// each at its own stage.',
			'func BigSaleRegions() string {',
			'	return `SELECT region, count(*)',
			'FROM sales',
			'GROUP BY region',
			'HAVING count(*) >= 2',
			'ORDER BY region`',
			'}',
			'',
			'// AverageTwoWays: region, avg(amount), sum(amount) / count(*),',
			'// ORDER BY region. Both columns claim to be "the average" —',
			'// return them side by side and see where (and why) they disagree.',
			'func AverageTwoWays() string {',
			'	// your code here',
			'	return ``',
			'}',
			'',
			'// DealSizeBuckets: bucket, count(*) where bucket is \'unknown\'',
			'// for NULL amount, \'large\' for amount >= 300, else \'small\'.',
			'// ORDER BY bucket. GROUP BY must repeat the CASE expression —',
			'// the SELECT alias is not visible to GROUP BY in this engine.',
			'func DealSizeBuckets() string {',
			'	// your code here',
			'	return ``',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"os"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			T.HARNESS_RT,
			'',
			T.DB_RT,
			'',
			'func main() {',
			'	db, cleanup := openDB("aggregates-groupby")',
			'	defer cleanup()',
			'',
			'	// NULL placement is the whole design of this dataset:',
			'	//   east/west: one NULL each      -> count(*) vs count(amount) split',
			'	//   south: no NULLs, all small    -> sneaks into a HAVING-only count',
			'	//   north: ONLY a NULL            -> sum/avg NULL, count(amount) 0',
			'	mustExec(db, `CREATE TABLE sales (id INT PRIMARY KEY, region TEXT NOT NULL, rep TEXT NOT NULL, amount INT)`)',
			'	mustExec(db, `INSERT INTO sales (id, region, rep, amount) VALUES',
			'		(1,\'east\',\'maya\',500), (2,\'east\',\'maya\',300), (3,\'east\',\'tom\',NULL),',
			'		(4,\'west\',\'ana\',100), (5,\'west\',\'ana\',200), (6,\'west\',\'raj\',NULL),',
			'		(7,\'south\',\'ivy\',50), (8,\'south\',\'ivy\',80), (9,\'south\',\'ivy\',90),',
			'		(10,\'north\',\'kim\',NULL)`)',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		q    func() string',
			'	}',
			'	// want strings pinned from the reference solution\'s actual rows',
			'	// (fmt %v of [][]any; NULL prints <nil>). Rows are compared as',
			'	// rendered values, so any equivalent SQL formulation passes.',
			'	cases := []tc{',
			'		{"count(*) vs count(amount): east and west differ by their NULL; north is 1 vs 0",',
			'			"[[east 3 2] [north 1 0] [south 3 3] [west 3 2]]",',
			'			RegionCounts},',
			'		{"HAVING on an aggregate: sum(amount) >= 300 cannot be a WHERE",',
			'			"[[east 800] [west 300]]",',
			'			HighVolumeRegions},',
			'		{"row filter + group filter: south\'s three small sales must NOT qualify it",',
			'			"[[east 2] [west 2]]",',
			'			BigSaleRegions},',
			'		{"avg(amount) vs sum(amount)/count(*): east says 400 vs 266 — NULLs and integer division",',
			'			"[[east 400 266] [north <nil> <nil>] [south 73.33333333333333 73] [west 150 100]]",',
			'			AverageTwoWays},',
			'		{"GROUP BY a CASE bucket: large / small / unknown histogram",',
			'			"[[large 2] [small 5] [unknown 3]]",',
			'			DealSizeBuckets},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			res, err := db.Exec(c.q())',
			'			if err != nil {',
			'				r["pass"] = false',
			'				r["got"] = "SQL error: " + err.Error()',
			'				return',
			'			}',
			'			got := rowsStr(res)',
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
			'// RegionCounts: the two counts answer different questions —',
			'// count(*) is "how many sales records", count(amount) is "how many',
			'// PRICED sales". east and west each carry one in-negotiation NULL',
			'// (3 vs 2); north is a single NULL row (1 vs 0). Reporting both',
			'// side by side is a cheap data-quality probe worth keeping in real',
			'// dashboards: the gap IS the number of NULLs.',
			'func RegionCounts() string {',
			'	return `SELECT region, count(*), count(amount)',
			'FROM sales',
			'GROUP BY region',
			'ORDER BY region`',
			'}',
			'',
			'// HighVolumeRegions: the filter tests an AGGREGATE, so it can only',
			'// run after grouping — that is HAVING by definition. WHERE runs',
			'// before buckets exist; there is no sum(amount) yet to test, which',
			'// is why the engine rejects the WHERE version outright instead of',
			'// guessing. (north\'s all-NULL sum is NULL: NULL >= 300 is not',
			'// true, so HAVING drops it — no special-casing needed.)',
			'func HighVolumeRegions() string {',
			'	return `SELECT region, sum(amount)',
			'FROM sales',
			'GROUP BY region',
			'HAVING sum(amount) >= 300',
			'ORDER BY region`',
			'}',
			'',
			'// BigSaleRegions: two filters, two stages. WHERE amount >= 100',
			'// discards small (and NULL — NULL >= 100 is not true) rows BEFORE',
			'// grouping, so count(*) then counts only big sales; HAVING keeps',
			'// groups still holding two or more. Fold the row filter into',
			'// HAVING and south qualifies on the strength of three sales that',
			'// should never have been counted — same clauses, wrong stages,',
			'// plausible-looking wrong answer.',
			'func BigSaleRegions() string {',
			'	return `SELECT region, count(*)',
			'FROM sales',
			'WHERE amount >= 100',
			'GROUP BY region',
			'HAVING count(*) >= 2',
			'ORDER BY region`',
			'}',
			'',
			'// AverageTwoWays: avg(amount) is sum/count(AMOUNT) — NULLs sit',
			'// outside the denominator — while sum(amount)/count(*) divides by',
			'// every row. east: 800/2=400 vs 800/3=266 (also integer division:',
			'// 266.67 truncates, both INT operands). Neither is "the" average;',
			'// they answer different questions — per PRICED deal vs per RECORD',
			'// — and the honest report says which one it computed.',
			'func AverageTwoWays() string {',
			'	return `SELECT region, avg(amount), sum(amount) / count(*)',
			'FROM sales',
			'GROUP BY region',
			'ORDER BY region`',
			'}',
			'',
			'// DealSizeBuckets: grouping by an EXPRESSION — the CASE maps each',
			'// row to a bucket name, and GROUP BY buckets those names like any',
			'// column. The IS NULL arm must exist AND come first: NULL >= 300',
			'// is unknown, so a NULL row skips every comparison arm and lands',
			'// in ELSE — without the explicit arm, unpriced deals would be',
			'// silently mislabeled \'small\'. GROUP BY repeats the CASE because',
			'// SELECT aliases are computed after grouping in this engine.',
			'func DealSizeBuckets() string {',
			'	return `SELECT CASE WHEN amount IS NULL THEN \'unknown\'',
			'		WHEN amount >= 300 THEN \'large\'',
			'		ELSE \'small\' END AS bucket, count(*)',
			'FROM sales',
			'GROUP BY CASE WHEN amount IS NULL THEN \'unknown\'',
			'		WHEN amount >= 300 THEN \'large\'',
			'		ELSE \'small\' END',
			'ORDER BY bucket`',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The 400-vs-266 argument, settled</h3>' +
			'<p>east has three records: 500, 300, NULL. <code>avg(amount)</code> ' +
			'computes <code>sum / count(amount)</code> = 800/2 = <strong>400</strong> ' +
			'— the average <em>priced</em> deal. <code>sum(amount)/count(*)</code> ' +
			'computes 800/3 = <strong>266</strong> — revenue per <em>record</em>, ' +
			'with the unpriced deal dragging the figure down as an implicit zero ' +
			'(and integer division shaving 266.67 to 266 on top). Neither number ' +
			'is wrong; they answer different questions, and the outage here is ' +
			'organizational: two dashboards labeled “average deal size” shipping ' +
			'different definitions. The portable rule: <em>every aggregate except ' +
			'<code>count(*)</code> skips NULLs</em>, so any formula you build ' +
			'from <code>count(*)</code> silently treats NULL as zero. If that is ' +
			'actually what you want, say it out loud: ' +
			'<code>avg(coalesce(amount, 0))</code>.</p>' +
			'<h3>WHERE vs HAVING is a pipeline fact, not a style choice</h3>' +
			'<p>The stages run FROM → WHERE → GROUP BY → aggregate → HAVING → ' +
			'SELECT → ORDER BY. The pre-filled ' +
			'<code>WHERE sum(amount) &gt;= 300</code> draft fails with the ' +
			'engine’s own words — <code>aggregates are not allowed in WHERE; use ' +
			'HAVING</code> — because at WHERE time no group exists for ' +
			'<code>sum()</code> to summarize. That one is the <em>kind</em> ' +
			'error; the dangerous one is <code>BigSaleRegions</code>, where both ' +
			'placements are legal and only one is right:</p>',
			{ lang: 'txt', code: 'HAVING count(*) >= 2 alone            -> [[east 3] [south 3] [west 3]]   -- south qualifies on 50+80+90\nWHERE amount >= 100 ... HAVING >= 2  -> [[east 2] [west 2]]             -- rows filtered BEFORE counting' },
			'<p>Moving the row filter into the group stage changes what ' +
			'<code>count(*)</code> counts — south’s three sub-100 sales all get ' +
			'counted before any filter can object. And note the quiet third ' +
			'effect: <code>WHERE amount &gt;= 100</code> also discards the NULL ' +
			'rows, because <code>NULL &gt;= 100</code> is <em>unknown</em>, and ' +
			'WHERE keeps only <em>true</em>. Three-valued logic does half your ' +
			'data cleaning without being asked — know when it is doing it.</p>' +
			'<h3>The pipeline explains the alias rules too</h3>' +
			'<p>SELECT runs <em>after</em> grouping, so this engine (like SQL ' +
			'Server, and like the standard) refuses <code>GROUP BY bucket</code> ' +
			'and <code>HAVING total &gt;= 300</code> — those aliases don’t exist ' +
			'yet at that stage; you repeat the expression. Postgres, MySQL, and ' +
			'SQLite accept output-column aliases in GROUP BY as a convenience ' +
			'(MySQL even allows them in HAVING), which is exactly why the habit ' +
			'breaks the first time you switch engines. The repeated-CASE form is ' +
			'the portable one. ORDER BY, meanwhile, runs last and happily takes ' +
			'an alias — or a position: <code>ORDER BY 2 DESC</code>.</p>' +
			'<h3>At scale</h3>' +
			'<p>Real engines execute this as a hash aggregate: one pass over the ' +
			'input, one accumulator per group. Two consequences worth carrying ' +
			'into production. First, WHERE prunes rows <em>before</em> that pass ' +
			'— it can use indexes and shrink the work — while HAVING can only ' +
			'discard finished groups; never park a row predicate in HAVING ' +
			'“because it also works”. Second, memory scales with the number of ' +
			'<em>groups</em>: <code>GROUP BY region</code> holds four ' +
			'accumulators, <code>GROUP BY user_id</code> on a billion-user table ' +
			'holds a billion, which is when engines spill to disk and DBAs get ' +
			'paged. The CASE-bucket trick from <code>DealSizeBuckets</code> is ' +
			'the standard fix — collapse a high-cardinality key into a handful ' +
			'of named buckets before grouping on it.</p>',
		],
		complexity: { time: 'O(n) — one scan; each surviving row updates one hash-aggregate accumulator', space: 'O(g) — one accumulator per group, which is why GROUP BY on a high-cardinality key hurts' },
	});
})();
