/* ts-run.js — the TypeScript compile-and-run core shared by the browser
 * worker (engine/worker-ts.js) and the Node verification harness
 * (verify/verify.mjs). UMD-exported for the same reason assemble.js is:
 * one implementation, zero drift between CI and production.
 *
 * The pipeline per run:
 *   1. type-check the editor contents as a single script ("main.ts") with
 *      strict mode on — for a TypeScript track the checker IS the test
 *      harness, so error-severity diagnostics abort the run and surface in
 *      the editor's error pane with line:col mapping;
 *   2. emit (types erased, ES2020 out) and execute the JS with a captured
 *      console;
 *   3. settle one macrotask so promise chains and async functions get to
 *      print before stdout is collected — a single setTimeout(0) is enough,
 *      because every pending microtask drains before the next macrotask.
 *
 * The ambient environment is deliberately tiny: ES2020 lib + a console
 * declaration (EXTRA_DTS). No DOM, no timers — lessons that reach for
 * setTimeout or document get a type error, which keeps every program
 * deterministic and the async lesson honest (resolved promises only).
 *
 * This file does NOT load the compiler or the lib files — the host does
 * (importScripts + fetch in the worker, require + fs in Node) and passes
 * them in. LIB_FILES is the transitive /// <reference lib> closure of
 * lib.es2020.d.ts, so both hosts load exactly the set the checker resolves.
 */
