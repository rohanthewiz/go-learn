/* Upsert: INSERT ... ON CONFLICT — SQL Surface (Medium). Idempotent
 * ingestion in one statement: DO NOTHING for at-least-once event feeds,
 * DO UPDATE with EXCLUDED for last-write-wins sync, RETURNING to see which
 * path the engine actually took. Probed live: conflicts arbitrate against
 * the PK or any unique index; excluded.<col> and table-qualified arithmetic
 * (inv.qty + excluded.qty) both work at the pinned version.
 */
(function () {
	'use strict';
	var T = GoLearnBY;

	// One statement, two exits: the probe against the unique key decides,
	// atomically with the write. Marker ids namespaced dgArrowBY03*.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="INSERT ON CONFLICT: the proposed row probes the unique key; no hit takes the insert path, a hit takes DO NOTHING or DO UPDATE where EXCLUDED names the row that would have been inserted; both paths report through RETURNING">' +
		'<text x="20" y="22" class="lbl">INSERT ... ON CONFLICT (serial_no): one statement, two exits</text>' +
		'<rect x="20" y="38" width="170" height="40" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="105" y="56" text-anchor="middle" class="lbl">proposed row</text>' +
		'<text x="105" y="71" text-anchor="middle" class="lbl">(the future EXCLUDED)</text>' +
		'<path d="M 190 58 L 232 58" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowBY03)"/>' +
		'<rect x="236" y="38" width="140" height="40" rx="6" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="306" y="56" text-anchor="middle" class="lbl">probe unique key</text>' +
		'<text x="306" y="71" text-anchor="middle" class="lbl">(PK or unique index)</text>' +
		'<path d="M 306 78 C 306 108 150 100 150 122" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBY03)"/>' +
		'<text x="196" y="98" class="lbl">no hit</text>' +
		'<path d="M 306 78 C 306 108 440 100 440 122" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowBY03w)"/>' +
		'<text x="380" y="98" class="lbl" style="fill:var(--warn)">hit</text>' +
		'<rect x="70" y="126" width="160" height="38" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="150" y="144" text-anchor="middle" class="lbl">insert path:</text>' +
		'<text x="150" y="159" text-anchor="middle" class="lbl">row stored as proposed</text>' +
		'<rect x="350" y="126" width="186" height="38" rx="6" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<text x="443" y="144" text-anchor="middle" class="lbl">DO NOTHING: skip, 0 affected</text>' +
		'<text x="443" y="159" text-anchor="middle" class="lbl">DO UPDATE SET ... = EXCLUDED.col</text>' +
		'<text x="278" y="192" text-anchor="middle" class="lbl">probe + write are ONE atomic step — no check-then-insert gap, safe to retry forever</text>' +
		'<text x="278" y="210" text-anchor="middle" class="lbl">RETURNING reports the row as stored, whichever exit ran</text>' +
		'<defs>' +
		'<marker id="dgArrowBY03" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowBY03w" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'upsert-on-conflict',
		title: 'Upsert: INSERT ... ON CONFLICT',
		nav: 'upsert on conflict',
		difficulty: 'Medium',
		category: 'SQL Surface',
		task: 'Make a device-inventory sync idempotent: ON CONFLICT DO UPDATE with EXCLUDED for the catalog, DO NOTHING for the first-seen log — each helper one statement, safe to replay, reporting its path through RETURNING and RowsAffected.',

		prose: [
			'<h2>Upsert: idempotent ingestion in one statement</h2>' +
			'<p>A fleet-management service ingests device reports from an MDM ' +
			'vendor\'s webhook. The vendor retries aggressively — the same report ' +
			'can arrive two, three, five times — and the current handler does ' +
			'check-then-insert: SELECT by serial number, INSERT if missing, UPDATE ' +
			'if present. Under retry bursts it throws ' +
			'<code>duplicate primary key</code> (two copies of the same report ' +
			'both pass the SELECT), and after every incident someone “fixes” it ' +
			'by adding another query. The real fix is to stop deciding in Go and ' +
			'hand the decision to the engine, which can make it <em>atomically ' +
			'with the write</em>:</p>',
			{ lang: 'sql', code: "INSERT INTO devices (serial_no, name, os_ver) VALUES ($1, $2, $3)\nON CONFLICT (serial_no) DO UPDATE\n  SET name = EXCLUDED.name, os_ver = EXCLUDED.os_ver\nRETURNING id, name, os_ver;" },
			'<ul>' +
			'<li><strong>The conflict target names a unique key.</strong> ' +
			'<code>ON CONFLICT (serial_no)</code> must match the primary key or a ' +
			'unique index — that key is the <em>arbiter</em> the proposed row is ' +
			'probed against. No unique key on the column, no upsert: the engine ' +
			'refuses, because without uniqueness “the existing row” is not ' +
			'well-defined.</li>' +
			'<li><strong><code>EXCLUDED</code> is the row that lost.</strong> ' +
			'Inside <code>DO UPDATE SET</code>, bare columns mean the existing ' +
			'row; <code>EXCLUDED.col</code> means the values your INSERT proposed. ' +
			'<code>SET os_ver = EXCLUDED.os_ver</code> is last-write-wins; ' +
			'<code>SET qty = inv.qty + EXCLUDED.qty</code> is an accumulator — ' +
			'both rows in one expression.</li>' +
			'<li><strong><code>DO NOTHING</code> is the at-least-once ' +
			'absorber.</strong> The duplicate insert simply doesn\'t happen: no ' +
			'error, <code>RowsAffected</code> 0, RETURNING returns no row. Replay ' +
			'the whole feed and the table converges to the same state — the ' +
			'definition of idempotent.</li>' +
			'<li><strong>RETURNING tells you which exit ran.</strong> The insert ' +
			'path returns the row with its fresh SERIAL id; the update path ' +
			'returns the <em>same old id</em> with new values. Same id across ' +
			'replays is your proof the upsert matched instead of duplicating.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Two helpers. <code>SyncDevice</code> upserts into the catalog ' +
			'(unique <code>serial_no</code>, last-write-wins on name and OS ' +
			'version) and returns the row\'s id — which must be <em>stable</em> ' +
			'when the same serial syncs again. <code>MarkSeen</code> appends to a ' +
			'first-seen log with DO NOTHING and reports whether this call was the ' +
			'first sighting. The harness replays both, exactly like the vendor\'s ' +
			'retries.</p>' +
			'<div class="tip">The starter is the check-then-insert original. It ' +
			'passes the first-contact cases — that is what makes the pattern ' +
			'treacherous in review — and fails the replay cases, where SyncDevice ' +
			'must take the update path and MarkSeen must absorb the duplicate.</div>',
		],

		starter: [
			'package main',
			'',
			'import (',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// Harness-owned schema, created before your code runs:',
			'//',
			'//   CREATE TABLE devices (',
			'//     id        SERIAL PRIMARY KEY,',
			'//     serial_no TEXT NOT NULL,     -- + UNIQUE INDEX devices_serial',
			'//     name      TEXT NOT NULL,',
			'//     os_ver    TEXT NOT NULL',
			'//   )',
			'//   CREATE TABLE first_seen (',
			'//     serial_no TEXT PRIMARY KEY',
			'//   )',
			'',
			'// SyncDevice records a device report: new serials insert, known',
			'// serials update name/os_ver in place (last write wins). Returns the',
			'// device\'s id — the SAME id every time one serial syncs.',
			'//',
			'// CODE UNDER REVIEW: check-then-insert. Two copies of one report',
			'// racing both pass the SELECT and the loser dies on the unique',
			'// index; it is also two-to-three statements where one suffices.',
			'// Rewrite as ONE INSERT ... ON CONFLICT (serial_no) DO UPDATE',
			'// statement using EXCLUDED, with RETURNING id.',
			'func SyncDevice(db *sql.DB, serialNo, name, osVer string) (int64, error) {',
			'	res, err := db.Exec("SELECT id FROM devices WHERE serial_no = $1", serialNo)',
			'	if err != nil {',
			'		return 0, err',
			'	}',
			'	if len(res.Rows) > 0 {',
			'		id := res.Rows[0][0].(int64)',
			'		// Known serial: update in place. (Yes, this is the third',
			'		// statement of what should be one.)',
			'		_, err = db.Exec("UPDATE devices SET name = $1, os_ver = $2 WHERE id = $3",',
			'			name, osVer, id)',
			'		return id, err',
			'	}',
			'	ins, err := db.Exec(',
			'		"INSERT INTO devices (serial_no, name, os_ver) VALUES ($1, $2, $3) RETURNING id",',
			'		serialNo, name, osVer)',
			'	if err != nil {',
			'		return 0, err',
			'	}',
			'	return ins.Rows[0][0].(int64), nil',
			'}',
			'',
			'// MarkSeen logs the first sighting of a serial and reports whether',
			'// THIS call was the first. Replays must be absorbed silently.',
			'//',
			'// CODE UNDER REVIEW: a bare INSERT — the second sighting of any',
			'// serial errors on the primary key instead of being absorbed.',
			'// Rewrite with ON CONFLICT DO NOTHING and decide "first?" from',
			'// RowsAffected (1 = we inserted, 0 = it was already there).',
			'func MarkSeen(db *sql.DB, serialNo string) (bool, error) {',
			'	_, err := db.Exec("INSERT INTO first_seen (serial_no) VALUES ($1)", serialNo)',
			'	if err != nil {',
			'		return false, err',
			'	}',
			'	return true, nil',
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
			'	db, cleanup := openDB("by-upsert-on-conflict")',
			'	defer cleanup()',
			'',
			'	// serial_no\'s uniqueness lives in a secondary unique index (not',
			'	// the PK) on purpose: the conflict target must be able to',
			'	// arbitrate against either.',
			'	mustExec(db, `CREATE TABLE devices (',
			'		id        SERIAL PRIMARY KEY,',
			'		serial_no TEXT NOT NULL,',
			'		name      TEXT NOT NULL,',
			'		os_ver    TEXT NOT NULL',
			'	)`)',
			'	mustExec(db, `CREATE UNIQUE INDEX devices_serial ON devices (serial_no)`)',
			'	mustExec(db, `CREATE TABLE first_seen (',
			'		serial_no TEXT PRIMARY KEY',
			'	)`)',
			'',
			'	results := make([]map[string]any, 0, 6)',
			'	newCase := func(name, want string) map[string]any {',
			'		r := map[string]any{"input": name, "want": want}',
			'		results = append(results, r)',
			'		return r',
			'	}',
			'	sync := func(r map[string]any, sn, name, osv string) (int64, bool) {',
			'		id, err := SyncDevice(db, sn, name, osv)',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "error: " + err.Error()',
			'			return 0, false',
			'		}',
			'		return id, true',
			'	}',
			'',
			'	// Case 1: first contact — the insert path. Any implementation',
			'	// (including check-then-insert) passes; this pins the baseline.',
			'	r := newCase("SyncDevice(SN-100) first report inserts", "id 1, [[SN-100 mbp-ada 14.2]]")',
			'	runCase(r, func() {',
			'		id, ok := sync(r, "SN-100", "mbp-ada", "14.2")',
			'		if !ok {',
			'			return',
			'		}',
			'		res := mustExec(db, "SELECT serial_no, name, os_ver FROM devices WHERE id = $1", id)',
			'		got := fmt.Sprintf("id %d, %s", id, rowsStr(res))',
			'		r["pass"] = got == "id 1, [[SN-100 mbp-ada 14.2]]"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 2: the vendor retries — same serial, newer values. The',
			'	// update path must fire: SAME id back, values replaced, and',
			'	// crucially no second SN-100 row.',
			'	r = newCase("replay with new os_ver takes the update path (same id, one row)", "id 1 again, 1 row: [[SN-100 mbp-ada 14.3]]")',
			'	runCase(r, func() {',
			'		id, ok := sync(r, "SN-100", "mbp-ada", "14.3")',
			'		if !ok {',
			'			return',
			'		}',
			'		res := mustExec(db, "SELECT serial_no, name, os_ver FROM devices WHERE serial_no = $1", "SN-100")',
			'		got := fmt.Sprintf("id %d again, %d row: %s", id, len(res.Rows), rowsStr(res))',
			'		r["pass"] = got == "id 1 again, 1 row: [[SN-100 mbp-ada 14.3]]"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 3: a second device slots in beside the first — the upsert',
			'	// must not have widened into "update whatever exists".',
			'	r = newCase("SyncDevice(SN-200) inserts alongside", "id 2, catalog [[1 SN-100] [2 SN-200]]")',
			'	runCase(r, func() {',
			'		id, ok := sync(r, "SN-200", "tp-bo", "11.4")',
			'		if !ok {',
			'			return',
			'		}',
			'		res := mustExec(db, "SELECT id, serial_no FROM devices ORDER BY id")',
			'		got := fmt.Sprintf("id %d, catalog %s", id, rowsStr(res))',
			'		r["pass"] = got == "id 2, catalog [[1 SN-100] [2 SN-200]]"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 4: MarkSeen first sighting reports true.',
			'	r = newCase("MarkSeen(SN-100) first sighting", "first=true")',
			'	runCase(r, func() {',
			'		first, err := MarkSeen(db, "SN-100")',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "error: " + err.Error()',
			'			return',
			'		}',
			'		got := fmt.Sprintf("first=%v", first)',
			'		r["pass"] = got == "first=true"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 5: the duplicate sighting must be ABSORBED — no error, no',
			'	// second row, and the helper knows it was not first. This is the',
			'	// case a bare INSERT cannot survive.',
			'	r = newCase("MarkSeen(SN-100) replay absorbs the duplicate", "first=false, log rows 1")',
			'	runCase(r, func() {',
			'		first, err := MarkSeen(db, "SN-100")',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "error: " + err.Error()',
			'			return',
			'		}',
			'		res := mustExec(db, "SELECT COUNT(*) FROM first_seen")',
			'		got := fmt.Sprintf("first=%v, log rows %v", first, res.Rows[0][0])',
			'		r["pass"] = got == "first=false, log rows 1"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 6: full-feed replay — the idempotence property itself.',
			'	// Re-sync both devices with identical payloads: ids stable, row',
			'	// count stable, values converged.',
			'	r = newCase("replaying the whole feed converges (ids and rows stable)", "ids [1 2], 2 devices, 1 seen")',
			'	runCase(r, func() {',
			'		id1, ok := sync(r, "SN-100", "mbp-ada", "14.3")',
			'		if !ok {',
			'			return',
			'		}',
			'		id2, ok := sync(r, "SN-200", "tp-bo", "11.4")',
			'		if !ok {',
			'			return',
			'		}',
			'		if _, err := MarkSeen(db, "SN-100"); err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "MarkSeen error: " + err.Error()',
			'			return',
			'		}',
			'		devs := mustExec(db, "SELECT COUNT(*) FROM devices")',
			'		seen := mustExec(db, "SELECT COUNT(*) FROM first_seen")',
			'		got := fmt.Sprintf("ids [%d %d], %v devices, %v seen", id1, id2, devs.Rows[0][0], seen.Rows[0][0])',
			'		r["pass"] = got == "ids [1 2], 2 devices, 1 seen"',
			'		r["got"] = got',
			'	})',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'import (',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// SyncDevice: one statement, both paths. ON CONFLICT (serial_no)',
			'// arbitrates against the unique index; EXCLUDED carries the values',
			'// this INSERT proposed, so the SET clause is "keep the row, take',
			'// the new report" — last write wins. RETURNING id reads the stored',
			'// row on either exit: fresh SERIAL on insert, the ORIGINAL id on',
			'// update, which is exactly the stability the replay cases assert.',
			'//',
			'// The probe and the write are one atomic step inside the engine, so',
			'// two racing copies of a report serialize on the key: one inserts,',
			'// the other updates. There is no interleaving where both insert —',
			'// the gap the SELECT version left open is structurally gone.',
			'func SyncDevice(db *sql.DB, serialNo, name, osVer string) (int64, error) {',
			'	res, err := db.Exec(',
			'		`INSERT INTO devices (serial_no, name, os_ver) VALUES ($1, $2, $3)',
			'		ON CONFLICT (serial_no) DO UPDATE',
			'			SET name = EXCLUDED.name, os_ver = EXCLUDED.os_ver',
			'		RETURNING id`,',
			'		serialNo, name, osVer)',
			'	if err != nil {',
			'		return 0, err',
			'	}',
			'	return res.Rows[0][0].(int64), nil',
			'}',
			'',
			'// MarkSeen: DO NOTHING turns the duplicate-key error into a defined',
			'// outcome, and RowsAffected is the discriminator — 1 means this',
			'// statement inserted (first sighting), 0 means the row already',
			'// existed and the insert was absorbed. No error path is the point:',
			'// an at-least-once feed replayed through this helper converges',
			'// instead of alerting.',
			'func MarkSeen(db *sql.DB, serialNo string) (bool, error) {',
			'	res, err := db.Exec(',
			'		`INSERT INTO first_seen (serial_no) VALUES ($1)',
			'		ON CONFLICT (serial_no) DO NOTHING`,',
			'		serialNo)',
			'	if err != nil {',
			'		return false, err',
			'	}',
			'	return res.RowsAffected == 1, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>How the engine runs an upsert</h3>' +
			'<p>bytdb needs no special machinery for ON CONFLICT — it composes ' +
			'three things the engine already has. The conflict target resolves to ' +
			'an <em>arbiter</em>: the primary key, or a unique secondary index ' +
			'(your <code>devices_serial</code>). Executing the INSERT, the engine ' +
			'probes that arbiter with the proposed row\'s key values — a point ' +
			'read in the ordered key space. On a miss it takes the plain insert ' +
			'path: write the row, maintain every index, all in the statement\'s ' +
			'transaction. On a hit, DO UPDATE rides the same path as a normal ' +
			'UPDATE of that row, with one addition: the expression scope holds ' +
			'<em>two</em> rows, the target (bare columns) and the EXCLUDED ' +
			'pseudo-row (your proposed values). Because probe and write share one ' +
			'transaction, no other writer can slip between them — that atomicity ' +
			'is the entire difference from SELECT-then-INSERT, and it is why the ' +
			'statement is safe to replay from concurrent webhook workers.</p>' +
			'<h3>One Postgres subtlety bytdb keeps</h3>' +
			'<p>DO UPDATE may touch each existing row <em>once</em> per statement. ' +
			'A multi-row INSERT whose VALUES contain the same serial twice would ' +
			'update one row twice — Postgres rejects that as a cardinality ' +
			'violation rather than silently applying both, and bytdb tracks ' +
			'touched rows the same way. If your feed can carry intra-batch ' +
			'duplicates, dedupe the batch first (or split it into per-row ' +
			'statements, as this item\'s helpers do).</p>' +
			'<h3>Choosing DO NOTHING vs DO UPDATE</h3>' +
			'<p>They encode different distributed-systems contracts. ' +
			'<strong>DO NOTHING</strong> is for immutable facts arriving ' +
			'at-least-once — first-seen logs, processed-message ids, audit ' +
			'events: the first writer wins and every replay is a no-op, so ' +
			'<code>RowsAffected</code> becomes your exactly-once discriminator. ' +
			'<strong>DO UPDATE</strong> is for mutable state arriving out of ' +
			'order or repeatedly — device catalogs, inventory counts, sync ' +
			'targets: the row converges to the latest (or accumulated) value. ' +
			'The classic mistake is DO UPDATE on an append-only log (silently ' +
			'rewrites history on a replayed id) or DO NOTHING on a catalog ' +
			'(silently drops legitimate updates — your devices would be frozen at ' +
			'their first report forever). Match the clause to the data\'s ' +
			'mutability, and let RETURNING tell you what actually happened.</p>',
		],
		complexity: { time: 'O(log n) per upsert — one unique-key probe plus one row write and its index maintenance', space: 'O(1) per statement beyond the row itself' },
	});
})();
