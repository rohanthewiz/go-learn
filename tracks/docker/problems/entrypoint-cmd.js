/* ENTRYPOINT vs CMD — Images & Builds (Easy). The interaction table everyone
 * half-remembers: exec form vs shell form, CMD appended vs CMD ignored, run
 * args replacing CMD but never ENTRYPOINT, and --entrypoint quietly dropping
 * the image CMD. The learner implements EffectiveArgv — the exact argv
 * assembly the daemon performs before exec()ing PID 1 — and the harness pins
 * every row of the table, including the shell-form wrap that explains the
 * infamous 10-second `docker stop` hang.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// The three assembly paths, one per row: exec ENTRYPOINT concatenates,
	// shell ENTRYPOINT discards CMD, and run args only ever overwrite the CMD
	// slot. Marker ids namespaced (dgArrowDKEC) — every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 252" width="540" height="252" role="img" aria-label="how docker assembles argv: an exec-form ENTRYPOINT gets CMD appended as arguments; a shell-form ENTRYPOINT is wrapped in /bin/sh -c and ignores CMD entirely; docker run arguments replace only the CMD slot, never the ENTRYPOINT">' +
		'<text x="16" y="22" class="lbl">argv assembly: the ENTRYPOINT’s form decides what happens to CMD</text>' +
		// row 1: exec ENTRYPOINT + CMD -> concatenated
		'<rect x="16" y="38" width="168" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="100" y="60" text-anchor="middle">exec ENTRYPOINT</text>' +
		'<text x="197" y="60" text-anchor="middle">+</text>' +
		'<rect x="210" y="38" width="96" height="34" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="258" y="60" text-anchor="middle">CMD</text>' +
		'<path d="M 312 55 L 352 55" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKEC)"/>' +
		'<rect x="356" y="38" width="168" height="34" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="440" y="60" text-anchor="middle" class="lbl">entrypoint + cmd appended</text>' +
		// row 2: shell ENTRYPOINT -> wrapped, CMD discarded
		'<rect x="16" y="98" width="168" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="100" y="120" text-anchor="middle">shell ENTRYPOINT</text>' +
		'<rect x="210" y="98" width="96" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-dasharray="4 3"/>' +
		'<text x="258" y="120" text-anchor="middle" class="lbl" style="fill:var(--warn)">CMD ignored</text>' +
		'<path d="M 184 115 C 210 148 300 148 352 122" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDKECwarn)"/>' +
		'<rect x="356" y="98" width="168" height="34" rx="5" fill="none" stroke="var(--warn)"/>' +
		'<text x="440" y="120" text-anchor="middle" class="lbl">/bin/sh -c "&lt;string&gt;"</text>' +
		'<text x="270" y="158" text-anchor="middle" class="lbl" style="fill:var(--warn)">PID 1 is /bin/sh — your app never sees SIGTERM</text>' +
		// row 3: run args overwrite the CMD slot only
		'<rect x="16" y="178" width="200" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="116" y="200" text-anchor="middle">docker run img args…</text>' +
		'<path d="M 220 195 C 250 195 240 82 252 76" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDKECacc)"/>' +
		'<text x="300" y="200" class="lbl">run args land in the CMD slot — they never touch ENTRYPOINT</text>' +
		'<text x="16" y="238" class="lbl">--entrypoint replaces the ENTRYPOINT slot AND empties the CMD slot: only run args survive</text>' +
		'<defs>' +
		'<marker id="dgArrowDKEC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowDKECwarn" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowDKECacc" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'entrypoint-cmd',
		title: 'ENTRYPOINT vs CMD: the interaction table',
		nav: 'entrypoint & cmd',
		difficulty: 'Easy',
		category: 'Images & Builds',
		task: 'Implement EffectiveArgv: assemble the container\'s argv from ENTRYPOINT, CMD, docker run args, and --entrypoint — encoding the full form-interaction table.',

		prose: [
			'<h2>ENTRYPOINT vs CMD: the interaction table</h2>' +
			'<p>You add a debug flag — <code>docker run myapi --verbose</code> — and ' +
			'the container dies instantly with <code>exec: "--verbose": executable ' +
			'file not found in $PATH</code>. A teammate tries ' +
			'<code>docker run myapi bash</code> to poke around and gets the app\'s ' +
			'usage message instead of a shell. And every <code>docker stop</code> of ' +
			'a third image hangs for exactly ten seconds before the container dies. ' +
			'All three are the same mechanism: how the daemon assembles the ' +
			'container\'s argv from four inputs — the image\'s ENTRYPOINT and CMD, ' +
			'the args after the image name, and <code>--entrypoint</code>. Model ' +
			'each Dockerfile directive as <code>Directive{Args []string, Shell ' +
			'bool}</code> — <em>exec form</em> is the JSON array ' +
			'(<code>CMD ["nginx", "-g", "daemon off;"]</code>, ' +
			'<code>Shell=false</code>), <em>shell form</em> is the bare string ' +
			'(<code>CMD nginx -g "daemon off;"</code>, <code>Shell=true</code>). The ' +
			'rules:</p>' +
			'<ul>' +
			'<li><strong>Shell form wraps.</strong> A shell-form directive becomes ' +
			'<code>["/bin/sh", "-c", "&lt;the words joined by spaces&gt;"]</code>. ' +
			'The daemon never parses your string — the shell does, at runtime.</li>' +
			'<li><strong>CMD alone is the whole argv.</strong> No ENTRYPOINT: the ' +
			'(resolved) CMD is what gets exec()ed.</li>' +
			'<li><strong>Exec-form ENTRYPOINT gets CMD appended.</strong> The ' +
			'resolved CMD — wrapped first if it was shell form — is appended as ' +
			'<em>arguments</em>. This is the "ENTRYPOINT is the program, CMD is its ' +
			'default flags" pattern.</li>' +
			'<li><strong>Shell-form ENTRYPOINT ignores CMD entirely.</strong> Not ' +
			'"appends it inside the shell" — ignores it. The argv is just the ' +
			'<code>/bin/sh -c</code> wrap of the ENTRYPOINT string.</li>' +
			'<li><strong>Run args replace CMD, never ENTRYPOINT.</strong> Everything ' +
			'after the image name in <code>docker run image args…</code> lands ' +
			'in the CMD slot as exec form. That\'s why <code>bash</code> became an ' +
			'argument to the app above.</li>' +
			'<li><strong><code>--entrypoint</code> replaces ENTRYPOINT and drops ' +
			'the image CMD.</strong> Only run args are appended after the override — ' +
			'the image\'s default CMD does not come along for the ride.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>The official docs compress this into one table — the one everyone ' +
			'half-remembers under pressure:</p>' +
			{ lang: 'txt', code: '                     no ENTRYPOINT       exec ENTRYPOINT ["ep"]     shell ENTRYPOINT ep\nno CMD               error: no command   ep                         /bin/sh -c "ep"\nexec CMD ["c"]       c                   ep c                       /bin/sh -c "ep"\nshell CMD c          /bin/sh -c "c"      ep /bin/sh -c "c"          /bin/sh -c "ep"' },
			'<h3>Your job</h3>' +
			'<p>Implement <code>EffectiveArgv(entrypoint, cmd, runArgs, ' +
			'entrypointOverride)</code> — the daemon\'s argv assembly. An unset ' +
			'directive is the zero-value <code>Directive</code> (nil ' +
			'<code>Args</code>); a nil <code>entrypointOverride</code> means ' +
			'<code>--entrypoint</code> was not given. Apply the CLI inputs first ' +
			'(override replaces ENTRYPOINT and empties CMD; run args replace CMD), ' +
			'then resolve the table above. Both unset with no args is the daemon\'s ' +
			'"no command specified" error — return an empty argv for it here.</p>',
			'<div class="tip">The ten-second <code>docker stop</code> hang is the ' +
			'shell-form wrap biting: PID 1 inside the container is ' +
			'<code>/bin/sh</code>, your app is its child, and <code>sh</code> does ' +
			'not forward SIGTERM. <code>docker stop</code> sends SIGTERM to PID 1, ' +
			'waits ten seconds for a graceful exit that never comes, then SIGKILLs ' +
			'the whole thing. Exec-form ENTRYPOINT — or <code>exec "$@"</code> as ' +
			'the last line of a wrapper script — puts your app at PID 1 and makes ' +
			'stops instant.</div>',
		],

		starter: [
			'package main',
			'',
			'// Directive models one Dockerfile directive value (ENTRYPOINT or CMD).',
			'//',
			'//   - exec form  (JSON array)  -> Args are the literal argv words, Shell=false',
			'//   - shell form (bare string) -> Args are the string\'s words, Shell=true',
			'//   - unset                    -> the zero value: nil Args, Shell=false',
			'type Directive struct {',
			'	Args  []string',
			'	Shell bool',
			'}',
			'',
			'// EffectiveArgv assembles the argv the daemon exec()s as the container\'s',
			'// PID 1, from the image\'s ENTRYPOINT and CMD plus the two CLI inputs.',
			'//',
			'//   - a shell-form directive resolves to ["/bin/sh", "-c", "<words joined by single spaces>"]',
			'//   - entrypointOverride (--entrypoint) non-nil: it REPLACES the image',
			'//     ENTRYPOINT and DROPS the image CMD — only runArgs are appended',
			'//   - runArgs (args after the image name) non-empty: they REPLACE CMD',
			'//     as an exec-form directive; they never touch ENTRYPOINT',
			'//   - no ENTRYPOINT: the resolved CMD is the whole argv',
			'//   - exec-form ENTRYPOINT: the resolved CMD is appended as arguments',
			'//   - shell-form ENTRYPOINT: CMD is ignored ENTIRELY',
			'//   - nothing set anywhere: return an empty argv (the daemon\'s',
			'//     "no command specified" error)',
			'func EffectiveArgv(entrypoint, cmd Directive, runArgs []string, entrypointOverride []string) []string {',
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
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// %q on a []string prints ["a" "b"] — stable, quoting-safe output',
			'	// for wants (several argv words contain spaces and semicolons).',
			'	q := func(v []string) string { return fmt.Sprintf("%q", v) }',
			'	none := Directive{} // unset: zero value, nil Args',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"CMD alone (exec form) is the whole argv",',
			'			`["nginx" "-g" "daemon off;"]`,',
			'			func() string {',
			'				return q(EffectiveArgv(none, Directive{Args: []string{"nginx", "-g", "daemon off;"}}, nil, nil))',
			'			}},',
			'		{"ENTRYPOINT alone (exec form): runs with no arguments",',
			'			`["redis-server"]`,',
			'			func() string {',
			'				return q(EffectiveArgv(Directive{Args: []string{"redis-server"}}, none, nil, nil))',
			'			}},',
			'		{"exec ENTRYPOINT + exec CMD: CMD appended as arguments",',
			'			`["python" "app.py" "--port" "8080"]`,',
			'			func() string {',
			'				return q(EffectiveArgv(',
			'					Directive{Args: []string{"python", "app.py"}},',
			'					Directive{Args: []string{"--port", "8080"}}, nil, nil))',
			'			}},',
			'		{"shell-form ENTRYPOINT wraps in /bin/sh -c and ignores CMD entirely",',
			'			`["/bin/sh" "-c" "./start.sh --migrate"]`,',
			'			func() string {',
			'				return q(EffectiveArgv(',
			'					Directive{Args: []string{"./start.sh", "--migrate"}, Shell: true},',
			'					Directive{Args: []string{"--help"}}, nil, nil))',
			'			}},',
			'		{"docker run args replace CMD — the ENTRYPOINT stays put",',
			'			`["curl" "-fsS" "https://example.com/ready"]`,',
			'			func() string {',
			'				return q(EffectiveArgv(',
			'					Directive{Args: []string{"curl", "-fsS"}},',
			'					Directive{Args: []string{"https://example.com/health"}},',
			'					[]string{"https://example.com/ready"}, nil))',
			'			}},',
			'		{"--entrypoint override drops the image CMD (it does NOT come along)",',
			'			`["/bin/bash"]`,',
			'			func() string {',
			'				return q(EffectiveArgv(',
			'					Directive{Args: []string{"nginx"}},',
			'					Directive{Args: []string{"-g", "daemon off;"}},',
			'					nil, []string{"/bin/bash"}))',
			'			}},',
			'		{"--entrypoint override + run args: only the run args are appended",',
			'			`["sh" "-c" "env"]`,',
			'			func() string {',
			'				return q(EffectiveArgv(',
			'					Directive{Args: []string{"nginx"}},',
			'					Directive{Args: []string{"-g", "daemon off;"}},',
			'					[]string{"-c", "env"}, []string{"sh"}))',
			'			}},',
			'		{"shell-form CMD alone wraps in /bin/sh -c",',
			'			`["/bin/sh" "-c" "npm start"]`,',
			'			func() string {',
			'				return q(EffectiveArgv(none, Directive{Args: []string{"npm", "start"}, Shell: true}, nil, nil))',
			'			}},',
			'		{"exec ENTRYPOINT + shell CMD: the /bin/sh -c wrap is appended as arguments",',
			'			`["tini" "--" "/bin/sh" "-c" "node server.js"]`,',
			'			func() string {',
			'				return q(EffectiveArgv(',
			'					Directive{Args: []string{"tini", "--"}},',
			'					Directive{Args: []string{"node", "server.js"}, Shell: true}, nil, nil))',
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
			'import "strings"',
			'',
			'// Directive models one Dockerfile directive value (ENTRYPOINT or CMD).',
			'//',
			'//   - exec form  (JSON array)  -> Args are the literal argv words, Shell=false',
			'//   - shell form (bare string) -> Args are the string\'s words, Shell=true',
			'//   - unset                    -> the zero value: nil Args, Shell=false',
			'type Directive struct {',
			'	Args  []string',
			'	Shell bool',
			'}',
			'',
			'// resolve turns one directive into concrete argv words. This is the',
			'// only place the exec/shell distinction exists: shell form becomes a',
			'// three-word argv whose real content is a single opaque string that',
			'// /bin/sh will parse at RUNTIME. That opacity is the whole story —',
			'// the daemon cannot append anything meaningful to a shell command it',
			'// never parsed, which is why shell-form ENTRYPOINT discards CMD and',
			'// why the process at PID 1 is sh, not your app.',
			'func resolve(d Directive) []string {',
			'	if d.Shell {',
			'		return []string{"/bin/sh", "-c", strings.Join(d.Args, " ")}',
			'	}',
			'	// Exec form is already argv words — nil for an unset directive,',
			'	// which appends as nothing and returns as empty, both correct.',
			'	return d.Args',
			'}',
			'',
			'// EffectiveArgv assembles the container\'s PID-1 argv. Order matters:',
			'// the CLI inputs are applied to the SLOTS first (override -> the',
			'// ENTRYPOINT slot + empties CMD; run args -> the CMD slot), and only',
			'// then does the ENTRYPOINT\'s form decide how the slots combine.',
			'// Modeling it as slot-edits-then-combine is exactly how the daemon',
			'// does it: docker run builds a final config from image config + CLI,',
			'// and the OCI runtime only ever sees the merged result.',
			'func EffectiveArgv(entrypoint, cmd Directive, runArgs []string, entrypointOverride []string) []string {',
			'	// --entrypoint: replaces the ENTRYPOINT slot AND empties the CMD',
			'	// slot. The image\'s default CMD was written to complement the',
			'	// image\'s entrypoint; carrying it behind an arbitrary override',
			'	// would inject nonsense args, so the daemon drops it. Run args',
			'	// (the new CMD) are still appended — exec-form combine below.',
			'	if entrypointOverride != nil {',
			'		entrypoint = Directive{Args: entrypointOverride}',
			'		cmd = Directive{Args: runArgs}',
			'	} else if len(runArgs) > 0 {',
			'		// Args after the image name replace CMD wholesale — never',
			'		// merged with it, never applied to ENTRYPOINT. They arrive',
			'		// pre-split by the caller\'s shell, so they are exec form.',
			'		cmd = Directive{Args: runArgs}',
			'	}',
			'',
			'	// Unset ENTRYPOINT: the resolved CMD is the entire argv (a',
			'	// shell-form CMD wraps here). Both unset resolves to an empty',
			'	// argv — the daemon\'s "no command specified" error.',
			'	if entrypoint.Args == nil && !entrypoint.Shell {',
			'		return resolve(cmd)',
			'	}',
			'',
			'	// Shell-form ENTRYPOINT: /bin/sh -c "<string>" IS the argv.',
			'	// CMD — image default or run args alike — is ignored entirely:',
			'	// sh -c takes one command string, and anything appended after it',
			'	// would become $0/$1... of the script, not part of the command.',
			'	if entrypoint.Shell {',
			'		return resolve(entrypoint)',
			'	}',
			'',
			'	// Exec-form ENTRYPOINT: the resolved CMD is appended as plain',
			'	// arguments. A shell-form CMD wraps FIRST, so the entrypoint',
			'	// receives ["/bin/sh", "-c", "..."] as its args — three literal',
			'	// words like any others. Fresh slice: never alias the caller\'s',
			'	// backing array via append-on-shared-capacity.',
			'	out := make([]string, 0, len(entrypoint.Args)+3)',
			'	out = append(out, entrypoint.Args...)',
			'	out = append(out, resolve(cmd)...)',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the table is shaped this way</h3>' +
			'<p>The design intent behind the two directives: <strong>ENTRYPOINT is ' +
			'the image\'s identity, CMD is its default arguments.</strong> An image ' +
			'built as <code>ENTRYPOINT ["redis-server"]</code> + ' +
			'<code>CMD ["--appendonly", "yes"]</code> behaves like an installed ' +
			'binary — <code>docker run redis --port 7000</code> reads naturally ' +
			'because run args replace only the <em>default flags</em>, never the ' +
			'program. Every rule in the table follows from that split: run args ' +
			'land in the CMD slot; <code>--entrypoint</code> changes the program ' +
			'and therefore drops flags that were written for a <em>different</em> ' +
			'program; and exec-form append is just "program + args".</p>' +
			'<p>The shell-form rules follow from a different constraint: ' +
			'<code>sh -c</code> takes exactly <em>one</em> command string. The ' +
			'daemon never parses that string, so it cannot splice CMD into it — ' +
			'and anything appended <em>after</em> it would be bound as the ' +
			'script\'s <code>$0</code>, <code>$1</code>… positional ' +
			'parameters, silently invisible unless the script reads them. Rather ' +
			'than produce args that vanish, the daemon ignores CMD outright. ' +
			'"Shell-form ENTRYPOINT ignores CMD" is not an arbitrary table row; ' +
			'it is the only coherent option.</p>' +
			'<h3>The PID 1 trap</h3>' +
			'<p>Shell form has a second, nastier cost. The container\'s argv ' +
			'starts at PID 1, so with <code>ENTRYPOINT node server.js</code> ' +
			'PID 1 is <code>/bin/sh</code> and node is a child. ' +
			'<code>docker stop</code> sends SIGTERM to PID 1 only — and stock ' +
			'<code>sh</code> does not forward signals to children. Your app never ' +
			'hears the shutdown; the daemon waits the grace period (ten seconds ' +
			'by default) and SIGKILLs the cgroup. Every "graceful shutdown ' +
			'handler that never fires" bug report should start with ' +
			'<code>docker exec &lt;c&gt; cat /proc/1/cmdline</code>. Fixes, in ' +
			'order of preference: exec-form ENTRYPOINT; a wrapper script whose ' +
			'last line is <code>exec "$@"</code> (exec <em>replaces</em> the ' +
			'shell, promoting your app to PID 1); or an init like ' +
			'<code>tini</code> (<code>docker run --init</code>) that reaps and ' +
			'forwards properly.</p>' +
			'<h3>Field notes</h3>' +
			'<p>When a container starts with the wrong command, stop guessing and ' +
			'read the slots: <code>docker inspect --format ' +
			'\'{{.Config.Entrypoint}} {{.Config.Cmd}}\' image</code> shows ' +
			'exactly what the base image left you — the classic surprise is a ' +
			'base image with a non-obvious ENTRYPOINT eating your CMD as ' +
			'arguments. Note also that CMD and ENTRYPOINT each <em>replace</em> ' +
			'across Dockerfile layers (last one wins, and a CMD inherited from ' +
			'the base is cleared when you set a new ENTRYPOINT in some ' +
			'builders). Finally, this exact table ships with you to Kubernetes: ' +
			'<code>command:</code> overrides ENTRYPOINT and <code>args:</code> ' +
			'overrides CMD — and specifying <code>command:</code> alone drops ' +
			'the image\'s default args, the same "override drops CMD" rule you ' +
			'just implemented.</p>',
		],
		complexity: { time: 'O(e + c + r) — one pass over the entrypoint, cmd, and run-arg words', space: 'O(e + c + r) for the assembled argv' },
	});
})();
