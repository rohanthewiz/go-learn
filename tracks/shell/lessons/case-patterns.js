/* case-patterns — `case` matches a WORD against GLOB patterns (the same
 * * ? [set] as filenames, NOT regex), first match wins, `|` alternatives,
 * `*)` default, `;;` terminators. Starter is the classic bug made flesh: an
 * if-elif chain testing string EQUALITY against "*.txt" — the pattern is
 * compared as literal text, so everything but the exact-name arm falls to
 * the else. Solution walks `find . -type f | sort` and dispatches
 * `basename` through a four-arm case (text | Go source | profile |
 * default); a touched backup.tar gives the `*)` arm something real to
 * catch. Check pins one labeled line per pattern class, in find order, and
 * pins the starter's misclassification absent. Note: this interpreter's
 * case `*` does not cross `/` (filename-flavored globbing), which is why
 * the dispatcher matches on basename — named in prose as design, since a
 * real file dispatcher strips the directory anyway.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'case-patterns',
		title: 'case',
		nav: 'case',
		category: 'Logic & Scripting',

		prose: [
			'<h2>case</h2>' +
			'<p><code>case</code> matches a <strong>word</strong> against ' +
			'<strong>glob patterns</strong> — the same <code>*</code>, ' +
			'<code>?</code>, and <code>[set]</code> you already aim at filenames, ' +
			'<em>not</em> regex. Arms are tried top to bottom and the ' +
			'<strong>first match wins</strong>; <code>|</code> separates ' +
			'alternative patterns in one arm; <code>*)</code> matches anything, so ' +
			'placed last it is the default; <code>;;</code> ends an arm the way ' +
			'<code>break</code> ends a C switch case — except here it is ' +
			'mandatory and there is no fallthrough to forget. Coming from Go: ' +
			'this is <code>switch</code> with pattern arms instead of values.</p>',
			{ lang: 'sh', code: '# the classic argument dispatcher\ncase $1 in\n\tstart|restart) echo "spinning up" ;;\n\tstop)          echo "shutting down" ;;\n\t[0-9]*)        echo "numeric code: $1" ;;\n\t*)             echo "usage: start|stop" ;;\nesac' },
			'<p>Why not an <code>if</code>-<code>elif</code> chain? Because ' +
			'<code>[ "$f" = "*.txt" ]</code> is the classic trap: <code>=</code> ' +
			'inside <code>test</code> compares <em>literal text</em>, so the ' +
			'condition asks whether the filename is the five characters ' +
			'<code>*.txt</code> — which it never is. The chain runs, exits 0, and ' +
			'quietly misclassifies everything; only exact-equality arms like ' +
			'<code>main.go</code> ever fire. <code>case</code> makes patterns the ' +
			'native comparison, and the pattern-per-arm layout reads like the ' +
			'dispatch table it is.</p>' +
			'<p>One design note, stated rather than hidden: in this shell (as in ' +
			'filename globbing and <code>find -name</code>) a case <code>*</code> ' +
			'does <em>not</em> cross <code>/</code>. So when the words come from ' +
			'<code>find</code> with directory prefixes, strip the path first with ' +
			'<code>$(basename $f)</code> and match on the bare name — exactly ' +
			'what a real file dispatcher does anyway, since ' +
			'<code>./projects/beta/README.md</code> is a location but ' +
			'<code>README.md</code> is the thing you classify.</p>' +
			'<ul>' +
			'<li><code>case WORD in</code> … <code>esac</code> — spelled ' +
			'backwards to close, like <code>if</code>/<code>fi</code></li>' +
			'<li>patterns are globs: <code>*.go</code>, <code>.pr?file</code>, ' +
			'<code>[0-9]*</code> — first match wins, so most-specific first</li>' +
			'<li><code>a|b)</code> — one arm, several patterns</li>' +
			'<li><code>*)</code> last — the default; without it an unmatched word ' +
			'silently does nothing</li>' +
			'</ul>' +
			'<h3>Your job</h3>' +
			'<p>The starter classifies every file with an if-elif equality chain ' +
			'— run it and watch <code>notes.txt</code>, <code>README.md</code>, ' +
			'and <code>.profile</code> all land in <code>unclassified</code>. ' +
			'Convert it to a <code>case</code> on <code>$name</code> with four ' +
			'arms: <code>*.txt|*.md</code> → <code>text</code>, <code>*.go</code> ' +
			'→ <code>Go source</code>, <code>.pr?file</code> → <code>shell ' +
			'profile</code>, and <code>*)</code> → <code>unclassified</code> ' +
			'(which should now catch only <code>backup.tar</code>).</p>' +
			'<div class="tip">Order is the whole contract: first match wins, so ' +
			'arms go most-specific to least, and <code>*)</code> goes last or it ' +
			'eats everything below it. When two patterns could both match — ' +
			'<code>*.go</code> and <code>*</code> match every Go file — position, ' +
			'not specificity, decides.</div>',
		],

		task: 'Replace the equality if-elif chain with a case: *.txt|*.md, *.go, .pr?file, and a *) default — one labeled line per file.',

		starter: [
			'# backup.tar exists so the default arm has something real to catch.',
			'touch backup.tar',
			'',
			'# String EQUALITY against a pattern: "$name" = "*.txt" compares the',
			'# literal five characters *.txt — never true. Only the exact-name',
			'# main.go arm ever fires; everything else falls to the else.',
			'# TODO: convert to  case $name in  with four arms:',
			'#   *.txt|*.md) text            *.go) Go source',
			'#   .pr?file)   shell profile   *)    unclassified',
			'for f in $(find . -type f | sort); do',
			'\tname=$(basename $f)',
			'\tif [ "$name" = "*.txt" ]; then',
			'\t\techo "$f: text"',
			'\telif [ "$name" = "main.go" ]; then',
			'\t\techo "$f: Go source"',
			'\telse',
			'\t\techo "$f: unclassified"',
			'\tfi',
			'done',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var profile = flat.indexOf('./.profile: shell profile');
			var tar = flat.indexOf('./backup.tar: unclassified');
			var txt = flat.indexOf('./fruit.txt: text');
			var goSrc = flat.indexOf('./projects/alpha/main.go: Go source');
			var md = flat.indexOf('./projects/beta/README.md: text');
			return profile !== -1 && tar !== -1 && txt !== -1 &&
				goSrc !== -1 && md !== -1 &&
				// find output is sorted, so the classes appear in this order:
				profile < tar && tar < txt && txt < goSrc && goSrc < md &&
				// the starter's signature misclassification must be gone:
				flat.indexOf('./notes.txt: unclassified') === -1;
		},

		solution: [
			'# backup.tar exists so the default arm has something real to catch.',
			'touch backup.tar',
			'',
			'for f in $(find . -type f | sort); do',
			'\t# Match on the bare name: case globs (like filename globs) do not',
			'\t# cross /, and a dispatcher classifies names, not locations.',
			'\tname=$(basename $f)',
			'\tcase $name in',
			'\t\t*.txt|*.md) echo "$f: text" ;;          # | = one arm, two patterns',
			'\t\t*.go)       echo "$f: Go source" ;;',
			'\t\t.pr?file)   echo "$f: shell profile" ;; # ? matches exactly one char',
			'\t\t*)          echo "$f: unclassified" ;;  # last, or it wins early',
			'\tesac',
			'done',
			'',
		].join('\n'),

		explanation: [
			'<p>The loop and <code>basename</code> are unchanged — the whole diff ' +
			'is the dispatcher. <code>case $name in</code> tries each arm top to ' +
			'bottom: <code>*.txt|*.md</code> collects <code>fruit.txt</code>, ' +
			'<code>notes.txt</code>, and <code>README.md</code> in one arm (that ' +
			'<code>|</code> is alternation, not a pipe — context decides), ' +
			'<code>*.go</code> takes both <code>main.go</code> files, and ' +
			'<code>.pr?file</code> shows <code>?</code> matching exactly one ' +
			'character — the <code>o</code> in <code>.profile</code>.</p>',
			'<p><code>backup.tar</code> matches no specific arm and falls through ' +
			'to <code>*)</code> — the only file that should. The starter got the ' +
			'comparison backwards: the <code>=</code> of <code>test</code> is ' +
			'literal equality, so <code>"$name" = "*.txt"</code> could only ever ' +
			'match a file literally named <code>*.txt</code>. Patterns need a ' +
			'pattern matcher; <code>case</code> is where the shell keeps it.</p>',
			'<p>The check pins one labeled line per pattern class in the sorted ' +
			'<code>find</code> order — deterministic here by construction, so ' +
			'position is pinnable — and pins ' +
			'<code>./notes.txt: unclassified</code> <em>absent</em>: the ' +
			'signature wrong answer of the starter must not survive the ' +
			'conversion.</p>',
		],
	});
})();
