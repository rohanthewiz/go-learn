/* Parquet: Row Groups & Column Chunks — Storage (Medium). The file-layout
 * arithmetic that lets a query read 2 MB of a 2 GB file: groups of rows laid
 * out in order, each group storing one contiguous chunk per column, so any
 * (group, column) pair is a computable (offset, length) byte range. The
 * harness pins chunk offsets at group starts and mid-group, the short last
 * group, and the pruned-fetch total against a full SELECT * scan.
 */
(function () {
	'use strict';
	var T = GoLearnDK;

	// A file as a grid you can seek into: row groups in order, column chunks
	// inside each group. Marker id namespaced (dgArrowDK09) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 214" width="560" height="214" role="img" aria-label="a Parquet-style file: row groups laid out in order, each holding one contiguous chunk per column; one chunk is fetched as a byte range">' +
		'<text x="20" y="24" class="lbl">the file is a grid: row groups in order, one contiguous chunk per column inside each</text>' +
		// the file bar: four row groups (last short) + footer
		'<rect x="30" y="40" width="104" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="82" y="62" text-anchor="middle">RG 0</text>' +
		'<rect x="134" y="40" width="104" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="186" y="62" text-anchor="middle">RG 1</text>' +
		'<rect x="238" y="40" width="104" height="34" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="290" y="62" text-anchor="middle">RG 2</text>' +
		'<rect x="342" y="40" width="70" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="377" y="62" text-anchor="middle">RG 3</text>' +
		'<rect x="412" y="40" width="76" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.4" stroke-dasharray="4 3"/>' +
		'<text x="450" y="62" text-anchor="middle" class="lbl">footer</text>' +
		'<text x="377" y="90" text-anchor="middle" class="lbl">last group short</text>' +
		'<text x="450" y="104" text-anchor="middle" class="lbl">stats + offsets</text>' +
		// RG 2 exploded into column chunks, widths proportional to bytes/value
		'<path d="M 244 78 L 40 118" fill="none" stroke="var(--warn)" stroke-width="1.2"/>' +
		'<path d="M 338 78 L 520 118" fill="none" stroke="var(--warn)" stroke-width="1.2"/>' +
		'<rect x="40" y="122" width="24" height="34" rx="3" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="64" y="122" width="24" height="34" rx="3" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="88" y="122" width="24" height="34" rx="3" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="112" y="122" width="110" height="34" rx="3" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="222" y="122" width="110" height="34" rx="3" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="332" y="122" width="188" height="34" rx="3" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="52" y="144" text-anchor="middle" class="lbl">id</text>' +
		'<text x="76" y="144" text-anchor="middle" class="lbl">ts</text>' +
		'<text x="100" y="144" text-anchor="middle" class="lbl">uid</text>' +
		'<text x="167" y="144" text-anchor="middle" class="lbl">url</text>' +
		'<text x="277" y="144" text-anchor="middle" class="lbl">referrer</text>' +
		'<text x="426" y="144" text-anchor="middle" class="lbl">user_agent</text>' +
		// the range read: one chunk fetched by (offset, length)
		'<path d="M 76 196 L 76 162" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDK09)"/>' +
		'<text x="90" y="192" class="lbl">GET bytes=256800-259199 — the ts chunk of RG 2: one seek, 2400 bytes, nothing else</text>' +
		'<defs><marker id="dgArrowDK09" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'parquet-row-groups',
		title: 'Parquet: Row Groups & Column Chunks',
		nav: 'parquet row groups',
		difficulty: 'Medium',
		category: 'Storage',
		task: 'Implement ChunkRange (byte offset + length of any column chunk) and BytesToFetch (total bytes a pruned, projected query must read).',

		prose: [
			'<h2>Parquet: Row Groups &amp; Column Chunks</h2>' +
			'<p>A dashboard queries a 2 GB Parquet file sitting in S3 and comes ' +
			'back in under a second — and the S3 access log shows the engine read ' +
			'about 2 MB. Nobody downloaded the file. The trick is that Parquet is ' +
			'not a stream you must read from the top; it is a <em>grid with a ' +
			'map</em>. The footer says exactly where every piece lives, and HTTP ' +
			'range requests fetch only the pieces a query touches. Your egress ' +
			'bill is proportional to the bytes you address, so this arithmetic is ' +
			'money. The layout:</p>' +
			'<ul>' +
			'<li><strong>Row groups</strong> slice the table horizontally: the ' +
			'first <code>rowGroupRows</code> rows form group 0, the next form ' +
			'group 1, and the last group holds whatever remains (possibly short). ' +
			'Groups are laid out in order from byte 0.</li>' +
			'<li><strong>Column chunks</strong> slice each group vertically: ' +
			'inside a group, every column’s values are stored contiguously, ' +
			'chunks in schema order. A chunk’s size in our model is ' +
			'<code>rowsInGroup * col.Bytes</code> (encoded bytes per value).</li>' +
			'<li><strong>Everything is addressable.</strong> A chunk’s offset is ' +
			'pure arithmetic: all full groups before it, plus the chunks before ' +
			'it inside its own group. A remote reader turns that into ' +
			'<code>GET Range: bytes=offset..offset+length-1</code>.</li>' +
			'<li><strong>Stats prune groups.</strong> Each chunk carries min/max ' +
			'statistics (the zone maps from earlier in this track). A predicate ' +
			'that falls outside a group’s min/max skips the whole group — no ' +
			'bytes fetched at all. <code>groupMatches[g] == false</code> models ' +
			'exactly that.</li>' +
			'<li><strong>The footer</strong> at the end of the real file records ' +
			'the schema and every chunk’s offset — a reader fetches the footer ' +
			'first (one small range at the tail), then plans its reads. We ignore ' +
			'its bytes here: data starts at offset 0.</li>' +
			'</ul>',
			{ lang: 'txt', code: 'schema: id 8 | ts 8 | uid 8 | url 100 | referrer 100 | user_agent 200   row = 424 B\nnRows = 1000, rowGroupRows = 300  ->  groups of 300, 300, 300, 100\n\nChunkRange(group 2, ts):\n  group 2 starts at   2 * 300 * 424           = 254400\n  chunks before ts:   300 * 8 (id)            =   2400\n  offset = 254400 + 2400 = 256800     length = 300 * 8 = 2400\n\nThe 2 GB trick, same arithmetic at scale:\n  16 columns, 1000 B/row, 2M rows = 2 GB, 16 groups of 125000 rows\n  query touches uid(8) + amount(12) = 20 B/row; stats prune 15 of 16 groups\n  fetch = 125000 * 20 = 2.5 MB          SELECT * scan = 2 GB  (800x more)' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>ChunkRange(schema, nRows, rowGroupRows, group, ' +
			'colIdx)</code> returning the chunk’s <code>(offset, length)</code>, ' +
			'and <code>BytesToFetch(schema, nRows, rowGroupRows, cols, ' +
			'groupMatches)</code> — the total bytes a query projecting ' +
			'<code>cols</code> must fetch after pruning (<code>groupMatches[g] == ' +
			'false</code> means group <code>g</code> is skipped). All integer ' +
			'math; return <code>(0, 0)</code> / <code>0</code> for out-of-range ' +
			'arguments rather than panicking.</p>',
			'<div class="tip">Both dimensions of the grid save you independently: ' +
			'column chunks mean a query pays only for the columns it names ' +
			'(projection), row-group stats mean it pays only for the groups that ' +
			'might match (pruning). The 800x win in the example is the two ' +
			'multiplied together — 20 of 1000 bytes per row, times 1 of 16 ' +
			'groups.</div>',
		],

		starter: [
			'package main',
			'',
			'// Col describes one column of the schema: a name and the encoded',
			'// size of one value in bytes. Chunk size = rowsInGroup * Bytes.',
			'type Col struct {',
			'	Name  string',
			'	Bytes int64',
			'}',
			'',
			'// rowsInGroup is the row count of group g: rowGroupRows for every',
			'// full group, the remainder for the last one, 0 past the end.',
			'// Provided — both functions below need it.',
			'func rowsInGroup(nRows, rowGroupRows int64, g int) int64 {',
			'	start := int64(g) * rowGroupRows',
			'	if start >= nRows {',
			'		return 0',
			'	}',
			'	rem := nRows - start',
			'	if rem < rowGroupRows {',
			'		return rem',
			'	}',
			'	return rowGroupRows',
			'}',
			'',
			'// ChunkRange returns the byte offset and length of one column chunk.',
			'//',
			'//   - groups are laid out in order from offset 0 (footer ignored)',
			'//   - within a group, chunks follow schema order',
			'//   - offset = bytes of all groups before it, plus the bytes of the',
			'//     chunks before colIdx inside its own group',
			'//   - length = rowsInGroup * schema[colIdx].Bytes',
			'//   - out-of-range group or colIdx: return (0, 0), never panic',
			'func ChunkRange(schema []Col, nRows, rowGroupRows int64, group, colIdx int) (int64, int64) {',
			'	// your code here',
			'	return 0, 0',
			'}',
			'',
			'// BytesToFetch totals the bytes a query must read: for every group',
			'// with groupMatches[g] == true (missing entries mean false), the',
			'// chunks of every column index in cols. Out-of-range column',
			'// indexes are skipped.',
			'func BytesToFetch(schema []Col, nRows, rowGroupRows int64, cols []int, groupMatches []bool) int64 {',
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
			'	// The worked example from the prose: 424 B rows, 1000 rows,',
			'	// groups of 300 -> 300, 300, 300, 100.',
			'	schema := []Col{',
			'		{"id", 8}, {"ts", 8}, {"uid", 8},',
			'		{"url", 100}, {"referrer", 100}, {"user_agent", 200},',
			'	}',
			'',
			'	// The 2 GB file: 16 columns totaling 1000 B/row, 2M rows,',
			'	// 16 groups of 125000. Two narrow columns up front (uid 8,',
			'	// amount 12), fourteen wide ones the query never touches.',
			'	big := []Col{{"uid", 8}, {"amount", 12}}',
			'	for i := 0; i < 14; i++ {',
			'		big = append(big, Col{fmt.Sprintf("wide%02d", i), 70})',
			'	}',
			'	allCols := make([]int, len(big))',
			'	for i := range allCols {',
			'		allCols[i] = i',
			'	}',
			'	allGroups := make([]bool, 16)',
			'	for i := range allGroups {',
			'		allGroups[i] = true',
			'	}',
			'	oneGroup := make([]bool, 16)',
			'	oneGroup[5] = true',
			'',
			'	cr := func(g, c int) string {',
			'		off, ln := ChunkRange(schema, 1000, 300, g, c)',
			'		return fmt.Sprintf("off=%d len=%d", off, ln)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"first chunk of the file (group 0, id): offset 0, 300 rows x 8 B",',
			'			"off=0 len=2400",',
			'			func() string { return cr(0, 0) }},',
			'		{"mid-group chunk (group 0, url): skip id+ts+uid = 300*24 bytes first",',
			'			"off=7200 len=30000",',
			'			func() string { return cr(0, 3) }},',
			'		{"deep chunk (group 2, ts): 2 full groups of 300*424 bytes, then the id chunk",',
			'			"off=256800 len=2400",',
			'			func() string { return cr(2, 1) }},',
			'		{"short last group (group 3, user_agent): only 100 rows remain — offsets within the group shrink along with the length",',
			'			"off=404000 len=20000",',
			'			func() string { return cr(3, 5) }},',
			'		{"out-of-range group and column: (0,0), never a panic",',
			'			"off=0 len=0 / off=0 len=0",',
			'			func() string {',
			'				o1, l1 := ChunkRange(schema, 1000, 300, 9, 0)',
			'				o2, l2 := ChunkRange(schema, 1000, 300, 0, 6)',
			'				return fmt.Sprintf("off=%d len=%d / off=%d len=%d", o1, l1, o2, l2)',
			'			}},',
			'		{"pruned fetch: cols {id, uid}, groups 1 and 3 survive -> (300+100) rows x 16 B",',
			'			"6400",',
			'			func() string {',
			'				return fmt.Sprintf("%d", BytesToFetch(schema, 1000, 300,',
			'					[]int{0, 2}, []bool{false, true, false, true}))',
			'			}},',
			'		{"SELECT * with nothing pruned reads the whole file: 1000 rows x 424 B",',
			'			"424000",',
			'			func() string {',
			'				return fmt.Sprintf("%d", BytesToFetch(schema, 1000, 300,',
			'					[]int{0, 1, 2, 3, 4, 5},',
			'					[]bool{true, true, true, true}))',
			'			}},',
			'		{"the 2 GB trick: 2 narrow columns, 15 of 16 groups pruned -> 2.5 MB",',
			'			"2500000",',
			'			func() string {',
			'				return fmt.Sprintf("%d", BytesToFetch(big, 2000000, 125000,',
			'					[]int{0, 1}, oneGroup))',
			'			}},',
			'		{"the same file, SELECT * full scan: all 2 GB",',
			'			"2000000000",',
			'			func() string {',
			'				return fmt.Sprintf("%d", BytesToFetch(big, 2000000, 125000,',
			'					allCols, allGroups))',
			'			}},',
			'		{"range read lands deep in the big file (group 5, amount): one seek at 626 MB",',
			'			"off=626000000 len=1500000",',
			'			func() string {',
			'				off, ln := ChunkRange(big, 2000000, 125000, 5, 1)',
			'				return fmt.Sprintf("off=%d len=%d", off, ln)',
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
			'// The solution replaces the starter wholesale, so the type and the',
			'// helper are redeclared here.',
			'',
			'// Col describes one column: a name and encoded bytes per value.',
			'type Col struct {',
			'	Name  string',
			'	Bytes int64',
			'}',
			'',
			'// rowsInGroup is the row count of group g. Every group before the',
			'// last is full; the last holds the remainder. Returning 0 past the',
			'// end doubles as the out-of-range signal for callers.',
			'func rowsInGroup(nRows, rowGroupRows int64, g int) int64 {',
			'	start := int64(g) * rowGroupRows',
			'	if start >= nRows {',
			'		return 0',
			'	}',
			'	rem := nRows - start',
			'	if rem < rowGroupRows {',
			'		return rem',
			'	}',
			'	return rowGroupRows',
			'}',
			'',
			'// ChunkRange computes the byte range of one column chunk — the',
			'// arithmetic a remote reader turns into an HTTP range request.',
			'func ChunkRange(schema []Col, nRows, rowGroupRows int64, group, colIdx int) (int64, int64) {',
			'	// Defensive range checks instead of panics: a planner asking for',
			'	// a chunk that does not exist gets a zero range it can test.',
			'	if rowGroupRows <= 0 || group < 0 || colIdx < 0 || colIdx >= len(schema) {',
			'		return 0, 0',
			'	}',
			'	rig := rowsInGroup(nRows, rowGroupRows, group)',
			'	if rig == 0 {',
			'		return 0, 0',
			'	}',
			'',
			'	// Group start: every group BEFORE ours is full (only the final',
			'	// group of the file can be short, and nothing sits after it), so',
			'	// the bytes before group g are exactly g full groups of',
			'	// rowGroupRows * rowWidth.',
			'	var rowWidth int64',
			'	for _, c := range schema {',
			'		rowWidth += c.Bytes',
			'	}',
			'	groupStart := int64(group) * rowGroupRows * rowWidth',
			'',
			'	// Within the group, chunks sit in schema order — and each is',
			'	// sized by THIS group\'s row count, which is why the short last',
			'	// group shifts its inner offsets too, not just its lengths.',
			'	var before int64',
			'	for i := 0; i < colIdx; i++ {',
			'		before += schema[i].Bytes',
			'	}',
			'	return groupStart + rig*before, rig * schema[colIdx].Bytes',
			'}',
			'',
			'// BytesToFetch totals the bytes a projected, pruned query touches.',
			'// Deliberately a plain double loop: projection (cols) and pruning',
			'// (groupMatches) are independent filters whose savings multiply.',
			'func BytesToFetch(schema []Col, nRows, rowGroupRows int64, cols []int, groupMatches []bool) int64 {',
			'	if rowGroupRows <= 0 {',
			'		return 0',
			'	}',
			'	// Ceil division without floats: the last, possibly short group',
			'	// still counts as a group.',
			'	nGroups := (nRows + rowGroupRows - 1) / rowGroupRows',
			'	var total int64',
			'	for g := int64(0); g < nGroups; g++ {',
			'		// A group is skipped when zone-map stats exclude the',
			'		// predicate; missing mask entries read as pruned so a short',
			'		// mask can never over-count.',
			'		if g >= int64(len(groupMatches)) || !groupMatches[g] {',
			'			continue',
			'		}',
			'		rig := rowsInGroup(nRows, rowGroupRows, int(g))',
			'		for _, c := range cols {',
			'			// Bad column indexes are skipped, not fatal — same',
			'			// defensive stance as ChunkRange.',
			'			if c < 0 || c >= len(schema) {',
			'				continue',
			'			}',
			'			total += rig * schema[c].Bytes',
			'		}',
			'	}',
			'	return total',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What real Parquet adds on top</h3>' +
			'<p>The model here keeps the load-bearing idea — the file is a grid of ' +
			'independently addressable byte ranges — and drops the bookkeeping. ' +
			'In a real file:</p>' +
			'<ul>' +
			'<li><strong>The footer is the map.</strong> Chunk offsets are not ' +
			'recomputed by arithmetic; they are <em>recorded</em> in a ' +
			'Thrift-encoded footer at the end of the file (which ends in its own ' +
			'byte count and the magic <code>PAR1</code>). A reader issues one ' +
			'range request for the tail, decodes the footer, and then knows every ' +
			'chunk’s offset, compressed size, encoding, and min/max stats. That ' +
			'indirection is what lets chunks compress to <em>different</em> sizes ' +
			'— our fixed <code>Bytes</code> per value is the simplification that ' +
			'makes offsets computable instead of recorded.</li>' +
			'<li><strong>Chunks are made of pages.</strong> Each column chunk ' +
			'splits into pages (~1 MB), the unit of encoding and compression — ' +
			'dictionary, RLE, bit-packing from earlier in this track. Page ' +
			'indexes add min/max per page, giving pruning a second, finer level ' +
			'below row groups.</li>' +
			'<li><strong>Row-group size is a tuning war.</strong> Big groups ' +
			'amortize per-group metadata and produce long sequential reads; ' +
			'small groups prune better and parallelize wider (DuckDB parallelizes ' +
			'scans across row groups, its own writer defaulting to 122&nbsp;880 ' +
			'rows per group). The classic anti-pattern is thousands of tiny ' +
			'groups: one file that behaves like a thousand seeks.</li>' +
			'</ul>' +
			'<h3>How DuckDB reads S3</h3>' +
			'<p>Query <code>read_parquet(\'s3://bucket/events.parquet\')</code> and ' +
			'the httpfs extension does exactly the dance in this exercise: a ' +
			'ranged GET for the footer, then ranged GETs for only the chunks that ' +
			'survive projection and pruning — coalescing adjacent ranges into one ' +
			'request when the gap is small, because a round trip costs more than ' +
			'a few wasted kilobytes. Filter pushdown means a <code>WHERE ts &gt;= ' +
			'yesterday</code> against a time-ordered file skips nearly every ' +
			'group before a single data byte moves. The 2 MB-of-2 GB story is ' +
			'these two functions, run by the planner against footer metadata.</p>' +
			'<h3>When the trick fails</h3>' +
			'<p>The arithmetic only saves what the layout lets it save. Pruning ' +
			'needs the data <em>clustered</em> on the filtered column: min/max ' +
			'over a shuffled column spans everything, every group "might match", ' +
			'and <code>groupMatches</code> is all-true — the zone-map lesson ' +
			'again. Projection cannot help <code>SELECT *</code>. And ' +
			'row-oriented access — fetch one order by id, update it in place — ' +
			'pays the full-grid price, which is why Parquet backs dashboards and ' +
			'lakes, not OLTP tables.</p>',
		],
		complexity: { time: 'O(cols) per ChunkRange (a prefix sum over the schema); O(groups x cols) for BytesToFetch', space: 'O(1) — pure arithmetic, no buffers' },
	});
})();
