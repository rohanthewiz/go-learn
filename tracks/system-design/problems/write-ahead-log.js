/* Write-Ahead Log — Storage Engines (Medium). Crash recovery by replay:
 * the durability mechanism under Postgres, etcd, and every serious storage
 * engine. Exact-table harness: replay is deterministic, and the harness
 * renders maps through a sorted-key formatter so map order never matters.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 190" width="540" height="190" role="img" aria-label="write-ahead log: entries after the checkpoint replay onto empty state; a duplicated tail record is skipped">' +
		'<text x="15" y="18" class="lbl">append-only log · appended + fsync’d BEFORE the change is applied</text>' +
		// log entries: 1-3 are covered by the checkpoint, 4-5 are the delta, last is a dup tail
		'<rect x="15" y="30" width="78" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="100" y="30" width="78" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="185" y="30" width="78" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="270" y="30" width="78" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.8"/>' +
		'<rect x="355" y="30" width="78" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.8"/>' +
		'<rect x="440" y="30" width="78" height="30" rx="4" fill="none" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<text x="54" y="50" text-anchor="middle">1 set a</text>' +
		'<text x="139" y="50" text-anchor="middle">2 set b</text>' +
		'<text x="224" y="50" text-anchor="middle">3 del a</text>' +
		'<text x="309" y="50" text-anchor="middle">4 set c</text>' +
		'<text x="394" y="50" text-anchor="middle">5 set d</text>' +
		'<text x="479" y="50" text-anchor="middle">5 set d</text>' +
		'<text x="479" y="84" text-anchor="middle" class="lbl">dup tail → skipped</text>' +
		// checkpoint boundary
		'<line x1="266" y1="24" x2="266" y2="72" stroke="var(--ok)" stroke-width="1.6" stroke-dasharray="4 3"/>' +
		'<text x="266" y="84" text-anchor="middle" class="lbl">checkpoint @3</text>' +
		// replay arrows into recovered state
		'<path d="M 309 60 C 300 92 285 104 272 112" fill="none" stroke="var(--dim)" stroke-width="1.4" marker-end="url(#dgArrowWAL)"/>' +
		'<path d="M 394 60 C 380 94 330 108 305 114" fill="none" stroke="var(--dim)" stroke-width="1.4" marker-end="url(#dgArrowWAL)"/>' +
		'<rect x="185" y="118" width="180" height="38" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="275" y="141" text-anchor="middle">state after replay: {c, d}</text>' +
		'<text x="15" y="134" class="lbl">Replay(entries, 3):</text>' +
		'<text x="15" y="148" class="lbl">Seq &gt; 3, and Seq must</text>' +
		'<text x="15" y="162" class="lbl">strictly increase</text>' +
		'<defs><marker id="dgArrowWAL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'write-ahead-log',
		title: 'Write-Ahead Log',
		nav: 'Write-Ahead Log',
		difficulty: 'Medium',
		category: 'Storage Engines',
		task: 'Implement Replay (crash recovery) and Checkpoint (log compaction) — make all 6 tests pass.',

		prose: [
			'<h2>Write-Ahead Log</h2>' +
			'<p>A database that mutates its in-memory structures first and persists ' +
			'“later” loses committed writes the moment power fails. The fix is a rule, ' +
			'not a data structure: <em>append the change to a log and fsync it before ' +
			'applying it anywhere else</em>. After a crash, the state is rebuilt by ' +
			'replaying the log — the log is the truth; everything else is a cache.</p>' +
			DIAGRAM +
			'<p>Each record is an <code>Entry{Seq, Op, Key, Value}</code> with a strictly ' +
			'increasing <code>Seq</code> assigned at append time; <code>Op</code> is ' +
			'<code>"set"</code> or <code>"del"</code>. Implement two functions:</p>' +
			'<ul>' +
			'<li><code>Replay(entries, checkpointSeq)</code> — start from an <em>empty</em> map ' +
			'and apply entries in order. Apply an entry only if its <code>Seq</code> is ' +
			'strictly greater than <strong>both</strong> <code>checkpointSeq</code> and the last ' +
			'applied <code>Seq</code>. A crash mid-fsync can leave the tail duplicated, and ' +
			'stitching log segments can re-append stale records — the strictly-increasing ' +
			'rule makes replay idempotent. <code>"del"</code> removes the key; deleting a ' +
			'missing key is a no-op.</li>' +
			'<li><code>Checkpoint(state, atSeq)</code> — serialize state as <code>"set"</code> ' +
			'entries, all stamped <code>Seq = atSeq</code>, keys sorted ascending. This is log ' +
			'compaction: the whole history collapses to one entry per live key, and old ' +
			'log segments can be deleted.</li>' +
			'</ul>' +
			'<p>Note that <code>Replay</code> builds state only from the entries it is given: ' +
			'recovery from a checkpoint means loading the checkpoint image (or prepending ' +
			'its entries, as the round-trip test does) and replaying the delta after it.</p>',
		],

		starter: [
			'package main',
			'',
			'// Entry is one durable record in the write-ahead log.',
			'type Entry struct {',
			'	Seq   int64  // strictly increasing, assigned at append time',
			'	Op    string // "set" or "del"',
			'	Key   string',
			'	Value string // meaningful only for "set"',
			'}',
			'',
			'// Replay rebuilds key/value state after a crash by applying entries,',
			'// in order, onto an empty map. Apply an entry ONLY if its Seq is',
			'// strictly greater than checkpointSeq AND strictly greater than the',
			'// last applied Seq — a crashed writer can leave duplicated or stale',
			'// records at the tail. "del" removes the key (no-op if missing).',
			'func Replay(entries []Entry, checkpointSeq int64) map[string]string {',
			'	state := map[string]string{}',
			'	// your code here',
			'	return state',
			'}',
			'',
			'// Checkpoint serializes state as a compact log: one "set" entry per',
			'// key, all stamped with Seq = atSeq, keys in ascending order.',
			'func Checkpoint(state map[string]string, atSeq int64) []Entry {',
			'	return nil // your code here',
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
			SD.HARNESS_RT,
			'',
			'// fmtState renders a map deterministically: keys sorted ascending.',
			'// Never rely on Go map iteration order for display or comparison.',
			'func fmtState(m map[string]string) string {',
			'	keys := make([]string, 0, len(m))',
			'	for k := range m {',
			'		keys = append(keys, k)',
			'	}',
			'	sort.Strings(keys)',
			'	parts := make([]string, 0, len(keys))',
			'	for _, k := range keys {',
			'		parts = append(parts, k+"="+m[k])',
			'	}',
			'	if len(parts) == 0 {',
			'		return "(empty)"',
			'	}',
			'	return strings.Join(parts, ",")',
			'}',
			'',
			'// fmtEntries renders a log slice as seq:op:key=value tokens.',
			'func fmtEntries(es []Entry) string {',
			'	if len(es) == 0 {',
			'		return "(none)"',
			'	}',
			'	parts := make([]string, 0, len(es))',
			'	for _, e := range es {',
			'		parts = append(parts, fmt.Sprintf("%d:%s:%s=%s", e.Seq, e.Op, e.Key, e.Value))',
			'	}',
			'	return strings.Join(parts, " ")',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name    string',
			'		kind    string // "replay" | "checkpoint" | "roundtrip"',
			'		entries []Entry',
			'		cpSeq   int64',
			'		state   map[string]string',
			'		atSeq   int64',
			'		tail    []Entry',
			'		want    string',
			'	}',
			'	cases := []tc{',
			'		{name: "full replay from 0: set a=1, set b=2, set a=3", kind: "replay",',
			'			entries: []Entry{{1, "set", "a", "1"}, {2, "set", "b", "2"}, {3, "set", "a", "3"}},',
			'			cpSeq:   0, want: "a=3,b=2"},',
			'		{name: "replay from checkpoint 2: only seq 3 and 4 apply", kind: "replay",',
			'			entries: []Entry{{1, "set", "a", "old"}, {2, "set", "b", "old"}, {3, "set", "a", "new"}, {4, "set", "c", "4"}},',
			'			cpSeq:   2, want: "a=new,c=4"},',
			'		{name: "del removes; del of a missing key is a no-op", kind: "replay",',
			'			entries: []Entry{{1, "set", "a", "1"}, {2, "set", "b", "2"}, {3, "del", "a", ""}, {4, "del", "zz", ""}},',
			'			cpSeq:   0, want: "b=2"},',
			'		{name: "duplicated/stale tail records (seq not increasing) are skipped", kind: "replay",',
			'			entries: []Entry{{1, "set", "k", "old"}, {2, "set", "k", "new"}, {3, "set", "b", "2"}, {1, "set", "k", "old"}, {3, "set", "b", "2"}},',
			'			cpSeq:   0, want: "b=2,k=new"},',
			'		{name: "checkpoint serializes sorted: {b:2, c:3, a:1} at seq 10", kind: "checkpoint",',
			'			state: map[string]string{"b": "2", "c": "3", "a": "1"},',
			'			atSeq: 10, want: "10:set:a=1 10:set:b=2 10:set:c=3"},',
			'		{name: "round trip: checkpoint Replay(prefix) at 5, then replay cp+tail from 0", kind: "roundtrip",',
			'			entries: []Entry{{1, "set", "a", "1"}, {2, "set", "b", "2"}, {3, "del", "b", ""}},',
			'			atSeq:   5,',
			'			tail:    []Entry{{6, "set", "c", "9"}, {7, "del", "a", ""}},',
			'			want:    "cp[5:set:a=1] state[c=9]"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  c.want,',
			'		}',
			'		runCase(r, func() {',
			'			var got string',
			'			switch c.kind {',
			'			case "replay":',
			'				got = fmtState(Replay(append([]Entry(nil), c.entries...), c.cpSeq))',
			'			case "checkpoint":',
			'				st := map[string]string{}',
			'				for k, v := range c.state {',
			'					st[k] = v',
			'				}',
			'				got = fmtEntries(Checkpoint(st, c.atSeq))',
			'			case "roundtrip":',
			'				base := Replay(append([]Entry(nil), c.entries...), 0)',
			'				cp := Checkpoint(base, c.atSeq)',
			'				log := append(append([]Entry(nil), cp...), c.tail...)',
			'				got = "cp[" + fmtEntries(cp) + "] state[" + fmtState(Replay(log, 0)) + "]"',
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
			'import "sort"',
			'',
			'// Entry is one durable record in the write-ahead log.',
			'type Entry struct {',
			'	Seq   int64  // strictly increasing, assigned at append time',
			'	Op    string // "set" or "del"',
			'	Key   string',
			'	Value string // meaningful only for "set"',
			'}',
			'',
			'// Replay rebuilds key/value state after a crash by applying entries,',
			'// in order, onto an empty map.',
			'//',
			'// Two guards make replay safe against real-world log messiness, and',
			'// initializing lastApplied to checkpointSeq expresses both at once:',
			'//   - everything at or below the checkpoint is already captured by',
			'//     the checkpoint image, so replay cost tracks the delta, not the',
			'//     log\'s whole lifetime;',
			'//   - a crash mid-fsync can leave the final record duplicated, and',
			'//     stitching segments can re-append stale records. Requiring',
			'//     Seq > lastApplied makes replay idempotent: applying the log',
			'//     twice — or a log with a doubled tail — yields the same state.',
			'func Replay(entries []Entry, checkpointSeq int64) map[string]string {',
			'	state := map[string]string{}',
			'	lastApplied := checkpointSeq // nothing at or below the checkpoint applies',
			'	for _, e := range entries {',
			'		if e.Seq <= lastApplied {',
			'			continue // duplicate or stale record — already reflected in state',
			'		}',
			'		switch e.Op {',
			'		case "set":',
			'			state[e.Key] = e.Value',
			'		case "del":',
			'			// delete on a missing key is a built-in no-op, which is',
			'			// exactly the recovery semantics we want: replaying a del',
			'			// twice must not differ from replaying it once.',
			'			delete(state, e.Key)',
			'		}',
			'		lastApplied = e.Seq',
			'	}',
			'	return state',
			'}',
			'',
			'// Checkpoint serializes state as a compact log: one "set" entry per',
			'// key, all stamped with Seq = atSeq. This is log compaction — the',
			'// entire history up to atSeq collapses to one record per live key,',
			'// so every earlier segment becomes garbage.',
			'//',
			'// Keys are sorted before serialization: map iteration order is',
			'// deliberately randomized in Go, and a checkpoint written in a',
			'// different order on every run would defeat byte-level comparison,',
			'// dedup, and incremental shipping of checkpoint files.',
			'func Checkpoint(state map[string]string, atSeq int64) []Entry {',
			'	keys := make([]string, 0, len(state))',
			'	for k := range state {',
			'		keys = append(keys, k)',
			'	}',
			'	sort.Strings(keys)',
			'	out := make([]Entry, 0, len(keys))',
			'	for _, k := range keys {',
			'		out = append(out, Entry{Seq: atSeq, Op: "set", Key: k, Value: state[k]})',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Durability is an ordering rule</h3>' +
			'<p>The naive engine applies a write to its in-memory map, then persists ' +
			'“eventually”. Any crash between those two moments silently loses an ' +
			'acknowledged write. <strong>Write-ahead logging</strong> inverts the order: ' +
			'append the intent to an append-only file, <code>fsync</code>, and only then ' +
			'touch any other structure. Sequential appends are the cheapest IO a disk ' +
			'offers, so durability costs one ordered write — not a random-IO storm.</p>' +
			'<h3>Replay must be idempotent</h3>' +
			'<p>Recovery is just “run the log forward again” — but the log itself can be ' +
			'messy at the tail (a doubled final record from a crash mid-fsync, a stale ' +
			'record from segment stitching). The whole guard is one comparison:</p>',
			{ code: 'lastApplied := checkpointSeq\nfor _, e := range entries {\n\tif e.Seq <= lastApplied {\n\t\tcontinue // duplicate/stale: already reflected\n\t}\n\t// apply, then advance the high-water mark\n\tlastApplied = e.Seq\n}' },
			'<p>Monotonic sequence numbers turn “did I already apply this?” into an O(1) ' +
			'check with no bookkeeping beyond one int — the same high-water-mark idea that ' +
			'makes Raft appends and Kafka consumer offsets safe to retry.</p>' +
			'<h3>Checkpoints are log compaction</h3>' +
			'<p>Without checkpoints the log grows forever and recovery replays years of ' +
			'history. Periodically serializing live state (one <code>set</code> per key, ' +
			'stamped with the sequence it captures) lets everything older be deleted; ' +
			'recovery becomes <em>load checkpoint + replay the delta</em>.</p>' +
			'<p>This exact shape is everywhere: Postgres WAL (with checkpoints bounding ' +
			'recovery time), etcd’s Raft log plus snapshots, Kafka — where the log ' +
			'<em>is</em> the database and compacted topics are this Checkpoint function as ' +
			'a service — journaling filesystems like ext4, and the <em>lsm-memtable</em> ' +
			'problem next door, whose memtable survives crashes only because a WAL sits ' +
			'in front of it.</p>',
		],
		complexity: { time: 'O(n) replay; O(k log k) checkpoint', space: 'O(k) live keys' },
	});
})();
