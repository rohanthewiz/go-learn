/* SET NX PX: Distributed Locks — Patterns (Medium). Acquire with
 * SET resource token NX PX ttl; release ONLY by compare-token-then-delete
 * (the atomic check-and-del the Lua script exists for); and the two failure
 * stories the harness replays: a worker releasing someone else's lock after
 * its own TTL expired mid-work, and why a monotonically increasing fencing
 * token protects the downstream resource where a bare lock cannot.
 */
(function () {
	'use strict';
	var T = GoLearnRD;

	// The classic failure: A's lock expires mid-work, B acquires, then A
	// finishes and releases B's lock — unless release checks the token.
	// Marker id namespaced (dgArrowRD10): SVG ids share the page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="timeline: worker A acquires with ttl, stalls past expiry, worker B acquires; A finishes and a blind DEL would remove the second worker\'s lock, while a token-checked release refuses">' +
		'<text x="20" y="24" class="lbl">lock:invoice — TTL 1000ms, worker A stalls (GC pause) past its own expiry</text>' +
		'<line x1="30" y1="70" x2="530" y2="70" stroke="var(--edge)" stroke-width="2"/>' +
		'<line x1="60" y1="58" x2="60" y2="82" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="60" y="100" text-anchor="middle" class="lbl">t=0 A acquires</text>' +
		'<text x="60" y="116" text-anchor="middle" class="lbl">token=tokA</text>' +
		'<line x1="230" y1="58" x2="230" y2="82" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="230" y="100" text-anchor="middle" class="lbl" style="fill:var(--warn)">t=1000 TTL expires</text>' +
		'<text x="230" y="116" text-anchor="middle" class="lbl" style="fill:var(--warn)">(A still working!)</text>' +
		'<line x1="340" y1="58" x2="340" y2="82" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="340" y="100" text-anchor="middle" class="lbl">t=1500 B acquires</text>' +
		'<text x="340" y="116" text-anchor="middle" class="lbl">token=tokB</text>' +
		'<line x1="470" y1="58" x2="470" y2="82" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="470" y="100" text-anchor="middle" class="lbl" style="fill:var(--warn)">t=2000 A "done",</text>' +
		'<text x="470" y="116" text-anchor="middle" class="lbl" style="fill:var(--warn)">calls release</text>' +
		'<path d="M 470 130 C 470 170 350 176 348 130" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowRD10)"/>' +
		'<text x="408" y="178" text-anchor="middle" class="lbl" style="fill:var(--warn)">blind DEL kills B\'s lock</text>' +
		'<text x="20" y="200" class="lbl">safe release: GET the token first — stored tokB != mine tokA -&gt; refuse, return 0.</text>' +
		'<text x="20" y="216" class="lbl">GET+DEL must be ONE atomic step (the Lua script), or the token can change between them</text>' +
		'<defs><marker id="dgArrowRD10" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'distributed-locks',
		title: 'SET NX PX: Distributed Locks',
		nav: 'distributed locks',
		difficulty: 'Medium',
		category: 'Patterns',
		task: 'Implement Acquire (SET resource token NX PX), the atomic compare-token-then-delete Release, and fencing tokens that protect the downstream resource.',

		prose: [
			'<h2>SET NX PX: Distributed Locks</h2>' +
			'<p>Two invoice workers processed the same invoice; the customer was ' +
			'charged twice. The workers <em>had</em> a lock — the incident review ' +
			'finds this sequence: worker A took the lock with a 1s TTL, hit a GC ' +
			'pause, and its lock <em>expired mid-work</em>. Worker B correctly ' +
			'acquired the now-free lock and started the same invoice. Then A woke ' +
			'up, finished, and its cleanup code ran a blind <code>DEL</code> — ' +
			'<strong>deleting B’s lock</strong> — so a third worker piled in too. ' +
			'Every piece of that failure is preventable with three refinements to ' +
			'the basic pattern:</p>' +
			'<ul>' +
			'<li><strong>Acquire = <code>SET resource token NX PX ttl</code>.</strong> ' +
			'One command, atomic: <code>NX</code> makes it lock-if-free, ' +
			'<code>PX</code> attaches the TTL <em>in the same step</em> (a ' +
			'separate EXPIRE leaves a crash window that leaks an immortal lock), ' +
			'and <code>token</code> is a value <em>unique to this holder</em> — ' +
			'the lock records who owns it.</li>' +
			'<li><strong>Release = compare-then-delete, atomically.</strong> ' +
			'Read the stored token; delete <em>only</em> if it equals yours; ' +
			'return 1 if you deleted, 0 if the lock was not yours to release ' +
			'(expired, or re-acquired by someone else). GET-then-DEL as two ' +
			'steps has a race — the token can change between them — which is ' +
			'why real deployments ship this as a Lua script that Redis runs ' +
			'atomically. Your <code>Release</code> is that script as one Go ' +
			'function.</li>' +
			'<li><strong>Fencing tokens for the downstream resource.</strong> ' +
			'Even a token-checked release cannot stop A from <em>writing to the ' +
			'database</em> after its lease expired — A still believes it holds ' +
			'the lock while B works. The fix: every acquisition also gets a ' +
			'<strong>monotonically increasing number</strong>, and the protected ' +
			'resource rejects any write carrying a smaller number than the ' +
			'latest it has seen. B (fence 2) writes; A’s late write (fence 1) ' +
			'bounces. The lock throttles; the fence <em>guarantees</em>.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Acquire</code> (returns a fencing token and ' +
			'whether the lock was granted), <code>Release</code> (the atomic ' +
			'check-and-del), <code>UnsafeRelease</code> (the blind DEL, kept so ' +
			'the harness can demonstrate the incident), and ' +
			'<code>FencedStore.Apply</code> (accept a write only if its fence is ' +
			'newer than every fence seen so far). Time is the usual logical ' +
			'clock; expired locks are treated as absent on every touch.</p>' +
			'<div class="tip">The token and the fence solve different halves: ' +
			'the token protects <em>the lock key</em> from a wrong release; the ' +
			'fence protects <em>the resource behind the lock</em> from a stale ' +
			'holder. Production locks need both — and the fence only works ' +
			'because a single Redis counter hands out strictly increasing ' +
			'numbers.</div>',
		],

		starter: [
			'package main',
			'',
			'// lockEntry is one held lock: who holds it (token), until when',
			'// (absolute logical millis), and its fencing number.',
			'type lockEntry struct {',
			'	token    string',
			'	expireAt int64',
			'	fence    int64',
			'}',
			'',
			'// LockManager is the Redis side: a keyspace of locks plus the',
			'// monotonic fence counter (INCR on a counter key in real Redis).',
			'type LockManager struct {',
			'	locks map[string]lockEntry',
			'	fence int64',
			'}',
			'',
			'func NewLockManager() *LockManager {',
			'	return &LockManager{locks: map[string]lockEntry{}}',
			'}',
			'',
			'// Acquire is SET resource token NX PX ttlMillis, plus a fencing',
			'// token: if the resource is free (or its lock has expired, lazily',
			'// purged), store the caller\'s token with deadline now+ttlMillis,',
			'// increment the fence counter, and return (fence, true). If the',
			'// lock is held, return (0, false) and change nothing.',
			'func (m *LockManager) Acquire(resource, token string, ttlMillis, now int64) (int64, bool) {',
			'	// your code here',
			'	return 0, false',
			'}',
			'',
			'// Release is the atomic check-and-del (the Lua script as one',
			'// function): delete the lock ONLY if it is currently held with',
			'// exactly this token. Returns 1 on delete, 0 otherwise (missing,',
			'// expired, or held by someone else).',
			'func (m *LockManager) Release(resource, token string, now int64) int {',
			'	// your code here',
			'	return -1',
			'}',
			'',
			'// UnsafeRelease is the blind DEL from the incident: removes the',
			'// lock no matter who holds it. Returns 1 if a live lock was',
			'// deleted, 0 otherwise. Kept only to demonstrate the failure.',
			'func (m *LockManager) UnsafeRelease(resource string, now int64) int {',
			'	// your code here',
			'	return -1',
			'}',
			'',
			'// FencedStore is the protected downstream resource: it remembers',
			'// the highest fence it has accepted and rejects anything older.',
			'type FencedStore struct {',
			'	lastFence int64',
			'	value     string',
			'}',
			'',
			'// Apply accepts the write only if fence is STRICTLY greater than',
			'// every fence seen so far, recording it. Returns true if the write',
			'// was applied.',
			'func (f *FencedStore) Apply(fence int64, newValue string) bool {',
			'	// your code here',
			'	return false',
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
			'	// Two managers: L replays the token-release story, F the fencing',
			'	// story. Scripted order — cases build on each other.',
			'	l := NewLockManager()',
			'	f := NewLockManager()',
			'	db := &FencedStore{}',
			'	acq := func(m *LockManager, res, tok string, ttl, now int64) string {',
			'		fence, ok := m.Acquire(res, tok, ttl, now)',
			'		return fmt.Sprintf("ok=%v fence=%d", ok, fence)',
			'	}',
			'	cases := []tc{',
			'		{"t=0: A acquires lock:invoice with a 1000ms lease", "ok=true fence=1",',
			'			func() string { return acq(l, "lock:invoice", "tokA", 1000, 0) }},',
			'		{"t=500: B\'s attempt bounces off the held lock (NX)", "ok=false fence=0",',
			'			func() string { return acq(l, "lock:invoice", "tokB", 1000, 500) }},',
			'		{"t=500: A re-releasing with the WRONG token does nothing", "0",',
			'			func() string { return fmt.Sprintf("%d", l.Release("lock:invoice", "tokZ", 500)) }},',
			'		{"t=1500: A stalled past its TTL — B acquires the expired lock", "ok=true fence=2",',
			'			func() string { return acq(l, "lock:invoice", "tokB", 1000, 1500) }},',
			'		{"t=2000: A wakes and safe-releases: token mismatch, refused", "0",',
			'			func() string { return fmt.Sprintf("%d", l.Release("lock:invoice", "tokA", 2000)) }},',
			'		{"B\'s lock survived A\'s late release", "ok=false fence=0",',
			'			func() string { return acq(l, "lock:invoice", "tokC", 1000, 2000) }},',
			'		{"t=2100: B releases its own lock: 1", "1",',
			'			func() string { return fmt.Sprintf("%d", l.Release("lock:invoice", "tokB", 2100)) }},',
			'		{"replay with blind DEL instead: A\'s UnsafeRelease kills B\'s lock", "1",',
			'			func() string {',
			'				l.Acquire("lock:report", "tokA", 1000, 3000)',
			'				l.Acquire("lock:report", "tokB", 1000, 4500)',
			'				return fmt.Sprintf("%d", l.UnsafeRelease("lock:report", 5000))',
			'			}},',
			'		{"...and now a THIRD worker walks right in — the double-charge", "ok=true fence=5",',
			'			func() string { return acq(l, "lock:report", "tokC", 1000, 5000) }},',
			'		{"fencing story t=0: A acquires with fence 1", "ok=true fence=1",',
			'			func() string { return acq(f, "lock:db", "tokA", 1000, 0) }},',
			'		{"t=1500: A\'s lease lapsed; B acquires with fence 2", "ok=true fence=2",',
			'			func() string { return acq(f, "lock:db", "tokB", 1000, 1500) }},',
			'		{"B writes with fence 2: accepted", "true",',
			'			func() string { return fmt.Sprintf("%v", db.Apply(2, "invoice-paid-by-B")) }},',
			'		{"A\'s late write with stale fence 1: REJECTED — the fence guarantees", "false",',
			'			func() string { return fmt.Sprintf("%v", db.Apply(1, "invoice-paid-by-A")) }},',
			'		{"the store kept B\'s write", "invoice-paid-by-B",',
			'			func() string { return db.value }},',
			'		{"equal fence replays are rejected too (strictly greater)", "false",',
			'			func() string { return fmt.Sprintf("%v", db.Apply(2, "replay")) }},',
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
			'type lockEntry struct {',
			'	token    string',
			'	expireAt int64',
			'	fence    int64',
			'}',
			'',
			'type LockManager struct {',
			'	locks map[string]lockEntry',
			'	fence int64',
			'}',
			'',
			'func NewLockManager() *LockManager {',
			'	return &LockManager{locks: map[string]lockEntry{}}',
			'}',
			'',
			'// purgeIfExpired: the lock key is just a TTL\'d key, so the same',
			'// lazy-expiry rule applies — a lease past its deadline is absent',
			'// the moment anything touches it. This is precisely what lets B',
			'// acquire while A still believes it holds the lock: expiry does',
			'// not notify the holder.',
			'func (m *LockManager) purgeIfExpired(resource string, now int64) {',
			'	entry, held := m.locks[resource]',
			'	if held && now >= entry.expireAt {',
			'		delete(m.locks, resource)',
			'	}',
			'}',
			'',
			'func (m *LockManager) Acquire(resource, token string, ttlMillis, now int64) (int64, bool) {',
			'	m.purgeIfExpired(resource, now)',
			'	if _, held := m.locks[resource]; held {',
			'		return 0, false',
			'	}',
			'	// Fence increments ONLY on successful acquisition, so fence',
			'	// order == acquisition order. In real Redis this is an INCR on',
			'	// a counter key inside the same Lua script as the SET — one',
			'	// atomic step, one source of monotonic truth.',
			'	m.fence++',
			'	// Value + TTL in one atomic step is the point of SET NX PX:',
			'	// storing the token first and EXPIREing second would leave a',
			'	// crash window that leaks a lock with no deadline at all.',
			'	m.locks[resource] = lockEntry{token: token, expireAt: now + ttlMillis, fence: m.fence}',
			'	return m.fence, true',
			'}',
			'',
			'// Release is the check-and-del Lua script as one function:',
			'//   if redis.call("GET", KEYS[1]) == ARGV[1]',
			'//   then return redis.call("DEL", KEYS[1]) else return 0 end',
			'// The comparison and the delete happen with nothing in between —',
			'// as a Go method that is automatic; on a real server only a script',
			'// (or transaction) gets that guarantee.',
			'func (m *LockManager) Release(resource, token string, now int64) int {',
			'	m.purgeIfExpired(resource, now)',
			'	entry, held := m.locks[resource]',
			'	if !held || entry.token != token {',
			'		// 0, not an error: "not yours" is an expected outcome the',
			'		// caller must handle (log it — it means your lease expired',
			'		// mid-work and your TTL is too short for the job).',
			'		return 0',
			'	}',
			'	delete(m.locks, resource)',
			'	return 1',
			'}',
			'',
			'// UnsafeRelease is the incident: DEL without looking. It exists',
			'// here only so the harness can show B\'s lock dying at A\'s hands.',
			'func (m *LockManager) UnsafeRelease(resource string, now int64) int {',
			'	m.purgeIfExpired(resource, now)',
			'	if _, held := m.locks[resource]; !held {',
			'		return 0',
			'	}',
			'	delete(m.locks, resource)',
			'	return 1',
			'}',
			'',
			'type FencedStore struct {',
			'	lastFence int64',
			'	value     string',
			'}',
			'',
			'// Apply enforces monotonicity: strictly greater, so replays of the',
			'// current fence are rejected along with stale ones. The store',
			'// needs no clock and no knowledge of the lock — ordering alone',
			'// rejects every write from a holder whose lease has lapsed,',
			'// because the next holder\'s fence is always higher.',
			'func (f *FencedStore) Apply(fence int64, newValue string) bool {',
			'	if fence <= f.lastFence {',
			'		return false',
			'	}',
			'	f.lastFence = fence',
			'	f.value = newValue',
			'	return true',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the TTL must exist at all</h3>' +
			'<p>Drop the TTL and the first crashed holder deadlocks the system ' +
			'forever — there is no liveness without expiry. But the TTL is also ' +
			'the source of every failure in this lesson: it is a <em>guess</em> ' +
			'about how long the work takes, and any pause (GC, page fault, VM ' +
			'migration, a slow downstream call) can outlast it. That tension is ' +
			'fundamental: <strong>the lock is a lease, not a guarantee</strong>. ' +
			'Production systems attack it from both ends — a watchdog thread that ' +
			'extends the lease while the worker is demonstrably alive (compare-' +
			'token-then-PEXPIRE, another Lua script), and fencing at the resource ' +
			'for when even that fails.</p>' +
			'<h3>The fencing argument, properly</h3>' +
			'<p>The fencing-token design is the centerpiece of a well-known ' +
			'Kleppmann analysis of Redis-based locking (the Redlock debate): no ' +
			'matter how clever the lock service, a paused client cannot know it ' +
			'lost its lease, so <em>correctness must live at the resource</em>. ' +
			'A monotonic fence number makes stale writes detectable with one ' +
			'integer compare — but note the fine print your harness just proved: ' +
			'the resource itself must check-and-update the fence atomically, ' +
			'i.e. it must be at least a compare-and-set store. A resource that ' +
			'cannot do that (a plain filesystem, an S3 PUT) cannot be fenced, ' +
			'and then no distributed lock over it is fully safe — only ' +
			'less-likely-to-collide.</p>' +
			'<h3>What Redis ships versus what you built</h3>' +
			'<p>The single-instance pattern you implemented is the officially ' +
			'documented one: <code>SET resource token NX PX ttl</code> to lock, ' +
			'the compare-and-del script to unlock, a random token per holder ' +
			'(UUIDs in practice; never a worker ID, which a restarted worker ' +
			'would reuse and “inherit” its own stale lock). Redlock extends it ' +
			'across five independent Redises with majority voting — and the ' +
			'debate above is about whether that buys real safety under clock ' +
			'jumps and pauses; consensus systems (ZooKeeper, etcd) with built-in ' +
			'fencing epochs are the conservative answer when a double-execution ' +
			'costs real money. The pragmatic hierarchy: idempotent operations ' +
			'first (then the lock is a mere optimization), fencing where you ' +
			'can, and TTLs sized to p999 job duration, not the median.</p>' +
			'<h3>Operational notes</h3>' +
			'<p>Instrument the two 0-returns from <code>Release</code>: a ' +
			'nonzero rate of “not mine anymore” releases is your fleet telling ' +
			'you leases are expiring mid-work — lengthen the TTL or add the ' +
			'watchdog before it becomes the invoice incident. And keep lock keys ' +
			'in their own prefix with <code>volatile</code>-friendly policies: ' +
			'an <code>allkeys-lru</code> cache instance can <em>evict a held ' +
			'lock under memory pressure</em>, which no amount of token checking ' +
			'survives — locks belong on a <code>noeviction</code> instance.</p>',
		],
		complexity: { time: 'O(1) per operation — a map lookup, a compare, a delete; the Lua script adds no asymptotic cost', space: 'O(locks held) plus one integer for the fence counter' },
	});
})();
