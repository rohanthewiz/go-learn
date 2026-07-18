/* lambdas-sorting — lambda as a single-expression function, and sorted()'s
 * key= as the "sort BY what" question (vs Go's sort.Slice less-func).
 * Covers reverse=True, tuple keys for multi-level ordering, sort STABILITY
 * with printed evidence, min/max with key, and operator.itemgetter. The
 * starter sorts (name, score) tuples with the default element-wise order —
 * alphabetical, not a leaderboard — so the check's indexOf ordering across
 * the four names is only reachable with the (-score, name) tuple key; the
 * stability pin and the min/max line cover the other two tasks.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'lambdas-sorting',
		title: 'Lambdas & Sorting',
		nav: 'Sorting',
		category: 'Functions',

		prose: [
			'<h2>Lambdas &amp; Sorting</h2>' +
			'<p>A <code>lambda</code> is a function with no name and exactly ' +
			'one expression: <code>lambda n: n * 2</code>. That is the whole ' +
			'feature — no statements, no annotations, no second line. It ' +
			'exists for one purpose: handing a small function to something ' +
			'that takes one, right at the call site. The moment it grows past ' +
			'one obvious expression, give it a name with <code>def</code> — a ' +
			'named function gets a docstring, a traceback that reads well, ' +
			'and room to breathe.</p>',
			{ lang: 'py', code: 'words = ["bb", "a", "ccc"]\nprint(sorted(words, key=len))               # [\'a\', \'bb\', \'ccc\']\nprint(sorted(words, key=len, reverse=True)) # [\'ccc\', \'bb\', \'a\']\nprint(max(words, key=len))                  # ccc -- min/max take key= too' },
			'<p>Look closely at what <code>key=</code> is. Coming from Go: ' +
			'<code>sort.Slice</code> hands you two indices and asks ' +
			'<em>which of these is smaller?</em> — you write a comparator. ' +
			'Python asks a different question: <em>what should I sort each ' +
			'item BY?</em> The key function is called once per element, the ' +
			'resulting keys are compared with plain <code>&lt;</code>, and ' +
			'the original items ride along. One-argument key functions are ' +
			'shorter than comparators, impossible to make inconsistent, and ' +
			'faster — each key is computed once, not once per comparison.</p>' +
			'<p>Multi-level sorts fall out of tuple comparison: tuples ' +
			'compare element by element, so ' +
			'<code>key=lambda s: (-s[1], s[0])</code> means score ' +
			'<em>descending</em> (negate the number to flip just that level) ' +
			'then name <em>ascending</em>. <code>reverse=True</code> would ' +
			'flip every level at once — negation is the scalpel. And ' +
			'Python&#39;s sort is guaranteed <strong>stable</strong>: items ' +
			'with equal keys keep their input order, so ties never reshuffle ' +
			'behind your back.</p>',
			{ lang: 'py', code: 'from operator import itemgetter\npairs = [("b", 2), ("a", 1)]\n# itemgetter(1) is the named, faster spelling of lambda p: p[1]\nprint(sorted(pairs, key=itemgetter(1)))     # [(\'a\', 1), (\'b\', 2)]' },
			'<h3>Your job</h3>' +
			'<p>The starter sorts a <code>(name, score)</code> leaderboard ' +
			'with the default tuple order — element-wise, so alphabetical by ' +
			'name. Fix it three ways: rank by score descending then name ' +
			'ascending with a tuple key; sort by score <em>only</em> and ' +
			'print the names to show stability (equal scores keep input ' +
			'order); and use <code>operator.itemgetter(1)</code> with ' +
			'<code>max</code>/<code>min</code> to print the top and bottom ' +
			'scorer on one line.</p>' +
			'<div class="tip">When the two 95s tie in the ranked sort, the ' +
			'tuple key breaks the tie by name — but in the score-only sort ' +
			'nothing breaks it, and stability quietly preserves the input ' +
			'order. That guarantee is why you can sort by a secondary key ' +
			'first, then the primary, and the tiebreak survives.</div>',
		],

		task: 'Rank by (-score, name) tuple key, show stability with a score-only sort, and use itemgetter with max/min.',

		starter: [
			'scores = [("mel", 82), ("ada", 95), ("kay", 82), ("lin", 95)]',
			'',
			'# Default tuple comparison goes element by element: NAME first.',
			'# An alphabetical leaderboard is not a leaderboard.',
			'# TODO: key=lambda s: (-s[1], s[0])  ->  score DESC, then name ASC',
			'for name, score in sorted(scores):',
			'    print(name, score)',
			'',
			'# TODO: sort by score ONLY (key=lambda s: s[1]) and print just the',
			'# names as a list, labelled "stable:" -- equal scores must keep',
			'# their input order. That is stability, and it is guaranteed.',
			'',
			'# TODO: from operator import itemgetter; use it as the key for',
			'# max() and min() to print:  top: <name> low: <name>',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var a = flat.indexOf('ada 95');
			var l = flat.indexOf('lin 95');
			var k = flat.indexOf('kay 82');
			var m = flat.indexOf('mel 82');
			return a !== -1 && l !== -1 && k !== -1 && m !== -1 &&
				a < l && l < k && k < m &&
				flat.includes("stable: ['mel', 'kay', 'ada', 'lin']") &&
				flat.includes('top: ada low: mel');
		},

		solution: [
			'from operator import itemgetter',
			'',
			'scores = [("mel", 82), ("ada", 95), ("kay", 82), ("lin", 95)]',
			'',
			"# Tuple key: compare -score first (negation = descending), then",
			"# name. The lambda computes a KEY per element -- unlike Go's",
			'# sort.Slice less-func, it never sees two items at once.',
			'for name, score in sorted(scores, key=lambda s: (-s[1], s[0])):',
			'    print(name, score)',
			'',
			'# Stability: sorting by score ONLY leaves equal-score items in',
			'# input order. mel came before kay in the source list, so mel',
			'# stays first among the 82s; ada before lin among the 95s.',
			'by_score = sorted(scores, key=lambda s: s[1])',
			'print("stable:", [name for name, _ in by_score])',
			'',
			'# itemgetter(1) is the named spelling of lambda s: s[1], and',
			'# min/max accept the same key= that sorted does. On a tie they',
			'# return the FIRST maximal/minimal element (stability again).',
			'top = max(scores, key=itemgetter(1))',
			'low = min(scores, key=itemgetter(1))',
			'print("top:", top[0], "low:", low[0])',
			'',
		].join('\n'),

		explanation: [
			'<p><code>key=lambda s: (-s[1], s[0])</code> builds a tuple key ' +
			'per element: <code>("ada", 95)</code> becomes ' +
			'<code>(-95, "ada")</code>. Tuples compare element-wise, so ' +
			'scores order descending first, and only ties fall through to ' +
			'the name — which is why <code>ada</code> beats <code>lin</code> ' +
			'at 95 and <code>kay</code> beats <code>mel</code> at 82.</p>',
			'<p>The score-only sort is the stability exhibit: nothing in the ' +
			'key distinguishes the two 82s or the two 95s, so each pair ' +
			'keeps its input order — <code>mel</code> before <code>kay</code>, ' +
			'<code>ada</code> before <code>lin</code>. The printed ' +
			'<code>[\'mel\', \'kay\', \'ada\', \'lin\']</code> is exactly that ' +
			'guarantee made visible.</p>',
			'<p><code>itemgetter(1)</code> from the <code>operator</code> ' +
			'module is the idiomatic, slightly faster spelling of ' +
			'<code>lambda s: s[1]</code> — reach for it when the key is a ' +
			'plain index or attribute grab. <code>max</code> and ' +
			'<code>min</code> take the same <code>key=</code>, and on ties ' +
			'return the first winner in input order: <code>ada</code> for ' +
			'top, <code>mel</code> for low.</p>',
		],
	});
})();
