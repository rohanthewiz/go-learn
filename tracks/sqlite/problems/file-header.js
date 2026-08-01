/* The 100-Byte Header — File Format (Easy). Every SQLite database file
 * opens with the same 100 bytes: a magic string, the page size, format
 * version numbers, the page count, the text encoding, and the
 * user-settable version cookie — all big-endian, all at fixed offsets
 * published in fileformat2.html. The harness pins the real offsets: page
 * size at 16 (with the value-1-means-65536 trick), page count at 28,
 * text encoding at 56, user_version at 60, and magic validation.
 */
(function () {
	'use strict';
	var T = GoLearnSQ;

	// The first 100 bytes of every .db file. Marker id namespaced
	// (dgArrowSQ01) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="the 100-byte SQLite header: magic string at offset 0, big-endian page size at 16, page count at 28, text encoding at 56, user_version at 60">' +
		'<text x="20" y="22" class="lbl">offset 0 of every SQLite database file — 100 bytes, big-endian throughout</text>' +
		// magic
		'<rect x="20" y="36" width="200" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="120" y="61" text-anchor="middle">"SQLite format 3\\x00"</text>' +
		'<text x="120" y="90" text-anchor="middle" class="lbl">0..15 — the magic, NUL included</text>' +
		// page size
		'<rect x="240" y="36" width="120" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="300" y="61" text-anchor="middle">page size</text>' +
		'<text x="300" y="90" text-anchor="middle" class="lbl">16..17 — u16, 1 = 65536</text>' +
		// versions
		'<rect x="380" y="36" width="120" height="40" rx="5" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="440" y="61" text-anchor="middle">w/r versions</text>' +
		'<text x="440" y="90" text-anchor="middle" class="lbl">18, 19 — 1=journal 2=WAL</text>' +
		// second row
		'<rect x="20" y="110" width="150" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="95" y="135" text-anchor="middle">page count</text>' +
		'<text x="95" y="164" text-anchor="middle" class="lbl">28..31 — u32</text>' +
		'<rect x="190" y="110" width="150" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="265" y="135" text-anchor="middle">text encoding</text>' +
		'<text x="265" y="164" text-anchor="middle" class="lbl">56..59 — 1=UTF-8</text>' +
		'<rect x="360" y="110" width="140" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="430" y="135" text-anchor="middle">user_version</text>' +
		'<text x="430" y="164" text-anchor="middle" class="lbl">60..63 — yours to set</text>' +
		'<text x="20" y="192" class="lbl">file size = page size × page count — the whole database is just pages after these 100 bytes</text>' +
		'<defs><marker id="dgArrowSQ01" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'file-header',
		title: 'The 100-Byte Header',
		nav: 'file header',
		difficulty: 'Easy',
		category: 'File Format',
		task: 'Parse the 100-byte SQLite file header from a []byte: validate the magic, decode the big-endian page size (1 means 65536), format versions, page count, text encoding, and user_version.',

		prose: [
			'<h2>The 100-Byte Header</h2>' +
			'<p>A teammate hands you a file recovered from a crashed phone and asks ' +
			'“is this a SQLite database, and how big is it supposed to be?” You run ' +
			'<code>xxd app.db | head -2</code> and see:</p>',
			{ lang: 'txt', code: '00000000: 5351 4c69 7465 2066 6f72 6d61 7420 3300  SQLite format 3.\n00000010: 1000 0101 0040 2020 0000 0005 0000 0130  .....@  .......0' },
			'<p>Those first 16 bytes are the magic string ' +
			'<code>"SQLite format 3\\x00"</code> — NUL terminator included, all 16 ' +
			'bytes significant. The next bytes answer the size question without ' +
			'reading anything else: page size <code>0x1000</code> = 4096 at offset ' +
			'16, and a 32-bit page count at offset 28. Multiply them and you know ' +
			'exactly how many bytes the file should be — which is how you detect a ' +
			'truncated copy before sqlite3 ever complains. The layout, from the ' +
			'official file-format document (every field big-endian):</p>',
			{ lang: 'txt', code: 'offset  size  field\n     0    16  magic: "SQLite format 3\\x00"\n    16     2  page size (u16). Power of two, 512..32768 — OR the value 1,\n              which means 65536 (65536 does not fit in a u16)\n    18     1  file format WRITE version: 1 = rollback journal, 2 = WAL\n    19     1  file format READ  version: 1 = rollback journal, 2 = WAL\n    28     4  page count (u32): database size in pages\n    56     4  text encoding (u32): 1 = UTF-8, 2 = UTF-16le, 3 = UTF-16be\n    60     4  user_version (u32): free cookie, set via PRAGMA user_version' },
			'<ul>' +
			'<li><strong>The page-size-1 trick.</strong> The format predates 64&nbsp;KiB ' +
			'pages; when they were added, 65536 could not be stored in the existing ' +
			'u16 field, so the sentinel value <code>1</code> was defined to mean ' +
			'65536. Any parser that skips this rule mis-sizes every page in a ' +
			'64&nbsp;KiB-page database.</li>' +
			'<li><strong>Read/write versions</strong> are how old libraries fail ' +
			'gracefully: a WAL database stores 2 in both; a library that only knows ' +
			'format 1 sees a read version it does not understand and refuses to ' +
			'touch the file rather than corrupt it.</li>' +
			'<li><strong>user_version</strong> is deliberately meaningless to ' +
			'SQLite — it exists so applications can stamp their schema migration ' +
			'number into the file itself.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>ParseHeader(b []byte)</code>: return an error for a ' +
			'buffer shorter than 100 bytes or a wrong magic; otherwise decode the ' +
			'fields above into a <code>Header</code>, applying the ' +
			'1&nbsp;→&nbsp;65536 page-size rule. Hand-roll the big-endian reads ' +
			'with shifts — that is part of the lesson: ' +
			'<code>uint32(b[o])&lt;&lt;24 | ... | uint32(b[o+3])</code>.</p>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// Header is the decoded 100-byte SQLite file header. Only the fields',
			'// this lesson pins — the full header has 20+ fields, all at fixed',
			'// offsets, all big-endian.',
			'type Header struct {',
			'	PageSize     int    // decoded: the stored value 1 means 65536',
			'	WriteVersion byte   // 1 = rollback journal, 2 = WAL',
			'	ReadVersion  byte   // 1 = rollback journal, 2 = WAL',
			'	PageCount    uint32 // database size in pages (offset 28)',
			'	TextEncoding uint32 // 1 = UTF-8, 2 = UTF-16le, 3 = UTF-16be (offset 56)',
			'	UserVersion  uint32 // PRAGMA user_version cookie (offset 60)',
			'}',
			'',
			'// ParseHeader decodes the first 100 bytes of a database file.',
			'//',
			'//   - reject buffers shorter than 100 bytes',
			'//   - reject a wrong magic ("SQLite format 3\\x00" — 16 bytes, NUL included)',
			'//   - page size is a big-endian u16 at offset 16; the value 1 means 65536',
			'//   - page count / text encoding / user_version are big-endian u32s',
			'//',
			'// Errors are returned, never panicked.',
			'func ParseHeader(b []byte) (Header, error) {',
			'	_ = errors.New // keep the import while the body is unwritten',
			'	// your code here',
			'	return Header{}, nil',
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
			'// mkHdr assembles a valid 100-byte header the way sqlite3 writes one.',
			'// Big-endian packing is done longhand here too — the harness must not',
			'// depend on the code under test.',
			'func mkHdr(pageSizeField int, wv, rv byte, pageCount, enc, userVersion uint32) []byte {',
			'	h := make([]byte, 100)',
			'	copy(h, "SQLite format 3\\x00")',
			'	h[16], h[17] = byte(pageSizeField>>8), byte(pageSizeField)',
			'	h[18], h[19] = wv, rv',
			'	h[28], h[29], h[30], h[31] = byte(pageCount>>24), byte(pageCount>>16), byte(pageCount>>8), byte(pageCount)',
			'	h[56], h[57], h[58], h[59] = byte(enc>>24), byte(enc>>16), byte(enc>>8), byte(enc)',
			'	h[60], h[61], h[62], h[63] = byte(userVersion>>24), byte(userVersion>>16), byte(userVersion>>8), byte(userVersion)',
			'	return h',
			'}',
			'',
			'// show renders a parse result as one comparable line.',
			'func show(h Header, err error) string {',
			'	if err != nil {',
			'		return "error"',
			'	}',
			'	return fmt.Sprintf("page=%d wv=%d rv=%d pages=%d enc=%d uv=%d",',
			'		h.PageSize, h.WriteVersion, h.ReadVersion, h.PageCount, h.TextEncoding, h.UserVersion)',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"a stock 4096-byte-page journal-mode db, 5 pages, UTF-8",',
			'			"page=4096 wv=1 rv=1 pages=5 enc=1 uv=0",',
			'			func() string { return show(ParseHeader(mkHdr(4096, 1, 1, 5, 1, 0))) }},',
			'		{"WAL database: write and read versions are both 2",',
			'			"page=1024 wv=2 rv=2 pages=12 enc=1 uv=0",',
			'			func() string { return show(ParseHeader(mkHdr(1024, 2, 2, 12, 1, 0))) }},',
			'		{"the sentinel: stored page size 1 decodes to 65536",',
			'			"page=65536 wv=1 rv=1 pages=2 enc=1 uv=0",',
			'			func() string { return show(ParseHeader(mkHdr(1, 1, 1, 2, 1, 0))) }},',
			'		{"user_version cookie survives the round trip (PRAGMA user_version = 7)",',
			'			"page=4096 wv=1 rv=1 pages=3 enc=1 uv=7",',
			'			func() string { return show(ParseHeader(mkHdr(4096, 1, 1, 3, 1, 7))) }},',
			'		{"UTF-16le database: encoding field 2 at offset 56",',
			'			"page=8192 wv=1 rv=1 pages=9 enc=2 uv=0",',
			'			func() string { return show(ParseHeader(mkHdr(8192, 1, 1, 9, 2, 0))) }},',
			'		{"wrong magic (a zip file, say) must be an error, not garbage fields",',
			'			"error",',
			'			func() string {',
			'				bad := mkHdr(4096, 1, 1, 5, 1, 0)',
			'				bad[0] = 0x50 // "P" of "PK.." — the classic mis-identified file',
			'				return show(ParseHeader(bad))',
			'			}},',
			'		{"truncated buffer (99 bytes) must be an error",',
			'			"error",',
			'			func() string { return show(ParseHeader(mkHdr(4096, 1, 1, 5, 1, 0)[:99])) }},',
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
			'// Header is the decoded 100-byte SQLite file header (the fields this',
			'// lesson pins; the real header has 20+, all fixed-offset, big-endian).',
			'type Header struct {',
			'	PageSize     int',
			'	WriteVersion byte',
			'	ReadVersion  byte',
			'	PageCount    uint32',
			'	TextEncoding uint32',
			'	UserVersion  uint32',
			'}',
			'',
			'// be16 and be32 hand-roll big-endian decoding with shifts. The file',
			'// format chose big-endian so a database written on x86 reads',
			'// identically on SPARC — the decoder never asks what machine wrote it.',
			'func be16(b []byte, o int) int {',
			'	return int(b[o])<<8 | int(b[o+1])',
			'}',
			'',
			'func be32(b []byte, o int) uint32 {',
			'	return uint32(b[o])<<24 | uint32(b[o+1])<<16 | uint32(b[o+2])<<8 | uint32(b[o+3])',
			'}',
			'',
			'// ParseHeader decodes the first 100 bytes of a database file.',
			'func ParseHeader(b []byte) (Header, error) {',
			'	// Length first: every later read assumes the fixed offsets exist.',
			'	// A truncated header is the "file copied mid-write" signature.',
			'	if len(b) < 100 {',
			'		return Header{}, errors.New("header: need 100 bytes")',
			'	}',
			'	// All 16 magic bytes are significant, including the trailing NUL.',
			'	// A string conversion compares the whole prefix in one shot instead',
			'	// of an index-by-index loop.',
			'	if string(b[:16]) != "SQLite format 3\\x00" {',
			'		return Header{}, errors.New("header: bad magic — not a SQLite 3 database")',
			'	}',
			'	// The one decode rule that is not a plain big-endian read: 64 KiB',
			'	// pages postdate the u16 field, so the stored value 1 was defined',
			'	// to mean 65536. Decode it here, once, so no downstream code ever',
			'	// sees the raw sentinel.',
			'	ps := be16(b, 16)',
			'	if ps == 1 {',
			'		ps = 65536',
			'	}',
			'	return Header{',
			'		PageSize:     ps,',
			'		WriteVersion: b[18],',
			'		ReadVersion:  b[19],',
			'		PageCount:    be32(b, 28),',
			'		TextEncoding: be32(b, 56),',
			'		UserVersion:  be32(b, 60),',
			'	}, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why a fixed 100 bytes, forever</h3>' +
			'<p>The header layout is part of SQLite’s famous compatibility promise: ' +
			'the on-disk format is guaranteed readable by every future version ' +
			'through at least 2050, and the first 100 bytes have not changed shape ' +
			'since format&nbsp;3 shipped in 2004. New features never move fields — ' +
			'they claim one of the reserved bytes or a new meaning for an existing ' +
			'one, exactly like the page-size sentinel: when 64&nbsp;KiB pages ' +
			'arrived, redefining the value <code>1</code> was the only move that ' +
			'kept every old database byte-identical.</p>' +
			'<h3>The version bytes are a forward-compatibility contract</h3>' +
			'<p>The read/write version pair at offsets 18–19 encodes “what you must ' +
			'understand to touch this file.” A library may <em>read</em> a file ' +
			'whose read version it supports and must refuse anything newer — so ' +
			'when WAL mode (version 2) was introduced in 2010, a 2008-era SQLite ' +
			'opening a WAL database returned an error instead of silently ignoring ' +
			'the <code>-wal</code> file and serving stale, torn data. Graceful ' +
			'refusal was designed in from byte 18.</p>' +
			'<h3>What sqlite3’s own tooling shows</h3>' +
			'<p>Everything you parsed is one command away in the shell: ' +
			'<code>.dbinfo</code> prints <code>database page size</code>, ' +
			'<code>database page count</code>, <code>text encoding</code>, and ' +
			'<code>user version</code> — it is literally this parse. ' +
			'<code>PRAGMA page_size</code>, <code>PRAGMA page_count</code>, and ' +
			'<code>PRAGMA user_version</code> read the same fields, and ' +
			'<code>file app.db</code> identifies the format from the same 16 magic ' +
			'bytes you validated. The size check from the hook — ' +
			'<code>page_size × page_count == file size</code> — is the first thing ' +
			'a corruption triage establishes, and a mismatch is the classic ' +
			'signature of a database copied with <code>cp</code> while a ' +
			'transaction was mid-flight (which is why the supported way to copy a ' +
			'live database is <code>VACUUM INTO</code> or the backup API, never ' +
			'the filesystem).</p>',
		],
		complexity: { time: 'O(1) — fixed offsets into a fixed-size header', space: 'O(1)' },
	});
})();
