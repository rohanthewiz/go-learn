/* iterators-generators — the iterator protocol hand-rolled first (__iter__/
 * __next__/StopIteration), then `yield` as a frame that suspends. The whole
 * lesson hinges on EVIDENCE of laziness: log lines inside the generator prove
 * the body does not run at call time and interleaves with the consumer, and a
 * second list() over an exhausted generator prints []. Starter builds every
 * intermediate list eagerly; the check pins the interleaved log order with an
 * indexOf chain, the genexp sum, and the one-shot exhaustion proof — none of
 * which the eager version can produce.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'iterators-generators',
		title: 'Iterators & Generators',
		nav: 'Generators',
		category: 'Power Features',

		prose: [
			'<h2>Iterators & Generators</h2>' +
			'<p>Every <code>for</code> loop in Python runs the same tiny protocol: ' +
			'<code>iter(x)</code> asks for an iterator (calls ' +
			'<code>x.__iter__()</code>), then <code>next(it)</code> is called ' +
			'repeatedly (calls <code>it.__next__()</code>) until it raises ' +
			'<code>StopIteration</code> — which is not an error but the ' +
			'protocol\'s "done" signal, and the loop swallows it silently. You can ' +
			'hand-roll the whole thing as a class with those two methods, and you ' +
			'should do it once, because it demystifies everything that iterates: ' +
			'<code>for</code>, <code>list()</code>, <code>sum()</code>, unpacking, ' +
			'<code>in</code> — all just <code>next()</code> in a trench coat.</p>',
			{ lang: 'py', code: 'it = iter([10, 20])\nprint(next(it))   # 10\nprint(next(it))   # 20\nnext(it)          # raises StopIteration — the loop\'s exit signal' },
			'<p>Hand-rolling is verbose, so Python gives you <strong>generators' +
			'</strong>: any function containing <code>yield</code>. Calling one runs ' +
			'<em>none</em> of the body — it returns a generator object whose frame ' +
			'(locals, instruction pointer, everything) starts frozen. Each ' +
			'<code>next()</code> resumes the frame until the next ' +
			'<code>yield</code>, which suspends it again with all state intact. Put ' +
			'<code>print</code> calls around the <code>yield</code> and the ' +
			'interleaving with the consumer becomes visible in the output — ' +
			'producer and consumer take turns, one value at a time. <em>Coming ' +
			'from Go:</em> this is the unbuffered-channel producer pattern (or ' +
			'1.23\'s <code>range</code>-over-func), minus the goroutine — one ' +
			'control thread, cooperative hand-offs, and no <code>close()</code> to ' +
			'forget: falling off the end raises <code>StopIteration</code> for ' +
			'you.</p>' +
			'<p>Two consequences matter in practice. <strong>Memory:</strong> a ' +
			'generator expression like <code>sum(x*x for x in range(10**9))</code> ' +
			'holds one value at a time where the list comprehension would hold a ' +
			'billion. <strong>One-shot:</strong> a generator is a cursor, not a ' +
			'collection — once exhausted, iterating it again yields nothing, ' +
			'silently. That silent empty second pass is a classic bug; here we turn ' +
			'it into evidence.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter computes everything eagerly: the countdown builds and ' +
			'returns a full list (its log lines all print <em>before</em> the ' +
			'consumer sees anything), and the sum of squares builds a throwaway ' +
			'list first. Rewrite <code>countdown</code> as a generator so the logs ' +
			'interleave with the loop, add the hand-rolled <code>Countdown</code> ' +
			'iterator class, switch the sum to a generator expression, and add the ' +
			'exhausted-generator demo (two <code>list()</code> passes over one ' +
			'generator).</p>' +
			'<div class="tip">Run the starter and the solution and diff the ' +
			'<em>order</em> of the lines, not just their content. Eager: all ' +
			'<code>[gen]</code> lines, then all <code>got</code> lines. Lazy: ' +
			'strictly alternating. The output order <em>is</em> the lesson.</div>',
		],

		task: 'Make countdown a real generator (logs interleaving with the loop), hand-roll a Countdown iterator class, sum squares via a genexp, and show a generator exhausting.',

		starter: [
			'# EAGER version: every value exists in memory before anyone consumes it.',
			'# TODO 1: hand-roll a Countdown iterator class with __iter__/__next__',
			'#         that raises StopIteration when done; print list(Countdown(3)).',
			'',
			'# TODO 2: rewrite countdown as a GENERATOR — replace the append with `yield n`',
			'#         (log "about to yield" instead) and watch the logs interleave with',
			'#         the consumer instead of front-running it.',
			'def countdown(n):',
			'    print("  [gen] entered with n =", n)',
			'    result = []',
			'    while n > 0:',
			'        print("  [gen] about to append", n)',
			'        result.append(n)',
			'        n -= 1',
			'    print("  [gen] falling off the end")',
			'    return result',
			'',
			'print("creating the generator...")',
			'g = countdown(2)              # the WHOLE body already ran, right here',
			'print("...nothing ran yet")   # not true yet — the log lines above disprove it',
			'for x in g:',
			'    print("got", x)',
			'print("loop done")',
			'',
			'# TODO 3: drop the intermediate list — pass a generator expression to sum().',
			'squares = [x * x for x in range(5)]   # full list built just to be thrown away',
			'print("sum of squares:", sum(squares))',
			'',
			'# TODO 4: show one-shot-ness — list() the same generator twice, print both passes.',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// The interleaving is the whole point: pin the exact lazy order.
			var iCreate = flat.indexOf('...nothing ran yet');
			var iEnter = flat.indexOf('[gen] entered with n = 2');
			var iY2 = flat.indexOf('[gen] about to yield 2');
			var iG2 = flat.indexOf('got 2');
			var iY1 = flat.indexOf('[gen] about to yield 1');
			var iG1 = flat.indexOf('got 1');
			var iEnd = flat.indexOf('[gen] falling off the end');
			var iDone = flat.indexOf('loop done');
			return flat.indexOf('hand-rolled: [3, 2, 1]') !== -1 &&
				iCreate !== -1 && iEnter !== -1 && iY2 !== -1 && iG2 !== -1 &&
				iY1 !== -1 && iG1 !== -1 && iEnd !== -1 && iDone !== -1 &&
				iCreate < iEnter &&              // creating the generator ran no body code
				iEnter < iY2 && iY2 < iG2 &&     // producer/consumer alternate...
				iG2 < iY1 && iY1 < iG1 &&        // ...value by value
				iG1 < iEnd && iEnd < iDone &&
				flat.indexOf('sum of squares: 30') !== -1 &&
				flat.indexOf('first pass: [0, 10, 20]') !== -1 &&
				flat.indexOf('second pass: []') !== -1;   // exhaustion evidence
		},

		solution: [
			'# --- The protocol, hand-rolled: iter() wants __iter__, next() wants __next__ ---',
			'class Countdown:',
			'    def __init__(self, start):',
			'        self.n = start',
			'',
			'    def __iter__(self):',
			'        return self          # this object IS its own iterator',
			'',
			'    def __next__(self):',
			'        if self.n <= 0:',
			'            raise StopIteration   # the protocol\'s "done" signal — not an error',
			'        value = self.n',
			'        self.n -= 1',
			'        return value',
			'',
			'print("hand-rolled:", list(Countdown(3)))',
			'',
			'# --- The same machine as a generator: yield suspends the frame ---',
			'def countdown(n):',
			'    print("  [gen] entered with n =", n)',
			'    while n > 0:',
			'        print("  [gen] about to yield", n)',
			'        yield n              # frame FREEZES here; resumes on the next next()',
			'        n -= 1',
			'    print("  [gen] falling off the end")   # falling off => StopIteration',
			'',
			'print("creating the generator...")',
			'g = countdown(2)',
			'print("...nothing ran yet")   # true now: no [gen] line has printed',
			'for x in g:',
			'    print("got", x)          # interleaves: yield 2, got 2, yield 1, got 1',
			'print("loop done")',
			'',
			'# --- Generator expression: sum() pulls one square at a time, no list built ---',
			'print("sum of squares:", sum(x * x for x in range(5)))',
			'',
			'# --- Generators are one-shot: a cursor, not a collection ---',
			'g2 = (n * 10 for n in range(3))',
			'print("first pass:", list(g2))',
			'print("second pass:", list(g2))   # [] — exhausted generators stay exhausted',
			'',
		].join('\n'),

		explanation: [
			'<p><code>Countdown</code> is the protocol with no sugar: ' +
			'<code>__iter__</code> returns the iterator (here, itself), and ' +
			'<code>__next__</code> either returns a value or raises ' +
			'<code>StopIteration</code>. <code>list()</code> just calls those until ' +
			'the raise.</p>',
			'<p>The generator version proves laziness twice. First, ' +
			'<code>g = countdown(2)</code> prints nothing — the body has not ' +
			'started, so <code>...nothing ran yet</code> appears <em>before</em> ' +
			'<code>[gen] entered</code>. Second, the logs alternate with ' +
			'<code>got</code> lines: each <code>next()</code> runs the frame only ' +
			'up to the next <code>yield</code>, then control returns to the loop, ' +
			'and the frame keeps <code>n</code> alive between resumptions.</p>',
			'<p><code>sum(x * x for x in range(5))</code> feeds squares one at a ' +
			'time — same answer as the list version, O(1) extra memory instead of ' +
			'O(n). And <code>g2</code> shows the cost of being a cursor: the first ' +
			'<code>list()</code> drains it, the second gets <code>[]</code> with no ' +
			'warning. Need two passes? Call the generator function twice, or ' +
			'materialize a list deliberately.</p>',
		],
	});
})();
