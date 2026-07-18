/* substitution — $(cmd) and $((expr)): the two expansions that compute.
 * $(cmd) turns a whole pipeline's stdout into a word (composability
 * pointing INWARD, where pipes compose outward), with subshell semantics:
 * variables assigned inside do not leak — the solution pins the evidence
 * (outer X: unset) rather than asserting it. $((expr)) is integer-only
 * arithmetic; 7 / 2 = 3 is pinned raw with its newline so the starter's
 * hardcoded 3.5 cannot satisfy it as a substring. The workhorse pattern is
 * count-then-compute: N=$(grep -c ERROR /var/log/app.log) -> 3, then
 * $((N * 10)) -> 30. A nested $(basename $(dirname ...)) -> log shows
 * substitutions stacking inside one word. Starter ships hardcoded wrong
 * numbers and a leaking assignment; every TODO's answer is a pinned line.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'substitution',
		title: 'Command & Arithmetic Substitution',
		nav: 'Substitution',
		category: 'The Language of Words',

		prose: [
			'<h2>Command &amp; Arithmetic Substitution</h2>' +
			'<p>Pipes compose commands <em>outward</em> — stdout flowing into the ' +
			'next program. <code>$(cmd)</code> composes <em>inward</em>: it runs ' +
			'the command, captures its stdout, and splices the text into the ' +
			'middle of the word you are building. Any command — including a full ' +
			'pipeline — can sit inside the parentheses. Coming from Go, this is ' +
			'<code>exec.Command(...).Output()</code> collapsed into an ' +
			'expression, minus fifteen lines of plumbing:</p>',
			{ lang: 'sh', code: 'TOP=$(sort fruit.txt | uniq -c | sort -rn | head -1)\necho "most common: $TOP"\n\nLINES=$(wc -l < notes.txt)      # a pipeline INSIDE a word\necho "notes has $LINES lines"' },
			'<p>Two rules keep it honest. First, <code>$(cmd)</code> runs in a ' +
			'<strong>subshell</strong>: variables assigned inside evaporate when ' +
			'the capture ends. The parent sees the stdout and nothing else — if ' +
			'you need a value out, <em>print</em> it and capture the print. ' +
			'Second, the trailing newline every well-behaved command emits is ' +
			'stripped, which is why the captured text splices cleanly into a ' +
			'word.</p>' +
			'<p><code>$((expr))</code> is the arithmetic sibling: ' +
			'<code>+ - * / %</code> over <strong>integers only</strong>. Inside ' +
			'the double parens you may drop the dollar signs on variable names ' +
			'(<code>$((N * 10))</code>). There are no floats: <code>/</code> ' +
			'truncates toward zero, so <code>$((7 / 2))</code> is ' +
			'<code>3</code> — the same integer division Go performs on two ' +
			'<code>int</code>s, and a genuine surprise if you expected ' +
			'<code>3.5</code>. Together the two forms give you the shell\'s ' +
			'fundamental measure-then-compute move: capture a count with ' +
			'<code>$(grep -c ...)</code>, then do arithmetic on it.</p>' +
			'<h3>Your job</h3>' +
			'<p>Replace the starter\'s hardcoded numbers with computed ones: ' +
			'capture <code>grep -c ERROR /var/log/app.log</code> into ' +
			'<code>N</code> (<code>errors: 3</code>), scale it with ' +
			'<code>$((N * 10))</code> (<code>scaled: 30</code>), print the real ' +
			'<code>7 / 2</code>, move the leaking assignment inside a ' +
			'<code>$( )</code> so <code>outer X: unset</code> proves the ' +
			'subshell, and nest <code>basename</code> around <code>dirname</code> ' +
			'to get <code>parent: log</code> from <code>/var/log/app.log</code>.</p>' +
			'<div class="tip">Quote captures like any other expansion: ' +
			'<code>echo "$(cmd)"</code> keeps the output one word; bare ' +
			'<code>$(cmd)</code> word-splits it — the quoting lesson\'s bug ' +
			'wearing a new coat. One deliberate omission here: backticks ' +
			'<code>`cmd`</code> are the obsolete spelling and this shell does ' +
			'not implement them — <code>$( )</code> nests cleanly, which is ' +
			'exactly what the backtick syntax could never do.</div>',
		],

		task: 'Compute the hardcoded numbers: capture grep -c into N, scale it with $(( )), show integer division, prove $( ) is a subshell, nest basename(dirname).',

		starter: [
			'# Hardcoded placeholders — every number below should be COMPUTED.',
			'',
			'# TODO: N=$(grep -c ERROR /var/log/app.log)   — capture the count',
			'N=0',
			'echo "errors: $N"',
			'',
			'# TODO: echo "scaled: $((N * 10))"            — arithmetic on it',
			'echo "scaled: 0"',
			'',
			'# TODO: print the real $((7 / 2)) — integer division truncates.',
			'echo "7 / 2 = 3.5"',
			'',
			'# This assignment LEAKS: X is still set afterwards, so the last',
			'# line prints 99. TODO: perform the assignment inside a capture —',
			'#   INSIDE=$(X=99; echo "inner sees X=$X")',
			'#   echo "$INSIDE"',
			'# — and watch the outer X come back unset.',
			'X=99',
			'echo "inner sees X=$X"',
			'echo "outer X: ${X:-unset}"',
			'',
			'# TODO: nest substitutions — basename of the dirname of the log:',
			'#   $(basename $(dirname /var/log/app.log))   -> log',
			'echo "parent: TODO"',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('errors: 3') !== -1 &&
				flat.indexOf('scaled: 30') !== -1 &&
				// raw pin WITH the newline: the starter hardcodes "7 / 2 = 3.5",
				// which must not satisfy this as a substring — integer division
				// is the point:
				stdout.indexOf('7 / 2 = 3\n') !== -1 &&
				// the subshell evidence, both halves: the inner assignment ran...
				flat.indexOf('inner sees X=99') !== -1 &&
				// ...and did NOT leak into the parent:
				flat.indexOf('outer X: unset') !== -1 &&
				flat.indexOf('parent: log') !== -1;
		},

		solution: [
			'# Capture a pipeline-sized answer into a word: grep -c prints the',
			'# match count, $( ) grabs it, the trailing newline is stripped.',
			'N=$(grep -c ERROR /var/log/app.log)',
			'echo "errors: $N"',
			'',
			'# $((expr)) — integer arithmetic; variables need no $ inside.',
			'echo "scaled: $((N * 10))"',
			'',
			'# No floats in shell arithmetic: / truncates toward zero, exactly',
			'# like Go dividing two ints. 3, not 3.5.',
			'echo "7 / 2 = $((7 / 2))"',
			'',
			'# $( ) is a SUBSHELL: the X=99 inside evaporates when the capture',
			'# ends. Only stdout crosses the boundary — need a value out?',
			'# Print it, and capture the print.',
			'INSIDE=$(X=99; echo "inner sees X=$X")',
			'echo "$INSIDE"',
			'echo "outer X: ${X:-unset}"',
			'',
			'# Substitutions nest: the inner $(dirname ...) yields /var/log,',
			'# the outer basename trims it to its last segment.',
			'echo "parent: $(basename $(dirname /var/log/app.log))"',
			'',
		].join('\n'),

		explanation: [
			'<p><code>N=$(grep -c ERROR /var/log/app.log)</code> is the ' +
			'measure-then-compute idiom in one line: <code>grep -c</code> ' +
			'prints <code>3</code> (the seeded log holds exactly three ERROR ' +
			'lines), the capture strips the newline, and <code>N</code> is now ' +
			'a number arithmetic can touch — <code>$((N * 10))</code> gives ' +
			'<code>30</code>. The division line is pinned with its newline ' +
			'precisely so a hardcoded <code>3.5</code> cannot sneak past: ' +
			'<code>$((7 / 2))</code> truncates to <code>3</code>, because shell ' +
			'arithmetic is integers all the way down.</p>',
			'<p>The leak demo turns a claim into evidence. In the starter, ' +
			'<code>X=99</code> runs in the parent and the last line prints ' +
			'<code>99</code>; moved inside <code>$( )</code>, the assignment ' +
			'happens in a subshell, the echoed text crosses back as stdout, and ' +
			'<code>${X:-unset}</code> reports <code>unset</code>. Only output ' +
			'escapes a substitution — never state. The final line stacks two ' +
			'captures in one word: <code>dirname</code> hands ' +
			'<code>/var/log</code> to <code>basename</code>, which yields ' +
			'<code>log</code> — nesting that works because <code>$( )</code> ' +
			'has real delimiters, the fix backticks never had.</p>',
		],
	});
})();
