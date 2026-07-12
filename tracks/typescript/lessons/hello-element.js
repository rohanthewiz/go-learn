/* hello-element — the pitch, the pipeline diagram, and a first element page. */
(function () {
	'use strict';

	// The whole track in one picture: three Go-native compilers feeding one
	// binary. Each later lesson zooms into one arrow.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="element, go-styl and tsgo feeding one Go binary served by rweb">' +
		'<g>' +
		'<rect x="14" y="16" width="150" height="34" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="89" y="38" text-anchor="middle">page.go · element</text>' +
		'<rect x="14" y="66" width="150" height="34" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="89" y="88" text-anchor="middle">app.styl · go-styl</text>' +
		'<rect x="14" y="116" width="150" height="34" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="89" y="138" text-anchor="middle">app.ts · tsgo (TS 7)</text>' +
		'</g>' +
		'<text x="222" y="38" class="lbl">HTML (at request time)</text>' +
		'<text x="222" y="88" class="lbl">CSS (embedded)</text>' +
		'<text x="222" y="138" class="lbl">JS (embedded)</text>' +
		'<path d="M 164 33 C 240 33 300 70 356 88" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowT1)"/>' +
		'<path d="M 164 83 L 356 96" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowT1)"/>' +
		'<path d="M 164 133 C 240 133 300 112 356 104" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowT1)"/>' +
		'<rect x="360" y="72" width="146" height="48" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="433" y="92" text-anchor="middle">one Go binary</text>' +
		'<text x="433" y="110" text-anchor="middle" class="lbl">rweb · :8000</text>' +
		'<path d="M 433 120 L 433 152" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowT1ok)"/>' +
		'<text x="433" y="172" text-anchor="middle" class="lbl">browser</text>' +
		'<defs>' +
		'<marker id="dgArrowT1" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowT1ok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	GoLearnTS.lesson({
		id: 'hello-element',
		title: 'One binary, whole front end',
		nav: 'One binary',
		category: 'One Binary',
		prose: [
			'<h2>One binary, whole front end</h2>' +
			'<p>This track builds a web app where the <em>entire</em> front end is produced ' +
			'by Go-native tools — no Node runtime in production, no asset server, no CDN:</p>' +
			DIAGRAM +
			'<ul>' +
			'<li><strong>element</strong> generates HTML from Go — a builder, not templates, ' +
			'so pages are type-checked Go code.</li>' +
			'<li><strong>go-styl</strong> compiles Stylus to CSS in pure Go — the stylesheet ' +
			'is embedded and compiled when the binary starts.</li>' +
			'<li><strong>TypeScript 7</strong> (<code>tsgo</code>, Microsoft’s Go-native ' +
			'compiler — roughly 10× faster than the old Node-based <code>tsc</code>) turns ' +
			'typed TS into plain JS at <em>build</em> time; the emitted JS is embedded too.</li>' +
			'<li><strong>rweb</strong> serves it all from one Go binary.</li>' +
			'</ul>' +
			'<p>Everything except the socket runs live in these lessons — the editor on the ' +
			'right is real Go, interpreted in your browser, importing the real ' +
			'<code>element</code> and <code>go-styl</code> packages.</p>' +
			'<h3>First page with element</h3>' +
			'<p>element’s builder writes HTML as nested Go calls: an element method like ' +
			'<code>b.Div()</code> opens a tag, <code>.R(…)</code> renders children inside ' +
			'it, and <code>.T(…)</code> writes text and closes the tag:</p>',
			{ code: 'b := element.NewBuilder()\nb.Html().R(\n\tb.Head().R(\n\t\tb.Title().T("my page"),\n\t),\n\tb.Body().R(\n\t\tb.H1().T("hello"),\n\t),\n)\nfmt.Println(b.String()) // <!DOCTYPE html><html>...' },
			'<p>Attributes are string pairs: <code>b.Div("id", "page", "class", "wrap")</code> ' +
			'→ <code>&lt;div id="page" class="wrap"&gt;</code>. <code>b.Html()</code> ' +
			'emits the doctype for you.</p>' +
			'<div class="tip">Why a builder instead of <code>html/template</code>? No parse-at-' +
			'runtime, no template syntax to learn, and the compiler catches a misspelled ' +
			'method where a template would silently render nothing.</div>',
		],
		task: 'Give the page a <title> of exactly "Go × TS" and change the heading to "Hello from element".',
		starter: 'package main\n\nimport (\n\t"fmt"\n\n\t"github.com/rohanthewiz/element"\n)\n\nfunc main() {\n\tb := element.NewBuilder()\n\n\tb.Html().R(\n\t\t// The head is empty — the task wants a <title> in here.\n\t\tb.Head().R(),\n\t\tb.Body().R(\n\t\t\tb.H1().T("Hello"),\n\t\t),\n\t)\n\n\t// b.String() returns everything written so far as one HTML document.\n\tfmt.Println(b.String())\n}\n',
		check: function (stdout, flat) {
			return flat.indexOf('<title>Go × TS</title>') !== -1 &&
				flat.indexOf('<h1>Hello from element</h1>') !== -1;
		},
		solution: 'package main\n\nimport (\n\t"fmt"\n\n\t"github.com/rohanthewiz/element"\n)\n\nfunc main() {\n\tb := element.NewBuilder()\n\n\tb.Html().R(\n\t\tb.Head().R(\n\t\t\t// Title lives in the head; .T() writes the text and closes the tag.\n\t\t\tb.Title().T("Go × TS"),\n\t\t),\n\t\tb.Body().R(\n\t\t\tb.H1().T("Hello from element"),\n\t\t),\n\t)\n\n\tfmt.Println(b.String())\n}\n',
	});
})();
