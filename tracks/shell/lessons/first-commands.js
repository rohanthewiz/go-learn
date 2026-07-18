/* first-commands — the shell as a REPL for programs: command word, then
 * arguments, options as dash-arguments by convention. Teaches pwd/ls/echo/cat
 * and, on the way, the two facts that shape this whole track: every run
 * starts in /home/learner on a FRESH seeded disk (determinism by
 * construction — no date, no $RANDOM, ls always sorted), and dotfiles hide
 * until -a asks. Check pins pwd at position 0, the exact sorted ls block,
 * plain-ls-before-ls-a ordering (via the .profile index), and the motd line
 * — each pin reachable only through the command it teaches.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'first-commands',
		title: 'First Commands',
		nav: 'First commands',
		category: 'First Steps',

		prose: [
			'<h2>First Commands</h2>' +
			'<p>The shell is a REPL whose values are <em>programs</em>. Every line ' +
			'has the same grammar: the first word names a command, the rest are ' +
			'arguments handed to it. Coming from Go: each command is a compiled ' +
			'<code>main()</code>, and the arguments are its <code>os.Args[1:]</code> ' +
			'— the shell\'s only job on this line is to split the words and make ' +
			'the call. Options are just arguments that start with <code>-</code>; ' +
			'the convention is universal, but it is the <em>program</em> that ' +
			'interprets them, not the shell.</p>',
			{ lang: 'sh', code: 'ls projects            # argument: which directory to list\ncat notes.txt          # print a file\'s contents to the screen\necho one two   three   # echo prints its ARGUMENTS — the shell already\n                       # split them, so the extra spaces are gone' },
			'<p>Your first four commands, and what each answers:</p>' +
			'<ul>' +
			'<li><code>pwd</code> — <em>where am I?</em> Prints the working ' +
			'directory as an absolute path.</li>' +
			'<li><code>ls [dir]</code> — <em>what is here?</em> No argument ' +
			'means the working directory.</li>' +
			'<li><code>echo words…</code> — <em>say this.</em> The simplest ' +
			'possible program: print the arguments, exit.</li>' +
			'<li><code>cat file…</code> — <em>show me that.</em> Con<em>cat</em>' +
			'enates file contents to stdout — one file is the degenerate, ' +
			'everyday case.</li>' +
			'</ul>' +
			'<p><code>pwd</code> prints ' +
			'the working directory — where relative paths start from. ' +
			'<code>ls</code> lists a directory: one name per line, ' +
			'<strong>always sorted</strong>, directories marked with a trailing ' +
			'<code>/</code>. Names starting with a dot are hidden by default — a ' +
			'Unix convention for config files like <code>.profile</code> — and ' +
			'<code>ls -a</code> reveals them. <code>echo</code> prints its ' +
			'arguments; <code>cat</code> prints files.</p>' +
			'<p>One design fact to internalize early: every run of your script ' +
			'starts in <code>/home/learner</code> on a <em>fresh seeded disk</em>. ' +
			'This shell is deterministic by construction — there is no ' +
			'<code>date</code>, no <code>$RANDOM</code>, and <code>ls</code> is ' +
			'always sorted, where real shells vary by filesystem and locale. That ' +
			'is what lets each lesson pin your exact output: same script, same ' +
			'bytes, every time. It also means nothing you do is permanent — ' +
			'delete everything and the next run reseeds it.</p>' +
			'<h3>Your job</h3>' +
			'<p>Replace the placeholder echoes: print the working directory with ' +
			'<code>pwd</code>, list the home directory with <code>ls</code> and ' +
			'then <code>ls -a</code> (spot what the second run adds), read the ' +
			'login banner with <code>cat /etc/motd</code>, and keep one ' +
			'<code>echo</code> greeting of your own at the end.</p>' +
			'<div class="tip">Anything after <code>#</code> is a comment — the ' +
			'shell drops it before running the line. The starters and solutions ' +
			'in this track use them heavily; they cost nothing at runtime.</div>',
		],

		task: 'pwd first, then ls, ls -a, cat /etc/motd, and one echo greeting.',

		starter: [
			'# The shell is a conversation: one command per line, arguments after.',
			'# Replace each placeholder echo with the real command.',
			'',
			'# TODO: print the current directory with pwd',
			'echo somewhere, probably',
			'',
			'# TODO: list this directory with ls — then run ls -a on the next',
			'# line and compare. What does -a add, and why was it hidden?',
			'echo some files',
			'',
			'# TODO: print the login banner with: cat /etc/motd',
			'echo a warm welcome',
			'',
			'# Keep a greeting of your own — echo prints its arguments.',
			'echo hello, shell',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// The exact sorted listing of /home/learner — dirs carry the
			// trailing slash, names sort ascending. Only `ls` produces this.
			var ls = 'fruit.txt\nnotes.txt\nprojects/\ntodo/\n';
			return stdout.indexOf('/home/learner\n') === 0 &&           // pwd, first
				stdout.indexOf(ls) !== -1 &&                            // plain ls block
				stdout.indexOf('.profile\n' + ls) !== -1 &&             // ls -a: dotfile leads
				stdout.indexOf(ls) < stdout.indexOf('.profile') &&      // plain ls ran BEFORE -a
				flat.indexOf('fruit.txt') < flat.indexOf('notes.txt') &&
				flat.indexOf('notes.txt') < flat.indexOf('projects/') &&
				flat.indexOf('Welcome to learnix') !== -1;              // cat /etc/motd
		},

		solution: [
			'# pwd: the working directory — every relative path starts here.',
			'# Each run of this track begins in /home/learner on a fresh disk.',
			'pwd',
			'',
			'# ls: one name per line, sorted, directories marked with a',
			'# trailing slash. Sorted ALWAYS — that determinism is a design',
			'# choice here, so checks (and you) can rely on exact output.',
			'ls',
			'',
			'# -a is an option — an argument starting with a dash, interpreted',
			'# by ls itself. It reveals dotfiles: .profile was here all along,',
			'# hidden by the Unix convention that dot-names are config.',
			'ls -a',
			'',
			'# cat prints file contents. /etc/motd is an absolute path — it',
			'# names the file from the root, ignoring where we stand.',
			'cat /etc/motd',
			'',
			'# echo prints its arguments back, joined by single spaces.',
			'echo hello, learnix',
			'',
		].join('\n'),

		explanation: [
			'<p><code>pwd</code> answers <code>/home/learner</code> — your home, ' +
			'and the fixed starting point of every run. <code>ls</code> lists ' +
			'four entries: two files, then <code>projects/</code> and ' +
			'<code>todo/</code> with the trailing slash that marks directories. ' +
			'The order is not an accident of the filesystem as it would be on a ' +
			'real box — this shell sorts by construction, which is exactly why ' +
			'the check can pin the block byte-for-byte.</p>',
			'<p><code>ls -a</code> prints the same list plus <code>.profile</code> ' +
			'at the top: dot-names sort first and hide by default. The dotfile ' +
			'convention is just <code>ls</code> being polite — the file was ' +
			'always there, as <code>cat .profile</code> would have shown. ' +
			'<code>cat /etc/motd</code> demonstrates an absolute path: it starts ' +
			'with <code>/</code>, so the working directory never enters into it. ' +
			'Relative versus absolute paths do real work in the next lesson.</p>',
			'<p>Finally, the greeting: <code>echo hello, learnix</code> hands ' +
			'echo two arguments (<code>hello,</code> and <code>learnix</code>) ' +
			'and echo prints them joined by single spaces. The shell split the ' +
			'line into words <em>before</em> echo ever ran — which is why extra ' +
			'spaces between arguments vanish, and why quoting (a later lesson) ' +
			'exists at all: sometimes you need to tell the shell where a word ' +
			'really ends.</p>',
		],
	});
})();
