/* stylus — the principles of CSS, written in Stylus.
 *
 * This track teaches CSS itself — the cascade, specificity, inheritance,
 * the box model, flow, flexbox, grid, positioning, responsive design —
 * using Stylus as the pen: indentation instead of braces, variables,
 * nesting, mixins and compile-time color math, so every principle can be
 * expressed without the boilerplate that makes raw CSS tedious to teach.
 * The compiler is go-styl (a pure-Go Stylus implementation already baked
 * into this page's wasm), which is what lets every lesson COMPILE the
 * learner's sheet live: the editor holds a tiny Go program with the
 * stylesheet embedded, and the output pane shows the real emitted CSS.
 * The checks assert on that CSS — the browser-facing truth — never on the
 * Stylus source, so any correct styling passes.
 *
 * Lessons live in lessons/<slug>.js and register through GoLearnStylus.
 * program() wraps a sheet in the standard compile-and-print harness so
 * lesson files contain stylesheet lines, not Go plumbing.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'stylus',
		title: 'CSS via Stylus',
		runner: 'go-wasm',
		order: [
			// Foundations
			'hello-css', 'cascade-specificity', 'inheritance',
			// Selectors
			'selectors-nesting', 'pseudo-classes',
			// Box Model & Units
			'box-model', 'units', 'colors',
			// Layout
			'display-flow', 'flexbox', 'grid', 'positioning',
			// Responsive & Motion
			'media-queries', 'transitions-keyframes',
			// Abstraction & Reuse
			'mixins', 'capstone',
		],
	});

	// program wraps Stylus sheet lines in the one Go program every lesson
	// shares: compile with go-styl, print the CSS (or the positioned error).
	// The sheet starts on the line after the opening backtick so lesson
	// sources read as pure stylesheet; go-styl ignores the leading newline.
	function program(sheetLines) {
		return [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'',
			'	styl "github.com/rohanthewiz/go-styl"',
			')',
			'',
			'func main() {',
			'	// The stylesheet is Stylus: indentation nests, no braces or',
			'	// semicolons. Edit between the backticks — the compiled CSS',
			'	// below updates as you type.',
			'	sheet := `',
		].concat(sheetLines, [
			'`',
			'',
			'	css, err := styl.Compile(sheet, styl.Options{Pretty: true})',
			'	if err != nil {',
			'		fmt.Println("compile error:", err)',
			'		return',
			'	}',
			'	fmt.Println(css)',
			'}',
			'',
		]).join('\n');
	}

	// globalThis (not window) so the Node verification harness can load
	// track files unchanged.
	globalThis.GoLearnStylus = {
		program: program,
		lesson: function (def) {
			def.kind = 'lesson';
			GoLearn.registerItem('stylus', def);
		},
	};
})();
