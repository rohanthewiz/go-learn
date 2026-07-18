/* fields-pipelines — cut, sort, uniq, and the canonical frequency-table
 * pipeline `cut | sort | uniq -c | sort -nr` over app.log's LEVEL (field 3)
 * and service (field 4) columns. The lesson's spine is the sort-before-uniq
 * law: uniq only collapses ADJACENT duplicates, so the starter's unsorted
 * `uniq -c` produces visibly wrong counts, and the solution keeps that wrong
 * table (labeled) next to the right ones. Counts verified against the core:
 * levels 5 INFO / 3 ERROR / 2 WARN; services 4 db / 4 api / 2 cache (the
 * 4-4 tie under sort -nr breaks by full-line comparison, db before api).
 * uniq -c pads counts to width 4 and flat collapses that padding, so every
 * count line is pinned against RAW stdout with \n-joined adjacency.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'fields-pipelines',
		title: 'Fields: cut, sort, uniq',
		nav: 'cut/sort/uniq',
		category: 'Text Tools',

		prose: [
			'<h2>Fields: cut, sort, uniq</h2>' +
			'<p>Log lines are records; <code>cut</code> picks a column out of ' +
			'them. <code>cut -d " " -f 3</code> says: split each line on spaces ' +
			'(<code>-d</code> sets the delimiter, tab by default) and keep field 3 ' +
			'(1-based). Run it over <code>/var/log/app.log</code> and the LEVEL ' +
			'column falls out — ten words, one per line. Field 4 is the service ' +
			'name. Coming from Go, a pipeline of these tools is ' +
			'<code>strings.Fields</code> + a <code>map[string]int</code> tally in ' +
			'zero lines of code.</p>' +
			'<p><code>sort</code> orders lines: <code>-n</code> compares ' +
			'numerically instead of lexically (so <code>9</code> sorts before ' +
			'<code>412</code>), <code>-r</code> reverses, and <code>-u</code> ' +
			'drops exact duplicates after sorting — the quick "distinct values" ' +
			'answer. <code>uniq</code> collapses repeated lines, and ' +
			'<code>uniq -c</code> prefixes each surviving line with how many times ' +
			'it repeated, padded to a fixed width: <code>&nbsp;&nbsp;&nbsp;3 apple</code>.</p>',
			{ lang: 'sh', code: 'uniq -c fruit.txt           # WRONG counts: banana/apple alternate, so\n                            # nothing is adjacent and little collapses\nsort fruit.txt | uniq -c    # right:    3 apple / 2 banana / 1 cherry' },
			'<p>That snippet is the whole law: <strong>uniq only collapses ' +
			'<em>adjacent</em> duplicates</strong>. It compares each line to the ' +
			'previous one and nothing else — a deliberate design from the ' +
			'streaming era: comparing only neighbors needs constant memory, and ' +
			'putting equal lines next to each other is <code>sort</code>\'s job. ' +
			'<code>sort | uniq</code> is therefore an idiom, not a suggestion; ' +
			'<code>uniq</code> without <code>sort</code> is almost always a bug ' +
			'that produces plausible-looking wrong numbers.</p>' +
			'<p>Put the pieces together and you get the canonical frequency ' +
			'table, worth memorizing as a unit: ' +
			'<code>cut … | sort | uniq -c | sort -nr</code> — extract the column, ' +
			'group equal values, count each group, order groups by count ' +
			'descending. Four stages, each doing one thing.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter counts log levels without sorting first — keep that ' +
			'run under its <code>-- wrong: uniq without sort --</code> header as ' +
			'evidence, then add the real tables: level frequencies (field 3) and ' +
			'service frequencies (field 4), both via ' +
			'<code>cut | sort | uniq -c | sort -nr</code> under ' +
			'<code>-- levels --</code> and <code>-- services --</code> headers, ' +
			'and finish with the distinct service names via <code>sort -u</code> ' +
			'under <code>-- distinct --</code>.</p>' +
			'<div class="tip">The final <code>sort -nr</code> works because ' +
			'<code>uniq -c</code> puts the count first — numeric sort reads the ' +
			'leading number and ignores the word after it. Ties (here: db and api, ' +
			'4 each) fall back to whole-line comparison, so the order is still ' +
			'deterministic — this shell guarantees a total order precisely so ' +
			'output can be pinned.</div>',
		],

		task: 'Keep the labeled wrong run, then build level and service frequency tables with cut | sort | uniq -c | sort -nr, plus sort -u distinct services.',

		starter: [
			'# The level column is field 3 of the space-separated log lines.',
			'echo "-- wrong: uniq without sort --"',
			'',
			'# BUG (on purpose): uniq only collapses ADJACENT duplicates, and the',
			'# levels arrive interleaved — so these counts are wrong. Look at them:',
			'# INFO shows up three separate times instead of once with count 5.',
			'cut -d " " -f 3 /var/log/app.log | uniq -c',
			'',
			'# TODO under "-- levels --": sort BEFORE uniq -c, then sort -nr',
			'# to order the table by count, biggest first.',
			'',
			'# TODO under "-- services --": the same pipeline for field 4.',
			'',
			'# TODO under "-- distinct --": each service name once (sort -u).',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// uniq -c pads counts to width 4; flat collapses that padding, so all
			// count lines are pinned against RAW stdout, with \n adjacency.
			var wrong = stdout.indexOf('   2 INFO\n   1 WARN\n   1 ERROR\n   2 INFO');
			var levels = stdout.indexOf('   5 INFO\n   3 ERROR\n   2 WARN');
			var services = stdout.indexOf('   4 db\n   4 api\n   2 cache');
			return wrong !== -1 && levels !== -1 && services !== -1 &&
				wrong < levels && levels < services &&
				stdout.indexOf('api\ncache\ndb\n') !== -1 &&
				flat.indexOf('-- distinct --') !== -1;
		},

		solution: [
			'# Kept as evidence: without sort, equal levels are not adjacent, so',
			'# uniq -c reports each little run separately. Wrong, and quietly so.',
			'echo "-- wrong: uniq without sort --"',
			'cut -d " " -f 3 /var/log/app.log | uniq -c',
			'',
			'# The canonical frequency table: extract | group | count | rank.',
			'# sort makes duplicates adjacent; uniq -c counts each run; the final',
			'# sort -nr orders by the leading count, descending.',
			'echo "-- levels --"',
			'cut -d " " -f 3 /var/log/app.log | sort | uniq -c | sort -nr',
			'',
			'# Same shape, different column: field 4 is the service name.',
			'echo "-- services --"',
			'cut -d " " -f 4 /var/log/app.log | sort | uniq -c | sort -nr',
			'',
			'# Just the distinct values, no counts: sort -u.',
			'echo "-- distinct --"',
			'cut -d " " -f 4 /var/log/app.log | sort -u',
			'',
		].join('\n'),

		explanation: [
			'<p>The wrong run is worth staring at: the level stream is ' +
			'<code>INFO INFO WARN ERROR INFO INFO WARN ERROR INFO ERROR</code>, ' +
			'so unsorted <code>uniq -c</code> sees eight little runs — ' +
			'<code>2 INFO</code>, <code>1 WARN</code>, <code>1 ERROR</code>, ' +
			'<code>2 INFO</code> again… Every number is a correct count of an ' +
			'<em>adjacent run</em> and a wrong count of the level. Nothing errors; ' +
			'the numbers are simply not what you meant. That failure mode is why ' +
			'<code>sort | uniq</code> travels as one word.</p>',
			'<p>The real tables land at <code>5 INFO / 3 ERROR / 2 WARN</code> ' +
			'and <code>4 db / 4 api / 2 cache</code>. Note the tie: db and api ' +
			'both count 4, and <code>sort -nr</code> breaks the tie by comparing ' +
			'the whole lines, putting <code>db</code> first — deterministic, ' +
			'which is what lets the check pin it.</p>',
			'<p><code>sort -u</code> is the pipeline\'s little sibling: when you ' +
			'only need <em>which</em> values occur, not how often, it replaces ' +
			'<code>sort | uniq</code> in one flag — <code>api</code>, ' +
			'<code>cache</code>, <code>db</code>, alphabetical because sorted is ' +
			'what made them unique-able in the first place.</p>',
		],
	});
})();
