/* Mixins — Abstraction & Reuse (lesson). When the unit of reuse is a
 * PATTERN of declarations rather than a value, a variable isn't enough:
 * mixins are functions that expand into declarations at compile time.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	T.lesson({
		id: 'mixins',
		title: 'Mixins: Reusable Declaration Sets',
		nav: 'mixins',
		category: 'Abstraction & Reuse',

		prose: [
			'<h2>Mixins: Reusable Declaration Sets</h2>' +
			'<p>Variables de-duplicate <em>values</em>. But some repetition is a ' +
			'<em>pattern</em> — the same three declarations traveling together. The ' +
			'canonical example is single-line truncation, which never works with ' +
			'fewer than all three:</p>',
			{ lang: 'css', code: 'truncate()\n\toverflow hidden\n\ttext-overflow ellipsis\n\twhite-space nowrap\n\n.title\n\ttruncate()          // expands to the three declarations\n\tfont-weight 600' },
			'<p>A mixin is a rule-shaped function: define once, call inside any ' +
			'rule, and the compiler splices the declarations in at compile time — ' +
			'the browser sees ordinary CSS, no runtime indirection. Mixins take ' +
			'parameters too, which variables never could:</p>',
			{ lang: 'css', code: 'bordered(w)\n\tborder w solid #333\n\n.card\n\tbordered(2px)' },
			'<p>The judgment call — mixin, or a shared class in the markup? A ' +
			'class (<code>class="truncate"</code>) reuses the declarations in the ' +
			'<em>browser</em>, but couples every template to a styling decision. ' +
			'The mixin keeps the markup semantic and pays a few duplicated output ' +
			'bytes. When the pattern carries <em>meaning</em> ("this text ' +
			'truncates"), the mixin reads better; gzip makes the byte cost nearly ' +
			'nothing.</p>' +
			'<h3>Your job</h3>' +
			'<p><code>.title</code> hand-rolls the truncation trio, and ' +
			'<code>.crumb</code> needs it too. Extract the <code>truncate()</code> ' +
			'mixin and call it from <em>both</em> rules — the check wants the trio ' +
			'in the compiled output twice, once per selector.</p>',
		],

		task: 'Extract a truncate() mixin and use it in both .title and .crumb.',

		starter: T.program([
			'.title',
			'	overflow hidden',
			'	text-overflow ellipsis',
			'	white-space nowrap',
			'	font-weight 600',
			'',
			'// needs the same truncation treatment',
			'.crumb',
			'	color #667',
		]),

		check: function (stdout, flat) {
			return (stdout.match(/text-overflow: ellipsis;/g) || []).length === 2 &&
				(stdout.match(/white-space: nowrap;/g) || []).length === 2 &&
				flat.indexOf('.crumb {') !== -1 &&
				flat.indexOf('font-weight: 600;') !== -1;
		},

		solution: T.program([
			'// the pattern, named: three declarations that only work as a set',
			'truncate()',
			'	overflow hidden',
			'	text-overflow ellipsis',
			'	white-space nowrap',
			'',
			'.title',
			'	truncate()',
			'	font-weight 600',
			'',
			'.crumb',
			'	truncate()',
			'	color #667',
		]),
	});
})();
