/* Transactions: Atomicity — Transactions (lesson). The money-transfer
 * classic, run live: a transfer written as two autocommitted UPDATEs with a
 * failure between them really does vaporize money (the starter prints the
 * corrupted state), and wrapping the same statements in one BEGIN/COMMIT
 * block with ROLLBACK on the refusal path really does conserve the invariant
 * sum. Lessons run the whole program visibly — the learner sees the engine
 * open, the seed, both transfers, and the balances after each.
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// Flagship diagram: the transfer timeline. BEGIN → debit → credit →
	// COMMIT as ONE unit (the dashed capsule), with the failure branch
	// dropping to ROLLBACK, which lands the state back where BEGIN found it.
	// Marker ids namespaced (dgArrowDBTX*) because every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 250" width="560" height="250" role="img" aria-label="transfer timeline: BEGIN, debit, credit, COMMIT as one atomic unit; a failure between debit and credit branches to ROLLBACK, restoring the pre-BEGIN state">' +
		'<text x="20" y="20" class="lbl">the transfer as ONE unit — everything between BEGIN and COMMIT lands together, or not at all</text>' +
		// the atomic capsule
		'<rect x="18" y="34" width="524" height="60" rx="10" fill="none" stroke="var(--edge)" stroke-width="1.2" stroke-dasharray="6 5"/>' +
		// BEGIN
		'<rect x="30" y="44" width="70" height="40" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="65" y="69" text-anchor="middle">BEGIN</text>' +
		'<path d="M 104 64 L 124 64" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBTX)"/>' +
		// debit
		'<rect x="128" y="44" width="122" height="40" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="189" y="69" text-anchor="middle" class="lbl">debit alice −400</text>' +
		'<path d="M 254 64 L 274 64" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBTX)"/>' +
		// credit
		'<rect x="278" y="44" width="122" height="40" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="339" y="69" text-anchor="middle" class="lbl">credit bob +400</text>' +
		'<path d="M 404 64 L 424 64" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBTX)"/>' +
		// COMMIT
		'<rect x="428" y="44" width="86" height="40" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="471" y="69" text-anchor="middle" style="fill:var(--ok)">COMMIT</text>' +
		'<text x="280" y="110" text-anchor="middle" class="lbl">tentative inside the block — no other session ever sees the debit without the credit</text>' +
		// the failure branch: out of the gap between debit and credit
		'<path d="M 264 84 C 264 118 220 128 208 146" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowDBTXerr)"/>' +
		'<text x="288" y="132" class="lbl" style="fill:var(--err-fg)">crash / insufficient funds</text>' +
		// ROLLBACK
		'<rect x="140" y="150" width="110" height="38" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="195" y="174" text-anchor="middle" style="fill:var(--err-fg)">ROLLBACK</text>' +
		'<path d="M 254 169 L 306 169" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDBTXok)"/>' +
		// restored state
		'<rect x="310" y="150" width="204" height="38" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="412" y="169" text-anchor="middle" class="lbl" style="fill:var(--ok)">state as of BEGIN restored</text>' +
		'<text x="412" y="182" text-anchor="middle" class="lbl">the debit never happened</text>' +
		'<text x="20" y="216" class="lbl">without the block, each UPDATE autocommits alone — a failure between them strands the debit forever</text>' +
		'<text x="20" y="234" class="lbl">bare db.Exec refuses BEGIN: transactions live on a session (db.NewSession)</text>' +
		'<defs>' +
		'<marker id="dgArrowDBTX" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowDBTXerr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'<marker id="dgArrowDBTXok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'transactions-atomicity',
		title: 'Transactions: All or Nothing',
		nav: 'Atomicity',
		category: 'Transactions',

		prose: [
			'<h2>Transactions: All or Nothing</h2>' +
			'<p>Finance files a ticket: the nightly reconciliation job says the ' +
			'ledger is short by exactly 400. Nothing crashed, no errors in the ' +
			'logs — just one line: <code>transfer refused: insufficient ' +
			'funds</code>. The transfer code is two UPDATEs: debit one account, ' +
			'credit the other. Between them sits a balance check that returned ' +
			'early. Each UPDATE ran as its own statement, so the debit was ' +
			'already <em>committed</em> when the check bailed out — the refusal ' +
			'refunded nothing. The money is not in either account. It is nowhere.</p>' +
			'<ul>' +
			'<li><strong>Autocommit is the default.</strong> A bare ' +
			'<code>db.Exec</code> wraps every statement in its own tiny ' +
			'transaction: run, commit, done. Two UPDATEs are two independent ' +
			'facts, and the database happily keeps the first without the ' +
			'second.</li>' +
			'<li><strong>A transaction makes them one fact.</strong> ' +
			'<code>BEGIN</code> opens a unit of work; every statement inside is ' +
			'tentative. <code>COMMIT</code> publishes all of it at once; ' +
			'<code>ROLLBACK</code> discards all of it — the state as of ' +
			'<code>BEGIN</code> comes back, as if nothing ran. That is the A in ' +
			'ACID: <em>atomicity</em>.</li>' +
			'<li><strong>In bytdb, transactions live on a session.</strong> ' +
			'<code>s := db.NewSession()</code>, then <code>s.Exec("BEGIN")</code> ' +
			'&hellip; <code>s.Exec("COMMIT")</code>. A bare <code>db.Exec</code> ' +
			'refuses <code>BEGIN</code> outright — autocommit and explicit ' +
			'blocks are different modes, and the session is what holds the open ' +
			'block between calls. (One more rule: DDL like <code>CREATE ' +
			'TABLE</code> cannot run inside a block — seed first, transact ' +
			'after.)</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>The program on the right is the buggy transfer, live: it seeds ' +
			'<code>alice=500 bob=100</code>, runs a good transfer (200), then a ' +
			'refused one (400) — and prints <code>total=200</code> at the end. ' +
			'400 vanished. Fix <code>transfer</code> by wrapping its statements ' +
			'in one transaction on a session: <code>BEGIN</code> before the ' +
			'debit, <code>ROLLBACK</code> on the insufficient-funds path, ' +
			'<code>COMMIT</code> after the credit. Keep the debit-then-check ' +
			'ordering — once ROLLBACK is the undo, checking <em>after</em> the ' +
			'debit is correct (and race-free in a way check-then-debit never ' +
			'was). Done right, both final states read ' +
			'<code>alice=300 bob=300 total=600</code>.</p>',
			'<h3>Why engineers get paged over this</h3>' +
			'<p>This exact bug ships constantly, because the broken version ' +
			'passes every happy-path test — it only corrupts data when a ' +
			'<em>failure</em> lands between the writes. The failure does not ' +
			'have to be a balance check: a process crash, a deploy, a network ' +
			'blip between statements 1 and 2 all strand the half-done state. ' +
			'Postgres, MySQL, and SQLite behave exactly like this lesson: every ' +
			'driver defaults to autocommit, and every ORM that lazily flushes ' +
			'writes outside an explicit transaction is quietly running the ' +
			'starter code. The discipline is mechanical: <em>one business ' +
			'action = one transaction</em>, opened as late as possible, ' +
			'committed as early as possible.</p>' +
			'<div class="tip">Atomicity also buys you the cheapest error ' +
			'handling in software: on <em>any</em> failure inside the block — ' +
			'constraint violation, coding bug, panic — ROLLBACK returns you to ' +
			'a known-good state. Compare the alternative you just watched: ' +
			'hand-writing compensating UPDATEs for every partial failure, and ' +
			'getting one wrong.</div>',
		],

		task: 'Fix transfer(): run debit, check, and credit inside ONE session transaction so the refused transfer rolls back and money is conserved.',

		starter: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"os"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// transfer moves amount from one account to another, refusing overdrafts.',
			'// The overdraft check runs AFTER the debit on purpose: check-then-debit is',
			'// a race (another writer can drain the account between the read and the',
			'// write), so we debit first and inspect the result.',
			'//',
			'// TODO: the flaw is not the ordering — it is that every db.Exec here',
			'// AUTOCOMMITS. When the check fails, the debit is already durable; the',
			'// early return abandons the money instead of returning it. Wrap the whole',
			'// transfer in ONE transaction: s := db.NewSession(), then s.Exec("BEGIN"),',
			'// run the same statements through s, and s.Exec("ROLLBACK") on the',
			'// insufficient-funds path / s.Exec("COMMIT") on success.',
			'func transfer(db *sql.DB, from, to string, amount int) error {',
			'	// Step 1: debit — committed the instant it runs.',
			'	if _, err := db.Exec(`UPDATE accounts SET bal = bal - $1 WHERE name = $2`, amount, from); err != nil {',
			'		return err',
			'	}',
			'	// Step 2: validate the balance the debit produced.',
			'	res, err := db.Exec(`SELECT bal FROM accounts WHERE name = $1`, from)',
			'	if err != nil {',
			'		return err',
			'	}',
			'	if bal := res.Rows[0][0].(int64); bal < 0 {',
			'		// The transfer "fails" here — but step 1 already committed.',
			'		return fmt.Errorf("insufficient funds: %s would go to %d", from, bal)',
			'	}',
			'	// Step 3: credit.',
			'	if _, err := db.Exec(`UPDATE accounts SET bal = bal + $1 WHERE name = $2`, amount, to); err != nil {',
			'		return err',
			'	}',
			'	return nil',
			'}',
			'',
			'// printState prints both balances plus the invariant every transfer must',
			'// preserve: the SUM. Money moves between rows; it never appears or vanishes.',
			'func printState(db *sql.DB, label string) {',
			'	res, err := db.Exec(`SELECT name, bal FROM accounts ORDER BY name`)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	line := label + ":"',
			'	total := int64(0)',
			'	for _, row := range res.Rows {',
			'		line += fmt.Sprintf(" %s=%d", row[0], row[1])',
			'		total += row[1].(int64)',
			'	}',
			'	fmt.Printf("%s total=%d\\n", line, total)',
			'}',
			'',
			'func main() {',
			'	path := os.TempDir() + "/golearn-db-transactions-atomicity.db"',
			'	os.Remove(path) // the wasm module survives across runs — start fresh',
			'	eng, err := bytdb.Open(path)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	defer eng.Close()',
			'	db := sql.New(eng)',
			'',
			'	// Seeding is plain autocommit work — and note DDL cannot run inside a',
			'	// BEGIN block anyway, so setup always lives outside the transaction.',
			'	if _, err := db.Exec(`CREATE TABLE accounts (id SERIAL PRIMARY KEY, name TEXT UNIQUE, bal INT)`); err != nil {',
			'		panic(err)',
			'	}',
			'	if _, err := db.Exec(`INSERT INTO accounts (name, bal) VALUES (\'alice\', 500), (\'bob\', 100)`); err != nil {',
			'		panic(err)',
			'	}',
			'	printState(db, "start")',
			'',
			'	// A transfer that fits: both steps succeed.',
			'	if err := transfer(db, "alice", "bob", 200); err != nil {',
			'		fmt.Println("transfer 200 alice->bob:", err)',
			'	} else {',
			'		fmt.Println("transfer 200 alice->bob: ok")',
			'	}',
			'	printState(db, "state")',
			'',
			'	// A transfer that must be refused: alice has 300.',
			'	if err := transfer(db, "alice", "bob", 400); err != nil {',
			'		fmt.Println("transfer 400 alice->bob:", err)',
			'	} else {',
			'		fmt.Println("transfer 400 alice->bob: ok")',
			'	}',
			'	printState(db, "state")',
			'}',
			'',
		].join('\n'),

		// The invariant the check pins: the good transfer works, the refused
		// transfer is refused, AND the final state still reads
		// alice=300 bob=300 total=600 — i.e. the refusal rolled back. The
		// starter reaches the same refusal but its final state is
		// alice=-100 bob=300 total=200, so its last "state:" line never
		// matches and lastIndexOf stays at the mid-run occurrence (< fail).
		check: function (stdout, flat) {
			var seeded = flat.indexOf('start: alice=500 bob=100 total=600');
			var ok1 = flat.indexOf('transfer 200 alice->bob: ok');
			var mid = flat.indexOf('state: alice=300 bob=300 total=600');
			var fail = flat.indexOf('transfer 400 alice->bob: insufficient funds');
			var end = flat.lastIndexOf('state: alice=300 bob=300 total=600');
			return seeded !== -1 && ok1 !== -1 && mid !== -1 && fail !== -1 &&
				seeded < ok1 && ok1 < mid && mid < fail && fail < end;
		},

		solution: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"os"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// transfer moves amount from one account to another, refusing overdrafts —',
			'// atomically. The whole transfer runs inside ONE transaction on a session:',
			'// BEGIN opens the unit, nothing is visible to other sessions until COMMIT',
			'// publishes debit and credit together, and on the refusal path ROLLBACK',
			'// discards the debit — so "failed" means "never happened".',
			'//',
			'// The debit-then-check ordering is unchanged from the broken version — it',
			'// was never the bug. Inside a transaction it becomes the RIGHT design:',
			'// debit tentatively, inspect the result, and let ROLLBACK be the undo.',
			'func transfer(db *sql.DB, from, to string, amount int) error {',
			'	// One session = one transaction scope. BEGIN/COMMIT only work through',
			'	// a session; a bare db.Exec autocommits each statement on its own.',
			'	s := db.NewSession()',
			'	if _, err := s.Exec(`BEGIN`); err != nil {',
			'		return err',
			'	}',
			'	// Step 1: debit — tentative now, visible only inside this session.',
			'	if _, err := s.Exec(`UPDATE accounts SET bal = bal - $1 WHERE name = $2`, amount, from); err != nil {',
			'		s.Exec(`ROLLBACK`)',
			'		return err',
			'	}',
			'	// Step 2: validate the balance the debit produced. Reading our own',
			'	// uncommitted write is guaranteed inside the block.',
			'	res, err := s.Exec(`SELECT bal FROM accounts WHERE name = $1`, from)',
			'	if err != nil {',
			'		s.Exec(`ROLLBACK`)',
			'		return err',
			'	}',
			'	if bal := res.Rows[0][0].(int64); bal < 0 {',
			'		// ROLLBACK unwinds every statement since BEGIN: the pre-transfer',
			'		// state returns as if the debit never ran.',
			'		if _, rbErr := s.Exec(`ROLLBACK`); rbErr != nil {',
			'			return rbErr',
			'		}',
			'		return fmt.Errorf("insufficient funds: %s would go to %d (rolled back)", from, bal)',
			'	}',
			'	// Step 3: credit.',
			'	if _, err := s.Exec(`UPDATE accounts SET bal = bal + $1 WHERE name = $2`, amount, to); err != nil {',
			'		s.Exec(`ROLLBACK`)',
			'		return err',
			'	}',
			'	// COMMIT publishes both updates as one unit — no observer anywhere',
			'	// can ever see the debit without the credit.',
			'	if _, err := s.Exec(`COMMIT`); err != nil {',
			'		return err',
			'	}',
			'	return nil',
			'}',
			'',
			'// printState prints both balances plus the invariant every transfer must',
			'// preserve: the SUM. Money moves between rows; it never appears or vanishes.',
			'func printState(db *sql.DB, label string) {',
			'	res, err := db.Exec(`SELECT name, bal FROM accounts ORDER BY name`)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	line := label + ":"',
			'	total := int64(0)',
			'	for _, row := range res.Rows {',
			'		line += fmt.Sprintf(" %s=%d", row[0], row[1])',
			'		total += row[1].(int64)',
			'	}',
			'	fmt.Printf("%s total=%d\\n", line, total)',
			'}',
			'',
			'func main() {',
			'	path := os.TempDir() + "/golearn-db-transactions-atomicity.db"',
			'	os.Remove(path) // the wasm module survives across runs — start fresh',
			'	eng, err := bytdb.Open(path)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	defer eng.Close()',
			'	db := sql.New(eng)',
			'',
			'	// Seeding is plain autocommit work — and note DDL cannot run inside a',
			'	// BEGIN block anyway, so setup always lives outside the transaction.',
			'	if _, err := db.Exec(`CREATE TABLE accounts (id SERIAL PRIMARY KEY, name TEXT UNIQUE, bal INT)`); err != nil {',
			'		panic(err)',
			'	}',
			'	if _, err := db.Exec(`INSERT INTO accounts (name, bal) VALUES (\'alice\', 500), (\'bob\', 100)`); err != nil {',
			'		panic(err)',
			'	}',
			'	printState(db, "start")',
			'',
			'	// A transfer that fits: both steps succeed.',
			'	if err := transfer(db, "alice", "bob", 200); err != nil {',
			'		fmt.Println("transfer 200 alice->bob:", err)',
			'	} else {',
			'		fmt.Println("transfer 200 alice->bob: ok")',
			'	}',
			'	printState(db, "state")',
			'',
			'	// A transfer that must be refused: alice has 300.',
			'	if err := transfer(db, "alice", "bob", 400); err != nil {',
			'		fmt.Println("transfer 400 alice->bob:", err)',
			'	} else {',
			'		fmt.Println("transfer 400 alice->bob: ok")',
			'	}',
			'	printState(db, "state")',
			'}',
			'',
		].join('\n'),
	});
})();
