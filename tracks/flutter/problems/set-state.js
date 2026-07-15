/* setState & Dirty Propagation — State & Rebuilds (Medium). setState does
 * almost nothing: it marks ONE element dirty. The next frame rebuilds dirty
 * elements and, because build() re-creates child widgets, their whole
 * subtrees. Implementing the frame's walk shows exactly what a setState
 * costs — and what it never touches.
 */
(function () {
	'use strict';
	var T = GoLearnFlutter;

	T.problem({
		id: 'set-state',
		title: 'setState & Dirty Propagation',
		nav: 'setState',
		difficulty: 'Medium',
		category: 'State & Rebuilds',
		task: 'Implement RebuildPass: a node rebuilds if it is dirty or any ancestor rebuilt; clean subtrees are skipped. All 6 tests.',

		prose: [
			'<h2><code>setState</code> &amp; Dirty Propagation</h2>' +
			'<p>Coming from an immediate-mode intuition (or a server-rendered one), ' +
			'<code>setState</code> looks like it "re-renders the app". It does ' +
			'something far smaller:</p>',
			{ lang: 'dart', code: 'setState(() { count++; });\n// 1. runs your mutation\n// 2. marks THIS element dirty\n// 3. schedules a frame — that\'s all' },
			'<p>When the frame arrives, the framework walks the element tree from the ' +
			'top in depth-first order and rebuilds two kinds of node:</p>' +
			'<ul>' +
			'<li>nodes marked <strong>dirty</strong> — their <code>build()</code> is ' +
			'called again;</li>' +
			'<li>nodes whose <strong>ancestor rebuilt</strong> — because that ' +
			'ancestor\'s <code>build()</code> just constructed new child widgets, and ' +
			'each child element must absorb its new widget (the canUpdate machinery ' +
			'from earlier).</li>' +
			'</ul>' +
			'<p>Everything else — clean subtrees under clean ancestors — is not ' +
			'visited at all. This is why "put setState as low in the tree as ' +
			'possible" is real advice: dirtying a leaf rebuilds a leaf; dirtying the ' +
			'scaffold rebuilds the world.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>RebuildPass(children, root, dirty)</code>: walk the ' +
			'tree depth-first (children in declared order) and return the nodes that ' +
			'rebuild, in visit order. A node rebuilds when it is in the dirty set or ' +
			'any ancestor on the path rebuilt; each rebuilt node appears once, even ' +
			'if it was dirty <em>and</em> under a rebuilt ancestor.</p>',
		],

		starter: [
			'package main',
			'',
			'// RebuildPass runs one frame\'s build phase.',
			'//   children — node -> child nodes, in declared order (leaves absent)',
			'//   root     — the tree\'s root element',
			'//   dirty    — the elements setState marked since last frame',
			'// Returns every node whose build() runs, in depth-first visit order.',
			'// A node rebuilds if it is dirty OR any ancestor rebuilt; everything',
			'// else keeps last frame\'s widgets untouched.',
			'func RebuildPass(children map[string][]string, root string, dirty []string) []string {',
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
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// App ─ Scaffold ─ [Header ─ Title, Body ─ [Counter ─ Label, List]]',
			'	tree := map[string][]string{',
			'		"App":      {"Scaffold"},',
			'		"Scaffold": {"Header", "Body"},',
			'		"Header":   {"Title"},',
			'		"Body":     {"Counter", "List"},',
			'		"Counter":  {"Label"},',
			'	}',
			'',
			'	type tc struct {',
			'		name  string',
			'		dirty []string',
			'		want  []string',
			'	}',
			'	cases := []tc{',
			'		{"clean frame: nothing rebuilds",',
			'			[]string{}, []string{}},',
			'		{"setState on a leaf rebuilds just the leaf",',
			'			[]string{"Label"}, []string{"Label"}},',
			'		{"setState on Counter carries its subtree",',
			'			[]string{"Counter"}, []string{"Counter", "Label"}},',
			'		{"setState at the top rebuilds everything",',
			'			[]string{"App"},',
			'			[]string{"App", "Scaffold", "Header", "Title", "Body", "Counter", "Label", "List"}},',
			'		{"dirty child under a dirty ancestor rebuilds once",',
			'			[]string{"Body", "Label"},',
			'			[]string{"Body", "Counter", "Label", "List"}},',
			'		{"two dirty siblings, tree order — Header\'s subtree stays clean",',
			'			[]string{"List", "Counter"},',
			'			[]string{"Counter", "Label", "List"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%s: dirty=%v", c.name, c.dirty),',
			'			"want":  fmt.Sprint(c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := RebuildPass(tree, "App", append([]string(nil), c.dirty...))',
			'			r["pass"] = fmt.Sprint(got) == fmt.Sprint(c.want)',
			'			r["got"] = fmt.Sprint(got)',
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
			'// RebuildPass runs one frame\'s build phase: depth-first, carrying one',
			'// bit of context down the recursion — "did someone above me rebuild?".',
			'//',
			'// That bit is the entire propagation model. It only ever turns on',
			'// (an ancestor\'s build re-creates ALL its child widgets, so the',
			'// rebuild can\'t skip a child), and appending before recursing gives',
			'// parents-before-children order — the order real build() calls nest.',
			'func RebuildPass(children map[string][]string, root string, dirty []string) []string {',
			'	dirtySet := map[string]bool{}',
			'	for _, d := range dirty {',
			'		dirtySet[d] = true',
			'	}',
			'',
			'	rebuilt := []string{}',
			'	var walk func(node string, ancestorRebuilt bool)',
			'	walk = func(node string, ancestorRebuilt bool) {',
			'		rebuilding := ancestorRebuilt || dirtySet[node]',
			'		if rebuilding {',
			'			rebuilt = append(rebuilt, node)',
			'		}',
			'		for _, child := range children[node] {',
			'			walk(child, rebuilding)',
			'		}',
			'	}',
			'	walk(root, false)',
			'	return rebuilt',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>One boolean, threaded down</h3>' +
			'<p>The whole algorithm is <code>rebuilding = ancestorRebuilt || ' +
			'dirty[node]</code>. It cannot turn off on the way down — once an ' +
			'ancestor rebuilds, every descendant receives a brand-new widget object ' +
			'and must at least absorb it. The dedupe in test 5 falls out for free: ' +
			'<code>Label</code> is dirty <em>and</em> under rebuilt ' +
			'<code>Body</code>, but it is visited once, so it is appended once.</p>' +
			'<h3>Why rebuilds are affordable anyway</h3>' +
			'<p>"Rebuild the whole subtree" sounds expensive until you remember what ' +
			'a rebuild produces: widgets — small immutable descriptions. The ' +
			'expensive trees (render objects, with their layout and paint data) are ' +
			'only <em>updated in place</em> where the new description differs. And ' +
			'no build() runs anywhere in test 6\'s Header subtree. (The real ' +
			'framework doesn\'t even walk to find dirty nodes — setState appends to ' +
			'a dirty <em>list</em>, sorted by depth and processed directly; the walk ' +
			'here makes the ancestor rule visible.) Two real-world levers shrink the ' +
			'rebuilt set further: pushing setState into small leaf widgets, and ' +
			'<code>const</code> child widgets — which the next lesson gives its own ' +
			'stop condition.</p>' +
			'<h3>What setState never does</h3>' +
			'<p>It doesn\'t rebuild parents (the dirty bit propagates down, never ' +
			'up), it doesn\'t rebuild synchronously (mutations batch until the next ' +
			'frame), and calling it three times in a row schedules one frame, not ' +
			'three. All three facts are visible in this model: the mutation and the ' +
			'walk are separate phases connected only by the dirty set.</p>',
		],
		complexity: { time: 'O(visited) — clean subtrees under clean ancestors are pruned', space: 'O(depth) recursion + the dirty set' },
	});
})();
