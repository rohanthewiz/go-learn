/* styl-basics — compiling Stylus to CSS with go-styl. */
(function () {
	'use strict';

	GoLearnTS.lesson({
		id: 'styl-basics',
		title: 'CSS from Go: go-styl',
		nav: 'go-styl basics',
		category: 'CSS in Go',
		prose: [
			'<h2>CSS from Go: go-styl</h2>' +
			'<p><a href="https://github.com/rohanthewiz/go-styl">go-styl</a> is a pure-Go ' +
			'compiler for the <a href="https://stylus-lang.com/">Stylus</a> preprocessor — ' +
			'variables, nesting, mixins, color math — with no Node.js anywhere. One call ' +
			'does the work:</p>',
			{ code: 'css, err := styl.Compile(sheet, styl.Options{Pretty: true})\nif err != nil {\n\treturn serr.Wrap(err, "styl compile failed")\n}' },
			'<p>Stylus reads like Python: indentation nests selectors, no braces or ' +
			'semicolons needed. Variables are plain assignments, <code>&amp;</code> refers ' +
			'to the parent selector, and color functions compute at compile time:</p>',
			{ lang: 'css', code: 'accent = #0af\n\nbutton\n\tcolor accent\n\t&:hover\n\t\tcolor lighten(accent, 20%)' },
			'<p>compiles to:</p>',
			{ lang: 'css', code: 'button {\n\tcolor: #0af;\n}\n\nbutton:hover {\n\tcolor: #3bf;\n}' },
			'<p>Compile errors are positioned (<code>file:line:col</code>) and wrapped with ' +
			'<a href="https://github.com/rohanthewiz/serr">serr</a>, so a bad sheet tells ' +
			'you exactly where it broke instead of emitting garbage CSS.</p>' +
			'<div class="tip"><code>Options{Pretty: true}</code> is for reading; leave it ' +
			'false in production and the output is compressed. The same package also does ' +
			'source maps, <code>@media</code>, <code>@keyframes</code>, and critical-CSS ' +
			'pruning — the capstone uses the compressed form.</div>',
		],
		task: 'Style the button with the accent variable: a "1px solid accent" border, and a hover color of lighten(accent, 20%).',
		starter: 'package main\n\nimport (\n\t"fmt"\n\n\tstyl "github.com/rohanthewiz/go-styl"\n)\n\nfunc main() {\n\t// Stylus uses hard tabs or consistent spaces for nesting — this string\n\t// uses tabs, same as the editor. `&` splices the parent selector, so\n\t// `&:hover` under `button` means `button:hover`.\n\tsheet := `accent = #0af\n\nbutton\n\tcolor accent\n`\n\n\tcss, err := styl.Compile(sheet, styl.Options{Pretty: true})\n\tif err != nil {\n\t\tfmt.Println("compile error:", err)\n\t\treturn\n\t}\n\tfmt.Println(css)\n}\n',
		check: function (stdout, flat) {
			return flat.indexOf('border: 1px solid #0af;') !== -1 &&
				flat.indexOf('button:hover {') !== -1 &&
				flat.indexOf('color: #3bf;') !== -1;
		},
		solution: 'package main\n\nimport (\n\t"fmt"\n\n\tstyl "github.com/rohanthewiz/go-styl"\n)\n\nfunc main() {\n\t// The variable is defined once and used three times — change #0af and\n\t// the border and the computed hover shade follow. lighten() runs at\n\t// compile time: the browser only ever sees final hex values.\n\tsheet := `accent = #0af\n\nbutton\n\tcolor accent\n\tborder 1px solid accent\n\t&:hover\n\t\tcolor lighten(accent, 20%)\n`\n\n\tcss, err := styl.Compile(sheet, styl.Options{Pretty: true})\n\tif err != nil {\n\t\tfmt.Println("compile error:", err)\n\t\treturn\n\t}\n\tfmt.Println(css)\n}\n',
	});
})();
