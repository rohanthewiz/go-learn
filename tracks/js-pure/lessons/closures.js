/* Closures — lexical scope, function + captured environment, the counter
 * factory as private state, and THE classic var-in-a-loop timer bug. The
 * exercise ships a counter that forgets (count redeclared inside the
 * returned function) plus the `var` loop printing 3 3 3; the check pins the
 * counting sequence (a: 1, a: 2, b: 1 — independent environments) and the
 * timer output 0 1 2 while asserting `timer: 3` never appears — both are
 * unreachable without a real closure and a per-iteration `let` binding.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// The whole mental model in one picture: the outer call frame is gone,
	// but the environment it created survives because the returned function
	// still points at it. Marker id is namespaced (dgArrowJSCL) — SVG ids
	// are global across the page.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="the returned inner function keeps a reference to its captured environment after the outer call frame is gone">' +
		'<text x="20" y="22" class="lbl">after makeCounter() returns — the frame dies, the environment it created does not</text>' +
		// the finished outer call frame (dashed: it no longer exists)
		'<rect x="30" y="46" width="180" height="54" rx="6" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="6 5"/>' +
		'<text x="120" y="68" text-anchor="middle">makeCounter() frame</text>' +
		'<text x="120" y="88" text-anchor="middle" class="lbl">call finished — frame gone</text>' +
		// the returned inner function
		'<rect x="30" y="126" width="180" height="54" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="120" y="148" text-anchor="middle">counter (returned fn)</text>' +
		'<text x="120" y="168" text-anchor="middle" class="lbl">code + [[Environment]] ref</text>' +
		// the captured environment, kept alive by that ref
		'<rect x="330" y="126" width="160" height="54" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="410" y="148" text-anchor="middle">{ count: 2 }</text>' +
		'<text x="410" y="168" text-anchor="middle" class="lbl">captured environment</text>' +
		'<path d="M 212 153 L 326 153" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSCL)"/>' +
		'<defs><marker id="dgArrowJSCL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	J.lesson({
		id: 'closures',
		title: 'Closures',
		nav: 'closures',
		category: 'Functions in Depth',

		prose: [
			'<h2>Closures</h2>' +
			'<p>JavaScript uses <strong>lexical scope</strong>: a function can see ' +
			'the variables of the place where it was <em>written</em>, not the ' +
			'place where it happens to be called. When a function outlives the ' +
			'scope that created it — usually because it was returned or passed ' +
			'somewhere — it takes that scope with it. A <strong>closure</strong> is ' +
			'exactly that pair: the function, plus a live reference to the ' +
			'environment it was born in.</p>',
			{ lang: 'js', code: 'function makeGreeter(name) {\n  return function () {\n    // `name` is not a parameter here and not a global —\n    // it comes from the environment this function was written in.\n    console.log("hello, " + name);\n  };\n}\n\nconst hi = makeGreeter("Ada");\nhi(); // hello, Ada — makeGreeter returned long ago' },
			DIAGRAM +
			'<p>Note what the diagram claims: the environment is <em>live</em>, not ' +
			'a snapshot. The inner function reads and writes the same ' +
			'<code>count</code> binding every call, so state accumulates. And ' +
			'because <em>each call</em> to the outer function creates a ' +
			'<em>fresh</em> environment, two counters made by the same factory are ' +
			'completely independent — private state with no class, no ' +
			'<code>this</code>, and no way for outside code to touch ' +
			'<code>count</code> except through the functions you chose to ' +
			'return:</p>',
			{ lang: 'js', code: 'function makeCounter() {\n  let count = 0;              // one binding PER makeCounter() call\n  return function () {\n    count += 1;               // closes over that binding\n    return count;\n  };\n}\nconst a = makeCounter();\nconst b = makeCounter();\na(); a();                     // 1, 2\nb();                          // 1 — b has its own count' },
			'<p>Now the classic bug. <code>var</code> is <em>function</em>-scoped, ' +
			'so a <code>for (var i …)</code> loop has exactly <strong>one</strong> ' +
			'<code>i</code> — every callback you create in the loop closes over ' +
			'that same shared binding. Timer callbacks run <em>after</em> the loop ' +
			'finishes (this runner\'s virtual timers make that ordering exact and ' +
			'instant), by which time <code>i</code> is already <code>3</code> — so ' +
			'they print <code>3 3 3</code>. <code>let</code> was designed to fix ' +
			'precisely this: it is block-scoped, and a <code>for (let i …)</code> ' +
			'loop creates a <em>fresh</em> <code>i</code> binding for every ' +
			'iteration, so each callback captures its own.</p>' +
			'<h3>Your job</h3>' +
			'<p>Two broken closures. First, <code>makeCounter</code> declares ' +
			'<code>count</code> <em>inside</em> the returned function, so it resets ' +
			'to zero on every call and both counters are stuck at 1 — move the ' +
			'declaration into <code>makeCounter</code> itself so the returned ' +
			'function closes over it. Second, change the timer loop\'s ' +
			'<code>var</code> to <code>let</code> so it prints ' +
			'<code>0 1 2</code> instead of <code>3 3 3</code>.</p>' +
			'<div class="tip">Run the starter first and study the wrong output — ' +
			'<code>a: 1, a: 1, b: 1</code> and three <code>timer: 3</code> lines ' +
			'print <em>after</em> the counters, because timer callbacks always wait ' +
			'for the synchronous code to finish.</div>',
		],

		task: 'Move count into makeCounter so the returned function closes over it, and change the loop\'s var to let.',

		starter: [
			'function makeCounter() {',
			'  // TODO: declare `let count = 0` HERE, so the returned function',
			'  // closes over one long-lived binding per makeCounter() call.',
			'  return function () {',
			'    let count = 0;   // recreated on EVERY call — no memory at all',
			'    count += 1;',
			'    return count;',
			'  };',
			'}',
			'',
			'const a = makeCounter();',
			'const b = makeCounter();',
			'console.log("a:", a());',
			'console.log("a:", a());   // should be 2 — a real closure remembers',
			'console.log("b:", b());   // should be 1 — b has its OWN environment',
			'',
			'// TODO: change `var` to `let` — var is function-scoped, so all three',
			'// callbacks share ONE i, which is 3 by the time any of them runs.',
			'for (var i = 0; i < 3; i++) {',
			'  setTimeout(function () {',
			'    console.log("timer:", i);',
			'  }, 10);',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('a: 1') !== -1 &&
				flat.indexOf('a: 2') !== -1 &&
				flat.indexOf('a: 1') < flat.indexOf('a: 2') &&
				flat.indexOf('b: 1') !== -1 &&
				flat.indexOf('a: 2') < flat.indexOf('b: 1') &&
				flat.indexOf('timer: 0') !== -1 &&
				flat.indexOf('timer: 1') !== -1 &&
				flat.indexOf('timer: 2') !== -1 &&
				flat.indexOf('timer: 0') < flat.indexOf('timer: 1') &&
				flat.indexOf('timer: 1') < flat.indexOf('timer: 2') &&
				flat.indexOf('timer: 3') === -1;
		},

		solution: [
			'function makeCounter() {',
			'  // One binding per makeCounter() call: the returned function closes',
			'  // over it, so state survives between calls yet stays private —',
			'  // nothing outside can reach count except through this function.',
			'  let count = 0;',
			'  return function () {',
			'    count += 1;',
			'    return count;',
			'  };',
			'}',
			'',
			'const a = makeCounter();',
			'const b = makeCounter();',
			'console.log("a:", a());',
			'console.log("a:", a());   // 2 — same environment as the first call',
			'console.log("b:", b());   // 1 — a fresh environment, independent of a',
			'',
			'// let is block-scoped: each iteration gets a FRESH i binding, so',
			'// each callback captures the value of its own iteration.',
			'for (let i = 0; i < 3; i++) {',
			'  setTimeout(function () {',
			'    console.log("timer:", i);',
			'  }, 10);',
			'}',
			'',
		].join('\n'),
	});
})();
