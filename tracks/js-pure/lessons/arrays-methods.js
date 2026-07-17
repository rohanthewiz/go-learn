/* Array Methods — the transform trio (map/filter/reduce), the search
 * family, chaining, and the sort trap. The exercise rewrites a clumsy
 * for-loop order report as one filter→map→reduce pipeline and fixes a
 * numeric sort that used the default (lexicographic!) comparator. The
 * check pins "revenue: 370" (only right once the >= 50 filter exists —
 * the starter sums everything and prints 385), the top-products string
 * in correct numeric-descending order, and asserts the lexicographic
 * wrong order ("15 < 220") is ABSENT from the output. */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// Marker id is namespaced (dgArrowJSAM) because every lesson's SVGs
	// share the page's global id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 130" width="520" height="130" role="img" aria-label="a pipeline: orders flow through filter, then map, then reduce down to one number">' +
		'<text x="20" y="24" class="lbl">each step returns a NEW array — until reduce folds it to a single value</text>' +
		'<rect x="20" y="48" width="100" height="44" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="70" y="68" text-anchor="middle">orders</text>' +
		'<text x="70" y="85" text-anchor="middle" class="lbl">4 items</text>' +
		'<path d="M 124 70 L 154 70" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSAM)"/>' +
		'<rect x="158" y="48" width="100" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="208" y="68" text-anchor="middle">filter</text>' +
		'<text x="208" y="85" text-anchor="middle" class="lbl">subset: 3 left</text>' +
		'<path d="M 262 70 L 292 70" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSAM)"/>' +
		'<rect x="296" y="48" width="100" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="346" y="68" text-anchor="middle">map</text>' +
		'<text x="346" y="85" text-anchor="middle" class="lbl">same length</text>' +
		'<path d="M 400 70 L 430 70" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSAM)"/>' +
		'<rect x="434" y="48" width="70" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="469" y="68" text-anchor="middle">reduce</text>' +
		'<text x="469" y="85" text-anchor="middle" class="lbl">370</text>' +
		'<defs><marker id="dgArrowJSAM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	J.lesson({
		id: 'arrays-methods',
		title: 'Array Methods',
		nav: 'array methods',
		category: 'Collections & Data',

		prose: [
			'<h2>Array Methods</h2>' +
			'<p>Three methods replace most loops you will ever write. ' +
			'<code>map</code> transforms every element (new array, ' +
			'<em>same length</em>); <code>filter</code> keeps the elements a ' +
			'predicate approves (new array, a <em>subset</em>); ' +
			'<code>reduce</code> folds the whole array down to <em>one value</em>. ' +
			'None of them mutate the original — each step hands a fresh array ' +
			'to the next, which is what makes them chainable:</p>',
			{ lang: 'js', code: 'const nums = [1, 2, 3, 4];\nnums.map(n => n * 2);        // [2, 4, 6, 8]  — transform each\nnums.filter(n => n % 2 === 0); // [2, 4]     — keep some\nnums.reduce((acc, n) => acc + n, 0); // 10   — fold to one value' },
			'<p><code>reduce</code> deserves a slow-motion replay. The second ' +
			'argument (<code>0</code>) seeds the accumulator; then the callback ' +
			'runs once per element, and whatever it <em>returns</em> becomes the ' +
			'accumulator for the next round: <code>acc</code> starts at 0, then ' +
			'0&nbsp;+&nbsp;1&nbsp;=&nbsp;1, then 1&nbsp;+&nbsp;2&nbsp;=&nbsp;3, ' +
			'then 3&nbsp;+&nbsp;3&nbsp;=&nbsp;6, then 6&nbsp;+&nbsp;4&nbsp;=&nbsp;' +
			'<strong>10</strong>. For <em>searching</em> rather than transforming ' +
			'there is a whole family: <code>find</code> returns the first match ' +
			'(or <code>undefined</code>), <code>some</code> asks "does at least ' +
			'one pass?", <code>every</code> asks "do all pass?", and ' +
			'<code>includes</code> checks membership by value.</p>',
			{ lang: 'js', code: 'const prices = [220, 60, 45, 3];\n\nprices.sort();                    // [220, 3, 45, 60]?? NO — see below\n[10, 9, 2].sort();                // [10, 2, 9]  — compared as STRINGS!\n\nprices.toSorted((a, b) => a - b); // [3, 45, 60, 220] — numeric, non-mutating\n\n[[1, 2], [3]].flat();             // [1, 2, 3]\n["a b", "c"].flatMap(s => s.split(" ")); // ["a", "b", "c"]' },
			'<p>The trap in that snippet is real: <code>sort()</code> with no ' +
			'comparator converts elements to <em>strings</em> and compares them ' +
			'lexicographically — so <code>[10, 9, 2].sort()</code> yields ' +
			'<code>[10, 2, 9]</code>, because <code>"10" &lt; "2" &lt; "9"</code>. ' +
			'Always pass a comparator for numbers: <code>(a, b) =&gt; a - b</code> ' +
			'(ascending) or <code>b - a</code> (descending). And note ' +
			'<code>sort</code> mutates the array in place; ES2023 added ' +
			'<code>toSorted</code>, which returns a sorted <em>copy</em> — the ' +
			'chain-friendly choice. <code>flat</code> and <code>flatMap</code> ' +
			'round out the kit for un-nesting arrays of arrays.</p>',
			DIAGRAM,
			'<h3>Your job</h3>' +
			'<p>Rebuild the order report as pipelines. (1) Build ' +
			'<code>bigTotals</code> with <code>map</code> (shape each order into ' +
			'<code>{ name, total }</code>) then <code>filter</code> (keep ' +
			'<code>total &gt;= 50</code> — the starter forgot this, so its ' +
			'revenue is wrong). (2) Compute <code>revenue</code> with ' +
			'<code>reduce</code>. (3) Fix the report footer: ' +
			'<code>toSorted((a, b) =&gt; b.total - a.total)</code> for a ' +
			'numeric, biggest-first order, then <code>map</code> to names and ' +
			'<code>join(\' &gt; \')</code>.</p>' +
			'<div class="tip">Expected output: <code>revenue: 370</code> and ' +
			'<code>top: monitor &gt; keyboard &gt; webcam</code>. If you see ' +
			'<code>15 &lt; 220 &lt; 60</code> anywhere, the lexicographic sort ' +
			'is still in play.</div>',
		],

		task: 'Rewrite the report as filter/map/reduce chains and fix the sort with a numeric comparator.',

		starter: [
			'const orders = [',
			'  { product: \'keyboard\', qty: 2, price: 45 },',
			'  { product: \'monitor\',  qty: 1, price: 220 },',
			'  { product: \'cable\',    qty: 5, price: 3 },',
			'  { product: \'webcam\',   qty: 1, price: 60 },',
			'];',
			'',
			'// TODO(1): rewrite as a chain — map each order to',
			'//   { name: o.product, total: o.qty * o.price },',
			'//   then filter to keep only total >= 50.',
			'const bigTotals = [];',
			'for (let i = 0; i < orders.length; i++) {',
			'  const o = orders[i];',
			'  bigTotals.push({ name: o.product, total: o.qty * o.price });',
			'}',
			'',
			'// TODO(2): fold bigTotals into revenue with reduce (seed it with 0).',
			'let revenue = 0;',
			'for (let i = 0; i < bigTotals.length; i++) {',
			'  revenue = revenue + bigTotals[i].total;',
			'}',
			'console.log(\'revenue:\', revenue);',
			'',
			'// TODO(3): default sort compares STRINGS. Use toSorted with the',
			'//   numeric comparator (a, b) => b.total - a.total on bigTotals,',
			'//   then map to names and join with \' > \'.',
			'const totals = bigTotals.map(o => o.total);',
			'console.log(\'top:\', totals.sort().join(\' < \'));',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('revenue: 370') !== -1 &&
				flat.indexOf('top: monitor > keyboard > webcam') !== -1 &&
				flat.indexOf('15 < 220') === -1;
		},

		solution: [
			'const orders = [',
			'  { product: \'keyboard\', qty: 2, price: 45 },',
			'  { product: \'monitor\',  qty: 1, price: 220 },',
			'  { product: \'cable\',    qty: 5, price: 3 },',
			'  { product: \'webcam\',   qty: 1, price: 60 },',
			'];',
			'',
			'// map first to SHAPE the data, then filter to keep the rows that',
			'// matter — each step returns a new array, so orders stays intact',
			'// and the pipeline reads top-to-bottom like a sentence.',
			'const bigTotals = orders',
			'  .map(o => ({ name: o.product, total: o.qty * o.price }))',
			'  .filter(o => o.total >= 50);',
			'',
			'// reduce folds the rows to one number. Seeding with 0 makes the',
			'// empty case safe and keeps the accumulator numeric from step one.',
			'const revenue = bigTotals.reduce((sum, o) => sum + o.total, 0);',
			'console.log(\'revenue:\', revenue);',
			'',
			'// toSorted (ES2023) sorts a COPY, so bigTotals is untouched; the',
			'// comparator makes it numeric — default sort compares strings,',
			'// which is why 220 landed before 60 in the broken version.',
			'const top = bigTotals',
			'  .toSorted((a, b) => b.total - a.total)',
			'  .map(o => o.name)',
			'  .join(\' > \');',
			'console.log(\'top:\', top);',
			'',
		].join('\n'),
	});
})();
