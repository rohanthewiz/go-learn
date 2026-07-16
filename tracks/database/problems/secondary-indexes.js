/* Secondary Indexes — Inside the Engine (Medium). The learner designs the
 * index set for a stated workload and the REAL planner grades it: the
 * harness applies the returned CREATE INDEX statements, then EXPLAINs the
 * workload queries and asserts the plans (Index Scan vs Seq Scan, composite
 * Index Cond coverage, order-serving scan with no Sort node, and Point Get
 * untouched — with a textual guard against a redundant index on the PK).
 *
 * Probed planner facts this item is built on: an order-only index is chosen
 * for ORDER BY hired DESC only under a LIMIT (Limit -> Index Scan using
 * <desc idx>); an ASC index serves it as "Index Scan Backward"; a dept-only
 * index leaves salary in Filter while (dept, salary) puts both in Index
 * Cond; WHERE id = N is "Point Get on employees" whether or not an index on
 * id exists (so redundancy is checked textually, not via EXPLAIN).
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// The two-hop anatomy of a secondary-index read. Marker ids namespaced
	// (dgArrowDBSI*) — every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 640 232" width="640" height="232" role="img" aria-label="a secondary index lookup is two hops: the query finds (email) to id in the index key space, then id to row in the primary key space">' +
		'<text x="20" y="24" class="lbl">one logical lookup, two key-space hops — both are just ordered-KV range reads</text>' +
		// the query
		'<rect x="20" y="60" width="150" height="52" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="95" y="82" text-anchor="middle">WHERE email=$1</text>' +
		'<text x="95" y="102" text-anchor="middle" class="lbl">the query</text>' +
		// the index key space
		'<rect x="240" y="48" width="170" height="96" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="325" y="68" text-anchor="middle" class="lbl">index: (email) &#8594; id</text>' +
		'<text x="256" y="92" style="font-family:monospace">(ada@&#8230;) &#8594; 1</text>' +
		'<text x="256" y="112" style="font-family:monospace">(grace@&#8230;) &#8594; 2</text>' +
		'<text x="256" y="132" style="font-family:monospace">(rob@&#8230;) &#8594; 3</text>' +
		// the primary key space
		'<rect x="470" y="48" width="150" height="96" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="545" y="68" text-anchor="middle" class="lbl">primary: id &#8594; row</text>' +
		'<text x="486" y="92" style="font-family:monospace">1 &#8594; {ada,&#8230;}</text>' +
		'<text x="486" y="112" style="font-family:monospace">2 &#8594; {grace,&#8230;}</text>' +
		'<text x="486" y="132" style="font-family:monospace">3 &#8594; {rob,&#8230;}</text>' +
		// hop arrows
		'<path d="M 174 86 L 234 86" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDBSI)"/>' +
		'<text x="204" y="76" text-anchor="middle" class="lbl" style="fill:var(--warn)">hop 1</text>' +
		'<path d="M 414 96 L 464 96" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDBSIok)"/>' +
		'<text x="439" y="86" text-anchor="middle" class="lbl" style="fill:var(--ok)">hop 2</text>' +
		'<text x="20" y="180" class="lbl">SELECT of columns the index already holds can skip hop 2 (a covering read);</text>' +
		'<text x="20" y="200" class="lbl">WHERE id = $1 needs neither hop nor index — the primary key IS the row&#8217;s storage key (Point Get)</text>' +
		'<defs>' +
		'<marker id="dgArrowDBSI" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowDBSIok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'secondary-indexes',
		title: 'Secondary Indexes, Judged by the Planner',
		nav: 'secondary indexes',
		difficulty: 'Medium',
		category: 'Inside the Engine',
		task: 'Return the CREATE INDEX statements for a stated workload; the harness applies them and EXPLAINs each query, asserting Index Scans where they matter, a composite Index Cond, an order-serving scan with no Sort — and that you did NOT index the primary key.',

		prose: [
			'<h2>Secondary Indexes, Judged by the Planner</h2>' +
			'<p>The people-directory dashboard is timing out. <code>EXPLAIN</code> ' +
			'on its queries says the same thing three times: ' +
			'<code>Seq Scan on employees</code> — every lookup reads every row. ' +
			'You own the fix, but the fix is not &#8220;index everything&#8221;: ' +
			'each index is a whole extra copy of its key columns that ' +
			'<strong>every</strong> <code>INSERT</code>, <code>UPDATE</code>, and ' +
			'<code>DELETE</code> must now also write. Index design is choosing ' +
			'which reads to accelerate at the price of every future write.</p>' +
			'<ul>' +
			'<li><strong>What an index physically is.</strong> In an ordered-KV ' +
			'engine like bytdb, a secondary index is just more keys: ' +
			'<code>(indexed columns&#8230;, pk) &#8594; pk</code>, sorted. A lookup ' +
			'is two hops — scan the index range to collect ids, then fetch each ' +
			'row by primary key (see the diagram).</li>' +
			'<li><strong>The leading-column rule.</strong> A composite index ' +
			'<code>(dept, salary)</code> is sorted by <code>dept</code> first, ' +
			'<code>salary</code> within each dept. <code>dept = $1 AND salary ' +
			'&gt; $2</code> is then ONE contiguous key range — both conditions ' +
			'land in the plan&#8217;s <code>Index Cond</code>. Flip the order to ' +
			'<code>(salary, dept)</code> and the equality can&#8217;t bound the ' +
			'scan: the planner ranges on salary and demotes ' +
			'<code>dept</code> to a post-scan <code>Filter</code>.</li>' +
			'<li><strong>Indexes serve order, not just predicates.</strong> ' +
			'<code>ORDER BY hired DESC LIMIT n</code> can be answered by reading ' +
			'an index on <code>hired</code> — no sort at all. bytdb supports ' +
			'<code>DESC</code> index columns and will read the index in whichever ' +
			'direction serves the query (an ASC index shows up as ' +
			'<code>Index Scan Backward</code>). One honest planner quirk, probed ' +
			'live: it only reaches for an order-only index when a ' +
			'<code>LIMIT</code> bounds the scan — reading a whole table through ' +
			'an index costs a hop per row, so an unbounded ORDER BY still ' +
			'prefers scan-then-sort.</li>' +
			'<li><strong>The primary key needs no help.</strong> ' +
			'<code>WHERE id = $1</code> plans as <code>Point Get</code>: the PK ' +
			'is the row&#8217;s actual storage key, so an index on <code>id</code> ' +
			'buys nothing and taxes every write forever. The planner won&#8217;t ' +
			'even look at it — which is exactly why nothing will ever tell you ' +
			'it&#8217;s useless.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>CreateIndexes() []string</code> returning the ' +
			'<code>CREATE INDEX</code> statements (at most <strong>three</strong> ' +
			'— write amplification is part of the grade) for this table and ' +
			'workload:</p>',
			{ lang: 'sql', code: 'CREATE TABLE employees (\n  id     SERIAL PRIMARY KEY,\n  email  TEXT NOT NULL,\n  dept   TEXT NOT NULL,\n  hired  DATE NOT NULL,\n  salary INT  NOT NULL\n);\n\n-- (a) point lookups:      WHERE email = $1\n-- (b) team pay review:    WHERE dept = $1 AND salary > $2\n-- (c) newest hires:       ORDER BY hired DESC LIMIT 3\n-- (d) profile page:       WHERE id = $1   -- already a Point Get: leave it alone' },
			'<div class="tip">The harness applies your statements to a live ' +
			'database, then runs <code>EXPLAIN</code> on each workload query and ' +
			'reads the plan. Index names are yours to choose — the assertions ' +
			'match <code>Index Scan using &lt;anything&gt; on employees</code>. ' +
			'Query (b) must put <em>both</em> conditions in ' +
			'<code>Index Cond</code>, so a single-column index won&#8217;t ' +
			'pass.</div>',
		],

		starter: [
			'package main',
			'',
			'// CreateIndexes returns the CREATE INDEX statements for the',
			'// employees workload. The harness applies them, then EXPLAINs:',
			'//',
			'//   (a) WHERE email = $1              -> must become an Index Scan',
			'//   (b) WHERE dept = $1 AND salary > $2',
			'//       -> ONE index serving both conditions in Index Cond',
			'//          (leading-column rule: which column goes first?)',
			'//   (c) ORDER BY hired DESC LIMIT 3   -> Index Scan, NO Sort node',
			'//       (bytdb supports DESC index columns)',
			'//   (d) WHERE id = $1                 -> already Point Get: do NOT',
			'//       index the primary key — a redundant index fails the grade',
			'//',
			'// Budget: at most three statements. Every index is a table you',
			'// never query directly but pay to maintain on every write.',
			'func CreateIndexes() []string {',
			'	// your code here, e.g.',
			'	// return []string{"CREATE INDEX employees_x_idx ON employees (x)"}',
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
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			T.HARNESS_RT,
			'',
			T.DB_RT,
			'',
			'// planLines renders each EXPLAIN row as one string (EXPLAIN returns',
			'// one single-column row per plan line).',
			'func planLines(res *sql.Result) []string {',
			'	out := make([]string, 0, len(res.Rows))',
			'	for _, row := range res.Rows {',
			'		line := ""',
			'		if len(row) > 0 {',
			'			line = fmt.Sprintf("%v", row[0])',
			'		}',
			'		out = append(out, line)',
			'	}',
			'	return out',
			'}',
			'',
			'// Tiny string helpers — the interpreter environment for this track',
			'// keeps the harness import list fixed, so no strings package here.',
			'func hasPrefix(s, p string) bool { return len(s) >= len(p) && s[:len(p)] == p }',
			'',
			'func hasSuffix(s, p string) bool { return len(s) >= len(p) && s[len(s)-len(p):] == p }',
			'',
			'func contains(s, sub string) bool {',
			'	if len(sub) == 0 {',
			'		return true',
			'	}',
			'	for i := 0; i+len(sub) <= len(s); i++ {',
			'		if s[i:i+len(sub)] == sub {',
			'			return true',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
			'// trimIndent strips leading spaces/tabs so plan detail lines print',
			'// compactly in got strings.',
			'func trimIndent(s string) string {',
			'	i := 0',
			'	for i < len(s) && (s[i] == \' \' || s[i] == \'\\t\') {',
			'		i++',
			'	}',
			'	return s[i:]',
			'}',
			'',
			'// joinPlan flattens a plan to one line for want/got display.',
			'func joinPlan(lines []string) string {',
			'	out := ""',
			'	for i, l := range lines {',
			'		if i > 0 {',
			'			out += " | "',
			'		}',
			'		out += trimIndent(l)',
			'	}',
			'	return out',
			'}',
			'',
			'// squash lowercases (ASCII) and drops all whitespace: the canonical',
			'// form for the did-you-index-id textual guard, so "( ID )" and',
			'// "(id)" read the same.',
			'func squash(s string) string {',
			'	out := make([]byte, 0, len(s))',
			'	for i := 0; i < len(s); i++ {',
			'		c := s[i]',
			'		if c == \' \' || c == \'\\t\' || c == \'\\n\' || c == \'\\r\' {',
			'			continue',
			'		}',
			'		if c >= \'A\' && c <= \'Z\' {',
			'			c += \'a\' - \'A\'',
			'		}',
			'		out = append(out, c)',
			'	}',
			'	return string(out)',
			'}',
			'',
			'func main() {',
			'	db, cleanup := openDB("secondary-indexes")',
			'	defer cleanup()',
			'',
			'	mustExec(db, `CREATE TABLE employees (',
			'		id SERIAL PRIMARY KEY,',
			'		email TEXT NOT NULL,',
			'		dept TEXT NOT NULL,',
			'		hired DATE NOT NULL,',
			'		salary INT NOT NULL',
			'	)`)',
			'	mustExec(db, `INSERT INTO employees (email, dept, hired, salary) VALUES',
			'		(\'ada@corp.io\', \'eng\', \'2021-03-01\', 180000),',
			'		(\'grace@corp.io\', \'eng\', \'2019-07-15\', 210000),',
			'		(\'rob@corp.io\', \'sales\', \'2022-01-10\', 95000),',
			'		(\'linus@corp.io\', \'eng\', \'2020-11-20\', 175000),',
			'		(\'barbara@corp.io\', \'ops\', \'2023-05-02\', 120000),',
			'		(\'ken@corp.io\', \'sales\', \'2018-09-09\', 105000),',
			'		(\'dennis@corp.io\', \'eng\', \'2024-02-14\', 165000),',
			'		(\'margaret@corp.io\', \'ops\', \'2022-08-30\', 140000)`)',
			'',
			'	stmts := CreateIndexes()',
			'	results := make([]map[string]any, 0, 6)',
			'',
			'	// Case 1: the statements exist, are CREATE INDEX, apply cleanly,',
			'	// and respect the write-amplification budget. Applied here so',
			'	// every later EXPLAIN sees the learner\'s indexes.',
			'	r := map[string]any{',
			'		"input": "your statements apply cleanly (1-3 CREATE INDEX, live against the engine)",',
			'		"want":  "1-3 CREATE INDEX statements, all applied",',
			'	}',
			'	runCase(r, func() {',
			'		if len(stmts) == 0 {',
			'			r["pass"] = false',
			'			r["got"] = "no statements returned"',
			'			return',
			'		}',
			'		for _, stmt := range stmts {',
			'			if !contains(squash(stmt), "createindex") {',
			'				r["pass"] = false',
			'				r["got"] = fmt.Sprintf("not a CREATE INDEX statement: %q", stmt)',
			'				return',
			'			}',
			'			_, err := db.Exec(stmt)',
			'			if err != nil {',
			'				r["pass"] = false',
			'				r["got"] = fmt.Sprintf("%q failed: %v", stmt, err)',
			'				return',
			'			}',
			'		}',
			'		if len(stmts) > 3 {',
			'			r["pass"] = false',
			'			r["got"] = fmt.Sprintf("%d indexes — the workload needs at most 3; every extra one taxes every write", len(stmts))',
			'			return',
			'		}',
			'		r["pass"] = true',
			'		r["got"] = fmt.Sprintf("%d statements applied", len(stmts))',
			'	})',
			'	results = append(results, r)',
			'',
			'	// Case 2: (a) the email point lookup must be an Index Scan. The',
			'	// index name is the learner\'s choice, so match prefix + suffix.',
			'	r = map[string]any{',
			'		"input": "(a) EXPLAIN SELECT id, dept FROM employees WHERE email = \'grace@corp.io\'",',
			'		"want":  "Index Scan using <your index> on employees",',
			'	}',
			'	runCase(r, func() {',
			'		lines := planLines(mustExec(db, `EXPLAIN SELECT id, dept FROM employees WHERE email = \'grace@corp.io\'`))',
			'		first := ""',
			'		if len(lines) > 0 {',
			'			first = lines[0]',
			'		}',
			'		r["got"] = first',
			'		r["pass"] = hasPrefix(first, "Index Scan using ") && hasSuffix(first, " on employees")',
			'	})',
			'	results = append(results, r)',
			'',
			'	// Case 3: (b) equality + range served by ONE composite index.',
			'	// The discriminator is the Index Cond line: with (dept, salary)',
			'	// BOTH conditions bound the scan; with dept-only (or the',
			'	// wrong-order (salary, dept)) one of them drops to Filter.',
			'	r = map[string]any{',
			'		"input": "(b) EXPLAIN SELECT email FROM employees WHERE dept = \'eng\' AND salary > 170000",',
			'		"want":  "Index Scan on employees with BOTH dept and salary in Index Cond",',
			'	}',
			'	runCase(r, func() {',
			'		lines := planLines(mustExec(db, `EXPLAIN SELECT email FROM employees WHERE dept = \'eng\' AND salary > 170000`))',
			'		first := ""',
			'		if len(lines) > 0 {',
			'			first = lines[0]',
			'		}',
			'		cond := ""',
			'		for _, l := range lines {',
			'			if contains(l, "Index Cond:") {',
			'				cond = trimIndent(l)',
			'			}',
			'		}',
			'		r["got"] = first + " | " + cond',
			'		r["pass"] = hasPrefix(first, "Index Scan using ") && hasSuffix(first, " on employees") &&',
			'			contains(cond, "dept") && contains(cond, "salary")',
			'	})',
			'	results = append(results, r)',
			'',
			'	// Case 4: (c) the newest-hires listing must be answered by an',
			'	// index in hired order — no Sort node anywhere in the plan. A',
			'	// DESC index reads forward; an ASC index appears as "Index Scan',
			'	// Backward" — both are order-serving, so both pass.',
			'	r = map[string]any{',
			'		"input": "(c) EXPLAIN SELECT email FROM employees ORDER BY hired DESC LIMIT 3",',
			'		"want":  "plan contains an Index Scan and no Sort (and no Seq Scan)",',
			'	}',
			'	runCase(r, func() {',
			'		plan := joinPlan(planLines(mustExec(db, `EXPLAIN SELECT email FROM employees ORDER BY hired DESC LIMIT 3`)))',
			'		r["got"] = plan',
			'		r["pass"] = contains(plan, "Index Scan") && !contains(plan, "Sort") && !contains(plan, "Seq Scan")',
			'	})',
			'	results = append(results, r)',
			'',
			'	// Case 5: (d) the PK lookup stays a Point Get with NO index on',
			'	// id. EXPLAIN cannot flag the redundancy (probed: the plan says',
			'	// "Point Get" whether or not an id index exists — the planner',
			'	// just never looks at it), so the guard inspects the statements.',
			'	r = map[string]any{',
			'		"input": "(d) EXPLAIN SELECT email FROM employees WHERE id = 4 — and no redundant index on id",',
			'		"want":  "Point Get on employees, and no CREATE INDEX on (id)",',
			'	}',
			'	runCase(r, func() {',
			'		lines := planLines(mustExec(db, `EXPLAIN SELECT email FROM employees WHERE id = 4`))',
			'		first := ""',
			'		if len(lines) > 0 {',
			'			first = lines[0]',
			'		}',
			'		idIndexed := false',
			'		for _, stmt := range stmts {',
			'			q := squash(stmt)',
			'			if contains(q, "(id)") || contains(q, "(id,") || contains(q, "(idasc") || contains(q, "(iddesc") {',
			'				idIndexed = true',
			'			}',
			'		}',
			'		got := first',
			'		if idIndexed {',
			'			got += " | but you indexed (id) — the primary key IS the row\'s storage key"',
			'		}',
			'		r["got"] = got',
			'		r["pass"] = first == "Point Get on employees" && !idIndexed',
			'	})',
			'	results = append(results, r)',
			'',
			'	// Case 6: plans are only half the story — the rows coming back',
			'	// THROUGH the indexes must still be correct.',
			'	r = map[string]any{',
			'		"input": "the workload queries still return the right rows through your indexes",',
			'		"want":  "[[2 eng]] [[linus@corp.io] [ada@corp.io] [grace@corp.io]] [[dennis@corp.io] [barbara@corp.io] [margaret@corp.io]]",',
			'	}',
			'	runCase(r, func() {',
			'		q1 := rowsStr(mustExec(db, `SELECT id, dept FROM employees WHERE email = \'grace@corp.io\'`))',
			'		q2 := rowsStr(mustExec(db, `SELECT email FROM employees WHERE dept = \'eng\' AND salary > 170000 ORDER BY salary`))',
			'		q3 := rowsStr(mustExec(db, `SELECT email FROM employees ORDER BY hired DESC LIMIT 3`))',
			'		got := q1 + " " + q2 + " " + q3',
			'		want := r["want"].(string)',
			'		r["got"] = got',
			'		r["pass"] = got == want',
			'	})',
			'	results = append(results, r)',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// CreateIndexes: three indexes, one per read path — and none on the',
			'// primary key, which is already the row\'s storage key.',
			'func CreateIndexes() []string {',
			'	return []string{',
			'		// (a) Point lookups by email: a single-column index turns the',
			'		// Seq Scan into a two-hop read — index key (email, id) -> id,',
			'		// then id -> row. (Making it UNIQUE would also enforce the',
			'		// business rule; plain works for the plan.)',
			'		"CREATE INDEX employees_email_idx ON employees (email)",',
			'',
			'		// (b) dept FIRST, salary second — the leading-column rule.',
			'		// The index is sorted by dept, then salary within each dept,',
			'		// so dept = $1 AND salary > $2 is ONE contiguous key range:',
			'		// EXPLAIN shows both conditions in Index Cond. Ordered',
			'		// (salary, dept), the equality can\'t bound the scan and dept',
			'		// drops to a post-scan Filter — a much wider read.',
			'		"CREATE INDEX employees_dept_salary_idx ON employees (dept, salary)",',
			'',
			'		// (c) A DESC column stores hired byte-inverted, so newest-first',
			'		// is a plain forward scan; under LIMIT 3 the planner reads',
			'		// exactly three index entries and stops — no Sort node. (An',
			'		// ASC index also works here: the planner scans it backward.)',
			'		"CREATE INDEX employees_hired_desc_idx ON employees (hired DESC)",',
			'',
			'		// (d) Deliberately absent: no index on id. WHERE id = $1 is',
			'		// already a Point Get on the primary key space; an id index',
			'		// would never be read but would be written on every insert.',
			'	}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Every index is a table you don&#8217;t query</h3>' +
			'<p>Strip the syntax away and <code>CREATE INDEX</code> means: ' +
			'&#8220;maintain a second, sorted copy of these columns forever.&#8221; ' +
			'In bytdb the index rows live in the same ordered key space as the ' +
			'table, keyed <code>(indexed cols&#8230;, pk)</code>; in Postgres they ' +
			'are a separate B-tree; in MySQL/InnoDB a separate B-tree whose ' +
			'leaves hold the primary key. The constant across all of them: every ' +
			'<code>INSERT</code> writes one entry per index, every ' +
			'<code>UPDATE</code> of an indexed column writes a delete+insert pair ' +
			'per affected index. Five indexes on a hot table can mean 6&#215; the ' +
			'write volume — this is why Postgres has HOT updates (skip index ' +
			'maintenance when no indexed column changed) and why removing unused ' +
			'indexes is a standard performance win. Your three-index budget was ' +
			'that cost made visible.</p>' +
			'<h3>Covering vs non-covering: the second hop</h3>' +
			'<p><code>SELECT id, dept FROM &#8230; WHERE email = $1</code> through ' +
			'an email index is two hops: index entry &#8594; id, then id &#8594; ' +
			'row. <code>SELECT *</code> pays that second hop for every match — on ' +
			'a range that matches thousands of rows, thousands of random point ' +
			'reads, which is exactly when a planner concludes a Seq Scan is ' +
			'cheaper and &#8220;ignores your index.&#8221; A <strong>covering</strong> ' +
			'index holds every column the query touches, so hop 2 disappears: ' +
			'Postgres calls the plan an Index Only Scan (and offers ' +
			'<code>INCLUDE (col)</code> to add payload columns without widening ' +
			'the key); in InnoDB, secondary index leaves already carry the PK, so ' +
			'<code>SELECT pk WHERE indexed = $1</code> is covering for free.</p>' +
			'<h3>When the planner ignores your index</h3>' +
			'<p>Three classics, all reproducible with <code>EXPLAIN</code>: ' +
			'<strong>selectivity</strong> — a predicate matching most of the table ' +
			'makes hop-2 random reads slower than one sequential pass, so the ' +
			'planner picks Seq Scan (correctly; the surprise is yours, not a bug); ' +
			'<strong>the leading column</strong> — <code>(dept, salary)</code> is ' +
			'useless for <code>WHERE salary &gt; $1</code> alone, since matching ' +
			'salaries are scattered across every dept prefix (you saw the mirror ' +
			'of this in case (b)); <strong>expressions</strong> — ' +
			'<code>WHERE lower(email) = $1</code> can&#8217;t use a plain email ' +
			'index because the index stores <code>email</code>&#8217;s bytes, not ' +
			'<code>lower(email)</code>&#8217;s (expression indexes exist in ' +
			'Postgres for exactly this).</p>' +
			'<h3>Order is an index feature too</h3>' +
			'<p>Case (c) worked because index entries are <em>sorted</em>, and a ' +
			'DESC column just stores its bytes inverted — the tuple-encoding item ' +
			'is doing the work here. Note what probing showed about the real ' +
			'planner: without the <code>LIMIT</code>, bytdb still chose ' +
			'scan-then-sort, because draining an entire table through an index ' +
			'costs a point read per row. The same reasoning lives in Postgres: ' +
			'<code>ORDER BY &#8230; LIMIT n</code> is the signature pattern that ' +
			'makes an ordered index scan win. And the mixed composite — ' +
			'<code>(dept ASC, hired DESC)</code> for &#8220;newest per ' +
			'team&#8221; — is precisely why engines bother implementing DESC ' +
			'<em>columns</em> at all: a backward scan can reverse a whole index, ' +
			'but it cannot reverse one column of a composite.</p>' +
			'<h3>The redundant-index trap</h3>' +
			'<p>Nothing warned you when you considered indexing <code>id</code> — ' +
			'and nothing ever would have: the planner simply never reads it ' +
			'(probed here: <code>WHERE id = $1</code> plans as Point Get with or ' +
			'without it). Redundant indexes are pure write tax with zero read ' +
			'benefit, invisible until someone audits ' +
			'<code>pg_stat_user_indexes</code> for indexes with ' +
			'<code>idx_scan = 0</code>. The habit that catches them is the one ' +
			'this item graded you with: never trust an index to be used — run ' +
			'<code>EXPLAIN</code> and read the plan.</p>',
		],
		complexity: { time: 'O(log n + k) per indexed lookup (plus a PK hop per row) vs O(n) for a Seq Scan', space: 'O(n) per index — a sorted copy of its key columns, paid on every write' },
	});
})();
