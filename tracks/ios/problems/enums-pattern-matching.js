/* Enums, Associated Values & Exhaustive switch — Swift: Types & Optionals
 * (Medium). A Swift enum is a closed sum type: each case can carry its own
 * payload, and `switch` refuses to compile until every case is handled. The
 * learner implements both halves of the machinery: the compiler's
 * exhaustiveness check (MissingCases — missing case names in declaration
 * order, the `switch must be exhaustive` error as code) and the runtime's
 * first-match-wins pattern walk (Match — case tests, `where` guards that fall
 * through on failure, and the `_` wildcard). Pinned: adding one enum case
 * flips a previously-exhaustive switch to missing exactly that case.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// First-match-wins with a where guard: the value walks the pattern list
	// top-down; a case hit with a FAILED guard keeps falling — the guard
	// rejects one row, not the whole switch. Marker ids namespaced
	// (dgArrowIOSEP*) because every track's SVGs share the page's id
	// namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 216" width="560" height="216" role="img" aria-label="matching circle(radius 5) against a pattern list: the first row matches the case but its where guard fails, so evaluation falls through; the second row is a different case; the third row matches">' +
		'<text x="20" y="24" class="lbl">.circle(radius: 5) walks the switch top-down — first pattern that fully matches wins</text>' +
		'<rect x="60" y="40" width="300" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="210" y="63" text-anchor="middle">0: case .circle(let r) where r &gt; 10</text>' +
		'<text x="392" y="63" class="lbl" style="fill:var(--warn)">case ✓ guard ✗ — fall through</text>' +
		'<rect x="60" y="96" width="300" height="36" rx="5" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="210" y="119" text-anchor="middle">1: case .rect(let w, let h)</text>' +
		'<text x="392" y="119" class="lbl">case ✗ — fall through</text>' +
		'<rect x="60" y="152" width="300" height="36" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="210" y="175" text-anchor="middle">2: case .circle(let r)</text>' +
		'<text x="404" y="175" class="lbl" style="fill:var(--ok)">case ✓ no guard — MATCH: 2</text>' +
		'<path d="M 44 58 C 28 70 28 90 44 110" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowIOSEPw)"/>' +
		'<path d="M 44 114 C 28 126 28 146 44 166" fill="none" stroke="var(--muted)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowIOSEP)"/>' +
		'<text x="20" y="210" class="lbl">a where guard rejects ONE row — later rows still get their chance (no implicit fallthrough of bodies, only of failed matches)</text>' +
		'<defs>' +
		'<marker id="dgArrowIOSEP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker>' +
		'<marker id="dgArrowIOSEPw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'enums-pattern-matching',
		title: 'Enums, Associated Values & Exhaustive switch',
		nav: 'enums pattern matching',
		difficulty: 'Medium',
		category: 'Swift: Types & Optionals',
		task: 'Implement Swift\'s switch machinery over an enum with associated values: MissingCases (the exhaustiveness check, missing cases in declaration order) and Match (first-match-wins with where guards and the _ wildcard).',

		prose: [
			'<h2>Enums, Associated Values &amp; Exhaustive <code>switch</code></h2>' +
			'<p>Sprint review. Design wants dashed lines on the chart screen, so ' +
			'you add one case to the drawing model — and the build fails in five ' +
			'files, each one a <code>switch</code> that renders, measures, or ' +
			'serializes shapes. This is the single best reason Swift codebases ' +
			'model their domains as enums:</p>',
			{ lang: 'swift', code: 'enum Shape {\n    case circle(radius: Int)\n    case rect(w: Int, h: Int)\n    case line(length: Int)\n}\n\nfunc describe(_ s: Shape) -> String {\n    switch s {\n    case .circle(let r):       return "circle r=\\(r)"\n    case .rect(let w, let h):  return "rect \\(w)x\\(h)"\n    }\n}\n// error: switch must be exhaustive\n// note: add missing case: \'.line(length:)\'' },
			'<p>Two features are stacked here, and this problem implements both:</p>' +
			'<ul>' +
			'<li><strong>Associated values make an enum a sum type.</strong> Each ' +
			'case carries its own payload — a circle has a radius, a rect has two ' +
			'sides — and the only way to reach the payload is to pattern-match the ' +
			'case, so you can never read a radius off a rect. (You have already ' +
			'met the most famous example: <code>Optional</code> is exactly ' +
			'<code>case none</code> / <code>case some(Wrapped)</code>.)</li>' +
			'<li><strong>The case list is closed, so <code>switch</code> is ' +
			'checked.</strong> The compiler holds the complete list and demands a ' +
			'pattern for every case. Forgetting one is not a warning, it is the ' +
			'error above — which means adding <code>case dashed(length: Int)</code> ' +
			'next sprint turns <em>every</em> switch you forgot into a build ' +
			'failure. The compiler performs the whole-codebase search you would ' +
			'otherwise do with grep and hope.</li>' +
			'</ul>' +
			'<h3>How a switch actually evaluates</h3>' +
			'<p>At runtime a <code>switch</code> is a first-match-wins walk down ' +
			'the pattern list:</p>',
			{ lang: 'swift', code: 'switch s {\ncase .circle(let r) where r > 10: print("big circle")   // guard can reject\ncase .rect(let w, let h) where w == h: print("square")\ncase .circle:                     print("small circle") // catches r <= 10\ncase _:                           print("anything else") // wildcard: matches all\n}' },
			'<ul>' +
			'<li>A pattern matches when its <strong>case</strong> matches and its ' +
			'<code>where</code> guard (if any) passes on the associated values.</li>' +
			'<li>A failed <code>where</code> rejects <em>that row only</em> — ' +
			'evaluation falls through to later patterns. ' +
			'<code>.circle(radius:&nbsp;5)</code> above skips row one and lands on ' +
			'“small circle”.</li>' +
			'<li><code>_</code> matches anything, like <code>default</code> — and ' +
			'like <code>default</code> it silently opts the switch out of ' +
			'next-sprint exhaustiveness errors, which is why style guides ban it ' +
			'on enums you own.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement both halves over the modeled <code>Shape</code> in the ' +
			'starter. <code>MissingCases(declared, handled)</code> is the ' +
			'compiler\'s check: the declared case names not covered by ' +
			'<code>handled</code>, in declaration order (a literal ' +
			'<code>"default"</code> in <code>handled</code> covers everything). ' +
			'<code>Match(s, patterns)</code> is the runtime walk: the index of the ' +
			'first pattern whose case matches and whose guard passes, ' +
			'<code>-1</code> when nothing matches — a state a compiled Swift ' +
			'switch can never reach, precisely because <code>MissingCases</code> ' +
			'ran first.</p>' +
			'<div class="tip">One case you will meet in real SDK work: switching ' +
			'over a <em>non-frozen</em> system enum (say ' +
			'<code>UIUserInterfaceStyle</code>) — Apple may add cases in a future ' +
			'OS, so exhaustiveness today proves nothing about next year\'s ' +
			'runtime. Swift\'s answer is <code>@unknown default</code>: it covers ' +
			'like <code>default</code>, but the compiler still warns you ' +
			'case-by-case when the SDK grows. Our model treats it as ' +
			'<code>"default"</code> for coverage.</div>',
		],

		starter: [
			'package main',
			'',
			'// Shape models one VALUE of the enum: which case it is, plus that',
			'// case\'s associated values. Only the fields the case declares are',
			'// meaningful — a payload you can only reach by matching the case:',
			'//',
			'//	circle: A = radius        rect: A = w, B = h        line: A = length',
			'type Shape struct {',
			'	Case string // "circle" | "rect" | "line" (or a future case...)',
			'	A    int',
			'	B    int',
			'}',
			'',
			'// Pattern is one `case` row of a switch.',
			'//',
			'//	Case:  the case name to match, or "_" — the wildcard, matches any.',
			'//	Where: optional guard over the associated values (nil = no guard).',
			'//	       A guard that fails rejects THIS ROW ONLY — evaluation',
			'//	       falls through to later patterns.',
			'type Pattern struct {',
			'	Case  string',
			'	Where func(a, b int) bool',
			'}',
			'',
			'// MissingCases is the compiler\'s exhaustiveness check for a switch',
			'// over an enum whose cases are `declared` (in declaration order).',
			'// handled holds the switch\'s covered case names; the literal',
			'// "default" covers everything (as does @unknown default). Return the',
			'// declared cases not handled, in DECLARATION order — the compiler\'s',
			'// "add missing case" notes. Nothing missing: return nil.',
			'func MissingCases(declared []string, handled []string) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Match is the runtime walk: the index of the FIRST pattern that',
			'// fully matches s — case name equal (or "_"), and Where nil or true',
			'// on (s.A, s.B). A failed Where falls through to the next pattern.',
			'// No pattern matches: return -1 (unreachable in compiled Swift —',
			'// the exhaustiveness check above would have rejected the switch).',
			'func Match(s Shape, patterns []Pattern) int {',
			'	// your code here',
			'	return -1',
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
			'	// The prose enum, and the same enum one sprint later.',
			'	shape := []string{"circle", "rect", "line"}',
			'	shape2 := []string{"circle", "rect", "line", "dashed"}',
			'',
			'	// The prose switch: big circles, squares, small circles, wildcard.',
			'	proseSwitch := []Pattern{',
			'		{Case: "circle", Where: func(a, b int) bool { return a > 10 }},',
			'		{Case: "rect", Where: func(a, b int) bool { return a == b }},',
			'		{Case: "circle"},',
			'		{Case: "_"},',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"all three cases handled: exhaustive, nothing missing — the switch compiles",',
			'			"[]",',
			'			func() string { return fmt.Sprintf("%v", MissingCases(shape, []string{"circle", "rect", "line"})) }},',
			'		{"the prose\'s failing switch — swiftc: switch must be exhaustive; note: add missing case: \'.line(length:)\'",',
			'			"[line]",',
			'			func() string { return fmt.Sprintf("%v", MissingCases(shape, []string{"circle", "rect"})) }},',
			'		{"two cases missing: reported in DECLARATION order, not handled order",',
			'			"[circle line]",',
			'			func() string { return fmt.Sprintf("%v", MissingCases(shape, []string{"rect"})) }},',
			'		{"no cases handled at all: the whole declaration comes back",',
			'			"[circle rect line]",',
			'			func() string { return fmt.Sprintf("%v", MissingCases(shape, nil)) }},',
			'		{"default covers everything — one real case plus default is exhaustive (and opts out of future checking)",',
			'			"[]",',
			'			func() string { return fmt.Sprintf("%v", MissingCases(shape, []string{"circle", "default"})) }},',
			'		{"THE POINT OF CLOSED ENUMS: add dashed one sprint later and yesterday\'s exhaustive switch now misses exactly that case",',
			'			"[dashed]",',
			'			func() string { return fmt.Sprintf("%v", MissingCases(shape2, []string{"circle", "rect", "line"})) }},',
			'		{"first-match-wins: rect(3x4) skips the circle row and lands on the first rect pattern that accepts it",',
			'			"2",',
			'			func() string {',
			'				ps := []Pattern{',
			'					{Case: "circle"},',
			'					{Case: "rect", Where: func(a, b int) bool { return a == b }},',
			'					{Case: "rect"},',
			'				}',
			'				return fmt.Sprintf("%d", Match(Shape{Case: "rect", A: 3, B: 4}, ps))',
			'			}},',
			'		{"where guard passes: circle(20) with r > 10 stops at row 0 — later rows never consulted",',
			'			"0",',
			'			func() string { return fmt.Sprintf("%d", Match(Shape{Case: "circle", A: 20}, proseSwitch)) }},',
			'		{"where guard FAILS and falls through: circle(5) skips row 0 (case hit, guard miss) and matches the bare .circle at row 2",',
			'			"2",',
			'			func() string { return fmt.Sprintf("%d", Match(Shape{Case: "circle", A: 5}, proseSwitch)) }},',
			'		{"the square guard: rect(4x4) satisfies w == h at row 1; rect(4x3) falls through to the wildcard at row 3",',
			'			"1 3",',
			'			func() string {',
			'				return fmt.Sprintf("%d %d",',
			'					Match(Shape{Case: "rect", A: 4, B: 4}, proseSwitch),',
			'					Match(Shape{Case: "rect", A: 4, B: 3}, proseSwitch))',
			'			}},',
			'		{"the wildcard matches ANY case: line(9) matches no named row and lands on _ ",',
			'			"3",',
			'			func() string { return fmt.Sprintf("%d", Match(Shape{Case: "line", A: 9}, proseSwitch)) }},',
			'		{"no pattern matches: -1 — a state compiled Swift cannot reach, because exhaustiveness checking rejected this switch first",',
			'			"-1",',
			'			func() string {',
			'				ps := []Pattern{{Case: "circle", Where: func(a, b int) bool { return a > 10 }}}',
			'				return fmt.Sprintf("%d", Match(Shape{Case: "circle", A: 5}, ps))',
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
			'// Shape models one VALUE of the enum: which case it is, plus that',
			'// case\'s associated values (circle: A=radius, rect: A=w B=h,',
			'// line: A=length).',
			'type Shape struct {',
			'	Case string',
			'	A    int',
			'	B    int',
			'}',
			'',
			'// Pattern is one `case` row of a switch: a case name (or the "_"',
			'// wildcard) plus an optional where guard over the associated values.',
			'type Pattern struct {',
			'	Case  string',
			'	Where func(a, b int) bool',
			'}',
			'',
			'// MissingCases is the compiler\'s exhaustiveness check. The shape of',
			'// the algorithm IS the guarantee: we iterate `declared` (never the',
			'// handled set), so the report order is declaration order and the',
			'// output is deterministic — the same property that lets swiftc emit',
			'// stable "add missing case" fix-it notes.',
			'func MissingCases(declared []string, handled []string) []string {',
			'	set := map[string]bool{}',
			'	for _, h := range handled {',
			'		if h == "default" {',
			'			// default (and @unknown default) is the universal pattern:',
			'			// nothing can be missing. It also disables the very check',
			'			// this function performs for every FUTURE case — which is',
			'			// why style guides ban bare default on enums you own.',
			'			return nil',
			'		}',
			'		set[h] = true',
			'	}',
			'	missing := []string{}',
			'	for _, c := range declared {',
			'		if !set[c] {',
			'			missing = append(missing, c)',
			'		}',
			'	}',
			'	if len(missing) == 0 {',
			'		return nil',
			'	}',
			'	return missing',
			'}',
			'',
			'// Match is the runtime\'s first-match-wins walk. Two independent',
			'// tests per row, and the distinction matters:',
			'//',
			'//	1. the CASE test — does the value\'s tag match the pattern\'s?',
			'//	   ("_" matches every tag.) A miss here is ordinary: try the',
			'//	   next row.',
			'//	2. the WHERE guard — a predicate over the associated values,',
			'//	   consulted only after the case test passes. A guard failure',
			'//	   ALSO just falls through: it rejects this row, not the switch.',
			'//',
			'// That fall-through is the subtle pin: `case .circle(let r) where',
			'// r > 10` followed by `case .circle` is a legal and idiomatic way to',
			'// split one case into ranges — the second row catches exactly the',
			'// values the guard rejected. Swift bodies never fall through',
			'// (no C-style fallthrough by default); only failed MATCHES do.',
			'func Match(s Shape, patterns []Pattern) int {',
			'	for i, p := range patterns {',
			'		if p.Case != "_" && p.Case != s.Case {',
			'			continue // case test failed: next row',
			'		}',
			'		if p.Where != nil && !p.Where(s.A, s.B) {',
			'			continue // guard failed: reject THIS ROW ONLY, keep walking',
			'		}',
			'		return i // first full match wins — later rows never consulted',
			'	}',
			'	// Unreachable in compiled Swift: exhaustiveness checking (the',
			'	// function above) refuses to build a switch that can get here.',
			'	return -1',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What an enum with payloads actually is</h3>' +
			'<p>A Swift enum with associated values is a <em>tagged union</em>: one ' +
			'discriminant byte (the tag) plus storage big enough for the largest ' +
			'payload, overlaid. <code>Shape</code> is three types sharing one ' +
			'memory footprint, and the tag is why matching is both safe and fast — ' +
			'<code>switch</code> compiles to a jump on the tag, and the payload is ' +
			'only ever read through the case that proves which overlay is live. ' +
			'Your Go model makes the tag explicit (<code>Case</code>) and pays for ' +
			'it by carrying both fields always; Swift\'s layout optimizer overlays ' +
			'them, and can even hide the tag in spare bits (an ' +
			'<code>Optional&lt;SomeClass&gt;</code> is pointer-sized — ' +
			'<code>.none</code> is the null bit pattern the type system otherwise ' +
			'forbids).</p>' +
			'<h3>Exhaustiveness is a maintenance feature, not a correctness feature</h3>' +
			'<p>The harness\'s <code>dashed</code> case is the whole argument: the ' +
			'check\'s value is not that today\'s switch is complete, it is that ' +
			'<strong>next sprint\'s change cannot be silently incomplete</strong>. ' +
			'This is why the same design shows up as the backbone of most iOS ' +
			'architectures — a <code>ViewState</code> enum ' +
			'(<code>.loading</code> / <code>.loaded(items)</code> / ' +
			'<code>.failed(Error)</code>) rendered by one exhaustive switch, ' +
			'reducer actions in TCA, navigation routes. Adding a state recompiles ' +
			'into an error at every point that must now handle it.</p>' +
			'<ul>' +
			'<li><strong><code>default</code> is the anti-feature</strong> on enums ' +
			'you own: it makes today\'s switch compile and exempts it from every ' +
			'future check — the sprint-review scenario ships a chart that ' +
			'silently ignores dashed lines instead of failing the build.</li>' +
			'<li><strong><code>@unknown default</code> is the honest middle</strong> ' +
			'for enums you do <em>not</em> own. System enums are non-frozen ' +
			'(Apple adds cases across OS releases; your compiled app must survive ' +
			'them), so a plain exhaustive switch would be a lie. ' +
			'<code>@unknown default</code> runs like <code>default</code> at ' +
			'runtime but keeps the compile-time warning when the SDK grows — ' +
			'coverage without amnesia.</li>' +
			'<li><strong><code>where</code> is evaluation order made visible.</strong> ' +
			'Guards let one case fan out into ranges, and the fall-through-on-' +
			'failure rule is what makes the fan-out safe to reorder-check: each ' +
			'row is independent, first full match wins. The classic bug is ' +
			'writing the broad row first — <code>case .circle</code> above ' +
			'<code>case .circle where r &gt; 10</code> makes the guard row ' +
			'unreachable, and swiftc warns: <code>case is already handled by ' +
			'previous patterns</code>.</li>' +
			'</ul>' +
			'<h3>The Go mirror</h3>' +
			'<p>Go\'s closest tool is a <code>switch v := x.(type)</code> over an ' +
			'interface — but interface implementation is open by design, so the ' +
			'compiler cannot know you missed one, and every such switch needs the ' +
			'<code>default</code> Swift style guides ban. The Go community\'s ' +
			'workaround is this problem by hand: an unexported marker method to ' +
			'close the set, plus the <code>exhaustive</code> linter to simulate ' +
			'the check — and for payloads, a struct per case with the tag as a ' +
			'type. Swift builds the tag, the closed set, the checker, and the ' +
			'binding syntax into one keyword; <code>MissingCases</code> is that ' +
			'checker, and <code>Match</code> is the four instructions a switch ' +
			'lowers to.</p>',
		],
		complexity: { time: 'O(d + h) for MissingCases (one pass each); O(p) for Match — first full match short-circuits', space: 'O(h) for the handled set' },
	});
})();
