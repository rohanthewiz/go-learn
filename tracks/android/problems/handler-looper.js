/* The Main Thread — Coroutines & the Main Thread (Medium). Every Android
 * process has ONE main thread running Looper.loop() over ONE MessageQueue;
 * jank and ANRs are nothing but queue arithmetic over due times and task
 * durations. The harness pins the ordering rules (due-time order, FIFO
 * ties, postDelayed(0) never inline), the virtual-clock delay of a message
 * stuck behind long work, and the 5-second input-dispatch budget — the
 * classic "the parse doesn't ANR, the NEXT tap does".
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// The timeline every ANR trace describes: a long task occupies the only
	// thread, so a message due at 100 ms actually starts at 500 ms. Marker id
	// namespaced (dgArrowAndHL) because every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="a 500 ms task occupies the main thread; a message due at 100 ms actually starts at 500 ms — its delay was a lower bound">' +
		'<text x="20" y="24" class="lbl">one thread, one queue: a due time is a lower bound, not a schedule</text>' +
		// time axis with ticks at 0 / 100 / 500 ms (0.64 px per ms)
		'<path d="M 40 150 L 520 150" stroke="var(--muted)" stroke-width="1"/>' +
		'<path d="M 60 144 L 60 156" stroke="var(--muted)" stroke-width="1"/>' +
		'<text x="60" y="172" text-anchor="middle" class="lbl">0</text>' +
		'<path d="M 124 144 L 124 156" stroke="var(--muted)" stroke-width="1"/>' +
		'<text x="124" y="172" text-anchor="middle" class="lbl">100</text>' +
		'<path d="M 380 144 L 380 156" stroke="var(--muted)" stroke-width="1"/>' +
		'<text x="380" y="172" text-anchor="middle" class="lbl">500</text>' +
		// the long task, posted due 0, occupying 0..500
		'<rect x="60" y="60" width="320" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="220" y="83" text-anchor="middle">heavy — occupies the thread 500 ms</text>' +
		// cb\'s due time (dashed) vs its actual start
		'<path d="M 124 96 L 124 150" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<rect x="380" y="60" width="72" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="416" y="83" text-anchor="middle">cb</text>' +
		'<path d="M 128 118 C 200 132 320 132 374 120" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAndHL)"/>' +
		'<text x="252" y="140" text-anchor="middle" class="lbl" style="fill:var(--warn)">due @100, starts @500 — 400 ms of jank</text>' +
		'<text x="20" y="192" class="lbl">the queue is serial: whatever is running finishes before the next due message starts — at 5000 ms late, an input event becomes an ANR</text>' +
		'<defs><marker id="dgArrowAndHL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'handler-looper',
		title: 'The Main Thread: Looper, Handler, and the 5-Second Rule',
		nav: 'handler & looper',
		difficulty: 'Medium',
		category: 'Coroutines & the Main Thread',
		task: 'Implement the main thread as a virtual-time message queue: Post, PostDelayed, Drain (due-time order, FIFO ties, tasks occupy the thread), and the ANR predicate.',

		prose: [
			'<h2>The Main Thread: Looper, Handler, and the 5-Second Rule</h2>' +
			'<p>The Play Console has opened an ANR cluster against your latest release. ' +
			'Nothing crashed — the app just <em>froze</em>, the user kept tapping, and ' +
			'after five seconds the system offered to kill you:</p>',
			{ lang: 'txt', code: 'MyApp isn\'t responding\n  ✕ Close app        ⏱ Wait\n\nANR in com.example.feed (com.example.feed/.MainActivity)\nReason: Input dispatching timed out (Waiting to send non-key event\nbecause the touched window has not finished processing certain input\nevents that were delivered to it over 500.0ms ago.)' },
			'<p>The stack in the trace points at a JSON parse. To read that trace you ' +
			'need the machine under it: every Android process has exactly <strong>one ' +
			'main thread</strong>, and its entire life is <code>Looper.loop()</code> — ' +
			'an infinite loop pulling <code>Message</code>s off one ' +
			'<code>MessageQueue</code> and running them to completion, one at a time. ' +
			'Lifecycle callbacks, every tap, every frame of every animation, and ' +
			'everything you <code>post</code> ride the same queue:</p>',
			{ lang: 'kotlin', code: 'val main = Handler(Looper.getMainLooper())\nmain.post { render() }                     // due immediately\nmain.postDelayed({ retryUpload() }, 300)   // due in 300 ms — AT THE EARLIEST\n\n// The classic mistake: six seconds of parsing on the only thread\n// that can dispatch input\nval feed = JSONObject(sixMegabyteBody)' },
			'<p>The queue\'s rules are few and exact:</p>' +
			'<ul>' +
			'<li><strong>Ordered by due time.</strong> Each message stores ' +
			'<code>when</code> (a millisecond timestamp); the looper always runs the ' +
			'earliest-due message next. Equal due times break <strong>FIFO by post ' +
			'order</strong>.</li>' +
			'<li><strong>Posting never runs anything.</strong> <code>post</code> is ' +
			'literally <code>postDelayed(…, 0)</code>; a zero-delay message still goes ' +
			'to the back of the already-due work. Nothing ever runs inline from the ' +
			'call site.</li>' +
			'<li><strong>No preemption.</strong> A running task occupies the thread ' +
			'until it returns. A task due at <code>t=100</code> behind a 500&nbsp;ms ' +
			'task posted at <code>t=0</code> actually starts at <code>t=500</code> — ' +
			'a delay is a lower bound, never a schedule.</li>' +
			'<li><strong>The 5-second rule.</strong> When an input event waits more ' +
			'than 5000&nbsp;ms before the app <em>starts</em> dispatching it, ' +
			'<code>system_server</code> declares an ANR. Note who trips the wire: not ' +
			'the long task — the innocent event queued <em>behind</em> it.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the queue with virtual time — <code>int64</code> ' +
			'milliseconds, no clocks, no goroutines; the determinism is the point. ' +
			'<code>Drain(start)</code> replays the looper: earliest due first, FIFO ' +
			'ties, each task starting at <code>max(clock, due)</code> and occupying ' +
			'the thread for <code>Dur</code> ms, reporting ' +
			'<code>"&lt;name&gt;@&lt;actualStart&gt;"</code> per task. Then ' +
			'<code>ANR(tasks, inputAt)</code>: tasks all due at <code>t=0</code> in ' +
			'order, an input event enqueued at <code>inputAt</code> behind them — does ' +
			'its actual start exceed <code>inputAt+5000</code>?</p>',
		],

		starter: [
			'package main',
			'',
			'// Task is one unit of work posted to the main thread. Dur is how long',
			'// it occupies the thread when it finally runs (virtual milliseconds) —',
			'// the number every other message waits behind.',
			'type Task struct {',
			'	Name string',
			'	Dur  int64',
			'}',
			'',
			'// Queue models the main thread: ONE looper draining ONE message queue.',
			'// The looper always runs the earliest-due message next (FIFO on equal',
			'// due times) and runs it to completion — nothing preempts, which is',
			'// the entire reason jank and ANRs exist.',
			'type Queue struct {',
			'	// your fields here — each message needs its due time and its',
			'	// arrival order (the FIFO tie-break)',
			'}',
			'',
			'func NewQueue() *Queue {',
			'	return &Queue{}',
			'}',
			'',
			'// Post enqueues t due immediately (due = now).',
			'func (q *Queue) Post(now int64, t Task) {',
			'	// your code here',
			'}',
			'',
			'// PostDelayed enqueues t due at now+d. Posting never runs anything —',
			'// postDelayed(..., 0) still queues BEHIND the already-due work.',
			'func (q *Queue) PostDelayed(now int64, t Task, d int64) {',
			'	// your code here',
			'}',
			'',
			'// Drain replays the looper from virtual time start, after all posting',
			'// is done: repeatedly pick the earliest-due message (ties FIFO by post',
			'// order). It starts at max(clock, due) — late if the thread was busy,',
			'// exactly on time if the queue had gone idle — and occupies the thread',
			'// for Dur ms. Returns "<name>@<actualStart>" per message in run order,',
			'// and consumes the queue.',
			'func (q *Queue) Drain(start int64) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// ANR reports whether an input event misses the 5000 ms budget. tasks',
			'// are posted due t=0 in slice order; the input event is enqueued at',
			'// inputAt, FIFO behind that due work. It ANRs iff its actual start',
			'// time STRICTLY exceeds inputAt+5000 (the input\'s own duration is',
			'// irrelevant — the clock stops once dispatch begins).',
			'func ANR(tasks []Task, inputAt int64) bool {',
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
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	seq := func(lines []string) string {',
			'		if len(lines) == 0 {',
			'			return "(nothing ran)"',
			'		}',
			'		return strings.Join(lines, " ")',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"two Post()s at t=0 run FIFO, back to back — the queue is a serial executor",',
			'			"draw@0 measure@120",',
			'			func() string {',
			'				q := NewQueue()',
			'				q.Post(0, Task{Name: "draw", Dur: 120})',
			'				q.Post(0, Task{Name: "measure", Dur: 40})',
			'				return seq(q.Drain(0))',
			'			}},',
			'		{"postDelayed(..., 300) on an idle queue fires exactly at t=300 — the looper sleeps until something is due",',
			'			"retry@300",',
			'			func() string {',
			'				q := NewQueue()',
			'				q.PostDelayed(0, Task{Name: "retry", Dur: 10}, 300)',
			'				return seq(q.Drain(0))',
			'			}},',
			'		{"a 500 ms task ahead of you: work due at t=100 actually starts at t=500 — a delay is a lower bound, not a schedule",',
			'			"heavy@0 cb@500",',
			'			func() string {',
			'				q := NewQueue()',
			'				q.Post(0, Task{Name: "heavy", Dur: 500})',
			'				q.PostDelayed(0, Task{Name: "cb", Dur: 10}, 100)',
			'				return seq(q.Drain(0))',
			'			}},',
			'		{"postDelayed(..., 0) still queues behind work that is already due — it never runs inline",',
			'			"first@0 zeroDelay@80",',
			'			func() string {',
			'				q := NewQueue()',
			'				q.Post(0, Task{Name: "first", Dur: 80})',
			'				q.PostDelayed(0, Task{Name: "zeroDelay", Dur: 5}, 0)',
			'				return seq(q.Drain(0))',
			'			}},',
			'		{"due-time order beats post order: a message posted FIRST but due later waits its turn",',
			'			"immediate@0 delayed@200",',
			'			func() string {',
			'				q := NewQueue()',
			'				q.PostDelayed(0, Task{Name: "delayed", Dur: 30}, 200)',
			'				q.Post(0, Task{Name: "immediate", Dur: 10})',
			'				return seq(q.Drain(0))',
			'			}},',
			'		{"equal due times break FIFO by post order — the tie-break that keeps handlers fair",',
			'			"x@100 y@130",',
			'			func() string {',
			'				q := NewQueue()',
			'				q.PostDelayed(0, Task{Name: "x", Dur: 30}, 100)',
			'				q.PostDelayed(0, Task{Name: "y", Dur: 30}, 100)',
			'				return seq(q.Drain(0))',
			'			}},',
			'		{"Drain(start) begins the virtual clock at start: posted at t=1000 with a 500 ms delay means t=1500",',
			'			"sync@1500",',
			'			func() string {',
			'				q := NewQueue()',
			'				q.PostDelayed(1000, Task{Name: "sync", Dur: 20}, 500)',
			'				return seq(q.Drain(1000))',
			'			}},',
			'		{"the ANR arithmetic: a 6000 ms JSON parse does not ANR itself — the NEXT input event does (queued @100, served @6000)",',
			'			"true",',
			'			func() string {',
			'				return fmt.Sprintf("%v", ANR([]Task{{Name: "parse", Dur: 6000}}, 100))',
			'			}},',
			'		{"4000 ms of work and an input at t=0: served at t=4000, inside the 5000 ms budget — janky but alive",',
			'			"false",',
			'			func() string {',
			'				return fmt.Sprintf("%v", ANR([]Task{{Name: "work", Dur: 4000}}, 0))',
			'			}},',
			'		{"the boundary: an input served EXACTLY 5000 ms after enqueue is not yet an ANR — the budget must be exceeded",',
			'			"false",',
			'			func() string {',
			'				return fmt.Sprintf("%v", ANR([]Task{{Name: "work", Dur: 5000}}, 0))',
			'			}},',
			'		{"three innocent 2000 ms tasks add up: input at t=400 is served at t=6000, 5600 ms after enqueue — ANR",',
			'			"true",',
			'			func() string {',
			'				return fmt.Sprintf("%v", ANR([]Task{{Name: "a", Dur: 2000}, {Name: "b", Dur: 2000}, {Name: "c", Dur: 2000}}, 400))',
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
			'// Task is one unit of work posted to the main thread. Dur is how long',
			'// it occupies the thread when it finally runs (virtual milliseconds) —',
			'// the number every other message waits behind.',
			'type Task struct {',
			'	Name string',
			'	Dur  int64',
			'}',
			'',
			'// message pairs a task with the two facts the queue actually stores:',
			'// when it becomes runnable (due) and its arrival order (seq). The real',
			'// MessageQueue is a linked list kept sorted by `when`; seq recovers the',
			'// FIFO tie-break that sorted insertion gives the real list for free.',
			'type message struct {',
			'	due int64',
			'	seq int',
			'	t   Task',
			'}',
			'',
			'type Queue struct {',
			'	msgs    []message',
			'	nextSeq int',
			'}',
			'',
			'func NewQueue() *Queue {',
			'	return &Queue{}',
			'}',
			'',
			'// Post delegates to PostDelayed with delay 0 — mirroring the framework,',
			'// where Handler.post() IS sendMessageDelayed(msg, 0). One code path',
			'// means post can never "skip the line": it lands behind all due work.',
			'func (q *Queue) Post(now int64, t Task) {',
			'	q.PostDelayed(now, t, 0)',
			'}',
			'',
			'// PostDelayed is pure bookkeeping: compute the due time, remember the',
			'// arrival order, return. All execution happens in Drain, exactly as',
			'// Looper.loop() is the only place messages are ever dispatched.',
			'func (q *Queue) PostDelayed(now int64, t Task, d int64) {',
			'	q.msgs = append(q.msgs, message{due: now + d, seq: q.nextSeq, t: t})',
			'	q.nextSeq++',
			'}',
			'',
			'// Drain plays the looper. Because every message in this model is posted',
			'// before Drain begins, "repeatedly take the earliest-due head" is',
			'// equivalent to sorting once by (due, seq) and walking the result — the',
			'// stable tie-break on seq is what makes same-due messages FIFO.',
			'func (q *Queue) Drain(start int64) []string {',
			'	msgs := append([]message(nil), q.msgs...)',
			'	q.msgs = nil // Drain consumes the queue, like the real loop',
			'	sort.Slice(msgs, func(i, j int) bool {',
			'		if msgs[i].due != msgs[j].due {',
			'			return msgs[i].due < msgs[j].due',
			'		}',
			'		return msgs[i].seq < msgs[j].seq',
			'	})',
			'',
			'	clock := start',
			'	out := []string{}',
			'	for _, m := range msgs {',
			'		// The whole scheduling model is this max(): if the thread is',
			'		// still busy past the due time the message runs late (jank);',
			'		// if the queue went idle first, the looper "sleeps" — the',
			'		// real queue parks in epoll inside nativePollOnce — until',
			'		// the due time arrives.',
			'		actual := clock',
			'		if m.due > actual {',
			'			actual = m.due',
			'		}',
			'		out = append(out, fmt.Sprintf("%s@%d", m.t.Name, actual))',
			'		// Running to completion: the task owns the thread for Dur ms.',
			'		// No preemption is why ONE slow task delays every message',
			'		// behind it — there is no scheduler to save you from yourself.',
			'		clock = actual + m.t.Dur',
			'	}',
			'	return out',
			'}',
			'',
			'// ANR is Drain specialized to the shape system_server watches: work',
			'// all due at t=0 runs back to back (each start = the previous tasks\'',
			'// total duration, since due 0 <= clock always), so the input — due at',
			'// inputAt, behind them in FIFO — starts when the thread frees up, or',
			'// at inputAt if the queue was already idle. The 5000 ms budget is',
			'// measured from ENQUEUE to the START of dispatch, which is why the',
			'// long task itself never trips it: only the event stuck behind it.',
			'func ANR(tasks []Task, inputAt int64) bool {',
			'	busyUntil := int64(0)',
			'	for _, t := range tasks {',
			'		busyUntil += t.Dur',
			'	}',
			'	startAt := busyUntil',
			'	if inputAt > startAt {',
			'		startAt = inputAt',
			'	}',
			'	// Strictly exceeds: the dialog fires when the budget is blown,',
			'	// not merely met.',
			'	return startAt > inputAt+5000',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The machine you just built, in AOSP terms</h3>' +
			'<p><code>ActivityThread.main()</code> — the actual <code>main()</code> of ' +
			'every app process — ends with <code>Looper.loop()</code>, and that call ' +
			'never returns. Inside it, <code>MessageQueue.next()</code> blocks in ' +
			'<code>nativePollOnce</code> (epoll under the hood) until the head message ' +
			'is due — your <code>max(clock, due)</code> is that sleep. ' +
			'<code>Handler</code> is just the enqueue side; ' +
			'<code>Choreographer</code> is a special client that posts frame callbacks ' +
			'aligned to vsync, which is why a task longer than ~16.7&nbsp;ms on a ' +
			'60&nbsp;Hz display drops a frame: the frame message was due, but your ' +
			'task occupied the thread. Jank and ANR are the same phenomenon at ' +
			'different magnitudes — you just computed both with one <code>max</code>.</p>' +
			'<h3>Reading a real ANR</h3>' +
			'<p>The 5-second input budget lives in <code>system_server</code>\'s input ' +
			'dispatcher, not in your process — you cannot catch an ANR, only avoid ' +
			'it. The trace snapshots every thread; look at the one named ' +
			'<code>"main"</code>: if it is deep in your code, that is the 6000&nbsp;ms ' +
			'parse. If it is <code>Binder</code>-waiting or blocked on a lock held by ' +
			'a background thread, the queue arithmetic still holds — the head task ' +
			'simply is not finishing, so nothing behind it starts. Other budgets use ' +
			'the same mechanism with different constants: foreground broadcasts get ' +
			'~10&nbsp;s, started foreground services ~20&nbsp;s. Google Play surfaces ' +
			'all of it as your ANR rate, with a 0.47% bad-behavior threshold that ' +
			'affects your store ranking — queue arithmetic with business ' +
			'consequences.</p>' +
			'<h3>Why this is the coroutines chapter\'s first problem</h3>' +
			'<p><code>Dispatchers.Main</code> is not magic: it is a ' +
			'<code>Handler</code> posting to exactly this queue. ' +
			'<code>lifecycleScope.launch { }</code> enqueues continuations as ' +
			'messages; <code>withContext(Dispatchers.Default)</code> moves the parse ' +
			'to a worker pool and posts only the <em>result</em> back. The fix for ' +
			'the ANR cluster is one line precisely because the main thread\'s ' +
			'contract is one queue: keep every message short, and the 5-second rule ' +
			'can never find an event waiting behind you. <code>StrictMode</code> and ' +
			'Perfetto\'s main-thread track are the everyday tools for spotting the ' +
			'long messages before the Play Console does.</p>',
		],
		complexity: { time: 'O(n log n) — one sort by (due, seq); the real MessageQueue pays O(n) sorted insertion instead', space: 'O(n) for the copied message list' },
	});
})();
