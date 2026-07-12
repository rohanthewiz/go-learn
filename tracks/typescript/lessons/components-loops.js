/* components-loops — attributes, ForEach, and the Component interface. */
(function () {
	'use strict';

	GoLearnTS.lesson({
		id: 'components-loops',
		title: 'Loops and components',
		nav: 'Loops & components',
		category: 'HTML in Go',
		prose: [
			'<h2>Loops and components</h2>' +
			'<p>Real pages are data-driven. element gives you two tools for that: ' +
			'<code>element.ForEach</code> for inline iteration, and the ' +
			'<code>Component</code> interface for anything worth naming.</p>' +
			'<h3>ForEach</h3>' +
			'<p><code>ForEach</code> is generic — it takes any slice and a function that ' +
			'writes elements for each item:</p>',
			{ code: 'b.Ul().R(\n\telement.ForEach(links, func(l Link) {\n\t\tb.Li().R(\n\t\t\tb.A("href", l.Href).T(l.Label),\n\t\t)\n\t}),\n)' },
			'<h3>Components</h3>' +
			'<p>A component is any type with a <code>Render(b *element.Builder) any</code> ' +
			'method. It owns one chunk of markup; ' +
			'<code>element.RenderComponents(b, comps…)</code> writes them in order. Because ' +
			'components are plain Go values, their inputs are typed fields — the compiler, ' +
			'not the browser, tells you when a page is wired wrong:</p>',
			{ code: 'type Footer struct{ Year int }\n\nfunc (f Footer) Render(b *element.Builder) (x any) {\n\tb.Footer().R(\n\t\tb.Small().F("© %d — served from one binary", f.Year),\n\t)\n\treturn\n}' },
			'<div class="tip"><code>b.F(format, args…)</code> is <code>fmt.Sprintf</code> ' +
			'that writes into the page — handy inside components. There is also ' +
			'<code>b.Wrap(func(){…})</code> to drop arbitrary Go statements mid-tree.</div>',
		],
		task: 'Render all three links as <li><a href=…>…</a></li> items, and add the Footer component (year 2026) after the nav.',
		starter: 'package main\n\nimport (\n\t"fmt"\n\n\t"github.com/rohanthewiz/element"\n)\n\n// Link is page data — components and loops render *from* typed values,\n// which is the whole point of building HTML in Go.\ntype Link struct {\n\tHref  string\n\tLabel string\n}\n\ntype Footer struct{ Year int }\n\nfunc (f Footer) Render(b *element.Builder) (x any) {\n\tb.Footer().R(\n\t\tb.Small().F("© %d — served from one binary", f.Year),\n\t)\n\treturn\n}\n\nfunc main() {\n\tlinks := []Link{\n\t\t{"/", "Home"},\n\t\t{"/ts", "TypeScript"},\n\t\t{"/styl", "Styles"},\n\t}\n\n\tb := element.NewBuilder()\n\tb.Body().R(\n\t\tb.Nav().R(\n\t\t\tb.Ul().R(\n\t\t\t\t// Only the first link is rendered — loop over all of them\n\t\t\t\t// with element.ForEach(links, func(l Link) { … }).\n\t\t\t\tb.Li().R(\n\t\t\t\t\tb.A("href", links[0].Href).T(links[0].Label),\n\t\t\t\t),\n\t\t\t),\n\t\t),\n\t\t// Render the Footer component here (element.RenderComponents).\n\t)\n\n\tfmt.Println(b.String())\n\t_ = Footer{} // keep the starter compiling until you use it\n}\n',
		check: function (stdout, flat) {
			return flat.indexOf('<a href="/ts">TypeScript</a>') !== -1 &&
				flat.indexOf('<a href="/styl">Styles</a>') !== -1 &&
				flat.indexOf('<footer>') !== -1 &&
				flat.indexOf('© 2026') !== -1;
		},
		solution: 'package main\n\nimport (\n\t"fmt"\n\n\t"github.com/rohanthewiz/element"\n)\n\ntype Link struct {\n\tHref  string\n\tLabel string\n}\n\ntype Footer struct{ Year int }\n\nfunc (f Footer) Render(b *element.Builder) (x any) {\n\tb.Footer().R(\n\t\tb.Small().F("© %d — served from one binary", f.Year),\n\t)\n\treturn\n}\n\nfunc main() {\n\tlinks := []Link{\n\t\t{"/", "Home"},\n\t\t{"/ts", "TypeScript"},\n\t\t{"/styl", "Styles"},\n\t}\n\n\tb := element.NewBuilder()\n\tb.Body().R(\n\t\tb.Nav().R(\n\t\t\tb.Ul().R(\n\t\t\t\t// ForEach is generic over the slice type — no casts, and the\n\t\t\t\t// closure gets a typed Link, so a bad field is a compile error.\n\t\t\t\telement.ForEach(links, func(l Link) {\n\t\t\t\t\tb.Li().R(\n\t\t\t\t\t\tb.A("href", l.Href).T(l.Label),\n\t\t\t\t\t)\n\t\t\t\t}),\n\t\t\t),\n\t\t),\n\t\t// Components render in argument order — the footer lands after the nav.\n\t\telement.RenderComponents(b, Footer{Year: 2026}),\n\t)\n\n\tfmt.Println(b.String())\n}\n',
	});
})();
