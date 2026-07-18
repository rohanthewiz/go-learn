/* runner-py.js — the 'py' runner plugin: real CPython (the vendored Pyodide
 * WASM build) in a web worker.
 *
 * Same worker/watchdog architecture as runner-ts.js / runner-react.js,
 * including the LAZY spawn — the interpreter is a ~13 MB load that only
 * visitors who open a Python track should pay. One difference: the worker
 * is spawned with {type:'module'}, because Pyodide's core is an ES module
 * (see worker-py.js).
 *
 * The watchdog budget covers RUNS only, not boot: 'ready' gates sending, so
 * the 1-3 s interpreter instantiation can never eat a run's 6 s. A kill on
 * timeout throws away the booted interpreter — respawn re-instantiates the
 * wasm (cached by the browser, so seconds not tens of seconds) — which is
 * the honest price of true preemption.
 *
 * Contract (subset runner-go.js implements): { id, isReady(), run(src) }.
 * run resolves (never rejects) with {stdout, stderr, ms} | {error, line?,
 * ms?} — same shape, so the built-in kinds work unchanged.
 */
(function () {
	'use strict';

	var WATCHDOG_MS = 6000;

	var worker = null;        // null until first run() — see lazy note above
	var ready = false;
	var nextId = 1;
	var pending = {};         // id -> {resolve, watchdog}
	var sendQueue = [];       // runs requested while (re)spawning

	function spawn() {
		ready = false;
		worker = new Worker('engine/worker-py.js', { type: 'module' });
		worker.onmessage = function (e) {
			var m = e.data;
			if (m.type === 'ready') {
				ready = true;
				sendQueue.splice(0).forEach(function (send) { send(); });
			} else if (m.type === 'result') {
				var p = pending[m.id];
				if (!p) return; // already timed out and resolved
				clearTimeout(p.watchdog);
				delete pending[m.id];
				p.resolve(m.r);
			} else if (m.type === 'fatal') {
				settleAll({ error: 'Python interpreter failed to load — ' + m.error });
			}
		};
	}

	function settleAll(result) {
		Object.keys(pending).forEach(function (id) {
			clearTimeout(pending[id].watchdog);
			var resolve = pending[id].resolve;
			delete pending[id];
			resolve(result);
		});
	}

	function killAndRespawn() {
		worker.terminate();
		settleAll({ error: 'runner was busy and had to restart — run again' });
		spawn();
	}

	GoLearn.registerRunner({
		id: 'py',
		isReady: function () { return ready; },

		run: function (src) {
			if (!worker) spawn();
			return new Promise(function (resolve) {
				var id = nextId++;
				var send = function () {
					pending[id] = {
						resolve: resolve,
						watchdog: setTimeout(function () {
							delete pending[id];
							resolve({ error: 'timed out after ~5s — infinite loop? (runner restarted)' });
							killAndRespawn();
						}, WATCHDOG_MS),
					};
					worker.postMessage({ id: id, src: src });
				};
				if (ready) send();
				else sendQueue.push(send); // flushed when the (re)spawn is ready
			});
		},
	});
})();
