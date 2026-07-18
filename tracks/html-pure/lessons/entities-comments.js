/* Entities & Comments — five characters belong to HTML's own syntax, so
 * showing them as text means escaping (&amp; &lt; &gt; &quot; &apos;); the
 * starter deliberately fails with the validator's bare-"&" error so the red
 * pane is the opening beat, contrasted with the preview that renders the
 * broken markup anyway. Also: typographic entities, &nbsp; as a real
 * non-collapsing character, numeric references, typo'd entities as errors,
 * and comments (outline "#" lines; not a hiding mechanism). The check pins
 * DECODED text ("Fish & Chips", "3 < 5") plus an em dash, a copyright sign,
 * and a non-TODO comment line — none reachable without correct entities.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'entities-comments',
		title: 'Entities & Comments',
		nav: 'entities & comments',
		category: 'Structure & Semantics',
		starterError: true,

		prose: [
			'<h2>Run it first — read the red pane</h2>' +
			'<p>This lesson opens with a failure on purpose. Run the starter and ' +
			'read the diagnostic below the preview:</p>' +
			'<p><code>invalid HTML: bare "&amp;" in text — strict HTML writes it ' +
			'as &amp;amp;</code></p>' +
			'<p>Now look at the preview pane <em>above</em> that error: the ' +
			'browser is happily showing “Fish &amp; Chips” as if nothing were ' +
			'wrong. Both reactions are real. Browsers guess — error recovery is ' +
			'specified into HTML5 itself, so a lone <code>&amp;</code> usually ' +
			'gets treated as text. Strict HTML does not guess: <code>&amp;</code> ' +
			'is the character that <em>starts an entity</em>, so a bare one is a ' +
			'syntax error waiting to change meaning (put <code>amp;</code> after ' +
			'it by accident and your text silently mutates). This track sides ' +
			'with strict.</p>',
			'<h2>Five characters belong to the language</h2>' +
			'<p><code>&lt;</code> starts a tag, <code>&gt;</code> ends one, ' +
			'<code>&amp;</code> starts an entity, and the two quote characters ' +
			'delimit attribute values. To <em>show</em> any of them as ordinary ' +
			'text, you write an entity — an <code>&amp;</code>, a name, a ' +
			'semicolon — and the parser substitutes the real character:</p>',
			{ lang: 'html', code: '<p>Fish &amp; Chips</p>            <!-- renders: Fish & Chips -->\n<p>3 &lt; 5, and 5 &gt; 3</p>      <!-- renders: 3 < 5, and 5 > 3 -->\n<p>She said &quot;hello&quot;</p>        <!-- renders: She said "hello" -->\n<p>It&apos;s open</p>              <!-- renders: It\'s open -->' },
			'<p>The same rule holds inside attribute values — a URL query string ' +
			'like <code>?size=large&amp;amp;qty=2</code> needs its ' +
			'<code>&amp;amp;</code> too. And a stray <code>&lt;</code> in text ' +
			'has its own diagnostic, because the parser cannot tell it from the ' +
			'start of a tag: <code>stray "&lt;" in text — start a tag ' +
			'(&lt;p&gt;, &lt;/p&gt;...) or write the character as ' +
			'&amp;lt;</code>.</p>' +
			'<p>Notice what the structure outline prints once you get it right: ' +
			'the <em>decoded</em> text. <code>Fish &amp;amp; Chips</code> in the ' +
			'source appears as <code>"Fish &amp; Chips"</code> in the outline — ' +
			'entities are spelling, not content.</p>',
			'<h2>Typography, and the space that refuses to break</h2>' +
			'<p>Entities also name characters that are awkward to type: ' +
			'<code>&amp;mdash;</code> for the em dash (—), ' +
			'<code>&amp;copy;</code> for ©, <code>&amp;hellip;</code> for the ' +
			'ellipsis, <code>&amp;rarr;</code> for an arrow. One of them is ' +
			'special: <code>&amp;nbsp;</code> is not a styled space but a ' +
			'genuinely <em>different character</em> (U+00A0, the no-break ' +
			'space). Runs of ordinary spaces, tabs, and newlines collapse to a ' +
			'single space — in the browser and in this track&apos;s outline — ' +
			'but U+00A0 is not ASCII whitespace, so it survives the collapse. ' +
			'That is exactly why you write <code>10&amp;nbsp;GB</code>: the ' +
			'browser will happily wrap a line at a plain space, but never ' +
			'between those two words.</p>' +
			'<p>Any Unicode character can also be named by number — ' +
			'<code>&amp;#x2764;</code> is ❤ (hex), <code>&amp;#169;</code> is © ' +
			'again (decimal). And because named entities are a closed ' +
			'vocabulary, a typo is caught instead of shipped: ' +
			'<code>&amp;nbps;</code> gets you <code>unknown entity &amp;nbps; — ' +
			'check the spelling (did you mean one of &amp;amp; &amp;lt; ' +
			'&amp;gt; &amp;quot; &amp;nbsp;?)</code>. A browser would render ' +
			'the typo literally, as text, forever.</p>',
			'<h2>Comments</h2>' +
			'<p>A comment runs from <code>&lt;!--</code> to <code>--&gt;</code> ' +
			'and is addressed to the next person editing the file: why a block ' +
			'exists, where a section begins, what still needs doing. In the ' +
			'structure outline, comments appear as <code># ...</code> lines, so ' +
			'you can see they really are nodes in the document tree.</p>',
			{ lang: 'html', code: '<!-- opening hours are duplicated in the footer — keep in sync -->\n<p>Open daily.</p>' },
			'<p>That last point matters: comments are <em>in the document</em>. ' +
			'They are sent to every visitor, and view-source shows them all. A ' +
			'comment is not a way to disable content the user should not see — ' +
			'commented-out prices, unreleased features, credentials in an old ' +
			'snippet all ship with the page. If content must not reach the ' +
			'reader, delete it; comments are notes, not curtains.</p>',
			'<h3>Your job</h3>' +
			'<p>The snack-bar menu below fails validation twice over: a bare ' +
			'<code>&amp;</code> in “Fish &amp; Chips” and a bare ' +
			'<code>&lt;</code> in the “3 &lt; 5” fun fact. Fix both with ' +
			'entities. Then add a footer paragraph that uses ' +
			'<code>&amp;mdash;</code> and <code>&amp;copy;</code>, and replace ' +
			'the TODO comments with one real comment of your own.</p>' +
			'<div class="tip">The validator reports only the <em>first</em> ' +
			'error it meets, so work top to bottom: fix the <code>&amp;</code>, ' +
			'run again, and the <code>&lt;</code> diagnostic surfaces next. ' +
			'Every fix earns you the next message.</div>',
		],

		task: 'Escape the bare ampersand and less-than sign with entities, add a footer line using the em-dash and copyright entities, and leave one comment.',

		starter: [
			'<h1>The Snack Bar</h1>',
			'<!-- TODO 1: run this as-is and READ the error below, then fix the & -->',
			'<ul>',
			'  <li>Fish & Chips</li>',
			'  <li>Soup of the day</li>',
			'</ul>',
			'<!-- TODO 2: fix the < on the next line -->',
			'<p>Fun fact: 3 < 5, so our small portion really is smaller.</p>',
			'<!-- TODO 3: add a footer <p> with an em dash and a copyright notice -->',
			'<!-- TODO 4: replace these TODOs with one comment of your own -->',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// Every pin is a DECODED character — only correct entities can put
			// them in the outline (the raw source would fail validation).
			return stdout.includes('"Fish & Chips"') &&
				stdout.includes('3 < 5') &&
				stdout.indexOf('—') !== -1 &&   // — only via &mdash; (or a numeric ref)
				stdout.indexOf('©') !== -1 &&   // © only via &copy;
				// A comment line of the learner's own — outline comments start
				// with "# "; leftover starter TODO markers do not count.
				/^[ ]*# (?!TODO)./m.test(stdout);
		},

		solution: [
			'<h1>The Snack Bar</h1>',
			'<ul>',
			'  <li>Fish &amp; Chips</li>',
			'  <li>Soup of the day</li>',
			'</ul>',
			'<p>Fun fact: 3 &lt; 5, so our small portion really is smaller.</p>',
			'<!-- hours are also painted on the door; keep the two in sync -->',
			'<p>Open daily 11:00&nbsp;&mdash;&nbsp;22:00. &copy; 2026 The Snack Bar</p>',
			'',
		].join('\n'),
	});
})();
