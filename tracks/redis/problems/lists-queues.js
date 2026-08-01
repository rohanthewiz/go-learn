/* Lists: Queues & LRANGE Semantics — Data Types (Medium). LPUSH/RPUSH/LPOP/
 * RPOP/LLEN/LRANGE with Redis's exact index rules: negative indices count
 * from the tail, out-of-range indices clamp instead of erroring, and
 * LRANGE 0 -1 is the whole list. The harness pins multi-value LPUSH's
 * reversal, empty-list key removal, and the FIFO-queue / stack idioms.
 */
(function () {
	'use strict';
	var T = GoLearnRD;

	// A list is a deque: LPUSH/LPOP work the head, RPUSH/RPOP the tail, and
	// LRANGE addresses both ends at once via negative indices. Marker id
	// namespaced (dgArrowRD04): SVG ids share the page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="a Redis list as a deque: LPUSH and LPOP operate on the head, RPUSH and RPOP on the tail; positive indices count from the head, negative from the tail">' +
		'<text x="20" y="24" class="lbl">the list is a deque — both ends are O(1); indices address it from either end</text>' +
		'<rect x="150" y="44" width="70" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="185" y="69" text-anchor="middle">"c"</text>' +
		'<rect x="245" y="44" width="70" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="280" y="69" text-anchor="middle">"b"</text>' +
		'<rect x="340" y="44" width="70" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="375" y="69" text-anchor="middle">"a"</text>' +
		'<text x="185" y="104" text-anchor="middle" class="lbl">index 0 · -3</text>' +
		'<text x="280" y="104" text-anchor="middle" class="lbl">index 1 · -2</text>' +
		'<text x="375" y="104" text-anchor="middle" class="lbl">index 2 · -1</text>' +
		'<path d="M 80 64 L 140 64" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowRD04)"/>' +
		'<text x="75" y="52" text-anchor="end" class="lbl" style="fill:var(--warn)">LPUSH / LPOP</text>' +
		'<text x="75" y="70" text-anchor="end" class="lbl">HEAD</text>' +
		'<path d="M 480 64 L 420 64" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowRD04)"/>' +
		'<text x="486" y="52" class="lbl" style="fill:var(--warn)">RPUSH / RPOP</text>' +
		'<text x="486" y="70" class="lbl">TAIL</text>' +
		'<text x="20" y="140" class="lbl">after LPUSH jobs "a" "b" "c": each value enters at the head, so they land REVERSED</text>' +
		'<text x="20" y="162" class="lbl">queue (FIFO): LPUSH to produce + RPOP to consume — enter at head, leave at tail</text>' +
		'<text x="20" y="180" class="lbl">stack (LIFO): LPUSH + LPOP — both at the head</text>' +
		'<text x="20" y="202" class="lbl" style="fill:var(--warn)">LRANGE clamps out-of-range indices instead of erroring — LRANGE 0 -1 is always the whole list</text>' +
		'<defs><marker id="dgArrowRD04" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'lists-queues',
		title: 'Lists: Queues & LRANGE Semantics',
		nav: 'lists queues',
		difficulty: 'Medium',
		category: 'Data Types',
		task: 'Implement LPUSH/RPUSH/LPOP/RPOP/LLEN and LRANGE with negative-index and clamping semantics; empty lists remove their key.',

		prose: [
			'<h2>Lists: Queues &amp; LRANGE Semantics</h2>' +
			'<p>The background-job dashboard is paging you: workers idle, queue ' +
			'depth climbing. You attach with redis-cli to look at the jobs list — ' +
			'and immediately hit the two things everyone gets wrong. First, ' +
			'<code>LRANGE jobs 0 10</code> returns <em>eleven</em> jobs (both ends ' +
			'inclusive). Second, the jobs look reversed — because the producer uses ' +
			'<code>LPUSH</code>, and multi-value <code>LPUSH a b c</code> pushes ' +
			'one at a time <em>at the head</em>, so the list reads ' +
			'<code>c b a</code>. Neither is a bug; both are semantics worth ' +
			'pinning exactly:</p>' +
			'<ul>' +
			'<li><strong><code>LPUSH key v1 v2 ...</code></strong> — insert each ' +
			'value at the <em>head</em>, left to right; returns the new length. ' +
			'<strong><code>RPUSH</code></strong> appends at the tail (values keep ' +
			'their order).</li>' +
			'<li><strong><code>LPOP</code> / <code>RPOP</code></strong> — remove ' +
			'and return the head / tail element; <code>(nil)</code> on an empty or ' +
			'missing key. When the last element is popped <strong>the key is ' +
			'removed entirely</strong> — Redis has no empty lists, so ' +
			'<code>EXISTS</code> flips to 0 the moment a queue drains.</li>' +
			'<li><strong><code>LLEN</code></strong> — length; 0 for a missing key ' +
			'(missing and empty are the same thing, per the rule above).</li>' +
			'<li><strong><code>LRANGE key start stop</code></strong> — elements ' +
			'from <code>start</code> to <code>stop</code> <em>inclusive</em>. ' +
			'Negative indices count from the tail: <code>-1</code> is the last ' +
			'element, <code>-2</code> second to last. Out-of-range indices ' +
			'<em>clamp</em>: a negative index below <code>-len</code> clamps to 0, ' +
			'a stop past the end clamps to <code>len-1</code>, and an empty or ' +
			'inverted range returns an empty list — never an error. Hence the ' +
			'idiom <code>LRANGE key 0 -1</code>: the whole list, any length.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the six operations on <code>ListDB</code>. Then the two ' +
			'idioms come free, and the harness exercises both:</p>',
			{ lang: 'txt', code: 'queue (FIFO):  producer LPUSH jobs j1; LPUSH jobs j2   consumer RPOP -> j1, then j2\nstack (LIFO):  LPUSH undo op1; LPUSH undo op2          LPOP -> op2, then op1' },
			'<div class="tip">Get the LRANGE clamping order right: translate ' +
			'negative indices first (<code>i += len</code>), <em>then</em> clamp ' +
			'to <code>[0, len-1]</code>, then check <code>start &gt; stop</code>. ' +
			'Clamping before translating breaks <code>LRANGE 0 -1</code> on ' +
			'single-element lists.</div>',
		],

		starter: [
			'package main',
			'',
			'// ListDB is a keyspace of lists. Index 0 is the HEAD (the LPUSH',
			'// end); the slice tail is the RPUSH end.',
			'type ListDB struct {',
			'	lists map[string][]string',
			'}',
			'',
			'func NewListDB() *ListDB {',
			'	return &ListDB{lists: map[string][]string{}}',
			'}',
			'',
			'// LPush inserts each value at the head, left to right (so the last',
			'// argument ends up first), and returns the new length.',
			'func (d *ListDB) LPush(key string, vals ...string) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// RPush appends each value at the tail and returns the new length.',
			'func (d *ListDB) RPush(key string, vals ...string) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// LPop removes and returns the head element. The second result is',
			'// false for an empty/missing key. Popping the last element must',
			'// remove the key: Redis has no empty lists.',
			'func (d *ListDB) LPop(key string) (string, bool) {',
			'	// your code here',
			'	return "", false',
			'}',
			'',
			'// RPop removes and returns the tail element; same rules as LPop.',
			'func (d *ListDB) RPop(key string) (string, bool) {',
			'	// your code here',
			'	return "", false',
			'}',
			'',
			'// LLen returns the length; 0 for a missing key.',
			'func (d *ListDB) LLen(key string) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// LRange returns elements start..stop INCLUSIVE with Redis\'s index',
			'// rules: negative indices count from the tail (-1 = last), indices',
			'// clamp to the valid range instead of erroring, and an inverted or',
			'// out-of-range window returns an empty (non-nil) slice.',
			'func (d *ListDB) LRange(key string, start, stop int) []string {',
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
			'	// Shared DB, scripted order — cases build on each other.',
			'	d := NewListDB()',
			'	join := func(xs []string) string { return "[" + strings.Join(xs, " ") + "]" }',
			'	pop := func(v string, ok bool) string {',
			'		if !ok {',
			'			return "(nil)"',
			'		}',
			'		return v',
			'	}',
			'	cases := []tc{',
			'		{"LPUSH jobs a b c returns the new length", "3",',
			'			func() string { return fmt.Sprintf("%d", d.LPush("jobs", "a", "b", "c")) }},',
			'		{"multi-value LPUSH lands REVERSED: each value enters at the head", "[c b a]",',
			'			func() string { return join(d.LRange("jobs", 0, -1)) }},',
			'		{"RPUSH keeps argument order", "5",',
			'			func() string { return fmt.Sprintf("%d", d.RPush("jobs", "d", "e")) }},',
			'		{"LRANGE 0 -1 is the whole list", "[c b a d e]",',
			'			func() string { return join(d.LRange("jobs", 0, -1)) }},',
			'		{"LRANGE 1 3 is INCLUSIVE on both ends — three elements", "[b a d]",',
			'			func() string { return join(d.LRange("jobs", 1, 3)) }},',
			'		{"LRANGE -2 -1: the last two", "[d e]",',
			'			func() string { return join(d.LRange("jobs", -2, -1)) }},',
			'		{"stop past the end clamps to the last element", "[a d e]",',
			'			func() string { return join(d.LRange("jobs", 2, 100)) }},',
			'		{"start below -len clamps to 0", "[c b]",',
			'			func() string { return join(d.LRange("jobs", -100, 1)) }},',
			'		{"inverted range is empty, not an error", "[]",',
			'			func() string { return join(d.LRange("jobs", 3, 1)) }},',
			'		{"start past the end is empty too", "[]",',
			'			func() string { return join(d.LRange("jobs", 9, 10)) }},',
			'		{"LRANGE on a missing key: empty", "[]",',
			'			func() string { return join(d.LRange("nope", 0, -1)) }},',
			'		{"FIFO queue: LPUSH produced c b a d e; RPOP consumes oldest first", "e",',
			'			func() string { return pop(d.RPop("jobs")) }},',
			'		{"RPOP again", "d", func() string { return pop(d.RPop("jobs")) }},',
			'		{"stack: LPOP takes the newest (head)", "c",',
			'			func() string { return pop(d.LPop("jobs")) }},',
			'		{"LLEN after three pops", "2",',
			'			func() string { return fmt.Sprintf("%d", d.LLen("jobs")) }},',
			'		{"drain the list: popping the last element...", "a",',
			'			func() string { d.LPop("jobs"); return pop(d.LPop("jobs")) }},',
			'		{"...removes the key entirely — no empty lists in Redis", "false",',
			'			func() string { _, exists := d.lists["jobs"]; return fmt.Sprintf("%v", exists) }},',
			'		{"LPOP on the now-missing key: (nil)", "(nil)",',
			'			func() string { return pop(d.LPop("jobs")) }},',
			'		{"LLEN on a missing key is 0, not an error", "0",',
			'			func() string { return fmt.Sprintf("%d", d.LLen("jobs")) }},',
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
			'// The solution replaces the starter wholesale, so the type and its',
			'// constructor are redeclared here. A Go slice stands in for Redis\'s',
			'// quicklist; index 0 is the head. Head operations are O(n) on a',
			'// slice where Redis\'s deque makes them O(1) — fine for teaching',
			'// semantics, and called out in the explanation.',
			'type ListDB struct {',
			'	lists map[string][]string',
			'}',
			'',
			'func NewListDB() *ListDB {',
			'	return &ListDB{lists: map[string][]string{}}',
			'}',
			'',
			'func (d *ListDB) LPush(key string, vals ...string) int {',
			'	// One value at a time AT THE HEAD, left to right — which is why',
			'	// LPUSH a b c reads back c b a. Redis defines it this way so a',
			'	// multi-value push behaves exactly like N single pushes.',
			'	for _, v := range vals {',
			'		d.lists[key] = append([]string{v}, d.lists[key]...)',
			'	}',
			'	return len(d.lists[key])',
			'}',
			'',
			'func (d *ListDB) RPush(key string, vals ...string) int {',
			'	d.lists[key] = append(d.lists[key], vals...)',
			'	return len(d.lists[key])',
			'}',
			'',
			'// dropIfEmpty enforces the invariant that popping the last element',
			'// removes the key. Redis deletes empty aggregates for every type',
			'// (lists, hashes, sets, zsets) so that EXISTS/TYPE/keyspace',
			'// notifications stay coherent — an "empty list" and "no list" must',
			'// be indistinguishable.',
			'func (d *ListDB) dropIfEmpty(key string) {',
			'	if len(d.lists[key]) == 0 {',
			'		delete(d.lists, key)',
			'	}',
			'}',
			'',
			'func (d *ListDB) LPop(key string) (string, bool) {',
			'	xs := d.lists[key]',
			'	if len(xs) == 0 {',
			'		return "", false',
			'	}',
			'	head := xs[0]',
			'	d.lists[key] = xs[1:]',
			'	d.dropIfEmpty(key)',
			'	return head, true',
			'}',
			'',
			'func (d *ListDB) RPop(key string) (string, bool) {',
			'	xs := d.lists[key]',
			'	if len(xs) == 0 {',
			'		return "", false',
			'	}',
			'	tail := xs[len(xs)-1]',
			'	d.lists[key] = xs[:len(xs)-1]',
			'	d.dropIfEmpty(key)',
			'	return tail, true',
			'}',
			'',
			'func (d *ListDB) LLen(key string) int {',
			'	// A missing key reads as length 0 — same rule as everywhere:',
			'	// missing and empty are one state.',
			'	return len(d.lists[key])',
			'}',
			'',
			'func (d *ListDB) LRange(key string, start, stop int) []string {',
			'	xs := d.lists[key]',
			'	n := len(xs)',
			'	if n == 0 {',
			'		return []string{}',
			'	}',
			'	// Order matters here: translate negatives FIRST, then clamp.',
			'	// -1 must become n-1 before any clamping, or "0 -1" would clamp',
			'	// -1 up to 0 and return a single element. This is the exact',
			'	// sequence in Redis\'s lrangeCommand.',
			'	if start < 0 {',
			'		start += n',
			'	}',
			'	if stop < 0 {',
			'		stop += n',
			'	}',
			'	// Clamp instead of erroring — LRANGE is defined to be forgiving',
			'	// so callers can say "0 -1" or "0 99" without knowing the length.',
			'	if start < 0 {',
			'		start = 0',
			'	}',
			'	if stop >= n {',
			'		stop = n - 1',
			'	}',
			'	if start > stop || start >= n {',
			'		return []string{}',
			'	}',
			'	// Copy, not a sub-slice: callers must not alias the stored list,',
			'	// or a later push could scribble over their "snapshot".',
			'	out := make([]string, stop-start+1)',
			'	copy(out, xs[start:stop+1])',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What a Redis list actually is</h3>' +
			'<p>Not a linked list of one element per node — not anymore. Modern ' +
			'Redis stores lists as a <strong>quicklist</strong>: a doubly linked ' +
			'list of <em>listpacks</em>, each listpack a contiguous byte block ' +
			'holding many small elements back to back. Pure linked lists waste ' +
			'~40 bytes of pointer overhead per element and destroy cache locality; ' +
			'pure arrays make middle inserts O(n). The quicklist splits the ' +
			'difference: O(1) at both ends (the operations lists are actually used ' +
			'for), compact memory, and only the two end listpacks need to be ' +
			'writable — interior nodes can even be LZF-compressed ' +
			'(<code>list-compress-depth</code>) since a queue rarely reads its ' +
			'middle. This is why your slice-based head insert being O(n) is a real ' +
			'divergence: in Redis, <code>LPUSH</code> is O(1), always.</p>' +
			'<h3>The queue idiom, hardened</h3>' +
			'<p>The LPUSH/RPOP queue in the harness has a polling problem in real ' +
			'life — consumers must spin. <code>BRPOP</code> blocks the connection ' +
			'until an element arrives (with a timeout), turning the poll into a ' +
			'push. But there is a sharper flaw: <code>RPOP</code> removes the job ' +
			'<em>before</em> the worker finishes it. Worker crashes mid-job, job ' +
			'gone. The classic fix is ' +
			'<code>LMOVE jobs processing RIGHT LEFT</code> (atomically move the ' +
			'job to a per-worker “processing” list; delete on completion; a reaper ' +
			'requeues stale entries). If you find yourself also wanting acks, ' +
			'consumer groups, and replay, that is the point where Redis Streams ' +
			'(<code>XADD</code>/<code>XREADGROUP</code>) replace lists.</p>' +
			'<h3>LRANGE in production</h3>' +
			'<p><code>LRANGE 0 -1</code> on a 10-million-element list is a ' +
			'single-threaded server copying 10 million elements while every other ' +
			'client waits — the same failure mode as <code>KEYS *</code>. Page ' +
			'with bounded windows (<code>0 99</code>, <code>100 199</code>), and ' +
			'remember both ends are inclusive: <code>0 99</code> is exactly 100 ' +
			'elements, and the off-by-one in the prose (<code>0 10</code> = 11 ' +
			'jobs) is the most common LRANGE bug in dashboards. Capped collections ' +
			'use the same index rules: <code>LPUSH recent x</code> + ' +
			'<code>LTRIM recent 0 99</code> keeps the newest 100, dropping the ' +
			'tail — a fixed-size activity feed in two O(1)-ish commands.</p>',
		],
		complexity: { time: 'O(1) pops and pushes in real Redis (this slice model pays O(n) at the head); LRANGE is O(start + count)', space: 'O(n) per list; quicklist packs many elements per node to cut pointer overhead' },
	});
})();
