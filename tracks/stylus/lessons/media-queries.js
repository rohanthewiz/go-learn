/* Media Queries — Responsive & Motion (lesson). Mobile-first: the plain
 * rules ARE the phone layout, and min-width queries layer enhancements on
 * top — the cascade doing responsive design's heavy lifting.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	T.lesson({
		id: 'media-queries',
		title: 'Media Queries, Mobile-first',
		nav: 'media queries',
		category: 'Responsive & Motion',

		prose: [
			'<h2>Media Queries, Mobile-first</h2>' +
			'<p>A media query is a conditional block: its rules apply only while the ' +
			'condition holds, re-evaluated live as the window resizes. The ' +
			'<em>strategy</em> for using them has a settled answer — ' +
			'<strong>mobile-first</strong>:</p>' +
			'<ul>' +
			'<li>your plain, unconditional rules describe the <em>narrow</em> ' +
			'layout — usually the simplest one (everything full-width, stacked);</li>' +
			'<li>each <code>@media (min-width: …)</code> block <em>adds</em> ' +
			'complexity as room appears — columns, sidebars, wider gutters.</li>' +
			'</ul>' +
			'<p>Why that direction? The overrides run downhill: a wide screen ' +
			're-declares a few properties over the simple base. Desktop-first ' +
			'(<code>max-width</code>) forces every small screen to <em>undo</em> ' +
			'the complex layout instead. Same cascade, half the fighting. Pick ' +
			'breakpoints where <em>your content</em> starts to look wrong — not from ' +
			'a table of device names.</p>' +
			'<p>Stylus adds the organizational win: nest the query <em>inside</em> ' +
			'the component, and the compiler bubbles it out to valid CSS — every ' +
			'fact about <code>.sidebar</code> lives in one block:</p>',
			{ lang: 'css', code: '.sidebar\n\twidth 100%              // the mobile truth\n\n\t@media (min-width: 768px)\n\t\twidth 300px         // the wide-screen amendment' },
			'<h3>Your job</h3>' +
			'<p>The sidebar is mobile-done at <code>width 100%</code>. Nest the ' +
			'<code>@media (min-width: 768px)</code> block inside it and pin the ' +
			'width to <code>300px</code> from tablets up. Check the compiled ' +
			'output: the query surfaces as a proper top-level <code>@media</code> ' +
			'block wrapping a re-scoped <code>.sidebar</code> rule.</p>',
		],

		task: 'Nest @media (min-width: 768px) inside .sidebar with width 300px.',

		starter: T.program([
			'.sidebar',
			'	width 100%',
			'	padding 16px',
		]),

		check: function (stdout, flat) {
			return flat.indexOf('@media (min-width: 768px) { .sidebar { width: 300px; } }') !== -1 &&
				flat.indexOf('width: 100%;') !== -1;
		},

		solution: T.program([
			'.sidebar',
			'	// unconditional = the phone layout: full width, stacked',
			'	width 100%',
			'	padding 16px',
			'',
			'	// enhancement, not exception: applies only once there\'s room.',
			'	// Nested here for humans; the compiler bubbles it out for browsers.',
			'	@media (min-width: 768px)',
			'		width 300px',
		]),
	});
})();
