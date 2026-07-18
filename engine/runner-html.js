/* runner-html.js — the 'html' runner plugin: the strict validator +
 * outline core (engine/html-run.js) run on the main thread.
 *
 * The other runners (go-wasm, ts, js) live in web workers because they
 * EXECUTE learner code — a runaway program needs kill-and-respawn
 * preemption. This one only PARSES: one linear pass with a hard input-size
 * cap, no user code ever runs, so a worker (and its watchdog machinery)
 * would be pure ceremony. The result is wrapped in Promise.resolve to
 * keep the contract the kinds rely on: run(src) returns a Promise of
 * {stdout, ms} | {error, line?, col?, ms}.
 */
(function () {
	'use strict';

	var core = GoLearnHTMLRun.create();

	GoLearn.registerRunner({
		id: 'html',
		// The core arrives with this script tag — there is no async load to
		// wait for, so the "loading interpreter…" state never shows.
		isReady: function () { return true; },
		run: function (src) {
			return Promise.resolve(core.run(src));
		},
	});
})();
