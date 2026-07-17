/* js-pure — Pure JavaScript, beginner through advanced.
 *
 * The companion to ts-pure: the editor holds plain modern JavaScript, and
 * the browser's own engine executes it in a web worker (engine/runner-js.js
 * — no compiler, no transform; the language the learner types is the
 * language that runs). What the TS track gets from its type checker, this
 * track gets from determinism engineering in engine/js-run.js:
 *
 *   - the shared console shim renders values byte-identically in the
 *     browser and in CI, so stdout checks never drift;
 *   - setTimeout/setInterval are VIRTUAL — callbacks fire in due-time
 *     order after the synchronous body returns, with the whole microtask
 *     queue drained between fires. Delays are ordering, not waiting, so
 *     async lessons (and a real event-loop lesson, which ts-pure could
 *     never have — timers there are a type error) run instantly and
 *     deterministically.
 *
 * Programs run strict ("use strict" is prepended), function-scoped (reruns
 * never leak bindings), with an ambient world of the JS builtins + console
 * + the virtual timers. No DOM, no fetch — this track is the LANGUAGE.
 *
 * Items are kind:'lesson' (run the file, check stdout) with lang:'js' for
 * the editor overlay and snippet highlighting. starterError lessons ship a
 * starter that must fail at runtime (TDZ, const reassignment...) — the red
 * error IS the lesson, and verify asserts starter errors + solution runs.
 *
 * Curriculum (22 items): values & syntax → types & coercion → control flow
 * → functions → array methods → strings & regex → objects → destructuring
 * & spread → maps & sets → closures → higher-order functions → this →
 * prototypes → classes → inheritance → iterators → generators → promises
 * → async/await → the event loop → error handling → proxy & reflect.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'js-pure',
		title: 'Pure JavaScript',
		runner: 'js',
		order: [
			// Foundations
			'hello-javascript', 'types-coercion', 'control-flow', 'functions',
			// Collections & Data
			'arrays-methods', 'strings-regex', 'objects', 'destructuring-spread', 'maps-sets',
			// Functions in Depth
			'closures', 'higher-order-functions', 'this-binding',
			// Prototypes & Classes
			'prototypes', 'classes', 'inheritance',
			// Iterators & Generators
			'iterators', 'generators',
			// Async JavaScript
			'promises', 'async-await', 'event-loop',
			// Advanced
			'error-handling', 'proxy-reflect',
		],
	});

	// globalThis (not window) so the Node verification harness can load
	// lesson files unchanged.
	globalThis.GoLearnJSP = {
		lesson: function (def) {
			def.kind = 'lesson';
			def.lang = 'js'; // editor overlay + snippet default for this item
			GoLearn.registerItem('js-pure', def);
		},
	};
})();
