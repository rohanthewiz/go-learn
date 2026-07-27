/* Compose Projects — Compose (Medium). The scoping layer compose adds on top
 * of plain docker networking: a PROJECT name (from the directory) prefixes
 * every container and network, which is why two `docker compose up` runs in
 * different directories never collide. The harness pins the two reachability
 * questions people conflate: container-to-container (shared network, service
 * name as DNS, ANY port — ports:/expose: irrelevant) versus host-to-container
 * (needs a ports: entry; expose: publishes nothing), plus the v2 dash /
 * underscore naming split.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// Two projects side by side: identical service names, disjoint networks.
	// Inside a project, the service name is the DNS name and every listening
	// port is reachable; the host only gets through a ports: mapping. Marker
	// ids namespaced (DKCN) — every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 264" width="520" height="264" role="img" aria-label="two compose projects create disjoint networks; inside a project services reach each other by service name on any port; the host needs a ports: mapping, and expose alone is not published">' +
		'<text x="16" y="20" class="lbl">two `docker compose up` runs → two projects → two disjoint networks</text>' +
		// project "shop": its default network as a boundary box
		'<rect x="16" y="32" width="308" height="140" rx="8" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="28" y="52" class="lbl" style="fill:var(--accent)">network shop_default (project “shop”)</text>' +
		'<rect x="36" y="70" width="88" height="38" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="80" y="93" text-anchor="middle">api</text>' +
		'<text x="80" y="124" text-anchor="middle" class="lbl">ports: 8080:80</text>' +
		'<rect x="204" y="70" width="96" height="38" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="252" y="93" text-anchor="middle">db</text>' +
		'<text x="252" y="124" text-anchor="middle" class="lbl">expose: 5432 only</text>' +
		// container-to-container: service name is the DNS name, any port works
		'<line x1="124" y1="89" x2="198" y2="89" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDKCNok)"/>' +
		'<text x="162" y="81" text-anchor="middle" class="lbl" style="fill:var(--ok)">db:5432 ✓</text>' +
		'<text x="28" y="160" class="lbl">service name = DNS name; ANY listening port — ports: not consulted</text>' +
		// project "blog": same service name, zero collision
		'<rect x="344" y="32" width="160" height="140" rx="8" fill="none" stroke="var(--edge)"/>' +
		'<text x="356" y="52" class="lbl">blog_default</text>' +
		'<rect x="372" y="70" width="96" height="38" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="420" y="93" text-anchor="middle">db</text>' +
		'<text x="420" y="124" text-anchor="middle" class="lbl">same name,</text>' +
		'<text x="420" y="138" text-anchor="middle" class="lbl">no collision</text>' +
		// the host below: only ports: gets through
		'<rect x="16" y="200" width="488" height="40" rx="6" fill="none" stroke="var(--edge)"/>' +
		'<text x="40" y="225">host</text>' +
		'<line x1="80" y1="200" x2="80" y2="176" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDKCNok)"/>' +
		'<text x="90" y="192" class="lbl" style="fill:var(--ok)">localhost:8080 ✓ (ports:)</text>' +
		'<line x1="252" y1="200" x2="252" y2="176" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="4 3" marker-end="url(#dgArrowDKCNw)"/>' +
		'<text x="262" y="192" class="lbl" style="fill:var(--warn)">localhost:5432 ✗ (expose: ≠ publish)</text>' +
		'<text x="16" y="258" class="lbl">ports: exists for the HOST only — containers on a shared network never need it</text>' +
		'<defs>' +
		'<marker id="dgArrowDKCNok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowDKCNw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'compose-networks',
		title: 'Compose Projects: names, networks, reachability',
		nav: 'compose networks',
		difficulty: 'Medium',
		category: 'Compose',
		task: 'Implement ContainerName/NetworkName (compose\'s project-scoped naming) plus CanReach and HostCanReach — the two reachability questions networks: and ports: actually answer.',

		prose: [
			'<h2>Compose Projects: names, networks, reachability</h2>' +
			'<p>A teammate’s PR adds <code>ports: ["5432:5432"]</code> to the ' +
			'<code>db</code> service — “so the api can reach the database”. It works ' +
			'on their laptop and breaks on the shared CI box, where another ' +
			'project’s Postgres already owns host port 5432. The publish was never ' +
			'needed: <code>api</code> could reach <code>db</code> all along, through ' +
			'the project network, by service name, on any port the process listens ' +
			'on. <code>ports:</code> has exactly one client — the <strong>host</strong>. ' +
			'Meanwhile the reason two <code>docker compose up</code> runs in two ' +
			'directories never trample each other is a naming discipline, not ' +
			'magic:</p>',
			{ lang: 'yaml', code: '# shop/compose.yaml — project name "shop" comes from the directory\nservices:\n  api:\n    build: .\n    ports: ["8080:80"]   # host:container — a door for the HOST only\n  db:\n    image: postgres:16\n    expose: ["5432"]     # metadata; publishes NOTHING\n\n# created: containers shop-api-1, shop-db-1   network shop_default' },
			'<ul>' +
			'<li><strong>The project is a namespace.</strong> Compose derives a ' +
			'project name from the directory (override with <code>-p</code> or ' +
			'<code>COMPOSE_PROJECT_NAME</code>) and prefixes everything it creates. ' +
			'Two directories → <code>shop_default</code> and <code>blog_default</code> ' +
			'— two ordinary bridge networks that cannot see each other, even with ' +
			'identical service names.</li>' +
			'<li><strong>Every service joins <code>default</code></strong> unless it ' +
			'declares <code>networks:</code> — and declaring any network ' +
			'<em>replaces</em> the default, it does not add to it. That silent ' +
			'removal is how half of all “api can’t see db” tickets start.</li>' +
			'<li><strong>The service name is the DNS name.</strong> Docker’s embedded ' +
			'DNS (127.0.0.11 inside every container) resolves it on shared networks. ' +
			'Container-to-container traffic goes straight to the container IP: ' +
			'<em>any</em> listening port is reachable, and <code>ports:</code> / ' +
			'<code>expose:</code> are never consulted — the #1 compose ' +
			'misconception.</li>' +
			'<li><strong><code>ports: "host:container"</code></strong> publishes the ' +
			'container side onto the host; <strong><code>expose:</code></strong> is ' +
			'documentation-grade metadata and publishes nothing.</li>' +
			'<li><strong>Naming is inconsistent on purpose-by-accident:</strong> ' +
			'compose v2 containers are <code>&lt;project&gt;-&lt;service&gt;-&lt;replica&gt;</code> ' +
			'(v1 used underscores — <code>shop_api_1</code> — until underscores, ' +
			'illegal in hostnames, bit too many people), but networks are still ' +
			'<code>&lt;project&gt;_&lt;network&gt;</code> with an underscore.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the naming pair — <code>ContainerName</code> ' +
			'(<code>shop-api-1</code>, dashes) and <code>NetworkName</code> ' +
			'(<code>shop_default</code>, underscore) — then the two reachability ' +
			'checks over <code>SvcNet</code>: <code>CanReach(svcs, from, to)</code>, ' +
			'true iff the services share at least one network (empty ' +
			'<code>Networks</code> means <code>["default"]</code>; ports play no ' +
			'part), and <code>HostCanReach(svcs, to, containerPort)</code>, true iff ' +
			'a <code>ports:</code> entry’s container side matches — ' +
			'<code>expose:</code> does not count.</p>',
			'<div class="tip">First reflex when <code>db</code> is unreachable: ' +
			'<code>docker compose exec api getent hosts db</code>. If it resolves, ' +
			'the network is shared and a refused connection means the app isn’t ' +
			'listening yet — or is bound to 127.0.0.1 <em>inside its own ' +
			'container</em>, the other classic. If it doesn’t resolve, run ' +
			'<code>docker network inspect shop_default</code> and check who is ' +
			'actually attached: someone declared <code>networks:</code> and silently ' +
			'left <code>default</code>. And remember <code>localhost</code> inside a ' +
			'container is that container, never the host.</div>',
		],

		starter: [
			'package main',
			'',
			'// SvcNet describes one compose service\'s networking surface.',
			'//   - Networks: the networks: list; EMPTY means the implicit "default"',
			'//   - Ports:    published mappings, each "host:container" (e.g. "8080:80")',
			'//   - Expose:   expose: entries, each a container port (e.g. "5432")',
			'type SvcNet struct {',
			'	Name     string',
			'	Networks []string',
			'	Ports    []string',
			'	Expose   []string',
			'}',
			'',
			'// ContainerName returns the name compose v2 gives a service replica:',
			'// <project>-<service>-<replica>, e.g. ("shop", "api", 1) -> "shop-api-1".',
			'// (v1 used underscores; the separator changed because container names',
			'// double as hostnames, where underscores are illegal.)',
			'func ContainerName(project, service string, replica int) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// NetworkName returns the name compose gives a project network:',
			'// <project>_<network>, e.g. ("shop", "default") -> "shop_default".',
			'// Networks kept the v1 underscore — a real inconsistency with v2',
			'// container names.',
			'func NetworkName(project, network string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// CanReach reports whether service `from` can open a connection to',
			'// service `to`: true iff the two share at least one network, where a',
			'// service with an empty Networks list is attached to exactly',
			'// ["default"]. On a shared network the service name is the DNS name and',
			'// EVERY listening container port is reachable — Ports and Expose are',
			'// never consulted here. Unknown service names return false.',
			'func CanReach(svcs []SvcNet, from, to string) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// HostCanReach reports whether a process on the HOST (curl',
			'// localhost:...) can reach containerPort on service `to`: true iff a',
			'// ports: entry\'s container side (after the ":") equals containerPort.',
			'// expose: does NOT publish, and an unknown service returns false.',
			'func HostCanReach(svcs []SvcNet, to string, containerPort string) bool {',
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
			'	// One project\'s worth of services. api and db declare no networks,',
			'	// so both land on the implicit "default"; the other three carve the',
			'	// stack into explicit frontend/backend segments — and thereby LEAVE',
			'	// default.',
			'	svcs := []SvcNet{',
			'		{Name: "api", Ports: []string{"8080:80"}},',
			'		{Name: "db", Expose: []string{"5432"}},',
			'		{Name: "proxy", Networks: []string{"frontend"}, Ports: []string{"443:443"}},',
			'		{Name: "worker", Networks: []string{"frontend", "backend"}},',
			'		{Name: "cache", Networks: []string{"backend"}},',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	bl := func(v bool) string { return fmt.Sprintf("%v", v) }',
			'	cases := []tc{',
			'		{"default network: api and db declare no networks:, both join <project>_default",',
			'			"true",',
			'			func() string { return bl(CanReach(svcs, "api", "db")) }},',
			'		{"container-to-container ignores publishing: db has NO ports:, only expose:, yet api reaches 5432",',
			'			"true",',
			'			func() string { return bl(CanReach(svcs, "api", "db")) }},',
			'		{"declaring networks: REMOVES you from default: api (default) cannot reach cache (backend)",',
			'			"false",',
			'			func() string { return bl(CanReach(svcs, "api", "cache")) }},',
			'		{"shared explicit network: worker and cache both attach to backend",',
			'			"true",',
			'			func() string { return bl(CanReach(svcs, "worker", "cache")) }},',
			'		{"unpublished and unexposed, still reachable: worker lists nothing, proxy shares frontend",',
			'			"true",',
			'			func() string { return bl(CanReach(svcs, "proxy", "worker")) }},',
			'		{"disjoint explicit networks: proxy (frontend) cannot reach cache (backend)",',
			'			"false",',
			'			func() string { return bl(CanReach(svcs, "proxy", "cache")) }},',
			'		{"host reaches a published port: api\'s 8080:80 makes container port 80 reachable",',
			'			"true",',
			'			func() string { return bl(HostCanReach(svcs, "api", "80")) }},',
			'		{"host-side vs container-side: 8080 is the HOST half of 8080:80, not a container port",',
			'			"false",',
			'			func() string { return bl(HostCanReach(svcs, "api", "8080")) }},',
			'		{"expose: does not publish: db exposes 5432 but the host cannot reach it",',
			'			"false",',
			'			func() string { return bl(HostCanReach(svcs, "db", "5432")) }},',
			'		{"naming: v2 containers use dashes, networks keep the underscore",',
			'			"shop-api-1 shop_default",',
			'			func() string { return ContainerName("shop", "api", 1) + " " + NetworkName("shop", "default") }},',
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
			'	"strings"',
			')',
			'',
			'// SvcNet describes one compose service\'s networking surface.',
			'//   - Networks: the networks: list; EMPTY means the implicit "default"',
			'//   - Ports:    published mappings, each "host:container" (e.g. "8080:80")',
			'//   - Expose:   expose: entries, each a container port (e.g. "5432")',
			'type SvcNet struct {',
			'	Name     string',
			'	Networks []string',
			'	Ports    []string',
			'	Expose   []string',
			'}',
			'',
			'// ContainerName: compose v2 joins with dashes because the container',
			'// name doubles as a hostname on its networks, and underscores are',
			'// illegal in hostnames (RFC 1123) — the reason the v1 underscore form',
			'// (shop_api_1) was abandoned. The replica index starts at 1, so',
			'// `--scale api=3` yields shop-api-1..3 without renaming anything.',
			'func ContainerName(project, service string, replica int) string {',
			'	return fmt.Sprintf("%s-%s-%d", project, service, replica)',
			'}',
			'',
			'// NetworkName: networks kept the v1 underscore. Nobody ever resolves a',
			'// NETWORK by name over DNS — you resolve services — so the hostname',
			'// pressure that forced dashes onto container names never applied here,',
			'// and changing it would have broken every `external: true` reference.',
			'func NetworkName(project, network string) string {',
			'	return project + "_" + network',
			'}',
			'',
			'// networksOf resolves the compose default rule in ONE place: a service',
			'// that names no networks is attached to exactly ["default"], and naming',
			'// any network REPLACES that default rather than extending it. Keeping',
			'// the resolution out of CanReach means the reachability logic below',
			'// compares real attachment lists and nothing else.',
			'func networksOf(s SvcNet) []string {',
			'	if len(s.Networks) == 0 {',
			'		return []string{"default"}',
			'	}',
			'	return s.Networks',
			'}',
			'',
			'// findSvc looks a service up by name. It returns an ok flag instead of',
			'// panicking on a miss — unknown names are a caller error we absorb as',
			'// "unreachable", matching what the daemon\'s DNS does (NXDOMAIN).',
			'func findSvc(svcs []SvcNet, name string) (SvcNet, bool) {',
			'	for _, s := range svcs {',
			'		if s.Name == name {',
			'			return s, true',
			'		}',
			'	}',
			'	return SvcNet{}, false',
			'}',
			'',
			'// CanReach is a set-intersection test and NOTHING more: two services',
			'// talk iff they share a network. Deliberately absent: Ports and Expose.',
			'// On a shared bridge network traffic goes container-IP to container-IP',
			'// with no NAT in the path, so every port the process listens on is',
			'// reachable — publishing is a host-facing concept. Encoding that',
			'// absence here is the whole lesson.',
			'func CanReach(svcs []SvcNet, from, to string) bool {',
			'	src, okSrc := findSvc(svcs, from)',
			'	dst, okDst := findSvc(svcs, to)',
			'	if !okSrc || !okDst {',
			'		return false',
			'	}',
			'	// Nested scan instead of a map: attachment lists are 1-3 entries in',
			'	// practice, and the O(a*b) literal form reads as the rule it states.',
			'	for _, a := range networksOf(src) {',
			'		for _, b := range networksOf(dst) {',
			'			if a == b {',
			'				return true',
			'			}',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
			'// HostCanReach answers the OTHER question: the host is not on any',
			'// compose network, so it only gets through a published port — a',
			'// ports: entry whose container side matches. Expose is read by',
			'// nothing here on purpose: expose: is documentation-grade metadata',
			'// and publishes zero ports.',
			'func HostCanReach(svcs []SvcNet, to string, containerPort string) bool {',
			'	dst, ok := findSvc(svcs, to)',
			'	if !ok {',
			'		return false',
			'	}',
			'	for _, p := range dst.Ports {',
			'		// The container side is everything after the LAST colon: this',
			'		// handles "8080:80" and degrades sanely for the long',
			'		// "ip:host:container" form; a bare "80" (publish to an ephemeral',
			'		// host port) is already all container side.',
			'		side := p',
			'		if i := strings.LastIndex(p, ":"); i >= 0 {',
			'			side = p[i+1:]',
			'		}',
			'		if side == containerPort {',
			'			return true',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Compose adds names, not networking</h3>' +
			'<p>Everything in this item is a thin discipline over plain docker ' +
			'primitives. <code>shop_default</code> is an ordinary bridge network — ' +
			'<code>docker network ls</code> shows it next to hand-made ones — and ' +
			'the project name is just a prefix plus a ' +
			'<code>com.docker.compose.project</code> label. Isolation between two ' +
			'projects is not a feature compose implements; it falls out of two ' +
			'bridge networks existing. What compose adds on top is ' +
			'<em>network-scoped aliases</em>: each container gets its service name ' +
			'as an alias on each attached network, and the embedded DNS server ' +
			'(127.0.0.11 in every container) answers for those aliases. That is the ' +
			'entire mechanism behind <code>curl db:5432</code> — a name lookup to a ' +
			'container IP, then a direct connection with <strong>no NAT in the ' +
			'path</strong>, which is why <code>ports:</code> never matters between ' +
			'containers.</p>' +
			'<h3>The dash/underscore split is a fossil record</h3>' +
			'<p>v1 named containers <code>shop_api_1</code>. Container names double ' +
			'as hostnames, underscores are illegal in hostnames (RFC 1123), and ' +
			'enough tooling choked that v2 switched containers to ' +
			'<code>shop-api-1</code>. Networks were left alone: nothing ever ' +
			'resolves a <em>network</em> name over DNS — you resolve services — so ' +
			'there was no correctness pressure, and renaming would have broken every ' +
			'<code>external: true</code> reference in existing files. Field ' +
			'consequence: any script that greps <code>docker ps</code> for ' +
			'<code>_1</code> broke on the v2 migration. Match on labels ' +
			'(<code>com.docker.compose.service</code>) or use ' +
			'<code>docker compose ps --format</code> instead of parsing names.</p>' +
			'<h3>ports: and expose: serve different audiences</h3>' +
			'<p><code>ports:</code> programs the host side: an iptables DNAT rule ' +
			'(or userland proxy) from a host port to the container. It is also a ' +
			'<em>security</em> decision — the default bind is 0.0.0.0, so publishing ' +
			'5432 “for the api” actually offers your database to the LAN. ' +
			'<code>expose:</code> publishes nothing; it is metadata for humans and ' +
			'for <code>docker ps</code> output, a vestige of the pre-network ' +
			'<code>--link</code> era. The asymmetry your two functions encode — ' +
			'<code>CanReach</code> never reads <code>Ports</code>, ' +
			'<code>HostCanReach</code> reads <em>only</em> <code>Ports</code> — is ' +
			'the fix for the most common compose PR mistake: publishing a port to ' +
			'“let containers talk”.</p>' +
			'<h3>When two projects should talk</h3>' +
			'<p>Project isolation is the default, not a wall. The sanctioned bridge ' +
			'is an external network: <code>docker network create shared</code> once, ' +
			'then <code>networks: { shared: { external: true } }</code> in both ' +
			'files — compose attaches to it without prefixing the name. The blunt ' +
			'alternative is forcing one project with <code>-p</code>/' +
			'<code>COMPOSE_PROJECT_NAME</code>. Two related traps: ' +
			'<code>container_name:</code> pins an unprefixed name, which breaks ' +
			'<code>--scale</code> and collides the moment a second project uses the ' +
			'same file; and remember that declaring <code>networks:</code> on a ' +
			'service silently removes it from <code>default</code> — the diff that ' +
			'“couldn’t possibly” break the api’s database connection.</p>',
		],
		complexity: { time: 'O(s) to find each service + O(a·b) network intersection — attachment lists are 1-3 entries', space: 'O(1) beyond the inputs' },
	});
})();
