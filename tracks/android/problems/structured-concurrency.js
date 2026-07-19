/* Jobs: Cancellation Flows Down, Failure Flows Up — Coroutines & the Main
 * Thread (Hard). The Job-tree rules behind every "why did my whole screen
 * die" bug: cancellation propagates down to descendants and stops there;
 * an ordinary exception propagates UP, cancelling siblings at every plain
 * ancestor, until a SupervisorJob parent absorbs it. The harness pins both
 * canonical trees (plain scope: one failure kills everything; supervisor
 * scope: siblings survive), the mid-tree firewall, and the subtlety that
 * the supervisor bit protects a parent from its CHILDREN — not itself.
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// Two copies of the same three-child scope: on the left the failure of B
	// climbs to the plain parent, which fails and cancels A and C; on the
	// right the parent is a SupervisorJob and the failure stops at the
	// firewall. Marker ids namespaced (dgArrowAndSCf / dgArrowAndSCc)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 230" width="560" height="230" role="img" aria-label="failure flows up the Job tree and cancellation flows down; a SupervisorJob parent stops a child failure from spreading">' +
		'<text x="20" y="22" class="lbl">failure flows UP; cancellation flows DOWN; a SupervisorJob is a firewall</text>' +
		// ---- left: plain scope ----
		'<text x="140" y="46" text-anchor="middle" class="lbl">plain Job: B fails → everything dies</text>' +
		'<rect x="95" y="56" width="90" height="30" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="140" y="76" text-anchor="middle">scope ✗</text>' +
		// children A B C
		'<rect x="40" y="150" width="52" height="30" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="66" y="170" text-anchor="middle">A</text>' +
		'<rect x="114" y="150" width="52" height="30" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="140" y="170" text-anchor="middle">B ✗</text>' +
		'<rect x="188" y="150" width="52" height="30" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="214" y="170" text-anchor="middle">C</text>' +
		// failure up from B; cancellation down to A and C
		'<path d="M 140 150 L 140 90" fill="none" stroke="var(--warn)" stroke-width="2" marker-end="url(#dgArrowAndSCf)"/>' +
		'<text x="152" y="122" class="lbl" style="fill:var(--warn)">failure</text>' +
		'<path d="M 110 86 L 70 146" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowAndSCc)"/>' +
		'<path d="M 170 86 L 210 146" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowAndSCc)"/>' +
		'<text x="66" y="198" text-anchor="middle" class="lbl" style="fill:var(--accent)">cancelled</text>' +
		'<text x="140" y="198" text-anchor="middle" class="lbl" style="fill:var(--warn)">failed</text>' +
		'<text x="214" y="198" text-anchor="middle" class="lbl" style="fill:var(--accent)">cancelled</text>' +
		// ---- right: supervisor scope ----
		'<text x="420" y="46" text-anchor="middle" class="lbl">SupervisorJob: B fails → siblings live</text>' +
		'<rect x="360" y="56" width="120" height="30" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="420" y="76" text-anchor="middle">scope (SJ) ✓</text>' +
		// the firewall bar under the supervisor
		'<path d="M 386 106 L 454 106" stroke="var(--ok)" stroke-width="3"/>' +
		// children
		'<rect x="320" y="150" width="52" height="30" rx="6" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="346" y="170" text-anchor="middle">A</text>' +
		'<rect x="394" y="150" width="52" height="30" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="420" y="170" text-anchor="middle">B ✗</text>' +
		'<rect x="468" y="150" width="52" height="30" rx="6" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="494" y="170" text-anchor="middle">C</text>' +
		// failure up from B stopping at the bar
		'<path d="M 420 150 L 420 112" fill="none" stroke="var(--warn)" stroke-width="2" marker-end="url(#dgArrowAndSCf)"/>' +
		'<text x="346" y="198" text-anchor="middle" class="lbl" style="fill:var(--ok)">active</text>' +
		'<text x="420" y="198" text-anchor="middle" class="lbl" style="fill:var(--warn)">failed</text>' +
		'<text x="494" y="198" text-anchor="middle" class="lbl" style="fill:var(--ok)">active</text>' +
		'<text x="420" y="222" text-anchor="middle" class="lbl" style="fill:var(--ok)">childCancelled() → false: the buck stops here</text>' +
		'<defs>' +
		'<marker id="dgArrowAndSCf" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowAndSCc" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'structured-concurrency',
		title: 'Jobs: Cancellation Flows Down, Failure Flows Up',
		nav: 'job tree',
		difficulty: 'Hard',
		category: 'Coroutines & the Main Thread',
		task: 'Implement the Job tree\'s propagation rules: Cancel marks a subtree cancelled; Fail climbs ancestors cancelling siblings until a SupervisorJob parent absorbs it; State reads every job\'s outcome.',

		prose: [
			'<h2>Jobs: Cancellation Flows Down, Failure Flows Up</h2>' +
			'<p>The bug report says: “when the recommendations call 500s, the ' +
			'<em>entire</em> screen goes blank — header, feed, everything.” Nobody ' +
			'wrote code to blank the screen. The Job tree did it, following two rules ' +
			'that every Android interview asks about and most production incidents ' +
			'trace back to. First, the failing version:</p>',
			{ lang: 'kotlin', code: 'suspend fun loadDashboard() = coroutineScope {   // a PLAIN Job\n    launch { loadHeader() }          // cancelled — did nothing wrong\n    launch { loadRecs() }            // throws IOException\n    launch { loadFeed() }            // cancelled — did nothing wrong\n}   // coroutineScope rethrows the IOException to ITS caller' },
			'<p>And the version that stays alive — <code>viewModelScope</code> is ' +
			'built on a <code>SupervisorJob</code>, which is why one crashed network ' +
			'call does not take the whole screen with it:</p>',
			{ lang: 'kotlin', code: 'class DashboardViewModel : ViewModel() {\n    init {   // viewModelScope = SupervisorJob() + Dispatchers.Main.immediate\n        viewModelScope.launch { loadHeader() }   // still active\n        viewModelScope.launch { loadRecs() }     // failed (and reported)\n        viewModelScope.launch { loadFeed() }     // still active\n    }\n}' },
			'<p>Every coroutine owns a <code>Job</code>, and jobs form a tree — ' +
			'<code>launch</code> inside a scope parents the new job under the ' +
			'scope\'s job. Two different things travel that tree, in two different ' +
			'directions:</p>' +
			'<ul>' +
			'<li><strong>Cancellation flows down.</strong> Cancelling a job cancels ' +
			'its whole subtree — and <em>only</em> its subtree. Cancellation is ' +
			'cooperative and normal: a <code>CancellationException</code> never ' +
			'fails the parent, which is why cancelling one download doesn\'t kill ' +
			'the download manager.</li>' +
			'<li><strong>Failure flows up.</strong> An ordinary exception fails the ' +
			'job, cancels the job\'s own children, and reports to the parent. A ' +
			'plain parent fails in turn: it cancels all its <em>other</em> children ' +
			'(the cascade re-descends into their subtrees) and keeps climbing. A ' +
			'<strong><code>SupervisorJob</code> parent absorbs it</strong>: the ' +
			'failure stops, siblings and the supervisor stay active.</li>' +
			'</ul>' +
			DIAGRAM +
			'<div class="tip">The rules also explain the classic trap: ' +
			'<code>try/catch</code> wrapped around <code>launch { }</code> catches ' +
			'nothing. <code>launch</code> returns immediately; when the body later ' +
			'throws, the exception travels the <em>Job tree</em> — to the parent — ' +
			'not the call stack you wrapped.</div>' +
			'<h3>Your job</h3>' +
			'<p>Implement the propagation over a modeled tree. A scenario applies ' +
			'exactly one event — <code>Fail(root, name)</code> or ' +
			'<code>Cancel(root, name)</code> — after which ' +
			'<code>State(root)</code> reports every job\'s final state: ' +
			'<code>"active"</code>, <code>"cancelled"</code>, or ' +
			'<code>"failed"</code>.</p>',
		],

		starter: [
			'package main',
			'',
			'// Job is one node of the coroutine Job tree. Supervisor marks',
			'// SupervisorJob behavior: this job does NOT fail when a CHILD fails.',
			'// Children are the jobs launched in this job\'s scope.',
			'type Job struct {',
			'	Name       string',
			'	Supervisor bool',
			'	Children   []*Job',
			'}',
			'',
			'// outcome records each job\'s terminal state after the single event a',
			'// scenario applies; jobs absent from it are still "active". It lives',
			'// at package level because the pinned Job shape carries no state field',
			'// — the same separation the real JobSupport keeps between the tree',
			'// structure and its atomic state word. Fail and Cancel must RESET it',
			'// (each scenario is one event on a fresh tree).',
			'var outcome = map[string]string{}',
			'',
			'// Cancel: the named job is cancelled (CancellationException).',
			'// Cancellation flows DOWN — the job and every descendant become',
			'// "cancelled" — and stops there: parents and siblings are unaffected,',
			'// because cancellation is cooperative and normal.',
			'func Cancel(root *Job, name string) {',
			'	// your code here',
			'}',
			'',
			'// Fail: the named job fails with an ordinary exception. The job is',
			'// "failed" and its own descendants are "cancelled". Then the failure',
			'// climbs: while the parent is a PLAIN job, the parent also becomes',
			'// "failed", its other children (and their subtrees) become',
			'// "cancelled", and the climb continues. A Supervisor parent absorbs',
			'// the failure: it and the siblings stay "active" and the climb stops.',
			'func Fail(root *Job, name string) {',
			'	// your code here',
			'}',
			'',
			'// State reads the final state of every job in root\'s tree.',
			'// (Provided: it just merges the tree with outcome — the interesting',
			'// work is writing outcome correctly in Fail and Cancel.)',
			'func State(root *Job) map[string]string {',
			'	res := map[string]string{}',
			'	var walk func(j *Job)',
			'	walk = func(j *Job) {',
			'		s, ok := outcome[j.Name]',
			'		if !ok {',
			'			s = "active"',
			'		}',
			'		res[j.Name] = s',
			'		for _, c := range j.Children {',
			'			walk(c)',
			'		}',
			'	}',
			'	walk(root)',
			'	return res',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"sort"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// State returns a map; maps iterate in random order, so the harness',
			'	// prints it with SORTED keys — determinism is non-negotiable here.',
			'	fmtState := func(m map[string]string) string {',
			'		keys := make([]string, 0, len(m))',
			'		for k := range m {',
			'			keys = append(keys, k)',
			'		}',
			'		sort.Strings(keys)',
			'		parts := make([]string, 0, len(keys))',
			'		for _, k := range keys {',
			'			parts = append(parts, k+"="+m[k])',
			'		}',
			'		return strings.Join(parts, " ")',
			'	}',
			'	leaf := func(n string) *Job { return &Job{Name: n} }',
			'	job := func(n string, kids ...*Job) *Job { return &Job{Name: n, Children: kids} }',
			'	sup := func(n string, kids ...*Job) *Job { return &Job{Name: n, Supervisor: true, Children: kids} }',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"plain scope, one child fails: the failure climbs to the parent, which cancels every sibling — the whole scope dies",',
			'			"feed=failed footer=cancelled header=cancelled scope=failed",',
			'			func() string {',
			'				root := job("scope", leaf("header"), leaf("feed"), leaf("footer"))',
			'				Fail(root, "feed")',
			'				return fmtState(State(root))',
			'			}},',
			'		{"SupervisorJob parent: the SAME failure stops at the firewall — siblings and the scope stay active",',
			'			"feed=failed footer=active header=active scope=active",',
			'			func() string {',
			'				root := sup("scope", leaf("header"), leaf("feed"), leaf("footer"))',
			'				Fail(root, "feed")',
			'				return fmtState(State(root))',
			'			}},',
			'		{"cancellation is normal, not failure: cancelling a child of a PLAIN scope touches only that child\'s subtree",',
			'			"a=active b=cancelled b1=cancelled b2=cancelled c=active scope=active",',
			'			func() string {',
			'				root := job("scope", leaf("a"), job("b", leaf("b1"), leaf("b2")), leaf("c"))',
			'				Cancel(root, "b")',
			'				return fmtState(State(root))',
			'			}},',
			'		{"cancelling the root cancels every descendant — scope.cancel() on a ViewModel clearing, for example",',
			'			"root=cancelled x=cancelled x1=cancelled y=cancelled",',
			'			func() string {',
			'				root := job("root", job("x", leaf("x1")), leaf("y"))',
			'				Cancel(root, "root")',
			'				return fmtState(State(root))',
			'			}},',
			'		{"a failing job cancels its OWN children on the way — even when a supervisor saves its siblings",',
			'			"other=active scope=active w1=cancelled w2=cancelled worker=failed",',
			'			func() string {',
			'				root := sup("scope", job("worker", leaf("w1"), leaf("w2")), leaf("other"))',
			'				Fail(root, "worker")',
			'				return fmtState(State(root))',
			'			}},',
			'		{"a deep failure under plain parents kills cousins too: the cascade climbs, then re-descends into every sibling subtree",',
			'			"l1=failed l2=cancelled left=failed r1=cancelled right=cancelled root=failed",',
			'			func() string {',
			'				root := job("root", job("left", leaf("l1"), leaf("l2")), job("right", leaf("r1")))',
			'				Fail(root, "l1")',
			'				return fmtState(State(root))',
			'			}},',
			'		{"a supervisor in the MIDDLE of the tree is a firewall: the failure climbs one level and stops there",',
			'			"a=failed b=active other=active root=active superv=active",',
			'			func() string {',
			'				root := job("root", sup("superv", leaf("a"), leaf("b")), leaf("other"))',
			'				Fail(root, "a")',
			'				return fmtState(State(root))',
			'			}},',
			'		{"the supervisor bit shields a parent from its CHILDREN, not itself: a failing SupervisorJob still kills its plain parent",',
			'			"a=cancelled other=cancelled root=failed superv=failed",',
			'			func() string {',
			'				root := job("root", sup("superv", leaf("a")), leaf("other"))',
			'				Fail(root, "superv")',
			'				return fmtState(State(root))',
			'			}},',
			'		{"CancellationException never fails the parent: cancel one child of a plain scope and its sibling keeps running",',
			'			"a=cancelled b=active scope=active",',
			'			func() string {',
			'				root := job("scope", leaf("a"), leaf("b"))',
			'				Cancel(root, "a")',
			'				return fmtState(State(root))',
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
			'// Job is one node of the coroutine Job tree. Supervisor marks',
			'// SupervisorJob behavior: this job does NOT fail when a CHILD fails.',
			'// Children are the jobs launched in this job\'s scope.',
			'type Job struct {',
			'	Name       string',
			'	Supervisor bool',
			'	Children   []*Job',
			'}',
			'',
			'// outcome records each job\'s terminal state after the single event a',
			'// scenario applies; jobs absent from it are still "active". Package',
			'// level, because the pinned Job shape carries no state field — the',
			'// same separation the real JobSupport keeps between tree structure',
			'// and its atomic state word.',
			'var outcome = map[string]string{}',
			'',
			'// find locates the named job in root\'s tree (nil if absent). Depth-',
			'// first, like Job\'s own child list traversal; names are unique here.',
			'func find(root *Job, name string) *Job {',
			'	if root == nil {',
			'		return nil',
			'	}',
			'	if root.Name == name {',
			'		return root',
			'	}',
			'	for _, c := range root.Children {',
			'		f := find(c, name)',
			'		if f != nil {',
			'			return f',
			'		}',
			'	}',
			'	return nil',
			'}',
			'',
			'// parentIndex builds the child→parent map that Fail climbs. The tree',
			'// only stores downward edges (like the real Job\'s _children list), so',
			'// the upward path is computed, not stored.',
			'func parentIndex(root *Job) map[string]*Job {',
			'	idx := map[string]*Job{}',
			'	var walk func(j *Job)',
			'	walk = func(j *Job) {',
			'		for _, c := range j.Children {',
			'			idx[c.Name] = j',
			'			walk(c)',
			'		}',
			'	}',
			'	walk(root)',
			'	return idx',
			'}',
			'',
			'// markDown writes state onto j and its whole subtree — the DOWNWARD',
			'// direction both events share: cancellation is always a subtree-wide',
			'// broadcast, whatever triggered it.',
			'func markDown(j *Job, state string) {',
			'	outcome[j.Name] = state',
			'	for _, c := range j.Children {',
			'		markDown(c, state)',
			'	}',
			'}',
			'',
			'// Cancel is the easy direction: mark the subtree cancelled, touch',
			'// nothing else. CancellationException is "normal" completion as far',
			'// as the parent is concerned — that one design choice is why timeouts',
			'// and lifecycle teardowns don\'t read as crashes.',
			'func Cancel(root *Job, name string) {',
			'	outcome = map[string]string{}',
			'	j := find(root, name)',
			'	if j == nil {',
			'		return',
			'	}',
			'	markDown(j, "cancelled")',
			'}',
			'',
			'// Fail is the interesting direction. The failing job is "failed" and',
			'// its own children are collateral damage ("cancelled" — they cannot',
			'// outlive their parent: that is the structure in structured',
			'// concurrency). Then the exception reports upward, one parent at a',
			'// time, and at each parent exactly one question is asked: are you a',
			'// supervisor? The real code is JobSupport.childCancelled() — a plain',
			'// job returns true (I fail too), SupervisorJob overrides it to',
			'// return false (absorbed; siblings untouched).',
			'func Fail(root *Job, name string) {',
			'	outcome = map[string]string{}',
			'	x := find(root, name)',
			'	if x == nil {',
			'		return',
			'	}',
			'	outcome[x.Name] = "failed"',
			'	for _, c := range x.Children {',
			'		markDown(c, "cancelled")',
			'	}',
			'',
			'	parents := parentIndex(root)',
			'	child := x',
			'	for {',
			'		p := parents[child.Name]',
			'		if p == nil {',
			'			// Climbed past the root: in real code the exception',
			'			// reaches the scope\'s CoroutineExceptionHandler (or',
			'			// crashes the app). The tree itself is fully marked.',
			'			break',
			'		}',
			'		if p.Supervisor {',
			'			// The firewall: the supervisor notes the child failed',
			'			// and does nothing else — it stays active, siblings',
			'			// stay active, the climb ends. Note the asymmetry the',
			'			// last test pins: this branch runs because the CHILD',
			'			// failed; a supervisor failing ITSELF climbs like any',
			'			// other job.',
			'			break',
			'		}',
			'		// Plain parent: the failure is now ITS failure. Every other',
			'		// child is cancelled, and the cascade re-descends into their',
			'		// subtrees — cousins die without ever seeing the exception.',
			'		outcome[p.Name] = "failed"',
			'		for _, sib := range p.Children {',
			'			if sib != child {',
			'				markDown(sib, "cancelled")',
			'			}',
			'		}',
			'		child = p',
			'	}',
			'}',
			'',
			'// State merges the tree with outcome: every job appears, defaulting',
			'// to "active" — only propagation writes anything else.',
			'func State(root *Job) map[string]string {',
			'	res := map[string]string{}',
			'	var walk func(j *Job)',
			'	walk = func(j *Job) {',
			'		s, ok := outcome[j.Name]',
			'		if !ok {',
			'			s = "active"',
			'		}',
			'		res[j.Name] = s',
			'		for _, c := range j.Children {',
			'			walk(c)',
			'		}',
			'	}',
			'	walk(root)',
			'	return res',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the tree, and not the call stack</h3>' +
			'<p>Go handles goroutine failure with conventions: you pick an ' +
			'<code>errgroup</code>, wire a <code>context</code>, remember to check ' +
			'<code>ctx.Done()</code>. Kotlin bakes the convention into the runtime: ' +
			'every coroutine has a parent Job whether you think about it or not, ' +
			'and the two propagation rules you just implemented run on every ' +
			'completion. That is what “structured concurrency” means — no coroutine ' +
			'outlives its scope, and no failure disappears silently. The price is ' +
			'that the exception travels the <em>tree</em>, which produces the two ' +
			'bugs every Android team hits:</p>' +
			'<ul>' +
			'<li><strong><code>try/catch</code> around <code>launch</code> catches ' +
			'nothing.</strong> The failure goes to the parent Job, not the caller\'s ' +
			'stack frame. Catch <em>inside</em> the coroutine body, or install a ' +
			'<code>CoroutineExceptionHandler</code> on the scope.</li>' +
			'<li><strong><code>async</code> defers but does not detach.</strong> A ' +
			'failing <code>async</code> child still fails a plain parent ' +
			'immediately — even if nobody ever calls <code>await()</code>. Wrapping ' +
			'the <code>await</code> in try/catch is the same trap one level up.</li>' +
			'</ul>' +
			'<h3>The supervisor, precisely</h3>' +
			'<p>In AOSP-adjacent terms: <code>JobSupport.childCancelled(cause)</code> ' +
			'returns <code>true</code> for a plain job — “your failure is my ' +
			'failure” — and <code>SupervisorJob</code> overrides it to return ' +
			'<code>false</code>. Everything else follows: ' +
			'<code>viewModelScope</code> (<code>SupervisorJob() + ' +
			'Dispatchers.Main.immediate</code>) keeps the rest of the screen alive ' +
			'when one <code>launch</code> dies; <code>supervisorScope { }</code> ' +
			'does the same for a block; a bare <code>coroutineScope { }</code> is ' +
			'deliberately all-or-nothing, which is exactly what you want for “fetch ' +
			'three things and combine them” — if one fetch failed, the other two ' +
			'are wasted work, so the tree cancels them for you. Note also what the ' +
			'harness pins: the supervisor bit shields a parent from its ' +
			'<em>children</em>. A SupervisorJob that itself fails propagates upward ' +
			'like any other job.</p>' +
			'<h3>Reading it in production</h3>' +
			'<p>A Crashlytics report whose stack is pure ' +
			'<code>kotlinx.coroutines</code> internals with your code only under ' +
			'<code>invokeSuspend</code> usually means an unhandled failure reached ' +
			'the top of a plain tree. A screen that goes inexplicably inert — no ' +
			'crash, no logs, clicks dead — often means the opposite: something ' +
			'cancelled an ancestor (a <code>withTimeout</code>, a navigation ' +
			'teardown) and your collectors are all <code>"cancelled"</code>, ' +
			'silently, exactly as the rules dictate. When you file the fix, the ' +
			'diff is almost always one word: which Job the scope was built on.</p>',
		],
		complexity: { time: 'O(n) per event — one find, one parent index, one marking walk over the tree', space: 'O(n) for the parent index and the outcome map' },
	});
})();
