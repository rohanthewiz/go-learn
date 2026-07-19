/* Sealed Hierarchies & when — Kotlin: Types & Null Safety (Medium). A sealed
 * class closes its subtype list at compile time, which lets `when` demand a
 * branch for every subtype — and lets adding ONE new subtype turn every
 * forgotten `when` in the codebase into a compile error. The learner
 * implements the exhaustiveness checker itself: subtree coverage, recursive
 * sealed coverage, open-subtree classes that only a direct branch can cover,
 * object formatting, and the else escape hatch.
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// The hierarchy the prose and half the harness use: a sealed UI state
	// with an object, a data-carrying class, and the branch everyone
	// forgets. Marker ids namespaced (dgArrowAndSW*) because every track's
	// SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 224" width="560" height="224" role="img" aria-label="a sealed UiState hierarchy: Loading and Success have when branches, Error does not — the compiler reports the missing is-Error branch">' +
		'<text x="20" y="24" class="lbl">sealed interface UiState — the subtype list is CLOSED, so coverage is checkable</text>' +
		'<rect x="200" y="40" width="160" height="40" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="280" y="65" text-anchor="middle">UiState (sealed)</text>' +
		'<path d="M 236 80 L 116 112" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndSW)"/>' +
		'<path d="M 280 80 L 280 112" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndSW)"/>' +
		'<path d="M 324 80 L 444 112" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowAndSWw)"/>' +
		'<rect x="40" y="116" width="150" height="40" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="115" y="136" text-anchor="middle">Loading</text>' +
		'<text x="115" y="151" text-anchor="middle" class="lbl">object — branch ✓</text>' +
		'<rect x="205" y="116" width="150" height="40" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="280" y="136" text-anchor="middle">Success</text>' +
		'<text x="280" y="151" text-anchor="middle" class="lbl">is Success — branch ✓</text>' +
		'<rect x="370" y="116" width="150" height="40" rx="6" fill="none" stroke="var(--warn)" stroke-width="2" stroke-dasharray="6 4"/>' +
		'<text x="445" y="136" text-anchor="middle">Error</text>' +
		'<text x="445" y="151" text-anchor="middle" class="lbl" style="fill:var(--warn)">no branch ✗</text>' +
		'<text x="20" y="192" class="lbl" style="fill:var(--warn)">error: \'when\' expression must be exhaustive, add necessary \'is Error\' branch</text>' +
		'<text x="20" y="212" class="lbl">add a subtype next sprint and the compiler finds every when you forgot — that is the feature</text>' +
		'<defs>' +
		'<marker id="dgArrowAndSW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowAndSWw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'sealed-when',
		title: 'Sealed Hierarchies & when Exhaustiveness',
		nav: 'sealed when',
		difficulty: 'Medium',
		category: 'Kotlin: Types & Null Safety',
		task: 'Implement the compiler\'s exhaustiveness check: MissingBranches walks a sealed hierarchy against a when\'s branch list and reports every uncovered case, in declaration order.',

		prose: [
			'<h2>Sealed Hierarchies &amp; <code>when</code> Exhaustiveness</h2>' +
			'<p>Sprint review. Product wants a “cancelled” state on the feed screen. ' +
			'You add one subtype to the UI state — and the build fails in six files, ' +
			'each one a <code>when</code> that renders, logs, or persists that state. ' +
			'This is the single best reason Android codebases model screen state as ' +
			'a sealed hierarchy:</p>',
			{ lang: 'kotlin', code: 'sealed interface UiState {\n    object Loading                     : UiState\n    data class Success(val items: List<Item>) : UiState\n    data class Error(val cause: Throwable)    : UiState\n}\n\nfun render(state: UiState) = when (state) {\n    Loading    -> showSpinner()\n    is Success -> showList(state.items)   // smart cast, previous lesson\n}\n// error: \'when\' expression must be exhaustive, add necessary\n//        \'is Error\' branch or \'else\' branch instead' },
			'<p><code>sealed</code> means the direct-subtype list is <strong>closed ' +
			'at compile time</strong> — all subtypes live in the same package and ' +
			'module, so the compiler holds the complete list. That turns ' +
			'<code>when</code> from Go\'s <code>switch</code> (where forgetting a ' +
			'case compiles silently and you add a <code>default</code> out of fear) ' +
			'into a checked pattern match. The checking rules:</p>' +
			'<ul>' +
			'<li>A branch on class <code>X</code> covers <code>X</code> <em>and its ' +
			'entire subtree</em>.</li>' +
			'<li>A <strong>sealed</strong> class is covered when all its direct ' +
			'children are covered (recursively) — you never need a branch for the ' +
			'sealed parent itself.</li>' +
			'<li>A <strong>non-sealed</strong> class with children is an open ' +
			'subtree: unknown subtypes may exist in other modules, so only a branch ' +
			'naming it directly can cover it — covering all its <em>known</em> ' +
			'children proves nothing.</li>' +
			'<li><code>else</code> covers everything — and silently opts you out of ' +
			'the next-sprint compile error, which is why style guides ban it on ' +
			'sealed subjects.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>MissingBranches(h, root, branches)</code> over the ' +
			'modeled hierarchy in the starter: return every uncovered case, in ' +
			'declaration order (depth-first over <code>Children</code>, descending ' +
			'into uncovered <em>sealed</em> children), formatted ' +
			'<code>"is X"</code> for classes and <code>"X"</code> for objects — ' +
			'matching how <code>when</code> matches them (<code>is Success</code> ' +
			'is a type test; <code>Loading</code> is an identity test against the ' +
			'singleton). <code>Exhaustive</code> is then just ' +
			'<code>len(missing) == 0</code>.</p>' +
			'<div class="tip">Branches arrive as plain subtype names ' +
			'(<code>"Loading"</code>, <code>"Success"</code>) plus the literal ' +
			'<code>"else"</code>; a <code>when</code> over a <em>non-sealed</em> ' +
			'root has no list to check against, so the only thing that can be ' +
			'missing is <code>"else"</code> itself.</div>',
		],

		starter: [
			'package main',
			'',
			'// Class is one node of the modeled type hierarchy.',
			'type Class struct {',
			'	Name     string',
			'	Sealed   bool     // sealed class/interface: direct-subtype list is closed',
			'	Object   bool     // object declaration (singleton) — matched by identity, not `is`',
			'	Children []string // direct subtypes, in declaration order',
			'}',
			'',
			'// MissingBranches is the compiler\'s exhaustiveness check for',
			'// `when (x)` where x has type root. branches holds the when\'s branch',
			'// subjects as plain names ("Loading", "Success", ...); "else" is the',
			'// literal "else". Rules:',
			'//',
			'//   - "else" present (or root itself named): nothing missing.',
			'//   - a branch on X covers X and its ENTIRE subtree.',
			'//   - a sealed class is covered when ALL its direct children are',
			'//     covered (recursively).',
			'//   - a NON-sealed class with children is an open subtree: only',
			'//     naming it directly covers it.',
			'//   - a non-sealed ROOT cannot be enumerated at all: report',
			'//     []string{"else"}.',
			'//',
			'// Report uncovered cases in declaration order, depth-first over',
			'// Children — descending into uncovered SEALED children (their own',
			'// uncovered children are the report) — formatted "is X" for classes',
			'// and "X" for objects.',
			'func MissingBranches(h map[string]Class, root string, branches []string) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Exhaustive reports whether the when compiles: nothing is missing.',
			'func Exhaustive(h map[string]Class, root string, branches []string) bool {',
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
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// The prose hierarchy: sealed UiState with an object and two classes.',
			'	ui := map[string]Class{',
			'		"UiState": {Name: "UiState", Sealed: true, Children: []string{"Loading", "Success", "Error"}},',
			'		"Loading": {Name: "Loading", Object: true},',
			'		"Success": {Name: "Success"},',
			'		"Error":   {Name: "Error"},',
			'	}',
			'	// The same hierarchy one sprint later: Cancelled added.',
			'	ui2 := map[string]Class{',
			'		"UiState":   {Name: "UiState", Sealed: true, Children: []string{"Loading", "Success", "Error", "Cancelled"}},',
			'		"Loading":   {Name: "Loading", Object: true},',
			'		"Success":   {Name: "Success"},',
			'		"Error":     {Name: "Error"},',
			'		"Cancelled": {Name: "Cancelled"},',
			'	}',
			'	// Nested sealing: Error is itself sealed with two subtypes.',
			'	nested := map[string]Class{',
			'		"UiState":      {Name: "UiState", Sealed: true, Children: []string{"Loading", "Success", "Error"}},',
			'		"Loading":      {Name: "Loading", Object: true},',
			'		"Success":      {Name: "Success"},',
			'		"Error":        {Name: "Error", Sealed: true, Children: []string{"NetworkError", "HttpError"}},',
			'		"NetworkError": {Name: "NetworkError"},',
			'		"HttpError":    {Name: "HttpError"},',
			'	}',
			'	// An OPEN subtree: Err has children but is not sealed — other',
			'	// modules may add more, so only naming Err covers it.',
			'	open := map[string]Class{',
			'		"Result":  {Name: "Result", Sealed: true, Children: []string{"Ok", "Err"}},',
			'		"Ok":      {Name: "Ok"},',
			'		"Err":     {Name: "Err", Children: []string{"Timeout"}},',
			'		"Timeout": {Name: "Timeout"},',
			'	}',
			'	// A non-sealed root: the compiler cannot enumerate it at all.',
			'	plain := map[string]Class{',
			'		"CharSequence": {Name: "CharSequence"},',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"all three subtypes covered: exhaustive, nothing missing",',
			'			"[]",',
			'			func() string { return fmt.Sprintf("%v", MissingBranches(ui, "UiState", []string{"Loading", "Success", "Error"})) }},',
			'		{"the prose\'s failing when — Kotlin\'s error: \'when\' expression must be exhaustive, add necessary \'is Error\' branch",',
			'			"[is Error]",',
			'			func() string { return fmt.Sprintf("%v", MissingBranches(ui, "UiState", []string{"Loading", "Success"})) }},',
			'		{"else covers everything — one real branch plus else is exhaustive (and opts out of future checking)",',
			'			"[]",',
			'			func() string { return fmt.Sprintf("%v", MissingBranches(ui, "UiState", []string{"Loading", "else"})) }},',
			'		{"no branches at all: every direct child reported in DECLARATION order — objects bare (Loading), classes as is-checks",',
			'			"[Loading is Success is Error]",',
			'			func() string { return fmt.Sprintf("%v", MissingBranches(ui, "UiState", nil)) }},',
			'		{"THE POINT OF SEALED: add Cancelled one sprint later and yesterday\'s exhaustive when now misses exactly that branch",',
			'			"[is Cancelled]",',
			'			func() string { return fmt.Sprintf("%v", MissingBranches(ui2, "UiState", []string{"Loading", "Success", "Error"})) }},',
			'		{"a branch on a sealed parent covers its entire subtree: is Error stands in for NetworkError and HttpError",',
			'			"[]",',
			'			func() string { return fmt.Sprintf("%v", MissingBranches(nested, "UiState", []string{"Loading", "Success", "Error"})) }},',
			'		{"nested sealing, partial coverage: Error is sealed, so the walk descends and reports ITS uncovered child",',
			'			"[is HttpError]",',
			'			func() string { return fmt.Sprintf("%v", MissingBranches(nested, "UiState", []string{"Loading", "Success", "NetworkError"})) }},',
			'		{"an OPEN subtree: covering every known child of non-sealed Err proves nothing — other modules may add more; only naming Err covers it",',
			'			"[is Err]",',
			'			func() string { return fmt.Sprintf("%v", MissingBranches(open, "Result", []string{"Ok", "Timeout"})) }},',
			'		{"naming the open class directly covers it, subtree and all",',
			'			"[]",',
			'			func() string { return fmt.Sprintf("%v", MissingBranches(open, "Result", []string{"Ok", "Err"})) }},',
			'		{"a NON-sealed root cannot be enumerated: no branch list ever suffices — only else can be missing",',
			'			"[else]",',
			'			func() string { return fmt.Sprintf("%v", MissingBranches(plain, "CharSequence", []string{"String"})) }},',
			'		{"Exhaustive is len(missing)==0: full coverage true, partial coverage false",',
			'			"true false",',
			'			func() string {',
			'				return fmt.Sprintf("%v %v",',
			'					Exhaustive(ui, "UiState", []string{"Loading", "Success", "Error"}),',
			'					Exhaustive(ui, "UiState", []string{"Loading"}))',
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
			'// Class is one node of the modeled type hierarchy.',
			'type Class struct {',
			'	Name     string',
			'	Sealed   bool     // sealed class/interface: direct-subtype list is closed',
			'	Object   bool     // object declaration (singleton) — matched by identity, not `is`',
			'	Children []string // direct subtypes, in declaration order',
			'}',
			'',
			'// covered answers "does this branch set handle every possible runtime',
			'// value of type name?" — the heart of the check. Three cases, in the',
			'// order the compiler can decide them:',
			'//',
			'//   1. named directly: a branch on X covers X and its whole subtree',
			'//      (subtype values ARE X-values; `is X` matches them all).',
			'//   2. sealed: the child list is complete, so coverage decomposes —',
			'//      X is covered iff every direct child is covered, recursively.',
			'//   3. anything else: open. Unknown subtypes may exist in other',
			'//      modules, so no enumeration of known children is a proof.',
			'func covered(h map[string]Class, name string, set map[string]bool) bool {',
			'	if set[name] {',
			'		return true',
			'	}',
			'	c, ok := h[name]',
			'	if !ok || !c.Sealed {',
			'		return false',
			'	}',
			'	for _, ch := range c.Children {',
			'		if !covered(h, ch, set) {',
			'			return false',
			'		}',
			'	}',
			'	// A sealed class with zero children is vacuously covered: sealed',
			'	// types are abstract, so no value of it can exist at runtime.',
			'	return true',
			'}',
			'',
			'// missingOf collects the uncovered cases under sealed class name, in',
			'// declaration order. An uncovered SEALED child is descended into —',
			'// its own children are the reportable cases (matching how the fix is',
			'// written: you add branches for concrete subtypes). An uncovered',
			'// open or leaf child is reported itself, formatted the way a when',
			'// branch would name it: `is X` for classes (a type test), bare `X`',
			'// for objects (an identity test against the singleton).',
			'func missingOf(h map[string]Class, name string, set map[string]bool) []string {',
			'	out := []string{}',
			'	for _, ch := range h[name].Children {',
			'		if covered(h, ch, set) {',
			'			continue',
			'		}',
			'		cc := h[ch]',
			'		if cc.Sealed {',
			'			out = append(out, missingOf(h, ch, set)...)',
			'		} else if cc.Object {',
			'			out = append(out, ch)',
			'		} else {',
			'			out = append(out, "is "+ch)',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// MissingBranches is the compiler\'s exhaustiveness check. Note the',
			'// map is only ever read through Children slices — declaration order',
			'// — never iterated directly, so the report is deterministic.',
			'func MissingBranches(h map[string]Class, root string, branches []string) []string {',
			'	set := map[string]bool{}',
			'	for _, b := range branches {',
			'		if b == "else" {',
			'			// else is the universal branch: nothing can be missing.',
			'			// It also disables the very check this function performs,',
			'			// which is why style guides ban it on sealed subjects.',
			'			return nil',
			'		}',
			'		set[b] = true',
			'	}',
			'	if set[root] {',
			'		return nil // a branch on the subject type itself covers everything',
			'	}',
			'	if !h[root].Sealed {',
			'		// An open root has no complete subtype list to check against:',
			'		// no enumeration suffices, and the only fix the compiler can',
			'		// name is the else branch.',
			'		return []string{"else"}',
			'	}',
			'	return missingOf(h, root, set)',
			'}',
			'',
			'// Exhaustive is the compile/no-compile verdict: a when compiles',
			'// exactly when nothing is missing.',
			'func Exhaustive(h map[string]Class, root string, branches []string) bool {',
			'	return len(MissingBranches(h, root, branches)) == 0',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why Android leans on this so hard</h3>' +
			'<p>The pattern you just implemented is the backbone of most modern ' +
			'Android screens: a ' +
			'<code>StateFlow&lt;UiState&gt;</code> in the ViewModel, a sealed ' +
			'<code>UiState</code>, and one exhaustive <code>when</code> in the UI ' +
			'that renders it. The value is not elegance — it is the ' +
			'<strong>Cancelled case</strong> from the harness: adding a subtype ' +
			'recompiles into an error at <em>every</em> <code>when</code> that ' +
			'must now handle it. The compiler performs the whole-codebase search ' +
			'you would otherwise do with grep and hope. Navigation results, ' +
			'network responses (<code>Success/HttpError/NetworkFailure</code>), ' +
			'Compose UI events — same shape everywhere.</p>' +
			'<ul>' +
			'<li><strong><code>else</code> is the anti-feature.</strong> It makes ' +
			'the current <code>when</code> compile and silently exempts it from ' +
			'every future check — the sprint-review scenario ships a screen that ' +
			'ignores the new state instead of failing the build. Review rule: on a ' +
			'sealed subject, spell the branches out.</li>' +
			'<li><strong>Statement vs expression.</strong> Historically only ' +
			'<code>when</code> used <em>as an expression</em> was checked; a ' +
			'<code>when</code> statement just warned. Kotlin 1.7 made non-exhaustive ' +
			'<code>when</code> over sealed subjects an error everywhere — the check ' +
			'you wrote now runs unconditionally.</li>' +
			'<li><strong>The open-subtree rule is the subtle one.</strong> A ' +
			'non-sealed class inside a sealed hierarchy reopens that subtree ' +
			'(any module can subclass it), so covering its known children proves ' +
			'nothing — only <code>is X</code> on the class itself does. That is ' +
			'also the design guidance: keep every node of a state hierarchy ' +
			'<code>sealed</code>, <code>object</code>, or <code>data</code>, or ' +
			'you quietly lose checking below that point.</li>' +
			'</ul>' +
			'<h3>The Go mirror</h3>' +
			'<p>Go\'s <code>switch v := x.(type)</code> over an interface is this ' +
			'<code>when</code> with the checker deleted: the set of ' +
			'implementations is open by design, so the compiler cannot know you ' +
			'missed one, and every such switch needs a <code>default</code> — ' +
			'exactly the <code>else</code> Kotlin style guides ban. The Go ' +
			'community\'s workaround is the same trick by hand: an unexported ' +
			'method (<code>isUiState()</code>) to close the implementation set, ' +
			'plus a linter (<code>exhaustive</code>) to simulate the check. ' +
			'Kotlin\'s <code>sealed</code> builds both into the language, and ' +
			'this problem is that builder: <code>covered</code> is the proof ' +
			'system, <code>missingOf</code> is the error message.</p>',
		],
		complexity: { time: 'O(n) over the hierarchy — each class is visited a constant number of times (memoizing covered would make the worst case linear even for deep sealed chains)', space: 'O(n) for the branch set and recursion depth' },
	});
})();
