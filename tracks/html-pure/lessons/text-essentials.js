/* Text Essentials — headings as outline levels (not font sizes), paragraphs,
 * semantic strong/em versus presentational b/i, the void elements br and hr,
 * and blockquote (with cite) plus small. The exercise converts a flat draft
 * that leans on <b>/<i>: promote a paragraph to an h2, upgrade b/i to
 * strong/em, and add an hr before a cited blockquote. The check pins the h2
 * with its exact text, strong and em with their text children, a
 * whole-line hr, the blockquote with its cite attribute wrapping the quote
 * paragraph, hr-before-blockquote order, and the ABSENCE of bare b/i lines
 * (whole-line regex so tag names cannot false-match inside text).
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'text-essentials',
		title: 'Text Essentials',
		nav: 'text essentials',
		category: 'Foundations',

		prose: [
			'<h2>Headings are an outline, not font sizes</h2>' +
			'<p><code>&lt;h1&gt;</code> through <code>&lt;h6&gt;</code> look ' +
			'like six sizes of bold text, and that framing ruins documents. ' +
			'They are <em>outline levels</em>: <code>h1</code> is the title ' +
			'of the whole page (one per page), <code>h2</code> starts a major ' +
			'section, <code>h3</code> a subsection of the <code>h2</code> ' +
			'above it — and you never skip levels, for the same reason a book ' +
			'has no chapter 2.4.1 without a 2.4. Screen-reader users navigate ' +
			'by jumping heading to heading; a document whose headings were ' +
			'chosen for their size hands them a scrambled table of ' +
			'contents. If a heading looks too big, restyle it — never reach ' +
			'for a smaller heading number.</p>' +
			'<p>Between the headings, <code>&lt;p&gt;</code> holds each ' +
			'paragraph of running text. One thought, one paragraph — the ' +
			'browser adds the vertical breathing room, so you never add empty ' +
			'elements just to push things apart.</p>',

			'<h2>Meaning versus looks</h2>' +
			'<p>HTML has two pairs that render almost identically and mean ' +
			'entirely different things. <code>&lt;b&gt;</code> and ' +
			'<code>&lt;i&gt;</code> are <em>presentational</em>: bold face, ' +
			'italic face, nothing more. <code>&lt;strong&gt;</code> and ' +
			'<code>&lt;em&gt;</code> are <em>semantic</em>: this text is ' +
			'important; this word carries spoken stress. The difference ' +
			'surfaces the moment anything other than a default browser reads ' +
			'your page: a screen reader can change tone for ' +
			'<code>strong</code> and <code>em</code>, and when a stylesheet ' +
			'later restyles emphasis (many designs render <code>em</code> as ' +
			'colored, not italic), the <em>meaning</em> survives because you ' +
			'marked meaning, not typography:</p>',
			{ lang: 'html', code: '<p>You <b>must</b> back up first.</p>       <!-- says: make this bold -->\n<p>You <strong>must</strong> back up first.</p>  <!-- says: this is a warning -->' },

			'<h2>Breaks: &lt;br&gt; and &lt;hr&gt;</h2>' +
			'<p><code>&lt;br&gt;</code> is your first <em>void element</em>: ' +
			'it has no content and no closing tag — the tag is the whole ' +
			'element. It is a real line break <em>inside</em> content, for ' +
			'text where the break carries meaning — the lines of a poem, the ' +
			'lines of a postal address:</p>',
			{ lang: 'html', code: '<p>Ada Lovelace<br>\n12 St James Square<br>\nLondon</p>' },
			'<p>It is not a spacing tool: stacking <code>&lt;br&gt;</code> ' +
			'elements to push content down is styling smuggled into ' +
			'structure, and it breaks the moment fonts or widths change. ' +
			'<code>&lt;hr&gt;</code> — also void — is a <em>thematic ' +
			'break</em>: the scene change between paragraphs, the shift to a ' +
			'closing quote. It draws a rule by default, but its meaning is ' +
			'the break, not the line.</p>',

			'<h2>Quoting and fine print</h2>' +
			'<p><code>&lt;blockquote&gt;</code> marks content quoted from ' +
			'somewhere else, and its <code>cite</code> attribute records the ' +
			'source URL. Browsers do not display <code>cite</code> — it is ' +
			'machine-readable provenance, and you will see it survive in the ' +
			'outline pane even though the preview never shows it. ' +
			'<code>&lt;small&gt;</code> is for fine print — copyright lines, ' +
			'disclaimers — small in importance, not merely in pixels:</p>',
			{ lang: 'html', code: '<blockquote cite="https://example.com">\n  <p>Simplicity is prerequisite for reliability.</p>\n</blockquote>\n<p><small>Quoted under fair use.</small></p>' },

			'<h3>Your job</h3>' +
			'<p>The starter is a flat draft that fakes its structure: a ' +
			'subheading typed as a paragraph, importance typed as ' +
			'<code>&lt;b&gt;</code>, stress typed as <code>&lt;i&gt;</code>, ' +
			'and a quotation floating as plain text. Convert it: make ' +
			'<code>Closing tags</code> an <code>&lt;h2&gt;</code>, replace ' +
			'<code>&lt;b&gt;</code> with <code>&lt;strong&gt;</code> and ' +
			'<code>&lt;i&gt;</code> with <code>&lt;em&gt;</code>, then add an ' +
			'<code>&lt;hr&gt;</code> followed by a ' +
			'<code>&lt;blockquote cite="https://example.com"&gt;</code> ' +
			'around the quote. The check also verifies the <code>b</code> and ' +
			'<code>i</code> tags are <em>gone</em>.</p>' +
			'<div class="tip"><code>&lt;hr&gt;</code> is void — write it as ' +
			'<code>&lt;hr&gt;</code> alone. If you type ' +
			'<code>&lt;/hr&gt;</code>, the strict validator rejects the ' +
			'document: a closing tag on a void element is an error, not a ' +
			'style choice.</div>',
		],

		task: 'Promote the subheading to h2, swap b/i for strong/em, and add an hr before a blockquote citing https://example.com.',

		starter: [
			'<h1>Field Notes</h1>',
			'',
			'<!-- TODO 1: the line below is a subheading under Field Notes,',
			'     not a paragraph - turn it into an <h2> -->',
			'<p>Closing tags</p>',
			'',
			'<!-- TODO 2: real emphasis, not decoration: swap <b> for <strong>',
			'     and <i> for <em> -->',
			'<p>You <b>must</b> close every tag <i>yourself</i>.</p>',
			'',
			'<!-- TODO 3: add an <hr> here, then wrap the quote below in',
			'     <blockquote cite="https://example.com"> -->',
			'<p>Talk is cheap. Show me the code.</p>',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('h2\n  "Closing tags"') &&
				stdout.includes('strong\n    "must"') &&
				stdout.includes('em\n    "yourself"') &&
				/(^|\n)hr\n/.test(stdout) &&
				stdout.includes('blockquote cite="https://example.com"\n  p\n    "Talk is cheap. Show me the code."') &&
				!/(^|\n) *b\n/.test(stdout) &&
				!/(^|\n) *i\n/.test(stdout) &&
				flat.indexOf(' hr ') !== -1 &&
				flat.indexOf(' hr ') < flat.indexOf('blockquote');
		},

		solution: [
			'<h1>Field Notes</h1>',
			'',
			'<h2>Closing tags</h2>',
			'',
			'<p>You <strong>must</strong> close every tag <em>yourself</em>.</p>',
			'',
			'<hr>',
			'',
			'<blockquote cite="https://example.com">',
			'  <p>Talk is cheap. Show me the code.</p>',
			'</blockquote>',
			'',
		].join('\n'),
	});
})();
