/* The Event Loop — single-threaded JS as queue juggling: the call stack
 * runs to completion, then the ENTIRE microtask queue drains, then ONE
 * macrotask (timer) runs, then microtasks drain again. The exercise is a
 * message router whose five prints come out wrong because urgent work sits
 * on a timer and cleanup on a microtask; fixing it means choosing the
 * right queue for each job. The check pins the EXACT total order of all
 * five lines with chained indexOf comparisons — the only way to produce it
 * is correct queue placement.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// The drain-priority diagram. Marker ids are namespaced (dgArrowJSEL*)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="event loop: the call stack empties, then all microtasks drain, then one macrotask runs, then microtasks drain again">' +
		'<text x="20" y="22" class="lbl">one turn of the loop — the drain order below is the whole model</text>' +
		// call stack
		'<rect x="20" y="60" width="140" height="64" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="90" y="86" text-anchor="middle">call stack</text>' +
		'<text x="90" y="106" text-anchor="middle" class="lbl">sync code runs</text>' +
		// microtask queue
		'<rect x="190" y="60" width="140" height="64" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="260" y="86" text-anchor="middle">microtasks</text>' +
		'<text x="260" y="106" text-anchor="middle" class="lbl">.then / queueMicrotask</text>' +
		// macrotask queue
		'<rect x="360" y="60" width="140" height="64" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="430" y="86" text-anchor="middle">macrotasks</text>' +
		'<text x="430" y="106" text-anchor="middle" class="lbl">setTimeout callbacks</text>' +
		// 1: stack empty -> drain all microtasks
		'<path d="M 162 92 L 184 92" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSEL)"/>' +
		'<text x="173" y="84" text-anchor="middle" class="lbl">1</text>' +
		// 2: then run ONE macrotask
		'<path d="M 332 92 L 354 92" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowJSELa)"/>' +
		'<text x="343" y="84" text-anchor="middle" class="lbl">2</text>' +
		// 3: back to draining microtasks before the next timer
		'<path d="M 430 126 C 430 152, 260 152, 260 130" stroke="var(--ok)" stroke-width="1.6" fill="none" marker-end="url(#dgArrowJSEL)"/>' +
		'<text x="345" y="160" text-anchor="middle" class="lbl">3</text>' +
		// legend
		'<text x="20" y="182" class="lbl">1 — stack empties, then the ENTIRE microtask queue drains</text>' +
		'<text x="20" y="200" class="lbl">2 — then ONE due timer runs&#160;&#160;&#160;&#160;3 — then microtasks drain again, before the NEXT timer</text>' +
		'<defs>' +
		'<marker id="dgArrowJSEL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowJSELa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	J.lesson({
		id: 'event-loop',
		title: 'The Event Loop',
		nav: 'event loop',
		category: 'Async JavaScript',

		prose: [
			'<h2>The Event Loop</h2>' +
			'<p>JavaScript runs on a <strong>single thread</strong> — one call ' +
			'stack, one thing executing at a time. Its concurrency is not ' +
			'parallelism; it is <em>queue juggling</em>: finished async work ' +
			'(a settled promise, a due timer) queues a callback, and the ' +
			'<strong>event loop</strong> decides which queue to serve next. ' +
			'There are two queues that matter, and they are not equals:</p>',
			DIAGRAM +
			'<p>The iron rule: the current synchronous code always runs to ' +
			'completion — nothing can interrupt a running function. When the ' +
			'stack empties, the <strong>entire</strong> microtask queue drains ' +
			'(promise reactions, <code>queueMicrotask</code>), including any ' +
			'microtasks those microtasks queue. Only then does <em>one</em> ' +
			'macrotask — a timer callback — run. And after <em>each</em> ' +
			'macrotask, the microtask queue drains fully again before the next ' +
			'timer gets a turn:</p>',
			{ lang: 'js', code: 'setTimeout(function () {\n  console.log("timer A");\n  Promise.resolve().then(function () { console.log("micro from A"); });\n}, 0);\nsetTimeout(function () { console.log("timer B"); }, 0);\n// timer A, micro from A, timer B -- A\'s microtask beats the NEXT timer' },
			'<p>That priority is why a microtask loop that keeps queueing more ' +
			'microtasks <em>starves</em> the timers forever — the macrotask ' +
			'queue never gets a turn. <code>queueMicrotask(fn)</code> is the ' +
			'direct API for the fast queue, with no promise wrapper: use it for ' +
			'"run this as soon as the current code finishes, before any ' +
			'timer".</p>' +
			'<p>Now the classic interview snippet — predict the output:</p>',
			{ lang: 'js', code: 'console.log("1");\nsetTimeout(function () { console.log("2"); }, 0);\nPromise.resolve().then(function () { console.log("3"); });\nconsole.log("4");' },
			'<p>Walk it with the rule. Line one prints <code>1</code> — sync ' +
			'runs first. <code>setTimeout</code> queues its callback on the ' +
			'<em>macrotask</em> queue; the <code>0</code> is a minimum, not a ' +
			'promise, so nothing prints yet. The <code>.then</code> queues ' +
			'<code>3</code> on the <em>microtask</em> queue — still nothing. ' +
			'Line four prints <code>4</code>, and the sync body is done. Stack ' +
			'empty: microtasks drain, printing <code>3</code>. Only then does ' +
			'the timer run: <code>2</code>. Output: <code>1 4 3 2</code> — ' +
			'the promise callback beats the timer every single time, even at ' +
			'a delay of zero.</p>',
			'<h3>Your job</h3>' +
			'<p>The starter is a message router with its priorities inverted: ' +
			'the urgent payment handler sits on a timer while cleanup grabbed ' +
			'the microtask queue, so cleanup runs <em>before</em> the urgent ' +
			'work. Move the urgent handler to <code>queueMicrotask</code> (or ' +
			'<code>Promise.resolve().then</code>) and move cleanup onto a ' +
			'10&#8202;ms timer, so the five lines come out exactly: ' +
			'<code>recv</code>, <code>ack</code> (sync), ' +
			'<code>urgent: payment</code> (microtask), ' +
			'<code>retry queued</code> (timer 0), <code>cleanup</code> ' +
			'(timer 10).</p>' +
			'<div class="tip">Timers in this runner are virtual but obey real ' +
			'event-loop ordering: callbacks fire after the sync body in ' +
			'due-time order, with the microtask queue drained between fires. ' +
			'The 10&#8202;ms delay is pure ordering — it costs nothing.</div>',
		],

		task: 'Put the urgent handler on the microtask queue and cleanup on a 10ms timer so the five lines print in the required order.',

		starter: [
			'// A message router. Five prints, and the order is the contract:',
			'//   recv, ack, urgent: payment, retry queued, cleanup',
			"console.log('recv');",
			'',
			'// TODO 1: urgent work must beat EVERY timer -- move this handler to',
			'// the microtask queue (queueMicrotask or Promise.resolve().then).',
			'setTimeout(function () {',
			"  console.log('urgent: payment');",
			'}, 0);',
			'',
			'// correctly a timer: retries can wait their turn -- leave as is',
			'setTimeout(function () {',
			"  console.log('retry queued');",
			'}, 0);',
			'',
			'// TODO 2: cleanup must run LAST, after every timer -- move it off',
			'// the microtask queue onto a 10ms timer.',
			'Promise.resolve().then(function () {',
			"  console.log('cleanup');",
			'});',
			'',
			"console.log('ack');",
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var recv = flat.indexOf('recv');
			var ack = flat.indexOf('ack');
			var urgent = flat.indexOf('urgent: payment');
			var retry = flat.indexOf('retry queued');
			var cleanup = flat.indexOf('cleanup');
			return recv !== -1 && recv < ack && ack < urgent &&
				urgent < retry && retry < cleanup;
		},

		solution: [
			'// A message router. Five prints, and the order is the contract:',
			'//   recv, ack, urgent: payment, retry queued, cleanup',
			"console.log('recv');",
			'',
			'// Microtask: drains right after the sync body finishes, before ANY',
			'// timer fires -- the fast lane for must-run-now work.',
			'queueMicrotask(function () {',
			"  console.log('urgent: payment');",
			'});',
			'',
			'// correctly a timer: retries can wait their turn -- leave as is',
			'setTimeout(function () {',
			"  console.log('retry queued');",
			'}, 0);',
			'',
			'// Timer at 10ms: due AFTER the 0ms retry timer, so it lands last.',
			'// The delay is ordering, not waiting -- it costs nothing here.',
			'setTimeout(function () {',
			"  console.log('cleanup');",
			'}, 10);',
			'',
			"console.log('ack');",
			'',
		].join('\n'),
	});
})();
