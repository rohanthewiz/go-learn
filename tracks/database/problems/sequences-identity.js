/* Sequences — Transactions (Medium). CREATE SEQUENCE, nextval/currval/
 * lastval/setval, and the flagship experiment: what happens to an id drawn
 * inside a rolled-back INSERT? Probed live: bytdb REFUNDS it (the counter is
 * one more MVCC key, rewound by the same rollback that unwinds the row) —
 * the exact opposite of Postgres, which burns the value and leaves a gap.
 * Both behaviors are correct SQL, which is the real lesson: never assume
 * sequence values are gapless, and never mint invoice numbers from one.
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// The same three INSERTs on two engines: Postgres's counter lives
	// outside the transaction (id 2 burned, permanent hole); bytdb's counter
	// is versioned data (ROLLBACK rewinds it, id 2 reissued). Marker ids
	// namespaced (dgArrowDBSQ) — every track's SVGs share the page's id
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 620 252" width="620" height="252" role="img" aria-label="three inserts, the middle one rolled back: Postgres burns id 2 and keeps a gap; bytdb rewinds the counter and reissues 2">' +
		'<text x="20" y="20" class="lbl">the experiment: three INSERTs — the middle one rolled back. What id does the third get?</text>' +
		// event boxes
		'<rect x="20" y="32" width="150" height="40" rx="6" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="95" y="49" text-anchor="middle" class="lbl">INSERT keyboard</text>' +
		'<text x="95" y="65" text-anchor="middle" class="lbl">id 1 — committed</text>' +
		'<path d="M 175 52 L 213 52" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBSQ)"/>' +
		'<rect x="220" y="32" width="180" height="40" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="310" y="49" text-anchor="middle" class="lbl">BEGIN · INSERT gpu → id 2</text>' +
		'<text x="310" y="65" text-anchor="middle" class="lbl" style="fill:var(--warn)">ROLLBACK</text>' +
		'<path d="M 405 52 L 443 52" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBSQ)"/>' +
		'<rect x="450" y="32" width="150" height="40" rx="6" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="525" y="49" text-anchor="middle" class="lbl">INSERT mouse</text>' +
		'<text x="525" y="65" text-anchor="middle" class="lbl">id ?</text>' +
		// Postgres lane
		'<text x="20" y="106" class="lbl">Postgres — the counter lives OUTSIDE the transaction: the draw of 2 is never undone</text>' +
		'<rect x="20" y="116" width="44" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="42" y="136" text-anchor="middle">1</text>' +
		'<rect x="72" y="116" width="44" height="30" rx="4" fill="none" stroke="var(--err-edge)" stroke-width="2" stroke-dasharray="4 3"/>' +
		'<text x="94" y="136" text-anchor="middle" style="fill:var(--err-fg)">2</text>' +
		'<rect x="124" y="116" width="44" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="146" y="136" text-anchor="middle">3</text>' +
		'<text x="186" y="130" class="lbl">mouse gets id 3 —</text>' +
		'<text x="186" y="144" class="lbl" style="fill:var(--err-fg)">the table keeps a permanent hole at 2</text>' +
		// bytdb lane
		'<text x="20" y="184" class="lbl">bytdb — the counter is one more MVCC key: the same ROLLBACK that unwinds the row rewinds it</text>' +
		'<rect x="20" y="194" width="44" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="42" y="214" text-anchor="middle">1</text>' +
		'<rect x="72" y="194" width="44" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="94" y="214" text-anchor="middle">2</text>' +
		'<text x="134" y="208" class="lbl">mouse gets id 2 — no gap</text>' +
		'<text x="134" y="222" class="lbl">(a single-writer engine can afford refunds)</text>' +
		'<text x="20" y="246" class="lbl">both are correct SQL — which is why gapless invoice numbers can never come from a sequence</text>' +
		'<defs><marker id="dgArrowDBSQ" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'sequences-identity',
		title: 'Sequences: The Gap Nobody Expects',
		nav: 'sequences',
		difficulty: 'Medium',
		category: 'Transactions',
		task: 'Implement CreateOrderSeq, NextOrderNo, and DemonstrateGap: create a sequence, draw order numbers from it, and run the rollback experiment that reveals whether this engine burns or refunds ids.',

		prose: [
			'<h2>Sequences: The Gap Nobody Expects</h2>' +
			'<p>An auditor emails: <em>“Invoice INV-20417 is missing. Where did it ' +
			'go?”</em> Nobody deleted anything. The number came from a Postgres ' +
			'sequence, a deploy rolled a transaction back mid-checkout, and the id ' +
			'that transaction drew is simply <strong>gone</strong> — burned, never ' +
			'to be issued again. Sequences are the standard tool for “give every ' +
			'writer a unique, roughly-increasing number without coordination”, and ' +
			'their one famous surprise is that they ignore <code>ROLLBACK</code>. ' +
			'Famous — but engine-specific, as you are about to measure.</p>' +
			'<ul>' +
			'<li><strong><code>CREATE SEQUENCE name START n</code></strong> makes a ' +
			'standalone counter (<code>INCREMENT BY</code> works too). It is DDL: ' +
			'like all DDL here, it refuses to run inside a <code>BEGIN</code> ' +
			'block.</li>' +
			'<li><strong><code>nextval(\'name\')</code></strong> draws the next ' +
			'value — the first draw returns <code>START</code> itself. It composes ' +
			'in expressions: <code>SELECT \'ORD-\' || nextval(\'order_no\')</code> ' +
			'draws and formats in one statement.</li>' +
			'<li><strong><code>currval(\'name\')</code> / <code>lastval()</code></strong> ' +
			're-read the last value <em>this session</em> drew (lastval: from any ' +
			'sequence). They are session-local cursors, not the sequence\'s state — ' +
			'in a session that has not drawn yet, both are <em>errors</em>, not ' +
			'zero. (This is the classic connection-pool bug: <code>currval</code> ' +
			'on a pooled connection reads some <em>other</em> request\'s draw, or ' +
			'errors.)</li>' +
			'<li><strong><code>setval(\'name\', n)</code></strong> repositions the ' +
			'counter: the next draw returns <code>n+1</code> (a third argument ' +
			'<code>false</code> makes the next draw return <code>n</code> itself, ' +
			'exactly like Postgres).</li>' +
			'<li><strong><code>SERIAL</code></strong> columns draw from an internal ' +
			'per-table identity — there is no <code>orders_id_seq</code> object ' +
			'here to <code>nextval</code> from. Same burn-or-refund question, ' +
			'though: an id handed to a doomed INSERT is the flagship experiment ' +
			'below.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>Why would Postgres <em>choose</em> to leak numbers? Because a ' +
			'refund would serialize everybody: if the transaction holding 42 could ' +
			'still give it back, the transaction that drew 43 could not commit ' +
			'until 42\'s fate was known. Burning values keeps <code>nextval</code> ' +
			'a lock-free counter bump that never waits on anyone. bytdb sits at ' +
			'the other pole: its writable transactions already run one-at-a-time ' +
			'(the single-writer lock you met two items ago), so it can store the ' +
			'counter as ordinary versioned data and let <code>ROLLBACK</code> ' +
			'rewind it for free. Run the experiment and observe — don\'t guess.</p>',
			{ lang: 'txt', code: 'the same experiment              Postgres      bytdb\nINSERT ... RETURNING id     ->   1             1\nBEGIN\n  INSERT ... RETURNING id   ->   2             2\nROLLBACK\nINSERT ... RETURNING id     ->   3  (gap!)     2  (refunded)' },
			'<h3>Your job</h3>' +
			'<p>Three functions against a live engine (the harness pre-creates ' +
			'<code>orders (id SERIAL PRIMARY KEY, item TEXT)</code>): ' +
			'<code>CreateOrderSeq</code> makes the <code>order_no</code> sequence ' +
			'starting at 5000; <code>NextOrderNo</code> draws and formats ' +
			'<code>ORD-&lt;n&gt;</code> in one statement; and ' +
			'<code>DemonstrateGap</code> runs the three-INSERT experiment above ' +
			'and returns the ids it actually observed.</p>' +
			'<div class="tip"><code>BEGIN</code>/<code>ROLLBACK</code> refuse to ' +
			'run on the bare <code>db</code> handle (it autocommits) — take a ' +
			'session with <code>db.NewSession()</code> for the middle step. And ' +
			'remember DDL cannot run inside the transaction block.</div>',
		],

		starter: [
			'package main',
			'',
			'import (',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// The auditor\'s question — "where did ORD-20417 go?" — comes down to',
			'// three small functions. The harness gives you a live engine with',
			'// orders (id SERIAL PRIMARY KEY, item TEXT) already created.',
			'',
			'// CreateOrderSeq creates the standalone sequence order_no starting at',
			'// 5000 (order numbers must stay clear of legacy ids below that).',
			'// Sequences are DDL — they cannot be created inside a BEGIN block.',
			'func CreateOrderSeq(db *sql.DB) error {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// NextOrderNo draws the next number and formats it as "ORD-<n>".',
			'// Draw and format in ONE statement — || concatenation composes with',
			'// nextval directly. Two round trips would open a race window between',
			'// the draw and whatever you do with it.',
			'func NextOrderNo(db *sql.DB) (string, error) {',
			'	// your code here',
			'	return "", nil',
			'}',
			'',
			'// DemonstrateGap runs the classic burned-id experiment and returns the',
			'// three RETURNING ids it observes, in order:',
			'//',
			'//	INSERT \'keyboard\'                    -> id A   (autocommit)',
			'//	BEGIN; INSERT \'gpu\' -> id B; ROLLBACK          (the doomed draw)',
			'//	INSERT \'mouse\'                       -> id C   (autocommit)',
			'//',
			'// Capture each id with RETURNING id. BEGIN/ROLLBACK refuse the bare',
			'// db handle — use db.NewSession() for the middle step. On Postgres',
			'// this returns 1,2,3 and the table keeps a hole at 2. What does THIS',
			'// engine do? Return what you observe.',
			'func DemonstrateGap(db *sql.DB) []any {',
			'	// your code here',
			'	return nil',
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
			'func main() {',
			'	db, cleanup := openDB("sequences-identity")',
			'	defer cleanup()',
			'',
			'	// Harness-owned fixtures: orders is the experiment\'s table;',
			'	// audit_no backs the currval/lastval cases so their semantics hold',
			'	// even while the learner\'s own sequence does not exist yet.',
			'	mustExec(db, `CREATE TABLE orders (id SERIAL PRIMARY KEY, item TEXT)`)',
			'	mustExec(db, `CREATE SEQUENCE audit_no START 42`)',
			'',
			'	// one runs a single-value query and renders the value (or the',
			'	// error) as a comparable string — sequence functions always return',
			'	// exactly one row, one column.',
			'	one := func(q string) string {',
			'		res, err := db.Exec(q)',
			'		if err != nil {',
			'			return "err: " + err.Error()',
			'		}',
			'		return fmt.Sprintf("%v", res.Rows[0][0])',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"CreateOrderSeq then a first draw: START is honored (first nextval returns 5000)",',
			'			"5000",',
			'			func() string {',
			'				if err := CreateOrderSeq(db); err != nil {',
			'					return "create: " + err.Error()',
			'				}',
			'				return one(`SELECT nextval(\'order_no\')`)',
			'			}},',
			'		{"consecutive draws are strictly monotonic",',
			'			"ORD-5001,ORD-5002",',
			'			func() string {',
			'				a, err := NextOrderNo(db)',
			'				if err != nil {',
			'					return "err: " + err.Error()',
			'				}',
			'				b, err := NextOrderNo(db)',
			'				if err != nil {',
			'					return "err: " + err.Error()',
			'				}',
			'				return a + "," + b',
			'			}},',
			'		{"setval(\'order_no\', 8999) redirects the stream: the next draw is n+1",',
			'			"ORD-9000",',
			'			func() string {',
			'				if _, err := db.Exec(`SELECT setval(\'order_no\', 8999)`); err != nil {',
			'					return "setval: " + err.Error()',
			'				}',
			'				c, err := NextOrderNo(db)',
			'				if err != nil {',
			'					return "err: " + err.Error()',
			'				}',
			'				return c',
			'			}},',
			'		{"the rollback experiment: bytdb REFUNDS the id (Postgres would burn it — 1,2,3 with a hole at 2)",',
			'			"ids [1 2 2] table [[1 keyboard] [2 mouse]]",',
			'			func() string {',
			'				ids := DemonstrateGap(db)',
			'				res, err := db.Exec(`SELECT id, item FROM orders ORDER BY id`)',
			'				if err != nil {',
			'					return "err: " + err.Error()',
			'				}',
			'				return fmt.Sprintf("ids %v table %v", ids, res.Rows)',
			'			}},',
			'		{"currval/lastval re-read this session\'s last draw: nextval, currval, nextval, lastval",',
			'			"42,42,43,43",',
			'			func() string {',
			'				parts := []string{',
			'					one(`SELECT nextval(\'audit_no\')`),',
			'					one(`SELECT currval(\'audit_no\')`),',
			'					one(`SELECT nextval(\'audit_no\')`),',
			'					one(`SELECT lastval()`),',
			'				}',
			'				return strings.Join(parts, ",")',
			'			}},',
			'		{"currval in a session that has never drawn is an ERROR, not zero",',
			'			`currval of sequence "audit_no" is not yet defined in this session`,',
			'			func() string {',
			'				fresh := db.NewSession()',
			'				_, err := fresh.Exec(`SELECT currval(\'audit_no\')`)',
			'				if err == nil {',
			'					return "no error"',
			'				}',
			'				return err.Error()',
			'			}},',
			'		{"CREATE SEQUENCE is DDL: refused inside a transaction block",',
			'			"CREATE SEQUENCE cannot run inside a transaction block",',
			'			func() string {',
			'				s := db.NewSession()',
			'				if _, err := s.Exec(`BEGIN`); err != nil {',
			'					return "begin: " + err.Error()',
			'				}',
			'				_, err := s.Exec(`CREATE SEQUENCE boom`)',
			'				s.Exec(`ROLLBACK`)',
			'				if err == nil {',
			'					return "no error"',
			'				}',
			'				return err.Error()',
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
			'import (',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// CreateOrderSeq makes the order-number counter. START 5000 is the',
			'// whole point of a standalone sequence over SERIAL: the stream is',
			'// ours to position (legacy ids live below 5000). DDL like this runs',
			'// on the bare handle — it would be refused inside a BEGIN block.',
			'func CreateOrderSeq(db *sql.DB) error {',
			'	_, err := db.Exec(`CREATE SEQUENCE order_no START 5000`)',
			'	return err',
			'}',
			'',
			'// NextOrderNo draws and formats in ONE statement. nextval composes',
			'// in expressions, so the draw and its presentation are atomic — no',
			'// window where the process could die holding a number it never used',
			'// (and no second round trip that another writer could interleave).',
			'func NextOrderNo(db *sql.DB) (string, error) {',
			'	res, err := db.Exec(`SELECT \'ORD-\' || nextval(\'order_no\')`)',
			'	if err != nil {',
			'		return "", err',
			'	}',
			'	// One row, one column, already a string thanks to ||.',
			'	return res.Rows[0][0].(string), nil',
			'}',
			'',
			'// DemonstrateGap measures — rather than assumes — what a rollback',
			'// does to a drawn id. Three inserts: committed, rolled back,',
			'// committed. The middle one runs in an explicit transaction on a',
			'// session (the bare db handle autocommits and refuses BEGIN).',
			'//',
			'//	Postgres: returns [1 2 3], table {1,3} — id 2 burned, gap forever.',
			'//	bytdb:    returns [1 2 2], table {1,2} — the counter is one more',
			'//	          MVCC key, so the SAME rollback that unwinds the row',
			'//	          rewinds it. Refunds are affordable here only because',
			'//	          writable transactions already serialize (single-writer',
			'//	          lock); Postgres burns values precisely to avoid that',
			'//	          serialization.',
			'func DemonstrateGap(db *sql.DB) []any {',
			'	ids := []any{}',
			'',
			'	r1, err := db.Exec(`INSERT INTO orders (item) VALUES (\'keyboard\') RETURNING id`)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	ids = append(ids, r1.Rows[0][0])',
			'',
			'	// The doomed draw. RETURNING hands us the id BEFORE the rollback',
			'	// decides its fate — exactly the window where real systems leak',
			'	// invoice numbers into emails and logs.',
			'	s := db.NewSession()',
			'	if _, err = s.Exec(`BEGIN`); err != nil {',
			'		panic(err)',
			'	}',
			'	r2, err := s.Exec(`INSERT INTO orders (item) VALUES (\'gpu\') RETURNING id`)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	ids = append(ids, r2.Rows[0][0])',
			'	if _, err = s.Exec(`ROLLBACK`); err != nil {',
			'		panic(err)',
			'	}',
			'',
			'	r3, err := db.Exec(`INSERT INTO orders (item) VALUES (\'mouse\') RETURNING id`)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	ids = append(ids, r3.Rows[0][0])',
			'	return ids',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why Postgres refuses to roll sequences back</h3>' +
			'<p><code>nextval</code> in Postgres is engineered to never wait: it ' +
			'takes a lightweight latch on the sequence, bumps the counter, and ' +
			'releases — it does not enroll in your transaction at all. Imagine the ' +
			'alternative: if <code>ROLLBACK</code> could refund 42, then the writer ' +
			'who drew 43 could not durably commit until 42\'s transaction decided ' +
			'its fate, and the one who drew 44 would wait on both. A refundable ' +
			'counter is a serialization point across <em>every writer of the ' +
			'table</em> — so Postgres burns values instead, and gaps are the ' +
			'receipt. bytdb sits at the other pole of the same trade: its writable ' +
			'transactions already run one at a time under the single-writer lock, ' +
			'so it stores the counter as ordinary versioned data and MVCC rollback ' +
			'rewinds it for free. Neither engine is wrong; the experiment you ' +
			'implemented is how you find out which contract you are holding.</p>' +
			'<h3>Three more ways to lose a number</h3>' +
			'<p>Rollback is only the most visible leak. <code>CACHE n</code> lets ' +
			'each Postgres backend grab a block of values in one latch trip — and ' +
			'the unused remainder evaporates when the connection exits. Crash ' +
			'recovery burns too: Postgres WAL-logs sequences 32 draws ahead, so a ' +
			'crash can jump the stream forward by up to 32 even if <em>nothing</em> ' +
			'rolled back. CockroachDB goes further and tells you not to use ' +
			'sequences at all where you can avoid them: a single counter is a ' +
			'one-key hotspot in a distributed store, so its default ' +
			'<code>unique_rowid()</code> trades density for locality — unique and ' +
			'roughly time-ordered, nowhere near consecutive. The portable contract ' +
			'of a sequence is exactly this and no more: <strong>unique, ' +
			'monotonically drawn, gaps allowed</strong>.</p>' +
			'<h3>What to do when the auditor is right</h3>' +
			'<p>Some numbers legally must be gapless — invoice numbers in much of ' +
			'the world. That requirement is serialization in disguise, so pay for ' +
			'it explicitly and only where the law demands: a counter ' +
			'<em>table</em>, bumped in the same transaction as the document it ' +
			'numbers —</p>' +
			'<p><code>UPDATE counters SET n = n + 1 WHERE name = \'invoice\' ' +
			'RETURNING n</code> — then insert the invoice with that <code>n</code> ' +
			'and commit both together. Now a rollback rewinds the counter with the ' +
			'invoice (the row lock makes concurrent invoicers queue — that queue ' +
			'<em>is</em> the price of gaplessness, which is why you never route ' +
			'high-volume ids through it). Keep the sequence for the primary key; ' +
			'keep the ledger number in the ledger\'s transaction.</p>' +
			'<h3>One more field note</h3>' +
			'<p><code>currval</code>/<code>lastval</code> being session-local is a ' +
			'connection-pool trap: behind a transaction-pooling pgbouncer, the ' +
			'connection that runs your <code>currval</code> may not be the one ' +
			'that ran your <code>nextval</code> — you read someone else\'s draw, ' +
			'or error. <code>INSERT ... RETURNING id</code> avoids the second ' +
			'round trip entirely, which is why it is the idiom everywhere in this ' +
			'track.</p>',
		],
		complexity: { time: 'O(1) per draw — nextval is a counter bump, never a scan', space: 'O(1)' },
	});
})();
