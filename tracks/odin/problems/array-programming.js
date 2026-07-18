/* Array Programming — Values & Types (Medium). Odin's fixed arrays are
 * values (like Go's) that also DO MATH: `a + b` and `a * 2` work lane-wise,
 * and arrays of length ≤ 4 get named lanes — `v.zyx`, `c.bgr` — resolved at
 * compile time. The learner implements both mechanics over plain slices:
 * ElemWise (with Odin's scalar broadcast) and Swizzle (with the xyzw/rgba
 * lane-name table), turning nil into the stand-in for Odin's compile error.
 */
(function () {
	'use strict';
	var T = GoLearnOdin;

	T.problem({
		id: 'array-programming',
		title: 'Array Programming',
		nav: 'array programming',
		difficulty: 'Medium',
		category: 'Values & Types',
		task: 'Implement ElemWise and Swizzle — Odin’s lane-wise array arithmetic and named-lane selection, all 10 tests.',

		prose: [
			'<h2>Array Programming</h2>' +
			'<p>Go arrays are values — assignment copies all the elements — and Odin ' +
			'agrees. Then Odin keeps going: a fixed array is not just a value, it is a ' +
			'<em>vector</em>, and the arithmetic operators work on it lane by lane:</p>',
			{ lang: 'odin', code: 'v := [3]f32{1, 2, 3}\nw := [3]f32{10, 20, 30}\n\nfmt.println(v + w)   // [11, 22, 33]  element-wise add — no loop\nfmt.println(v * w)   // [10, 40, 90]  element-wise multiply\nfmt.println(v * 2)   // [2, 4, 6]     a scalar broadcasts to every lane' },
			'<p>And arrays of length ≤ 4 get <strong>swizzle names</strong>: the ' +
			'lanes answer to <code>x y z w</code> (positions) and equally to ' +
			'<code>r g b a</code> (colors), both mapping to indices 0–3. A swizzle ' +
			'spells out output lanes by name — reversing, projecting, and duplicating ' +
			'are all just selection:</p>',
			{ lang: 'odin', code: 'p := [3]f32{1, 2, 3}\nfmt.println(p.zyx)   // [3, 2, 1]  reversed\nfmt.println(p.xy)    // [1, 2]     projected down to a [2]f32\nfmt.println(p.xxx)   // [1, 1, 1]  one lane, broadcast\n\ncolor := [4]f32{0.9, 0.5, 0.1, 1.0}   // rgba\nfmt.println(color.bgr)                // [0.1, 0.5, 0.9] — channel swap' },
			'<p>Go stops at value semantics. <code>[3]float64</code> copies on ' +
			'assignment exactly like Odin’s <code>[3]f32</code>, but there is no ' +
			'operator for it — you are the vector unit:</p>',
			{ code: 'v := [3]float64{1, 2, 3}\nw := [3]float64{10, 20, 30}\n// v + w   // compile error: operator + not defined on [3]float64\nsum := [3]float64{}\nfor i := range v {\n\tsum[i] = v[i] + w[i] // the loop Odin writes for you\n}' },
			'<h3>Your job</h3>' +
			'<p>Implement both mechanics over slices. <code>ElemWise(op, a, b)</code> ' +
			'applies <code>"+"</code>, <code>"-"</code>, or <code>"*"</code> lane by ' +
			'lane; when <code>len(b) == 1</code> that single value broadcasts across ' +
			'every lane of <code>a</code> (Odin’s <code>v * 2</code>). Unknown op ' +
			'or mismatched lengths → <code>nil</code>. <code>Swizzle(v, spec)</code> ' +
			'builds one output lane per letter of <code>spec</code> using the name ' +
			'table x/r→0, y/g→1, z/b→2, w/a→3; a letter outside the ' +
			'table, or a lane index ≥ <code>len(v)</code>, returns <code>nil</code> ' +
			'— our runtime stand-in for what Odin rejects at compile time.</p>',
			{ lang: 'txt', code: 'ElemWise("+", [1 2 3], [10 20 30]) → [11 22 33]\nElemWise("*", [1 2 3], [2])        → [2 4 6]      len(b)==1: scalar broadcast\nElemWise("+", [1 2 3], [1 2])      → nil          lengths disagree\nSwizzle([1 2 3], "zyx")            → [3 2 1]      reverse\nSwizzle([1 2 3], "xy")             → [1 2]        project\nSwizzle([0.9 0.5 0.1 1], "bgr")    → [0.1 0.5 0.9]\nSwizzle([1 2 3], "w")              → nil          no lane 3 in a length-3 array' },
		],

		starter: [
			'package main',
			'',
			'// ElemWise applies op ("+", "-", "*") lane by lane: out[i] = a[i] op b[i].',
			'// One Odin nicety is included: when len(b) == 1, b[0] broadcasts across',
			'// every lane of a (Odin’s `v * 2`). An unknown op or a length mismatch',
			'// (after broadcasting) returns nil.',
			'func ElemWise(op string, a, b []float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Swizzle selects lanes of v by name, one output lane per letter of spec:',
			'//   x/r → 0,  y/g → 1,  z/b → 2,  w/a → 3',
			'// A letter outside xyzw/rgba, or a lane index ≥ len(v), returns nil',
			'// (Odin rejects both at compile time).',
			'func Swizzle(v []float64, spec string) []float64 {',
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
			'	type tc struct {',
			'		name string',
			'		fn   string // "elem" calls ElemWise(arg, a, b); "swz" calls Swizzle(a, arg)',
			'		arg  string',
			'		a, b []float64',
			'		want string',
			'	}',
			'	cases := []tc{',
			'		{"v + w: lane-wise add", "elem", "+", []float64{1, 2, 3}, []float64{10, 20, 30}, "[11 22 33]"},',
			'		{"v - w: lane-wise subtract", "elem", "-", []float64{5, 5}, []float64{1, 2}, "[4 3]"},',
			'		{"v * w: lane-wise multiply", "elem", "*", []float64{1, 2, 3}, []float64{10, 20, 30}, "[10 40 90]"},',
			'		{"v * 2: len(b)==1 broadcasts the scalar", "elem", "*", []float64{1, 2, 3}, []float64{2}, "[2 4 6]"},',
			'		{"length mismatch is not broadcast: nil", "elem", "+", []float64{1, 2, 3}, []float64{1, 2}, "[]"},',
			'		{"p.zyx reverses", "swz", "zyx", []float64{1, 2, 3}, nil, "[3 2 1]"},',
			'		{"p.xy projects down", "swz", "xy", []float64{1, 2, 3}, nil, "[1 2]"},',
			'		{"color.bgr swaps channels (rgba names, same lanes)", "swz", "bgr", []float64{0.9, 0.5, 0.1, 1}, nil, "[0.1 0.5 0.9]"},',
			'		{"p.xxx broadcasts one lane", "swz", "xxx", []float64{4, 7}, nil, "[4 4 4]"},',
			'		{"p.w on a length-3 array: no lane 3 → nil", "swz", "w", []float64{1, 2, 3}, nil, "[]"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  c.want,',
			'		}',
			'		runCase(r, func() {',
			'			var got []float64',
			'			if c.fn == "elem" {',
			'				got = ElemWise(c.arg, append([]float64(nil), c.a...), append([]float64(nil), c.b...))',
			'			} else {',
			'				got = Swizzle(append([]float64(nil), c.a...), c.arg)',
			'			}',
			'			s := fmt.Sprintf("%v", got)',
			'			r["pass"] = s == c.want',
			'			r["got"] = s',
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
			'// ElemWise applies op lane by lane, with Odin’s scalar broadcast when',
			'// len(b) == 1.',
			'//',
			'// Broadcast is handled by MATERIALIZING the scalar into a full-length',
			'// slice up front rather than special-casing it inside the loop: after',
			'// normalization there is exactly one shape (equal lengths) and one loop,',
			'// which is also how vector hardware thinks about it — a "splat" of the',
			'// scalar into a register, then one lane-wise instruction.',
			'func ElemWise(op string, a, b []float64) []float64 {',
			'	if len(b) == 1 && len(a) != 1 {',
			'		s := b[0]',
			'		b = make([]float64, len(a))',
			'		for i := range b {',
			'			b[i] = s // splat: [2] → [2 2 2]',
			'		}',
			'	}',
			'	if len(a) != len(b) {',
			'		return nil // Odin makes this a compile error: shapes are types',
			'	}',
			'	out := make([]float64, len(a))',
			'	for i := range a {',
			'		switch op {',
			'		case "+":',
			'			out[i] = a[i] + b[i]',
			'		case "-":',
			'			out[i] = a[i] - b[i]',
			'		case "*":',
			'			out[i] = a[i] * b[i]',
			'		default:',
			'			return nil',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// Swizzle is pure selection: each letter of spec names an input lane,',
			'// and the output is those lanes in spec order. Nothing is computed —',
			'// reversal, projection, duplication, and channel swaps all fall out of',
			'// the same "gather by name" move.',
			'//',
			'// The xyzw and rgba alphabets are two names for the SAME indices, which',
			'// is why they share one table here. Odin resolves these names at compile',
			'// time (p.zyx is lane arithmetic, not reflection); nil is this model’s',
			'// stand-in for its compile error.',
			'func Swizzle(v []float64, spec string) []float64 {',
			'	out := make([]float64, 0, len(spec))',
			'	for i := 0; i < len(spec); i++ {',
			'		idx := -1',
			'		switch spec[i] {',
			'		case \'x\', \'r\':',
			'			idx = 0',
			'		case \'y\', \'g\':',
			'			idx = 1',
			'		case \'z\', \'b\':',
			'			idx = 2',
			'		case \'w\', \'a\':',
			'			idx = 3',
			'		default:',
			'			return nil // not a lane name in either alphabet',
			'		}',
			'		if idx >= len(v) {',
			'			return nil // named a lane the array does not have',
			'		}',
			'		out = append(out, v[idx])',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Values first, math second</h3>' +
			'<p>The prerequisite for array arithmetic is one Go already meets: arrays ' +
			'must be values. <code>v + w</code> only makes sense if <code>v</code> ' +
			'<em>is</em> its three floats rather than a pointer at them. Odin’s ' +
			'addition is the ergonomics on top — most fixed-size arrays in real ' +
			'programs are positions, velocities, and colors, so the language makes the ' +
			'dominant operations on them one expression instead of one loop. The ' +
			'broadcast rule follows the same instinct, and the solution makes it ' +
			'explicit by normalizing before computing:</p>',
			{ code: 'if len(b) == 1 && len(a) != 1 {\n\ts := b[0]\n\tb = make([]float64, len(a))\n\tfor i := range b {\n\t\tb[i] = s // splat, then ONE code path for both shapes\n\t}\n}' },
			'<h3>Swizzles are names, not calls</h3>' +
			'<p><code>p.zyx</code> looks like a field access because it is one: the ' +
			'compiler resolves each letter to a lane index and emits a gather — no ' +
			'lookup, no reflection, no runtime spec string. That is why an invalid ' +
			'swizzle (<code>p.w</code> on a <code>[3]f32</code>, or a letter outside ' +
			'the two alphabets) is a <em>compile</em> error in Odin; this model runs ' +
			'the spec at runtime, so <code>nil</code> plays that role. Note what the ' +
			'two alphabets are: not two features but two spellings of indices 0–3, ' +
			'so <code>c.bgr</code> and <code>c.zyx</code> are the same gather.</p>' +
			'<h3>The Go position</h3>' +
			'<p>Go deliberately has no operator definitions on aggregate types — ' +
			'<code>+</code> on <code>[3]float64</code> will never compile, and the ' +
			'idiomatic answer is the explicit loop or a vector package with method ' +
			'calls. That buys Go a property Odin trades away: every arithmetic ' +
			'operator in Go source is machine arithmetic on one number, never a hidden ' +
			'n-element operation. Odin buys the other property: shader-style code ' +
			'(<code>pos.xy + vel.xy * dt</code>) reads like the math it implements, ' +
			'and the fixed lane count means the compiler can lower these directly to ' +
			'SIMD. Same value semantics underneath — a different bet about what the ' +
			'source should look like.</p>',
		],
		complexity: { time: 'O(n) — one pass over the lanes for either function', space: 'O(n) for the output slice (plus the splat buffer)' },
	});
})();