(function (root, factory) {
	var api = factory();
	if (typeof module === 'object' && module.exports) module.exports = api;
	root.GoLearnTSRun = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
	'use strict';

	var DEFAULT_LIB = 'lib.es2020.d.ts';

	var LIB_FILES = [
		'lib.es5.d.ts',
		'lib.es2015.d.ts', 'lib.es2015.core.d.ts', 'lib.es2015.collection.d.ts',
		'lib.es2015.generator.d.ts', 'lib.es2015.iterable.d.ts',
		'lib.es2015.promise.d.ts', 'lib.es2015.proxy.d.ts',
		'lib.es2015.reflect.d.ts', 'lib.es2015.symbol.d.ts',
		'lib.es2015.symbol.wellknown.d.ts',
		'lib.es2016.d.ts', 'lib.es2016.array.include.d.ts', 'lib.es2016.intl.d.ts',
		'lib.es2017.d.ts', 'lib.es2017.arraybuffer.d.ts', 'lib.es2017.date.d.ts',
		'lib.es2017.intl.d.ts', 'lib.es2017.object.d.ts',
		'lib.es2017.sharedmemory.d.ts', 'lib.es2017.string.d.ts',
		'lib.es2017.typedarrays.d.ts',
		'lib.es2018.d.ts', 'lib.es2018.asyncgenerator.d.ts',
		'lib.es2018.asynciterable.d.ts', 'lib.es2018.intl.d.ts',
		'lib.es2018.promise.d.ts', 'lib.es2018.regexp.d.ts',
		'lib.es2019.d.ts', 'lib.es2019.array.d.ts', 'lib.es2019.intl.d.ts',
		'lib.es2019.object.d.ts', 'lib.es2019.string.d.ts', 'lib.es2019.symbol.d.ts',
		'lib.es2020.d.ts', 'lib.es2020.bigint.d.ts', 'lib.es2020.date.d.ts',
		'lib.es2020.intl.d.ts', 'lib.es2020.number.d.ts', 'lib.es2020.promise.d.ts',
		'lib.es2020.sharedmemory.d.ts', 'lib.es2020.string.d.ts',
		'lib.es2020.symbol.wellknown.d.ts',
		'lib.decorators.d.ts', 'lib.decorators.legacy.d.ts',
	];

	// The whole ambient world beyond the ES2020 lib. Declared here (not as a
	// vendored file) so both hosts agree on it and it versions with this code.
	var EXTRA_DTS =
		'declare var console: {\n' +
		'\tlog(...args: unknown[]): void;\n' +
		'\terror(...args: unknown[]): void;\n' +
		'\twarn(...args: unknown[]): void;\n' +
		'};\n';

	// fmt renders one console.log argument. Both hosts use this shim, so
	// lesson checks see identical output in the browser and in CI — unlike
	// leaning on the host console, whose object formatting differs everywhere.
	function fmt(v) {
		if (typeof v === 'string') return v;
		if (typeof v === 'function') return '[function ' + (v.name || 'anonymous') + ']';
		if (typeof v === 'bigint') return String(v) + 'n';
		if (v instanceof Map) return 'Map(' + v.size + ') {' + Array.from(v.entries()).map(function (e) { return ' ' + fmt(e[0]) + ' => ' + fmt(e[1]); }).join(',') + ' }';
		if (v instanceof Set) return 'Set(' + v.size + ') {' + Array.from(v.values()).map(function (x) { return ' ' + fmt(x); }).join(',') + ' }';
		try {
			var s = JSON.stringify(v, function (_k, x) { return typeof x === 'bigint' ? String(x) + 'n' : x; });
			return s === undefined ? String(v) : s;
		} catch (_) { return String(v); } // circular etc.
	}

	// create builds a compiler instance around a loaded `ts` module and the
	// lib file contents ({name: text}). Returns { run(src) -> Promise }.
	// Lib SourceFiles are parsed once and reused across programs — they are
	// immutable, and re-parsing 45 of them per keystroke is the difference
	// between ~140ms and ~40ms a run.
	function create(ts, libs) {
		var options = {
			strict: true,
			target: ts.ScriptTarget.ES2020,
			lib: [DEFAULT_LIB],
			module: ts.ModuleKind.None,
			ignoreDeprecations: '6.0', // module:None is deprecated in TS 6; scripts are exactly what we run
			types: [],
			skipLibCheck: true,
		};

		var libCache = {};
		function sourceFor(name, text) {
			if (libCache[name]) return libCache[name];
			var sf = ts.createSourceFile(name, text, options.target);
			if (name !== 'main.ts') libCache[name] = sf;
			return sf;
		}

		function compile(src) {
			var files = { 'main.ts': src, 'golearn.d.ts': EXTRA_DTS };
			var emitted = '';
			var host = {
				getSourceFile: function (name) {
					if (files[name] !== undefined) return sourceFor(name, files[name]);
					if (libs[name] !== undefined) return sourceFor(name, libs[name]);
					return undefined;
				},
				getDefaultLibFileName: function () { return DEFAULT_LIB; },
				writeFile: function (_name, text) { emitted = text; },
				getCurrentDirectory: function () { return ''; },
				getCanonicalFileName: function (f) { return f; },
				useCaseSensitiveFileNames: function () { return true; },
				getNewLine: function () { return '\n'; },
				fileExists: function (name) { return files[name] !== undefined || libs[name] !== undefined; },
				readFile: function (name) { return files[name] !== undefined ? files[name] : libs[name]; },
			};
			var program = ts.createProgram(['golearn.d.ts', 'main.ts'], options, host);

			var diags = ts.getPreEmitDiagnostics(program).filter(function (d) {
				return d.category === ts.DiagnosticCategory.Error;
			});
			if (diags.length) {
				// First diagnostic supplies the mappable line:col (the error pane
				// prefixes it); the rest carry their own positions in the text.
				var first = null;
				var msgs = diags.map(function (d, idx) {
					var msg = 'TS' + d.code + ': ' + ts.flattenDiagnosticMessageText(d.messageText, '\n\t');
					if (d.file && d.file.fileName === 'main.ts' && d.start !== undefined) {
						var lc = d.file.getLineAndCharacterOfPosition(d.start);
						if (!first) { first = { line: lc.line + 1, col: lc.character + 1 }; return msg; }
						return 'line ' + (lc.line + 1) + ':' + (lc.character + 1) + ' — ' + msg;
					}
					return msg;
				});
				var err = { error: msgs.join('\n') };
				if (first && diags[0].file && diags[0].file.fileName === 'main.ts') {
					err.line = first.line;
					err.col = first.col;
				}
				return err;
			}

			program.emit();
			return { js: emitted };
		}

		function run(src) {
			var t0 = (typeof performance !== 'undefined' ? performance.now() : Date.now());
			var c = compile(src);
			if (c.error !== undefined) {
				c.ms = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
				return Promise.resolve(c);
			}

			var out = [], errOut = [];
			var consoleShim = {
				log: function () { out.push(Array.prototype.map.call(arguments, fmt).join(' ')); },
				error: function () { errOut.push(Array.prototype.map.call(arguments, fmt).join(' ')); },
				warn: function () { errOut.push(Array.prototype.map.call(arguments, fmt).join(' ')); },
			};

			var runtimeErr = null;
			try {
				// Function-scoped execution: top-level let/const/var in the emitted
				// script stay local to this call, so overlapping runs (and reruns)
				// never see each other's bindings. Strict mode keeps accidental
				// globals (`x = 1` without a declaration) a runtime error.
				new Function('console', '"use strict";\n' + c.js)(consoleShim);
			} catch (e) {
				runtimeErr = e;
			}

			// One macrotask turn: lets every already-queued promise/async chain
			// flush its prints. Unresolvable promises simply never print, which
			// the lesson's stdout check then fails — no hang, no watchdog needed.
			return new Promise(function (resolve) {
				setTimeout(function () {
					var ms = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - t0;
					if (runtimeErr) {
						resolve({
							error: 'runtime error: ' + (runtimeErr && runtimeErr.message ? runtimeErr.message : String(runtimeErr)),
							stderr: errOut.join('\n'),
							ms: ms,
						});
						return;
					}
					var stdout = out.join('\n');
					if (stdout) stdout += '\n';
					resolve({ stdout: stdout, stderr: errOut.join('\n'), ms: ms });
				}, 0);
			});
		}

		return { run: run };
	}

	return {
		DEFAULT_LIB: DEFAULT_LIB,
		LIB_FILES: LIB_FILES,
		EXTRA_DTS: EXTRA_DTS,
		create: create,
	};
});
