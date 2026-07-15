/* Interfaces & Intersections — interface vs type alias, extends, the &
 * operator, and the deeper idea underneath all of it: structural typing.
 * TypeScript compares shapes, not names — the diagram carries that point,
 * and the exercise composes two small shapes into a bigger one.
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	// Structural typing: a nameless object sliding into a Point-shaped hole.
	// Marker id namespaced (dgArrowTSST) — every track's SVGs share the page.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 170" width="520" height="170" role="img" aria-label="structural typing: any value with the right fields fits the interface">' +
		'<text x="20" y="22" class="lbl">structural typing — compatibility is decided by fields, not by declared names</text>' +
		// the "hole" (interface)
		'<rect x="330" y="52" width="160" height="84" rx="6" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 4"/>' +
		'<text x="410" y="76" text-anchor="middle">interface Point</text>' +
		'<text x="410" y="98" text-anchor="middle" class="lbl">x: number</text>' +
		'<text x="410" y="116" text-anchor="middle" class="lbl">y: number</text>' +
		// the value
		'<rect x="40" y="52" width="180" height="84" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="130" y="76" text-anchor="middle">{ x: 3, y: 4, name: "hq" }</text>' +
		'<text x="130" y="98" text-anchor="middle" class="lbl">never declared itself a Point</text>' +
		'<text x="130" y="116" text-anchor="middle" class="lbl">has the fields → it fits</text>' +
		'<path d="M 226 94 L 324 94" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowTSST)"/>' +
		'<defs><marker id="dgArrowTSST" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	T.lesson({
		id: 'interfaces-intersections',
		title: 'Interfaces & Intersections',
		nav: 'interfaces & &',
		category: 'Objects & Classes',

		prose: [
			'<h2>Interfaces &amp; Intersections</h2>' +
			'<p>An <code>interface</code> is the other way to name an object shape. ' +
			'For everyday use it is interchangeable with a <code>type</code> alias — ' +
			'pick one style per codebase and move on. The practical differences: ' +
			'interfaces can be reopened (declaration merging, how libraries let you ' +
			'augment their types), extend with <code>extends</code>, and produce ' +
			'slightly friendlier error messages; aliases can name <em>anything</em>, ' +
			'including unions and tuples, which interfaces cannot.</p>',
			{ lang: 'ts', code: 'interface Point { x: number; y: number }\ninterface Point3D extends Point { z: number }\n\ntype Named = { label: string };\ntype LabeledPoint = Point & Named;   // intersection: has ALL fields of both' },
			'<p><code>extends</code> and the intersection operator <code>&amp;</code> ' +
			'both compose shapes; <code>&amp;</code> works on aliases and inline, ' +
			'which makes it the everyday glue for "this thing, plus these extra ' +
			'fields".</p>' +
			'<p>Underneath sits the rule that makes TypeScript feel different from ' +
			'Java or C#: typing is <strong>structural</strong>. A value never has to ' +
			'declare that it implements an interface — if it has the fields, it ' +
			'fits. (Go developers know this exact idea from interfaces being ' +
			'satisfied implicitly.)</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Build <code>LabeledPoint</code> as the intersection of ' +
			'<code>Point</code> and <code>Named</code>, then upgrade ' +
			'<code>describe</code> to take one and include its label. The origin ' +
			'object already carries a <code>label</code> field — structurally, it ' +
			'was a <code>LabeledPoint</code> all along.</p>',
		],

		task: 'Define LabeledPoint = Point & Named and make describe print "origin at (0, 0)".',

		starter: [
			'interface Point {',
			'  x: number;',
			'  y: number;',
			'}',
			'',
			'type Named = { label: string };',
			'',
			'// TODO: type LabeledPoint = the intersection of Point and Named',
			'',
			'// TODO: take a LabeledPoint and lead with its label:',
			'//   "<label> at (<x>, <y>)"',
			'function describe(p: Point): string {',
			'  return "(" + p.x + ", " + p.y + ")";',
			'}',
			'',
			'// origin never declares itself a Point or a Named — it just has the',
			'// fields. (It sits in a variable because a FRESH literal argument',
			'// gets the stricter excess-property check from the Object Types',
			'// lesson; via a variable, plain structural compatibility applies.)',
			'const origin = { x: 0, y: 0, label: "origin" };',
			'console.log(describe(origin));',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('origin at (0, 0)') !== -1;
		},

		solution: [
			'interface Point {',
			'  x: number;',
			'  y: number;',
			'}',
			'',
			'type Named = { label: string };',
			'',
			'// Intersection: a LabeledPoint has x, y, AND label. Equivalent to',
			'// `interface LabeledPoint extends Point { label: string }` — & just',
			'// composes without a declaration.',
			'type LabeledPoint = Point & Named;',
			'',
			'function describe(p: LabeledPoint): string {',
			'  return p.label + " at (" + p.x + ", " + p.y + ")";',
			'}',
			'',
			'// origin never declares itself a Point or a Named — it just has the',
			'// fields; the shape alone decides fit.',
			'const origin = { x: 0, y: 0, label: "origin" };',
			'console.log(describe(origin));',
			'',
		].join('\n'),
	});
})();
