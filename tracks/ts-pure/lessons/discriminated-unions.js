/* Discriminated Unions — the modeling pattern at the center of idiomatic
 * TypeScript: a shared literal `kind` tag, a switch that narrows on it, and
 * a `never` default that turns "forgot to handle a case" into a compile
 * error. The exercise installs the full pattern including the exhaustiveness
 * guard, which is the part people skip and then wish they hadn't.
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	// The union splitting on its tag: one diagram for the whole mental model.
	// Marker id is namespaced (dgArrowTSDU) because every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="switch on shape.kind splits the union into its members">' +
		'<text x="20" y="22" class="lbl">switch (shape.kind) — the tag routes each value to a branch that knows its exact shape</text>' +
		// union box
		'<rect x="30" y="70" width="150" height="60" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="105" y="96" text-anchor="middle">Shape</text>' +
		'<text x="105" y="114" text-anchor="middle" class="lbl">circle | rect</text>' +
		// branch: circle
		'<rect x="330" y="42" width="160" height="52" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="410" y="64" text-anchor="middle">kind: "circle"</text>' +
		'<text x="410" y="82" text-anchor="middle" class="lbl">r is visible here</text>' +
		'<path d="M 182 88 L 326 66" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowTSDU)"/>' +
		// branch: rect
		'<rect x="330" y="112" width="160" height="52" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="410" y="134" text-anchor="middle">kind: "rect"</text>' +
		'<text x="410" y="152" text-anchor="middle" class="lbl">w and h are visible here</text>' +
		'<path d="M 182 112 L 326 136" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowTSDU)"/>' +
		// never
		'<text x="105" y="168" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">anything left over: never</text>' +
		'<defs><marker id="dgArrowTSDU" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	T.lesson({
		id: 'discriminated-unions',
		title: 'Discriminated Unions',
		nav: 'discriminated unions',
		category: 'Unions & Narrowing',

		prose: [
			'<h2>Discriminated Unions</h2>' +
			'<p>Give every member of a union a shared literal property — ' +
			'conventionally <code>kind</code> or <code>type</code> — and narrowing ' +
			'becomes surgical. This is how TypeScript models "one of several ' +
			'structured things": API responses, editor events, AST nodes, Redux ' +
			'actions, all of it:</p>',
			{ lang: 'ts', code: 'type Shape =\n  | { kind: "circle"; r: number }\n  | { kind: "rect"; w: number; h: number };' },
			DIAGRAM +
			'<p>Switching on the tag narrows each branch to exactly one member — ' +
			'inside <code>case "circle":</code> the value <em>has</em> an ' +
			'<code>r</code>, and mentioning <code>w</code> there is a compile ' +
			'error.</p>' +
			'<p>The pattern is completed by an <strong>exhaustiveness check</strong>. ' +
			'<code>never</code> is the type with no values — and in a default branch ' +
			'after every case is handled, that is precisely what is left over:</p>',
			{ lang: 'ts', code: 'default: {\n  const leftover: never = shape; // compiles ONLY if no member remains\n  throw new Error("unreachable: " + JSON.stringify(leftover));\n}' },
			'<p>Now adding <code>{ kind: "triangle"; ... }</code> to the union makes ' +
			'this assignment fail to compile in <em>every</em> switch that forgot the ' +
			'new case — the compiler hands you the complete to-do list for the ' +
			'feature.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter computes circle areas and silently returns 0 for ' +
			'everything else. Handle <code>"rect"</code> properly, then replace the ' +
			'lazy default with the <code>never</code> exhaustiveness guard shown ' +
			'above. Order matters and the checker enforces it: add the guard while ' +
			'<code>rect</code> is still unhandled and the leftover member makes the ' +
			'<code>never</code> assignment a type error.</p>',
		],

		task: 'Handle "rect" (w * h), then make the default branch a never-typed exhaustiveness guard.',

		starter: [
			'type Shape =',
			'  | { kind: "circle"; r: number }',
			'  | { kind: "rect"; w: number; h: number };',
			'',
			'function area(shape: Shape): number {',
			'  switch (shape.kind) {',
			'    case "circle":',
			'      return Math.round(Math.PI * shape.r * shape.r);',
			'    // TODO: case "rect" is w * h',
			'    default:',
			'      // TODO: replace with the never guard — this 0 is exactly the',
			'      // silent bug the pattern exists to make impossible.',
			'      return 0;',
			'  }',
			'}',
			'',
			'const shapes: Shape[] = [',
			'  { kind: "circle", r: 2 },',
			'  { kind: "rect", w: 3, h: 4 },',
			'];',
			'for (const s of shapes) {',
			'  console.log(s.kind, "area", area(s));',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('circle area 13') !== -1 &&
				flat.indexOf('rect area 12') !== -1;
		},

		solution: [
			'type Shape =',
			'  | { kind: "circle"; r: number }',
			'  | { kind: "rect"; w: number; h: number };',
			'',
			'function area(shape: Shape): number {',
			'  switch (shape.kind) {',
			'    case "circle":',
			'      // Narrowed: shape is the circle member, so .r exists.',
			'      return Math.round(Math.PI * shape.r * shape.r);',
			'    case "rect":',
			'      return shape.w * shape.h;',
			'    default: {',
			'      // Every member is handled above, so what reaches here is',
			'      // never — and never is assignable to never. Add a triangle',
			'      // to Shape and this line becomes the compile error that',
			'      // points you straight at the switch to update.',
			'      const leftover: never = shape;',
			'      throw new Error("unreachable: " + JSON.stringify(leftover));',
			'    }',
			'  }',
			'}',
			'',
			'const shapes: Shape[] = [',
			'  { kind: "circle", r: 2 },',
			'  { kind: "rect", w: 3, h: 4 },',
			'];',
			'for (const s of shapes) {',
			'  console.log(s.kind, "area", area(s));',
			'}',
			'',
		].join('\n'),
	});
})();
