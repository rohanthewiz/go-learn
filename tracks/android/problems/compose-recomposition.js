/* Compose Recomposition — UI: Lists, Compose & Layout (Hard). The
 * invalidation model behind Jetpack Compose: reads subscribe a scope to a
 * state object, writes invalidate exactly the subscribed scopes, and a
 * recomposing parent SKIPS a stable child whose parameters did not change.
 * The harness pins the two canonical Layout Inspector cases — a leaf
 * reading state recomposes alone, an unstable parameter drags a whole
 * subtree along — plus the skip-prunes-the-subtree rule of this model.
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// One Write("count") through a small tree: the reader recomposes, the
	// stable-unchanged child is skipped (its subtree never visited), the
	// unstable child rides along. Marker id namespaced (dgArrowAndCR)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 216" width="520" height="216" role="img" aria-label="writing count recomposes the Screen that reads it; its stable child with unchanged params is skipped along with its subtree; its unstable child recomposes too">' +
		'<text x="20" y="22" class="lbl">Write("count"): reads recompose · stable + unchanged params is skipped · unstable rides along</text>' +
		// root
		'<rect x="195" y="34" width="130" height="30" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="260" y="54" text-anchor="middle">Screen</text>' +
		'<text x="333" y="54" class="lbl" style="fill:var(--accent)">reads count → recomposes</text>' +
		// edges to children
		'<path d="M 240 66 L 100 100" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndCR)"/>' +
		'<path d="M 260 66 L 260 100" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="4 4"/>' +
		'<path d="M 280 66 L 420 100" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndCR)"/>' +
		// children row
		'<rect x="30" y="104" width="130" height="30" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="95" y="124" text-anchor="middle">CountLabel</text>' +
		'<text x="95" y="152" text-anchor="middle" class="lbl" style="fill:var(--accent)">param count changed</text>' +
		'<rect x="200" y="104" width="120" height="30" rx="6" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<text x="260" y="124" text-anchor="middle">Header</text>' +
		'<text x="260" y="152" text-anchor="middle" class="lbl">SKIPPED: stable, params same</text>' +
		'<rect x="360" y="104" width="130" height="30" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="425" y="124" text-anchor="middle">ItemsList</text>' +
		'<text x="425" y="152" text-anchor="middle" class="lbl" style="fill:var(--warn)">unstable → recomposes</text>' +
		// pruned grandchild under the skipped Header
		'<path d="M 260 158 L 260 176" stroke="var(--muted)" stroke-width="1.2" stroke-dasharray="3 4"/>' +
		'<rect x="200" y="178" width="120" height="28" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="3 4"/>' +
		'<text x="260" y="197" text-anchor="middle" class="lbl">Logo</text>' +
		'<text x="330" y="197" class="lbl">never visited — pruned with its skipped parent</text>' +
		'<defs><marker id="dgArrowAndCR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'compose-recomposition',
		title: 'Compose: Reads Subscribe, Writes Invalidate',
		nav: 'recomposition',
		difficulty: 'Hard',
		category: 'UI: Lists, Compose & Layout',
		task: 'Implement Write(root, key): return, in top-down tree order, the composables that recompose — direct readers, changed-param children, unstable children — while skipped subtrees are pruned.',

		prose: [
			'<h2>Compose: Reads Subscribe, Writes Invalidate</h2>' +
			'<p>The bug report says “typing in the search box is janky”, and Layout ' +
			'Inspector’s recomposition-count column shows why: every keystroke ' +
			'recomposes the <em>entire</em> screen — toolbar, tab row, a 200-item ' +
			'list — instead of the one <code>Text</code> showing the query. Compose ' +
			'never re-renders “the screen”; it re-executes exactly the composable ' +
			'functions that were <strong>invalidated</strong>, and the rules for who ' +
			'gets invalidated are mechanical:</p>',
			{ lang: 'kotlin', code: '@Composable\nfun SearchScreen(vm: SearchViewModel) {\n    val query by vm.query.collectAsState()   // READ: this scope subscribes to query\n    Column {\n        SearchBar(query)          // param changed  -> recomposes\n        FilterRow()               // stable, params unchanged -> SKIPPED\n        Results(items = vm.items) // List<Item> is unstable   -> recomposes every time\n    }\n}\n\n// Layout Inspector, after typing "kotlin" (6 keystrokes):\n//   SearchScreen   6 recompositions\n//   SearchBar      6\n//   FilterRow      0   <- skipped: same params, stable\n//   Results        6   <- dragged along: unstable parameter type' },
			'<p>Under the hood, reading a <code>State</code> object during ' +
			'composition records a subscription: <em>this recomposition scope read ' +
			'this state</em>. Writing the state invalidates the subscribed scopes ' +
			'and schedules them for the next frame. When an invalidated scope ' +
			're-executes, each child call site is checked: can it be ' +
			'<strong>skipped</strong>?</p>' +
			'<ul>' +
			'<li>A composable <strong>recomposes</strong> if it <strong>reads</strong> ' +
			'the written key directly — no matter where it sits in the tree.</li>' +
			'<li>A child of a recomposing parent recomposes if the key is one of its ' +
			'<strong>parameters</strong> (its arguments changed), or if it is ' +
			'<strong>not stable</strong> (the compiler cannot prove its arguments ' +
			'comparable, so it must be re-run defensively).</li>' +
			'<li>Otherwise the child is <strong>skipped</strong> — and in this model ' +
			'a skipped subtree is pruned wholesale: none of its descendants are ' +
			'visited at all.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Write(root, key)</code> over the modeled tree: return ' +
			'the names of the composables that recompose, in top-down (preorder) ' +
			'tree order. A node not recomposing merely because its ancestors did not ' +
			'recompose is still <em>visited</em> — a reader further down must fire. ' +
			'Only a genuine skip (recomposing parent, stable child, params ' +
			'unchanged, no read) prunes the subtree.</p>' +
			'<div class="tip">The <code>Stable</code> flag is what the Compose ' +
			'compiler infers per call site: all parameter types stable (immutable ' +
			'data classes, primitives, lambdas without captured <code>var</code>s) ' +
			'→ the call is skippable and comparable. One <code>List</code> or ' +
			'mutable class in the signature and the compiler marks the call ' +
			'unskippable — that single flag is the difference between case 1 and ' +
			'case 5 in the harness.</div>',
		],

		starter: [
			'package main',
			'',
			'// Composable models one recomposition scope in the composition tree.',
			'//   Reads    — state keys this scope reads directly (it subscribes to them)',
			'//   Params   — state keys whose values are passed to it as parameters',
			'//   Stable   — all parameter types stable: the call site is skippable',
			'//   Children — call sites inside this scope, in source order',
			'type Composable struct {',
			'	Name     string',
			'	Reads    []string',
			'	Params   []string',
			'	Stable   bool',
			'	Children []*Composable',
			'}',
			'',
			'// Write simulates a write to the state key and returns the names of the',
			'// composables that RECOMPOSE, in top-down (preorder) tree order.',
			'//',
			'// A node recomposes when:',
			'//   (a) it reads key directly (key is in Reads), OR',
			'//   (b) its parent recomposed AND (key is in its Params OR it is not Stable).',
			'//',
			'// A node whose parent recomposed but which neither reads key, has key in',
			'// Params, nor is unstable, is SKIPPED: it does not recompose and its',
			'// whole subtree is pruned — not visited at all.',
			'//',
			'// A node whose parent did NOT recompose (and which does not read key)',
			'// simply does not recompose — but its children are still visited, so a',
			'// reader deeper in the tree fires on its own subscription.',
			'func Write(root *Composable, key string) []string {',
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
			'	// n builds one scope; children attach in source order. none keeps',
			'	// the tree literals readable.',
			'	n := func(name string, reads, params []string, stable bool, children ...*Composable) *Composable {',
			'		return &Composable{Name: name, Reads: reads, Params: params, Stable: stable, Children: children}',
			'	}',
			'	none := []string{}',
			'	fmtNames := func(names []string) string {',
			'		if len(names) == 0 {',
			'			return "(none)"',
			'		}',
			'		return strings.Join(names, " ")',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"a leaf reads count directly: only that leaf recomposes — its parent never re-executes",',
			'			"Counter",',
			'			func() string {',
			'				tree := n("App", none, none, true,',
			'					n("Header", none, none, true),',
			'					n("Counter", []string{"count"}, none, true))',
			'				return fmtNames(Write(tree, "count"))',
			'			}},',
			'		{"a key nobody reads: writing it recomposes nothing at all",',
			'			"(none)",',
			'			func() string {',
			'				tree := n("App", none, none, true,',
			'					n("Header", none, none, true),',
			'					n("Counter", []string{"count"}, none, true))',
			'				return fmtNames(Write(tree, "theme"))',
			'			}},',
			'		{"recomposing parent, stable children: the child whose param changed recomposes, the other is SKIPPED",',
			'			"Screen SearchBar",',
			'			func() string {',
			'				tree := n("Screen", []string{"query"}, none, true,',
			'					n("SearchBar", none, []string{"query"}, true),',
			'					n("ResultsHeader", none, none, true))',
			'				return fmtNames(Write(tree, "query"))',
			'			}},',
			'		{"an unstable child recomposes whenever its parent does — even though none of its params changed",',
			'			"Screen Toolbar",',
			'			func() string {',
			'				tree := n("Screen", []string{"count"}, none, true,',
			'					n("Toolbar", none, none, false,',
			'						n("Title", none, none, true)))',
			'				return fmtNames(Write(tree, "count"))',
			'			}},',
			'		{"instability is transitive: an unstable chain re-executes top to bottom on every parent invalidation",',
			'			"Screen A B C",',
			'			func() string {',
			'				tree := n("Screen", []string{"x"}, none, true,',
			'					n("A", none, none, false,',
			'						n("B", none, none, false,',
			'							n("C", none, none, false))))',
			'				return fmtNames(Write(tree, "x"))',
			'			}},',
			'		{"a skipped subtree is pruned wholesale: the reader under a skipped stable Card never runs (this model\'s pin)",',
			'			"Parent",',
			'			func() string {',
			'				tree := n("Parent", []string{"k"}, none, true,',
			'					n("Card", none, none, true,',
			'						n("Label", []string{"k"}, none, true)))',
			'				return fmtNames(Write(tree, "k"))',
			'			}},',
			'		{"the same deep reader fires fine when its ancestors simply did not recompose — nothing above it was skipped",',
			'			"Label",',
			'			func() string {',
			'				tree := n("Root", none, none, true,',
			'					n("Card", none, none, true,',
			'						n("Label", []string{"k"}, none, true)))',
			'				return fmtNames(Write(tree, "k"))',
			'			}},',
			'		{"mixed siblings under a recomposing parent, reported in top-down (preorder) tree order",',
			'			"Profile Avatar Actions Follow",',
			'			func() string {',
			'				tree := n("Profile", []string{"user"}, none, true,',
			'					n("Avatar", none, []string{"user"}, true),',
			'					n("Bio", none, none, true),',
			'					n("Actions", none, none, false,',
			'						n("Follow", none, []string{"user"}, true)))',
			'				return fmtNames(Write(tree, "user"))',
			'			}},',
			'		{"two sibling readers both subscribe: both recompose, in tree order, without touching their parent",',
			'			"Left Right",',
			'			func() string {',
			'				tree := n("Row", none, none, true,',
			'					n("Left", []string{"k"}, none, true),',
			'					n("Right", []string{"k"}, none, true))',
			'				return fmtNames(Write(tree, "k"))',
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
			'// Composable models one recomposition scope in the composition tree.',
			'type Composable struct {',
			'	Name     string',
			'	Reads    []string',
			'	Params   []string',
			'	Stable   bool',
			'	Children []*Composable',
			'}',
			'',
			'// has is a linear membership test. The key sets here are tiny (a scope',
			'// reads a handful of state objects), so a map would cost more to build',
			'// than it saves — and slices keep the model allocation-free.',
			'func has(list []string, key string) bool {',
			'	for _, s := range list {',
			'		if s == key {',
			'			return true',
			'		}',
			'	}',
			'	return false',
			'}',
			'',
			'// Write walks the tree once, top-down, carrying one bit of context:',
			'// did my parent recompose? That single bit is enough because the',
			'// three rules only ever look one level up:',
			'//',
			'//   recomposes = reads(key)                        // own subscription',
			'//              || parentRecomposed && paramChanged // new arguments',
			'//              || parentRecomposed && !Stable      // can\'t compare args',
			'//',
			'// The subtle part is the difference between "not recomposing" and',
			'// "skipped". A node whose parent did NOT recompose is merely inert —',
			'// its children still get visited, because a deeper scope may hold its',
			'// own subscription (that is why a leaf reading count recomposes alone).',
			'// A node whose parent DID recompose and which passes the skip test is',
			'// pruned: the parent re-executed, reached this call site, compared the',
			'// arguments, found them equal-and-comparable, and jumped over the call',
			'// entirely — so in this model nothing below it runs.',
			'func Write(root *Composable, key string) []string {',
			'	result := []string{}',
			'	var walk func(node *Composable, parentRecomposed bool)',
			'	walk = func(node *Composable, parentRecomposed bool) {',
			'		reads := has(node.Reads, key)',
			'		paramChanged := has(node.Params, key)',
			'		recomposes := reads || (parentRecomposed && (paramChanged || !node.Stable))',
			'		if parentRecomposed && !recomposes {',
			'			// SKIPPED: stable, arguments unchanged, no own read.',
			'			// Pruning here — before touching Children — is the whole',
			'			// optimization: the cost of a skip is one comparison, not',
			'			// a subtree walk.',
			'			return',
			'		}',
			'		if recomposes {',
			'			// Appending during a preorder walk yields top-down tree',
			'			// order for free — parents before children, siblings in',
			'			// source order.',
			'			result = append(result, node.Name)',
			'		}',
			'		for _, child := range node.Children {',
			'			walk(child, recomposes)',
			'		}',
			'	}',
			'	// The root has no parent, so only its own reads can start a wave.',
			'	walk(root, false)',
			'	return result',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Where each rule comes from</h3>' +
			'<p>Reads-subscribe is Compose’s snapshot state system: ' +
			'<code>State&lt;T&gt;.value</code> read during composition registers the ' +
			'current <em>recomposition scope</em> (roughly: the nearest enclosing ' +
			'non-inline composable) as an observer. Writes go through the snapshot ' +
			'apply and invalidate exactly the registered scopes. Skipping is the ' +
			'Compose <em>compiler’s</em> contribution: for every call site with all-' +
			'stable parameter types it emits an equality check against the ' +
			'remembered previous arguments and jumps over the call when they match. ' +
			'Both halves are mechanical — which is why the Layout Inspector counts ' +
			'are diagnosable rather than mysterious.</p>' +
			'<h3>The bugs this explains</h3>' +
			'<ul>' +
			'<li><strong>“The whole screen recomposes on every keystroke.”</strong> ' +
			'Usually a state read hoisted too high: the screen-level composable reads ' +
			'<code>query</code>, so the screen-level scope is the subscriber. Read ' +
			'state as late (as deep) as possible — pass a lambda ' +
			'(<code>{ vm.query }</code>) down and read inside the leaf, and only the ' +
			'leaf’s scope subscribes.</li>' +
			'<li><strong>“I passed the same list and it still recomposed.”</strong> ' +
			'<code>List&lt;T&gt;</code> is unstable — the compiler cannot prove ' +
			'nobody mutates it, so the call is never skippable. Fixes are all ways ' +
			'of restoring provable comparability: <code>ImmutableList</code>, a ' +
			'<code>@Immutable</code>-annotated wrapper class, or the strong-skipping ' +
			'mode of newer Compose compilers, which downgrades the check to ' +
			'instance equality.</li>' +
			'<li><strong>“My lambda breaks skipping.”</strong> A lambda capturing an ' +
			'unstable value makes a fresh unequal instance each composition; ' +
			'<code>remember</code> the lambda or use method references.</li>' +
			'</ul>' +
			'<h3>Where this model simplifies</h3>' +
			'<p>Real Compose scopes subscribe <em>independently</em>: a scope that ' +
			'read a state object gets invalidated even if its parent was skipped — ' +
			'recomposition can start in the middle of a skipped region, which is ' +
			'what “donut-hole skipping” means. This model pins the simpler rule ' +
			'(a skipped subtree is pruned wholesale), which is exactly how the ' +
			'<em>compiler’s</em> skip jump behaves within one recomposition wave; ' +
			'the independent-subscription half is the reason case 7 (a deep reader ' +
			'under inert ancestors) still fires. Hold both halves and the Layout ' +
			'Inspector numbers always add up.</p>',
		],
		complexity: { time: 'O(n · k) — one pruned preorder walk; k is the (tiny) Reads/Params length per node', space: 'O(depth) recursion plus the result slice' },
	});
})();
