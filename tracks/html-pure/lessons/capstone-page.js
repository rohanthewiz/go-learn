/* Capstone: A Complete Page — assemble the whole track into one real
 * document. Short prose recaps each piece as a checklist; the exercise
 * grows a three-line fragment into a full page. The check is the track's
 * largest: doctype+lang at the very start, charset/viewport/title at
 * head depth, a .note stylesheet as style raw text, the landmark shapes
 * (header, nav, main>article), figure+figcaption, a wired label/input
 * pair, an explicit submit button, and the entity-decoded footer line —
 * each pin reachable only by building the region it names.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'capstone-page',
		title: 'Capstone: A Complete Page',
		nav: 'capstone page',
		category: 'Advanced',

		prose: [
			'<h2>Everything, on one page</h2>' +
			'<p>No new syntax today. The capstone is assembly: every piece ' +
			'this track taught, in one document, each earning its place. Work ' +
			'down the checklist and re-run after each region — the outline ' +
			'pane should grow a branch at a time, and the validator will point ' +
			'at the exact line the moment a tag goes unclosed.</p>' +
			'<ul>' +
			'<li><strong>Doctype and skeleton</strong> — ' +
			'<code>&lt;!doctype html&gt;</code> keeps the browser in ' +
			'standards mode, and <code>&lt;html lang="en"&gt;</code> tells ' +
			'screen readers and translators what language they are ' +
			'holding.</li>' +
			'<li><strong>Head metadata</strong> — <code>charset</code> before ' +
			'any text so nothing mis-decodes, the viewport meta so phones do ' +
			'not pretend to be desktops, and a <code>&lt;title&gt;</code> ' +
			'because the tab, the bookmark, and the search result all read ' +
			'it.</li>' +
			'<li><strong>One <code>&lt;style&gt;</code> element</strong> — ' +
			'page-scoped presentation targeting a class hook ' +
			'(<code>.note</code>), never a <code>style=</code> attribute.</li>' +
			'<li><strong>Landmarks</strong> — <code>header</code>, ' +
			'<code>nav</code>, <code>main</code>, <code>footer</code>: the ' +
			'skeleton assistive tech navigates by, and the h1-then-h2 outline ' +
			'inside it.</li>' +
			'<li><strong>A <code>figure</code></strong> — the image bound to ' +
			'its <code>figcaption</code>, with <code>alt</code> for when the ' +
			'pixels cannot be seen.</li>' +
			'<li><strong>A small form</strong> — the label wired by ' +
			'<code>for</code>/<code>id</code>, a <code>name</code> so the ' +
			'value has a key on submission, and an explicit ' +
			'<code>button type="submit"</code>.</li>' +
			'<li><strong>An entity-correct footer</strong> — ' +
			'<code>&amp;copy;</code>, because character discipline is the ' +
			'difference between a page that parses everywhere and one that ' +
			'mostly does.</li>' +
			'</ul>',
			'<p>One last look over the fence before you build. Elsewhere in ' +
			'go-learn, the <em>TypeScript + Go Web</em> track generates ' +
			'exactly this page shell from Go with the element library — every ' +
			'builder call below emits a tag you are about to write by ' +
			'hand:</p>',
			{ lang: 'go', code: 'b := element.NewBuilder()\nb.Html("lang", "en").R(\n\tb.Head().R(\n\t\tb.Meta("charset", "utf-8"),\n\t\tb.Title().T("Field Notes"),\n\t),\n\tb.Body().R(\n\t\tb.Header().R(b.H1().T("Field Notes")),\n\t\tb.Main().R(b.Article("class", "note").R(b.H2().T("Heron at dawn"))),\n\t\tb.Footer().R(b.P().T("© 2026 Field Notes")),\n\t),\n)\npage := b.String() // the document you are about to write by hand' },
			'<p>Closing tags become closing parens — the compiler enforces ' +
			'what the validator here can only check after the fact. When this ' +
			'page is done, head over to the <em>TypeScript + Go Web</em> ' +
			'track and build it there for real, served by a Go web server.</p>',
			'<h3>Your job</h3>' +
			'<p>Grow the starter fragment into the complete Field Notes page: ' +
			'full skeleton, head with charset, viewport, title, and a ' +
			'<code>.note</code> stylesheet; then a body with ' +
			'<code>header</code> (the h1), a <code>nav</code> of two links, ' +
			'<code>main</code> holding an <code>article</code> (h2, the ' +
			'paragraph, a <code>figure</code> with image and caption, and a ' +
			'small form), and a footer that says ' +
			'<code>&amp;copy; 2026 Field Notes</code>.</p>' +
			'<div class="tip">Build top-down and run after every region. A ' +
			'mismatched closing tag reported at the end of a 30-line page is ' +
			'a puzzle; the same error 4 lines after you typed it is a ' +
			'correction.</div>',
		],

		task: 'Build the complete Field Notes page: doctype and skeleton, head metadata and style, landmarks, article with figure, a small form, and an entity-correct footer.',

		starter: [
			'<!-- Capstone: grow this fragment into the complete page. -->',
			'<!-- TODO 1: doctype, then html lang="en" wrapping head and body. -->',
			'<!-- TODO 2: head — meta charset utf-8, the viewport meta, a title -->',
			'<!--         saying Field Notes, and one style element with a .note rule. -->',
			'<!-- TODO 3: body — header (this h1), a nav with two links, then a -->',
			'<!--         main holding an article class="note" (an h2 plus this p). -->',
			'<!-- TODO 4: inside the article — a figure (img plus figcaption) and -->',
			'<!--         a form: label wired by for/id, an input with a name, -->',
			'<!--         and a button of the submit type. -->',
			'<!-- TODO 5: last, a footer: (c) 2026 Field Notes via the entity. -->',
			'<h1>Field Notes</h1>',
			'<p>One grey heron, motionless in the shallows for twenty minutes.</p>',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// One pin per checklist region: skeleton at position zero, head
			// metadata at head depth, the stylesheet as style raw text, the
			// landmark nesting via outline indentation, the figure pair, the
			// wired form controls, and the decoded &copy; in the footer text.
			return stdout.startsWith('doctype html\nhtml lang="en"') &&
				flat.indexOf('meta charset="utf-8"') !== -1 &&
				flat.indexOf('meta name="viewport"') !== -1 &&
				stdout.indexOf('title\n      "Field Notes"') !== -1 &&
				/style\n\s+"[^"]*\.note \{/.test(stdout) &&
				stdout.indexOf('header\n') !== -1 &&
				stdout.indexOf('nav\n') !== -1 &&
				stdout.indexOf('main\n      article') !== -1 &&
				stdout.indexOf('figure\n') !== -1 &&
				stdout.indexOf('figcaption\n') !== -1 &&
				flat.indexOf('label for="sighting"') !== -1 &&
				flat.indexOf('input id="sighting" name="sighting"') !== -1 &&
				flat.indexOf('button type="submit"') !== -1 &&
				stdout.indexOf('© 2026 Field Notes') !== -1;
		},

		solution: [
			'<!doctype html>',
			'<html lang="en">',
			'<head>',
			'  <meta charset="utf-8">',
			'  <meta name="viewport" content="width=device-width, initial-scale=1">',
			'  <title>Field Notes</title>',
			'  <style>',
			'    .note { border: 1px solid #b6c8d8; border-radius: 8px; padding: 12px; }',
			'  </style>',
			'</head>',
			'<body>',
			'  <header>',
			'    <h1>Field Notes</h1>',
			'  </header>',
			'  <nav>',
			'    <a href="#heron">Latest</a>',
			'    <a href="#about">About</a>',
			'  </nav>',
			'  <main>',
			'    <article class="note">',
			'      <h2 id="heron">Heron at dawn</h2>',
			'      <p>One grey heron, motionless in the shallows for twenty minutes.</p>',
			'      <figure>',
			'        <img src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'80\'%3E%3Crect width=\'120\' height=\'80\' fill=\'%2378b7f0\'/%3E%3Ctext x=\'60\' y=\'45\' font-size=\'13\' text-anchor=\'middle\' fill=\'%23fff\'%3Ephoto%3C/text%3E%3C/svg%3E" alt="Sketch of a grey heron in the shallows">',
			'        <figcaption>Sketched from the east bank, first light.</figcaption>',
			'      </figure>',
			'      <form>',
			'        <label for="sighting">Add a sighting</label>',
			'        <input id="sighting" name="sighting">',
			'        <button type="submit">Save</button>',
			'      </form>',
			'    </article>',
			'  </main>',
			'  <footer>',
			'    <p>&copy; 2026 Field Notes</p>',
			'  </footer>',
			'</body>',
			'</html>',
			'',
		].join('\n'),
	});
})();
