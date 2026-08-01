/* Persistence: RDB vs AOF — Server (Medium). The durability arithmetic every
 * operator does after their first data-loss incident: when do "save <secs>
 * <changes>" rules trigger a snapshot, what is the worst-case loss window
 * for a given write rate, what do the AOF appendfsync modes bound loss to,
 * and when does auto-AOF-rewrite fire. Pure decision functions, pinned.
 */
(function () {
	'use strict';
	var T = GoLearnRD;

	// The loss window: everything after the last durable point dies with
	// the process. Marker id namespaced (dgArrowRD09): SVG ids share the
	// page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="timeline from the last durable point to a crash: with RDB the loss window is everything since the last snapshot, up to the smallest firing save rule; with AOF everysec it is at most about two seconds of writes">' +
		'<text x="20" y="24" class="lbl">the only question that matters: how much sits between the last durable point and the crash?</text>' +
		'<line x1="30" y1="66" x2="530" y2="66" stroke="var(--edge)" stroke-width="2"/>' +
		'<line x1="80" y1="54" x2="80" y2="78" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="80" y="96" text-anchor="middle" class="lbl">last RDB snapshot</text>' +
		'<line x1="470" y1="54" x2="470" y2="78" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="470" y="96" text-anchor="middle" class="lbl" style="fill:var(--warn)">crash</text>' +
		'<path d="M 85 46 L 465 46" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowRD09)"/>' +
		'<text x="275" y="38" text-anchor="middle" class="lbl" style="fill:var(--warn)">RDB loss window: every write since the snapshot — up to the smallest firing save rule</text>' +
		'<line x1="30" y1="150" x2="530" y2="150" stroke="var(--edge)" stroke-width="2"/>' +
		'<line x1="410" y1="138" x2="410" y2="162" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="410" y="182" text-anchor="middle" class="lbl">last fsync (everysec)</text>' +
		'<line x1="470" y1="138" x2="470" y2="162" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="480" y="182" text-anchor="middle" class="lbl" style="fill:var(--warn)">crash</text>' +
		'<path d="M 414 128 L 466 128" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowRD09)"/>' +
		'<text x="300" y="122" text-anchor="middle" class="lbl">AOF everysec loss window: at most ~2s of writes, whatever the write rate</text>' +
		'<text x="20" y="206" class="lbl">same crash, wildly different blast radius — persistence config is just choosing this window</text>' +
		'<defs><marker id="dgArrowRD09" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'persistence-rdb-aof',
		title: 'Persistence: RDB vs AOF',
		nav: 'persistence rdb aof',
		difficulty: 'Medium',
		category: 'Server',
		task: 'Implement the persistence decision functions: RDB save-rule triggering, worst-case loss windows for RDB and each appendfsync mode, and the auto-AOF-rewrite trigger.',

		prose: [
			'<h2>Persistence: RDB vs AOF</h2>' +
			'<p>The cache box rebooted after a kernel panic and came back ' +
			'<em>empty enough to hurt</em>: forty minutes of writes gone. “But we ' +
			'have persistence on!” — you have <em>RDB</em> on, with the default ' +
			'rules, and the instance simply hadn’t hit a save point. This lesson ' +
			'is the arithmetic that turns persistence config into a number you can ' +
			'put in a postmortem: <strong>the worst-case data-loss window</strong>.</p>' +
			'<ul>' +
			'<li><strong>RDB snapshots.</strong> <code>save &lt;seconds&gt; ' +
			'&lt;changes&gt;</code> rules — the default trio is ' +
			'<code>save 3600 1</code>, <code>save 300 100</code>, ' +
			'<code>save 60 10000</code>. A snapshot is due when <em>any</em> rule ' +
			'is satisfied: at least <code>seconds</code> elapsed since the last ' +
			'save <em>and</em> at least <code>changes</code> writes since then. ' +
			'Everything after the last snapshot dies with the process.</li>' +
			'<li><strong>RDB worst case at a given write rate.</strong> Under a ' +
			'steady <code>w</code> writes/sec, rule <code>(s, c)</code> first ' +
			'fires at <code>max(s, ceil(c/w))</code> seconds — you need both the ' +
			'time <em>and</em> the changes. The loss window is the ' +
			'<em>minimum</em> of that over all rules (the first rule to fire ' +
			'snapshots for everyone); no rules configured means unbounded loss ' +
			'(return -1).</li>' +
			'<li><strong>AOF.</strong> Every write command is appended to a log ' +
			'and replayed on restart. The window shrinks to the fsync policy: ' +
			'<code>always</code> — fsync before acknowledging, loss ≈ 0ms (at ' +
			'~100x the latency cost); <code>everysec</code> — a background fsync ' +
			'each second, worst case <strong>~2000ms</strong> of writes (the ' +
			'documented bound: the current second’s buffer plus a delayed fsync ' +
			'in flight); <code>no</code> — the OS decides, conventionally bounded ' +
			'at <strong>~30000ms</strong> on default Linux dirty-page tuning.</li>' +
			'<li><strong>AOF rewrite.</strong> The log grows forever (1000 INCRs ' +
			'= 1000 lines for one counter), so Redis rewrites it from the live ' +
			'dataset when: <code>current ≥ auto-aof-rewrite-min-size</code> ' +
			'<em>and</em> growth since the last rewrite ≥ ' +
			'<code>auto-aof-rewrite-percentage</code>, where growth = ' +
			'<code>(current − base) × 100 / base</code>. A base of 0 (never ' +
			'rewritten) counts as due once past min-size.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the four decision functions — ' +
			'<code>SnapshotDue</code>, <code>WorstCaseRDBLossSecs</code>, ' +
			'<code>AOFLossWindowMillis</code>, <code>AOFRewriteDue</code> — ' +
			'exactly as specified above. Pure functions, integer arithmetic, no ' +
			'clocks: the harness feeds elapsed time and counters explicitly.</p>' +
			'<div class="tip">For <code>ceil(c/w)</code> in integers, use ' +
			'<code>(c + w - 1) / w</code> — and mind the rule order: a rule ' +
			'needs BOTH conditions, so a burst of 10k writes in second one still ' +
			'waits out <code>save 60 10000</code>’s clock.</div>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// SaveRule is one "save <seconds> <changes>" line from redis.conf.',
			'type SaveRule struct {',
			'	Seconds int64',
			'	Changes int64',
			'}',
			'',
			'// SnapshotDue reports whether ANY rule is satisfied: elapsed >=',
			'// rule.Seconds AND changes >= rule.Changes (both counted since the',
			'// last snapshot).',
			'func SnapshotDue(rules []SaveRule, elapsedSecs int64, changes int64) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// WorstCaseRDBLossSecs returns the worst-case loss window in',
			'// seconds under a steady writesPerSec rate: the minimum over rules',
			'// of max(rule.Seconds, ceil(rule.Changes/writesPerSec)). No rules',
			'// (or writesPerSec <= 0) means the window is unbounded: return -1.',
			'func WorstCaseRDBLossSecs(rules []SaveRule, writesPerSec int64) int64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// AOFLossWindowMillis maps an appendfsync policy to its worst-case',
			'// loss window: "always" -> 0, "everysec" -> 2000, "no" -> 30000.',
			'// Anything else errors with "ERR unknown appendfsync policy".',
			'func AOFLossWindowMillis(policy string) (int64, error) {',
			'	// your code here',
			'	return 0, errors.New("not implemented")',
			'}',
			'',
			'// AOFRewriteDue reports whether an automatic rewrite should start:',
			'// currentSize >= minSize AND growth-vs-base >= growthPct percent,',
			'// where growth = (currentSize-baseSize)*100/baseSize. baseSize 0',
			'// (never rewritten) counts as infinite growth: due once past',
			'// minSize.',
			'func AOFRewriteDue(currentSize, baseSize, minSize, growthPct int64) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
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
			'	// The stock redis.conf trio, used throughout.',
			'	defaults := []SaveRule{{3600, 1}, {300, 100}, {60, 10000}}',
			'	b := func(v bool) string { return fmt.Sprintf("%v", v) }',
			'	aof := func(policy string) string {',
			'		ms, err := AOFLossWindowMillis(policy)',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return fmt.Sprintf("%d", ms)',
			'	}',
			'	cases := []tc{',
			'		{"5 min + 100 changes: save 300 100 fires", "true",',
			'			func() string { return b(SnapshotDue(defaults, 300, 100)) }},',
			'		{"5 min + 99 changes: no rule has BOTH conditions", "false",',
			'			func() string { return b(SnapshotDue(defaults, 300, 99)) }},',
			'		{"a 10k-write burst at t=59s still waits for save 60 10000\'s clock", "false",',
			'			func() string { return b(SnapshotDue(defaults, 59, 10000)) }},',
			'		{"...and fires one second later", "true",',
			'			func() string { return b(SnapshotDue(defaults, 60, 10000)) }},',
			'		{"the 40-minute incident: 1 write then idle — only save 3600 1 can fire", "false",',
			'			func() string { return b(SnapshotDue(defaults, 2400, 1)) }},',
			'		{"no save rules: snapshots never trigger", "false",',
			'			func() string { return b(SnapshotDue([]SaveRule{}, 999999, 999999)) }},',
			'		{"worst case at 200 writes/sec: save 60 10000 -> max(60, 50) = 60s", "60",',
			'			func() string { return fmt.Sprintf("%d", WorstCaseRDBLossSecs(defaults, 200)) }},',
			'		{"worst case at 10 writes/sec: min rule is save 300 100 -> 300s", "300",',
			'			func() string { return fmt.Sprintf("%d", WorstCaseRDBLossSecs(defaults, 10)) }},',
			'		{"worst case at 1 write per ~17 min modeled as 1/sec: 300s (100 changes in 100s, clock 300)", "300",',
			'			func() string { return fmt.Sprintf("%d", WorstCaseRDBLossSecs(defaults, 1)) }},',
			'		{"ceil, not floor: 3 writes/sec needs 3334s for 10000 changes -> that rule gives max(60,3334)", "300",',
			'			func() string { return fmt.Sprintf("%d", WorstCaseRDBLossSecs(defaults, 3)) }},',
			'		{"no rules: unbounded window", "-1",',
			'			func() string { return fmt.Sprintf("%d", WorstCaseRDBLossSecs([]SaveRule{}, 100)) }},',
			'		{"appendfsync always: zero-window durability", "0",',
			'			func() string { return aof("always") }},',
			'		{"appendfsync everysec: the documented ~2s bound", "2000",',
			'			func() string { return aof("everysec") }},',
			'		{"appendfsync no: the OS\'s ~30s dirty-page window", "30000",',
			'			func() string { return aof("no") }},',
			'		{"unknown policy errors", "error: ERR unknown appendfsync policy",',
			'			func() string { return aof("everymsec") }},',
			'		{"rewrite: 128MB current, 60MB base, min 64MB, 100%: grew 113% — due", "true",',
			'			func() string { return b(AOFRewriteDue(128<<20, 60<<20, 64<<20, 100)) }},',
			'		{"rewrite: 100MB current, 60MB base: 66% growth < 100% — not due", "false",',
			'			func() string { return b(AOFRewriteDue(100<<20, 60<<20, 64<<20, 100)) }},',
			'		{"rewrite: tiny AOF below min-size never rewrites, whatever the growth", "false",',
			'			func() string { return b(AOFRewriteDue(32<<20, 1<<20, 64<<20, 100)) }},',
			'		{"rewrite: base 0 (never rewritten) is due once past min-size", "true",',
			'			func() string { return b(AOFRewriteDue(64<<20, 0, 64<<20, 100)) }},',
			'		{"rewrite: exactly at the growth threshold counts (>=)", "true",',
			'			func() string { return b(AOFRewriteDue(120<<20, 60<<20, 64<<20, 100)) }},',
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
			'import "errors"',
			'',
			'// The solution replaces the starter wholesale, so the type is',
			'// redeclared here.',
			'type SaveRule struct {',
			'	Seconds int64',
			'	Changes int64',
			'}',
			'',
			'// SnapshotDue: rules are OR\'d, conditions within a rule are AND\'d.',
			'// This mirrors serverCron\'s loop over server.saveparams: the first',
			'// satisfied rule triggers rdbSaveBackground and resets both the',
			'// dirty counter and the clock for ALL rules.',
			'func SnapshotDue(rules []SaveRule, elapsedSecs int64, changes int64) bool {',
			'	for _, rule := range rules {',
			'		if elapsedSecs >= rule.Seconds && changes >= rule.Changes {',
			'			return true',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
			'func WorstCaseRDBLossSecs(rules []SaveRule, writesPerSec int64) int64 {',
			'	if len(rules) == 0 || writesPerSec <= 0 {',
			'		// No rule can ever fire: the window is the process uptime.',
			'		return -1',
			'	}',
			'	best := int64(-1)',
			'	for _, rule := range rules {',
			'		// A rule fires when BOTH its clock and its change count are',
			'		// satisfied. At w writes/sec the change count needs',
			'		// ceil(c/w) seconds — integer ceil via (c + w - 1) / w —',
			'		// so first firing is the max of the two waits.',
			'		changeSecs := (rule.Changes + writesPerSec - 1) / writesPerSec',
			'		fireAt := rule.Seconds',
			'		if changeSecs > fireAt {',
			'			fireAt = changeSecs',
			'		}',
			'		// The min across rules: whichever rule fires first snapshots',
			'		// the whole dataset, capping the loss window for everyone.',
			'		if best == -1 || fireAt < best {',
			'			best = fireAt',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
			'func AOFLossWindowMillis(policy string) (int64, error) {',
			'	// The three policies are a latency/durability dial, not a',
			'	// correctness choice — each maps to a bounded window:',
			'	//   always   fsync in the command path; nothing unsynced at ack',
			'	//   everysec buffer + 1Hz background fsync; documented worst',
			'	//            case ~2s (this second\'s buffer + one in flight)',
			'	//   no       whenever the kernel flushes; ~30s conventional',
			'	//            bound under default vm.dirty_* tuning',
			'	if policy == "always" {',
			'		return 0, nil',
			'	}',
			'	if policy == "everysec" {',
			'		return 2000, nil',
			'	}',
			'	if policy == "no" {',
			'		return 30000, nil',
			'	}',
			'	return 0, errors.New("ERR unknown appendfsync policy")',
			'}',
			'',
			'func AOFRewriteDue(currentSize, baseSize, minSize, growthPct int64) bool {',
			'	// min-size is a floor gate, not a growth term: a 4MB AOF that',
			'	// grew 500% is still not worth forking a rewrite for.',
			'	if currentSize < minSize {',
			'		return false',
			'	}',
			'	// base 0 means "never rewritten": any size counts as infinite',
			'	// growth. (Redis substitutes base=1 for the division; same',
			'	// outcome, this reads clearer.)',
			'	if baseSize == 0 {',
			'		return true',
			'	}',
			'	growth := (currentSize - baseSize) * 100 / baseSize',
			'	return growth >= growthPct',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>How the snapshot actually happens: fork + COW</h3>' +
			'<p>When a save rule fires, Redis does not stop to write the file — ' +
			'it <code>fork()</code>s. The child sees a frozen copy-on-write image ' +
			'of the whole dataset and serializes it to a temp file at leisure; the ' +
			'parent keeps serving. The costs hide in the COW: every page the ' +
			'parent <em>writes</em> during the snapshot gets physically copied, so ' +
			'a write-heavy instance can balloon toward 2x memory mid-save — the ' +
			'reason <code>maxmemory</code> is usually set at ~50–60% of the box, ' +
			'and the reason the fork itself (page-table copy) causes a latency ' +
			'blip proportional to dataset size. AOF rewrite uses the identical ' +
			'fork trick, writing a minimal command stream from the live data ' +
			'while the parent buffers new writes to splice on at the end.</p>' +
			'<h3>Why RDB survives despite the window</h3>' +
			'<p>An RDB file is a compact binary snapshot: single file, fast to ' +
			'load (no command replay), perfect for backups and for replicas doing ' +
			'a full sync — that is why replication uses RDB under the hood even if ' +
			'you never enable saving. AOF is the opposite trade: bigger, slower to ' +
			'load, but with a bounded window. Production reality is usually ' +
			'<strong>both</strong>: AOF (everysec) for durability, RDB for ' +
			'backups/restores — and since Redis 7, the AOF is itself a manifest ' +
			'of an RDB base plus incremental segments, making the rewrite dance ' +
			'cheaper. On restart Redis prefers the AOF, it being the more ' +
			'complete story.</p>' +
			'<h3>The everysec fine print</h3>' +
			'<p>Why 2000ms and not 1000ms? The fsync runs in a background thread. ' +
			'If a previous fsync is still in flight (slow disk), Redis buffers up ' +
			'to another two seconds before it starts <em>blocking writes</em> ' +
			'rather than growing the buffer unboundedly — so the documented worst ' +
			'case is the current second plus the delayed sync. This is also the ' +
			'mechanism behind the infamous ' +
			'<code>Asynchronous AOF fsync is taking too long</code> log line: ' +
			'your disk, not Redis, is the bottleneck, and latency-sensitive ' +
			'setups feel it as periodic write stalls. <code>appendfsync ' +
			'always</code> pays that disk cost on every command instead — ' +
			'measure before choosing it; the throughput drop is typically ' +
			'10–100x.</p>' +
			'<h3>Reading your own config</h3>' +
			'<p>The numbers in this harness are the actual defaults: ' +
			'<code>save 3600 1 300 100 60 10000</code>, ' +
			'<code>auto-aof-rewrite-percentage 100</code>, ' +
			'<code>auto-aof-rewrite-min-size 64mb</code>. The postmortem math for ' +
			'the prose incident: one write then idle means only ' +
			'<code>save 3600 1</code> can ever fire, so the window was a full ' +
			'hour — the box crashed 40 minutes in, well inside it. ' +
			'<code>LASTSAVE</code> tells you the last durable point; ' +
			'<code>INFO persistence</code> shows <code>rdb_changes_since_last_save</code> ' +
			'— multiply by your write value to know, right now, how much an ' +
			'unplanned reboot would cost.</p>',
		],
		complexity: { time: 'O(rules) per decision — these run in serverCron every 100ms in real Redis, so they must be trivial', space: 'O(1)' },
	});
})();
