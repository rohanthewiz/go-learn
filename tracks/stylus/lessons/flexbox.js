/* Flexbox — Layout (lesson). One-dimensional layout: a main axis, a cross
 * axis, and two properties that finally made "put this on the left, that on
 * the right, everything vertically centered" a three-line job.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	// The two axes of a flex row, with justify-content and align-items
	// pointing along their own axis.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="a flex row: justify-content distributes along the main axis, align-items positions on the cross axis">' +
		'<text x="20" y="20" class="lbl">display: flex — a row container and its two axes</text>' +
		'<rect x="30" y="36" width="460" height="110" rx="8" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="48" y="66" width="80" height="50" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.8"/>' +
		'<text x="88" y="96" text-anchor="middle">logo</text>' +
		'<rect x="150" y="66" width="80" height="50" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.8"/>' +
		'<text x="190" y="96" text-anchor="middle">nav</text>' +
		'<rect x="392" y="66" width="80" height="50" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.8"/>' +
		'<text x="432" y="96" text-anchor="middle">login</text>' +
		'<path d="M 40 160 L 480 160" stroke="var(--warn)" stroke-width="2" marker-end="url(#dgArrowCSF)"/>' +
		'<text x="260" y="180" text-anchor="middle" class="lbl" style="fill:var(--warn)">main axis — justify-content (space-between pushed login right)</text>' +
		'<path d="M 508 46 L 508 136" stroke="var(--tk-pse)" stroke-width="2" marker-end="url(#dgArrowCSF)"/>' +
		'<text x="500" y="91" text-anchor="end" class="lbl">cross axis — align-items: center</text>' +
		'<defs><marker id="dgArrowCSF" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	T.lesson({
		id: 'flexbox',
		title: 'Flexbox: One Dimension',
		nav: 'flexbox',
		category: 'Layout',

		prose: [
			'<h2>Flexbox: One Dimension</h2>' +
			'<p><code>display: flex</code> turns a box into a <em>container</em> ' +
			'that lays its children out along one axis. Everything else is ' +
			'vocabulary hanging off that axis:</p>' +
			DIAGRAM +
			'<ul>' +
			'<li><code>flex-direction</code> — which way the main axis runs ' +
			'(<code>row</code> default, <code>column</code>);</li>' +
			'<li><code>justify-content</code> — distribution along the ' +
			'<em>main</em> axis: <code>space-between</code> pins the ends and ' +
			'spreads the middle, <code>center</code> huddles;</li>' +
			'<li><code>align-items</code> — position on the <em>cross</em> axis: ' +
			'<code>center</code> is the two-word answer to a decade of vertical ' +
			'centering hacks;</li>' +
			'<li><code>gap</code> — space <em>between</em> items only, replacing ' +
			'the margin-plus-negative-margin dance;</li>' +
			'<li>on the children, <code>flex: 1</code> — grow to absorb leftover ' +
			'space (shares split by number, like the Flutter track\'s ' +
			'<code>Expanded</code>).</li>' +
			'</ul>' +
			'<p>Reach for flexbox when content flows in <strong>one direction</strong> ' +
			'— toolbars, nav bars, button rows, card footers. When you\'re placing ' +
			'things in two dimensions at once, that\'s the next lesson.</p>' +
			'<h3>Your job</h3>' +
			'<p>Make <code>.navbar</code> the diagram: <code>display flex</code>, ' +
			'<code>justify-content space-between</code>, <code>align-items ' +
			'center</code>, and a <code>gap 12px</code> so the logo and nav links ' +
			'breathe.</p>',
		],

		task: 'Make .navbar a flex row: space-between, center-aligned, gap 12px.',

		starter: T.program([
			'.navbar',
			'	background #14161a',
			'	padding 8px 16px',
		]),

		check: function (stdout, flat) {
			return flat.indexOf('display: flex;') !== -1 &&
				flat.indexOf('justify-content: space-between;') !== -1 &&
				flat.indexOf('align-items: center;') !== -1 &&
				flat.indexOf('gap: 12px;') !== -1;
		},

		solution: T.program([
			'.navbar',
			'	background #14161a',
			'	padding 8px 16px',
			'	display flex',
			'	// main axis: ends pinned, middle spread',
			'	justify-content space-between',
			'	// cross axis: one line ends a decade of vertical-centering hacks',
			'	align-items center',
			'	gap 12px',
		]),
	});
})();
