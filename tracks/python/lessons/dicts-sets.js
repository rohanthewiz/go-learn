/* dicts-sets — the dict as Python's workhorse (KeyError vs .get, .items(),
 * the insertion-order guarantee, | merge) plus sets as the missing-from-Go
 * dedupe/algebra type. Starter guards a missing key with a clumsy
 * if-in/else and prints raw sets (runs, but leans on hash order); solution
 * uses .get(k, default), an .items() loop printing k=v in insertion order,
 * a | merge, and sorted() around every set. Check pins the get-default
 * line, the k=v lines IN ORDER (that's the insertion-order guarantee made
 * testable), and the bracketed sorted-intersection line — the starter's
 * brace-printed raw set can never match it.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'dicts-sets',
		title: 'Dicts & Sets',
		nav: 'Dicts & sets',
		category: 'Foundations',

		prose: [
			'<h2>Dicts &amp; Sets</h2>' +
			'<p>The <code>dict</code> is Python\'s workhorse: half the objects in a ' +
			'running program <em>are</em> dicts under the hood. Coming from Go: a ' +
			'dict is roughly <code>map[K]V</code>, with two upgrades — any hashable ' +
			'value can be a key, and since Python 3.7 iteration order is ' +
			'<strong>guaranteed</strong> to be insertion order (a language promise, ' +
			'not an accident like Go\'s deliberately randomized map order). One ' +
			'downgrade, though: reading a missing key does not hand you a zero ' +
			'value — it raises <code>KeyError</code>.</p>',
			{ lang: 'py', code: 'prices = {"tea": 3, "coffee": 4}\nprices["chai"]           # KeyError: \'chai\' — indexing is strict\nprices.get("chai")       # None — soft lookup\nprices.get("chai", 0)    # 0 — soft lookup with YOUR default\n"tea" in prices          # True — `in` tests KEYS, not values' },
			'<p>So pick the tool by intent: <code>d[k]</code> when the key ' +
			'<em>must</em> exist (a missing key is a bug and the loud ' +
			'<code>KeyError</code> is doing you a favor), <code>d.get(k, default)</code> ' +
			'when absence is normal. To walk a dict, loop over ' +
			'<code>d.items()</code> and unpack the <code>(key, value)</code> pairs ' +
			'right in the <code>for</code> line. And to combine dicts, the ' +
			'<code>|</code> operator (3.9+) builds a new one: left operand\'s order ' +
			'first, right operand wins on conflicting keys, new keys append at the ' +
			'end.</p>' +
			'<p>A <code>set</code> is an unordered collection of unique hashable ' +
			'values — a type Go simply does not have (you fake it with ' +
			'<code>map[T]struct{}</code>). <code>set(xs)</code> dedupes a list in ' +
			'one call, and sets support real algebra:</p>' +
			'<ul>' +
			'<li><code>a &amp; b</code> — intersection (in both)</li>' +
			'<li><code>a | b</code> — union (in either)</li>' +
			'<li><code>a - b</code> — difference (in <code>a</code> but not <code>b</code>)</li>' +
			'<li><code>x in a</code> — O(1) membership, the reason sets exist</li>' +
			'</ul>' +
			'<h3>Your job</h3>' +
			'<p>Replace the clumsy <code>if k in d</code> guard with ' +
			'<code>ages.get("linus", 0)</code>. Print each <code>name=age</code> ' +
			'pair with an <code>.items()</code> loop, merge in the updates dict ' +
			'with <code>|</code>, and wrap every printed set in ' +
			'<code>sorted(...)</code>.</p>' +
			'<div class="tip">House rule for this whole track: <strong>never print ' +
			'a raw set</strong>. Its iteration order is a hash-table implementation ' +
			'detail, not a promise — <code>sorted(s)</code> returns a list, which ' +
			'is ordered, printable, and pinnable. (Dicts are exempt: their ' +
			'insertion order IS a promise.)</div>',
		],

		task: 'Use .get with a default, print name=age via .items(), merge with |, and sorted() every set you print.',

		starter: [
			'ages = {"ada": 36, "alan": 41, "grace": 45}',
			'',
			'# Clumsy missing-key guard — Python has a one-liner for this.',
			'# TODO: replace the four lines below with ages.get("linus", 0).',
			'if "linus" in ages:',
			'    print("linus:", ages["linus"])',
			'else:',
			'    print("linus:", 0)',
			'',
			'# TODO: loop over ages.items() and print one name=age line per entry.',
			'# (Insertion order is guaranteed — the lines will come out in the',
			'# order the literal above wrote them.)',
			'print(ages)',
			'',
			'# TODO: merged = ages | {"grace": 46, "linus": 55}, then print it.',
			'# Right side wins on "grace"; "linus" appends at the end.',
			'',
			'nums = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3]',
			'a = {1, 3, 4, 5}',
			'b = {2, 3, 5, 6, 9}',
			'',
			'# These print RAW sets. It happens to look fine here, but set',
			'# iteration order is a hash-table detail, not a promise.',
			'# TODO: wrap every set below in sorted(...) before printing.',
			'print("uniq:", set(nums))',
			'print("both:", a & b)',
			'print("either:", a | b)',
			'print("only a:", a - b)',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('linus: 0') !== -1 &&
				flat.indexOf('ada=36') !== -1 &&
				flat.indexOf('alan=41') !== -1 &&
				flat.indexOf('grace=45') !== -1 &&
				// insertion-order guarantee, made testable:
				flat.indexOf('ada=36') < flat.indexOf('alan=41') &&
				flat.indexOf('alan=41') < flat.indexOf('grace=45') &&
				// sorted() intersection prints a LIST — brackets, not braces:
				flat.indexOf('both: [3, 5]') !== -1;
		},

		solution: [
			'ages = {"ada": 36, "alan": 41, "grace": 45}',
			'',
			'# .get returns a default instead of raising KeyError — no guard, no',
			'# double lookup. Reach for d[k] only when absence would be a bug.',
			'print("linus:", ages.get("linus", 0))',
			'',
			'# .items() yields (key, value) pairs; unpack them in the for line.',
			'# Iteration order == insertion order, guaranteed since 3.7.',
			'for name, age in ages.items():',
			'    print(f"{name}={age}")',
			'',
			'# | builds a NEW dict: left order first, right side wins conflicts',
			'# ("grace" becomes 46), unseen keys ("linus") append at the end.',
			'merged = ages | {"grace": 46, "linus": 55}',
			'print(merged)',
			'',
			'nums = [3, 1, 4, 1, 5, 9, 2, 6, 5, 3]',
			'a = {1, 3, 4, 5}',
			'b = {2, 3, 5, 6, 9}',
			'',
			'# sorted(s) turns hash-ordered chaos into an ordered list — the only',
			'# respectable way to PRINT set-derived data.',
			'print("uniq:", sorted(set(nums)))   # set(...) dedupes in one call',
			'print("both:", sorted(a & b))       # intersection',
			'print("either:", sorted(a | b))     # union',
			'print("only a:", sorted(a - b))     # difference',
			'',
		].join('\n'),

		explanation: [
			'<p><code>ages.get("linus", 0)</code> collapses the four-line guard ' +
			'into one expression — and unlike the guard, it looks the key up only ' +
			'once. The <code>.items()</code> loop then prints the three ' +
			'<code>name=age</code> lines in exactly the order the dict literal ' +
			'listed them; that ordering is what the check pins, because it is a ' +
			'language guarantee, not luck.</p>',
			'<p>The merge shows <code>|</code>\'s three rules at once: ' +
			'<code>ada</code> and <code>alan</code> keep their slots, ' +
			'<code>grace</code> takes the right-hand value 46, and ' +
			'<code>linus</code> appends. For the sets, every print goes through ' +
			'<code>sorted(...)</code> — which is why the output shows square ' +
			'brackets (a list) instead of braces. The starter\'s raw-set prints ' +
			'could never match <code>both: [3, 5]</code>.</p>',
		],
	});
})();
