/* Positioning — Layout (lesson). position: static means the offsets you
 * wrote do NOTHING — the most silently-failing declaration in CSS. The
 * learner applies the relative-parent / absolute-child pattern that powers
 * every badge, dropdown, and close button.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	T.lesson({
		id: 'positioning',
		title: 'Positioning & the Containing Block',
		nav: 'positioning',
		category: 'Layout',

		prose: [
			'<h2>Positioning &amp; the Containing Block</h2>' +
			'<p>The <code>position</code> property decides whether an element obeys ' +
			'normal flow — and what the offset properties (<code>top</code>, ' +
			'<code>right</code>, <code>bottom</code>, <code>left</code>) mean:</p>' +
			'<ul>' +
			'<li><code>static</code> — the default. In flow, and ' +
			'<strong>offsets are ignored entirely</strong>: a <code>top: -8px</code> ' +
			'on a static element is a no-op, not an error;</li>' +
			'<li><code>relative</code> — in flow (its space stays reserved), ' +
			'offsets nudge the rendering. Quiet superpower below;</li>' +
			'<li><code>absolute</code> — <em>out</em> of flow, positioned against ' +
			'its <strong>containing block: the nearest ancestor whose position is ' +
			'not static</strong>. No positioned ancestor → the page itself;</li>' +
			'<li><code>fixed</code> — out of flow, pinned to the viewport ' +
			'(toasts, floating action buttons);</li>' +
			'<li><code>sticky</code> — relative until you scroll past it, then ' +
			'pinned (section headers).</li>' +
			'</ul>' +
			'<p>That bolded clause is the pattern behind every notification badge, ' +
			'dropdown menu, and image-corner close button in the wild:</p>',
			{ lang: 'css', code: '.card\n\tposition relative     // "I volunteer as the containing block"\n\n\t.badge\n\t\tposition absolute // measured from .card\'s corners now\n\t\ttop -8px\n\t\tright -8px' },
			'<p><code>position relative</code> with no offsets moves nothing — it ' +
			'exists purely to catch the absolutely-positioned child, so the badge ' +
			'rides its card wherever layout puts it instead of fleeing to the page ' +
			'corner.</p>' +
			'<h3>Your job</h3>' +
			'<p>The badge\'s offsets are already written — and doing nothing, ' +
			'because both elements are static. Complete the pattern: ' +
			'<code>.card</code> gets <code>position relative</code>, the nested ' +
			'badge gets <code>position absolute</code>.</p>',
		],

		task: 'Add position relative to .card and position absolute to its .badge — the offsets start working.',

		starter: T.program([
			'.card',
			'	width 300px',
			'	padding 16px',
			'',
			'	.badge',
			'		top -8px',
			'		right -8px',
		]),

		check: function (stdout, flat) {
			return flat.indexOf('position: relative;') !== -1 &&
				flat.indexOf('.card .badge {') !== -1 &&
				flat.indexOf('position: absolute;') !== -1 &&
				flat.indexOf('top: -8px;') !== -1;
		},

		solution: T.program([
			'.card',
			'	width 300px',
			'	padding 16px',
			'	// no offsets needed: this line exists to become the containing',
			'	// block for the absolute child below',
			'	position relative',
			'',
			'	.badge',
			'		// out of flow, measured from .card\'s padding box corners',
			'		position absolute',
			'		top -8px',
			'		right -8px',
		]),
	});
})();
