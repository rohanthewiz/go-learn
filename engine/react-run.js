/* react-run.js — the React compile-render-outline core shared by the browser
 * worker (engine/worker-react.js) and the Node verification harness
 * (verify/verify.mjs). UMD-exported like ts-run.js / js-run.js / html-run.js:
 * one implementation, zero drift between CI and production.
 *
 * A React lesson's "run" is a three-stage pipeline, and each stage is one of
 * the track's grading gates:
 *
 *   1. COMPILE — the vendored TypeScript compiler transpiles JSX
 *      (ts.transpileModule, no type-check: the track teaches React, not TS,
 *      so the language is JavaScript-plus-JSX and only syntax gates the run);
 *   2. EXECUTE + RENDER — the compiled script runs with React in scope and
 *      must leave a component named App; ReactDOMServer.renderToStaticMarkup
 *      renders <App /> to an HTML string. This is the DETERMINISTIC render:
 *      no DOM, no effects, no events — the exact same bytes in a worker and
 *      in Node, which is what checks need. (The browser kind additionally
 *      mounts the same compiled code LIVE in an iframe — interactivity lives
 *      there; grading lives here.)
 *   3. OUTLINE — the rendered HTML is fed through the html-pure track's
 *      validator/outliner (engine/html-run.js), so checks pin the same
 *      2-space-indented structure outline html-pure established, instead of
 *      brittle raw-markup substrings. React's serializer emits well-formed
 *      markup (entities escaped, explicit closes), so a validator error here
 *      means a bug worth surfacing, with one teaching exception: duplicate
 *      DOM ids (e.g. an id= inside a .map) are a real React mistake and the
 *      validator's diagnostic is the honest error message.
 *
 * React's own dev-build warnings (missing keys, invalid nesting…) normally
 * go to the global console, invisible in a worker. They are captured here and
 * appended to stdout's console section prefixed "warn:" — for a lessons
 * track those warnings ARE curriculum (a keys lesson pins the key warning),
 * so they must be part of what checks can see.
 *
 * stdout layout (what checks pin):
 *
 *   ul id="perms"            ← outline of renderToStaticMarkup(<App />)
 *     li
 *       "read"
 *   -- console --            ← only present when something logged
 *   hello from render
 *   warn: Each child in a list should have a unique "key" prop. …
 *
 * run(src) resolves (never rejects) with {stdout, stderr, ms, js} |
 * {error, line?, col?, ms}. The extra `js` field carries the compiled
 * program so the browser 'app' kind can mount the SAME compilation live in
 * its preview iframe — compile once, render twice.
 */
