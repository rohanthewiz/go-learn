/* Tuple Encoding — Inside the Engine (Medium). The order-preserving key
 * encoding that lets a relational layer live on an ordered KV store: for any
 * two keys, bytes.Compare(enc(a), enc(b)) must equal the semantic compare.
 * The harness pins the sign-boundary flip, 9-vs-10, the composite prefix
 * trap, a full property sweep over a pinned value list, and a closing
 * cross-check against the real bytdb/tuple package's ordering.
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// The 9-vs-10 disaster: keys spelled as decimal strings sort by digits,
	// keys spelled as flipped-sign big-endian sort by value. Marker id
	// namespaced (dgArrowDBTE) — every track's SVGs share one id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 600 232" width="600" height="232" role="img" aria-label="the same four row ids: as decimal strings they sort 1, 10, 2, 9; as flipped-sign big-endian bytes they sort 1, 2, 9, 10">' +
		'<text x="20" y="24" class="lbl">the same four row ids, two ways to spell the key — the store just memcmps bytes</text>' +
		// left: decimal-string keys, digit order
		'<rect x="40" y="40" width="220" height="132" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="150" y="60" text-anchor="middle" class="lbl">fmt.Sprint(id) — digits</text>' +
		'<text x="60" y="84" style="font-family:monospace">&quot;1&quot;</text>' +
		'<text x="60" y="106" style="font-family:monospace" fill="var(--err-fg)">&quot;10&quot;</text>' +
		'<text x="112" y="106" class="lbl" style="fill:var(--err-fg)">← sorts before &quot;9&quot;</text>' +
		'<text x="60" y="128" style="font-family:monospace">&quot;2&quot;</text>' +
		'<text x="60" y="150" style="font-family:monospace">&quot;9&quot;</text>' +
		// right: flipped-sign big-endian, numeric order
		'<rect x="340" y="40" width="220" height="132" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="450" y="60" text-anchor="middle" class="lbl">flipped-sign big-endian</text>' +
		'<text x="360" y="84" style="font-family:monospace">80&#8230;01</text>' +
		'<text x="440" y="84" class="lbl">(1)</text>' +
		'<text x="360" y="106" style="font-family:monospace">80&#8230;02</text>' +
		'<text x="440" y="106" class="lbl">(2)</text>' +
		'<text x="360" y="128" style="font-family:monospace">80&#8230;09</text>' +
		'<text x="440" y="128" class="lbl">(9)</text>' +
		'<text x="360" y="150" style="font-family:monospace">80&#8230;0a</text>' +
		'<text x="440" y="150" class="lbl">(10)</text>' +
		// the fix
		'<path d="M 264 106 L 334 106" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDBTE)"/>' +
		'<text x="300" y="96" text-anchor="middle" class="lbl" style="fill:var(--accent)">encode</text>' +
		'<text x="20" y="196" class="lbl">bytes.Compare on the right column == numeric order — sorted also across the sign:</text>' +
		'<text x="20" y="216" class="lbl" style="font-family:monospace">7f&#8230;ff (-1) &lt; 80&#8230;00 (0) &lt; 80&#8230;01 (1)</text>' +
		'<defs><marker id="dgArrowDBTE" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'tuple-encoding',
		title: 'Order-Preserving Tuple Encoding',
		nav: 'tuple encoding',
		difficulty: 'Medium',
		category: 'Inside the Engine',
		task: 'Implement EncodeInt (big-endian, sign bit flipped), EncodeString (0x00-terminated), and EncodeKey so that bytes.Compare on encodings equals semantic order — verified against the real bytdb/tuple package.',

		prose: [
			'<h2>Order-Preserving Tuple Encoding</h2>' +
			'<p>bytdb, like CockroachDB, is a relational layer sitting on an ' +
			'ordered key-value store. The storage engine underneath knows ' +
			'nothing about tables or types — it stores byte strings sorted by ' +
			'<code>bytes.Compare</code> and answers range scans over them. Every ' +
			'SQL feature that involves order rides on that one primitive: ' +
			'<code>WHERE id BETWEEN 100 AND 200</code> is a key-range scan, ' +
			'<code>ORDER BY</code> can be a scan instead of a sort, an index is ' +
			'just more keys. Which means the encoding of a key carries the whole ' +
			'load: <strong>for any two values, byte order of the encodings must ' +
			'equal semantic order of the values</strong>. Get it wrong and the ' +
			'engine is still perfectly happy — it just quietly returns row 10 ' +
			'before row 9, and range scans miss rows they should have found.</p>' +
			'<ul>' +
			'<li><strong>Integers.</strong> Decimal strings fail instantly ' +
			'(<code>&quot;10&quot; &lt; &quot;9&quot;</code>). Raw big-endian ' +
			'two&#8217;s-complement fixes the magnitudes but breaks at the sign: ' +
			'<code>-1</code> is <code>ff&#8230;ff</code>, which memcmps ' +
			'<em>above</em> every positive number. The fix is one XOR: ' +
			'<strong>flip the sign bit</strong>. That maps ' +
			'<code>MinInt64&#8594;00&#8230;00</code>, <code>0&#8594;80&#8230;00</code>, ' +
			'<code>MaxInt64&#8594;ff&#8230;ff</code> — byte order now equals ' +
			'numeric order across the entire range.</li>' +
			'<li><strong>Strings in composite keys.</strong> Concatenating raw ' +
			'bytes destroys the boundary: <code>(&quot;ab&quot;,&quot;c&quot;)</code> ' +
			'and <code>(&quot;a&quot;,&quot;bc&quot;)</code> both flatten to ' +
			'<code>abc</code>. Terminate each string with <code>0x00</code>: now ' +
			'<code>(&quot;a&quot;,&#8230;)</code> keys share the prefix ' +
			'<code>61 00</code> and sort together, before every ' +
			'<code>(&quot;ab&quot;,&#8230;)</code> key — and a string that is a ' +
			'prefix of another sorts first, matching Go&#8217;s own string ' +
			'order.</li>' +
			'<li><strong>Composite keys.</strong> Because each element&#8217;s ' +
			'encoding is self-delimiting (fixed 8 bytes for ints, ' +
			'terminator for strings), a tuple key is plain concatenation — and ' +
			'comparing two concatenations compares element by element, exactly ' +
			'like SQL compares a multi-column key.</li>' +
			'</ul>' +
			DIAGRAM +
			'<div class="tip">Real encodings must also survive strings that ' +
			'<em>contain</em> <code>0x00</code>: the terminator would be spoofed. ' +
			'The production scheme escapes embedded zeros — bytdb&#8217;s ' +
			'<code>tuple</code> package rewrites <code>0x00</code> as ' +
			'<code>0x00 0xFF</code> and terminates with <code>0x00 0x01</code>, ' +
			'so the terminator still sorts below any escaped continuation. Here ' +
			'the inputs are declared NUL-free so a bare <code>0x00</code> ' +
			'terminator is correct — but know the escape exists before you ship ' +
			'one of these.</div>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>EncodeInt</code>, <code>EncodeString</code>, and ' +
			'<code>EncodeKey</code>. No <code>encoding/binary</code> here — pack ' +
			'the eight bytes yourself with shifts. The final test compares your ' +
			'ordering against the real <code>bytdb/tuple</code> package on every ' +
			'pair of a pinned tuple list.</p>',
			{ lang: 'txt', code: 'EncodeInt(9)  = 80 00 00 00 00 00 00 09\nEncodeInt(10) = 80 00 00 00 00 00 00 0a   -> 9 < 10 in byte order\nEncodeInt(-1) = 7f ff ff ff ff ff ff ff   -> below every non-negative\n\nEncodeKey(EncodeString("ab"), EncodeString("c")) = 61 62 00 63 00\nEncodeKey(EncodeString("a"), EncodeString("bc")) = 61 00 62 63 00\n                                                       ^^ terminator keeps ("a",...) first' },
		],

		starter: [
			'package main',
			'',
			'// EncodeInt encodes v as exactly 8 bytes such that for ANY two ints,',
			'// bytes.Compare(EncodeInt(a), EncodeInt(b)) equals their numeric order.',
			'//',
			'//   - big-endian: most significant byte first (that is what makes',
			'//     memcmp see the big digits first)',
			'//   - flip the sign bit: u := uint64(v) ^ (1 << 63) — this slides',
			'//     the negatives below the positives in unsigned byte order',
			'//   - no encoding/binary in this environment: pack the bytes with',
			'//     shifts (byte(u >> 56), byte(u >> 48), ...)',
			'func EncodeInt(v int64) []byte {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// EncodeString encodes s for use inside a composite key: the raw',
			'// bytes followed by a 0x00 terminator. The terminator is what keeps',
			'// element boundaries comparable — ("a","bc") vs ("ab","c") must NOT',
			'// collide. Inputs are guaranteed NUL-free (see the note in the prose',
			'// for how real encoders escape embedded zeros).',
			'func EncodeString(s string) []byte {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// EncodeKey concatenates already-encoded parts into one composite',
			'// key. Concatenation is sufficient BECAUSE each part is',
			'// self-delimiting: ints are fixed-width, strings are terminated.',
			'func EncodeKey(parts ...[]byte) []byte {',
			'	// your code here',
			'	return nil',
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
			'	"math"',
			'',
			'	"github.com/rohanthewiz/bytdb/tuple"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'// sgn collapses a comparison result to -1/0/1 so byte order and',
			'// semantic order can be compared as plain ints.',
			'func sgn(x int) int {',
			'	if x < 0 {',
			'		return -1',
			'	}',
			'	if x > 0 {',
			'		return 1',
			'	}',
			'	return 0',
			'}',
			'',
			'// cmpInt is the semantic order the encoding must reproduce.',
			'func cmpInt(a, b int64) int {',
			'	if a < b {',
			'		return -1',
			'	}',
			'	if a > b {',
			'		return 1',
			'	}',
			'	return 0',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"EncodeInt(0): the flipped sign bit puts zero dead center — 0x80 then zeros",',
			'			"8000000000000000",',
			'			func() string { return fmt.Sprintf("%x", EncodeInt(0)) }},',
			'		{"EncodeInt(-1) vs EncodeInt(0): raw two\'s-complement would put -1 LAST (ff...ff); flipped, it lands just below zero",',
			'			"-1",',
			'			func() string { return fmt.Sprintf("%d", sgn(bytes.Compare(EncodeInt(-1), EncodeInt(0)))) }},',
			'		{"the whole sign boundary: MinInt64 < -1 < 0 < 1 < MaxInt64 in byte order",',
			'			"ordered",',
			'			func() string {',
			'				ladder := []int64{math.MinInt64, -1, 0, 1, math.MaxInt64}',
			'				for i := 0; i+1 < len(ladder); i++ {',
			'					c := sgn(bytes.Compare(EncodeInt(ladder[i]), EncodeInt(ladder[i+1])))',
			'					if c != -1 {',
			'						return fmt.Sprintf("enc(%d) vs enc(%d): byte order %d, want -1", ladder[i], ladder[i+1], c)',
			'					}',
			'				}',
			'				return "ordered"',
			'			}},',
			'		{"9 vs 10: the bug decimal-string keys ship — fixed by encoding numbers, not digits",',
			'			"-1",',
			'			func() string { return fmt.Sprintf("%d", sgn(bytes.Compare(EncodeInt(9), EncodeInt(10)))) }},',
			'		{"EncodeString terminator: a prefix sorts first — \\"a\\" < \\"ab\\"",',
			'			"-1",',
			'			func() string { return fmt.Sprintf("%d", sgn(bytes.Compare(EncodeString("a"), EncodeString("ab")))) }},',
			'		{"composite prefix trap: (\\"ab\\",\\"c\\") vs (\\"a\\",\\"bc\\") — unterminated, both flatten to \\"abc\\"; terminated, first component decides",',
			'			"1",',
			'			func() string {',
			'				kAbC := EncodeKey(EncodeString("ab"), EncodeString("c"))',
			'				kABc := EncodeKey(EncodeString("a"), EncodeString("bc"))',
			'				return fmt.Sprintf("%d", sgn(bytes.Compare(kAbC, kABc)))',
			'			}},',
			'		{"EncodeKey(EncodeInt(42), EncodeString(\\"go\\")): exact composite bytes",',
			'			"800000000000002a676f00",',
			'			func() string { return fmt.Sprintf("%x", EncodeKey(EncodeInt(42), EncodeString("go"))) }},',
			'		{"property sweep: bytes.Compare(enc(a), enc(b)) == numeric order for ALL pairs of a pinned value list",',
			'			"all 256 pairs agree",',
			'			func() string {',
			'				vals := []int64{math.MinInt64, -4000000000, -65536, -256, -10, -9, -2, -1, 0, 1, 2, 9, 10, 255, 4000000000, math.MaxInt64}',
			'				for i := 0; i < len(vals); i++ {',
			'					for j := 0; j < len(vals); j++ {',
			'						byteOrd := sgn(bytes.Compare(EncodeInt(vals[i]), EncodeInt(vals[j])))',
			'						numOrd := cmpInt(vals[i], vals[j])',
			'						if byteOrd != numOrd {',
			'							return fmt.Sprintf("enc(%d) vs enc(%d): byte order %d, numeric order %d", vals[i], vals[j], byteOrd, numOrd)',
			'						}',
			'					}',
			'				}',
			'				return "all 256 pairs agree"',
			'			}},',
			'		{"cross-check: (int, string) composite keys order exactly as the real bytdb/tuple package orders the tuples",',
			'			"agrees with bytdb/tuple on all 64 pairs",',
			'			func() string {',
			'				type kv struct {',
			'					n int64',
			'					s string',
			'				}',
			'				// 9-vs-10 both ways, the prefix pair, negatives, and',
			'				// an empty string — the corners that break naive schemes.',
			'				tuples := []kv{{7, "a"}, {7, "ab"}, {-7, "zzz"}, {0, ""}, {9, "10"}, {10, "9"}, {100, "a"}, {-1, "b"}}',
			'				for i := 0; i < len(tuples); i++ {',
			'					for j := 0; j < len(tuples); j++ {',
			'						a := tuples[i]',
			'						b := tuples[j]',
			'						mine := sgn(bytes.Compare(',
			'							EncodeKey(EncodeInt(a.n), EncodeString(a.s)),',
			'							EncodeKey(EncodeInt(b.n), EncodeString(b.s))))',
			'						ref := sgn(tuple.Compare([]any{a.n, a.s}, []any{b.n, b.s}))',
			'						if mine != ref {',
			'							return fmt.Sprintf("(%d,%q) vs (%d,%q): your byte order %d, tuple.Compare %d", a.n, a.s, b.n, b.s, mine, ref)',
			'						}',
			'					}',
			'				}',
			'				return "agrees with bytdb/tuple on all 64 pairs"',
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
			'// EncodeInt maps int64 order onto unsigned byte order with a single',
			'// XOR. The insight: two\'s-complement is ALREADY correctly ordered',
			'// within each sign — the only defect is that the sign bit is',
			'// backwards (1 means small, 0 means large). Flipping bit 63 fixes',
			'// exactly that defect and nothing else:',
			'//',
			'//	MinInt64  ->  00 00 00 00 00 00 00 00   (lowest key)',
			'//	-1        ->  7f ff ff ff ff ff ff ff',
			'//	0         ->  80 00 00 00 00 00 00 00',
			'//	MaxInt64  ->  ff ff ff ff ff ff ff ff   (highest key)',
			'//',
			'// Big-endian byte order matters just as much: memcmp reads left to',
			'// right, so the most significant byte must come first.',
			'func EncodeInt(v int64) []byte {',
			'	u := uint64(v) ^ (1 << 63)',
			'	key := make([]byte, 8)',
			'	// Manual big-endian pack (no encoding/binary here). Shift the',
			'	// wanted byte down to the low 8 bits; byte() truncates the rest.',
			'	for i := 0; i < 8; i++ {',
			'		key[i] = byte(u >> uint(56-8*i))',
			'	}',
			'	return key',
			'}',
			'',
			'// EncodeString appends a 0x00 terminator. Two orders fall out of that',
			'// one byte:',
			'//   - element boundaries become comparable: ("a","bc") = 61 00 62...',
			'//     vs ("ab","c") = 61 62 00... — decided at byte 2, by the',
			'//     terminator sorting below \'b\'',
			'//   - a prefix sorts before its extensions ("a" < "ab"), matching',
			'//     Go string order, because 0x00 is below every content byte.',
			'// That second point is also WHY inputs must be NUL-free: a content',
			'// 0x00 would forge a terminator. Production encoders escape it',
			'// (bytdb/tuple: 0x00 -> 0x00 0xFF, terminator 0x00 0x01).',
			'func EncodeString(s string) []byte {',
			'	key := make([]byte, 0, len(s)+1)',
			'	key = append(key, s...)',
			'	return append(key, 0x00)',
			'}',
			'',
			'// EncodeKey is plain concatenation — correct only because every part',
			'// is self-delimiting (fixed width or terminated), which makes each',
			'// part\'s encoding prefix-free: no part\'s bytes can be mistaken for',
			'// the start of another. memcmp over the concatenation then compares',
			'// component-by-component, exactly like SQL compares composite keys.',
			'func EncodeKey(parts ...[]byte) []byte {',
			'	n := 0',
			'	for _, p := range parts {',
			'		n += len(p)',
			'	}',
			'	key := make([]byte, 0, n)',
			'	for _, p := range parts {',
			'		key = append(key, p...)',
			'	}',
			'	return key',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>This is the real encoding</h3>' +
			'<p>What you built is the core of bytdb&#8217;s <code>tuple</code> ' +
			'package — and of the key encodings in CockroachDB, FoundationDB&#8217;s ' +
			'tuple layer, and TiDB. The production versions add a small frame ' +
			'around your logic: each element gets a <strong>type tag</strong> byte ' +
			'(bytdb: NULL=0x01, ints 0x04, strings 0x07 — which is how ' +
			'<code>NULL</code> sorts before everything), and strings get the ' +
			'escape you were spared: <code>0x00</code> in content becomes ' +
			'<code>0x00 0xFF</code>, the terminator becomes <code>0x00 0x01</code>. ' +
			'The terminator still sorts below every escaped byte, so all your ' +
			'ordering arguments survive the escape unchanged.</p>' +
			'<h3>DESC columns are one XOR away</h3>' +
			'<p><code>CREATE INDEX &#8230; (hired DESC)</code> needs keys that sort ' +
			'backwards. No new scheme required: <strong>invert every byte</strong> ' +
			'of the ascending encoding (<code>b ^ 0xFF</code>) and byte order ' +
			'reverses exactly — that is bytdb&#8217;s <code>AppendDesc</code>, one ' +
			'XOR mask threaded through the same code path. Because each ' +
			'element&#8217;s encoding is prefix-free, ascending and descending ' +
			'elements mix freely in one composite key: ' +
			'<code>(dept ASC, hired DESC)</code> just XORs the second element.</p>' +
			'<h3>Why memcmp-comparable is the whole game</h3>' +
			'<p>The storage engine — the B-tree, the LSM, the WAL, the block ' +
			'cache — never learns the schema. It sorts, merges, splits, and ' +
			'range-scans opaque byte strings with one comparator: ' +
			'<code>memcmp</code>. That is what makes the layering cheap: the SQL ' +
			'layer compiles <code>WHERE id BETWEEN 100 AND 200</code> into ' +
			'<code>scan [enc(100), enc(200)]</code> and the engine needs zero ' +
			'type knowledge to answer it. RocksDB does let you register a custom ' +
			'comparator instead — and CockroachDB&#8217;s engineers still chose ' +
			'encoding-side order, because a comparator must be consulted on ' +
			'<em>every</em> comparison in every compaction forever, it cannot be ' +
			'changed once data exists, and tooling that just dumps keys in byte ' +
			'order stays correct for free.</p>' +
			'<h3>War stories</h3>' +
			'<p>Every corner the harness pinned is a production incident ' +
			'somewhere: pagination that returns id 10 before id 9 (string-keyed ' +
			'ids — common in systems that bolt sorting onto Redis or S3 listings); ' +
			'range scans that silently skip all negative values (two&#8217;s-' +
			'complement keys — the sign boundary you flipped); composite indexes ' +
			'that conflate <code>(&quot;ab&quot;,&quot;c&quot;)</code> with ' +
			'<code>(&quot;a&quot;,&quot;bc&quot;)</code> (unterminated ' +
			'concatenation — this one shipped in more than one homegrown ' +
			'secondary-index layer before being caught by a range scan returning ' +
			'rows from the wrong tenant). Floats, which you were spared, are the ' +
			'gnarliest: IEEE 754 needs the sign bit flipped for positives and ' +
			'<em>all</em> bits flipped for negatives, plus a decision about NaN — ' +
			'bytdb rejects NaN outright and normalizes <code>-0</code> to ' +
			'<code>+0</code> rather than let two encodings of &quot;equal&quot; ' +
			'values diverge.</p>',
		],
		complexity: { time: 'O(n) — one pass over the key bytes; each element encodes in its own length', space: 'O(n) for the encoded key' },
	});
})();
