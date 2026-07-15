/* ts-pure — Pure TypeScript, fundamentals through intermediate.
 *
 * Unlike the "TypeScript + Go Web" track (which teaches the tsgo/element/
 * rweb integration with Go in the editor), this track puts TYPESCRIPT in
 * the editor: the vendored TypeScript compiler runs in a web worker (see
 * engine/runner-ts.js), type-checks the file in strict mode, and only then
 * executes it. A type error means no output at all — so the checker is the
 * real gatekeeper of every exercise, exactly as it is in a real project.
 *
 * The ambient world is ES2020 + console, nothing else (no DOM, no timers):
 * every program is deterministic, and reaching for setTimeout or document
 * is itself a type error the lesson can point at.
 *
 * Items are kind:'lesson' (run the file, check stdout) with lang:'ts' so
 * the editor overlay and error mapping treat the source as TypeScript.
 * Some starters intentionally fail to compile (starterError: true) — the
 * red diagnostic IS the lesson, and the verify harness asserts that the
 * starter errors and the solution runs clean.
 *
 * Curriculum (17 items): annotations & inference → functions → object
 * types → arrays & tuples → unions & literals → narrowing → discriminated
 * unions → type predicates → interfaces & intersections → classes → enums
 * & const assertions → generic functions → generic types → keyof & indexed
 * access → utility types → mapped types → promises & async.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'ts-pure',
		title: 'Pure TypeScript',
		runner: 'ts',
		order: [
			// Foundations
			'hello-types', 'functions', 'objects', 'arrays-tuples',
			// Unions & Narrowing
			'unions-literals', 'narrowing', 'discriminated-unions', 'type-predicates',
			// Objects & Classes
			'interfaces-intersections', 'classes', 'enums-as-const',
			// Generics
			'generics', 'generic-types', 'keyof-indexed',
			// Type Transformation
			'utility-types', 'mapped-types',
			// Async
			'promises-async',
		],
	});

	// globalThis (not window) so the Node verification harness can load
	// lesson files unchanged.
	globalThis.GoLearnTSP = {
		lesson: function (def) {
			def.kind = 'lesson';
			def.lang = 'ts'; // editor overlay + snippet default for this item
			GoLearn.registerItem('ts-pure', def);
		},
	};
})();
