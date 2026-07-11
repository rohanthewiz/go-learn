/* Consistent Hashing — Partitioning (Hard). The ring that lets caches and
 * databases scale horizontally without reshuffling the world on every
 * membership change. Property-based harness: exact key→node assignments
 * depend on hash values, so the tests assert the *guarantees* instead —
 * determinism, coverage, balance, and (the whole point) minimal disruption.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="consistent hash ring with virtual nodes">' +
		'<circle cx="120" cy="95" r="70" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		// vnodes on the ring (three nodes, two vnodes each shown)
		'<circle cx="120" cy="25" r="7" fill="var(--accent)"/>' +
		'<circle cx="181" cy="60" r="7" fill="var(--ok)"/>' +
		'<circle cx="181" cy="130" r="7" fill="var(--warn)"/>' +
		'<circle cx="120" cy="165" r="7" fill="var(--accent)"/>' +
		'<circle cx="59" cy="130" r="7" fill="var(--ok)"/>' +
		'<circle cx="59" cy="60" r="7" fill="var(--warn)"/>' +
		'<text x="120" y="14" text-anchor="middle" class="lbl">a#0</text>' +
		'<text x="196" y="55" class="lbl">b#0</text>' +
		'<text x="196" y="140" class="lbl">c#0</text>' +
		'<text x="120" y="185" text-anchor="middle" class="lbl">a#1</text>' +
		'<text x="30" y="140" class="lbl">b#1</text>' +
		'<text x="30" y="55" class="lbl">c#1</text>' +
		// a key hashing onto the ring, walking clockwise
		'<circle cx="158" cy="34" r="4" fill="var(--fg)"/>' +
		'<text x="168" y="28" class="lbl">hash(key)</text>' +
		'<path d="M 165 42 A 70 70 0 0 1 178 54" fill="none" stroke="var(--fg)" stroke-width="1.5" marker-end="url(#dgArrowCH)"/>' +
		// legend
		'<text x="290" y="40" class="lbl">key → first vnode clockwise</text>' +
		'<text x="290" y="58">this key lands on <tspan style="fill:var(--ok)">node b</tspan></text>' +
		'<text x="290" y="96" class="lbl">remove b: only b’s arcs are</text>' +
		'<text x="290" y="110" class="lbl">re-assigned — a and c keys</text>' +
		'<text x="290" y="124" class="lbl">do not move</text>' +
		'<text x="290" y="156" class="lbl">vnodes: each node appears many</text>' +
		'<text x="290" y="170" class="lbl">times, evening out the arcs</text>' +
		'<defs><marker id="dgArrowCH" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--fg)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'consistent-hashing',
		title: 'Consistent Hashing',
		nav: 'Consistent Hashing',
		difficulty: 'Hard',
		category: 'Partitioning',
		task: 'Implement the ring: AddNode / RemoveNode / Lookup with virtual nodes.',

		prose: [
			'<h2>Consistent Hashing</h2>' +
			'<p>You have 3 cache servers and shard keys with <code>hash(key) % 3</code>. ' +
			'Then one server dies. Now it’s <code>% 2</code> — and <em>two thirds of all keys ' +
			'change servers at once</em>. Every one is suddenly a cache miss; the database ' +
			'behind them takes the full load and follows the cache down.</p>' +
			'<p>Consistent hashing fixes the blast radius. Nodes and keys hash onto the ' +
			'same circle; a key belongs to the first node clockwise from it. Adding or ' +
			'removing a node only re-assigns the keys in <em>that node’s</em> arcs — about ' +
			'<code>1/n</code> of the data instead of all of it:</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<ul>' +
			'<li><code>AddNode(node)</code> — place <code>vnodes</code> points on the ring, hashing ' +
			'<code>fnv1a(node + "#" + strconv.Itoa(i))</code> for i in 0..vnodes-1. Virtual nodes matter: one point ' +
			'per node makes arc sizes wildly uneven; many points average them out.</li>' +
			'<li><code>RemoveNode(node)</code> — drop all of that node’s points.</li>' +
			'<li><code>Lookup(key)</code> — the node whose point is first at or clockwise after ' +
			'<code>fnv1a(key)</code>, wrapping past the top; <code>""</code> on an empty ring.</li>' +
			'</ul>' +
			'<p>Keep the points in a slice sorted by hash — <code>sort.Slice</code> to maintain ' +
			'it, <code>sort.Search</code> for the clockwise successor (an index one past the end ' +
			'means wrap to index 0). The <code>fnv1a</code> hash is provided below the type.</p>',
		],

		starter: [
			'package main',
			'',
			SD.FNV_HELPERS,
			'',
			'// Ring is a consistent-hash ring with virtual nodes: each physical',
			'// node appears vnodes times at pseudo-random points on a uint32',
			'// circle, and a key belongs to the first point clockwise from its',
			'// own hash.',
			'type Ring struct {',
			'	vnodes int',
			'	// your fields here — a slice of (hash, node) points kept sorted',
			'	// by hash works well.',
			'}',
			'',
			'func NewRing(vnodes int) *Ring {',
			'	return &Ring{vnodes: vnodes}',
			'}',
			'',
			'// AddNode places node\'s virtual points on the ring: point i hashes',
			'// as fnv1a(node + "#" + strconv.Itoa(i)).',
			'func (r *Ring) AddNode(node string) {',
			'	// your code here',
			'}',
			'',
			'// RemoveNode removes all of node\'s virtual points.',
			'func (r *Ring) RemoveNode(node string) {',
			'	// your code here',
			'}',
			'',
			'// Lookup returns the node owning key: the first virtual point at or',
			'// clockwise after fnv1a(key), wrapping around the top of the circle.',
			'// Returns "" when the ring is empty.',
			'func (r *Ring) Lookup(key string) string {',
			'	return "" // your code here',
			'}',
			'',
		].join('\n'),

		// Property harness: builds a ring with 3 nodes × 50 vnodes and probes
		// 300 keys. Thresholds were validated against the reference solution
		// (worst node owns 25% of keys, so the ≥10% floor has real margin).
		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strconv"',
			')',
			'',
			SD.HARNESS_RT,
			'',
			'func main() {',
			'	nodes := []string{"cache-a", "cache-b", "cache-c"}',
			'	keys := make([]string, 300)',
			'	for i := range keys {',
			'		keys[i] = "user:" + strconv.Itoa(i)',
			'	}',
			'	build := func() *Ring {',
			'		r := NewRing(50)',
			'		for _, n := range nodes {',
			'			r.AddNode(n)',
			'		}',
			'		return r',
			'	}',
			'	results := make([]map[string]any, 0, 5)',
			'	check := func(name string, body func() string) {',
			'		r := map[string]any{"input": name, "want": "ok"}',
			'		runCase(r, func() {',
			'			msg := body()',
			'			r["pass"] = msg == ""',
			'			if msg == "" {',
			'				msg = "ok"',
			'			}',
			'			r["got"] = msg',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	check("every key maps to an added node", func() string {',
			'		ring := build()',
			'		valid := map[string]bool{"cache-a": true, "cache-b": true, "cache-c": true}',
			'		for _, k := range keys {',
			'			if n := ring.Lookup(k); !valid[n] {',
			'				return fmt.Sprintf("Lookup(%q) = %q, not an added node", k, n)',
			'			}',
			'		}',
			'		return ""',
			'	})',
			'',
			'	check("lookups are deterministic", func() string {',
			'		ring := build()',
			'		for _, k := range keys {',
			'			a, b := ring.Lookup(k), ring.Lookup(k)',
			'			if a != b {',
			'				return fmt.Sprintf("Lookup(%q) returned %q then %q", k, a, b)',
			'			}',
			'		}',
			'		return ""',
			'	})',
			'',
			'	check("balance: every node owns >= 10% of 300 keys (vnodes=50)", func() string {',
			'		ring := build()',
			'		counts := map[string]int{}',
			'		for _, k := range keys {',
			'			counts[ring.Lookup(k)]++',
			'		}',
			'		for _, n := range nodes {',
			'			if counts[n] < 30 {',
			'				return fmt.Sprintf("distribution %v — %s owns %d keys (< 30)", counts, n, counts[n])',
			'			}',
			'		}',
			'		return ""',
			'	})',
			'',
			'	check("removing a node moves ONLY its own keys", func() string {',
			'		ring := build()',
			'		before := map[string]string{}',
			'		for _, k := range keys {',
			'			before[k] = ring.Lookup(k)',
			'		}',
			'		ring.RemoveNode("cache-b")',
			'		for _, k := range keys {',
			'			after := ring.Lookup(k)',
			'			if after == "cache-b" {',
			'				return fmt.Sprintf("%q still maps to removed cache-b", k)',
			'			}',
			'			if before[k] != "cache-b" && after != before[k] {',
			'				return fmt.Sprintf("%q moved %s→%s but was not on the removed node", k, before[k], after)',
			'			}',
			'		}',
			'		return ""',
			'	})',
			'',
			'	check("adding a node only steals keys (none shuffle between old nodes)", func() string {',
			'		ring := build()',
			'		before := map[string]string{}',
			'		for _, k := range keys {',
			'			before[k] = ring.Lookup(k)',
			'		}',
			'		ring.AddNode("cache-d")',
			'		moved := 0',
			'		for _, k := range keys {',
			'			after := ring.Lookup(k)',
			'			if after != before[k] && after != "cache-d" {',
			'				return fmt.Sprintf("%q moved %s→%s instead of to the new node", k, before[k], after)',
			'			}',
			'			if after == "cache-d" {',
			'				moved++',
			'			}',
			'		}',
			'		if moved == 0 {',
			'			return "new node cache-d received no keys — was it added?"',
			'		}',
			'		return ""',
			'	})',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'import (',
			'	"sort"',
			'	"strconv"',
			')',
			'',
			SD.FNV_HELPERS,
			'',
			'// vpoint is one virtual node: a position on the uint32 circle and',
			'// the physical node that owns it.',
			'type vpoint struct {',
			'	hash uint32',
			'	node string',
			'}',
			'',
			'// Ring keeps all virtual points in one slice sorted by hash. The',
			'// sorted slice IS the circle: Lookup is a binary search for the',
			'// clockwise successor, and wrap-around is just "past the end → 0".',
			'type Ring struct {',
			'	vnodes int',
			'	points []vpoint',
			'}',
			'',
			'func NewRing(vnodes int) *Ring {',
			'	return &Ring{vnodes: vnodes}',
			'}',
			'',
			'// AddNode places node\'s virtual points and re-sorts. Sorting on add',
			'// is O(p log p), but membership changes are rare and lookups are hot',
			'// — optimizing the write path would be tuning the cold side.',
			'func (r *Ring) AddNode(node string) {',
			'	for i := 0; i < r.vnodes; i++ {',
			'		h := fnv1a(node + "#" + strconv.Itoa(i))',
			'		r.points = append(r.points, vpoint{hash: h, node: node})',
			'	}',
			'	sort.Slice(r.points, func(a, b int) bool { return r.points[a].hash < r.points[b].hash })',
			'}',
			'',
			'// RemoveNode filters out node\'s points in place. The survivors keep',
			'// their relative order, so the slice stays sorted — no re-sort.',
			'func (r *Ring) RemoveNode(node string) {',
			'	kept := r.points[:0]',
			'	for _, p := range r.points {',
			'		if p.node != node {',
			'			kept = append(kept, p)',
			'		}',
			'	}',
			'	r.points = kept',
			'}',
			'',
			'// Lookup binary-searches for the first point at or after the key\'s',
			'// hash. sort.Search returning len(points) means the key hashed past',
			'// the last point — on a circle that wraps to the first point.',
			'func (r *Ring) Lookup(key string) string {',
			'	if len(r.points) == 0 {',
			'		return ""',
			'	}',
			'	h := fnv1a(key)',
			'	i := sort.Search(len(r.points), func(i int) bool { return r.points[i].hash >= h })',
			'	if i == len(r.points) {',
			'		i = 0 // wrap around the top of the circle',
			'	}',
			'	return r.points[i].node',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why a circle</h3>' +
			'<p>The failure of <code>hash % n</code> is that <em>n</em> appears in every key’s ' +
			'placement — change n and almost every mapping changes. On the ring, a key’s ' +
			'position never changes; only the ownership boundaries move. Removing a node ' +
			'merges its arcs into the next node clockwise, touching only those keys — ' +
			'the harness’s “moves ONLY its own keys” check is exactly this guarantee.</p>' +
			'<h3>Why virtual nodes</h3>' +
			'<p>With one point per node, arc sizes are a lottery — one node can easily own ' +
			'half the circle. Giving each node 50–200 points chops the circle fine enough ' +
			'that every node’s total share concentrates near 1/n (the same reason an ' +
			'average of many random slices beats one random slice). Vnodes also let ' +
			'heterogeneous hardware take weighted shares: a box twice as big gets twice ' +
			'the points.</p>',
			{ code: 'i := sort.Search(len(r.points), func(i int) bool {\n\treturn r.points[i].hash >= h\n})\nif i == len(r.points) { i = 0 } // the circle wraps' },
			'<p>That <code>sort.Search</code> is the whole read path: O(log p) over a slice — ' +
			'no tree needed, because the point set only changes on membership events.</p>' +
			'<h3>Where you’ve met it</h3>' +
			'<p>Memcached clients (ketama), DynamoDB/Cassandra partitioning, Envoy’s ring ' +
			'hash load balancing. The interview phrase worth owning: <em>“consistent ' +
			'hashing bounds re-partitioning to K/n keys on membership change, and virtual ' +
			'nodes trade memory for balance.”</em></p>',
		],
		complexity: { time: 'O(log p) lookup, p = nodes × vnodes', space: 'O(p)' },
	});
})();
