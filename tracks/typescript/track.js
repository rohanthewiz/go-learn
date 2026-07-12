/* typescript — TypeScript 7 on a pure-Go web stack.
 *
 * The premise: a Go web app where every front-end artifact is produced by
 * a Go-native tool. element (github.com/rohanthewiz/element) writes the
 * HTML, go-styl compiles Stylus to CSS, and TypeScript 7 — Microsoft's
 * Go-native compiler, `tsgo` — turns typed TS into plain JS. rweb serves
 * the lot from a single binary, with the CSS and JS embedded.
 *
 * What runs in the browser here: element and serr are interpreted from
 * embedded source (they're staged into the wasm runner's virtual GOPATH —
 * see wasm/runner), and go-styl is compiled into the interpreter as
 * extracted symbols, so styl.Compile runs at native speed. rweb needs a
 * real network socket, which WebAssembly doesn't have, so the server wiring
 * appears as read-along code in the final lesson rather than a live run —
 * every pure function around it runs for real.
 *
 * Lessons live in lessons/<slug>.js and register through GoLearnTS.lesson().
 * All items are kind:'lesson' (run the file, check stdout) — integration
 * output is a page, and a page is a string.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'typescript',
		title: 'TypeScript + Go Web',
		runner: 'go-wasm',
		order: [
			// One binary
			'hello-element',
			// HTML in Go
			'components-loops',
			// CSS in Go
			'styl-basics', 'embed-css',
			// TypeScript
			'typescript-7',
			// Ship it
			'rweb-capstone',
		],
	});

	// globalThis (not window) so the Node verification harness can load
	// lesson files unchanged.
	globalThis.GoLearnTS = {
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('typescript', def);
		},
	};
})();
