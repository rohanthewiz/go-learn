/* mutable-default-gotcha — THE classic Python trap: def add(item, bucket=[])
 * evaluates the default ONCE at def time, so every call shares one list.
 * The starter runs CLEAN (no starterError) — the bug is in the output, and
 * the prose walks the evidence: each print shows the previous calls' items,
 * and an identity test proves all three "separate" results are one object.
 * Solution is the None-sentinel idiom (fresh list at CALL time) plus one
 * deliberate shared-default memo cache to show when def-time sharing is a
 * feature. Check pins the three independent single-item lists in order and
 * the ABSENCE of the polluted "'apple', 'beet'" pairing — never an id()
 * value, which varies run to run.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'mutable-default-gotcha',
		title: 'The Mutable Default Gotcha',
		nav: 'Default gotcha',
		category: 'Functions',

		prose: [
			'<h2>The Mutable Default Gotcha</h2>' +
			'<p>Every Python developer hits this once. ' +
			'<code>def add(item, bucket=[])</code> <em>looks</em> like "callers ' +
			'who omit <code>bucket</code> get a fresh empty list." It is not. A ' +
			'default expression is evaluated <strong>once, when the ' +
			'<code>def</code> statement runs</strong>, and the resulting object is ' +
			'stored on the function itself — every no-argument call receives ' +
			'<em>that same list</em>, complete with whatever previous calls ' +
			'appended to it.</p>',
			{ lang: 'py', code: 'def add(item, bucket=[]):\n    bucket.append(item)\n    return bucket\n\nadd("a"); add("b")\nprint(add.__defaults__)   # ([\'a\', \'b\'],) — the default lives ON the\n                          # function object, mutating in place' },
			'<p>Run the starter and read the output as evidence. The second call ' +
			'prints <code>[\'apple\', \'beet\']</code> — where did ' +
			'<code>apple</code> come from? And the identity check at the bottom ' +
			'prints <code>True</code>: all three "separate" results are the same ' +
			'object (comparing <code>id(a) == id(b)</code> would show the same ' +
			'thing — one address). Nothing raises; the program is wrong ' +
			'silently, which is exactly why this bug ships to production.</p>' +
			'<p>The fix is the <strong><code>None</code> sentinel idiom</strong>: ' +
			'default to the immutable <code>None</code>, and build the fresh list ' +
			'<em>inside</em> the body — body code runs per call, so each call ' +
			'that omits <code>bucket</code> gets its own list. Coming from Go ' +
			'this trap has no direct analog (Go has no default arguments), but ' +
			'the failure mode should feel familiar: it is package-level mutable ' +
			'state hiding where you least expect it — in a signature.</p>' +
			'<p>Is a def-time-shared object ever <em>wanted</em>? Yes — the same ' +
			'mechanism gives you a zero-ceremony memo cache: a ' +
			'<code>_cache={}</code> default persists across calls precisely ' +
			'because it is evaluated once. The difference between bug and ' +
			'technique is intent, so when you do it on purpose, say so in a ' +
			'comment.</p>' +
			'<h3>Your job</h3>' +
			'<p>Apply the sentinel idiom: <code>bucket=None</code>, then ' +
			'<code>if bucket is None: bucket = []</code> at the top of the body. ' +
			'The three calls should then print three independent one-item lists, ' +
			'and the identity check should print <code>False</code>. Leave the ' +
			'<code>fib</code> cache as is — that one is sharing on purpose.</p>' +
			'<div class="tip">Test the sentinel with <code>is</code>, never ' +
			'<code>==</code>: <code>None</code> is a singleton, and ' +
			'<code>bucket is None</code> cannot be fooled by a falsy-but-real ' +
			'argument like an existing empty list. Linters flag mutable defaults ' +
			'(flake8-bugbear B006) for good reason.</div>',
		],

		task: 'Fix add with the None-sentinel idiom so each call gets a fresh bucket; keep the deliberate fib cache.',

		starter: [
			'# Looks like "fresh empty list per call". It is not: the default is',
			'# evaluated ONCE, at def time, and shared by every call after.',
			'# TODO: bucket=None, then `if bucket is None: bucket = []` in the body.',
			'def add(item, bucket=[]):',
			'    bucket.append(item)',
			'    return bucket',
			'',
			'# Three calls, three INTENDED separate buckets:',
			'a = add("apple")',
			'print(a)                    # [\'apple\'] — fine so far...',
			'b = add("beet")',
			'print(b)                    # where did apple come from?!',
			'c = add("carrot")',
			'print(c)                    # one list, three calls deep',
			'',
			'# The receipts: a, b, c are not three lists — they are one object.',
			'print("one object?", a is b is c)',
			'',
			'# Def-time evaluation CAN be a feature: this cache persists across',
			'# calls on purpose. Deliberate — hence the comment. Keep it.',
			'def fib(n, _cache={0: 0, 1: 1}):',
			'    if n not in _cache:',
			'        _cache[n] = fib(n - 1) + fib(n - 2)',
			'    return _cache[n]',
			'',
			'print("fib(20) =", fib(20))',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf("['apple']") !== -1 &&
				flat.indexOf("['beet']") !== -1 &&
				flat.indexOf("['carrot']") !== -1 &&
				flat.indexOf("['apple']") < flat.indexOf("['beet']") &&
				flat.indexOf("['beet']") < flat.indexOf("['carrot']") &&
				// the polluted shared list must be GONE:
				flat.indexOf("'apple', 'beet'") === -1 &&
				flat.indexOf('one object? False') !== -1 &&
				flat.indexOf('fib(20) = 6765') !== -1;
		},

		solution: [
			'# The None-sentinel idiom: the DEFAULT is the immutable None (safe to',
			'# share forever); the fresh list is built in the body, which runs',
			'# per CALL — so every omitted-bucket call gets its own list.',
			'def add(item, bucket=None):',
			'    if bucket is None:      # `is`, not ==: None is a singleton',
			'        bucket = []',
			'    bucket.append(item)',
			'    return bucket',
			'',
			'a = add("apple")',
			"print(a)                    # ['apple']",
			'b = add("beet")',
			"print(b)                    # ['beet'] — no leakage from call one",
			'c = add("carrot")',
			"print(c)                    # ['carrot']",
			'',
			'# Three distinct objects now (id(a), id(b), id(c) all differ):',
			'print("one object?", a is b is c)',
			'',
			'# Def-time evaluation CAN be a feature: this cache persists across',
			'# calls on purpose — one shared dict memoizes every fib() call.',
			'def fib(n, _cache={0: 0, 1: 1}):',
			'    if n not in _cache:',
			'        _cache[n] = fib(n - 1) + fib(n - 2)',
			'    return _cache[n]',
			'',
			'print("fib(20) =", fib(20))',
			'',
		].join('\n'),

		explanation: [
			'<p>The one-line difference is <em>when</em> the list is created. ' +
			'<code>bucket=[]</code> builds it at <strong>def time</strong> — once ' +
			'— and parks it in <code>add.__defaults__</code>, where every call ' +
			'mutates it. <code>bucket=None</code> plus ' +
			'<code>if bucket is None: bucket = []</code> moves construction to ' +
			'<strong>call time</strong>, so the three calls print ' +
			'<code>[\'apple\']</code>, <code>[\'beet\']</code>, ' +
			'<code>[\'carrot\']</code> and the identity check flips to ' +
			'<code>False</code>. The check also asserts the polluted ' +
			'<code>\'apple\', \'beet\'</code> pairing never appears — absence of ' +
			'the bug is part of the contract.</p>',
			'<p><code>fib</code> stays untouched because it exploits the very ' +
			'same rule deliberately: one def-time dict shared across calls is a ' +
			'free memo cache, which is why <code>fib(20)</code> computes in ' +
			'linear time here. Same mechanism, opposite intent — the comment in ' +
			'the code is what separates them for the next reader.</p>',
		],
	});
})();
