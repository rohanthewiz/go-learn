/* Styling Hooks — the three homes CSS can live in (the style attribute,
 * the page-scoped <style> element, and the linked stylesheet) and why the
 * markup's real job is leaving meaningful class hooks. The exercise moves
 * a card's inline style attributes into one <style> element; the check
 * pins the style element's raw-text CSS body (a .card rule and a
 * .card h2 rule), the class="card" hook on the markup, and the total
 * absence of style= — unreachable while any inline style survives.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'inline-styles',
		title: 'Styling Hooks',
		nav: 'styling hooks',
		category: 'Advanced',

		prose: [
			'<h2>Three homes for CSS</h2>' +
			'<p>This track has kept presentation out of the markup on ' +
			'principle: HTML says what things <em>are</em>, CSS says what they ' +
			'look like. But the two languages have to meet somewhere, and HTML ' +
			'offers exactly three meeting points. The closest — and worst — is ' +
			'the <code>style</code> attribute, CSS written directly on one ' +
			'element:</p>',
			{ lang: 'html', code: '<h2 style="color: red">Field Notes</h2>\n<p style="color: red">Every element restates the whole design.</p>' },
			'<p>Inline styles carry the highest specificity of any author CSS ' +
			'— they beat id selectors, class selectors, everything short of ' +
			'<code>!important</code> — which sounds like power and works like ' +
			'a trap: no stylesheet can override them later. They cannot be ' +
			'shared (two red headings means writing red twice), cannot be ' +
			'reused across pages, and turn a redesign into a hunt through ' +
			'every tag in the project. They are the pattern to grow out of, ' +
			'kept only for rare cases like values computed at runtime.</p>',
			'<h2>The <code>&lt;style&gt;</code> element</h2>' +
			'<p>One step out is a <code>&lt;style&gt;</code> element, ' +
			'conventionally placed in the <code>&lt;head&gt;</code>: a ' +
			'stylesheet scoped to this one page. A rule written once applies ' +
			'to every element it selects — including elements added next ' +
			'month:</p>',
			{ lang: 'html', code: '<style>\n  .card { border: 1px solid #b6c8d8; padding: 12px; }\n  .card h2 { color: #2a6f4e; }\n</style>' },
			'<p>To the parser, the body of <code>&lt;style&gt;</code> is ' +
			'<em>raw text</em>: no tags, no entities — everything up to the ' +
			'closing <code>&lt;/style&gt;</code> is handed to the CSS engine ' +
			'untouched, so <code>&amp;</code> and <code>&lt;</code> are legal ' +
			'inside it. The structure outline reflects that: the entire ' +
			'stylesheet appears as a single quoted text child under the ' +
			'<code>style</code> node, not as parsed structure.</p>',
			'<h2>The linked stylesheet</h2>' +
			'<p>The production answer is the third home: a separate ' +
			'<code>.css</code> file that every page links from its head.</p>',
			{ lang: 'html', code: '<link rel="stylesheet" href="site.css">' },
			'<p>One file styles the whole site, the browser downloads and ' +
			'caches it once, and the design can change without touching a ' +
			'single page. (The sandbox here cannot load external files, so ' +
			'this lesson practices the <code>&lt;style&gt;</code> element — ' +
			'the rules inside it are exactly what <code>site.css</code> would ' +
			'hold.)</p>',
			'<svg class="dg" viewBox="0 0 560 150" width="560" height="150" role="img" aria-label="the style attribute reaches one element; the style element reaches one page; a linked stylesheet reaches every page that links it">' +
			'<text x="15" y="22" class="lbl">how far each home for CSS reaches</text>' +
			'<rect x="15" y="40" width="160" height="46" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
			'<text x="95" y="68" text-anchor="middle">style="…" attribute</text>' +
			'<text x="95" y="106" text-anchor="middle" class="lbl">one element</text>' +
			'<rect x="190" y="40" width="160" height="46" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
			'<text x="270" y="68" text-anchor="middle">&lt;style&gt; element</text>' +
			'<text x="270" y="106" text-anchor="middle" class="lbl">one page</text>' +
			'<rect x="365" y="40" width="180" height="46" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
			'<text x="455" y="68" text-anchor="middle">link rel="stylesheet"</text>' +
			'<text x="455" y="106" text-anchor="middle" class="lbl">every page that links it</text>' +
			'<text x="15" y="140" class="lbl">specificity runs the other way: the narrower the home, the harder it is to override later</text>' +
			'</svg>',
			'<h2>Hooks: name the meaning, not the look</h2>' +
			'<p>Once the CSS moves out of the tags, the markup has one styling ' +
			'job left: leaving good <em>hooks</em> — class names a stylesheet ' +
			'can target. The craft is in the naming. <code>class="card"</code> ' +
			'and <code>class="featured"</code> describe what an element ' +
			'<em>is</em>; <code>class="red"</code> and <code>class="big"</code> ' +
			'describe what it currently <em>looks like</em>, and the moment ' +
			'the redesign turns red things green, ' +
			'<code>.red { color: green }</code> is the lie you are stuck ' +
			'maintaining. Meaning-named hooks survive every redesign, because ' +
			'the meaning is the part that does not change.</p>',
			'<p>In the go-learn stack even this division of labor is generated ' +
			'from Go: the <em>CSS via Stylus</em> track compiles stylesheets ' +
			'with go-styl, and the element library emits the class hooks those ' +
			'rules target — <code>b.DivClass("card")</code> renders ' +
			'<code>&lt;div class="card"&gt;</code>. Recognize the shape:</p>',
			{ lang: 'go', code: 'b := element.NewBuilder()\nb.DivClass("card").R( // the hook the .card rule targets\n\tb.H2().T("Field Notes"),\n\tb.P().T("Styled by a stylesheet, not a style attribute."),\n)\nhtml := b.String()' },
			'<p>The <em>TypeScript + Go Web</em> track builds whole pages this ' +
			'way — markup from element, CSS from Stylus, class hooks holding ' +
			'the two together.</p>',
			'<h3>Your job</h3>' +
			'<p>The starter card wears three <code>style</code> attributes. ' +
			'Add <code>class="card"</code> to the <code>div</code>, then move ' +
			'every declaration into one <code>&lt;style&gt;</code> element ' +
			'above the card: a <code>.card</code> rule for the box and text ' +
			'color, a <code>.card h2</code> rule for the heading. When you ' +
			'run it, watch both panes: the preview genuinely restyles, and ' +
			'the outline shows the whole stylesheet as one quoted string ' +
			'under <code>style</code>. No <code>style=</code> may remain.</p>' +
			'<div class="tip">If you catch yourself writing ' +
			'<code>class="red"</code>, name what the thing <em>is</em> ' +
			'instead. When the design changes, <code>.featured</code> still ' +
			'tells the truth; <code>.red</code> becomes a lie in every file ' +
			'that uses it.</div>',
		],

		task: 'Replace every style attribute with one style element holding .card and .card h2 rules, leaving class="card" as the hook.',

		starter: [
			'<!-- TODO 1: add class="card" to the div — a hook named for MEANING. -->',
			'<!-- TODO 2: move all three inline styles into ONE style element -->',
			'<!--         above the card: a .card rule and a .card h2 rule. -->',
			'<div style="border: 1px solid #b6c8d8; border-radius: 8px; padding: 12px">',
			'  <h2 style="color: red; margin-top: 0">Field Notes</h2>',
			'  <p style="color: red">Three style attributes, zero reuse — restyling means editing every tag.</p>',
			'</div>',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// The stylesheet must exist as the style element's raw-text child
			// (depth 1 under a top-level <style>), hold both rules, and target
			// a class hook on the markup — with no style= attribute anywhere.
			var css = /style\n  "([^"]*)"/.exec(stdout);
			return !!css && css[1].indexOf('.card {') !== -1 &&
				css[1].indexOf('.card h2 {') !== -1 &&
				flat.indexOf('class="card"') !== -1 &&
				flat.indexOf('style=') === -1;
		},

		solution: [
			'<style>',
			'  .card {',
			'    border: 1px solid #b6c8d8;',
			'    border-radius: 8px;',
			'    padding: 12px;',
			'    color: #37474f;',
			'  }',
			'  .card h2 {',
			'    color: #2a6f4e;',
			'    margin-top: 0;',
			'  }',
			'</style>',
			'',
			'<div class="card">',
			'  <h2>Field Notes</h2>',
			'  <p>One stylesheet, one hook — restyle the card by editing a single rule.</p>',
			'</div>',
			'',
		].join('\n'),
	});
})();
