/* SwiftUI State & View Identity — UI: SwiftUI, Lists & Layout (Hard). The
 * dependency graph behind every SwiftUI screen: reading a @State property
 * subscribes a view's body to it, writing invalidates exactly the bodies
 * that read it, a @Binding write resolves to the OWNING view's storage, and
 * @State storage lives and dies with STRUCTURAL IDENTITY — which is why an
 * if/else branch flip silently resets state while a modifier-only change
 * keeps it. The harness pins the leaf-reader wave, binding attribution to
 * the owner, and the branch-flip state reset (branch-local storage dies,
 * the parent's survives).
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// One Write("query") through a small tree: bodies that READ the key
	// re-evaluate (wherever they sit), bodies that don't are left alone —
	// there is no "re-render the screen". Marker id namespaced
	// (dgArrowIOSSUI) because every track's SVGs share the page's id space.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 216" width="520" height="216" role="img" aria-label="writing the query state re-evaluates the bodies of Screen, SearchBar and ResultCount, which read it; Results does not read it and its body is not re-run, though the walk continues below it to reach the deep reader">' +
		'<text x="20" y="22" class="lbl">Write("query"): a body re-evaluates iff it READ the key — depth is irrelevant</text>' +
		// root: reads query
		'<rect x="195" y="34" width="130" height="30" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="260" y="54" text-anchor="middle">Screen</text>' +
		'<text x="333" y="54" class="lbl" style="fill:var(--accent)">reads query → body re-runs</text>' +
		// edges
		'<path d="M 235 66 L 110 100" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowIOSSUI)"/>' +
		'<path d="M 285 66 L 410 100" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="4 4"/>' +
		// children
		'<rect x="40" y="104" width="140" height="30" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="110" y="124" text-anchor="middle">SearchBar</text>' +
		'<text x="110" y="152" text-anchor="middle" class="lbl" style="fill:var(--accent)">reads query → re-runs</text>' +
		'<rect x="340" y="104" width="140" height="30" rx="6" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<text x="410" y="124" text-anchor="middle">Results</text>' +
		'<text x="410" y="152" text-anchor="middle" class="lbl">no read → body NOT re-run</text>' +
		// deep reader under the non-reader
		'<path d="M 410 158 L 410 176" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowIOSSUI)"/>' +
		'<rect x="340" y="178" width="140" height="28" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.8"/>' +
		'<text x="410" y="197" text-anchor="middle">ResultCount</text>' +
		'<text x="330" y="197" text-anchor="end" class="lbl" style="fill:var(--accent)">deep reader still fires — its own subscription</text>' +
		'<defs><marker id="dgArrowIOSSUI" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'swiftui-state',
		title: 'SwiftUI: @State, @Binding & View Identity',
		nav: 'swiftui state',
		difficulty: 'Hard',
		category: 'UI: SwiftUI, Lists & Layout',
		task: 'Implement Write (reads-subscribe invalidation over the view tree), WriteBinding (a binding write resolves to the owning view\'s state), and IdentitySwitch (a structural branch flip destroys branch-local @State).',

		prose: [
			'<h2>SwiftUI: @State, @Binding &amp; View Identity</h2>' +
			'<p>QA files the bug nobody can reproduce at their desk: “rotate the ' +
			'phone mid-game and the score resets to zero.” Nothing writes ' +
			'<code>score = 0</code> anywhere. The culprit is two innocent-looking ' +
			'lines:</p>',
			{ lang: 'swift', code: 'struct ScoreBoard: View {\n    @State private var score = 0     // storage OWNED by this view\'s identity\n    var body: some View {\n        VStack {\n            Text("Score: \\(score)")\n            Button("+1") { score += 1 }\n        }\n    }\n}\n\nstruct GameScreen: View {\n    @State private var landscape = false\n    var body: some View {\n        if landscape {\n            ScoreBoard()   // identity: GameScreen / if-TRUE branch / ScoreBoard\n        } else {\n            ScoreBoard()   // identity: GameScreen / if-FALSE branch / ScoreBoard\n        }\n    }\n}' },
			'<p>To SwiftUI those are two <em>different</em> views. A view’s ' +
			'<strong>structural identity</strong> is its position in the tree — ' +
			'including <em>which branch of a conditional it sits in</em> — and ' +
			'<code>@State</code> storage is keyed by that identity. Flip ' +
			'<code>landscape</code> and the if-branch <code>ScoreBoard</code> is ' +
			'torn down (its storage destroyed), the else-branch one is created ' +
			'fresh (storage re-initialized). <code>Self._printChanges()</code> ' +
			'shows it happening:</p>',
			{ lang: 'txt', code: '// let _ = Self._printChanges() at the top of ScoreBoard.body:\nScoreBoard: _score changed.       // tapping +1 — the write invalidated this reader\nScoreBoard: @identity changed.    // after rotation — NEW storage; score is 0 again' },
			'<p>Contrast the fix: keep <em>one</em> <code>ScoreBoard()</code> in the ' +
			'tree and vary a modifier — ' +
			'<code>ScoreBoard().frame(maxWidth: landscape ? .infinity : 400)</code>. ' +
			'Same position, same type, same identity: the state survives.</p>' +
			'<h3>The three rules</h3>' +
			'<ul>' +
			'<li><strong>Reads subscribe.</strong> Evaluating a body that reads a ' +
			'<code>@State</code> property records a dependency. Writing that ' +
			'property re-evaluates <em>exactly the bodies that read it</em> — a leaf ' +
			'reading <code>score</code> re-runs alone; its parent’s body never ' +
			'executes. A key nobody reads re-evaluates nothing.</li>' +
			'<li><strong>Bindings write through to the owner.</strong> ' +
			'<code>@Binding</code> is not storage; it is a reference to some other ' +
			'view’s <code>@State</code>. Toggling a <code>Toggle(isOn: $notifsOn)</code> ' +
			'three levels down writes the <em>owner’s</em> storage, and the ' +
			'invalidation wave is computed from the owner’s key — a view that ' +
			'merely <em>passes</em> <code>$notifsOn</code> along without reading it ' +
			'is not re-evaluated.</li>' +
			'<li><strong>Storage follows identity.</strong> ' +
			'<code>if/else</code> branches are distinct identities; flipping the ' +
			'condition destroys every <code>@State</code> owned inside the leaving ' +
			'branch — including grandchildren — while state owned outside the ' +
			'branch survives untouched.</li>' +
			'</ul>' +
			DIAGRAM,
			{ lang: 'swift', code: 'struct SettingsScreen: View {\n    @State private var notifsOn = true          // the source of truth lives HERE\n    var body: some View {\n        Text(notifsOn ? "On" : "Off")            // this body READS notifsOn\n        NotifRow(isOn: $notifsOn)                // hands out a $ projection\n    }\n}\n\nstruct NotifRow: View {\n    @Binding var isOn: Bool                     // no storage — a write-through reference\n    var body: some View {\n        Toggle("Notifications", isOn: $isOn)     // toggling writes the OWNER\'s state\n    }\n}' },
			'<h3>Your job</h3>' +
			'<p>Implement the model over a view tree where each view declares the ' +
			'state keys it <em>owns</em> (<code>States</code>), the names its body ' +
			'<em>reads</em> (<code>Reads</code> — either a state key or one of its ' +
			'own binding names), and its <code>Bindings</code> (local name → the ' +
			'state key it projects). <code>Write(root, key)</code> returns the ' +
			'views whose bodies re-evaluate, in preorder (parents before children, ' +
			'declaration order among siblings). <code>WriteBinding(root, view, ' +
			'local)</code> resolves the binding to its owning key, then behaves ' +
			'like <code>Write</code>. <code>IdentitySwitch(root, branch, ' +
			'structural)</code> returns the state keys destroyed by a branch flip: ' +
			'every key owned inside the named subtree when the flip is structural, ' +
			'nothing when only a modifier changed.</p>' +
			'<div class="tip">The pinned preorder result order is this model’s ' +
			'simplification: real SwiftUI gives no ordering guarantee for body ' +
			're-evaluation within an update transaction — the dependency graph ' +
			'(AttributeGraph) decides. The <em>set</em> of re-evaluated bodies is ' +
			'the part that matches the real framework, and the part ' +
			'<code>Self._printChanges()</code> lets you audit.</div>',
		],

		starter: [
			'package main',
			'',
			'// Binding models one @Binding a view holds: the Local name used inside',
			'// that view\'s body, and the state Key (owned by some ancestor) that it',
			'// projects. A binding is NOT storage — writes resolve to the owner.',
			'type Binding struct {',
			'	Local string',
			'	Key   string',
			'}',
			'',
			'// View is one node of the view tree.',
			'//   States   — @State keys whose STORAGE this view owns (keys are',
			'//              globally unique in these trees)',
			'//   Reads    — names this view\'s body reads: either a state key',
			'//              directly, or the Local name of one of its own Bindings',
			'//   Bindings — $ projections passed into this view',
			'//   Children — child views, in declaration order',
			'type View struct {',
			'	Name     string',
			'	States   []string',
			'	Reads    []string',
			'	Bindings []Binding',
			'	Children []*View',
			'}',
			'',
			'// Write simulates writing the @State property key and returns the',
			'// names of the views whose bodies RE-EVALUATE, in preorder (parents',
			'// before children, declaration order among siblings).',
			'//',
			'// A body re-evaluates iff it reads the key: either key appears in',
			'// Reads directly, or Reads contains a Local binding name whose Key is',
			'// the written key. Depth is irrelevant — a deep reader fires on its',
			'// own subscription, and a non-reading ancestor is NOT re-evaluated.',
			'func Write(root *View, key string) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// WriteBinding simulates a write THROUGH a binding: find the view',
			'// named viewName, resolve its binding with the given Local name to',
			'// the owning state key, and return Write(root, thatKey). The wave is',
			'// attributed to the OWNER\'s key — the view holding the binding gets',
			'// no special treatment (it re-evaluates only if it also reads).',
			'// Unknown view or binding: return an empty (or nil) list.',
			'func WriteBinding(root *View, viewName, local string) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// IdentitySwitch models flipping the condition around the subtree',
			'// rooted at the view named branchName.',
			'//',
			'// structural == true models `if flag { Branch() } else { Other() }`:',
			'// the branch\'s structural identity changes, so EVERY @State key owned',
			'// by the branch view or any of its descendants is destroyed — return',
			'// those keys in preorder declaration order. Keys owned outside the',
			'// branch are never included: the parent\'s state survives.',
			'//',
			'// structural == false models a modifier-only change (same view, a',
			'// different .frame/.opacity argument): identity is preserved and no',
			'// storage is destroyed — return an empty (or nil) list.',
			'func IdentitySwitch(root *View, branchName string, structural bool) []string {',
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
			'	// n builds a view without bindings, nb with them; children attach',
			'	// in declaration order. none keeps the tree literals readable.',
			'	n := func(name string, states, reads []string, children ...*View) *View {',
			'		return &View{Name: name, States: states, Reads: reads, Children: children}',
			'	}',
			'	nb := func(name string, states, reads []string, bindings []Binding, children ...*View) *View {',
			'		return &View{Name: name, States: states, Reads: reads, Bindings: bindings, Children: children}',
			'	}',
			'	none := []string{}',
			'	fmtNames := func(names []string) string {',
			'		if len(names) == 0 {',
			'			return "(none)"',
			'		}',
			'		return strings.Join(names, " ")',
			'	}',
			'	// settings is the SettingsScreen tree from the prose: the screen',
			'	// owns and reads notifsOn; ToggleRow holds the binding but does',
			'	// NOT read it (it just passes $notifsOn along).',
			'	mkSettings := func() *View {',
			'		return nb("Settings", []string{"notifsOn"}, []string{"notifsOn"}, nil,',
			'			nb("ToggleRow", none, none, []Binding{{"isOn", "notifsOn"}},',
			'				n("RowLabel", none, none)))',
			'	}',
			'	// compose is the identity-switch tree: the screen owns landscape;',
			'	// the Editor branch owns draft, its AttachmentTray owns trayOpen.',
			'	mkCompose := func() *View {',
			'		return n("Compose", []string{"landscape"}, []string{"landscape"},',
			'			n("Editor", []string{"draft"}, []string{"draft"},',
			'				n("AttachmentTray", []string{"trayOpen"}, []string{"trayOpen"})))',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"a leaf reads score: writing it re-evaluates ONLY that leaf\'s body — the parent never re-executes",',
			'			"ScoreLabel",',
			'			func() string {',
			'				tree := n("ScoreScreen", []string{"score"}, none,',
			'					n("Header", none, none),',
			'					n("ScoreLabel", none, []string{"score"}))',
			'				return fmtNames(Write(tree, "score"))',
			'			}},',
			'		{"a key nobody reads: the write re-evaluates nothing — there is no \\"re-render the screen\\"",',
			'			"(none)",',
			'			func() string {',
			'				tree := n("ScoreScreen", []string{"score", "theme"}, none,',
			'					n("Header", none, none),',
			'					n("ScoreLabel", none, []string{"score"}))',
			'				return fmtNames(Write(tree, "theme"))',
			'			}},',
			'		{"readers at three depths fire together, reported preorder — parents before children",',
			'			"Screen SearchBar ResultCount",',
			'			func() string {',
			'				tree := n("Screen", []string{"query"}, []string{"query"},',
			'					n("SearchBar", none, []string{"query"}),',
			'					n("Results", none, none,',
			'						n("ResultCount", none, []string{"query"})))',
			'				return fmtNames(Write(tree, "query"))',
			'			}},',
			'		{"sibling readers report in declaration order; the non-reader between them stays silent",',
			'			"Left Right",',
			'			func() string {',
			'				tree := n("Row", []string{"k"}, none,',
			'					n("Left", none, []string{"k"}),',
			'					n("Middle", none, none),',
			'					n("Right", none, []string{"k"}))',
			'				return fmtNames(Write(tree, "k"))',
			'			}},',
			'		{"a binding write resolves to the OWNER\'s state: Settings re-evaluates; the row that only passes $notifsOn does not",',
			'			"Settings",',
			'			func() string { return fmtNames(WriteBinding(mkSettings(), "ToggleRow", "isOn")) }},',
			'		{"writing the state directly gives the same wave — the binding was never a separate source of truth",',
			'			"Settings",',
			'			func() string { return fmtNames(Write(mkSettings(), "notifsOn")) }},',
			'		{"a Toggle that READS its binding joins the wave under the owner\'s key, preorder",',
			'			"Settings Toggle",',
			'			func() string {',
			'				tree := nb("Settings", []string{"notifsOn"}, []string{"notifsOn"}, nil,',
			'					nb("Toggle", none, []string{"isOn"}, []Binding{{"isOn", "notifsOn"}}))',
			'				return fmtNames(WriteBinding(tree, "Toggle", "isOn"))',
			'			}},',
			'		{"structural flip of the Editor branch: draft AND the nested trayOpen die — grandchild storage goes with the branch",',
			'			"draft trayOpen",',
			'			func() string { return fmtNames(IdentitySwitch(mkCompose(), "Editor", true)) }},',
			'		{"flipping only the deeper AttachmentTray branch: trayOpen resets, the parent\'s draft SURVIVES",',
			'			"trayOpen",',
			'			func() string { return fmtNames(IdentitySwitch(mkCompose(), "AttachmentTray", true)) }},',
			'		{"modifier-only change (same identity): nothing resets — the rotate-resets-score fix in one flag",',
			'			"(none)",',
			'			func() string { return fmtNames(IdentitySwitch(mkCompose(), "Editor", false)) }},',
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
			'// Binding models one @Binding: a Local name used inside the holding',
			'// view\'s body, projecting the state Key owned elsewhere.',
			'type Binding struct {',
			'	Local string',
			'	Key   string',
			'}',
			'',
			'// View is one node of the view tree.',
			'type View struct {',
			'	Name     string',
			'	States   []string',
			'	Reads    []string',
			'	Bindings []Binding',
			'	Children []*View',
			'}',
			'',
			'// readsKey answers "does this body depend on key?" — the subscription',
			'// test. A read subscribes either directly (the body names the key) or',
			'// through one of the view\'s own bindings (reading $isOn IS reading',
			'// the owner\'s notifsOn — a binding adds a level of naming, never a',
			'// separate source of truth). Linear scans: the per-view lists are a',
			'// handful of entries, so index structures would cost more than they',
			'// save and the model stays allocation-free.',
			'func readsKey(v *View, key string) bool {',
			'	for _, r := range v.Reads {',
			'		if r == key {',
			'			return true',
			'		}',
			'		for _, b := range v.Bindings {',
			'			if b.Local == r && b.Key == key {',
			'				return true',
			'			}',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
			'// Write walks the WHOLE tree unconditionally. That is the load-bearing',
			'// difference from a render-tree invalidation: SwiftUI\'s dependency',
			'// graph is per-body, not per-subtree, so a non-reading ancestor never',
			'// shields (or drags along) its descendants. Each body answers for',
			'// itself, and appending during a preorder walk yields the pinned',
			'// order — parents before children, siblings in declaration order —',
			'// for free.',
			'func Write(root *View, key string) []string {',
			'	result := []string{}',
			'	var walk func(v *View)',
			'	walk = func(v *View) {',
			'		if readsKey(v, key) {',
			'			result = append(result, v.Name)',
			'		}',
			'		for _, c := range v.Children {',
			'			walk(c)',
			'		}',
			'	}',
			'	walk(root)',
			'	return result',
			'}',
			'',
			'// find locates a view by name, preorder. Names are unique in these',
			'// trees, so first match is THE match.',
			'func find(root *View, name string) *View {',
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
			'// WriteBinding is write-through: resolve the Local name to the owning',
			'// key, then the wave is EXACTLY Write(root, key). No special case for',
			'// the holder — that one line is the whole "binding attribution" rule,',
			'// and why the harness gets identical answers writing $isOn through',
			'// ToggleRow and writing notifsOn on Settings directly.',
			'func WriteBinding(root *View, viewName, local string) []string {',
			'	v := find(root, viewName)',
			'	if v == nil {',
			'		return []string{}',
			'	}',
			'	for _, b := range v.Bindings {',
			'		if b.Local == local {',
			'			return Write(root, b.Key)',
			'		}',
			'	}',
			'	return []string{}',
			'}',
			'',
			'// IdentitySwitch models the branch flip. Structural identity is the',
			'// path to a view — type plus position, including WHICH branch of a',
			'// conditional — and @State storage is keyed by it. A structural flip',
			'// therefore destroys every key owned inside the branch subtree (the',
			'// walk collects transitively: grandchild storage dies with the',
			'// branch), while a modifier-only change keeps the identity and thus',
			'// the storage. Keys owned OUTSIDE the subtree are simply never',
			'// visited — the parent\'s state surviving is structural, not a rule',
			'// bolted on.',
			'func IdentitySwitch(root *View, branchName string, structural bool) []string {',
			'	if !structural {',
			'		// Same position, same type, same identity: SwiftUI reuses the',
			'		// storage and merely re-renders with the new modifier value.',
			'		return []string{}',
			'	}',
			'	branch := find(root, branchName)',
			'	if branch == nil {',
			'		return []string{}',
			'	}',
			'	reset := []string{}',
			'	var walk func(v *View)',
			'	walk = func(v *View) {',
			'		reset = append(reset, v.States...)',
			'		for _, c := range v.Children {',
			'			walk(c)',
			'		}',
			'	}',
			'	walk(branch)',
			'	return reset',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Identity is the whole ballgame</h3>' +
			'<p>SwiftUI views are values — recreated wholesale on every parent ' +
			're-evaluation — so nothing about a view <em>instance</em> can anchor ' +
			'state. What persists between evaluations is the ' +
			'<strong>identity</strong>: explicit (<code>.id(...)</code>, ' +
			'<code>ForEach(items, id: \\.id)</code>) or structural (the path — type ' +
			'and position — through the tree, where <code>if/else</code> compiles ' +
			'to <code>_ConditionalContent&lt;TrueBody, FalseBody&gt;</code> and each ' +
			'generic slot is a distinct position). <code>@State</code>, ' +
			'<code>@StateObject</code>, animation state, scroll position, focus — ' +
			'all of it is a side table keyed by identity. That single fact ' +
			'explains three classic production bugs: the rotate-resets-my-state ' +
			'branch flip you modeled; <code>ForEach(items, id: \\.self)</code> over ' +
			'mutable content (edit an item and its identity changes — state gone); ' +
			'and the deliberate inverse, slapping <code>.id(attempt)</code> on a ' +
			'form to <em>force</em> a reset on retry.</p>' +
			'<h3>Reads subscribe, writes invalidate — literally</h3>' +
			'<p>Under the hood the property wrappers front an attribute graph ' +
			'(the private AttributeGraph framework). Evaluating <code>body</code> ' +
			'records which attributes were read; writing a <code>@State</code> ' +
			'marks its dependents dirty and the next transaction re-evaluates ' +
			'exactly those bodies, then <em>diffs the resulting view values</em> to ' +
			'decide what to re-render. Two consequences worth keeping: ' +
			're-evaluation is cheap and not the same thing as re-layout; and ' +
			'moving a read <em>down</em> the tree (pass a <code>Binding</code> or a ' +
			'smaller view instead of reading at screen level) shrinks the wave — ' +
			'the same read-as-late-as-possible discipline every declarative ' +
			'framework converges on.</p>' +
			'<h3>Where this model simplifies</h3>' +
			'<ul>' +
			'<li><strong>Order:</strong> the pinned preorder is a determinism ' +
			'device for the harness. Real SwiftUI re-evaluates dirty bodies in ' +
			'dependency order within a transaction and documents nothing about ' +
			'it.</li>' +
			'<li><strong>Coalescing:</strong> real writes inside one event turn ' +
			'are batched into a single transaction; this model treats each ' +
			'<code>Write</code> as its own wave.</li>' +
			'<li><strong>Parent re-evaluation recreates children:</strong> when a ' +
			'parent body re-runs it rebuilds child <em>values</em>, and SwiftUI ' +
			'diffs them — children with equal values are not re-evaluated. The ' +
			'model skips the diffing layer entirely; its wave is the set of ' +
			'subscribed readers, which is what <code>Self._printChanges()</code> ' +
			'reports.</li>' +
			'<li><strong><code>@StateObject</code> follows the same identity ' +
			'rule</strong> — same lifetime, same branch-flip destruction — while ' +
			'<code>@ObservedObject</code> owns nothing and survives nothing; ' +
			'mixing them up is the other famous state-reset bug.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n · k) — one full-tree walk per write; k is the (tiny) Reads×Bindings check per view', space: 'O(depth) recursion plus the result slice' },
	});
})();
