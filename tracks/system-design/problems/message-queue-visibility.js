/* Message Queue Visibility Timeout — Messaging (Medium). SQS-style
 * at-least-once delivery: a Receive leases a message instead of removing
 * it, and an un-acked lease expires back into visibility. Deterministic
 * op-script harness: the clock is injected (nowMs), so each case replays
 * an exact timeline of sends, receives, and acks.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 170" width="560" height="170" role="img" aria-label="one message timeline: received at t=0, invisible for visibilityMs, redelivered after the timeout, finally acked and removed">' +
		'<text x="15" y="18" class="lbl">one message, at-least-once: Receive leases it — only Ack removes it</text>' +
		// timeline axis
		'<line x1="25" y1="120" x2="530" y2="120" stroke="var(--edge)" stroke-width="1.4" marker-end="url(#dgArrowMQV)"/>' +
		'<text x="536" y="124" class="lbl">t</text>' +
		// receive #1 + invisibility window
		'<circle cx="60" cy="120" r="5" fill="var(--accent)"/>' +
		'<text x="60" y="141" text-anchor="middle" class="lbl">t=0: Receive #1</text>' +
		'<text x="60" y="155" text-anchor="middle" class="lbl">deliveries=1</text>' +
		'<rect x="60" y="96" width="180" height="14" rx="3" fill="none" stroke="var(--dim)" stroke-dasharray="4 3"/>' +
		'<text x="150" y="88" text-anchor="middle" class="lbl">invisible while a consumer works</text>' +
		// timeout
		'<circle cx="240" cy="120" r="5" fill="none" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<text x="240" y="141" text-anchor="middle" class="lbl">t=vis: no Ack arrived</text>' +
		'<text x="240" y="155" text-anchor="middle" class="lbl">→ visible again</text>' +
		// receive #2
		'<circle cx="310" cy="120" r="5" fill="var(--accent)"/>' +
		'<text x="310" y="66" text-anchor="middle" class="lbl">Receive #2 — same message,</text>' +
		'<text x="310" y="80" text-anchor="middle" class="lbl">deliveries=2 (at-least-once)</text>' +
		'<rect x="310" y="96" width="140" height="14" rx="3" fill="none" stroke="var(--dim)" stroke-dasharray="4 3"/>' +
		// ack
		'<circle cx="480" cy="120" r="5" fill="var(--ok)"/>' +
		'<text x="480" y="141" text-anchor="middle" class="lbl">Ack → removed</text>' +
		'<defs><marker id="dgArrowMQV" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'message-queue-visibility',
		title: 'Message Queue Visibility Timeout',
		nav: 'Queue Visibility',
		difficulty: 'Medium',
		category: 'Messaging',
		task: 'Implement Send/Receive/Ack/Deliveries with an SQS-style visibility timeout — make all 6 tests pass.',

		prose: [
			'<h2>Message Queue Visibility Timeout</h2>' +
			'<p>A naive queue deletes a message the moment a consumer receives it — and ' +
			'loses the message forever if that consumer crashes mid-job. Queues like SQS ' +
			'instead <em>lease</em>: <code>Receive</code> hides the message for a ' +
			'<strong>visibility timeout</strong> while the consumer works. Finish in time and ' +
			'<code>Ack</code> removes it; crash (or run late) and the lease expires, making ' +
			'the message visible again for redelivery. That is <em>at-least-once</em> ' +
			'delivery — duplicates are possible, loss is not.</p>' +
			DIAGRAM +
			'<p>Implement the queue. Time is injected (<code>nowMs</code>) rather than read ' +
			'from a clock, so the tests replay exact timelines; calls arrive in ' +
			'non-decreasing time order.</p>' +
			'<ul>' +
			'<li><code>Send(body)</code> — enqueue; IDs are assigned 1, 2, 3, … and returned.</li>' +
			'<li><code>Receive(nowMs)</code> — return the <strong>lowest-id</strong> message that ' +
			'is currently visible: never received, or last received at <code>t</code> with ' +
			'<code>nowMs &gt;= t + visibilityMs</code>, and not acked. Receiving stamps ' +
			'<code>lastReceived = nowMs</code> and increments its delivery count. Return ' +
			'<code>nil</code> when nothing is visible.</li>' +
			'<li><code>Ack(id)</code> — permanently remove the message; report <code>true</code> ' +
			'if it existed and was not already acked.</li>' +
			'<li><code>Deliveries(id)</code> — how many times the message has been handed to ' +
			'a consumer (0 if never issued).</li>' +
			'</ul>',
		],

		starter: [
			'package main',
			'',
			'// Msg is the consumer-facing view of a queued message.',
			'type Msg struct {',
			'	ID   int',
			'	Body string',
			'}',
			'',
			'// Queue is an SQS-style at-least-once queue: Receive leases the',
			'// lowest-id visible message for visibilityMs; only Ack removes it.',
			'// Time is injected (nowMs), so behavior is fully deterministic.',
			'type Queue struct {',
			'	visibilityMs int64',
			'	// your fields here — hint: keep per-message state in ID order:',
			'	// body, delivery count, last-received time (or never received),',
			'	// and whether it has been acked.',
			'}',
			'',
			'func NewQueue(visibilityMs int64) *Queue {',
			'	return &Queue{visibilityMs: visibilityMs}',
			'}',
			'',
			'// Send enqueues body and returns its ID (assigned 1, 2, 3, ...).',
			'func (q *Queue) Send(body string) int {',
			'	return -1 // your code here',
			'}',
			'',
			'// Receive returns the lowest-id visible message — never received,',
			'// or last received at t with nowMs >= t+visibilityMs, and not acked',
			'// — stamping lastReceived=nowMs and counting the delivery. It',
			'// returns nil when nothing is visible.',
			'func (q *Queue) Receive(nowMs int64) *Msg {',
			'	return nil // your code here',
			'}',
			'',
			'// Ack permanently removes the message, reporting true if it existed',
			'// and was not already acked.',
			'func (q *Queue) Ack(id int) bool {',
			'	return false // your code here',
			'}',
			'',
			'// Deliveries reports how many times id has been handed to a',
			'// consumer (0 if the id was never issued).',
			'func (q *Queue) Deliveries(id int) int {',
			'	return -1 // your code here',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			SD.HARNESS_RT,
			'',
			'func main() {',
			'	// Every step appends to the trace, so a case compares the queue\'s',
			'	// entire observable behavior along one injected timeline.',
			'	type step struct {',
			'		op   string // "send" | "recv" | "ack" | "deliv"',
			'		body string',
			'		id   int',
			'		t    int64',
			'	}',
			'	type tc struct {',
			'		name   string',
			'		vis    int64',
			'		script []step',
			'		want   string',
			'	}',
			'	cases := []tc{',
			'		{"FIFO among visible: three sends, receives come back in ID order", 30000,',
			'			[]step{{"send", "a", 0, 0}, {"send", "b", 0, 0}, {"send", "c", 0, 0}, {"recv", "", 0, 0}, {"recv", "", 0, 0}, {"recv", "", 0, 0}, {"recv", "", 0, 0}},',
			'			"send(a)->1 ; send(b)->2 ; send(c)->3 ; recv@0->{1,a} ; recv@0->{2,b} ; recv@0->{3,c} ; recv@0->nil"},',
			'		{"invisible while processing: leased at t=10, hidden at t=500 (vis=1000)", 1000,',
			'			[]step{{"recv", "", 0, 0}, {"send", "a", 0, 0}, {"recv", "", 0, 10}, {"recv", "", 0, 500}, {"deliv", "", 1, 0}},',
			'			"recv@0->nil ; send(a)->1 ; recv@10->{1,a} ; recv@500->nil ; deliv(1)->1"},',
			'		{"reappears at the deadline: nowMs >= t+vis makes it visible again", 1000,',
			'			[]step{{"send", "a", 0, 0}, {"recv", "", 0, 0}, {"recv", "", 0, 999}, {"recv", "", 0, 1000}, {"deliv", "", 1, 0}},',
			'			"send(a)->1 ; recv@0->{1,a} ; recv@999->nil ; recv@1000->{1,a} ; deliv(1)->2"},',
			'		{"ack prevents redelivery; double-ack reports false", 1000,',
			'			[]step{{"send", "a", 0, 0}, {"send", "b", 0, 0}, {"recv", "", 0, 0}, {"ack", "", 1, 0}, {"recv", "", 0, 2000}, {"ack", "", 1, 0}, {"deliv", "", 2, 0}},',
			'			"send(a)->1 ; send(b)->2 ; recv@0->{1,a} ; ack(1)->true ; recv@2000->{2,b} ; ack(1)->false ; deliv(2)->1"},',
			'		{"ack-too-late race: redelivered at 1500, then the slow consumer acks", 1000,',
			'			[]step{{"send", "a", 0, 0}, {"recv", "", 0, 0}, {"recv", "", 0, 1500}, {"deliv", "", 1, 0}, {"ack", "", 1, 0}, {"recv", "", 0, 9000}},',
			'			"send(a)->1 ; recv@0->{1,a} ; recv@1500->{1,a} ; deliv(1)->2 ; ack(1)->true ; recv@9000->nil"},',
			'		{"both leases expire: redelivery is again lowest-id first", 1000,',
			'			[]step{{"send", "a", 0, 0}, {"send", "b", 0, 0}, {"recv", "", 0, 0}, {"recv", "", 0, 0}, {"recv", "", 0, 1200}, {"recv", "", 0, 1200}, {"deliv", "", 1, 0}, {"deliv", "", 2, 0}},',
			'			"send(a)->1 ; send(b)->2 ; recv@0->{1,a} ; recv@0->{2,b} ; recv@1200->{1,a} ; recv@1200->{2,b} ; deliv(1)->2 ; deliv(2)->2"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  c.want,',
			'		}',
			'		runCase(r, func() {',
			'			q := NewQueue(c.vis)',
			'			trace := []string{}',
			'			for _, s := range c.script {',
			'				switch s.op {',
			'				case "send":',
			'					trace = append(trace, fmt.Sprintf("send(%s)->%d", s.body, q.Send(s.body)))',
			'				case "recv":',
			'					m := q.Receive(s.t)',
			'					if m == nil {',
			'						trace = append(trace, fmt.Sprintf("recv@%d->nil", s.t))',
			'					} else {',
			'						trace = append(trace, fmt.Sprintf("recv@%d->{%d,%s}", s.t, m.ID, m.Body))',
			'					}',
			'				case "ack":',
			'					trace = append(trace, fmt.Sprintf("ack(%d)->%v", s.id, q.Ack(s.id)))',
			'				case "deliv":',
			'					trace = append(trace, fmt.Sprintf("deliv(%d)->%d", s.id, q.Deliveries(s.id)))',
			'				}',
			'			}',
			'			got := strings.Join(trace, " ; ")',
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
			'// Msg is the consumer-facing view of a queued message.',
			'type Msg struct {',
			'	ID   int',
			'	Body string',
			'}',
			'',
			'// message is the queue\'s internal record. It carries the lease',
			'// state the visibility rule needs: when it was last handed out and',
			'// whether it was ever handed out at all (lastRecv alone can\'t say,',
			'// because 0 is a valid timestamp).',
			'type message struct {',
			'	id         int',
			'	body       string',
			'	deliveries int',
			'	lastRecv   int64 // meaningful only once received is true',
			'	received   bool',
			'	acked      bool  // soft delete — see Ack for why',
			'}',
			'',
			'// Queue is an SQS-style at-least-once queue: Receive leases the',
			'// lowest-id visible message for visibilityMs; only Ack removes it.',
			'// Time is injected (nowMs), so behavior is fully deterministic.',
			'type Queue struct {',
			'	visibilityMs int64',
			'	nextID       int',
			'	msgs         []*message // kept in arrival (= ID) order',
			'}',
			'',
			'func NewQueue(visibilityMs int64) *Queue {',
			'	return &Queue{visibilityMs: visibilityMs, nextID: 1}',
			'}',
			'',
			'// Send enqueues body and returns its ID (assigned 1, 2, 3, ...).',
			'func (q *Queue) Send(body string) int {',
			'	m := &message{id: q.nextID, body: body}',
			'	q.nextID++',
			'	q.msgs = append(q.msgs, m)',
			'	return m.id',
			'}',
			'',
			'// Receive returns the lowest-id visible message, stamping its lease.',
			'//',
			'// Design choice: a plain scan in arrival order. Because msgs is',
			'// sorted by ID, the first visible message IS the lowest-id one, so',
			'// FIFO-among-visible falls out for free. A production queue keeps',
			'// an index by visibility deadline instead of scanning — same rule,',
			'// cheaper lookup.',
			'func (q *Queue) Receive(nowMs int64) *Msg {',
			'	for _, m := range q.msgs {',
			'		if m.acked {',
			'			continue // gone for good',
			'		}',
			'		if m.received && nowMs < m.lastRecv+q.visibilityMs {',
			'			continue // leased: a consumer is (presumably) working on it',
			'		}',
			'		// Visible: never received, or the lease expired (>= so the',
			'		// message reappears exactly at the deadline, not one ms after).',
			'		m.received = true',
			'		m.lastRecv = nowMs',
			'		m.deliveries++',
			'		// Hand back a copy, never the internal record: callers must',
			'		// not be able to mutate queue state through the handle.',
			'		return &Msg{ID: m.id, Body: m.body}',
			'	}',
			'	return nil',
			'}',
			'',
			'// Ack permanently removes the message, reporting true if it existed',
			'// and was not already acked.',
			'//',
			'// Design choice: soft delete (a flag) instead of slicing the record',
			'// out. It keeps Deliveries answerable after the fact — the queue\'s',
			'// redelivery metrics — and makes double-ack detection trivial. Note',
			'// a late ack still succeeds even if the message was redelivered in',
			'// the meantime: both consumers processed it, which is exactly the',
			'// duplicate the at-least-once contract allows.',
			'func (q *Queue) Ack(id int) bool {',
			'	for _, m := range q.msgs {',
			'		if m.id == id {',
			'			if m.acked {',
			'				return false',
			'			}',
			'			m.acked = true',
			'			return true',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
			'// Deliveries reports how many times id has been handed to a',
			'// consumer (0 if the id was never issued).',
			'func (q *Queue) Deliveries(id int) int {',
			'	for _, m := range q.msgs {',
			'		if m.id == id {',
			'			return m.deliveries',
			'		}',
			'	}',
			'	return 0',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why leases, not deletes</h3>' +
			'<p>The brute-force queue removes a message on receive. Now a consumer crash ' +
			'after receive but before finishing loses the message — silent data loss under ' +
			'exactly the failure queues exist to absorb. The fix is the ' +
			'<strong>visibility timeout</strong>: receive is a <em>lease</em>, not a removal. ' +
			'The message merely turns invisible; only an explicit ack removes it, and an ' +
			'expired lease returns it to circulation. One predicate carries the whole ' +
			'design:</p>',
			{ code: 'visible := !m.acked &&\n\t(!m.received || nowMs >= m.lastRecv+q.visibilityMs)' },
			'<h3>At-least-once is the honest contract</h3>' +
			'<p>The ack-too-late test is the interesting one: consumer A goes quiet, the ' +
			'lease expires, B receives the same message, then A’s ack finally lands. Both ' +
			'processed it. The queue cannot distinguish “A crashed” from “A is slow” ' +
			'without a reply — no distributed system can — so it must choose: redeliver ' +
			'(possible duplicates) or don’t (possible loss). Queues choose duplicates, ' +
			'which is why <em>at-least-once</em> is the honest label, and why ' +
			'“exactly-once delivery” claims always turn out to mean at-least-once delivery ' +
			'plus deduplication. The consequences for consumers:</p>' +
			'<ul>' +
			'<li><strong>Be idempotent.</strong> Processing a message twice must equal ' +
			'processing it once — upserts keyed by message ID, or a dedup table of ' +
			'recently seen IDs (SQS FIFO’s deduplication ID is this, run by the queue).</li>' +
			'<li><strong>Size the timeout to the work.</strong> A visibility timeout shorter ' +
			'than processing time guarantees duplicates even when nothing fails; too long, ' +
			'and a real crash stalls the message for the whole lease.</li>' +
			'<li><strong>Watch the delivery count.</strong> A message on its fifth delivery is ' +
			'probably poison — real queues use exactly this counter to route it to a ' +
			'dead-letter queue instead of retrying forever.</li>' +
			'</ul>' +
			'<p>SQS is this model verbatim (visibility timeout, receive count, DLQs). ' +
			'RabbitMQ redelivers unacked messages when the consumer’s channel dies; Kafka ' +
			'reaches the same at-least-once place by re-reading from the last committed ' +
			'offset. The retry-backoff and circuit-breaker problems in this track are the ' +
			'producer-side siblings of the same truth: failure handling is retry, and ' +
			'retry means duplicates.</p>',
		],
		complexity: { time: 'O(n) per Receive/Ack scan (O(log n) with a deadline index)', space: 'O(n) messages' },
	});
})();
