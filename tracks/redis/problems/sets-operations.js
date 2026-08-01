/* Sets: Membership & Set Algebra — Data Types (Easy). SADD/SREM/SISMEMBER/
 * SCARD/SMEMBERS plus the server-side algebra SINTER/SUNION/SDIFF, with
 * sorted deterministic outputs. The harness drives a tag-filtering use case:
 * find servers by intersecting tag sets instead of scanning an inventory.
 */
(function () {
	'use strict';
	var T = GoLearnRD;

	// Tag sets intersecting to answer "which servers are BOTH web AND prod?"
	// Marker id namespaced (dgArrowRD06): SVG ids share the page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="two tag sets, tag:web and tag:prod, intersect server-side: SINTER returns only the members present in both">' +
		'<text x="20" y="24" class="lbl">SINTER tag:web tag:prod — the algebra runs where the data lives</text>' +
		'<circle cx="200" cy="110" r="70" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="150" y="70" text-anchor="middle">tag:web</text>' +
		'<circle cx="310" cy="110" r="70" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="365" y="70" text-anchor="middle">tag:prod</text>' +
		'<text x="150" y="108" text-anchor="middle" class="lbl">app3</text>' +
		'<text x="150" y="126" text-anchor="middle" class="lbl">app4</text>' +
		'<text x="255" y="100" text-anchor="middle">app1</text>' +
		'<text x="255" y="126" text-anchor="middle">app2</text>' +
		'<text x="360" y="108" text-anchor="middle" class="lbl">db1</text>' +
		'<text x="360" y="126" text-anchor="middle" class="lbl">cache1</text>' +
		'<path d="M 255 150 L 255 178" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowRD06)"/>' +
		'<text x="255" y="198" text-anchor="middle" class="lbl">SINTER -&gt; {app1, app2} — one round trip, no inventory scan</text>' +
		'<text x="470" y="160" text-anchor="middle" class="lbl">SDIFF tag:web tag:prod</text>' +
		'<text x="470" y="178" text-anchor="middle" class="lbl">-&gt; {app3, app4}: web-only</text>' +
		'<defs><marker id="dgArrowRD06" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'sets-operations',
		title: 'Sets: Membership & Set Algebra',
		nav: 'sets operations',
		difficulty: 'Easy',
		category: 'Data Types',
		task: 'Implement SADD/SREM/SISMEMBER/SCARD/SMEMBERS and the algebra SINTER/SUNION/SDIFF with sorted outputs.',

		prose: [
			'<h2>Sets: Membership &amp; Set Algebra</h2>' +
			'<p>“Deploy the fix to every server tagged <code>web</code> AND ' +
			'<code>prod</code>.” The inventory service answers that with a table ' +
			'scan and a WHERE clause — 40ms and a database round trip. Meanwhile ' +
			'someone’s deduplication job is appending user IDs to a list and ' +
			'checking membership with a full <code>LRANGE</code> scan that gets ' +
			'slower every day. Both are the same missing abstraction: an ' +
			'<strong>unordered collection of unique strings with O(1) ' +
			'membership</strong> — the Redis set.</p>' +
			'<ul>' +
			'<li><strong><code>SADD key m1 [m2 ...]</code></strong> — add members; ' +
			'returns how many were <em>actually new</em>. Adding an existing ' +
			'member is a silent no-op counting 0 — which makes SADD a natural ' +
			'dedupe: the return value tells you whether you’ve seen this ID ' +
			'before, in one command.</li>' +
			'<li><strong><code>SREM key m1 [m2 ...]</code></strong> — remove; ' +
			'returns how many existed. Removing the last member removes the key ' +
			'(no empty aggregates, as always).</li>' +
			'<li><strong><code>SISMEMBER key m</code></strong> — membership test, ' +
			'O(1). The command the list-scanning dedupe job wishes it had.</li>' +
			'<li><strong><code>SCARD key</code></strong> — cardinality; 0 for a ' +
			'missing key.</li>' +
			'<li><strong><code>SMEMBERS key</code></strong> — all members. Real ' +
			'Redis returns them in arbitrary order; return them <em>sorted</em> ' +
			'here so output is deterministic.</li>' +
			'<li><strong>The algebra</strong> — <code>SINTER k1 k2 ...</code> ' +
			'(members in every set), <code>SUNION</code> (members in any), ' +
			'<code>SDIFF k1 k2 ...</code> (members of the <em>first</em> set in ' +
			'none of the rest — note the asymmetry). Missing keys act as empty ' +
			'sets: intersecting with one yields nothing; unioning ignores it.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the eight operations on <code>SetDB</code>, algebra ' +
			'results sorted. The harness builds the tag index from the diagram — ' +
			'<code>tag:web</code>, <code>tag:prod</code>, <code>tag:canary</code> ' +
			'— and asks it deployment questions.</p>' +
			'<div class="tip">For SINTER, start from the <em>smallest</em> set and ' +
			'probe the others — intersecting a 10-member set against a million-' +
			'member set should cost 10 probes, not a million. Redis sorts its ' +
			'input sets by cardinality first for exactly this reason.</div>',
		],

		starter: [
			'package main',
			'',
			'// SetDB is a keyspace of sets. The inner map[string]bool is the',
			'// idiomatic Go set; only presence matters.',
			'type SetDB struct {',
			'	sets map[string]map[string]bool',
			'}',
			'',
			'func NewSetDB() *SetDB {',
			'	return &SetDB{sets: map[string]map[string]bool{}}',
			'}',
			'',
			'// SAdd inserts members, returning how many were NEW (existing',
			'// members count 0).',
			'func (s *SetDB) SAdd(key string, members ...string) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// SRem removes members, returning how many existed. Removing the',
			'// last member removes the key entirely.',
			'func (s *SetDB) SRem(key string, members ...string) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// SIsMember is the O(1) membership test.',
			'func (s *SetDB) SIsMember(key, member string) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// SCard returns the cardinality; 0 for a missing key.',
			'func (s *SetDB) SCard(key string) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// SMembers returns all members SORTED (deterministic stand-in for',
			'// Redis\'s arbitrary order). Empty non-nil slice for a missing key.',
			'func (s *SetDB) SMembers(key string) []string {',
			'	// your code here',
			'	return []string{}',
			'}',
			'',
			'// SInter returns the sorted intersection of the named sets.',
			'// A missing key is an empty set, so any missing key empties the',
			'// whole result.',
			'func (s *SetDB) SInter(keys ...string) []string {',
			'	// your code here',
			'	return []string{}',
			'}',
			'',
			'// SUnion returns the sorted union of the named sets.',
			'func (s *SetDB) SUnion(keys ...string) []string {',
			'	// your code here',
			'	return []string{}',
			'}',
			'',
			'// SDiff returns the sorted members of keys[0] that appear in NONE',
			'// of the remaining sets — first-set-minus-the-rest, asymmetric.',
			'func (s *SetDB) SDiff(keys ...string) []string {',
			'	// your code here',
			'	return []string{}',
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
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	// The tag index from the diagram, plus a canary set.',
			'	s := NewSetDB()',
			'	s.SAdd("tag:web", "app1", "app2", "app3", "app4")',
			'	s.SAdd("tag:prod", "app1", "app2", "db1", "cache1")',
			'	s.SAdd("tag:canary", "app2")',
			'	join := func(xs []string) string { return "[" + strings.Join(xs, " ") + "]" }',
			'	cases := []tc{',
			'		{"SADD returns only the NEW count: app1 exists, app5 is new", "1",',
			'			func() string { return fmt.Sprintf("%d", s.SAdd("tag:web", "app1", "app5")) }},',
			'		{"SCARD tag:web after the add", "5",',
			'			func() string { return fmt.Sprintf("%d", s.SCard("tag:web")) }},',
			'		{"SISMEMBER: is db1 a web box?", "false",',
			'			func() string { return fmt.Sprintf("%v", s.SIsMember("tag:web", "db1")) }},',
			'		{"SMEMBERS sorted", "[app1 app2 app3 app4 app5]",',
			'			func() string { return join(s.SMembers("tag:web")) }},',
			'		{"deploy target: SINTER web AND prod", "[app1 app2]",',
			'			func() string { return join(s.SInter("tag:web", "tag:prod")) }},',
			'		{"three-way SINTER narrows to the canary", "[app2]",',
			'			func() string { return join(s.SInter("tag:web", "tag:prod", "tag:canary")) }},',
			'		{"SINTER with a missing tag: empty — missing means empty set", "[]",',
			'			func() string { return join(s.SInter("tag:web", "tag:no-such")) }},',
			'		{"SUNION web OR prod: every box involved", "[app1 app2 app3 app4 app5 cache1 db1]",',
			'			func() string { return join(s.SUnion("tag:web", "tag:prod")) }},',
			'		{"SUNION ignores missing keys", "[app2]",',
			'			func() string { return join(s.SUnion("tag:canary", "tag:no-such")) }},',
			'		{"SDIFF web minus prod: web-only boxes", "[app3 app4 app5]",',
			'			func() string { return join(s.SDiff("tag:web", "tag:prod")) }},',
			'		{"SDIFF is asymmetric: prod minus web", "[cache1 db1]",',
			'			func() string { return join(s.SDiff("tag:prod", "tag:web")) }},',
			'		{"SREM returns how many existed (app9 never did)", "1",',
			'			func() string { return fmt.Sprintf("%d", s.SRem("tag:canary", "app2", "app9")) }},',
			'		{"...and removing the last member removed the key", "false",',
			'			func() string { _, exists := s.sets["tag:canary"]; return fmt.Sprintf("%v", exists) }},',
			'		{"SCARD on the vanished key is 0", "0",',
			'			func() string { return fmt.Sprintf("%d", s.SCard("tag:canary")) }},',
			'		{"dedupe idiom: the second SADD of the same ID returns 0 — already seen", "first=1 second=0",',
			'			func() string {',
			'				first := s.SAdd("seen:ids", "evt-1")',
			'				second := s.SAdd("seen:ids", "evt-1")',
			'				return fmt.Sprintf("first=%d second=%d", first, second)',
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
			'// The solution replaces the starter wholesale, so the type and its',
			'// constructor are redeclared here.',
			'type SetDB struct {',
			'	sets map[string]map[string]bool',
			'}',
			'',
			'func NewSetDB() *SetDB {',
			'	return &SetDB{sets: map[string]map[string]bool{}}',
			'}',
			'',
			'func (s *SetDB) SAdd(key string, members ...string) int {',
			'	m, exists := s.sets[key]',
			'	if !exists {',
			'		m = map[string]bool{}',
			'		s.sets[key] = m',
			'	}',
			'	added := 0',
			'	for _, mem := range members {',
			'		// The new-vs-present distinction IS the return value — the',
			'		// dedupe idiom relies on it, so count before inserting.',
			'		if !m[mem] {',
			'			m[mem] = true',
			'			added++',
			'		}',
			'	}',
			'	return added',
			'}',
			'',
			'func (s *SetDB) SRem(key string, members ...string) int {',
			'	m, exists := s.sets[key]',
			'	if !exists {',
			'		return 0',
			'	}',
			'	removed := 0',
			'	for _, mem := range members {',
			'		if m[mem] {',
			'			delete(m, mem)',
			'			removed++',
			'		}',
			'	}',
			'	// No empty aggregates: the key dies with its last member.',
			'	if len(m) == 0 {',
			'		delete(s.sets, key)',
			'	}',
			'	return removed',
			'}',
			'',
			'func (s *SetDB) SIsMember(key, member string) bool {',
			'	// Double map index: a missing key yields a nil inner map, and',
			'	// indexing a nil map is a safe zero-value read in Go.',
			'	return s.sets[key][member]',
			'}',
			'',
			'func (s *SetDB) SCard(key string) int {',
			'	return len(s.sets[key])',
			'}',
			'',
			'// sortedKeys turns a Go set into deterministic output. Every reader',
			'// path funnels through here: Go randomizes map iteration order on',
			'// purpose, so forgetting this produces flaky output that passes',
			'// sometimes — the worst kind of bug to hand a harness.',
			'func sortedKeys(m map[string]bool) []string {',
			'	out := make([]string, 0, len(m))',
			'	for k := range m {',
			'		out = append(out, k)',
			'	}',
			'	sort.Strings(out)',
			'	return out',
			'}',
			'',
			'func (s *SetDB) SMembers(key string) []string {',
			'	return sortedKeys(s.sets[key])',
			'}',
			'',
			'func (s *SetDB) SInter(keys ...string) []string {',
			'	if len(keys) == 0 {',
			'		return []string{}',
			'	}',
			'	// Start from the smallest set and probe the rest: intersection',
			'	// cost becomes O(smallest * sets), not O(total). Redis sorts its',
			'	// operands by cardinality for the same reason. A missing key has',
			'	// len 0, becomes the base, and empties the result for free.',
			'	base := keys[0]',
			'	for _, k := range keys[1:] {',
			'		if len(s.sets[k]) < len(s.sets[base]) {',
			'			base = k',
			'		}',
			'	}',
			'	out := map[string]bool{}',
			'	for mem := range s.sets[base] {',
			'		inAll := true',
			'		for _, k := range keys {',
			'			if !s.sets[k][mem] {',
			'				inAll = false',
			'				break',
			'			}',
			'		}',
			'		if inAll {',
			'			out[mem] = true',
			'		}',
			'	}',
			'	return sortedKeys(out)',
			'}',
			'',
			'func (s *SetDB) SUnion(keys ...string) []string {',
			'	out := map[string]bool{}',
			'	for _, k := range keys {',
			'		for mem := range s.sets[k] {',
			'			out[mem] = true',
			'		}',
			'	}',
			'	return sortedKeys(out)',
			'}',
			'',
			'func (s *SetDB) SDiff(keys ...string) []string {',
			'	if len(keys) == 0 {',
			'		return []string{}',
			'	}',
			'	// Asymmetric by definition: only the FIRST set contributes',
			'	// candidates; the rest only veto. SDiff(a) with no others is',
			'	// just SMembers(a).',
			'	out := map[string]bool{}',
			'	for mem := range s.sets[keys[0]] {',
			'		vetoed := false',
			'		for _, k := range keys[1:] {',
			'			if s.sets[k][mem] {',
			'				vetoed = true',
			'				break',
			'			}',
			'		}',
			'		if !vetoed {',
			'			out[mem] = true',
			'		}',
			'	}',
			'	return sortedKeys(out)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Two encodings, one type</h3>' +
			'<p>Like hashes, sets switch representation by content. A set of ' +
			'small <em>integers</em> (up to <code>set-max-intset-entries</code>, ' +
			'default 512) is stored as an <strong>intset</strong>: a sorted array ' +
			'of raw ints, binary-searched, with 2/4/8-byte cells that upgrade as ' +
			'values grow — no hashing, no pointers, brutally compact. Small ' +
			'string sets use a <strong>listpack</strong> (since 7.2), and only ' +
			'past the thresholds does a real hashtable appear. ' +
			'<code>OBJECT ENCODING</code> shows which one you have, and the memory ' +
			'difference between intset and hashtable for a million-member set of ' +
			'IDs is roughly an order of magnitude — one reason to store numeric ' +
			'IDs as numbers, not <code>"user_12345"</code> strings.</p>' +
			'<h3>The algebra runs server-side on purpose</h3>' +
			'<p>The alternative to <code>SINTER</code> is shipping both sets to ' +
			'the app and intersecting there — bandwidth proportional to the sets, ' +
			'not the answer. Server-side algebra inverts that. But it runs on the ' +
			'single thread: <code>SINTER</code> is O(smallest × sets) and ' +
			'<code>SUNION</code>/<code>SDIFF</code> are O(total members), so ' +
			'intersecting two million-member sets stalls every other client — the ' +
			'tag-index pattern works because tag sets are small relative to the ' +
			'keyspace. The <code>SINTERCARD</code> command (7.0) exists for “how ' +
			'many match?” with an early-exit <code>LIMIT</code>, precisely to ' +
			'avoid materializing an answer you only wanted to count. The ' +
			'<code>*STORE</code> variants (<code>SINTERSTORE</code> et al.) write ' +
			'the result to a key, turning an expensive intersection into a cached, ' +
			'expirable artifact.</p>' +
			'<h3>Where sets show up in production</h3>' +
			'<p>Tag indexes (this lesson), dedupe guards (the SADD-returns-0 ' +
			'idiom is an idempotency check in one command), social graphs ' +
			'(followers as sets; <code>SINTER</code> is “mutual follows”), and ' +
			'random sampling — <code>SRANDMEMBER</code> / <code>SPOP</code> do ' +
			'uniform picks natively, which is how you draw lottery winners or ' +
			'shed load fairly. When exact membership at huge scale stops fitting ' +
			'in memory, the graduation path is HyperLogLog (<code>PFADD</code>, ' +
			'~12KB for a cardinality estimate) or a Bloom filter module — both ' +
			'answer “probably seen?” instead of “seen?”, trading certainty for ' +
			'three orders of magnitude in memory.</p>',
		],
		complexity: { time: 'O(1) membership; SINTER O(smallest × sets), SUNION/SDIFF O(total); plus O(k log k) to sort outputs', space: 'O(n) per set; intset/listpack encodings keep small sets pointer-free' },
	});
})();
