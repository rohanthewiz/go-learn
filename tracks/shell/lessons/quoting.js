/* quoting — THE lesson of the track. The shell is a macro processor: it
 * rewrites your words (expansion, splitting, globbing) BEFORE the program
 * runs, and quoting is how you control that rewrite. The demo is the
 * classic bug in its purest form: F="two words", then `for x in $F` hands
 * the loop TWO words while `for x in "$F"` hands it ONE — printed with
 * <...> markers so the argument boundaries are visible, not inferred.
 * Starter ships the buggy unquoted loop plus a single-quoted $HOME that
 * never expands; the solution shows both behaviors side by side under
 * labeled headers, because seeing the split IS the lesson. Check pins the
 * split pair <two>/<words>, the intact <two words> (ordered after the
 * split), the literal $HOME, and the expanded /home/learner.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'quoting',
		title: 'Quoting',
		nav: 'Quoting',
		category: 'The Language of Words',

		prose: [
			'<h2>Quoting</h2>' +
			'<p>Here is the single most important fact about the shell: <strong>it ' +
			'edits your words before the program ever sees them</strong>. When you ' +
			'write <code>cp $SRC backup/</code>, <code>cp</code> does not receive ' +
			'<code>$SRC</code> — the shell replaces the variable, then <em>splits ' +
			'the result on whitespace</em>, then expands globs, and only the ' +
			'finished list of words reaches the program as its arguments. Coming ' +
			'from Go: there is no such phase. <code>f(src)</code> passes one value ' +
			'no matter what string it holds. In the shell, the value\'s ' +
			'<em>content</em> can change your <em>argument count</em>.</p>',
			{ lang: 'sh', code: 'SRC="release notes.txt"\ncp $SRC backup/     # cp gets THREE args: release, notes.txt, backup/\ncp "$SRC" backup/   # cp gets TWO args: "release notes.txt", backup/' },
			'<p>Quotes are not string syntax — they are instructions to that ' +
			'editor about which rewrites to perform:</p>' +
			'<ul>' +
			'<li><code>\'single quotes\'</code> — fully literal. No expansion, no ' +
			'splitting. <code>$HOME</code> stays five characters of text.</li>' +
			'<li><code>"double quotes"</code> — expansions run ' +
			'(<code>$VAR</code>, <code>$(cmd)</code>), but the result is ' +
			'<strong>one word</strong>: no splitting, no globbing.</li>' +
			'<li>bare (unquoted) — expansions run, then the result is split on ' +
			'whitespace and glob-expanded. Every space becomes an argument ' +
			'boundary.</li>' +
			'</ul>' +
			'<p>That third mode is where the classic bug lives: a filename with a ' +
			'space in it, one thing when you assigned it and two things when you ' +
			'used it. The professional habit is blunt: <strong>double-quote every ' +
			'expansion</strong> — <code>"$F"</code>, <code>"$(cmd)"</code> — and ' +
			'go bare only when you <em>want</em> the split, as a ' +
			'<code>for</code> loop walking a word list sometimes does.</p>' +
			'<h3>Your job</h3>' +
			'<p>Make the split visible. Keep the starter\'s unquoted loop under ' +
			'its <code>unquoted:</code> label — it prints <code>&lt;two&gt;</code> ' +
			'and <code>&lt;words&gt;</code>, two iterations for one variable. Add ' +
			'a second loop under a <code>quoted:</code> label iterating over ' +
			'<code>"$F"</code> so it prints <code>&lt;two words&gt;</code> in a ' +
			'single pass. Then fix the last line: <code>lit $HOME</code> should ' +
			'stay literal (single quotes) and <code>exp $HOME</code> should ' +
			'expand to <code>/home/learner</code> (double quotes).</p>' +
			'<div class="tip">The <code>&lt;...&gt;</code> markers are a ' +
			'debugging technique worth keeping: argument boundaries are invisible ' +
			'in normal output — <code>echo two words</code> and ' +
			'<code>echo "two words"</code> print identically! — so bracket each ' +
			'argument when you need to see where the shell actually cut. This ' +
			'shell is deterministic by construction, so the boundaries you pin ' +
			'here are the boundaries every run produces.</div>',
		],

		task: 'Show the word-splitting bug and its fix: loop over $F and "$F" with <...> markers, then print $HOME literal and expanded.',

		starter: [
			'# The shell EDITS your words before the command runs. Watch it happen.',
			'F="two words"',
			'',
			'# Bare $F: the value is substituted, then SPLIT on whitespace —',
			'# the loop sees two words. The <...> markers expose each argument.',
			'echo "unquoted:"',
			'for x in $F; do',
			'	echo "<$x>"',
			'done',
			'',
			'# TODO: add a matching loop under a "quoted:" label that iterates',
			'# over "$F" (double-quoted) — ONE iteration, spaces intact: <two words>',
			'',
			'# TODO: the first line below is right; the second uses the wrong',
			'# quotes. Single quotes never expand — switch the exp line to double',
			'# quotes so it prints: exp /home/learner',
			"echo 'lit $HOME'",
			"echo 'exp $HOME'",
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var split = stdout.indexOf('<two>');
			var whole = stdout.indexOf('<two words>');
			return split !== -1 &&
				stdout.indexOf('<words>') !== -1 &&
				whole !== -1 &&
				// the unquoted split prints first, the intact word after —
				// proves BOTH behaviors ran, not just the fixed one:
				split < whole &&
				// single quotes kept $HOME literal...
				flat.indexOf('lit $HOME') !== -1 &&
				// ...and double quotes expanded it:
				flat.indexOf('exp /home/learner') !== -1;
		},

		solution: [
			'# One variable, two behaviors — shown side by side on purpose.',
			'F="two words"',
			'',
			'# Bare $F: substitute, then SPLIT. The for loop receives two words,',
			'# so the body runs twice. This is the classic quoting bug: the',
			'# argument count now depends on the VALUE, not on what you typed.',
			'echo "unquoted:"',
			'for x in $F; do',
			'	echo "<$x>"',
			'done',
			'',
			'# "$F": substitute but do NOT split — the quotes make it one word.',
			'# One iteration, spaces preserved. This is the version you want',
			'# essentially always.',
			'echo "quoted:"',
			'for x in "$F"; do',
			'	echo "<$x>"',
			'done',
			'',
			'# Single quotes: fully literal — $HOME is just text.',
			'# Double quotes: expansions run, but the result stays one word.',
			"echo 'lit $HOME'",
			'echo "exp $HOME"',
			'',
		].join('\n'),

		explanation: [
			'<p>The two loops are the whole argument-passing model in eight ' +
			'lines. <code>for x in $F</code> substitutes <code>two words</code> ' +
			'and then splits it, so the body runs twice and the markers print ' +
			'<code>&lt;two&gt;</code> and <code>&lt;words&gt;</code>. ' +
			'<code>for x in "$F"</code> substitutes the same text but the double ' +
			'quotes forbid splitting — one iteration, ' +
			'<code>&lt;two words&gt;</code>. Nothing about the variable changed; ' +
			'only the quoting instruction did.</p>',
			'<p>The last pair separates the two quote characters cleanly: ' +
			'<code>\'lit $HOME\'</code> suppresses <em>all</em> rewriting, so the ' +
			'dollar sign survives as text, while <code>"exp $HOME"</code> lets ' +
			'the expansion run — <code>/home/learner</code> — yet still delivers ' +
			'a single word. The check pins the split pair before the intact ' +
			'word, the literal <code>$HOME</code>, and the expanded path: all ' +
			'four behaviors, in order, on one screen.</p>',
		],
	});
})();
