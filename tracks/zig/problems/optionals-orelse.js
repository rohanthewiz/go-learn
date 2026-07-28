/* Optionals & orelse — Values & Errors (Easy). Zig moves null-ness out of
 * the value and into the TYPE: a plain i64 can never be null, a ?i64 can,
 * and the compiler refuses to hand over the payload until the null case is
 * handled — orelse, .?, or an if |v| capture. The learner implements all
 * three unwrapping forms over a Valid/V struct. The harness pins orelse on
 * both arms, the .? error contract (returned error, zero payload), Map
 * refusing to call f on null, and FirstSome finding / not finding.
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// One ?i64 box, two checked exits: null takes the orelse default, a
	// value takes the |v| capture. Marker id namespaced (dgArrowZGOP)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 200" width="560" height="200" role="img" aria-label="a ?i64 optional has two checked exits: null flows to the orelse default, a value flows into the capture branch">' +
		'<text x="20" y="24" class="lbl">?i64 — the null-ness lives in the type, so both exits are compiler-checked</text>' +
		'<rect x="40" y="72" width="110" height="56" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="95" y="96" text-anchor="middle">?i64</text>' +
		'<text x="95" y="116" text-anchor="middle" class="lbl">null | value</text>' +
		// null path -> orelse default
		'<path d="M 150 86 C 210 68 240 60 296 58" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowZGOP)"/>' +
		'<text x="200" y="52" class="lbl" style="fill:var(--warn)">null</text>' +
		'<rect x="300" y="40" width="216" height="36" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="408" y="63" text-anchor="middle">orelse 8080 &nbsp;→&nbsp; 8080</text>' +
		// value path -> capture
		'<path d="M 150 114 C 210 132 240 140 296 142" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowZGOP)"/>' +
		'<text x="200" y="160" class="lbl" style="fill:var(--accent)">value 42</text>' +
		'<rect x="300" y="124" width="216" height="36" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="408" y="147" text-anchor="middle">if (o) |v| &nbsp;→&nbsp; v = 42</text>' +
		'<text x="20" y="190" class="lbl">either way the result is a plain i64 — un-checked null simply cannot flow onward</text>' +
		'<defs><marker id="dgArrowZGOP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'optionals-orelse',
		title: 'Optionals & orelse',
		nav: 'optionals',
		difficulty: 'Easy',
		category: 'Values & Errors',
		task: 'Implement Orelse, Unwrap, Map, and FirstSome — Zig\'s ?i64 unwrapping forms over an explicit Valid/V optional.',

		prose: [
			'<h2>Optionals &amp; orelse</h2>' +
			'<p>The 3&nbsp;a.m. page every Go developer eventually gets: ' +
			'<code>invalid memory address or nil pointer dereference</code>. Somewhere, ' +
			'a function returned a nil <code>*Config</code>, nobody checked, and the ' +
			'deref happened three packages away from the bug. Tony Hoare called the ' +
			'null reference his “billion-dollar mistake”, and Zig’s answer is blunt: ' +
			'a plain <code>i64</code> <em>cannot</em> be null — ever. If a value might ' +
			'be absent, that fact goes in the type, spelled <code>?i64</code>, and the ' +
			'compiler will not give you the payload until you say what happens when ' +
			'it isn’t there:</p>',
			{ lang: 'txt', code: 'var port: ?i64 = null;      // the TYPE admits null; a plain i64 never does\n\nconst a = port orelse 8080; // unwrap-with-default: a is a plain i64\nconst b = port.?;           // assert non-null — safety-checked crash on null\nif (port) |v| {             // capture: v is the payload, a plain i64,\n    total += v;             // and it only exists inside this branch\n}' },
			'<p>Go spells “maybe absent” by convention — and conventions are exactly ' +
			'what nobody enforces at 3&nbsp;a.m.:</p>',
			{ code: '// Both Go idioms rely on the reader, not the compiler:\nvar port *int    // nil-able pointer — deref without checking? runtime panic\nv, ok := m[key]  // comma-ok — nothing stops you using v when ok is false' },
			'<ul>' +
			'<li><strong><code>orelse</code></strong> unwraps with a default. The ' +
			'result type is plain <code>i64</code> — the null-ness has been ' +
			'<em>discharged</em> and cannot leak further.</li>' +
			'<li><strong><code>.?</code></strong> asserts “this is not null, I know ' +
			'it”. When you’re wrong, Zig’s safety check stops the program right there ' +
			'— at the assertion, not three packages later.</li>' +
			'<li><strong><code>if (opt) |v|</code></strong> captures the payload into ' +
			'<code>v</code>, visible only inside the branch. There is no scope where ' +
			'you hold an unchecked value — the shape Go’s comma-ok merely suggests.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Model the optional as <code>Opt{Valid, V}</code> and implement the ' +
			'unwrapping forms: <code>Orelse</code> (unwrap-with-default), ' +
			'<code>Unwrap</code> (the <code>.?</code> assertion — but its failure is a ' +
			'returned error, not a crash), <code>Map</code> (the capture: apply ' +
			'<code>f</code> inside the value branch, and <em>never call it</em> on ' +
			'null), and <code>FirstSome</code> (first valid optional in a slice).</p>',
			{ lang: 'txt', code: 'Orelse(null, 8080)                   → 8080\nOrelse(some(3000), 8080)             → 3000\nUnwrap(null)                         → 0, error "unwrap of null"\nMap(null, double)                    → null        // double is never called\nFirstSome([null, some(5), some(9)])  → some(5)' },
		],

		starter: [
			'package main',
			'',
			'// Opt models Zig\'s ?i64: either a present value (Valid true, payload',
			'// in V) or null (Valid false, V meaningless). Zig puts this distinction',
			'// in the TYPE — a plain i64 can never be null — where Go reaches for a',
			'// *int or a (value, ok) pair by convention.',
			'type Opt struct {',
			'	Valid bool',
			'	V     int',
			'}',
			'',
			'// Orelse models `o orelse def`: the payload when one is present,',
			'// otherwise the default. Either way the result is a plain int — the',
			'// null-ness has been discharged.',
			'func Orelse(o Opt, def int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Unwrap models `o.?` — assert the value is present. On a valid',
			'// optional return (payload, nil). On null, where Zig\'s safety check',
			'// would crash the program, return (0, error "unwrap of null") instead.',
			'func Unwrap(o Opt) (int, error) {',
			'	// your code here',
			'	return 0, nil',
			'}',
			'',
			'// Map models the `if (o) |v| { ... }` capture: when the optional holds',
			'// a value, apply f to the payload and return the result as a valid Opt.',
			'// When it is null, return null WITHOUT calling f — the capture branch',
			'// never runs on null.',
			'func Map(o Opt, f func(int) int) Opt {',
			'	// your code here',
			'	return Opt{}',
			'}',
			'',
			'// FirstSome returns the first valid optional in os, or null when every',
			'// element is null (or the slice is empty).',
			'func FirstSome(os []Opt) Opt {',
			'	// your code here',
			'	return Opt{}',
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
			'	// Constructors and a printer keep the case table readable.',
			'	some := func(v int) Opt { return Opt{Valid: true, V: v} }',
			'	null := Opt{}',
			'	fmtOpt := func(o Opt) string {',
			'		if o.Valid {',
			'			return fmt.Sprintf("some(%d)", o.V)',
			'		}',
			'		return "null"',
			'	}',
			'	double := func(x int) int { return x * 2 }',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"orelse on null: the default steps in",',
			'			"8080",',
			'			func() string { return fmt.Sprintf("%d", Orelse(null, 8080)) }},',
			'		{"orelse on some(3000): the payload wins, the default is dead code",',
			'			"3000",',
			'			func() string { return fmt.Sprintf("%d", Orelse(some(3000), 8080)) }},',
			'		{"Unwrap on some(7): the .? assertion holds — payload out, nil error",',
			'			"ok 7",',
			'			func() string {',
			'				v, err := Unwrap(some(7))',
			'				if err == nil {',
			'					return fmt.Sprintf("ok %d", v)',
			'				}',
			'				return fmt.Sprintf("v=%d err=%s", v, err)',
			'			}},',
			'		{"Unwrap on null: the assertion fails as a RETURNED error, payload zeroed",',
			'			"v=0 err=unwrap of null",',
			'			func() string {',
			'				v, err := Unwrap(null)',
			'				if err == nil {',
			'					return fmt.Sprintf("ok %d", v)',
			'				}',
			'				return fmt.Sprintf("v=%d err=%s", v, err)',
			'			}},',
			'		{"Map on some(21): f runs inside the capture branch — some(42) out",',
			'			"some(42)",',
			'			func() string { return fmtOpt(Map(some(21), double)) }},',
			'		{"Map on null: null propagates and f must NOT be called — no capture, no branch",',
			'			"null f-called=false",',
			'			func() string {',
			'				called := false',
			'				res := Map(null, func(x int) int { called = true; return x })',
			'				return fmt.Sprintf("%s f-called=%v", fmtOpt(res), called)',
			'			}},',
			'		{"FirstSome skips nulls and stops at the first value — some(5), not some(9)",',
			'			"some(5)",',
			'			func() string { return fmtOpt(FirstSome([]Opt{null, null, some(5), some(9)})) }},',
			'		{"FirstSome over all nulls: no value anywhere, so the answer is null",',
			'			"null",',
			'			func() string { return fmtOpt(FirstSome([]Opt{null, null, null})) }},',
			'		{"FirstSome over the empty slice: vacuously null",',
			'			"null",',
			'			func() string { return fmtOpt(FirstSome([]Opt{})) }},',
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
			'import "errors"',
			'',
			'// Opt models Zig\'s ?i64: either a present value (Valid true, payload',
			'// in V) or null (Valid false). Redeclared here because the solution',
			'// replaces the starter wholesale. This is exactly the layout Zig uses',
			'// under the hood for non-pointer optionals: payload plus a boolean tag',
			'// (pointer optionals get the tag for free — address 0 means null).',
			'type Opt struct {',
			'	Valid bool',
			'	V     int',
			'}',
			'',
			'// errNull is the one failure Unwrap can report. A package-level value',
			'// (rather than a fresh errors.New per call) mirrors how sentinel errors',
			'// are declared in Go — callers could compare with errors.Is.',
			'var errNull = errors.New("unwrap of null")',
			'',
			'// Orelse is `o orelse def`. The whole operator is one branch — the',
			'// point is not cleverness but WHERE the branch lives: at the unwrap',
			'// site, forced by the type, instead of scattered nil checks the',
			'// compiler never asked for.',
			'func Orelse(o Opt, def int) int {',
			'	if o.Valid {',
			'		return o.V',
			'	}',
			'	return def',
			'}',
			'',
			'// Unwrap is `o.?`. Zig compiles this to a safety-checked branch that',
			'// stops the program on null; a returned error is the Go-shaped version',
			'// of the same contract — the failure is loud and immediate at the',
			'// assertion site, and the payload slot carries the zero value, never',
			'// stale garbage.',
			'func Unwrap(o Opt) (int, error) {',
			'	if !o.Valid {',
			'		return 0, errNull',
			'	}',
			'	return o.V, nil',
			'}',
			'',
			'// Map is the `if (o) |v|` capture as a function: f is the branch body,',
			'// and the null arm returns before f is ever reached. That ordering is',
			'// the semantic being modeled — the capture branch simply does not run',
			'// on null, so f must not be called, not even with a dummy argument.',
			'func Map(o Opt, f func(int) int) Opt {',
			'	if !o.Valid {',
			'		return Opt{} // null in, null out; f never invoked',
			'	}',
			'	return Opt{Valid: true, V: f(o.V)}',
			'}',
			'',
			'// FirstSome scans for the first present value. Returning o (not just',
			'// o.V) keeps the null-ness in the result type: when nothing is found',
			'// the caller gets a null Opt to unwrap, not a magic 0 it might mistake',
			'// for data — the same reason Zig APIs return ?T instead of a sentinel.',
			'func FirstSome(os []Opt) Opt {',
			'	for _, o := range os {',
			'		if o.Valid {',
			'			return o',
			'		}',
			'	}',
			'	return Opt{}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Null-ness in the type, not in the value</h3>' +
			'<p>The move this item drills is small but total: in Go, <em>any</em> ' +
			'pointer may be nil, so every pointer is a latent check you might forget; ' +
			'in Zig, only <code>?T</code> may be null, and the compiler makes forgetting ' +
			'impossible — there is no operation that extracts the payload without ' +
			'going through <code>orelse</code>, <code>.?</code>, or a capture. Your ' +
			'<code>Opt</code> struct is not a toy, either: it is byte-for-byte the ' +
			'shape of Go’s own <code>sql.NullInt64</code> (<code>{Int64, Valid}</code>), ' +
			'which exists precisely because Go had no optional type and database ' +
			'NULLs would not go away. The classic bug with that struct — reading ' +
			'<code>.Int64</code> without checking <code>.Valid</code> — is the exact ' +
			'bug Zig’s compiler refuses to compile.</p>' +
			'<h3>The zero-cost trick for pointers</h3>' +
			'<p>A <code>?i64</code> costs one extra tag byte (plus padding), like your ' +
			'<code>Valid</code> field. But <code>?*T</code> costs <em>nothing</em>: a ' +
			'valid pointer is never address 0, so Zig uses 0 as the null encoding and ' +
			'the optional is the same size as the raw pointer. That is Go’s nil ' +
			'pointer, reconstructed — but with the check moved to compile time. Rust ' +
			'does the identical trick (<code>Option&lt;&amp;T&gt;</code>, “niche ' +
			'optimization”); it is the standard answer to “doesn’t safety cost ' +
			'memory?”</p>' +
			'<h3>Where each form shows up in real Zig</h3>' +
			'<p><code>orelse</code> is the config-default workhorse ' +
			'(<code>args.port orelse 8080</code>) and also composes with control flow: ' +
			'<code>const v = map.get(key) orelse return error.Missing;</code> — ' +
			'because <code>return</code> is an expression of type <code>noreturn</code>, ' +
			'“unwrap or bail” is one line. <code>.?</code> is for invariants you have ' +
			'already established (“I just inserted this key”), and reviewers treat a ' +
			'naked <code>.?</code> the way Go reviewers treat an ignored error. The ' +
			'<code>while (it.next()) |item|</code> capture — <code>FirstSome</code> is ' +
			'a compressed version of it — is Zig’s iterator protocol: no ' +
			'<code>hasNext</code>, just an optional that goes null when the sequence ' +
			'ends.</p>',
		],
		complexity: { time: 'O(1) per unwrap; FirstSome is O(n) over the slice', space: 'O(1)' },
	});
})();
