/* python — Pure Python, fundamentals through power features, on real
 * CPython.
 *
 * The editor holds Python; the 'py' runner (see engine/runner-py.js) is the
 * genuine CPython interpreter — the vendored Pyodide WASM build — in a lazy
 * web worker. No transpilation, no subset: real tracebacks, real MRO, real
 * descriptors, the same fidelity move the Go track makes with its wasm
 * interpreter. CI verifies through the identical core under Node
 * (verify.mjs runner 'py'), so the stdout a check pins here is the stdout
 * the browser shows.
 *
 * Determinism: the interpreter starts with PYTHONHASHSEED=0 (see
 * engine/py-run.js) and each run executes in a fresh globals dict, so
 * reruns never leak bindings. Lessons still prefer sorted() when printing
 * set/dict-derived orderings — the seed is a safety net, not a style.
 *
 * The world is CPython + its bundled stdlib, offline: no input(), no
 * network, no pip. Time-dependent and asyncio-dependent code is out of
 * scope by design — every program prints the same bytes every run.
 *
 * Items are kind:'lesson' (run the file, check stdout) with lang:'py' for
 * the editor overlay and snippets. starterError items must raise — the
 * traceback is the lesson.
 *
 * Curriculum (22 items): print & variables → numbers & strings → f-strings
 * → lists & tuples → dicts & sets → control flow → function arguments →
 * the mutable-default gotcha → comprehensions → lambdas & sorting →
 * unpacking → classes → dunder methods → properties & classmethods →
 * dataclasses → inheritance & MRO → match statements → iterators &
 * generators → decorators → exceptions & context managers → itertools &
 * collections → capstone word stats.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'python',
		title: 'Python',
		runner: 'py',
		order: [
			// Foundations
			'hello-python', 'numbers-strings', 'f-strings', 'lists-tuples', 'dicts-sets', 'control-flow',
			// Functions
			'functions-args', 'mutable-default-gotcha', 'comprehensions', 'lambdas-sorting', 'unpacking',
			// Classes & Objects
			'classes-basics', 'dunder-methods', 'properties-classmethods', 'dataclasses', 'inheritance-mro',
			// Power Features
			'match-case', 'iterators-generators', 'decorators', 'exceptions-context', 'itertools-collections',
			// Capstone
			'capstone-wordstats',
		],
	});

	// globalThis (not window) so the Node verification harness can load
	// lesson files unchanged.
	globalThis.GoLearnPy = {
		lesson: function (def) {
			def.kind = 'lesson';
			def.lang = 'py'; // editor overlay + snippet default for this item
			GoLearn.registerItem('python', def);
		},
	};
})();