(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	root.GoLearnReactRun = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
	'use strict';

	var CONSOLE_MARK = '-- console --';

	// fmt kept in lockstep with js-run.js (numbers via String so NaN/Infinity
	// survive; Map/Set/bigint aware; JSON for objects) — a learner moving
	// between tracks sees identical rendering for identical values.
	function fmt(v) {
		if (typeof v === 'string') return v;
		if (typeof v === 'number') return String(v);
		if (typeof v === 'function') return '[function ' + (v.name || 'anonymous') + ']';
		if (typeof v === 'bigint') return String(v) + 'n';
		if (v instanceof Map) return 'Map(' + v.size + ') {' + Array.from(v.entries()).map(function (e) { return ' ' + fmt(e[0]) + ' => ' + fmt(e[1]); }).join(',') + ' }';
		if (v instanceof Set) return 'Set(' + v.size + ') {' + Array.from(v.values()).map(function (x) { return ' ' + fmt(x); }).join(',') + ' }';
		try {
			var s = JSON.stringify(v, function (_k, x) { return typeof x === 'bigint' ? String(x) + 'n' : x; });
			return s === undefined ? String(v) : s;
		} catch (_) { return String(v); } // circular etc.
	}

	// React dev warnings are printf-style ("Warning: … %s%s"). A tiny
	// substituting formatter keeps them readable in the console section;
	// unmatched extra args append space-separated, like the real console.
	function fmtPrintf(args) {
		if (typeof args[0] !== 'string' || args[0].indexOf('%') === -1) {
			return Array.prototype.map.call(args, fmt).join(' ');
		}
		var i = 1;
		var out = args[0].replace(/%[sdifoOc%]/g, function (m) {
			if (m === '%%') return '%';
			if (m === '%c') { i++; return ''; } // CSS directive: swallow its arg
			return i < args.length ? fmt(args[i++]) : m;
		});
		for (; i < args.length; i++) out += ' ' + fmt(args[i]);
		return out;
	}

	// Runtime-error line mapping, same arithmetic as js-run.js: new Function's
	// synthetic source puts user line 1 at stack line 4. transpileModule
	// preserves line structure for JSX (expressions rewrite in place), so the
	// mapped line is the user's JSX line in practice; when the stack gives
	// nothing plausible the position is simply omitted.
	var WRAPPER_LINES = 3;
	function mapLine(err, srcLineCount) {
		if (!err || typeof err.stack !== 'string') return null;
		var m = /<anonymous>:(\d+):(\d+)/.exec(err.stack);
		if (!m) return null;
		var line = Number(m[1]) - WRAPPER_LINES;
		if (line < 1 || line > srcLineCount) return null;
		return { line: line, col: Number(m[2]) };
	}

	// create() takes the four loaded pieces (hosts load them: importScripts in
	// the worker, require/sandbox-eval in Node) — same inversion as ts-run.js,
	// so this file never touches the network or the filesystem.
	function create(ts, React, ReactDOMServer, HTMLRun) {
		var outliner = HTMLRun.create();

		// transpileModule (not createProgram): syntax-only, ~1-2 ms a run, and
		// no lib .d.ts closure to load — the deliberate opposite of ts-pure,
		// where the type checker is the harness. Here the harness is the
		// rendered tree.
		var COMPILE_OPTS = {
			jsx: ts.JsxEmit.React,
			jsxFactory: 'React.createElement',
			jsxFragmentFactory: 'React.Fragment',
			target: ts.ScriptTarget.ES2020,
			module: ts.ModuleKind.None,
			ignoreDeprecations: '6.0', // module:None is deprecated in TS 6; scripts are exactly what we run
		};

		function compile(src) {
			var out = ts.transpileModule(src, { compilerOptions: COMPILE_OPTS, reportDiagnostics: true });
			var diags = (out.diagnostics || []).filter(function (d) {
				return d.category === ts.DiagnosticCategory.Error;
			});
			if (diags.length) {
				var first = null;
				var msgs = diags.map(function (d) {
					var msg = 'TS' + d.code + ': ' + ts.flattenDiagnosticMessageText(d.messageText, '\n\t');
					if (d.file && d.start !== undefined) {
						var lc = d.file.getLineAndCharacterOfPosition(d.start);
						if (!first) { first = { line: lc.line + 1, col: lc.character + 1 }; return msg; }
						return 'line ' + (lc.line + 1) + ':' + (lc.character + 1) + ' — ' + msg;
					}
					return msg;
				});
				var err = { error: msgs.join('\n') };
				if (first) { err.line = first.line; err.col = first.col; }
				return err;
			}
			return { js: out.outputText };
		}

		function run(src) {
			var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
			var msNow = function () { return (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0; };
			var srcLineCount = src.split('\n').length;

			var c = compile(src);
			if (c.error !== undefined) { c.ms = msNow(); return Promise.resolve(c); }

			var logs = [], errOut = [];
			var consoleShim = {
				log: function () { logs.push(fmtPrintf(arguments)); },
				error: function () { logs.push('error: ' + fmtPrintf(arguments)); },
				warn: function () { logs.push('warn: ' + fmtPrintf(arguments)); },
			};

			// React itself reports through the GLOBAL console (the shim only
			// reaches user code, via parameter). Swap the global's error/warn for
			// the duration of execute+render so dev-build warnings land in the
			// console section — then restore, because the host console belongs to
			// the host. React 18 prefixes these with "Warning: "; that prefix is
			// dropped since the section already tags the line "warn:".
			var host = (typeof self !== 'undefined' ? self : globalThis).console;
			var hostError = host.error, hostWarn = host.warn;
			var captureReact = function () {
				var m = fmtPrintf(arguments).replace(/^Warning: /, '');
				logs.push('warn: ' + m);
			};

			var runtimeErr = null, phase = 'run', App, html = '';
			host.error = captureReact;
			host.warn = captureReact;
			try {
				// Function-scoped execution (reruns never leak bindings; strict
				// mode). The trailing return hands back the component the track's
				// contract requires every lesson to define: a function (or class)
				// named App.
				App = new Function('React', 'console',
					'"use strict";\n' + c.js + '\n;return (typeof App === "undefined") ? undefined : App;'
				)(React, consoleShim);

				if (runtimeErr === null) {
					if (typeof App !== 'function') {
						return Promise.resolve({
							error: App === undefined
								? 'no App component — define `function App() { … }` (the preview renders <App />)'
								: 'App must be a component (a function returning JSX), got ' + typeof App,
							ms: msNow(),
						});
					}
					phase = 'render';
					html = ReactDOMServer.renderToStaticMarkup(React.createElement(App));
				}
			} catch (e) {
				runtimeErr = e;
			} finally {
				host.error = hostError;
				host.warn = hostWarn;
			}

			if (runtimeErr) {
				var r = {
					error: (phase === 'render' ? 'render error: ' : 'runtime error: ') +
						(runtimeErr && runtimeErr.message ? runtimeErr.message : String(runtimeErr)),
					stderr: errOut.join('\n'),
					ms: msNow(),
				};
				var pos = mapLine(runtimeErr, srcLineCount);
				if (pos) { r.line = pos.line; r.col = pos.col; }
				return Promise.resolve(r);
			}

			// Outline the rendered markup. App may legitimately render null →
			// empty outline; checks for such lessons pin the console section.
			var outlined = { stdout: '' };
			if (html !== '') {
				outlined = outliner.run(html);
				if (outlined.error !== undefined) {
					// Almost always a duplicate DOM id — a genuine React bug the
					// validator catches (see header). Present it as the render
					// problem it is, not as an internal failure.
					return Promise.resolve({
						error: 'rendered HTML failed validation: ' + outlined.error +
							'\n(most often a duplicate id= rendered by a loop — ids must be unique per page)',
						ms: msNow(),
					});
				}
			}

			var stdout = outlined.stdout || '';
			if (logs.length) stdout += CONSOLE_MARK + '\n' + logs.join('\n') + '\n';
			return Promise.resolve({ stdout: stdout, stderr: errOut.join('\n'), ms: msNow(), js: c.js });
		}

		return { run: run };
	}

	return {
		CONSOLE_MARK: CONSOLE_MARK,
		create: create,
	};
});
