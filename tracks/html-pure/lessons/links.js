/* Links — <a href> with absolute URLs, relative paths, #fragment links to
 * an id, target="_blank" and the noopener security story, and mailto:.
 * The exercise replaces a nav full of dead href="#" placeholders with a
 * relative link, a fragment link wired to a real id, and an external
 * link opening safely in a new tab; the check pins each href value, the
 * id="faq" target, the target/rel pair in source order, and the ABSENCE
 * of any remaining href="#" — none of which the starter can satisfy.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'links',
		title: 'Links',
		nav: 'links',
		category: 'Foundations',

		prose: [
			'<h2>The anchor element</h2>' +
			'<p>Links are the whole reason HTML is <em>hyper</em>text. One ' +
			'element does the job: <code>&lt;a&gt;</code>, the anchor, whose ' +
			'<code>href</code> attribute holds the destination and whose ' +
			'content is what the reader clicks. What kind of destination ' +
			'depends entirely on the shape of the <code>href</code> value:</p>',
			{ lang: 'html', code: '<a href="https://example.com/docs">absolute: full URL, protocol and all</a>\n<a href="/guide">relative: resolved against THIS page\'s address</a>\n<a href="#faq">fragment: jump to the element with id="faq"</a>\n<a href="mailto:team@example.com">opens the reader\'s mail client</a>' },
			'<p>An <em>absolute</em> URL names everything — protocol, host, ' +
			'path — and works from anywhere. A <em>relative</em> path is ' +
			'resolved against the address of the page it appears on: ' +
			'<code>/guide</code> means &quot;the <code>guide</code> path on ' +
			'this same site&quot;, so the link keeps working when the site ' +
			'moves from staging to production. Prefer relative paths for your ' +
			'own pages; save absolute URLs for other people&#39;s sites.</p>',

			'<h2>Fragment links: navigation with zero JavaScript</h2>' +
			'<p>An <code>href</code> beginning with <code>#</code> targets an ' +
			'element <em>on the same page</em> whose <code>id</code> matches ' +
			'the part after the hash. Clicking it scrolls that element into ' +
			'view — a table of contents, a &quot;back to top&quot; link, a ' +
			'skip-to-content shortcut, all with no script at all. It only ' +
			'works if exactly one element carries that <code>id</code> — which ' +
			'is one reason this validator rejects duplicate ids anywhere in ' +
			'the document.</p>',
			{ lang: 'html', code: '<a href="#faq">Jump to the FAQ</a>\n<!-- ... a screenful of content later ... -->\n<section id="faq">\n  <h2>FAQ</h2>\n</section>' },

			'<h2>New tabs and the opener leak</h2>' +
			'<p><code>target=&quot;_blank&quot;</code> opens the link in a new ' +
			'tab. Historically that came with a security hole: the new page ' +
			'received a <code>window.opener</code> reference back to yours and ' +
			'could script it — for instance, quietly redirecting your tab to a ' +
			'look-alike phishing page while the reader&#39;s attention was on ' +
			'the new one. <code>rel=&quot;noopener&quot;</code> severs that ' +
			'reference. Modern browsers now imply it for ' +
			'<code>target=&quot;_blank&quot;</code>, but writing it explicitly ' +
			'documents the intent and protects readers on older engines — ' +
			'treat the pair as one unit:</p>',
			{ lang: 'html', code: '<a href="https://example.com" target="_blank" rel="noopener">Example</a>' },
			'<p>One note about this playground: the preview pane is a sandboxed ' +
			'frame, so clicking a link there will not actually navigate ' +
			'anywhere. That is fine — the structure outline shows every ' +
			'<code>href</code>, <code>target</code>, and <code>id</code> ' +
			'exactly as written, which is what the lesson checks.</p>',

			'<h3>Your job</h3>' +
			'<p>The starter nav is all dead placeholders — every ' +
			'<code>href=&quot;#&quot;</code> is a link to nowhere. Wire up the ' +
			'real destinations: a relative link to <code>/guide</code>; a ' +
			'fragment link to <code>#faq</code> plus the <code>id</code> on ' +
			'the FAQ section below so the fragment has somewhere to land; and ' +
			'an external <code>https</code> link that opens in a new tab ' +
			'safely — write its attributes in the order <code>href</code>, ' +
			'<code>target</code>, <code>rel</code>. No placeholder ' +
			'<code>href=&quot;#&quot;</code> may survive.</p>' +
			'<div class="tip">The outline prints attributes in source order, ' +
			'so <code>a href=&quot;...&quot; target=&quot;_blank&quot; ' +
			'rel=&quot;noopener&quot;</code> reading left to right is your ' +
			'confirmation that all three landed on the same tag.</div>',
		],

		task: 'Replace the dead href="#" placeholders with a relative link, a fragment link to a real id="faq", and an external link with target="_blank" rel="noopener".',

		starter: [
			'<nav>',
			'  <!-- TODO 1: point this at the relative path /guide -->',
			'  <a href="#">Guide</a>',
			'  <!-- TODO 2: point this at the fragment #faq (and see TODO 3) -->',
			'  <a href="#">FAQ</a>',
			'  <!-- TODO 4: point this at https://example.com and make it open in a',
			'       new tab safely — attribute order: href, target, rel -->',
			'  <a href="#">Example</a>',
			'</nav>',
			'',
			'<!-- TODO 3: give this section the id the fragment link targets -->',
			'<section>',
			'  <h2>FAQ</h2>',
			'  <p>Answers live here, a screenful below the nav.</p>',
			'</section>',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('a href="/guide"') &&
				stdout.includes('a href="#faq"') &&
				stdout.includes('section id="faq"') &&
				stdout.includes('target="_blank" rel="noopener"') &&
				!stdout.includes('href="#"');
		},

		solution: [
			'<nav>',
			'  <!-- Relative: resolved against this page\'s address, so it',
			'       survives a move between staging and production. -->',
			'  <a href="/guide">Guide</a>',
			'  <!-- Fragment: same-page jump to the element with id="faq". -->',
			'  <a href="#faq">FAQ</a>',
			'  <!-- New tab + noopener: sever window.opener so the opened page',
			'       can never script this one. Treat the pair as one unit. -->',
			'  <a href="https://example.com" target="_blank" rel="noopener">Example</a>',
			'</nav>',
			'',
			'<!-- The fragment link needs exactly one element with this id. -->',
			'<section id="faq">',
			'  <h2>FAQ</h2>',
			'  <p>Answers live here, a screenful below the nav.</p>',
			'</section>',
			'',
		].join('\n'),
	});
})();
