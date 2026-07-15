/* Sliding Window — TCP (Medium). Flow control as three tiny methods: the
 * sender may have at most Wnd unacknowledged bytes in flight, and a
 * cumulative ACK slides the window right. The harness fills the window to
 * the byte, acks three segments with one number, and probes the duplicate,
 * future-ack, and zero-window edges.
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// A byte ruler: the window box spans [Base, Base+Wnd); ACKs move Base
	// right, dragging the whole box — "sliding" is literal.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 185" width="520" height="185" role="img" aria-label="sequence-number ruler: acked bytes, in-flight bytes, sendable bytes inside the window, blocked bytes beyond it; ACKs slide the window right">' +
		'<text x="20" y="16" class="lbl">sequence-number space — the window [Base, Base+Wnd) slides right as ACKs arrive</text>' +
		'<path d="M 200 38 L 290 38" stroke="var(--accent)" stroke-width="1.6" fill="none" marker-end="url(#dgArrowNSW)"/>' +
		'<text x="300" y="42" class="lbl">ACK ⇒ Base = ackNo</text>' +
		'<rect x="30" y="50" width="120" height="44" fill="var(--ok)" fill-opacity="0.22" stroke="none"/>' +
		'<rect x="150" y="50" width="120" height="44" fill="var(--warn)" fill-opacity="0.25" stroke="none"/>' +
		'<rect x="270" y="50" width="100" height="44" fill="var(--accent)" fill-opacity="0.15" stroke="none"/>' +
		'<rect x="370" y="50" width="120" height="44" fill="var(--err-edge)" fill-opacity="0.15" stroke="none"/>' +
		'<rect x="150" y="44" width="220" height="56" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="90" y="76" text-anchor="middle" class="lbl">acked</text>' +
		'<text x="210" y="76" text-anchor="middle" class="lbl">in flight</text>' +
		'<text x="320" y="76" text-anchor="middle" class="lbl">can send</text>' +
		'<text x="430" y="76" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">blocked</text>' +
		'<path d="M 150 100 L 150 112" stroke="var(--edge)" stroke-width="1.5"/>' +
		'<path d="M 270 100 L 270 112" stroke="var(--edge)" stroke-width="1.5"/>' +
		'<path d="M 370 100 L 370 112" stroke="var(--edge)" stroke-width="1.5"/>' +
		'<text x="150" y="126" text-anchor="middle" class="lbl">Base</text>' +
		'<text x="270" y="126" text-anchor="middle" class="lbl">Next</text>' +
		'<text x="370" y="126" text-anchor="middle" class="lbl">Base+Wnd</text>' +
		'<text x="20" y="152" class="lbl">the invariant: in flight = Next − Base ≤ Wnd — the receiver promised buffer for exactly Wnd bytes</text>' +
		'<text x="20" y="172" class="lbl">a cumulative ACK n means "every byte before n arrived" — one number can retire many segments</text>' +
		'<defs>' +
		'<marker id="dgArrowNSW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'sliding-window',
		title: 'Flow Control: The Sliding Window',
		nav: 'Sliding window',
		difficulty: 'Medium',
		category: 'TCP',
		task: 'Implement CanSend, Send, and Ack — at most Wnd unacked bytes in flight, cumulative ACKs slide Base.',

		prose: [
			'<h2>Flow Control: The Sliding Window</h2>' +
			'<p>A bulk transfer between regions flatlines at a few MB/s no matter how ' +
			'much bandwidth you provision, and Wireshark keeps flagging ' +
			'<code>[TCP Window Full]</code>. Nothing is dropping packets. The sender ' +
			'has simply hit TCP\'s flow-control invariant: <strong>at most ' +
			'<code>Wnd</code> unacknowledged bytes may be in flight</strong>, where ' +
			'<code>Wnd</code> is the buffer the receiver promised. Fast sender, slow ' +
			'or distant receiver — the window is what keeps the first from burying ' +
			'the second.</p>' +
			'<p>The sender\'s entire bookkeeping is two positions in sequence-number ' +
			'space: <code>Base</code>, the oldest unacknowledged byte, and ' +
			'<code>Next</code>, the first unsent byte. Bytes in ' +
			'<code>[Base, Next)</code> are in flight; sending advances ' +
			'<code>Next</code>, but only while <code>Next − Base + n ≤ Wnd</code>. ' +
			'ACK numbers are <strong>cumulative</strong> — <code>ackNo</code> means ' +
			'"every byte before <code>ackNo</code> is mine" — so one ACK can retire ' +
			'several segments at once, and a valid one simply sets ' +
			'<code>Base = ackNo</code>: the window <em>slides</em> right and reopens ' +
			'by exactly the acked amount.</p>' +
			DIAGRAM +
			'<div class="tip">Two ACKs deserve suspicion: <code>ackNo ≤ Base</code> is ' +
			'old news (a duplicate or reordered ACK — it changes nothing here, though ' +
			'three of them trigger fast retransmit, next item), and ' +
			'<code>ackNo &gt; Next</code> acknowledges bytes never sent — a protocol ' +
			'violation a real stack ignores.</div>' +
			'<h3>Your job</h3>' +
			'<p>Implement the three methods on <code>*Sender</code> (constructor ' +
			'given): <code>CanSend(n)</code> — does <code>n</code> more fit in the ' +
			'window; <code>Send(n)</code> — guard with <code>CanSend</code>, advance ' +
			'<code>Next</code>, report whether it sent; and <code>Ack(ackNo)</code> — ' +
			'valid only when <code>Base &lt; ackNo ≤ Next</code>, in which case ' +
			'<code>Base = ackNo</code> and it reports true; anything else is ignored ' +
			'and reports false.</p>',
			{ code: 's := NewSender(1000)       // receiver advertised wnd=1000\ns.Send(600)    → true      // in flight 600\ns.Send(400)    → true      // in flight 1000 — window full\ns.Send(1)      → false     // blocked: would overrun the receiver\ns.Ack(900)     → true      // cumulative: everything below 900 arrived\ns.CanSend(900) → true      // window slid right by exactly 900', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Sender is the transmit side of one TCP flow, reduced to its',
			'// flow-control bookkeeping. All three fields are byte positions or',
			'// byte counts in sequence-number space:',
			'//   Base — oldest unacknowledged byte (everything before it is acked)',
			'//   Next — first unsent byte (bytes in [Base, Next) are in flight)',
			'//   Wnd  — the receiver\'s advertised window: its buffer promise',
			'type Sender struct {',
			'	Base int',
			'	Next int',
			'	Wnd  int',
			'}',
			'',
			'// NewSender starts an empty pipe: nothing sent, nothing acked, and a',
			'// receiver-advertised window of wnd bytes.',
			'func NewSender(wnd int) *Sender {',
			'	return &Sender{Base: 0, Next: 0, Wnd: wnd}',
			'}',
			'',
			'// CanSend reports whether n more bytes fit inside the window.',
			'// TODO: the invariant is Next-Base+n <= Wnd — at most Wnd',
			'// unacknowledged bytes may ever be in flight.',
			'func (s *Sender) CanSend(n int) bool {',
			'	return true // TODO: this ignores the window entirely',
			'}',
			'',
			'// Send transmits n bytes if the window allows, advancing Next.',
			'// It reports whether the segment was sent.',
			'func (s *Sender) Send(n int) bool {',
			'	// TODO: guard with CanSend — an unguarded send overruns the',
			'	// receiver\'s buffer, which is exactly what flow control forbids.',
			'	s.Next += n',
			'	return true',
			'}',
			'',
			'// Ack processes a cumulative acknowledgment: ackNo means "I have',
			'// every byte before ackNo". Valid only when Base < ackNo <= Next;',
			'// old or duplicate ACKs (ackNo <= Base) and ACKs for bytes never',
			'// sent (ackNo > Next) are ignored. It reports whether the window',
			'// slid.',
			'func (s *Sender) Ack(ackNo int) bool {',
			'	// TODO: validate, then slide: Base = ackNo.',
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
			'	results := make([]map[string]any, 0, 6)',
			'	addCase := func(name, want string, body func() string) {',
			'		r := map[string]any{"input": name, "want": want}',
			'		runCase(r, func() {',
			'			got := body()',
			'			r["pass"] = got == want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	addCase("window fills to the byte, then blocks: wnd 1000 = 600+400, 1 more refused",',
			'		"send600=true send400=true send1=false inflight=1000",',
			'		func() string {',
			'			s := NewSender(1000)',
			'			a := s.Send(600)',
			'			b := s.Send(400)',
			'			c := s.Send(1)',
			'			return fmt.Sprintf("send600=%v send400=%v send1=%v inflight=%d", a, b, c, s.Next-s.Base)',
			'		})',
			'',
			'	addCase("cumulative: one ACK 900 retires three 300-byte segments at once",',
			'		"ack900=true base=900 inflight=0",',
			'		func() string {',
			'			s := NewSender(1000)',
			'			s.Send(300)',
			'			s.Send(300)',
			'			s.Send(300)',
			'			ok := s.Ack(900)',
			'			return fmt.Sprintf("ack900=%v base=%d inflight=%d", ok, s.Base, s.Next-s.Base)',
			'		})',
			'',
			'	addCase("duplicate ACK (ackNo <= Base): ignored, Base unchanged",',
			'		"dup=false base=500",',
			'		func() string {',
			'			s := NewSender(1000)',
			'			s.Send(500)',
			'			s.Ack(500)',
			'			dup := s.Ack(500)',
			'			return fmt.Sprintf("dup=%v base=%d", dup, s.Base)',
			'		})',
			'',
			'	addCase("ACK beyond Next: acknowledges bytes never sent — rejected",',
			'		"ack500=false base=0",',
			'		func() string {',
			'			s := NewSender(1000)',
			'			s.Send(200)',
			'			ok := s.Ack(500)',
			'			return fmt.Sprintf("ack500=%v base=%d", ok, s.Base)',
			'		})',
			'',
			'	addCase("window reopens by exactly the acked amount",',
			'		"full: canSend1=false after ack400: canSend400=true canSend401=false",',
			'		func() string {',
			'			s := NewSender(1000)',
			'			s.Send(1000)',
			'			blocked := s.CanSend(1)',
			'			s.Ack(400)',
			'			return fmt.Sprintf("full: canSend1=%v after ack400: canSend400=%v canSend401=%v",',
			'				blocked, s.CanSend(400), s.CanSend(401))',
			'		})',
			'',
			'	addCase("zero window: Wnd=0 blocks everything (the persist-timer stall)",',
			'		"canSend1=false send1=false next=0",',
			'		func() string {',
			'			s := NewSender(0)',
			'			can := s.CanSend(1)',
			'			sent := s.Send(1)',
			'			return fmt.Sprintf("canSend1=%v send1=%v next=%d", can, sent, s.Next)',
			'		})',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// Sender is the transmit side of one TCP flow, reduced to its',
			'// flow-control bookkeeping. All three fields are byte positions or',
			'// byte counts in sequence-number space:',
			'//   Base — oldest unacknowledged byte (everything before it is acked)',
			'//   Next — first unsent byte (bytes in [Base, Next) are in flight)',
			'//   Wnd  — the receiver\'s advertised window: its buffer promise',
			'type Sender struct {',
			'	Base int',
			'	Next int',
			'	Wnd  int',
			'}',
			'',
			'// NewSender starts an empty pipe: nothing sent, nothing acked, and a',
			'// receiver-advertised window of wnd bytes.',
			'func NewSender(wnd int) *Sender {',
			'	return &Sender{Base: 0, Next: 0, Wnd: wnd}',
			'}',
			'',
			'// CanSend reports whether n more bytes fit inside the window. The',
			'// invariant guards UNACKED bytes, not unsent ones: every byte in',
			'// [Base, Next) still occupies receiver buffer until it is acked,',
			'// because the receiver may have to hold it for a slow application.',
			'// Wnd=0 makes this false for any n>0 — the zero-window stall.',
			'func (s *Sender) CanSend(n int) bool {',
			'	return s.Next-s.Base+n <= s.Wnd',
			'}',
			'',
			'// Send transmits n bytes if the window allows, advancing Next.',
			'// The guard is the whole point of flow control: a sender that pushes',
			'// past the window writes into buffer the receiver never promised,',
			'// and the bytes are simply dropped — then retransmitted, then',
			'// dropped again. Refusing locally is strictly cheaper.',
			'func (s *Sender) Send(n int) bool {',
			'	if !s.CanSend(n) {',
			'		return false',
			'	}',
			'	s.Next += n',
			'	return true',
			'}',
			'',
			'// Ack processes a cumulative acknowledgment. Cumulative is the',
			'// load-bearing word: ackNo asserts "every byte before ackNo',
			'// arrived", so a single ACK can retire many segments — and a LOST',
			'// ACK costs nothing, because any later ACK repeats its claim. That',
			'// is why sliding Base is one assignment, not per-segment bookkeeping.',
			'func (s *Sender) Ack(ackNo int) bool {',
			'	// ackNo <= Base: old news — a duplicate or reordered ACK. It',
			'	// moves nothing here (though a real sender counts them: three',
			'	// duplicates signal a lost segment — fast retransmit, next item).',
			'	// ackNo > Next: acknowledges bytes never sent; a protocol',
			'	// violation a real stack ignores rather than trusts.',
			'	if ackNo <= s.Base || ackNo > s.Next {',
			'		return false',
			'	}',
			'	// The slide: everything below ackNo leaves the window, so the',
			'	// send quota reopens by exactly ackNo-Base bytes.',
			'	s.Base = ackNo',
			'	return true',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>rwnd is only half the throttle</h3>' +
			'<p>What you implemented is the <strong>receive window</strong> (rwnd): ' +
			'the receiver\'s promise of buffer, carried in every TCP header, ' +
			'protecting the <em>endpoint</em>. The sender keeps a second, private ' +
			'limit — the <strong>congestion window</strong> (cwnd) — protecting the ' +
			'<em>network path</em>, and the effective window is ' +
			'<code>min(rwnd, cwnd)</code>. Same sliding mechanism, two different ' +
			'authorities; cwnd and AIMD are the next item. When a transfer is slow, ' +
			'the first diagnostic question is which of the two is pinching.</p>',
			{ code: 'inflight := s.Next - s.Base   // bytes the receiver must still hold\nif inflight+n > s.Wnd {       // would exceed the promise → wait\n\treturn false\n}\ns.Base = ackNo                // one cumulative ACK slides the window' },
			'<h3>What Wireshark is telling you</h3>' +
			'<p><code>[TCP Window Full]</code> marks a segment that made ' +
			'<code>Next − Base == Wnd</code>: the sender has consumed the entire ' +
			'promise and hit exactly the <code>CanSend == false</code> branch. ' +
			'<code>[TCP ZeroWindow]</code> is the receiver advertising ' +
			'<code>Wnd = 0</code> — its application is not draining the buffer ' +
			'(blocked on a slow disk, a GC pause, a mutex). The sender then cannot ' +
			'even be told when space returns, because the window update that ' +
			'reopens it could itself be lost — so it runs a <em>persist timer</em>, ' +
			'periodically sending one-byte probes to force fresh window ' +
			'advertisements. A transfer that stalls forever with both sides "up" is ' +
			'very often this: a receiving app that stopped reading.</p>' +
			'<h3>Why your fat pipe is slow: the bandwidth-delay product</h3>' +
			'<p>The window also caps throughput as a matter of arithmetic: the ' +
			'sender can emit at most one window per round trip, so ' +
			'<code>throughput ≤ Wnd / RTT</code>. The classic 16-bit window field ' +
			'maxes at 64&nbsp;KB — over a 100&nbsp;ms cross-continent path that is ' +
			'~640&nbsp;KB/s, about 5&nbsp;Mbit/s, on a link of any size. To keep a ' +
			'1&nbsp;Gbit/s, 100&nbsp;ms path full you need ' +
			'bandwidth&nbsp;×&nbsp;delay ≈ 12.5&nbsp;MB in flight. That is why the ' +
			'window-scaling option (a multiplier negotiated in the SYN exchange — ' +
			'handshake, again) exists, and why kernels autotune ' +
			'<code>tcp_rmem</code>/<code>tcp_wmem</code>: a receive buffer smaller ' +
			'than the bandwidth-delay product silently caps every transfer that ' +
			'crosses an ocean.</p>',
		],
		complexity: { time: 'O(1) per operation — two positions and a comparison', space: 'O(1) — the window is arithmetic, not storage' },
	});
})();
