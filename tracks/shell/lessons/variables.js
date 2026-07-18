/* variables — assignment syntax and the parameter-expansion toolbox. The
 * starter opens with the error every newcomer types once: `X = 1`, which
 * is not an assignment but a command named X with two arguments — shown
 * live via 2>&1 (unredirected stderr is invisible to the output pane, so
 * folding it in is itself a teaching beat) followed by `exit: 127`. The
 * starter RUNS (command-not-found is an exit code, not a parse error) but
 * cannot pass. The solution assigns correctly and then applies the
 * expansions that replace whole subprocesses in real scripts: the ##
 * greedy-prefix trim as pure-shell basename, ${BASE%.log} to strip an
 * extension (app.log -> app on the seeded log path), ${EDITOR:-vi}
 * fallback, ${#STEM}
 * length, and $? flipping from the starter's 127 to 0. Check pins the trim
 * results, the fallback, the length, exit: 0, and the ABSENCE of the
 * command-not-found text — the fix is graded, not assumed.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'variables',
		title: 'Variables',
		nav: 'Variables',
		category: 'The Language of Words',

		prose: [
			'<h2>Variables</h2>' +
			'<p>Assignment is <code>NAME=value</code> — one word, <strong>no ' +
			'spaces around the <code>=</code></strong>. This is not pedantry; it ' +
			'falls straight out of how the shell parses. <code>X = 1</code> is a ' +
			'command line whose first word is <code>X</code>, so the shell goes ' +
			'looking for a <em>program named X</em>, hands it the arguments ' +
			'<code>=</code> and <code>1</code>, fails to find it, and reports ' +
			'exit code <code>127</code>. Coming from Go, this is the sharpest ' +
			'difference in the whole track: the shell has no syntax errors here, ' +
			'only commands that happen not to exist.</p>' +
			'<p>Reading a variable is <code>$NAME</code>, or <code>${NAME}</code> ' +
			'when the next character would blur the name\'s edge ' +
			'(<code>${DIR}_backup</code>). But the braces buy far more than ' +
			'delimiting — inside them lives a small string-processing language ' +
			'that runs with no subprocess at all:</p>' +
			'<ul>' +
			'<li><code>${VAR:-fallback}</code> — the value, or ' +
			'<code>fallback</code> when unset or empty. The standard way to give ' +
			'a script defaults: <code>${EDITOR:-vi}</code>.</li>' +
			'<li><code>${#VAR}</code> — the length of the value, in ' +
			'characters.</li>' +
			'<li><code>${VAR%pattern}</code> — strip the shortest matching ' +
			'<em>suffix</em>: <code>${F%.txt}</code> drops an extension.</li>' +
			'<li><code>${VAR##pattern}</code> — strip the longest matching ' +
			'<em>prefix</em>: <code>${P##*/}</code> eats everything through the ' +
			'last slash — <strong>basename in pure shell</strong>.</li>' +
			'</ul>',
			{ lang: 'sh', code: 'REPO=/home/learner/projects/beta\necho "${REPO##*/}"        # beta  — longest prefix */ removed\necho "${REPO%/*}"         # /home/learner/projects — shortest suffix /* removed\nBACKUP=${ARCHIVE:-$HOME/todo}   # fallback when ARCHIVE is unset' },
			'<p>Mnemonic: on a US keyboard <code>#</code> sits left of ' +
			'<code>$</code> and <code>%</code> sits right, so <code>#</code> ' +
			'trims the front of the value and <code>%</code> trims the back; ' +
			'doubling the character makes the match greedy. One more special: ' +
			'<code>$?</code> holds the exit code of the last command — ' +
			'<code>0</code> means success, and it is how the starter\'s broken ' +
			'line confesses. One catch: errors travel on <em>stderr</em>, which ' +
			'the output pane does not grade — append <code>2&gt;&amp;1</code> to ' +
			'fold it into stdout and make the failure visible.</p>' +
			'<h3>Your job</h3>' +
			'<p>Fix the assignment (<code>X=1</code>, no spaces — ' +
			'<code>exit: 0</code> replaces <code>exit: 127</code>), then work ' +
			'<code>/var/log/app.log</code> down with expansions alone: ' +
			'<code>base: app.log</code> via <code>${P##*/}</code>, ' +
			'<code>stem: app</code> via <code>${BASE%.log}</code>, ' +
			'<code>editor: vi</code> via <code>${EDITOR:-vi}</code>, and ' +
			'<code>len: 3</code> via <code>${#STEM}</code>.</p>' +
			'<div class="tip">Real scripts fork <code>basename</code> and ' +
			'<code>dirname</code> thousands of times in a loop; the brace forms ' +
			'do the same work in-process. Learn both — the commands read better ' +
			'in a pipeline, the expansions win inside a hot loop. And since an ' +
			'assignment is one word, quote values with spaces: ' +
			'<code>MSG="two words"</code>, exactly as the quoting lesson ' +
			'drilled.</div>',
		],

		task: 'Fix X = 1 to a real assignment, then derive app.log -> app from /var/log/app.log using ${##*/} and ${%.log}, plus a fallback and a length.',

		starter: [
			'# BROKEN on purpose: spaces make this a COMMAND named X with the',
			'# arguments = and 1 — not an assignment. The complaint goes to',
			'# stderr, which the output pane ignores; 2>&1 folds it into stdout',
			'# so you can watch the failure. Note the exit code: 127.',
			'X = 1 2>&1',
			'echo "exit: $?"',
			'',
			'# TODO: rewrite the line above as a real assignment: X=1',
			'#       (exit: becomes 0 — assignments succeed silently)',
			'',
			'P=/var/log/app.log',
			'echo "path: $P"',
			'',
			'# TODO: BASE=${P##*/}   — strip the longest */ prefix -> app.log',
			'#       echo "base: $BASE"',
			'# TODO: STEM=${BASE%.log} — strip the .log suffix -> app',
			'#       echo "stem: $STEM"',
			'# TODO: echo "editor: ${EDITOR:-vi}"  — fallback for an unset var',
			'# TODO: echo "len: ${#STEM}"          — length of the value',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('exit: 0') !== -1 &&
				flat.indexOf('base: app.log') !== -1 &&
				// raw-stdout pin with the newline: "stem: app" must be the
				// whole line, not a prefix of "stem: app.log":
				stdout.indexOf('stem: app\n') !== -1 &&
				flat.indexOf('editor: vi') !== -1 &&
				flat.indexOf('len: 3') !== -1 &&
				// the broken X = 1 must be gone — its complaint would land in
				// stdout via the starter's 2>&1:
				flat.indexOf('command not found') === -1;
		},

		solution: [
			'# NAME=value is ONE word — no spaces around =. (With spaces the',
			'# shell runs a command named X and reports 127; see the starter.)',
			'X=1',
			'echo "exit: $?"',
			'',
			'P=/var/log/app.log',
			'echo "path: $P"',
			'',
			'# ${P##*/}: strip the LONGEST prefix matching */ — everything up',
			'# through the last slash. This is basename in pure shell: no',
			'# subprocess, just expansion.',
			'BASE=${P##*/}',
			'echo "base: $BASE"',
			'',
			'# ${BASE%.log}: strip the shortest SUFFIX matching .log — the',
			'# standard drop-the-extension idiom. (# trims the front, % the',
			'# back; doubled = greedy.)',
			'STEM=${BASE%.log}',
			'echo "stem: $STEM"',
			'',
			'# ${VAR:-default}: the value, or the default when unset/empty.',
			'# EDITOR is unset in this environment, so vi wins.',
			'echo "editor: ${EDITOR:-vi}"',
			'',
			'# ${#VAR}: length of the value in characters — "app" is 3.',
			'echo "len: ${#STEM}"',
			'',
		].join('\n'),

		explanation: [
			'<p>The fix is one deleted space pair: <code>X=1</code> parses as an ' +
			'assignment, succeeds silently, and <code>$?</code> reads ' +
			'<code>0</code> where the starter read <code>127</code> — the ' +
			'"command not found" code. The check pins both the new ' +
			'<code>exit: 0</code> and the <em>absence</em> of the old complaint, ' +
			'so the broken line cannot simply be left in.</p>',
			'<p>Then the brace toolbox takes <code>/var/log/app.log</code> apart ' +
			'without launching a single program: <code>${P##*/}</code> greedily ' +
			'removes everything through the last <code>/</code> (basename, ' +
			'yielding <code>app.log</code>), <code>${BASE%.log}</code> clips the ' +
			'extension off the back (<code>app</code>), ' +
			'<code>${EDITOR:-vi}</code> substitutes a default for a variable ' +
			'nothing ever set, and <code>${#STEM}</code> measures the result: ' +
			'<code>3</code>. Four idioms, zero subprocesses — the difference ' +
			'between a script that shells out for every string operation and one ' +
			'that lets the language do its own work.</p>',
		],
	});
})();
