/* Zero Is Initialization — Values & Types (Easy). Odin's founding design
 * stance: every variable is zero-initialized and the zero value is DESIGNED
 * to be a valid state — no constructors, no nil-map surprises. The learner
 * implements the zero-value renderer: a recursive walk of a type tree that
 * emits the exact Odin literal ZII would produce, which makes "zeroed all
 * the way down" concrete instead of a slogan.
 */
(function () {
	'use strict';
	var T = GoLearnOdin;

	T.problem({
		id: 'zii-defaults',
		title: 'Zero Is Initialization',
		nav: 'ZII defaults',
		difficulty: 'Easy',
		category: 'Values & Types',
		task: 'Implement ZeroValue — render the ZII default of any type as an Odin literal, recursively. All 8 tests.',

		prose: [
			'<h2>Zero Is Initialization</h2>' +
			'<p>Declare a variable in Odin and it is immediately usable — every byte ' +
			'is zeroed, every field of every nested struct, every element of every ' +
			'array. There is no uninitialized memory and no constructor idiom:</p>',
			{ lang: 'odin', code: 'x: int             // 0\nname: string       // ""\nv: Vec3            // Vec3{x = 0.0, y = 0.0, z = 0.0}\np: ^Node           // nil\nm: map[string]int  // empty AND writable — no make() ritual\nm["hits"] += 1     // just works; allocates lazily via the context allocator' },
			'<p>Sound familiar? It should — Go has zero values too, and this is the ' +
			'deepest thing the two languages share. The hook is that Odin ' +
			'<em>doubles down</em> on it as a design philosophy, called ' +
			'<strong>ZII — Zero Is Initialization</strong>. Where Go’s zero value ' +
			'has famous potholes (writing to a nil map panics; half the ecosystem ' +
			'wraps types in <code>NewFoo()</code> constructors because the zero value ' +
			'isn’t actually valid), Odin’s standard answer is: <em>make the ' +
			'zero value the valid initial state, always</em>. Maps and dynamic arrays ' +
			'work from zero. Unions are nil from zero. Idiomatic Odin types are ' +
			'designed so that <code>{}</code> means “ready”, and code that ' +
			'needs setup takes it as explicit parameters instead of hiding it in a ' +
			'constructor.</p>' +
			'<h3>Your job</h3>' +
			'<p>Make ZII concrete: implement <code>ZeroValue(t)</code>, which renders ' +
			'the zero value of a type as the Odin literal the compiler would hand you. ' +
			'Scalars are leaves; arrays repeat their element’s zero <code>Len</code> ' +
			'times; structs zero every named field. The recursion is the point — ' +
			'“zeroed all the way down” is a tree walk.</p>',
			{ code: 'ZeroValue(int)      → "0"\nZeroValue(f64)      → "0.0"\nZeroValue(string)   → "\\"\\""\nZeroValue(^Node)    → "nil"\nZeroValue([3]int)   → "[3]int{0, 0, 0}"\nZeroValue(Vec3)     → "Vec3{x = 0.0, y = 0.0, z = 0.0}"', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Type is an Odin type shape. Kind is one of:',
			'//   "int", "f64", "bool", "string"  scalars',
			'//   "pointer"                       ^Name (zero value: nil)',
			'//   "array"                         [Len]elem, element type in Elems[0]',
			'//   "struct"                        named struct: Name, field types in',
			'//                                   Elems, field names in Names (parallel)',
			'type Type struct {',
			'	Kind  string',
			'	Name  string   // struct type name, or pointee name for "pointer"',
			'	Len   int      // array length',
			'	Elems []Type   // array: element at [0]; struct: field types in order',
			'	Names []string // struct: field names, parallel to Elems',
			'}',
			'',
			'// ZeroValue renders the ZII default of t in Odin literal syntax:',
			'//   int → "0"    f64 → "0.0"    bool → "false"    string → `""`',
			'//   pointer → "nil"',
			'//   array   → "[3]int{0, 0, 0}"            (element zero, repeated Len times)',
			'//   struct  → "Vec3{x = 0.0, y = 0.0}"     (every field zeroed, in order)',
			'func ZeroValue(t Type) string {',
			'	// your code here',
			'	return ""',
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
			'	// Small constructors keep the case table readable.',
			'	prim := func(k string) Type { return Type{Kind: k} }',
			'	ptr := func(name string) Type { return Type{Kind: "pointer", Name: name} }',
			'	arr := func(n int, e Type) Type { return Type{Kind: "array", Len: n, Elems: []Type{e}} }',
			'	strct := func(name string, names []string, types ...Type) Type { return Type{Kind: "struct", Name: name, Names: names, Elems: types} }',
			'',
			'	vec2 := strct("Vec2", []string{"x", "y"}, prim("f64"), prim("f64"))',
			'',
			'	type tc struct {',
			'		name string',
			'		t    Type',
			'		want string',
			'	}',
			'	cases := []tc{',
			'		{"x: int — usable immediately, value 0", prim("int"), "0"},',
			'		{"f64 zeroes to 0.0, not 0", prim("f64"), "0.0"},',
			'		{"bool zeroes to false", prim("bool"), "false"},',
			'		{"string zeroes to \\"\\" — empty, never nil", prim("string"), `""`},',
			'		{"^Node: every pointer starts nil", ptr("Node"), "nil"},',
			'		{"[3]int: every element zeroed", arr(3, prim("int")), "[3]int{0, 0, 0}"},',
			'		{"Vec3: every field zeroed, no constructor", strct("Vec3", []string{"x", "y", "z"}, prim("f64"), prim("f64"), prim("f64")), "Vec3{x = 0.0, y = 0.0, z = 0.0}"},',
			'		{"Mesh{[2]Vec2, int}: ZII recurses all the way down", strct("Mesh", []string{"verts", "count"}, arr(2, vec2), prim("int")), "Mesh{verts = [2]Vec2{Vec2{x = 0.0, y = 0.0}, Vec2{x = 0.0, y = 0.0}}, count = 0}"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%q", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := ZeroValue(c.t)',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%q", got)',
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
			'import (',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			'// Type is an Odin type shape. Kind is one of:',
			'//   "int", "f64", "bool", "string"  scalars',
			'//   "pointer"                       ^Name (zero value: nil)',
			'//   "array"                         [Len]elem, element type in Elems[0]',
			'//   "struct"                        named struct: Name, field types in',
			'//                                   Elems, field names in Names (parallel)',
			'type Type struct {',
			'	Kind  string',
			'	Name  string',
			'	Len   int',
			'	Elems []Type',
			'	Names []string',
			'}',
			'',
			'// typeName renders the Odin spelling of a type, needed because an',
			'// array literal is prefixed by its own type: [3]int{...}. Recursive',
			'// for the nested-array spelling [2][3]int.',
			'func typeName(t Type) string {',
			'	switch t.Kind {',
			'	case "array":',
			'		return fmt.Sprintf("[%d]%s", t.Len, typeName(t.Elems[0]))',
			'	case "pointer":',
			'		return "^" + t.Name',
			'	case "struct":',
			'		return t.Name',
			'	}',
			'	return t.Kind // scalars: the kind IS the Odin type name',
			'}',
			'',
			'// ZeroValue renders the ZII default of t in Odin literal syntax.',
			'//',
			'// The function mirrors the type grammar, so structural recursion is',
			'// the natural shape: scalars and pointers answer at the leaf, arrays',
			'// and structs delegate to their children. That mirror is the whole',
			'// lesson — "everything is zeroed" is not a runtime loop over bytes,',
			'// it is a rule applied at every node of the type tree.',
			'func ZeroValue(t Type) string {',
			'	switch t.Kind {',
			'	case "int":',
			'		return "0"',
			'	case "f64":',
			'		// Odin prints float zeros with a decimal point; keeping the',
			'		// spelling distinct from int 0 preserves the type in the text.',
			'		return "0.0"',
			'	case "bool":',
			'		return "false"',
			'	case "string":',
			'		return `""` // empty, never nil: a zero string is a valid string',
			'	case "pointer":',
			'		return "nil" // the ONE zero that is not yet a usable payload',
			'	case "array":',
			'		// One recursive call, repeated: every element shares the same',
			'		// zero because zero depends only on the type, never on position.',
			'		zero := ZeroValue(t.Elems[0])',
			'		elems := make([]string, t.Len)',
			'		for i := range elems {',
			'			elems[i] = zero',
			'		}',
			'		return typeName(t) + "{" + strings.Join(elems, ", ") + "}"',
			'	case "struct":',
			'		// Field order is declaration order — ZII is deterministic,',
			'		// which is why two zeroed values always compare equal.',
			'		parts := make([]string, len(t.Elems))',
			'		for i, ft := range t.Elems {',
			'			parts[i] = t.Names[i] + " = " + ZeroValue(ft)',
			'		}',
			'		return t.Name + "{" + strings.Join(parts, ", ") + "}"',
			'	}',
			'	return "?" // unknown kind: visible in a failing row, not a panic',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The recursion is the philosophy</h3>' +
			'<p>Notice what <code>ZeroValue</code> never needs: a per-type constructor ' +
			'table, an “is this initialized?” flag, a special case for nesting. ' +
			'Zero is defined <em>compositionally</em> — the zero of an aggregate is the ' +
			'aggregate of zeros — so one recursive rule covers every type that will ' +
			'ever exist:</p>',
			{ code: 'case "struct":\n\tfor i, ft := range t.Elems {\n\t\tparts[i] = t.Names[i] + " = " + ZeroValue(ft)\n\t}' },
			'<p>That compositionality is why ZII scales as a design stance: if every ' +
			'type’s zero is valid, then every <em>containing</em> type’s zero ' +
			'is valid for free.</p>' +
			'<h3>Where Go stops and Odin keeps going</h3>' +
			'<p>Go’s zero values are the same idea, honestly inherited — but Go has ' +
			'edges where the zero value is a trap: a nil map panics on write, a nil ' +
			'channel blocks forever, and library types often demand ' +
			'<code>NewClient(...)</code> because their zero is unusable. Odin’s ' +
			'position is that those edges are design bugs to be avoided: maps and ' +
			'dynamic arrays allocate lazily through the implicit context allocator, so ' +
			'the zero value <em>is</em> the empty collection, writable. The culture ' +
			'follows the language: an Odin API whose zero value doesn’t work is ' +
			'considered wrongly designed, not merely inconvenient.</p>' +
			'<h3>What nil still means</h3>' +
			'<p>The pointer row is the honest exception: <code>nil</code> is a valid ' +
			'<em>value</em> (you can test it, pass it, store it) but not a valid ' +
			'<em>dereference</em>. Odin keeps that distinction visible rather than ' +
			'papering over it — and the same nil shows up again as the default state of ' +
			'tagged unions, a few lessons from now. When you read Odin code and see no ' +
			'constructors anywhere, this lesson is why: declaration <em>is</em> ' +
			'initialization.</p>',
		],
		complexity: { time: 'O(n) — each node of the type tree rendered once (arrays render Len copies of one recursive result)', space: 'O(d) recursion depth plus the output string' },
	});
})();
