/* Tagged Unions & switch — Types & Comptime (Medium). Zig's union(enum)
 * is a value that IS exactly one variant, and switching over it must be
 * EXHAUSTIVE — add a variant and every switch that misses it fails to
 * compile. Go's interface + type switch slips missed cases to default
 * silently at runtime. The learner implements Area/Perimeter/Describe
 * over a tag-carrying struct, with an "unhandled variant" error standing
 * in for Zig's compile-time guarantee.
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// A tagged union: the tag selects exactly one payload arm; a variant
	// the switch forgot is a COMPILE error in Zig, not a runtime default.
	// Marker id namespaced (dgArrowZGTU) because every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="a union value routes through its tag into exactly one payload arm; a fourth forgotten arm is crossed out and labeled compile error in Zig">' +
		'<text x="20" y="24" class="lbl">one value, one live variant — and the switch must name every arm</text>' +
		// the union value with its tag selector
		'<rect x="30" y="44" width="130" height="110" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="95" y="70" text-anchor="middle">union(enum)</text>' +
		'<rect x="48" y="84" width="94" height="30" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="95" y="104" text-anchor="middle">tag</text>' +
		'<text x="95" y="142" text-anchor="middle" class="lbl">payload bytes</text>' +
		// three handled arms
		'<rect x="330" y="38" width="160" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="410" y="58" text-anchor="middle">.circle =&gt; |r|</text>' +
		'<rect x="330" y="76" width="160" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="410" y="96" text-anchor="middle">.rect =&gt; |rc|</text>' +
		'<rect x="330" y="114" width="160" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="410" y="134" text-anchor="middle">.point =&gt; 0</text>' +
		// the forgotten arm, crossed out
		'<rect x="330" y="158" width="160" height="30" rx="5" fill="none" stroke="var(--warn)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<text x="410" y="178" text-anchor="middle" class="lbl">.triangle =&gt; ???</text>' +
		'<path d="M 336 162 L 484 184 M 484 162 L 336 184" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="322" y="204" text-anchor="end" class="lbl" style="fill:var(--warn)">forgotten arm = compile error in Zig</text>' +
		// tag routing into the live arm
		'<path d="M 146 99 C 240 99 240 91 324 91" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowZGTU)"/>' +
		'<text x="235" y="80" text-anchor="middle" class="lbl">tag routes to ONE arm</text>' +
		'<defs><marker id="dgArrowZGTU" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'tagged-unions-switch',
		title: 'Tagged Unions & switch',
		nav: 'tagged unions',
		difficulty: 'Medium',
		category: 'Types & Comptime',
		task: 'Implement Area, Perimeter, and Describe over a tagged Shape — with an "unhandled variant" error standing in for Zig\'s compile-time exhaustiveness.',

		prose: [
			'<h2>Tagged Unions &amp; switch</h2>' +
			'<p>Your team adds a <code>Refund</code> event to a Go payment ' +
			'system. The compiler is silent. Three weeks later someone notices ' +
			'refunds have been falling into the <code>default:</code> arm of a ' +
			'type switch in the ledger — logged, dropped, unbilled. Nothing ' +
			'told you which of the eleven type switches in the codebase needed ' +
			'a new case; that is what <code>grep</code> and production ' +
			'incidents are for. Zig makes this whole failure class a ' +
			'<em>compile error</em>. Its sum type is the tagged union:</p>',
			{ lang: 'txt', code: 'const Shape = union(enum) {\n    circle: f64,   // payload: the radius\n    rect: Rect,    // payload: a struct\n    point: void,   // no payload at all\n};\n\nfn area(s: Shape) f64 {\n    return switch (s) {\n        .circle => |r| std.math.pi * r * r,   // |r| captures the payload\n        .rect => |rc| rc.w * rc.h,\n        .point => 0,\n    };\n}\n\n// Now add `triangle: Tri` to Shape. EVERY switch that misses it:\n// error: switch must handle all possibilities\n//     note: unhandled enumeration value: \'triangle\'' },
			'<p>Three properties do the work, and the last one is the ' +
			'headline:</p>' +
			'<ul>' +
			'<li><strong>A value IS exactly one variant.</strong> The union ' +
			'stores one payload plus a tag saying which; the tag is queryable ' +
			'and the compiler will not let you read <code>.circle</code> while ' +
			'the tag says <code>.rect</code> (safe builds panic).</li>' +
			'<li><strong>switch captures the payload.</strong> ' +
			'<code>.circle =&gt; |r|</code> binds the radius with the correct ' +
			'type — no assertion, no cast, because matching the tag ' +
			'<em>proves</em> the payload type.</li>' +
			'<li><strong>switch must be exhaustive.</strong> Add a variant and ' +
			'every switch that misses it <strong>fails to compile</strong>. ' +
			'The compiler hands you the complete list of code to update. In Go, ' +
			'adding a type to an interface-based sum updates nothing — missed ' +
			'type switches slide into <code>default</code> silently, at ' +
			'runtime, in production.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Model the union as <code>Shape{Tag, A, B}</code> — tag ' +
			'<code>"circle"</code> uses <code>A</code> as the radius, ' +
			'<code>"rect"</code> uses <code>A×B</code>, <code>"point"</code> ' +
			'carries no payload. Implement <code>Area</code> and ' +
			'<code>Perimeter</code>, which return the error ' +
			'<code>unhandled variant: &lt;tag&gt;</code> for unknown tags — a ' +
			'runtime stand-in for Zig\'s compile-time exhaustiveness — and ' +
			'<code>Describe</code>, whose contract instead <em>absorbs</em> ' +
			'unknowns as <code>unknown(&lt;tag&gt;)</code>. (Zig has a teaser ' +
			'for that too: <code>inline else =&gt; |v|</code> generates the ' +
			'remaining arms at compile time, one per variant, each with its ' +
			'concrete payload type.)</p>',
		],

		starter: [
			'package main',
			'',
			'// Shape is the Go stand-in for Zig\'s union(enum): Tag names the live',
			'// variant, A and B are the payload slots it may use.',
			'//',
			'//   Tag "circle" — A is the radius, B unused',
			'//   Tag "rect"   — A and B are the side lengths',
			'//   Tag "point"  — no payload at all',
			'//',
			'// Unlike Zig\'s union, nothing here stops a caller from inventing a',
			'// Tag the switches never heard of — which is exactly the hole the',
			'// error contracts below paper over at runtime.',
			'type Shape struct {',
			'	Tag  string',
			'	A, B float64',
			'}',
			'',
			'// Area returns the shape\'s area: circle -> pi*A*A (use math.Pi),',
			'// rect -> A*B, point -> 0. Any other tag returns 0 and the error',
			'// "unhandled variant: <tag>" — the runtime stand-in for the compile',
			'// error Zig would have raised at the switch.',
			'func Area(s Shape) (float64, error) {',
			'	// your code here',
			'	return 0, nil',
			'}',
			'',
			'// Perimeter returns the boundary length: circle -> 2*pi*A,',
			'// rect -> 2*(A+B), point -> 0. Same error contract as Area:',
			'// "unhandled variant: <tag>" for anything else.',
			'func Perimeter(s Shape) (float64, error) {',
			'	// your code here',
			'	return 0, nil',
			'}',
			'',
			'// Describe formats the shape like Zig\'s switch-with-capture would:',
			'//',
			'//   circle -> "circle(r=2)"   (radius via %g)',
			'//   rect   -> "rect(3x4)"     (sides via %g)',
			'//   point  -> "point"',
			'//   other  -> "unknown(<tag>)"',
			'//',
			'// Note the contract difference: Describe ABSORBS unknown tags into a',
			'// string, while Area/Perimeter refuse them with an error.',
			'func Describe(s Shape) string {',
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
			'	// fv renders a (value, error) pair as one comparable string:',
			'	// errors and %.4f values share the got/want column.',
			'	fv := func(v float64, err error) string {',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return fmt.Sprintf("%.4f", v)',
			'	}',
			'',
			'	circle := Shape{Tag: "circle", A: 2.5}',
			'	rect := Shape{Tag: "rect", A: 3, B: 4}',
			'	point := Shape{Tag: "point"}',
			'	// The variant every switch "forgot" — Zig would have refused to',
			'	// compile; here it must surface at runtime instead.',
			'	triangle := Shape{Tag: "triangle", A: 3, B: 4}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"Area(circle r=2.5): pi*r^2 via math.Pi — the |r| capture arm",',
			'			"19.6350",',
			'			func() string { return fv(Area(circle)) }},',
			'		{"Area(rect 3x4): A*B",',
			'			"12.0000",',
			'			func() string { return fv(Area(rect)) }},',
			'		{"Area(point): the void variant — no payload, zero area",',
			'			"0.0000",',
			'			func() string { return fv(Area(point)) }},',
			'		{"Perimeter(circle r=2.5): 2*pi*r",',
			'			"15.7080",',
			'			func() string { return fv(Perimeter(circle)) }},',
			'		{"Perimeter(rect 3x4): 2*(A+B)",',
			'			"14.0000",',
			'			func() string { return fv(Perimeter(rect)) }},',
			'		{"Perimeter(point): zero, and no error",',
			'			"0.0000",',
			'			func() string { return fv(Perimeter(point)) }},',
			'		{"Describe(circle r=2): payload capture formatted with %g",',
			'			"circle(r=2)",',
			'			func() string { return Describe(Shape{Tag: "circle", A: 2}) }},',
			'		{"Describe(rect 3x4) and Describe(point): each arm has its own shape",',
			'			"rect(3x4) point",',
			'			func() string { return Describe(rect) + " " + Describe(point) }},',
			'		{"Area(triangle): the forgotten variant errors — Zig would not have compiled",',
			'			"error: unhandled variant: triangle",',
			'			func() string { return fv(Area(triangle)) }},',
			'		{"Perimeter(triangle): same refusal contract as Area",',
			'			"error: unhandled variant: triangle",',
			'			func() string { return fv(Perimeter(triangle)) }},',
			'		{"Describe(triangle): a DIFFERENT contract — absorbs the unknown into a string",',
			'			"unknown(triangle)",',
			'			func() string { return Describe(triangle) }},',
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
			'import (',
			'	"fmt"',
			'	"math"',
			')',
			'',
			'// Shape is the Go stand-in for Zig\'s union(enum): Tag names the live',
			'// variant, A and B are the payload slots it may use.',
			'//',
			'//   Tag "circle" — A is the radius, B unused',
			'//   Tag "rect"   — A and B are the side lengths',
			'//   Tag "point"  — no payload at all',
			'//',
			'// Zig would give each variant its own typed payload and make the',
			'// pairing unforgeable; flattening into A/B is the honest cost of',
			'// modeling a sum type in a language that only has products.',
			'type Shape struct {',
			'	Tag  string',
			'	A, B float64',
			'}',
			'',
			'// Area switches on the tag exactly as Zig\'s switch does on the union',
			'// — except nothing checks that the arm list is complete. The default',
			'// arm is the entire difference between the languages: Zig deletes it',
			'// by construction (a missed variant cannot compile), so hitting it',
			'// here is the runtime echo of a compile error Zig would have raised.',
			'func Area(s Shape) (float64, error) {',
			'	switch s.Tag {',
			'	case "circle":',
			'		return math.Pi * s.A * s.A, nil',
			'	case "rect":',
			'		return s.A * s.B, nil',
			'	case "point":',
			'		// The void variant: an explicit arm, not a fall-through to',
			'		// default — point is HANDLED, with a zero payload.',
			'		return 0, nil',
			'	default:',
			'		return 0, fmt.Errorf("unhandled variant: %s", s.Tag)',
			'	}',
			'}',
			'',
			'// Perimeter mirrors Area\'s arm list — and that duplication is itself',
			'// the lesson: every function switching on the sum must be found and',
			'// extended when a variant is added. Zig\'s compiler produces that',
			'// list mechanically; here it is a grep and a prayer.',
			'func Perimeter(s Shape) (float64, error) {',
			'	switch s.Tag {',
			'	case "circle":',
			'		return 2 * math.Pi * s.A, nil',
			'	case "rect":',
			'		return 2 * (s.A + s.B), nil',
			'	case "point":',
			'		return 0, nil',
			'	default:',
			'		return 0, fmt.Errorf("unhandled variant: %s", s.Tag)',
			'	}',
			'}',
			'',
			'// Describe plays the role of switch-with-capture: each arm formats',
			'// its own payload shape (%g keeps 2.0 as "2" and 2.5 as "2.5", the',
			'// way a person writes a radius). The default arm here is a',
			'// deliberate ABSORB contract — total functions like formatters',
			'// prefer a lossy string to an error return, while computations like',
			'// Area must refuse. Choosing which contract a function gets is the',
			'// design decision Zig forces you to make per switch.',
			'func Describe(s Shape) string {',
			'	switch s.Tag {',
			'	case "circle":',
			'		return fmt.Sprintf("circle(r=%g)", s.A)',
			'	case "rect":',
			'		return fmt.Sprintf("rect(%gx%g)", s.A, s.B)',
			'	case "point":',
			'		return "point"',
			'	default:',
			'		return fmt.Sprintf("unknown(%s)", s.Tag)',
			'	}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Sum types are the feature Go keeps almost adding</h3>' +
			'<p>A tagged union is a <em>sum</em> type: the value space is ' +
			'circle <em>plus</em> rect <em>plus</em> point, versus a struct\'s ' +
			'<em>product</em>. Go proposals for sum types date back to 2016 ' +
			'(issue #19412 is among the most-upvoted in the repo) and keep ' +
			'stalling on interactions with zero values and interfaces. So Go ' +
			'idiom approximates: a sealed interface with an unexported method, ' +
			'plus type switches — and the hole you just modeled, where a new ' +
			'variant compiles cleanly against every existing switch and fails ' +
			'only in production. The standard mitigation is a linter: the ' +
			'<code>exhaustive</code> analyzer re-creates at lint time what ' +
			'Zig\'s compiler guarantees natively — a bolted-on exhaustiveness ' +
			'proof, opt-in and easily skipped in CI.</p>' +
			'<h3>What the tag costs, and what safe builds do with it</h3>' +
			'<p>In memory a <code>union(enum)</code> is ' +
			'<code>max(payload sizes)</code> bytes plus a small integer tag ' +
			'(Zig even lets you pick its width: <code>union(enum(u8))</code>). ' +
			'In <code>Debug</code> and <code>ReleaseSafe</code> builds, ' +
			'reading the wrong field — <code>s.circle</code> while the tag ' +
			'says <code>.rect</code> — panics with "access of inactive union ' +
			'field"; in <code>ReleaseFast</code> the check compiles away and ' +
			'you are holding C\'s raw union. Zig also offers the bare ' +
			'<code>union</code> with no tag at all for exactly-C layouts. The ' +
			'spectrum is the point: you choose how much checking to pay for, ' +
			'but the <em>default</em> is the checked one.</p>' +
			'<h3>inline else: exhaustiveness meets comptime</h3>' +
			'<p>The teaser from the prose deserves its punchline. ' +
			'<code>inline else =&gt; |v|</code> in a Zig switch asks the ' +
			'compiler to <em>generate</em> the remaining arms, one per ' +
			'variant, each specialized to its concrete payload type — one ' +
			'generic arm body, stamped per variant, with the exhaustiveness ' +
			'guarantee intact: add a variant and the generated arm set ' +
			'silently grows to cover it. It is the two halves of this track\'s ' +
			'Types &amp; Comptime section meeting in one construct — sum types ' +
			'checked at compile time, code generated at compile time. Your ' +
			'<code>Describe</code> wrote those arms by hand; the next two ' +
			'problems build the machinery that writes them for you.</p>',
		],
		complexity: { time: 'O(1) — a tag compare and a couple of multiplies per call', space: 'O(1)' },
	});
})();
