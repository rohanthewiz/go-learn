/* classes-basics — class, __init__, explicit self (vs Go receivers), and
 * the instance-vs-class attribute distinction. The starter is the classic
 * shared-state bug: Counter keeps count as a CLASS attribute and bumps it
 * through the class, so two instances interfere and b's first bump prints
 * 3 — printed cross-talk as the opening exhibit. The solution moves count
 * into __init__ (independent tallies 1/2/1), keeps one deliberate class
 * constant `kind` read via both instance and class to show lookup order,
 * and prints isinstance/__class__ evidence. Check pins the independent
 * tallies in order, the kind line, isinstance True — and pins the ABSENCE
 * of the starter's interfering `b: 3`.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'classes-basics',
		title: 'Classes',
		nav: 'Classes',
		category: 'Classes & Objects',

		prose: [
			'<h2>Classes</h2>' +
			'<p>A <code>class</code> bundles state and behavior. ' +
			'<code>__init__</code> runs right after construction to set up ' +
			'the new object, and <code>self</code> is the receiver — spelled ' +
			'out as an explicit first parameter on every method. Coming from ' +
			'Go: it is exactly the receiver in ' +
			'<code>func (c *Counter) Bump()</code>, except Python has one ' +
			'method syntax, the receiver is always the first parameter, and ' +
			'by iron convention it is always named <code>self</code>. ' +
			'<code>p.dist2()</code> is sugar for ' +
			'<code>Point.dist2(p)</code> — nothing magical is passed, just ' +
			'the object itself:</p>',
			{ lang: 'py', code: 'class Point:\n    def __init__(self, x, y):\n        self.x = x          # attributes are created by assignment,\n        self.y = y          # not declared -- there is no struct\n\n    def dist2(self):\n        return self.x ** 2 + self.y ** 2\n\np = Point(3, 4)\nprint(p.dist2())            # 25 -- same as Point.dist2(p)' },
			'<p>Now the distinction this lesson exists for. An assignment ' +
			'<em>inside the class body</em> creates a <strong>class ' +
			'attribute</strong>: one slot, on the class object, shared by ' +
			'every instance. An assignment <em>through self</em> creates an ' +
			'<strong>instance attribute</strong>: per-object state. Reads ' +
			'follow a lookup order — instance dict first, then the class — ' +
			'so a class attribute quietly serves every instance that never ' +
			'shadowed it. That is exactly what you want for constants, and ' +
			'exactly what you do not want for mutable state:</p>',
			{ lang: 'py', code: 'class Bag:\n    items = []                 # ONE list, shared by every Bag\n\n    def add(self, x):\n        self.items.append(x)   # finds the CLASS list and mutates it\n\na, b = Bag(), Bag()\na.add("pen")\nprint(b.items)                 # [\'pen\'] -- b never added anything!' },
			'<p>Finally, everything in Python is an object with a class: ' +
			'<code>isinstance(x, C)</code> asks membership (subclasses ' +
			'count, so prefer it over <code>type(x) == C</code>), and ' +
			'<code>x.__class__.__name__</code> names the class of ' +
			'<em>any</em> value — ints, functions, classes themselves.</p>' +
			'<h3>Your job</h3>' +
			'<p>Run the starter first: its <code>Counter</code> keeps ' +
			'<code>count</code> on the class and bumps it through the class, ' +
			'so <code>b</code>&#39;s very first bump reports 3 — ' +
			'<code>a</code>&#39;s clicks leaked in. Move the tally into ' +
			'<code>__init__</code> as <code>self.count</code> so the two ' +
			'counters are independent (1, 2, then 1), keep ' +
			'<code>kind = "counter"</code> as a deliberate class-level ' +
			'constant read via both <code>a.kind</code> and ' +
			'<code>Counter.kind</code>, and print the ' +
			'<code>isinstance</code> and <code>__class__.__name__</code> ' +
			'evidence.</p>' +
			'<div class="tip">Rule of thumb: class attributes for constants ' +
			'shared by design; instance attributes — assigned in ' +
			'<code>__init__</code> — for anything that varies or mutates. A ' +
			'mutable class attribute is the same trap as the mutable default ' +
			'argument, one lesson older.</div>',
		],

		task: 'Give each Counter its own count via __init__; keep kind as a class constant; print isinstance evidence.',

		starter: [
			'class Counter:',
			'    # ONE count, stored on the CLASS -- every instance shares it.',
			'    count = 0',
			'',
			'    def bump(self):',
			'        # Writing through the class mutates the shared slot.',
			'        Counter.count += 1',
			'        return Counter.count',
			'',
			'a = Counter()',
			'b = Counter()',
			'print("a:", a.bump())',
			'print("a:", a.bump())',
			'# b has never been bumped, yet it does not start at 1:',
			'print("b:", b.bump())          # b: 3 -- a\'s bumps leaked into b',
			'',
			'# TODO: give each Counter its OWN tally -- set self.count = 0 in',
			'# __init__ and bump self.count. Keep a deliberate class constant',
			'#   kind = "counter"',
			'# and add the evidence prints:',
			'#   print("kind:", a.kind, Counter.kind)',
			'#   print("isinstance:", isinstance(a, Counter))',
			'#   print("class name:", a.__class__.__name__)',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var a1 = flat.indexOf('a: 1');
			var a2 = flat.indexOf('a: 2');
			var b1 = flat.indexOf('b: 1');
			return a1 !== -1 && a2 !== -1 && b1 !== -1 &&
				a1 < a2 && a2 < b1 &&
				flat.indexOf('b: 3') === -1 &&
				flat.includes('kind: counter counter') &&
				flat.includes('isinstance: True') &&
				flat.includes('class name: Counter');
		},

		solution: [
			'class Counter:',
			'    # A class attribute is right for a CONSTANT shared by design.',
			'    kind = "counter"',
			'',
			'    def __init__(self):',
			'        # Assigning through self creates an INSTANCE attribute:',
			'        # per-object state, invisible to every other Counter.',
			'        self.count = 0',
			'',
			'    def bump(self):',
			'        self.count += 1',
			'        return self.count',
			'',
			'a = Counter()',
			'b = Counter()',
			'print("a:", a.bump())',
			'print("a:", a.bump())',
			'print("b:", b.bump())              # b: 1 -- an independent tally',
			'',
			'# Lookup order: instance dict first, then the class. Neither a',
			'# nor b ever shadowed `kind`, so both reads fall through to the',
			'# single class slot -- shared on purpose this time.',
			'print("kind:", a.kind, Counter.kind)',
			'',
			'# Subclass-aware membership test, and the class of any object:',
			'print("isinstance:", isinstance(a, Counter))',
			'print("class name:", a.__class__.__name__)',
			'',
		].join('\n'),

		explanation: [
			'<p>The starter&#39;s bug: <code>count = 0</code> in the class ' +
			'body puts the tally on the <em>class object</em>, and ' +
			'<code>Counter.count += 1</code> mutates that single shared ' +
			'slot. Both instances read and write the same number, so ' +
			'<code>b</code>&#39;s first bump continued <code>a</code>&#39;s ' +
			'sequence at 3.</p>',
			'<p>The fix is one line in the right place: ' +
			'<code>self.count = 0</code> inside <code>__init__</code>. ' +
			'Assignment through <code>self</code> lands in the instance ' +
			'dict, so each <code>Counter()</code> call mints private state ' +
			'— <code>a</code> counts 1, 2 while <code>b</code> starts fresh ' +
			'at 1.</p>',
			'<p><code>kind = "counter"</code> stays in the class body ' +
			'<em>deliberately</em>: it is an immutable constant, shared by ' +
			'design. <code>a.kind</code> finds nothing in the instance dict ' +
			'and falls through to the class — the same lookup order that ' +
			'made the bug possible now serves the constant to every ' +
			'instance for free.</p>',
			'<p><code>isinstance(a, Counter)</code> is the idiomatic type ' +
			'test (it also accepts subclasses, unlike a ' +
			'<code>type(...) ==</code> comparison), and ' +
			'<code>a.__class__.__name__</code> shows the object knows its ' +
			'own class — true of every value in the language, not just ' +
			'yours.</p>',
		],
	});
})();
