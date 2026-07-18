/* pipes — | connects one program's stdout to the next one's stdin: programs
 * as composable filters, the Unix idea in one operator. Built stepwise so
 * every intermediate stream is visible: raw cat, | sort (uniq needs
 * adjacency), | uniq, then the two payoffs — sort|uniq -c frequency table
 * and cat|sort|uniq|wc -l distinct count. Check pins the raw cat at
 * position 0, the sorted and deduped stages as newline blocks, the uniq -c
 * counts with their width-4 padding against RAW stdout (flat collapses the
 * padding — the brief's own trap), padded-count ordering, and a final line
 * that is exactly `3`.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'pipes',
		title: 'Pipes',
		nav: 'Pipes',
		category: 'First Steps',

		prose: [
			'<h2>Pipes</h2>' +
			'<p><code>a | b</code> connects <code>a</code>\'s stdout to ' +
			'<code>b</code>\'s stdin — no temp file, no names, just a stream. ' +
			'This is the Unix idea in one operator: write small programs that ' +
			'each do one transformation, speak plain text on both ends, and let ' +
			'the shell compose them. Coming from Go: a pipeline is goroutines ' +
			'connected by channels — except the processes come precompiled, and ' +
			'the element type is always the same: lines of text. That untyped ' +
			'interface is the tradeoff that makes <em>any</em> two tools ' +
			'composable.</p>',
			{ lang: 'sh', code: 'sort fruit.txt | head -2   # first two lines of the SORTED stream\ncat notes.txt | wc -l      # 3 — wc read a stream, no filename in sight\ngrep -c ERROR /var/log/app.log   # a taste of later lessons: count matches' },
			'<p>The craft is <strong>building pipelines stepwise</strong>: run ' +
			'the first stage alone, look at the stream, add one filter, look ' +
			'again. Today\'s pipeline answers "how many <em>distinct</em> fruits ' +
			'are in <code>fruit.txt</code>?" — six lines, three fruits. ' +
			'<code>sort</code> orders the stream; <code>uniq</code> collapses ' +
			'<em>adjacent</em> duplicate lines, which is exactly why sort must ' +
			'come first (on the raw file, uniq removes nothing — no two equal ' +
			'lines touch). Two finishers: <code>uniq -c</code> prefixes each ' +
			'surviving line with its count, and <code>wc -l</code> reduces the ' +
			'stream to a number.</p>' +
			'<p>Rules of thumb for reading any pipeline:</p>' +
			'<ul>' +
			'<li>Data flows left to right; each stage sees only the previous ' +
			'stage\'s stdout.</li>' +
			'<li>Every stage is a filter: lines in, lines out, no side ' +
			'channel.</li>' +
			'<li><code>uniq</code> assumes sorted input; <code>wc -l</code> ' +
			'ends a pipeline by turning lines into one number.</li>' +
			'</ul>' +
			'<h3>Your job</h3>' +
			'<p>Build it in stages, keeping each one\'s output visible: ' +
			'<code>cat fruit.txt</code> raw, then <code>| sort</code>, then ' +
			'<code>| sort | uniq</code>. Finish with the frequency table ' +
			'<code>sort fruit.txt | uniq -c</code> and the distinct count ' +
			'<code>cat fruit.txt | sort | uniq | wc -l</code> — which prints ' +
			'<code>3</code>.</p>' +
			'<div class="tip"><code>cat file | sort</code> earns purists\' ' +
			'scorn as a "useless use of cat" — <code>sort file</code> does the ' +
			'same with one process fewer. It survives because pipelines read ' +
			'left-to-right as data-then-filters, and while you are building one ' +
			'stepwise, starting from <code>cat</code> lets you add and remove ' +
			'stages without rewriting the head of the line.</div>',
		],

		task: 'Stage by stage: cat fruit.txt, | sort, | sort | uniq, then sort|uniq -c and cat|sort|uniq|wc -l (= 3).',

		starter: [
			'# Six lines, three fruits. Each stage below runs ALONE — connect',
			'# them with | so each program feeds the next.',
			'',
			'# Stage 0 — the raw stream (keep this one as is):',
			'cat fruit.txt',
			'',
			'# Stage 1 — TODO: cat fruit.txt | sort',
			'sort fruit.txt',
			'',
			'# Stage 2 — TODO: cat fruit.txt | sort | uniq',
			'# uniq alone is a trap: it only collapses ADJACENT duplicates,',
			'# and in the raw file no two equal lines touch — watch it pass',
			'# all six lines through untouched:',
			'uniq fruit.txt',
			'',
			'# Stage 3 — TODO: sort fruit.txt | uniq -c   (frequency table)',
			'',
			'# Stage 4 — TODO: cat fruit.txt | sort | uniq | wc -l',
			'# The whole question — "how many distinct fruits?" — as one line.',
			'wc -l fruit.txt',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// uniq -c pads counts to width 4 — pinned against RAW stdout,
			// because flat collapses the padding to single spaces.
			var i3 = stdout.indexOf('   3 apple');
			var i2 = stdout.indexOf('   2 banana');
			var i1 = stdout.indexOf('   1 cherry');
			return stdout.indexOf('banana\napple\ncherry\napple\nbanana\napple\n') === 0 && // raw cat, first
				flat.indexOf('apple apple apple banana banana cherry') !== -1 &&           // sorted stage
				stdout.indexOf('\napple\nbanana\ncherry\n') !== -1 &&                      // deduped stage
				i3 !== -1 && i2 !== -1 && i1 !== -1 &&
				i3 < i2 && i2 < i1 &&                        // frequency table, sorted order
				/\n3\n$/.test(stdout);                       // the answer: a bare final 3
		},

		solution: [
			'# Stage 0 — the raw stream. Order is file order; duplicates are',
			'# scattered, so nothing equal is adjacent yet.',
			'cat fruit.txt',
			'',
			'# Stage 1 — | hands cat\'s stdout to sort\'s stdin. Now equal lines',
			'# sit together: apple apple apple banana banana cherry.',
			'cat fruit.txt | sort',
			'',
			'# Stage 2 — uniq collapses runs of identical ADJACENT lines; after',
			'# sort, that means true dedup: three lines survive.',
			'cat fruit.txt | sort | uniq',
			'',
			'# The frequency table: -c prefixes each surviving line with the',
			'# size of its run (counts padded to width 4). sort file | ... is',
			'# the same stream without the cat stage.',
			'sort fruit.txt | uniq -c',
			'',
			'# Reduce the deduped stream to a number: 3 distinct fruits.',
			'# wc reads stdin here, so the count comes back bare — no filename.',
			'cat fruit.txt | sort | uniq | wc -l',
			'',
		].join('\n'),

		explanation: [
			'<p>Each <code>|</code> splices two processes together: the left ' +
			'side writes lines, the right side reads them, and no intermediate ' +
			'file ever exists. Running the stages separately is not busywork — ' +
			'it is how pipelines are actually written: inspect the stream, add ' +
			'one filter, inspect again. The check pins all three intermediate ' +
			'streams, so every stage has to run.</p>',
			'<p>The <code>sort</code>-before-<code>uniq</code> ordering is the ' +
			'lesson\'s one sharp edge: <code>uniq</code> is a <em>streaming</em> ' +
			'filter that compares each line only to the previous one — cheap, ' +
			'single-pass, and blind to duplicates that are not adjacent, as the ' +
			'starter\'s <code>uniq fruit.txt</code> (all six lines pass through) ' +
			'demonstrates. Sorting is what turns "adjacent-dedup" into ' +
			'"dedup".</p>',
			'<p>The finishers show two ways to consume the same stream: ' +
			'<code>uniq -c</code> keeps the lines and annotates each with its ' +
			'run length — <code>   3 apple</code>, counts padded to a fixed ' +
			'width 4 — while <code>wc -l</code> throws the lines away and keeps ' +
			'only how many there were. The final <code>3</code> arrives bare, ' +
			'no filename, because wc read stdin — the previous lesson\'s ' +
			'distinction, now doing real work at the end of a pipeline.</p>',
		],
	});
})();
