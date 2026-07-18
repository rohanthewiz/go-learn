/* loops-for — `for x in WORDS` iterates a word list, never a numeric range:
 * globs, $(cat …), and $(seq …) are the three feeders. The solution builds
 * a per-file report from the *.txt glob (wc -l < $f for the bare count), a
 * seq countdown, and a per-service count loop fed by a cut|sort -u pipeline
 * over the log. Note the deliberate two-step in the service loop: the count
 * lands in a variable first, because the interpreter (like several real
 * shells' corner cases) rejects nested double quotes inside $() inside
 * double quotes. Checks pin the two file-report lines in glob-sorted order,
 * the countdown as the flat run "3 2 1 liftoff", and the three service
 * lines in sorted order via an indexOf chain.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'loops-for',
		title: 'for Loops',
		nav: 'for',
		category: 'Logic & Scripting',

		prose: [
			'<h2>for Loops</h2>' +
			'<p>The shell\'s <code>for</code> is not a counting loop — it walks ' +
			'a list of <strong>words</strong>: <code>for x in a b c; do …; ' +
			'done</code> runs the body three times with <code>$x</code> bound to ' +
			'each word. Coming from Go, it is <code>for _, x := range words</code> ' +
			'and nothing else; there is no C-style ' +
			'<code>for i:=0; i&lt;n; i++</code>. Everything interesting is in ' +
			'<em>where the words come from</em>:</p>' +
			'<ul>' +
			'<li>a <strong>glob</strong>: <code>for f in *.txt</code> — the ' +
			'shell expands the pattern to sorted filenames <em>before</em> the ' +
			'loop starts</li>' +
			'<li>a <strong>command substitution</strong>: <code>for w in ' +
			'$(cat fruit.txt)</code> — the output is split on whitespace into ' +
			'words</li>' +
			'<li><code>seq</code>, when you really do want numbers: ' +
			'<code>for i in $(seq 3)</code> walks 1 2 3, and ' +
			'<code>seq 3 -1 1</code> counts down</li>' +
			'</ul>',
			{ lang: 'sh', code: 'for name in alpha beta gamma; do\n  echo "unit: $name"\ndone\n\n# globs expand per path segment, so this walks both projects:\nfor f in projects/*/main.go; do\n  echo "building $f"\ndone' },
			'<p>Inside the body, write <code>"$f"</code> with quotes. Unquoted, ' +
			'the value would be re-split into words before the command sees it — ' +
			'harmless for <code>notes.txt</code>, wrong the day a value carries a ' +
			'space. The discipline is mechanical: bare in the <code>in</code> ' +
			'list (you <em>want</em> splitting there), quoted everywhere ' +
			'else.</p>' +
			'<p>One more trick this lesson leans on: <code>wc -l file</code> ' +
			'prints <code>N file</code>, but <code>wc -l &lt; file</code> reads ' +
			'stdin and prints a bare <code>N</code> — the form you want inside a ' +
			'report line. And because <code>ls</code> and globs here are always ' +
			'sorted (this shell removes nondeterminism by construction — real ' +
			'shells vary with locale), loop output order is pinnable.</p>' +
			'<h3>Your job</h3>' +
			'<p>Three loops. One: over <code>*.txt</code>, print ' +
			'<code>FILE: N lines</code> per file using ' +
			'<code>$(wc -l &lt; $f)</code>. Two: a countdown — ' +
			'<code>seq 3 -1 1</code>, then <code>liftoff</code>. Three: over the ' +
			'log\'s unique services — feed the loop ' +
			'<code>$(cut -d " " -f 4 /var/log/app.log | sort -u)</code> — print ' +
			'<code>SERVICE: N entries</code>, counting with ' +
			'<code>grep -c " $s "</code> (spaces around <code>$s</code> so ' +
			'<code>api</code> cannot match inside another word).</p>' +
			'<div class="tip">Capture the count into a variable ' +
			'(<code>n=$(grep -c " $s " …)</code>) and then echo ' +
			'<code>"$s: $n entries"</code>. Splicing that <code>$( )</code> — ' +
			'which contains its own double quotes — directly inside a ' +
			'double-quoted string is a nesting corner this shell rejects, and a ' +
			'thing many real shells only handle by squinting. The two-step is ' +
			'clearer anyway.</div>',
		],

		task: 'Loop over *.txt printing per-file line counts, count down with seq, then report per-service entry counts.',

		starter: [
			'# One hardcoded report line. A loop should be writing these.',
			'echo "some-file.txt: ? lines"',
			'',
			'# TODO 1: for f in *.txt — echo "$f: $(wc -l < $f) lines" for each.',
			'#         (wc -l < file prints a BARE count; wc -l file appends',
			'#         the filename, which you do not want mid-sentence.)',
			'# TODO 2: countdown — for i in $(seq 3 -1 1) echoing $i,',
			'#         then echo liftoff after the loop.',
			'# TODO 3: for s in $(cut -d " " -f 4 /var/log/app.log | sort -u) —',
			'#         capture n=$(grep -c " $s " /var/log/app.log), then',
			'#         echo "$s: $n entries".',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var iFruit = flat.indexOf('fruit.txt: 6 lines');
			var iNotes = flat.indexOf('notes.txt: 3 lines');
			var iApi = flat.indexOf('api: 4 entries');
			var iCache = flat.indexOf('cache: 2 entries');
			var iDb = flat.indexOf('db: 4 entries');
			return iFruit !== -1 && iNotes !== -1 && iFruit < iNotes && // glob order
				flat.indexOf('3 2 1 liftoff') !== -1 &&                // countdown run
				iApi !== -1 && iCache !== -1 && iDb !== -1 &&
				iApi < iCache && iCache < iDb;                         // sort -u order
		},

		solution: [
			'# The glob expands to the sorted word list `fruit.txt notes.txt`',
			'# BEFORE the loop runs; the loop itself just walks words.',
			'for f in *.txt; do',
			'  echo "$f: $(wc -l < $f) lines"    # < form: bare count, no filename',
			'done',
			'',
			'# seq feeds numbers in as words — start, step, stop.',
			'for i in $(seq 3 -1 1); do',
			'  echo $i',
			'done',
			'echo liftoff',
			'',
			'# cut takes field 4 (the service) from every log line; sort -u',
			'# collapses the ten lines to three unique names: api cache db.',
			'for s in $(cut -d " " -f 4 /var/log/app.log | sort -u); do',
			'  # Two-step on purpose: capture first, then interpolate — quotes',
			'  # inside $() inside quotes is a nesting corner best avoided.',
			'  n=$(grep -c " $s " /var/log/app.log)',
			'  echo "$s: $n entries"',
			'done',
			'',
		].join('\n'),

		explanation: [
			'<p>The first loop is the shape you will type for the rest of your ' +
			'career: glob in the <code>in</code> slot, quoted <code>"$f"</code> ' +
			'in the body. <code>*.txt</code> expands to ' +
			'<code>fruit.txt notes.txt</code> — sorted, so the check can pin ' +
			'fruit before notes — and <code>$(wc -l &lt; $f)</code> splices a ' +
			'bare count into each sentence: <code>fruit.txt: 6 lines</code>, ' +
			'<code>notes.txt: 3 lines</code>.</p>',
			'<p>The countdown shows <code>for</code> never counts by itself: ' +
			'<code>seq 3 -1 1</code> prints <code>3 2 1</code>, the substitution ' +
			'splits that into three words, and the loop walks them. If you need ' +
			'Go\'s <code>for i := 3; i &gt; 0; i--</code>, this is how it is ' +
			'spelled here.</p>',
			'<p>The service loop is a real pipeline-feeds-loop pattern: ' +
			'<code>cut -d " " -f 4</code> extracts the service column, ' +
			'<code>sort -u</code> reduces it to <code>api cache db</code>, and ' +
			'the body runs one <code>grep -c</code> per service — the spaces in ' +
			'<code>" $s "</code> anchor the match to a whole field. The check ' +
			'pins all three counts (4, 2, 4) in sorted order via an indexOf ' +
			'chain: the counting and the iteration both have to be real.</p>',
		],
	});
})();
