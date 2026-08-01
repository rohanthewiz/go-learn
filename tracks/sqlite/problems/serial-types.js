/* Serial Types: What a Column Value Is — File Format (Medium). In a
 * SQLite record, every column value is described by one varint "serial
 * type" code that encodes BOTH the type and the exact byte size: small
 * codes are fixed-size integers and floats, 8/9 are the literal values
 * 0 and 1 in zero bytes, and every code >= 12 encodes a BLOB (even) or
 * TEXT (odd) length. The harness pins the full code -> size table, the
 * reserved codes 10/11, and ChooseSerialType — the smallest-integer
 * pick that makes tables of small ints tiny on disk.
 */
(function () {
	'use strict';
	var T = GoLearnSQ;

	// The serial-type number line: fixed codes on the left, the even/odd
	// split for BLOB/TEXT on the right. Marker id namespaced (dgArrowSQ03)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="serial type codes: 0 through 9 are fixed meanings, 10 and 11 are reserved, 12 and up encode BLOB length when even and TEXT length when odd">' +
		'<text x="20" y="22" class="lbl">one varint per column: the code IS the type AND the size</text>' +
		// fixed codes
		'<rect x="20" y="38" width="230" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="135" y="65" text-anchor="middle">0..7: fixed sizes</text>' +
		'<text x="135" y="98" text-anchor="middle" class="lbl">NULL, ints of 1,2,3,4,6,8 bytes, float</text>' +
		// zero-byte specials
		'<rect x="270" y="38" width="110" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="325" y="65" text-anchor="middle">8, 9</text>' +
		'<text x="325" y="98" text-anchor="middle" class="lbl" style="fill:var(--warn)">0 and 1 in ZERO bytes</text>' +
		// reserved
		'<rect x="400" y="38" width="100" height="44" rx="5" fill="none" stroke="var(--edge)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<text x="450" y="65" text-anchor="middle">10, 11</text>' +
		'<text x="450" y="98" text-anchor="middle" class="lbl">reserved — reject</text>' +
		// even/odd split
		'<rect x="20" y="120" width="230" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="135" y="147" text-anchor="middle">even ≥ 12: BLOB</text>' +
		'<path d="M 250 142 L 288 142" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ03)"/>' +
		'<text x="330" y="147">len = (N-12)/2</text>' +
		'<rect x="20" y="170" width="230" height="24" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="135" y="187" text-anchor="middle">odd ≥ 13: TEXT</text>' +
		'<path d="M 250 182 L 288 182" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ03)"/>' +
		'<text x="330" y="187">len = (N-13)/2</text>' +
		'<defs><marker id="dgArrowSQ03" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'serial-types',
		title: 'Serial Types: What a Column Value Is',
		nav: 'serial types',
		difficulty: 'Medium',
		category: 'File Format',
		task: 'Implement SerialTypeSize (code → exact content size, rejecting reserved 10/11) and ChooseSerialType (the smallest integer encoding — the reason a table of small ints is tiny).',

		prose: [
			'<h2>Serial Types: What a Column Value Is</h2>' +
			'<p>You import a 10-million-row table of event flags — a rowid and two ' +
			'columns that are almost always <code>0</code> or <code>1</code> — and ' +
			'the database file lands at a few dozen megabytes where the CSV was ' +
			'hundreds. No compression is involved. The reason is the serial type: ' +
			'in the record format, every column value is prefixed by one varint ' +
			'code that says both <em>what</em> the value is and <em>exactly how ' +
			'many bytes</em> its content occupies — and for the integers 0 and 1, ' +
			'that answer is <strong>zero bytes</strong>. The value lives entirely ' +
			'in the code.</p>' +
			'<p>The full table, from the record-format section of the file-format ' +
			'doc:</p>',
			{ lang: 'txt', code: 'code       content size   meaning\n0          0              NULL\n1          1              8-bit  twos-complement int, big-endian\n2          2              16-bit twos-complement int\n3          3              24-bit twos-complement int\n4          4              32-bit twos-complement int\n5          6              48-bit twos-complement int\n6          8              64-bit twos-complement int\n7          8              IEEE 754 float64, big-endian\n8          0              the integer 0   (schema format 4+)\n9          0              the integer 1   (schema format 4+)\n10, 11     —              reserved for internal use: reject\nN>=12 even (N-12)/2       BLOB of that many bytes\nN>=13 odd  (N-13)/2       TEXT of that many bytes' },
			'<ul>' +
			'<li><strong>Sizes 1,2,3,4,6,8 — note the gaps.</strong> There is a ' +
			'3-byte and a 6-byte integer, sizes most formats skip. Every byte ' +
			'mattered: a value like 100,000 fits in 3 bytes, and the format ' +
			'refuses to pad it to 4.</li>' +
			'<li><strong>The even/odd trick.</strong> One number carries two ' +
			'facts: parity distinguishes BLOB from TEXT, and the halved remainder ' +
			'is the byte length. No second length field anywhere.</li>' +
			'<li><strong>Per-value, not per-column.</strong> The declared column ' +
			'type is nowhere in the record — each row, each column, gets whatever ' +
			'serial type its actual value needs. The same column can be a 1-byte ' +
			'int in one row and text in the next (that story is the type-affinity ' +
			'lesson).</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>SerialTypeSize(code uint64) (int, error)</code> — ' +
			'the exact content size in bytes, with an error for the reserved codes ' +
			'10 and 11 — and <code>ChooseSerialType(v int64) uint64</code>: the ' +
			'code sqlite3 picks when writing integer <code>v</code>, i.e. 8 or 9 ' +
			'for the zero-byte specials, else the smallest of the 1/2/3/4/6/8-byte ' +
			'twos-complement forms that holds <code>v</code>.</p>' +
			'<div class="tip">Contrast with the varint lesson: a <em>rowid</em> of ' +
			'-1 costs 9 varint bytes, but a <em>column value</em> of -1 is serial ' +
			'type 1 — a single twos-complement byte. Keys and values use ' +
			'different integer encodings, chosen for different access patterns.</div>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// SerialTypeSize maps a serial type code to the exact number of',
			'// content bytes that follow in the record body.',
			'//',
			'//   0->0  1->1  2->2  3->3  4->4  5->6  6->8  7->8  8->0  9->0',
			'//   10, 11        -> error (reserved for internal use)',
			'//   N>=12, N even -> (N-12)/2   BLOB',
			'//   N>=13, N odd  -> (N-13)/2   TEXT',
			'func SerialTypeSize(code uint64) (int, error) {',
			'	_ = errors.New // keep the import while the body is unwritten',
			'	// your code here',
			'	return 0, nil',
			'}',
			'',
			'// ChooseSerialType returns the code sqlite3 writes for integer v:',
			'// the zero-byte specials 8 (for 0) and 9 (for 1), otherwise the',
			'// SMALLEST twos-complement size that holds v — 1, 2, 3, 4, 6, or 8',
			'// bytes (codes 1, 2, 3, 4, 5, 6). Remember the ranges are signed:',
			'// code 1 covers -128..127, code 3 covers -(1<<23)..(1<<23)-1, etc.',
			'func ChooseSerialType(v int64) uint64 {',
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
			'// showSize renders a SerialTypeSize result as one comparable token.',
			'func showSize(n int, err error) string {',
			'	if err != nil {',
			'		return "error"',
			'	}',
			'	return fmt.Sprintf("%d", n)',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"fixed codes 0..9: NULL, six int sizes, float, and the zero-byte 0 and 1",',
			'			"0 1 2 3 4 6 8 8 0 0",',
			'			func() string {',
			'				out := ""',
			'				for code := uint64(0); code <= 9; code++ {',
			'					if code > 0 {',
			'						out += " "',
			'					}',
			'					out += showSize(SerialTypeSize(code))',
			'				}',
			'				return out',
			'			}},',
			'		{"reserved codes 10 and 11 must be rejected, not guessed at",',
			'			"error error",',
			'			func() string { return showSize(SerialTypeSize(10)) + " " + showSize(SerialTypeSize(11)) }},',
			'		{"code 12 is a zero-length BLOB (x\'\' is a real value)",',
			'			"0",',
			'			func() string { return showSize(SerialTypeSize(12)) }},',
			'		{"code 23 is 5-byte TEXT — the size of \'hello\'",',
			'			"5",',
			'			func() string { return showSize(SerialTypeSize(23)) }},',
			'		{"code 18 is a 3-byte BLOB; code 19 is 3-byte TEXT — parity decides",',
			'			"3 3",',
			'			func() string { return showSize(SerialTypeSize(18)) + " " + showSize(SerialTypeSize(19)) }},',
			'		{"a large text: code 1000013 is (1000013-13)/2 = 500000 bytes",',
			'			"500000",',
			'			func() string { return showSize(SerialTypeSize(1000013)) }},',
			'		{"the zero-byte specials: 0 -> code 8, 1 -> code 9",',
			'			"8 9",',
			'			func() string { return fmt.Sprintf("%d %d", ChooseSerialType(0), ChooseSerialType(1)) }},',
			'		{"-1 is NOT special: it needs a real byte — code 1",',
			'			"1",',
			'			func() string { return fmt.Sprintf("%d", ChooseSerialType(-1)) }},',
			'		{"8-bit boundary: 127 fits in code 1, 128 needs code 2",',
			'			"1 2",',
			'			func() string { return fmt.Sprintf("%d %d", ChooseSerialType(127), ChooseSerialType(128)) }},',
			'		{"signed low end: -128 fits in code 1, -129 needs code 2",',
			'			"1 2",',
			'			func() string { return fmt.Sprintf("%d %d", ChooseSerialType(-128), ChooseSerialType(-129)) }},',
			'		{"the odd sizes earn their keep: 100000 -> 3 bytes (code 3), 2^32 -> 6 bytes (code 5)",',
			'			"3 5",',
			'			func() string { return fmt.Sprintf("%d %d", ChooseSerialType(100000), ChooseSerialType(int64(1)<<32)) }},',
			'		{"16/24/32/48-bit boundaries in one sweep",',
			'			"2 3 3 4 4 5 5 6",',
			'			func() string {',
			'				vals := []int64{32767, 32768, (1 << 23) - 1, 1 << 23, (1 << 31) - 1, 1 << 31, (int64(1) << 47) - 1, int64(1) << 47}',
			'				out := ""',
			'				for i, v := range vals {',
			'					if i > 0 {',
			'						out += " "',
			'					}',
			'					out += fmt.Sprintf("%d", ChooseSerialType(v))',
			'				}',
			'				return out',
			'			}},',
			'		{"the extremes take the full 8 bytes: MinInt64 and MaxInt64 -> code 6",',
			'			"6 6",',
			'			func() string {',
			'				return fmt.Sprintf("%d %d", ChooseSerialType(-9223372036854775808), ChooseSerialType(9223372036854775807))',
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
			'import "errors"',
			'',
			'// SerialTypeSize maps a serial type code to the exact content size.',
			'// The fixed codes are a lookup table, not arithmetic — sizes 1,2,3,4',
			'// then 6 then 8 follow no formula, which is precisely the point: the',
			'// format hand-picked the sizes worth having.',
			'func SerialTypeSize(code uint64) (int, error) {',
			'	if code >= 12 {',
			'		// The even/odd trick: parity is the BLOB/TEXT flag, the halved',
			'		// remainder is the length. (N-12)/2 and (N-13)/2 collapse to',
			'		// one expression because integer division floors: for odd N,',
			'		// (N-12)/2 == (N-13)/2.',
			'		return int((code - 12) / 2), nil',
			'	}',
			'	// Indexing a fixed array keeps the table visibly identical to the',
			'	// spec table. -1 marks the reserved codes.',
			'	sizes := [12]int{0, 1, 2, 3, 4, 6, 8, 8, 0, 0, -1, -1}',
			'	n := sizes[code]',
			'	if n < 0 {',
			'		return 0, errors.New("serial type 10/11 reserved for internal use")',
			'	}',
			'	return n, nil',
			'}',
			'',
			'// ChooseSerialType returns the smallest encoding for integer v — the',
			'// choice sqlite3 makes for every integer it writes. Checked smallest',
			'// first because real data skews small: most values exit in the first',
			'// two or three comparisons.',
			'func ChooseSerialType(v int64) uint64 {',
			'	// The zero-byte specials first. Only 0 and 1 get this treatment:',
			'	// they are overwhelmingly the most common integers in real schemas',
			'	// (booleans, counters, defaults), so schema format 4 gave them',
			'	// dedicated codes and their content vanished from the body.',
			'	if v == 0 {',
			'		return 8',
			'	}',
			'	if v == 1 {',
			'		return 9',
			'	}',
			'	// Signed ranges, narrowest first. Each bound is the twos-complement',
			'	// range of the size: k bytes hold -(1<<(8k-1)) .. (1<<(8k-1))-1.',
			'	if v >= -(1<<7) && v < 1<<7 {',
			'		return 1 // 1 byte',
			'	}',
			'	if v >= -(1<<15) && v < 1<<15 {',
			'		return 2 // 2 bytes',
			'	}',
			'	if v >= -(1<<23) && v < 1<<23 {',
			'		return 3 // 3 bytes — the size most formats skip',
			'	}',
			'	if v >= -(1<<31) && v < 1<<31 {',
			'		return 4 // 4 bytes',
			'	}',
			'	if v >= -(int64(1)<<47) && v < int64(1)<<47 {',
			'		return 5 // 6 bytes',
			'	}',
			'	return 6 // full 8 bytes',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why fuse type and size into one number</h3>' +
			'<p>Most formats store a type tag and then a length. SQLite’s record ' +
			'format stores one varint that is both — and because the record header ' +
			'is a flat run of these codes, a reader can compute every column’s ' +
			'offset <em>without touching the body at all</em>. That enables the ' +
			'key access pattern: <code>SELECT col7 FROM t</code> parses ten tiny ' +
			'varints and then jumps straight to column 7’s bytes, skipping the ' +
			'content of columns 0–6 entirely. The header is a table of contents ' +
			'that costs about one byte per column.</p>' +
			'<h3>Codes 8 and 9 are a format-evolution story</h3>' +
			'<p>The original format 1 had no zero-byte integers; 0 and 1 cost a ' +
			'byte each like any small int. Schema format 4 (SQLite 3.3, 2006) ' +
			'added codes 8 and 9 — and did it compatibly: old databases never ' +
			'contain the new codes, and the schema-format number in the 100-byte ' +
			'header tells old libraries to refuse files that do. A table of ' +
			'booleans now stores its payload column in literally zero body bytes ' +
			'per row, which is the file-size surprise from the hook. You can see ' +
			'the machinery from the shell: <code>SELECT typeof(flag) FROM ' +
			'events</code> says <code>integer</code>, and ' +
			'<code>sqlite3_analyzer</code> shows the average payload per row ' +
			'sitting near the header-only floor.</p>' +
			'<h3>Reserved means reserved</h3>' +
			'<p>Codes 10 and 11 appear in real files only in internal contexts ' +
			'(10 is used inside index keys during certain operations), and the doc ' +
			'is blunt: a database containing them in ordinary records is corrupt. ' +
			'Rejecting them in <code>SerialTypeSize</code> instead of guessing a ' +
			'size is what keeps a parser from silently misaligning every ' +
			'subsequent column — the same fail-loud principle as the varint ' +
			'lesson’s <code>(0,&nbsp;0)</code> on truncation. Format parsers ' +
			'should treat “cannot happen” bytes as stop signs, not as noise to ' +
			'skip.</p>',
		],
		complexity: { time: 'O(1) — a table lookup or a handful of range checks', space: 'O(1)' },
	});
})();
