/* py-run.js — the Python execute core shared by the browser worker
 * (engine/worker-py.js) and the Node verification harness
 * (verify/verify.mjs). UMD-exported like the other run cores: one
 * implementation, zero drift between CI and production.
 *
 * The interpreter is REAL CPython — the vendored Pyodide WASM build under
 * third_party/pyodide/ — the same fidelity move the Go track makes with its
 * wasm interpreter. What the type checker is to ts-pure and virtual timers
 * are to js-pure, the GENUINE CPython runtime is to this track: real
 * tracebacks, real semantics (descriptors, MRO, generators), no simulation
 * to drift from the language.
 *
 * Both hosts load Pyodide themselves (module-import in the worker, require
 * in Node) and pass the booted instance in — same inversion as ts-run.js —
 * WITH env PYTHONHASHSEED=0. That env var is the determinism keystone: it
 * must be set before interpreter start, and without it CPython randomizes
 * string hashing per process, which would make any printed set/dict-derived
 * ordering differ between a learner's run and CI. (Checks should still
 * prefer sorted() output; the seed makes the escape hatch safe, not
 * encouraged.)
 *
 * Per-run isolation: each run executes in a FRESH globals dict (plus
 * __name__ = "__main__" so the if __name__ idiom works), so reruns never
 * see each other's bindings — the same guarantee js-run.js gets from
 * function-scoping. The interpreter itself (imported modules, their module-
 * level state) persists across runs like any long-lived REPL; lessons only
 * import stdlib modules, for which that is invisible.
 *
 * Error mapping: a PythonError's message is the real CPython traceback,
 * which includes Pyodide's own eval machinery frames above the learner's.
 * Frames outside <exec> are stripped (they are noise from the learner's
 * point of view), and the LAST <exec> frame supplies {line} — the deepest
 * point in the learner's own code, which is where the eye should go.
 *
 * run(src) resolves (never rejects) with {stdout, stderr, ms} |
 * {error, line?, ms} — the shared runner contract.
 */
(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	root.GoLearnPyRun = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
	'use strict';

	// Keep the learner's frames; drop Pyodide's. A traceback line pair is
	//   File "<exec>", line N, in f
	//     <source echo>
	// and only File-lines carry the filename to filter on.
	function cleanTraceback(msg) {
		var lines = String(msg).split('\n');
		var out = [], keepBlock = false;
		for (var i = 0; i < lines.length; i++) {
			var ln = lines[i];
			var isFrame = /^ {2}File "/.test(ln);
			if (isFrame) keepBlock = ln.indexOf('File "<exec>"') !== -1;
			if (ln === 'Traceback (most recent call last):' || !isFrame && !/^ {4}/.test(ln) && !/^ {2}/.test(ln)) {
				// header, caret lines, and the final ExceptionType: message lines
				out.push(ln);
			} else if (keepBlock) {
				out.push(ln);
			}
		}
		return out.join('\n');
	}

	function lastExecLine(msg) {
		var m, re = /File "<exec>", line (\d+)/g, last = null;
		while ((m = re.exec(String(msg))) !== null) last = Number(m[1]);
		return last;
	}

	function create(pyodide) {
		// RAW byte sinks, not Pyodide's `batched` mode: batched buffers until a
		// newline arrives, so a final print(..., end="") would sit in the buffer
		// and leak into the NEXT run's output. write-mode delivers every chunk
		// immediately; the decoders are streaming (a UTF-8 code point may split
		// across chunks) and are flushed at end of run. The sinks are instance-
		// global but runs are serialized by both hosts, so per-run rebinding of
		// the accumulator strings is safe.
		var out = null, errOut = null;
		var outDec = new TextDecoder(), errDec = new TextDecoder();
		pyodide.setStdout({ write: function (buf) { if (out !== null) out.s += outDec.decode(buf, { stream: true }); return buf.length; } });
		pyodide.setStderr({ write: function (buf) { if (errOut !== null) errOut.s += errDec.decode(buf, { stream: true }); return buf.length; } });

		function run(src) {
			var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
			var msNow = function () { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0; };

			out = { s: '' }; errOut = { s: '' };
			var g = pyodide.globals.get('dict')();
			g.set('__name__', '__main__');
			var result;
			try {
				pyodide.runPython(src, { globals: g });
				// Python-side flush pushes buffered io through to the JS sinks;
				// the decoder flush below then completes any split code point.
				pyodide.runPython('import sys\nsys.stdout.flush()\nsys.stderr.flush()');
				var stdout = out.s + outDec.decode();
				// Normalize like the other cores: non-empty stdout ends in \n
				// (print supplies it; a trailing end="" write gets one appended).
				if (stdout && stdout[stdout.length - 1] !== '\n') stdout += '\n';
				var stderr = (errOut.s + errDec.decode()).replace(/\n$/, '');
				result = { stdout: stdout, stderr: stderr, ms: msNow() };
			} catch (e) {
				var msg = e && e.message ? e.message : String(e);
				outDec.decode(); errDec.decode(); // reset streaming state for the next run
				result = { error: cleanTraceback(msg), ms: msNow() };
				var line = lastExecLine(msg);
				if (line !== null) result.line = line;
			} finally {
				out = null; errOut = null;
				g.destroy();
			}
			return Promise.resolve(result);
		}

		return { run: run };
	}

	return { create: create };
});
