/* Resource Limits — Running Containers (Medium). docker run's --memory and
 * --cpus flags are a thin UI over cgroup files: --memory=512m becomes an
 * integer byte count in memory.max, --cpus=1.5 becomes the CFS bandwidth
 * pair "150000 100000" in cpu.max. The learner implements the three
 * translations docker performs: size-string parsing (binary multipliers),
 * cpus → quota/period (exact decimal math, no floats), and the OOM-kill
 * predicate (usage >= limit, with limit 0 meaning unlimited).
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// Flags on the left, cgroup v2 files on the right: docker only writes
	// numbers into files — the kernel does all the enforcing. Marker id
	// namespaced (dgArrowDKRL) because every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 208" width="520" height="208" role="img" aria-label="docker run flags translate into cgroup v2 files: --memory becomes a byte count in memory.max, --cpus becomes a quota/period pair in cpu.max, --cpu-shares becomes a relative cpu.weight">' +
		'<text x="20" y="24" class="lbl">docker run flags are a thin UI over cgroup files — the kernel enforces, docker just writes</text>' +
		// the flags a user types
		'<rect x="20" y="44" width="172" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="106" y="64" text-anchor="middle">--memory=512m</text>' +
		'<rect x="20" y="90" width="172" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="106" y="110" text-anchor="middle">--cpus=1.5</text>' +
		'<rect x="20" y="136" width="172" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="106" y="156" text-anchor="middle">--cpu-shares=512</text>' +
		// the cgroup v2 files they become
		'<rect x="310" y="38" width="192" height="42" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="406" y="56" text-anchor="middle">memory.max</text>' +
		'<text x="406" y="73" text-anchor="middle" class="lbl">536870912 — hard cap, OOM kill</text>' +
		'<rect x="310" y="84" width="192" height="42" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="406" y="102" text-anchor="middle">cpu.max</text>' +
		'<text x="406" y="119" text-anchor="middle" class="lbl">150000 100000 — quota / period µs</text>' +
		'<rect x="310" y="130" width="192" height="42" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="406" y="148" text-anchor="middle">cpu.weight</text>' +
		'<text x="406" y="165" text-anchor="middle" class="lbl">relative — only under contention</text>' +
		// translation arrows
		'<path d="M 196 59 L 306 59" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKRL)"/>' +
		'<path d="M 196 105 L 306 105" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKRL)"/>' +
		'<path d="M 196 151 L 306 151" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKRL)"/>' +
		'<text x="251" y="50" text-anchor="middle" class="lbl">×1024ⁿ</text>' +
		'<text x="251" y="96" text-anchor="middle" class="lbl">×100000</text>' +
		'<text x="20" y="198" class="lbl">hard caps (warn) kill or throttle; the weight (ok) only matters when cores are contended</text>' +
		'<defs><marker id="dgArrowDKRL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'resource-limits',
		title: 'Resource Limits: what --memory and --cpus become',
		nav: 'resource limits',
		difficulty: 'Medium',
		category: 'Running Containers',
		task: 'Implement ParseBytes (binary k/m/g suffixes), CPUQuota (--cpus -> CFS quota/period, exact decimal math), and OOMKilled (usage >= limit; limit 0 = unlimited).',

		prose: [
			'<h2>Resource Limits: what <code>--memory</code> and <code>--cpus</code> become</h2>' +
			'<p>The service dies at 3am with nothing in its own logs — the last line ' +
			'just stops mid-request. <code>docker ps -a</code> says ' +
			'<code>Exited (137)</code>, and <code>docker inspect</code> shows ' +
			'<code>"OOMKilled": true</code>. 137 is 128&nbsp;+&nbsp;9: the kernel sent ' +
			'<code>SIGKILL</code>, which no process gets to log. The host has 60&nbsp;GB ' +
			'free — irrelevant, because someone started the container with ' +
			'<code>--memory=512m</code>, and that flag is not advice. It is a number ' +
			'docker wrote into a cgroup file, and the kernel enforces files, not ' +
			'intentions:</p>' +
			'<ul>' +
			'<li><strong>Sizes are binary.</strong> Docker\'s RAM convention treats ' +
			'<code>k/m/g</code> as 1024-based: <code>512m</code> is 512&nbsp;×&nbsp;1024² ' +
			'=&nbsp;536870912 bytes, the exact integer written to ' +
			'<code>memory.max</code>. Suffixes <code>b/k/m/g</code> are ' +
			'case-insensitive; a bare number is already bytes.</li>' +
			'<li><strong><code>--cpus</code> is bandwidth, not cores.</strong> The CFS ' +
			'scheduler enforces a <em>quota</em> of CPU-microseconds per ' +
			'<em>period</em> of wall-clock microseconds. Docker fixes the period at ' +
			'100000&nbsp;µs (100&nbsp;ms) and sets ' +
			'<code>quota&nbsp;=&nbsp;cpus&nbsp;×&nbsp;100000</code>: ' +
			'<code>--cpus=1.5</code> means 150&nbsp;ms of CPU time per 100&nbsp;ms of ' +
			'wall time, spendable on any cores. Burn the quota early and the whole ' +
			'container is frozen — <em>throttled</em> — until the next period.</li>' +
			'<li><strong>The memory limit is a kill line.</strong> When the cgroup\'s ' +
			'charged usage reaches the limit and nothing more can be reclaimed, the ' +
			'OOM killer fires inside the cgroup. Reaching the limit IS the ' +
			'violation: usage&nbsp;≥&nbsp;limit kills. A limit of 0 means no limit was ' +
			'set — unlimited, never cgroup-OOM-killed.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the three translations docker performs before it ever talks ' +
			'to the kernel. <code>ParseBytes(s)</code> turns <code>"512m"</code>, ' +
			'<code>"2g"</code>, <code>"1024k"</code>, or a bare byte count into an ' +
			'<code>int64</code>, returning an error string for anything malformed. ' +
			'<code>CPUQuota(cpus)</code> turns <code>"1.5"</code> into the pair ' +
			'<code>(150000, 100000)</code> — parse the decimal <em>exactly</em>, ' +
			'without floats: split on the dot and scale the fraction by its digit ' +
			'count. <code>OOMKilled(usage, limit)</code> is the kill predicate.</p>',
			{ lang: 'txt', code: '$ docker run --memory=512m --cpus=1.5 img\n#   memory.max  <- 536870912          (512 * 1024 * 1024)\n#   cpu.max     <- "150000 100000"    (quota µs, period µs)\n$ docker inspect dead_ctr --format \'{{.State.ExitCode}} {{.State.OOMKilled}}\'\n137 true                              # 128 + SIGKILL(9): nothing gets to log' },
			'<div class="tip">The two limits fail in opposite styles. Memory fails ' +
			'<em>loudly</em>: exit 137, <code>OOMKilled: true</code>. CPU fails ' +
			'<em>silently</em>: latency spikes while the CPU% graph looks low — the ' +
			'container isn\'t slow, it\'s <em>frozen</em> for the tail of each ' +
			'100&nbsp;ms period. The tell is <code>nr_throttled</code> climbing in ' +
			'the cgroup\'s <code>cpu.stat</code>, a counter almost nobody graphs ' +
			'until the week they learn this.</div>',
		],

		starter: [
			'package main',
			'',
			'// ParseBytes converts a docker-style memory size — "512m", "2g",',
			'// "1024k", or a bare byte count like "100000000" — into bytes.',
			'//',
			'//   - suffixes b/k/m/g are accepted, case-insensitive',
			'//   - multipliers are BINARY (1024-based): docker\'s RAM convention,',
			'//     so "512m" = 512 * 1024 * 1024 = 536870912',
			'//   - no suffix means the number is already bytes',
			'//   - the number part is a plain non-negative integer',
			'//',
			'// Malformed input (bad suffix, no digits, negative) returns 0 and a',
			'// non-empty error string: invalid size "<input>".',
			'func ParseBytes(s string) (int64, string) {',
			'	// your code here',
			'	return 0, ""',
			'}',
			'',
			'// CPUQuota translates docker\'s --cpus flag into the CFS bandwidth',
			'// pair the kernel enforces: (quota, period) in microseconds, period',
			'// fixed at docker\'s default 100000µs (100ms). "1.5" -> (150000,',
			'// 100000): 150ms of CPU time per 100ms of wall time.',
			'//',
			'// Parse the decimal EXACTLY, without floats: split on "." and scale',
			'// the fraction by its digit count (at most 5 fractional digits can',
			'// matter against a 100000µs period). Malformed input — empty, bad',
			'// digits, a second dot, negative — returns (0, 0) and a non-empty',
			'// error string: invalid cpus "<input>".',
			'func CPUQuota(cpus string) (int64, int64, string) {',
			'	// your code here',
			'	return 0, 0, ""',
			'}',
			'',
			'// OOMKilled reports whether a container whose cgroup has charged',
			'// `usage` bytes against a limit of `limit` bytes gets the OOM killer:',
			'// usage has REACHED the limit (>=, the limit is a ceiling you may not',
			'// touch, not a target) and a limit is actually set. limit == 0 means',
			'// unlimited — the kernel never OOM-kills a cgroup over "no limit".',
			'func OOMKilled(usage, limit int64) bool {',
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
			'	// pb/cq flatten each call into one comparable string: the value on',
			'	// success, "err:<message>" on failure — so a case pins the error',
			'	// contract as tightly as the arithmetic.',
			'	pb := func(s string) string {',
			'		n, err := ParseBytes(s)',
			'		if err != "" {',
			'			return "err:" + err',
			'		}',
			'		return fmt.Sprintf("%d", n)',
			'	}',
			'	cq := func(s string) string {',
			'		q, p, err := CPUQuota(s)',
			'		if err != "" {',
			'			return "err:" + err',
			'		}',
			'		return fmt.Sprintf("%d/%d", q, p)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"--memory=512m: k/m/g are binary — 512 x 1024 x 1024, the exact integer in memory.max",',
			'			"536870912",',
			'			func() string { return pb("512m") }},',
			'		{"--memory=2g: 2 x 1024^3 — gigabytes here always mean GiB",',
			'			"2147483648",',
			'			func() string { return pb("2g") }},',
			'		{"suffixes are case-insensitive: 1024K is exactly one megabyte",',
			'			"1048576",',
			'			func() string { return pb("1024K") }},',
			'		{"bare number: no suffix means the value is already bytes, verbatim",',
			'			"100000000",',
			'			func() string { return pb("100000000") }},',
			'		{"bad suffix: 512x is an error, not a guess — limits are too dangerous to fuzzy-parse",',
			'			"err:invalid size \\"512x\\"",',
			'			func() string { return pb("512x") }},',
			'		{"--cpus=1.5 -> quota 150000µs per 100000µs period: a core and a half of bandwidth",',
			'			"150000/100000",',
			'			func() string { return cq("1.5") }},',
			'		{"--cpus=0.5: half a core — 50ms of CPU time, then throttled until the period resets",',
			'			"50000/100000",',
			'			func() string { return cq("0.5") }},',
			'		{"malformed cpus: \\"one\\" errors — it must never silently become quota 0",',
			'			"err:invalid cpus \\"one\\"",',
			'			func() string { return cq("one") }},',
			'		{"OOM boundary: usage == limit already kills — the limit is a ceiling, not a target",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", OOMKilled(536870912, 536870912)) }},',
			'		{"limit 0 = unlimited: a terabyte of usage and no cgroup OOM kill",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", OOMKilled(1<<40, 0)) }},',
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
			'import "strconv"',
			'',
			'// cfsPeriod is docker\'s fixed CFS period: 100000µs = 100ms. Docker',
			'// never varies the period — only the quota — because a shorter period',
			'// smooths throttling at the cost of scheduler overhead, and 100ms is',
			'// the kernel default the ecosystem has settled on.',
			'const cfsPeriod = 100000',
			'',
			'// ParseBytes: last byte decides the unit, the rest must be a plain',
			'// integer. Binary multipliers on purpose — docker\'s RAM sizes are',
			'// KiB/MiB/GiB even though the flags spell them k/m/g (disk tooling',
			'// tends to use 1000-based units; RAM tooling 1024 — a permanent source',
			'// of ~7% surprises at the gigabyte scale).',
			'func ParseBytes(s string) (int64, string) {',
			'	// One error string for every failure mode: a limit that fails to',
			'	// parse must fail LOUDLY and uniformly — silently defaulting a',
			'	// malformed memory limit is how containers end up unconfined.',
			'	bad := "invalid size " + strconv.Quote(s)',
			'	if s == "" {',
			'		return 0, bad',
			'	}',
			'	num := s',
			'	var mult int64 = 1',
			'	last := s[len(s)-1]',
			'	if last < \'0\' || last > \'9\' {',
			'		// Non-digit tail: it must be one of the four known units.',
			'		// Anything else is rejected rather than guessed.',
			'		num = s[:len(s)-1]',
			'		switch last {',
			'		case \'b\', \'B\':',
			'			mult = 1',
			'		case \'k\', \'K\':',
			'			mult = 1 << 10',
			'		case \'m\', \'M\':',
			'			mult = 1 << 20',
			'		case \'g\', \'G\':',
			'			mult = 1 << 30',
			'		default:',
			'			return 0, bad',
			'		}',
			'	}',
			'	// ParseInt (not Atoi) so the width check is explicit; it also',
			'	// rejects the empty string left by a lone suffix like "m". The',
			'	// n < 0 guard catches an explicit sign — a negative limit is',
			'	// nonsense the kernel would reject anyway; better to reject it',
			'	// here with a message that names the input.',
			'	n, err := strconv.ParseInt(num, 10, 64)',
			'	if err != nil || n < 0 {',
			'		return 0, bad',
			'	}',
			'	return n * mult, ""',
			'}',
			'',
			'// CPUQuota parses the decimal WITHOUT floats. quota must land exactly',
			'// on cpus x 100000, and integer math makes "exactly" trivial: split',
			'// on the dot, scale the fraction by 10 per missing digit. (Docker',
			'// itself round-trips through a float64 nanoCPUs value and survives',
			'// only because it rounds; here the arithmetic is exact by',
			'// construction, so there is nothing to round.)',
			'func CPUQuota(cpus string) (int64, int64, string) {',
			'	bad := "invalid cpus " + strconv.Quote(cpus)',
			'	intPart := cpus',
			'	fracPart := ""',
			'	for i := 0; i < len(cpus); i++ {',
			'		if cpus[i] == \'.\' {',
			'			intPart = cpus[:i]',
			'			fracPart = cpus[i+1:]',
			'			break',
			'		}',
			'	}',
			'	// ".5" and "1." are fine (one side may be empty); "." and "" are',
			'	// not — there must be at least one digit somewhere. A second dot',
			'	// lands in fracPart and fails ParseInt below.',
			'	if intPart == "" && fracPart == "" {',
			'		return 0, 0, bad',
			'	}',
			'	var whole int64',
			'	if intPart != "" {',
			'		v, err := strconv.ParseInt(intPart, 10, 64)',
			'		if err != nil || v < 0 {',
			'			return 0, 0, bad',
			'		}',
			'		whole = v',
			'	}',
			'	var frac int64',
			'	if fracPart != "" {',
			'		// Only 5 fractional digits can matter against a 100000µs',
			'		// period — a 6th digit would be sub-microsecond quota, which',
			'		// the kernel cannot represent. Reject rather than truncate:',
			'		// truncation would silently grant less CPU than requested.',
			'		if len(fracPart) > 5 {',
			'			return 0, 0, bad',
			'		}',
			'		v, err := strconv.ParseInt(fracPart, 10, 64)',
			'		if err != nil || v < 0 {',
			'			return 0, 0, bad',
			'		}',
			'		// Scale by digit count: ".5" is 5 tenths of a period, so pad',
			'		// to the 5 digits a full period holds — "5" -> 50000, "25" ->',
			'		// 25000, "12345" -> 12345. This is the split-and-scale trick',
			'		// that keeps the whole computation in integers.',
			'		frac = v',
			'		for i := len(fracPart); i < 5; i++ {',
			'			frac *= 10',
			'		}',
			'	}',
			'	return whole*cfsPeriod + frac, cfsPeriod, ""',
			'}',
			'',
			'// OOMKilled is the kernel\'s predicate reduced to its essence: the',
			'// charge counter has reached memory.max and a max is actually set.',
			'// >= (not >) because the limit is a ceiling the counter may never',
			'// rest at — the kernel tries reclaim first, and OOM-kills when the',
			'// charge cannot be brought back under. limit 0 models "no limit',
			'// configured": docker writes nothing, the cgroup stays unlimited,',
			'// and only the HOST\'s global OOM killer could ever fire.',
			'func OOMKilled(usage, limit int64) bool {',
			'	return limit > 0 && usage >= limit',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Two CPU knobs that get confused constantly</h3>' +
			'<p><code>--cpu-shares</code> and <code>--cpus</code> look like siblings ' +
			'and are nothing alike. <strong>Shares are a relative weight</strong> ' +
			'(default 1024, cgroup file <code>cpu.shares</code>): a 512-share ' +
			'container gets half the CPU of a 1024-share one — <em>but only when ' +
			'they are fighting over saturated cores</em>. On an idle host a ' +
			'512-share container happily uses every core; shares throttle nothing. ' +
			'<strong><code>--cpus</code> is a hard cap</strong>: quota is enforced ' +
			'every period whether or not anyone else wants the CPU. The classic ' +
			'production mistake is setting shares believing they cap ("it worked in ' +
			'staging" — where nothing contended), or setting a tight quota believing ' +
			'it is a fair-share weight and then paying for it in throttled ' +
			'latency.</p>' +
			'<h3>cgroup v2 renamed the files, not the model</h3>' +
			'<p>Everything this exercise computes lands in a file, and v2 (the ' +
			'default on modern distros) tidied the names: ' +
			'<code>memory.limit_in_bytes</code> became <code>memory.max</code>; the ' +
			'v1 pair <code>cpu.cfs_quota_us</code>&nbsp;/ ' +
			'<code>cpu.cfs_period_us</code> collapsed into one <code>cpu.max</code> ' +
			'holding <code>"150000 100000"</code> — quota then period, with the ' +
			'literal word <code>max</code> meaning unlimited (your ' +
			'<code>limit&nbsp;==&nbsp;0</code> case). Shares became ' +
			'<code>cpu.weight</code>, rescaled from 2–262144 (default 1024) to ' +
			'1–10000 (default 100) — same relative-weight semantics, different ' +
			'numbers, another reason not to hardcode either scale. ' +
			'<code>cat /sys/fs/cgroup/&lt;path&gt;/cpu.max</code> inside a limited ' +
			'container shows exactly the pair your <code>CPUQuota</code> ' +
			'returns.</p>' +
			'<h3>Field notes</h3>' +
			'<p><strong>Exit 137 without <code>OOMKilled: true</code></strong> is ' +
			'the subtle variant: 137 only means SIGKILL. <code>docker stop</code> ' +
			'sends it after the grace period, and Kubernetes kills on its own ' +
			'evictions — always confirm with <code>docker inspect</code> (or the ' +
			'kernel\'s <code>oom_kill</code> counter in <code>memory.events</code>) ' +
			'before blaming the limit.</p>' +
			'<p><strong>The memory counter includes page cache.</strong> A container ' +
			'that streams files "uses" hundreds of MB of reclaimable cache, so ' +
			'naive monitoring screams 95% while the kernel is perfectly relaxed — ' +
			'it reclaims cache before OOM-killing. Working-set metrics subtract the ' +
			'reclaimable part; raw <code>usage</code> does not. Conversely, a heavy ' +
			'writer can be OOM-killed by dirty cache it cannot reclaim fast enough ' +
			'— the limit charges cache too, which surprises everyone once.</p>' +
			'<p><strong>Throttling hides from CPU graphs.</strong> A ' +
			'<code>--cpus=0.5</code> container that needs 60&nbsp;ms per 100&nbsp;ms ' +
			'period spends 10&nbsp;ms of every period frozen: p99 latency spikes ' +
			'while average CPU% reads a calm 50%. The evidence is ' +
			'<code>nr_throttled</code> and <code>throttled_usec</code> in ' +
			'<code>cpu.stat</code>. Multi-threaded runtimes make it worse — 8 ' +
			'threads burn a 50&nbsp;ms quota in ~6&nbsp;ms of wall time, then the ' +
			'whole container sleeps 94&nbsp;ms; this is why JVM and Go services with ' +
			'small quotas get their GC/GOMAXPROCS tuned to the quota, not to the ' +
			'host\'s core count.</p>',
		],
		complexity: { time: 'O(n) over the flag string — one scan, one integer parse', space: 'O(1)' },
	});
})();
