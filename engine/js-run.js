/* js-run.js — the JavaScript execute core shared by the browser worker
 * (engine/worker-js.js) and the Node verification harness
 * (verify/verify.mjs). UMD-exported for the same reason ts-run.js is:
 * one implementation, zero drift between CI and production.
 *
 * There is no compile step — the host engine (V8 in Chrome and Node alike)
 * runs modern JavaScript natively, which is the whole point of a pure-JS
 * track: the language the learner types is the language that executes.
 *
 * What replaces the TS track's "the checker is the harness" gate is
 * DETERMINISM ENGINEERING around the event loop:
 *
 *   - console is the same fmt shim ts-run.js uses, so lesson checks see
 *     byte-identical stdout in the browser and in CI;
 *   - setTimeout / setInterval are VIRTUAL: callbacks queue with a virtual
 *     due-time and fire in (due, insertion) order after the synchronous
 *     body returns — no wall-clock, no jitter, so `setTimeout(f, 100)`
 *     orders identically everywhere and an event-loop lesson can assert
 *     exact interleaving of sync → microtasks → timer callbacks;
 *   - between every timer callback the drain loop yields one REAL
 *     macrotask, which by spec lets the entire microtask queue (promise
 *     chains, await continuations) flush first — exactly the ordering the
 *     real event loop guarantees.
 *
 * The macrotask yield uses setImmediate (Node) or a MessageChannel port
 * (workers) rather than real setTimeout: browsers clamp nested timeouts to
 * ~4 ms after a few levels, and a lesson firing a few hundred virtual
 * timers must not eat the runner's watchdog budget.
 *
 * Timer fires are capped (MAX_FIRES) so an uncleared setInterval or a
 * self-rescheduling timeout ends with a diagnostic instead of a watchdog
 * kill in the browser — or a hang in CI, which has no watchdog at all.
 */
