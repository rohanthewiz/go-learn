/* Isolation Levels & Their Anomalies — Concurrency (Medium). What each
 * PostgreSQL isolation level actually does with the four classic anomalies
 * — and where PostgreSQL diverges from the SQL-standard textbook table:
 * REPEATABLE READ is snapshot isolation (no phantoms, but write-write
 * conflicts abort), READ COMMITTED silently re-checks updated rows, and
 * SERIALIZABLE (SSI) catches write skew. The harness pins the full 4x3
 * outcome table plus the retry-loop requirement.
 */
(function () {
	'use strict';
	var T = GoLearnPG;

	// Write skew: the anomaly that separates snapshot isolation from real
	// serializability — two transactions each read the other's row, both
	// write, both commit under RR; SSI aborts one. Marker id namespaced
	// (dgArrowPG10) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="write skew: two on-call doctors each check that the other is still on call, then both go off call; repeatable read commits both, serializable aborts one with a serialization failure">' +
		'<text x="20" y="24" class="lbl">write skew: the constraint “≥1 doctor on call” — checked by both, broken by both</text>' +
		// two transaction lanes
		'<text x="34" y="62" class="lbl">tx A</text>' +
		'<line x1="70" y1="58" x2="540" y2="58" stroke="var(--edge)" stroke-width="1.5"/>' +
		'<text x="34" y="122" class="lbl">tx B</text>' +
		'<line x1="70" y1="118" x2="540" y2="118" stroke="var(--edge)" stroke-width="1.5"/>' +
		// A: read B's row, then write own
		'<rect x="90" y="44" width="130" height="28" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="155" y="63" text-anchor="middle">read: B on call ✓</text>' +
		'<rect x="300" y="44" width="130" height="28" rx="4" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<text x="365" y="63" text-anchor="middle">write: A off call</text>' +
		// B: read A's row, then write own
		'<rect x="90" y="104" width="130" height="28" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="155" y="123" text-anchor="middle">read: A on call ✓</text>' +
		'<rect x="300" y="104" width="130" height="28" rx="4" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<text x="365" y="123" text-anchor="middle">write: B off call</text>' +
		// crossing reads: each read depends on the other's un-updated row
		'<path d="M 155 76 L 355 102" fill="none" stroke="var(--warn)" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#dgArrowPG10)"/>' +
		'<path d="M 155 100 L 355 74" fill="none" stroke="var(--warn)" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#dgArrowPG10)"/>' +
		'<text x="255" y="92" text-anchor="middle" class="lbl" style="fill:var(--warn)">rw-antidependencies cross</text>' +
		'<text x="20" y="168" class="lbl">disjoint rows → no write-write conflict → REPEATABLE READ commits both: 0 doctors on call</text>' +
		'<text x="20" y="188" class="lbl" style="fill:var(--accent)">SERIALIZABLE (SSI) sees the dangerous cycle and aborts one: retry, and it finds 0 ✓</text>' +
		'<defs><marker id="dgArrowPG10" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'isolation-levels',
		title: 'Isolation Levels & Their Anomalies',
		nav: 'isolation levels',
		difficulty: 'Medium',
		category: 'Concurrency',
		task: 'Encode PostgreSQL’s actual outcome for each anomaly × isolation level — including where it beats the SQL-standard table — plus which levels demand retry loops.',

		prose: [
			'<h2>Isolation Levels &amp; Their Anomalies</h2>' +
			'<p>The error arrives at 2 a.m.: <code>ERROR: could not serialize ' +
			'access due to concurrent update</code> (SQLSTATE 40001). The service ' +
			'was switched to <code>REPEATABLE READ</code> last sprint “for ' +
			'safety”, and tonight two workers updated the same row. Under READ ' +
			'COMMITTED that would have quietly resolved itself; under REPEATABLE ' +
			'READ it is a deliberate abort that the application was supposed to ' +
			'retry — and didn’t. Isolation levels are not a dial of vague ' +
			'strictness: each level gives a <em>specific, documented</em> outcome ' +
			'for each concurrency scenario, and in PostgreSQL the table differs ' +
			'from the SQL standard’s in ways worth knowing cold:</p>' +
			'<ul>' +
			'<li><strong>READ COMMITTED</strong> takes a fresh snapshot per ' +
			'<em>statement</em>: re-reads see newer commits (non-repeatable ' +
			'reads, phantoms — anomalies allowed). When an UPDATE hits a row a ' +
			'concurrent transaction changed, it waits, then <em>re-evaluates its ' +
			'WHERE against the newest committed version</em> and proceeds — no ' +
			'error, no stale write, but also no memory of what the statement ' +
			'read earlier.</li>' +
			'<li><strong>REPEATABLE READ</strong> is snapshot isolation: one ' +
			'snapshot for the whole transaction. Non-repeatable reads <em>and</em> ' +
			'phantoms are gone — stronger than the SQL standard requires, which ' +
			'famously permits phantoms at this level. The price: a write-write ' +
			'conflict with a committed concurrent transaction cannot be resolved ' +
			'against the frozen snapshot, so it aborts with 40001.</li>' +
			'<li><strong>SERIALIZABLE</strong> is RR plus SSI (Serializable ' +
			'Snapshot Isolation, v9.1): it additionally tracks read/write ' +
			'dependencies with predicate locks and aborts a transaction when a ' +
			'dangerous cycle forms — catching <em>write skew</em>, the anomaly ' +
			'snapshot isolation cannot see, at a few percent overhead rather ' +
			'than lock-everything cost.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Encode the outcome table as a decision function. ' +
			'<code>Outcome(scenario, level)</code> returns <code>"anomaly"</code> ' +
			'(the bad result happens), <code>"prevented"</code> (the level’s ' +
			'snapshot rules make it impossible), <code>"ok-after-recheck"</code> ' +
			'(READ COMMITTED’s wait-then-re-evaluate path), or ' +
			'<code>"serialization-failure"</code> (40001 — retry). Scenarios: ' +
			'<code>non-repeatable-read</code>, <code>phantom-read</code>, ' +
			'<code>concurrent-update</code> (two transactions UPDATE the same ' +
			'row), <code>write-skew</code>. Also implement ' +
			'<code>RetryRequired(level)</code>: does running at this level ' +
			'obligate the application to a retry loop?</p>',
			{ lang: 'txt', code: 'scenario \\ level        READ COMMITTED     REPEATABLE READ         SERIALIZABLE\nnon-repeatable-read     anomaly            prevented               prevented\nphantom-read            anomaly            prevented (beats std!)  prevented\nconcurrent-update       ok-after-recheck   serialization-failure   serialization-failure\nwrite-skew              anomaly            anomaly                 serialization-failure' },
			'<div class="tip">The row to memorize is <code>write-skew</code>: it ' +
			'is the proof that REPEATABLE READ ≠ SERIALIZABLE. Each transaction ' +
			'checks a constraint over rows the <em>other</em> one writes; the ' +
			'writes touch disjoint rows, so no write-write conflict fires, and ' +
			'snapshot isolation happily commits both. Only SSI’s dependency ' +
			'tracking catches the cycle.</div>',
		],

		starter: [
			'package main',
			'',
			'// Outcome returns what PostgreSQL produces for a concurrency',
			'// scenario at an isolation level:',
			'//   "anomaly"               the bad result happens',
			'//   "prevented"             impossible under this level\'s snapshot rules',
			'//   "ok-after-recheck"      RC\'s wait-then-re-evaluate UPDATE path',
			'//   "serialization-failure" SQLSTATE 40001 — the app must retry',
			'// Scenarios: "non-repeatable-read", "phantom-read",',
			'// "concurrent-update", "write-skew".',
			'// Levels: "read-committed", "repeatable-read", "serializable".',
			'func Outcome(scenario, level string) string {',
			'	// This is the SQL-STANDARD textbook table — PostgreSQL differs',
			'	// in several cells. Fixing the deltas is the exercise.',
			'	switch level {',
			'	case "read-committed":',
			'		return "anomaly"',
			'	case "repeatable-read":',
			'		if scenario == "phantom-read" {',
			'			return "anomaly" // the standard permits phantoms at RR',
			'		}',
			'		return "prevented"',
			'	case "serializable":',
			'		return "prevented"',
			'	}',
			'	return "unknown"',
			'}',
			'',
			'// RetryRequired: must an application running at this level wrap',
			'// transactions in a retry loop for serialization failures?',
			'func RetryRequired(level string) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	out := func(scenario, level string) func() string {',
			'		return func() string { return Outcome(scenario, level) }',
			'	}',
			'	cases := []tc{',
			'		{"non-repeatable read @ RC: per-statement snapshots — the re-read changes",',
			'			"anomaly", out("non-repeatable-read", "read-committed")},',
			'		{"non-repeatable read @ RR: one snapshot per transaction",',
			'			"prevented", out("non-repeatable-read", "repeatable-read")},',
			'		{"non-repeatable read @ serializable",',
			'			"prevented", out("non-repeatable-read", "serializable")},',
			'		{"phantom @ RC: a re-run query grows new rows",',
			'			"anomaly", out("phantom-read", "read-committed")},',
			'		{"phantom @ RR: PG\'s snapshot isolation beats the SQL standard here",',
			'			"prevented", out("phantom-read", "repeatable-read")},',
			'		{"phantom @ serializable",',
			'			"prevented", out("phantom-read", "serializable")},',
			'		{"concurrent UPDATE @ RC: waits, re-checks WHERE on the newest committed row, proceeds",',
			'			"ok-after-recheck", out("concurrent-update", "read-committed")},',
			'		{"concurrent UPDATE @ RR: cannot reconcile with the frozen snapshot — 40001",',
			'			"serialization-failure", out("concurrent-update", "repeatable-read")},',
			'		{"concurrent UPDATE @ serializable: same write-write abort",',
			'			"serialization-failure", out("concurrent-update", "serializable")},',
			'		{"write skew @ RC: nothing even looks — anomaly",',
			'			"anomaly", out("write-skew", "read-committed")},',
			'		{"write skew @ RR: disjoint rows, no write-write conflict — snapshot isolation commits both",',
			'			"anomaly", out("write-skew", "repeatable-read")},',
			'		{"write skew @ serializable: SSI sees the rw-dependency cycle and aborts one",',
			'			"serialization-failure", out("write-skew", "serializable")},',
			'		{"RC never raises serialization failures — no retry loop required",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", RetryRequired("read-committed")) }},',
			'		{"RR and serializable both obligate the app to retry 40001",',
			'			"true true",',
			'			func() string {',
			'				return fmt.Sprintf("%v %v", RetryRequired("repeatable-read"), RetryRequired("serializable"))',
			'			}},',
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
			'// Outcome encodes PostgreSQL\'s documented behavior per (scenario,',
			'// level). Dispatch on the SCENARIO first: each anomaly has one',
			'// mechanism that decides it, and the level only selects where that',
			'// mechanism kicks in — organizing by scenario keeps each mechanism\'s',
			'// story in one switch arm instead of smeared across three.',
			'func Outcome(scenario, level string) string {',
			'	switch scenario {',
			'	case "non-repeatable-read", "phantom-read":',
			'		// Both are pure snapshot-lifetime questions. RC renews its',
			'		// snapshot per statement, so re-reads (and re-run range',
			'		// queries) see newer commits: anomaly. RR and serializable',
			'		// hold ONE snapshot for the transaction, which blocks the',
			'		// phantom too — PostgreSQL\'s RR is snapshot isolation, a',
			'		// notch stronger than the SQL standard\'s RR, whose',
			'		// definition (no predicate protection) permits phantoms.',
			'		if level == "read-committed" {',
			'			return "anomaly"',
			'		}',
			'		return "prevented"',
			'	case "concurrent-update":',
			'		// A write-write conflict on the SAME row. RC: the second',
			'		// updater waits for the first to commit, then re-evaluates',
			'		// its WHERE against the newest committed version',
			'		// (EvalPlanQual) and applies on top — silent success. RR and',
			'		// serializable cannot do that: updating a row their frozen',
			'		// snapshot proves is stale would fabricate a serial order,',
			'		// so they abort with 40001 and make the APP re-run, which',
			'		// re-reads under a fresh snapshot.',
			'		if level == "read-committed" {',
			'			return "ok-after-recheck"',
			'		}',
			'		return "serialization-failure"',
			'	case "write-skew":',
			'		// The writes land on DISJOINT rows, so the write-write',
			'		// machinery above never fires — each transaction validated',
			'		// its constraint against rows the other was rewriting. Only',
			'		// SSI\'s predicate-lock dependency graph notices the crossed',
			'		// rw-antidependencies and aborts one transaction; snapshot',
			'		// isolation (RR) and RC both commit an invalid state.',
			'		if level == "serializable" {',
			'			return "serialization-failure"',
			'		}',
			'		return "anomaly"',
			'	}',
			'	return "unknown"',
			'}',
			'',
			'// RetryRequired: 40001 is not an error to log-and-drop — it is the',
			'// level\'s protocol. RR and serializable buy their guarantees by',
			'// aborting transactions that cannot fit a serial order, so any app',
			'// running above RC without a retry loop is incorrect by design.',
			'// (RC can still deadlock-abort, but it never emits serialization',
			'// failures, so the LEVEL itself imposes no loop.)',
			'func RetryRequired(level string) bool {',
			'	return level == "repeatable-read" || level == "serializable"',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why PostgreSQL’s table diverges from the standard</h3>' +
			'<p>The SQL standard defines isolation levels negatively — by which ' +
			'of three anomalies (dirty read, non-repeatable read, phantom) each ' +
			'level may exhibit — because it was written around 2PL lock ' +
			'implementations. PostgreSQL implements levels with snapshots, and ' +
			'snapshots do not produce the standard’s failure gradations: a ' +
			'per-transaction snapshot eliminates phantoms “for free”, so PG’s ' +
			'REPEATABLE READ lands strictly above the standard’s. (Berenson et ' +
			'al.’s classic 1995 critique — “A Critique of ANSI SQL Isolation ' +
			'Levels” — is the paper that named snapshot isolation and write skew ' +
			'precisely because the standard’s taxonomy could not express them.) ' +
			'Also note what is missing entirely: READ UNCOMMITTED exists ' +
			'syntactically but behaves as READ COMMITTED — MVCC has no dirty ' +
			'reads to offer.</p>' +
			'<h3>The one RC subtlety that causes real bugs</h3>' +
			'<p>RC’s recheck (EvalPlanQual) re-evaluates the <em>WHERE ' +
			'clause</em> against the newest row version — it does not re-run ' +
			'your SELECTs. The classic lost-update bug survives it: read a ' +
			'balance with <code>SELECT</code>, compute in the app, ' +
			'<code>UPDATE … SET balance = $computed</code> — the recheck happily ' +
			'applies your stale computation. Atomic forms ' +
			'(<code>SET balance = balance - 100</code>), ' +
			'<code>SELECT … FOR UPDATE</code>, or optimistic version columns are ' +
			'the RC-level fixes; REPEATABLE READ turns the same race into a ' +
			'40001 you must handle.</p>' +
			'<h3>Choosing a level in production</h3>' +
			'<ul>' +
			'<li><strong>RC (the default) + explicit locking</strong> is the ' +
			'workhorse: predictable, no retry loops, anomalies handled ' +
			'case-by-case where they matter.</li>' +
			'<li><strong>RR</strong> shines for consistent multi-statement reads ' +
			'— reports, <code>pg_dump</code> (which runs at RR for exactly this ' +
			'reason) — and for workloads that can retry.</li>' +
			'<li><strong>SERIALIZABLE</strong> is the “stop proving anomaly ' +
			'absence by hand” button: correctness by construction, priced at ' +
			'predicate-lock memory (<code>max_pred_locks_per_transaction</code>, ' +
			'visible as <code>SIReadLock</code> rows in <code>pg_locks</code>) ' +
			'and a false-positive abort rate that rises with contention. All ' +
			'transactions touching the data must run serializable for the ' +
			'guarantee to hold — one RC writer punches a hole in it.</li>' +
			'</ul>' +
			'<p>Whatever the level: monitor aborts via ' +
			'<code>pg_stat_database.xact_rollback</code>, and treat a rising ' +
			'40001 rate as contention telemetry, not as errors to suppress.</p>',
		],
		complexity: { time: 'O(1) — a fixed decision table', space: 'O(1)' },
	});
})();
