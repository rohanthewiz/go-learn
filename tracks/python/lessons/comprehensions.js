/* comprehensions — the make-append-loop, retired. List comps as map+filter
 * in one readable line, dict and set comps, nested comps with the two-for
 * ceiling, and a generator-expression preview pointing at the iterators
 * lesson. Starter is three verbose append loops, the first missing its
 * filter, so the pinned evens-squared list is only reachable by adding the
 * predicate; the dict pin and flatten pin keep the other rewrites honest,
 * and an absence pin bans the unfiltered squares list.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'comprehensions',
		title: 'Comprehensions',
		nav: 'Comprehensions',
		category: 'Functions',

		prose: [
			'<h2>Comprehensions</h2>' +
			'<p>Go has exactly one way to build a slice from another slice: ' +
			'<code>make</code>, a <code>for</code> loop, <code>append</code>. ' +
			'Python keeps that loop available but almost never writes it, ' +
			'because a <strong>list comprehension</strong> says the same thing ' +
			'in one line: <code>[f(x) for x in xs if p(x)]</code>. Read it as ' +
			'three slots — an expression to compute (the <em>map</em>), a ' +
			'source to draw from, an optional predicate (the <em>filter</em>) ' +
			'— and it evaluates to a brand-new list:</p>',
			{ lang: 'py', code: 'names = ["Ada", "Grace", "Alan"]\nshort_upper = [n.upper() for n in names if len(n) <= 4]\n#              ^ map          ^ source     ^ filter\nprint(short_upper)                # [\'ADA\', \'ALAN\']' },
			'<p>The same shape builds other collections. ' +
			'<code>{k_expr: v_expr for x in xs}</code> is a dict ' +
			'comprehension; <code>{expr for x in xs}</code> (no colon) is a ' +
			'<em>set</em> comprehension. One habit to adopt immediately: sets ' +
			'are unordered, so anything set-derived gets printed through ' +
			'<code>sorted(...)</code> — never print a raw set.</p>',
			{ lang: 'py', code: 'lengths = {n: len(n) for n in names}     # dict comp\nprint(lengths["Grace"])                  # 5\ninitials = {n[0] for n in names}         # SET comp -- unordered!\nprint(sorted(initials))                  # [\'A\', \'G\'] -- always sorted()' },
			'<p>Comprehensions nest: a second <code>for</code> clause behaves ' +
			'exactly like a nested loop, written in the same left-to-right ' +
			'order as the loops it replaces — ' +
			'<code>[x for row in grid for x in row]</code> is the classic ' +
			'flatten. Rules of thumb worth keeping:</p>' +
			'<ul>' +
			'<li>Two <code>for</code> clauses is the ceiling. Three deep, or ' +
			'a comprehension you have to pause and decode, is worse than the ' +
			'loop it replaced — write the loop.</li>' +
			'<li>Comprehensions are for <em>building a value</em>. If you are ' +
			'calling something for its side effects, use a plain loop.</li>' +
			'<li>The loop variable is local to the comprehension — it does ' +
			'not leak into the enclosing scope.</li>' +
			'</ul>' +
			'<p>One preview: swap the square brackets for parentheses and you ' +
			'get a <strong>generator expression</strong> — ' +
			'<code>(x * x for x in xs)</code> — which computes nothing until ' +
			'iterated and never materializes a list at all. The iterators ' +
			'&amp; generators lesson makes that lazy world precise.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter builds three collections the Go way. Rewrite each ' +
			'as one comprehension: the squares of the <em>even</em> numbers ' +
			'(the loop version forgot the filter, so its printed list is ' +
			'wrong), a <code>word &rarr; length</code> dict, and a flattened ' +
			'grid.</p>' +
			'<div class="tip">Coming from Go: <code>result := make([]int, 0)</code> ' +
			'plus a loop and an <code>append</code> inside an <code>if</code> ' +
			'is five lines that bury the intent. The comprehension <em>is</em> ' +
			'the intent — and CPython special-cases it, so it is also faster ' +
			'than the append loop.</div>',
		],

		task: 'Rewrite the three append loops as comprehensions; the first must keep only EVEN numbers.',

		starter: [
			'nums = list(range(1, 11))          # 1..10',
			'',
			'# TODO: one list comprehension -- squares of the EVEN numbers only.',
			'# The loop below squares EVERYTHING, so the printed list is wrong.',
			'squares = []',
			'for n in nums:',
			'    squares.append(n * n)',
			'print("even squares:", squares)',
			'',
			'words = ["parrot", "spam", "eggs", "lumberjack"]',
			'',
			'# TODO: one dict comprehension: {w: len(w) for w in words}',
			'lengths = {}',
			'for w in words:',
			'    lengths[w] = len(w)',
			'for w, n in sorted(lengths.items()):',
			'    print(f"{w}={n}")',
			'',
			'grid = [[1, 2, 3], [4, 5], [6]]',
			'',
			'# TODO: one nested comprehension: [x for row in grid for x in row]',
			'flat_list = []',
			'for row in grid:',
			'    for x in row:',
			'        flat_list.append(x)',
			'print("flattened:", flat_list)',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.includes('even squares: [4, 16, 36, 64, 100]') &&
				flat.includes('eggs=4') &&
				flat.includes('lumberjack=10') &&
				flat.includes('flattened: [1, 2, 3, 4, 5, 6]') &&
				flat.indexOf('[1, 4, 9') === -1;
		},

		solution: [
			'nums = list(range(1, 11))          # 1..10',
			'',
			'# map (n * n) + filter (n % 2 == 0) + source, one line, one new list.',
			'even_squares = [n * n for n in nums if n % 2 == 0]',
			'print("even squares:", even_squares)',
			'',
			'words = ["parrot", "spam", "eggs", "lumberjack"]',
			'',
			'# Dict comprehension: key expression, colon, value expression.',
			'lengths = {w: len(w) for w in words}',
			'# sorted(...items()) yields (word, length) tuples in stable,',
			'# printable order; the loop header unpacks each pair directly.',
			'for w, n in sorted(lengths.items()):',
			'    print(f"{w}={n}")',
			'',
			'grid = [[1, 2, 3], [4, 5], [6]]',
			'',
			'# Two `for` clauses, read left to right exactly like the nested',
			'# loops they replace: outer `for row in grid`, inner `for x in row`.',
			'# Two is also the ceiling -- deeper than this, write the loop.',
			'flat_list = [x for row in grid for x in row]',
			'print("flattened:", flat_list)',
			'',
		].join('\n'),

		explanation: [
			'<p><code>[n * n for n in nums if n % 2 == 0]</code> reads in ' +
			'source order: take each <code>n</code> from <code>nums</code>, ' +
			'keep it if even, square it. The <code>if</code> clause is exactly ' +
			'what the starter loop was missing — its list held all ten ' +
			'squares, so the check refused it.</p>',
			'<p>The dict comprehension <code>{w: len(w) for w in words}</code> ' +
			'replaces create-empty-then-assign in one expression. ' +
			'<code>sorted(lengths.items())</code> hands back ' +
			'<code>(word, length)</code> tuples alphabetically, and the ' +
			'<code>for w, n in ...</code> header unpacks them — a taste of ' +
			'the unpacking lesson two stops from here.</p>',
			'<p>The flatten comp keeps its <code>for</code> clauses in loop ' +
			'order: <code>for row in grid</code> first, then ' +
			'<code>for x in row</code>. If you ever have to stop and decode a ' +
			'comprehension, that is the signal it wanted to be a loop — two ' +
			'<code>for</code>s is the honest maximum.</p>',
		],
	});
})();
