/* Inheritance — Foundations (lesson). The third pillar after matching and
 * the cascade: text properties flow down the tree, box properties don't.
 * The learner deduplicates a sheet by moving typography to the ancestor —
 * three rules become one.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	T.lesson({
		id: 'inheritance',
		title: 'Inheritance',
		nav: 'inheritance',
		category: 'Foundations',

		prose: [
			'<h2>Inheritance</h2>' +
			'<p>If every element needed every property declared, stylesheets would ' +
			'be unwritable. Instead, when no rule supplies a value, many properties ' +
			'<strong>inherit</strong> from the parent element — the value flows down ' +
			'the document tree until someone overrides it.</p>' +
			'<p>What inherits follows one intuition: <strong>text properties flow, ' +
			'box properties don\'t.</strong></p>' +
			'<ul>' +
			'<li><em>Inherited:</em> <code>color</code>, <code>font-family</code>, ' +
			'<code>font-size</code>, <code>line-height</code>, ' +
			'<code>text-align</code>, <code>list-style</code>…</li>' +
			'<li><em>Not inherited:</em> <code>margin</code>, <code>padding</code>, ' +
			'<code>border</code>, <code>background</code>, <code>width</code>, ' +
			'<code>display</code>…</li>' +
			'</ul>' +
			'<p>Imagine borders inheriting: one border on <code>body</code> and ' +
			'every paragraph, span and list item grows its own box. The split is ' +
			'exactly "what makes sense to cascade through prose" versus "what ' +
			'belongs to one specific box".</p>' +
			'<p>The practical consequence: <strong>set typography once, high in the ' +
			'tree.</strong> The sheet below hasn\'t learned that yet — three rules ' +
			'repeat the same font and color:</p>',
			{ lang: 'css', code: '// before: the same two declarations, three times\nh1\n\tfont-family Georgia, serif\n\tcolor #333\np\n\tfont-family Georgia, serif\n\tcolor #333\n...' },
			'<h3>Your job</h3>' +
			'<p>Declare <code>font-family Georgia, serif</code> and <code>color ' +
			'#333</code> once, on <code>body</code>, and delete the repeats — ' +
			'inheritance will deliver both to every heading, paragraph and quote. ' +
			'Keep the blockquote\'s <code>border-left</code> where it is: borders ' +
			'don\'t inherit, and that one really is the blockquote\'s own.</p>' +
			'<div class="tip">When you DO want a non-inherited property passed ' +
			'down, the value <code>inherit</code> requests it explicitly — ' +
			'<code>border-color: inherit</code> is opt-in inheritance for one ' +
			'property.</div>',
		],

		task: 'Move font-family and color to a single body rule; the check insists each appears exactly once.',

		starter: T.program([
			'h1',
			'	font-family Georgia, serif',
			'	color #333',
			'',
			'p',
			'	font-family Georgia, serif',
			'	color #333',
			'',
			'blockquote',
			'	font-family Georgia, serif',
			'	color #333',
			'	border-left 3px solid #ccc',
		]),

		check: function (stdout, flat) {
			return flat.indexOf('body {') !== -1 &&
				(stdout.match(/font-family: Georgia, serif;/g) || []).length === 1 &&
				(stdout.match(/color: #333;/g) || []).length === 1 &&
				flat.indexOf('border-left: 3px solid #ccc;') !== -1;
		},

		solution: T.program([
			'// typography declared once — inheritance carries it to every',
			'// descendant that doesn\'t say otherwise',
			'body',
			'	font-family Georgia, serif',
			'	color #333',
			'',
			'// border-left stays: box properties don\'t inherit, and this one',
			'// belongs to the blockquote alone',
			'blockquote',
			'	border-left 3px solid #ccc',
		]),
	});
})();
