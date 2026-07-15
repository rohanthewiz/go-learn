/* runner-ts.js — the 'ts' runner plugin: real TypeScript (the vendored JS
 * compiler) in a web worker, for tracks whose editor holds TypeScript.
 *
 * Same worker/watchdog architecture as runner-go.js — kill + respawn is the
 * only true preemption for a runaway user program — with one deliberate
 * difference: the worker spawns LAZILY, on the first run() request. The
 * compiler is a ~9 MB download, and eagerly spawning at page load would tax
 * every visitor who never opens a TypeScript track. The go-wasm worker stays
 * eager because every default view needs it; this one pays its cost only
 * when a ts track is activated (the engine's first open() triggers run()).
 *
 * Contract (subset runner-go.js implements): { id, isReady(), run(src) }.
 * run resolves (never rejects) with {stdout, stderr, ms} | {error, line?,
 * col?, stderr?, ms?} — same shape, so the built-in kinds work unchanged.
 */
(function () {
	'use strict';

	// Compiles are ~40-140 ms and execution is plain JS, so anything beyond
	// this is an infinite loop in user code (compiler boot happens before
	// 'ready', not inside a run, so it can't eat into the budget).
	var WATCHDOG_MS = 6000;

	var worker = null;        // null until first run() — see lazy note above
	var ready = false;
	var nextId = 1;
	var pending = {};         // id -> {resolve, watchdog}
	var sendQueue = [];       // runs requested while (re)spawning

	function spawn() {
		ready = false;
		worker = new Worker('engine/worker-ts.js');
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
				settleAll({ error: 'TypeScript compiler failed to load — ' + m.error });
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
		id: 'ts',
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
