/* exceptions-context — starterError lesson: a batch parser crashes mid-run
 * with an uncaught ValueError and the real traceback is the opening exhibit.
 * Teaches catching SPECIFIC exceptions, else/finally, `raise ... from err`
 * chaining (proved by CATCHING and printing type(err.__cause__) — a chained
 * traceback only shows on a crash, and the solution must run clean), a custom
 * RecordError, EAFP vs LBYL with an honest Go contrast, and a
 * contextlib.contextmanager whose enter/exit lines bracket the batch even
 * though a record fails inside. Check pins the 2-ok-1-failed summary, the
 * cause-type line, and the enter -> failed -> exit ordering.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'exceptions-context',
		title: 'Exceptions & with',
		nav: 'Exceptions',
		category: 'Power Features',
		starterError: true,

		prose: [
			'<h2>Exceptions & with</h2>' +
			'<p>Run the starter: it dies mid-batch with a real traceback. Read it ' +
			'<strong>bottom-up</strong> — the last line names the exception and its ' +
			'message (<code>ValueError: invalid literal for int() ...</code>), and ' +
			'the deepest <code>File</code> line (highlighted for you) is where in ' +
			'<em>your</em> code it happened; the frames above show who called whom ' +
			'to get there. One bad record killed the whole run and the good record ' +
			'after it never got processed. That is the default contract: an ' +
			'unhandled exception unwinds the stack until something catches it, or ' +
			'the program dies.</p>' +
			'<p>You catch with <code>try/except</code> — and you catch ' +
			'<strong>specific</strong> types. A bare <code>except:</code> is a bug, ' +
			'not a style choice: it swallows <em>everything</em>, including typos ' +
			'(<code>NameError</code>) and Ctrl-C (<code>KeyboardInterrupt</code>), ' +
			'turning crashes you needed to see into silent wrong behavior. The full ' +
			'statement has four arms:</p>',
			{ lang: 'py', code: 'try:\n    value = risky(rec)\nexcept ValueError as err:   # only THIS type; err is the exception object\n    handle(err)\nelse:                       # ran only if NO exception — keep try blocks tiny\n    use(value)\nfinally:\n    cleanup()               # runs no matter what, even mid-unwind' },
			'<p>When you translate a low-level exception into a domain one — a ' +
			'class you define, usually just <code>class RecordError(Exception): ' +
			'pass</code> — chain it: <code>raise RecordError(...) from err</code>. ' +
			'The original rides along as <code>__cause__</code>, so nobody has to ' +
			'guess what really failed. <em>Coming from Go:</em> this is ' +
			'<code>fmt.Errorf("...: %w", err)</code> with the propagation inverted ' +
			'— Go makes you thread the error up every return; Python unwinds for ' +
			'free and you choose <em>where</em> to catch. Hence the idiom EAFP ' +
			'(easier to ask forgiveness than permission): try it and catch, rather ' +
			'than LBYL if-checks that race or double the lookups.</p>' +
			'<p>For cleanup that must always happen, <code>with</code> beats ' +
			'hand-written <code>finally</code>: a context manager runs code on ' +
			'entry and — guaranteed — on exit, even when the block raises. ' +
			'<code>contextlib.contextmanager</code> lets you write one as a ' +
			'generator: everything before the single <code>yield</code> is entry, ' +
			'everything after (in a <code>finally</code>) is exit.</p>' +
			'<h3>Your job</h3>' +
			'<p>Make the batch survive: a <code>RecordError</code> raised ' +
			'<code>from err</code> in <code>parse</code>, a per-record ' +
			'<code>try/except/else</code> that collects failures and prints the ' +
			'cause type via <code>type(err.__cause__).__name__</code>, a ' +
			'<code>@contextlib.contextmanager</code> named <code>batch</code> ' +
			'logging <code>enter:</code>/<code>exit:</code> around the loop, and a ' +
			'final <code>2 ok, 1 failed: ...</code> summary line.</p>' +
			'<div class="tip">Keep the <code>try</code> body to the one line that ' +
			'can fail and put the success path in <code>else</code> — a wide try ' +
			'block is how unrelated bugs get caught by the wrong handler.</div>',
		],

		task: 'Catch the ValueError, re-raise as RecordError from err, keep the batch running inside a contextmanager, and print a 2 ok, 1 failed summary.',

		starter: [
			'# One bad record. Run it: the traceback is the lesson — read it bottom-up.',
			'# The deepest File line (highlighted) is the exact line that raised.',
			'records = ["alpha=3", "beta=oops", "gamma=7"]',
			'',
			'def parse(rec):',
			'    name, _, raw = rec.partition("=")',
			'    return name, int(raw)      # blows up on "oops" — nothing catches it',
			'',
			'for rec in records:',
			'    name, value = parse(rec)',
			'    print("ok:", name, value)  # gamma never prints: the crash kills the batch',
			'',
			'print("done")                  # never reached',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var iEnter = flat.indexOf('enter: records');
			var iFail = flat.indexOf('failed: bad value in');
			var iExit = flat.indexOf('exit: records');
			return iEnter !== -1 && iFail !== -1 && iExit !== -1 &&
				iEnter < iFail && iFail < iExit &&           // exit logged DESPITE the failure
				flat.indexOf('cause: ValueError') !== -1 &&  // __cause__ carried the original
				flat.indexOf('ok: alpha 3') !== -1 &&
				flat.indexOf('ok: gamma 7') !== -1 &&        // the batch survived past the bad record
				flat.indexOf('2 ok, 1 failed:') !== -1 &&
				iExit < flat.indexOf('2 ok, 1 failed:');
		},

		solution: [
			'import contextlib',
			'',
			'# Domain-specific exception: callers catch THIS, not a generic ValueError.',
			'class RecordError(Exception):',
			'    pass',
			'',
			'def parse(rec):',
			'    name, _, raw = rec.partition("=")',
			'    try:',
			'        return name, int(raw)',
			'    except ValueError as err:',
			'        # `from err` chains: the low-level cause rides along on __cause__,',
			'        # so the caller can still see WHAT failed underneath the domain error.',
			'        raise RecordError(f"bad value in {rec!r}") from err',
			'',
			'@contextlib.contextmanager',
			'def batch(label):',
			'    print("enter:", label)     # before yield = __enter__',
			'    try:',
			'        yield',
			'    finally:',
			'        print("exit:", label)  # after yield, in finally = __exit__: ALWAYS runs',
			'',
			'records = ["alpha=3", "beta=oops", "gamma=7"]',
			'ok = 0',
			'failures = []',
			'',
			'with batch("records"):',
			'    for rec in records:',
			'        try:                                   # tiny try: just the risky call',
			'            name, value = parse(rec)',
			'        except RecordError as err:             # specific — never bare except:',
			'            print("failed:", err, "| cause:", type(err.__cause__).__name__)',
			'            failures.append(err)',
			'        else:                                  # success path, outside the try',
			'            ok += 1',
			'            print("ok:", name, value)',
			'',
			'print(f"{ok} ok, {len(failures)} failed: {failures[0]}")',
			'',
		].join('\n'),

		explanation: [
			'<p><code>parse</code> now translates the exception at the boundary: it ' +
			'catches the narrow <code>ValueError</code> from <code>int()</code> and ' +
			're-raises a <code>RecordError</code> with a message in the domain\'s ' +
			'vocabulary. <code>from err</code> stores the original on ' +
			'<code>__cause__</code> — the loop proves it by printing ' +
			'<code>cause: ValueError</code> without any crash, since chained ' +
			'tracebacks only render when an exception goes unhandled.</p>',
			'<p>The per-record <code>try/except/else</code> is why ' +
			'<code>gamma</code> now processes: one bad record costs one iteration, ' +
			'not the batch. The <code>else</code> arm keeps the success path out of ' +
			'the <code>try</code>, so a bug in <code>print</code>-adjacent code ' +
			'could never masquerade as a parse failure.</p>',
			'<p><code>batch</code> compresses the context-manager protocol into a ' +
			'generator: code before <code>yield</code> is <code>__enter__</code>, ' +
			'the <code>finally</code> after it is <code>__exit__</code>. The output ' +
			'shows <code>enter:</code> then the failure then <code>exit:</code> — ' +
			'the exit line survives the failure because <code>with</code> ' +
			'guarantees it, which is exactly why files, locks, and transactions ' +
			'live in <code>with</code> blocks.</p>',
		],
	});
})();
