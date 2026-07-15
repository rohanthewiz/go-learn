/* Sealed Classes & Exhaustiveness — Collections & Patterns (Medium). Dart 3
 * closes a class hierarchy with `sealed`, which turns switch into a totality
 * check over the subtype TREE — richer than Rust's flat enum: a case naming
 * an internal node covers its whole subtree. The learner implements that
 * tree-coverage walk.
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	T.problem({
		id: 'sealed-exhaustive',
		title: 'Sealed Classes & Exhaustiveness',
		nav: 'sealed & exhaustive',
		difficulty: 'Medium',
		category: 'Collections & Patterns',
		task: 'Implement CheckSwitch: a case covers its whole subtree; report uncovered LEAF types in declaration order. All 7 tests.',

		prose: [
			'<h2>Sealed Classes &amp; Exhaustiveness</h2>' +
			'<p>Go\'s type switches never know when they\'re done: any package can add ' +
			'another implementation of an interface, so <code>default</code> is always ' +
			'load-bearing. Dart 3\'s <code>sealed</code> flips that: all direct ' +
			'subtypes must live in the same library, so the compiler knows the ' +
			'<em>complete</em> hierarchy — and switches over it must be exhaustive:</p>',
			{ lang: 'dart', code: "sealed class Shape {}\nclass Circle extends Shape {}\nsealed class Polygon extends Shape {}\nclass Square extends Polygon {}\nclass Triangle extends Polygon {}\n\ndouble area(Shape s) => switch (s) {\n  Circle()   => 3.14 * s.r * s.r,\n  Polygon()  => s.base * s.height / 2,   // covers Square AND Triangle\n};\n// remove the Polygon() arm and:\n// error: The type 'Shape' is not exhaustively matched by the switch cases\n//        since it doesn't match 'Triangle()'." },
			'<p>The hierarchy is a <em>tree</em>, and a case pattern covers the entire ' +
			'subtree under the type it names — <code>Polygon()</code> handles both ' +
			'Square and Triangle. Exhaustiveness therefore means: <strong>every leaf ' +
			'type is under some case</strong>. Add a <code>Pentagon extends ' +
			'Polygon</code> next year and every switch that spelled out Square and ' +
			'Triangle individually becomes a compile error pointing at itself — the ' +
			'same "add a variant, chase the errors" superpower Rust enums have, on an ' +
			'open-looking class hierarchy.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>CheckSwitch(children, root, cases)</code>. ' +
			'<code>children</code> maps each type to its direct subtypes in declaration ' +
			'order; leaves have no entry. Each case names one type and covers every ' +
			'leaf beneath it (a leaf covers itself). Return the leaves no case covers, ' +
			'in depth-first declaration order — empty means the switch compiles.</p>',
		],

		starter: [
			'package main',
			'',
			'// CheckSwitch verifies a switch over a sealed hierarchy.',
			'//   children — type -> direct subtypes, in declaration order',
			'//              (leaf types have no entry)',
			'//   root     — the sealed type being switched on',
			'//   cases    — the type each case pattern names; a case covers',
			'//              every leaf in the subtree under its type',
			'// Returns the uncovered LEAF types in depth-first declaration order;',
			'// empty means exhaustive.',
			'func CheckSwitch(children map[string][]string, root string, cases []string) []string {',
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
			'	// The lesson\'s hierarchy: Shape -> Circle | Polygon(-> Square | Triangle)',
			'	shape := map[string][]string{',
			'		"Shape":   {"Circle", "Polygon"},',
			'		"Polygon": {"Square", "Triangle"},',
			'	}',
			'	// A deeper one: A -> B | C(-> D | E(-> F | G))',
			'	deep := map[string][]string{',
			'		"A": {"B", "C"},',
			'		"C": {"D", "E"},',
			'		"E": {"F", "G"},',
			'	}',
			'',
			'	type tc struct {',
			'		name  string',
			'		tree  map[string][]string',
			'		root  string',
			'		cases []string',
			'		want  []string',
			'	}',
			'	cases := []tc{',
			'		{"every leaf spelled out", shape, "Shape",',
			'			[]string{"Circle", "Square", "Triangle"}, []string{}},',
			'		{"one leaf missing", shape, "Shape",',
			'			[]string{"Circle", "Square"}, []string{"Triangle"}},',
			'		{"internal node covers its subtree", shape, "Shape",',
			'			[]string{"Circle", "Polygon"}, []string{}},',
			'		{"subtree covered, sibling leaf missing", shape, "Shape",',
			'			[]string{"Polygon"}, []string{"Circle"}},',
			'		{"no cases: all leaves, declaration order", shape, "Shape",',
			'			[]string{}, []string{"Circle", "Square", "Triangle"}},',
			'		{"the root type covers everything", shape, "Shape",',
			'			[]string{"Shape"}, []string{}},',
			'		{"three levels deep", deep, "A",',
			'			[]string{"B", "D", "F"}, []string{"G"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%s: switch(%s) cases=%v", c.name, c.root, c.cases),',
			'			"want":  fmt.Sprint(c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := CheckSwitch(c.tree, c.root, append([]string(nil), c.cases...))',
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
			'// CheckSwitch verifies a switch over a sealed hierarchy: every LEAF',
			'// type must sit under some case\'s subtree.',
			'//',
			'// Two depth-first walks over the same tree. The first turns each case',
			'// into the set of leaves it covers (naming an internal node = naming',
			'// all leaves beneath it). The second walks from the root in',
			'// declaration order collecting leaves the covered-set misses — walking',
			'// the TREE (not the cases) is what yields declaration order for free.',
			'func CheckSwitch(children map[string][]string, root string, cases []string) []string {',
			'	covered := map[string]bool{}',
			'	var mark func(n string)',
			'	mark = func(n string) {',
			'		kids := children[n]',
			'		if len(kids) == 0 { // leaf: covers itself',
			'			covered[n] = true',
			'			return',
			'		}',
			'		for _, k := range kids {',
			'			mark(k)',
			'		}',
			'	}',
			'	for _, c := range cases {',
			'		mark(c)',
			'	}',
			'',
			'	missing := []string{}',
			'	var walk func(n string)',
			'	walk = func(n string) {',
			'		kids := children[n]',
			'		if len(kids) == 0 {',
			'			if !covered[n] {',
			'				missing = append(missing, n)',
			'			}',
			'			return',
			'		}',
			'		for _, k := range kids {',
			'			walk(k)',
			'		}',
			'	}',
			'	walk(root)',
			'	return missing',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Leaves are the unit of truth</h3>' +
			'<p>A value of a sealed type is, at runtime, always an instance of some ' +
			'<em>leaf</em> — the internal sealed types are abstract by construction. So ' +
			'"is this switch total?" reduces to "does every leaf have an owner?", and ' +
			'both halves of the algorithm are leaf-walks: cases expand downward to the ' +
			'leaves they own, and the verdict enumerates leaves left over. Internal ' +
			'nodes never appear in either set — they are shorthand, not values.</p>' +
			'<h3>Why the compiler can even ask</h3>' +
			'<p><code>sealed</code> is a <em>library</em> boundary: all direct subtypes ' +
			'must be declared in the same file/library, so the children map is closed ' +
			'and known at compile time. Go deliberately lacks this — any package can ' +
			'implement your interface, which buys openness and costs every type switch ' +
			'its <code>default</code> arm. Dart lets you pick per hierarchy: ' +
			'<code>sealed</code> where you want totality, plain <code>abstract</code> ' +
			'where you want extension. (<code>final</code>, <code>base</code>, and ' +
			'<code>interface</code> modifiers tune the same dial.)</p>' +
			'<h3>The same walk, one level up</h3>' +
			'<p>Real Dart patterns nest — <code>case Circle(r: 0)</code> covers only ' +
			'part of Circle\'s value space, and the checker reasons about "spaces" ' +
			'rather than bare types. But the sealed-subtype layer of that analysis is ' +
			'exactly this tree walk; the Rust track\'s match-exhaustiveness problem is ' +
			'the degenerate case where the tree is one root with N leaves.</p>',
		],
		complexity: { time: 'O(cases × tree + tree) — each walk visits a node once', space: 'O(leaves) for the covered set' },
	});
})();
