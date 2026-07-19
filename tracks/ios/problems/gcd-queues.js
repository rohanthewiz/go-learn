/* GCD: Dispatch Queues & Deadlocks — Concurrency & the Main Thread (Medium).
 * Serial dispatch queues are FIFO task lists; async enqueues and returns,
 * sync enqueues AND blocks the caller until the target queue has run the
 * task. The harness pins the rules that explain every frozen iOS app:
 * sync joins the TAIL of the target queue (it never jumps the line), a
 * running task holds its queue, and sync onto any queue the current call
 * chain already holds is a deadlock — the classic DispatchQueue.main.sync
 * from main, the two-queue deadly embrace, and the hidden embrace buried
 * inside a sync drain.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// The deadlock in one picture: the task running ON the queue blocks
	// waiting for a task BEHIND it on the same queue — a wait that can only
	// end when the waiter itself finishes. Marker ids namespaced
	// (dgArrowIOSGCD*) because every track's SVGs share the page's id
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="a serial queue running task A; A calls sync onto its own queue, enqueueing B at the tail and blocking until B runs — but B cannot run until A finishes: deadlock">' +
		'<text x="20" y="24" class="lbl">serial queue: one task at a time, FIFO — sync onto the queue you occupy can never return</text>' +
		// the serial queue as a track of slots
		'<rect x="40" y="48" width="130" height="44" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="105" y="70" text-anchor="middle">A (running)</text>' +
		'<text x="105" y="86" text-anchor="middle" class="lbl">holds the queue</text>' +
		'<rect x="200" y="48" width="110" height="44" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="255" y="70" text-anchor="middle" class="lbl">queued…</text>' +
		'<rect x="340" y="48" width="130" height="44" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="405" y="70" text-anchor="middle">B (from sync)</text>' +
		'<text x="405" y="86" text-anchor="middle" class="lbl">joins the TAIL</text>' +
		// A waits on B; B waits on the queue A holds
		'<path d="M 120 96 C 170 150 340 150 396 96" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowIOSGCDw)"/>' +
		'<text x="258" y="146" text-anchor="middle" class="lbl" style="fill:var(--warn)">A blocks until B runs</text>' +
		'<path d="M 380 44 C 320 6 180 6 118 44" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowIOSGCDm)"/>' +
		'<text x="250" y="18" text-anchor="middle" class="lbl">B waits for the queue A holds</text>' +
		'<text x="20" y="182" class="lbl" style="fill:var(--warn)">each waits on the other, forever — on main the watchdog kills the app: termination reason 0x8badf00d ("ate bad food")</text>' +
		'<text x="20" y="202" class="lbl">async has no arrow back: it enqueues and RETURNS, so it can never form the loop</text>' +
		'<defs>' +
		'<marker id="dgArrowIOSGCDw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowIOSGCDm" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'gcd-queues',
		title: 'GCD: Dispatch Queues & Deadlocks',
		nav: 'gcd queues',
		difficulty: 'Medium',
		category: 'Concurrency & the Main Thread',
		task: 'Implement serial dispatch queues as a deterministic simulator: async enqueues and returns, sync enqueues at the tail and blocks, and sync onto a queue the call chain already holds is a DEADLOCK.',

		prose: [
			'<h2>GCD: Dispatch Queues &amp; Deadlocks</h2>' +
			'<p>QA files the worst kind of bug: “tap Save and the app just… stops.” ' +
			'No crash log at first — the UI is frozen solid, the spinner is not even ' +
			'spinning. Twenty seconds later iOS gives up on you and the crash ' +
			'reporter finally has something:</p>',
			{ lang: 'txt', code: 'Exception Type:  EXC_CRASH (SIGKILL)\nTermination Reason: FRONTBOARD 2343432205 <RBSTerminateContext| domain:10\ncode:0x8BADF00D explanation:scene-update watchdog transgression:\napplication<com.example.notes> exhausted real (wall clock) time allowance\nof 10.00 seconds\n\nThread 0 name:  Dispatch queue: com.apple.main-thread\nThread 0:\n0   libsystem_kernel.dylib  __ulock_wait\n1   libdispatch.dylib       _dispatch_sync_f_slow\n2   Notes                   SaveViewController.saveTapped()' },
			'<p><code>0x8badf00d</code> — “ate bad food” — is the watchdog killing a ' +
			'main thread that stopped responding. And <code>_dispatch_sync_f_slow</code> ' +
			'on thread 0 names the culprit: somebody called <code>sync</code> on the ' +
			'main queue <em>from</em> the main queue:</p>',
			{ lang: 'swift', code: '@objc func saveTapped() {            // already ON the main queue\n    let snapshot = DispatchQueue.main.sync {   // wait for main… from main\n        editor.currentText()\n    }\n    store.write(snapshot)\n}\n// For a custom serial queue libdispatch catches it and crashes instead:\n// EXC_BAD_INSTRUCTION, "BUG IN CLIENT OF LIBDISPATCH: dispatch_sync\n// called on queue already owned by current thread"' },
			'<p>Grand Central Dispatch is a small machine with exact rules. A ' +
			'<strong>serial queue</strong> (the main queue, or ' +
			'<code>DispatchQueue(label:)</code>) runs one task at a time, strictly ' +
			'FIFO. Two verbs put work on it:</p>' +
			'<ul>' +
			'<li><strong><code>async</code> enqueues and returns.</strong> The task ' +
			'runs later, after everything already queued — never inline at the call ' +
			'site, even when the queue is idle.</li>' +
			'<li><strong><code>sync</code> enqueues and waits.</strong> The caller ' +
			'blocks until the target queue has run the closure. Crucially, the ' +
			'closure joins the <em>tail</em> of the target queue — <code>sync</code> ' +
			'buys you <em>waiting</em>, not <em>priority</em>. Work already queued ' +
			'ahead of it runs first.</li>' +
			'<li><strong>The deadlock rule.</strong> While a task runs, it ' +
			'<em>holds</em> its queue. <code>sync</code> onto any queue your current ' +
			'call chain already holds can never return: the closure sits behind a ' +
			'task that is blocked waiting for it. Self-<code>sync</code> is the ' +
			'famous case, but the rule is transitive — A <code>sync</code>s to B ' +
			'while B <code>sync</code>s back to A is the same loop split across two ' +
			'queues.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the simulator — single-threaded, no goroutines, no clocks; ' +
			'the run <em>trace</em> (task labels in the order they started) is the ' +
			'output. <code>NewSystem(queues…)</code> declares serial queues; ' +
			'<code>Define(label, ops…)</code> gives a task a body of ' +
			'<code>Async</code>/<code>Sync</code> dispatches it performs while ' +
			'running; <code>Dispatch(queue, label)</code> seeds initial work; ' +
			'<code>Run()</code> executes until idle. On a deadlock, append the ' +
			'<code>"DEADLOCK"</code> marker and halt the whole simulation — the ' +
			'frozen state, as a value.</p>' +
			'<div class="tip">Model simplifications, disclosed: real GCD runs ' +
			'independent queues concurrently on a thread pool; this simulator is one ' +
			'virtual worker that drains queues in <em>declaration order</em> ' +
			'(earlier-declared first) whenever the current task chain finishes — a ' +
			'deterministic stand-in for the pool. And a real main-queue deadlock ' +
			'freezes only the main thread while background queues keep running; here ' +
			'<code>DEADLOCK</code> halts everything, which is also what the watchdog ' +
			'does to the process ten seconds later.</div>',
		],

		starter: [
			'package main',
			'',
			'// Op is one dispatch call a running task performs: async or sync,',
			'// onto a named queue, submitting a task label.',
			'type Op struct {',
			'	Kind  string // "async" | "sync"',
			'	Queue string // target queue name',
			'	Task  string // label of the submitted task',
			'}',
			'',
			'// Async and Sync are the two GCD verbs, as data.',
			'func Async(queue, task string) Op { return Op{Kind: "async", Queue: queue, Task: task} }',
			'func Sync(queue, task string) Op  { return Op{Kind: "sync", Queue: queue, Task: task} }',
			'',
			'// System is the world: a fixed set of serial queues (declaration order',
			'// matters — the scheduler drains earlier-declared queues first), task',
			'// bodies, and per-queue FIFO pending lists.',
			'type System struct {',
			'	// your fields here — you need at least: the queue names in order,',
			'	// each task\'s body, each queue\'s FIFO pending list, which queues',
			'	// the current call chain HOLDS (for deadlock detection), the trace,',
			'	// and a deadlocked flag that halts everything.',
			'}',
			'',
			'func NewSystem(queues ...string) *System {',
			'	// your code here — remember to initialize any maps',
			'	return &System{}',
			'}',
			'',
			'// Define registers the body of a task label: the dispatches it performs',
			'// while running. Undefined labels simply run with an empty body.',
			'func (s *System) Define(label string, ops ...Op) {',
			'	// your code here',
			'}',
			'',
			'// Dispatch seeds initial work: an async submission from "outside" the',
			'// system (app startup, a touch event). Nothing runs until Run.',
			'func (s *System) Dispatch(queue, label string) {',
			'	// your code here',
			'}',
			'',
			'// Run executes the world until every queue is idle, and returns the',
			'// trace: task labels in the order they STARTED running.',
			'//',
			'// The rules to implement:',
			'//   - a serial queue runs one task at a time, FIFO',
			'//   - the scheduler picks the first non-empty queue in declaration',
			'//     order, runs its head task to completion, then re-scans',
			'//   - async: append to the target\'s pending list; keep running',
			'//   - sync: if the current call chain already HOLDS the target queue,',
			'//     append "DEADLOCK" to the trace and halt the simulation (nothing',
			'//     runs after a freeze). Otherwise the closure joins the TAIL of',
			'//     the target queue, and the caller blocks while the target drains',
			'//     everything ahead of it and then the closure itself.',
			'func (s *System) Run() []string {',
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
			'		{"a serial queue is FIFO: two dispatches run in submission order, one at a time",',
			'			"layout draw",',
			'			func() string {',
			'				s := NewSystem("main")',
			'				s.Dispatch("main", "layout")',
			'				s.Dispatch("main", "draw")',
			'				return seq(s.Run())',
			'			}},',
			'		{"async never runs inline: the sync\'d log runs DURING tap, the async\'d reload only after tap finishes",',
			'			"tap log reload",',
			'			func() string {',
			'				s := NewSystem("main", "disk")',
			'				s.Define("tap", Async("main", "reload"), Sync("disk", "log"))',
			'				s.Dispatch("main", "tap")',
			'				return seq(s.Run())',
			'			}},',
			'		{"sync blocks the caller: read (on disk) completes before load\'s own later dispatches take effect",',
			'			"load read render",',
			'			func() string {',
			'				s := NewSystem("main", "disk")',
			'				s.Define("load", Sync("disk", "read"), Async("main", "render"))',
			'				s.Dispatch("main", "load")',
			'				return seq(s.Run())',
			'			}},',
			'		{"sync joins the TAIL of the target queue: req1 and req2, already queued on net, run before the sync\'d token — sync buys waiting, not priority",',
			'			"refresh req1 req2 token",',
			'			func() string {',
			'				s := NewSystem("main", "net")',
			'				s.Define("refresh", Async("net", "req1"), Async("net", "req2"), Sync("net", "token"))',
			'				s.Dispatch("main", "refresh")',
			'				return seq(s.Run())',
			'			}},',
			'		{"THE classic: DispatchQueue.main.sync from a task on main — the freeze QA filed",',
			'			"tap DEADLOCK",',
			'			func() string {',
			'				s := NewSystem("main")',
			'				s.Define("tap", Sync("main", "reload"))',
			'				s.Dispatch("main", "tap")',
			'				return seq(s.Run())',
			'			}},',
			'		{"the deadly embrace: a (holding main) syncs to bg, b (holding bg) syncs back to main — the same loop split across two queues",',
			'			"a b DEADLOCK",',
			'			func() string {',
			'				s := NewSystem("main", "bg")',
			'				s.Define("a", Sync("bg", "b"))',
			'				s.Define("b", Sync("main", "c"))',
			'				s.Dispatch("main", "a")',
			'				return seq(s.Run())',
			'			}},',
			'		{"a sync CHAIN across distinct queues is fine: main -> bg -> net holds three different queues, no loop",',
			'			"a b c",',
			'			func() string {',
			'				s := NewSystem("main", "bg", "net")',
			'				s.Define("a", Sync("bg", "b"))',
			'				s.Define("b", Sync("net", "c"))',
			'				s.Dispatch("main", "a")',
			'				return seq(s.Run())',
			'			}},',
			'		{"the rule follows the queue, not the code: an async\'d job that syncs onto the queue it is RUNNING ON deadlocks too",',
			'			"boot job DEADLOCK",',
			'			func() string {',
			'				s := NewSystem("bg")',
			'				s.Define("boot", Async("bg", "job"))',
			'				s.Define("job", Sync("bg", "flush"))',
			'				s.Dispatch("bg", "boot")',
			'				return seq(s.Run())',
			'			}},',
			'		{"the model\'s scheduler drains queues in declaration order once the current chain finishes: main\'s m before bg\'s w",',
			'			"a m w",',
			'			func() string {',
			'				s := NewSystem("main", "bg")',
			'				s.Define("a", Async("bg", "w"), Async("main", "m"))',
			'				s.Dispatch("main", "a")',
			'				return seq(s.Run())',
			'			}},',
			'		{"the hidden embrace: a\'s sync must first drain b1 ahead of it — and b1 syncs back to main, which a still holds",',
			'			"a b1 DEADLOCK",',
			'			func() string {',
			'				s := NewSystem("main", "bg")',
			'				s.Define("a", Async("bg", "b1"), Sync("bg", "s"))',
			'				s.Define("b1", Sync("main", "x"))',
			'				s.Dispatch("main", "a")',
			'				return seq(s.Run())',
			'			}},',
			'		{"a deadlock halts the simulation: upload was pending on bg and never appears — the watchdog kills the whole process anyway",',
			'			"tap DEADLOCK",',
			'			func() string {',
			'				s := NewSystem("main", "bg")',
			'				s.Define("tap", Sync("main", "reload"))',
			'				s.Dispatch("main", "tap")',
			'				s.Dispatch("bg", "upload")',
			'				return seq(s.Run())',
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
			'// Op is one dispatch call a running task performs: async or sync,',
			'// onto a named queue, submitting a task label.',
			'type Op struct {',
			'	Kind  string // "async" | "sync"',
			'	Queue string // target queue name',
			'	Task  string // label of the submitted task',
			'}',
			'',
			'// Async and Sync are the two GCD verbs, as data.',
			'func Async(queue, task string) Op { return Op{Kind: "async", Queue: queue, Task: task} }',
			'func Sync(queue, task string) Op  { return Op{Kind: "sync", Queue: queue, Task: task} }',
			'',
			'// System models the world with exactly the state the rules need.',
			'// The insight that keeps it small: "which queues does the current call',
			'// chain hold?" is just the running set — every runTask frame on the Go',
			'// call stack marks its queue held, so sync-into-held IS the deadlock',
			'// test, self-sync and transitive embraces alike.',
			'type System struct {',
			'	queues     []string            // declaration order = scheduler scan order',
			'	bodies     map[string][]Op     // task label -> the dispatches it performs',
			'	pending    map[string][]string // per-queue FIFO of task labels',
			'	running    map[string]bool     // queues held by the current call chain',
			'	trace      []string            // labels in start order (+ DEADLOCK marker)',
			'	deadlocked bool                // once true, nothing else ever runs',
			'}',
			'',
			'func NewSystem(queues ...string) *System {',
			'	return &System{',
			'		queues:  append([]string(nil), queues...),',
			'		bodies:  map[string][]Op{},',
			'		pending: map[string][]string{},',
			'		running: map[string]bool{},',
			'	}',
			'}',
			'',
			'// Define registers a task body. Maps are fine here: they are keyed',
			'// lookups only, never iterated — output order comes from the queues',
			'// slice and the FIFO lists, both deterministic.',
			'func (s *System) Define(label string, ops ...Op) {',
			'	s.bodies[label] = ops',
			'}',
			'',
			'// Dispatch is an outside-world async: enqueue, run later. Like the',
			'// real dispatch_async it does no work at the call site.',
			'func (s *System) Dispatch(queue, label string) {',
			'	s.pending[queue] = append(s.pending[queue], label)',
			'}',
			'',
			'// runTask executes one task to completion on its queue. The running',
			'// mark brackets the whole body — including time spent blocked in a',
			'// sync — because a blocked task still OWNS its serial queue; that',
			'// ownership-while-waiting is the raw material of every GCD deadlock.',
			'func (s *System) runTask(queue, label string) {',
			'	s.running[queue] = true',
			'	s.trace = append(s.trace, label)',
			'	for _, op := range s.bodies[label] {',
			'		if s.deadlocked {',
			'			break // the world is frozen; stop interpreting the body',
			'		}',
			'		if op.Kind == "async" {',
			'			// Fire and forget: enqueue at the tail, keep running.',
			'			// No arrow points back at the caller, so async can',
			'			// never close a wait cycle.',
			'			s.pending[op.Queue] = append(s.pending[op.Queue], op.Task)',
			'			continue',
			'		}',
			'		// sync. First, the deadlock test: is the target queue held',
			'		// anywhere in the current call chain? If so, our closure',
			'		// would sit behind a task that is blocked waiting for us —',
			'		// a wait cycle with no exit. Real libdispatch either freezes',
			'		// (main) or crashes with "BUG IN CLIENT OF LIBDISPATCH:',
			'		// dispatch_sync called on queue already owned by current',
			'		// thread"; the model records the marker and halts.',
			'		if s.running[op.Queue] {',
			'			s.trace = append(s.trace, "DEADLOCK")',
			'			s.deadlocked = true',
			'			break',
			'		}',
			'		// Legal sync: the closure joins the TAIL of the target — sync',
			'		// buys waiting, not priority. Blocking-until-done is modeled',
			'		// by draining the target queue here, inline: everything queued',
			'		// ahead of the closure (n-1 tasks), then the closure itself.',
			'		// Work that drained tasks async onto this same queue lands',
			'		// BEHIND position n, so counting head-pops is exact.',
			'		s.pending[op.Queue] = append(s.pending[op.Queue], op.Task)',
			'		n := len(s.pending[op.Queue])',
			'		for i := 0; i < n && !s.deadlocked; i++ {',
			'			head := s.pending[op.Queue][0]',
			'			s.pending[op.Queue] = s.pending[op.Queue][1:]',
			'			// Recursion is the call chain: our queue stays marked',
			'			// running while the target runs, so a drained task that',
			'			// syncs back to us trips the test above.',
			'			s.runTask(op.Queue, head)',
			'		}',
			'	}',
			'	s.running[queue] = false',
			'}',
			'',
			'// Run is the scheduler loop: pick the first non-empty queue in',
			'// declaration order, run its head task, re-scan from the top. The',
			'// fixed scan order is the model\'s stand-in for GCD\'s thread pool —',
			'// deterministic where the real thing is concurrent (disclosed in the',
			'// prose); "main first" mirrors the main queue\'s practical priority.',
			'func (s *System) Run() []string {',
			'	for !s.deadlocked {',
			'		progressed := false',
			'		for _, q := range s.queues {',
			'			if len(s.pending[q]) > 0 {',
			'				head := s.pending[q][0]',
			'				s.pending[q] = s.pending[q][1:]',
			'				s.runTask(q, head)',
			'				progressed = true',
			'				break // restart the scan: earlier queues first',
			'			}',
			'		}',
			'		if !progressed {',
			'			break // all queues idle: the app is quiescent',
			'		}',
			'	}',
			'	// Return a copy so callers cannot mutate the internal trace.',
			'	return append([]string(nil), s.trace...)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What you built, in libdispatch terms</h3>' +
			'<p>A serial <code>dispatch_queue_t</code> really is little more than ' +
			'your model: a FIFO of blocks plus an owner bit. ' +
			'<code>dispatch_async</code> copies the block, links it in, returns. ' +
			'<code>dispatch_sync</code> is the clever one — it usually does ' +
			'<em>not</em> hop threads: the calling thread parks on a ulock ' +
			'(<code>__ulock_wait</code>, the frame you saw in the crash log) and, ' +
			'when its turn comes, runs the block <em>itself</em> on behalf of the ' +
			'target queue. That optimization is why the deadlock is a silent freeze ' +
			'rather than an error on the main queue: the thread that must run the ' +
			'block is the thread that is waiting for it. For custom serial queues ' +
			'libdispatch keeps enough ownership bookkeeping to detect the simple ' +
			'self-sync and crashes fast with <code>EXC_BAD_INSTRUCTION</code> — but ' +
			'the <em>transitive</em> embrace (A→B→A through two queues) defeats the ' +
			'check, hangs both queues, and reproduces only under the timing of ' +
			'production. Your <code>running</code> set catches both, which is ' +
			'exactly what a static model buys over the runtime.</p>' +
			'<h3>Field notes</h3>' +
			'<ul>' +
			'<li><strong>The main.sync-from-main bug ships constantly</strong> ' +
			'because it is timing-dependent in disguise: ' +
			'<code>DispatchQueue.main.sync { }</code> called from a background ' +
			'completion handler is correct — the same line reached on the main ' +
			'thread (a cached result path, a synchronous delegate) freezes. The ' +
			'defensive idiom <code>if Thread.isMainThread { work() } else { ' +
			'DispatchQueue.main.sync(execute: work) }</code> exists precisely for ' +
			'code that cannot know its caller.</li>' +
			'<li><strong>sync is a priority trap in a second way:</strong> because ' +
			'the closure joins the tail, <code>sync</code> onto a busy queue ' +
			'inherits the latency of everything queued ahead — the pinned ' +
			'<code>refresh req1 req2 token</code> trace. Teams discover this when a ' +
			'“quick” <code>sync</code> read of a serial-queue-guarded cache starts ' +
			'taking 300&nbsp;ms because a logging task got there first.</li>' +
			'<li><strong>The watchdog numbers:</strong> ~10&nbsp;s for scene ' +
			'updates and ~20&nbsp;s for launch before ' +
			'<code>0x8badf00d</code>; the crash report\'s thread 0 backtrace is a ' +
			'snapshot of the frozen wait, so <code>_dispatch_sync_f_slow</code> ' +
			'near the top is diagnostic gold — it names the exact call that can ' +
			'never return.</li>' +
			'</ul>' +
			'<h3>Where the model simplifies</h3>' +
			'<p>Three disclosed cuts. Real GCD also has <em>concurrent</em> queues ' +
			'(<code>attributes: .concurrent</code>, plus the global pools), where ' +
			'only <code>.barrier</code> blocks serialize — this model is ' +
			'serial-only, because serial queues are where the deadlock rule lives. ' +
			'Independent queues really run in parallel on a thread pool; the ' +
			'declaration-order scan replaces that with determinism, so cross-queue ' +
			'orderings your traces pin are one legal schedule of many. And ' +
			'quality-of-service classes (<code>.userInteractive</code> … ' +
			'<code>.background</code>) bias the real scheduler and trigger priority ' +
			'inversion handling — with <code>sync</code>, libdispatch donates the ' +
			'waiter\'s priority to the target queue, machinery the model happily ' +
			'omits. The successor to all of it is Swift concurrency: actors ' +
			'(two problems from now) replace the lock-like <code>sync</code> with ' +
			'<code>await</code>, making the freeze you just simulated a compile-time ' +
			'impossibility — you cannot block an actor from inside itself, only ' +
			'suspend.</p>',
		],
		complexity: { time: 'O(n · q) — each task starts once; the scheduler re-scans the queue list between chains', space: 'O(n) for pending lists, bodies, and the trace' },
	});
})();
