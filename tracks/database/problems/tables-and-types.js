/* Tables and Types — SQL: Foundations (lesson). The track opener: what a
 * relational table actually IS (schema = typed columns, rows = tuples),
 * CREATE TABLE / INSERT / SELECT, NULL vs NOT NULL, SERIAL primary keys —
 * all executed against bytdb, the real storage engine compiled into this
 * page. The starter ships a deliberately loose schema (no NOT NULL) and a
 * single seed row; the learner tightens the DDL, finishes the seed, and
 * proves the constraint bites by watching the engine reject a NULL title.
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// The two-layer anatomy of a table: the schema row (typed columns, the
	// contract) versus the data rows (tuples that must conform). SERIAL is
	// drawn as the engine's hand filling the id column. Marker id namespaced
	// (dgArrowDBTT) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 240" width="560" height="240" role="img" aria-label="a relational table: the schema is a fixed set of typed columns, each row is a tuple conforming to it; SERIAL ids are assigned by the engine">' +
		'<text x="20" y="22" class="lbl">one table = one schema (typed columns) + any number of conforming rows</text>' +
		// schema header row
		'<rect x="30" y="36" width="500" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="85" y="58" text-anchor="middle" class="lbl">id SERIAL</text>' +
		'<text x="215" y="58" text-anchor="middle" class="lbl">title TEXT NOT NULL</text>' +
		'<text x="370" y="58" text-anchor="middle" class="lbl">author TEXT</text>' +
		'<text x="480" y="58" text-anchor="middle" class="lbl">year INT</text>' +
		// column separators, running through header and rows
		'<path d="M 140 36 L 140 178" stroke="var(--edge)" stroke-width="1"/>' +
		'<path d="M 290 36 L 290 178" stroke="var(--edge)" stroke-width="1"/>' +
		'<path d="M 440 36 L 440 178" stroke="var(--edge)" stroke-width="1"/>' +
		// data rows (tuples)
		'<rect x="30" y="74" width="500" height="104" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.4"/>' +
		'<path d="M 30 108 L 530 108" stroke="var(--edge)" stroke-width="1"/>' +
		'<path d="M 30 142 L 530 142" stroke="var(--edge)" stroke-width="1"/>' +
		'<text x="85" y="96" text-anchor="middle">1</text>' +
		'<text x="215" y="96" text-anchor="middle" class="lbl">The Go Prog. Language</text>' +
		'<text x="370" y="96" text-anchor="middle" class="lbl">Donovan &amp; Kernighan</text>' +
		'<text x="480" y="96" text-anchor="middle">2015</text>' +
		'<text x="85" y="130" text-anchor="middle">2</text>' +
		'<text x="215" y="130" text-anchor="middle" class="lbl">Database Internals</text>' +
		'<text x="370" y="130" text-anchor="middle" class="lbl">Petrov</text>' +
		'<text x="480" y="130" text-anchor="middle">2019</text>' +
		'<text x="85" y="164" text-anchor="middle">3</text>' +
		'<text x="215" y="164" text-anchor="middle" class="lbl">The Art of PostgreSQL</text>' +
		'<text x="370" y="164" text-anchor="middle" style="fill:var(--warn)">NULL</text>' +
		'<text x="480" y="164" text-anchor="middle">2022</text>' +
		// annotations
		'<path d="M 85 186 L 85 200" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDBTT)"/>' +
		'<text x="85" y="216" text-anchor="middle" class="lbl" style="fill:var(--accent)">SERIAL: the ENGINE assigns 1, 2, 3…</text>' +
		'<path d="M 370 186 L 370 200" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDBTTw)"/>' +
		'<text x="370" y="216" text-anchor="middle" class="lbl" style="fill:var(--warn)">nullable column: NULL = “unknown”, allowed</text>' +
		'<text x="20" y="236" class="lbl">a NULL aimed at title (NOT NULL) never becomes a row — the engine rejects the whole INSERT</text>' +
		'<defs>' +
		'<marker id="dgArrowDBTT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowDBTTw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'tables-and-types',
		title: 'Tables and Types: Schema as a Contract',
		nav: 'Tables & types',
		category: 'SQL: Foundations',

		prose: [
			'<h2>Tables and Types: Schema as a Contract</h2>' +
			'<p>A report page is down. The stack trace ends in a nil dereference on ' +
			'<code>book.Title</code>, and the post-mortem finds the real culprit ' +
			'three months earlier: the books were kept in a JSON blob column, one ' +
			'importer wrote <code>"title": null</code>, and nothing anywhere was in ' +
			'a position to object. That is the disease relational tables were ' +
			'designed to prevent. A table is not a spreadsheet with pretensions — ' +
			'it is a <strong>contract</strong>:</p>' +
			'<ul>' +
			'<li><strong>The schema is a fixed set of typed columns.</strong> ' +
			'<code>CREATE TABLE books (id SERIAL PRIMARY KEY, title TEXT NOT NULL, ' +
			'author TEXT, year INT)</code> declares, once, what every row must look ' +
			'like: an <code>INT</code> column will never hand you ' +
			'<code>"twenty-fifteen"</code>.</li>' +
			'<li><strong>Each row is a tuple</strong> — one value per column, in ' +
			'column order. <code>INSERT</code> proposes a tuple; the engine checks ' +
			'it against the contract <em>before</em> it is stored, and a tuple that ' +
			'violates it never becomes a row at all.</li>' +
			'<li><strong>NULL is “unknown”, and it is opt-in.</strong> A plain ' +
			'<code>TEXT</code> column accepts NULL (we may genuinely not know the ' +
			'author); <code>NOT NULL</code> revokes that permission. This is the ' +
			'single cheapest data-quality tool in the business: the nil check you ' +
			'write once, in the schema, instead of in every consumer forever.</li>' +
			'<li><strong><code>SERIAL</code> delegates identity to the engine.</strong> ' +
			'You never supply an <code>id</code>; the engine assigns 1, 2, 3… from an ' +
			'internal counter, so concurrent writers can never collide on a key.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>One thing to know before you touch the code: <strong>every query in ' +
			'this track runs against a real database engine</strong> — bytdb, a ' +
			'storage engine with a WAL, snapshots, and secondary indexes, compiled ' +
			'into this page&#39;s wasm binary. When a SELECT returns rows, those rows ' +
			'came off a real key-value store; when an INSERT is rejected, the error ' +
			'text is the engine&#39;s own, produced the moment your constraint fired ' +
			'— nothing here is canned. The program on the right opens that engine ' +
			'the same way a Go service would open SQLite: <code>bytdb.Open(path)</code>, ' +
			'wrap it in the SQL layer, start executing.</p>',
			{ lang: 'sql', code: "CREATE TABLE books (\n  id     SERIAL PRIMARY KEY,  -- engine-assigned identity: 1, 2, 3…\n  title  TEXT NOT NULL,       -- the contract: no book without a title\n  author TEXT,                -- nullable: 'unknown author' is a fact we can store\n  year   INT\n);" },
			'<div class="tip">NULL is <em>unknown</em>, not zero and not the empty ' +
			'string. <code>&#39;&#39;</code> is a title someone typed; NULL is the ' +
			'absence of an answer. Engines print it distinctly too — in this ' +
			'track&#39;s row dumps a NULL comes back as <code>&lt;nil&gt;</code>.</div>' +
			'<h3>Your job</h3>' +
			'<p>The program compiles and runs, but the schema is the loose kind ' +
			'that caused the outage: <code>title</code> is nullable, and only one of ' +
			'the three seed books made it in. Finish it: (1) add <code>NOT NULL</code> ' +
			'to <code>title</code>, (2) insert the other two books — ' +
			'<code>(&#39;Database Internals&#39;, &#39;Petrov&#39;, 2019)</code> and ' +
			'<code>(&#39;The Art of PostgreSQL&#39;, NULL, 2022)</code> — ideally as ' +
			'one multi-row INSERT, and (3) prove the contract now bites: attempt an ' +
			'INSERT with a NULL title and print the error the engine hands back.</p>',
		],

		task: 'Tighten the schema with NOT NULL, finish seeding the three books (SERIAL ids 1..3), and demonstrate the engine rejecting a NULL title.',

		starter: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"os"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'func main() {',
			'	// Open a FRESH database file for this run. The wasm module (and',
			'	// its in-memory filesystem) survives across runs of this page, so',
			'	// without the Remove, run N+1 would see run N\'s rows — and a',
			'	// second CREATE TABLE would fail.',
			'	path := os.TempDir() + "/golearn-db-tables-and-types.db"',
			'	os.Remove(path)',
			'',
			'	// bytdb.Open brings up the storage engine (WAL, key space, the',
			'	// works); sql.New layers the SQL frontend over it. This is a real',
			'	// engine executing in the page — errors below are ITS errors.',
			'	eng, err := bytdb.Open(path)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	defer eng.Close()',
			'	db := sql.New(eng)',
			'',
			'	// TODO(1): this schema is too loose — title can be NULL, which is',
			'	// exactly the bug class the lesson opened with. Add NOT NULL to',
			'	// title. (author stays nullable on purpose: "author unknown" is a',
			'	// legitimate fact; "a book with no title" is not.)',
			'	_, err = db.Exec(`CREATE TABLE books (',
			'		id     SERIAL PRIMARY KEY,',
			'		title  TEXT,',
			'		author TEXT,',
			'		year   INT',
			'	)`)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	fmt.Println("table books created")',
			'',
			'	// TODO(2): seed all three books, not just the first. Extend this',
			'	// into one multi-row INSERT — add:',
			'	//   (\'Database Internals\', \'Petrov\', 2019)',
			'	//   (\'The Art of PostgreSQL\', NULL, 2022)   <- NULL author is fine',
			'	// Note what is MISSING from the column list: id. SERIAL means the',
			'	// engine assigns 1, 2, 3 itself — never insert your own.',
			'	res, err := db.Exec(`INSERT INTO books (title, author, year) VALUES',
			'		(\'The Go Programming Language\', \'Donovan & Kernighan\', 2015)`)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	fmt.Println("inserted", res.RowsAffected, "rows")',
			'',
			'	// Read back what the engine actually stored. res.Rows is [][]any;',
			'	// printing each row shows the tuple, with NULL rendered as <nil>.',
			'	res, err = db.Exec(`SELECT id, title, author, year FROM books ORDER BY id`)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	fmt.Println("cols:", res.Cols)',
			'	for _, row := range res.Rows {',
			'		fmt.Println(row)',
			'	}',
			'',
			'	// TODO(3): prove the tightened contract bites. Attempt an INSERT',
			'	// with a NULL title and print the error, e.g.:',
			'	//   _, err = db.Exec(`INSERT INTO books (title, author, year)',
			'	//       VALUES (NULL, \'Anonymous\', 2024)`)',
			'	//   fmt.Println("NULL title rejected:", err)',
			'	// Right now that insert would SUCCEED — which is the whole problem.',
			'}',
			'',
		].join('\n'),

		// Pinned against a live run of the solution: exact row renderings
		// (SERIAL ids 1..3, NULL author as <nil>) plus the engine's own
		// not-null violation text. The starter prints only row 1 and never
		// triggers the violation, so it cannot pass.
		check: function (stdout, flat) {
			return flat.indexOf('[1 The Go Programming Language Donovan & Kernighan 2015]') !== -1 &&
				flat.indexOf('[2 Database Internals Petrov 2019]') !== -1 &&
				flat.indexOf('[3 The Art of PostgreSQL <nil> 2022]') !== -1 &&
				flat.indexOf('null value in column "title"') !== -1 &&
				flat.indexOf('violates not-null constraint') !== -1;
		},

		solution: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"os"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'func main() {',
			'	// Open a FRESH database file for this run. The wasm module (and',
			'	// its in-memory filesystem) survives across runs of this page, so',
			'	// without the Remove, run N+1 would see run N\'s rows — and a',
			'	// second CREATE TABLE would fail.',
			'	path := os.TempDir() + "/golearn-db-tables-and-types.db"',
			'	os.Remove(path)',
			'',
			'	eng, err := bytdb.Open(path)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	defer eng.Close()',
			'	db := sql.New(eng)',
			'',
			'	// The contract, stated once, enforced forever: title carries',
			'	// NOT NULL because a title-less book is nonsense, while author',
			'	// stays nullable because "author unknown" is a real state of',
			'	// knowledge. Putting the distinction in the schema moves the nil',
			'	// check out of every consumer and into the one place writes',
			'	// cannot route around.',
			'	_, err = db.Exec(`CREATE TABLE books (',
			'		id     SERIAL PRIMARY KEY,',
			'		title  TEXT NOT NULL,',
			'		author TEXT,',
			'		year   INT',
			'	)`)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	fmt.Println("table books created")',
			'',
			'	// One statement, three tuples. Multi-row INSERT is not just less',
			'	// typing: the engine checks and applies it as a unit, so a bad',
			'	// third row would leave zero rows behind, not two. No id column',
			'	// anywhere — SERIAL means identity is the engine\'s job, and it',
			'	// hands out 1, 2, 3 in insertion order.',
			'	res, err := db.Exec(`INSERT INTO books (title, author, year) VALUES',
			'		(\'The Go Programming Language\', \'Donovan & Kernighan\', 2015),',
			'		(\'Database Internals\', \'Petrov\', 2019),',
			'		(\'The Art of PostgreSQL\', NULL, 2022)`)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	fmt.Println("inserted", res.RowsAffected, "rows")',
			'',
			'	// Read back what was actually stored. Row 3 prints its author as',
			'	// <nil>: NULL survived the round-trip as "unknown", not as "" —',
			'	// the nullable column doing exactly what it was told.',
			'	res, err = db.Exec(`SELECT id, title, author, year FROM books ORDER BY id`)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	fmt.Println("cols:", res.Cols)',
			'	for _, row := range res.Rows {',
			'		fmt.Println(row)',
			'	}',
			'',
			'	// The demonstration that matters: the same INSERT the loose schema',
			'	// would have swallowed. Note this error is not handled and moved',
			'	// past by the engine — the statement is REJECTED whole, no row 4',
			'	// exists, and the error text below is bytdb\'s own, generated the',
			'	// instant the constraint fired.',
			'	_, err = db.Exec(`INSERT INTO books (title, author, year) VALUES (NULL, \'Anonymous\', 2024)`)',
			'	fmt.Println("NULL title rejected:", err)',
			'}',
			'',
		].join('\n'),
	});
})();
