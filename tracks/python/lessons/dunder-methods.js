/* dunder-methods — protocols, not interfaces. The starter's Money prints as
 * a bare <__main__.Money object at 0x…> (address varies run to run, so the
 * starter's output is never pinned — it fails the check simply by lacking
 * the solution's lines). The solution adds __repr__/__eq__/__add__ to Money
 * and __len__/__getitem__ to a Playlist, and the check pins the repr, the
 * True equality, the summed repr, and two iterated track lines — plus the
 * ABSENCE of 'object at', which only disappears once __repr__ exists. The
 * duck-typing punchline: __getitem__ alone unlocks `for` and `in`.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'dunder-methods',
		title: 'Dunder Methods',
		nav: 'Dunders',
		category: 'Classes & Objects',

		prose: [
			'<h2>Dunder methods</h2>' +
			'<p>Python\'s operators and built-ins are not magic — they are method ' +
			'calls in disguise. <code>print(x)</code> asks for <code>str(x)</code>, ' +
			'which calls <code>x.__str__()</code>, which <em>falls back</em> to ' +
			'<code>x.__repr__()</code> if you only wrote that one (so in practice: ' +
			'write <code>__repr__</code> first, add <code>__str__</code> only when ' +
			'you need a second, prettier form). One trap worth burning in: ' +
			'<strong>containers always use <code>__repr__</code></strong> for their ' +
			'elements — printing a <em>list</em> of your objects ignores ' +
			'<code>__str__</code> entirely:</p>',
			{ lang: 'py', code: 'class Tag:\n    def __init__(self, name):\n        self.name = name\n    def __repr__(self):\n        # convention: look like the constructor call. {…!r} re-reprs\n        # the field, so strings come out quoted.\n        return f"Tag({self.name!r})"\n\nprint(Tag("go"))    # Tag(\'go\')   — str falls back to repr\nprint([Tag("go")])  # [Tag(\'go\')] — lists ALWAYS use repr' },
			'<p>The same story everywhere: <code>a == b</code> calls ' +
			'<code>__eq__</code> (the default compares <em>identity</em>, like ' +
			'comparing pointers — two equal-valued objects are <code>!=</code> ' +
			'until you say otherwise), <code>a + b</code> calls ' +
			'<code>__add__</code>, <code>len(x)</code> calls <code>__len__</code>, ' +
			'<code>x[i]</code> calls <code>__getitem__</code>. One caveat to file ' +
			'away: defining <code>__eq__</code> makes your class unhashable unless ' +
			'you also define <code>__hash__</code> — equality and hashing must ' +
			'agree for dict keys and sets to work. Just know the tripwire exists.</p>' +
			'<p>Now the payoff. Give a class <code>__getitem__</code> and Python ' +
			'will <em>iterate</em> it — <code>for</code> calls <code>x[0]</code>, ' +
			'<code>x[1]</code>, … until <code>IndexError</code> — and ' +
			'<code>in</code> works too, by iterating and comparing. You implemented ' +
			'indexing; you got iteration and membership free. ' +
			'<strong>Coming from Go:</strong> this rhymes with implicit interface ' +
			'satisfaction — no <code>implements</code> keyword — but Go\'s compiler ' +
			'checks the whole method set up front, while Python checks a ' +
			'<em>protocol</em> one method at a time, at the moment of the call. ' +
			'There is no interface value, only behavior.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter\'s <code>Money</code> prints as ' +
			'<code>&lt;__main__.Money object at 0x…&gt;</code> and two equal ' +
			'amounts compare <code>False</code>. Add <code>__repr__</code> (in ' +
			'<code>Money(9, \'USD\')</code> constructor style), <code>__eq__</code>, ' +
			'and <code>__add__</code>. Then write a <code>Playlist</code> with ' +
			'<code>__len__</code> and <code>__getitem__</code>, and loop over it ' +
			'with a plain <code>for</code> — no <code>__iter__</code> anywhere.</p>' +
			'<div class="tip">Run the starter first: the hex address in ' +
			'<code>object at 0x…</code> changes every run. That is the default ' +
			'repr telling you it has nothing useful to say — a class whose ' +
			'instances you will ever print or debug deserves a ' +
			'<code>__repr__</code> on day one.</div>',
		],

		task: 'Give Money __repr__/__eq__/__add__, then build a Playlist that a plain for-loop can walk via __len__ and __getitem__.',

		starter: [
			'class Money:',
			'    def __init__(self, amount, currency):',
			'        self.amount = amount',
			'        self.currency = currency',
			'',
			'    # TODO: __repr__ -> the string "Money(9, \'USD\')" (use {…!r} for',
			'    # the currency so it prints quoted).',
			'    # TODO: __eq__  -> compare (amount, currency) tuples.',
			'    # TODO: __add__ -> a NEW Money with the summed amount.',
			'',
			'',
			'm = Money(9, "USD")',
			'print(m)                    # <__main__.Money object at 0x…> — useless',
			'print([m])                  # same, inside a list',
			'print(m == Money(9, "USD")) # False — default __eq__ is identity',
			'',
			'# TODO: a Playlist class with __len__ and __getitem__, holding the',
			'# tracks "Blue in Green" and "So What". Then iterate it with a plain',
			'# for-loop printing "track: <name>" — no __iter__ required.',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf("Money(9, 'USD')") !== -1 &&
				flat.indexOf('True') !== -1 &&
				flat.indexOf("Money(12, 'USD')") !== -1 &&
				flat.indexOf('track: Blue in Green') !== -1 &&
				flat.indexOf('track: So What') !== -1 &&
				flat.indexOf('track: Blue in Green') < flat.indexOf('track: So What') &&
				flat.indexOf('object at') === -1;
		},

		solution: [
			'class Money:',
			'    def __init__(self, amount, currency):',
			'        self.amount = amount',
			'        self.currency = currency',
			'',
			'    def __repr__(self):',
			'        # Constructor style: eval(repr(m)) would rebuild the object.',
			'        # {…!r} reprs the field, so the currency prints quoted.',
			'        return f"Money({self.amount}, {self.currency!r})"',
			'',
			'    def __eq__(self, other):',
			'        # Value equality. (Defining __eq__ costs the default __hash__ —',
			'        # add __hash__ too if these must live in sets or dict keys.)',
			'        return (self.amount, self.currency) == (other.amount, other.currency)',
			'',
			'    def __add__(self, other):',
			'        # Operators return NEW objects; they never mutate self.',
			'        return Money(self.amount + other.amount, self.currency)',
			'',
			'',
			'class Playlist:',
			'    def __init__(self, *tracks):',
			'        self.tracks = list(tracks)',
			'',
			'    def __len__(self):',
			'        return len(self.tracks)',
			'',
			'    def __getitem__(self, i):',
			'        # Indexing is the whole protocol: for-loops call [0], [1], …',
			'        # until IndexError, and `in` iterates the same way. Free.',
			'        return self.tracks[i]',
			'',
			'',
			'm = Money(9, "USD")',
			'print(m)                     # Money(9, \'USD\') — str falls back to repr',
			'print([m, Money(1, "USD")])  # containers always use repr',
			'print(m == Money(9, "USD"))  # True — value equality now',
			'print(m + Money(3, "USD"))   # Money(12, \'USD\')',
			'',
			'pl = Playlist("Blue in Green", "So What")',
			'print(len(pl))',
			'for track in pl:             # powered by __getitem__ alone',
			'    print("track:", track)',
			'print("So What" in pl)       # `in` too — same protocol',
			'',
		].join('\n'),

		explanation: [
			'<p><code>__repr__</code> follows the constructor-call convention — ' +
			'<code>Money(9, \'USD\')</code> — so a debugger dump reads like code. ' +
			'The <code>!r</code> conversion inside the f-string reprs the field, ' +
			'which is what puts the quotes around <code>\'USD\'</code>. Note the ' +
			'list print: containers format elements with <code>repr</code>, never ' +
			'<code>str</code>, which is exactly why <code>__repr__</code> is the ' +
			'one you write first.</p>',
			'<p><code>__eq__</code> compares a tuple of the fields — concise, and ' +
			'it delegates the real work to tuple equality. The moment you define ' +
			'it, Python sets <code>__hash__</code> to <code>None</code> for the ' +
			'class (equal objects must hash equal, and Python cannot guarantee ' +
			'that for you), so hashing is opt-back-in. <code>__add__</code> builds ' +
			'a new <code>Money</code> rather than mutating — the arithmetic ' +
			'dunders are expected to behave like <code>+</code> on numbers.</p>',
			'<p><code>Playlist</code> never mentions iteration, yet the ' +
			'<code>for</code> loop works: Python\'s fallback iteration protocol ' +
			'calls <code>__getitem__</code> with 0, 1, 2, … until ' +
			'<code>IndexError</code> escapes, and <code>in</code> rides the same ' +
			'machinery. That is duck typing in one line: behavior comes from the ' +
			'methods you happen to have, discovered at call time — not from a ' +
			'declared type, and not even from a method you wrote deliberately.</p>',
		],
	});
})();
