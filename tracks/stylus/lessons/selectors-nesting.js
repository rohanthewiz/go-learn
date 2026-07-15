/* Selectors & Combinators — Selectors (lesson). Descendant vs child, and
 * how Stylus nesting writes both: indentation is the descendant combinator,
 * `>` narrows to direct children, `&` glues onto the parent selector.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	T.lesson({
		id: 'selectors-nesting',
		title: 'Selectors & Combinators',
		nav: 'selectors & nesting',
		category: 'Selectors',

		prose: [
			'<h2>Selectors &amp; Combinators</h2>' +
			'<p>Selectors have a small grammar. The atoms you know — ' +
			'<code>li</code> (element), <code>.nav</code> (class), ' +
			'<code>#app</code> (id), <code>[type="text"]</code> (attribute). ' +
			'<em>Combinators</em> chain them into structural statements:</p>',
			{ lang: 'txt', code: '.nav a      descendant — any <a> ANYWHERE inside .nav\n.nav > li   child      — only DIRECT children\nh2 + p      adjacent   — the <p> immediately after an <h2>\nh1, h2      grouping   — one rule, several selectors' },
			'<p>Descendant vs child matters the moment structures nest: a dropdown ' +
			'menu inside your nav is "inside <code>.nav</code>", so ' +
			'<code>.nav li</code> styles <em>its</em> items too — usually not what ' +
			'you meant. <code>.nav &gt; li</code> stops at the first level.</p>' +
			'<p>Stylus makes the structure visual: <strong>nesting a selector under ' +
			'another compiles to the descendant relationship</strong>, a leading ' +
			'<code>&gt;</code> makes it a child, and <code>&amp;</code> means "the ' +
			'parent selector itself" — for gluing on states and modifiers with no ' +
			'space:</p>',
			{ lang: 'css', code: '.nav\n\tlist-style none\n\n\t> li              // compiles to  .nav > li\n\t\tdisplay inline-block\n\n\ta                 // compiles to  .nav a\n\t\tcolor #06c\n\n\t\t&:hover       // compiles to  .nav a:hover  (no space!)\n\t\t\tcolor #0a85ff' },
			'<h3>Your job</h3>' +
			'<p>The sheet styles the nav with four separate flat rules. Rewrite it ' +
			'as one nested block — and while you\'re in there, tighten the ' +
			'<code>li</code> rule to <em>direct children only</em> ' +
			'(<code>&gt; li</code>) so a future dropdown doesn\'t inherit ' +
			'inline-block items. The compiled CSS must contain ' +
			'<code>.nav &gt; li</code> and <code>.nav a:hover</code>.</p>' +
			'<div class="tip">Nesting is for expressing structure, not for its own ' +
			'sake: every level adds specificity (remember the cascade lesson). Two ' +
			'or three levels deep is a healthy ceiling.</div>',
		],

		task: 'Rewrite as one nested .nav block: > li (direct children), a, and &:hover inside it.',

		starter: T.program([
			'.nav',
			'	list-style none',
			'',
			'.nav li',
			'	display inline-block',
			'',
			'.nav a',
			'	color #06c',
			'',
			'.nav a:hover',
			'	color #0a85ff',
		]),

		check: function (stdout, flat) {
			return flat.indexOf('.nav > li {') !== -1 &&
				flat.indexOf('display: inline-block;') !== -1 &&
				flat.indexOf('.nav a:hover {') !== -1 &&
				flat.indexOf('color: #0a85ff;') !== -1;
		},

		solution: T.program([
			'.nav',
			'	list-style none',
			'',
			'	// > : direct children only — a nested dropdown\'s items are safe',
			'	> li',
			'		display inline-block',
			'',
			'	a',
			'		color #06c',
			'',
			'		// & glues to the parent: .nav a:hover, not .nav a :hover',
			'		&:hover',
			'			color #0a85ff',
		]),
	});
})();
