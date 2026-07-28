/* Packed Structs — Numbers & Layout (Hard). A Zig `packed struct` has a
 * GUARANTEED bit layout: each field occupies exactly its declared bit
 * width, the first field lives in the least significant bits, and the
 * whole struct is backed by an integer. Go's struct layout is unspecified
 * and bitfields don't exist, so the learner builds the compiler's half of
 * the feature: Pack (shift fields in), Unpack (mask them out), and
 * BitOffsets (where each field starts).
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// An RGB565 pixel as a packed struct: 16 bits, LSB drawn on the right
	// as in every datasheet, field 0 (r) in the LOWEST bits. Marker id
	// namespaced (dgArrowZGPS) — SVG ids share one page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 216" width="560" height="216" role="img" aria-label="a 16-bit RGB565 value drawn LSB on the right: b in bits 11-15, g in bits 5-10, r in bits 0-4; the first declared field occupies the lowest bits">' +
		'<text x="20" y="24" class="lbl">packed struct { r: u5, g: u6, b: u5 } — one u16, bit 0 on the right</text>' +
		// three field spans, MSB (b) on the left, LSB (r) on the right
		'<rect x="60" y="44" width="140" height="40" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="130" y="69" text-anchor="middle">b : u5</text>' +
		'<rect x="200" y="44" width="168" height="40" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="284" y="69" text-anchor="middle">g : u6</text>' +
		'<rect x="368" y="44" width="140" height="40" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="438" y="69" text-anchor="middle">r : u5</text>' +
		// bit indices under the row, datasheet style
		'<text x="64" y="102" class="lbl">15</text>' +
		'<text x="188" y="102" class="lbl">11</text>' +
		'<text x="352" y="102" class="lbl">5</text>' +
		'<text x="498" y="102" class="lbl">0</text>' +
		// declaration order feeds the LOW end first
		'<text x="120" y="150" class="lbl">declared FIRST → lands LOWEST:</text>' +
		'<path d="M 300 146 C 380 146 438 120 438 92" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowZGPS)"/>' +
		'<text x="20" y="182" class="lbl">packed = r | g&lt;&lt;5 | b&lt;&lt;11 — offsets are the running sum of the widths before each field</text>' +
		'<text x="20" y="202" class="lbl">total 5+6+5 = 16 bits: the struct IS a u16, no padding, no reordering</text>' +
		'<defs><marker id="dgArrowZGPS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'packed-structs',
		title: 'Packed Structs',
		nav: 'packed structs',
		difficulty: 'Hard',
		category: 'Numbers & Layout',
		task: 'Implement the compiler\'s half of `packed struct`: Pack (shift each field into its bits, first field lowest), Unpack (mask them back out), and BitOffsets.',

		prose: [
			'<h2>Packed Structs</h2>' +
			'<p>A display driver hands you a framebuffer of 16-bit pixels: red in ' +
			'5 bits, green in 6 (your eye favors green), blue in 5 — RGB565, the ' +
			'format of a million embedded LCDs. Or a status register from a ' +
			'sensor datasheet: an enable bit here, a 3-bit mode there, a 4-bit ' +
			'level above that. In Go you reach for shift-and-mask arithmetic, ' +
			'because Go structs promise nothing about layout — the compiler may ' +
			'pad and align fields however it likes, a <code>bool</code> takes a ' +
			'whole byte, and bitfields don\'t exist. Zig has a type for exactly ' +
			'this:</p>',
			{ lang: 'txt', code: 'const Rgb565 = packed struct {\n    r: u5, // FIRST field -> LEAST significant bits (0..4)\n    g: u6, // bits 5..10\n    b: u5, // bits 11..15\n};\n\nconst px: Rgb565 = .{ .r = 25, .g = 52, .b = 23 };\nconst raw: u16 = @bitCast(px);   // 0xbe99 — the layout is GUARANTEED\nconst back: Rgb565 = @bitCast(raw);  // and reversible, for free' },
			'<ul>' +
			'<li><strong>The layout is a contract.</strong> In a ' +
			'<code>packed struct</code> every field occupies exactly its declared ' +
			'bit width — <code>u1</code>, <code>u3</code>, <code>u5</code> are ' +
			'real first-class integer types — with the <em>first field in the ' +
			'least significant bits</em>. No padding, no reordering, ever.</li>' +
			'<li><strong>The struct is an integer.</strong> The whole thing is ' +
			'backed by one integer of the summed width (RGB565: 5+6+5 = u16), so ' +
			'<code>@bitCast</code> converts between struct view and raw view ' +
			'at zero cost — which is how the pixel goes onto the wire.</li>' +
			'<li><strong>Field access compiles to shift-and-mask.</strong> ' +
			'Reading <code>px.g</code> emits the same ' +
			'<code>(raw &gt;&gt; 5) &amp; 0x3f</code> you would write by hand — ' +
			'you declare the layout, the compiler writes the arithmetic.</li>' +
			'<li><strong>Go makes you the compiler.</strong> The shifting and ' +
			'masking Zig generates from the declaration is, in Go, code you ' +
			'write and maintain yourself. This problem <em>is</em> that ' +
			'code.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the generic machinery for any field list, given as ' +
			'parallel <code>values</code>/<code>widths</code> slices: ' +
			'<code>Pack</code> folds the fields into one int (first field in the ' +
			'lowest bits: <code>result |= v &lt;&lt; offset</code>, then ' +
			'<code>offset += width</code>), returning error ' +
			'<code>"value does not fit"</code> if any value needs more bits than ' +
			'its field (<code>v &lt; 0</code> or <code>v ≥ 2<sup>width</sup></code>) ' +
			'and error <code>"too wide"</code> if the widths sum past 63 bits. ' +
			'<code>Unpack</code> is the inverse: shift down, mask ' +
			'<code>(1&lt;&lt;width)−1</code>. <code>BitOffsets</code> reports ' +
			'each field\'s starting bit — the running sum of the widths before ' +
			'it.</p>',
		],

		starter: [
			'package main',
			'',
			'// Pack folds parallel values/widths field lists into one integer',
			'// with Zig\'s packed-struct layout: the FIRST field occupies the',
			'// LEAST significant bits, each later field sits immediately above',
			'// the one before it (result |= v << offset; offset += width).',
			'//',
			'// Errors (returned, never panicked):',
			'//   - "too wide"           if the widths sum to more than 63 bits',
			'//     (the result must stay a positive Go int)',
			'//   - "value does not fit" if any v is negative or >= 2^width —',
			'//     the condition Zig rejects at compile time, since a u5 field',
			'//     simply has no representation for 32',
			'//',
			'// len(values) == len(widths) is guaranteed by the caller.',
			'// (import "errors" when you implement this)',
			'func Pack(values []int, widths []int) (int, error) {',
			'	// your code here',
			'	return 0, nil',
			'}',
			'',
			'// Unpack is Pack\'s inverse: extract each field of the given widths',
			'// from packed, first field from the lowest bits. Each field is',
			'// (packed >> offset) & ((1 << width) - 1) — shift its bits down to',
			'// zero, then mask away the neighbors above. Inputs are always',
			'// well-formed (widths sum <= 63).',
			'func Unpack(packed int, widths []int) []int {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// BitOffsets reports where each field starts: field i begins at',
			'// the sum of all widths before it. BitOffsets([5 6 5]) = [0 5 11]',
			'// — the numbers a datasheet prints next to a register diagram.',
			'func BitOffsets(widths []int) []int {',
			'	// your code here',
			'	return nil',
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
			'	// Pack renders as hex (the raw register view) or the error text;',
			'	// Unpack/BitOffsets render as their slice.',
			'	packS := func(values, widths []int) string {',
			'		v, err := Pack(values, widths)',
			'		if err != nil {',
			'			return "err: " + err.Error()',
			'		}',
			'		return fmt.Sprintf("0x%x", v)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"RGB565 pixel r=25 g=52 b=23 (widths 5,6,5): r lands in bits 0-4, g in 5-10, b in 11-15 -> 25 | 52<<5 | 23<<11",',
			'			"0xbe99",',
			'			func() string { return packS([]int{25, 52, 23}, []int{5, 6, 5}) }},',
			'		{"RGB565 white 31/63/31: every field at max fills all 16 bits exactly — no gaps, no padding",',
			'			"0xffff",',
			'			func() string { return packS([]int{31, 63, 31}, []int{5, 6, 5}) }},',
			'		{"Unpack 0xbe99 with widths 5,6,5: mask-and-shift recovers the exact fields — the round trip is lossless",',
			'			"[25 52 23]",',
			'			func() string { return fmt.Sprint(Unpack(0xbe99, []int{5, 6, 5})) }},',
			'		{"BitOffsets [5 6 5]: each field starts where the previous widths end — the datasheet\'s bit numbers",',
			'			"[0 5 11]",',
			'			func() string { return fmt.Sprint(BitOffsets([]int{5, 6, 5})) }},',
			'		{"value 32 in a u5 field: 2^5 = 32 is one past the max — Zig rejects this at compile time, Pack must error",',
			'			"err: value does not fit",',
			'			func() string { return packS([]int{32, 0, 0}, []int{5, 6, 5}) }},',
			'		{"widths 32+32 = 64 bits: one past the 63-bit budget of a positive Go int — the shape itself is invalid",',
			'			"err: too wide",',
			'			func() string { return packS([]int{1, 1}, []int{32, 32}) }},',
			'		{"single field [200] width 8: packing one field is the identity — offset 0, no neighbors",',
			'			"0xc8",',
			'			func() string { return packS([]int{200}, []int{8}) }},',
			'		{"status register enable:u1=1 mode:u3=5 level:u4=9: 1 | 5<<1 | 9<<4 — mixed widths, still one byte",',
			'			"0x9b",',
			'			func() string { return packS([]int{1, 5, 9}, []int{1, 3, 4}) }},',
			'		{"Unpack 0x9b with widths 1,3,4: reading the register back gives each field its own value",',
			'			"[1 5 9]",',
			'			func() string { return fmt.Sprint(Unpack(0x9b, []int{1, 3, 4})) }},',
			'		{"BitOffsets [1 3 4]: enable at bit 0, mode at bit 1, level at bit 4",',
			'			"[0 1 4]",',
			'			func() string { return fmt.Sprint(BitOffsets([]int{1, 3, 4})) }},',
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
			'// Pack is the write half of a packed struct: each field is shifted',
			'// to its offset and OR\'d in. The offset is a running sum, which is',
			'// the whole layout rule — field i sits immediately above fields',
			'// 0..i-1, first field at bit 0.',
			'func Pack(values []int, widths []int) (int, error) {',
			'	// Shape check first: the total width is a property of the type,',
			'	// not the values, so it fails before any value is inspected —',
			'	// mirroring Zig, where an overwide packed struct is a compile',
			'	// error before any instance exists. 63 (not 64) because the',
			'	// result lives in a signed Go int and must not touch the sign',
			'	// bit: 1<<63 would go negative.',
			'	total := 0',
			'	for _, w := range widths {',
			'		total += w',
			'	}',
			'	if total > 63 {',
			'		return 0, errors.New("too wide")',
			'	}',
			'	packed := 0',
			'	offset := 0',
			'	for i, w := range widths {',
			'		v := values[i]',
			'		// A u<w> field represents exactly [0, 2^w-1]. Anything else',
			'		// would smear bits into the neighboring field — the silent',
			'		// corruption hand-rolled bit packing is infamous for, and',
			'		// exactly what Zig\'s type checker makes unrepresentable.',
			'		if v < 0 || v >= 1<<w {',
			'			return 0, errors.New("value does not fit")',
			'		}',
			'		// OR (not +) states the invariant: the target bits are still',
			'		// zero, fields never overlap. Then the offset advances past',
			'		// this field for the next one.',
			'		packed |= v << offset',
			'		offset += w',
			'	}',
			'	return packed, nil',
			'}',
			'',
			'// Unpack is the read half — what Zig compiles a field access into.',
			'// Shift the field\'s bits down to position zero, then mask with',
			'// (1<<w)-1 (w ones) to erase the higher neighbors. The mask-after-',
			'// shift order means no field ever sees another field\'s bits.',
			'func Unpack(packed int, widths []int) []int {',
			'	out := make([]int, len(widths))',
			'	offset := 0',
			'	for i, w := range widths {',
			'		out[i] = (packed >> offset) & (1<<w - 1)',
			'		offset += w',
			'	}',
			'	return out',
			'}',
			'',
			'// BitOffsets exposes the layout itself: a prefix sum of the widths.',
			'// Each field starts exactly where the previous fields end — the',
			'// same running offset Pack and Unpack maintain, reified as data.',
			'// Useful on its own for generating datasheet tables or debug output.',
			'func BitOffsets(widths []int) []int {',
			'	out := make([]int, len(widths))',
			'	offset := 0',
			'	for i, w := range widths {',
			'		out[i] = offset',
			'		offset += w',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why layout guarantees are a language feature</h3>' +
			'<p>Go\'s spec deliberately leaves struct layout to the compiler: ' +
			'fields may be padded for alignment, and the only promise is that ' +
			'offsets are consistent within a build. That freedom enables ' +
			'optimizations but forbids the thing hardware programming needs ' +
			'most — a struct whose bytes <em>are</em> the wire format. C tried ' +
			'to bridge this with bitfields and made it worse: the C standard ' +
			'leaves bitfield order implementation-defined, so the same struct ' +
			'packs differently under GCC and MSVC, a portability trap that has ' +
			'bitten kernel drivers for decades. Zig\'s <code>packed struct</code> ' +
			'closes the gap by specification: first field in the least ' +
			'significant bits, no padding, backed by an integer — the layout is ' +
			'part of the type, identical on every target.</p>' +
			'<h3>RGB565 and the register file</h3>' +
			'<p>The two examples in the harness are the two canonical users. ' +
			'RGB565 exists because 16 bits per pixel halves framebuffer memory ' +
			'and bus traffic versus 24-bit color, and green gets the sixth bit ' +
			'because human luminance perception peaks in green — a biological ' +
			'fact frozen into a million LCD controllers. Status registers are ' +
			'the other half: when a datasheet says "bits 1..3: mode", your ' +
			'<code>BitOffsets</code> output is literally the column that ' +
			'datasheet prints, and <code>Unpack</code> is the driver code that ' +
			'reads it. In Zig you would declare the register as a packed struct ' +
			'and <code>@bitCast</code> the raw word; the compiler emits exactly ' +
			'the shifts and masks you just wrote by hand.</p>' +
			'<h3>The invariants that keep bit packing honest</h3>' +
			'<p>Two details in the solution carry the safety story. The ' +
			'<code>v &lt; 0 || v &gt;= 1&lt;&lt;w</code> check is what makes ' +
			'<code>|=</code> equivalent to <code>+=</code>: an oversized value ' +
			'would smear into the neighboring field and corrupt it silently — ' +
			'with OR the corruption is at least idempotent, but the check makes ' +
			'it impossible, which is precisely the guarantee Zig moves to compile ' +
			'time (a <code>u5</code> variable <em>cannot hold</em> 32, so the ' +
			'error class does not exist at run time). And the 63-bit budget is a ' +
			'Go-specific translation of Zig\'s rule that a packed struct is ' +
			'backed by a fixed-width integer: our backing integer is a signed ' +
			'<code>int</code>, and staying below the sign bit keeps every packed ' +
			'value positive and printable. Real codebases hit the same wall — ' +
			'Linux\'s page flags and Java\'s object headers both ration a single ' +
			'machine word into bit-fields with a hard budget, maintained by ' +
			'hand-written masks and a lot of code review.</p>',
		],
		complexity: { time: 'O(n) — one pass over the fields for each of Pack, Unpack, BitOffsets', space: 'O(n) for the unpacked field slices' },
	});
})();
