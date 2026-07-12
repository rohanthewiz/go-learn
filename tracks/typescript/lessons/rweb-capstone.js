/* rweb-capstone — the full integration: rweb + element + go-styl + tsgo. */
(function () {
	'use strict';

	GoLearnTS.lesson({
		id: 'rweb-capstone',
		title: 'Ship it with rweb',
		nav: 'Ship it: rweb',
		category: 'Ship It',
		prose: [
			'<h2>Ship it with rweb</h2>' +
			'<p>Time to assemble the whole stack. The build is two commands — TypeScript ' +
			'first, then Go, which embeds what tsgo just emitted:</p>',
			{ lang: 'sh', code: 'npx tsgo -p tsconfig.json   # src/app.ts  → dist/app.js\ngo build -o app .           # embeds app.styl + dist/app.js\n./app                       # one binary, listening on :8000' },
			'<p>And this is the production <code>main.go</code>, in full. WebAssembly has ' +
			'no sockets, so this part is read-along — but every function it calls around ' +
			'the socket is exactly what you have already run in this track:</p>',
			{ code: 'package main\n\nimport (\n\t_ "embed"\n\t"log"\n\n\t"github.com/rohanthewiz/element"\n\tstyl "github.com/rohanthewiz/go-styl"\n\t"github.com/rohanthewiz/rweb"\n\t"github.com/rohanthewiz/serr"\n)\n\n// Both front-end artifacts ride inside the binary: the stylesheet as\n// source (compiled at boot), the JS as tsgo\'s finished output.\n//\n//go:embed assets/app.styl\nvar appStyl string\n\n//go:embed dist/app.js\nvar appJS string\n\n// appCSS is compiled once in main — a broken sheet stops the deploy at\n// boot instead of surfacing on the first request.\nvar appCSS string\n\nfunc main() {\n\tcss, err := styl.Compile(appStyl, styl.Options{}) // compressed\n\tif err != nil {\n\t\tlog.Fatal(serr.Wrap(err, "app.styl failed to compile"))\n\t}\n\tappCSS = css\n\n\ts := rweb.NewServer(rweb.ServerOptions{\n\t\tAddress: ":8000",\n\t\tVerbose: true,\n\t})\n\ts.Use(rweb.RequestInfo) // request-stats middleware\n\n\ts.Get("/", rootHandler)\n\n\tlog.Fatal(s.Run())\n}\n\nfunc rootHandler(c rweb.Context) error {\n\tfeatures := []string{"element pages", "go-styl styles", "tsgo build"}\n\tif err := c.WriteHTML(renderPage(appCSS, appJS, features)); err != nil {\n\t\treturn serr.Wrap(err, "writing home page")\n\t}\n\treturn nil\n}' },
			'<p>Everything meets in <code>renderPage</code>: CSS into ' +
			'<code>&lt;style&gt;</code>, the feature list through ' +
			'<code>ForEach</code>, the JS into <code>&lt;script&gt;</code> at the bottom ' +
			'of the body. That function is pure — string in, string out — which is why it ' +
			'runs here without a server, and why it is trivially testable in Go.</p>' +
			'<div class="tip">The handler returns <code>serr.Wrap(err, …)</code> rather ' +
			'than a bare error: serr records <em>where</em> it was wrapped, so the log line ' +
			'carries file:line without a stack-trace hunt. rweb logs it once at the top.</div>',
		],
		task: 'Finish renderPage: inline the compiled CSS, render one <li> per feature, and embed the JS last in the body.',
		starter: 'package main\n\nimport (\n\t"fmt"\n\n\t"github.com/rohanthewiz/element"\n\tstyl "github.com/rohanthewiz/go-styl"\n)\n\n// What //go:embed provides in the real app (the sandbox has no files):\nconst appStyl = `accent = #06b6d4\n\n.hero\n\tpadding 48px 24px\n\tbackground #0b1020\n\th1\n\t\tcolor accent\n\tli\n\t\tcolor lighten(accent, 30%)\n`\n\nconst appJS = `"use strict";\ndocument.querySelectorAll(\'.hero li\').forEach((li) => {\n    li.addEventListener(\'click\', () => li.classList.toggle(\'done\'));\n});`\n\n// renderPage is the whole front end: pure function, page out. The server\n// hands it the boot-compiled CSS; here main compiles it the same way.\nfunc renderPage(css, js string, features []string) string {\n\tb := element.NewBuilder()\n\tb.Html().R(\n\t\tb.Head().R(\n\t\t\tb.Title().T("one binary"),\n\t\t\t// 1) inline the compiled CSS\n\t\t),\n\t\tb.Body().R(\n\t\t\tb.DivClass("hero").R(\n\t\t\t\tb.H1().T("Go × TypeScript 7"),\n\t\t\t\tb.Ul().R(\n\t\t\t\t\t// 2) one <li> per feature (element.ForEach)\n\t\t\t\t),\n\t\t\t),\n\t\t\t// 3) embed the JS, last child of body\n\t\t),\n\t)\n\treturn b.String()\n}\n\nfunc main() {\n\tcss, err := styl.Compile(appStyl, styl.Options{}) // compressed, like production\n\tif err != nil {\n\t\tfmt.Println("compile error:", err)\n\t\treturn\n\t}\n\n\tfeatures := []string{"element pages", "go-styl styles", "tsgo build"}\n\tfmt.Println(renderPage(css, appJS, features))\n}\n',
		check: function (stdout, flat) {
			return flat.indexOf('<style>.hero{padding:48px 24px;background:#0b1020}') !== -1 &&
				flat.indexOf('<li>element pages</li>') !== -1 &&
				flat.indexOf('<li>go-styl styles</li>') !== -1 &&
				flat.indexOf('<li>tsgo build</li>') !== -1 &&
				flat.indexOf('classList.toggle') !== -1 &&
				flat.indexOf('<script>') !== -1;
		},
		solution: 'package main\n\nimport (\n\t"fmt"\n\n\t"github.com/rohanthewiz/element"\n\tstyl "github.com/rohanthewiz/go-styl"\n)\n\nconst appStyl = `accent = #06b6d4\n\n.hero\n\tpadding 48px 24px\n\tbackground #0b1020\n\th1\n\t\tcolor accent\n\tli\n\t\tcolor lighten(accent, 30%)\n`\n\nconst appJS = `"use strict";\ndocument.querySelectorAll(\'.hero li\').forEach((li) => {\n    li.addEventListener(\'click\', () => li.classList.toggle(\'done\'));\n});`\n\n// renderPage stays pure — no server types anywhere in the signature — so\n// the same function serves rweb in production and plain stdout here.\nfunc renderPage(css, js string, features []string) string {\n\tb := element.NewBuilder()\n\tb.Html().R(\n\t\tb.Head().R(\n\t\t\tb.Title().T("one binary"),\n\t\t\tb.Style().T(css),\n\t\t),\n\t\tb.Body().R(\n\t\t\tb.DivClass("hero").R(\n\t\t\t\tb.H1().T("Go × TypeScript 7"),\n\t\t\t\tb.Ul().R(\n\t\t\t\t\telement.ForEach(features, func(f string) {\n\t\t\t\t\t\tb.Li().T(f)\n\t\t\t\t\t}),\n\t\t\t\t),\n\t\t\t),\n\t\t\t// Script last: the elements it queries exist by the time it runs.\n\t\t\tb.Script().T(js),\n\t\t),\n\t)\n\treturn b.String()\n}\n\nfunc main() {\n\tcss, err := styl.Compile(appStyl, styl.Options{}) // compressed, like production\n\tif err != nil {\n\t\tfmt.Println("compile error:", err)\n\t\treturn\n\t}\n\n\tfeatures := []string{"element pages", "go-styl styles", "tsgo build"}\n\tfmt.Println(renderPage(css, appJS, features))\n}\n',
	});
})();
