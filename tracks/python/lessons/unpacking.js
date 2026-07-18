/* unpacking — tuple assignment as a pervasive idiom: the no-temp swap,
 * starred unpacks (first/*rest, *middle), unpacking directly in for-loop
 * headers over .items()/enumerate/zip, the zip(*matrix) transpose trick,
 * and the _ discard convention. Starter does everything by index juggling
 * (row[0], row[1], xs[0]) and never swaps, so the pinned swapped line,
 * rest list, transposed column, and `k: v` line are each only reachable by
 * writing the real unpacking form.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'unpacking',
		title: 'Unpacking Everywhere',
		nav: 'Unpacking',
		category: 'Functions',

		prose: [
			'<h2>Unpacking Everywhere</h2>' +
			'<p>Any assignment target in Python can be a <em>pattern</em>: ' +
			'<code>a, b = 1, 2</code> binds two names at once, and ' +
			'<code>a, b = b, a</code> swaps them with no temp variable — the ' +
			'right side is built as a tuple <em>before</em> any name on the ' +
			'left is rebound. Coming from Go: you have multiple assignment ' +
			'too (the swap even works), but Python generalizes it much ' +
			'further — a <code>*</code> in the pattern soaks up ' +
			'<em>the rest</em>:</p>',
			{ lang: 'py', code: 'first, *middle, last = [1, 2, 3, 4, 5]\nprint(first, middle, last)      # 1 [2, 3, 4] 5\nhead, *tail = "abc"             # any iterable unpacks, even a string\nprint(head, tail)               # a [\'b\', \'c\']' },
			'<p>Exactly one starred name is allowed per pattern; it always ' +
			'binds a <code>list</code> (possibly empty). The same patterns ' +
			'work in <code>for</code>-loop headers, which is where they earn ' +
			'their keep daily: <code>for k, v in d.items()</code>, ' +
			'<code>for i, x in enumerate(xs)</code>, ' +
			'<code>for a, b in zip(xs, ys)</code>. When a slot is required ' +
			'but unwanted, the convention is <code>_</code> — a perfectly ' +
			'ordinary variable name that signals <em>discarded on ' +
			'purpose</em> (unlike Go&#39;s <code>_</code>, which the ' +
			'compiler enforces, this one is pure convention).</p>' +
			'<p>The star also works on the <em>call</em> side: ' +
			'<code>f(*args)</code> splats a sequence into positional ' +
			'arguments (the function-arguments lesson covered the receiving ' +
			'side). That enables the famous party trick — ' +
			'<code>zip(*matrix)</code> spreads the rows into ' +
			'<code>zip</code>, which then pairs up first elements, second ' +
			'elements, and so on: a one-call transpose.</p>',
			{ lang: 'py', code: 'pairs = [("x", 1), ("y", 2)]\nfor i, (name, _) in enumerate(pairs):   # patterns nest; _ discards\n    print(i, name)                      # 0 x  /  1 y\nprint(list(zip(*pairs)))                # [(\'x\', \'y\'), (1, 2)]' },
			'<h3>Your job</h3>' +
			'<p>The starter juggles indices — <code>xs[0]</code>, ' +
			'<code>row[0]</code>, <code>ages[k]</code> — and never actually ' +
			'swaps. Replace each piece with the unpacking form: a one-line ' +
			'swap, <code>first, *rest = xs</code> (print both), the ' +
			'<code>zip(*matrix)</code> transpose printed one column per ' +
			'line, and a <code>for k, v in ages.items()</code> loop printing ' +
			'<code>k: v</code>.</p>' +
			'<div class="tip">The mental model for the swap: the right-hand ' +
			'side <code>b, a</code> is evaluated into a fresh tuple first, ' +
			'then the left-hand pattern is matched against it — so both old ' +
			'values are already safe before either name is rebound.</div>',
		],

		task: 'Replace the index juggling: one-line swap, first/*rest, zip(*matrix) transpose, and k: v via .items().',

		starter: [
			'# --- swap ---',
			'a, b = 1, 2',
			'# TODO: swap them in ONE line, no temp:  a, b = b, a',
			'print("swapped:", a, b)          # still 1 2 -- not swapped yet',
			'',
			'# --- head / tail ---',
			'xs = [10, 20, 30, 40, 50]',
			'first = xs[0]                    # index juggling',
			'# TODO: first, *rest = xs   -- then print rest too:',
			'#       print("first:", first, "rest:", rest)',
			'print("first:", first)',
			'',
			'# --- transpose ---',
			'matrix = [[1, 2, 3], [4, 5, 6]]',
			'# We want COLUMNS, one per line. Index juggling only shows rows.',
			'# TODO: for col in zip(*matrix): print("col:", list(col))',
			'for row in matrix:',
			'    print("row:", row[0], row[1], row[2])',
			'',
			'# --- dict items ---',
			'ages = {"ada": 36, "alan": 41}',
			'# TODO: unpack pairs in the header and print "k: v":',
			'#       for k, v in ages.items(): print(f"{k}: {v}")',
			'for k in ages:',
			'    print(k, ages[k])            # works, but no unpacking, no colon',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.includes('swapped: 2 1') &&
				flat.indexOf('swapped: 1 2') === -1 &&
				flat.includes('rest: [20, 30, 40, 50]') &&
				flat.includes('col: [1, 4]') &&
				flat.includes('ada: 36');
		},

		solution: [
			'# --- swap ---',
			'a, b = 1, 2',
			'# RHS builds the tuple (2, 1) BEFORE the left side rebinds, so',
			'# neither value is lost. No temp variable, ever.',
			'a, b = b, a',
			'print("swapped:", a, b)',
			'',
			'# --- head / tail ---',
			'xs = [10, 20, 30, 40, 50]',
			'# The starred name soaks up whatever the plain names do not take;',
			'# it always binds a list (empty if nothing is left over).',
			'first, *rest = xs',
			'print("first:", first, "rest:", rest)',
			'',
			'# --- transpose ---',
			'matrix = [[1, 2, 3], [4, 5, 6]]',
			'# zip(*matrix) == zip([1, 2, 3], [4, 5, 6]): the splat spreads the',
			'# rows into arguments, and zip pairs them up index by index.',
			'for col in zip(*matrix):',
			'    print("col:", list(col))',
			'',
			'# --- dict items ---',
			'ages = {"ada": 36, "alan": 41}',
			'# .items() yields (key, value) tuples; the loop header unpacks',
			'# each one -- no ages[k] lookup needed inside the body.',
			'for k, v in ages.items():',
			'    print(f"{k}: {v}")',
			'',
		].join('\n'),

		explanation: [
			'<p><code>a, b = b, a</code> works because assignment is ' +
			'two-phase: evaluate the whole right side into a tuple, then ' +
			'match the left pattern against it. Both old values already live ' +
			'in that tuple, so nothing needs a temp.</p>',
			'<p><code>first, *rest = xs</code> splits head from tail in one ' +
			'pattern — <code>rest</code> is a real list, ' +
			'<code>[20, 30, 40, 50]</code>. The mirror images ' +
			'<code>*init, last = xs</code> and ' +
			'<code>first, *middle, last = xs</code> work too; the one rule ' +
			'is a single star per pattern.</p>',
			'<p><code>zip(*matrix)</code> is call-side splatting: the rows ' +
			'become <code>zip</code>&#39;s arguments, and <code>zip</code> ' +
			'walks them in lockstep, yielding column tuples ' +
			'<code>(1, 4)</code>, <code>(2, 5)</code>, <code>(3, 6)</code>. ' +
			'Wrapping each in <code>list(...)</code> just prints square ' +
			'brackets to make the shape obvious.</p>',
			'<p><code>for k, v in ages.items()</code> is loop-header ' +
			'unpacking — the everyday form you will write most: no index, ' +
			'no second lookup, both names bound per iteration. Dicts ' +
			'preserve insertion order, so the lines print in the order the ' +
			'literal listed them.</p>',
		],
	});
})();
