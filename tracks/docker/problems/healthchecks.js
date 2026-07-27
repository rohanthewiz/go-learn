/* Healthchecks — Running Containers (Medium). The HEALTHCHECK state machine
 * behind the `(healthy)` suffix in `docker ps` and behind compose's
 * `depends_on: condition: service_healthy`. Probes arrive as a pure
 * timeline (seconds + pass/fail); the learner implements the transitions:
 * start-period grace, the consecutive-failure streak vs --retries, and
 * recovery on any single success. The harness pins the tricky edges —
 * failures shielded inside the start period, unhealthy EXACTLY on the
 * Nth consecutive failure, and a streak reset by one interleaved success.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// Three states, five edges. The self-loop on "starting" is the one
	// people forget exists (start-period grace); the bottom-right pair is
	// the one people forget is symmetric (unhealthy is recoverable).
	// Marker ids namespaced (…DKHC) — every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 208" width="520" height="208" role="img" aria-label="health status state machine: starting transitions to healthy on any success; failures inside the start period loop back to starting uncounted; consecutive failures reaching Retries lead to unhealthy; one success returns unhealthy to healthy">' +
		'<text x="14" y="20" class="lbl">the HEALTHCHECK state machine — the word docker ps prints in parentheses</text>' +
		// fail-during-start-period self loop (over the starting box)
		'<path d="M 56 84 C 42 52 110 52 96 84" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDKHC)"/>' +
		'<text x="76" y="42" text-anchor="middle" class="lbl">fail in start period: ignored</text>' +
		// the three states
		'<rect x="24" y="84" width="104" height="38" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="76" y="108" text-anchor="middle">starting</text>' +
		'<rect x="208" y="84" width="104" height="38" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="260" y="108" text-anchor="middle">healthy</text>' +
		'<rect x="392" y="84" width="112" height="38" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="448" y="108" text-anchor="middle">unhealthy</text>' +
		// starting -> healthy: any success
		'<path d="M 132 103 L 202 103" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDKHCok)"/>' +
		'<text x="168" y="96" text-anchor="middle" class="lbl" style="fill:var(--ok)">success (any time)</text>' +
		// healthy -> unhealthy: the streak reaches Retries
		'<path d="M 316 92 C 340 64 364 64 388 92" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDKHCwn)"/>' +
		'<text x="352" y="58" text-anchor="middle" class="lbl" style="fill:var(--warn)">Retries consecutive failures</text>' +
		// unhealthy -> healthy: a single success recovers
		'<path d="M 388 116 C 364 142 340 142 316 116" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDKHCok)"/>' +
		'<text x="352" y="154" text-anchor="middle" class="lbl" style="fill:var(--ok)">one success</text>' +
		// starting -> unhealthy: never succeeded, streak filled up anyway
		'<path d="M 70 126 C 112 194 408 194 446 128" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDKHCwn)"/>' +
		'<text x="258" y="188" text-anchor="middle" class="lbl" style="fill:var(--warn)">failures after the start period build a streak — streak == Retries ⇒ unhealthy</text>' +
		'<defs>' +
		'<marker id="dgArrowDKHC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowDKHCok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowDKHCwn" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'healthchecks',
		title: 'Healthchecks: starting → healthy → unhealthy',
		nav: 'healthchecks',
		difficulty: 'Medium',
		category: 'Running Containers',
		task: 'Implement HealthTimeline: replay probes through the HEALTHCHECK state machine — start-period grace, the consecutive-failure streak vs Retries, recovery on any success — returning the status after each probe.',

		prose: [
			'<h2>Healthchecks: starting → healthy → unhealthy</h2>' +
			'<p><code>docker compose up</code> hangs. The API service never starts — ' +
			'compose sits on <em>“waiting for db to be healthy”</em> — and ' +
			'<code>docker ps</code> shows the database as ' +
			'<code>Up 42 seconds (health: starting)</code>… then flips to ' +
			'<code>(unhealthy)</code>. Nothing is wrong with Postgres: it is ' +
			'replaying WAL after a restore and needs ninety seconds before ' +
			'<code>pg_isready</code> answers. But the image\'s ' +
			'<code>HEALTHCHECK</code> has the default <code>--start-period=0s</code>, ' +
			'so the first three probe failures were <em>counted</em>, the retry ' +
			'budget burned out during warm-up, and a perfectly healthy database got ' +
			'branded unhealthy before it finished booting. To fix that — or to ' +
			'understand what <code>condition: service_healthy</code> actually waits ' +
			'for — you need the little state machine the daemon runs after every ' +
			'probe:</p>' +
			'<ul>' +
			'<li><strong>Status begins <code>starting</code>.</strong> No probe has ' +
			'said anything yet; <code>docker ps</code> shows ' +
			'<code>(health: starting)</code>.</li>' +
			'<li><strong>A passing probe — at any time — means ' +
			'<code>healthy</code></strong>, and the consecutive-failure streak ' +
			'resets to zero. A success <em>inside</em> the start period counts ' +
			'immediately: the grace window shields failures, never successes.</li>' +
			'<li><strong>A failing probe while still <code>starting</code>, with ' +
			'<code>AtSec &lt; StartPeriodSec</code>, is warm-up noise:</strong> it ' +
			'is not counted toward retries and the status stays ' +
			'<code>starting</code>. Once a container has been healthy, the shield ' +
			'is gone — later failures count even if the clock still reads inside ' +
			'the window.</li>' +
			'<li><strong>Every other failure increments a consecutive-failure ' +
			'streak.</strong> The status does <em>not</em> change yet — a healthy ' +
			'container stays <code>healthy</code> while failures accumulate — ' +
			'until the streak reaches <code>Retries</code>, at which point the ' +
			'status becomes <code>unhealthy</code>.</li>' +
			'<li><strong>Unhealthy is not a terminal state.</strong> One passing ' +
			'probe returns the container to <code>healthy</code> (streak zeroed). ' +
			'And note what the daemon does about an unhealthy container: ' +
			'<em>nothing</em>. It only changes the label — restarting on ' +
			'unhealth is an orchestrator\'s job, not dockerd\'s.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>A concrete replay with <code>--start-period=10s --retries=3</code>:</p>',
			{ lang: 'txt', code: 't=2s   FAIL  -> starting    (inside start period: not counted)\nt=4s   FAIL  -> starting    (still shielded)\nt=12s  FAIL  -> starting    (streak 1 — counted, but status holds)\nt=22s  FAIL  -> starting    (streak 2)\nt=32s  FAIL  -> unhealthy   (streak 3 == retries)\nt=42s  OK    -> healthy     (one success recovers; streak resets)' },
			'<h3>Your job</h3>' +
			'<p>Implement <code>HealthTimeline(cfg, probes)</code>: replay the ' +
			'probes in order through the machine above and return the status ' +
			'string — <code>"starting"</code>, <code>"healthy"</code>, or ' +
			'<code>"unhealthy"</code> — <em>after</em> each probe. The machine is ' +
			'deliberately pure: <code>Probe.AtSec</code> is seconds since ' +
			'container start, and when probes run (<code>--interval</code>, ' +
			'<code>--timeout</code>) is the scheduler\'s business, not yours.</p>',
			'<div class="tip">The start-period boundary is exclusive: a probe at ' +
			'exactly <code>AtSec == StartPeriodSec</code> is <em>outside</em> the ' +
			'grace window and counts. In the field, the fix for the war story ' +
			'above is one flag — <code>--start-period=90s</code> (or ' +
			'<code>start_period: 90s</code> under <code>healthcheck:</code> in ' +
			'compose) — which makes boot-time failures free without dulling ' +
			'detection later, because the shield drops the moment the first ' +
			'probe succeeds.</div>',
		],

		starter: [
			'package main',
			'',
			'// Config holds the two HEALTHCHECK options the state machine cares',
			'// about. Interval, timeout, and the probe command itself belong to',
			'// the scheduler — by the time this machine runs, a probe has already',
			'// happened and either passed or failed.',
			'type Config struct {',
			'	StartPeriodSec int // --start-period: warm-up window, in seconds',
			'	Retries        int // --retries: consecutive failures before "unhealthy"',
			'}',
			'',
			'// Probe is one completed run of the health command.',
			'type Probe struct {',
			'	AtSec int  // seconds since the container started',
			'	OK    bool // did the command exit 0?',
			'}',
			'',
			'// HealthTimeline replays probes (already in time order) through the',
			'// health-status state machine and returns the status after each one:',
			'//',
			'//   - status begins "starting"',
			'//   - a passing probe at ANY time -> "healthy"; the failure streak resets',
			'//   - a failing probe while still "starting" with AtSec < StartPeriodSec',
			'//     is warm-up noise: not counted, status unchanged',
			'//   - any other failure bumps a consecutive-failure streak; the status',
			'//     only changes once the streak reaches cfg.Retries -> "unhealthy"',
			'//   - one passing probe recovers "unhealthy" back to "healthy"',
			'func HealthTimeline(cfg Config, probes []Probe) []string {',
			'	// your code here',
			'	return nil',
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
			'	// One status word per probe, space-joined, so a whole timeline',
			'	// compares as a single string.',
			'	run := func(cfg Config, probes []Probe) string {',
			'		return strings.Join(HealthTimeline(cfg, probes), " ")',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"immediate success: the first passing probe flips starting -> healthy",',
			'			"healthy",',
			'			func() string { return run(Config{StartPeriodSec: 0, Retries: 3}, []Probe{{1, true}}) }},',
			'		{"failures inside the start period are shielded: no streak, still starting",',
			'			"starting starting starting",',
			'			func() string {',
			'				return run(Config{StartPeriodSec: 10, Retries: 3}, []Probe{{2, false}, {4, false}, {6, false}})',
			'			}},',
			'		{"a success inside the start period counts immediately",',
			'			"starting healthy",',
			'			func() string { return run(Config{StartPeriodSec: 10, Retries: 3}, []Probe{{2, false}, {4, true}}) }},',
			'		{"retries=3: unhealthy EXACTLY on the 3rd consecutive failure, not before",',
			'			"starting starting unhealthy",',
			'			func() string {',
			'				return run(Config{StartPeriodSec: 0, Retries: 3}, []Probe{{5, false}, {10, false}, {15, false}})',
			'			}},',
			'		{"recovery: one success returns unhealthy to healthy",',
			'			"starting unhealthy healthy",',
			'			func() string {',
			'				return run(Config{StartPeriodSec: 0, Retries: 2}, []Probe{{5, false}, {10, false}, {15, true}})',
			'			}},',
			'		{"an interleaved success resets the streak — the count is CONSECUTIVE failures",',
			'			"starting starting healthy healthy healthy unhealthy",',
			'			func() string {',
			'				return run(Config{StartPeriodSec: 0, Retries: 3},',
			'					[]Probe{{5, false}, {10, false}, {15, true}, {20, false}, {25, false}, {30, false}})',
			'			}},',
			'		{"grace ends: shielded failures forgotten, post-window failures build the streak",',
			'			"starting starting starting unhealthy",',
			'			func() string {',
			'				return run(Config{StartPeriodSec: 10, Retries: 2},',
			'					[]Probe{{3, false}, {8, false}, {12, false}, {15, false}})',
			'			}},',
			'		{"once healthy, the start period no longer shields failures",',
			'			"healthy healthy unhealthy",',
			'			func() string {',
			'				return run(Config{StartPeriodSec: 30, Retries: 2}, []Probe{{5, true}, {10, false}, {12, false}})',
			'			}},',
			'		{"boundary: AtSec == StartPeriodSec is OUTSIDE the grace window",',
			'			"unhealthy",',
			'			func() string { return run(Config{StartPeriodSec: 10, Retries: 1}, []Probe{{10, false}}) }},',
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
			'// Config holds the two HEALTHCHECK options the state machine cares',
			'// about. Interval, timeout, and the probe command itself belong to',
			'// the scheduler — by the time this machine runs, a probe has already',
			'// happened and either passed or failed.',
			'type Config struct {',
			'	StartPeriodSec int // --start-period: warm-up window, in seconds',
			'	Retries        int // --retries: consecutive failures before "unhealthy"',
			'}',
			'',
			'// Probe is one completed run of the health command.',
			'type Probe struct {',
			'	AtSec int  // seconds since the container started',
			'	OK    bool // did the command exit 0?',
			'}',
			'',
			'// HealthTimeline replays probes through the health-status machine.',
			'// The entire machine is two variables — the current status word and',
			'// the consecutive-failure streak — which is exactly the state dockerd',
			'// keeps per container (FailingStreak in `docker inspect .State.Health`).',
			'func HealthTimeline(cfg Config, probes []Probe) []string {',
			'	status := "starting"',
			'	streak := 0 // consecutive COUNTED failures since the last success',
			'	out := make([]string, 0, len(probes))',
			'',
			'	for _, p := range probes {',
			'		if p.OK {',
			'			// A success wins from every state, at every time. This is',
			'			// why the start period never delays readiness: the window',
			'			// shields failures, not successes. Resetting the streak',
			'			// here is what makes the retry count CONSECUTIVE — a',
			'			// flapping check must fail Retries times in a row, not',
			'			// Retries times ever.',
			'			status = "healthy"',
			'			streak = 0',
			'		} else if status == "starting" && p.AtSec < cfg.StartPeriodSec {',
			'			// Warm-up grace. Two conditions on purpose:',
			'			//   - the clock check (strict <: a probe AT the boundary',
			'			//     already counts), and',
			'			//   - status still "starting" — once a container has been',
			'			//     healthy it is considered started, and the shield is',
			'			//     gone even if the wall clock is inside the window.',
			'			// Deliberately no streak++ and no status change: shielded',
			'			// failures leave no trace at all.',
			'		} else {',
			'			// A counted failure. Note the status does NOT flip early:',
			'			// a healthy container stays "healthy" (and "starting"',
			'			// stays "starting") while the streak builds — docker ps',
			'			// keeps saying (healthy) until the budget is exhausted.',
			'			// That hysteresis is the point of --retries: one dropped',
			'			// probe must not flap the status and wake the orchestrator.',
			'			streak++',
			'			if streak >= cfg.Retries {',
			'				status = "unhealthy"',
			'			}',
			'		}',
			'		out = append(out, status)',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the machine is shaped this way</h3>' +
			'<p>Each edge exists to solve a specific operational problem:</p>' +
			'<ul>' +
			'<li><strong>The start period shields failures, never successes.</strong> ' +
			'Slow-booting services (databases replaying WAL, JVMs warming up) ' +
			'would otherwise burn the retry budget before they had a chance — the ' +
			'war story above. But making successes count immediately means a fast ' +
			'boot is never penalized by a generous window: <code>start_period: ' +
			'120s</code> costs nothing when the service is up in five seconds. And ' +
			'the shield dropping after the first success means a container that ' +
			'crashes right after booting is detected at full speed.</li>' +
			'<li><strong><code>Retries</code> is hysteresis.</strong> A single probe ' +
			'can fail for reasons that have nothing to do with the service — a ' +
			'timeout under load, a full accept queue for one moment. Requiring N ' +
			'<em>consecutive</em> failures (the streak, reset by any success) ' +
			'keeps one blip from flapping the status and triggering whatever ' +
			'watches it. The same debounce shows up in Kubernetes as ' +
			'<code>failureThreshold</code> and in every load balancer\'s ' +
			'<code>unhealthy_threshold</code>.</li>' +
			'<li><strong>Unhealthy is recoverable, and dockerd does nothing about ' +
			'it.</strong> The daemon only labels; it never restarts an unhealthy ' +
			'container. Acting on the label is deliberately someone else\'s job: ' +
			'compose gates <code>depends_on: condition: service_healthy</code> on ' +
			'it, Swarm replaces unhealthy tasks, and on a bare host you need ' +
			'something like <code>autoheal</code> — <code>restart: always</code> ' +
			'reacts to <em>exit</em>, not to health. This is the sharpest contrast ' +
			'with a Kubernetes liveness probe, which kills the container itself.</li>' +
			'</ul>' +
			'<h3>Field notes</h3>' +
			'<p>The machine\'s full state is inspectable: ' +
			'<code>docker inspect --format \'{{json .State.Health}}\' db</code> ' +
			'shows <code>Status</code>, <code>FailingStreak</code> (your ' +
			'<code>streak</code> variable, live), and a log of the last five probe ' +
			'runs with their output — the first place to look when a container is ' +
			'mysteriously <code>(unhealthy)</code>. The second place is the probe ' +
			'command itself: <code>CMD curl -f localhost:8080/health</code> fails ' +
			'forever in an image that doesn\'t ship <code>curl</code>, and ' +
			'<code>CMD-SHELL</code> needs <code>/bin/sh</code>, which distroless ' +
			'images don\'t have — in both cases the <em>probe</em> is broken, not ' +
			'the service, but the state machine can\'t tell the difference: a ' +
			'non-zero exit is a failure, whatever its reason.</p>' +
			'<p>Two more gotchas worth knowing. <code>HEALTHCHECK</code> defined in ' +
			'the image is overridable per container (<code>--health-cmd</code>, ' +
			'<code>healthcheck:</code> in compose, or <code>--no-healthcheck</code> ' +
			'to remove it — a container with no check has <em>no</em> health ' +
			'status at all, and <code>service_healthy</code> on it fails ' +
			'immediately). And the timeline you modeled is exactly why ' +
			'<code>service_healthy</code> beats <code>service_started</code> for ' +
			'databases: “the process exists” and “the service answers” are ' +
			'different facts, separated by precisely the start period this ' +
			'machine was designed to tolerate.</p>',
		],
		complexity: { time: 'O(n) — one pass over the probes, two variables of state', space: 'O(n) for the returned timeline; O(1) beyond it' },
	});
})();
