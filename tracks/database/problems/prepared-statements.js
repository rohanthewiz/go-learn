/* Prepared statements vs SQL injection (Easy). The same lookup, written two
 * ways, run against the live engine: string concatenation splices the user's
 * text into the SQL grammar (so `x' OR '1'='1` becomes a predicate and a
 * legitimate `O'Brien` becomes a syntax error), while a bound parameter ($1)
 * fixes the query's structure BEFORE the value is ever seen, so attacker text
 * can only ever be data. The harness proves both halves: the concat version
 * leaks every row and chokes on an apostrophe; the parameterized version
 * finds O'Brien, refuses the injection, and leaves the table intact.
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// Two pipelines for the SAME lookup. Top (concat): the attacker's bytes
	// are pasted into the query text, so the PARSER sees them as grammar — a
	// stray quote ends the string and `OR '1'='1'` becomes a real predicate.
	// Bottom (bind): the template is parsed with a $1 HOLE first, so the
	// structure is fixed before the value arrives; the value is then handed
	// to the executor as data and can never become a keyword or an operator.
	// Marker ids are namespaced (dgArrowDBPS*) because every track's SVGs
	// share the page's single id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 600 300" width="600" height="300" role="img" aria-label="string concatenation lets attacker text become SQL grammar; parameter binding parses the query structure first so the value stays data">' +
		'<text x="16" y="22" class="lbl">the same input — <tspan style="font-family:monospace">' + "x' OR '1'='1" + '</tspan> — down two pipelines</text>' +
		// --- concat pipeline (dangerous) ---
		'<text x="16" y="52" style="fill:var(--warn)">1. paste-then-parse (string concatenation)</text>' +
		'<rect x="16" y="64" width="150" height="40" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="91" y="82" text-anchor="middle" class="lbl">input text</text>' +
		'<text x="91" y="98" text-anchor="middle" class="lbl" style="font-family:monospace">' + "x' OR '1'='1" + '</text>' +
		'<path d="M 166 84 L 214 84" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDBPS)"/>' +
		'<rect x="214" y="60" width="250" height="48" rx="5" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="339" y="80" text-anchor="middle" class="lbl" style="font-family:monospace">... WHERE name =</text>' +
		'<text x="339" y="98" text-anchor="middle" class="lbl" style="font-family:monospace;fill:var(--err-fg)">' + "'x' OR '1'='1'" + '</text>' +
		'<path d="M 464 84 L 512 84" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDBPS)"/>' +
		'<text x="556" y="80" text-anchor="middle" style="fill:var(--err-fg)">every</text>' +
		'<text x="556" y="98" text-anchor="middle" style="fill:var(--err-fg)">row</text>' +
		'<text x="214" y="128" class="lbl" style="fill:var(--err-fg)">the quote closed the literal — <tspan style="font-family:monospace">OR</tspan> is now grammar</text>' +
		// --- bind pipeline (safe) ---
		'<text x="16" y="176" style="fill:var(--ok)">2. parse-then-bind (parameter $1)</text>' +
		'<rect x="16" y="188" width="150" height="40" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="91" y="206" text-anchor="middle" class="lbl">input text</text>' +
		'<text x="91" y="222" text-anchor="middle" class="lbl" style="font-family:monospace">' + "x' OR '1'='1" + '</text>' +
		'<path d="M 166 208 L 214 208" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDBPSok)"/>' +
		'<rect x="214" y="184" width="250" height="48" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="339" y="204" text-anchor="middle" class="lbl" style="font-family:monospace">... WHERE name = $1</text>' +
		'<text x="339" y="222" text-anchor="middle" class="lbl">structure parsed first; value bound after</text>' +
		'<path d="M 464 208 L 512 208" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDBPSok)"/>' +
		'<text x="556" y="204" text-anchor="middle" style="fill:var(--ok)">zero</text>' +
		'<text x="556" y="222" text-anchor="middle" style="fill:var(--ok)">rows</text>' +
		'<text x="214" y="252" class="lbl" style="fill:var(--ok)">the value is compared as one string — no row is named that</text>' +
		'<text x="16" y="288" class="lbl">structure decided before the value is seen is the whole idea — the value can never redraw the query</text>' +
		'<defs>' +
		'<marker id="dgArrowDBPS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowDBPSok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'prepared-statements',
		title: 'Parameters, Not Strings: Killing SQL Injection',
		nav: 'prepared statements',
		difficulty: 'Easy',
		category: 'Integrity & Change',
		task: 'Rewrite FindUser to bind the name as a query parameter ($1) instead of concatenating it into the SQL text, so injection payloads stay data and legitimate apostrophes stop breaking the query.',

		prose: [
			'<h2>The login box that returned every user</h2>' +
			'<p>A code review lands on your desk: a <code>FindUser</code> helper that ' +
			'builds its query by gluing the caller’s <code>name</code> straight ' +
			'into a SQL string. It works in the demo. Then someone types ' +
			'<code>x’ OR ’1’=’1</code> into the search box and the ' +
			'endpoint cheerfully returns the <em>entire</em> users table — admin ' +
			'row included. And a customer named <code>O’Brien</code> has been ' +
			'quietly unable to log in for months, because the apostrophe in their name ' +
			'closes the string literal early and the query dies with a syntax error. ' +
			'Same bug, two symptoms: the database is parsing user data as SQL.</p>' +
			'<ul>' +
			'<li><strong>Concatenation pastes, then parses.</strong> ' +
			'<code>"... WHERE name = ’" + name + "’"</code> hands the parser a ' +
			'finished string in which the attacker’s bytes are indistinguishable ' +
			'from the SQL you wrote. A single <code>’</code> ends the literal; ' +
			'everything after it is grammar.</li>' +
			'<li><strong>Binding parses, then fills a hole.</strong> ' +
			'<code>db.Exec("... WHERE name = $1", name)</code> sends the query ' +
			'<em>with the <code>$1</code> placeholder</em> to the engine, which parses ' +
			'and plans it while the value is still off to the side. The value is ' +
			'compared as one opaque string — it can never become a keyword, an ' +
			'operator, or a second statement.</li>' +
			'<li><strong>The apostrophe stops mattering.</strong> Because ' +
			'<code>O’Brien</code> is delivered as data, not spliced into text, ' +
			'there is no literal to terminate. The name with the quote in it just ' +
			'… works.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>The starter’s <code>FindUser</code> is the code under review: it ' +
			'concatenates. Replace its query with a parameterized one — ' +
			'<code>WHERE name = $1</code>, passing <code>name</code> as the argument to ' +
			'<code>db.Exec</code>. One line changes. The harness seeds four users ' +
			'(including <code>admin</code> and <code>O’Brien</code>) and checks ' +
			'that a normal lookup still works, the injection payload returns nothing, ' +
			'<code>O’Brien</code> is found, and a stacked <code>DROP TABLE</code> ' +
			'string leaves the table standing.</p>',
			{ lang: 'go', code: '// The bug, distilled: the value becomes part of the program.\nq := "SELECT id, name FROM users WHERE name = \'" + name + "\'"\n//                                                ^^^^ attacker writes SQL here\n\n// The fix: the value is an argument, never part of the program text.\nres, err := db.Exec("SELECT id, name FROM users WHERE name = $1", name)' },
		],

		starter: [
			'package main',
			'',
			'import (',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// FindUser looks up users by exact name and returns the matching rows',
			'// as [][]any (each row is {id, name}).',
			'//',
			'// CODE UNDER REVIEW: this builds the query by concatenating the caller\'s',
			'// `name` directly into the SQL text. That is the SQL-injection bug in its',
			'// natural habitat:',
			'//',
			'//   - name = "x\' OR \'1\'=\'1"  -> the quote closes the literal and the',
			'//     trailing OR predicate matches every row (the table leaks).',
			'//   - name = "O\'Brien"        -> the apostrophe closes the literal early',
			'//     and the rest is a syntax error (a real customer can\'t log in).',
			'//',
			'// Your task: stop concatenating. Use a bound parameter so the query\'s',
			'// structure is fixed before the value is seen:',
			'//',
			'//   res, err := db.Exec("SELECT id, name FROM users WHERE name = $1", name)',
			'//',
			'// bytdb\'s $1 placeholders are real prepared parameters (the same wire-',
			'// level params Postgres uses): the value is delivered as data, never as',
			'// SQL text.',
			'func FindUser(db *sql.DB, name string) ([][]any, error) {',
			'	// The concatenated query — replace this with a parameterized Exec.',
			'	query := "SELECT id, name FROM users WHERE name = \'" + name + "\'"',
			'	res, err := db.Exec(query)',
			'	if err != nil {',
			'		return nil, err',
			'	}',
			'	return res.Rows, nil',
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
			'	db, cleanup := openDB("prepared-statements")',
			'	defer cleanup()',
			'',
			'	// Seed four users. Insertion order fixes the SERIAL ids: alice=1,',
			'	// bob=2, admin=3, O\'Brien=4 (note the \'\' escaping in the seed SQL,',
			'	// which is the harness author\'s job, not the caller\'s).',
			'	mustExec(db, "CREATE TABLE users (id SERIAL PRIMARY KEY, name TEXT NOT NULL)")',
			'	mustExec(db, "INSERT INTO users (name) VALUES (\'alice\'), (\'bob\'), (\'admin\'), (\'O\'\'Brien\')")',
			'',
			'	// find runs FindUser and renders its rows as a comparable string,',
			'	// or "error: ..." when the call fails (the concat version errors on',
			'	// the apostrophe and the stacked-statement payloads).',
			'	find := func(name string) string {',
			'		rows, err := FindUser(db, name)',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return fmt.Sprintf("%v", rows)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"a normal exact-name lookup returns just that user",',
			'			"[[1 alice]]",',
			'			func() string { return find("alice") }},',
			'		{"injection: x\' OR \'1\'=\'1 must match NO user (concat leaks the whole table)",',
			'			"[]",',
			'			func() string { return find("x\' OR \'1\'=\'1") }},',
			'		{"a legitimate apostrophe name (O\'Brien) must be found, not a syntax error",',
			'			"[[4 O\'Brien]]",',
			'			func() string { return find("O\'Brien") }},',
			'		{"a stacked DROP TABLE payload returns nothing AND leaves users intact",',
			'			"rows=[] users=4",',
			'			func() string {',
			'				rows, err := FindUser(db, "x\'; DROP TABLE users; --")',
			'				if err != nil {',
			'					return "error: " + err.Error()',
			'				}',
			'				// Re-query the row count: proof the table still exists.',
			'				cnt := mustExec(db, "SELECT count(*) FROM users")',
			'				return fmt.Sprintf("rows=%v users=%v", rows, cnt.Rows[0][0])',
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
			'import (',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// FindUser looks up users by exact name using a BOUND PARAMETER. The',
			'// query text is a fixed template with a $1 hole; `name` travels beside',
			'// it as an argument, never inside it.',
			'//',
			'// Why this is the whole fix, and escaping is not:',
			'//   - The engine parses and plans "... WHERE name = $1" before it has',
			'//     ever looked at the value. The query\'s SHAPE is frozen first, so no',
			'//     value can add a predicate, a statement, or a comment.',
			'//   - The value is then compared as a single opaque string. "x\' OR',
			'//     \'1\'=\'1" is just a (nonexistent) name; "O\'Brien" is just a name',
			'//     with an apostrophe in it. Neither is ever tokenized as SQL.',
			'//   - Escaping tries to win a text-rewriting arms race (encodings,',
			'//     second-order injection, one forgotten call site) and keeps losing.',
			'//     Binding removes the text channel entirely — there is nothing to',
			'//     escape because the value is never text in a query.',
			'//',
			'// bytdb\'s $1 params are real prepared parameters, identical in spirit to',
			'// Postgres wire-protocol parameters.',
			'func FindUser(db *sql.DB, name string) ([][]any, error) {',
			'	res, err := db.Exec("SELECT id, name FROM users WHERE name = $1", name)',
			'	if err != nil {',
			'		return nil, err',
			'	}',
			'	return res.Rows, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Parse-then-bind vs paste-then-parse</h3>' +
			'<p>Every SQL injection is the same category error: <strong>data crossing ' +
			'into the code channel</strong>. When you concatenate, the query string you ' +
			'hand the parser already contains the attacker’s bytes, and the parser ' +
			'has no way to know which characters you meant as structure and which came ' +
			'from a text box. A bound parameter splits those channels physically: the ' +
			'SQL text (with <code>$1</code>) goes down one path and is parsed into a ' +
			'plan; the value goes down another and is attached to the plan as a typed ' +
			'constant. The value is never tokenized, so it can never become ' +
			'<code>OR</code>, <code>;</code>, or <code>--</code>.</p>' +
			'<h3>Why escaping keeps losing</h3>' +
			'<p>The tempting alternative — “just double the quotes” — ' +
			'is a text-rewriting arms race, and defenders keep finding new fronts:</p>' +
			'<ul>' +
			'<li><strong>Encodings.</strong> Multi-byte charset tricks (the classic ' +
			'GBK <code>0x27</code> smuggling against a naive <code>addslashes</code>) ' +
			'let a byte that isn’t a quote <em>become</em> one after the escape ' +
			'function has already run.</li>' +
			'<li><strong>Second-order injection.</strong> You escape on the way in and ' +
			'store the value. Later, some other code reads it back and concatenates it ' +
			'into a new query — now unescaped, now live. The payload sat dormant in ' +
			'the database until a different code path detonated it.</li>' +
			'<li><strong>Numeric and identifier contexts.</strong> Quote-escaping does ' +
			'nothing for <code>WHERE id = $unquoted</code> or for a column/table name ' +
			'built from input; those need different rules, and “different rules per ' +
			'context, applied by hand, at every call site” is exactly how one gets ' +
			'missed.</li>' +
			'</ul>' +
			'<p>Parameterization sidesteps all of it because the value is never text in ' +
			'a query to begin with. (Identifiers still can’t be parameters in ' +
			'standard SQL — for a dynamic column name you must validate against an ' +
			'allow-list, not escape.)</p>' +
			'<h3>Prepared statements in real engines</h3>' +
			'<p>In Postgres, <code>PREPARE</code>/<code>EXECUTE</code> and the extended ' +
			'wire protocol (<code>Parse</code>, <code>Bind</code>, <code>Execute</code>) ' +
			'are the same idea: the server plans the statement once and then binds ' +
			'values into it repeatedly, which is why parameterized queries are also a ' +
			'performance win under load (plan reuse) and why the <code>pg</code> stat ' +
			'views show a stable query text with varying parameters. MySQL and SQLite ' +
			'expose <code>?</code> placeholders; Go’s own <code>database/sql</code> ' +
			'turns <code>db.Query("... WHERE x = ?", v)</code> into a driver-level ' +
			'prepared statement. bytdb’s <code>$1</code>, <code>$2</code> follow ' +
			'the Postgres numbering and are true bound parameters — the value in ' +
			'this exercise reached the executor as data, which is exactly why the ' +
			'injection matched nobody and <code>O’Brien</code> matched themselves.</p>' +
			'<div class="tip">Rule of thumb that never bites you: if a value came from ' +
			'outside your program, it belongs in a parameter, not in the query string ' +
			'— no exceptions for “trusted” internal callers, because ' +
			'today’s internal value is tomorrow’s second-order payload.</div>',
		],
		complexity: { time: 'O(1) query construction; lookup cost is the engine’s (a name index makes it a point lookup)', space: 'O(1) — one bound parameter regardless of the value’s contents' },
	});
})();
