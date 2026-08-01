/* The Lock Conflict Matrix — Concurrency (Medium). Every statement that
 * touches a table takes one of eight table-level lock modes, and whether
 * two sessions block each other is a pure table lookup in the documented
 * conflict matrix. The harness pins the statement→mode mapping, the
 * matrix itself (38 conflicting ordered pairs, perfectly symmetric), and
 * the classic production facts: ALTER TABLE blocks plain SELECTs, while
 * CREATE INDEX CONCURRENTLY lets UPDATEs through.
 */
(function () {
	'use strict';
	var T = GoLearnPG;

	// The mode ladder: conflict sets grow monotonically from AccessShare
	// (conflicts with 1 mode) to AccessExclusive (conflicts with all 8) —
	// with the famous mid-ladder subtlety that Share does not conflict with
	// itself but ShareUpdateExclusive does. Marker id namespaced
	// (dgArrowPG09) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 230" width="560" height="230" role="img" aria-label="the eight table lock modes as a ladder from AccessShare to AccessExclusive; conflict sets grow up the ladder, and AccessExclusive at the top conflicts with everything including plain SELECT">' +
		'<text x="20" y="24" class="lbl">eight modes, growing conflict sets (count of modes each conflicts with)</text>' +
		// ladder rungs: x = 30, staggered bars whose width ~ conflict count
		'<text x="34" y="56" class="lbl">SELECT →</text>' +
		'<rect x="120" y="42" width="150" height="20" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="126" y="57">AccessShare</text><text x="470" y="57" class="lbl">1</text>' +
		'<rect x="120" y="66" width="170" height="20" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="126" y="81">RowShare</text><text x="470" y="81" class="lbl">2</text>' +
		'<text x="34" y="105" class="lbl">UPDATE →</text>' +
		'<rect x="120" y="90" width="200" height="20" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="126" y="105">RowExclusive</text><text x="470" y="105" class="lbl">4</text>' +
		'<rect x="120" y="114" width="230" height="20" rx="4" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<text x="126" y="129">ShareUpdateExclusive (self-conflicts!)</text><text x="470" y="129" class="lbl">5</text>' +
		'<rect x="120" y="138" width="230" height="20" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="126" y="153">Share (CREATE INDEX; self-compatible)</text><text x="470" y="153" class="lbl">5</text>' +
		'<rect x="120" y="162" width="260" height="20" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="126" y="177">ShareRowExclusive</text><text x="470" y="177" class="lbl">6</text>' +
		'<rect x="120" y="186" width="290" height="20" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="126" y="201">Exclusive</text><text x="470" y="201" class="lbl">7</text>' +
		'<text x="34" y="225" class="lbl">ALTER →</text>' +
		'<rect x="120" y="210" width="320" height="20" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="126" y="225">AccessExclusive — blocks even SELECT</text><text x="470" y="225" class="lbl">8</text>' +
		'<path d="M 448 220 L 500 220 L 500 56 L 476 56" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowPG09)"/>' +
		'<defs><marker id="dgArrowPG09" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'lock-conflict-matrix',
		title: 'The Lock Conflict Matrix',
		nav: 'lock conflict matrix',
		difficulty: 'Medium',
		category: 'Concurrency',
		task: 'Encode the 8 table-lock modes, the statement→mode mapping, Conflicts(a, b) from the documented matrix, and Blocks(stmtA, stmtB).',

		prose: [
			'<h2>The Lock Conflict Matrix</h2>' +
			'<p>A ten-millisecond migration takes the site down. The ALTER TABLE ' +
			'itself was instant — but it queued behind one long-running report, ' +
			'and while it waited, <em>every</em> incoming query queued behind ' +
			'<strong>it</strong>, including plain SELECTs. ' +
			'<code>pg_stat_activity</code> shows a wall of ' +
			'<code>wait_event_type = Lock</code>; <code>pg_locks</code> shows one ' +
			'ungranted <code>AccessExclusiveLock</code>. Nothing here is ' +
			'mysterious: it is a lookup in a fixed 8×8 table that has been in the ' +
			'documentation for decades.</p>' +
			'<ul>' +
			'<li><strong>Every table-touching statement takes a table-level ' +
			'lock</strong>, in one of eight modes. The mode names are historical ' +
			'and misleading (<code>RowExclusive</code> is a <em>table</em> lock); ' +
			'what matters is only which modes conflict.</li>' +
			'<li><strong>The mapping:</strong> <code>SELECT</code> → AccessShare; ' +
			'<code>SELECT FOR UPDATE</code> → RowShare; ' +
			'<code>INSERT/UPDATE/DELETE</code> → RowExclusive; ' +
			'<code>VACUUM</code>, <code>ANALYZE</code>, ' +
			'<code>CREATE INDEX CONCURRENTLY</code> → ShareUpdateExclusive; ' +
			'<code>CREATE INDEX</code> → Share; <code>CREATE TRIGGER</code> → ' +
			'ShareRowExclusive; <code>REFRESH MATERIALIZED VIEW CONCURRENTLY</code> ' +
			'→ Exclusive; <code>ALTER TABLE</code>, <code>DROP</code>, ' +
			'<code>TRUNCATE</code>, <code>VACUUM FULL</code> → AccessExclusive.</li>' +
			'<li><strong>Conflicts are symmetric and grow up the ladder.</strong> ' +
			'AccessShare conflicts only with AccessExclusive — readers coexist ' +
			'with everything short of DDL. Writers (RowExclusive) coexist with ' +
			'each other. Share (CREATE INDEX) is compatible <em>with itself</em> ' +
			'but blocks writers; ShareUpdateExclusive conflicts <em>with ' +
			'itself</em> — only one VACUUM or concurrent index build per table at ' +
			'a time. AccessExclusive conflicts with all eight.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Encode the matrix. <code>StatementMode(stmt)</code> maps the ' +
			'statement strings above to modes (default unknown DDL to ' +
			'AccessExclusive — the pessimistic assumption is the safe one). ' +
			'<code>Conflicts(a, b)</code> consults the matrix; ' +
			'<code>Blocks(stmtA, stmtB)</code> composes the two. A bitmask per ' +
			'mode is the clean encoding: bit <code>i</code> set in ' +
			'<code>conflictMask[m]</code> means mode <code>m</code> conflicts ' +
			'with mode <code>i</code>.</p>',
			{ lang: 'txt', code: 'session A: ALTER TABLE users ADD COLUMN ...    -> AccessExclusive\nsession B: SELECT * FROM users                 -> AccessShare\nConflicts(AccessExclusive, AccessShare)        -> true: B queues behind A\n\nsession A: CREATE INDEX CONCURRENTLY ...       -> ShareUpdateExclusive\nsession B: UPDATE users SET ...                -> RowExclusive\nConflicts(ShareUpdateExclusive, RowExclusive)  -> false: writes flow' },
			'<div class="tip">The queue is what makes AccessExclusive lethal: a ' +
			'waiting lock request blocks every <em>later</em> request for a ' +
			'conflicting mode, so “fast” DDL behind a slow reader dams the whole ' +
			'river. The standard defense is ' +
			'<code>SET lock_timeout = &#39;2s&#39;</code> before migrations: better to ' +
			'fail the ALTER and retry than to dam traffic indefinitely.</div>',
		],

		starter: [
			'package main',
			'',
			'// LockMode enumerates the eight table-level modes, weakest first.',
			'// The iota order matters: it is the bit position in the conflict',
			'// masks below.',
			'type LockMode int',
			'',
			'const (',
			'	AccessShare LockMode = iota',
			'	RowShare',
			'	RowExclusive',
			'	ShareUpdateExclusive',
			'	Share',
			'	ShareRowExclusive',
			'	Exclusive',
			'	AccessExclusive',
			')',
			'',
			'// StatementMode maps a statement to the table-level mode it takes.',
			'// Unknown statements should map to AccessExclusive (assume the',
			'// worst about DDL you do not recognize).',
			'func StatementMode(stmt string) LockMode {',
			'	// your code here',
			'	return AccessShare',
			'}',
			'',
			'// Conflicts consults the documented 8x8 matrix.',
			'func Conflicts(a, b LockMode) bool {',
			'	// your code here — only DDL-vs-anything is covered so far',
			'	return a == AccessExclusive || b == AccessExclusive',
			'}',
			'',
			'// Blocks: would stmtB wait behind stmtA\'s already-held lock?',
			'func Blocks(stmtA, stmtB string) bool {',
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
			'	cases := []tc{',
			'		{"the classic: ALTER TABLE blocks even a plain SELECT",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", Blocks("ALTER TABLE", "SELECT")) }},',
			'		{"readers never block readers",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", Blocks("SELECT", "SELECT")) }},',
			'		{"a writer never blocks a reader (MVCC\'s whole promise)",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", Blocks("UPDATE", "SELECT")) }},',
			'		{"writers coexist: UPDATE does not block INSERT at the table level",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", Blocks("UPDATE", "INSERT")) }},',
			'		{"CREATE INDEX (Share) blocks UPDATE — the non-concurrent build freezes writes",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", Blocks("CREATE INDEX", "UPDATE")) }},',
			'		{"CREATE INDEX CONCURRENTLY (ShareUpdateExclusive) lets UPDATE through",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", Blocks("CREATE INDEX CONCURRENTLY", "UPDATE")) }},',
			'		{"two plain CREATE INDEX builds can run together (Share is self-compatible)",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", Blocks("CREATE INDEX", "CREATE INDEX")) }},',
			'		{"but ShareUpdateExclusive self-conflicts: CIC blocks VACUUM on the same table",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", Blocks("CREATE INDEX CONCURRENTLY", "VACUUM")) }},',
			'		{"TRUNCATE is AccessExclusive: it blocks INSERT",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", Blocks("TRUNCATE", "INSERT")) }},',
			'		{"Exclusive (REFRESH MATVIEW CONCURRENTLY) still admits plain SELECTs",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", Conflicts(Exclusive, AccessShare)) }},',
			'		{"an unrecognized statement is assumed AccessExclusive",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", Blocks("CLUSTER", "SELECT")) }},',
			'		{"the matrix is symmetric: Conflicts(a,b) == Conflicts(b,a) for all 64 pairs",',
			'			"symmetric",',
			'			func() string {',
			'				for a := AccessShare; a <= AccessExclusive; a++ {',
			'					for b := AccessShare; b <= AccessExclusive; b++ {',
			'						if Conflicts(a, b) != Conflicts(b, a) {',
			'							return fmt.Sprintf("asymmetric at (%d,%d)", a, b)',
			'						}',
			'					}',
			'				}',
			'				return "symmetric"',
			'			}},',
			'		{"conflict census: exactly 38 of the 64 ordered pairs conflict (1+2+4+5+5+6+7+8)",',
			'			"38",',
			'			func() string {',
			'				n := 0',
			'				for a := AccessShare; a <= AccessExclusive; a++ {',
			'					for b := AccessShare; b <= AccessExclusive; b++ {',
			'						if Conflicts(a, b) {',
			'							n++',
			'						}',
			'					}',
			'				}',
			'				return fmt.Sprintf("%d", n)',
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
			'// LockMode enumerates the eight table-level modes, weakest first.',
			'// The iota order matters: it is the bit position in the conflict',
			'// masks below.',
			'type LockMode int',
			'',
			'const (',
			'	AccessShare LockMode = iota',
			'	RowShare',
			'	RowExclusive',
			'	ShareUpdateExclusive',
			'	Share',
			'	ShareRowExclusive',
			'	Exclusive',
			'	AccessExclusive',
			')',
			'',
			'// conflictMask encodes the documented matrix one row per mode: bit i',
			'// set means "conflicts with mode i". A bitmask row beats a bool[8][8]',
			'// for two reasons: symmetry is auditable by eye (bit m in row i must',
			'// match bit i in row m), and Conflicts compiles to a shift and an',
			'// AND — the same trick the server uses (LockConflicts[] in lock.c).',
			'var conflictMask = [8]uint16{',
			'	AccessShare:          1 << AccessExclusive, // readers only fear DDL',
			'	RowShare:             1<<Exclusive | 1<<AccessExclusive,',
			'	RowExclusive:         1<<Share | 1<<ShareRowExclusive | 1<<Exclusive | 1<<AccessExclusive,',
			'	ShareUpdateExclusive: 1<<ShareUpdateExclusive | 1<<Share | 1<<ShareRowExclusive | 1<<Exclusive | 1<<AccessExclusive,',
			'	Share:                1<<RowExclusive | 1<<ShareUpdateExclusive | 1<<ShareRowExclusive | 1<<Exclusive | 1<<AccessExclusive,',
			'	ShareRowExclusive:    1<<RowExclusive | 1<<ShareUpdateExclusive | 1<<Share | 1<<ShareRowExclusive | 1<<Exclusive | 1<<AccessExclusive,',
			'	Exclusive:            1<<RowShare | 1<<RowExclusive | 1<<ShareUpdateExclusive | 1<<Share | 1<<ShareRowExclusive | 1<<Exclusive | 1<<AccessExclusive,',
			'	AccessExclusive:      1<<AccessShare | 1<<RowShare | 1<<RowExclusive | 1<<ShareUpdateExclusive | 1<<Share | 1<<ShareRowExclusive | 1<<Exclusive | 1<<AccessExclusive,',
			'}',
			'',
			'// The two mid-ladder facts worth memorizing, visible in the rows',
			'// above: Share\'s own bit is ABSENT from Share\'s row (parallel index',
			'// builds coexist), while ShareUpdateExclusive\'s own bit is PRESENT',
			'// in its row (one VACUUM / CREATE INDEX CONCURRENTLY per table).',
			'',
			'// StatementMode: the canonical mapping. The longest-name-first',
			'// concern of real SQL parsing is sidestepped by exact statement',
			'// labels; the default is deliberate pessimism — treating unknown',
			'// DDL as AccessExclusive errs toward predicting a block, which is',
			'// the failure mode you want in a migration review tool.',
			'func StatementMode(stmt string) LockMode {',
			'	switch stmt {',
			'	case "SELECT":',
			'		return AccessShare',
			'	case "SELECT FOR UPDATE", "SELECT FOR SHARE":',
			'		return RowShare',
			'	case "INSERT", "UPDATE", "DELETE", "MERGE":',
			'		return RowExclusive',
			'	case "VACUUM", "ANALYZE", "CREATE INDEX CONCURRENTLY":',
			'		return ShareUpdateExclusive',
			'	case "CREATE INDEX":',
			'		return Share',
			'	case "CREATE TRIGGER":',
			'		return ShareRowExclusive',
			'	case "REFRESH MATERIALIZED VIEW CONCURRENTLY":',
			'		return Exclusive',
			'	}',
			'	// ALTER TABLE, DROP TABLE, TRUNCATE, VACUUM FULL, LOCK TABLE,',
			'	// and anything unrecognized.',
			'	return AccessExclusive',
			'}',
			'',
			'// Conflicts: one row lookup, one bit test.',
			'func Conflicts(a, b LockMode) bool {',
			'	return conflictMask[a]&(1<<b) != 0',
			'}',
			'',
			'// Blocks composes mapping and matrix: would stmtB queue behind',
			'// stmtA\'s held lock? (Symmetry of the matrix makes the question',
			'// order-independent, but the phrasing matches how you read',
			'// pg_locks: A holds, B waits.)',
			'func Blocks(stmtA, stmtB string) bool {',
			'	return Conflicts(StatementMode(stmtA), StatementMode(stmtB))',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why eight modes instead of readers/writers</h3>' +
			'<p>A two-mode read/write lock would force VACUUM, CREATE INDEX, and ' +
			'ALTER TABLE to all count as “writers” and serialize against DML. ' +
			'The eight modes exist to name <em>intermediate intentions</em>: ' +
			'Share says “I need the data stable but I am not changing rows” ' +
			'(index build), ShareUpdateExclusive says “I am changing the table’s ' +
			'physical form but not its contents, and two of me would corrupt ' +
			'each other” (VACUUM). The matrix is exactly the compatibility of ' +
			'those intentions. Note what table locks do <em>not</em> do: row ' +
			'versus row conflicts (two UPDATEs on the same row) are handled by ' +
			'row-level locks and MVCC — the table matrix only coordinates ' +
			'operations whose scope is the table itself.</p>' +
			'<h3>Reading an incident with it</h3>' +
			'<ul>' +
			'<li><strong>The lock queue is FIFO-ish and that is the killer.</strong> ' +
			'A waiting AccessExclusive request is a dam: every later AccessShare ' +
			'request conflicts with the <em>waiter</em> and queues too. This is ' +
			'why “the ALTER was instant in staging” takes production down — ' +
			'staging had no long reader for the ALTER to wait behind. Defense in ' +
			'depth: <code>lock_timeout</code> on migrations, retries, and doing ' +
			'DDL at low-traffic windows.</li>' +
			'<li><strong>CREATE INDEX CONCURRENTLY is the matrix, applied.</strong> ' +
			'It downgrades Share to ShareUpdateExclusive by doing multiple scans ' +
			'and waiting out every transaction that might not see the index — ' +
			'trading a writer-blocking build for a slower, failure-prone one ' +
			'(an invalid index left behind on error must be dropped manually). ' +
			'The self-conflict bit is why you cannot run two CICs on one table.</li>' +
			'<li><strong>Some ALTERs are lighter than the folklore says.</strong> ' +
			'Since v11, <code>ADD COLUMN ... DEFAULT ...</code> with a constant ' +
			'default is metadata-only — still AccessExclusive, but held for ' +
			'microseconds. The mode tells you the blast radius; the hold time ' +
			'tells you the risk. Both matter.</li>' +
			'</ul>' +
			'<h3>Where to look while it happens</h3>' +
			'<p><code>pg_locks</code> joined to <code>pg_stat_activity</code> ' +
			'(the docs’ lock-monitoring query), ' +
			'<code>pg_blocking_pids(pid)</code> for the direct answer “who is ' +
			'blocking this backend”, and <code>log_lock_waits = on</code> to get ' +
			'a log line whenever a lock wait exceeds <code>deadlock_timeout</code> ' +
			'(1s default) — the cheapest early-warning system in PostgreSQL. The ' +
			'matrix you encoded is <code>LockConflicts[]</code> in ' +
			'<code>backend/storage/lmgr/lock.c</code>, and the documentation ' +
			'table is “Explicit Locking”, the single most-consulted page during ' +
			'migration reviews.</p>',
		],
		complexity: { time: 'O(1) — a mask lookup and bit test per query; the census case is a fixed 64-pair sweep', space: 'O(1) — eight uint16 rows' },
	});
})();
