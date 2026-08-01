/* Varints: 64 Bits in 1–9 Bytes — File Format (Medium). Every length,
 * rowid, and serial type in a SQLite file is a variable-length integer:
 * big-endian base-128, high bit = "more bytes follow" on bytes 1–8, and
 * a ninth byte that contributes all 8 bits so the worst case is 9 bytes,
 * not 10. The harness pins the boundaries (127 → 1 byte, 128 → 2 bytes),
 * the 9-byte worst case, the consumed-byte count, and the trap that a
 * negative integer always costs the full 9 bytes.
 */
(function () {
	'use strict';
	var T = GoLearnSQ;

	// The continuation-bit chain, and the 9th-byte exception that caps the
	// encoding at 9 bytes. Marker id namespaced (dgArrowSQ02) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-label="SQLite varint: bytes 1 through 8 carry 7 payload bits with a continuation high bit; the 9th byte carries all 8 bits, capping the encoding at 9 bytes">' +
		'<text x="20" y="22" class="lbl">big-endian base-128: most-significant 7-bit group first</text>' +
		// byte 1
		'<rect x="20" y="40" width="110" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="75" y="67" text-anchor="middle">1xxxxxxx</text>' +
		'<text x="75" y="100" text-anchor="middle" class="lbl">byte 1: 7 bits</text>' +
		'<path d="M 130 62 L 152 62" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ02)"/>' +
		// middle bytes
		'<rect x="156" y="40" width="110" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="211" y="67" text-anchor="middle">1xxxxxxx</text>' +
		'<text x="211" y="100" text-anchor="middle" class="lbl">… bytes 2–8 …</text>' +
		'<path d="M 266 62 L 288 62" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ02)"/>' +
		// last small byte
		'<rect x="292" y="40" width="100" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="342" y="67" text-anchor="middle">0xxxxxxx</text>' +
		'<text x="342" y="100" text-anchor="middle" class="lbl">high bit 0: stop</text>' +
		// 9th byte
		'<rect x="410" y="40" width="92" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="456" y="67" text-anchor="middle">xxxxxxxx</text>' +
		'<text x="456" y="100" text-anchor="middle" class="lbl" style="fill:var(--warn)">9th: ALL 8 bits</text>' +
		'<text x="20" y="140" class="lbl">8 × 7 bits = 56 bits — not enough for 64. Instead of a 10th byte, the 9th byte</text>' +
		'<text x="20" y="160" class="lbl" style="fill:var(--warn)">has no continuation bit and contributes 8 full bits: 56 + 8 = 64, worst case 9 bytes.</text>' +
		'<text x="20" y="182" class="lbl">a decoder that reads 8 continuation bytes takes the next byte whole, unconditionally</text>' +
		'<defs><marker id="dgArrowSQ02" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'varint-encoding',
		title: 'Varints: 64 Bits in 1–9 Bytes',
		nav: 'varints',
		difficulty: 'Medium',
		category: 'File Format',
		task: 'Implement PutVarint and GetVarint for SQLite\'s big-endian varint: 7 payload bits + continuation high bit on bytes 1–8, all 8 bits on the 9th. GetVarint also reports bytes consumed.',

		prose: [
			'<h2>Varints: 64 Bits in 1–9 Bytes</h2>' +
			'<p>You are walking a B-tree page in a hex editor, trying to find where ' +
			'a record starts. The format doc says each cell begins with “a varint ' +
			'payload length, then a varint rowid” — and until you can read varints ' +
			'by hand, every offset after byte 8 of the page is guesswork. The dump ' +
			'shows <code>81 2c 05 ...</code>: is that a 2-byte length of 300 ' +
			'followed by rowid 5, or three 1-byte fields? The high bits know.</p>' +
			'<p>SQLite’s variable-length integer is <em>not</em> the protobuf ' +
			'varint. It is big-endian (most-significant group first), and it is ' +
			'capped at 9 bytes by a clever exception:</p>' +
			'<ul>' +
			'<li><strong>Bytes 1–8:</strong> each carries 7 payload bits; the high ' +
			'bit set means “more bytes follow”, clear means “this is the last ' +
			'byte”.</li>' +
			'<li><strong>The 9th byte</strong> — reached only after 8 continuation ' +
			'bytes — has no continuation bit: all 8 of its bits are payload. ' +
			'8×7&nbsp;+&nbsp;8 = 64 bits in at most 9 bytes, where protobuf’s ' +
			'little-endian scheme needs 10.</li>' +
			'<li><strong>Big-endian on purpose:</strong> encoded varints sort ' +
			'correctly under plain <code>memcmp</code> for values of equal length, ' +
			'and the whole file format is big-endian — one convention ' +
			'everywhere.</li>' +
			'</ul>',
			{ lang: 'txt', code: 'value        encoding              bytes\n127          7f                    1     (fits in 7 bits, high bit clear)\n128          81 00                 2     (groups 0000001 | 0000000)\n300          82 2c                 2     (groups 0000010 | 0101100)\n2^56 - 1     ff ff ff ff ff ff ff 7f   8 (56 ones: 8 groups of 7)\n2^64 - 1     ff ff ff ff ff ff ff ff ff 9 (the 9th byte carries 8 raw bits)\n\nint64(-1) is stored as its twos-complement uint64 = 2^64 - 1  ->  9 bytes.\nEVERY negative integer costs the full 9 bytes.' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>PutVarint(v uint64) []byte</code> (shortest valid ' +
			'encoding) and <code>GetVarint(b []byte) (uint64, int)</code> — the ' +
			'decoded value and the number of bytes consumed, so a cell parser can ' +
			'advance its cursor. A truncated varint (continuation bit set on the ' +
			'last available byte) returns <code>(0, 0)</code>. The consumed count ' +
			'is not optional garnish: record headers are parsed as ' +
			'<em>consecutive</em> varints, and an off-by-one cursor corrupts every ' +
			'field after it.</p>' +
			'<div class="tip">The last line of the table is why ' +
			'<code>INTEGER PRIMARY KEY</code> beats storing your own signed ids: ' +
			'rowids are varints in every cell, and SQLite hands out small positive ' +
			'ones (1, 2, 3…) that encode in 1–2 bytes. Store <code>-1</code> as a ' +
			'key and each reference to it is 9 bytes, in every cell, in every ' +
			'index.</div>',
		],

		starter: [
			'package main',
			'',
			'// PutVarint encodes v in SQLite\'s big-endian varint format, using',
			'// the SHORTEST valid encoding:',
			'//',
			'//   - values below 2^56: 7-bit groups, most-significant first; the',
			'//     high bit is set on every byte except the last',
			'//   - values with any of the top 8 bits set: exactly 9 bytes — eight',
			'//     continuation bytes carrying v>>8 in 7-bit groups, then a final',
			'//     byte holding the low 8 bits raw (no continuation bit)',
			'func PutVarint(v uint64) []byte {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// GetVarint decodes one varint from the front of b, returning the',
			'// value and the number of bytes consumed (1..9). A truncated varint',
			'// — continuation bit still set when the bytes run out — returns',
			'// (0, 0). Never panic on short input.',
			'func GetVarint(b []byte) (uint64, int) {',
			'	// your code here',
			'	return 0, 0',
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
			'// hex renders an encoding for comparison; decode results are shown as',
			'// "value/consumed" so a wrong cursor advance fails loudly.',
			'func hex(b []byte) string {',
			'	out := ""',
			'	for _, c := range b {',
			'		out += fmt.Sprintf("%02x", c)',
			'	}',
			'	if out == "" {',
			'		return "(nil)"',
			'	}',
			'	return out',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	dec := func(b []byte) string {',
			'		v, n := GetVarint(b)',
			'		return fmt.Sprintf("%d/%d", v, n)',
			'	}',
			'	cases := []tc{',
			'		{"127 fits in 7 bits: one byte, high bit clear",',
			'			"7f",',
			'			func() string { return hex(PutVarint(127)) }},',
			'		{"128 crosses the boundary: two bytes 81 00",',
			'			"8100",',
			'			func() string { return hex(PutVarint(128)) }},',
			'		{"300 — the payload length from the hex-dump hook",',
			'			"822c",',
			'			func() string { return hex(PutVarint(300)) }},',
			'		{"2^56-1 is the largest 8-byte varint: ff x7 then 7f",',
			'			"ffffffffffffff7f",',
			'			func() string { return hex(PutVarint((uint64(1)<<56)-1)) }},',
			'		{"2^56 needs the 9-byte form: the 9th byte is the raw low 8 bits",',
			'			"80c080808080808000",',
			'			func() string { return hex(PutVarint(uint64(1)<<56)) }},',
			'		{"int64(-1) as uint64: the 9-byte worst case, all ff",',
			'			"ffffffffffffffffff",',
			'			func() string { return hex(PutVarint(uint64(18446744073709551615))) }},',
			'		{"decode 8100 with trailing junk: value 128, cursor advances 2",',
			'			"128/2",',
			'			func() string { return dec([]byte{0x81, 0x00, 0xaa, 0xbb}) }},',
			'		{"decode the 9-byte all-ff worst case: full uint64, consumed 9",',
			'			"18446744073709551615/9",',
			'			func() string { return dec([]byte{0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff}) }},',
			'		{"truncated varint (continuation bit on last byte) reports (0, 0)",',
			'			"0/0",',
			'			func() string { return dec([]byte{0x81}) }},',
			'		{"round trip across the byte-length boundaries",',
			'			"ok",',
			'			func() string {',
			'				// One value per encoded length 1..9 plus the boundaries;',
			'				// a decode that disagrees with its encode names itself.',
			'				vals := []uint64{0, 1, 127, 128, 16383, 16384, 1 << 21, 1 << 28,',
			'					1 << 35, 1 << 42, 1 << 49, (uint64(1) << 56) - 1, uint64(1) << 56, uint64(1)<<63 + 42}',
			'				for _, v := range vals {',
			'					enc := PutVarint(v)',
			'					gotV, gotN := GetVarint(enc)',
			'					if gotV != v || gotN != len(enc) {',
			'						return fmt.Sprintf("%d -> %s -> %d/%d", v, hex(enc), gotV, gotN)',
			'					}',
			'				}',
			'				return "ok"',
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
			'// PutVarint encodes v in SQLite\'s big-endian varint format, shortest',
			'// form. Two shapes, chosen by whether the top 8 bits are in play —',
			'// the same split sqlite3PutVarint makes.',
			'func PutVarint(v uint64) []byte {',
			'	// 9-byte form: any of the top 8 bits set means 56 bits of 7-bit',
			'	// groups cannot hold v. The last byte takes the low 8 bits RAW;',
			'	// the remaining 56 bits fill eight continuation bytes exactly.',
			'	// Filling right-to-left avoids a separate reverse pass.',
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
			'	// Short form: peel 7-bit groups from the low end, then emit them',
			'	// most-significant first. The low group is the only one without',
			'	// the continuation bit. Building backwards into a fixed 8-byte',
			'	// scratch keeps this allocation-free until the final copy.',
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
			'			c |= 0x80 // every byte except the last continues',
			'		}',
			'		out = append(out, c)',
			'	}',
			'	return out',
			'}',
			'',
			'// GetVarint decodes one varint from the front of b, returning the',
			'// value and bytes consumed; (0, 0) marks a truncated input.',
			'func GetVarint(b []byte) (uint64, int) {',
			'	var v uint64',
			'	// Up to 8 bytes of 7-bit groups. A clear high bit ends the varint',
			'	// immediately — that early return is what makes 1-byte varints',
			'	// (the overwhelmingly common case in real files) cheap.',
			'	for i := 0; i < 8 && i < len(b); i++ {',
			'		c := b[i]',
			'		if c < 0x80 {',
			'			return v<<7 | uint64(c), i + 1',
			'		}',
			'		v = v<<7 | uint64(c&0x7f)',
			'	}',
			'	// Eight continuation bytes seen: the 9th byte, if present, is',
			'	// taken whole — a shift by 8, not 7. This asymmetry is the entire',
			'	// reason 64 bits fit in 9 bytes.',
			'	if len(b) >= 9 {',
			'		return v<<8 | uint64(b[8]), 9',
			'	}',
			'	// Ran out of bytes with the continuation bit still set. Report',
			'	// zero consumed so a cell parser can refuse to advance rather',
			'	// than silently misread every later field.',
			'	return 0, 0',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why not the protobuf varint?</h3>' +
			'<p>Protobuf’s varint is little-endian (least-significant group first) ' +
			'and tops out at 10 bytes for 64 bits. SQLite’s design differs on both ' +
			'axes, and both differences are deliberate. Big-endian means that two ' +
			'encoded varints of the same length compare correctly with ' +
			'<code>memcmp</code> — handy in a format where keys are compared ' +
			'constantly — and it matches the big-endian convention of every other ' +
			'multi-byte field in the file, so a reader carries one mental model. ' +
			'The 9-byte cap comes from the 9th-byte exception: after eight ' +
			'continuation bytes the decoder has seen 56 bits and knows at most 8 ' +
			'remain, so a continuation bit on the 9th byte would be pure waste. ' +
			'Reclaiming it buys the last 8 bits and a hard upper bound a parser ' +
			'can allocate against.</p>' +
			'<h3>Where varints actually appear</h3>' +
			'<p>Everywhere the format needs a number that is usually small but ' +
			'occasionally huge: cell payload lengths, rowids, the record header ' +
			'size, every serial type code, offsets in overflow chains. The ' +
			'distribution argument is the whole game — in a typical database the ' +
			'vast majority of varints are a single byte (small lengths, small ' +
			'serial types, young rowids), so the format pays 1 byte for fields ' +
			'that a fixed u64 layout would charge 8 for. That is a large slice of ' +
			'why a SQLite file of small rows is dramatically smaller than a naive ' +
			'fixed-width layout of the same data.</p>' +
			'<h3>The negative-number trap, in practice</h3>' +
			'<p>Rowids are signed 64-bit integers stored as varints of their ' +
			'twos-complement bit pattern, so <em>every</em> negative rowid — and ' +
			'every huge one above 2<sup>56</sup> — costs 9 bytes per appearance: ' +
			'in its table cell, and again in every index entry that references ' +
			'it. <code>INTEGER PRIMARY KEY</code> rows inserted normally get ' +
			'rowids 1, 2, 3… that encode in one or two bytes for the first two ' +
			'million rows. You can watch the cost directly: create two tables, ' +
			'one keyed 1..N and one keyed -1..-N, insert identical data, and ' +
			'compare <code>sqlite3_analyzer</code> output or plain page counts — ' +
			'the negative-keyed table is measurably fatter for no informational ' +
			'gain. The general lesson: in any varint-keyed store, key choice is a ' +
			'storage-layout decision, not just a semantic one.</p>',
		],
		complexity: { time: 'O(1) per varint — at most 9 bytes examined', space: 'O(1)' },
	});
})();
