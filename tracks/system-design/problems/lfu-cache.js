/* LFU Cache — Caching (Hard). Least-Frequently-Used eviction with the LRU
 * tie-break (LeetCode 460, reframed as the infrastructure component it is —
 * Redis's other eviction family). Exact-table harness: the case table
 * includes a timeline where LFU and LRU disagree, so a smuggled-in LRU
 * cannot pass.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 185" width="500" height="185" role="img" aria-label="LFU cache: one recency-ordered doubly linked list per frequency, plus a minFreq pointer for O(1) eviction">' +
		'<text x="20" y="18" class="lbl">frequency buckets · each is a recency list (front = most recent)</text>' +
		// freq 3 row
		'<text x="20" y="54" class="lbl">freq 3</text>' +
		'<rect x="80" y="34" width="64" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="112" y="54" text-anchor="middle">1 : a</text>' +
		// freq 2 row
		'<text x="20" y="98" class="lbl">freq 2</text>' +
		'<rect x="80" y="78" width="64" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="170" y="78" width="64" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="112" y="98" text-anchor="middle">5 : e</text>' +
		'<text x="202" y="98" text-anchor="middle">2 : b</text>' +
		'<path d="M 144 93 L 168 93" stroke="var(--dim)" stroke-width="1.4" marker-end="url(#dgArrowLFU)" fill="none"/>' +
		// a bump: hit on 5:e lifts it one bucket up
		'<path d="M 112 76 L 112 66" stroke="var(--ok)" stroke-width="1.4" stroke-dasharray="3 2" marker-end="url(#dgArrowLFU)" fill="none"/>' +
		'<text x="122" y="72" class="lbl">hit → up one bucket</text>' +
		// freq 1 row (minFreq)
		'<text x="20" y="142" class="lbl" style="fill:var(--accent)">freq 1 = minFreq</text>' +
		'<rect x="140" y="122" width="64" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="230" y="122" width="64" height="30" rx="4" fill="none" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<text x="172" y="142" text-anchor="middle">9 : d</text>' +
		'<text x="262" y="142" text-anchor="middle">7 : g</text>' +
		'<path d="M 204 137 L 228 137" stroke="var(--dim)" stroke-width="1.4" marker-end="url(#dgArrowLFU)" fill="none"/>' +
		'<text x="304" y="142" class="lbl">← evict: BACK of the minFreq bucket</text>' +
		'<text x="20" y="175" class="lbl">map key → node jumps straight to any entry, so every step is O(1)</text>' +
		'<defs><marker id="dgArrowLFU" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'lfu-cache',
		title: 'LFU Cache',
		nav: 'LFU Cache',
		difficulty: 'Hard',
		category: 'Caching',
		task: 'Implement Get and Put with O(1) LFU eviction (LRU tie-break) — make all 5 tests pass.',

		prose: [
			'<h2>LFU Cache</h2>' +
			'<p>LRU bets that <em>recent</em> keys are hot keys — but a burst scan of ' +
			'cold data flushes it instantly. <em>Least Frequently Used</em> bets on ' +
			'<em>popularity</em> instead: evict the entry with the fewest lifetime uses. ' +
			'A key read a thousand times survives a one-off scan that LRU would let ' +
			'evict it. The price is a harder data-structure puzzle: LFU in O(1) per ' +
			'operation is a classic Hard.</p>' +
			'<p>Build a fixed-capacity cache where both operations run in O(1):</p>' +
			'<ul>' +
			'<li><code>Get(key)</code> — return the value, or <code>-1</code> if absent; a hit bumps the key’s frequency by one.</li>' +
			'<li><code>Put(key, value)</code> — insert (frequency starts at 1) or update (bumps frequency); when an insert would exceed capacity, evict the least-frequently-used entry first.</li>' +
			'<li><strong>Tie-break:</strong> if several keys share the minimum frequency, evict the <em>least recently used</em> among them.</li>' +
			'</ul>' +
			'<h3>The idea</h3>' +
			'<p>A single ordered list can’t express “least frequent, then least recent” ' +
			'cheaply — but a <em>list per frequency</em> can. Keep a map ' +
			'<code>freq → doubly linked list</code> of the entries at that frequency ' +
			'(each list in recency order), a map <code>key → node</code>, and a ' +
			'<code>minFreq</code> watermark:</p>' +
			DIAGRAM +
			'<p>A hit unlinks the node from its bucket and pushes it onto the front of ' +
			'the next one. Eviction pops the <em>back</em> of the <code>minFreq</code> ' +
			'bucket — which is exactly the LRU entry within the least-frequent class. ' +
			'Go’s <code>container/list</code> handles the pointer surgery.</p>',
		],

		starter: [
			'package main',
			'',
			'// LFUCache is a fixed-capacity key→value cache that evicts the',
			'// least-frequently-used entry, breaking frequency ties by least',
			'// recently used. Get and Put must both be O(1).',
			'type LFUCache struct {',
			'	capacity int',
			'	// your fields here — hint: map[int]*list.Element for key→node,',
			'	// map[int]*list.List for freq→bucket (container/list), and a',
			'	// minFreq int so eviction never has to search for the smallest',
			'	// non-empty bucket.',
			'}',
			'',
			'func NewLFUCache(capacity int) *LFUCache {',
			'	return &LFUCache{capacity: capacity}',
			'}',
			'',
			'// Get returns the value stored for key, or -1 if absent, and bumps',
			'// the key\'s use count by one (moving it up one frequency bucket).',
			'func (c *LFUCache) Get(key int) int {',
			'	// -1 is the REAL miss answer, so this stub returns -2 — a value',
			'	// the tests never expect. Replace it with the actual lookup.',
			'	return -2 // your code here',
			'}',
			'',
			'// Put inserts key→value at frequency 1, or updates an existing key',
			'// (which also counts as a use). When an insert would exceed capacity,',
			'// it first evicts the least-frequently-used entry, breaking ties by',
			'// least recently used.',
			'func (c *LFUCache) Put(key, value int) {',
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
			'		// The LFU/LRU discriminator: key 1 is popular (freq 3) but was',
			'		// touched BEFORE key 2. LRU would evict 1; LFU must evict 2.',
			'		{"frequency beats recency: cap=2: put(1,1) get(1) get(1) put(2,2) get(2) put(3,3) get(1) get(2) get(3)", 2,',
			'			[]step{{"put", 1, 1}, {"get", 1, 0}, {"get", 1, 0}, {"put", 2, 2}, {"get", 2, 0}, {"put", 3, 3}, {"get", 1, 0}, {"get", 2, 0}, {"get", 3, 0}},',
			'			[]int{1, 1, 2, 1, -1, 3}},',
			'		// LeetCode 460 classic: ends with keys 1 and 3 both at freq 2,',
			'		// so put(4,4) must apply the LRU tie-break (1 is older → out).',
			'		{"get bumps + LRU tie-break: cap=2: put(1,1) put(2,2) get(1) put(3,3) get(2) get(3) put(4,4) get(1) get(3) get(4)", 2,',
			'			[]step{{"put", 1, 1}, {"put", 2, 2}, {"get", 1, 0}, {"put", 3, 3}, {"get", 2, 0}, {"get", 3, 0}, {"put", 4, 4}, {"get", 1, 0}, {"get", 3, 0}, {"get", 4, 0}},',
			'			[]int{1, -1, 3, -1, 3, 4}},',
			'		// All at freq 1: the tie-break alone decides, and 1 is oldest.',
			'		{"pure tie-break within a class: cap=2: put(1,1) put(2,2) put(3,3) get(1) get(2) get(3)", 2,',
			'			[]step{{"put", 1, 1}, {"put", 2, 2}, {"put", 3, 3}, {"get", 1, 0}, {"get", 2, 0}, {"get", 3, 0}},',
			'			[]int{-1, 2, 3}},',
			'		// put on an existing key is a use: 1 climbs to freq 2, so the',
			'		// later insert evicts 2 (still at freq 1), not 1.',
			'		{"update refreshes frequency: cap=2: put(1,1) put(2,2) put(1,10) put(3,3) get(1) get(2) get(3)", 2,',
			'			[]step{{"put", 1, 1}, {"put", 2, 2}, {"put", 1, 10}, {"put", 3, 3}, {"get", 1, 0}, {"get", 2, 0}, {"get", 3, 0}},',
			'			[]int{10, -1, 3}},',
			'		// cap=1: the only resident has freq 2, and the minFreq bookkeeping',
			'		// must still find it when its bucket is the only one.',
			'		{"cap=1: put(1,1) get(1) put(2,2) get(1) get(2)", 1,',
			'			[]step{{"put", 1, 1}, {"get", 1, 0}, {"put", 2, 2}, {"get", 1, 0}, {"get", 2, 0}},',
			'			[]int{1, -1, 2}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("gets: %v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			cache := NewLFUCache(c.capacity)',
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
			'// lfuEntry is the payload stored in each list element. The key rides',
			'// along for map cleanup on eviction; freq records which bucket the',
			'// node currently lives in, so a bump knows where to unlink from.',
			'type lfuEntry struct {',
			'	key, value, freq int',
			'}',
			'',
			'// LFUCache keeps one recency-ordered doubly linked list PER frequency.',
			'// Within a bucket, front = most recently used — so "LFU with LRU',
			'// tie-break" collapses to "pop the back of the minFreq bucket".',
			'// The design is three O(1) structures covering each other\'s gaps:',
			'// the items map finds a node, the node knows its bucket, and minFreq',
			'// names the eviction bucket without any searching.',
			'type LFUCache struct {',
			'	capacity int',
			'	minFreq  int                   // smallest freq with a non-empty bucket',
			'	buckets  map[int]*list.List    // freq → entries at that freq, front = MRU',
			'	items    map[int]*list.Element // key → node in its bucket',
			'}',
			'',
			'func NewLFUCache(capacity int) *LFUCache {',
			'	return &LFUCache{',
			'		capacity: capacity,',
			'		buckets:  make(map[int]*list.List),',
			'		items:    make(map[int]*list.Element, capacity),',
			'	}',
			'}',
			'',
			'// bump moves a node from its bucket to the front of the next one',
			'// (freq+1). This is the heart of the structure — both Get hits and',
			'// Put updates funnel through it.',
			'func (c *LFUCache) bump(el *list.Element) {',
			'	e := el.Value.(*lfuEntry)',
			'	b := c.buckets[e.freq]',
			'	b.Remove(el)',
			'	if b.Len() == 0 {',
			'		delete(c.buckets, e.freq)',
			'		// minFreq can advance by exactly one here: the entry we just',
			'		// moved now lives at freq+1, so a non-empty bucket is',
			'		// guaranteed to exist there — no scan needed. This one-line',
			'		// argument is what makes O(1) LFU work at all.',
			'		if c.minFreq == e.freq {',
			'			c.minFreq = e.freq + 1',
			'		}',
			'	}',
			'	e.freq++',
			'	nb := c.buckets[e.freq]',
			'	if nb == nil {',
			'		nb = list.New()',
			'		c.buckets[e.freq] = nb',
			'	}',
			'	// PushFront = most recently used within the new frequency class,',
			'	// which is exactly what the tie-break rule needs.',
			'	c.items[e.key] = nb.PushFront(e)',
			'}',
			'',
			'// Get returns the value stored for key, or -1 if absent, and bumps',
			'// the key\'s use count by one.',
			'func (c *LFUCache) Get(key int) int {',
			'	el, ok := c.items[key]',
			'	if !ok {',
			'		return -1',
			'	}',
			'	e := el.Value.(*lfuEntry) // capture before bump relocates the node',
			'	c.bump(el)',
			'	return e.value',
			'}',
			'',
			'// Put inserts key→value at frequency 1, or updates an existing key.',
			'func (c *LFUCache) Put(key, value int) {',
			'	if c.capacity <= 0 {',
			'		return',
			'	}',
			'	if el, ok := c.items[key]; ok {',
			'		// Update in place: new value, one more use, no size change.',
			'		el.Value.(*lfuEntry).value = value',
			'		c.bump(el)',
			'		return',
			'	}',
			'	if len(c.items) >= c.capacity {',
			'		// Evict BEFORE inserting so the newcomer can never be its own',
			'		// victim. Back of the minFreq bucket = least recently used',
			'		// among the least frequently used.',
			'		b := c.buckets[c.minFreq]',
			'		victim := b.Back()',
			'		b.Remove(victim)',
			'		if b.Len() == 0 {',
			'			delete(c.buckets, c.minFreq)',
			'		}',
			'		delete(c.items, victim.Value.(*lfuEntry).key)',
			'	}',
			'	e := &lfuEntry{key: key, value: value, freq: 1}',
			'	b := c.buckets[1]',
			'	if b == nil {',
			'		b = list.New()',
			'		c.buckets[1] = b',
			'	}',
			'	c.items[key] = b.PushFront(e)',
			'	// A brand-new entry has frequency 1 by definition, so minFreq',
			'	// resets unconditionally — cheaper than comparing.',
			'	c.minFreq = 1',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Keep a <code>map[key]{value, count, lastUsed}</code> and, on eviction, ' +
			'scan every entry for the smallest <code>(count, lastUsed)</code> pair. ' +
			'Correct, and O(n) per eviction — a cache doing a million puts a second ' +
			'against a million-entry table burns its budget on the scan. (A heap gets ' +
			'you to O(log n), but bumping a key’s frequency means re-heapifying on ' +
			'every <em>hit</em>, which is the hot path.)</p>' +
			'<h3>The insight: bucket by frequency</h3>' +
			'<p>Frequencies only ever move by +1. So instead of ordering all entries ' +
			'globally, group them into <strong>frequency-bucketed recency lists</strong> — ' +
			'a doubly linked list per frequency, each in LRU order. A hit is an O(1) ' +
			'unlink from bucket <code>f</code> and push-front onto bucket <code>f+1</code>:</p>',
			{ code: 'b.Remove(el)                    // leave freq f\ne.freq++\nc.items[e.key] = nb.PushFront(e) // arrive at freq f+1, as its MRU' },
			'<p>Eviction is “back of the <code>minFreq</code> bucket” — both rules ' +
			'(least frequent, then least recent) fall out of the layout for free. The ' +
			'only subtlety is keeping <code>minFreq</code> honest in O(1): when a bump ' +
			'empties the minimum bucket, the moved entry now sits at ' +
			'<code>minFreq+1</code>, so that bucket is provably non-empty and ' +
			'<code>minFreq++</code> is exact — no scan. On any insert, ' +
			'<code>minFreq = 1</code> by definition.</p>' +
			'<h3>Where else this shows up</h3>' +
			'<p>The general move — <strong>pair a hash map with intrusive linked ' +
			'lists so membership, ordering, and “move between classes” are all ' +
			'O(1)</strong> — is the same one behind LRU; LFU just adds one more ' +
			'dimension of bucketing. In production, exact LFU’s per-key counters are ' +
			'often traded for approximations: Redis’s <code>allkeys-lfu</code> uses ' +
			'8-bit probabilistic (Morris) counters with decay, betting that ' +
			'<em>roughly</em> least-frequent is close enough. The exact structure you ' +
			'built here is LeetCode 460 — and the standard follow-up to LRU in system ' +
			'design interviews.</p>',
		],
		complexity: { time: 'O(1) per op', space: 'O(capacity)' },
	});
})();
