/* Transaction ID Wraparound & Freezing — Maintenance (Hard). Transaction ids
 * are 32 bits and the space is a circle: at any moment, ~2 billion xids
 * behind the current one are "the past" and ~2 billion ahead are "the
 * future". Age is signed modular arithmetic — int32(current - xid) — and
 * one step past half the circle flips ancient history into the future,
 * which is data loss. The harness pins the modular age, the ordering
 * predicate, the freeze decision, and the emergency-vacuum decision.
 */
(function () {
	'use strict';
	var T = GoLearnPG;

	// The xid circle: half past, half future, and freezing as the escape
	// hatch that moves tuples off the circle entirely. Marker id namespaced
	// (dgArrowPG05) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="the 32-bit xid circle: relative to the current xid, half the circle is the past and half is the future; an unfrozen tuple drifting past the halfway point would flip from past to future">' +
		'<text x="20" y="24" class="lbl">the 32-bit xid space is a circle — past and future are relative to “now”</text>' +
		'<circle cx="170" cy="130" r="70" fill="none" stroke="var(--edge)" stroke-width="1.5"/>' +
		// current position
		'<circle cx="170" cy="60" r="6" fill="var(--accent)"/>' +
		'<text x="170" y="46" text-anchor="middle" class="lbl" style="fill:var(--accent)">current xid</text>' +
		// past half (left), future half (right)
		'<text x="82" y="134" text-anchor="middle" class="lbl">← past</text>' +
		'<text x="260" y="134" text-anchor="middle" class="lbl">future →</text>' +
		'<line x1="170" y1="60" x2="170" y2="200" stroke="var(--edge)" stroke-width="1" stroke-dasharray="4 3"/>' +
		'<text x="170" y="214" text-anchor="middle" class="lbl">±2,147,483,648 — the halfway point</text>' +
		// drifting tuple
		'<circle cx="118" cy="185" r="5" fill="var(--warn)"/>' +
		'<path d="M 130 190 C 150 202 178 202 176 194" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowPG05)"/>' +
		'<text x="118" y="172" text-anchor="middle" class="lbl" style="fill:var(--warn)">old xmin drifting…</text>' +
		// freeze escape
		'<rect x="360" y="80" width="176" height="64" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="448" y="106" text-anchor="middle">FREEZE</text>' +
		'<text x="448" y="128" text-anchor="middle" class="lbl">marked “older than every</text>' +
		'<text x="448" y="142" text-anchor="middle" class="lbl">snapshot” — off the circle</text>' +
		'<text x="360" y="176" class="lbl" style="fill:var(--warn)">unfrozen past the halfway point: yesterday’s</text>' +
		'<text x="360" y="192" class="lbl" style="fill:var(--warn)">commits read as future — rows vanish</text>' +
		'<defs><marker id="dgArrowPG05" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'freeze-wraparound',
		title: 'Transaction ID Wraparound & Freezing',
		nav: 'freeze wraparound',
		difficulty: 'Hard',
		category: 'Maintenance',
		task: 'Implement modular xid age — int32(current − xid) — the Precedes ordering, the freeze decision, and the emergency-vacuum decision.',

		prose: [
			'<h2>Transaction ID Wraparound &amp; Freezing</h2>' +
			'<p>The log starts shouting: <code>WARNING: database "prod" must be ' +
			'vacuumed within 10500000 transactions</code>. Ignore it long enough ' +
			'and PostgreSQL stops accepting writes entirely — the famous ' +
			'wraparound shutdown that has taken down Mailchimp, Sentry, and half ' +
			'the companies with a good postmortem blog. The root cause is a ' +
			'number format. Every tuple’s <code>xmin</code> is a 32-bit ' +
			'transaction id, and 32 bits at production write rates is not much: ' +
			'the counter wraps. PostgreSQL’s answer is to make xid ordering ' +
			'<em>circular</em>:</p>' +
			'<ul>' +
			'<li><strong>Age is signed modular distance.</strong> ' +
			'<code>age = int32(current − xid)</code>, with the subtraction done in ' +
			'uint32 (it wraps) and the result read as signed. Positive → the past; ' +
			'negative → the future. Relative to any xid, half the circle (~2.1 ' +
			'billion) is past and half is future.</li>' +
			'<li><strong>The catastrophe is crossing the halfway point.</strong> ' +
			'An unfrozen tuple whose age reaches 2<sup>31</sup> flips sign: a ' +
			'commit from two billion transactions ago suddenly compares as ' +
			'<em>future</em>, fails every visibility check, and the rows silently ' +
			'vanish. That must never happen, so old tuples are ' +
			'<strong>frozen</strong> — permanently marked “committed before ' +
			'everything” so they no longer live on the circle at all.</li>' +
			'<li><strong>Two thresholds drive it.</strong> A vacuum freezes ' +
			'tuples with <code>age &gt; vacuum_freeze_min_age</code> (default ' +
			'50M) when it happens to visit them. And when a table’s ' +
			'<code>relfrozenxid</code> — the oldest possibly-unfrozen xid in it — ' +
			'exceeds <code>autovacuum_freeze_max_age</code> (default 200M), an ' +
			'<em>anti-wraparound</em> autovacuum launches whether the dead-tuple ' +
			'formula fired or not, and it cannot be disabled.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>XidAge</code> (return the signed age as an ' +
			'<code>int64</code> for easy printing), <code>Precedes(a, b)</code> ' +
			'(does <code>a</code> come before <code>b</code> on the circle — ' +
			'<code>int32(a − b) &lt; 0</code>), <code>NeedsFreeze</code> ' +
			'(<code>age &gt; freezeMinAge</code>), and ' +
			'<code>EmergencyVacuum</code> (<code>age of relfrozenxid &gt; ' +
			'freezeMaxAge</code>). All inputs are normal xids (≥ 3; ids 0–2 are ' +
			'reserved and never assigned to transactions).</p>',
			{ lang: 'txt', code: 'uint32 arithmetic wraps, int32 reads the sign:\n\nXidAge(1000, 500)         = int32(500)          =  500      (past)\nXidAge(100, 4294967000)   = int32(396)          =  396      (past, ACROSS the wrap)\nXidAge(500, 1000)         = int32(4294966796)   = -500      (future)\nXidAge(2147483651, 3)     = int32(2147483648)   = -2147483648  ← the cliff' },
			'<div class="tip">The same trick — “subtract in unsigned, compare in ' +
			'signed” — is how TCP sequence numbers (RFC 1982 serial arithmetic) ' +
			'and kernel jiffies comparisons work. PostgreSQL’s ' +
			'<code>TransactionIdPrecedes</code> is four lines of exactly this.</div>',
		],

		starter: [
			'package main',
			'',
			'// XidAge is how many transactions ago xid was assigned, relative to',
			'// current — computed on the CIRCLE: subtract in uint32 (wrapping),',
			'// then read the result as a signed int32. Negative means xid is in',
			'// current\'s future half.',
			'func XidAge(current, xid uint32) int64 {',
			'	// your code here — this linear version is the classic bug: it',
			'	// breaks the moment the counter wraps past zero',
			'	return int64(current) - int64(xid)',
			'}',
			'',
			'// Precedes reports whether a comes before b on the circle:',
			'// int32(a - b) < 0. This is TransactionIdPrecedes.',
			'func Precedes(a, b uint32) bool {',
			'	// your code here',
			'	return a < b',
			'}',
			'',
			'// NeedsFreeze: a vacuum visiting this tuple freezes it when its',
			'// xmin\'s age exceeds freezeMinAge (vacuum_freeze_min_age).',
			'func NeedsFreeze(current, xmin uint32, freezeMinAge int64) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// EmergencyVacuum: the anti-wraparound trigger — the table\'s',
			'// relfrozenxid age exceeds freezeMaxAge (autovacuum_freeze_max_age).',
			'func EmergencyVacuum(current, relfrozenxid uint32, freezeMaxAge int64) bool {',
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
			'	cases := []tc{',
			'		{"plain past: XidAge(1000, 500) = 500",',
			'			"500",',
			'			func() string { return fmt.Sprintf("%d", XidAge(1000, 500)) }},',
			'		{"plain future: XidAge(500, 1000) = -500",',
			'			"-500",',
			'			func() string { return fmt.Sprintf("%d", XidAge(500, 1000)) }},',
			'		{"across the wrap: counter restarted, old xid 4294967000 is only 396 back",',
			'			"396",',
			'			func() string { return fmt.Sprintf("%d", XidAge(100, 4294967000)) }},',
			'		{"the edge of the past: age 2147483647 is the oldest representable",',
			'			"2147483647",',
			'			func() string { return fmt.Sprintf("%d", XidAge(2147483650, 3)) }},',
			'		{"one step further: the sign flips — 2.1B-old history reads as FUTURE",',
			'			"-2147483648",',
			'			func() string { return fmt.Sprintf("%d", XidAge(2147483651, 3)) }},',
			'		{"Precedes across the wrap: 4294967000 comes before 100",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", Precedes(4294967000, 100)) }},',
			'		{"…and the naive a < b answer is exactly backwards",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", Precedes(100, 4294967000)) }},',
			'		{"NeedsFreeze: age 199,999,900 > freeze_min_age 50M — freeze it",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", NeedsFreeze(200000000, 100, 50000000)) }},',
			'		{"NeedsFreeze: a young tuple (age 1000) is left alone",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", NeedsFreeze(1000000, 999000, 50000000)) }},',
			'		{"EmergencyVacuum: relfrozenxid age 299,999,900 > 200M — anti-wraparound vacuum NOW",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", EmergencyVacuum(300000000, 100, 200000000)) }},',
			'		{"EmergencyVacuum: age exactly 200M is not yet over the line",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", EmergencyVacuum(200000100, 100, 200000000)) }},',
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
			'// XidAge: subtract in uint32 so the arithmetic wraps with the',
			'// counter, then reinterpret the 32-bit result as signed. The int32',
			'// cast is the entire algorithm: it splits the circle into a positive',
			'// half (the 2^31-1 xids behind current) and a negative half (the',
			'// 2^31 ahead). Widening to int64 happens ONLY after the int32 cast —',
			'// widening first would keep the raw wrapped value (e.g. 4294966796',
			'// instead of -500) and destroy the sign trick.',
			'func XidAge(current, xid uint32) int64 {',
			'	return int64(int32(current - xid))',
			'}',
			'',
			'// Precedes is TransactionIdPrecedes: a is older than b iff the',
			'// signed circular distance a-b is negative. Note what this gives up:',
			'// the relation is not transitive over the whole circle (it cannot',
			'// be — the circle has no global order). It only behaves when all',
			'// xids compared span less than half the circle, which is exactly',
			'// the invariant freezing exists to maintain.',
			'func Precedes(a, b uint32) bool {',
			'	return int32(a-b) < 0',
			'}',
			'',
			'// NeedsFreeze: strict > mirrors the server\'s cutoff computation',
			'// (cutoff = current - freeze_min_age; freeze what precedes it).',
			'// Freezing rewrites the tuple as "committed before every snapshot"',
			'// (the FROZEN infomask bits), taking it off the circle permanently —',
			'// after that its xmin can be reused by a new transaction safely.',
			'func NeedsFreeze(current, xmin uint32, freezeMinAge int64) bool {',
			'	return XidAge(current, xmin) > freezeMinAge',
			'}',
			'',
			'// EmergencyVacuum: same comparison, table-level input. relfrozenxid',
			'// is the table\'s watermark — every xmin in the table is guaranteed',
			'// frozen or younger than it — so ITS age is the table\'s worst case,',
			'// and the trigger fires on the worst case, not the average.',
			'func EmergencyVacuum(current, relfrozenxid uint32, freezeMaxAge int64) bool {',
			'	return XidAge(current, relfrozenxid) > freezeMaxAge',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why 32 bits, and why a circle</h3>' +
			'<p>The xid is stamped into every tuple header twice (xmin, xmax). ' +
			'Widening it to 64 bits would add 8 bytes to every row version in ' +
			'every table — a permanent storage tax to solve a bookkeeping ' +
			'problem. The circle is the cheaper deal: keep 32 bits on disk, make ' +
			'comparisons modular, and run a background process (freezing) that ' +
			'guarantees no live comparison ever spans half the circle. Internally ' +
			'the counter really is 64-bit now (epoch + xid — see ' +
			'<code>pg_current_xact_id()</code>); only the on-tuple stamps are ' +
			'32-bit, which is why freezing must exist.</p>' +
			'<h3>The escalation ladder</h3>' +
			'<p>The thresholds form a deliberate staircase. At ' +
			'<code>vacuum_freeze_min_age</code> (50M) tuples get frozen ' +
			'opportunistically, when a vacuum was visiting the page anyway. At ' +
			'<code>autovacuum_freeze_max_age</code> (200M) the anti-wraparound ' +
			'vacuum launches — it runs even with autovacuum disabled and, unlike ' +
			'normal autovacuum, will not yield to a conflicting lock request. At ' +
			'40M-before-the-cliff the server starts the WARNING countdown, and ' +
			'at 3M it stops assigning xids: read-only mode until a superuser ' +
			'vacuums. Each rung exists because someone ignored the previous ' +
			'one.</p>' +
			'<h3>What breaks in production</h3>' +
			'<ul>' +
			'<li><strong>Wraparound outages are almost never vacuum’s fault.</strong> ' +
			'The usual chain: something pins the xid horizon — a forgotten ' +
			'replication slot, a prepared transaction from a crashed 2PC ' +
			'coordinator, a week-old idle transaction — so anti-wraparound ' +
			'vacuums run and run but cannot advance <code>relfrozenxid</code>. ' +
			'Check <code>pg_replication_slots</code>, ' +
			'<code>pg_prepared_xacts</code>, and ' +
			'<code>pg_stat_activity</code> ordered by <code>backend_xmin</code> ' +
			'age before blaming autovacuum.</li>' +
			'<li><strong>Monitor the age, not the warnings.</strong> ' +
			'<code>SELECT datname, age(datfrozenxid) FROM pg_database</code> ' +
			'(and <code>age(relfrozenxid)</code> per table) belongs on every ' +
			'dashboard with an alert around 500M–1B. By the time the log warns, ' +
			'you are in the last 2% of the runway.</li>' +
			'<li><strong>Anti-wraparound vacuums arrive at the worst time.</strong> ' +
			'They trigger by age, not load, so the 4 TB table hits 200M mid ' +
			'Black Friday. Teams that schedule ' +
			'<code>VACUUM (FREEZE)</code> during quiet windows choose when to ' +
			'pay; v14+ softens the pain by failsafe-disabling cost throttling ' +
			'(<code>vacuum_failsafe_age</code>) when the cliff gets close.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(1) — one wrapping subtraction and a sign read', space: 'O(1)' },
	});
})();
