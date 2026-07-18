/* Form Controls — the catalog: text/email/password inputs, checkbox vs
 * radio (a radio group IS its shared name), select/option (value attribute
 * vs display text, selected), textarea (not void — content is its value),
 * and fieldset/legend grouping. The exercise builds a shipping section
 * inside a skeletal form; the check pins the fieldset/legend nesting at
 * exact depth, counts exactly three name="speed" radios with exactly one
 * checked, and pins the selected option and the sized textarea — none of
 * which the bare starter form can produce. Comment lines are stripped
 * before pinning so leftover TODOs cannot skew the counts. */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'form-controls',
		title: 'Form Controls',
		nav: 'form controls',
		category: 'Forms',

		prose: [
			'<h2>One tag, many personalities</h2>' +
			'<p>Most controls are the same void element wearing different ' +
			'<code>type</code> attributes. The three you will type most:</p>',
			{ lang: 'html', code: '<input type="text"     name="city">  <!-- free text (the default) -->\n<input type="email"    name="email"> <!-- format check + @ keyboard on mobile -->\n<input type="password" name="pw">    <!-- masked dots; value still submits -->' },
			'<p>The <code>type</code> changes the widget, the keyboard a ' +
			'phone offers, and what built-in validation applies — but every ' +
			'one still submits a plain <code>name=value</code> pair. Note ' +
			'<code>password</code> only masks the <em>screen</em>; the value ' +
			'travels like any other, which is one more reason forms that ' +
			'carry secrets use POST over HTTPS.</p>',
			'<h2>Checkbox vs radio — the name is the group</h2>' +
			'<p>Two more input types, and the difference between them is the ' +
			'whole lesson. A <strong>checkbox</strong> is an independent ' +
			'boolean: each one has its own <code>name</code>, and any number ' +
			'may be on at once. <strong>Radios</strong> are mutually ' +
			'exclusive — and they are exclusive <em>because they share a ' +
			'name</em>. There is no wrapper element declaring the group; the ' +
			'shared <code>name</code> attribute IS the group. The browser ' +
			'sees three inputs named <code>speed</code> and enforces ' +
			'&ldquo;only one of these may be checked&rdquo; on its own:</p>',
			{ lang: 'html', code: '<label><input type="radio" name="speed" value="standard" checked> Standard</label>\n<label><input type="radio" name="speed" value="express"> Express</label>' },
			'<p>Whichever is selected contributes <code>speed=standard</code> ' +
			'or <code>speed=express</code> — one name, one value, the ' +
			'<code>value</code> attribute of the winner. The boolean ' +
			'<code>checked</code> attribute pre-selects a default. And note ' +
			'the labeling trick above: wrapping the input <em>inside</em> the ' +
			'label binds them without needing <code>for</code>/<code>id</code>.</p>' +
			'<p>The preview pane is fully interactive — <em>go click the ' +
			'radios once you have built them</em>. Watch selecting one ' +
			'deselect its siblings, then change one radio\'s ' +
			'<code>name</code> and watch it leave the group and stop ' +
			'participating. No script does this; the shared name does.</p>',
			'<h2>select — the value is not the text</h2>' +
			'<p>A <code>&lt;select&gt;</code> is a drop-down of ' +
			'<code>&lt;option&gt;</code>s, and it splits what the human sees ' +
			'from what the server gets:</p>',
			{ lang: 'html', code: '<select name="country">\n  <option value="us">United States</option>\n  <option value="ca" selected>Canada</option>\n</select>' },
			'<p>The text between the tags is the <em>display</em>; the ' +
			'<code>value</code> attribute is what actually submits — here ' +
			'<code>country=ca</code>, never <code>country=Canada</code>. ' +
			'That split is deliberate: the label can be translated or ' +
			'reworded freely while the server keeps matching on a stable ' +
			'code. (Omit <code>value</code> and the display text submits — ' +
			'a fragile fallback to avoid.) The boolean <code>selected</code> ' +
			'pre-picks an option, playing the same role <code>checked</code> ' +
			'plays for radios.</p>',
			'<h2>textarea — not void, and sized by rows</h2>' +
			'<p>Multi-line text gets its own element, and it breaks the ' +
			'pattern twice. First, <code>&lt;textarea&gt;</code> is ' +
			'<strong>not void</strong> — it requires a closing tag, and ' +
			'whatever sits between the tags is its initial <em>value</em> ' +
			'(so even &ldquo;empty&rdquo; is written ' +
			'<code>&lt;textarea&gt;&lt;/textarea&gt;</code>, and stray ' +
			'indentation between the tags becomes real leading whitespace in ' +
			'the box). Second, there is no <code>value</code> attribute at ' +
			'all. <code>rows="3"</code> sizes the visible height in lines of ' +
			'text — the user can still type past it and scroll.</p>',
			{ lang: 'html', code: '<textarea name="notes" rows="3"></textarea>' },
			'<h2>fieldset and legend — grouping with meaning</h2>' +
			'<p>Related controls belong in a <code>&lt;fieldset&gt;</code> ' +
			'whose first child is a <code>&lt;legend&gt;</code> naming the ' +
			'group. Visually you get a drawn border and caption for free; ' +
			'the deeper win is for screen readers, which announce the legend ' +
			'together with each control inside — a user landing on the ' +
			'&ldquo;Express&rdquo; radio hears <em>&ldquo;Shipping, ' +
			'Express&rdquo;</em>, keeping context even when tabbing straight ' +
			'into the middle of the form. It is the natural wrapper for a ' +
			'radio group, giving the question (&ldquo;Shipping&rdquo;) a ' +
			'home while the shared name binds the answers.</p>',
			'<h3>Your job</h3>' +
			'<p>The starter is a valid but empty order form. Build its ' +
			'shipping section: a <code>fieldset</code> opening with the ' +
			'legend <code>Shipping</code>; inside it three label-wrapped ' +
			'radios sharing <code>name="speed"</code> (values ' +
			'<code>standard</code>, <code>express</code>, ' +
			'<code>overnight</code>) with the first pre-selected; then a ' +
			'<code>select name="country"</code> whose two options carry ' +
			'<code>value="us"</code> and <code>value="ca"</code> with Canada ' +
			'pre-selected; and finally a <code>textarea name="notes" ' +
			'rows="3"</code>. Then play with the result in the preview.</p>' +
			'<div class="tip">Boolean attributes like <code>checked</code> ' +
			'and <code>selected</code> take no value — the bare word is the ' +
			'whole attribute, and the outline prints it bare. Writing ' +
			'<code>checked="checked"</code> works in browsers but is just ' +
			'noise.</div>',
		],

		task: 'Build the shipping fieldset: legend, three name-sharing radios (one pre-selected), a select with valued options, and a sized textarea.',

		starter: [
			'<form action="/order" method="post">',
			'',
			'  <!-- TODO 1: add a fieldset whose FIRST child is a legend reading',
			'       Shipping, then put TODOs 2 inside it. -->',
			'',
			'  <!-- TODO 2: three radio inputs sharing the same name, "speed"',
			'       (values "standard", "express", "overnight"), each wrapped in a',
			'       label with its text. Pre-select the first one. -->',
			'',
			'  <!-- TODO 3: below the fieldset, a select named "country" with two',
			'       options: value "us" showing United States, value "ca" showing',
			'       Canada. Pre-select Canada. -->',
			'',
			'  <!-- TODO 4: a textarea named "notes" with rows="3" — remember its',
			'       explicit closing tag: textarea is not void. -->',
			'',
			'  <button type="submit">Place order</button>',
			'</form>',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// Strip comment lines (outline renders them as "# ...") so a
			// leftover TODO mentioning name="speed" cannot skew the count
			// and cannot break the fieldset/legend adjacency pin.
			var lines = stdout.split('\n').filter(function (l) {
				return l.replace(/^\s*/, '').charAt(0) !== '#';
			});
			var s = lines.join('\n');
			var f = s.replace(/\s+/g, ' ');
			// Exactly three controls in the speed group: the shared name IS
			// the radio group, so the count is the structure being taught.
			var speedCount = f.split('name="speed"').length - 1;
			// Exactly one pre-selected radio — mutual exclusivity on the wire.
			var checkedLines = 0;
			for (var i = 0; i < lines.length; i++) {
				if (lines[i].indexOf(' checked') !== -1) checkedLines++;
			}
			return s.indexOf('  fieldset\n    legend\n      "Shipping"') !== -1 &&
				speedCount === 3 &&
				checkedLines === 1 &&
				s.indexOf('option value="ca" selected') !== -1 &&
				s.indexOf('textarea name="notes" rows="3"') !== -1;
		},

		solution: [
			'<form action="/order" method="post">',
			'',
			'  <!-- fieldset/legend: draws the group AND makes screen readers say',
			'       "Shipping" with each control inside it. -->',
			'  <fieldset>',
			'    <legend>Shipping</legend>',
			'    <!-- The shared name IS the radio group: three inputs named',
			'         "speed" are mutually exclusive with no script and no',
			'         wrapper. checked pre-selects the sensible default. -->',
			'    <label><input type="radio" name="speed" value="standard" checked> Standard</label>',
			'    <label><input type="radio" name="speed" value="express"> Express</label>',
			'    <label><input type="radio" name="speed" value="overnight"> Overnight</label>',
			'  </fieldset>',
			'',
			'  <!-- value= is what submits (country=ca); the tag text is only what',
			'       the human sees. selected plays the role checked plays above. -->',
			'  <select name="country">',
			'    <option value="us">United States</option>',
			'    <option value="ca" selected>Canada</option>',
			'  </select>',
			'',
			'  <!-- textarea is NOT void: its content is its value, so "empty"',
			'       still needs the closing tag. rows sizes the visible height. -->',
			'  <textarea name="notes" rows="3"></textarea>',
			'',
			'  <button type="submit">Place order</button>',
			'</form>',
			'',
		].join('\n'),
	});
})();
