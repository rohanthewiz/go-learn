/* hello-python — first contact with real CPython: print's sep/end keyword
 * arguments, assignment-as-declaration, dynamic-but-STRONG typing (the
 * `"1" + 1` TypeError, contrasted with JS coercion), and type(). The
 * starter prints a bare partial greeting with TODOs; the check pins the
 * multi-arg greeting line, the `a-b` sep="-" result, and a lone `int` line
 * from type(42).__name__ — all three only reachable by using print's
 * argument model and type() as taught.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'hello-python',
		title: 'Hello, Python',
		nav: 'Hello Python',
		category: 'Foundations',

		prose: [
			'<h2>Hello, Python</h2>' +
			'<p>This editor runs <strong>real CPython</strong> — genuine ' +
			'tracebacks, genuine semantics. Start with the two most visible ' +
			'differences from Go: there are no declarations and no semicolons. ' +
			'Assignment <em>is</em> the declaration — <code>name = "Python"</code> ' +
			'creates the variable — and a line ends where the line ends. ' +
			'Comments start with <code>#</code>. Coming from Go: there is no ' +
			'<code>:=</code> vs <code>=</code> distinction (the same <code>=</code> ' +
			'both creates and rebinds), and unused variables are not errors — ' +
			'linters care about those, the language does not.</p>',
			'<p><code>print</code> is one function, not a Println/Printf family. ' +
			'It takes any number of positional arguments, joins them with ' +
			'<code>sep</code> (default one space), and finishes with ' +
			'<code>end</code> (default a newline). Keyword arguments replace the ' +
			'variant-function zoo:</p>',
			{ lang: 'py', code: 'print("a", "b", "c")             # a b c   -- space-separated, newline at the end\nprint("a", "b", "c", sep=", ")   # a, b, c\nprint("no newline", end="")      # end replaces the trailing \\n\nprint(" ...continued")' },
			'<p>Python is <strong>dynamically</strong> typed — a name can be ' +
			'rebound to a value of a different type at any time — but ' +
			'<strong>strongly</strong> typed: values never silently change type ' +
			'to make an operation work. JavaScript answers ' +
			'<code>"1" + 1</code> with <code>"11"</code>; Python refuses:</p>',
			{ lang: 'py', code: 'x = 42          # x is an int right now\nx = "rebound"   # legal: the NAME is dynamic\n"1" + 1         # TypeError: can only concatenate str (not "int") to str\n                # -- the VALUES are strong. Convert explicitly: "1" + str(1)' },
			'<p>To ask a value what it is, call <code>type()</code>. It returns ' +
			'the class object itself — <code>type(42)</code> is the class ' +
			'<code>int</code>, an ordinary object you can pass around — and its ' +
			'<code>.__name__</code> attribute gives the short name as a string.</p>' +
			'<h3>Your job</h3>' +
			'<p>Finish the greeting three ways: replace the bare ' +
			'<code>print("Hello")</code> with one <em>multi-argument</em> print ' +
			'that passes <code>name</code> as its own argument (no concatenation), ' +
			'add a print that joins <code>"a"</code> and <code>"b"</code> with a ' +
			'dash via <code>sep="-"</code>, and print the type <em>name</em> of ' +
			'<code>42</code>.</p>' +
			'<div class="tip">Coming from Go: <code>print("Hello,", name)</code> ' +
			'is the moral equivalent of <code>fmt.Println("Hello,", name)</code> ' +
			'— but where Go grows a new function per behavior (Print, Println, ' +
			'Printf), Python grows keyword arguments on the one function it ' +
			'has.</div>',
		],

		task: 'Greet with one multi-arg print, join "a" and "b" with sep="-", and print type(42).__name__.',

		starter: [
			'# Comments start with #. No semicolons, no braces -- a line ends a',
			'# statement, and indentation (later lessons) carries the structure.',
			'',
			'# Assignment IS the declaration: no var, no :=, no type annotation.',
			'name = "Python"',
			'',
			'# TODO 1: greet with ONE print call taking THREE arguments:',
			'#         "Hello,"   then   name   then   "- welcome aboard"',
			'#         (print joins them with spaces -- no + needed)',
			'print("Hello")',
			'',
			'# TODO 2: print "a" and "b" joined by a dash -- pass sep="-"',
			'',
			'# TODO 3: print the type NAME of 42 -- type(42) is the int class,',
			'#         and its __name__ attribute is the string "int"',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.indexOf('Hello, Python - welcome aboard') !== -1 &&
				stdout.indexOf('a-b') !== -1 &&
				/^int$/m.test(stdout);
		},

		solution: [
			'# Comments start with #. No semicolons, no braces -- a line ends a',
			'# statement, and indentation (later lessons) carries the structure.',
			'',
			'# Assignment IS the declaration. Coming from Go: one = both creates',
			'# and rebinds (no := vs =), and unused variables are never errors.',
			'name = "Python"',
			'',
			'# One print, three arguments: sep (default " ") joins them, end',
			'# (default "\\n") finishes the line. Keyword args, not a Printf zoo.',
			'print("Hello,", name, "- welcome aboard")',
			'',
			'# Same mechanism, different separator.',
			'print("a", "b", sep="-")',
			'',
			'# type(42) returns the class object int; __name__ is its short name.',
			'# Dynamic typing lets a NAME rebind to any type -- but strong typing',
			'# means "1" + 1 raises TypeError instead of guessing "11" like JS.',
			'print(type(42).__name__)',
			'',
		].join('\n'),

		explanation: [
			'<h3>One function, keyword-argument variants</h3>' +
			'<p><code>print("Hello,", name, "- welcome aboard")</code> passes ' +
			'three separate arguments; <code>print</code> stringifies each and ' +
			'joins them with <code>sep</code>, which defaults to a single space — ' +
			'so the output is <code>Hello, Python - welcome aboard</code> with no ' +
			'manual spacing and no concatenation. The second line reuses the ' +
			'exact same machinery with <code>sep="-"</code> to produce ' +
			'<code>a-b</code>. Where Go ships Print/Println/Printf as separate ' +
			'functions, Python ships one function and lets keyword arguments ' +
			'(<code>sep</code>, <code>end</code>, <code>file</code>) select the ' +
			'behavior.</p>',
			'<p><code>type(42)</code> returns the class <code>int</code> itself — ' +
			'classes are ordinary objects here — and <code>.__name__</code> reads ' +
			'its name, printing <code>int</code>. Keep the dynamic/strong split ' +
			'straight: <em>names</em> are dynamic (rebinding <code>x</code> from ' +
			'<code>int</code> to <code>str</code> is fine), <em>values</em> are ' +
			'strong (<code>"1" + 1</code> is a <code>TypeError</code>, never ' +
			'<code>"11"</code>). Python would rather crash honestly than coerce ' +
			'silently — the same instinct as Go\'s refusal to mix types in ' +
			'arithmetic, enforced at runtime instead of compile time.</p>',
		],
	});
})();
