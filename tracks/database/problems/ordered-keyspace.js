/* One Ordered Key Space — Inside the Engine (lesson). How bytdb (and
 * CockroachDB) turn SQL tables into a single sorted map: every row becomes
 * key=(tableID, primaryKey) -> value=row, a PK point lookup is one key get,
 * and a full table scan is the half-open range [(tableID), (tableID+1)).
 * The learner implements the toy encoding — with fixed-width table ids,
 * because naive "%d" breaks lexicographic order at table 10 vs 9 — then the
 * program asks the real planner (EXPLAIN: Point Get vs Seq Scan) to show
 * the same two access paths on a live table.
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// The keyspace ruler: users rows cluster before orders rows in ONE
	// sorted structure; a point get lands on exactly one key; a table scan
	// is exactly table 9's half-open range. Marker ids namespaced
	// (dgArrowDBOK) — every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 640 232" width="640" height="232" role="img" aria-label="one ordered key space: users rows cluster before orders rows; a point get hits one key; a table scan brackets exactly the users range">' +
		'<text x="20" y="20" class="lbl">ONE sorted key space — every row of every table, in key order</text>' +
		// point get: label + arrow onto /009/bob
		'<text x="201" y="52" text-anchor="middle" class="lbl" style="fill:var(--accent)">point get rowKey(9, "bob") — ONE key</text>' +
		'<path d="M 201 60 L 201 112" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDBOKget)"/>' +
		// group labels
		'<text x="97" y="108" text-anchor="middle" class="lbl">users = table 9</text>' +
		'<text x="543" y="108" text-anchor="middle" class="lbl" style="fill:var(--warn)">orders = table 10</text>' +
		// users keys (accent)
		'<rect x="48" y="118" width="98" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="97" y="138" text-anchor="middle" class="lbl">/009/alice</text>' +
		'<rect x="152" y="118" width="98" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="201" y="138" text-anchor="middle" class="lbl">/009/bob</text>' +
		'<rect x="256" y="118" width="98" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="305" y="138" text-anchor="middle" class="lbl">/009/carol</text>' +
		// the table boundary: hi bound of table 9, exclusive
		'<path d="M 372 100 L 372 176" stroke="var(--edge)" stroke-width="1.2" stroke-dasharray="4 3"/>' +
		'<text x="372" y="94" text-anchor="middle" class="lbl">/010/ = hi (exclusive)</text>' +
		// orders keys (warn)
		'<rect x="390" y="118" width="98" height="30" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="439" y="138" text-anchor="middle" class="lbl">/010/1001</text>' +
		'<rect x="494" y="118" width="98" height="30" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="543" y="138" text-anchor="middle" class="lbl">/010/1002</text>' +
		// the axis the boxes sit on
		'<path d="M 24 152 L 614 152" stroke="var(--edge)" stroke-width="1.2" marker-end="url(#dgArrowDBOK)"/>' +
		'<text x="612" y="168" text-anchor="end" class="lbl">key order</text>' +
		// table-scan bracket spanning exactly table 9's range
		'<path d="M 48 162 L 48 176 L 372 176 L 372 162" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="210" y="194" text-anchor="middle" class="lbl" style="fill:var(--ok)">table scan of users = range [/009/, /010/) — every users row, not one orders row</text>' +
		'<text x="20" y="222" class="lbl">the relational layer is an ENCODING: sorted keys already give clustering, point gets, and range scans</text>' +
		'<defs>' +
		'<marker id="dgArrowDBOK" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowDBOKget" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'ordered-keyspace',
		title: 'One Ordered Key Space',
		nav: 'ordered keyspace',
		category: 'Inside the Engine',

		prose: [
			'<h2>One Ordered Key Space</h2>' +
			'<p>Run <code>EXPLAIN</code> on two queries against the same table and ' +
			'the planner answers with two different physical plans: ' +
			'<code>Point Get on t</code> for <code>WHERE id = 2</code>, ' +
			'<code>Seq Scan on t</code> for everything else. What are those, ' +
			'<em>physically</em>? The answer is the single load-bearing idea of ' +
			'this whole section, and it is the same answer CockroachDB gives to ' +
			'“how do you build SQL on a key-value store”: you don\'t build tables ' +
			'at all. You build <strong>one big sorted map</strong>, and make ' +
			'tables an <em>encoding</em>:</p>' +
			'<ul>' +
			'<li><strong>Every row is one entry.</strong> ' +
			'<code>key = (tableID, primaryKey)</code>, <code>value = the row</code>. ' +
			'Each table gets an integer id; the key starts with it, so all of a ' +
			'table\'s rows are <em>consecutive</em> in the sorted order — tables ' +
			'“exist” only as clustering.</li>' +
			'<li><strong>A PK lookup is one key get.</strong> ' +
			'<code>WHERE pk = \'bob\'</code> builds the exact key and seeks to it. ' +
			'That is what the planner is telling you with <code>Point Get</code>: ' +
			'no scan, no filter — one seek.</li>' +
			'<li><strong>A full table scan is one range.</strong> Every key of ' +
			'table <code>N</code> is <code>&ge; (N)</code> and <code>&lt; (N+1)</code>, ' +
			'so the scan is the half-open range <code>[(N), (N+1))</code> — ' +
			'computable without knowing a single primary key. Half-open is not ' +
			'pedantry: the <code>hi</code> bound is the first key of the ' +
			'<em>next</em> table, and excluding it is what keeps neighbors from ' +
			'bleeding into each other.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>Why insist on <em>one ordered</em> structure instead of a file per ' +
			'table? Because a sorted KV store already ships everything a ' +
			'relational engine needs underneath: atomic multi-key batches (one ' +
			'commit covers a row and all its index entries), range scans (tables, ' +
			'and later, index ranges), and a single place to hang MVCC versions ' +
			'and WAL records. CockroachDB\'s whole architecture is this layering — ' +
			'SQL on top, a distributed transactional KV store below, and the ' +
			'relational schema reduced to a key encoding. bytdb, the engine ' +
			'answering your queries on this page, is built in the same mold.</p>' +
			'<p>One trap makes or breaks the encoding: the table id must be ' +
			'<strong>fixed-width</strong> in the key. Encode it with a naive ' +
			'<code>%d</code> and table 10 sorts <em>before</em> table 9 — ' +
			'<code>"/10/..." &lt; "/9/..."</code> because the comparison is ' +
			'character by character and <code>\'1\' &lt; \'9\'</code>. Suddenly ' +
			'“a table is a contiguous range” is a lie and every scan is wrong. ' +
			'<code>%03d</code> pads to three digits so lexicographic order agrees ' +
			'with numeric order; real engines use order-preserving <em>binary</em> ' +
			'encodings for the same reason — that encoding, and the secondary ' +
			'indexes built as extra keys in this same space, are the next two ' +
			'items.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>rowKey</code> and <code>tableBounds</code> in the ' +
			'toy string encoding. The rest of the program already: sorts the keys ' +
			'of two tables and prints the clustered keyspace, performs a point ' +
			'get, scans exactly one table\'s range — and then puts the same ' +
			'question to the <em>real</em> planner with <code>EXPLAIN</code>.</p>',
		],

		task: 'Implement rowKey (fixed-width /NNN/pk encoding) and tableBounds (the half-open [ (N), (N+1) ) range) so clustering, the point get, and the range scan all fall out of plain string sorting.',

		starter: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"os"',
			'	"sort"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// Table ids straddling the one-digit/two-digit boundary ON PURPOSE:',
			'// 9 and 10 are exactly the pair a naive "%d" encoding gets wrong',
			'// ("/10/..." sorts before "/9/..." because \'1\' < \'9\').',
			'const (',
			'	usersID  = 9',
			'	ordersID = 10',
			')',
			'',
			'// rowKey encodes one row\'s address in the single ordered key space:',
			'// key = (tableID, primaryKey), rendered here as "/NNN/pk". The table',
			'// id must be FIXED-WIDTH (fmt.Sprintf with %03d) so lexicographic',
			'// string order agrees with numeric table order.',
			'func rowKey(tableID int, pk string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// tableBounds returns the half-open range [lo, hi) covering EVERY',
			'// key of tableID and nothing else. lo is the prefix all of this',
			'// table\'s keys share; hi is the first key of table tableID+1 —',
			'// computable without knowing a single primary key.',
			'func tableBounds(tableID int) (lo, hi string) {',
			'	// your code here',
			'	return "", ""',
			'}',
			'',
			'func main() {',
			'	// Insert rows from BOTH tables in a deliberately shuffled order —',
			'	// the sort below is what reassembles them into tables.',
			'	keys := []string{}',
			'	for _, pk := range []string{"carol", "alice", "bob"} {',
			'		keys = append(keys, rowKey(usersID, pk))',
			'	}',
			'	for _, pk := range []string{"1002", "1001"} {',
			'		keys = append(keys, rowKey(ordersID, pk))',
			'	}',
			'',
			'	// The storage engine\'s ONLY superpower: it keeps keys sorted.',
			'	sort.Strings(keys)',
			'	fmt.Println("-- the keyspace, sorted --")',
			'	for _, k := range keys {',
			'		fmt.Println(k)',
			'	}',
			'',
			'	// A PK lookup: build the exact key, seek to it. One key, no scan.',
			'	target := rowKey(usersID, "bob")',
			'	hit := false',
			'	for _, k := range keys {',
			'		if k == target {',
			'			hit = true',
			'		}',
			'	}',
			'	fmt.Printf("point get %s: hit=%v\\n", target, hit)',
			'',
			'	// A full table scan: every key in [lo, hi). Half-open — hi is the',
			'	// FIRST key of the next table and must be excluded.',
			'	lo, hi := tableBounds(usersID)',
			'	fmt.Printf("scan [%s, %s):\\n", lo, hi)',
			'	captured := 0',
			'	for _, k := range keys {',
			'		if k >= lo && k < hi {',
			'			fmt.Println("  " + k)',
			'			captured++',
			'		}',
			'	}',
			'	fmt.Println("captured", captured, "of", len(keys), "keys")',
			'',
			'	// Now the REAL engine: the planner names these exact two access',
			'	// paths. Point Get = one key; Seq Scan = the table\'s range.',
			'	fmt.Println("-- the real planner --")',
			'	path := os.TempDir() + "/golearn-db-ordered-keyspace.db"',
			'	os.Remove(path) // the wasm module survives across runs — start fresh',
			'	eng, err := bytdb.Open(path)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	defer eng.Close()',
			'	db := sql.New(eng)',
			'	mustExec := func(q string) *sql.Result {',
			'		res, err := db.Exec(q)',
			'		if err != nil {',
			'			panic(err)',
			'		}',
			'		return res',
			'	}',
			'	mustExec(`CREATE TABLE t (id INT PRIMARY KEY, v TEXT)`)',
			'	mustExec(`INSERT INTO t (id, v) VALUES (1, \'a\'), (2, \'b\'), (3, \'c\')`)',
			'	for _, q := range []string{',
			'		`EXPLAIN SELECT * FROM t WHERE id = 2`,',
			'		`EXPLAIN SELECT * FROM t`,',
			'	} {',
			'		fmt.Println(q)',
			'		res := mustExec(q)',
			'		for _, row := range res.Rows {',
			'			fmt.Println(row[0])',
			'		}',
			'	}',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// The sorted keyspace must cluster: all three users keys, in pk
			// order, strictly before both orders keys (first occurrences are
			// the sorted listing, printed before the point-get/scan sections).
			var ks = ['/009/alice', '/009/bob', '/009/carol', '/010/1001', '/010/1002'];
			var last = -1;
			for (var i = 0; i < ks.length; i++) {
				var at = flat.indexOf(ks[i]);
				if (at === -1 || at <= last) return false;
				last = at;
			}
			return flat.indexOf('point get /009/bob: hit=true') !== -1 &&
				flat.indexOf('scan [/009/, /010/):') !== -1 &&
				flat.indexOf('captured 3 of 5 keys') !== -1 &&
				flat.indexOf('Point Get on t') !== -1 &&
				flat.indexOf('Key: (id = 2)') !== -1 &&
				flat.indexOf('Seq Scan on t') !== -1;
		},

		solution: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"os"',
			'	"sort"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			'// Table ids straddling the one-digit/two-digit boundary ON PURPOSE:',
			'// 9 and 10 are exactly the pair a naive "%d" encoding gets wrong',
			'// ("/10/..." sorts before "/9/..." because \'1\' < \'9\').',
			'const (',
			'	usersID  = 9',
			'	ordersID = 10',
			')',
			'',
			'// rowKey encodes one row\'s address in the single ordered key space:',
			'// key = (tableID, primaryKey). %03d is the load-bearing choice: the',
			'// store compares keys byte by byte, so every numeric field must be',
			'// rendered fixed-width for lexicographic order to agree with numeric',
			'// order. (Real engines solve the same problem in binary — e.g.',
			'// big-endian fixed-width ints — the next item builds exactly that.)',
			'func rowKey(tableID int, pk string) string {',
			'	return fmt.Sprintf("/%03d/%s", tableID, pk)',
			'}',
			'',
			'// tableBounds derives "the whole table" as a key range, using zero',
			'// knowledge of its contents. lo = the table\'s shared key prefix;',
			'// hi = the NEXT table\'s prefix. Every key of this table is >= lo',
			'// and < hi, so the half-open [lo, hi) captures all of them and',
			'// nothing else — hi itself belongs to the neighbor and is excluded.',
			'func tableBounds(tableID int) (lo, hi string) {',
			'	lo = fmt.Sprintf("/%03d/", tableID)',
			'	hi = fmt.Sprintf("/%03d/", tableID+1)',
			'	return lo, hi',
			'}',
			'',
			'func main() {',
			'	// Insert rows from BOTH tables in a deliberately shuffled order —',
			'	// the sort below is what reassembles them into tables.',
			'	keys := []string{}',
			'	for _, pk := range []string{"carol", "alice", "bob"} {',
			'		keys = append(keys, rowKey(usersID, pk))',
			'	}',
			'	for _, pk := range []string{"1002", "1001"} {',
			'		keys = append(keys, rowKey(ordersID, pk))',
			'	}',
			'',
			'	// The storage engine\'s ONLY superpower: it keeps keys sorted.',
			'	// Watch the tables re-form as clusters: /009/* then /010/*.',
			'	sort.Strings(keys)',
			'	fmt.Println("-- the keyspace, sorted --")',
			'	for _, k := range keys {',
			'		fmt.Println(k)',
			'	}',
			'',
			'	// A PK lookup: build the exact key, seek to it. One key, no scan',
			'	// — this is what EXPLAIN below calls a Point Get.',
			'	target := rowKey(usersID, "bob")',
			'	hit := false',
			'	for _, k := range keys {',
			'		if k == target {',
			'			hit = true',
			'		}',
			'	}',
			'	fmt.Printf("point get %s: hit=%v\\n", target, hit)',
			'',
			'	// A full table scan: every key in [lo, hi). Half-open — hi is the',
			'	// FIRST key of the next table and must be excluded, or table 10\'s',
			'	// rows would bleed into table 9\'s scans.',
			'	lo, hi := tableBounds(usersID)',
			'	fmt.Printf("scan [%s, %s):\\n", lo, hi)',
			'	captured := 0',
			'	for _, k := range keys {',
			'		if k >= lo && k < hi {',
			'			fmt.Println("  " + k)',
			'			captured++',
			'		}',
			'	}',
			'	fmt.Println("captured", captured, "of", len(keys), "keys")',
			'',
			'	// Now the REAL engine: the planner names these exact two access',
			'	// paths. Point Get = one key; Seq Scan = the table\'s range.',
			'	fmt.Println("-- the real planner --")',
			'	path := os.TempDir() + "/golearn-db-ordered-keyspace.db"',
			'	os.Remove(path) // the wasm module survives across runs — start fresh',
			'	eng, err := bytdb.Open(path)',
			'	if err != nil {',
			'		panic(err)',
			'	}',
			'	defer eng.Close()',
			'	db := sql.New(eng)',
			'	mustExec := func(q string) *sql.Result {',
			'		res, err := db.Exec(q)',
			'		if err != nil {',
			'			panic(err)',
			'		}',
			'		return res',
			'	}',
			'	mustExec(`CREATE TABLE t (id INT PRIMARY KEY, v TEXT)`)',
			'	mustExec(`INSERT INTO t (id, v) VALUES (1, \'a\'), (2, \'b\'), (3, \'c\')`)',
			'	for _, q := range []string{',
			'		`EXPLAIN SELECT * FROM t WHERE id = 2`,',
			'		`EXPLAIN SELECT * FROM t`,',
			'	} {',
			'		fmt.Println(q)',
			'		res := mustExec(q)',
			'		for _, row := range res.Rows {',
			'			fmt.Println(row[0])',
			'		}',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
