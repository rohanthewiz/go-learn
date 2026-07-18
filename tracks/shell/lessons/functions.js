/* functions — name() { ... } defines a command; $1..$9/$#/$@ positionals,
 * `local` (and the global-leak default without it, demonstrated with an
 * outer variable that survives), `return` sets ONLY the exit code while
 * values travel via stdout and $(fn) capture — the sharp Go contrast —
 * plus `shift`. Starter is the copy-paste smell: the same three-line
 * grep-count block pasted three times with the level edited by hand, and
 * a wrong label shape (`INFO -> 5`) so it runs but fails the pinned
 * `INFO: 5` lines. Solution extracts report() with local + $(grep -c),
 * a describe() demo for $#/$@/shift, and a status-returning has_errors()
 * driven bare inside `if` — functions ARE commands, exit code and all.
 * Counts verified against the seeded log: INFO=5 WARN=2 ERROR=3.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'functions',
		title: 'Functions',
		nav: 'Functions',
		category: 'Logic & Scripting',

		prose: [
			'<h2>Functions</h2>' +
			'<p><code>name() { ... }</code> defines a <strong>new command</strong> ' +
			'— you call it exactly like <code>grep</code> or <code>ls</code>, and ' +
			'its arguments arrive positionally: <code>$1</code> through ' +
			'<code>$9</code>, with <code>$#</code> the count and <code>$@</code> ' +
			'all of them. There is no parameter list in the parentheses — they ' +
			'are pure syntax. <code>shift</code> discards <code>$1</code> and ' +
			'slides the rest left, the idiom for eating a subcommand before ' +
			'processing what follows.</p>',
			{ lang: 'sh', code: 'greet() {\n\tlocal who=${1:-world}   # default when no arg given\n\techo "hello, $who"\n}\ngreet              # hello, world\ngreet learner      # hello, learner\nmsg=$(greet ops)   # capture the OUTPUT — this is how values come back' },
			'<p>Two traps, both defaults. First: variables assigned inside a ' +
			'function are <strong>global</strong> unless you say ' +
			'<code>local</code> — a helper that quietly overwrites its caller’s ' +
			'<code>n</code> is a bug you will meet in real scripts, so the ' +
			'solution proves the fix by printing an outer <code>n</code> that ' +
			'survives untouched. Declare <code>local</code> for every variable a ' +
			'function owns; it is the closest thing the shell has to Go’s ' +
			'lexical scoping, and it is opt-in.</p>' +
			'<p>Second, the Go contrast: <code>return</code> does <em>not</em> ' +
			'return a value. It sets the <strong>exit code</strong> — the same ' +
			'0-means-success integer every command reports, readable for one ' +
			'command as <code>$?</code>. Data comes back by <strong>printing ' +
			'it</strong> and capturing with <code>$(fn args)</code>. Where a Go ' +
			'function returns <code>(count int, err error)</code>, a shell ' +
			'function echoes the count and exits nonzero for the error. That ' +
			'makes status-shaped functions composable: <code>if has_errors; ' +
			'then</code> runs the function and branches on its exit code — no ' +
			'brackets, no comparison, because <code>if</code> always tested ' +
			'commands, and your function is now a command.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter counts each log level by pasting the same block three ' +
			'times — the copy-paste smell functions exist to kill. Extract ' +
			'<code>report()</code> (one <code>local</code> count via ' +
			'<code>$(grep -c ...)</code>, one <code>LEVEL: N</code> echo), call ' +
			'it for INFO, WARN, ERROR; add the <code>describe</code> demo for ' +
			'<code>$#</code>/<code>$@</code>/<code>shift</code>; and finish with ' +
			'<code>has_errors()</code> driving an <code>if</code> directly.</p>' +
			'<div class="tip">House rule worth adopting: <code>local</code> on ' +
			'every variable a function touches, <code>return</code> for status ' +
			'only, <code>echo</code> for data. Mixing the last two — echoing ' +
			'debug text from a function whose output gets captured — corrupts ' +
			'the captured value; stderr exists for exactly that reason.</div>',
		],

		task: 'Extract the pasted blocks into report(), add the describe() args demo, and branch on a status-returning has_errors().',

		starter: [
			'LOG=/var/log/app.log',
			'',
			'# The same block, three times, edited by hand — the copy-paste smell.',
			'# TODO 1: extract  report() { ... }  taking the level as $1, keeping',
			'#         its count in a  local n,  and echoing "LEVEL: N" (colon!).',
			'#         Then:  report INFO / report WARN / report ERROR.',
			'level=INFO',
			'n=$(grep -c " $level " $LOG)',
			'echo "$level -> $n"',
			'',
			'level=WARN',
			'n=$(grep -c " $level " $LOG)',
			'echo "$level -> $n"',
			'',
			'level=ERROR',
			'n=$(grep -c " $level " $LOG)',
			'echo "$level -> $n"',
			'',
			'# TODO 2: describe() { echo "$# args: $@"; shift; echo "after shift:',
			'#         $# args: $@"; }  — then call:  describe one two three',
			'',
			'# TODO 3: has_errors() — local count of " ERROR " lines, then',
			'#         [ "$n" -gt 0 ]  as its last command (that exit code IS the',
			'#         return value). Use it bare:',
			'#         if has_errors; then echo "errors present: investigate"; fi',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var info = flat.indexOf('INFO: 5');
			var warn = flat.indexOf('WARN: 2');
			var err = flat.indexOf('ERROR: 3');
			return info !== -1 && warn !== -1 && err !== -1 &&
				info < warn && warn < err &&
				// $# and $@ observed before and after shift:
				flat.indexOf('3 args: one two three') !== -1 &&
				flat.indexOf('after shift: 2 args: two three') !== -1 &&
				// the if took the true branch of the status function...
				flat.indexOf('errors present: investigate') !== -1 &&
				// ...and only that branch:
				flat.indexOf('log is clean') === -1;
		},

		solution: [
			'LOG=/var/log/app.log',
			'',
			'# One definition, three calls. $1 is the level; local keeps n ours.',
			'# The " $1 " spaces anchor the level to its own column, so a message',
			'# containing the word ERROR could not inflate the count.',
			'report() {',
			'\tlocal n',
			'\tn=$(grep -c " $1 " $LOG)',
			'\techo "$1: $n"',
			'}',
			'',
			'n=untouched   # proof local works: report() must not clobber this',
			'',
			'report INFO',
			'report WARN',
			'report ERROR',
			'',
			'echo "outer n is still: $n"',
			'',
			'# Positionals: $# counts, $@ is all of them, shift eats $1.',
			'describe() {',
			'\techo "$# args: $@"',
			'\tshift',
			'\techo "after shift: $# args: $@"',
			'}',
			'',
			'describe one two three',
			'',
			'# A status-shaped function: its value IS its exit code. The last',
			'# command is the [ ] test, so its 0/1 becomes the function\'s —',
			'# no explicit return needed (return N works too, for early exits).',
			'has_errors() {',
			'\tlocal n',
			'\tn=$(grep -c " ERROR " $LOG)',
			'\t[ "$n" -gt 0 ]',
			'}',
			'',
			'# Functions are commands, so if tests them directly — bare, no [ ].',
			'if has_errors; then',
			'\techo "errors present: investigate"',
			'else',
			'\techo "log is clean"',
			'fi',
			'',
		].join('\n'),

		explanation: [
			'<p><code>report()</code> is the extraction: the level rides in as ' +
			'<code>$1</code>, the count is computed once with ' +
			'<code>$(grep -c " $1 " $LOG)</code>, and <code>local n</code> keeps ' +
			'the scratch variable out of the caller’s namespace — which is why ' +
			'<code>outer n is still: untouched</code> prints afterwards. Delete ' +
			'the <code>local</code> line and rerun: the function’s last count ' +
			'(3) leaks into the outer <code>n</code>. That silent overwrite is ' +
			'the default; <code>local</code> is the fix, not the norm.</p>',
			'<p><code>describe one two three</code> prints ' +
			'<code>3 args: one two three</code>, then <code>shift</code> drops ' +
			'<code>one</code> and the same line prints <code>2 args: two ' +
			'three</code> — <code>$#</code> and <code>$@</code> are live views, ' +
			'not snapshots taken at call time.</p>',
			'<p><code>has_errors</code> shows the return contract: its last ' +
			'command is <code>[ "$n" -gt 0 ]</code>, so the function’s exit ' +
			'code is that test’s 0 or 1 — and <code>if has_errors; then</code> ' +
			'consumes it with no brackets at all, because <code>if</code> runs a ' +
			'command and branches on its exit code; your function simply is one. ' +
			'The seeded log has 3 ERROR lines, so the check pins the true branch ' +
			'present and <code>log is clean</code> absent.</p>',
		],
	});
})();
