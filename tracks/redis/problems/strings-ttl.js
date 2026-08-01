/* Strings, SET Options & TTL Expiry — Data Types (Easy). SET with EX/PX/NX/XX,
 * GET, DEL, TTL (-1 no expiry, -2 missing) over an explicit logical clock,
 * with lazy expiry on read. The harness pins the classic production bug: a
 * plain SET silently CLEARS the TTL, turning a cache entry immortal — plus
 * the NX/XX gating that makes SET double as "add if absent" / "update only".
 */
(function () {
	'use strict';
	var T = GoLearnRD;

	// The timeline of a key with a TTL: alive, deadline, gone — and the bug
	// where a plain SET erases the deadline. Marker id namespaced
	// (dgArrowRD02) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 190" width="560" height="190" role="img" aria-label="a key set with EX 30 lives until its deadline and reads past it see nothing; a plain SET removes the deadline entirely">' +
		'<text x="20" y="24" class="lbl">SET session:42 alice EX 30 — the key carries an absolute deadline</text>' +
		'<line x1="30" y1="70" x2="530" y2="70" stroke="var(--edge)" stroke-width="2"/>' +
		'<line x1="60" y1="58" x2="60" y2="82" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="60" y="102" text-anchor="middle" class="lbl">t=0 SET ... EX 30</text>' +
		'<line x1="330" y1="58" x2="330" y2="82" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="330" y="102" text-anchor="middle" class="lbl">t=30s deadline</text>' +
		'<rect x="60" y="44" width="270" height="14" rx="3" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<text x="195" y="40" text-anchor="middle" class="lbl">GET sees the value; TTL counts down</text>' +
		'<text x="440" y="55" text-anchor="middle" class="lbl" style="fill:var(--warn)">GET -&gt; (nil), TTL -&gt; -2</text>' +
		'<path d="M 350 60 L 420 60" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowRD02)"/>' +
		'<text x="20" y="140" class="lbl" style="fill:var(--warn)">the bug: a plain SET session:42 bob at t=10s DELETES the deadline —</text>' +
		'<text x="20" y="158" class="lbl" style="fill:var(--warn)">the key now lives forever (TTL -1) unless something expires it again</text>' +
		'<text x="20" y="182" class="lbl">expiry is lazy here: the key is physically removed by the first read that lands past the deadline</text>' +
		'<defs><marker id="dgArrowRD02" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'strings-ttl',
		title: 'Strings, SET Options & TTL Expiry',
		nav: 'strings ttl',
		difficulty: 'Easy',
		category: 'Data Types',
		task: 'Implement SET with EX/PX/NX/XX, GET, DEL, and TTL (-1/-2 sentinels) over a logical millisecond clock, with lazy expiry — and plain SET clearing the TTL.',

		prose: [
			'<h2>Strings, SET Options &amp; TTL Expiry</h2>' +
			'<p>Sessions are supposed to die after 30 minutes. Yet ' +
			'<code>redis-cli DBSIZE</code> keeps climbing, memory with it, and a ' +
			'spot check finds session keys with <code>TTL</code> = <code>-1</code>: ' +
			'<em>no expiry at all</em>. The postmortem is one line of code — a ' +
			'“refresh the session” path that ran a plain <code>SET</code>. In ' +
			'Redis, <strong>SET wipes the key’s previous TTL</strong> unless you ' +
			're-specify one (or pass <code>KEEPTTL</code>). It is probably the ' +
			'single most common Redis bug in production. The semantics you need, ' +
			'precisely:</p>' +
			'<ul>' +
			'<li><strong><code>SET key val</code></strong> — stores the string, ' +
			'replies <code>OK</code>, and <em>removes any existing TTL</em>.</li>' +
			'<li><strong><code>EX seconds</code> / <code>PX millis</code></strong> — ' +
			'attach a relative expiry, stored internally as an <em>absolute</em> ' +
			'deadline (<code>now + ttl</code>).</li>' +
			'<li><strong><code>NX</code></strong> — only set if the key does ' +
			'<em>not</em> exist; <strong><code>XX</code></strong> — only if it ' +
			'<em>does</em>. On a failed condition the reply is <code>(nil)</code> ' +
			'and nothing changes — not the value, not the TTL.</li>' +
			'<li><strong><code>TTL key</code></strong> — remaining seconds, ' +
			'<em>rounded to the nearest second</em> (Redis computes ' +
			'<code>(pttl + 500) / 1000</code>); <code>-1</code> if the key exists ' +
			'without expiry; <code>-2</code> if the key is missing. The two ' +
			'sentinels are different diagnoses: <code>-1</code> means “immortal ' +
			'key” (your bug), <code>-2</code> means “already gone”.</li>' +
			'<li><strong>Lazy expiry</strong> — nothing fires at the deadline. A ' +
			'key past its deadline is dead the moment any command <em>touches</em> ' +
			'it: the read sees nothing and removes the corpse. Model it that way: ' +
			'every operation takes the logical clock <code>now</code> (millis) and ' +
			'treats <code>now &gt;= deadline</code> as gone.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the <code>Store</code> methods. Every method takes ' +
			'<code>now int64</code> — logical milliseconds — so the harness can ' +
			'replay an exact timeline:</p>',
			{ lang: 'txt', code: 't=0      SET session:42 alice EX 30   -> OK\nt=1000   TTL session:42               -> 29\nt=10000  SET session:42 bob            -> OK   (the bug: TTL now -1)\nt=45000  GET session:42               -> "bob" (immortal — never expired)' },
			'<div class="tip">Store the deadline as an absolute timestamp, not a ' +
			'countdown. Redis does the same: <code>EXPIRE</code>-family commands ' +
			'convert to an absolute unix-millis deadline at write time, so reads ' +
			'only ever compare two numbers.</div>',
		],

		starter: [
			'package main',
			'',
			'// SetOpts mirrors the SET command\'s option flags. Zero values mean',
			'// "option not given": EXSecs/PXMillis of 0 attach no expiry, and',
			'// NX/XX default to unconditional. (Real SET rejects NX with XX;',
			'// the harness never passes both.)',
			'type SetOpts struct {',
			'	EXSecs   int64',
			'	PXMillis int64',
			'	NX       bool',
			'	XX       bool',
			'}',
			'',
			'// Store is a string keyspace with optional per-key deadlines.',
			'// expireAt holds ABSOLUTE logical-millis deadlines; a key absent',
			'// from expireAt lives forever.',
			'type Store struct {',
			'	data     map[string]string',
			'	expireAt map[string]int64',
			'}',
			'',
			'func NewStore() *Store {',
			'	return &Store{data: map[string]string{}, expireAt: map[string]int64{}}',
			'}',
			'',
			'// Set stores key=val at logical time now, honoring NX/XX gating and',
			'// EX/PX expiry. Returns "OK" on a write, "(nil)" when NX/XX blocks',
			'// it. A successful plain Set (no EX/PX) must CLEAR any prior TTL.',
			'func (s *Store) Set(key, val string, opts SetOpts, now int64) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// Get returns the value, or "(nil)" if the key is missing or its',
			'// deadline has passed (now >= deadline). Lazy expiry: a read that',
			'// finds an expired key must also remove it.',
			'func (s *Store) Get(key string, now int64) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// Del removes the key, returning 1 if a live key was removed and 0',
			'// otherwise (missing or already expired — Redis counts only real',
			'// deletions).',
			'func (s *Store) Del(key string, now int64) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// TTL reports remaining life in SECONDS, rounded to nearest',
			'// ((remainingMillis + 500) / 1000, as Redis does): -2 if missing or',
			'// expired, -1 if the key has no deadline.',
			'func (s *Store) TTL(key string, now int64) int64 {',
			'	// your code here',
			'	return 0',
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
			'	// One store, one timeline: the cases below are a scripted replay,',
			'	// so ORDER MATTERS — each case advances the same logical clock.',
			'	s := NewStore()',
			'	i64 := func(n int64) string { return fmt.Sprintf("%d", n) }',
			'	cases := []tc{',
			'		{"t=0 SET session:42 alice EX 30", "OK",',
			'			func() string { return s.Set("session:42", "alice", SetOpts{EXSecs: 30}, 0) }},',
			'		{"t=1000 TTL: 29s remain (rounded from 29000ms)", "29",',
			'			func() string { return i64(s.TTL("session:42", 1000)) }},',
			'		{"t=29999 GET: 1ms before the deadline, still alive", "alice",',
			'			func() string { return s.Get("session:42", 29999) }},',
			'		{"t=30000 GET: at the deadline the key is gone", "(nil)",',
			'			func() string { return s.Get("session:42", 30000) }},',
			'		{"t=30000 TTL after expiry: -2, not -1 — the key does not exist", "-2",',
			'			func() string { return i64(s.TTL("session:42", 30000)) }},',
			'		{"t=31000 SET cart:7 3-items EX 60", "OK",',
			'			func() string { return s.Set("cart:7", "3-items", SetOpts{EXSecs: 60}, 31000) }},',
			'		{"t=40000 the bug: plain SET refreshes the value...", "OK",',
			'			func() string { return s.Set("cart:7", "4-items", SetOpts{}, 40000) }},',
			'		{"...and silently cleared the TTL: -1 means immortal", "-1",',
			'			func() string { return i64(s.TTL("cart:7", 40000)) }},',
			'		{"t=200000 way past the old deadline, the cart still reads", "4-items",',
			'			func() string { return s.Get("cart:7", 200000) }},',
			'		{"NX on an existing key: blocked, replies (nil)", "(nil)",',
			'			func() string { return s.Set("cart:7", "hijack", SetOpts{NX: true}, 200000) }},',
			'		{"NX blocked means NOTHING changed — value intact", "4-items",',
			'			func() string { return s.Get("cart:7", 200000) }},',
			'		{"XX on a missing key: blocked too", "(nil)",',
			'			func() string { return s.Set("no-such-key", "x", SetOpts{XX: true}, 200000) }},',
			'		{"NX on a missing key succeeds — the add-if-absent idiom", "OK",',
			'			func() string { return s.Set("lock:job", "worker-1", SetOpts{NX: true, PXMillis: 1500}, 200000) }},',
			'		{"PX 1500 rounds to TTL 2 (1500+500)/1000", "2",',
			'			func() string { return i64(s.TTL("lock:job", 200000)) }},',
			'		{"NX succeeds again after the old holder expired", "OK",',
			'			func() string { return s.Set("lock:job", "worker-2", SetOpts{NX: true, PXMillis: 1500}, 201500) }},',
			'		{"DEL a live key returns 1", "1",',
			'			func() string { return i64(int64(s.Del("cart:7", 201500))) }},',
			'		{"DEL an expired key returns 0 — expiry already killed it", "0",',
			'			func() string { return i64(int64(s.Del("lock:job", 300000))) }},',
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
			'// The solution replaces the starter wholesale, so every type is',
			'// redeclared here.',
			'type SetOpts struct {',
			'	EXSecs   int64',
			'	PXMillis int64',
			'	NX       bool',
			'	XX       bool',
			'}',
			'',
			'type Store struct {',
			'	data     map[string]string',
			'	expireAt map[string]int64',
			'}',
			'',
			'func NewStore() *Store {',
			'	return &Store{data: map[string]string{}, expireAt: map[string]int64{}}',
			'}',
			'',
			'// purgeIfExpired is the lazy-expiry gate every method calls first.',
			'// Centralizing it means no code path can ever observe a corpse: by',
			'// the time a method looks at s.data, expired keys are already gone.',
			'// This mirrors Redis\'s expireIfNeeded(), called at the top of every',
			'// key lookup.',
			'func (s *Store) purgeIfExpired(key string, now int64) {',
			'	deadline, hasTTL := s.expireAt[key]',
			'	// The deadline itself counts as dead: a read AT t == deadline',
			'	// sees nothing. Pinning >= (not >) keeps the boundary testable.',
			'	if hasTTL && now >= deadline {',
			'		delete(s.data, key)',
			'		delete(s.expireAt, key)',
			'	}',
			'}',
			'',
			'func (s *Store) Set(key, val string, opts SetOpts, now int64) string {',
			'	// Expiry runs BEFORE the NX/XX check — an expired key must look',
			'	// absent to NX, or expired locks could never be re-acquired.',
			'	s.purgeIfExpired(key, now)',
			'	_, exists := s.data[key]',
			'	if opts.NX && exists {',
			'		return "(nil)"',
			'	}',
			'	if opts.XX && !exists {',
			'		return "(nil)"',
			'	}',
			'	s.data[key] = val',
			'	// The design choice that causes the prose\'s production bug: SET',
			'	// is a full overwrite of the key\'s state, TTL included. Only an',
			'	// explicit EX/PX re-attaches a deadline; otherwise any previous',
			'	// one is dropped. (Redis added KEEPTTL in 6.0 precisely because',
			'	// this bit so many people.)',
			'	delete(s.expireAt, key)',
			'	if opts.PXMillis > 0 {',
			'		s.expireAt[key] = now + opts.PXMillis',
			'	} else if opts.EXSecs > 0 {',
			'		s.expireAt[key] = now + opts.EXSecs*1000',
			'	}',
			'	return "OK"',
			'}',
			'',
			'func (s *Store) Get(key string, now int64) string {',
			'	s.purgeIfExpired(key, now)',
			'	val, exists := s.data[key]',
			'	if !exists {',
			'		return "(nil)"',
			'	}',
			'	return val',
			'}',
			'',
			'func (s *Store) Del(key string, now int64) int {',
			'	// Purging first makes DEL of an expired key return 0: the key',
			'	// was already dead, DEL removed nothing. Redis reports the same',
			'	// because expireIfNeeded runs before the delete looks up the key.',
			'	s.purgeIfExpired(key, now)',
			'	if _, exists := s.data[key]; !exists {',
			'		return 0',
			'	}',
			'	delete(s.data, key)',
			'	delete(s.expireAt, key)',
			'	return 1',
			'}',
			'',
			'func (s *Store) TTL(key string, now int64) int64 {',
			'	s.purgeIfExpired(key, now)',
			'	if _, exists := s.data[key]; !exists {',
			'		return -2',
			'	}',
			'	deadline, hasTTL := s.expireAt[key]',
			'	if !hasTTL {',
			'		return -1',
			'	}',
			'	// Redis\'s exact rounding: TTL is PTTL rounded to the NEAREST',
			'	// second, not truncated — 29999ms reports 30, 29499ms reports 29.',
			'	return (deadline - now + 500) / 1000',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>How Redis really expires keys</h3>' +
			'<p>Lazy expiry — what you implemented — is half the story. If a key ' +
			'is never touched again, lazy expiry alone would leak it forever, so ' +
			'Redis adds an <strong>active</strong> cycle: roughly ten times a ' +
			'second it samples 20 keys from the expire-tracked set, deletes the ' +
			'dead ones, and if more than 25% of the sample was dead, immediately ' +
			'samples again. That loop is why memory eventually drops even without ' +
			'reads, and also why a huge burst of same-deadline keys (mass ' +
			'<code>EXPIRE</code> from a deploy script) can make the server spend ' +
			'whole milliseconds per cycle deleting — visible as periodic latency ' +
			'spikes in <code>redis-cli --latency</code>.</p>' +
			'<h3>Replication and expiry</h3>' +
			'<p>Replicas do <em>not</em> expire keys on their own. The primary ' +
			'expires and ships an explicit <code>DEL</code>/<code>UNLINK</code> to ' +
			'replicas — one authority, no clock-skew disagreements. (Since Redis ' +
			'3.2 replicas at least report expired keys as missing on read, but the ' +
			'memory is not freed until the primary’s DEL arrives.) This is why ' +
			'“replica shows keys the primary doesn’t” is usually not a bug, just ' +
			'expiry lag.</p>' +
			'<h3>The SET-clears-TTL bug family</h3>' +
			'<p>Three real-world variants of the bug this harness pins: the ' +
			'session-refresh plain SET (immortal sessions, memory climbs); a ' +
			'cache-warming job that repopulates hot keys with SET and no EX ' +
			'(cache never turns over — stale data forever); and a rate-limiter ' +
			'that resets its own window by SETting the counter. Audit rule of ' +
			'thumb: in a cache workload, every <code>SET</code> should carry ' +
			'<code>EX</code>/<code>PX</code> or <code>KEEPTTL</code>, and ' +
			'<code>TTL key</code> returning <code>-1</code> in production is a ' +
			'finding. Note also that among write commands, only ones that ' +
			'<em>replace</em> the value (SET, GETSET) clear the TTL — mutating ' +
			'commands like APPEND, INCR, or LPUSH leave it untouched.</p>' +
			'<h3>Why strings are not char arrays</h3>' +
			'<p>Values here are Go strings; in Redis they are SDS (simple dynamic ' +
			'strings): a length-prefixed, binary-safe buffer with O(1) length and ' +
			'preallocation for growth. Small integer strings never even allocate — ' +
			'values like <code>"123"</code> are stored as a shared integer object, ' +
			'which is what makes INCR (next lesson) possible without parsing on ' +
			'every hit.</p>',
		],
		complexity: { time: 'O(1) per operation — map lookups plus a constant-time deadline compare', space: 'O(k) for k live keys; expired keys are reclaimed on first touch' },
	});
})();
