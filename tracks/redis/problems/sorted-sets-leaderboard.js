/* Sorted Sets: The Leaderboard — Data Types (Hard). ZADD (an update MOVES
 * the member's rank), ZSCORE, ZRANK/ZREVRANK (0-based, score order with a
 * lexicographic member tiebreak), ZRANGE/ZREVRANGE with WITHSCORES,
 * ZINCRBY, and ZRANGEBYSCORE with -inf/+inf. The harness runs a game
 * leaderboard end to end: score updates, rank queries, top-3, score bands.
 */
(function () {
	'use strict';
	var T = GoLearnRD;

	// The defining invariant: one member, one score, always sorted — an
	// update REMOVES the member from its old position and reinserts it.
	// Marker id namespaced (dgArrowRD07): SVG ids share the page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="a sorted set ordered by score ascending; ZADD updating carol from 90 to 260 moves her from rank 0 to rank 2, shifting the members she passed">' +
		'<text x="20" y="24" class="lbl">ZADD board 260 carol — an update MOVES the member, ranks reshuffle</text>' +
		'<text x="30" y="58" class="lbl">before</text>' +
		'<rect x="80" y="42" width="120" height="30" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="140" y="62" text-anchor="middle">carol 90</text>' +
		'<rect x="220" y="42" width="120" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="280" y="62" text-anchor="middle">alice 100</text>' +
		'<rect x="360" y="42" width="120" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="420" y="62" text-anchor="middle">bob 250</text>' +
		'<text x="140" y="88" text-anchor="middle" class="lbl">rank 0</text>' +
		'<text x="280" y="88" text-anchor="middle" class="lbl">rank 1</text>' +
		'<text x="420" y="88" text-anchor="middle" class="lbl">rank 2</text>' +
		'<text x="30" y="138" class="lbl">after</text>' +
		'<rect x="80" y="122" width="120" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="140" y="142" text-anchor="middle">alice 100</text>' +
		'<rect x="220" y="122" width="120" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="280" y="142" text-anchor="middle">bob 250</text>' +
		'<rect x="360" y="122" width="120" height="30" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="420" y="142" text-anchor="middle">carol 260</text>' +
		'<text x="140" y="168" text-anchor="middle" class="lbl">rank 0</text>' +
		'<text x="280" y="168" text-anchor="middle" class="lbl">rank 1</text>' +
		'<text x="420" y="168" text-anchor="middle" class="lbl">rank 2</text>' +
		'<path d="M 145 76 C 200 108 350 100 412 120" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowRD07)"/>' +
		'<text x="20" y="200" class="lbl">ties break lexicographically by member: same score, "alice" ranks before "bob" — total order, always</text>' +
		'<defs><marker id="dgArrowRD07" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'sorted-sets-leaderboard',
		title: 'Sorted Sets: The Leaderboard',
		nav: 'sorted sets leaderboard',
		difficulty: 'Hard',
		category: 'Data Types',
		task: 'Implement ZADD/ZSCORE/ZINCRBY/ZRANK/ZREVRANK, ZRANGE/ZREVRANGE with WITHSCORES, and ZRANGEBYSCORE with -inf/+inf — the leaderboard.',

		prose: [
			'<h2>Sorted Sets: The Leaderboard</h2>' +
			'<p>The game launched, and the leaderboard is a SQL table: ' +
			'<code>SELECT rank() OVER (ORDER BY score DESC)</code>. At 10 players ' +
			'it was instant; at 2 million, “what’s my rank?” is a table scan per ' +
			'page view and the database is on fire. What that query needs is a ' +
			'structure that keeps members <em>permanently sorted by score</em> and ' +
			'answers position queries without scanning. That is the sorted set — ' +
			'the most specialized and most powerful of the core Redis types:</p>' +
			'<ul>' +
			'<li><strong>The model</strong> — a set of unique members, each with a ' +
			'float64 score. The set is always ordered by <code>(score, ' +
			'member)</code>: score ascending, ties broken by <em>lexicographic ' +
			'member comparison</em>. That tiebreak matters — it makes the order ' +
			'total and deterministic, so two servers replaying the same writes ' +
			'agree on every rank.</li>' +
			'<li><strong><code>ZADD key score member</code></strong> — insert, or ' +
			'<em>update-and-move</em>: if the member exists its score is replaced ' +
			'and it is repositioned. Returns 1 for a new member, 0 for an update. ' +
			'One member can never appear twice.</li>' +
			'<li><strong><code>ZSCORE</code></strong> — the member’s score, ' +
			'<code>(nil)</code> if absent. <strong><code>ZINCRBY</code></strong> — ' +
			'add to the score (missing member starts at 0), return the new score; ' +
			'the atomic “award points” primitive.</li>' +
			'<li><strong><code>ZRANK</code></strong> — the member’s 0-based ' +
			'position in <em>ascending</em> order; <strong><code>ZREVRANK</code></strong> ' +
			'— position from the top. For a leaderboard, ' +
			'<code>ZREVRANK player + 1</code> <em>is</em> “you are #N”.</li>' +
			'<li><strong><code>ZRANGE key start stop [WITHSCORES]</code></strong> — ' +
			'members by ascending rank, with LRANGE’s index rules (inclusive ' +
			'ends, negatives from the tail, clamping). ' +
			'<strong><code>ZREVRANGE</code></strong> — same, descending: ' +
			'<code>ZREVRANGE board 0 2</code> is the podium.</li>' +
			'<li><strong><code>ZRANGEBYSCORE key min max</code></strong> — members ' +
			'whose score lies in <code>[min, max]</code>, where either bound may ' +
			'be <code>-inf</code> / <code>+inf</code>. “Everyone between 100 and ' +
			'500 points” without touching ranks at all.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the nine operations on <code>ZSetDB</code>. Keep scores ' +
			'in a map and derive the ordering with a sort — O(n log n) per query ' +
			'where Redis pays O(log n), but the <em>semantics</em> are what the ' +
			'harness pins. Format scores with ' +
			'<code>strconv.FormatFloat(s, \'f\', -1, 64)</code> so ' +
			'<code>250</code> prints as <code>250</code>, not ' +
			'<code>250.000000</code>.</p>' +
			'<div class="tip">Get the tiebreak into the comparator, not bolted on ' +
			'after: sort by <code>score, then member</code> in ONE less-than ' +
			'function, and derive ZREVRANK as <code>count-1-rank</code> instead of ' +
			'writing a second comparator — two comparators that disagree on ties ' +
			'is the classic source of “rank flickers between refreshes”.</div>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// ZSetDB is a keyspace of sorted sets: key -> member -> score.',
			'// The ordering is DERIVED (sort on demand) rather than maintained;',
			'// real Redis maintains it incrementally in a skiplist.',
			'type ZSetDB struct {',
			'	zsets map[string]map[string]float64',
			'}',
			'',
			'func NewZSetDB() *ZSetDB {',
			'	return &ZSetDB{zsets: map[string]map[string]float64{}}',
			'}',
			'',
			'// ZAdd inserts or updates member with score. Returns 1 if the',
			'// member is NEW, 0 if this was an update (which must reposition',
			'// the member).',
			'func (z *ZSetDB) ZAdd(key string, score float64, member string) int {',
			'	// your code here',
			'	return -1',
			'}',
			'',
			'// ZScore returns the member\'s score formatted with',
			'// strconv.FormatFloat(s, \'f\', -1, 64); false if absent.',
			'func (z *ZSetDB) ZScore(key, member string) (string, bool) {',
			'	// your code here',
			'	return "", false',
			'}',
			'',
			'// ZIncrBy adds delta to the member\'s score (missing member starts',
			'// at 0) and returns the new score, formatted as in ZScore.',
			'func (z *ZSetDB) ZIncrBy(key string, delta float64, member string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// ZRank returns the member\'s 0-based rank in ascending (score,',
			'// member) order; false if absent.',
			'func (z *ZSetDB) ZRank(key, member string) (int, bool) {',
			'	// your code here',
			'	return 0, false',
			'}',
			'',
			'// ZRevRank is the rank from the top: count-1-ZRank.',
			'func (z *ZSetDB) ZRevRank(key, member string) (int, bool) {',
			'	// your code here',
			'	return 0, false',
			'}',
			'',
			'// ZRange returns members by ascending rank, start..stop inclusive,',
			'// with LRANGE\'s negative-index and clamping rules. If withScores,',
			'// the result interleaves member, score, member, score...',
			'func (z *ZSetDB) ZRange(key string, start, stop int, withScores bool) []string {',
			'	// your code here',
			'	return []string{}',
			'}',
			'',
			'// ZRevRange is ZRange over the DESCENDING order (top first).',
			'func (z *ZSetDB) ZRevRange(key string, start, stop int, withScores bool) []string {',
			'	// your code here',
			'	return []string{}',
			'}',
			'',
			'// ZRangeByScore returns members whose score is in [min, max],',
			'// ascending. min and max are strings: a float, "-inf", or "+inf".',
			'// A malformed bound errors with "ERR min or max is not a float".',
			'func (z *ZSetDB) ZRangeByScore(key, min, max string) ([]string, error) {',
			'	// your code here',
			'	return nil, errors.New("not implemented")',
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
			'	// One leaderboard, scripted order — cases build on each other.',
			'	z := NewZSetDB()',
			'	join := func(xs []string) string { return "[" + strings.Join(xs, " ") + "]" }',
			'	score := func(v string, ok bool) string {',
			'		if !ok {',
			'			return "(nil)"',
			'		}',
			'		return v',
			'	}',
			'	rank := func(n int, ok bool) string {',
			'		if !ok {',
			'			return "(nil)"',
			'		}',
			'		return fmt.Sprintf("%d", n)',
			'	}',
			'	byScore := func(xs []string, err error) string {',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return join(xs)',
			'	}',
			'	cases := []tc{',
			'		{"ZADD three players: each returns 1 (new)", "1 1 1",',
			'			func() string {',
			'				a := z.ZAdd("board", 100, "alice")',
			'				b := z.ZAdd("board", 250, "bob")',
			'				c := z.ZAdd("board", 90, "carol")',
			'				return fmt.Sprintf("%d %d %d", a, b, c)',
			'			}},',
			'		{"ZRANGE 0 -1: ascending by score", "[carol alice bob]",',
			'			func() string { return join(z.ZRange("board", 0, -1, false)) }},',
			'		{"ZADD an existing member returns 0 — and MOVES it (the diagram)", "0",',
			'			func() string { return fmt.Sprintf("%d", z.ZAdd("board", 260, "carol")) }},',
			'		{"carol jumped past bob to the top of the ascending order", "[alice bob carol]",',
			'			func() string { return join(z.ZRange("board", 0, -1, false)) }},',
			'		{"ZSCORE reads the updated score", "260",',
			'			func() string { return score(z.ZScore("board", "carol")) }},',
			'		{"ZSCORE on a missing member: (nil)", "(nil)",',
			'			func() string { return score(z.ZScore("board", "mallory")) }},',
			'		{"ZINCRBY awards points and returns the new score", "265.5",',
			'			func() string { return z.ZIncrBy("board", 5.5, "carol") }},',
			'		{"ZINCRBY on a missing member starts from 0", "40",',
			'			func() string { return z.ZIncrBy("board", 40, "dave") }},',
			'		{"ZRANK dave: lowest score = rank 0 (ascending)", "0",',
			'			func() string { return rank(z.ZRank("board", "dave")) }},',
			'		{"ZREVRANK carol: top of the board = 0 -> she is #1", "0",',
			'			func() string { return rank(z.ZRevRank("board", "carol")) }},',
			'		{"tie: eve also scores 100 — lexicographic tiebreak, alice first", "[alice eve]",',
			'			func() string {',
			'				z.ZAdd("board", 100, "eve")',
			'				return byScore(z.ZRangeByScore("board", "100", "100"))',
			'			}},',
			'		{"ZRANK respects the tiebreak: alice 1, eve 2", "alice=1 eve=2",',
			'			func() string {',
			'				a, _ := z.ZRank("board", "alice")',
			'				e, _ := z.ZRank("board", "eve")',
			'				return fmt.Sprintf("alice=%d eve=%d", a, e)',
			'			}},',
			'		{"the podium: ZREVRANGE 0 2 WITHSCORES", "[carol 265.5 bob 250 eve 100]",',
			'			func() string { return join(z.ZRevRange("board", 0, 2, true)) }},',
			'		{"ZRANGE with negative indices: the bottom two", "[eve bob]",',
			'			func() string { return join(z.ZRange("board", -3, -2, false)) }},',
			'		{"ZRANGE clamps out-of-range stops like LRANGE", "[dave alice eve bob carol]",',
			'			func() string { return join(z.ZRange("board", 0, 99, false)) }},',
			'		{"score band: 100 <= s <= 250 (inclusive both ends)", "[alice eve bob]",',
			'			func() string { return byScore(z.ZRangeByScore("board", "100", "250")) }},',
			'		{"open bottom: ZRANGEBYSCORE -inf 100", "[dave alice eve]",',
			'			func() string { return byScore(z.ZRangeByScore("board", "-inf", "100")) }},',
			'		{"full sweep: -inf to +inf is everyone", "[dave alice eve bob carol]",',
			'			func() string { return byScore(z.ZRangeByScore("board", "-inf", "+inf")) }},',
			'		{"malformed bound errors like redis-cli", "error: ERR min or max is not a float",',
			'			func() string { return byScore(z.ZRangeByScore("board", "ten", "20")) }},',
			'		{"ZRANK on a missing key: (nil), not 0 — absence is not last place", "(nil)",',
			'			func() string { return rank(z.ZRank("ghost-board", "alice")) }},',
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
			'	"sort"',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// The solution replaces the starter wholesale, so the type and its',
			'// constructor are redeclared here.',
			'type ZSetDB struct {',
			'	zsets map[string]map[string]float64',
			'}',
			'',
			'func NewZSetDB() *ZSetDB {',
			'	return &ZSetDB{zsets: map[string]map[string]float64{}}',
			'}',
			'',
			'// zEntry pairs a member with its score for sorting. The comparator',
			'// below is THE single source of truth for order — every ranked',
			'// operation derives from it, so ties can never disagree across',
			'// commands (the "rank flickers" bug from the prose tip).',
			'type zEntry struct {',
			'	member string',
			'	score  float64',
			'}',
			'',
			'// sortedEntries materializes the ascending (score, member) order.',
			'// O(n log n) per call where Redis\'s skiplist maintains order',
			'// incrementally — a deliberate trade: identical semantics, simpler',
			'// model.',
			'func (z *ZSetDB) sortedEntries(key string) []zEntry {',
			'	m := z.zsets[key]',
			'	entries := make([]zEntry, 0, len(m))',
			'	for member, s := range m {',
			'		entries = append(entries, zEntry{member: member, score: s})',
			'	}',
			'	sort.Slice(entries, func(i, j int) bool {',
			'		if entries[i].score != entries[j].score {',
			'			return entries[i].score < entries[j].score',
			'		}',
			'		// The lexicographic tiebreak: same-score members still have',
			'		// a total, deterministic order. Redis compares the member',
			'		// bytes with memcmp for exactly this reason.',
			'		return entries[i].member < entries[j].member',
			'	})',
			'	return entries',
			'}',
			'',
			'// fmtScore renders scores the way redis-cli does: shortest exact',
			'// decimal — 250 prints "250", 265.5 prints "265.5". Never %f,',
			'// which would print "250.000000" and fail every string compare.',
			'func fmtScore(s float64) string {',
			'	return strconv.FormatFloat(s, \'f\', -1, 64)',
			'}',
			'',
			'func (z *ZSetDB) ZAdd(key string, score float64, member string) int {',
			'	m, exists := z.zsets[key]',
			'	if !exists {',
			'		m = map[string]float64{}',
			'		z.zsets[key] = m',
			'	}',
			'	_, present := m[member]',
			'	// Because order is derived from the score map, "reposition on',
			'	// update" is automatic here. In a maintained structure this is',
			'	// the step people forget: delete the old (score, member) node,',
			'	// THEN insert the new one.',
			'	m[member] = score',
			'	if present {',
			'		return 0',
			'	}',
			'	return 1',
			'}',
			'',
			'func (z *ZSetDB) ZScore(key, member string) (string, bool) {',
			'	s, exists := z.zsets[key][member]',
			'	if !exists {',
			'		return "", false',
			'	}',
			'	return fmtScore(s), true',
			'}',
			'',
			'func (z *ZSetDB) ZIncrBy(key string, delta float64, member string) string {',
			'	m, exists := z.zsets[key]',
			'	if !exists {',
			'		m = map[string]float64{}',
			'		z.zsets[key] = m',
			'	}',
			'	// Missing member starts at 0 — ZINCRBY is to sorted sets what',
			'	// INCR is to strings: create-or-update in one atomic step.',
			'	m[member] += delta',
			'	return fmtScore(m[member])',
			'}',
			'',
			'func (z *ZSetDB) ZRank(key, member string) (int, bool) {',
			'	if _, exists := z.zsets[key][member]; !exists {',
			'		return 0, false',
			'	}',
			'	for i, e := range z.sortedEntries(key) {',
			'		if e.member == member {',
			'			return i, true',
			'		}',
			'	}',
			'	return 0, false',
			'}',
			'',
			'func (z *ZSetDB) ZRevRank(key, member string) (int, bool) {',
			'	// Derived, not re-sorted: rev = count-1-rank. One comparator,',
			'	// two views — the tiebreak stays consistent by construction.',
			'	r, exists := z.ZRank(key, member)',
			'	if !exists {',
			'		return 0, false',
			'	}',
			'	return len(z.zsets[key]) - 1 - r, true',
			'}',
			'',
			'// clampRange applies LRANGE\'s index rules to a length-n sequence,',
			'// returning the half-open window [from, to) — empty if the range',
			'// resolves to nothing. Shared by ZRange and ZRevRange.',
			'func clampRange(n, start, stop int) (int, int) {',
			'	if start < 0 {',
			'		start += n',
			'	}',
			'	if stop < 0 {',
			'		stop += n',
			'	}',
			'	if start < 0 {',
			'		start = 0',
			'	}',
			'	if stop >= n {',
			'		stop = n - 1',
			'	}',
			'	if n == 0 || start > stop || start >= n {',
			'		return 0, 0',
			'	}',
			'	return start, stop + 1',
			'}',
			'',
			'// renderRange formats a window of entries, optionally interleaving',
			'// scores — the WITHSCORES wire shape.',
			'func renderRange(entries []zEntry, withScores bool) []string {',
			'	out := make([]string, 0, len(entries)*2)',
			'	for _, e := range entries {',
			'		out = append(out, e.member)',
			'		if withScores {',
			'			out = append(out, fmtScore(e.score))',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'func (z *ZSetDB) ZRange(key string, start, stop int, withScores bool) []string {',
			'	entries := z.sortedEntries(key)',
			'	from, to := clampRange(len(entries), start, stop)',
			'	return renderRange(entries[from:to], withScores)',
			'}',
			'',
			'func (z *ZSetDB) ZRevRange(key string, start, stop int, withScores bool) []string {',
			'	entries := z.sortedEntries(key)',
			'	// Reverse the ASCENDING order rather than sorting descending:',
			'	// one comparator, so rev-order ties are exactly reversed asc',
			'	// ties (alice before bob ascending => bob before alice here).',
			'	rev := make([]zEntry, len(entries))',
			'	for i, e := range entries {',
			'		rev[len(entries)-1-i] = e',
			'	}',
			'	from, to := clampRange(len(rev), start, stop)',
			'	return renderRange(rev[from:to], withScores)',
			'}',
			'',
			'// parseBound turns "-inf"/"+inf"/"inf" or a float string into a',
			'// float64. math.Inf gives real infinities, so the range test below',
			'// needs no special cases.',
			'func parseBound(s string) (float64, error) {',
			'	lower := strings.ToLower(s)',
			'	if lower == "-inf" {',
			'		return math.Inf(-1), nil',
			'	}',
			'	if lower == "+inf" || lower == "inf" {',
			'		return math.Inf(1), nil',
			'	}',
			'	v, err := strconv.ParseFloat(s, 64)',
			'	if err != nil {',
			'		return 0, errors.New("ERR min or max is not a float")',
			'	}',
			'	return v, nil',
			'}',
			'',
			'func (z *ZSetDB) ZRangeByScore(key, min, max string) ([]string, error) {',
			'	lo, err := parseBound(min)',
			'	if err != nil {',
			'		return nil, err',
			'	}',
			'	hi, err2 := parseBound(max)',
			'	if err2 != nil {',
			'		return nil, err2',
			'	}',
			'	out := []string{}',
			'	// Walking the sorted order keeps the output ranked; the bounds',
			'	// are inclusive on both ends, per the command\'s definition.',
			'	for _, e := range z.sortedEntries(key) {',
			'		if e.score >= lo && e.score <= hi {',
			'			out = append(out, e.member)',
			'		}',
			'	}',
			'	return out, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Skiplist + hashtable: why sorted sets are two structures</h3>' +
			'<p>A real sorted set (past the small-set listpack encoding) is ' +
			'<em>two</em> structures over the same members: a hashtable ' +
			'(member → score, making <code>ZSCORE</code> O(1)) and a ' +
			'<strong>skiplist</strong> ordered by (score, member), making ranked ' +
			'queries O(log n). A skiplist is a sorted linked list with express ' +
			'lanes: each node gets a random height, level-k pointers skip over ' +
			'lower nodes, and search drops down a level each time it overshoots. ' +
			'Same O(log n) as a balanced tree, but with a trick balanced trees ' +
			'make painful: Redis’s skiplist nodes carry <em>span</em> counts (how ' +
			'many bottom-level nodes each pointer jumps), so <code>ZRANK</code> ' +
			'sums spans along the search path — position in O(log n) without ' +
			'counting predecessors. That span trick is the entire reason “what ' +
			'is my rank among 50 million players” is a sub-microsecond question.</p>' +
			'<h3>Update-moves is the contract</h3>' +
			'<p>Your derived-sort model gets repositioning for free; real Redis ' +
			'must delete the skiplist node at the old (score, member) key and ' +
			'reinsert at the new one — two O(log n) operations under one atomic ' +
			'command. This is what the SQL leaderboard could not do: its rank was ' +
			'computed per query, so every read paid for sorting; here every ' +
			'<em>write</em> pays O(log n) once and reads are cheap. The general ' +
			'rule: sorted sets shift work from read time to write time, which is ' +
			'the right trade for leaderboards read thousands of times per ' +
			'update.</p>' +
			'<h3>Scores are doubles — mind the edges</h3>' +
			'<p>Scores are IEEE-754 doubles: integers are exact only up to ' +
			'2<sup>53</sup>, so timestamp-in-micros or snowflake-ID scores ' +
			'silently lose precision — the classic fix is score = timestamp, ' +
			'member = ID, letting the tiebreak handle collisions. The ' +
			'lexicographic tiebreak also powers a whole command family: with all ' +
			'scores <em>equal</em>, order is purely by member bytes, and ' +
			'<code>ZRANGEBYLEX</code> gives range scans over strings — prefix ' +
			'autocomplete out of a sorted set. Real ZRANGEBYSCORE also supports ' +
			'exclusive bounds (<code>(100</code>) and a LIMIT clause; same walk, ' +
			'stricter comparisons.</p>' +
			'<h3>Leaderboard patterns in production</h3>' +
			'<p><code>ZINCRBY board pts player</code> per game event; ' +
			'<code>ZREVRANGE board 0 99 WITHSCORES</code> for the front page; ' +
			'<code>ZREVRANK board me</code> for “your rank”; and around a player, ' +
			'<code>ZREVRANGE board rank-2 rank+2</code> — the “nearby rivals” ' +
			'widget. Daily boards use one key per day (<code>board:2026-08-01</code>) ' +
			'with an <code>EXPIRE</code>, and <code>ZUNIONSTORE</code> with ' +
			'weights rolls days into a weekly board server-side. The one command ' +
			'to fear at scale: <code>ZRANGE board 0 -1 WITHSCORES</code> on a ' +
			'multi-million-member set — same single-thread stall as every other ' +
			'full-collection read in this track.</p>',
		],
		complexity: { time: 'O(n log n) per ranked query in this model (sort on demand); real Redis: O(log n) writes and rank lookups via skiplist spans, O(1) ZSCORE', space: 'O(n) — plus the skiplist’s expected ~1.33 pointers per member in real Redis' },
	});
})();
