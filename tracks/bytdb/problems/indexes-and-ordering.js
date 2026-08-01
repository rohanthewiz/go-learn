/* Indexes & Order-Aware Selection — Planner (Hard). CREATE INDEX as plan
 * surgery, watched through EXPLAIN before/after: a composite UNIQUE index
 * turns a two-predicate Filter into an Index Cond carrying both columns
 * (and rejects duplicate (sensor, ts) pairs with `unique index violation`),
 * and a DESC index absorbs ORDER BY ts DESC LIMIT n entirely — Limit over
 * a forward Index Scan, no Sort node anywhere. Plan shapes and the error
 * string are pinned from live runs at the pinned version.
 */
(function () {
	'use strict';
	var T = GoLearnBY;

	// An index is a sorted sub-keyspace: probes descend, order falls out.
	// Marker ids namespaced dgArrowBY07*.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 234" width="560" height="234" role="img" aria-label="a secondary index is a sorted copy of chosen columns: a composite index on sensor,ts serves equality on both by descending; a DESC index on ts stores newest-first so ORDER BY ts DESC LIMIT n reads the first n entries with no sort">' +
		'<text x="20" y="22" class="lbl">readings_sensor_ts: sorted by (sensor, ts) — probe descends, no scan</text>' +
		'<rect x="20" y="34" width="200" height="112" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="120" y="54" text-anchor="middle" class="lbl">(boiler-1, 110) → id 1</text>' +
		'<text x="120" y="72" text-anchor="middle" class="lbl" style="fill:var(--warn)">(boiler-1, 210) → id 4</text>' +
		'<text x="120" y="90" text-anchor="middle" class="lbl">(boiler-1, 310) → id 7</text>' +
		'<text x="120" y="108" text-anchor="middle" class="lbl">(boiler-2, 120) → id 2</text>' +
		'<text x="120" y="126" text-anchor="middle" class="lbl">(pump-1, 130) → id 3 ...</text>' +
		'<path d="M 280 70 L 226 70" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowBY07w)"/>' +
		'<text x="286" y="66" class="lbl" style="fill:var(--warn)">WHERE sensor=\'boiler-1\' AND ts=210</text>' +
		'<text x="286" y="82" class="lbl" style="fill:var(--warn)">Index Cond: both columns, one descent</text>' +
		'<text x="286" y="106" class="lbl">UNIQUE: a second (boiler-1, 210)</text>' +
		'<text x="286" y="122" class="lbl">entry cannot be written —</text>' +
		'<text x="286" y="138" class="lbl">"unique index violation"</text>' +
		'<line x1="20" y1="158" x2="540" y2="158" stroke="var(--edge)" stroke-width="1" stroke-dasharray="4 4"/>' +
		'<text x="20" y="180" class="lbl">latest_idx (ts DESC): stored newest-first → ORDER BY ts DESC LIMIT 3</text>' +
		'<rect x="20" y="190" width="330" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.8"/>' +
		'<text x="185" y="209" text-anchor="middle" class="lbl">330 → 310 → 230 → [stop: LIMIT hit] 220, 210, ...</text>' +
		'<text x="366" y="203" class="lbl">read 3 entries, done.</text>' +
		'<text x="366" y="219" class="lbl">no Sort node exists</text>' +
		'<defs>' +
		'<marker id="dgArrowBY07w" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'indexes-and-ordering',
		title: 'Indexes & Order-Aware Selection',
		nav: 'indexes and ordering',
		difficulty: 'Hard',
		category: 'Planner',
		task: 'Design two indexes for a sensor-readings workload — a composite UNIQUE arbiter and a DESC index that absorbs ORDER BY ... LIMIT — and verify through EXPLAIN that the Filter becomes an Index Cond and the Sort node disappears.',

		prose: [
			'<h2>Indexes &amp; order-aware selection</h2>' +
			'<p>A telemetry service stores sensor readings and serves two hot ' +
			'queries: “the reading from sensor X at tick T” (the dedupe check on ' +
			'ingest) and “the latest N readings” (the dashboard). Both currently ' +
			'walk the whole table — EXPLAIN says so: a <code>Seq Scan</code> with ' +
			'a <code>Filter</code>, and a <code>Sort</code> feeding the ' +
			'<code>Limit</code>. Also, last Tuesday the ingest path wrote the ' +
			'same (sensor, tick) twice; nothing stopped it. All three problems ' +
			'are index-shaped:</p>' +
			'<ul>' +
			'<li><strong>An index is a sorted copy of chosen columns</strong>, ' +
			'each entry pointing at its row, maintained inside the same atomic ' +
			'commit as every write. <code>CREATE INDEX name ON t (a, b)</code> ' +
			'sorts by a then b — so equality on <em>both</em> becomes a single ' +
			'descent, visible in EXPLAIN as the predicate moving out of ' +
			'<code>Filter:</code> (checked per scanned row) into ' +
			'<code>Index Cond:</code> (steers the scan itself).</li>' +
			'<li><strong><code>UNIQUE</code> makes the index an enforcer.</strong> ' +
			'The entry write fails if the key exists, atomically with the row ' +
			'write — the engine-side guarantee your ingest race needed. The ' +
			'error comes back as an ordinary Go error value: ' +
			'<code>unique index violation</code>.</li>' +
			'<li><strong>A <code>DESC</code> column stores the index in reverse ' +
			'order</strong> — and an index whose order matches the query\'s ' +
			'ORDER BY can <em>be</em> the sort. Under a LIMIT, bytdb\'s planner ' +
			'serves <code>ORDER BY ts DESC LIMIT 3</code> straight off a ' +
			'<code>(ts DESC)</code> index: read three entries, stop. The Sort ' +
			'node — which must consume <em>every</em> row before emitting one — ' +
			'vanishes from the plan.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>The harness seeds (ids 1–8, all ts values distinct):</p>',
			{ lang: 'sql', code: "CREATE TABLE readings (\n  id     SERIAL PRIMARY KEY,\n  sensor TEXT NOT NULL,\n  ts     INT NOT NULL,   -- tick\n  val    FLOAT NOT NULL\n);\nINSERT INTO readings (sensor, ts, val) VALUES\n  ('boiler-1',110,0.50), ('boiler-2',120,0.40), ('pump-1',130,1.10),\n  ('boiler-1',210,0.55), ('boiler-2',220,0.45), ('pump-1',230,1.20),\n  ('boiler-1',310,0.60), ('pump-1',330,1.30);" },
			'<h3>Your job</h3>' +
			'<p>Two DDL strings and two query strings, with the index names ' +
			'pinned (<code>readings_sensor_ts</code>, <code>latest_idx</code>) so ' +
			'the harness can read them in your plans. It EXPLAINs the lookup ' +
			'<em>before</em> your indexes (asserting the honest Seq Scan), ' +
			'applies your DDL, then asserts: both columns inside ' +
			'<code>Index Cond</code>; the duplicate insert refused with exactly ' +
			'<code>unique index violation</code>; and a latest-3 plan containing ' +
			'an <code>Index Scan</code> but no <code>Sort</code>, no ' +
			'<code>Seq Scan</code> — and no <code>Backward</code>.</p>' +
			'<div class="tip">That last assertion is the Hard part of this item: ' +
			'an <em>ascending</em> <code>(ts)</code> index can also serve the ' +
			'query — the planner walks it in reverse, shown as <code>Index Scan ' +
			'Backward</code> — but the workload is newest-first, so the index ' +
			'should be stored newest-first: declare the column <code>DESC</code> ' +
			'and the plan reads forward. Same result set; the declaration states ' +
			'which direction is the fast path you designed for.</div>',
		],

		starter: [
			'package main',
			'',
			'// Two DDL strings and two queries for the readings workload.',
			'// Index names are pinned: the harness looks for them in EXPLAIN.',
			'',
			'// DedupeIndexSQL: ONE statement creating an index named',
			'// readings_sensor_ts that (a) turns LookupQuerySQL\'s two-predicate',
			'// WHERE into a single Index Cond descent and (b) REJECTS a second',
			'// row with the same (sensor, ts) pair.',
			'//',
			'// CODE UNDER REVIEW: this index accelerates the lookup fine — but',
			'// re-read requirement (b). What kind of index also enforces?',
			'func DedupeIndexSQL() string {',
			'	return `CREATE INDEX readings_sensor_ts ON readings (sensor, ts)`',
			'}',
			'',
			'// LatestIndexSQL: ONE statement creating an index named latest_idx',
			'// that serves ORDER BY ts DESC LIMIT n reading FORWARD (stored',
			'// newest-first — mind the tip about Backward scans).',
			'func LatestIndexSQL() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// LookupQuerySQL: the ingest dedupe check — the id of the reading',
			'// from sensor \'boiler-1\' at ts 210.',
			'//   want: [[4]]',
			'func LookupQuerySQL() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// LatestQuerySQL: the dashboard — id and ts of the 3 newest',
			'// readings, newest first.',
			'//   want: [[8 330] [7 310] [6 230]]',
			'func LatestQuerySQL() string {',
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
			'// explainStr renders EXPLAIN output as one newline-joined string so',
			'// cases can assert stable substrings of the real plan.',
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
			'	db, cleanup := openDB("by-indexes-ordering")',
			'	defer cleanup()',
			'',
			'	mustExec(db, `CREATE TABLE readings (',
			'		id     SERIAL PRIMARY KEY,',
			'		sensor TEXT NOT NULL,',
			'		ts     INT NOT NULL,',
			'		val    FLOAT NOT NULL',
			'	)`)',
			'	// All ts distinct so the newest-3 answer is total without a',
			'	// tiebreak (a tie under LIMIT would make the want string depend',
			'	// on which plan ran — exactly the nondeterminism real dashboards',
			'	// hit, kept out of the test on purpose).',
			'	mustExec(db, `INSERT INTO readings (sensor, ts, val) VALUES',
			'		(\'boiler-1\', 110, 0.50), (\'boiler-2\', 120, 0.40), (\'pump-1\', 130, 1.10),',
			'		(\'boiler-1\', 210, 0.55), (\'boiler-2\', 220, 0.45), (\'pump-1\', 230, 1.20),',
			'		(\'boiler-1\', 310, 0.60), (\'pump-1\', 330, 1.30)`)',
			'',
			'	results := make([]map[string]any, 0, 7)',
			'	newCase := func(name, want string) map[string]any {',
			'		r := map[string]any{"input": name, "want": want}',
			'		results = append(results, r)',
			'		return r',
			'	}',
			'',
			'	// Case 1: the before picture — no indexes yet, so the lookup is',
			'	// an honest full scan with a per-row Filter.',
			'	r := newCase("EXPLAIN lookup BEFORE any index: Seq Scan + Filter", "plan contains \\"Seq Scan on readings\\" and \\"Filter:\\"")',
			'	runCase(r, func() {',
			'		plan, err := explainStr(db, LookupQuerySQL())',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "explain error: " + err.Error()',
			'			return',
			'		}',
			'		r["pass"] = strings.Contains(plan, "Seq Scan on readings") && strings.Contains(plan, "Filter:")',
			'		r["got"] = plan',
			'	})',
			'',
			'	// Case 2: apply the learner\'s indexes. Creation itself must',
			'	// succeed — including building entries for the 8 existing rows.',
			'	r = newCase("both CREATE INDEX statements apply cleanly", "2 indexes created")',
			'	runCase(r, func() {',
			'		if _, err := db.Exec(DedupeIndexSQL()); err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "DedupeIndexSQL: " + err.Error()',
			'			return',
			'		}',
			'		if _, err := db.Exec(LatestIndexSQL()); err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "LatestIndexSQL: " + err.Error()',
			'			return',
			'		}',
			'		r["pass"] = true',
			'		r["got"] = "2 indexes created"',
			'	})',
			'',
			'	// Case 3: the after picture — the SAME lookup string now plans as',
			'	// an index descent, with BOTH predicates inside Index Cond (a',
			'	// sensor-only index would leave ts behind in a Filter line).',
			'	r = newCase("EXPLAIN lookup AFTER: Index Cond carries sensor AND ts, no Filter", "Index Scan using readings_sensor_ts; Index Cond has sensor and ts")',
			'	runCase(r, func() {',
			'		plan, err := explainStr(db, LookupQuerySQL())',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "explain error: " + err.Error()',
			'			return',
			'		}',
			'		r["pass"] = strings.Contains(plan, "Index Scan using readings_sensor_ts") &&',
			'			strings.Contains(plan, "Index Cond:") &&',
			'			strings.Contains(plan, "sensor = ") && strings.Contains(plan, "ts = ") &&',
			'			!strings.Contains(plan, "Filter:")',
			'		r["got"] = plan',
			'	})',
			'',
			'	// Case 4: the lookup still answers correctly through the index.',
			'	r = newCase("lookup row set", "[[4]]")',
			'	runCase(r, func() {',
			'		res, err := db.Exec(LookupQuerySQL())',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "exec error: " + err.Error()',
			'			return',
			'		}',
			'		r["pass"] = rowsStr(res) == "[[4]]"',
			'		r["got"] = rowsStr(res)',
			'	})',
			'',
			'	// Case 5: the enforcer. A second (boiler-1, 210) must be REFUSED',
			'	// — an error value with the engine\'s exact message, and the row',
			'	// count unchanged. (Errors come back as values; nothing panics.)',
			'	r = newCase("duplicate (sensor, ts) insert is refused", "error \\"unique index violation\\", still 8 rows")',
			'	runCase(r, func() {',
			'		_, err := db.Exec("INSERT INTO readings (sensor, ts, val) VALUES (\'boiler-1\', 210, 0.99)")',
			'		if err == nil {',
			'			r["pass"] = false',
			'			r["got"] = "duplicate insert SUCCEEDED — the index does not enforce uniqueness"',
			'			return',
			'		}',
			'		res := mustExec(db, "SELECT COUNT(*) FROM readings")',
			'		got := fmt.Sprintf("error %q, still %v rows", err.Error(), res.Rows[0][0])',
			'		r["pass"] = got == "error \\"unique index violation\\", still 8 rows"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 6: order-aware selection — the LIMIT query reads the DESC',
			'	// index forward and stops. No Sort node (which would buffer all 8',
			'	// rows), no Seq Scan, and no Backward walk of an ASC index.',
			'	r = newCase("EXPLAIN latest-3: Index Scan on latest_idx, no Sort, forward", "contains \\"Index Scan using latest_idx\\"; no Sort, no Seq Scan, no Backward")',
			'	runCase(r, func() {',
			'		plan, err := explainStr(db, LatestQuerySQL())',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "explain error: " + err.Error()',
			'			return',
			'		}',
			'		r["pass"] = strings.Contains(plan, "Index Scan using latest_idx") &&',
			'			!strings.Contains(plan, "Sort") &&',
			'			!strings.Contains(plan, "Seq Scan") &&',
			'			!strings.Contains(plan, "Backward")',
			'		r["got"] = plan',
			'	})',
			'',
			'	// Case 7: and the dashboard answer itself, newest first.',
			'	r = newCase("latest-3 row set", "[[8 330] [7 310] [6 230]]")',
			'	runCase(r, func() {',
			'		res, err := db.Exec(LatestQuerySQL())',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "exec error: " + err.Error()',
			'			return',
			'		}',
			'		r["pass"] = rowsStr(res) == "[[8 330] [7 310] [6 230]]"',
			'		r["got"] = rowsStr(res)',
			'	})',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// UNIQUE is the load-bearing word. Without it the index is only an',
			'// accelerator; with it, writing the index entry fails when the key',
			'// exists — checked inside the same atomic commit as the row write,',
			'// so no interleaving of two ingesters can slip a duplicate through.',
			'// Column order (sensor, ts) also matters for reads: the index sorts',
			'// by sensor first, so equality on sensor narrows to one run and',
			'// equality on ts lands inside it — both predicates become one',
			'// descent. (ts, sensor) would serve the lookup too, but (sensor,',
			'// ts) additionally serves sensor-only prefixes, e.g. "all of',
			'// boiler-1" — composite indexes are prefix-usable, left to right.',
			'func DedupeIndexSQL() string {',
			'	return `CREATE UNIQUE INDEX readings_sensor_ts ON readings (sensor, ts)`',
			'}',
			'',
			'// DESC stores the entries newest-first, so the dashboard\'s scan',
			'// direction is the index\'s storage direction: forward, stop at 3.',
			'// A plain (ts) index yields the same rows via an Index Scan',
			'// Backward — correct, but the declaration should match the hot',
			'// direction the workload was designed around; this item pins that',
			'// design intent by rejecting the Backward plan.',
			'func LatestIndexSQL() string {',
			'	return `CREATE INDEX latest_idx ON readings (ts DESC)`',
			'}',
			'',
			'// The dedupe check. Both predicates are equalities on the index\'s',
			'// columns, in prefix order — exactly the shape Index Cond can',
			'// swallow whole.',
			'func LookupQuerySQL() string {',
			'	return `SELECT id FROM readings WHERE sensor = \'boiler-1\' AND ts = 210`',
			'}',
			'',
			'// The dashboard. ORDER BY ts DESC matches latest_idx\'s stored',
			'// order, and the LIMIT is what lets the planner take the order-',
			'// serving scan: read 3 entries, hop to their rows, done — O(k)',
			'// instead of sort-everything O(n log n).',
			'func LatestQuerySQL() string {',
			'	return `SELECT id, ts FROM readings ORDER BY ts DESC LIMIT 3`',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What CREATE INDEX physically does</h3>' +
			'<p>bytdb\'s tables live in an ordered key space keyed by primary ' +
			'key; a secondary index is a second family of keys in that same ' +
			'space: the indexed column values (encoded order-preservingly, DESC ' +
			'columns byte-inverted so the key space\'s one sort order yields the ' +
			'reversed column), suffixed with the primary key they point at. ' +
			'CREATE INDEX scans the table once to build entries for existing ' +
			'rows — case 2 exercised that backfill — and from then on every ' +
			'INSERT, UPDATE, and DELETE maintains its entries <em>in the same ' +
			'atomic commit</em> as the row. That co-commitment is why a UNIQUE ' +
			'index can be an integrity constraint rather than a best-effort ' +
			'check, and it is also the write tax: each index turns one logical ' +
			'row write into an extra key write. Indexes are bought with write ' +
			'amplification and paid back in read selectivity — never free.</p>' +
			'<h3>Index Cond vs Filter is the whole diagnosis</h3>' +
			'<p>The two plan lines look similar and could not be more different. ' +
			'<code>Index Cond</code> steers the descent: the engine never visits ' +
			'entries outside the matching range, so cost scales with matches. ' +
			'<code>Filter</code> is applied to every row the scan produces: cost ' +
			'scales with rows scanned. A composite index that matches only the ' +
			'leading predicate shows the split plainly — <code>sensor</code> in ' +
			'Index Cond, <code>ts</code> demoted to Filter — still faster than a ' +
			'Seq Scan, but reading all of boiler-1 to keep one tick. Case 3\'s ' +
			'assertion that <em>no</em> Filter line survives is the strictest ' +
			'form of “the index fits the query”.</p>' +
			'<h3>Sorting is the quiet killer LIMIT exposes</h3>' +
			'<p>A Sort node must consume its entire input before emitting the ' +
			'first row — under <code>LIMIT 3</code> that means sorting all n ' +
			'rows to keep three. The order-serving scan inverts the economics: ' +
			'O(3) reads regardless of n, because the order was precomputed at ' +
			'write time. This is the trade behind every feed, leaderboard, and ' +
			'“recent items” endpoint you have ever used. One honest planner ' +
			'quirk to keep in mind: bytdb takes the order-serving scan only ' +
			'under a LIMIT — a full-table ORDER BY still plans as Sort over Seq ' +
			'Scan, a defensible call, since reading a whole index plus row hops ' +
			'can lose to one scan-and-sort. And when you have both a DESC and an ' +
			'ASC index on the same column, remember the planner may serve either ' +
			'direction from either index (Backward scans); declare the direction ' +
			'you designed for, as this item did, so the fast path is the stored ' +
			'path.</p>',
		],
		complexity: { time: 'O(log n) per unique probe/lookup; O(k) for the order-serving LIMIT k scan vs O(n log n) for Sort; O(n) once to backfill each index', space: 'O(n) per index — a sorted copy of its columns, maintained on every write' },
	});
})();
