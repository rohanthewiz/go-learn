/* worker-py.js — hosts the CPython (Pyodide) interpreter off the main
 * thread.
 *
 * Same rationale as the other exec workers: user code can loop forever and
 * terminate() is the only true preemption — the runner (engine/runner-py.js)
 * owns that watchdog. Boot is the heavy part here (~13 MB of wasm + stdlib,
 * a 1-3 s instantiation), which is why the runner spawns lazily and why
 * 'ready' is only posted once loadPyodide fully resolves.
 *
 * This is the one MODULE worker in the engine (the others use
 * importScripts): Pyodide's core is shipped as an ES module
 * (pyodide.asm.mjs) that its loader pulls in via dynamic import, which a
 * classic worker cannot do. The runner therefore spawns this file with
 * {type:'module'}. py-run.js is a classic UMD script, but importing a UMD
 * file as a module simply runs it — it attaches GoLearnPyRun to the worker
 * global exactly as importScripts would.
 *
 * PYTHONHASHSEED=0 is passed at interpreter start (it is read before
 * Python's first statement; setting it later is a no-op) — see py-run.js
 * for why determinism needs it.
 *
 * Protocol (identical to the other workers):
 *   -> {id, src}                 run request
 *   <- {type:'ready', version}   interpreter booted
 *   <- {type:'result', id, r}    r = {stdout, stderr, ms} | {error, line?}
 *   <- {type:'fatal', error}     Pyodide failed to load
 */
import { loadPyodide } from '../third_party/pyodide/pyodide.mjs';
import './py-run.js'; // side-effect: attaches GoLearnPyRun to the global

var runner = null;

loadPyodide({
	indexURL: new URL('../third_party/pyodide/', import.meta.url).href,
	env: { PYTHONHASHSEED: '0' },
}).then(function (py) {
	runner = GoLearnPyRun.create(py);
	postMessage({ type: 'ready', version: 'Python ' + py.runPython('import sys; "%d.%d.%d" % sys.version_info[:3]') });
}).catch(function (err) {
	postMessage({ type: 'fatal', error: String(err) });
});

// Runs are chained on a promise queue, same discipline as the other workers:
// serializing keeps results leaving in request order (and Pyodide's
// stdout sinks are per-instance, so overlap would interleave output).
var queue = Promise.resolve();
self.onmessage = function (e) {
	var id = e.data.id, src = e.data.src;
	queue = queue.then(function () {
		if (!runner) return; // fatal already posted; runner side settles the run
		return runner.run(src).then(function (r) {
			postMessage({ type: 'result', id: id, r: r });
		});
	});
};
