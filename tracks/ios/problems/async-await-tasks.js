/* async/await & Structured Concurrency — Concurrency & the Main Thread
 * (Hard). Swift Tasks form a tree: children attach to their parent (task
 * groups, async let), Task.detached does not. Cancellation propagates DOWN
 * the tree but is COOPERATIVE — isCancelled flips and the task keeps
 * running until it checks; a throwing group child cancels its siblings and
 * the group's await rethrows the FIRST error; a detached task is outside
 * all of it. The harness pins the round-robin interleaving, the
 * work-until-first-check rule, the sibling cascade in declaration order,
 * the detached firewall in both directions, and first-error-wins.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// The task tree with its two propagation arrows: cancel flows down into
	// attached children; a child's error flows up to the group, which
	// cancels the siblings — and the detached task stands outside both.
	// Marker ids namespaced (dgArrowIOSAAT*) because every track's SVGs
	// share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 230" width="560" height="230" role="img" aria-label="a task group with three children: the middle child throws, the error flows up to the group, cancellation flows back down to the siblings; a detached task beside the tree is untouched">' +
		'<text x="20" y="24" class="lbl">the Task tree: errors flow UP to the group, cancellation flows DOWN to attached children</text>' +
		'<rect x="150" y="40" width="170" height="34" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="235" y="62" text-anchor="middle">withThrowingTaskGroup ✗</text>' +
		// children
		'<rect x="60" y="140" width="90" height="32" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="105" y="161" text-anchor="middle">header</text>' +
		'<rect x="190" y="140" width="90" height="32" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="235" y="161" text-anchor="middle">recs ✗</text>' +
		'<rect x="320" y="140" width="90" height="32" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="365" y="161" text-anchor="middle">feed</text>' +
		// error up, cancellation down
		'<path d="M 235 140 L 235 80" fill="none" stroke="var(--warn)" stroke-width="2" marker-end="url(#dgArrowIOSAATf)"/>' +
		'<text x="248" y="112" class="lbl" style="fill:var(--warn)">throws</text>' +
		'<path d="M 190 76 L 115 136" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowIOSAATc)"/>' +
		'<path d="M 290 76 L 358 136" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowIOSAATc)"/>' +
		'<text x="105" y="192" text-anchor="middle" class="lbl" style="fill:var(--accent)">isCancelled = true</text>' +
		'<text x="365" y="192" text-anchor="middle" class="lbl" style="fill:var(--accent)">…keeps running until it CHECKS</text>' +
		// detached, outside
		'<rect x="450" y="40" width="96" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="498" y="62" text-anchor="middle">detached</text>' +
		'<text x="498" y="92" text-anchor="middle" class="lbl" style="fill:var(--ok)">no parent edge:</text>' +
		'<text x="498" y="108" text-anchor="middle" class="lbl" style="fill:var(--ok)">nothing reaches it</text>' +
		'<text x="20" y="222" class="lbl">group.waitForAll() rethrows the FIRST error; later sibling errors are discarded</text>' +
		'<defs>' +
		'<marker id="dgArrowIOSAATf" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowIOSAATc" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'async-await-tasks',
		title: 'async/await: The Task Tree & Cooperative Cancellation',
		nav: 'async await tasks',
		difficulty: 'Hard',
		category: 'Concurrency & the Main Thread',
		task: 'Implement the Swift Task tree: Cancel flags a subtree cooperatively (work runs until the first checkCancellation), a throwing group child cancels its attached siblings, detached tasks are firewalled both ways, and Run reports the first error.',

		prose: [
			'<h2>async/await: The Task Tree &amp; Cooperative Cancellation</h2>' +
			'<p>Code review, and a teammate is staring at your cancellation fix in ' +
			'disbelief: “I called <code>cancel()</code> — why is the download ' +
			'<em>still going</em>?” The Xcode console backs them up:</p>',
			{ lang: 'txt', code: 'cancel() called at 14:02:07.113\ndownload: received 4.1 MB   14:02:07.891   ← after cancel!\ndownload: received 7.9 MB   14:02:08.406   ← still after cancel!\ndownload: threw CancellationError()  14:02:08.412\ntask state: cancelled' },
			'<p>Nothing is broken. <code>Task.cancel()</code> in Swift never stops ' +
			'anything — it flips a flag. The task keeps running until <em>it</em> ' +
			'decides to notice, at a <code>try Task.checkCancellation()</code> or a ' +
			'cancellation-aware suspension point:</p>',
			{ lang: 'swift', code: 'let job = Task {                       // attached to the current task\n    let data = try await fetch()       // runs even if cancelled…\n    try Task.checkCancellation()       // …until THIS throws CancellationError\n    return try decode(data)            // never reached after a cancel\n}\njob.cancel()   // sets isCancelled on job AND its attached descendants' },
			'<p>The second rule shows up as the “one bad call blanks the dashboard” ' +
			'incident. Children created in a task group (or via <code>async let</code>) ' +
			'<strong>attach</strong> to the tree; when one throws, the group cancels ' +
			'the others and its <code>await</code> rethrows the <em>first</em> error. ' +
			'A <code>Task.detached</code> has no parent edge — nothing propagates in ' +
			'or out:</p>',
			{ lang: 'swift', code: 'try await withThrowingTaskGroup(of: Void.self) { group in\n    group.addTask { try await loadHeader() }   // cancelled (cooperatively)\n    group.addTask { try await loadRecs() }     // throws URLError(.timedOut)\n    group.addTask { try await loadFeed() }     // isCancelled flips true\n    try await group.waitForAll()               // rethrows the FIRST error\n}\nTask.detached { await analytics.flush() }      // outside the tree: untouched' },
			'<p>The rules, exactly:</p>' +
			'<ul>' +
			'<li><strong>Cancellation flows down, to attached children only.</strong> ' +
			'Cancelling a task flips <code>isCancelled</code> on it and every ' +
			'descendant — skipping any <code>detached</code> subtree.</li>' +
			'<li><strong>Cancellation is cooperative.</strong> A flagged task runs ' +
			'every work step up to its first <code>check</code>, which throws ' +
			'<code>CancellationError</code> and ends it as <code>cancelled</code>. A ' +
			'task with <em>no</em> check runs to completion and ends ' +
			'<code>done</code> — cancelled in name only.</li>' +
			'<li><strong>A throwing child cancels its siblings.</strong> The child ' +
			'ends <code>failed</code>, the group is marked failed, every attached ' +
			'sibling (and their attached descendants) gets the flag — cooperatively, ' +
			'in declaration order. The group\'s await rethrows the ' +
			'<strong>first</strong> error; later errors are discarded.</li>' +
			'<li><strong>Detached is a firewall in both directions.</strong> It ' +
			'ignores its creator\'s cancellation, and its own error cancels nobody — ' +
			'unawaited, the error simply vanishes.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the tree over the <code>Task</code> record in the starter. ' +
			'Tasks run on a deterministic round-robin scheduler — one step per task ' +
			'per round, tasks visited in tree (DFS, declaration) order; a step is a ' +
			'work label (traced <code>"name.label"</code>), <code>"check"</code> ' +
			'(silent if not cancelled; traced <code>"name.cancelled"</code> and ' +
			'terminal if flagged), or <code>"throw:Msg"</code> (traced ' +
			'<code>"name.threw(Msg)"</code>). <code>Cancel</code> runs before the ' +
			'scheduler starts — cancel-before-first-check, the strictest version of ' +
			'the cooperative rule.</p>' +
			'<div class="tip">Disclosed simplifications: real Swift never promises ' +
			'this interleaving — suspension points, executors, and priorities ' +
			'decide; round-robin in declaration order is the deterministic stand-in. ' +
			'And the real group marks itself failed only when ' +
			'<code>waitForAll()</code> rethrows; this model marks the parent at the ' +
			'moment of the throw. The propagation <em>rules</em> — down, ' +
			'cooperative, first error, detached firewall — are the real ones.</div>',
		],

		starter: [
			'package main',
			'',
			'import "strings"',
			'',
			'// Task is one node of the Swift task tree. Detached marks',
			'// Task.detached: created here lexically, but with NO parent edge —',
			'// excluded from cancellation propagation and from group error',
			'// handling, in both directions.',
			'//',
			'// Steps is the task\'s body, one entry per scheduler tick:',
			'//   "check"     -> try Task.checkCancellation(): silent if not',
			'//                  cancelled; if flagged, traces "name.cancelled"',
			'//                  and the task ends with state "cancelled"',
			'//   "throw:Msg" -> throws an ordinary error: traces',
			'//                  "name.threw(Msg)", state "failed", group reacts',
			'//   anything else -> plain work: traces "name.<step>"',
			'type Task struct {',
			'	Name     string',
			'	Detached bool',
			'	Steps    []string',
			'	Children []*Task',
			'',
			'	// Runtime state, written by Cancel and Run:',
			'	cancelled bool   // isCancelled — a FLAG, never a stop',
			'	state     string // "" while running; "done" | "cancelled" | "failed"',
			'	pc        int    // index of the next step to execute',
			'}',
			'',
			'// find locates the named task in root\'s tree (nil if absent).',
			'// (Provided: plain DFS; names are unique in every scenario.)',
			'func find(root *Task, name string) *Task {',
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
			'// Cancel flips isCancelled on the named task and every ATTACHED',
			'// descendant — the flag stops at any Detached child, which is the',
			'// whole point of Task.detached. It never changes state: whether the',
			'// flag matters is decided later, at each task\'s own "check".',
			'func Cancel(root *Task, name string) {',
			'	// your code here',
			'	_ = strings.TrimSpace // keeps the import used while stubbed',
			'}',
			'',
			'// Run executes the tree to quiescence and reports (trace, firstErr).',
			'//',
			'// Scheduler: collect every task in DFS declaration order (root first,',
			'// then each child\'s subtree in order). Repeat rounds: each unfinished',
			'// task executes ONE step per round; a task whose steps are exhausted',
			'// (or that has none) settles "done". Stop when every task settled.',
			'//',
			'// On "throw:Msg" from an ATTACHED task: record the FIRST error only,',
			'// mark the parent "failed", and flag (cooperatively cancel) every',
			'// attached sibling and their attached descendants. A Detached',
			'// thrower keeps its own "failed" state but triggers none of that.',
			'func Run(root *Task) ([]string, string) {',
			'	// your code here',
			'	return nil, ""',
			'}',
			'',
			'// States reads every task\'s final state after Run. (Provided.)',
			'func States(root *Task) map[string]string {',
			'	res := map[string]string{}',
			'	var walk func(t *Task)',
			'	walk = func(t *Task) {',
			'		res[t.Name] = t.state',
			'		for _, c := range t.Children {',
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
			'	// report runs a scenario end to end and renders every observable:',
			'	// the interleaved trace, the group\'s rethrown error, and the final',
			'	// state of every task (sorted keys — maps iterate randomly).',
			'	report := func(root *Task, precancel string) string {',
			'		if precancel != "" {',
			'			Cancel(root, precancel)',
			'		}',
			'		tr, err := Run(root)',
			'		trs := "(no steps ran)"',
			'		if len(tr) > 0 {',
			'			trs = strings.Join(tr, " ")',
			'		}',
			'		if err == "" {',
			'			err = "none"',
			'		}',
			'		m := States(root)',
			'		keys := make([]string, 0, len(m))',
			'		for k := range m {',
			'			keys = append(keys, k)',
			'		}',
			'		sort.Strings(keys)',
			'		parts := make([]string, 0, len(keys))',
			'		for _, k := range keys {',
			'			parts = append(parts, k+"="+m[k])',
			'		}',
			'		return trs + " | err=" + err + " | " + strings.Join(parts, " ")',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"two group children run concurrently: the round-robin scheduler interleaves one step each per round, in declaration order",',
			'			"a.w1 b.w1 a.w2 b.w2 | err=none | a=done b=done group=done",',
			'			func() string {',
			'				return report(&Task{Name: "group", Children: []*Task{',
			'					{Name: "a", Steps: []string{"w1", "w2"}},',
			'					{Name: "b", Steps: []string{"w1", "w2"}},',
			'				}}, "")',
			'			}},',
			'		{"cancel before the task even starts: the fetch STILL runs — work proceeds until the first checkCancellation throws",',
			'			"load.fetch load.cancelled | err=none | load=cancelled root=done",',
			'			func() string {',
			'				return report(&Task{Name: "root", Children: []*Task{',
			'					{Name: "load", Steps: []string{"fetch", "check", "decode"}},',
			'				}}, "load")',
			'			}},',
			'		{"a cancelled task with NO check runs to completion and ends done — isCancelled is a flag, never a stop",',
			'			"load.fetch load.decode | err=none | load=done root=done",',
			'			func() string {',
			'				return report(&Task{Name: "root", Children: []*Task{',
			'					{Name: "load", Steps: []string{"fetch", "decode"}},',
			'				}}, "load")',
			'			}},',
			'		{"Cancel flags the SUBTREE: a and its child a1 get the flag and stop at their checks; sibling b is untouched",',
			'			"a.cancelled a1.w1 b.w1 a1.cancelled | err=none | a=cancelled a1=cancelled b=done root=done",',
			'			func() string {',
			'				return report(&Task{Name: "root", Children: []*Task{',
			'					{Name: "a", Steps: []string{"check"}, Children: []*Task{',
			'						{Name: "a1", Steps: []string{"w1", "check"}},',
			'					}},',
			'					{Name: "b", Steps: []string{"w1"}},',
			'				}}, "a")',
			'			}},',
			'		{"the detached firewall, inbound: cancelling the root flags a but NOT the detached d — d\'s check passes and it finishes",',
			'			"a.w1 d.w1 a.cancelled d.w2 | err=none | a=cancelled d=done root=done",',
			'			func() string {',
			'				return report(&Task{Name: "root", Children: []*Task{',
			'					{Name: "a", Steps: []string{"w1", "check", "w2"}},',
			'					{Name: "d", Detached: true, Steps: []string{"w1", "check", "w2"}},',
			'				}}, "root")',
			'			}},',
			'		{"a throwing group child cancels its siblings — but COOPERATIVELY: b dies at its check, c has none and finishes anyway",',
			'			"a.req b.w1 c.w1 a.threw(Timeout) b.cancelled c.w2 | err=Timeout | a=failed b=cancelled c=done group=failed",',
			'			func() string {',
			'				return report(&Task{Name: "group", Children: []*Task{',
			'					{Name: "a", Steps: []string{"req", "throw:Timeout"}},',
			'					{Name: "b", Steps: []string{"w1", "check", "w2"}},',
			'					{Name: "c", Steps: []string{"w1", "w2"}},',
			'				}}, "")',
			'			}},',
			'		{"sibling cancellation reaches the sibling\'s DESCENDANTS: b1, a grandchild of the group, is flagged and dies at its check",',
			'			"a.threw(Boom) b1.w1 b1.cancelled | err=Boom | a=failed b=done b1=cancelled group=failed",',
			'			func() string {',
			'				return report(&Task{Name: "group", Children: []*Task{',
			'					{Name: "a", Steps: []string{"throw:Boom"}},',
			'					{Name: "b", Children: []*Task{',
			'						{Name: "b1", Steps: []string{"w1", "check", "w2"}},',
			'					}},',
			'				}}, "")',
			'			}},',
			'		{"the detached firewall, outbound: a detached task\'s error cancels nobody and is never rethrown — unawaited, it vanishes",',
			'			"d.threw(Lost) b.w1 b.w2 | err=none | b=done d=failed group=done",',
			'			func() string {',
			'				return report(&Task{Name: "group", Children: []*Task{',
			'					{Name: "d", Detached: true, Steps: []string{"throw:Lost"}},',
			'					{Name: "b", Steps: []string{"w1", "check", "w2"}},',
			'				}}, "")',
			'			}},',
			'		{"first error wins: b, already flagged by a\'s Boom, throws Crash before ever checking — the group still rethrows Boom",',
			'			"a.threw(Boom) b.w1 b.threw(Crash) | err=Boom | a=failed b=failed group=failed",',
			'			func() string {',
			'				return report(&Task{Name: "group", Children: []*Task{',
			'					{Name: "a", Steps: []string{"throw:Boom"}},',
			'					{Name: "b", Steps: []string{"w1", "throw:Crash"}},',
			'				}}, "")',
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
			'import "strings"',
			'',
			'// Task is one node of the Swift task tree; see the starter comment',
			'// for the step language. The runtime fields live on the node itself',
			'// (each scenario builds a fresh tree), keeping the model free of',
			'// package-level state.',
			'type Task struct {',
			'	Name     string',
			'	Detached bool',
			'	Steps    []string',
			'	Children []*Task',
			'',
			'	cancelled bool',
			'	state     string',
			'	pc        int',
			'}',
			'',
			'// find locates the named task in root\'s tree (nil if absent).',
			'func find(root *Task, name string) *Task {',
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
			'// flagCancelled is the DOWNWARD propagation: flip isCancelled here',
			'// and recurse into attached children only. The Detached test is the',
			'// entire firewall — one missing parent edge, checked in one place.',
			'// Note what this does NOT do: touch state or pc. Cancellation in',
			'// Swift changes no control flow by itself.',
			'func flagCancelled(t *Task) {',
			'	t.cancelled = true',
			'	for _, c := range t.Children {',
			'		if !c.Detached {',
			'			flagCancelled(c)',
			'		}',
			'	}',
			'}',
			'',
			'// Cancel targets a task by name. Cancelling a detached task DIRECTLY',
			'// works fine (its handle\'s cancel() exists) — detachment only blocks',
			'// propagation from above, which is why the Detached check lives in',
			'// the recursion, not here.',
			'func Cancel(root *Task, name string) {',
			'	t := find(root, name)',
			'	if t == nil {',
			'		return',
			'	}',
			'	flagCancelled(t)',
			'}',
			'',
			'// parentIndex builds the child->parent map the throw handler needs.',
			'// The tree stores only downward edges, so the upward edge is computed',
			'// — same shape as the real runtime, where a child task holds a',
			'// reference to its parent\'s task record.',
			'func parentIndex(root *Task) map[string]*Task {',
			'	idx := map[string]*Task{}',
			'	var walk func(t *Task)',
			'	walk = func(t *Task) {',
			'		for _, c := range t.Children {',
			'			idx[c.Name] = t',
			'			walk(c)',
			'		}',
			'	}',
			'	walk(root)',
			'	return idx',
			'}',
			'',
			'// Run is the deterministic scheduler. Real Swift promises none of',
			'// this ordering — executors and suspension points decide — but the',
			'// propagation rules exercised on each tick are the real ones, and',
			'// determinism is what makes them testable.',
			'func Run(root *Task) ([]string, string) {',
			'	// DFS declaration order, fixed for the whole run: this list is',
			'	// the model\'s entire scheduling policy.',
			'	var order []*Task',
			'	var walk func(t *Task)',
			'	walk = func(t *Task) {',
			'		order = append(order, t)',
			'		for _, c := range t.Children {',
			'			walk(c)',
			'		}',
			'	}',
			'	walk(root)',
			'	parents := parentIndex(root)',
			'',
			'	trace := []string{}',
			'	firstErr := ""',
			'',
			'	for {',
			'		busy := false',
			'		for _, t := range order {',
			'			if t.state != "" {',
			'				continue // settled: out of the rotation',
			'			}',
			'			busy = true',
			'			if t.pc >= len(t.Steps) {',
			'				// Steps exhausted (or none at all): normal completion.',
			'				// Deliberately reached by CANCELLED tasks too: a body',
			'				// that never checks completes as if nothing happened',
			'				// — cancelled in name only.',
			'				t.state = "done"',
			'				continue',
			'			}',
			'			step := t.Steps[t.pc]',
			'			t.pc++',
			'			if step == "check" {',
			'				if t.cancelled {',
			'					// try Task.checkCancellation() throws',
			'					// CancellationError: the task ends "cancelled",',
			'					// remaining steps never run. Crucially this is',
			'					// NOT a failure — it sets no group error and',
			'					// cancels no siblings; cancellation is a normal',
			'					// way to finish.',
			'					trace = append(trace, t.Name+".cancelled")',
			'					t.state = "cancelled"',
			'				} else if t.pc >= len(t.Steps) {',
			'					t.state = "done" // a passing check was the last step',
			'				}',
			'				continue',
			'			}',
			'			if strings.HasPrefix(step, "throw:") {',
			'				msg := strings.TrimPrefix(step, "throw:")',
			'				trace = append(trace, t.Name+".threw("+msg+")")',
			'				t.state = "failed"',
			'				if !t.Detached {',
			'					// Attached failure: the group reaction. First',
			'					// error wins — a sibling throwing later (even',
			'					// before its first check) is discarded, exactly',
			'					// what waitForAll does with second errors.',
			'					if firstErr == "" {',
			'						firstErr = msg',
			'					}',
			'					p := parents[t.Name]',
			'					if p != nil {',
			'						// The model marks the group failed at throw',
			'						// time; the real group fails when its await',
			'						// rethrows (disclosed in the prose).',
			'						p.state = "failed"',
			'						// Implicit group cancellation: every attached',
			'						// sibling, declaration order, subtree-deep —',
			'						// and still only a FLAG; each victim dies at',
			'						// its own check, or not at all.',
			'						for _, sib := range p.Children {',
			'							if sib != t && !sib.Detached {',
			'								flagCancelled(sib)',
			'							}',
			'						}',
			'					}',
			'				}',
			'				// A detached thrower keeps its "failed" state but',
			'				// triggers nothing: no parent edge, no propagation,',
			'				// and — unawaited — the error is simply lost.',
			'				continue',
			'			}',
			'			// Plain work: runs regardless of the cancelled flag.',
			'			trace = append(trace, t.Name+"."+step)',
			'			if t.pc >= len(t.Steps) {',
			'				t.state = "done"',
			'			}',
			'		}',
			'		if !busy {',
			'			break // every task settled: the tree is quiescent',
			'		}',
			'	}',
			'	return trace, firstErr',
			'}',
			'',
			'// States reads every task\'s final state after Run.',
			'func States(root *Task) map[string]string {',
			'	res := map[string]string{}',
			'	var walk func(t *Task)',
			'	walk = func(t *Task) {',
			'		res[t.Name] = t.state',
			'		for _, c := range t.Children {',
			'			walk(c)',
			'		}',
			'	}',
			'	walk(root)',
			'	return res',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why cancellation is cooperative</h3>' +
			'<p>Swift had a cautionary tale to learn from: preemptive killing — ' +
			'<code>pthread_cancel</code>, Java\'s deprecated ' +
			'<code>Thread.stop</code> — can stop code mid-write: half-updated data ' +
			'structures, leaked file descriptors, poisoned locks. So ' +
			'<code>cancel()</code> only sets a bit, and the <em>task</em> chooses ' +
			'its safe points: <code>Task.checkCancellation()</code> throws, ' +
			'<code>Task.isCancelled</code> polls, and the built-in suspending APIs ' +
			'(<code>Task.sleep</code>, <code>URLSession</code>\'s async methods) ' +
			'check on your behalf — which is why a sleeping task “wakes up ' +
			'cancelled” immediately while a tight compute loop ignores cancellation ' +
			'forever. The console trace in the prose is the contract working as ' +
			'designed: the bytes that arrived after <code>cancel()</code> were the ' +
			'downloader running to its next check. For cleanup that must happen the ' +
			'instant the flag flips, ' +
			'<code>withTaskCancellationHandler(operation:onCancel:)</code> runs its ' +
			'handler immediately — the one place cancellation feels ' +
			'synchronous.</p>' +
			'<h3>Why errors take the tree and not the stack</h3>' +
			'<p>“Structured” means the task tree mirrors the code\'s block ' +
			'structure: a group cannot leak children past its closing brace, so ' +
			'every child\'s outcome must be accounted for by the time ' +
			'<code>waitForAll()</code> returns. That forces the two policies you ' +
			'implemented: a child error must go <em>somewhere</em> (up, to the ' +
			'group\'s await — first one wins, the rest are discarded), and pending ' +
			'siblings must be dealt with (cancelled, cooperatively — their work may ' +
			'be wasted but never corrupted). <code>async let</code> is the same ' +
			'machinery with sugar: an <code>async let</code> never awaited is ' +
			'cancelled-then-awaited at scope exit. The firewall you built is why ' +
			'Apple\'s own guidance treats <code>Task.detached</code> as a last ' +
			'resort: it opts out of cancellation, priority inheritance, task-local ' +
			'values, and error propagation all at once — four invisible edges gone. ' +
			'Most “my cancellation doesn\'t work” bugs are a ' +
			'<code>Task.detached</code> (or an unstructured <code>Task { }</code> ' +
			'handle stored past its scope) quietly standing outside the tree.</p>' +
			'<h3>Where the model simplifies, and one Go note</h3>' +
			'<p>Besides the disclosed scheduler determinism: real groups deliver ' +
			'results as children finish (<code>group.next()</code>), priorities can ' +
			'reorder everything, and a <code>CancellationError</code> thrown by a ' +
			'check <em>does</em> reach the group\'s await — but as a cancellation, ' +
			'not a failure, which is exactly the distinction your ' +
			'<code>cancelled</code>-vs-<code>failed</code> states encode. Go builds ' +
			'the same discipline from parts: <code>context.Context</code> is the ' +
			'cancellation flag (checked cooperatively via <code>ctx.Done()</code> — ' +
			'identical philosophy), and <code>errgroup.WithContext</code> is ' +
			'<code>withThrowingTaskGroup</code> minus the compiler: first error ' +
			'wins, siblings get the signal, but nothing stops a goroutine from ' +
			'ignoring it — the same cooperative bargain, enforced by convention ' +
			'instead of by structure.</p>',
		],
		complexity: { time: 'O(s + n·r) — every step executes exactly once; each round scans the task list', space: 'O(n) for the order list, parent index, and trace' },
	});
})();
