/* shell — the Unix shell, fundamentals through scripting, on a
 * deterministic shell built for teaching.
 *
 * The editor holds a shell script; the 'sh' runner (see engine/runner-sh.js
 * and the interpreter core engine/sh-run.js) executes it against a FRESH
 * seeded filesystem every run — /home/learner with notes.txt, fruit.txt,
 * .profile, todo/ and projects/; /var/log/app.log (a fixed 10-line service
 * log the text-tool lessons mine); /etc/motd. Deleting everything is a
 * learning experience, not a loss.
 *
 * Why not real bash: bash-in-wasm drags in everything determinism forbids —
 * wall clock, PIDs, TTY column layout, hash-ordered completions. This core
 * implements the honest POSIX subset (quoting, expansions, globs,
 * pipelines, redirections incl. 2>&1 and heredocs, if/for/while/case,
 * functions, ~25 coreutils) with everything nondeterministic REMOVED BY
 * CONSTRUCTION: ls is always sorted, there is no date, no $RANDOM, and a
 * step budget turns `while true` into a red pane instead of a hang. Checks
 * pin exact stdout, same as every code track. What the validator is to
 * html-pure, determinism is to this track.
 *
 * Items are kind:'lesson' with lang:'sh' for the editor overlay and
 * snippets. starterError items must fail to PARSE (unclosed quote, missing
 * fi) — the syntax error is the lesson.
 *
 * Curriculum (18 items): first commands → files & dirs → cat & redirection
 * → pipes → quoting → variables → command & arithmetic substitution →
 * globbing → grep → cut/sort/uniq pipelines → tr/head/tail → exit codes &
 * test → if/elif → for loops → while loops → case → functions → a log-
 * report capstone.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'shell',
		title: 'Unix Shell',
		runner: 'sh',
		order: [
			// First Steps
			'first-commands', 'files-dirs', 'cat-redirection', 'pipes',
			// The Language of Words
			'quoting', 'variables', 'substitution', 'globbing',
			// Text Tools
			'grep', 'fields-pipelines', 'text-transforms',
			// Logic & Scripting
			'exit-codes', 'if-elif', 'loops-for', 'loops-while', 'case-patterns', 'functions',
			// Capstone
			'capstone-logreport',
		],
	});

	// globalThis (not window) so the Node verification harness can load
	// lesson files unchanged.
	globalThis.GoLearnSh = {
		lesson: function (def) {
			def.kind = 'lesson';
			def.lang = 'sh'; // editor overlay + snippet default for this item
			GoLearn.registerItem('shell', def);
		},
	};
})();
