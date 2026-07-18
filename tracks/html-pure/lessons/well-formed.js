/* Well-Formed HTML — the track's thesis lesson. Browsers never show a
 * syntax error (HTML5 specifies error recovery), so broken markup silently
 * becomes a tree you did not intend; the strict validator exists to say the
 * quiet part out loud. The starter fails three ways — <strong><em> closed in
 * the wrong order, a <div/> self-closing attempt, and a duplicated id — and
 * the learner fixes them one red pane at a time. The check pins em nested
 * INSIDE strong via outline indentation, the properly closed empty spacer
 * div (its line immediately followed by the next depth-0 card), and two
 * distinct id values with card-a appearing exactly once — shapes only a
 * correctly closed, uniquely identified tree can print.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'well-formed',
		title: 'Well-Formed HTML',
		nav: 'well-formed html',
		category: 'Structure & Semantics',
		starterError: true,

		prose: [
			'<h2>The browser will never tell you</h2>' +
			'<p>Here is the strangest fact about HTML: <strong>browsers do not ' +
			'have syntax errors</strong>. HTML5 goes further than tolerating ' +
			'broken markup — it <em>specifies</em> the error recovery, step by ' +
			'step, so every browser builds the same tree from the same mistake. ' +
			'Feed it mis-nested tags and they get rearranged; feed it an ' +
			'unclosed element and something eventually closes it. You always ' +
			'get <em>a</em> page. Whether it is the page you meant is your ' +
			'problem, and no one will mention it.</p>' +
			'<p>That silence is the reason this track has a strict validator at ' +
			'all. Run the starter and read the red pane:</p>' +
			'<p><code>invalid HTML: mismatched closing tag &lt;/strong&gt; — ' +
			'&lt;em&gt; opened at line 7 must be closed first (tags close in ' +
			'reverse order of opening)</code></p>' +
			'<p>Now look at the preview <em>above</em> the error: the text ' +
			'still renders bold-italic, as if nothing were wrong. That contrast ' +
			'is the entire lesson. The browser quietly reshuffled ' +
			'<code>&lt;strong&gt;&lt;em&gt;...&lt;/strong&gt;&lt;/em&gt;</code> ' +
			'into some legal tree; the validator refused it, named the line, ' +
			'and told you the rule. Elements nest like boxes — the box you ' +
			'opened last must close first:</p>' +
			'<svg class="dg" viewBox="0 0 540 148" role="img" aria-label="Nested boxes: em sits wholly inside strong, so em must close before strong">' +
			'<rect x="10" y="18" width="520" height="96" rx="10" fill="none" stroke="#6ea8dc" stroke-width="2"/>' +
			'<text x="26" y="44" font-size="14" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" fill="#6ea8dc">&lt;strong&gt;</text>' +
			'<text x="438" y="44" font-size="14" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" fill="#6ea8dc">&lt;/strong&gt;</text>' +
			'<rect x="128" y="56" width="284" height="42" rx="8" fill="none" stroke="#d99a4e" stroke-width="2"/>' +
			'<text x="142" y="83" font-size="14" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" fill="#d99a4e">&lt;em&gt;</text>' +
			'<text x="222" y="83" font-size="14" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" fill="currentColor">text</text>' +
			'<text x="332" y="83" font-size="14" font-family="ui-monospace,SFMono-Regular,Menlo,monospace" fill="#d99a4e">&lt;/em&gt;</text>' +
			'<text x="26" y="138" font-size="12" fill="currentColor" opacity="0.72">the inner box closes first — closing tags appear in reverse order of the opening tags</text>' +
			'</svg>',
			'<h2>Void elements, and the &lt;div/&gt; trap</h2>' +
			'<p>Two element families, two closing rules. <em>Void</em> elements ' +
			'(<code>br</code>, <code>img</code>, <code>input</code>, ' +
			'<code>hr</code>, <code>meta</code>, <code>link</code>...) can have ' +
			'no content, so they take no closing tag — ever. Writing ' +
			'<code>&lt;/br&gt;</code> earns: <code>&lt;/br&gt; — br is a void ' +
			'element: it has no content and never a closing tag</code>. A ' +
			'trailing slash on a void element (<code>&lt;br/&gt;</code>, ' +
			'<code>&lt;img .../&gt;</code>) is harmless XML style.</p>' +
			'<p>Every <em>other</em> element needs an explicit closing tag, and ' +
			'here hides one of HTML&apos;s classic gotchas: on a non-void ' +
			'element, real HTML <strong>ignores</strong> the trailing slash. ' +
			'<code>&lt;div/&gt;</code> does not create an empty div — the slash ' +
			'is discarded, the div is <em>open</em>, and it silently swallows ' +
			'the entire rest of the page as its children. Your layout breaks ' +
			'three screens later with no error anywhere near the cause. The ' +
			'validator says it out loud instead:</p>' +
			'<p><code>"&lt;div/&gt;" does not close the element — in HTML the ' +
			'trailing slash on a non-void tag is IGNORED and &lt;div&gt; stays ' +
			'open; write an explicit &lt;/div&gt;</code></p>',
			{ lang: 'html', code: '<br/>                    <!-- fine: br is void, slash is decoration -->\n<div/>                   <!-- trap: the div is now OPEN -->\n<div class="spacer"></div>   <!-- an empty div is written like this -->' },
			'<h2>id is a promise of uniqueness</h2>' +
			'<p>An <code>id</code> names <em>one</em> element in the whole ' +
			'document — the attribute is a promise, and other features lean on ' +
			'it: a fragment link (<code>href="#card"</code>) jumps to the one ' +
			'element with that id, a <code>&lt;label for="..."&gt;</code> ' +
			'focuses the one control it names, and script lookups return one ' +
			'element, not a list. Duplicate the id and each of those silently ' +
			'picks the first match, ignoring the rest. The browser never ' +
			'objects; the validator does:</p>' +
			'<p><code>duplicate id "card" — first used at line 5; an id must ' +
			'be unique in the whole document</code></p>' +
			'<p>When two things want the same name, they are two things: name ' +
			'them <code>card-a</code> and <code>card-b</code>, or use ' +
			'<code>class</code>, which is <em>designed</em> for many elements ' +
			'sharing a label.</p>',
			'<h3>Your job</h3>' +
			'<p>The release-notes card below is broken three ways: the ' +
			'<code>&lt;strong&gt;&lt;em&gt;</code> pair closes in the wrong ' +
			'order, the spacer tries to self-close as ' +
			'<code>&lt;div/&gt;</code>, and both cards claim ' +
			'<code>id="card"</code>. Fix the nesting, give the spacer a real ' +
			'closing tag, and rename the ids to <code>card-a</code> and ' +
			'<code>card-b</code>.</p>' +
			'<div class="tip">The validator stops at the <em>first</em> error, ' +
			'so this is a three-run exercise: fix, run, read the next message. ' +
			'That loop — not memorizing rules — is how well-formedness becomes ' +
			'reflex.</div>',
		],

		task: 'Fix the mis-nested strong/em pair, replace the self-closing div with real tags, and give the two cards unique ids (card-a, card-b).',

		starter: [
			'<!-- Three bugs hide below. Run first and read the red pane; fix, run, repeat. -->',
			'<!-- TODO 1: tags close in reverse order of opening — fix </strong></em>. -->',
			'<!-- TODO 2: <div/> does not close a div. Write real open and close tags. -->',
			'<!-- TODO 3: ids must be unique — rename the cards card-a and card-b. -->',
			'<div id="card">',
			'  <h2>Release notes</h2>',
			'  <p><strong><em>Faster builds</strong></em> land this cycle.</p>',
			'</div>',
			'<div class="spacer"/>',
			'<div id="card">',
			'  <p>Older entries move here.</p>',
			'</div>',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var cardA = stdout.indexOf('id="card-a"');
			// em must sit INSIDE strong — the outline can only indent it
			// deeper if the tags really nest, i.e. close in reverse order.
			return /strong\n +em\n/.test(stdout) &&
				// The spacer div, properly closed and empty: its line is
				// immediately followed by the next card at the same depth.
				stdout.includes('div class="spacer"\ndiv id="card-b"') &&
				// Two DIFFERENT ids — and card-a exactly once (uniqueness is
				// the promise; the outline should show it kept).
				cardA !== -1 && stdout.includes('id="card-b"') &&
				cardA === stdout.lastIndexOf('id="card-a"');
		},

		solution: [
			'<div id="card-a">',
			'  <h2>Release notes</h2>',
			'  <p><strong><em>Faster builds</em></strong> land this cycle.</p>',
			'</div>',
			'<div class="spacer"></div>',
			'<div id="card-b">',
			'  <p>Older entries move here.</p>',
			'</div>',
			'',
		].join('\n'),
	});
})();
