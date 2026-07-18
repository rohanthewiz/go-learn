/* Semantic Layout — the div-soup problem and the landmark elements that fix
 * it: header, nav, main (exactly one), section vs article, aside, footer —
 * and the machines that actually consume them (screen readers, reader modes,
 * crawlers). The exercise converts a valid div-soup page into landmarks and
 * wraps the post in an article with its own h2; the check pins the bare
 * landmark lines plus the main > article > h2 nesting (unreachable while the
 * regions are still divs) and pins the ABSENCE of the starter's class-named
 * div shapes so a learner cannot pass by merely adding tags alongside them.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'semantic-layout',
		title: 'Semantic Layout',
		nav: 'semantic layout',
		category: 'Structure & Semantics',

		prose: [
			'<h2>Div soup</h2>' +
			'<p>A <code>&lt;div&gt;</code> is a box with no meaning — and for ' +
			'years it was the whole layout toolkit, so pages were built like ' +
			'this:</p>',
			{ lang: 'html', code: '<div class="header">...</div>\n<div class="nav">...</div>\n<div class="main">...</div>\n<div class="footer">...</div>' },
			'<p>Look closely at where the meaning lives: in the <em>class ' +
			'names</em>, and a class name is just a string a human chose. You ' +
			'can read <code>class="nav"</code> and know it is navigation; a ' +
			'screen reader, a search crawler, or a browser\'s reader mode ' +
			'cannot — to every machine, all four boxes are identical anonymous ' +
			'<code>&lt;div&gt;</code>s. One author writes <code>nav</code>, ' +
			'the next writes <code>menu</code>, the next ' +
			'<code>sidebar-links</code>. Meaning that lives only in a naming ' +
			'convention is meaning machines cannot use.</p>',

			'<h2>The landmark elements</h2>' +
			'<p>HTML5 promoted the most common region names into real ' +
			'elements. Each renders exactly like a <code>&lt;div&gt;</code> — ' +
			'the win is not visual, it is that the <em>tag itself</em> now ' +
			'carries the meaning:</p>' +
			'<ul>' +
			'<li><code>&lt;header&gt;</code> — introductory content: site ' +
			'title, logo, tagline. (Not <code>&lt;head&gt;</code>, which holds ' +
			'metadata and never renders.)</li>' +
			'<li><code>&lt;nav&gt;</code> — a block of navigation links.</li>' +
			'<li><code>&lt;main&gt;</code> — the unique content of ' +
			'<em>this</em> page. <strong>Exactly one per page</strong>: it ' +
			'answers "skip the boilerplate — where does the real content ' +
			'start?", and that question has one answer.</li>' +
			'<li><code>&lt;aside&gt;</code> — tangential content: a sidebar, ' +
			'related links, a pull quote. The page still works without it.</li>' +
			'<li><code>&lt;footer&gt;</code> — copyright, contact, small ' +
			'print.</li>' +
			'</ul>',
			'<svg class="dg" viewBox="0 0 520 216" width="520" height="216" role="img" aria-label="page regions: header strip, nav strip, main and aside columns, footer strip">' +
			'<rect x="14" y="10" width="492" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
			'<text x="26" y="31">&lt;header&gt;</text>' +
			'<text x="494" y="31" text-anchor="end" class="lbl">site title, logo</text>' +
			'<rect x="14" y="50" width="492" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
			'<text x="26" y="67">&lt;nav&gt;</text>' +
			'<text x="494" y="67" text-anchor="end" class="lbl">links</text>' +
			'<rect x="14" y="82" width="352" height="88" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
			'<text x="26" y="101">&lt;main&gt;</text>' +
			'<text x="356" y="101" text-anchor="end" class="lbl">exactly one</text>' +
			'<rect x="28" y="110" width="324" height="50" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="5 3"/>' +
			'<text x="40" y="129">&lt;article&gt;</text>' +
			'<text x="40" y="149" class="lbl">self-contained: makes sense on its own</text>' +
			'<rect x="374" y="82" width="132" height="88" rx="4" fill="none" stroke="var(--edge)"/>' +
			'<text x="386" y="101">&lt;aside&gt;</text>' +
			'<text x="386" y="121" class="lbl">tangential:</text>' +
			'<text x="386" y="137" class="lbl">related links,</text>' +
			'<text x="386" y="153" class="lbl">sidebar</text>' +
			'<rect x="14" y="176" width="492" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
			'<text x="26" y="193">&lt;footer&gt;</text>' +
			'<text x="494" y="193" text-anchor="end" class="lbl">copyright, small print</text>' +
			'</svg>',

			'<h2>Section vs article</h2>' +
			'<p>Two grouping elements trip people up, and the test for each is ' +
			'worth memorizing.</p>' +
			'<p><code>&lt;article&gt;</code> is a <em>self-contained</em> ' +
			'composition — the test is <strong>syndication</strong>: could you ' +
			'lift this chunk out and drop it into an RSS feed, an email ' +
			'digest, another site, and would it still make sense alone? A blog ' +
			'post, a news story, a product card, even a single comment: all ' +
			'articles. An article carries its own heading inside it.</p>' +
			'<p><code>&lt;section&gt;</code> is a <em>thematic grouping</em> ' +
			'within something larger — chapters of a page, tabs of a panel. ' +
			'The rule of thumb: <strong>a section should have a heading</strong> ' +
			'naming its theme. If you cannot name a theme, you do not have a ' +
			'section — you have a styling hook, and that is what ' +
			'<code>&lt;div&gt;</code> is still for. The div did not become ' +
			'wrong; it went back to its real job: a meaningless box for CSS to ' +
			'grab when no semantic element fits.</p>',
			{ lang: 'html', code: '<article>            <!-- one blog post: lift it out, it still works -->\n  <h2>Post title</h2>\n  <p>Post body...</p>\n</article>\n\n<section>            <!-- one themed slice of THIS page -->\n  <h2>Latest releases</h2>\n  ...\n</section>' },

			'<h2>Who actually reads these tags</h2>' +
			'<p>Landmarks are not documentation — they are an interface, and ' +
			'real software sits on the other side of it:</p>' +
			'<ul>' +
			'<li><strong>Screen readers</strong> expose a landmark menu: one ' +
			'keystroke lists the page\'s regions and jumps straight to ' +
			'<code>&lt;main&gt;</code> or <code>&lt;nav&gt;</code>. On a ' +
			'div-soup page that menu is empty, and the user must arrow through ' +
			'every header link on every single page.</li>' +
			'<li><strong>Reader modes</strong> and read-later apps look for ' +
			'<code>&lt;main&gt;</code> and <code>&lt;article&gt;</code> to ' +
			'decide what to keep, and strip the rest.</li>' +
			'<li><strong>Search crawlers</strong> weight text inside ' +
			'<code>&lt;main&gt;</code>/<code>&lt;article&gt;</code> over ' +
			'boilerplate in <code>&lt;nav&gt;</code> and ' +
			'<code>&lt;footer&gt;</code> — the tags tell them which text ' +
			'<em>is</em> the page.</li>' +
			'</ul>',

			'<p>Elsewhere in go-learn, the <em>TypeScript + Go Web</em> track ' +
			'generates exactly this markup from Go with the element library — ' +
			'each landmark tag becomes a builder method, so recognize the ' +
			'shape:</p>',
			{ lang: 'go', code: 'b := element.NewBuilder()\nb.Header().R(b.H1().T("The Daily Byte"))\nb.Nav().R(b.A("href", "#posts").T("Posts"))\nb.Main().R(\n\tb.Article().R(\n\t\tb.H2().T("Why semantics matter"),\n\t\tb.P().T("Semantic tags name the page regions machines care about."),\n\t),\n)\nb.Footer().R(b.P().T("© 2026 The Daily Byte"))' },

			'<h3>Your job</h3>' +
			'<p>The starter is div soup: four class-named ' +
			'<code>&lt;div&gt;</code>s that render fine and mean nothing. ' +
			'Replace each with its landmark element — ' +
			'<code>&lt;header&gt;</code>, <code>&lt;nav&gt;</code>, ' +
			'<code>&lt;main&gt;</code>, <code>&lt;footer&gt;</code> — dropping ' +
			'the now-redundant <code>class</code> attributes. Then, inside ' +
			'<code>&lt;main&gt;</code>, wrap the post in an ' +
			'<code>&lt;article&gt;</code> and give it its own ' +
			'<code>&lt;h2&gt;</code> title above the paragraph. Watch the ' +
			'structure outline: the meaning moves out of attribute values and ' +
			'into the tree itself.</p>' +
			'<div class="tip">Rename opening and closing tag together, top to ' +
			'bottom — the validator requires tags to close in reverse order of ' +
			'opening, so a half-renamed pair like ' +
			'<code>&lt;header&gt;...&lt;/div&gt;</code> is rejected as a ' +
			'mismatched closing tag, and the red pane points at the line.</div>',
		],

		task: 'Replace each class-named div with its landmark element, and wrap the post in an article with its own h2.',

		starter: [
			'<!-- TODO 1: swap each class-named div for its real landmark element. -->',
			'<div class="header">',
			'  <h1>The Daily Byte</h1>',
			'</div>',
			'<div class="nav">',
			'  <a href="#posts">Posts</a>',
			'  <a href="#about">About</a>',
			'</div>',
			'<div class="main">',
			'  <!-- TODO 2: wrap the post in an <article> with its own <h2> title. -->',
			'  <p>Semantic tags name the page regions machines care about.</p>',
			'</div>',
			'<div class="footer">',
			'  <p>&copy; 2026 The Daily Byte</p>',
			'</div>',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('header\n') &&
				stdout.includes('nav\n') &&
				stdout.includes('main\n  article\n    h2\n') &&
				stdout.includes('footer\n') &&
				flat.indexOf('div class="header"') === -1 &&
				flat.indexOf('div class="main"') === -1;
		},

		solution: [
			'<header>',
			'  <h1>The Daily Byte</h1>',
			'</header>',
			'<nav>',
			'  <a href="#posts">Posts</a>',
			'  <a href="#about">About</a>',
			'</nav>',
			'<!-- article: self-contained and syndicate-able, with its own heading -->',
			'<main>',
			'  <article>',
			'    <h2>Why semantics matter</h2>',
			'    <p>Semantic tags name the page regions machines care about.</p>',
			'  </article>',
			'</main>',
			'<footer>',
			'  <p>&copy; 2026 The Daily Byte</p>',
			'</footer>',
		].join('\n'),
	});
})();
