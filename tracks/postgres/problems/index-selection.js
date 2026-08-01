/* Choosing an Index: btree, GIN, GiST, BRIN — Planner (Easy). "CREATE
 * INDEX" without a USING clause always means btree, and btree cannot serve
 * jsonb containment, full-text search, or kNN at all. The decision is a
 * short rules function over the operator class and data shape: composite
 * values → GIN, geometric/distance → GiST, huge naturally-ordered
 * append-only ranges → BRIN, plain scalar equality/range → btree. The
 * harness pins each rule and the precedence between them.
 */
(function () {
	'use strict';
	var T = GoLearnPG;

	// The decision path, in the order the rules must be checked: data shape
	// first (GIN/GiST are about the operators the type needs), then the
	// BRIN storage pattern, then the btree default. Marker id namespaced
	// (dgArrowPG08) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="index selection decision path: composite values with containment or text search go to GIN; geometric or nearest-neighbor to GiST; huge append-only naturally-ordered range scans to BRIN; scalar equality and range to btree">' +
		'<text x="20" y="24" class="lbl">check in this order — the first matching rule wins</text>' +
		// chain of decision boxes
		'<rect x="30" y="40" width="230" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="145" y="63" text-anchor="middle">jsonb @&gt; / tsvector @@ / array &amp;&amp;?</text>' +
		'<rect x="330" y="40" width="90" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="375" y="63" text-anchor="middle">GIN</text>' +
		'<path d="M 260 58 L 324 58" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowPG08)"/>' +
		'<rect x="30" y="88" width="230" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="145" y="111" text-anchor="middle">geometric type / &lt;-&gt; nearest-neighbor?</text>' +
		'<rect x="330" y="88" width="90" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="375" y="111" text-anchor="middle">GiST</text>' +
		'<path d="M 260 106 L 324 106" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowPG08)"/>' +
		'<rect x="30" y="136" width="230" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="145" y="159" text-anchor="middle">huge + append-only + ordered + range?</text>' +
		'<rect x="330" y="136" width="90" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="375" y="159" text-anchor="middle">BRIN</text>' +
		'<path d="M 260 154 L 324 154" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowPG08)"/>' +
		'<rect x="30" y="184" width="230" height="30" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.5"/>' +
		'<text x="145" y="204" text-anchor="middle">otherwise: scalar =, &lt;, range</text>' +
		'<rect x="330" y="184" width="90" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="375" y="204" text-anchor="middle">btree</text>' +
		'<path d="M 260 199 L 324 199" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowPG08)"/>' +
		'<text x="440" y="63" class="lbl">inverted: value → rows</text>' +
		'<text x="440" y="111" class="lbl">bounding-box tree</text>' +
		'<text x="440" y="159" class="lbl">per-block min/max</text>' +
		'<text x="440" y="204" class="lbl">the ordered default</text>' +
		'<defs><marker id="dgArrowPG08" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'index-selection',
		title: 'Choosing an Index: btree, GIN, GiST, BRIN',
		nav: 'index selection',
		difficulty: 'Easy',
		category: 'Planner',
		task: 'Implement ChooseIndex(workload): the rules mapping operator class and data shape to btree, GIN, GiST, or BRIN.',

		prose: [
			'<h2>Choosing an Index: btree, GIN, GiST, BRIN</h2>' +
			'<p>A search feature ships: <code>WHERE attrs @&gt; ' +
			'&#39;{"color":"red"}&#39;</code> over a <code>jsonb</code> column. Someone ' +
			'adds <code>CREATE INDEX ON products (attrs)</code>, deploys, and the ' +
			'query is exactly as slow as before — <code>EXPLAIN</code> still says ' +
			'Seq Scan. The index is <em>fine</em>; it is a <strong>btree</strong> ' +
			'(the USING-less default), and a btree orders whole values — it can ' +
			'answer <code>attrs = $1</code> and nothing else about what’s ' +
			'<em>inside</em> a document. Each access method answers a different ' +
			'question:</p>' +
			'<ul>' +
			'<li><strong>btree</strong> — ordered scalars. <code>=</code>, ' +
			'<code>&lt;</code>, <code>BETWEEN</code>, <code>ORDER BY</code>, and ' +
			'prefix <code>LIKE &#39;abc%&#39;</code>. The default for the excellent ' +
			'reason that it is almost always right for scalar columns.</li>' +
			'<li><strong>GIN</strong> — composite values, inverted: it indexes ' +
			'every <em>element</em> (jsonb key/value, array member, tsvector ' +
			'lexeme) pointing back to its rows. Serves <code>@&gt;</code> ' +
			'containment, array <code>&amp;&amp;</code> overlap, full-text ' +
			'<code>@@</code>. Slower to update — one row touches many entries — ' +
			'but unbeatable at “which rows contain X”.</li>' +
			'<li><strong>GiST</strong> — a tree of bounding predicates. Serves ' +
			'geometric containment/overlap and, crucially, <em>ordered-by-' +
			'distance</em> (<code>&lt;-&gt;</code> kNN) — nearest-neighbor is a ' +
			'tree <em>walk</em>, which an inverted index cannot do. Also ranges, ' +
			'exclusion constraints, and trigram similarity.</li>' +
			'<li><strong>BRIN</strong> — per-block-range min/max summaries, ' +
			'kilobytes for a terabyte. Only useful when physical order tracks ' +
			'logical order — an append-only table with an ever-growing timestamp ' +
			'— and the query is a range. On shuffled data every block range ' +
			'spans everything and the index filters nothing.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>ChooseIndex(w Workload)</code> following the ' +
			'diagram’s order. Type shape first: <code>jsonb</code>/' +
			'<code>tsvector</code>/array types (suffix <code>[]</code>) → GIN; ' +
			'geometric types (<code>point</code>, <code>geometry</code>) or the ' +
			'<code>&lt;-&gt;</code> operator → GiST. Then storage shape: huge + ' +
			'append-only + naturally ordered + range operator → BRIN. Otherwise ' +
			'btree. Note <code>&amp;&amp;</code> appears twice — array overlap is ' +
			'GIN, geometric overlap is GiST — so the <em>type</em> disambiguates, ' +
			'exactly as operator classes do in the real catalog.</p>',
			{ lang: 'txt', code: 'Workload{DataType: "jsonb", Op: "@>"}                               -> GIN\nWorkload{DataType: "point", Op: "<->"}                              -> GiST\nWorkload{DataType: "timestamptz", Op: "range",\n         Huge: true, AppendOnly: true, NaturallyOrdered: true}      -> BRIN\nWorkload{DataType: "int", Op: "="}                                  -> btree' },
			'<div class="tip">The real mechanism behind this table is the ' +
			'<em>operator class</em>: <code>pg_opclass</code> records which ' +
			'operators each access method can serve for each type. When ' +
			'EXPLAIN ignores your index, the first question is not “is the index ' +
			'there?” but “does this index’s method have an opclass for this ' +
			'operator?” — precisely the lookup you are encoding.</div>',
		],

		starter: [
			'package main',
			'',
			'// Workload describes one indexing decision: the column type, the',
			'// dominant operator in the queries, and the table\'s storage shape.',
			'type Workload struct {',
			'	DataType         string // "int", "text", "timestamptz", "jsonb", "tsvector", "text[]", "point", "geometry"',
			'	Op               string // "=", "<", "range", "@>", "&&", "@@", "<->"',
			'	Huge             bool   // table large enough that index size matters',
			'	AppendOnly       bool   // rows only ever appended',
			'	NaturallyOrdered bool   // physical order tracks the column (e.g. created_at)',
			'}',
			'',
			'// ChooseIndex returns "btree", "GIN", "GiST", or "BRIN" per the',
			'// documented rules, checked in order: GIN types, then GiST',
			'// (geometric / <->), then the BRIN storage pattern, then btree.',
			'func ChooseIndex(w Workload) string {',
			'	// your code here — the USING-less default, applied blindly',
			'	return "btree"',
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
			'	pick := func(w Workload) func() string {',
			'		return func() string { return ChooseIndex(w) }',
			'	}',
			'	cases := []tc{',
			'		{"int equality: the default is the right answer",',
			'			"btree", pick(Workload{DataType: "int", Op: "="})},',
			'		{"text range (<): ordered scalar, still btree",',
			'			"btree", pick(Workload{DataType: "text", Op: "<"})},',
			'		{"jsonb containment (@>): btree cannot look inside a document",',
			'			"GIN", pick(Workload{DataType: "jsonb", Op: "@>"})},',
			'		{"full-text search (tsvector @@): inverted lexeme index",',
			'			"GIN", pick(Workload{DataType: "tsvector", Op: "@@"})},',
			'		{"array overlap (text[] &&): per-element, so GIN",',
			'			"GIN", pick(Workload{DataType: "text[]", Op: "&&"})},',
			'		{"same && operator on geometry: bounding boxes — GiST, not GIN",',
			'			"GiST", pick(Workload{DataType: "geometry", Op: "&&"})},',
			'		{"nearest neighbor (point <->): kNN needs a tree walk",',
			'			"GiST", pick(Workload{DataType: "point", Op: "<->"})},',
			'		{"append-only ordered log, range scans, huge: BRIN summaries",',
			'			"BRIN", pick(Workload{DataType: "timestamptz", Op: "range", Huge: true, AppendOnly: true, NaturallyOrdered: true})},',
			'		{"same log but physically shuffled: BRIN filters nothing — btree",',
			'			"btree", pick(Workload{DataType: "timestamptz", Op: "range", Huge: true, AppendOnly: true, NaturallyOrdered: false})},',
			'		{"huge ordered log but point lookups (=): btree, not BRIN",',
			'			"btree", pick(Workload{DataType: "timestamptz", Op: "=", Huge: true, AppendOnly: true, NaturallyOrdered: true})},',
			'		{"small ordered table with ranges: not huge enough to justify BRIN",',
			'			"btree", pick(Workload{DataType: "timestamptz", Op: "range", Huge: false, AppendOnly: true, NaturallyOrdered: true})},',
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
			'import "strings"',
			'',
			'// Workload describes one indexing decision: the column type, the',
			'// dominant operator in the queries, and the table\'s storage shape.',
			'type Workload struct {',
			'	DataType         string // "int", "text", "timestamptz", "jsonb", "tsvector", "text[]", "point", "geometry"',
			'	Op               string // "=", "<", "range", "@>", "&&", "@@", "<->"',
			'	Huge             bool   // table large enough that index size matters',
			'	AppendOnly       bool   // rows only ever appended',
			'	NaturallyOrdered bool   // physical order tracks the column (e.g. created_at)',
			'}',
			'',
			'// ChooseIndex applies the rules in capability order: the type-shaped',
			'// rules (GIN, GiST) come first because for those workloads btree is',
			'// not merely worse — it cannot serve the operator at all. BRIN comes',
			'// next because it is an optimization over an also-correct btree, and',
			'// btree is the fallthrough, mirroring CREATE INDEX\'s own default.',
			'func ChooseIndex(w Workload) string {',
			'	// GIN: composite values queried by their ELEMENTS. The type list',
			'	// is the decider — note that && on an array lands here while &&',
			'	// on geometry falls through to GiST below. Type + operator picks',
			'	// the method, never the operator alone: that is precisely how',
			'	// pg_opclass resolves it.',
			'	if w.DataType == "jsonb" || w.DataType == "tsvector" || strings.HasSuffix(w.DataType, "[]") {',
			'		return "GIN"',
			'	}',
			'	// GiST: spatial predicates and distance ordering. <-> forces GiST',
			'	// regardless of type — kNN is a best-first tree descent, which an',
			'	// inverted index has no way to perform.',
			'	if w.DataType == "point" || w.DataType == "geometry" || w.Op == "<->" {',
			'		return "GiST"',
			'	}',
			'	// BRIN: all four conditions, deliberately conjunctive. Drop any',
			'	// one and the summaries stop paying: a small table fits a btree',
			'	// anyway; updates scatter values across old blocks; shuffled data',
			'	// makes every block range span the whole domain; and a point',
			'	// lookup gains nothing from min/max pruning.',
			'	if w.Huge && w.AppendOnly && w.NaturallyOrdered && isRangeOp(w.Op) {',
			'		return "BRIN"',
			'	}',
			'	return "btree"',
			'}',
			'',
			'// isRangeOp: the scalar comparison family. Split out so the BRIN',
			'// condition reads as the sentence in the docs.',
			'func isRangeOp(op string) bool {',
			'	switch op {',
			'	case "<", ">", "<=", ">=", "range", "BETWEEN":',
			'		return true',
			'	}',
			'	return false',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why btree is the default — and why defaults bite</h3>' +
			'<p>btree serves the overwhelming majority of predicates (equality, ' +
			'range, sorting, uniqueness) with logarithmic everything and decades ' +
			'of optimization — deduplication (v13), bottom-up deletion (v14). ' +
			'Making it the USING-less default is sound engineering; the trap is ' +
			'that <code>CREATE INDEX</code> <em>succeeds</em> on a jsonb column ' +
			'and produces something nearly useless (it indexes whole documents ' +
			'for equality). Nothing warns you; only <code>EXPLAIN</code> tells ' +
			'the truth. Hence the habit this item drills: name the operator ' +
			'first, then pick the method that has an opclass for it.</p>' +
			'<h3>The costs the table hides</h3>' +
			'<ul>' +
			'<li><strong>GIN pays at write time.</strong> One document with 50 ' +
			'keys is 50 index entries, so GIN batches inserts into a pending ' +
			'list flushed later (<code>fastupdate</code>, ' +
			'<code>gin_pending_list_limit</code>) — occasionally making one ' +
			'unlucky INSERT pay for the whole backlog. For jsonb, ' +
			'<code>jsonb_path_ops</code> makes a smaller, faster GIN that serves ' +
			'only <code>@&gt;</code> — a nice example of narrowing the operator ' +
			'set to buy performance.</li>' +
			'<li><strong>GiST trades exactness for generality.</strong> Interior ' +
			'pages store lossy bounding predicates, so leaf hits may need heap ' +
			'rechecks. In exchange it hosts anything tree-shaped: PostGIS runs ' +
			'on it, <code>pg_trgm</code> gives fuzzy <code>LIKE</code> ' +
			'<code>%abc%</code> search, and <code>EXCLUDE USING gist</code> ' +
			'(no overlapping bookings) has no btree equivalent at all.</li>' +
			'<li><strong>BRIN is a bet on physical layout.</strong> Kilobytes ' +
			'per terabyte and near-zero write cost, but the bet is falsified ' +
			'silently by updates or clustering drift — the index still ' +
			'"works", it just stops excluding blocks. Check ' +
			'<code>pg_stats.correlation</code> before trusting it, and ' +
			'remember partitioning by time often solves the same problem more ' +
			'robustly.</li>' +
			'</ul>' +
			'<h3>The methods this table omits</h3>' +
			'<p><strong>hash</strong> (equality-only; rarely beats btree in ' +
			'practice, WAL-logged and legitimate since v10), <strong>SP-GiST</strong> ' +
			'(space-partitioned trees: quadtrees, radix tries — text prefix ' +
			'searches), and the extension ecosystem: <code>pgvector</code>’s ' +
			'HNSW/IVFFlat for embedding similarity are “new operator class, new ' +
			'method” — the same decision procedure with new rows in the table. ' +
			'<code>\\di+</code> shows methods in use; ' +
			'<code>pg_stat_user_indexes.idx_scan</code> shows which indexes ' +
			'actually earn their write amplification.</p>',
		],
		complexity: { time: 'O(1) — a fixed rule cascade', space: 'O(1)' },
	});
})();
