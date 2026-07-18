/* Lists — ul vs ol (start/reversed), li as the only legal child, NESTING
 * a sub-list inside the parent li (not between li's — the classic mistake
 * the outline makes visible), and dl/dt/dd for term-description pairs.
 * The exercise turns a flat ul of steps into an ol whose second step
 * contains a nested ul, plus a dl; the check pins the ol>li shape, the
 * ul indented INSIDE step two (unreachable by sibling placement or the
 * flat starter), the dl>dt/dd lines, and the absence of any top-level ul.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'lists',
		title: 'Lists',
		nav: 'lists',
		category: 'Foundations',

		prose: [
			'<h2>Two kinds of list</h2>' +
			'<p>HTML has two general-purpose list elements, and the choice ' +
			'between them is semantic, not visual: <code>&lt;ul&gt;</code> is an ' +
			'<em>unordered</em> list — the items are a set, and shuffling them ' +
			'changes nothing (ingredients, navigation links). ' +
			'<code>&lt;ol&gt;</code> is an <em>ordered</em> list — the sequence ' +
			'carries meaning (steps of a recipe, a ranking). Browsers render ' +
			'bullets for one and numbers for the other, but that is only a ' +
			'default you can restyle later; the tag records the ' +
			'<em>intent</em>.</p>' +
			'<p>Both allow exactly one kind of child: <code>&lt;li&gt;</code>, ' +
			'the list item. Everything you want in the list — text, links, ' +
			'paragraphs, even other lists — goes <em>inside</em> an ' +
			'<code>&lt;li&gt;</code>, never directly between them.</p>',
			{ lang: 'html', code: '<ol start="3" reversed>\n  <li>bronze</li>\n  <li>silver</li>\n  <li>gold</li>\n</ol>' },
			'<p><code>&lt;ol&gt;</code> takes two attributes worth knowing: ' +
			'<code>start</code> sets the first number (the list above counts ' +
			'from 3), and the boolean <code>reversed</code> counts downward — ' +
			'handy for a top-ten that ends at #1. Notice how ' +
			'<code>reversed</code> would appear in the structure outline as a ' +
			'bare name with no value: that is what a boolean attribute looks ' +
			'like.</p>',

			'<h2>Nesting: the sub-list lives inside the item</h2>' +
			'<p>A sub-list belongs to one particular item, so it goes ' +
			'<em>inside</em> that item&#39;s <code>&lt;li&gt;</code>, before its ' +
			'closing tag. The classic mistake is closing the ' +
			'<code>&lt;li&gt;</code> first and dropping the sub-list between two ' +
			'items:</p>',
			{ lang: 'html', code: '<!-- WRONG: the ul is a sibling of the li\'s -->\n<ol>\n  <li>Steep the tea</li>\n  <ul>\n    <li>Green: 2 minutes</li>\n  </ul>\n</ol>\n\n<!-- RIGHT: the ul is a child of the li it details -->\n<ol>\n  <li>Steep the tea\n    <ul>\n      <li>Green: 2 minutes</li>\n    </ul>\n  </li>\n</ol>' },
			'<p>A browser renders both without complaint, and the bullets even ' +
			'<em>look</em> similar — which is exactly why the mistake survives ' +
			'in so much real markup. The structure outline betrays it ' +
			'instantly: in the wrong version the <code>ul</code> sits at the ' +
			'same depth as the <code>li</code> lines, a sibling that belongs to ' +
			'no step; in the right version it is indented one level deeper, ' +
			'inside the item it details. When the nesting is correct, the ' +
			'outline reads like the meaning.</p>',

			'<h2>Description lists</h2>' +
			'<p>The third list element handles term–description pairs: ' +
			'<code>&lt;dl&gt;</code> (description list) wraps alternating ' +
			'<code>&lt;dt&gt;</code> (term) and <code>&lt;dd&gt;</code> ' +
			'(description) children. Glossaries, FAQ entries, metadata like ' +
			'<em>Author: Ada</em> — anywhere the content is naturally ' +
			'<em>name → explanation</em>, a <code>dl</code> says so better than ' +
			'a bold word and a paragraph:</p>',
			{ lang: 'html', code: '<dl>\n  <dt>Oolong</dt>\n  <dd>Partially oxidized leaves.</dd>\n</dl>' },
			'<p>Elsewhere in go-learn, the <em>TypeScript + Go Web</em> track ' +
			'generates exactly this markup from Go with the element library — ' +
			'lists are the canonical loop-generated markup, one ' +
			'<code>li</code> per slice element:</p>',
			{ lang: 'go', code: 'steps := []string{"Boil water", "Steep the tea"}\nb := element.NewBuilder()\nb.Ol().R(\n\telement.ForEach(steps, func(step string) {\n\t\tb.Li().T(step)\n\t}),\n)\nhtml := b.String()' },

			'<h3>Your job</h3>' +
			'<p>The starter is a flat <code>&lt;ul&gt;</code> of brewing steps. ' +
			'Rebuild it as real structure: an <code>&lt;ol&gt;</code> of two ' +
			'steps — <code>Boil water</code>, then <code>Steep the tea</code> — ' +
			'where step two contains a nested <code>&lt;ul&gt;</code> of two ' +
			'sub-points, <code>Green: 2 minutes</code> and ' +
			'<code>Black: 4 minutes</code>, placed inside the ' +
			'<code>&lt;li&gt;</code> before its closing tag. Then add a ' +
			'<code>&lt;dl&gt;</code> with two term/description pairs of your ' +
			'choosing. Remove the TODO comments when you are done.</p>' +
			'<div class="tip">Read the outline after each run: the nested ' +
			'<code>ul</code> must appear one level deeper than the ' +
			'<code>li</code> lines, right under the <code>"Steep the tea"</code> ' +
			'text. If it lines up with the <code>li</code>&#39;s instead, you ' +
			'closed the item too early.</div>',
		],

		task: 'Turn the flat ul into an ol whose second step nests a ul of two sub-points, then add a dl with two term/description pairs.',

		starter: [
			'<h2>Brewing tea</h2>',
			'',
			'<!-- TODO 1: make this an OL of two steps: "Boil water" then "Steep the tea" -->',
			'<!-- TODO 2: INSIDE the second li (before its closing tag), nest a UL',
			'     with two sub-points: "Green: 2 minutes" and "Black: 4 minutes" -->',
			'<ul>',
			'  <li>Do the tea things</li>',
			'  <li>Timing depends on the tea</li>',
			'</ul>',
			'',
			'<!-- TODO 3: add a DL with two dt/dd term-description pairs -->',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('ol\n  li\n    "Boil water"') &&
				stdout.includes('"Steep the tea"\n    ul\n      li\n') &&
				stdout.includes('dl\n  dt\n') &&
				stdout.includes('  dd\n') &&
				!/(^|\n)ul\n/.test(stdout);
		},

		solution: [
			'<h2>Brewing tea</h2>',
			'',
			'<!-- ol: the sequence matters, so the tag says so.',
			'     The sub-list details step two, so it lives INSIDE that li,',
			'     before its closing tag — never between two li\'s. -->',
			'<ol>',
			'  <li>Boil water</li>',
			'  <li>Steep the tea',
			'    <ul>',
			'      <li>Green: 2 minutes</li>',
			'      <li>Black: 4 minutes</li>',
			'    </ul>',
			'  </li>',
			'</ol>',
			'',
			'<!-- dl: term/description pairs. dt names, dd explains. -->',
			'<dl>',
			'  <dt>Oolong</dt>',
			'  <dd>Partially oxidized leaves.</dd>',
			'  <dt>Matcha</dt>',
			'  <dd>Stone-ground green tea powder.</dd>',
			'</dl>',
			'',
		].join('\n'),
	});
})();
