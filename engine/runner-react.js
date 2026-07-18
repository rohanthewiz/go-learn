/* runner-react.js — the 'react' runner plugin: JSX compiled by the vendored
 * TypeScript compiler, rendered by the vendored React (server renderer), in
 * a web worker.
 *
 * Same worker/watchdog architecture as runner-ts.js, including the LAZY
 * spawn: the worker's importScripts pulls ~10 MB (compiler + React), a cost
 * only visitors who open the React track should pay. Kill + respawn remains
 * the only true preemption for a runaway component body.
 *
 * Contract (subset runner-go.js implements): { id, isReady(), run(src) }.
 * run resolves (never rejects) with {stdout, stderr, ms, js} | {error,
 * line?, col?, ms?} — the extra `js` (the compiled program) is consumed by
 * the 'app' kind to mount the same compilation live in its preview iframe;
 * kinds that don't know about it are unaffected.
 */
(function () {
	'use strict';

	// Transpile is ~1-2 ms and a static render of lesson-sized trees is
	// single-digit ms, so anything beyond this is an infinite loop in user
	// code (boot happens before 'ready', outside any run's budget).
	var WATCHDOG_MS = 6000;

	var worker = null;        // null until first run() — see lazy note above
	var ready = false;
	var nextId = 1;
	var pending = {};         // id -> {resolve, watchdog}
	var sendQueue = [];       // runs requested while (re)spawning

	function spawn() {
		ready = false;
		worker = new Worker('engine/worker-react.js');
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
				settleAll({ error: 'React runner failed to load — ' + m.error });
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
		id: 'react',
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
