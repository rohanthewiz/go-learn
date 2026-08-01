/* Hash Aggregation: GROUP BY at Scale — Execution (Medium). How every
 * analytical engine turns GROUP BY into one pass: FNV-1a hashes the group key,
 * an open-addressing table (power-of-two capacity, linear probing) holds one
 * accumulator per group, and SUM/COUNT/MIN/MAX fold in as rows stream by. The
 * harness pins the FNV-1a constants against known vectors, interleaved keys
 * folding into sorted groups, a growth-forcing 100-key run, and the empty
 * input that must return empty rather than panic.
 */
(function () {
	'use strict';
	var T = GoLearnDK;

	// Keys hashing into a cap-8 slot array; "ca" and "tx" really do collide
	// at slot 1 under FNV-1a (&7), and the probe walks right. Marker id
	// namespaced (dgArrowDK07) because every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="three group keys hash into an eight-slot open-addressing table; ca and tx collide at slot one and tx linear-probes right into slot two">' +
		'<text x="20" y="20" class="lbl">open addressing: hash &amp; (cap&#8722;1) picks a slot; a collision walks right to the next empty</text>' +
		// incoming keys with their real FNV-1a slots (cap 8)
		'<text x="130" y="52" text-anchor="middle">&#8220;ny&#8221;</text>' +
		'<text x="130" y="68" text-anchor="middle" class="lbl">h&amp;7 = 0</text>' +
		'<text x="290" y="52" text-anchor="middle">&#8220;ca&#8221;</text>' +
		'<text x="290" y="68" text-anchor="middle" class="lbl">h&amp;7 = 1</text>' +
		'<text x="430" y="52" text-anchor="middle">&#8220;tx&#8221;</text>' +
		'<text x="430" y="68" text-anchor="middle" class="lbl" style="fill:var(--warn)">h&amp;7 = 1 too!</text>' +
		// the 8 slots
		'<rect x="40" y="100" width="56" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="68" y="125" text-anchor="middle" class="lbl">ny</text>' +
		'<rect x="100" y="100" width="56" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="128" y="125" text-anchor="middle" class="lbl">ca</text>' +
		'<rect x="160" y="100" width="56" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="188" y="125" text-anchor="middle" class="lbl">tx</text>' +
		'<rect x="220" y="100" width="56" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.2"/>' +
		'<rect x="280" y="100" width="56" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.2"/>' +
		'<rect x="340" y="100" width="56" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.2"/>' +
		'<rect x="400" y="100" width="56" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.2"/>' +
		'<rect x="460" y="100" width="56" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.2"/>' +
		'<text x="68" y="156" text-anchor="middle" class="lbl">0</text>' +
		'<text x="128" y="156" text-anchor="middle" class="lbl">1</text>' +
		'<text x="188" y="156" text-anchor="middle" class="lbl">2</text>' +
		'<text x="248" y="156" text-anchor="middle" class="lbl">3</text>' +
		'<text x="308" y="156" text-anchor="middle" class="lbl">4</text>' +
		'<text x="368" y="156" text-anchor="middle" class="lbl">5</text>' +
		'<text x="428" y="156" text-anchor="middle" class="lbl">6</text>' +
		'<text x="488" y="156" text-anchor="middle" class="lbl">7</text>' +
		// hash assignments (plain accent lines) and the probe (warn, arrowed)
		'<line x1="130" y1="74" x2="72" y2="100" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<line x1="290" y1="74" x2="132" y2="100" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<path d="M 430 74 C 400 92 240 60 138 96" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 3"/>' +
		'<path d="M 128 92 C 150 78 172 82 186 96" fill="none" stroke="var(--warn)" stroke-width="1.8" marker-end="url(#dgArrowDK07)"/>' +
		'<text x="160" y="80" text-anchor="middle" class="lbl" style="fill:var(--warn)">slot 1 taken &#8594; probe +1</text>' +
		'<text x="20" y="196" class="lbl">power-of-two capacity: slot = hash &amp; (cap&#8722;1) is a single AND — no modulo, no division</text>' +
		'<defs><marker id="dgArrowDK07" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'hash-aggregation',
		title: 'Hash Aggregation: GROUP BY at Scale',
		nav: 'hash aggregation',
		difficulty: 'Medium',
		category: 'Execution',
		task: 'Implement FNV-1a and a GROUP BY over an open-addressing hash table: power-of-two capacity, linear probing, grow at 70% load, one {Sum, Count, Min, Max} accumulator per group, output sorted by key.',

		prose: [
			'<h2>Hash Aggregation: GROUP BY at Scale</h2>' +
			'<p>A 40&nbsp;GB CSV of click events, and the question is one line: ' +
			'<code>SELECT country, count(*), sum(ms) GROUP BY country</code>. DuckDB ' +
			'answers it on a laptop in under a minute, streaming the file once and ' +
			'never holding more than ~200 groups&rsquo; worth of state. The naive ' +
			'plan — sort 40&nbsp;GB by country, then walk the runs — would spend all ' +
			'its time in the sort. The trick is the oldest one in databases: a hash ' +
			'table mapping group key &rarr; accumulator, folding each row in as it ' +
			'streams past. Aggregation state is tiny even when the input is huge, ' +
			'because its size tracks the number of <em>groups</em>, not rows.</p>' +
			'<ul>' +
			'<li><strong>Hash the key: FNV-1a.</strong> Start from the offset basis ' +
			'<code>14695981039346656037</code>; for each byte, XOR it in, then ' +
			'multiply by the prime <code>1099511628211</code> (mod 2<sup>64</sup>, ' +
			'which <code>uint64</code> gives you for free). XOR-then-multiply lets ' +
			'every byte perturb all 64 bits after a few rounds — simple, fast, ' +
			'and good enough diffusion for table addressing.</li>' +
			'<li><strong>Power-of-two capacity + mask.</strong> With ' +
			'<code>cap = 2&#7511;</code>, the slot is <code>hash &amp; (cap-1)</code> ' +
			'— a one-cycle AND. Integer division (what <code>%</code> costs when ' +
			'the divisor is not a constant power of two) is 20-90 cycles; on the ' +
			'per-row hot path of a scan over billions of rows, that is the whole ' +
			'game.</li>' +
			'<li><strong>Collisions: linear probing.</strong> Two keys can land on ' +
			'one slot (below, <code>"ca"</code> and <code>"tx"</code> really both ' +
			'hash to slot&nbsp;1 of 8). Open addressing stores entries <em>in</em> ' +
			'the slot array: on a collision, step to the next slot (wrapping via ' +
			'the same mask) until you find the key or an empty slot. Sequential ' +
			'probes ride the cache line you already paid for — no linked-list ' +
			'chains, no pointer chasing.</li>' +
			'<li><strong>Load factor and growth.</strong> Probing degrades as the ' +
			'table fills (clusters merge; at 90%+ load, probes get long). Grow at ' +
			'70%: double the slot array and re-insert every entry under the new ' +
			'mask. Amortized O(1) per row, and the invariant &ldquo;an empty slot ' +
			'always exists&rdquo; is what guarantees every probe loop terminates.</li>' +
			'<li><strong>Accumulate, don&rsquo;t collect.</strong> The slot holds ' +
			'<code>{Sum, Count, Min, Max}</code> — a constant-size fold, updated in ' +
			'place. No row list per group, so a billion rows in 200 groups costs ' +
			'200 accumulators. (<code>AVG</code> is <code>Sum/Count</code> at the ' +
			'end; <code>MEDIAN</code> is not foldable this way, which is why it is ' +
			'expensive everywhere.)</li>' +
			'</ul>',
			{ lang: 'txt', code: 'stream: (ca,5) (ny,3) (ca,7) (tx,-2) (ny,10) (ca,1)      table cap = 8\n\nfnv1a("ca") & 7 = 1   slot 1 empty            -> ca{sum=5  n=1 min=5  max=5}\nfnv1a("ny") & 7 = 0   slot 0 empty            -> ny{sum=3  n=1 min=3  max=3}\n(ca,7)          = 1   slot 1 holds "ca": fold -> ca{sum=12 n=2 min=5  max=7}\nfnv1a("tx") & 7 = 1   slot 1 holds "ca" — COLLISION, probe slot 2: empty\n                                              -> tx{sum=-2 n=1 min=-2 max=-2}\n(ny,10)         = 0   fold                    -> ny{sum=13 n=2 min=3  max=10}\n(ca,1)          = 1   fold                    -> ca{sum=13 n=3 min=1  max=7}\n\nemit sorted by key: ca{13,3,1,7}  ny{13,2,3,10}  tx{-2,1,-2,-2}' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>fnv1a(s string) uint64</code> exactly to spec ' +
			'(offset basis <code>14695981039346656037</code>, prime ' +
			'<code>1099511628211</code>) and ' +
			'<code>GroupBy(keys []string, vals []int64) []Agg</code>: build the ' +
			'open-addressing table (start at capacity 8, grow by doubling when ' +
			'load would pass 70%), fold each row into its group&rsquo;s ' +
			'<code>{Sum, Count, Min, Max}</code>, and return the groups ' +
			'<strong>sorted by key</strong> — hash tables scatter keys by design, ' +
			'so deterministic output must be imposed on the way out. Empty input ' +
			'returns empty, never panics.</p>',
			'<div class="tip">The load-factor check belongs <em>before</em> the ' +
			'insert, not after: grow when the table <em>would</em> exceed 70%, and ' +
			'the probe loop that follows is guaranteed an empty slot to terminate ' +
			'on. Growing generously up front (say, sizing to the expected group ' +
			'count) trades memory for zero rehashes — engines with cardinality ' +
			'estimates do exactly that; lacking one, start small and double.</div>',
		],

		starter: [
			'package main',
			'',
			'// Agg is one group\'s accumulator: constant size no matter how many',
			'// rows fold into it. That is the entire memory story of hash',
			'// aggregation — state scales with groups, not input.',
			'type Agg struct {',
			'	Key   string',
			'	Sum   int64',
			'	Count int64',
			'	Min   int64',
			'	Max   int64',
			'}',
			'',
			'// fnv1a hashes s with 64-bit FNV-1a:',
			'//',
			'//	h = 14695981039346656037            (offset basis)',
			'//	for each byte b:  h ^= b; h *= 1099511628211   (FNV prime)',
			'//',
			'// XOR first, then multiply — that order is what makes it 1a (plain',
			'// FNV-1 multiplies first and diffuses the last byte worse). uint64',
			'// overflow IS the mod-2^64 the algorithm wants.',
			'func fnv1a(s string) uint64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// GroupBy folds (keys[i], vals[i]) pairs into per-key accumulators',
			'// using an open-addressing hash table:',
			'//',
			'//   - slots: []*Agg, capacity a power of two (start at 8), nil = empty',
			'//   - slot index: fnv1a(key) & (cap-1) — mask, not mod',
			'//   - collision: linear probe (i+1) & mask until key found or empty',
			'//   - grow (double + reinsert all) BEFORE an insert would pass 70% load',
			'//',
			'// Returns groups sorted by Key so output is deterministic; empty',
			'// input returns an empty slice, never panics.',
			'func GroupBy(keys []string, vals []int64) []Agg {',
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
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// Render groups compactly; group order is part of the contract',
			'	// (sorted by key), so the joined string pins it.',
			'	fmtGroups := func(gs []Agg) string {',
			'		if len(gs) == 0 {',
			'			return "(none)"',
			'		}',
			'		parts := make([]string, 0, len(gs))',
			'		for _, g := range gs {',
			'			parts = append(parts, fmt.Sprintf("%s{sum=%d n=%d min=%d max=%d}", g.Key, g.Sum, g.Count, g.Min, g.Max))',
			'		}',
			'		return strings.Join(parts, " ")',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"fnv1a(\\"\\") is the offset basis itself — no bytes, no rounds",',
			'			"14695981039346656037",',
			'			func() string { return fmt.Sprintf("%d", fnv1a("")) }},',
			'		{"fnv1a(\\"a\\") — one round: (basis XOR 97) * prime, mod 2^64",',
			'			"12638187200555641996",',
			'			func() string { return fmt.Sprintf("%d", fnv1a("a")) }},',
			'		{"fnv1a(\\"duckdb\\") — six rounds, a known vector",',
			'			"3556523707469332322",',
			'			func() string { return fmt.Sprintf("%d", fnv1a("duckdb")) }},',
			'		{"interleaved keys fold into per-group SUM/COUNT/MIN/MAX, emitted sorted",',
			'			"ca{sum=13 n=3 min=1 max=7} ny{sum=13 n=2 min=3 max=10} tx{sum=-2 n=1 min=-2 max=-2}",',
			'			func() string {',
			'				keys := []string{"ca", "ny", "ca", "tx", "ny", "ca"}',
			'				vals := []int64{5, 3, 7, -2, 10, 1}',
			'				return fmtGroups(GroupBy(keys, vals))',
			'			}},',
			'		{"single group: negatives exercise Min/Max independently of Sum",',
			'			"sensor-7{sum=-3 n=3 min=-9 max=4}",',
			'			func() string {',
			'				keys := []string{"sensor-7", "sensor-7", "sensor-7"}',
			'				vals := []int64{4, -9, 2}',
			'				return fmtGroups(GroupBy(keys, vals))',
			'			}},',
			'		{"one hot key, 1000 rows: the accumulator folds in place, the table never grows",',
			'			"hot{sum=2997 n=1000 min=0 max=6}",',
			'			func() string {',
			'				keys := make([]string, 1000)',
			'				vals := make([]int64, 1000)',
			'				for i := 0; i < 1000; i++ {',
			'					keys[i] = "hot"',
			'					vals[i] = int64(i % 7)',
			'				}',
			'				return fmtGroups(GroupBy(keys, vals))',
			'			}},',
			'		{"100 distinct keys from cap 8: multiple grow+rehash cycles, nothing lost",',
			'			"groups=100 first=k00 last=k99 total=4950",',
			'			func() string {',
			'				keys := make([]string, 100)',
			'				vals := make([]int64, 100)',
			'				for i := 0; i < 100; i++ {',
			'					keys[i] = fmt.Sprintf("k%02d", i)',
			'					vals[i] = int64(i)',
			'				}',
			'				gs := GroupBy(keys, vals)',
			'				// Guarded indexing: a stubbed GroupBy returns nil and',
			'				// must produce a wrong answer, never a panic.',
			'				first, last := "?", "?"',
			'				if len(gs) > 0 {',
			'					first = gs[0].Key',
			'					last = gs[len(gs)-1].Key',
			'				}',
			'				var total int64',
			'				for _, g := range gs {',
			'					total += g.Sum',
			'				}',
			'				return fmt.Sprintf("groups=%d first=%s last=%s total=%d", len(gs), first, last, total)',
			'			}},',
			'		{"empty input: no rows means no groups — and no panic",',
			'			"(none)",',
			'			func() string { return fmtGroups(GroupBy(nil, nil)) }},',
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
			'// Agg is one group\'s accumulator: constant size no matter how many',
			'// rows fold into it. That is the entire memory story of hash',
			'// aggregation — state scales with groups, not input.',
			'type Agg struct {',
			'	Key   string',
			'	Sum   int64',
			'	Count int64',
			'	Min   int64',
			'	Max   int64',
			'}',
			'',
			'// fnv1a: XOR the byte in, then multiply by the prime. Iterating',
			'// bytes (not runes) is deliberate — FNV is defined over octets, and',
			'// s[i] gives raw UTF-8 bytes without a decode pass.',
			'func fnv1a(s string) uint64 {',
			'	h := uint64(14695981039346656037)',
			'	for i := 0; i < len(s); i++ {',
			'		h ^= uint64(s[i])',
			'		h *= 1099511628211 // wraps mod 2^64, exactly as FNV specifies',
			'	}',
			'	return h',
			'}',
			'',
			'// aggTable is the open-addressing table: entries live IN the slot',
			'// array (nil = empty), so a probe sequence is a linear scan of',
			'// adjacent pointers — cache-friendly where bucket chains are not.',
			'// Capacity is always a power of two so the mask trick holds.',
			'type aggTable struct {',
			'	slots []*Agg',
			'	used  int',
			'}',
			'',
			'// upsert folds one (key, v) observation into its group, creating the',
			'// group on first sight. Growth happens BEFORE the probe: the check',
			'// guarantees at least ~30% of slots are empty, which is both the',
			'// probe loop\'s termination proof and its performance guarantee',
			'// (clusters stay short when the table stays sparse).',
			'func (t *aggTable) upsert(key string, v int64) {',
			'	if (t.used+1)*10 > len(t.slots)*7 { // integer form of load > 0.7',
			'		t.grow()',
			'	}',
			'	mask := uint64(len(t.slots) - 1)',
			'	i := fnv1a(key) & mask',
			'	for {',
			'		s := t.slots[i]',
			'		if s == nil {',
			'			// First row of a new group: the value seeds every',
			'			// aggregate, which is why Min/Max need no sentinel.',
			'			t.slots[i] = &Agg{Key: key, Sum: v, Count: 1, Min: v, Max: v}',
			'			t.used++',
			'			return',
			'		}',
			'		if s.Key == key {',
			'			// The hash only nominates a slot; the key comparison is',
			'			// the real test — collisions make this line mandatory.',
			'			s.Sum += v',
			'			s.Count++',
			'			if v < s.Min {',
			'				s.Min = v',
			'			}',
			'			if v > s.Max {',
			'				s.Max = v',
			'			}',
			'			return',
			'		}',
			'		i = (i + 1) & mask // linear probe, wrapping via the same mask',
			'	}',
			'}',
			'',
			'// grow doubles the slot array and re-inserts every live entry under',
			'// the new mask. Entries move wholesale (same *Agg, new slot): a',
			'// key\'s slot depends on the mask, so positions from the old table',
			'// mean nothing in the new one. Probes here need no key compare —',
			'// all keys are distinct by construction, only empty slots matter.',
			'func (t *aggTable) grow() {',
			'	old := t.slots',
			'	t.slots = make([]*Agg, len(old)*2)',
			'	mask := uint64(len(t.slots) - 1)',
			'	for _, s := range old {',
			'		if s == nil {',
			'			continue',
			'		}',
			'		i := fnv1a(s.Key) & mask',
			'		for t.slots[i] != nil {',
			'			i = (i + 1) & mask',
			'		}',
			'		t.slots[i] = s',
			'	}',
			'	// used is unchanged: growth moves entries, it never adds any.',
			'}',
			'',
			'// GroupBy streams the rows through the table once, then imposes',
			'// order on the way out. Sorting the output is not cosmetic: the',
			'// table scatters groups by hash, so identical inputs would',
			'// otherwise emit identical groups in an arbitrary-looking order.',
			'func GroupBy(keys []string, vals []int64) []Agg {',
			'	n := len(keys)',
			'	if len(vals) < n {',
			'		n = len(vals) // ragged input: fold only complete pairs, never index past either slice',
			'	}',
			'	t := &aggTable{slots: make([]*Agg, 8)} // cap 8: smallest power of two worth probing',
			'	for i := 0; i < n; i++ {',
			'		t.upsert(keys[i], vals[i])',
			'	}',
			'	out := make([]Agg, 0, t.used)',
			'	for _, s := range t.slots {',
			'		if s != nil {',
			'			out = append(out, *s)',
			'		}',
			'	}',
			'	sort.Slice(out, func(a, b int) bool { return out[a].Key < out[b].Key })',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why hash beats sort for GROUP BY</h3>' +
			'<p>Sort-based aggregation must order all n rows — O(n&nbsp;log&nbsp;n) ' +
			'comparisons and, worse, full materialization: every row exists in the ' +
			'sort buffer before the first group can emit. Hash aggregation is one ' +
			'O(n) pass holding only g accumulators (g&nbsp;=&nbsp;groups), and for ' +
			'analytics g&nbsp;&#8810;&nbsp;n is the normal case — millions of ' +
			'events, dozens of countries. The hash table also starts emitting with ' +
			'no epilogue beyond a walk of its slots, while the sort pays its ' +
			'O(n&nbsp;log&nbsp;n) before producing anything. Sort-based wins ' +
			'narrowly when the input is <em>already</em> ordered on the group key ' +
			'(then it is a trivial streaming fold — and an optimizer that knows ' +
			'the ordering will choose it) or when the aggregate itself needs order.</p>' +
			'<h3>What DuckDB actually does</h3>' +
			'<p>The mechanics you built, industrialized. Rows arrive as vectors of ' +
			'2048, so hashing is a tight loop over a batch of keys — hashes are ' +
			'computed for all 2048 rows into an array, then slots are resolved for ' +
			'the whole batch, amortizing per-call overhead and letting the compiler ' +
			'vectorize. The table stores group data row-wise in payload blocks with ' +
			'the hash cached next to each entry, so a probe compares 64-bit hashes ' +
			'first and touches key bytes only on a hash match. For parallelism, ' +
			'each thread builds a private table partitioned by the <em>high</em> ' +
			'radix bits of the hash (the low bits already picked the slot — reusing ' +
			'them would put every entry of a partition in a stripe of slots); ' +
			'partition i from every thread then merges without locks, because no ' +
			'other partition shares its keys. Two-level design: thread-local ' +
			'build, partition-wise merge.</p>' +
			'<h3>When the mechanism loses</h3>' +
			'<p>High cardinality is the failure mode: GROUP BY on a near-unique key ' +
			'(session id, order id) makes g&nbsp;&#8776;&nbsp;n, the table no longer ' +
			'fits in cache, and every probe is a random-access cache miss into a ' +
			'multi-gigabyte array — the sort&rsquo;s sequential access pattern ' +
			'suddenly looks competitive. Push g past memory and a straight hash ' +
			'aggregate simply cannot finish; the fix is the same radix ' +
			'partitioning worn as a different hat — spill whole partitions to ' +
			'disk and finish them one at a time, each small enough to hash in ' +
			'memory. That out-of-core move gets its own item later in this track.</p>' +
			'<h3>Details that bite in production</h3>' +
			'<p>Real engines do not use plain FNV-1a for the table — it is fine ' +
			'for teaching and checksums, but its byte-at-a-time serial multiply ' +
			'caps throughput, so DuckDB uses wider multiply-shift hashes over ' +
			'8-byte chunks. The load-factor/probing trade-off is also sharper than ' +
			'it looks: linear probing clusters — one long run absorbs its ' +
			'neighbors — which is why growth triggers at 70% rather than 90%, and ' +
			'why deletion (tombstones) is famously tricky in open addressing. ' +
			'Aggregation never deletes, which is precisely why open addressing ' +
			'suits it so well.</p>',
		],
		complexity: { time: 'O(n) expected to fold n rows (amortized growth included), plus O(g log g) to sort g groups for emission', space: 'O(g) — accumulators for g groups; the input is never materialized' },
	});
})();
