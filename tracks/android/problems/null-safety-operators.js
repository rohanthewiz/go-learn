/* Null Safety — Kotlin: Types & Null Safety (Easy). Kotlin's ?. ?: !! are
 * not syntax sugar, they are a compiler-enforced decision procedure over the
 * one extra state Go leaves to runtime: nil. The learner implements the four
 * operators over Go pointers — nil-in/nil-out safe calls, the elvis default
 * (and the 0-is-not-null trap), the !! panic, and the full short-circuiting
 * chain u?.address?.city ?: "unknown".
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// The safe-call chain as a pipeline with exit ramps: any nil receiver
	// makes the WHOLE expression null (no call happens, no panic), and ?:
	// catches exactly that null. Marker ids namespaced (dgArrowAndNS*)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="u?.address?.city: each safe call is an exit ramp — a nil receiver short-circuits the whole chain to null, and the elvis operator supplies the default">' +
		'<text x="20" y="24" class="lbl">u?.address?.city ?: "unknown" — every ?. is an exit ramp, taken at the FIRST nil</text>' +
		'<rect x="40" y="44" width="70" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="75" y="69" text-anchor="middle">u</text>' +
		'<path d="M 110 64 L 156 64" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndNS)"/>' +
		'<rect x="160" y="44" width="110" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="215" y="69" text-anchor="middle">?.address</text>' +
		'<path d="M 270 64 L 316 64" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndNS)"/>' +
		'<rect x="320" y="44" width="90" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="365" y="69" text-anchor="middle">?.city</text>' +
		'<path d="M 410 64 L 452 64" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowAndNSok)"/>' +
		'<text x="484" y="69" text-anchor="middle" style="fill:var(--ok)">"Oslo"</text>' +
		'<path d="M 75 84 L 75 124" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowAndNSwarn)"/>' +
		'<path d="M 215 84 L 215 124" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowAndNSwarn)"/>' +
		'<path d="M 365 84 L 365 124" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowAndNSwarn)"/>' +
		'<text x="260" y="148" text-anchor="middle" class="lbl" style="fill:var(--warn)">nil receiver: no call happens, no panic — the whole expression is just null</text>' +
		'<text x="260" y="180" text-anchor="middle" class="lbl">?: catches exactly that null and supplies "unknown" — 0 and "" are values, never null</text>' +
		'<defs>' +
		'<marker id="dgArrowAndNS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowAndNSok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowAndNSwarn" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'null-safety-operators',
		title: 'Null Safety: ?. ?: !! as Code',
		nav: 'null safety operators',
		difficulty: 'Easy',
		category: 'Kotlin: Types & Null Safety',
		task: 'Implement Kotlin\'s null-safety operators over Go pointers: SafeLength (?.), Elvis (?:), NotNull (!!), and the full chain City (u?.address?.city ?: "unknown").',

		prose: [
			'<h2>Null Safety: <code>?.</code> <code>?:</code> <code>!!</code> as Code</h2>' +
			'<p>First week on the Android team, you port a Go helper to Kotlin. The ' +
			'value comes out of an <code>Intent</code> extra — which may be absent — ' +
			'so its type is <code>String?</code>, and the moment you call a method on ' +
			'it the way you would in Go, the build fails:</p>',
			{ lang: 'kotlin', code: 'val s: String? = intent.getStringExtra("user")  // extra may be absent\nprintln(s.length)\n// error: Only safe (?.) or non-null asserted (!!.) calls are allowed\n//        on a nullable receiver of type String?\n\nprintln(s?.length)        // Int?  — null when s is null, no call made\nprintln(s?.length ?: 0)   // Int   — the elvis operator supplies a default\nprintln(s!!.length)       // Int   — or throws KotlinNullPointerException' },
			'<p>In Go, <code>nil</code> is a runtime fact: a <code>*string</code> ' +
			'might be nil, the type system says nothing more, and the price is a panic ' +
			'in production. Kotlin moves that fact into the type — <code>String</code> ' +
			'can never hold null, <code>String?</code> can — and then <strong>refuses ' +
			'to compile a dereference</strong> until you say what should happen in the ' +
			'null case. There are exactly three answers, one operator each:</p>' +
			'<ul>' +
			'<li><strong><code>?.</code> — safe call.</strong> ' +
			'<code>s?.length</code> calls <code>length</code> only when ' +
			'<code>s</code> is non-null; otherwise the whole expression is null and ' +
			'<em>no call happens</em>. Chains short-circuit at the <em>first</em> ' +
			'null: <code>u?.address?.city</code> can never panic, no matter which hop ' +
			'is missing.</li>' +
			'<li><strong><code>?:</code> — the elvis operator.</strong> ' +
			'<code>x ?: def</code> yields <code>x</code> unless <code>x</code> is ' +
			'null, in which case <code>def</code>. Only <em>null</em> triggers the ' +
			'default — <code>0</code>, <code>""</code>, and <code>false</code> are ' +
			'honest values. That is the trap for a Go developer, whose zero values ' +
			'blur exactly this line.</li>' +
			'<li><strong><code>!!</code> — the not-null assertion.</strong> ' +
			'<code>s!!</code> means “I promise this is non-null; crash me if I am ' +
			'wrong” — it throws <code>KotlinNullPointerException</code> on null. It ' +
			'is the operator code review flags, because it converts a compile-time ' +
			'question back into the runtime crash null safety exists to prevent. ' +
			'(<code>as?</code> is the same bargain for casts: null instead of a ' +
			'<code>ClassCastException</code>.)</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Model <code>T?</code> as Go\'s <code>*T</code> — the closest Go gets ' +
			'to a nullable type — and implement the operators as the checks the ' +
			'Kotlin compiler makes implicit: <code>SafeLength</code> ' +
			'(<code>s?.length</code>, nil-in/nil-out), <code>Elvis</code> ' +
			'(<code>v ?: def</code>), <code>NotNull</code> (<code>s!!</code>, ' +
			'panicking with a message that contains ' +
			'<code>KotlinNullPointerException</code>), and <code>City</code> — the ' +
			'full chain <code>u?.address?.city ?: "unknown"</code> over the ' +
			'<code>User</code>/<code>Address</code> types in the starter.</p>' +
			'<div class="tip">One caveat of the model: Kotlin\'s <code>?:</code> ' +
			'evaluates its right side <em>lazily</em> (so <code>?: return</code> and ' +
			'<code>?: throw</code> are idioms); a Go function argument is evaluated ' +
			'at the call site. The semantics you must get exactly right here is the ' +
			'other half: <strong>only nil selects the default</strong> — a pointer ' +
			'to <code>0</code> is a present value, and <code>Elvis(&amp;zero, 5)</code> ' +
			'must return <code>0</code>.</div>',
		],

		starter: [
			'package main',
			'',
			'// Kotlin\'s T? modeled as Go\'s *T: both admit exactly one extra state.',
			'// The difference is WHO checks — in Kotlin the compiler forces every',
			'// dereference through ?. / ?: / !!; here you write those checks out.',
			'',
			'// Address and User model the chain u?.address?.city — every hop nullable.',
			'type Address struct {',
			'	City *string',
			'}',
			'',
			'type User struct {',
			'	Address *Address',
			'}',
			'',
			'// SafeLength is s?.length: nil in -> nil out (a genuinely nil *int,',
			'// not a pointer to 0), otherwise a pointer to len(*s). It must never',
			'// panic — the safe call makes no call on a null receiver.',
			'func SafeLength(s *string) *int {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Elvis is v ?: def: the default is selected ONLY when v is nil.',
			'// A pointer to 0 is a present value — Elvis(&zero, 5) == 0.',
			'func Elvis(v *int, def int) int {',
			'	// your code here',
			'	return def',
			'}',
			'',
			'// NotNull is s!!: return the value, or panic with a message that',
			'// contains "KotlinNullPointerException" when s is nil.',
			'func NotNull(s *string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// City is the full chain u?.address?.city ?: "unknown": short-circuit',
			'// to "unknown" at the FIRST nil hop (u, u.Address, or u.Address.City),',
			'// never panicking, otherwise the city value itself.',
			'func City(u *User) string {',
			'	// your code here',
			'	return ""',
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
			'	sp := func(s string) *string { return &s }',
			'	// fmtIntPtr distinguishes the two states a *int can encode: nil',
			'	// (Kotlin\'s null) vs a pointer to some value — including 0.',
			'	fmtIntPtr := func(p *int) string {',
			'		if p == nil {',
			'			return "nil"',
			'		}',
			'		return fmt.Sprintf("&%d", *p)',
			'	}',
			'	oslo := "Oslo"',
			'	fullUser := &User{Address: &Address{City: &oslo}}',
			'	zero := 0',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"s?.length on null: nil in, nil out — a genuinely nil *int, and NO panic (the safe call makes no call)",',
			'			"nil",',
			'			func() string { return fmtIntPtr(SafeLength(nil)) }},',
			'		{"s?.length on a present string: a pointer to its length (an Int?, currently non-null)",',
			'			"&6",',
			'			func() string { return fmtIntPtr(SafeLength(sp("Kotlin"))) }},',
			'		{"elvis: nil ?: 42 selects the default",',
			'			"42",',
			'			func() string { return fmt.Sprintf("%d", Elvis(nil, 42)) }},',
			'		{"elvis: ZERO IS NOT NULL — Elvis(&zero, 5) must return 0, the classic trap for a Go developer raised on zero values",',
			'			"0",',
			'			func() string { return fmt.Sprintf("%d", Elvis(&zero, 5)) }},',
			'		{"s!! on a present value just unwraps it",',
			'			"droid",',
			'			func() string { return NotNull(sp("droid")) }},',
			'		{"s!! on the EMPTY string: \\"\\" is a value, not null — !! unwraps it without throwing (the harness never runs the nil branch: its panic contract lives in the doc comment, and firing it here would crash this whole program the way !! crashes an app)",',
			'			"unwrapped: \\"\\"",',
			'			func() string { return fmt.Sprintf("unwrapped: %q", NotNull(sp(""))) }},',
			'		{"chain, all hops present: u?.address?.city yields the city",',
			'			"Oslo",',
			'			func() string { return City(fullUser) }},',
			'		{"chain, u itself nil: short-circuits at the FIRST hop — elvis default, no panic",',
			'			"unknown",',
			'			func() string { return City(nil) }},',
			'		{"chain, address nil mid-chain: ?.city is never evaluated — elvis default",',
			'			"unknown",',
			'			func() string { return City(&User{Address: nil}) }},',
			'		{"chain, city nil at the END: the chain completed but produced null — elvis still catches it",',
			'			"unknown",',
			'			func() string { return City(&User{Address: &Address{City: nil}}) }},',
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
			'// Kotlin\'s T? modeled as Go\'s *T: both admit exactly one extra state.',
			'// The difference is WHO checks — in Kotlin the compiler forces every',
			'// dereference through ?. / ?: / !!; here the checks are written out,',
			'// which is precisely what the Kotlin compiler emits in the bytecode.',
			'',
			'// Address and User model the chain u?.address?.city — every hop nullable.',
			'type Address struct {',
			'	City *string',
			'}',
			'',
			'type User struct {',
			'	Address *Address',
			'}',
			'',
			'// SafeLength is s?.length. Nil-in/nil-out is the whole contract: on a',
			'// null receiver NO call happens — the expression is simply null. The',
			'// result must be a fresh pointer because s?.length has type Int? — a',
			'// new nullable value of its own, not a view into s.',
			'func SafeLength(s *string) *int {',
			'	if s == nil {',
			'		return nil',
			'	}',
			'	// A local gives the length its own address (&len(*s) is not legal',
			'	// Go); Go\'s escape analysis moves it to the heap for us.',
			'	n := len(*s)',
			'	return &n',
			'}',
			'',
			'// Elvis is v ?: def. The only test is nil-ness — NOT zero-ness. Kotlin',
			'// draws a hard line Go\'s zero values blur: 0 is a value someone chose,',
			'// null is the absence of a choice. Collapsing the two (the Go-ism',
			'// `if v == 0`) is the classic porting bug this operator exists to kill.',
			'func Elvis(v *int, def int) int {',
			'	if v == nil {',
			'		return def',
			'	}',
			'	return *v',
			'}',
			'',
			'// NotNull is s!!: the developer overrules the type system, and the',
			'// language honors the promise by crashing LOUDLY when it is broken —',
			'// a named exception at the assertion site, not a mysterious NPE three',
			'// frames later. That is also why code review flags every !!: it is the',
			'// one operator that reintroduces the crash null safety was built to',
			'// prevent.',
			'func NotNull(s *string) string {',
			'	if s == nil {',
			'		panic("KotlinNullPointerException: value was null at !!")',
			'	}',
			'	return *s',
			'}',
			'',
			'// City is u?.address?.city ?: "unknown" — three safe calls and an',
			'// elvis, desugared. Each hop guards only its own receiver; the first',
			'// nil exits the chain with the default and later hops are never',
			'// evaluated. Note the last case: a chain can COMPLETE and still yield',
			'// null (the City field itself nil) — the elvis catches that null too.',
			'func City(u *User) string {',
			'	if u == nil {',
			'		return "unknown" // u?. took the exit ramp',
			'	}',
			'	if u.Address == nil {',
			'		return "unknown" // ?.address was null: ?.city never evaluated',
			'	}',
			'	if u.Address.City == nil {',
			'		return "unknown" // chain completed, value was null: ?: catches it',
			'	}',
			'	return *u.Address.City',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Where this bites in real Android work</h3>' +
			'<p>Open any Play Console crash cluster and the top entries are null ' +
			'safety escaping its cage: a <code>KotlinNullPointerException</code> ' +
			'whose stack trace points at a line containing <code>!!</code>, or an ' +
			'NPE from a <em>platform type</em> — a value that crossed over from Java ' +
			'(shown as <code>String!</code> in the IDE), where the Java side had no ' +
			'nullability information and Kotlin let you treat it as non-null on ' +
			'trust. The operators you implemented are the entire vocabulary for ' +
			'handling both.</p>' +
			'<ul>' +
			'<li><strong><code>!!</code> in code review.</strong> The house rule on ' +
			'most Android teams: every <code>!!</code> needs a justification, and ' +
			'most should instead be <code>requireNotNull(x) { "why" }</code> or ' +
			'<code>checkNotNull</code> — the same crash, but carrying a message that ' +
			'explains the broken invariant instead of a bare exception name.</li>' +
			'<li><strong><code>?: return</code> and <code>?: throw</code>.</strong> ' +
			'Kotlin\'s elvis right-hand side is lazily evaluated and may be a ' +
			'control-flow statement: <code>val user = cache[id] ?: return</code> is ' +
			'the standard early-exit idiom — the part of <code>?:</code> a Go ' +
			'function argument cannot model.</li>' +
			'<li><strong><code>?.let { }</code>.</strong> The safe call composes ' +
			'with lambdas: <code>intent.data?.let { open(it) }</code> runs the block ' +
			'only when non-null — Kotlin\'s answer to Go\'s ' +
			'<code>if x != nil { ... }</code>, with a smart cast inside for free ' +
			'(that is the next problem).</li>' +
			'<li><strong>Chains hide cardinality.</strong> ' +
			'<code>u?.address?.city ?: "unknown"</code> collapses three distinct ' +
			'failure states into one default. Convenient — until product asks WHY ' +
			'the city shows as unknown and the code cannot say which hop was null. ' +
			'The harness\'s three "unknown" cases are three different bugs in ' +
			'production.</li>' +
			'</ul>' +
			'<h3>The Go comparison, honestly</h3>' +
			'<p>Go\'s position is that an explicit <code>if x != nil</code> is the ' +
			'clearest form of this logic — and after desugaring <code>City</code> ' +
			'you have seen that Kotlin agrees about the <em>semantics</em> and ' +
			'disagrees about <em>who enforces them</em>. In Go, forgetting the check ' +
			'compiles and panics in production; in Kotlin, forgetting the check is a ' +
			'compile error, and the operators exist so that saying “I handled it” ' +
			'costs one character, not three lines. The price is a second kind of ' +
			'<code>Int</code> (<code>Int?</code> boxes on the JVM) and a temptation ' +
			'— <code>!!</code> — to opt back out. One historical footnote: this ' +
			'harness pins the exception name as ' +
			'<code>KotlinNullPointerException</code>; since Kotlin 1.4 the compiler ' +
			'unified most of these throws into plain ' +
			'<code>java.lang.NullPointerException</code>, so on a current toolchain ' +
			'the Logcat crash may carry the shorter name.</p>',
		],
		complexity: { time: 'O(1) per operator — each is a constant number of nil checks (Go strings carry their length, so SafeLength is O(1) too)', space: 'O(1)' },
	});
})();
