/* inheritance-mro — the diamond, done wrong then right. Starter hardcodes
 * parent calls (B and C both call A.hello(self) directly), so D's greeting
 * runs the base TWICE — the printed evidence of why hardcoded parent calls
 * break under multiple inheritance. Solution switches every class to
 * super().hello(): super() follows the MRO (the C3 linearization), not "the
 * parent", so the diamond runs each class exactly once, and the MRO list
 * itself is printed. Check pins the exact MRO name list, the cooperative
 * D->B->C->A call order via indexOf, and — the tell — that A.hello appears
 * exactly once in stdout (indexOf === lastIndexOf).
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'inheritance-mro',
		title: 'Inheritance & MRO',
		nav: 'MRO',
		category: 'Classes & Objects',

		prose: [
			'<h2>Inheritance &amp; MRO</h2>' +
			'<p>Single inheritance is the easy 80%: <code>class Dog(Animal)</code> ' +
			'inherits everything, an override replaces a method, and the ' +
			'override-and-extend idiom calls <code>super()</code> to run the ' +
			'inherited version too — most commonly chaining ' +
			'<code>__init__</code>:</p>',
			{ lang: 'py', code: 'class Animal:\n    def __init__(self, name):\n        self.name = name\n\nclass Dog(Animal):\n    def __init__(self, name, breed):\n        super().__init__(name)   # run the inherited setup FIRST…\n        self.breed = breed       # …then extend with your own\n\n    def speak(self):             # override: replaces Animal.speak entirely\n        return f"{self.name}: woof"' },
			'<p>Python also allows <em>multiple</em> inheritance — ' +
			'<code>class D(B, C)</code> — which raises the classic diamond ' +
			'question: if <code>B</code> and <code>C</code> both inherit from ' +
			'<code>A</code>, whose methods win, and how many times does ' +
			'<code>A</code> run? Python answers with the <strong>MRO</strong> ' +
			'(method resolution order): a single flat list computed by the C3 ' +
			'linearization, where every class appears exactly once, children ' +
			'before parents, and your base-list order is respected. It is ' +
			'introspectable — <code>D.__mro__</code> — and lookup simply walks it ' +
			'left to right.</p>' +
			'<p>Here is the part that rewires intuition: <code>super()</code> does ' +
			'<strong>not</strong> mean "my parent". It means "the <em>next</em> ' +
			'class after me in the MRO <em>of the object being used</em>" — so in ' +
			'the diamond, <code>B</code>\'s <code>super()</code> call lands on ' +
			'<code>C</code>, a class <code>B</code> has never heard of. That is ' +
			'what makes cooperative chains work: each class calls ' +
			'<code>super()</code> once, the MRO threads the calls through every ' +
			'class exactly once, and the diamond top runs once instead of twice. ' +
			'The sane everyday use of all this is <strong>mixins</strong> — small ' +
			'method-only classes (<code>JSONMixin</code>, ' +
			'<code>LoggingMixin</code>) slotted in before the real base. ' +
			'<strong>Coming from Go:</strong> nearest analogue is struct ' +
			'embedding, but embedding is composition with sugar — there is no ' +
			'linearization, and no way for the embedded type to call "the next ' +
			'one along". The MRO is the price and the power of true multiple ' +
			'inheritance.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter\'s diamond hardcodes <code>A.hello(self)</code> in ' +
			'both <code>B</code> and <code>C</code> — run it and watch ' +
			'<code>A.hello</code> print <em>twice</em>. Replace every hardcoded ' +
			'parent call with <code>super().hello()</code> and print ' +
			'<code>[c.__name__ for c in D.__mro__]</code> — the base should log ' +
			'exactly once, in MRO order.</p>' +
			'<div class="tip">Read the cooperative output against the printed MRO ' +
			'list: the call order <em>is</em> the MRO. <code>D</code> → ' +
			'<code>B</code> → <code>C</code> → <code>A</code> — <code>B</code>\'s ' +
			'<code>super()</code> jumped sideways to <code>C</code>, not up to ' +
			'<code>A</code>.</div>',
		],

		task: 'Replace the hardcoded A.hello(self) calls with super().hello() so the diamond runs each class once, and print the MRO.',

		starter: [
			'class A:',
			'    def hello(self):',
			'        print("A.hello")',
			'',
			'',
			'class B(A):',
			'    def hello(self):',
			'        print("B.hello")',
			'        A.hello(self)      # TODO: hardcoded parent -> super().hello()',
			'',
			'',
			'class C(A):',
			'    def hello(self):',
			'        print("C.hello")',
			'        A.hello(self)      # TODO: same hardcoding here',
			'',
			'',
			'class D(B, C):',
			'    def hello(self):',
			'        print("D.hello")',
			'        # Hardcoding "both parents" runs the top of the diamond TWICE:',
			'        B.hello(self)',
			'        C.hello(self)      # TODO: one super().hello() replaces both',
			'',
			'',
			'# TODO: print [c.__name__ for c in D.__mro__] — the C3 linearization.',
			'D().hello()                # evidence: A.hello prints twice',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var d = flat.indexOf('D.hello');
			var b = flat.indexOf('B.hello');
			var c = flat.indexOf('C.hello');
			var a = flat.indexOf('A.hello');
			return flat.indexOf("['D', 'B', 'C', 'A', 'object']") !== -1 &&
				d !== -1 && b !== -1 && c !== -1 && a !== -1 &&
				d < b && b < c && c < a &&
				stdout.indexOf('A.hello') === stdout.lastIndexOf('A.hello');
		},

		solution: [
			'class A:',
			'    def hello(self):',
			'        # End of the chain: object has no hello, so A does not call',
			'        # super().hello() here. (Cooperative mixins often do, with a',
			'        # base class that absorbs the final call.)',
			'        print("A.hello")',
			'',
			'',
			'class B(A):',
			'    def hello(self):',
			'        print("B.hello")',
			'        # NOT "call A": call the NEXT class in the MRO of type(self).',
			'        # For a D instance that next class is C — B never knew it.',
			'        super().hello()',
			'',
			'',
			'class C(A):',
			'    def hello(self):',
			'        print("C.hello")',
			'        super().hello()',
			'',
			'',
			'class D(B, C):',
			'    def hello(self):',
			'        print("D.hello")',
			'        # ONE call starts the whole chain; the MRO guarantees every',
			'        # class runs exactly once, so A no longer runs twice.',
			'        super().hello()',
			'',
			'',
			'# C3 linearization: children before parents, base-list order kept,',
			'# each class exactly once. Lookup and super() both walk this list.',
			'print([c.__name__ for c in D.__mro__])',
			'D().hello()',
			'',
		].join('\n'),

		explanation: [
			'<p>The starter\'s bug is the natural instinct from single ' +
			'inheritance: "call my parent by name". <code>B</code> and ' +
			'<code>C</code> each hardcode <code>A.hello(self)</code>, so when ' +
			'<code>D</code> dutifully calls both parents, the top of the diamond ' +
			'runs twice. Harmless for a print; catastrophic when the duplicated ' +
			'call is <code>__init__</code> opening a connection or registering a ' +
			'handler.</p>',
			'<p>The fix is one idea: <code>super()</code> dispatches to the next ' +
			'class in <code>type(self).__mro__</code>, not to the lexical parent. ' +
			'The printed list — <code>[\'D\', \'B\', \'C\', \'A\', \'object\']</code> ' +
			'— comes from the C3 linearization, and the call order matches it ' +
			'exactly: <code>D.hello</code> starts the chain, <code>B</code>\'s ' +
			'<code>super()</code> lands on <code>C</code> (a sibling, not a ' +
			'parent — this is the moment the "call my parent" mental model dies), ' +
			'<code>C</code>\'s lands on <code>A</code>, and <code>A</code> ends ' +
			'the chain. Each class printed once; one <code>super()</code> per ' +
			'method threaded the entire diamond.</p>',
			'<p>In practice you rarely build diamonds on purpose — you use this ' +
			'machinery through mixins, where a stack like ' +
			'<code>class Server(LoggingMixin, Base)</code> relies on every ' +
			'<code>hello</code>-style method calling <code>super()</code> so each ' +
			'layer contributes and passes control along.</p>',
		],
	});
})();
