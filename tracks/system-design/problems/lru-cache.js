/* LRU Cache — Caching (Medium). The eviction policy behind memcached-style
 * caches (and LeetCode 146, reframed as the infrastructure component it is).
 * Exact-table harness: eviction order is fully deterministic.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 150" width="500" height="150" role="img" aria-label="LRU cache: hash map pointing into a recency-ordered doubly linked list">' +
		// recency list
		'<text x="20" y="18" class="lbl">recency list · front = most recently used</text>' +
		'<rect x="20" y="30" width="70" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="120" y="30" width="70" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="220" y="30" width="70" height="34" rx="4" fill="none" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<text x="55" y="52" text-anchor="middle">3 : c</text>' +
		'<text x="155" y="52" text-anchor="middle">1 : a</text>' +
		'<text x="255" y="52" text-anchor="middle">2 : b</text>' +
		'<text x="55" y="80" text-anchor="middle" class="lbl">MRU</text>' +
		'<text x="255" y="80" text-anchor="middle" class="lbl">LRU → evicted when full</text>' +
		'<path d="M 90 47 L 118 47" stroke="var(--dim)" stroke-width="1.4" marker-end="url(#dgArrowLRU)" fill="none"/>' +
		'<path d="M 190 47 L 218 47" stroke="var(--dim)" stroke-width="1.4" marker-end="url(#dgArrowLRU)" fill="none"/>' +
		// map
		'<text x="360" y="18" class="lbl">map: key → list node</text>' +
		'<rect x="360" y="28" width="110" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="360" y="60" width="110" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="360" y="92" width="110" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="372" y="46">1 → ●</text>' +
		'<text x="372" y="78">2 → ●</text>' +
		'<text x="372" y="110">3 → ●</text>' +
		'<path d="M 440 44 C 300 20 200 24 158 30" fill="none" stroke="var(--dim)" stroke-width="1.2" stroke-dasharray="4 3"/>' +
		'<path d="M 440 108 C 300 140 120 110 58 66" fill="none" stroke="var(--dim)" stroke-width="1.2" stroke-dasharray="4 3"/>' +
		'<defs><marker id="dgArrowLRU" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'lru-cache',
		title: 'LRU Cache',
		nav: 'LRU Cache',
		difficulty: 'Medium',
		category: 'Caching',
		task: 'Implement Get and Put with O(1) time and LRU eviction — make all 4 tests pass.',

		prose: [
			'<h2>LRU Cache</h2>' +
			'<p>A cache in front of a database absorbs most reads — but memory is finite, ' +
			'so when the cache fills, something must go. <em>Least Recently Used</em> is the ' +
			'workhorse policy: evict the entry untouched the longest, betting that recent ' +
			'keys are hot keys.</p>' +
			'<p>Build a fixed-capacity cache where both operations run in O(1):</p>' +
			'<ul>' +
			'<li><code>Get(key)</code> — return the value, or <code>-1</code> if absent; a hit makes the key most recently used.</li>' +
			'<li><code>Put(key, value)</code> — insert or update (also counts as a use); when over capacity, evict the least recently used entry.</li>' +
			'</ul>' +
			'<h3>The idea</h3>' +
			'<p>Neither structure alone can do it: a map has no order, a list has no O(1) ' +
			'lookup. Together they do — a map from key to a node in a doubly linked list ' +
			'kept in recency order:</p>' +
			DIAGRAM +
			'<p>Every hit unlinks the node and reinserts it at the front (O(1) with a doubly ' +
			'linked list); eviction pops the back. Go’s <code>container/list</code> does the ' +
			'pointer surgery for you.</p>',
		],

		starter: [
			'package main',
			'',
			'// LRUCache is a fixed-capacity key→value cache. Get and Put both',
			'// count as a "use"; when an insert would exceed capacity, the least',
			'// recently used entry is evicted. Both operations should be O(1).',
			'type LRUCache struct {',
			'	capacity int',
			'	// your fields here — hint: container/list gives you a doubly',
			'	// linked list with O(1) MoveToFront / Remove / PushFront.',
			'}',
			'',
			'func NewLRUCache(capacity int) *LRUCache {',
			'	return &LRUCache{capacity: capacity}',
			'}',
			'',
			'// Get returns the value stored for key, or -1 if absent, and marks',
			'// key as most recently used.',
			'func (c *LRUCache) Get(key int) int {',
			'	return -1 // your code here',
			'}',
			'',
			'// Put inserts or updates key→value, marks it most recently used, and',
			'// evicts the least recently used entry if the cache is over capacity.',
			'func (c *LRUCache) Put(key, value int) {',
			'	// your code here',
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
			'	// A step is one cache call; only "get" steps produce output, so',
			'	// want is the expected sequence of Get results.',
			'	type step struct {',
			'		op   string',
			'		k, v int',
			'	}',
			'	type tc struct {',
			'		name     string',
			'		capacity int',
			'		steps    []step',
			'		want     []int',
			'	}',
			'	cases := []tc{',
			'		{"cap=2: put(1,1) put(2,2) get(1) put(3,3) get(2) put(4,4) get(1) get(3) get(4)", 2,',
			'			[]step{{"put", 1, 1}, {"put", 2, 2}, {"get", 1, 0}, {"put", 3, 3}, {"get", 2, 0}, {"put", 4, 4}, {"get", 1, 0}, {"get", 3, 0}, {"get", 4, 0}},',
			'			[]int{1, -1, -1, 3, 4}},',
			'		{"cap=1: put(1,1) get(1) put(2,2) get(1) get(2)", 1,',
			'			[]step{{"put", 1, 1}, {"get", 1, 0}, {"put", 2, 2}, {"get", 1, 0}, {"get", 2, 0}},',
			'			[]int{1, -1, 2}},',
			'		{"update refreshes: cap=2: put(1,1) put(2,2) put(1,10) put(3,3) get(1) get(2) get(3)", 2,',
			'			[]step{{"put", 1, 1}, {"put", 2, 2}, {"put", 1, 10}, {"put", 3, 3}, {"get", 1, 0}, {"get", 2, 0}, {"get", 3, 0}},',
			'			[]int{10, -1, 3}},',
			'		{"get refreshes: cap=2: put(1,1) put(2,2) get(1) put(3,3) get(2) get(1) get(3)", 2,',
			'			[]step{{"put", 1, 1}, {"put", 2, 2}, {"get", 1, 0}, {"put", 3, 3}, {"get", 2, 0}, {"get", 1, 0}, {"get", 3, 0}},',
			'			[]int{1, -1, 1, 3}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("gets: %v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			cache := NewLRUCache(c.capacity)',
			'			got := []int{}',
			'			for _, s := range c.steps {',
			'				if s.op == "put" {',
			'					cache.Put(s.k, s.v)',
			'				} else {',
			'					got = append(got, cache.Get(s.k))',
			'				}',
			'			}',
			'			r["pass"] = reflect.DeepEqual(got, c.want)',
			'			r["got"] = fmt.Sprintf("gets: %v", got)',
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
			'import "container/list"',
			'',
			'// entry is the payload stored in each list element. The key rides',
			'// along with the value so eviction can delete the map slot without',
			'// keeping a reverse index.',
			'type entry struct {',
			'	key, value int',
			'}',
			'',
			'// LRUCache pairs a map (O(1) lookup) with a doubly linked list kept',
			'// in recency order (O(1) reorder + eviction). Each structure covers',
			'// the other\'s weakness — that pairing IS the LRU trick.',
			'type LRUCache struct {',
			'	capacity int',
			'	order    *list.List            // front = most recently used',
			'	items    map[int]*list.Element // key → node in order',
			'}',
			'',
			'func NewLRUCache(capacity int) *LRUCache {',
			'	return &LRUCache{',
			'		capacity: capacity,',
			'		order:    list.New(),',
			'		items:    make(map[int]*list.Element, capacity),',
			'	}',
			'}',
			'',
			'// Get returns the value stored for key, or -1 if absent, and marks',
			'// key as most recently used.',
			'func (c *LRUCache) Get(key int) int {',
			'	el, ok := c.items[key]',
			'	if !ok {',
			'		return -1',
			'	}',
			'	c.order.MoveToFront(el) // a hit is a use',
			'	return el.Value.(*entry).value',
			'}',
			'',
			'// Put inserts or updates key→value, marks it most recently used, and',
			'// evicts the least recently used entry if the cache is over capacity.',
			'func (c *LRUCache) Put(key, value int) {',
			'	if el, ok := c.items[key]; ok {',
			'		// Update in place: refresh recency, no size change, no eviction.',
			'		el.Value.(*entry).value = value',
			'		c.order.MoveToFront(el)',
			'		return',
			'	}',
			'	c.items[key] = c.order.PushFront(&entry{key: key, value: value})',
			'	if c.order.Len() > c.capacity {',
			'		// The back of the list is by construction the LRU entry.',
			'		oldest := c.order.Back()',
			'		c.order.Remove(oldest)',
			'		delete(c.items, oldest.Value.(*entry).key)',
			'	}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why two structures</h3>' +
			'<p>The requirements pull in opposite directions: O(1) lookup by key wants a ' +
			'hash map; O(1) “move to front” and “evict the back” want a doubly linked ' +
			'list. The classic answer is both at once — <code>map[int]*list.Element</code> ' +
			'jumps straight to a node, and the list keeps pure recency order.</p>',
			{ code: 'el, ok := c.items[key]      // O(1) find\nc.order.MoveToFront(el)     // O(1) mark-as-used\noldest := c.order.Back()    // O(1) eviction victim' },
			'<h3>The details that bite</h3>' +
			'<ul>' +
			'<li><strong>Updates are uses.</strong> <code>Put</code> on an existing key must ' +
			'refresh recency and must <em>not</em> evict — the size didn’t grow.</li>' +
			'<li><strong>Store the key in the node.</strong> Eviction finds the victim via ' +
			'the list, then needs its key to delete the map slot. Carrying ' +
			'<code>{key, value}</code> in the element avoids a reverse map.</li>' +
			'<li><strong>Evict after inserting.</strong> Insert-then-trim keeps one code path; ' +
			'checking <code>Len() &gt; capacity</code> afterwards handles it.</li>' +
			'</ul>' +
			'<p>In production caches the same shape persists, with additions like sharded ' +
			'maps for concurrency (one lock per shard) or approximated recency (Redis ' +
			'samples candidates instead of maintaining a perfect list) — but the ' +
			'map-plus-recency-order idea is unchanged.</p>',
		],
		complexity: { time: 'O(1) per op', space: 'O(capacity)' },
	});
})();
