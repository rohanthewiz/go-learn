/* Shard Router — Partitioning (Easy). The two classic ways to decide which
 * shard holds a key: range boundaries vs hash-mod-N. Exact-table harness:
 * both routing rules are fully deterministic, so every case pins one input
 * to one shard index (hash cases validated against native Go).
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="range partitioning by sorted split points vs hash partitioning by modulo">' +
		'<text x="20" y="20" class="lbl">RANGE — splits ["g","n","t"] cut the keyspace into 4 shards</text>' +
		'<rect x="20" y="30" width="110" height="28" fill="var(--accent)" fill-opacity="0.15" stroke="var(--edge)"/>' +
		'<rect x="130" y="30" width="110" height="28" fill="none" stroke="var(--edge)"/>' +
		'<rect x="240" y="30" width="110" height="28" fill="var(--accent)" fill-opacity="0.15" stroke="var(--edge)"/>' +
		'<rect x="350" y="30" width="110" height="28" fill="none" stroke="var(--edge)"/>' +
		'<text x="75" y="49" text-anchor="middle" class="lbl">0: &lt; "g"</text>' +
		'<text x="185" y="49" text-anchor="middle" class="lbl">1: "g"..&lt; "n"</text>' +
		'<text x="295" y="49" text-anchor="middle" class="lbl">2: "n"..&lt; "t"</text>' +
		'<text x="405" y="49" text-anchor="middle" class="lbl">3: rest</text>' +
		'<path d="M 110 82 C 130 74 160 66 182 62" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowSHR)"/>' +
		'<text x="52" y="90">"monkey"</text>' +
		'<text x="150" y="92" class="lbl">boundary rule: key == "g" goes RIGHT (shard 1 holds "g")</text>' +
		'<text x="20" y="128" class="lbl">HASH — fnv1a(key) % 4 scatters keys uniformly, no ranges survive</text>' +
		'<rect x="20" y="138" width="110" height="28" fill="none" stroke="var(--edge)"/>' +
		'<rect x="130" y="138" width="110" height="28" fill="none" stroke="var(--edge)"/>' +
		'<rect x="240" y="138" width="110" height="28" fill="var(--ok)" fill-opacity="0.15" stroke="var(--ok)"/>' +
		'<rect x="350" y="138" width="110" height="28" fill="none" stroke="var(--edge)"/>' +
		'<text x="75" y="157" text-anchor="middle" class="lbl">0</text>' +
		'<text x="185" y="157" text-anchor="middle" class="lbl">1</text>' +
		'<text x="295" y="157" text-anchor="middle" class="lbl">2 ← "user:42"</text>' +
		'<text x="405" y="157" text-anchor="middle" class="lbl">3</text>' +
		'<text x="20" y="184" class="lbl">change N and almost every key re-routes — the trap that motivates consistent/rendezvous hashing</text>' +
		'<defs><marker id="dgArrowSHR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'shard-router',
		title: 'Shard Router: Range vs Hash',
		nav: 'Shard Router',
		difficulty: 'Easy',
		category: 'Partitioning',
		task: 'Implement RouteRange and RouteHash — make all 7 tests pass.',

		prose: [
			'<h2>Shard Router</h2>' +
			'<p>One database can’t hold everything, so you split the data across shards — ' +
			'and now every read and write starts with the same question: <em>which shard ' +
			'has this key?</em> The two answers that power almost every sharded system are ' +
			'range partitioning (HBase, Spanner, Vitess) and hash partitioning ' +
			'(Redis Cluster-style, most application-level sharding):</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<ul>' +
			'<li><code>RouteRange(key, splits)</code> — <code>splits</code> is a sorted list of ' +
			'upper bounds. Shard <code>i</code> holds keys <strong>strictly less than</strong> ' +
			'<code>splits[i]</code>; the last shard (index <code>len(splits)</code>) holds ' +
			'everything else. So a key <em>equal</em> to a split goes <strong>right</strong>: with ' +
			'splits <code>["g","n","t"]</code>, key <code>"g"</code> lands on shard 1, because ' +
			'shard 0 holds only keys <code>&lt; "g"</code>. Empty splits means one shard: ' +
			'always return 0.</li>' +
			'<li><code>RouteHash(key, n)</code> — <code>int(fnv1a(key) % uint32(n))</code>. ' +
			'Do the modulo on the <code>uint32</code> <em>first</em>, then cast: hashes routinely ' +
			'exceed the signed 32-bit range, and a premature narrow cast would go negative. ' +
			'The <code>fnv1a</code> helper is in the starter.</li>' +
			'</ul>',
		],

		starter: [
			'package main',
			'',
			SD.FNV_HELPERS,
			'',
			'// RouteRange returns the shard index for key under range',
			'// partitioning. splits is a sorted slice of upper bounds: shard i',
			'// holds keys strictly less than splits[i], and the final shard',
			'// (index len(splits)) holds every remaining key. A key equal to a',
			'// split therefore belongs to the shard on its RIGHT.',
			'func RouteRange(key string, splits []string) int {',
			'	return -1 // your code here',
			'}',
			'',
			'// RouteHash returns the shard index for key under hash',
			'// partitioning: int(fnv1a(key) % uint32(n)). Reduce the uint32',
			'// modulo n BEFORE converting to int so the result stays in [0, n).',
			'func RouteHash(key string, n int) int {',
			'	return -1 // your code here',
			'}',
			'',
		].join('\n'),

		// Exact table. Hash expectations were computed with native Go against
		// the same fnv1a: fnv1a("user:42")%4=2, fnv1a("a")%3=1,
		// fnv1a("order:9001")%7=4. The key=="g" case catches the classic <=
		// vs < boundary bug (wrong answer would be 0).
		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			')',
			'',
			SD.HARNESS_RT,
			'',
			'type tc struct {',
			'	fn     string   // "range" or "hash"',
			'	key    string',
			'	splits []string // range cases',
			'	n      int      // hash cases',
			'	want   int',
			'}',
			'',
			'func main() {',
			'	splits := []string{"g", "n", "t"}',
			'	cases := []tc{',
			'		{fn: "range", key: "apple", splits: splits, want: 0},',
			'		{fn: "range", key: "g", splits: splits, want: 1}, // key == split goes right',
			'		{fn: "range", key: "monkey", splits: splits, want: 1},',
			'		{fn: "range", key: "anything", splits: []string{}, want: 0}, // no splits = one shard',
			'		{fn: "hash", key: "user:42", n: 4, want: 2},',
			'		{fn: "hash", key: "a", n: 3, want: 1},',
			'		{fn: "hash", key: "order:9001", n: 7, want: 4},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"want": fmt.Sprintf("%d", c.want)}',
			'		if c.fn == "range" {',
			'			r["input"] = fmt.Sprintf("RouteRange(%q, %v)", c.key, c.splits)',
			'		} else {',
			'			r["input"] = fmt.Sprintf("RouteHash(%q, %d)", c.key, c.n)',
			'		}',
			'		runCase(r, func() {',
			'			var got int',
			'			if c.fn == "range" {',
			'				got = RouteRange(c.key, append([]string(nil), c.splits...))',
			'			} else {',
			'				got = RouteHash(c.key, c.n)',
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
			'import "sort"',
			'',
			SD.FNV_HELPERS,
			'',
			'// RouteRange finds the first split strictly greater than key —',
			'// exactly sort.Search\'s contract with a > predicate. A key equal',
			'// to splits[i] fails "splits[i] > key", so the search moves right:',
			'// that one comparison direction encodes the whole boundary rule',
			'// (shard i holds keys < splits[i]). When key is >= every split,',
			'// sort.Search returns len(splits) — which IS the last shard\'s',
			'// index, so no special case is needed (and empty splits returns 0',
			'// for free).',
			'func RouteRange(key string, splits []string) int {',
			'	return sort.Search(len(splits), func(i int) bool { return splits[i] > key })',
			'}',
			'',
			'// RouteHash reduces the 32-bit hash modulo n while still unsigned.',
			'// The order matters: fnv1a routinely returns values above 2^31, so',
			'// narrowing to a signed 32-bit value BEFORE the modulo would go',
			'// negative and % would then yield a negative shard index. Doing',
			'// % on the uint32 keeps the result in [0, n) by construction; the',
			'// final int conversion is then always safe.',
			'func RouteHash(key string, n int) int {',
			'	return int(fnv1a(key) % uint32(n))',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Two routers, two failure modes</h3>' +
			'<p>The general principle here is <strong>partitioning by key: choose between ' +
			'preserving key ORDER (range) and destroying it for UNIFORMITY (hash)</strong> — ' +
			'every sharded store picks a side, and the router is where the choice becomes ' +
			'code.</p>' +
			'<ul>' +
			'<li><strong>Range</strong> keeps neighboring keys on the same shard, so ' +
			'<code>scan users A→C</code> touches one shard, and splits can be moved to grow ' +
			'hot regions. The price is <em>hotspots</em>: insert time-ordered keys and every ' +
			'write lands on the last shard (the classic monotonic-key antipattern in ' +
			'HBase/Spanner schema design).</li>' +
			'<li><strong>Hash</strong> scatters keys uniformly — no hotspots from key ' +
			'patterns — but adjacent keys land on different shards, so range scans must ' +
			'fan out to <em>every</em> shard and merge.</li>' +
			'</ul>' +
			'<h3>The binary search is the whole range router</h3>',
			{ code: '// first split strictly greater than key = the shard that owns it\nreturn sort.Search(len(splits), func(i int) bool {\n\treturn splits[i] > key\n})' },
			'<p>Real systems keep thousands of splits, so routing is O(log s) against the ' +
			'split table (which is exactly what HBase’s META region and Vitess’s VSchema ' +
			'are). Note how the strict <code>&gt;</code> encodes the boundary rule: half-open ' +
			'intervals <code>[prev, split)</code> tile the keyspace with no gaps and no ' +
			'overlaps — the same convention as slice indexing, and the reason boundary keys ' +
			'go right.</p>' +
			'<h3>Why mod-N is a trap</h3>' +
			'<p><code>fnv1a(key) % n</code> bakes <code>n</code> into <em>every key’s</em> ' +
			'placement. Add one shard (n=4 → 5) and ~4/5 of all keys change shards at once ' +
			'— a full-cluster data migration (or cache wipe) to grow by one machine. That ' +
			'is precisely the problem the sibling problems solve: <em>consistent hashing</em> ' +
			'moves only ~K/n keys by freezing key positions on a ring, and <em>rendezvous ' +
			'hashing</em> does it statelessly with per-node scores. Use plain mod-N only ' +
			'when n is truly fixed — or be ready to reshard everything.</p>',
		],
		complexity: { time: 'O(log s) range, O(1) hash', space: 'O(1)' },
	});
})();
