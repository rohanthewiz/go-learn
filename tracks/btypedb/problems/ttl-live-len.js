/* TTL — btypedb: API & Codecs (Medium). Expiry done the durable way:
 * absolute unix-nano deadlines stored per key, reads that treat expired
 * keys as absent IMMEDIATELY, and a background sweeper that physically
 * removes them later — which is why Len and LiveLen can disagree. Time is
 * an explicit parameter throughout (never a wall clock), the same move
 * that makes the real engine's expiry testable. The harness pins the
 * read-vs-sweep split, the exact-deadline boundary, and Set clearing TTL.
 */
(function () {
	'use strict';
	var T = GoLearnBT;

	// One key's lifetime: visible before the deadline, logically gone at the
	// deadline (reads miss, LiveLen excludes), physically gone only when the
	// sweeper passes. Marker id namespaced (dgArrowBT03) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="timeline of a key with a TTL: visible before the deadline, invisible to reads at the deadline, physically removed later by the sweeper">' +
		'<text x="20" y="24" class="lbl">one key’s lifetime — logical death and physical death are different events</text>' +
		// timeline
		'<line x1="40" y1="90" x2="530" y2="90" stroke="var(--edge)" stroke-width="2"/>' +
		'<circle cx="80" cy="90" r="4" fill="var(--accent)"/>' +
		'<text x="80" y="76" text-anchor="middle" class="lbl">SetTTL(k, v, deadline)</text>' +
		'<circle cx="290" cy="90" r="4" fill="var(--warn)"/>' +
		'<text x="290" y="76" text-anchor="middle" class="lbl" style="fill:var(--warn)">deadline</text>' +
		'<circle cx="470" cy="90" r="4" fill="var(--warn)"/>' +
		'<text x="470" y="76" text-anchor="middle" class="lbl">sweeper pass</text>' +
		// phase brackets
		'<path d="M 84 112 L 286 112" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBT03)"/>' +
		'<text x="185" y="132" text-anchor="middle" class="lbl">Get hits · Len 1 · LiveLen 1</text>' +
		'<path d="M 294 148 L 466 148" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowBT03w)"/>' +
		'<text x="380" y="168" text-anchor="middle" class="lbl" style="fill:var(--warn)">Get misses · Len 1 · LiveLen 0</text>' +
		'<text x="380" y="184" text-anchor="middle" class="lbl" style="fill:var(--warn)">expired but unswept — still occupies memory</text>' +
		'<text x="475" y="132" class="lbl">Len 0</text>' +
		'<text x="20" y="204" class="lbl">reads never wait for the sweeper: expiry is enforced at read time, cleanup is deferred</text>' +
		'<defs>' +
		'<marker id="dgArrowBT03" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowBT03w" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'ttl-live-len',
		title: 'TTL: Absolute Deadlines & LiveLen',
		nav: 'ttl live len',
		difficulty: 'Medium',
		category: 'API & Codecs',
		task: 'Implement Get/Set/SetTTL/Len/LiveLen/Sweep against an explicit clock: expired keys vanish from reads immediately, from memory only when swept.',

		prose: [
			'<h2>TTL: Absolute Deadlines &amp; LiveLen</h2>' +
			'<p>A login service stores sessions with a 30-minute TTL. One night an ' +
			'on-call engineer graphs the store’s key count and finds it <em>growing ' +
			'forever</em> — yet no user ever sees a stale session. Both facts are ' +
			'correct, and the gap between them is how TTL actually works in real ' +
			'engines: <strong>expiry is enforced at read time; cleanup happens ' +
			'later</strong>. A key dies twice — logically at its deadline, ' +
			'physically when a sweeper gets around to it.</p>',
			{ lang: 'go', code: 'err = db.SetTTL("session:42", sess, 30*time.Minute) // expires in 30m\nd, ok := db.TTL("session:42")                       // remaining time\n\nn := db.Len()     // stored keys (expired-but-unswept included)\nn = db.LiveLen()  // unexpired keys only\n\n// A plain Set clears any TTL — the new value is permanent.\nerr = db.Set("session:42", sess)' },
			'<p>Three design points carry the whole mechanism:</p>' +
			'<ul>' +
			'<li><strong>Deadlines are absolute</strong>, not countdowns. ' +
			'<code>SetTTL</code> converts “30 minutes from now” into a unix-nano ' +
			'instant once, and stores <em>that</em>. Absolute deadlines survive a ' +
			'restart (the log records the instant, and a key that expired while ' +
			'the database was closed is simply gone on reopen), and they make ' +
			'every later check a single comparison: <code>now &gt;= deadline</code>.</li>' +
			'<li><strong>Reads enforce expiry immediately.</strong> ' +
			'<code>Get</code> at logical time <code>t</code> treats an expired key ' +
			'as absent even if the sweeper hasn’t run — correctness never waits ' +
			'for a background goroutine. Consequently <code>Len</code> (what is ' +
			'physically stored) and <code>LiveLen</code> (what a reader can see) ' +
			'are different numbers whenever expired keys sit unswept.</li>' +
			'<li><strong>A plain <code>Set</code> clears the TTL.</strong> The new ' +
			'value is permanent unless you say otherwise — forgetting this rule is ' +
			'how caches end up with immortal entries.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the six methods on <code>DB</code>. Time is an explicit ' +
			'<code>now</code> parameter (unix nanos) on everything that needs a ' +
			'clock — no <code>time.Now()</code> anywhere. The boundary is exact: a ' +
			'key with <code>deadline == now</code> is already expired ' +
			'(<code>now&nbsp;&gt;=&nbsp;deadline</code>). <code>Sweep(now)</code> ' +
			'physically deletes every expired key and returns how many it removed.</p>',
		],

		starter: [
			'package main',
			'',
			'// DB pairs a value map with a deadline table. A key present in vals',
			'// but absent from deadline is permanent; a key in both expires at',
			'// deadline[k] (unix nanos, absolute).',
			'type DB struct {',
			'	vals     map[string]string',
			'	deadline map[string]int64',
			'}',
			'',
			'// NewDB is given, complete.',
			'func NewDB() *DB {',
			'	return &DB{vals: make(map[string]string), deadline: make(map[string]int64)}',
			'}',
			'',
			'// expired reports whether k is past its deadline at time now.',
			'// The boundary is now >= deadline: a key dies AT its deadline.',
			'func (d *DB) expired(k string, now int64) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// Set stores a PERMANENT value: any existing TTL on k is cleared.',
			'func (d *DB) Set(k, v string) {',
			'	d.vals[k] = v',
			'	// your code here (what happens to an old deadline?)',
			'}',
			'',
			'// SetTTL stores v with an absolute expiry deadline (unix nanos).',
			'func (d *DB) SetTTL(k, v string, deadlineNs int64) {',
			'	// your code here',
			'}',
			'',
			'// Get returns the value at logical time now. An expired key is',
			'// absent IMMEDIATELY — never wait for the sweeper.',
			'func (d *DB) Get(k string, now int64) (string, bool) {',
			'	v, ok := d.vals[k]',
			'	// your code here (expiry check)',
			'	return v, ok',
			'}',
			'',
			'// Len counts stored keys — expired-but-unswept included.',
			'func (d *DB) Len() int {',
			'	return len(d.vals)',
			'}',
			'',
			'// LiveLen counts only keys a reader could still see at time now.',
			'func (d *DB) LiveLen(now int64) int {',
			'	// your code here',
			'	return len(d.vals)',
			'}',
			'',
			'// Sweep physically removes every expired key and returns the count',
			'// removed — the background sweeper\'s single pass.',
			'func (d *DB) Sweep(now int64) int {',
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
			'// Explicit logical clock: a fixed base instant plus second offsets.',
			'// Every case states its own "now" — determinism by construction.',
			'const secNs = int64(1000000000)',
			'const base = int64(1700000000) * secNs',
			'',
			'func at(s int64) int64 { return base + s*secNs }',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	fmtGet := func(v string, ok bool) string { return fmt.Sprintf("%q/%v", v, ok) }',
			'	cases := []tc{',
			'		{"Get before the deadline: the value is visible",',
			'			`"tok-1"/true`,',
			'			func() string {',
			'				d := NewDB()',
			'				d.SetTTL("s:1", "tok-1", at(30))',
			'				return fmtGet(d.Get("s:1", at(29)))',
			'			}},',
			'		{"Get AT the deadline: already expired (now >= deadline), absent with no sweep",',
			'			`""/false`,',
			'			func() string {',
			'				d := NewDB()',
			'				d.SetTTL("s:1", "tok-1", at(30))',
			'				return fmtGet(d.Get("s:1", at(30)))',
			'			}},',
			'		{"a permanent key ignores the clock entirely",',
			'			`"cfg"/true`,',
			'			func() string {',
			'				d := NewDB()',
			'				d.Set("app:cfg", "cfg")',
			'				return fmtGet(d.Get("app:cfg", at(999999)))',
			'			}},',
			'		{"expired but unswept: Len counts it, LiveLen does not",',
			'			"len=3 live=1",',
			'			func() string {',
			'				d := NewDB()',
			'				d.Set("app:cfg", "cfg")',
			'				d.SetTTL("s:1", "a", at(10))',
			'				d.SetTTL("s:2", "b", at(20))',
			'				return fmt.Sprintf("len=%d live=%d", d.Len(), d.LiveLen(at(25)))',
			'			}},',
			'		{"Sweep removes exactly the expired keys and reports the count",',
			'			"swept=2 len=1 live=1",',
			'			func() string {',
			'				d := NewDB()',
			'				d.Set("app:cfg", "cfg")',
			'				d.SetTTL("s:1", "a", at(10))',
			'				d.SetTTL("s:2", "b", at(20))',
			'				n := d.Sweep(at(25))',
			'				return fmt.Sprintf("swept=%d len=%d live=%d", n, d.Len(), d.LiveLen(at(25)))',
			'			}},',
			'		{"Sweep spares the not-yet-expired: deadline in the future survives",',
			'			`swept=1 "b"/true`,',
			'			func() string {',
			'				d := NewDB()',
			'				d.SetTTL("s:1", "a", at(10))',
			'				d.SetTTL("s:2", "b", at(60))',
			'				n := d.Sweep(at(30))',
			'				v, ok := d.Get("s:2", at(30))',
			'				return fmt.Sprintf("swept=%d %s", n, fmtGet(v, ok))',
			'			}},',
			'		{"plain Set clears the TTL: the key outlives its old deadline",',
			'			`"v2"/true live=1`,',
			'			func() string {',
			'				d := NewDB()',
			'				d.SetTTL("s:1", "v1", at(10))',
			'				d.Set("s:1", "v2")',
			'				v, ok := d.Get("s:1", at(100))',
			'				return fmt.Sprintf("%s live=%d", fmtGet(v, ok), d.LiveLen(at(100)))',
			'			}},',
			'		{"SetTTL on an expired key revives it with a fresh deadline",',
			'			`""/false then "v2"/true`,',
			'			func() string {',
			'				d := NewDB()',
			'				d.SetTTL("s:1", "v1", at(10))',
			'				before := fmtGet(d.Get("s:1", at(15)))',
			'				d.SetTTL("s:1", "v2", at(40))',
			'				after := fmtGet(d.Get("s:1", at(15)))',
			'				return before + " then " + after',
			'			}},',
			'		{"Sweep on an empty DB is a harmless no-op",',
			'			"swept=0 len=0",',
			'			func() string {',
			'				d := NewDB()',
			'				n := d.Sweep(at(10))',
			'				return fmt.Sprintf("swept=%d len=%d", n, d.Len())',
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
			'// DB pairs a value map with a deadline table. A key present in vals',
			'// but absent from deadline is permanent; a key in both expires at',
			'// deadline[k] (unix nanos, absolute). Splitting the tables — rather',
			'// than storing a struct{val, deadline} — keeps the common permanent',
			'// case free of expiry bookkeeping, mirroring how the real engine',
			'// hangs a separate deadline table off the tree.',
			'type DB struct {',
			'	vals     map[string]string',
			'	deadline map[string]int64',
			'}',
			'',
			'func NewDB() *DB {',
			'	return &DB{vals: make(map[string]string), deadline: make(map[string]int64)}',
			'}',
			'',
			'// expired: one comparison against an absolute instant. now >= deadline',
			'// (not >) — a key dies AT its deadline, so an exact-boundary read',
			'// misses. Absolute deadlines are the design choice that makes this',
			'// trivial: a stored countdown would need rewriting as time passes.',
			'func (d *DB) expired(k string, now int64) bool {',
			'	dl, has := d.deadline[k]',
			'	return has && now >= dl',
			'}',
			'',
			'// Set stores a PERMANENT value. Deleting the deadline is the load-',
			'// bearing line: without it, a Set over a TTL\'d key inherits the old',
			'// expiry and the "permanent" value silently vanishes later — the',
			'// classic cache bug this API rule exists to prevent.',
			'func (d *DB) Set(k, v string) {',
			'	d.vals[k] = v',
			'	delete(d.deadline, k)',
			'}',
			'',
			'// SetTTL stores value and deadline together. Overwriting both means',
			'// SetTTL on an expired-but-unswept key simply revives it — the old',
			'// corpse is indistinguishable from a fresh insert.',
			'func (d *DB) SetTTL(k, v string, deadlineNs int64) {',
			'	d.vals[k] = v',
			'	d.deadline[k] = deadlineNs',
			'}',
			'',
			'// Get enforces expiry at read time. Correctness cannot depend on the',
			'// sweeper\'s schedule: the sweeper is an optimization (reclaim',
			'// memory), never the mechanism that makes expiry true.',
			'func (d *DB) Get(k string, now int64) (string, bool) {',
			'	v, ok := d.vals[k]',
			'	if !ok || d.expired(k, now) {',
			'		return "", false',
			'	}',
			'	return v, ok',
			'}',
			'',
			'// Len is physical occupancy — what memory is actually holding,',
			'// expired corpses included. This is the number capacity planning',
			'// cares about.',
			'func (d *DB) Len() int {',
			'	return len(d.vals)',
			'}',
			'',
			'// LiveLen is logical occupancy — what a reader at time now could',
			'// see. O(n) here; the real engine answers it from a deadline-ordered',
			'// table instead (see the explanation).',
			'func (d *DB) LiveLen(now int64) int {',
			'	n := 0',
			'	for k := range d.vals {',
			'		if !d.expired(k, now) {',
			'			n++',
			'		}',
			'	}',
			'	return n',
			'}',
			'',
			'// Sweep is the background pass made explicit: physically delete',
			'// every expired key. Deleting from a map during range is defined',
			'// and safe in Go, so one pass suffices.',
			'func (d *DB) Sweep(now int64) int {',
			'	removed := 0',
			'	for k := range d.vals {',
			'		if d.expired(k, now) {',
			'			delete(d.vals, k)',
			'			delete(d.deadline, k)',
			'			removed++',
			'		}',
			'	}',
			'	return removed',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What the real btypedb does</h3>' +
			'<p>The engine runs your <code>Sweep</code> as a background goroutine, ' +
			'every 500&nbsp;ms by default (<code>WithSweepInterval</code> tunes or ' +
			'disables it). But it does not scan every key the way your O(n) pass ' +
			'does: deadlines live in a <strong>deadline-ordered table</strong> (a ' +
			'<code>btype.Table</code> sorted by expiry instant), so a sweep pass ' +
			'reads keys from the front of that table until it hits one whose ' +
			'deadline is still in the future — touching only the keys that ' +
			'actually expired, O(expired&nbsp;+&nbsp;log&nbsp;n) instead of O(n). ' +
			'The same table answers <code>LiveLen</code> cheaply: count how many ' +
			'table entries are past-deadline and subtract from <code>Len</code>.</p>' +
			'<p>Durability changes the picture in one way your in-memory model ' +
			'hides: <code>SetTTL</code> writes a log record whose value bytes are ' +
			'prefixed with the absolute deadline (8 bytes, unix nanos — you will ' +
			'frame exactly that record in the WAL items). Because the instant is ' +
			'absolute, replay needs no clock arithmetic: on open, a key whose ' +
			'deadline has passed while the database was closed is simply not ' +
			'resurrected. A relative TTL in the log would have to answer ' +
			'“relative to <em>when</em>?” — write time? open time? — and both ' +
			'answers are wrong for some crash.</p>' +
			'<h3>Trade-offs</h3>' +
			'<p>Read-time enforcement plus deferred cleanup is the standard design ' +
			'(Redis does the same: lazy expiry on access plus an active sampling ' +
			'cycle) because the alternatives are worse. Expire-on-timer-per-key ' +
			'costs a timer per key; sweep-only means readers see stale data ' +
			'between passes; enforce-only-on-read means memory never shrinks for ' +
			'keys nobody touches again. The combined design gives correct reads ' +
			'always, bounded memory eventually — at the price of the ' +
			'<code>Len</code>/<code>LiveLen</code> gap you implemented, which is ' +
			'exactly the number that confuses dashboards.</p>' +
			'<p>The deeper lesson is the explicit clock. Because every method ' +
			'takes <code>now</code> as a parameter, your harness tested exact ' +
			'deadline boundaries deterministically — no sleeps, no flaky timing. ' +
			'The real engine is structured the same way internally (the clock is ' +
			'injected), which is what lets its expiry tests pin “expired while ' +
			'closed” and boundary cases precisely. Any time-dependent system you ' +
			'build deserves the same seam.</p>',
		],
		complexity: { time: 'O(1) Get/Set/SetTTL; O(n) LiveLen/Sweep here — O(expired + log n) with a deadline-ordered table', space: 'O(n) for the value and deadline tables' },
	});
})();
