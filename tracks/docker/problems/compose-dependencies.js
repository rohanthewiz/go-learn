/* depends_on — Compose (Hard). What `docker compose up` computes BEFORE it
 * creates a single container: validate the dependency graph (undeclared
 * deps, service_healthy against a service with no healthcheck), refuse
 * cycles, then batch services into startup waves — Kahn's algorithm. The
 * harness pins a linear chain, a diamond, alphabetical order within waves,
 * the classic completed-successfully migration gate, and all three
 * refusal errors with exact messages.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// The service DAG from the war story, annotated with the wave each
	// service lands in. Marker ids namespaced (dgArrowDKCD) — every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="startup waves: db and cache start in wave 0; api waits for db to be healthy and cache to be started, so it lands in wave 1; web depends on api and lands in wave 2">' +
		'<text x="16" y="22" class="lbl">compose computes the WHOLE graph up front — validate, refuse cycles, then start in waves</text>' +
		// wave separators
		'<line x1="180" y1="36" x2="180" y2="172" stroke="var(--edge)" stroke-dasharray="4 4"/>' +
		'<line x1="360" y1="36" x2="360" y2="172" stroke="var(--edge)" stroke-dasharray="4 4"/>' +
		// wave 0: db (has a healthcheck) and cache
		'<rect x="30" y="44" width="104" height="38" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="82" y="68" text-anchor="middle">db</text>' +
		'<text x="82" y="98" text-anchor="middle" class="lbl" style="fill:var(--ok)">has healthcheck</text>' +
		'<rect x="30" y="124" width="104" height="38" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="82" y="148" text-anchor="middle">cache</text>' +
		// wave 1: api
		'<rect x="228" y="84" width="104" height="38" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="280" y="108" text-anchor="middle">api</text>' +
		// wave 2: web
		'<rect x="398" y="84" width="100" height="38" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="448" y="108" text-anchor="middle">web</text>' +
		// edges: dependency -> dependent (the direction startup flows)
		'<path d="M 134 66 C 180 70 200 84 222 96" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDKCDok)"/>' +
		'<text x="176" y="62" text-anchor="middle" class="lbl" style="fill:var(--ok)">service_healthy</text>' +
		'<path d="M 134 140 C 180 136 200 122 222 110" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKCD)"/>' +
		'<text x="176" y="156" text-anchor="middle" class="lbl">service_started</text>' +
		'<path d="M 332 103 L 392 103" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKCD)"/>' +
		'<text x="362" y="96" text-anchor="middle" class="lbl">service_started</text>' +
		// wave labels
		'<text x="90" y="192" text-anchor="middle" class="lbl">wave 0 — no deps</text>' +
		'<text x="270" y="192" text-anchor="middle" class="lbl">wave 1</text>' +
		'<text x="448" y="192" text-anchor="middle" class="lbl">wave 2</text>' +
		'<defs>' +
		'<marker id="dgArrowDKCD" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowDKCDok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'compose-dependencies',
		title: 'depends_on: startup order and health gates',
		nav: 'compose depends_on',
		difficulty: 'Hard',
		category: 'Compose',
		task: 'Implement StartOrder: validate the dependency graph (undeclared deps, service_healthy without a healthcheck), refuse cycles by name, and batch services into alphabetized startup waves.',

		prose: [
			'<h2>depends_on: startup order and health gates</h2>' +
			'<p>Fresh laptop, <code>docker compose up</code>, and the api service ' +
			'crash-loops: <code>connection refused</code> to Postgres, five restarts, ' +
			'then a clean run on the sixth. But <code>docker ps</code> showed the db ' +
			'container <em>Up</em> the whole time. It was — “up” means the postgres ' +
			'<em>process exists</em>, not that it has finished replaying WAL and is ' +
			'accepting connections. You add <code>depends_on: [db]</code> and nothing ' +
			'changes, because the short form is <code>service_started</code>: it gates ' +
			'on the container being created and running — exactly the useless ' +
			'guarantee you already had. The fix is a <em>condition</em>, and compose ' +
			'computes the whole ordered plan before it creates anything:</p>' +
			'<ul>' +
			'<li><strong>Three conditions.</strong> <code>depends_on</code> (long ' +
			'form) maps each dependency to <code>service_started</code> (container ' +
			'running), <code>service_healthy</code> (its healthcheck reports ' +
			'healthy), or <code>service_completed_successfully</code> (it ran to ' +
			'exit&nbsp;0 — the migration-job gate).</li>' +
			'<li><strong>Validate first.</strong> A dependency on an undeclared ' +
			'service is an error. <code>service_healthy</code> against a dependency ' +
			'that has <em>no healthcheck</em> is refused at up-time — a gate that ' +
			'could never open is a config bug, not something to hang on.</li>' +
			'<li><strong>Refuse cycles.</strong> A dependency cycle has no valid ' +
			'start order; compose errors out naming a service in the cycle.</li>' +
			'<li><strong>Then start in waves.</strong> Wave 0 is every service with ' +
			'no dependencies; wave <em>n</em> is every service whose dependencies ' +
			'all sit in earlier waves — a topological sort in batches (Kahn\'s ' +
			'algorithm), which is also the maximal safe parallelism.</li>' +
			'</ul>' +
			DIAGRAM,
			{ lang: 'txt', code: 'services:\n  api:\n    depends_on:\n      db:\n        condition: service_healthy\n        restart: true        # also restart api when db is replaced\n      cache:\n        condition: service_started\n  db:\n    healthcheck:\n      test: ["CMD-SHELL", "pg_isready -U app"]\n      interval: 5s' },
			'<h3>Your job</h3>' +
			'<p>Implement <code>StartOrder(svcs)</code> over the reduced model: ' +
			'validate (undeclared dependency, then <code>service_healthy</code> ' +
			'without a healthcheck — checking services and their deps in ' +
			'alphabetical order), detect cycles, otherwise return the startup ' +
			'waves with names sorted <strong>alphabetically within each wave</strong> ' +
			'for determinism. Errors come back as the second return value with the ' +
			'exact messages in the doc comment — waves must be <code>nil</code> on ' +
			'error, and nothing panics. To <em>name</em> a service on the cycle ' +
			'deterministically: start at the alphabetically first stuck service and ' +
			'repeatedly step to its alphabetically first not-yet-started dependency; ' +
			'the first service visited twice is provably on a cycle.</p>' +
			'<div class="tip">Field note: Go map iteration order is randomized per ' +
			'run. Every loop here that can influence output — validation order, the ' +
			'cycle walk — must impose its own order (sort the keys), or your error ' +
			'messages will flap between runs. The daemon-side compose code has the ' +
			'same problem and the same fix.</div>',
		],

		starter: [
			'package main',
			'',
			'// Svc is one service block from a compose file, reduced to exactly',
			'// what `docker compose up` needs to compute start order.',
			'type Svc struct {',
			'	Name           string',
			'	DependsOn      map[string]string // dependency name -> condition',
			'	HasHealthcheck bool',
			'}',
			'',
			'// StartOrder computes the startup plan compose builds before creating',
			'// any container. Conditions are "service_started", "service_healthy",',
			'// and "service_completed_successfully".',
			'//',
			'// Validation, checking services (and each service\'s deps) in',
			'// alphabetical order — first failure wins:',
			'//   - a dependency on an undeclared service:',
			'//       service %q depends on undeclared service %q',
			'//   - service_healthy against a dep with no healthcheck:',
			'//       service %q cannot require %q to be service_healthy: %q has no healthcheck',
			'//     (the last two %q are both the dependency name)',
			'//   - a dependency cycle (no service can start):',
			'//       dependency cycle detected involving service %q',
			'//     Name a service ON the cycle deterministically: from the',
			'//     alphabetically first stuck service, repeatedly step to its',
			'//     alphabetically first not-yet-started dependency; the first',
			'//     service seen twice is on a cycle.',
			'//',
			'// Otherwise return waves: wave 0 = services with no dependencies,',
			'// wave n = services whose deps all sit in earlier waves, names sorted',
			'// alphabetically WITHIN each wave. On error return (nil, message);',
			'// on success (waves, ""). Never panic.',
			'func StartOrder(svcs []Svc) ([][]string, string) {',
			'	// your code here',
			'	return nil, ""',
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
			'	// svc builds a service from (dep, condition) pairs.',
			'	svc := func(name string, hc bool, deps ...string) Svc {',
			'		m := map[string]string{}',
			'		for i := 0; i+1 < len(deps); i += 2 {',
			'			m[deps[i]] = deps[i+1]',
			'		}',
			'		return Svc{Name: name, DependsOn: m, HasHealthcheck: hc}',
			'	}',
			'	// show renders either the waves or the error, and enforces the',
			'	// nil-waves-on-error half of the contract.',
			'	show := func(svcs []Svc) string {',
			'		waves, errMsg := StartOrder(svcs)',
			'		if errMsg != "" {',
			'			if waves != nil {',
			'				return "error with non-nil waves: " + errMsg',
			'			}',
			'			return "ERR " + errMsg',
			'		}',
			'		return fmt.Sprintf("%v", waves)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"linear chain db -> api -> web: three waves of one",',
			'			"[[db] [api] [web]]",',
			'			func() string {',
			'				return show([]Svc{',
			'					svc("web", false, "api", "service_started"),',
			'					svc("api", false, "db", "service_started"),',
			'					svc("db", false),',
			'				})',
			'			}},',
			'		{"diamond: db+cache in wave 0, api gated on both, web on api",',
			'			"[[cache db] [api] [web]]",',
			'			func() string {',
			'				return show([]Svc{',
			'					svc("db", true),',
			'					svc("cache", false),',
			'					svc("api", false, "db", "service_healthy", "cache", "service_started"),',
			'					svc("web", false, "api", "service_started"),',
			'				})',
			'			}},',
			'		{"names sort alphabetically WITHIN a wave, whatever the declaration order",',
			'			"[[base] [alpha mid zeta]]",',
			'			func() string {',
			'				return show([]Svc{',
			'					svc("zeta", false, "base", "service_started"),',
			'					svc("mid", false, "base", "service_started"),',
			'					svc("alpha", false, "base", "service_started"),',
			'					svc("base", false),',
			'				})',
			'			}},',
			'		{"independent services: everything lands in wave 0",',
			'			"[[a b c]]",',
			'			func() string {',
			'				return show([]Svc{svc("c", false), svc("a", false), svc("b", false)})',
			'			}},',
			'		{"service_completed_successfully: the migration job gates the api",',
			'			"[[db] [migrate] [api]]",',
			'			func() string {',
			'				return show([]Svc{',
			'					svc("db", true),',
			'					svc("migrate", false, "db", "service_healthy"),',
			'					svc("api", false, "migrate", "service_completed_successfully"),',
			'				})',
			'			}},',
			'		{"a dependency on an undeclared service is an up-time error",',
			'			`ERR service "web" depends on undeclared service "api"`,',
			'			func() string {',
			'				return show([]Svc{svc("web", false, "api", "service_started")})',
			'			}},',
			'		{"service_healthy against a dep with no healthcheck is refused",',
			'			`ERR service "api" cannot require "db" to be service_healthy: "db" has no healthcheck`,',
			'			func() string {',
			'				return show([]Svc{',
			'					svc("db", false),',
			'					svc("api", false, "db", "service_healthy"),',
			'				})',
			'			}},',
			'		{"cycle a <-> b is detected and named — innocent dependent c is not blamed",',
			'			`ERR dependency cycle detected involving service "a"`,',
			'			func() string {',
			'				return show([]Svc{',
			'					svc("a", false, "b", "service_started"),',
			'					svc("b", false, "a", "service_started"),',
			'					svc("c", false, "a", "service_started"),',
			'				})',
			'			}},',
			'		{"a service depending on itself is the smallest cycle",',
			'			`ERR dependency cycle detected involving service "a"`,',
			'			func() string {',
			'				return show([]Svc{svc("a", false, "a", "service_started")})',
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
			'	"fmt"',
			'	"sort"',
			')',
			'',
			'// Svc is one service block from a compose file, reduced to exactly',
			'// what `docker compose up` needs to compute start order.',
			'type Svc struct {',
			'	Name           string',
			'	DependsOn      map[string]string // dependency name -> condition',
			'	HasHealthcheck bool',
			'}',
			'',
			'// sortedDeps returns a DependsOn key set in alphabetical order. Go',
			'// randomizes map iteration per run, so every loop that can influence',
			'// OUTPUT — which validation error fires first, which edge the cycle',
			'// walk follows — must impose its own order or the result flaps',
			'// between runs. Loops that only ask "are all deps started?" can',
			'// iterate the map directly; order cannot change a conjunction.',
			'func sortedDeps(m map[string]string) []string {',
			'	deps := make([]string, 0, len(m))',
			'	for d := range m {',
			'		deps = append(deps, d)',
			'	}',
			'	sort.Strings(deps)',
			'	return deps',
			'}',
			'',
			'// StartOrder is the plan `docker compose up` computes before creating',
			'// any container: validate the graph, refuse cycles, then batch the',
			'// services into startup waves (Kahn\'s algorithm).',
			'func StartOrder(svcs []Svc) ([][]string, string) {',
			'	// Index by name, and fix ONE deterministic iteration order — the',
			'	// sorted name list — that every phase below walks. This single',
			'	// choice is what makes waves come out alphabetized for free.',
			'	byName := make(map[string]Svc, len(svcs))',
			'	names := make([]string, 0, len(svcs))',
			'	for _, s := range svcs {',
			'		byName[s.Name] = s',
			'		names = append(names, s.Name)',
			'	}',
			'	sort.Strings(names)',
			'',
			'	// Phase 1 — validate every edge before ordering anything. Compose',
			'	// front-loads these checks because both are configuration bugs no',
			'	// amount of waiting can fix: an undeclared dep will never exist,',
			'	// and a service_healthy gate on a dep with no healthcheck would',
			'	// wait forever — the dep has no way to ever REPORT healthy. (That',
			'	// gate is the whole point: service_started only means the process',
			'	// exists, which for a database guarantees nothing.)',
			'	for _, n := range names {',
			'		s := byName[n]',
			'		for _, d := range sortedDeps(s.DependsOn) {',
			'			dep, declared := byName[d]',
			'			if !declared {',
			'				return nil, fmt.Sprintf("service %q depends on undeclared service %q", n, d)',
			'			}',
			'			if s.DependsOn[d] == "service_healthy" && !dep.HasHealthcheck {',
			'				return nil, fmt.Sprintf("service %q cannot require %q to be service_healthy: %q has no healthcheck", n, d, d)',
			'			}',
			'		}',
			'	}',
			'',
			'	// Phase 2 — Kahn\'s algorithm, batched. Instead of emitting one',
			'	// service at a time, each pass collects EVERY service whose deps',
			'	// have all started: that batch is a wave, and it is exactly the',
			'	// set compose may start in parallel. started/remaining partition',
			'	// the services, so "dep not started" == "dep still remaining".',
			'	started := make(map[string]bool, len(names))',
			'	remaining := make(map[string]bool, len(names))',
			'	for _, n := range names {',
			'		remaining[n] = true',
			'	}',
			'	var waves [][]string',
			'	for len(remaining) > 0 {',
			'		var wave []string',
			'		for _, n := range names { // sorted names => wave arrives sorted',
			'			if !remaining[n] {',
			'				continue',
			'			}',
			'			ready := true',
			'			for d := range byName[n].DependsOn { // order-free: pure AND',
			'				if !started[d] {',
			'					ready = false',
			'					break',
			'				}',
			'			}',
			'			if ready {',
			'				wave = append(wave, n)',
			'			}',
			'		}',
			'		// Progress stalled with services left: every one of them is',
			'		// waiting on another — the definition of a cycle (or of being',
			'		// downstream of one). This is Kahn\'s cycle test.',
			'		if len(wave) == 0 {',
			'			return nil, fmt.Sprintf("dependency cycle detected involving service %q", onCycle(names, byName, remaining))',
			'		}',
			'		for _, n := range wave {',
			'			started[n] = true',
			'			delete(remaining, n)',
			'		}',
			'		waves = append(waves, wave)',
			'	}',
			'	return waves, ""',
			'}',
			'',
			'// onCycle names a service that is provably ON a cycle — not merely',
			'// stuck behind one. A stuck service always has at least one unmet',
			'// dependency, and (post-validation) that dependency is itself a stuck',
			'// service, so following unmet-dependency edges can never leave the',
			'// stuck set and must eventually revisit a node. The first node seen',
			'// twice closes a loop in the walk, hence lies on a real cycle.',
			'// Innocent dependents (c -> a in a<->b) get walked THROUGH, not named.',
			'func onCycle(names []string, byName map[string]Svc, remaining map[string]bool) string {',
			'	cur := ""',
			'	for _, n := range names { // alphabetically first stuck service',
			'		if remaining[n] {',
			'			cur = n',
			'			break',
			'		}',
			'	}',
			'	seen := make(map[string]bool)',
			'	for !seen[cur] {',
			'		seen[cur] = true',
			'		for _, d := range sortedDeps(byName[cur].DependsOn) {',
			'			if remaining[d] { // first unmet dep, alphabetically',
			'				cur = d',
			'				break',
			'			}',
			'		}',
			'	}',
			'	return cur',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why service_healthy exists at all</h3>' +
			'<p>The bug that motivates this whole item is that ' +
			'<code>service_started</code> gates nothing useful for a database: the ' +
			'container is “running” the instant PID 1 exists, while Postgres may ' +
			'still be initializing a data directory or replaying WAL for another ' +
			'thirty seconds. For years the community workaround was ' +
			'<code>wait-for-it.sh</code> wrapped around every entrypoint — a shell ' +
			'loop polling a TCP port from the <em>consumer</em> side. Health-gating ' +
			'inverts that, and better: the readiness definition moves into the one ' +
			'service that actually knows what ready means ' +
			'(<code>pg_isready</code>, not “port 5432 accepts a SYN” — Postgres ' +
			'accepts connections during crash recovery and then errors). Every ' +
			'consumer inherits the gate by declaring a condition instead of ' +
			'shipping a copy of the polling script. And the up-time refusal you ' +
			'implemented — <code>service_healthy</code> against a dep with no ' +
			'healthcheck — exists because that gate could never open: compose ' +
			'fails fast on the config bug rather than hanging forever.</p>' +
			'<h3>Waves are Kahn\'s algorithm wearing a compose shirt</h3>' +
			'<p>Batched topological sort gives compose two things a plain ordering ' +
			'would not. First, <strong>maximal parallelism</strong>: everything in ' +
			'a wave is provably safe to start concurrently, which is why ' +
			'<code>up</code> on a big project starts many containers at once ' +
			'rather than one by one. Second, a <strong>free cycle detector</strong>: ' +
			'if a pass places nothing while services remain, every remaining ' +
			'service waits on another — the definition of a deadlocked graph. ' +
			'Naming a service actually <em>on</em> the cycle (rather than the ' +
			'first stuck one) matters for the error message: in ' +
			'<code>a&nbsp;&harr;&nbsp;b&nbsp;&larr;&nbsp;c</code>, blaming the ' +
			'innocent dependent <code>c</code> would send the user staring at the ' +
			'wrong service block. The walk-until-revisit trick is the standard way ' +
			'to upgrade “Kahn stalled” into “here is a witness”.</p>' +
			'<h3>Conditions gate STARTUP only</h3>' +
			'<p>The part that surprises people in production: once a dependent has ' +
			'started, the condition is <em>done</em>. If db dies an hour later, ' +
			'api keeps running — <code>depends_on</code> is a startup ordering ' +
			'constraint, not a supervisor, and there is no steady-state contract. ' +
			'The knobs that DO touch steady state are separate: ' +
			'<code>--abort-on-container-exit</code> tears the whole project down ' +
			'when any container exits (test pipelines), <code>restart: true</code> ' +
			'in the long form re-restarts the dependent when its dependency is ' +
			'<em>replaced</em> (e.g. <code>compose up</code> recreating db after a ' +
			'config edit), and develop/watch mode has its own rebuild rules. ' +
			'Confusing “ordered start” with “supervised forever” is the second ' +
			'most common depends_on bug after the started-vs-healthy one.</p>' +
			'<div class="tip">Debugging field note: <code>docker compose config</code> ' +
			'prints the fully resolved model — short-form <code>depends_on</code> ' +
			'lists expanded into long-form maps with ' +
			'<code>condition: service_started</code> spelled out. Seeing that ' +
			'expansion is usually the moment the started-vs-healthy bug clicks. ' +
			'And a healthcheck\'s <code>start_period</code> matters here: probes ' +
			'that fail during it don\'t count against <code>retries</code>, but ' +
			'the gate still opens only on the first success.</div>',
		],
		complexity: { time: 'O(W·(V+E)) as written — each of W waves rescans the graph; classic indegree-counting Kahn is O(V+E). Sorting adds O(V log V + E log E).', space: 'O(V + E) for the index, partitions, and waves' },
	});
})();
