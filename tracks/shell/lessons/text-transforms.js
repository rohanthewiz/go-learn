/* text-transforms — tr (character-level: ranges, -d), sed (line-level,
 * s///[g] only in this shell — the lesson says so explicitly), head/tail
 * for slicing streams, cat -n for numbering, and a composed pipeline
 * (grep | sed | tr) that stacks all three altitudes: pick lines, rewrite
 * within lines, rewrite characters. Starter stubs echo the untouched text;
 * the check pins the transformed forms (uppercased motd, cactus for ferns
 * with 'ferns' absent, head-3/tail-2 slices with line 5's 08:02:45 absent
 * as the "didn't just cat the whole log" guard, and the two E! DB lines
 * bracketing E! API via an indexOf chain). All outputs prototyped against
 * the real core before pinning.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'text-transforms',
		title: 'Transforms: tr, sed, head, tail',
		nav: 'tr/sed',
		category: 'Text Tools',

		prose: [
			'<h2>Transforms: tr, sed, head, tail</h2>' +
			'<p>grep selects lines; these tools <em>change</em> them. They work at ' +
			'different altitudes. <code>tr SET1 SET2</code> is character-level: it ' +
			'reads stdin and maps each character in SET1 to its positional partner ' +
			'in SET2 — <code>tr a-z A-Z</code> uppercases because the ranges ' +
			'expand and line up letter by letter. <code>tr -d SET</code> deletes ' +
			'instead of mapping. tr never sees "lines" or "words", only a stream ' +
			'of characters, and it only reads stdin — feed it with a pipe or a ' +
			'<code>&lt;</code> redirect, never a filename argument.</p>' +
			'<p><code>sed</code> is line-level: <code>sed s/pat/rep/ file</code> ' +
			'replaces the <em>first</em> regex match on each line; a trailing ' +
			'<code>g</code> (<code>s/pat/rep/g</code>) replaces every match on the ' +
			'line. Real sed is an entire scripting language (addresses, deletes, ' +
			'hold space); <strong>this shell implements only ' +
			'<code>s///[g]</code></strong> — which is honestly 95% of real-world ' +
			'sed use. Coming from Go: tr is <code>strings.Map</code>, sed is ' +
			'<code>regexp.ReplaceAllString</code> applied per line.</p>',
			{ lang: 'sh', code: 'echo "go go go" | sed s/go/GO/     # GO go go   — first match only\necho "go go go" | sed s/go/GO/g    # GO GO GO   — g means all\necho "banana" | tr an xy           # bxyxyx     — a->x, n->y, by position\necho "3,141,592" | tr -d ,        # 3141592    — -d deletes the set' },
			'<p><code>head -n N</code> and <code>tail -n N</code> slice a stream: ' +
			'the first N lines, the last N lines. They are how you sample a huge ' +
			'file without reading it, and how a sorted pipeline becomes a "top 3" ' +
			'report. <code>cat -n</code> numbers lines on the way through — ' +
			'useful at the end of a pipeline when you want ranks. All of these ' +
			'compose with everything you have: each tool reads lines, writes ' +
			'lines, and does one transformation. Pipelines are Go channels with ' +
			'the plumbing already written.</p>' +
			'<h3>Your job</h3>' +
			'<p>Each starter stub prints text untouched. Transform it: uppercase ' +
			'<code>/etc/motd</code> with <code>tr a-z A-Z</code>; run ' +
			'<code>sed s/ferns/cactus/</code> over <code>notes.txt</code> and ' +
			'number the result with <code>cat -n</code>; print only the first 3 ' +
			'then the last 2 lines of <code>/var/log/app.log</code>; and build ' +
			'the combined pipeline ' +
			'<code>grep ERROR | sed \'s/ERROR/E!/\' | tr a-z A-Z</code> — select, ' +
			'rewrite the word, shout the rest.</p>' +
			'<div class="tip">Order of altitudes matters in the combined ' +
			'pipeline: <code>sed \'s/ERROR/E!/\'</code> must run <em>before</em> ' +
			'<code>tr a-z A-Z</code> — after tr there is no lowercase left, but ' +
			'more importantly, if tr ran a hypothetical lowercasing first, sed\'s ' +
			'pattern would no longer match. When stacking transforms, ask what ' +
			'each stage\'s <em>input</em> looks like, not what the original ' +
			'was.</div>',
		],

		task: 'Uppercase the motd with tr, sed ferns->cactus + cat -n over notes.txt, head -n 3 and tail -n 2 of app.log, then grep | sed | tr combined.',

		starter: [
			'# Every stub below prints its text UNCHANGED. Add the transforms.',
			'',
			'# TODO: uppercase the message of the day — tr a-z A-Z reads stdin,',
			'# so feed the file in with < (tr takes no filename arguments).',
			'cat /etc/motd',
			'',
			'# TODO: sed s/ferns/cactus/ over notes.txt, numbered via | cat -n.',
			'cat notes.txt',
			'',
			'# TODO: only the first 3 lines (head -n 3), then the last 2 (tail -n 2).',
			'cat /var/log/app.log',
			'',
			'# TODO: compose: grep ERROR | sed \'s/ERROR/E!/\' | tr a-z A-Z',
			'grep ERROR /var/log/app.log',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var e1 = stdout.indexOf('E! DB CONNECTION LOST');            // log line 4
			var e2 = stdout.indexOf('E! API UPSTREAM TIMEOUT /PAY 5001MS'); // line 8
			var e3 = stdout.indexOf('E! DB CONNECTION LOST', e1 + 1);    // line 10
			return flat.indexOf('WELCOME TO LEARNIX') !== -1 &&
				flat.indexOf('DETERMINISTIC UNIX.') !== -1 &&
				// sed rewrote line 1 of notes.txt; cat -n numbered it (tab after N)
				stdout.indexOf('1\tRemember to water the cactus') !== -1 &&
				stdout.indexOf('ferns') === -1 &&
				// head -n 3 kept line 2; tail -n 2 kept line 9, printed later
				stdout.indexOf('08:00:03 INFO db connect ok 3ms') !== -1 &&
				stdout.indexOf('08:00:03 INFO db connect ok 3ms') <
					stdout.indexOf('08:05:10 INFO api retry /pay 220ms') &&
				// line 5 appears in NO slice or match — guards "just cat the log"
				stdout.indexOf('08:02:45') === -1 &&
				e1 !== -1 && e2 !== -1 && e3 !== -1 && e1 < e2 && e2 < e3;
		},

		solution: [
			'# tr maps characters positionally: the a-z range lines up under A-Z.',
			'# tr only reads stdin, so < feeds it the file.',
			'tr a-z A-Z < /etc/motd',
			'',
			'# sed rewrites within each line (first match, no g needed here);',
			'# cat -n numbers whatever flows through it — transform, then label.',
			'sed s/ferns/cactus/ notes.txt | cat -n',
			'',
			'# Slices: the first 3 lines, then the last 2. Eight lines of log',
			'# are never printed at all.',
			'head -n 3 /var/log/app.log',
			'tail -n 2 /var/log/app.log',
			'',
			'# Three altitudes stacked: grep picks LINES, sed rewrites a WORD',
			'# in each, tr rewrites CHARACTERS in what remains. sed must run',
			'# before tr — its lowercase-sensitive pattern needs the original.',
			"grep ERROR /var/log/app.log | sed 's/ERROR/E!/' | tr a-z A-Z",
			'',
		].join('\n'),

		explanation: [
			'<p><code>tr a-z A-Z &lt; /etc/motd</code> expands both ranges and ' +
			'maps by position — 26 letters onto 26 letters. Everything outside ' +
			'SET1 (spaces, punctuation, the em dash) passes through untouched: ' +
			'<code>WELCOME TO LEARNIX — A SMALL, DETERMINISTIC UNIX.</code> The ' +
			'<code>&lt;</code> matters because tr, unlike sed and grep, takes no ' +
			'file arguments.</p>',
			'<p><code>sed s/ferns/cactus/ notes.txt | cat -n</code> shows the ' +
			'transform-then-label shape: sed touches only the line that matches ' +
			'(the other two pass through), and <code>cat -n</code> numbers the ' +
			'finished stream. The check verifies <code>ferns</code> is gone ' +
			'entirely — a substitution, not an addition.</p>',
			'<p>The slices print lines 1–3 and then 9–10; line 5 ' +
			'(<code>08:02:45</code>) never appears, which is how the check knows ' +
			'you sliced instead of dumping the file. The combined pipeline is the ' +
			'lesson in one line: <code>grep</code> selects the three ERROR lines, ' +
			'<code>sed</code> rewrites <code>ERROR</code> to <code>E!</code> ' +
			'within each, and <code>tr</code> uppercases every remaining ' +
			'character — <code>E! DB CONNECTION LOST</code> twice around ' +
			'<code>E! API UPSTREAM TIMEOUT /PAY 5001MS</code>, in file order.</p>',
		],
	});
})();
