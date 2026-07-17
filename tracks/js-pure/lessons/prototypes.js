/* Prototypes — the hidden [[Prototype]] link and the property-read walk
 * that IS JavaScript inheritance. The exercise forces the core refactor:
 * hoist duplicated per-object methods into one shared behavior object,
 * link instances with Object.create, then prove the read/write asymmetry
 * (shadowing) and own-vs-inherited with Object.hasOwn. The check pins a
 * live prototype link and an inherited (non-own) method, so copying the
 * function onto each instance cannot pass.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// The lookup walk, top to bottom. Marker id is namespaced (dgArrowJSPR)
	// because every track's inline SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 262" width="520" height="262" role="img" aria-label="Property reads on rex walk the prototype chain: rex, then dogBehavior, then Object.prototype, then null">' +
		'<text x="20" y="20" class="lbl">every property READ walks this chain, top to bottom, until found — or null</text>' +
		// rex
		'<rect x="30" y="34" width="200" height="46" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="130" y="53" text-anchor="middle">rex</text>' +
		'<text x="130" y="70" text-anchor="middle" class="lbl">own: name, sound</text>' +
		'<text x="250" y="57" fill="var(--ok)">rex.name &#8594; found here (own)</text>' +
		'<path d="M 130 80 L 130 96" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSPR)"/>' +
		'<text x="140" y="94" class="lbl">[[Prototype]]</text>' +
		// dogBehavior
		'<rect x="30" y="102" width="200" height="46" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="130" y="121" text-anchor="middle">dogBehavior</text>' +
		'<text x="130" y="138" text-anchor="middle" class="lbl">describe()</text>' +
		'<text x="250" y="125" fill="var(--ok)">rex.describe &#8594; found here</text>' +
		'<path d="M 130 148 L 130 164" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSPR)"/>' +
		'<text x="140" y="162" class="lbl">[[Prototype]]</text>' +
		// Object.prototype
		'<rect x="30" y="170" width="200" height="46" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="130" y="189" text-anchor="middle">Object.prototype</text>' +
		'<text x="130" y="206" text-anchor="middle" class="lbl">toString(), hasOwnProperty()</text>' +
		'<text x="250" y="193" fill="var(--ok)">rex.toString &#8594; found here</text>' +
		'<path d="M 130 216 L 130 232" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSPR)"/>' +
		'<text x="140" y="230" class="lbl">[[Prototype]]</text>' +
		// null — end of the chain
		'<text x="130" y="252" text-anchor="middle">null</text>' +
		'<text x="250" y="252" class="lbl">rex.nope &#8594; undefined (not an error)</text>' +
		'<defs><marker id="dgArrowJSPR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	J.lesson({
		id: 'prototypes',
		title: 'Prototypes',
		nav: 'prototypes',
		category: 'Prototypes & Classes',

		prose: [
			'<h2>Prototypes</h2>' +
			'<p>Every JavaScript object carries one hidden link, written ' +
			'<code>[[Prototype]]</code> in the spec, pointing at another object ' +
			'(or <code>null</code>). When you <em>read</em> a property that the ' +
			'object does not have itself, the engine follows that link and looks ' +
			'again — and again — until it finds the name or hits ' +
			'<code>null</code> (then the read is <code>undefined</code>). That ' +
			'walk is the <strong>entire</strong> inheritance mechanism of the ' +
			'language. Classes, which you will meet next lesson, are syntax over ' +
			'exactly this.</p>',
			{ lang: 'js', code: "const dogBehavior = {\n  describe() { return this.name + ': ' + this.sound; },\n};\n\n// Object.create(proto) builds the link directly: a fresh empty object\n// whose [[Prototype]] is dogBehavior.\nconst rex = Object.create(dogBehavior);\nrex.name = 'Rex';     // own data lives on the instance\nrex.sound = 'woof';\n\nrex.describe();       // 'Rex: woof' — not own; found one hop up the chain\nObject.getPrototypeOf(rex) === dogBehavior;  // true — inspect the link" },
			DIAGRAM +
			'<p>Why bother? One <code>describe</code> function object serves a ' +
			'thousand dogs. Copying the method onto every instance costs memory ' +
			'and — worse — invites <em>drift</em>: fix the wording in one copy ' +
			'and the others silently disagree. Behavior belongs in one shared ' +
			'place; instances hold only their own data.</p>' +
			'<p>The crucial asymmetry: only <em>reads</em> walk the chain. ' +
			'<strong>Writes never do</strong> — assigning ' +
			'<code>rex.describe = ...</code> creates an <em>own</em> property on ' +
			'<code>rex</code> that <strong>shadows</strong> the inherited one. ' +
			'The prototype is untouched; every other dog still sees the shared ' +
			'method. That is also why mutating via an instance can never ' +
			'accidentally rewrite shared behavior.</p>',
			{ lang: 'js', code: "fifi.describe = function () { return this.name + ': yip!'; };\n// ^ write -> OWN property on fifi; dogBehavior.describe is untouched.\n\nObject.hasOwn(fifi, 'describe');  // true  — fifi shadows it\nObject.hasOwn(rex, 'describe');   // false — rex still inherits it\nObject.hasOwn(rex, 'name');       // true  — data is own" },
			'<p><code>Object.hasOwn(obj, key)</code> is the modern replacement ' +
			'for <code>obj.hasOwnProperty(key)</code> (it works even on objects ' +
			'that shadow <code>hasOwnProperty</code> or were created with a ' +
			'<code>null</code> prototype). You need it because some tools see ' +
			'inherited properties and some do not: <code>for...in</code> walks ' +
			'inherited enumerable keys too — a classic trap — while ' +
			'<code>Object.keys</code> lists own keys only.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter builds two dogs that each carry their <em>own copy</em> ' +
			'of <code>describe</code>. Hoist the method into one shared ' +
			'<code>dogBehavior</code> object, rebuild <code>rex</code> and ' +
			'<code>fifi</code> with <code>Object.create(dogBehavior)</code>, then ' +
			'shadow <em>only</em> <code>fifi</code> with an own method returning ' +
			'<code>this.name + \': yip!\'</code>. The prints prove the chain: rex ' +
			'must share the prototype&#39;s <code>describe</code> (so ' +
			'<code>hasOwn describe</code> is <code>false</code> for him) while ' +
			'fifi&#39;s shadow yips.</p>' +
			'<div class="tip">Assigning <code>fifi.describe = ...</code> right ' +
			'after <code>Object.create</code> is not a mistake here — it is the ' +
			'point. Watch which of the five printed lines change and which ' +
			'don&#39;t.</div>',
		],

		task: 'Share describe via one dogBehavior object + Object.create, then shadow only fifi.',

		starter: [
			'// Every dog carries its OWN copy of describe. Two problems:',
			'//   1) memory — N dogs mean N identical function objects;',
			'//   2) drift — fix the wording in one and the others silently disagree.',
			'var rex = {',
			"  name: 'Rex',",
			"  sound: 'woof',",
			"  describe: function () { return this.name + ': ' + this.sound; },",
			'};',
			'var fifi = {',
			"  name: 'Fifi',",
			"  sound: 'woof',",
			"  describe: function () { return this.name + ': ' + this.sound; },",
			'};',
			'',
			'// TODO: hoist describe into ONE shared object:',
			'//   var dogBehavior = { describe: function () { ... } };',
			'// then rebuild rex and fifi with Object.create(dogBehavior),',
			'// assigning name/sound as own data on each instance.',
			'',
			'// TODO: shadow ONLY fifi with an own method:',
			"//   fifi.describe = function () { return this.name + ': yip!'; };",
			'',
			'console.log(rex.describe());',
			'console.log(fifi.describe());',
			"console.log('shares proto describe:', rex.describe === Object.getPrototypeOf(fifi).describe);",
			"console.log('hasOwn name:', Object.hasOwn(rex, 'name'));",
			"console.log('hasOwn describe:', Object.hasOwn(rex, 'describe'));",
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('Rex: woof') !== -1 &&
				flat.indexOf('Fifi: yip!') !== -1 &&
				flat.indexOf('shares proto describe: true') !== -1 &&
				flat.indexOf('hasOwn name: true') !== -1 &&
				flat.indexOf('hasOwn describe: false') !== -1;
		},

		solution: [
			'// One shared home for behavior. Fix describe here, every dog picks',
			'// it up — one function object, zero drift.',
			'var dogBehavior = {',
			"  describe: function () { return this.name + ': ' + this.sound; },",
			'};',
			'',
			'// Object.create builds the [[Prototype]] link directly: each dog is',
			'// a small object of own DATA whose reads fall through to dogBehavior.',
			'var rex = Object.create(dogBehavior);',
			"rex.name = 'Rex';",
			"rex.sound = 'woof';",
			'',
			'var fifi = Object.create(dogBehavior);',
			"fifi.name = 'Fifi';",
			"fifi.sound = 'woof';",
			'',
			'// Writes never walk the chain: this creates an OWN property that',
			'// SHADOWS the inherited one. dogBehavior (and rex) are untouched.',
			"fifi.describe = function () { return this.name + ': yip!'; };",
			'',
			'console.log(rex.describe());',
			'console.log(fifi.describe());',
			"console.log('shares proto describe:', rex.describe === Object.getPrototypeOf(fifi).describe);",
			"console.log('hasOwn name:', Object.hasOwn(rex, 'name'));",
			"console.log('hasOwn describe:', Object.hasOwn(rex, 'describe'));",
			'',
		].join('\n'),
	});
})();
