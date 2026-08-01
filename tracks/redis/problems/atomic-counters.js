/* INCR: Counters & Rate Limiting — Data Types (Easy). INCR/INCRBY/DECRBY on
 * string-typed integers (missing key counts as 0; non-integer values error),
 * then the canonical fixed-window rate limiter: INCR, EXPIRE on the first
 * hit of the window, allow iff count <= limit. The harness pins the atomic
 * read-modify-write semantics and the limiter's window rollover.
 */
(function () {
	'use strict';
	var T = GoLearnRD;

	// The fixed-window limiter: one counter per window, expiry attached on
	// the FIRST hit only. Marker id namespaced (dgArrowRD03) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 200" width="560" height="200" role="img" aria-label="fixed-window rate limiter: INCR a per-window counter, set expiry on the first hit, allow while the count is within the limit; the counter expires and the next window starts fresh">' +
		'<text x="20" y="24" class="lbl">rate limit 3 req / 10 s — one counter per window, expiry is the reset</text>' +
		'<line x1="30" y1="80" x2="530" y2="80" stroke="var(--edge)" stroke-width="2"/>' +
		'<line x1="60" y1="68" x2="60" y2="92" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="60" y="112" text-anchor="middle" class="lbl">INCR -&gt; 1</text>' +
		'<text x="60" y="128" text-anchor="middle" class="lbl">+ EXPIRE 10</text>' +
		'<line x1="130" y1="68" x2="130" y2="92" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="130" y="112" text-anchor="middle" class="lbl">INCR -&gt; 2</text>' +
		'<line x1="200" y1="68" x2="200" y2="92" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="200" y="112" text-anchor="middle" class="lbl">INCR -&gt; 3</text>' +
		'<line x1="270" y1="68" x2="270" y2="92" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="270" y="112" text-anchor="middle" class="lbl" style="fill:var(--warn)">INCR -&gt; 4</text>' +
		'<text x="270" y="128" text-anchor="middle" class="lbl" style="fill:var(--warn)">4 &gt; 3: DENY</text>' +
		'<line x1="390" y1="60" x2="390" y2="100" stroke="var(--warn)" stroke-width="2" stroke-dasharray="4 3"/>' +
		'<text x="390" y="52" text-anchor="middle" class="lbl" style="fill:var(--warn)">counter expires</text>' +
		'<line x1="470" y1="68" x2="470" y2="92" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="470" y="112" text-anchor="middle" class="lbl">INCR -&gt; 1 again</text>' +
		'<path d="M 396 70 L 460 70" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowRD03)"/>' +
		'<text x="20" y="160" class="lbl">the expiry IS the window reset — no cron job, no cleanup pass, the key just dies</text>' +
		'<text x="20" y="182" class="lbl" style="fill:var(--warn)">classic bug: attach EXPIRE on every hit and a steady trickle of traffic keeps the window alive forever</text>' +
		'<defs><marker id="dgArrowRD03" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'atomic-counters',
		title: 'INCR: Counters & Rate Limiting',
		nav: 'atomic counters',
		difficulty: 'Easy',
		category: 'Data Types',
		task: 'Implement INCR/INCRBY/DECRBY with the not-an-integer error, then the fixed-window rate limiter: INCR + EXPIRE on first hit, allow iff count <= limit.',

		prose: [
			'<h2>INCR: Counters &amp; Rate Limiting</h2>' +
			'<p>Your API gateway needs a rate limit <em>today</em> — a scraper is ' +
			'hammering the login endpoint. The naive fix, ' +
			'<code>n = GET counter; SET counter n+1</code>, has a race: two app ' +
			'servers read 41 simultaneously, both write 42, and one request is ' +
			'never counted. That read-modify-write gap is exactly what ' +
			'<code>INCR</code> closes. Redis executes commands one at a time on a ' +
			'single thread, so <code>INCR</code> is atomic <em>by construction</em> ' +
			'— no locks, no CAS loop, no lost updates, no matter how many clients ' +
			'hit the same key. The semantics:</p>' +
			'<ul>' +
			'<li><strong><code>INCR key</code></strong> — parse the string value ' +
			'as a signed 64-bit integer, add 1, store it back, return the new ' +
			'value. A <em>missing</em> key counts as 0, so the first ' +
			'<code>INCR</code> returns 1 — no separate initialization step, which ' +
			'is what makes the pattern race-free end to end.</li>' +
			'<li><strong><code>INCRBY key n</code> / <code>DECRBY key n</code></strong> ' +
			'— same, with an arbitrary delta. Negative results are fine; these are ' +
			'signed counters.</li>' +
			'<li><strong>Type discipline</strong> — if the value is not a valid ' +
			'integer string (<code>"hello"</code>, <code>"3.5"</code>), the command ' +
			'fails with <code>ERR value is not an integer or out of range</code> ' +
			'and <em>the value is untouched</em>.</li>' +
			'</ul>' +
			'<p>The rate limiter falls out in three lines. Key the counter by ' +
			'client and window — <code>ratelimit:&lt;client&gt;</code> — then:</p>' +
			'<ol>' +
			'<li><code>n = INCR key</code></li>' +
			'<li>if <code>n == 1</code> (first hit of a fresh window): ' +
			'<code>EXPIRE key window</code></li>' +
			'<li>allow iff <code>n &lt;= limit</code></li>' +
			'</ol>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>IncrBy</code>, <code>Incr</code>, ' +
			'<code>DecrBy</code>, <code>Expire</code>, and the limiter ' +
			'<code>Allow(client, limit, windowSecs, now)</code> on the ' +
			'<code>Counter</code> store. Expiry follows the previous lesson: ' +
			'absolute deadlines in logical millis, lazy purge on touch, and the ' +
			'expiry must be attached <em>only</em> on the first hit — re-arming it ' +
			'on every hit is the classic bug that turns a fixed window into a ' +
			'sliding one that never resets under steady traffic.</p>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// Counter is a string keyspace (like the strings-ttl Store) whose',
			'// values happen to be decimal integers. Redis has no integer type:',
			'// INCR is defined ON strings, which is why the parse error exists.',
			'type Counter struct {',
			'	data     map[string]string',
			'	expireAt map[string]int64',
			'}',
			'',
			'func NewCounter() *Counter {',
			'	return &Counter{data: map[string]string{}, expireAt: map[string]int64{}}',
			'}',
			'',
			'// Seed stores a raw string value with no expiry — the harness uses',
			'// it to plant non-integer values.',
			'func (c *Counter) Seed(key, val string) {',
			'	c.data[key] = val',
			'}',
			'',
			'// IncrBy atomically adds delta to the integer stored at key and',
			'// returns the new value. A missing (or expired) key counts as 0.',
			'// A non-integer value returns the error',
			'// "ERR value is not an integer or out of range" and changes nothing.',
			'func (c *Counter) IncrBy(key string, delta int64, now int64) (int64, error) {',
			'	// your code here',
			'	return 0, errors.New("not implemented")',
			'}',
			'',
			'// Incr is INCR: IncrBy with delta 1.',
			'func (c *Counter) Incr(key string, now int64) (int64, error) {',
			'	// your code here',
			'	return 0, errors.New("not implemented")',
			'}',
			'',
			'// DecrBy is DECRBY: subtract delta.',
			'func (c *Counter) DecrBy(key string, delta int64, now int64) (int64, error) {',
			'	// your code here',
			'	return 0, errors.New("not implemented")',
			'}',
			'',
			'// Expire attaches a deadline of now + secs*1000 to an existing key.',
			'// Returns true if the key existed (deadline set), false otherwise —',
			'// EXPIRE on a missing key is a no-op returning 0 in Redis.',
			'func (c *Counter) Expire(key string, secs int64, now int64) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// Allow is the fixed-window rate limiter for one client:',
			'//   n := INCR ratelimit:<client>',
			'//   if n == 1 { EXPIRE key windowSecs }   // first hit arms the window',
			'//   allow iff n <= limit',
			'// Returns (allowed, error). The error surfaces only if the key',
			'// holds garbage (someone SET a non-integer over it).',
			'func (c *Counter) Allow(client string, limit int64, windowSecs int64, now int64) (bool, error) {',
			'	// your code here',
			'	return false, errors.New("not implemented")',
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
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	// One store, one timeline — cases share state and order matters.',
			'	c := NewCounter()',
			'	c.Seed("greeting", "hello")',
			'	num := func(n int64, err error) string {',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return fmt.Sprintf("%d", n)',
			'	}',
			'	allow := func(ok bool, err error) string {',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return fmt.Sprintf("%v", ok)',
			'	}',
			'	cases := []tc{',
			'		{"INCR on a missing key: 0 -> 1, no init step needed", "1",',
			'			func() string { return num(c.Incr("page:views", 0)) }},',
			'		{"INCR again: 2", "2",',
			'			func() string { return num(c.Incr("page:views", 0)) }},',
			'		{"INCRBY 40: arbitrary deltas", "42",',
			'			func() string { return num(c.IncrBy("page:views", 40, 0)) }},',
			'		{"DECRBY 50: counters are signed, negatives are fine", "-8",',
			'			func() string { return num(c.DecrBy("page:views", 50, 0)) }},',
			'		{"INCR on a non-integer value errors", "error: ERR value is not an integer or out of range",',
			'			func() string { return num(c.Incr("greeting", 0)) }},',
			'		{"...and the garbage value is untouched", "hello",',
			'			func() string { return c.data["greeting"] }},',
			'		{"limiter t=0s: hit 1 of 3 allowed", "true",',
			'			func() string { return allow(c.Allow("scraper", 3, 10, 0)) }},',
			'		{"limiter t=1s: hit 2 allowed", "true",',
			'			func() string { return allow(c.Allow("scraper", 3, 10, 1000)) }},',
			'		{"limiter t=2s: hit 3 allowed — at the limit, not over", "true",',
			'			func() string { return allow(c.Allow("scraper", 3, 10, 2000)) }},',
			'		{"limiter t=3s: hit 4 DENIED", "false",',
			'			func() string { return allow(c.Allow("scraper", 3, 10, 3000)) }},',
			'		{"denied requests still count: the counter reads 4", "4",',
			'			func() string { return num(c.IncrBy("ratelimit:scraper", 0, 3000)) }},',
			'		{"t=9.999s: still inside the window, still denied", "false",',
			'			func() string { return allow(c.Allow("scraper", 3, 10, 9999)) }},',
			'		{"t=10s: window expired with the key — fresh counter, allowed", "true",',
			'			func() string { return allow(c.Allow("scraper", 3, 10, 10000)) }},',
			'		{"the fresh window counter restarted at 1", "1",',
			'			func() string { return num(c.IncrBy("ratelimit:scraper", 0, 10000)) }},',
			'		{"independent clients get independent windows", "true",',
			'			func() string { return allow(c.Allow("mobile-app", 3, 10, 10000)) }},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c2 := range cases {',
			'		r := map[string]any{"input": c2.name, "want": c2.want}',
			'		runCase(r, func() {',
			'			got := c2.got()',
			'			r["pass"] = got == c2.want',
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
			'	"strconv"',
			')',
			'',
			'// The solution replaces the starter wholesale, so the type and its',
			'// constructor are redeclared here.',
			'type Counter struct {',
			'	data     map[string]string',
			'	expireAt map[string]int64',
			'}',
			'',
			'func NewCounter() *Counter {',
			'	return &Counter{data: map[string]string{}, expireAt: map[string]int64{}}',
			'}',
			'',
			'func (c *Counter) Seed(key, val string) {',
			'	c.data[key] = val',
			'}',
			'',
			'// purgeIfExpired: same lazy-expiry gate as the strings lesson —',
			'// every touch checks the deadline first, so an expired counter is',
			'// indistinguishable from a missing one. That equivalence is what',
			'// makes the limiter\'s window reset work with zero cleanup code.',
			'func (c *Counter) purgeIfExpired(key string, now int64) {',
			'	deadline, hasTTL := c.expireAt[key]',
			'	if hasTTL && now >= deadline {',
			'		delete(c.data, key)',
			'		delete(c.expireAt, key)',
			'	}',
			'}',
			'',
			'func (c *Counter) IncrBy(key string, delta int64, now int64) (int64, error) {',
			'	c.purgeIfExpired(key, now)',
			'	// Missing key counts as 0 — the whole read-modify-write is one',
			'	// operation from the caller\'s view, initialization included.',
			'	// (In real Redis the atomicity comes from the single-threaded',
			'	// command loop; here, from being a single method call.)',
			'	cur := int64(0)',
			'	raw, exists := c.data[key]',
			'	if exists {',
			'		parsed, err := strconv.ParseInt(raw, 10, 64)',
			'		if err != nil {',
			'			// Redis\'s exact wording. The value is left untouched:',
			'			// a failed INCR must not corrupt what is there.',
			'			return 0, errors.New("ERR value is not an integer or out of range")',
			'		}',
			'		cur = parsed',
			'	}',
			'	next := cur + delta',
			'	// Stored back as a STRING: Redis counters are strings that parse.',
			'	// Note INCR does NOT touch the TTL — only value-replacing writes',
			'	// (SET) clear it. The limiter depends on this: hits 2..n must',
			'	// not extend the window.',
			'	c.data[key] = strconv.FormatInt(next, 10)',
			'	return next, nil',
			'}',
			'',
			'func (c *Counter) Incr(key string, now int64) (int64, error) {',
			'	return c.IncrBy(key, 1, now)',
			'}',
			'',
			'func (c *Counter) DecrBy(key string, delta int64, now int64) (int64, error) {',
			'	return c.IncrBy(key, -delta, now)',
			'}',
			'',
			'func (c *Counter) Expire(key string, secs int64, now int64) bool {',
			'	c.purgeIfExpired(key, now)',
			'	if _, exists := c.data[key]; !exists {',
			'		return false',
			'	}',
			'	c.expireAt[key] = now + secs*1000',
			'	return true',
			'}',
			'',
			'// Allow is the three-line limiter from the prose. Because Incr',
			'// creates-or-increments atomically, n == 1 is a reliable "I opened',
			'// this window" signal: exactly one caller per window sees it, so',
			'// exactly one EXPIRE is issued. Re-arming the expiry on every hit',
			'// would let steady traffic push the deadline forever — a window',
			'// that never resets, silently blocking a client for good.',
			'func (c *Counter) Allow(client string, limit int64, windowSecs int64, now int64) (bool, error) {',
			'	key := "ratelimit:" + client',
			'	n, err := c.Incr(key, now)',
			'	if err != nil {',
			'		return false, err',
			'	}',
			'	if n == 1 {',
			'		c.Expire(key, windowSecs, now)',
			'	}',
			'	// Denied hits still counted: n keeps growing past the limit,',
			'	// which is useful telemetry (how hard is the scraper trying?)',
			'	// and costs nothing — the key dies with the window either way.',
			'	return n <= limit, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Where the atomicity actually comes from</h3>' +
			'<p>Redis runs commands on one thread, one at a time — <code>INCR</code> ' +
			'is atomic for the same reason a single-threaded program has no data ' +
			'races. There is no compare-and-swap loop and no lock; the ' +
			'“transaction” is simply that nothing else can run in the middle. This ' +
			'is also why <code>MULTI</code>/<code>EXEC</code> and Lua scripts give ' +
			'you atomic multi-command sequences for free: they are queued and run ' +
			'back-to-back on the same single thread. The flip side: a slow command ' +
			'(<code>KEYS</code>, a huge <code>LRANGE</code>) blocks <em>every</em> ' +
			'client — single-threaded cuts both ways.</p>' +
			'<h3>Integer strings are not parsed on every hit</h3>' +
			'<p>Your solution parses the string each call; real Redis does not. A ' +
			'value that looks like a 64-bit integer is stored with encoding ' +
			'<code>int</code> — the pointer field of the value object <em>is</em> ' +
			'the integer (check with <code>OBJECT ENCODING key</code>). INCR then ' +
			'operates on machine words, and only re-encodes to a raw string if the ' +
			'value stops being numeric. Shared small-integer objects (0..9999 by ' +
			'default) mean a million counters at low values can reference the same ' +
			'handful of objects.</p>' +
			'<h3>Fixed windows lie a little</h3>' +
			'<p>The fixed window has a boundary burst problem: 3 requests at ' +
			't=9.9s and 3 more at t=10.1s is 6 requests in 200ms — each window ' +
			'individually legal. Fixes, in increasing cost: sliding-window ' +
			'counters (weight the previous window’s count by overlap), a sorted-set ' +
			'log of timestamps (<code>ZADD</code> + <code>ZREMRANGEBYSCORE</code>, ' +
			'exact but O(hits) memory), or a token bucket in a Lua script. Most ' +
			'production gateways ship the fixed window anyway — it is one counter, ' +
			'one expiry, and wrong by at most 2x for one boundary instant.</p>' +
			'<h3>Operational gotchas</h3>' +
			'<p>Two to remember. First, the INCR-then-EXPIRE pair in your ' +
			'<code>Allow</code> is two commands in real Redis — if the client dies ' +
			'between them, the counter is immortal and that client is ' +
			'rate-limited forever. Production code uses <code>SET key 1 EX 10 NX</code> ' +
			'+ INCR, a Lua script, or Redis 7’s ' +
			'<code>EXPIRE key 10 NX</code> to close the gap. Second, counters are ' +
			'why monitoring dashboards love Redis: <code>INCRBY bytes 4096</code> ' +
			'from a thousand hosts aggregates perfectly with no read path at all.</p>',
		],
		complexity: { time: 'O(1) per operation — parse, add, format, all on a single map entry', space: 'O(k) for k live counters; window counters die with their expiry' },
	});
})();
