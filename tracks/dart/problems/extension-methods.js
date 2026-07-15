/* Extension Methods — Classes & Mixins (lesson). Adding methods to types you
 * don't own — with the catch that makes or breaks real code: extensions
 * dispatch on the STATIC type. The learner fixes a resolver that wrongly
 * consults the runtime type.
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	T.lesson({
		id: 'extension-methods',
		title: 'Extension Methods',
		nav: 'extension methods',
		category: 'Classes & Mixins',

		prose: [
			'<h2>Extension Methods</h2>' +
			'<p>In Go you cannot define a method on a type from another package — you ' +
			'wrap it or write a function. Dart lets you bolt methods onto any existing ' +
			'type:</p>',
			{ lang: 'dart', code: "extension Shout on String {\n  String shout() => '${toUpperCase()}!';\n}\n\n'hi'.shout();   // HI!" },
			'<p>The crucial fine print: an extension is <strong>resolved at compile ' +
			'time, against the static type</strong>. It is syntax sugar for a function ' +
			'call, not a real method on the object — the object never knows it was ' +
			'extended. Which produces this classic surprise:</p>',
			{ lang: 'dart', code: "String s = 'hi';\ns.shout();        // HI!\n\nObject o = 'hi';  // the VALUE is still a String…\no.shout();        // error: The method 'shout' isn't defined for 'Object'.\n                  // …but the STATIC type is Object, and that's what counts" },
			'<p>Same value, different declared type, opposite outcome. (On ' +
			'<code>dynamic</code> it slips past the compiler and becomes a runtime ' +
			'<code>NoSuchMethodError</code> — extensions never dispatch dynamically.)</p>' +
			'<h3>Your job</h3>' +
			'<p>The model carries both types per value — <code>staticType</code> (what ' +
			'the declaration says) and <code>runtimeType</code> (what the value is). ' +
			'The resolver <code>callShout</code> currently judges the runtime type, ' +
			'which is exactly the mistake the analyzer never makes. Fix it to dispatch ' +
			'on the static type so <code>o.shout()</code> reports the real error.</p>',
		],

		task: "Fix callShout to dispatch on staticType: s.shout() works, o.shout() errors even though o holds a String.",

		starter: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			'// value is a receiver as the compiler sees it: the declared (static)',
			'// type it reasons with, and the runtime type the value actually has.',
			'type value struct {',
			'	expr        string // source text, for printing',
			'	staticType  string',
			'	runtimeType string',
			'	data        string',
			'}',
			'',
			'// shout is the extension body: \'${toUpperCase()}!\' — a plain function.',
			'// That is all an extension method IS, under the sugar.',
			'func shout(v value) string {',
			'	return strings.ToUpper(v.data) + "!"',
			'}',
			'',
			'// callShout is the resolver for `extension Shout on String`.',
			'func callShout(v value) string {',
			'	// TODO: extensions are STATIC dispatch. This must judge',
			'	// v.staticType — the declared type — not the runtime one.',
			'	if v.runtimeType == "String" {',
			'		return shout(v)',
			'	}',
			'	return "error: The method \'shout\' isn\'t defined for \'" + v.staticType + "\'"',
			'}',
			'',
			'func main() {',
			'	receivers := []value{',
			'		{"s", "String", "String", "hi"}, // String s = \'hi\';',
			'		{"o", "Object", "String", "hi"}, // Object o = \'hi\';  — same value!',
			'	}',
			'	for _, v := range receivers {',
			'		fmt.Printf("%s.shout() -> %s\\n", v.expr, callShout(v))',
			'	}',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('s.shout() -> HI!') !== -1 &&
				flat.indexOf("o.shout() -> error: The method 'shout' isn't defined for 'Object'") !== -1;
		},

		solution: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			'// value is a receiver as the compiler sees it: the declared (static)',
			'// type it reasons with, and the runtime type the value actually has.',
			'type value struct {',
			'	expr        string // source text, for printing',
			'	staticType  string',
			'	runtimeType string',
			'	data        string',
			'}',
			'',
			'// shout is the extension body: \'${toUpperCase()}!\' — a plain function.',
			'// That is all an extension method IS, under the sugar.',
			'func shout(v value) string {',
			'	return strings.ToUpper(v.data) + "!"',
			'}',
			'',
			'// callShout is the resolver for `extension Shout on String`.',
			'// Static dispatch: the compiler rewrites s.shout() to Shout(s).shout()',
			'// using only what it can see in the source — the declared type. The',
			'// runtime type is never consulted, which is why upcasting a value',
			'// makes its extensions vanish.',
			'func callShout(v value) string {',
			'	if v.staticType == "String" {',
			'		return shout(v)',
			'	}',
			'	return "error: The method \'shout\' isn\'t defined for \'" + v.staticType + "\'"',
			'}',
			'',
			'func main() {',
			'	receivers := []value{',
			'		{"s", "String", "String", "hi"}, // String s = \'hi\';',
			'		{"o", "Object", "String", "hi"}, // Object o = \'hi\';  — same value!',
			'	}',
			'	for _, v := range receivers {',
			'		fmt.Printf("%s.shout() -> %s\\n", v.expr, callShout(v))',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
