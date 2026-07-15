/* Grid — Layout (lesson). Two-dimensional layout: define the tracks, let
 * content fill them, span when something deserves more. The fr unit is the
 * star — fractions of leftover space, no percentage arithmetic.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	T.lesson({
		id: 'grid',
		title: 'Grid: Two Dimensions',
		nav: 'grid',
		category: 'Layout',

		prose: [
			'<h2>Grid: Two Dimensions</h2>' +
			'<p>Flexbox pours content along one axis. <strong>Grid inverts the ' +
			'thinking</strong>: you define the skeleton — rows <em>and</em> columns ' +
			'— on the container, and children fall into its cells:</p>',
			{ lang: 'css', code: '.gallery\n\tdisplay grid\n\tgrid-template-columns repeat(3, 1fr)\n\tgap 16px' },
			'<p>Reading that template: three columns, each <code>1fr</code> — one ' +
			'<em>fraction</em> of the space left after fixed tracks and gaps are ' +
			'paid. <code>fr</code> is the unit percentages wanted to be: ' +
			'<code>repeat(3, 1fr)</code> is always exactly three equal columns, ' +
			'gaps included, no <code>33.333%</code> arithmetic drifting out of sync. ' +
			'Mixed tracks read naturally too — <code>250px 1fr</code> is a fixed ' +
			'sidebar and a fluid main.</p>' +
			'<p>Children flow into cells automatically, left-to-right, wrapping row ' +
			'by row — and any child can claim more room:</p>',
			{ lang: 'css', code: '.feature\n\tgrid-column span 2   // twice the width; grid-row span 2 works too' },
			'<p>The choice between the two layout systems is about who\'s in ' +
			'charge: <strong>flexbox lets content drive</strong> (a row of buttons, ' +
			'each its natural size), <strong>grid lets the layout drive</strong> ' +
			'(a gallery, a dashboard, the page scaffold itself). They nest freely — ' +
			'a grid cell often holds a flex row.</p>' +
			'<h3>Your job</h3>' +
			'<p>Turn <code>.gallery</code> into the three-column grid above ' +
			'(<code>repeat(3, 1fr)</code>, <code>gap 16px</code>), and let ' +
			'<code>.feature</code> span two columns.</p>',
		],

		task: 'Give .gallery three 1fr columns with gap 16px; make .feature span 2 columns.',

		starter: T.program([
			'.gallery',
			'	display grid',
			'',
			'.feature',
			'	background #f6f8fa',
		]),

		check: function (stdout, flat) {
			return flat.indexOf('grid-template-columns: repeat(3, 1fr);') !== -1 &&
				flat.indexOf('gap: 16px;') !== -1 &&
				flat.indexOf('grid-column: span 2;') !== -1;
		},

		solution: T.program([
			'.gallery',
			'	display grid',
			'	// three equal fractions of whatever is left after the gaps —',
			'	// always exactly equal, unlike 33.333% arithmetic',
			'	grid-template-columns repeat(3, 1fr)',
			'	gap 16px',
			'',
			'.feature',
			'	background #f6f8fa',
			'	// the item claims two tracks; the rest of the flow reflows around it',
			'	grid-column span 2',
		]),
	});
})();
