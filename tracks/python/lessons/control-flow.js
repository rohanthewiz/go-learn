/* control-flow — if/elif/else, truthiness, while, iterable-for, range,
 * enumerate/zip, break/continue, and the for…else oddity. Starter walks
 * lists with C-style range(len(xs)) indexing and a flag-variable search;
 * solution Pythonifies: enumerate(start=1), zip with an arrow format, and a
 * for/else search run twice so BOTH branches print. Check pins the
 * "1. alpha" enumerate line, the "alpha -> 8001" zip line (a format the
 * starter's comma-print can't produce), and "not found" BEFORE "found at 2"
 * — the ordering pin proves both for/else outcomes were exercised.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'control-flow',
		title: 'Control Flow',
		nav: 'Control flow',
		category: 'Foundations',

		prose: [
			'<h2>Control Flow</h2>' +
			'<p>Python\'s <code>if/elif/else</code> reads like Go\'s ' +
			'<code>if/else if/else</code> minus the braces and parens — the colon ' +
			'and indentation ARE the block. What goes <em>inside</em> the ' +
			'condition is looser than Go: any value can be tested, and Python ' +
			'calls it <strong>truthy</strong> or <strong>falsy</strong>. The falsy ' +
			'set is short and worth memorizing:</p>' +
			'<ul>' +
			'<li><code>False</code>, <code>None</code></li>' +
			'<li>zero of any numeric type: <code>0</code>, <code>0.0</code></li>' +
			'<li>empty containers: <code>""</code>, <code>[]</code>, ' +
			'<code>{}</code>, <code>set()</code>, <code>()</code></li>' +
			'</ul>' +
			'<p>Everything else is truthy, so <code>if not items:</code> is the ' +
			'idiomatic emptiness test. <code>while</code> covers Go\'s ' +
			'condition-only <code>for</code>; <code>break</code> and ' +
			'<code>continue</code> work exactly as you expect. There is no ' +
			'<code>switch</code> — Python 3.10 added <code>match</code>, a far ' +
			'more powerful pattern-matcher that gets its own lesson later in this ' +
			'track.</p>',
			{ lang: 'py', code: 'if not items:                 # empty list is falsy\n    print("nothing to do")\n\nn = 3\nwhile n > 0:                  # Go\'s `for n > 0 { ... }`\n    n -= 1\n\nfor i in range(10, 0, -2):    # range(start, stop, step)\n    print(i)                  # 10 8 6 4 2 — stop is exclusive' },
			'<p>The <code>for</code> loop iterates over <em>anything iterable</em> ' +
			'— lists, strings, dicts, files, generators — it never counts. Coming ' +
			'from Go: <code>for i, v := range xs</code> becomes ' +
			'<code>for i, v in enumerate(xs)</code> (with an optional ' +
			'<code>start=1</code> for human numbering), and walking two sequences ' +
			'in lockstep is <code>for a, b in zip(xs, ys)</code>. Writing ' +
			'<code>for i in range(len(xs))</code> is a C accent — it works, but it ' +
			'tells every reader you need the index when you only needed the ' +
			'values.</p>' +
			'<p>One genuine oddity: a <code>for</code> loop can have an ' +
			'<code>else</code> block, and it runs only when the loop finished ' +
			'<strong>without hitting <code>break</code></strong>. That makes it ' +
			'the natural home for the "searched everything, found nothing" case — ' +
			'no flag variable needed.</p>' +
			'<h3>Your job</h3>' +
			'<p>Pythonify the starter: number the words with ' +
			'<code>enumerate(words, start=1)</code> printing <code>1. alpha</code> ' +
			'lines, pair words with ports via <code>zip</code> printing ' +
			'<code>alpha -&gt; 8001</code> lines, and rewrite the flag-variable ' +
			'search as a <code>for/else</code> — run it for <code>"delta"</code> ' +
			'(prints <code>not found</code>) and then <code>"gamma"</code> ' +
			'(prints <code>found at 2</code>).</p>' +
			'<div class="tip">Read <code>for…else</code> as "for…nobreak" — the ' +
			'keyword choice is widely considered a naming mistake, but the ' +
			'behavior is precise: <code>else</code> runs on loop exhaustion, and ' +
			'is skipped on <code>break</code>. Pair it only with loops that ' +
			'contain a <code>break</code>; otherwise the else is just ' +
			'unconditional code with extra indentation.</div>',
		],

		task: 'Replace range(len(...)) with enumerate and zip, and the flag-variable search with for/else — exercise both outcomes.',

		starter: [
			'words = ["alpha", "beta", "gamma"]',
			'ports = [8001, 8002, 8003]',
			'',
			'# C-style counting loop. TODO: for n, w in enumerate(words, start=1)',
			'# printing f"{n}. {w}" — "1. alpha" etc.',
			'for i in range(len(words)):',
			'    print(words[i])',
			'',
			'# Parallel indexing. TODO: for w, p in zip(words, ports)',
			'# printing f"{w} -> {p}" — "alpha -> 8001" etc.',
			'for i in range(len(words)):',
			'    print(words[i], ports[i])',
			'',
			'# Flag-variable search. TODO: rewrite as a for/else search function:',
			'# break with "found at {i}" on a hit; the else prints "not found"',
			'# ONLY when the loop ran out without breaking. Then call it for',
			'# "delta" (miss) and "gamma" (hit at index 2) — in that order.',
			'found = -1',
			'for i in range(len(words)):',
			'    if words[i] == "gamma":',
			'        found = i',
			'print("found:", found)',
			'',
			'# Truthiness demo — already idiomatic, keep it as is.',
			'for v in ["", [], 0, None, "go", [1]]:',
			'    print(repr(v), "->", "truthy" if v else "falsy")',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('1. alpha') !== -1 &&
				flat.indexOf('alpha -> 8001') !== -1 &&
				flat.indexOf('not found') !== -1 &&
				flat.indexOf('found at 2') !== -1 &&
				// the miss runs first — proves BOTH for/else outcomes fired:
				flat.indexOf('not found') < flat.indexOf('found at 2');
		},

		solution: [
			'words = ["alpha", "beta", "gamma"]',
			'ports = [8001, 8002, 8003]',
			'',
			'# enumerate hands you (index, value) pairs; start=1 shifts the count',
			'# for human-facing numbering without touching the data.',
			'for n, w in enumerate(words, start=1):',
			'    print(f"{n}. {w}")',
			'',
			'# zip walks the sequences in lockstep and stops at the shorter one —',
			'# no index variable, no off-by-one surface.',
			'for w, p in zip(words, ports):',
			'    print(f"{w} -> {p}")',
			'',
			'def find(xs, target):',
			'    for i, x in enumerate(xs):',
			'        if x == target:',
			'            print(f"found at {i}")',
			'            break            # skips the else below',
			'    else:',
			'        # Runs ONLY when the loop exhausted without break —',
			'        # the "searched everything, found nothing" branch.',
			'        print("not found")',
			'',
			'find(words, "delta")   # loop runs dry -> else fires',
			'find(words, "gamma")   # break at index 2 -> else skipped',
			'',
			'# Truthiness: empty containers, zero, and None are falsy;',
			'# everything else is truthy.',
			'for v in ["", [], 0, None, "go", [1]]:',
			'    print(repr(v), "->", "truthy" if v else "falsy")',
			'',
		].join('\n'),

		explanation: [
			'<p>The first two loops shed their index bookkeeping: ' +
			'<code>enumerate(words, start=1)</code> yields ' +
			'<code>(1, "alpha")</code>, <code>(2, "beta")</code>… and ' +
			'<code>zip(words, ports)</code> yields the pairs directly. Nothing is ' +
			'indexed, so nothing can be off by one.</p>',
			'<p>The search is where <code>for/else</code> earns its keep: the ' +
			'starter\'s flag variable (<code>found = -1</code>, overwrite on hit, ' +
			'inspect after the loop) becomes structure. <code>break</code> on a ' +
			'hit skips the <code>else</code>; running dry reaches it. Calling ' +
			'<code>find</code> with a miss and then a hit prints ' +
			'<code>not found</code> before <code>found at 2</code> — the check ' +
			'pins that order to prove both paths ran, not just the easy one.</p>',
		],
	});
})();
