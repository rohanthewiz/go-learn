/* The Five Locking States — Durability (Medium). Rollback-journal
 * SQLite coordinates whole-file access through five lock states:
 * UNLOCKED -> SHARED -> RESERVED -> PENDING -> EXCLUSIVE. Many SHARED
 * coexist; one RESERVED coexists with readers; PENDING stops NEW
 * readers while old ones drain; EXCLUSIVE requires zero readers. The
 * harness pins the legal ladder (including the hot-journal SHARED ->
 * PENDING exception), the admission matrix, and exactly where
 * "database is locked" (SQLITE_BUSY) comes from.
 */
(function () {
	'use strict';
	var T = GoLearnSQ;

	// The lock ladder. PENDING is the barrier state: new readers bounce,
	// existing readers drain. Marker id namespaced (dgArrowSQ09) because
	// every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="the five lock states from UNLOCKED through SHARED, RESERVED, PENDING to EXCLUSIVE; many shared holders coexist, one reserved coexists with readers, pending blocks new readers while existing ones drain, exclusive requires zero readers">' +
		'<text x="20" y="22" class="lbl">a writer climbs the ladder one state at a time — each step admits fewer others</text>' +
		'<rect x="20" y="38" width="88" height="40" rx="5" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="64" y="63" text-anchor="middle" style="font-size:12px">UNLOCKED</text>' +
		'<path d="M 108 58 L 128 58" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ09)"/>' +
		'<rect x="132" y="38" width="80" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="172" y="63" text-anchor="middle" style="font-size:12px">SHARED</text>' +
		'<path d="M 212 58 L 232 58" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ09)"/>' +
		'<rect x="236" y="38" width="90" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="281" y="63" text-anchor="middle" style="font-size:12px">RESERVED</text>' +
		'<path d="M 326 58 L 346 58" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ09)"/>' +
		'<rect x="350" y="38" width="80" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="390" y="63" text-anchor="middle" style="font-size:12px">PENDING</text>' +
		'<path d="M 430 58 L 450 58" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ09)"/>' +
		'<rect x="454" y="38" width="56" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="482" y="63" text-anchor="middle" style="font-size:11px">EXCL</text>' +
		'<text x="172" y="106" text-anchor="middle" class="lbl">many at once</text>' +
		'<text x="281" y="106" text-anchor="middle" class="lbl">only one; readers OK</text>' +
		'<text x="390" y="106" text-anchor="middle" class="lbl" style="fill:var(--warn)">no NEW readers</text>' +
		'<text x="482" y="106" text-anchor="middle" class="lbl" style="fill:var(--warn)">alone</text>' +
		'<path d="M 172 120 C 200 160 360 160 388 120" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowSQ09)"/>' +
		'<text x="280" y="168" text-anchor="middle" class="lbl" style="fill:var(--warn)">the one shortcut: SHARED → PENDING, taken only to roll back a hot journal</text>' +
		'<text x="20" y="198" class="lbl">every "blocked" in this protocol surfaces in your app as SQLITE_BUSY: database is locked</text>' +
		'<defs><marker id="dgArrowSQ09" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'locking-states',
		title: 'The Five Locking States',
		nav: 'locking states',
		difficulty: 'Medium',
		category: 'Durability',
		task: 'Implement ValidUpgrade (the legal lock ladder, plus the hot-journal SHARED→PENDING exception) and Admit (grant or SQLITE_BUSY, given what other connections hold).',

		prose: [
			'<h2>The Five Locking States</h2>' +
			'<p>The most-searched SQLite error in existence: ' +
			'<code>SQLITE_BUSY: database is locked</code>. It is not a deadlock, ' +
			'not corruption, and not random — it is one specific answer from one ' +
			'specific admission check in a five-state protocol that ' +
			'rollback-journal SQLite runs over the <em>whole file</em> (there ' +
			'are no row or page locks). Every connection is always in exactly ' +
			'one state:</p>',
			{ lang: 'txt', code: 'state      who may hold it        coexists with (held by others)\nUNLOCKED   everyone (default)     anything\nSHARED     any number of readers  other SHARED, one RESERVED\nRESERVED   ONE intending writer   any number of SHARED\nPENDING    ONE committing writer  EXISTING shared (draining);\n                                  admits NO new SHARED\nEXCLUSIVE  ONE writer, alone      nothing\n\nladder: UNLOCKED -> SHARED -> RESERVED -> PENDING -> EXCLUSIVE\nexception: SHARED -> PENDING directly, only to roll back a hot journal' },
			'<ul>' +
			'<li><strong>RESERVED is “I will write, keep reading.”</strong> The ' +
			'writer buffers changes in its page cache; readers continue ' +
			'undisturbed. Only one RESERVED can exist — a second write ' +
			'transaction gets SQLITE_BUSY immediately.</li>' +
			'<li><strong>PENDING is the fairness gate.</strong> To flush pages ' +
			'the writer needs EXCLUSIVE, which requires zero readers. If it just ' +
			'waited, a stream of new readers could starve it forever. PENDING ' +
			'stops <em>new</em> SHARED requests (they get SQLITE_BUSY) while ' +
			'existing readers finish naturally — a drain, not an eviction.</li>' +
			'<li><strong>EXCLUSIVE is the only state that touches the db ' +
			'file.</strong> Zero SHARED holders remain; the journal protocol ' +
			'from the previous lesson runs; then everything unwinds to ' +
			'UNLOCKED.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Two functions. <code>ValidUpgrade(from, to)</code>: is this a ' +
			'legal single step for one connection — the four ladder steps plus ' +
			'the hot-journal <code>SHARED→PENDING</code> exception, nothing ' +
			'else (no skipping <code>RESERVED→EXCLUSIVE</code>). ' +
			'<code>Admit(others, want)</code>: given the locks <em>other</em> ' +
			'connections hold, grant the requested state or return the exact ' +
			'SQLITE_BUSY reason:</p>' +
			'<ul>' +
			'<li>SHARED — blocked by a PENDING or EXCLUSIVE holder: ' +
			'<code>"SQLITE_BUSY: a writer is committing"</code></li>' +
			'<li>RESERVED — blocked by another RESERVED/PENDING/EXCLUSIVE: ' +
			'<code>"SQLITE_BUSY: another write transaction is active"</code></li>' +
			'<li>PENDING — blocked by another RESERVED/PENDING/EXCLUSIVE: ' +
			'<code>"SQLITE_BUSY: another writer is ahead"</code></li>' +
			'<li>EXCLUSIVE — blocked while ANY other lock exists, including ' +
			'readers: <code>"SQLITE_BUSY: readers still hold shared locks"</code></li>' +
			'</ul>',
		],

		starter: [
			'package main',
			'',
			'// LockSet describes what OTHER connections currently hold.',
			'type LockSet struct {',
			'	Shared    int  // number of shared (reader) holders',
			'	Reserved  bool // an intending writer exists',
			'	Pending   bool // a committing writer is draining readers',
			'	Exclusive bool // a writer owns the file outright',
			'}',
			'',
			'// ValidUpgrade reports whether one connection may step from lock',
			'// state `from` to `to`: the ladder UNLOCKED->SHARED->RESERVED->',
			'// PENDING->EXCLUSIVE taken one rung at a time, plus the single',
			'// documented exception SHARED->PENDING (hot-journal rollback).',
			'// Everything else — skipped rungs, backwards "upgrades" — is false.',
			'func ValidUpgrade(from, to string) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// Admit decides a lock request against what others hold. It returns',
			'// (true, "") on grant, or (false, reason) with the exact reasons:',
			'//',
			'//   SHARED    blocked by Pending or Exclusive:',
			'//             "SQLITE_BUSY: a writer is committing"',
			'//   RESERVED  blocked by Reserved, Pending, or Exclusive:',
			'//             "SQLITE_BUSY: another write transaction is active"',
			'//   PENDING   blocked by Reserved, Pending, or Exclusive:',
			'//             "SQLITE_BUSY: another writer is ahead"',
			'//   EXCLUSIVE blocked by ANY other lock (readers included):',
			'//             "SQLITE_BUSY: readers still hold shared locks"',
			'//',
			'// An unknown lock name returns (false, "unknown lock level").',
			'func Admit(others LockSet, want string) (bool, string) {',
			'	// your code here',
			'	return false, ""',
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
			'// showAdmit flattens an Admit result: "granted" or the reason.',
			'func showAdmit(ok bool, reason string) string {',
			'	if ok {',
			'		return "granted"',
			'	}',
			'	return reason',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"the ladder, rung by rung: U->S, S->R, R->P, P->E all legal",',
			'			"true true true true",',
			'			func() string {',
			'				return fmt.Sprintf("%v %v %v %v",',
			'					ValidUpgrade("UNLOCKED", "SHARED"),',
			'					ValidUpgrade("SHARED", "RESERVED"),',
			'					ValidUpgrade("RESERVED", "PENDING"),',
			'					ValidUpgrade("PENDING", "EXCLUSIVE"))',
			'			}},',
			'		{"the hot-journal exception: SHARED -> PENDING is legal",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", ValidUpgrade("SHARED", "PENDING")) }},',
			'		{"no rung-skipping: U->R, S->E, R->E are all illegal",',
			'			"false false false",',
			'			func() string {',
			'				return fmt.Sprintf("%v %v %v",',
			'					ValidUpgrade("UNLOCKED", "RESERVED"),',
			'					ValidUpgrade("SHARED", "EXCLUSIVE"),',
			'					ValidUpgrade("RESERVED", "EXCLUSIVE"))',
			'			}},',
			'		{"no going backwards: RESERVED -> SHARED is not an upgrade",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", ValidUpgrade("RESERVED", "SHARED")) }},',
			'		{"readers scale: a 4th SHARED joins 3 existing readers",',
			'			"granted",',
			'			func() string { return showAdmit(Admit(LockSet{Shared: 3}, "SHARED")) }},',
			'		{"RESERVED does not disturb readers: new SHARED still granted",',
			'			"granted",',
			'			func() string { return showAdmit(Admit(LockSet{Shared: 2, Reserved: true}, "SHARED")) }},',
			'		{"PENDING is the gate: a NEW reader is refused while readers drain",',
			'			"SQLITE_BUSY: a writer is committing",',
			'			func() string { return showAdmit(Admit(LockSet{Shared: 2, Pending: true}, "SHARED")) }},',
			'		{"one write intent at a time: RESERVED vs existing RESERVED",',
			'			"SQLITE_BUSY: another write transaction is active",',
			'			func() string { return showAdmit(Admit(LockSet{Shared: 1, Reserved: true}, "RESERVED")) }},',
			'		{"RESERVED alongside readers only: granted over 5 SHARED",',
			'			"granted",',
			'			func() string { return showAdmit(Admit(LockSet{Shared: 5}, "RESERVED")) }},',
			'		{"PENDING may begin while readers still hold SHARED (they drain)",',
			'			"granted",',
			'			func() string { return showAdmit(Admit(LockSet{Shared: 2}, "PENDING")) }},',
			'		{"EXCLUSIVE with even ONE reader left: blocked — this is the drain",',
			'			"SQLITE_BUSY: readers still hold shared locks",',
			'			func() string { return showAdmit(Admit(LockSet{Shared: 1}, "EXCLUSIVE")) }},',
			'		{"EXCLUSIVE once the last reader leaves: granted",',
			'			"granted",',
			'			func() string { return showAdmit(Admit(LockSet{}, "EXCLUSIVE")) }},',
			'		{"unknown lock name: refused, named",',
			'			"unknown lock level",',
			'			func() string { return showAdmit(Admit(LockSet{}, "SUPERLOCK")) }},',
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
			'// LockSet describes what OTHER connections currently hold.',
			'type LockSet struct {',
			'	Shared    int',
			'	Reserved  bool',
			'	Pending   bool',
			'	Exclusive bool',
			'}',
			'',
			'// ValidUpgrade encodes the ladder as explicit (from, to) pairs.',
			'// Five entries beat a numeric ordering ("to == from+1") because the',
			'// exception edge SHARED->PENDING breaks the arithmetic — and an',
			'// explicit table makes the exception visible instead of special-',
			'// cased in a formula.',
			'func ValidUpgrade(from, to string) bool {',
			'	if from == "UNLOCKED" && to == "SHARED" {',
			'		return true',
			'	}',
			'	if from == "SHARED" && to == "RESERVED" {',
			'		return true',
			'	}',
			'	if from == "RESERVED" && to == "PENDING" {',
			'		return true',
			'	}',
			'	if from == "PENDING" && to == "EXCLUSIVE" {',
			'		return true',
			'	}',
			'	// The one shortcut: a reader that discovers a hot journal must',
			'	// block new readers while it rolls the journal back, without',
			'	// ever having declared write intent via RESERVED.',
			'	if from == "SHARED" && to == "PENDING" {',
			'		return true',
			'	}',
			'	return false',
			'}',
			'',
			'// Admit is the admission matrix. Each want-level checks exactly the',
			'// holders that conflict with it — note what each check does NOT',
			'// include, because the omissions are the concurrency the protocol',
			'// allows (readers under RESERVED, draining readers under PENDING).',
			'func Admit(others LockSet, want string) (bool, string) {',
			'	if want == "SHARED" {',
			'		// Readers conflict only with a committing writer. Reserved',
			'		// is deliberately absent here: an intending writer and new',
			'		// readers coexist — that tolerance is most of SQLite\'s',
			'		// read concurrency in journal mode.',
			'		if others.Pending || others.Exclusive {',
			'			return false, "SQLITE_BUSY: a writer is committing"',
			'		}',
			'		return true, ""',
			'	}',
			'	if want == "RESERVED" {',
			'		// Write intent is singular: any other writer at any stage',
			'		// blocks a new one. This is the check that fires when two',
			'		// transactions both try to write — the everyday SQLITE_BUSY.',
			'		if others.Reserved || others.Pending || others.Exclusive {',
			'			return false, "SQLITE_BUSY: another write transaction is active"',
			'		}',
			'		return true, ""',
			'	}',
			'	if want == "PENDING" {',
			'		// Shared holders do NOT block pending — pending exists',
			'		// precisely to coexist with them while they drain.',
			'		if others.Reserved || others.Pending || others.Exclusive {',
			'			return false, "SQLITE_BUSY: another writer is ahead"',
			'		}',
			'		return true, ""',
			'	}',
			'	if want == "EXCLUSIVE" {',
			'		// The strictest gate: literally anything held by anyone',
			'		// else — including a single lingering reader — blocks it.',
			'		if others.Shared > 0 || others.Reserved || others.Pending || others.Exclusive {',
			'			return false, "SQLITE_BUSY: readers still hold shared locks"',
			'		}',
			'		return true, ""',
			'	}',
			'	return false, "unknown lock level"',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why whole-file locks at all</h3>' +
			'<p>SQLite’s locks are advisory byte-range locks on the database ' +
			'file (POSIX <code>fcntl</code> locks on three magic byte ranges — ' +
			'the “pending byte” page near the 1&nbsp;GiB boundary exists purely ' +
			'to have bytes to lock). That choice keeps SQLite serverless: any ' +
			'process on the machine can coordinate through the filesystem alone, ' +
			'with no lock manager daemon to install or crash. The cost is ' +
			'granularity — one writer per <em>database</em>, not per table or ' +
			'row — which is the honest reason SQLite is the wrong tool for ' +
			'write-heavy multi-process services and the right one for nearly ' +
			'everything else.</p>' +
			'<h3>Where SQLITE_BUSY really comes from</h3>' +
			'<p>Map your <code>Admit</code> reasons to the incidents they cause: ' +
			'two write transactions → the RESERVED check (instant, no waiting); ' +
			'a reader arriving mid-commit → the SHARED-vs-PENDING check; a ' +
			'commit stuck behind a long <code>SELECT</code> → the EXCLUSIVE ' +
			'check failing until the reader finishes. ' +
			'<code>PRAGMA busy_timeout = 5000</code> converts those instant ' +
			'refusals into bounded retries, and ' +
			'<code>BEGIN IMMEDIATE</code> takes RESERVED up front so a ' +
			'transaction learns about writer conflicts at BEGIN, not at its ' +
			'first UPDATE deep in application logic. One genuine deadlock ' +
			'remains: a connection inside a plain <code>BEGIN</code> that read ' +
			'(SHARED) and now wants to write can deadlock against a PENDING ' +
			'writer — each waits on the other — which SQLite detects and ' +
			'reports as <code>SQLITE_BUSY</code> immediately, ignoring the ' +
			'busy_timeout. That is the case retry loops cannot fix; ' +
			'<code>BEGIN IMMEDIATE</code> prevents it by construction.</p>' +
			'<h3>How WAL rewired the ladder</h3>' +
			'<p>The previous lesson’s WAL mode replaces most of this protocol: ' +
			'readers get snapshots from the log, so PENDING’s reader-drain and ' +
			'the SHARED-vs-writer conflicts largely vanish — writers append ' +
			'while readers read. What survives is write-vs-write: WAL still ' +
			'allows exactly one writer at a time, so the “another write ' +
			'transaction is active” refusal outlives the journal era. When you ' +
			'see <code>database is locked</code> on a WAL database, it is ' +
			'almost always that check — or the EXCLUSIVE lock a checkpoint ' +
			'needs to reset the log while a long reader pins it.</p>',
		],
		complexity: { time: 'O(1) — a fixed admission matrix', space: 'O(1)' },
	});
})();
