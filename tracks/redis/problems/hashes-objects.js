/* Hashes: Objects Without JSON — Data Types (Easy). HSET (returns the count
 * of NEW fields), HGET, HDEL, HEXISTS, HGETALL (sorted for determinism),
 * HINCRBY — one Redis key holding many field/value pairs. The harness pins
 * the new-vs-updated distinction, per-field atomic increments, and empty-
 * hash key removal; the prose makes the case against key-per-field and
 * JSON-blob layouts.
 */
(function () {
	'use strict';
	var T = GoLearnRD;

	// One hash key vs a JSON blob: field-level reads and atomic in-place
	// increments vs read-parse-mutate-serialize-write. Marker id namespaced
	// (dgArrowRD05): SVG ids share the page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="a hash key user:1 holds name, email and logins fields; HINCRBY updates one field in place, while a JSON blob forces a read-modify-write of the whole value">' +
		'<text x="20" y="24" class="lbl">user:1 as a hash — one key, many fields, field-level commands</text>' +
		'<rect x="30" y="40" width="240" height="120" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="150" y="62" text-anchor="middle">user:1</text>' +
		'<line x1="40" y1="72" x2="260" y2="72" stroke="var(--edge)" stroke-width="1.4"/>' +
		'<text x="45" y="92" class="lbl">name   -&gt; "alice"</text>' +
		'<text x="45" y="112" class="lbl">email  -&gt; "a@ex.co"</text>' +
		'<text x="45" y="132" class="lbl" style="fill:var(--warn)">logins -&gt; "42"</text>' +
		'<path d="M 350 100 L 275 128" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowRD05)"/>' +
		'<text x="358" y="96" class="lbl" style="fill:var(--warn)">HINCRBY user:1 logins 1</text>' +
		'<text x="358" y="114" class="lbl">touches ONE field, atomically —</text>' +
		'<text x="358" y="130" class="lbl">no read, no parse, no lost update</text>' +
		'<text x="20" y="186" class="lbl" style="fill:var(--warn)">the JSON-blob alternative: GET user:1, parse, bump logins, serialize, SET —</text>' +
		'<text x="20" y="204" class="lbl" style="fill:var(--warn)">two concurrent bumpers read 42, both write 43: one login lost</text>' +
		'<defs><marker id="dgArrowRD05" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'hashes-objects',
		title: 'Hashes: Objects Without JSON',
		nav: 'hashes objects',
		difficulty: 'Easy',
		category: 'Data Types',
		task: 'Implement HSET (returns # of NEW fields), HGET, HDEL, HEXISTS, HGETALL (sorted), and HINCRBY with the non-integer error.',

		prose: [
			'<h2>Hashes: Objects Without JSON</h2>' +
			'<p>The user-profile cache is losing login counts. The code stores each ' +
			'profile as a JSON blob under one key, and “bump the login counter” is ' +
			'<code>GET</code> → parse → increment → serialize → <code>SET</code>. ' +
			'Two requests land together, both read <code>{"logins": 42}</code>, ' +
			'both write 43 — a lost update, the same race INCR fixed for plain ' +
			'counters, now hiding inside a JSON document. The hash type is Redis’s ' +
			'answer: <strong>one key holding many field/value pairs</strong>, with ' +
			'commands that address a single field atomically.</p>' +
			'<ul>' +
			'<li><strong><code>HSET key f1 v1 [f2 v2 ...]</code></strong> — set ' +
			'fields; returns the number of fields that were <em>newly created</em> ' +
			'(updates of existing fields count 0). That return value is how you ' +
			'distinguish insert from update without a read.</li>' +
			'<li><strong><code>HGET key field</code></strong> — one field’s value, ' +
			'<code>(nil)</code> if the field or key is missing. ' +
			'<strong><code>HEXISTS</code></strong> — does the field exist (an ' +
			'empty-string value still exists — presence and emptiness differ).</li>' +
			'<li><strong><code>HDEL key f1 [f2 ...]</code></strong> — returns how ' +
			'many of the named fields actually existed and were removed. Deleting ' +
			'the last field <strong>removes the key</strong> — same no-empty-' +
			'aggregates rule as lists.</li>' +
			'<li><strong><code>HGETALL key</code></strong> — every field and value. ' +
			'Real Redis returns them in storage order; here, return fields ' +
			'<em>sorted</em> so output is deterministic.</li>' +
			'<li><strong><code>HINCRBY key field n</code></strong> — atomic ' +
			'per-field counter, missing field counts as 0, non-integer value ' +
			'errors with <code>ERR hash value is not an integer</code>. This is ' +
			'the command that fixes the lost-login bug in one line.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the six operations on <code>HashDB</code>. ' +
			'<code>HSet</code> takes alternating <code>field, value</code> pairs ' +
			'(an odd count errors with ' +
			'<code>ERR wrong number of arguments for \'hset\' command</code>); ' +
			'<code>HGetAll</code> returns a flat, field-sorted ' +
			'<code>[f1 v1 f2 v2 ...]</code> slice.</p>' +
			'<div class="tip">Why not one top-level key per field ' +
			'(<code>user:1:name</code>, <code>user:1:email</code>, ...)? Each ' +
			'top-level key costs a keyspace dict entry plus a full value object — ' +
			'roughly 50–100 bytes of overhead per key before your data. A small ' +
			'hash stores its fields in one listpack: a fraction of the memory, one ' +
			'key to expire or delete, and <code>HGETALL</code> fetches the whole ' +
			'object in one round trip.</div>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// HashDB is a keyspace of hashes: key -> field -> value.',
			'type HashDB struct {',
			'	hashes map[string]map[string]string',
			'}',
			'',
			'func NewHashDB() *HashDB {',
			'	return &HashDB{hashes: map[string]map[string]string{}}',
			'}',
			'',
			'// HSet stores alternating field, value pairs and returns how many',
			'// fields were NEWLY created (overwrites count 0). An odd number of',
			'// arguments errors with',
			'// "ERR wrong number of arguments for \'hset\' command".',
			'func (h *HashDB) HSet(key string, fieldVals ...string) (int, error) {',
			'	// your code here',
			'	return 0, errors.New("not implemented")',
			'}',
			'',
			'// HGet returns the field\'s value; false if the key or field is',
			'// missing.',
			'func (h *HashDB) HGet(key, field string) (string, bool) {',
			'	// your code here',
			'	return "", false',
			'}',
			'',
			'// HDel removes the named fields, returning how many existed.',
			'// Removing the last field removes the key entirely.',
			'func (h *HashDB) HDel(key string, fields ...string) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// HExists reports whether the field exists — an empty-string value',
			'// still exists.',
			'func (h *HashDB) HExists(key, field string) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// HGetAll returns [f1 v1 f2 v2 ...] with fields in SORTED order',
			'// (deterministic stand-in for Redis\'s storage order). Empty slice',
			'// for a missing key.',
			'func (h *HashDB) HGetAll(key string) []string {',
			'	// your code here',
			'	return []string{}',
			'}',
			'',
			'// HIncrBy adds delta to the integer stored in field (missing field',
			'// counts as 0) and returns the new value. A non-integer value',
			'// errors with "ERR hash value is not an integer".',
			'func (h *HashDB) HIncrBy(key, field string, delta int64) (int64, error) {',
			'	// your code here',
			'	return 0, errors.New("not implemented")',
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
			'	// Shared DB, scripted order — cases build on each other.',
			'	h := NewHashDB()',
			'	setN := func(n int, err error) string {',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return fmt.Sprintf("%d", n)',
			'	}',
			'	get := func(v string, ok bool) string {',
			'		if !ok {',
			'			return "(nil)"',
			'		}',
			'		return v',
			'	}',
			'	incr := func(n int64, err error) string {',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return fmt.Sprintf("%d", n)',
			'	}',
			'	join := func(xs []string) string { return "[" + strings.Join(xs, " ") + "]" }',
			'	cases := []tc{',
			'		{"HSET user:1 name alice email a@ex.co — two NEW fields", "2",',
			'			func() string { return setN(h.HSet("user:1", "name", "alice", "email", "a@ex.co")) }},',
			'		{"HSET overwriting name + adding city: only city is new", "1",',
			'			func() string { return setN(h.HSet("user:1", "name", "alicia", "city", "lyon")) }},',
			'		{"HGET reads one field without touching the rest", "alicia",',
			'			func() string { return get(h.HGet("user:1", "name")) }},',
			'		{"HGET a missing field: (nil)", "(nil)",',
			'			func() string { return get(h.HGet("user:1", "phone")) }},',
			'		{"odd argument count errors like redis-cli", "error: ERR wrong number of arguments for \'hset\' command",',
			'			func() string { return setN(h.HSet("user:1", "dangling")) }},',
			'		{"HEXISTS on a real field", "true",',
			'			func() string { return fmt.Sprintf("%v", h.HExists("user:1", "email")) }},',
			'		{"empty-string value still EXISTS — presence != emptiness", "true",',
			'			func() string { h.HSet("user:1", "bio", ""); return fmt.Sprintf("%v", h.HExists("user:1", "bio")) }},',
			'		{"HINCRBY creates the counter field at 0+5", "5",',
			'			func() string { return incr(h.HIncrBy("user:1", "logins", 5)) }},',
			'		{"HINCRBY again — atomic in-place, no read-modify-write race", "6",',
			'			func() string { return incr(h.HIncrBy("user:1", "logins", 1)) }},',
			'		{"HINCRBY on a text field errors", "error: ERR hash value is not an integer",',
			'			func() string { return incr(h.HIncrBy("user:1", "name", 1)) }},',
			'		{"HGETALL: flat field-sorted pairs", "[bio  city lyon email a@ex.co logins 6 name alicia]",',
			'			func() string { return join(h.HGetAll("user:1")) }},',
			'		{"HDEL two fields, one of which is missing: counts 1", "1",',
			'			func() string { return fmt.Sprintf("%d", h.HDel("user:1", "bio", "phone")) }},',
			'		{"HGETALL on a missing key: empty", "[]",',
			'			func() string { return join(h.HGetAll("ghost")) }},',
			'		{"deleting every remaining field...", "4",',
			'			func() string { return fmt.Sprintf("%d", h.HDel("user:1", "name", "email", "city", "logins")) }},',
			'		{"...removes the key itself — no empty hashes", "false",',
			'			func() string { _, exists := h.hashes["user:1"]; return fmt.Sprintf("%v", exists) }},',
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
			'	"sort"',
			'	"strconv"',
			')',
			'',
			'// The solution replaces the starter wholesale, so the type and its',
			'// constructor are redeclared here.',
			'type HashDB struct {',
			'	hashes map[string]map[string]string',
			'}',
			'',
			'func NewHashDB() *HashDB {',
			'	return &HashDB{hashes: map[string]map[string]string{}}',
			'}',
			'',
			'// ensure lazily creates the inner map. Creation happens on write',
			'// only — read paths must never materialize an empty hash, or the',
			'// no-empty-aggregates invariant breaks.',
			'func (h *HashDB) ensure(key string) map[string]string {',
			'	m, exists := h.hashes[key]',
			'	if !exists {',
			'		m = map[string]string{}',
			'		h.hashes[key] = m',
			'	}',
			'	return m',
			'}',
			'',
			'func (h *HashDB) HSet(key string, fieldVals ...string) (int, error) {',
			'	// Validate BEFORE mutating: a malformed call must not leave half',
			'	// the pairs written. Redis validates arity at dispatch for the',
			'	// same reason — commands are all-or-nothing.',
			'	if len(fieldVals)%2 != 0 {',
			'		return 0, errors.New("ERR wrong number of arguments for \'hset\' command")',
			'	}',
			'	m := h.ensure(key)',
			'	created := 0',
			'	for i := 0; i < len(fieldVals); i += 2 {',
			'		// The insert-vs-update distinction is the return value:',
			'		// callers learn "was this new?" without a prior read.',
			'		if _, exists := m[fieldVals[i]]; !exists {',
			'			created++',
			'		}',
			'		m[fieldVals[i]] = fieldVals[i+1]',
			'	}',
			'	return created, nil',
			'}',
			'',
			'func (h *HashDB) HGet(key, field string) (string, bool) {',
			'	// Missing key and missing field collapse to the same answer —',
			'	// the two-level lookup is invisible to the caller, as in Redis.',
			'	v, exists := h.hashes[key][field]',
			'	return v, exists',
			'}',
			'',
			'func (h *HashDB) HDel(key string, fields ...string) int {',
			'	m, exists := h.hashes[key]',
			'	if !exists {',
			'		return 0',
			'	}',
			'	removed := 0',
			'	for _, f := range fields {',
			'		if _, has := m[f]; has {',
			'			delete(m, f)',
			'			removed++',
			'		}',
			'	}',
			'	// No empty aggregates: the last field takes the key with it, so',
			'	// EXISTS and TYPE never see a hollowed-out hash.',
			'	if len(m) == 0 {',
			'		delete(h.hashes, key)',
			'	}',
			'	return removed',
			'}',
			'',
			'func (h *HashDB) HExists(key, field string) bool {',
			'	_, exists := h.hashes[key][field]',
			'	return exists',
			'}',
			'',
			'func (h *HashDB) HGetAll(key string) []string {',
			'	m := h.hashes[key]',
			'	fields := make([]string, 0, len(m))',
			'	for f := range m {',
			'		fields = append(fields, f)',
			'	}',
			'	// Sorted iteration: Go map order is deliberately randomized, so',
			'	// deterministic output REQUIRES collecting and sorting the keys.',
			'	sort.Strings(fields)',
			'	out := make([]string, 0, len(m)*2)',
			'	for _, f := range fields {',
			'		out = append(out, f, m[f])',
			'	}',
			'	return out',
			'}',
			'',
			'func (h *HashDB) HIncrBy(key, field string, delta int64) (int64, error) {',
			'	m := h.ensure(key)',
			'	cur := int64(0)',
			'	if raw, exists := m[field]; exists {',
			'		parsed, err := strconv.ParseInt(raw, 10, 64)',
			'		if err != nil {',
			'			return 0, errors.New("ERR hash value is not an integer")',
			'		}',
			'		cur = parsed',
			'	}',
			'	next := cur + delta',
			'	m[field] = strconv.FormatInt(next, 10)',
			'	return next, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Listpack, then hashtable: the encoding switch</h3>' +
			'<p>A small hash is not a hashtable at all. Up to 128 fields of up to ' +
			'64 bytes each (<code>hash-max-listpack-entries</code> / ' +
			'<code>-value</code>), Redis stores the fields as a ' +
			'<strong>listpack</strong>: one contiguous byte buffer with fields and ' +
			'values back to back. Lookup is a linear scan — and for 128 tiny ' +
			'entries a scan of one cache-resident buffer beats a hashtable’s ' +
			'pointer chasing, at a fraction of the memory. Cross either threshold ' +
			'once and the hash silently converts to a real hashtable, forever ' +
			'(<code>OBJECT ENCODING</code> shows <code>listpack</code> → ' +
			'<code>hashtable</code>). The famous consequence: millions of small ' +
			'objects stored as small hashes can take 5–10x less memory than the ' +
			'same data as top-level keys — the pattern Instagram wrote up when ' +
			'they mapped 300M media IDs into bucketed hashes precisely to stay ' +
			'under the listpack thresholds.</p>' +
			'<h3>Hash vs JSON blob vs key-per-field</h3>' +
			'<p>The three layouts differ on exactly two axes: memory overhead and ' +
			'write granularity. A JSON blob is one value — compact, but every ' +
			'mutation is read-parse-write (the lost-update bug) and every read ' +
			'fetches the whole document. Key-per-field gives per-field atomicity ' +
			'but pays keyspace overhead per field and needs N commands or ' +
			'<code>MGET</code> to load an object — and you cannot expire the ' +
			'object as a unit. The hash is the middle: per-field atomic writes ' +
			'(<code>HINCRBY</code>, <code>HSET</code> one field), whole-object ' +
			'reads (<code>HGETALL</code>), one key to <code>DEL</code> or ' +
			'<code>EXPIRE</code>. Its one historical gap — per-field TTL — was ' +
			'closed in Redis 7.4 with <code>HEXPIRE</code>.</p>' +
			'<h3>Operational gotchas</h3>' +
			'<p><code>HGETALL</code> on a hash that grew to 500k fields is an O(n) ' +
			'stall on the single thread, and it happens in the wild because hashes ' +
			'make it so easy to keep adding fields (per-user event maps are the ' +
			'usual culprit). Use <code>HSCAN</code> for iteration and ' +
			'<code>HRANDFIELD</code> for sampling. Note also that your ' +
			'<code>HGetAll</code> sorts; real Redis returns <em>storage order</em>, ' +
			'which for a listpack is insertion order and for a hashtable is ' +
			'effectively arbitrary — code that depends on HGETALL order works in ' +
			'dev (small hash, listpack) and breaks in prod after the encoding ' +
			'flips. Sorting here is the honest fix for a deterministic harness, ' +
			'and a good habit in clients too.</p>',
		],
		complexity: { time: 'O(1) per field operation; HGETALL is O(n log n) here for the deterministic sort (O(n) in Redis)', space: 'O(f) fields per hash; small hashes pack into one listpack buffer in real Redis' },
	});
})();
