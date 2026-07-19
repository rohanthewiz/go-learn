/* ViewModel Retention — Activities & Navigation (Medium). Why rotation used
 * to lose your data and how the ViewModelStore fixes it: the store is
 * RETAINED across configuration changes, cleared on finish (onCleared), and
 * simply gone on process death (no callback — but SavedStateHandle values
 * survive that, and NOT finish). The harness pins the identity of the bound
 * ViewModel instance across every event, the onCleared log, and the
 * saved-state survival matrix.
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// The survival matrix — the whole "where do I keep this state" decision
	// table. No arrows needed, so no <marker> ids to namespace here.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 232" width="560" height="232" role="img" aria-label="survival matrix: ViewModel fields survive rotation only; SavedStateHandle survives rotation and process death but not finish; disk survives everything">' +
		'<text x="20" y="22" class="lbl">what survives what — the state-retention decision table</text>' +
		'<text x="250" y="56" text-anchor="middle" class="lbl">rotate</text>' +
		'<text x="370" y="56" text-anchor="middle" class="lbl">process death</text>' +
		'<text x="490" y="56" text-anchor="middle" class="lbl">finish / back</text>' +
		'<line x1="20" y1="66" x2="540" y2="66" stroke="var(--muted)" stroke-width="1"/>' +
		// row 1: ViewModel field
		'<text x="20" y="92" text-anchor="start">ViewModel field</text>' +
		'<text x="250" y="92" text-anchor="middle" style="fill:var(--ok)">kept</text>' +
		'<text x="370" y="92" text-anchor="middle" style="fill:var(--warn)">lost</text>' +
		'<text x="490" y="92" text-anchor="middle" style="fill:var(--warn)">lost</text>' +
		// row 2: SavedStateHandle
		'<text x="20" y="130" text-anchor="start">SavedStateHandle</text>' +
		'<text x="250" y="130" text-anchor="middle" style="fill:var(--ok)">kept</text>' +
		'<text x="370" y="130" text-anchor="middle" style="fill:var(--ok)">kept</text>' +
		'<text x="490" y="130" text-anchor="middle" style="fill:var(--warn)">lost</text>' +
		// row 3: disk
		'<text x="20" y="168" text-anchor="start">DataStore / disk</text>' +
		'<text x="250" y="168" text-anchor="middle" style="fill:var(--ok)">kept</text>' +
		'<text x="370" y="168" text-anchor="middle" style="fill:var(--ok)">kept</text>' +
		'<text x="490" y="168" text-anchor="middle" style="fill:var(--ok)">kept</text>' +
		'<line x1="20" y1="184" x2="540" y2="184" stroke="var(--muted)" stroke-width="1"/>' +
		'<text x="20" y="212" class="lbl">onCleared fires on finish ONLY — never on rotation, never on process death</text>' +
		'</svg>';

	T.problem({
		id: 'viewmodel-retention',
		title: 'ViewModel: Surviving Rotation, Dying with Finish',
		nav: 'viewmodel retention',
		difficulty: 'Medium',
		category: 'Activities & Navigation',
		task: 'Implement the retention machine: same ViewModel id across rotate, new id after finish/process death, onCleared on finish only, SavedStateHandle surviving process death but not finish.',

		prose: [
			'<h2>ViewModel: Surviving Rotation, Dying with Finish</h2>' +
			'<p>The previous item ended on a cliffhanger: rotation destroys the Activity ' +
			'instance, so every field dies mid-gesture. For years the fix was ' +
			'hand-marshalling everything through <code>onSaveInstanceState</code> ' +
			'Bundles. The architecture-components answer is the ' +
			'<strong>ViewModelStore</strong>: a map of ViewModel instances owned not by ' +
			'the Activity <em>instance</em> but by the Activity <em>record</em> — the ' +
			'thing that persists across configuration changes. Instrument the identity ' +
			'and watch:</p>',
			{ lang: 'kotlin', code: 'class FeedViewModel(private val state: SavedStateHandle) : ViewModel() {\n    val feed = MutableStateFlow<List<Post>>(emptyList()) // plain field: rotation-proof only\n    var query: String\n        get() = state["query"] ?: ""\n        set(v) { state["query"] = v }                     // survives process death too\n\n    override fun onCleared() {\n        Log.d("VM", "onCleared - the screen is really gone")\n    }\n}\n\nclass FeedActivity : AppCompatActivity() {\n    private val vm: FeedViewModel by viewModels()        // lookup, not constructor\n    override fun onCreate(savedInstanceState: Bundle?) {\n        super.onCreate(savedInstanceState)\n        Log.d("VM", "bound: ${System.identityHashCode(vm)}")\n    }\n}' },
			{ lang: 'txt', code: '--- launch ---\nD/VM: bound: 118453276\n--- rotate ---\nD/VM: bound: 118453276     <- SAME instance: the store was retained\n--- BACK ---\nD/VM: onCleared - the screen is really gone\n--- relaunch ---\nD/VM: bound: 202157864     <- new store, new instance' },
			'<p>Three events, three completely different fates for your state:</p>' +
			'<ul>' +
			'<li><strong>rotate</strong> (any configuration change): the Activity instance ' +
			'is destroyed and rebuilt, but the ViewModelStore rides along — ' +
			'<code>by viewModels()</code> finds the <em>same</em> instance. No callback ' +
			'fires on the ViewModel; it never noticed.</li>' +
			'<li><strong>finish</strong> (BACK, <code>finish()</code>): the screen is ' +
			'really over. The store is cleared and <code>onCleared()</code> fires on every ' +
			'retained ViewModel — your one hook to cancel work and close resources. The ' +
			'saved-state Bundle is tied to the Activity record, which finish discards — ' +
			'so <em>saved state is lost too</em>. Next launch starts from nothing.</li>' +
			'<li><strong>process death</strong>: the OS reclaims a backgrounded app\'s ' +
			'memory. No callback of any kind runs — <code>onCleared</code> included; the ' +
			'process just stops existing. ViewModel instances evaporate, but ' +
			'<code>SavedStateHandle</code> values were serialized out of the process ' +
			'(into the system\'s saved-instance-state) and come back on relaunch.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Sim</code>, the retention machine. <code>Get()</code> ' +
			'returns the id of the ViewModel now bound, creating on first use ' +
			'(<code>"vm1"</code>, <code>"vm2"</code>, … per creation — identity made ' +
			'visible). <code>Event(e)</code> applies <code>"rotate"</code>, ' +
			'<code>"finish"</code>, or <code>"processDeath"</code>. ' +
			'<code>ClearedLog()</code> lists ids in <code>onCleared</code> order. ' +
			'<code>SaveState</code>/<code>RestoredState</code> model the ' +
			'SavedStateHandle: values survive process death, are lost on finish.</p>' +
			'<div class="tip">The matrix above is the entire ' +
			'“where do I keep this state” interview answer: transient UI state ' +
			'→ ViewModel field; must-survive-process-death navigation arguments and form ' +
			'input → SavedStateHandle (small, Parcelable-sized); anything the user would ' +
			'call <em>data</em> → DataStore/Room. One row each.</div>',
		],

		starter: [
			'package main',
			'',
			'// Sim models one screen\'s ViewModel retention across the three fates:',
			'// rotate (config change), finish (BACK), and process death.',
			'type Sim struct {',
			'	// your fields here',
			'}',
			'',
			'func NewSim() *Sim {',
			'	return &Sim{}',
			'}',
			'',
			'// Get returns the id of the ViewModel instance currently bound,',
			'// creating one on first use. Ids are "vm1", "vm2", ... — a fresh id',
			'// per CREATION, so retention is observable as id equality.',
			'func (s *Sim) Get() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// Event applies a lifecycle event:',
			'//   "rotate"       - activity recreated, ViewModelStore RETAINED:',
			'//                    same instance on next Get; saved state kept.',
			'//   "finish"       - store cleared: onCleared fires on the retained',
			'//                    instance (append its id to the cleared log);',
			'//                    saved state is DISCARDED with the activity record.',
			'//   "processDeath" - the OS kills the process: instance gone, but NO',
			'//                    onCleared (nothing runs); saved state SURVIVES.',
			'func (s *Sim) Event(e string) {',
			'	// your code here',
			'}',
			'',
			'// ClearedLog returns the ids that received onCleared, in order.',
			'func (s *Sim) ClearedLog() []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// SaveState writes k=v into the SavedStateHandle.',
			'func (s *Sim) SaveState(k, v string) {',
			'	// your code here',
			'}',
			'',
			'// RestoredState reads k back — "" if the value did not survive.',
			'func (s *Sim) RestoredState(k string) string {',
			'	// your code here',
			'	return ""',
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
			'	// cleared renders the onCleared log; "(none)" keeps the silent case',
			'	// visibly distinct from an empty-string diff.',
			'	cleared := func(s *Sim) string {',
			'		log := s.ClearedLog()',
			'		if len(log) == 0 {',
			'			return "(none)"',
			'		}',
			'		return "[" + strings.Join(log, " ") + "]"',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"two Gets on one screen bind ONE instance — by viewModels() is a lookup, not a constructor",',
			'			"vm1 vm1",',
			'			func() string {',
			'				s := NewSim()',
			'				return s.Get() + " " + s.Get()',
			'			}},',
			'		{"rotate: the activity is recreated but Get returns the SAME vm1 — the store was retained",',
			'			"vm1 vm1",',
			'			func() string {',
			'				s := NewSim()',
			'				a := s.Get()',
			'				s.Event("rotate")',
			'				return a + " " + s.Get()',
			'			}},',
			'		{"finish clears the store: the next Get creates a fresh vm2",',
			'			"vm1 vm2",',
			'			func() string {',
			'				s := NewSim()',
			'				a := s.Get()',
			'				s.Event("finish")',
			'				return a + " " + s.Get()',
			'			}},',
			'		{"onCleared fires on finish only — two rotations then finish log exactly [vm1]",',
			'			"[vm1]",',
			'			func() string {',
			'				s := NewSim()',
			'				s.Get()',
			'				s.Event("rotate")',
			'				s.Event("rotate")',
			'				s.Event("finish")',
			'				return cleared(s)',
			'			}},',
			'		{"process death: a NEW instance afterwards, but NO onCleared — nothing runs when the OS kills you",',
			'			"vm1 vm2 | cleared: (none)",',
			'			func() string {',
			'				s := NewSim()',
			'				a := s.Get()',
			'				s.Event("processDeath")',
			'				return a + " " + s.Get() + " | cleared: " + cleared(s)',
			'			}},',
			'		{"SavedStateHandle survives process death: the query text is still there on relaunch",',
			'			"doggos",',
			'			func() string {',
			'				s := NewSim()',
			'				s.Get()',
			'				s.SaveState("query", "doggos")',
			'				s.Event("processDeath")',
			'				return s.RestoredState("query")',
			'			}},',
			'		{"finish discards the activity record: saved state is lost with it",',
			'			"(lost)",',
			'			func() string {',
			'				s := NewSim()',
			'				s.Get()',
			'				s.SaveState("query", "doggos")',
			'				s.Event("finish")',
			'				v := s.RestoredState("query")',
			'				if v == "" {',
			'					return "(lost)"',
			'				}',
			'				return v',
			'			}},',
			'		{"rotation keeps BOTH: the same ViewModel and the saved state",',
			'			"vm1 doggos",',
			'			func() string {',
			'				s := NewSim()',
			'				s.Get()',
			'				s.SaveState("query", "doggos")',
			'				s.Event("rotate")',
			'				return s.Get() + " " + s.RestoredState("query")',
			'			}},',
			'		{"two full screen lifetimes: finish, relaunch, finish — cleared in creation order [vm1 vm2]",',
			'			"[vm1 vm2]",',
			'			func() string {',
			'				s := NewSim()',
			'				s.Get()',
			'				s.Event("finish")',
			'				s.Get()',
			'				s.Event("finish")',
			'				return cleared(s)',
			'			}},',
			'		{"a screen that never touched its ViewModel: finish clears nothing, and the next Get still starts at vm1",',
			'			"(none) then vm1",',
			'			func() string {',
			'				s := NewSim()',
			'				s.Event("finish")',
			'				return cleared(s) + " then " + s.Get()',
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
			'import "fmt"',
			'',
			'// Sim keeps exactly the state the platform keeps, one field per real',
			'// mechanism — the point of the exercise is that the mapping is direct:',
			'//   current  = the ViewModelStore ("" means empty store)',
			'//   saved    = the saved-instance-state held OUTSIDE the process',
			'//   cleared  = the observable onCleared history',
			'//   nextID   = creation counter, making instance identity visible',
			'type Sim struct {',
			'	nextID  int',
			'	current string',
			'	cleared []string',
			'	saved   map[string]string',
			'}',
			'',
			'func NewSim() *Sim {',
			'	return &Sim{saved: map[string]string{}}',
			'}',
			'',
			'// Get is by viewModels(): a store LOOKUP that constructs only on miss.',
			'// Retention is therefore not an action anyone takes — it is the',
			'// absence of clearing. Rotate does nothing to the store, so Get keeps',
			'// hitting the same entry.',
			'func (s *Sim) Get() string {',
			'	if s.current == "" {',
			'		s.nextID++',
			'		s.current = fmt.Sprintf("vm%d", s.nextID)',
			'	}',
			'	return s.current',
			'}',
			'',
			'func (s *Sim) Event(e string) {',
			'	switch e {',
			'	case "rotate":',
			'		// A configuration change destroys the ACTIVITY, not the store.',
			'		// Nothing happens here — and that nothing is the entire feature.',
			'	case "finish":',
			'		// The screen is really over: the store is cleared and each',
			'		// retained ViewModel gets its one teardown callback. The',
			'		// saved-state Bundle is tied to the activity RECORD, which',
			'		// finish discards — so saved state dies here too. (This is',
			'		// the asymmetry people miss: saved state outlives the OS',
			'		// killing you, but not the user dismissing you.)',
			'		if s.current != "" {',
			'			s.cleared = append(s.cleared, s.current)',
			'			s.current = ""',
			'		}',
			'		s.saved = map[string]string{}',
			'	case "processDeath":',
			'		// The OS kills the process wholesale. No code of ours runs —',
			'		// which is why onCleared must never guard anything that',
			'		// matters after death. The saved state lives OUTSIDE the',
			'		// process (serialized to the system), so it is untouched.',
			'		s.current = ""',
			'	}',
			'}',
			'',
			'func (s *Sim) ClearedLog() []string {',
			'	return s.cleared',
			'}',
			'',
			'// SaveState / RestoredState model SavedStateHandle: a small key-value',
			'// Bundle serialized out of the process. Real constraint worth knowing:',
			'// it round-trips through Parcel, so it must stay small and parcelable',
			'// — it is for the query string, not the query results.',
			'func (s *Sim) SaveState(k, v string) {',
			'	s.saved[k] = v',
			'}',
			'',
			'func (s *Sim) RestoredState(k string) string {',
			'	return s.saved[k]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Where the store actually lives</h3>' +
			'<p>During a configuration change the departing Activity hands its ' +
			'<code>ViewModelStore</code> to the system via ' +
			'<code>onRetainNonConfigurationInstance()</code> — the same ancient channel ' +
			'<code>getLastNonConfigurationInstance()</code> exposed in 2009; the ' +
			'architecture components just civilized it. ' +
			'<code>isChangingConfigurations()</code> is the bit the framework consults: ' +
			'rotation sets it (retain), <code>finish()</code> does not (clear + ' +
			'<code>onCleared</code>). The entire retained-vs-cleared decision is one ' +
			'boolean deep.</p>' +
			'<h3>The three-row matrix is a debugging tool</h3>' +
			'<ul>' +
			'<li><strong>“State survives rotation but not coming back the next ' +
			'morning”</strong> — that is process death: the app was killed in the ' +
			'background and restored from saved state. Plain ViewModel fields are gone; ' +
			'only <code>SavedStateHandle</code> and disk came back. Reproduce it honestly ' +
			'with <code>adb shell am kill your.package</code> while backgrounded — ' +
			'pressing BACK and relaunching is a <em>finish</em>, a different row of the ' +
			'matrix, and tests the wrong thing.</li>' +
			'<li><strong>“onCleared never ran”</strong> — it never runs on process death. ' +
			'Cancellation belongs to <code>viewModelScope</code> (cancelled <em>by</em> ' +
			'<code>onCleared</code> on finish, and needing no cleanup on death — the ' +
			'process is gone); durable side effects belong to <code>WorkManager</code>, ' +
			'which survives both.</li>' +
			'<li><strong><code>TransactionTooLargeException</code></strong> — the penalty ' +
			'for putting data of the wrong size in the middle row: saved state is parceled ' +
			'across a Binder transaction with a ~1&nbsp;MB budget shared by the whole ' +
			'process. Keep ids and field text in <code>SavedStateHandle</code>; re-query ' +
			'the data itself.</li>' +
			'</ul>' +
			'<h3>Scope is the modern spelling</h3>' +
			'<p><code>by viewModels()</code> scopes the store to one Activity; ' +
			'<code>by activityViewModels()</code> lets fragments share it; a ' +
			'navigation-graph scope ties it to a flow of screens. In every case the rules ' +
			'you implemented are unchanged — only the owner of the store moves. Compose\'s ' +
			'<code>viewModel()</code> and Hilt\'s <code>@HiltViewModel</code> sit on the ' +
			'same machinery, which is why this small state machine explains retention ' +
			'behavior across every modern Android stack.</p>',
		],
		complexity: { time: 'O(1) per event and per Get — the machine is a handful of field updates', space: 'O(c + k) for c cleared ids and k saved keys' },
	});
})();
