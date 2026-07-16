/* Joins — SQL: Foundations (Medium). INNER vs LEFT JOIN on a customers/
 * orders schema with the three traps every practitioner eventually hits:
 * the customer who vanishes from an INNER JOIN report, count(*) counting
 * the NULL-padded row a LEFT JOIN manufactures, and the WHERE clause that
 * silently demotes a LEFT JOIN back to an INNER one (the fix: per-order
 * filters belong in ON). The harness seeds adversarial data — a customer
 * with no orders, a customer whose only order is from the wrong year, and
 * a NULL region — and compares exact row sets from learner-written SQL.
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// A join as it actually executes: the ON predicate draws match lines
	// between rows. INNER keeps one output row per line; LEFT additionally
	// keeps line-less left rows, padding the right side with NULL. Marker
	// id namespaced (dgArrowDBJN) — all tracks share the page's id space.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 262" width="560" height="262" role="img" aria-label="join matching: lines pair customer rows with order rows; Di has no line, so INNER JOIN drops Di while LEFT JOIN keeps Di padded with NULL">' +
		'<text x="20" y="22" class="lbl">a join is a MATCH: the ON predicate draws lines between rows</text>' +
		// left table: customers
		'<text x="100" y="46" text-anchor="middle" class="lbl">customers</text>' +
		'<rect x="40" y="54" width="120" height="24" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="100" y="71" text-anchor="middle">Ada · west</text>' +
		'<rect x="40" y="84" width="120" height="24" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="100" y="101" text-anchor="middle">Bo · east</text>' +
		'<rect x="40" y="114" width="120" height="24" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="100" y="131" text-anchor="middle">Cy · NULL</text>' +
		'<rect x="40" y="144" width="120" height="24" rx="4" fill="none" stroke="var(--warn)" stroke-dasharray="5 3"/>' +
		'<text x="100" y="161" text-anchor="middle">Di · west</text>' +
		'<text x="100" y="186" text-anchor="middle" class="lbl" style="fill:var(--warn)">no matching order row</text>' +
		// right table: orders
		'<text x="460" y="46" text-anchor="middle" class="lbl">orders</text>' +
		'<rect x="400" y="54" width="120" height="24" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="460" y="71" text-anchor="middle">101 · $120</text>' +
		'<rect x="400" y="84" width="120" height="24" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="460" y="101" text-anchor="middle">102 · $80</text>' +
		'<rect x="400" y="114" width="120" height="24" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="460" y="131" text-anchor="middle">103 · $200</text>' +
		'<rect x="400" y="144" width="120" height="24" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="460" y="161" text-anchor="middle">104 · $50</text>' +
		'<rect x="400" y="174" width="120" height="24" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="460" y="191" text-anchor="middle">105 · $75</text>' +
		// match lines: ON o.customer_id = c.id
		'<line x1="160" y1="66" x2="396" y2="66" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDBJN)"/>' +
		'<line x1="160" y1="66" x2="396" y2="96" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDBJN)"/>' +
		'<line x1="160" y1="96" x2="396" y2="126" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDBJN)"/>' +
		'<line x1="160" y1="126" x2="396" y2="156" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDBJN)"/>' +
		'<line x1="160" y1="126" x2="396" y2="186" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDBJN)"/>' +
		// the verdicts
		'<text x="20" y="230" class="lbl">INNER JOIN: output = one row per line — Di never appears in the result at all</text>' +
		'<text x="20" y="250" class="lbl" style="fill:var(--ok)">LEFT JOIN: every customers row survives — Di comes out as [Di &lt;nil&gt;], the order columns padded with NULL</text>' +
		'<defs><marker id="dgArrowDBJN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'joins',
		title: 'Joins: INNER, LEFT, and the WHERE That Eats Them',
		nav: 'joins',
		difficulty: 'Medium',
		category: 'SQL: Foundations',
		task: 'Write four queries over customers/orders: an INNER JOIN listing, per-customer totals, a LEFT JOIN count that keeps zero-order customers (count(o.id), not count(*)), and a LEFT JOIN whose date filter lives in the ON clause.',

		prose: [
			'<h2>Joins: INNER, LEFT, and the WHERE that eats them</h2>' +
			'<p>Support asks a simple question: “which customers went quiet this ' +
			'year?” You pull up the revenue dashboard and realize it cannot answer ' +
			'— it is built on an <code>INNER JOIN</code>, so a customer with no ' +
			'orders isn’t shown as <em>zero</em>, they are not shown <em>at all</em>. ' +
			'A churned account is indistinguishable from an account that never ' +
			'existed. Every join bug in production is a variation on this: rows ' +
			'you expected that silently never materialized.</p>' +
			'<ul>' +
			'<li><strong>A join is a match.</strong> The <code>ON</code> predicate ' +
			'pairs rows from the two tables; each pair becomes one output row. ' +
			'<code>INNER JOIN</code> keeps <em>only</em> the pairs — a left row ' +
			'with no partner contributes nothing.</li>' +
			'<li><strong><code>LEFT JOIN</code> keeps every left row.</strong> A ' +
			'left row with no match still comes out once, with every right-table ' +
			'column set to <code>NULL</code> — a manufactured padding row.</li>' +
			'<li><strong>That padding row is still a row.</strong> ' +
			'<code>count(*)</code> counts it, reporting 1 “order” for a customer ' +
			'who has none. <code>count(o.id)</code> counts only non-NULL values ' +
			'— the padding contributes 0. This is the entire reason ' +
			'<code>count(<em>column</em>)</code> exists.</li>' +
			'<li><strong><code>WHERE</code> runs <em>after</em> the join.</strong> ' +
			'A <code>WHERE</code> condition on a right-table column is evaluated ' +
			'against the padding row’s NULLs, and <code>NULL &gt;= \'2024-01-01\'</code> ' +
			'is not true — so the padded rows are filtered out and your LEFT JOIN ' +
			'silently behaves like an INNER one. Conditions that restrict ' +
			'<em>which rows may match</em> belong in the <code>ON</code> clause; ' +
			'<code>WHERE</code> is for filtering the joined result.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>The harness has created and seeded this schema (note the ' +
			'adversarial rows: Di has no orders, Bo’s only order is from 2023, ' +
			'and Cy’s region is NULL):</p>',
			{ lang: 'sql', code: 'CREATE TABLE customers (id INT PRIMARY KEY, name TEXT NOT NULL, region TEXT);\nCREATE TABLE orders (id INT PRIMARY KEY, customer_id INT NOT NULL,\n                     amount INT NOT NULL, placed DATE NOT NULL);\n\nINSERT INTO customers (id, name, region) VALUES\n  (1,\'Ada\',\'west\'), (2,\'Bo\',\'east\'), (3,\'Cy\',NULL), (4,\'Di\',\'west\');\nINSERT INTO orders (id, customer_id, amount, placed) VALUES\n  (101,1,120,\'2024-03-14\'), (102,1,80,\'2024-07-01\'),\n  (103,2,200,\'2023-11-05\'),\n  (104,3,50,\'2024-01-20\'),  (105,3,75,\'2023-06-30\');' },
			'<h3>Your job</h3>' +
			'<p>Each function returns one SQL string; the harness executes it and ' +
			'compares the exact row set, so use exactly the columns and ' +
			'<code>ORDER BY</code> each function asks for.</p>' +
			'<ul>' +
			'<li><code>OrderLines</code> — every order with its customer: ' +
			'<code>c.name, c.region, o.id, o.amount</code>, INNER JOIN, ' +
			'<code>ORDER BY o.id</code>.</li>' +
			'<li><code>TotalPerCustomer</code> — <code>c.name, sum(o.amount)</code> ' +
			'for customers who have orders, <code>ORDER BY c.name</code>.</li>' +
			'<li><code>OrderCountAllCustomers</code> — <code>c.name</code> and ' +
			'order count for <em>all</em> customers, zero-order customers ' +
			'included as 0, <code>ORDER BY c.name</code>.</li>' +
			'<li><code>Customers2024Orders</code> — all customers and their 2024 ' +
			'orders (if any): <code>c.name, o.id</code>, customers with no 2024 ' +
			'order still appearing with a NULL id, ' +
			'<code>ORDER BY c.name, o.id</code>.</li>' +
			'</ul>' +
			'<div class="tip">Two of the starters are pre-filled with drafts that ' +
			'look right. Run them and study <em>which rows go missing</em> in the ' +
			'got-vs-want diff before fixing anything — the diff is the lesson.</div>',
		],

		starter: [
			'package main',
			'',
			'// The harness has already created and seeded these tables:',
			'//',
			'//   customers(id INT PK, name TEXT NOT NULL, region TEXT)   -- region nullable',
			'//   orders(id INT PK, customer_id INT NOT NULL,',
			'//          amount INT NOT NULL, placed DATE NOT NULL)',
			'//',
			'// Each function returns ONE SQL string. The harness runs it and',
			'// compares the exact rows — including order — so every query must',
			'// end with the ORDER BY its doc comment specifies. Date literals',
			'// are plain strings here: placed >= \'2024-01-01\'.',
			'',
			'// OrderLines lists every order with its customer: columns',
			'// c.name, c.region, o.id, o.amount — INNER JOIN, ORDER BY o.id.',
			'// (Cy\'s NULL region should surface as-is: NULL data joins fine;',
			'// it is missing MATCHES, not missing values, that drop rows.)',
			'func OrderLines() string {',
			'	// your code here',
			'	return ``',
			'}',
			'',
			'// TotalPerCustomer reports c.name, sum(o.amount) per customer that',
			'// has orders — INNER JOIN + GROUP BY, ORDER BY c.name. Note who is',
			'// absent from the result, and why.',
			'func TotalPerCustomer() string {',
			'	// your code here',
			'	return ``',
			'}',
			'',
			'// OrderCountAllCustomers reports c.name and how many orders each',
			'// customer has — ALL customers, zero-order ones included as 0.',
			'// ORDER BY c.name. The draft below returns 1 for a customer with',
			'// no orders. Run it, find the phantom order, fix the count.',
			'func OrderCountAllCustomers() string {',
			'	return `SELECT c.name, count(*)',
			'FROM customers c',
			'LEFT JOIN orders o ON o.customer_id = c.id',
			'GROUP BY c.name',
			'ORDER BY c.name`',
			'}',
			'',
			'// Customers2024Orders lists ALL customers and their 2024 orders',
			'// (if any): columns c.name, o.id — a customer with no 2024 order',
			'// must still appear, with o.id NULL. ORDER BY c.name, o.id.',
			'// The draft below looks correct. Which customers vanish, and why?',
			'func Customers2024Orders() string {',
			'	return `SELECT c.name, o.id',
			'FROM customers c',
			'LEFT JOIN orders o ON o.customer_id = c.id',
			'WHERE o.placed >= \'2024-01-01\' AND o.placed < \'2025-01-01\'',
			'ORDER BY c.name, o.id`',
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
			'	db, cleanup := openDB("joins")',
			'	defer cleanup()',
			'',
			'	// Small but adversarial seed data — each quirk backs one trap:',
			'	//   Di (id 4) has NO orders   -> invisible to INNER; count(*) trap',
			'	//   Bo\'s only order is 2023   -> the ON-vs-WHERE date-filter trap',
			'	//   Cy\'s region is NULL       -> NULL data still joins fine',
			'	mustExec(db, `CREATE TABLE customers (id INT PRIMARY KEY, name TEXT NOT NULL, region TEXT)`)',
			'	mustExec(db, `CREATE TABLE orders (id INT PRIMARY KEY, customer_id INT NOT NULL, amount INT NOT NULL, placed DATE NOT NULL)`)',
			'	mustExec(db, `INSERT INTO customers (id, name, region) VALUES',
			'		(1,\'Ada\',\'west\'), (2,\'Bo\',\'east\'), (3,\'Cy\',NULL), (4,\'Di\',\'west\')`)',
			'	mustExec(db, `INSERT INTO orders (id, customer_id, amount, placed) VALUES',
			'		(101,1,120,\'2024-03-14\'), (102,1,80,\'2024-07-01\'),',
			'		(103,2,200,\'2023-11-05\'),',
			'		(104,3,50,\'2024-01-20\'), (105,3,75,\'2023-06-30\')`)',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		q    func() string',
			'	}',
			'	// want strings are pinned from the reference solution\'s actual',
			'	// row sets (fmt %v of [][]any; NULL prints <nil>). Comparing',
			'	// rendered rows, not SQL text, keeps any equivalent query valid.',
			'	cases := []tc{',
			'		{"INNER JOIN order lines: five orders, and Cy\'s NULL region rides along",',
			'			"[[Ada west 101 120] [Ada west 102 80] [Bo east 103 200] [Cy <nil> 104 50] [Cy <nil> 105 75]]",',
			'			OrderLines},',
			'		{"INNER JOIN totals: only customers in the intersection — Di is absent",',
			'			"[[Ada 200] [Bo 200] [Cy 125]]",',
			'			TotalPerCustomer},',
			'		{"LEFT JOIN counts: Di must be 0 — count the order ids, not the rows",',
			'			"[[Ada 2] [Bo 1] [Cy 2] [Di 0]]",',
			'			OrderCountAllCustomers},',
			'		{"ALL customers + 2024 orders: Bo and Di appear with NULL — filter in ON, not WHERE",',
			'			"[[Ada 101] [Ada 102] [Bo <nil>] [Cy 104] [Di <nil>]]",',
			'			Customers2024Orders},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			res, err := db.Exec(c.q())',
			'			if err != nil {',
			'				r["pass"] = false',
			'				r["got"] = "SQL error: " + err.Error()',
			'				return',
			'			}',
			'			got := rowsStr(res)',
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
			'// OrderLines: INNER JOIN is the honest choice HERE because the',
			'// question is about orders — an order always has a customer, so',
			'// nothing can be lost. The join direction of the ON predicate',
			'// (o.customer_id = c.id) reads naturally as "attach each order to',
			'// its customer". Cy\'s NULL region flows through untouched: joins',
			'// drop rows for missing MATCHES, never for NULL data columns.',
			'func OrderLines() string {',
			'	return `SELECT c.name, c.region, o.id, o.amount',
			'FROM customers c',
			'INNER JOIN orders o ON o.customer_id = c.id',
			'ORDER BY o.id`',
			'}',
			'',
			'// TotalPerCustomer: the same INNER JOIN becomes a trap the moment',
			'// the question changes from "orders" to "customers" — Di has no',
			'// match, so Di is not summed as 0, Di is GONE. That silent absence',
			'// is the reason the next two queries switch to LEFT JOIN.',
			'func TotalPerCustomer() string {',
			'	return `SELECT c.name, sum(o.amount)',
			'FROM customers c',
			'INNER JOIN orders o ON o.customer_id = c.id',
			'GROUP BY c.name',
			'ORDER BY c.name`',
			'}',
			'',
			'// OrderCountAllCustomers: LEFT JOIN keeps Di, but as a padding row',
			'// whose order columns are all NULL — and count(*) would count that',
			'// row, reporting a phantom order. count(o.id) counts only non-NULL',
			'// ids, so the padding contributes 0. Counting a NEVER-NULL column',
			'// of the outer side (its PK) is the idiomatic "count real matches".',
			'func OrderCountAllCustomers() string {',
			'	return `SELECT c.name, count(o.id)',
			'FROM customers c',
			'LEFT JOIN orders o ON o.customer_id = c.id',
			'GROUP BY c.name',
			'ORDER BY c.name`',
			'}',
			'',
			'// Customers2024Orders: the date filter lives in ON, not WHERE.',
			'// ON decides WHICH ORDERS MAY MATCH (non-2024 orders simply fail',
			'// to pair, as if they did not exist), so unmatched customers still',
			'// get their padding row. A WHERE would run AFTER the join, compare',
			'// NULL >= \'2024-01-01\' on the padding rows — not true — and throw',
			'// exactly the customers this query exists to keep.',
			'func Customers2024Orders() string {',
			'	return `SELECT c.name, o.id',
			'FROM customers c',
			'LEFT JOIN orders o ON o.customer_id = c.id',
			'	AND o.placed >= \'2024-01-01\' AND o.placed < \'2025-01-01\'',
			'ORDER BY c.name, o.id`',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The report that hid the churn</h3>' +
			'<p>An INNER JOIN computes the <em>intersection of matches</em>: Di ' +
			'never appears in <code>TotalPerCustomer</code>, and no amount of ' +
			'staring at the three rows that <em>did</em> come back will reveal ' +
			'that a fourth is missing. This failure mode is vicious precisely ' +
			'because it produces plausible output — dashboards built on INNER ' +
			'JOINs systematically overstate averages and hide churn, and nobody ' +
			'files a bug about a row they cannot see. The rule of thumb: the ' +
			'moment the question is “for every X, …” — every customer, every ' +
			'day, every SKU — the X table must be the left side of a LEFT JOIN.</p>' +
			'<h3>count(*) vs count(o.id)</h3>' +
			'<p>The LEFT JOIN keeps Di by manufacturing a padding row with every ' +
			'order column NULL. That row is a real row to the aggregator:</p>',
			{ lang: 'txt', code: 'count(*)    -> [[Ada 2] [Bo 1] [Cy 2] [Di 1]]   -- phantom order for Di\ncount(o.id) -> [[Ada 2] [Bo 1] [Cy 2] [Di 0]]   -- padding counted as 0' },
			'<p><code>count(*)</code> counts rows; <code>count(col)</code> counts ' +
			'non-NULL values of <code>col</code>. After an outer join the two ' +
			'diverge by design — count the outer side’s primary key (never NULL ' +
			'in a real match, always NULL in padding) to count actual matches. ' +
			'The same trick generalizes: <code>sum</code>, <code>avg</code>, ' +
			'<code>min</code>, <code>max</code> all ignore NULLs, so only the ' +
			'<code>count(*)</code>-style “how many rows” aggregates need care.</p>' +
			'<h3>The WHERE that ate your LEFT JOIN</h3>' +
			'<p>The pre-filled draft of <code>Customers2024Orders</code> produces:</p>',
			{ lang: 'txt', code: 'WHERE version -> [[Ada 101] [Ada 102] [Cy 104]]                       -- Bo and Di silently gone\nON version    -> [[Ada 101] [Ada 102] [Bo <nil>] [Cy 104] [Di <nil>]]  -- everyone present' },
			'<p>Mechanically: the LEFT JOIN dutifully emits ' +
			'<code>[Bo, NULL, NULL, …]</code> and <code>[Di, NULL, NULL, …]</code>, ' +
			'then the WHERE evaluates <code>NULL &gt;= \'2024-01-01\'</code> — ' +
			'which is <em>unknown</em>, not true — and discards both. The outer ' +
			'join has been demoted to an inner join by a filter that runs one ' +
			'stage too late. Query optimizers know this equivalence formally: ' +
			'Postgres detects “null-rejecting” WHERE predicates on the nullable ' +
			'side and <em>rewrites the outer join to an inner join</em> as an ' +
			'optimization — the planner is legally exploiting your bug. The fix ' +
			'is placement: a condition restricting <em>which rows may match</em> ' +
			'belongs in <code>ON</code>; a condition on the <em>surviving joined ' +
			'rows</em> belongs in <code>WHERE</code>. For INNER joins the two ' +
			'placements are equivalent and the distinction is invisible — which ' +
			'is exactly why the habit formed on inner joins burns people on ' +
			'outer ones.</p>' +
			'<div class="tip">One idiom deliberately inverts this rule: the ' +
			'<strong>anti-join</strong>. “Customers with <em>no</em> orders” is ' +
			'<code>LEFT JOIN orders o … WHERE o.id IS NULL</code> — a WHERE on ' +
			'the right side that keeps <em>only</em> the padding rows. There the ' +
			'filter hunts the NULLs instead of rejecting them.</div>' +
			'<h3>In other engines</h3>' +
			'<p><code>RIGHT JOIN</code> is a LEFT JOIN with the operands flipped ' +
			'(most style guides ban it; bytdb doesn’t implement it), and ' +
			'<code>FULL OUTER JOIN</code> pads both sides. Under the hood a ' +
			'planner picks among nested-loop, hash, and merge strategies: a hash ' +
			'join builds a hash table on the smaller input and probes it with the ' +
			'larger — which is why joining on an indexed or hashable equality ' +
			'predicate is fast, while an ON like <code>a.x &lt; b.y</code> forces ' +
			'the O(n×m) nested loop. The semantics you just learned are identical ' +
			'in Postgres, MySQL, SQLite, and CockroachDB — INNER-vs-LEFT and ' +
			'ON-vs-WHERE are portable knowledge.</p>',
		],
		complexity: { time: 'O(n×m) worst-case nested loop; O(n+m) with a hash join — the plan, not the SQL, decides', space: 'O(min(n,m)) for a hash join’s build side' },
	});
})();
