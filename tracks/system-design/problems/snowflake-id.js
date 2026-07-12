/* Snowflake ID — Unique IDs & Encoding (Medium). Twitter-style 64-bit ids:
 * timestamp | node | sequence, packed with shifts. The clock is injected
 * (nowMs parameter), so every expected id is an exact number the harness
 * can assert — including the sequence-exhaustion sentinel.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 130" width="520" height="130" role="img" aria-label="snowflake 64-bit layout: 1 sign bit, 41 timestamp bits, 10 node bits, 12 sequence bits">' +
		'<text x="14" y="20" class="lbl">one int64, four fields — packed with shifts</text>' +
		// sign bit
		'<rect x="14" y="32" width="12" height="36" fill="none" stroke="var(--dim)"/>' +
		'<text x="20" y="88" text-anchor="middle" class="lbl">0</text>' +
		// timestamp 41 bits
		'<rect x="26" y="32" width="300" height="36" fill="none" stroke="var(--accent)" stroke-width="1.8"/>' +
		'<text x="176" y="55" text-anchor="middle">nowMs − epochMs</text>' +
		'<text x="176" y="88" text-anchor="middle" class="lbl">41 bits · ms since custom epoch · ≈69 years</text>' +
		// node 10 bits
		'<rect x="326" y="32" width="80" height="36" fill="none" stroke="var(--ok)" stroke-width="1.8"/>' +
		'<text x="366" y="55" text-anchor="middle">node</text>' +
		'<text x="366" y="88" text-anchor="middle" class="lbl">10 bits · 1024</text>' +
		// seq 12 bits
		'<rect x="406" y="32" width="100" height="36" fill="none" stroke="var(--err-edge)" stroke-width="1.8"/>' +
		'<text x="456" y="55" text-anchor="middle">seq</text>' +
		'<text x="456" y="88" text-anchor="middle" class="lbl">12 bits · 4096/ms</text>' +
		// sort note
		'<text x="14" y="116" class="lbl">timestamp in the high bits ⇒ numeric order ≈ creation order (k-sortable)</text>' +
		'</svg>';

	SD.problem({
		id: 'snowflake-id',
		title: 'Snowflake ID Generator',
		nav: 'Snowflake ID',
		difficulty: 'Medium',
		category: 'Unique IDs & Encoding',
		task: 'Implement NextID: pack timestamp|node|seq, increment seq within a millisecond, return -1 on exhaustion.',

		prose: [
			'<h2>Snowflake ID Generator</h2>' +
			'<p>A single Postgres box hands out unique ids for free with ' +
			'<code>AUTO_INCREMENT</code> — but a fleet of 50 application servers cannot all ' +
			'queue on one sequence. Twitter’s <em>snowflake</em> scheme lets every node mint ' +
			'ids <em>locally</em>, with no coordination, by packing three fields into one ' +
			'<code>int64</code>:</p>' +
			DIAGRAM +
			'<p>Implement <code>NextID(nowMs int64) int64</code> on the provided ' +
			'<code>Generator</code>:</p>',
			{ code: 'id = (nowMs − epochMs) << 22  |  nodeID << 12  |  seq', lang: 'txt' },
			'<ul>' +
			'<li><strong>New millisecond</strong> (nowMs differs from the last call): reset <code>seq</code> to 0.</li>' +
			'<li><strong>Same millisecond</strong>: increment <code>seq</code> — up to 4096 ids per node per ms (seq 0…4095).</li>' +
			'<li><strong>Exhaustion</strong>: if <code>seq</code> would exceed 4095 within one ms, return <code>-1</code> ' +
			'and leave state untouched. (Real generators busy-wait for the next millisecond; ' +
			'returning a sentinel keeps this version deterministic and testable — the caller decides how to wait.)</li>' +
			'</ul>' +
			'<p>Callers guarantee <code>nowMs</code> is non-decreasing. As in the token-bucket ' +
			'problem, time is <em>injected</em> — the tests replay exact timelines, so every ' +
			'expected id is a concrete number.</p>',
		],

		starter: [
			'package main',
			'',
			'// Generator mints snowflake-style ids for ONE node: 41 bits of',
			'// milliseconds since a custom epoch, 10 bits of node id, 12 bits of',
			'// per-millisecond sequence. No locks here — one Generator per node,',
			'// and time arrives as a parameter so behavior is deterministic.',
			'type Generator struct {',
			'	epochMs int64 // custom epoch — subtracting it keeps 41 bits lasting ~69 years',
			'	nodeID  int64 // 0..1023, unique per machine/process',
			'	lastMs  int64 // timestamp of the previous NextID call',
			'	seq     int64 // sequence within lastMs, 0..4095',
			'}',
			'',
			'func NewGenerator(epochMs, nodeID int64) *Generator {',
			'	// lastMs = -1 so the first call never matches a real timestamp.',
			'	return &Generator{epochMs: epochMs, nodeID: nodeID, lastMs: -1}',
			'}',
			'',
			'// NextID returns the id for a request arriving at nowMs:',
			'//   (nowMs-epochMs)<<22 | nodeID<<12 | seq',
			'// Same ms as the previous call → seq increments; a new ms resets seq',
			'// to 0. If seq would exceed 4095 within one ms, return -1 (sequence',
			'// space exhausted). nowMs is non-decreasing across calls.',
			'func (g *Generator) NextID(nowMs int64) int64 {',
			'	return 0 // your code here',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"reflect"',
			')',
			'',
			SD.HARNESS_RT,
			'',
			'func main() {',
			'	const epoch = int64(1700000000000) // custom epoch, ms',
			'	type tc struct {',
			'		name   string',
			'		nodeID int64',
			'		times  []int64 // successive NextID call times',
			'		sample []int   // indices of outputs to compare (nil = all)',
			'		want   []int64',
			'	}',
			'	// The rollover case needs 4097 calls in one millisecond; build the',
			'	// timeline programmatically and compare only three sampled outputs.',
			'	burst := make([]int64, 4097)',
			'	for i := range burst {',
			'		burst[i] = epoch + 5',
			'	}',
			'	cases := []tc{',
			'		{"first id, node 1, epoch+1ms: (1<<22)|(1<<12)|0", 1,',
			'			[]int64{epoch + 1}, nil, []int64{4198400}},',
			'		{"same ms twice, node 1: sequence increments by 1", 1,',
			'			[]int64{epoch + 1, epoch + 1}, nil, []int64{4198400, 4198401}},',
			'		{"node 2 at epoch+1ms: node field adds 1<<12 vs node 1", 2,',
			'			[]int64{epoch + 1}, nil, []int64{4202496}},',
			'		{"new ms resets seq: node 1 at epoch+1 (twice) then epoch+2", 1,',
			'			[]int64{epoch + 1, epoch + 1, epoch + 2}, nil,',
			'			[]int64{4198400, 4198401, 8392704}},',
			'		{"rollover: node 7, 4097 calls at epoch+5ms → ids[0], ids[4095], ids[4096]", 7,',
			'			burst, []int{0, 4095, 4096}, []int64{21000192, 21004287, -1}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			g := NewGenerator(epoch, c.nodeID)',
			'			outs := make([]int64, 0, len(c.times))',
			'			for _, t := range c.times {',
			'				outs = append(outs, g.NextID(t))',
			'			}',
			'			got := outs',
			'			if c.sample != nil {',
			'				got = make([]int64, 0, len(c.sample))',
			'				for _, i := range c.sample {',
			'					got = append(got, outs[i])',
			'				}',
			'			}',
			'			r["pass"] = reflect.DeepEqual(got, c.want)',
			'			r["got"] = fmt.Sprintf("%v", got)',
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
			'// Generator mints snowflake-style ids for ONE node: 41 bits of',
			'// milliseconds since a custom epoch, 10 bits of node id, 12 bits of',
			'// per-millisecond sequence. No locks here — one Generator per node,',
			'// and time arrives as a parameter so behavior is deterministic.',
			'type Generator struct {',
			'	epochMs int64 // custom epoch — subtracting it keeps 41 bits lasting ~69 years',
			'	nodeID  int64 // 0..1023, unique per machine/process',
			'	lastMs  int64 // timestamp of the previous NextID call',
			'	seq     int64 // sequence within lastMs, 0..4095',
			'}',
			'',
			'func NewGenerator(epochMs, nodeID int64) *Generator {',
			'	// lastMs = -1 so the first call never matches a real timestamp.',
			'	return &Generator{epochMs: epochMs, nodeID: nodeID, lastMs: -1}',
			'}',
			'',
			'// NextID returns the id for a request arriving at nowMs:',
			'//   (nowMs-epochMs)<<22 | nodeID<<12 | seq',
			'// Same ms as the previous call → seq increments; a new ms resets seq',
			'// to 0. If seq would exceed 4095 within one ms, return -1 (sequence',
			'// space exhausted). nowMs is non-decreasing across calls.',
			'func (g *Generator) NextID(nowMs int64) int64 {',
			'	if nowMs == g.lastMs {',
			'		// Still inside the same millisecond: the sequence field is',
			'		// what keeps ids unique. Check BEFORE incrementing so an',
			'		// exhausted millisecond leaves state untouched — every later',
			'		// call in this ms also gets -1, and the next ms starts clean.',
			'		if g.seq == 4095 {',
			'			return -1',
			'		}',
			'		g.seq++',
			'	} else {',
			'		// New millisecond: the timestamp field advances, so the',
			'		// sequence can restart at 0 without ever repeating an id.',
			'		g.lastMs = nowMs',
			'		g.seq = 0',
			'	}',
			'',
			'	// Pack high→low: timestamp | node | seq. The shift amounts are the',
			'	// widths of the fields BELOW each one (node 10 + seq 12 = 22, and',
			'	// seq 12). Because the fields never exceed their widths, OR is',
			'	// safe — no bits overlap.',
			'	return (nowMs-g.epochMs)<<22 | g.nodeID<<12 | g.seq',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why not a database sequence — or a UUID?</h3>' +
			'<p>Three ways to hand out ids, three trade-offs. <em>Auto-increment</em> is a ' +
			'single point of coordination (every insert queues on one counter) and leaks ' +
			'volume, as the base62 problem showed. <em>UUIDv4</em> is coordination-free but ' +
			'128 random bits: twice the storage, and inserts land at random positions in a ' +
			'B-tree index, wrecking locality. <em>Snowflake</em> takes the middle path — ' +
			'coordination-free like a UUID, but 64 bits and <strong>k-sortable</strong>: ' +
			'because the timestamp occupies the high bits, sorting by id is (approximately) ' +
			'sorting by creation time, so ids index well and paginate chronologically for ' +
			'free. This <strong>bit-packed, time-prefixed id</strong> pattern powers Twitter ' +
			'snowflake, Instagram’s sharded ids, Sonyflake, Discord ids, and ULID/UUIDv7.</p>',
			{ code: 'return (nowMs-g.epochMs)<<22 | g.nodeID<<12 | g.seq\n// shift = total width of the fields below: node(10) + seq(12) = 22' },
			'<h3>Why 41 / 10 / 12</h3>' +
			'<p>The split is a budget over 63 usable bits. 41 bits of milliseconds last ' +
			'2⁴¹ ms ≈ 69 years — hence the custom epoch: counting from your launch date ' +
			'instead of 1970 spends the range on <em>your</em> future. 10 node bits allow ' +
			'1024 concurrent generators; 12 sequence bits allow 4096 ids per node per ' +
			'millisecond — over 4 million ids/sec/node before exhaustion. Different systems ' +
			'rebalance (Sonyflake: 39/8/16 with 10ms ticks) but the structure is identical.</p>' +
			'<h3>The clock is the weak point</h3>' +
			'<p>Uniqueness silently assumes time never repeats. If NTP steps the clock ' +
			'<em>backwards</em>, a naive generator re-mints old timestamps and duplicates ' +
			'ids. Production generators keep <code>lastMs</code> exactly as this one does and ' +
			'refuse to go back — erroring or waiting until the clock catches up (and on ' +
			'sequence exhaustion they busy-wait for the next millisecond, where this ' +
			'version returns <code>-1</code> to stay deterministic). Injected time makes all ' +
			'of that testable: the harness replays exact timelines, including the 4097th ' +
			'call in one millisecond.</p>',
		],
		complexity: { time: 'O(1) per id', space: 'O(1)' },
	});
})();
