/* Color — Box Model & Units (lesson). Hex/rgb/hsl, one brand variable as
 * the single source of truth, and derived states computed at compile time.
 * Plus the number that outranks taste: 4.5:1 contrast.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	T.lesson({
		id: 'colors',
		title: 'Color: One Source of Truth',
		nav: 'color',
		category: 'Box Model & Units',

		prose: [
			'<h2>Color: One Source of Truth</h2>' +
			'<p>CSS spells the same color three ways: <code>#0066cc</code> (hex — ' +
			'compact, what tools copy), <code>rgb(0, 102, 204)</code>, and ' +
			'<code>hsl(210, 100%, 40%)</code>. HSL is the one designed for ' +
			'<em>reasoning</em>: hue is the wheel angle, saturation the vividness, ' +
			'lightness the dial you turn for hover and disabled states — "same hue, ' +
			'darker" is a one-number change in HSL and a mystery in hex.</p>' +
			'<p>The engineering principle sits above the notation: <strong>a color ' +
			'used twice is a variable.</strong> A brand color pasted through the ' +
			'sheet drifts — the button\'s hover ends up a slightly different blue ' +
			'than the link\'s. With one definition and <em>derived</em> variants, ' +
			'the palette can\'t disagree with itself:</p>',
			{ lang: 'css', code: "brand = #06c\n\na\n\tcolor brand\n\n\t&:hover\n\t\tcolor darken(brand, 20%)   // compiles to a plain hex: #0052a3" },
			'<p><code>darken</code>/<code>lighten</code> run at <em>compile</em> ' +
			'time — exactly HSL\'s lightness dial, applied by the compiler. The ' +
			'browser receives ordinary hex; change <code>brand</code> once and every ' +
			'derived state follows. (Modern CSS grows the same powers natively via ' +
			'custom properties and <code>color-mix()</code> — the principle is ' +
			'identical, the compiler just moves into the browser.)</p>' +
			'<div class="tip">One number outranks taste: body text needs a ' +
			'<strong>4.5:1</strong> contrast ratio against its background (WCAG AA; ' +
			'3:1 for large text). Grey-on-grey aesthetics fail real readers — check ' +
			'contrast before shipping a palette.</div>' +
			'<h3>Your job</h3>' +
			'<p>Wire the palette to the single source: give links a hover state of ' +
			'<code>darken(brand, 20%)</code>, and add a <code>.btn</code> rule — ' +
			'<code>background brand</code>, <code>color #fff</code> (white on this ' +
			'blue clears 4.5:1 comfortably).</p>',
		],

		task: 'Add a:hover with darken(brand, 20%), and .btn with background brand + color #fff.',

		starter: T.program([
			'brand = #06c',
			'',
			'a',
			'	color brand',
		]),

		check: function (stdout, flat) {
			return flat.indexOf('a:hover {') !== -1 &&
				flat.indexOf('color: #0052a3;') !== -1 &&
				flat.indexOf('.btn {') !== -1 &&
				flat.indexOf('background: #06c;') !== -1 &&
				flat.indexOf('color: #fff;') !== -1;
		},

		solution: T.program([
			'brand = #06c',
			'',
			'a',
			'	color brand',
			'',
			'	// derived, not hand-picked: retune brand and the hover follows',
			'	&:hover',
			'		color darken(brand, 20%)',
			'',
			'.btn',
			'	background brand',
			'	color #fff',
		]),
	});
})();
