/* runner-go.js — the 'go-wasm' runner plugin, backed by a web worker.
 *
 * A runner is the engine's execution backend: tracks declare which runner
 * they need by id, and the engine never talks to the interpreter directly.
 * This indirection is the pluggability seam — a future track can register
 * runner 'none' (no execution; e.g. system-design quizzes) with no engine
 * changes.
 *
 * Contract: { id, isReady(), onBoot(cb), version(), run(src) -> Promise }
 *   run resolves (never rejects) with goRun.run's result shape:
 *   {stdout, stderr, ms} | {error, line?, col?, stderr?, ms?}
 *
 * The interpreter lives in engine/worker.js so a runaway user program
 * can't freeze the page. A watchdog kills and respawns the worker if a run
 * exceeds WATCHDOG_MS; the doomed run (and anything queued behind it)
 * resolves with an error. Respawns are silent — no auto-rerun, or a still-
 * broken editor draft would wedge the fresh worker in a kill/respawn loop;
 * the next keystroke or navigation triggers the next run naturally.
 */
(function () {
	'use strict';

	// Above any legitimate run (heaviest solution ≈ tens of ms interpreted),
	// far below "user thinks the site is broken".
	var WATCHDOG_MS = 6000;

	var worker = null;
	var ready = false;        // current worker instantiated its wasm
	var booted = false;       // first-ever ready already announced to the page
	var version = 'dev';
	var nextId = 1;
	var pending = {};         // id -> {resolve, watchdog}
	var bootCbs = [];         // page-level once-only callbacks (loading screen)
	var sendQueue = [];       // runs requested while (re)spawning

	function spawn() {
		ready = false;
		worker = new Worker('engine/worker.js');
		worker.onmessage = function (e) {
			var m = e.data;
			if (m.type === 'ready') {
				ready = true;
				version = m.version;
				var q = sendQueue.splice(0);
				q.forEach(function (send) { send(); });
				if (!booted) {
					booted = true;
					bootCbs.splice(0).forEach(function (cb) { cb(); });
				}
			} else if (m.type === 'result') {
				var p = pending[m.id];
				if (!p) return; // already timed out and resolved
				clearTimeout(p.watchdog);
				delete pending[m.id];
				p.resolve(m.r);
			} else if (m.type === 'fatal') {
				settleAll({ error: 'interpreter failed to load — ' + m.error });
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
		// Runs queued behind the wedged one died with the worker.
		settleAll({ error: 'interpreter was busy and had to restart — run again' });
		spawn();
	}

	spawn();

	GoLearn.registerRunner({
		id: 'go-wasm',
		isReady: function () { return ready; },
		version: function () { return version; },
		// onBoot fires once, at first-ever readiness — page chrome only.
		onBoot: function (cb) { if (booted) cb(); else bootCbs.push(cb); },

		run: function (src) {
			return new Promise(function (resolve) {
				var id = nextId++;
				var send = function () {
					pending[id] = {
						resolve: resolve,
						watchdog: setTimeout(function () {
							delete pending[id];
							resolve({ error: 'timed out after ~5s — infinite loop? (interpreter restarted)' });
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
