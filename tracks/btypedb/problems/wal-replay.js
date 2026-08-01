/* WAL Replay — btypedb: Durability (Medium). Open() owns no B-tree file:
 * the tree is rebuilt by replaying the append-only log record by record.
 * The learner implements Replay over decoded records — set/delete/setttl in
 * order, plus batch(3) headers whose uint64 count marks the next N records
 * as one atomic transaction, applied all-or-nothing. The harness pins
 * last-writer-wins ordering, TTL interactions, complete and incomplete
 * batches, and rejection of malformed streams.
 */
(function () {
	'use strict';
	var T = GoLearnBT;

	// The log as a strip of records flowing into state; a batch bracket
	// groups its N records into one atomic unit — apply all of it or none
	// of it. Marker id namespaced (dgArrowBT05) because every track's SVGs
	// share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="replay applies log records in order into the in-memory state; a batch header groups the following N records into one atomic all-or-nothing unit">' +
		'<text x="20" y="24" class="lbl">Open() = replay the log, left to right, into an empty tree</text>' +
		'<rect x="30" y="44" width="74" height="30" rx="4" fill="none" stroke="var(--edge)"/><text x="67" y="64" text-anchor="middle">set a=1</text>' +
		'<rect x="112" y="44" width="74" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="149" y="64" text-anchor="middle">batch 2</text>' +
		'<rect x="194" y="44" width="74" height="30" rx="4" fill="none" stroke="var(--accent)"/><text x="231" y="64" text-anchor="middle">set b=2</text>' +
		'<rect x="276" y="44" width="74" height="30" rx="4" fill="none" stroke="var(--accent)"/><text x="313" y="64" text-anchor="middle">del a</text>' +
		'<rect x="358" y="44" width="74" height="30" rx="4" fill="none" stroke="var(--edge)"/><text x="395" y="64" text-anchor="middle">set c=3</text>' +
		// batch bracket
		'<path d="M 112 84 L 112 96 L 350 96 L 350 84" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="231" y="114" text-anchor="middle" class="lbl" style="fill:var(--accent)">one transaction: header + its 2 records — all or nothing</text>' +
		// arrow into state
		'<path d="M 440 60 L 500 60" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBT05)"/>' +
		'<rect x="404" y="130 " width="140" height="52" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="474" y="152" text-anchor="middle">state after replay</text>' +
		'<text x="474" y="172" text-anchor="middle" class="lbl">b=2, c=3</text>' +
		'<path d="M 240 122 C 300 150 360 156 398 156" fill="none" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowBT05)"/>' +
		'<text x="20" y="152" class="lbl" style="fill:var(--warn)">a batch whose records are cut short is DISCARDED —</text>' +
		'<text x="20" y="170" class="lbl" style="fill:var(--warn)">crash recovery must never surface half a transaction</text>' +
		'<text x="20" y="200" class="lbl">position in the file is the ordering: no sequence numbers, no timestamps — just left to right</text>' +
		'<defs><marker id="dgArrowBT05" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'wal-replay',
		title: 'Replay: Rebuilding the Tree from the Log',
		nav: 'wal replay',
		difficulty: 'Medium',
		category: 'Durability',
		task: 'Implement Replay: apply set/delete/setttl records in order and batch groups all-or-nothing, producing the final state and TTL table.',

		prose: [
			'<h2>Replay: Rebuilding the Tree from the Log</h2>' +
			'<p>Kill a btypedb process and look at what is on disk: no B-tree, no ' +
			'pages, no index — just the append-only log. The entire database ' +
			'state is a <em>derived value</em>: <code>Open</code> reads the log ' +
			'front to back, applies every record to an empty tree, and the tree ' +
			'that results <em>is</em> the database. This is the write-ahead-log ' +
			'bargain: writes are cheap sequential appends, and in exchange, ' +
			'startup must reconstruct everything.</p>',
			{ lang: 'go', code: '// Open replays users.db into a fresh B-tree before returning.\ndb, err := btypedb.Open("users.db", btypedb.StringCodec, btypedb.JSONCodec[User]())\nif err != nil { /* ... */ }\n// Every Set/Delete/SetTTL since the file was created has been\n// re-applied, in order. Deadlines are absolute, so keys that\n// expired while the database was closed are simply gone.' },
			'<p>Replay is a fold over records, with one rule per op:</p>' +
			'<ul>' +
			'<li><strong>set</strong> — store the value, <em>clear any TTL</em> ' +
			'(a plain Set makes the key permanent, and replay must reproduce ' +
			'that).</li>' +
			'<li><strong>delete</strong> — remove the key and its deadline.</li>' +
			'<li><strong>setttl</strong> — store the value and its absolute ' +
			'deadline.</li>' +
			'<li><strong>batch</strong> — not a mutation at all: a marker whose ' +
			'value is a uint64 count, declaring “the next N records were committed ' +
			'as one transaction”. If all N are present, apply them in order. If ' +
			'the stream ends before N records arrive — the tail a crash ' +
			'mid-commit leaves — apply <strong>none</strong> of them: a reader ' +
			'must never observe half a transaction.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Replay(recs)</code> over already-decoded records ' +
			'(the byte-level framing was the previous item), returning the final ' +
			'state map, the TTL table, and an error for malformed streams: an ' +
			'unknown op, or a batch header nested inside another batch. An ' +
			'<em>incomplete</em> trailing batch is not an error — it is a normal ' +
			'crash artifact, silently discarded.</p>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// The four record ops of the log format.',
			'const (',
			'	OpSet    = byte(1)',
			'	OpDelete = byte(2)',
			'	OpBatch  = byte(3) // Count = how many following records form one transaction',
			'	OpSetTTL = byte(4) // Deadline = absolute expiry, unix nanos',
			')',
			'',
			'// Record is a log record after framing and codec decode: payloads',
			'// are strings, the setttl deadline and batch count are typed fields.',
			'type Record struct {',
			'	Op       byte',
			'	Key      string',
			'	Val      string',
			'	Deadline int64 // OpSetTTL only',
			'	Count    int   // OpBatch only',
			'}',
			'',
			'// Replay folds the record stream into (state, ttl table, error).',
			'//',
			'//   - set: store value, CLEAR any ttl',
			'//   - delete: remove value and ttl',
			'//   - setttl: store value and deadline',
			'//   - batch: the next Count records are one transaction — apply all',
			'//     of them, or (if the stream ends first) none of them',
			'//   - unknown op, or a batch header inside a batch: return an error',
			'func Replay(recs []Record) (map[string]string, map[string]int64, error) {',
			'	state := make(map[string]string)',
			'	ttl := make(map[string]int64)',
			'	for _, r := range recs {',
			'		switch r.Op {',
			'		case OpSet:',
			'			state[r.Key] = r.Val',
			'		case OpDelete:',
			'			delete(state, r.Key)',
			'		case OpSetTTL:',
			'			state[r.Key] = r.Val',
			'			ttl[r.Key] = r.Deadline',
			'		case OpBatch:',
			'			// your code here: group the next Count records atomically',
			'		}',
			'	}',
			'	_ = errors.New // remove once errors are returned',
			'	return state, ttl, nil',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"sort"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'// Deterministic deadline instants: a fixed base plus second offsets.',
			'const hSecNs = int64(1000000000)',
			'',
			'func hAt(s int64) int64 { return int64(1700000000)*hSecNs + s*hSecNs }',
			'',
			'// hDump renders (state, ttl) canonically: sorted k=v pairs, then the',
			'// ttl table as k@offsetSeconds — map iteration order never leaks in.',
			'func hDump(state map[string]string, ttl map[string]int64) string {',
			'	ks := make([]string, 0, len(state))',
			'	for k := range state {',
			'		ks = append(ks, k)',
			'	}',
			'	sort.Strings(ks)',
			'	parts := make([]string, 0, len(ks))',
			'	for _, k := range ks {',
			'		parts = append(parts, k+"="+state[k])',
			'	}',
			'	ts := make([]string, 0, len(ttl))',
			'	for k := range ttl {',
			'		ts = append(ts, fmt.Sprintf("%s@%d", k, (ttl[k]-hAt(0))/hSecNs))',
			'	}',
			'	sort.Strings(ts)',
			'	return "{" + strings.Join(parts, ",") + "} ttl{" + strings.Join(ts, ",") + "}"',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		recs []Record',
			'	}',
			'	cases := []tc{',
			'		{"plain sequence: sets, an overwrite, a delete — position is the ordering",',
			'			"{a=3} ttl{}",',
			'			[]Record{',
			'				{Op: OpSet, Key: "a", Val: "1"},',
			'				{Op: OpSet, Key: "b", Val: "2"},',
			'				{Op: OpSet, Key: "a", Val: "3"},',
			'				{Op: OpDelete, Key: "b"},',
			'			}},',
			'		{"setttl carries its absolute deadline into the ttl table",',
			'			"{s:1=tok} ttl{s:1@30}",',
			'			[]Record{',
			'				{Op: OpSetTTL, Key: "s:1", Val: "tok", Deadline: hAt(30)},',
			'			}},',
			'		{"a later plain set clears the ttl — replay reproduces Set semantics",',
			'			"{s:1=tok2} ttl{}",',
			'			[]Record{',
			'				{Op: OpSetTTL, Key: "s:1", Val: "tok", Deadline: hAt(30)},',
			'				{Op: OpSet, Key: "s:1", Val: "tok2"},',
			'			}},',
			'		{"delete removes the deadline along with the value",',
			'			"{} ttl{}",',
			'			[]Record{',
			'				{Op: OpSetTTL, Key: "s:1", Val: "tok", Deadline: hAt(30)},',
			'				{Op: OpDelete, Key: "s:1"},',
			'			}},',
			'		{"complete batch: header + both records apply as one unit",',
			'			"{b=2,c=3} ttl{}",',
			'			[]Record{',
			'				{Op: OpSet, Key: "a", Val: "1"},',
			'				{Op: OpBatch, Count: 2},',
			'				{Op: OpSet, Key: "b", Val: "2"},',
			'				{Op: OpDelete, Key: "a"},',
			'				{Op: OpSet, Key: "c", Val: "3"},',
			'			}},',
			'		{"incomplete trailing batch: 3 promised, 2 present — NONE applied",',
			'			"{a=1} ttl{}",',
			'			[]Record{',
			'				{Op: OpSet, Key: "a", Val: "1"},',
			'				{Op: OpBatch, Count: 3},',
			'				{Op: OpSet, Key: "b", Val: "2"},',
			'				{Op: OpSet, Key: "c", Val: "3"},',
			'			}},',
			'		{"a batch may contain setttl and delete — atomicity is op-agnostic",',
			'			"{s:2=y} ttl{s:2@60}",',
			'			[]Record{',
			'				{Op: OpSetTTL, Key: "s:1", Val: "x", Deadline: hAt(30)},',
			'				{Op: OpBatch, Count: 2},',
			'				{Op: OpDelete, Key: "s:1"},',
			'				{Op: OpSetTTL, Key: "s:2", Val: "y", Deadline: hAt(60)},',
			'			}},',
			'		{"empty batch (count 0) is a valid transaction; replay continues after it",',
			'			"{d=4} ttl{}",',
			'			[]Record{',
			'				{Op: OpBatch, Count: 0},',
			'				{Op: OpSet, Key: "d", Val: "4"},',
			'			}},',
			'		{"unknown op byte: the stream is malformed — error, not a guess",',
			'			"error",',
			'			[]Record{',
			'				{Op: 9, Key: "a", Val: "1"},',
			'			}},',
			'		{"batch header inside a batch: malformed — the log never nests",',
			'			"error",',
			'			[]Record{',
			'				{Op: OpBatch, Count: 2},',
			'				{Op: OpBatch, Count: 1},',
			'				{Op: OpSet, Key: "a", Val: "1"},',
			'			}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			state, ttl, err := Replay(c.recs)',
			'			got := ""',
			'			if err != nil {',
			'				got = "error"',
			'			} else {',
			'				got = hDump(state, ttl)',
			'			}',
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
			'import "errors"',
			'',
			'// The four record ops of the log format.',
			'const (',
			'	OpSet    = byte(1)',
			'	OpDelete = byte(2)',
			'	OpBatch  = byte(3) // Count = how many following records form one transaction',
			'	OpSetTTL = byte(4) // Deadline = absolute expiry, unix nanos',
			')',
			'',
			'// Record is a log record after framing and codec decode.',
			'type Record struct {',
			'	Op       byte',
			'	Key      string',
			'	Val      string',
			'	Deadline int64 // OpSetTTL only',
			'	Count    int   // OpBatch only',
			'}',
			'',
			'// applyOne folds a single MUTATION record into the state. Batch is',
			'// deliberately not handled here: a batch header is control flow, not',
			'// a mutation, and letting it reach this function means the stream',
			'// nested batches — malformed. Factoring the fold this way makes the',
			'// batch loop below reuse the exact same semantics as top-level',
			'// records, so "a batch may contain setttl/delete" needs no code.',
			'func applyOne(state map[string]string, ttl map[string]int64, r Record) error {',
			'	switch r.Op {',
			'	case OpSet:',
			'		// Set makes the key permanent — clearing the deadline is what',
			'		// keeps replayed state identical to the live semantics.',
			'		state[r.Key] = r.Val',
			'		delete(ttl, r.Key)',
			'		return nil',
			'	case OpDelete:',
			'		delete(state, r.Key)',
			'		delete(ttl, r.Key)',
			'		return nil',
			'	case OpSetTTL:',
			'		state[r.Key] = r.Val',
			'		ttl[r.Key] = r.Deadline',
			'		return nil',
			'	case OpBatch:',
			'		return errors.New("batch header nested inside a batch")',
			'	}',
			'	return errors.New("unknown record op")',
			'}',
			'',
			'// Replay folds the record stream into (state, ttl table, error).',
			'//',
			'// The index-based loop (not range) matters: a batch header consumes',
			'// its following Count records in one step, and the cursor must jump',
			'// past the whole group.',
			'func Replay(recs []Record) (map[string]string, map[string]int64, error) {',
			'	state := make(map[string]string)',
			'	ttl := make(map[string]int64)',
			'	i := 0',
			'	for i < len(recs) {',
			'		r := recs[i]',
			'		if r.Op != OpBatch {',
			'			if err := applyOne(state, ttl, r); err != nil {',
			'				return nil, nil, err',
			'			}',
			'			i++',
			'			continue',
			'		}',
			'		// Batch: check completeness BEFORE touching state. A crash',
			'		// mid-commit leaves a header promising more records than the',
			'		// file holds; surfacing a partial transaction would break the',
			'		// atomicity the batch frame exists to guarantee, so the whole',
			'		// group is discarded — silently, because this is a normal',
			'		// crash artifact, not corruption.',
			'		if i+1+r.Count > len(recs) {',
			'			break',
			'		}',
			'		for j := i + 1; j <= i+r.Count; j++ {',
			'			if err := applyOne(state, ttl, recs[j]); err != nil {',
			'				return nil, nil, err',
			'			}',
			'		}',
			'		i += 1 + r.Count',
			'	}',
			'	return state, ttl, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What the real btypedb does</h3>' +
			'<p>Your fold is the second half of <code>Open</code>. The first half ' +
			'is the previous item: the engine frames records out of the raw file ' +
			'(CRC-checking each one), runs the codecs to decode keys and values, ' +
			'then applies exactly your rules into the copy-on-write B-tree — plus ' +
			'one more that only matters with a real clock: a <code>setttl</code> ' +
			'whose absolute deadline has already passed is dropped during replay, ' +
			'which is how keys that expired while the database was closed stay ' +
			'dead. Secondary indexes are <em>not</em> in the log at all — ' +
			'comparators are Go functions and cannot be persisted — so after ' +
			'replay, re-registered indexes are rebuilt by scanning the recovered ' +
			'tree.</p>' +
			'<p>The batch discipline you implemented is verified brutally in ' +
			'btypedb’s test suite: a consistency harness opens <em>every ' +
			'byte-length prefix</em> of a real log — simulating a crash after ' +
			'every single byte — and asserts each prefix recovers to a state ' +
			'where every transaction is either fully present or fully absent. ' +
			'A SIGKILL suite does the same with a live process, killing a ' +
			'write-hammering child at random points. All-or-nothing is not a ' +
			'comment in the code; it is a property the tests enumerate.</p>' +
			'<h3>Trade-offs</h3>' +
			'<p>Replay-the-world startup is the cost of the memory-resident ' +
			'design. bbolt opens in O(1) — its B-tree lives in the file, ' +
			'page-mapped — but pays random I/O on every write forever. btypedb ' +
			'writes sequentially always and pays O(log size) at open. That trade ' +
			'is only livable if the log stays close to the live data size, which ' +
			'is exactly what compaction (a later item) maintains: a compacted log ' +
			'is one set-shaped record per live key, so replay cost tracks the ' +
			'<em>dataset</em>, not the write history.</p>' +
			'<p>Note also what replay never needs: locks, clocks (except the ' +
			'expiry check), or coordination. A single-threaded fold over an ' +
			'ordered stream is trivially deterministic — the same log always ' +
			'rebuilds the same tree. Determinism is the quiet superpower of ' +
			'log-structured designs: it is why replication (ship the log), ' +
			'point-in-time recovery (replay a prefix), and change-data-capture ' +
			'(tail the log) all fall out of the same mechanism in systems from ' +
			'PostgreSQL to Kafka.</p>',
		],
		complexity: { time: 'O(n) — each record visited once; batch grouping is cursor arithmetic', space: 'O(live keys) for the rebuilt state and TTL table' },
	});
})();
