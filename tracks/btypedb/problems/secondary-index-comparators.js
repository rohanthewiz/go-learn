/* Secondary Indexes — btypedb: Ordering (Medium). An index is nothing more
 * than a SECOND sort order over the SAME pairs, defined by a user
 * comparator and maintained on every write. Comparators are Go functions,
 * so they cannot be persisted — indexes re-register after Open and rebuild
 * by scanning existing data. The learner implements index maintenance on
 * Set/Delete plus pivot scans (AscendIndexFrom / DescendIndexFrom) where
 * the pivot is a (key, value) pair. Ties break by primary key.
 */
(function () {
	'use strict';
	var T = GoLearnBT;

	// The same five pairs, two orders: the primary tree sorts by key, the
	// index sorts by the comparator (age, then key). Every write maintains
	// both. Marker id namespaced (dgArrowBT09) because every track's SVGs
	// share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="the same key-value pairs appear in two sort orders: the primary order by key and a secondary index order by age; a write updates both orders atomically">' +
		'<text x="20" y="24" class="lbl">one dataset, two sort orders — an index is just another way to walk the same pairs</text>' +
		'<text x="20" y="56" class="lbl">primary (by key)</text>' +
		'<rect x="150" y="40" width="74" height="26" rx="4" fill="none" stroke="var(--edge)"/><text x="187" y="58" text-anchor="middle">amy 31</text>' +
		'<rect x="230" y="40" width="74" height="26" rx="4" fill="none" stroke="var(--edge)"/><text x="267" y="58" text-anchor="middle">bob 45</text>' +
		'<rect x="310" y="40" width="74" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="347" y="58" text-anchor="middle">cy 22</text>' +
		'<rect x="390" y="40" width="74" height="26" rx="4" fill="none" stroke="var(--edge)"/><text x="427" y="58" text-anchor="middle">dee 31</text>' +
		'<text x="20" y="126" class="lbl" style="fill:var(--accent)">index "by-age"</text>' +
		'<rect x="150" y="110" width="74" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="187" y="128" text-anchor="middle">cy 22</text>' +
		'<rect x="230" y="110" width="74" height="26" rx="4" fill="none" stroke="var(--edge)"/><text x="267" y="128" text-anchor="middle">amy 31</text>' +
		'<rect x="310" y="110" width="74" height="26" rx="4" fill="none" stroke="var(--edge)"/><text x="347" y="128" text-anchor="middle">dee 31</text>' +
		'<rect x="390" y="110" width="74" height="26" rx="4" fill="none" stroke="var(--edge)"/><text x="427" y="128" text-anchor="middle">bob 45</text>' +
		'<path d="M 347 70 C 320 90 240 92 200 106" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="6 4" marker-end="url(#dgArrowBT09)"/>' +
		'<text x="20" y="162" class="lbl">cmp = func(ak, av, bk, bv) int { return av.Age - bv.Age } — ties (amy, dee) break by primary key</text>' +
		'<text x="20" y="186" class="lbl" style="fill:var(--warn)">comparators are Go functions: they cannot be written to the log,</text>' +
		'<text x="20" y="204" class="lbl" style="fill:var(--warn)">so indexes re-register after every Open and rebuild by scanning the data</text>' +
		'<defs><marker id="dgArrowBT09" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'secondary-index-comparators',
		title: 'Secondary Indexes by Comparator',
		nav: 'secondary index comparators',
		difficulty: 'Medium',
		category: 'Ordering',
		task: 'Implement comparator-defined secondary indexes: build on CreateIndex, maintain on Set/Delete, and scan from a (key, value) pivot in both directions.',

		prose: [
			'<h2>Secondary Indexes by Comparator</h2>' +
			'<p>Your user store is keyed by username, and the product team asks ' +
			'for “the ten youngest users”. With only the primary order that is a ' +
			'full scan plus a sort — every single time. What you want is the ' +
			'same data <em>already sorted by age</em>. That is all a secondary ' +
			'index is: another sort order over the same pairs, kept current on ' +
			'every write. btypedb lets you define the order with a plain Go ' +
			'comparator:</p>',
			{ lang: 'go', code: 'err = db.CreateIndex("by-age", func(ak string, av User, bk string, bv User) int {\n\treturn cmp.Compare(av.Age, bv.Age)\n})\nfor k, u := range db.AscendIndex("by-age")  { /* youngest first */ }\nfor k, u := range db.DescendIndex("by-age") { /* oldest first */ }\nfor k, u := range db.AscendIndexFrom("by-age", "", User{Age: 40})  { /* 40+ */ }\nfor k, u := range db.DescendIndexFrom("by-age", "", User{Age: 40}) { /* ≤40 */ }' },
			'<p>The design facts to internalize:</p>' +
			'<ul>' +
			'<li><strong>The comparator sees both keys and both values</strong>, ' +
			'so an order can use any mix of them. When it returns 0, the engine ' +
			'breaks the tie by primary key — every entry gets exactly one ' +
			'deterministic position.</li>' +
			'<li><strong>Pivots are (key, value) pairs.</strong> To start a scan ' +
			'“from age 40” you hand the index a <em>synthetic</em> entry — ' +
			'<code>("", User{Age: 40})</code> — and it seeks the first real entry ' +
			'at-or-after it, comparator first, key tiebreak second. The empty ' +
			'pivot key sorts before every real key among equal ages.</li>' +
			'<li><strong>Maintenance is per write.</strong> A <code>Set</code> ' +
			'must remove the entry’s old position (the old value may sort ' +
			'elsewhere!) and insert at the new one; a <code>Delete</code> removes ' +
			'it. Miss either and the index silently drifts from the data — the ' +
			'worst kind of index bug, because reads still “work”.</li>' +
			'<li><strong>Comparators can’t be persisted</strong> — they are ' +
			'function values, not data — so indexes are re-registered after each ' +
			'<code>Open</code>, and <code>CreateIndex</code> on a non-empty store ' +
			'builds by scanning what is already there.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p><code>CreateIndex</code> and the comparison helpers are given. ' +
			'Implement index maintenance in <code>Set</code> and ' +
			'<code>Delete</code>, and the pivot scans ' +
			'<code>AscendIndexFrom</code> / <code>DescendIndexFrom</code> ' +
			'(binary search via <code>sort.Search</code>, then walk).</p>',
		],

		starter: [
			'package main',
			'',
			'import "sort"',
			'',
			'// User is the value type; the index orders by Age.',
			'type User struct {',
			'	Age int',
			'}',
			'',
			'// Cmp is the comparator shape from the real API: both keys and both',
			'// values, negative/zero/positive like strings.Compare.',
			'type Cmp func(ak string, av User, bk string, bv User) int',
			'',
			'// DB holds the primary data and (at most) one index: the comparator',
			'// and the index order itself, a slice of primary keys sorted by',
			'// (comparator, then key).',
			'type DB struct {',
			'	data map[string]User',
			'	cmp  Cmp',
			'	idx  []string',
			'}',
			'',
			'func NewDB() *DB {',
			'	return &DB{data: make(map[string]User)}',
			'}',
			'',
			'// cmpEntry compares stored entry ak against an arbitrary (pk, pv)',
			'// pair: comparator first, primary key as tiebreak — given, complete.',
			'func (d *DB) cmpEntry(ak string, pk string, pv User) int {',
			'	c := d.cmp(ak, d.data[ak], pk, pv)',
			'	if c != 0 {',
			'		return c',
			'	}',
			'	if ak < pk {',
			'		return -1',
			'	}',
			'	if ak > pk {',
			'		return 1',
			'	}',
			'	return 0',
			'}',
			'',
			'// CreateIndex registers the comparator and BUILDS the order by',
			'// scanning existing data — given, complete. (This is the "re-register',
			'// after Open" path: comparators cannot be persisted.)',
			'func (d *DB) CreateIndex(cmp Cmp) {',
			'	d.cmp = cmp',
			'	d.idx = d.idx[:0]',
			'	for k := range d.data {',
			'		d.idx = append(d.idx, k)',
			'	}',
			'	sort.Slice(d.idx, func(i, j int) bool {',
			'		a, b := d.idx[i], d.idx[j]',
			'		return d.cmpEntry(a, b, d.data[b]) < 0',
			'	})',
			'}',
			'',
			'// Set stores k=u AND maintains the index: the old entry (wherever',
			'// its old value sorted it) must leave, the new one must land at its',
			'// sorted position.',
			'func (d *DB) Set(k string, u User) {',
			'	d.data[k] = u',
			'	// your code here (index maintenance)',
			'}',
			'',
			'// Delete removes k from the data AND from the index order.',
			'func (d *DB) Delete(k string) {',
			'	delete(d.data, k)',
			'	// your code here (index maintenance)',
			'}',
			'',
			'// AscendIndex returns the full index order — given, complete.',
			'func (d *DB) AscendIndex() []string {',
			'	return append([]string(nil), d.idx...)',
			'}',
			'',
			'// AscendIndexFrom returns every entry >= the (pk, pv) pivot, in',
			'// index order. Seek with sort.Search + cmpEntry, then walk.',
			'func (d *DB) AscendIndexFrom(pk string, pv User) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// DescendIndexFrom returns every entry <= the pivot, descending.',
			'func (d *DB) DescendIndexFrom(pk string, pv User) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'// hByAge is the README\'s comparator: values only — ties fall to the',
			'// engine\'s primary-key tiebreak.',
			'func hByAge(ak string, av User, bk string, bv User) int {',
			'	if av.Age != bv.Age {',
			'		if av.Age < bv.Age {',
			'			return -1',
			'		}',
			'		return 1',
			'	}',
			'	return 0',
			'}',
			'',
			'// hDB builds the five-user fixture and registers the index AFTER the',
			'// data exists — the post-Open rebuild path.',
			'func hDB() *DB {',
			'	d := NewDB()',
			'	d.Set("eli", User{Age: 58})',
			'	d.Set("amy", User{Age: 31})',
			'	d.Set("cy", User{Age: 22})',
			'	d.Set("bob", User{Age: 45})',
			'	d.Set("dee", User{Age: 31})',
			'	d.CreateIndex(hByAge)',
			'	return d',
			'}',
			'',
			'func hFmt(d *DB, keys []string) string {',
			'	parts := make([]string, 0, len(keys))',
			'	for _, k := range keys {',
			'		parts = append(parts, fmt.Sprintf("%s=%d", k, d.data[k].Age))',
			'	}',
			'	return strings.Join(parts, ",")',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"CreateIndex on existing data: the rebuild scan sorts by (age, key)",',
			'			"cy=22,amy=31,dee=31,bob=45,eli=58",',
			'			func() string {',
			'				d := hDB()',
			'				return hFmt(d, d.AscendIndex())',
			'			}},',
			'		{"Set after CreateIndex: the new entry lands at its sorted position",',
			'			"cy=22,fay=27,amy=31,dee=31,bob=45,eli=58",',
			'			func() string {',
			'				d := hDB()',
			'				d.Set("fay", User{Age: 27})',
			'				return hFmt(d, d.AscendIndex())',
			'			}},',
			'		{"overwrite MOVES the entry: cy 22→50, one position, no duplicate",',
			'			"amy=31,dee=31,bob=45,cy=50,eli=58",',
			'			func() string {',
			'				d := hDB()',
			'				d.Set("cy", User{Age: 50})',
			'				return hFmt(d, d.AscendIndex())',
			'			}},',
			'		{"Delete removes the entry from the index order too",',
			'			"cy=22,amy=31,bob=45,eli=58",',
			'			func() string {',
			'				d := hDB()',
			'				d.Delete("dee")',
			'				return hFmt(d, d.AscendIndex())',
			'			}},',
			'		{"AscendIndexFrom(\\"\\", 40): everyone 40 and up, youngest first",',
			'			"bob=45,eli=58",',
			'			func() string {',
			'				d := hDB()',
			'				return hFmt(d, d.AscendIndexFrom("", User{Age: 40}))',
			'			}},',
			'		{"pivot ON a tie, empty key: (\\"\\", 31) sorts before amy and dee — both included",',
			'			"amy=31,dee=31,bob=45,eli=58",',
			'			func() string {',
			'				d := hDB()',
			'				return hFmt(d, d.AscendIndexFrom("", User{Age: 31}))',
			'			}},',
			'		{"full (key, value) pivot: (\\"dee\\", 31) skips amy by the key tiebreak",',
			'			"dee=31,bob=45,eli=58",',
			'			func() string {',
			'				d := hDB()',
			'				return hFmt(d, d.AscendIndexFrom("dee", User{Age: 31}))',
			'			}},',
			'		{"DescendIndexFrom(\\"\\", 40): 40-and-under, oldest of those first",',
			'			"dee=31,amy=31,cy=22",',
			'			func() string {',
			'				d := hDB()',
			'				return hFmt(d, d.DescendIndexFrom("", User{Age: 40}))',
			'			}},',
			'		{"pivot past everything: DescendIndexFrom(\\"\\", 99) is the full order, reversed",',
			'			"eli=58,bob=45,dee=31,amy=31,cy=22",',
			'			func() string {',
			'				d := hDB()',
			'				return hFmt(d, d.DescendIndexFrom("", User{Age: 99}))',
			'			}},',
			'		{"maintenance chain: add, move, delete — the order never drifts",',
			'			"fay=27,dee=31,bob=45,amy=61",',
			'			func() string {',
			'				d := hDB()',
			'				d.Set("fay", User{Age: 27})',
			'				d.Set("amy", User{Age: 61})',
			'				d.Delete("cy")',
			'				d.Delete("eli")',
			'				return hFmt(d, d.AscendIndex())',
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
			'import "sort"',
			'',
			'// User is the value type; the index orders by Age.',
			'type User struct {',
			'	Age int',
			'}',
			'',
			'// Cmp is the comparator shape from the real API.',
			'type Cmp func(ak string, av User, bk string, bv User) int',
			'',
			'// DB holds the primary data and one index: the comparator plus the',
			'// index order — a slice of primary keys sorted by (comparator, key).',
			'type DB struct {',
			'	data map[string]User',
			'	cmp  Cmp',
			'	idx  []string',
			'}',
			'',
			'func NewDB() *DB {',
			'	return &DB{data: make(map[string]User)}',
			'}',
			'',
			'// cmpEntry compares stored entry ak against an arbitrary (pk, pv)',
			'// pair: comparator first, primary key tiebreak second. The tiebreak',
			'// gives every entry ONE deterministic position, which is what lets a',
			'// synthetic pivot with an empty key sort before all real entries of',
			'// equal comparator rank.',
			'func (d *DB) cmpEntry(ak string, pk string, pv User) int {',
			'	c := d.cmp(ak, d.data[ak], pk, pv)',
			'	if c != 0 {',
			'		return c',
			'	}',
			'	if ak < pk {',
			'		return -1',
			'	}',
			'	if ak > pk {',
			'		return 1',
			'	}',
			'	return 0',
			'}',
			'',
			'// CreateIndex registers the comparator and builds the order by',
			'// scanning existing data — the post-Open rebuild path.',
			'func (d *DB) CreateIndex(cmp Cmp) {',
			'	d.cmp = cmp',
			'	d.idx = d.idx[:0]',
			'	for k := range d.data {',
			'		d.idx = append(d.idx, k)',
			'	}',
			'	sort.Slice(d.idx, func(i, j int) bool {',
			'		a, b := d.idx[i], d.idx[j]',
			'		return d.cmpEntry(a, b, d.data[b]) < 0',
			'	})',
			'}',
			'',
			'// removeIdx drops k from the index order. A linear scan is honest',
			'// for a slice: binary search cannot find the OLD position after the',
			'// value changed (the comparator would look up the NEW value). The',
			'// real engine avoids this by storing index entries in their own',
			'// B-tree and removing by (old value, key) — O(log n).',
			'func (d *DB) removeIdx(k string) {',
			'	for i, ik := range d.idx {',
			'		if ik == k {',
			'			d.idx = append(d.idx[:i], d.idx[i+1:]...)',
			'			return',
			'		}',
			'	}',
			'}',
			'',
			'// Set stores k=u and maintains the index. Order of operations',
			'// matters: remove the stale entry, THEN store the new value, THEN',
			'// binary-search the insert position — the search compares against',
			'// d.data[k], so the new value must already be in place.',
			'func (d *DB) Set(k string, u User) {',
			'	if d.cmp == nil {',
			'		d.data[k] = u',
			'		return',
			'	}',
			'	d.removeIdx(k)',
			'	d.data[k] = u',
			'	i := sort.Search(len(d.idx), func(i int) bool {',
			'		// First position whose entry sorts AFTER the new one.',
			'		return d.cmpEntry(d.idx[i], k, u) > 0',
			'	})',
			'	d.idx = append(d.idx, "")',
			'	copy(d.idx[i+1:], d.idx[i:])',
			'	d.idx[i] = k',
			'}',
			'',
			'// Delete removes k from data and index. Index first: removeIdx does',
			'// not need the value, but symmetry with Set keeps the invariant',
			'// obvious — idx and data always describe the same key set.',
			'func (d *DB) Delete(k string) {',
			'	if d.cmp != nil {',
			'		d.removeIdx(k)',
			'	}',
			'	delete(d.data, k)',
			'}',
			'',
			'// AscendIndex returns the full index order (a copy — callers append).',
			'func (d *DB) AscendIndex() []string {',
			'	return append([]string(nil), d.idx...)',
			'}',
			'',
			'// AscendIndexFrom: first entry >= pivot, then everything after.',
			'// sort.Search finds the boundary in O(log n); with pk == "" a tie on',
			'// the comparator is INCLUDED (real keys sort after the empty key).',
			'func (d *DB) AscendIndexFrom(pk string, pv User) []string {',
			'	i := sort.Search(len(d.idx), func(i int) bool {',
			'		return d.cmpEntry(d.idx[i], pk, pv) >= 0',
			'	})',
			'	return append([]string(nil), d.idx[i:]...)',
			'}',
			'',
			'// DescendIndexFrom: every entry <= pivot, walked backward. The',
			'// boundary is the first entry STRICTLY after the pivot; reversing',
			'// idx[:j] yields oldest-of-those-first for an age index.',
			'func (d *DB) DescendIndexFrom(pk string, pv User) []string {',
			'	j := sort.Search(len(d.idx), func(i int) bool {',
			'		return d.cmpEntry(d.idx[i], pk, pv) > 0',
			'	})',
			'	out := make([]string, 0, j)',
			'	for i := j - 1; i >= 0; i-- {',
			'		out = append(out, d.idx[i])',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What the real btypedb does</h3>' +
			'<p>Each index in btypedb is a full copy-on-write B-tree whose ' +
			'ordering function is (comparator, then primary key) — exactly your ' +
			'<code>cmpEntry</code> — so removal and insertion during maintenance ' +
			'are both O(log n), fixing the honest-but-linear ' +
			'<code>removeIdx</code> you wrote. Maintenance rides the transaction ' +
			'machinery: a write tx updates its <em>private</em> copies of every ' +
			'index alongside its private data tree, so ' +
			'<code>tx.AscendIndex</code> sees the tx’s own uncommitted updates, ' +
			'rollback discards index changes with everything else, and the ' +
			'commit’s root-pointer swap publishes data and all indexes ' +
			'atomically — readers can never observe an index that disagrees with ' +
			'the data.</p>' +
			'<p>The persistence gap is worth restating precisely: the log stores ' +
			'<em>pairs</em>, never index structure, because a comparator is ' +
			'executable code. After <code>Open</code> replays the log, each ' +
			'<code>CreateIndex</code> call re-registers the function and rebuilds ' +
			'by scanning the tree — your fixture built data first and indexed ' +
			'second to walk exactly that path. SQL databases dodge this by ' +
			'persisting a <em>description</em> of the order (“ON users(age)”) ' +
			'rather than code; the comparator design trades that restart cost for ' +
			'arbitrary Go expressiveness — any function of keys and values can ' +
			'define an order.</p>' +
			'<h3>Trade-offs</h3>' +
			'<p>Indexes are pure write amplification: every <code>Set</code> now ' +
			'touches one tree per index, and every index doubles the ordering ' +
			'metadata held in RAM. That is the same bill SQL databases pay — ' +
			'“don’t over-index” survives the translation intact. The pivot trick ' +
			'you implemented (seek with a synthetic (key, value) entry) is also ' +
			'how composite-key range queries work everywhere: seeking ' +
			'<code>("", Age:40)</code> here is morally identical to ' +
			'<code>WHERE age &gt;= 40 ORDER BY age</code> using an index seek in ' +
			'Postgres.</p>' +
			'<p>Finally, note what the key tiebreak bought you: without it, equal ' +
			'ages would have no defined order, iteration would be ' +
			'nondeterministic, and a pivot could not name an exact position — ' +
			'your <code>("dee", 31)</code> case depends on it. Any time you ' +
			'define a sort for storage, complete it into a <em>total</em> order ' +
			'with a unique final component; “mostly sorted” orders are where ' +
			'pagination bugs (skipped and duplicated rows at page boundaries) ' +
			'come from.</p>',
		],
		complexity: { time: 'O(n log n) build; O(n) maintenance here (O(log n) in the real engine); O(log n + k) pivot scans', space: 'O(n) per index' },
	});
})();
