/* Classes — typed fields, access modifiers, parameter properties, and
 * implements. The exercise adds private mutable state behind a public
 * method: the smallest example where `private` is doing real work, and
 * where forgetting to initialize a field trips strict property checks.
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	T.lesson({
		id: 'classes',
		title: 'Classes',
		nav: 'classes',
		category: 'Objects & Classes',

		prose: [
			'<h2>Classes</h2>' +
			'<p>TypeScript classes are JavaScript classes with the field types made ' +
			'explicit and checked. Strict mode insists every declared field is ' +
			'<em>definitely assigned</em> — either at the declaration or in the ' +
			'constructor — so a forgotten initialization is a compile error, not a ' +
			'mysterious <code>undefined</code> later:</p>',
			{ lang: 'ts', code: 'class Timer {\n  label: string;          // error TS2564 unless assigned in the constructor\n  private elapsed = 0;    // initialized inline; type number inferred\n\n  constructor(label: string) {\n    this.label = label;\n  }\n}' },
			'<p>Access modifiers control who may touch a member: ' +
			'<code>public</code> (the default), <code>private</code> (this class ' +
			'only), <code>protected</code> (plus subclasses), and ' +
			'<code>readonly</code> composes with all of them. Like every type ' +
			'feature these are compile-time — erased from the emitted JS — but they ' +
			'make the intended surface of a class impossible to misuse silently.</p>' +
			'<p>Two idioms worth recognizing on sight:</p>',
			{ lang: 'ts', code: '// parameter properties: declare + assign a field in one place\nclass Timer2 {\n  constructor(private label: string, readonly limit = 60) {}\n}\n\n// implements: promise a shape (structural, checked; adds nothing at runtime)\ninterface Ticker { tick(): number }\nclass Clock implements Ticker { tick() { return 1; } }' },
			'<h3>Your job</h3>' +
			'<p><code>Counter</code> claims to implement <code>Ticker</code> but ' +
			'always returns 1 — it has no state. Give it a <code>private</code> ' +
			'count field and make each <code>tick()</code> return the next value. ' +
			'The driver code below the class also pokes at the field from outside; ' +
			'once it is <code>private</code>, that line must go (the checker will ' +
			'say so).</p>' +
			'<div class="tip"><code>implements</code> only checks — it does not ' +
			'inherit anything. For inheritance there is <code>extends</code> + ' +
			'<code>super()</code>, same as JavaScript, with override checking on ' +
			'top.</div>',
		],

		task: 'Add a private count so tick() returns 1, 2, 3 — and remove the outside poke at the field.',

		starter: [
			'interface Ticker {',
			'  tick(): number;',
			'}',
			'',
			'class Counter implements Ticker {',
			'  // TODO: a private count field, starting at 0',
			'',
			'  tick(): number {',
			'    // TODO: advance the count and return it',
			'    return 1;',
			'  }',
			'}',
			'',
			'const c = new Counter();',
			'// TODO: delete this line. The plain version — c.count — will be',
			'// error TS2341 once the field is private; this cast bulldozes the',
			'// checker to get at it anyway. Casts that lie are how private state',
			'// leaks, so out it goes.',
			'console.log("peek", (c as unknown as { count?: number }).count);',
			'',
			'console.log("tick", c.tick());',
			'console.log("tick", c.tick());',
			'console.log("tick", c.tick());',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('tick 1') !== -1 &&
				flat.indexOf('tick 2') !== -1 &&
				flat.indexOf('tick 3') !== -1 &&
				flat.indexOf('peek') === -1;
		},

		solution: [
			'interface Ticker {',
			'  tick(): number;',
			'}',
			'',
			'class Counter implements Ticker {',
			'  // Inline initializer satisfies definite assignment; the type',
			'  // (number) is inferred. private makes the field invisible — and',
			'  // unassignable — outside this class body.',
			'  private count = 0;',
			'',
			'  tick(): number {',
			'    this.count += 1;',
			'    return this.count;',
			'  }',
			'}',
			'',
			'const c = new Counter();',
			'console.log("tick", c.tick());',
			'console.log("tick", c.tick());',
			'console.log("tick", c.tick());',
			'',
		].join('\n'),
	});
})();
