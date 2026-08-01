/* maxmemory: Sampled LRU Eviction — Server (Hard). Track per-key last-access
 * time (logical clock) and approximate memory; when a write would overflow
 * maxmemory, evict by policy: noeviction (write errors OOM), allkeys-lru,
 * volatile-lru (only TTL'd keys are candidates; OOM if none). Eviction is
 * SAMPLED like real Redis: pick K candidates deterministically (first K in
 * sorted key order here) and evict the least-recently-used of the sample.
 */
(function () {
	'use strict';
	var T = GoLearnRD;

	// The eviction decision tree a full instance walks on every write.
	// Marker id namespaced (dgArrowRD08): SVG ids share the page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="a write that would exceed maxmemory: noeviction errors OOM; allkeys-lru samples K keys and evicts the least recently used; volatile-lru samples only keys with a TTL and errors if there are none">' +
		'<text x="20" y="24" class="lbl">write arrives; used + incoming &gt; maxmemory — now what?</text>' +
		'<rect x="180" y="36" width="200" height="34" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="280" y="58" text-anchor="middle">which maxmemory-policy?</text>' +
		'<path d="M 220 70 L 100 100" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowRD08)"/>' +
		'<path d="M 280 70 L 280 100" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowRD08)"/>' +
		'<path d="M 340 70 L 460 100" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowRD08)"/>' +
		'<rect x="30" y="104" width="150" height="34" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="105" y="126" text-anchor="middle">noeviction</text>' +
		'<text x="105" y="158" text-anchor="middle" class="lbl" style="fill:var(--warn)">reject the write:</text>' +
		'<text x="105" y="174" text-anchor="middle" class="lbl" style="fill:var(--warn)">OOM error to the client</text>' +
		'<rect x="205" y="104" width="150" height="34" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="280" y="126" text-anchor="middle">allkeys-lru</text>' +
		'<text x="280" y="158" text-anchor="middle" class="lbl">sample K of ALL keys,</text>' +
		'<text x="280" y="174" text-anchor="middle" class="lbl">evict oldest last-access,</text>' +
		'<text x="280" y="190" text-anchor="middle" class="lbl">repeat until it fits</text>' +
		'<rect x="380" y="104" width="160" height="34" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="460" y="126" text-anchor="middle">volatile-lru</text>' +
		'<text x="460" y="158" text-anchor="middle" class="lbl">sample K of TTL\'d keys only;</text>' +
		'<text x="460" y="174" text-anchor="middle" class="lbl" style="fill:var(--warn)">no TTL\'d keys left?</text>' +
		'<text x="460" y="190" text-anchor="middle" class="lbl" style="fill:var(--warn)">OOM — same as noeviction</text>' +
		'<text x="20" y="214" class="lbl">sampled, not exact: K candidates, evict the LRU of the sample — approximate on purpose</text>' +
		'<defs><marker id="dgArrowRD08" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'lru-eviction',
		title: 'maxmemory: Sampled LRU Eviction',
		nav: 'lru eviction',
		difficulty: 'Hard',
		category: 'Server',
		task: 'Implement maxmemory eviction: per-key last-access tracking, approximate memory accounting, and sampled LRU under noeviction / allkeys-lru / volatile-lru.',

		prose: [
			'<h2>maxmemory: Sampled LRU Eviction</h2>' +
			'<p>03:12, pager: every write to the cache cluster is failing with ' +
			'<code>OOM command not allowed when used memory &gt; \'maxmemory\'</code>. ' +
			'Reads are fine, so the app limps along at database speed while the ' +
			'cache serves only its old, cooling data. Root cause: the instance ' +
			'filled to <code>maxmemory</code> and its policy is the default — ' +
			'<code>noeviction</code>, which protects the data by rejecting writes. ' +
			'For a <em>cache</em> that is exactly backwards; caches should quietly ' +
			'drop the coldest entries and keep serving. Which entries to drop is ' +
			'the eviction policy:</p>' +
			'<ul>' +
			'<li><strong><code>noeviction</code></strong> — never evict. A write ' +
			'that would exceed <code>maxmemory</code> fails with the OOM error. ' +
			'Right for Redis-as-database, wrong for Redis-as-cache.</li>' +
			'<li><strong><code>allkeys-lru</code></strong> — every key is a ' +
			'candidate; evict least-recently-used until the write fits. The ' +
			'standard cache policy.</li>' +
			'<li><strong><code>volatile-lru</code></strong> — only keys carrying ' +
			'a TTL are candidates (convention: TTL’d keys are “just cache”, ' +
			'unexpiring keys are precious). If <em>no</em> TTL’d key remains, ' +
			'behave like <code>noeviction</code>: OOM. A mixed workload that ' +
			'forgets to set TTLs starves this policy — a classic incident.</li>' +
			'</ul>' +
			'<p>And the twist that surprises everyone: Redis LRU is ' +
			'<strong>approximate</strong>. A true LRU needs a doubly linked list ' +
			'threaded through every key, rewired on <em>every read</em> — memory ' +
			'and cache-line traffic spent on bookkeeping instead of data. Instead, ' +
			'each key stores a last-access clock, and eviction <em>samples</em> ' +
			'<code>maxmemory-samples</code> keys (default 5), evicting the ' +
			'least-recently-used <em>of the sample</em>. Repeat until the write ' +
			'fits. Statistically that lands close to true LRU at a fraction of the ' +
			'cost.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Set</code>/<code>Get</code> on <code>Cache</code>. ' +
			'Model memory as <code>len(key) + len(value)</code> bytes per entry. ' +
			'<code>Get</code> refreshes the key’s last-access time (that is what ' +
			'makes it LRU, not FIFO). <code>Set</code> must evict per policy until ' +
			'the new entry fits, returning the evicted keys in order. To keep the ' +
			'harness deterministic, sample the <strong>first K candidate keys in ' +
			'sorted order</strong> (a stand-in for Redis’s random sample) and ' +
			'evict the sample member with the oldest last-access time, breaking ' +
			'ties by smaller key.</p>' +
			'<div class="tip">Evict in a loop, not once: a single large value may ' +
			'need several small victims. And update the last-access time on ' +
			'<em>writes too</em> — SET touches the key in Redis’s LRU clock, not ' +
			'just GET.</div>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// Policy names match redis.conf values.',
			'const (',
			'	PolicyNoEviction  = "noeviction"',
			'	PolicyAllKeysLRU  = "allkeys-lru"',
			'	PolicyVolatileLRU = "volatile-lru"',
			')',
			'',
			'// Cache is a maxmemory-bounded keyspace. lastAccess is the per-key',
			'// LRU clock (logical millis); expireAt marks TTL\'d keys (the',
			'// volatile set) — expiry itself is lazy, as in earlier lessons.',
			'type Cache struct {',
			'	maxMemory  int64',
			'	policy     string',
			'	sampleSize int',
			'	data       map[string]string',
			'	lastAccess map[string]int64',
			'	expireAt   map[string]int64',
			'}',
			'',
			'func NewCache(maxMemory int64, policy string, sampleSize int) *Cache {',
			'	return &Cache{',
			'		maxMemory:  maxMemory,',
			'		policy:     policy,',
			'		sampleSize: sampleSize,',
			'		data:       map[string]string{},',
			'		lastAccess: map[string]int64{},',
			'		expireAt:   map[string]int64{},',
			'	}',
			'}',
			'',
			'// Used returns the approximate memory in use:',
			'// sum of len(key)+len(value) over live entries.',
			'func (c *Cache) Used() int64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Get returns the value and refreshes the key\'s last-access time',
			'// (the touch that makes this LRU). Expired keys read as missing',
			'// and are removed.',
			'func (c *Cache) Get(key string, now int64) (string, bool) {',
			'	// your code here',
			'	return "", false',
			'}',
			'',
			'// Set writes key=val (ttlMillis 0 = no TTL), evicting per policy',
			'// until the entry fits. Returns the evicted keys in eviction order.',
			'// Under noeviction — or volatile-lru with no TTL\'d candidates —',
			'// a write that cannot fit fails with',
			'// "OOM command not allowed when used memory > \'maxmemory\'."',
			'// and must change nothing.',
			'//',
			'// Deterministic sampling contract (pinned by the harness): the',
			'// sample is the FIRST sampleSize candidate keys in sorted order;',
			'// the victim is the sample member with the OLDEST lastAccess,',
			'// ties broken by smaller key.',
			'func (c *Cache) Set(key, val string, ttlMillis int64, now int64) ([]string, error) {',
			'	// your code here',
			'	return nil, errors.New("not implemented")',
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
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	set := func(c *Cache, key, val string, ttl, now int64) string {',
			'		evicted, err := c.Set(key, val, ttl, now)',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return "evicted:[" + strings.Join(evicted, " ") + "]"',
			'	}',
			'	get := func(c *Cache, key string, now int64) string {',
			'		v, ok := c.Get(key, now)',
			'		if !ok {',
			'			return "(nil)"',
			'		}',
			'		return v',
			'	}',
			'	// Cache A: allkeys-lru, 30 bytes, sample 2. Keys "k1".."k4" with',
			'	// 8-byte values cost 10 bytes each — three fit, the fourth forces',
			'	// an eviction.',
			'	a := NewCache(30, PolicyAllKeysLRU, 2)',
			'	// Cache N: noeviction, 20 bytes.',
			'	n := NewCache(20, PolicyNoEviction, 2)',
			'	// Cache V: volatile-lru, 30 bytes.',
			'	v := NewCache(30, PolicyVolatileLRU, 2)',
			'	cases := []tc{',
			'		{"t=1..3: k1,k2,k3 fill cache A exactly — no evictions", "evicted:[] evicted:[] evicted:[] used=30",',
			'			func() string {',
			'				r1 := set(a, "k1", "aaaaaaaa", 0, 1)',
			'				r2 := set(a, "k2", "bbbbbbbb", 0, 2)',
			'				r3 := set(a, "k3", "cccccccc", 0, 3)',
			'				return fmt.Sprintf("%s %s %s used=%d", r1, r2, r3, a.Used())',
			'			}},',
			'		{"t=10: GET k1 refreshes its recency — k1 is now the HOTTEST key", "aaaaaaaa",',
			'			func() string { return get(a, "k1", 10) }},',
			'		{"t=20: k4 needs room; sample {k1,k2} sorted-first-2; k2 (t=2) is older", "evicted:[k2]",',
			'			func() string { return set(a, "k4", "dddddddd", 0, 20) }},',
			'		{"k2 is gone, k1 survived because the GET touched it", "k2=(nil) k1=aaaaaaaa",',
			'			func() string { return "k2=" + get(a, "k2", 21) + " k1=" + get(a, "k1", 21) }},',
			'		{"a big value needs TWO victims: eviction loops (k3, then k4 — the read at t=21 saved k1 again)", "evicted:[k3 k4]",',
			'			func() string { return set(a, "big", "xxxxxxxxxxx", 0, 30) }},',
			'		{"after the double eviction: big and the twice-saved k1 remain", "big=ok k1=aaaaaaaa used=24",',
			'			func() string {',
			'				bigState := "missing"',
			'				if _, ok := a.Get("big", 31); ok {',
			'					bigState = "ok"',
			'				}',
			'				return fmt.Sprintf("big=%s k1=%s used=%d", bigState, get(a, "k1", 31), a.Used())',
			'			}},',
			'		{"noeviction: the fill succeeds...", "evicted:[] evicted:[]",',
			'			func() string { return set(n, "n1", "aaaaaaaa", 0, 1) + " " + set(n, "n2", "bbbbbbbb", 0, 2) }},',
			'		{"...then the 3 AM page: OOM instead of eviction", "error: OOM command not allowed when used memory > \'maxmemory\'.",',
			'			func() string { return set(n, "n3", "cccccccc", 0, 3) }},',
			'		{"the rejected write changed nothing", "n3=(nil) used=20",',
			'			func() string { return fmt.Sprintf("n3=%s used=%d", get(n, "n3", 4), n.Used()) }},',
			'		{"overwriting an existing key under noeviction is fine (no growth)", "evicted:[]",',
			'			func() string { return set(n, "n2", "BBBBBBBB", 0, 5) }},',
			'		{"volatile-lru: two TTL\'d keys, one precious key with no TTL", "evicted:[] evicted:[] evicted:[]",',
			'			func() string {',
			'				r1 := set(v, "v1", "aaaaaaaa", 100000, 1)',
			'				r2 := set(v, "v2", "bbbbbbbb", 100000, 2)',
			'				r3 := set(v, "kp", "dddddddd", 0, 3)',
			'				return r1 + " " + r2 + " " + r3',
			'			}},',
			'		{"volatile-lru evicts only from the TTL\'d set: v1 (oldest volatile)", "evicted:[v1]",',
			'			func() string { return set(v, "v3", "cccccccc", 100000, 10) }},',
			'		{"the precious no-TTL key was never a candidate", "dddddddd",',
			'			func() string { return get(v, "kp", 11) }},',
			'		{"volatile-lru with no TTL\'d keys left: OOM like noeviction", "error: OOM command not allowed when used memory > \'maxmemory\'.",',
			'			func() string {',
			'				// Strip the volatile set by overwriting v2/v3 with no',
			'				// TTL (SET clears TTL — lesson 2 pays off here).',
			'				set(v, "v2", "bbbbbbbb", 0, 12)',
			'				set(v, "v3", "cccccccc", 0, 13)',
			'				return set(v, "v4", "eeeeeeee", 100000, 14)',
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
			'import (',
			'	"errors"',
			'	"sort"',
			')',
			'',
			'// The solution replaces the starter wholesale, so every constant',
			'// and type is redeclared here.',
			'const (',
			'	PolicyNoEviction  = "noeviction"',
			'	PolicyAllKeysLRU  = "allkeys-lru"',
			'	PolicyVolatileLRU = "volatile-lru"',
			')',
			'',
			'type Cache struct {',
			'	maxMemory  int64',
			'	policy     string',
			'	sampleSize int',
			'	data       map[string]string',
			'	lastAccess map[string]int64',
			'	expireAt   map[string]int64',
			'}',
			'',
			'func NewCache(maxMemory int64, policy string, sampleSize int) *Cache {',
			'	return &Cache{',
			'		maxMemory:  maxMemory,',
			'		policy:     policy,',
			'		sampleSize: sampleSize,',
			'		data:       map[string]string{},',
			'		lastAccess: map[string]int64{},',
			'		expireAt:   map[string]int64{},',
			'	}',
			'}',
			'',
			'// removeKey drops every trace of a key. One helper because a key',
			'// lives in three maps — forgetting one (usually lastAccess) leaks',
			'// bookkeeping and skews future eviction decisions.',
			'func (c *Cache) removeKey(key string) {',
			'	delete(c.data, key)',
			'	delete(c.lastAccess, key)',
			'	delete(c.expireAt, key)',
			'}',
			'',
			'func (c *Cache) purgeIfExpired(key string, now int64) {',
			'	deadline, hasTTL := c.expireAt[key]',
			'	if hasTTL && now >= deadline {',
			'		c.removeKey(key)',
			'	}',
			'}',
			'',
			'func (c *Cache) Used() int64 {',
			'	// Recomputed on demand for clarity; real Redis maintains a',
			'	// running zmalloc counter because summing per write would be',
			'	// O(n). At harness scale the honest sum is clearer.',
			'	total := int64(0)',
			'	for k, v := range c.data {',
			'		total += int64(len(k) + len(v))',
			'	}',
			'	return total',
			'}',
			'',
			'func (c *Cache) Get(key string, now int64) (string, bool) {',
			'	c.purgeIfExpired(key, now)',
			'	val, exists := c.data[key]',
			'	if !exists {',
			'		return "", false',
			'	}',
			'	// THE line that makes this LRU rather than FIFO: reads refresh',
			'	// recency. Redis stores this as a 24-bit clock in the object',
			'	// header — updated on every touch, read only at eviction time.',
			'	c.lastAccess[key] = now',
			'	return val, true',
			'}',
			'',
			'// evictOne picks and removes one victim; the bool reports whether',
			'// any candidate existed. Deterministic sampling contract: sample =',
			'// first sampleSize candidates in sorted key order (stand-in for',
			'// Redis\'s random sample), victim = oldest lastAccess in the sample,',
			'// ties to the smaller key.',
			'func (c *Cache) evictOne() (string, bool) {',
			'	candidates := make([]string, 0, len(c.data))',
			'	for k := range c.data {',
			'		// volatile-lru\'s defining restriction: only TTL\'d keys are',
			'		// evictable — no-TTL keys are treated as precious data.',
			'		if c.policy == PolicyVolatileLRU {',
			'			if _, hasTTL := c.expireAt[k]; !hasTTL {',
			'				continue',
			'			}',
			'		}',
			'		candidates = append(candidates, k)',
			'	}',
			'	if len(candidates) == 0 {',
			'		return "", false',
			'	}',
			'	// Sort makes the sample reproducible run to run — the property',
			'	// the harness needs. Real Redis instead keeps a persistent',
			'	// 16-slot eviction pool that random samples merge into, so good',
			'	// victims found in earlier rounds are not forgotten.',
			'	sort.Strings(candidates)',
			'	sample := candidates',
			'	if len(sample) > c.sampleSize {',
			'		sample = sample[:c.sampleSize]',
			'	}',
			'	victim := sample[0]',
			'	for _, k := range sample[1:] {',
			'		// Strictly-less keeps the tiebreak on the smaller key:',
			'		// sample is sorted, so the first oldest wins ties.',
			'		if c.lastAccess[k] < c.lastAccess[victim] {',
			'			victim = k',
			'		}',
			'	}',
			'	c.removeKey(victim)',
			'	return victim, true',
			'}',
			'',
			'func (c *Cache) Set(key, val string, ttlMillis int64, now int64) ([]string, error) {',
			'	c.purgeIfExpired(key, now)',
			'	// Memory math accounts for overwrites: replacing a key only',
			'	// grows usage by the size DELTA, so overwriting under a full',
			'	// noeviction cache still succeeds when the value fits.',
			'	incoming := int64(len(key) + len(val))',
			'	if old, exists := c.data[key]; exists {',
			'		incoming -= int64(len(key) + len(old))',
			'	}',
			'	evicted := []string{}',
			'	for c.Used()+incoming > c.maxMemory {',
			'		if c.policy == PolicyNoEviction {',
			'			// Fail BEFORE mutating: the rejected write must leave',
			'			// no trace, matching Redis (the command never runs).',
			'			return nil, errors.New("OOM command not allowed when used memory > \'maxmemory\'.")',
			'		}',
			'		victim, found := c.evictOne()',
			'		if !found {',
			'			// volatile-lru with an empty volatile set degrades to',
			'			// noeviction — the incident from the prose.',
			'			return nil, errors.New("OOM command not allowed when used memory > \'maxmemory\'.")',
			'		}',
			'		evicted = append(evicted, victim)',
			'	}',
			'	c.data[key] = val',
			'	// A write is a touch too: SET updates the LRU clock exactly',
			'	// like GET. Skipping this makes freshly written keys look',
			'	// ancient and immediately evictable — a subtle, real bug.',
			'	c.lastAccess[key] = now',
			'	delete(c.expireAt, key)',
			'	if ttlMillis > 0 {',
			'		c.expireAt[key] = now + ttlMillis',
			'	}',
			'	return evicted, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why sampled, not true LRU</h3>' +
			'<p>True LRU is a doubly linked list rewired on every read. For Redis ' +
			'that means 16 bytes of pointers per key (hundreds of MB at 10M keys) ' +
			'and — worse — every <code>GET</code> becomes a <em>write</em> to ' +
			'shared list nodes, wrecking cache lines on the hottest path in the ' +
			'server. Instead each object header carries a 24-bit last-access ' +
			'clock (~194-day wraparound), reads just stamp it, and eviction does ' +
			'the work: sample <code>maxmemory-samples</code> keys, evict the ' +
			'stalest. The original paper-napkin result from the Redis 3.0 rework: ' +
			'sampling 5 keys approximates true LRU closely, and 10 is nearly ' +
			'indistinguishable — tunable precision-vs-CPU with one config line. ' +
			'Real Redis also keeps a 16-entry <em>eviction pool</em> between ' +
			'rounds so good victims found earlier are not lost; your sorted-order ' +
			'sample is the deterministic stand-in for that machinery.</p>' +
			'<h3>LFU, and the policy zoo</h3>' +
			'<p>Redis 4.0 added <code>allkeys-lfu</code> / <code>volatile-lfu</code>: ' +
			'the 24-bit field splits into a logarithmic frequency counter and a ' +
			'decay timestamp, so a key read a million times last hour outranks a ' +
			'key read once a second ago — better for scan-resistant workloads ' +
			'(one <code>KEYS</code>-like sweep destroys LRU state but barely dents ' +
			'LFU). The rest of the zoo: <code>volatile-ttl</code> (evict soonest-' +
			'to-expire), <code>allkeys-random</code>/<code>volatile-random</code> ' +
			'(cheapest possible; surprisingly OK when the working set fits), and ' +
			'the split that actually matters operationally: <code>allkeys-*</code> ' +
			'says “everything is disposable cache”, <code>volatile-*</code> says ' +
			'“TTL marks the disposable subset”.</p>' +
			'<h3>Operational gotchas</h3>' +
			'<p>Three from real incidents. <strong>One:</strong> the default ' +
			'policy is <code>noeviction</code> — every team gets the 3 AM OOM page ' +
			'once, then sets <code>allkeys-lru</code> on cache instances. ' +
			'<strong>Two:</strong> <code>volatile-lru</code> silently becomes ' +
			'<code>noeviction</code> when writers stop setting TTLs (a refactor ' +
			'that swapped <code>SETEX</code> for plain <code>SET</code> has caused ' +
			'exactly this outage — lesson 2’s TTL-clearing bug striking at the ' +
			'fleet level). <strong>Three:</strong> <code>maxmemory</code> counts ' +
			'dataset + overhead but not everything (client output buffers can blow ' +
			'past it), and eviction happens on the write path — a full instance ' +
			'pays eviction latency <em>inside</em> user commands, visible as p99 ' +
			'spikes that correlate with <code>evicted_keys</code> in ' +
			'<code>INFO stats</code>. Watch that counter and the ' +
			'<code>keyspace_hits/misses</code> ratio: rising evictions with ' +
			'falling hit rate means the working set no longer fits, and no policy ' +
			'can fix undersizing.</p>',
		],
		complexity: { time: 'O(n log n) per eviction here (sort to sample); real Redis: O(samples) per eviction, O(1) clock stamp per access', space: 'O(n) — plus one 24-bit clock per key in real Redis, the whole point vs true LRU’s two pointers' },
	});
})();
