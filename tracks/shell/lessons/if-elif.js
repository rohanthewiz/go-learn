/* if-elif — the deep difference from Go: `if` does not evaluate a boolean
 * expression, it RUNS A COMMAND and branches on its exit code; [ ] is just
 * the command usually standing in that slot. The starter classifies the
 * log's ERROR count with string `=` equality tests — which can only express
 * exact matches, never ranges — so 3 errors falls through to the wrong
 * (large) branch. The fix is numeric -lt thresholds in an elif chain. The
 * check pins the taken branch WITH its computed count ("medium: 3 errors"),
 * pins both file-report lines, and absence-pins the starter's wrong branch
 * so leaving the equality tests in place cannot pass.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'if-elif',
		title: 'if / elif / else',
		nav: 'if/elif',
		category: 'Logic & Scripting',

		prose: [
			'<h2>if / elif / else</h2>' +
			'<p>Here is the sentence to internalize: <code>if</code> does not ' +
			'take a boolean expression — it takes a <strong>command</strong>, ' +
			'runs it, and branches on its exit code. Zero takes the branch; ' +
			'anything else moves on. That is the deep difference from Go, where ' +
			'<code>if err != nil</code> evaluates a value. In the shell, ' +
			'<code>if grep ERROR app.log</code> is perfectly legal: the ' +
			'condition <em>is</em> the grep. And <code>[ ]</code>, which you met ' +
			'last lesson, is not "the if syntax" — it is merely the command most ' +
			'often standing in that slot, exiting 0 or 1.</p>' +
			'<p>The shape is <code>if CMD; then … elif CMD; then … else … ' +
			'fi</code> — <code>fi</code> closes the block, and the <code>;</code> ' +
			'before <code>then</code> stands where a newline could be. ' +
			'<code>[ ]</code> speaks three dialects, and mixing them up is the ' +
			'classic bug this lesson\'s starter commits:</p>' +
			'<ul>' +
			'<li>files: <code>-f</code> regular file, <code>-d</code> ' +
			'directory, <code>-e</code> exists, <code>-s</code> non-empty</li>' +
			'<li>strings: <code>=</code> <code>!=</code> equality, ' +
			'<code>-z</code> empty, <code>-n</code> non-empty</li>' +
			'<li>numbers: <code>-eq -ne -lt -le -gt -ge</code> — the only ' +
			'operators that <em>compare magnitudes</em></li>' +
			'</ul>',
			{ lang: 'sh', code: 'LEVEL=WARN\nif [ $LEVEL = ERROR ]; then\n  echo "page the on-call"\nelif [ $LEVEL = WARN ] && [ -f notes.txt ]; then\n  echo "note it down"      # two [ ] commands, joined by && —\nelse                       # the condition slot takes any command LIST\n  echo "carry on"\nfi' },
			'<p>Because the condition slot holds commands, combining tests needs ' +
			'no special syntax: <code>[ a ] &amp;&amp; [ b ]</code> is two ' +
			'commands short-circuited exactly as in the previous lesson. String ' +
			'<code>=</code> can only answer "exactly equal?" — it cannot express ' +
			'"less than 5". For ranges you need the numeric operators, and an ' +
			'<code>elif</code> chain checks thresholds in order, first hit ' +
			'wins.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter counts ERROR lines in <code>/var/log/app.log</code> ' +
			'(there are 3) but classifies with <code>=</code> equality tests, so ' +
			'it prints the wrong branch. Rewrite the chain with <code>-lt</code>: ' +
			'under 2 is <code>small</code>, under 5 is <code>medium</code>, else ' +
			'<code>large</code> — each branch printing its computed count. Then ' +
			'add a file report: <code>notes.txt</code> exists <em>and</em> is ' +
			'non-empty (<code>-f</code> combined with <code>-s</code> via ' +
			'<code>&amp;&amp;</code>) → <code>notes.txt: found, non-empty</code>; ' +
			'a missing <code>ghost.txt</code> → <code>ghost.txt: missing</code>.</p>' +
			'<div class="tip">Why does <code>[ $N = 0 ]</code> even run? Because ' +
			'<code>=</code> compares <em>strings</em>: "3" is not "0", exit 1, ' +
			'next branch. It works right up until numbers stop looking alike — ' +
			'<code>[ 10 -lt 9 ]</code> is false, but a string comparison would ' +
			'happily sort "10" before "9". Use <code>-eq</code>/<code>-lt</code> ' +
			'the moment you mean arithmetic.</div>',
		],

		task: 'Fix the classifier with -lt thresholds in an elif chain, then add the two file-existence reports.',

		starter: [
			'# Count the ERROR lines in the service log (grep -c prints a count).',
			'N=$(grep -c ERROR /var/log/app.log)',
			'',
			'# BUG: string = can only test exact equality — it cannot express',
			'# "less than". N is 3, neither branch matches, and the chain falls',
			'# through to the wrong answer.',
			'# TODO 1: reclassify with numeric thresholds:',
			'#         [ $N -lt 2 ] small / elif [ $N -lt 5 ] medium / else large',
			'if [ $N = 0 ]; then',
			'  echo "small: $N errors"',
			'elif [ $N = 1 ]; then',
			'  echo "medium: $N errors"',
			'else',
			'  echo "large: $N errors"',
			'fi',
			'',
			'# TODO 2: report on notes.txt — if [ -f notes.txt ] && [ -s notes.txt ]',
			'#         echo "notes.txt: found, non-empty", else "notes.txt: missing"',
			'# TODO 3: same shape for ghost.txt — it does not exist, so its',
			'#         else branch should print "ghost.txt: missing"',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('medium: 3 errors') !== -1 &&
				flat.indexOf('notes.txt: found, non-empty') !== -1 &&
				flat.indexOf('ghost.txt: missing') !== -1 &&
				// the starter's wrong branch must be gone:
				flat.indexOf('large: 3 errors') === -1;
		},

		solution: [
			'# grep -c prints how many lines match — the log has 3 ERROR lines.',
			'N=$(grep -c ERROR /var/log/app.log)',
			'',
			'# Numeric thresholds, checked in order — first true branch wins,',
			'# so each elif implicitly means "and not the ones above".',
			'if [ $N -lt 2 ]; then',
			'  echo "small: $N errors"',
			'elif [ $N -lt 5 ]; then',
			'  echo "medium: $N errors"     # 3 lands here: not <2, but <5',
			'else',
			'  echo "large: $N errors"',
			'fi',
			'',
			'# The condition slot takes any command list: two [ ] commands',
			'# joined by && — both must exit 0 to take the then-branch.',
			'if [ -f notes.txt ] && [ -s notes.txt ]; then',
			'  echo "notes.txt: found, non-empty"',
			'else',
			'  echo "notes.txt: missing"',
			'fi',
			'',
			'if [ -f ghost.txt ] && [ -s ghost.txt ]; then',
			'  echo "ghost.txt: found, non-empty"',
			'else',
			'  echo "ghost.txt: missing"',
			'fi',
			'',
		].join('\n'),

		explanation: [
			'<p><code>N=$(grep -c ERROR /var/log/app.log)</code> captures a ' +
			'command\'s stdout into a variable — grep counts 3 matching lines. ' +
			'The elif chain then tests thresholds in order: <code>3 -lt 2</code> ' +
			'fails, <code>3 -lt 5</code> succeeds, so the medium branch prints ' +
			'with its computed count. The check pins <code>medium: 3 errors</code> ' +
			'and pins the <em>absence</em> of the starter\'s ' +
			'<code>large: 3 errors</code> — swapping echo strings without fixing ' +
			'the comparisons cannot pass.</p>',
			'<p>The file reports show why "if runs a command" is a feature, not ' +
			'trivia: <code>[ -f notes.txt ] &amp;&amp; [ -s notes.txt ]</code> is ' +
			'two commands short-circuited, and the whole list\'s exit code is ' +
			'what <code>if</code> consumes. No parentheses, no boolean type — ' +
			'composition falls out of the exit-code model you already have. For ' +
			'<code>ghost.txt</code> the first <code>[ -f ]</code> exits 1, ' +
			'<code>&amp;&amp;</code> short-circuits, and the else branch ' +
			'reports <code>missing</code>.</p>',
			'<p>Coming from Go: read <code>if [ $N -lt 5 ]</code> the way you ' +
			'read <code>if n &lt; 5</code>, but remember what it desugars to — ' +
			'run <code>[</code> with arguments <code>3 -lt 5 ]</code>, look at ' +
			'<code>$?</code>. That mental model is what makes ' +
			'<code>if grep -c ERROR log</code> or <code>if cp a b</code> read ' +
			'naturally too.</p>',
		],
	});
})();
