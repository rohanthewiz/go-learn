/* Distinct Types — Values & Types (Easy). Odin flips Go's default: a named
 * type `Meters :: f64` is a transparent alias unless you say `distinct`,
 * which mints a new nominal type that refuses implicit assignment even
 * though the bits are identical. The learner implements the assignability
 * check: resolve names through alias links until a distinct type or a
 * builtin stops the walk, then compare canonical types.
 */
(function () {
	'use strict';
	var T = GoLearnOdin;

	T.problem({
		id: 'distinct-types',
		title: 'Distinct Types',
		nav: 'distinct types',
		difficulty: 'Easy',
		category: 'Values & Types',
		task: 'Implement Assignable — resolve names through alias chains to a canonical type; assignment compiles iff the canonicals match. All 8 tests.',

		prose: [
			'<h2>Distinct Types</h2>' +
			'<p>Both of these types are an <code>f64</code> in memory. Only one of them ' +
			'will accept the other:</p>',
			{ lang: 'odin', code: 'Meters  :: distinct f64\nSeconds :: distinct f64\nFast    :: f64            // plain alias — still just f64\n\nm: Meters = 10.0\ns: Seconds = m            // error: cannot assign \'Meters\' to \'Seconds\'\n\nf: Fast = 88.0\nx: f64 = f                // fine: an alias is transparent\n\ns2 := Seconds(m)          // explicit cast: always allowed — same bits' },
			'<p>Go has this idea too — in fact Go is <em>stricter</em> by default: every ' +
			'<code>type Meters float64</code> is its own type needing a conversion, and ' +
			'you must write <code>type Fast = float64</code> to get a transparent alias. ' +
			'Odin flips the default and makes the split explicit at the keyword level: ' +
			'<code>Name :: Base</code> is an alias (free intermixing), ' +
			'<code>Name :: distinct Base</code> mints a new nominal type. The payoff is ' +
			'the same in both languages — <code>Meters</code> and <code>Seconds</code> ' +
			'can never be confused by accident, at zero runtime cost — but Odin lets you ' +
			'choose per type whether you want a <em>name</em> or a <em>wall</em>.</p>' +
			'<p>Two details make the rule interesting to implement. Aliases can chain ' +
			'(<code>B :: A</code>, <code>C :: B</code>), and an alias can point <em>at</em> ' +
			'a distinct type — <code>MeterAlias :: Meters</code> is assignable to ' +
			'<code>Meters</code>, because the alias walk stops at the first distinct ' +
			'type it reaches. Distinctness is a wall; aliasing is a window.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Assignable(dst, src, decls)</code>: resolve each type ' +
			'name through alias links to its <strong>canonical type</strong> — a builtin ' +
			'(no declaration found) or the first <code>distinct</code> declaration on ' +
			'the chain — and report whether the two canonicals are equal.</p>',
			{ code: 'Fast → f64            ✓  alias resolves to its base\nMeters → f64          ✗  distinct: a wall, even to its own base\nSeconds → Meters      ✗  two distinct types, same bits — still walls\nMeterAlias → Meters   ✓  alias OF a distinct stops AT the distinct\nC → f64               ✓  aliases chain: C → B → A → f64', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Decl is one type declaration:',
			'//   Distinct false:  Name :: Base           (transparent alias)',
			'//   Distinct true:   Name :: distinct Base  (new nominal type)',
			'// A name with no Decl is a builtin (f64, int, ...): canonical as-is.',
			'type Decl struct {',
			'	Name     string',
			'	Base     string',
			'	Distinct bool',
			'}',
			'',
			'// Assignable reports whether a value of type src may be implicitly',
			'// assigned to a variable of type dst (no explicit cast).',
			'//',
			'// Rule: resolve each name through ALIAS links only — a distinct',
			'// declaration or a builtin ends the walk and IS the canonical type.',
			'// Assignment compiles iff both canonicals are the same name.',
			'func Assignable(dst, src string, decls []Decl) bool {',
			'	// your code here',
			'	return false',
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
			'	// One shared declaration table — mirrors the Odin exhibit plus an',
			'	// alias chain and a distinct-of-distinct.',
			'	decls := []Decl{',
			'		{Name: "Meters", Base: "f64", Distinct: true},',
			'		{Name: "Seconds", Base: "f64", Distinct: true},',
			'		{Name: "Fast", Base: "f64", Distinct: false},',
			'		{Name: "MeterAlias", Base: "Meters", Distinct: false},',
			'		{Name: "Kilometers", Base: "Meters", Distinct: true},',
			'		{Name: "A", Base: "f64", Distinct: false},',
			'		{Name: "B", Base: "A", Distinct: false},',
			'		{Name: "C", Base: "B", Distinct: false},',
			'	}',
			'',
			'	type tc struct {',
			'		name     string',
			'		dst, src string',
			'		want     bool',
			'	}',
			'	cases := []tc{',
			'		{"alias to base: f64 = Fast compiles", "f64", "Fast", true},',
			'		{"distinct to base: f64 = Meters is a compile error", "f64", "Meters", false},',
			'		{"base to distinct: Meters = f64 blocked the other way too", "Meters", "f64", false},',
			'		{"two distincts over the same base: Seconds = Meters", "Seconds", "Meters", false},',
			'		{"alias OF a distinct stops AT the distinct: Meters = MeterAlias", "Meters", "MeterAlias", true},',
			'		{"chained aliases: f64 = C walks C -> B -> A -> f64", "f64", "C", true},',
			'		{"self is always assignable: Meters = Meters", "Meters", "Meters", true},',
			'		{"distinct of a distinct: Meters = Kilometers", "Meters", "Kilometers", false},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := Assignable(c.dst, c.src, decls)',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%v", got)',
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
			'// Decl is one type declaration:',
			'//   Distinct false:  Name :: Base           (transparent alias)',
			'//   Distinct true:   Name :: distinct Base  (new nominal type)',
			'// A name with no Decl is a builtin (f64, int, ...): canonical as-is.',
			'type Decl struct {',
			'	Name     string',
			'	Base     string',
			'	Distinct bool',
			'}',
			'',
			'// canonical resolves a type name through alias links to the type',
			'// identity the compiler actually compares.',
			'//',
			'// The walk embodies the whole rule, so each stopping condition is a',
			'// language fact:',
			'//   - no declaration → builtin: it is its own canonical type',
			'//   - Distinct       → WALL: the name itself is a new canonical type;',
			'//                      its Base is deliberately NOT followed, which is',
			'//                      exactly what makes Meters differ from f64',
			'//   - alias          → WINDOW: fully transparent, keep walking',
			'func canonical(name string, decls []Decl) string {',
			'	for {',
			'		found := false',
			'		var d Decl',
			'		for _, dd := range decls {',
			'			if dd.Name == name {',
			'				d, found = dd, true',
			'				break',
			'			}',
			'		}',
			'		if !found {',
			'			return name // builtin — the chain bottoms out here',
			'		}',
			'		if d.Distinct {',
			'			return name // distinct — a new identity; do not look through',
			'		}',
			'		name = d.Base // alias — transparent, continue the walk',
			'	}',
			'}',
			'',
			'// Assignable reports whether `dst = src_value` compiles without a',
			'// cast: true iff both names resolve to the same canonical type.',
			'//',
			'// Symmetric by construction — assignability here is an equivalence',
			'// relation, with aliases as the equivalence and distinct types as',
			'// fresh classes. An explicit cast (Seconds(m)) is always available',
			'// because every type in one class shares a representation; the wall',
			'// is nominal, not physical.',
			'func Assignable(dst, src string, decls []Decl) bool {',
			'	return canonical(dst, decls) == canonical(src, decls)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Walls and windows</h3>' +
			'<p>The entire semantics lives in <code>canonical</code>’s two stopping ' +
			'conditions. An alias is a window — resolution looks straight through it, ' +
			'so <code>C</code>, <code>B</code>, <code>A</code>, and <code>f64</code> are ' +
			'literally the same type to the compiler. <code>distinct</code> is a wall — ' +
			'resolution stops at the <em>name</em>, never reaching the base:</p>',
			{ code: 'if d.Distinct {\n\treturn name // the name IS the type; Base is not followed\n}\nname = d.Base // alias: transparent, keep walking' },
			'<p>That one early return is why <code>Meters = f64</code> fails in both ' +
			'directions and why <code>MeterAlias = Meters</code> succeeds: the alias ' +
			'walk from <code>MeterAlias</code> stops at <code>Meters</code>, and ' +
			'<code>Meters</code>’ own walk stops immediately — same canonical, ' +
			'assignable.</p>' +
			'<h3>The Go mirror, reversed</h3>' +
			'<p>Go developers already live by this rule with the defaults swapped: ' +
			'<code>type Meters float64</code> behaves like Odin’s ' +
			'<code>distinct</code> (conversion required), and <code>type Fast = ' +
			'float64</code> is the alias. What Odin adds is that the choice reads at ' +
			'the declaration site — <code>::</code> for “just a name for the same ' +
			'thing”, <code>:: distinct</code> for “a new thing”. When you read Odin ' +
			'code, <code>distinct</code> is a signal of intent: the author wants the ' +
			'compiler to police this boundary (units, IDs, handles), not merely to ' +
			'document it.</p>' +
			'<h3>Zero-cost walls</h3>' +
			'<p>Nothing here exists at runtime. Every type in the table is eight bytes ' +
			'of <code>f64</code>, and <code>Seconds(m)</code> compiles to no ' +
			'instructions at all — the cast only moves the value across the nominal ' +
			'wall. That is the practical pitch for <code>distinct</code>: all of the ' +
			'safety of a wrapper type with none of the boxing or conversion cost. ' +
			'The next lesson applies the same “names carry meaning” idea to sets of ' +
			'names: enums and bit_set.</p>',
		],
		complexity: { time: 'O(c·d) — one linear decl scan per alias hop; a map would make it O(c)', space: 'O(1) — the walk keeps only the current name' },
	});
})();
