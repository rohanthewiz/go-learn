/* Restart Policies & Backoff — Running Containers (Medium). The decision the
 * daemon makes every time a container's process exits: no / always /
 * unless-stopped / on-failure[:N], the manual-stop override that beats all of
 * them, and the 100ms-doubling-to-60s backoff that turns a crash loop from a
 * CPU fire into a slow blink. The harness pins every policy against exit 0
 * and exit 1, the docker-stop override, the on-failure:N cap, the backoff
 * doubling and its clamp, and the unknown-policy parse error.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// The per-exit decision as a pipeline: manual stop is checked before the
	// policy ever gets a vote, and a granted restart waits out the doubling
	// backoff before the process runs (and exits) again. Marker ids
	// namespaced (dgArrowDKRP) — every track's SVGs share the page's id
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 240" width="520" height="240" role="img" aria-label="restart decision loop: on every process exit the daemon first checks for a manual docker stop, then consults the policy; a granted restart waits out an exponentially doubling backoff, capped at 60 seconds, and the container runs again">' +
		'<text x="14" y="18" class="lbl">every exit runs the same decision — the policy is data stored on the container</text>' +
		// station 1: the process exits
		'<rect x="14" y="36" width="112" height="36" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="70" y="59" text-anchor="middle">process exits</text>' +
		'<path d="M 130 54 L 164 54" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKRP)"/>' +
		// station 2: the manual-stop override, before the policy gets a vote
		'<rect x="168" y="36" width="132" height="36" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="234" y="59" text-anchor="middle">docker stop?</text>' +
		'<path d="M 234 76 L 234 102" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDKRPwarn)"/>' +
		'<text x="234" y="120" text-anchor="middle" class="lbl" style="fill:var(--warn)">stays down — a manual stop beats every policy</text>' +
		'<path d="M 304 54 L 340 54" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKRP)"/>' +
		'<text x="322" y="46" text-anchor="middle" class="lbl">no</text>' +
		// station 3: the policy gate
		'<rect x="344" y="36" width="134" height="36" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="411" y="59" text-anchor="middle">policy gate</text>' +
		'<text x="512" y="96" text-anchor="end" class="lbl">"no" · exit 0 · cap hit → down</text>' +
		'<path d="M 356 76 L 356 158" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDKRPok)"/>' +
		'<text x="364" y="140" class="lbl" style="fill:var(--ok)">restart</text>' +
		// the backoff timeline the granted restart must wait out
		'<text x="40" y="152" class="lbl">delay before restart attempt n (ms)</text>' +
		'<line x1="40" y1="168" x2="506" y2="168" stroke="var(--edge)" stroke-width="1"/>' +
		'<circle cx="60" cy="168" r="3.5" fill="var(--ok)"/>' +
		'<circle cx="92" cy="168" r="3.5" fill="var(--ok)"/>' +
		'<circle cx="136" cy="168" r="3.5" fill="var(--ok)"/>' +
		'<circle cx="196" cy="168" r="3.5" fill="var(--ok)"/>' +
		'<circle cx="276" cy="168" r="3.5" fill="var(--ok)"/>' +
		'<text x="340" y="172" text-anchor="middle" class="lbl">…</text>' +
		'<circle cx="470" cy="168" r="3.5" fill="var(--warn)"/>' +
		'<text x="60" y="186" text-anchor="middle" class="lbl">100</text>' +
		'<text x="92" y="186" text-anchor="middle" class="lbl">200</text>' +
		'<text x="136" y="186" text-anchor="middle" class="lbl">400</text>' +
		'<text x="196" y="186" text-anchor="middle" class="lbl">800</text>' +
		'<text x="470" y="186" text-anchor="middle" class="lbl" style="fill:var(--warn)">60 000 (cap)</text>' +
		// the loop closes: the restarted process runs, and exits again
		'<path d="M 40 160 C 16 122 24 94 54 78" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKRP)"/>' +
		'<text x="14" y="214" class="lbl">attempt n waits 100·2^n ms, clamped at 60 000 — a container that stays up 10 s resets the clock to 100 ms</text>' +
		'<defs>' +
		'<marker id="dgArrowDKRP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowDKRPwarn" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowDKRPok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'restart-policies',
		title: 'Restart Policies & Backoff',
		nav: 'restart policies',
		difficulty: 'Medium',
		category: 'Running Containers',
		task: 'Implement ShouldRestart — the daemon\'s per-exit decision for no / always / unless-stopped / on-failure[:N], with the manual-stop override — and BackoffMillis, the doubling 100 ms → 60 s restart delay.',

		prose: [
			'<h2>Restart Policies &amp; Backoff</h2>' +
			'<p>Friday you ship a config rename; Monday <code>docker ps</code> greets ' +
			'you with <code>Restarting (1) 2 seconds ago</code>. The number in ' +
			'parentheses is the <em>exit code</em>, not a count: the entrypoint reads ' +
			'the old config path, exits 1, and the daemon — obeying ' +
			'<code>--restart always</code> — starts it again. It has been doing this ' +
			'all weekend, and it even survived Sunday\'s host reboot, because ' +
			'<code>always</code> also starts the container when the daemon itself ' +
			'boots. Nothing here is a supervisor process babysitting your app: the ' +
			'policy is a string stored on the container, and every time the process ' +
			'exits the daemon replays one small decision procedure over it.</p>' +
			'<ul>' +
			'<li><strong><code>no</code></strong> — the default. Exited containers ' +
			'stay exited; <code>docker ps -a</code> fills up with ' +
			'<code>Exited (1)</code> rows and nothing moves.</li>' +
			'<li><strong><code>always</code></strong> — restart on <em>any</em> exit, ' +
			'even a clean <code>exit 0</code>. A one-shot job under ' +
			'<code>always</code> reruns forever: success is just another exit.</li>' +
			'<li><strong><code>unless-stopped</code></strong> — the same per-exit ' +
			'decision as <code>always</code>. The difference only shows at daemon ' +
			'startup: a container you had manually stopped stays down, where ' +
			'<code>always</code> would resurrect it.</li>' +
			'<li><strong><code>on-failure</code> / <code>on-failure:N</code></strong> ' +
			'— restart only when the exit code is non-zero. <code>N</code> caps the ' +
			'restart attempts: once the container has been restarted <code>N</code> ' +
			'times, the daemon gives up. <code>N</code> of 0 (or absent) means ' +
			'unlimited.</li>' +
			'<li><strong>A manual <code>docker stop</code> beats everything.</strong> ' +
			'The policy encodes “the process exited”; a stop encodes operator ' +
			'intent — no policy restarts a container a human just stopped.</li>' +
			'<li><strong>Backoff.</strong> Between a crash and the next start the ' +
			'daemon waits: 100&nbsp;ms before the first restart, doubling every ' +
			'attempt (100, 200, 400, …), clamped at 60&nbsp;000&nbsp;ms. A container ' +
			'that stays up for 10 seconds is considered healthy again and the ' +
			'counter resets to 100&nbsp;ms.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>ShouldRestart(policy, exitCode, restartCount, ' +
			'manuallyStopped)</code>: the daemon\'s answer for one exit, plus a ' +
			'second return — <code>""</code> normally, or a non-empty parse-error ' +
			'message when the policy string is unknown or its retry count is ' +
			'malformed. Return the message, don\'t panic: the real daemon rejects a ' +
			'bad <code>--restart</code> flag with exactly such an error at ' +
			'<code>docker run</code> time. Then implement ' +
			'<code>BackoffMillis(n)</code>: the delay before restart attempt ' +
			'<code>n</code> (0-based) — 100&nbsp;ms doubling per attempt, capped at ' +
			'60&nbsp;000. The 10-second reset is the <em>caller\'s</em> job (it ' +
			'resets <code>n</code>), not this function\'s.</p>',
			'<div class="tip">The 10-second reset has a blind spot worth knowing: an ' +
			'app that takes <em>longer</em> than 10 seconds to crash — say it dies ' +
			'15 seconds in, when the first request hits a bad DB pool — resets the ' +
			'backoff on every cycle and restarts at a brisk 100&nbsp;ms forever. The ' +
			'damping only damps <em>fast</em> crash loops. <code>docker events</code> ' +
			'streaming endless <code>die</code>/<code>start</code> pairs at a steady ' +
			'cadence is the signature.</div>',
		],

		starter: [
			'package main',
			'',
			'// ShouldRestart is the decision the daemon makes every time a',
			'// container\'s process exits: given the container\'s restart policy,',
			'// the exit code, how many times the daemon has already restarted it,',
			'// and whether the container was just manually stopped (docker stop),',
			'// should it start again?',
			'//',
			'// Policies:',
			'//   - "no"             — never restart',
			'//   - "always"         — restart on any exit code',
			'//   - "unless-stopped" — same per-exit decision as always (the',
			'//                        difference is daemon-startup behavior)',
			'//   - "on-failure"     — restart only when exitCode != 0',
			'//   - "on-failure:N"   — as on-failure, but give up once the container',
			'//                        has been restarted N times (restartCount >= N).',
			'//                        N == 0 means unlimited, like plain on-failure.',
			'//',
			'// Validate the policy first: an unknown policy name, a retry count on',
			'// a policy other than on-failure, or an N that is not a non-negative',
			'// integer returns (false, <non-empty message naming the policy>).',
			'// Never panic — the real daemon rejects a bad --restart flag with an',
			'// error at docker run time.',
			'//',
			'// For any valid policy, a manual stop overrides everything: if',
			'// manuallyStopped is true the answer is false, and the error is "".',
			'func ShouldRestart(policy string, exitCode, restartCount int, manuallyStopped bool) (bool, string) {',
			'	// your code here',
			'	return false, ""',
			'}',
			'',
			'// BackoffMillis is the delay the daemon sleeps before restart attempt',
			'// n (0-based): 100 ms for attempt 0, doubling each attempt after that',
			'// (100, 200, 400, ...), clamped at 60000 ms (one minute). The daemon',
			'// resets n to 0 after a container stays up for 10 seconds — a fact',
			'// about the caller, not this function.',
			'func BackoffMillis(n int) int {',
			'	// your code here',
			'	return 0',
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
			'	cases := []tc{',
			'		{"policy no: never restarts — clean exit and crash alike, no error",',
			'			"false false true",',
			'			func() string {',
			'				r0, e0 := ShouldRestart("no", 0, 0, false)',
			'				r1, e1 := ShouldRestart("no", 1, 5, false)',
			'				return fmt.Sprintf("%v %v %v", r0, r1, e0 == "" && e1 == "")',
			'			}},',
			'		{"policy always: restarts on any exit — even a clean exit 0",',
			'			"true true",',
			'			func() string {',
			'				r0, _ := ShouldRestart("always", 0, 0, false)',
			'				r1, _ := ShouldRestart("always", 1, 7, false)',
			'				return fmt.Sprintf("%v %v", r0, r1)',
			'			}},',
			'		{"policy always after docker stop: the manual stop wins",',
			'			"false",',
			'			func() string {',
			'				// 137 = 128+SIGKILL, the code docker stop leaves behind',
			'				// when the 10s SIGTERM grace period expires.',
			'				r, _ := ShouldRestart("always", 137, 2, true)',
			'				return fmt.Sprintf("%v", r)',
			'			}},',
			'		{"unless-stopped: restarts a crash, honors a manual stop",',
			'			"true false",',
			'			func() string {',
			'				r0, _ := ShouldRestart("unless-stopped", 1, 0, false)',
			'				r1, _ := ShouldRestart("unless-stopped", 0, 0, true)',
			'				return fmt.Sprintf("%v %v", r0, r1)',
			'			}},',
			'		{"on-failure is exit-code-gated: exit 0 stays down, exit 1 restarts",',
			'			"false true",',
			'			func() string {',
			'				r0, _ := ShouldRestart("on-failure", 0, 0, false)',
			'				r1, _ := ShouldRestart("on-failure", 1, 0, false)',
			'				return fmt.Sprintf("%v %v", r0, r1)',
			'			}},',
			'		{"on-failure:3 — attempt below the cap restarts, at the cap it gives up",',
			'			"true false",',
			'			func() string {',
			'				r0, _ := ShouldRestart("on-failure:3", 1, 2, false)',
			'				r1, _ := ShouldRestart("on-failure:3", 1, 3, false)',
			'				return fmt.Sprintf("%v %v", r0, r1)',
			'			}},',
			'		{"on-failure:0 means unlimited, like plain on-failure",',
			'			"true",',
			'			func() string {',
			'				r, _ := ShouldRestart("on-failure:0", 1, 999, false)',
			'				return fmt.Sprintf("%v", r)',
			'			}},',
			'		{"unknown policy on-exit: no restart, and a parse error comes back",',
			'			"false true",',
			'			func() string {',
			'				r, e := ShouldRestart("on-exit", 1, 0, false)',
			'				return fmt.Sprintf("%v %v", r, e != "")',
			'			}},',
			'		{"backoff doubles per attempt: 100, 200, 400, 800 ms",',
			'			"100 200 400 800",',
			'			func() string {',
			'				return fmt.Sprintf("%d %d %d %d",',
			'					BackoffMillis(0), BackoffMillis(1), BackoffMillis(2), BackoffMillis(3))',
			'			}},',
			'		{"backoff clamps at 60000 ms: attempts 9, 10 and 20",',
			'			"51200 60000 60000",',
			'			func() string {',
			'				return fmt.Sprintf("%d %d %d",',
			'					BackoffMillis(9), BackoffMillis(10), BackoffMillis(20))',
			'			}},',
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
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// ShouldRestart replays the daemon\'s per-exit decision. The shape is',
			'// deliberate: validate the flag first (that is what docker run does —',
			'// a bad policy never creates a container at all), then apply the one',
			'// override that outranks every policy, then let the policy vote.',
			'func ShouldRestart(policy string, exitCode, restartCount int, manuallyStopped bool) (bool, string) {',
			'	// --- 1. Parse. SplitN, not Split: only the FIRST colon separates',
			'	// policy from count, so a garbage value like "on-failure:1:2" keeps',
			'	// its tail intact in parts[1] and fails Atoi below instead of being',
			'	// silently truncated.',
			'	parts := strings.SplitN(policy, ":", 2)',
			'	base := parts[0]',
			'	maxRetries := 0 // 0 = unlimited, the daemon\'s own convention',
			'	switch base {',
			'	case "no", "always", "unless-stopped":',
			'		// These take no argument. The real daemon is strict here too:',
			'		// "maximum retry count can only be used with on-failure".',
			'		if len(parts) == 2 {',
			'			return false, "invalid restart policy " + policy + ": retry count only valid with on-failure"',
			'		}',
			'	case "on-failure":',
			'		if len(parts) == 2 {',
			'			n, err := strconv.Atoi(parts[1])',
			'			if err != nil || n < 0 {',
			'				return false, "invalid restart policy " + policy + ": retry count must be a non-negative integer"',
			'			}',
			'			maxRetries = n',
			'		}',
			'	default:',
			'		return false, "invalid restart policy " + policy',
			'	}',
			'',
			'	// --- 2. The override. docker stop records operator intent, and no',
			'	// policy outranks a human: without this rule "always" would be',
			'	// unstoppable — stop would race the daemon restarting it. This is',
			'	// why the daemon tracks HOW a container stopped, not just that it',
			'	// did: a SIGKILL from `docker stop` and a SIGKILL from the OOM',
			'	// killer leave the same exit code (137) but opposite decisions.',
			'	if manuallyStopped {',
			'		return false, ""',
			'	}',
			'',
			'	// --- 3. The policy vote.',
			'	switch base {',
			'	case "always", "unless-stopped":',
			'		// Identical at exit time — even for exit 0. The pair only',
			'		// diverges at daemon startup: always resurrects a manually',
			'		// stopped container after a reboot, unless-stopped does not.',
			'		// That startup behavior lives in the daemon\'s boot path, so',
			'		// this per-exit function cannot (and should not) see it.',
			'		return true, ""',
			'	case "on-failure":',
			'		// Exit 0 is success: a finished job, not a failure to retry.',
			'		if exitCode == 0 {',
			'			return false, ""',
			'		}',
			'		// The cap counts RESTARTS already granted, so restartCount >=',
			'		// maxRetries means the budget is spent. maxRetries == 0 is the',
			'		// unlimited sentinel and never trips the cap.',
			'		if maxRetries > 0 && restartCount >= maxRetries {',
			'			return false, ""',
			'		}',
			'		return true, ""',
			'	}',
			'	// base == "no": the default — exited containers stay exited.',
			'	return false, ""',
			'}',
			'',
			'// BackoffMillis computes the sleep before restart attempt n: 100ms',
			'// doubling per attempt, clamped at one minute. Exponential-with-cap is',
			'// the standard damping shape: early restarts are near-instant (most',
			'// crashes are transient — a dependency not up yet), while a genuinely',
			'// broken container converges to one attempt per minute instead of',
			'// burning a CPU core on a hot fork/exec loop.',
			'func BackoffMillis(n int) int {',
			'	delay := 100',
			'	// Iterate rather than shift 100<<n: doubling at most ~10 times',
			'	// before hitting the clamp means a huge (or hostile) n can never',
			'	// overflow — the loop exits the moment the cap is reached.',
			'	for i := 0; i < n; i++ {',
			'		delay *= 2',
			'		if delay >= 60000 {',
			'			return 60000',
			'		}',
			'	}',
			'	return delay',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why a policy string, not a supervisor</h3>' +
			'<p>Nothing watches your process the way systemd watches a unit. The ' +
			'restart policy is a field on the container\'s config ' +
			'(<code>docker inspect -f \'{{.HostConfig.RestartPolicy}}\'</code>), and ' +
			'the daemon\'s <em>restart manager</em> replays the decision you just ' +
			'implemented each time containerd reports the process dead. That is why ' +
			'validation happens at <code>docker run</code> time — a policy that ' +
			'cannot parse never creates a container — and why you can change the ' +
			'policy of a <em>running</em> container with <code>docker update ' +
			'--restart</code>: it is just data, consulted at the next exit.</p>' +
			'<p>The manual-stop override is the piece people rediscover the hard ' +
			'way. <code>docker stop</code> and an OOM kill can leave the identical ' +
			'exit code (137 = 128&nbsp;+&nbsp;SIGKILL), so the exit code alone ' +
			'cannot distinguish “operator wants this down” from “kernel shot it”. ' +
			'The daemon therefore records <em>how</em> the container stopped, and ' +
			'the policy only votes when the stop was not manual. Without that rule ' +
			'<code>always</code> would be literally unstoppable.</p>' +
			'<h3>always vs unless-stopped: a boot-time distinction</h3>' +
			'<p>At exit time the two are the same function — your code returns the ' +
			'same answers. The difference is the daemon\'s <em>startup</em> path: ' +
			'when dockerd boots (host reboot, daemon upgrade), it starts every ' +
			'<code>always</code> container — including ones you had manually ' +
			'stopped — but leaves manually stopped <code>unless-stopped</code> ' +
			'containers down. That is the whole reason <code>unless-stopped</code> ' +
			'exists: “stay how the operator left you” across reboots. It is also ' +
			'why the Friday config bug survives the Sunday reboot under ' +
			'<code>always</code>: the boot path restarts the container, the process ' +
			'crashes, and the per-exit loop takes over again.</p>',
			'<h3>Reading a crash loop in the field</h3>' +
			'<p><code>Restarting (1) 2 seconds ago</code> in <code>docker ps</code> ' +
			'gives you the exit code (1) and the time since the last death. The ' +
			'restart count lives in <code>docker inspect -f ' +
			'\'{{.RestartCount}}\'</code>, and <code>docker logs</code> still works ' +
			'on a restarting container — the loop\'s most useful property, since ' +
			'each restart is the <em>same container</em> keeping its log history ' +
			'(unlike an orchestrator replacing pods). <code>docker events</code> ' +
			'shows the raw <code>die</code>/<code>start</code> rhythm, with the ' +
			'backoff visible as the widening gap between them.</p>' +
			'<p>The backoff itself is the same exponential-with-cap shape you meet ' +
			'in retry libraries, and for the same reason: most crashes are ' +
			'transient (the database container two seconds behind yours), so early ' +
			'retries should be nearly free; a genuinely broken container should ' +
			'converge to a slow, cheap blink — one fork/exec per minute — rather ' +
			'than a hot loop. The 10-second success reset keeps a daily crash from ' +
			'paying a minute of penalty, at the cost of the blind spot in the tip: ' +
			'crash slower than the reset window and the damping never engages.</p>' +
			'<p>Kubernetes solved the same problem with the same curve, scaled up: ' +
			'<code>CrashLoopBackOff</code> is a 10-second base doubling to a ' +
			'five-minute cap, reset after ten minutes of health. Same mechanism, ' +
			'same debugging instinct — when you see it, the question is never “why ' +
			'does it keep restarting” (that is the policy doing its job) but “why ' +
			'does it keep <em>exiting</em>”: read the exit code first.</p>',
		],
		complexity: { time: 'O(1) — a fixed decision table; the backoff loop doubles at most ~10 times before the clamp', space: 'O(1)' },
	});
})();
