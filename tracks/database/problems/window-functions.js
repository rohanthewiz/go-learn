/* Window functions (Hard). GROUP BY collapses a group into one row; a window
 * function keeps every row and annotates it with a computation over a related
 * set of rows (its "window"). The learner writes four queries that GROUP BY
 * cannot express: top-2 per dept via row_number() in a derived table, the
 * rank()/dense_rank() gap over a salary tie, each row beside its dept average
 * (avg OVER PARTITION BY), and a running total (sum OVER ORDER BY). The
 * harness seeds a deliberate salary tie so the three ranking functions
 * disagree observably, and a unique hire order so the running total is
 * unambiguous.
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// GROUP BY folds each partition down to a single output row — you get one
	// row per dept and lose the individuals. A window function partitions the
	// same way but PROJECTS the aggregate back onto every row, so the detail
	// survives next to the summary. That "keep the rows, add a column" shape
	// is the thing GROUP BY structurally cannot do.
	// Marker ids namespaced (dgArrowDBWF*) — the page shares one id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 600 320" width="600" height="320" role="img" aria-label="GROUP BY collapses each department to one summary row; a window function keeps every employee row and adds the summary as a new column">' +
		'<text x="16" y="22" class="lbl">four Engineering rows, two ways to summarize</text>' +
		// source rows
		'<text x="16" y="52">source</text>' +
		'<rect x="16" y="60" width="150" height="96" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="26" y="80" class="lbl">Alice  150</text>' +
		'<text x="26" y="100" class="lbl">Bob    120</text>' +
		'<text x="26" y="120" class="lbl">Carol  120</text>' +
		'<text x="26" y="140" class="lbl">Dave   100</text>' +
		// GROUP BY branch (collapses)
		'<path d="M 166 90 C 210 90 210 78 250 78" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDBWF)"/>' +
		'<text x="262" y="60" style="fill:var(--warn)">GROUP BY dept</text>' +
		'<rect x="262" y="70" width="230" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="272" y="91" class="lbl">Engineering   avg 122.5</text>' +
		'<text x="262" y="126" class="lbl" style="fill:var(--warn)">one row — the four people are gone</text>' +
		// window branch (keeps)
		'<path d="M 166 128 C 210 128 210 176 250 176" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDBWFok)"/>' +
		'<text x="262" y="168" style="fill:var(--ok)">avg(salary) OVER (PARTITION BY dept)</text>' +
		'<rect x="262" y="178" width="270" height="96" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="272" y="198" class="lbl">Alice  150   122.5</text>' +
		'<text x="272" y="218" class="lbl">Bob    120   122.5</text>' +
		'<text x="272" y="238" class="lbl">Carol  120   122.5</text>' +
		'<text x="272" y="258" class="lbl">Dave   100   122.5</text>' +
		'<text x="262" y="294" class="lbl" style="fill:var(--ok)">every row kept — the summary rides along as a new column</text>' +
		'<text x="16" y="314" class="lbl">rank()/dense_rank()/row_number() ride along the same way — one label per row, computed over the window</text>' +
		'<defs>' +
		'<marker id="dgArrowDBWF" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowDBWFok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'window-functions',
		title: 'Window Functions: Keep the Rows, Add the Answer',
		nav: 'window functions',
		difficulty: 'Hard',
		category: 'Integrity & Change',
		task: 'Write four queries a plain GROUP BY cannot: top-2 earners per dept (row_number in a derived table), the rank()/dense_rank() gap over a salary tie, each salary beside its dept average without collapsing rows, and a running total ordered by hire.',

		prose: [
			'<h2>“Top 2 earners per department” — and GROUP BY won’t do it</h2>' +
			'<p>The finance team asks for the two highest-paid people in each ' +
			'department. You reach for <code>GROUP BY dept</code> … and stall: ' +
			'grouping gives you one row per department, but you need to keep ' +
			'<em>individual</em> people while ranking them <em>within</em> their ' +
			'department. That is the exact seam window functions fill. A window ' +
			'function computes over a set of rows related to the current row — its ' +
			'<em>window</em> — but, unlike <code>GROUP BY</code>, it does not ' +
			'collapse anything: every input row survives, now carrying an extra ' +
			'column.</p>' +
			'<ul>' +
			'<li><strong><code>OVER (PARTITION BY …)</code></strong> is the window’s ' +
			'“group”: rows are partitioned, the function runs per partition, but the ' +
			'rows stay. <code>avg(salary) OVER (PARTITION BY dept)</code> puts the ' +
			'department average on every employee row — something ' +
			'<code>GROUP BY</code> structurally can’t return alongside the names.</li>' +
			'<li><strong>Ranking functions</strong> need <code>OVER (… ORDER BY …)</code>. ' +
			'<code>row_number()</code> numbers rows 1,2,3 with no ties (arbitrary ' +
			'unless you order by a unique key); <code>rank()</code> gives tied rows ' +
			'the same rank and then <em>skips</em> (1,2,2,4); ' +
			'<code>dense_rank()</code> ties without skipping (1,2,2,3).</li>' +
			'<li><strong>Top-N per group</strong> is the canonical two-step: number ' +
			'rows inside a derived table, then filter on that number ' +
			'<em>outside</em> it — because a window function can’t appear in a ' +
			'<code>WHERE</code> (it’s computed after filtering). ' +
			'<code>SELECT … FROM (SELECT …, row_number() OVER (…) AS rn FROM t) ranked ' +
			'WHERE rn &lt;= 2</code>.</li>' +
			'<li><strong>Running totals</strong> use an aggregate with an ordered ' +
			'window: <code>sum(salary) OVER (ORDER BY hire_seq)</code> accumulates ' +
			'from the first row through the current one. The default frame runs ' +
			'“from the start of the partition to the current row,” so ordering by a ' +
			'<em>unique</em> key makes the sequence unambiguous.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>The harness seeds an <code>employees</code> table ' +
			'(<code>id, dept, name, salary, hire_seq</code>) with a deliberate ' +
			'salary <strong>tie</strong> in Engineering (Bob and Carol both at 120) so ' +
			'the three ranking functions disagree, and a unique <code>hire_seq</code> ' +
			'so the running total is well-defined. Implement four functions that each ' +
			'<strong>return a SQL string</strong>; the harness runs each against the ' +
			'live engine and checks the rows. Column order and ORDER BY are pinned — ' +
			'match them exactly:</p>' +
			'<ul>' +
			'<li><code>Top2PerDept()</code> → <code>dept, name, salary</code> for the ' +
			'top 2 earners per department, ordered <code>dept, salary DESC, name</code>.</li>' +
			'<li><code>RankVsDense()</code> → <code>name, salary, rank, dense_rank</code> ' +
			'over salary (Engineering only), ordered <code>salary DESC, name</code>.</li>' +
			'<li><code>SalaryVsDeptAvg()</code> → <code>name, salary, dept_avg</code> ' +
			'for every employee, ordered <code>dept, name</code>.</li>' +
			'<li><code>RunningTotal()</code> → <code>name, salary, running_total</code> ' +
			'ordered by <code>hire_seq</code>.</li>' +
			'</ul>',
			{ lang: 'sql', code: '-- The tie makes the three ranking functions diverge:\n--   salary  row_number  rank  dense_rank\n--   150        1          1       1\n--   120        2          2       2     <- Bob\n--   120        3          2       2     <- Carol (tie)\n--   100        4          4       3     <- rank SKIPS 3; dense_rank does not' },
		],

		starter: [
			'package main',
			'',
			'// Each function returns the SQL text for one query. The harness runs',
			'// the returned string against the live engine and compares the rows.',
			'// Return the empty string and the harness reports the case as failing —',
			'// fill each in.',
			'//',
			'// The seeded table is:',
			'//   employees(id SERIAL, dept TEXT, name TEXT, salary INT, hire_seq INT)',
			'// with a salary TIE in Engineering (Bob=120, Carol=120).',
			'',
			'// Top2PerDept: the two highest-paid employees in each department.',
			'// A window function can\'t sit in a WHERE, so number the rows inside a',
			'// derived table (subquery in FROM, alias required) and filter on that',
			'// number outside it:',
			'//   SELECT dept, name, salary FROM (',
			'//     SELECT dept, name, salary,',
			'//            row_number() OVER (PARTITION BY dept ORDER BY salary DESC, name) AS rn',
			'//     FROM employees',
			'//   ) ranked WHERE rn <= 2 ORDER BY dept, salary DESC, name',
			'func Top2PerDept() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// RankVsDense: for Engineering, each name with rank() AND dense_rank()',
			'// over salary DESC, so the tie shows the gap (rank skips, dense_rank',
			'// does not). Columns: name, salary, rank, dense_rank.',
			'// Order by salary DESC, name.',
			'func RankVsDense() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// SalaryVsDeptAvg: every employee\'s salary beside their DEPARTMENT',
			'// average, WITHOUT collapsing rows — the query GROUP BY can\'t write.',
			'// Use avg(salary) OVER (PARTITION BY dept). Columns: name, salary,',
			'// dept_avg. Order by dept, name.',
			'func SalaryVsDeptAvg() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// RunningTotal: a cumulative sum of salary in hire order. Use',
			'// sum(salary) OVER (ORDER BY hire_seq). Columns: name, salary,',
			'// running_total. Order by hire_seq.',
			'func RunningTotal() string {',
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
			'	db, cleanup := openDB("window-functions")',
			'	defer cleanup()',
			'',
			'	// Engineering carries a salary TIE (Bob=Carol=120) so rank(),',
			'	// dense_rank(), and row_number() diverge observably. hire_seq is',
			'	// unique so the running total has one well-defined ordering.',
			'	mustExec(db, "CREATE TABLE employees (id SERIAL PRIMARY KEY, dept TEXT NOT NULL, name TEXT NOT NULL, salary INT NOT NULL, hire_seq INT NOT NULL)")',
			'	mustExec(db, "INSERT INTO employees (dept, name, salary, hire_seq) VALUES "+',
			'		"(\'Engineering\',\'Alice\',150,1), (\'Engineering\',\'Bob\',120,2), "+',
			'		"(\'Engineering\',\'Carol\',120,3), (\'Engineering\',\'Dave\',100,4), "+',
			'		"(\'Sales\',\'Eve\',90,5), (\'Sales\',\'Frank\',80,6)")',
			'',
			'	// runQuery executes a user-returned SQL string and renders its rows',
			'	// as a comparable string (or "error: ..." if the SQL is bad/empty).',
			'	runQuery := func(q string) string {',
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
			'		{"Top2PerDept: top-2 earners per dept via row_number() in a derived table",',
			'			"[[Engineering Alice 150] [Engineering Bob 120] [Sales Eve 90] [Sales Frank 80]]",',
			'			func() string { return runQuery(Top2PerDept()) }},',
			'		{"RankVsDense: the tie shows rank() skipping (1,2,2,4) while dense_rank() does not (1,2,2,3)",',
			'			"[[Alice 150 1 1] [Bob 120 2 2] [Carol 120 2 2] [Dave 100 4 3]]",',
			'			func() string { return runQuery(RankVsDense()) }},',
			'		{"SalaryVsDeptAvg: every row keeps its identity next to the dept average (GROUP BY cannot)",',
			'			"[[Alice 150 122.5] [Bob 120 122.5] [Carol 120 122.5] [Dave 100 122.5] [Eve 90 85] [Frank 80 85]]",',
			'			func() string { return runQuery(SalaryVsDeptAvg()) }},',
			'		{"RunningTotal: cumulative sum in hire order (150, 270, 390, 490, 580, 660)",',
			'			"[[Alice 150 150] [Bob 120 270] [Carol 120 390] [Dave 100 490] [Eve 90 580] [Frank 80 660]]",',
			'			func() string { return runQuery(RunningTotal()) }},',
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
			'// Top2PerDept: top-N-per-group, the canonical window pattern. A window',
			'// function is evaluated AFTER WHERE/GROUP BY, so it can\'t be referenced',
			'// in a WHERE directly. The fix is a derived table: number the rows in an',
			'// inner query, then filter on that number in the outer one. The',
			'// PARTITION BY restarts the numbering per department; ORDER BY inside',
			'// OVER decides who is #1 (salary DESC), with `name` as a deterministic',
			'// tiebreak so the row picked among equals is stable.',
			'func Top2PerDept() string {',
			'	return `SELECT dept, name, salary FROM (',
			'		SELECT dept, name, salary,',
			'			row_number() OVER (PARTITION BY dept ORDER BY salary DESC, name) AS rn',
			'		FROM employees',
			'	) ranked WHERE rn <= 2 ORDER BY dept, salary DESC, name`',
			'}',
			'',
			'// RankVsDense: the same OVER (ORDER BY salary DESC) drives both ranking',
			'// functions, so their difference is purely in how each treats a tie.',
			'// rank() counts the tied rows and leaves a hole (…2,2,then 4), mirroring',
			'// "how many people earn strictly more, plus one". dense_rank() counts',
			'// DISTINCT salary levels (…2,2,then 3), mirroring "which pay band".',
			'// Restricting to Engineering keeps the tie (Bob, Carol at 120) in view.',
			'func RankVsDense() string {',
			'	return `SELECT name, salary,',
			'		rank() OVER (ORDER BY salary DESC) AS rnk,',
			'		dense_rank() OVER (ORDER BY salary DESC) AS drnk',
			'	FROM employees WHERE dept = \'Engineering\' ORDER BY salary DESC, name`',
			'}',
			'',
			'// SalaryVsDeptAvg: the query GROUP BY structurally cannot write. An',
			'// aggregate OVER (PARTITION BY dept) computes the per-dept average but',
			'// PROJECTS it back onto every employee row instead of folding the dept',
			'// to one row — so each person keeps their name and salary next to the',
			'// department benchmark. (avg returns a float, hence 122.5 for',
			'// Engineering; Sales averages to 85.)',
			'func SalaryVsDeptAvg() string {',
			'	return `SELECT name, salary, avg(salary) OVER (PARTITION BY dept) AS dept_avg',
			'	FROM employees ORDER BY dept, name`',
			'}',
			'',
			'// RunningTotal: an aggregate with an ORDER BY inside OVER becomes a',
			'// cumulative computation. The DEFAULT frame is "unbounded preceding to',
			'// current row", so sum(salary) accumulates from the first hire through',
			'// the current one. Ordering by the UNIQUE hire_seq matters: on a tied',
			'// order key the default frame would lump the tied rows together (each',
			'// tied row would show the same, group-final running sum), which is a',
			'// classic surprise — a unique key sidesteps it entirely.',
			'func RunningTotal() string {',
			'	return `SELECT name, salary, sum(salary) OVER (ORDER BY hire_seq) AS running_total',
			'	FROM employees ORDER BY hire_seq`',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The window is a third phase of the query</h3>' +
			'<p>SQL evaluates in a fixed order: <code>FROM</code>/<code>JOIN</code>, ' +
			'then <code>WHERE</code>, then <code>GROUP BY</code>/aggregates, then — ' +
			'and only then — <strong>window functions</strong>, then ' +
			'<code>ORDER BY</code>/<code>LIMIT</code>. Two consequences fall out of ' +
			'that ordering. First, a window function can’t appear in a ' +
			'<code>WHERE</code>, because <code>WHERE</code> has already run before the ' +
			'window is computed — hence the derived-table trick for top-N-per-group. ' +
			'Second, a window sees the rows <em>after</em> grouping, so you can even ' +
			'layer a window over an aggregate (<code>rank() OVER (ORDER BY ' +
			'sum(sales) DESC)</code> in a <code>GROUP BY</code> query) — a move that ' +
			'confuses everyone the first time they see it precisely because two ' +
			'“aggregations” coexist at different phases.</p>' +
			'<h3>rank vs dense_rank vs row_number, and why the tie matters</h3>' +
			'<p>On distinct values all three agree; the tie is the only place their ' +
			'definitions separate, which is why the seed data forces one. ' +
			'<code>row_number()</code> is a pure counter (always 1,2,3,4 — but which ' +
			'tied row gets 2 vs 3 is arbitrary unless the <code>ORDER BY</code> ' +
			'breaks the tie, a real source of nondeterministic pagination bugs). ' +
			'<code>rank()</code> is “1 + the number of rows strictly ahead,” so ties ' +
			'share a rank and the next value jumps the gap (…2,2,4). ' +
			'<code>dense_rank()</code> is “which distinct level,” so it never gaps ' +
			'(…2,2,3). Choosing wrong quietly changes business meaning: “top 3 by ' +
			'rank” can return four people, “top 3 by dense_rank” can return many ' +
			'more.</p>' +
			'<h3>Frames: the part everyone forgets</h3>' +
			'<p>Any aggregate window has a <em>frame</em> — the slice of the partition ' +
			'it actually sums. Add <code>ORDER BY</code> inside <code>OVER</code> and ' +
			'the default frame silently becomes <code>RANGE BETWEEN UNBOUNDED ' +
			'PRECEDING AND CURRENT ROW</code>, which is what turns ' +
			'<code>sum()</code> into a running total. The subtlety the ' +
			'<code>RunningTotal</code> comment flags is real: the default frame is ' +
			'<code>RANGE</code>, not <code>ROWS</code>, and <code>RANGE</code> treats ' +
			'all rows tied on the order key as one “peer group,” giving every tied ' +
			'row the group’s final cumulative value instead of a per-row step. ' +
			'Postgres, Oracle, and SQL Server all behave this way; the fix is either ' +
			'a unique order key (as here) or an explicit <code>ROWS BETWEEN ' +
			'UNBOUNDED PRECEDING AND CURRENT ROW</code>. Moving averages ' +
			'(<code>ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code>) are the same ' +
			'machinery with a bounded frame.</p>' +
			'<h3>At scale</h3>' +
			'<p>Window functions were SQL:2003 and took years to arrive everywhere — ' +
			'MySQL only got them in 8.0 (2018), which is why so much legacy code ' +
			'emulates them with correlated subqueries or self-joins that run ' +
			'O(n²). A single <code>row_number()</code> pass replaces those, and ' +
			'engines evaluate a window by sorting once on ' +
			'<code>(PARTITION BY, ORDER BY)</code> and sweeping — so multiple windows ' +
			'that share the same partition/order are computed together, and giving ' +
			'them matching <code>OVER</code> clauses (or a named <code>WINDOW</code> ' +
			'clause) can save whole sorts. The derived-table top-N pattern here is ' +
			'exactly how you’d write “most recent order per customer” or “top ' +
			'query per user” over millions of rows.</p>',
		],
		complexity: { time: 'O(n log n) — the engine sorts each partition once on its ORDER BY, then sweeps', space: 'O(n) — rows are buffered per partition to compute the window' },
	});
})();
