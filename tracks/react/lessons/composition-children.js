/* composition-children — props.children is just a prop, and layout
 * components should not know their contents. Pedagogy: the starter's Card
 * takes title/body/footer as STRING props only — you cannot nest markup, so
 * you are re-inventing HTML with worse ergonomics (prose names the smell and
 * snippets the prop-per-variant explosion it grows into). The solution is
 * Card({ title, children }) rendering <section class="card"> with an <h3>
 * and the children; App nests a real <ul> in one Card and an <em> in
 * another. The check pins two section class="card" shells, the ul/em
 * indented INSIDE a card (unreachable with string props), and both titles
 * in document order.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'composition-children',
		title: 'Composition & children',
		nav: 'children',
		category: 'Patterns',

		prose: [
			'<h2>children is just a prop</h2>' +
			'<p>Everything you nest between a component&#39;s opening and ' +
			'closing tags arrives as <code>props.children</code>. There is no ' +
			'slot API, no template directive — <code>children</code> is a prop ' +
			'like any other, filled by JSX syntax instead of an ' +
			'<code>attr={…}</code>. That one convention is what makes ' +
			'<strong>layout components</strong> possible: a <code>Card</code>, a ' +
			'<code>Modal</code> shell, a <code>Sidebar</code> that renders its ' +
			'frame and drops <code>{children}</code> in the hole, knowing ' +
			'<em>nothing</em> about what fills it.</p>',
			{ lang: 'js', code: 'function Modal({ children }) {\n\treturn <div className="overlay"><div className="modal">{children}</div></div>;\n}\n\n// Caller decides the contents — a form, a warning, an image:\n<Modal><form>…</form></Modal>' },
			'<p>Compare the road you go down without it. A container that takes ' +
			'its contents as configuration grows a prop per variation — the ' +
			'<strong>prop-per-variant explosion</strong>:</p>',
			{ lang: 'js', code: '// The smell: every new content shape needs a new prop and a\n// new if-branch INSIDE Card. Card must know everything forever.\n<Card\n\ttitle="Groceries"\n\tbody="milk, bread"\n\tbodyIsList={true}\n\tlistItems={[\'milk\', \'bread\']}\n\tfooterText="2 items"\n\tfooterHasLink={false}\n/>' },
			'<p>Composition inverts that: <code>Card</code> owns the frame ' +
			'(section, heading, styling hooks) and the <em>caller</em> owns the ' +
			'contents, written as ordinary markup. Need two holes? ' +
			'<code>children</code> fills the main one, and additional ' +
			'<strong>named slots</strong> are just element-valued props: ' +
			'<code>&lt;Card header={&lt;img … /&gt;}&gt;…&lt;/Card&gt;</code> — ' +
			'remember from the JSX lessons that an element is a plain value, so ' +
			'it passes through props like any string or number. Prefer ' +
			'<em>composition over configuration</em>: reach for a boolean or ' +
			'string prop only when the component genuinely must behave ' +
			'differently, not merely display different markup.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter&#39;s <code>Card</code> accepts only strings — its ' +
			'body cannot hold a list, a link, or emphasis. Rewrite it as ' +
			'<code>Card({ title, children })</code> rendering a ' +
			'<code>&lt;section className="card"&gt;</code> with an ' +
			'<code>&lt;h3&gt;{title}&lt;/h3&gt;</code> followed by ' +
			'<code>{children}</code>. Then render <em>two</em> Cards from ' +
			'<code>App</code>: <code>Groceries</code> containing a real ' +
			'<code>&lt;ul&gt;</code> with <code>milk</code> and ' +
			'<code>bread</code> items, and <code>Motto</code> containing a ' +
			'<code>&lt;p&gt;</code> with an <code>&lt;em&gt;</code> inside it ' +
			'(e.g. Ship <em>small</em> pieces).</p>' +
			'<div class="tip">Read the outline&#39;s indentation: the ' +
			'<code>ul</code> must sit one level inside its ' +
			'<code>section class="card"</code>, sibling to the <code>h3</code>. ' +
			'That nesting is the whole point — string props could never put it ' +
			'there.</div>',
		],

		task: 'Rewrite Card to take {title, children}; render two Cards nesting a real ul and an em.',

		starter: [
			'// Card can only hold STRINGS. Want a list in the body? A link in the',
			'// footer? Too bad — you would need bodyIsList, listItems,',
			'// footerHasLink... a prop per variant, an if per prop. You are',
			'// re-inventing HTML with worse ergonomics.',
			'// TODO: Card({ title, children }) — <section className="card"> with',
			'// an <h3>, then {children}. Let App write real markup inside.',
			'function Card(props) {',
			'\treturn (',
			'\t\t<section className="card">',
			'\t\t\t<h3>{props.title}</h3>',
			'\t\t\t<p>{props.body}</p>',
			'\t\t\t<small>{props.footer}</small>',
			'\t\t</section>',
			'\t);',
			'}',
			'',
			'function App() {',
			'\treturn (',
			'\t\t<main>',
			'\t\t\t<Card',
			'\t\t\t\ttitle="Groceries"',
			'\t\t\t\tbody="milk, bread (a real list would be nicer)"',
			'\t\t\t\tfooter="2 items"',
			'\t\t\t/>',
			'\t\t</main>',
			'\t);',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// Two card shells; the ul indented INSIDE the first card (sibling
			// of its h3); an em nested inside a p in a card; titles in order.
			return (stdout.split('section class="card"').length - 1) === 2 &&
				stdout.includes('  section class="card"\n    h3\n      "Groceries"\n    ul\n      li\n        "milk"') &&
				stdout.includes('      li\n        "bread"') &&
				stdout.includes('    p\n      "Ship"\n      em\n        "small"') &&
				flat.indexOf('Groceries') !== -1 &&
				flat.indexOf('Groceries') < flat.indexOf('Motto') &&
				!flat.includes('warn:');
		},

		solution: [
			'// Card owns the FRAME: the section, the class, the heading. It has',
			'// no idea what it contains — children is a hole the caller fills',
			'// with arbitrary markup. One prop replaced body, footer, and every',
			'// bodyIsList-style flag that would have followed.',
			'function Card({ title, children }) {',
			'\treturn (',
			'\t\t<section className="card">',
			'\t\t\t<h3>{title}</h3>',
			'\t\t\t{children}',
			'\t\t</section>',
			'\t);',
			'}',
			'',
			'function App() {',
			'\t// The caller composes real markup inside each Card — a list in',
			'\t// one, emphasized text in the other. Card required zero changes',
			'\t// to support either, and will require zero for the next shape.',
			'\treturn (',
			'\t\t<main>',
			'\t\t\t<Card title="Groceries">',
			'\t\t\t\t<ul>',
			'\t\t\t\t\t<li>milk</li>',
			'\t\t\t\t\t<li>bread</li>',
			'\t\t\t\t</ul>',
			'\t\t\t</Card>',
			'\t\t\t<Card title="Motto">',
			'\t\t\t\t<p>Ship <em>small</em> pieces.</p>',
			'\t\t\t</Card>',
			'\t\t</main>',
			'\t);',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<p><code>Card</code> destructures exactly two props: ' +
			'<code>title</code> (still configuration — a heading is genuinely ' +
			'part of the frame) and <code>children</code>, which JSX filled with ' +
			'everything between <code>&lt;Card …&gt;</code> and ' +
			'<code>&lt;/Card&gt;</code>. Rendering it is just ' +
			'<code>{children}</code> — an element is a value, so it drops into ' +
			'the tree like any expression.</p>',
			'<p>The outline proves the inversion: both ' +
			'<code>section class="card"</code> lines sit at the same depth, and ' +
			'under the first one the <code>ul</code> is indented <em>inside</em> ' +
			'the section, sibling to the <code>h3</code> — markup the string-prop ' +
			'version had no way to produce. The second card holds a completely ' +
			'different shape (<code>p</code> wrapping an <code>em</code>) with ' +
			'the same <code>Card</code> code.</p>',
			'<p>When you need more than one hole, pass elements through named ' +
			'props — <code>header={&lt;Logo /&gt;}</code>, ' +
			'<code>footer={&lt;a …&gt;}</code> — and keep <code>children</code> ' +
			'for the main content. The rule of thumb: props describe ' +
			'<em>behavior</em> the component must switch on; children and ' +
			'element props carry <em>markup</em> the component should not need ' +
			'to understand.</p>',
		],
	});
})();
