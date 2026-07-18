/* match-case — structural pattern matching over a mixed command stream. The
 * starter dispatches with an isinstance-heavy if/elif chain that only
 * understands the two tuple commands and shrugs at the rest; the solution
 * is one match statement whose five cases each demonstrate a pattern class:
 * sequence pattern with capture + guard, |-alternative, mapping pattern,
 * class pattern with a literal field, and the _ wildcard. Check pins one
 * dispatch line per pattern (5 lines) in indexOf order — the chain's
 * "cannot handle" phrasing can never produce them.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'match-case',
		title: 'match / case',
		nav: 'match',
		category: 'Power Features',

		prose: [
			'<h2>match / case</h2>' +
			'<p>Python 3.10 added <code>match</code> — and it is <em>not</em> a C ' +
			'switch. There is no fallthrough (first matching case wins, then the ' +
			'statement ends), and patterns do not just compare values: they ' +
			'<strong>destructure</strong>. A case is a shape with holes in it; ' +
			'match the shape and the holes become bound variables in one move — ' +
			'test and unpack, fused:</p>',
			{ lang: 'py', code: 'def area(shape):\n    match shape:\n        case ("circle", r):            # sequence pattern: len 2, first == "circle"\n            return 3.14159 * r * r     # …and r is BOUND to the second element\n        case ("rect", w, h) if w > 0 and h > 0:   # guard: extra boolean test\n            return w * h\n        case ("square" | "box", s):    # | tries alternatives, left to right\n            return s * s\n        case [x, *rest]:               # star pattern, like unpacking assignment\n            return x\n        case _:                        # wildcard: matches anything, binds nothing\n            return 0' },
			'<p>The pattern zoo maps onto Python\'s data shapes. Literals match by ' +
			'equality; a bare name is a <em>capture</em> (it always matches and ' +
			'binds — a classic trap: <code>case ok:</code> is a catch-all, not a ' +
			'comparison against the variable <code>ok</code>). Sequence patterns ' +
			'like <code>(cmd, x, y)</code> check length and elements; mapping ' +
			'patterns like <code>{"cmd": c}</code> check that the <em>listed</em> ' +
			'keys exist (extra keys are fine — dicts match openly, sequences ' +
			'exactly) and bind their values; class patterns like ' +
			'<code>Point(x=0, y=y)</code> check <code>isinstance</code> and then ' +
			'match attributes — mixing a literal (<code>x</code> must equal 0) ' +
			'with a capture (<code>y</code> binds). <strong>Coming from Go:</strong> ' +
			'the nearest relative is a type switch, but <code>match</code> ' +
			'dispatches on <em>shape</em>, not just type — a Go type switch can ' +
			'tell you it is a tuple; a class pattern can insist ' +
			'<code>x == 0</code> and hand you <code>y</code> in the same ' +
			'breath.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter dispatches a mixed command stream — tuples, a dict, a ' +
			'<code>Point</code>, a stray string — through an ' +
			'<code>isinstance</code>/<code>len</code>/index if-elif chain that ' +
			'handles two shapes and gives up on the rest. Rewrite the loop body ' +
			'as one <code>match</code> with five cases: a guarded ' +
			'<code>("move", x, y)</code>, a <code>("say" | "shout", text)</code> ' +
			'alternative, a <code>{"cmd": c, "value": v}</code> mapping, a ' +
			'<code>Point(x=0, y=y)</code> class pattern, and <code>_</code>.</p>' +
			'<div class="tip">Order matters exactly like if/elif: cases are tried ' +
			'top to bottom and the first match wins. Put the most specific shapes ' +
			'first and <code>_</code> last — a bare capture or wildcard above the ' +
			'others silently swallows everything below it.</div>',
		],

		task: 'Replace the if/elif chain with one match statement: sequence + guard, | alternatives, mapping, class pattern, and _ wildcard.',

		starter: [
			'class Point:',
			'    def __init__(self, x, y):',
			'        self.x = x',
			'        self.y = y',
			'',
			'',
			'commands = [',
			'    ("move", 3, 4),',
			'    ("say", "hi"),',
			'    {"cmd": "color", "value": "red"},',
			'    Point(0, 7),',
			'    "mystery",',
			']',
			'',
			'# The pre-3.10 way: type-sniffing, length checks, and manual indexing',
			'# tangled together — and half the shapes are simply given up on.',
			'# TODO: one match statement, five cases:',
			'#   ("move", x, y) if x >= 0 and y >= 0  -> "move to (x, y)"',
			'#   ("say" | "shout", text)               -> "say: text"',
			'#   {"cmd": c, "value": v}                -> "c -> v"',
			'#   Point(x=0, y=y)                       -> "on the y-axis at y"',
			'#   _                                     -> "unknown: repr"',
			'for cmd in commands:',
			'    if isinstance(cmd, tuple) and len(cmd) == 3 and cmd[0] == "move":',
			'        print("got a move:", cmd[1], cmd[2])',
			'    elif isinstance(cmd, tuple) and len(cmd) == 2 and cmd[0] == "say":',
			'        print("got a say:", cmd[1])',
			'    else:',
			'        print("cannot handle:", type(cmd).__name__)',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var m = flat.indexOf('move to (3, 4)');
			var s = flat.indexOf('say: hi');
			var d = flat.indexOf('color -> red');
			var p = flat.indexOf('on the y-axis at 7');
			var u = flat.indexOf("unknown: 'mystery'");
			return m !== -1 && s !== -1 && d !== -1 && p !== -1 && u !== -1 &&
				m < s && s < d && d < p && p < u;
		},

		solution: [
			'class Point:',
			'    def __init__(self, x, y):',
			'        self.x = x',
			'        self.y = y',
			'',
			'',
			'commands = [',
			'    ("move", 3, 4),',
			'    ("say", "hi"),',
			'    {"cmd": "color", "value": "red"},',
			'    Point(0, 7),',
			'    "mystery",',
			']',
			'',
			'for cmd in commands:',
			'    match cmd:',
			'        # Sequence pattern: length 3, first element the literal "move",',
			'        # x and y CAPTURED — plus a guard for an extra boolean test.',
			'        case ("move", x, y) if x >= 0 and y >= 0:',
			'            print(f"move to ({x}, {y})")',
			'',
			'        # | tries alternatives left to right; text binds either way.',
			'        case ("say" | "shout", text):',
			'            print(f"say: {text}")',
			'',
			'        # Mapping pattern: the listed keys must exist (extra keys are',
			'        # fine — dicts match openly), and their values are captured.',
			'        case {"cmd": c, "value": v}:',
			'            print(f"{c} -> {v}")',
			'',
			'        # Class pattern: isinstance check, then attribute patterns —',
			'        # x must EQUAL 0 (literal), y is captured. Shape, not just type.',
			'        case Point(x=0, y=y):',
			'            print(f"on the y-axis at {y}")',
			'',
			'        # Wildcard: matches anything, binds nothing. No fallthrough',
			'        # ever happened above — first match won, statement ended.',
			'        case _:',
			'            print(f"unknown: {cmd!r}")',
			'',
		].join('\n'),

		explanation: [
			'<p>Every branch of the old chain became a <em>shape</em>. ' +
			'<code>("move", x, y)</code> replaces the ' +
			'<code>isinstance</code>-and-<code>len</code>-and-index tangle: the ' +
			'pattern checks it is a length-3 sequence whose head equals ' +
			'<code>"move"</code> and binds <code>x</code>, <code>y</code> in the ' +
			'same step, with the <code>if</code> guard adding the range test the ' +
			'pattern language cannot express. <code>("say" | "shout", text)</code> ' +
			'handles two spellings with one body.</p>',
			'<p>The last three cases are what if/elif could not do cleanly. The ' +
			'mapping pattern <code>{"cmd": c, "value": v}</code> matches any dict ' +
			'that <em>has</em> those keys — open matching, so a command carrying ' +
			'extra fields still dispatches. The class pattern ' +
			'<code>Point(x=0, y=y)</code> is an <code>isinstance</code> check plus ' +
			'per-attribute patterns: <code>x=0</code> is a literal constraint, ' +
			'<code>y=y</code> a capture — the match succeeds only for points ' +
			'<em>on the y-axis</em>, which is dispatch on shape, not type. And ' +
			'<code>_</code> is the deliberate default; unlike a bare name it ' +
			'binds nothing, so it reads as "and everything else".</p>',
			'<p>Note what is absent: no <code>break</code>, no fallthrough, no ' +
			'accidental double-handling — exactly one case body ran per command, ' +
			'top to bottom, first match wins.</p>',
		],
	});
})();
