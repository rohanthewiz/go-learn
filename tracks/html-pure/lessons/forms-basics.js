/* Forms: The Basics — a form is an envelope of name=value pairs sent to a
 * URL. Teaches action/method (GET vs POST), the missing-name bug (a control
 * without a name is silently dropped from the submission), label/for
 * binding, and button type="submit". The exercise repairs a form that has
 * all four defects; the check pins the full attribute run of the fixed
 * input (id + name + type — unreachable while the starter's input lacks a
 * name), the method="post" form tag, the label/for nesting, and the typed
 * button. Comment lines are stripped before pinning so leftover TODOs can
 * neither satisfy nor break a pin. */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'forms-basics',
		title: 'Forms: The Basics',
		nav: 'forms: the basics',
		category: 'Forms',

		prose: [
			'<h2>A form is an envelope of name=value pairs</h2>' +
			'<p>Everything before this lesson flowed one way: server to ' +
			'screen. A <code>&lt;form&gt;</code> reverses the arrow. When it ' +
			'is submitted, the browser walks every control inside it, collects ' +
			'one <code>name=value</code> pair per control, and mails the ' +
			'bundle to a URL. Two attributes on the form tag address the ' +
			'envelope:</p>',
			{ lang: 'html', code: '<form action="/subscribe" method="post">\n  ...controls...\n</form>' },
			'<p><code>action</code> is <em>where</em> the pairs go — a URL on ' +
			'your server. <code>method</code> is <em>how</em> they travel. ' +
			'With <code>method="get"</code> (the default) the pairs are ' +
			'appended to the URL itself: ' +
			'<code>/search?q=html&amp;page=2</code>. That makes GET right for ' +
			'<em>reads</em> — searches and filters — because the resulting ' +
			'URL is bookmarkable and shareable, and wrong for anything ' +
			'secret, since URLs land in history and server logs. With ' +
			'<code>method="post"</code> the pairs ride inside the request ' +
			'body, invisible in the URL — the right choice for <em>writes</em>: ' +
			'signups, orders, anything that changes state on the server.</p>' +
			'<svg class="dg" viewBox="0 0 640 150" role="img" aria-label="Form controls become a name=value string sent to the server">' +
			'<defs><marker id="dgHP5arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="#6b8fb5"/></marker></defs>' +
			'<rect x="10" y="25" width="150" height="100" rx="8" fill="#eef4fb" stroke="#6b8fb5"/>' +
			'<text x="85" y="48" text-anchor="middle" font-size="13" fill="#2c4a6e" font-weight="bold">&lt;form&gt;</text>' +
			'<rect x="25" y="58" width="120" height="20" rx="3" fill="#fff" stroke="#a8c0d8"/>' +
			'<text x="32" y="72" font-size="11" fill="#555">name="email"</text>' +
			'<rect x="25" y="86" width="120" height="20" rx="3" fill="#fff" stroke="#a8c0d8"/>' +
			'<text x="32" y="100" font-size="11" fill="#555">name="plan"</text>' +
			'<line x1="165" y1="75" x2="225" y2="75" stroke="#6b8fb5" stroke-width="2" marker-end="url(#dgHP5arrow)"/>' +
			'<text x="195" y="65" text-anchor="middle" font-size="11" fill="#6b8fb5">submit</text>' +
			'<rect x="230" y="55" width="260" height="40" rx="6" fill="#fdf6e3" stroke="#c9a94e"/>' +
			'<text x="360" y="79" text-anchor="middle" font-size="12" fill="#7a6520" font-family="monospace">email=ada@example.com&amp;plan=pro</text>' +
			'<line x1="495" y1="75" x2="555" y2="75" stroke="#6b8fb5" stroke-width="2" marker-end="url(#dgHP5arrow)"/>' +
			'<rect x="560" y="45" width="70" height="60" rx="8" fill="#e8f5e9" stroke="#5a9e6f"/>' +
			'<text x="595" y="80" text-anchor="middle" font-size="12" fill="#2e6e42">server</text>' +
			'</svg>',
			'<h2>No name, no data</h2>' +
			'<p>Here is the single most common form bug, and it makes no ' +
			'noise at all. Each pair\'s <em>name</em> comes from the ' +
			'control\'s <code>name</code> attribute — and a control without ' +
			'one is simply <strong>left out of the submission</strong>. It ' +
			'renders, it focuses, you can type into it… and the server ' +
			'receives nothing:</p>',
			{ lang: 'html', code: '<input id="email" type="email">              <!-- submits NOTHING -->\n<input id="email" name="email" type="email"> <!-- submits email=... -->' },
			'<p>The confusion is that <code>id</code> and <code>name</code> ' +
			'look interchangeable and often carry the same string, but they ' +
			'serve different masters: <code>id</code> is for the ' +
			'<em>document</em> (labels, fragment links, CSS, scripts) and ' +
			'must be unique; <code>name</code> is for the ' +
			'<em>submission</em> — it is the left-hand side of the pair on ' +
			'the wire. A submittable control needs the name; most also want ' +
			'the id.</p>',
			'<h2>label — bound by for</h2>' +
			'<p>Every input deserves a <code>&lt;label&gt;</code>, and the ' +
			'binding is explicit: the label\'s <code>for</code> attribute ' +
			'names the input\'s <code>id</code>:</p>',
			{ lang: 'html', code: '<label for="email">Email</label>\n<input id="email" name="email" type="email">' },
			'<p>This buys two real things. First, clicking the label focuses ' +
			'the input — a much bigger click target, which matters on ' +
			'touchscreens. <em>Genuinely try it in the preview pane</em>: ' +
			'click the word, watch the cursor land in the box. Second, a ' +
			'screen reader reaching the input announces the label\'s text, so ' +
			'a non-sighted user knows what the field is for. Bare text ' +
			'sitting next to an input provides neither — the association ' +
			'exists only in a sighted reader\'s eye.</p>',
			'<h2>The submit button — and the default-type trap</h2>' +
			'<p>A <code>&lt;button type="submit"&gt;</code> inside the form ' +
			'triggers the whole collect-and-send dance. The trap: ' +
			'<code>submit</code> is also the <em>default</em>, so a bare ' +
			'<code>&lt;button&gt;</code> inside a form submits it too — which ' +
			'bites the moment you add a second button (a &ldquo;show ' +
			'password&rdquo; toggle, say) and every click of it silently ' +
			'submits the form. The discipline is to always write the type: ' +
			'<code>type="submit"</code> when you mean it, ' +
			'<code>type="button"</code> when you do not.</p>' +
			'<p>One honest note about this playground: the preview pane runs ' +
			'in a sandbox that blocks real navigation, so pressing the button ' +
			'will not actually reach a server. That is fine — the ' +
			'<em>structure</em> is the lesson, and the validator\'s outline ' +
			'shows you exactly the shape a real browser would submit.</p>',
			'<p>Elsewhere in go-learn, the <em>TypeScript + Go Web</em> track ' +
			'generates exactly this markup from Go with the element library — ' +
			'recognize the shape:</p>',
			{ lang: 'go', code: 'b := element.NewBuilder()\nb.Form("action", "/subscribe", "method", "post").R(\n\tb.Label("for", "email").T("Email"),\n\tb.Input("id", "email", "name", "email", "type", "email"),\n\tb.Button("type", "submit").T("Subscribe"),\n)\nhtml := b.String()' },
			'<h3>Your job</h3>' +
			'<p>The starter form has all four classic defects: it defaults to ' +
			'GET though it writes data, its field label is bare text, its ' +
			'input has an <code>id</code> but <strong>no name</strong> (so it ' +
			'would submit nothing), and its button trusts the default type. ' +
			'Fix each one: add <code>method="post"</code> to the form, wrap ' +
			'the text in a label bound to the input, give the input its ' +
			'<code>name</code> and an email <code>type</code> in the order ' +
			'the TODO dictates, and type the button.</p>' +
			'<div class="tip">The outline prints attributes in <em>source ' +
			'order</em>, so where you add an attribute is where it shows up. ' +
			'Follow the order the TODOs give — <code>id</code>, then ' +
			'<code>name</code>, then <code>type</code> — and your outline ' +
			'will match the check exactly.</div>',
		],

		task: 'Give the form method="post", bind a label to the input, add name= and type= to the input, and type the button.',

		starter: [
			'<!-- This renders fine — but as written it would submit NO data. -->',
			'<!-- TODO 1: this form writes data — add method="post" to the form tag. -->',
			'<form action="/subscribe">',
			'',
			'  <!-- TODO 2: wrap the word below in a label element whose',
			'       for attribute is "email", so clicking it focuses the input. -->',
			'  Email',
			'',
			'  <!-- TODO 3: this input would be dropped from the submission. After',
			'       the id, add the missing attributes in exactly this order:',
			'       id, then name="email", then type="email". -->',
			'  <input id="email">',
			'',
			'  <!-- TODO 4: say what the button does — add type="submit". -->',
			'  <button>Subscribe</button>',
			'</form>',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// Strip comment lines (outline renders them as "# ...") so a
			// leftover TODO can neither satisfy a pin nor wedge itself
			// between lines a nesting pin expects to be adjacent.
			var lines = stdout.split('\n').filter(function (l) {
				return l.replace(/^\s*/, '').charAt(0) !== '#';
			});
			var s = lines.join('\n');
			// Pins: POST envelope, label/for wrapping the text (depth-exact),
			// the input's full attribute run (only reachable once name= and
			// type= are added after id=), and an explicitly typed button.
			return s.indexOf('form action="/subscribe" method="post"') !== -1 &&
				s.indexOf('  label for="email"\n    "Email"') !== -1 &&
				s.indexOf('input id="email" name="email" type="email"') !== -1 &&
				s.indexOf('button type="submit"') !== -1;
		},

		solution: [
			'<!-- method="post": this form WRITES data, so the pairs travel in the',
			'     request body instead of dangling off the URL. -->',
			'<form action="/subscribe" method="post">',
			'',
			'  <!-- label/for binds to the input id: clicking the word focuses the',
			'       box, and screen readers announce it with the field. -->',
			'  <label for="email">Email</label>',
			'',
			'  <!-- name= puts this control ON the wire (email=...); without it the',
			'       control renders but submits nothing. type="email" adds the',
			'       right mobile keyboard and format checking for free. -->',
			'  <input id="email" name="email" type="email">',
			'',
			'  <!-- Explicit type: a bare <button> in a form defaults to submit,',
			'       which becomes a trap the moment a second button appears. -->',
			'  <button type="submit">Subscribe</button>',
			'</form>',
			'',
		].join('\n'),
	});
})();
