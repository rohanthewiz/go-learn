/* Head & Metadata — the head as the page's machine-facing API: charset
 * first, viewport for phones, title, description, stylesheet/icon links,
 * and a nod to Open Graph. Exercise completes a head that has only a
 * title; the check pins the exact charset, viewport, description, and
 * icon-link outline lines — none of which the starter's head contains,
 * so only writing real metadata can pass.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'head-metadata',
		title: 'Head & Metadata',
		nav: 'head and metadata',
		category: 'Attributes & Metadata',

		prose: [
			'<h2>The page&rsquo;s machine-facing API</h2>' +
			'<p>Everything inside <code>&lt;body&gt;</code> is for humans. ' +
			'Everything inside <code>&lt;head&gt;</code> is for <em>machines</em>: ' +
			'the browser deciding how to decode and scale the page, the search ' +
			'engine writing your result snippet, the chat app unfurling a pasted ' +
			'link. None of it paints pixels in the viewport &mdash; and that is ' +
			'exactly why beginners skip it, and exactly why you should not. A ' +
			'page with an empty head <em>works</em>, in the way a package with ' +
			'no label ships: it arrives somewhere, unrecognizable.</p>',
			'<h2>Charset comes first &mdash; literally</h2>' +
			'<p>The browser has to pick a character encoding before it can turn ' +
			'your bytes into text. <code>&lt;meta charset="utf-8"&gt;</code> ' +
			'declares it &mdash; and it must appear <em>before any text ' +
			'content</em>, ideally as the very first thing in the head. If the ' +
			'parser meets an em dash or a curly quote before it learns the ' +
			'encoding, it may guess wrong and mis-decode everything it already ' +
			'read. Put it first; never think about mojibake again.</p>',
			{ lang: 'html', code: '<head>\n  <meta charset="utf-8">  <!-- FIRST: decode rules before any text -->\n  ...\n</head>' },
			'<h2>Viewport: opting in to mobile</h2>' +
			'<p>For historical reasons, phones assume a page was designed for a ' +
			'desktop monitor: without instructions they lay it out on a virtual ' +
			'980px-wide canvas and zoom out until it fits &mdash; that tiny, ' +
			'pinch-to-read rendering you have seen on old sites. One meta tag ' +
			'opts out of the time machine:</p>',
			{ lang: 'html', code: '<meta name="viewport" content="width=device-width, initial-scale=1">' },
			'<p>It says: lay out at the device&rsquo;s real width, at 1:1 zoom. ' +
			'Notice the shape &mdash; generic <code>&lt;meta&gt;</code> tags are ' +
			'<code>name</code>/<code>content</code> pairs, a key and its value. ' +
			'Only <code>charset</code> gets its own special attribute.</p>',
			'<h2>Title and description: how the world quotes you</h2>' +
			'<p><code>&lt;title&gt;</code> is the browser tab, the bookmark ' +
			'label, and the headline of your search result. ' +
			'<code>&lt;meta name="description"&gt;</code> is the gray snippet ' +
			'under that headline &mdash; one or two plain sentences saying what ' +
			'the page is. Neither renders in the page itself; both decide ' +
			'whether anyone clicks through to it.</p>',
			'<h2>Links out: stylesheets and icons</h2>' +
			'<p><code>&lt;link&gt;</code> (a void element &mdash; no closing ' +
			'tag) attaches external resources. The <code>rel</code> attribute ' +
			'names the <em>relationship</em>; <code>href</code> points at the ' +
			'file:</p>',
			{ lang: 'html', code: '<link rel="stylesheet" href="/styles.css">  <!-- how the page looks -->\n<link rel="icon" href="/favicon.svg">       <!-- the tab and bookmark icon -->' },
			'<p>One more family worth recognizing: Open Graph tags like ' +
			'<code>&lt;meta property="og:title" content="..."&gt;</code> ' +
			'(note <code>property</code>, not <code>name</code>) feed the ' +
			'preview cards that chat apps and social sites build when someone ' +
			'pastes your link. Same head, yet another machine reading it.</p>',
			'<h3>Your job</h3>' +
			'<p>The starter is a valid page whose head holds only a title. ' +
			'Complete it: <code>charset</code> first, then the viewport meta, a ' +
			'<code>description</code> meta with a short sentence of your own ' +
			'(skip the <code>&amp;</code> character &mdash; the validator ' +
			'demands <code>&amp;amp;</code>), and ' +
			'<code>&lt;link rel="icon" href="/favicon.svg"&gt;</code>. The ' +
			'preview pane will look identical before and after &mdash; head ' +
			'content is for machines. The <em>structure outline</em> is where ' +
			'you see your work, and here that outline is the point.</p>' +
			'<div class="tip">Order inside the head mostly does not matter ' +
			'&mdash; except <code>charset</code>, which must beat any text to ' +
			'the parser. Habit: charset, viewport, title, everything else.</div>',
		],

		task: 'Complete the head: charset, viewport, a description meta, and an icon link.',

		starter: [
			'<!doctype html>',
			'<html lang="en">',
			'<head>',
			'  <!-- TODO 1: declare the charset (utf-8) - FIRST, before any text -->',
			'  <!-- TODO 2: the viewport meta: device width, initial scale 1 -->',
			'  <title>Trail Notes</title>',
			'  <!-- TODO 3: a description meta with a short sentence (no bare ampersand) -->',
			'  <!-- TODO 4: an icon link pointing at /favicon.svg -->',
			'</head>',
			'<body>',
			'  <h1>Trail Notes</h1>',
			'  <p>Everything interesting about this page is above the body.</p>',
			'</body>',
			'</html>',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('meta charset="utf-8"') &&
				stdout.includes('meta name="viewport" content="width=device-width, initial-scale=1"') &&
				stdout.includes('meta name="description" content="') &&
				stdout.includes('link rel="icon" href="/favicon.svg"') &&
				// charset must reach the parser before the title's text does
				flat.indexOf('meta charset="utf-8"') !== -1 &&
				flat.indexOf('meta charset="utf-8"') < flat.indexOf('"Trail Notes"');
		},

		solution: [
			'<!doctype html>',
			'<html lang="en">',
			'<head>',
			'  <!-- charset first: the parser needs decode rules before any text -->',
			'  <meta charset="utf-8">',
			'  <!-- opt out of the 980px zoomed-out desktop layout on phones -->',
			'  <meta name="viewport" content="width=device-width, initial-scale=1">',
			'  <title>Trail Notes</title>',
			'  <!-- the search-result snippet: plain sentences, for machines -->',
			'  <meta name="description" content="Field notes on hiking trails, gear, and maps.">',
			'  <!-- the tab and bookmark icon; link is void, no closing tag -->',
			'  <link rel="icon" href="/favicon.svg">',
			'</head>',
			'<body>',
			'  <h1>Trail Notes</h1>',
			'  <p>Everything interesting about this page is above the body.</p>',
			'</body>',
			'</html>',
			'',
		].join('\n'),
	});
})();
