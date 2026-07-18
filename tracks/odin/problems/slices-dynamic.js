/* Slices vs [dynamic]Arrays — Memory & Data (Medium). Odin splits Go's slice
 * into two types: `[]T` is a pure view (pointer+len, no cap, never grows) and
 * `[dynamic]T` is the growable container. Slicing a dynamic array yields a
 * view that a later append can invalidate by reallocating. The learner
 * implements a growth-and-aliasing simulator with an explicit allocation
 * generation, making "my view went stale" a checkable predicate.
 */
(function () {
	'use strict';
	var T = GoLearnOdin;

	T.problem({
		id: 'slices-dynamic',
		title: 'Slices vs [dynamic]Arrays',
		nav: 'slices vs dynamic',
		difficulty: 'Medium',
		category: 'Memory & Data',
		task: 'Implement Append, Slice, and Valid — a dynamic array with allocation generations, so a stale view is detectable. All 8 tests.',

		prose: [
			'<h2>Slices vs [dynamic]Arrays</h2>' +
			'<p>Go has one slice type doing two jobs: <code>s[1:3]</code> makes a view, ' +
			'and <code>append(s, x)</code> grows a container — the same <code>[]int</code> ' +
			'either way. Odin splits the two jobs into two types:</p>',
			{ lang: 'odin', code: 's: []int          // slice: pointer + len. A VIEW. No cap field, no append.\nd: [dynamic]int    // dynamic array: pointer + len + cap + its allocator\nappend(&d, 1)      // only [dynamic] grows; growth may realloc and MOVE the data\nv := d[:]          // slicing a dynamic array yields a []int view into its buffer\nappend(&d, 2)      // if this reallocs, v now points at freed memory' },
			'<p>A slice cannot grow because it has nothing to grow <em>with</em> — no ' +
			'capacity, no allocator, just an address and a length. Growth lives entirely ' +
			'in <code>[dynamic]T</code>: when <code>append</code> finds len == cap it ' +
			'allocates a bigger buffer, copies the elements over, and frees the old one. ' +
			'Any view sliced out of the old buffer is now dangling.</p>' +
			'<p>Go has the same reallocation mechanic — but because view and container ' +
			'are one type, the failure is subtler: after a growing <code>append</code>, an ' +
			'old Go slice still <em>safely</em> reads the abandoned (GC-kept) buffer and ' +
			'silently stops seeing new writes. Odin makes the split visible in the type ' +
			'system: <code>[]int</code> and <code>[dynamic]int</code> are different types, ' +
			'so "I thought this could grow" is a compile error, and "this view may have ' +
			'been invalidated" is exactly the set of views taken before a realloc.</p>' +
			'<h3>Your job</h3>' +
			'<p>Model the mechanic with an explicit <strong>allocation generation</strong>: ' +
			'<code>Dyn.Alloc</code> counts reallocations, a <code>View</code> remembers the ' +
			'generation it was sliced from, and a view is valid iff the generations still ' +
			'match. Growth rule: when len == cap, the new cap is 2 for an empty array ' +
			'(cap 0), else double — 0 → 2 → 4 → 8 — and the realloc copies the elements ' +
			'and bumps <code>Alloc</code>.</p>',
			{ code: 'var d Dyn\nAppend(&d, 1)        // len=1 cap=2 alloc=1  (first realloc)\nAppend(&d, 2)        // len=2 cap=2 alloc=1  (in cap: no realloc)\nv := Slice(d, 0, 2)  // view of generation 1\nAppend(&d, 3)        // len=3 cap=4 alloc=2  (realloc — buffer moved)\nValid(d, v)          // false: v points into generation 1\'s buffer', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Dyn models Odin\'s [dynamic]int: a growable container. Alloc is the',
			'// allocation generation — it increments every time growth reallocates',
			'// (moves) the buffer.',
			'type Dyn struct {',
			'	Data  []int',
			'	Len   int',
			'	Cap   int',
			'	Alloc int',
			'}',
			'',
			'// View models Odin\'s []int sliced out of a dynamic array: it remembers',
			'// WHICH allocation it points into, plus the [Lo, Hi) range.',
			'type View struct {',
			'	Alloc int',
			'	Lo    int',
			'	Hi    int',
			'}',
			'',
			'// Append adds x. If Len == Cap it must first grow: new cap is 2 when',
			'// Cap is 0, else Cap*2 (0 → 2 → 4 → 8), copying the elements into a',
			'// fresh buffer and bumping Alloc. In-cap appends must NOT bump Alloc.',
			'func Append(d *Dyn, x int) {',
			'	// your code here',
			'}',
			'',
			'// Slice takes a view of d\'s current buffer over [lo, hi).',
			'func Slice(d Dyn, lo, hi int) View {',
			'	// your code here',
			'	return View{}',
			'}',
			'',
			'// Valid reports whether v still points into d\'s live buffer — i.e.',
			'// no realloc has happened since the view was taken.',
			'func Valid(d Dyn, v View) bool {',
			'	// your code here',
			'	return false',
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
			'	// mk builds a Dyn by appending each value in order.',
			'	mk := func(xs ...int) Dyn {',
			'		var d Dyn',
			'		for _, x := range xs {',
			'			Append(&d, x)',
			'		}',
			'		return d',
			'	}',
			'	state := func(d Dyn) string { return fmt.Sprintf("len=%d cap=%d alloc=%d", d.Len, d.Cap, d.Alloc) }',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"append #1 into empty: cap 0 → 2, first allocation", "len=1 cap=2 alloc=1",',
			'			func() string { return state(mk(10)) }},',
			'		{"append #3 outgrows cap 2: realloc to 4", "len=3 cap=4 alloc=2",',
			'			func() string { return state(mk(1, 2, 3)) }},',
			'		{"append #5 outgrows cap 4: realloc to 8", "len=5 cap=8 alloc=3",',
			'			func() string { return state(mk(1, 2, 3, 4, 5)) }},',
			'		{"append #4 fits cap 4: len grows, generation does not", "len=4 cap=4 alloc=2",',
			'			func() string { return state(mk(1, 2, 3, 4)) }},',
			'		{"elements survive every realloc (copied over)", "[1 2 3 4 5]",',
			'			func() string { d := mk(1, 2, 3, 4, 5); return fmt.Sprint(d.Data[:d.Len]) }},',
			'		{"view taken, nothing appended since: valid", "true",',
			'			func() string { d := mk(1, 2); v := Slice(d, 0, 2); return fmt.Sprintf("%v", Valid(d, v)) }},',
			'		{"view, then a realloc-ing append: INVALIDATED", "false",',
			'			func() string { d := mk(1, 2); v := Slice(d, 0, 2); Append(&d, 3); return fmt.Sprintf("%v", Valid(d, v)) }},',
			'		{"view, then an in-cap append: still valid", "true",',
			'			func() string { d := mk(1, 2, 3); v := Slice(d, 0, 3); Append(&d, 4); return fmt.Sprintf("%v", Valid(d, v)) }},',
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
			'// Dyn models Odin\'s [dynamic]int: a growable container. Alloc is the',
			'// allocation generation — it increments every time growth reallocates',
			'// (moves) the buffer.',
			'type Dyn struct {',
			'	Data  []int',
			'	Len   int',
			'	Cap   int',
			'	Alloc int',
			'}',
			'',
			'// View models Odin\'s []int sliced out of a dynamic array: it remembers',
			'// WHICH allocation it points into, plus the [Lo, Hi) range.',
			'type View struct {',
			'	Alloc int',
			'	Lo    int',
			'	Hi    int',
			'}',
			'',
			'// Append adds x, growing first when full.',
			'//',
			'// The growth branch is the whole lesson: a realloc MOVES the elements',
			'// to a new buffer, so it bumps the generation counter — that single',
			'// increment is what invalidates every outstanding view. The in-cap',
			'// path writes in place and leaves Alloc alone, which is why views',
			'// survive it.',
			'func Append(d *Dyn, x int) {',
			'	if d.Len == d.Cap {',
			'		// 0 → 2 → 4 → 8: the empty case needs a seed because',
			'		// doubling zero goes nowhere.',
			'		newCap := 2',
			'		if d.Cap > 0 {',
			'			newCap = d.Cap * 2',
			'		}',
			'		newData := make([]int, newCap)',
			'		copy(newData, d.Data[:d.Len]) // survivors move to the new buffer',
			'		d.Data = newData',
			'		d.Cap = newCap',
			'		d.Alloc++ // new generation: every existing view is now stale',
			'	}',
			'	d.Data[d.Len] = x',
			'	d.Len++',
			'}',
			'',
			'// Slice takes a view of d\'s CURRENT buffer: it captures the live',
			'// generation, exactly as a real slice captures the live pointer.',
			'func Slice(d Dyn, lo, hi int) View {',
			'	return View{Alloc: d.Alloc, Lo: lo, Hi: hi}',
			'}',
			'',
			'// Valid is one comparison: the view is safe iff the buffer it was',
			'// sliced from is still the buffer the dynamic array owns. In real',
			'// Odin (and Go) nothing stores this generation — which is precisely',
			'// why the stale-view bug is invisible there.',
			'func Valid(d Dyn, v View) bool {',
			'	return v.Alloc == d.Alloc',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>One type split into two</h3>' +
			'<p>Go\'s slice header is (ptr, len, cap); Odin\'s slice is just (ptr, len) ' +
			'and the cap — plus the allocator that knows how to grow — lives only in ' +
			'<code>[dynamic]T</code>. The split moves a class of bug across the ' +
			'compile-time line: in Go, appending to something that was "really" a view ' +
			'either silently forks the backing array or silently overwrites a neighbor\'s ' +
			'data, depending on cap you cannot see. In Odin, <code>append</code> on a ' +
			'<code>[]int</code> does not typecheck.</p>' +
			'<h3>The generation counter is the pointer identity</h3>' +
			'<p>The simulator replaces "which address does this view point at" with ' +
			'"which allocation generation was it taken from" — same information, but ' +
			'comparable:</p>',
			{ code: 'd.Alloc++            // in Append\'s growth branch: buffer moved\nreturn v.Alloc == d.Alloc   // Valid: view and container agree on the buffer' },
			'<p>Note which appends invalidate: only the growing ones. An in-cap append ' +
			'writes into the same buffer, so views stay good — that is why the harness ' +
			'distinguishes append #3 (2→4, realloc) from append #4 (fits in 4). The ' +
			'danger window is exactly len == cap, and you cannot know that at the call ' +
			'site without looking — which is the argument for never holding a view across ' +
			'an append, in either language.</p>' +
			'<h3>In real Odin</h3>' +
			'<p>Dynamic arrays carry their allocator with them (<code>make</code> takes ' +
			'one from <code>context.allocator</code>), so growth reallocates via the ' +
			'allocator that made the buffer — a fact the next lesson, on arenas, turns ' +
			'into a superpower. The safe idioms mirror this problem\'s cases: re-slice ' +
			'<em>after</em> the appends are done, or <code>reserve(&amp;d, n)</code> up ' +
			'front so no append in the loop ever crosses the cap.</p>',
		],
		complexity: { time: 'O(1) amortized per Append — doubling makes total copies linear', space: 'O(cap) for the buffer' },
	});
})();
