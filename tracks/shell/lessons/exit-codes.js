/* exit-codes — the shell's entire error model in one lesson: every command
 * returns 0-255, 0 is success, $? reads it, && / || branch on it, and
 * test/[ ] is a command whose ONLY output is its exit code. The starter runs
 * a failing `ls nope` whose complaint goes to stderr — invisible in this
 * stdout-graded pane — making the 2>&1 mechanic itself curriculum: the
 * check pins the stderr-made-visible line, so the lesson cannot be passed
 * without performing the redirection. The 0/1/127 sequence is pinned as
 * whole lines (newline-delimited indexOf chain) so digits inside error text
 * or `sh: line N:` prefixes cannot satisfy it by accident.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'exit-codes',
		title: 'Exit Codes',
		nav: 'Exit codes',
		category: 'Logic & Scripting',

		prose: [
			'<h2>Exit Codes</h2>' +
			'<p>Every command you have run so far also returned a number you never ' +
			'looked at: its <strong>exit code</strong>, an integer from 0 to 255. ' +
			'Zero means success; anything else is a failure. Coming from Go: this ' +
			'is <code>err == nil</code> with the polarity inverted — <code>0</code> ' +
			'is the good value, and instead of a typed error you get one byte. The ' +
			'special variable <code>$?</code> holds the code of the <em>last</em> ' +
			'command, and only the last — read it immediately or lose it.</p>' +
			'<p><code>&amp;&amp;</code> and <code>||</code> branch on that code ' +
			'without any <code>if</code>: <code>a &amp;&amp; b</code> runs ' +
			'<code>b</code> only when <code>a</code> exited 0, and ' +
			'<code>a || b</code> runs <code>b</code> only when it did not. Both ' +
			'short-circuit, exactly like Go\'s boolean operators — except the ' +
			'operands are whole commands:</p>',
			{ lang: 'sh', code: 'cp notes.txt backup.txt && echo "copied"   # runs: cp exited 0\nrm ghost.txt || echo "nothing to remove"   # runs: rm exited 1\n\n# stderr can also be captured into a file with 2> :\nrm ghost.txt 2> rm.err\ncat rm.err                                 # the complaint, on stdout at last' },
			'<p>Now the trap this lesson is built around: a failing command\'s ' +
			'complaint goes to <strong>stderr</strong>, a separate stream from ' +
			'stdout. This pane grades stdout — an unredirected stderr line is ' +
			'<em>invisible</em> here. That is not a sandbox quirk so much as the ' +
			'real design surfacing: stderr exists precisely so error text stays ' +
			'out of pipelines. <code>2&gt;&amp;1</code> merges stderr into ' +
			'stdout, and <code>2&gt; file</code> captures it; either way the ' +
			'message becomes data you can see, grep, and count.</p>' +
			'<ul>' +
			'<li><code>0</code> — success, the only success</li>' +
			'<li><code>1</code> — the generic failure (<code>false</code>, ' +
			'<code>grep</code> with no match, <code>ls</code> on a missing ' +
			'name…)</li>' +
			'<li><code>127</code> — the shell itself: command not found</li>' +
			'<li><code>test</code> / <code>[ ]</code> — a <em>command</em> whose ' +
			'only output IS its exit code: <code>[ -f notes.txt ]</code> prints ' +
			'nothing and exits 0 or 1</li>' +
			'</ul>' +
			'<h3>Your job</h3>' +
			'<p>The starter\'s <code>ls nope</code> fails silently — its message ' +
			'is on stderr. Rerun it with <code>2&gt;&amp;1</code> to pull the ' +
			'message into the pane. Then print <code>$?</code> after ' +
			'<code>true</code>, after <code>false</code>, and after a misspelled ' +
			'command (0, 1, 127 — in that order). Finish with two one-liners: ' +
			'<code>[ -f notes.txt ] &amp;&amp; echo present</code> and ' +
			'<code>[ -d nope ] || echo absent</code>.</p>' +
			'<div class="tip"><code>[</code> is genuinely a command — which is ' +
			'why its spaces are mandatory. <code>[ -f x ]</code> is the command ' +
			'<code>[</code> with three arguments; <code>[-f x]</code> is an ' +
			'attempt to run a program named <code>[-f</code>, worth exit code ' +
			'127. The bracket is not syntax, and nothing about it is magic.</div>',
		],

		task: 'Make the ls error visible with 2>&1, print $? for 0/1/127, then branch with [ ] && / ||.',

		starter: [
			'# This ls fails — but where did its error message go? This pane',
			'# shows STDOUT; the complaint went to STDERR, a separate stream,',
			'# and an unredirected stderr line is invisible here.',
			'ls nope',
			'',
			'# TODO 1: rerun that failing ls with 2>&1 so the message joins',
			'#         stdout and finally appears in the pane.',
			'# TODO 2: echo $? immediately after `true`, after `false`, and',
			'#         after a misspelled command — you should see 0, 1, 127.',
			'#         ($? is the LAST command\'s code; read it right away.)',
			'# TODO 3: [ -f notes.txt ] && echo present',
			'# TODO 4: [ -d nope ]     || echo absent',
			'echo "script finished"',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// Pin the codes as whole lines so digits inside error text
			// (`sh: line 6: ...`) cannot satisfy the sequence by accident.
			var s = '\n' + stdout;
			var i0 = s.indexOf('\n0\n');
			var i1 = i0 === -1 ? -1 : s.indexOf('\n1\n', i0);
			var i127 = i1 === -1 ? -1 : s.indexOf('\n127\n', i1);
			return flat.indexOf('ls: nope: No such file or directory') !== -1 &&
				i0 !== -1 && i1 !== -1 && i127 !== -1 &&
				flat.indexOf('present') !== -1 &&
				flat.indexOf('absent') !== -1;
		},

		solution: [
			'# Same failure — but 2>&1 merges stderr INTO stdout, so the',
			'# message now flows through the pane (and through any pipes).',
			'ls nope 2>&1',
			'',
			'# $? holds the exit code of the LAST command only.',
			'true',
			'echo $?              # 0 — success. Coming from Go: err == nil.',
			'false',
			'echo $?              # 1 — the generic failure',
			'gerp ERROR notes.txt 2>&1',
			'echo $?              # 127 — the shell itself: command not found',
			'',
			'# test/[ ] is a COMMAND whose only output is its exit code;',
			'# && and || branch on that code with no if in sight.',
			'[ -f notes.txt ] && echo present',
			'[ -d nope ] || echo absent',
			'',
		].join('\n'),

		explanation: [
			'<p><code>ls nope 2&gt;&amp;1</code> is the same failing command — ' +
			'only the plumbing changed. <code>2&gt;&amp;1</code> means "send ' +
			'stream 2 (stderr) wherever stream 1 (stdout) currently goes", so ' +
			'the complaint finally lands in the graded pane. The check pins that ' +
			'exact line: this lesson cannot be passed without performing the ' +
			'redirection.</p>',
			'<p>The three probes read <code>$?</code> immediately after each ' +
			'command, because the very next command overwrites it. ' +
			'<code>true</code> exits 0, <code>false</code> exits 1, and ' +
			'<code>gerp</code> — a typo, deliberately — never runs at all, so ' +
			'the <em>shell</em> answers with 127. The distinction matters when ' +
			'debugging: 1 is your program failing; 127 is your PATH or your ' +
			'spelling.</p>',
			'<p>The last two lines are the whole logic chapter in miniature: ' +
			'<code>[ -f notes.txt ]</code> prints nothing and exits 0 (the file ' +
			'exists), so <code>&amp;&amp;</code> fires <code>echo present</code>; ' +
			'<code>[ -d nope ]</code> exits 1, so <code>||</code> fires ' +
			'<code>echo absent</code>. <code>if</code>, coming next, is nothing ' +
			'more than this with keywords.</p>',
		],
	});
})();
