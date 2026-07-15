/* The Three-Way Handshake — TCP (lesson). SYN, SYN-ACK, ACK is not a
 * greeting ritual: it is the exchange of initial sequence numbers, and the
 * two ack values fall out of one rule ("ack = the next byte I expect") plus
 * one quirk (the SYN flag consumes a sequence number). The lesson replays
 * the ladder as a printed trace with the ack arithmetic left to fill in.
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// The classic ladder: two lifelines, three crossing arrows, with the
	// state each side sits in annotated alongside. Marker ids namespaced
	// (dgArrowNHS*) because every track's SVGs share the page's id space.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 265" width="520" height="265" role="img" aria-label="three-way handshake ladder: SYN, SYN-ACK, ACK exchange initial sequence numbers; both sides end ESTABLISHED">' +
		'<text x="120" y="28" text-anchor="middle">client</text>' +
		'<text x="400" y="28" text-anchor="middle">server</text>' +
		'<path d="M 120 38 L 120 225" stroke="var(--edge)" stroke-width="1.5"/>' +
		'<path d="M 400 38 L 400 225" stroke="var(--edge)" stroke-width="1.5"/>' +
		'<text x="408" y="52" class="lbl">LISTEN</text>' +
		// 1: SYN
		'<path d="M 120 62 L 392 92" stroke="var(--accent)" stroke-width="1.8" fill="none" marker-end="url(#dgArrowNHS)"/>' +
		'<text x="260" y="66" text-anchor="middle" class="lbl">SYN seq=3000</text>' +
		'<text x="112" y="60" text-anchor="end" class="lbl">SYN_SENT</text>' +
		'<text x="408" y="102" class="lbl" style="fill:var(--warn)">SYN_RCVD — state committed</text>' +
		// 2: SYN-ACK
		'<path d="M 400 118 L 128 148" stroke="var(--accent)" stroke-width="1.8" fill="none" marker-end="url(#dgArrowNHS)"/>' +
		'<text x="260" y="122" text-anchor="middle" class="lbl">SYN-ACK seq=8000 ack=3001</text>' +
		// 3: ACK
		'<path d="M 120 172 L 392 202" stroke="var(--ok)" stroke-width="1.8" fill="none" marker-end="url(#dgArrowNHSok)"/>' +
		'<text x="260" y="176" text-anchor="middle" class="lbl">ACK seq=3001 ack=8001</text>' +
		'<text x="112" y="170" text-anchor="end" class="lbl" style="fill:var(--ok)">ESTABLISHED</text>' +
		'<text x="408" y="212" class="lbl" style="fill:var(--ok)">ESTABLISHED</text>' +
		'<text x="20" y="252" class="lbl">ack = peer seq + 1: the SYN flag consumes one sequence number — with zero data bytes moved</text>' +
		'<defs>' +
		'<marker id="dgArrowNHS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowNHSok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'tcp-handshake',
		title: 'The Three-Way Handshake',
		nav: 'Three-way handshake',
		category: 'TCP',

		prose: [
			'<h2>The Three-Way Handshake</h2>' +
			'<p>A downstream service stops answering and you run <code>ss -t</code>: ' +
			'connections piling up in <code>SYN_SENT</code>. Or the on-call channel ' +
			'lights up about a SYN flood. Both incidents live inside the same three ' +
			'packets — the handshake every TCP connection starts with.</p>' +
			'<p><strong>SYN is short for "synchronize sequence numbers"</strong> — the ' +
			'handshake\'s real job is not saying hello but exchanging each side\'s ' +
			'<em>initial sequence number</em> (ISN), the starting coordinate for every ' +
			'byte that will follow in that direction. Two rules generate the entire ' +
			'trace:</p>' +
			'<ul>' +
			'<li>An ack number always means <strong>"the next byte I expect from ' +
			'you"</strong> — cumulative, one number, no lists.</li>' +
			'<li>The SYN flag itself <strong>consumes one sequence number</strong>, ' +
			'exactly as if it were a byte of data. That is why each side acks ' +
			'<code>peerISN + 1</code> even though zero data bytes have moved — ' +
			'occupying a slot in sequence space is what makes the SYN itself ' +
			'acknowledgeable and retransmittable by the ordinary data machinery, with ' +
			'no special cases.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p><strong>SYN floods</strong> exploit the asymmetry at step 2: on ' +
			'receiving a SYN the server commits memory — a half-open ' +
			'<code>SYN_RCVD</code> entry in the listen backlog — while the client has ' +
			'spent nothing and simply never sends the final ACK. Enough spoofed SYNs ' +
			'and the backlog is full of ghosts. SYN cookies are the classic defense: ' +
			'encode the connection\'s state <em>into the ISN the server sends back</em> ' +
			'and keep no entry at all — if the final ACK ever arrives, its ack number ' +
			'(that ISN + 1) carries the state home.</p>' +
			'<p><strong>ISNs are randomized</strong> because sequence numbers are the ' +
			'only proof of participation TCP has: an off-path attacker who can guess ' +
			'them can inject RSTs — or data — into your connection without seeing a ' +
			'single packet of it. And when a service is down, <code>ss -t</code> shows ' +
			'the difference: <code>SYN_SENT</code> piling up means step 1 is getting ' +
			'<em>no answer</em> (dead host, or a firewall silently dropping), while a ' +
			'fast <code>connection refused</code> means an RST answered the SYN — ' +
			'something is alive there, just not listening on that port.</p>' +
			'<h3>Your job</h3>' +
			'<p>The program on the right replays the ladder with ' +
			'<code>clientISN = 3000</code> and <code>serverISN = 8000</code>. The two ' +
			'ack computations are stubbed at 0 and the final state line is missing — ' +
			'fill in both acks (peer\'s seq + 1) and print ' +
			'<code>both ESTABLISHED</code>.</p>' +
			'<div class="tip">The third packet is not wasted: the client may attach ' +
			'data to its final ACK, and TCP Fast Open goes further and puts data on ' +
			'the SYN itself. The handshake costs one round trip, not three.</div>',
		],

		task: 'Compute both ack numbers (peer seq + 1 — the SYN consumes one sequence number) and print the final state line.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	// Each side picks its own Initial Sequence Number. A real stack',
			'	// randomizes these (guessable ISNs allow off-path injection);',
			'	// fixed here so the trace is checkable.',
			'	clientISN := 3000',
			'	serverISN := 8000',
			'',
			'	// Step 1 — client enters SYN_SENT. The SYN says: "let\'s',
			'	// synchronize sequence numbers; mine start at 3000."',
			'	fmt.Printf("client -> server: SYN seq=%d\\n", clientISN)',
			'',
			'	// Step 2 — server enters SYN_RCVD and answers with its own SYN',
			'	// plus an ACK of the client\'s. TODO: an ack number is "the next',
			'	// byte I expect", and the SYN flag consumed one sequence number —',
			'	// so the right value is NOT clientISN.',
			'	synAckAck := 0 // TODO: compute from clientISN',
			'	fmt.Printf("server -> client: SYN-ACK seq=%d ack=%d\\n", serverISN, synAckAck)',
			'',
			'	// Step 3 — client acks the server\'s SYN the same way. Its own seq',
			'	// is already clientISN+1: the SYN it sent consumed that number.',
			'	finalAck := 0 // TODO: compute from serverISN',
			'	fmt.Printf("client -> server: ACK seq=%d ack=%d\\n", clientISN+1, finalAck)',
			'',
			'	// TODO: both SYNs are now acknowledged — print "both ESTABLISHED"',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('server -> client: SYN-ACK seq=8000 ack=3001') !== -1 &&
				flat.indexOf('client -> server: ACK seq=3001 ack=8001') !== -1 &&
				flat.indexOf('both ESTABLISHED') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	// Each side picks its own Initial Sequence Number. A real stack',
			'	// randomizes these (guessable ISNs allow off-path injection);',
			'	// fixed here so the trace is checkable.',
			'	clientISN := 3000',
			'	serverISN := 8000',
			'',
			'	// Step 1 — client enters SYN_SENT. The SYN says: "let\'s',
			'	// synchronize sequence numbers; mine start at 3000."',
			'	fmt.Printf("client -> server: SYN seq=%d\\n", clientISN)',
			'',
			'	// Step 2 — server enters SYN_RCVD. ack = clientISN + 1 because the',
			'	// SYN flag occupies one slot in sequence space: that makes the SYN',
			'	// acknowledgeable and retransmittable by the same machinery as',
			'	// data, and "ack = next byte I expect" needs no special case for',
			'	// the handshake. This is also the moment the server commits',
			'	// backlog state — the asymmetry SYN floods attack.',
			'	synAckAck := clientISN + 1',
			'	fmt.Printf("server -> client: SYN-ACK seq=%d ack=%d\\n", serverISN, synAckAck)',
			'',
			'	// Step 3 — the same rule pointed the other way: the server\'s SYN',
			'	// consumed serverISN, so the client expects serverISN+1 next. The',
			'	// client\'s own seq has moved to clientISN+1 for the same reason.',
			'	finalAck := serverISN + 1',
			'	fmt.Printf("client -> server: ACK seq=%d ack=%d\\n", clientISN+1, finalAck)',
			'',
			'	// Both sides have seen their SYN acknowledged: the connection is',
			'	// symmetric from here on — two independent byte streams, each',
			'	// numbered from its own ISN.',
			'	fmt.Println("both ESTABLISHED")',
			'}',
			'',
		].join('\n'),
	});
})();
