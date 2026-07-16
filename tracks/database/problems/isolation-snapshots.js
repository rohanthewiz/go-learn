/* Isolation: Snapshots — Transactions (Hard). Snapshot isolation observed
 * live with two sessions on one engine: the learner scripts a writer that
 * BEGINs and updates a row, then proves (by reading through a second
 * session) that the writer sees its own uncommitted write, that the reader
 * sees the OLD value without blocking, and that COMMIT flips visibility.
 * Harness-driven cases pin the stronger guarantee: a block opened BEFORE
 * the commit keeps its frozen snapshot even after it (probed live: bytdb
 * read blocks are repeatable-read on a snapshot, and BEGIN READ ONLY
 * refuses writes with "cannot execute UPDATE in a read-only transaction").
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// Two session timelines. The reader's snapshot freezes at its BEGIN
	// (dotted line): the writer's UPDATE and even its COMMIT land to the
	// right of it, so every read inside the block returns 100. Marker id
	// namespaced (dgArrowDBIS) because every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 600 262" width="600" height="262" role="img" aria-label="two session timelines: the writer begins, updates and commits; the reader begins read only earlier and every read inside its block returns the old value 100, even after the commit">' +
		'<text x="20" y="18" class="lbl">two sessions, one row — time flows right; the reader&#8217;s snapshot freezes at its BEGIN</text>' +
		// writer lane
		'<text x="20" y="64" class="lbl">writer</text>' +
		'<path d="M 70 60 L 580 60" stroke="var(--edge)" stroke-width="1"/>' +
		'<rect x="150" y="44" width="60" height="32" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="180" y="64" text-anchor="middle" class="lbl">BEGIN</text>' +
		'<path d="M 214 60 L 226 60" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBIS)"/>' +
		'<rect x="230" y="44" width="118" height="32" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="289" y="64" text-anchor="middle" class="lbl">UPDATE bal=250</text>' +
		'<path d="M 352 60 L 376 60" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBIS)"/>' +
		'<rect x="380" y="44" width="70" height="32" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="415" y="64" text-anchor="middle" class="lbl" style="fill:var(--ok)">COMMIT</text>' +
		// the visibility boundary the commit creates
		'<path d="M 455 82 L 455 206" stroke="var(--ok)" stroke-width="1.2" stroke-dasharray="4 4"/>' +
		'<text x="462" y="96" class="lbl" style="fill:var(--ok)">new snapshots taken after</text>' +
		'<text x="462" y="109" class="lbl" style="fill:var(--ok)">this line see 250</text>' +
		// the frozen snapshot line
		'<path d="M 136 154 L 136 128" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="3 3"/>' +
		'<path d="M 136 128 L 566 128" stroke="var(--accent)" stroke-width="1.2" stroke-dasharray="3 3"/>' +
		'<text x="144" y="124" class="lbl" style="fill:var(--accent)">snapshot: the committed state as of the reader&#8217;s BEGIN — every read in the block sees exactly this</text>' +
		// reader lane
		'<text x="20" y="174" class="lbl">reader</text>' +
		'<path d="M 70 170 L 580 170" stroke="var(--edge)" stroke-width="1"/>' +
		'<rect x="76" y="154" width="120" height="32" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="136" y="174" text-anchor="middle" class="lbl">BEGIN READ ONLY</text>' +
		'<path d="M 200 170 L 246 170" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBIS)"/>' +
		'<rect x="250" y="154" width="92" height="32" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="296" y="174" text-anchor="middle" class="lbl">SELECT &#8594; 100</text>' +
		'<path d="M 346 170 L 456 170" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBIS)"/>' +
		'<rect x="460" y="154" width="92" height="32" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="506" y="174" text-anchor="middle" class="lbl">SELECT &#8594; 100</text>' +
		'<text x="296" y="204" text-anchor="middle" class="lbl">not blocked: the writer&#8217;s lock</text>' +
		'<text x="296" y="217" text-anchor="middle" class="lbl">stops writers, not readers</text>' +
		'<text x="506" y="204" text-anchor="middle" class="lbl">still 100 — the commit happened,</text>' +
		'<text x="506" y="217" text-anchor="middle" class="lbl">but this snapshot predates it</text>' +
		'<text x="20" y="244" class="lbl">MVCC keeps the old version alive for open snapshots; only after the reader&#8217;s own COMMIT ends the block does a fresh read see 250</text>' +
		'<defs><marker id="dgArrowDBIS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'isolation-snapshots',
		title: 'Snapshot Isolation: Readers Never Wait',
		nav: 'Snapshot isolation',
		difficulty: 'Hard',
		category: 'Transactions',
		task: 'Implement ObserveIsolation: a writer session BEGINs and sets bal to 250; return what the writer sees mid-block, what a second session sees mid-block, and what it sees after COMMIT.',

		prose: [
			'<h2>Snapshot Isolation: Readers Never Wait</h2>' +
			'<p>The nightly settlement batch holds a transaction open for two ' +
			'minutes while it rewrites thousands of balances. All the while, the ' +
			'ops dashboard refreshes every five seconds, running full-table ' +
			'aggregates over the <em>same rows</em>. Nobody times out, nobody ' +
			'deadlocks, and the dashboard never shows a half-settled ledger — ' +
			'it shows the consistent state from before the batch, then flips to ' +
			'the consistent state after. If locks were the whole story, those ' +
			'dashboards would hang for two minutes. They don&#8217;t, because of ' +
			'<strong>MVCC</strong> — multi-version concurrency control:</p>' +
			'<ul>' +
			'<li><strong>Updates don&#8217;t overwrite; they add versions.</strong> ' +
			'The old row version stays alive as long as some snapshot might need ' +
			'it. A read never has to wait for a writer, because the value it ' +
			'needs — the last <em>committed</em> one — still exists.</li>' +
			'<li><strong>Every read runs against a snapshot.</strong> A ' +
			'statement outside any block gets a fresh snapshot of the latest ' +
			'committed state. A block opened with <code>BEGIN</code> (or ' +
			'<code>BEGIN READ ONLY</code>) freezes ONE snapshot at its start and ' +
			'uses it for every read until COMMIT/ROLLBACK — reads are ' +
			'<em>repeatable</em> inside the block, even while other sessions ' +
			'commit around it.</li>' +
			'<li><strong>Your own writes are the exception.</strong> Inside its ' +
			'block, a writer reads what it has written, committed or not — ' +
			'without read-your-own-writes, no debit-then-check logic could ' +
			'work.</li>' +
			'<li><strong>In bytdb, sessions are the unit of visibility.</strong> ' +
			'<code>s := db.NewSession()</code> per participant. One writable ' +
			'block holds the single-writer lock; other sessions keep reading on ' +
			'snapshots without blocking. <code>BEGIN READ ONLY</code> opens a ' +
			'snapshot-only block that refuses writes and never takes the writer ' +
			'lock.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Prove the visibility rules by observing them. The harness seeds ' +
			'<code>accounts</code> with row <code>id=1, bal=100</code>. ' +
			'<code>ObserveIsolation(db)</code> must run this script and return ' +
			'the three observations:</p>' +
			'<ul>' +
			'<li>Open a <em>writer</em> session; <code>BEGIN</code>; ' +
			'<code>UPDATE accounts SET bal = 250 WHERE id = 1</code>.</li>' +
			'<li><code>writerSees</code>: <code>bal</code> read through the ' +
			'writer — its own uncommitted write.</li>' +
			'<li><code>readerMid</code>: <code>bal</code> read through a ' +
			'<em>second</em> session while the writer&#8217;s block is still ' +
			'open. No BEGIN needed — a bare session read takes its own ' +
			'snapshot. It will not block.</li>' +
			'<li><code>COMMIT</code> on the writer, then <code>readerAfter</code>: ' +
			'the same read through the reader again.</li>' +
			'</ul>' +
			'<div class="tip">Rows come back as <code>res.Rows [][]any</code> ' +
			'with INT columns as <code>int64</code> — convert with ' +
			'<code>int(v.(int64))</code>. And commit before returning: the ' +
			'harness&#8217;s later cases need the writer lock free.</div>',
		],

		starter: [
			'package main',
			'',
			'import (',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// ObserveIsolation stages the classic two-session visibility experiment',
			'// against the accounts table (the harness seeds id=1 with bal=100):',
			'//',
			'//   1. writer := db.NewSession(); writer BEGINs and runs',
			'//      UPDATE accounts SET bal = 250 WHERE id = 1.',
			'//   2. writerSees  = bal read through the WRITER — inside its own open',
			'//      block it must see the uncommitted 250 (read-your-own-writes).',
			'//   3. readerMid   = bal read through a SECOND session while the block',
			'//      is still open. The read is not blocked; it runs on a snapshot',
			'//      of the last COMMITTED state. No BEGIN needed for a bare read.',
			'//   4. writer COMMITs, then readerAfter = bal through the reader again.',
			'//',
			'// Return the three observed balances in that order. INT columns come',
			'// back as int64 in res.Rows — convert with int(v.(int64)).',
			'func ObserveIsolation(db *sql.DB) (writerSees, readerMid, readerAfter int) {',
			'	// your code here',
			'	return 0, 0, 0',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"os"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			T.HARNESS_RT,
			'',
			T.DB_RT,
			'',
			'// hRead reads one balance through a SPECIFIC session — which session',
			'// does the reading is the whole experiment, so the harness\'s own',
			'// observations go through sessions exactly like the learner\'s.',
			'func hRead(s *sql.Session, id int) int64 {',
			'	res, err := s.Exec(`SELECT bal FROM accounts WHERE id = $1`, id)',
			'	if err != nil {',
			'		panic(fmt.Sprintf("harness read id=%d: %v", id, err))',
			'	}',
			'	return res.Rows[0][0].(int64)',
			'}',
			'',
			'// hMust runs harness-owned session SQL. A failure here is either an',
			'// item bug or a transaction the learner left open (the single-writer',
			'// lock would then refuse our BEGIN) — panic and let runCase record it.',
			'func hMust(s *sql.Session, q string) {',
			'	if _, err := s.Exec(q); err != nil {',
			'		panic(fmt.Sprintf("harness session SQL %q: %v", q, err))',
			'	}',
			'}',
			'',
			'// hContains is a tiny substring check (keeps the strings package out',
			'// of the merged import contract).',
			'func hContains(s, sub string) bool {',
			'	for i := 0; i+len(sub) <= len(s); i++ {',
			'		if s[i:i+len(sub)] == sub {',
			'			return true',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
			'func main() {',
			'	db, cleanup := openDB("isolation-snapshots")',
			'	defer cleanup()',
			'	// Seed OUTSIDE any block: DDL cannot run inside BEGIN.',
			'	mustExec(db, `CREATE TABLE accounts (id INT PRIMARY KEY, bal INT)`)',
			'	mustExec(db, `INSERT INTO accounts VALUES (1, 100)`)',
			'',
			'	results := make([]map[string]any, 0, 8)',
			'',
			'	// --- the learner\'s script runs ONCE; the observations are then',
			'	// --- judged case by case (rerunning would re-update an already',
			'	// --- updated row and destroy the old-value observation).',
			'	var wSees, rMid, rAfter int',
			'	r1 := map[string]any{"input": "ObserveIsolation(db) completes its script", "want": "completed"}',
			'	runCase(r1, func() {',
			'		wSees, rMid, rAfter = ObserveIsolation(db)',
			'		r1["pass"] = true',
			'		r1["got"] = "completed"',
			'	})',
			'	results = append(results, r1)',
			'',
			'	numCase := func(name string, want, got int) {',
			'		pass := got == want',
			'		results = append(results, map[string]any{',
			'			"input": name,',
			'			"want":  fmt.Sprintf("%d", want),',
			'			"got":   fmt.Sprintf("%d", got),',
			'			"pass":  pass,',
			'		})',
			'	}',
			'	numCase("writerSees: inside its open block the writer reads its own uncommitted 250", 250, wSees)',
			'	numCase("readerMid: the second session reads the last COMMITTED value, without blocking", 100, rMid)',
			'	numCase("readerAfter: once COMMIT publishes, a fresh snapshot sees 250", 250, rAfter)',
			'',
			'	// The script must actually COMMIT — an abandoned block would leave',
			'	// bal=100 committed and the writer lock held.',
			'	r5 := map[string]any{"input": "the UPDATE was committed: a fresh autocommit read of bal", "want": "250"}',
			'	runCase(r5, func() {',
			'		res := mustExec(db, `SELECT bal FROM accounts WHERE id = 1`)',
			'		got := fmt.Sprintf("%v", res.Rows[0][0])',
			'		r5["got"] = got',
			'		r5["pass"] = got == "250"',
			'	})',
			'	results = append(results, r5)',
			'',
			'	// --- harness-driven observations: the STRONGER guarantee. A block',
			'	// --- opened BEFORE a commit keeps its frozen snapshot even after',
			'	// --- it (verified engine behavior — this is snapshot isolation,',
			'	// --- not read committed).',
			'	mustExec(db, `INSERT INTO accounts VALUES (2, 1000)`)',
			'	rdr := db.NewSession()',
			'	wtr := db.NewSession()',
			'',
			'	r6 := map[string]any{"input": "a reader block opened BEFORE the commit keeps its snapshot across it (read, commit elsewhere, read)", "want": "1000 then 1000"}',
			'	runCase(r6, func() {',
			'		hMust(rdr, `BEGIN READ ONLY`) // the snapshot freezes HERE',
			'		before := hRead(rdr, 2)',
			'		hMust(wtr, `BEGIN`)',
			'		hMust(wtr, `UPDATE accounts SET bal = 1400 WHERE id = 2`)',
			'		hMust(wtr, `COMMIT`)',
			'		after := hRead(rdr, 2) // committed elsewhere — this snapshot predates it',
			'		got := fmt.Sprintf("%d then %d", before, after)',
			'		r6["got"] = got',
			'		r6["pass"] = got == "1000 then 1000"',
			'	})',
			'	results = append(results, r6)',
			'',
			'	r7 := map[string]any{"input": "the snapshot ends with the block: after the reader\'s own COMMIT it sees 1400", "want": "1400"}',
			'	runCase(r7, func() {',
			'		hMust(rdr, `COMMIT`) // closes the read block, releases the snapshot',
			'		got := fmt.Sprintf("%d", hRead(rdr, 2))',
			'		r7["got"] = got',
			'		r7["pass"] = got == "1400"',
			'	})',
			'	results = append(results, r7)',
			'',
			'	r8 := map[string]any{"input": "BEGIN READ ONLY refuses writes outright", "want": "error containing \\"read-only transaction\\""}',
			'	runCase(r8, func() {',
			'		hMust(rdr, `BEGIN READ ONLY`)',
			'		_, err := rdr.Exec(`UPDATE accounts SET bal = 0 WHERE id = 2`)',
			'		defer hMust(rdr, `ROLLBACK`)',
			'		if err == nil {',
			'			r8["got"] = "the UPDATE succeeded"',
			'			r8["pass"] = false',
			'			return',
			'		}',
			'		r8["got"] = err.Error()',
			'		r8["pass"] = hContains(err.Error(), "read-only transaction")',
			'	})',
			'	results = append(results, r8)',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'import (',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// ObserveIsolation stages the two-session visibility experiment. The',
			'// design point worth internalizing: SESSIONS are the unit of',
			'// visibility. Each session sees (a) its own writes, committed or not,',
			'// and (b) a snapshot of everyone else\'s COMMITTED state — never a',
			'// stranger\'s in-progress work, and never a wait for one.',
			'func ObserveIsolation(db *sql.DB) (writerSees, readerMid, readerAfter int) {',
			'	writer := db.NewSession()',
			'	reader := db.NewSession()',
			'',
			'	// The writer opens the only kind of block that takes the (single)',
			'	// writer lock; the update creates a NEW row version — the old',
			'	// bal=100 version stays alive for concurrent snapshots.',
			'	mustSess(writer, `BEGIN`)',
			'	mustSess(writer, `UPDATE accounts SET bal = 250 WHERE id = 1`)',
			'',
			'	// Read-your-own-writes: inside the block the writer must see its',
			'	// uncommitted 250 — debit-then-check style logic depends on it.',
			'	writerSees = balVia(writer)',
			'',
			'	// The reader takes a snapshot of the last committed state and reads',
			'	// 100 from the OLD version. It does not block on the writer\'s lock',
			'	// (that lock excludes writers) and it cannot see the dirty 250.',
			'	readerMid = balVia(reader)',
			'',
			'	// COMMIT publishes the new version; every snapshot taken from now',
			'	// on includes it. (Committing also releases the writer lock — the',
			'	// harness\'s own transactions need it after we return.)',
			'	mustSess(writer, `COMMIT`)',
			'	readerAfter = balVia(reader)',
			'',
			'	return writerSees, readerMid, readerAfter',
			'}',
			'',
			'// mustSess runs a statement whose failure would invalidate the whole',
			'// experiment — panic rather than return misleading observations.',
			'func mustSess(s *sql.Session, q string) {',
			'	if _, err := s.Exec(q); err != nil {',
			'		panic(err)',
			'	}',
			'}',
			'',
			'// balVia reads account 1\'s balance through a specific session — WHICH',
			'// session does the reading is the entire experiment. A bare session',
			'// read (no open block) takes its own fresh snapshot per statement.',
			'func balVia(s *sql.Session) int {',
			'	res, err := s.Exec(`SELECT bal FROM accounts WHERE id = 1`)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	return int(res.Rows[0][0].(int64))',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The isolation-level ladder</h3>' +
			'<p>What you observed has a name on the standard ladder of isolation ' +
			'levels, each defined by which anomalies it permits:</p>' +
			'<ul>' +
			'<li><strong>Read committed</strong> (Postgres&#8217;s default): every ' +
			'<em>statement</em> gets a fresh snapshot. You never see uncommitted ' +
			'data, but two reads inside one transaction can disagree ' +
			'(non-repeatable reads) because a commit landed between them.</li>' +
			'<li><strong>Snapshot isolation / repeatable read</strong>: the whole ' +
			'<em>transaction</em> runs on one snapshot frozen at its start — the ' +
			'behavior the harness pinned with <code>1000 then 1000</code>. ' +
			'Postgres&#8217;s <code>REPEATABLE READ</code> is true snapshot ' +
			'isolation; so are Oracle&#8217;s and CockroachDB&#8217;s historical ' +
			'defaults.</li>' +
			'<li><strong>Serializable</strong>: transactions behave as if run one ' +
			'at a time. Postgres implements it as SSI — snapshot isolation plus ' +
			'detection of dangerous read/write patterns, aborting one transaction ' +
			'with a serialization error you are expected to retry.</li>' +
			'</ul>' +
			'<h3>Readers don&#8217;t block writers — the MVCC payoff</h3>' +
			'<p>Before MVCC, engines enforced isolation with two-phase locking: ' +
			'readers took shared locks, writers took exclusive ones, and a ' +
			'long-running report could stall every write on the table (or worse, ' +
			'writers stalled the report). MVCC dissolves the conflict by keeping ' +
			'multiple versions: writers create new versions, readers use the ' +
			'version their snapshot dictates, and the two never queue behind each ' +
			'other. That is why the settlement batch and the dashboard coexist. ' +
			'The price is garbage: dead versions accumulate until no snapshot can ' +
			'need them — Postgres&#8217;s <code>VACUUM</code>, InnoDB&#8217;s purge ' +
			'of undo logs. The classic production incident is a forgotten ' +
			'<code>idle in transaction</code> connection holding an ancient ' +
			'snapshot open for days, blocking cleanup until the table bloats and ' +
			'the disk fills.</p>' +
			'<h3>Where snapshot isolation still lies to you: write skew</h3>' +
			'<p>Snapshot isolation prevents dirty, non-repeatable, and phantom ' +
			'reads — yet it is not serializable. The textbook failure is ' +
			'<strong>write skew</strong>: a hospital requires at least one doctor ' +
			'on call; Alice and Bob each open a transaction, each reads ' +
			'<em>on-call count = 2</em> from their own snapshot, each concludes ' +
			'&#8220;safe for me to leave&#8221;, and each updates <em>their own</em> ' +
			'row. Neither wrote what the other read, so no conflict is detected; ' +
			'both commit; the invariant is dead. The transfers in this track ' +
			'dodge write skew because debit and credit touch the same rows any ' +
			'competing transfer would write — but check-a-sum-then-write-a-' +
			'different-row logic needs <code>SERIALIZABLE</code> (or explicit ' +
			'locking like <code>SELECT ... FOR UPDATE</code>) in any ' +
			'snapshot-isolated engine.</p>' +
			'<h3>bytdb&#8217;s simplification</h3>' +
			'<p>bytdb allows ONE writable block at a time — a single-writer lock, ' +
			'SQLite&#8217;s model — so writer-writer conflicts are impossible by ' +
			'construction and there is no per-row lock manager. Big engines let ' +
			'writers proceed concurrently and resolve row-level conflicts at ' +
			'commit (&#8220;first committer wins&#8221; under snapshot isolation). ' +
			'The reader-side story you proved here is the part all of them ' +
			'share.</p>',
		],
		complexity: { time: 'O(1) — a fixed script of single-row statements', space: 'O(1) — plus the extra row version MVCC keeps alive until the last snapshot needing it closes' },
	});
})();
