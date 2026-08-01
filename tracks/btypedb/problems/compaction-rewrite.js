/* Compaction — btypedb: Durability (Medium). An append-only log never
 * forgets: every overwrite, delete and expired session lives in the file
 * forever until compaction rewrites it as a minimal snapshot of LIVE data.
 * The learner implements Compact (replay, then emit one record per live
 * key in deterministic order — set, or setttl with its surviving absolute
 * deadline) and the auto-compact trigger: size >= threshold AND size >=
 * 2x the size at last compaction. The harness pins collapse rules, expiry
 * dropping, ordering, and the trigger truth table.
 */
(function () {
	'use strict';
	var T = GoLearnBT;

	// A history-heavy log shrinks to one record per live key; new ops then
	// append after the snapshot. The trigger rule gates the rewrite.
	// Marker id namespaced (dgArrowBT10) because every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 230" width="560" height="230" role="img" aria-label="compaction rewrites a log full of overwritten, deleted and expired records into a minimal snapshot holding one record per live key; later operations append after it">' +
		'<text x="20" y="24" class="lbl">the log remembers everything — the dataset only needs the last word per key</text>' +
		'<rect x="30" y="40" width="70" height="26" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/><text x="65" y="58" text-anchor="middle" class="lbl">set a=1</text>' +
		'<rect x="104" y="40" width="70" height="26" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/><text x="139" y="58" text-anchor="middle" class="lbl">set b=2</text>' +
		'<rect x="178" y="40" width="70" height="26" rx="4" fill="none" stroke="var(--edge)"/><text x="213" y="58" text-anchor="middle">set a=3</text>' +
		'<rect x="252" y="40" width="70" height="26" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/><text x="287" y="58" text-anchor="middle" class="lbl">del b</text>' +
		'<rect x="326" y="40" width="90" height="26" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/><text x="371" y="58" text-anchor="middle" class="lbl">ttl s@30</text>' +
		'<rect x="420" y="40" width="70" height="26" rx="4" fill="none" stroke="var(--edge)"/><text x="455" y="58" text-anchor="middle">set c=4</text>' +
		'<text x="20" y="86" class="lbl" style="fill:var(--warn)">dashed = dead weight: overwritten, deleted, or expired by now</text>' +
		'<path d="M 260 96 L 260 122" fill="none" stroke="var(--accent)" stroke-width="1.8" marker-end="url(#dgArrowBT10)"/>' +
		'<text x="280" y="114" class="lbl" style="fill:var(--accent)">Compact(log, now)</text>' +
		'<rect x="150" y="130" width="80" height="28" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="190" y="149" text-anchor="middle">set a=3</text>' +
		'<rect x="234" y="130" width="80" height="28" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="274" y="149" text-anchor="middle">set c=4</text>' +
		'<rect x="318" y="130" width="110" height="28" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/><text x="373" y="149" text-anchor="middle" class="lbl">later ops append…</text>' +
		'<text x="150" y="180" class="lbl">minimal snapshot: one record per live key, deterministic key order</text>' +
		'<text x="20" y="212" class="lbl" style="fill:var(--warn)">auto-trigger: size ≥ threshold (32 MB default) AND size ≥ 2× size at last compaction</text>' +
		'<defs><marker id="dgArrowBT10" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'compaction-rewrite',
		title: 'Compaction: Rewriting the Log',
		nav: 'compaction rewrite',
		difficulty: 'Medium',
		category: 'Durability',
		task: 'Implement Compact — rewrite a log as a minimal snapshot of live data in deterministic key order — and the size-and-doubling auto-compact trigger.',

		prose: [
			'<h2>Compaction: Rewriting the Log</h2>' +
			'<p>A session store handles 50 writes per second. Each session is a ' +
			'kilobyte and there are never more than 100&nbsp;000 live at once — ' +
			'call it 100&nbsp;MB of actual data. Yet the disk fills at ' +
			'4&nbsp;GB/day, and restarts get slower every week: the append-only ' +
			'log records every write <em>ever</em>, and replay walks all of it. ' +
			'The dataset is small; its <em>history</em> is unbounded. Compaction ' +
			'is how log-structured stores forget:</p>',
			{ lang: 'go', code: '// Runs in the background once the log is ≥32 MB and has doubled\n// since the last compaction — or tune / take control:\nbtypedb.Open(path, kc, vc, btypedb.WithAutoCompact(8<<20, 50)) // ≥8MB, +50% growth\nbtypedb.Open(path, kc, vc, btypedb.WithAutoCompactDisabled())  // manual only\nerr = db.Compact()                                             // on demand' },
			'<p>The rewrite itself is a two-step you already know how to build:</p>' +
			'<ul>' +
			'<li><strong>Replay to final state</strong> — the same fold as the ' +
			'replay item: last set wins, deletes erase, <code>setttl</code> ' +
			'carries its absolute deadline, a later plain set clears it.</li>' +
			'<li><strong>Emit the minimum that recreates it</strong>: one record ' +
			'per live key — a plain <code>set</code>, or a <code>setttl</code> ' +
			'with the surviving deadline. Overwritten values, deleted keys, and ' +
			'keys whose deadline is past <code>now</code> simply do not appear; ' +
			'tombstones are only needed to cancel earlier records, and the ' +
			'snapshot has no earlier records. Emit in sorted key order — a ' +
			'deterministic rewrite is a diffable, testable rewrite.</li>' +
			'</ul>' +
			'<p>Just as important is <em>when</em>. Compacting on a timer wastes ' +
			'I/O on quiet stores; compacting on raw size thrashes when the ' +
			'dataset legitimately grows. btypedb’s default gate needs both:</p>' +
			'<ul>' +
			'<li><code>size &gt;= threshold</code> — never bother below 32&nbsp;MB; ' +
			'small logs replay instantly anyway.</li>' +
			'<li><code>size &gt;= 2 × sizeAtLastCompaction</code> — the log must ' +
			'have <em>doubled</em> since the last rewrite. If compaction barely ' +
			'shrinks the file (the data really is that big), this term backs off ' +
			'automatically instead of rewriting a huge file over and over for ' +
			'nothing.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Compact(log, now)</code> returning the minimal ' +
			'record slice in sorted key order, and ' +
			'<code>ShouldCompact(size, lastSize, threshold)</code> — the two-term ' +
			'gate above. The harness passes the numbers; keep the rule exact.</p>',
		],

		starter: [
			'package main',
			'',
			'import "sort"',
			'',
			'// The record ops that appear in a compaction input (batch headers',
			'// are gone by this point — see the explanation).',
			'const (',
			'	OpSet    = byte(1)',
			'	OpDelete = byte(2)',
			'	OpSetTTL = byte(4) // Deadline = absolute expiry, unix nanos',
			')',
			'',
			'type Record struct {',
			'	Op       byte',
			'	Key      string',
			'	Val      string',
			'	Deadline int64 // OpSetTTL only',
			'}',
			'',
			'// Compact rewrites log as a minimal snapshot of live data at time',
			'// now: one record per live key in SORTED key order — OpSet for',
			'// permanent keys, OpSetTTL (with the surviving absolute deadline)',
			'// for keys still carrying an unexpired TTL. Overwritten, deleted,',
			'// and expired records vanish.',
			'//',
			'// THIS version returns the log unchanged — the "grows forever" bug.',
			'func Compact(log []Record, now int64) []Record {',
			'	// your code here: replay to final state, then emit the minimum',
			'	_ = sort.Strings',
			'	return append([]Record(nil), log...)',
			'}',
			'',
			'// ShouldCompact is the auto-compact gate. THIS version fires on',
			'// size alone — add the doubling term: the log must ALSO be at',
			'// least twice its size at the last compaction.',
			'func ShouldCompact(size, lastSize, threshold int64) bool {',
			'	return size >= threshold',
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
			'const hSecNs = int64(1000000000)',
			'const hMB = int64(1) << 20',
			'',
			'func hAt(s int64) int64 { return int64(1700000000)*hSecNs + s*hSecNs }',
			'',
			'// hDumpRecs renders a record slice canonically; deadlines print as',
			'// +seconds so the wants stay readable.',
			'func hDumpRecs(recs []Record) string {',
			'	parts := make([]string, 0, len(recs))',
			'	for _, r := range recs {',
			'		switch r.Op {',
			'		case OpSet:',
			'			parts = append(parts, "set "+r.Key+"="+r.Val)',
			'		case OpSetTTL:',
			'			parts = append(parts, fmt.Sprintf("ttl %s=%s@%d", r.Key, r.Val, (r.Deadline-hAt(0))/hSecNs))',
			'		case OpDelete:',
			'			parts = append(parts, "del "+r.Key)',
			'		default:',
			'			parts = append(parts, fmt.Sprintf("op%d %s", r.Op, r.Key))',
			'		}',
			'	}',
			'	return "[" + strings.Join(parts, "; ") + "]"',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"overwrites collapse: three records about a, only the last survives",',
			'			"[set a=3; set b=2]",',
			'			func() string {',
			'				return hDumpRecs(Compact([]Record{',
			'					{Op: OpSet, Key: "a", Val: "1"},',
			'					{Op: OpSet, Key: "b", Val: "2"},',
			'					{Op: OpSet, Key: "a", Val: "3"},',
			'				}, hAt(0)))',
			'			}},',
			'		{"deleted keys leave NOTHING — a snapshot needs no tombstones",',
			'			"[set b=2]",',
			'			func() string {',
			'				return hDumpRecs(Compact([]Record{',
			'					{Op: OpSet, Key: "a", Val: "1"},',
			'					{Op: OpSet, Key: "b", Val: "2"},',
			'					{Op: OpDelete, Key: "a"},',
			'				}, hAt(0)))',
			'			}},',
			'		{"set after delete: the key is back, with its final value",',
			'			"[set a=9]",',
			'			func() string {',
			'				return hDumpRecs(Compact([]Record{',
			'					{Op: OpSet, Key: "a", Val: "1"},',
			'					{Op: OpDelete, Key: "a"},',
			'					{Op: OpSet, Key: "a", Val: "9"},',
			'				}, hAt(0)))',
			'			}},',
			'		{"unexpired TTL survives as ONE setttl with the same absolute deadline",',
			'			"[ttl s:1=tok@30]",',
			'			func() string {',
			'				return hDumpRecs(Compact([]Record{',
			'					{Op: OpSetTTL, Key: "s:1", Val: "old", Deadline: hAt(15)},',
			'					{Op: OpSetTTL, Key: "s:1", Val: "tok", Deadline: hAt(30)},',
			'				}, hAt(10)))',
			'			}},',
			'		{"expired keys are dropped outright — compaction sweeps for free",',
			'			"[set b=2]",',
			'			func() string {',
			'				return hDumpRecs(Compact([]Record{',
			'					{Op: OpSetTTL, Key: "s:1", Val: "tok", Deadline: hAt(30)},',
			'					{Op: OpSet, Key: "b", Val: "2"},',
			'				}, hAt(60)))',
			'			}},',
			'		{"plain set after setttl: permanent again — compacts to set, not setttl",',
			'			"[set a=2]",',
			'			func() string {',
			'				return hDumpRecs(Compact([]Record{',
			'					{Op: OpSetTTL, Key: "a", Val: "1", Deadline: hAt(30)},',
			'					{Op: OpSet, Key: "a", Val: "2"},',
			'				}, hAt(60)))',
			'			}},',
			'		{"deterministic: scrambled write order, sorted key order out",',
			'			"[set a=1; set m=2; set z=3]",',
			'			func() string {',
			'				return hDumpRecs(Compact([]Record{',
			'					{Op: OpSet, Key: "z", Val: "3"},',
			'					{Op: OpSet, Key: "a", Val: "1"},',
			'					{Op: OpSet, Key: "m", Val: "2"},',
			'				}, hAt(0)))',
			'			}},',
			'		{"everything dead: the compacted log is empty",',
			'			"[]",',
			'			func() string {',
			'				return hDumpRecs(Compact([]Record{',
			'					{Op: OpSet, Key: "a", Val: "1"},',
			'					{Op: OpSetTTL, Key: "s", Val: "t", Deadline: hAt(5)},',
			'					{Op: OpDelete, Key: "a"},',
			'				}, hAt(99)))',
			'			}},',
			'		{"trigger: 40MB log, 8MB at last compaction, 32MB threshold — fire",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", ShouldCompact(40*hMB, 8*hMB, 32*hMB)) }},',
			'		{"trigger: 40MB but only grown from 30MB — NOT doubled, hold off",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", ShouldCompact(40*hMB, 30*hMB, 32*hMB)) }},',
			'		{"trigger: doubled (20MB from 5MB) but below the 32MB floor — hold off",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", ShouldCompact(20*hMB, 5*hMB, 32*hMB)) }},',
			'		{"trigger: exactly doubled at the boundary (64MB from 32MB) — fire",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", ShouldCompact(64*hMB, 32*hMB, 32*hMB)) }},',
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
			'// The record ops that appear in a compaction input.',
			'const (',
			'	OpSet    = byte(1)',
			'	OpDelete = byte(2)',
			'	OpSetTTL = byte(4) // Deadline = absolute expiry, unix nanos',
			')',
			'',
			'type Record struct {',
			'	Op       byte',
			'	Key      string',
			'	Val      string',
			'	Deadline int64 // OpSetTTL only',
			'}',
			'',
			'// Compact: replay, then emit the minimum. The two phases stay',
			'// strictly separate — state first, output second — because the',
			'// minimal form of a key depends on the WHOLE history (a setttl',
			'// followed by a plain set must come out as a set), so no single',
			'// record can be emitted until every record has been seen.',
			'func Compact(log []Record, now int64) []Record {',
			'	state := make(map[string]string)',
			'	ttl := make(map[string]int64)',
			'	for _, r := range log {',
			'		switch r.Op {',
			'		case OpSet:',
			'			state[r.Key] = r.Val',
			'			delete(ttl, r.Key) // plain set makes the key permanent',
			'		case OpDelete:',
			'			delete(state, r.Key)',
			'			delete(ttl, r.Key)',
			'		case OpSetTTL:',
			'			state[r.Key] = r.Val',
			'			ttl[r.Key] = r.Deadline',
			'		}',
			'	}',
			'	// Sorted key order makes the rewrite a pure function of the',
			'	// state: same data, same bytes. That determinism is what lets a',
			'	// crash-recovery test diff two independently compacted files —',
			'	// and it costs one sort.',
			'	keys := make([]string, 0, len(state))',
			'	for k := range state {',
			'		keys = append(keys, k)',
			'	}',
			'	sort.Strings(keys)',
			'	out := make([]Record, 0, len(keys))',
			'	for _, k := range keys {',
			'		if dl, has := ttl[k]; has {',
			'			// Expired at compaction time: emitting it would only',
			'			// resurrect a corpse for replay to re-bury — drop it.',
			'			// Compaction doubles as a free sweep.',
			'			if now >= dl {',
			'				continue',
			'			}',
			'			// The deadline is ABSOLUTE, so it moves to the new log',
			'			// unchanged — rewriting never extends a key\'s life.',
			'			out = append(out, Record{Op: OpSetTTL, Key: k, Val: state[k], Deadline: dl})',
			'			continue',
			'		}',
			'		out = append(out, Record{Op: OpSet, Key: k, Val: state[k]})',
			'	}',
			'	return out',
			'}',
			'',
			'// ShouldCompact: both terms must hold.',
			'//',
			'//   - size >= threshold: a floor — small logs replay fast; rewriting',
			'//     them buys nothing.',
			'//   - size >= 2*lastSize: growth — the log must have DOUBLED since',
			'//     the last rewrite. This is the self-tuning term: if the last',
			'//     compaction barely shrank the file (the live set really is',
			'//     that big), the next one waits until the file earns it, so a',
			'//     large stable dataset is not rewritten in a tight loop.',
			'//',
			'// lastSize is the compacted size right after the previous rewrite',
			'// (or the size at open); with lastSize 0 the growth term is',
			'// trivially true and the floor alone decides.',
			'func ShouldCompact(size, lastSize, threshold int64) bool {',
			'	return size >= threshold && size >= 2*lastSize',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What the real btypedb does</h3>' +
			'<p>The real <code>Compact</code> cannot pause the world to replay ' +
			'the log — writers are live. It leans on the machinery from the ' +
			'earlier items instead: take an <strong>O(1) COW snapshot</strong> of ' +
			'the tree (pausing writers only for that pointer grab), stream the ' +
			'snapshot’s live pairs into a <code>.compact</code> temp file — no ' +
			'replay needed, the tree <em>is</em> the final state — then briefly ' +
			'pause again to splice in the ops that committed during streaming, ' +
			'fsync the temp file, and <strong>atomically rename</strong> it over ' +
			'the log. Rename is the commit point: a crash on either side leaves ' +
			'one complete valid log, and a leftover <code>.compact</code> file is ' +
			'discarded on open. Batch headers vanish in the rewrite — the ' +
			'snapshot is one implicit atomic unit, which is why your input had ' +
			'none.</p>' +
			'<p>This path gets the same paranoid testing as recovery: a ' +
			'fault-injecting <em>filesystem</em> cuts power at every operation ' +
			'boundary of a compaction — including torn temp-file variants and ' +
			'writes racing the compaction into the spliced tail — and asserts ' +
			'every cut recovers exactly the acknowledged state. The rename trick ' +
			'only works if the temp file is fsynced <em>before</em> the rename ' +
			'and the directory <em>after</em> it; those two orderings are ' +
			'exactly what the harness exists to catch.</p>' +
			'<h3>Trade-offs</h3>' +
			'<p>Compaction is the rent log-structured storage pays: every live ' +
			'byte is eventually written at least twice (once in the log, again ' +
			'in each rewrite) — <em>write amplification</em> — in exchange for ' +
			'sequential-only writes and bounded replay time. LSM stores like ' +
			'RocksDB run this economy at industrial scale with leveled ' +
			'compactions; Redis’s AOF rewrite and Kafka’s log compaction are the ' +
			'same move under other names. btypedb’s single-file variant keeps it ' +
			'simple because the dataset fits in RAM: one snapshot, one temp ' +
			'file, one rename.</p>' +
			'<p>The doubling term deserves the last word, because it encodes a ' +
			'general principle: <strong>trigger maintenance on growth relative ' +
			'to the last maintenance, not on absolute size</strong>. A pure size ' +
			'trigger on a 33&nbsp;MB stable dataset would rewrite the file after ' +
			'every megabyte of churn — quadratic total I/O for nothing. Requiring ' +
			'a doubling amortizes: total compaction I/O stays proportional to ' +
			'total data written, the same argument that makes a growing slice’s ' +
			'append O(1) amortized. The <code>WithAutoCompact(8&lt;&lt;20, ' +
			'50)</code> knob is the same rule with a lower floor and a +50% ' +
			'growth requirement instead of +100%.</p>',
		],
		complexity: { time: 'O(n + live·log live) — one replay pass plus the key sort', space: 'O(live keys) for the folded state' },
	});
})();
