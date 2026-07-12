/* embed-css — compile the sheet at startup and inline it into the page. */
(function () {
	'use strict';

	GoLearnTS.lesson({
		id: 'embed-css',
		title: 'Embed the CSS',
		nav: 'Embed the CSS',
		category: 'CSS in Go',
		prose: [
			'<h2>Embed the CSS</h2>' +
			'<p>Now connect the two halves: go-styl produces a CSS string, and element ' +
			'will happily write it into a <code>&lt;style&gt;</code> tag — ' +
			'<code>b.Style().T(css)</code>. No <code>.css</code> file ever exists on disk; ' +
			'the page arrives already styled in one response.</p>' +
			'<p>In the real app the sheet is a file embedded into the binary and compiled ' +
			'<em>once at startup</em> — a compile takes microseconds, but there is no ' +
			'reason to repeat it per request:</p>',
			{ code: '//go:embed assets/app.styl\nvar appStyl string\n\n// compiled once in main(); a bad sheet fails fast at boot,\n// not on the first unlucky request\nvar appCSS string\n\nfunc main() {\n\tcss, err := styl.Compile(appStyl, styl.Options{})\n\tif err != nil {\n\t\tlog.Fatal(serr.Wrap(err, "app.styl failed to compile"))\n\t}\n\tappCSS = css\n\t// … start rweb\n}' },
			'<div class="tip">Two alternatives ship with the libraries, both worth knowing: ' +
			'rweb has a stylus middleware (<code>rweb/middleware/stylus</code>) that serves ' +
			'compiled CSS from <code>.styl</code> sources with ETags — better when several ' +
			'pages share one big sheet — and go-styl’s <code>styl.Prune</code> compiles ' +
			'only the rules a rendered page actually uses (critical CSS, no headless ' +
			'browser). Inlining wins for a small app: one round trip, zero cache logic.</div>' +
			'<p>Here, do both steps in one program: compile the toolbar sheet, then build ' +
			'a page that inlines it and renders the toolbar markup it styles.</p>',
		],
		task: 'Compile the sheet, inline the result with b.Style().T(css) in the <head>, and give the div the "toolbar" class (b.DivClass).',
		starter: 'package main\n\nimport (\n\t"fmt"\n\n\t"github.com/rohanthewiz/element"\n\tstyl "github.com/rohanthewiz/go-styl"\n)\n\nfunc main() {\n\tsheet := `accent = #0af\npad = 16px\n\n.toolbar\n\tpadding (pad / 2) pad\n\tbackground #10141a\n\tbutton\n\t\tcolor accent\n\t\t&:hover\n\t\t\tcolor lighten(accent, 25%)\n`\n\n\t// 1) compile the sheet here with styl.Compile (Pretty: true)\n\tcss := "/* TODO */"\n\n\tb := element.NewBuilder()\n\tb.Html().R(\n\t\tb.Head().R(\n\t\t\t// 2) inline the compiled CSS here\n\t\t),\n\t\tb.Body().R(\n\t\t\t// 3) this div should carry class "toolbar" so the sheet hits it\n\t\t\tb.Div().R(\n\t\t\t\tb.Button().T("Run"),\n\t\t\t\tb.Button().T("Share"),\n\t\t\t),\n\t\t),\n\t)\n\n\tfmt.Println(b.String())\n\t_ = sheet // keep the starter compiling until you use it\n\t_ = css\n}\n',
		check: function (stdout, flat) {
			return flat.indexOf('<style>') !== -1 &&
				flat.indexOf('.toolbar {') !== -1 &&
				flat.indexOf('padding: 8px 16px;') !== -1 &&
				flat.indexOf('color: #40bfff;') !== -1 &&
				flat.indexOf('<div class="toolbar">') !== -1;
		},
		solution: 'package main\n\nimport (\n\t"fmt"\n\n\t"github.com/rohanthewiz/element"\n\tstyl "github.com/rohanthewiz/go-styl"\n)\n\nfunc main() {\n\tsheet := `accent = #0af\npad = 16px\n\n.toolbar\n\tpadding (pad / 2) pad\n\tbackground #10141a\n\tbutton\n\t\tcolor accent\n\t\t&:hover\n\t\t\tcolor lighten(accent, 25%)\n`\n\n\t// Compile first, fail fast: if the sheet is broken there is no point\n\t// building a page around it. (pad / 2) computes to 8px at compile time.\n\tcss, err := styl.Compile(sheet, styl.Options{Pretty: true})\n\tif err != nil {\n\t\tfmt.Println("compile error:", err)\n\t\treturn\n\t}\n\n\tb := element.NewBuilder()\n\tb.Html().R(\n\t\tb.Head().R(\n\t\t\t// .T writes the CSS verbatim inside <style> — element does not\n\t\t\t// HTML-escape here, which is exactly right for a stylesheet.\n\t\t\tb.Style().T(css),\n\t\t),\n\t\tb.Body().R(\n\t\t\t// DivClass is shorthand for b.Div("class", "toolbar").\n\t\t\tb.DivClass("toolbar").R(\n\t\t\t\tb.Button().T("Run"),\n\t\t\t\tb.Button().T("Share"),\n\t\t\t),\n\t\t),\n\t)\n\n\tfmt.Println(b.String())\n}\n',
	});
})();
