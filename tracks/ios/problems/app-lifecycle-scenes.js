/* App & Scene Lifecycle — View Controllers & Navigation (Medium). The app
 * execution-state machine: notRunning, inactive, active, background,
 * suspended, terminated — with the two silent edges as the teaching point:
 * suspension fires NO callback, and a suspended app killed under memory
 * pressure dies with NO callback (applicationWillTerminate never runs). The
 * harness pins the callback set per edge, interrupt-does-not-background, the
 * warm-resume-vs-cold-relaunch contrast, and a whole-session trace fold.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// The execution states, with the two dashed edges — suspend and the
	// memory kill — carrying no callbacks at all. Marker id namespaced
	// (dgArrowIOSALS) because every track's SVGs share the page's id
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 268" width="560" height="268" role="img" aria-label="app state machine: notRunning to active via launch; active to inactive to background; background to suspended silently; suspended to terminated silently">' +
		'<text x="20" y="22" class="lbl">the execution states — every solid edge fires callbacks, every dashed edge is SILENT</text>' +
		// top row: notRunning -> active <-> inactive
		'<rect x="24" y="44" width="110" height="38" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="79" y="68" text-anchor="middle">notRunning</text>' +
		'<rect x="220" y="44" width="100" height="38" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="270" y="68" text-anchor="middle">active</text>' +
		'<rect x="430" y="44" width="106" height="38" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="483" y="68" text-anchor="middle">inactive</text>' +
		'<path d="M 134 63 L 216 63" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowIOSALS)"/>' +
		'<text x="175" y="55" text-anchor="middle" class="lbl">launch</text>' +
		'<path d="M 320 56 L 426 56" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowIOSALSw)"/>' +
		'<text x="373" y="48" text-anchor="middle" class="lbl">interrupt: willResignActive</text>' +
		'<path d="M 426 74 L 324 74" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowIOSALS)"/>' +
		'<text x="373" y="92" text-anchor="middle" class="lbl">end: didBecomeActive</text>' +
		// down: active -> background
		'<rect x="220" y="130" width="120" height="38" rx="6" fill="none" stroke="var(--muted)" stroke-width="2"/>' +
		'<text x="280" y="154" text-anchor="middle">background</text>' +
		'<path d="M 255 82 L 255 126" fill="none" stroke="var(--muted)" stroke-width="1.6" marker-end="url(#dgArrowIOSALSm)"/>' +
		'<text x="245" y="108" text-anchor="end" class="lbl">home: resignActive, didEnterBackground</text>' +
		'<path d="M 305 126 L 305 82" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowIOSALS)"/>' +
		'<text x="315" y="108" text-anchor="start" class="lbl">return: willEnterForeground, didBecomeActive</text>' +
		// background -> suspended -> terminated (dashed, silent)
		'<rect x="220" y="196" width="120" height="38" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="6 3"/>' +
		'<text x="280" y="220" text-anchor="middle">suspended</text>' +
		'<path d="M 280 168 L 280 192" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="6 3" marker-end="url(#dgArrowIOSALSm)"/>' +
		'<text x="292" y="184" text-anchor="start" class="lbl">no callback</text>' +
		'<rect x="430" y="196" width="106" height="38" rx="6" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="6 3"/>' +
		'<text x="483" y="220" text-anchor="middle">terminated</text>' +
		'<path d="M 340 215 L 426 215" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="6 3" marker-end="url(#dgArrowIOSALSw)"/>' +
		'<text x="383" y="207" text-anchor="middle" class="lbl" style="fill:var(--warn)">memory kill: SILENT</text>' +
		'<text x="20" y="260" class="lbl">apps die in suspension without notification — save state in didEnterBackground, or lose it</text>' +
		'<defs>' +
		'<marker id="dgArrowIOSALS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowIOSALSw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowIOSALSm" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'app-lifecycle-scenes',
		title: 'App & Scene Lifecycle: The Silent Deaths',
		nav: 'app lifecycle scenes',
		difficulty: 'Medium',
		category: 'View Controllers & Navigation',
		task: 'Implement Apply (the pinned app/scene state machine, including the two silent edges) and TraceFold — proving suspended apps die without any callback.',

		prose: [
			'<h2>App &amp; Scene Lifecycle: The Silent Deaths</h2>' +
			'<p>The bug report: <em>&ldquo;users lose their draft if they leave the ' +
			'app for a few hours.&rdquo;</em> The code looks responsible — it saves ' +
			'in <code>applicationWillTerminate</code>. The problem is that for a ' +
			'backgrounded app, <strong>that method never runs</strong>. Minutes ' +
			'after entering the background the system quietly <em>suspends</em> the ' +
			'process (no callback), and when memory runs short it kills suspended ' +
			'processes outright — again, <strong>no callback</strong>. ' +
			'<code>applicationWillTerminate</code> fires only for the rare ' +
			'foreground termination (and even Apple\'s docs say do not rely on it). ' +
			'The draft was never saved because the code was waiting for a phone ' +
			'call that iOS does not make. Instrument the modern scene delegate and ' +
			'watch what actually fires:</p>',
			{ lang: 'swift', code: 'class SceneDelegate: UIResponder, UIWindowSceneDelegate {\n    func sceneDidBecomeActive(_ scene: UIScene)    { print("sceneDidBecomeActive") }\n    func sceneWillResignActive(_ scene: UIScene)   { print("sceneWillResignActive") }\n    func sceneWillEnterForeground(_ scene: UIScene){ print("sceneWillEnterForeground") }\n    func sceneDidEnterBackground(_ scene: UIScene) { print("sceneDidEnterBackground") }\n}\n// plus, in AppDelegate:\nfunc application(_ app: UIApplication,\n                 didFinishLaunchingWithOptions opts: [UIApplication.LaunchOptionsKey: Any]?)\n    -> Bool { print("didFinishLaunching"); return true }' },
			{ lang: 'txt', code: '--- cold launch ---\ndidFinishLaunching\nsceneWillEnterForeground\nsceneDidBecomeActive\n--- swipe to Home ---\nsceneWillResignActive\nsceneDidEnterBackground\n--- minutes pass: the app is SUSPENDED ---\n(nothing — the process is frozen mid-instruction)\n--- memory pressure: the system kills it ---\n(nothing — no willTerminate, no callback, the process is simply gone)\n--- user taps the icon again ---\ndidFinishLaunching        <- a COLD launch: the relaunch is how you find out you died\nsceneWillEnterForeground\nsceneDidBecomeActive' },
			'<p>The machine behind that trace has six states. Two distinctions do ' +
			'all the work:</p>' +
			'<ul>' +
			'<li><strong>inactive vs background.</strong> A phone call banner or ' +
			'the system permission alert makes the app <em>inactive</em> — still on ' +
			'screen, not receiving events. Only <code>sceneWillResignActive</code> ' +
			'fires; the app is <strong>not</strong> backgrounded, and when the ' +
			'interruption ends, <code>sceneDidBecomeActive</code> alone brings it ' +
			'back. Pausing gameplay and hiding sensitive UI belong on this edge, ' +
			'not the background one.</li>' +
			'<li><strong>suspended vs terminated — invisible from inside.</strong> ' +
			'Suspension freezes the process with zero notification; the memory kill ' +
			'destroys it with zero notification. The app can only discover which ' +
			'happened <em>afterwards</em>: a warm resume re-enters the foreground ' +
			'without <code>didFinishLaunching</code>, a relaunch after a kill runs ' +
			'the whole cold-launch sequence. Hence the iron rule: your last ' +
			'guaranteed callback is <code>sceneDidEnterBackground</code> — save ' +
			'there, every time, as if you will never be called again. Usually you ' +
			'won\'t be.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Apply(state, event)</code> — one step of the pinned ' +
			'machine, returning the new state and the callbacks fired in order ' +
			'(invalid pairs: state unchanged, nil callbacks) — and ' +
			'<code>TraceFold(events)</code>, folding a whole session from ' +
			'<code>notRunning</code> into (finalState, full callback trace).</p>' +
			'<div class="tip">The callback set is simplified but stated: real iOS ' +
			'splits these across <code>UIApplicationDelegate</code> and per-scene ' +
			'<code>UISceneDelegate</code> (an iPad app can have several scenes, ' +
			'each with its own foreground/background state). The model runs one ' +
			'scene and blends the two delegates — the transition <em>structure</em> ' +
			'is exactly the documented one.</div>',
		],

		starter: [
			'package main',
			'',
			'// Apply advances the app execution-state machine by one event.',
			'//',
			'// States: "notRunning", "inactive", "active", "background",',
			'//         "suspended", "terminated".',
			'// Events and their pinned transitions:',
			'//',
			'//   launch          notRunning -> active',
			'//                   [didFinishLaunching sceneWillEnterForeground sceneDidBecomeActive]',
			'//   homeButton      active -> background',
			'//                   [sceneWillResignActive sceneDidEnterBackground]',
			'//   reactivate      background -> active  (user returns)',
			'//                   [sceneWillEnterForeground sceneDidBecomeActive]',
			'//                   suspended -> active   (warm resume: the frozen process',
			'//                   thaws — same two callbacks, NO didFinishLaunching)',
			'//   systemInterrupt active -> inactive    (call banner, permission alert)',
			'//                   [sceneWillResignActive]  — NOT backgrounded',
			'//   interruptEnd    inactive -> active    [sceneDidBecomeActive]',
			'//   suspend         background -> suspended   NO callbacks (silent freeze)',
			'//   memoryPressure  suspended -> terminated   NO callbacks (silent death:',
			'//                   applicationWillTerminate does NOT run)',
			'//   relaunch        terminated -> active  (cold launch, new process)',
			'//                   [didFinishLaunching sceneWillEnterForeground sceneDidBecomeActive]',
			'//',
			'// Any other (state, event) pair is a no-op: same state, nil callbacks.',
			'func Apply(state string, event string) (string, []string) {',
			'	// your code here',
			'	return state, nil',
			'}',
			'',
			'// TraceFold folds a whole session from "notRunning", returning the',
			'// final state and the concatenated callbacks of every step — the',
			'// exact console trace the session would print.',
			'func TraceFold(events []string) (string, []string) {',
			'	// your code here',
			'	return "", nil',
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
			'	// show renders one step as "state | cb1 cb2" so a wrong state and',
			'	// a wrong callback list surface in the same diff.',
			'	show := func(state string, cbs []string) string {',
			'		if len(cbs) == 0 {',
			'			return state + " | (silent)"',
			'		}',
			'		return state + " | " + strings.Join(cbs, " ")',
			'	}',
			'	step := func(state, event string) string {',
			'		s, cbs := Apply(state, event)',
			'		return show(s, cbs)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"cold launch: didFinishLaunching, then the scene enters foreground and becomes active",',
			'			"active | didFinishLaunching sceneWillEnterForeground sceneDidBecomeActive",',
			'			func() string { return step("notRunning", "launch") }},',
			'		{"home: resign active, enter background — your LAST guaranteed callbacks",',
			'			"background | sceneWillResignActive sceneDidEnterBackground",',
			'			func() string { return step("active", "homeButton") }},',
			'		{"returning from background: foreground + active pair, and NO didFinishLaunching — the process never died",',
			'			"active | sceneWillEnterForeground sceneDidBecomeActive",',
			'			func() string { return step("background", "reactivate") }},',
			'		{"a call banner only DEACTIVATES: sceneWillResignActive alone, and the app is inactive, not backgrounded",',
			'			"inactive | sceneWillResignActive",',
			'			func() string { return step("active", "systemInterrupt") }},',
			'		{"the interruption ends: sceneDidBecomeActive alone — no foreground callback, the app never left the foreground",',
			'			"active | sceneDidBecomeActive",',
			'			func() string { return step("inactive", "interruptEnd") }},',
			'		{"suspension is SILENT: background -> suspended with no callback — the process is frozen mid-instruction",',
			'			"suspended | (silent)",',
			'			func() string { return step("background", "suspend") }},',
			'		{"the memory kill is SILENT: suspended -> terminated, and applicationWillTerminate does NOT run",',
			'			"terminated | (silent)",',
			'			func() string { return step("suspended", "memoryPressure") }},',
			'		{"warm resume from suspension: the frozen process thaws with the foreground pair — still no didFinishLaunching",',
			'			"active | sceneWillEnterForeground sceneDidBecomeActive",',
			'			func() string { return step("suspended", "reactivate") }},',
			'		{"relaunch after a silent kill is a COLD launch: didFinishLaunching runs again in a brand-new process",',
			'			"active | didFinishLaunching sceneWillEnterForeground sceneDidBecomeActive",',
			'			func() string { return step("terminated", "relaunch") }},',
			'		{"invalid pairs are no-ops: suspend only happens FROM background — an active app cannot be suspended",',
			'			"active | (silent)",',
			'			func() string { return step("active", "suspend") }},',
			'		{"TraceFold, the draft-loss session: launch, home, silent suspend, silent kill, cold relaunch — the trace shows the gap",',
			'			"active | didFinishLaunching sceneWillEnterForeground sceneDidBecomeActive " +',
			'				"sceneWillResignActive sceneDidEnterBackground " +',
			'				"didFinishLaunching sceneWillEnterForeground sceneDidBecomeActive",',
			'			func() string {',
			'				s, cbs := TraceFold([]string{"launch", "homeButton", "suspend", "memoryPressure", "relaunch"})',
			'				return show(s, cbs)',
			'			}},',
			'		{"TraceFold, the interrupt session: a call comes in and ends — the app never touches background",',
			'			"active | didFinishLaunching sceneWillEnterForeground sceneDidBecomeActive " +',
			'				"sceneWillResignActive sceneDidBecomeActive",',
			'			func() string {',
			'				s, cbs := TraceFold([]string{"launch", "systemInterrupt", "interruptEnd"})',
			'				return show(s, cbs)',
			'			}},',
			'		{"the warm/cold contrast in one line: suspended path resumes WITHOUT didFinishLaunching, killed path relaunches WITH it",',
			'			"warm=false cold=true",',
			'			func() string {',
			'				_, warm := TraceFold([]string{"launch", "homeButton", "suspend", "reactivate"})',
			'				_, cold := TraceFold([]string{"launch", "homeButton", "suspend", "memoryPressure", "relaunch"})',
			'				count := func(cbs []string) int {',
			'					n := 0',
			'					for _, cb := range cbs {',
			'						if cb == "didFinishLaunching" {',
			'							n++',
			'						}',
			'					}',
			'					return n',
			'				}',
			'				return fmt.Sprintf("warm=%v cold=%v", count(warm) > 1, count(cold) > 1)',
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
			'// transition is one row of the machine: the state entered and the',
			'// callbacks fired to get there. The callback list is part of the',
			'// contract — real apps hang save/restore logic on exactly these hooks,',
			'// so an edge with the right target but wrong callbacks is still a bug.',
			'type transition struct {',
			'	next string',
			'	cbs  []string',
			'}',
			'',
			'// coldLaunch is shared by launch and relaunch on purpose: a relaunch',
			'// after a silent kill IS a cold launch — same brand-new process, same',
			'// didFinishLaunching. That equality is the observable difference',
			'// between "you were suspended" and "you were killed".',
			'var coldLaunch = []string{"didFinishLaunching", "sceneWillEnterForeground", "sceneDidBecomeActive"}',
			'',
			'// lifecycle is the entire pinned table, keyed "state+event". Encoding',
			'// the machine as data keeps every rule in one visually checkable',
			'// place — including the two rows whose EMPTY callback lists are the',
			'// whole point of the item.',
			'var lifecycle = map[string]transition{',
			'	"notRunning+launch": {"active", coldLaunch},',
			'	// Home: deactivate, then background. sceneDidEnterBackground is',
			'	// the last callback iOS guarantees you — the docs budget you',
			'	// about five seconds of runtime after it returns.',
			'	"active+homeButton": {"background", []string{"sceneWillResignActive", "sceneDidEnterBackground"}},',
			'	// Return from background: foreground + active. NO relaunch',
			'	// callbacks — the process was alive the whole time.',
			'	"background+reactivate": {"active", []string{"sceneWillEnterForeground", "sceneDidBecomeActive"}},',
			'	// Warm resume from SUSPENDED: identical to the background return.',
			'	// The app cannot tell it was ever frozen — suspension is designed',
			'	// to be invisible from inside.',
			'	"suspended+reactivate": {"active", []string{"sceneWillEnterForeground", "sceneDidBecomeActive"}},',
			'	// An interruption (call banner, system alert) only deactivates:',
			'	// the app stays on screen, so there is no background edge here.',
			'	"active+systemInterrupt": {"inactive", []string{"sceneWillResignActive"}},',
			'	"inactive+interruptEnd":  {"active", []string{"sceneDidBecomeActive"}},',
			'	// The silent freeze: iOS stops scheduling the process. No hook',
			'	// exists — by design, so 3000 backgrounded apps cost nothing.',
			'	"background+suspend": {"suspended", nil},',
			'	// The silent death: a suspended process is reclaimed without ever',
			'	// being thawed to run a callback. applicationWillTerminate only',
			'	// fires for foreground terminations — rare, and not this row.',
			'	"suspended+memoryPressure": {"terminated", nil},',
			'	"terminated+relaunch":      {"active", coldLaunch},',
			'}',
			'',
			'// Apply advances the machine one step. Unknown pairs are deliberate',
			'// no-ops rather than errors: iOS simply never delivers, say, suspend',
			'// to an active app, so "nothing happens" both matches reality and',
			'// keeps TraceFold total.',
			'func Apply(state string, event string) (string, []string) {',
			'	t, ok := lifecycle[state+"+"+event]',
			'	if !ok {',
			'		return state, nil',
			'	}',
			'	return t.next, t.cbs',
			'}',
			'',
			'// TraceFold folds a session from "notRunning" — every app\'s state',
			'// before its first launch — concatenating each step\'s callbacks. The',
			'// interesting sessions are the ones whose trace SHRINKS relative to',
			'// the events: suspend and memoryPressure consume an event and emit',
			'// nothing, which is exactly the property that loses users\' drafts.',
			'func TraceFold(events []string) (string, []string) {',
			'	state := "notRunning"',
			'	log := []string{}',
			'	for _, ev := range events {',
			'		next, cbs := Apply(state, ev)',
			'		state = next',
			'		log = append(log, cbs...)',
			'	}',
			'	return state, log',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the silent edges are silent</h3>' +
			'<p>Suspension is iOS\'s answer to a question Android answered with ' +
			'process death and desktop OSes with swap: what do you do with 3000 ' +
			'installed apps on a device with a few GB of RAM? Freeze them. A ' +
			'suspended process keeps its memory but gets zero CPU — reopening it is ' +
			'instant, which is why iOS feels like everything is always running. ' +
			'But a freeze callback would defeat the purpose (code running at ' +
			'freeze time is code that can delay or dodge it), and a death callback ' +
			'is impossible: <strong>the process would have to be thawed to run ' +
			'it</strong>, spending exactly the memory and CPU the system is trying ' +
			'to reclaim. So the contract is brutal and honest: after ' +
			'<code>sceneDidEnterBackground</code> returns, you may never execute ' +
			'again. Apple\'s docs put a number on it — you get roughly five seconds ' +
			'there (more only via <code>beginBackgroundTask</code>), and the ' +
			'jetsam mechanism that later kills suspended processes writes a ' +
			'<em>jetsam event report</em> you can find in Xcode\'s Organizer, not a ' +
			'crash log, because it is not a crash.</p>' +
			'<h3>Consequences worth memorizing</h3>' +
			'<ul>' +
			'<li><strong>Save in <code>sceneDidEnterBackground</code>, restore in ' +
			'<code>sceneWillEnterForeground</code>.</strong> The warm/cold contrast ' +
			'you pinned is the whole persistence story: a warm resume finds your ' +
			'objects intact; a cold relaunch finds only what you wrote to disk. ' +
			'Code that cannot tell the difference (because it saves ' +
			'unconditionally) is correct; code that &ldquo;knows&rdquo; it will ' +
			'get a termination callback is the draft-loss bug.</li>' +
			'<li><strong>The inactive state is not a mini-background.</strong> ' +
			'<code>sceneWillResignActive</code> fires for call banners, ' +
			'notification pulls, the app switcher, Face&nbsp;ID prompts — moments ' +
			'when the app is still visible. Pause the game and hide the account ' +
			'balance here; do NOT tear down network connections or save the world, ' +
			'or every permission alert will jank. The pinned interrupt session — ' +
			'resign, then <code>sceneDidBecomeActive</code> with no foreground ' +
			'callback in between — is how you verify which edge you are on.</li>' +
			'<li><strong>Termination while suspended is the common case.</strong> ' +
			'Users &ldquo;close&rdquo; apps by going Home; the system reaps them ' +
			'hours later. <code>applicationWillTerminate</code> runs mainly when a ' +
			'<em>foreground</em> app\'s process must die (rare) — treating it as a ' +
			'save hook is the classic mistake this item exists to unteach.</li>' +
			'</ul>' +
			'<h3>What the model simplifies</h3>' +
			'<p>Real iOS splits the callbacks across two delegates: ' +
			'<code>UIApplicationDelegate</code> owns process-level events ' +
			'(<code>didFinishLaunching</code>, the legacy ' +
			'<code>applicationWillTerminate</code>) while each ' +
			'<code>UISceneDelegate</code> owns its scene\'s foreground/background ' +
			'dance — an iPad app with two windows runs two scene state machines ' +
			'over one process, and the process backgrounds only when the ' +
			'<em>last</em> scene does. Background execution modes (audio, ' +
			'location, <code>BGTaskScheduler</code>) let specific work continue ' +
			'past <code>didEnterBackground</code>, deferring — not escaping — the ' +
			'suspend edge. And the swipe-up force-quit is a third death: the user ' +
			'kills a suspended process, same silence, plus a policy penalty (iOS ' +
			'will not relaunch the app in the background afterwards). The ' +
			'six-state skeleton you implemented is the documented core all of ' +
			'those hang off.</p>',
		],
		complexity: { time: 'O(1) per event — one table lookup; O(n) to fold an n-event session', space: 'O(1) beyond the emitted trace' },
	});
})();
