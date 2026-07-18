/* cat-redirection — stdout is a stream with a default destination, and
 * redirection re-aims it: > truncates, >> appends, < feeds stdin, heredocs
 * inline a document (expanding <<EOF vs literal <<'RAW' — $HOME survives the
 * quoted one). Solution builds haiku.txt with an expanding heredoc, appends
 * a single-quoted line whose $HOME stays literal, cats it back, demos the
 * quoted-delimiter heredoc on screen, and closes with `wc -l < haiku.txt` —
 * the bare count teaches that wc fed from stdin has no filename to print.
 * NOTE: this interpreter keys heredoc bodies by delimiter word, so each
 * heredoc in a script uses its own delimiter (EOF, RAW) — good practice
 * anyway. Check pins the expanded-$HOME line, both literal-$ lines, an
 * ordering pin (file content before the RAW demo), and a line that is
 * exactly `4` — the filename-less count only `<` can produce.
 */
(function () {
	'use strict';

	GoLearnSh.lesson({
		id: 'cat-redirection',
		title: 'Redirection',
		nav: 'Redirection',
		category: 'First Steps',

		prose: [
			'<h2>Redirection</h2>' +
			'<p>Everything you have printed so far went to <strong>stdout</strong> ' +
			'— a byte stream every process is born holding, whose ' +
			'<em>default</em> destination happens to be your screen. Redirection ' +
			're-aims it before the program starts: <code>cmd &gt; file</code> ' +
			'sends stdout to a file, creating it or <strong>truncating</strong> ' +
			'what was there; <code>cmd &gt;&gt; file</code> appends instead. The ' +
			'program neither knows nor cares — <code>echo</code> writes to file ' +
			'descriptor 1 either way. Coming from Go: it is the same move as ' +
			'handing a function an <code>io.Writer</code> — the caller picks the ' +
			'destination, the code just writes.</p>',
			{ lang: 'sh', code: 'echo draft > note.txt     # create or TRUNCATE — old content gone\necho more >> note.txt     # append — now two lines\nwc -l note.txt            # "2 note.txt" — wc opened the file, knows its name\nwc -l < note.txt          # "2" — wc read anonymous stdin; no name to print' },
			'<p>The same trick works on the way in: <code>cmd &lt; file</code> ' +
			'feeds the file to the program\'s <strong>stdin</strong>. The last ' +
			'line above is the tell: <code>wc -l file</code> prints the count ' +
			'<em>and the filename</em>, but with <code>&lt;</code> the shell ' +
			'opened the file and wc just read a stream — it never learned any ' +
			'name, so it prints the bare number. That distinction matters the ' +
			'moment you script around the output.</p>' +
			'<p>A <strong>heredoc</strong> is redirection from text you write in ' +
			'place: <code>&lt;&lt;EOF</code> feeds the following lines, up to a ' +
			'line that is exactly <code>EOF</code>, into stdin. With a bare ' +
			'delimiter the body is <em>expanded</em> — <code>$HOME</code> becomes ' +
			'<code>/home/learner</code>. Quote the delimiter ' +
			'(<code>&lt;&lt;\'RAW\'</code>) and the body is literal — ' +
			'<code>$HOME</code> stays five characters of text. Give each heredoc ' +
			'in a script its own delimiter word; combined with <code>&gt;</code> ' +
			'it is the idiomatic way to write a small file from inside a ' +
			'script.</p>' +
			'<h3>Your job</h3>' +
			'<p>Build <code>haiku.txt</code> with an expanding heredoc ' +
			'(<code>cat &lt;&lt;EOF &gt; haiku.txt</code>) — include the line ' +
			'<code>my home is $HOME</code> so the expansion shows. Append one ' +
			'more line with <code>&gt;&gt;</code> and <code>echo</code> in ' +
			'single quotes so its <code>$HOME</code> stays literal. ' +
			'<code>cat haiku.txt</code> to read it back, demo a quoted-delimiter ' +
			'heredoc (<code>&lt;&lt;\'RAW\'</code>) straight to the screen, and ' +
			'finish with <code>wc -l &lt; haiku.txt</code> — the bare count.</p>' +
			'<div class="tip">The <code>&gt;</code> truncation bites in real ' +
			'life: <code>sort data.txt &gt; data.txt</code> destroys the input, ' +
			'because the shell truncates the file <em>before</em> sort ever ' +
			'reads it. Redirections happen first; the command runs second.</div>',
		],

		task: 'Heredoc-create haiku.txt (with an expanded $HOME line), append with >>, cat it, demo a quoted heredoc, then wc -l < haiku.txt.',

		starter: [
			'# These lines only reach the screen — stdout\'s default destination.',
			'# TODO: turn them into an EXPANDING heredoc (bare delimiter EOF,',
			'# exact form in the lesson text) that WRITES haiku.txt — three body',
			'# lines, one of them:  my home is $HOME',
			'echo old pond, still water',
			'echo a frog leaps from shore',
			'',
			'# TODO: append one more line with >> — use single quotes so $HOME',
			'# stays literal:   echo \'plunk! $HOME is just text in single quotes\' >> haiku.txt',
			'',
			'# TODO: cat haiku.txt — read back what you built',
			'',
			'# TODO: demo the literal flavor straight to the screen: a heredoc',
			'# with QUOTED delimiter \'RAW\', its body using $HOME unquoted.',
			'',
			'# TODO: count haiku.txt\'s lines VIA STDIN: wc -l < haiku.txt',
			'# Why does the output have no filename in it?',
			'wc -l notes.txt',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// The expanded line proves <<EOF ran unquoted; the two literal-$
			// lines prove single quotes and <<'RAW' both kept $HOME as text.
			return flat.indexOf('my home is /home/learner') !== -1 &&
				flat.indexOf('plunk! $HOME is just text in single quotes') !== -1 &&
				flat.indexOf('$HOME stays $HOME') !== -1 &&
				// File content reads back before the on-screen RAW demo.
				flat.indexOf('my home is /home/learner') < flat.indexOf('$HOME stays $HOME') &&
				// A line that is EXACTLY "4": the stdin-fed count. `wc -l
				// haiku.txt` would print "4 haiku.txt" and fail this pin.
				/(^|\n)4\n/.test(stdout);
		},

		solution: [
			'# An expanding heredoc: the body is scanned like a double-quoted',
			'# string, so $HOME becomes /home/learner on its way into cat —',
			'# and > aims cat\'s stdout at haiku.txt instead of the screen.',
			'cat <<EOF > haiku.txt',
			'old pond, still water',
			'my home is $HOME',
			'a frog leaps from shore',
			'EOF',
			'',
			'# >> appends. Single quotes are the strongest quotes: $HOME is',
			'# five plain characters here, no expansion.',
			'echo \'plunk! $HOME is just text in single quotes\' >> haiku.txt',
			'',
			'# Read it back: three heredoc lines (one expanded) + the append.',
			'cat haiku.txt',
			'',
			'# Quoting the DELIMITER makes the whole body literal — same rule,',
			'# applied to the document. (Each heredoc gets its own delimiter.)',
			'cat <<\'RAW\'',
			'quoted delimiter: $HOME stays $HOME',
			'RAW',
			'',
			'# < feeds haiku.txt to wc\'s stdin. wc never opened a file, never',
			'# learned a name — so it prints the bare count: 4.',
			'wc -l < haiku.txt',
			'',
		].join('\n'),

		explanation: [
			'<p>The heredoc plus <code>&gt;</code> is two redirections on one ' +
			'command: <code>&lt;&lt;EOF</code> wires the inline document to ' +
			'<code>cat</code>\'s stdin, <code>&gt; haiku.txt</code> wires its ' +
			'stdout to the file. cat itself just pumps bytes from one to the ' +
			'other — that is its whole job. Because the delimiter was unquoted, ' +
			'the body expanded: <code>my home is /home/learner</code> is what ' +
			'landed in the file.</p>',
			'<p>The append shows the other quoting flavor: inside single quotes ' +
			'<code>$HOME</code> is inert, so the file\'s fourth line carries a ' +
			'literal dollar sign — <code>cat haiku.txt</code> proves both ' +
			'behaviors side by side. The <code>&lt;&lt;\'RAW\'</code> demo is ' +
			'the same rule lifted to a whole document: quote the delimiter, ' +
			'freeze the body.</p>',
			'<p>Last line: <code>wc -l &lt; haiku.txt</code> prints ' +
			'<code>4</code> with no filename, because the shell opened the file ' +
			'and wc saw only an anonymous stream — while ' +
			'<code>wc -l haiku.txt</code> would print <code>4 haiku.txt</code>. ' +
			'The check pins the bare-number line, so only the stdin form ' +
			'passes. Prefer the bare form whenever another program will consume ' +
			'the count.</p>',
		],
	});
})();
