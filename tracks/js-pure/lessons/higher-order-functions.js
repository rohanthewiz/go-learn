/* Higher-Order Functions — functions as values: callbacks, functions that
 * return functions (partial application), pipe/compose built on reduce, and
 * the closure-powered utilities once and memoize. The exercise instruments
 * an "expensive" function with a call counter so the cache is provable:
 * the check pins `calls: 1` after two identical invocations (and rejects
 * `calls: 2`), plus the piped result and a partial-application result —
 * none reachable without actually wrapping functions in functions.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// pipe(double, inc, half): the value threads through the function list
	// left to right — exactly what reduce does with an accumulator.
	// Marker id is namespaced (dgArrowJSHO) — SVG ids are page-global.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 120" width="520" height="120" role="img" aria-label="pipe threads a value through double, then inc, then half, left to right">' +
		'<text x="20" y="22" class="lbl">pipe(double, inc, half)(9) — reduce threads the value left to right</text>' +
		'<text x="30" y="79">9</text>' +
		'<path d="M 44 74 L 66 74" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowJSHO)"/>' +
		'<rect x="72" y="52" width="100" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="122" y="79" text-anchor="middle">double</text>' +
		'<path d="M 176 74 L 200 74" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowJSHO)"/>' +
		'<rect x="206" y="52" width="100" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="256" y="79" text-anchor="middle">inc</text>' +
		'<path d="M 310 74 L 334 74" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowJSHO)"/>' +
		'<rect x="340" y="52" width="100" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="390" y="79" text-anchor="middle">half</text>' +
		'<path d="M 444 74 L 468 74" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowJSHO)"/>' +
		'<text x="474" y="79">9.5</text>' +
		'<defs><marker id="dgArrowJSHO" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	J.lesson({
		id: 'higher-order-functions',
		title: 'Higher-Order Functions',
		nav: 'higher-order fns',
		category: 'Functions in Depth',

		prose: [
			'<h2>Higher-Order Functions</h2>' +
			'<p>In JavaScript a function is a value like any other: you can store ' +
			'it in a variable, put it in an array, pass it as an argument, and ' +
			'return it from another function. A <strong>higher-order ' +
			'function</strong> is simply one that takes or returns functions. You ' +
			'have used them all along — <code>map</code>, <code>filter</code>, ' +
			'<code>setTimeout</code> all take a <em>callback</em>. The other ' +
			'direction is where the real leverage is: functions that ' +
			'<em>build</em> functions.</p>',
			{ lang: 'js', code: '// Partial application by hand: fix one argument now, take the rest later.\nfunction multiplier(k) {\n  return function (n) { return n * k; };  // k lives on in the closure\n}\nconst triple = multiplier(3);\nconst dozen  = multiplier(12);\ntriple(5);  // 15\ndozen(2);   // 24' },
			DIAGRAM +
			'<p>Once functions are values, you can combine them. Nested calls like ' +
			'<code>half(inc(double(x)))</code> read inside-out and right-to-left — ' +
			'fine for two functions, unreadable for five. <code>compose</code> ' +
			'keeps that mathematical right-to-left order; <code>pipe</code> flips ' +
			'it to reading order, left-to-right. Both are one ' +
			'<code>reduce</code>, because "thread a value through a list of ' +
			'functions" <em>is</em> a fold:</p>',
			{ lang: 'js', code: 'const pipe    = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);\nconst compose = (...fns) => (x) => fns.reduceRight((acc, fn) => fn(acc), x);\n\npipe(double, inc, half)(9);     // half(inc(double(9))) — reads in order\ncompose(half, inc, double)(9);  // same result, math order' },
			'<p>The same wrap-a-function trick yields small utilities used ' +
			'everywhere. <code>once(fn)</code> guards <code>fn</code> with a ' +
			'closure-held boolean so it runs at most one time (init code, event ' +
			'wiring). <code>memoize(fn)</code> keeps a <code>Map</code> from ' +
			'argument to result and only calls <code>fn</code> on a cache miss — ' +
			'the caller cannot tell the difference except that repeated calls are ' +
			'free:</p>',
			{ lang: 'js', code: 'function once(fn) {\n  let done = false;             // private flag in the closure\n  return function (...args) {\n    if (done) return;\n    done = true;\n    return fn(...args);\n  };\n}' },
			'<h3>Your job</h3>' +
			'<p>The starter counts how many times <code>slowSquare</code> really ' +
			'runs — called twice with the same argument, it reports ' +
			'<code>calls: 2</code>. Implement <code>memoize(fn)</code> with a ' +
			'<code>Map</code> cache and wrap <code>slowSquare</code> so the second ' +
			'call is a cache hit (<code>calls: 1</code>). Then implement ' +
			'<code>pipe(...fns)</code> using <code>reduce</code> and replace the ' +
			'nested <code>half(inc(double(9)))</code> soup with ' +
			'<code>pipe(double, inc, half)(9)</code>.</p>' +
			'<div class="tip">Use <code>cache.has(x)</code>, not ' +
			'<code>cache.get(x) !== undefined</code> — a cached result could ' +
			'legitimately <em>be</em> <code>undefined</code>, and <code>has</code> ' +
			'distinguishes "stored nothing" from "never stored".</div>',
		],

		task: 'Implement memoize (Map cache, calls drop to 1) and pipe (reduce), and use them.',

		starter: [
			'let calls = 0;',
			'function slowSquare(n) {',
			'  calls += 1;          // counts REAL work — a cache should stop this',
			'  return n * n;',
			'}',
			'',
			'function multiplier(k) {',
			'  return function (n) { return n * k; };  // k captured in the closure',
			'}',
			'const triple = multiplier(3);',
			'console.log("triple 5:", triple(5));',
			'',
			'// TODO: implement memoize(fn) — return a wrapper holding a Map cache;',
			'// on a hit return cache.get(x), on a miss call fn once and store it.',
			'// Then wrap slowSquare with it instead of aliasing it.',
			'const fastSquare = slowSquare;',
			'',
			'console.log("square:", fastSquare(7));',
			'console.log("square:", fastSquare(7));  // same arg — should be a hit',
			'console.log("calls:", calls);           // 2 now; 1 once memoized',
			'',
			'const double = (n) => n * 2;',
			'const inc = (n) => n + 1;',
			'const half = (n) => n / 2;',
			'',
			'// TODO: implement pipe(...fns) with reduce (left-to-right) and',
			'// replace this inside-out soup with pipe(double, inc, half)(9).',
			'console.log("piped:", half(inc(double(9))));',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('triple 5: 15') !== -1 &&
				flat.indexOf('square: 49') !== -1 &&
				flat.indexOf('calls: 1') !== -1 &&
				flat.indexOf('calls: 2') === -1 &&
				flat.indexOf('piped: 9.5') !== -1;
		},

		solution: [
			'let calls = 0;',
			'function slowSquare(n) {',
			'  calls += 1;          // counts REAL work — a cache should stop this',
			'  return n * n;',
			'}',
			'',
			'function multiplier(k) {',
			'  return function (n) { return n * k; };  // k captured in the closure',
			'}',
			'const triple = multiplier(3);',
			'console.log("triple 5:", triple(5));',
			'',
			'function memoize(fn) {',
			'  const cache = new Map();  // Map keeps key types exact (7 !== "7")',
			'  return function (x) {',
			'    // has(), not get() !== undefined: a result may BE undefined.',
			'    if (cache.has(x)) return cache.get(x);',
			'    const result = fn(x);   // the only place fn ever runs',
			'    cache.set(x, result);',
			'    return result;',
			'  };',
			'}',
			'const fastSquare = memoize(slowSquare);',
			'',
			'console.log("square:", fastSquare(7));',
			'console.log("square:", fastSquare(7));  // cache hit — no real work',
			'console.log("calls:", calls);           // 1: the cache absorbed call 2',
			'',
			'const double = (n) => n * 2;',
			'const inc = (n) => n + 1;',
			'const half = (n) => n / 2;',
			'',
			'// reduce threads the value through fns in array (reading) order:',
			'// x -> double(x) -> inc(...) -> half(...). compose = reduceRight.',
			'function pipe(...fns) {',
			'  return (x) => fns.reduce((acc, fn) => fn(acc), x);',
			'}',
			'console.log("piped:", pipe(double, inc, half)(9));',
			'',
		].join('\n'),
	});
})();
