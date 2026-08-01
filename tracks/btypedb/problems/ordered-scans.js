/* Ordered Scans — btypedb: Ordering (Easy). The whole point of an ordered
 * store: keys live sorted, so "every session for user 42" is a pivot search
 * plus a walk, not a table scan. The learner implements Ascend/Descend/
 * Backward over a sorted-keys + map store with sort.SearchStrings pivots;
 * the harness pins pivot-on-a-key vs pivot-between-keys, both directions,
 * and the README's user: / user; prefix-scan trick.
 */
(function () {
	'use strict';
	var T = GoLearnBT;

	// One sorted key line, two directions. The pivot lands via binary search
	// at the first key >= pivot — Ascend walks right from there, Descend
	// walks left (inclusive when the pivot key exists). Marker id
	// namespaced (dgArrowBT02): every track's SVGs share the page's id
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="sorted keys with a pivot found by binary search; Ascend walks right from the first key at or after the pivot, Descend walks left">' +
		'<text x="20" y="24" class="lbl">keys are stored sorted — a scan is: binary-search the pivot, then walk</text>' +
		// the sorted key boxes
		'<rect x="30" y="44" width="80" height="30" rx="4" fill="none" stroke="var(--edge)"/><text x="70" y="64" text-anchor="middle">ada</text>' +
		'<rect x="120" y="44" width="80" height="30" rx="4" fill="none" stroke="var(--edge)"/><text x="160" y="64" text-anchor="middle">bob</text>' +
		'<rect x="210" y="44" width="80" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="250" y="64" text-anchor="middle">mia</text>' +
		'<rect x="300" y="44" width="80" height="30" rx="4" fill="none" stroke="var(--edge)"/><text x="340" y="64" text-anchor="middle">ned</text>' +
		'<rect x="390" y="44" width="80" height="30" rx="4" fill="none" stroke="var(--edge)"/><text x="430" y="64" text-anchor="middle">zoe</text>' +
		// pivot arrow from below
		'<path d="M 250 120 L 250 82" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBT02)"/>' +
		'<text x="250" y="140" text-anchor="middle" class="lbl" style="fill:var(--accent)">SearchStrings(keys, "m") = 2 — first key &gt;= pivot</text>' +
		// directions
		'<path d="M 260 96 L 460 96" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBT02)"/>' +
		'<text x="360" y="112" text-anchor="middle" class="lbl">Ascend("m"): mia, ned, zoe</text>' +
		'<path d="M 240 168 L 40 168" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowBT02w)"/>' +
		'<text x="140" y="158" text-anchor="middle" class="lbl" style="fill:var(--warn)">Descend("m"): bob, ada — "mia" &gt; "m", excluded</text>' +
		'<text x="20" y="198" class="lbl">Descend("mia") would INCLUDE mia: the pivot is inclusive whenever it names a stored key</text>' +
		'<defs>' +
		'<marker id="dgArrowBT02" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowBT02w" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'ordered-scans',
		title: 'Ordered Scans: Ascend, Descend, Pivots',
		nav: 'ordered scans',
		difficulty: 'Easy',
		category: 'Ordering',
		task: 'Implement Ascend(pivot), Descend(pivot) and Backward() over a sorted-key store, locating pivots with sort.SearchStrings.',

		prose: [
			'<h2>Ordered Scans: Ascend, Descend, Pivots</h2>' +
			'<p>“Show me the latest 20 sessions for user 42” against a hash-map ' +
			'store means walking <em>every</em> key, filtering, sorting — O(n) for ' +
			'a query that touches 20 records. The moment your store keeps keys ' +
			'sorted, the same query is: jump to <code>user:42:</code>, walk ' +
			'forward until the prefix ends. That jump-and-walk is the entire pitch ' +
			'of ordered stores, and it is why btypedb is built on a B-tree rather ' +
			'than a map:</p>',
			{ lang: 'go', code: '// Keys are always sorted — range scans come free from the B-tree.\nfor k, u := range db.Ascend("m") { /* every key >= "m", ascending */ }\nfor k, u := range db.Descend("m") { /* every key <= "m", descending */ }\nfor k, u := range db.Backward() { /* all pairs, descending */ }\nfor k := range db.Keys() { /* ascending keys */ }\n\n// The prefix-scan trick: ";" is the byte after ":", so [user: , user;)\n// covers exactly the keys that start with "user:".\nfor k, u := range db.Ascend("user:") {\n\tif k >= "user;" { break }\n\t// every user:* pair, in order\n}' },
			'<p>Your model store keeps a sorted <code>[]string</code> of keys next ' +
			'to a values map — a stand-in for the B-tree’s ordered leaves. Three ' +
			'scan shapes to build on it:</p>' +
			'<ul>' +
			'<li><strong>Ascend(pivot)</strong> — every key <code>&gt;= pivot</code>, ' +
			'ascending. <code>sort.SearchStrings(keys, pivot)</code> returns the ' +
			'index of the first key <code>&gt;= pivot</code> (the insertion point), ' +
			'which is exactly where the walk starts. The pivot itself need not ' +
			'exist — <code>Ascend("m")</code> starts at <code>mia</code>.</li>' +
			'<li><strong>Descend(pivot)</strong> — every key <code>&lt;= pivot</code>, ' +
			'descending. Same binary search, opposite fencepost: the insertion ' +
			'point marks the first key <em>too big</em> to include — unless the ' +
			'pivot key itself is stored, which makes it inclusive. Getting this ' +
			'boundary right is the whole exercise.</li>' +
			'<li><strong>Backward()</strong> — all keys, descending. The “latest ' +
			'first” iteration every feed and log viewer wants.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the three methods. Return fresh slices (callers will ' +
			'append to them), locate pivots with <code>sort.SearchStrings</code> — ' +
			'never a linear scan — and mind the Descend boundary: ' +
			'<code>Descend("m")</code> excludes <code>mia</code>, ' +
			'<code>Descend("mia")</code> includes it.</p>',
		],

		starter: [
			'package main',
			'',
			'import "sort"',
			'',
			'// Store models the B-tree\'s ordered key line: keys stays sorted',
			'// ascending at all times, vals holds the pairs. (The real tree keeps',
			'// both in its leaves; the split here just keeps the exercise small.)',
			'type Store struct {',
			'	keys []string',
			'	vals map[string]string',
			'}',
			'',
			'// NewStore builds a Store from pairs in any order — given, complete.',
			'func NewStore(pairs [][2]string) *Store {',
			'	s := &Store{vals: make(map[string]string)}',
			'	for _, p := range pairs {',
			'		if _, exists := s.vals[p[0]]; !exists {',
			'			s.keys = append(s.keys, p[0])',
			'		}',
			'		s.vals[p[0]] = p[1]',
			'	}',
			'	sort.Strings(s.keys)',
			'	return s',
			'}',
			'',
			'// Ascend returns every key >= pivot, ascending. The pivot need not be',
			'// a stored key. Find the start with sort.SearchStrings (binary',
			'// search), then slice — never scan linearly.',
			'func (s *Store) Ascend(pivot string) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Descend returns every key <= pivot, descending. Careful with the',
			'// boundary: SearchStrings gives the first key >= pivot, which is',
			'// included only when it EQUALS the pivot.',
			'func (s *Store) Descend(pivot string) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Backward returns all keys, descending — "latest first".',
			'func (s *Store) Backward() []string {',
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
			'func main() {',
			'	s := NewStore([][2]string{',
			'		{"zoe", "5"}, {"ada", "1"}, {"mia", "3"}, {"ned", "4"}, {"bob", "2"},',
			'	})',
			'	// A second store shaped like a real namespace, for the prefix trick.',
			'	ns := NewStore([][2]string{',
			'		{"user:1", "ada"}, {"user:2", "bob"}, {"users", "meta"},',
			'		{"user:31", "mia"}, {"team:1", "core"}, {"user;x", "junk"},',
			'	})',
			'	join := func(ks []string) string { return strings.Join(ks, ",") }',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"Ascend(\\"\\"): the empty pivot is <= everything — a full forward scan",',
			'			"ada,bob,mia,ned,zoe",',
			'			func() string { return join(s.Ascend("")) }},',
			'		{"Ascend(\\"m\\"): pivot between keys — starts at the first key after it",',
			'			"mia,ned,zoe",',
			'			func() string { return join(s.Ascend("m")) }},',
			'		{"Ascend(\\"mia\\"): pivot ON a key — that key is included",',
			'			"mia,ned,zoe",',
			'			func() string { return join(s.Ascend("mia")) }},',
			'		{"Ascend past the last key yields an empty scan, not a crash",',
			'			"",',
			'			func() string { return join(s.Ascend("zz")) }},',
			'		{"Descend(\\"m\\"): pivot between keys — mia is > \\"m\\", excluded",',
			'			"bob,ada",',
			'			func() string { return join(s.Descend("m")) }},',
			'		{"Descend(\\"mia\\"): pivot on a key — inclusive, then downward",',
			'			"mia,bob,ada",',
			'			func() string { return join(s.Descend("mia")) }},',
			'		{"Descend(\\"zz\\") from beyond the end covers everything, descending",',
			'			"zoe,ned,mia,bob,ada",',
			'			func() string { return join(s.Descend("zz")) }},',
			'		{"Backward(): all pairs, descending",',
			'			"zoe,ned,mia,bob,ada",',
			'			func() string { return join(s.Backward()) }},',
			'		{"prefix scan: Ascend(\\"user:\\") stopping at \\"user;\\" — exactly the user:* keys",',
			'			"user:1,user:2,user:31",',
			'			func() string {',
			'				out := []string{}',
			'				for _, k := range ns.Ascend("user:") {',
			'					if k >= "user;" {',
			'						break',
			'					}',
			'					out = append(out, k)',
			'				}',
			'				return join(out)',
			'			}},',
			'		{"scans return copies: appending to an Ascend result must not corrupt the store",',
			'			"ada,bob,mia,ned,zoe",',
			'			func() string {',
			'				a := s.Ascend("ned")',
			'				a = append(a, "INTRUDER")',
			'				_ = a',
			'				return join(s.Ascend(""))',
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
			'// Store models the B-tree\'s ordered key line: keys stays sorted',
			'// ascending at all times, vals holds the pairs.',
			'type Store struct {',
			'	keys []string',
			'	vals map[string]string',
			'}',
			'',
			'// NewStore builds a Store from pairs in any order.',
			'func NewStore(pairs [][2]string) *Store {',
			'	s := &Store{vals: make(map[string]string)}',
			'	for _, p := range pairs {',
			'		if _, exists := s.vals[p[0]]; !exists {',
			'			s.keys = append(s.keys, p[0])',
			'		}',
			'		s.vals[p[0]] = p[1]',
			'	}',
			'	sort.Strings(s.keys)',
			'	return s',
			'}',
			'',
			'// Ascend: every key >= pivot, ascending.',
			'//',
			'// SearchStrings is a binary search for the INSERTION POINT: the index',
			'// of the first key >= pivot (len(keys) if none). That single',
			'// definition handles both pivot shapes — a pivot that names a stored',
			'// key lands ON it, a pivot between keys lands on the next one — with',
			'// no special-casing. O(log n) to find the start, O(k) to emit.',
			'func (s *Store) Ascend(pivot string) []string {',
			'	i := sort.SearchStrings(s.keys, pivot)',
			'	// Copy rather than alias: handing out a sub-slice of keys would',
			'	// let a caller\'s append overwrite the store\'s own key line (the',
			'	// shared-backing-array trap). The real engine has the same rule —',
			'	// iterators never expose internal node storage.',
			'	out := make([]string, len(s.keys)-i)',
			'	copy(out, s.keys[i:])',
			'	return out',
			'}',
			'',
			'// Descend: every key <= pivot, descending.',
			'//',
			'// The same insertion point, read from the other side: keys[:i] are',
			'// all STRICTLY below the pivot. If keys[i] exists and equals the',
			'// pivot exactly, it belongs in the scan too — that one-step bump is',
			'// the inclusive-pivot rule ("Descend(\\"mia\\") includes mia").',
			'func (s *Store) Descend(pivot string) []string {',
			'	i := sort.SearchStrings(s.keys, pivot)',
			'	if i < len(s.keys) && s.keys[i] == pivot {',
			'		i++',
			'	}',
			'	// Emit keys[:i] in reverse by walking downward — one pass, and the',
			'	// output is a fresh slice for the same aliasing reason as Ascend.',
			'	out := make([]string, 0, i)',
			'	for j := i - 1; j >= 0; j-- {',
			'		out = append(out, s.keys[j])',
			'	}',
			'	return out',
			'}',
			'',
			'// Backward: the full line, descending. Equivalent to Descend(+inf);',
			'// written directly so the intent ("latest first, no pivot math") is',
			'// obvious at the call site.',
			'func (s *Store) Backward() []string {',
			'	out := make([]string, 0, len(s.keys))',
			'	for j := len(s.keys) - 1; j >= 0; j-- {',
			'		out = append(out, s.keys[j])',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What the real btypedb does</h3>' +
			'<p>The engine’s <code>Ascend</code>/<code>Descend</code>/' +
			'<code>Backward</code> are Go iterators (<code>range</code>-able ' +
			'functions) over a copy-on-write B-tree, not slices: the tree seeks ' +
			'the pivot in O(log n) exactly as your <code>SearchStrings</code> did — ' +
			'a B-tree node <em>is</em> a small sorted array, binary-searched at ' +
			'each level — then streams pairs without materializing anything. Your ' +
			'copy-don’t-alias rule shows up there in a stronger form: iteration ' +
			'runs against an O(1) snapshot of the tree root, so a writer ' +
			'committing mid-scan never disturbs the keys under your feet (the ' +
			'COW-snapshots item builds exactly that machinery).</p>' +
			'<p>Every higher-level feature reduces to these scans. ' +
			'<code>Keys()</code> and <code>Values()</code> are Ascend minus one ' +
			'half of each pair. <code>DeleteRange("user:", "user;")</code> is an ' +
			'Ascend over <code>[min, max)</code> that stages a delete per key and ' +
			'commits them as one atomic batch. Secondary indexes are the same scan ' +
			'walking a <em>different</em> sort order. Get the pivot fenceposts ' +
			'right once and the whole API above them is bookkeeping.</p>' +
			'<h3>Trade-offs</h3>' +
			'<p>Sorted order is not free. A hash map gives O(1) point lookups and ' +
			'no useful scans; the B-tree pays O(log n) per lookup to make every ' +
			'range query cheap. For a KV store that is almost always the right ' +
			'trade — real workloads are full of “everything with this prefix” and ' +
			'“latest N” queries — but it is a trade, and it is why Redis offers ' +
			'both hashes and sorted sets rather than one structure.</p>' +
			'<p>The prefix trick deserves a last look because it generalizes: ' +
			'<code>"user;"</code> works as the exclusive upper bound for prefix ' +
			'<code>"user:"</code> only because <code>;</code> is the byte after ' +
			'<code>:</code>. The general form is “prefix with its last byte ' +
			'incremented”, and libraries call it the <em>prefix successor</em>. ' +
			'Design your key namespace so the separator has a safe successor byte ' +
			'and every per-entity query becomes one cheap range scan — this is ' +
			'the core skill of data modeling on ordered KV stores, from bbolt to ' +
			'FoundationDB to Bigtable.</p>',
		],
		complexity: { time: 'O(log n) to seek the pivot + O(k) to emit k keys', space: 'O(k) for the returned scan' },
	});
})();
