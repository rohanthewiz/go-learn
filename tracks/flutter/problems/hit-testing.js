/* Hit Testing — Interaction & Navigation (lesson). Why the button on top
 * gets the tap: children paint in list order, so hit testing walks them in
 * REVERSE — last painted, first asked. The learner implements the walk.
 */
(function () {
	'use strict';
	var T = GoLearnFlutter;

	T.lesson({
		id: 'hit-testing',
		title: 'Hit Testing',
		nav: 'hit testing',
		category: 'Interaction & Navigation',

		prose: [
			'<h2>Hit Testing</h2>' +
			'<p>A tap lands at a point; the framework must decide which widget owns ' +
			'it. In a <code>Stack</code>, children are painted <strong>in list ' +
			'order</strong> — later children draw on top of earlier ones:</p>',
			{ lang: 'dart', code: "Stack(children: [\n  Background(),   // painted first — bottom\n  Card(),         // painted over it\n  Button(),       // painted last — visually on top\n])" },
			'<p>So the hit test must ask <strong>in reverse paint order</strong>: the ' +
			'thing drawn last is the thing you see at that point, and the thing you ' +
			'see is the thing you meant to tap. The walk asks each child, back of the ' +
			'list first, "does this point fall inside you?" — the first yes wins and ' +
			'the ones underneath never hear about the tap.</p>' +
			'<p>This one rule explains the everyday mysteries: an invisible ' +
			'full-screen <code>Container</code> layered above your UI eats every ' +
			'tap; a <code>Positioned</code> child that drifted outside its parent\'s ' +
			'bounds stops being tappable (the parent\'s hit test says no before the ' +
			'child is even asked); and <code>IgnorePointer</code> works by simply ' +
			'answering "no" on behalf of its subtree.</p>' +
			'<h3>Your job</h3>' +
			'<p>The model flattens one Stack: each child covers a horizontal range ' +
			'<code>[lo, hi]</code>. Implement <code>hitTest</code>: walk the children ' +
			'in <em>reverse</em>, return the first whose range contains <code>x</code> ' +
			'— or <code>"nothing"</code>. The buggy version walks forward, which ' +
			'awards every tap to the background.</p>',
		],

		task: 'Implement hitTest: reverse paint order, first child containing x wins.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// child is one Stack child, in PAINT order: index 0 is painted first',
			'// (bottom), the last index is painted last (top). [lo, hi] is the',
			'// horizontal span it covers.',
			'type child struct {',
			'	name   string',
			'	lo, hi int',
			'}',
			'',
			'// hitTest finds the child that owns a tap at x.',
			'func hitTest(children []child, x int) string {',
			'	// TODO: the topmost child is the LAST painted — walk in reverse.',
			'	// This forward walk hands every tap to the background.',
			'	for _, c := range children {',
			'		if x >= c.lo && x <= c.hi {',
			'			return c.name',
			'		}',
			'	}',
			'	return "nothing"',
			'}',
			'',
			'func main() {',
			'	// The Stack from the lesson: Background under Card under Button.',
			'	stack := []child{',
			'		{"Background", 0, 300},',
			'		{"Card", 20, 120},',
			'		{"Button", 40, 80},',
			'	}',
			'	for _, x := range []int{50, 100, 200, 400} {',
			'		fmt.Printf("tap at %d hits: %s\\n", x, hitTest(stack, x))',
			'	}',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('tap at 50 hits: Button') !== -1 &&
				flat.indexOf('tap at 100 hits: Card') !== -1 &&
				flat.indexOf('tap at 200 hits: Background') !== -1 &&
				flat.indexOf('tap at 400 hits: nothing') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// child is one Stack child, in PAINT order: index 0 is painted first',
			'// (bottom), the last index is painted last (top). [lo, hi] is the',
			'// horizontal span it covers.',
			'type child struct {',
			'	name   string',
			'	lo, hi int',
			'}',
			'',
			'// hitTest finds the child that owns a tap at x: reverse paint order,',
			'// first containing child wins. Walking the same list both ways is the',
			'// elegant part — one ordering serves painting and hit testing, they',
			'// just consume it from opposite ends, and that symmetry is what keeps',
			'// "what you see" and "what you tap" the same thing.',
			'func hitTest(children []child, x int) string {',
			'	for i := len(children) - 1; i >= 0; i-- {',
			'		c := children[i]',
			'		if x >= c.lo && x <= c.hi {',
			'			return c.name',
			'		}',
			'	}',
			'	return "nothing"',
			'}',
			'',
			'func main() {',
			'	// The Stack from the lesson: Background under Card under Button.',
			'	stack := []child{',
			'		{"Background", 0, 300},',
			'		{"Card", 20, 120},',
			'		{"Button", 40, 80},',
			'	}',
			'	for _, x := range []int{50, 100, 200, 400} {',
			'		fmt.Printf("tap at %d hits: %s\\n", x, hitTest(stack, x))',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
