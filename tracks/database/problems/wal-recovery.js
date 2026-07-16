/* WAL Recovery — Inside the Engine (lesson). Why every serious engine
 * appends and fsyncs a log record BEFORE touching any data page, and why
 * recovery is nothing but "replay committed, discard uncommitted". Half 1:
 * the learner implements that rule over a toy log with an interleaved
 * committed txn and a torn uncommitted one. Half 2 runs the real thing:
 * bytdb rows written, engine closed, same file reopened — the SELECT is
 * answered from the engine's own WAL replay.
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// Flagship diagram: the log as found on disk after a power cut — txn 7's
	// records end in a COMMIT, txn 9's tail is cut off by the crash — and the
	// recovery verdict each record receives. Marker ids namespaced
	// (dgArrowDBWL*) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 580 264" width="580" height="264" role="img" aria-label="a write-ahead log timeline: txn 7 records ending in COMMIT are replayed into the recovered state; txn 9 records with no COMMIT before the crash are discarded">' +
		'<text x="16" y="20" class="lbl">the log on disk, in append order — each record fsynced before any data page is touched</text>' +
		// the five log records, left to right = append order
		'<rect x="16" y="40" width="100" height="44" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="66" y="58" text-anchor="middle">txn 7</text>' +
		'<text x="66" y="76" text-anchor="middle" class="lbl">set alice=900</text>' +
		'<rect x="124" y="40" width="100" height="44" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="174" y="58" text-anchor="middle">txn 9</text>' +
		'<text x="174" y="76" text-anchor="middle" class="lbl">set dave=75</text>' +
		'<rect x="232" y="40" width="100" height="44" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="282" y="58" text-anchor="middle">txn 7</text>' +
		'<text x="282" y="76" text-anchor="middle" class="lbl">set carol=120</text>' +
		'<rect x="340" y="40" width="100" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="390" y="58" text-anchor="middle" style="fill:var(--ok)">txn 7</text>' +
		'<text x="390" y="76" text-anchor="middle" class="lbl" style="fill:var(--ok)">COMMIT</text>' +
		'<rect x="448" y="40" width="104" height="44" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="500" y="58" text-anchor="middle">txn 9</text>' +
		'<text x="500" y="76" text-anchor="middle" class="lbl">set dave=9000</text>' +
		// the crash: the log simply STOPS here
		'<path d="M 562 30 L 562 100" stroke="var(--err-edge)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<text x="562" y="24" text-anchor="middle" style="fill:var(--err-fg)">&#9986;</text>' +
		'<text x="556" y="118" text-anchor="end" class="lbl" style="fill:var(--err-fg)">power loss — txn 9&#8217;s COMMIT never appended</text>' +
		// recovery verdicts
		'<text x="16" y="146" class="lbl">recovery on restart: scan the whole log — COMMIT records decide everything</text>' +
		'<rect x="100" y="172" width="240" height="48" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="220" y="192" text-anchor="middle" style="fill:var(--ok)">recovered state</text>' +
		'<text x="220" y="210" text-anchor="middle" class="lbl">alice=900 &#183; carol=120</text>' +
		'<rect x="412" y="172" width="150" height="48" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<text x="487" y="192" text-anchor="middle" style="fill:var(--err-fg)">discarded</text>' +
		'<text x="487" y="210" text-anchor="middle" class="lbl">no COMMIT in the log</text>' +
		// replay edges (committed txn 7)
		'<path d="M 66 88 C 72 130 130 144 158 168" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDBWLok)"/>' +
		'<path d="M 282 88 C 280 120 258 142 240 168" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDBWLok)"/>' +
		'<path d="M 390 88 C 384 122 330 144 300 168" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDBWLok)"/>' +
		'<text x="60" y="136" class="lbl" style="fill:var(--ok)">replay: COMMIT present</text>' +
		// discard edges (uncommitted txn 9) — routed above the recovered box
		'<path d="M 174 88 C 192 136 400 132 462 168" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowDBWLerr)"/>' +
		'<path d="M 500 88 C 504 128 498 148 492 168" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowDBWLerr)"/>' +
		'<text x="16" y="252" class="lbl">replay is idempotent — recovery itself can crash and simply rerun from the top</text>' +
		'<defs>' +
		'<marker id="dgArrowDBWLok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowDBWLerr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'wal-recovery',
		title: 'Write-Ahead Logging: Crash-Proof by Construction',
		nav: 'WAL recovery',
		category: 'Inside the Engine',

		prose: [
			'<h2>Write-Ahead Logging: Crash-Proof by Construction</h2>' +
			'<p>A rack loses power mid-checkout. The kernel is gone, the page cache ' +
			'with it, and somewhere on disk there is half of a B-tree page. Twenty ' +
			'seconds later the database is back — every committed order present, ' +
			'every half-finished one gone, as if the crash had been scheduled. The ' +
			'machinery behind that is one rule, old enough to have a name from the ' +
			'System&nbsp;R days: <strong>write ahead</strong>.</p>' +
			'<ul>' +
			'<li><strong>Log first, always.</strong> Before touching any data page, ' +
			'the engine appends a record describing the change to a sequential log ' +
			'and <code>fsync</code>s it. The data structures on disk are allowed to ' +
			'be arbitrarily stale or half-written at any instant — the log is the ' +
			'source of truth.</li>' +
			'<li><strong>Why this order and not the other.</strong> Apply-then-log ' +
			'loses: crash after the apply but before the log write, and the disk ' +
			'holds a mutation no record describes — nothing to redo it from, ' +
			'nothing to undo it with. Log-then-apply survives a crash at ' +
			'<em>any</em> point: crash before the append and the change simply ' +
			'never happened; crash after it and replay re-applies; crash ' +
			'<em>during</em> the append and the torn tail record belongs to a txn ' +
			'with no COMMIT — discarded. Every interleaving is covered.</li>' +
			'<li><strong>Commit is one fsync.</strong> A transaction is durable the ' +
			'moment its COMMIT record reaches the log — the data pages may not be ' +
			'rewritten for minutes. Recovery&rsquo;s rule is the mirror image: a ' +
			'txn&rsquo;s records count <em>iff</em> its COMMIT made it to disk.</li>' +
			'<li><strong>Group commit.</strong> The fsync is the expensive step ' +
			'(milliseconds on spinning disks, tens of microseconds on NVMe), so ' +
			'engines batch: one log flush carries the COMMIT records of every ' +
			'transaction that arrived while the previous flush was in flight. ' +
			'Throughput scales with concurrency while each txn still pays at most ' +
			'one flush of latency.</li>' +
			'<li><strong>Checkpoints bound the replay.</strong> Left alone, ' +
			'recovery would replay from the beginning of time. A checkpoint writes ' +
			'the dirty pages out, records &ldquo;everything before here is ' +
			'applied&rdquo;, and truncates the log — restart cost becomes ' +
			'proportional to work since the last checkpoint, not to the ' +
			'database&rsquo;s lifetime.</li>' +
			'</ul>' +
			DIAGRAM +
			'<div class="tip">This is not a simulation of somebody else&rsquo;s ' +
			'engine: bytdb&rsquo;s key-value layer (btypedb) is power-loss-tested ' +
			'with exactly this scheme — <code>kill -9</code> mid-write, reopen, ' +
			'and every committed batch must be present, every torn tail ' +
			'discarded.</div>' +
			'<h3>Your job</h3>' +
			'<p>Half&nbsp;1 of the program is recovery in miniature: implement ' +
			'<code>recover</code> so it replays, in log order, only the ' +
			'<code>set</code> records of transactions whose <code>commit</code> ' +
			'record is present — txn 7 committed, txn 9 is a torn tail. ' +
			'Half&nbsp;2 then does it for real: rows are inserted, the engine is ' +
			'closed, and the <em>same file</em> is reopened without a reset — the ' +
			'rows come back because <code>bytdb.Open</code> replays its actual WAL ' +
			'(in the browser this happens inside the page&rsquo;s in-memory ' +
			'filesystem).</p>',
		],

		task: 'Implement recover(): replay the set records of committed transactions in log order; the live half then shows bytdb doing the same with its real WAL.',

		starter: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"os"',
			'	"sort"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// WalRec is one record in a toy write-ahead log. Two ops exist:',
			'//   "set"    — txn Txn wants Key to become Val',
			'//   "commit" — txn Txn\'s COMMIT record reached the disk',
			'// The log is exactly what survives a crash; nothing else does.',
			'type WalRec struct {',
			'	Txn int',
			'	Op  string',
			'	Key string',
			'	Val string',
			'}',
			'',
			'// recover rebuilds the database state from the log found after a crash.',
			'//',
			'// TODO — implement the recovery rule:',
			'//   1. scan the log and collect the ids of txns whose "commit" record',
			'//      is PRESENT (only a COMMIT on disk makes a txn real)',
			'//   2. replay the "set" records of those txns, in log order',
			'//   3. every record of a txn with no COMMIT is discarded — that txn',
			'//      never happened, no matter how many of its sets hit the log',
			'func recover(walLog []WalRec) map[string]string {',
			'	// your code here — currently nothing is recovered',
			'	return map[string]string{}',
			'}',
			'',
			'func main() {',
			'	// ---- half 1: toy recovery --------------------------------------',
			'	// The log as found on disk after a power cut. Txn 7 committed;',
			'	// txn 9 was still writing — its COMMIT never made it.',
			'	walLog := []WalRec{',
			'		{Txn: 7, Op: "set", Key: "alice", Val: "900"},',
			'		{Txn: 9, Op: "set", Key: "dave", Val: "75"}, // interleaved writer',
			'		{Txn: 7, Op: "set", Key: "carol", Val: "120"},',
			'		{Txn: 7, Op: "commit"},',
			'		{Txn: 9, Op: "set", Key: "dave", Val: "9000"},',
			'		// ---- power loss: txn 9\'s COMMIT was never appended ----',
			'	}',
			'',
			'	state := recover(walLog)',
			'	fmt.Println("recovered state after crash:")',
			'	keys := make([]string, 0, len(state))',
			'	for k := range state {',
			'		keys = append(keys, k)',
			'	}',
			'	sort.Strings(keys) // map order is random; sorted output is stable',
			'	for _, k := range keys {',
			'		fmt.Printf("  %s = %s\\n", k, state[k])',
			'	}',
			'',
			'	// ---- half 2: the real thing ------------------------------------',
			'	// bytdb keeps an actual WAL under this file. Write rows, close the',
			'	// engine, then reopen the SAME file: the rows come back because',
			'	// Open replays that log — the rule above, run for real.',
			'	path := os.TempDir() + "/golearn-db-wal-recovery.db"',
			'	os.Remove(path) // the wasm module survives across runs — start fresh',
			'',
			'	eng, err := bytdb.Open(path)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	db := sql.New(eng)',
			'	mustExec(db, `CREATE TABLE accounts (id INT PRIMARY KEY, owner TEXT, balance INT)`)',
			'	mustExec(db, `INSERT INTO accounts VALUES (1, \'ada\', 900), (2, \'lin\', 350)`)',
			'	if err := eng.Close(); err != nil {',
			'		panic(err)',
			'	}',
			'',
			'	// Reopen WITHOUT removing: every row below is reconstructed from',
			'	// the engine\'s log, not from this program\'s variables.',
			'	eng2, err := bytdb.Open(path)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	defer eng2.Close()',
			'	db2 := sql.New(eng2)',
			'	res, err := db2.Exec(`SELECT id, owner, balance FROM accounts ORDER BY id`)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	fmt.Println()',
			'	fmt.Println("rows after close + reopen (replayed from the engine\'s WAL):")',
			'	fmt.Printf("%v\\n", res.Rows)',
			'}',
			'',
			'// mustExec runs setup SQL that is not the lesson\'s point; a failure',
			'// here is a bug in the lesson itself, so it fails loudly.',
			'func mustExec(db *sql.DB, q string) *sql.Result {',
			'	res, err := db.Exec(q)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	return res',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// Committed txn 7 replayed in full…
			return flat.indexOf('alice = 900') !== -1 &&
				flat.indexOf('carol = 120') !== -1 &&
				// …torn txn 9 discarded entirely (neither 75 nor 9000)…
				flat.indexOf('dave') === -1 &&
				// …and the live rows survived the close + reopen.
				flat.indexOf('[[1 ada 900] [2 lin 350]]') !== -1;
		},

		solution: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"os"',
			'	"sort"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// WalRec is one record in a toy write-ahead log. Two ops exist:',
			'//   "set"    — txn Txn wants Key to become Val',
			'//   "commit" — txn Txn\'s COMMIT record reached the disk',
			'// The log is exactly what survives a crash; nothing else does.',
			'type WalRec struct {',
			'	Txn int',
			'	Op  string',
			'	Key string',
			'	Val string',
			'}',
			'',
			'// recover rebuilds the database state from the log found after a crash.',
			'//',
			'// Two passes over the same log — and the pass ORDER is the design:',
			'//',
			'//	pass 1: which txns are real? A txn exists iff its COMMIT record',
			'//	        hit the disk. Not "wrote all its sets", not "was about',
			'//	        to" — the commit record IS the commit.',
			'//	pass 2: replay the sets of real txns in log order. Log order',
			'//	        matters when committed txns touch the same key: the later',
			'//	        set wins, exactly as it did before the crash.',
			'//',
			'// A single-pass version must buffer each txn\'s sets until its fate is',
			'// known — that is what real engines do to bound memory on huge logs —',
			'// but two passes state the invariant more plainly.',
			'func recover(walLog []WalRec) map[string]string {',
			'	committed := map[int]bool{}',
			'	for _, rec := range walLog {',
			'		if rec.Op == "commit" {',
			'			committed[rec.Txn] = true',
			'		}',
			'	}',
			'',
			'	state := map[string]string{}',
			'	for _, rec := range walLog {',
			'		// Discarding txn 9 needs no code at all: records of',
			'		// uncommitted txns simply never match this condition. The',
			'		// "torn tail" case is handled by NOT handling it.',
			'		if rec.Op == "set" && committed[rec.Txn] {',
			'			state[rec.Key] = rec.Val',
			'		}',
			'	}',
			'	return state',
			'}',
			'',
			'func main() {',
			'	// ---- half 1: toy recovery --------------------------------------',
			'	// The log as found on disk after a power cut. Txn 7 committed;',
			'	// txn 9 was still writing — its COMMIT never made it.',
			'	walLog := []WalRec{',
			'		{Txn: 7, Op: "set", Key: "alice", Val: "900"},',
			'		{Txn: 9, Op: "set", Key: "dave", Val: "75"}, // interleaved writer',
			'		{Txn: 7, Op: "set", Key: "carol", Val: "120"},',
			'		{Txn: 7, Op: "commit"},',
			'		{Txn: 9, Op: "set", Key: "dave", Val: "9000"},',
			'		// ---- power loss: txn 9\'s COMMIT was never appended ----',
			'	}',
			'',
			'	state := recover(walLog)',
			'	fmt.Println("recovered state after crash:")',
			'	keys := make([]string, 0, len(state))',
			'	for k := range state {',
			'		keys = append(keys, k)',
			'	}',
			'	sort.Strings(keys) // map order is random; sorted output is stable',
			'	for _, k := range keys {',
			'		fmt.Printf("  %s = %s\\n", k, state[k])',
			'	}',
			'',
			'	// ---- half 2: the real thing ------------------------------------',
			'	// bytdb keeps an actual WAL under this file. Write rows, close the',
			'	// engine, then reopen the SAME file: the rows come back because',
			'	// Open replays that log — the rule above, run for real.',
			'	path := os.TempDir() + "/golearn-db-wal-recovery.db"',
			'	os.Remove(path) // the wasm module survives across runs — start fresh',
			'',
			'	eng, err := bytdb.Open(path)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	db := sql.New(eng)',
			'	mustExec(db, `CREATE TABLE accounts (id INT PRIMARY KEY, owner TEXT, balance INT)`)',
			'	mustExec(db, `INSERT INTO accounts VALUES (1, \'ada\', 900), (2, \'lin\', 350)`)',
			'	// Close is a clean shutdown here, but the durability story does',
			'	// not depend on it being clean: each statement above was logged',
			'	// and fsynced BEFORE it was applied, so a kill at any point',
			'	// after commit leaves the same log to replay.',
			'	if err := eng.Close(); err != nil {',
			'		panic(err)',
			'	}',
			'',
			'	// Reopen WITHOUT removing: every row below is reconstructed from',
			'	// the engine\'s log, not from this program\'s variables.',
			'	eng2, err := bytdb.Open(path)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	defer eng2.Close()',
			'	db2 := sql.New(eng2)',
			'	res, err := db2.Exec(`SELECT id, owner, balance FROM accounts ORDER BY id`)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	fmt.Println()',
			'	fmt.Println("rows after close + reopen (replayed from the engine\'s WAL):")',
			'	fmt.Printf("%v\\n", res.Rows)',
			'}',
			'',
			'// mustExec runs setup SQL that is not the lesson\'s point; a failure',
			'// here is a bug in the lesson itself, so it fails loudly.',
			'func mustExec(db *sql.DB, q string) *sql.Result {',
			'	res, err := db.Exec(q)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	return res',
			'}',
			'',
		].join('\n'),
	});
})();
