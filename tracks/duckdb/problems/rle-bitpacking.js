/* RLE & Bit-Packing — Compression (Medium). The two light-weight schemes
 * every columnar engine reaches for first: run-length encoding (value,count
 * pairs) and bit-packing (store only the bits the max value needs). The
 * harness pins the punchline with one multiset stored twice: sorted it RLEs
 * 1000 values into 3 runs (48 B), shuffled the SAME values explode to 680
 * runs (10,880 B — bigger than raw), while bit-packing yields 250 B either
 * way. That asymmetry is why engines pick compression per column segment
 * after looking at the data, never per table.
 */
(function () {
	'use strict';
	var T = GoLearnDK;

	// One column, three sizes: raw, RLE (order-sensitive), bit-packed
	// (order-blind). Marker id namespaced (dgArrowDK04) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="the same 1000-value column stored three ways: raw is 8000 bytes; sorted RLE is 3 runs, 48 bytes; the shuffled same values RLE to 680 runs, 10880 bytes, larger than raw; bit-packing gives 250 bytes in either order">' +
		'<text x="20" y="24" class="lbl">one column, three sizes — ordering decides whether RLE wins or loses</text>' +
		// the raw column everything starts from
		'<rect x="30" y="70" width="150" height="56" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="105" y="94" text-anchor="middle">1000 × int64</text>' +
		'<text x="105" y="114" text-anchor="middle" class="lbl">raw: 8000 B</text>' +
		// sorted: RLE collapses it
		'<path d="M 180 84 C 232 60 262 56 304 56" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDK04)"/>' +
		'<text x="243" y="48" text-anchor="middle" class="lbl">sorted</text>' +
		'<rect x="310" y="36" width="186" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="403" y="61" text-anchor="middle">RLE: 3 runs = 48 B</text>' +
		// shuffled: RLE inflates it past raw
		'<path d="M 180 112 C 232 138 262 142 304 142" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDK04)"/>' +
		'<text x="243" y="156" text-anchor="middle" class="lbl" style="fill:var(--warn)">shuffled</text>' +
		'<rect x="310" y="122" width="186" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="403" y="147" text-anchor="middle">RLE: 680 runs = 10,880 B</text>' +
		'<text x="403" y="176" text-anchor="middle" class="lbl" style="fill:var(--warn)">bigger than raw — RLE can lose</text>' +
		'<text x="20" y="200" class="lbl">bit-packing is order-blind: max = 2 → width 2 bits → ceil(1000·2/8) = 250 B either way</text>' +
		'<defs><marker id="dgArrowDK04" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'rle-bitpacking',
		title: 'RLE & Bit-Packing',
		nav: 'rle bitpacking',
		difficulty: 'Medium',
		category: 'Compression',
		task: 'Implement RLE encode/decode and LSB-first bit-packing (BitWidth, Pack, Unpack) — the two light-weight schemes a columnar engine picks between per column segment.',

		prose: [
			'<h2>RLE &amp; Bit-Packing</h2>' +
			'<p>A 40&nbsp;GB CSV of clickstream events loads into DuckDB and the ' +
			'database file comes out at 2.3&nbsp;GB — and no gzip ran anywhere. ' +
			'<code>SELECT segment_type, compression FROM pragma_storage_info(\'events\')</code> ' +
			'shows why: the <code>status</code> column’s segments say <code>RLE</code>, ' +
			'the <code>country_id</code> segments say <code>BitPacking</code>, a ' +
			'high-entropy <code>session_hash</code> column says ' +
			'<code>Uncompressed</code>. These are <em>light-weight</em> compression ' +
			'schemes: unlike gzip they decode at memory bandwidth (some without ' +
			'decoding at all — you can filter runs directly), and the engine chooses ' +
			'one <strong>per column segment</strong>, after looking at the data. Two ' +
			'of them do most of the work:</p>' +
			'<ul>' +
			'<li><strong>Run-length encoding.</strong> Collapse consecutive equal ' +
			'values into <code>(value, length)</code> pairs. With 8 bytes for each ' +
			'field a run costs 16 bytes, so RLE pays off exactly when average run ' +
			'length beats 2. It is purely local — it never notices equal values that ' +
			'aren’t <em>adjacent</em> — so sortedness, not cardinality, decides its ' +
			'fate.</li>' +
			'<li><strong>Bit-packing.</strong> An <code>int64</code> column whose max ' +
			'is 2 wastes 62 bits per value. Store only ' +
			'<code>BitWidth(max)</code>&nbsp;=&nbsp;<code>bits.Len64(max)</code> bits ' +
			'each, packed into a continuous bit stream: value <code>i</code> owns ' +
			'stream bits <code>[i·w, (i+1)·w)</code>, and stream bit <code>b</code> ' +
			'lives at byte <code>b/8</code>, bit position <code>b%8</code> — ' +
			'LSB-first, values straddling byte boundaries without padding.</li>' +
			'<li><strong>The sizes to compare:</strong> raw is <code>n·8</code> ' +
			'bytes; RLE is <code>runs·16</code>; packed is ' +
			'<code>ceil(n·w/8)</code>.</li>' +
			'</ul>',
			{ lang: 'txt', code: 'status column: 1000 rows, values 0 ×400, 1 ×350, 2 ×250   raw = 8000 B\n\nsorted:    [0…0 1…1 2…2]  → 3 runs × 16 B  =     48 B   (166x)\nshuffled:  same multiset  → 680 runs × 16 B = 10,880 B   (LARGER than raw)\nbit-pack:  max 2 → width 2 → ceil(1000·2/8) =    250 B   (32x, either order)\n\npack [3 1 4 1 5 9 2 6] at width 4, LSB-first:\n  byte 0 = 3 | 1<<4 = 0x13     byte 1 = 4 | 1<<4 = 0x14\n  byte 2 = 5 | 9<<4 = 0x95     byte 3 = 2 | 6<<4 = 0x62' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>RLEEncode</code> / <code>RLEDecode</code> (exact ' +
			'round-trip) and <code>BitWidth</code> / <code>Pack</code> / ' +
			'<code>Unpack</code>. Bit-packing must be hand-rolled with shifts — ' +
			'byte-spanning values are the whole exercise. Convention: ' +
			'<code>BitWidth(0) = 0</code>; an all-zero column needs no payload ' +
			'bytes at all, and <code>Unpack</code> at width 0 reconstructs ' +
			'<code>n</code> zeros.</p>' +
			'<div class="tip">Why both schemes ship in one lesson: the harness ' +
			'stores one multiset twice. Sorted, RLE crushes it; shuffled, RLE ' +
			'<em>inflates</em> it past raw while bit-packing doesn’t move a byte. ' +
			'No single scheme wins in general — which is why an engine looks at ' +
			'each segment’s actual data and lets the schemes bid, rather than ' +
			'declaring a table-wide codec up front.</div>',
		],

		starter: [
			'package main',
			'',
			'// Run is one RLE pair: Value repeats Length times. Each field is a',
			'// fixed 8-byte slot on disk, so a run costs 16 bytes — break-even',
			'// against raw int64 is an average run length of 2.',
			'type Run struct {',
			'	Value  int64',
			'	Length int64',
			'}',
			'',
			'// RLEEncode collapses consecutive equal values into runs, in order.',
			'// [7 7 7 2 2 9] -> [{7 3} {2 2} {9 1}]. Empty input yields no runs.',
			'func RLEEncode(values []int64) []Run {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// RLEDecode expands runs back to the flat column: the exact inverse',
			'// of RLEEncode.',
			'func RLEDecode(runs []Run) []int64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// BitWidth reports how many bits store any value in [0, maxVal]:',
			'// bits.Len64(maxVal). Convention: BitWidth(0) = 0 — an all-zero',
			'// column needs no payload bits.',
			'func BitWidth(maxVal uint64) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Pack writes the low `width` bits of each value into a continuous',
			'// LSB-first bit stream: value i owns stream bits [i*width, (i+1)*width),',
			'// and stream bit b lands in byte b/8 at bit position b%8. Values may',
			'// straddle byte boundaries. Output length is ceil(len(values)*width/8);',
			'// width <= 0 packs to zero bytes.',
			'func Pack(values []uint64, width int) []byte {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Unpack reads n values of `width` bits back out of the stream —',
			'// the exact inverse of Pack. width <= 0 reconstructs n zeros.',
			'func Unpack(packed []byte, width, n int) []uint64 {',
			'	// your code here',
			'	return nil',
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
			'	// The sorted "status" column: 400 zeros, 350 ones, 250 twos — the',
			'	// shape of a real enum column after ORDER BY status.',
			'	sorted := make([]int64, 0, 1000)',
			'	for i := 0; i < 1000; i++ {',
			'		switch {',
			'		case i < 400:',
			'			sorted = append(sorted, 0)',
			'		case i < 750:',
			'			sorted = append(sorted, 1)',
			'		default:',
			'			sorted = append(sorted, 2)',
			'		}',
			'	}',
			'	// The SAME multiset, shuffled with a hand-rolled Park-Miller LCG',
			'	// (not math/rand: its default sequence is not stable across Go',
			'	// versions, and pinned expectations demand determinism).',
			'	shuffled := append([]int64(nil), sorted...)',
			'	seed := int64(42)',
			'	for i := len(shuffled) - 1; i > 0; i-- {',
			'		seed = seed * 48271 % 2147483647',
			'		j := int(seed % int64(i+1))',
			'		shuffled[i], shuffled[j] = shuffled[j], shuffled[i]',
			'	}',
			'	statuses := make([]uint64, len(shuffled))',
			'	for i, v := range shuffled {',
			'		statuses[i] = uint64(v)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"RLE encode: six values collapse to three runs",',
			'			"[{7 3} {2 2} {9 1}]",',
			'			func() string { return fmt.Sprintf("%v", RLEEncode([]int64{7, 7, 7, 2, 2, 9})) }},',
			'		{"RLE round-trip: decode(encode(x)) reproduces x exactly",',
			'			"true",',
			'			func() string {',
			'				back := RLEDecode(RLEEncode(sorted))',
			'				return fmt.Sprintf("%v", fmt.Sprintf("%v", back) == fmt.Sprintf("%v", sorted))',
			'			}},',
			'		{"BitWidth of 0 1 5 255 256 1023 (convention: BitWidth(0) = 0)",',
			'			"0 1 3 8 9 10",',
			'			func() string {',
			'				return fmt.Sprintf("%d %d %d %d %d %d",',
			'					BitWidth(0), BitWidth(1), BitWidth(5), BitWidth(255), BitWidth(256), BitWidth(1023))',
			'			}},',
			'		{"Pack width 4: two values per byte, LSB-first",',
			'			"13 14 95 62",',
			'			func() string { return fmt.Sprintf("% x", Pack([]uint64{3, 1, 4, 1, 5, 9, 2, 6}, 4)) }},',
			'		{"Pack width 3: values straddle byte boundaries, and Unpack round-trips",',
			'			"bd 3c -> [5 7 2 6 3]",',
			'			func() string {',
			'				p := Pack([]uint64{5, 7, 2, 6, 3}, 3)',
			'				return fmt.Sprintf("% x -> %v", p, Unpack(p, 3, 5))',
			'			}},',
			'		{"sorted status column: 3 runs, 48 B against 8000 B raw",',
			'			"runs=3 rle=48B raw=8000B",',
			'			func() string {',
			'				r := RLEEncode(sorted)',
			'				return fmt.Sprintf("runs=%d rle=%dB raw=%dB", len(r), len(r)*16, len(sorted)*8)',
			'			}},',
			'		{"SAME multiset shuffled: the run count explodes and RLE inflates past raw",',
			'			"runs=680 rle=10880B raw=8000B",',
			'			func() string {',
			'				r := RLEEncode(shuffled)',
			'				return fmt.Sprintf("runs=%d rle=%dB raw=%dB", len(r), len(r)*16, len(shuffled)*8)',
			'			}},',
			'		{"bit-packing is order-blind: shuffled statuses still pack to 250 B and round-trip",',
			'			"packed=250B roundtrip=true",',
			'			func() string {',
			'				pk := Pack(statuses, BitWidth(2))',
			'				back := Unpack(pk, BitWidth(2), len(statuses))',
			'				ok := fmt.Sprintf("%v", back) == fmt.Sprintf("%v", statuses)',
			'				return fmt.Sprintf("packed=%dB roundtrip=%v", len(pk), ok)',
			'			}},',
			'		{"edges: empty column has no runs; an all-zero column packs to zero bytes",',
			'			"runs=0 packed=0B zeros=[0 0 0 0]",',
			'			func() string {',
			'				r := RLEEncode(nil)',
			'				pk := Pack([]uint64{0, 0, 0, 0}, BitWidth(0))',
			'				return fmt.Sprintf("runs=%d packed=%dB zeros=%v", len(r), len(pk), Unpack(pk, BitWidth(0), 4))',
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
			'import "math/bits"',
			'',
			'// Run is one RLE pair: Value repeats Length times. Fixed 8-byte slots',
			'// per field make a run cost 16 bytes, so the scheme pays off exactly',
			'// when average run length beats 2 — a fact the size cases pin.',
			'type Run struct {',
			'	Value  int64',
			'	Length int64',
			'}',
			'',
			'// RLEEncode collapses consecutive equal values in one pass: extend the',
			'// open run while the value repeats, start a new one when it changes.',
			'// Deliberately local — it never looks for equal values elsewhere in',
			'// the slice, which is precisely why ordering (not cardinality) decides',
			'// whether RLE wins.',
			'func RLEEncode(values []int64) []Run {',
			'	runs := []Run{}',
			'	for _, v := range values {',
			'		if len(runs) > 0 && runs[len(runs)-1].Value == v {',
			'			runs[len(runs)-1].Length++',
			'			continue',
			'		}',
			'		runs = append(runs, Run{Value: v, Length: 1})',
			'	}',
			'	return runs',
			'}',
			'',
			'// RLEDecode expands runs back to the flat column. Lengths are summed',
			'// first so the output allocates once — decode speed is the point of',
			'// light-weight schemes (scans decode billions of values per second,',
			'// so a realloc-per-run would show up immediately). Non-positive',
			'// lengths are skipped defensively rather than trusted.',
			'func RLEDecode(runs []Run) []int64 {',
			'	total := int64(0)',
			'	for _, r := range runs {',
			'		if r.Length > 0 {',
			'			total += r.Length',
			'		}',
			'	}',
			'	out := make([]int64, 0, total)',
			'	for _, r := range runs {',
			'		for i := int64(0); i < r.Length; i++ {',
			'			out = append(out, r.Value)',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// BitWidth is bits.Len64: the index of the highest set bit, i.e. the',
			'// bit count needed for any value in [0, maxVal]. BitWidth(0) = 0 by',
			'// convention: the width lives once in the segment header, so "0 bits',
			'// times n values" reconstructs an all-zero column from no payload.',
			'func BitWidth(maxVal uint64) int {',
			'	return bits.Len64(maxVal)',
			'}',
			'',
			'// Pack writes each value\'s low `width` bits into a continuous',
			'// LSB-first bit stream. The inner loop moves up to a byte\'s worth of',
			'// bits at a time: `take` is min(room left in this byte, bits left in',
			'// this value), so a value spanning a boundary is written as two (or',
			'// more) partial-byte ORs — no padding between values, ever.',
			'//',
			'//	width 3:   v0=101  v1=111  v2=010  v3=110  v4=011',
			'//	byte 0 = [v2 low 2 | v1 | v0] = 10 111 101 = 0xbd',
			'//	byte 1 = [pad | v4 | v3 | v2 high 1] = 0 011 110 0 = 0x3c',
			'func Pack(values []uint64, width int) []byte {',
			'	if width <= 0 {',
			'		return []byte{}',
			'	}',
			'	out := make([]byte, (len(values)*width+7)/8)',
			'	bit := 0 // absolute position in the bit stream',
			'	for _, v := range values {',
			'		// Mask to width first: a stray high bit in an over-wide value',
			'		// would otherwise bleed into the NEXT value\'s bits — silent',
			'		// corruption that only shows on unpack. (Guard the shift:',
			'		// 1<<64 is out of range for uint64.)',
			'		if width < 64 {',
			'			v &= (uint64(1) << uint(width)) - 1',
			'		}',
			'		rem := width',
			'		for rem > 0 {',
			'			idx := bit / 8',
			'			off := bit % 8',
			'			take := 8 - off // room left in the current byte',
			'			if take > rem {',
			'				take = rem',
			'			}',
			'			out[idx] |= byte(v&((uint64(1)<<uint(take))-1)) << uint(off)',
			'			v >>= uint(take)',
			'			bit += take',
			'			rem -= take',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// Unpack is the mirror image: gather chunks from the stream and OR',
			'// them into the value at the offset already gathered (got), so a',
			'// boundary-spanning value reassembles low bits first. A truncated',
			'// input stops cleanly instead of indexing past the end — a corrupt',
			'// segment must degrade to wrong values, never to a panic mid-scan.',
			'func Unpack(packed []byte, width, n int) []uint64 {',
			'	out := make([]uint64, n) // width 0: n zeros, nothing to read',
			'	if width <= 0 {',
			'		return out',
			'	}',
			'	bit := 0',
			'	for i := 0; i < n; i++ {',
			'		v := uint64(0)',
			'		got := 0',
			'		for got < width {',
			'			idx := bit / 8',
			'			if idx >= len(packed) {',
			'				break',
			'			}',
			'			off := bit % 8',
			'			take := 8 - off',
			'			if take > width-got {',
			'				take = width - got',
			'			}',
			'			chunk := (uint64(packed[idx]) >> uint(off)) & ((uint64(1) << uint(take)) - 1)',
			'			v |= chunk << uint(got)',
			'			got += take',
			'			bit += take',
			'		}',
			'		out[i] = v',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What DuckDB actually does</h3>' +
			'<p>DuckDB stores a table as row groups of 122,880 rows; each column ' +
			'within a row group is cut into fixed-size segments (256&nbsp;KB ' +
			'blocks). At <strong>checkpoint time</strong> the compression framework ' +
			'runs an analyze pass over every segment: each candidate scheme — RLE, ' +
			'bit-packing, dictionary, FSST for strings, ALP for floats, constant, ' +
			'uncompressed — reports the size it would achieve <em>on that ' +
			'segment’s actual data</em>, and the lightest one wins. That is the ' +
			'design answer to this lesson’s asymmetry: your sorted segment RLEs ' +
			'166x while the shuffled one would <em>grow</em> 36%, and no static, ' +
			'table-level choice can be right for both. Per-segment bidding makes ' +
			'the choice empirical, and adjacent segments of one column routinely ' +
			'end up with different codecs.</p>' +
			'<ul>' +
			'<li><strong>Bit-packing rarely rides alone.</strong> Production ' +
			'engines first apply frame-of-reference: subtract the segment minimum ' +
			'(or a per-block reference) so a column of timestamps around ' +
			'1,700,000,000 becomes small deltas, <em>then</em> pack the deltas at ' +
			'their much smaller width. Sorted data helps here too — deltas of a ' +
			'sorted column are non-negative and tiny.</li>' +
			'<li><strong>RLE composes with dictionary encoding.</strong> A sorted ' +
			'low-cardinality string column becomes dictionary codes, and the ' +
			'<em>codes</em> are then run-length encoded — Parquet’s ubiquitous ' +
			'RLE_DICTIONARY encoding is exactly this stack.</li>' +
			'<li><strong>Operating on compressed data.</strong> The best part of ' +
			'RLE is not the bytes saved: a filter or aggregate can process a run ' +
			'in O(1) — <code>COUNT(*) WHERE status = 1</code> over your sorted ' +
			'segment touches 3 runs, not 1000 values. Vectorized engines carry ' +
			'compressed and constant vectors through the pipeline precisely to ' +
			'keep this property alive past the scan.</li>' +
			'</ul>' +
			'<h3>When each scheme loses</h3>' +
			'<p>RLE loses whenever adjacency breaks: shuffled arrival order, or a ' +
			'column that genuinely varies per row — your 680-run segment pays 16 ' +
			'bytes per <em>run</em>, and runs of length 1 are the common case ' +
			'there. Bit-packing loses to outliers: one value of 2<sup>40</sup> in ' +
			'a segment of tiny values drags the width to 41 bits for everyone, ' +
			'which is why real formats add patched variants (PFOR: pack the ' +
			'common width, store outliers in an exception list). Both lose to ' +
			'high-entropy data — hashes, UUIDs — where the honest bid the analyze ' +
			'pass produces is <code>Uncompressed</code>.</p>' +
			'<h3>The lever you actually hold</h3>' +
			'<p>You rarely pick codecs by hand — you pick the <em>order</em>. An ' +
			'<code>ORDER BY status, country</code> before a bulk load (or a sort ' +
			'key in your Parquet writer) turns scattered values into long runs, ' +
			'often shrinking files several-fold with zero schema changes — the ' +
			'same trick that makes zone maps bite in the next lesson. Check what ' +
			'the engine chose with <code>pragma_storage_info(\'table\')</code>: ' +
			'when a column you expected to compress reads ' +
			'<code>Uncompressed</code>, its ordering — not the codec roster — is ' +
			'usually what to fix.</p>',
		],
		complexity: { time: 'O(n) for each codec — one pass to encode, decode, pack, or unpack', space: 'O(n) for the output; O(1) beyond it' },
	});
})();
