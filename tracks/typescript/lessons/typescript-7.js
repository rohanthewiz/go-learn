/* typescript-7 — standard TS, compiled by the Go-native tsgo, embedded as JS. */
(function () {
	'use strict';

	GoLearnTS.lesson({
		id: 'typescript-7',
		title: 'TypeScript 7: types in, JS out',
		nav: 'TypeScript 7',
		category: 'TypeScript',
		prose: [
			'<h2>TypeScript 7: types in, JS out</h2>' +
			'<p>TypeScript 7 is the compiler rewritten in <em>Go</em> (Microsoft’s ' +
			'typescript-go project) — same language, same checker semantics, roughly 10× ' +
			'faster builds. The preview ships the binary as <code>tsgo</code>; in the ' +
			'stable release it is simply what <code>tsc</code> runs:</p>',
			{ lang: 'sh', code: 'npm install -D @typescript/native-preview\nnpx tsgo -p tsconfig.json     # drop-in for tsc' },
			'<p>That pairing is the point of this track: with go-styl replacing the Sass/' +
			'PostCSS pile and tsgo replacing Node’s tsc, the only thing left in ' +
			'JavaScript-land is your page logic — and it is <em>typed</em>. Standard ' +
			'TypeScript, a counter widget:</p>',
			{ lang: 'ts', code: "// src/app.ts\ninterface CounterState {\n  count: number;\n}\n\nconst state: CounterState = { count: 0 };\n\nfunction render(el: HTMLElement, s: CounterState): void {\n  el.textContent = 'count: ' + s.count;\n}\n\n// querySelector is generic — the type argument types everything after it\nconst out = document.querySelector<HTMLElement>('#out');\nconst btn = document.querySelector<HTMLButtonElement>('#inc');\n\nif (out && btn) { // strict null checks force this guard — both may be null\n  render(out, state);\n  btn.addEventListener('click', () => {\n    state.count += 1;\n    render(out, state);\n  });\n}" },
			'<p>with the usual strict config:</p>',
			{ lang: 'json', code: '{\n  "compilerOptions": {\n    "target": "ES2020",\n    "lib": ["ES2020", "DOM"],\n    "strict": true,\n    "outDir": "dist"\n  },\n  "include": ["src"]\n}' },
			'<p><code>tsgo</code> checks the types and then <em>erases</em> them — ' +
			'<code>dist/app.js</code> is the same program with the annotations gone. That ' +
			'erasure is what makes embedding trivial: the artifact is plain JS text, and ' +
			'Go is happy to carry text.</p>' +
			'<p>The editor holds the Go side: the emitted JS as a string (in the real app, ' +
			'<code>//go:embed dist/app.js</code>), and the page that must host it. ' +
			'The script needs two things to find its elements: the ids it queries, and ' +
			'a <code>&lt;script&gt;</code> tag placed <em>after</em> the elements it ' +
			'touches — last child of <code>&lt;body&gt;</code> is the classic spot.</p>',
		],
		task: 'Give the button the id "inc" and embed the JS with b.Script().T(appJS) as the last child of <body>.',
		starter: 'package main\n\nimport (\n\t"fmt"\n\n\t"github.com/rohanthewiz/element"\n)\n\n// appJS is tsgo\'s output for src/app.ts — types checked, then erased.\n// In the real app this is `//go:embed dist/app.js` (go:embed needs the\n// real build; the wasm sandbox here has no filesystem, so it\'s a const).\nconst appJS = `"use strict";\nconst state = { count: 0 };\nfunction render(el, s) {\n    el.textContent = \'count: \' + s.count;\n}\nconst out = document.querySelector(\'#out\');\nconst btn = document.querySelector(\'#inc\');\nif (out && btn) {\n    render(out, state);\n    btn.addEventListener(\'click\', () => {\n        state.count += 1;\n        render(out, state);\n    });\n}`\n\nfunc main() {\n\tb := element.NewBuilder()\n\tb.Html().R(\n\t\tb.Head().R(\n\t\t\tb.Title().T("counter"),\n\t\t),\n\t\tb.Body().R(\n\t\t\t// The script queries #out and #inc — the button below has no id\n\t\t\t// yet, and the script itself is never embedded. Fix both.\n\t\t\tb.Span("id", "out").T("count: 0"),\n\t\t\tb.Button().T("+1"),\n\t\t),\n\t)\n\n\tfmt.Println(b.String())\n}\n',
		check: function (stdout, flat) {
			return flat.indexOf('<button id="inc">') !== -1 &&
				flat.indexOf('<script>') !== -1 &&
				flat.indexOf('addEventListener') !== -1 &&
				flat.indexOf('querySelector') !== -1;
		},
		solution: 'package main\n\nimport (\n\t"fmt"\n\n\t"github.com/rohanthewiz/element"\n)\n\n// appJS is tsgo\'s output for src/app.ts — types checked, then erased.\nconst appJS = `"use strict";\nconst state = { count: 0 };\nfunction render(el, s) {\n    el.textContent = \'count: \' + s.count;\n}\nconst out = document.querySelector(\'#out\');\nconst btn = document.querySelector(\'#inc\');\nif (out && btn) {\n    render(out, state);\n    btn.addEventListener(\'click\', () => {\n        state.count += 1;\n        render(out, state);\n    });\n}`\n\nfunc main() {\n\tb := element.NewBuilder()\n\tb.Html().R(\n\t\tb.Head().R(\n\t\t\tb.Title().T("counter"),\n\t\t),\n\t\tb.Body().R(\n\t\t\tb.Span("id", "out").T("count: 0"),\n\t\t\t// Attribute pairs: ("id", "inc") → <button id="inc">.\n\t\t\tb.Button("id", "inc").T("+1"),\n\t\t\t// Last child of body: by the time the script runs, #out and #inc\n\t\t\t// exist above it — no DOMContentLoaded dance needed. .T writes\n\t\t\t// the JS verbatim; element does not escape inside <script>.\n\t\t\tb.Script().T(appJS),\n\t\t),\n\t)\n\n\tfmt.Println(b.String())\n}\n',
	});
})();
