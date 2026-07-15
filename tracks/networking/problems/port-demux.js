/* Port Demux — UDP (Medium). How one machine holds 10,000 connections on
 * port 443: socket demultiplexing. TCP delivers on the full 4-tuple with
 * LISTEN as the fallback; UDP delivers on destination only — the source is
 * irrelevant, which is why one DNS socket serves every peer. The harness
 * covers both lookups, bind specificity, established-beats-listener, and
 * the no-match case (RST / ICMP port unreachable).
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// Three incoming flows: one lands on its ESTABLISHED socket (4-tuple
	// match), two unclaimed SYNs funnel into the :443 LISTEN socket.
	// Marker ids namespaced (dgArrowNDX*) — SVG ids share the page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 208" width="560" height="208" role="img" aria-label="socket demultiplexing on port 443: an established connection catches its own client by 4-tuple; two new clients fall through to the LISTEN socket">' +
		'<text x="20" y="18" class="lbl">three flows arrive for 10.0.0.5:443 — the kernel picks a socket for each</text>' +
		// incoming flows
		'<text x="20" y="50" class="lbl">1.1.1.1:5000 (established)</text>' +
		'<text x="20" y="112" class="lbl">2.2.2.2:6000 SYN</text>' +
		'<text x="20" y="150" class="lbl">3.3.3.3:9999 SYN</text>' +
		// established socket
		'<rect x="300" y="28" width="240" height="48" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="420" y="48" text-anchor="middle">ESTABLISHED</text>' +
		'<text x="420" y="66" text-anchor="middle" class="lbl">10.0.0.5:443 ⇄ 1.1.1.1:5000</text>' +
		// listen socket
		'<rect x="300" y="108" width="240" height="48" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="420" y="128" text-anchor="middle">LISTEN</text>' +
		'<text x="420" y="146" text-anchor="middle" class="lbl">*:443 — feeds accept()</text>' +
		// flow arrows
		'<path d="M 178 46 C 230 46 250 50 294 52" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowNDX)"/>' +
		'<path d="M 150 108 C 210 118 250 124 294 128" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowNDXb)"/>' +
		'<path d="M 152 146 C 210 146 250 144 294 142" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowNDXb)"/>' +
		'<text x="20" y="196" class="lbl">exact 4-tuple first; only segments no connection claims fall through to the LISTEN socket</text>' +
		'<defs>' +
		'<marker id="dgArrowNDX" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowNDXb" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'port-demux',
		title: 'Socket Demultiplexing: Who Gets This Packet?',
		nav: 'Port demux',
		difficulty: 'Medium',
		category: 'UDP',
		task: 'Implement Demux — TCP 4-tuple then LISTEN fallback, UDP destination-only, specific bind beats wildcard, all 7 tests.',

		prose: [
			'<h2>Socket Demultiplexing: Who Gets This Packet?</h2>' +
			'<p>One nginx, one port 443, ten thousand simultaneous connections. If a ' +
			'port could only serve one peer, the internet would have ended at one ' +
			'client per server — so how do ten thousand segments arriving “at port 443” ' +
			'each reach the right connection? The kernel runs a lookup called ' +
			'<strong>demultiplexing</strong> over its socket table, and TCP and UDP ' +
			'answer the question with different keys:</p>' +
			'<ul>' +
			'<li><strong>TCP identifies a connection by the full 4-tuple</strong> ' +
			'(local IP, local port, remote IP, remote port). An ESTABLISHED socket ' +
			'whose 4-tuple matches the packet exactly wins over everything — that is ' +
			'why ten thousand connections coexist on one port: each differs in the ' +
			'<em>remote</em> half. Only a segment no connection claims (a fresh SYN) ' +
			'falls through to a <code>Listening</code> socket on the port — the path ' +
			'that ends in <code>accept()</code>.</li>' +
			'<li><strong>UDP matches on the destination only</strong>: ' +
			'<code>(LocalIP, LocalPort)</code> against <code>(DstIP, DstPort)</code>. ' +
			'The source address never enters the lookup, so one socket receives ' +
			'datagrams from <em>every</em> peer — which is exactly how one DNS server ' +
			'socket serves the world.</li>' +
			'<li><strong>A specific bind beats the wildcard.</strong> ' +
			'<code>LocalIP == "*"</code> means bound to every local address ' +
			'(INADDR_ANY); a socket bound to the packet’s exact destination IP is the ' +
			'more precise claim and wins, for both protocols.</li>' +
			'<li><strong>No match at all</strong> → <code>ok == false</code>: the ' +
			'kernel answers a TCP segment with <code>RST</code> and a UDP datagram ' +
			'with ICMP <em>port unreachable</em> — the two flavors of ' +
			'“connection refused”.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Demux(socks, p)</code>: return the ID of the socket ' +
			'that receives packet <code>p</code>, and whether any socket matched. ' +
			'Precedence must not depend on table order — an exact TCP 4-tuple match ' +
			'beats a listener even if the listener appears first.</p>',
			{ code: 'socks: lis-443 (tcp LISTEN *:443)\n       est-a  (tcp 10.0.0.5:443 ⇄ 1.1.1.1:5000)\n\npacket tcp 1.1.1.1:5000 → 10.0.0.5:443  ⇒  "est-a"  (4-tuple match)\npacket tcp 3.3.3.3:9999 → 10.0.0.5:443  ⇒  "lis-443" (SYN → accept path)\npacket udp 8.8.8.8:1234 → 10.0.0.5:9    ⇒  "", false (ICMP port unreachable)', lang: 'txt' },
			'<div class="tip">Two passes keep TCP honest: scan for an established ' +
			'4-tuple match first, and only then consider listeners. A single pass that ' +
			'returns the first plausible socket will hand an established connection’s ' +
			'segment to the listener whenever the listener sorts earlier.</div>',
		],

		starter: [
			'package main',
			'',
			'// Socket is one entry in the kernel\'s socket table.',
			'//   LocalIP "*"         — wildcard bind (INADDR_ANY): any local address.',
			'//   RemoteIP/RemotePort — zero-valued ("" / 0) for LISTEN sockets and',
			'//                         for all UDP sockets: neither has a fixed peer.',
			'//   Listening           — TCP only: a passive socket waiting for SYNs.',
			'type Socket struct {',
			'	ID         string',
			'	Proto      string // "tcp" or "udp"',
			'	LocalIP    string',
			'	LocalPort  int',
			'	RemoteIP   string',
			'	RemotePort int',
			'	Listening  bool',
			'}',
			'',
			'// Packet is the demux key of an arriving segment or datagram, as read',
			'// from its IP + transport headers.',
			'type Packet struct {',
			'	Proto   string',
			'	SrcIP   string',
			'	SrcPort int',
			'	DstIP   string',
			'	DstPort int',
			'}',
			'',
			'// Demux returns the ID of the socket that receives p, and whether any',
			'// socket matched. Rules:',
			'//   UDP — match (LocalPort == DstPort) && (LocalIP == "*" || LocalIP ==',
			'//         DstIP); the SOURCE is irrelevant. Specific LocalIP beats "*".',
			'//   TCP — an exact 4-tuple match (local == dst, remote == src, not',
			'//         listening) beats everything; otherwise a Listening socket on',
			'//         the port (specific LocalIP beats "*").',
			'//   Nothing matches → "", false (the kernel sends RST / ICMP',
			'//   port unreachable).',
			'func Demux(socks []Socket, p Packet) (string, bool) {',
			'	// TODO: implement both lookups.',
			'	return "", false',
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
			'	// A web server\'s table: the listener deliberately sorts FIRST so a',
			'	// naive first-match scan hands established traffic to the listener.',
			'	web := []Socket{',
			'		{ID: "lis-443", Proto: "tcp", LocalIP: "*", LocalPort: 443, Listening: true},',
			'		{ID: "est-a", Proto: "tcp", LocalIP: "10.0.0.5", LocalPort: 443, RemoteIP: "1.1.1.1", RemotePort: 5000},',
			'		{ID: "est-b", Proto: "tcp", LocalIP: "10.0.0.5", LocalPort: 443, RemoteIP: "2.2.2.2", RemotePort: 6000},',
			'	}',
			'	type tc struct {',
			'		name   string',
			'		socks  []Socket',
			'		p      Packet',
			'		wantID string',
			'		wantOK bool',
			'	}',
			'	cases := []tc{',
			'		{"tcp: client A\'s segment finds ITS connection, not the listener",',
			'			web, Packet{"tcp", "1.1.1.1", 5000, "10.0.0.5", 443}, "est-a", true},',
			'		{"tcp: client B, same port 443 — different 4-tuple, different socket",',
			'			web, Packet{"tcp", "2.2.2.2", 6000, "10.0.0.5", 443}, "est-b", true},',
			'		{"tcp: unknown client\'s SYN falls through to LISTEN (the accept path)",',
			'			web, Packet{"tcp", "3.3.3.3", 9999, "10.0.0.5", 443}, "lis-443", true},',
			'		{"tcp: ESTABLISHED beats LISTEN even when the listener is specific-bound",',
			'			[]Socket{',
			'				{ID: "lis-specific", Proto: "tcp", LocalIP: "10.0.0.5", LocalPort: 443, Listening: true},',
			'				{ID: "est-c", Proto: "tcp", LocalIP: "10.0.0.5", LocalPort: 443, RemoteIP: "9.9.9.9", RemotePort: 7000},',
			'			},',
			'			Packet{"tcp", "9.9.9.9", 7000, "10.0.0.5", 443}, "est-c", true},',
			'		{"no socket claims the packet → false (kernel answers RST / ICMP unreachable)",',
			'			web, Packet{"tcp", "1.1.1.1", 5000, "10.0.0.5", 22}, "", false},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases)+2)',
			'	for _, c := range cases {',
			'		want := fmt.Sprintf("%q ok=%v", c.wantID, c.wantOK)',
			'		r := map[string]any{"input": c.name, "want": want}',
			'		runCase(r, func() {',
			'			// Copy the table: user code must not be able to corrupt the',
			'			// shared fleet for later cases.',
			'			id, ok := Demux(append([]Socket(nil), c.socks...), c.p)',
			'			got := fmt.Sprintf("%q ok=%v", id, ok)',
			'			r["pass"] = got == want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	// UDP has no connections: datagrams from two different peers must',
			'	// land on the SAME socket — the source never enters the lookup.',
			'	wantU := "dns-53 / dns-53"',
			'	r := map[string]any{',
			'		"input": "udp: datagrams from two different peers land on the SAME socket",',
			'		"want":  wantU,',
			'	}',
			'	runCase(r, func() {',
			'		dns := []Socket{{ID: "dns-53", Proto: "udp", LocalIP: "*", LocalPort: 53}}',
			'		a, _ := Demux(append([]Socket(nil), dns...), Packet{"udp", "1.1.1.1", 5353, "10.0.0.5", 53})',
			'		b, _ := Demux(append([]Socket(nil), dns...), Packet{"udp", "8.8.8.8", 9999, "10.0.0.5", 53})',
			'		got := a + " / " + b',
			'		r["pass"] = got == wantU',
			'		r["got"] = got',
			'	})',
			'	results = append(results, r)',
			'',
			'	// Bind specificity, both protocols: the wildcard socket sorts first,',
			'	// so first-match scans that ignore specificity pick the wrong one.',
			'	wantS := "udp-eth0 / lis-eth0"',
			'	r = map[string]any{',
			'		"input": "bind specificity: a concrete LocalIP beats the wildcard, tcp and udp alike",',
			'		"want":  wantS,',
			'	}',
			'	runCase(r, func() {',
			'		udpSocks := []Socket{',
			'			{ID: "udp-any", Proto: "udp", LocalIP: "*", LocalPort: 53},',
			'			{ID: "udp-eth0", Proto: "udp", LocalIP: "10.0.0.5", LocalPort: 53},',
			'		}',
			'		tcpSocks := []Socket{',
			'			{ID: "lis-any", Proto: "tcp", LocalIP: "*", LocalPort: 80, Listening: true},',
			'			{ID: "lis-eth0", Proto: "tcp", LocalIP: "10.0.0.5", LocalPort: 80, Listening: true},',
			'		}',
			'		u, _ := Demux(udpSocks, Packet{"udp", "8.8.8.8", 9, "10.0.0.5", 53})',
			'		t, _ := Demux(tcpSocks, Packet{"tcp", "4.4.4.4", 1234, "10.0.0.5", 80})',
			'		got := u + " / " + t',
			'		r["pass"] = got == wantS',
			'		r["got"] = got',
			'	})',
			'	results = append(results, r)',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// Socket is one entry in the kernel\'s socket table.',
			'//   LocalIP "*"         — wildcard bind (INADDR_ANY): any local address.',
			'//   RemoteIP/RemotePort — zero-valued ("" / 0) for LISTEN sockets and',
			'//                         for all UDP sockets: neither has a fixed peer.',
			'//   Listening           — TCP only: a passive socket waiting for SYNs.',
			'type Socket struct {',
			'	ID         string',
			'	Proto      string // "tcp" or "udp"',
			'	LocalIP    string',
			'	LocalPort  int',
			'	RemoteIP   string',
			'	RemotePort int',
			'	Listening  bool',
			'}',
			'',
			'// Packet is the demux key of an arriving segment or datagram, as read',
			'// from its IP + transport headers.',
			'type Packet struct {',
			'	Proto   string',
			'	SrcIP   string',
			'	SrcPort int',
			'	DstIP   string',
			'	DstPort int',
			'}',
			'',
			'// Demux returns the ID of the socket that receives p, and whether any',
			'// socket matched. The structure mirrors the kernel\'s lookup order:',
			'// most specific claim first, and never dependent on table order.',
			'func Demux(socks []Socket, p Packet) (string, bool) {',
			'	if p.Proto == "udp" {',
			'		// UDP demux keys on the DESTINATION only: (dst IP, dst port).',
			'		// The source never enters the lookup — one bound socket hears',
			'		// every peer, which is why "UDP connection" is not a thing the',
			'		// kernel knows about. A specific-IP bind is a more precise',
			'		// claim than the wildcard, so it wins; the wildcard candidate',
			'		// is only remembered as the fallback.',
			'		wildcard := ""',
			'		for _, s := range socks {',
			'			if s.Proto != "udp" || s.LocalPort != p.DstPort {',
			'				continue',
			'			}',
			'			if s.LocalIP == p.DstIP {',
			'				return s.ID, true',
			'			}',
			'			if s.LocalIP == "*" && wildcard == "" {',
			'				wildcard = s.ID',
			'			}',
			'		}',
			'		if wildcard != "" {',
			'			return wildcard, true',
			'		}',
			'		return "", false // kernel answers ICMP port unreachable',
			'	}',
			'',
			'	// TCP pass 1: an ESTABLISHED connection is a full 4-tuple claim —',
			'	// the most specific match possible, so it beats any listener no',
			'	// matter where either sits in the table. This must be a separate',
			'	// pass: a single first-match scan would hand the segment to a',
			'	// listener that merely sorts earlier. (Real kernels make this a',
			'	// hash lookup on the 4-tuple, then a second on (dst IP, dst port).)',
			'	for _, s := range socks {',
			'		if s.Proto == "tcp" && !s.Listening &&',
			'			s.LocalIP == p.DstIP && s.LocalPort == p.DstPort &&',
			'			s.RemoteIP == p.SrcIP && s.RemotePort == p.SrcPort {',
			'			return s.ID, true',
			'		}',
			'	}',
			'',
			'	// TCP pass 2: no connection claims this segment — a fresh SYN (or a',
			'	// stray). Fall through to a LISTEN socket on the port: this is',
			'	// exactly the path that ends in accept(). Specificity again beats',
			'	// the wildcard bind.',
			'	wildcard := ""',
			'	for _, s := range socks {',
			'		if s.Proto != "tcp" || !s.Listening || s.LocalPort != p.DstPort {',
			'			continue',
			'		}',
			'		if s.LocalIP == p.DstIP {',
			'			return s.ID, true',
			'		}',
			'		if s.LocalIP == "*" && wildcard == "" {',
			'			wildcard = s.ID',
			'		}',
			'	}',
			'	if wildcard != "" {',
			'		return wildcard, true',
			'	}',
			'	return "", false // no claimant: kernel answers RST',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The kernel’s two hash tables</h3>' +
			'<p>What you wrote as linear scans, the kernel keeps as hash tables keyed ' +
			'by <code>(proto, src IP, src port, dst IP, dst port)</code>: for TCP, one ' +
			'lookup in the established table on the full 4-tuple, then — only on a ' +
			'miss — one in the listening table on <code>(dst IP, dst port)</code>. ' +
			'Both are O(1), which is the entire reason a server can hold millions of ' +
			'connections: <em>demux cost does not grow with connection count</em>. ' +
			'Note what this implies about ports: a connection is not “using up” port ' +
			'443 — it is using up one 4-tuple. The port only runs out on the ' +
			'<em>client</em> side, where each new connection to the same server needs ' +
			'a fresh ephemeral source port.</p>',
			{ code: '// the load-bearing shape: two passes, most specific claim first\nfor _, s := range socks { // pass 1: full 4-tuple (ESTABLISHED)\n\tif !s.Listening && local == dst && remote == src { return s.ID, true }\n}\nfor _, s := range socks { // pass 2: (dst IP, dst port) → LISTEN\n\tif s.Listening && s.LocalPort == p.DstPort { ... }\n}' },
			'<h3>Why “UDP connections” don’t exist</h3>' +
			'<p>UDP demux never reads the source address, so nothing in the kernel ' +
			'pairs a UDP socket with a peer — one socket, every correspondent. So what ' +
			'does calling <code>connect()</code> on a UDP socket do? It creates no ' +
			'handshake and no state on the far end; it merely <strong>sets a ' +
			'filter</strong>: the socket now discards datagrams from other sources and ' +
			'lets you <code>send()</code> without repeating the address. One useful ' +
			'side effect: a connected UDP socket can report the ICMP <em>port ' +
			'unreachable</em> as an error on the next call — an unconnected one has ' +
			'nowhere to attribute it, and the error is silently dropped. And ' +
			'<code>SO_REUSEPORT</code> is the modern extension to everything above: it ' +
			'lets N sockets bind the <em>same</em> (IP, port) and has the kernel hash ' +
			'flows across them — per-core accept queues without a dispatcher thread.</p>' +
			'<h3>When debugging</h3>' +
			'<p><code>ss -tnp</code> prints precisely the table you implemented — every ' +
			'row a socket, the <code>Local Address:Port</code> and ' +
			'<code>Peer Address:Port</code> columns the two halves of the 4-tuple. The ' +
			'no-match branch is the one you’ll meet in production: a TCP packet no ' +
			'socket claims triggers an immediate <code>RST</code> — the client sees ' +
			'<code>connection refused</code>, proof the machine is up but nothing ' +
			'listens there (a firewall <em>drop</em> instead shows as a timeout — ' +
			'learn to read the difference). The UDP equivalent is ICMP port ' +
			'unreachable, which is exactly how a traceroute probe to a high UDP port ' +
			'knows it finally reached the destination.</p>',
		],
		complexity: { time: 'O(s) — linear scans over the table; kernels hash to O(1)', space: 'O(1)' },
	});
})();
