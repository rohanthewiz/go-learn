/* LSM Memtable & Runs — Storage Engines (Hard). A miniature log-structured
 * merge tree: the write path of RocksDB, LevelDB, and Cassandra. Op-script
 * harness: each case drives Set/Del/Get/Compact and compares a rendered
 * trace of gets and run snapshots — all output is sorted, so it is exact.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="LSM tree: memtable above stacked sorted runs; a Get probes newest to oldest and stops at the first version found, including tombstones">' +
		'<text x="15" y="18" class="lbl">writes buffer in RAM; a full memtable freezes into a sorted run (newest first)</text>' +
		// memtable + runs
		'<rect x="15" y="30" width="210" height="32" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.8"/>' +
		'<text x="120" y="51" text-anchor="middle">memtable: b=9</text>' +
		'<path d="M 52 62 L 52 86" fill="none" stroke="var(--dim)" stroke-width="1.4" marker-end="url(#dgArrowLSM)"/>' +
		'<text x="62" y="79" class="lbl">flush: sort + freeze</text>' +
		'<rect x="15" y="88" width="210" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="120" y="108" text-anchor="middle">run 0 (newest): a=⊗, c=3</text>' +
		'<rect x="15" y="130" width="210" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="120" y="150" text-anchor="middle">run 1 (oldest): a=1, b=2</text>' +
		'<text x="15" y="184" class="lbl">⊗ = tombstone (__TOMB__) — deletes are writes too</text>' +
		// Get(a) probe, newest wins
		'<text x="316" y="30" class="lbl">Get(a): newest version wins</text>' +
		'<path d="M 310 46 L 229 46" fill="none" stroke="var(--dim)" stroke-width="1.4" marker-end="url(#dgArrowLSM)"/>' +
		'<text x="318" y="50" class="lbl">① memtable — miss</text>' +
		'<path d="M 310 103 L 229 103" fill="none" stroke="var(--dim)" stroke-width="1.4" marker-end="url(#dgArrowLSM)"/>' +
		'<text x="318" y="107" class="lbl">② tombstone → deleted, stop</text>' +
		'<path d="M 310 145 L 229 145" fill="none" stroke="var(--err-edge)" stroke-width="1.2" stroke-dasharray="4 3"/>' +
		'<text x="318" y="149" class="lbl">③ old a=1 is never seen</text>' +
		'<defs><marker id="dgArrowLSM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'lsm-memtable',
		title: 'LSM Tree: Memtable & Sorted Runs',
		nav: 'LSM Memtable',
		difficulty: 'Hard',
		category: 'Storage Engines',
		task: 'Implement Set/Del/Get/Compact/Runs for a miniature LSM tree — make all 6 tests pass.',

		prose: [
			'<h2>LSM Tree: Memtable &amp; Sorted Runs</h2>' +
			'<p>Update-in-place storage (a B-tree) pays a random disk write per update. ' +
			'A <em>log-structured merge tree</em> refuses to update anything in place: ' +
			'writes buffer in an in-memory <strong>memtable</strong>; when it fills, it is ' +
			'sorted and frozen into an immutable <strong>run</strong>. Reads consult the ' +
			'newest data first, and background <strong>compaction</strong> merges runs to ' +
			'keep reads cheap.</p>' +
			DIAGRAM +
			'<p>Build the miniature version. <code>runs[0]</code> is always the ' +
			'<em>newest</em> run. Deletes cannot touch immutable runs, so <code>Del</code> ' +
			'writes the tombstone value <code>tomb = "__TOMB__"</code> — a write like any ' +
			'other, shadowing older versions until compaction drops the key for real.</p>' +
			'<ul>' +
			'<li><code>Set(k, v)</code> / <code>Del(k)</code> — write into <code>mem</code> ' +
			'(<code>Del</code> writes <code>tomb</code>). When <code>len(mem)</code> reaches ' +
			'<code>flushAt</code>, flush: sort the keys, prepend the entries as a new run at ' +
			'the front of <code>runs</code>, reset <code>mem</code>.</li>' +
			'<li><code>Get(k)</code> — check <code>mem</code> first, then runs newest→oldest. ' +
			'The first version found wins; a tombstone means <code>("", false)</code> — stop ' +
			'searching.</li>' +
			'<li><code>Compact()</code> — merge all runs into one: newest value per key wins, ' +
			'drop keys whose winning value is the tombstone, output sorted by key. ' +
			'(<code>mem</code> is untouched; if nothing survives, runs becomes empty.)</li>' +
			'<li><code>Runs()</code> — render each run, newest first, as ' +
			'<code>"k1=v1,k2=v2"</code> (tombstones render as <code>k=__TOMB__</code>). The ' +
			'harness inspects the tree through this.</li>' +
			'</ul>',
		],

		starter: [
			'package main',
			'',
			'// tomb is the tombstone value: a delete is recorded as a write of',
			'// this marker, because flushed runs are immutable and older runs',
			'// may still hold the key.',
			'const tomb = "__TOMB__"',
			'',
			'// kv is one key/value pair inside a sorted, immutable run.',
			'type kv struct {',
			'	K, V string',
			'}',
			'',
			'// LSM is a miniature log-structured merge tree: recent writes buffer',
			'// in the memtable; at flushAt entries it freezes into a sorted run.',
			'// runs[0] is the NEWEST run — reads scan front to back.',
			'type LSM struct {',
			'	flushAt int',
			'	mem     map[string]string',
			'	runs    [][]kv',
			'}',
			'',
			'func NewLSM(flushAt int) *LSM {',
			'	return &LSM{flushAt: flushAt, mem: map[string]string{}}',
			'}',
			'',
			'// Set records k=v in the memtable, flushing to a new run when the',
			'// memtable reaches flushAt entries (sorted by key, prepended to runs).',
			'func (t *LSM) Set(k, v string) {',
			'	// your code here (hint: sort.Strings for the flush)',
			'}',
			'',
			'// Del records a tombstone for k — a write like any other, so it too',
			'// can trigger a flush.',
			'func (t *LSM) Del(k string) {',
			'	// your code here',
			'}',
			'',
			'// Get checks the memtable first, then runs newest→oldest; the first',
			'// version found wins. A tombstone means deleted: return ("", false)',
			'// and stop searching.',
			'func (t *LSM) Get(k string) (string, bool) {',
			'	return "__todo__", false // your code here',
			'}',
			'',
			'// Compact merges all runs into one: newest value per key wins, keys',
			'// whose winning value is the tombstone are dropped, output sorted.',
			'func (t *LSM) Compact() {',
			'	// your code here',
			'}',
			'',
			'// Runs renders each run (newest first) as "k1=v1,k2=v2" — the',
			'// harness inspects the tree through this.',
			'func (t *LSM) Runs() []string {',
			'	return []string{"__todo__"} // your code here',
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
			SD.HARNESS_RT,
			'',
			'func main() {',
			'	// Each step drives one call; "get" and "runs" append to the trace,',
			'	// so a case compares the full observable history, not one value.',
			'	type step struct {',
			'		op   string // "set" | "del" | "get" | "runs" | "compact"',
			'		k, v string',
			'	}',
			'	type tc struct {',
			'		name    string',
			'		flushAt int',
			'		script  []step',
			'		want    string',
			'	}',
			'	cases := []tc{',
			'		{"below threshold: flushAt=3, two sets stay in mem", 3,',
			'			[]step{{"set", "a", "1"}, {"set", "b", "2"}, {"get", "a", ""}, {"get", "z", ""}, {"runs", "", ""}},',
			'			`get(a)=("1",true) ; get(z)=("",false) ; runs[]`},',
			'		{"flush at threshold: third write freezes a SORTED run", 3,',
			'			[]step{{"set", "c", "3"}, {"set", "a", "1"}, {"set", "b", "2"}, {"runs", "", ""}, {"get", "a", ""}},',
			'			`runs[a=1,b=2,c=3] ; get(a)=("1",true)`},',
			'		{"newest run wins: a rewritten after a flush shadows the old a", 2,',
			'			[]step{{"set", "a", "1"}, {"set", "b", "2"}, {"set", "a", "9"}, {"set", "c", "3"}, {"runs", "", ""}, {"get", "a", ""}, {"get", "b", ""}},',
			'			`runs[a=9,c=3 | a=1,b=2] ; get(a)=("9",true) ; get(b)=("2",true)`},',
			'		{"tombstone hides an older value (in mem, then flushed)", 2,',
			'			[]step{{"set", "a", "1"}, {"set", "b", "2"}, {"del", "a", ""}, {"get", "a", ""}, {"set", "c", "3"}, {"runs", "", ""}, {"get", "a", ""}, {"get", "b", ""}},',
			'			`get(a)=("",false) ; runs[a=__TOMB__,c=3 | a=1,b=2] ; get(a)=("",false) ; get(b)=("2",true)`},',
			'		{"compaction drops tombstones and shadowed values", 2,',
			'			[]step{{"set", "a", "1"}, {"set", "b", "2"}, {"del", "a", ""}, {"set", "c", "3"}, {"compact", "", ""}, {"runs", "", ""}, {"get", "a", ""}, {"get", "b", ""}, {"get", "c", ""}},',
			'			`runs[b=2,c=3] ; get(a)=("",false) ; get(b)=("2",true) ; get(c)=("3",true)`},',
			'		{"after compaction: mem overlays the merged run, next flush prepends", 2,',
			'			[]step{{"set", "a", "1"}, {"set", "b", "2"}, {"del", "a", ""}, {"set", "c", "3"}, {"compact", "", ""}, {"set", "b", "9"}, {"get", "b", ""}, {"runs", "", ""}, {"set", "d", "4"}, {"runs", "", ""}},',
			'			`get(b)=("9",true) ; runs[b=2,c=3] ; runs[b=9,d=4 | b=2,c=3]`},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  c.want,',
			'		}',
			'		runCase(r, func() {',
			'			db := NewLSM(c.flushAt)',
			'			trace := []string{}',
			'			for _, s := range c.script {',
			'				switch s.op {',
			'				case "set":',
			'					db.Set(s.k, s.v)',
			'				case "del":',
			'					db.Del(s.k)',
			'				case "compact":',
			'					db.Compact()',
			'				case "get":',
			'					v, ok := db.Get(s.k)',
			'					trace = append(trace, fmt.Sprintf("get(%s)=(%q,%v)", s.k, v, ok))',
			'				case "runs":',
			'					trace = append(trace, "runs["+strings.Join(db.Runs(), " | ")+"]")',
			'				}',
			'			}',
			'			got := strings.Join(trace, " ; ")',
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
			'// tomb is the tombstone value: a delete is recorded as a write of',
			'// this marker, because flushed runs are immutable and older runs',
			'// may still hold the key.',
			'const tomb = "__TOMB__"',
			'',
			'// kv is one key/value pair inside a sorted, immutable run.',
			'type kv struct {',
			'	K, V string',
			'}',
			'',
			'// LSM is a miniature log-structured merge tree. The core bargain:',
			'// every byte hits disk via sorted, sequential, immutable runs (fast',
			'// writes), and reads pay for it by consulting several places (read',
			'// amplification) until compaction merges the runs back down.',
			'type LSM struct {',
			'	flushAt int',
			'	mem     map[string]string',
			'	runs    [][]kv // runs[0] is the NEWEST run — reads scan front to back',
			'}',
			'',
			'func NewLSM(flushAt int) *LSM {',
			'	return &LSM{flushAt: flushAt, mem: map[string]string{}}',
			'}',
			'',
			'// Set records k=v in the memtable. Both write paths funnel through',
			'// the same flush check, so Set and Del cannot drift apart.',
			'func (t *LSM) Set(k, v string) {',
			'	t.mem[k] = v',
			'	t.maybeFlush()',
			'}',
			'',
			'// Del records a tombstone rather than erasing: the key may live on',
			'// in older immutable runs, and an LSM never edits those. The',
			'// tombstone shadows them until Compact physically drops the key.',
			'func (t *LSM) Del(k string) {',
			'	t.mem[k] = tomb',
			'	t.maybeFlush()',
			'}',
			'',
			'// maybeFlush freezes the memtable into a sorted run once it reaches',
			'// the threshold. Sorting at flush time is the whole point of the',
			'// memtable: RAM absorbs random-order writes, disk receives one',
			'// sorted sequential blob. Prepending keeps runs newest-first, which',
			'// is exactly the order reads must probe.',
			'func (t *LSM) maybeFlush() {',
			'	if len(t.mem) < t.flushAt {',
			'		return',
			'	}',
			'	keys := make([]string, 0, len(t.mem))',
			'	for k := range t.mem {',
			'		keys = append(keys, k)',
			'	}',
			'	sort.Strings(keys)',
			'	run := make([]kv, 0, len(keys))',
			'	for _, k := range keys {',
			'		run = append(run, kv{K: k, V: t.mem[k]})',
			'	}',
			'	t.runs = append([][]kv{run}, t.runs...)',
			'	t.mem = map[string]string{} // fresh memtable; the old one is now immutable',
			'}',
			'',
			'// Get probes newest to oldest: memtable, then runs[0], runs[1], ...',
			'// The FIRST version found is authoritative — including tombstones,',
			'// which mean "deleted, stop": falling through to an older run would',
			'// resurrect a deleted key.',
			'func (t *LSM) Get(k string) (string, bool) {',
			'	if v, ok := t.mem[k]; ok {',
			'		if v == tomb {',
			'			return "", false',
			'		}',
			'		return v, true',
			'	}',
			'	for _, run := range t.runs {',
			'		// Linear scan for clarity; runs are sorted, so a real engine',
			'		// binary-searches — and asks a bloom filter first, skipping',
			'		// most runs without touching them at all.',
			'		for _, e := range run {',
			'			if e.K == k {',
			'				if e.V == tomb {',
			'					return "", false',
			'				}',
			'				return e.V, true',
			'			}',
			'		}',
			'	}',
			'	return "", false',
			'}',
			'',
			'// Compact merges every run into one. Walking runs oldest→newest and',
			'// overwriting in a map is the simplest correct "newest wins"; only',
			'// after the winner is known can tombstones be dropped — dropping a',
			'// tombstone early would un-delete whatever it was shadowing.',
			'func (t *LSM) Compact() {',
			'	if len(t.runs) == 0 {',
			'		return',
			'	}',
			'	winner := map[string]string{}',
			'	for i := len(t.runs) - 1; i >= 0; i-- {',
			'		for _, e := range t.runs[i] {',
			'			winner[e.K] = e.V',
			'		}',
			'	}',
			'	keys := make([]string, 0, len(winner))',
			'	for k := range winner {',
			'		if winner[k] != tomb { // the delete finally becomes physical',
			'			keys = append(keys, k)',
			'		}',
			'	}',
			'	sort.Strings(keys)',
			'	if len(keys) == 0 {',
			'		t.runs = nil // everything was deleted; no empty run to keep',
			'		return',
			'	}',
			'	merged := make([]kv, 0, len(keys))',
			'	for _, k := range keys {',
			'		merged = append(merged, kv{K: k, V: winner[k]})',
			'	}',
			'	t.runs = [][]kv{merged}',
			'}',
			'',
			'// Runs renders each run (newest first) as "k1=v1,k2=v2" for',
			'// inspection. Runs are stored sorted, so output is deterministic.',
			'func (t *LSM) Runs() []string {',
			'	out := make([]string, 0, len(t.runs))',
			'	for _, run := range t.runs {',
			'		s := ""',
			'		for i, e := range run {',
			'			if i > 0 {',
			'				s += ","',
			'			}',
			'			s += e.K + "=" + e.V',
			'		}',
			'		out = append(out, s)',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Turning random writes into sequential IO</h3>' +
			'<p>The brute-force storage engine updates records in place — every write is ' +
			'a seek. The <strong>log-structured merge tree</strong> takes the opposite bet: ' +
			'never edit anything. Writes land in a RAM map (O(1), absorbs any order); a ' +
			'full memtable is sorted once and written as one sequential blob. Even ' +
			'deletes become writes — a tombstone — because the old value sits in an ' +
			'immutable file no one will reopen.</p>',
			{ code: '// the read path IS the data model: newest version wins\nif v, ok := t.mem[k]; ok { ... }      // 1. memtable\nfor _, run := range t.runs { ... }    // 2. runs, newest → oldest\n// tombstone anywhere along the way = deleted, STOP' },
			'<h3>The price: read amplification</h3>' +
			'<p>A miss now probes the memtable and every run — that is read ' +
			'amplification, and real engines attack it from two sides. A ' +
			'<em>bloom filter</em> per run (see the bloom-filter problem in this track) ' +
			'answers “definitely not here” without touching the run, turning most probes ' +
			'into no-ops. And <em>compaction</em> merges runs down: newest value per key ' +
			'wins, tombstones finally delete for real, shadowed versions and their disk ' +
			'space vanish. Compaction is also why tombstones must survive until the merge ' +
			'— drop one early and the older value it was hiding comes back from the ' +
			'dead.</p>' +
			'<h3>Where you have already met this</h3>' +
			'<p>LevelDB and RocksDB are exactly this design (with leveled compaction and ' +
			'a WAL in front of the memtable — see the write-ahead-log problem — so a ' +
			'crash cannot lose the RAM buffer). Cassandra and HBase call the runs ' +
			'SSTables; Lucene’s immutable segments and merge policy are the same idea ' +
			'applied to search indexes. Whenever write throughput matters more than ' +
			'point-read latency, some LSM variant is usually underneath.</p>',
		],
		complexity: { time: 'Set/Del O(1) amortized (flush O(m log m)); Get O(runs · runLen) here, O(log) with real indexes', space: 'O(n) across mem + runs' },
	});
})();
