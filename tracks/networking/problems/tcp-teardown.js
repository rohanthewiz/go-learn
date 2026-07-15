/* TCP Teardown — TCP (lesson). Closing costs four messages and one famous
 * wait. The starter replays the FIN/ACK/FIN/ACK ladder correctly and then
 * closes A immediately — the exact mistake TIME_WAIT exists to prevent. The
 * fix parks A in TIME_WAIT and replays the lost-final-ACK scenario, where A
 * being still alive is the only thing that lets B ever finish.
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// The four-message close plus the 2*MSL tail on the ACTIVE closer, with
	// the lost-ACK replay dashed in. Marker ids namespaced (dgArrowNTW*)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 250" width="520" height="250" role="img" aria-label="four-message TCP close: FIN, ACK, FIN, ACK; A then waits in TIME_WAIT for 2 MSL, long enough to re-ACK a retransmitted FIN from B">' +
		'<text x="140" y="24" text-anchor="middle">A (active closer)</text>' +
		'<text x="380" y="24" text-anchor="middle">B (passive closer)</text>' +
		'<line x1="140" y1="32" x2="140" y2="238" stroke="var(--edge)" stroke-width="1"/>' +
		'<line x1="380" y1="32" x2="380" y2="238" stroke="var(--edge)" stroke-width="1"/>' +
		'<path d="M 148 48 L 372 60" fill="none" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowNTW)"/>' +
		'<text x="260" y="46" text-anchor="middle" class="lbl">FIN seq=5000</text>' +
		'<path d="M 372 74 L 148 86" fill="none" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowNTW)"/>' +
		'<text x="260" y="72" text-anchor="middle" class="lbl">ACK ack=5001 — B enters CLOSE_WAIT</text>' +
		'<path d="M 372 100 L 148 112" fill="none" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowNTW)"/>' +
		'<text x="260" y="98" text-anchor="middle" class="lbl">FIN seq=9000 — B enters LAST_ACK</text>' +
		'<path d="M 148 126 L 372 138" fill="none" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowNTW)"/>' +
		'<text x="260" y="124" text-anchor="middle" class="lbl">ACK ack=9001 (this one can be lost!)</text>' +
		'<line x1="132" y1="130" x2="132" y2="222" stroke="var(--warn)" stroke-width="3"/>' +
		'<text x="62" y="152" text-anchor="middle" class="lbl" style="fill:var(--warn)">TIME_WAIT</text>' +
		'<text x="62" y="166" text-anchor="middle" class="lbl" style="fill:var(--warn)">2 × MSL</text>' +
		'<path d="M 372 164 L 148 176" fill="none" stroke="var(--err-edge)" stroke-width="1.4" stroke-dasharray="5 4" marker-end="url(#dgArrowNTWerr)"/>' +
		'<text x="260" y="162" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">FIN seq=9000 again — my ACK never came</text>' +
		'<path d="M 148 190 L 372 202" fill="none" stroke="var(--ok)" stroke-width="1.8" marker-end="url(#dgArrowNTWok)"/>' +
		'<text x="260" y="188" text-anchor="middle" class="lbl" style="fill:var(--ok)">re-ACK ack=9001 — A is still there</text>' +
		'<text x="140" y="236" text-anchor="middle" class="lbl">CLOSED (after 2·MSL)</text>' +
		'<text x="380" y="236" text-anchor="middle" class="lbl">CLOSED</text>' +
		'<defs>' +
		'<marker id="dgArrowNTW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowNTWerr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker>' +
		'<marker id="dgArrowNTWok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'tcp-teardown',
		title: 'Teardown & TIME_WAIT',
		nav: 'TCP teardown',
		category: 'TCP',

		prose: [
			'<h2>Teardown &amp; TIME_WAIT</h2>' +
			'<p>A busy proxy suddenly cannot open new outbound connections; ' +
			'<code>ss -s</code> shows <code>timewait 28460</code>. Nobody wrote a ' +
			'leak — the box is simply <em>closing connections correctly</em>, and ' +
			'paying the fee the protocol charges for it.</p>' +
			'<p>Opening a connection takes three messages; closing takes ' +
			'<strong>four</strong>, because each direction of the byte stream is shut ' +
			'down independently. A (the <em>active closer</em>) sends ' +
			'<code>FIN</code> and enters <code>FIN_WAIT_1</code>; B ACKs it and sits ' +
			'in <code>CLOSE_WAIT</code> — free to keep sending — until its ' +
			'application also calls close, producing B’s own <code>FIN</code> ' +
			'(<code>LAST_ACK</code>); A ACKs that. A FIN occupies one sequence ' +
			'number, just like a SYN, so each ACK is <code>seq+1</code>.</p>' +
			'<p>Then the famous part: A does <em>not</em> close. It parks in ' +
			'<strong><code>TIME_WAIT</code></strong> for twice the Maximum Segment ' +
			'Lifetime (2×MSL, minutes in practice), for two reasons:</p>' +
			'<ul>' +
			'<li><strong>The final ACK is never itself acknowledged.</strong> If it ' +
			'is lost, B — stuck in <code>LAST_ACK</code> — retransmits its FIN, and ' +
			'somebody must be alive to re-ACK it. A is the only somebody.</li>' +
			'<li><strong>Old duplicates must die.</strong> 2×MSL guarantees every ' +
			'stray segment of this connection has expired before a new connection ' +
			'may reuse the same 4-tuple and misinterpret one.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>The cost lands on whoever closes <em>first</em>: the active closer ' +
			'holds the socket for minutes. A server that initiates closes on every ' +
			'request accumulates thousands of <code>TIME_WAIT</code> entries and ' +
			'exhausts its ephemeral ports — which is why HTTP keep-alive, connection ' +
			'pooling, and “let the <em>client</em> close” are load-bearing ' +
			'production patterns, not style preferences.</p>' +
			'<div class="tip"><code>SO_REUSEADDR</code> is the safe knob: it lets a ' +
			'restarted listener bind its port while old <code>TIME_WAIT</code> ' +
			'entries linger. Shortening <code>TIME_WAIT</code> itself (or blanket ' +
			'<code>tcp_tw_recycle</code>-style tricks) is the risky one — it reopens ' +
			'exactly the two failure modes the wait exists to prevent.</div>' +
			'<h3>Your job</h3>' +
			'<p>The program on the right replays the four-message close correctly, ' +
			'then closes A immediately — the bug. Replace the ending: A enters ' +
			'<code>TIME_WAIT (2*MSL)</code>, survives B’s retransmitted FIN by ' +
			're-ACKing it, and only then do both sides print <code>CLOSED</code>.</p>',
		],

		task: 'Replace the premature close: print TIME_WAIT, re-ACK B\'s retransmitted FIN, and only then close both sides.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	// Sequence numbers from the classic teardown figure: A\'s FIN carries',
			'	// seq u, B\'s carries seq v. A FIN occupies one sequence number (like',
			'	// a SYN), so each side acknowledges seq+1.',
			'	const u, v = 5000, 9000',
			'',
			'	// A closes first: the ACTIVE closer.',
			'	fmt.Printf("A -> B: FIN seq=%d\\n", u)',
			'	fmt.Println("A: FIN_WAIT_1")',
			'',
			'	// B acknowledges A\'s FIN. B\'s application has not closed yet, so B',
			'	// sits in CLOSE_WAIT — the A->B half of the stream is done, but B',
			'	// may still send.',
			'	fmt.Printf("B -> A: ACK ack=%d\\n", u+1)',
			'	fmt.Println("B: CLOSE_WAIT")',
			'	fmt.Println("A: FIN_WAIT_2")',
			'',
			'	// B\'s application closes too: the second half shuts down.',
			'	fmt.Printf("B -> A: FIN seq=%d\\n", v)',
			'	fmt.Println("B: LAST_ACK")',
			'',
			'	// A acknowledges B\'s FIN — the fourth and final message.',
			'	fmt.Printf("A -> B: ACK ack=%d\\n", v+1)',
			'',
			'	// TODO: A just sent an ACK that will never itself be acknowledged —',
			'	// if it is lost, only A can ever repair the close. Instead of',
			'	// closing immediately:',
			'	//   1. print "A: TIME_WAIT (2*MSL)"',
			'	//   2. replay the scenario TIME_WAIT exists for:',
			'	//        "B: retransmits FIN (ACK was lost)"',
			'	//        "A: re-ACK ack=9001 (still in TIME_WAIT)"',
			'	//   3. only then print "A: CLOSED" and "B: CLOSED"',
			'	fmt.Println("A: CLOSED")',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('A: TIME_WAIT (2*MSL)') !== -1 &&
				flat.indexOf('A: re-ACK ack=9001 (still in TIME_WAIT)') !== -1 &&
				flat.indexOf('A: CLOSED') > flat.indexOf('re-ACK');
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	// Sequence numbers from the classic teardown figure: A\'s FIN carries',
			'	// seq u, B\'s carries seq v. A FIN occupies one sequence number (like',
			'	// a SYN), so each side acknowledges seq+1.',
			'	const u, v = 5000, 9000',
			'',
			'	// A closes first: the ACTIVE closer.',
			'	fmt.Printf("A -> B: FIN seq=%d\\n", u)',
			'	fmt.Println("A: FIN_WAIT_1")',
			'',
			'	// B acknowledges A\'s FIN. B\'s application has not closed yet, so B',
			'	// sits in CLOSE_WAIT — the A->B half of the stream is done, but B',
			'	// may still send.',
			'	fmt.Printf("B -> A: ACK ack=%d\\n", u+1)',
			'	fmt.Println("B: CLOSE_WAIT")',
			'	fmt.Println("A: FIN_WAIT_2")',
			'',
			'	// B\'s application closes too: the second half shuts down.',
			'	fmt.Printf("B -> A: FIN seq=%d\\n", v)',
			'	fmt.Println("B: LAST_ACK")',
			'',
			'	// A acknowledges B\'s FIN — the fourth and final message.',
			'	fmt.Printf("A -> B: ACK ack=%d\\n", v+1)',
			'',
			'	// The final ACK is the one message in the whole exchange that is',
			'	// never itself acknowledged: if it dies, only A would ever know the',
			'	// close finished. So A must NOT vanish. It parks for 2*MSL — long',
			'	// enough that (a) a retransmitted FIN can still be answered, and',
			'	// (b) every stray segment of this connection ages out before the',
			'	// 4-tuple can be reused by a new connection.',
			'	fmt.Println("A: TIME_WAIT (2*MSL)")',
			'',
			'	// The scenario TIME_WAIT exists for: the ACK was lost, B\'s LAST_ACK',
			'	// timer expired, and B retransmits its FIN. Because A is still',
			'	// around, the close completes; had A closed already, B would get a',
			'	// RST and its close would end in an error it did not cause.',
			'	fmt.Println("B: retransmits FIN (ACK was lost)")',
			'	fmt.Printf("A: re-ACK ack=%d (still in TIME_WAIT)\\n", v+1)',
			'',
			'	// Only after the 2*MSL clock expires does A release the port.',
			'	fmt.Println("A: CLOSED")',
			'	fmt.Println("B: CLOSED")',
			'}',
			'',
		].join('\n'),
	});
})();
