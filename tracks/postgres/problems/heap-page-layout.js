/* Heap Pages: Where Rows Actually Live — Storage (Medium). Every PostgreSQL
 * table is a bag of 8 KB pages: a 24-byte header, 4-byte line pointers
 * growing down from the top, tuples (23-byte header + MAXALIGNed data)
 * growing up from the bottom. The harness pins the arithmetic that explains
 * why a table of single bigints is ~4.5x its raw data size: per-tuple
 * overhead dominates narrow rows.
 */
(function () {
	'use strict';
	var T = GoLearnPG;

	// The two-ended page: line pointers grow down from the header, tuple data
	// grows up from the end; free space is the shrinking gap in the middle.
	// Marker id namespaced (dgArrowPG01) because every track's SVGs share the
	// page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 200" width="560" height="200" role="img" aria-label="an 8 KB heap page: 24-byte header, line pointers growing down, free space in the middle, tuples growing up from the end">' +
		'<text x="20" y="24" class="lbl">one 8192-byte heap page — the two halves grow toward each other</text>' +
		'<rect x="30" y="40" width="500" height="56" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.5"/>' +
		// header
		'<rect x="30" y="40" width="60" height="56" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="60" y="66" text-anchor="middle">hdr</text>' +
		'<text x="60" y="84" text-anchor="middle" class="lbl">24 B</text>' +
		// line pointers
		'<rect x="90" y="40" width="120" height="56" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="150" y="66" text-anchor="middle">line pointers</text>' +
		'<text x="150" y="84" text-anchor="middle" class="lbl">4 B each →</text>' +
		// free space
		'<text x="272" y="66" text-anchor="middle" class="lbl">free space</text>' +
		// tuples
		'<rect x="335" y="40" width="195" height="56" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="432" y="66" text-anchor="middle">← tuples</text>' +
		'<text x="432" y="84" text-anchor="middle" class="lbl">23 B header + data, 8-aligned</text>' +
		// growth arrows
		'<path d="M 150 108 L 230 108" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowPG01)"/>' +
		'<text x="150" y="126" class="lbl" style="fill:var(--warn)">pointers grow down</text>' +
		'<path d="M 432 108 L 320 108" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowPG01)"/>' +
		'<text x="340" y="126" class="lbl" style="fill:var(--accent)">tuples grow up</text>' +
		'<text x="20" y="158" class="lbl">a row is addressed as (page, pointer slot) — the ctid — so tuples can move inside</text>' +
		'<text x="20" y="176" class="lbl">the page (compaction) without touching any index: indexes point at the slot</text>' +
		'<defs><marker id="dgArrowPG01" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'heap-page-layout',
		title: 'Heap Pages: Where Rows Actually Live',
		nav: 'heap page layout',
		difficulty: 'Medium',
		category: 'Storage',
		task: 'Implement the 8 KB heap-page arithmetic: 8-byte alignment, tuple size, tuples per page, free space, and data utilization.',

		prose: [
			'<h2>Heap Pages: Where Rows Actually Live</h2>' +
			'<p>A metrics table stores one <code>bigint</code> per row — 8 bytes of ' +
			'actual data. You load 100 million rows, expect ~800 MB, and ' +
			'<code>pg_relation_size</code> reports <strong>3.6 GB</strong>. Nothing is ' +
			'bloated; <code>VACUUM FULL</code> changes nothing. The 4.5x is the heap ' +
			'page format itself, and you can compute it exactly. Every table (and ' +
			'every index) is an array of 8192-byte pages laid out like this:</p>' +
			'<ul>' +
			'<li><strong>Page header, 24 bytes.</strong> LSN of the last WAL record ' +
			'that touched the page, checksum, and the offsets where the two growing ' +
			'regions currently end.</li>' +
			'<li><strong>Line pointers, 4 bytes each, growing down.</strong> One per ' +
			'tuple. A row’s address — its <code>ctid</code>, what every index entry ' +
			'stores — is <code>(page, slot)</code>, an index into this array. The ' +
			'indirection lets the page shuffle tuple bytes around without breaking ' +
			'anyone’s pointers.</li>' +
			'<li><strong>Tuples, growing up from the end.</strong> Each tuple is a ' +
			'23-byte header (xmin, xmax, infomask, null bitmap start — the MVCC ' +
			'bookkeeping) followed by the column data, and the whole thing is padded ' +
			'up to a multiple of 8 (MAXALIGN), so the smallest possible tuple ' +
			'occupies 24 bytes before it holds a single byte of your data.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the arithmetic. <code>AlignUp(n)</code> rounds up to the ' +
			'next multiple of 8. <code>TupleSize(w)</code> is the aligned size of a ' +
			'tuple with <code>w</code> bytes of row data. <code>TuplesPerPage(w)</code> ' +
			'is how many such tuples fit, remembering each one also costs a 4-byte ' +
			'line pointer out of the same 8168 usable bytes. ' +
			'<code>FreeSpace(n, w)</code> is what’s left after <code>n</code> tuples. ' +
			'<code>DataUtilization(w)</code> is the percentage of the full 8192-byte ' +
			'page that is your row data on a packed page.</p>',
			{ lang: 'txt', code: 'usable          = 8192 - 24 = 8168 bytes\nper-tuple cost  = 4 (line pointer) + AlignUp(23 + w)\nbigint row (w=8): 4 + AlignUp(31) = 4 + 32 = 36 bytes -> 8168/36 = 226 rows/page\ndata on page    = 226 * 8 = 1808 of 8192 bytes = 22% — overhead wins' },
			'<div class="tip">The 23-byte tuple header is the price of MVCC: xmin ' +
			'and xmax live <em>in the row</em>, which is why PostgreSQL needs no ' +
			'undo log — and why narrow tables pay proportionally the most for it. ' +
			'Column order matters too: <code>(int4, int8, int4)</code> pads to more ' +
			'than <code>(int8, int4, int4)</code>, though this exercise treats ' +
			'<code>w</code> as the already-laid-out data width.</div>',
		],

		starter: [
			'package main',
			'',
			'// Heap page geometry, as compiled into PostgreSQL (BLCKSZ 8192, MAXALIGN 8).',
			'const (',
			'	PageSize        = 8192 // BLCKSZ: every heap and index page',
			'	PageHeaderSize  = 24   // PageHeaderData: LSN, checksum, region offsets',
			'	ItemIDSize      = 4    // one line pointer (ItemIdData) per tuple',
			'	TupleHeaderSize = 23   // HeapTupleHeaderData before the null bitmap',
			'	MaxAlign        = 8    // every tuple start is 8-byte aligned',
			')',
			'',
			'// AlignUp rounds n up to the next multiple of MaxAlign (8).',
			'// AlignUp(23) = 24, AlignUp(24) = 24.',
			'func AlignUp(n int) int {',
			'	// your code here',
			'	return n',
			'}',
			'',
			'// TupleSize is the space one tuple with w bytes of row data occupies',
			'// in the tuple region: header + data, aligned up.',
			'func TupleSize(w int) int {',
			'	// your code here',
			'	return TupleHeaderSize + w',
			'}',
			'',
			'// TuplesPerPage is how many w-wide tuples fit on one empty page.',
			'// Each tuple consumes its TupleSize AND a 4-byte line pointer from',
			'// the same usable region (PageSize - PageHeaderSize).',
			'func TuplesPerPage(w int) int {',
			'	// your code here',
			'	return PageSize / TupleSize(w)',
			'}',
			'',
			'// FreeSpace is the gap left between the line-pointer array and the',
			'// tuple region after n tuples of width w are stored.',
			'func FreeSpace(n, w int) int {',
			'	// your code here',
			'	return PageSize - n*TupleSize(w)',
			'}',
			'',
			'// DataUtilization is the percentage of the whole 8192-byte page that',
			'// is actual row data when the page is packed with w-wide tuples.',
			'func DataUtilization(w int) float64 {',
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
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"AlignUp: 23 -> 24, 24 stays 24, 31 -> 32",',
			'			"24 24 32",',
			'			func() string { return fmt.Sprintf("%d %d %d", AlignUp(23), AlignUp(24), AlignUp(31)) }},',
			'		{"TupleSize(8): a bigint row — 23+8=31 aligns to 32",',
			'			"32",',
			'			func() string { return fmt.Sprintf("%d", TupleSize(8)) }},',
			'		{"TupleSize(1): a single boolean still costs a full 24 bytes",',
			'			"24",',
			'			func() string { return fmt.Sprintf("%d", TupleSize(1)) }},',
			'		{"TuplesPerPage(8): 8168 usable / (4 + 32) = 226 bigint rows",',
			'			"226",',
			'			func() string { return fmt.Sprintf("%d", TuplesPerPage(8)) }},',
			'		{"TuplesPerPage(100): a 100-byte row -> 61 per page",',
			'			"61",',
			'			func() string { return fmt.Sprintf("%d", TuplesPerPage(100)) }},',
			'		{"TuplesPerPage(2000): wide rows -> only 4 per page",',
			'			"4",',
			'			func() string { return fmt.Sprintf("%d", TuplesPerPage(2000)) }},',
			'		{"FreeSpace(0, 8): an empty page has 8168 usable bytes",',
			'			"8168",',
			'			func() string { return fmt.Sprintf("%d", FreeSpace(0, 8)) }},',
			'		{"FreeSpace(226, 8): a packed bigint page has 32 left — not enough for row 227",',
			'			"32",',
			'			func() string { return fmt.Sprintf("%d", FreeSpace(226, 8)) }},',
			'		{"FreeSpace(61, 100): packed 100-byte rows leave 116 bytes",',
			'			"116",',
			'			func() string { return fmt.Sprintf("%d", FreeSpace(61, 100)) }},',
			'		{"DataUtilization(8): bigint rows — only ~22%% of the page is data",',
			'			"22.07",',
			'			func() string { return fmt.Sprintf("%.2f", DataUtilization(8)) }},',
			'		{"DataUtilization(100): wider rows amortize the overhead",',
			'			"74.46",',
			'			func() string { return fmt.Sprintf("%.2f", DataUtilization(100)) }},',
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
			'// Heap page geometry, as compiled into PostgreSQL (BLCKSZ 8192, MAXALIGN 8).',
			'// These are compile-time constants in the server, not GUCs — changing',
			'// BLCKSZ means recompiling and re-initdb, which is why nobody does.',
			'const (',
			'	PageSize        = 8192 // BLCKSZ: every heap and index page',
			'	PageHeaderSize  = 24   // PageHeaderData: LSN, checksum, region offsets',
			'	ItemIDSize      = 4    // one line pointer (ItemIdData) per tuple',
			'	TupleHeaderSize = 23   // HeapTupleHeaderData before the null bitmap',
			'	MaxAlign        = 8    // every tuple start is 8-byte aligned',
			')',
			'',
			'// AlignUp rounds n up to the next multiple of MaxAlign. The classic',
			'// bit trick (n + 7) &^ 7 works because MaxAlign is a power of two:',
			'// adding align-1 pushes any non-multiple past the next boundary, and',
			'// clearing the low bits snaps back down onto it. Exact multiples',
			'// pass through unchanged.',
			'func AlignUp(n int) int {',
			'	return (n + MaxAlign - 1) &^ (MaxAlign - 1)',
			'}',
			'',
			'// TupleSize: the 23-byte header plus the row data, then the whole',
			'// tuple aligned. Aligning the SUM (not the parts separately) matches',
			'// the server: the header+bitmap is padded so data starts aligned,',
			'// and the next tuple must start aligned too — one AlignUp over the',
			'// total captures both effects for a bitmap-free row.',
			'func TupleSize(w int) int {',
			'	return AlignUp(TupleHeaderSize + w)',
			'}',
			'',
			'// TuplesPerPage: each stored tuple consumes TupleSize bytes at the',
			'// bottom of the page AND a 4-byte line pointer at the top — both come',
			'// out of the same 8168-byte usable region, so the divisor is the sum.',
			'// Integer division floors, which is exactly right: a partial tuple',
			'// does not fit.',
			'func TuplesPerPage(w int) int {',
			'	return (PageSize - PageHeaderSize) / (ItemIDSize + TupleSize(w))',
			'}',
			'',
			'// FreeSpace: usable bytes minus what n tuples consume from both ends.',
			'// This is the number the free space map (FSM) tracks per page to',
			'// decide where an INSERT lands.',
			'func FreeSpace(n, w int) int {',
			'	return (PageSize - PageHeaderSize) - n*(ItemIDSize+TupleSize(w))',
			'}',
			'',
			'// DataUtilization: fraction of the FULL page (8192, header included —',
			'// that is what you pay for on disk) that is caller data once packed.',
			'// For w=8 this lands at ~22%: the famous result that a table of',
			'// bigints is mostly MVCC bookkeeping, alignment, and pointers.',
			'func DataUtilization(w int) float64 {',
			'	return float64(TuplesPerPage(w)*w) / float64(PageSize) * 100',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why an indirection table on every page</h3>' +
			'<p>The line-pointer array looks like waste — 4 bytes per row that hold ' +
			'no data — but it is the load-bearing design choice. Indexes store ' +
			'<code>ctid = (page, slot)</code>, not byte offsets. So when VACUUM ' +
			'compacts a page (sliding live tuples to the end to merge the free ' +
			'space), only the slot array is rewritten; every index entry in every ' +
			'index stays valid. Without the indirection, defragmenting one heap page ' +
			'would mean updating every index that references it. The same slot ' +
			'array is what makes HOT update chains and dead-pointer reuse possible.</p>' +
			'<h3>Why 8 KB and why MAXALIGN</h3>' +
			'<p>8192 bytes is a compromise baked in at compile time: large enough ' +
			'to amortize per-page headers and WAL overhead, small enough that ' +
			'writing one page is plausibly atomic-ish (it isn’t, which is why ' +
			'full-page writes exist in the WAL). MAXALIGN=8 exists because the ' +
			'server reads column values by casting pointers into the page buffer — ' +
			'a misaligned <code>int8</code> read is undefined or slow on most ' +
			'architectures, so every tuple start is 8-aligned and columns are ' +
			'padded to their own alignment inside it. That is why column order ' +
			'changes table size: <code>(bool, int8, bool)</code> pads 7 bytes after ' +
			'the first bool, while <code>(int8, bool, bool)</code> pads none between ' +
			'the bools — “column tetris” is a real optimization on billion-row ' +
			'tables.</p>' +
			'<h3>What this predicts in production</h3>' +
			'<ul>' +
			'<li><strong>Narrow tables are overhead-dominated.</strong> 226 bigint ' +
			'rows per page means ~36 bytes stored per 8 data bytes. A “skinny” ' +
			'event log with two int columns is not cheap storage — and an index on ' +
			'it can approach the table’s own size.</li>' +
			'<li><strong>TOAST changes the regime at ~2 KB.</strong> A tuple must ' +
			'fit on one page; values that would push a row past ~2000 bytes get ' +
			'compressed and/or moved to the TOAST side table, leaving an 18-byte ' +
			'pointer. That is why a table of large <code>jsonb</code> documents can ' +
			'have a deceptively small heap and a huge <code>pg_toast</code> ' +
			'relation.</li>' +
			'<li><strong>Verify with <code>pgstattuple</code> and ' +
			'<code>pageinspect</code>.</strong> <code>pgstattuple(&#39;t&#39;)</code> reports ' +
			'exactly the tuple_percent you computed here; ' +
			'<code>heap_page_items(get_raw_page(&#39;t&#39;, 0))</code> shows the slot ' +
			'array — lp_off descending as tuples stack from the page end.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(1) — closed-form page arithmetic', space: 'O(1)' },
	});
})();
