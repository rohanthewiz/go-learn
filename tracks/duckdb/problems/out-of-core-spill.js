/* Out-of-Core: When Data Outgrows RAM — Execution (Hard). Grace-hash
 * partitioning in two halves: the planning arithmetic (how many partitions,
 * how many recursive passes, how many extra bytes of I/O) and the mechanism
 * itself (hash-partition a GROUP BY so each partition\'s groups fit a memory
 * budget, aggregate partitions one at a time, merge). The harness pins the
 * ceil arithmetic, the fits-in-RAM zero cases, the 2*n*depth spill bill, and
 * a partitioned aggregation that matches a one-pass GROUP BY exactly while
 * proving no partition ever exceeded the budget.
 */
(function () {
	'use strict';
	var T = GoLearnDK;

	// Grace hash in one picture: partition by hash, spill, then aggregate one
	// partition at a time inside the budget. Marker id namespaced
	// (dgArrowDK10) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 224" width="560" height="224" role="img" aria-label="grace hash: input larger than memory is hash-partitioned and spilled, then each partition is read back and aggregated inside the memory budget">' +
		'<text x="20" y="24" class="lbl">grace hash: one pass to scatter by hash(key), then each partition fits in RAM on its own</text>' +
		// the oversized input
		'<rect x="30" y="70" width="110" height="70" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="85" y="100" text-anchor="middle">input</text>' +
		'<text x="85" y="120" text-anchor="middle">n = 10 GB</text>' +
		'<text x="85" y="158" text-anchor="middle" class="lbl">will not fit: m = 1 GB</text>' +
		'<path d="M 140 105 L 226 105" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDK10)"/>' +
		'<text x="183" y="96" text-anchor="middle" class="lbl">hash % 10</text>' +
		// the spilled partitions
		'<rect x="230" y="44" width="130" height="28" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="295" y="63" text-anchor="middle">P0 ~1 GB</text>' +
		'<rect x="230" y="78" width="130" height="28" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="295" y="97" text-anchor="middle">P1 ~1 GB</text>' +
		'<text x="295" y="126" text-anchor="middle">⋮</text>' +
		'<rect x="230" y="136" width="130" height="28" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="295" y="155" text-anchor="middle">P9 ~1 GB</text>' +
		'<text x="295" y="184" text-anchor="middle" class="lbl">spilled: write n, read n back</text>' +
		// aggregate one partition at a time
		'<path d="M 360 92 L 426 92" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDK10)"/>' +
		'<text x="393" y="84" text-anchor="middle" class="lbl">one at a time</text>' +
		'<rect x="430" y="64" width="110" height="56" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="485" y="88" text-anchor="middle">RAM: m</text>' +
		'<text x="485" y="108" text-anchor="middle">aggregate P_i</text>' +
		'<text x="485" y="146" text-anchor="middle" class="lbl">same key → same partition,</text>' +
		'<text x="485" y="162" text-anchor="middle" class="lbl">so merging is concatenation</text>' +
		'<text x="20" y="214" class="lbl">extra I/O per pass = write n + read n = 2n — linear degradation, not an out-of-memory cliff</text>' +
		'<defs><marker id="dgArrowDK10" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'out-of-core-spill',
		title: 'Out-of-Core: When Data Outgrows RAM',
		nav: 'out of core spill',
		difficulty: 'Hard',
		category: 'Execution',
		task: 'Implement the grace-hash planning arithmetic (PartitionCount, RecursionDepth, SpillBytes) and PartitionedGroupSum: a GROUP BY that never holds more groups than the budget.',

		prose: [
			'<h2>Out-of-Core: When Data Outgrows RAM</h2>' +
			'<p>A <code>GROUP BY user_id</code> over a year of events runs fine in ' +
			'staging and dies in production: the container gets OOM-killed at ' +
			'96% through the scan, because production has 400 million distinct ' +
			'users and staging has 40 thousand. The hash table of groups — not ' +
			'the input — is what outgrew RAM, and it did so as a cliff: fine, ' +
			'fine, fine, dead. Engines that survive this moment all use the same ' +
			'trick, <em>grace hash partitioning</em>: if the working state won’t ' +
			'fit, split the <em>data</em> by hash first so each piece’s state ' +
			'fits, and pay for the split with sequential I/O instead of with ' +
			'your life:</p>' +
			'<ul>' +
			'<li><strong>Partition.</strong> Stream the input once, routing each ' +
			'row to partition <code>fnv1a(key) % p</code>, and spill partitions ' +
			'to disk. Every row with a given key lands in the same partition — ' +
			'that is the whole correctness argument.</li>' +
			'<li><strong>How many partitions?</strong> If <code>n</code> bytes of ' +
			'state must squeeze into <code>m</code> bytes of memory, ' +
			'<code>p&nbsp;=&nbsp;ceil(n/m)</code> partitions of ~<code>n/p</code> ' +
			'each will individually fit. (Simplifications we state and keep: the ' +
			'hash balances perfectly, and partition output buffers are free. ' +
			'Real engines add a fudge factor — more on that below.)</li>' +
			'<li><strong>Finish one piece at a time.</strong> Read partition 0 ' +
			'back, aggregate it entirely in RAM, emit its groups, drop the ' +
			'table, move to partition 1. Peak memory is one partition’s state, ' +
			'never the whole query’s.</li>' +
			'<li><strong>Recursion is the safety net.</strong> If a partition ' +
			'still doesn’t fit, partition <em>it</em> again with the same ' +
			'fan-out. Each pass rewrites the oversized data once: write ' +
			'<code>n</code>, read <code>n</code> back — <code>2n</code> extra ' +
			'I/O per pass, so <code>SpillBytes = 2 · n · depth</code>. Linear ' +
			'degradation, not a cliff.</li>' +
			'<li><strong>Merging is free.</strong> Same key → same partition, so ' +
			'partitions produce <em>disjoint</em> group sets; the final result ' +
			'is just their concatenation (sorted here, for determinism).</li>' +
			'</ul>',
			{ lang: 'txt', code: 'n = 10 GB of group state, m = 1 GB of memory\n\nPartitionCount(10 GB, 1 GB) = ceil(10/1) = 10 partitions of ~1 GB\npass 1: scatter-write 10 GB into P0..P9, read 10 GB back  ->  depth = 1\nSpillBytes = 2 * 10 GB * 1 = 20 GB extra sequential I/O\n\nfits-in-RAM case: n = 64 MB, m = 1 GB  ->  1 partition, depth 0, spill 0\nthe cliff, replaced: 10x too much data costs 2 extra scans — not a kill -9' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p><strong>Part A — the planner’s arithmetic</strong> (pure integer ' +
			'math, ceil via <code>(a+b-1)/b</code>): <code>PartitionCount(n, ' +
			'm)</code> = <code>ceil(n/m)</code>; <code>RecursionDepth(n, m)</code> ' +
			'— with fixed fan-out <code>f = ceil(n/m)</code>, repeatedly divide ' +
			'the oversized size by <code>f</code> (rounding up) until it fits in ' +
			'<code>m</code>, counting passes, with <code>f &lt;= 1</code> meaning ' +
			'depth 0; <code>SpillBytes(n, m)</code> = <code>2 · n · ' +
			'depth</code>.</p>' +
			'<p><strong>Part B — actually doing it</strong>: ' +
			'<code>PartitionedGroupSum(keys, vals, distinctEstimate, ' +
			'budgetGroups)</code>. Choose <code>numPartitions = ' +
			'ceil(distinctEstimate / budgetGroups)</code> (minimum 1), route row ' +
			'<code>i</code> to <code>fnv1a(keys[i]) % numPartitions</code> ' +
			'(FNV-1a over the key’s bytes: offset basis 14695981039346656037, ' +
			'prime 1099511628211 — provided in the starter), aggregate each ' +
			'partition’s sums independently, and return the merged groups ' +
			'<strong>sorted by key</strong> plus the per-partition distinct-group ' +
			'counts <strong>sorted ascending</strong> — the receipt proving no ' +
			'partition ever held more than the budget.</p>',
			'<div class="tip">The pin to keep: out-of-core execution costs ' +
			'<code>O(n)</code> extra I/O <em>per pass</em>, and one pass almost ' +
			'always suffices. An aggregation 10x too big for RAM does not run ' +
			'10x slower — it runs one scatter and one gather slower. That is why ' +
			'DuckDB can finish a 100 GB join on a laptop while engines without ' +
			'spilling just die.</div>',
		],

		starter: [
			'package main',
			'',
			'// Group is one merged GROUP BY result row.',
			'type Group struct {',
			'	Key string',
			'	Sum int64',
			'}',
			'',
			'// fnv1aStr hashes a key\'s bytes with FNV-1a. Provided: partition',
			'// routing must be deterministic and identical for every learner,',
			'// so the mixing function is fixed.',
			'func fnv1aStr(s string) uint64 {',
			'	h := uint64(14695981039346656037)',
			'	for i := 0; i < len(s); i++ {',
			'		h ^= uint64(s[i])',
			'		h *= 1099511628211',
			'	}',
			'	return h',
			'}',
			'',
			'// PartitionCount is ceil(n/m): the fan-out that makes each',
			'// partition\'s share of n bytes fit in m bytes of memory (assuming',
			'// perfect hash balance). n <= 0 or m <= 0 returns 0.',
			'func PartitionCount(n, m int64) int64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// RecursionDepth counts partitioning passes: with fixed fan-out',
			'// f = ceil(n/m), divide the oversized size by f (rounding up)',
			'// until it is <= m, counting iterations. f <= 1 (already fits, or',
			'// m <= 0) means depth 0.',
			'func RecursionDepth(n, m int64) int64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// SpillBytes is the extra I/O bill: each pass writes n bytes out',
			'// and reads n bytes back, so 2 * n * RecursionDepth(n, m).',
			'func SpillBytes(n, m int64) int64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// PartitionedGroupSum computes SUM(vals) GROUP BY keys without ever',
			'// holding more than budgetGroups distinct groups at once:',
			'//',
			'//   - numPartitions = ceil(distinctEstimate / budgetGroups), min 1',
			'//   - row i goes to partition fnv1aStr(keys[i]) % numPartitions',
			'//   - aggregate each partition independently, then merge',
			'//   - returns groups sorted by Key, and the per-partition',
			'//     distinct-group counts sorted ascending',
			'func PartitionedGroupSum(keys []string, vals []int64, distinctEstimate, budgetGroups int64) ([]Group, []int64) {',
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
			'func main() {',
			'	// One deterministic line per Part B call: sorted per-partition',
			'	// group counts (the budget receipt) plus the merged, sorted',
			'	// groups. String expectations keep failures readable.',
			'	fmtGroups := func(groups []Group, counts []int64) string {',
			'		gs := make([]string, 0, len(groups))',
			'		for _, g := range groups {',
			'			gs = append(gs, fmt.Sprintf("%s:%d", g.Key, g.Sum))',
			'		}',
			'		cs := make([]string, 0, len(counts))',
			'		for _, c := range counts {',
			'			cs = append(cs, fmt.Sprintf("%d", c))',
			'		}',
			'		return fmt.Sprintf("parts=[%s] groups=[%s]",',
			'			strings.Join(cs, " "), strings.Join(gs, " "))',
			'	}',
			'',
			'	// 12 rows, 8 distinct keys, vals 1..12 — small enough to check',
			'	// by hand, shaped so a budget of 3 forces 3 partitions.',
			'	keys := []string{"us", "de", "fr", "jp", "br", "de", "us", "gb", "cn", "mx", "fr", "us"}',
			'	vals := []int64{1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"PartitionCount(1000, 100): 10x too big -> 10 partitions",',
			'			"10",',
			'			func() string { return fmt.Sprintf("%d", PartitionCount(1000, 100)) }},',
			'		{"PartitionCount(250, 100): ceil, not floor -> 3 (two full + one partial)",',
			'			"3",',
			'			func() string { return fmt.Sprintf("%d", PartitionCount(250, 100)) }},',
			'		{"PartitionCount(64, 100): fits -> a single partition",',
			'			"1",',
			'			func() string { return fmt.Sprintf("%d", PartitionCount(64, 100)) }},',
			'		{"RecursionDepth(64, 100): already fits, no pass at all",',
			'			"0",',
			'			func() string { return fmt.Sprintf("%d", RecursionDepth(64, 100)) }},',
			'		{"RecursionDepth(10 GB, 1 GB): fan-out 10 -> one pass and every partition fits",',
			'			"1",',
			'			func() string { return fmt.Sprintf("%d", RecursionDepth(10000000000, 1000000000)) }},',
			'		{"SpillBytes(64, 100): in-memory queries pay zero I/O tax",',
			'			"0",',
			'			func() string { return fmt.Sprintf("%d", SpillBytes(64, 100)) }},',
			'		{"SpillBytes(10 GB, 1 GB): write 10 GB + read 10 GB = 20 GB extra, once",',
			'			"20000000000",',
			'			func() string { return fmt.Sprintf("%d", SpillBytes(10000000000, 1000000000)) }},',
			'		{"PartitionedGroupSum: 8 distinct keys, budget 3 -> 3 partitions of 2/3/3 groups, correct sorted sums",',
			'			"parts=[2 3 3] groups=[br:5 cn:9 de:8 fr:14 gb:8 jp:4 mx:10 us:20]",',
			'			func() string {',
			'				g, c := PartitionedGroupSum(keys, vals, 8, 3)',
			'				return fmtGroups(g, c)',
			'			}},',
			'		{"budget roomy (2 distinct, budget 8): one partition — degenerates to a plain one-pass GROUP BY",',
			'			"parts=[2] groups=[a:4 b:2]",',
			'			func() string {',
			'				g, c := PartitionedGroupSum([]string{"a", "b", "a"}, []int64{1, 2, 3}, 2, 8)',
			'				return fmtGroups(g, c)',
			'			}},',
			'		{"empty input: one empty partition, no groups, no panic",',
			'			"parts=[0] groups=[]",',
			'			func() string {',
			'				g, c := PartitionedGroupSum([]string{}, []int64{}, 0, 3)',
			'				return fmtGroups(g, c)',
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
			'import "sort"',
			'',
			'// The solution replaces the starter wholesale, so the type and the',
			'// hash are redeclared here.',
			'',
			'// Group is one merged GROUP BY result row.',
			'type Group struct {',
			'	Key string',
			'	Sum int64',
			'}',
			'',
			'// fnv1aStr hashes a key\'s bytes with FNV-1a: xor a byte in,',
			'// multiply by the prime. Fixed so partition routing is identical',
			'// everywhere.',
			'func fnv1aStr(s string) uint64 {',
			'	h := uint64(14695981039346656037)',
			'	for i := 0; i < len(s); i++ {',
			'		h ^= uint64(s[i])',
			'		h *= 1099511628211',
			'	}',
			'	return h',
			'}',
			'',
			'// PartitionCount is ceil(n/m) in pure integer math. The guard',
			'// returns 0 for nonsense inputs instead of dividing by zero — the',
			'// planner treats 0 as "nothing to do".',
			'func PartitionCount(n, m int64) int64 {',
			'	if n <= 0 || m <= 0 {',
			'		return 0',
			'	}',
			'	return (n + m - 1) / m',
			'}',
			'',
			'// RecursionDepth simulates the passes rather than solving the',
			'// logarithm: cur starts at n and each pass divides it by the fixed',
			'// fan-out f (rounding up — a partition holds the ceiling of its',
			'// share). The loop terminates because f >= 2 strictly shrinks cur.',
			'// With f = ceil(n/m) one pass in fact always lands within m',
			'// (ceil(n/ceil(n/m)) <= m is an identity), so this returns 0 or 1',
			'// here — the loop implements the general contract, which matters',
			'// the moment fan-out is capped below ceil(n/m). See the notes.',
			'func RecursionDepth(n, m int64) int64 {',
			'	if m <= 0 {',
			'		return 0',
			'	}',
			'	f := (n + m - 1) / m',
			'	if f <= 1 {',
			'		return 0',
			'	}',
			'	cur := n',
			'	var d int64',
			'	for cur > m {',
			'		cur = (cur + f - 1) / f',
			'		d++',
			'	}',
			'	return d',
			'}',
			'',
			'// SpillBytes prices the spill: every pass streams the oversized',
			'// data out (write n) and back (read n). Sequential both ways —',
			'// which is exactly why engines tolerate it.',
			'func SpillBytes(n, m int64) int64 {',
			'	return 2 * n * RecursionDepth(n, m)',
			'}',
			'',
			'// PartitionedGroupSum is grace hash aggregation in miniature: the',
			'// "spilled partitions" are in-memory slices, but the discipline is',
			'// real — no step ever holds more distinct groups than the budget.',
			'func PartitionedGroupSum(keys []string, vals []int64, distinctEstimate, budgetGroups int64) ([]Group, []int64) {',
			'	// Fan-out from the ESTIMATE, not the truth: a planner never',
			'	// knows the real distinct count up front. Minimum 1 keeps the',
			'	// modulo total and makes the roomy case a plain one-pass',
			'	// GROUP BY.',
			'	numP := int64(1)',
			'	if distinctEstimate > 0 && budgetGroups > 0 {',
			'		numP = (distinctEstimate + budgetGroups - 1) / budgetGroups',
			'	}',
			'	if numP < 1 {',
			'		numP = 1',
			'	}',
			'	np := int(numP)',
			'',
			'	// Scatter pass — the part that would stream to disk at scale.',
			'	// Guard against ragged inputs by walking the shorter length.',
			'	n := len(keys)',
			'	if len(vals) < n {',
			'		n = len(vals)',
			'	}',
			'	partKeys := make([][]string, np)',
			'	partVals := make([][]int64, np)',
			'	for i := 0; i < n; i++ {',
			'		p := int(fnv1aStr(keys[i]) % uint64(np))',
			'		partKeys[p] = append(partKeys[p], keys[i])',
			'		partVals[p] = append(partVals[p], vals[i])',
			'	}',
			'',
			'	// Gather pass: one partition\'s hash table at a time. sums is',
			'	// rebuilt per partition — THIS is the memory ceiling, and why',
			'	// the same key must never appear in two partitions (its sum',
			'	// would fragment and the merge would need re-aggregation).',
			'	groups := []Group{}',
			'	counts := make([]int64, 0, np)',
			'	for p := 0; p < np; p++ {',
			'		sums := map[string]int64{}',
			'		for i := 0; i < len(partKeys[p]); i++ {',
			'			sums[partKeys[p][i]] += partVals[p][i]',
			'		}',
			'		counts = append(counts, int64(len(sums)))',
			'		for k, s := range sums {',
			'			groups = append(groups, Group{Key: k, Sum: s})',
			'		}',
			'	}',
			'',
			'	// Map iteration order is random; both outputs are sorted so the',
			'	// result is a pure function of the inputs. Counts sort as the',
			'	// budget receipt — max(counts) <= budgetGroups is the claim.',
			'	sort.Slice(groups, func(i, j int) bool { return groups[i].Key < groups[j].Key })',
			'	sort.Slice(counts, func(i, j int) bool { return counts[i] < counts[j] })',
			'	return groups, counts',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What DuckDB actually does</h3>' +
			'<p>DuckDB treats larger-than-memory execution as a core feature, not ' +
			'an error path. Aggregations, joins, sorts, and window functions all ' +
			'have spilling variants, coordinated through a buffer manager with a ' +
			'memory limit (default ~80% of RAM). The shapes match this ' +
			'exercise:</p>' +
			'<ul>' +
			'<li><strong>Radix partitioning everywhere.</strong> Hash ' +
			'aggregations and hash joins partition by hash bits <em>up front</em> ' +
			'— even when everything fits — because per-partition hash tables are ' +
			'cache-friendly and give threads private work. When memory runs out, ' +
			'the coldest partitions spill to the temp file; already-partitioned ' +
			'data means spilling is just "write this partition\'s buffers out", ' +
			'no reshuffle. Grace hash falls out of the parallel design almost ' +
			'for free.</li>' +
			'<li><strong>The fudge factors we waved away.</strong> Real hash ' +
			'tables carry pointers, empty slots, and skew: the planner multiplies ' +
			'estimated state by a constant and rounds fan-out up to a power of ' +
			'two (radix bits). Perfect balance is the other lie — one hot key ' +
			'(think <code>user_id = NULL</code>) can make a partition that never ' +
			'fits no matter how deep you recurse, which is why real engines pair ' +
			'partitioning with a fallback for pathological skew.</li>' +
			'<li><strong>Why depth is almost always 1.</strong> With fan-out ' +
			'<code>ceil(n/m)</code>, one pass provably lands every partition ' +
			'within <code>m</code> — you saw it in the arithmetic. Recursion ' +
			'exists because fan-out is <em>capped</em>: each partition needs an ' +
			'output buffer resident in that same memory <code>m</code>, so you ' +
			'cannot scatter 10&nbsp;000 ways with 100 buffers\' worth of RAM. ' +
			'Capped fan-out (say 64) turns a 10&nbsp;000x overflow into ' +
			'<code>log_64</code> passes — still just 3 scans of the data. The ' +
			'iterative loop you wrote is that contract.</li>' +
			'<li><strong>Sorting spills too, differently.</strong> The other ' +
			'classic out-of-core algorithm is external merge sort: sort ' +
			'memory-sized runs, spill each, k-way merge. Same ' +
			'<code>2n</code>-per-pass I/O bill, different mechanism — DuckDB ' +
			'uses it for <code>ORDER BY</code>, and its window operator picks ' +
			'between hash partitioning and sorting depending on the frame.</li>' +
			'</ul>' +
			'<h3>When the mechanism loses</h3>' +
			'<p>Spilling buys survival, not speed. If the <em>output</em> is huge ' +
			'— a GROUP BY whose result is nearly one group per row — every ' +
			'partition\'s table is nearly as big as its input and you paid ' +
			'<code>2n</code> of I/O to learn it (pre-aggregation before the ' +
			'scatter softens this: combine duplicates while the budget lasts, ' +
			'spill partially-combined state). If rows arrive pre-sorted or ' +
			'pre-partitioned on the key, hashing wastes the order a streaming ' +
			'aggregate could have used for O(1) memory. And on spinning disks or ' +
			'network storage the "sequential I/O is cheap" premise weakens — the ' +
			'20 GB tax is linear, but the constant in front of it is your ' +
			'device\'s bandwidth.</p>' +
			'<p>The engineering pin: the difference between an engine that ' +
			'handles 10x-too-big data and one that OOMs is not cleverness, it is ' +
			'this <em>plan</em> — a fan-out formula, a spill bill you can price ' +
			'in advance (<code>2·n·depth</code>), and the discipline that every ' +
			'in-memory structure is bounded by construction, never by hope.</p>',
		],
		complexity: { time: 'O(rows) to scatter + O(rows) to gather, plus O(groups log groups) for the deterministic sort', space: 'O(budgetGroups) live aggregation state — the whole point — plus the partitioned rows standing in for disk' },
	});
})();
