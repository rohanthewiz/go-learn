/* rowid Tables & WITHOUT ROWID — Semantics (Easy). Every ordinary
 * SQLite table is a B-tree keyed by a 64-bit rowid; INTEGER PRIMARY KEY
 * merely aliases it, any other PRIMARY KEY is secretly a unique index,
 * and WITHOUT ROWID tables cluster on the declared PK instead. The
 * harness pins rowid allocation (max+1, gaps never refilled, the
 * max-int edge), the storage key each table shape really uses, and the
 * one-probe-or-two cost of a lookup by declared primary key.
 */
(function () {
	'use strict';
	var T = GoLearnSQ;

	// The two table shapes: a rowid tree plus a PK index, vs one clustered
	// PK tree. Marker id namespaced (dgArrowSQ07) because every track's
	// SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="a rowid table with a text primary key needs two B-tree probes: the automatic PK index maps key to rowid, then the table tree maps rowid to row; a WITHOUT ROWID table is one clustered tree keyed by the PK">' +
		'<text x="20" y="22" class="lbl">CREATE TABLE t(uuid TEXT PRIMARY KEY, ...) — lookup by uuid</text>' +
		// rowid table: two trees
		'<rect x="20" y="38" width="150" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="95" y="58" text-anchor="middle">PK index tree</text>' +
		'<text x="95" y="74" text-anchor="middle" class="lbl">uuid → rowid</text>' +
		'<path d="M 170 60 L 208 60" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSQ07)"/>' +
		'<rect x="212" y="38" width="150" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="287" y="58" text-anchor="middle">table tree</text>' +
		'<text x="287" y="74" text-anchor="middle" class="lbl">rowid → row</text>' +
		'<text x="400" y="66" class="lbl" style="fill:var(--warn)">= 2 probes</text>' +
		'<text x="20" y="112" class="lbl">…WITHOUT ROWID: the table IS the primary-key tree</text>' +
		// without rowid: one tree
		'<rect x="20" y="126" width="150" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="95" y="146" text-anchor="middle">clustered tree</text>' +
		'<text x="95" y="162" text-anchor="middle" class="lbl">uuid → row</text>' +
		'<text x="210" y="154" class="lbl" style="fill:var(--accent)">= 1 probe (INTEGER PRIMARY KEY gets this too: the PK IS the rowid)</text>' +
		'<text x="20" y="200" class="lbl">rowid allocation in rowid tables: max(rowid)+1 — deleted gaps are never refilled</text>' +
		'<defs><marker id="dgArrowSQ07" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'rowid-and-without-rowid',
		title: 'rowid Tables & WITHOUT ROWID',
		nav: 'rowid tables',
		difficulty: 'Easy',
		category: 'Semantics',
		task: 'Implement NewRowid (max+1 allocation with the exhaustion edge), StorageKey (what physically keys each table shape), and PKLookupProbes (one B-tree probe or two for a lookup by declared PK).',

		prose: [
			'<h2>rowid Tables &amp; WITHOUT ROWID</h2>' +
			'<p>A service keys everything by UUID: <code>CREATE TABLE docs (uuid ' +
			'TEXT PRIMARY KEY, body BLOB)</code>. It works, but ' +
			'<code>EXPLAIN QUERY PLAN SELECT body FROM docs WHERE uuid = ?</code> ' +
			'shows a search of <code>sqlite_autoindex_docs_1</code> — an index ' +
			'nobody created — and the database is bigger than the data. The ' +
			'explanation is the most under-taught fact in SQLite: <strong>every ' +
			'ordinary table is stored as a B-tree keyed by a 64-bit integer ' +
			'rowid</strong>, no matter what the schema says.</p>' +
			'<ul>' +
			'<li><strong><code>INTEGER PRIMARY KEY</code> is an alias for the ' +
			'rowid.</strong> Declare exactly that type and your column ' +
			'<em>is</em> the B-tree key — no extra structure, lookups are one ' +
			'probe.</li>' +
			'<li><strong>Any other PRIMARY KEY is a secret index.</strong> A ' +
			'TEXT or composite PK on a rowid table creates an automatic unique ' +
			'index (<code>sqlite_autoindex_…</code>) mapping PK → rowid. A ' +
			'lookup by PK is two probes: index tree, then table tree. The uuid ' +
			'is stored twice — once in the index, once in the row.</li>' +
			'<li><strong>Rowid allocation is max+1.</strong> Without ' +
			'AUTOINCREMENT, the new rowid is one larger than the current ' +
			'maximum — deleting rows leaves gaps that are never refilled (and ' +
			'deleting the max row means its rowid <em>can</em> be reissued). ' +
			'When the max reaches 2<sup>63</sup>−1, max+1 no longer exists: ' +
			'real sqlite3 then probes random candidates, and reports ' +
			'<code>SQLITE_FULL</code> if none are free. Our deterministic model ' +
			'returns an error at that edge.</li>' +
			'<li><strong><code>WITHOUT ROWID</code> flips the layout:</strong> ' +
			'the table itself is clustered on the declared PK — one tree, one ' +
			'probe, no duplicated key bytes. It requires a PRIMARY KEY (there is ' +
			'nothing else to key the tree).</li>' +
			'</ul>',
			{ lang: 'txt', code: 'table shape                         storage key       PK lookup\n----------------------------------  ----------------  ---------\nno PK, or non-integer PK            rowid             2 probes (via autoindex)\nid INTEGER PRIMARY KEY              rowid (alias id)  1 probe\nPRIMARY KEY(...) WITHOUT ROWID      the declared PK   1 probe\nWITHOUT ROWID, no PK declared       — schema error —' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Three small functions over a <code>TableDesc</code>: ' +
			'<code>NewRowid(existing []int64)</code> — the next rowid under ' +
			'max+1 allocation, 1 for an empty table, an error once the max is ' +
			'<code>math.MaxInt64</code>; <code>StorageKey(t)</code> — ' +
			'<code>"rowid"</code>, <code>"rowid (aliased by X)"</code>, or ' +
			'<code>"PK(a,b)"</code>, with an error for WITHOUT ROWID without a ' +
			'PK; and <code>PKLookupProbes(t)</code> — 1 or 2 B-tree probes for a ' +
			'lookup by the declared PK, an error when no PK exists.</p>',
		],

		starter: [
			'package main',
			'',
			'import (',
			'	"errors"',
			'	"math"',
			')',
			'',
			'// TableDesc describes a table\'s keying shape.',
			'type TableDesc struct {',
			'	PKCols       []string // declared PRIMARY KEY columns; empty = none',
			'	IntegerPK    bool     // the PK is exactly one INTEGER PRIMARY KEY column',
			'	WithoutRowid bool     // declared WITHOUT ROWID',
			'}',
			'',
			'// NewRowid allocates the next rowid the way sqlite3 does without',
			'// AUTOINCREMENT: one more than the current maximum; 1 for an empty',
			'// table. When the maximum is already math.MaxInt64 there is no',
			'// max+1 — return an error (real sqlite3 falls back to random',
			'// probing and eventually SQLITE_FULL).',
			'func NewRowid(existing []int64) (int64, error) {',
			'	_, _ = errors.New, math.MaxInt64 // imports stay while unwritten',
			'	// your code here',
			'	return 0, nil',
			'}',
			'',
			'// StorageKey reports what physically keys the table\'s B-tree:',
			'//',
			'//   rowid table, no/plain PK  -> "rowid"',
			'//   INTEGER PRIMARY KEY col X -> "rowid (aliased by X)"',
			'//   WITHOUT ROWID             -> "PK(a,b)" (declared columns, comma-joined)',
			'//   WITHOUT ROWID with no PK  -> error (sqlite3 rejects the schema)',
			'func StorageKey(t TableDesc) (string, error) {',
			'	// your code here',
			'	return "", nil',
			'}',
			'',
			'// PKLookupProbes counts B-tree probes for a lookup by declared PK:',
			'// 1 when the PK is the storage key (INTEGER PRIMARY KEY, or any',
			'// WITHOUT ROWID table), 2 when it goes through the automatic',
			'// unique index of a rowid table. No PK at all is an error.',
			'func PKLookupProbes(t TableDesc) (int, error) {',
			'	// your code here',
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
			')',
			'',
			T.HARNESS_RT,
			'',
			'// showRowid / showKey / showProbes flatten (value, error) pairs into',
			'// comparable strings.',
			'func showRowid(v int64, err error) string {',
			'	if err != nil {',
			'		return "error"',
			'	}',
			'	return fmt.Sprintf("%d", v)',
			'}',
			'',
			'func showKey(s string, err error) string {',
			'	if err != nil {',
			'		return "error"',
			'	}',
			'	return s',
			'}',
			'',
			'func showProbes(n int, err error) string {',
			'	if err != nil {',
			'		return "error"',
			'	}',
			'	return fmt.Sprintf("%d", n)',
			'}',
			'',
			'func main() {',
			'	// The four shapes from the prose table.',
			'	plain := TableDesc{}                                                        // CREATE TABLE t(x, y)',
			'	intPK := TableDesc{PKCols: []string{"id"}, IntegerPK: true}                 // id INTEGER PRIMARY KEY',
			'	textPK := TableDesc{PKCols: []string{"uuid"}}                               // uuid TEXT PRIMARY KEY',
			'	worUUID := TableDesc{PKCols: []string{"uuid"}, WithoutRowid: true}          // ... WITHOUT ROWID',
			'	worComp := TableDesc{PKCols: []string{"org", "user"}, WithoutRowid: true}   // composite PK, WITHOUT ROWID',
			'	worBroken := TableDesc{WithoutRowid: true}                                  // WITHOUT ROWID, no PK',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"empty table: first rowid is 1",',
			'			"1",',
			'			func() string { return showRowid(NewRowid(nil)) }},',
			'		{"max+1: {1,2,3} allocates 4",',
			'			"4",',
			'			func() string { return showRowid(NewRowid([]int64{1, 2, 3})) }},',
			'		{"max+1 uses the MAX, not the last insert: {7,99,5} allocates 100",',
			'			"100",',
			'			func() string { return showRowid(NewRowid([]int64{7, 99, 5})) }},',
			'		{"gaps are never refilled: {1,2,4} allocates 5, not 3",',
			'			"5",',
			'			func() string { return showRowid(NewRowid([]int64{1, 2, 4})) }},',
			'		{"the exhaustion edge: max already at MaxInt64 has no max+1",',
			'			"error",',
			'			func() string { return showRowid(NewRowid([]int64{5, 9223372036854775807})) }},',
			'		{"plain table: the storage key is the invisible rowid",',
			'			"rowid",',
			'			func() string { return showKey(StorageKey(plain)) }},',
			'		{"INTEGER PRIMARY KEY id: same key, now visible under an alias",',
			'			"rowid (aliased by id)",',
			'			func() string { return showKey(StorageKey(intPK)) }},',
			'		{"TEXT PRIMARY KEY does NOT change the storage key — still rowid",',
			'			"rowid",',
			'			func() string { return showKey(StorageKey(textPK)) }},',
			'		{"WITHOUT ROWID clusters on the declared PK",',
			'			"PK(uuid) PK(org,user)",',
			'			func() string { return showKey(StorageKey(worUUID)) + " " + showKey(StorageKey(worComp)) }},',
			'		{"WITHOUT ROWID without a PRIMARY KEY is a schema error",',
			'			"error",',
			'			func() string { return showKey(StorageKey(worBroken)) }},',
			'		{"PK lookup probes: alias 1, text-PK rowid table 2, WITHOUT ROWID 1",',
			'			"1 2 1",',
			'			func() string {',
			'				return showProbes(PKLookupProbes(intPK)) + " " +',
			'					showProbes(PKLookupProbes(textPK)) + " " +',
			'					showProbes(PKLookupProbes(worUUID))',
			'			}},',
			'		{"no PK declared: probe count is undefined — error",',
			'			"error",',
			'			func() string { return showProbes(PKLookupProbes(plain)) }},',
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
			'	"errors"',
			'	"math"',
			'	"strings"',
			')',
			'',
			'// TableDesc describes a table\'s keying shape.',
			'type TableDesc struct {',
			'	PKCols       []string',
			'	IntegerPK    bool',
			'	WithoutRowid bool',
			'}',
			'',
			'// NewRowid is max+1 allocation. The scan is O(n) here because the',
			'// model holds rowids in a slice; the real engine reads the max in',
			'// O(log n) — it is the last cell of the rightmost leaf of the',
			'// table B-tree, one descent along the right spine.',
			'func NewRowid(existing []int64) (int64, error) {',
			'	if len(existing) == 0 {',
			'		return 1, nil',
			'	}',
			'	max := existing[0]',
			'	for _, id := range existing[1:] {',
			'		if id > max {',
			'			max = id',
			'		}',
			'	}',
			'	// The overflow edge must be checked BEFORE adding: max+1 at',
			'	// MaxInt64 wraps negative, which would silently allocate a',
			'	// "new" rowid below every existing one.',
			'	if max == math.MaxInt64 {',
			'		return 0, errors.New("rowid space exhausted: sqlite3 would probe random rowids, then SQLITE_FULL")',
			'	}',
			'	return max + 1, nil',
			'}',
			'',
			'// StorageKey names the physical B-tree key. The WITHOUT ROWID',
			'// check comes first because it is the only shape where the',
			'// declared PK IS the storage key — everything else is rowid,',
			'// aliased or not.',
			'func StorageKey(t TableDesc) (string, error) {',
			'	if t.WithoutRowid {',
			'		if len(t.PKCols) == 0 {',
			'			// There is nothing to key the clustered tree with;',
			'			// sqlite3 rejects this schema at CREATE TABLE time.',
			'			return "", errors.New("WITHOUT ROWID requires a PRIMARY KEY")',
			'		}',
			'		return "PK(" + strings.Join(t.PKCols, ",") + ")", nil',
			'	}',
			'	if t.IntegerPK && len(t.PKCols) == 1 {',
			'		return "rowid (aliased by " + t.PKCols[0] + ")", nil',
			'	}',
			'	// A non-integer PK changes nothing here: it lives in an',
			'	// automatic unique index, not in the table tree\'s key.',
			'	return "rowid", nil',
			'}',
			'',
			'// PKLookupProbes counts B-tree descents for WHERE pk = ?.',
			'func PKLookupProbes(t TableDesc) (int, error) {',
			'	if len(t.PKCols) == 0 {',
			'		return 0, errors.New("no PRIMARY KEY declared")',
			'	}',
			'	// One probe whenever the PK is the storage key: the alias case',
			'	// and every WITHOUT ROWID table. Two when the automatic index',
			'	// must first translate PK -> rowid, then the table tree',
			'	// translates rowid -> row.',
			'	if t.IntegerPK || t.WithoutRowid {',
			'		return 1, nil',
			'	}',
			'	return 2, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why rowid tables are the default</h3>' +
			'<p>The rowid design predates WITHOUT ROWID by 13 years, and it is a ' +
			'genuinely good default: a monotonically increasing integer key means ' +
			'inserts append to the right edge of the B-tree (no page splits in ' +
			'the middle), the key costs 1–2 varint bytes while rows are young, ' +
			'and every secondary index gets a compact fixed-meaning pointer to ' +
			'the row. The two-probe cost of a non-integer PK is the flip side: ' +
			'the engine kept ONE table layout and expressed your PK as an index ' +
			'over it, rather than complicating the storage layer.</p>' +
			'<h3>When WITHOUT ROWID actually wins</h3>' +
			'<p>The docs are specific: WITHOUT ROWID pays off when the PK is ' +
			'non-integer, rows are small (the rule of thumb: average row under ' +
			'1/20th of a page), and access is dominated by PK lookups — a ' +
			'sessions table keyed by token, a k/v store, an edge table keyed ' +
			'<code>(from, to)</code>. It halves both the probe count and the ' +
			'duplicated key storage from the UUID hook. But large rows in a ' +
			'clustered tree spill to overflow pages mid-key-order, interior ' +
			'pages carry fat text keys instead of 9-byte rowid cells, and ' +
			'<em>secondary</em> indexes on a WITHOUT ROWID table store the full ' +
			'PK per entry — so a fat composite PK taxes every other index you ' +
			'add. Measure with <code>sqlite3_analyzer</code> before ' +
			'committing.</p>' +
			'<h3>AUTOINCREMENT is not what people think</h3>' +
			'<p>Plain max+1 can <em>reuse</em> a rowid: delete the max row and ' +
			'the next insert gets its number back. That is usually harmless, but ' +
			'fatal if rowids leak into external systems as permanent ids. ' +
			'<code>AUTOINCREMENT</code> exists solely to prevent reuse — it ' +
			'records a high-water mark in <code>sqlite_sequence</code> and ' +
			'refuses to go backwards, at the cost of an extra table update per ' +
			'insert. The docs actively discourage it otherwise. You can watch ' +
			'allocation live: <code>SELECT max(rowid) FROM t</code>, insert, ' +
			'<code>SELECT last_insert_rowid()</code> — and ' +
			'<code>PRAGMA index_list(t)</code> shows the ' +
			'<code>sqlite_autoindex</code> your TEXT PRIMARY KEY silently ' +
			'created.</p>',
		],
		complexity: { time: 'O(n) over existing rowids in this model (O(log n) in the real B-tree)', space: 'O(1)' },
	});
})();
