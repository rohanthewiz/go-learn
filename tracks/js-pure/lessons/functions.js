/* Functions — the three ways to write one (declaration, expression,
 * arrow), plus the modern parameter toolkit: defaults and rest. The
 * exercise converts a verbose ES5-style expression into a one-line arrow
 * with a default parameter, and widens a fixed two-arg sum into a
 * rest-parameter fold. The check pins "hi, world" (only reachable when
 * the default kicks in — the starter prints "hi, undefined"), "hi, Ada"
 * (an explicit argument must still win), and "sum: 10" from sum(1,2,3,4)
 * (impossible with fixed parameters), and asserts "undefined" never
 * appears in the output. */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// Marker id is namespaced (dgArrowJSFN) because every lesson's SVGs
	// share the page's global id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 170" width="520" height="170" role="img" aria-label="default parameters fill missing arguments; rest parameters pack the extras into a real array">' +
		'<text x="20" y="24" class="lbl">defaults fill the gaps at the call site; rest packs whatever is left over</text>' +
		// row 1: default parameter
		'<rect x="30" y="48" width="170" height="44" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="115" y="75" text-anchor="middle">greet("hi")</text>' +
		'<rect x="320" y="48" width="170" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="405" y="68" text-anchor="middle">who = "world"</text>' +
		'<text x="405" y="85" text-anchor="middle" class="lbl">default: evaluated this call</text>' +
		'<path d="M 204 70 L 316 70" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSFN)"/>' +
		// row 2: rest parameter
		'<rect x="30" y="108" width="170" height="44" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="115" y="135" text-anchor="middle">sum(1, 2, 3, 4)</text>' +
		'<rect x="320" y="108" width="170" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="405" y="128" text-anchor="middle">nums = [1, 2, 3, 4]</text>' +
		'<text x="405" y="145" text-anchor="middle" class="lbl">rest: a real array</text>' +
		'<path d="M 204 130 L 316 130" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSFN)"/>' +
		'<defs><marker id="dgArrowJSFN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	J.lesson({
		id: 'functions',
		title: 'Functions',
		nav: 'functions',
		category: 'Foundations',

		prose: [
			'<h2>Functions</h2>' +
			'<p>JavaScript gives you three ways to write the same function — ' +
			'a historical accident that turned into an ergonomic choice. All ' +
			'three produce a callable value; they differ in <em>when</em> the ' +
			'name exists and how much you have to type:</p>',
			{ lang: 'js', code: '// 1. Declaration — HOISTED: callable before its line appears\nfunction add(a, b) { return a + b; }\n\n// 2. Expression — a value assigned to a name, usable only after\nconst sub = function (a, b) { return a - b; };\n\n// 3. Arrow (ES2015) — terse; one expression means implicit return\nconst mul = (a, b) => a * b;' },
			'<p>Declarations are <strong>hoisted</strong>: the engine registers ' +
			'the whole function before running the file, so you can call ' +
			'<code>add</code> above its definition — handy for putting the main ' +
			'flow at the top and helpers below. Expressions and arrows are just ' +
			'values bound with <code>const</code>, so they follow normal ' +
			'top-to-bottom rules. Arrows won the callback wars because a ' +
			'one-expression body needs no braces and no <code>return</code>: ' +
			'<code>n =&gt; n * 2</code> says exactly what it does. (Arrows have ' +
			'one deeper difference — no <code>this</code> of their own — which ' +
			'gets its own lesson later.)</p>' +
			'<p>Parameters grew up in ES2015 too. A <strong>default</strong> is ' +
			'an expression evaluated <em>per call</em>, only when the argument ' +
			'is missing or <code>undefined</code> — and it may reference earlier ' +
			'parameters. A <strong>rest</strong> parameter <code>...nums</code> ' +
			'packs every remaining argument into a <em>real array</em>, unlike ' +
			'the legacy array-<em>like</em> <code>arguments</code> object that ' +
			'had no <code>map</code> or <code>reduce</code> of its own:</p>',
			{ lang: 'js', code: 'function box(w, h = w) {          // default can use earlier params\n  return w + "x" + h;\n}\nconsole.log(box(3));               // 3x3 — default kicked in\n\nconst max = (...nums) => Math.max(...nums);  // rest packs, spread unpacks\nconsole.log(max(4, 9, 2));         // 9 — any number of arguments' },
			DIAGRAM,
			'<h3>Your job</h3>' +
			'<p>Modernize both functions. Rewrite <code>greet</code> as a ' +
			'one-line arrow with a default parameter <code>who = \'world\'</code> ' +
			'— the starter prints <code>hi, undefined</code> because nothing ' +
			'fills the gap. Then rewrite <code>sum</code> with a rest parameter ' +
			'<code>...nums</code> and a <code>reduce</code> so ' +
			'<code>sum(1, 2, 3, 4)</code> really adds all four.</p>' +
			'<div class="tip">An arrow\'s implicit return only works without ' +
			'braces: <code>(a, b) =&gt; a + b</code> returns the sum, but ' +
			'<code>(a, b) =&gt; { a + b }</code> is a <em>block</em> that ' +
			'returns <code>undefined</code> — a classic silent bug.</div>',
		],

		task: 'Rewrite greet as an arrow with a default parameter, and sum with a rest parameter + reduce.',

		starter: [
			'// The long way: an ES5-style function expression with no default,',
			'// so greet(\'hi\') prints "hi, undefined".',
			'// TODO: rewrite greet as a one-line ARROW function with a default',
			'//   parameter who = \'world\' (implicit return, no braces).',
			'var greet = function (greeting, who) {',
			'  return greeting + \', \' + who;',
			'};',
			'',
			'// TODO: rewrite sum with a REST parameter (...nums) and reduce,',
			'//   so it accepts ANY number of arguments.',
			'function sum(a, b) {',
			'  return a + b;',
			'}',
			'',
			'console.log(greet(\'hi\'));             // want: hi, world',
			'console.log(greet(\'hi\', \'Ada\'));      // want: hi, Ada',
			'console.log(\'sum:\', sum(1, 2, 3, 4)); // want: sum: 10',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('hi, world') !== -1 &&
				flat.indexOf('hi, Ada') !== -1 &&
				flat.indexOf('sum: 10') !== -1 &&
				flat.indexOf('undefined') === -1;
		},

		solution: [
			'// Arrow + default: who = \'world\' is evaluated per call, only when',
			'// the argument is missing — an explicit \'Ada\' still wins. The',
			'// concise body IS the return value; no braces, no return keyword.',
			'const greet = (greeting, who = \'world\') => greeting + \', \' + who;',
			'',
			'// Rest packs every argument into a REAL array (unlike the legacy',
			'// arguments object), so reduce is available directly. Seeding the',
			'// accumulator with 0 keeps sum() safe for zero arguments too.',
			'const sum = (...nums) => nums.reduce((total, n) => total + n, 0);',
			'',
			'console.log(greet(\'hi\'));             // want: hi, world',
			'console.log(greet(\'hi\', \'Ada\'));      // want: hi, Ada',
			'console.log(\'sum:\', sum(1, 2, 3, 4)); // want: sum: 10',
			'',
		].join('\n'),
	});
})();
