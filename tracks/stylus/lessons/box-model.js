/* The Box Model — Box Model & Units (lesson). Every element is four nested
 * rectangles, and the original sin of CSS is what "width" measured. The
 * learner applies the one-rule fix the whole industry adopted:
 * box-sizing: border-box.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	// The four nested boxes, labeled, with the two width arithmetics.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 230" width="520" height="230" role="img" aria-label="margin around border around padding around content; content-box width measures only the innermost box, border-box measures through the border">' +
		'<text x="20" y="20" class="lbl">every element: four nested boxes</text>' +
		'<rect x="40" y="32" width="300" height="150" rx="6" fill="none" stroke="var(--dim)" stroke-width="1.4" stroke-dasharray="6 4"/>' +
		'<text x="52" y="50" class="lbl">margin — space OUTSIDE, pushes neighbors away</text>' +
		'<rect x="70" y="60" width="240" height="104" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="82" y="77" class="lbl" style="fill:var(--warn)">border</text>' +
		'<rect x="96" y="86" width="188" height="60" rx="3" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="108" y="102" class="lbl" style="fill:var(--accent)">padding</text>' +
		'<rect x="122" y="110" width="136" height="26" rx="2" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="190" y="127" text-anchor="middle" style="fill:var(--ok)">content</text>' +
		'<text x="40" y="204" class="lbl">content-box: width = content only → 300 + 2×16 + 2×1 renders 334px wide</text>' +
		'<text x="40" y="222" class="lbl" style="fill:var(--ok)">border-box: width = through the border → 300 means 300, padding eats inward</text>' +
		'</svg>';

	T.lesson({
		id: 'box-model',
		title: 'The Box Model',
		nav: 'box model',
		category: 'Box Model & Units',

		prose: [
			'<h2>The Box Model</h2>' +
			'<p>Layout begins with a fact: every element renders as four nested ' +
			'rectangles — <strong>content</strong>, wrapped in ' +
			'<strong>padding</strong> (space inside the background), wrapped in ' +
			'<strong>border</strong>, wrapped in <strong>margin</strong> (space ' +
			'outside, between neighbors).</p>' +
			DIAGRAM +
			'<p>The historical trap is what <code>width</code> measures. By default ' +
			'(<code>box-sizing: content-box</code>) it measures <em>only the ' +
			'content</em> — so this card:</p>',
			{ lang: 'css', code: '.card\n\twidth 300px\n\tpadding 16px\n\tborder 1px solid #ddd\n// content-box: 300 + 16·2 + 1·2 = 334px on screen. Not 300.' },
			'<p>…renders 334px wide, and two "50%" columns with any padding no ' +
			'longer fit side by side. <code>box-sizing: border-box</code> makes ' +
			'<code>width</code> measure <em>through the border</em>: the box is ' +
			'exactly 300px and padding carves inward. It\'s so much saner that ' +
			'applying it to every element is the most copied rule in CSS:</p>',
			{ lang: 'css', code: '*\n\tbox-sizing border-box' },
			'<p>(Margin is never part of <code>width</code> in either model — it\'s ' +
			'the gap, not the box. Vertical margins between stacked blocks also ' +
			'<em>collapse</em>: 24px meeting 16px yields 24px, not 40 — one more ' +
			'reason to prefer a one-direction habit like margin-bottom-only.)</p>' +
			'<h3>Your job</h3>' +
			'<p>Add the universal border-box rule at the top of the sheet, then give ' +
			'<code>.card</code> its <code>padding 16px</code> — with the fix in ' +
			'place, the card stays exactly 300px wide.</p>',
		],

		task: 'Add * { box-sizing border-box } and give .card padding 16px.',

		starter: T.program([
			'.card',
			'	width 300px',
			'	border 1px solid #ddd',
		]),

		check: function (stdout, flat) {
			return flat.indexOf('* {') !== -1 &&
				flat.indexOf('box-sizing: border-box;') !== -1 &&
				flat.indexOf('padding: 16px;') !== -1;
		},

		solution: T.program([
			'// the most copied rule in CSS: width now means what it says,',
			'// everywhere, and padding stops changing element sizes',
			'*',
			'	box-sizing border-box',
			'',
			'.card',
			'	width 300px',
			'	border 1px solid #ddd',
			'	padding 16px',
		]),
	});
})();
