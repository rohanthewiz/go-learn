/* Enums & bit_set — Values & Types (Medium). Odin pairs its enums with a
 * first-class set type: bit_set[Direction] is ONE integer where each enum
 * member owns one bit, with +, -, &, in, and card() as the set algebra.
 * The learner implements the algebra over a universe of member names,
 * returning results in universe order — which IS the bit order, and why a
 * bit_set is deterministic where a Go map[T]bool is not.
 */
(function () {
	'use strict';
	var T = GoLearnOdin;

	// The whole point in one picture: a set literal is just bits in the
	// integer, positioned by enum declaration order (lsb first).
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 170" width="540" height="170" role="img" aria-label="a bit_set is one integer; each enum member owns one bit in declaration order">' +
		'<text x="20" y="24" class="lbl">Dirs :: bit_set[Direction] — one integer, one bit per member</text>' +
		'<text x="70" y="60" class="lbl" text-anchor="middle">bit 3</text>' +
		'<text x="190" y="60" class="lbl" text-anchor="middle">bit 2</text>' +
		'<text x="310" y="60" class="lbl" text-anchor="middle">bit 1</text>' +
		'<text x="430" y="60" class="lbl" text-anchor="middle">bit 0</text>' +
		'<rect x="20" y="70" width="100" height="46" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="70" y="90" text-anchor="middle" style="fill:var(--ok)">.West = 1</text>' +
		'<rect x="140" y="70" width="100" height="46" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="190" y="90" text-anchor="middle" class="lbl">.South = 0</text>' +
		'<rect x="260" y="70" width="100" height="46" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="310" y="90" text-anchor="middle" class="lbl">.East = 0</text>' +
		'<rect x="380" y="70" width="100" height="46" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="430" y="90" text-anchor="middle" style="fill:var(--ok)">.North = 1</text>' +
		'<text x="20" y="146" class="lbl">{.North, .West}  =  0b1001  — declaration order IS bit order,</text>' +
		'<text x="20" y="164" class="lbl">so every set prints, compares, and iterates deterministically</text>' +
		'</svg>';

	T.problem({
		id: 'enums-bit-set',
		title: 'Enums & bit_set',
		nav: 'enums & bit_set',
		difficulty: 'Medium',
		category: 'Values & Types',
		task: 'Implement Eval — union, difference, intersection, and complement over a bit_set universe, results in universe (bit) order. All 8 tests.',

		prose: [
			'<h2>Enums &amp; bit_set</h2>' +
			'<p>Odin enums look like Go’s <code>iota</code> blocks with the boilerplate ' +
			'deleted — and then the language does something Go never did: it gives ' +
			'enums a native <em>set</em> type:</p>',
			{ lang: 'odin', code: 'Direction :: enum {North, East, South, West}\nDirs      :: bit_set[Direction]\n\nd: Dirs = {.North, .West}     // set literal — .Member is enum shorthand\nd += {.East}                  // union:        {.North, .East, .West}\nd -= {.North}                 // difference:   {.East, .West}\nboth := d & {.East, .South}   // intersection: {.East}\n\nif .East in d { /* membership: one bit test */ }\nn := card(d)                  // cardinality:  popcount, n = 2' },
			'<p>A <code>bit_set[Direction]</code> compiles to <strong>one integer</strong>. ' +
			'Each enum member owns the bit at its declaration index, a set literal is a ' +
			'bitmask, <code>+</code>/<code>-</code>/<code>&amp;</code> are single ' +
			'bitwise instructions, <code>in</code> is one bit test, and ' +
			'<code>card()</code> is a popcount. Compare the Go idiom for the same idea — ' +
			'<code>map[Direction]bool</code> allocates, hashes, and iterates in ' +
			'<em>randomized</em> order; the hand-rolled alternative ' +
			'<code>const North = 1 &lt;&lt; iota</code> is fast but untyped: nothing ' +
			'stops you from OR-ing a Direction bit into a set of file permissions. ' +
			'Odin’s <code>bit_set</code> is both at once — machine-word cheap ' +
			'<em>and</em> type-checked against its enum.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the set algebra. <code>Eval(op, a, b, universe)</code> takes ' +
			'member-name slices and the enum’s declaration order (the universe), and ' +
			'returns the result <strong>in universe order</strong> — that is the bit ' +
			'order of the integer, which is why a real bit_set never needs sorting: the ' +
			'representation itself is the order. <code>complement</code> ignores ' +
			'<code>b</code> (in Odin: <code>all_dirs - d</code>). Inputs may arrive in ' +
			'any order; the output order must not depend on them.</p>',
			{ code: 'Eval("union",      {North},        {West})         → [North West]\nEval("diff",       {North E S},     {East})         → [North South]\nEval("intersect",  {North East},    {East West})    → [East]\nEval("complement", {North},         —)              → [East South West]\ncard: len(Eval(...)) — the harness derives card() and `in` from Eval', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Eval applies one bit_set operation over sets of enum member names.',
			'//   op: "union" (+), "diff" (-), "intersect" (&),',
			'//       "complement" (universe - a; ignores b)',
			'// universe is the enum declaration order — the bit order.',
			'//',
			'// The result must list members in UNIVERSE order regardless of the',
			'// order a and b arrived in: the bitfield has no other order.',
			'func Eval(op string, a, b []string, universe []string) []string {',
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
			'	universe := []string{"North", "East", "South", "West"}',
			'	s := func(ms ...string) []string { return ms }',
			'',
			'	type tc struct {',
			'		name string',
			'		op   string',
			'		a, b []string',
			'		want string',
			'	}',
			'	cases := []tc{',
			'		{"union: {North} + {West}", "union", s("North"), s("West"), "[North West]"},',
			'		{"union normalizes to bit order: {West, South} + {East}", "union", s("West", "South"), s("East"), "[East South West]"},',
			'		{"diff: {North, East, South} - {East}", "diff", s("North", "East", "South"), s("East"), "[North South]"},',
			'		{"intersect: {North, East} & {East, West}", "intersect", s("North", "East"), s("East", "West"), "[East]"},',
			'		{"complement of {North}: everything else, in order", "complement", s("North"), nil, "[East South West]"},',
			'		{"complement of the full set is empty", "complement", s("North", "East", "South", "West"), nil, "[]"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases)+2)',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  c.want,',
			'		}',
			'		runCase(r, func() {',
			'			got := fmt.Sprintf("%v", Eval(c.op, c.a, c.b, universe))',
			'			r["pass"] = got == c.want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	// card(d) is len() of the evaluated set — a popcount in real Odin.',
			'	r := map[string]any{"input": "card({North, West} + {South}) = 3", "want": "3"}',
			'	runCase(r, func() {',
			'		got := len(Eval("union", s("North", "West"), s("South"), universe))',
			'		r["pass"] = got == 3',
			'		r["got"] = fmt.Sprintf("%d", got)',
			'	})',
			'	results = append(results, r)',
			'',
			'	// `.East in d` is intersection with a one-member set — one bit test.',
			'	r2 := map[string]any{"input": ".East in {North, East} via one-member intersect", "want": "true"}',
			'	runCase(r2, func() {',
			'		got := len(Eval("intersect", s("East"), s("North", "East"), universe)) == 1',
			'		r2["pass"] = got == true',
			'		r2["got"] = fmt.Sprintf("%v", got)',
			'	})',
			'	results = append(results, r2)',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// Eval applies one bit_set operation over sets of enum member names.',
			'//   op: "union" (+), "diff" (-), "intersect" (&),',
			'//       "complement" (universe - a; ignores b)',
			'//',
			'// Shape of the algorithm: convert both inputs to membership predicates,',
			'// then make ONE pass over the universe asking "does this member belong',
			'// in the result?". That mirrors the hardware exactly — a real bit_set',
			'// op computes every bit at once with one instruction, and reading the',
			'// result out lsb→msb is precisely "iterate the universe in order".',
			'// Input order can\'t leak into output order because inputs are only',
			'// ever consulted as predicates, never iterated.',
			'func Eval(op string, a, b []string, universe []string) []string {',
			'	inA := toSet(a)',
			'	inB := toSet(b)',
			'',
			'	out := []string{}',
			'	for _, m := range universe {',
			'		keep := false',
			'		switch op {',
			'		case "union": // a + b: either side sets the bit (bitwise OR)',
			'			keep = inA[m] || inB[m]',
			'		case "diff": // a - b: in a AND NOT in b (AND with NOT b)',
			'			keep = inA[m] && !inB[m]',
			'		case "intersect": // a & b: both sides (bitwise AND)',
			'			keep = inA[m] && inB[m]',
			'		case "complement": // universe - a: flip every bit',
			'			keep = !inA[m]',
			'		}',
			'		if keep {',
			'			out = append(out, m)',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
			'// toSet builds the membership predicate. Duplicates collapse for free —',
			'// a set bit cannot be "set twice", and neither can a map key.',
			'func toSet(ms []string) map[string]bool {',
			'	set := make(map[string]bool, len(ms))',
			'	for _, m := range ms {',
			'		set[m] = true',
			'	}',
			'	return set',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Iterate the universe, not the inputs</h3>' +
			'<p>The one structural decision that makes every case pass is the loop ' +
			'subject: walk the <em>universe</em> and consult the inputs as predicates, ' +
			'never the reverse:</p>',
			{ code: 'for _, m := range universe {\n\tkeep := inA[m] || inB[m] // union; diff/intersect/complement vary this line\n\tif keep {\n\t\tout = append(out, m)\n\t}\n}' },
			'<p>Iterate <code>a</code> and you inherit <code>a</code>’s arrival order — ' +
			'the “union normalizes to bit order” case exists to catch exactly that bug. ' +
			'In the real representation this loop doesn’t run at all: all four ops are ' +
			'single instructions on the whole word (<code>OR</code>, ' +
			'<code>AND&nbsp;NOT</code>, <code>AND</code>, <code>NOT</code>), and ' +
			'“universe order” is just reading bits lsb→msb. Your Go map stands in for ' +
			'the bits; the determinism comes from the universe slice, which is why the ' +
			'function needs it as a parameter at all.</p>' +
			'<h3>card() and in are the same machine</h3>' +
			'<p>The harness derived both from <code>Eval</code>: cardinality is the ' +
			'length of the members list (a popcount over the word), and ' +
			'<code>.East in d</code> is a one-member intersection (mask out one bit, ' +
			'test for zero). Odin exposes them as <code>card(d)</code> and ' +
			'<code>in</code> because both compile to one instruction — the entire set ' +
			'API rounds to arithmetic.</p>' +
			'<h3>What Go makes you choose between</h3>' +
			'<p>In Go this niche splits into two imperfect idioms: ' +
			'<code>map[Direction]bool</code> is type-safe but heap-allocated, hashed, ' +
			'and iterates in deliberately randomized order — you sort keys to print ' +
			'reproducibly; <code>1 &lt;&lt; iota</code> flag constants are word-cheap ' +
			'but typeless — the compiler happily ORs unrelated flag families together. ' +
			'<code>bit_set[Direction]</code> refuses the trade: the element type is ' +
			'checked (a <code>bit_set[Permission]</code> literal cannot hold ' +
			'<code>.North</code>), and the representation is the integer you would have ' +
			'hand-rolled. It is the <code>distinct</code> lesson again, applied to ' +
			'flags: the type system polices a boundary that costs nothing at runtime.</p>',
		],
		complexity: { time: 'O(u) — one universe pass with O(1) membership tests; real bit_sets do it in O(1) word ops', space: 'O(u) for the membership maps and result' },
	});
})();
