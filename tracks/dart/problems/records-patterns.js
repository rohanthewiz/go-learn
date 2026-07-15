/* Records & Patterns — Collections & Patterns (lesson). Dart 3's records
 * are anonymous immutable tuples with STRUCTURAL equality — the property Go
 * structs only get when you define a named type and Go tuples don't get
 * because they don't exist. The learner implements that equality.
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	T.lesson({
		id: 'records-patterns',
		title: 'Records & Patterns',
		nav: 'records & patterns',
		category: 'Collections & Patterns',

		prose: [
			'<h2>Records &amp; Patterns</h2>' +
			'<p>Go functions return multiple values, but the "tuple" evaporates at the ' +
			'call site — you cannot store it, put it in a map, or compare it. Dart 3 ' +
			'records are that tuple as a real value:</p>',
			{ lang: 'dart', code: "var point = (3, 4);                  // positional fields\nvar person = (name: 'Ada', age: 36); // named fields\n\n(3, 4) == (3, 4);                    // true — structural equality\nvar (x, y) = point;                  // pattern: destructure in one line\n(x, y) = (y, x);                     // the classic swap" },
			'<p>Two things make records more than syntax. First, ' +
			'<strong>structural equality</strong>: records with the same <em>shape</em> ' +
			'(number of positional fields + set of named fields) and equal field values ' +
			'are equal — no <code>equals</code> boilerplate, and named-field order ' +
			'never matters. Second, <strong>patterns</strong> consume them: ' +
			'destructuring assignments, <code>switch</code> cases like ' +
			'<code>case (0, 0):</code>, and guards. Records in, patterns out.</p>' +
			'<h3>Your job</h3>' +
			'<p>The model represents a record as positional fields plus a named-field ' +
			'map. Implement <code>recordEquals</code>: equal shape, then equal values ' +
			'field-by-field. The named map comparison must be order-blind — ' +
			'<code>(name: Ada, age: 36)</code> equals <code>(age: 36, name: Ada)</code>.</p>' +
			'<div class="tip">Shape first is not an optimization, it is the type rule: ' +
			'<code>(3, 4)</code> and <code>(3, 4, 5)</code> are different record ' +
			'<em>types</em>, so equality between them is not even a question the ' +
			'runtime asks.</div>',
		],

		task: 'Implement recordEquals: same shape (positional count + named keys), then equal field values, order-blind for named.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// record models a Dart record: ordered positional fields plus a',
			'// name -> value map for named fields.',
			'type record struct {',
			'	pos   []string',
			'	named map[string]string',
			'}',
			'',
			'// recordEquals is Dart\'s == on records: structural, shape-sensitive.',
			'func recordEquals(a, b record) bool {',
			'	// TODO: shapes must match (positional count, named key set),',
			'	// then every field must be equal. Named order is irrelevant.',
			'	return false',
			'}',
			'',
			'func main() {',
			'	p1 := record{pos: []string{"3", "4"}}',
			'	p2 := record{pos: []string{"3", "4"}}',
			'	p3 := record{pos: []string{"4", "3"}}',
			'	ada1 := record{named: map[string]string{"name": "Ada", "age": "36"}}',
			'	ada2 := record{named: map[string]string{"age": "36", "name": "Ada"}}',
			'',
			'	fmt.Println("(3, 4) == (3, 4):", recordEquals(p1, p2))',
			'	fmt.Println("(3, 4) == (4, 3):", recordEquals(p1, p3))',
			'	fmt.Println("named fields, either order:", recordEquals(ada1, ada2))',
			'',
			'	// Destructuring patterns, desugared: var (x, y) = point;',
			'	x, y := p1.pos[0], p1.pos[1]',
			'	x, y = y, x // (x, y) = (y, x) — Go had this one all along',
			'	fmt.Printf("after swap: x=%s y=%s\\n", x, y)',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('(3, 4) == (3, 4): true') !== -1 &&
				flat.indexOf('(3, 4) == (4, 3): false') !== -1 &&
				flat.indexOf('named fields, either order: true') !== -1 &&
				flat.indexOf('after swap: x=4 y=3') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// record models a Dart record: ordered positional fields plus a',
			'// name -> value map for named fields.',
			'type record struct {',
			'	pos   []string',
			'	named map[string]string',
			'}',
			'',
			'// recordEquals is Dart\'s == on records: structural, shape-sensitive.',
			'// Shape check first — different shapes are different record TYPES, so',
			'// field comparison never runs. Then positional fields in order, and',
			'// named fields by key: same key count + every a-key present-and-equal',
			'// in b is set equality, no sorting needed.',
			'func recordEquals(a, b record) bool {',
			'	if len(a.pos) != len(b.pos) || len(a.named) != len(b.named) {',
			'		return false',
			'	}',
			'	for i := range a.pos {',
			'		if a.pos[i] != b.pos[i] {',
			'			return false',
			'		}',
			'	}',
			'	for k, av := range a.named {',
			'		bv, has := b.named[k]',
			'		if !has || av != bv {',
			'			return false',
			'		}',
			'	}',
			'	return true',
			'}',
			'',
			'func main() {',
			'	p1 := record{pos: []string{"3", "4"}}',
			'	p2 := record{pos: []string{"3", "4"}}',
			'	p3 := record{pos: []string{"4", "3"}}',
			'	ada1 := record{named: map[string]string{"name": "Ada", "age": "36"}}',
			'	ada2 := record{named: map[string]string{"age": "36", "name": "Ada"}}',
			'',
			'	fmt.Println("(3, 4) == (3, 4):", recordEquals(p1, p2))',
			'	fmt.Println("(3, 4) == (4, 3):", recordEquals(p1, p3))',
			'	fmt.Println("named fields, either order:", recordEquals(ada1, ada2))',
			'',
			'	// Destructuring patterns, desugared: var (x, y) = point;',
			'	x, y := p1.pos[0], p1.pos[1]',
			'	x, y = y, x // (x, y) = (y, x) — Go had this one all along',
			'	fmt.Printf("after swap: x=%s y=%s\\n", x, y)',
			'}',
			'',
		].join('\n'),
	});
})();
