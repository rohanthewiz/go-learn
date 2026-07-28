/* Arena Allocators — Memory & Runtime (Hard). Zig has no global allocator:
 * every function that allocates TAKES an Allocator parameter, so hidden
 * allocation is impossible and tests can hand code a failing allocator to
 * prove its OOM paths. The learner implements the allocator underneath that
 * culture — a fixed-buffer bump allocator with alignment padding, an
 * error-union OOM path that leaves the arena untouched, and the O(1)
 * FreeAll that makes lifetime a bulk property.
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// A 24-byte buffer filling left to right: three allocations, the
	// alignment padding shaded between them, and the FreeAll arrow
	// snapping the cursor back to byte 0. 16px per byte, x0 = 80.
	// Marker id namespaced (dgArrowZGAA) — every track's SVGs share the
	// page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="a fixed buffer filling left to right by bumping an offset, with alignment padding shaded, and FreeAll snapping the cursor back to zero">' +
		'<text x="20" y="24" class="lbl">Arena of 24 bytes — Alloc rounds Off up to the alignment, then bumps past the block</text>' +
		'<rect x="80" y="44" width="384" height="32" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.2" opacity="0.5"/>' +
		// A: Alloc(5,1) at offset 0
		'<rect x="80" y="44" width="80" height="32" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="120" y="65" text-anchor="middle">A: 5B</text>' +
		// padding burned rounding 5 up to 8
		'<rect x="160" y="44" width="48" height="32" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="4 3"/>' +
		'<text x="184" y="65" text-anchor="middle" class="lbl" style="fill:var(--warn)">pad</text>' +
		// B: Alloc(4,4) at offset 8
		'<rect x="208" y="44" width="64" height="32" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="240" y="65" text-anchor="middle">B: 4B@4</text>' +
		// C: Alloc(2,2) at offset 12 — already even, no padding
		'<rect x="272" y="44" width="32" height="32" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="288" y="65" text-anchor="middle">C</text>' +
		'<text x="80" y="94" class="lbl">0</text>' +
		'<text x="208" y="94" text-anchor="middle" class="lbl">8</text>' +
		'<text x="272" y="94" text-anchor="middle" class="lbl">12</text>' +
		'<text x="308" y="94" class="lbl">Off = 14</text>' +
		'<text x="464" y="94" text-anchor="end" class="lbl">Size = 24</text>' +
		// FreeAll: one arrow, cursor goes home — no per-allocation walk
		'<path d="M 304 108 C 260 148 130 148 86 84" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowZGAA)"/>' +
		'<text x="200" y="158" text-anchor="middle" class="lbl" style="fill:var(--warn)">FreeAll(): Off = 0, Allocs = 0</text>' +
		'<text x="20" y="186" class="lbl">every allocation reclaimed by ONE store — lifetime belongs to the arena, not the objects</text>' +
		'<defs><marker id="dgArrowZGAA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'allocators-arena',
		title: 'Arena Allocators',
		nav: 'arena allocators',
		difficulty: 'Hard',
		category: 'Memory & Runtime',
		task: 'Implement a fixed-buffer bump allocator: aligned Alloc returning an error union on OOM (arena untouched), and the O(1) FreeAll.',

		prose: [
			'<h2>Arena Allocators</h2>' +
			'<p>Grep a Go service for its allocations and you can’t: <code>new</code>, ' +
			'<code>make</code>, string concatenation, closures, escaping locals — they ' +
			'all hit the one garbage-collected heap, invisibly. Zig is built on the ' +
			'opposite creed: <strong>there is no global allocator</strong>. Any function ' +
			'that allocates takes an <code>std.mem.Allocator</code> parameter, so a ' +
			'signature <em>tells you</em> whether a call can allocate, and the caller ' +
			'decides where the bytes come from:</p>',
			{ lang: 'txt', code: '// The signature admits it allocates — and can fail (the ! error union).\nfn parseAlloc(gpa: std.mem.Allocator, src: []const u8) ![]Node { ... }\n\nvar buf: [1024]u8 = undefined;\nvar fba = std.heap.FixedBufferAllocator.init(&buf);\nconst nodes = try parseAlloc(fba.allocator(), src); // stack bytes, zero heap\n\nvar arena = std.heap.ArenaAllocator.init(std.heap.page_allocator);\ndefer arena.deinit(); // EVERYTHING allocated from it dies here, at once\nconst tree = try build(arena.allocator(), nodes);' },
			'<p>That one design choice buys a whole culture:</p>' +
			'<ul>' +
			'<li><strong>Hidden allocation is impossible.</strong> If a function ' +
			'doesn’t take an allocator, it cannot allocate. Zig’s standard library ' +
			'holds itself to this — even formatting takes a writer, never a heap.</li>' +
			'<li><strong>OOM paths are testable.</strong> Allocation returns an error ' +
			'union (<code>error{OutOfMemory}![]u8</code>), and tests hand code a ' +
			'<code>std.testing.FailingAllocator</code> that succeeds <em>n</em> times ' +
			'then fails — proving every cleanup path, not hoping about them.</li>' +
			'<li><strong>Lifetime becomes a bulk property.</strong> A per-frame or ' +
			'per-request <code>ArenaAllocator</code> never frees one object: it hands ' +
			'out consecutive slices of a buffer by <em>bumping an offset</em>, and one ' +
			'reset at the end of the frame reclaims all of it — no per-object ' +
			'bookkeeping, no GC pause, no free list.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the machine under <code>FixedBufferAllocator</code>: a bump ' +
			'allocator modeled as arithmetic (<code>New</code>, <code>Alloc</code>, ' +
			'<code>FreeAll</code>, <code>Remaining</code>). <code>Alloc(n, align)</code> ' +
			'first rounds <code>Off</code> up to the next multiple of <code>align</code> ' +
			'(a power of 2): <code>padding := (align − Off%align) % align</code>. If the ' +
			'aligned block would exceed <code>Size</code>, return the error ' +
			'<code>out of memory</code> — and <code>Off</code> must <strong>not</strong> ' +
			'move, so a refused request never burns its padding. On success, return the ' +
			'aligned offset, bump <code>Off</code> past the block, and count it in ' +
			'<code>Allocs</code>. <code>FreeAll</code> is the whole point: two zeroes, ' +
			'everything gone.</p>',
			{ lang: 'txt', code: 'a := New(24)\na.Alloc(5, 1)   → 0, nil    // Off: 0 → 5\na.Alloc(4, 4)   → 8, nil    // pad 3: Off 5 → 8, then bump → 12\na.Alloc(2, 2)   → 12, nil   // 12 already even: no padding, Off → 14\na.Alloc(16, 1)  → 0, out of memory   // 14+16 > 24: refused, Off still 14\na.FreeAll()                 // Off = 0, Allocs = 0 — bytes reused' },
			'<div class="tip">Alignment padding is why the check must test ' +
			'<code>aligned + n</code>, not <code>Off + n</code> — padding bytes are ' +
			'spent bytes. And checking <em>before</em> mutating is what makes failure ' +
			'atomic: the caller of a refused Alloc can retry smaller against an arena ' +
			'that looks exactly as it did.</div>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// Arena is a bump allocator over a Size-byte buffer, modeled as pure',
			'// arithmetic (the buffer itself is not materialized — the offsets ARE',
			'// the allocator). Off is the index of the next free byte; Allocs',
			'// counts successful allocations since the last FreeAll.',
			'type Arena struct {',
			'	Size   int',
			'	Off    int',
			'	Allocs int',
			'}',
			'',
			'// New returns an empty arena over size bytes (Off = 0, Allocs = 0).',
			'func New(size int) *Arena {',
			'	// Wired up so the harness can drive the methods; the interesting',
			'	// work is in Alloc and FreeAll.',
			'	return &Arena{Size: size}',
			'}',
			'',
			'// Alloc reserves n bytes at align-byte alignment (align is a power of',
			'// 2, >= 1) and returns the allocation\'s OFFSET into the buffer:',
			'//',
			'//   - padding := (align - Off%align) % align rounds Off up to the',
			'//     next multiple of align (zero when Off is already aligned)',
			'//   - if alignedOff + n exceeds Size, return (0, error "out of',
			'//     memory") and leave Off and Allocs EXACTLY as they were —',
			'//     a refused request must not burn its padding',
			'//   - otherwise return the aligned offset, advance Off past the',
			'//     block, and increment Allocs',
			'func (a *Arena) Alloc(n, align int) (int, error) {',
			'	// your code here',
			'	return 0, errors.New("not implemented")',
			'}',
			'',
			'// FreeAll releases every allocation at once: Off = 0, Allocs = 0.',
			'// This O(1) reset is the arena\'s entire reason to exist.',
			'func (a *Arena) FreeAll() {',
			'	// your code here',
			'}',
			'',
			'// Remaining reports how many bytes are still free: Size - Off.',
			'func (a *Arena) Remaining() int {',
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
			'	// state renders the observable arena fields, including Remaining()',
			'	// — the OOM cases use it to prove Off never moved on failure.',
			'	state := func(a *Arena) string {',
			'		return fmt.Sprintf("off=%d allocs=%d rem=%d", a.Off, a.Allocs, a.Remaining())',
			'	}',
			'	errStr := func(err error) string {',
			'		if err == nil {',
			'			return "<nil>"',
			'		}',
			'		return err.Error()',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"first Alloc lands at offset 0 and bumps Off past the block",',
			'			"off=0 err=<nil> | off=5 allocs=1 rem=27",',
			'			func() string {',
			'				a := New(32)',
			'				off, err := a.Alloc(5, 1)',
			'				return fmt.Sprintf("off=%d err=%s | %s", off, errStr(err), state(a))',
			'			}},',
			'		{"alignment padding: Off=5 rounds up to 8 for align 4 — three bytes burned",',
			'			"off=8 err=<nil> | off=12 allocs=2 rem=20",',
			'			func() string {',
			'				a := New(32)',
			'				a.Alloc(5, 1)',
			'				off, err := a.Alloc(4, 4)',
			'				return fmt.Sprintf("off=%d err=%s | %s", off, errStr(err), state(a))',
			'			}},',
			'		{"already-aligned cursor: Off=12 at align 2 inserts no padding",',
			'			"off=12 err=<nil> | off=14 allocs=3 rem=18",',
			'			func() string {',
			'				a := New(32)',
			'				a.Alloc(5, 1)',
			'				a.Alloc(4, 4)',
			'				off, err := a.Alloc(2, 2)',
			'				return fmt.Sprintf("off=%d err=%s | %s", off, errStr(err), state(a))',
			'			}},',
			'		{"exact fit: a block may end AT Size — the last byte is usable",',
			'			"off=8 err=<nil> | off=16 allocs=2 rem=0",',
			'			func() string {',
			'				a := New(16)',
			'				a.Alloc(8, 8)',
			'				off, err := a.Alloc(8, 8)',
			'				return fmt.Sprintf("off=%d err=%s | %s", off, errStr(err), state(a))',
			'			}},',
			'		{"out of memory: aligned request exceeds Size — error, and Remaining proves Off never moved",',
			'			"off=0 err=out of memory | off=7 allocs=1 rem=3",',
			'			func() string {',
			'				a := New(10)',
			'				a.Alloc(7, 1)',
			'				off, err := a.Alloc(3, 8)',
			'				return fmt.Sprintf("off=%d err=%s | %s", off, errStr(err), state(a))',
			'			}},',
			'		{"padding alone can push past Size: also refused, nothing burned",',
			'			"off=0 err=out of memory | off=7 allocs=1 rem=1",',
			'			func() string {',
			'				a := New(8)',
			'				a.Alloc(7, 1)',
			'				off, err := a.Alloc(1, 4)',
			'				return fmt.Sprintf("off=%d err=%s | %s", off, errStr(err), state(a))',
			'			}},',
			'		{"FreeAll then Alloc: one reset reclaims everything — the next block is back at offset 0",',
			'			"off=0 err=<nil> | off=4 allocs=1 rem=60",',
			'			func() string {',
			'				a := New(64)',
			'				a.Alloc(9, 1)',
			'				a.Alloc(6, 2)',
			'				a.FreeAll()',
			'				off, err := a.Alloc(4, 4)',
			'				return fmt.Sprintf("off=%d err=%s | %s", off, errStr(err), state(a))',
			'			}},',
			'		{"Allocs counts successes only — a refused request never counts",',
			'			"off=8 allocs=2 rem=0",',
			'			func() string {',
			'				a := New(8)',
			'				a.Alloc(4, 1)',
			'				a.Alloc(4, 1)',
			'				a.Alloc(1, 1)',
			'				return state(a)',
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
			'import "errors"',
			'',
			'// Arena is a bump allocator over a Size-byte buffer, modeled as pure',
			'// arithmetic. Off is the index of the next free byte; Allocs counts',
			'// successful allocations since the last FreeAll. No buffer is',
			'// materialized: a real FixedBufferAllocator would return',
			'// buf[off : off+n], but every interesting decision lives in the',
			'// offset math, so the offsets are what we model.',
			'type Arena struct {',
			'	Size   int',
			'	Off    int',
			'	Allocs int',
			'}',
			'',
			'// New returns an empty arena over size bytes.',
			'func New(size int) *Arena {',
			'	return &Arena{Size: size}',
			'}',
			'',
			'// errOOM is the one error this allocator can produce — the Go stand-in',
			'// for Zig\'s error{OutOfMemory}, the entire error set of',
			'// std.mem.Allocator. A single shared value (rather than a fresh',
			'// errors.New per failure) mirrors how Zig errors are values from a',
			'// closed set, not fresh objects.',
			'var errOOM = errors.New("out of memory")',
			'',
			'// Alloc reserves n bytes at align-byte alignment and returns the',
			'// block\'s offset, or (0, errOOM) with the arena untouched.',
			'//',
			'// The allocator is three steps — round, check, bump — and the ORDER',
			'// carries the correctness:',
			'//',
			'//	Off=5, Alloc(n=4, align=4):',
			'//	  round  pad = (4 - 5%4) % 4 = 3   → aligned = 8',
			'//	  check  8 + 4 <= 24               (padding counts as spent!)',
			'//	  bump   Off = 12, Allocs++, return 8',
			'//',
			'// Checking before any write gives failure atomicity for free: a',
			'// refused Alloc leaves Off and Allocs exactly as they were, so the',
			'// caller can retry smaller — or fall back to another allocator — with',
			'// no padding half-burned. Zig\'s FixedBufferAllocator makes the same',
			'// promise: a failed alloc is a true no-op.',
			'func (a *Arena) Alloc(n, align int) (int, error) {',
			'	// Round Off up to the next multiple of align. The outer % align',
			'	// folds the "already aligned" case to zero padding: for Off=8,',
			'	// align=4, (4 - 0) % 4 = 0 — without it we would burn a full',
			'	// stride on every aligned cursor. Because align is a power of 2,',
			'	// real allocators do this as (Off + align - 1) &^ (align - 1);',
			'	// the modulo form states the same thing without bit tricks.',
			'	padding := (align - a.Off%align) % align',
			'	aligned := a.Off + padding',
			'',
			'	// Capacity check against aligned+n, not Off+n — the padding is',
			'	// real consumption. Using > (not >=) keeps the exact fit legal:',
			'	// a block ending at Size uses the last byte but never byte Size.',
			'	if aligned+n > a.Size {',
			'		return 0, errOOM // refused: state deliberately untouched',
			'	}',
			'',
			'	a.Off = aligned + n',
			'	a.Allocs++',
			'	return aligned, nil',
			'}',
			'',
			'// FreeAll releases everything in O(1): no walk, no per-object',
			'// bookkeeping. Objects in an arena share ONE lifetime, so ending it',
			'// is two stores. That is the trade — you give up freeing individuals',
			'// and gain a constant-time reset with zero fragmentation.',
			'func (a *Arena) FreeAll() {',
			'	a.Off = 0',
			'	a.Allocs = 0',
			'}',
			'',
			'// Remaining reports the free tail of the buffer. Note it cannot',
			'// promise the NEXT allocation fits in that many bytes — alignment',
			'// padding may claim some of them first.',
			'func (a *Arena) Remaining() int {',
			'	return a.Size - a.Off',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The parameter is the philosophy</h3>' +
			'<p>The bump math you wrote is thirty years old; what Zig adds is the ' +
			'<em>plumbing rule</em>. Because allocators arrive as parameters, a parser ' +
			'that allocates says so in its signature, a library never smuggles a heap ' +
			'dependency into your embedded target, and — the underrated one — tests can ' +
			'inject <code>std.testing.FailingAllocator</code> to make allocation ' +
			'<em>n</em> fail on purpose. Most C and Go code has OOM paths that have ' +
			'never once executed; idiomatic Zig code has them exercised in CI, which is ' +
			'exactly why <code>Alloc</code> returning an untouched arena on failure ' +
			'matters — that’s the state the retry path sees. Contrast the Odin track’s ' +
			'arena item: Odin threads the allocator <em>implicitly</em> through ' +
			'<code>context.allocator</code>, trading Zig’s visible signatures for ' +
			'zero-ceremony swapping. Same machine, opposite plumbing bet.</p>' +
			'<h3>Where the arenas actually go</h3>' +
			'<p>The grouped-lifetime pattern is everywhere once you look for it: a game ' +
			'frame’s scratch data, an HTTP request’s parse tree, a compiler pass’s IR. ' +
			'The Zig compiler itself leans on arenas — AST nodes allocated over a whole ' +
			'parse, freed as one — and <code>ArenaAllocator</code> is deliberately dumb: ' +
			'it doesn’t even reclaim on <code>free</code>, because its contract is ' +
			'“everything dies together at <code>deinit</code>.” Your ' +
			'<code>FreeAll</code> being two stores is not a simplification; it ' +
			'<em>is</em> the production implementation, minus the chained backing ' +
			'buffers.</p>' +
			'<h3>What Go does instead</h3>' +
			'<p>Go’s runtime owns allocation completely: escape analysis decides ' +
			'stack-vs-heap without you, the GC reclaims without you, and neither is ' +
			'steerable per call site. That buys enormous convenience and costs you this ' +
			'exact move — “this request’s memory dies now, in O(1)” doesn’t exist. ' +
			'<code>sync.Pool</code> recycles hot objects to calm the GC, and the ' +
			'short-lived <code>arena</code> experiment (Go 1.20, behind ' +
			'<code>GOEXPERIMENT=arenas</code>) tried to graft this pattern on before ' +
			'stalling — evidence both that the pattern is wanted and that it fights the ' +
			'GC’s ownership of the heap. When your Go service spends 20% of its time in ' +
			'GC on request-shaped garbage, this problem is the mental model for what ' +
			'the alternative looks like.</p>',
		],
		complexity: { time: 'O(1) per Alloc and per FreeAll — the reset never visits the allocations', space: 'O(1) beyond the modeled buffer' },
	});
})();
