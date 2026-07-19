/* Activity Lifecycle — Activities & Navigation (Medium). THE Android
 * interview question, as executable truth: the activity lifecycle is a
 * four-state machine (gone / resumed / paused / stopped) whose edges are the
 * framework callbacks. The harness pins the full transition table — launch,
 * HOME, return, rotate, back, partial and full overlays — plus the famous
 * A/B interleaving: A pauses BEFORE B is created, and stops only AFTER B is
 * resumed.
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// The state machine, states as boxes and callbacks as edges. Marker ids
	// namespaced (dgArrowAndAL*) because every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 290" width="560" height="290" role="img" aria-label="activity lifecycle state machine: gone, resumed, paused, stopped, with the callbacks fired on each transition">' +
		'<text x="20" y="20" class="lbl">the activity lifecycle: four states, every callback is an edge</text>' +
		// states
		'<rect x="30" y="70" width="90" height="40" rx="6" fill="none" stroke="var(--muted)" stroke-width="2"/>' +
		'<text x="75" y="95" text-anchor="middle">gone</text>' +
		'<rect x="230" y="70" width="110" height="40" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="285" y="95" text-anchor="middle">resumed</text>' +
		'<rect x="440" y="70" width="90" height="40" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="485" y="95" text-anchor="middle">paused</text>' +
		'<rect x="230" y="210" width="110" height="40" rx="6" fill="none" stroke="var(--muted)" stroke-width="2"/>' +
		'<text x="285" y="235" text-anchor="middle">stopped</text>' +
		// launch / back
		'<path d="M 120 80 L 228 80" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndAL)"/>' +
		'<text x="175" y="72" text-anchor="middle" class="lbl">launch: create start resume</text>' +
		'<path d="M 230 100 L 122 100" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAndALw)"/>' +
		'<text x="175" y="116" text-anchor="middle" class="lbl" style="fill:var(--warn)">back: pause stop destroy</text>' +
		// dialog overlay / dismiss
		'<path d="M 340 80 L 438 80" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAndALw)"/>' +
		'<text x="390" y="72" text-anchor="middle" class="lbl">dialog over it: pause</text>' +
		'<path d="M 440 100 L 342 100" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndAL)"/>' +
		'<text x="390" y="116" text-anchor="middle" class="lbl">dismiss: resume</text>' +
		// home / return
		'<path d="M 260 110 L 260 208" fill="none" stroke="var(--muted)" stroke-width="1.6" marker-end="url(#dgArrowAndALm)"/>' +
		'<text x="250" y="150" text-anchor="end" class="lbl">home / full overlay:</text>' +
		'<text x="250" y="164" text-anchor="end" class="lbl">pause stop</text>' +
		'<path d="M 310 210 L 310 112" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndAL)"/>' +
		'<text x="320" y="150" text-anchor="start" class="lbl">return / dismiss:</text>' +
		'<text x="320" y="164" text-anchor="start" class="lbl">restart start resume</text>' +
		// rotate self-loop
		'<path d="M 265 70 C 245 38 325 38 305 70" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndAL)"/>' +
		'<text x="345" y="46" text-anchor="start" class="lbl">rotate: full teardown + rebuild —</text>' +
		'<text x="345" y="60" text-anchor="start" class="lbl">pause stop destroy · create start resume</text>' +
		'<text x="20" y="278" class="lbl">paused: still visible behind a dialog · stopped: fully hidden but alive · gone: destroyed</text>' +
		'<defs>' +
		'<marker id="dgArrowAndAL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowAndALw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowAndALm" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'activity-lifecycle',
		title: 'The Activity Lifecycle as a State Machine',
		nav: 'activity lifecycle',
		difficulty: 'Medium',
		category: 'Activities & Navigation',
		task: 'Implement Callbacks (the pinned state/event transition table), Trace (fold a scenario from "gone"), and LaunchB (the famous A/B interleaving).',

		prose: [
			'<h2>The Activity Lifecycle as a State Machine</h2>' +
			'<p>Two bug reports, one root cause. QA: <em>“rotate the phone on the ' +
			'signup form and everything typed disappears.”</em> A user: <em>“when ' +
			'a call comes in, the camera light stays on.”</em> Both are lifecycle ' +
			'bugs — code that assumed an Activity is an object with a lifetime like any ' +
			'other, when it is actually a <strong>state machine the OS drives</strong>, ' +
			'destroying and rebuilding your object at will. Instrument every callback ' +
			'and the machine becomes visible in Logcat:</p>',
			{ lang: 'kotlin', code: 'class MainActivity : AppCompatActivity() {\n    override fun onCreate(savedInstanceState: Bundle?) {\n        super.onCreate(savedInstanceState)\n        Log.d("LC", "onCreate")\n        setContentView(R.layout.activity_main)\n    }\n    override fun onStart()   { super.onStart();   Log.d("LC", "onStart") }\n    override fun onResume()  { super.onResume();  Log.d("LC", "onResume") }\n    override fun onPause()   { super.onPause();   Log.d("LC", "onPause") }\n    override fun onStop()    { super.onStop();    Log.d("LC", "onStop") }\n    override fun onRestart() { super.onRestart(); Log.d("LC", "onRestart") }\n    override fun onDestroy() { super.onDestroy(); Log.d("LC", "onDestroy") }\n}' },
			'<p>Launch the app, press HOME, come back, rotate:</p>',
			{ lang: 'txt', code: '--- launch ---\nD/LC: onCreate\nD/LC: onStart\nD/LC: onResume\n--- HOME ---\nD/LC: onPause\nD/LC: onStop\n--- return ---\nD/LC: onRestart\nD/LC: onStart\nD/LC: onResume\n--- rotate ---\nD/LC: onPause\nD/LC: onStop\nD/LC: onDestroy\nD/LC: onCreate      <- a NEW instance. Anything in a field is gone.\nD/LC: onStart\nD/LC: onResume' },
			'<p>The whole trace falls out of a four-state machine:</p>' +
			'<ul>' +
			'<li><strong>resumed</strong> — foreground, has input focus.</li>' +
			'<li><strong>paused</strong> — still <em>visible</em> but not focused: a ' +
			'dialog-themed activity or the incoming-call panel partially covers it. Only ' +
			'<code>onPause</code> has run. This is why the camera must be released in ' +
			'<code>onPause</code>, not <code>onStop</code> — the call panel only pauses you.</li>' +
			'<li><strong>stopped</strong> — fully hidden (HOME, or another full-screen ' +
			'activity on top) but the instance is alive. Coming back runs ' +
			'<code>onRestart onStart onResume</code> — <code>onCreate</code> does NOT run again.</li>' +
			'<li><strong>gone</strong> — destroyed: BACK, <code>finish()</code>, or the ' +
			'teardown half of a rotation.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Two activities interleave</h3>' +
			'<p>When resumed activity A starts activity B, the callbacks do not run as ' +
			'two tidy blocks. The pinned, famous ordering is:</p>',
			{ lang: 'txt', code: 'A.onPause   <- A yields FIRST (release the camera NOW)\nB.onCreate\nB.onStart\nB.onResume  <- B is up and focused...\nA.onStop    <- ...and only THEN is A notified it is hidden' },
			'<p>A pauses <em>before</em> B is even created — B\'s resume is gated on ' +
			'A\'s <code>onPause</code> returning, so A can hand off exclusive resources ' +
			'(camera, audio focus) fast. And A stops only <em>after</em> B is resumed, so ' +
			'something is always visible. The corollary is a performance rule: heavy work ' +
			'in <code>onPause</code> janks the <em>next</em> screen\'s entry animation, ' +
			'because the next screen literally waits for it.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Callbacks(state, event)</code> — one step of the machine, ' +
			'returning the new state and the callbacks fired in order (invalid pairs: state ' +
			'unchanged, nil callbacks) — plus <code>Trace(events)</code>, folding a whole ' +
			'scenario from <code>"gone"</code>, and <code>LaunchB()</code>, the pinned ' +
			'A/B interleaving.</p>' +
			'<div class="tip">Rotation is just the most common <em>configuration ' +
			'change</em> — locale, dark mode, and window resize do the same destroy/recreate ' +
			'dance. The fix for the blank-form bug is to keep state somewhere that outlives ' +
			'the instance; that is the next item (<em>ViewModel</em>).</div>',
		],

		starter: [
			'package main',
			'',
			'// Callbacks advances the activity lifecycle state machine by one event.',
			'//',
			'// States: "gone", "resumed", "paused", "stopped".',
			'// Events: "launch", "home", "return", "rotate", "back",',
			'//   "overlayDialogActivity" (a dialog-themed activity partially covers',
			'//   the screen — the activity stays visible), "overlayFull" (another',
			'//   full-screen activity covers it), "dismissOverlay" (the overlay,',
			'//   of either kind, goes away).',
			'//',
			'// It returns the new state and the framework callbacks fired, in order',
			'// (e.g. "resumed", ["onPause" "onStop" "onDestroy" "onCreate" "onStart"',
			'// "onResume"] for a rotation). An invalid (state, event) pair is a',
			'// no-op: same state back, nil callbacks.',
			'func Callbacks(state string, event string) (string, []string) {',
			'	// your code here',
			'	return state, nil',
			'}',
			'',
			'// Trace folds a whole scenario from the initial "gone" state,',
			'// concatenating the callbacks of every step — the Logcat trace the',
			'// scenario would print.',
			'func Trace(events []string) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// LaunchB returns the exact callback interleaving when resumed',
			'// activity A starts full-screen activity B, entries like "A.onPause".',
			'// Pinned by the framework: A pauses BEFORE B is created; A stops only',
			'// AFTER B is resumed.',
			'func LaunchB() []string {',
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
			'	// show renders one step as "newState | cb1 cb2 ..." so a wrong',
			'	// state and a wrong callback list both surface in the same diff.',
			'	show := func(state string, cbs []string) string {',
			'		if len(cbs) == 0 {',
			'			return state + " | (none)"',
			'		}',
			'		return state + " | " + strings.Join(cbs, " ")',
			'	}',
			'	step := func(state, event string) string {',
			'		s, cbs := Callbacks(state, event)',
			'		return show(s, cbs)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"cold launch: gone + launch fires onCreate onStart onResume and lands in resumed",',
			'			"resumed | onCreate onStart onResume",',
			'			func() string { return step("gone", "launch") }},',
			'		{"HOME from resumed: onPause then onStop — the activity is stopped, not destroyed",',
			'			"stopped | onPause onStop",',
			'			func() string { return step("resumed", "home") }},',
			'		{"returning after HOME: onRestart runs before onStart, and onCreate does NOT run again",',
			'			"resumed | onRestart onStart onResume",',
			'			func() string { return step("stopped", "return") }},',
			'		{"rotation is a full teardown and rebuild: pause stop destroy, then create start resume of a NEW instance",',
			'			"resumed | onPause onStop onDestroy onCreate onStart onResume",',
			'			func() string { return step("resumed", "rotate") }},',
			'		{"BACK from resumed destroys: onPause onStop onDestroy, ending in gone",',
			'			"gone | onPause onStop onDestroy",',
			'			func() string { return step("resumed", "back") }},',
			'		{"a dialog-themed activity over a resumed one only pauses it: onPause alone — it is still visible",',
			'			"paused | onPause",',
			'			func() string { return step("resumed", "overlayDialogActivity") }},',
			'		{"dismissing the dialog overlay: just onResume — no onStart, because the activity never stopped",',
			'			"resumed | onResume",',
			'			func() string { return step("paused", "dismissOverlay") }},',
			'		{"a full-screen overlay fully hides the activity: onPause onStop, state stopped",',
			'			"stopped | onPause onStop",',
			'			func() string { return step("resumed", "overlayFull") }},',
			'		{"dismissing a full overlay is a return from stopped: onRestart onStart onResume",',
			'			"resumed | onRestart onStart onResume",',
			'			func() string { return step("stopped", "dismissOverlay") }},',
			'		{"invalid pairs are no-ops: home while already stopped changes nothing and fires no callbacks",',
			'			"stopped | (none)",',
			'			func() string { return step("stopped", "home") }},',
			'		{"Trace folds a whole session — launch, HOME, return, rotate, back — into one Logcat-shaped list",',
			'			"onCreate onStart onResume onPause onStop onRestart onStart onResume onPause onStop onDestroy onCreate onStart onResume onPause onStop onDestroy",',
			'			func() string {',
			'				return strings.Join(Trace([]string{"launch", "home", "return", "rotate", "back"}), " ")',
			'			}},',
			'		{"launching B from A interleaves: A pauses BEFORE B exists, and A stops only AFTER B is resumed",',
			'			"A.onPause B.onCreate B.onStart B.onResume A.onStop",',
			'			func() string { return strings.Join(LaunchB(), " ") }},',
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
			'// callbacks the framework fires to get there, in order. The callback',
			'// LIST is part of the contract, not an implementation detail — real',
			'// Android code hangs resource acquisition and release on exactly these',
			'// hooks, so both the edge and its label must be right.',
			'type transition struct {',
			'	next string',
			'	cbs  []string',
			'}',
			'',
			'// lifecycle is the entire pinned table, keyed "state+event". Encoding',
			'// the machine as data instead of nested switches keeps every rule in',
			'// one visually checkable place — the same shape AOSP uses internally',
			'// (ActivityRecord drives activities through numbered lifecycle states;',
			'// the callbacks are the edges between them).',
			'var lifecycle = map[string]transition{',
			'	// Cold start: the only edge out of "gone".',
			'	"gone+launch": {"resumed", []string{"onCreate", "onStart", "onResume"}},',
			'	// HOME fully hides the activity but keeps the instance alive.',
			'	"resumed+home": {"stopped", []string{"onPause", "onStop"}},',
			'	// Coming back from stopped: onRestart, then the start half of the',
			'	// ladder — but NOT onCreate; the instance was never destroyed.',
			'	"stopped+return": {"resumed", []string{"onRestart", "onStart", "onResume"}},',
			'	// A configuration change is a full teardown of THIS instance and a',
			'	// build of a NEW one — six callbacks, one gesture. Everything held',
			'	// in a plain field dies in the middle of this list.',
			'	"resumed+rotate": {"resumed", []string{"onPause", "onStop", "onDestroy", "onCreate", "onStart", "onResume"}},',
			'	// BACK is a real destroy: the user said "done with this screen".',
			'	"resumed+back": {"gone", []string{"onPause", "onStop", "onDestroy"}},',
			'	// A dialog-themed activity leaves this one VISIBLE underneath, so',
			'	// only onPause fires — the visible/hidden distinction is exactly',
			'	// the paused/stopped distinction.',
			'	"resumed+overlayDialogActivity": {"paused", []string{"onPause"}},',
			'	"paused+dismissOverlay":         {"resumed", []string{"onResume"}},',
			'	// A full-screen overlay hides it completely: same edge as HOME.',
			'	"resumed+overlayFull": {"stopped", []string{"onPause", "onStop"}},',
			'	// Dismissing the full overlay is indistinguishable from returning',
			'	// after HOME — the machine has no memory of WHY it was stopped.',
			'	"stopped+dismissOverlay": {"resumed", []string{"onRestart", "onStart", "onResume"}},',
			'}',
			'',
			'// Callbacks advances the machine one step. Unknown (state, event)',
			'// pairs are deliberate no-ops rather than errors: the framework simply',
			'// never delivers, say, "home" to a stopped activity, so modeling it as',
			'// "nothing happens" matches reality and keeps Trace total.',
			'func Callbacks(state string, event string) (string, []string) {',
			'	t, ok := lifecycle[state+"+"+event]',
			'	if !ok {',
			'		return state, nil',
			'	}',
			'	return t.next, t.cbs',
			'}',
			'',
			'// Trace folds a scenario from "gone" — the state every activity is in',
			'// before its first launch — concatenating each step\'s callbacks. The',
			'// result reads exactly like the Logcat of an instrumented activity,',
			'// which is the point: the machine IS the trace generator.',
			'func Trace(events []string) []string {',
			'	state := "gone"',
			'	log := []string{}',
			'	for _, ev := range events {',
			'		next, cbs := Callbacks(state, ev)',
			'		state = next',
			'		log = append(log, cbs...)',
			'	}',
			'	return log',
			'}',
			'',
			'// LaunchB is the pinned two-activity interleaving. The ordering is not',
			'// arbitrary: B\'s creation is GATED on A.onPause returning (so A can',
			'// release exclusive resources — camera, audio focus — before B asks',
			'// for them), and A.onStop is deferred until B is fully resumed (so',
			'// something is always drawn). Consequence worth memorizing: slow code',
			'// in A.onPause delays the NEXT screen\'s entry, not A\'s exit.',
			'func LaunchB() []string {',
			'	return []string{"A.onPause", "B.onCreate", "B.onStart", "B.onResume", "A.onStop"}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Paused vs stopped is a visibility question</h3>' +
			'<p>The two “background” states exist because <em>visible</em> and ' +
			'<em>focused</em> are different properties. A paused activity is still on ' +
			'screen behind something translucent — it must keep rendering, so ' +
			'<code>onPause</code> has a hard budget: the next activity\'s resume waits on ' +
			'it. Release the camera and audio focus there; save nothing expensive there. A ' +
			'stopped activity is invisible — <code>onStop</code> is where bigger teardown ' +
			'belongs (and since API 28+ the system may batch it). The classic ' +
			'camera-light-stays-on bug is releasing in <code>onStop</code> when an ' +
			'incoming-call panel only ever pauses you.</p>' +
			'<h3>What the machine does not promise</h3>' +
			'<p><code>onDestroy</code> is <strong>not</strong> a reliable end-of-life ' +
			'hook. When the OS reclaims memory it kills the whole <em>process</em> of a ' +
			'stopped app — no callback runs at all (that path is the ViewModel item\'s ' +
			'“process death” event). Anything that must survive belongs in ' +
			'<code>onSaveInstanceState</code>/<code>SavedStateHandle</code> or on disk, ' +
			'written by <code>onStop</code> at the latest. Symmetrically, ' +
			'<code>onCreate</code> receiving a non-null <code>savedInstanceState</code> is ' +
			'how you detect “I am a rebuild, not a fresh start”.</p>' +
			'<h3>In the field</h3>' +
			'<ul>' +
			'<li><strong>Logcat first.</strong> <code>adb logcat -s LC</code> against an ' +
			'instrumented build turns any “state disappears sometimes” report into ' +
			'a deterministic transition sequence. Rotation bugs reproduce as the six-callback ' +
			'block; overlay bugs show a lone <code>onPause</code>.</li>' +
			'<li><strong>The interleaving is a profiler landmark.</strong> In Perfetto, a ' +
			'slow screen <em>entry</em> often traces back to the <em>previous</em> screen\'s ' +
			'<code>onPause</code> — the A/B ordering you implemented is why.</li>' +
			'<li><strong>Modern APIs are sugar over this machine.</strong> ' +
			'<code>DefaultLifecycleObserver</code>, <code>repeatOnLifecycle(STARTED)</code>, ' +
			'and Compose\'s <code>LifecycleEventEffect</code> all subscribe to exactly these ' +
			'edges; knowing the raw table tells you when each fires.</li>' +
			'<li><strong>Interviews.</strong> “What happens on rotation?” and ' +
			'“in what order do callbacks run when A starts B?” are asked because ' +
			'they distinguish people who have read the table from people who have debugged ' +
			'it. You have now generated it.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(1) per event — one table lookup; O(n) callbacks to fold an n-event trace', space: 'O(1) beyond the emitted trace' },
	});
})();
