/* capstone-wordstats — everything at once over one inline text: str.translate
 * normalization, a generator pipeline into a Counter, a dataclass with a
 * @property ratio, a @logged decorator tracing the two pipeline stages,
 * defaultdict first-letter grouping, match over a command list to choose
 * report sections, and try/except collecting one malformed command. Starter
 * runs a naive Counter over raw split() (no lowercasing, punctuation glued
 * on) so its numbers are wrong; the check pins the exact corrected totals,
 * top word, 2-decimal ratio, a group line, a trace line, and the
 * handled-error line, with indexOf ordering for stages-before-report and
 * error-collected-at-end.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'capstone-wordstats',
		title: 'Capstone: Word Stats',
		nav: 'Capstone',
		category: 'Capstone',

		prose: [
			'<h2>Capstone: Word Stats</h2>' +
			'<p>One program, every tool from the track: a word-frequency report ' +
			'over an eight-line text. The starter\'s naive version — ' +
			'<code>Counter(TEXT.split())</code> — is <em>wrong twice</em>: ' +
			'<code>The</code> and <code>the</code> count separately, and ' +
			'<code>loops.</code> (with the period glued on) is not ' +
			'<code>loops</code>. Normalization comes first: ' +
			'<code>str.maketrans("", "", string.punctuation)</code> builds a ' +
			'deletion table once, and <code>w.translate(table).lower()</code> ' +
			'cleans each token.</p>',
			{ lang: 'py', code: 'import string\nSTRIP = str.maketrans("", "", string.punctuation)\n"Loops.".translate(STRIP).lower()   # \'loops\' — punctuation deleted, case folded' },
			'<p>Shape the pipeline as two <strong>decorated stages</strong>: ' +
			'<code>clean_words(text)</code> returns a <em>generator expression</em> ' +
			'(no intermediate list ever exists) and <code>count_words(it)</code> ' +
			'feeds it to a <code>Counter</code>. A <code>@logged</code> decorator — ' +
			'closure over <code>f</code>, <code>functools.wraps</code>, one print ' +
			'per call — gives you a trace line per stage, so the report shows its ' +
			'own plumbing ran. Results land in a <code>@dataclass</code> ' +
			'<code>DocStats(words, unique, top)</code> whose <code>ratio</code> is ' +
			'a <code>@property</code> — computed from the two counts on access, ' +
			'formatted <code>{stats.ratio:.2f}</code>, so it can never drift out of ' +
			'sync with the fields.</p>' +
			'<p>The report itself is driven by a command list through ' +
			'<code>match</code>: each command selects a section — totals, top-3, ' +
			'ratio, first-letter groups via <code>defaultdict(list)</code> — and ' +
			'the wildcard <code>case _:</code> raises <code>ValueError</code> for ' +
			'anything unknown. One command in the list is garbage on purpose: a ' +
			'<code>try/except ValueError</code> around the dispatch collects it and ' +
			'the program reports it at the end instead of dying — the ' +
			'exceptions-lesson contract, applied. <em>Coming from Go:</em> this ' +
			'whole program is a <code>switch</code> plus error returns there; here ' +
			'the <code>match</code> raises and one handler collects, and the happy ' +
			'path carries no error plumbing at all.</p>' +
			'<h3>Your job</h3>' +
			'<p>Follow the TODO roadmap in the starter: the translation table, the ' +
			'two <code>@logged</code> stages, the dataclass with the ratio ' +
			'property, the <code>match</code> dispatch with the ' +
			'<code>letters</code> section printing the <code>g</code> and ' +
			'<code>p</code> groups (sorted — gophers and pythons, naturally), and ' +
			'the collected <code>skipped:</code> line last.</p>' +
			'<div class="tip">Build <code>by_letter</code> from ' +
			'<code>sorted(counts)</code> so each group\'s list is alphabetical — ' +
			'sorted input in, deterministic groups out. And note the trace lines ' +
			'print before any report line: the pipeline ran once, up front, and ' +
			'the sections only read <code>stats</code>.</div>',
		],

		task: 'Normalize with str.translate, pipe a generator into a Counter via two @logged stages, report through a dataclass + match, and collect the bad command.',

		starter: [
			'import string',
			'from collections import Counter, defaultdict',
			'from dataclasses import dataclass',
			'from functools import wraps',
			'',
			'TEXT = """\\',
			'The gopher digs simple tunnels; the python coils in elegant loops.',
			'Gophers prize plain tools, and pythons prize expressive tools.',
			'A gopher checks every error; a python raises and recovers.',
			'The gopher ships one binary, while the python ships readable scripts.',
			'Gophers group tasks with channels; pythons group tasks with generators.',
			'The python decorates functions; the gopher wraps them by hand.',
			'Every gopher and every python agrees: readable code wins.',
			'So the gopher and the python dig, coil, and ship together.',
			'"""',
			'',
			'# NAIVE: no lowercasing, punctuation still glued on — the counts are wrong.',
			'# ("The" vs "the" split the crown; "loops." is not "loops".)',
			'naive = Counter(TEXT.split())',
			'print("naive top-3:", naive.most_common(3))',
			'print("naive unique:", len(naive))   # inflated by case/punct variants',
			'',
			'# TODO roadmap:',
			'# 1. STRIP = str.maketrans("", "", string.punctuation); make @logged',
			'#    (wraps + print(f"[logged] {f.__name__} done") after each call).',
			'# 2. @logged clean_words(text) -> GENERATOR of translated+lowered tokens;',
			'#    @logged count_words(word_iter) -> Counter(word_iter).',
			'# 3. @dataclass DocStats(words, unique, top) + @property ratio = unique/words.',
			'# 4. commands = ["totals", "top", "ratio", "letters", "frobnicate"]; match cmd:',
			'#      totals  -> print(f"words: {stats.words} unique: {stats.unique}")',
			'#      top     -> print(f"top: {word} x{n}") for the top-3',
			'#      ratio   -> print(f"unique ratio: {stats.ratio:.2f}")',
			'#      letters -> group sorted(counts) by first letter into defaultdict(list);',
			'#                 print f"{letter}: {by_letter[letter]}" for "g" and "p"',
			'#      case _  -> raise ValueError(f"unknown command: {cmd!r}")',
			'# 5. try/except ValueError collects the bad command; print("skipped:", ...) at the end.',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var iStage1 = flat.indexOf('[logged] clean_words done');
			var iStage2 = flat.indexOf('[logged] count_words done');
			var iTotals = flat.indexOf('words: 81 unique: 48');
			var iTop = flat.indexOf('top: the x8');
			var iRatio = flat.indexOf('unique ratio: 0.59');
			var iGroup = flat.indexOf("g: ['generators', 'gopher', 'gophers', 'group']");
			var iSkip = flat.indexOf("skipped: unknown command: 'frobnicate'");
			return iStage1 !== -1 && iStage2 !== -1 && iTotals !== -1 &&
				iTop !== -1 && iRatio !== -1 && iGroup !== -1 && iSkip !== -1 &&
				iStage1 < iStage2 &&              // pipeline order: clean, then count
				iStage2 < iTotals &&              // stages ran before any report section
				iTotals < iTop && iTop < iRatio &&  // sections in command-list order
				iRatio < iGroup &&
				iGroup < iSkip &&                 // the collected error reports LAST
				flat.indexOf("p: ['plain', 'prize', 'python', 'pythons']") !== -1;
		},

		solution: [
			'import string',
			'from collections import Counter, defaultdict',
			'from dataclasses import dataclass',
			'from functools import wraps',
			'',
			'TEXT = """\\',
			'The gopher digs simple tunnels; the python coils in elegant loops.',
			'Gophers prize plain tools, and pythons prize expressive tools.',
			'A gopher checks every error; a python raises and recovers.',
			'The gopher ships one binary, while the python ships readable scripts.',
			'Gophers group tasks with channels; pythons group tasks with generators.',
			'The python decorates functions; the gopher wraps them by hand.',
			'Every gopher and every python agrees: readable code wins.',
			'So the gopher and the python dig, coil, and ship together.',
			'"""',
			'',
			'# Decorator: one trace line per pipeline-stage call (wraps keeps names honest).',
			'def logged(f):',
			'    @wraps(f)',
			'    def wrapper(*args, **kwargs):',
			'        result = f(*args, **kwargs)',
			'        print(f"[logged] {f.__name__} done")',
			'        return result',
			'    return wrapper',
			'',
			'# One deletion table, built once — translate() then applies it per token.',
			'STRIP = str.maketrans("", "", string.punctuation)',
			'',
			'@logged',
			'def clean_words(text):',
			'    # A generator expression: tokens are cleaned one at a time as the',
			'    # Counter pulls them — no intermediate list of 81 strings exists.',
			'    return (w.translate(STRIP).lower() for w in text.split())',
			'',
			'@logged',
			'def count_words(word_iter):',
			'    return Counter(word_iter)      # the consumer that drains the stream',
			'',
			'@dataclass',
			'class DocStats:',
			'    words: int',
			'    unique: int',
			'    top: list',
			'',
			'    @property',
			'    def ratio(self):',
			'        # Derived, not stored: computed on access, so it can never',
			'        # drift out of sync with the two counts above.',
			'        return self.unique / self.words',
			'',
			'counts = count_words(clean_words(TEXT))',
			'stats = DocStats(sum(counts.values()), len(counts), counts.most_common(3))',
			'',
			'commands = ["totals", "top", "ratio", "letters", "frobnicate"]',
			'problems = []',
			'for cmd in commands:',
			'    try:',
			'        match cmd:',
			'            case "totals":',
			'                print(f"words: {stats.words} unique: {stats.unique}")',
			'            case "top":',
			'                for word, n in stats.top:',
			'                    print(f"top: {word} x{n}")',
			'            case "ratio":',
			'                print(f"unique ratio: {stats.ratio:.2f}")',
			'            case "letters":',
			'                by_letter = defaultdict(list)',
			'                for w in sorted(counts):     # sorted in -> alphabetical groups out',
			'                    by_letter[w[0]].append(w)',
			'                for letter in ("g", "p"):    # gophers and pythons, naturally',
			'                    print(f"{letter}: {by_letter[letter]}")',
			'            case _:',
			'                # Unknown commands raise; the handler below collects them',
			'                # so one typo cannot kill the report (exceptions lesson).',
			'                raise ValueError(f"unknown command: {cmd!r}")',
			'    except ValueError as err:',
			'        problems.append(str(err))',
			'',
			'for p in problems:',
			'    print("skipped:", p)',
			'',
		].join('\n'),

		explanation: [
			'<p>The pipeline runs once, up front: <code>clean_words</code> returns ' +
			'a generator expression (its trace line fires at call time, before any ' +
			'token is cleaned), and <code>count_words</code> drains it straight ' +
			'into a <code>Counter</code>. Normalization is where the numbers ' +
			'change: deleting <code>string.punctuation</code> and lowercasing ' +
			'merges <code>The</code>/<code>the</code>/<code>the.</code> into one ' +
			'key — 81 words, 48 unique, versus the naive starter\'s inflated ' +
			'count.</p>',
			'<p><code>DocStats</code> stores the two counts and the top-3 list; ' +
			'<code>ratio</code> is a <code>@property</code> so ' +
			'<code>48 / 81</code> is computed on read and formatted at the use ' +
			'site with <code>:.2f</code> — derived data stays derived. The ' +
			'<code>match</code> loop is the report\'s spine: each command selects ' +
			'a section, the <code>letters</code> section builds its ' +
			'<code>defaultdict(list)</code> from <code>sorted(counts)</code> so ' +
			'the <code>g:</code> and <code>p:</code> lines are alphabetical and ' +
			'deterministic, and the wildcard turns anything unknown into a ' +
			'<code>ValueError</code>.</p>',
			'<p>That raise is caught by the <code>try/except</code> ringing the ' +
			'dispatch: <code>frobnicate</code> costs one appended string, not the ' +
			'run, and the <code>skipped:</code> line prints after every section — ' +
			'errors collected, reported once, at the end. Eight track lessons, one ' +
			'working report.</p>',
		],
	});
})();
