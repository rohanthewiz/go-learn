/* runner-js.js — the 'js' runner plugin: pure JavaScript executed by the
 * browser's own engine in a web worker, for tracks whose editor holds
 * modern JavaScript.
 *
 * Same worker/watchdog architecture as runner-go.js / runner-ts.js — kill +
 * respawn is the only true preemption for a runaway user program. Spawned
 * LAZILY like the ts runner, though for a different reason: not download
 * weight (the core is a few KB) but symmetry — no worker exists until a js
 * track is actually opened.
 *
 * Contract (subset runner-go.js implements): { id, isReady(), run(src) }.
 * run resolves (never rejects) with {stdout, stderr, ms} | {error, line?,
 * col?, stderr?, ms?} — same shape, so the built-in kinds work unchanged.
 */
(function () {
	'use strict';

	// Execution is native JS and the virtual-timer drain is capped, so
	// anything beyond this is an infinite synchronous loop in user code.
	var WATCHDOG_MS = 6000;

	var worker = null;        // null until first run() — lazy, see above
	var ready = false;
	var nextId = 1;
	var pending = {};         // id -> {resolve, watchdog}
	var sendQueue = [];       // runs requested while (re)spawning

	function spawn() {
		ready = false;
		worker = new Worker('engine/worker-js.js');
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
				settleAll({ error: 'JavaScript runner failed to load — ' + m.error });
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
		id: 'js',
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
