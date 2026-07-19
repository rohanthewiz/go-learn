/* What suspend Compiles To — Coroutines & the Main Thread (Hard). The CPS /
 * state-machine transform: every suspend fun becomes a class with an int
 * label, a giant when(label), and the COROUTINE_SUSPENDED sentinel. The
 * harness pins the drive protocol — first Resume ignores its value (the
 * initial continuation), each later Resume binds the pending await, N awaits
 * complete in exactly N+1 Resumes, resuming a completed machine panics
 * "already completed" — and the source-order interleaving of the log.
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// The lowered suspend body as the state machine it really is: labels are
	// resumption addresses, SUSPENDED returns release the thread, Resume(v)
	// re-enters at the stored label. Marker id namespaced (dgArrowAndSSM)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="a suspend function lowered to a state machine: label 0 runs validate then parks at await user; Resume(user) enters label 1, runs render, parks at await posts; Resume(posts) enters label 2 and completes">' +
		'<text x="20" y="24" class="lbl">one suspend fun = one state machine: the label is a resumption address, not a thread</text>' +
		// label boxes
		'<rect x="30" y="52" width="150" height="58" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="105" y="74" text-anchor="middle">label 0</text>' +
		'<text x="105" y="94" text-anchor="middle" class="lbl">validate(); park at user</text>' +
		'<rect x="212" y="52" width="150" height="58" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="287" y="74" text-anchor="middle">label 1</text>' +
		'<text x="287" y="94" text-anchor="middle" class="lbl">bind user; render(); park</text>' +
		'<rect x="394" y="52" width="140" height="58" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="464" y="74" text-anchor="middle">label 2</text>' +
		'<text x="464" y="94" text-anchor="middle" class="lbl">bind posts; done() → DONE</text>' +
		// resume arrows between labels
		'<path d="M 180 81 L 206 81" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndSSM)"/>' +
		'<path d="M 362 81 L 388 81" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndSSM)"/>' +
		'<text x="193" y="46" text-anchor="middle" class="lbl">Resume(user)</text>' +
		'<text x="375" y="46" text-anchor="middle" class="lbl">Resume(posts)</text>' +
		// suspended returns dropping out of each parked label
		'<path d="M 105 110 L 105 150" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowAndSSM2)"/>' +
		'<path d="M 287 110 L 287 150" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowAndSSM2)"/>' +
		'<text x="196" y="170" text-anchor="middle" class="lbl" style="fill:var(--warn)">return COROUTINE_SUSPENDED — the thread is RELEASED, not blocked</text>' +
		'<text x="20" y="200" class="lbl">2 awaits → exactly 3 Resumes; the first Resume is the initial continuation (its value is ignored)</text>' +
		'<defs>' +
		'<marker id="dgArrowAndSSM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowAndSSM2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'suspend-state-machine',
		title: 'What suspend Compiles To',
		nav: 'suspend transform',
		difficulty: 'Hard',
		category: 'Coroutines & the Main Thread',
		task: 'Implement the compiler\'s CPS transform as a resumable state machine: Resume consumes run steps, parks at awaits, binds resumed values, and panics if driven past DONE.',

		prose: [
			'<h2>What <code>suspend</code> Compiles To</h2>' +
			'<p>You hit “Decompile to Java” in Android Studio on an innocent-looking ' +
			'<code>suspend fun</code> — maybe chasing a stack trace full of ' +
			'<code>invokeSuspend</code> — and find a class you never wrote: a ' +
			'continuation with an <code>int label</code>, a <code>switch</code> over ' +
			'it, and a sentinel called <code>COROUTINE_SUSPENDED</code>. That class ' +
			'<em>is</em> coroutines. There is no runtime scheduler magic and no green ' +
			'threads: the compiler rewrites your straight-line code into a state ' +
			'machine, and everything else is library. The source:</p>',
			{ lang: 'kotlin', code: 'suspend fun loadScreen() {\n    validate()                 // plain code — runs under label 0\n    val user = fetchUser()     // suspension point 1\n    render(user)\n    val posts = fetchPosts()   // suspension point 2\n    done(posts)\n}' },
			'<p>And (simplified) what the compiler emits — every suspension point ' +
			'becomes a case boundary, and locals that survive one become fields:</p>',
			{ lang: 'txt', code: 'Object loadScreen(Continuation cont) {          // hidden parameter!\n    StateMachine sm = asStateMachine(cont);     // label starts at 0\n    switch (sm.label) {\n    case 0:\n        validate();\n        sm.label = 1;\n        result = fetchUser(sm);                 // pass OURSELVES as callback\n        if (result == COROUTINE_SUSPENDED) return COROUTINE_SUSPENDED;\n        // fell through: fetchUser answered without suspending\n    case 1:\n        user = result;                          // the resumed value\n        render(user);\n        sm.label = 2;\n        result = fetchPosts(sm);\n        if (result == COROUTINE_SUSPENDED) return COROUTINE_SUSPENDED;\n    case 2:\n        posts = result;\n        done(posts);\n        return Unit.INSTANCE;                   // DONE\n    }\n}' },
			'<p>Read the protocol out of that lowering:</p>' +
			'<ul>' +
			'<li><strong>The hidden parameter.</strong> Every <code>suspend fun</code> ' +
			'secretly takes a <code>Continuation</code> — which is exactly why one ' +
			'can only be called from another suspend context: someone has to supply ' +
			'it. A suspend call site is a <code>when</code> label, not a blocked ' +
			'thread.</li>' +
			'<li><strong>The first resume is special.</strong> Starting the coroutine ' +
			'is “resume at label 0” — nothing is pending, so the value passed in is ' +
			'ignored. Every <em>later</em> resume delivers the pending await\'s ' +
			'result and re-enters at the stored label.</li>' +
			'<li><strong>N awaits, N+1 resumes.</strong> The machine parks once per ' +
			'suspension point and needs one final drive to completion — an invariant ' +
			'you can count.</li>' +
			'<li><strong>One shot per point.</strong> Resuming a completed ' +
			'continuation is a bug (<code>IllegalStateException: Already ' +
			'resumed</code> in Kotlin); the model panics ' +
			'<code>"already completed"</code>.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the machine for a fixed program shape: a slice of ' +
			'<code>Step</code>s alternating synchronous work (<code>Run</code>) and ' +
			'suspension points (<code>Await</code>). <code>Resume(value)</code> ' +
			'drives it: bind a pending await as ' +
			'<code>"await:&lt;name&gt;=&lt;value&gt;"</code>, execute run steps into ' +
			'the log, park at the next await returning ' +
			'<code>("SUSPENDED", false)</code>, or finish with ' +
			'<code>("DONE", true)</code>.</p>',
		],

		starter: [
			'package main',
			'',
			'// Step is one element of the lowered suspend body: Kind "run" is',
			'// straight-line code, Kind "await" is a suspension point.',
			'type Step struct {',
			'	Kind string',
			'	Name string',
			'}',
			'',
			'func Run(n string) Step { return Step{Kind: "run", Name: n} }',
			'',
			'func Await(n string) Step { return Step{Kind: "await", Name: n} }',
			'',
			'// SM is the class the Kotlin compiler writes for every suspend fun:',
			'// the steps are the code; the rest of the fields are the label, the',
			'// execution log, and the completed flag.',
			'type SM struct {',
			'	// your fields here',
			'}',
			'',
			'func NewSM(steps []Step) *SM {',
			'	return &SM{}',
			'}',
			'',
			'// Resume drives the machine one burst:',
			'//   - panics "already completed" if the machine already returned DONE',
			'//   - the FIRST Resume is the initial continuation: no await is',
			'//     pending, so value is IGNORED',
			'//   - otherwise the pending await binds value: append',
			'//     "await:<name>=<value>" to the log and move past it',
			'//   - then consume "run" steps (append each Name to the log) until',
			'//     the next await — park there and return ("SUSPENDED", false) —',
			'//     or the end of the program: return ("DONE", true).',
			'func (m *SM) Resume(value string) (string, bool) {',
			'	// your code here',
			'	return "", false',
			'}',
			'',
			'// Log returns the execution log so far (a copy is safest).',
			'func (m *SM) Log() []string {',
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
			'	show := func(state string, done bool, m *SM) string {',
			'		return fmt.Sprintf("%s done=%v log=[%s]", state, done, strings.Join(m.Log(), " "))',
			'	}',
			'	canonical := func() *SM {',
			'		return NewSM([]Step{Run("validate"), Await("user"), Run("render"), Await("posts"), Run("done")})',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"no awaits: a suspend fun that never suspends completes on the FIRST Resume — straight through, one shot",',
			'			"DONE done=true log=[validate render]",',
			'			func() string {',
			'				m := NewSM([]Step{Run("validate"), Run("render")})',
			'				st, fin := m.Resume("")',
			'				return show(st, fin, m)',
			'			}},',
			'		{"the canonical shape: the first Resume runs label 0 and parks AT the first await — validate ran, nothing else",',
			'			"SUSPENDED done=false log=[validate]",',
			'			func() string {',
			'				m := canonical()',
			'				st, fin := m.Resume("")',
			'				return show(st, fin, m)',
			'			}},',
			'		{"the second Resume binds the pending await (await:user=u42), runs render, and parks at the next point",',
			'			"SUSPENDED done=false log=[validate await:user=u42 render]",',
			'			func() string {',
			'				m := canonical()',
			'				m.Resume("")',
			'				st, fin := m.Resume("u42")',
			'				return show(st, fin, m)',
			'			}},',
			'		{"the third Resume completes: 2 awaits took exactly 3 Resumes, and the log interleaves in source order",',
			'			"DONE done=true log=[validate await:user=u42 render await:posts=p9 done]",',
			'			func() string {',
			'				m := canonical()',
			'				m.Resume("")',
			'				m.Resume("u42")',
			'				st, fin := m.Resume("p9")',
			'				return show(st, fin, m)',
			'			}},',
			'		{"the first Resume\'s value is IGNORED — it is the initial continuation; no await is pending to bind it",',
			'			"SUSPENDED done=false log=[init]",',
			'			func() string {',
			'				m := NewSM([]Step{Run("init"), Await("data")})',
			'				st, fin := m.Resume("GARBAGE-MUST-NOT-APPEAR")',
			'				return show(st, fin, m)',
			'			}},',
			'		{"an await as the very first step: the machine parks before ANY work runs — the log is empty",',
			'			"SUSPENDED done=false log=[]",',
			'			func() string {',
			'				m := NewSM([]Step{Await("token"), Run("use")})',
			'				st, fin := m.Resume("")',
			'				return show(st, fin, m)',
			'			}},',
			'		{"back-to-back awaits: each needs its own Resume, and nothing runs between them",',
			'			"DONE done=true log=[await:a=1 await:b=2 fin]",',
			'			func() string {',
			'				m := NewSM([]Step{Await("a"), Await("b"), Run("fin")})',
			'				m.Resume("")',
			'				m.Resume("1")',
			'				st, fin := m.Resume("2")',
			'				return show(st, fin, m)',
			'			}},',
			'		{"a program ENDING on an await: binding the last value is all the final Resume does before DONE",',
			'			"DONE done=true log=[send await:ack=ok]",',
			'			func() string {',
			'				m := NewSM([]Step{Run("send"), Await("ack")})',
			'				m.Resume("")',
			'				st, fin := m.Resume("ok")',
			'				return show(st, fin, m)',
			'			}},',
			'		{"every call site gets its OWN continuation: advancing one machine leaves a second untouched at label 0",',
			'			"a=[SUSPENDED done=false log=[validate await:user=x render]] b=[SUSPENDED done=false log=[validate]]",',
			'			func() string {',
			'				a := canonical()',
			'				b := canonical()',
			'				a.Resume("")',
			'				sa, fa := a.Resume("x")',
			'				sb, fb := b.Resume("")',
			'				return fmt.Sprintf("a=[%s] b=[%s]", show(sa, fa, a), show(sb, fb, b))',
			'			}},',
			'		{"the invariant the transform guarantees: 3 awaits complete in exactly 4 Resumes",',
			'			"resumes=4",',
			'			func() string {',
			'				m := NewSM([]Step{Await("a"), Run("x"), Await("b"), Await("c"), Run("y")})',
			'				resumes := 0',
			'				// The cap only guards a stuck stub; a correct machine',
			'				// exits via done long before reaching it.',
			'				for resumes < 10 {',
			'					_, fin := m.Resume(fmt.Sprintf("v%d", resumes))',
			'					resumes++',
			'					if fin {',
			'						break',
			'					}',
			'				}',
			'				return fmt.Sprintf("resumes=%d", resumes)',
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
			'// Step is one element of the lowered suspend body: Kind "run" is',
			'// straight-line code, Kind "await" is a suspension point.',
			'type Step struct {',
			'	Kind string',
			'	Name string',
			'}',
			'',
			'func Run(n string) Step { return Step{Kind: "run", Name: n} }',
			'',
			'func Await(n string) Step { return Step{Kind: "await", Name: n} }',
			'',
			'// SM mirrors the generated ContinuationImpl. The compiler\'s int label',
			'// is split into two fields here — pos (which step is next) plus',
			'// awaiting (are we parked AT that step?) — because this "program" is a',
			'// step list rather than case-fallthrough blocks; together they encode',
			'// exactly what label encodes: the resumption address.',
			'type SM struct {',
			'	steps    []Step',
			'	pos      int',
			'	awaiting bool',
			'	done     bool',
			'	log      []string',
			'}',
			'',
			'func NewSM(steps []Step) *SM {',
			'	// label = 0, nothing pending: the state a suspend fun is in the',
			'	// moment it is called, before its body has run at all.',
			'	return &SM{steps: steps}',
			'}',
			'',
			'// Resume is invokeSuspend. Each call runs ONE burst of the body:',
			'// deliver the pending result (if any), then execute synchronously',
			'// until the next suspension point or the end.',
			'func (m *SM) Resume(value string) (string, bool) {',
			'	if m.done {',
			'		// Kotlin throws IllegalStateException("Already resumed"):',
			'		// each suspension point hands out exactly one resumption.',
			'		// Double-resume bugs — a callback firing twice under',
			'		// suspendCancellableCoroutine, say — surface exactly here.',
			'		panic("already completed")',
			'	}',
			'	// awaiting distinguishes the initial continuation from a real',
			'	// resumption: on the FIRST call nothing is pending, so value is',
			'	// dropped on the floor — precisely what the generated code does',
			'	// with the argument that enters at label 0.',
			'	if m.awaiting {',
			'		m.log = append(m.log, "await:"+m.steps[m.pos].Name+"="+value)',
			'		m.pos++',
			'		m.awaiting = false',
			'	}',
			'	for m.pos < len(m.steps) {',
			'		st := m.steps[m.pos]',
			'		if st.Kind == "run" {',
			'			m.log = append(m.log, st.Name)',
			'			m.pos++',
			'			continue',
			'		}',
			'		// A suspension point: park HERE. The generated code stores',
			'		// label = next-case and returns COROUTINE_SUSPENDED up the',
			'		// entire call chain — the thread is released to the looper,',
			'		// not blocked. That single return is the whole difference',
			'		// between suspending and blocking.',
			'		m.awaiting = true',
			'		return "SUSPENDED", false',
			'	}',
			'	// Ran off the end of the body: the coroutine is complete. Mark it',
			'	// so any late Resume trips the one-shot check above.',
			'	m.done = true',
			'	return "DONE", true',
			'}',
			'',
			'// Log returns a copy — callers must not alias the machine\'s state,',
			'// the same reason the generated class keeps its fields to itself.',
			'func (m *SM) Log() []string {',
			'	return append([]string(nil), m.log...)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the transform is shaped like this</h3>' +
			'<p>The compiler cannot pause a JVM thread mid-function and keep the ' +
			'stack — so it does the only thing that works on an unmodified runtime: ' +
			'it makes the stack a heap object. Locals that survive a suspension ' +
			'point become fields on the continuation class; the program counter ' +
			'becomes the <code>label</code>; “pause” becomes <code>return ' +
			'COROUTINE_SUSPENDED</code>. This is classic continuation-passing style, ' +
			'and it explains the facts you use daily:</p>' +
			'<ul>' +
			'<li><strong>Why <code>suspend</code> is viral.</strong> The hidden ' +
			'<code>Continuation</code> parameter must come from somewhere, so only ' +
			'suspend contexts (or a coroutine builder like <code>launch</code>, ' +
			'which manufactures the root continuation) can call a suspend fun. Go ' +
			'sidesteps this by giving every function a growable stack; Kotlin pays ' +
			'the transform instead and runs on stock ART.</li>' +
			'<li><strong>Why suspension is cheap.</strong> Parking is one field ' +
			'write and a return — no thread, no syscall. A phone happily holds tens ' +
			'of thousands of parked coroutines; it cannot hold tens of thousands of ' +
			'threads.</li>' +
			'<li><strong>Why stack traces look weird.</strong> Between bursts there ' +
			'is no stack — just objects. Hence the <code>invokeSuspend</code> frames ' +
			'in every crash report, and the coroutine debugger reconstructing ' +
			'“async stack traces” by walking the continuation chain instead of the ' +
			'thread.</li>' +
			'<li><strong>The fast path.</strong> The generated <code>if (result == ' +
			'COROUTINE_SUSPENDED) return</code> falls <em>through</em> when the ' +
			'callee answered immediately (cache hit, already-completed Deferred): ' +
			'no suspension happens at all. Your <code>Resume</code> models the same ' +
			'thing when consecutive run steps execute in a single burst.</li>' +
			'</ul>' +
			'<h3>Where you meet it in real work</h3>' +
			'<p>On Android the resumed bursts are messages on the main thread\'s ' +
			'queue (previous problem): <code>Dispatchers.Main</code> posts ' +
			'<code>resumeWith</code> as a <code>Handler</code> message, so one ' +
			'suspend fun runs as several short main-thread tasks instead of one long ' +
			'one — that is the ANR fix, mechanically. In code review, the transform ' +
			'is why a local holding a large object <em>across</em> an await keeps it ' +
			'alive on the heap (it became a field), and why Room and Retrofit can ' +
			'offer suspend APIs at all: they complete a stored continuation from ' +
			'their own threads and the machine re-enters at the right label. And ' +
			'the interview one-liner you can now defend from first principles: ' +
			'<em>a suspend call site compiles to a <code>when</code> label, not a ' +
			'blocked thread</em>.</p>',
		],
		complexity: { time: 'O(n) across all Resumes — each step executes exactly once', space: 'O(n) for the log; the machine itself is O(1): a cursor, a flag, a label' },
	});
})();
