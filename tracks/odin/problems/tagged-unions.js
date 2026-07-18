/* Tagged Unions — Values & Types (Medium). Odin's union is a CLOSED sum
 * type: nil by default (ZII), exactly one live variant beside a hidden tag,
 * stored inline at the size of the largest variant. The learner implements
 * the storage-and-dispatch machine: Store replaces tag+payload atomically,
 * Dispatch models `switch v in u` including the nil case and the
 * exhaustiveness rule that makes an unhandled variant a compile error.
 */
(function () {
	'use strict';
	var T = GoLearnOdin;

	// Go's open interface vs Odin's closed union: pointer-pair indirection
	// vs one inline box sized for the largest variant plus a tag.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="a Go interface is an open pointer pair; an Odin union is a closed inline box of tag plus payload">' +
		'<text x="20" y="24" class="lbl">Go interface{} — open set, indirection</text>' +
		'<rect x="20" y="40" width="115" height="44" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="50" y="66" class="lbl">type</text>' +
		'<path d="M 78 62 L 135 62" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<rect x="20" y="94" width="115" height="44" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="50" y="120" class="lbl">data</text>' +
		'<path d="M 78 116 L 135 116" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<text x="145" y="66" style="fill:var(--err-fg)">→ any type, anywhere</text>' +
		'<text x="145" y="120" style="fill:var(--err-fg)">→ heap, usually</text>' +
		'<text x="20" y="168" class="lbl">any type may implement it later —</text>' +
		'<text x="20" y="186" class="lbl">the compiler can never list all cases</text>' +
		'<text x="330" y="24" class="lbl">Odin union — closed set, inline</text>' +
		'<rect x="330" y="40" width="80" height="98" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="370" y="94" text-anchor="middle" style="fill:var(--ok)">tag</text>' +
		'<rect x="418" y="40" width="102" height="98" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="469" y="86" text-anchor="middle" style="fill:var(--ok)">payload</text>' +
		'<text x="469" y="108" text-anchor="middle" class="lbl">size of largest</text>' +
		'<text x="469" y="124" text-anchor="middle" class="lbl">variant</text>' +
		'<text x="330" y="168" class="lbl">variants fixed at the declaration —</text>' +
		'<text x="330" y="186" class="lbl">known size, exhaustive switch, ZII nil</text>' +
		'</svg>';

	T.problem({
		id: 'tagged-unions',
		title: 'Tagged Unions',
		nav: 'tagged unions',
		difficulty: 'Medium',
		category: 'Values & Types',
		task: 'Implement Store and Dispatch — a union holds one variant beside a hidden tag; switch dispatches on it, with nil and exhaustiveness rules. All 7 tests.',

		prose: [
			'<h2>Tagged Unions</h2>' +
			'<p>Odin’s <code>union</code> is a value that is exactly one of a ' +
			'<em>fixed</em> list of types — plus the state it starts in, which by now ' +
			'you can guess:</p>',
			{ lang: 'odin', code: 'Circle :: struct { r: int }\nRect   :: struct { w: int }\nShape  :: union { Circle, Rect }\n\ns: Shape             // nil — ZII again: "no variant yet" is the zero state\ns = Circle{r = 5}    // tag + payload written together\ns = Rect{w = 7}      // REPLACES the Circle: tag flips, payload overwritten\n\nswitch v in s {\ncase Circle: fmt.println("circle", v.r)\ncase Rect:   fmt.println("rect", v.w)\ncase:        fmt.println("no shape")   // the nil case\n}' },
			'<p>Under the hood a union is one inline box: a hidden <strong>tag</strong> ' +
			'recording which variant is live, beside payload bytes sized for the ' +
			'<em>largest</em> variant. Assigning a variant rewrites tag and payload ' +
			'together; there is never a moment where the tag says ' +
			'<code>Circle</code> but the bytes are a <code>Rect</code>.</p>' +
			'<p>The Go reflex here is “so it’s an <code>interface{}</code>” — and the ' +
			'differences are the lesson. An interface is an <em>open</em> set: any type ' +
			'in any package can satisfy it later, so a type switch can never be proven ' +
			'complete, values live behind a pointer pair, and the zero interface panics ' +
			'the moment you call through it. A union is a <em>closed</em> set: the ' +
			'variants are fixed at the declaration, so the value has a known size and ' +
			'lives inline (in a struct field, in an array — no heap), and ' +
			'<code>switch v in s</code> must be <strong>exhaustive</strong> — handle ' +
			'every variant (plus nil) or the program does not compile, unless you ' +
			'explicitly opt out with <code>#partial switch</code>. Add a variant next ' +
			'year and the compiler walks you to every switch you forgot.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the union machine. <code>Store</code> is variant assignment: ' +
			'replace the tag <em>and</em> the payload. <code>Dispatch</code> is ' +
			'<code>switch v in u</code>: format the live tag’s handler string with the ' +
			'payload (<code>fmt.Sprintf</code>), route the nil union (tag ' +
			'<code>""</code>) to the <code>"nil"</code> handler, and return ' +
			'<code>"unhandled"</code> when no handler exists for the tag — the case ' +
			'Odin’s exhaustiveness check would have refused to compile.</p>',
			{ code: 'var u Union                       // ZII: Tag "", Payload 0 — the nil union\nDispatch(u, h)                    → h["nil"] formatted   (fresh union is nil)\nStore(&u, "Circle", 5)            // tag=Circle payload=5\nDispatch(u, h)                    → "circle r=5"\nStore(&u, "Rect", 7)              // REPLACES: tag=Rect payload=7\nDispatch(u, h)                    → "rect w=7"\nDispatch(u, handlersWithoutRect)  → "unhandled"          (would not compile)', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Union models Odin\'s union storage: a hidden tag naming the live',
			'// variant, beside one payload slot. Tag "" is the nil union — the',
			'// ZII default, meaning "no variant stored yet".',
			'type Union struct {',
			'	Tag     string',
			'	Payload int',
			'}',
			'',
			'// Store assigns a variant to the union: the previous tag AND payload',
			'// are both replaced — a union never holds two variants.',
			'func Store(u *Union, variant string, payload int) {',
			'	// your code here',
			'}',
			'',
			'// Dispatch models `switch v in u`. handlers maps a variant name to a',
			'// fmt format string for its payload:',
			'//   - live variant with a handler → fmt.Sprintf(handlers[tag], u.Payload)',
			'//   - nil union (Tag "")          → use handlers["nil"] instead',
			'//   - no handler for the tag      → "unhandled" (in Odin: a compile',
			'//     error — a plain switch over a union must be exhaustive)',
			'func Dispatch(u Union, handlers map[string]string) string {',
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
			'	// Full handler set (with a nil arm) and one missing the nil arm.',
			'	full := map[string]string{',
			'		"Circle": "circle r=%d",',
			'		"Rect":   "rect w=%d",',
			'		"nil":    "no shape (payload %d)",',
			'	}',
			'	noNil := map[string]string{"Circle": "circle r=%d", "Rect": "rect w=%d"}',
			'',
			'	type tc struct {',
			'		name     string',
			'		build    func() Union',
			'		handlers map[string]string',
			'		want     string',
			'	}',
			'	cases := []tc{',
			'		{"ZII: a fresh union is nil — payload zeroed too",',
			'			func() Union { var u Union; return u }, full, "no shape (payload 0)"},',
			'		{"Store Circle 5, switch runs the Circle arm",',
			'			func() Union { var u Union; Store(&u, "Circle", 5); return u }, full, "circle r=5"},',
			'		{"assigning Rect REPLACES the Circle: tag and payload flip together",',
			'			func() Union { var u Union; Store(&u, "Circle", 5); Store(&u, "Rect", 7); return u }, full, "rect w=7"},',
			'		{"re-storing the same variant overwrites the payload",',
			'			func() Union { var u Union; Store(&u, "Circle", 5); Store(&u, "Circle", 9); return u }, full, "circle r=9"},',
			'		{"nil union but no nil arm: unhandled (Odin: compile error)",',
			'			func() Union { var u Union; return u }, noNil, "unhandled"},',
			'		{"variant outside the handler set: unhandled (non-exhaustive)",',
			'			func() Union { var u Union; Store(&u, "Tri", 3); return u }, full, "unhandled"},',
			'		{"only the LIVE variant\'s arm runs, however many arms exist",',
			'			func() Union { var u Union; Store(&u, "Rect", 2); return u }, full, "rect w=2"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%q", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := Dispatch(c.build(), c.handlers)',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%q", got)',
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
			'// Union models Odin\'s union storage: a hidden tag naming the live',
			'// variant, beside one payload slot. Tag "" is the nil union — the',
			'// ZII default, meaning "no variant stored yet".',
			'type Union struct {',
			'	Tag     string',
			'	Payload int',
			'}',
			'',
			'// Store assigns a variant. Tag and payload are written together —',
			'// the pair is the invariant. Writing only one of them is how hand-',
			'// rolled tagged unions in C acquire their famous bugs (tag says',
			'// Circle, bytes are a Rect); making the pair a single assignment is',
			'// the entire safety story of a tagged union.',
			'func Store(u *Union, variant string, payload int) {',
			'	u.Tag = variant',
			'	u.Payload = payload',
			'}',
			'',
			'// Dispatch models `switch v in u`.',
			'//',
			'// Order of decisions mirrors the language:',
			'//   1. normalize nil — the zero union routes to the nil arm, so ZII',
			'//      "no variant yet" is an ordinary, handleable case, not a panic',
			'//      (contrast: calling through a nil Go interface).',
			'//   2. missing arm → "unhandled". In real Odin this branch cannot be',
			'//      reached at runtime: a plain switch over a union must cover',
			'//      every variant (and nil, when the union is nilable), or the',
			'//      program does not compile. The sentinel stands in for that',
			'//      compile-time refusal.',
			'//   3. one arm runs, with the payload — v in `switch v in u` is the',
			'//      payload already narrowed to the arm\'s type.',
			'func Dispatch(u Union, handlers map[string]string) string {',
			'	tag := u.Tag',
			'	if tag == "" {',
			'		tag = "nil" // the nil union is a case, not a crash',
			'	}',
			'	format, ok := handlers[tag]',
			'	if !ok {',
			'		return "unhandled" // Odin: refused at compile time',
			'	}',
			'	return fmt.Sprintf(format, u.Payload)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The tag-payload pair is the invariant</h3>' +
			'<p><code>Store</code> is two assignments, and that brevity is the point — ' +
			'they must always travel together:</p>',
			{ code: 'func Store(u *Union, variant string, payload int) {\n\tu.Tag = variant\n\tu.Payload = payload\n}' },
			'<p>C programmers hand-roll this with a <code>struct { enum tag; union ' +
			'{...} u; }</code> and no compiler help keeping the two fields coherent — ' +
			'read the union through the wrong member and you have silent memory ' +
			'reinterpretation. Odin makes variant assignment atomic at the language ' +
			'level: <code>s = Rect{w = 7}</code> is tag flip and payload write as one ' +
			'operation, and reads always go through the tag (<code>switch v in s</code>, ' +
			'or a checked assertion <code>s.(Circle)</code>).</p>' +
			'<h3>Closed beats open when you know the cases</h3>' +
			'<p>A Go type switch over an interface always needs a ' +
			'<code>default</code> arm, because the set of implementing types is open — ' +
			'the compiler cannot enumerate it even in principle. A union inverts that: ' +
			'the declaration <em>is</em> the enumeration, so the compiler rejects a ' +
			'plain <code>switch</code> that misses a variant (opt out per site with ' +
			'<code>#partial switch</code>). The practical consequence is the ' +
			'add-a-variant workflow: extend <code>Shape</code> with ' +
			'<code>Triangle</code> and every switch in the codebase becomes a compile ' +
			'error until it handles the new case. With interfaces, that same change ' +
			'ships silently and fails at runtime — the <code>"unhandled"</code> ' +
			'sentinel you just implemented is exactly the state Odin promises you ' +
			'never reach.</p>' +
			'<h3>ZII closes the loop</h3>' +
			'<p>The zero union being <em>nil</em> — and nil being a switchable case ' +
			'rather than a landmine — is the ZII lesson paying off: ' +
			'<code>Shape</code> fields in a zeroed struct, <code>Shape</code> elements ' +
			'in a fresh array, all start in a state your switch already handles. ' +
			'Size-wise, the union is <code>max(variant sizes) + tag</code>, inline: an ' +
			'<code>[1000]Shape</code> array is one contiguous allocation, where ' +
			'<code>[1000]interface{}</code> in Go is a thousand pointer pairs chasing ' +
			'heap boxes. Closed set → known size → value semantics: each property ' +
			'funds the next.</p>',
		],
		complexity: { time: 'O(1) — one map lookup and one format; real unions dispatch on an integer tag', space: 'O(1) — the union is one inline tag+payload box' },
	});
})();
