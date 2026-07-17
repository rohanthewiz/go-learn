/* this & Binding — `this` is chosen at the CALL SITE, not at definition:
 * method call, plain call (undefined in strict mode), explicit call/apply/
 * bind, and `new`; arrows have no `this` of their own and inherit lexically.
 * The starter runs clean yet demonstrates both classic failures behind
 * try/catch guards (extracted method, regular-function callback), printing
 * `lost this: TypeError`. The check demands the fixed outputs — a SECOND
 * "Rex says woof" from the bound extraction and the roster line the arrow
 * callback builds from this.size — and asserts `lost this:` is gone.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// One function, two call sites, two different `this` values — the whole
	// lesson in one picture. Marker id namespaced (dgArrowJSTH): SVG ids are
	// global across the page.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-label="the same function gets a different this depending on how it is called">' +
		'<text x="20" y="22" class="lbl">one function — this is decided by HOW it is called, every time</text>' +
		'<rect x="30" y="82" width="160" height="54" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="110" y="104" text-anchor="middle">function speak()</text>' +
		'<text x="110" y="124" text-anchor="middle" class="lbl">…this.name…</text>' +
		// call site 1: through the object
		'<rect x="330" y="46" width="170" height="54" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="415" y="68" text-anchor="middle">dog.speak()</text>' +
		'<text x="415" y="88" text-anchor="middle" class="lbl">this = dog</text>' +
		'<path d="M 194 98 L 326 76" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSTH)"/>' +
		// call site 2: extracted, plain call
		'<rect x="330" y="120" width="170" height="54" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="415" y="142" text-anchor="middle">speak()</text>' +
		'<text x="415" y="162" text-anchor="middle" class="lbl">this = undefined (strict)</text>' +
		'<path d="M 194 120 L 326 144" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSTH)"/>' +
		'<defs><marker id="dgArrowJSTH" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	J.lesson({
		id: 'this-binding',
		title: 'this & Binding',
		nav: 'this & binding',
		category: 'Functions in Depth',

		prose: [
			'<h2><code>this</code> &amp; Binding</h2>' +
			'<p>Unlike every variable you have met so far, <code>this</code> is ' +
			'<strong>not</strong> resolved lexically. A regular function\'s ' +
			'<code>this</code> is decided fresh at each <strong>call site</strong> ' +
			'— by <em>how</em> the function is called, never by where it was ' +
			'defined. Four rules cover every call in the language, checked in ' +
			'this order:</p>',
			{ lang: 'js', code: 'obj.m();          // 1. method call: this = obj (the receiver before the dot)\nf();              // 2. plain call:  this = undefined in strict mode\nf.call(x, a);     // 3. explicit:    this = x (apply is the same, args as array;\n                  //    f.bind(x) returns a copy with this locked to x forever)\nnew F();          // 4. new: this = the freshly created object' },
			DIAGRAM +
			'<p>Rule 2 plus rule 1 produce the classic <strong>extracted-method ' +
			'bug</strong>: <code>const f = obj.m; f()</code>. The property lookup ' +
			'and the call are now separate — by the time <code>f()</code> runs, ' +
			'nothing remembers <code>obj</code>, so <code>this</code> is ' +
			'<code>undefined</code> and <code>this.name</code> throws a ' +
			'<code>TypeError</code>. (Before strict mode, <code>this</code> ' +
			'silently defaulted to the global object — quieter, and far worse. ' +
			'This runner is always strict, so you get the honest error.) The fix ' +
			'is rule 3: <code>obj.m.bind(obj)</code> returns a copy with the ' +
			'receiver baked in, immune to how it is later called.</p>' +
			'<p><strong>Arrow functions opt out entirely.</strong> An arrow has ' +
			'no <code>this</code> of its own — using <code>this</code> inside one ' +
			'reaches out to the enclosing scope, exactly like any other variable. ' +
			'That makes arrows perfect as <em>callbacks inside methods</em> (they ' +
			'inherit the method\'s <code>this</code>) and wrong <em>as</em> ' +
			'methods (they would inherit the outer scope\'s, never the ' +
			'receiver):</p>',
			{ lang: 'js', code: 'const team = {\n  size: 3,\n  roster() {\n    return this.members.map(m => this.size + " " + m); // arrow: this = roster\'s\n  },\n};\n// vs. map(function (m) { return this.size ... }) — its OWN this: undefined' },
			'<h3>Your job</h3>' +
			'<p>The starter runs clean but both bugs fire inside ' +
			'<code>try/catch</code> guards, printing <code>lost this: ' +
			'TypeError</code> twice. Fix the extracted <code>speak</code> with ' +
			'<code>dog.speak.bind(dog)</code>, and fix the <code>map</code> ' +
			'callback in <code>describe</code> by making it an arrow function. ' +
			'Done right, both guarded lines disappear and the real output ' +
			'appears.</p>' +
			'<div class="tip">Leave the <code>try/catch</code> blocks in place — ' +
			'once fixed they simply never catch. The checker rejects any output ' +
			'still containing <code>lost this:</code>.</div>',
		],

		task: 'Fix the extracted method with .bind(dog) and the map callback with an arrow function.',

		starter: [
			'const dog = {',
			'  name: "Rex",',
			'  speak: function () {',
			'    console.log(this.name + " says woof");',
			'  },',
			'};',
			'',
			'dog.speak();  // rule 1 — method call: this = dog',
			'',
			'// TODO: extraction separates lookup from call, so this = undefined',
			'// (strict). Bind the receiver: const speak = dog.speak.bind(dog);',
			'const speak = dog.speak;',
			'try {',
			'  speak();    // rule 2 — plain call',
			'} catch (e) {',
			'  console.log("lost this:", e.name);',
			'}',
			'',
			'const team = {',
			'  size: 3,',
			'  members: ["Ann", "Bo", "Cy"],',
			'  describe: function () {',
			'    // TODO: a regular `function` callback gets its OWN this',
			'    // (undefined here) — make it an arrow so it inherits describe\'s.',
			'    const tagged = this.members.map(function (m, i) {',
			'      return (i + 1) + "/" + this.size + " " + m;',
			'    });',
			'    return tagged.join(", ");',
			'  },',
			'};',
			'try {',
			'  console.log("team:", team.describe());',
			'} catch (e) {',
			'  console.log("lost this:", e.name);',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('lost this:') === -1 &&
				flat.indexOf('Rex says woof') !== -1 &&
				// two occurrences: the method call AND the bound extraction
				flat.indexOf('Rex says woof') !== flat.lastIndexOf('Rex says woof') &&
				flat.indexOf('team: 1/3 Ann, 2/3 Bo, 3/3 Cy') !== -1;
		},

		solution: [
			'const dog = {',
			'  name: "Rex",',
			'  speak: function () {',
			'    console.log(this.name + " says woof");',
			'  },',
			'};',
			'',
			'dog.speak();  // rule 1 — method call: this = dog',
			'',
			'// bind bakes the receiver into a copy (rule 3): however this copy is',
			'// called later — plainly, as a callback, from anywhere — this = dog.',
			'const speak = dog.speak.bind(dog);',
			'try {',
			'  speak();    // still a plain call, but the binding already won',
			'} catch (e) {',
			'  console.log("lost this:", e.name);',
			'}',
			'',
			'const team = {',
			'  size: 3,',
			'  members: ["Ann", "Bo", "Cy"],',
			'  describe: function () {',
			'    // Arrow: no own this, so `this` resolves lexically to',
			'    // describe\'s — which is team, because describe is called',
			'    // as team.describe(). Exactly why arrows fit callbacks.',
			'    const tagged = this.members.map((m, i) => {',
			'      return (i + 1) + "/" + this.size + " " + m;',
			'    });',
			'    return tagged.join(", ");',
			'  },',
			'};',
			'try {',
			'  console.log("team:", team.describe());',
			'} catch (e) {',
			'  console.log("lost this:", e.name);',
			'}',
			'',
		].join('\n'),
	});
})();
