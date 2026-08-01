/* WAL Record Framing — btypedb: Durability (Medium). The atom of the whole
 * durability story: op(1) | klen(4) | vlen(4) | key | val | crc32(4), with
 * a hand-rolled table-driven CRC-32/IEEE guarding everything before it.
 * The harness pins the CRC catalogue check value, an exact byte-for-byte
 * encoding, round-trips (including setttl's deadline-prefixed value),
 * corruption rejection, torn-buffer rejection, and stream decoding via the
 * consumed-bytes count.
 */
(function () {
	'use strict';
	var T = GoLearnBT;

	// The record layout, byte widths to scale-ish, with the CRC's coverage
	// bracket drawn explicitly — the CRC protects every byte before it,
	// header included. Marker id namespaced (dgArrowBT04) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 200" width="560" height="200" role="img" aria-label="log record layout: one op byte, two four-byte big-endian lengths, key bytes, value bytes, then a CRC-32 over everything before it">' +
		'<text x="20" y="24" class="lbl">one framed record — the only structure the log file has</text>' +
		'<rect x="30" y="44" width="50" height="36" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="55" y="67" text-anchor="middle">op</text>' +
		'<rect x="84" y="44" width="80" height="36" rx="4" fill="none" stroke="var(--edge)"/><text x="124" y="67" text-anchor="middle">klen</text>' +
		'<rect x="168" y="44" width="80" height="36" rx="4" fill="none" stroke="var(--edge)"/><text x="208" y="67" text-anchor="middle">vlen</text>' +
		'<rect x="252" y="44" width="100" height="36" rx="4" fill="none" stroke="var(--edge)"/><text x="302" y="67" text-anchor="middle">key</text>' +
		'<rect x="356" y="44" width="100" height="36" rx="4" fill="none" stroke="var(--edge)"/><text x="406" y="67" text-anchor="middle">val</text>' +
		'<rect x="460" y="44" width="70" height="36" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/><text x="495" y="67" text-anchor="middle">crc32</text>' +
		'<text x="55" y="96" text-anchor="middle" class="lbl">1 B</text>' +
		'<text x="124" y="96" text-anchor="middle" class="lbl">4 B BE</text>' +
		'<text x="208" y="96" text-anchor="middle" class="lbl">4 B BE</text>' +
		'<text x="302" y="96" text-anchor="middle" class="lbl">klen bytes</text>' +
		'<text x="406" y="96" text-anchor="middle" class="lbl">vlen bytes</text>' +
		'<text x="495" y="96" text-anchor="middle" class="lbl">4 B BE</text>' +
		// CRC coverage bracket
		'<path d="M 30 116 L 30 128 L 456 128 L 456 116" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<path d="M 456 128 L 480 128 L 480 88" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowBT04)"/>' +
		'<text x="243" y="146" text-anchor="middle" class="lbl" style="fill:var(--warn)">CRC-32/IEEE over every byte before it — header AND payload</text>' +
		'<text x="20" y="174" class="lbl">ops: set=1 · delete=2 · batch=3 (val = uint64 count) · setttl=4 (val starts with 8-byte unix-nano deadline)</text>' +
		'<text x="20" y="192" class="lbl">a flipped bit anywhere inside the frame changes the CRC — corruption cannot masquerade as data</text>' +
		'<defs><marker id="dgArrowBT04" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'wal-record-framing',
		title: 'The Log Record: op|klen|vlen|key|val|crc',
		nav: 'wal record framing',
		difficulty: 'Medium',
		category: 'Durability',
		task: 'Implement EncodeRecord/DecodeRecord for the framed log record — hand-rolled big-endian lengths and a table-driven CRC-32/IEEE that rejects corruption.',

		prose: [
			'<h2>The Log Record: op|klen|vlen|key|val|crc</h2>' +
			'<p>A power cut mid-write leaves a file ending in half a record. A ' +
			'failing disk flips one bit in a record written months ago. Both files ' +
			'<em>open fine</em> — bytes are just bytes. The only reason a storage ' +
			'engine can tell good data from garbage is that it drew frames around ' +
			'its bytes and made each frame prove itself. btypedb’s append-only log ' +
			'is nothing but a run of these frames:</p>',
			{ lang: 'txt', code: 'op(1) | klen(4) | vlen(4) | key | val | crc32(4)\n\nops: set(1)  delete(2)  batch(3)  setttl(4)\n     batch:  val = uint64 count — "the next N records are one transaction"\n     setttl: val = 8-byte unix-nano deadline, then the value bytes' },
			'<p>Every choice in that line earns its place:</p>' +
			'<ul>' +
			'<li><strong>Lengths, not delimiters.</strong> Keys and values are ' +
			'arbitrary bytes, so no separator byte is safe. Two big-endian ' +
			'<code>uint32</code> lengths make the frame self-describing: a reader ' +
			'knows exactly where the record ends before trusting a byte of it.</li>' +
			'<li><strong>The CRC covers everything before it</strong> — op and ' +
			'lengths included, not just the payload. A flipped bit in ' +
			'<code>klen</code> would otherwise send the reader marching into the ' +
			'middle of the next record with a straight face.</li>' +
			'<li><strong>CRC-32/IEEE</strong> is the workhorse frame check of ' +
			'Ethernet, gzip and PNG. The table-driven form is ten lines: build a ' +
			'256-entry table from the reflected polynomial <code>0xEDB88320</code>, ' +
			'then fold one byte per step. Start from <code>0xFFFFFFFF</code>, ' +
			'complement at the end — the catalogue check value is ' +
			'<code>crc("123456789") == 0xCBF43926</code>, and your first test pins ' +
			'exactly that.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Big-endian helpers (<code>appendU32</code>/<code>readU32</code>/' +
			'<code>appendU64</code>/<code>readU64</code>) are given. Implement:</p>' +
			'<ul>' +
			'<li><code>crc32IEEE(data)</code> — table-driven, poly ' +
			'<code>0xEDB88320</code> reflected.</li>' +
			'<li><code>EncodeRecord(r)</code> — frame the record, then append the ' +
			'CRC of everything so far.</li>' +
			'<li><code>DecodeRecord(buf)</code> — decode the <em>first</em> record ' +
			'in <code>buf</code>, returning the record, the byte count consumed, ' +
			'and an error for a short header, a torn body, or a CRC mismatch. ' +
			'Errors are values here — a corrupt log must never panic the ' +
			'engine.</li>' +
			'</ul>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// The four record ops, exactly as the log format defines them.',
			'const (',
			'	OpSet    = byte(1)',
			'	OpDelete = byte(2)',
			'	OpBatch  = byte(3) // val = uint64 count of records in the batch',
			'	OpSetTTL = byte(4) // val = 8-byte unix-nano deadline, then value bytes',
			')',
			'',
			'// Record is one framed log entry, payload still raw bytes.',
			'type Record struct {',
			'	Op  byte',
			'	Key []byte',
			'	Val []byte',
			'}',
			'',
			'// Big-endian helpers — given, complete. Most significant byte first.',
			'func appendU32(dst []byte, v uint32) []byte {',
			'	return append(dst, byte(v>>24), byte(v>>16), byte(v>>8), byte(v))',
			'}',
			'',
			'func readU32(b []byte) uint32 {',
			'	return uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])',
			'}',
			'',
			'func appendU64(dst []byte, v uint64) []byte {',
			'	dst = appendU32(dst, uint32(v>>32))',
			'	return appendU32(dst, uint32(v))',
			'}',
			'',
			'func readU64(b []byte) uint64 {',
			'	return uint64(readU32(b))<<32 | uint64(readU32(b[4:]))',
			'}',
			'',
			'// crc32IEEE computes CRC-32/IEEE (the Ethernet/gzip/PNG polynomial):',
			'// table-driven, reflected poly 0xEDB88320, init 0xFFFFFFFF, final',
			'// complement. Check value: crc32IEEE([]byte("123456789")) == 0xCBF43926.',
			'func crc32IEEE(data []byte) uint32 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// EncodeRecord frames r as op | klen | vlen | key | val | crc32,',
			'// where the CRC covers every byte before it.',
			'func EncodeRecord(r Record) []byte {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// DecodeRecord decodes the FIRST record in buf, returning the record,',
			'// the number of bytes it consumed, and an error if the buffer is too',
			'// short for the frame (torn) or the CRC does not match (corrupt).',
			'func DecodeRecord(buf []byte) (Record, int, error) {',
			'	// your code here',
			'	return Record{}, 0, errors.New("not implemented")',
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
			'		{"CRC-32/IEEE catalogue check: crc(\\"123456789\\")",',
			'			"cbf43926",',
			'			func() string { return fmt.Sprintf("%08x", crc32IEEE([]byte("123456789"))) }},',
			'		{"crc of empty input is 0 (init and final complement cancel)",',
			'			"00000000",',
			'			func() string { return fmt.Sprintf("%08x", crc32IEEE(nil)) }},',
			'		{"EncodeRecord set a=1 — exact bytes: op, BE lengths, payload, crc",',
			'			"010000000100000001613120845573",',
			'			func() string { return fmt.Sprintf("%x", EncodeRecord(Record{Op: OpSet, Key: []byte("a"), Val: []byte("1")})) }},',
			'		{"frame overhead is 13 bytes: len == 13 + klen + vlen",',
			'			"26",',
			'			func() string {',
			'				enc := EncodeRecord(Record{Op: OpSet, Key: []byte("ada"), Val: []byte(`{"age":36}`)})',
			'				return fmt.Sprintf("%d", len(enc))',
			'			}},',
			'		{"round-trip: decode(encode(set ada)) returns the record and consumed count",',
			'			`op=1 key=ada val={"age":36} n=26`,',
			'			func() string {',
			'				enc := EncodeRecord(Record{Op: OpSet, Key: []byte("ada"), Val: []byte(`{"age":36}`)})',
			'				r, n, err := DecodeRecord(enc)',
			'				if err != nil {',
			'					return "error: " + err.Error()',
			'				}',
			'				return fmt.Sprintf("op=%d key=%s val=%s n=%d", r.Op, r.Key, r.Val, n)',
			'			}},',
			'		{"delete records carry no value: vlen 0 round-trips",',
			'			"op=2 key=ada vlen=0 n=16",',
			'			func() string {',
			'				enc := EncodeRecord(Record{Op: OpDelete, Key: []byte("ada")})',
			'				r, n, err := DecodeRecord(enc)',
			'				if err != nil {',
			'					return "error: " + err.Error()',
			'				}',
			'				return fmt.Sprintf("op=%d key=%s vlen=%d n=%d", r.Op, r.Key, len(r.Val), n)',
			'			}},',
			'		{"setttl: the deadline rides as an 8-byte prefix inside the value bytes",',
			'			"deadline=1700000030000000000 payload=tok",',
			'			func() string {',
			'				val := appendU64(nil, 1700000030000000000)',
			'				val = append(val, []byte("tok")...)',
			'				enc := EncodeRecord(Record{Op: OpSetTTL, Key: []byte("s:1"), Val: val})',
			'				r, _, err := DecodeRecord(enc)',
			'				if err != nil {',
			'					return "error: " + err.Error()',
			'				}',
			'				return fmt.Sprintf("deadline=%d payload=%s", readU64(r.Val[:8]), r.Val[8:])',
			'			}},',
			'		{"one flipped payload byte: DecodeRecord must reject by CRC",',
			'			"error",',
			'			func() string {',
			'				enc := EncodeRecord(Record{Op: OpSet, Key: []byte("ada"), Val: []byte(`{"age":36}`)})',
			'				if len(enc) < 15 {',
			'					return "encode too short"',
			'				}',
			'				enc[10] ^= 0x01',
			'				_, _, err := DecodeRecord(enc)',
			'				if err != nil {',
			'					return "error"',
			'				}',
			'				return "accepted corrupt record"',
			'			}},',
			'		{"torn record (last 3 bytes missing): rejected, nothing consumed",',
			'			"error n=0",',
			'			func() string {',
			'				enc := EncodeRecord(Record{Op: OpSet, Key: []byte("ada"), Val: []byte(`{"age":36}`)})',
			'				if len(enc) < 4 {',
			'					return "encode too short"',
			'				}',
			'				_, n, err := DecodeRecord(enc[:len(enc)-3])',
			'				if err != nil {',
			'					return fmt.Sprintf("error n=%d", n)',
			'				}',
			'				return "accepted torn record"',
			'			}},',
			'		{"stream decode: two records back-to-back, advanced by consumed count",',
			'			"a=1;b=2 end=30",',
			'			func() string {',
			'				log := EncodeRecord(Record{Op: OpSet, Key: []byte("a"), Val: []byte("1")})',
			'				log = append(log, EncodeRecord(Record{Op: OpSet, Key: []byte("b"), Val: []byte("2")})...)',
			'				out := ""',
			'				off := 0',
			'				for off < len(log) {',
			'					r, n, err := DecodeRecord(log[off:])',
			'					if err != nil {',
			'						return "error at offset " + fmt.Sprint(off)',
			'					}',
			'					if out != "" {',
			'						out += ";"',
			'					}',
			'					out += fmt.Sprintf("%s=%s", r.Key, r.Val)',
			'					off += n',
			'				}',
			'				return fmt.Sprintf("%s end=%d", out, off)',
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
			'// The four record ops, exactly as the log format defines them.',
			'const (',
			'	OpSet    = byte(1)',
			'	OpDelete = byte(2)',
			'	OpBatch  = byte(3) // val = uint64 count of records in the batch',
			'	OpSetTTL = byte(4) // val = 8-byte unix-nano deadline, then value bytes',
			')',
			'',
			'// Record is one framed log entry, payload still raw bytes.',
			'type Record struct {',
			'	Op  byte',
			'	Key []byte',
			'	Val []byte',
			'}',
			'',
			'// Big-endian helpers: most significant byte first, so a hex dump of',
			'// the log reads like the format spec.',
			'func appendU32(dst []byte, v uint32) []byte {',
			'	return append(dst, byte(v>>24), byte(v>>16), byte(v>>8), byte(v))',
			'}',
			'',
			'func readU32(b []byte) uint32 {',
			'	return uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])',
			'}',
			'',
			'func appendU64(dst []byte, v uint64) []byte {',
			'	dst = appendU32(dst, uint32(v>>32))',
			'	return appendU32(dst, uint32(v))',
			'}',
			'',
			'func readU64(b []byte) uint64 {',
			'	return uint64(readU32(b))<<32 | uint64(readU32(b[4:]))',
			'}',
			'',
			'// crcTable is built once at package init. Entry i answers: if the low',
			'// byte of the running CRC is i, what does dividing that byte out of',
			'// the polynomial do to the register? Precomputing all 256 answers',
			'// turns 8 conditional shifts per byte into one table lookup.',
			'var crcTable = makeCRCTable()',
			'',
			'func makeCRCTable() [256]uint32 {',
			'	var t [256]uint32',
			'	for i := 0; i < 256; i++ {',
			'		c := uint32(i)',
			'		// Reflected form: bits shift RIGHT and the reversed polynomial',
			'		// 0xEDB88320 is XORed in when the low bit falls out. This is',
			'		// the same bit-order convention Ethernet, gzip and PNG use.',
			'		for j := 0; j < 8; j++ {',
			'			if c&1 == 1 {',
			'				c = 0xEDB88320 ^ (c >> 1)',
			'			} else {',
			'				c >>= 1',
			'			}',
			'		}',
			'		t[i] = c',
			'	}',
			'	return t',
			'}',
			'',
			'// crc32IEEE: init all-ones, fold a byte per step, complement at the',
			'// end. The all-ones init means leading zero bytes still change the',
			'// CRC — a zero-initialized register would pass right over them.',
			'func crc32IEEE(data []byte) uint32 {',
			'	crc := ^uint32(0)',
			'	for _, b := range data {',
			'		crc = crcTable[byte(crc)^b] ^ (crc >> 8)',
			'	}',
			'	return ^crc',
			'}',
			'',
			'// EncodeRecord frames r and seals it. The CRC is computed over the',
			'// COMPLETE frame so far — op and lengths included — because a',
			'// corrupted length field is more dangerous than a corrupted payload:',
			'// it desynchronizes every frame after it.',
			'func EncodeRecord(r Record) []byte {',
			'	out := make([]byte, 0, 13+len(r.Key)+len(r.Val))',
			'	out = append(out, r.Op)',
			'	out = appendU32(out, uint32(len(r.Key)))',
			'	out = appendU32(out, uint32(len(r.Val)))',
			'	out = append(out, r.Key...)',
			'	out = append(out, r.Val...)',
			'	return appendU32(out, crc32IEEE(out))',
			'}',
			'',
			'// DecodeRecord validates before it trusts, in dependency order:',
			'// enough bytes for the header, then (using the lengths) enough for',
			'// the whole frame, then the CRC over everything before the CRC',
			'// field. Only after all three does it slice out key and val. The',
			'// consumed count lets a caller walk a stream of frames.',
			'func DecodeRecord(buf []byte) (Record, int, error) {',
			'	if len(buf) < 9 {',
			'		return Record{}, 0, errors.New("torn record: short header")',
			'	}',
			'	klen := int(readU32(buf[1:5]))',
			'	vlen := int(readU32(buf[5:9]))',
			'	need := 9 + klen + vlen + 4',
			'	if len(buf) < need {',
			'		return Record{}, 0, errors.New("torn record: short body")',
			'	}',
			'	body := buf[:need-4]',
			'	if readU32(buf[need-4:need]) != crc32IEEE(body) {',
			'		return Record{}, 0, errors.New("crc mismatch: corrupt record")',
			'	}',
			'	// Copy the payload slices: the frame buffer may be a window into',
			'	// a larger log that the caller will reuse or truncate.',
			'	key := make([]byte, klen)',
			'	copy(key, buf[9:9+klen])',
			'	val := make([]byte, vlen)',
			'	copy(val, buf[9+klen:9+klen+vlen])',
			'	return Record{Op: buf[0], Key: key, Val: val}, need, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What the real btypedb does</h3>' +
			'<p>This frame is byte-for-byte the format in btypedb’s log: every ' +
			'<code>Set</code> appends one <code>set</code> record, every ' +
			'<code>Delete</code> a <code>delete</code>, a multi-op transaction a ' +
			'<code>batch</code> header (val = uint64 count) followed by its N ' +
			'records, and <code>SetTTL</code> a record whose value bytes start ' +
			'with the absolute deadline — which is why TTLs survive restarts. ' +
			'What the engine adds around your two functions is the durability ' +
			'discipline: the frame is appended, then (under <code>SyncAlways</code>, ' +
			'the default) <strong>fsynced before the write is acknowledged</strong>. ' +
			'Under load, concurrent committers share fsyncs — <em>group ' +
			'commit</em> — so one disk flush releases every writer queued behind ' +
			'it; the one visible consequence is that a committed write becomes ' +
			'readable a moment before its fsync lands, a window btypedb’s ' +
			'power-loss harness cuts power inside on purpose.</p>' +
			'<p>Notice what the frame does <em>not</em> contain: no sequence ' +
			'number, no timestamp, no file offset. Position in the file ' +
			'<em>is</em> the ordering, and the CRC plus lengths are enough to ' +
			'detect every failure replay cares about. This minimalism is common — ' +
			'LevelDB’s WAL block format and PostgreSQL’s XLOG records are the same ' +
			'idea with paging added — because every byte of frame overhead is ' +
			'paid on every write forever.</p>' +
			'<h3>Trade-offs</h3>' +
			'<p>A CRC-32 detects corruption; it does not correct it, and it is not ' +
			'cryptographic — an attacker can forge a matching CRC trivially. ' +
			'That is the right tool here: the threat model is bit rot and torn ' +
			'writes, not adversaries, and CRC-32 catches all burst errors up to ' +
			'32 bits and random corruption with probability 1 − 2⁻³². Engines ' +
			'that need tamper evidence (or cross-machine replication integrity) ' +
			'layer a keyed hash on top; paying SHA-256 per record for a local WAL ' +
			'would be pure overhead.</p>' +
			'<p>The decode order you implemented — lengths before body, CRC ' +
			'before trust — is the part worth carrying to other systems. Parsers ' +
			'that validate <em>after</em> allocating (<code>make([]byte, ' +
			'klen)</code> straight from a corrupt length field) turn one flipped ' +
			'bit into a multi-gigabyte allocation; real-world CVE lists are full ' +
			'of exactly this. Frame first, verify second, trust last.</p>',
		],
		complexity: { time: 'O(len) per record — one CRC pass over the frame', space: 'O(len) for the encoded frame / decoded payload copies' },
	});
})();
