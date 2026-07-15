/* Display & Normal Flow — Layout (lesson). Before flexbox and grid there is
 * the default layout every page starts with: blocks stack, inlines flow in
 * text. The display property is the switch between those worlds.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	T.lesson({
		id: 'display-flow',
		title: 'display & Normal Flow',
		nav: 'display & flow',
		category: 'Layout',

		prose: [
			'<h2><code>display</code> &amp; Normal Flow</h2>' +
			'<p>With zero layout CSS, the page already lays itself out — ' +
			'<em>normal flow</em>. Every element participates in one of two ' +
			'ways:</p>' +
			'<ul>' +
			'<li><strong>block</strong> (<code>div</code>, <code>p</code>, ' +
			'<code>h1</code>…) — starts on a new line, stretches the full available ' +
			'width, respects <code>width</code>/<code>height</code> and all margins;' +
			'</li>' +
			'<li><strong>inline</strong> (<code>span</code>, <code>a</code>, ' +
			'<code>strong</code>…) — flows <em>within a line of text</em>, wraps ' +
			'mid-element at line ends, and — the part that bites — <strong>ignores ' +
			'<code>width</code>, <code>height</code>, and vertical margins</strong>. ' +
			'Its size is its text; vertical padding paints but doesn\'t push the ' +
			'lines apart.</li>' +
			'</ul>' +
			'<p><code>display</code> switches an element\'s mode, and the hybrid ' +
			'earns its keep constantly: <code>inline-block</code> flows in the line ' +
			'like an inline but sizes like a block — the classic fix for badges, ' +
			'pills, and tags that need real padding without claiming a full ' +
			'line:</p>',
			{ lang: 'css', code: '.badge\n\tdisplay inline-block   // in the text flow, but a real box\n\tpadding 2px 8px' },
			'<p>And one more value carries weight: <code>display none</code> removes ' +
			'the element from flow entirely — no box, no space reserved, invisible ' +
			'to screen readers. (Contrast <code>visibility: hidden</code>, which ' +
			'hides the element but leaves its hole in the layout.)</p>' +
			'<h3>Your job</h3>' +
			'<p>Two fixes: make <code>.badge</code> an <code>inline-block</code> so ' +
			'its padding actually shapes a pill, and add a <code>.draft</code> rule ' +
			'with <code>display none</code> — unpublished items should leave no gap ' +
			'behind.</p>',
		],

		task: 'Give .badge display inline-block, and add .draft with display none.',

		starter: T.program([
			'.badge',
			'	padding 2px 8px',
			'	background #eef2ff',
			'	border-radius 999px',
		]),

		check: function (stdout, flat) {
			return flat.indexOf('display: inline-block;') !== -1 &&
				flat.indexOf('.draft {') !== -1 &&
				flat.indexOf('display: none;') !== -1;
		},

		solution: T.program([
			'.badge',
			'	// inline-block: sits in the sentence, but the padding is REAL —',
			'	// a plain inline would paint it without making room',
			'	display inline-block',
			'	padding 2px 8px',
			'	background #eef2ff',
			'	border-radius 999px',
			'',
			'.draft',
			'	// gone from flow entirely: no box, no reserved space',
			'	display none',
		]),
	});
})();
