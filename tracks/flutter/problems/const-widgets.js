/* const Widgets — State & Rebuilds (lesson). Why linters nag you about
 * `const Text('hi')`: an identical widget instance stops the rebuild walk
 * dead — the framework sees the same object as last frame and skips the
 * whole subtree. The learner adds that stop condition to the walk.
 */
(function () {
	'use strict';
	var T = GoLearnFlutter;

	T.lesson({
		id: 'const-widgets',
		title: 'const Widgets Stop Rebuilds',
		nav: 'const widgets',
		category: 'State & Rebuilds',

		prose: [
			'<h2><code>const</code> Widgets Stop Rebuilds</h2>' +
			'<p>The previous lesson\'s rule was harsh: once an ancestor rebuilds, its ' +
			'whole subtree rebuilds, because <code>build()</code> constructed new ' +
			'child widgets and every element must absorb its new configuration. But ' +
			'there is one loophole, and the framework checks it first:</p>',
			{ lang: 'dart', code: "// inside Element.update machinery, before anything else:\nif (identical(newWidget, oldWidget)) return;   // same object? nothing to do" },
			'<p>When is the new widget the <em>same object</em> as last frame\'s? ' +
			'When it came from a <code>const</code> constructor — Dart canonicalizes ' +
			'const values (one allocation, ever), so every rebuild "constructs" the ' +
			'identical instance:</p>',
			{ lang: 'dart', code: "Column(children: [\n  const Header(),          // same instance every build → subtree skipped\n  Text('count: $count'),   // depends on state → fresh instance → rebuilds\n])" },
			'<p>An unchanged widget object <em>proves</em> the configuration is ' +
			'unchanged — immutability makes the shortcut sound. That is the whole ' +
			'reason the analyzer\'s <code>prefer_const_constructors</code> lint ' +
			'exists: each <code>const</code> in a hot build method converts a subtree ' +
			'rebuild into a pointer comparison.</p>' +
			'<h3>Your job</h3>' +
			'<p>The rebuild walk below rebuilds everything under <code>App</code>. ' +
			'Add the identical-widget stop: a child marked <code>isConst</code> ' +
			'(same instance as last frame) prints <code>skip const subtree: ' +
			'&lt;name&gt;</code> and is <em>not</em> descended into — its ' +
			'<code>Logo</code> must never print. The stateful <code>Body</code> side ' +
			'still rebuilds.</p>',
		],

		task: 'Add the stop condition: a const child is skipped (with a "skip const subtree" line) instead of rebuilt.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// node is an element whose current widget may be the identical (const)',
			'// instance the parent produced last frame.',
			'type node struct {',
			'	name    string',
			'	isConst bool',
			'	kids    []*node',
			'}',
			'',
			'// rebuild is the frame walk from the setState lesson, minus pruning.',
			'func rebuild(n *node) {',
			'	fmt.Println("build", n.name)',
			'	for _, k := range n.kids {',
			'		// TODO: identical(newWidget, oldWidget) → the const child is',
			'		// skipped: print "skip const subtree: <name>" and don\'t recurse.',
			'		rebuild(k)',
			'	}',
			'}',
			'',
			'func main() {',
			'	// App ─ [Header(const) ─ Logo, Body ─ Text]',
			'	ui := &node{name: "App", kids: []*node{',
			'		{name: "Header", isConst: true, kids: []*node{{name: "Logo"}}},',
			'		{name: "Body", kids: []*node{{name: "Text"}}},',
			'	}}',
			'	rebuild(ui) // setState ran on App: rebuild from the top',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('build App') !== -1 &&
				flat.indexOf('skip const subtree: Header') !== -1 &&
				flat.indexOf('build Logo') === -1 &&
				flat.indexOf('build Body') !== -1 &&
				flat.indexOf('build Text') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// node is an element whose current widget may be the identical (const)',
			'// instance the parent produced last frame.',
			'type node struct {',
			'	name    string',
			'	isConst bool',
			'	kids    []*node',
			'}',
			'',
			'// rebuild is the frame walk from the setState lesson, plus the one',
			'// shortcut the framework checks before all others: an identical widget',
			'// instance proves an identical configuration (widgets are immutable),',
			'// so there is nothing to absorb — the entire subtree keeps last',
			'// frame\'s result. Skipping BEFORE recursing is what makes the saving',
			'// proportional to subtree size, not O(1).',
			'func rebuild(n *node) {',
			'	fmt.Println("build", n.name)',
			'	for _, k := range n.kids {',
			'		if k.isConst {',
			'			fmt.Println("skip const subtree:", k.name)',
			'			continue',
			'		}',
			'		rebuild(k)',
			'	}',
			'}',
			'',
			'func main() {',
			'	// App ─ [Header(const) ─ Logo, Body ─ Text]',
			'	ui := &node{name: "App", kids: []*node{',
			'		{name: "Header", isConst: true, kids: []*node{{name: "Logo"}}},',
			'		{name: "Body", kids: []*node{{name: "Text"}}},',
			'	}}',
			'	rebuild(ui) // setState ran on App: rebuild from the top',
			'}',
			'',
		].join('\n'),
	});
})();
