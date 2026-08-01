/* HOT Updates & Fillfactor — MVCC (Medium). Every UPDATE writes a whole new
 * tuple version — but only a cold update pays the real bill: one new entry
 * in EVERY index on the table. A heap-only tuple (HOT) update skips all of
 * that iff no indexed column changed and the new version fits on the same
 * page. The harness pins the two-condition rule, the fillfactor arithmetic
 * that buys HOT its headroom, and index-write counts over an update stream.
 */
(function () {
	'use strict';
	var T = GoLearnPG;

	// HOT chain: the index keeps pointing at the original line pointer; the
	// page-internal chain reaches the newest version. A cold update instead
	// fans out to every index. Marker id namespaced (dgArrowPG03) because
	// every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="HOT update: the index still points at the old line pointer and a page-internal chain reaches the new version; a cold update writes a new entry into every index">' +
		'<text x="20" y="24" class="lbl">HOT: the index never learns the row moved</text>' +
		// index box
		'<rect x="30" y="44" width="120" height="40" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.5"/>' +
		'<text x="90" y="69" text-anchor="middle">index entry</text>' +
		// page box
		'<rect x="230" y="40" width="300" height="90" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.5"/>' +
		'<text x="245" y="60" class="lbl">heap page</text>' +
		'<rect x="250" y="70" width="110" height="40" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="305" y="95" text-anchor="middle">old version</text>' +
		'<rect x="400" y="70" width="110" height="40" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="455" y="95" text-anchor="middle">new version</text>' +
		// arrows: index -> old, old -> new (the HOT chain)
		'<path d="M 150 64 L 244 82" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowPG03)"/>' +
		'<path d="M 360 90 L 394 90" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowPG03)"/>' +
		'<text x="378" y="124" text-anchor="middle" class="lbl" style="fill:var(--accent)">HOT chain (same page)</text>' +
		'<text x="20" y="160" class="lbl">HOT iff: no indexed column changed AND the new version fits on the same page</text>' +
		'<text x="20" y="178" class="lbl" style="fill:var(--warn)">cold update: new tuple lands on another page → one new entry in EVERY index</text>' +
		'<text x="20" y="196" class="lbl">fillfactor &lt; 100 reserves per-page free space so the second condition keeps holding</text>' +
		'<defs><marker id="dgArrowPG03" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'hot-updates',
		title: 'HOT Updates & Fillfactor',
		nav: 'hot updates',
		difficulty: 'Medium',
		category: 'MVCC',
		task: 'Implement the heap-only-tuple decision — IsHOT(changedCols, indexedCols, pageFree, size) — fillfactor headroom, and index-write counts for an update stream.',

		prose: [
			'<h2>HOT Updates &amp; Fillfactor</h2>' +
			'<p>A counters table gets 5,000 UPDATEs a second and its <em>indexes</em> ' +
			'are bloating faster than the table. <code>pg_stat_user_tables</code> ' +
			'tells you why: <code>n_tup_upd</code> is huge while ' +
			'<code>n_tup_hot_upd</code> is nearly zero — almost every update is ' +
			'“cold”. Since an UPDATE in PostgreSQL is really insert-new-version + ' +
			'mark-old-dead, a cold update must also insert a new entry into ' +
			'<strong>every index on the table</strong>, even indexes on columns the ' +
			'UPDATE never touched — each index needs a pointer to the new tuple’s ' +
			'new location. Heap-Only Tuple (HOT) updates are the escape hatch, and ' +
			'the rule is exactly two conditions:</p>' +
			'<ul>' +
			'<li><strong>No indexed column changed.</strong> If any updated column ' +
			'appears in any index, the index <em>key</em> itself must change — a ' +
			'heap-only version is impossible.</li>' +
			'<li><strong>The new version fits on the same page.</strong> HOT works ' +
			'by chaining old→new <em>inside one page</em>; the index keeps pointing ' +
			'at the original line pointer and readers walk the chain. Cross a page ' +
			'boundary and the chain breaks — cold update.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>The second condition is why <code>fillfactor</code> exists: ' +
			'<code>ALTER TABLE t SET (fillfactor = 90)</code> makes INSERTs stop ' +
			'filling each page at 90%, reserving the remaining bytes so future ' +
			'updates of that page’s rows have somewhere to land. Reserved bytes ' +
			'per page: <code>8192 × (100 − fillfactor) / 100</code>.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>IsHOT</code> (the two-condition rule), ' +
			'<code>ReservedFree</code> (the fillfactor arithmetic), and ' +
			'<code>IndexWrites</code>: replay a stream of updates against one page, ' +
			'counting index entries written. A HOT update writes zero index entries ' +
			'and consumes its tuple size from the page’s free space; a cold update ' +
			'writes <code>nIndexes</code> entries and lands elsewhere (this page’s ' +
			'free space is unchanged).</p>',
			{ lang: 'txt', code: 'UPDATE users SET last_seen = now() WHERE id = 7\n  indexes: (id), (email)          changed: {last_seen}\n  no indexed column changed + page has room  ->  HOT: 0 index writes\n\nUPDATE users SET email = $1 WHERE id = 7\n  email is indexed                           ->  cold: ALL indexes written' },
			'<div class="tip">This is the argument against “index everything”: each ' +
			'extra index is not just write amplification on its own column — it ' +
			'can convert <em>every</em> update of unrelated columns from HOT to ' +
			'cold. The classic fix for a hot-row table is dropping low-value ' +
			'indexes and lowering fillfactor, then watching ' +
			'<code>n_tup_hot_upd/n_tup_upd</code> climb.</div>',
		],

		starter: [
			'package main',
			'',
			'const PageSize = 8192',
			'',
			'// Update is one UPDATE against a row on the page being modeled:',
			'// which columns it changed and how large the new tuple version is.',
			'type Update struct {',
			'	ChangedCols  []string',
			'	NewTupleSize int',
			'}',
			'',
			'// IsHOT reports whether an update can be heap-only: no changed',
			'// column is indexed, and the new version fits in the page\'s free',
			'// space (newTupleSize <= pageFree).',
			'func IsHOT(changedCols, indexedCols []string, pageFree, newTupleSize int) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// ReservedFree is the free space (bytes) a fillfactor setting',
			'// reserves on each 8192-byte page: PageSize * (100-fillfactor) / 100,',
			'// truncated (integer math).',
			'func ReservedFree(fillfactor int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// IndexWrites replays updates in order against one page and returns',
			'// the total number of index entries written. HOT: 0 entries, and the',
			'// new version consumes NewTupleSize from pageFree. Cold: nIndexes',
			'// entries, new tuple lands on some other page (pageFree unchanged).',
			'func IndexWrites(updates []Update, indexedCols []string, nIndexes, pageFree int) int {',
			'	// your code here',
			'	return 0',
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
			'	indexed := []string{"id", "email"}',
			'	// The same stream replayed at two free-space levels: the only',
			'	// difference between 4 index writes and 2 is fillfactor headroom.',
			'	stream := []Update{',
			'		{ChangedCols: []string{"bio"}, NewTupleSize: 100},',
			'		{ChangedCols: []string{"bio"}, NewTupleSize: 100},',
			'		{ChangedCols: []string{"email"}, NewTupleSize: 100},',
			'		{ChangedCols: []string{"bio"}, NewTupleSize: 200},',
			'	}',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"unindexed column changed, page has room: HOT",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", IsHOT([]string{"bio"}, indexed, 500, 120)) }},',
			'		{"indexed column (email) changed: never HOT, room or not",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", IsHOT([]string{"email"}, indexed, 500, 120)) }},',
			'		{"unindexed column, but the new version does not fit: cold",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", IsHOT([]string{"bio"}, indexed, 100, 120)) }},',
			'		{"new version exactly fills the free space: still HOT",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", IsHOT([]string{"bio"}, indexed, 120, 120)) }},',
			'		{"ReservedFree(90): fillfactor 90 keeps 819 bytes per page",',
			'			"819",',
			'			func() string { return fmt.Sprintf("%d", ReservedFree(90)) }},',
			'		{"ReservedFree(100): the default reserves nothing",',
			'			"0",',
			'			func() string { return fmt.Sprintf("%d", ReservedFree(100)) }},',
			'		{"ReservedFree(70): heavy-update tables trade 30%% space for HOT",',
			'			"2457",',
			'			func() string { return fmt.Sprintf("%d", ReservedFree(70)) }},',
			'		{"stream on a nearly full page (free=250): u1,u2 HOT then space runs out — 4 index writes",',
			'			"4",',
			'			func() string { return fmt.Sprintf("%d", IndexWrites(stream, indexed, 2, 250)) }},',
			'		{"same stream with headroom (free=1000): only the email update goes cold — 2 writes",',
			'			"2",',
			'			func() string { return fmt.Sprintf("%d", IndexWrites(stream, indexed, 2, 1000)) }},',
			'		{"5 indexes on the table: one cold update writes all 5",',
			'			"5",',
			'			func() string {',
			'				one := []Update{{ChangedCols: []string{"email"}, NewTupleSize: 100}}',
			'				return fmt.Sprintf("%d", IndexWrites(one, indexed, 5, 8000))',
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
			'const PageSize = 8192',
			'',
			'// Update is one UPDATE against a row on the page being modeled:',
			'// which columns it changed and how large the new tuple version is.',
			'type Update struct {',
			'	ChangedCols  []string',
			'	NewTupleSize int',
			'}',
			'',
			'// IsHOT: both conditions must hold, and they are checked cheapest-',
			'// last in the server (the index-column comparison happens while',
			'// forming the new tuple; the space check when choosing its page).',
			'// Here the set intersection is a nested loop — the column lists are',
			'// tiny, and avoiding a map keeps the check allocation-free, which',
			'// matters for something evaluated on every single UPDATE.',
			'func IsHOT(changedCols, indexedCols []string, pageFree, newTupleSize int) bool {',
			'	for _, c := range changedCols {',
			'		for _, idx := range indexedCols {',
			'			if c == idx {',
			'				// The index KEY changes: some index must get a new',
			'				// entry, so a heap-only version is impossible.',
			'				return false',
			'			}',
			'		}',
			'	}',
			'	// Fitting exactly counts: <= not <. The server asks the free',
			'	// space map the same question.',
			'	return newTupleSize <= pageFree',
			'}',
			'',
			'// ReservedFree: integer arithmetic on purpose — the server computes',
			'// the fillfactor limit in bytes and truncates; matching that keeps',
			'// the numbers auditable against the docs (8192 * 10 / 100 = 819).',
			'func ReservedFree(fillfactor int) int {',
			'	return PageSize * (100 - fillfactor) / 100',
			'}',
			'',
			'// IndexWrites replays the stream statefully: HOT updates eat the',
			'// page\'s free space (each heap-only version still occupies bytes on',
			'// THIS page — that is the whole trick), so early HOT updates can',
			'// push later ones cold. Cold updates place the new version on some',
			'// other page, leaving this page\'s free space alone but charging one',
			'// entry per index. The asymmetry is the lesson: page-local state',
			'// decides a global write-amplification bill.',
			'func IndexWrites(updates []Update, indexedCols []string, nIndexes, pageFree int) int {',
			'	writes := 0',
			'	free := pageFree',
			'	for _, u := range updates {',
			'		if IsHOT(u.ChangedCols, indexedCols, free, u.NewTupleSize) {',
			'			free -= u.NewTupleSize',
			'			continue // heap-only: no index learns anything',
			'		}',
			'		writes += nIndexes',
			'	}',
			'	return writes',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why HOT exists at all</h3>' +
			'<p>HOT (PostgreSQL 8.3, 2008) was the fix for MVCC’s ugliest write ' +
			'amplification. Without it, a table with six indexes paid seven writes ' +
			'per UPDATE — one heap tuple plus six index entries — even when the ' +
			'update touched a column no index covered, because every index entry ' +
			'must point at the new tuple’s physical location. HOT’s insight: if ' +
			'the new version lives <em>on the same page</em>, the index can keep ' +
			'pointing at the old line pointer and a tiny page-internal chain ' +
			'(<code>t_ctid</code> links) reaches the current version. Readers pay ' +
			'one extra hop; writers skip every index. As a bonus, dead HOT chain ' +
			'members can be reclaimed by <em>page pruning</em> during ordinary ' +
			'reads — no VACUUM required — because no index entry references them ' +
			'directly.</p>' +
			'<h3>What breaks in production</h3>' +
			'<ul>' +
			'<li><strong>One careless index kills HOT for everyone.</strong> Add ' +
			'an index on <code>last_updated_at</code> and every touch-the-timestamp ' +
			'update goes cold — all indexes now bloat. Check ' +
			'<code>pg_stat_user_tables.n_tup_hot_upd / n_tup_upd</code> before and ' +
			'after adding an index to a write-hot table; ' +
			'<code>pg_stat_user_indexes.idx_scan</code> tells you whether the ' +
			'index was even worth it.</li>' +
			'<li><strong>Fillfactor is insurance you must buy up front.</strong> ' +
			'It only governs where <em>new</em> inserts stop; a table loaded at ' +
			'the default 100 has no headroom until dead space is vacuumed out. ' +
			'For queue-like and counter-like tables, 70–90 is the usual range — ' +
			'you trade a permanently larger table for stable indexes.</li>' +
			'<li><strong>Cold updates are why “UPDATE-heavy” schemas separate hot ' +
			'columns.</strong> A classic refactor: split ' +
			'<code>users.last_seen</code> into its own narrow table so the ' +
			'20-column, 8-index profile table stops paying for presence pings.</li>' +
			'</ul>' +
			'<h3>Related machinery</h3>' +
			'<p>PostgreSQL 16 added <code>pg_stat_all_tables.n_tup_newpage_upd</code> ' +
			'— updates that went cold specifically because the page was full, i.e. ' +
			'the ones fillfactor could have saved (versus key changes, which it ' +
			'cannot). And since v12, B-tree index deduplication softens — but does ' +
			'not eliminate — the cost of cold updates on low-cardinality indexes. ' +
			'The rule you implemented is <code>heap_update</code>’s ' +
			'<code>satisfies_hot</code> check in <code>heapam.c</code>.</p>',
		],
		complexity: { time: 'O(u × c × i) — per update, the changed×indexed column intersection', space: 'O(1)' },
	});
})();
