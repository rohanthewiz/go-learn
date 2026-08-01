/* B-tree Pages: Cells & Binary Search — File Format (Hard). A table
 * B-tree page is a header (type byte, big-endian cell count at offset
 * 3), a cell pointer array of 2-byte offsets kept sorted by rowid, and
 * cells packed at the page's tail. Leaf cells are payload-len varint +
 * rowid varint + record; interior cells are a 4-byte left-child page
 * number + rowid key, with a rightmost pointer in the header. The
 * harness pins binary search on a leaf, routing through an interior
 * page, and a full multi-page descent.
 */
(function () {
	'use strict';
	var T = GoLearnSQ;

	// A leaf page: pointer array up front (sorted by rowid), cells packed
	// at the tail in arbitrary order. Marker id namespaced (dgArrowSQ05)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="a table B-tree leaf page: 8-byte header, cell pointer array sorted by rowid, free space, then cells packed at the tail; a pointer entry directs the binary search to its cell">' +
		'<text x="20" y="22" class="lbl">one 4096-byte leaf page (type 0x0d)</text>' +
		// header
		'<rect x="20" y="38" width="90" height="44" rx="5" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="65" y="60" text-anchor="middle">header</text>' +
		'<text x="65" y="76" text-anchor="middle" class="lbl">8 bytes</text>' +
		// pointer array
		'<rect x="110" y="38" width="150" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="185" y="60" text-anchor="middle">cell pointers</text>' +
		'<text x="185" y="76" text-anchor="middle" class="lbl">2 bytes each, rowid order</text>' +
		// free space
		'<rect x="260" y="38" width="90" height="44" rx="5" fill="none" stroke="var(--edge)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<text x="305" y="65" text-anchor="middle" class="lbl">free</text>' +
		// cells
		'<rect x="350" y="38" width="150" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="425" y="60" text-anchor="middle">cells</text>' +
		'<text x="425" y="76" text-anchor="middle" class="lbl">grow from the tail</text>' +
		// arrow pointer -> cell
		'<path d="M 185 88 C 185 150 425 150 425 88" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowSQ05)"/>' +
		'<text x="305" y="140" text-anchor="middle" class="lbl" style="fill:var(--accent)">pointer[i] = byte offset of cell i — the ARRAY is sorted, the cells need not be</text>' +
		'<text x="20" y="176" class="lbl">binary search runs on the pointer array: O(log n) probes, each decoding one cell\'s rowid varint</text>' +
		'<text x="20" y="196" class="lbl">leaf cell: [payload-len varint][rowid varint][record]   interior cell: [child page u32][rowid varint]</text>' +
		'<defs><marker id="dgArrowSQ05" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'btree-page-lookup',
		title: 'B-tree Pages: Cells & Binary Search',
		nav: 'b-tree pages',
		difficulty: 'Hard',
		category: 'File Format',
		task: 'Implement rowid lookup over table B-tree pages: binary search a leaf\'s sorted cell pointer array, route through interior pages (left-child u32 + rowid key, rightmost pointer in the header), and walk a page map from root to payload.',

		prose: [
			'<h2>B-tree Pages: Cells &amp; Binary Search</h2>' +
			'<p>“Why is <code>SELECT * FROM logs WHERE rowid = 8891234</code> ' +
			'instant on a 40&nbsp;GB table?” Because it reads about four pages. ' +
			'Every table is one B-tree of fixed-size pages, keyed by rowid; a ' +
			'lookup descends interior pages to the right leaf and binary-searches ' +
			'inside it. You already know every encoding involved — varints and ' +
			'records — so this lesson is the page structure that holds them:</p>',
			{ lang: 'txt', code: 'page header (at offset 0 of the page):\n  0      type: 0x0d = table leaf, 0x05 = table interior\n  1..2   first freeblock offset      (u16, free-space bookkeeping)\n  3..4   NUMBER OF CELLS             (u16, big-endian)\n  5..6   start of cell content area  (u16)\n  7      fragmented free bytes\n  8..11  interior pages ONLY: rightmost child page number (u32)\n\nthen the cell pointer array: one u16 offset per cell, SORTED BY ROWID.\ncells themselves are packed at the tail of the page, any order.\n\nleaf cell:      [payload length: varint][rowid: varint][record bytes]\ninterior cell:  [left child page: u32]  [rowid key: varint]' },
			'<ul>' +
			'<li><strong>The pointer array is the index into the page.</strong> ' +
			'Cells are wherever free space happened to be, but the 2-byte pointer ' +
			'array is kept sorted by rowid — so binary search runs over the ' +
			'pointers, and inserting a cell shifts 2-byte pointers, not whole ' +
			'records.</li>' +
			'<li><strong>Interior pages hold no rows.</strong> An interior cell ' +
			'means “every rowid ≤ this key lives under this left child”; rowids ' +
			'greater than <em>all</em> keys go to the rightmost pointer stashed ' +
			'in the header at offset 8. N keys, N+1 children.</li>' +
			'<li><strong>Page numbers, not addresses.</strong> Children are ' +
			'referenced by page number; byte offset = (pageNo−1) × page size. ' +
			'The tree is fully described by numbers you already parsed from the ' +
			'100-byte header.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Three functions, composing into a real lookup:</p>' +
			'<ul>' +
			'<li><code>LeafLookup(page, rowid)</code> — binary search the pointer ' +
			'array; on a hit return the cell’s payload bytes and true.</li>' +
			'<li><code>InteriorChild(page, rowid)</code> — the child page number ' +
			'the search must descend into: the left child of the first cell whose ' +
			'key is ≥ rowid, else the rightmost pointer.</li>' +
			'<li><code>SearchTree(pages, root, rowid)</code> — walk the page map ' +
			'from the root, routing through interior pages (type 0x05) to a leaf ' +
			'(0x0d). Unknown page types or missing pages return not-found — ' +
			'never panic, and never loop forever on a corrupt tree.</li>' +
			'</ul>' +
			'<div class="tip">Descend on <code>key ≥ rowid</code>, not ' +
			'<code>&gt;</code>: an interior key equal to the target means the ' +
			'target row lives under that <em>left</em> child (interior pages of a ' +
			'table B-tree hold no rows themselves). Off-by-one here loses exactly ' +
			'the rows that sit at subtree boundaries — the nastiest kind of bug, ' +
			'because most lookups still work.</div>',
		],

		starter: [
			'package main',
			'',
			'// getVarint decodes one SQLite varint (big-endian 7-bit groups,',
			'// 9-byte cap) returning value and bytes consumed — (0, 0) if',
			'// truncated. Provided: this lesson is about pages, not varints.',
			'func getVarint(b []byte) (uint64, int) {',
			'	var v uint64',
			'	for i := 0; i < 8 && i < len(b); i++ {',
			'		c := b[i]',
			'		if c < 0x80 {',
			'			return v<<7 | uint64(c), i + 1',
			'		}',
			'		v = v<<7 | uint64(c&0x7f)',
			'	}',
			'	if len(b) >= 9 {',
			'		return v<<8 | uint64(b[8]), 9',
			'	}',
			'	return 0, 0',
			'}',
			'',
			'// LeafLookup binary-searches a table leaf page (type 0x0d) for a',
			'// rowid. The cell pointer array (2-byte big-endian offsets, sorted',
			'// by rowid) starts at offset 8; each cell is payload-len varint,',
			'// rowid varint, then payload. Return (payload, true) on a hit.',
			'func LeafLookup(page []byte, rowid int64) ([]byte, bool) {',
			'	// your code here',
			'	return nil, false',
			'}',
			'',
			'// InteriorChild routes a search through a table interior page (type',
			'// 0x05): return the left child of the FIRST cell whose key is >=',
			'// rowid, or the rightmost pointer (header offset 8) if every key is',
			'// smaller. The pointer array starts at offset 12 on interior pages.',
			'func InteriorChild(page []byte, rowid int64) uint32 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// SearchTree walks pages from root to a leaf and returns the',
			'// payload for rowid. Missing pages, unknown page types, or trees',
			'// deeper than any sane B-tree (guard against cycles!) return',
			'// (nil, false).',
			'func SearchTree(pages map[uint32][]byte, root uint32, rowid int64) ([]byte, bool) {',
			'	// your code here',
			'	return nil, false',
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
			'// hVarint is the harness\'s own varint encoder — page builders must',
			'// not depend on the code under test.',
			'func hVarint(v uint64) []byte {',
			'	if v < 0x80 {',
			'		return []byte{byte(v)}',
			'	}',
			'	var scratch [10]byte',
			'	i := 10',
			'	i--',
			'	scratch[i] = byte(v & 0x7f)',
			'	v >>= 7',
			'	for v > 0 {',
			'		i--',
			'		scratch[i] = byte(v&0x7f) | 0x80',
			'		v >>= 7',
			'	}',
			'	return append([]byte(nil), scratch[i:]...)',
			'}',
			'',
			'// mkLeaf builds a table leaf page: rowids ascending, payloads packed',
			'// at the tail, pointer array in rowid order.',
			'func mkLeaf(pageSize int, rowids []int64, payloads []string) []byte {',
			'	pg := make([]byte, pageSize)',
			'	pg[0] = 0x0d',
			'	n := len(rowids)',
			'	pg[3], pg[4] = byte(n>>8), byte(n)',
			'	top := pageSize',
			'	for i := n - 1; i >= 0; i-- {',
			'		cell := hVarint(uint64(len(payloads[i])))',
			'		cell = append(cell, hVarint(uint64(rowids[i]))...)',
			'		cell = append(cell, payloads[i]...)',
			'		top -= len(cell)',
			'		copy(pg[top:], cell)',
			'		pg[8+2*i], pg[8+2*i+1] = byte(top>>8), byte(top)',
			'	}',
			'	pg[5], pg[6] = byte(top>>8), byte(top)',
			'	return pg',
			'}',
			'',
			'// mkInterior builds a table interior page: keys ascending, one left',
			'// child per key, plus the rightmost child in the header.',
			'func mkInterior(pageSize int, children []uint32, keys []int64, rightMost uint32) []byte {',
			'	pg := make([]byte, pageSize)',
			'	pg[0] = 0x05',
			'	n := len(keys)',
			'	pg[3], pg[4] = byte(n>>8), byte(n)',
			'	pg[8], pg[9], pg[10], pg[11] = byte(rightMost>>24), byte(rightMost>>16), byte(rightMost>>8), byte(rightMost)',
			'	top := pageSize',
			'	for i := n - 1; i >= 0; i-- {',
			'		c := children[i]',
			'		cell := []byte{byte(c >> 24), byte(c >> 16), byte(c >> 8), byte(c)}',
			'		cell = append(cell, hVarint(uint64(keys[i]))...)',
			'		top -= len(cell)',
			'		copy(pg[top:], cell)',
			'		pg[12+2*i], pg[12+2*i+1] = byte(top>>8), byte(top)',
			'	}',
			'	pg[5], pg[6] = byte(top>>8), byte(top)',
			'	return pg',
			'}',
			'',
			'// showHit renders a lookup result for comparison.',
			'func showHit(payload []byte, ok bool) string {',
			'	if !ok {',
			'		return "not found"',
			'	}',
			'	return string(payload)',
			'}',
			'',
			'func main() {',
			'	// One leaf with realistic gappy rowids (deletes leave gaps).',
			'	leaf := mkLeaf(512,',
			'		[]int64{3, 7, 20, 21, 500},',
			'		[]string{"row3", "row7", "row20", "row21", "row500"})',
			'',
			'	// A two-level tree: root (page 1) over three leaves (pages 2..4).',
			'	// Leaf 2: rowids <= 10, leaf 3: <= 30, leaf 4: the rest.',
			'	tree := map[uint32][]byte{',
			'		1: mkInterior(512, []uint32{2, 3}, []int64{10, 30}, 4),',
			'		2: mkLeaf(512, []int64{1, 5, 10}, []string{"a", "b", "c"}),',
			'		3: mkLeaf(512, []int64{12, 30}, []string{"d", "e"}),',
			'		4: mkLeaf(512, []int64{31, 99}, []string{"f", "g"}),',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"leaf hit in the middle: rowid 20",',
			'			"row20",',
			'			func() string { return showHit(LeafLookup(leaf, 20)) }},',
			'		{"leaf edges: first and last rowids both found",',
			'			"row3 row500",',
			'			func() string { return showHit(LeafLookup(leaf, 3)) + " " + showHit(LeafLookup(leaf, 500)) }},',
			'		{"absent rowid inside a gap (8): binary search must not fabricate a neighbor",',
			'			"not found",',
			'			func() string { return showHit(LeafLookup(leaf, 8)) }},',
			'		{"absent rowid past both ends: 1 and 501",',
			'			"not found not found",',
			'			func() string { return showHit(LeafLookup(leaf, 1)) + " " + showHit(LeafLookup(leaf, 501)) }},',
			'		{"interior routing: 5 -> child 2, 30 -> child 3 (equal key goes LEFT), 31 -> rightmost 4",',
			'			"2 3 4",',
			'			func() string {',
			'				root := tree[1]',
			'				return fmt.Sprintf("%d %d %d", InteriorChild(root, 5), InteriorChild(root, 30), InteriorChild(root, 31))',
			'			}},',
			'		{"full descent: rowid 12 routes to leaf 3 and finds its payload",',
			'			"d",',
			'			func() string { return showHit(SearchTree(tree, 1, 12)) }},',
			'		{"full descent to the rightmost leaf: rowid 99",',
			'			"g",',
			'			func() string { return showHit(SearchTree(tree, 1, 99)) }},',
			'		{"absent rowid 11 descends to leaf 3 and correctly misses",',
			'			"not found",',
			'			func() string { return showHit(SearchTree(tree, 1, 11)) }},',
			'		{"missing child page: not found, never a panic",',
			'			"not found",',
			'			func() string {',
			'				broken := map[uint32][]byte{1: mkInterior(512, []uint32{9}, []int64{10}, 9)}',
			'				return showHit(SearchTree(broken, 1, 5))',
			'			}},',
			'		{"a cycle (root points at itself) terminates as not found",',
			'			"not found",',
			'			func() string {',
			'				loop := map[uint32][]byte{1: mkInterior(512, []uint32{1}, []int64{10}, 1)}',
			'				return showHit(SearchTree(loop, 1, 5))',
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
			'// getVarint decodes one SQLite varint — value and bytes consumed,',
			'// (0, 0) on truncation. Same routine as the varint lesson.',
			'func getVarint(b []byte) (uint64, int) {',
			'	var v uint64',
			'	for i := 0; i < 8 && i < len(b); i++ {',
			'		c := b[i]',
			'		if c < 0x80 {',
			'			return v<<7 | uint64(c), i + 1',
			'		}',
			'		v = v<<7 | uint64(c&0x7f)',
			'	}',
			'	if len(b) >= 9 {',
			'		return v<<8 | uint64(b[8]), 9',
			'	}',
			'	return 0, 0',
			'}',
			'',
			'// pgU16 / pgU32: big-endian field reads, hand-rolled — the same',
			'// shift pattern as every other lesson in this track.',
			'func pgU16(b []byte, o int) int {',
			'	return int(b[o])<<8 | int(b[o+1])',
			'}',
			'',
			'func pgU32(b []byte, o int) uint32 {',
			'	return uint32(b[o])<<24 | uint32(b[o+1])<<16 | uint32(b[o+2])<<8 | uint32(b[o+3])',
			'}',
			'',
			'// leafCellAt decodes the cell at pointer index i of a leaf page,',
			'// returning (rowid, payload). One decode serves both the binary',
			'// search (which needs only the rowid) and the final hit (which',
			'// needs the payload) — cells are small enough that splitting the',
			'// two would be optimization theater.',
			'func leafCellAt(page []byte, i int) (int64, []byte) {',
			'	off := pgU16(page, 8+2*i) // leaf pointer array starts after the 8-byte header',
			'	plen, n1 := getVarint(page[off:])',
			'	rid, n2 := getVarint(page[off+n1:])',
			'	start := off + n1 + n2',
			'	return int64(rid), page[start : start+int(plen)]',
			'}',
			'',
			'// LeafLookup binary-searches the sorted cell pointer array. The',
			'// search is over POINTERS: cells sit wherever free space allowed,',
			'// but the 2-byte array is kept ordered exactly so this loop works.',
			'func LeafLookup(page []byte, rowid int64) ([]byte, bool) {',
			'	n := pgU16(page, 3)',
			'	lo, hi := 0, n',
			'	// Invariant: cells[0:lo] < rowid <= cells[hi:n]. Converges on the',
			'	// leftmost cell with key >= rowid — the only candidate for a hit.',
			'	for lo < hi {',
			'		mid := (lo + hi) / 2',
			'		key, _ := leafCellAt(page, mid)',
			'		if key < rowid {',
			'			lo = mid + 1',
			'		} else {',
			'			hi = mid',
			'		}',
			'	}',
			'	if lo < n {',
			'		key, payload := leafCellAt(page, lo)',
			'		if key == rowid {',
			'			return payload, true',
			'		}',
			'	}',
			'	return nil, false',
			'}',
			'',
			'// InteriorChild picks the descent target. An interior cell with key',
			'// K owns every rowid <= K in its LEFT child, so the search wants',
			'// the first key >= rowid — the same lower-bound loop as the leaf.',
			'func InteriorChild(page []byte, rowid int64) uint32 {',
			'	n := pgU16(page, 3)',
			'	lo, hi := 0, n',
			'	for lo < hi {',
			'		mid := (lo + hi) / 2',
			'		off := pgU16(page, 12+2*mid) // interior pointer array starts after the 12-byte header',
			'		key, _ := getVarint(page[off+4:])',
			'		if int64(key) < rowid {',
			'			lo = mid + 1',
			'		} else {',
			'			hi = mid',
			'		}',
			'	}',
			'	if lo == n {',
			'		// Greater than every key: the N+1th child lives in the header,',
			'		// not the cell array — the format stores N keys, N+1 children.',
			'		return pgU32(page, 8)',
			'	}',
			'	off := pgU16(page, 12+2*lo)',
			'	return pgU32(page, off)',
			'}',
			'',
			'// SearchTree walks root -> leaf. The depth cap is the cycle guard:',
			'// a legitimate SQLite tree over 2^64 rowids is at most a few dozen',
			'// levels, so 64 hops without reaching a leaf means the "tree" has a',
			'// cycle or garbage page types — report not-found instead of hanging.',
			'func SearchTree(pages map[uint32][]byte, root uint32, rowid int64) ([]byte, bool) {',
			'	cur := root',
			'	for depth := 0; depth < 64; depth++ {',
			'		page, ok := pages[cur]',
			'		if !ok || len(page) < 8 {',
			'			return nil, false // dangling page number: corrupt tree',
			'		}',
			'		if page[0] == 0x0d {',
			'			return LeafLookup(page, rowid)',
			'		}',
			'		if page[0] != 0x05 {',
			'			return nil, false // not a table B-tree page',
			'		}',
			'		cur = InteriorChild(page, rowid)',
			'	}',
			'	return nil, false',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why pointer arrays instead of sorted cells</h3>' +
			'<p>Keeping the <em>cells</em> physically sorted would make every ' +
			'insert memmove up to a full page of record bytes. The indirection ' +
			'layer — a sorted array of 2-byte offsets over unsorted cells — ' +
			'means an insert writes the cell into free space and shifts only ' +
			'pointers. It is the same trick as a slice of indices over a big ' +
			'struct array, chosen for the same reason: move the small thing, not ' +
			'the big thing. The cost is fragmentation, which the page header ' +
			'tracks (freeblock list, fragmented-bytes counter) and ' +
			'<code>VACUUM</code> repacks.</p>' +
			'<h3>The math of “instant”</h3>' +
			'<p>A 4096-byte page holds on the order of a hundred pointer entries ' +
			'for small rows, and interior cells are ~9 bytes, so fanout is in the ' +
			'hundreds. Three levels cover tens of millions of rows; four cover ' +
			'billions. That is why the hook query touches ~4 pages: root, one or ' +
			'two interiors, one leaf — and the root of a hot table is effectively ' +
			'always in the page cache. <code>EXPLAIN QUERY PLAN</code> prints ' +
			'<code>SEARCH logs USING INTEGER PRIMARY KEY (rowid=?)</code> for ' +
			'exactly this descent, and <code>sqlite3_analyzer</code> reports each ' +
			'table’s actual tree depth (“B-tree depth: 3”).</p>' +
			'<h3>What this lesson simplified</h3>' +
			'<p>Real pages add three wrinkles. Page 1 hosts the 100-byte file ' +
			'header, so its page header starts at offset 100 — forgetting this is ' +
			'the classic first bug in every home-grown parser, because page 1 ' +
			'holds <code>sqlite_schema</code> and is the first page you try. Big ' +
			'payloads spill to overflow-page chains (only a prefix stays in the ' +
			'cell, followed by a 4-byte overflow page number). And index B-trees ' +
			'(types 0x02/0x0a) put a full record — not a varint rowid — in the ' +
			'key position, compared with the record comparison rules from the ' +
			'previous lesson. None of these change the skeleton you built: ' +
			'sorted pointer array, lower-bound search, N keys with N+1 ' +
			'children, descend on ≥.</p>',
		],
		complexity: { time: 'O(log n) per page × tree depth — a handful of page reads for millions of rows', space: 'O(1)' },
	});
})();
