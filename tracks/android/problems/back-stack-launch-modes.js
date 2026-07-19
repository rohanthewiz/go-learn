/* Back Stack & launchMode — Activities & Navigation (Hard). Task-stack
 * transitions: the material every navigation bug traces back to. The harness
 * pins standard (always push, duplicates included), singleTop (top-only
 * dedupe via onNewIntent), singleTask (clear above, top-down destroys, then
 * onNewIntent), and the standard+CLEAR_TOP surprise — the target itself is
 * destroyed and recreated, the classic lost-state bug — plus Back popping
 * exactly one entry.
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// [A B C] + startActivity(B) under singleTask: everything above B dies
	// top-down, then the EXISTING B gets onNewIntent. Marker id namespaced
	// (dgArrowAndBS) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 250" width="560" height="250" role="img" aria-label="launching B with singleTask onto stack A B C destroys C top-down and delivers onNewIntent to the existing B">' +
		'<text x="20" y="22" class="lbl">[A B C] + startActivity(B), launchMode="singleTask"</text>' +
		// before stack (bottom = A)
		'<rect x="60" y="50" width="120" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="120" y="72" text-anchor="middle">C</text>' +
		'<text x="192" y="72" text-anchor="start" class="lbl">&#8592; top</text>' +
		'<rect x="60" y="90" width="120" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="120" y="112" text-anchor="middle">B</text>' +
		'<rect x="60" y="130" width="120" height="34" rx="5" fill="none" stroke="var(--muted)" stroke-width="2"/>' +
		'<text x="120" y="152" text-anchor="middle">A</text>' +
		'<text x="120" y="192" text-anchor="middle" class="lbl">before</text>' +
		// transition arrow
		'<path d="M 230 110 L 350 110" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndBS)"/>' +
		'<text x="290" y="98" text-anchor="middle" class="lbl" style="fill:var(--warn)">destroy:C (top-down)</text>' +
		'<text x="290" y="130" text-anchor="middle" class="lbl">then newIntent:B</text>' +
		// after stack
		'<rect x="380" y="90" width="120" height="34" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="440" y="112" text-anchor="middle">B</text>' +
		'<text x="512" y="112" text-anchor="start" class="lbl">&#8592; top</text>' +
		'<rect x="380" y="130" width="120" height="34" rx="5" fill="none" stroke="var(--muted)" stroke-width="2"/>' +
		'<text x="440" y="152" text-anchor="middle">A</text>' +
		'<text x="440" y="192" text-anchor="middle" class="lbl">after — B is the SAME instance</text>' +
		'<text x="20" y="234" class="lbl">standard + CLEAR_TOP differs in one cruel step: it destroys B too, then recreates it — state lost</text>' +
		'<defs><marker id="dgArrowAndBS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'back-stack-launch-modes',
		title: 'The Back Stack & launchMode',
		nav: 'back stack',
		difficulty: 'Hard',
		category: 'Activities & Navigation',
		task: 'Implement Launch (standard / singleTop / singleTask / standard+CLEAR_TOP transitions with create/newIntent/destroy event logs) and Back (pop one, destroy it).',

		prose: [
			'<h2>The Back Stack &amp; launchMode</h2>' +
			'<p>The bug report: <em>“I tapped the same chat notification three times. ' +
			'Now I have to press BACK three times to leave the chat, and each press shows ' +
			'me… the same chat.”</em> Every navigation bug of this family — duplicate ' +
			'screens, BACK going somewhere weird, a form losing its text when a ' +
			'notification arrives — is a <strong>task back stack</strong> transition you ' +
			'didn\'t predict. The stack is a plain LIFO of activity instances; what makes ' +
			'it interesting is that <code>startActivity()</code> consults the target\'s ' +
			'<code>launchMode</code> and the Intent\'s flags to decide between three ' +
			'verbs: <em>create</em> a new instance, <em>deliver</em> to an existing one ' +
			'(<code>onNewIntent</code>), or <em>destroy</em> entries first.</p>',
			{ lang: 'txt', code: '<activity\n    android:name=".ChatActivity"\n    android:launchMode="singleTask"\n    android:exported="false" />' },
			{ lang: 'kotlin', code: '// The notification tap that files the classic bug: with the default\n// launchMode="standard", EVERY tap pushes another ChatActivity.\nval intent = Intent(this, ChatActivity::class.java)\n    .putExtra("chatId", chat.id)\nval pending = PendingIntent.getActivity(\n    this, 0, intent,\n    PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)\n\n// Re-deliveries land here instead of onCreate — on the EXISTING instance:\noverride fun onNewIntent(intent: Intent) {\n    super.onNewIntent(intent)\n    setIntent(intent)  // forget this and getIntent() keeps the OLD extras\n    openChat(intent.getStringExtra("chatId"))\n}' },
			'<p>The four behaviors this item pins, as stack transitions with an event ' +
			'log (<code>create:X</code>, <code>newIntent:X</code>, ' +
			'<code>destroy:X</code>, destroys listed top-down):</p>' +
			'<ul>' +
			'<li><strong>standard</strong> (the default): always push a new instance — ' +
			'even if X is already on top. Duplicates are a feature (think two different ' +
			'documents in an editor) and the notification bug in one.</li>' +
			'<li><strong>singleTop</strong>: if X is <em>on top</em>, no push — the ' +
			'existing top gets <code>onNewIntent</code>. X anywhere else (or absent) is ' +
			'a plain push. It guards the top only: <code>[B A] + B</code> still creates ' +
			'a second B.</li>' +
			'<li><strong>singleTask</strong>: if X is anywhere in the stack, destroy ' +
			'everything <em>above</em> it (top-down), then deliver ' +
			'<code>onNewIntent</code> to the surviving original. Absent → push. (Its ' +
			'separate-task/taskAffinity subtleties are real but out of scope here — ' +
			'this is the in-task behavior.)</li>' +
			'<li><strong>standard + FLAG_ACTIVITY_CLEAR_TOP</strong>: like singleTask\'s ' +
			'clearing, <em>but the target itself is destroyed and recreated</em> — ' +
			'<code>destroy:X create:X</code>. That surprising extra destroy is the ' +
			'classic lost-state bug: the half-typed form is gone because “go back ' +
			'to that screen” quietly meant “rebuild that screen”. (Adding ' +
			'<code>FLAG_ACTIVITY_SINGLE_TOP</code> is the standard fix — then the ' +
			'existing instance survives — but here we pin the raw flag.)</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Launch(stack, activity, mode, flagClearTop)</code> — ' +
			'stack is bottom→top; return the new stack and the event log — and ' +
			'<code>Back(stack)</code>, which pops the top entry and logs its ' +
			'<code>destroy</code>. Do not mutate the input slice.</p>' +
			'<div class="tip">BACK and <code>finish()</code> know nothing about ' +
			'launchMode: they always pop exactly one entry. launchMode shapes how the ' +
			'stack is <em>built</em>; BACK only ever unwinds it.</div>',
		],

		starter: [
			'package main',
			'',
			'// Launch applies one startActivity(activity) to a task back stack.',
			'//',
			'//   stack        bottom..top activity names (do NOT mutate it)',
			'//   mode         "standard" | "singleTop" | "singleTask"',
			'//   flagClearTop FLAG_ACTIVITY_CLEAR_TOP, modeled with standard mode',
			'//',
			'// It returns the new stack and an event log:',
			'//   "create:X"    a new instance of X was pushed',
			'//   "newIntent:X" an EXISTING X received onNewIntent (no new instance)',
			'//   "destroy:X"   X was destroyed — destroys are logged top-down',
			'//',
			'// Pinned semantics:',
			'//   standard:            always push, even duplicates.',
			'//   singleTop:           X on top -> newIntent:X; else push.',
			'//   singleTask:          X in stack -> destroy all above it (top-down),',
			'//                        then newIntent:X; absent -> push.',
			'//   standard+CLEAR_TOP:  X in stack -> destroy above it top-down, then',
			'//                        destroy X ITSELF and recreate it',
			'//                        (destroy:X create:X); absent -> push.',
			'func Launch(stack []string, activity, mode string, flagClearTop bool) ([]string, []string) {',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
			'// Back pops the top activity (BACK / finish()): the new stack plus',
			'// ["destroy:X"]. An empty stack returns (nil, nil).',
			'func Back(stack []string) ([]string, []string) {',
			'	// your code here',
			'	return nil, nil',
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
			'	// show renders "(bottom..top stack) | event log" so a wrong stack',
			'	// and a wrong log surface in one diff.',
			'	show := func(stack, log []string) string {',
			'		s := "[" + strings.Join(stack, " ") + "]"',
			'		if len(log) == 0 {',
			'			return s + " | (none)"',
			'		}',
			'		return s + " | " + strings.Join(log, " ")',
			'	}',
			'	launch := func(stack []string, activity, mode string, clearTop bool) string {',
			'		ns, log := Launch(stack, activity, mode, clearTop)',
			'		return show(ns, log)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"standard always pushes: launching C onto [A B] makes a third entry",',
			'			"[A B C] | create:C",',
			'			func() string { return launch([]string{"A", "B"}, "C", "standard", false) }},',
			'		{"standard pushes DUPLICATES: relaunching B onto [A B] gives [A B B] — the triple-notification-tap bug",',
			'			"[A B B] | create:B",',
			'			func() string { return launch([]string{"A", "B"}, "B", "standard", false) }},',
			'		{"singleTop with B on top: onNewIntent to the existing instance, no push",',
			'			"[A B] | newIntent:B",',
			'			func() string { return launch([]string{"A", "B"}, "B", "singleTop", false) }},',
			'		{"singleTop only guards the TOP: [B A] + B still creates a second B",',
			'			"[B A B] | create:B",',
			'			func() string { return launch([]string{"B", "A"}, "B", "singleTop", false) }},',
			'		{"singleTask clears above the target: [A B C] + B destroys C, then onNewIntent to the surviving B",',
			'			"[A B] | destroy:C newIntent:B",',
			'			func() string { return launch([]string{"A", "B", "C"}, "B", "singleTask", false) }},',
			'		{"singleTask with the target absent behaves like standard: push and create",',
			'			"[A B] | create:B",',
			'			func() string { return launch([]string{"A"}, "B", "singleTask", false) }},',
			'		{"singleTask from deep: [A B C D] + A unwinds three destroys in top-down order before the newIntent",',
			'			"[A] | destroy:D destroy:C destroy:B newIntent:A",',
			'			func() string { return launch([]string{"A", "B", "C", "D"}, "A", "singleTask", false) }},',
			'		{"CLEAR_TOP with standard mode kills the target TOO: [A B C] + B is destroy:C destroy:B create:B — the lost-state bug",',
			'			"[A B] | destroy:C destroy:B create:B",',
			'			func() string { return launch([]string{"A", "B", "C"}, "B", "standard", true) }},',
			'		{"CLEAR_TOP with the target absent is a plain push",',
			'			"[A B C] | create:C",',
			'			func() string { return launch([]string{"A", "B"}, "C", "standard", true) }},',
			'		{"CLEAR_TOP on the top entry still recreates it: [A B] + B is destroy:B create:B",',
			'			"[A B] | destroy:B create:B",',
			'			func() string { return launch([]string{"A", "B"}, "B", "standard", true) }},',
			'		{"BACK pops exactly one: [A B C] -> [A B], destroying C — launchMode never changes what BACK does",',
			'			"[A B] | destroy:C",',
			'			func() string {',
			'				ns, log := Back([]string{"A", "B", "C"})',
			'				return show(ns, log)',
			'			}},',
			'		{"cold start on an empty stack: singleTop has nothing to dedupe against — create, never a phantom newIntent",',
			'			"[A] | create:A",',
			'			func() string { return launch([]string{}, "A", "singleTop", false) }},',
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
			'// indexOf finds an activity in the stack, bottom-up. -1 if absent.',
			'// Bottom-most occurrence: standard mode can legally create duplicates,',
			'// and the clearing modes unwind to the DEEPEST copy so the stack above',
			'// it — duplicates included — is what gets destroyed. (The pinned test',
			'// cases never stack duplicates under a clearing mode, but the choice',
			'// still has to be deterministic.)',
			'func indexOf(stack []string, activity string) int {',
			'	for i, a := range stack {',
			'		if a == activity {',
			'			return i',
			'		}',
			'	}',
			'	return -1',
			'}',
			'',
			'// Launch is startActivity(): three verbs — create, deliver (newIntent),',
			'// destroy — chosen by launchMode and CLEAR_TOP. The input stack is',
			'// never mutated; every path builds a fresh slice, because the real',
			'// ActivityManager also treats the transition as compute-then-commit',
			'// (the old task state must survive if the launch is aborted).',
			'func Launch(stack []string, activity, mode string, flagClearTop bool) ([]string, []string) {',
			'	idx := indexOf(stack, activity)',
			'',
			'	// singleTop: dedupe against the TOP only. The len guard matters:',
			'	// on an empty stack both idx and len-1 are -1, and without it a',
			'	// cold start would "deliver" to a ghost instead of creating.',
			'	if mode == "singleTop" && len(stack) > 0 && idx == len(stack)-1 {',
			'		out := append([]string(nil), stack...)',
			'		return out, []string{"newIntent:" + activity}',
			'	}',
			'',
			'	// singleTask, target present: destroy everything above it — logged',
			'	// top-down, matching the order the framework actually finishes',
			'	// them — then the ORIGINAL instance gets onNewIntent. No create:',
			'	// its onCreate ran long ago, which is exactly why stale-Intent',
			'	// bugs cluster on this mode (see setIntent in the prose).',
			'	if mode == "singleTask" && idx >= 0 {',
			'		log := []string{}',
			'		for i := len(stack) - 1; i > idx; i-- {',
			'			log = append(log, "destroy:"+stack[i])',
			'		}',
			'		out := append([]string(nil), stack[:idx+1]...)',
			'		log = append(log, "newIntent:"+activity)',
			'		return out, log',
			'	}',
			'',
			'	// standard + CLEAR_TOP, target present: same unwind as singleTask',
			'	// PLUS the cruel step — the target itself dies and is recreated.',
			'	// With standard mode the framework has no license to reuse the',
			'	// instance (standard means "deliveries create instances"), so',
			'	// clearing "down to" X ends with a fresh X. destroy:X then',
			'	// create:X, and every field of the old X is gone.',
			'	if mode == "standard" && flagClearTop && idx >= 0 {',
			'		log := []string{}',
			'		for i := len(stack) - 1; i > idx; i-- {',
			'			log = append(log, "destroy:"+stack[i])',
			'		}',
			'		out := append([]string(nil), stack[:idx]...)',
			'		out = append(out, activity)',
			'		log = append(log, "destroy:"+activity, "create:"+activity)',
			'		return out, log',
			'	}',
			'',
			'	// Everything else — standard mode, or a dedupe mode whose target',
			'	// is absent (or not on top, for singleTop) — is a plain push.',
			'	out := append([]string(nil), stack...)',
			'	out = append(out, activity)',
			'	return out, []string{"create:" + activity}',
			'}',
			'',
			'// Back is deliberately dumb: pop one, destroy it. launchMode shapes',
			'// how the stack is BUILT; BACK only ever unwinds it one entry at a',
			'// time — which is why a stack of notification-tap duplicates takes',
			'// that many BACK presses to escape.',
			'func Back(stack []string) ([]string, []string) {',
			'	if len(stack) == 0 {',
			'		return nil, nil',
			'	}',
			'	top := stack[len(stack)-1]',
			'	out := append([]string(nil), stack[:len(stack)-1]...)',
			'	return out, []string{"destroy:" + top}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The chat-notification bug, solved three ways</h3>' +
			'<p>Run the pinned transitions against the bug report. Three taps under ' +
			'<strong>standard</strong>: <code>[Feed Chat Chat Chat]</code> — three BACKs ' +
			'through the same chat. <strong>singleTop</strong> fixes the taps that arrive ' +
			'while the chat is already frontmost (<code>newIntent</code>, stack ' +
			'unchanged) but not a tap that arrives while you\'ve navigated deeper. ' +
			'<strong>singleTask</strong> fixes both — and quietly <em>destroys whatever ' +
			'you had above the chat</em>, which is its own bug report if the user was ' +
			'mid-checkout. There is no correct default; there is only knowing the ' +
			'table you just implemented.</p>' +
			'<h3>Field notes</h3>' +
			'<ul>' +
			'<li><strong><code>onNewIntent</code> + <code>setIntent</code>.</strong> ' +
			'Both dedupe modes deliver to an instance whose <code>onCreate</code> ran ' +
			'long ago. Reading extras only in <code>onCreate</code> — or forgetting ' +
			'<code>setIntent(intent)</code> so a later <code>getIntent()</code> returns ' +
			'the original Intent — is the “notification opens the wrong chat” ' +
			'bug, and it only reproduces when the activity already exists.</li>' +
			'<li><strong>The CLEAR_TOP recreate is opt-out.</strong> ' +
			'<code>FLAG_ACTIVITY_CLEAR_TOP or FLAG_ACTIVITY_SINGLE_TOP</code> is the ' +
			'spelling that clears above <em>and</em> reuses the target — the pair most ' +
			'“navigate home” helpers actually want. The raw flag\'s ' +
			'destroy-and-recreate you pinned is the documented standard-mode behavior ' +
			'and the classic lost-form bug.</li>' +
			'<li><strong>Debugging is one command.</strong> <code>adb shell dumpsys ' +
			'activity activities</code> prints every task\'s stack, top-down — the same ' +
			'list your <code>Launch</code> returns. When BACK “goes somewhere ' +
			'weird”, dump the stack first; the mystery usually evaporates.</li>' +
			'<li><strong>Out of scope, on purpose.</strong> singleTask\'s ' +
			'<code>taskAffinity</code> interactions (it may found a <em>new task</em>), ' +
			'<code>singleInstance</code>/<code>singleInstancePerTask</code>, and ' +
			'<code>FLAG_ACTIVITY_NEW_TASK</code> routing are the multi-task sequel to ' +
			'this single-task table. The in-task transitions pinned here are the part ' +
			'every mode shares.</li>' +
			'<li><strong>Modern stacks still sit on this.</strong> Jetpack Navigation\'s ' +
			'<code>popUpTo { inclusive = true }</code> and <code>launchSingleTop</code> ' +
			'are these exact semantics with better names, and Compose Navigation kept ' +
			'them. The framework table you implemented is what they compile down ' +
			'to.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n) per launch — one scan to find the target, one pass to rebuild the stack', space: 'O(n) for the new stack and the event log' },
	});
})();
