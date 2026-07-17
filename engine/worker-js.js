/* worker-js.js — hosts pure-JavaScript execution off the main thread.
 *
 * Same rationale as worker.js / worker-ts.js: user code can loop forever,
 * and the only true preemption a browser offers is terminate()-ing the
 * worker — the runner (engine/runner-js.js) owns that watchdog. There is
 * no compiler to load here (the worker's own V8 runs the source), so boot
 * is just importScripts + an immediate 'ready'.
 *
 * Unhandled promise rejections are swallowed deliberately: a lesson whose
 * starter rejects without a .catch should fail its stdout check, not kill
 * the worker or spam the page console. The rejection still surfaces to the
 * learner as missing output, which is the honest symptom.
 *
 * Protocol (identical to worker.js / worker-ts.js):
 *   -> {id, src}                 run request
 *   <- {type:'ready', version}   ready to run
 *   <- {type:'result', id, r}    r = {stdout, stderr, ms} | {error, line?, col?}
 *   <- {type:'fatal', error}     core failed to load
 */
try {
	importScripts('js-run.js');
} catch (err) {
	postMessage({ type: 'fatal', error: String(err) });
}

self.onunhandledrejection = function (e) { e.preventDefault(); };

var runner = null;
if (typeof GoLearnJSRun !== 'undefined') {
	runner = GoLearnJSRun.create();
	postMessage({ type: 'ready', version: 'host' });
}

// Runs are chained on a promise queue: run() is async (it drains virtual
// timers across real macrotasks), and serializing keeps results leaving in
// request order — same discipline as worker-ts.js.
var queue = Promise.resolve();
self.onmessage = function (e) {
	var id = e.data.id, src = e.data.src;
	queue = queue.then(function () {
		return runner.run(src).then(function (r) {
			postMessage({ type: 'result', id: id, r: r });
		});
	});
};
