/* Document Structure — the full page skeleton: <!doctype html> (and quirks
 * mode as the reason it exists), <html lang>, machine-facing <head> (charset
 * first, then title) versus human-facing <body>. Includes an SVG tree
 * diagram of html -> head/body. The exercise upgrades a valid two-element
 * fragment into a complete document; the check pins the outline STARTING
 * with doctype + html lang="en" (so leftover comments or a misplaced
 * doctype fail), the charset meta, the title text at head depth (6-space
 * indent), and the h1 nested under body — none reachable by the fragment.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'document-structure',
		title: 'Document Structure',
		nav: 'document structure',
		category: 'Foundations',

		prose: [
			'<h2>The skeleton every real page ships</h2>' +
			'<p>So far you have written <em>fragments</em> — a heading here, ' +
			'a paragraph there — and both the preview and the validator ' +
			'accept them happily. Real pages are not fragments. Every page ' +
			'you actually ship wears the same four-part skeleton:</p>',
			{ lang: 'html', code: '<!doctype html>\n<html lang="en">\n<head>\n  <meta charset="utf-8">\n  <title>My First Page</title>\n</head>\n<body>\n  <h1>My First Page</h1>\n  <p>Visible content lives here.</p>\n</body>\n</html>' },
			'<p><code>&lt;!doctype html&gt;</code> is not an element — it has ' +
			'no closing tag and no children. It is a <em>mode switch</em>. ' +
			'Without it, browsers drop into <strong>quirks mode</strong>: a ' +
			'deliberate emulation of 1990s browser bugs (mis-sized boxes, ' +
			'strange line heights) kept alive so ancient pages still render. ' +
			'You never want those bugs, so the doctype goes on the very first ' +
			'line, before anything else. Modern HTML reduced it to those ' +
			'fifteen characters precisely so nobody would ever mistype it.</p>',

			'<h2>&lt;head&gt; is for machines, &lt;body&gt; is for people</h2>' +
			'<p>Inside <code>&lt;html&gt;</code> live exactly two children ' +
			'with opposite audiences. <code>&lt;head&gt;</code> is ' +
			'<em>metadata</em> — nothing in it renders on the page. ' +
			'<code>&lt;meta charset="utf-8"&gt;</code> comes first for a ' +
			'mechanical reason: the browser is decoding a stream of bytes ' +
			'into characters and must learn the encoding <em>before</em> it ' +
			'meets its first non-ASCII character, or you get mojibake. ' +
			'<code>&lt;title&gt;</code> names the browser tab, the bookmark, ' +
			'and the search-result link — a page without one is anonymous ' +
			'everywhere except its own body.</p>' +
			'<p><code>&lt;body&gt;</code> is everything visible: all the ' +
			'headings, paragraphs, images, and forms of the coming lessons ' +
			'live here. And the <code>lang="en"</code> attribute on ' +
			'<code>&lt;html&gt;</code> is for yet another machine audience: ' +
			'screen readers use it to pick pronunciation rules, and ' +
			'translators and spellcheckers key off it. One attribute, typed ' +
			'once, helps every reader you cannot see.</p>',

			'<svg class="dg" viewBox="0 0 460 190" role="img" aria-label="Document tree: html branches to head and body; head holds meta and title; body holds h1 and p">' +
			'<g fill="none" stroke="currentColor" stroke-opacity=".45">' +
			'<path d="M230 38 L120 75"/><path d="M230 38 L340 75"/>' +
			'<path d="M120 103 L60 140"/><path d="M120 103 L180 140"/>' +
			'<path d="M340 103 L295 140"/><path d="M340 103 L405 140"/>' +
			'</g>' +
			'<g fill="rgba(120,183,240,.16)" stroke="currentColor" stroke-opacity=".55">' +
			'<rect x="190" y="10" width="80" height="28" rx="6"/>' +
			'<rect x="80" y="75" width="80" height="28" rx="6"/>' +
			'<rect x="300" y="75" width="80" height="28" rx="6"/>' +
			'<rect x="20" y="140" width="80" height="26" rx="6"/>' +
			'<rect x="140" y="140" width="80" height="26" rx="6"/>' +
			'<rect x="255" y="140" width="80" height="26" rx="6"/>' +
			'<rect x="365" y="140" width="80" height="26" rx="6"/>' +
			'</g>' +
			'<g fill="currentColor" font-family="ui-monospace,monospace" font-size="13" text-anchor="middle">' +
			'<text x="230" y="28">html</text>' +
			'<text x="120" y="93">head</text><text x="340" y="93">body</text>' +
			'<text x="60" y="157">meta</text><text x="180" y="157">title</text>' +
			'<text x="295" y="157">h1</text><text x="405" y="157">p</text>' +
			'</g></svg>' +
			'<p>Compare that diagram with the validator outline of the ' +
			'skeleton snippet above: <code>head</code> and <code>body</code> ' +
			'indented two spaces under <code>html</code>, their children two ' +
			'more. The outline pane is this diagram, drawn with ' +
			'indentation.</p>' +
			'<p>The validator accepts fragments so early lessons are not ' +
			'drowned in boilerplate — but treat a fragment as a body missing ' +
			'its spacesuit. From here on, when you build a whole page, ship ' +
			'the skeleton.</p>',

			'<h3>Your job</h3>' +
			'<p>The starter is a valid fragment: one <code>h1</code> and one ' +
			'<code>p</code>. Grow it into a complete document — ' +
			'<code>&lt;!doctype html&gt;</code> on the first line, everything ' +
			'wrapped in <code>&lt;html lang="en"&gt;</code>, a ' +
			'<code>&lt;head&gt;</code> holding ' +
			'<code>&lt;meta charset="utf-8"&gt;</code> then ' +
			'<code>&lt;title&gt;My First Page&lt;/title&gt;</code>, and the ' +
			'existing content wrapped in <code>&lt;body&gt;</code>.</p>' +
			'<div class="tip">The doctype must be the very first thing in the ' +
			'document, so delete each TODO comment as you complete it — if a ' +
			'comment is left above the doctype, the outline will not start ' +
			'with <code>doctype html</code>.</div>',
		],

		task: 'Wrap the fragment into a complete document: doctype, html lang="en", head with charset and title, and body.',

		starter: [
			'<!-- TODO 1: put <!doctype html> on the very first line -->',
			'<!-- TODO 2: wrap everything below in <html lang="en"> -->',
			'<!-- TODO 3: add a <head> with <meta charset="utf-8"> then <title>My First Page</title> -->',
			'<!-- TODO 4: wrap the two visible elements in <body> -->',
			'<h1>My First Page</h1>',
			'<p>A fragment on its way to becoming a full document.</p>',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.indexOf('doctype html\nhtml lang="en"\n') === 0 &&
				stdout.includes('meta charset="utf-8"') &&
				stdout.includes('title\n      "My First Page"') &&
				stdout.includes('body\n    h1\n      "') &&
				flat.indexOf(' head ') < flat.indexOf(' body ');
		},

		solution: [
			'<!doctype html>',
			'<html lang="en">',
			'<head>',
			'  <meta charset="utf-8">',
			'  <title>My First Page</title>',
			'</head>',
			'<body>',
			'  <h1>My First Page</h1>',
			'  <p>A fragment on its way to becoming a full document.</p>',
			'</body>',
			'</html>',
			'',
		].join('\n'),
	});
})();
