/* runner-sh.js — the 'sh' runner plugin: the deterministic POSIX-subset
 * shell core (engine/sh-run.js) run on the main thread.
 *
 * Like runner-html.js there is NO worker — but for a different reason: the
 * html runner only parses, while this one executes learner logic. What
 * makes main-thread safe here is that the interpreter is synchronous and
 * SELF-BOUNDED — a step budget (MAX_STEPS) converts `while true; do :; done`
 * into an error result in microseconds, and output is size-capped — so the
 * kill-and-respawn watchdog machinery would guard against something the
 * core already cannot do. A fresh filesystem is seeded per run, so state
 * never leaks between runs (rm -rf / included).
 *
 * The result is wrapped in Promise.resolve to keep the contract the kinds
 * rely on: run(src) returns a Promise of {stdout, stderr, ms} |
 * {error, line?, ms}.
 */
(function () {
	'use strict';

	var core = GoLearnShRun.create();

	GoLearn.registerRunner({
		id: 'sh',
		// The core arrives with this script tag — no async load to wait for.
		isReady: function () { return true; },
		run: function (src) {
			return Promise.resolve(core.run(src));
		},
	});
})();
