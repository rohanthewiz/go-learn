/* capstone-logreport — everything at once: a report generator over
 * /var/log/app.log combining a count_level() function, a heredoc header
 * with live $() substitutions, a for loop of per-level lines, a
 * cut|sort|uniq -c|sort -nr service table, the worst offender peeled off
 * that table with head + sed into a variable, a case on the ERROR count
 * choosing a healthy/degraded/critical verdict, the whole thing
 * accumulated into report.txt via > then >> redirects and displayed ONCE
 * with cat -n. Starter is the skeleton: header heredoc written for you, a
 * TODO roadmap, plain `cat` at the end — runs clean, prints only the
 * header, and fails every tab-prefixed pin. Check pins against RAW stdout
 * (cat -n tabs + uniq -c 4-wide padding both collapse in flat): the
 * numbered header line, tab-prefixed level lines (proving they flowed
 * through the file, not straight to stdout), the padded table rows in
 * sort -nr order (4 db before 4 api — numeric tie broken lexicographically
 * by the full reversed line, deterministic here), worst offender db, and
 * the critical verdict. Verified: INFO=5 WARN=2 ERROR=3, api/db/cache =
 * 4/4/2, report is 12 lines.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'capstone-logreport',
		title: 'Capstone: Log Report',
		nav: 'Capstone',
		category: 'Capstone',

		prose: [
			'<h2>Capstone: Log Report</h2>' +
			'<p>Time to spend the whole toolbox at once. The job is the ' +
			'ops-script classic: read <code>/var/log/app.log</code> and produce a ' +
			'small report — level counts, a service frequency table, the worst ' +
			'offender, and a verdict — written to <code>report.txt</code> and ' +
			'displayed at the end. Every piece is a lesson you have already done: ' +
			'a function for the repeated count, a <code>for</code> loop over the ' +
			'levels, one pipeline for the table, <code>$( )</code> to capture, ' +
			'<code>case</code> to judge, and redirection to accumulate. Coming ' +
			'from Go: this is the program you would write with a struct, a map, ' +
			'and <code>text/tabwriter</code> — in the shell it is a dozen lines, ' +
			'because every stage is a program you compose instead of code you ' +
			'write.</p>',
			{ lang: 'sh', code: '# the accumulate-then-show shape\ncat > out.txt <<EOF\nheader: $(wc -l < data.txt) lines\nEOF\necho "body" >> out.txt     # > creates, >> appends — mind the difference\ncat -n out.txt             # display ONCE, numbered' },
			'<p>Two mechanics carry the whole script. <strong>Accumulation</strong>: ' +
			'the heredoc <code>cat &gt; $REPORT &lt;&lt;EOF</code> creates the ' +
			'file (heredocs expand <code>$VAR</code> and <code>$( )</code>, so ' +
			'the header can embed a live line count), and every later stage ' +
			'appends with <code>&gt;&gt;</code> — one accidental <code>&gt;</code> ' +
			'in the middle silently truncates everything before it. ' +
			'<strong>Extraction</strong>: the frequency table is the counting ' +
			'idiom <code>cut -d\' \' -f4 | sort | uniq -c | sort -nr</code>, and ' +
			'its top line — <code>head -n 1</code> — is <em>data</em> you can ' +
			'mine again: <code>sed \'s/^ *[0-9]* //\'</code> strips the padded ' +
			'count, leaving the bare service name to capture into a variable.</p>' +
			'<p>The report, line by line (12 total):</p>' +
			'<ul>' +
			'<li>3 header lines — the heredoc, written for you</li>' +
			'<li><code>INFO: 5</code>, <code>WARN: 2</code>, <code>ERROR: 3</code> ' +
			'— a loop calling <code>count_level</code></li>' +
			'<li><code>-- events by service --</code> plus the table: ' +
			'<code>4 db</code>, <code>4 api</code>, <code>2 cache</code> (db ' +
			'before api — the numeric tie breaks on the text, deterministically ' +
			'here, so even the tie is pinnable)</li>' +
			'<li><code>worst offender: db</code> — the mined top line</li>' +
			'<li><code>verdict: critical (3 errors)</code> — a <code>case</code> ' +
			'on the ERROR count: 0 healthy, 1 or 2 degraded, more critical</li>' +
			'</ul>' +
			'<h3>Your job</h3>' +
			'<p>Follow the TODO roadmap in the starter: define ' +
			'<code>count_level()</code>, append the level lines, the table, the ' +
			'worst offender, and the verdict, then swap the final plain ' +
			'<code>cat</code> for <code>cat -n</code>. Nothing but the header may ' +
			'print except through the file.</p>' +
			'<div class="tip">Build into the file, display once at the end. The ' +
			'final <code>cat -n</code> is not decoration: numbered output proves ' +
			'the report exists as a <em>file</em> with lines in a fixed order — ' +
			'in this deterministic shell, position is part of the contract, and ' +
			'the check pins it.</div>',
		],

		task: 'Finish the generator: count_level(), per-level loop, service table, worst offender, case verdict — all appended to report.txt, shown with cat -n.',

		starter: [
			'LOG=/var/log/app.log',
			'REPORT=report.txt',
			'',
			'# The header is written for you: > creates the file, and the heredoc',
			'# expands $LOG and $(wc -l < $LOG) on the way in.',
			'cat > $REPORT <<EOF',
			'==== SERVICE LOG REPORT ====',
			'source: $LOG',
			'lines: $(wc -l < $LOG)',
			'EOF',
			'',
			'# TODO 1: count_level() { grep -c " $1 " $LOG; }  — the level rides',
			'#         between spaces so only the level column matches.',
			'',
			'# TODO 2: for lvl in INFO WARN ERROR — append "$lvl: N" lines using',
			'#         $(count_level $lvl), with >> (a bare > here would eat the',
			'#         header you just wrote).',
			'',
			'# TODO 3: append the line "-- events by service --", then the table:',
			'#         cut -d\' \' -f4 $LOG | sort | uniq -c | sort -nr >> $REPORT',
			'',
			'# TODO 4: worst=$( that same pipeline | head -n 1 | sed \'s/^ *[0-9]* //\' )',
			'#         then append "worst offender: $worst".',
			'',
			'# TODO 5: errors=$(count_level ERROR); case $errors in — 0) healthy,',
			'#         1|2) degraded, *) critical — append',
			'#         "verdict: $verdict ($errors errors)".',
			'',
			'# TODO 6: display the finished report ONCE, numbered: cat -n $REPORT',
			'cat $REPORT',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// Raw-stdout pins: cat -n's tab after the line number and uniq -c's
			// 4-wide count padding both collapse to single spaces in flat.
			var db = stdout.indexOf('   4 db');
			var api = stdout.indexOf('   4 api');
			var cache = stdout.indexOf('   2 cache');
			return stdout.indexOf('1\t==== SERVICE LOG REPORT ====') !== -1 &&
				// level lines flowed through the file and out of cat -n:
				stdout.indexOf('\tINFO: 5') !== -1 &&
				stdout.indexOf('\tWARN: 2') !== -1 &&
				stdout.indexOf('\tERROR: 3') !== -1 &&
				// the table, padded and in sort -nr order (tie: db before api):
				db !== -1 && api !== -1 && cache !== -1 &&
				db < api && api < cache &&
				flat.indexOf('worst offender: db') !== -1 &&
				stdout.indexOf('\tverdict: critical (3 errors)') !== -1;
		},

		solution: [
			'LOG=/var/log/app.log',
			'REPORT=report.txt',
			'',
			'# One function, called four times below. The spaces around $1 anchor',
			'# the level to its own column — "ERROR" in a message would not count.',
			'count_level() {',
			'\tgrep -c " $1 " $LOG',
			'}',
			'',
			'# > creates the report; the heredoc expands $LOG and $(...) inline.',
			'cat > $REPORT <<EOF',
			'==== SERVICE LOG REPORT ====',
			'source: $LOG',
			'lines: $(wc -l < $LOG)',
			'EOF',
			'',
			'# Per-level lines: the loop supplies the word, the function counts.',
			'# Everything from here down APPENDS — one stray > would truncate.',
			'for lvl in INFO WARN ERROR; do',
			'\techo "$lvl: $(count_level $lvl)" >> $REPORT',
			'done',
			'',
			'# Service frequency: field 4 is the service name. sort groups,',
			'# uniq -c counts (4-wide padded), sort -nr ranks biggest first.',
			'echo "-- events by service --" >> $REPORT',
			'cut -d\' \' -f4 $LOG | sort | uniq -c | sort -nr >> $REPORT',
			'',
			'# The table\'s top line is data too: head takes it, sed strips the',
			'# leading padding and count, leaving the bare service name.',
			'worst=$(cut -d\' \' -f4 $LOG | sort | uniq -c | sort -nr | head -n 1 | sed \'s/^ *[0-9]* //\')',
			'echo "worst offender: $worst" >> $REPORT',
			'',
			'# Verdict: dispatch on the ERROR count. Glob patterns, first match',
			'# wins — 0, then 1|2, then everything else.',
			'errors=$(count_level ERROR)',
			'case $errors in',
			'\t0)   verdict=healthy ;;',
			'\t1|2) verdict=degraded ;;',
			'\t*)   verdict=critical ;;',
			'esac',
			'echo "verdict: $verdict ($errors errors)" >> $REPORT',
			'',
			'# Display ONCE, numbered — the report is a file, not loose stdout.',
			'cat -n $REPORT',
			'',
		].join('\n'),

		explanation: [
			'<p>The script is a straight pipeline of the track: ' +
			'<code>count_level()</code> wraps <code>grep -c " $1 " $LOG</code> so ' +
			'the repeated count is written once (the spaces keep the match in the ' +
			'level column); the heredoc header shows redirection and substitution ' +
			'cooperating — <code>$(wc -l &lt; $LOG)</code> runs while the header ' +
			'is being written; and the <code>for</code> loop emits ' +
			'<code>INFO: 5</code>, <code>WARN: 2</code>, <code>ERROR: 3</code> by ' +
			'capturing the function’s stdout with <code>$( )</code> — values ' +
			'come back by printing, the capstone’s quiet restatement of the ' +
			'functions lesson.</p>',
			'<p>The table is the counting idiom end to end: <code>cut</code> ' +
			'isolates field 4, <code>sort</code> groups, <code>uniq -c</code> ' +
			'counts with 4-wide padding, <code>sort -nr</code> ranks. db and api ' +
			'tie at 4 — this shell breaks numeric ties on the line text ' +
			'(reversed with <code>-r</code>), so <code>4 db</code> lands first, ' +
			'every run. Then the top line is re-mined: <code>head -n 1</code> ' +
			'takes it, <code>sed \'s/^ *[0-9]* //\'</code> peels the count, and ' +
			'<code>$( )</code> banks <code>db</code> in a variable — pipelines ' +
			'produce data, and data feeds the next stage, even mid-script.</p>',
			'<p><code>case $errors in</code> turns the count 3 into ' +
			'<code>critical</code> via the <code>*)</code> arm, and ' +
			'<code>cat -n</code> replays the finished file with line numbers. ' +
			'The check reads the raw, un-flattened stdout deliberately: the tab ' +
			'after each line number and the spaces in <code>   4 db</code> are ' +
			'evidence — of the file display and the <code>uniq -c</code> ' +
			'padding — that whitespace-collapsed matching would throw away.</p>',
		],
	});
})();
