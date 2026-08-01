/* Parameters & RETURNING — Getting Started (Easy). db.Exec(query, args...):
 * $1-style parameters as the second half of the Exec signature, and
 * RETURNING as the way a write reports the row it actually stored (SERIAL
 * ids included) without a second query. The starter is the classic bug in
 * its natural habitat: fmt.Sprintf-ing values into SQL text — it compiles,
 * passes the easy case, and dies the moment a name carries an apostrophe.
 */
(function () {
	'use strict';
	var T = GoLearnBY;

	// Two channels vs one: concatenation feeds data into the parser;
	// binding keeps the statement's shape frozen before values arrive.
	// Marker ids namespaced dgArrowBY02*.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="concatenation splices values into SQL text so the parser sees data as code; db.Exec with $1 parameters sends the statement and the values on separate channels, and the write reports its stored row through RETURNING">' +
		'<text x="20" y="22" class="lbl">concatenation: one channel — the parser reads your data</text>' +
		'<rect x="20" y="34" width="230" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="135" y="56" text-anchor="middle" class="lbl">"...VALUES (\'" + name + "\')"</text>' +
		'<path d="M 250 51 L 286 51" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowBY02w)"/>' +
		'<rect x="290" y="34" width="88" height="34" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="334" y="56" text-anchor="middle" class="lbl">parser</text>' +
		'<text x="410" y="47" class="lbl" style="fill:var(--warn)">name = o\'brien →</text>' +
		'<text x="410" y="64" class="lbl" style="fill:var(--warn)">unterminated string literal</text>' +
		'<text x="20" y="102" class="lbl">db.Exec(q, args...): two channels — the shape is frozen first</text>' +
		'<rect x="20" y="114" width="200" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="120" y="134" text-anchor="middle" class="lbl">"...VALUES ($1) RETURNING id"</text>' +
		'<rect x="20" y="152" width="200" height="30" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="120" y="172" text-anchor="middle" class="lbl">args: "o\'brien"  (data, never SQL)</text>' +
		'<path d="M 220 129 L 256 140" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBY02)"/>' +
		'<path d="M 220 167 L 256 156" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowBY02)"/>' +
		'<rect x="260" y="130" width="106" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="313" y="152" text-anchor="middle" class="lbl">parse → bind → run</text>' +
		'<path d="M 366 148 L 402 148" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBY02)"/>' +
		'<rect x="406" y="130" width="134" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="473" y="147" text-anchor="middle" class="lbl">RETURNING → Rows:</text>' +
		'<text x="473" y="161" text-anchor="middle" class="lbl">[[4 o\'brien]] — the stored row</text>' +
		'<text x="20" y="206" class="lbl">one statement in, the written row out — no second query, no gap for a racer to change it</text>' +
		'<defs>' +
		'<marker id="dgArrowBY02" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowBY02w" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'params-and-returning',
		title: 'Parameters & RETURNING',
		nav: 'params and returning',
		difficulty: 'Easy',
		category: 'Getting Started',
		task: 'Rewrite three write helpers to bind values with $1-parameters and read the stored row back through RETURNING — the SERIAL id without a second query, and names with apostrophes without a parse error.',

		prose: [
			'<h2>Parameters &amp; RETURNING</h2>' +
			'<p>A signup handler works for three weeks, then a customer named ' +
			'O’Brien registers and every request of theirs 500s. The log says ' +
			'<code>unterminated string literal</code>: the handler builds its ' +
			'INSERT with <code>fmt.Sprintf</code>, and the apostrophe in ' +
			'<code>o\'brien</code> closed the SQL string early. The same code path ' +
			'is one crafted input away from being an injection hole — but it ' +
			'breaks on honest data first. Both problems have one cure, and it is ' +
			'already sitting in the signature you have been calling:</p>',
			{ lang: 'go', code: '// db.Exec(query string, args ...any)\n//                       ^^^^^^^^^^^ the second channel\nres, err := db.Exec(\n\t"INSERT INTO users (name, plan) VALUES ($1, $2) RETURNING id",\n\tname, plan) // values travel BESIDE the SQL, never inside it\nid := res.Rows[0][0].(int64) // the engine-assigned SERIAL id' },
			'<ul>' +
			'<li><strong><code>$1, $2, ...</code> are bound parameters.</strong> ' +
			'The statement is parsed first — its shape frozen — and the values ' +
			'are attached afterward as typed constants. An apostrophe is just a ' +
			'byte in a string; it is never tokenized. The count is checked: args ' +
			'and the highest <code>$n</code> must agree, or Exec fails with ' +
			'<code>wrong number of parameters</code>.</li>' +
			'<li><strong><code>RETURNING</code> makes a write answer like a ' +
			'read.</strong> <code>INSERT ... RETURNING id</code> fills ' +
			'<code>res.Rows</code> with the rows <em>as stored</em> — SERIAL ids ' +
			'the engine just assigned, DEFAULTs it filled in — while ' +
			'<code>RowsAffected</code> still counts the write. Without it you ' +
			'would need a second query, and between your INSERT and your SELECT ' +
			'another writer may have changed the row: read-it-back is not just ' +
			'slower, it is a race.</li>' +
			'<li><strong>UPDATE and DELETE take RETURNING too</strong> — “what ' +
			'did I actually touch” as data. An UPDATE that matched nothing ' +
			'returns zero rows; that emptiness is itself the answer (and cheaper ' +
			'than a verify-select).</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>The three helpers on the right are the Sprintf version — the code ' +
			'under review. Rewrite them to bind with parameters and report ' +
			'through RETURNING. The harness feeds them <code>ada</code>, then ' +
			'<code>o\'brien</code>, then a hostile-looking string that must be ' +
			'stored <em>verbatim</em> as a name — the table it pretends to attack ' +
			'must still hold exactly its rows afterward.</p>' +
			'<div class="tip">The injection framing gets a full treatment in the ' +
			'database track\'s prepared-statements item. Here, notice the ' +
			'engineering side: the parameterized form is also the <em>simpler</em> ' +
			'code — no quoting rules to remember, one string constant the planner ' +
			'could cache, and the id comes back in the same round trip.</div>',
		],

		starter: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// The harness owns this schema (already created before your code runs):',
			'//',
			'//   CREATE TABLE users (',
			'//     id   SERIAL PRIMARY KEY,',
			'//     name TEXT NOT NULL,',
			'//     plan TEXT NOT NULL',
			'//   )',
			'',
			'// AddUser inserts a user and returns the id the engine assigned.',
			'//',
			'// CODE UNDER REVIEW: Sprintf splices the values into the SQL text,',
			'// so the parser reads user data as SQL — o\'brien\'s apostrophe',
			'// terminates the literal early. And it wastes a query: the SELECT',
			'// re-reads what the INSERT could have reported itself. Rewrite with',
			'// $1/$2 binding and RETURNING id (one statement total).',
			'func AddUser(db *sql.DB, name, plan string) (int64, error) {',
			'	q := fmt.Sprintf("INSERT INTO users (name, plan) VALUES (\'%s\', \'%s\')", name, plan)',
			'	if _, err := db.Exec(q); err != nil {',
			'		return 0, err',
			'	}',
			'	res, err := db.Exec(fmt.Sprintf("SELECT id FROM users WHERE name = \'%s\'", name))',
			'	if err != nil || len(res.Rows) == 0 {',
			'		return 0, err',
			'	}',
			'	return res.Rows[0][0].(int64), nil',
			'}',
			'',
			'// SetPlan moves a user to a new plan and reports how many rows',
			'// actually changed (0 means: no such user). Same disease, same cure:',
			'// bind both values; RowsAffected already counts the update.',
			'func SetPlan(db *sql.DB, name, plan string) (int, error) {',
			'	q := fmt.Sprintf("UPDATE users SET plan = \'%s\' WHERE name = \'%s\'", plan, name)',
			'	res, err := db.Exec(q)',
			'	if err != nil {',
			'		return 0, err',
			'	}',
			'	return res.RowsAffected, nil',
			'}',
			'',
			'// RemoveUser deletes by name and returns the id of the removed row',
			'// (0 if nothing matched) — use DELETE ... RETURNING id, not a',
			'// SELECT-then-DELETE pair.',
			'func RemoveUser(db *sql.DB, name string) (int64, error) {',
			'	q := fmt.Sprintf("DELETE FROM users WHERE name = \'%s\'", name)',
			'	if _, err := db.Exec(q); err != nil {',
			'		return 0, err',
			'	}',
			'	return 0, nil',
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
			'	db, cleanup := openDB("by-params-returning")',
			'	defer cleanup()',
			'',
			'	mustExec(db, `CREATE TABLE users (',
			'		id   SERIAL PRIMARY KEY,',
			'		name TEXT NOT NULL,',
			'		plan TEXT NOT NULL',
			'	)`)',
			'',
			'	results := make([]map[string]any, 0, 6)',
			'	newCase := func(name, want string) map[string]any {',
			'		r := map[string]any{"input": name, "want": want}',
			'		results = append(results, r)',
			'		return r',
			'	}',
			'',
			'	// Case 1: the friendly path — any implementation passes this one.',
			'	r := newCase("AddUser(ada, pro) returns the SERIAL id", "id 1")',
			'	runCase(r, func() {',
			'		id, err := AddUser(db, "ada", "pro")',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "error: " + err.Error()',
			'			return',
			'		}',
			'		got := fmt.Sprintf("id %d", id)',
			'		r["pass"] = got == "id 1"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 2: honest data with an apostrophe. Concatenation feeds the',
			'	// quote to the parser and dies; a bound parameter stores it as-is.',
			'	r = newCase("AddUser(o\'brien, free) — the apostrophe that broke prod", "id 2, stored as o\'brien")',
			'	runCase(r, func() {',
			'		id, err := AddUser(db, "o\'brien", "free")',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "error: " + err.Error()',
			'			return',
			'		}',
			'		res, err := db.Exec("SELECT name FROM users WHERE id = $1", id)',
			'		if err != nil || len(res.Rows) != 1 {',
			'			r["pass"] = false',
			'			r["got"] = fmt.Sprintf("id %d, readback failed: %v", id, err)',
			'			return',
			'		}',
			'		got := fmt.Sprintf("id %d, stored as %v", id, res.Rows[0][0])',
			'		r["pass"] = got == "id 2, stored as o\'brien"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 3: a hostile-looking name must land VERBATIM as data. With',
			'	// binding it is just an ugly string; the users table stays intact.',
			'	hostile := "x\'); DELETE FROM users; --"',
			'	r = newCase("AddUser stores a hostile-looking string verbatim; table intact", "id 3, 3 users survive")',
			'	runCase(r, func() {',
			'		id, err := AddUser(db, hostile, "free")',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "error: " + err.Error()',
			'			return',
			'		}',
			'		res, err := db.Exec("SELECT COUNT(*) FROM users")',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "count failed: " + err.Error()',
			'			return',
			'		}',
			'		got := fmt.Sprintf("id %d, %v users survive", id, res.Rows[0][0])',
			'		r["pass"] = got == "id 3, 3 users survive"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 4: UPDATE through the same two-channel path.',
			'	r = newCase("SetPlan(o\'brien, pro) updates exactly 1 row", "1 row, plan now pro")',
			'	runCase(r, func() {',
			'		n, err := SetPlan(db, "o\'brien", "pro")',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "error: " + err.Error()',
			'			return',
			'		}',
			'		res, err := db.Exec("SELECT plan FROM users WHERE name = $1", "o\'brien")',
			'		if err != nil || len(res.Rows) != 1 {',
			'			r["pass"] = false',
			'			r["got"] = fmt.Sprintf("%d row(s), readback failed: %v", n, err)',
			'			return',
			'		}',
			'		got := fmt.Sprintf("%d row, plan now %v", n, res.Rows[0][0])',
			'		r["pass"] = got == "1 row, plan now pro"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 5: zero matches is an answer, not an error.',
			'	r = newCase("SetPlan(nobody, pro) affects 0 rows", "0 rows")',
			'	runCase(r, func() {',
			'		n, err := SetPlan(db, "nobody", "pro")',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "error: " + err.Error()',
			'			return',
			'		}',
			'		got := fmt.Sprintf("%d rows", n)',
			'		r["pass"] = got == "0 rows"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 6: DELETE ... RETURNING reports the removed row\'s id in the',
			'	// same statement — and removing the hostile string needs binding',
			'	// on the WHERE side too.',
			'	r = newCase("RemoveUser(hostile string) returns its id via RETURNING", "removed id 3, 2 users left")',
			'	runCase(r, func() {',
			'		id, err := RemoveUser(db, hostile)',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "error: " + err.Error()',
			'			return',
			'		}',
			'		res, err := db.Exec("SELECT COUNT(*) FROM users")',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "count failed: " + err.Error()',
			'			return',
			'		}',
			'		got := fmt.Sprintf("removed id %d, %v users left", id, res.Rows[0][0])',
			'		r["pass"] = got == "removed id 3, 2 users left"',
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
			'// AddUser: one statement, two channels. The SQL is a fixed template',
			'// — its shape is parsed before any value is seen, so o\'brien\'s',
			'// apostrophe (or anything nastier) is only ever data. RETURNING id',
			'// folds the read-back into the write: the engine reports the SERIAL',
			'// it assigned in the same atomic statement, which a follow-up',
			'// SELECT-by-name could never guarantee (names are not unique here,',
			'// and another writer could interleave).',
			'func AddUser(db *sql.DB, name, plan string) (int64, error) {',
			'	res, err := db.Exec(',
			'		"INSERT INTO users (name, plan) VALUES ($1, $2) RETURNING id",',
			'		name, plan)',
			'	if err != nil {',
			'		return 0, err',
			'	}',
			'	// RETURNING fills Rows exactly like a SELECT: one inserted row,',
			'	// one result row. SERIAL is an INT column, so the cell is int64.',
			'	return res.Rows[0][0].(int64), nil',
			'}',
			'',
			'// SetPlan: both the new value and the match key are bound — the',
			'// WHERE side of a statement is exactly as injectable as the SET',
			'// side, so binding must cover every hole. RowsAffected is the',
			'// engine\'s own count of matched-and-updated rows; 0 is a valid',
			'// answer meaning "no such user", not a failure.',
			'func SetPlan(db *sql.DB, name, plan string) (int, error) {',
			'	res, err := db.Exec(',
			'		"UPDATE users SET plan = $1 WHERE name = $2",',
			'		plan, name)',
			'	if err != nil {',
			'		return 0, err',
			'	}',
			'	return res.RowsAffected, nil',
			'}',
			'',
			'// RemoveUser: DELETE ... RETURNING turns "what did I just remove"',
			'// into data from the same statement — no SELECT-then-DELETE pair,',
			'// no window where another writer sees (or misses) the row between',
			'// the two. Zero returned rows means nothing matched; we map that to',
			'// id 0 rather than an error, mirroring SetPlan\'s 0-rows answer.',
			'func RemoveUser(db *sql.DB, name string) (int64, error) {',
			'	res, err := db.Exec(',
			'		"DELETE FROM users WHERE name = $1 RETURNING id",',
			'		name)',
			'	if err != nil {',
			'		return 0, err',
			'	}',
			'	if len(res.Rows) == 0 {',
			'		return 0, nil',
			'	}',
			'	return res.Rows[0][0].(int64), nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>How binding works under the hood</h3>' +
			'<p>bytdb parses your template into a statement tree in which ' +
			'<code>$1</code> is a real node — a typed hole. <code>Exec</code> then ' +
			'binds the args into a <em>copy</em> of that tree and runs it. Two ' +
			'consequences fall out. First, safety is structural, not sanitized: ' +
			'there is no rewriting step that could miss an encoding trick, because ' +
			'the value never passes through the tokenizer at all. Second, the ' +
			'parse is reusable — <code>db.Prepare(q)</code> returns a ' +
			'<code>*Stmt</code> you can <code>Exec</code> many times with ' +
			'different args, paying the parse once. That is the same ' +
			'Parse/Bind/Execute split the Postgres wire protocol makes, collapsed ' +
			'into function calls because there is no wire.</p>' +
			'<h3>Why RETURNING is an engine feature, not sugar</h3>' +
			'<p>The write path already holds everything RETURNING reports: the ' +
			'engine assigned the SERIAL from its sequence, filled the DEFAULTs, ' +
			'coerced the values, and wrote the row — all inside one atomic ' +
			'statement. RETURNING just keeps those bytes instead of dropping them. ' +
			'Reconstructing the same answer from the outside takes a second ' +
			'statement, and between the two, anything can happen: another insert ' +
			'takes the “obvious” next id, an update changes the row you meant to ' +
			'read back, a delete removes it. Every RETURNING you write is a ' +
			'read-after-write race you did not have to think about. (The pattern ' +
			'scales up: the next item\'s upsert uses RETURNING to report which of ' +
			'two paths — insert or update — a statement actually took.)</p>' +
			'<h3>The parameter contract is strict on purpose</h3>' +
			'<p>Args are matched to the highest <code>$n</code> in the statement, ' +
			'and a mismatch in either direction fails with <code>wrong number of ' +
			'parameters</code> before anything executes. A lenient engine that ' +
			'ignored extra args or nil-filled missing ones would turn an ' +
			'off-by-one in a refactor into silently wrong data; failing loudly at ' +
			'the call site is the embedded equivalent of a compile error. Note ' +
			'what parameters can <em>not</em> do, in bytdb as in Postgres: they ' +
			'bind <em>values</em>, never identifiers — <code>SELECT * FROM ' +
			'$1</code> is not a thing. A dynamic table or column name must come ' +
			'from your own allow-list, because structure is exactly what binding ' +
			'exists to freeze.</p>',
		],
		complexity: { time: 'O(1) per call — each statement is a point write plus (for RETURNING) echoing the already-materialized row', space: 'O(1) — one bound statement and one returned row' },
	});
})();
