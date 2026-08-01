/* Codecs — btypedb: API & Codecs (Easy). A codec defines ONLY the on-disk
 * bytes; in-memory ordering comes from the key type itself. The classic trap
 * this item pins: plain big-endian int64 puts every negative number ABOVE
 * every positive one (the sign bit is the top bit), so an order-preserving
 * encoding must flip that bit. Plus the JSON value codec the README opens
 * with. The harness pins the flipped-sign layout, a full-range ordering
 * sweep under bytes.Compare, round-trips, and tag-named JSON output.
 */
(function () {
	'use strict';
	var T = GoLearnBT;

	// Two byte-orderings of the same keys: plain big-endian misplaces the
	// negatives (sign bit set -> huge unsigned prefix); XOR-ing the sign bit
	// rotates the negative half below the positive half. Marker id
	// namespaced (dgArrowBT01) because every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 200" width="560" height="200" role="img" aria-label="plain big-endian sorts negative int64 keys after positive ones; flipping the sign bit makes byte order equal numeric order">' +
		'<text x="20" y="24" class="lbl">the same keys, two encodings — only one sorts like numbers</text>' +
		// plain big-endian row: negatives land on the right
		'<text x="20" y="56" class="lbl" style="fill:var(--warn)">plain big-endian</text>' +
		'<rect x="160" y="40" width="88" height="26" rx="4" fill="none" stroke="var(--edge)"/><text x="204" y="58" text-anchor="middle">0 = 00…</text>' +
		'<rect x="256" y="40" width="88" height="26" rx="4" fill="none" stroke="var(--edge)"/><text x="300" y="58" text-anchor="middle">+1 = 00…01</text>' +
		'<rect x="352" y="40" width="88" height="26" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/><text x="396" y="58" text-anchor="middle">−1 = ff…</text>' +
		'<text x="452" y="58" class="lbl" style="fill:var(--warn)">← negatives sort LAST</text>' +
		// flipped row: numeric order
		'<text x="20" y="116" class="lbl" style="fill:var(--accent)">sign bit flipped</text>' +
		'<rect x="160" y="100" width="88" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="204" y="118" text-anchor="middle">−1 = 7f…</text>' +
		'<rect x="256" y="100" width="88" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="300" y="118" text-anchor="middle">0 = 80…</text>' +
		'<rect x="352" y="100" width="88" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="396" y="118" text-anchor="middle">+1 = 80…01</text>' +
		'<path d="M 396 70 C 396 86 300 84 232 96" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBT01)"/>' +
		'<text x="20" y="152" class="lbl">u = uint64(k) XOR (1&lt;&lt;63)  — the negative half rotates below the positive half</text>' +
		'<text x="20" y="180" class="lbl">now bytes.Compare(enc(a), enc(b)) agrees with a &lt; b for every pair of int64s</text>' +
		'<defs><marker id="dgArrowBT01" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'kv-codecs',
		title: 'Codecs: How Keys & Values Hit the Disk',
		nav: 'kv codecs',
		difficulty: 'Easy',
		category: 'API & Codecs',
		task: 'Implement an order-preserving int64 key encoding (big-endian, sign bit flipped) and a JSON value codec, with round-trip decoding.',

		prose: [
			'<h2>Codecs: How Keys &amp; Values Hit the Disk</h2>' +
			'<p>A team ships a metrics store keyed by int64 timestamps. It works ' +
			'for months — until someone backfills data from before 1970. Suddenly ' +
			'range scans return the backfilled records <em>after</em> the current ' +
			'ones: negative timestamps encoded as plain big-endian start with a set ' +
			'sign bit, so as raw bytes they compare <em>greater</em> than every ' +
			'positive key. The store didn’t corrupt anything — the encoding just ' +
			'never agreed with the numbers.</p>' +
			'<p>btypedb splits this problem in half. <strong>Ordering lives in ' +
			'memory</strong>: keys are held in a B-tree ordered by the key type’s ' +
			'natural Go ordering (<code>cmp.Ordered</code>), so an ' +
			'<code>int64</code> key always sorts numerically, no matter what the ' +
			'codec does. <strong>Codecs define only the on-disk encoding</strong> — ' +
			'how a key or value becomes bytes in the append-only log and back:</p>',
			{ lang: 'go', code: 'type User struct {\n\tName string `json:"name"`\n\tAge  int    `json:"age"`\n}\n\n// The codec pair says how K and V hit the disk — nothing more.\ndb, err := btypedb.Open("users.db", btypedb.StringCodec, btypedb.JSONCodec[User]())\nif err != nil { /* ... */ }\ndefer db.Close()\n\nerr = db.Set("ada", User{Name: "Ada", Age: 36})\nu, ok := db.Get("ada")\n\n// Built-ins: StringCodec, BytesCodec, Int64Codec, Uint64Codec, JSONCodec[T]()' },
			'<p>Still, an <em>order-preserving</em> byte encoding is worth knowing ' +
			'cold, because plenty of stores (bbolt, LevelDB, FoundationDB) order by ' +
			'raw bytes and nothing else. The recipe for <code>int64</code>:</p>' +
			'<ul>' +
			'<li><strong>Big-endian</strong> — most significant byte first, so the ' +
			'byte-by-byte comparison <code>bytes.Compare</code> does sees the most ' +
			'significant digits first, exactly like comparing numbers by hand.</li>' +
			'<li><strong>Flip the sign bit</strong> — reinterpret as ' +
			'<code>uint64</code> and XOR with <code>1&lt;&lt;63</code>. Negatives ' +
			'(<code>ff…</code> family) become <code>00…7f…</code>, positives shift ' +
			'up into <code>80…ff…</code>: the whole int64 line maps monotonically ' +
			'onto the uint64 line. Zero encodes as <code>80 00 00 00 00 00 00 00</code>.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>Values are easier: they never participate in ordering, so any ' +
			'faithful round-trip works. <code>JSONCodec[T]()</code> is exactly ' +
			'<code>json.Marshal</code>/<code>json.Unmarshal</code> over your struct — ' +
			'self-describing, debuggable with <code>jq</code>, and tolerant of ' +
			'added fields across versions.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>EncodeInt64Key</code> / <code>DecodeInt64Key</code> ' +
			'(8 bytes, big-endian, sign bit flipped; decode rejects any slice that ' +
			'is not exactly 8 bytes) and <code>EncodeUser</code> / ' +
			'<code>DecodeUser</code> via <code>encoding/json</code>. No ' +
			'<code>encoding/binary</code> here — pack the bytes yourself with ' +
			'shifts, it’s four lines and you’ll never forget the layout again.</p>',
		],

		starter: [
			'package main',
			'',
			'// User is the value type the JSON codec carries — the same shape the',
			'// btypedb README opens with. The tags name the JSON fields.',
			'type User struct {',
			'	Name string `json:"name"`',
			'	Age  int    `json:"age"`',
			'}',
			'',
			'// EncodeInt64Key turns k into exactly 8 bytes whose bytes.Compare',
			'// order equals numeric order for every pair of int64s:',
			'//',
			'//   - reinterpret as uint64 and XOR with 1<<63 (flip the sign bit)',
			'//   - lay the result out big-endian (most significant byte first)',
			'func EncodeInt64Key(k int64) []byte {',
			'	// your code here',
			'	return make([]byte, 8)',
			'}',
			'',
			'// DecodeInt64Key reverses EncodeInt64Key. A slice that is not exactly',
			'// 8 bytes is a framing bug upstream — return a non-nil error.',
			'func DecodeInt64Key(b []byte) (int64, error) {',
			'	// your code here',
			'	return 0, nil',
			'}',
			'',
			'// EncodeUser marshals u the way JSONCodec[User]() would.',
			'func EncodeUser(u User) ([]byte, error) {',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
			'// DecodeUser reverses EncodeUser.',
			'func DecodeUser(b []byte) (User, error) {',
			'	// your code here',
			'	return User{}, nil',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"bytes"',
			'	"encoding/json"',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// Spans the whole line: extremes, both signs, zero, a power of two.',
			'	sweep := []int64{-9223372036854775808, -1000000000000, -42, -1, 0, 1, 255, 4611686018427387904, 9223372036854775807}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"EncodeInt64Key(0): sign bit flipped, so zero is 0x80 then zeros",',
			'			"8000000000000000",',
			'			func() string { return fmt.Sprintf("%x", EncodeInt64Key(0)) }},',
			'		{"EncodeInt64Key(-1): negatives land BELOW positives (0x7f prefix, not 0xff)",',
			'			"7fffffffffffffff",',
			'			func() string { return fmt.Sprintf("%x", EncodeInt64Key(-1)) }},',
			'		{"bytes.Compare(enc(-1), enc(1)): byte order must equal numeric order",',
			'			"-1",',
			'			func() string { return fmt.Sprintf("%d", bytes.Compare(EncodeInt64Key(-1), EncodeInt64Key(1))) }},',
			'		{"MinInt64..MaxInt64 sweep stays strictly sorted under bytes.Compare",',
			'			"ordered",',
			'			func() string {',
			'				for i := 0; i+1 < len(sweep); i++ {',
			'					if bytes.Compare(EncodeInt64Key(sweep[i]), EncodeInt64Key(sweep[i+1])) >= 0 {',
			'						return fmt.Sprintf("broken between %d and %d", sweep[i], sweep[i+1])',
			'					}',
			'				}',
			'				return "ordered"',
			'			}},',
			'		{"round-trip: DecodeInt64Key(EncodeInt64Key(k)) == k across the sweep",',
			'			"-9223372036854775808,-1000000000000,-42,-1,0,1,255,4611686018427387904,9223372036854775807",',
			'			func() string {',
			'				out := make([]string, 0, len(sweep))',
			'				for _, k := range sweep {',
			'					v, err := DecodeInt64Key(EncodeInt64Key(k))',
			'					if err != nil {',
			'						return "unexpected error: " + err.Error()',
			'					}',
			'					out = append(out, fmt.Sprintf("%d", v))',
			'				}',
			'				return strings.Join(out, ",")',
			'			}},',
			'		{"DecodeInt64Key rejects a 3-byte slice (framing bug upstream)",',
			'			"error",',
			'			func() string {',
			'				_, err := DecodeInt64Key([]byte{1, 2, 3})',
			'				if err != nil {',
			'					return "error"',
			'				}',
			'				return "no error"',
			'			}},',
			'		{"JSON value codec round-trips User{Ada 36}",',
			'			"Ada/36",',
			'			func() string {',
			'				raw, err := EncodeUser(User{Name: "Ada", Age: 36})',
			'				if err != nil {',
			'					return "encode error: " + err.Error()',
			'				}',
			'				u, err := DecodeUser(raw)',
			'				if err != nil {',
			'					return "decode error: " + err.Error()',
			'				}',
			'				return fmt.Sprintf("%s/%d", u.Name, u.Age)',
			'			}},',
			'		{"the JSON bytes use the tag names — the file stays jq-able",',
			'			`{"name":"Ada","age":36}`,',
			'			func() string {',
			'				raw, _ := EncodeUser(User{Name: "Ada", Age: 36})',
			'				return string(raw)',
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
			'import (',
			'	"encoding/json"',
			'	"errors"',
			')',
			'',
			'// User is the value type the JSON codec carries. The tags name the',
			'// JSON fields, so the on-disk form matches what any other tool',
			'// producing {"name": ..., "age": ...} would write.',
			'type User struct {',
			'	Name string `json:"name"`',
			'	Age  int    `json:"age"`',
			'}',
			'',
			'// EncodeInt64Key: big-endian with the sign bit flipped.',
			'//',
			'// Two\'s-complement stores negatives with the top bit SET, so as raw',
			'// unsigned bytes every negative compares above every positive. XOR',
			'// with 1<<63 is a monotone shift of the whole int64 line onto the',
			'// uint64 line: MinInt64 -> 0, -1 -> 7fff..., 0 -> 8000..., MaxInt64',
			'// -> ffff.... After that, big-endian layout makes bytes.Compare see',
			'// the most significant byte first — numeric order, byte by byte.',
			'func EncodeInt64Key(k int64) []byte {',
			'	u := uint64(k) ^ (uint64(1) << 63)',
			'	out := make([]byte, 8)',
			'	// Hand-rolled big-endian: byte 0 gets the top 8 bits. Writing it',
			'	// with explicit shifts (not encoding/binary) keeps the layout in',
			'	// plain sight — the same shifts every store\'s codec boils down to.',
			'	for i := 0; i < 8; i++ {',
			'		out[i] = byte(u >> (56 - 8*i))',
			'	}',
			'	return out',
			'}',
			'',
			'// DecodeInt64Key reverses the encoding. Length is checked first: a',
			'// wrong-sized key slice means the log framing above us mis-split a',
			'// record, and decoding garbage silently would turn a detectable bug',
			'// into wrong data.',
			'func DecodeInt64Key(b []byte) (int64, error) {',
			'	if len(b) != 8 {',
			'		return 0, errors.New("int64 key must be exactly 8 bytes")',
			'	}',
			'	var u uint64',
			'	for i := 0; i < 8; i++ {',
			'		u = u<<8 | uint64(b[i])',
			'	}',
			'	// Undo the sign-bit flip; XOR is its own inverse.',
			'	return int64(u ^ (uint64(1) << 63)), nil',
			'}',
			'',
			'// EncodeUser is JSONCodec[User]() in miniature: values never take part',
			'// in ordering, so any faithful round-trip is a valid codec. JSON buys',
			'// a self-describing file (debuggable with jq, tolerant of new fields)',
			'// at the cost of size — the classic value-codec trade.',
			'func EncodeUser(u User) ([]byte, error) {',
			'	return json.Marshal(u)',
			'}',
			'',
			'// DecodeUser reverses EncodeUser. json.Unmarshal reports malformed',
			'// bytes as an error — surfaced, never swallowed, because a value that',
			'// fails to decode here means log corruption slipped past the CRC.',
			'func DecodeUser(b []byte) (User, error) {',
			'	var u User',
			'	if err := json.Unmarshal(b, &u); err != nil {',
			'		return User{}, err',
			'	}',
			'	return u, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What the real btypedb does</h3>' +
			'<p>A codec in btypedb is a pair of functions per type — ' +
			'<code>Encode(K) ([]byte, error)</code> and <code>Decode([]byte) (K, ' +
			'error)</code> — passed to <code>Open</code> once and used on every log ' +
			'append and every replay. The built-ins cover the common cases: ' +
			'<code>StringCodec</code> and <code>BytesCodec</code> are identity-ish, ' +
			'<code>Int64Codec</code>/<code>Uint64Codec</code> are fixed 8-byte ' +
			'encodings, and <code>JSONCodec[T]()</code> wraps ' +
			'<code>encoding/json</code> for any struct.</p>' +
			'<p>The interesting design decision is what codecs are <em>not</em> ' +
			'asked to do: preserve order. Because the dataset is memory-resident, ' +
			'the B-tree compares live Go values with the key type’s natural ' +
			'<code>cmp.Ordered</code> ordering — the encoded bytes exist only in ' +
			'the log, which is replayed sequentially and never binary-searched. ' +
			'That is why <code>JSONCodec</code> is acceptable for <em>values</em> ' +
			'and even keys: a disk-resident B-tree (bbolt) or an LSM store ' +
			'(LevelDB, RocksDB) compares raw key bytes on every lookup, so their ' +
			'key encodings must be order-preserving — the sign-flip trick you just ' +
			'implemented is exactly how such stores encode signed integers, and ' +
			'why their tutorials warn you off encoding integer keys as decimal ' +
			'strings (<code>"10" &lt; "9"</code>).</p>' +
			'<h3>Trade-offs</h3>' +
			'<p>Keeping ordering in memory is a real trade, not a free win. The ' +
			'benefit: keys compare at native speed with zero decode cost, and ' +
			'codecs stay trivially simple. The cost: <strong>the whole dataset ' +
			'must fit in RAM</strong> (think BuntDB-with-generics, not bbolt), and ' +
			'every open replays the log through the codecs to rebuild the tree — ' +
			'so codec throughput is startup latency. A slow ' +
			'<code>json.Unmarshal</code> on a hundred million records is a slow ' +
			'boot; that pressure is one reason compaction (a later item) keeps the ' +
			'log minimal.</p>' +
			'<p>One more subtlety worth internalizing: the decode error paths you ' +
			'wrote are load-bearing. During replay, the framing layer (CRC-checked, ' +
			'a later item) decides which bytes are a record; the codec decides ' +
			'whether those bytes are a <em>value</em>. A codec that silently ' +
			'zero-fills on bad input would convert a detectable corruption into ' +
			'quietly wrong data — the worst failure mode a storage engine can ' +
			'have.</p>',
		],
		complexity: { time: 'O(1) per key encode/decode; O(len) for JSON values', space: 'O(1) beyond the output buffer' },
	});
})();
