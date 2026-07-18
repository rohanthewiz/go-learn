/* grep — filter lines by pattern over /var/log/app.log. Teaches the four
 * supported flags (-i -v -n -c), regex basics (anchors, alternation,
 * classes), and grep's exit status as pipeline logic — with the twist that
 * this shell has no -q, so silencing grep with a redirect stands in for it
 * (which also happens to be the portable trick on ancient Unixes). Starter
 * greps match too much (pattern "2025" hits every line); solution narrows.
 * Check pins the three ERROR tails via an indexOf ordering chain, the
 * `7:` line-number prefix, the bare counts 2 and 5 as whole lines in raw
 * stdout, the anchored 08:05 pair via adjacency, and the || message.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'grep',
		title: 'grep',
		nav: 'grep',
		category: 'Text Tools',

		prose: [
			'<h2>grep</h2>' +
			'<p><code>grep PATTERN [file]</code> reads lines and prints the ones ' +
			'that match. That one sentence is most of Unix text processing: you ' +
			'rarely open a log in an editor — you <em>filter</em> it. Your ' +
			'workbench for this section is <code>/var/log/app.log</code>, a fixed ' +
			'10-line service log (same content every run — this shell is ' +
			'deterministic by construction, so checks can pin exact output). Each ' +
			'line is <code>date time LEVEL service message…</code>.</p>',
			{ lang: 'sh', code: 'grep apple fruit.txt        # lines containing "apple" (3 of them)\ngrep -c apple fruit.txt     # -c: print the COUNT instead, "3"\ngrep -v apple fruit.txt     # -v: invert — lines WITHOUT "apple"\ngrep -in APPLE fruit.txt    # -i ignore case, -n number the hits: "2:apple"' },
			'<p>Four flags cover daily use here:</p>' +
			'<ul>' +
			'<li><code>-i</code> — case-insensitive match</li>' +
			'<li><code>-v</code> — invert: keep the lines that do <em>not</em> match</li>' +
			'<li><code>-n</code> — prefix each hit with its 1-based line number, ' +
			'<code>7:…</code></li>' +
			'<li><code>-c</code> — print only the number of matching lines</li>' +
			'</ul>' +
			'<p>The pattern is a regular expression (JS-flavored ERE in this ' +
			'shell), not a fixed string. Three constructs pay for the rest: ' +
			'<code>^</code> anchors to line start (<code>$</code> to line end), ' +
			'<code>a|b</code> is alternation (<code>grep "WARN|ERROR"</code> — ' +
			'quote it, or the shell eats the <code>|</code> as a pipe), and ' +
			'<code>[abc]</code> / <code>[0-9]</code> are character classes. ' +
			'Unanchored patterns match <em>anywhere</em> in the line — the classic ' +
			'beginner bug is a pattern so broad it matches everything, which is ' +
			'exactly what the starter does.</p>' +
			'<p>grep also <em>reports</em>: exit status <code>0</code> when it ' +
			'matched at least one line, <code>1</code> when it matched nothing. ' +
			'Coming from Go: that status is the shell\'s error value, and ' +
			'<code>&amp;&amp;</code>/<code>||</code> are its ' +
			'<code>if err != nil</code>. Real grep has <code>-q</code> (quiet — ' +
			'status only); this shell does not, so silence the output with a ' +
			'redirect instead: <code>grep PAT file &gt; hits.txt || echo "none"</code> ' +
			'uses the status while parking the matches in a file. Chained ' +
			'<code>-v</code> filters compose too: ' +
			'<code>grep api log | grep -v INFO</code> reads "api lines, minus the ' +
			'routine ones".</p>' +
			'<h3>Your job</h3>' +
			'<p>Every starter grep matches too much (or reports too little). ' +
			'Narrow each one: the ERROR lines only; the WARN <em>count</em> ' +
			'(<code>-c</code>); <code>pressure</code> with its line number ' +
			'(<code>-n</code>); the count of non-info lines ' +
			'(<code>-vi</code> piped to <code>wc -l</code>); the two lines that ' +
			'<em>begin</em> with <code>2025-03-01 08:05</code> (anchor with ' +
			'<code>^</code>); and turn the FATAL probe into logic — redirect its ' +
			'output to <code>matches.txt</code> and print ' +
			'<code>no FATAL entries</code> via <code>||</code>.</p>' +
			'<div class="tip">Flags may be bundled: <code>-vi</code> is ' +
			'<code>-v -i</code>. And <code>grep -c</code> counts <em>lines</em>, ' +
			'not occurrences — a line matching three times still counts once. To ' +
			'count across a whole pipeline instead, pipe to ' +
			'<code>wc -l</code>.</div>',
		],

		task: 'Narrow each grep: ERROR lines, WARN count, numbered pressure hit, non-info count, ^-anchored 08:05 lines, and a || fallback for FATAL.',

		starter: [
			'# Each grep below matches too much. Tighten them one by one.',
			'',
			'# TODO: only the ERROR lines — "2025" is in every line of the log.',
			'grep 2025 /var/log/app.log',
			'',
			'# TODO: print the NUMBER of WARN lines (-c), not the lines themselves.',
			'grep WARN /var/log/app.log',
			'',
			'# TODO: where is "pressure"? Show the line number too (-n).',
			'grep pressure /var/log/app.log',
			'',
			'# TODO: count the lines that are NOT info-level, any case (-vi | wc -l).',
			'grep INFO /var/log/app.log | wc -l',
			'',
			'# TODO: only lines BEGINNING with the 08:05 minute — anchor with ^.',
			'grep "08:05" /var/log/app.log',
			'',
			'# TODO: no output and exit status 1 — park matches in matches.txt',
			'# with > and print "no FATAL entries" via || when grep comes up empty.',
			'grep FATAL /var/log/app.log',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var tail = 'ERROR db connection lost';
			var up = 'ERROR api upstream timeout /pay 5001ms';
			var i1 = stdout.indexOf(tail);           // log line 4
			var i2 = stdout.indexOf(up);             // log line 8
			var i3 = stdout.indexOf(tail, i1 + 1);   // log line 10 — same text, later
			return i1 !== -1 && i2 !== -1 && i3 !== -1 &&
				i1 < i2 && i2 < i3 &&
				// -c WARN and the piped wc -l print bare counts on their own lines
				stdout.indexOf('\n2\n') !== -1 &&
				stdout.indexOf('\n5\n') !== -1 &&
				// -n prefixes the 1-based line number
				stdout.indexOf('7:2025-03-01 08:04:18 WARN cache evict pressure') !== -1 &&
				// the ^-anchored minute: exactly the 08:05 pair, adjacent
				stdout.indexOf('2025-03-01 08:05:09 ERROR api upstream timeout /pay 5001ms\n' +
					'2025-03-01 08:05:10 INFO api retry /pay 220ms') !== -1 &&
				flat.indexOf('no FATAL entries') !== -1;
		},

		solution: [
			'# The pattern is a regex matched anywhere in the line — so make it',
			'# specific. ERROR appears only in the three error lines.',
			'grep ERROR /var/log/app.log',
			'',
			'# -c swaps the lines for their count.',
			'grep -c WARN /var/log/app.log',
			'',
			'# -n prefixes the 1-based line number: "7:..." locates the hit.',
			'grep -n pressure /var/log/app.log',
			'',
			'# -v inverts, -i ignores case (bundled as -vi); wc -l counts what',
			'# survives. Piped wc prints a bare number — no filename to show.',
			'grep -vi info /var/log/app.log | wc -l',
			'',
			'# ^ pins the match to the START of the line: "begins with this',
			'# timestamp prefix", not "contains it somewhere".',
			'grep "^2025-03-01 08:05" /var/log/app.log',
			'',
			'# No -q in this shell, so silence grep with a redirect and use only',
			'# its exit status: 1 (no match) makes || run the fallback.',
			'grep FATAL /var/log/app.log > matches.txt || echo "no FATAL entries"',
			'',
		].join('\n'),

		explanation: [
			'<p><code>grep ERROR</code> narrows because <code>ERROR</code> appears ' +
			'only where it means something — unlike <code>2025</code>, which is in ' +
			'every timestamp. The three hits print in file order; the check pins ' +
			'that order, including the fact that ' +
			'<code>db connection lost</code> appears <em>twice</em> (log lines 4 ' +
			'and 10 are identical — real incidents repeat).</p>',
			'<p><code>-c</code> answers "how many" without the lines ' +
			'(<code>2</code> WARNs); <code>-n</code> answers "where" ' +
			'(<code>7:</code>). The non-info count takes the pipeline route: ' +
			'<code>-vi</code> drops every info line regardless of case, and the ' +
			'piped <code>wc -l</code> prints a bare <code>5</code>.</p>',
			'<p>The anchor is the precision tool: <code>"^2025-03-01 08:05"</code> ' +
			'matches only lines <em>starting</em> with that minute — the 08:05:09 ' +
			'timeout and the 08:05:10 retry, adjacent in the output. Finally, ' +
			'<code>grep FATAL … &gt; matches.txt || echo …</code> is grep as a ' +
			'<em>predicate</em>: no match means exit status 1, the redirect keeps ' +
			'stdout clean either way, and <code>||</code> reacts to the status ' +
			'alone — the shell\'s <code>if err != nil</code>.</p>',
		],
	});
})();
