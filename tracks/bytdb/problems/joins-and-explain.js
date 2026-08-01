/* Joins Under EXPLAIN — Planner (Medium). INNER/LEFT/CROSS joins for the
 * row semantics, then EXPLAIN for the execution story: bytdb's planner
 * runs an unindexed equijoin as a Hash Join (build the small side, probe
 * per row) and flips to Nested Loop + Index Scan the moment the join
 * column is indexed; a PK equality never joins at all — it is a Point
 * Get. All plan shapes pinned from live planner output; the harness
 * asserts stable substrings, not whole plans.
 */
(function () {
	'use strict';
	var T = GoLearnBY;

	// The same ON clause, two physical plans. Marker ids namespaced
	// dgArrowBY06*.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 232" width="560" height="232" role="img" aria-label="hash join: build a hash table from one side then probe it once per row of the other; nested loop with an index: for each outer row descend the index on the join column — the plan flips when an index exists">' +
		'<text x="20" y="22" class="lbl">ON c.repo_id = r.id — no index: Hash Join</text>' +
		'<rect x="20" y="36" width="110" height="34" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="75" y="57" text-anchor="middle" class="lbl">scan repos</text>' +
		'<path d="M 130 53 L 166 53" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBY06)"/>' +
		'<rect x="170" y="36" width="96" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="218" y="50" text-anchor="middle" class="lbl">hash table</text>' +
		'<text x="218" y="64" text-anchor="middle" class="lbl">keyed by id</text>' +
		'<rect x="20" y="86" width="110" height="34" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="75" y="107" text-anchor="middle" class="lbl">scan commits</text>' +
		'<path d="M 130 103 C 150 103 150 78 166 70" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowBY06w)"/>' +
		'<text x="196" y="96" class="lbl" style="fill:var(--warn)">probe once per row</text>' +
		'<text x="20" y="146" class="lbl">build O(n) + probe O(m): every row of both sides read once</text>' +
		'<line x1="300" y1="30" x2="300" y2="160" stroke="var(--edge)" stroke-width="1" stroke-dasharray="4 4"/>' +
		'<text x="316" y="22" class="lbl">index on repo_id: Nested Loop</text>' +
		'<rect x="316" y="36" width="100" height="34" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="366" y="57" text-anchor="middle" class="lbl">for each repo</text>' +
		'<path d="M 416 53 L 452 53" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBY06)"/>' +
		'<rect x="456" y="36" width="90" height="48" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="501" y="55" text-anchor="middle" class="lbl">Index Scan</text>' +
		'<text x="501" y="71" text-anchor="middle" class="lbl">repo_id = r.id</text>' +
		'<text x="316" y="110" class="lbl">descend straight to the matches:</text>' +
		'<text x="316" y="126" class="lbl">O(log m + hits) per outer row —</text>' +
		'<text x="316" y="142" class="lbl">never reads the non-matching rows</text>' +
		'<text x="20" y="188" class="lbl" style="fill:var(--warn)">same SQL, same rows out — EXPLAIN is how you see WHICH machine ran,</text>' +
		'<text x="20" y="206" class="lbl" style="fill:var(--warn)">and WHERE id = 2 beats both: Point Get, no join machinery at all</text>' +
		'<defs>' +
		'<marker id="dgArrowBY06" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowBY06w" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'joins-and-explain',
		title: 'Joins Under EXPLAIN',
		nav: 'joins and explain',
		difficulty: 'Medium',
		category: 'Planner',
		task: 'Write inner, left, and cross joins over a repos/commits schema, then read their EXPLAIN output: Hash Join without an index, Nested Loop + Index Scan with one, and Point Get for a PK equality.',

		prose: [
			'<h2>Joins under EXPLAIN</h2>' +
			'<p>A dashboard endpoint joins commits to repos and takes 40ms; ' +
			'nobody knows if that is “fine forever” or “fine until the commits ' +
			'table is 100× bigger”. The row semantics of a join and the ' +
			'<em>machine that executes it</em> are separate questions, and this ' +
			'item asks both. First the semantics:</p>' +
			'<ul>' +
			'<li><strong>INNER <code>JOIN ... ON</code></strong> keeps exactly ' +
			'the row pairs where ON is true. A repo with no commits simply ' +
			'contributes nothing — which is sometimes the bug (the “missing” ' +
			'repos were never dropped; they were never matched).</li>' +
			'<li><strong>LEFT JOIN</strong> keeps every left row; where ON found ' +
			'no partner, the right side\'s columns come back NULL. That NULL row ' +
			'is real data — “docs has no commits” — not an error state.</li>' +
			'<li><strong>CROSS JOIN</strong> is every pairing, no ON at all: the ' +
			'deliberate cartesian product. Legitimate for building matrices ' +
			'(every repo × every environment); notorious as the accidental ' +
			'result of a forgotten ON.</li>' +
			'</ul>' +
			'<p>Then the machine. <code>EXPLAIN &lt;query&gt;</code> asks the ' +
			'planner to print the plan it would run — bytdb renders the same ' +
			'indented tree Postgres does (minus cost numbers: bytdb has no cost ' +
			'model and refuses to invent them). Three shapes matter here:</p>',
			{ lang: 'txt', code: "EXPLAIN SELECT ... JOIN ... ON c.repo_id = r.id     -- no index:\nHash Join\n  Hash Cond: (c.repo_id = r.id)\n  ->  Seq Scan on repos r\n  ->  Seq Scan on commits c\n\n-- after CREATE INDEX commits_repo ON commits (repo_id):\nNested Loop\n  ->  Seq Scan on repos r\n  ->  Index Scan using commits_repo on commits c\n        Index Cond: (c.repo_id = r.id)\n\nEXPLAIN SELECT name FROM repos WHERE id = 2          -- PK equality:\nPoint Get on repos\n  Key: (id = 2)" },
			DIAGRAM +
			'<p>The harness seeds:</p>',
			{ lang: 'sql', code: "CREATE TABLE repos   (id INT PRIMARY KEY, name TEXT NOT NULL);\nCREATE TABLE commits (id SERIAL PRIMARY KEY, repo_id INT NOT NULL, author TEXT NOT NULL);\nCREATE TABLE envs    (env TEXT PRIMARY KEY);\nINSERT INTO repos VALUES (1,'api'), (2,'web'), (3,'docs');  -- docs: no commits\nINSERT INTO commits (repo_id, author) VALUES (1,'ada'), (1,'bo'), (2,'cass');\nINSERT INTO envs VALUES ('prod'), ('staging');" },
			'<h3>Your job</h3>' +
			'<p>Four query strings. The harness checks their row sets, then turns ' +
			'EXPLAIN on them: your inner join must plan as a Hash Join on the ' +
			'bare tables, flip to Nested Loop + Index Scan after the harness ' +
			'adds the index (same string, run twice!), and your point lookup ' +
			'must not join at all. Write the equijoin with commits on the ' +
			'right-hand side — <code>FROM repos r JOIN commits c ON c.repo_id = ' +
			'r.id</code> — so the index probe lands on the indexed table.</p>' +
			'<div class="tip">EXPLAIN never executes the query — it answers from ' +
			'the catalog and the statement alone. That is why the harness can ' +
			'EXPLAIN the identical string before and after the index exists and ' +
			'get different machines: plans are chosen fresh per execution, from ' +
			'whatever access paths exist right then.</div>',
		],

		starter: [
			'package main',
			'',
			'// Each function returns ONE SQL string over the repos/commits/envs',
			'// schema in the prose. The harness compares row sets AND (for',
			'// CommitsByRepo and RepoNameByID) the EXPLAIN plan shapes.',
			'',
			'// CommitsByRepo: repo name and commit author for every commit,',
			'// via an INNER equijoin — spell it FROM repos r JOIN commits c ON',
			'// c.repo_id = r.id so the planner can probe commits\' index later.',
			'// Order by name, then author.',
			'//   want: [[api ada] [api bo] [web cass]]',
			'func CommitsByRepo() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// AllReposWithAuthors: EVERY repo, with commit authors where they',
			'// exist — docs must appear with a NULL author, not vanish.',
			'// Order by name, then author.',
			'//   want: [[api ada] [api bo] [docs <nil>] [web cass]]',
			'//',
			'// CODE UNDER REVIEW: as written this is an INNER join — run it and',
			'// watch docs disappear. Which join keeps unmatched left rows?',
			'func AllReposWithAuthors() string {',
			'	return `SELECT r.name, c.author FROM repos r',
			'		JOIN commits c ON c.repo_id = r.id',
			'		ORDER BY r.name, c.author`',
			'}',
			'',
			'// DeployMatrix: every repo paired with every environment — the',
			'// intentional cartesian product. Order by name, then env.',
			'//   want: [[api prod] [api staging] [docs prod] [docs staging] [web prod] [web staging]]',
			'func DeployMatrix() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// RepoNameByID: the name of repo id 2 — a single-table PK lookup.',
			'// Its plan must be a Point Get (the harness EXPLAINs it).',
			'//   want: [[web]]',
			'func RepoNameByID() string {',
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
			'// explainStr renders an EXPLAIN\'s plan rows as one newline-joined',
			'// string, so cases can assert on stable substrings of the real plan.',
			'func explainStr(db *sql.DB, q string) (string, error) {',
			'	res, err := db.Exec("EXPLAIN " + q)',
			'	if err != nil {',
			'		return "", err',
			'	}',
			'	lines := make([]string, 0, len(res.Rows))',
			'	for _, row := range res.Rows {',
			'		lines = append(lines, fmt.Sprintf("%v", row[0]))',
			'	}',
			'	return strings.Join(lines, "\\n"), nil',
			'}',
			'',
			'func main() {',
			'	db, cleanup := openDB("by-joins-explain")',
			'	defer cleanup()',
			'',
			'	mustExec(db, `CREATE TABLE repos (id INT PRIMARY KEY, name TEXT NOT NULL)`)',
			'	mustExec(db, `CREATE TABLE commits (id SERIAL PRIMARY KEY, repo_id INT NOT NULL, author TEXT NOT NULL)`)',
			'	mustExec(db, `CREATE TABLE envs (env TEXT PRIMARY KEY)`)',
			'	mustExec(db, `INSERT INTO repos VALUES (1, \'api\'), (2, \'web\'), (3, \'docs\')`)',
			'	mustExec(db, `INSERT INTO commits (repo_id, author) VALUES (1, \'ada\'), (1, \'bo\'), (2, \'cass\')`)',
			'	mustExec(db, `INSERT INTO envs VALUES (\'prod\'), (\'staging\')`)',
			'',
			'	results := make([]map[string]any, 0, 7)',
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
			'	// Case 1: inner join semantics — docs contributes nothing.',
			'	r := newCase("INNER join: commit rows only", "[[api ada] [api bo] [web cass]]")',
			'	runCase(r, func() { runSQL(r, CommitsByRepo(), "[[api ada] [api bo] [web cass]]") })',
			'',
			'	// Case 2: the unindexed equijoin runs as a Hash Join — build one',
			'	// side into a hash table, probe it per row of the other.',
			'	r = newCase("EXPLAIN (no index): the equijoin is a Hash Join", "plan contains \\"Hash Join\\" and \\"Hash Cond\\"")',
			'	runCase(r, func() {',
			'		plan, err := explainStr(db, CommitsByRepo())',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "explain error: " + err.Error()',
			'			return',
			'		}',
			'		r["pass"] = strings.Contains(plan, "Hash Join") && strings.Contains(plan, "Hash Cond")',
			'		r["got"] = plan',
			'	})',
			'',
			'	// Case 3: LEFT join keeps docs with a NULL author.',
			'	r = newCase("LEFT join: docs survives with NULL author", "[[api ada] [api bo] [docs <nil>] [web cass]]")',
			'	runCase(r, func() { runSQL(r, AllReposWithAuthors(), "[[api ada] [api bo] [docs <nil>] [web cass]]") })',
			'',
			'	// Case 4: CROSS join — all 3 × 2 pairings.',
			'	r = newCase("CROSS join: the deploy matrix", "[[api prod] [api staging] [docs prod] [docs staging] [web prod] [web staging]]")',
			'	runCase(r, func() {',
			'		runSQL(r, DeployMatrix(), "[[api prod] [api staging] [docs prod] [docs staging] [web prod] [web staging]]")',
			'	})',
			'',
			'	// Case 5: add the index and EXPLAIN the SAME string again — the',
			'	// planner flips to Nested Loop probing the new index. Plans are',
			'	// per-execution decisions, not properties of the query text.',
			'	r = newCase("EXPLAIN (after CREATE INDEX on repo_id): Nested Loop + Index Scan", "plan contains \\"Nested Loop\\" and \\"Index Scan using\\"")',
			'	runCase(r, func() {',
			'		mustExec(db, "CREATE INDEX commits_repo ON commits (repo_id)")',
			'		plan, err := explainStr(db, CommitsByRepo())',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "explain error: " + err.Error()',
			'			return',
			'		}',
			'		r["pass"] = strings.Contains(plan, "Nested Loop") && strings.Contains(plan, "Index Scan using")',
			'		r["got"] = plan',
			'	})',
			'',
			'	// Case 6: the point lookup returns its row...',
			'	r = newCase("PK lookup row", "[[web]]")',
			'	runCase(r, func() { runSQL(r, RepoNameByID(), "[[web]]") })',
			'',
			'	// Case 7: ...and its plan is no join machinery at all: the top',
			'	// line of the plan tree is a Point Get on the primary key.',
			'	r = newCase("EXPLAIN: PK equality is a Point Get", "first plan line is \\"Point Get on repos\\"")',
			'	runCase(r, func() {',
			'		plan, err := explainStr(db, RepoNameByID())',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "explain error: " + err.Error()',
			'			return',
			'		}',
			'		first := plan',
			'		if i := strings.Index(plan, "\\n"); i >= 0 {',
			'			first = plan[:i]',
			'		}',
			'		r["pass"] = first == "Point Get on repos"',
			'		r["got"] = plan',
			'	})',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// The equijoin, written with commits on the probing side. The ON',
			'// clause is the join\'s entire contract; ORDER BY exists because a',
			'// join\'s natural output order is an artifact of the chosen plan —',
			'// Hash Join and Nested Loop emit rows in different orders, and this',
			'// item runs the same query under BOTH plans.',
			'func CommitsByRepo() string {',
			'	return `SELECT r.name, c.author FROM repos r',
			'		JOIN commits c ON c.repo_id = r.id',
			'		ORDER BY r.name, c.author`',
			'}',
			'',
			'// LEFT keeps every repos row; docs pairs with a synthesized all-',
			'// NULL commits row. The NULL is the answer ("no commits"), which',
			'// is why COUNT(c.author) — counting non-NULLs — would report 0 for',
			'// docs where COUNT(*) would lie and say 1.',
			'func AllReposWithAuthors() string {',
			'	return `SELECT r.name, c.author FROM repos r',
			'		LEFT JOIN commits c ON c.repo_id = r.id',
			'		ORDER BY r.name, c.author`',
			'}',
			'',
			'// CROSS JOIN says "yes, I mean every pairing" out loud. The same',
			'// rows fall out of `FROM repos, envs` with no WHERE — the comma',
			'// form is exactly how accidental cartesian products are born, so',
			'// spelling CROSS makes the intent reviewable.',
			'func DeployMatrix() string {',
			'	return `SELECT r.name, e.env FROM repos r',
			'		CROSS JOIN envs e',
			'		ORDER BY r.name, e.env`',
			'}',
			'',
			'// Equality on the full primary key: the planner recognizes this',
			'// shape before any join/scan machinery — one key-space lookup.',
			'func RepoNameByID() string {',
			'	return `SELECT name FROM repos WHERE id = 2`',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>How bytdb picks the machine</h3>' +
			'<p>The planner\'s decision tree for an equijoin is short and worth ' +
			'knowing cold. Is the join condition an equality on the inner ' +
			'table\'s primary key or an indexed column? Then <strong>Nested ' +
			'Loop</strong>: scan the outer side, and for each row descend the ' +
			'index — <code>Index Cond: (c.repo_id = r.id)</code> in the plan ' +
			'means the join key is pushed <em>into the scan</em>, so non-matching ' +
			'commits are never read. No index? Then <strong>Hash Join</strong>: ' +
			'build a hash table from one side in O(n), probe it once per row of ' +
			'the other in O(m) — vastly better than the naive nested loop\'s ' +
			'O(n·m) row comparisons, and the reason your unindexed join was ' +
			'merely slow instead of quadratic. CROSS JOIN has no condition to ' +
			'push or hash, so it runs as the honest nested loop it is. And a ' +
			'full-PK equality short-circuits everything: <strong>Point ' +
			'Get</strong>, one ordered-key-space lookup, the cheapest read the ' +
			'engine has.</p>' +
			'<h3>Reading plans as an engineering habit</h3>' +
			'<p>Case 5 is the habit in miniature: the query text did not change; ' +
			'the catalog did, and the machine changed with it. That is why ' +
			'“EXPLAIN before shipping the migration” is a real review step — an ' +
			'index CREATE (or DROP!) silently rewrites the execution of every ' +
			'query touching that column. It is also why plan assertions in tests ' +
			'pin <em>substrings</em> (“contains Hash Join”), as this harness ' +
			'does: the tree\'s exact indentation and child order are rendering ' +
			'details, but which machine ran is semantics. bytdb prints no cost ' +
			'estimates — there is no cost model, and fabricated numbers would ' +
			'invite fabricated confidence — so the plan tree <em>is</em> the ' +
			'whole story.</p>' +
			'<h3>Answering the 40ms question</h3>' +
			'<p>Back to the dashboard: EXPLAIN shows a Hash Join over two Seq ' +
			'Scans, so the endpoint\'s cost grows linearly with total commits — ' +
			'fine forever only if commits stays small. Indexing ' +
			'<code>commits.repo_id</code> turns it into per-repo index probes: ' +
			'the endpoint now costs O(its own rows), not O(the whole table), and ' +
			'the 100× table growth lands on someone else\'s query. The next item ' +
			'pushes this further — composite indexes, DESC ordering, and when an ' +
			'index can absorb the ORDER BY too. One caution carries over: joins ' +
			'that keep the hash shape are not wrong. A report that reads ' +
			'<em>most</em> of both tables genuinely wants the two scans and the ' +
			'hash — index probes win on selectivity, not by decree.</p>',
		],
		complexity: { time: 'Hash Join O(n + m); Nested Loop with index O(n · (log m + hits)); Point Get O(log n)', space: 'O(n) for the hash build side; O(1) for the indexed loop' },
	});
})();
