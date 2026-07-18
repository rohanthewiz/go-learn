/* lists-tuples — the aliasing lesson every Go developer needs on day one:
 * `b = a` copies a reference (one list, two names — like two Go slice
 * headers over one backing array, except append is visible through both),
 * while `a[:]` / `list(a)` copy. Also: append/extend/insert/pop, negative
 * indexing, slicing-as-copy, slice assignment, `in`, and tuples as the
 * immutable-therefore-hashable dict key (plus the (x,) comma rule). Starter
 * is the naive "backup by assignment" bug, surprised that both names
 * changed; solution shows alias THEN real copy side by side, a tuple dict
 * key, and negative-index/slice lines — the check pins the alias-evidence
 * line, both copy-contrast lines, the tuple-key lookup, and a[-1].
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'lists-tuples',
		title: 'Lists & Tuples',
		nav: 'Lists & tuples',
		category: 'Foundations',

		prose: [
			'<h2>Lists &amp; Tuples</h2>' +
			'<p>A <strong>list</strong> is Python\'s growable sequence — the ' +
			'moral cousin of a Go slice, minus the element-type restriction. ' +
			'<code>append</code> pushes one element, <code>extend</code> pushes ' +
			'many (append a list and you get a <em>nested</em> list!), ' +
			'<code>insert(i, x)</code> splices at an index, <code>pop()</code> ' +
			'removes and returns the last element, and <code>x in a</code> ' +
			'membership-tests. Indexing goes both ways: <code>a[-1]</code> is the ' +
			'last element, <code>a[-2]</code> the one before — no ' +
			'<code>a[len(a)-1]</code> arithmetic.</p>',
			'<p>Now the line that bites: <code>b = a</code> does <strong>not</strong> ' +
			'copy the list. Assignment copies a <em>reference</em> — one list, ' +
			'two names — so a mutation through either name is visible through ' +
			'both. Coming from Go: it is the two-slice-headers-over-one-backing-' +
			'array situation, except stronger — Python\'s <code>append</code> is ' +
			'a method on the one shared object, so even <em>growth</em> shows ' +
			'through every alias (no Go-style reallocation ever splits them). To ' +
			'actually copy, slice the whole thing — <code>a[:]</code> — or call ' +
			'<code>list(a)</code>. Slices always allocate a new list; that is ' +
			'also why slice <em>assignment</em> is a splice:</p>',
			{ lang: 'py', code: 'a = [1, 2, 3, 4, 5]\nb = a[1:4]        # [2, 3, 4] -- a NEW list, unlike a Go subslice\nb[0] = 99         # a is untouched: slicing copied\na[1:4] = [0]      # slice ASSIGNMENT splices in place: [1, 0, 5]\nprint(2 in a)     # False now -- `in` does a membership scan' },
			'<p>A <strong>tuple</strong> is the immutable sequence: ' +
			'<code>(3, 4)</code> can never grow or change, which makes it ' +
			'<em>hashable</em>, which makes it legal as a dict key — ' +
			'<code>{(3, 4): "treasure"}</code> gives you composite keys with no ' +
			'struct definition. One syntax trap: parentheses do not make the ' +
			'tuple, the <em>comma</em> does. <code>(7)</code> is just the number ' +
			'7; <code>(7,)</code> is a one-element tuple.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter "backs up" a list with <code>b = a</code>, mutates ' +
			'<code>b</code>, and is surprised that <code>a</code> changed too. ' +
			'Keep that aliasing demo (label its prints <code>alias a:</code> / ' +
			'<code>alias b:</code>), then add a <em>real</em> copy with ' +
			'<code>a[:]</code>, mutate it, and print <code>copy a:</code> / ' +
			'<code>copy c:</code> to show <code>a</code> unaffected. Finish with ' +
			'a tuple-keyed dict lookup, a negative index, and a slice.</p>' +
			'<div class="tip">Rule of thumb: <code>=</code> never copies data in ' +
			'Python — not for lists, dicts, or objects. When you need an ' +
			'independent list, say so explicitly: <code>a[:]</code>, ' +
			'<code>list(a)</code>, or <code>copy.deepcopy</code> when the ' +
			'elements themselves are mutable.</div>',
		],

		task: 'Show the alias sharing mutations, then a real a[:] copy that does not, plus a tuple dict key, a[-1], and a slice.',

		starter: [
			'a = [1, 2, 3]',
			'',
			'# "Back up the list before changing it" ... or so we thought.',
			'# TODO: b = a copies a NAME, not the list -- one list, two labels.',
			'#       Keep this as the alias demo, then add a REAL copy: c = a[:]',
			'b = a',
			'b.append(4)',
			'',
			'print("a:", a)   # surprise: [1, 2, 3, 4] -- a changed too!',
			'print("b:", b)',
			'',
			'# TODO: after the alias demo, also show:',
			'#   - copy c = a[:], append to c, print "copy a:" and "copy c:"',
			'#   - a tuple as a dict key:  {(3, 4): "treasure"}  and look it up',
			'#   - the last element via a[-1], and a middle slice a[1:3]',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('alias a: [1, 2, 3, 4]') !== -1 &&
				flat.indexOf('alias b: [1, 2, 3, 4]') !== -1 &&
				flat.indexOf('copy a: [1, 2, 3, 4]') !== -1 &&
				flat.indexOf('copy c: [1, 2, 3, 4, 99]') !== -1 &&
				flat.indexOf('treasure') !== -1 &&
				flat.indexOf('last: 4') !== -1 &&
				flat.indexOf('middle: [2, 3]') !== -1;
		},

		solution: [
			'a = [1, 2, 3]',
			'a.append(4)          # push one element -> [1, 2, 3, 4]',
			'',
			'# ALIAS: assignment copies the reference, never the elements.',
			'# One list, two names -- like two Go slice headers over one backing',
			'# array, but stronger: append mutates the one shared object, so even',
			'# growth is visible through both names.',
			'b = a',
			'b.append(99)         # mutate through b ...',
			'a.pop()              # ... and through a -- SAME list either way',
			'print("alias a:", a)',
			'print("alias b:", b)',
			'',
			'# COPY: a full slice allocates a new list. list(a) works too.',
			'c = a[:]',
			'c.append(99)',
			'print("copy a:", a)  # unchanged -- c is independent',
			'print("copy c:", c)',
			'',
			'# Tuples are immutable, therefore hashable, therefore dict keys.',
			'# Composite keys with zero ceremony. ((7,) would be a 1-tuple:',
			'# the COMMA makes a tuple, not the parentheses.)',
			'grid = {(3, 4): "treasure"}',
			'print("at (3, 4):", grid[(3, 4)])',
			'',
			'# Negative indexes count from the end; slices are start-inclusive,',
			'# stop-exclusive -- and always NEW lists.',
			'print("last:", a[-1])',
			'print("middle:", a[1:3])',
			'',
		].join('\n'),

		explanation: [
			'<h3>Names point, slices copy</h3>' +
			'<p>The alias block is the heart of it. After <code>b = a</code> ' +
			'there is still exactly <em>one</em> list; <code>a</code> and ' +
			'<code>b</code> are two labels stuck on it. The solution mutates ' +
			'through <em>both</em> names — <code>b.append(99)</code>, then ' +
			'<code>a.pop()</code> — and both prints show the identical ' +
			'<code>[1, 2, 3, 4]</code>, because every operation hit the same ' +
			'object. The Go analogy is two slice headers sharing a backing ' +
			'array, but Python\'s version is stricter: Go aliases can silently ' +
			'part ways when <code>append</code> reallocates, while Python names ' +
			'can only be separated by an explicit copy.</p>',
			'<p>That explicit copy is <code>c = a[:]</code> — a slice of the ' +
			'whole list, and slices <em>always</em> allocate a new list ' +
			'(<code>list(a)</code> is the spelled-out equivalent). Now ' +
			'<code>c.append(99)</code> touches only <code>c</code>: the contrast ' +
			'prints show <code>copy a:</code> unchanged next to ' +
			'<code>copy c:</code> with the extra element. Note it is a ' +
			'<em>shallow</em> copy — the new list holds references to the same ' +
			'elements, which matters once the elements are themselves lists.</p>',
			'<p>The tuple earns dict-key duty by being immutable: a hash ' +
			'computed once can never be invalidated, so ' +
			'<code>grid[(3, 4)]</code> is a composite-key lookup with no struct ' +
			'type declared. And the closing lines are pure sequence idiom: ' +
			'<code>a[-1]</code> reads the last element without length ' +
			'arithmetic, and <code>a[1:3]</code> takes indexes 1 and 2 — start ' +
			'inclusive, stop exclusive — into a fresh list.</p>',
		],
	});
})();
