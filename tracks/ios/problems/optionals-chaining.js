/* Optionals: ?, ??, and if let — Swift: Types & Optionals (Easy). Swift's
 * Optional is not a nullable pointer, it is an enum with two cases — and the
 * compiler refuses to touch the wrapped value until you say what happens in
 * the .none case. The learner implements the four unwraps over Go pointers:
 * the ?. chain u?.address?.city?.name (nil at any hop, no crash), the ??
 * default (and the zero-is-not-nil trap), and the if let / guard let binding
 * shapes as (value, ok) pairs. The fifth unwrap — ! — appears only as the
 * crash it is: its contract lives in prose and comments, never in a harness
 * case.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// The optional chain as a pipeline with exit ramps: any nil hop makes
	// the WHOLE expression nil (no later hop is evaluated, no crash), and
	// ?? catches exactly that nil. Marker ids namespaced (dgArrowIOSOC*)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 204" width="560" height="204" role="img" aria-label="u?.address?.city?.name: each question mark is an exit ramp — a nil hop short-circuits the whole chain to nil, and the nil-coalescing operator supplies the default">' +
		'<text x="20" y="24" class="lbl">u?.address?.city?.name ?? "Unknown" — every ?. is an exit ramp, taken at the FIRST nil</text>' +
		'<rect x="40" y="44" width="50" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="65" y="69" text-anchor="middle">u</text>' +
		'<path d="M 90 64 L 112 64" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowIOSOC)"/>' +
		'<rect x="116" y="44" width="104" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="168" y="69" text-anchor="middle">?.address</text>' +
		'<path d="M 220 64 L 242 64" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowIOSOC)"/>' +
		'<rect x="246" y="44" width="76" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="284" y="69" text-anchor="middle">?.city</text>' +
		'<path d="M 322 64 L 344 64" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowIOSOC)"/>' +
		'<rect x="348" y="44" width="84" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="390" y="69" text-anchor="middle">.name</text>' +
		'<path d="M 432 64 L 456 64" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowIOSOCok)"/>' +
		'<text x="502" y="69" text-anchor="middle" style="fill:var(--ok)">"Cupertino"</text>' +
		'<path d="M 65 84 L 65 124" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowIOSOCwarn)"/>' +
		'<path d="M 168 84 L 168 124" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowIOSOCwarn)"/>' +
		'<path d="M 284 84 L 284 124" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowIOSOCwarn)"/>' +
		'<text x="280" y="150" text-anchor="middle" class="lbl" style="fill:var(--warn)">nil at ANY hop: no later hop is evaluated, no crash — the whole expression is just nil</text>' +
		'<text x="280" y="184" text-anchor="middle" class="lbl">?? catches exactly that nil and supplies "Unknown" — 0 and "" are values, never nil</text>' +
		'<defs>' +
		'<marker id="dgArrowIOSOC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowIOSOCok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowIOSOCwarn" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'optionals-chaining',
		title: 'Optionals: ?, ??, and if let',
		nav: 'optionals chaining',
		difficulty: 'Easy',
		category: 'Swift: Types & Optionals',
		task: 'Implement Swift\'s optional unwraps over Go pointers: Chain (u?.address?.city?.name), NilCoalesce (??), and the if let / guard let binding shapes as (value, ok) pairs.',

		prose: [
			'<h2>Optionals: <code>?</code>, <code>??</code>, and <code>if let</code></h2>' +
			'<p>Your first crash report from TestFlight. The app worked in every ' +
			'demo, but one tester has no city set on their profile, and the crash ' +
			'log points at a single line:</p>',
			{ lang: 'swift', code: 'let label = user!.address!.city!.name\n// Fatal error: Unexpectedly found nil while unwrapping an Optional value\n// Thread 1: EXC_BREAKPOINT (code=1, subcode=0x1abc0ff00)' },
			'<p>Swift put the crash there on purpose. In Go, <code>nil</code> is a ' +
			'runtime fact — a <code>*string</code> might be nil, the type says ' +
			'nothing more, and the price is a panic in production. Swift moves the ' +
			'fact into the type: <code>String</code> can never be absent, ' +
			'<code>String?</code> can, and the compiler <strong>refuses to compile ' +
			'a direct member access</strong> on an optional until you say what the ' +
			'nil case should do:</p>',
			{ lang: 'swift', code: 'let name: String? = user?.address?.city?.name\nprint(name.count)\n// error: value of optional type \'String?\' must be unwrapped to refer to\n//        member \'count\' of wrapped base type \'String\'\n// note: chain the optional using \'?\' to access member \'count\' only for\n//       non-\'nil\' base values\n// note: force-unwrap using \'!\' to abort execution if the optional value\n//       contains \'nil\'' },
			'<p>There are four honest answers, and one dishonest one:</p>' +
			'<ul>' +
			'<li><strong><code>?.</code> — optional chaining.</strong> ' +
			'<code>u?.address</code> evaluates <code>.address</code> only when ' +
			'<code>u</code> is non-nil; otherwise the whole expression is nil and ' +
			'<em>nothing after the failed hop runs</em>. Chains short-circuit at ' +
			'the <strong>first</strong> nil: <code>u?.address?.city?.name</code> ' +
			'can never crash, no matter which hop is missing.</li>' +
			'<li><strong><code>??</code> — nil-coalescing.</strong> ' +
			'<code>x ?? def</code> yields <code>x</code> unless <code>x</code> is ' +
			'nil, in which case <code>def</code>. Only <em>nil</em> triggers the ' +
			'default — <code>0</code>, <code>""</code>, and <code>false</code> are ' +
			'honest values. That is the trap for a Go developer, whose zero values ' +
			'blur exactly this line.</li>' +
			'<li><strong><code>if let</code> — scoped binding.</strong> ' +
			'<code>if let n = name { ... }</code> runs the block only when ' +
			'<code>name</code> is non-nil, and inside the braces <code>n</code> is ' +
			'a plain <code>String</code> — the optionality is gone.</li>' +
			'<li><strong><code>guard let</code> — early exit.</strong> The same ' +
			'test flipped: <code>guard let n = name else { return }</code> binds ' +
			'<code>n</code> for the <em>rest of the function</em>, and the compiler ' +
			'enforces that the <code>else</code> branch exits (return, throw, ' +
			'<code>fatalError</code>). It is how Swift code keeps its happy path ' +
			'un-indented.</li>' +
			'<li><strong><code>!</code> — force unwrap.</strong> “I promise this ' +
			'is non-nil; crash me if I am wrong.” The promise-breaking crash is the ' +
			'TestFlight report above, and it is the operator code review flags on ' +
			'sight.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Model <code>T?</code> as Go\'s <code>*T</code> — the closest Go ' +
			'gets to an optional — and implement the unwraps as the checks the ' +
			'Swift compiler makes implicit: <code>Chain</code> ' +
			'(<code>u?.address?.city?.name</code> over the ' +
			'<code>User</code>/<code>Address</code>/<code>City</code> types in the ' +
			'starter, nil at the first missing hop), <code>NilCoalesce</code> ' +
			'(<code>v ?? def</code>), and <code>IfLet</code> / ' +
			'<code>GuardLet</code> — the binding test as a <code>(value, ok)</code> ' +
			'pair, Go\'s own comma-ok idiom wearing Swift clothes.</p>' +
			'<div class="tip">One caveat of the model: Swift\'s <code>??</code> ' +
			'evaluates its right side <em>lazily</em> (it is an ' +
			'<code>@autoclosure</code>, so <code>x ?? expensiveDefault()</code> ' +
			'never runs the call when <code>x</code> is present); a Go function ' +
			'argument is evaluated at the call site. The semantics you must get ' +
			'exactly right here is the other half: <strong>only nil selects the ' +
			'default</strong> — a pointer to <code>0</code> is a present value, and ' +
			'<code>NilCoalesce(&amp;zero, 5)</code> must return <code>0</code>.</div>',
		],

		starter: [
			'package main',
			'',
			'// Swift\'s Optional<T> modeled as Go\'s *T: both admit exactly one',
			'// extra state beyond T\'s values. The difference is WHO checks — the',
			'// Swift compiler refuses to touch a T? until it is unwrapped with',
			'// ?., ??, if let, or guard let; here those unwraps are written out.',
			'// (The fifth unwrap, !, has no function below: its contract is a',
			'// crash — "Fatal error: Unexpectedly found nil while unwrapping an',
			'// Optional value" — and crashes make poor library functions.)',
			'',
			'// City, Address, User model the chain u?.address?.city?.name —',
			'// every hop optional, any hop may be missing.',
			'type City struct {',
			'	Name string',
			'}',
			'',
			'type Address struct {',
			'	City *City',
			'}',
			'',
			'type User struct {',
			'	Address *Address',
			'}',
			'',
			'// Chain is u?.address?.city?.name: short-circuit to nil at the FIRST',
			'// missing hop (u, u.Address, or u.Address.City), never panicking —',
			'// otherwise a pointer to the name. Return a FRESH *string: the',
			'// chain\'s type is String? — a new optional value of its own, not a',
			'// view into the User.',
			'func Chain(u *User) *string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// NilCoalesce is v ?? def: the default is selected ONLY when v is',
			'// nil. A pointer to 0 is a present value — NilCoalesce(&zero, 5)',
			'// must return 0.',
			'func NilCoalesce(v *int, def int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// IfLet is `if let x = v { use(x) }` desugared: (value, true) when v',
			'// is present, (0, false) when it is nil. Inside Swift\'s braces x is',
			'// a plain Int — the optionality is gone; the bool is that scope test.',
			'func IfLet(v *int) (int, bool) {',
			'	// your code here',
			'	return 0, false',
			'}',
			'',
			'// GuardLet is `guard let s = v else { return ... }` desugared: the',
			'// same (value, ok) shape, but in Swift the binding survives for the',
			'// REST of the function and the compiler forces the else branch to',
			'// exit. Return ("", false) for nil — the early-exit signal.',
			'func GuardLet(v *string) (string, bool) {',
			'	// your code here',
			'	return "", false',
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
			'	// fmtStrPtr distinguishes the two states a *string can encode:',
			'	// nil (Swift\'s .none) vs a pointer to some value — including "".',
			'	fmtStrPtr := func(p *string) string {',
			'		if p == nil {',
			'			return "nil"',
			'		}',
			'		return fmt.Sprintf("&%q", *p)',
			'	}',
			'	full := &User{Address: &Address{City: &City{Name: "Cupertino"}}}',
			'	zero := 0',
			'	seven := 7',
			'	ada := "Ada"',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"chain, all hops present: u?.address?.city?.name yields the name (a String?, currently non-nil)",',
			'			"&\\"Cupertino\\"",',
			'			func() string { return fmtStrPtr(Chain(full)) }},',
			'		{"chain, u itself nil: short-circuits at the FIRST hop — nil out, no panic (the ?. makes no access)",',
			'			"nil",',
			'			func() string { return fmtStrPtr(Chain(nil)) }},',
			'		{"chain, address nil mid-chain: ?.city and .name are never evaluated — nil out",',
			'			"nil",',
			'			func() string { return fmtStrPtr(Chain(&User{Address: nil})) }},',
			'		{"chain, city nil at the END: the chain got two hops in and still exits cleanly with nil",',
			'			"nil",',
			'			func() string { return fmtStrPtr(Chain(&User{Address: &Address{City: nil}})) }},',
			'		{"nil-coalescing: nil ?? 42 selects the default",',
			'			"42",',
			'			func() string { return fmt.Sprintf("%d", NilCoalesce(nil, 42)) }},',
			'		{"ZERO IS NOT NIL — NilCoalesce(&zero, 5) must return 0, the classic trap for a Go developer raised on zero values",',
			'			"0",',
			'			func() string { return fmt.Sprintf("%d", NilCoalesce(&zero, 5)) }},',
			'		{"if let on a present value: binds the plain Int and reports true",',
			'			"7 true",',
			'			func() string {',
			'				v, ok := IfLet(&seven)',
			'				return fmt.Sprintf("%d %v", v, ok)',
			'			}},',
			'		{"if let on nil: the block never runs — zero value and false",',
			'			"0 false",',
			'			func() string {',
			'				v, ok := IfLet(nil)',
			'				return fmt.Sprintf("%d %v", v, ok)',
			'			}},',
			'		{"guard let on a present value: the binding survives — value and true",',
			'			"\\"Ada\\" true",',
			'			func() string {',
			'				s, ok := GuardLet(&ada)',
			'				return fmt.Sprintf("%q %v", s, ok)',
			'			}},',
			'		{"guard let on nil: the else branch exits early — empty value and false",',
			'			"\\"\\" false",',
			'			func() string {',
			'				s, ok := GuardLet(nil)',
			'				return fmt.Sprintf("%q %v", s, ok)',
			'			}},',
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
			'// Swift\'s Optional<T> modeled as Go\'s *T: both admit exactly one',
			'// extra state beyond T\'s values. The difference is WHO checks — the',
			'// Swift compiler forces every access through ?. / ?? / if let /',
			'// guard let; here the checks are written out, which is precisely',
			'// what the compiler lowers those forms into: a tag test on the',
			'// Optional enum (.none vs .some) before every touch of the payload.',
			'',
			'// City, Address, User model the chain u?.address?.city?.name —',
			'// every hop optional, any hop may be missing.',
			'type City struct {',
			'	Name string',
			'}',
			'',
			'type Address struct {',
			'	City *City',
			'}',
			'',
			'type User struct {',
			'	Address *Address',
			'}',
			'',
			'// Chain is u?.address?.city?.name — three optional hops, desugared.',
			'// Each hop guards only its own receiver; the first nil exits the',
			'// chain and later hops are NEVER evaluated (no access happens, so',
			'// no crash can happen — the safety is structural, not defensive).',
			'func Chain(u *User) *string {',
			'	if u == nil {',
			'		return nil // u?. took the exit ramp',
			'	}',
			'	if u.Address == nil {',
			'		return nil // ?.address was nil: ?.city never evaluated',
			'	}',
			'	if u.Address.City == nil {',
			'		return nil // ?.city was nil: .name never evaluated',
			'	}',
			'	// A local gives the name its own address — the chain\'s result is',
			'	// a String? with its OWN storage, not a pointer into the User.',
			'	// (Swift agrees: the chain produces a new Optional value; Go\'s',
			'	// escape analysis moves the local to the heap for us.)',
			'	name := u.Address.City.Name',
			'	return &name',
			'}',
			'',
			'// NilCoalesce is v ?? def. The only test is nil-ness — NOT zero-ness.',
			'// Swift draws a hard line Go\'s zero values blur: 0 is a value',
			'// someone chose, nil is the absence of a choice. Collapsing the two',
			'// (the Go-ism `if v == 0`) is the classic porting bug this operator',
			'// exists to kill. One fidelity note: Swift\'s ?? takes its right side',
			'// as an @autoclosure and evaluates it lazily; a Go argument is',
			'// eager, so the laziness half of the contract lives in prose only.',
			'func NilCoalesce(v *int, def int) int {',
			'	if v == nil {',
			'		return def',
			'	}',
			'	return *v',
			'}',
			'',
			'// IfLet is the binding test behind `if let x = v { ... }`: probe the',
			'// optional once, and on success hand back the PLAIN value — inside',
			'// the braces Swift\'s x is an Int, not an Int?, so no further unwrap',
			'// is ever needed. Go\'s comma-ok return is the same shape the map',
			'// lookup and type assertion already use — Swift just built the',
			'// pattern into an if statement.',
			'func IfLet(v *int) (int, bool) {',
			'	if v == nil {',
			'		return 0, false',
			'	}',
			'	return *v, true',
			'}',
			'',
			'// GuardLet is the same test with the control flow inverted: `guard',
			'// let s = v else { return ... }` binds s for the REST of the',
			'// function and the compiler proves the else branch exits. The two',
			'// forms compile to the same tag test — the difference is purely',
			'// which branch stays indented. Idiomatic Swift guards its',
			'// preconditions at the top and keeps the happy path flat, which is',
			'// exactly Go\'s early-return style with compiler enforcement added.',
			'func GuardLet(v *string) (string, bool) {',
			'	if v == nil {',
			'		return "", false',
			'	}',
			'	return *v, true',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Optional is an enum, and that explains everything</h3>' +
			'<p>The whole feature is eight lines of standard library:</p>' +
			'<pre><code>enum Optional&lt;Wrapped&gt; {\n    case none\n    case some(Wrapped)\n}</code></pre>' +
			'<p><code>nil</code> is not a special pointer value — it is the literal ' +
			'for <code>.none</code> (via <code>ExpressibleByNilLiteral</code>), ' +
			'which is why an <code>Int?</code> can be nil even though an ' +
			'<code>Int</code> could never be a null pointer, and why ' +
			'<code>Optional&lt;Optional&lt;Int&gt;&gt;</code> is a real type with ' +
			'three states (<code>.none</code>, <code>.some(.none)</code>, ' +
			'<code>.some(.some(7))</code>) — a dictionary of optionals hands you ' +
			'exactly that when you look a key up. Every unwrap you implemented is ' +
			'a pattern match on this enum: <code>if let</code> is ' +
			'<code>if case .some(let x)</code>, and <code>?.</code> is that match ' +
			'with an early <code>.none</code> propagation.</p>' +
			'<h3>Why the chain does not stack question marks</h3>' +
			'<p>Naively, each <code>?.</code> should add a layer: three hops, ' +
			'<code>String???</code>. Swift defines chaining to <strong>flatten' +
			'</strong> — the result of an optional chain is always one optional ' +
			'deep, whatever its length, because a failed hop produces the ' +
			'<em>chain\'s</em> nil rather than wrapping the tail\'s type. Your ' +
			'<code>Chain</code> models this faithfully: it returns ' +
			'<code>*string</code>, not <code>**string</code>, and every early exit ' +
			'returns the same flat nil.</p>' +
			'<h3>Field notes</h3>' +
			'<ul>' +
			'<li><strong><code>??</code> is lazy.</strong> Its right operand is an ' +
			'<code>@autoclosure</code>, evaluated only on nil — so ' +
			'<code>cache[key] ?? loadFromDisk()</code> touches the disk only on a ' +
			'miss, and <code>?? fatalError("impossible")</code> is a legal (if ' +
			'spicy) default. The Go model is eager; that half of the contract ' +
			'could not be pinned in the harness.</li>' +
			'<li><strong>Shorthand shadowing.</strong> Since Swift 5.7, ' +
			'<code>if let name</code> (no right-hand side) unwraps ' +
			'<code>name</code> into a same-named shadow — the idiom you will see ' +
			'in every modern codebase in place of <code>if let name = name</code>.</li>' +
			'<li><strong>Implicitly unwrapped optionals.</strong> ' +
			'<code>@IBOutlet var label: UILabel!</code> declares a value that is ' +
			'nil during init and set by the storyboard before use — every access ' +
			'force-unwraps silently. It is the reason “tapped a button before ' +
			'viewDidLoad wired things up” crashes with the same fatal error as ' +
			'<code>!</code>: it <em>is</em> <code>!</code>, applied for you.</li>' +
			'<li><strong><code>!</code> in code review.</strong> The house rule on ' +
			'most iOS teams mirrors Android\'s <code>!!</code> rule: every force ' +
			'unwrap needs a justification, and most should be ' +
			'<code>guard let</code> with a loud <code>fatalError</code> message ' +
			'that names the broken invariant — same crash, better crash log.</li>' +
			'<li><strong>Chains hide cardinality.</strong> ' +
			'<code>u?.address?.city?.name ?? "Unknown"</code> collapses three ' +
			'distinct absences into one default. Convenient — until product asks ' +
			'WHY the label says Unknown and the code cannot say which hop was nil. ' +
			'The harness\'s three nil cases are three different bugs in ' +
			'production.</li>' +
			'</ul>' +
			'<h3>The Go comparison, honestly</h3>' +
			'<p>Go\'s position is that an explicit <code>if x != nil</code> is the ' +
			'clearest form of this logic — and after desugaring <code>Chain</code> ' +
			'you have seen that Swift agrees about the <em>semantics</em> and ' +
			'disagrees about <em>who enforces them</em>. In Go, forgetting the ' +
			'check compiles and panics in production; in Swift, forgetting the ' +
			'check is a compile error, and the operators exist so that saying “I ' +
			'handled it” costs one character. The comma-ok pair you returned from ' +
			'<code>IfLet</code> is Go\'s native spelling of ' +
			'<code>.some(x)</code>/<code>.none</code> — the two languages are ' +
			'closer here than either\'s fans admit.</p>',
		],
		complexity: { time: 'O(1) per operator — each is a constant number of nil checks', space: 'O(1) — Chain allocates one string header for the fresh optional' },
	});
})();
