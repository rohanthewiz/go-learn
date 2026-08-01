/* Zone Maps: Skipping Data Wholesale — Pruning (Medium). Per-row-group
 * min/max statistics let a scan decide from metadata alone that a whole
 * group is SKIP (no row can match), ALL_MATCH (every row matches, read
 * without filtering), or SCAN (overlap, read and filter). The harness pins
 * the ordering story with numbers: a date-ordered table skips 10 of 12
 * groups for a range predicate, while the SAME rows in random arrival order
 * give every group a year-spanning (min,max) and zone maps prune nothing.
 */
(function () {
	'use strict';
	var T = GoLearnDK;

	// Four row groups against one predicate cutoff: two never touched, one
	// read-and-filtered, one read wholesale. Marker id namespaced
	// (dgArrowDK05) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="four row groups laid out on a date axis with a predicate cutoff line; groups entirely below the cutoff are skipped with zero I/O, the group straddling it is scanned and filtered, the group entirely above is read with no per-row filter">' +
		'<text x="20" y="24" class="lbl">WHERE d &gt;= c — each row group is judged from its (min,max) before any I/O</text>' +
		// two groups entirely below the cutoff: pruned, never read
		'<rect x="30" y="62" width="100" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2" opacity="0.35"/>' +
		'<text x="80" y="88" text-anchor="middle" opacity="0.5">Jan–Apr</text>' +
		'<text x="80" y="126" text-anchor="middle" class="lbl">SKIP · 0 I/O</text>' +
		'<rect x="145" y="62" width="100" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2" opacity="0.35"/>' +
		'<text x="195" y="88" text-anchor="middle" opacity="0.5">May–Aug</text>' +
		'<text x="195" y="126" text-anchor="middle" class="lbl">SKIP · 0 I/O</text>' +
		// the straddler: min < c <= max, must read and filter
		'<rect x="260" y="62" width="100" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="310" y="88" text-anchor="middle">Sep–Nov</text>' +
		'<text x="310" y="126" text-anchor="middle" class="lbl" style="fill:var(--warn)">SCAN · filter rows</text>' +
		// entirely above: read, but the filter itself is skipped
		'<rect x="375" y="62" width="110" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="430" y="88" text-anchor="middle">Dec</text>' +
		'<text x="430" y="126" text-anchor="middle" class="lbl">ALL_MATCH · no filter</text>' +
		// the predicate cutoff, falling inside the straddler
		'<line x1="330" y1="44" x2="330" y2="140" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="330" y="40" text-anchor="middle" class="lbl" style="fill:var(--warn)">c = Nov 15</text>' +
		'<path d="M 150 170 C 210 172 260 150 296 116" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDK05)"/>' +
		'<text x="112" y="176" text-anchor="middle" class="lbl">bytes actually read</text>' +
		'<text x="20" y="200" class="lbl">ordered by date, the ranges are tight and disjoint — random arrival order makes every box span the whole axis</text>' +
		'<defs><marker id="dgArrowDK05" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'zone-map-pruning',
		title: 'Zone Maps: Skipping Data Wholesale',
		nav: 'zone map pruning',
		difficulty: 'Medium',
		category: 'Pruning',
		task: 'Classify row groups against a predicate using only (min,max) statistics — SKIP, ALL_MATCH, or SCAN — and total up how many rows a query actually reads.',

		prose: [
			'<h2>Zone Maps: Skipping Data Wholesale</h2>' +
			'<p>A dashboard query — <code>WHERE order_date &gt;= \'2024-11-15\'</code> ' +
			'over 1.4&nbsp;billion rows — drops from 4 seconds to 40&nbsp;ms after ' +
			'one change that touched no index and no query: the table was rewritten ' +
			'<code>ORDER BY order_date</code>. <code>EXPLAIN ANALYZE</code> tells ' +
			'the story: the scan now reads 2 row groups out of 12,000. The ' +
			'mechanism is the cheapest statistic in databases, the <strong>zone ' +
			'map</strong>: for every row group (DuckDB: 122,880 rows) and every ' +
			'column, keep the <code>min</code> and <code>max</code>. Before ' +
			'reading a group, test the predicate against that range — three ' +
			'verdicts are possible:</p>' +
			'<ul>' +
			'<li><strong>SKIP</strong> — no row can match (for ' +
			'<code>&gt;= c</code>: <code>max &lt; c</code>). The group is never ' +
			'read: zero I/O, zero decompression, zero filtering. This is where the ' +
			'100x comes from.</li>' +
			'<li><strong>ALL_MATCH</strong> — every row matches (for ' +
			'<code>&gt;= c</code>: <code>min &gt;= c</code>). The rows still have ' +
			'to be read and returned, but the per-row filter is dropped — the ' +
			'group flows through wholesale.</li>' +
			'<li><strong>SCAN</strong> — the range straddles the constant. Read ' +
			'the group and filter row by row; the zone map bought nothing here ' +
			'but cost only two comparisons.</li>' +
			'</ul>' +
			'<p>The verdict table per operator (else SCAN):</p>',
			{ lang: 'txt', code: 'op    SKIP when        ALL_MATCH when        (zone = [min,max], constant c)\n<     min >= c         max <  c\n<=    min >  c         max <= c\n>     max <= c         min >  c\n>=    max <  c         min >= c\n=     c < min || c > max     min == c && max == c\n\n12 groups × 122,880 rows, ordered by date, WHERE d >= 20241115:\n  Jan..Oct  max < c        -> 10 × SKIP        0 rows read\n  Nov       min < c <= max ->  1 × SCAN      122,880 read + filtered\n  Dec       min >= c       ->  1 × ALL_MATCH 122,880 read, no filter\nrows read: 245,760 of 1,474,560 — 83% of the table never touched' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Classify(zone, op, c)</code> returning ' +
			'<code>"SKIP"</code>, <code>"ALL_MATCH"</code>, or <code>"SCAN"</code> ' +
			'for the operators <code>&lt; &lt;= &gt; &gt;= =</code> (an unknown ' +
			'operator returns an error value — never panic), and ' +
			'<code>PruneStats(zones, op, c)</code> aggregating the per-class group ' +
			'counts plus <code>RowsRead</code>: the rows of SCAN and ALL_MATCH ' +
			'groups — pruning saves the read, ALL_MATCH only saves the ' +
			'filter.</p>' +
			'<div class="tip">Boundaries are where zone-map bugs live: for ' +
			'<code>&gt;= c</code> a group with <code>max == c</code> can still ' +
			'hold a match (SCAN, not SKIP), while <code>min == c</code> already ' +
			'means every row qualifies. Skipping a group that held matches is a ' +
			'wrong-results bug; scanning one that couldn’t is merely slow. When ' +
			'in doubt, engines err toward SCAN.</div>',
		],

		starter: [
			'package main',
			'',
			'// Zone is the per-row-group statistic a scan consults before reading:',
			'// the min and max of one column across the group\'s Rows rows.',
			'type Zone struct {',
			'	Min  int64',
			'	Max  int64',
			'	Rows int64',
			'}',
			'',
			'// PruneResult aggregates one predicate\'s verdicts over a table:',
			'// group counts per class, and RowsRead — the rows of SCAN plus',
			'// ALL_MATCH groups (SKIP groups cost zero I/O).',
			'type PruneResult struct {',
			'	Skipped  int',
			'	AllMatch int',
			'	Scanned  int',
			'	RowsRead int64',
			'}',
			'',
			'// Classify judges one row group against `column op c` using only its',
			'// zone: "SKIP" if no row can match, "ALL_MATCH" if every row must,',
			'// "SCAN" if the range straddles the constant. Supported ops are',
			'// "<", "<=", ">", ">=", "="; any other op returns an error value.',
			'func Classify(z Zone, op string, c int64) (string, error) {',
			'	// your code here',
			'	return "", nil',
			'}',
			'',
			'// PruneStats classifies every zone and totals the result. The first',
			'// classification error aborts and is returned.',
			'func PruneStats(zones []Zone, op string, c int64) (PruneResult, error) {',
			'	// your code here',
			'	return PruneResult{}, nil',
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
			'	// A year of orders, table ordered by date: each row group covers',
			'	// one tight, disjoint yyyymmdd range. 122,880 rows per group is',
			'	// DuckDB\'s actual row-group size.',
			'	rg := int64(122880)',
			'	ordered := []Zone{',
			'		{20240101, 20240131, rg}, {20240201, 20240229, rg},',
			'		{20240301, 20240331, rg}, {20240401, 20240430, rg},',
			'		{20240501, 20240531, rg}, {20240601, 20240630, rg},',
			'		{20240701, 20240731, rg}, {20240801, 20240831, rg},',
			'		{20240901, 20240930, rg}, {20241001, 20241031, rg},',
			'		{20241101, 20241130, rg}, {20241201, 20241231, rg},',
			'	}',
			'	// The SAME rows in random arrival order: every group holds a bit',
			'	// of every month, so every (min,max) spans nearly the whole year.',
			'	// Hard-coded — the exact values matter less than the shape.',
			'	shuffledArrival := []Zone{',
			'		{20240102, 20241230, rg}, {20240101, 20241231, rg},',
			'		{20240103, 20241229, rg}, {20240105, 20241231, rg},',
			'		{20240101, 20241228, rg}, {20240104, 20241231, rg},',
			'		{20240101, 20241230, rg}, {20240102, 20241231, rg},',
			'		{20240101, 20241229, rg}, {20240106, 20241231, rg},',
			'		{20240103, 20241231, rg}, {20240101, 20241231, rg},',
			'	}',
			'',
			'	// cl flattens Classify for compact case strings; the error path is',
			'	// never exercised (all harness ops are valid).',
			'	cl := func(z Zone, op string, c int64) string {',
			'		s, err := Classify(z, op, c)',
			'		if err != nil {',
			'			return "ERR"',
			'		}',
			'		return s',
			'	}',
			'	st := func(zones []Zone, op string, c int64) string {',
			'		r, err := PruneStats(zones, op, c)',
			'		if err != nil {',
			'			return "ERR"',
			'		}',
			'		return fmt.Sprintf("skip=%d all=%d scan=%d rowsRead=%d", r.Skipped, r.AllMatch, r.Scanned, r.RowsRead)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"op < against zone [10,20]: constant below, inside, above the range",',
			'			"SKIP SCAN ALL_MATCH",',
			'			func() string {',
			'				z := Zone{10, 20, 100}',
			'				return cl(z, "<", 5) + " " + cl(z, "<", 15) + " " + cl(z, "<", 25)',
			'			}},',
			'		{"boundaries: <=20, >20, >=10, <10 against zone [10,20]",',
			'			"ALL_MATCH SKIP ALL_MATCH SKIP",',
			'			func() string {',
			'				z := Zone{10, 20, 100}',
			'				return cl(z, "<=", 20) + " " + cl(z, ">", 20) + " " + cl(z, ">=", 10) + " " + cl(z, "<", 10)',
			'			}},',
			'		{"equality: inside a wide zone, outside it, and a single-value zone",',
			'			"SCAN SKIP ALL_MATCH",',
			'			func() string {',
			'				return cl(Zone{10, 20, 100}, "=", 15) + " " + cl(Zone{10, 20, 100}, "=", 30) + " " + cl(Zone{7, 7, 100}, "=", 7)',
			'			}},',
			'		{"date-ordered table, d >= Nov 15: 10 of 12 groups pruned outright",',
			'			"skip=10 all=1 scan=1 rowsRead=245760",',
			'			func() string { return st(ordered, ">=", 20241115) }},',
			'		{"SAME rows, random arrival: every zone spans the year, nothing prunes",',
			'			"skip=0 all=0 scan=12 rowsRead=1474560",',
			'			func() string { return st(shuffledArrival, ">=", 20241115) }},',
			'		{"point lookup on the ordered table: one group survives",',
			'			"skip=11 all=0 scan=1 rowsRead=122880",',
			'			func() string { return st(ordered, "=", 20240715) }},',
			'		{"predicate below the global min: the whole table pruned, zero I/O",',
			'			"skip=12 all=0 scan=0 rowsRead=0",',
			'			func() string { return st(ordered, "<", 20240101) }},',
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
			'import "errors"',
			'',
			'// Zone is the per-row-group statistic a scan consults before reading:',
			'// the min and max of one column across the group\'s Rows rows.',
			'type Zone struct {',
			'	Min  int64',
			'	Max  int64',
			'	Rows int64',
			'}',
			'',
			'// PruneResult aggregates one predicate\'s verdicts over a table.',
			'type PruneResult struct {',
			'	Skipped  int',
			'	AllMatch int',
			'	Scanned  int',
			'	RowsRead int64',
			'}',
			'',
			'// Classify judges one row group from its (min,max) alone. The pattern',
			'// is identical for every operator: an ALL_MATCH test on one bound, a',
			'// SKIP test on the other, SCAN as the straddle fallback. Each case',
			'// assigns into cls with a single return at the end — deliberately no',
			'// named returns, and returning early from inside the switch is',
			'// avoided on principle for the same reason.',
			'//',
			'// Correctness asymmetry worth internalizing: a wrong SKIP silently',
			'// drops matching rows, a wrong SCAN only wastes I/O. Every test below',
			'// therefore proves its class from the bound that makes it safe, e.g.',
			'// for >= c: max < c proves NO row can match; min >= c proves ALL do.',
			'func Classify(z Zone, op string, c int64) (string, error) {',
			'	cls := ""',
			'	switch op {',
			'	case "<":',
			'		if z.Max < c {',
			'			cls = "ALL_MATCH" // even the largest value is below c',
			'		} else if z.Min >= c {',
			'			cls = "SKIP" // even the smallest value fails',
			'		} else {',
			'			cls = "SCAN"',
			'		}',
			'	case "<=":',
			'		if z.Max <= c {',
			'			cls = "ALL_MATCH"',
			'		} else if z.Min > c {',
			'			cls = "SKIP"',
			'		} else {',
			'			cls = "SCAN"',
			'		}',
			'	case ">":',
			'		if z.Min > c {',
			'			cls = "ALL_MATCH"',
			'		} else if z.Max <= c {',
			'			cls = "SKIP"',
			'		} else {',
			'			cls = "SCAN"',
			'		}',
			'	case ">=":',
			'		if z.Min >= c {',
			'			cls = "ALL_MATCH"',
			'		} else if z.Max < c {',
			'			cls = "SKIP"',
			'		} else {',
			'			cls = "SCAN"',
			'		}',
			'	case "=":',
			'		// ALL_MATCH for equality needs the zone collapsed to a point:',
			'		// min == max == c. Merely containing c only proves overlap.',
			'		if z.Min == c && z.Max == c {',
			'			cls = "ALL_MATCH"',
			'		} else if c < z.Min || c > z.Max {',
			'			cls = "SKIP"',
			'		} else {',
			'			cls = "SCAN"',
			'		}',
			'	default:',
			'		// An error value, never a panic: an unknown operator must not',
			'		// take down a scan pipeline.',
			'		return "", errors.New("unknown operator: " + op)',
			'	}',
			'	return cls, nil',
			'}',
			'',
			'// PruneStats runs Classify over every group and totals the outcome.',
			'// RowsRead counts SCAN and ALL_MATCH rows: pruning saves the read',
			'// itself, while ALL_MATCH still reads every row and only drops the',
			'// per-row filter. The distinction is exactly what EXPLAIN ANALYZE',
			'// surfaces as "rows scanned" versus the table\'s row count.',
			'func PruneStats(zones []Zone, op string, c int64) (PruneResult, error) {',
			'	res := PruneResult{}',
			'	for _, z := range zones {',
			'		cls, err := Classify(z, op, c)',
			'		if err != nil {',
			'			return PruneResult{}, err',
			'		}',
			'		switch cls {',
			'		case "SKIP":',
			'			res.Skipped++',
			'		case "ALL_MATCH":',
			'			res.AllMatch++',
			'			res.RowsRead += z.Rows',
			'		default: // SCAN',
			'			res.Scanned++',
			'			res.RowsRead += z.Rows',
			'		}',
			'	}',
			'	return res, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What DuckDB actually does</h3>' +
			'<p>Zone maps (DuckDB calls them min-max indexes) are kept per column ' +
			'segment inside every row group of 122,880 rows and live in table ' +
			'metadata — checking them costs two integer comparisons per group, ' +
			'which is why the engine always tries. They compose with ' +
			'<strong>filter pushdown</strong>: the optimizer pushes ' +
			'<code>WHERE</code> clauses down into the scan operator, the scan ' +
			'consults zone maps to select which groups to read at all, and only ' +
			'then does vectorized filtering touch actual values. The same idea ' +
			'appears at every layer of the analytics stack: Parquet keeps min/max ' +
			'per row group and per page (so DuckDB prunes <em>remote</em> Parquet ' +
			'over HTTP range requests — pruned groups are bytes never downloaded, ' +
			'which on S3 is egress money, not just time), and ' +
			'ClickHouse/Snowflake/BigQuery all lean on the same statistics under ' +
			'different names.</p>' +
			'<h3>Why ordering is the whole game</h3>' +
			'<p>The two 12-group tables in the harness hold identical rows. ' +
			'Ordered by date, each zone is tight and disjoint, and ' +
			'<code>d &gt;= Nov 15</code> reads 245,760 of 1,474,560 rows. In ' +
			'arrival order, every group got a sprinkle of every month, every zone ' +
			'is ≈[Jan&nbsp;1, Dec&nbsp;31], every verdict is SCAN, and the scan ' +
			'reads 100% — the zone maps still exist, still get checked, and prune ' +
			'nothing. Min/max is a <em>range</em> summary, so its power is exactly ' +
			'the correlation between a column’s values and their physical ' +
			'position. That is why the fixes are all layout fixes: ' +
			'<code>ORDER BY</code> on bulk load, partitioning by date, clustering ' +
			'keys. Time-series data is the happy case — arrival order ' +
			'<em>is</em> roughly timestamp order, so timestamp predicates prune ' +
			'well even unsorted, while a filter on <code>user_id</code> over the ' +
			'same table prunes nothing.</p>' +
			'<h3>When zone maps lose</h3>' +
			'<ul>' +
			'<li><strong>Scattered layouts</strong> — the harness’s second table. ' +
			'One stray outlier row per group is enough to blow the range open.</li>' +
			'<li><strong>High-cardinality point lookups on unordered ' +
			'columns:</strong> <code>WHERE uuid = ...</code> straddles every ' +
			'group. Engines bolt on Bloom filters or ART indexes for that shape ' +
			'— set membership, not ranges.</li>' +
			'<li><strong>Skewed <code>NULL</code>s and updates:</strong> deleted ' +
			'or updated rows widen ranges until a rewrite (vacuum/compaction) ' +
			're-tightens them; stale statistics prune less over time.</li>' +
			'</ul>' +
			'<p>The ALL_MATCH class matters more than it looks: dropping the ' +
			'per-row comparison lets the scan emit whole vectors untouched, and ' +
			'for an aggregate like <code>COUNT(*)</code> an ALL_MATCH group ' +
			'collapses to metadata arithmetic — the rows need not be read at all. ' +
			'Classification is cheap; what you do with the verdict is where ' +
			'engines keep finding wins.</p>',
		],
		complexity: { time: 'O(g) — two comparisons per row group, independent of row count', space: 'O(1) beyond the statistics themselves' },
	});
})();
