/* worker-react.js — hosts the React compile-render pipeline off the main
 * thread.
 *
 * Same rationale as worker-ts.js: user code can loop forever (a component
 * body is arbitrary JavaScript), and the only true preemption a browser
 * offers is terminate()-ing the worker — the runner (engine/runner-react.js)
 * owns that watchdog. The TypeScript compiler is the same ~9 MB vendored
 * file the ts worker loads; each worker parses its own copy, which is the
 * price of workers having no shared memory — acceptable because both spawn
 * lazily and the HTTP cache serves the second load.
 *
 * The React UMD builds attach to the worker global (React, ReactDOMServer)
 * — inside importScripts there is no `module`/`exports`, so the UMD header
 * takes its global-attach branch. Dev builds, not prod: this is a teaching
 * track, and the dev build's warnings (keys, invalid nesting) are part of
 * the curriculum — react-run.js captures them into stdout.
 *
 * No lib .d.ts fetches (the deliberate contrast with worker-ts.js):
 * transpileModule never type-checks, so boot is importScripts + 'ready'.
 *
 * Protocol (identical to worker.js / worker-ts.js / worker-js.js):
 *   -> {id, src}                 run request
 *   <- {type:'ready', version}   compiler + libs loaded
 *   <- {type:'result', id, r}    r = {stdout, stderr, ms, js} | {error, line?, col?}
 *   <- {type:'fatal', error}     a vendored file failed to load
 */
try {
	importScripts(
		'../third_party/typescript/typescript.js',
		'../third_party/react/react.development.js',
		'../third_party/react/react-dom-server-legacy.browser.development.js',
		'html-run.js',
		'react-run.js'
	);
} catch (err) {
	postMessage({ type: 'fatal', error: String(err) });
}

var runner = null;
if (typeof GoLearnReactRun !== 'undefined' && typeof React !== 'undefined' && typeof ReactDOMServer !== 'undefined') {
	runner = GoLearnReactRun.create(ts, React, ReactDOMServer, GoLearnHTMLRun);
	postMessage({ type: 'ready', version: 'React ' + React.version + ' / TS ' + ts.version });
}

// Runs are chained on a promise queue, same discipline as the other workers:
// serializing keeps results leaving in request order.
var queue = Promise.resolve();
self.onmessage = function (e) {
	var id = e.data.id, src = e.data.src;
	queue = queue.then(function () {
		return runner.run(src).then(function (r) {
			postMessage({ type: 'result', id: id, r: r });
		});
	});
};
