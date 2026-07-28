/* comptime Generics — Types & Comptime (Hard). Zig generics are just
 * functions taking `comptime T: type` and RETURNING types; each distinct
 * T stamps a separate concrete type at compile time (monomorphization),
 * and repeats reuse the first stamp. The learner implements the
 * monomorphizer's bookkeeping — first-use-order dedup and per-generic
 * distinct counts — plus the hand-monomorphized MaxInt/MaxStr pair a
 * single Zig `fn max(comptime T: type, ...)` generates for free.
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// One template, three stamps — and a repeated call routed back to an
	// existing stamp instead of minting a new one. Marker ids namespaced
	// (dgArrowZGCG / dgArrowZGCGW) because every track's SVGs share the
	// page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 216" width="520" height="216" role="img" aria-label="one generic template box stamps three concrete type boxes; a repeated call is routed by a dedup arrow to the existing stamp instead of creating a new one">' +
		'<text x="20" y="24" class="lbl">one template, one stamp per DISTINCT T — repeats reuse</text>' +
		// the generic template
		'<rect x="30" y="58" width="180" height="56" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="120" y="82" text-anchor="middle">fn ArrayList(comptime T)</text>' +
		'<text x="120" y="102" text-anchor="middle" class="lbl">returns a type — the template</text>' +
		// three stamped concrete types
		'<rect x="330" y="38" width="160" height="32" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="410" y="59" text-anchor="middle">ArrayList(u8)</text>' +
		'<rect x="330" y="84" width="160" height="32" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="410" y="105" text-anchor="middle">ArrayList(i32)</text>' +
		'<rect x="330" y="130" width="160" height="32" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="410" y="151" text-anchor="middle">ArrayList(f64)</text>' +
		// stamp arrows
		'<path d="M 216 74 C 270 68 280 58 324 54" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowZGCG)"/>' +
		'<path d="M 216 86 C 270 90 280 98 324 100" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowZGCG)"/>' +
		'<path d="M 216 98 C 270 110 280 138 324 146" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowZGCG)"/>' +
		'<text x="268" y="40" text-anchor="middle" class="lbl">each distinct T stamps real code</text>' +
		// the repeated call, deduped
		'<rect x="30" y="152" width="180" height="32" rx="5" fill="none" stroke="var(--warn)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<text x="120" y="173" text-anchor="middle">ArrayList(i32) again</text>' +
		'<path d="M 216 168 C 290 168 300 118 324 106" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowZGCGW)"/>' +
		'<text x="290" y="188" text-anchor="middle" class="lbl" style="fill:var(--warn)">dedup: routed to the existing stamp</text>' +
		'<text x="20" y="210" class="lbl">zero-cost dispatch is the win; one code copy per distinct T is the tax</text>' +
		'<defs>' +
		'<marker id="dgArrowZGCG" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowZGCGW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'comptime-generics',
		title: 'comptime Generics',
		nav: 'comptime generics',
		difficulty: 'Hard',
		category: 'Types & Comptime',
		task: 'Implement the monomorphizer\'s bookkeeping — Instantiate (first-use-order dedup) and InstantiationCount — plus the hand-stamped MaxInt/MaxStr pair.',

		prose: [
			'<h2>comptime Generics</h2>' +
			'<p>Zig has no <code>generic</code> keyword, no type-parameter ' +
			'brackets, no constraint language. It has functions — because with ' +
			'<code>comptime</code>, a function can take a <em>type</em> as a ' +
			'parameter and <strong>return a type</strong> as its result. The ' +
			'standard library\'s ArrayList is nothing more than that:</p>',
			{ lang: 'txt', code: 'fn ArrayList(comptime T: type) type {\n    return struct {\n        items: []T = &.{},\n        len: usize = 0,\n        pub fn append(self: *@This(), gpa: Allocator, v: T) !void { ... }\n    };\n}\n\nvar bytes = ArrayList(u8){};    // instantiation #1: a REAL type, stamped now\nvar ints  = ArrayList(i32){};   // #2 — shares NO code with #1 at runtime\nvar more  = ArrayList(i32){};   // same T: REUSES stamp #2, no new code\n\nfn max(comptime T: type, xs: []const T) T { ... }   // duck-typed: body uses >\n// max(Point, ...) where Point has no > : compile error AT INSTANTIATION' },
			'<p>Three consequences, each one a design decision Go made ' +
			'differently:</p>' +
			'<ul>' +
			'<li><strong>Each distinct <code>T</code> stamps a separate ' +
			'concrete type at compile time</strong> — monomorphization. ' +
			'<code>ArrayList(u8)</code> and <code>ArrayList(i32)</code> share ' +
			'no code at runtime; calling <code>append</code> on either is a ' +
			'direct, inlinable call that knows its element size to the byte. ' +
			'Binary size is the tax, zero-cost dispatch is the win.</li>' +
			'<li><strong>Repeats reuse.</strong> The compiler memoizes on the ' +
			'comptime arguments: a thousand <code>ArrayList(i32)</code> call ' +
			'sites cost one stamp. The bookkeeping you will implement — a ' +
			'seen-set keyed by <code>Generic(TypeArg)</code> — is that ' +
			'memo table.</li>' +
			'<li><strong>Constraints are duck-typed at instantiation.</strong> ' +
			'The body of <code>max</code> uses <code>&gt;</code>; hand it a ' +
			'type without <code>&gt;</code> and the error fires when that ' +
			'concrete stamp is type-checked — no separate constraint grammar, ' +
			'at the price of errors that point into the template.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the monomorphizer\'s ledger over a call log: ' +
			'<code>Instantiate</code> returns the deduped stamped symbols in ' +
			'<strong>first-use order</strong>, and ' +
			'<code>InstantiationCount</code> maps each generic to its number ' +
			'of distinct type args. Then write the contrast pair by hand: ' +
			'<code>MaxInt</code> and <code>MaxStr</code> — identical logic, ' +
			'twice — which is exactly what a single Zig ' +
			'<code>fn max(comptime T: type, xs: []const T) T</code> generates ' +
			'for free, one stamp per <code>T</code> it meets.</p>',
		],

		starter: [
			'package main',
			'',
			'// Call records one use of a generic at a call site: Generic is the',
			'// template\'s name ("ArrayList"), TypeArg the comptime type argument',
			'// it was handed ("i32").',
			'type Call struct {',
			'	Generic string',
			'	TypeArg string',
			'}',
			'',
			'// Instantiate replays the call log the way the compiler\'s',
			'// monomorphizer does: each call stamps the symbol',
			'// "Generic(TypeArg)" UNLESS that exact symbol was already stamped —',
			'// repeats reuse the first instantiation. Returns the deduped',
			'// symbols in FIRST-USE order. No calls -> an empty (or nil) slice.',
			'func Instantiate(calls []Call) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// InstantiationCount reports, per generic name, how many DISTINCT',
			'// type args it was instantiated with — i.e. how many concrete',
			'// copies of its code end up in the binary. Repeated (Generic,',
			'// TypeArg) pairs count once. Generics never called do not appear.',
			'func InstantiationCount(calls []Call) map[string]int {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// MaxInt returns the largest value in xs, or the error "empty" for',
			'// an empty slice. One half of the hand-monomorphized pair that a',
			'// Zig `fn max(comptime T: type, xs: []const T) T` stamps for free.',
			'func MaxInt(xs []int) (int, error) {',
			'	// your code here',
			'	return 0, nil',
			'}',
			'',
			'// MaxStr is the other stamp: identical logic over strings (Go\'s <',
			'// and > compare strings lexicographically, byte-wise). Same error',
			'// contract: "empty" for an empty slice.',
			'func MaxStr(xs []string) (string, error) {',
			'	// your code here',
			'	return "", nil',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"sort"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// A call log exercising both forces: repeats (dedupe) and',
			'	// distinct type args (multiply). Shared by several cases.',
			'	log := []Call{',
			'		{Generic: "ArrayList", TypeArg: "i32"},',
			'		{Generic: "ArrayList", TypeArg: "u8"},',
			'		{Generic: "HashMap", TypeArg: "i32"},',
			'		{Generic: "ArrayList", TypeArg: "i32"}, // repeat: reuses stamp #1',
			'		{Generic: "HashMap", TypeArg: "u8"},',
			'	}',
			'',
			'	// show joins stamped symbols; the empty ledger gets an explicit',
			'	// marker so nil vs [] cannot hide.',
			'	show := func(xs []string) string {',
			'		if len(xs) == 0 {',
			'			return "(none)"',
			'		}',
			'		return strings.Join(xs, "; ")',
			'	}',
			'	// counts renders the map deterministically: sorted keys, k=v',
			'	// pairs — Go map iteration order is random on purpose, so the',
			'	// harness imposes an order before comparing.',
			'	counts := func(m map[string]int) string {',
			'		if len(m) == 0 {',
			'			return "(none)"',
			'		}',
			'		keys := make([]string, 0, len(m))',
			'		for k := range m {',
			'			keys = append(keys, k)',
			'		}',
			'		sort.Strings(keys)',
			'		parts := make([]string, 0, len(keys))',
			'		for _, k := range keys {',
			'			parts = append(parts, fmt.Sprintf("%s=%d", k, m[k]))',
			'		}',
			'		return strings.Join(parts, " ")',
			'	}',
			'	// mi / ms render the (value, error) pairs as one column.',
			'	mi := func(v int, err error) string {',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return fmt.Sprintf("%d", v)',
			'	}',
			'	ms := func(v string, err error) string {',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return v',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"Instantiate: first-use order, repeat ArrayList(i32) reuses stamp #1",',
			'			"ArrayList(i32); ArrayList(u8); HashMap(i32); HashMap(u8)",',
			'			func() string { return show(Instantiate(log)) }},',
			'		{"Instantiate: three textual calls, ONE distinct T — one stamp in the binary",',
			'			"Box(f64)",',
			'			func() string {',
			'				return show(Instantiate([]Call{{Generic: "Box", TypeArg: "f64"}, {Generic: "Box", TypeArg: "f64"}, {Generic: "Box", TypeArg: "f64"}}))',
			'			}},',
			'		{"Instantiate: empty log — unused generic code costs nothing",',
			'			"(none)",',
			'			func() string { return show(Instantiate(nil)) }},',
			'		{"InstantiationCount: distinct type args per generic (sorted for determinism)",',
			'			"ArrayList=2 HashMap=2",',
			'			func() string { return counts(InstantiationCount(log)) }},',
			'		{"InstantiationCount: repeats collapse — Box counts 1, not 3",',
			'			"Box=1",',
			'			func() string {',
			'				return counts(InstantiationCount([]Call{{Generic: "Box", TypeArg: "f64"}, {Generic: "Box", TypeArg: "f64"}, {Generic: "Box", TypeArg: "f64"}}))',
			'			}},',
			'		{"MaxInt: the int stamp — largest wins, duplicates harmless",',
			'			"9",',
			'			func() string { return mi(MaxInt([]int{3, 9, 4, 9})) }},',
			'		{"MaxInt: all-negative input — max must not default to 0",',
			'			"-2",',
			'			func() string { return mi(MaxInt([]int{-7, -2, -19})) }},',
			'		{"MaxInt: empty slice — the \\"empty\\" error, not a zero value",',
			'			"error: empty",',
			'			func() string { return mi(MaxInt(nil)) }},',
			'		{"MaxStr: the string stamp — same logic, lexicographic >",',
			'			"zig",',
			'			func() string { return ms(MaxStr([]string{"pear", "apple", "zig"})) }},',
			'		{"MaxStr: empty slice — identical error contract across stamps",',
			'			"error: empty",',
			'			func() string { return ms(MaxStr(nil)) }},',
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
			'// Call records one use of a generic at a call site: Generic is the',
			'// template\'s name ("ArrayList"), TypeArg the comptime type argument',
			'// it was handed ("i32").',
			'type Call struct {',
			'	Generic string',
			'	TypeArg string',
			'}',
			'',
			'// Instantiate is the monomorphizer\'s memo table in miniature. The',
			'// seen-set carries the dedup; the slice carries the order — kept',
			'// separately because Go maps deliberately do not preserve insertion',
			'// order, and "first-use order" is exactly the order a compiler',
			'// discovers instantiations while walking the program.',
			'func Instantiate(calls []Call) []string {',
			'	seen := map[string]bool{}',
			'	stamps := []string{}',
			'	for _, c := range calls {',
			'		// The symbol IS the memo key: a generic\'s identity under',
			'		// monomorphization is (template, comptime args) — nothing',
			'		// about the call site survives into the stamped code.',
			'		sym := c.Generic + "(" + c.TypeArg + ")"',
			'		if seen[sym] {',
			'			continue // reuse: a thousand repeats cost zero new code',
			'		}',
			'		seen[sym] = true',
			'		stamps = append(stamps, sym)',
			'	}',
			'	return stamps',
			'}',
			'',
			'// InstantiationCount answers the binary-size question: how many',
			'// concrete copies of each template got compiled? Dedup by full',
			'// symbol first (repeats are free), then attribute each DISTINCT',
			'// stamp to its generic — the count a build engineer stares at when',
			'// a template-heavy binary balloons.',
			'func InstantiationCount(calls []Call) map[string]int {',
			'	seen := map[string]bool{}',
			'	perGeneric := map[string]int{}',
			'	for _, c := range calls {',
			'		sym := c.Generic + "(" + c.TypeArg + ")"',
			'		if seen[sym] {',
			'			continue',
			'		}',
			'		seen[sym] = true',
			'		perGeneric[c.Generic]++',
			'	}',
			'	return perGeneric',
			'}',
			'',
			'// MaxInt is stamp #1 of the hand-monomorphized pair. Seeding best',
			'// from xs[0] — not from 0 — is what makes all-negative input work;',
			'// the empty check above it is what makes the seed safe. Zig\'s',
			'// generic max has the same two lines, written once for every T.',
			'func MaxInt(xs []int) (int, error) {',
			'	if len(xs) == 0 {',
			'		return 0, errors.New("empty")',
			'	}',
			'	best := xs[0]',
			'	for _, x := range xs[1:] {',
			'		if x > best {',
			'			best = x',
			'		}',
			'	}',
			'	return best, nil',
			'}',
			'',
			'// MaxStr is stamp #2: the SAME algorithm with > resolved to',
			'// lexicographic byte-wise string comparison instead of integer',
			'// comparison. The duplication is deliberate and is the whole',
			'// argument: one comptime template would have emitted both bodies —',
			'// each as direct and inlinable as these — from a single source of',
			'// truth.',
			'func MaxStr(xs []string) (string, error) {',
			'	if len(xs) == 0 {',
			'		return "", errors.New("empty")',
			'	}',
			'	best := xs[0]',
			'	for _, x := range xs[1:] {',
			'		if x > best {',
			'			best = x',
			'		}',
			'	}',
			'	return best, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Generics as a library, not a feature</h3>' +
			'<p>The deep move is that Zig added <em>nothing</em> to support ' +
			'generics: types are comptime values, functions can run at ' +
			'comptime, therefore functions from types to types exist — and a ' +
			'generic container is an ordinary function you call in a type ' +
			'position. Constraints, likewise, are not a grammar: the template ' +
			'body simply <em>uses</em> <code>T.lessThan</code> or ' +
			'<code>&gt;</code>, and the requirement is checked when a concrete ' +
			'stamp is type-checked (lazily — an arm of the template you never ' +
			'reach for a given <code>T</code> is never checked for it, C++ ' +
			'template-style). Compare the machinery other languages carry: ' +
			'Go\'s constraint interfaces and type sets, Rust\'s trait bounds ' +
			'and where-clauses, C++20 concepts. Zig\'s bet is that duck typing ' +
			'plus instantiation-time errors is a fair price for having no ' +
			'second language.</p>' +
			'<h3>Go picked the other corner — on purpose</h3>' +
			'<p>Your <code>seen</code> map models full monomorphization: one ' +
			'stamp per distinct type arg, as C++, Rust, and Zig do it. Go 1.18 ' +
			'chose <em>GC shape stenciling with dictionaries</em>: ' +
			'instantiations are grouped by memory shape — every pointer type ' +
			'shares one stamp — and a hidden dictionary argument carries the ' +
			'type-specific operations at runtime. So ' +
			'<code>Max[*A]</code> and <code>Max[*B]</code> share code where ' +
			'Zig would stamp twice, buying smaller binaries and faster builds ' +
			'at the cost of indirect calls the inliner sometimes cannot see ' +
			'through — the documented reason a hand-specialized Go function ' +
			'occasionally beats its generic twin. And before 1.18, Go\'s ' +
			'answer was your function pair, written by every team by hand — or ' +
			'<code>interface{}</code> plus runtime type assertions, paying ' +
			'boxing costs per element instead of per call.</p>' +
			'<h3>The tax is real; so is the audit</h3>' +
			'<p>Monomorphization\'s bill shows up in binary size and compile ' +
			'time — C++ debug builds drowning in template symbols made it ' +
			'famous, and it is why <code>cargo bloat</code> exists for Rust: ' +
			'that tool is essentially your <code>InstantiationCount</code> run ' +
			'over a real binary, listing which generics stamped how many ' +
			'copies. Zig\'s memoization (your <code>seen</code> set) keeps the ' +
			'bill proportional to distinct types, not call sites, and lazy ' +
			'analysis keeps unused templates free. When the tax still bites, ' +
			'the classic fix is manual de-generification: route the type-' +
			'independent core through one shared function and keep only a thin ' +
			'typed shell per <code>T</code> — which is, full circle, exactly ' +
			'the dictionary trick Go\'s compiler performs automatically.</p>',
		],
		complexity: { time: 'O(c) — one pass over the call log with O(1) map operations; Max* are O(n)', space: 'O(k) — the seen-set and output hold one entry per distinct stamp' },
	});
})();
