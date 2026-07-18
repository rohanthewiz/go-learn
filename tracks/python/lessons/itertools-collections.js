/* itertools-collections — the two workhorse stdlib modules. Counter with
 * most_common (ties break by insertion order — safe to pin), defaultdict(list)
 * grouping, deque + rotate, namedtuple, chain, and the groupby trap: it only
 * groups CONSECUTIVE keys, so the lesson demos unsorted-wrong THEN
 * sorted-right and the check pins both lines in order. islice over an
 * infinite count() is the laziness payoff from the generators lesson. Starter
 * hand-rolls the counting/grouping with plain dicts; none of the pinned
 * module-produced lines exist there.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'itertools-collections',
		title: 'itertools & collections',
		nav: 'Std toolkit',
		category: 'Power Features',

		prose: [
			'<h2>itertools & collections</h2>' +
			'<p>Half the loops you write already exist in the stdlib, debugged and ' +
			'in C. <code>collections</code> ships better containers: ' +
			'<code>Counter</code> is a dict that counts (<code>.most_common(k)</code> ' +
			'gives the top-k; ties break by first-seen order, which is why its ' +
			'output is deterministic); <code>defaultdict(list)</code> kills the ' +
			'<code>if key not in d: d[key] = []</code> dance — a missing key ' +
			'materializes as a fresh list on first touch; <code>deque</code> gives ' +
			'O(1) push/pop at <em>both</em> ends (a list\'s <code>pop(0)</code> is ' +
			'O(n)) plus <code>rotate</code>; <code>namedtuple</code> is a ' +
			'zero-boilerplate immutable record when a dataclass is overkill.</p>',
			{ lang: 'py', code: 'from collections import Counter, defaultdict\n\nCounter("abracadabra").most_common(2)   # [(\'a\', 5), (\'b\', 2)]\n\nd = defaultdict(list)\nd["k"].append(1)      # no KeyError — the list appears on demand' },
			'<p><code>itertools</code> is the lazy-iterator algebra: ' +
			'<code>chain</code> glues iterables end to end, <code>product</code> ' +
			'is nested loops as a stream, <code>islice</code> takes a window ' +
			'without materializing anything — even from <code>count()</code>, an ' +
			'iterator that never ends. That is the payoff of the generator lesson: ' +
			'infinite producers are fine as long as the consumer is lazy too.</p>' +
			'<p>And the classic trap: <code>groupby</code> groups ' +
			'<strong>consecutive</strong> equal keys only — it is a run-length ' +
			'tool, not SQL <code>GROUP BY</code>. Feed it unsorted data and one ' +
			'logical group comes back as several fragments, silently. ' +
			'<strong>Sort by the same key first</strong>, every time. The exercise ' +
			'makes you print the wrong result and the right one, back to back, so ' +
			'you recognize the fragment pattern when you meet it in the wild.</p>' +
			'<h3>Your job</h3>' +
			'<p>Replace the hand-rolled counting and grouping with ' +
			'<code>Counter</code> and <code>defaultdict(list)</code>, then add the ' +
			'<code>groupby</code> wrong-then-right demo, an ' +
			'<code>islice(count(10, 5), 4)</code> window, and a ' +
			'<code>deque</code> rotate. <em>Coming from Go:</em> this is the ' +
			'batteries-included contrast — Go gives you the map and the for loop ' +
			'and expects you to write the rest; Python\'s answer to "group by ' +
			'first letter" is one import away.</p>' +
			'<div class="tip">Iterating a dict is insertion-ordered (guaranteed ' +
			'since 3.7), but for output you want <em>stable meaning</em>, not ' +
			'stable accident — print groups via <code>sorted(groups)</code>.</div>',
		],

		task: 'Swap the hand-rolled dicts for Counter and defaultdict, then demo groupby unsorted-wrong vs sorted-right, islice over count(), and deque.rotate.',

		starter: [
			'# Hand-rolled versions of what collections/itertools already do.',
			'words = ["go", "py", "go", "rust", "py", "go"]',
			'',
			'# TODO 1: replace with Counter(words); print("top-2:", c.most_common(2))',
			'counts = {}',
			'for w in words:',
			'    counts[w] = counts.get(w, 0) + 1',
			'print("counts:", counts)   # counts, but no ranking — most_common is the point',
			'',
			'# TODO 2: replace with defaultdict(list) — no membership test needed;',
			'#         print each group as: letter -> [words], via sorted(groups).',
			'animals = ["ant", "bee", "ape", "bat", "cow"]',
			'groups = {}',
			'for w in animals:',
			'    if w[0] not in groups:   # the dance defaultdict deletes',
			'        groups[w[0]] = []',
			'    groups[w[0]].append(w)',
			'print("groups:", groups)',
			'',
			'# TODO 3: groupby trap — group ["b", "a", "b", "a"]: print the UNSORTED',
			'#         (fragmented) result, then the sorted (correct) one.',
			'',
			'# TODO 4: print list(islice(count(10, 5), 4)) — a window of an infinite stream.',
			'',
			'# TODO 5: deque([1..5]), rotate(2), print it.',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var iWrong = flat.indexOf("unsorted groupby: [('b', 1), ('a', 1), ('b', 1), ('a', 1)]");
			var iRight = flat.indexOf("sorted groupby: [('a', 2), ('b', 2)]");
			return flat.indexOf("top-2: [('go', 3), ('py', 2)]") !== -1 &&
				flat.indexOf("a -> ['ant', 'ape']") !== -1 &&   // grouped, printed sorted
				iWrong !== -1 && iRight !== -1 &&
				iWrong < iRight &&                              // fragments first, fix second
				flat.indexOf('islice: [10, 15, 20, 25]') !== -1 &&
				flat.indexOf('rotated: [4, 5, 1, 2, 3]') !== -1;
		},

		solution: [
			'from collections import Counter, defaultdict, deque, namedtuple',
			'from itertools import chain, groupby, islice, count',
			'',
			'# Counter: a dict that counts. Ties in most_common break by first-seen order.',
			'words = ["go", "py", "go", "rust", "py", "go"]',
			'c = Counter(words)',
			'print("top-2:", c.most_common(2))',
			'',
			'# defaultdict(list): a missing key materializes as [] on first touch.',
			'groups = defaultdict(list)',
			'for w in ["ant", "bee", "ape", "bat", "cow"]:',
			'    groups[w[0]].append(w)',
			'for letter in sorted(groups):        # sorted = stable meaning, not accident',
			'    print(letter, "->", groups[letter])',
			'',
			'# groupby groups CONSECUTIVE equal keys only — sort first or get fragments.',
			'data = ["b", "a", "b", "a"]',
			'wrong = [(k, len(list(g))) for k, g in groupby(data)]',
			'print("unsorted groupby:", wrong)    # four 1-element fragments: the trap',
			'right = [(k, len(list(g))) for k, g in groupby(sorted(data))]',
			'print("sorted groupby:", right)      # two real groups: the rule',
			'',
			'# islice takes a window of an INFINITE stream — laziness pays the bill.',
			'print("islice:", list(islice(count(10, 5), 4)))',
			'',
			'# deque: O(1) at both ends; rotate(2) carries the tail to the front.',
			'd = deque([1, 2, 3, 4, 5])',
			'd.rotate(2)',
			'print("rotated:", list(d))',
			'',
			'# chain glues iterables; namedtuple is a zero-boilerplate record.',
			'print("chain:", list(chain("ab", "cd")))',
			'Point = namedtuple("Point", "x y")',
			'print("point:", Point(2, 3))',
			'',
		].join('\n'),

		explanation: [
			'<p><code>Counter(words)</code> replaces the whole counting loop, and ' +
			'<code>most_common(2)</code> adds the ranking the hand-rolled dict ' +
			'never had. Its tie-breaking is insertion order, so with a fixed input ' +
			'the output is fully deterministic. <code>defaultdict(list)</code> ' +
			'removes the membership test: <code>groups[w[0]]</code> on a new letter ' +
			'calls the factory and returns a fresh list, ready to append.</p>',
			'<p>The <code>groupby</code> pair is the exhibit worth memorizing. On ' +
			'<code>["b", "a", "b", "a"]</code> it emits four one-element groups — ' +
			'it closed the <code>b</code> group the moment it saw <code>a</code>, ' +
			'because it only ever compares neighbors. After ' +
			'<code>sorted(data)</code> the equal keys are adjacent and you get ' +
			'<code>[(\'a\', 2), (\'b\', 2)]</code>. Same function, same data, ' +
			'opposite meaning — sorting by the grouping key is not optional.</p>',
			'<p><code>islice(count(10, 5), 4)</code> pulls exactly four values from ' +
			'a stream that never ends — <code>list(count(...))</code> would hang, ' +
			'but a lazy window is fine. <code>rotate(2)</code> moves the last two ' +
			'elements to the front in O(k), the deque\'s party trick; and ' +
			'<code>chain</code>/<code>namedtuple</code> round out the kit: ' +
			'concatenation without copying, records without ceremony.</p>',
		],
	});
})();
