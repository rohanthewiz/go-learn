/* Columnar vs Row Storage — Storage (Easy). The I/O argument that justifies
 * every analytical engine: a row store must read entire rows (whole pages) to
 * answer any query, while a column store reads only the columns the query
 * touches. The harness pins the arithmetic — a 2-of-10-column query whose
 * touched columns are 5% of the row width reads 5% of the file, a 20x I/O
 * cut — plus the degenerate all-columns query where columnar buys nothing,
 * and a real SumColumn over a column-major store.
 */
(function () {
	'use strict';
	var T = GoLearnDK;

	// Row layout drags every column through the scan; columnar layout lets the
	// query jump straight to the two columns it needs. Marker id namespaced
	// (dgArrowDK01) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="row layout stores whole rows contiguously so a two-column query reads every byte; columnar layout stores each column contiguously so the query reads only the two touched columns">' +
		'<text x="20" y="24" class="lbl">same table, two layouts — query touches only columns a and b</text>' +
		// row layout: three rows, each a strip of four cells, all read
		'<text x="40" y="52" class="lbl">row layout</text>' +
		'<rect x="40" y="60" width="200" height="26" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="140" y="78" text-anchor="middle" class="lbl">a1 b1 c1 d1</text>' +
		'<rect x="40" y="92" width="200" height="26" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="140" y="110" text-anchor="middle" class="lbl">a2 b2 c2 d2</text>' +
		'<rect x="40" y="124" width="200" height="26" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="140" y="142" text-anchor="middle" class="lbl">a3 b3 c3 d3</text>' +
		'<text x="40" y="172" class="lbl" style="fill:var(--warn)">reads c and d too — they share the pages</text>' +
		// columnar layout: four column blocks, only two read
		'<text x="300" y="52" class="lbl">columnar layout</text>' +
		'<rect x="300" y="60" width="180" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="390" y="78" text-anchor="middle" class="lbl">a1 a2 a3</text>' +
		'<rect x="300" y="92" width="180" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="390" y="110" text-anchor="middle" class="lbl">b1 b2 b3</text>' +
		'<rect x="300" y="124" width="180" height="26" rx="4" fill="none" stroke="var(--lbl,#888)" stroke-width="1" stroke-dasharray="4 3"/>' +
		'<text x="390" y="142" text-anchor="middle" class="lbl">c1 c2 c3 (skipped)</text>' +
		'<rect x="300" y="156" width="180" height="26" rx="4" fill="none" stroke="var(--lbl,#888)" stroke-width="1" stroke-dasharray="4 3"/>' +
		'<text x="390" y="174" text-anchor="middle" class="lbl">d1 d2 d3 (skipped)</text>' +
		'<path d="M 250 105 C 270 105 280 90 296 74" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDK01)"/>' +
		'<text x="20" y="200" class="lbl">bytes scanned: rows read ALL widths; columns read only the touched widths</text>' +
		'<defs><marker id="dgArrowDK01" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'columnar-vs-row',
		title: 'Columnar vs Row Storage',
		nav: 'columnar vs row',
		difficulty: 'Easy',
		category: 'Storage',
		task: 'Compute bytes scanned under row vs columnar layout for a query touching k of n columns, and implement SumColumn over a column-major store.',

		prose: [
			'<h2>Columnar vs Row Storage</h2>' +
			'<p>A dashboard query — <code>SELECT AVG(fare) FROM trips</code> over a ' +
			'40&nbsp;GB table — takes four minutes on Postgres and under two seconds ' +
			'after the same data lands in DuckDB. Nothing about the CPU changed. ' +
			'What changed is <em>which bytes had to move</em>: the row store read ' +
			'all 40&nbsp;GB because every page interleaves every column, while the ' +
			'column store read only the <code>fare</code> column — a couple hundred ' +
			'megabytes. Analytical queries touch a few columns of many rows; OLTP ' +
			'queries touch all columns of a few rows. Storage layout decides which ' +
			'shape is cheap:</p>' +
			'<ul>' +
			'<li><strong>Row layout</strong> stores each row contiguously: ' +
			'<code>a1 b1 c1 | a2 b2 c2 | …</code>. Fetching one whole row is one ' +
			'seek — perfect for <code>SELECT * WHERE id = 42</code>. But a scan of ' +
			'one column still drags every other column through the I/O path, ' +
			'because they share the same pages.</li>' +
			'<li><strong>Columnar layout</strong> stores each column contiguously: ' +
			'<code>a1 a2 a3 | b1 b2 b3 | …</code>. A query touching k columns ' +
			'reads exactly those k byte-runs and skips the rest of the file ' +
			'entirely.</li>' +
			'<li><strong>The arithmetic is linear:</strong> row scan cost is ' +
			'<code>nRows × Σ widths</code> (all of them); columnar scan cost is ' +
			'<code>nRows × Σ widths[touched]</code>. The ratio is just ' +
			'row-width over touched-width — independent of row count.</li>' +
			'</ul>',
			{ lang: 'txt', code: 'table : 1,000,000 rows × 10 columns, row width 160 B\nquery : SELECT SUM(fare), SUM(tip) — touches 2 columns, 4 B each\n\nrow layout      : 1,000,000 × 160 B       = 160,000,000 B  (~160 MB)\ncolumnar layout : 1,000,000 × (4 + 4) B   =   8,000,000 B  (~8 MB)\nratio           : 160 / 8                 = 20x less I/O — 5% of the file' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>RowScanBytes(nRows, widths)</code> — bytes a row ' +
			'store reads for <em>any</em> query — and ' +
			'<code>ColScanBytes(nRows, widths, touched)</code> — bytes a column ' +
			'store reads for a query touching the columns at indices ' +
			'<code>touched</code> (a bad index is an <code>error</code>, never a ' +
			'panic). Then make the layout real: <code>SumColumn(cols, idx)</code> ' +
			'sums one column of a column-major store <code>cols[col][row]</code>, ' +
			'again returning an error for an out-of-range column.</p>' +
			'<div class="tip">The 20x figure is only the floor. Same-typed values ' +
			'sitting next to each other compress far better than interleaved rows ' +
			'do (dictionary, RLE — later items), so the columnar file is also ' +
			'<em>smaller</em> before the query even starts skipping columns.</div>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// RowScanBytes is the I/O bill for a row store: rows interleave every',
			'// column on the same pages, so ANY query — even one touching a single',
			'// column — reads nRows times the full row width (the sum of widths).',
			'func RowScanBytes(nRows int, widths []int) int64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// ColScanBytes is the columnar bill: only the touched columns are',
			'// read, so the cost is nRows times the sum of widths[touched[i]].',
			'// A touched index outside [0, len(widths)) is an error value —',
			'// storage code must never panic on a malformed query plan.',
			'func ColScanBytes(nRows int, widths []int, touched []int) (int64, error) {',
			'	// your code here',
			'	return 0, errors.New("not implemented")',
			'}',
			'',
			'// SumColumn aggregates one column of a column-major store: cols[c] is',
			'// the c-th column, cols[c][r] its r-th row value. An idx outside',
			'// [0, len(cols)) is an error, not a panic.',
			'func SumColumn(cols [][]int64, idx int) (int64, error) {',
			'	// your code here',
			'	return 0, errors.New("not implemented")',
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
			'	// The prose example, pinned: 10 columns totalling 160 B per row,',
			'	// and the query touches columns 0 and 1 (4 B each) — exactly 5%',
			'	// of the row width, so columnar reads 5% of the file.',
			'	widths := []int{4, 4, 8, 8, 16, 16, 24, 24, 28, 28}',
			'	nRows := 1000000',
			'	allCols := []int{0, 1, 2, 3, 4, 5, 6, 7, 8, 9}',
			'	// A tiny column-major store: 3 columns of unequal length — the',
			'	// layout SumColumn walks. cols[1] is the "fare" column.',
			'	store := [][]int64{',
			'		{5, 10, 15},',
			'		{100, 200, 300},',
			'		{1, 2, 3, 4},',
			'	}',
			'',
			'	// colStr renders a (bytes, error) pair one way for every case.',
			'	colStr := func(v int64, err error) string {',
			'		if err != nil {',
			'			return "err: " + err.Error()',
			'		}',
			'		return fmt.Sprintf("%d", v)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"row layout: 1M rows x 160 B — every byte moves, touched or not",',
			'			"160000000",',
			'			func() string { return fmt.Sprintf("%d", RowScanBytes(nRows, widths)) }},',
			'		{"columnar: only columns 0 and 1 (4 B + 4 B) are read",',
			'			"8000000",',
			'			func() string { return colStr(ColScanBytes(nRows, widths, []int{0, 1})) }},',
			'		{"the cut: 160 MB / 8 MB — a 20x I/O reduction",',
			'			"20x",',
			'			func() string {',
			'				rb := RowScanBytes(nRows, widths)',
			'				cb, err := ColScanBytes(nRows, widths, []int{0, 1})',
			'				if err != nil || cb == 0 {',
			'					return "no ratio"',
			'				}',
			'				return fmt.Sprintf("%dx", rb/cb)',
			'			}},',
			'		{"degenerate: the query touches ALL 10 columns — columnar reads the same bytes as rows",',
			'			"true",',
			'			func() string {',
			'				cb, err := ColScanBytes(nRows, widths, allCols)',
			'				if err != nil {',
			'					return "err: " + err.Error()',
			'				}',
			'				return fmt.Sprintf("%v", cb == RowScanBytes(nRows, widths))',
			'			}},',
			'		{"small table: 1000 rows of [8 8 4], query touches only the 4 B column",',
			'			"4000",',
			'			func() string { return colStr(ColScanBytes(1000, []int{8, 8, 4}, []int{2})) }},',
			'		{"SumColumn over the column-major store: column 1 is one contiguous run",',
			'			"600",',
			'			func() string { return colStr(SumColumn(store, 1)) }},',
			'		{"SumColumn: columns may have different lengths — column 2 has 4 rows",',
			'			"10",',
			'			func() string { return colStr(SumColumn(store, 2)) }},',
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
			'// RowScanBytes: a row store cannot read part of a row — pages hold',
			'// whole rows, so the scan bill is nRows times the FULL row width.',
			'// int64 arithmetic throughout: 1M rows x 160 B already overflows',
			'// int32, and real tables are far bigger.',
			'func RowScanBytes(nRows int, widths []int) int64 {',
			'	var rowWidth int64',
			'	for _, w := range widths {',
			'		rowWidth += int64(w)',
			'	}',
			'	return int64(nRows) * rowWidth',
			'}',
			'',
			'// ColScanBytes: the columnar bill sums only the touched widths. The',
			'// bounds check comes BEFORE any accumulation so a malformed plan',
			'// yields a clean error and a zero total — never a partial answer,',
			'// never a panic (index errors in storage code must surface as',
			'// values the planner can handle).',
			'func ColScanBytes(nRows int, widths []int, touched []int) (int64, error) {',
			'	var touchedWidth int64',
			'	for _, idx := range touched {',
			'		if idx < 0 || idx >= len(widths) {',
			'			return 0, errors.New("column index out of range")',
			'		}',
			'		touchedWidth += int64(widths[idx])',
			'	}',
			'	return int64(nRows) * touchedWidth, nil',
			'}',
			'',
			'// SumColumn is the layout paying off: cols[idx] is one contiguous',
			'// slice, so the aggregate is a single linear walk — the memory',
			'// access pattern a prefetcher loves, and the reason the same loop',
			'// over a row-major [][]struct would touch 10x the cache lines.',
			'func SumColumn(cols [][]int64, idx int) (int64, error) {',
			'	if idx < 0 || idx >= len(cols) {',
			'		return 0, errors.New("column index out of range")',
			'	}',
			'	var sum int64',
			'	for _, v := range cols[idx] {',
			'		sum += v',
			'	}',
			'	return sum, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What DuckDB actually does</h3>' +
			'<p>The model you implemented is the first-order truth, and DuckDB ' +
			'layers three multipliers on top of it:</p>' +
			'<ul>' +
			'<li><strong>Column segments, compressed per segment.</strong> Each ' +
			'column is stored as a chain of segments inside ~120K-row row groups, ' +
			'and every segment picks its own compression — dictionary for a ' +
			'low-cardinality string column, RLE for sorted keys, bit-packing for ' +
			'small integers. That choice is only possible <em>because</em> a ' +
			'segment holds one column: same-typed neighboring values are what ' +
			'compressors feed on. So the columnar file starts smaller, and then ' +
			'the query skips most of it.</li>' +
			'<li><strong>Skipping goes further than columns.</strong> Each segment ' +
			'carries min/max statistics (zone maps — a later item), so a filter ' +
			'like <code>WHERE ts &gt;= \'2026-07-01\'</code> skips whole segments ' +
			'of the touched column too. The same idea pushes down into Parquet ' +
			'readers: DuckDB reads only the needed column chunks of only the ' +
			'needed row groups, which is why querying a Parquet file on S3 can ' +
			'transfer 2% of it — column pruning and row-group pruning compound, ' +
			'and the egress bill notices.</li>' +
			'<li><strong>The scan parallelizes by construction.</strong> Row ' +
			'groups are independent, so morsel-driven parallelism hands each ' +
			'thread its own slice of the touched columns; no coordination until ' +
			'the final aggregate merge.</li>' +
			'</ul>' +
			'<h3>When columnar loses</h3>' +
			'<p>Your degenerate case is the honest half of the argument. A query ' +
			'touching all columns reads the same bytes either way — and pays extra ' +
			'to <em>reassemble rows</em> from n separate column runs (tuple ' +
			'materialization). Point lookups are worse still: fetching row 42 ' +
			'means one seek per column instead of one seek total, which is why ' +
			'OLTP engines (Postgres, SQLite) stay row-major and why ' +
			'<code>SELECT *</code> is an anti-pattern on every columnar system. ' +
			'Updates hurt too: changing one row means touching n column segments, ' +
			'so column stores buffer writes and merge them in batches rather than ' +
			'updating in place.</p>' +
			'<h3>The cache-line version of the same argument</h3>' +
			'<p><code>SumColumn</code> is the I/O argument shrunk to RAM. A ' +
			'64-byte cache line holds eight <code>int64</code> fares in a ' +
			'column-major store — every fetched byte is useful. In an array of ' +
			'160-byte row structs, each line fetched for <code>fare</code> drags ' +
			'~56 bytes of neighbors, an 8x waste before the disk is involved at ' +
			'all. The layout decision pays at every level of the hierarchy, which ' +
			'is why vectorized execution (next item) assumes columns as its input ' +
			'format.</p>',
		],
		complexity: { time: 'O(n) over widths/touched for the cost model; O(rows) for SumColumn', space: 'O(1)' },
	});
})();
