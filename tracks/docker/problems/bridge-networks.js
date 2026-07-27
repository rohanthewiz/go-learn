/* Bridge Networks & Embedded DNS — Networking & Distribution (Medium). Why
 * `ping db` works on a user-defined network and fails on the default bridge:
 * Docker runs a DNS server at 127.0.0.11 inside every container's resolver
 * config, but it only answers per-network, and never for the default bridge.
 * The learner implements Resolve — the embedded server's decision procedure:
 * search only networks the caller is attached to, skip non-user-defined ones,
 * match container names and per-network aliases, and answer with the IP on
 * the SHARED network (the one address the caller can actually reach).
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// Same two containers, two networks: the default bridge gives them
	// connectivity but no names; a user-defined network adds the embedded
	// DNS. Marker ids namespaced (dgArrowDKBN / dgArrowDKBNok) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 220" width="540" height="220" role="img" aria-label="two containers on the default bridge cannot resolve each other by name; the same two containers on a user-defined network resolve through the embedded DNS at 127.0.0.11">' +
		'<text x="20" y="24" class="lbl">same two containers — name resolution depends entirely on WHICH bridge they share</text>' +
		// default bridge: connectivity, no names
		'<rect x="20" y="40" width="240" height="130" rx="8" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="140" y="60" text-anchor="middle" class="lbl" style="fill:var(--warn)">bridge (default, UserDefined=false)</text>' +
		'<rect x="40" y="78" width="72" height="32" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="76" y="99" text-anchor="middle">api</text>' +
		'<rect x="168" y="78" width="72" height="32" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="204" y="99" text-anchor="middle">db</text>' +
		'<path d="M 116 94 L 162 94" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="4 3" marker-end="url(#dgArrowDKBN)"/>' +
		'<text x="140" y="132" text-anchor="middle" class="lbl" style="fill:var(--warn)">ping db → NXDOMAIN</text>' +
		'<text x="140" y="152" text-anchor="middle" class="lbl">ping 172.17.0.3 → works (IPs route, names don’t)</text>' +
		// user-defined network: embedded DNS answers
		'<rect x="290" y="40" width="230" height="130" rx="8" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="405" y="60" text-anchor="middle" class="lbl" style="fill:var(--ok)">appnet (UserDefined=true)</text>' +
		'<rect x="306" y="78" width="72" height="32" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="342" y="99" text-anchor="middle">api</text>' +
		'<rect x="432" y="78" width="72" height="32" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="468" y="99" text-anchor="middle">db</text>' +
		'<rect x="352" y="126" width="106" height="26" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="405" y="143" text-anchor="middle" class="lbl" style="fill:var(--accent)">127.0.0.11 DNS</text>' +
		'<path d="M 342 114 C 342 126 348 132 350 135" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDKBNok)"/>' +
		'<path d="M 460 135 C 464 130 468 124 468 114" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDKBNok)"/>' +
		'<text x="405" y="166" text-anchor="middle" class="lbl" style="fill:var(--ok)">ping db → 172.18.0.3</text>' +
		'<text x="20" y="204" class="lbl">the answer is always the IP on the network the two containers SHARE — the one address the caller can reach</text>' +
		'<defs>' +
		'<marker id="dgArrowDKBN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowDKBNok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'bridge-networks',
		title: 'Bridge Networks & Embedded DNS',
		nav: 'bridge networks',
		difficulty: 'Medium',
		category: 'Networking & Distribution',
		task: 'Implement Resolve: answer a container\'s DNS query the way the embedded 127.0.0.11 server does — per network, user-defined networks only, aliases included, returning the IP on the shared network (or "" for NXDOMAIN).',

		prose: [
			'<h2>Bridge Networks &amp; Embedded DNS</h2>' +
			'<p>The stack works perfectly under <code>docker compose up</code>, so you ' +
			'try to reproduce one service by hand — <code>docker run -d --name db ' +
			'postgres</code>, then your API container — and it dies instantly with ' +
			'<code>dial tcp: lookup db on 127.0.0.11:53: no such host</code>. Same ' +
			'image, same <code>--name db</code>, same host. The difference is not the ' +
			'containers; it is the <em>bridge they landed on</em>. Compose quietly ' +
			'creates a <strong>user-defined network</strong> for the project and ' +
			'attaches every service to it; a plain <code>docker run</code> lands on ' +
			'the <strong>default bridge</strong> — and Docker\'s embedded DNS ' +
			'deliberately refuses to serve names there. The rules the server at ' +
			'<code>127.0.0.11</code> actually follows:</p>' +
			'<ul>' +
			'<li><strong>Every container asks 127.0.0.11.</strong> Docker writes ' +
			'<code>nameserver 127.0.0.11</code> into the container\'s ' +
			'<code>/etc/resolv.conf</code>; the daemon answers container names ' +
			'itself and forwards everything else upstream.</li>' +
			'<li><strong>Resolution is per-network.</strong> A query is checked ' +
			'against each network the <em>querying</em> container is attached to — ' +
			'never against networks it cannot reach.</li>' +
			'<li><strong>User-defined networks only.</strong> On a network you ' +
			'created (<code>docker network create</code>, or any Compose network), a ' +
			'name resolves iff a container on that same network carries it — as its ' +
			'container name or as a per-network <strong>alias</strong> ' +
			'(<code>--network-alias</code>, Compose service names). The default ' +
			'bridge (<code>UserDefined=false</code>) does <em>no</em> name ' +
			'resolution at all — historically only the deprecated <code>--link</code> ' +
			'flag ever faked it there, by editing <code>/etc/hosts</code>.</li>' +
			'<li><strong>The answer is the IP on the shared network.</strong> A ' +
			'container attached to several networks has several IPs; the DNS answers ' +
			'with its address on the network the caller shares with it — the only ' +
			'one of those addresses the caller can actually route to.</li>' +
			'<li><strong>No shared user-defined network → NXDOMAIN.</strong> ' +
			'Return <code>""</code>. (A container may resolve its own name — it ' +
			'shares every network with itself.)</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Resolve(nets, containers, from, name)</code> — one ' +
			'DNS query as answered by the embedded server. <code>Container.Networks</code> ' +
			'maps network name → that container\'s IP on it; ' +
			'<code>Network.Aliases</code> maps container name → its extra names on ' +
			'that network. Walk the networks in <code>nets</code> order, skip any ' +
			'the caller isn\'t attached to and any that aren\'t user-defined, and ' +
			'return the first match\'s IP on that network — or <code>""</code>.</p>',
			{ lang: 'txt', code: '$ docker run -d --name db postgres\n$ docker run --rm myapi\n    dial tcp: lookup db on 127.0.0.11:53: no such host   # default bridge: no DNS\n\n$ docker network create appnet\n$ docker run -d --network appnet --name db postgres\n$ docker run --rm --network appnet myapi\n    connected to db (172.18.0.3)                          # user-defined: DNS works' },
			'<div class="tip">Newcomers read <code>nameserver 127.0.0.11</code> in a ' +
			'container\'s <code>resolv.conf</code> as a bug — loopback, inside a ' +
			'container? It is the daemon\'s embedded server, reached through a ' +
			'firewall redirect in the container\'s network namespace before loopback ' +
			'routing applies. That is also why <code>--dns 8.8.8.8</code> doesn\'t ' +
			'make container names stop working on user-defined networks: it only ' +
			'changes where 127.0.0.11 <em>forwards</em> the queries it can\'t ' +
			'answer itself.</div>',
		],

		starter: [
			'package main',
			'',
			'// Container is one running container as the embedded DNS sees it.',
			'// Networks maps network name -> this container\'s IP on that network',
			'// (a container holds one IP per network it is attached to).',
			'type Container struct {',
			'	Name     string',
			'	Networks map[string]string',
			'}',
			'',
			'// Network is one Docker bridge network.',
			'// UserDefined is false only for the default "bridge" — the embedded',
			'// DNS does not serve names there at all.',
			'// Aliases maps container name -> that container\'s extra DNS names on',
			'// THIS network (--network-alias, Compose service names). Aliases are',
			'// per-network: the same container can answer to different names on',
			'// different networks.',
			'type Network struct {',
			'	Name        string',
			'	UserDefined bool',
			'	Aliases     map[string][]string',
			'}',
			'',
			'// Resolve answers one DNS query from container `from` for `name`,',
			'// exactly as the embedded server at 127.0.0.11 would:',
			'//',
			'//   - consider only networks `from` is attached to, in nets order',
			'//   - skip networks that are not user-defined (the default bridge',
			'//     does no name resolution)',
			'//   - on each remaining network, a container attached there matches',
			'//     if its Name == name or one of its aliases ON THAT NETWORK is',
			'//     name — the answer is the match\'s IP on that shared network',
			'//   - a container may resolve its own name (it shares every one of',
			'//     its networks with itself)',
			'//   - no match on any shared user-defined network -> "" (NXDOMAIN)',
			'func Resolve(nets []Network, containers []Container, from, name string) string {',
			'	// your code here',
			'	return ""',
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
			'	// A realistic small estate: two legacy containers on the default',
			'	// bridge, a Compose-style app on "appnet" (where db carries the',
			'	// alias "postgres"), and a worker on "backnet". db straddles',
			'	// appnet and backnet, so it has a different IP on each.',
			'	nets := []Network{',
			'		{Name: "bridge", UserDefined: false, Aliases: map[string][]string{}},',
			'		{Name: "appnet", UserDefined: true, Aliases: map[string][]string{',
			'			"db": {"postgres"},',
			'		}},',
			'		{Name: "backnet", UserDefined: true, Aliases: map[string][]string{}},',
			'	}',
			'	containers := []Container{',
			'		{Name: "api", Networks: map[string]string{"appnet": "172.18.0.2"}},',
			'		{Name: "db", Networks: map[string]string{"appnet": "172.18.0.3", "backnet": "172.19.0.2"}},',
			'		{Name: "worker", Networks: map[string]string{"backnet": "172.19.0.3"}},',
			'		{Name: "legacy-web", Networks: map[string]string{"bridge": "172.17.0.2"}},',
			'		{Name: "legacy-db", Networks: map[string]string{"bridge": "172.17.0.3"}},',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	q := func(from, name string) string {',
			'		return fmt.Sprintf("%q", Resolve(nets, containers, from, name))',
			'	}',
			'	cases := []tc{',
			'		{"user-defined network: api resolves db by container name",',
			'			"\\"172.18.0.3\\"",',
			'			func() string { return q("api", "db") }},',
			'		{"alias: \\"postgres\\" resolves to db\'s appnet IP",',
			'			"\\"172.18.0.3\\"",',
			'			func() string { return q("api", "postgres") }},',
			'		{"default bridge: legacy-web cannot resolve legacy-db — no DNS there",',
			'			"\\"\\"",',
			'			func() string { return q("legacy-web", "legacy-db") }},',
			'		{"no shared network: api and worker share nothing -> NXDOMAIN",',
			'			"\\"\\"",',
			'			func() string { return q("api", "worker") }},',
			'		{"multi-network target: worker gets db\'s backnet IP — the reachable one",',
			'			"\\"172.19.0.2\\"",',
			'			func() string { return q("worker", "db") }},',
			'		{"self-resolution: api resolves its own name to its own appnet IP",',
			'			"\\"172.18.0.2\\"",',
			'			func() string { return q("api", "api") }},',
			'		{"unknown name: nothing on any shared network carries \\"redis\\"",',
			'			"\\"\\"",',
			'			func() string { return q("api", "redis") }},',
			'		{"aliases are per-network: \\"postgres\\" means nothing on backnet",',
			'			"\\"\\"",',
			'			func() string { return q("worker", "postgres") }},',
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
			'// Container is one running container as the embedded DNS sees it.',
			'// Networks maps network name -> this container\'s IP on that network',
			'// (a container holds one IP per network it is attached to).',
			'type Container struct {',
			'	Name     string',
			'	Networks map[string]string',
			'}',
			'',
			'// Network is one Docker bridge network.',
			'// UserDefined is false only for the default "bridge" — the embedded',
			'// DNS does not serve names there at all.',
			'// Aliases maps container name -> that container\'s extra DNS names on',
			'// THIS network (--network-alias, Compose service names). Aliases are',
			'// per-network: the same container can answer to different names on',
			'// different networks.',
			'type Network struct {',
			'	Name        string',
			'	UserDefined bool',
			'	Aliases     map[string][]string',
			'}',
			'',
			'// Resolve answers one DNS query from container `from` for `name`, as',
			'// the embedded server at 127.0.0.11 would.',
			'//',
			'// The load-bearing design decision is that the search is scoped to the',
			'// CALLER\'s networks, not to the whole daemon. The DNS is not a global',
			'// directory of containers — it is a per-network one, because a name',
			'// that resolved to an IP the caller cannot route to would be worse',
			'// than NXDOMAIN (connect timeouts instead of an instant, honest',
			'// lookup failure). Scoping the search guarantees every answer is',
			'// reachable by construction.',
			'func Resolve(nets []Network, containers []Container, from, name string) string {',
			'	// Identify the caller first: answers depend on who is asking.',
			'	// Two containers issuing the same query can get different IPs',
			'	// (or one an answer and one NXDOMAIN) based on their attachments.',
			'	var caller *Container',
			'	for i := range containers {',
			'		if containers[i].Name == from {',
			'			caller = &containers[i]',
			'			break',
			'		}',
			'	}',
			'	if caller == nil {',
			'		// Unknown caller: nothing to scope the search to. Zero value,',
			'		// not a panic — the harness (and yaegi) must never unwind.',
			'		return ""',
			'	}',
			'',
			'	// Walk nets in slice order rather than ranging over the caller\'s',
			'	// Networks map: map iteration order is random in Go, and a resolver',
			'	// must be deterministic for the same daemon state.',
			'	for _, n := range nets {',
			'		// Rule 1: the default bridge does no name resolution. This is',
			'		// deliberate daemon policy, not an accident — the legacy bridge',
			'		// predates the embedded DNS, and only the deprecated --link',
			'		// mechanism (out of scope here) ever injected names on it.',
			'		if !n.UserDefined {',
			'			continue',
			'		}',
			'		// Rule 2: only networks the caller is attached to are searched.',
			'		// Membership == "has an IP on it": attachment and addressing',
			'		// are the same fact in this model, as in the real daemon.',
			'		if _, attached := caller.Networks[n.Name]; !attached {',
			'			continue',
			'		}',
			'		// Rule 3: on this shared network, match container names and',
			'		// per-network aliases. The answer is always the candidate\'s IP',
			'		// on THIS network — a multi-homed container\'s other addresses',
			'		// belong to networks the caller may not reach.',
			'		for _, c := range containers {',
			'			ip, onNet := c.Networks[n.Name]',
			'			if !onNet {',
			'				continue // not attached here; its name is invisible here',
			'			}',
			'			if c.Name == name {',
			'				// Self-resolution falls out for free: the caller is a',
			'				// candidate on its own networks, so `ping api` from',
			'				// api answers with its own per-network IP.',
			'				return ip',
			'			}',
			'			for _, alias := range n.Aliases[c.Name] {',
			'				if alias == name {',
			'					return ip',
			'				}',
			'			}',
			'		}',
			'	}',
			'	// No shared user-defined network carries the name: NXDOMAIN.',
			'	return ""',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why per-network, and why the default bridge is excluded</h3>' +
			'<p>The embedded DNS could easily have been a daemon-wide phone book — ' +
			'every container name resolving from everywhere. It is per-network ' +
			'because <strong>the network is Docker\'s isolation boundary</strong>, ' +
			'and DNS scoping is what makes that boundary real. If <code>api</code> ' +
			'could resolve <code>billing-db</code> on a network it isn\'t attached ' +
			'to, it would learn an IP that its network namespace cannot route to — ' +
			'the name lookup would succeed and the connection would hang, the worst ' +
			'possible failure mode. Scoping resolution to shared networks means ' +
			'<em>every answer is reachable by construction</em>, and it turns ' +
			'network attachment into a capability: attach a container to a network ' +
			'and it gains both the route and the names; detach it and both vanish ' +
			'atomically. The multi-homed rule is the same principle: <code>db</code> ' +
			'on two networks has two IPs, and each caller is told the one on the ' +
			'network they share — which is why the model returns ' +
			'<code>c.Networks[n.Name]</code> and never “db\'s IP”.</p>' +
			'<p>The default bridge is excluded for historical honesty rather than ' +
			'elegance: it predates user-defined networks, and its only naming ' +
			'mechanism was <code>--link</code>, which wrote static entries into ' +
			'<code>/etc/hosts</code> — entries that went stale when the linked ' +
			'container restarted with a new IP. Rather than retrofit dynamic DNS ' +
			'onto the legacy bridge, Docker deprecated links and made “create a ' +
			'network” the one-line fix. This is exactly the ' +
			'<strong>works-in-compose, fails-with-docker-run</strong> trap: Compose ' +
			'creates <code>&lt;project&gt;_default</code> as a user-defined network ' +
			'and attaches every service with its service name as an alias — so ' +
			'service names “just work” in Compose and silently don\'t exist for a ' +
			'bare <code>docker run</code>.</p>' +
			'<h3>Aliases are the Compose service-name mechanism</h3>' +
			'<p>The <code>Aliases</code> map being <em>on the network</em>, not on ' +
			'the container, mirrors the real API (<code>docker network inspect</code> ' +
			'shows aliases per endpoint). A container named ' +
			'<code>myproj-db-1</code> answers to <code>db</code> only because ' +
			'Compose registered <code>db</code> as its alias on the project ' +
			'network. Aliases also need not be unique: scale a service to three ' +
			'replicas sharing one alias and the embedded DNS returns multiple ' +
			'A&nbsp;records — client-side round-robin as a poor man\'s load ' +
			'balancer. (This model returns the first match for determinism; the ' +
			'real server returns the full record set in randomized order.)</p>' +
			'<h3>When debugging</h3>' +
			'<p><code>docker exec app cat /etc/resolv.conf</code> shows ' +
			'<code>nameserver 127.0.0.11</code> — the embedded server, reached via ' +
			'a NAT redirect inside the container\'s namespace to the daemon\'s ' +
			'actual listener. <code>lookup db … no such host</code> therefore means ' +
			'one of exactly three things, checkable with ' +
			'<code>docker inspect -f \'{{json .NetworkSettings.Networks}}\' app</code>: ' +
			'the caller is on the default bridge; the two containers share no ' +
			'network; or the name/alias doesn\'t exist on the shared one. The ' +
			'no-downtime fix is <code>docker network connect appnet app</code> — ' +
			'attachment is dynamic, and names appear the moment the endpoint ' +
			'joins. And if a connection <em>times out</em> after a successful ' +
			'lookup, suspect the opposite bug: you resolved an alias to a ' +
			'container that also sits on other networks and are dialing a ' +
			'published port instead of the shared-network IP the DNS handed ' +
			'you.</p>',
		],
		complexity: { time: 'O(N · C · A) — networks × containers × aliases per candidate, all tiny in practice', space: 'O(1) beyond the inputs' },
	});
})();
