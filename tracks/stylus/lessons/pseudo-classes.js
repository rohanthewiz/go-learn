/* Pseudo-classes & Pseudo-elements — Selectors (lesson). Styling by STATE
 * (:hover, :focus) and by POSITION (:nth-child) — selectors for facts the
 * markup doesn't spell out. The learner zebra-stripes a table and lights
 * up its hovered row.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	T.lesson({
		id: 'pseudo-classes',
		title: 'Pseudo-classes & Pseudo-elements',
		nav: 'pseudo-classes',
		category: 'Selectors',

		prose: [
			'<h2>Pseudo-classes &amp; Pseudo-elements</h2>' +
			'<p>Classes describe what your markup says. <em>Pseudo</em>-classes ' +
			'select what the browser <em>knows</em> — no extra markup, no ' +
			'JavaScript:</p>' +
			'<ul>' +
			'<li><strong>state</strong>: <code>:hover</code>, <code>:focus</code>, ' +
			'<code>:disabled</code>, <code>:checked</code> — interactive facts, ' +
			'live-updating;</li>' +
			'<li><strong>structure</strong>: <code>:first-child</code>, ' +
			'<code>:nth-child(odd)</code>, <code>:last-child</code> — positional ' +
			'facts, replacing the old habit of hand-stamping ' +
			'<code>class="odd"</code> on every other row.</li>' +
			'</ul>' +
			'<p>Their cousins with double colons, <strong>pseudo-elements</strong>, ' +
			'go further: they style <em>boxes that aren\'t elements at all</em> — ' +
			'<code>::before</code>/<code>::after</code> conjure a decorative box ' +
			'(they need <code>content</code>, even empty), ' +
			'<code>::placeholder</code> and <code>::selection</code> style built-in ' +
			'fragments:</p>',
			{ lang: 'css', code: '.required label\n\t&::after\n\t\tcontent \'*\'\n\t\tcolor #c00' },
			'<p>In Stylus both attach with <code>&amp;</code>, exactly like ' +
			'<code>&amp;:hover</code> in the previous lesson — the <code>&amp;</code> ' +
			'guarantees the no-space glue these selectors require.</p>' +
			'<h3>Your job</h3>' +
			'<p>Give the table rows two classic affordances, both markup-free: ' +
			'<strong>zebra striping</strong> — odd rows get background ' +
			'<code>#f6f8fa</code> — and a <strong>hover highlight</strong> of ' +
			'<code>#eef6ff</code>. Nest both under the existing <code>tr</code> rule ' +
			'with <code>&amp;</code>.</p>' +
			'<div class="tip">Keyboard users get states too: whenever you style ' +
			'<code>:hover</code>, ask what <code>:focus-visible</code> should do — ' +
			'and never <code>outline: none</code> without replacing the focus ' +
			'indicator with something visible.</div>',
		],

		task: 'Nest &:nth-child(odd) with background #f6f8fa and &:hover with background #eef6ff under tr.',

		starter: T.program([
			'tr',
			'	border-bottom 1px solid #eee',
		]),

		check: function (stdout, flat) {
			return flat.indexOf('tr:nth-child(odd) {') !== -1 &&
				flat.indexOf('background: #f6f8fa;') !== -1 &&
				flat.indexOf('tr:hover {') !== -1 &&
				flat.indexOf('background: #eef6ff;') !== -1;
		},

		solution: T.program([
			'tr',
			'	border-bottom 1px solid #eee',
			'',
			'	// structural: the browser counts rows so the markup doesn\'t',
			'	&:nth-child(odd)',
			'		background #f6f8fa',
			'',
			'	// state: tracks the pointer live, wins over the stripe when both',
			'	// apply (same specificity, later in source — the cascade at work)',
			'	&:hover',
			'		background #eef6ff',
		]),
	});
})();
