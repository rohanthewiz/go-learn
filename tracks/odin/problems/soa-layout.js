/* #soa Layout — Memory & Data (Hard). `#soa[]Particle` keeps struct-of-arrays
 * syntax while storing each field in its own parallel array: soa[i].x compiles
 * to xs[i]. The learner implements the compiler's address arithmetic for both
 * layouts — SoAOffset and AoSOffset — and the case table makes the cache
 * argument concrete: consecutive hot-field reads step by Size under SoA and
 * by the whole stride under AoS.
 */
(function () {
	'use strict';
	var T = GoLearnOdin;

	T.problem({
		id: 'soa-layout',
		title: '#soa Layout',
		nav: '#soa layout',
		difficulty: 'Hard',
		category: 'Memory & Data',
		task: 'Implement SoAOffset and AoSOffset — the address arithmetic behind soa[i].x, all 8 tests.',

		prose: [
			'<h2>#soa Layout</h2>' +
			'<p>A hot loop that reads one field of every element — sum the ' +
			'<code>x</code> of a million particles — drags the <em>whole struct</em> ' +
			'through the cache when the data is an array of structs: each 64-byte cache ' +
			'line delivers one useful <code>x</code> plus the <code>y</code> and ' +
			'<code>mass</code> you never asked for. The classic fix is ' +
			'structure-of-arrays: one tight array per field. In Go you build it by hand ' +
			'and the field-access syntax dies with the struct:</p>',
			{ code: '// AoS: what you write naturally\ntype Particle struct {\n\tX, Y float32\n\tMass float64\n}\nps[i].X\n\n// SoA: what the cache wants — by hand, p.X syntax is gone\ntype Particles struct {\n\tXs, Ys []float32\n\tMasses []float64\n}\nps.Xs[i]' },
			'<p>Odin makes the layout a <em>type attribute</em> instead of a rewrite. ' +
			'Mark the array <code>#soa</code> and the compiler splits the storage into ' +
			'parallel per-field arrays while the source keeps struct syntax:</p>',
			{ lang: 'odin', code: 'Particle :: struct { x, y: f32, mass: f64 }\n\nps: #soa[dynamic]Particle          // storage: xs[], ys[], masses[]\nappend(&ps, Particle{1, 2, 10})\nps[0].x = 5        // compiles to xs[0] = 5 — same syntax, new address math\n\ntotal: f32\nfor p in ps { total += p.x }       // walks ONE contiguous f32 array' },
			'<p>Same code, different address arithmetic — which means the arithmetic ' +
			'<em>is</em> the feature. That is what you implement.</p>' +
			'<h3>Your job</h3>' +
			'<p>Model a struct as <code>[]Field{Name, Size}</code> and compute byte ' +
			'offsets in both layouts (no padding in this model — every field is packed, ' +
			'so the AoS stride is exactly the sum of the sizes; real compilers add ' +
			'alignment padding, which only strengthens the SoA case).</p>' +
			'<ul>' +
			'<li><strong>SoA</strong> over <code>n</code> elements: field 0\'s ' +
			'<code>n</code> values first, then field 1\'s <code>n</code> values, and so ' +
			'on. Element <code>i</code>\'s field is at <em>(full arrays of every ' +
			'preceding field) + i·size</em>. Return -1 for an unknown name or ' +
			'<code>i</code> outside <code>[0, n)</code>.</li>' +
			'<li><strong>AoS</strong>: element <code>i</code>\'s field is at ' +
			'<em>i·stride + offset of the field within the struct</em>. Return -1 for an ' +
			'unknown name (or negative <code>i</code>).</li>' +
			'</ul>',
			{ code: 'fields: x:4  y:4  mass:8      n = 4 elements   (stride = 16)\n\nSoA:  xxxx xxxx xxxx xxxx | yyyy yyyy yyyy yyyy | m0 m1 m2 m3\nAoS:  x y mass | x y mass | x y mass | x y mass\n\nSoAOffset(f, 4, 2, "y")  → 16 + 2*4 = 24   // past all xs, then 2 ys\nAoSOffset(f, 2, "y")     → 2*16 + 4 = 36   // 2 strides, then skip x', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Field is one struct field in declaration order. Size is in bytes;',
			'// this model has NO alignment padding, so offsets are pure sums.',
			'type Field struct {',
			'	Name string',
			'	Size int',
			'}',
			'',
			'// SoAOffset returns the byte offset of element i\'s field `name` when',
			'// n elements are stored structure-of-arrays: all n values of field 0,',
			'// then all n of field 1, and so on. Returns -1 for an unknown name or',
			'// i outside [0, n).',
			'func SoAOffset(fields []Field, n, i int, name string) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// AoSOffset returns the byte offset of element i\'s field `name` in a',
			'// plain array-of-structs: i*stride + the field\'s offset within one',
			'// struct, where stride is the sum of all field sizes (no padding).',
			'// Returns -1 for an unknown name or negative i.',
			'func AoSOffset(fields []Field, i int, name string) int {',
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
			'	// Particle{x: f32, y: f32, mass: f64}, 4 elements. AoS stride 16;',
			'	// SoA blocks: xs [0,16), ys [16,32), masses [32,64).',
			'	pf := []Field{{Name: "x", Size: 4}, {Name: "y", Size: 4}, {Name: "mass", Size: 8}}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"SoA soa[0].x: byte 0 — first value of the first block", "0",',
			'			func() string { return fmt.Sprintf("%d", SoAOffset(pf, 4, 0, "x")) }},',
			'		{"SoA soa[2].y: skip all 4 xs (16B), then 2 ys", "24",',
			'			func() string { return fmt.Sprintf("%d", SoAOffset(pf, 4, 2, "y")) }},',
			'		{"SoA soa[3].mass: skip xs+ys (32B), then 3 masses", "56",',
			'			func() string { return fmt.Sprintf("%d", SoAOffset(pf, 4, 3, "mass")) }},',
			'		{"AoS p[2].y: 2 full strides, then skip x within the struct", "36",',
			'			func() string { return fmt.Sprintf("%d", AoSOffset(pf, 2, "y")) }},',
			'		{"same access, two layouts: element 3\'s y lands far apart", "soa=28 aos=52",',
			'			func() string { return fmt.Sprintf("soa=%d aos=%d", SoAOffset(pf, 4, 3, "y"), AoSOffset(pf, 3, "y")) }},',
			'		{"hot-field scan step, x[i] to x[i+1]: SoA moves 4B, AoS 16B", "soa+4 aos+16",',
			'			func() string {',
			'				return fmt.Sprintf("soa+%d aos+%d",',
			'					SoAOffset(pf, 4, 1, "x")-SoAOffset(pf, 4, 0, "x"),',
			'					AoSOffset(pf, 1, "x")-AoSOffset(pf, 0, "x"))',
			'			}},',
			'		{"unknown field name: -1 from both layouts", "soa=-1 aos=-1",',
			'			func() string { return fmt.Sprintf("soa=%d aos=%d", SoAOffset(pf, 4, 0, "vx"), AoSOffset(pf, 0, "vx")) }},',
			'		{"SoA i == n is out of range: -1", "-1",',
			'			func() string { return fmt.Sprintf("%d", SoAOffset(pf, 4, 4, "x")) }},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  c.want,',
			'		}',
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
			'// Field is one struct field in declaration order. Size is in bytes;',
			'// this model has NO alignment padding, so offsets are pure sums.',
			'type Field struct {',
			'	Name string',
			'	Size int',
			'}',
			'',
			'// SoAOffset: the SoA buffer is the struct turned inside-out — one full',
			'// n-element block per field, in declaration order:',
			'//',
			'//	x x x x | y y y y | mass mass mass mass',
			'//	^block 0  ^block 1  ^block 2',
			'//',
			'// So the address of soa[i].f is (bytes of every block BEFORE f\'s)',
			'// + i * f.Size. Note where n appears: in the skipped blocks, never in',
			'// the final term — inside its own block a field is packed at its own',
			'// size, which is exactly why a hot-field scan is contiguous.',
			'func SoAOffset(fields []Field, n, i int, name string) int {',
			'	if i < 0 || i >= n {',
			'		return -1 // outside the array: no element to address',
			'	}',
			'	off := 0',
			'	for _, f := range fields {',
			'		if f.Name == name {',
			'			return off + i*f.Size',
			'		}',
			'		off += n * f.Size // skip this field\'s ENTIRE block',
			'	}',
			'	return -1 // name not in the struct',
			'}',
			'',
			'// AoSOffset: the familiar layout — whole structs side by side, so the',
			'// address is i strides in, then the field\'s offset within one struct.',
			'// Two passes over the field list: one totals the stride, one finds',
			'// the intra-struct offset. There is no upper bound on i to check',
			'// here — AoS addressing needs only the stride, no element count.',
			'func AoSOffset(fields []Field, i int, name string) int {',
			'	if i < 0 {',
			'		return -1',
			'	}',
			'	stride := 0',
			'	for _, f := range fields {',
			'		stride += f.Size // sum of sizes: packed, no padding by spec',
			'	}',
			'	intra := 0',
			'	for _, f := range fields {',
			'		if f.Name == name {',
			'			return i*stride + intra',
			'		}',
			'		intra += f.Size // fields before ours within one struct',
			'	}',
			'	return -1 // name not in the struct',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The two formulas, side by side</h3>',
			{ code: '// SoA: skip whole blocks, then step by the FIELD\'s size\nreturn off + i*f.Size   // off = n * (sizes of preceding fields)\n\n// AoS: skip whole structs, then step within one struct\nreturn i*stride + intra // stride = sum of ALL field sizes' },
			'<p>Both are “skip the stuff before me, then index” — the difference is ' +
			'what <code>i</code> multiplies. In AoS, <code>i</code> multiplies the ' +
			'<em>stride</em>: advancing one element jumps the whole struct, cold fields ' +
			'included. In SoA, <code>i</code> multiplies the <em>field\'s own size</em>: ' +
			'advancing one element moves 4 bytes for an <code>f32</code>, period. The ' +
			'“hot-field scan” test case is the entire performance argument reduced to ' +
			'two subtractions: consecutive <code>x</code> reads sit +4 apart under SoA ' +
			'versus +16 under AoS — a 64-byte cache line serves 16 useful values ' +
			'instead of 4, and the prefetcher sees a perfectly regular stream.</p>' +
			'<h3>Why a language feature and not a refactor</h3>' +
			'<p>Nothing stops you writing parallel slices in Go — game engines and ECS ' +
			'libraries in every language do. The cost is that the layout leaks into ' +
			'every line of client code: <code>ps[i].X</code> becomes ' +
			'<code>ps.Xs[i]</code>, functions taking a <code>Particle</code> need ' +
			'gather/scatter shims, and switching layouts later means rewriting call ' +
			'sites. Odin\'s <code>#soa</code> keeps the access <em>syntax</em> stable ' +
			'while swapping the address arithmetic underneath — the two functions you ' +
			'just wrote are interchangeable behind <code>soa[i].x</code>, so choosing a ' +
			'layout becomes a one-token decision at the type, made when profiling says ' +
			'so, not a codebase migration.</p>' +
			'<h3>What the real feature adds</h3>' +
			'<p>Odin\'s <code>#soa</code> comes in fixed, slice, and dynamic flavors; ' +
			'<code>soa_zip</code> and <code>soa_unzip</code> convert between views; and ' +
			'taking <code>&amp;soa[i]</code> yields a special pointer of per-field ' +
			'addresses, since element <code>i</code> is no longer one contiguous chunk ' +
			'anywhere in memory. That last wrinkle is the honest price of SoA — “a ' +
			'pointer to one element” stops being a single address — and it is exactly ' +
			'the consequence you can now predict from the arithmetic: the fields of ' +
			'element <code>i</code> live whole blocks apart, <code>n·size</code> bytes ' +
			'between them.</p>',
		],
		complexity: { time: 'O(F) per lookup — one pass over the field list (two for AoS)', space: 'O(1)' },
	});
})();
