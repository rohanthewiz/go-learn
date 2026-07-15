/* The Widget Tree — Widgets & Reconciliation (lesson). "Everything is a
 * widget" means the UI is one recursive data structure: composition all the
 * way down to primitives. The learner writes the recursion that walks it —
 * the shape every later algorithm (rebuild, reconcile, layout) will walk too.
 */
(function () {
	'use strict';
	var T = GoLearnFlutter;

	T.lesson({
		id: 'widget-tree',
		title: 'The Widget Tree',
		nav: 'widget tree',
		category: 'Widgets & Reconciliation',

		prose: [
			'<h2>The Widget Tree</h2>' +
			'<p>Flutter has no templates, no XML, no separate layout language: the UI ' +
			'is a value — a tree of widget objects your code constructs. Padding is a ' +
			'widget wrapping one child; Column is a widget holding a list of children; ' +
			'Text is a leaf. "Everything is a widget" is less a slogan than a type ' +
			'signature:</p>',
			{ lang: 'dart', code: "Column(\n  children: [\n    Text('Hello'),\n    Container(\n      child: Button('Tap me'),\n    ),\n  ],\n)" },
			'<p>Two properties of this tree power everything that follows in this ' +
			'track. Widgets are <strong>immutable</strong> — you never mutate a Text, ' +
			'you build a new one (rebuilds are cheap object construction, not DOM ' +
			'surgery). And widgets are <strong>descriptions</strong>, not the UI ' +
			'itself: the framework diffs the new description against the old and ' +
			'mutates a longer-lived tree behind the scenes. That diffing is lessons 2 ' +
			'and 3; first, the walk.</p>' +
			'<h3>Your job</h3>' +
			'<p>The Go model gives every widget a <code>describe()</code> label and a ' +
			'<code>children()</code> list — leaves return none. Implement ' +
			'<code>renderTree</code>: print the widget\'s description at its indent ' +
			'depth (two spaces per level), then recurse into children one level ' +
			'deeper. The output should reproduce the Dart snippet\'s shape.</p>',
		],

		task: 'Implement renderTree: print each widget indented two spaces per depth, children one level deeper.',

		starter: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			'// widget is the whole interface: a label, and children. Leaves like',
			'// Text simply have none — there is no separate "leaf" concept.',
			'type widget interface {',
			'	describe() string',
			'	children() []widget',
			'}',
			'',
			'type column struct{ kids []widget }',
			'',
			'func (c column) describe() string  { return "Column" }',
			'func (c column) children() []widget { return c.kids }',
			'',
			'type container struct{ child widget }',
			'',
			'func (c container) describe() string  { return "Container" }',
			'func (c container) children() []widget { return []widget{c.child} }',
			'',
			'type text struct{ s string }',
			'',
			'func (t text) describe() string  { return "Text(\\"" + t.s + "\\")" }',
			'func (t text) children() []widget { return nil }',
			'',
			'type button struct{ label string }',
			'',
			'func (b button) describe() string  { return "Button(\\"" + b.label + "\\")" }',
			'func (b button) children() []widget { return nil }',
			'',
			'// renderTree prints w\'s subtree, two spaces of indent per depth level.',
			'func renderTree(w widget, depth int) {',
			'	// TODO: print the description at this depth, then recurse into',
			'	// each child at depth+1.',
			'	fmt.Println(strings.Repeat("  ", depth) + w.describe())',
			'}',
			'',
			'func main() {',
			'	// The Dart snippet from the lesson, as a Go value.',
			'	ui := column{kids: []widget{',
			'		text{"Hello"},',
			'		container{child: button{"Tap me"}},',
			'	}}',
			'	renderTree(ui, 0)',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.indexOf('Column\n  Text("Hello")\n  Container\n    Button("Tap me")') !== -1;
		},

		solution: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			'// widget is the whole interface: a label, and children. Leaves like',
			'// Text simply have none — there is no separate "leaf" concept.',
			'type widget interface {',
			'	describe() string',
			'	children() []widget',
			'}',
			'',
			'type column struct{ kids []widget }',
			'',
			'func (c column) describe() string  { return "Column" }',
			'func (c column) children() []widget { return c.kids }',
			'',
			'type container struct{ child widget }',
			'',
			'func (c container) describe() string  { return "Container" }',
			'func (c container) children() []widget { return []widget{c.child} }',
			'',
			'type text struct{ s string }',
			'',
			'func (t text) describe() string  { return "Text(\\"" + t.s + "\\")" }',
			'func (t text) children() []widget { return nil }',
			'',
			'type button struct{ label string }',
			'',
			'func (b button) describe() string  { return "Button(\\"" + b.label + "\\")" }',
			'func (b button) children() []widget { return nil }',
			'',
			'// renderTree prints w\'s subtree, two spaces of indent per depth level.',
			'// Depth-first, children in declaration order — the same traversal the',
			'// framework uses for building, reconciling, and painting, which is why',
			'// "order in the children list" MEANS "order on screen".',
			'func renderTree(w widget, depth int) {',
			'	fmt.Println(strings.Repeat("  ", depth) + w.describe())',
			'	for _, child := range w.children() {',
			'		renderTree(child, depth+1)',
			'	}',
			'}',
			'',
			'func main() {',
			'	// The Dart snippet from the lesson, as a Go value.',
			'	ui := column{kids: []widget{',
			'		text{"Hello"},',
			'		container{child: button{"Tap me"}},',
			'	}}',
			'	renderTree(ui, 0)',
			'}',
			'',
		].join('\n'),
	});
})();
