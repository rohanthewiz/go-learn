/* Accessibility — the payoff lesson: semantic HTML IS the accessibility
 * API. Landmarks, heading order, accessible names, native elements over
 * rebuilt ones, and aria-label as the escape hatch. The exercise repairs
 * a valid-but-inaccessible page; the check pins a real <button> with its
 * text (and the absence of div class="button"), an img with meaningful
 * alt, h2 restoring heading order (h4 must vanish), and aria-labels
 * distinguishing the two navs — none reachable by the all-div starter.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'accessibility',
		title: 'Accessibility',
		nav: 'accessibility',
		category: 'Advanced',

		prose: [
			'<h2>The reader you cannot see</h2>' +
			'<p>Every choice this track has argued for — real headings, real ' +
			'lists, landmarks, labels — pays off here. A screen reader does ' +
			'not see your page; it walks a tree the browser builds ' +
			'<em>from your markup</em> and announces what each node claims to ' +
			'be. Semantic HTML is not a nicety layered on top of ' +
			'accessibility: it <strong>is</strong> the accessibility API. ' +
			'Write <code>&lt;nav&gt;</code> and a blind user can jump straight ' +
			'to navigation; write <code>&lt;div class="nav"&gt;</code> and the ' +
			'same user hears an undifferentiated wall of text.</p>',
			'<h2>Landmarks and heading order</h2>' +
			'<p>Screen reader users rarely read a page top to bottom. They ' +
			'navigate: jump between landmarks ' +
			'(<code>&lt;nav&gt;</code>, <code>&lt;main&gt;</code>, ' +
			'<code>&lt;footer&gt;</code>), or pull up the list of headings and ' +
			'skim it like a table of contents. That second trick only works if ' +
			'the headings form a real outline — <code>h1</code> for the page, ' +
			'<code>h2</code> for its sections, <code>h3</code> inside those. ' +
			'Jumping from <code>h1</code> straight to <code>h4</code> because ' +
			'the smaller size "looks right" tells the listener three levels of ' +
			'structure exist that do not. Size is CSS&#39;s job; the number ' +
			'carries structure:</p>',
			{ lang: 'html', code: '<h1>Pond Life</h1>\n<h2>Herons</h2>      <!-- next level down: h2, never "whichever looks right" -->\n<h3>Grey heron</h3>  <!-- CSS controls the size; the number carries structure -->' },
			'<h2>Accessible names</h2>' +
			'<p>Everything a user can perceive or operate needs a ' +
			'<em>name</em> the screen reader can say. Mostly you have already ' +
			'provided it: a link&#39;s name is its text, a button&#39;s name ' +
			'is its text, a form control&#39;s name is its ' +
			'<code>&lt;label&gt;</code>. Images need it stated explicitly — ' +
			'<code>alt</code> is what is announced in place of the pixels:</p>',
			{ lang: 'html', code: '<img src="heron.png" alt="A grey heron standing in the shallows">\n<img src="divider.png" alt="">  <!-- decorative: empty alt means "skip me" -->' },
			'<p>Write what the image <em>means</em> in context, not ' +
			'"image of". And note the difference between missing ' +
			'<code>alt</code> and empty <code>alt=""</code>: missing makes ' +
			'the reader guess (often announcing the filename); empty says, ' +
			'deliberately, that there is nothing to announce.</p>',
			'<h2>Native beats rebuilt</h2>' +
			'<p>A real <code>&lt;button&gt;</code> arrives with its behavior ' +
			'included: it takes keyboard focus, activates on Enter and Space, ' +
			'and announces itself as "button". A ' +
			'<code>&lt;div class="button"&gt;</code> styled to look identical ' +
			'has none of that — the keyboard cannot reach it, and the screen ' +
			'reader calls it plain text. Rebuilding what the div threw away ' +
			'costs <code>tabindex</code>, <code>role</code>, and two key ' +
			'handlers, and most rebuilds forget at least one:</p>',
			{ lang: 'html', code: '<button>Add sighting</button>       <!-- focus, keys, announcement: free -->\n\n<div class="button">Add sighting</div>  <!-- looks the same; IS nothing -->' },
			'<h2>aria-label, the escape hatch</h2>' +
			'<p>Sometimes a visible name cannot exist: an icon-only close ' +
			'button, or two <code>&lt;nav&gt;</code> landmarks that would ' +
			'otherwise both announce as just "navigation". ' +
			'<code>aria-label</code> supplies the missing name:</p>',
			{ lang: 'html', code: '<nav aria-label="primary"> … </nav>\n<nav aria-label="footer"> … </nav>\n<button aria-label="Close">×</button>  <!-- icon-only: no text to announce -->' },
			'<p>It is an escape hatch, not a habit. The first rule of ARIA is ' +
			'<em>do not use ARIA</em> when an element already says it: ' +
			'<code>role="button"</code> on a <code>&lt;button&gt;</code> is ' +
			'noise, and <code>aria-label</code> on an element with perfectly ' +
			'good visible text overrides — hides — that text.</p>',
			'<p>One honest warning: nothing on this page is ' +
			'validator-enforceable. A page built entirely of divs parses ' +
			'clean; the strict outline will print it without complaint. ' +
			'Accessibility is a discipline, not a syntax — which is exactly ' +
			'why it comes at the end of the track, after the habits that make ' +
			'it nearly automatic.</p>',
			'<h3>Your job</h3>' +
			'<p>The starter is perfectly valid and quietly broken. Repair all ' +
			'four failures: turn the fake ' +
			'<code>&lt;div class="button"&gt;</code> into a real ' +
			'<code>&lt;button&gt;</code>, give the image a meaningful ' +
			'<code>alt</code> (describe the heron, not "an image"), replace ' +
			'the outline-breaking <code>h4</code> with <code>h2</code>, and ' +
			'name the two navs apart with <code>aria-label="primary"</code> ' +
			'and <code>aria-label="footer"</code>. The preview will barely ' +
			'change — that is the point: this work is for the reader you ' +
			'cannot see.</p>' +
			'<div class="tip">Audit any page in ten seconds without a screen ' +
			'reader: put the mouse down and press Tab. Everything clickable ' +
			'should take focus and activate from the keyboard — the div ' +
			'button fails this test instantly.</div>',
		],

		task: 'Make the page accessible: a real button, meaningful alt text, h2 restoring heading order, and aria-labels on both navs.',

		starter: [
			'<h1>Pond Life</h1>',
			'',
			'<!-- TODO 1: two navs both announce as "navigation" — give this one',
			'     aria-label="primary" and the bottom one aria-label="footer". -->',
			'<nav>',
			'  <a href="#herons">Herons</a>',
			'  <a href="#frogs">Frogs</a>',
			'</nav>',
			'',
			'<!-- TODO 2: h1 jumped straight to h4 because the size "looked',
			'     right" — the next level down is a level two heading. -->',
			'<h4>Herons</h4>',
			'',
			'<!-- TODO 3: this image says nothing to a screen reader — describe it. -->',
			'<img src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'80\'%3E%3Crect width=\'120\' height=\'80\' fill=\'%2378b7f0\'/%3E%3Ctext x=\'60\' y=\'45\' font-size=\'13\' text-anchor=\'middle\' fill=\'%23fff\'%3Ephoto%3C/text%3E%3C/svg%3E">',
			'',
			'<!-- TODO 4: a div dressed as a button is invisible to the keyboard',
			'     and announced as plain text. Use the real element. -->',
			'<div class="button">Add sighting</div>',
			'',
			'<nav>',
			'  <a href="#top">Back to top</a>',
			'</nav>',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// A real button node with the label as its text child; the div
			// costume gone; an img whose alt is long enough to mean something;
			// h2 restoring the outline with h4 eliminated; both navs named.
			return /button\n\s+"Add sighting"/.test(stdout) &&
				flat.indexOf('div class="button"') === -1 &&
				/img [^\n]*alt="[^"]{8,}"/.test(stdout) &&
				stdout.indexOf('h2\n') !== -1 &&
				!/h4\n/.test(stdout) &&
				flat.indexOf('nav aria-label="primary"') !== -1 &&
				flat.indexOf('nav aria-label="footer"') !== -1;
		},

		solution: [
			'<h1>Pond Life</h1>',
			'',
			'<!-- aria-label because BOTH navs would announce as "navigation" —',
			'     the label tells them apart in the landmark list. -->',
			'<nav aria-label="primary">',
			'  <a href="#herons">Herons</a>',
			'  <a href="#frogs">Frogs</a>',
			'</nav>',
			'',
			'<!-- h2: the next outline level under h1. Make it LOOK smaller with',
			'     CSS if the design wants that; the number is structure. -->',
			'<h2>Herons</h2>',
			'',
			'<!-- alt describes what the image means in context. -->',
			'<img src="data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'120\' height=\'80\'%3E%3Crect width=\'120\' height=\'80\' fill=\'%2378b7f0\'/%3E%3Ctext x=\'60\' y=\'45\' font-size=\'13\' text-anchor=\'middle\' fill=\'%23fff\'%3Ephoto%3C/text%3E%3C/svg%3E" alt="A grey heron standing motionless in the shallows">',
			'',
			'<!-- A native button: focusable, keyboard-activatable, and announced',
			'     as a button — no ARIA repair kit required. -->',
			'<button>Add sighting</button>',
			'',
			'<nav aria-label="footer">',
			'  <a href="#top">Back to top</a>',
			'</nav>',
			'',
		].join('\n'),
	});
})();
