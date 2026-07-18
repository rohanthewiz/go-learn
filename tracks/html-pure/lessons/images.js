/* Images — img as a void element; src; alt as the load-failure and
 * screen-reader text (meaningful alt for content, explicit alt="" for
 * decoration — and how the outline shows the difference); width/height
 * against layout shift; figure/figcaption for captioned content. The
 * exercise upgrades a bare alt-less img into a captioned figure with
 * alt/width/height plus a decorative alt="" img; the check pins the
 * figure>img nesting, the exact alt/width/height run, the figcaption
 * line, a line ending in alt="", and the absence of any src-only img.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'images',
		title: 'Images',
		nav: 'images',
		category: 'Foundations',

		prose: [
			'<h2>A void element with a job</h2>' +
			'<p><code>&lt;img&gt;</code> embeds a picture. It is a <em>void</em> ' +
			'element: it can have no children — the image itself is the ' +
			'content — so it takes no closing tag, and this validator rejects ' +
			'<code>&lt;/img&gt;</code> outright. Everything it needs travels in ' +
			'attributes, starting with <code>src</code>, the address of the ' +
			'image file:</p>',
			{ lang: 'html', code: '<img src="/photos/harbor.jpg" alt="Fishing boats at low tide" width="640" height="480">' },
			'<p>In this playground <code>src</code> uses a <code>data:</code> ' +
			'URI — the whole image inlined into the attribute — so the preview ' +
			'really renders a picture without touching the network. The ' +
			'principle is identical to a file path.</p>',

			'<h2>alt: the text the image becomes</h2>' +
			'<p><code>alt</code> is the image&#39;s replacement text: what a ' +
			'screen reader speaks, what renders when the file fails to load, ' +
			'what a search engine indexes. Write it as if the image were gone ' +
			'— because for some readers it is. There are exactly two correct ' +
			'moves, and both are deliberate:</p>' +
			'<p>For a <em>content</em> image, write what it shows: ' +
			'<code>alt=&quot;Fishing boats at low tide&quot;</code>. For a ' +
			'purely <em>decorative</em> image, write ' +
			'<code>alt=&quot;&quot;</code> — explicitly empty, but present — ' +
			'which tells assistive tech to skip it silently. ' +
			'<em>Omitting</em> the attribute is the one wrong move: a screen ' +
			'reader falls back to announcing the filename or URL, which for a ' +
			'<code>data:</code> URI is pure noise. The structure outline shows ' +
			'the difference plainly: <code>alt=&quot;&quot;</code> prints on ' +
			'the <code>img</code> line; a missing <code>alt</code> simply ' +
			'is not there. This is also a bug the validator cannot catch for ' +
			'you — an alt-less <code>img</code> parses clean — which is why ' +
			'you audit for it by eye here; the accessibility lesson later ' +
			'returns to it.</p>',

			'<h2>width and height: reserving the space</h2>' +
			'<p><code>width</code> and <code>height</code> (in pixels, no ' +
			'units) tell the browser the image&#39;s aspect ratio <em>before ' +
			'the file arrives</em>, so it can reserve the space in the layout. ' +
			'Without them the page renders, then jumps when the image lands — ' +
			'the &quot;layout shift&quot; that makes you tap the wrong button ' +
			'on a slow connection. Two attributes, jank gone.</p>',

			'<h2>figure and figcaption</h2>' +
			'<p>When an image (or chart, or code listing) is a self-contained ' +
			'unit that deserves a visible caption, wrap it in ' +
			'<code>&lt;figure&gt;</code> with a <code>&lt;figcaption&gt;</code> ' +
			'child. The caption is then <em>structurally</em> bound to the ' +
			'image — not just a paragraph that happens to sit nearby:</p>',
			{ lang: 'html', code: '<figure>\n  <img src="/charts/q3.png" alt="Q3 revenue by region" width="640" height="480">\n  <figcaption>Fig 1. Q3 revenue, EMEA leading.</figcaption>\n</figure>' },

			'<h3>Your job</h3>' +
			'<p>The starter has one bare <code>&lt;img&gt;</code> — no ' +
			'<code>alt</code>, no dimensions, no caption. It parses clean, ' +
			'which is exactly the trap. Wrap it in a ' +
			'<code>&lt;figure&gt;</code>; on the <code>img</code>, after ' +
			'<code>src</code>, add (in this order) ' +
			'<code>alt=&quot;A blue placeholder photo&quot;</code>, ' +
			'<code>width=&quot;120&quot;</code>, ' +
			'<code>height=&quot;80&quot;</code>; add a ' +
			'<code>&lt;figcaption&gt;</code> with a short caption. Then add a ' +
			'second, decorative <code>img</code> after the figure using the ' +
			'same <code>src</code>, with <code>alt=&quot;&quot;</code> as its ' +
			'final attribute.</p>' +
			'<div class="tip">Check the outline: both <code>img</code> lines ' +
			'must show an <code>alt</code>. The content one carries your ' +
			'sentence; the decorative one ends in <code>alt=&quot;&quot;</code> ' +
			'— present, deliberately empty.</div>',
		],

		task: 'Wrap the img in a captioned figure, give it alt/width/height, and add a decorative second img with an explicit alt="".',

		starter: [
			'<h2>Field notes</h2>',
			'',
			'<!-- TODO 1: wrap this img in a figure, and give the figure a',
			'     figcaption (after the img) with a short caption -->',
			'<!-- TODO 2: this img has NO alt — valid here, but an accessibility',
			'     bug. After src add, in order: alt="A blue placeholder photo",',
			'     width="120", height="80" -->',
			'<img src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'80\'%3E%3Crect width=\'120\' height=\'80\' fill=\'%2378b7f0\'/%3E%3Ctext x=\'60\' y=\'45\' font-size=\'13\' text-anchor=\'middle\' fill=\'%23fff\'%3Ephoto%3C/text%3E%3C/svg%3E">',
			'',
			'<!-- TODO 3: after the figure, add a second DECORATIVE img with the',
			'     same src and alt="" as its final attribute -->',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('figure\n  img src="data:') &&
				stdout.includes('alt="A blue placeholder photo" width="120" height="80"') &&
				stdout.includes('  figcaption\n    "') &&
				stdout.includes('alt=""\n') &&
				!/img src="[^"]*"\n/.test(stdout);
		},

		solution: [
			'<h2>Field notes</h2>',
			'',
			'<!-- figure binds the caption to the image structurally.',
			'     alt describes the content; width/height reserve the',
			'     space so the layout never jumps when the file lands. -->',
			'<figure>',
			'  <img src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'80\'%3E%3Crect width=\'120\' height=\'80\' fill=\'%2378b7f0\'/%3E%3Ctext x=\'60\' y=\'45\' font-size=\'13\' text-anchor=\'middle\' fill=\'%23fff\'%3Ephoto%3C/text%3E%3C/svg%3E" alt="A blue placeholder photo" width="120" height="80">',
			'  <figcaption>Fig 1. The placeholder photo, in blue.</figcaption>',
			'</figure>',
			'',
			'<!-- Decorative: alt="" is present but empty, telling assistive',
			'     tech to skip it. Omitting alt would leave a screen reader',
			'     announcing the raw data: URI instead. -->',
			'<img src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'80\'%3E%3Crect width=\'120\' height=\'80\' fill=\'%2378b7f0\'/%3E%3Ctext x=\'60\' y=\'45\' font-size=\'13\' text-anchor=\'middle\' fill=\'%23fff\'%3Ephoto%3C/text%3E%3C/svg%3E" alt="">',
			'',
		].join('\n'),
	});
})();
