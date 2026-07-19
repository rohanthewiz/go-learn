/* Data Classes — Kotlin: Types & Null Safety (Medium). `data class` makes
 * the compiler write equals/hashCode/toString/copy/componentN for you — over
 * PRIMARY-CONSTRUCTOR properties only. The learner implements exactly what
 * the compiler emits for a class with a body-declared property, hitting the
 * three interview-grade gotchas: body properties are invisible to equality,
 * copy() reruns the constructor (body properties reset to their
 * initializers), and destructuring is positional, not by name. Hash
 * constants are pinned to real Java semantics: int32 wraparound over ASCII
 * bytes, verified by running the algorithm ("polygenelubricants" really does
 * hash to Integer.MIN_VALUE).
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// What the compiler generates, and — the part that bites — what it
	// generates FROM: only the primary constructor parameter list. The body
	// property exists on the object but is invisible to every generated
	// member except as state copy() silently resets. Marker ids namespaced
	// (dgArrowAndDC*) because every track's SVGs share the page's id
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 232" width="560" height="232" role="img" aria-label="data class code generation: primary-constructor properties feed equals, hashCode, toString, copy and componentN; a body-declared property feeds none of them and is reset by copy">' +
		'<text x="20" y="24" class="lbl">data class User(val name, val age) { var cached = "" } — what feeds what</text>' +
		'<rect x="40" y="40" width="220" height="48" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="150" y="60" text-anchor="middle">primary constructor</text>' +
		'<text x="150" y="80" text-anchor="middle" class="lbl">(val name, val age)</text>' +
		'<rect x="40" y="120" width="220" height="48" rx="6" fill="none" stroke="var(--warn)" stroke-width="2" stroke-dasharray="6 4"/>' +
		'<text x="150" y="140" text-anchor="middle">class body</text>' +
		'<text x="150" y="160" text-anchor="middle" class="lbl">var cached = ""</text>' +
		'<rect x="340" y="40" width="190" height="128" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="435" y="64" text-anchor="middle">generated members</text>' +
		'<text x="435" y="88" text-anchor="middle" class="lbl">equals / hashCode</text>' +
		'<text x="435" y="108" text-anchor="middle" class="lbl">toString</text>' +
		'<text x="435" y="128" text-anchor="middle" class="lbl">copy(name, age)</text>' +
		'<text x="435" y="148" text-anchor="middle" class="lbl">component1 / component2</text>' +
		'<path d="M 260 64 L 336 84" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndDC)"/>' +
		'<path d="M 260 144 L 300 144" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="304" y="148" class="lbl" style="fill:var(--warn)">✕ feeds none of them</text>' +
		'<text x="20" y="200" class="lbl" style="fill:var(--warn)">copy() calls the primary constructor again — so cached comes back as its INITIALIZER (""),</text>' +
		'<text x="20" y="220" class="lbl" style="fill:var(--warn)">not the source object\'s value. Two Users differing only in cached are ==, same hashCode.</text>' +
		'<defs>' +
		'<marker id="dgArrowAndDC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'data-classes',
		title: 'Data Classes: What the Compiler Writes',
		nav: 'data classes',
		difficulty: 'Medium',
		category: 'Kotlin: Types & Null Safety',
		task: 'Implement the members the Kotlin compiler generates for a data class — Equals, HashCode (Java semantics, int32 wraparound), ToString, Copy, Component1/2 — over primary-constructor properties only.',

		prose: [
			'<h2>Data Classes: What the Compiler Writes</h2>' +
			'<p>A teammate adds a cache field to a data class, and a week later a ' +
			'deduplication filter starts silently dropping fresh results. The repro ' +
			'fits in four lines:</p>',
			{ lang: 'kotlin', code: 'data class P(val id: Int) {\n    var cached: String = ""      // declared in the BODY, not the constructor\n}\n\nval a = P(7).apply { cached = "fresh" }\nval b = P(7).apply { cached = "stale" }\nprintln(a == b)          // true  — cached is invisible to equals()\nprintln(a.copy())        // P(id=7), and its cached is "" again' },
			'<p>Nothing is broken. <code>data class</code> asks the compiler to ' +
			'generate five members — <code>equals</code>, <code>hashCode</code>, ' +
			'<code>toString</code>, <code>copy</code>, <code>componentN</code> — and ' +
			'the spec is explicit about their inputs: <strong>the properties of the ' +
			'primary constructor, in declaration order, and nothing else</strong>. A ' +
			'body-declared property is real state on the object, but to the ' +
			'generated members it does not exist.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Write what the compiler would emit for the starter\'s ' +
			'<code>User{Name, Age, Cached}</code>, where <code>Cached</code> is ' +
			'body-declared with initializer <code>""</code>:</p>' +
			'<ul>' +
			'<li><strong><code>Equals(a, b)</code></strong> — Name and Age only.</li>' +
			'<li><strong><code>HashCode(u)</code></strong> — Java semantics, pinned ' +
			'exactly: <code>31*stringHash(Name) + Age</code>, where ' +
			'<code>stringHash</code> is <code>String.hashCode</code> — ' +
			'<code>s[0]·31<sup>n-1</sup> + s[1]·31<sup>n-2</sup> + … + s[n-1]</code> ' +
			'over the bytes (tests use ASCII), all in <code>int32</code> with ' +
			'natural wraparound. Verified anchors: <code>stringHash("Ada") = ' +
			'65662</code>, and the famous ' +
			'<code>stringHash("polygenelubricants") = -2147483648</code> — the ' +
			'string whose hash is exactly <code>Integer.MIN_VALUE</code>.</li>' +
			'<li><strong><code>ToString(u)</code></strong> — ' +
			'<code>User(name=Ada, age=36)</code>. No <code>cached</code>.</li>' +
			'<li><strong><code>Copy(u, overrides)</code></strong> — ' +
			'<code>copy()</code> with named arguments as a map (keys ' +
			'<code>"name"</code>, <code>"age"</code>; unknown keys ignored). ' +
			'Kotlin\'s <code>copy()</code> <em>calls the primary constructor</em>, ' +
			'so <code>Cached</code> comes back as its initializer <code>""</code> — ' +
			'never the source\'s value.</li>' +
			'<li><strong><code>Component1/Component2</code></strong> — what ' +
			'<code>val (n, a) = u</code> compiles to: <em>positional</em>, by ' +
			'declaration order. Rename-and-reorder the constructor and every ' +
			'destructuring silently changes meaning — by design.</li>' +
			'</ul>' +
			'<div class="tip">Why 31? Odd (multiplying by an even number throws ' +
			'away a bit per character), prime by tradition, and ' +
			'<code>31·h == (h&lt;&lt;5) − h</code> — a strength-reduction old JVMs ' +
			'cared about. The constant is baked into the Java spec, so every ' +
			'Kotlin data class on Android inherits it, wraparound and all.</div>',
		],

		starter: [
			'package main',
			'',
			'// User mirrors:',
			'//',
			'//	data class User(val name: String, val age: Int) {',
			'//	    var cached: String = ""   // body-declared: NOT a ctor property',
			'//	}',
			'//',
			'// Name and Age are primary-constructor properties; Cached is body',
			'// state the generated members must ignore (and Copy must RESET).',
			'type User struct {',
			'	Name   string',
			'	Age    int',
			'	Cached string',
			'}',
			'',
			'// Equals is the generated equals(): primary-constructor properties',
			'// only — Name and Age. Cached must not participate.',
			'func Equals(a, b User) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// HashCode is the generated hashCode(), Java semantics pinned:',
			'//',
			'//	stringHash(s) = s[0]*31^(n-1) + s[1]*31^(n-2) + ... + s[n-1]',
			'//	HashCode(u)   = 31*stringHash(u.Name) + int32(u.Age)',
			'//',
			'// ALL arithmetic in int32 with natural wraparound (Go\'s int32 ops',
			'// wrap, like the JVM\'s int). Anchors: stringHash("Ada") == 65662,',
			'// HashCode(User{"Ada", 36, ...}) == 2035558.',
			'func HashCode(u User) int32 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// ToString is the generated toString(): "User(name=Ada, age=36)".',
			'// Ctor properties in declaration order; Cached never appears.',
			'func ToString(u User) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// Copy is copy(name = ..., age = ...) with the named arguments as a',
			'// map ("name" -> string, "age" -> int; unknown keys ignored).',
			'// copy() CALLS THE PRIMARY CONSTRUCTOR: body properties re-run their',
			'// initializers, so the result\'s Cached is always "" — regardless of',
			'// what the source held. That reset is the point of this exercise.',
			'func Copy(u User, overrides map[string]any) User {',
			'	// your code here',
			'	return u',
			'}',
			'',
			'// Component1/Component2 are what `val (n, a) = u` compiles to:',
			'// POSITIONAL, by primary-constructor declaration order — component1',
			'// is the first ctor property, component2 the second. Names at the',
			'// destructuring site are irrelevant.',
			'func Component1(u User) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'func Component2(u User) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// All hash constants below were produced by running the pinned',
			'	// algorithm (Java String.hashCode over ASCII bytes, int32',
			'	// wraparound) — they are facts of the JVM, not choices.',
			'	ada := User{Name: "Ada", Age: 36, Cached: "hot"}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"equals ignores the body property: same name+age, different cached -> ==  (the dedup-filter bug from the prose)",',
			'			"true",',
			'			func() string {',
			'				return fmt.Sprintf("%v", Equals(User{"Ada", 36, "fresh"}, User{"Ada", 36, "stale"}))',
			'			}},',
			'		{"equals is over BOTH ctor properties: same name, different age -> not equal",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", Equals(User{"Ada", 36, ""}, User{"Ada", 37, ""})) }},',
			'		{"stringHash anchor: hash of name \\"Ada\\" alone (age 0) is 31*65662 — so stringHash(\\"Ada\\") must be 65662",',
			'			"2035522",',
			'			func() string { return fmt.Sprintf("%d", HashCode(User{"Ada", 0, ""})) }},',
			'		{"the pinned worked example: HashCode(User{\\"Ada\\", 36}) = 31*65662 + 36",',
			'			"2035558",',
			'			func() string { return fmt.Sprintf("%d", HashCode(User{"Ada", 36, ""})) }},',
			'		{"int32 wraparound is REQUIRED: \\"polygenelubricants\\" — the famous string whose Java hash is exactly Integer.MIN_VALUE — must survive the *31 without widening",',
			'			"-2147483648",',
			'			func() string { return fmt.Sprintf("%d", HashCode(User{"polygenelubricants", 0, ""})) }},',
			'		{"wraparound, longer input: HashCode(User{\\"Grace\\", 45}) — five characters of *31 already exceed 2^31 during the fold",',
			'			"2140939157",',
			'			func() string { return fmt.Sprintf("%d", HashCode(User{"Grace", 45, ""})) }},',
			'		{"the hash CONTRACT is one-way: \\"Ab\\" and \\"BC\\" collide (both stringHash 2113) — unequal objects MAY share a hash; equal objects MUST",',
			'			"hashes equal: true, objects equal: false",',
			'			func() string {',
			'				hA, hB := HashCode(User{"Ab", 0, ""}), HashCode(User{"BC", 0, ""})',
			'				return fmt.Sprintf("hashes equal: %v, objects equal: %v", hA == hB, Equals(User{"Ab", 0, ""}, User{"BC", 0, ""}))',
			'			}},',
			'		{"cached is invisible to hashCode too — equal objects keep equal hashes no matter what the cache holds",',
			'			"true",',
			'			func() string {',
			'				return fmt.Sprintf("%v", HashCode(User{"Ada", 36, "x"}) == HashCode(User{"Ada", 36, "y"}))',
			'			}},',
			'		{"toString prints ctor properties only, in declaration order",',
			'			"User(name=Ada, age=36)",',
			'			func() string { return ToString(ada) }},',
			'		{"copy(age = 99): name kept, age overridden — and Cached RESET to \\"\\" (copy calls the primary constructor; body initializers re-run)",',
			'			"User{Name:Ada Age:99 Cached:\\"\\"}",',
			'			func() string {',
			'				c := Copy(ada, map[string]any{"age": 99})',
			'				return fmt.Sprintf("User{Name:%s Age:%d Cached:%q}", c.Name, c.Age, c.Cached)',
			'			}},',
			'		{"copy() with NO overrides is not identity: ctor properties survive, the source\'s cached=\\"hot\\" does not",',
			'			"User{Name:Ada Age:36 Cached:\\"\\"}",',
			'			func() string {',
			'				c := Copy(ada, map[string]any{})',
			'				return fmt.Sprintf("User{Name:%s Age:%d Cached:%q}", c.Name, c.Age, c.Cached)',
			'			}},',
			'		{"copy ignores unknown named arguments (\\"nickname\\" is not a ctor parameter)",',
			'			"User{Name:Ada Age:36 Cached:\\"\\"}",',
			'			func() string {',
			'				c := Copy(ada, map[string]any{"nickname": "The Countess"})',
			'				return fmt.Sprintf("User{Name:%s Age:%d Cached:%q}", c.Name, c.Age, c.Cached)',
			'			}},',
			'		{"destructuring is POSITIONAL: val (n, a) = u binds component1 -> first ctor property, component2 -> second — names at the call site mean nothing",',
			'			"n=Ada a=36",',
			'			func() string { return fmt.Sprintf("n=%s a=%d", Component1(ada), Component2(ada)) }},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			got := c.got()',
			'			r["pass"] = got == c.want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// User mirrors:',
			'//',
			'//	data class User(val name: String, val age: Int) {',
			'//	    var cached: String = ""   // body-declared: NOT a ctor property',
			'//	}',
			'//',
			'// Name and Age are primary-constructor properties; Cached is body',
			'// state the generated members ignore (and Copy resets).',
			'type User struct {',
			'	Name   string',
			'	Age    int',
			'	Cached string',
			'}',
			'',
			'// Equals compares primary-constructor properties ONLY. The compiler',
			'// generates exactly this — field-by-field over the ctor parameter',
			'// list — which is why the prose\'s dedup filter treated "fresh" and',
			'// "stale" as the same value: Cached simply is not in the list.',
			'func Equals(a, b User) bool {',
			'	return a.Name == b.Name && a.Age == b.Age',
			'}',
			'',
			'// stringHash is java.lang.String.hashCode: a left fold h = 31*h + c',
			'// over the characters (bytes here; the tests are ASCII, where char',
			'// and byte coincide). int32 everywhere is the point — the JVM\'s int',
			'// wraps at 32 bits, and Go\'s int32 arithmetic wraps identically, so',
			'// the natural overflow IS the correct semantics. Widening to int64',
			'// "to be safe" is the bug: "polygenelubricants" would no longer come',
			'// out as Integer.MIN_VALUE.',
			'func stringHash(s string) int32 {',
			'	var h int32',
			'	for i := 0; i < len(s); i++ {',
			'		h = 31*h + int32(s[i])',
			'	}',
			'	return h',
			'}',
			'',
			'// HashCode is the generated hashCode(): fold the ctor properties in',
			'// declaration order, 31 between fields — the same Effective-Java',
			'// recipe javac and kotlinc both emit. Cached is excluded, which',
			'// preserves the invariant Equals relies on: equal objects, equal',
			'// hashes (HashMap and HashSet break without it).',
			'func HashCode(u User) int32 {',
			'	return 31*stringHash(u.Name) + int32(u.Age)',
			'}',
			'',
			'// ToString is the generated toString(): ctor properties in',
			'// declaration order, Kotlin\'s exact format. Cached never appears —',
			'// handy to remember when a log line "proves" two objects identical',
			'// and they still behave differently.',
			'func ToString(u User) string {',
			'	return fmt.Sprintf("User(name=%s, age=%d)", u.Name, u.Age)',
			'}',
			'',
			'// Copy is the generated copy(name = this.name, age = this.age):',
			'// defaults from the source for every CTOR parameter, then the named',
			'// overrides, then a call to the PRIMARY CONSTRUCTOR. That last step',
			'// is the gotcha: constructing afresh re-runs body initializers, so',
			'// Cached is "" on every copy — the source\'s cache never travels.',
			'func Copy(u User, overrides map[string]any) User {',
			'	name := u.Name',
			'	age := u.Age',
			'	if v, ok := overrides["name"]; ok {',
			'		name = v.(string)',
			'	}',
			'	if v, ok := overrides["age"]; ok {',
			'		age = v.(int)',
			'	}',
			'	// The fresh construction: Cached takes its initializer (Go\'s zero',
			'	// value "" doubles as Kotlin\'s `= ""` here), not u.Cached. Unknown',
			'	// override keys were never ctor parameters, so they simply do not',
			'	// bind — mirroring Kotlin, where copy(nickname=...) is a compile',
			'	// error rather than a silent extra.',
			'	return User{Name: name, Age: age, Cached: ""}',
			'}',
			'',
			'// Component1/Component2: destructuring is positional. The compiler',
			'// numbers ctor properties in declaration order and `val (n, a) = u`',
			'// desugars to component1()/component2() calls — the names n and a',
			'// are local bindings, never matched against property names. Reorder',
			'// the constructor and every destructuring re-binds silently; that is',
			'// why API guidelines warn against destructuring data classes whose',
			'// shape still changes.',
			'func Component1(u User) string {',
			'	return u.Name',
			'}',
			'',
			'func Component2(u User) int {',
			'	return u.Age',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The rule, and the three bugs it explains</h3>' +
			'<p>Everything a <code>data class</code> generates is a pure function ' +
			'of the <em>primary constructor parameter list</em>. Hold onto that one ' +
			'sentence and three production bugs become obvious:</p>' +
			'<ul>' +
			'<li><strong>The invisible field.</strong> Body-declared state ' +
			'(caches, timestamps, lazy handles) does not participate in ' +
			'<code>equals</code>/<code>hashCode</code>. Deduplication, ' +
			'<code>distinctUntilChanged()</code> on a Flow, DiffUtil\'s ' +
			'<code>areContentsTheSame</code> — anything equality-driven treats two ' +
			'objects differing only in body state as the same. Sometimes that is ' +
			'exactly right (a cache <em>should</em> be ignored); the bug is when it ' +
			'is an accident.</li>' +
			'<li><strong>The resetting copy.</strong> <code>copy()</code> calls the ' +
			'primary constructor, so body initializers re-run. The classic ' +
			'ViewModel pattern <code>state = state.copy(loading = true)</code> ' +
			'silently discards anything squirreled into body properties — which is ' +
			'why UI-state data classes should keep <em>all</em> state in the ' +
			'constructor.</li>' +
			'<li><strong>The silent re-binding.</strong> Destructuring is ' +
			'positional. Swap two same-typed constructor parameters and every ' +
			'<code>val (a, b) = x</code> in the codebase still compiles — with the ' +
			'values crossed. Lint\'s <code>DestructuringWrongName</code> exists ' +
			'because this has shipped.</li>' +
			'</ul>' +
			'<h3>Why the hash is exactly this</h3>' +
			'<p>Kotlin did not design a hash; it inherited Java\'s, because on ' +
			'Android every data class lives in a JVM <code>HashMap</code> ' +
			'eventually. <code>String.hashCode</code> has been ' +
			'<code>h = 31·h + c</code> since the 1990s and is <em>specified</em>, ' +
			'not merely implemented — JSON caches, Parcelable keys, and on-disk ' +
			'maps all depend on it never changing. The int32 wraparound is part of ' +
			'the spec: the JVM\'s <code>int</code> silently overflows, and your Go ' +
			'port had to reproduce that (an <code>int64</code> accumulator gives ' +
			'different answers — the harness\'s ' +
			'<code>"polygenelubricants"</code> case, the string famous on Stack ' +
			'Overflow for hashing to exactly <code>Integer.MIN_VALUE</code>, ' +
			'catches the widening bug). And the contract is one-way: ' +
			'<code>"Ab"</code>/<code>"BC"</code> collide by design tolerance — ' +
			'equal objects <em>must</em> share a hash, unequal objects merely ' +
			'<em>may</em>.</p>' +
			'<h3>The Go mirror</h3>' +
			'<p>Go solves the same problem with <code>==</code> on comparable ' +
			'structs — every field, no opt-out, no generated code. Kotlin\'s ' +
			'divide-at-the-constructor gives you the opt-out, and this problem is ' +
			'the price: the boundary is invisible at the use site. When you review ' +
			'a Kotlin PR that adds a property to a data class, the one question ' +
			'that matters is <em>constructor or body?</em> — it changes equality, ' +
			'hashing, printing, copying, and destructuring in one keystroke.</p>',
		],
		complexity: { time: 'O(n) in the name length for HashCode; O(1) for the rest', space: 'O(1)' },
	});
})();
