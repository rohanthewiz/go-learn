/* InheritedWidget — Context & Theming (lesson). How Theme.of(context) finds
 * its value: walk UP the element tree, nearest provider wins. The learner
 * implements the walk — and with it, scoped theming and the reason
 * "context" is just a position in the tree.
 */
(function () {
	'use strict';
	var T = GoLearnFlutter;

	T.lesson({
		id: 'inherited-widget',
		title: 'InheritedWidget & Theme.of',
		nav: 'InheritedWidget',
		category: 'Context & Theming',

		prose: [
			'<h2>InheritedWidget &amp; <code>Theme.of</code></h2>' +
			'<p>Passing the theme, the locale, and the current user down through ' +
			'fifteen constructors is the "prop drilling" tax. Flutter\'s escape is ' +
			'the <code>InheritedWidget</code>: park a value at some node, and any ' +
			'descendant can reach it through its <code>BuildContext</code>:</p>',
			{ lang: 'dart', code: "Theme(\n  data: ThemeData.light(),          // provided here\n  child: ...deep tree...\n    Builder(builder: (context) {\n      final t = Theme.of(context);  // found from here\n      return Text(style: t.textTheme.body, ...);\n    }),\n)" },
			'<p>The mechanism is refreshingly literal. A <code>BuildContext</code> ' +
			'<em>is</em> the widget\'s element — its position in the tree. ' +
			'<code>Theme.of(context)</code> walks from that position <strong>upward, ' +
			'parent by parent</strong>, and returns the first Theme it meets. Nearest ' +
			'wins, which is what makes theming <em>scoped</em>: wrap one subtree in a ' +
			'dark Theme and only that subtree changes, because its widgets find the ' +
			'dark provider before the light one above it.</p>' +
			'<p>(The real thing adds one optimization worth knowing about: elements ' +
			'register as dependents of the provider they found via an O(1) hashmap ' +
			'lookup, so when the Theme\'s value changes, exactly the widgets that ' +
			'used it rebuild — this walk plus the setState machinery from earlier.)</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>themeOf</code>. Each node has a parent pointer and, ' +
			'if it is a provider, a non-empty <code>theme</code>. The buggy version ' +
			'jumps straight to the root — the "themes are global" misconception. ' +
			'Walk instead: from the node upward, first provider wins. ' +
			'<code>Button</code> sits under the dark section; <code>Sidebar</code> ' +
			'does not.</p>',
		],

		task: 'Implement themeOf: walk parent pointers upward from the node; the NEAREST provider wins.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// node is an element: a position in the tree (the parent pointer is',
			'// what BuildContext really gives you). Providers carry a theme.',
			'type node struct {',
			'	name   string',
			'	parent *node',
			'	theme  string // "" = not a provider',
			'}',
			'',
			'// themeOf is Theme.of(context): resolve the theme visible at n.',
			'func themeOf(n *node) string {',
			'	// TODO: walk UP from n via parent, returning the FIRST non-empty',
			'	// theme met. This version teleports to the root — that\'s the',
			'	// "themes are global" bug: scoped overrides never apply.',
			'	root := n',
			'	for root.parent != nil {',
			'		root = root.parent',
			'	}',
			'	return root.theme',
			'}',
			'',
			'func main() {',
			'	// App(light) ─ Page ─ [Section(dark) ─ Button, Sidebar]',
			'	app := &node{name: "App", theme: "light"}',
			'	page := &node{name: "Page", parent: app}',
			'	section := &node{name: "Section", parent: page, theme: "dark"}',
			'	button := &node{name: "Button", parent: section}',
			'	sidebar := &node{name: "Sidebar", parent: page}',
			'',
			'	fmt.Println("Theme.of(Button) ->", themeOf(button))',
			'	fmt.Println("Theme.of(Sidebar) ->", themeOf(sidebar))',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('Theme.of(Button) -> dark') !== -1 &&
				flat.indexOf('Theme.of(Sidebar) -> light') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// node is an element: a position in the tree (the parent pointer is',
			'// what BuildContext really gives you). Providers carry a theme.',
			'type node struct {',
			'	name   string',
			'	parent *node',
			'	theme  string // "" = not a provider',
			'}',
			'',
			'// themeOf is Theme.of(context): from the asking element, up the',
			'// parent chain, first provider wins. Nearest-wins is the entire',
			'// scoping model — an override is just a provider standing between',
			'// you and the outer one, shadowing it exactly like an inner variable',
			'// shadows an outer.',
			'func themeOf(n *node) string {',
			'	for cur := n; cur != nil; cur = cur.parent {',
			'		if cur.theme != "" {',
			'			return cur.theme',
			'		}',
			'	}',
			'	return "no Theme found in context" // Theme.of throws a helpful error',
			'}',
			'',
			'func main() {',
			'	// App(light) ─ Page ─ [Section(dark) ─ Button, Sidebar]',
			'	app := &node{name: "App", theme: "light"}',
			'	page := &node{name: "Page", parent: app}',
			'	section := &node{name: "Section", parent: page, theme: "dark"}',
			'	button := &node{name: "Button", parent: section}',
			'	sidebar := &node{name: "Sidebar", parent: page}',
			'',
			'	fmt.Println("Theme.of(Button) ->", themeOf(button))',
			'	fmt.Println("Theme.of(Sidebar) ->", themeOf(sidebar))',
			'}',
			'',
		].join('\n'),
	});
})();
