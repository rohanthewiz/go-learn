/* Open, Exec, Query: First Contact — Getting Started (Easy). bytdb.Open →
 * sql.New → db.Exec: the whole lifecycle of an embedded database in three
 * calls. The learner writes the DDL/DML/SELECT strings and then reads the
 * *sql.Result by hand (Rows, Cols, Types, RowsAffected) — every case runs
 * against a real engine writing a real file, so the pinned row sets are the
 * engine's actual answers, not a simulation.
 */
(function () {
	'use strict';
	var T = GoLearnBY;

	// Embedded vs client-server: the point of the whole track in one frame.
	// Marker ids namespaced (dgArrowBY01) because every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="embedded database: the engine is a package inside your Go process writing one file; client-server puts a network and a second process between your code and the data">' +
		'<text x="20" y="22" class="lbl">embedded: the database is a function call away</text>' +
		'<rect x="20" y="34" width="240" height="120" rx="8" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="140" y="54" text-anchor="middle">your Go binary</text>' +
		'<rect x="36" y="66" width="100" height="36" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="86" y="88" text-anchor="middle" class="lbl">app code</text>' +
		'<rect x="150" y="66" width="94" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="197" y="88" text-anchor="middle" class="lbl">bytdb engine</text>' +
		'<path d="M 136 84 L 146 84" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowBY01)"/>' +
		'<text x="140" y="128" text-anchor="middle" class="lbl">db.Exec(...) — an in-process call</text>' +
		'<path d="M 140 154 L 140 172" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBY01)"/>' +
		'<rect x="80" y="176" width="120" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="140" y="193" text-anchor="middle" class="lbl">store.db — one file</text>' +
		'<line x1="290" y1="30" x2="290" y2="200" stroke="var(--edge)" stroke-width="1" stroke-dasharray="4 4"/>' +
		'<text x="310" y="22" class="lbl">client-server: two processes and a wire</text>' +
		'<rect x="310" y="44" width="90" height="36" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="355" y="66" text-anchor="middle" class="lbl">your app</text>' +
		'<path d="M 400 62 L 444 62" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowBY01w)"/>' +
		'<text x="422" y="52" text-anchor="middle" class="lbl" style="fill:var(--warn)">TCP</text>' +
		'<rect x="448" y="44" width="92" height="36" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="494" y="66" text-anchor="middle" class="lbl">db server</text>' +
		'<text x="425" y="112" text-anchor="middle" class="lbl">connection pools, auth, a daemon</text>' +
		'<text x="425" y="130" text-anchor="middle" class="lbl">to install, patch, and babysit —</text>' +
		'<text x="425" y="148" text-anchor="middle" class="lbl">the right trade for shared data,</text>' +
		'<text x="425" y="166" text-anchor="middle" class="lbl" style="fill:var(--warn)">pure overhead for one process</text>' +
		'<defs>' +
		'<marker id="dgArrowBY01" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowBY01w" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'open-exec-query',
		title: 'Open, Exec, Query: First Contact',
		nav: 'open exec query',
		difficulty: 'Easy',
		category: 'Getting Started',
		task: 'Write the CREATE TABLE / INSERT / SELECT statements for a links store and read the *sql.Result by hand — row count from Rows, a title by index — against a live embedded engine.',

		prose: [
			'<h2>Open, Exec, Query: First Contact</h2>' +
			'<p>A little internal tool keeps its bookmarks in a JSON file. It was ' +
			'fine at 30 entries; now two goroutines truncate-and-rewrite the file ' +
			'and occasionally eat it, every “query” is a hand-rolled loop, and ' +
			'“add a visits counter” means migrating a struct by hand. The classic ' +
			'fix is a database server — but this tool is one binary on one ' +
			'machine, and nobody wants to run a daemon for a bookmark list. The ' +
			'embedded answer: compile the database <em>into the program</em>. ' +
			'bytdb is a relational engine (ordered key space, WAL, a real SQL ' +
			'planner) that lives in your process and writes one file:</p>',
			{ lang: 'go', code: 'eng, err := bytdb.Open("store.db") // the engine: WAL + catalog, one file\nif err != nil { /* corrupt file, bad permissions... */ }\ndefer eng.Close()\n\ndb := sql.New(eng)                 // the SQL layer over that engine\nres, err := db.Exec("SELECT title FROM links ORDER BY id")' },
			'<p>Three things to internalize before writing anything:</p>' +
			'<ul>' +
			'<li><strong>Two layers, on purpose.</strong> <code>bytdb.Open</code> ' +
			'returns an <code>*Engine</code> — tables, rows, indexes, ' +
			'transactions, no SQL. <code>sql.New(eng)</code> wraps it with a ' +
			'parser and planner. The last item of this track drops back down to ' +
			'the engine layer; everything until then speaks SQL through ' +
			'<code>db.Exec</code>.</li>' +
			'<li><strong>One method for everything.</strong> There is no ' +
			'<code>Query</code>/<code>Exec</code> split as in ' +
			'<code>database/sql</code>: every statement — DDL, writes, reads — ' +
			'goes through <code>db.Exec</code> and comes back as a ' +
			'<code>*sql.Result</code>.</li>' +
			'<li><strong>The Result tells you what kind of statement ran.</strong> ' +
			'A SELECT fills <code>Cols</code> (column names), <code>Types</code> ' +
			'(their SQL types) and <code>Rows</code> (<code>[][]any</code> — each ' +
			'cell is <code>int64</code>, <code>string</code>, <code>float64</code>, ' +
			'<code>bool</code>, or <code>nil</code>). INSERT, UPDATE and DELETE ' +
			'fill <code>RowsAffected</code>. DDL fills nothing — success is a ' +
			'nil error.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the five functions on the right: three return SQL ' +
			'strings (the schema, the seed rows, the list query — exact tables, ' +
			'columns, and values are pinned in the comments), and two read a ' +
			'<code>*sql.Result</code> in Go — the row count, and a title by row ' +
			'index. The harness runs your strings against a live engine and ' +
			'compares the real row sets.</p>' +
			'<div class="tip">The harness checks your schema by <em>using</em> it: ' +
			'it inserts rows without <code>id</code> or <code>visits</code> and ' +
			'expects <code>SERIAL</code> to number them and the <code>DEFAULT</code> ' +
			'to fill the counter. A schema that merely “has the columns” fails ' +
			'those probes.</div>',
		],

		starter: [
			'package main',
			'',
			'import (',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// SetupSQL returns ONE CREATE TABLE statement for the links store:',
			'//',
			'//   table: links',
			'//     id     SERIAL PRIMARY KEY     -- numbers itself 1, 2, 3...',
			'//     url    TEXT, required',
			'//     title  TEXT, required',
			'//     visits INT, required, DEFAULT 0',
			'func SetupSQL() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// SeedSQL returns ONE multi-row INSERT adding, in this order:',
			'//',
			'//   url                                      title',
			'//   https://go.dev/blog                      Go blog',
			'//   https://pkg.go.dev                       pkg.go.dev',
			'//   https://github.com/rohanthewiz/bytdb     bytdb',
			'//',
			'// Do not supply id or visits — the schema fills both.',
			'func SeedSQL() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// ListSQL returns a SELECT of exactly (id, title), ordered by id.',
			'//   want rows: [[1 Go blog] [2 pkg.go.dev] [3 bytdb]]',
			'func ListSQL() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// RowCount reports how many rows a Result carries. For a SELECT,',
			'// res.Rows is the whole answer, already in memory ([][]any).',
			'func RowCount(res *sql.Result) int {',
			'	// your code here',
			'	return -1',
			'}',
			'',
			'// TitleAt returns the title cell of row i from a ListSQL result.',
			'// Cells are `any`; title was selected as the SECOND column, and',
			'// TEXT columns come back as Go strings (type-assert it).',
			'func TitleAt(res *sql.Result, i int) string {',
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
			'	db, cleanup := openDB("by-open-exec-query")',
			'	defer cleanup()',
			'',
			'	// Every statement under test is the learner\'s, so nothing here',
			'	// uses mustExec: a bad string must fail its own case (error text',
			'	// in "got") while the rest still run.',
			'	exec := func(r map[string]any, q string) *sql.Result {',
			'		res, err := db.Exec(q)',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "exec error: " + err.Error()',
			'			return nil',
			'		}',
			'		return res',
			'	}',
			'',
			'	results := make([]map[string]any, 0, 6)',
			'	newCase := func(name, want string) map[string]any {',
			'		r := map[string]any{"input": name, "want": want}',
			'		results = append(results, r)',
			'		return r',
			'	}',
			'',
			'	// Case 1: the schema exists and is empty. COUNT(*) doubles as a',
			'	// probe that the table (and its name) really landed in the catalog.',
			'	r := newCase("SetupSQL: CREATE TABLE links, then COUNT(*) over it", "[[0]]")',
			'	runCase(r, func() {',
			'		if exec(r, SetupSQL()) == nil {',
			'			return',
			'		}',
			'		res, err := db.Exec("SELECT COUNT(*) FROM links")',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "probe error: " + err.Error()',
			'			return',
			'		}',
			'		r["pass"] = rowsStr(res) == "[[0]]"',
			'		r["got"] = rowsStr(res)',
			'	})',
			'',
			'	// Case 2: the seed INSERT reports its work through RowsAffected —',
			'	// the write-statement half of the Result contract.',
			'	r = newCase("SeedSQL: one INSERT, RowsAffected == 3", "3")',
			'	runCase(r, func() {',
			'		res := exec(r, SeedSQL())',
			'		if res == nil {',
			'			return',
			'		}',
			'		got := fmt.Sprintf("%d", res.RowsAffected)',
			'		r["pass"] = got == "3"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 3: SERIAL numbered the rows 1..3 and DEFAULT filled visits',
			'	// with 0 — the schema is exercised, not just eyeballed.',
			'	r = newCase("schema probe: id came from SERIAL, visits from DEFAULT", "[[1 Go blog 0]]")',
			'	runCase(r, func() {',
			'		res, err := db.Exec("SELECT id, title, visits FROM links WHERE id = 1")',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "probe error: " + err.Error()',
			'			return',
			'		}',
			'		r["pass"] = rowsStr(res) == "[[1 Go blog 0]]"',
			'		r["got"] = rowsStr(res)',
			'	})',
			'',
			'	// Case 4: the list query — exact columns, total order.',
			'	r = newCase("ListSQL row set", "[[1 Go blog] [2 pkg.go.dev] [3 bytdb]]")',
			'	runCase(r, func() {',
			'		res := exec(r, ListSQL())',
			'		if res == nil {',
			'			return',
			'		}',
			'		r["pass"] = rowsStr(res) == "[[1 Go blog] [2 pkg.go.dev] [3 bytdb]]"',
			'		r["got"] = rowsStr(res)',
			'	})',
			'',
			'	// Case 5: a SELECT Result also names and types its columns — the',
			'	// metadata a generic printer (or an ORM) would drive from.',
			'	r = newCase("Result metadata: Cols and Types of ListSQL", "cols=[id title] types=[int string]")',
			'	runCase(r, func() {',
			'		res := exec(r, ListSQL())',
			'		if res == nil {',
			'			return',
			'		}',
			'		got := fmt.Sprintf("cols=%v types=%v", res.Cols, res.Types)',
			'		r["pass"] = got == "cols=[id title] types=[int string]"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 6: reading the Result from Go — length and a typed cell.',
			'	r = newCase("RowCount and TitleAt over the list result", "3 rows, TitleAt(2) = bytdb")',
			'	runCase(r, func() {',
			'		res := exec(r, ListSQL())',
			'		if res == nil {',
			'			return',
			'		}',
			'		got := fmt.Sprintf("%d rows, TitleAt(2) = %s", RowCount(res), TitleAt(res, 2))',
			'		r["pass"] = got == "3 rows, TitleAt(2) = bytdb"',
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
			'// SetupSQL: the schema is the contract. SERIAL asks the engine to',
			'// number rows from its own sequence (no read-max-then-insert race,',
			'// even from many goroutines), and the DEFAULT means callers state',
			'// only what they know — the engine completes the row.',
			'func SetupSQL() string {',
			'	return `CREATE TABLE links (',
			'		id     SERIAL PRIMARY KEY,',
			'		url    TEXT NOT NULL,',
			'		title  TEXT NOT NULL,',
			'		visits INT NOT NULL DEFAULT 0',
			'	)`',
			'}',
			'',
			'// SeedSQL: one statement, three rows. A multi-row INSERT is one',
			'// atomic write — all three land or none do — which is the first',
			'// thing the truncate-and-rewrite JSON file could never promise.',
			'func SeedSQL() string {',
			'	return `INSERT INTO links (url, title) VALUES',
			'		(\'https://go.dev/blog\', \'Go blog\'),',
			'		(\'https://pkg.go.dev\', \'pkg.go.dev\'),',
			'		(\'https://github.com/rohanthewiz/bytdb\', \'bytdb\')`',
			'}',
			'',
			'// ListSQL: exact columns and a total order. ORDER BY id makes the',
			'// answer deterministic — storage order is an implementation detail,',
			'// never a promise.',
			'func ListSQL() string {',
			'	return `SELECT id, title FROM links ORDER BY id`',
			'}',
			'',
			'// RowCount: a SELECT\'s whole answer is already materialized in',
			'// res.Rows, so counting is len(). No cursor, no Next() loop — an',
			'// embedded engine can hand the slice straight across; the trade is',
			'// that a million-row SELECT means a million-row slice, so bound big',
			'// reads with WHERE and LIMIT.',
			'func RowCount(res *sql.Result) int {',
			'	return len(res.Rows)',
			'}',
			'',
			'// TitleAt: cells are `any` because a row mixes types. The dynamic',
			'// types are fixed by column type — int64 for INT/SERIAL, string for',
			'// TEXT, float64 for FLOAT, bool for BOOL, nil for NULL — so a type',
			'// assertion against the schema is safe. Index 1 because ListSQL',
			'// selected (id, title): Result columns are in SELECT-list order.',
			'func TitleAt(res *sql.Result, i int) string {',
			'	title, _ := res.Rows[i][1].(string)',
			'	return title',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What Open actually does</h3>' +
			'<p><code>bytdb.Open("store.db")</code> is not a connection — there is ' +
			'nothing to connect to. It opens (or creates) the file, replays the ' +
			'write-ahead log so a crash mid-write leaves you at the last committed ' +
			'statement, and loads the catalog — every table descriptor your DDL ' +
			'ever created. From then on the engine lives in your address space: ' +
			'<code>db.Exec</code> is a function call that parses, plans, and reads ' +
			'or writes the ordered key space directly. No socket, no wire ' +
			'protocol, no serialization tax, no per-query network round trip — ' +
			'a lookup that touches ten rows costs ten key-space reads, not ten ' +
			'wire hops. The price: exactly one process may own the file, and by ' +
			'default one writer at a time inside that process (readers run on ' +
			'snapshots and never block; the transactions item revisits this).</p>' +
			'<h3>Why one Exec instead of Query/Exec</h3>' +
			'<p><code>database/sql</code> splits reads from writes because a ' +
			'server-backed driver must stream reads through a cursor while writes ' +
			'return a summary. Embedded, the asymmetry disappears: every statement ' +
			'can afford to return one uniform <code>*Result</code>, filled ' +
			'according to what ran — <code>Rows</code>/<code>Cols</code>/' +
			'<code>Types</code> for SELECT, <code>RowsAffected</code> for writes, ' +
			'nothing for DDL. That uniformity is what let the harness treat your ' +
			'three very different statements identically, and it is why the next ' +
			'item can teach RETURNING as “a write that fills the SELECT fields ' +
			'too”.</p>' +
			'<h3>When to reach for an embedded engine</h3>' +
			'<p>The decision is about <em>ownership of the data</em>, not size. ' +
			'One process owns it — a CLI\'s state, a service\'s local queue or ' +
			'cache, an agent\'s memory, per-device storage at the edge — and ' +
			'embedding removes a deployment dependency while keeping real SQL, ' +
			'real transactions, real indexes. Many processes share it — anything ' +
			'with two replicas — and you want the server after all, because a ' +
			'network protocol is precisely the technology for sharing. The classic ' +
			'proof that the embedded niche is enormous is SQLite (the most ' +
			'deployed database on earth); bytdb\'s twist is being pure Go — ' +
			'compiled into your binary like any package, no cgo — which is also ' +
			'literally how it is running inside this page.</p>' +
			'<div class="tip">Production habit from day one: treat the error from ' +
			'<code>Open</code> as a real path (corrupt file, wrong permissions, a ' +
			'second process holding the file) and <code>defer eng.Close()</code> ' +
			'immediately — Close flushes and releases the file cleanly, and the ' +
			'defer survives every early return you add later.</div>',
		],
		complexity: { time: 'O(n) per statement here — CREATE and INSERT are constant-size catalog/row writes; the SELECT scans n rows', space: 'O(rows returned) — a Result materializes its whole answer' },
	});
})();
