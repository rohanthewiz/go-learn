/* The Record Format: Encoding a Row — File Format (Hard). A row in a
 * SQLite file is a "record": a header that is a varint total-size (which
 * includes itself) followed by one serial-type varint per column, then a
 * body holding each column's content bytes back to back. The harness
 * pins exact bytes for small records (including the vanishing 0/1
 * specials and twos-complement sign extension), a realistic round trip,
 * and the fail-loud paths: reserved serial types and truncated bodies.
 */
(function () {
	'use strict';
	var T = GoLearnSQ;

	// A record is a table of contents (the header) plus a bare content
	// stream (the body). Marker id namespaced (dgArrowSQ04) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="record layout: a header-size varint that includes itself, one serial-type varint per column, then the body with each column\'s content bytes; header entry N points at column N\'s slice of the body">' +
		'<text x="20" y="22" class="lbl">record for the row (NULL, 0, 1, \'hi\') — header bytes 05 00 08 09 11, body 68 69</text>' +
		// header cells
		'<rect x="20" y="40" width="70" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="55" y="67" text-anchor="middle">05</text>' +
		'<text x="55" y="100" text-anchor="middle" class="lbl">hdr size</text>' +
		'<rect x="100" y="40" width="70" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="135" y="67" text-anchor="middle">00</text>' +
		'<text x="135" y="100" text-anchor="middle" class="lbl">NULL</text>' +
		'<rect x="180" y="40" width="70" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="215" y="67" text-anchor="middle">08</text>' +
		'<text x="215" y="100" text-anchor="middle" class="lbl">int 0</text>' +
		'<rect x="260" y="40" width="70" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="295" y="67" text-anchor="middle">09</text>' +
		'<text x="295" y="100" text-anchor="middle" class="lbl">int 1</text>' +
		'<rect x="340" y="40" width="70" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="375" y="67" text-anchor="middle">11</text>' +
		'<text x="375" y="100" text-anchor="middle" class="lbl">TEXT len 2</text>' +
		// body
		'<rect x="430" y="40" width="70" height="44" rx="5" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="465" y="67" text-anchor="middle">68 69</text>' +
		'<text x="465" y="100" text-anchor="middle" class="lbl">body: "hi"</text>' +
		// arrow from text type to body
		'<path d="M 375 116 C 375 160 465 160 465 96" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSQ04)"/>' +
		'<text x="240" y="160" text-anchor="middle" class="lbl" style="fill:var(--warn)">only the TEXT column owns body bytes — NULL, 0 and 1 live entirely in the header</text>' +
		'<text x="20" y="200" class="lbl">header size 05 counts ITSELF: 1 (size varint) + 4 (type varints) = 5 — the body starts at offset 5</text>' +
		'<defs><marker id="dgArrowSQ04" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'record-format',
		title: 'The Record Format: Encoding a Row',
		nav: 'record format',
		difficulty: 'Hard',
		category: 'File Format',
		task: 'Implement EncodeRecord and DecodeRecord: header = varint(total header size, itself included) + one serial-type varint per column; body = each column\'s content bytes. Your varint and serial-type logic, composed.',

		prose: [
			'<h2>The Record Format: Encoding a Row</h2>' +
			'<p>Support sends you eight bytes recovered from a page of a damaged ' +
			'database — <code>05 00 08 09 11 68 69</code> plus change — and asks ' +
			'“is there still a row in here?” There is, and you can now read it by ' +
			'hand: that is a complete record, and decoding it is this lesson. ' +
			'Every table row, every index entry, and every value ' +
			'<code>sqlite3</code> has ever stored is one of these records — the ' +
			'record format is the payload format of the entire database.</p>' +
			'<p>A record is two sections:</p>' +
			'<ul>' +
			'<li><strong>Header:</strong> first a varint giving the total header ' +
			'size in bytes — <em>including the size varint itself</em> — then one ' +
			'serial-type varint per column, in column order.</li>' +
			'<li><strong>Body:</strong> each column’s content bytes, back to back, ' +
			'in the same order, with no delimiters — the serial types already say ' +
			'exactly how long each one is.</li>' +
			'</ul>',
			{ lang: 'txt', code: 'record for the row (NULL, 0, 1, \'hi\'):\n\noffset  bytes  meaning\n0       05     header size = 5 (this varint + four type varints)\n1       00     serial type 0        -> NULL,  0 body bytes\n2       08     serial type 8        -> int 0, 0 body bytes\n3       09     serial type 9        -> int 1, 0 body bytes\n4       11     serial type 0x11=17  -> TEXT (17-13)/2 = 2 bytes\n5       68 69  body: "hi"\n\ntotal: 7 bytes for a 4-column row.' },
			'<p>Two consequences follow from the shape. First, the header is a ' +
			'<em>table of contents</em>: summing serial-type sizes gives every ' +
			'column’s body offset without reading any content. Second, the ' +
			'self-including header size means the body offset is known the moment ' +
			'the first varint is decoded — the reader never scans for a ' +
			'terminator.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>EncodeRecord([]Value) ([]byte, error)</code> and ' +
			'<code>DecodeRecord([]byte) ([]Value, error)</code> over a ' +
			'<code>Value</code> tagged union (null / int / float / text / blob). ' +
			'You will need your varint codec and serial-type table from the ' +
			'previous lessons — redeclare them; the solution stands alone. ' +
			'Integers use the <em>smallest</em> twos-complement encoding (with ' +
			'the zero-byte 8/9 specials), floats are serial type 7 — 8 big-endian ' +
			'bytes of <code>math.Float64bits</code> — and decode must ' +
			'sign-extend. Reserved serial types (10, 11) and truncated input are ' +
			'errors, never panics.</p>' +
			'<div class="tip">The header-size varint counting itself is a classic ' +
			'off-by-one trap: for a small record the header is ' +
			'<code>1 + len(typeVarints)</code> bytes, but a record with hundreds ' +
			'of columns can push the size varint to 2 bytes — which changes the ' +
			'size it encodes. Compute it as a fixpoint, not a guess.</div>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// Value is one column value — a tagged union. Exactly one of the',
			'// payload fields is meaningful, selected by Kind:',
			'//',
			'//   "null"  -> no payload',
			'//   "int"   -> Int',
			'//   "float" -> Float',
			'//   "text"  -> Text',
			'//   "blob"  -> Blob',
			'type Value struct {',
			'	Kind  string',
			'	Int   int64',
			'	Float float64',
			'	Text  string',
			'	Blob  []byte',
			'}',
			'',
			'// EncodeRecord builds the SQLite record for one row: the header',
			'// (self-including size varint + one serial-type varint per column)',
			'// followed by the body (each column\'s content bytes).',
			'//',
			'//   - integers: smallest twos-complement size; 0 and 1 use the',
			'//     zero-byte serial types 8 and 9',
			'//   - floats: serial type 7, 8 big-endian bytes of math.Float64bits',
			'//   - text: serial type 13+2n; blob: 12+2n',
			'func EncodeRecord(vals []Value) ([]byte, error) {',
			'	_ = errors.New // keep the import while the body is unwritten',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
			'// DecodeRecord parses a record back into values. Sign-extend the',
			'// twos-complement integers. Reserved serial types (10, 11), a',
			'// truncated header, or a body shorter than the types promise are',
			'// errors — never panic on hostile bytes.',
			'func DecodeRecord(b []byte) ([]Value, error) {',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'// hexOf renders encoder output; encode errors become "error" so a',
			'// case can pin them.',
			'func hexOf(b []byte, err error) string {',
			'	if err != nil {',
			'		return "error"',
			'	}',
			'	out := ""',
			'	for _, c := range b {',
			'		out += fmt.Sprintf("%02x", c)',
			'	}',
			'	return out',
			'}',
			'',
			'// fmtVals renders a decode result deterministically; floats go',
			'// through fixed-precision Sprintf, never raw.',
			'func fmtVals(vals []Value, err error) string {',
			'	if err != nil {',
			'		return "error"',
			'	}',
			'	parts := make([]string, 0, len(vals))',
			'	for _, v := range vals {',
			'		if v.Kind == "null" {',
			'			parts = append(parts, "null")',
			'		} else if v.Kind == "int" {',
			'			parts = append(parts, fmt.Sprintf("int:%d", v.Int))',
			'		} else if v.Kind == "float" {',
			'			parts = append(parts, fmt.Sprintf("float:%.2f", v.Float))',
			'		} else if v.Kind == "text" {',
			'			parts = append(parts, "text:"+v.Text)',
			'		} else if v.Kind == "blob" {',
			'			parts = append(parts, fmt.Sprintf("blob:%x", v.Blob))',
			'		} else {',
			'			parts = append(parts, "kind?"+v.Kind)',
			'		}',
			'	}',
			'	return strings.Join(parts, " ")',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"single int 5: header 02 01, body 05",',
			'			"020105",',
			'			func() string { return hexOf(EncodeRecord([]Value{{Kind: "int", Int: 5}})) }},',
			'		{"the diagram row (NULL, 0, 1, \'hi\'): 0 and 1 vanish into the header",',
			'			"05000809116869",',
			'			func() string {',
			'				return hexOf(EncodeRecord([]Value{{Kind: "null"}, {Kind: "int", Int: 0}, {Kind: "int", Int: 1}, {Kind: "text", Text: "hi"}}))',
			'			}},',
			'		{"-1 is one twos-complement byte: 02 01 ff",',
			'			"0201ff",',
			'			func() string { return hexOf(EncodeRecord([]Value{{Kind: "int", Int: -1}})) }},',
			'		{"100000 takes the 3-byte size most formats skip: 02 03 01 86 a0",',
			'			"02030186a0",',
			'			func() string { return hexOf(EncodeRecord([]Value{{Kind: "int", Int: 100000}})) }},',
			'		{"float 3.5 is serial type 7: the 8 big-endian bytes of its IEEE 754 pattern",',
			'			"0207400c000000000000",',
			'			func() string { return hexOf(EncodeRecord([]Value{{Kind: "float", Float: 3.5}})) }},',
			'		{"decode 03 02 13 | 01 2c 61 62 63: a 2-byte int and 3-byte text",',
			'			"int:300 text:abc",',
			'			func() string {',
			'				return fmtVals(DecodeRecord([]byte{0x03, 0x02, 0x13, 0x01, 0x2c, 0x61, 0x62, 0x63}))',
			'			}},',
			'		{"decode must sign-extend: 01 ff is -1, 02 ff 38 is -200",',
			'			"int:-1 int:-200",',
			'			func() string {',
			'				return fmtVals(DecodeRecord([]byte{0x03, 0x01, 0x02, 0xff, 0xff, 0x38}))',
			'			}},',
			'		{"round trip a realistic row: null, ints, text, blob, float",',
			'			"null int:42 int:1 int:-7 text:hello blob:deadbeef float:3.14",',
			'			func() string {',
			'				row := []Value{',
			'					{Kind: "null"},',
			'					{Kind: "int", Int: 42},',
			'					{Kind: "int", Int: 1},',
			'					{Kind: "int", Int: -7},',
			'					{Kind: "text", Text: "hello"},',
			'					{Kind: "blob", Blob: []byte{0xde, 0xad, 0xbe, 0xef}},',
			'					{Kind: "float", Float: 3.14},',
			'				}',
			'				enc, err := EncodeRecord(row)',
			'				if err != nil {',
			'					return "error"',
			'				}',
			'				return fmtVals(DecodeRecord(enc))',
			'			}},',
			'		{"reserved serial type 10 in the header is corruption: error, not a guess",',
			'			"error",',
			'			func() string { return fmtVals(DecodeRecord([]byte{0x02, 0x0a})) }},',
			'		{"body shorter than the types promise: error, not a panic",',
			'			"error",',
			'			func() string { return fmtVals(DecodeRecord([]byte{0x02, 0x01})) }},',
			'		{"empty input: error",',
			'			"error",',
			'			func() string { return fmtVals(DecodeRecord(nil)) }},',
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
			'import (',
			'	"errors"',
			'	"math"',
			')',
			'',
			'// Value is one column value — a tagged union keyed by Kind',
			'// ("null" | "int" | "float" | "text" | "blob").',
			'type Value struct {',
			'	Kind  string',
			'	Int   int64',
			'	Float float64',
			'	Text  string',
			'	Blob  []byte',
			'}',
			'',
			'// ---- varint codec (SQLite form: big-endian, 9-byte cap) ----------',
			'// Redeclared here because a record parser must stand alone; these are',
			'// the same routines as the varint lesson.',
			'',
			'func putVarint(v uint64) []byte {',
			'	if v >= uint64(1)<<56 {',
			'		buf := make([]byte, 9)',
			'		buf[8] = byte(v)',
			'		rest := v >> 8',
			'		for i := 7; i >= 0; i-- {',
			'			buf[i] = byte(rest&0x7f) | 0x80',
			'			rest >>= 7',
			'		}',
			'		return buf',
			'	}',
			'	var scratch [8]byte',
			'	i := 8',
			'	for {',
			'		i--',
			'		scratch[i] = byte(v & 0x7f)',
			'		v >>= 7',
			'		if v == 0 {',
			'			break',
			'		}',
			'	}',
			'	out := make([]byte, 0, 8-i)',
			'	for j := i; j < 8; j++ {',
			'		c := scratch[j]',
			'		if j != 7 {',
			'			c |= 0x80',
			'		}',
			'		out = append(out, c)',
			'	}',
			'	return out',
			'}',
			'',
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
			'// ---- serial types -------------------------------------------------',
			'',
			'// serialTypeSize maps code -> content size; -1 flags reserved codes.',
			'func serialTypeSize(code uint64) int {',
			'	if code >= 12 {',
			'		return int((code - 12) / 2)',
			'	}',
			'	sizes := [12]int{0, 1, 2, 3, 4, 6, 8, 8, 0, 0, -1, -1}',
			'	return sizes[code]',
			'}',
			'',
			'// intSerial picks the smallest integer encoding: the zero-byte 8/9',
			'// specials, else 1..6 by signed range — the same table the',
			'// serial-types lesson pins.',
			'func intSerial(v int64) uint64 {',
			'	if v == 0 {',
			'		return 8',
			'	}',
			'	if v == 1 {',
			'		return 9',
			'	}',
			'	if v >= -(1<<7) && v < 1<<7 {',
			'		return 1',
			'	}',
			'	if v >= -(1<<15) && v < 1<<15 {',
			'		return 2',
			'	}',
			'	if v >= -(1<<23) && v < 1<<23 {',
			'		return 3',
			'	}',
			'	if v >= -(1<<31) && v < 1<<31 {',
			'		return 4',
			'	}',
			'	if v >= -(int64(1)<<47) && v < int64(1)<<47 {',
			'		return 5',
			'	}',
			'	return 6',
			'}',
			'',
			'// beInt writes the low n bytes of u big-endian — twos-complement',
			'// integers and float bit patterns share this path, because after',
			'// Float64bits a float IS just a u64 to the format.',
			'func beInt(u uint64, n int) []byte {',
			'	out := make([]byte, n)',
			'	for i := n - 1; i >= 0; i-- {',
			'		out[i] = byte(u)',
			'		u >>= 8',
			'	}',
			'	return out',
			'}',
			'',
			'// EncodeRecord builds header + body for one row.',
			'func EncodeRecord(vals []Value) ([]byte, error) {',
			'	types := make([][]byte, 0, len(vals)) // encoded serial-type varints',
			'	body := make([]byte, 0, 64)',
			'	for _, v := range vals {',
			'		if v.Kind == "null" {',
			'			types = append(types, putVarint(0))',
			'		} else if v.Kind == "int" {',
			'			st := intSerial(v.Int)',
			'			types = append(types, putVarint(st))',
			'			// Codes 8/9 carry the value in the code itself: no body',
			'			// bytes at all. Casting to uint64 first makes the shift-',
			'			// based packer emit the twos-complement pattern verbatim.',
			'			if st >= 1 && st <= 6 {',
			'				body = append(body, beInt(uint64(v.Int), serialTypeSize(st))...)',
			'			}',
			'		} else if v.Kind == "float" {',
			'			types = append(types, putVarint(7))',
			'			body = append(body, beInt(math.Float64bits(v.Float), 8)...)',
			'		} else if v.Kind == "text" {',
			'			types = append(types, putVarint(uint64(13+2*len(v.Text))))',
			'			body = append(body, v.Text...)',
			'		} else if v.Kind == "blob" {',
			'			types = append(types, putVarint(uint64(12+2*len(v.Blob))))',
			'			body = append(body, v.Blob...)',
			'		} else {',
			'			return nil, errors.New("record: unknown value kind " + v.Kind)',
			'		}',
			'	}',
			'	n := 0',
			'	for _, tv := range types {',
			'		n += len(tv)',
			'	}',
			'	// The header size includes its own varint, so it is a fixpoint:',
			'	// growing the total can grow the size varint, which grows the',
			'	// total. One extra iteration settles it; records small enough for',
			'	// a 1-byte size varint (the overwhelming majority) never loop.',
			'	total := n + 1',
			'	for n+len(putVarint(uint64(total))) != total {',
			'		total = n + len(putVarint(uint64(total)))',
			'	}',
			'	out := make([]byte, 0, total+len(body))',
			'	out = append(out, putVarint(uint64(total))...)',
			'	for _, tv := range types {',
			'		out = append(out, tv...)',
			'	}',
			'	out = append(out, body...)',
			'	return out, nil',
			'}',
			'',
			'// DecodeRecord parses header then body, sign-extending integers.',
			'func DecodeRecord(b []byte) ([]Value, error) {',
			'	hs, n := getVarint(b)',
			'	if n == 0 || hs < uint64(n) || hs > uint64(len(b)) {',
			'		return nil, errors.New("record: bad header size")',
			'	}',
			'	// Pass 1: the header is a flat run of serial-type varints ending',
			'	// exactly at offset hs. Collecting them first gives the column',
			'	// count and every body offset before any content is touched —',
			'	// the table-of-contents property.',
			'	types := make([]uint64, 0, 8)',
			'	cur := n',
			'	for uint64(cur) < hs {',
			'		st, c := getVarint(b[cur:])',
			'		if c == 0 {',
			'			return nil, errors.New("record: truncated header varint")',
			'		}',
			'		if st == 10 || st == 11 {',
			'			return nil, errors.New("record: reserved serial type — corrupt record")',
			'		}',
			'		types = append(types, st)',
			'		cur += c',
			'	}',
			'	// Pass 2: slice the body by the sizes the types promised.',
			'	vals := make([]Value, 0, len(types))',
			'	for _, st := range types {',
			'		size := serialTypeSize(st)',
			'		if cur+size > len(b) {',
			'			return nil, errors.New("record: body truncated")',
			'		}',
			'		content := b[cur : cur+size]',
			'		cur += size',
			'		if st == 0 {',
			'			vals = append(vals, Value{Kind: "null"})',
			'		} else if st == 8 {',
			'			vals = append(vals, Value{Kind: "int", Int: 0})',
			'		} else if st == 9 {',
			'			vals = append(vals, Value{Kind: "int", Int: 1})',
			'		} else if st >= 1 && st <= 6 {',
			'			// Sign extension: seed the accumulator with all-ones when',
			'			// the first content byte has its high bit set, then shift',
			'			// the bytes in — the missing high bytes of a negative',
			'			// number are ff by definition of twos-complement.',
			'			var u uint64',
			'			if content[0]&0x80 != 0 {',
			'				u = ^uint64(0)',
			'			}',
			'			for _, c := range content {',
			'				u = u<<8 | uint64(c)',
			'			}',
			'			vals = append(vals, Value{Kind: "int", Int: int64(u)})',
			'		} else if st == 7 {',
			'			var u uint64',
			'			for _, c := range content {',
			'				u = u<<8 | uint64(c)',
			'			}',
			'			vals = append(vals, Value{Kind: "float", Float: math.Float64frombits(u)})',
			'		} else if st%2 == 1 {',
			'			vals = append(vals, Value{Kind: "text", Text: string(content)})',
			'		} else {',
			'			blob := append([]byte(nil), content...) // own the bytes',
			'			vals = append(vals, Value{Kind: "blob", Blob: blob})',
			'		}',
			'	}',
			'	return vals, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why header-then-body beats interleaving</h3>' +
			'<p>The obvious row encoding interleaves type tags with content: ' +
			'<code>tag, bytes, tag, bytes…</code> SQLite splits them, and the ' +
			'split is what makes column access cheap. To read column N the engine ' +
			'decodes N+1 tiny varints — almost always one byte each, hot in cache ' +
			'— sums the sizes, and lands on the content. With interleaving it ' +
			'would have to <em>step over</em> every earlier column’s content, ' +
			'touching bytes it does not want. The header is also where the row ' +
			'ends up when it is an <em>index</em> entry: index keys are just ' +
			'records too, compared field by field, and comparing headers first ' +
			'settles most comparisons before any long text is read.</p>' +
			'<h3>Flexible typing is a feature, not sloppiness</h3>' +
			'<p>Notice what the encoder never consulted: the declared column ' +
			'types. Each value chose its own serial type, so an INTEGER column ' +
			'holding 3 in one row costs 1 body byte there and 0 in the row ' +
			'holding 1 — and the same physical machinery lets a column hold text ' +
			'in one row and an integer in the next. The affinity lesson covers ' +
			'the rules SQLite layers on top; at the format level, ' +
			'<code>typeof()</code> per row is simply reporting the serial type ' +
			'class you decoded here. This is also why <code>ALTER TABLE … ADD ' +
			'COLUMN</code> is O(1): old records simply have fewer header entries, ' +
			'and missing trailing columns read as the default without rewriting a ' +
			'single row.</p>' +
			'<h3>Seeing it in a real file</h3>' +
			'<p>Everything here is inspectable. <code>SELECT quote(x), typeof(x)</code> ' +
			'shows the value classes; <code>sqlite3_analyzer</code> reports ' +
			'average payload sizes that you can now predict to the byte; and if ' +
			'you open a .db file in a hex editor, the records sit inside B-tree ' +
			'cells prefixed by a payload-length varint and a rowid varint — which ' +
			'is exactly where the next lesson picks up. The fail-loud decode ' +
			'paths you wrote mirror sqlite3’s own posture: its record cursor ' +
			'validates header size and serial types up front, because a ' +
			'mis-parsed record does not crash — far worse, it silently returns ' +
			'wrong data. Formats with self-describing sizes make “reject early” ' +
			'cheap; take the offer.</p>',
		],
		complexity: { time: 'O(n) over the record bytes — each byte visited once per pass', space: 'O(n) for the decoded values' },
	});
})();
