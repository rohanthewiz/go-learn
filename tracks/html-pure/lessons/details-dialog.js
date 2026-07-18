/* Details & Dialog — interactivity that ships inside the parser:
 * details/summary disclosure with zero JS, the open attribute as live
 * state, name for exclusive accordions, and dialog's honest JS boundary.
 * Exercise converts an h3+p FAQ into two details blocks (first one open)
 * plus an open dialog; the check pins the exact details-open and
 * details-closed nesting shapes, both summary texts at summary depth,
 * the dialog's p text, and the absence of any h3 line — so only a real
 * conversion passes.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'details-dialog',
		title: 'Details & Dialog',
		nav: 'details and dialog',
		category: 'Rich Content',

		prose: [
			'<h2>Interactivity without JavaScript</h2>' +
			'<p>Most page behavior is scripted &mdash; but a few widgets ship ' +
			'<em>inside the parser</em>. <code>&lt;details&gt;</code> is the ' +
			'best of them: a disclosure widget with zero JS. Its first ' +
			'<code>&lt;summary&gt;</code> child is the always-visible heading ' +
			'(with a built-in toggle triangle); everything else inside the ' +
			'element hides and shows when the summary is clicked:</p>',
			{ lang: 'html', code: '<details>\n  <summary>Shipping and returns</summary>\n  <p>Orders ship in two days. Returns are free for thirty.</p>\n</details>' },
			'<h2>The open attribute is the state</h2>' +
			'<p>A closed <code>details</code> has no <code>open</code> ' +
			'attribute; an expanded one carries the bare boolean ' +
			'<code>open</code>. That is not a metaphor &mdash; the browser ' +
			'literally adds and removes the attribute as the user clicks, so ' +
			'the document itself records the widget&rsquo;s state. Write ' +
			'<code>open</code> in your source and the section starts ' +
			'expanded. And unlike most lessons in this track, the preview pane ' +
			'here is genuinely alive: when your page renders, <em>click the ' +
			'summaries</em> and watch the sections fold.</p>',
			'<h2>FAQs: stacked details</h2>' +
			'<p>A run of question-and-answer pairs is the classic use: each ' +
			'question becomes a <code>summary</code>, each answer stays as the ' +
			'hidden content, and readers expand only what they care about. ' +
			'Newer browsers add one more trick: give sibling ' +
			'<code>details</code> elements the same <code>name</code> ' +
			'attribute and they become an <em>exclusive accordion</em> &mdash; ' +
			'opening one closes the others, like radio buttons. It is a recent ' +
			'addition (Chrome 120, Firefox 130, Safari 17.2, all 2023&ndash;24), ' +
			'so older browsers simply ignore it and allow multiple open &mdash; ' +
			'a harmless fallback.</p>',
			{ lang: 'html', code: '<details name="faq" open> ... </details>\n<details name="faq"> ... </details>  <!-- opening this closes the first -->' },
			'<h2>dialog: honest about the boundary</h2>' +
			'<p><code>&lt;dialog&gt;</code> is a box for a conversation with ' +
			'the user &mdash; a notice, a confirmation, a form. Without the ' +
			'<code>open</code> attribute it does not render at all; with it, ' +
			'it appears as a centered card. But here HTML alone hits its ' +
			'limit: <em>summoning</em> a dialog on demand &mdash; especially ' +
			'modally, with the page behind it inert &mdash; requires the ' +
			'JavaScript methods <code>showModal()</code> and ' +
			'<code>close()</code>. So an HTML-only <code>dialog open</code> is ' +
			'for states that are simply <em>true when the page loads</em>: a ' +
			'server-rendered &ldquo;saved&rdquo; notice, a maintenance banner. ' +
			'Knowing exactly where the markup ends and the script begins is ' +
			'part of knowing HTML.</p>',
			'<h3>Your job</h3>' +
			'<p>The starter is an FAQ written as flat <code>h3</code> + ' +
			'<code>p</code> pairs &mdash; every answer permanently visible. ' +
			'Convert each pair into a <code>details</code> block: the question ' +
			'moves into a <code>summary</code>, the answer paragraph stays ' +
			'inside, and no <code>h3</code> survives. Give the <em>first</em> ' +
			'details the <code>open</code> attribute; leave the second closed. ' +
			'Then add a <code>&lt;dialog open&gt;</code> holding a short ' +
			'<code>&lt;p&gt;Draft saved.&lt;/p&gt;</code> notice. Run it, then ' +
			'go click your FAQ in the preview.</p>' +
			'<div class="tip"><code>summary</code> must be a <em>direct ' +
			'child</em> of <code>details</code>, and only the first one counts ' +
			'as the heading &mdash; wrap it in a <code>div</code> and the ' +
			'browser shows a default &ldquo;Details&rdquo; label instead.</div>',
		],

		task: 'Convert the h3+p FAQ into two details blocks (first one open) and add an open dialog notice.',

		starter: [
			'<h2>FAQ</h2>',
			'',
			'<!-- TODO 1: wrap each pair in a disclosure block: the question text',
			'     becomes the always-visible child, the answer stays inside -->',
			'<!-- TODO 2: the FIRST block starts expanded; the second stays closed -->',
			'<h3>Is HTML a programming language?</h3>',
			'<p>No: it is a markup language, describing structure rather than behavior.</p>',
			'',
			'<h3>Do I need JavaScript for a disclosure widget?</h3>',
			'<p>No. The browser toggles it natively; the document records the state.</p>',
			'',
			'<!-- TODO 3: a dialog, rendered via its state attribute, holding',
			'     a short paragraph: Draft saved. -->',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('details open\n  summary\n    "Is HTML a programming language?"') &&
				// second block: details with NO open attribute
				stdout.includes('details\n  summary\n    "Do I need JavaScript for a disclosure widget?"') &&
				stdout.includes('dialog open\n  p\n    "Draft saved."') &&
				// the flat h3 headings must not survive the conversion
				stdout.indexOf('h3\n') === -1;
		},

		solution: [
			'<h2>FAQ</h2>',
			'',
			'<!-- summary is the visible heading; the p toggles with it.',
			'     open = expanded on load, and the browser updates it live. -->',
			'<details open>',
			'  <summary>Is HTML a programming language?</summary>',
			'  <p>No: it is a markup language, describing structure rather than behavior.</p>',
			'</details>',
			'',
			'<details>',
			'  <summary>Do I need JavaScript for a disclosure widget?</summary>',
			'  <p>No. The browser toggles it natively; the document records the state.</p>',
			'</details>',
			'',
			'<!-- open makes the dialog render; summoning it modally needs JS -->',
			'<dialog open>',
			'  <p>Draft saved.</p>',
			'</dialog>',
			'',
		].join('\n'),
	});
})();
