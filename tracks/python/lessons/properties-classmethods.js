/* properties-classmethods — kill the Java getter. Starter is a Temperature
 * with get_celsius()/set_celsius() methods and no validation; the solution
 * pythonifies it: @property + validating setter (the out-of-range set is
 * caught and its ValueError message printed, keeping the run clean),
 * from_string as a @classmethod alternate constructor, and a @staticmethod
 * conversion helper. Check pins the computed fahrenheit read (70.7), the
 * caught-validation message, and the from_string result line — none of
 * which the getter-style starter can produce.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'properties-classmethods',
		title: 'Properties & classmethods',
		nav: 'Properties',
		category: 'Classes & Objects',

		prose: [
			'<h2>Properties &amp; classmethods</h2>' +
			'<p>Python does not write <code>get_x()</code>/<code>set_x()</code> ' +
			'pairs. You start with a plain public attribute, and if you ' +
			'<em>later</em> need computation or validation, <code>@property</code> ' +
			'turns a method into an attribute — callers keep writing ' +
			'<code>t.celsius</code> and never know the access became code. That ' +
			'ability to retrofit is exactly why the getter boilerplate is ' +
			'pointless here: you are not locked in by the public API. A paired ' +
			'<code>@x.setter</code> intercepts assignment, which is where ' +
			'validation lives — bad values <code>raise ValueError</code> instead ' +
			'of silently corrupting state:</p>',
			{ lang: 'py', code: 'class Circle:\n    def __init__(self, radius):\n        self.radius = radius        # assignment goes through the setter\n\n    @property\n    def radius(self):\n        return self._radius         # _underscore: the private backing field\n\n    @radius.setter\n    def radius(self, r):\n        if r < 0:\n            raise ValueError("radius must be >= 0")\n        self._radius = r\n\n    @property\n    def area(self):                 # computed on every read — no stored copy\n        return 3.14159 * self._radius ** 2' },
			'<p>Two more decorators round out the toolkit. A ' +
			'<code>@classmethod</code> receives the <em>class</em> as ' +
			'<code>cls</code> and is Python\'s idiom for <strong>alternate ' +
			'constructors</strong> — <code>__init__</code> can only have one ' +
			'signature, so parsing variants get names: ' +
			'<code>Temperature.from_string("21.5C")</code>, ' +
			'<code>datetime.fromtimestamp(…)</code>, <code>dict.fromkeys(…)</code>. ' +
			'Returning <code>cls(…)</code> (not the hardcoded class name) keeps ' +
			'subclasses working. A <code>@staticmethod</code> receives nothing ' +
			'implicit at all — it is a plain function parked inside the class ' +
			'purely for namespacing. <strong>Coming from Go:</strong> a ' +
			'classmethod is your <code>NewThingFromX(…)</code> factory function; ' +
			'Go puts those at package level because packages are its namespace — ' +
			'Python classes play that role themselves.</p>' +
			'<h3>Your job</h3>' +
			'<p>Pythonify the starter: replace the <code>get_/set_</code> methods ' +
			'with a <code>celsius</code> property whose setter rejects values ' +
			'below absolute zero (catch the <code>ValueError</code> at the call ' +
			'site and print it), add a computed <code>fahrenheit</code> property, ' +
			'a <code>from_string</code> classmethod parsing <code>"21.5C"</code>, ' +
			'and a <code>c_to_f</code> staticmethod the property reuses.</p>' +
			'<div class="tip">Know when <em>not</em> to property: attribute ' +
			'syntax promises attribute cost. If the read hits a database or ' +
			'crunches for a second, keep it a method — <code>t.summary()</code> ' +
			'honestly signals work where <code>t.summary</code> hides it.</div>',
		],

		task: 'Replace the get_/set_ methods with a validating @property, add a from_string @classmethod and a c_to_f @staticmethod.',

		starter: [
			'# Java-flavored Python: getter/setter methods, no validation, and the',
			'# conversion recomputed inline. TODO, in order:',
			'#   1. a `celsius` @property over a _celsius backing field, whose',
			'#      @celsius.setter raises ValueError below -273.15',
			'#   2. a computed `fahrenheit` @property',
			'#   3. a `from_string` @classmethod: Temperature.from_string("21.5C")',
			'#   4. a `c_to_f` @staticmethod both of the above reuse',
			'class Temperature:',
			'    def __init__(self, celsius):',
			'        self._celsius = celsius',
			'',
			'    def get_celsius(self):',
			'        return self._celsius',
			'',
			'    def set_celsius(self, value):',
			'        self._celsius = value      # happily accepts nonsense',
			'',
			'    def get_fahrenheit(self):',
			'        return self._celsius * 9 / 5 + 32',
			'',
			'',
			't = Temperature(21.5)',
			'print(t.get_fahrenheit())',
			'',
			't.set_celsius(-500)               # colder than absolute zero: accepted!',
			'print(t.get_celsius())',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('70.7') !== -1 &&
				flat.indexOf('rejected: -500C is below absolute zero') !== -1 &&
				flat.indexOf('from_string: 21.5') !== -1 &&
				flat.indexOf('212.0') !== -1;
		},

		solution: [
			'class Temperature:',
			'    def __init__(self, celsius):',
			'        # Route through the property so even __init__ is validated.',
			'        self.celsius = celsius',
			'',
			'    @property',
			'    def celsius(self):',
			'        return self._celsius',
			'',
			'    @celsius.setter',
			'    def celsius(self, value):',
			'        # Assignment is now a checkpoint: t.celsius = x lands here.',
			'        if value < -273.15:',
			'            raise ValueError(f"{value}C is below absolute zero")',
			'        self._celsius = value',
			'',
			'    @property',
			'    def fahrenheit(self):',
			'        # Computed on read — always in sync with celsius, no stale copy.',
			'        return self.c_to_f(self._celsius)',
			'',
			'    @classmethod',
			'    def from_string(cls, text):',
			'        # Alternate constructor. cls(…) — not Temperature(…) — so a',
			'        # subclass calling from_string gets an instance of ITSELF.',
			'        return cls(float(text.rstrip("C")))',
			'',
			'    @staticmethod',
			'    def c_to_f(c):',
			'        # No self, no cls: a plain function namespaced under the class.',
			'        return c * 9 / 5 + 32',
			'',
			'',
			't = Temperature(21.5)',
			'print(t.fahrenheit)               # attribute syntax, computed value',
			'',
			'try:',
			'    t.celsius = -500              # the setter throws it back',
			'except ValueError as e:',
			'    print("rejected:", e)',
			'print(t.celsius)                  # unchanged: still 21.5',
			'',
			't2 = Temperature.from_string("21.5C")',
			'print("from_string:", t2.celsius)',
			'print(Temperature.c_to_f(100))    # callable without any instance',
			'',
		].join('\n'),

		explanation: [
			'<p>The public surface never changed shape: <code>t.celsius</code> is ' +
			'still attribute syntax, but reads go through the getter and writes ' +
			'through the setter, which rejects anything below −273.15. Even ' +
			'<code>__init__</code> assigns via <code>self.celsius = celsius</code>, ' +
			'so construction gets the same validation for free. The failed ' +
			'<code>t.celsius = -500</code> raises, the call site catches and ' +
			'prints the message, and the next read proves the object was left ' +
			'untouched — validation that cannot be bypassed by forgetting to call ' +
			'a setter method, because plain assignment <em>is</em> the setter.</p>',
			'<p><code>fahrenheit</code> is a computed property: no stored copy to ' +
			'drift out of sync. <code>from_string</code> is the alternate ' +
			'constructor pattern — it parses, then delegates to <code>cls(…)</code>, ' +
			'so a hypothetical <code>OvenTemp(Temperature)</code> inherits a ' +
			'working <code>from_string</code> that builds <code>OvenTemp</code>s. ' +
			'<code>c_to_f</code> takes neither <code>self</code> nor ' +
			'<code>cls</code>: pure conversion logic, living on the class only so ' +
			'callers find it next to the data it concerns.</p>',
			'<p>The discipline: start with plain attributes, upgrade to ' +
			'<code>@property</code> only when behavior is needed — and stop before ' +
			'properties that do expensive work, which belong back in methods where ' +
			'the parentheses advertise the cost.</p>',
		],
	});
})();
