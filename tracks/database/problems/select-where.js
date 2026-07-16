/* SELECT & WHERE — SQL: Foundations (Easy). Predicates, multi-key ORDER BY,
 * IN, IS NULL, DISTINCT, LIMIT — the working vocabulary of reading data.
 * The learner writes five SQL strings; the harness runs each against a live
 * bytdb table (seeded with a NULL and a score tie on purpose) and compares
 * the real row sets. The centerpiece trap: `= NULL` never matches anything
 * in SQL's three-valued logic — and bytdb goes further and refuses it.
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// The logical evaluation pipeline: the order the engine APPLIES clauses,
	// which is not the order you write them. Marker ids namespaced
	// (dgArrowDBSW) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 190" width="560" height="190" role="img" aria-label="logical evaluation order of a SELECT: FROM feeds WHERE, which feeds SELECT/DISTINCT, then ORDER BY, then LIMIT">' +
		'<text x="20" y="22" class="lbl">what the engine actually does with your SELECT — left to right</text>' +
		'<rect x="20" y="44" width="90" height="40" rx="6" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="65" y="69" text-anchor="middle">FROM</text>' +
		'<text x="65" y="102" text-anchor="middle" class="lbl">all rows</text>' +
		'<path d="M 110 64 L 136 64" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBSW)"/>' +
		'<rect x="140" y="44" width="90" height="40" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="185" y="69" text-anchor="middle">WHERE</text>' +
		'<text x="185" y="102" text-anchor="middle" class="lbl">keep or drop</text>' +
		'<text x="185" y="118" text-anchor="middle" class="lbl">each row</text>' +
		'<path d="M 230 64 L 256 64" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBSW)"/>' +
		'<rect x="260" y="44" width="110" height="40" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="315" y="69" text-anchor="middle">SELECT</text>' +
		'<text x="315" y="102" text-anchor="middle" class="lbl">pick columns,</text>' +
		'<text x="315" y="118" text-anchor="middle" class="lbl">DISTINCT dedups here</text>' +
		'<path d="M 370 64 L 396 64" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBSW)"/>' +
		'<rect x="400" y="44" width="90" height="40" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="445" y="69" text-anchor="middle">ORDER BY</text>' +
		'<text x="445" y="102" text-anchor="middle" class="lbl">sort — key 2 breaks</text>' +
		'<text x="445" y="118" text-anchor="middle" class="lbl">key 1\'s ties</text>' +
		'<path d="M 490 64 L 516 64" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDBSW)"/>' +
		'<rect x="500" y="44" width="50" height="40" rx="6" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="525" y="69" text-anchor="middle" class="lbl">LIMIT</text>' +
		'<text x="525" y="102" text-anchor="middle" class="lbl">cut</text>' +
		'<text x="20" y="152" class="lbl" style="fill:var(--warn)">WHERE sees NULL as UNKNOWN: team = NULL matches nothing, ever — only IS NULL asks the question you mean.</text>' +
		'<text x="20" y="172" class="lbl">LIMIT without ORDER BY cuts an ARBITRARY set of rows — order first, then cut.</text>' +
		'<defs>' +
		'<marker id="dgArrowDBSW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'select-where',
		title: 'SELECT & WHERE: Asking Precise Questions',
		nav: 'SELECT & WHERE',
		difficulty: 'Easy',
		category: 'SQL: Foundations',
		task: 'Write five SQL queries — predicates, two-key ORDER BY, IN, IS NULL, DISTINCT, LIMIT — that return exactly the pinned row sets from a live players table.',

		prose: [
			'<h2>SELECT &amp; WHERE: Asking Precise Questions</h2>' +
			'<p>An esports league ships a recruiting dashboard. The “free agents” ' +
			'panel — players with no team — renders empty, even though two players ' +
			'plainly have <code>team</code> unset. The query behind it says ' +
			'<code>WHERE team = NULL</code>, and in most databases that is not an ' +
			'error: it is a query that <em>silently matches nothing</em>, forever. ' +
			'Meanwhile the leaderboard flickers on refresh — two players are tied ' +
			'at 92 and the query never told the engine how to break the tie. Both ' +
			'bugs are cured by the same skill: saying exactly what you mean in the ' +
			'read path.</p>' +
			'<ul>' +
			'<li><strong><code>WHERE</code> is a per-row predicate.</strong> ' +
			'Comparisons (<code>=</code>, <code>&lt;&gt;</code>, <code>&gt;</code>…) ' +
			'combined with <code>AND</code>/<code>OR</code>/<code>NOT</code>; the row ' +
			'survives only if the whole expression is true.</li>' +
			'<li><strong>NULL poisons comparisons.</strong> SQL logic has three ' +
			'values: true, false, <em>unknown</em>. <code>team = NULL</code> is ' +
			'unknown for every row — including rows where team IS null — so nothing ' +
			'matches. The only correct spellings are <code>IS NULL</code> and ' +
			'<code>IS NOT NULL</code>. (bytdb is stricter than most: it refuses ' +
			'<code>= NULL</code> outright with <code>cannot compare with NULL; use ' +
			'IS [NOT] NULL</code> — kinder than the silent empty result Postgres ' +
			'gives you.)</li>' +
			'<li><strong><code>IN (a, b)</code></strong> is sugar for a chain of ' +
			'<code>OR</code>-ed equalities — one predicate, many acceptable values.</li>' +
			'<li><strong><code>ORDER BY</code> takes a key list.</strong> ' +
			'<code>ORDER BY score DESC, name ASC</code> sorts by score, and the ' +
			'second key exists purely to break the first key&#39;s ties. Without it, ' +
			'tied rows come back in whatever order the engine pleases — correct ' +
			'today, different tomorrow.</li>' +
			'<li><strong><code>DISTINCT</code></strong> collapses duplicate result ' +
			'rows after the columns are picked; <strong><code>LIMIT</code></strong> ' +
			'cuts the result <em>after</em> the sort — which is why LIMIT without ' +
			'ORDER BY is a bug pattern, not a feature.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>The harness seeds this table — a real bytdb table; your strings are ' +
			'executed as-is against the engine and the actual row sets compared:</p>',
			{ lang: 'sql', code: "CREATE TABLE players (\n  id    SERIAL PRIMARY KEY,\n  name  TEXT NOT NULL,\n  team  TEXT,           -- NULL = free agent (no team)\n  score INT NOT NULL\n);\nINSERT INTO players (name, team, score) VALUES\n  ('cass', 'red',   92),   -- note: cass is inserted BEFORE ada…\n  ('bo',   'blue',  85),\n  ('ada',  'red',   92),   -- …but ties at 92 with her\n  ('dev',  'green', 71),\n  ('eli',  NULL,    88),   -- free agent\n  ('fay',  'blue',  64),\n  ('gus',  NULL,    77);   -- free agent" },
			'<h3>Your job</h3>' +
			'<p>Implement the five functions on the right; each returns one SQL ' +
			'string. Column lists and ordering matter — the harness compares the ' +
			'full rendered row set (e.g. <code>[[ada 92] [cass 92]]</code>), so ' +
			'<code>SELECT *</code> where two columns were asked for is a wrong ' +
			'answer, and an unordered result that happens to look right today is ' +
			'exactly the flickering-dashboard bug above.</p>' +
			'<div class="tip">The seed order is adversarial on purpose: ' +
			'<code>cass</code> is stored before <code>ada</code>, so a leaderboard ' +
			'sorted by score alone puts the 92-tie in storage order — ' +
			'<code>cass</code> first — and fails. Only the second sort key gets ' +
			'<code>ada</code> in front.</div>',
		],

		starter: [
			'package main',
			'',
			'// Each function returns ONE SQL string; the harness executes it',
			'// verbatim against a live players table (schema and seed data are in',
			'// the prose) and compares the full result — selected columns, row',
			'// order, everything.',
			'',
			'// QueryRedHighScorers: name and score of red-team players with',
			'// score > 80, alphabetical by name.',
			'//   want: [[ada 92] [cass 92]]',
			'func QueryRedHighScorers() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// QueryLeaderboard: top 3 players (name, score), highest score first,',
			'// ties broken alphabetically by name. One sort key is NOT enough:',
			'// cass and ada tie at 92, and storage order puts cass first.',
			'//   want: [[ada 92] [cass 92] [eli 88]]',
			'func QueryLeaderboard() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// QueryBlueGreenNames: names of everyone on the blue OR green team,',
			'// alphabetical. Use IN — one predicate, a set of acceptable values —',
			'// rather than chained ORs.',
			'//   want: [[bo] [dev] [fay]]',
			'func QueryBlueGreenNames() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// QueryFreeAgents: name and score of players with NO team, highest',
			'// score first. Careful: team = NULL is the dashboard bug from the',
			'// prose — NULL needs its own operator.',
			'//   want: [[eli 88] [gus 77]]',
			'func QueryFreeAgents() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// QueryTeams: every team name that exists, once each, alphabetical —',
			'// and free agents are not a team, so NULL must not appear.',
			'//   want: [[blue] [green] [red]]',
			'func QueryTeams() string {',
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
			'	db, cleanup := openDB("select-where")',
			'	defer cleanup()',
			'',
			'	// Seed deliberately adversarial data: cass stored BEFORE ada so a',
			'	// single-key sort exposes the missing tiebreak, and two NULL teams',
			'	// so = NULL vs IS NULL produce visibly different answers.',
			'	mustExec(db, `CREATE TABLE players (',
			'		id    SERIAL PRIMARY KEY,',
			'		name  TEXT NOT NULL,',
			'		team  TEXT,',
			'		score INT NOT NULL',
			'	)`)',
			'	mustExec(db, `INSERT INTO players (name, team, score) VALUES',
			'		(\'cass\', \'red\', 92),',
			'		(\'bo\', \'blue\', 85),',
			'		(\'ada\', \'red\', 92),',
			'		(\'dev\', \'green\', 71),',
			'		(\'eli\', NULL, 88),',
			'		(\'fay\', \'blue\', 64),',
			'		(\'gus\', NULL, 77)`)',
			'',
			'	type tc struct {',
			'		name string',
			'		fn   func() string',
			'		want string',
			'	}',
			'	// want strings are pinned from live runs of the reference queries',
			'	// against this exact seed — the engine\'s own row renderings.',
			'	cases := []tc{',
			'		{"red team, score > 80, by name (WHERE + AND)",',
			'			QueryRedHighScorers, "[[ada 92] [cass 92]]"},',
			'		{"top 3 by score DESC, 92-tie broken by name (two-key ORDER BY + LIMIT)",',
			'			QueryLeaderboard, "[[ada 92] [cass 92] [eli 88]]"},',
			'		{"blue or green team members, by name (IN)",',
			'			QueryBlueGreenNames, "[[bo] [dev] [fay]]"},',
			'		{"free agents by score DESC — only IS NULL can see them",',
			'			QueryFreeAgents, "[[eli 88] [gus 77]]"},',
			'		{"each team once, alphabetical, no NULL row (DISTINCT + IS NOT NULL)",',
			'			QueryTeams, "[[blue] [green] [red]]"},',
			'	}',
			'',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			// A bad string (empty, misspelled, or the = NULL trap,',
			'			// which bytdb rejects) surfaces as the engine\'s error in',
			'			// "got" — this one case fails, the rest still run.',
			'			res, err := db.Exec(c.fn())',
			'			if err != nil {',
			'				r["pass"] = false',
			'				r["got"] = "exec error: " + err.Error()',
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
			'// Two predicates ANDed; the engine evaluates them per row (see the',
			'// pipeline diagram: WHERE runs before columns are picked). ORDER BY',
			'// name makes the answer deterministic — never let "it happened to',
			'// come back sorted" stand in for "I asked for sorted".',
			'func QueryRedHighScorers() string {',
			'	return `SELECT name, score FROM players',
			'		WHERE team = \'red\' AND score > 80',
			'		ORDER BY name`',
			'}',
			'',
			'// The second sort key is the whole lesson: score DESC alone leaves',
			'// the 92-tie in storage order (cass before ada), and storage order',
			'// is an implementation detail, not a promise. LIMIT cuts AFTER the',
			'// sort — top-N only means something once the order is total.',
			'func QueryLeaderboard() string {',
			'	return `SELECT name, score FROM players',
			'		ORDER BY score DESC, name ASC',
			'		LIMIT 3`',
			'}',
			'',
			'// IN is a set-membership predicate — semantically a chain of ORs,',
			'// but it states the intent (one column, several acceptable values)',
			'// in a form the planner can also turn into index probes later.',
			'func QueryBlueGreenNames() string {',
			'	return `SELECT name FROM players',
			'		WHERE team IN (\'blue\', \'green\')',
			'		ORDER BY name`',
			'}',
			'',
			'// IS NULL, not = NULL: in three-valued logic NULL = NULL is UNKNOWN,',
			'// so an equality can never find the free agents. bytdb refuses the',
			'// bad spelling loudly; Postgres would run it and return nothing —',
			'// the worse failure, because it looks like an answer.',
			'func QueryFreeAgents() string {',
			'	return `SELECT name, score FROM players',
			'		WHERE team IS NULL',
			'		ORDER BY score DESC`',
			'}',
			'',
			'// DISTINCT dedups the picked column; the IS NOT NULL filter runs',
			'// first (pipeline order), so the NULL "team" never reaches the',
			'// dedup at all — free agents are the absence of a team, not a team',
			'// named NULL.',
			'func QueryTeams() string {',
			'	return `SELECT DISTINCT team FROM players',
			'		WHERE team IS NOT NULL',
			'		ORDER BY team`',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Three-valued logic, the honest version</h3>' +
			'<p>Every SQL comparison can yield true, false, or <em>unknown</em>, and ' +
			'anything compared with NULL is unknown — including <code>NULL = ' +
			'NULL</code>. WHERE keeps only rows where the predicate is <em>true</em>, ' +
			'so unknown behaves like false there… but not everywhere: <code>NOT ' +
			'unknown</code> is still unknown, which is why <code>WHERE team &lt;&gt; ' +
			'\'red\'</code> also drops the free agents — a second, subtler serving of ' +
			'the same trap. Postgres and MySQL execute <code>= NULL</code> without ' +
			'complaint and return zero rows; bytdb chose to reject it at parse time ' +
			'(<code>cannot compare with NULL; use IS [NOT] NULL</code>). Rejecting a ' +
			'legal-but-never-what-you-meant construct is a real design stance — ' +
			'MySQL took a similar one with its non-standard <code>&lt;=&gt;</code> ' +
			'null-safe operator, and the standard itself later added <code>IS NOT ' +
			'DISTINCT FROM</code> for the same reason.</p>' +
			'<h3>Underspecified ORDER BY is a production bug, not a style issue</h3>' +
			'<p>The flickering leaderboard is real and common: rows tied on the sort ' +
			'key come back in whatever order the executor produced them, and that ' +
			'order changes with the plan, the page cache, even a VACUUM. It turns ' +
			'ugly when pagination enters: <code>ORDER BY score DESC LIMIT 20</code> ' +
			'then <code>OFFSET 20</code> for page two can show a tied row twice or ' +
			'never, because each page re-ran an under-determined sort. The fix is ' +
			'the one this problem forced: append a unique tiebreak key ' +
			'(<code>name</code> here; in real systems, usually the primary key) so ' +
			'the order is total. CockroachDB&#39;s docs call this out explicitly; ' +
			'Postgres will happily let you learn it from a bug report.</p>' +
			'<h3>What the engine does with these predicates</h3>' +
			'<p>Today every one of your queries is a sequential scan — bytdb walks ' +
			'all seven rows and applies the WHERE to each, which the pipeline ' +
			'diagram renders literally. That is fine at 7 rows and a fire at 70 ' +
			'million: the <em>secondary indexes</em> item later in this track ' +
			'revisits these same predicate shapes with <code>EXPLAIN</code>, where ' +
			'<code>team IN (\'blue\', \'green\')</code> becomes index probes and the ' +
			'two-key ORDER BY can vanish entirely into an index&#39;s own ordering. ' +
			'The habits you just practiced — exact columns, total order, ' +
			'NULL-explicit predicates — are also what make queries ' +
			'<em>indexable</em> later.</p>' +
			'<div class="tip">DISTINCT vs GROUP BY: <code>SELECT DISTINCT team</code> ' +
			'and <code>SELECT team … GROUP BY team</code> return the same rows, and ' +
			'planners often execute them identically. Reach for DISTINCT when you ' +
			'mean “dedup this column list”, GROUP BY when aggregates are coming — ' +
			'which is exactly where this track goes two items from now.</div>',
		],
		complexity: { time: 'O(n log n) — each query is a full scan of n rows plus a sort for ORDER BY; later items make these index-assisted', space: 'O(rows returned)' },
	});
})();
