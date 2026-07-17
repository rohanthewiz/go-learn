/* Iterators & Iterables — the two protocols underneath for...of, spread and
 * destructuring: an ITERATOR has next() returning {value, done}; an ITERABLE
 * has [Symbol.iterator]() returning an iterator. The exercise takes an object
 * with a bespoke toArray() method and makes it iterable, which the check pins
 * from four angles: a for...of accumulation, a spread, a destructure, and a
 * hand-driven next() sequence ending in done:true — the last one is
 * unreachable without actually implementing the protocol.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// The pull loop between a consumer and an iterator, one round-trip per
	// value. Marker ids are namespaced (dgArrowJSIT*) because every track's
	// SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-label="for...of asks the iterable for an iterator, then calls next() repeatedly until done is true">' +
		'<text x="20" y="20" class="lbl">1. for...of calls obj[Symbol.iterator]() once … 2. then pulls next() until done</text>' +
		'<rect x="30" y="55" width="150" height="60" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="105" y="81" text-anchor="middle">for...of</text>' +
		'<text x="105" y="99" text-anchor="middle" class="lbl">or [...x], destructuring</text>' +
		'<rect x="340" y="55" width="150" height="60" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="415" y="81" text-anchor="middle">iterator</text>' +
		'<text x="415" y="99" text-anchor="middle" class="lbl">object with next()</text>' +
		'<path d="M 184 70 L 336 70" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowJSIT)"/>' +
		'<text x="260" y="63" text-anchor="middle" class="lbl">next()</text>' +
		'<path d="M 336 100 L 184 100" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSITok)"/>' +
		'<text x="260" y="117" text-anchor="middle" class="lbl">{ value, done }</text>' +
		'<text x="260" y="160" text-anchor="middle" class="lbl">{value:1,done:false} … {value:5,done:false} … {done:true} — and the loop stops</text>' +
		'<defs>' +
		'<marker id="dgArrowJSIT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowJSITok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	J.lesson({
		id: 'iterators',
		title: 'Iterators & Iterables',
		nav: 'iterators',
		category: 'Iterators & Generators',

		prose: [
			'<h2>Iterators &amp; Iterables</h2>' +
			'<p>Before ES2015, every container invented its own way to be walked ' +
			'— index loops for arrays, <code>forEach</code>-style callbacks for ' +
			'everything else. The language fixed this with two tiny ' +
			'<em>protocols</em> (agreed-on method shapes, no base class, no ' +
			'registration):</p>' +
			'<p>An <strong>iterator</strong> is any object with a ' +
			'<code>next()</code> method returning <code>{ value, done }</code>. ' +
			'An <strong>iterable</strong> is any object with a ' +
			'<code>[Symbol.iterator]()</code> method that returns an iterator. ' +
			'<code>Symbol.iterator</code> is a <em>well-known symbol</em> — a ' +
			'key that can never collide with your own property names, which is ' +
			'exactly why it was chosen over a string like <code>"iterator"</code>.</p>',
			{ lang: 'js', code: 'const it = [10, 20][Symbol.iterator]();  // arrays are iterable\nit.next();   // { value: 10, done: false }\nit.next();   // { value: 20, done: false }\nit.next();   // { value: undefined, done: true }' },
			DIAGRAM +
			'<p><code>for...of</code> is nothing more than sugar over that ' +
			'picture: get the iterator by calling ' +
			'<code>obj[Symbol.iterator]()</code>, call <code>next()</code>, run ' +
			'the loop body with <code>value</code>, repeat until ' +
			'<code>done</code> is <code>true</code>. That is the <em>entire</em> ' +
			'mechanism — no hidden fast path for arrays.</p>' +
			'<p>Iterable out of the box: arrays, strings (by code point), ' +
			'<code>Map</code>, <code>Set</code>, function <code>arguments</code>. ' +
			'Notably <strong>not</strong> iterable: plain objects — ' +
			'<code>for (const x of {a: 1})</code> throws, because there is no ' +
			'single obvious answer to what "each element" of an object means ' +
			'(keys? values? entries?). You choose explicitly with ' +
			'<code>Object.keys</code>/<code>values</code>/<code>entries</code>.</p>',
			{ lang: 'js', code: '// Spread and destructuring consume the SAME protocol:\nconst chars = [..."hey"];        // ["h", "e", "y"]\nconst [a, b] = new Set([1, 2]);  // a = 1, b = 2 — two next() calls\nfor (const ch of "hey") { /* ... */ }' },
			'<p>This is the payoff: implement <code>[Symbol.iterator]()</code> ' +
			'<em>once</em> on your own object and every consumer in the language ' +
			'— <code>for...of</code>, <code>[...x]</code>, destructuring, ' +
			'<code>Array.from</code>, <code>new Set(x)</code>, ' +
			'<code>Promise.all</code> — works with it immediately. One method, ' +
			'a whole ecosystem of callers.</p>' +
			'<h3>Your job</h3>' +
			'<p>The <code>range</code> object below only offers a bespoke ' +
			'<code>toArray()</code>, so consumers are stuck doing index ' +
			'bookkeeping. Implement <code>[Symbol.iterator]()</code> returning ' +
			'an iterator over <code>from..to</code> (a closure variable for the ' +
			'cursor is all the state you need), then replace the clumsy ' +
			'consumption: a <code>for...of</code> building the ' +
			'<code>for...of:</code> line, a spread logged as ' +
			'<code>spread:</code>, a destructure logged as ' +
			'<code>first:/second:</code>, and finally drive the protocol by ' +
			'hand — five <code>next()</code> calls, then log the fifth and ' +
			'sixth results so <code>done: true</code> appears.</p>' +
			'<div class="tip">Return a <em>fresh</em> iterator from every ' +
			'<code>[Symbol.iterator]()</code> call. Because the cursor lives in ' +
			'the method call\'s closure, each consumer gets its own — that is ' +
			'why the spread still sees 1..5 after <code>for...of</code> already ' +
			'ran the range to exhaustion.</div>',
		],

		task: 'Implement [Symbol.iterator]() on range, then consume it via for...of, spread, destructuring, and hand-driven next() calls.',

		starter: [
			'// A range of numbers from..to. Today it only offers a bespoke',
			'// toArray() — every consumer has to know about that method.',
			'const range = {',
			'  from: 1,',
			'  to: 5,',
			'  toArray() {',
			'    const out = [];',
			'    for (let n = this.from; n <= this.to; n++) out.push(n);',
			'    return out;',
			'  },',
			'  // TODO: implement [Symbol.iterator]() { ... } — return an object',
			'  // whose next() yields { value, done } for from..to (keep a cursor',
			'  // in a closure variable; capture this.to before returning).',
			'};',
			'',
			'// Clumsy manual consumption: index bookkeeping everywhere.',
			'const arr = range.toArray();',
			'let joined = "";',
			'let i = 0;',
			'while (i < arr.length) {',
			'  joined += (joined === "" ? "" : " ") + arr[i];',
			'  i++;',
			'}',
			'console.log("while:", joined);',
			'',
			'// TODO: once range is iterable, replace the block above and add:',
			'//   1. for...of over range accumulating into joined -> log "for...of:", joined',
			'//   2. console.log("spread:", [...range]);',
			'//   3. const [first, second] = range; log "first:", first, "second:", second',
			'//   4. const it = range[Symbol.iterator](); call it.next() four times,',
			'//      then log "manual:", it.next() twice — the last shows done: true',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('for...of: 1 2 3 4 5') !== -1 &&
				flat.indexOf('spread: [1,2,3,4,5]') !== -1 &&
				flat.indexOf('first: 1 second: 2') !== -1 &&
				flat.indexOf('"value":5,"done":false') !== -1 &&
				flat.indexOf('"done":true') !== -1 &&
				flat.indexOf('"value":5,"done":false') < flat.indexOf('"done":true');
		},

		solution: [
			'// A range of numbers from..to — now a first-class iterable.',
			'const range = {',
			'  from: 1,',
			'  to: 5,',
			'  toArray() {',
			'    const out = [];',
			'    for (let n = this.from; n <= this.to; n++) out.push(n);',
			'    return out;',
			'  },',
			'  // The one method that unlocks every consumer. Each call returns a',
			'  // FRESH iterator: the cursor lives in this call\'s closure, so',
			'  // concurrent consumers never trample each other\'s position.',
			'  [Symbol.iterator]() {',
			'    let cursor = this.from;',
			'    const last = this.to;  // capture: next() below has its own this',
			'    return {',
			'      next() {',
			'        return cursor <= last',
			'          ? { value: cursor++, done: false }',
			'          : { value: undefined, done: true };',
			'      },',
			'    };',
			'  },',
			'};',
			'',
			'// for...of desugars to exactly: get iterator, next() until done.',
			'let joined = "";',
			'for (const n of range) {',
			'  joined += (joined === "" ? "" : " ") + n;',
			'}',
			'console.log("for...of:", joined);',
			'',
			'// Spread consumes the same protocol — zero extra code on range.',
			'console.log("spread:", [...range]);',
			'',
			'// So does destructuring: it pulls exactly two next() calls.',
			'const [first, second] = range;',
			'console.log("first:", first, "second:", second);',
			'',
			'// Proof there is no magic: drive the protocol by hand.',
			'const it = range[Symbol.iterator]();',
			'it.next(); it.next(); it.next(); it.next();  // 1..4 consumed',
			'console.log("manual:", it.next());  // { value: 5, done: false }',
			'console.log("manual:", it.next());  // done: true — consumers stop here',
			'',
		].join('\n'),
	});
})();
