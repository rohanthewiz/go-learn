/* Arena Allocators — Memory & Data (Hard). Odin makes the allocator an
 * explicit value (context.allocator), and the arena is its signature move:
 * Alloc is "round up to alignment, bump an offset", free is "set the offset
 * back to zero" — thousands of allocations reclaimed in one free_all. The
 * learner implements the bump-pointer arithmetic, including the two failure
 * details that matter: alignment padding and the no-op on overflow.
 */
(function () {
	'use strict';
	var T = GoLearnOdin;

	// A 24-byte arena drawn twice: after two allocs (with the alignment gap
	// visible), then after free_all. The reset is one arrow, not a walk of
	// the allocations — that IS the arena's pitch. 16px per byte, x0 = 90.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 210" width="540" height="210" role="img" aria-label="an arena bump pointer advancing over allocations, then resetting to zero on free_all">' +
		'<text x="20" y="24" class="lbl">arena of 24 bytes — Alloc rounds Off up to the alignment, then bumps it</text>' +
		// row 1: after Alloc(5,1) and Alloc(8,8)
		'<rect id="dgODALbar1" x="90" y="40" width="384" height="30" rx="4" fill="none" stroke="var(--edge)" stroke-width="1.4"/>' +
		'<rect id="dgODALa" x="90" y="40" width="80" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="130" y="60" text-anchor="middle" style="fill:var(--ok)">A: 5B</text>' +
		'<rect id="dgODALpad" x="170" y="40" width="48" height="30" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="4 3"/>' +
		'<text x="194" y="60" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">pad</text>' +
		'<rect id="dgODALb" x="218" y="40" width="128" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="282" y="60" text-anchor="middle" style="fill:var(--ok)">B: 8B @ align 8</text>' +
		'<text x="90" y="86" class="lbl">0</text>' +
		'<text x="218" y="86" text-anchor="middle" class="lbl">8</text>' +
		'<text x="346" y="86" text-anchor="middle" class="lbl">16 = Off</text>' +
		'<path d="M 346 100 L 346 72" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="360" y="100" class="lbl">8B free</text>' +
		// row 2: after free_all
		'<text x="20" y="136" class="lbl">free_all — no per-allocation walk, the offset just goes home</text>' +
		'<rect id="dgODALbar2" x="90" y="148" width="384" height="30" rx="4" fill="none" stroke="var(--edge)" stroke-width="1.4"/>' +
		'<path d="M 346 132 C 240 108 130 116 94 146" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="90" y="196" class="lbl">Off = 0, Live = 0 — every allocation reclaimed in O(1)</text>' +
		'</svg>';

	T.problem({
		id: 'allocators',
		title: 'Arena Allocators',
		nav: 'arena allocators',
		difficulty: 'Hard',
		category: 'Memory & Data',
		task: 'Implement Alloc and FreeAll — aligned bump-pointer allocation with an O(1) reset, all 8 tests.',

		prose: [
			'<h2>Arena Allocators</h2>' +
			'<p>In Go, allocation is a fact of nature: <code>new</code>, ' +
			'<code>make</code>, and escaping values all go to the one garbage-collected ' +
			'heap, and you never say where. In Odin the allocator is an explicit ' +
			'<em>value</em>: every allocating call takes one, defaulting to ' +
			'<code>context.allocator</code>, and swapping it changes where memory comes ' +
			'from for a whole call tree:</p>',
			{ lang: 'odin', code: 'arena: mem.Arena\nmem.arena_init(&arena, backing[:])           // one big backing buffer\n\ncontext.allocator = mem.arena_allocator(&arena)\nfor frame in game {\n    e := new(Entity)        // bump: round the offset up, advance it\n    s := make([]f32, 128)   // bump again — no free list, no GC bookkeeping\n    // ... simulate, render ...\n    free_all(context.allocator)   // whole frame\'s memory gone in O(1)\n}' },
			'<p>The arena never frees one object — it hands out consecutive slices of ' +
			'its buffer by <strong>bumping an offset</strong>, and reclaims everything at ' +
			'once by setting that offset back to zero. Per-frame scratch memory in game ' +
			'loops, per-request memory in servers: allocate freely all frame, then one ' +
			'<code>free_all</code> instead of GC pressure or a thousand ' +
			'<code>free</code> calls. Lifetimes become a property of the ' +
			'<em>allocator</em>, not of each object. Go\'s nearest move is ' +
			'<code>sync.Pool</code> — recycling objects to calm the GC — but you still ' +
			'cannot choose the allocator, and nothing frees a whole request\'s garbage in ' +
			'one instruction.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the bump. <code>Alloc(a, size, align)</code> rounds ' +
			'<code>Off</code> up to a multiple of <code>align</code> (align ≥ 1; CPUs ' +
			'fault or slow down on misaligned loads, so real allocators always pad), ' +
			'returns that aligned offset, and advances <code>Off</code> past the block, ' +
			'counting the allocation in <code>Live</code>. If the padding-adjusted block ' +
			'would exceed <code>Size</code>, return -1 and change <strong>nothing</strong>. ' +
			'<code>FreeAll</code> is the whole point: <code>Off = 0, Live = 0</code>.</p>',
			{ code: 'a := Arena{Size: 24}\nAlloc(&a, 5, 1)   → 0    // Off: 0 → 5\nAlloc(&a, 8, 8)   → 8    // Off rounds 5 → 8, then bumps → 16\nAlloc(&a, 16, 1)  → -1   // 16+16 > 24: refused, Off still 16\nFreeAll(&a)              // Off = 0, Live = 0\nAlloc(&a, 4, 1)   → 0    // the same bytes, reused', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Arena is a bump allocator over a Size-byte buffer. Off is the bump',
			'// pointer (index of the next free byte); Live counts allocations',
			'// handed out since the last FreeAll. The buffer itself is not modeled',
			'// — the arithmetic IS the allocator.',
			'type Arena struct {',
			'	Size int',
			'	Off  int',
			'	Live int',
			'}',
			'',
			'// Alloc reserves size bytes at align-byte alignment (align >= 1):',
			'// round Off up to a multiple of align, and if the block fits within',
			'// Size, advance Off past it, increment Live, and return the aligned',
			'// offset. If it would NOT fit, return -1 and leave the arena exactly',
			'// as it was — a failed alloc must not burn the padding.',
			'func Alloc(a *Arena, size, align int) int {',
			'	// your code here',
			'	return -1',
			'}',
			'',
			'// FreeAll releases every allocation at once: Off = 0, Live = 0.',
			'func FreeAll(a *Arena) {',
			'	// your code here',
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
			'	state := func(a Arena) string { return fmt.Sprintf("off=%d live=%d", a.Off, a.Live) }',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"first alloc: bumps from offset 0", "ret=0 off=3 live=1",',
			'			func() string { a := Arena{Size: 64}; r := Alloc(&a, 3, 1); return fmt.Sprintf("ret=%d %s", r, state(a)) }},',
			'		{"align 8 after 3 bytes: block lands at 8, padding burned", "ret=8 off=12 live=2",',
			'			func() string { a := Arena{Size: 64}; Alloc(&a, 3, 1); r := Alloc(&a, 4, 8); return fmt.Sprintf("ret=%d %s", r, state(a)) }},',
			'		{"already aligned: no padding inserted", "ret=8 off=16 live=2",',
			'			func() string { a := Arena{Size: 64}; Alloc(&a, 8, 8); r := Alloc(&a, 8, 8); return fmt.Sprintf("ret=%d %s", r, state(a)) }},',
			'		{"exact fit: the last byte is usable", "ret=0 off=16 live=1",',
			'			func() string { a := Arena{Size: 16}; r := Alloc(&a, 16, 1); return fmt.Sprintf("ret=%d %s", r, state(a)) }},',
			'		{"over capacity: -1 and the arena is untouched", "ret=-1 off=8 live=1",',
			'			func() string { a := Arena{Size: 16}; Alloc(&a, 8, 1); r := Alloc(&a, 16, 1); return fmt.Sprintf("ret=%d %s", r, state(a)) }},',
			'		{"padding alone can push past Size: also -1, nothing burned", "ret=-1 off=7 live=1",',
			'			func() string { a := Arena{Size: 10}; Alloc(&a, 7, 1); r := Alloc(&a, 3, 8); return fmt.Sprintf("ret=%d %s", r, state(a)) }},',
			'		{"free_all then alloc: byte 0 is reused", "ret=0 off=4 live=1",',
			'			func() string { a := Arena{Size: 64}; Alloc(&a, 5, 1); Alloc(&a, 6, 1); FreeAll(&a); r := Alloc(&a, 4, 1); return fmt.Sprintf("ret=%d %s", r, state(a)) }},',
			'		{"Live counts successes only, never failures", "off=8 live=2",',
			'			func() string { a := Arena{Size: 8}; Alloc(&a, 4, 1); Alloc(&a, 4, 1); Alloc(&a, 4, 1); return state(a) }},',
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
			'// Arena is a bump allocator over a Size-byte buffer. Off is the bump',
			'// pointer (index of the next free byte); Live counts allocations',
			'// handed out since the last FreeAll.',
			'type Arena struct {',
			'	Size int',
			'	Off  int',
			'	Live int',
			'}',
			'',
			'// Alloc reserves size bytes at align-byte alignment, or returns -1.',
			'//',
			'// The whole allocator is three steps — round, check, bump — and the',
			'// ORDER is what makes it correct:',
			'//',
			'//	Off=5, Alloc(size=8, align=8):',
			'//	  round  5 → 8            (aligned start)',
			'//	  check  8+8 <= Size      (padding counts against capacity!)',
			'//	  bump   Off = 16, Live++, return 8',
			'//',
			'// Checking before mutating gives failure-atomicity for free: a',
			'// refused alloc leaves Off and Live untouched, so the caller can',
			'// retry smaller or fall back to another allocator with nothing',
			'// half-burned.',
			'func Alloc(a *Arena, size, align int) int {',
			'	// Round Off up to the next multiple of align — the classic',
			'	// integer idiom: adding align-1 overshoots into the target',
			'	// bucket, truncating division snaps to its floor. An already-',
			'	// aligned Off passes through unchanged (5,8 → 8 but 8,8 → 8).',
			'	aligned := (a.Off + align - 1) / align * align',
			'',
			'	// Capacity check BEFORE any mutation, and against aligned+size,',
			'	// not Off+size — padding bytes are spent bytes too. Using > (not',
			'	// >=) keeps the exact fit legal: a block ending at Size consumes',
			'	// the last byte but never byte Size itself.',
			'	if aligned+size > a.Size {',
			'		return -1 // refused: state deliberately untouched',
			'	}',
			'',
			'	a.Off = aligned + size',
			'	a.Live++',
			'	return aligned',
			'}',
			'',
			'// FreeAll releases everything in O(1). No walk, no per-object',
			'// bookkeeping: objects in an arena share ONE lifetime, so ending it',
			'// is a single store. That is the trade — you give up freeing',
			'// individuals, you gain a constant-time reset and zero fragmentation.',
			'func FreeAll(a *Arena) {',
			'	a.Off = 0',
			'	a.Live = 0',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Three lines, ordered carefully</h3>' +
			'<p>Strip the comments and the allocator is round–check–bump:</p>',
			{ code: 'aligned := (a.Off + align - 1) / align * align\nif aligned+size > a.Size {\n\treturn -1\n}\na.Off = aligned + size\na.Live++' },
			'<p>Two details carry the tests. The capacity check uses ' +
			'<code>aligned+size</code>, not <code>Off+size</code> — padding is real ' +
			'consumption, and the “padding alone can push past Size” case fails any ' +
			'implementation that forgets it. And the check happens <em>before</em> any ' +
			'write, so a refusal is a true no-op; a version that bumps first and checks ' +
			'later leaks the padding on every failure.</p>' +
			'<h3>Why arenas beat free lists (when they apply)</h3>' +
			'<p>A general-purpose heap must support freeing <em>any</em> object at ' +
			'<em>any</em> time, which forces free lists, size classes, and ' +
			'fragmentation. The arena refuses that contract: objects allocated together ' +
			'die together. Once lifetimes are grouped, allocation is one add and ' +
			'deallocation is one store — and locality comes free, since a frame\'s ' +
			'objects sit contiguous in cache. The grouped-lifetime pattern is everywhere ' +
			'once you look: a game frame, an HTTP request, a compiler pass, a parse ' +
			'tree.</p>' +
			'<h3>The Odin ergonomics</h3>' +
			'<p>What makes this pleasant in Odin is not the arena — you could write one ' +
			'in any language — but the plumbing: <code>context.allocator</code> flows ' +
			'implicitly into every call, so pointing it at an arena redirects a whole ' +
			'subsystem\'s allocations without threading a parameter through fifty ' +
			'signatures. Odin even ships a scratch arena by default: ' +
			'<code>context.temp_allocator</code>, reset with one ' +
			'<code>free_all(context.temp_allocator)</code> per loop iteration. In Go the ' +
			'GC owns the heap; <code>sync.Pool</code> recycles hot objects and ' +
			'arena-style experiments exist, but “this request\'s memory dies now, in ' +
			'O(1)” is not a move the runtime offers. When you read Odin (or Zig, or C ' +
			'with obstacks) that allocates with abandon inside a loop, look for the ' +
			'<code>free_all</code> at the bottom — that is the whole memory strategy.</p>',
		],
		complexity: { time: 'O(1) per Alloc and per FreeAll — the reset never touches the allocations', space: 'O(1) beyond the fixed buffer' },
	});
})();
