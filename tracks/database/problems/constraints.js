/* Constraints — Integrity & Change (Medium). The learner writes ONE function
 * returning a CREATE TABLE statement whose constraints (NOT NULL, UNIQUE,
 * CHECK, DEFAULT, SERIAL pk) do the guarding the application layer cannot be
 * trusted to do alone. The harness installs the DDL, then attacks it: a valid
 * insert must succeed with the DEFAULT filled in, and four different bad rows
 * must each bounce off the RIGHT constraint — the cases classify the engine's
 * error wording (probed live) to report exactly which constraint fired.
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// Three writers, one wall. The point of the diagram: the constraint layer
	// sits below EVERY path to the rows — including the paths that skip the
	// app. Marker ids namespaced (dgArrowDBCN*) — all tracks share the page.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="three writers — the API, a backfill script, and a human with psql — all pass through the same schema constraints before reaching the rows; bad rows bounce back as errors">' +
		'<text x="20" y="24" class="lbl">every write path crosses the same wall — including the ones that skip your app</text>' +
		// the three writers
		'<rect x="20" y="44" width="150" height="36" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="95" y="67" text-anchor="middle">Go API (validates)</text>' +
		'<rect x="20" y="94" width="150" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<text x="95" y="117" text-anchor="middle">backfill script</text>' +
		'<rect x="20" y="144" width="150" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<text x="95" y="167" text-anchor="middle">psql, 3am, human</text>' +
		// arrows into the wall
		'<path d="M 174 62 L 246 96" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBCN)"/>' +
		'<path d="M 174 112 L 246 112" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBCN)"/>' +
		'<path d="M 174 162 L 246 128" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBCN)"/>' +
		// the wall: schema constraints
		'<rect x="250" y="58" width="150" height="108" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="325" y="80" text-anchor="middle">schema constraints</text>' +
		'<text x="325" y="102" text-anchor="middle" class="lbl">NOT NULL &#183; UNIQUE</text>' +
		'<text x="325" y="120" text-anchor="middle" class="lbl">CHECK &#183; DEFAULT</text>' +
		'<text x="325" y="138" text-anchor="middle" class="lbl">enforced on every row,</text>' +
		'<text x="325" y="154" text-anchor="middle" class="lbl">whoever wrote it</text>' +
		// good rows through, bad rows bounced
		'<path d="M 404 96 L 466 96" fill="none" stroke="var(--ok)" stroke-width="1.8" marker-end="url(#dgArrowDBCNok)"/>' +
		'<rect x="470" y="76" width="72" height="40" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.8"/>' +
		'<text x="506" y="101" text-anchor="middle">rows</text>' +
		'<path d="M 404 140 C 448 140 448 182 300 182 L 240 182" fill="none" stroke="var(--err-edge)" stroke-width="1.6" marker-end="url(#dgArrowDBCNerr)"/>' +
		'<text x="330" y="204" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">violates check constraint "inventory_qty_check" &#8594; error back to the writer</text>' +
		'<defs>' +
		'<marker id="dgArrowDBCN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowDBCNok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowDBCNerr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'constraints',
		title: 'Constraints: Push Integrity into the Schema',
		nav: 'constraints',
		difficulty: 'Medium',
		category: 'Integrity & Change',
		task: 'Write CreateInventoryTable() returning a CREATE TABLE whose NOT NULL / UNIQUE / CHECK / DEFAULT constraints reject every bad row the harness throws at it — with the right constraint firing each time.',

		prose: [
			'<h2>Push integrity into the schema</h2>' +
			'<p>The oversell incident starts like they all do: a warehouse dashboard ' +
			'shows <code>qty = -3</code> for a SKU, and three teams swear their code ' +
			'validates quantities. They are all telling the truth. The negative row ' +
			'came from a backfill script written for a migration two quarters ago — ' +
			'it talks to the database directly, so the Go API&rsquo;s careful ' +
			'<code>if qty &lt; 0</code> never saw it. Application-layer validation ' +
			'guards <em>one door</em>; the schema guards the room:</p>' +
			'<ul>' +
			'<li><strong><code>NOT NULL</code></strong> — the column must have a ' +
			'value in every row, from every writer, forever. Violations say ' +
			'<code>null value in column "name" ... violates not-null constraint</code>.</li>' +
			'<li><strong><code>UNIQUE</code></strong> — no two rows may share a ' +
			'value, enforced by an index the engine maintains. Subtlety: ' +
			'<code>NULL</code> never equals <code>NULL</code>, so a UNIQUE column ' +
			'happily holds <em>many</em> NULLs — uniqueness among the values that ' +
			'exist. If absence must also be forbidden, that is <code>NOT NULL</code>&rsquo;s ' +
			'job, stacked on top.</li>' +
			'<li><strong><code>CHECK (expr)</code></strong> — an arbitrary predicate ' +
			'every row must satisfy. Same subtlety, other direction: a CHECK passes ' +
			'when the expression is true <em>or unknown</em> (three-valued logic), so ' +
			'<code>CHECK (qty &gt;= 0)</code> lets a NULL qty through.</li>' +
			'<li><strong><code>DEFAULT</code></strong> — the value the engine fills ' +
			'in when an INSERT omits the column. Belt-and-suspenders with NOT NULL: ' +
			'the default satisfies the constraint even for lazy writers.</li>' +
			'<li><strong>Constraint names matter.</strong> Declare a CHECK inline on ' +
			'its column and the engine auto-names it ' +
			'<code>&lt;table&gt;_&lt;column&gt;_check</code> — so the error in your ' +
			'production logs (<code>violates check constraint ' +
			'"inventory_qty_check"</code>) names the guilty column at a glance. ' +
			'That name is an API: monitoring greps for it.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Write <code>CreateInventoryTable()</code> returning one ' +
			'<code>CREATE TABLE inventory (...)</code> statement meeting this spec — ' +
			'declare each CHECK <em>inline on its column</em> so the auto-generated ' +
			'names identify the column:</p>',
			{ lang: 'txt', code: 'column   type     rules\nid       SERIAL   primary key\nname     TEXT     required             -> NOT NULL\nsku      TEXT     unique when present  -> UNIQUE (NULL still allowed)\nqty      INT      never negative       -> CHECK (qty >= 0), inline\nstatus   TEXT     defaults to \'in-stock\' when omitted\nprice    FLOAT    strictly positive    -> CHECK (price > 0), inline' },
			'<div class="tip">The harness does not read your DDL — it <em>runs</em> ' +
			'it, then attacks the table: a NULL name, a negative qty, a zero price, ' +
			'a duplicate sku. Each attack must bounce off the <strong>right</strong> ' +
			'constraint, and the legal edge cases (two NULL skus, a NULL qty) must ' +
			'get through. The schema is the spec, executable.</div>',
		],

		starter: [
			'package main',
			'',
			'// CreateInventoryTable returns the CREATE TABLE statement for the',
			'// inventory table. The harness executes it, then probes it with good',
			'// and bad rows — the constraints, not Go code, must do the rejecting.',
			'//',
			'// Spec:',
			'//   id      SERIAL  primary key',
			'//   name    TEXT    required (NOT NULL)',
			'//   sku     TEXT    unique when present (UNIQUE; NULL allowed)',
			'//   qty     INT     never negative — CHECK (qty >= 0), declared',
			'//                   INLINE on the column so the engine names it',
			'//                   inventory_qty_check',
			'//   status  TEXT    DEFAULT \'in-stock\' when omitted',
			'//   price   FLOAT   strictly positive — CHECK (price > 0), inline',
			'func CreateInventoryTable() string {',
			'	// This version stores everything and guards nothing — the shape a',
			'	// table has when "the app validates it". Push each rule from the',
			'	// spec into the column declarations.',
			'	return `CREATE TABLE inventory (',
			'		id SERIAL PRIMARY KEY,',
			'		name TEXT,',
			'		sku TEXT,',
			'		qty INT,',
			'		status TEXT,',
			'		price FLOAT',
			'	)`',
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
			'// classify maps an engine error onto WHICH constraint fired, using',
			'// wordings probed against the live engine. Cases compare these labels,',
			'// so a bad row bouncing off the WRONG constraint still fails the case.',
			'func classify(err error) string {',
			'	if err == nil {',
			'		return "row accepted"',
			'	}',
			'	msg := err.Error()',
			'	if strings.Contains(msg, "violates not-null constraint") {',
			'		// engine wording: null value in column "name" of relation ...',
			'		col := ""',
			'		if i := strings.Index(msg, "column \\""); i >= 0 {',
			'			rest := msg[i+8:]',
			'			if j := strings.Index(rest, "\\""); j >= 0 {',
			'				col = rest[:j]',
			'			}',
			'		}',
			'		return "rejected: not-null on column " + col',
			'	}',
			'	if strings.Contains(msg, "violates check constraint") {',
			'		// engine wording: ... violates check constraint "inventory_qty_check"',
			'		name := ""',
			'		if i := strings.Index(msg, "check constraint \\""); i >= 0 {',
			'			rest := msg[i+18:]',
			'			if j := strings.Index(rest, "\\""); j >= 0 {',
			'				name = rest[:j]',
			'			}',
			'		}',
			'		return "rejected: check constraint " + name',
			'	}',
			'	if strings.Contains(msg, "unique index violation") {',
			'		return "rejected: unique index violation"',
			'	}',
			'	return "unexpected error: " + msg',
			'}',
			'',
			'func main() {',
			'	db, cleanup := openDB("constraints")',
			'	defer cleanup()',
			'',
			'	ddl := CreateInventoryTable()',
			'',
			'	// exec runs an attack (or a legal edge case) and reports which',
			'	// constraint fired — or that the row got in.',
			'	exec := func(q string) string {',
			'		_, err := db.Exec(q)',
			'		return classify(err)',
			'	}',
			'	// ret runs a statement whose ROWS are the assertion (RETURNING or',
			'	// SELECT); an error here is itself a diagnosis, so it is surfaced.',
			'	ret := func(q string) string {',
			'		res, err := db.Exec(q)',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return rowsStr(res)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"the DDL installs: CREATE TABLE inventory runs",',
			'			"table created",',
			'			func() string {',
			'				if _, err := db.Exec(ddl); err != nil {',
			'					return "error: " + err.Error()',
			'				}',
			'				return "table created"',
			'			}},',
			'		{"valid insert: RETURNING shows the SERIAL id and the DEFAULT-filled status",',
			'			"[[1 anvil in-stock]]",',
			'			func() string {',
			'				return ret(`INSERT INTO inventory (name, sku, qty, price) VALUES (\'anvil\', \'SKU-100\', 12, 49.5) RETURNING id, name, status`)',
			'			}},',
			'		{"attack: NULL name — which constraint fires?",',
			'			"rejected: not-null on column name",',
			'			func() string {',
			'				return exec(`INSERT INTO inventory (name, sku, qty, price) VALUES (NULL, \'SKU-101\', 3, 5.0)`)',
			'			}},',
			'		{"attack: negative qty — the check must fire, and its name must say qty",',
			'			"rejected: check constraint inventory_qty_check",',
			'			func() string {',
			'				return exec(`INSERT INTO inventory (name, sku, qty, price) VALUES (\'anvil-negative\', \'SKU-102\', -4, 5.0)`)',
			'			}},',
			'		{"attack: zero price — strictly positive means 0 is out",',
			'			"rejected: check constraint inventory_price_check",',
			'			func() string {',
			'				return exec(`INSERT INTO inventory (name, sku, qty, price) VALUES (\'freebie\', \'SKU-103\', 1, 0.0)`)',
			'			}},',
			'		{"attack: duplicate sku — UNIQUE closes the door",',
			'			"rejected: unique index violation",',
			'			func() string {',
			'				return exec(`INSERT INTO inventory (name, sku, qty, price) VALUES (\'anvil-clone\', \'SKU-100\', 2, 9.0)`)',
			'			}},',
			'		{"legal edge: UNIQUE is not NOT NULL — two NULL skus coexist",',
			'			"row accepted / row accepted",',
			'			func() string {',
			'				a := exec(`INSERT INTO inventory (name, qty, price) VALUES (\'bolt\', 7, 1.5)`)',
			'				b := exec(`INSERT INTO inventory (name, qty, price) VALUES (\'washer\', 9, 2.5)`)',
			'				return a + " / " + b',
			'			}},',
			'		{"legal edge: CHECK passes a NULL qty — three-valued logic leaves absence to NOT NULL",',
			'			"row accepted",',
			'			func() string {',
			'				return exec(`INSERT INTO inventory (name, sku, price) VALUES (\'gasket\', \'SKU-104\', 3.5)`)',
			'			}},',
			'		{"after the storm: exactly the schema-approved rows survived",',
			'			"[[1 anvil SKU-100 12 in-stock 49.5] [2 bolt <nil> 7 in-stock 1.5] [3 washer <nil> 9 in-stock 2.5] [4 gasket SKU-104 <nil> in-stock 3.5]]",',
			'			func() string {',
			'				return ret(`SELECT id, name, sku, qty, status, price FROM inventory ORDER BY id`)',
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
			'// CreateInventoryTable pushes every rule from the spec into the schema,',
			'// where it binds ALL writers — the API, backfill scripts, and humans in',
			'// a SQL shell alike. App-layer validation still belongs in the API (it',
			'// gives friendlier errors, earlier), but the schema is the layer that',
			'// cannot be bypassed: the last writer to skip the app finds a wall,',
			'// not a corrupted table.',
			'func CreateInventoryTable() string {',
			'	// Design choices, column by column:',
			'	//',
			'	//   id     SERIAL PRIMARY KEY — the engine assigns 1, 2, 3...; PK',
			'	//          gives fast point lookups and forbids duplicates/NULL.',
			'	//   name   NOT NULL — a nameless inventory row is meaningless, so',
			'	//          absence is an error, not a state.',
			'	//   sku    UNIQUE but nullable — items awaiting SKU assignment are',
			'	//          a real state. NULL != NULL in SQL, so many NULL skus',
			'	//          coexist; UNIQUE only polices values that exist.',
			'	//   qty    CHECK (qty >= 0) declared INLINE so the engine names it',
			'	//          inventory_qty_check — production error logs then name',
			'	//          the guilty column with no archaeology. NULL qty passes:',
			'	//          a CHECK rejects only rows where the predicate is FALSE,',
			'	//          not UNKNOWN (three-valued logic).',
			'	//   status DEFAULT \'in-stock\' — writers that do not think about',
			'	//          status get the safe value, not NULL.',
			'	//   price  CHECK (price > 0), strict — a zero price is a pricing',
			'	//          bug we want loud, not a discount we want silent.',
			'	return `CREATE TABLE inventory (',
			'		id SERIAL PRIMARY KEY,',
			'		name TEXT NOT NULL,',
			'		sku TEXT UNIQUE,',
			'		qty INT CHECK (qty >= 0),',
			'		status TEXT DEFAULT \'in-stock\',',
			'		price FLOAT CHECK (price > 0)',
			'	)`',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why app-layer validation alone always eventually loses</h3>' +
			'<p>Not because your validation code is wrong — because it is not the ' +
			'only writer, and never stays the only writer:</p>' +
			'<ul>' +
			'<li><strong>Concurrent writers.</strong> "Check that the SKU is free, ' +
			'then insert it" is two statements with a gap in the middle; two ' +
			'requests can both pass the check and both insert. A UNIQUE constraint ' +
			'has no gap — the index probe and the write are one atomic step inside ' +
			'the engine. (The next item builds on exactly this.)</li>' +
			'<li><strong>The second service.</strong> A year in, a reporting job in ' +
			'Python or a teammate&rsquo;s microservice writes the same table. Your ' +
			'Go validation does not travel with the data; the constraint does.</li>' +
			'<li><strong>Manual fixes and backfills.</strong> Every production ' +
			'database eventually gets written by a human in a SQL shell at 3am and ' +
			'by one-off migration scripts. Those paths skip every <code>if</code> ' +
			'you ever wrote — and they are precisely the writes most likely to be ' +
			'wrong.</li>' +
			'</ul>' +
			'<p>The working posture: validate in the app for <em>good errors</em>, ' +
			'constrain in the schema for <em>truth</em>. When the two disagree, the ' +
			'schema wins — that is a feature.</p>' +
			'<h3>Constraint naming is operational, not cosmetic</h3>' +
			'<p>An inline column CHECK gets the auto-name ' +
			'<code>&lt;table&gt;_&lt;column&gt;_check</code> (a table-level ' +
			'<code>CHECK (...)</code> gets only <code>&lt;table&gt;_check</code> — ' +
			'anonymous about which rule broke). You can also name constraints ' +
			'yourself — <code>qty INT CONSTRAINT qty_nonneg CHECK (qty &gt;= 0)</code> ' +
			'works in this engine and in Postgres — and in production code you ' +
			'should: the name surfaces in every violation message, so error-handling ' +
			'code and log alerting key off it. A driver-level Postgres error even ' +
			'carries the constraint name as a structured field ' +
			'(<code>pgErr.ConstraintName</code>), letting an API map ' +
			'<code>orders_qty_check</code> to a 400 with a human message — the ' +
			'constraint becomes part of your API contract.</p>' +
			'<h3>What full Postgres adds on top</h3>' +
			'<ul>' +
			'<li><strong>Foreign keys with actions</strong> — ' +
			'<code>REFERENCES orders(id) ON DELETE CASCADE / RESTRICT / SET ' +
			'NULL</code>: referential integrity plus a declared policy for what ' +
			'happens to dependents. (bytdb parses FK syntax but enforcement is out ' +
			'of scope here.)</li>' +
			'<li><strong><code>EXCLUDE</code> constraints</strong> — UNIQUE ' +
			'generalized from "equal is forbidden" to any operator: ' +
			'<code>EXCLUDE USING gist (room WITH =, during WITH &amp;&amp;)</code> ' +
			'forbids <em>overlapping</em> bookings for the same room. Writing that ' +
			'check race-free in app code is genuinely hard; as a constraint it is ' +
			'one line.</li>' +
			'<li><strong>Online migration tools</strong> — <code>ALTER TABLE ... ' +
			'ADD CONSTRAINT ... NOT VALID</code> starts enforcing for new writes ' +
			'immediately, then <code>VALIDATE CONSTRAINT</code> checks the backlog ' +
			'without a long table lock; <code>DEFERRABLE</code> constraints wait ' +
			'until COMMIT so multi-row shuffles can be momentarily inconsistent ' +
			'inside a transaction.</li>' +
			'</ul>' +
			'<p>One war story for the road: the reason seasoned engineers reach for ' +
			'<code>CHECK (qty &gt;= 0)</code> is that every long-lived inventory, ' +
			'wallet, or credits table WITHOUT one eventually holds a negative ' +
			'number — via a race, a retry, or a fat-fingered UPDATE — and the ' +
			'cleanup costs a week. The constraint costs one line and turns that ' +
			'week into a single failed statement pointing at the bug.</p>',
		],
		complexity: { time: 'O(log n) per write — NOT NULL/CHECK/DEFAULT are row-local, UNIQUE adds one index probe', space: 'O(n) for the index backing UNIQUE' },
	});
})();
