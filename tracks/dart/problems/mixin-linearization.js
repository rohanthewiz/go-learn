/* Mixin Linearization — Classes & Mixins (Medium). `class Duck extends
 * Animal with Walker, Swimmer` builds a single inheritance CHAIN, not a
 * diamond: Duck → Swimmer → Walker → Animal → Object. Method lookup walks
 * that chain — implementing the walk is the fastest way to stop guessing
 * which mixin "wins".
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	// The with-clause as a stack: each mixin is layered ON TOP of the super,
	// so the last one written is the first one searched. Marker id namespaced
	// (dgArrowDMX) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 150" width="540" height="150" role="img" aria-label="Duck extends Animal with Walker, Swimmer linearizes to Duck, Swimmer, Walker, Animal, Object; method lookup walks left to right">' +
		'<text x="20" y="22" class="lbl">class Duck extends Animal with Walker, Swimmer — the linearized lookup chain</text>' +
		'<rect x="20" y="44" width="80" height="34" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="60" y="66" text-anchor="middle">Duck</text>' +
		'<rect x="130" y="44" width="90" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="175" y="66" text-anchor="middle">Swimmer</text>' +
		'<rect x="250" y="44" width="90" height="34" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="295" y="66" text-anchor="middle">Walker</text>' +
		'<rect x="370" y="44" width="80" height="34" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="410" y="66" text-anchor="middle">Animal</text>' +
		'<rect x="480" y="44" width="55" height="34" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="507" y="66" text-anchor="middle" class="lbl">Object</text>' +
		'<path d="M 100 61 L 126 61" stroke="var(--dim)" stroke-width="1.6" marker-end="url(#dgArrowDMX)"/>' +
		'<path d="M 220 61 L 246 61" stroke="var(--dim)" stroke-width="1.6" marker-end="url(#dgArrowDMX)"/>' +
		'<path d="M 340 61 L 366 61" stroke="var(--dim)" stroke-width="1.6" marker-end="url(#dgArrowDMX)"/>' +
		'<path d="M 450 61 L 476 61" stroke="var(--dim)" stroke-width="1.6" marker-end="url(#dgArrowDMX)"/>' +
		'<text x="60" y="112" text-anchor="middle" class="lbl">search starts here</text>' +
		'<text x="175" y="112" text-anchor="middle" class="lbl" style="fill:var(--ok)">last mixin = first hit</text>' +
		'<text x="410" y="112" text-anchor="middle" class="lbl">super of the whole stack</text>' +
		'<defs><marker id="dgArrowDMX" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'mixin-linearization',
		title: 'Mixin Linearization',
		nav: 'mixin linearization',
		difficulty: 'Medium',
		category: 'Classes & Mixins',
		task: 'Implement Linearize (class, reversed mixins, super, Object) and Resolve (first owner wins). All 7 tests.',

		prose: [
			'<h2>Mixin Linearization</h2>' +
			'<p>Go composes behavior by embedding, and when two embedded types provide ' +
			'the same method, the call is simply ambiguous — a compile error until you ' +
			'disambiguate by hand. Dart\'s mixins take the other road: multiple sources ' +
			'of behavior are <em>linearized</em> into one inheritance chain, so there ' +
			'is always exactly one winner, decided by a rule you can memorize:</p>',
			{ lang: 'dart', code: "mixin Walker  { String move() => 'walks'; }\nmixin Swimmer { String move() => 'swims'; }\nclass Animal  { String move() => 'moves'; }\n\nclass Duck extends Animal with Walker, Swimmer {}\n\nDuck().move();   // 'swims' — the LAST mixin in the with-list wins" },
			DIAGRAM +
			'<p>Think of <code>with Walker, Swimmer</code> as stacking: Walker is ' +
			'layered on Animal, then Swimmer on top of that. Method lookup searches the ' +
			'stack top-down, which is why the chain reads as the class, the mixins ' +
			'<strong>in reverse declaration order</strong>, the superclass, then ' +
			'<code>Object</code>. There is no diamond problem because there is no ' +
			'diamond — just one list. (It also gives <code>super</code> inside a mixin ' +
			'a precise meaning: the next link to its right.)</p>' +
			'<h3>Your job</h3>' +
			'<p>Two functions. <code>Linearize(class, super, mixins)</code> builds the ' +
			'lookup chain. <code>Resolve(order, defs, method)</code> walks a chain and ' +
			'returns the first class that defines the method — or ' +
			'<code>NoSuchMethodError</code> when nobody does.</p>',
		],

		starter: [
			'package main',
			'',
			'// Linearize builds the method-lookup chain for',
			'//   class <cls> extends <super> with <mixins...>',
			'// Order: the class itself, the mixins in REVERSE declaration order,',
			'// the superclass, then "Object".',
			'func Linearize(cls, super string, mixins []string) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Resolve walks a lookup chain and returns the first class that',
			'// defines method (defs maps class -> its own methods). If no link',
			'// defines it, return "NoSuchMethodError".',
			'func Resolve(order []string, defs map[string][]string, method string) string {',
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
			'	// defs: each class\'s OWN methods (not inherited).',
			'	defs := map[string][]string{',
			'		"Duck":    {"quack"},',
			'		"Swimmer": {"move"},',
			'		"Walker":  {"move", "rest"},',
			'		"Animal":  {"move", "breathe"},',
			'	}',
			'	duck := []string{"Duck", "Swimmer", "Walker", "Animal", "Object"}',
			'',
			'	results := []map[string]any{}',
			'	addCase := func(name, want string, got func() string) {',
			'		r := map[string]any{"input": name, "want": want}',
			'		runCase(r, func() {',
			'			g := got()',
			'			r["pass"] = g == want',
			'			r["got"] = g',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	addCase("Linearize(Duck, Animal, [Walker Swimmer])",',
			'		"[Duck Swimmer Walker Animal Object]",',
			'		func() string { return fmt.Sprint(Linearize("Duck", "Animal", []string{"Walker", "Swimmer"})) })',
			'	addCase("Linearize with no mixins",',
			'		"[Cat Animal Object]",',
			'		func() string { return fmt.Sprint(Linearize("Cat", "Animal", nil)) })',
			'	addCase("Linearize with three mixins reverses all three",',
			'		"[Z M3 M2 M1 A Object]",',
			'		func() string { return fmt.Sprint(Linearize("Z", "A", []string{"M1", "M2", "M3"})) })',
			'	addCase("Resolve move: defined in both mixins and the super",',
			'		"Swimmer",',
			'		func() string { return Resolve(duck, defs, "move") })',
			'	addCase("Resolve rest: only Walker has it",',
			'		"Walker",',
			'		func() string { return Resolve(duck, defs, "rest") })',
			'	addCase("Resolve quack: the class itself wins first",',
			'		"Duck",',
			'		func() string { return Resolve(duck, defs, "quack") })',
			'	addCase("Resolve fly: nobody defines it",',
			'		"NoSuchMethodError",',
			'		func() string { return Resolve(duck, defs, "fly") })',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// Linearize builds the method-lookup chain for',
			'//   class <cls> extends <super> with <mixins...>',
			'//',
			'// The reversal is the whole trick: `with M1, M2` means "apply M1 to',
			'// the super, then M2 to the result", so the LAST application sits',
			'// closest to the class and is searched first.',
			'func Linearize(cls, super string, mixins []string) []string {',
			'	order := []string{cls}',
			'	for i := len(mixins) - 1; i >= 0; i-- {',
			'		order = append(order, mixins[i])',
			'	}',
			'	return append(order, super, "Object")',
			'}',
			'',
			'// Resolve walks a lookup chain and returns the first class that',
			'// defines method. First hit wins — there is no ambiguity to report,',
			'// because linearization already turned every diamond into a line.',
			'func Resolve(order []string, defs map[string][]string, method string) string {',
			'	for _, cls := range order {',
			'		for _, m := range defs[cls] {',
			'			if m == method {',
			'				return cls',
			'			}',
			'		}',
			'	}',
			'	return "NoSuchMethodError"',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Stacking, not merging</h3>' +
			'<p><code>extends Animal with Walker, Swimmer</code> does not merge three ' +
			'method tables. It creates anonymous intermediate classes — conceptually ' +
			'<code>(Animal+Walker)</code>, then <code>((Animal+Walker)+Swimmer)</code> — ' +
			'and Duck extends the top of the stack. Reading the with-list as ' +
			'construction order ("apply left to right") makes the reversed lookup order ' +
			'("search right to left") obvious instead of arbitrary: the last coat of ' +
			'paint is the one you see.</p>' +
			'<h3>What <code>super</code> means inside a mixin</h3>' +
			'<p>Because every mixin occupies a definite slot in the chain, ' +
			'<code>super.move()</code> inside Swimmer is not "the superclass of ' +
			'whoever mixed me in" — it is the next link to the right: Walker. Mixins ' +
			'can therefore decorate each other\'s behavior in with-list order, and the ' +
			'<code>on</code> clause (<code>mixin Swimmer on Animal</code>) is how a ' +
			'mixin declares what that right-hand neighbor must at least be, making ' +
			'<code>super</code> calls type-safe.</p>' +
			'<h3>Contrast with Go embedding</h3>' +
			'<p>Go\'s answer to the same collision — two embedded types, one method ' +
			'name — is refusing to choose: the call is ambiguous and you must write ' +
			'<code>d.Swimmer.Move()</code>. Dart chooses for you, deterministically. ' +
			'Both are defensible; what linearization buys is that <em>decorating</em> ' +
			'compose (each mixin can call <code>super</code> down the chain), which ' +
			'embedded forwarding cannot express at all.</p>',
		],
		complexity: { time: 'O(m) to linearize, O(c·k) to resolve (chain × methods per class)', space: 'O(m) for the chain' },
	});
})();
