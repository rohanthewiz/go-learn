/* Sequences & Column Defaults — Transactions (Easy). CREATE SEQUENCE /
 * nextval / setval as the engine's atomic counters, SERIAL as the per-
 * column shorthand, and DEFAULTs as the engine completing rows you only
 * partially state. All behaviors probed live: START honored, setval jumps,
 * nextval usable inside INSERT VALUES, and DEFAULT now() asserted only as
 * "IS NOT NULL" — clock values are never literal-compared.
 */
(function () {
	'use strict';
	var T = GoLearnBY;

	// One counter object, three consumers. Marker ids namespaced
	// dgArrowBY09*.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 224" width="560" height="224" role="img" aria-label="a sequence is a named counter in the catalog: nextval draws atomically; SERIAL wires a hidden counter to a column; setval repositions it; DEFAULT clauses fill unstated columns at insert time">' +
		'<rect x="200" y="34" width="160" height="46" rx="8" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="280" y="54" text-anchor="middle">ticket_no</text>' +
		'<text x="280" y="71" text-anchor="middle" class="lbl">next: 1000 → 1001 → ...</text>' +
		'<path d="M 200 66 C 140 80 110 96 96 116" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBY09)"/>' +
		'<text x="80" y="140" text-anchor="middle" class="lbl">SELECT nextval(\'ticket_no\')</text>' +
		'<text x="80" y="156" text-anchor="middle" class="lbl">draw a number in Go</text>' +
		'<path d="M 280 80 L 280 116" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBY09)"/>' +
		'<text x="280" y="140" text-anchor="middle" class="lbl">INSERT ... VALUES (nextval(...))</text>' +
		'<text x="280" y="156" text-anchor="middle" class="lbl">number rows in ANY table</text>' +
		'<path d="M 360 66 C 420 80 450 96 464 116" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowBY09w)"/>' +
		'<text x="470" y="140" text-anchor="middle" class="lbl" style="fill:var(--warn)">setval(\'ticket_no\', 5000)</text>' +
		'<text x="470" y="156" text-anchor="middle" class="lbl" style="fill:var(--warn)">reposition (migrations)</text>' +
		'<text x="20" y="192" class="lbl">SERIAL PRIMARY KEY = the same machinery, one hidden sequence wired to one column;</text>' +
		'<text x="20" y="210" class="lbl">DEFAULT \'queued\' / DEFAULT 0 / DEFAULT now() = the engine completes every column you left unstated</text>' +
		'<defs>' +
		'<marker id="dgArrowBY09" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowBY09w" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'sequences-and-defaults',
		title: 'Sequences & Column Defaults',
		nav: 'sequences and defaults',
		difficulty: 'Easy',
		category: 'Transactions',
		task: 'Number support tickets from a standalone sequence (CREATE SEQUENCE, nextval, setval), build a jobs table whose SERIAL id and DEFAULT columns complete themselves, and feed one sequence into inserts across tables.',

		prose: [
			'<h2>Sequences &amp; column defaults</h2>' +
			'<p>A support tool needs ticket numbers: human-readable, gapless-ish, ' +
			'starting at 1000 because marketing said so. Version one kept a ' +
			'<code>counter</code> row and did read-increment-write — until two ' +
			'agents opened tickets in the same second and both got #1042. The ' +
			'engine already owns the right primitive: a <strong>sequence</strong>, ' +
			'a named counter in the catalog whose draw is atomic no matter how ' +
			'many writers hit it:</p>',
			{ lang: 'sql', code: "CREATE SEQUENCE ticket_no START 1000;\nSELECT nextval('ticket_no');   -- 1000: draw-and-advance, atomically\nSELECT nextval('ticket_no');   -- 1001: never repeats, never blocks readers\nSELECT setval('ticket_no', 5000);  -- reposition: next draw is 5001\nSELECT currval('ticket_no');   -- what THIS session last drew (no draw)" },
			'<ul>' +
			'<li><strong><code>nextval</code> is draw-and-advance in one atomic ' +
			'step</strong> — the check-then-increment race is structurally gone. ' +
			'It works standalone (<code>SELECT nextval(...)</code> to get a ' +
			'number into Go) and <em>inside</em> INSERT expressions, which is how ' +
			'one numbering can span several tables.</li>' +
			'<li><strong><code>setval</code> repositions</strong> — the migration ' +
			'tool (“imported legacy tickets up to 5000, continue from there”). ' +
			'<code>currval</code> re-reads your session\'s last draw without ' +
			'consuming a number.</li>' +
			'<li><strong><code>SERIAL</code> is this same machinery as ' +
			'shorthand:</strong> a hidden sequence wired to one column, drawn ' +
			'whenever you omit the column. You have been using it since item ' +
			'one; now you know what it is.</li>' +
			'<li><strong><code>DEFAULT</code> generalizes “the engine completes ' +
			'the row”:</strong> constants (<code>DEFAULT \'queued\'</code>, ' +
			'<code>DEFAULT 0</code>) and clock functions (<code>DEFAULT ' +
			'now()</code>, <code>DEFAULT current_date</code> — timestamp/date ' +
			'columns only). State what the caller knows; the schema fills the ' +
			'rest, uniformly, at every call site.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Six SQL strings: create the ticket sequence, draw from it, ' +
			'reposition it, create a <code>jobs</code> table whose id/state/' +
			'tries/created all self-complete, enqueue a job stating only its ' +
			'<code>kind</code>, and open a ticket whose number comes from the ' +
			'sequence <em>inside</em> the INSERT.</p>' +
			'<div class="tip">One honesty note about clock defaults: ' +
			'<code>now()</code> produces a real timestamp, so no test (and no ' +
			'sane code) should ever compare it literally — the harness asserts ' +
			'<code>created IS NOT NULL</code>, a derived fact that is true ' +
			'whenever the default fired. The same discipline applies to your own ' +
			'tests against time-defaulted columns.</div>',
		],

		starter: [
			'package main',
			'',
			'// Six functions, each returning ONE SQL string, run in order',
			'// against a live engine.',
			'',
			'// CreateTicketSeqSQL: a sequence named ticket_no starting at 1000.',
			'func CreateTicketSeqSQL() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// NextTicketSQL: draw the next ticket number from ticket_no.',
			'// (The harness runs this string more than once — first draw 1000.)',
			'func NextTicketSQL() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// SkipToSQL: reposition ticket_no so the NEXT draw returns 5001',
			'// (legacy tickets up to 5000 were imported).',
			'func SkipToSQL() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// CreateJobsSQL: ONE CREATE TABLE for the job queue:',
			'//',
			'//   table: jobs',
			'//     id      SERIAL PRIMARY KEY',
			'//     kind    TEXT, required (the only column callers supply)',
			'//     state   TEXT, required, DEFAULT \'queued\'',
			'//     tries   INT, required, DEFAULT 0',
			'//     created TIMESTAMP, required, DEFAULT now()',
			'func CreateJobsSQL() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// EnqueueSQL: insert ONE job stating ONLY kind = \'email\', and',
			'// RETURNING id, kind, state, tries — every returned value except',
			'// kind must come from SERIAL or a DEFAULT.',
			'//   first run wants: [[1 email queued 0]]',
			'func EnqueueSQL() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// OpenTicketSQL: the tickets table exists (harness-owned):',
			'//',
			'//   CREATE TABLE tickets (no INT PRIMARY KEY, subject TEXT NOT NULL)',
			'//',
			'// Insert a ticket with subject \'printer on fire\' whose number is',
			'// drawn from ticket_no INSIDE the statement (nextval in VALUES),',
			'// RETURNING no, subject.',
			'func OpenTicketSQL() string {',
			'	// your code here',
			'	return ""',
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
			'	db, cleanup := openDB("by-sequences-defaults")',
			'	defer cleanup()',
			'',
			'	mustExec(db, `CREATE TABLE tickets (no INT PRIMARY KEY, subject TEXT NOT NULL)`)',
			'',
			'	results := make([]map[string]any, 0, 6)',
			'	newCase := func(name, want string) map[string]any {',
			'		r := map[string]any{"input": name, "want": want}',
			'		results = append(results, r)',
			'		return r',
			'	}',
			'	runSQL := func(r map[string]any, q, want string) {',
			'		res, err := db.Exec(q)',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "exec error: " + err.Error()',
			'			return',
			'		}',
			'		got := rowsStr(res)',
			'		r["pass"] = got == want',
			'		r["got"] = got',
			'	}',
			'',
			'	// Case 1: create the sequence, then the first draw honors START.',
			'	r := newCase("CREATE SEQUENCE, first nextval draws 1000", "[[1000]]")',
			'	runCase(r, func() {',
			'		if _, err := db.Exec(CreateTicketSeqSQL()); err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "create error: " + err.Error()',
			'			return',
			'		}',
			'		runSQL(r, NextTicketSQL(), "[[1000]]")',
			'	})',
			'',
			'	// Case 2: the SAME string drawn again advances — the atomic',
			'	// draw-and-advance that the counter-row read-modify-write lacked.',
			'	r = newCase("second draw of the same string advances to 1001", "[[1001]]")',
			'	runCase(r, func() { runSQL(r, NextTicketSQL(), "[[1001]]") })',
			'',
			'	// Case 3: setval repositions; next draw continues AFTER the mark,',
			'	// and currval re-reads this session\'s draw without consuming.',
			'	r = newCase("setval(5000): next draw 5001, currval agrees", "drew [[5001]], currval [[5001]]")',
			'	runCase(r, func() {',
			'		if _, err := db.Exec(SkipToSQL()); err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "setval error: " + err.Error()',
			'			return',
			'		}',
			'		drew, err := db.Exec(NextTicketSQL())',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "draw error: " + err.Error()',
			'			return',
			'		}',
			'		cur, err := db.Exec("SELECT currval(\'ticket_no\')")',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "currval error: " + err.Error()',
			'			return',
			'		}',
			'		got := fmt.Sprintf("drew %s, currval %s", rowsStr(drew), rowsStr(cur))',
			'		r["pass"] = got == "drew [[5001]], currval [[5001]]"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 4: the jobs table — enqueue states only kind; SERIAL and',
			'	// the DEFAULTs must complete the row.',
			'	r = newCase("CREATE jobs; enqueue supplies only kind", "[[1 email queued 0]]")',
			'	runCase(r, func() {',
			'		if _, err := db.Exec(CreateJobsSQL()); err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "create error: " + err.Error()',
			'			return',
			'		}',
			'		runSQL(r, EnqueueSQL(), "[[1 email queued 0]]")',
			'	})',
			'',
			'	// Case 5: enqueue again — the hidden SERIAL sequence advances',
			'	// independently of ticket_no, and now() filled created both times',
			'	// (asserted as a derived fact, never as a literal clock value).',
			'	r = newCase("second enqueue: id 2, created IS NOT NULL for both", "[[2 email queued 0]], created set: [[1 true] [2 true]]")',
			'	runCase(r, func() {',
			'		res, err := db.Exec(EnqueueSQL())',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "enqueue error: " + err.Error()',
			'			return',
			'		}',
			'		probe := mustExec(db, "SELECT id, created IS NOT NULL FROM jobs ORDER BY id")',
			'		got := fmt.Sprintf("%s, created set: %s", rowsStr(res), rowsStr(probe))',
			'		r["pass"] = got == "[[2 email queued 0]], created set: [[1 true] [2 true]]"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 6: nextval inside an INSERT — the standalone sequence',
			'	// numbers a row in a completely different table (5002 follows',
			'	// the 5001 drawn in case 3).',
			'	r = newCase("OpenTicketSQL: nextval feeds the tickets PK in-statement", "[[5002 printer on fire]]")',
			'	runCase(r, func() { runSQL(r, OpenTicketSQL(), "[[5002 printer on fire]]") })',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// START sets the first value nextval will produce. Everything else',
			'// (increment 1, ascending, bigint bounds) takes Postgres-style',
			'// defaults; INCREMENT / MINVALUE / MAXVALUE exist when a workload',
			'// needs strides or rings.',
			'func CreateTicketSeqSQL() string {',
			'	return `CREATE SEQUENCE ticket_no START 1000`',
			'}',
			'',
			'// nextval draws AND advances in one atomic engine operation — two',
			'// concurrent callers get two different numbers, no locking in',
			'// application code. Selecting it is how Go borrows the counter.',
			'func NextTicketSQL() string {',
			'	return `SELECT nextval(\'ticket_no\')`',
			'}',
			'',
			'// setval(seq, n) makes n the LAST-used value, so the next draw is',
			'// n+1 — the off-by-one to remember when migrating: pass the highest',
			'// existing number, not the first free one.',
			'func SkipToSQL() string {',
			'	return `SELECT setval(\'ticket_no\', 5000)`',
			'}',
			'',
			'// Every column except kind self-completes: SERIAL from its hidden',
			'// sequence, state/tries from constant defaults, created from the',
			'// clock. Declaring completion in the schema (rather than in every',
			'// INSERT call site) is what keeps the table consistent when a',
			'// second writer shows up.',
			'func CreateJobsSQL() string {',
			'	return `CREATE TABLE jobs (',
			'		id      SERIAL PRIMARY KEY,',
			'		kind    TEXT NOT NULL,',
			'		state   TEXT NOT NULL DEFAULT \'queued\',',
			'		tries   INT NOT NULL DEFAULT 0,',
			'		created TIMESTAMP NOT NULL DEFAULT now()',
			'	)`',
			'}',
			'',
			'// The INSERT states exactly what the caller knows: the kind.',
			'// RETURNING then reads back what the engine filled in — id from',
			'// SERIAL, state and tries from defaults — in the same statement.',
			'// (created is deliberately NOT returned: it is a clock value, and',
			'// pinning it in a test would be flaky by construction.)',
			'func EnqueueSQL() string {',
			'	return `INSERT INTO jobs (kind) VALUES (\'email\')',
			'		RETURNING id, kind, state, tries`',
			'}',
			'',
			'// nextval evaluates inside the VALUES row, so the draw and the',
			'// insert are one statement — the ticket number can never be',
			'// claimed by a crashed process that drew but failed to insert',
			'// in a separate step. One sequence, many tables: this is the case',
			'// SERIAL\'s per-column hidden sequence cannot cover.',
			'func OpenTicketSQL() string {',
			'	return `INSERT INTO tickets (no, subject)',
			'		VALUES (nextval(\'ticket_no\'), \'printer on fire\')',
			'		RETURNING no, subject`',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>How the engine makes a counter fast AND crash-safe</h3>' +
			'<p>A naive durable counter would fsync every draw. bytdb (like ' +
			'Postgres) instead allocates sequence values in <em>blocks</em>: the ' +
			'durable record says “values up to N are potentially used”, and ' +
			'draws inside the block are cheap in-memory increments. Crash and ' +
			'restart, and the engine resumes from the durable high-water mark — ' +
			'skipping any unused remainder of the block. That is why real ' +
			'sequences are <em>gapless-ish</em>, never gapless: crashes, rolled-' +
			'back transactions (a draw inside a rolled-back block is <em>not</em> ' +
			'returned — otherwise two concurrent transactions could mint the ' +
			'same number), and block allocation all leave holes. Systems that ' +
			'truly need gapless numbering (invoice law in some jurisdictions) ' +
			'must serialize on a counter row and pay the throughput; everything ' +
			'else should use sequences and let the gaps go.</p>' +
			'<h3>nextval is non-transactional on purpose</h3>' +
			'<p>Notice what <code>currval</code> tracks: your <em>session\'s</em> ' +
			'last draw, not the transaction\'s. Sequence state advances outside ' +
			'transactional undo — a ROLLBACK returns rows, never numbers. The ' +
			'alternative (transactional counters) would make every draw a write ' +
			'conflict between all concurrent inserters, serializing exactly the ' +
			'workload sequences exist to parallelize. This is the standard ' +
			'trade, and knowing it changes how you read data: an id gap in a ' +
			'table is evidence of a rollback or crash, not of deleted rows.</p>' +
			'<h3>DEFAULT lives in the catalog, applied by the SQL layer</h3>' +
			'<p>In bytdb\'s split, the column\'s DEFAULT is stored on the table ' +
			'descriptor as literal text — you can see it in ' +
			'<code>information_schema.columns</code> — and the SQL layer renders ' +
			'it into any INSERT that omits the column; the engine layer beneath ' +
			'always receives complete rows. Constants are coerced against the ' +
			'column type at CREATE time (a mistyped <code>DEFAULT \'ten\'</code> ' +
			'on an INT column fails the DDL, not the eventual insert), and the ' +
			'clock functions are restricted to timestamp/date columns. The ' +
			'design guideline the jobs table demonstrates: put ' +
			'<em>invariants</em> in defaults (initial state, zero counters, ' +
			'creation time) so every writer — today\'s handler, next year\'s ' +
			'backfill script — produces uniform rows; keep <em>decisions</em> ' +
			'(the kind) explicit in the INSERT.</p>',
		],
		complexity: { time: 'O(1) per draw — an atomic in-memory increment against a durable high-water mark; O(1) per defaulted column at insert', space: 'O(1) per sequence — a name and a counter in the catalog' },
	});
})();
