/* Hash Joins: Build & Probe — Execution (Medium). The workhorse equijoin of
 * every analytical engine: build a hash table over the SMALLER input, stream
 * the larger input past it. The harness pins the build-side rule from both
 * directions (the swap must actually happen), duplicate-key fan-out on the
 * build side, probe misses, and the empty-input edge — all against a
 * hand-rolled FNV-1a hash and a fully sorted, deterministic pair list.
 */
(function () {
	'use strict';
	var T = GoLearnDK;

	// Build/probe asymmetry: the small side pays for a hash table once, the
	// big side streams through it. Marker id namespaced (dgArrowDK08)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 204" width="540" height="204" role="img" aria-label="hash join: the smaller input is built into a hash table, the larger input streams past it and matches are emitted">' +
		'<text x="20" y="24" class="lbl">hash join: only the SMALLER side pays for a hash table — the larger side just streams</text>' +
		// the build side: small, becomes the in-memory table
		'<rect x="30" y="44" width="120" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="90" y="69" text-anchor="middle">build: 40 K</text>' +
		'<text x="90" y="100" text-anchor="middle" class="lbl">copied into the table</text>' +
		'<path d="M 150 64 L 246 64" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDK08)"/>' +
		// the hash table itself
		'<rect x="250" y="44" width="160" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="330" y="69" text-anchor="middle">fnv1a(key) → rows</text>' +
		'<text x="330" y="100" text-anchor="middle" class="lbl">buckets hold ALL rows per key</text>' +
		// the probe side: large, streams through
		'<rect x="30" y="130" width="120" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="90" y="155" text-anchor="middle">probe: 900 M</text>' +
		'<path d="M 150 150 C 210 150 260 122 300 90" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDK08)"/>' +
		'<path d="M 410 64 L 466 64" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDK08)"/>' +
		'<text x="474" y="60">matched</text>' +
		'<text x="474" y="76">pairs</text>' +
		'<text x="20" y="196" class="lbl">memory and build time ∝ smaller input; probing is a cheap streaming pass — that is why join order matters</text>' +
		'<defs><marker id="dgArrowDK08" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'hash-join-build-probe',
		title: 'Hash Joins: Build & Probe',
		nav: 'hash join build probe',
		difficulty: 'Medium',
		category: 'Execution',
		task: 'Implement HashJoin: build a hash table over the smaller input (tie: left), probe with the larger, emit sorted pairs plus build-side/hit/miss stats.',

		prose: [
			'<h2>Hash Joins: Build &amp; Probe</h2>' +
			'<p>The nightly ETL joins a 900-million-row clickstream table to a ' +
			'40,000-row campaign dimension, and one Tuesday the container dies: ' +
			'OOM-killed at 9 GB. <code>EXPLAIN</code> shows why — stale statistics ' +
			'convinced the optimizer the clickstream side was small, so the join ' +
			'built its hash table over <em>900 million rows</em> while 40 K ' +
			'dimension rows streamed past it. Same query, sides flipped: 200 MB. ' +
			'Nothing about the answer changed; only which input became the hash ' +
			'table. That is the entire economics of a hash join:</p>' +
			'<ul>' +
			'<li><strong>Build.</strong> Pick the smaller input (our rule: strictly ' +
			'smaller wins; on a tie, build the <em>left</em> side) and insert every ' +
			'row into a hash table keyed by the join key. Memory <em>and</em> build ' +
			'time are proportional to this side — it is the only side that gets ' +
			'materialized.</li>' +
			'<li><strong>Probe.</strong> Stream the larger side one row at a time: ' +
			'hash its key, look in that bucket, compare keys (the hash only ' +
			'narrows; equality decides). No allocation per probe row — this side ' +
			'can be arbitrarily large.</li>' +
			'<li><strong>Duplicate keys fan out.</strong> A bucket keeps ' +
			'<em>all</em> build rows with a given key, so a probe row matches every ' +
			'one of them — one output pair per match. This is how a join can emit ' +
			'more rows than either input has.</li>' +
			'<li><strong>Stats.</strong> A probe row that matches at least one ' +
			'build row is a <em>hit</em>; one that matches none is a <em>miss</em>. ' +
			'Build rows that never get probed are neither — nobody asked for ' +
			'them.</li>' +
			'<li><strong>Orientation survives the swap.</strong> Output pairs are ' +
			'always (key, left payload, right payload) no matter which side built — ' +
			'the build choice is an execution detail, never a semantic one.</li>' +
			'</ul>',
			{ lang: 'txt', code: 'left (2 rows)      right (5 rows)      smaller = left -> build over left\nkey payload        key payload\n1   a              1   x    probe 1 -> bucket{a}   hit  -> (1, a, x)\n2   b              1   y    probe 1 -> bucket{a}   hit  -> (1, a, y)\n                   2   z    probe 2 -> bucket{b}   hit  -> (2, b, z)\n                   3   w    probe 3 -> empty       miss\n                   4   v    probe 4 -> empty       miss\n\nstats: build=left  hits=3  misses=2   memory held: 2 rows, not 5' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>HashJoin(left, right)</code>. Choose the build side ' +
			'by the rule above, hash int64 keys with hand-rolled FNV-1a over their ' +
			'8 bytes little-endian (offset basis 14695981039346656037, prime ' +
			'1099511628211 — the starter provides it), handle duplicate build keys, ' +
			'and return the pairs <strong>sorted by key, then left payload, then ' +
			'right payload</strong> along with <code>JoinStats</code>: which side ' +
			'built, probe hits, probe misses.</p>',
			'<div class="tip">This is why join order matters even in a database ' +
			'with no indexes at all. There is no B-tree to win or lose — the hash ' +
			'table is built fresh per query, and its size is set entirely by which ' +
			'input you point the build phase at. Optimizers spend most of their ' +
			'effort on cardinality estimation for exactly this decision.</div>',
		],

		starter: [
			'package main',
			'',
			'// Row is one input row: an int64 join key plus an opaque payload.',
			'type Row struct {',
			'	Key     int64',
			'	Payload string',
			'}',
			'',
			'// Pair is one join result. Left and Right are the payloads from the',
			'// left and right INPUTS — regardless of which side was built.',
			'type Pair struct {',
			'	Key   int64',
			'	Left  string',
			'	Right string',
			'}',
			'',
			'// JoinStats reports the execution shape: BuildSide is "left" or',
			'// "right"; ProbeHits counts probe rows that matched at least one',
			'// build row; ProbeMisses counts probe rows that matched none.',
			'type JoinStats struct {',
			'	BuildSide   string',
			'	ProbeHits   int',
			'	ProbeMisses int',
			'}',
			'',
			'// fnv1aInt64 hashes the 8 bytes of an int64 little-endian with',
			'// FNV-1a. Provided: the lesson is the build/probe protocol, not the',
			'// mixing function.',
			'func fnv1aInt64(k int64) uint64 {',
			'	h := uint64(14695981039346656037)',
			'	u := uint64(k)',
			'	for i := 0; i < 8; i++ {',
			'		h ^= uint64(byte(u >> (8 * i)))',
			'		h *= 1099511628211',
			'	}',
			'	return h',
			'}',
			'',
			'// HashJoin equijoins left and right on Key.',
			'//',
			'//   - build side: the STRICTLY smaller input; tie -> left',
			'//   - hash table: hand-rolled (bucket slices or open addressing),',
			'//     keyed by fnv1aInt64; a bucket keeps ALL rows for a key',
			'//   - probe: stream the larger side; each probe row pairs with',
			'//     EVERY build row sharing its key (duplicate fan-out)',
			'//   - pairs are sorted by Key, then Left, then Right',
			'func HashJoin(left, right []Row) ([]Pair, JoinStats) {',
			'	// your code here',
			'	return nil, JoinStats{}',
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
			'	// One deterministic line per call: build choice, probe counters,',
			'	// sorted pair list. String-shaped expectations keep comparisons',
			'	// exact and failures readable.',
			'	fmtJoin := func(pairs []Pair, st JoinStats) string {',
			'		ps := make([]string, 0, len(pairs))',
			'		for _, p := range pairs {',
			'			ps = append(ps, fmt.Sprintf("%d:%s/%s", p.Key, p.Left, p.Right))',
			'		}',
			'		return fmt.Sprintf("build=%s hits=%d misses=%d [%s]",',
			'			st.BuildSide, st.ProbeHits, st.ProbeMisses, strings.Join(ps, " "))',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"left smaller (2 vs 5): build left, probe right; two misses on the probe side",',
			'			"build=left hits=3 misses=2 [1:a/x 1:a/y 2:b/z]",',
			'			func() string {',
			'				p, s := HashJoin(',
			'					[]Row{{1, "a"}, {2, "b"}},',
			'					[]Row{{1, "x"}, {1, "y"}, {2, "z"}, {3, "w"}, {4, "v"}})',
			'				return fmtJoin(p, s)',
			'			}},',
			'		{"right smaller (5 vs 2): the swap must happen — build right, probe LEFT; build-side key 99 never probed is NOT a miss",',
			'			"build=right hits=1 misses=4 [20:l2/r1]",',
			'			func() string {',
			'				p, s := HashJoin(',
			'					[]Row{{10, "l1"}, {20, "l2"}, {30, "l3"}, {40, "l4"}, {50, "l5"}},',
			'					[]Row{{20, "r1"}, {99, "r2"}})',
			'				return fmtJoin(p, s)',
			'			}},',
			'		{"duplicate keys on the build side fan out: one probe row, two pairs, ONE hit",',
			'			"build=right hits=1 misses=2 [7:p/d1 7:p/d2]",',
			'			func() string {',
			'				p, s := HashJoin(',
			'					[]Row{{7, "p"}, {8, "q"}, {9, "r"}},',
			'					[]Row{{7, "d1"}, {7, "d2"}})',
			'				return fmtJoin(p, s)',
			'			}},',
			'		{"tie (2 vs 2): the rule says build left",',
			'			"build=left hits=1 misses=1 [2:b/c]",',
			'			func() string {',
			'				p, s := HashJoin(',
			'					[]Row{{1, "a"}, {2, "b"}},',
			'					[]Row{{2, "c"}, {3, "d"}})',
			'				return fmtJoin(p, s)',
			'			}},',
			'		{"empty left: builds an empty table (0 < 1), every probe row misses",',
			'			"build=left hits=0 misses=1 []",',
			'			func() string {',
			'				p, s := HashJoin([]Row{}, []Row{{5, "z"}})',
			'				return fmtJoin(p, s)',
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
			'// The solution replaces the starter wholesale, so every type it',
			'// touches is redeclared here.',
			'',
			'// Row is one input row: an int64 join key plus an opaque payload.',
			'type Row struct {',
			'	Key     int64',
			'	Payload string',
			'}',
			'',
			'// Pair is one join result, always oriented (left payload, right',
			'// payload) — the build-side choice must not leak into the output.',
			'type Pair struct {',
			'	Key   int64',
			'	Left  string',
			'	Right string',
			'}',
			'',
			'// JoinStats reports the execution shape of one join.',
			'type JoinStats struct {',
			'	BuildSide   string',
			'	ProbeHits   int',
			'	ProbeMisses int',
			'}',
			'',
			'// fnv1aInt64 hashes the 8 bytes of an int64 little-endian with',
			'// FNV-1a: xor a byte in, multiply by the prime. Cheap, stateless,',
			'// and good enough dispersion for bucket selection.',
			'func fnv1aInt64(k int64) uint64 {',
			'	h := uint64(14695981039346656037)',
			'	u := uint64(k)',
			'	for i := 0; i < 8; i++ {',
			'		h ^= uint64(byte(u >> (8 * i)))',
			'		h *= 1099511628211',
			'	}',
			'	return h',
			'}',
			'',
			'// HashJoin equijoins left and right on Key via build/probe.',
			'func HashJoin(left, right []Row) ([]Pair, JoinStats) {',
			'	// Build-side choice: strictly smaller wins, tie goes left. This',
			'	// one comparison is the "join order" decision — the hash table\'s',
			'	// memory footprint and build time are set right here.',
			'	build, probe := left, right',
			'	side := "left"',
			'	if len(right) < len(left) {',
			'		build, probe = right, left',
			'		side = "right"',
			'	}',
			'',
			'	// Bucket-slice table sized to the next power of two >= 2x the',
			'	// build rows: a power of two turns the modulo into a mask, and',
			'	// ~0.5 load factor keeps bucket chains short. Buckets store row',
			'	// INDEXES, not copies — the build slice already owns the data.',
			'	nb := 1',
			'	for nb < 2*len(build) {',
			'		nb <<= 1',
			'	}',
			'	mask := uint64(nb - 1)',
			'	buckets := make([][]int, nb)',
			'	for i := 0; i < len(build); i++ {',
			'		b := int(fnv1aInt64(build[i].Key) & mask)',
			'		buckets[b] = append(buckets[b], i)',
			'	}',
			'',
			'	// Probe: the streaming pass. Hash narrows to one bucket; the key',
			'	// comparison decides (different keys can share a bucket). A probe',
			'	// row pairs with EVERY matching build row — duplicate fan-out —',
			'	// but counts as a single hit.',
			'	pairs := []Pair{}',
			'	hits, misses := 0, 0',
			'	for _, pr := range probe {',
			'		b := int(fnv1aInt64(pr.Key) & mask)',
			'		matched := false',
			'		for _, bi := range buckets[b] {',
			'			br := build[bi]',
			'			if br.Key != pr.Key {',
			'				continue',
			'			}',
			'			matched = true',
			'			// Re-orient on emit: if the left input built, the build',
			'			// row supplies the LEFT payload; after a swap it supplies',
			'			// the RIGHT. The caller never sees which side built.',
			'			if side == "left" {',
			'				pairs = append(pairs, Pair{pr.Key, br.Payload, pr.Payload})',
			'			} else {',
			'				pairs = append(pairs, Pair{pr.Key, pr.Payload, br.Payload})',
			'			}',
			'		}',
			'		if matched {',
			'			hits++',
			'		} else {',
			'			misses++',
			'		}',
			'	}',
			'',
			'	// Emission order otherwise depends on probe order and bucket',
			'	// layout — an execution accident. Sorting by (key, left, right)',
			'	// makes the result a pure function of the inputs.',
			'	sort.Slice(pairs, func(i, j int) bool {',
			'		if pairs[i].Key != pairs[j].Key {',
			'			return pairs[i].Key < pairs[j].Key',
			'		}',
			'		if pairs[i].Left != pairs[j].Left {',
			'			return pairs[i].Left < pairs[j].Left',
			'		}',
			'		return pairs[i].Right < pairs[j].Right',
			'	})',
			'	return pairs, JoinStats{BuildSide: side, ProbeHits: hits, ProbeMisses: misses}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What DuckDB actually does</h3>' +
			'<p>The build-side choice is made by the <em>optimizer</em>, not the ' +
			'executor: during join-order enumeration it estimates the cardinality ' +
			'of every intermediate result and arranges the join tree so small ' +
			'relations feed build sides and the big fact table streams through as ' +
			'the probe of last resort. When the estimate is wrong — stale stats, a ' +
			'filter the model mispredicts, a join that fans out unexpectedly — you ' +
			'get exactly the OOM story from the intro: the mechanism is fine, the ' +
			'<em>choice</em> was fed bad numbers.</p>' +
			'<ul>' +
			'<li><strong>Partitioned (radix) hash joins.</strong> A single big ' +
			'hash table is cache-hostile and hard to parallelize. DuckDB radix- ' +
			'partitions both sides by hash bits first, giving every thread its own ' +
			'partition pair whose hash table fits in cache — same build/probe ' +
			'protocol you wrote, run many times on small pieces.</li>' +
			'<li><strong>The same partitioning is the spill plan.</strong> If the ' +
			'build side overflows memory anyway, partitions are spilled and ' +
			'processed one at a time — grace hash join, the subject of the ' +
			'out-of-core item. Build-side size stops being a cliff and becomes a ' +
			'throughput knob.</li>' +
			'<li><strong>Filters flow backwards.</strong> After building, the ' +
			'engine knows exactly which keys exist — so it can hand the probe-side ' +
			'scan a Bloom-style filter and skip reading rows (even whole row ' +
			'groups) whose keys cannot match. The join gets faster by making the ' +
			'<em>scan</em> smaller.</li>' +
			'</ul>' +
			'<h3>When hash join loses</h3>' +
			'<p>Hash join is the default, not a law. If both inputs are already ' +
			'sorted on the key, a merge join skips the build entirely. If one side ' +
			'is a handful of rows, a nested-loop scan beats paying the hash-table ' +
			'setup. For inequality predicates (<code>a.ts BETWEEN b.lo AND ' +
			'b.hi</code>) hashing does not apply — equality is what makes ' +
			'bucketing meaningful. And with heavy duplicate fan-out on ' +
			'<em>both</em> sides, the output itself (|matches| pairs) dominates ' +
			'everything — no algorithm saves you from a result that is simply ' +
			'huge.</p>' +
			'<p>One more field note: the reported <em>misses</em> are not waste, ' +
			'they are information. A probe-miss rate near 100% means the join is ' +
			'mostly filtering — the classic star-schema pattern where the ' +
			'dimension table\'s WHERE clause shrank the build side, and the join ' +
			'exists to keep only matching facts. Engines exploit that shape ' +
			'aggressively; so should query authors.</p>',
		],
		complexity: { time: 'O(|build| + |probe| + |out|) expected — plus O(|out| log |out|) for the deterministic sort', space: 'O(|build|) — the hash table holds only the smaller side' },
	});
})();
