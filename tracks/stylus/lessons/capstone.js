/* Capstone — Abstraction & Reuse (lesson). One small design system pulling
 * the whole track together: reset, tokens, typography via inheritance,
 * derived color states, a flex navbar, and a mobile-first breakpoint.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	T.lesson({
		id: 'capstone',
		title: 'Capstone: A Tiny Design System',
		nav: 'capstone',
		category: 'Abstraction & Reuse',

		prose: [
			'<h2>Capstone: A Tiny Design System</h2>' +
			'<p>Every principle in this track, in the order a real stylesheet ' +
			'deploys them:</p>' +
			'<ol>' +
			'<li><strong>Reset</strong> — <code>box-sizing border-box</code> on ' +
			'<code>*</code>, so width means width (box model);</li>' +
			'<li><strong>Tokens</strong> — <code>brand</code> and ' +
			'<code>radius</code> variables: one source of truth (color);</li>' +
			'<li><strong>Typography on <code>body</code></strong> — inheritance ' +
			'delivers it everywhere (inheritance);</li>' +
			'<li><strong>Components</strong> — a button whose hover is ' +
			'<em>derived</em> (<code>darken(brand, 12%)</code>), a navbar laid out ' +
			'by flexbox (nesting, states, layout);</li>' +
			'<li><strong>Responsive amendment</strong> — the sidebar is 100% on ' +
			'phones and 300px from 768px up, mobile-first (media queries).</li>' +
			'</ol>' +
			'<p>The skeleton is in the editor with four TODOs. The compiled output ' +
			'is checked for all four — this is the sheet you\'d actually start a ' +
			'project with.</p>' +
			'<div class="tip">Order matters in real sheets exactly as listed: ' +
			'resets and tokens first (lowest specificity, broadest reach), ' +
			'components after, so the cascade flows from general to specific and ' +
			'overrides stay rare and local.</div>',
		],

		task: 'Fill the four TODOs: border-box reset, .btn hover via darken(brand, 12%), flex navbar, 768px sidebar query.',

		starter: T.program([
			'brand = #06c',
			'radius = 6px',
			'',
			'// TODO 1: universal border-box reset',
			'',
			'body',
			'	font-family system-ui, sans-serif',
			'	line-height 1.6',
			'',
			'.btn',
			'	background brand',
			'	color #fff',
			'	border-radius radius',
			'	// TODO 2: nested hover state — background darken(brand, 12%)',
			'',
			'.navbar',
			'	background #14161a',
			'	// TODO 3: flex row, space-between, center-aligned',
			'',
			'.sidebar',
			'	width 100%',
			'	// TODO 4: nested @media (min-width: 768px) -> width 300px',
		]),

		check: function (stdout, flat) {
			return flat.indexOf('box-sizing: border-box;') !== -1 &&
				flat.indexOf('.btn:hover {') !== -1 &&
				flat.indexOf('background: #005ab4;') !== -1 &&
				flat.indexOf('display: flex;') !== -1 &&
				flat.indexOf('justify-content: space-between;') !== -1 &&
				flat.indexOf('@media (min-width: 768px) { .sidebar { width: 300px; } }') !== -1;
		},

		solution: T.program([
			'brand = #06c',
			'radius = 6px',
			'',
			'// reset: width means width, everywhere',
			'*',
			'	box-sizing border-box',
			'',
			'// typography once — inheritance does the distribution',
			'body',
			'	font-family system-ui, sans-serif',
			'	line-height 1.6',
			'',
			'.btn',
			'	background brand',
			'	color #fff',
			'	border-radius radius',
			'',
			'	// derived state: retune brand and the hover follows',
			'	&:hover',
			'		background darken(brand, 12%)',
			'',
			'.navbar',
			'	background #14161a',
			'	display flex',
			'	justify-content space-between',
			'	align-items center',
			'',
			'.sidebar',
			'	// mobile-first: unconditional = phone, the query adds width',
			'	width 100%',
			'',
			'	@media (min-width: 768px)',
			'		width 300px',
		]),
	});
})();
