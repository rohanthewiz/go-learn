/* Form Validation — the browser's built-in constraint system: required,
 * validating types (email/number), minlength/maxlength, min/max/step, and
 * pattern+title. The exercise takes a form of bare unconstrained inputs and
 * has the learner declare each constraint; the check pins the exact
 * attribute runs (type="email" required, the number range, the pattern, the
 * length pair) — none of which exist anywhere in the starter's outline.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'form-validation',
		title: 'Form Validation',
		nav: 'form validation',
		category: 'Forms',

		prose: [
			'<h2>The browser validates before JavaScript exists</h2>' +
			'<p>Long before you write a line of script, HTML can declare what a ' +
			'valid value <em>looks like</em> — and the browser enforces it. Try ' +
			'to submit a form that breaks a declared constraint and the browser ' +
			'refuses: it focuses the offending field, shows an error bubble, and ' +
			'the submission never happens. These are <em>declarative ' +
			'constraints</em>: you state the rule as an attribute, and the ' +
			'browser supplies the checking, the error UI, and the localized ' +
			'messages. Free machinery — you only have to ask for it.</p>' +
			'<p>The simplest rule is <code>required</code> — a boolean ' +
			'attribute, no value needed. And the <code>type</code> attribute ' +
			'pulls double duty: <code>type="email"</code>, ' +
			'<code>type="url"</code>, and <code>type="number"</code> do not just ' +
			'pick a keyboard on mobile — the type <em>is</em> a validator. A ' +
			'value that is not shaped like an email address fails ' +
			'<code>type="email"</code> the same way an empty value fails ' +
			'<code>required</code>:</p>',
			{ lang: 'html', code: '<label for="e">Email</label>\n<input id="e" type="email" required>\n<!-- empty?           required blocks the submit -->\n<!-- "not@valid@x"?   type="email" blocks it too -->' },
			'<h2>Lengths and ranges</h2>' +
			'<p>Text-like inputs take <code>minlength</code> and ' +
			'<code>maxlength</code>, counted in characters. Numeric inputs take ' +
			'<code>min</code>, <code>max</code>, and <code>step</code> — and ' +
			'with <code>type="number"</code> the browser adds spinner arrows ' +
			'that respect the range, while a typed-in out-of-range value flags ' +
			'the field invalid:</p>',
			{ lang: 'html', code: '<input minlength="3" maxlength="12">   <!-- 3 to 12 characters -->\n<input type="number" min="1" max="99" step="1">' },
			'<h2>pattern — a regex the whole value must match</h2>' +
			'<p>When no built-in type fits, <code>pattern</code> takes a regular ' +
			'expression that the <em>entire</em> value must match — it is ' +
			'implicitly anchored at both ends, so <code>ABC-1234</code> passes ' +
			'the pattern below but <code>xABC-1234</code> does not. Always pair ' +
			'it with a <code>title</code> attribute describing the format in ' +
			'human words: browsers append the title to the error bubble, so it ' +
			'becomes your custom error message.</p>',
			{ lang: 'html', code: '<input pattern="[A-Z]{3}-[0-9]{4}"\n       title="Three capital letters, a dash, four digits">' },
			'<h2>Seeing it live: the :invalid pseudo-class</h2>' +
			'<p>CSS can react to validity at every keystroke via ' +
			'<code>:invalid</code> and <code>:valid</code>. The starter ships a ' +
			'rule that gives invalid inputs a red border. The preview pane is a ' +
			'sandboxed frame, so the form never actually submits anywhere — but ' +
			'constraint checking is live regardless: once you add the ' +
			'attributes, type into the fields and watch the borders flip as ' +
			'each value crosses the line between valid and invalid.</p>',
			{ lang: 'css', code: 'input:invalid { border: 2px solid #d33; }' },
			'<h2>This is UX, not security</h2>' +
			'<p>Be honest about what you just built: a courtesy for honest ' +
			'users. Anyone can edit the attributes away in devtools, or skip ' +
			'the form entirely and POST with <code>curl</code>. Client-side ' +
			'validation gives fast, friendly feedback; the server must still ' +
			'validate <em>everything</em> it receives, every time. The two are ' +
			'complementary, never interchangeable.</p>',
			'<h3>Your job</h3>' +
			'<p>The starter is a valid form whose inputs accept anything at ' +
			'all. Constrain them, keeping the dictated attribute order: the ' +
			'email field gets <code>type="email" required</code>; quantity ' +
			'gets <code>type="number" min="1" max="99"</code>; the inventory ' +
			'code gets <code>pattern="[A-Z]{3}-[0-9]{4}"</code> followed by a ' +
			'<code>title</code> explaining the format; the username gets ' +
			'<code>minlength="3" maxlength="12" required</code>. Then run it — ' +
			'the structure outline lists attributes in source order, and you ' +
			'can type into the preview to watch <code>:invalid</code> react.</p>' +
			'<div class="tip">Put <code>title</code> immediately after ' +
			'<code>pattern</code> and write it for a human — the browser ' +
			'quotes it inside the error bubble, so it is effectively your ' +
			'custom validation message.</div>',
		],

		task: 'Add the declared constraints — required, validating types, min/max, minlength/maxlength, and pattern+title — to each input.',

		starter: [
			'<style>input:invalid { border: 2px solid #d33; }</style>',
			'<form>',
			'  <!-- TODO 1: after name, add type="email" then required (that order) -->',
			'  <label for="email">Email</label>',
			'  <input id="email" name="email">',
			'',
			'  <!-- TODO 2: add type="number" min="1" max="99" -->',
			'  <label for="qty">Quantity</label>',
			'  <input id="qty" name="qty">',
			'',
			'  <!-- TODO 3: add pattern="[A-Z]{3}-[0-9]{4}" then a title describing the format -->',
			'  <label for="code">Inventory code</label>',
			'  <input id="code" name="code">',
			'',
			'  <!-- TODO 4: add minlength="3" maxlength="12" required -->',
			'  <label for="user">Username</label>',
			'  <input id="user" name="user">',
			'',
			'  <button>Save</button>',
			'</form>',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// Each pin is an attribute run the bare starter inputs cannot
			// produce; the outline preserves source order, so the adjacency
			// of each pair is exactly what the TODOs dictate.
			return stdout.includes('type="email" required') &&
				stdout.includes('type="number" min="1" max="99"') &&
				stdout.includes('pattern="[A-Z]{3}-[0-9]{4}" title="') &&
				stdout.includes('minlength="3" maxlength="12"');
		},

		solution: [
			'<style>input:invalid { border: 2px solid #d33; }</style>',
			'<form>',
			'  <label for="email">Email</label>',
			'  <input id="email" name="email" type="email" required>',
			'',
			'  <label for="qty">Quantity</label>',
			'  <input id="qty" name="qty" type="number" min="1" max="99">',
			'',
			'  <label for="code">Inventory code</label>',
			'  <input id="code" name="code" pattern="[A-Z]{3}-[0-9]{4}" title="Three capital letters, a dash, four digits (e.g. ABC-1234)">',
			'',
			'  <label for="user">Username</label>',
			'  <input id="user" name="user" minlength="3" maxlength="12" required>',
			'',
			'  <button>Save</button>',
			'</form>',
			'',
		].join('\n'),
	});
})();
