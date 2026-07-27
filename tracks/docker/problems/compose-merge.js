/* Compose File Merging — Compose (Medium). How `-f compose.yml -f
 * compose.override.yml` turns two service definitions into one: scalars
 * replace, mappings merge per key, sequences append with dedupe. The harness
 * pins the replace-vs-survive rule for empty scalars, per-key env collisions,
 * append-only ports (the "why is 80 still published" gotcha), and the
 * pass-through of services present in only one file.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// Two files converge on one effective model; the center column names the
	// three type-keyed merge rules. Marker id namespaced (dgArrowDKCM) because
	// every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 232" width="520" height="232" role="img" aria-label="two compose files merge into one effective model: scalar fields replace, mapping fields merge per key, sequence fields append with duplicates removed">' +
		'<text x="14" y="20" class="lbl">two files, one service — the merge rule is chosen by YAML node type, not by field name</text>' +
		// the base file
		'<rect x="10" y="36" width="192" height="46" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="106" y="56" text-anchor="middle">compose.yml</text>' +
		'<text x="106" y="74" text-anchor="middle" class="lbl">base — first -f</text>' +
		// the override file
		'<rect x="10" y="150" width="192" height="46" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="106" y="170" text-anchor="middle">compose.override.yml</text>' +
		'<text x="106" y="188" text-anchor="middle" class="lbl">auto-loaded — the local-hacks file</text>' +
		// the merged result
		'<rect x="344" y="93" width="166" height="50" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="427" y="113" text-anchor="middle">effective model</text>' +
		'<text x="427" y="131" text-anchor="middle" class="lbl">docker compose config</text>' +
		// both files flow into the merge
		'<path d="M 206 59 C 258 59 296 88 340 106" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKCM)"/>' +
		'<path d="M 206 173 C 258 173 296 144 340 128" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowDKCM)"/>' +
		// the three rules, keyed by type
		'<text x="270" y="102" text-anchor="middle" class="lbl" style="fill:var(--accent)">scalars → replace</text>' +
		'<text x="270" y="116" text-anchor="middle" class="lbl">maps → merge per key</text>' +
		'<text x="270" y="130" text-anchor="middle" class="lbl" style="fill:var(--warn)">lists → append + dedupe</text>' +
		'<text x="260" y="214" text-anchor="middle" class="lbl">scalar: image, command · map: environment, labels · list: ports, volumes, depends_on</text>' +
		'<text x="260" y="228" text-anchor="middle" class="lbl" style="fill:var(--warn)">append-only lists mean an override can never REMOVE a port — that\'s what !reset exists for</text>' +
		'<defs><marker id="dgArrowDKCM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'compose-merge',
		title: 'Compose File Merging: -f base -f override',
		nav: 'compose merge',
		difficulty: 'Medium',
		category: 'Compose',
		task: 'Implement MergeService (scalars replace when non-empty, maps merge per key, sequences append base-then-override with dedupe) and MergeProject (services in one file pass through; in both, MergeService).',

		prose: [
			'<h2>Compose File Merging: -f base -f override</h2>' +
			'<p>Staging deploy, Friday. To move the app off port 80 you added ' +
			'<code>ports: ["8080:80"]</code> to <code>compose.staging.yml</code> and ' +
			'deployed with <code>-f compose.yml -f compose.staging.yml</code> — and ' +
			'<code>docker compose ps</code> shows the service published on ' +
			'<strong>both</strong> 80 and 8080. Meanwhile a teammate\'s local stack ' +
			'has a bind mount and a debug env var that appear in no file you can ' +
			'find… until you spot <code>compose.override.yml</code> in their working ' +
			'tree: plain <code>docker compose up</code> loads it automatically on ' +
			'top of <code>compose.yml</code>. Both mysteries are one mechanism: ' +
			'compose merges service definitions file by file, left to right, and ' +
			'the merge rule is chosen by the YAML <em>type</em> of each field:</p>' +
			'<ul>' +
			'<li><strong>Single-value fields</strong> (<code>image</code>, ' +
			'<code>command</code>): the later file <em>replaces</em> the earlier ' +
			'one when it says anything; a field the override leaves empty lets the ' +
			'base survive. <code>command</code> is replaced wholesale — compose ' +
			'never merges argv.</li>' +
			'<li><strong>Mapping fields</strong> (<code>environment</code>, ' +
			'<code>labels</code>): merged <em>per key</em>. The override wins ' +
			'collisions; base-only keys survive — which is why an override can ' +
			'flip <code>LOG_LEVEL</code> without repeating the other twelve ' +
			'variables.</li>' +
			'<li><strong>Sequence fields</strong> (<code>ports</code>, ' +
			'<code>volumes</code>, <code>depends_on</code>): <em>appended</em>, ' +
			'base first then override, with exact-string duplicates dropped (first ' +
			'occurrence kept, order preserved). Append-only is the sharp edge: an ' +
			'override can add a port but can <strong>never remove one</strong>.</li>' +
			'<li><strong>Files, not fields, are the unit of layering.</strong> ' +
			'<code>-f</code> order matters — later wins — and with no ' +
			'<code>-f</code> at all, compose loads <code>compose.yml</code> ' +
			'<em>plus</em> <code>compose.override.yml</code> if present: the ' +
			'officially blessed home for local-only tweaks, and the reason they ' +
			'"mysteriously" apply.</li>' +
			'</ul>' +
			DIAGRAM +
			{ lang: 'txt', code: 'compose.yml            compose.override.yml    merged (docker compose config)\nimage: nginx:1.25      image: nginx:1.27       image: nginx:1.27      <- replaced\nenvironment:           environment:            environment:\n  LOG_LEVEL: info        LOG_LEVEL: debug        LOG_LEVEL: debug     <- collision: override wins\n  DB_HOST: db                                    DB_HOST: db          <- base-only key survives\nports:                 ports:                  ports:\n  - "80:80"              - "8080:80"             - "80:80"            <- STILL published\n                                                 - "8080:80"          <- appended' },
			'<h3>Your job</h3>' +
			'<p>Implement the merge over a modeled <code>Service</code> struct. ' +
			'<code>MergeService(base, override)</code> applies the three type-keyed ' +
			'rules field by field: scalars (<code>Image</code>, ' +
			'<code>Command</code>) replace only when the override is non-empty; ' +
			'maps (<code>Environment</code>, <code>Labels</code>) merge per key ' +
			'with the override winning; sequences (<code>Ports</code>, ' +
			'<code>Volumes</code>, <code>DependsOn</code>) append base-then-override ' +
			'and drop exact-string duplicates, keeping the first occurrence and its ' +
			'order. <code>MergeProject(base, override)</code> lifts that to whole ' +
			'files: a service named in only one file passes through unchanged; ' +
			'named in both, it goes through <code>MergeService</code>. Neither ' +
			'input may be mutated.</p>',
			'<div class="tip">Field note: <code>docker compose config</code> prints ' +
			'the fully merged, interpolated model — always the first move when a ' +
			'stack behaves unlike any single file reads. And since compose 2.24 ' +
			'there are YAML tags for what plain merging cannot express: ' +
			'<code>!reset</code> drops the base\'s entry entirely and ' +
			'<code>!override</code> replaces instead of merging/appending — the ' +
			'modern escape hatch for "this environment needs <em>fewer</em> ports ' +
			'than the base".</div>',
		],

		starter: [
			'package main',
			'',
			'// Service is one service block from a compose file, reduced to the',
			'// three field shapes the merger actually distinguishes:',
			'//   - single-value scalars: Image, Command',
			'//   - mappings:             Environment, Labels',
			'//   - sequences:            Ports, Volumes, DependsOn',
			'type Service struct {',
			'	Image       string',
			'	Command     string',
			'	Environment map[string]string',
			'	Labels      map[string]string',
			'	Ports       []string',
			'	Volumes     []string',
			'	DependsOn   []string',
			'}',
			'',
			'// MergeService merges an override file\'s service block onto a base',
			'// block, per the compose spec\'s type-keyed rules:',
			'//   - scalars: the override replaces the base only when non-empty;',
			'//     an empty override field lets the base value survive',
			'//   - maps: merged per KEY — override wins collisions, base-only',
			'//     keys survive (nil maps on either side are fine)',
			'//   - sequences: appended base-then-override, exact-string',
			'//     duplicates dropped, first occurrence and order preserved',
			'// Neither input may be mutated.',
			'func MergeService(base, override Service) Service {',
			'	// your code here',
			'	return Service{}',
			'}',
			'',
			'// MergeProject merges two whole compose files (service name -> block).',
			'// A service present in only one file passes through unchanged; a',
			'// service present in both goes through MergeService. Returns a fresh',
			'// map — neither input may be mutated.',
			'func MergeProject(base, override map[string]Service) map[string]Service {',
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
			'	// A web service as it appears in compose.yml (base) and in',
			'	// compose.override.yml (the local-hacks file): the override bumps',
			'	// the image, flips LOG_LEVEL, adds a label, a port, and a bind',
			'	// mount — and repeats one port and one volume verbatim, which the',
			'	// dedupe rule must collapse.',
			'	webBase := Service{',
			'		Image:       "nginx:1.25",',
			'		Environment: map[string]string{"LOG_LEVEL": "info", "DB_HOST": "db"},',
			'		Ports:       []string{"80:80", "443:443"},',
			'		Volumes:     []string{"./conf:/etc/nginx/conf.d"},',
			'		DependsOn:   []string{"db"},',
			'	}',
			'	webOverride := Service{',
			'		Image:       "nginx:1.27",',
			'		Environment: map[string]string{"LOG_LEVEL": "debug", "DEBUG": "1"},',
			'		Labels:      map[string]string{"traefik.enable": "true"},',
			'		Ports:       []string{"8080:80", "80:80"},',
			'		Volumes:     []string{"./conf:/etc/nginx/conf.d", "./src:/usr/share/nginx/html"},',
			'	}',
			'	// Whole-file view: the base also has a db service the override',
			'	// never mentions, and the override adds a dev-only debugger.',
			'	baseProj := map[string]Service{',
			'		"web": webBase,',
			'		"db":  {Image: "postgres:16", Volumes: []string{"pgdata:/var/lib/postgresql/data"}},',
			'	}',
			'	overrideProj := map[string]Service{',
			'		"web":      webOverride,',
			'		"debugger": {Image: "golang:1.24", Command: "dlv dap --listen :2345"},',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"image: non-empty override replaces base (nginx:1.25 -> nginx:1.27)",',
			'			"nginx:1.27",',
			'			func() string { return MergeService(webBase, webOverride).Image }},',
			'		{"image: EMPTY override field keeps the base — overrides rarely repeat the image",',
			'			"nginx:1.25",',
			'			func() string { return MergeService(webBase, Service{Ports: []string{"8080:80"}}).Image }},',
			'		{"command: override replaces the whole line — compose never merges argv",',
			'			"gunicorn app:api --reload",',
			'			func() string {',
			'				merged := MergeService(',
			'					Service{Image: "api:1", Command: "gunicorn app:api --workers 4"},',
			'					Service{Command: "gunicorn app:api --reload"})',
			'				return merged.Command',
			'			}},',
			'		{"environment: per-key merge — override wins the collision, base-only key survives",',
			'			"map[DB_HOST:db DEBUG:1 LOG_LEVEL:debug]",',
			'			func() string { return fmt.Sprintf("%v", MergeService(webBase, webOverride).Environment) }},',
			'		{"labels: override lands even though the base has no labels map at all (nil-safe)",',
			'			"map[traefik.enable:true]",',
			'			func() string { return fmt.Sprintf("%v", MergeService(webBase, webOverride).Labels) }},',
			'		{"ports: appended base-then-override, exact duplicate dropped, order preserved",',
			'			"[80:80 443:443 8080:80]",',
			'			func() string { return fmt.Sprintf("%v", MergeService(webBase, webOverride).Ports) }},',
			'		{"volumes: repeated bind mount kept once (first occurrence), new mount appended",',
			'			"[./conf:/etc/nginx/conf.d ./src:/usr/share/nginx/html]",',
			'			func() string { return fmt.Sprintf("%v", MergeService(webBase, webOverride).Volumes) }},',
			'		{"project: service only in the override file passes through (the dev-only debugger)",',
			'			"golang:1.24",',
			'			func() string { return MergeProject(baseProj, overrideProj)["debugger"].Image }},',
			'		{"project: service only in the base file survives untouched",',
			'			"postgres:16",',
			'			func() string { return MergeProject(baseProj, overrideProj)["db"].Image }},',
			'		{"project: service named in BOTH files goes through the field-wise merge",',
			'			"nginx:1.27",',
			'			func() string { return MergeProject(baseProj, overrideProj)["web"].Image }},',
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
			'// Service is one service block from a compose file, reduced to the',
			'// three field shapes the merger actually distinguishes:',
			'//   - single-value scalars: Image, Command',
			'//   - mappings:             Environment, Labels',
			'//   - sequences:            Ports, Volumes, DependsOn',
			'type Service struct {',
			'	Image       string',
			'	Command     string',
			'	Environment map[string]string',
			'	Labels      map[string]string',
			'	Ports       []string',
			'	Volumes     []string',
			'	DependsOn   []string',
			'}',
			'',
			'// mergeScalar is the single-value rule: the override wins only when it',
			'// actually says something. "Empty means absent" is what lets an',
			'// override file mention just the two fields it changes — the merger',
			'// cannot tell "field omitted" from "field set to zero value" in a',
			'// struct model, and the compose spec resolves that the same way:',
			'// an absent key in the later file never clobbers the earlier one.',
			'func mergeScalar(base, override string) string {',
			'	if override != "" {',
			'		return override',
			'	}',
			'	return base',
			'}',
			'',
			'// mergeMap is the mapping rule: per-KEY union, later file wins each',
			'// collision. Always built as a fresh map — copying base first, then',
			'// letting override overwrite — so the merge never aliases (and never',
			'// mutates) either input. Ranging over a nil map is a no-op in Go,',
			'// which makes the nil-Labels case fall out for free.',
			'func mergeMap(base, override map[string]string) map[string]string {',
			'	merged := make(map[string]string, len(base)+len(override))',
			'	for key, val := range base {',
			'		merged[key] = val',
			'	}',
			'	for key, val := range override {',
			'		merged[key] = val // collision: the later file wins',
			'	}',
			'	return merged',
			'}',
			'',
			'// mergeSeq is the sequence rule: append base-then-override, dropping',
			'// exact-string duplicates and keeping the FIRST occurrence, so base',
			'// order is preserved and repeated entries do not double up. Note what',
			'// this rule cannot do: remove anything. There is no way for the',
			'// override to say "no port 80" — append-only is why the !reset tag',
			'// eventually had to exist.',
			'func mergeSeq(base, override []string) []string {',
			'	seen := make(map[string]bool, len(base)+len(override))',
			'	merged := make([]string, 0, len(base)+len(override))',
			'	// Base first, then override: order of appearance IS the spec\'d',
			'	// order of the merged sequence.',
			'	for _, part := range [][]string{base, override} {',
			'		for _, entry := range part {',
			'			if seen[entry] {',
			'				continue // exact duplicate: first occurrence already kept',
			'			}',
			'			seen[entry] = true',
			'			merged = append(merged, entry)',
			'		}',
			'	}',
			'	return merged',
			'}',
			'',
			'// MergeService applies the three type-keyed rules field by field.',
			'// The real merger is generic — it walks two YAML trees and picks a',
			'// rule per node KIND without knowing what any field means; modeling',
			'// it as one helper per kind keeps that structure visible: adding a',
			'// field to Service means picking its shape, not writing new logic.',
			'func MergeService(base, override Service) Service {',
			'	return Service{',
			'		Image:       mergeScalar(base.Image, override.Image),',
			'		Command:     mergeScalar(base.Command, override.Command),',
			'		Environment: mergeMap(base.Environment, override.Environment),',
			'		Labels:      mergeMap(base.Labels, override.Labels),',
			'		Ports:       mergeSeq(base.Ports, override.Ports),',
			'		Volumes:     mergeSeq(base.Volumes, override.Volumes),',
			'		DependsOn:   mergeSeq(base.DependsOn, override.DependsOn),',
			'	}',
			'}',
			'',
			'// MergeProject lifts the service merge to whole files. The service map',
			'// itself is just another mapping node, so it follows the mapping rule:',
			'// union of names, and on a name collision the "override wins" step is',
			'// a RECURSIVE merge rather than replacement — that is the one place',
			'// the mapping rule recurses instead of clobbering.',
			'func MergeProject(base, override map[string]Service) map[string]Service {',
			'	merged := make(map[string]Service, len(base)+len(override))',
			'	for name, svc := range base {',
			'		merged[name] = svc // base services pass through by default',
			'	}',
			'	for name, svc := range override {',
			'		if baseSvc, ok := base[name]; ok {',
			'			// Named in both files: field-wise merge, not replacement.',
			'			merged[name] = MergeService(baseSvc, svc)',
			'		} else {',
			'			// Override-only service (the dev debugger pattern).',
			'			merged[name] = svc',
			'		}',
			'	}',
			'	return merged',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Per-type, not per-field</h3>' +
			'<p>The most important thing about the compose merger is what it does ' +
			'<em>not</em> know: what any field means. It walks two YAML trees and ' +
			'picks a rule by node <em>kind</em> — scalar, mapping, sequence — which ' +
			'is why the rules feel arbitrary at the field level. <code>environment</code> ' +
			'merges beautifully per key because it happens to be a mapping; ' +
			'<code>command</code> is replaced wholesale because it is a scalar (no ' +
			'argv-level merging, ever); and <code>ports</code> appends because it ' +
			'is a sequence — even though appending ports is exactly the behavior ' +
			'nobody wants when they write a "prod" override. The generic walk is ' +
			'what makes the merger predictable and cheap to maintain; the price is ' +
			'that field semantics never get a vote.</p>' +
			'<h3>Why you can\'t remove a port</h3>' +
			'<p>Sequence merging is append-only, so an override can only ever make ' +
			'a list <em>longer</em>. Writing <code>ports: []</code> in the override ' +
			'appends nothing and the base list survives; there is no syntax in the ' +
			'plain merge to say "no port 80 here". For years the workaround was ' +
			'structural: keep the contested field out of the base file and put it ' +
			'in per-environment files (<code>compose.dev.yml</code> gets the port, ' +
			'<code>compose.prod.yml</code> doesn\'t), selected via <code>-f</code> ' +
			'or the <code>COMPOSE_FILE</code> variable. Compose 2.24 finally added ' +
			'the escape hatches as YAML tags: <code>ports: !reset []</code> drops ' +
			'the base\'s entries entirely, and <code>!override</code> replaces a ' +
			'node instead of merging/appending into it. Both are per-node ' +
			'annotations — the learner\'s version of the lesson is that removal ' +
			'required <em>new syntax</em>, because the merge algebra itself has no ' +
			'subtraction.</p>' +
			'<h3>The invisible second file</h3>' +
			'<p>The dev/prod pattern the docs bless: <code>compose.yml</code> holds ' +
			'what is true everywhere (images, service topology, ' +
			'<code>depends_on</code>), and per-environment files layer the deltas. ' +
			'The twist is that the local delta file, <code>compose.override.yml</code>, ' +
			'is loaded <em>automatically</em> by a bare <code>docker compose up</code> ' +
			'— that is by design, so every developer\'s bind mounts and debug ports ' +
			'apply without ceremony, and it is also why a stack can behave in ways ' +
			'no reviewed file explains. The moment you pass any <code>-f</code>, ' +
			'auto-loading stops and only the named files merge, left to right, ' +
			'later file winning.</p>' +
			'<h3>When debugging</h3>' +
			'<p>Never reason about a multi-file stack by reading the files — render ' +
			'the merge: <code>docker compose config</code> prints the effective ' +
			'model after merging and interpolation, and diffing its output with and ' +
			'without a <code>-f</code> shows exactly what a layer contributes. The ' +
			'classic symptoms map straight to the rules you implemented: a port ' +
			'published twice is sequence-append; a "removed" env var still set is a ' +
			'base key surviving the per-key merge under a different spelling; local ' +
			'behavior that vanishes in CI is <code>compose.override.yml</code> not ' +
			'being auto-loaded once CI passes explicit <code>-f</code> flags.</p>',
		],
		complexity: { time: 'O(n) over the fields, map keys, and sequence entries of both files', space: 'O(n) — a fresh merged copy; neither input is mutated' },
	});
})();
