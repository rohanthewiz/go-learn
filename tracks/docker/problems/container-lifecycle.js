/* The Container State Machine — Running Containers (Easy). `docker ps -a`'s
 * STATUS column is the surface of a small state machine inside the daemon:
 * created / running / paused / exited / removed, with every CLI verb an
 * edge. The learner implements Apply(state, cmd) — the daemon's transition
 * function — including the two edges that surprise everyone: stop on a
 * paused container works (the daemon unpauses first, because a frozen
 * process can never see SIGTERM), and rm refuses live containers unless
 * forced. The harness drives the happy-path chain and pins the refusals.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// The lifecycle as a state diagram: created feeds running, running and
	// paused toggle, running drops to exited, and exited loops back via
	// start/restart. Marker id namespaced (dgArrowDKCL) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 224" width="520" height="224" role="img" aria-label="container lifecycle state machine: created goes to running via start; running and paused toggle via pause and unpause; running goes to exited via stop or kill; exited returns to running via start or restart">' +
		'<text x="20" y="22" class="lbl">docker ps -a STATUS is a state machine — every CLI verb is an edge</text>' +
		// the four live states (removed is the absence of a state)
		'<rect x="20" y="88" width="92" height="36" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="66" y="111" text-anchor="middle">created</text>' +
		'<rect x="182" y="88" width="100" height="36" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="232" y="111" text-anchor="middle">running</text>' +
		'<rect x="392" y="34" width="102" height="36" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="443" y="57" text-anchor="middle">paused</text>' +
		'<rect x="392" y="146" width="102" height="36" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="443" y="169" text-anchor="middle">exited</text>' +
		// created -> running
		'<path d="M 114 106 L 178 106" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKCL)"/>' +
		'<text x="146" y="98" text-anchor="middle" class="lbl">start</text>' +
		// running <-> paused
		'<path d="M 284 94 C 322 78 352 66 388 57" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKCL)"/>' +
		'<text x="326" y="62" text-anchor="middle" class="lbl">pause</text>' +
		'<path d="M 390 76 C 354 88 324 96 288 104" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKCL)"/>' +
		'<text x="348" y="100" text-anchor="middle" class="lbl">unpause</text>' +
		// running -> exited
		'<path d="M 284 118 C 322 134 352 148 388 158" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKCL)"/>' +
		'<text x="322" y="152" text-anchor="middle" class="lbl">stop / kill</text>' +
		// exited -> running (the loop back that makes containers restartable)
		'<path d="M 390 178 C 320 202 252 196 228 130" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKCL)"/>' +
		'<text x="306" y="206" text-anchor="middle" class="lbl">start / restart</text>' +
		'<text x="20" y="220" class="lbl">rm: created|exited only · rm -f: force from any state · removed: the daemon forgot it</text>' +
		'<defs><marker id="dgArrowDKCL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'container-lifecycle',
		title: 'The Container State Machine',
		nav: 'container lifecycle',
		difficulty: 'Easy',
		category: 'Running Containers',
		task: 'Implement Apply(state, cmd) — the daemon\'s container state machine: valid transitions return the new state, invalid ones return the state unchanged plus a docker-flavored error message.',

		prose: [
			'<h2>The Container State Machine</h2>' +
			'<p>Your nightly CI cleanup — <code>docker rm $(docker ps -aq)</code> — ' +
			'has been flaking for a week with <code>Error response from daemon: You ' +
			'cannot remove a running container</code>. Meanwhile a teammate swears ' +
			'<code>docker stop</code> works on a <em>paused</em> container, which ' +
			'sounds impossible until you learn the daemon quietly unpauses it first. ' +
			'And that container showing <code>Exited (137) 3 minutes ago</code>? ' +
			'Nobody ran <code>docker kill</code> — the OOM killer did. All of it ' +
			'becomes predictable the moment you read <code>docker ps -a</code>\'s ' +
			'STATUS column for what it is: the current state of a small state ' +
			'machine, where every CLI verb is a transition edge — and every ' +
			'confusing daemon error is just an edge that does not exist.</p>' +
			'<ul>' +
			'<li><strong>States:</strong> <code>created</code> (config and writable ' +
			'layer exist, no process yet), <code>running</code>, <code>paused</code> ' +
			'(processes frozen by the cgroup freezer), <code>exited</code> (process ' +
			'gone, filesystem kept), and <code>removed</code> (the daemon has ' +
			'forgotten it entirely).</li>' +
			'<li><strong>start:</strong> <code>created|exited</code> → ' +
			'<code>running</code>. A container is restartable precisely because ' +
			'exit keeps its writable layer around.</li>' +
			'<li><strong>stop:</strong> <code>running</code> → <code>exited</code> ' +
			'— and <code>paused</code> → <code>exited</code> too: a frozen process ' +
			'can never run a signal handler, so the daemon <em>unpauses first</em>, ' +
			'then delivers SIGTERM as usual.</li>' +
			'<li><strong>kill:</strong> <code>running</code> only → ' +
			'<code>exited</code>. Kill is raw signal delivery — no thaw, no grace ' +
			'period, no mercy for the frozen or the dead.</li>' +
			'<li><strong>pause / unpause:</strong> <code>running</code> → ' +
			'<code>paused</code> and back. Only a live cgroup can be frozen.</li>' +
			'<li><strong>restart:</strong> <code>created|running|exited</code> → ' +
			'<code>running</code> (stop if needed, then start). Paused is ' +
			'refused.</li>' +
			'<li><strong>rm:</strong> <code>created|exited</code> → ' +
			'<code>removed</code>. Removing a live container would yank its ' +
			'writable layer out from under a mounted filesystem, so the daemon ' +
			'refuses — with a hint. <strong>rm -f</strong> (kill, then remove) ' +
			'works from any state except <code>removed</code>.</li>' +
			'<li><strong>Anything else is an error</strong>, and the error leaves ' +
			'the state untouched: a refused command never moves a container.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Apply(state, cmd)</code> — one step of the machine. ' +
			'It returns the new state and an error message (<code>""</code> on ' +
			'success; on error the state comes back unchanged). The exact error ' +
			'strings, checked in this order:</p>',
			{ lang: 'txt', code: '1. unknown verb (the CLI rejects it before the daemon is contacted):\n   docker: \'<cmd>\' is not a docker command\n2. state "removed" — the daemon has no record to act on:\n   Error response from daemon: no such container\n3. rm on running / paused:\n   Error response from daemon: cannot remove a running container: stop it first or use rm -f\n   Error response from daemon: cannot remove a paused container: unpause and stop it first or use rm -f\n4. every other invalid transition:\n   Error response from daemon: cannot <cmd> container in state <state>' },
			'<div class="tip">Watch the machine live: run <code>docker events</code> ' +
			'in one terminal while you stop a container in another — you\'ll see ' +
			'the edges fire as discrete events (<code>die</code>, then ' +
			'<code>stop</code>). And the exit code in <code>Exited (N)</code> ' +
			'encodes the killing signal as <code>128&nbsp;+&nbsp;signum</code>: ' +
			'137 = SIGKILL (OOM killer or <code>docker kill</code>), 143 = SIGTERM ' +
			'(a polite <code>docker stop</code>).</div>',
		],

		starter: [
			'package main',
			'',
			'// Apply advances one container through the daemon\'s state machine.',
			'// Given the current state (as shown by `docker ps -a`) and a CLI verb,',
			'// it returns the new state and an error message — "" on success. On',
			'// any error the state is returned UNCHANGED: a refused command never',
			'// moves a container.',
			'//',
			'// States: "created", "running", "paused", "exited", "removed".',
			'//',
			'// Transitions:',
			'//   - "start"    created|exited         -> running',
			'//   - "stop"     running|paused         -> exited  (paused is unpaused first)',
			'//   - "kill"     running                -> exited',
			'//   - "pause"    running                -> paused',
			'//   - "unpause"  paused                 -> running',
			'//   - "restart"  created|running|exited -> running',
			'//   - "rm"       created|exited         -> removed',
			'//   - "rm -f"    anything but removed   -> removed',
			'//',
			'// Errors (exact strings, checked in this order):',
			'//   1. unknown verb (rejected by the CLI before the daemon is contacted):',
			'//      docker: \'<cmd>\' is not a docker command',
			'//   2. state "removed" (the daemon has no record of the container):',
			'//      Error response from daemon: no such container',
			'//   3. "rm" on running / paused:',
			'//      Error response from daemon: cannot remove a running container: stop it first or use rm -f',
			'//      Error response from daemon: cannot remove a paused container: unpause and stop it first or use rm -f',
			'//   4. every other invalid transition:',
			'//      Error response from daemon: cannot <cmd> container in state <state>',
			'func Apply(state string, cmd string) (string, string) {',
			'	// your code here',
			'	return state, ""',
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
			'	// pair applies one command and folds both return values into a',
			'	// single comparable string; "ok" stands in for an empty error so',
			'	// success and silent-failure cannot collide.',
			'	pair := func(state string, cmd string) string {',
			'		next, errMsg := Apply(state, cmd)',
			'		if errMsg == "" {',
			'			return next + " | ok"',
			'		}',
			'		return next + " | " + errMsg',
			'	}',
			'	// chain folds a command list over a starting state, recording the',
			'	// full state trace; the first error aborts with the message.',
			'	chain := func(state string, cmds []string) string {',
			'		trace := state',
			'		for _, cmd := range cmds {',
			'			next, errMsg := Apply(state, cmd)',
			'			if errMsg != "" {',
			'				return trace + " !" + errMsg',
			'			}',
			'			state = next',
			'			trace += " " + state',
			'		}',
			'		return trace',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"happy path: created -start-> -pause-> -unpause-> -stop-> -start-> running",',
			'			"created running paused running exited running",',
			'			func() string {',
			'				return chain("created", []string{"start", "pause", "unpause", "stop", "start"})',
			'			}},',
			'		{"rm on a running container is refused with the force-remove hint; state unchanged",',
			'			"running | Error response from daemon: cannot remove a running container: stop it first or use rm -f",',
			'			func() string { return pair("running", "rm") }},',
			'		{"rm -f forces removal of a running container (kill, then remove)",',
			'			"removed | ok",',
			'			func() string { return pair("running", "rm -f") }},',
			'		{"kill on exited fails — no process left to signal",',
			'			"exited | Error response from daemon: cannot kill container in state exited",',
			'			func() string { return pair("exited", "kill") }},',
			'		{"pause on exited fails — only a live cgroup can be frozen",',
			'			"exited | Error response from daemon: cannot pause container in state exited",',
			'			func() string { return pair("exited", "pause") }},',
			'		{"stop on paused works — the daemon unpauses first, then stops",',
			'			"exited | ok",',
			'			func() string { return pair("paused", "stop") }},',
			'		{"restart from exited brings the container back",',
			'			"running | ok",',
			'			func() string { return pair("exited", "restart") }},',
			'		{"rm on exited succeeds — the writable layer is finally freed",',
			'			"removed | ok",',
			'			func() string { return pair("exited", "rm") }},',
			'		{"any verb on removed: the daemon has forgotten the container",',
			'			"removed | Error response from daemon: no such container",',
			'			func() string { return pair("removed", "start") }},',
			'		{"unknown verb is rejected by the CLI itself; state untouched",',
			'			"paused | docker: \'teleport\' is not a docker command",',
			'			func() string { return pair("paused", "teleport") }},',
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
			'// Apply is the daemon\'s transition function: (state, verb) -> (state,',
			'// error). The check order mirrors the real request path — the CLI',
			'// parses the verb before any socket call, the daemon looks up the',
			'// container before dispatching, and only then does per-verb state',
			'// validation run. Encoding that order as early returns keeps every',
			'// error site next to the rule that triggers it.',
			'func Apply(state string, cmd string) (string, string) {',
			'	// Gate 1 — the CLI. An unknown verb never reaches the daemon, so',
			'	// it cannot depend on state (not even "removed" changes the answer).',
			'	switch cmd {',
			'	case "start", "stop", "kill", "pause", "unpause", "restart", "rm", "rm -f":',
			'		// a real verb: fall through to the daemon',
			'	default:',
			'		return state, "docker: \'" + cmd + "\' is not a docker command"',
			'	}',
			'',
			'	// Gate 2 — the daemon\'s lookup. "removed" is not really a state;',
			'	// it is the absence of one. There is no record to transition, so',
			'	// every verb — including rm -f — gets the same lookup failure.',
			'	if state == "removed" {',
			'		return state, "Error response from daemon: no such container"',
			'	}',
			'',
			'	// Gate 3 — per-verb state validation. Each case returns the new',
			'	// state directly (plain returns: the machine\'s edges ARE the code).',
			'	// Falling out of the switch means the edge does not exist, and the',
			'	// shared fallthrough error at the bottom names the missing edge.',
			'	switch cmd {',
			'	case "start":',
			'		// Restartable-by-design: exit keeps the writable layer, so an',
			'		// exited container starts exactly like a created one.',
			'		if state == "created" || state == "exited" {',
			'			return "running", ""',
			'		}',
			'	case "stop":',
			'		// The famous edge: stop accepts PAUSED too. A frozen cgroup',
			'		// never schedules its processes, so a SIGTERM would sit',
			'		// undelivered forever — the daemon thaws first, then runs the',
			'		// normal SIGTERM -> grace period -> SIGKILL escalation.',
			'		if state == "running" || state == "paused" {',
			'			return "exited", ""',
			'		}',
			'	case "kill":',
			'		// Kill is bare signal delivery with none of stop\'s courtesy —',
			'		// and none of its unpause help. Frozen or dead: refused.',
			'		if state == "running" {',
			'			return "exited", ""',
			'		}',
			'	case "pause":',
			'		// The cgroup freezer needs live processes to freeze.',
			'		if state == "running" {',
			'			return "paused", ""',
			'		}',
			'	case "unpause":',
			'		if state == "paused" {',
			'			return "running", ""',
			'		}',
			'	case "restart":',
			'		// restart = stop-if-needed + start, so it accepts every state',
			'		// start-or-stop could handle alone — except paused, which the',
			'		// daemon refuses rather than guessing you meant unpause.',
			'		if state == "created" || state == "running" || state == "exited" {',
			'			return "running", ""',
			'		}',
			'	case "rm":',
			'		if state == "created" || state == "exited" {',
			'			return "removed", ""',
			'		}',
			'		// Removal deletes the container\'s writable layer and config.',
			'		// Doing that under a live overlay mount would corrupt the',
			'		// running filesystem, so the daemon refuses — and the message',
			'		// teaches the fix, which is why these two get bespoke errors',
			'		// instead of the generic template.',
			'		if state == "running" {',
			'			return state, "Error response from daemon: cannot remove a running container: stop it first or use rm -f"',
			'		}',
			'		if state == "paused" {',
			'			return state, "Error response from daemon: cannot remove a paused container: unpause and stop it first or use rm -f"',
			'		}',
			'	case "rm -f":',
			'		// Force = kill + rm fused in the daemon. Every live state was',
			'		// already admitted past gate 2, so this edge always fires.',
			'		return "removed", ""',
			'	}',
			'',
			'	// The missing-edge error. One template, assembled from the inputs,',
			'	// so adding a state or verb never means adding an error string.',
			'	return state, "Error response from daemon: cannot " + cmd + " container in state " + state',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Where the state machine actually lives</h3>' +
			'<p>The STATUS column is a rendering, not the truth. The truth is ' +
			'<code>docker inspect -f \'{{.State.Status}}\'</code> — a single field ' +
			'the daemon maintains from containerd/runc events, which ' +
			'<code>docker ps</code> then decorates: <code>running</code> becomes ' +
			'<code>Up 5 minutes</code>, a paused container shows ' +
			'<code>Up 5 minutes (Paused)</code> — note it still counts as up — and ' +
			'<code>exited</code> becomes <code>Exited (137) 3 minutes ago</code>, ' +
			'preserving the exit code as evidence. The real machine also has two ' +
			'states this model omits: <code>restarting</code> (a restart policy is ' +
			'mid-backoff — the next problem in this track) and <code>dead</code> ' +
			'(removal failed halfway, usually a busy mount; the zombie state every ' +
			'on-call engineer eventually meets).</p>' +
			'<h3>Why the surprising edges are shaped that way</h3>' +
			'<p><strong>stop on paused works</strong> because signals and the ' +
			'freezer interact badly: a frozen process is never scheduled, so a ' +
			'delivered SIGTERM would just sit pending while the grace period burns ' +
			'down — every stop of a paused container would take the full timeout ' +
			'and end in SIGKILL. Unpausing first lets PID 1 actually run its ' +
			'shutdown handler. <strong>kill refuses the same container</strong> ' +
			'because kill is defined as raw signal delivery — no thaw, no grace ' +
			'period — and the daemon would rather error than silently widen that ' +
			'contract. <strong>rm refuses live containers</strong> because removal ' +
			'deletes the writable overlay layer that is currently a mounted ' +
			'filesystem; <code>rm -f</code> is not a permission override but a ' +
			'different operation — kill, then remove. And one honest divergence ' +
			'from this model: real <code>docker start</code> on an ' +
			'already-running container is a silent no-op success, one of several ' +
			'idempotency conveniences the CLI layers over the daemon\'s stricter ' +
			'machine.</p>' +
			'<h3>When debugging</h3>' +
			'<p>Two habits pay off. First, <code>docker events --filter ' +
			'container=web</code> streams the edges as they fire — a ' +
			'<code>die</code> event with <code>exitCode=137</code> and no ' +
			'preceding <code>kill</code> from you means the kernel OOM killer ' +
			'(confirm with <code>docker inspect -f \'{{.State.OOMKilled}}\'</code>). ' +
			'Second, exit codes follow the shell convention 128&nbsp;+&nbsp;signal: ' +
			'143 is a clean SIGTERM shutdown, 137 after a <code>docker stop</code> ' +
			'means your app ignored SIGTERM for the whole grace period (often ' +
			'because a shell-form ENTRYPOINT made <code>sh</code> PID 1, and ' +
			'<code>sh</code> does not forward signals) and got SIGKILLed. That one ' +
			'diagnosis — <em>read the state machine, then the exit code</em> — ' +
			'resolves most "my container won\'t stop / won\'t die / won\'t ' +
			'delete" tickets without ever ssh-ing into the host.</p>',
		],
		complexity: { time: 'O(1) — a fixed cascade of verb and state comparisons', space: 'O(1)' },
	});
})();
