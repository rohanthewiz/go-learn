/* Generators — function* + yield: a function that pauses. Generators get both
 * iteration protocols for free, which turns the previous lesson's dozen lines
 * of iterator plumbing into one keyword — and because evaluation is lazy,
 * INFINITE sequences become practical. The exercise replaces an eager,
 * fixed-size fibonacci array with an infinite generator plus take(n), and a
 * concat-only combiner with a yield*-delegating interleave; the check pins
 * the fib prefix, the interleaved order, and a pulled-counter proving only 8
 * values were ever computed from an unbounded stream.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// A generator body with its pause points, emitting one value per next().
	// Marker ids are namespaced (dgArrowJSGN*): SVG ids are global page-wide.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="a generator body pauses at each yield; every next() from the consumer resumes it to emit one more value">' +
		'<text x="20" y="20" class="lbl">each next() resumes the body until it hits the next yield — then it pauses again</text>' +
		'<rect x="30" y="40" width="210" height="150" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="135" y="64" text-anchor="middle">function* fibonacci()</text>' +
		'<text x="48" y="92" class="lbl">let a = 0, b = 1</text>' +
		'<text x="48" y="117" class="lbl">yield a          — pause</text>' +
		'<text x="48" y="142" class="lbl">[a, b] = [b, a + b]</text>' +
		'<text x="48" y="167" class="lbl">loop back to the yield…</text>' +
		'<rect x="360" y="75" width="130" height="70" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="425" y="103" text-anchor="middle">consumer</text>' +
		'<text x="425" y="123" text-anchor="middle" class="lbl">take(8, …)</text>' +
		'<path d="M 356 95 L 244 95" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSGNok)"/>' +
		'<text x="300" y="88" text-anchor="middle" class="lbl">next()</text>' +
		'<path d="M 244 125 L 356 125" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowJSGN)"/>' +
		'<text x="300" y="142" text-anchor="middle" class="lbl">0, 1, 1, 2, …</text>' +
		'<text x="260" y="185" text-anchor="middle" class="lbl">nobody pulls — nothing runs: an infinite loop that costs nothing until asked</text>' +
		'<defs>' +
		'<marker id="dgArrowJSGN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowJSGNok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	J.lesson({
		id: 'generators',
		title: 'Generators',
		nav: 'generators',
		category: 'Iterators & Generators',

		prose: [
			'<h2>Generators</h2>' +
			'<p>A <code>function*</code> is a function that can <strong>pause</strong>. ' +
			'Calling it runs <em>no code at all</em> — it hands back a generator ' +
			'object. Each <code>next()</code> resumes the body until the next ' +
			'<code>yield</code>, which emits a value and freezes the whole frame ' +
			'— locals, loop counters, the exact spot in the code — until the ' +
			'following <code>next()</code>:</p>',
			{ lang: 'js', code: 'function* counter() {\n  let n = 1;\n  while (true) {\n    yield n;   // pause here; n survives across resumes\n    n++;\n  }\n}\nconst g = counter();\ng.next();  // { value: 1, done: false }\ng.next();  // { value: 2, done: false } — resumed after the yield' },
			DIAGRAM +
			'<p>Now recall the previous lesson: making <code>range</code> ' +
			'iterable took a <code>[Symbol.iterator]()</code> method, a closure ' +
			'cursor, and a hand-built <code>next()</code> — a dozen lines. A ' +
			'generator implements <em>both protocols for free</em>: the object ' +
			'it returns is an iterator (<code>next()</code> is generated for ' +
			'you) <em>and</em> iterable (its <code>[Symbol.iterator]()</code> ' +
			'returns itself). The dozen lines collapse to:</p>',
			{ lang: 'js', code: 'const range = {\n  from: 1, to: 5,\n  *[Symbol.iterator]() {                 // generator method: one line of protocol\n    for (let n = this.from; n <= this.to; n++) yield n;\n  },\n};\n[...range]  // [1, 2, 3, 4, 5]' },
			'<p>The deeper win is <strong>laziness</strong>. Because nothing ' +
			'runs until a consumer pulls, <code>while (true)</code> around a ' +
			'<code>yield</code> is not a bug — it is an <em>infinite ' +
			'sequence</em>, and the consumer decides how much of it to ' +
			'materialize. A <code>take(n, iterable)</code> helper just ' +
			'<code>for...of</code>s and <code>break</code>s after <code>n</code> ' +
			'values; the break tells the generator to shut down, and the values ' +
			'past <code>n</code> are never computed at all. Producer logic and ' +
			'stopping policy end up in separate, reusable pieces — the eager ' +
			'version has to weld them together.</p>' +
			'<p>Two more tools complete the picture. <code>yield*</code> ' +
			'<em>delegates</em>: it yields every value of another iterable from ' +
			'inside a generator, letting you stitch sequences together. And ' +
			'communication is actually two-way — <code>next(v)</code> makes ' +
			'<code>v</code> the value of the paused <code>yield</code> ' +
			'expression inside the body — an advanced feature (it powered ' +
			'async/await\'s precursors) that we only point at here.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter builds a fibonacci <em>array</em> of hard-coded ' +
			'length — eager, fixed-size, unusable for "first n" without ' +
			'editing it — and a combiner that can only concatenate arrays. ' +
			'Replace them: write an infinite <code>function* fibonacci()</code> ' +
			'that increments <code>pulled</code> before each yield, a ' +
			'<code>take(n, iterable)</code> helper, and a ' +
			'<code>function* interleave(a, b)</code> that alternates values and ' +
			'uses <code>yield*</code> to hand off the remainder when one side ' +
			'runs dry. The <code>pulled: 8</code> line is your laziness proof: ' +
			'an infinite stream, yet only 8 values ever computed.</p>' +
			'<div class="tip"><code>take</code> works on <em>any</em> iterable ' +
			'— it never knows fibonacci is infinite. That is the protocol from ' +
			'the previous lesson doing its job: producers and consumers only ' +
			'agree on <code>next()</code>.</div>',
		],

		task: 'Replace the eager array with an infinite function* fibonacci + take(8, ...), and the concat combiner with a yield*-delegating interleave.',

		starter: [
			'let pulled = 0;  // counts how many fib values are ever computed',
			'',
			'// Eager: builds the WHOLE array up front, length hard-coded.',
			'// Want "first n" or "until limit > x"? Edit the function. Again.',
			'function fibonacciArray(len) {',
			'  const out = [];',
			'  let a = 0, b = 1;',
			'  for (let i = 0; i < len; i++) {',
			'    out.push(a);',
			'    [a, b] = [b, a + b];',
			'  }',
			'  return out;',
			'}',
			'// TODO: replace with an INFINITE generator — function* fibonacci()',
			'// with while (true) { pulled++; yield a; [a, b] = [b, a + b]; }',
			'',
			'// TODO: write take(n, iterable): for...of, push, break at n values.',
			'',
			'// Hand-rolled combine: only works on arrays, everything must',
			'// already be materialized, and it cannot alternate elements.',
			'function combine(x, y) {',
			'  return x.concat(y);',
			'}',
			'// TODO: replace with function* interleave(a, b) — alternate values',
			'// from each; when one side is done, yield* the other side\'s rest.',
			'',
			'console.log("fib:", fibonacciArray(8).join(", "));  // TODO: take(8, fibonacci())',
			'console.log("combined:", combine([1, 3, 5], [2, 4, 6]).join(" "));',
			'console.log("pulled:", pulled);',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('fib: 0, 1, 1, 2, 3, 5, 8, 13') !== -1 &&
				flat.indexOf('combined: 1 2 3 4 5 6') !== -1 &&
				flat.indexOf('pulled: 8') !== -1;
		},

		solution: [
			'let pulled = 0;  // counts how many fib values are ever computed',
			'',
			'// Infinite on purpose: the while (true) never runs eagerly — each',
			'// next() executes exactly one trip to the yield, then pauses with',
			'// a and b frozen in place. Producer logic only; no stopping policy.',
			'function* fibonacci() {',
			'  let a = 0, b = 1;',
			'  while (true) {',
			'    pulled++;          // laziness witness: counts actual computations',
			'    yield a;',
			'    [a, b] = [b, a + b];',
			'  }',
			'}',
			'',
			'// The stopping policy, as a reusable piece: works on ANY iterable.',
			'// break sends return() into the generator, shutting it down cleanly.',
			'function take(n, iterable) {',
			'  const out = [];',
			'  for (const v of iterable) {',
			'    out.push(v);',
			'    if (out.length === n) break;',
			'  }',
			'  return out;',
			'}',
			'',
			'// Alternate values from a and b; when one side runs dry, yield*',
			'// delegates the whole remainder of the other — no manual loop.',
			'function* interleave(a, b) {',
			'  const ia = a[Symbol.iterator]();',
			'  const ib = b[Symbol.iterator]();',
			'  while (true) {',
			'    const ra = ia.next();',
			'    if (ra.done) { yield* ib; return; }',
			'    yield ra.value;',
			'    const rb = ib.next();',
			'    if (rb.done) { yield* ia; return; }',
			'    yield rb.value;',
			'  }',
			'}',
			'',
			'console.log("fib:", take(8, fibonacci()).join(", "));',
			'console.log("combined:", [...interleave([1, 3, 5], [2, 4, 6])].join(" "));',
			'console.log("pulled:", pulled);  // 8 — from an infinite stream',
			'',
		].join('\n'),
	});
})();
