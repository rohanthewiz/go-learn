/* Transactions & Savepoints — Transactions (Medium). BEGIN/COMMIT/ROLLBACK
 * as statements through a sql.Session (bytdb refuses them on a bare DB —
 * blocks are per-connection state), then SAVEPOINT / ROLLBACK TO as the
 * partial-undo tool that lets a batch survive one bad row. Probed live:
 * an error inside a block aborts it ("current transaction is aborted..."),
 * COMMIT of a failed block reports Tag ROLLBACK, and ROLLBACK TO clears
 * the failed state — real row states asserted after every step.
 */
(function () {
	'use strict';
	var T = GoLearnBY;

	// A transaction block as a timeline with a rewind mark. Marker ids
	// namespaced dgArrowBY08*.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 216" width="560" height="216" role="img" aria-label="a transaction block timeline: BEGIN, a good insert, SAVEPOINT, a failing insert that aborts the block, ROLLBACK TO the savepoint which discards only the failed span and clears the abort, more work, COMMIT keeps everything outside the discarded span">' +
		'<text x="20" y="22" class="lbl">one block, one bad row — savepoints turn "lose everything" into "lose one"</text>' +
		'<line x1="30" y1="60" x2="540" y2="60" stroke="var(--edge)" stroke-width="2"/>' +
		'<circle cx="45" cy="60" r="4" fill="var(--accent)"/>' +
		'<text x="45" y="44" text-anchor="middle" class="lbl">BEGIN</text>' +
		'<circle cx="125" cy="60" r="4" fill="var(--accent)"/>' +
		'<text x="125" y="44" text-anchor="middle" class="lbl">INSERT cass ✓</text>' +
		'<circle cx="215" cy="60" r="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="215" y="44" text-anchor="middle" class="lbl">SAVEPOINT r</text>' +
		'<circle cx="310" cy="60" r="4" fill="var(--warn)"/>' +
		'<text x="310" y="44" text-anchor="middle" class="lbl" style="fill:var(--warn)">INSERT alice ✗ dup</text>' +
		'<text x="310" y="84" text-anchor="middle" class="lbl" style="fill:var(--warn)">block now FAILED: every</text>' +
		'<text x="310" y="100" text-anchor="middle" class="lbl" style="fill:var(--warn)">statement refused...</text>' +
		'<path d="M 310 112 C 280 140 240 130 220 70" fill="none" stroke="var(--accent)" stroke-width="1.8" marker-end="url(#dgArrowBY08)"/>' +
		'<text x="235" y="140" class="lbl">ROLLBACK TO r: rewind to the mark,</text>' +
		'<text x="235" y="156" class="lbl">clear the failure — cass survives</text>' +
		'<circle cx="430" cy="60" r="4" fill="var(--accent)"/>' +
		'<text x="430" y="44" text-anchor="middle" class="lbl">INSERT dev ✓</text>' +
		'<circle cx="520" cy="60" r="4" fill="var(--accent)"/>' +
		'<text x="520" y="44" text-anchor="middle" class="lbl">COMMIT</text>' +
		'<text x="20" y="188" class="lbl">committed: cass, dev — only the savepoint→error span was discarded</text>' +
		'<text x="20" y="206" class="lbl" style="fill:var(--warn)">without the savepoint: the dup aborts the WHOLE block and COMMIT quietly reports ROLLBACK — zero rows land</text>' +
		'<defs>' +
		'<marker id="dgArrowBY08" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'transactions-savepoints',
		title: 'Transactions & Savepoints',
		nav: 'transactions savepoints',
		difficulty: 'Medium',
		category: 'Transactions',
		task: 'Drive a sql.Session through real transaction blocks: an atomic two-leg transfer that rolls back on failure, and a batch import that survives bad rows with per-row savepoints — final balances and row states are asserted after every path.',

		prose: [
			'<h2>Transactions &amp; savepoints</h2>' +
			'<p>A billing service moves credits between accounts: subtract here, ' +
			'add there. Version one ran the two UPDATEs back to back — then a ' +
			'CHECK constraint bounced the second one and the service <em>printed ' +
			'money</em>: one leg applied, one not. The nightly import has the ' +
			'inverse problem: 500 accounts in one transaction, one duplicate in ' +
			'the file, zero rows imported. The first bug needs a transaction; ' +
			'the second needs a transaction that can <em>partially</em> undo. In ' +
			'bytdb both are driven from Go through a <code>Session</code>:</p>',
			{ lang: 'go', code: 'ses := db.NewSession()   // blocks are per-connection state;\n                         // a bare db.Exec("BEGIN") is refused:\n                         // "transaction control statements require a Session"\nses.Exec("BEGIN")\nses.Exec("UPDATE accounts SET balance = balance - $1 WHERE name = $2", amt, from)\nses.Exec("UPDATE accounts SET balance = balance + $1 WHERE name = $2", amt, to)\nses.Exec("COMMIT")       // both legs, or — after ROLLBACK — neither' },
			'<ul>' +
			'<li><strong>A block is all-or-nothing.</strong> Between BEGIN and ' +
			'COMMIT every statement stages into one engine transaction. ROLLBACK ' +
			'discards the lot. Crash before COMMIT: the WAL replays without it — ' +
			'same as ROLLBACK.</li>' +
			'<li><strong>An error poisons the block.</strong> After any failed ' +
			'statement the session enters the <em>failed</em> state ' +
			'(<code>Status()</code> returns <code>TxFailed</code>) and refuses ' +
			'everything except ROLLBACK — further statements fail with ' +
			'<code>current transaction is aborted, commands ignored until end of ' +
			'transaction block</code>. Even COMMIT won\'t save it: committing a ' +
			'failed block rolls back, and the Result says so ' +
			'(<code>Tag: "ROLLBACK"</code>). This is Postgres\'s rule, kept ' +
			'because it is what makes half-executed statements safe: staged ' +
			'partial writes can only ever be discarded.</li>' +
			'<li><strong>SAVEPOINT is a named rewind mark.</strong> ' +
			'<code>SAVEPOINT r</code> marks the current staged state; ' +
			'<code>ROLLBACK TO r</code> rewinds the transaction to the mark ' +
			'<em>and clears the failed state</em>; <code>RELEASE r</code> ' +
			'forgets the mark, keeping the work. Mark before each risky row and ' +
			'one bad row costs you that row, not the batch.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Two functions driving a live session. <code>Transfer</code>: both ' +
			'legs in one block, ROLLBACK on any failure (the harness bounces a ' +
			'transfer off the <code>balance &gt;= 0</code> CHECK and asserts the ' +
			'balances did not move). <code>ImportAccounts</code>: one block, one ' +
			'savepoint per row, duplicates skipped, survivors committed — and ' +
			'in every path the session must end <em>idle</em>, because the ' +
			'harness keeps using it.</p>' +
			'<div class="tip">The starter\'s <code>Transfer</code> runs its legs ' +
			'in autocommit — credit first, debit second. Watch case 2: the ' +
			'failed transfer leaves the destination account richer. That is the ' +
			'money-printing bug, reproduced live; BEGIN is not decoration.</div>',
		],

		starter: [
			'package main',
			'',
			'import (',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// Harness-owned schema (note the CHECK — overdrafts are refused by',
			'// the engine, not by application code):',
			'//',
			'//   CREATE TABLE accounts (',
			'//     name    TEXT PRIMARY KEY,',
			'//     balance INT NOT NULL CHECK (balance >= 0)',
			'//   )',
			'',
			'// Transfer moves amount from one account to another — BOTH legs or',
			'// NEITHER, and the session must be idle (no open block) on return.',
			'//',
			'// CODE UNDER REVIEW: two autocommit statements, credit first. When',
			'// the debit trips the CHECK, the credit has already committed —',
			'// the failed transfer MINTED money. Wrap both legs in one block:',
			'// BEGIN, debit, credit, COMMIT — and ROLLBACK before returning any',
			'// error.',
			'func Transfer(ses *sql.Session, from, to string, amount int) error {',
			'	if _, err := ses.Exec(',
			'		"UPDATE accounts SET balance = balance + $1 WHERE name = $2",',
			'		amount, to); err != nil {',
			'		return err',
			'	}',
			'	if _, err := ses.Exec(',
			'		"UPDATE accounts SET balance = balance - $1 WHERE name = $2",',
			'		amount, from); err != nil {',
			'		return err',
			'	}',
			'	return nil',
			'}',
			'',
			'// ImportAccounts inserts (names[i], balances[i]) rows in ONE block',
			'// and returns how many landed. Bad rows (e.g. duplicate names) must',
			'// be SKIPPED — the rest of the batch still commits.',
			'//',
			'// CODE UNDER REVIEW: one block, no savepoints. The first duplicate',
			'// aborts the block; every later insert is refused ("current',
			'// transaction is aborted..."), COMMIT quietly rolls back, and the',
			'// count returned is a lie. Mark a SAVEPOINT before each insert,',
			'// ROLLBACK TO it on failure, RELEASE it on success.',
			'func ImportAccounts(ses *sql.Session, names []string, balances []int) (int, error) {',
			'	if _, err := ses.Exec("BEGIN"); err != nil {',
			'		return 0, err',
			'	}',
			'	inserted := 0',
			'	for i := range names {',
			'		_, err := ses.Exec(',
			'			"INSERT INTO accounts (name, balance) VALUES ($1, $2)",',
			'			names[i], balances[i])',
			'		if err == nil {',
			'			inserted++',
			'		}',
			'	}',
			'	if _, err := ses.Exec("COMMIT"); err != nil {',
			'		return 0, err',
			'	}',
			'	return inserted, nil',
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
			'func main() {',
			'	db, cleanup := openDB("by-transactions-savepoints")',
			'	defer cleanup()',
			'',
			'	mustExec(db, `CREATE TABLE accounts (',
			'		name    TEXT PRIMARY KEY,',
			'		balance INT NOT NULL CHECK (balance >= 0)',
			'	)`)',
			'	mustExec(db, `INSERT INTO accounts VALUES (\'alice\', 100), (\'bob\', 50)`)',
			'',
			'	// One session for the whole run, like one connection would be.',
			'	// If learner code leaks an open or failed block, later cases',
			'	// break — which is the point; recover() below keeps the failure',
			'	// diagnosable per case.',
			'	ses := db.NewSession()',
			'	recoverSession := func() {',
			'		if ses.Status() != sql.TxIdle {',
			'			ses.Exec("ROLLBACK")',
			'		}',
			'	}',
			'	balances := func() string {',
			'		return rowsStr(mustExec(db, "SELECT name, balance FROM accounts ORDER BY name"))',
			'	}',
			'',
			'	results := make([]map[string]any, 0, 5)',
			'	newCase := func(name, want string) map[string]any {',
			'		r := map[string]any{"input": name, "want": want}',
			'		results = append(results, r)',
			'		return r',
			'	}',
			'',
			'	// Case 1: the happy transfer — both legs land, session idle.',
			'	r := newCase("Transfer(alice->bob, 30) applies both legs", "ok, idle, [[alice 70] [bob 80]]")',
			'	runCase(r, func() {',
			'		err := Transfer(ses, "alice", "bob", 30)',
			'		status := ses.Status()',
			'		recoverSession()',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "error: " + err.Error()',
			'			return',
			'		}',
			'		got := fmt.Sprintf("ok, %s, %s", map[bool]string{true: "idle", false: "NOT idle"}[status == sql.TxIdle], balances())',
			'		r["pass"] = got == "ok, idle, [[alice 70] [bob 80]]"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 2: the overdraft. The CHECK bounces the debit leg; the',
			'	// transfer must fail as a WHOLE — balances untouched. The',
			'	// autocommit starter leaves bob at 580: money from nowhere.',
			'	r = newCase("Transfer(alice->bob, 500) hits the CHECK: neither leg survives", "error reported, idle, [[alice 70] [bob 80]]")',
			'	runCase(r, func() {',
			'		err := Transfer(ses, "alice", "bob", 500)',
			'		status := ses.Status()',
			'		recoverSession()',
			'		if err == nil {',
			'			r["pass"] = false',
			'			r["got"] = "no error — the overdraft went through?! " + balances()',
			'			return',
			'		}',
			'		got := fmt.Sprintf("error reported, %s, %s", map[bool]string{true: "idle", false: "NOT idle"}[status == sql.TxIdle], balances())',
			'		r["pass"] = got == "error reported, idle, [[alice 70] [bob 80]]"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 3: batch with one duplicate (alice). Savepoints must save',
			'	// cass and dev; the no-savepoint starter loses the whole batch',
			'	// (its COMMIT of the aborted block reports Tag ROLLBACK).',
			'	r = newCase("ImportAccounts([cass alice dev]) skips the dup, keeps the rest", "inserted 2, [[alice 70] [bob 80] [cass 10] [dev 20]]")',
			'	runCase(r, func() {',
			'		n, err := ImportAccounts(ses, []string{"cass", "alice", "dev"}, []int{10, 99, 20})',
			'		recoverSession()',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "error: " + err.Error()',
			'			return',
			'		}',
			'		got := fmt.Sprintf("inserted %d, %s", n, balances())',
			'		r["pass"] = got == "inserted 2, [[alice 70] [bob 80] [cass 10] [dev 20]]"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 4: replaying the same batch — every row now a duplicate.',
			'	// All three savepoint-rollbacks fire; zero inserted, no error,',
			'	// nothing changed, session idle.',
			'	r = newCase("replaying the batch: all dups skipped, still consistent", "inserted 0, idle, [[alice 70] [bob 80] [cass 10] [dev 20]]")',
			'	runCase(r, func() {',
			'		n, err := ImportAccounts(ses, []string{"cass", "alice", "dev"}, []int{10, 99, 20})',
			'		status := ses.Status()',
			'		recoverSession()',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "error: " + err.Error()',
			'			return',
			'		}',
			'		got := fmt.Sprintf("inserted %d, %s, %s", n, map[bool]string{true: "idle", false: "NOT idle"}[status == sql.TxIdle], balances())',
			'		r["pass"] = got == "inserted 0, idle, [[alice 70] [bob 80] [cass 10] [dev 20]]"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 5: the session is still a working connection — a further',
			'	// transfer to an imported account goes through cleanly.',
			'	r = newCase("session still healthy: Transfer(bob->cass, 25)", "ok, [[alice 70] [bob 55] [cass 35] [dev 20]]")',
			'	runCase(r, func() {',
			'		err := Transfer(ses, "bob", "cass", 25)',
			'		recoverSession()',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "error: " + err.Error()',
			'			return',
			'		}',
			'		got := "ok, " + balances()',
			'		r["pass"] = got == "ok, [[alice 70] [bob 55] [cass 35] [dev 20]]"',
			'		r["got"] = got',
			'	})',
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
			'// Transfer: one block, both legs, one decision at the end. Debit',
			'// first — it is the leg that can fail (the CHECK), and failing',
			'// before any credit means the rollback has less to undo; but the',
			'// ORDER is defense in depth, not the guarantee. The guarantee is',
			'// the block: any error → ROLLBACK → the engine discards every',
			'// staged write, whichever leg it was.',
			'//',
			'// The rollback-on-error runs even when the failed statement already',
			'// aborted the block: ROLLBACK is the one statement a failed session',
			'// accepts, and issuing it returns the session to idle — the caller',
			'// keeps a usable connection either way.',
			'func Transfer(ses *sql.Session, from, to string, amount int) error {',
			'	if _, err := ses.Exec("BEGIN"); err != nil {',
			'		return err',
			'	}',
			'	_, err := ses.Exec(',
			'		"UPDATE accounts SET balance = balance - $1 WHERE name = $2",',
			'		amount, from)',
			'	if err == nil {',
			'		_, err = ses.Exec(',
			'			"UPDATE accounts SET balance = balance + $1 WHERE name = $2",',
			'			amount, to)',
			'	}',
			'	if err != nil {',
			'		ses.Exec("ROLLBACK") // best effort; the error we report is the cause',
			'		return err',
			'	}',
			'	_, err = ses.Exec("COMMIT")',
			'	return err',
			'}',
			'',
			'// ImportAccounts: the savepoint-per-row pattern. Each row is',
			'// bracketed by its own mark; a failure rewinds to the mark —',
			'// discarding only that row\'s staged write AND clearing the failed',
			'// state — so the loop continues. Success releases the mark (frees',
			'// its bookkeeping; keeping marks would also work but grows the',
			'// stack per row). One COMMIT at the end lands the survivors',
			'// atomically: readers never see a half-imported batch.',
			'func ImportAccounts(ses *sql.Session, names []string, balances []int) (int, error) {',
			'	if _, err := ses.Exec("BEGIN"); err != nil {',
			'		return 0, err',
			'	}',
			'	inserted := 0',
			'	for i := range names {',
			'		if _, err := ses.Exec("SAVEPOINT row_mark"); err != nil {',
			'			ses.Exec("ROLLBACK")',
			'			return 0, err',
			'		}',
			'		_, err := ses.Exec(',
			'			"INSERT INTO accounts (name, balance) VALUES ($1, $2)",',
			'			names[i], balances[i])',
			'		if err != nil {',
			'			// The bad row: rewind to the mark. Reusing one savepoint',
			'			// name is fine — references resolve to the most recent,',
			'			// as in Postgres.',
			'			if _, rbErr := ses.Exec("ROLLBACK TO row_mark"); rbErr != nil {',
			'				ses.Exec("ROLLBACK")',
			'				return 0, rbErr',
			'			}',
			'			continue',
			'		}',
			'		if _, err := ses.Exec("RELEASE row_mark"); err != nil {',
			'			ses.Exec("ROLLBACK")',
			'			return 0, err',
			'		}',
			'		inserted++',
			'	}',
			'	if _, err := ses.Exec("COMMIT"); err != nil {',
			'		return 0, err',
			'	}',
			'	return inserted, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why blocks require a Session</h3>' +
			'<p>bytdb refuses <code>db.Exec("BEGIN")</code> outright — ' +
			'<code>transaction control statements require a Session</code> — and ' +
			'the refusal teaches the architecture. A bare <code>DB</code> is ' +
			'stateless per statement: each Exec opens, runs, and commits its own ' +
			'engine transaction (autocommit), so it can be shared freely. A ' +
			'<em>block</em> is inherently stateful — “the transaction currently ' +
			'open on this connection” — so it lives on the object that models a ' +
			'connection. <code>NewSession()</code> is cheap: the DB copied, plus ' +
			'transaction state and its own <code>lastval()</code> bookkeeping. ' +
			'While a default-mode block is open it holds the engine\'s single ' +
			'writer slot from BEGIN to COMMIT/ROLLBACK — other sessions\' writes ' +
			'queue behind it (readers proceed on snapshots) — so the discipline ' +
			'the harness enforced, always returning the session to idle, is also ' +
			'a throughput rule: never hold a block across a network call or a ' +
			'user think-time.</p>' +
			'<h3>What a savepoint really is</h3>' +
			'<p>Inside the engine a transaction stages its writes in order; a ' +
			'savepoint is a high-water mark in that staging, and ' +
			'<code>ROLLBACK TO</code> truncates the staged writes back to the ' +
			'mark. That is why it composes with the abort rule so cleanly: the ' +
			'failed statement\'s partial writes are, by construction, ' +
			'<em>after</em> the last mark (a failed block refuses new ' +
			'SAVEPOINTs), so rewinding always discards them — which is exactly ' +
			'what licenses clearing the failed state. Marks stack; names may ' +
			'repeat with most-recent-wins resolution; RELEASE pops without ' +
			'undoing. The per-row cost is small and the alternative — one bad ' +
			'row torching a 500-row import, or splitting the import into 500 ' +
			'autocommit statements and losing batch atomicity — is the pair of ' +
			'failure modes this item made you feel.</p>' +
			'<h3>The abort rule is a feature</h3>' +
			'<p>“Why won\'t it just let me keep going?” Because the failed ' +
			'statement may have half-executed: a multi-row INSERT that died on ' +
			'row 3 has rows 1–2 staged. If the session kept accepting ' +
			'statements, a later COMMIT would publish that fragment. The failed ' +
			'state makes the only reachable outcomes <em>rollback</em> (explicit, ' +
			'or the COMMIT-that-reports-<code>ROLLBACK</code> you saw in the ' +
			'probe of case 3\'s starter) or <em>rewind past the damage</em> — ' +
			'never “commit whatever happened to stick”. Postgres, and bytdb ' +
			'after it, chose the strict rule precisely so that error handling ' +
			'can be structural (savepoints) instead of prayerful (retry and ' +
			'hope). When you meet a driver fighting this rule with automatic ' +
			'per-statement savepoints, you now know both what it is doing and ' +
			'what it costs.</p>',
		],
		complexity: { time: 'O(rows staged) per block — each statement stages writes; COMMIT publishes them, ROLLBACK TO truncates back to a mark', space: 'O(staged writes + savepoint marks) held until COMMIT/ROLLBACK' },
	});
})();
