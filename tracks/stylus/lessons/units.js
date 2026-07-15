/* Units — Box Model & Units (lesson). px, em, rem, %, vh/vw: which ruler
 * measures what, and why type in rem respects the user. Stylus variables
 * and arithmetic turn the principle into a computed type scale.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	T.lesson({
		id: 'units',
		title: 'Units: px, em, rem, %, vh',
		nav: 'units',
		category: 'Box Model & Units',

		prose: [
			'<h2>Units: <code>px</code>, <code>em</code>, <code>rem</code>, ' +
			'<code>%</code>, <code>vh</code></h2>' +
			'<p>Every length answers "relative to <em>what</em>?" — and choosing the ' +
			'ruler is the design decision:</p>' +
			'<ul>' +
			'<li><code>px</code> — absolute. Honest for hairlines and radii; wrong ' +
			'for text, because it ignores the user\'s chosen font size;</li>' +
			'<li><code>em</code> — relative to the <em>current element\'s</em> font ' +
			'size. Powerful and treacherous: nested ems compound (a 0.9em list ' +
			'inside a 0.9em list is 0.81em);</li>' +
			'<li><code>rem</code> — relative to the <em>root</em> font size. The ' +
			'em\'s compounding fixed: one global knob, no surprises — the default ' +
			'choice for type and spacing;</li>' +
			'<li><code>%</code> — relative to the parent box (widths, mostly);</li>' +
			'<li><code>vh</code>/<code>vw</code> — 1% of the viewport: hero ' +
			'sections, full-height panes.</li>' +
			'</ul>' +
			'<p>The rem matters more than it looks: a user who sets their browser to ' +
			'20px base text is telling you what they can read. rem-sized text scales ' +
			'with them; px-sized text overrules them. Accessibility, one unit ' +
			'choice.</p>' +
			'<p>Stylus lets the scale be <em>computed</em> — a variable plus ' +
			'arithmetic, resolved at compile time so the browser sees plain ' +
			'values:</p>',
			{ lang: 'css', code: 'base = 1rem\n\nh1\n\tfont-size base * 2      // compiles to font-size: 2rem' },
			'<h3>Your job</h3>' +
			'<p>Extend the scale from the one <code>base</code> variable: ' +
			'<code>h2</code> at <code>base * 1.5</code>, <code>small</code> at ' +
			'<code>base * 0.875</code>. Then add a <code>.hero</code> rule with ' +
			'<code>min-height 60vh</code> — a section that claims most of the ' +
			'viewport whatever the screen is.</p>',
		],

		task: 'Add h2 (base * 1.5), small (base * 0.875), and .hero with min-height 60vh.',

		starter: T.program([
			'base = 1rem',
			'',
			'h1',
			'	font-size base * 2',
		]),

		check: function (stdout, flat) {
			return flat.indexOf('font-size: 1.5rem;') !== -1 &&
				flat.indexOf('font-size: 0.875rem;') !== -1 &&
				flat.indexOf('.hero {') !== -1 &&
				flat.indexOf('min-height: 60vh;') !== -1;
		},

		solution: T.program([
			'base = 1rem',
			'',
			'// the whole type scale hangs off one variable: retune base and',
			'// every size follows, still in user-respecting rem',
			'h1',
			'	font-size base * 2',
			'',
			'h2',
			'	font-size base * 1.5',
			'',
			'small',
			'	font-size base * 0.875',
			'',
			'// viewport units for the one thing that should measure the screen',
			'.hero',
			'	min-height 60vh',
		]),
	});
})();
