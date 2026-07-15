/* Generic Functions — type parameters, inference at the call site, and
 * constraints with extends. The exercise generifies a string-only helper;
 * the numeric call site with .toFixed() is what makes T load-bearing (an
 * unknown-returning version fails, and `any` is called out as the trap).
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	// T flowing in from the argument and back out to the result — inference
	// as a picture. Marker id namespaced (dgArrowTSG).
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 150" width="520" height="150" role="img" aria-label="the type argument flows from input to output through T">' +
		'<text x="20" y="22" class="lbl">first(["a","b"], "?") — T is inferred once, then links input and output</text>' +
		'<rect x="30" y="52" width="130" height="46" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="95" y="72" text-anchor="middle">string[]</text>' +
		'<text x="95" y="90" text-anchor="middle" class="lbl">argument</text>' +
		'<rect x="200" y="52" width="120" height="46" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="260" y="72" text-anchor="middle">T = string</text>' +
		'<text x="260" y="90" text-anchor="middle" class="lbl">inferred</text>' +
		'<rect x="360" y="52" width="130" height="46" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="425" y="72" text-anchor="middle">string</text>' +
		'<text x="425" y="90" text-anchor="middle" class="lbl">result</text>' +
		'<path d="M 164 75 L 196 75" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowTSG)"/>' +
		'<path d="M 324 75 L 356 75" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowTSG)"/>' +
		'<text x="260" y="128" text-anchor="middle" class="lbl">call it with number[] and every box says number — one definition, every element type</text>' +
		'<defs><marker id="dgArrowTSG" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	T.lesson({
		id: 'generics',
		title: 'Generic Functions',
		nav: 'generic functions',
		category: 'Generics',

		prose: [
			'<h2>Generic Functions</h2>' +
			'<p>A helper that works "for any element type" needs a name for that ' +
			'type. A <strong>type parameter</strong> in angle brackets is that name, ' +
			'and using it in both a parameter and the return type is what ties them ' +
			'together:</p>',
			{ lang: 'ts', code: 'function first<T>(xs: T[], fallback: T): T {\n  return xs.length > 0 ? xs[0] : fallback;\n}\n\nconst w = first(["go", "ts"], "?");   // T inferred as string — w: string\nconst n = first([2.5, 8], 0);          // T inferred as number — n: number' },
			DIAGRAM +
			'<p>You almost never write <code>first&lt;string&gt;(...)</code> — ' +
			'inference reads the arguments and solves for <code>T</code>. The ' +
			'discipline generics buy: the <em>relationship</em> ("what goes in is ' +
			'what comes out") is enforced, so the result is immediately usable as ' +
			'its real type.</p>' +
			'<p>When the body needs to <em>do</em> something with a ' +
			'<code>T</code>, constrain it. <code>extends</code> here means "T must ' +
			'at least have this shape":</p>',
			{ lang: 'ts', code: 'function longest<T extends { length: number }>(a: T, b: T): T {\n  return a.length >= b.length ? a : b;\n}\nlongest("hi", "there");    // strings have length — ok\nlongest(10, 20);           // error TS2345: number has no length' },
			'<h3>Your job</h3>' +
			'<p><code>firstOrDefault</code> only handles strings, and the new call ' +
			'site needs numbers — <code>.toFixed(1)</code> on the result. Make the ' +
			'function generic. The wrong shortcut is typing it with ' +
			'<code>any</code>: that compiles too, but the result stops being ' +
			'checked at all (misspell <code>toFixed</code> and nothing complains). ' +
			'<code>T</code> keeps the checking; <code>any</code> abandons it.</p>',
		],

		task: 'Make firstOrDefault generic over T so the number call site type-checks.',

		starter: [
			'// String-only today. TODO: introduce <T> and use it for the array,',
			'// the fallback, and the return — then the number call below works.',
			'function firstOrDefault(xs: string[], fallback: string): string {',
			'  return xs.length > 0 ? xs[0] : fallback;',
			'}',
			'',
			'console.log("first word:", firstOrDefault(["go", "ts"], "?"));',
			'',
			'// TODO: uncomment once generic — with string[] hardcoded this call',
			'// is a type error, which is the checker asking for the upgrade.',
			'// const n = firstOrDefault([2.5, 8.1], 0);',
			'// console.log("first num:", n.toFixed(1));',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('first word: go') !== -1 &&
				flat.indexOf('first num: 2.5') !== -1;
		},

		solution: [
			'// One type parameter, used three times — that reuse IS the contract:',
			'// array elements, fallback, and result are all the same T.',
			'function firstOrDefault<T>(xs: T[], fallback: T): T {',
			'  return xs.length > 0 ? xs[0] : fallback;',
			'}',
			'',
			'console.log("first word:", firstOrDefault(["go", "ts"], "?"));',
			'',
			'// T inferred as number, so n: number and toFixed type-checks.',
			'const n = firstOrDefault([2.5, 8.1], 0);',
			'console.log("first num:", n.toFixed(1));',
			'',
		].join('\n'),
	});
})();
