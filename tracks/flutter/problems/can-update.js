/* canUpdate — Widgets & Reconciliation (lesson). The one predicate behind
 * every frame's diff: an element updates in place when the new widget has
 * the same runtimeType AND the same key; otherwise it is torn down and
 * rebuilt from scratch — state and all. This is Widget.canUpdate, verbatim.
 */
(function () {
	'use strict';
	var T = GoLearnFlutter;

	T.lesson({
		id: 'can-update',
		title: 'canUpdate: Diffing Widgets',
		nav: 'canUpdate',
		category: 'Widgets & Reconciliation',

		prose: [
			'<h2><code>canUpdate</code>: Diffing Widgets</h2>' +
			'<p>Every rebuild produces a fresh widget tree — new objects, every frame. ' +
			'What makes that affordable is that the framework keeps a second, ' +
			'persistent tree (the <em>element</em> tree, which owns all the state) and ' +
			'only asks one question per position: <strong>can the existing element ' +
			'absorb the new widget, or must it die?</strong> The real answer is three ' +
			'lines in the framework source:</p>',
			{ lang: 'dart', code: 'static bool canUpdate(Widget oldWidget, Widget newWidget) {\n  return oldWidget.runtimeType == newWidget.runtimeType\n      && oldWidget.key == newWidget.key;\n}' },
			'<p>Same type and same key → the element stays, its state survives, and ' +
			'the new widget\'s configuration (text, colors, callbacks) is applied. ' +
			'Different type or different key → <em>unmount &amp; inflate</em>: the old ' +
			'element and everything below it is disposed — state gone — and a new ' +
			'subtree is built. Notice what is <em>not</em> compared: none of the ' +
			'widget\'s actual properties. Swapping <code>Text(\'a\')</code> for ' +
			'<code>Text(\'b\')</code> is an in-place update; swapping ' +
			'<code>Text(\'a\')</code> for <code>Icon(...)</code> is a demolition.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>canUpdate</code> for the model (a widget is a ' +
			'<code>runtimeType</code> plus an optional <code>key</code>), and the four ' +
			'transitions below will report their fate. Two keyed <code>Text</code>s ' +
			'with different keys must replace — that "or must it die" lever is exactly ' +
			'what the next lesson pulls on purpose.</p>',
		],

		task: 'Implement canUpdate: same runtimeType AND same key → update in place; anything else → unmount & inflate.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// widgetDesc is what canUpdate sees: the type and the key — never the',
			'// widget\'s actual properties.',
			'type widgetDesc struct {',
			'	runtimeType string',
			'	key         string // "" = no key',
			'}',
			'',
			'// canUpdate is Widget.canUpdate: may the existing element absorb the',
			'// new widget?',
			'func canUpdate(oldW, newW widgetDesc) bool {',
			'	// TODO: same runtimeType AND same key.',
			'	return true',
			'}',
			'',
			'func label(w widgetDesc) string {',
			'	if w.key != "" {',
			'		return w.runtimeType + "#" + w.key',
			'	}',
			'	return w.runtimeType',
			'}',
			'',
			'func main() {',
			'	transitions := []struct{ oldW, newW widgetDesc }{',
			'		{widgetDesc{"Text", ""}, widgetDesc{"Text", ""}},',
			'		{widgetDesc{"Text", ""}, widgetDesc{"Button", ""}},',
			'		{widgetDesc{"Text", "a"}, widgetDesc{"Text", "a"}},',
			'		{widgetDesc{"Text", "a"}, widgetDesc{"Text", "b"}},',
			'	}',
			'	for _, tr := range transitions {',
			'		verdict := "unmount & inflate"',
			'		if canUpdate(tr.oldW, tr.newW) {',
			'			verdict = "update in place"',
			'		}',
			'		fmt.Printf("%s -> %s: %s\\n", label(tr.oldW), label(tr.newW), verdict)',
			'	}',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('Text -> Text: update in place') !== -1 &&
				flat.indexOf('Text -> Button: unmount & inflate') !== -1 &&
				flat.indexOf('Text#a -> Text#a: update in place') !== -1 &&
				flat.indexOf('Text#a -> Text#b: unmount & inflate') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// widgetDesc is what canUpdate sees: the type and the key — never the',
			'// widget\'s actual properties.',
			'type widgetDesc struct {',
			'	runtimeType string',
			'	key         string // "" = no key',
			'}',
			'',
			'// canUpdate is Widget.canUpdate: may the existing element absorb the',
			'// new widget? Properties are deliberately not compared — applying a',
			'// changed property IS what "update in place" does, cheaply. The check',
			'// only protects the things an update can\'t change: the element\'s',
			'// class (type) and its identity (key).',
			'func canUpdate(oldW, newW widgetDesc) bool {',
			'	return oldW.runtimeType == newW.runtimeType && oldW.key == newW.key',
			'}',
			'',
			'func label(w widgetDesc) string {',
			'	if w.key != "" {',
			'		return w.runtimeType + "#" + w.key',
			'	}',
			'	return w.runtimeType',
			'}',
			'',
			'func main() {',
			'	transitions := []struct{ oldW, newW widgetDesc }{',
			'		{widgetDesc{"Text", ""}, widgetDesc{"Text", ""}},',
			'		{widgetDesc{"Text", ""}, widgetDesc{"Button", ""}},',
			'		{widgetDesc{"Text", "a"}, widgetDesc{"Text", "a"}},',
			'		{widgetDesc{"Text", "a"}, widgetDesc{"Text", "b"}},',
			'	}',
			'	for _, tr := range transitions {',
			'		verdict := "unmount & inflate"',
			'		if canUpdate(tr.oldW, tr.newW) {',
			'			verdict = "update in place"',
			'		}',
			'		fmt.Printf("%s -> %s: %s\\n", label(tr.oldW), label(tr.newW), verdict)',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
