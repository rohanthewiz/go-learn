/* dataclasses — @dataclass writes __init__/__repr__/__eq__ from the field
 * annotations. Starter is the honest price tag: a hand-written Point with
 * ~20 lines of boilerplate (init/repr/eq, and the repr deliberately lacks
 * the tags field) with a TODO to replace it all with 4 lines. Solution:
 * @dataclass Point with a default and field(default_factory=list) — tying
 * back to the mutable-default gotcha — a frozen Config whose attempted
 * mutation is caught (type name printed), order=True Versions sorted, and
 * asdict. Check pins the auto-repr (with tags=[], which the starter's
 * manual repr lacks), the True equality, FrozenInstanceError, the exact
 * sorted order, and the asdict line.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'dataclasses',
		title: 'Dataclasses',
		nav: 'Dataclasses',
		category: 'Classes & Objects',

		prose: [
			'<h2>Dataclasses</h2>' +
			'<p>Half of every classic Python class is ceremony: an ' +
			'<code>__init__</code> that copies parameters to attributes, a ' +
			'<code>__repr__</code> that echoes them, an <code>__eq__</code> that ' +
			'compares them. <code>@dataclass</code> generates all three from the ' +
			'class-level <em>annotations</em> — the decorator reads ' +
			'<code>x: int</code> as a field declaration and writes the methods at ' +
			'class-creation time. Defaults work like parameter defaults, with one ' +
			'familiar landmine: a mutable default like <code>[]</code> would be ' +
			'shared by every instance — the same trap as the mutable-default ' +
			'argument gotcha, and dataclasses <em>refuse to compile it</em>, ' +
			'forcing <code>field(default_factory=list)</code> which runs ' +
			'<code>list()</code> fresh per instance:</p>',
			{ lang: 'py', code: 'from dataclasses import dataclass, field\n\n@dataclass\nclass Order:\n    sku: str                                  # required, positional\n    qty: int = 1                              # default, like a def parameter\n    notes: list = field(default_factory=list) # fresh [] per instance\n    # notes: list = []  <- ValueError at class definition: shared mutable!\n\nprint(Order("tea"))   # Order(sku=\'tea\', qty=1, notes=[])' },
			'<p>Options unlock more generated behavior. ' +
			'<code>@dataclass(frozen=True)</code> makes instances immutable — ' +
			'assignment raises <code>FrozenInstanceError</code> — and in exchange ' +
			'they become hashable, so they work as dict keys and set members: ' +
			'proper value objects. <code>order=True</code> generates ' +
			'<code>&lt;</code>/<code>&gt;</code>/… comparing fields as a tuple in ' +
			'declaration order, so <code>sorted()</code> just works. And ' +
			'<code>asdict(obj)</code> converts the whole thing (recursively) to a ' +
			'plain dict, one step from <code>json.dumps</code>. ' +
			'<strong>Coming from Go:</strong> a dataclass is your struct — fields ' +
			'up top, no ceremony — except equality, repr, and ordering come ' +
			'generated instead of hand-rolled, and <code>frozen=True</code> is the ' +
			'immutability Go structs express with unexported fields and ' +
			'discipline.</p>' +
			'<h3>Your job</h3>' +
			'<p>Delete the starter\'s twenty lines of boilerplate and re-declare ' +
			'<code>Point</code> as a 4-line dataclass (with a <code>y</code> ' +
			'default and a <code>tags</code> list via ' +
			'<code>default_factory</code>). Then add a frozen <code>Config</code> ' +
			'— attempt a mutation, catch it, print the exception\'s ' +
			'<code>type(e).__name__</code> — an <code>order=True</code> ' +
			'<code>Version</code> you sort, and print <code>asdict(cfg)</code>.</p>' +
			'<div class="tip">The generated <code>__repr__</code> shows every ' +
			'field as <code>name=value</code> — <code>Point(x=3, y=4, tags=[])</code> ' +
			'— which is why the check can tell your dataclass from the starter\'s ' +
			'hand-written class at a glance.</div>',
		],

		task: 'Replace the boilerplate with @dataclass, then demo default_factory, frozen=True (catch the error), order=True sorting, and asdict.',

		starter: [
			'# The hand-written version: 20 lines to say "a Point has x, y, tags".',
			'# TODO: replace this whole class with a 4-line @dataclass —',
			'#   x: int',
			'#   y: int = 0',
			'#   tags: list = field(default_factory=list)',
			'# then add: a frozen Config (catch the mutation error, print',
			'# type(e).__name__), an order=True Version sorted, and asdict(cfg).',
			'class Point:',
			'    def __init__(self, x, y=0, tags=None):',
			'        self.x = x',
			'        self.y = y',
			'        # the manual dodge for the mutable-default gotcha:',
			'        self.tags = tags if tags is not None else []',
			'',
			'    def __repr__(self):',
			'        return f"Point(x={self.x}, y={self.y})"   # forgot tags already',
			'',
			'    def __eq__(self, other):',
			'        return (self.x, self.y, self.tags) == (other.x, other.y, other.tags)',
			'',
			'',
			'p = Point(3, 4)',
			'print(p)',
			'print(p == Point(3, 4))',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('Point(x=3, y=4, tags=[])') !== -1 &&
				flat.indexOf('True') !== -1 &&
				flat.indexOf('FrozenInstanceError') !== -1 &&
				flat.indexOf('[Version(major=1, minor=2), Version(major=1, minor=5), Version(major=2, minor=0)]') !== -1 &&
				flat.indexOf("{'host': 'localhost', 'port': 8000}") !== -1;
		},

		solution: [
			'from dataclasses import dataclass, field, asdict, FrozenInstanceError',
			'',
			'',
			'@dataclass',
			'class Point:',
			'    # Annotations ARE the field list: __init__, __repr__, __eq__ are',
			'    # generated from these three lines in declaration order.',
			'    x: int',
			'    y: int = 0',
			'    tags: list = field(default_factory=list)   # fresh list per instance',
			'',
			'',
			'p = Point(3, 4)',
			'print(p)                    # generated repr shows every field',
			'print(p == Point(3, 4))     # generated __eq__: field-by-field, True',
			'p.tags.append("visited")',
			'print(Point(0).tags)        # [] — default_factory ran again: no sharing',
			'',
			'',
			'@dataclass(frozen=True)',
			'class Config:',
			'    # frozen: assignment raises, and instances become hashable —',
			'    # a real value object, usable as a dict key.',
			'    host: str',
			'    port: int',
			'',
			'',
			'cfg = Config("localhost", 8000)',
			'try:',
			'    cfg.port = 9000',
			'except FrozenInstanceError as e:',
			'    print(type(e).__name__)',
			'',
			'',
			'@dataclass(order=True)',
			'class Version:',
			'    # order=True: <, <=, >, >= compare (major, minor) as a tuple,',
			'    # in declaration order — so sorted() needs no key function.',
			'    major: int',
			'    minor: int',
			'',
			'',
			'vs = [Version(2, 0), Version(1, 5), Version(1, 2)]',
			'print(sorted(vs))',
			'print(asdict(cfg))          # plain dict — one step from json.dumps',
			'',
		].join('\n'),

		explanation: [
			'<p>Three annotated lines replaced the starter\'s twenty — and did it ' +
			'<em>better</em>: the starter\'s hand-written <code>__repr__</code> had ' +
			'already drifted (it forgot <code>tags</code>), which is exactly the ' +
			'bug class generated code cannot have. ' +
			'<code>field(default_factory=list)</code> calls <code>list()</code> ' +
			'per instance; the <code>Point(0).tags</code> print shows the second ' +
			'instance got its own empty list even after the first was mutated — ' +
			'the same trap as the mutable default <em>argument</em>, but here the ' +
			'decorator makes the naive spelling a hard error instead of a silent ' +
			'bug.</p>',
			'<p><code>frozen=True</code> turns assignment into ' +
			'<code>FrozenInstanceError</code> (we print just the type name via ' +
			'<code>type(e).__name__</code>) and restores hashability — mutable ' +
			'objects and hash-based containers do not mix, so immutability is the ' +
			'price of being a dict key. <code>order=True</code> generates the ' +
			'comparison operators over the fields-as-a-tuple, giving ' +
			'<code>sorted(vs)</code> the version-number ordering with no ' +
			'<code>key=</code>. <code>asdict</code> walks the instance ' +
			'(recursively, through nested dataclasses too) into plain dicts and ' +
			'lists — the standard bridge to JSON.</p>',
		],
	});
})();
