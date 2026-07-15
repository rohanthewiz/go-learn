/* worker-ts.js — hosts the TypeScript compiler off the main thread.
 *
 * Same rationale as worker.js: user code can loop forever, and the only
 * true preemption a browser offers is terminate()-ing the worker — the
 * runner (runner-ts.js) owns that watchdog. The compiler itself is pure
 * JS (the vendored tsc, ~9 MB), so keeping it here also keeps its parse
 * pauses off the UI thread.
 *
 * Boot: importScripts the compiler + shared core synchronously, then fetch
 * the ES2020 lib .d.ts closure. 'ready' is only posted once the libs are in
 * memory; runs requested earlier queue in the runner.
 *
 * Protocol (identical to worker.js):
 *   -> {id, src}                 run request
 *   <- {type:'ready', version}   compiler + libs loaded
 *   <- {type:'result', id, r}    r = {stdout, stderr, ms} | {error, line?, col?}
 *   <- {type:'fatal', error}     compiler or libs failed to load
 */
// third_party (not vendor/): a directory literally named "vendor" makes the
// Go toolchain treat the repo as a vendored module tree and breaks go build.
importScripts('../third_party/typescript/typescript.js', 'ts-run.js');

var runner = null;

Promise.all(GoLearnTSRun.LIB_FILES.map(function (name) {
	return fetch('../third_party/typescript/' + name).then(function (r) {
		if (!r.ok) throw new Error(name + ': HTTP ' + r.status);
		return r.text().then(function (text) { return [name, text]; });
	});
})).then(function (pairs) {
	var libs = {};
	pairs.forEach(function (p) { libs[p[0]] = p[1]; });
	runner = GoLearnTSRun.create(ts, libs);
	postMessage({ type: 'ready', version: ts.version });
}).catch(function (err) {
	postMessage({ type: 'fatal', error: String(err) });
});

// Runs are chained on a promise queue: run() is async (it settles one
// macrotask to let promise chains print), and serializing keeps results
// leaving in request order — the ordering worker.js gets for free from its
// synchronous interpreter.
var queue = Promise.resolve();
self.onmessage = function (e) {
	var id = e.data.id, src = e.data.src;
	queue = queue.then(function () {
		return runner.run(src).then(function (r) {
			postMessage({ type: 'result', id: id, r: r });
		});
	});
};
