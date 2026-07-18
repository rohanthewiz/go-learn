/* Hello, HTML — HTML as a document tree (not a program), the anatomy of an
 * element (opening tag, content, closing tag, attributes, nesting), and how
 * this track's two output panes work: forgiving browser preview above,
 * strict validator outline below — the outline IS the tree. The exercise
 * adds an h1 above a lone paragraph and wraps one word in em; the check
 * pins the h1 with its exact text child, an em indented under the p (a
 * nesting the starter has no way to produce), and h1-before-p order.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'hello-html',
		title: 'Hello, HTML',
		nav: 'hello, html',
		category: 'Foundations',

		prose: [
			'<h2>A document, not a program</h2>' +
			'<p>HTML is not a programming language, and that is not a putdown ' +
			'— it is the whole design. Nothing in an HTML file ' +
			'<em>executes</em>: no variables, no loops, no order of ' +
			'operations. An HTML file is a <em>description of structure</em>: ' +
			'this is a heading, this paragraph sits below it, these two words ' +
			'carry emphasis. The browser reads that description and builds a ' +
			'<strong>tree</strong> — every element becomes a node, every node ' +
			'lives inside exactly one parent, and everything you will ever do ' +
			'to a web page (style it, script it, read it aloud) walks that ' +
			'tree.</p>',

			'<h2>Anatomy of an element</h2>',
			{ lang: 'html', code: '<p class="intro">Hello there</p>' },
			'<p>Three parts. The <em>opening tag</em> ' +
			'<code>&lt;p class="intro"&gt;</code> names the element and may ' +
			'carry <em>attributes</em> — <code>name="value"</code> pairs that ' +
			'annotate the element without appearing in its content; always ' +
			'quote the value. The <em>content</em> sits between the tags: ' +
			'text, other elements, or both. The <em>closing tag</em> ' +
			'<code>&lt;/p&gt;</code> is the same name with a slash, and never ' +
			'carries attributes.</p>' +
			'<p>Elements <em>nest</em>, and nesting must be strict: whatever ' +
			'opened last must close first, like matched parentheses. Overlap ' +
			'is not a style choice — it makes the tree ambiguous:</p>',
			{ lang: 'html', code: '<p>one <em>word</em> emphasized</p>  <!-- em fully inside p: a clean tree -->\n<p>one <em>word</p></em>             <!-- overlap: who owns "word"? rejected here -->' },

			'<h2>Two panes, two personalities</h2>' +
			'<p>When you run your markup in this track, two things happen. ' +
			'The top pane is a real browser preview — and browsers are ' +
			'famously <em>forgiving</em>: forget a closing tag and the ' +
			'browser silently guesses what you meant and renders something ' +
			'anyway. Handy for readers, terrible for learning, because your ' +
			'mistakes render as if they were fine. The bottom pane is the ' +
			'opposite personality: a <strong>strict validator</strong> that ' +
			'either rejects your document with a line number, or prints a ' +
			'canonical <em>structure outline</em> of it.</p>' +
			'<p>The outline is not a log — it <strong>is the tree</strong>. ' +
			'One node per line, each child indented two spaces under its ' +
			'parent, text in quotes:</p>',
			{ lang: 'html', code: '<h1>Hi</h1>\n<p>plain <em>fancy</em></p>' },
			{ lang: 'html', code: 'h1\n  "Hi"\np\n  "plain"\n  em\n    "fancy"' },
			'<p>Learn to read that shape now: <code>em</code> sits two spaces ' +
			'under <code>p</code>, so it is a child of the paragraph; ' +
			'<code>"fancy"</code> sits under <code>em</code>, so the emphasis ' +
			'owns exactly that text. Every check in this track reads the ' +
			'outline — when your structure is right, the indentation proves ' +
			'it.</p>',

			'<p>One thing to file away before you start: every line of markup ' +
			'in this track is written by hand. Elsewhere in go-learn, the ' +
			'<em>TypeScript + Go Web</em> track generates exactly this markup ' +
			'from Go with the element library — hand-written here, generated ' +
			'from Go there. Recognize the shape:</p>',
			{ lang: 'go', code: 'b := element.NewBuilder()\nb.H1().T("Hello, web!")\nb.P().R(\n\tb.T("This page is written by "),\n\tb.Em().T("hand"),\n\tb.T(" in plain HTML."),\n)\nhtml := b.String()' },

			'<h3>Your job</h3>' +
			'<p>The starter is a single paragraph. Add an ' +
			'<code>&lt;h1&gt;</code> above it with the exact text ' +
			'<code>Hello, web!</code>, then wrap the word <code>hand</code> ' +
			'inside the paragraph in <code>&lt;em&gt;</code>. Delete each ' +
			'TODO comment as you finish it, then read the outline: the ' +
			'<code>em</code> should appear indented under the <code>p</code>, ' +
			'with <code>"hand"</code> indented under the <code>em</code>.</p>' +
			'<div class="tip">If your <code>em</code> shows up at the left ' +
			'margin of the outline instead of two spaces under the ' +
			'<code>p</code>, you placed it outside the paragraph — the ' +
			'indentation is the nesting.</div>',
		],

		task: 'Add an h1 reading Hello, web! above the paragraph, and wrap the word hand in an em element.',

		starter: [
			'<!-- TODO 1: add an <h1> above the paragraph with the exact text: Hello, web! -->',
			'<!-- TODO 2: wrap the word hand below in <em> tags -->',
			'<p>This page is written by hand in plain HTML.</p>',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('h1\n  "Hello, web!"') &&
				stdout.includes('  em\n    "') &&
				flat.indexOf('h1 "Hello, web!"') !== -1 &&
				flat.indexOf('h1 "Hello, web!"') < flat.indexOf(' p ');
		},

		solution: [
			'<h1>Hello, web!</h1>',
			'<p>This page is written by <em>hand</em> in plain HTML.</p>',
			'',
		].join('\n'),
	});
})();
