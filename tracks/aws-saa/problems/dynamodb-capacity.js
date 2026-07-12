/* DynamoDB Capacity Units — Databases (Medium). The documented RCU/WCU
 * math, integer-only: units = ceil(size/unit) with a 1-unit floor, times
 * rate, halved (rounded up) for eventually consistent reads. The harness
 * targets the two classic traps — the 4 KB+1 byte round-up and the odd
 * product halved. All-integer arithmetic, so comparisons are exact.
 */
(function () {
	'use strict';
	var T = GoLearnAWS;

	// One 6 KB item sliced two ways: two 4 KB read units vs six 1 KB write
	// units — the partial last block still costs a whole unit.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 170" width="520" height="170" role="img" aria-label="a 6 KB item costs 2 read units of 4 KB each and 6 write units of 1 KB each; partial blocks round up">' +
		'<text x="20" y="24" class="lbl">one 6 KB item</text>' +
		// read slicing: 4KB blocks
		'<text x="20" y="52" class="lbl">reads (4 KB units)</text>' +
		'<rect x="150" y="36" width="160" height="26" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="230" y="54" text-anchor="middle" class="lbl">4 KB</text>' +
		'<rect x="316" y="36" width="80" height="26" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="316" y="36" width="160" height="26" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.2" stroke-dasharray="4 3"/>' +
		'<text x="356" y="54" text-anchor="middle" class="lbl">2 KB</text>' +
		'<text x="484" y="54" class="lbl" style="fill:var(--ok)">= 2 units</text>' +
		// write slicing: 1KB blocks
		'<text x="20" y="98" class="lbl">writes (1 KB units)</text>' +
		'<g fill="none" stroke="var(--accent)" stroke-width="1.6">' +
		'<rect x="150" y="82" width="40" height="26" rx="3"/>' +
		'<rect x="196" y="82" width="40" height="26" rx="3"/>' +
		'<rect x="242" y="82" width="40" height="26" rx="3"/>' +
		'<rect x="288" y="82" width="40" height="26" rx="3"/>' +
		'<rect x="334" y="82" width="40" height="26" rx="3"/>' +
		'<rect x="380" y="82" width="40" height="26" rx="3"/>' +
		'</g>' +
		'<text x="484" y="100" class="lbl" style="fill:var(--accent)">= 6 units</text>' +
		// the trap
		'<path d="M 396 62 C 420 68 430 74 440 80" fill="none" stroke="var(--err-edge)" stroke-width="1.4" marker-end="url(#dgArrowDDB)"/>' +
		'<text x="20" y="140" class="lbl">the trap: 4097 bytes = 2 read units — a partial block always costs a whole unit (ceil, never floor)</text>' +
		'<text x="20" y="158" class="lbl">RCU = units × reads/sec (eventual: half, rounded up) · WCU = units × writes/sec</text>' +
		'<defs><marker id="dgArrowDDB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'dynamodb-capacity',
		title: 'DynamoDB Capacity Units',
		nav: 'DynamoDB Capacity',
		difficulty: 'Medium',
		category: 'Databases',
		task: 'Implement ReadCapacity and WriteCapacity — the documented RCU/WCU sizing math. Make all 6 tests pass.',

		prose: [
			'<h2>DynamoDB Capacity Units</h2>' +
			'<p><strong>Exam scenario.</strong> An application reads 20 items per second, each ' +
			'6&nbsp;KB, using eventually consistent reads. How many RCUs must the table be ' +
			'provisioned with? The exam asks this <em>as arithmetic</em>, and the arithmetic is ' +
			'exactly what AWS documents:</p>' +
			'<ul>' +
			'<li>One <strong>read capacity unit</strong> = one strongly consistent read per second ' +
			'of an item up to <strong>4&nbsp;KB</strong>. Bigger items consume ' +
			'<code>ceil(itemBytes / 4096)</code> units (minimum 1).</li>' +
			'<li>An <strong>eventually consistent</strong> read costs <em>half</em> — and a ' +
			'fractional total rounds <strong>up</strong>.</li>' +
			'<li>One <strong>write capacity unit</strong> = one write per second of an item up to ' +
			'<strong>1&nbsp;KB</strong>: <code>ceil(itemBytes / 1024)</code> units (minimum 1), no ' +
			'consistency discount.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement both functions with <em>integer-only</em> math. The idiomatic integer ' +
			'ceiling is <code>(a + b - 1) / b</code> — no floats, no <code>math.Ceil</code>, no ' +
			'rounding surprises. Watch the two traps the tests target: 4097 bytes is ' +
			'<em>two</em> read units, and halving an odd RCU total rounds up.</p>',
			{ code: 'ReadCapacity(100, 10, true)    → 10   // tiny item, still 1 unit each\nReadCapacity(4097, 10, true)   → 20   // one byte over → 2 units\nReadCapacity(4096, 5, false)   → 3    // eventual: ceil(5/2)\nWriteCapacity(1536, 1)         → 2    // 1.5 KB → 2 write units', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// ReadCapacity returns the RCUs needed to sustain readsPerSec reads of',
			'// itemBytes-sized items.',
			'//',
			'//   - units per read = ceil(itemBytes/4096), minimum 1',
			'//   - rcu = units * readsPerSec',
			'//   - eventually consistent reads cost half, rounded UP: ceil(rcu/2)',
			'//',
			'// Use integer math only: ceil(a/b) is (a + b - 1) / b.',
			'func ReadCapacity(itemBytes, readsPerSec int, stronglyConsistent bool) int {',
			'	// your code here',
			'	return -1',
			'}',
			'',
			'// WriteCapacity returns the WCUs needed to sustain writesPerSec writes',
			'// of itemBytes-sized items.',
			'//',
			'//   - units per write = ceil(itemBytes/1024), minimum 1',
			'//   - wcu = units * writesPerSec (no consistency discount for writes)',
			'func WriteCapacity(itemBytes, writesPerSec int) int {',
			'	// your code here',
			'	return -1',
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
			'		name   string',
			'		op     string // "read" or "write"',
			'		bytes  int',
			'		rate   int',
			'		strong bool // reads only',
			'		want   int',
			'	}',
			'	cases := []tc{',
			'		{"small item, strong reads: 100 B x 10/s", "read", 100, 10, true, 10},',
			'		{"round-up trap: 4097 B x 10/s strong (one byte over 4 KB)", "read", 4097, 10, true, 20},',
			'		{"eventual halves, odd rounds up: 4096 B x 5/s", "read", 4096, 5, false, 3},',
			'		{"write round-up: 1536 B (1.5 KB) x 1/s", "write", 1536, 1, false, 2},',
			'		{"small write floor: 100 B x 1/s", "write", 100, 1, false, 1},',
			'		{"sizing scenario: 6144 B (6 KB) x 20/s eventual reads", "read", 6144, 20, false, 20},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			var got int',
			'			if c.op == "read" {',
			'				got = ReadCapacity(c.bytes, c.rate, c.strong)',
			'			} else {',
			'				got = WriteCapacity(c.bytes, c.rate)',
			'			}',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%d", got)',
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
			'// ceilDiv is integer ceiling division: the (a + b - 1) / b idiom.',
			'// Adding b-1 pushes any nonzero remainder over the next multiple',
			'// before the truncating division — exact for all non-negative a,',
			'// with no float conversion to introduce rounding error.',
			'func ceilDiv(a, b int) int {',
			'	return (a + b - 1) / b',
			'}',
			'',
			'// ReadCapacity returns the RCUs needed to sustain readsPerSec reads of',
			'// itemBytes-sized items.',
			'//',
			'// The order of operations matters and mirrors the AWS documentation:',
			'// round the ITEM up to whole 4 KB units first, multiply by the rate,',
			'// and only then apply the eventual-consistency discount. Halving',
			'// before multiplying would under-provision (e.g. 5 strong reads is',
			'// 3 eventual, not 2.5 truncated to 2).',
			'func ReadCapacity(itemBytes, readsPerSec int, stronglyConsistent bool) int {',
			'	units := ceilDiv(itemBytes, 4096)',
			'	if units < 1 {',
			'		units = 1 // a zero-byte item still consumes one unit',
			'	}',
			'	rcu := units * readsPerSec',
			'	if !stronglyConsistent {',
			'		// Half price, rounded UP: provisioning truncates in the',
			'		// customer\'s favor never — an odd total keeps its half unit.',
			'		rcu = ceilDiv(rcu, 2)',
			'	}',
			'	return rcu',
			'}',
			'',
			'// WriteCapacity returns the WCUs needed to sustain writesPerSec writes',
			'// of itemBytes-sized items. Writes use 1 KB units and have no',
			'// consistency discount — every write is durable and ordered.',
			'func WriteCapacity(itemBytes, writesPerSec int) int {',
			'	units := ceilDiv(itemBytes, 1024)',
			'	if units < 1 {',
			'		units = 1',
			'	}',
			'	return units * writesPerSec',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Ceil, then multiply, then halve</h3>' +
			'<p>The whole problem is one formula applied carefully: ' +
			'<strong>capacity units = ceil(size / unit) × rate</strong>, with the read unit at ' +
			'4&nbsp;KB, the write unit at 1&nbsp;KB, and the eventual-consistency halving applied ' +
			'<em>last</em>, rounded up. Integer ceiling division does all the rounding without ' +
			'ever touching a float:</p>',
			{ code: 'func ceilDiv(a, b int) int { return (a + b - 1) / b }\n\nunits := ceilDiv(itemBytes, 4096) // 4097 B → 2 units, not 1.0002\nrcu := units * readsPerSec\nif !stronglyConsistent {\n\trcu = ceilDiv(rcu, 2) // 5 strong → 3 eventual, not 2\n}' },
			'<p>Both traps the tests target are order-of-operations bugs: flooring instead of ' +
			'ceiling loses the partial block (4097 bytes ≠ 1 unit), and halving with truncation ' +
			'under-provisions odd totals. The <code>(a+b-1)/b</code> idiom is worth keeping — it ' +
			'shows up anywhere resources are allocated in fixed blocks: disk pages, network ' +
			'MTUs, shard counts, batch sizing.</p>' +
			'<h3>Exam takeaway</h3>' +
			'<p>Memorize the two unit sizes (read = 4&nbsp;KB, write = 1&nbsp;KB) and the ' +
			'multipliers: <em>eventually consistent = half price</em>, and <em>transactional ' +
			'reads and writes = double</em> (not tested here, same formula with a ×2). Provisioned ' +
			'throughput is also per-partition — a hot partition key can throttle a table that ' +
			'looks correctly sized on paper, which is what adaptive capacity mitigates and good ' +
			'key design avoids. And when the question says traffic is <em>unpredictable or ' +
			'spiky</em>, the answer usually isn’t this math at all — it’s ' +
			'<strong>on-demand capacity mode</strong>.</p>',
		],
		complexity: { time: 'O(1)', space: 'O(1)' },
	});
})();
