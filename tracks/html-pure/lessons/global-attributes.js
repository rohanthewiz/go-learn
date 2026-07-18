/* Global Attributes — id (document-unique, enforced here), class as a
 * space-separated list, title tooltips, lang switches, boolean hidden, and
 * author-defined data-*. The exercise decorates a plain card list with every
 * hook; the check pins class="card featured", the lang="fr" blockquote with
 * its French text nested under it, the adjacent data-* pair, a line ending
 * in bare hidden, and the ABSENCE of the starter's un-hidden debug shape —
 * the starter carries no class/lang/data/hidden anywhere, so every pin is
 * only reachable by adding the attributes.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'global-attributes',
		title: 'Global Attributes',
		nav: 'global attributes',
		category: 'Attributes & Metadata',

		prose: [
			'<h2>Attributes every element accepts</h2>' +
			'<p>Most attributes belong to one element — <code>href</code> to ' +
			'links, <code>src</code> to images. But a small set of ' +
			'<em>global attributes</em> is legal on <em>every</em> element, and ' +
			'they are the hooks the rest of the platform hangs on: CSS selects ' +
			'by them, JavaScript reads them, assistive technology interprets ' +
			'them. Master this handful and you have the wiring layer of HTML.</p>',
			'<h2>id — one name, once per document</h2>' +
			'<p>An <code>id</code> must be unique in the <em>document</em>, not ' +
			'just among siblings. Browsers shrug at duplicates (and ' +
			'<code>getElementById</code> silently returns the first), but the ' +
			'validator here refuses them — duplicate ids are a bug you want ' +
			'caught loudly. The id is the anchor everything else points at: ' +
			'fragment links (<code>href="#pricing"</code> scrolls to it) and ' +
			'<code>label for="..."</code> both resolve by id:</p>',
			{ lang: 'html', code: '<section id="pricing">\n  <h2>Pricing</h2>\n</section>\n<a href="#pricing">Jump to pricing</a>' },
			'<h2>class — a space-separated LIST</h2>' +
			'<p>Where an id names one element, <code>class</code> tags any ' +
			'number of them for styling and selection — and its value is a ' +
			'<em>list</em>, split on spaces. <code>class="card featured"</code> ' +
			'is not one class with a space in it; it is <em>two</em> classes, ' +
			'and the element matches both the <code>.card</code> and ' +
			'<code>.featured</code> selectors. Composing small single-purpose ' +
			'classes this way is the backbone of every CSS methodology.</p>',
			'<h2>title — the hover tooltip</h2>' +
			'<p><code>title</code> puts advisory text in a tooltip when the ' +
			'pointer rests on the element — the starter already carries one on ' +
			'the Widget heading, so hover it in the preview. Treat it as a ' +
			'bonus for mouse users only: keyboard and touch users never see it, ' +
			'and many screen readers skip it, so it is <em>not</em> a ' +
			'substitute for accessible text like <code>alt</code> or a real ' +
			'label.</p>',
			'<h2>lang — pronunciation switches mid-page</h2>' +
			'<p>You have seen <code>lang</code> on <code>&lt;html&gt;</code>, ' +
			'but it is global: any element can override the page language for ' +
			'its subtree. A French quotation inside an English page belongs in ' +
			'<code>lang="fr"</code> — screen readers switch pronunciation ' +
			'rules at the boundary instead of mangling the French with English ' +
			'phonetics, and spellcheckers and hyphenation follow suit:</p>',
			{ lang: 'html', code: '<p>Descartes wrote, in French:</p>\n<blockquote lang="fr">« Je pense, donc je suis. »</blockquote>' },
			'<h2>hidden — gone from rendering AND the tree</h2>' +
			'<p><code>hidden</code> is a boolean attribute: its presence is the ' +
			'whole message, no value needed. A hidden element is removed from ' +
			'rendering <em>and</em> from the accessibility tree — screen ' +
			'readers do not announce it, tab order skips it. Compare that with ' +
			'CSS tricks like <code>opacity: 0</code>, which merely make an ' +
			'element invisible while it keeps its space and stays announced. ' +
			'After you hide the debug note in the exercise, check the preview: ' +
			'the element still exists in the outline, but the page renders as ' +
			'if it were never written.</p>',
			'<h2>data-* — your own attributes, legally</h2>' +
			'<p>Inventing attributes like <code>sku="A-100"</code> would be ' +
			'invalid HTML. The <code>data-</code> prefix makes it legal: any ' +
			'name after <code>data-</code> is reserved for <em>you</em>, the ' +
			'author. This is the HTML-side half of a contract — the markup ' +
			'records machine-readable facts, and JavaScript reads them later ' +
			'through <code>dataset</code>:</p>',
			{ lang: 'html', code: '<div class="card" data-sku="A-100" data-stock="12">Widget</div>' },
			{ lang: 'js', code: "const card = document.querySelector('.card');\ncard.dataset.sku    // \"A-100\"\ncard.dataset.stock  // \"12\" — always a string; convert if you need a number" },
			'<h3>Your job</h3>' +
			'<p>The starter is a plain product list with none of these hooks. ' +
			'Wire it up: give the first card ' +
			'<code>class="card featured"</code> followed by ' +
			'<code>data-sku="A-100" data-stock="12"</code>, give the second ' +
			'card <code>class="card"</code>, mark the quotation ' +
			'<code>lang="fr"</code>, and silence the debug note with ' +
			'<code>hidden</code>. Run it and compare: the outline shows every ' +
			'attribute, while the preview no longer shows the debug line.</p>' +
			'<div class="tip">Boolean attributes like <code>hidden</code> and ' +
			'<code>required</code> take no value — presence is true, absence ' +
			'is false. The structure outline prints them bare, exactly as you ' +
			'should write them.</div>',
		],

		task: 'Add class, data-*, lang, and hidden hooks to the plain card list.',

		starter: [
			'<h1>Products</h1>',
			'',
			'<!-- TODO 1: mark the first card class="card featured" and the second class="card" -->',
			'<!-- TODO 2: on the first card, after class, add data-sku="A-100" data-stock="12" -->',
			'<div>',
			'  <h2 title="Best seller this month">Widget</h2>',
			'  <p>A dependable widget.</p>',
			'</div>',
			'<div>',
			'  <h2>Gadget</h2>',
			'  <p>A curious gadget.</p>',
			'</div>',
			'',
			'<!-- TODO 3: this quotation is French — say so with lang="fr" on the blockquote -->',
			'<blockquote>« Liberté, égalité, fraternité »</blockquote>',
			'',
			'<!-- TODO 4: hide this build note with the boolean hidden attribute -->',
			'<p>debug: build 47</p>',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// The starter has no class/lang/data/hidden anywhere, so each
			// presence pin is reachable only by adding the attribute. The
			// blockquote pin spans two outline lines (element + nested text)
			// so the pre-existing French text alone cannot satisfy it, and
			// the final pin asserts the starter's un-hidden debug <p> shape
			// is gone — 'p' directly followed by the text child.
			return stdout.includes('class="card featured"') &&
				stdout.includes('div class="card"\n') &&
				stdout.includes('data-sku="A-100" data-stock="12"') &&
				stdout.includes('blockquote lang="fr"\n  "« Liberté, égalité, fraternité »"') &&
				stdout.includes(' hidden\n') &&
				!stdout.includes('p\n  "debug');
		},

		solution: [
			'<h1>Products</h1>',
			'',
			'<div class="card featured" data-sku="A-100" data-stock="12">',
			'  <h2 title="Best seller this month">Widget</h2>',
			'  <p>A dependable widget.</p>',
			'</div>',
			'<div class="card">',
			'  <h2>Gadget</h2>',
			'  <p>A curious gadget.</p>',
			'</div>',
			'',
			'<blockquote lang="fr">« Liberté, égalité, fraternité »</blockquote>',
			'',
			'<p hidden>debug: build 47</p>',
			'',
		].join('\n'),
	});
})();
