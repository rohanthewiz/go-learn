/* Inheritance — extends, the super() rule, overriding with super.method(),
 * and the payoff: one polymorphic loop instead of if/else type chains. The
 * starter has a flat Circle that duplicates Shape's logic and a report loop
 * that special-cases every type; the check pins an overridden describe()
 * that visibly calls super.describe() (base wording + appended detail) and
 * an instanceof line that can only be true once Circle really extends
 * Shape.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// Small class hierarchy: derived classes point UP at the base they
	// extend. Marker id is namespaced (dgArrowJSIN) because every track's
	// inline SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 150" width="520" height="150" role="img" aria-label="Circle and Rect extend Shape; each overrides area, Circle also overrides describe">' +
		'<rect x="185" y="16" width="150" height="46" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="260" y="35" text-anchor="middle">Shape</text>' +
		'<text x="260" y="52" text-anchor="middle" class="lbl">describe() &#183; area()</text>' +
		'<rect x="60" y="96" width="160" height="46" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="140" y="115" text-anchor="middle">Circle</text>' +
		'<text x="140" y="132" text-anchor="middle" class="lbl">area(), describe() + super</text>' +
		'<rect x="310" y="96" width="150" height="46" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="385" y="115" text-anchor="middle">Rect</text>' +
		'<text x="385" y="132" text-anchor="middle" class="lbl">area() override</text>' +
		'<path d="M 150 92 L 225 66" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSIN)"/>' +
		'<text x="150" y="80" class="lbl">extends</text>' +
		'<path d="M 375 92 L 300 66" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSIN)"/>' +
		'<text x="322" y="80" class="lbl">extends</text>' +
		'<defs><marker id="dgArrowJSIN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	J.lesson({
		id: 'inheritance',
		title: 'Inheritance',
		nav: 'inheritance',
		category: 'Prototypes & Classes',

		prose: [
			'<h2>Inheritance</h2>' +
			'<p><code>class Circle extends Shape</code> wires up <em>two</em> ' +
			'prototype chains at once: instances (' +
			'<code>Circle.prototype</code> &#8594; <code>Shape.prototype</code>, ' +
			'so circles inherit instance methods) and the classes themselves (' +
			'<code>Circle</code> &#8594; <code>Shape</code>, so ' +
			'<code>static</code> members are inherited too). It is still the ' +
			'lookup walk from the prototypes lesson — <code>extends</code> just ' +
			'builds both links for you.</p>',
			DIAGRAM +
			'<p>In a derived constructor, <strong><code>super(...)</code> must ' +
			'run before you touch <code>this</code></strong> — and the rule is ' +
			'not bureaucracy. The <em>base</em> constructor is what actually ' +
			'constructs the object; until it returns, there is no ' +
			'<code>this</code> to assign to (using it earlier is a ' +
			'<code>ReferenceError</code>). Base initializes its part, then the ' +
			'derived constructor layers its own fields on top.</p>',
			{ lang: 'js', code: "class Shape {\n  constructor(name) { this.name = name; }\n  area() { return 0; }\n  describe() { return this.name + ' area ' + this.area().toFixed(2); }\n}\n\nclass Rect extends Shape {\n  constructor(w, h) {\n    super('rect');        // base constructs `this` — must come first\n    this.w = w; this.h = h;\n  }\n  area() { return this.w * this.h; }   // override: replaces the base's\n}" },
			'<p>Overriding a method <em>replaces</em> the inherited one for that ' +
			'class. When you want to <em>extend</em> instead — keep the base ' +
			'behavior and add to it — call <code>super.method()</code> inside the ' +
			'override:</p>',
			{ lang: 'js', code: "class Circle extends Shape {\n  // ...\n  describe() {\n    // Reuse the base wording, append circle-specific detail.\n    return super.describe() + ' (r=' + this.r + ')';\n  }\n}\n\n// The payoff — POLYMORPHISM: one call site, and dynamic dispatch picks\n// each object's own override. No if/else on types.\nfor (const s of shapes) console.log(s.describe());\n\nnew Circle(1) instanceof Shape;   // true — instanceof walks the chain" },
			'<p>Notice what <code>describe()</code> never needed: it calls ' +
			'<code>this.area()</code>, and the walk finds each subclass&#39;s ' +
			'override at run time. Add a <code>Triangle</code> tomorrow and every ' +
			'loop that says <code>s.describe()</code> already handles it — the ' +
			'ones that say <code>if (s instanceof ...)</code> all need editing. ' +
			'One honest engineering note: this power invites towers. Prefer ' +
			'<em>shallow</em> hierarchies, and when the &quot;is-a&quot; claim ' +
			'starts to strain (is a <code>Button</code> really a ' +
			'<code>Rectangle</code>?), reach for composition — hold a shape ' +
			'rather than be one.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter&#39;s <code>Circle</code> does <em>not</em> extend ' +
			'<code>Shape</code>: it re-implements <code>describe</code>, and the ' +
			'report loop special-cases types with an <code>if/else</code> chain ' +
			'(hand-computing circle area a third time!). Make ' +
			'<code>Circle extends Shape</code> with <code>super(\'circle\')</code>, ' +
			'override <code>area()</code>, override <code>describe()</code> to ' +
			'call <code>super.describe()</code> and append ' +
			'<code>\' (r=\' + this.r + \')\'</code> — then collapse the loop to ' +
			'one polymorphic <code>s.describe()</code> / <code>s.area()</code> ' +
			'per shape.</p>' +
			'<div class="tip">Try moving <code>this.r = r;</code> above ' +
			'<code>super(\'circle\')</code> once — the ReferenceError you get is ' +
			'the &quot;base constructs the object&quot; rule enforcing ' +
			'itself.</div>',
		],

		task: "Make Circle extend Shape (super, area override, describe via super.describe()), then let the loop dispatch polymorphically.",

		starter: [
			'class Shape {',
			'  constructor(name) {',
			'    this.name = name;',
			'  }',
			'  area() {',
			'    return 0;',
			'  }',
			'  describe() {',
			"    return this.name + ' area ' + this.area().toFixed(2);",
			'  }',
			'}',
			'',
			'// TODO: make this `class Circle extends Shape`:',
			"//   - constructor(r) calls super('circle') BEFORE touching this",
			'//   - override area() to return Math.PI * this.r * this.r',
			"//   - override describe() to return super.describe() + ' (r=' + this.r + ')'",
			'class Circle {',
			'  constructor(r) {',
			"    this.name = 'circle';  // duplicates what Shape's constructor does",
			'    this.r = r;',
			'  }',
			'  describe() {',
			'    // Copy-pasted formatting — already drifting from Shape (no',
			'    // area() hook, no shared wording) and no super to lean on.',
			"    return this.name + ' area ' + (Math.PI * this.r * this.r).toFixed(2);",
			'  }',
			'}',
			'',
			'class Rect extends Shape {',
			'  constructor(w, h) {',
			"    super('rect');",
			'    this.w = w;',
			'    this.h = h;',
			'  }',
			'  area() {',
			'    return this.w * this.h;',
			'  }',
			'}',
			'',
			'const shapes = [new Circle(5), new Rect(3, 4)];',
			'let total = 0;',
			'for (const s of shapes) {',
			'  // TODO: delete this if/else chain — call s.describe() and s.area()',
			'  // once; dynamic dispatch picks the right override per shape.',
			'  if (s instanceof Rect) {',
			'    console.log(s.describe());',
			'    total += s.area();',
			'  } else if (s instanceof Circle) {',
			'    console.log(s.describe());',
			'    total += Math.PI * s.r * s.r;  // the circle math AGAIN — a third copy',
			'  }',
			'}',
			"console.log('total area:', total.toFixed(2));",
			"console.log('circle is a Shape:', shapes[0] instanceof Shape);",
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('circle area 78.54 (r=5)') !== -1 &&
				flat.indexOf('rect area 12.00') !== -1 &&
				flat.indexOf('total area: 90.54') !== -1 &&
				flat.indexOf('circle is a Shape: true') !== -1;
		},

		solution: [
			'class Shape {',
			'  constructor(name) {',
			'    this.name = name;',
			'  }',
			'  area() {',
			'    return 0;',
			'  }',
			'  describe() {',
			"    return this.name + ' area ' + this.area().toFixed(2);",
			'  }',
			'}',
			'',
			'class Circle extends Shape {',
			'  constructor(r) {',
			"    // super() runs Shape's constructor FIRST — the base is what",
			'    // actually constructs the object; `this` exists only after it.',
			"    super('circle');",
			'    this.r = r;',
			'  }',
			'  area() {',
			'    return Math.PI * this.r * this.r;',
			'  }',
			'  describe() {',
			'    // Extend, not replace: reuse the base wording, append detail.',
			"    return super.describe() + ' (r=' + this.r + ')';",
			'  }',
			'}',
			'',
			'class Rect extends Shape {',
			'  constructor(w, h) {',
			"    super('rect');",
			'    this.w = w;',
			'    this.h = h;',
			'  }',
			'  area() {',
			'    return this.w * this.h;',
			'  }',
			'}',
			'',
			'const shapes = [new Circle(5), new Rect(3, 4)];',
			'let total = 0;',
			'for (const s of shapes) {',
			'  // One call site; dynamic dispatch finds each override. Adding a',
			'  // Triangle tomorrow requires zero edits here.',
			'  console.log(s.describe());',
			'  total += s.area();',
			'}',
			"console.log('total area:', total.toFixed(2));",
			"console.log('circle is a Shape:', shapes[0] instanceof Shape);",
			'',
		].join('\n'),
	});
})();