(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	root.GoLearnJSRun = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
	'use strict';

	var MAX_FIRES = 1000;

	// fmt renders one console.log argument — kept in lockstep with the copy
	// in ts-run.js so a learner moving between the two tracks sees the same
	// rendering for the same value (Map/Set/bigint aware, JSON for objects),
	// with one addition: numbers print via String, because JSON.stringify
	// turns NaN and Infinity into "null" — unacceptable in a language track
	// whose coercion lessons print exactly those values.
	function fmt(v) {
		if (typeof v === 'string') return v;
		if (typeof v === 'number') return String(v);
		if (typeof v === 'function') return '[function ' + (v.name || 'anonymous') + ']';
		if (typeof v === 'bigint') return String(v) + 'n';
		if (v instanceof Map) return 'Map(' + v.size + ') {' + Array.from(v.entries()).map(function (e) { return ' ' + fmt(e[0]) + ' => ' + fmt(e[1]); }).join(',') + ' }';
		if (v instanceof Set) return 'Set(' + v.size + ') {' + Array.from(v.values()).map(function (x) { return ' ' + fmt(x); }).join(',') + ' }';
		try {
			var s = JSON.stringify(v, function (_k, x) { return typeof x === 'bigint' ? String(x) + 'n' : x; });
			return s === undefined ? String(v) : s;
		} catch (_) { return String(v); } // circular etc.
	}

	// One real macrotask turn, unclamped. Awaiting this guarantees every
	// already-queued microtask (however long the promise chain) has drained —
	// the property the drain loop leans on between timer callbacks.
	function macrotask() {
		return new Promise(function (resolve) {
			if (typeof setImmediate === 'function') { setImmediate(resolve); return; }
			if (typeof MessageChannel !== 'undefined') {
				var ch = new MessageChannel();
				ch.port1.onmessage = function () { ch.port1.onmessage = null; resolve(); };
				ch.port2.postMessage(0);
				return;
			}
			setTimeout(resolve, 0); // last resort; clamping only hurts pathological programs
		});
	}

	// mapLine extracts the user-source line:col of a runtime error from a
	// V8-style stack ("at ... (<anonymous>:L:C)"). new Function's synthetic
	// source is `function anonymous(params\n) {\n"use strict";\n<user src>`,
	// so user line 1 sits at stack line 4 — hence the -3. Non-V8 engines
	// just get no position (the error pane copes; line is optional).
	var WRAPPER_LINES = 3;
	function mapLine(err, srcLineCount) {
		if (!err || typeof err.stack !== 'string') return null;
		var m = /<anonymous>:(\d+):(\d+)/.exec(err.stack);
		if (!m) return null;
		var line = Number(m[1]) - WRAPPER_LINES;
		if (line < 1 || line > srcLineCount) return null;
		return { line: line, col: Number(m[2]) };
	}

	// create() takes no compiler or libs — the signature mirrors ts-run.js
	// (host builds it once, calls run per program) purely for symmetry.
	function create() {
		function run(src) {
			var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
			var srcLineCount = src.split('\n').length;

			var out = [], errOut = [];
			var consoleShim = {
				log: function () { out.push(Array.prototype.map.call(arguments, fmt).join(' ')); },
				error: function () { errOut.push(Array.prototype.map.call(arguments, fmt).join(' ')); },
				warn: function () { errOut.push(Array.prototype.map.call(arguments, fmt).join(' ')); },
			};

			// --- virtual timers ------------------------------------------------
			// vnow only ever moves forward to the due-time of the timer being
			// fired; delays are ordering, not waiting. seq breaks due-time ties
			// with insertion order, matching how real timer queues behave.
			var timers = [], vnow = 0, seq = 0, nextId = 1;

			function addTimer(fn, delay, args, every) {
				if (typeof fn !== 'function') throw new TypeError('setTimeout/setInterval callback must be a function');
				var d = Math.max(0, Number(delay) || 0);
				timers.push({ id: nextId, due: vnow + d, seq: ++seq, fn: fn, args: args, every: every });
				return nextId++;
			}
			function removeTimer(id) {
				for (var i = 0; i < timers.length; i++) {
					if (timers[i].id === id) { timers.splice(i, 1); return; }
				}
			}
			var setTimeoutShim = function (fn, delay) { return addTimer(fn, delay, Array.prototype.slice.call(arguments, 2)); };
			var setIntervalShim = function (fn, delay) { return addTimer(fn, delay, Array.prototype.slice.call(arguments, 2), Math.max(0, Number(delay) || 0)); };

			// Parse and execute are separate try blocks: a program that fails to
			// PARSE is a syntax error, but a SyntaxError thrown while RUNNING
			// (JSON.parse on bad input) is still a runtime error — the error
			// class alone can't tell the two apart, the phase can.
			var runtimeErr = null, isSyntax = false, body = null;
			try {
				// Function-scoped execution: top-level let/const/var stay local to
				// this call, so reruns never see each other's bindings. The shims
				// arrive as parameters, so bare `setTimeout` in user code resolves
				// to the virtual one — never the host's real timer.
				body = new Function(
					'console', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
					'"use strict";\n' + src
				);
			} catch (e) {
				runtimeErr = e; isSyntax = true;
			}
			if (body) {
				try {
					body(consoleShim, setTimeoutShim, removeTimer, setIntervalShim, removeTimer);
				} catch (e) {
					runtimeErr = e;
				}
			}

			// --- drain: microtasks, then virtual timers in due order ------------
			var fires = 0;
			function drain() {
				if (runtimeErr || !timers.length) return Promise.resolve();
				if (++fires > MAX_FIRES) {
					runtimeErr = new Error('more than ' + MAX_FIRES + ' timer callbacks — uncleared setInterval or a timer rescheduling itself forever?');
					runtimeErr.stack = ''; // synthetic — no user position to map
					return Promise.resolve();
				}
				timers.sort(function (a, b) { return a.due - b.due || a.seq - b.seq; });
				var t = timers.shift();
				vnow = Math.max(vnow, t.due);
				// Intervals reschedule BEFORE the callback runs (as real event
				// loops do), so a callback that calls clearInterval(id) on itself
				// still finds the pending entry to remove.
				if (t.every !== undefined) timers.push({ id: t.id, due: vnow + t.every, seq: ++seq, fn: t.fn, args: t.args, every: t.every });
				try { t.fn.apply(undefined, t.args); } catch (e) { runtimeErr = e; return Promise.resolve(); }
				return macrotask().then(drain);
			}

			return macrotask().then(drain).then(function () {
				var ms = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
				if (runtimeErr) {
					var name = runtimeErr && runtimeErr.name ? runtimeErr.name : 'Error';
					var msg = runtimeErr && runtimeErr.message ? runtimeErr.message : String(runtimeErr);
					var r = {
						error: (isSyntax ? 'syntax error: ' : 'runtime error: ') + name + ': ' + msg,
						stderr: errOut.join('\n'),
						ms: ms,
					};
					var pos = mapLine(runtimeErr, srcLineCount);
					if (pos) { r.line = pos.line; r.col = pos.col; }
					return r;
				}
				var stdout = out.join('\n');
				if (stdout) stdout += '\n';
				return { stdout: stdout, stderr: errOut.join('\n'), ms: ms };
			});
		}

		return { run: run };
	}

	return {
		MAX_FIRES: MAX_FIRES,
		create: create,
	};
});
