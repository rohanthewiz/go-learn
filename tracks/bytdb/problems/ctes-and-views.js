/* CTEs & Views — SQL Surface (Medium). WITH as a named, single-statement
 * pipeline stage; CREATE VIEW as the same idea made durable in the catalog;
 * a derived table as the anonymous inline form. The harness proves the two
 * properties that distinguish them live: a view reflects base-table writes
 * made after its creation, and it survives closing and reopening the
 * database file — it is a catalog object, not a result cache.
 */
(function () {
	'use strict';
	var T = GoLearnBY;

	// The same query text, three lifetimes. Marker ids namespaced
	// dgArrowBY05*.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 226" width="560" height="226" role="img" aria-label="the same SELECT can be a derived table (inline, anonymous), a CTE (named for one statement), or a view (named in the catalog, persisted to the file, expanded on every use)">' +
		'<text x="20" y="22" class="lbl">one SELECT, three lifetimes</text>' +
		'<rect x="20" y="36" width="160" height="52" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="100" y="56" text-anchor="middle" class="lbl">derived table</text>' +
		'<text x="100" y="72" text-anchor="middle" class="lbl">FROM (SELECT ...) t</text>' +
		'<rect x="200" y="36" width="160" height="52" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="280" y="56" text-anchor="middle" class="lbl">CTE</text>' +
		'<text x="280" y="72" text-anchor="middle" class="lbl">WITH t AS (SELECT ...)</text>' +
		'<rect x="380" y="36" width="160" height="52" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="460" y="56" text-anchor="middle" class="lbl">view</text>' +
		'<text x="460" y="72" text-anchor="middle" class="lbl">CREATE VIEW t AS SELECT ...</text>' +
		'<text x="100" y="112" text-anchor="middle" class="lbl">lives: one FROM clause</text>' +
		'<text x="280" y="112" text-anchor="middle" class="lbl">lives: one statement</text>' +
		'<text x="460" y="112" text-anchor="middle" class="lbl">lives: in the catalog, on disk</text>' +
		'<path d="M 460 122 L 460 144" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBY05)"/>' +
		'<rect x="368" y="148" width="184" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="460" y="167" text-anchor="middle" class="lbl">catalog: stored QUERY TEXT, no rows</text>' +
		'<text x="20" y="204" class="lbl" style="fill:var(--warn)">a view stores the question, never the answer: every SELECT against it re-runs the query,</text>' +
		'<text x="20" y="220" class="lbl" style="fill:var(--warn)">so it always reflects the base tables — and it is still there after Close and re-Open</text>' +
		'<defs>' +
		'<marker id="dgArrowBY05" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'ctes-and-views',
		title: 'CTEs & Views',
		nav: 'ctes and views',
		difficulty: 'Medium',
		category: 'SQL Surface',
		task: 'Restructure a reporting query as a WITH pipeline, persist its reusable core as a view, and write the derived-table form — the harness checks the view tracks later writes and survives a full close-and-reopen of the database file.',

		prose: [
			'<h2>CTEs &amp; Views: naming your queries</h2>' +
			'<p>The revenue report in your order service is one 14-line SELECT ' +
			'with a subquery nested in a subquery, and this week\'s bug — refunds ' +
			'counted into regional totals — took an hour to even <em>find</em> in ' +
			'it. Meanwhile three other endpoints have each pasted their own copy ' +
			'of the “paid orders only” filter, and one of them is subtly ' +
			'different. SQL has two tools for exactly this, and they are the same ' +
			'tool at two lifetimes:</p>' +
			'<ul>' +
			'<li><strong><code>WITH name AS (...)</code> — a CTE — names a step ' +
			'for one statement.</strong> The main query reads ' +
			'<code>FROM name</code> as if it were a table; you get pipeline ' +
			'structure — filter, then aggregate, then rank — instead of ' +
			'inside-out nesting. Multiple CTEs chain: a later one can read an ' +
			'earlier one.</li>' +
			'<li><strong><code>CREATE VIEW name AS ...</code> names a query in ' +
			'the catalog.</strong> The engine stores the <em>query text</em> as a ' +
			'schema object — durable in the database file, listed beside tables ' +
			'— and expands it wherever <code>FROM name</code> appears. No rows ' +
			'are stored: every read re-runs the definition, so a view can never ' +
			'be stale. One definition of “paid order”, used by every ' +
			'endpoint.</li>' +
			'<li><strong>A derived table — <code>FROM (SELECT ...) t</code> — is ' +
			'the anonymous inline form.</strong> Same semantics as a ' +
			'single-CTE query; it just reads inside-out. Fine for one quick ' +
			'aggregate; the moment there are two steps or a reader, name the ' +
			'steps.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>The harness seeds this table:</p>',
			{ lang: 'sql', code: "CREATE TABLE orders (\n  id       SERIAL PRIMARY KEY,\n  region   TEXT NOT NULL,\n  status   TEXT NOT NULL,   -- 'paid' or 'refunded'\n  amount   INT NOT NULL\n);\nINSERT INTO orders (region, status, amount) VALUES\n  ('emea', 'paid',     120),\n  ('emea', 'refunded',  80),   -- refunds must NOT count\n  ('apac', 'paid',      90),\n  ('emea', 'paid',      60),\n  ('apac', 'paid',      40),\n  ('amer', 'refunded', 500);   -- a region with NO paid orders" },
			'<h3>Your job</h3>' +
			'<p>Three query strings and one DDL string. The CTE report: paid ' +
			'revenue per region, biggest first. The view: <code>paid_orders</code>, ' +
			'the shared “paid only” core. A query over that view. And the ' +
			'derived-table form of the same report. The harness runs your view ' +
			'through the full durability gauntlet: create it, write more base ' +
			'rows <em>afterward</em>, read it again, then close the database file ' +
			'and reopen it cold — your view must still answer.</p>' +
			'<div class="tip">Note what <code>amer</code> does in the expected ' +
			'outputs: a region whose only order is refunded appears <em>nowhere</em>. ' +
			'The filter-then-aggregate pipeline drops its rows before GROUP BY ' +
			'ever sees them — which is precisely the structure the buggy ' +
			'14-liner got wrong.</div>',
		],

		starter: [
			'package main',
			'',
			'// Four functions, each returning ONE SQL string, run verbatim',
			'// against the orders table from the prose.',
			'',
			'// RevenueReportCTE: WITH a CTE named paid (the paid-only rows),',
			'// report region and SUM(amount) AS revenue per region, highest',
			'// revenue first, then region name as tiebreak.',
			'//   want: [[emea 180] [apac 130]]',
			'func RevenueReportCTE() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// CreateViewSQL: CREATE VIEW paid_orders AS the shared core —',
			'// id, region, amount of orders whose status is \'paid\'.',
			'func CreateViewSQL() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// TopPaidFromView: reading FROM paid_orders (the view!), the top 2',
			'// single orders: region and amount, largest amount first.',
			'//   want: [[emea 120] [apac 90]]',
			'func TopPaidFromView() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// RevenueReportDerived: the SAME report as RevenueReportCTE, but',
			'// with the paid-only step as an inline derived table in FROM',
			'// (no WITH, no view).',
			'//   want: [[emea 180] [apac 130]]',
			'func RevenueReportDerived() string {',
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
			'const seedOrders = `INSERT INTO orders (region, status, amount) VALUES',
			'	(\'emea\', \'paid\', 120),',
			'	(\'emea\', \'refunded\', 80),',
			'	(\'apac\', \'paid\', 90),',
			'	(\'emea\', \'paid\', 60),',
			'	(\'apac\', \'paid\', 40),',
			'	(\'amer\', \'refunded\', 500)`',
			'',
			'const createOrders = `CREATE TABLE orders (',
			'	id     SERIAL PRIMARY KEY,',
			'	region TEXT NOT NULL,',
			'	status TEXT NOT NULL,',
			'	amount INT NOT NULL',
			')`',
			'',
			'func main() {',
			'	db, cleanup := openDB("by-ctes-views")',
			'	defer cleanup()',
			'	mustExec(db, createOrders)',
			'	mustExec(db, seedOrders)',
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
			'	// Case 1: the CTE pipeline — refunds excluded, amer absent.',
			'	r := newCase("CTE report: paid revenue per region, desc", "[[emea 180] [apac 130]]")',
			'	runCase(r, func() { runSQL(r, RevenueReportCTE(), "[[emea 180] [apac 130]]") })',
			'',
			'	// Case 2: the view lands in the catalog as a real schema object,',
			'	// visible in pg_class with relkind \'v\' (v for view) — the same',
			'	// place tables live, because that is what it is.',
			'	r = newCase("CREATE VIEW paid_orders, then find it in pg_class", "[[paid_orders v]]")',
			'	runCase(r, func() {',
			'		if _, err := db.Exec(CreateViewSQL()); err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "create error: " + err.Error()',
			'			return',
			'		}',
			'		res, err := db.Exec("SELECT relname, relkind FROM pg_catalog.pg_class WHERE relkind = \'v\' ORDER BY relname")',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "catalog probe error: " + err.Error()',
			'			return',
			'		}',
			'		r["pass"] = rowsStr(res) == "[[paid_orders v]]"',
			'		r["got"] = rowsStr(res)',
			'	})',
			'',
			'	// Case 3: reading through the view.',
			'	r = newCase("top 2 paid orders FROM the view", "[[emea 120] [apac 90]]")',
			'	runCase(r, func() { runSQL(r, TopPaidFromView(), "[[emea 120] [apac 90]]") })',
			'',
			'	// Case 4: a view stores the question, not the answer. Insert a',
			'	// bigger paid order AFTER the view was created; the view must',
			'	// report it — no refresh step exists or is needed.',
			'	r = newCase("insert AFTER create: the view reflects it (no stored rows)", "[[amer 300] [emea 120]]")',
			'	runCase(r, func() {',
			'		mustExec(db, "INSERT INTO orders (region, status, amount) VALUES (\'amer\', \'paid\', 300)")',
			'		runSQL(r, TopPaidFromView(), "[[amer 300] [emea 120]]")',
			'	})',
			'',
			'	// Case 5: durability. A separate database file: create schema,',
			'	// seed, create the learner\'s view — then CLOSE the engine and',
			'	// reopen the same file cold. The view must still answer: its',
			'	// definition was persisted in the catalog like any table\'s.',
			'	r = newCase("view survives Close + re-Open of the database file", "reopened, view answers: [[emea 120] [apac 90]]")',
			'	runCase(r, func() {',
			'		path := os.TempDir() + "/golearn-bytdb-by-ctes-views-reopen.db"',
			'		os.Remove(path)',
			'		eng1, err := bytdb.Open(path)',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "open 1: " + err.Error()',
			'			return',
			'		}',
			'		db1 := sql.New(eng1)',
			'		mustExec(db1, createOrders)',
			'		mustExec(db1, seedOrders)',
			'		if _, err = db1.Exec(CreateViewSQL()); err != nil {',
			'			eng1.Close()',
			'			os.Remove(path)',
			'			r["pass"] = false',
			'			r["got"] = "create view: " + err.Error()',
			'			return',
			'		}',
			'		eng1.Close() // full shutdown: only the file survives',
			'		eng2, err := bytdb.Open(path) // cold start: catalog replayed from disk',
			'		if err != nil {',
			'			os.Remove(path)',
			'			r["pass"] = false',
			'			r["got"] = "reopen: " + err.Error()',
			'			return',
			'		}',
			'		db2 := sql.New(eng2)',
			'		res, err := db2.Exec(TopPaidFromView())',
			'		eng2.Close()',
			'		os.Remove(path)',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "query after reopen: " + err.Error()',
			'			return',
			'		}',
			'		got := "reopened, view answers: " + rowsStr(res)',
			'		r["pass"] = got == "reopened, view answers: [[emea 120] [apac 90]]"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 6: the derived-table form gives the same report (over the',
			'	// grown table: amer now has a paid order).',
			'	r = newCase("derived-table form of the report", "[[amer 300] [emea 180] [apac 130]]")',
			'	runCase(r, func() { runSQL(r, RevenueReportDerived(), "[[amer 300] [emea 180] [apac 130]]") })',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// The pipeline reads top-down: step 1 names the filtered rows,',
			'// step 2 aggregates them. Refund exclusion happens ONCE, in a',
			'// named place — the review comment writes itself, unlike the',
			'// nested-subquery version where the filter hid three parens deep.',
			'// amer vanishes here structurally: its rows never leave the CTE.',
			'func RevenueReportCTE() string {',
			'	return `WITH paid AS (',
			'		SELECT region, amount FROM orders WHERE status = \'paid\'',
			'	)',
			'	SELECT region, SUM(amount) AS revenue FROM paid',
			'	GROUP BY region',
			'	ORDER BY revenue DESC, region`',
			'}',
			'',
			'// The view persists the shared core. Note it selects COLUMNS, not',
			'// *: a view is an interface, and pinning its column list keeps',
			'// later ALTERs of the base table from silently changing every',
			'// consumer.',
			'func CreateViewSQL() string {',
			'	return `CREATE VIEW paid_orders AS',
			'		SELECT id, region, amount FROM orders WHERE status = \'paid\'`',
			'}',
			'',
			'// Consumers read the view like a table; the engine expands the',
			'// stored definition into this query at execution. Nothing about',
			'// refunds appears here — that policy lives in exactly one place.',
			'func TopPaidFromView() string {',
			'	return `SELECT region, amount FROM paid_orders',
			'		ORDER BY amount DESC, region',
			'		LIMIT 2`',
			'}',
			'',
			'// The derived table is the CTE turned inside-out: the same paid-',
			'// only step, but anonymous and inline. Semantically identical —',
			'// the planner treats both as a subquery in FROM — so choosing',
			'// between them is purely about readability and reuse.',
			'func RevenueReportDerived() string {',
			'	return `SELECT p.region, SUM(p.amount) AS revenue',
			'	FROM (SELECT region, amount FROM orders WHERE status = \'paid\') p',
			'	GROUP BY p.region',
			'	ORDER BY revenue DESC, p.region`',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What the engine stores for a view</h3>' +
			'<p>When <code>CREATE VIEW paid_orders AS ...</code> ran, bytdb wrote ' +
			'one small record into its catalog — the view\'s name and its query ' +
			'text — through the same durable write path a table descriptor uses. ' +
			'That is the entire object: no rows, no refresh state. At query time ' +
			'the name resolution layer checks virtual tables first (CTEs, then ' +
			'views, then real tables), parses the stored text, and materializes ' +
			'its result for the enclosing statement. Case 5 is the proof this is ' +
			'catalog, not cache: <code>Close()</code> discarded every in-memory ' +
			'structure, and the reopened engine rebuilt its catalog purely from ' +
			'the file — your view included, listed in <code>pg_class</code> with ' +
			'<code>relkind = \'v\'</code> beside the tables. And case 4 is the ' +
			'flip side of storing the question rather than the answer: the view ' +
			'saw the post-creation insert because it never had a copy to go ' +
			'stale.</p>' +
			'<h3>CTE scope, and why the engine treats all three alike</h3>' +
			'<p>A CTE is the same mechanism scoped to one statement: bytdb ' +
			'materializes each <code>WITH</code> arm and layers it over the ' +
			'catalog for the duration of that statement — which is why a CTE can ' +
			'shadow a table name, and why a later CTE can read an earlier one. ' +
			'Derived tables take the identical path anonymously. The uniformity ' +
			'is the design point: <code>FROM x</code> means “some row source ' +
			'named x”, and whether x is a base table, a view, or a CTE is decided ' +
			'by lookup order, not by different executors. (Postgres adds a ' +
			'planner wrinkle here — its CTEs were optimization fences for years, ' +
			'fixed by <code>MATERIALIZED</code> hints in v12. bytdb\'s ' +
			'materialize-then-scan behavior is the predictable version of the ' +
			'same trade.)</p>' +
			'<h3>Where each earns its keep</h3>' +
			'<p>Reach for a <strong>CTE</strong> whenever a query has two ' +
			'thinkable steps — filter/aggregate, dedupe/rank — or when you would ' +
			'otherwise repeat a subquery twice in one statement. Reach for a ' +
			'<strong>view</strong> when a definition must be shared across ' +
			'call sites: “active user”, “paid order”, “billable event” — the ' +
			'business definitions that drift when copy-pasted. Views also make a ' +
			'clean compatibility layer: rename a column in the base table, keep ' +
			'the old name alive in the view, migrate consumers at leisure. What ' +
			'neither does is store results: an expensive aggregation read a ' +
			'thousand times a minute wants a real table you refresh on a ' +
			'schedule (the materialized-view pattern, hand-rolled: ' +
			'<code>CREATE TABLE</code> + periodic <code>INSERT ... SELECT</code>), ' +
			'not a view that re-pays the aggregation on every read.</p>',
		],
		complexity: { time: 'O(n) per report — each form scans the base rows once, then aggregates; the view adds only a catalog lookup and parse', space: 'O(step rows) — a CTE/view materializes its intermediate result for the statement' },
	});
})();
