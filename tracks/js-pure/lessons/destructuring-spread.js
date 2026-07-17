/* Destructuring & Spread — reading shapes apart (arrays by position,
 * objects by name, params in the signature) and writing them back together
 * with spread. The exercise converts a positional makeServer(host, port,
 * secure) into the options-object pattern; the check pins the no-args call
 * output `localhost:8080 secure=false`, which is only reachable when both
 * the destructured defaults AND the trailing `= {}` are in place, plus a
 * one-line swap and a spread merge where the override's keys win.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// Spread copies exactly one level: both the original and the copy point
	// at the SAME nested array. Marker id namespaced dgArrowJSDS.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-label="original and its spread copy both point to one shared nested array">' +
		'<text x="20" y="22" class="lbl">{ ...original } copies one level — nested values are shared references</text>' +
		'<rect x="30" y="44" width="200" height="52" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="130" y="66" text-anchor="middle">original</text>' +
		'<text x="130" y="84" text-anchor="middle" class="lbl">{ port: 8080, tags: &#8226; }</text>' +
		'<rect x="30" y="120" width="200" height="52" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="130" y="142" text-anchor="middle">copy = { ...original }</text>' +
		'<text x="130" y="160" text-anchor="middle" class="lbl">own port — but tags: &#8226;</text>' +
		'<rect x="330" y="82" width="160" height="52" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="410" y="104" text-anchor="middle">["a", "b"]</text>' +
		'<text x="410" y="122" text-anchor="middle" class="lbl">ONE shared array</text>' +
		'<path d="M 232 70 L 326 96" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSDS)"/>' +
		'<path d="M 232 146 L 326 120" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSDS)"/>' +
		'<defs><marker id="dgArrowJSDS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	J.lesson({
		id: 'destructuring-spread',
		title: 'Destructuring & Spread',
		nav: 'destructuring & spread',
		category: 'Collections & Data',

		prose: [
			'<h2>Destructuring &amp; Spread</h2>' +
			'<p>Destructuring reads data <em>out</em> of a structure by mirroring ' +
			'its shape on the left of <code>=</code>. For arrays the match is ' +
			'<strong>positional</strong>: bare commas skip slots, <code>=</code> ' +
			'supplies defaults for missing ones, and the famous swap trick needs ' +
			'no temp variable:</p>',
			{ lang: 'js', code: 'const [first, second] = ["a", "b", "c"];  // "a", "b"\nconst [, , third] = ["a", "b", "c"];      // skip two slots: "c"\nconst [x = 0, y = 0] = [10];              // defaults: x = 10, y = 0\n\nlet a = 1, b = 2;\n[a, b] = [b, a];                          // swap — build [2,1], unpack it back' },
			'<p>Object destructuring matches by <strong>name</strong>, so order is ' +
			'irrelevant. You can rename as you extract (<code>{ x: px }</code> ' +
			'reads property <code>x</code> into variable <code>px</code>), default ' +
			'missing keys, reach into nested objects, and sweep the remainder into ' +
			'a <code>...rest</code> object:</p>',
			{ lang: 'js', code: 'const point = { x: 3, y: 4, color: "red", weight: 2 };\nconst { x: px, y: py } = point;   // rename: px = 3, py = 4\nconst { z = 0 } = point;          // default: z = 0\nconst { x, ...rest } = point;     // rest = { y: 4, color: "red", weight: 2 }\nconst { pos: { row } } = { pos: { row: 5 } };  // nested reach-in: row = 5' },
			'<p>The variant that earns its keep in every real codebase is ' +
			'<strong>parameter destructuring</strong>. A positional call like ' +
			'<code>makeServer("api.io", 443, true)</code> forces every caller to ' +
			'memorize argument order, and a stray boolean is unreadable at the ' +
			'call site. Take one options object instead, destructure it in the ' +
			'signature with per-field defaults, and add a final <code>= {}</code> ' +
			'so calling with <em>no argument at all</em> still works — without it, ' +
			'<code>makeServer()</code> tries to destructure <code>undefined</code> ' +
			'and throws:</p>',
			{ lang: 'js', code: 'function makeServer({ host = "localhost", port = 8080, secure = false } = {}) {\n  // ...\n}\nmakeServer();                             // all defaults — legal thanks to = {}\nmakeServer({ secure: true, port: 443 }); // named, order-free, self-documenting' },
			'<p><strong>Spread</strong> is the mirror image: <code>...</code> ' +
			'writes a value\'s contents <em>into</em> a new literal. Arrays: ' +
			'<code>[...xs]</code> copies, <code>[...xs, ...ys]</code> concatenates. ' +
			'Objects: <code>{ ...base, ...override }</code> merges — properties ' +
			'apply left to right, so <strong>later keys win</strong>, which makes ' +
			'"defaults overlaid by user config" a one-liner. The caveat to carry ' +
			'with you: spread copies exactly <em>one level deep</em>. Nested ' +
			'objects and arrays come across as shared references:</p>' +
			DIAGRAM,
			'<h3>Your job</h3>' +
			'<p>The starter\'s <code>makeServer(host, port, secure)</code> shows ' +
			'both positional failure modes: a forgotten third argument prints ' +
			'<code>secure=undefined</code>, and a reordered call prints garbage. ' +
			'Rewrite the signature as a destructured options object with defaults ' +
			'and a trailing <code>= {}</code>, call it once with no arguments and ' +
			'once with overrides, swap the two names in one line, and build ' +
			'<code>merged</code> with spread so the override\'s keys win.</p>' +
			'<div class="tip">When you see <code>fn(a, b, true, false)</code> in a ' +
			'code review, the options-object pattern is almost always the fix — ' +
			'the call site becomes its own documentation.</div>',
		],

		task: 'Convert makeServer to a destructured options object with defaults and = {}, swap the pair in one line, and merge base + override with spread.',

		starter: [
			'function makeServer(host, port, secure) {',
			'  // TODO: replace the three positional params with ONE destructured',
			'  // options object, defaults included:',
			'  //   function makeServer({ host = "localhost", port = 8080, secure = false } = {}) {',
			'  console.log("server: " + host + ":" + port + " secure=" + secure);',
			'}',
			'',
			'makeServer("localhost", 8080);         // forgot the 3rd arg -> secure=undefined',
			'makeServer(443, "example.com", true);  // arguments in the wrong order!',
			'// TODO: call as makeServer() and',
			'//       makeServer({ host: "example.com", port: 443, secure: true })',
			'',
			'let primary = "cache";',
			'let fallback = "db";',
			'// TODO: swap the two in ONE line: [primary, fallback] = [fallback, primary];',
			'console.log("order:", primary, "then", fallback);',
			'',
			'const base = { host: "localhost", port: 8080 };',
			'const override = { port: 443, secure: true };',
			'// TODO: build merged with spread ({ ...base, ...override }) - later keys win',
			'const merged = base;',
			'console.log("merged:", merged);',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('server: localhost:8080 secure=false') !== -1 &&
				flat.indexOf('server: example.com:443 secure=true') !== -1 &&
				flat.indexOf('order: db then cache') !== -1 &&
				flat.indexOf('merged: {"host":"localhost","port":443,"secure":true}') !== -1;
		},

		solution: [
			'// One options object, destructured in the signature. Per-field defaults',
			'// cover missing keys; the trailing = {} covers a missing OBJECT, so a',
			'// bare makeServer() destructures {} instead of throwing on undefined.',
			'function makeServer({ host = "localhost", port = 8080, secure = false } = {}) {',
			'  console.log("server: " + host + ":" + port + " secure=" + secure);',
			'}',
			'',
			'makeServer();  // all defaults - only legal because of the = {}',
			'// Named fields: order-free and readable, no mystery booleans.',
			'makeServer({ host: "example.com", port: 443, secure: true });',
			'',
			'let primary = "cache";',
			'let fallback = "db";',
			'// Build [fallback, primary], unpack it back onto the same names -',
			'// both assignments happen from the snapshot, so no temp variable.',
			'[primary, fallback] = [fallback, primary];',
			'console.log("order:", primary, "then", fallback);',
			'',
			'const base = { host: "localhost", port: 8080 };',
			'const override = { port: 443, secure: true };',
			'// Spread applies left to right, so override.port beats base.port.',
			'// This is a NEW object - base itself is untouched (but only 1 level deep).',
			'const merged = { ...base, ...override };',
			'console.log("merged:", merged);',
			'',
		].join('\n'),
	});
})();
