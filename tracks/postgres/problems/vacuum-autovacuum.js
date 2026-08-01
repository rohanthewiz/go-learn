/* VACUUM: Reclaiming the Dead — Maintenance (Easy). MVCC leaves dead tuple
 * versions in the heap; autovacuum decides per table when to clean them with
 * one documented formula: vacuum when deadTuples > threshold + scaleFactor ×
 * reltuples (analyze analogously, over rows modified). The harness pins the
 * strict inequality, the small-table and big-table regimes, and a
 * which-tables-fire pass over pg_stat_user_tables-shaped stats.
 */
(function () {
	'use strict';
	var T = GoLearnPG;

	// The trigger line: a base threshold plus a slope proportional to table
	// size. Small tables cross it quickly; huge tables can carry millions of
	// dead tuples while staying under it. Marker id namespaced (dgArrowPG04)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 200" width="560" height="200" role="img" aria-label="autovacuum trigger: dead tuples must exceed threshold plus scale factor times reltuples; the line rises with table size so big tables accumulate more dead tuples before firing">' +
		'<text x="20" y="24" class="lbl">the trigger line rises with table size: dead &gt; threshold + scale × reltuples</text>' +
		// axes
		'<line x1="50" y1="160" x2="530" y2="160" stroke="var(--edge)" stroke-width="1.5"/>' +
		'<line x1="50" y1="160" x2="50" y2="40" stroke="var(--edge)" stroke-width="1.5"/>' +
		'<text x="290" y="184" text-anchor="middle" class="lbl">reltuples (table size)</text>' +
		'<text x="24" y="100" text-anchor="middle" class="lbl" transform="rotate(-90 24 100)">dead tuples</text>' +
		// trigger line: base offset + slope
		'<line x1="50" y1="148" x2="510" y2="56" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="392" y="52" class="lbl" style="fill:var(--accent)">vacuum fires above this line</text>' +
		// small table point (above line, near origin)
		'<circle cx="120" cy="108" r="5" fill="var(--warn)"/>' +
		'<text x="120" y="96" text-anchor="middle" class="lbl" style="fill:var(--warn)">small table: fires fast</text>' +
		// big table point (below line, far right)
		'<circle cx="440" cy="120" r="5" fill="var(--warn)"/>' +
		'<path d="M 440 114 L 440 78" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowPG04)"/>' +
		'<text x="440" y="140" text-anchor="middle" class="lbl" style="fill:var(--warn)">1B-row table: millions dead, still silent</text>' +
		'<defs><marker id="dgArrowPG04" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'vacuum-autovacuum',
		title: 'VACUUM: Reclaiming the Dead',
		nav: 'vacuum autovacuum',
		difficulty: 'Easy',
		category: 'Maintenance',
		task: 'Implement the autovacuum trigger formula — dead > threshold + scale × reltuples — its ANALYZE twin, and a which-tables-fire pass.',

		prose: [
			'<h2>VACUUM: Reclaiming the Dead</h2>' +
			'<p>Disk usage on the primary grows 2 GB a day, but the row counts are ' +
			'flat. <code>pg_stat_user_tables</code> shows the culprit: one table ' +
			'with <code>n_dead_tup</code> at 40 million and ' +
			'<code>last_autovacuum</code> three days old. Nothing is broken — ' +
			'autovacuum is doing exactly what its formula says, and for a table ' +
			'this large the formula says “not yet”. Because UPDATE and DELETE ' +
			'never remove tuples (MVCC keeps old versions for concurrent ' +
			'snapshots), something must eventually reclaim them, and the ' +
			'<em>when</em> is one line of arithmetic per table:</p>' +
			'<ul>' +
			'<li><strong>Vacuum trigger:</strong> <code>n_dead_tup &gt; ' +
			'autovacuum_vacuum_threshold + autovacuum_vacuum_scale_factor × ' +
			'reltuples</code> — defaults 50 and 0.2. The base threshold keeps ' +
			'tiny tables from being vacuumed on every other write; the scale term ' +
			'makes the bar proportional to table size.</li>' +
			'<li><strong>Analyze trigger:</strong> same shape over ' +
			'<em>modified</em> rows (inserted + updated + deleted since the last ' +
			'ANALYZE): <code>n_mod_since_analyze &gt; ' +
			'autovacuum_analyze_threshold + autovacuum_analyze_scale_factor × ' +
			'reltuples</code> — defaults 50 and 0.1. Stale statistics mean bad ' +
			'plans, so this one fires at half the churn.</li>' +
			'<li><strong>Strictly greater.</strong> Landing exactly on the ' +
			'threshold does not fire — a detail that matters when you reason ' +
			'about test cases and about “why hasn’t it run yet”.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>NeedsVacuum</code> and <code>NeedsAnalyze</code> ' +
			'(the two inequalities — the harness passes the GUC values in), and ' +
			'<code>TablesToVacuum</code>, which walks a slice of per-table stats ' +
			'in order and returns the names that currently qualify.</p>',
			{ lang: 'txt', code: 'defaults: threshold 50, scale_factor 0.2\n\nsessions   reltuples 100          bar = 50 + 20        = 70\nusers      reltuples 1,000,000    bar = 50 + 200,000   = 200,050\narchive    reltuples 10,000,000   bar = 50 + 2,000,000 = 2,000,050\n                                  2M dead tuples on archive: still under the bar' },
			'<div class="tip">The formula is why per-table tuning exists: on a ' +
			'billion-row table the default 20% bar means 200 million dead tuples ' +
			'before autovacuum stirs. The standard fix is ' +
			'<code>ALTER TABLE big SET (autovacuum_vacuum_scale_factor = 0, ' +
			'autovacuum_vacuum_threshold = 100000)</code> — a flat trigger, ' +
			'decoupled from size.</div>',
		],

		starter: [
			'package main',
			'',
			'// TableStats mirrors the columns autovacuum reads from the stats',
			'// collector (pg_stat_user_tables / pg_class.reltuples).',
			'type TableStats struct {',
			'	Name            string',
			'	Reltuples       int // planner\'s row-count estimate for the table',
			'	DeadTuples      int // n_dead_tup',
			'	ModSinceAnalyze int // n_mod_since_analyze',
			'}',
			'',
			'// NeedsVacuum: does deadTuples exceed threshold + scaleFactor *',
			'// reltuples? Strictly greater — equal does not fire.',
			'func NeedsVacuum(deadTuples, reltuples, threshold int, scaleFactor float64) bool {',
			'	// your code here (this ignores the scale term — the bug to fix)',
			'	return deadTuples > threshold',
			'}',
			'',
			'// NeedsAnalyze: the same inequality over rows modified since the',
			'// last ANALYZE.',
			'func NeedsAnalyze(modSinceAnalyze, reltuples, threshold int, scaleFactor float64) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// TablesToVacuum returns, in input order, the names of the tables',
			'// whose stats currently satisfy NeedsVacuum.',
			'func TablesToVacuum(stats []TableStats, threshold int, scaleFactor float64) []string {',
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
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// The fleet: a hot small table, a mid-size table over its bar, a',
			'	// quiet mid-size table, and the classic huge table sitting on 2M',
			'	// dead tuples without qualifying.',
			'	fleet := []TableStats{',
			'		{Name: "users", Reltuples: 1000000, DeadTuples: 250000, ModSinceAnalyze: 30000},',
			'		{Name: "events", Reltuples: 1000000, DeadTuples: 10000, ModSinceAnalyze: 5000},',
			'		{Name: "sessions", Reltuples: 100, DeadTuples: 200, ModSinceAnalyze: 90},',
			'		{Name: "archive", Reltuples: 10000000, DeadTuples: 2000000, ModSinceAnalyze: 100},',
			'	}',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"small table (100 rows): bar is 50 + 0.2*100 = 70; 71 dead fires",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", NeedsVacuum(71, 100, 50, 0.2)) }},',
			'		{"exactly on the bar (70 dead of 100 rows): strictly greater — no fire",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", NeedsVacuum(70, 100, 50, 0.2)) }},',
			'		{"1M-row table: 200,050 dead is exactly the bar — still no fire",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", NeedsVacuum(200050, 1000000, 50, 0.2)) }},',
			'		{"1M-row table: one more dead tuple (200,051) fires",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", NeedsVacuum(200051, 1000000, 50, 0.2)) }},',
			'		{"analyze fires at half the churn: 151 modified of 1000 rows (bar 150)",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", NeedsAnalyze(151, 1000, 50, 0.1)) }},',
			'		{"analyze: 150 modified of 1000 rows is on the bar — no fire",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", NeedsAnalyze(150, 1000, 50, 0.1)) }},',
			'		{"fleet pass: users (25%% dead) and sessions (200 of 100!) fire; archive\'s 2M dead stay under its 2,000,050 bar",',
			'			"users,sessions",',
			'			func() string { return strings.Join(TablesToVacuum(fleet, 50, 0.2), ",") }},',
			'		{"tuned fleet: scale_factor 0 with a flat 100k threshold finally catches archive (and drops tiny sessions)",',
			'			"users,archive",',
			'			func() string { return strings.Join(TablesToVacuum(fleet, 100000, 0), ",") }},',
			'		{"empty fleet: nothing to do",',
			'			"",',
			'			func() string { return strings.Join(TablesToVacuum(nil, 50, 0.2), ",") }},',
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
			'// TableStats mirrors the columns autovacuum reads from the stats',
			'// collector (pg_stat_user_tables / pg_class.reltuples).',
			'type TableStats struct {',
			'	Name            string',
			'	Reltuples       int // planner\'s row-count estimate for the table',
			'	DeadTuples      int // n_dead_tup',
			'	ModSinceAnalyze int // n_mod_since_analyze',
			'}',
			'',
			'// NeedsVacuum: the documented trigger, computed in float64 because',
			'// the scale term is fractional. The comparison is strict (>) to',
			'// match the server\'s formula — "dead tuples exceed the bar", not',
			'// "reach it". Both operands are exact for realistic magnitudes',
			'// (float64 holds integers exactly up to 2^53), so the only',
			'// imprecision is the scale multiplication itself — same as in the',
			'// server, which also computes this in floating point.',
			'func NeedsVacuum(deadTuples, reltuples, threshold int, scaleFactor float64) bool {',
			'	bar := float64(threshold) + scaleFactor*float64(reltuples)',
			'	return float64(deadTuples) > bar',
			'}',
			'',
			'// NeedsAnalyze: identical shape over modified-since-analyze rows.',
			'// Kept as a separate function rather than a shared helper with a',
			'// mode flag: the two triggers have independent GUC pairs and drift',
			'// independently in real configs, so the code mirrors that.',
			'func NeedsAnalyze(modSinceAnalyze, reltuples, threshold int, scaleFactor float64) bool {',
			'	bar := float64(threshold) + scaleFactor*float64(reltuples)',
			'	return float64(modSinceAnalyze) > bar',
			'}',
			'',
			'// TablesToVacuum preserves input order — the real launcher also',
			'// works from a deterministic worklist, and order-stable output',
			'// keeps this testable without sorting.',
			'func TablesToVacuum(stats []TableStats, threshold int, scaleFactor float64) []string {',
			'	picked := make([]string, 0, len(stats))',
			'	for _, s := range stats {',
			'		if NeedsVacuum(s.DeadTuples, s.Reltuples, threshold, scaleFactor) {',
			'			picked = append(picked, s.Name)',
			'		}',
			'	}',
			'	return picked',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why a threshold plus a scale factor</h3>' +
			'<p>Either term alone fails. A flat threshold vacuums giant tables ' +
			'constantly (50 dead tuples out of a billion is noise) or tiny tables ' +
			'never. A pure percentage lets small hot tables churn: 20% of 100 rows ' +
			'is 20 dead tuples — you would vacuum a queue table every second. The ' +
			'sum gives a floor for small tables and proportionality for large ' +
			'ones. The deeper design choice is that autovacuum is <em>reactive ' +
			'and per-table</em>: it reads the stats collector’s counters, not the ' +
			'workload, so it inherits every weakness of those counters — lost ' +
			'stats after a crash (pre-15) meant tables silently skipped until ' +
			'counters rebuilt.</p>' +
			'<h3>What breaks in production</h3>' +
			'<ul>' +
			'<li><strong>The big-table trap you computed.</strong> At the default ' +
			'0.2 scale factor, a 1-billion-row table waits for 200 million dead ' +
			'tuples — perhaps 100 GB of dead space — before its first vacuum, ' +
			'which then runs for hours and gets throttled by ' +
			'<code>autovacuum_vacuum_cost_delay</code>. Fleet-wide, most shops ' +
			'drop <code>autovacuum_vacuum_scale_factor</code> to 0.01–0.05, or ' +
			'set per-table flat thresholds as in the tuned-fleet case.</li>' +
			'<li><strong>Firing is not finishing.</strong> The trigger only ' +
			'queues work for <code>autovacuum_max_workers</code> (default 3). A ' +
			'few huge tables can monopolize every worker while qualified small ' +
			'tables wait — watch <code>pg_stat_progress_vacuum</code> and the gap ' +
			'between <code>last_autovacuum</code> timestamps.</li>' +
			'<li><strong>Vacuum removes nothing a snapshot might need.</strong> ' +
			'Even when it fires, dead tuples younger than the oldest ' +
			'<code>backend_xmin</code> (long transactions, hung replication ' +
			'slots, prepared transactions) survive — the trigger keeps firing, ' +
			'the table keeps bloating, and the fix is finding the horizon-holder, ' +
			'not tuning the formula.</li>' +
			'<li><strong>ANALYZE staleness shows up as bad plans first.</strong> ' +
			'A table that grew 10x since its statistics were gathered makes the ' +
			'planner choose nested loops over hash joins. When a query suddenly ' +
			'degrades after a bulk load, <code>n_mod_since_analyze</code> is the ' +
			'first column to check.</li>' +
			'</ul>' +
			'<h3>Related GUCs and views</h3>' +
			'<p><code>autovacuum_naptime</code> (how often the launcher looks), ' +
			'<code>autovacuum_vacuum_insert_threshold</code>/' +
			'<code>_scale_factor</code> (v13+: insert-only tables now trigger too ' +
			'— before that, append-only tables were never vacuumed until ' +
			'wraparound forced it), and the per-table storage parameters that ' +
			'override every global. The freeze-driven vacuum — the one trigger ' +
			'that ignores this formula entirely — is the next item.</p>',
		],
		complexity: { time: 'O(n) over the table list; O(1) per trigger check', space: 'O(k) for the picked names' },
	});
})();
