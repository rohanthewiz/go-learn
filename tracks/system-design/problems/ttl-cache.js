/* TTL Cache — Caching (Medium). Expiration by time-to-live with LAZY
 * deletion — the pattern behind Redis EXPIRE and DNS resolver caches.
 * Deterministic harness: Set and Get take the clock as a parameter
 * (nowMs), so the tests replay exact timelines with no sleeping.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 140" width="500" height="140" role="img" aria-label="TTL timeline: entry set at t=100 with ttl=500 is live until t=600; the boundary itself is expired">' +
		// axis
		'<path d="M 30 95 L 468 95" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowTTL)" fill="none"/>' +
		// set tick
		'<path d="M 100 87 L 100 103" stroke="var(--fg)" stroke-width="1.6"/>' +
		'<text x="100" y="118" text-anchor="middle" class="lbl">t=100</text>' +
		'<text x="100" y="30" text-anchor="middle" class="lbl">Set(k, v, ttl=500)</text>' +
		// live segment
		'<path d="M 100 70 L 350 70" stroke="var(--ok)" stroke-width="3"/>' +
		'<text x="225" y="60" text-anchor="middle" class="lbl" style="fill:var(--ok)">live: now &lt; 100+500</text>' +
		// expired segment
		'<path d="M 350 70 L 460 70" stroke="var(--err-edge)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<path d="M 350 62 L 350 103" stroke="var(--err-edge)" stroke-width="1.4"/>' +
		'<text x="350" y="118" text-anchor="middle" class="lbl">t=600</text>' +
		'<text x="405" y="60" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">expired (boundary too)</text>' +
		// gets
		'<text x="250" y="88" text-anchor="middle" style="fill:var(--ok)">✓</text>' +
		'<text x="250" y="45" text-anchor="middle" class="lbl">Get @450 → hit</text>' +
		'<text x="370" y="88" text-anchor="middle" style="fill:var(--err-fg)">✗</text>' +
		'<text x="405" y="45" text-anchor="middle" class="lbl">Get @600 → miss + delete</text>' +
		'<defs><marker id="dgArrowTTL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'ttl-cache',
		title: 'TTL Cache',
		nav: 'TTL Cache',
		difficulty: 'Medium',
		category: 'Caching',
		task: 'Implement Set and Get with per-key TTLs and lazy expiration — make all 5 tests pass.',

		prose: [
			'<h2>TTL Cache</h2>' +
			'<p>Capacity-based eviction (LRU/LFU) answers “what goes when we’re ' +
			'full?” — but cached data also goes <em>stale</em>. A DNS record, a session ' +
			'token, a computed feed: each is only trustworthy for so long. A ' +
			'<em>time-to-live</em> cache attaches an expiry to every entry, exactly like ' +
			'Redis <code>SET key val PX ttl</code> or a resolver honoring a DNS TTL.</p>' +
			'<ul>' +
			'<li><code>Set(key, value, ttlMs, nowMs)</code> — store the entry; it expires <code>ttlMs</code> after <code>nowMs</code>. Setting an existing key overwrites the value and <strong>restarts the TTL</strong>.</li>' +
			'<li><code>Get(key, nowMs)</code> — return <code>(value, true)</code> if the entry is live, else <code>("", false)</code>.</li>' +
			'</ul>' +
			'<p><strong>The boundary rule:</strong> an entry is live while ' +
			'<code>nowMs &lt; setTime + ttlMs</code> — at <em>exactly</em> ' +
			'<code>setTime + ttlMs</code> it is already expired. Off-by-one at this ' +
			'boundary is the classic TTL bug, and the harness probes it directly.</p>' +
			'<h3>The idea</h3>' +
			'<p>The tempting design is a reaper goroutine sweeping for dead entries. ' +
			'You don’t need it for correctness: store the expiry <em>deadline</em> with ' +
			'each value and check it on read — <em>lazy expiration</em>. An expired ' +
			'entry found during <code>Get</code> is deleted on the spot:</p>' +
			DIAGRAM +
			'<p>Time is injected (<code>nowMs</code>) rather than read from ' +
			'<code>time.Now()</code>, so the harness — and your tests in real projects — ' +
			'can replay exact timelines deterministically.</p>',
		],

		starter: [
			'package main',
			'',
			'// TTLCache stores string entries that each expire ttlMs after they',
			'// were set. Expiration is LAZY: nothing is removed until an access',
			'// notices the deadline has passed. Time is injected (nowMs) so',
			'// behavior is fully deterministic.',
			'type TTLCache struct {',
			'	// your fields here — hint: store the absolute deadline',
			'	// (setTime + ttlMs) alongside each value, not the raw ttl.',
			'}',
			'',
			'func NewTTLCache() *TTLCache {',
			'	return &TTLCache{}',
			'}',
			'',
			'// Set stores key→value, expiring ttlMs after nowMs. Setting an',
			'// existing key overwrites the value and restarts the TTL.',
			'func (c *TTLCache) Set(key, value string, ttlMs, nowMs int64) {',
			'	// your code here',
			'}',
			'',
			'// Get returns (value, true) while the entry is live — that is, while',
			'// nowMs < setTime+ttlMs — and ("", false) otherwise. An expired entry',
			'// is deleted on access.',
			'func (c *TTLCache) Get(key string, nowMs int64) (string, bool) {',
			'	return "", false // your code here',
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
			'	// A step is one cache call; only "get" steps produce output.',
			'	// Every case contains at least one expected HIT, so a stub Get',
			'	// that always misses cannot pass any case vacuously.',
			'	type step struct {',
			'		op       string',
			'		key, val string',
			'		ttl, t   int64',
			'	}',
			'	type tc struct {',
			'		name  string',
			'		steps []step',
			'		want  []string // "hit:<value>" or "miss" per get, in order',
			'	}',
			'	cases := []tc{',
			'		{"hit before expiry, gone after: set(a,1,ttl=1000)@0 get@999 get@1500",',
			'			[]step{{"set", "a", "1", 1000, 0}, {"get", "a", "", 0, 999}, {"get", "a", "", 0, 1500}},',
			'			[]string{"hit:1", "miss"}},',
			'		{"exact boundary is a miss: set(s,x,ttl=500)@100 get@599 get@600",',
			'			[]step{{"set", "s", "x", 500, 100}, {"get", "s", "", 0, 599}, {"get", "s", "", 0, 600}},',
			'			[]string{"hit:x", "miss"}},',
			'		{"overwrite restarts TTL: set(k,v1,1000)@0 set(k,v2,1000)@800 get@1500 get@1799 get@1800",',
			'			[]step{{"set", "k", "v1", 1000, 0}, {"set", "k", "v2", 1000, 800}, {"get", "k", "", 0, 1500}, {"get", "k", "", 0, 1799}, {"get", "k", "", 0, 1800}},',
			'			[]string{"hit:v2", "hit:v2", "miss"}},',
			'		{"keys expire independently: set(a,1,100)@0 set(b,2,10000)@0 get(a)@500 get(b)@500",',
			'			[]step{{"set", "a", "1", 100, 0}, {"set", "b", "2", 10000, 0}, {"get", "a", "", 0, 500}, {"get", "b", "", 0, 500}},',
			'			[]string{"miss", "hit:2"}},',
			'		{"re-Set after expiry: set(k,old,100)@0 get@200 set(k,new,300)@250 get@400 get@550",',
			'			[]step{{"set", "k", "old", 100, 0}, {"get", "k", "", 0, 200}, {"set", "k", "new", 300, 250}, {"get", "k", "", 0, 400}, {"get", "k", "", 0, 550}},',
			'			[]string{"miss", "hit:new", "miss"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("gets: %v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			cache := NewTTLCache()',
			'			got := []string{}',
			'			for _, s := range c.steps {',
			'				if s.op == "set" {',
			'					cache.Set(s.key, s.val, s.ttl, s.t)',
			'				} else {',
			'					v, ok := cache.Get(s.key, s.t)',
			'					if ok {',
			'						got = append(got, "hit:"+v)',
			'					} else {',
			'						got = append(got, "miss")',
			'					}',
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
			'// ttlEntry stores the value with its absolute deadline. Converting',
			'// ttl → deadline once at Set time makes Get a single comparison and',
			'// means "overwrite restarts the TTL" needs no special code: the new',
			'// entry simply carries a new deadline.',
			'type ttlEntry struct {',
			'	value     string',
			'	expiresAt int64 // setTime + ttlMs; live while nowMs < expiresAt',
			'}',
			'',
			'// TTLCache expires entries lazily: nothing is removed until a read',
			'// notices the deadline has passed. No reaper goroutine is needed for',
			'// correctness — an expired-but-not-yet-deleted entry is',
			'// indistinguishable from an absent one through the API.',
			'type TTLCache struct {',
			'	items map[string]ttlEntry',
			'}',
			'',
			'func NewTTLCache() *TTLCache {',
			'	return &TTLCache{items: make(map[string]ttlEntry)}',
			'}',
			'',
			'// Set stores key→value, expiring ttlMs after nowMs. Setting an',
			'// existing key overwrites the value and restarts the TTL.',
			'func (c *TTLCache) Set(key, value string, ttlMs, nowMs int64) {',
			'	c.items[key] = ttlEntry{value: value, expiresAt: nowMs + ttlMs}',
			'}',
			'',
			'// Get returns (value, true) while the entry is live, ("", false)',
			'// otherwise. The boundary is exclusive: at exactly expiresAt the',
			'// entry is already dead — an entry set with ttl=500 is readable for',
			'// timestamps setTime..setTime+499, i.e. exactly 500ms of instants.',
			'func (c *TTLCache) Get(key string, nowMs int64) (string, bool) {',
			'	e, ok := c.items[key]',
			'	if !ok {',
			'		return "", false',
			'	}',
			'	if nowMs >= e.expiresAt {',
			'		// Lazy deletion: reclaim the slot now that a reader has',
			'		// observed the entry dead. Correctness never depended on',
			'		// this delete — it only bounds memory for keys that ARE',
			'		// re-read; a sweeper would help only for keys that never are.',
			'		delete(c.items, key)',
			'		return "", false',
			'	}',
			'	return e.value, true',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>The instinctive design runs a background reaper: a goroutine waking ' +
			'every second to sweep the map for dead entries. Now you own a timer, a ' +
			'lock shared between sweeper and readers, a sweep interval to tune — and a ' +
			'correctness bug: between sweeps, an expired entry is still <em>served</em>. ' +
			'The sweep never made reads correct; the read-time check did.</p>' +
			'<h3>The insight: expiration is a read-time predicate</h3>' +
			'<p>That observation is the whole trick — <strong>lazy expiration</strong> ' +
			'(expire-on-access). Store the absolute deadline with each value; ' +
			'<code>Get</code> compares once and deletes on the spot if the entry is dead:</p>',
			{ code: 'if nowMs >= e.expiresAt { // boundary itself is expired\n\tdelete(c.items, key)   // lazy deletion, no reaper thread\n\treturn "", false\n}' },
			'<p>Details that carry the correctness:</p>' +
			'<ul>' +
			'<li><strong>Store the deadline, not the ttl.</strong> <code>setTime + ttlMs</code> ' +
			'computed once at write time makes every read a single comparison, and makes ' +
			'“Set restarts the TTL” automatic — the overwrite brings a fresh deadline.</li>' +
			'<li><strong>Pin the boundary.</strong> Live means <code>now &lt; deadline</code>, ' +
			'strictly. Whichever convention you pick, state it and test it — mixed ' +
			'<code>&lt;</code>/<code>&lt;=</code> across services is how two caches disagree ' +
			'about the same record.</li>' +
			'<li><strong>Inject the clock.</strong> <code>nowMs</code> as a parameter is why ' +
			'these tests replay timelines with zero sleeps — same convention as the ' +
			'token bucket.</li>' +
			'</ul>' +
			'<h3>Where else this shows up</h3>' +
			'<p>Redis expires keys exactly this way — lazily on access — plus a ' +
			'<em>sampling</em> sweep (20 random volatile keys, 10×/sec) purely to bound ' +
			'memory held by keys nobody touches again. DNS resolvers, session stores, ' +
			'and CDN object caches all follow the same shape: deadline stored with the ' +
			'entry, staleness decided at read time. When memory pressure matters, lazy ' +
			'TTL composes cleanly with the LRU/LFU eviction you built in the previous ' +
			'problems.</p>',
		],
		complexity: { time: 'O(1) per op', space: 'O(live + not-yet-collected entries)' },
	});
})();
