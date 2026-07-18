/* numbers-strings — the arithmetic surprises that bite Go developers first:
 * `/` ALWAYS returns float while `//` floors (and floors toward -inf, so
 * -7 // 2 is -4, not Go's truncated -3 — the check pins that line), ints
 * are arbitrary precision (2**100 prints all 31 digits, pinned), and float
 * repr is honest (0.1 + 0.2 prints the full IEEE-754 artifact, pinned).
 * Strings: slicing, len, repeat/concat, immutability. Starter uses / and *
 * where // and ** were intended, printing floats where ints belong; the
 * solution prints the corrected table.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'numbers-strings',
		title: 'Numbers & Strings',
		nav: 'Numbers & strings',
		category: 'Foundations',

		prose: [
			'<h2>Numbers &amp; Strings</h2>' +
			'<p>Python has <em>two</em> division operators, and the split will ' +
			'save you from the classic Go surprise in reverse. <code>/</code> is ' +
			'<strong>true division</strong>: it always returns a float, even for ' +
			'<code>8 / 2</code>. <code>//</code> is <strong>floor division</strong>: ' +
			'it rounds toward negative infinity. Coming from Go: ' +
			'<code>int/int</code> there truncates toward zero, so Go says ' +
			'<code>-7 / 2 == -3</code> — Python says <code>-7 // 2 == -4</code>, ' +
			'because <code>-4</code> is the floor of <code>-3.5</code>. Same ' +
			'symbol family, different rounding rule; <code>%</code> follows suit ' +
			'so that <code>a == (a // b) * b + a % b</code> always holds. ' +
			'<code>**</code> is exponentiation.</p>',
			'<p>Python ints are <strong>arbitrary precision</strong>. There is no ' +
			'int64 ceiling and no overflow — <code>2 ** 100</code> just works and ' +
			'prints all 31 digits. Floats, though, are ordinary IEEE-754 doubles, ' +
			'and Python\'s <code>repr</code> refuses to hide it: ' +
			'<code>0.1 + 0.2</code> prints <code>0.30000000000000004</code>. That ' +
			'honesty is a feature — the artifact was always there in Go too, ' +
			'<code>fmt.Println</code> just rounds it away.</p>',
			{ lang: 'py', code: 'print(9 / 3)      # 3.0  -- / ALWAYS floats, even when it divides evenly\nprint(9 // 3)     # 3    -- // stays int\nprint(10 ** 20)   # 100000000000000000000 -- no overflow, ever\nprint(0.1 * 3)    # 0.30000000000000004 -- IEEE-754, honestly shown' },
			'<p>Strings are sequences: <code>len(s)</code> measures them, ' +
			'<code>+</code> concatenates, <code>*</code> repeats, and ' +
			'<code>s[0:3]</code> <strong>slices</strong> — start inclusive, stop ' +
			'exclusive, producing a new string. They are also ' +
			'<strong>immutable</strong>: <code>s[0] = "G"</code> raises ' +
			'<code>TypeError</code>. Every "mutation" (<code>upper()</code>, ' +
			'slicing, concatenation) builds a new string, like Go\'s ' +
			'<code>string</code> and unlike its <code>[]byte</code>.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter\'s results table is wrong in four places: ' +
			'<code>/</code> where <code>//</code> was intended (floats where ints ' +
			'belong), <code>*</code> where <code>**</code> was intended, and two ' +
			'string TODOs. Fix the operators so the integer lines print integers ' +
			'(including <code>-4</code> for <code>-7 // 2</code>), print the ' +
			'31-digit <code>2 ** 100</code>, slice the first three characters of ' +
			'<code>"gopher"</code>, and repeat <code>"ab"</code> three times.</p>' +
			'<div class="tip">Need money-safe or precision-safe arithmetic? The ' +
			'stdlib ships <code>decimal.Decimal</code> and <code>fractions.' +
			'Fraction</code>. For everyday work: ints are exact at any size, ' +
			'floats are fast and approximate — choose consciously.</div>',
		],

		task: 'Fix / to //, * to **, then add the slice and repeat lines so the table prints integers where integers belong.',

		starter: [
			'# A results table -- wrong in four places. Run it first: the float',
			'# lines where ints belong are the bug. Then fix the operators.',
			'',
			'print(7 / 2)      # meant: whole pairs -> 3        (needs //)',
			'print(-7 / 2)     # meant: floored     -> -4       (needs //)',
			'print(7 % 2)      # remainder: already correct',
			'print(2 * 10)     # meant: 2 to the 10th  -> 1024  (needs **)',
			'print(2 * 100)    # meant: 2 to the 100th -> a 31-digit int (needs **)',
			'',
			'print(0.1 + 0.2)  # leave as is -- the honest float repr IS the lesson',
			'',
			's = "gopher"',
			'print(len(s))     # 6',
			'# TODO: print the first three characters -- slice s[0:3]',
			'# TODO: print "ab" repeated three times -- strings multiply',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return /^-4$/m.test(stdout) &&
				/^1024$/m.test(stdout) &&
				stdout.indexOf('1267650600228229401496703205376') !== -1 &&
				stdout.indexOf('0.30000000000000004') !== -1 &&
				/^gop$/m.test(stdout) &&
				stdout.indexOf('ababab') !== -1;
		},

		solution: [
			'# / ALWAYS returns float; // floors. Floor rounds toward NEGATIVE',
			'# INFINITY -- Go truncates toward zero, so Go says -7/2 == -3 while',
			'# Python says -7 // 2 == -4. The invariant Python preserves:',
			'#     a == (a // b) * b + a % b',
			'',
			'print(7 / 2)      # 3.5 -- kept to show / floating even on ints',
			'print(7 // 2)     # 3',
			'print(-7 // 2)    # -4  -- floor(-3.5), NOT truncation',
			'print(7 % 2)      # 1',
			'print(2 ** 10)    # 1024 -- ** is exponentiation',
			'print(2 ** 100)   # arbitrary precision: no int64 ceiling, no overflow',
			'',
			'print(0.1 + 0.2)  # 0.30000000000000004 -- IEEE-754 double, shown honestly',
			'',
			's = "gopher"',
			'print(len(s))     # 6',
			'print(s[0:3])     # gop -- slice: start inclusive, stop exclusive, NEW string',
			'print("ab" * 3)   # ababab -- * repeats, + concatenates',
			'',
			'# Strings are immutable: s[0] = "G" would raise TypeError. Slicing,',
			'# upper(), concatenation -- all build new strings, never edit in place.',
			'',
		].join('\n'),

		explanation: [
			'<h3>Two divisions, one invariant</h3>' +
			'<p><code>7 / 2</code> prints <code>3.5</code> because true division ' +
			'always produces a float — the operator encodes the intent, not the ' +
			'operand types. <code>7 // 2</code> gives <code>3</code>, and the line ' +
			'the check cares most about is <code>-7 // 2 == -4</code>: floor ' +
			'division rounds toward negative infinity, so it lands <em>below</em> ' +
			'<code>-3.5</code>, where Go\'s truncating division would land above ' +
			'at <code>-3</code>. Python pays that price to keep ' +
			'<code>a == (a // b) * b + a % b</code> true everywhere, which also ' +
			'makes <code>%</code> return a result with the divisor\'s sign — ' +
			'handy for wrapping indexes.</p>',
			'<p><code>2 ** 100</code> prints ' +
			'<code>1267650600228229401496703205376</code> because ints grow ' +
			'without bound — no overflow, no int64 ceiling, no big.Int import. ' +
			'<code>0.1 + 0.2</code> prints <code>0.30000000000000004</code> ' +
			'because floats are IEEE-754 doubles and Python\'s repr shows the ' +
			'shortest string that round-trips exactly — the artifact exists in ' +
			'every language; Python just declines to round it away.</p>',
			'<p>The string lines: <code>s[0:3]</code> takes indexes 0, 1, 2 — ' +
			'start inclusive, stop exclusive, so the slice length is ' +
			'<code>stop - start</code> — and returns a <em>new</em> string ' +
			'<code>gop</code>. <code>"ab" * 3</code> repeats. Both leave ' +
			'<code>s</code> untouched: strings are immutable, so every operation ' +
			'that "changes" one actually allocates a fresh one.</p>',
		],
	});
})();
