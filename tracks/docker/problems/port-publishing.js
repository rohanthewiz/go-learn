/* Port Publishing — Running Containers (Medium). The -p spec grammar the
 * daemon parses on every `docker run -p`, and the EXPOSE/-P relationship
 * behind the #1 Docker misconception: EXPOSE publishes nothing — it is
 * metadata, and only -p / -P create host bindings. The harness pins the
 * plain mapping, the loopback bind, the ephemeral short form, 1:1 range
 * expansion, the same-length rule, and -P over two exposed ports.
 */
(function () {
	'use strict';
	var T = GoLearnDocker;

	// Spec anatomy on top (colon count IS the grammar), EXPOSE vs -P below.
	// Marker ids namespaced (dgArrowDKPP*) because every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 252" width="520" height="252" role="img" aria-label="anatomy of a -p publish spec: optional bind IP, host port range, container port range, protocol; below, EXPOSE alone publishes nothing while -P publishes every exposed port to an ephemeral host port">' +
		'<text x="20" y="22" class="lbl">-p spec anatomy — the colon count is the grammar</text>' +
		// the four segments of a maximal spec
		'<rect x="20" y="34" width="100" height="34" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="70" y="56" text-anchor="middle">127.0.0.1</text>' +
		'<text x="127" y="57" text-anchor="middle">:</text>' +
		'<rect x="134" y="34" width="100" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="184" y="56" text-anchor="middle">6000-6002</text>' +
		'<text x="241" y="57" text-anchor="middle">:</text>' +
		'<rect x="248" y="34" width="100" height="34" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="298" y="56" text-anchor="middle">7000-7002</text>' +
		'<text x="355" y="57" text-anchor="middle">/</text>' +
		'<rect x="362" y="34" width="64" height="34" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="394" y="56" text-anchor="middle">udp</text>' +
		'<text x="70" y="86" text-anchor="middle" class="lbl">bind IP — 2 colons only</text>' +
		'<text x="184" y="86" text-anchor="middle" class="lbl">host side</text>' +
		'<text x="298" y="86" text-anchor="middle" class="lbl">container side</text>' +
		'<text x="394" y="86" text-anchor="middle" class="lbl">dflt tcp</text>' +
		'<text x="240" y="108" text-anchor="middle" class="lbl" style="fill:var(--warn)">ranges pair 1:1 — SAME length or error; omitted host side &#8658; ephemeral (0)</text>' +
		// EXPOSE lane: the dashed arrow to nowhere
		'<rect x="20" y="126" width="112" height="32" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="76" y="147" text-anchor="middle">EXPOSE 80</text>' +
		'<path d="M 136 142 H 236" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowDKPPwarn)"/>' +
		'<text x="246" y="146" class="lbl" style="fill:var(--warn)">publishes NOTHING — metadata in the image config</text>' +
		// -P lane: the solid arrow that actually binds
		'<rect x="20" y="176" width="112" height="32" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="76" y="197" text-anchor="middle">-P</text>' +
		'<path d="M 136 192 H 236" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDKPPok)"/>' +
		'<text x="246" y="196" class="lbl" style="fill:var(--ok)">every EXPOSEd port &#8594; 0.0.0.0:ephemeral</text>' +
		'<text x="20" y="240" class="lbl">docker ps: “8080/tcp” = unpublished rumor · “0.0.0.0:8080-&gt;80/tcp” = real binding</text>' +
		'<defs>' +
		'<marker id="dgArrowDKPPwarn" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowDKPPok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'port-publishing',
		title: 'Port Publishing: -p, EXPOSE, and -P',
		nav: 'port publishing',
		difficulty: 'Medium',
		category: 'Running Containers',
		task: 'Implement ParsePublish (the -p spec grammar: bind IP, 1:1 range expansion, default tcp, ephemeral host ports) and PublishAll (-P: every EXPOSEd port to an ephemeral host port).',

		prose: [
			'<h2>Port Publishing: -p, EXPOSE, and -P</h2>' +
			'<p>The image builds clean, <code>docker run -d myapi</code> prints a ' +
			'container id, <code>docker logs</code> shows the server listening on ' +
			'8080 — and <code>curl localhost:8080</code> says ' +
			'<code>connection refused</code>. <code>docker ps</code> holds the tell: ' +
			'the PORTS column reads a bare <code>8080/tcp</code> — no arrow, no host ' +
			'side. The Dockerfile said <code>EXPOSE 8080</code>, and this is the ' +
			'single most common Docker misconception: <strong>EXPOSE publishes ' +
			'nothing</strong>. It is metadata the build stores in the image config — ' +
			'documentation for humans and input for <code>-P</code>. A port reaches ' +
			'the host only through <code>-p</code> (an explicit binding) or ' +
			'<code>-P</code> (publish <em>every</em> EXPOSEd port to an ephemeral ' +
			'host port). Re-run with <code>-p 8080:8080</code> and the column flips ' +
			'to <code>0.0.0.0:8080-&gt;8080/tcp</code> — that arrow is the ' +
			'difference between a service and a rumor.</p>' +
			'<ul>' +
			'<li><strong>The grammar.</strong> ' +
			'<code>[hostIP:]hostPort[-end]:containerPort[-end][/proto]</code>, or ' +
			'just <code>containerPort[/proto]</code>. The colon count <em>is</em> the ' +
			'parse: one field is a container port, two are host:container, three put ' +
			'a bind IP in front. So <code>1.2.3.4:80</code> is an error — with one ' +
			'colon the first field is a host <em>port</em>; the IP slot only exists ' +
			'at two colons.</li>' +
			'<li><strong>Proto defaults to <code>tcp</code></strong>; ' +
			'<code>/udp</code> and <code>/sctp</code> are the alternatives. Anything ' +
			'else is an error.</li>' +
			'<li><strong>Missing host port &#8658; ephemeral.</strong> The short ' +
			'form <code>-p 80</code>, or an empty middle field like ' +
			'<code>127.0.0.1::6379</code>, means “kernel picks a free port at bind ' +
			'time” — represented as <code>HostPort 0</code>, the same sentinel as ' +
			'binding a socket to port 0.</li>' +
			'<li><strong>Ranges expand 1:1, positionally.</strong> ' +
			'<code>6000-6002:7000-7002</code> is three independent mappings, not a ' +
			'pool — so the two ranges must be the <em>same length</em>, otherwise ' +
			'error. (Real docker additionally allows a host range onto a single ' +
			'container port and grabs one free port from the range; that requires ' +
			'bind-time state a parser does not have, so this model rejects it.)</li>' +
			'<li><strong>EXPOSE is metadata; <code>-P</code> is its consumer.</strong> ' +
			'<code>-P</code> walks the EXPOSEd entries (<code>"80/tcp"</code>, ' +
			'<code>"53/udp"</code>) and mints one ephemeral all-interfaces binding ' +
			'per entry. That is the <em>only</em> thing EXPOSE feeds at run time.</li>' +
			'</ul>',
			{ lang: 'txt', code: '-p 8080:80                   0.0.0.0:8080 -> 80/tcp\n-p 127.0.0.1:5432:5432       loopback only — invisible to the LAN\n-p 80                        ephemeral -> 80/tcp     (docker port to find it)\n-p 6000-6002:7000-7002/udp   three mappings, expanded 1:1\nEXPOSE 80    (Dockerfile)    publishes NOTHING — metadata\n-P                           every EXPOSEd port -> ephemeral host port' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>ParsePublish(spec)</code> — parse one <code>-p</code> ' +
			'value into its expanded <code>[]Mapping</code>, returning ' +
			'<code>(mappings, "")</code> on success or <code>(nil, message)</code> on ' +
			'any malformed spec (never panic; the harness only checks that the ' +
			'message is non-empty). Then <code>PublishAll(exposed)</code> — the ' +
			'<code>-P</code> path: one ephemeral <code>Mapping</code> per EXPOSEd ' +
			'entry, proto defaulting to tcp.</p>',
			'<div class="tip">Field note: <code>-p 5432:5432</code> binds ' +
			'<code>0.0.0.0</code>, and docker installs its DNAT rules <em>ahead</em> ' +
			'of most host firewalls — ufw included — so that Postgres is now ' +
			'reachable from the whole LAN even though you “blocked” the port. Teams ' +
			'discover this in a pentest report. The fix is the three-field form: ' +
			'<code>-p 127.0.0.1:5432:5432</code>. And when the host port is ' +
			'ephemeral, <code>docker port &lt;ctr&gt;</code> tells you what the ' +
			'kernel picked.</div>',
		],

		starter: [
			'package main',
			'',
			'// Mapping is one host->container binding: the daemon\'s in-memory result',
			'// of parsing a -p flag. HostPort 0 means "ephemeral" — the kernel picks',
			'// a free port at bind time (docker port <ctr> reveals it afterwards).',
			'type Mapping struct {',
			'	HostIP        string // "" = all interfaces (0.0.0.0)',
			'	HostPort      int    // 0 = ephemeral',
			'	ContainerPort int',
			'	Proto         string // "tcp", "udp", or "sctp"',
			'}',
			'',
			'// ParsePublish parses one -p publish spec into its expanded mappings.',
			'//',
			'// Grammar:  [hostIP:]hostPort[-endPort]:containerPort[-endPort][/proto]',
			'//      or:  containerPort[-endPort][/proto]      (host port ephemeral)',
			'//',
			'//   - proto defaults to "tcp"; "udp" and "sctp" are the other legal',
			'//     values — anything else is an error',
			'//   - the colon count is the grammar: 1 field = container port only,',
			'//     2 = hostPort:containerPort, 3 = hostIP:hostPort:containerPort.',
			'//     So "1.2.3.4:80" is an error: with one colon the first field is a',
			'//     host PORT, and an IP is not a port',
			'//   - a missing host port (short form, or an empty middle field as in',
			'//     "127.0.0.1::6379") means ephemeral -> HostPort 0',
			'//   - a host range maps 1:1 onto a container range, positionally; the',
			'//     ranges must be the SAME length (one Mapping per pair), else error',
			'//   - ports are 1..65535; a reversed range (hi < lo) is an error',
			'//',
			'// Returns (mappings, "") on success, or (nil, message) with a non-empty',
			'// human-readable message on any malformed spec — never panic. (The',
			'// harness only checks that the message is non-empty; word it however',
			'// helps a future you.)',
			'func ParsePublish(spec string) ([]Mapping, string) {',
			'	// your code here',
			'	return nil, ""',
			'}',
			'',
			'// PublishAll implements -P: every EXPOSEd port (entries like "80/tcp",',
			'// proto defaulting to "tcp" when absent) becomes one ephemeral binding',
			'// — HostIP "" (all interfaces), HostPort 0. EXPOSE alone publishes',
			'// nothing; this function is the only run-time consumer of that',
			'// metadata. Skip any entry whose port is not a valid 1..65535 number',
			'// (image metadata is foreign input — tolerate, don\'t fail).',
			'func PublishAll(exposed []string) []Mapping {',
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
			'	"strconv"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// fmtMaps renders mappings the way docker ps does: ip:host->ctr/proto,',
			'	// "*" for all interfaces, "eph" for an ephemeral (0) host port. Error',
			'	// results collapse to the single token "error" — the cases pin WHICH',
			'	// specs fail, not the wording of the learner\'s messages.',
			'	fmtMaps := func(ms []Mapping, errMsg string) string {',
			'		if errMsg != "" {',
			'			return "error"',
			'		}',
			'		if len(ms) == 0 {',
			'			return "(none)"',
			'		}',
			'		parts := make([]string, 0, len(ms))',
			'		for _, m := range ms {',
			'			ip := m.HostIP',
			'			if ip == "" {',
			'				ip = "*"',
			'			}',
			'			hp := "eph"',
			'			if m.HostPort != 0 {',
			'				hp = strconv.Itoa(m.HostPort)',
			'			}',
			'			parts = append(parts, fmt.Sprintf("%s:%s->%d/%s", ip, hp, m.ContainerPort, m.Proto))',
			'		}',
			'		return strings.Join(parts, ", ")',
			'	}',
			'	parse := func(spec string) string {',
			'		ms, errMsg := ParsePublish(spec)',
			'		return fmtMaps(ms, errMsg)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"-p 8080:80 — the everyday form: one tcp mapping on all interfaces",',
			'			"*:8080->80/tcp",',
			'			func() string { return parse("8080:80") }},',
			'		{"-p 127.0.0.1:5432:5432 — two colons unlock the bind-IP slot",',
			'			"127.0.0.1:5432->5432/tcp",',
			'			func() string { return parse("127.0.0.1:5432:5432") }},',
			'		{"-p 80 — no host side: ephemeral, HostPort 0",',
			'			"*:eph->80/tcp",',
			'			func() string { return parse("80") }},',
			'		{"-p 6000-6002:7000-7002/udp — ranges expand 1:1, positionally",',
			'			"*:6000->7000/udp, *:6001->7001/udp, *:6002->7002/udp",',
			'			func() string { return parse("6000-6002:7000-7002/udp") }},',
			'		{"-p 6000-6005:7000-7002 — mismatched range lengths have no positional answer",',
			'			"error",',
			'			func() string { return parse("6000-6005:7000-7002") }},',
			'		{"-p 1.2.3.4:80 — one colon means hostPort:containerPort, and an IP is not a port",',
			'			"error",',
			'			func() string { return parse("1.2.3.4:80") }},',
			'		{"-p 127.0.0.1::6379 — empty middle field: loopback bind, ephemeral host port",',
			'			"127.0.0.1:eph->6379/tcp",',
			'			func() string { return parse("127.0.0.1::6379") }},',
			'		{"-p 8080:80/http — proto must be tcp, udp, or sctp",',
			'			"error",',
			'			func() string { return parse("8080:80/http") }},',
			'		{"-P over EXPOSE 80/tcp + 53/udp — every exposed port to an ephemeral host port",',
			'			"*:eph->80/tcp, *:eph->53/udp",',
			'			func() string { return fmtMaps(PublishAll([]string{"80/tcp", "53/udp"}), "") }},',
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
			'// Mapping is one host->container binding: the daemon\'s in-memory result',
			'// of parsing a -p flag. HostPort 0 means "ephemeral" — the kernel picks',
			'// a free port at bind time (docker port <ctr> reveals it afterwards).',
			'type Mapping struct {',
			'	HostIP        string // "" = all interfaces (0.0.0.0)',
			'	HostPort      int    // 0 = ephemeral',
			'	ContainerPort int',
			'	Proto         string // "tcp", "udp", or "sctp"',
			'}',
			'',
			'// parsePort validates one numeric port field. 0 is rejected on purpose:',
			'// in the spec grammar "ephemeral" is expressed by OMITTING the host',
			'// field, never by writing 0 — so an explicit 0 is a typo, not a wish.',
			'func parsePort(s string) (int, string) {',
			'	p, err := strconv.Atoi(s)',
			'	if err != nil {',
			'		return 0, "invalid port \\"" + s + "\\": not a number"',
			'	}',
			'	if p < 1 || p > 65535 {',
			'		return 0, "invalid port \\"" + s + "\\": outside 1-65535"',
			'	}',
			'	return p, ""',
			'}',
			'',
			'// parseRange parses "N" or "N-M" into an inclusive [lo, hi] pair. A',
			'// single port is the degenerate range lo == hi — that one choice lets',
			'// the expansion loop treat both shapes identically, no special case.',
			'func parseRange(s string) (int, int, string) {',
			'	dash := strings.Index(s, "-")',
			'	if dash < 0 {',
			'		p, errMsg := parsePort(s)',
			'		if errMsg != "" {',
			'			return 0, 0, errMsg',
			'		}',
			'		return p, p, ""',
			'	}',
			'	lo, loErr := parsePort(s[:dash])',
			'	if loErr != "" {',
			'		return 0, 0, loErr',
			'	}',
			'	hi, hiErr := parsePort(s[dash+1:])',
			'	if hiErr != "" {',
			'		return 0, 0, hiErr',
			'	}',
			'	if lo > hi {',
			'		return 0, 0, "invalid range \\"" + s + "\\": start above end"',
			'	}',
			'	return lo, hi, ""',
			'}',
			'',
			'// ParsePublish parses one -p publish spec into its expanded mappings.',
			'// Second result is "" on success, a human-readable message otherwise.',
			'func ParsePublish(spec string) ([]Mapping, string) {',
			'	// Protocol is the trailing /-piece; split it off FIRST so only the',
			'	// colon-separated port section remains. Defaulting to tcp here is',
			'	// why `-p 8080:80` and `EXPOSE 80` both mean tcp without saying so.',
			'	proto := "tcp"',
			'	body := spec',
			'	if slash := strings.LastIndex(spec, "/"); slash >= 0 {',
			'		body = spec[:slash]',
			'		proto = spec[slash+1:]',
			'	}',
			'	if proto != "tcp" && proto != "udp" && proto != "sctp" {',
			'		return nil, "unknown protocol \\"" + proto + "\\" (want tcp, udp, or sctp)"',
			'	}',
			'',
			'	// The colon count IS the grammar: 1 field = container only, 2 =',
			'	// host:container, 3 = ip:host:container. This is exactly why',
			'	// "1.2.3.4:80" fails — at one colon the first field is a host PORT,',
			'	// and the IP slot only comes into existence at two colons.',
			'	fields := strings.Split(body, ":")',
			'	hostIP := ""',
			'	hostSpec := ""',
			'	containerSpec := ""',
			'	switch len(fields) {',
			'	case 1:',
			'		containerSpec = fields[0]',
			'	case 2:',
			'		hostSpec = fields[0]',
			'		containerSpec = fields[1]',
			'	case 3:',
			'		hostIP = fields[0]',
			'		hostSpec = fields[1]',
			'		containerSpec = fields[2]',
			'		if hostIP == "" {',
			'			return nil, "empty host IP in \\"" + spec + "\\""',
			'		}',
			'	default:',
			'		return nil, "too many colons in \\"" + spec + "\\""',
			'	}',
			'	if containerSpec == "" {',
			'		return nil, "missing container port in \\"" + spec + "\\""',
			'	}',
			'',
			'	cLo, cHi, cErr := parseRange(containerSpec)',
			'	if cErr != "" {',
			'		return nil, cErr',
			'	}',
			'',
			'	// No host port given -> ephemeral. HostPort 0 is the "kernel picks',
			'	// at bind(2) time" sentinel — the same convention as binding a',
			'	// socket to port 0. Each container port gets its own future pick.',
			'	if hostSpec == "" {',
			'		ms := make([]Mapping, 0, cHi-cLo+1)',
			'		for cp := cLo; cp <= cHi; cp++ {',
			'			ms = append(ms, Mapping{HostIP: hostIP, HostPort: 0, ContainerPort: cp, Proto: proto})',
			'		}',
			'		return ms, ""',
			'	}',
			'',
			'	hLo, hHi, hErr := parseRange(hostSpec)',
			'	if hErr != "" {',
			'		return nil, hErr',
			'	}',
			'	// Ranges pair positionally: 6000-6002:7000-7002 is three independent',
			'	// mappings, not a pool. Different lengths have no positional answer,',
			'	// so they are an error. (Real docker permits range:singlePort by',
			'	// grabbing one free host port from the range — that needs bind-time',
			'	// state a pure parser does not have, so this model rejects it.)',
			'	if hHi-hLo != cHi-cLo {',
			'		return nil, "host range and container range must be the same length in \\"" + spec + "\\""',
			'	}',
			'	ms := make([]Mapping, 0, cHi-cLo+1)',
			'	for i := 0; i <= cHi-cLo; i++ {',
			'		ms = append(ms, Mapping{HostIP: hostIP, HostPort: hLo + i, ContainerPort: cLo + i, Proto: proto})',
			'	}',
			'	return ms, ""',
			'}',
			'',
			'// PublishAll is -P: walk the image\'s EXPOSE metadata and mint one',
			'// ephemeral all-interfaces binding per entry. This is the ONLY thing',
			'// EXPOSE feeds at run time — without -P (or an explicit -p) an EXPOSEd',
			'// port is pure documentation.',
			'func PublishAll(exposed []string) []Mapping {',
			'	ms := make([]Mapping, 0, len(exposed))',
			'	for _, entry := range exposed {',
			'		proto := "tcp"',
			'		portStr := entry',
			'		if slash := strings.Index(entry, "/"); slash >= 0 {',
			'			portStr = entry[:slash]',
			'			proto = entry[slash+1:]',
			'		}',
			'		p, errMsg := parsePort(portStr)',
			'		if errMsg != "" {',
			'			// EXPOSE entries come from image config, not from the user',
			'			// typing at a shell: a mangled one is skipped rather than',
			'			// failing the whole publish — the daemon is tolerant of',
			'			// foreign metadata it did not produce.',
			'			continue',
			'		}',
			'		ms = append(ms, Mapping{HostIP: "", HostPort: 0, ContainerPort: p, Proto: proto})',
			'	}',
			'	return ms',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why EXPOSE exists at all</h3>' +
			'<p>If it publishes nothing, why write it? Because an image is a ' +
			'shipping artifact and someone else runs it: <code>EXPOSE</code> is the ' +
			'image author telling the operator — and tooling — which ports the ' +
			'process inside intends to listen on. <code>docker inspect</code> shows ' +
			'it under <code>Config.ExposedPorts</code>, <code>docker ps</code> ' +
			'prints it (arrow-less), Compose\'s <code>expose:</code> key writes the ' +
			'same metadata, and <code>-P</code> consumes it mechanically — exactly ' +
			'your <code>PublishAll</code>. The design splits <em>declaration</em> ' +
			'(build time, image author) from <em>decision</em> (run time, operator): ' +
			'the author cannot know which host ports are free or safe on a machine ' +
			'they will never see, so the image only declares, and binding is always ' +
			'the operator\'s move.</p>' +
			'<h3>What publishing actually does</h3>' +
			'<p>Each <code>Mapping</code> you produced becomes two real artifacts on ' +
			'the host: a DNAT rule in iptables\' <code>nat</code> table (the ' +
			'<code>DOCKER</code> chain) rewriting ' +
			'<code>hostIP:hostPort &#8594; containerIP:containerPort</code>, plus a ' +
			'<code>docker-proxy</code> process holding the host socket for the ' +
			'edge cases NAT cannot reach (loopback-originated traffic, notably). ' +
			'An ephemeral <code>HostPort 0</code> is resolved at that moment from ' +
			'the kernel\'s <code>ip_local_port_range</code> — which is why the ' +
			'number differs every run and why <code>docker port</code> exists to ' +
			'look it up. It is also why the bind-IP field matters so much: the DNAT ' +
			'rule sits in the <code>FORWARD</code> path <em>ahead</em> of host ' +
			'firewalls like ufw, so <code>-p 5432:5432</code> is LAN-reachable no ' +
			'matter what the firewall says, while <code>-p 127.0.0.1:5432:5432</code> ' +
			'never leaves the machine.</p>' +
			'<h3>Why the parser is strict where docker is clever</h3>' +
			'<p>Two deliberate simplifications in this model. Real docker accepts a ' +
			'host <em>range</em> onto a single container port ' +
			'(<code>-p 8000-8005:80</code>) by trying each host port until one binds ' +
			'— a decision that depends on live socket state, so a pure parser ' +
			'cannot make it; here it is a length-mismatch error, which is also what ' +
			'docker itself says for any other unequal pair ' +
			'(<code>Invalid ranges specified</code>). And IPv6 bind addresses ' +
			'(<code>-p [::1]:80:80</code>) need bracket-aware splitting that would ' +
			'obscure the colon-count grammar this lesson is about. What is ' +
			'<em>not</em> simplified: the colon-count rule itself, which is the real ' +
			'grammar — and the reason <code>docker run -p 1.2.3.4:80 ...</code> ' +
			'fails on real docker with an invalid-port error rather than binding to ' +
			'the IP you obviously meant.</p>' +
			'<h3>When debugging</h3>' +
			'<p><code>connection refused</code> on a published port usually means ' +
			'the process inside is listening on <code>127.0.0.1</code> — inside the ' +
			'container\'s own namespace, unreachable through the veth pair. The ' +
			'DNAT rule delivers the packet to <code>containerIP:port</code>, so the ' +
			'server must bind <code>0.0.0.0</code> <em>inside</em> the container. ' +
			'<code>port is already allocated</code> means the host side of one of ' +
			'your mappings is taken — <code>ss -ltnp</code> names the holder, and ' +
			'sometimes it is a forgotten <code>docker-proxy</code> from a container ' +
			'that did not die cleanly. And when <code>docker ps</code> shows the ' +
			'bare, arrow-less form, you are looking at EXPOSE metadata, not a ' +
			'binding: nothing was published, and no amount of firewall debugging ' +
			'will change that.</p>',
		],
		complexity: { time: 'O(n + r) — one pass over the spec plus one Mapping per expanded port pair', space: 'O(r) — the expanded mappings' },
	});
})();
