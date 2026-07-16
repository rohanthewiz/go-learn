/* Upsert & RETURNING — Integrity & Change (Medium). INSERT ... ON CONFLICT
 * DO UPDATE / DO NOTHING as the race-free replacement for check-then-insert,
 * plus RETURNING so the statement reports what it actually did. All upsert
 * forms used here were probed live against bytdb: excluded.<col> references,
 * table-qualified arithmetic (inventory.qty + excluded.qty), parameterized
 * SET expressions, and DO NOTHING's zero-rows/zero-affected conflict path.
 * The harness demands ONE statement per function (no semicolons) and drives
 * it down both paths — insert and conflict — to prove there is no gap.
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// The race, side by side with its cure. Left: two clients both pass the
	// SELECT check in the gap, and the slower INSERT dies. Right: the same
	// two writes as single statements — the engine serializes them on the
	// row, so both succeed. Marker ids namespaced dgArrowDBUP*.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 230" width="560" height="230" role="img" aria-label="check-then-insert: two clients both see no row during the gap, one INSERT fails with duplicate key; the single-statement upsert has no gap, both callers succeed">' +
		'<text x="20" y="22" class="lbl">check-then-insert: the gap is the bug</text>' +
		// left lane: client A and B timelines
		'<text x="30" y="48">client A</text>' +
		'<text x="150" y="48">client B</text>' +
		'<line x1="55" y1="58" x2="55" y2="196" stroke="var(--edge)" stroke-width="1.2"/>' +
		'<line x1="175" y1="58" x2="175" y2="196" stroke="var(--edge)" stroke-width="1.2"/>' +
		'<rect x="12" y="66" width="86" height="26" rx="4" fill="none" stroke="var(--edge)" stroke-width="1.4"/>' +
		'<text x="55" y="83" text-anchor="middle" class="lbl">SELECT: no row</text>' +
		'<rect x="132" y="96" width="86" height="26" rx="4" fill="none" stroke="var(--edge)" stroke-width="1.4"/>' +
		'<text x="175" y="113" text-anchor="middle" class="lbl">SELECT: no row</text>' +
		'<rect x="12" y="128" width="86" height="26" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="55" y="145" text-anchor="middle" class="lbl">INSERT &#10003;</text>' +
		'<rect x="132" y="160" width="86" height="26" rx="4" fill="none" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<text x="175" y="177" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">INSERT: duplicate!</text>' +
		'<path d="M 98 79 C 120 79 120 108 130 108" fill="none" stroke="var(--warn)" stroke-width="1.4" marker-end="url(#dgArrowDBUP)"/>' +
		'<text x="115" y="216" text-anchor="middle" class="lbl" style="fill:var(--warn)">both checks ran inside the gap</text>' +
		// divider
		'<line x1="270" y1="40" x2="270" y2="210" stroke="var(--edge)" stroke-width="1" stroke-dasharray="4 4"/>' +
		// right lane: the upsert
		'<text x="290" y="22" class="lbl">one statement: the engine owns the decision</text>' +
		'<rect x="290" y="60" width="250" height="46" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="415" y="79" text-anchor="middle" class="lbl">INSERT ... ON CONFLICT (sku)</text>' +
		'<text x="415" y="96" text-anchor="middle" class="lbl">DO UPDATE SET ... RETURNING ...</text>' +
		'<path d="M 415 110 L 415 136" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBUPok)"/>' +
		'<rect x="300" y="140" width="110" height="40" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="355" y="157" text-anchor="middle" class="lbl">no row yet:</text>' +
		'<text x="355" y="172" text-anchor="middle" class="lbl">insert path</text>' +
		'<rect x="424" y="140" width="110" height="40" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="479" y="157" text-anchor="middle" class="lbl">row exists:</text>' +
		'<text x="479" y="172" text-anchor="middle" class="lbl">update path</text>' +
		'<text x="415" y="204" text-anchor="middle" class="lbl">index probe and write are ONE atomic step &#8212; no gap for a racer</text>' +
		'<defs>' +
		'<marker id="dgArrowDBUP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowDBUPok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'upsert-returning',
		title: 'Upsert: ON CONFLICT + RETURNING',
		nav: 'upsert & returning',
		difficulty: 'Medium',
		category: 'Integrity & Change',
		task: 'Write UpsertStock() and RegisterSKU() — each returning ONE parameterized INSERT ... ON CONFLICT statement with RETURNING — so both the insert path and the conflict path work with no check-then-insert gap.',

		prose: [
			'<h2>Upsert: one statement, no gap</h2>' +
			'<p>The error-tracker fills with <code>duplicate primary key</code> from ' +
			'the stock-delivery endpoint. The code looks defensive: SELECT the SKU, ' +
			'INSERT if missing, UPDATE if present. But two delivery webhooks for a ' +
			'new SKU arrive 3ms apart, <em>both</em> SELECTs see no row, both take ' +
			'the INSERT branch, and the slower one dies on the primary key. ' +
			'Check-then-insert is a time-of-check/time-of-use race: the check and ' +
			'the write are separate statements, and the gap between them is where ' +
			'the second writer lives. The fix is to stop deciding in the app and ' +
			'let the engine decide <em>inside one statement</em>:</p>' +
			'<ul>' +
			'<li><strong><code>INSERT ... ON CONFLICT (col) DO UPDATE SET ...</code></strong> ' +
			'— try the insert; if the unique/PK probe on <code>col</code> finds an ' +
			'existing row, update that row instead. The probe and the write are one ' +
			'atomic step — there is no instant where a racer can slip between.</li>' +
			'<li><strong><code>excluded</code></strong> is the row that <em>failed ' +
			'to insert</em>: <code>SET qty = excluded.qty</code> means "take the ' +
			'incoming value". Qualify with the table name for the existing row: ' +
			'<code>SET qty = inventory.qty + excluded.qty</code> reads "old plus ' +
			'incoming" — an accumulate, exactly right for stock deliveries.</li>' +
			'<li><strong><code>DO NOTHING</code></strong> — insert-if-absent. On ' +
			'conflict the statement succeeds with <code>RowsAffected = 0</code> and ' +
			'an empty RETURNING set: "already there" is an answer, not an error.</li>' +
			'<li><strong><code>RETURNING</code></strong> turns the write into its own ' +
			'read: the row as it exists <em>after</em> the statement, whichever path ' +
			'ran — no follow-up SELECT, no second round-trip, no chance the row ' +
			'changed in between.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>The harness creates <code>inventory (sku TEXT PRIMARY KEY, qty INT ' +
			'NOT NULL)</code> and passes arguments for you — your functions return ' +
			'only SQL text, parameterized with <code>$1</code> (sku) and ' +
			'<code>$2</code> (qty):</p>' +
			'<ul>' +
			'<li><code>UpsertStock()</code> — record a stock delivery: insert the ' +
			'SKU with qty <code>$2</code>, or <em>add</em> <code>$2</code> to the ' +
			'existing qty. Must RETURN <code>sku, qty</code> as they stand after ' +
			'the write.</li>' +
			'<li><code>RegisterSKU()</code> — first-sight registration: insert the ' +
			'SKU if absent, change <strong>nothing</strong> if present. Also ' +
			'RETURNING <code>sku, qty</code>.</li>' +
			'</ul>' +
			'<div class="tip">Each function must return <strong>one</strong> ' +
			'statement — no semicolons, no SELECT-first. The harness runs the same ' +
			'string down both paths (fresh SKU, then existing SKU) and even races ' +
			'it against a plain INSERT to show what the upsert survives that ' +
			'check-then-insert does not.</div>',
		],

		starter: [
			'package main',
			'',
			'// UpsertStock returns ONE SQL statement recording a stock delivery:',
			'//   $1 = sku (TEXT), $2 = delivered qty (INT)',
			'// New SKU: insert the row. Existing SKU: ADD $2 to its qty. Either',
			'// way: RETURNING sku, qty — the row as it stands after the write.',
			'// One statement, no semicolons: the whole point is that the engine',
			'// makes the insert-or-update decision atomically.',
			'func UpsertStock() string {',
			'	// This is the check-then-insert mindset minus the check: works the',
			'	// first time, dies on the second delivery of the same SKU.',
			'	return `INSERT INTO inventory (sku, qty) VALUES ($1, $2) RETURNING sku, qty`',
			'}',
			'',
			'// RegisterSKU returns ONE SQL statement registering a SKU on first',
			'// sight: insert ($1, $2) if the sku is absent; if it already exists,',
			'// change NOTHING (an existing row keeps its qty). RETURNING sku, qty',
			'// so a fresh insert reports the new row and a no-op returns no rows.',
			'func RegisterSKU() string {',
			'	// your code here (same bug as above: no conflict path)',
			'	return `INSERT INTO inventory (sku, qty) VALUES ($1, $2) RETURNING sku, qty`',
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
			'	"strings"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			T.HARNESS_RT,
			'',
			T.DB_RT,
			'',
			'// shape statically vets that a returned string is ONE upsert-shaped',
			'// INSERT. This cannot prove correctness (the live cases do that) but',
			'// it pins the design: a multi-statement or SELECT-first answer is the',
			'// exact bug this item exists to unteach.',
			'func shape(q string) string {',
			'	t := strings.TrimSpace(q)',
			'	up := strings.ToUpper(t)',
			'	if strings.Contains(t, ";") {',
			'		return "not ONE statement (contains \';\')"',
			'	}',
			'	if !strings.HasPrefix(up, "INSERT") {',
			'		return "does not start with INSERT"',
			'	}',
			'	if !strings.Contains(up, "ON CONFLICT") {',
			'		return "no ON CONFLICT clause"',
			'	}',
			'	if !strings.Contains(up, "RETURNING") {',
			'		return "no RETURNING clause"',
			'	}',
			'	return "single INSERT with ON CONFLICT and RETURNING"',
			'}',
			'',
			'func main() {',
			'	db, cleanup := openDB("upsert-returning")',
			'	defer cleanup()',
			'	mustExec(db, `CREATE TABLE inventory (sku TEXT PRIMARY KEY, qty INT NOT NULL)`)',
			'',
			'	// run executes a learner statement and folds outcome + row count',
			'	// into one comparable string: RETURNING rows, then RowsAffected —',
			'	// so a case can pin BOTH which path ran and what it produced.',
			'	run := func(q string, sku string, qty int) string {',
			'		res, err := db.Exec(q, sku, qty)',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return fmt.Sprintf("%s affected=%d", rowsStr(res), res.RowsAffected)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"design check: both functions return ONE INSERT with ON CONFLICT and RETURNING",',
			'			"UpsertStock: single INSERT with ON CONFLICT and RETURNING / RegisterSKU: single INSERT with ON CONFLICT and RETURNING",',
			'			func() string {',
			'				return "UpsertStock: " + shape(UpsertStock()) + " / RegisterSKU: " + shape(RegisterSKU())',
			'			}},',
			'		{"first delivery of ANVIL-01 (qty 10): the insert path, RETURNING the new row",',
			'			"[[ANVIL-01 10]] affected=1",',
			'			func() string { return run(UpsertStock(), "ANVIL-01", 10) }},',
			'		{"second delivery of ANVIL-01 (qty 5): the SAME statement takes the conflict path and accumulates",',
			'			"[[ANVIL-01 15]] affected=1",',
			'			func() string { return run(UpsertStock(), "ANVIL-01", 5) }},',
			'		{"the race, replayed: a plain INSERT dies on the existing row; your upsert absorbs it",',
			'			"plain INSERT: duplicate primary key / upsert: [[ANVIL-01 20]] affected=1",',
			'			func() string {',
			'				plain := "no error (row was not there?)"',
			'				if _, err := db.Exec(`INSERT INTO inventory (sku, qty) VALUES (\'ANVIL-01\', 5)`); err != nil {',
			'					plain = err.Error()',
			'				}',
			'				return "plain INSERT: " + plain + " / upsert: " + run(UpsertStock(), "ANVIL-01", 5)',
			'			}},',
			'		{"RegisterSKU first sight of BOLT-7 (qty 100): inserts and returns the row",',
			'			"[[BOLT-7 100]] affected=1",',
			'			func() string { return run(RegisterSKU(), "BOLT-7", 100) }},',
			'		{"RegisterSKU again with qty 999: DO NOTHING — no rows returned, nothing changed",',
			'			"[] affected=0 qty-after=[[100]]",',
			'			func() string {',
			'				got := run(RegisterSKU(), "BOLT-7", 999)',
			'				res, err := db.Exec(`SELECT qty FROM inventory WHERE sku = \'BOLT-7\'`)',
			'				if err != nil {',
			'					return got + " qty-after=error: " + err.Error()',
			'				}',
			'				return got + " qty-after=" + rowsStr(res)',
			'			}},',
			'		{"no coordination needed: one more sku, one more delivery — final table is exact",',
			'			"[[ANVIL-01 21] [BOLT-7 100] [CRATE-2 30]]",',
			'			func() string {',
			'				a := run(UpsertStock(), "CRATE-2", 30)',
			'				b := run(UpsertStock(), "ANVIL-01", 1)',
			'				res, err := db.Exec(`SELECT sku, qty FROM inventory ORDER BY sku`)',
			'				if err != nil {',
			'					return "error: " + err.Error()',
			'				}',
			'				_ = a',
			'				_ = b',
			'				return rowsStr(res)',
			'			}},',
			'	}',
			'',
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
			'// UpsertStock: one statement, both paths. The conflict target (sku)',
			'// names the PRIMARY KEY, so the engine\'s uniqueness probe IS the',
			'// existence check — and because probe and write happen atomically',
			'// inside the statement, two racing deliveries serialize instead of',
			'// one of them dying on a duplicate key.',
			'func UpsertStock() string {',
			'	// SET qty = inventory.qty + excluded.qty',
			'	//            ^existing row     ^the row that failed to insert',
			'	// i.e. "old + incoming": deliveries ACCUMULATE. Contrast with',
			'	// SET qty = excluded.qty, which would mean "last write wins" —',
			'	// right for a cache row, an inventory bug here.',
			'	//',
			'	// RETURNING reports the row AFTER whichever path ran: the caller',
			'	// learns the post-delivery quantity without a second round-trip',
			'	// (which could also read someone else\'s later write — RETURNING',
			'	// is race-free where SELECT-after is not).',
			'	return `INSERT INTO inventory (sku, qty) VALUES ($1, $2)',
			'		ON CONFLICT (sku) DO UPDATE SET qty = inventory.qty + excluded.qty',
			'		RETURNING sku, qty`',
			'}',
			'',
			'// RegisterSKU: insert-if-absent. DO NOTHING makes "already there" a',
			'// quiet success (RowsAffected 0, empty RETURNING) instead of an',
			'// error — so the caller distinguishes "I created it" from "it',
			'// existed" by row count, not by parsing failure messages. This is',
			'// the idempotent form: run it once or five times, same end state,',
			'// which is exactly what a retrying webhook handler needs.',
			'func RegisterSKU() string {',
			'	return `INSERT INTO inventory (sku, qty) VALUES ($1, $2)',
			'		ON CONFLICT (sku) DO NOTHING',
			'		RETURNING sku, qty`',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Idempotency is the real subject</h3>' +
			'<p>Every network between your service and its callers delivers ' +
			'at-least-once: webhooks redeliver, mobile clients retry timeouts, ' +
			'queues replay after a consumer crash. So every write endpoint ' +
			'eventually runs twice, and the design question is what the second run ' +
			'does. The two upsert forms answer differently, and the difference ' +
			'matters:</p>' +
			'<ul>' +
			'<li><code>DO NOTHING</code> and <code>DO UPDATE SET col = ' +
			'excluded.col</code> are <strong>idempotent</strong> — replaying the ' +
			'statement converges on the same state. Safe under blind retries.</li>' +
			'<li>The accumulate form (<code>SET qty = inventory.qty + ' +
			'excluded.qty</code>) is race-free but <strong>not</strong> ' +
			'retry-idempotent: a redelivered webhook adds the stock twice. ' +
			'Production systems pair it with a dedupe key — a ' +
			'<code>deliveries(delivery_id PRIMARY KEY)</code> table written with ' +
			'<code>ON CONFLICT DO NOTHING</code> in the same transaction; if that ' +
			'insert reports 0 rows, the delivery already happened and the ' +
			'accumulate is skipped. Upserts guarding upserts.</li>' +
			'</ul>' +
			'<h3>ON CONFLICT vs MERGE</h3>' +
			'<p><code>ON CONFLICT</code> is Postgres dialect (SQLite and ' +
			'CockroachDB adopted it; MySQL&rsquo;s cousin is <code>ON DUPLICATE ' +
			'KEY UPDATE</code>). The SQL standard&rsquo;s answer is ' +
			'<code>MERGE</code> (in Postgres since 15) — more general: it can ' +
			'match on arbitrary conditions, not just a unique index, and can ' +
			'DELETE as well as insert/update, which makes it the tool for bulk ' +
			'reconciliation of a staging table into a target. The catch: classic ' +
			'MERGE decides matched-vs-not-matched <em>before</em> writing, so two ' +
			'concurrent MERGEs can still race into a unique violation — the exact ' +
			'bug you just designed away. <code>ON CONFLICT</code> is narrower and ' +
			'safer precisely because it is welded to a unique index: the conflict ' +
			'target names an index, and the engine arbitrates at that index ' +
			'atomically. Narrow tool, hard guarantee.</p>' +
			'<h3>What RETURNING buys</h3>' +
			'<p>One statement means one round-trip: insert a row and get its ' +
			'generated id (<code>RETURNING id</code>) without a follow-up query. ' +
			'But the deeper win is consistency — a SELECT after the write is a ' +
			'<em>second</em> statement that can observe someone else&rsquo;s ' +
			'in-between write, while RETURNING reports exactly the row your ' +
			'statement produced. This engine, like Postgres, supports RETURNING on ' +
			'all DML — UPDATE and DELETE too, where "which rows did I actually ' +
			'touch?" is otherwise unanswerable after the fact.</p>' +
			'<h3>Field notes</h3>' +
			'<p>Grep any mature codebase for <code>SELECT</code>-then-' +
			'<code>INSERT</code> "get or create" helpers and you will find the ' +
			'incident that follows them: it works in dev (one writer), works in ' +
			'staging, then production concurrency arrives and the duplicate-key ' +
			'alerts start — usually during the traffic spike that made the ' +
			'product succeed. The fix is almost always this item: collapse the ' +
			'decision into the statement, let the unique index arbitrate, read ' +
			'the outcome from RETURNING and <code>RowsAffected</code>.</p>',
		],
		complexity: { time: 'O(log n) — one index probe decides insert-vs-update inside the statement', space: 'O(1) beyond the row written' },
	});
})();
