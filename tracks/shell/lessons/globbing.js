/* globbing — the shell expands * ? [set] BEFORE the program runs; programs
 * receive filenames, never patterns. That inversion (in Go, filepath.Glob
 * is a library call the program makes; here matching is in the language)
 * is the lesson's spine. Demos: echo *.txt (sorted expansion — this shell
 * sorts by construction, so the order is pinnable), a glob crossing path
 * segments (projects/STAR/main.go), ? as exactly-one-char, the unmatched
 * *.zip staying LITERAL (the quiet failure mode: a program gets the
 * pattern as text), and a [ab] set match handed to ls, which lists each
 * expanded directory under a name: header. Starter quotes every pattern —
 * quoting disables globbing, tying back to the quoting lesson — and the
 * check pins the expanded sorted lists, the echoed projects/beta line, the
 * literal *.zip, the ls headers in order, and the ABSENCE of literal
 * *.txt so the quotes must actually come off.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'globbing',
		title: 'Globbing',
		nav: 'Globbing',
		category: 'The Language of Words',

		prose: [
			'<h2>Globbing</h2>' +
			'<p>Type <code>echo *.txt</code> and <code>echo</code> never sees ' +
			'<code>*.txt</code> — the <strong>shell</strong> matches the pattern ' +
			'against the directory, replaces the word with the sorted list of ' +
			'hits, and the program receives plain filenames. Coming from Go this ' +
			'is inverted: <code>filepath.Glob</code> is a library call your ' +
			'program chooses to make, but here matching lives in the ' +
			'<em>language</em>, so every program gets globbing without ' +
			'containing a line of matching code. That is why <code>rm *.o</code> ' +
			'works identically for every command ever written — and why the ' +
			'expansion happening <em>before</em> the program runs is the fact to ' +
			'internalize.</p>' +
			'<ul>' +
			'<li><code>*</code> — any run of characters (including none) within ' +
			'one path segment; it does not cross <code>/</code>.</li>' +
			'<li><code>?</code> — exactly one character.</li>' +
			'<li><code>[ab]</code> — one character from the set.</li>' +
			'<li>Patterns work per segment, so <code>projects/*/main.go</code> ' +
			'walks into subdirectories one starred hop at a time.</li>' +
			'</ul>',
			{ lang: 'sh', code: 'ls projects/*/README.md   # the * matched directories, ls got filenames\ncat "*.txt"               # quoted: globbing OFF — cat looks for a file',
			},
			'<p>Two edges bite. <strong>Unmatched patterns stay literal</strong>: ' +
			'if nothing matches <code>*.zip</code>, the program receives the ' +
			'five characters <code>*.zip</code> as an argument — so a typo\'d ' +
			'glob does not fail loudly, it quietly hands your command a pattern ' +
			'as text (real shells argue about this; bash keeps the literal by ' +
			'default too). And <strong>quoting disables globbing</strong> — the ' +
			'quoting lesson\'s third rewrite, switched off the same way as ' +
			'splitting: <code>"*.txt"</code> is just text. Expansion order is ' +
			'always variables first, then splitting, then globs.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter has every pattern quoted, so nothing expands. ' +
			'Unquote the ones that should match: <code>*.txt</code> (two files, ' +
			'sorted), <code>projects/*/main.go</code> (both projects), ' +
			'<code>projects/????</code> (four <code>?</code>s — only ' +
			'<code>beta</code> is four letters), and hand ' +
			'<code>projects/[ab]*</code> to <code>ls</code>. Keep ' +
			'<code>echo *.zip</code> unquoted too — nothing matches, and the ' +
			'literal echo is the point.</p>' +
			'<div class="tip">This shell sorts every expansion by construction ' +
			'(real shells sort by current locale, which varies machine to ' +
			'machine — here determinism is the design, so checks can pin exact ' +
			'output). Note what sorted expansion means for commands: ' +
			'<code>cp *.txt</code> with exactly two matches quietly copies one ' +
			'file onto the other — glob results are just arguments, and the ' +
			'program cannot tell they came from a pattern.</div>',
		],

		task: 'Unquote the patterns so the shell expands them: *.txt, projects/*/main.go, projects/????, a [ab] set for ls — and show unmatched *.zip staying literal.',

		starter: [
			'# Every pattern below is QUOTED, so globbing is disabled — echo',
			'# prints the patterns themselves. Programs never match patterns;',
			'# the shell does, and quotes tell it not to.',
			'echo "*.txt"',
			'echo "projects/*/main.go"',
			'echo "*.zip"',
			'',
			'# TODO: unquote the two patterns that should match files.',
			'# TODO: keep *.zip UNQUOTED but unmatched — what does echo print',
			'#       when a glob matches nothing? (Hint: the pattern survives.)',
			'# TODO: echo projects/????    — ? is exactly one character; which',
			'#       project has a four-letter name?',
			'# TODO: ls projects/[ab]*     — [ab] matches one char from the set;',
			'#       ls receives the expanded directories and lists each one.',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return (
				// *.txt expanded, sorted — one echo line, space-joined:
				stdout.indexOf('fruit.txt notes.txt') !== -1 &&
				// the glob crossed a path segment per * and stayed sorted:
				stdout.indexOf('projects/alpha/main.go projects/beta/main.go') !== -1 &&
				// ???? matched exactly the four-letter name — newline pin so
				// the ls header "projects/beta:" cannot satisfy it:
				stdout.indexOf('projects/beta\n') !== -1 &&
				// unmatched pattern passed through LITERAL:
				stdout.indexOf('*.zip') !== -1 &&
				// [ab]* handed ls both dirs; headers list them in sorted order:
				flat.indexOf('projects/alpha: main.go') !== -1 &&
				flat.indexOf('projects/beta: README.md main.go') !== -1 &&
				// and the quotes really came off — no literal *.txt anywhere:
				flat.indexOf('*.txt') === -1
			);
		},

		solution: [
			'# Unquoted: the SHELL expands each pattern to sorted filenames',
			'# before echo runs — echo just prints the words it was handed.',
			'echo *.txt',
			'',
			'# * matches within one path segment, so one star per hop:',
			'# projects/*/main.go tries every directory under projects/.',
			'echo projects/*/main.go',
			'',
			'# ? = exactly one character: four of them match beta, not alpha.',
			'echo projects/????',
			'',
			'# Nothing here matches *.zip, so the pattern stays LITERAL and',
			'# echo prints it verbatim. A command in this position receives',
			'# the pattern as an argument — the quiet failure mode of globs.',
			'echo *.zip',
			'',
			'# [ab] = one character from the set. The shell expands this to',
			'# projects/alpha projects/beta; given multiple directories, ls',
			'# lists each under a "name:" header.',
			'ls projects/[ab]*',
			'',
		].join('\n'),

		explanation: [
			'<p>Removing the quotes hands the patterns back to the shell. ' +
			'<code>echo *.txt</code> becomes <code>echo fruit.txt ' +
			'notes.txt</code> before echo starts — expansion is sorted, so the ' +
			'order is dependable. <code>projects/*/main.go</code> shows the ' +
			'per-segment rule: the star matches <code>alpha</code> and ' +
			'<code>beta</code> but never crosses a slash, and only paths whose ' +
			'<em>whole</em> shape matches survive (beta\'s ' +
			'<code>README.md</code> is not dragged in). ' +
			'<code>projects/????</code> needs exactly four characters: ' +
			'<code>beta</code> qualifies, <code>alpha</code> is one too ' +
			'long.</p>',
			'<p><code>echo *.zip</code> is the edge worth scars: no match means ' +
			'the pattern itself becomes the argument, so echo prints ' +
			'<code>*.zip</code> — and a <code>cp *.zip backup/</code> in the ' +
			'same spot would go hunting for a file literally named ' +
			'<code>*.zip</code>. Finally <code>ls projects/[ab]*</code> proves ' +
			'who does the work: the shell expands the set-pattern to both ' +
			'directories, and ls — which contains no matching code at all — ' +
			'simply lists the two arguments it received, each under its ' +
			'<code>name:</code> header. The check pins the sorted lists, the ' +
			'literal <code>*.zip</code>, and the absence of a literal ' +
			'<code>*.txt</code>: the quotes had to come off for any of it to ' +
			'appear.</p>',
		],
	});
})();
