/* f-strings — one interpolation syntax to retire %-formatting, .format(),
 * and concatenation. Teaches expressions inside braces, !r repr conversion,
 * format specs (:.2f, :>8, :,), the debugging {x=} form, and quote nesting.
 * Starter is the historical mess (a % line, a .format() line, a str()+
 * concat line that loses the decimal formatting) with TODOs to modernize;
 * the check pins the right-aligned 2-decimal total line against RAW stdout
 * (flat would collapse the alignment spaces), the quoted repr 'gopher',
 * and the count=3 debug form — none reachable without f-string machinery.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'f-strings',
		title: 'f-strings',
		nav: 'f-strings',
		category: 'Foundations',

		prose: [
			'<h2>f-strings</h2>' +
			'<p>Python accumulated three ways to build strings — printf-style ' +
			'<code>%</code>, <code>.format()</code>, and plain concatenation — ' +
			'before landing on the one you should actually write: prefix the ' +
			'literal with <code>f</code> and put <em>any expression</em> in ' +
			'braces. Not just names: arithmetic, method calls, indexing — the ' +
			'braces evaluate, right there, at the point of use.</p>',
			{ lang: 'py', code: 'who = "world"\nprint(f"hello, {who}")            # interpolation\nprint(f"{2 + 2 = }")              # any EXPRESSION works in the braces\nprint(f"shout: {who.upper()}")    # method calls too\nprint(f"the {\'quoted\'} word")     # quotes nest freely inside the braces' },
			'<p>After a colon comes a <strong>format spec</strong>, and here is ' +
			'the good news coming from Go: it is essentially the ' +
			'<code>fmt.Sprintf</code> verb mini-language relocated. Go\'s ' +
			'<code>%8.2f</code> is Python\'s <code>{x:>8.2f}</code> — right-align ' +
			'in 8 columns, 2 decimal places. <code>&lt;</code> and ' +
			'<code>^</code> align left and center, <code>{x:,}</code> groups ' +
			'thousands (no Go verb does that!), and the spec lives next to the ' +
			'value it formats instead of in a separate verb string you must keep ' +
			'in sync by argument position.</p>' +
			'<p>Two conversions earn their keep daily. <code>{x!r}</code> formats ' +
			'with <code>repr()</code> instead of <code>str()</code> — strings ' +
			'keep their quotes, so empty and whitespace-laden values are visible ' +
			'in logs (Go\'s <code>%q</code>). And <code>{x=}</code>, the ' +
			'<strong>debug form</strong>, prints the expression text, an equals ' +
			'sign, and the value: <code>f"{count=}"</code> gives ' +
			'<code>count=3</code>. It is the fastest print-debugging syntax in ' +
			'any mainstream language.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter builds its output the three old ways — and the ' +
			'concatenation line loses the 2-decimal formatting entirely. Rewrite ' +
			'every print as an f-string: the greeting, the count, a total line ' +
			'right-aligned in 8 columns with 2 decimals ' +
			'(<code>{total:&gt;8.2f}</code>), a thousands-grouped ' +
			'<code>1234567</code>, the name with its quotes via <code>!r</code>, ' +
			'and the <code>{count=}</code> debug form.</p>' +
			'<div class="tip">The <code>f</code> prefix is what arms the braces — ' +
			'a plain <code>"{name}"</code> prints the braces literally. To print ' +
			'a literal brace inside an f-string, double it: ' +
			'<code>f"{{literal}}"</code>.</div>',
		],

		task: 'Rewrite every print as an f-string: aligned 2-decimal total, thousands separators, {name!r}, and {count=}.',

		starter: [
			'name = "gopher"',
			'count = 3',
			'total = 12.5',
			'',
			'# Three eras of string building -- all still legal, none of them what',
			'# you should write. TODO: make each print ONE f-string.',
			'print("hi, %s" % name)                 # 1990s: printf-style %',
			'print("count is {}".format(count))     # 2000s: .format()',
			'print("total: " + str(total))          # concatenation: 12.5, not 12.50',
			'',
			'# TODO: add, using f-strings only:',
			'#   - the total right-aligned in 8 columns, 2 decimals: {total:>8.2f}',
			'#   - 1234567 with thousands separators:                {1234567:,}',
			'#   - name WITH its quotes (repr):                      {name!r}',
			'#   - the debug form that prints  count=3:              {count=}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// Raw-stdout pins on purpose: flat collapses the alignment spaces
			// that :>8.2f exists to produce.
			return stdout.indexOf('hi, gopher') !== -1 &&
				stdout.indexOf('total:    12.50') !== -1 &&
				stdout.indexOf('1,234,567') !== -1 &&
				stdout.indexOf("'gopher'") !== -1 &&
				stdout.indexOf('count=3') !== -1;
		},

		solution: [
			'name = "gopher"',
			'count = 3',
			'total = 12.5',
			'',
			'# One syntax replaces %, .format(), and + -- the expression sits in',
			'# braces at the point of use, no positional verb-matching to break.',
			'print(f"hi, {name}")',
			'print(f"count is {count}")',
			'',
			'# Format spec after the colon. Coming from Go: %8.2f -> {total:>8.2f}',
			'# (right-align, width 8, 2 decimals) -- same mini-language, relocated',
			'# next to the value it formats.',
			'print(f"total: {total:>8.2f}")',
			'',
			'# :, groups thousands -- no fmt verb for this in Go.',
			'print(f"{1234567:,}")',
			'',
			'# !r formats with repr(): strings keep their quotes (Go\'s %q).',
			'print(f"{name!r}")',
			'',
			'# The = debug form echoes the expression text AND its value.',
			'print(f"{count=}")',
			'',
			'# Braces hold expressions, and quotes nest inside them freely.',
			'print(f"{name.upper()} has {len(name)} letters")',
			'',
		].join('\n'),

		explanation: [
			'<h3>The spec mini-language, relocated</h3>' +
			'<p><code>f"total: {total:&gt;8.2f}"</code> is the whole formatting ' +
			'story in one line: the braces evaluate <code>total</code>, then the ' +
			'spec after the colon renders it — <code>.2f</code> fixes two ' +
			'decimals (so <code>12.5</code> becomes <code>12.50</code>), and ' +
			'<code>&gt;8</code> right-aligns the result in eight columns, padding ' +
			'with spaces on the left. That is Go\'s <code>%8.2f</code>, but the ' +
			'spec sits on the value instead of in a distant verb string, so ' +
			'reordering arguments can never silently mismatch them. ' +
			'<code>{1234567:,}</code> inserts thousands separators — a spec Go\'s ' +
			'<code>fmt</code> simply does not have.</p>',
			'<p><code>{name!r}</code> switches the conversion from ' +
			'<code>str()</code> to <code>repr()</code>, printing ' +
			'<code>\'gopher\'</code> <em>with</em> its quotes — in a log line ' +
			'that is the difference between seeing an empty string and missing ' +
			'it. <code>{count=}</code> is pure debugging ergonomics: the f-string ' +
			'captures the source text of the expression, emits it, an equals ' +
			'sign, and the repr of the value — <code>count=3</code> from one ' +
			'token. It works with arbitrary expressions too: ' +
			'<code>f"{len(name)=}"</code> prints <code>len(name)=6</code>.</p>',
			'<p>The last line shows why f-strings displaced everything else: ' +
			'<code>{name.upper()}</code> and <code>{len(name)}</code> are real ' +
			'expressions evaluated in place, with their own quotes nesting inside ' +
			'the outer ones. No positional <code>%s</code> bookkeeping, no ' +
			'<code>.format()</code> argument shuffle — the value and its ' +
			'presentation live together.</p>',
		],
	});
})();
