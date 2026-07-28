/* undefined & unreachable — Memory & Runtime (Medium). Zig's safety dial is
 * explicit and per-build: bounds/overflow/unwrap checks panic in Debug and
 * ReleaseSafe and VANISH in ReleaseFast; `undefined` means "reading this is
 * illegal" (Debug memsets 0xAA to make the bug loud); `unreachable` is a
 * promise to the optimizer that becomes true UB if you lie. The learner
 * implements the mode machine — same operation, three build modes, three
 * documented outcomes — as pure string-returning Go (no real panics).
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// The 2x3 outcome grid the harness pins cell by cell: rows are the two
	// illegal operations, columns the three build modes. Safe modes panic
	// (accent); ReleaseFast deletes the check (warn). Ids carry the ZGUU
	// suffix — all tracks' SVGs share one page id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="grid of build modes: bounds violations and unreachable both panic in Debug and ReleaseSafe, but are undefined behavior optimized away in ReleaseFast">' +
		'<text x="20" y="22" class="lbl">one illegal operation, three build modes — the dial is part of the build, not the language</text>' +
		// column headers
		'<text x="235" y="50" text-anchor="middle">Debug</text>' +
		'<text x="350" y="50" text-anchor="middle">ReleaseSafe</text>' +
		'<text x="465" y="50" text-anchor="middle">ReleaseFast</text>' +
		// row labels
		'<text x="20" y="86" class="lbl">arr[i] out of bounds</text>' +
		'<text x="20" y="136" class="lbl">unreachable reached</text>' +
		// row 1 cells: panic / panic / UB
		'<rect x="180" y="66" width="110" height="32" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="235" y="87" text-anchor="middle">panic</text>' +
		'<rect x="295" y="66" width="110" height="32" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="350" y="87" text-anchor="middle">panic</text>' +
		'<rect x="410" y="66" width="110" height="32" rx="5" fill="none" stroke="var(--warn)" stroke-width="2" stroke-dasharray="5 3"/>' +
		'<text x="465" y="87" text-anchor="middle" style="fill:var(--warn)">UB: garbage</text>' +
		// row 2 cells: panic / panic / optimized away
		'<rect x="180" y="116" width="110" height="32" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="235" y="137" text-anchor="middle">panic</text>' +
		'<rect x="295" y="116" width="110" height="32" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="350" y="137" text-anchor="middle">panic</text>' +
		'<rect x="410" y="116" width="110" height="32" rx="5" fill="none" stroke="var(--warn)" stroke-width="2" stroke-dasharray="5 3"/>' +
		'<text x="465" y="137" text-anchor="middle" style="fill:var(--warn)">optimized away</text>' +
		'<text x="20" y="182" class="lbl">safe modes keep the checks and panic loudly; ReleaseFast hands the "impossible" to the optimizer as fact</text>' +
		'</svg>';

	T.problem({
		id: 'undefined-unreachable',
		title: 'undefined & unreachable',
		nav: 'undefined & unreachable',
		difficulty: 'Medium',
		category: 'Memory & Runtime',
		task: 'Implement Zig’s build-mode machine: bounds checks, unreachable, and undefined reads across Debug, ReleaseSafe, and ReleaseFast.',

		prose: [
			'<h2>undefined &amp; unreachable</h2>' +
			'<p>A crash report shows a struct full of <code>0xAAAAAAAA</code> — and a ' +
			'Zig developer smiles, because that pattern has a name: it is the Debug ' +
			'allocator shouting <em>you read memory you never initialized</em>. Zig ' +
			'splits two ideas most languages fuse. <code>undefined</code> is a ' +
			'<em>value</em>: “no value yet — reading this is illegal behavior.” ' +
			'<code>unreachable</code> is a <em>statement</em>: “control cannot get ' +
			'here — and I’m telling the compiler so.” What happens when you break ' +
			'either promise depends on the build mode, and that dial is explicit:</p>',
			{ lang: 'txt', code: 'var x: i32 = undefined;   // no value; Debug fills 0xAA so bugs are LOUD\n\nfn dispatch(op: u8) u32 {\n    switch (op) {\n        1 => return 10,\n        2 => return 20,\n        else => unreachable, // promise: op is only ever 1 or 2\n    }\n}\n\n// zig build -Doptimize=Debug        arr[9] on len 3 -> panic: index out of bounds\n// zig build -Doptimize=ReleaseSafe  same panic — checks kept, still fast\n// zig build -Doptimize=ReleaseFast  no check emitted: you read SOMETHING' },
			'<ul>' +
			'<li><strong>Debug / ReleaseSafe:</strong> safety checks are real code — ' +
			'out-of-bounds indexing, integer overflow, unwrapping a null optional, and ' +
			'reaching <code>unreachable</code> all panic with a stack trace. ' +
			'ReleaseSafe is the “fast <em>and</em> checked” mode most services ' +
			'ship.</li>' +
			'<li><strong>ReleaseFast / ReleaseSmall:</strong> the same checks are not ' +
			'emitted at all. <code>unreachable</code> flips from assertion to ' +
			'<em>optimizer promise</em>: the compiler deletes the branch and reasons ' +
			'backward from “this can’t happen” — which is why lying with it is ' +
			'catastrophic, not just wrong.</li>' +
			'<li><strong>The 0xAA trick:</strong> Debug memsets ' +
			'<code>undefined</code> memory with <code>0xAA</code>. Any read of ' +
			'undefined is illegal in <em>every</em> mode — Debug just makes the bug ' +
			'reproducible and recognizable instead of quietly lucky.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the mode machine over modes <code>"Debug"</code>, ' +
			'<code>"ReleaseSafe"</code>, <code>"ReleaseFast"</code>. ' +
			'<code>IndexAccess(arr, i, mode)</code> returns <code>(value, "ok")</code> ' +
			'in bounds; out of bounds it returns <code>(0, "panic: index out of ' +
			'bounds")</code> in the safe modes and <code>(0xAA, "undefined ' +
			'behavior")</code> in ReleaseFast. <code>ReachUnreachable(mode)</code> and ' +
			'<code>UndefinedRead(mode)</code> complete the grid — exact strings and ' +
			'values in the starter comments.</p>' +
			'<div class="tip">Everything here returns strings — no function actually ' +
			'panics. Real UB cannot be modeled (its defining property is “no defined ' +
			'result”), so the model returns <em>something with no promise behind ' +
			'it</em>: the 0xAA fill pattern, standing in for whatever bytes were ' +
			'there.</div>',
		],

		starter: [
			'package main',
			'',
			'// The three build modes this machine models. ReleaseSmall behaves',
			'// like ReleaseFast for safety purposes, so it is omitted.',
			'//',
			'//   Debug        checks on,  undefined memory filled with 0xAA',
			'//   ReleaseSafe  checks on,  no debug fill',
			'//   ReleaseFast  checks GONE — illegal operations are true UB',
			'',
			'// IndexAccess models arr[i] under a build mode.',
			'//',
			'//   - in bounds (0 <= i < len(arr)): (arr[i], "ok") in EVERY mode —',
			'//     safety modes never change correct code\'s result',
			'//   - out of bounds, Debug or ReleaseSafe: (0, "panic: index out of',
			'//     bounds") — the emitted bounds check catches it',
			'//   - out of bounds, ReleaseFast: (0xAA, "undefined behavior").',
			'//     Real UB has no result to model, BY DEFINITION — what you get',
			'//     is SOMETHING with no promise behind it. The 0xAA fill pattern',
			'//     is our honest stand-in for that garbage.',
			'func IndexAccess(arr []int, i int, mode string) (int, string) {',
			'	// your code here',
			'	return 0, ""',
			'}',
			'',
			'// ReachUnreachable models control flow arriving at `unreachable`:',
			'//',
			'//   - Debug or ReleaseSafe: "panic: reached unreachable code"',
			'//   - ReleaseFast: "optimized away" — the branch was never emitted;',
			'//     the optimizer took the promise as fact',
			'func ReachUnreachable(mode string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// UndefinedRead models reading a `var x: i32 = undefined`:',
			'//',
			'//   - Debug: 0xAAAAAAAA (2863311530) — the debug memset pattern,',
			'//     chosen so uninitialized reads produce a LOUD recognizable value',
			'//   - ReleaseSafe or ReleaseFast: 0 — no fill happens; we model the',
			'//     unpredictable bytes as zero',
			'//',
			'// The real rule: ANY read of undefined is illegal in EVERY mode.',
			'// Debug doesn\'t make it legal — it makes the bug visible.',
			'func UndefinedRead(mode string) int {',
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
			'	arr := []int{10, 20, 30}',
			'	idx := func(i int, mode string) string {',
			'		v, s := IndexAccess(arr, i, mode)',
			'		return fmt.Sprintf("%d %s", v, s)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"grid[bounds][Debug]: arr[5] on len 3 — the emitted check panics",',
			'			"0 panic: index out of bounds",',
			'			func() string { return idx(5, "Debug") }},',
			'		{"grid[bounds][ReleaseSafe]: same check, same panic — safe AND optimized",',
			'			"0 panic: index out of bounds",',
			'			func() string { return idx(5, "ReleaseSafe") }},',
			'		{"grid[bounds][ReleaseFast]: no check emitted — you read garbage (modeled as the 0xAA pattern)",',
			'			"170 undefined behavior",',
			'			func() string { return idx(5, "ReleaseFast") }},',
			'		{"grid[unreachable][Debug]: the assertion fires with a trace",',
			'			"panic: reached unreachable code",',
			'			func() string { return ReachUnreachable("Debug") }},',
			'		{"grid[unreachable][ReleaseSafe]: still an assertion, still a panic",',
			'			"panic: reached unreachable code",',
			'			func() string { return ReachUnreachable("ReleaseSafe") }},',
			'		{"grid[unreachable][ReleaseFast]: the branch was deleted — the promise became optimizer fact",',
			'			"optimized away",',
			'			func() string { return ReachUnreachable("ReleaseFast") }},',
			'		{"in-bounds passthrough: correct code gets the same answer in all three modes",',
			'			"20 ok / 20 ok / 20 ok",',
			'			func() string {',
			'				return fmt.Sprintf("%s / %s / %s", idx(1, "Debug"), idx(1, "ReleaseSafe"), idx(1, "ReleaseFast"))',
			'			}},',
			'		{"negative index is out of bounds too — Debug catches it like any overrun",',
			'			"0 panic: index out of bounds",',
			'			func() string { return idx(-1, "Debug") }},',
			'		{"undefined read in Debug: the 0xAA memset makes the bug loud — 0xAAAAAAAA",',
			'			"2863311530",',
			'			func() string { return fmt.Sprint(UndefinedRead("Debug")) }},',
			'		{"undefined read in the release modes: no fill — the model\'s stand-in is 0",',
			'			"0 0",',
			'			func() string {',
			'				return fmt.Sprintf("%d %d", UndefinedRead("ReleaseSafe"), UndefinedRead("ReleaseFast"))',
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
			'// The mode machine hinges on one predicate: are safety checks',
			'// emitted? Debug and ReleaseSafe say yes; ReleaseFast (and the',
			'// unmodeled ReleaseSmall) say no. Centralizing the predicate keeps',
			'// each function about its OPERATION, with the mode policy in one',
			'// place — exactly how the real compiler threads one "safety on?"',
			'// flag through every check site.',
			'func checksOn(mode string) bool {',
			'	return mode == "Debug" || mode == "ReleaseSafe"',
			'}',
			'',
			'// IndexAccess models arr[i] under a build mode.',
			'//',
			'// The in-bounds path comes FIRST and ignores the mode entirely —',
			'// that ordering is the point: safety modes only decide what happens',
			'// to ILLEGAL operations; correct code computes the same answer',
			'// everywhere. Only when the access is out of bounds does the mode',
			'// pick between a loud panic and modeled garbage.',
			'func IndexAccess(arr []int, i int, mode string) (int, string) {',
			'	// Both directions matter: i < 0 is as illegal as i >= len.',
			'	// (Zig index types are unsigned, so its negative case is a',
			'	// cast-time problem; Go ints make us check both ends.)',
			'	if i >= 0 && i < len(arr) {',
			'		return arr[i], "ok"',
			'	}',
			'	if checksOn(mode) {',
			'		return 0, "panic: index out of bounds"',
			'	}',
			'	// ReleaseFast: no check was emitted, so the load happens against',
			'	// whatever sits past the slice. Real UB cannot be modeled — its',
			'	// defining property is "no defined result" — so we return',
			'	// SOMETHING with no promise behind it, and 0xAA (the debug fill',
			'	// byte) is the honest stand-in for that garbage.',
			'	return 0xAA, "undefined behavior"',
			'}',
			'',
			'// ReachUnreachable models control arriving at `unreachable`. In the',
			'// safe modes it is an assertion (a real panic with a trace). In',
			'// ReleaseFast the compiler DELETED the branch: it took "control',
			'// cannot reach here" as a fact and optimized under it, which is why',
			'// a lie in that string is catastrophic rather than merely wrong.',
			'func ReachUnreachable(mode string) string {',
			'	if checksOn(mode) {',
			'		return "panic: reached unreachable code"',
			'	}',
			'	return "optimized away"',
			'}',
			'',
			'// UndefinedRead models reading `var x: i32 = undefined`. The real',
			'// rule: ANY such read is illegal in EVERY mode. Debug does not make',
			'// it legal — it memsets the bytes with 0xAA so the illegal read',
			'// yields a loud, recognizable 0xAAAAAAAA instead of quietly',
			'// plausible garbage that passes tests by luck. The release modes',
			'// skip the fill (it costs a memset), modeled here as zero.',
			'func UndefinedRead(mode string) int {',
			'	if mode == "Debug" {',
			'		return 0xAAAAAAAA // 2863311530: 10101010... in every byte',
			'	}',
			'	return 0',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The dial Go welded in place</h3>' +
			'<p>Go made the safety decision once, for everyone, forever: bounds checks ' +
			'are always on (the compiler elides only provably safe ones), integer ' +
			'overflow always wraps, nil dereferences always panic. Zig hands that dial ' +
			'to the <em>build</em>: the same source ships as ReleaseSafe for your ' +
			'server and ReleaseFast for your codec inner loop — and the dial is even ' +
			'per-block, via <code>@setRuntimeSafety(false)</code> inside one hot ' +
			'function while the rest of the file stays checked. The cultural bet is ' +
			'different too: Go says “the language protects you, always, at a cost you ' +
			'don’t control”; Zig says “the default protects you, and turning it off is ' +
			'a visible, greppable act.”</p>' +
			'<h3>Why unreachable is information, not documentation</h3>' +
			'<p>In safe builds <code>unreachable</code> is an assert. In ReleaseFast ' +
			'it becomes a fact the optimizer reasons <em>backward</em> from: if the ' +
			'<code>else</code> can’t happen, then <code>op</code> must be 1 or 2, so ' +
			'range checks on <code>op</code> elsewhere can be deleted, switches become ' +
			'jump tables without default arms, and whole branches fold away. That is ' +
			'the same mechanism as C++’s <code>__builtin_unreachable()</code> and ' +
			'Rust’s <code>unreachable_unchecked()</code> — and the reason a false ' +
			'promise doesn’t just crash, it silently miscompiles distant code. Go has ' +
			'no equivalent on purpose: <code>panic("unreachable")</code> stays a real ' +
			'check in every binary, costing a branch and giving the optimizer ' +
			'nothing.</p>' +
			'<h3>0xAA and the art of loud garbage</h3>' +
			'<p>Poison patterns are an old systems trick with a folklore all their ' +
			'own: Microsoft’s debug heap used <code>0xCD</code> (fresh) and ' +
			'<code>0xDD</code> (freed), FreeBSD kernels <code>0xDEADC0DE</code>, ' +
			'glibc’s malloc perturb whatever byte you ask for. The value is chosen to ' +
			'be improbable, non-zero, and misaligned-pointer-shaped, so uses of it ' +
			'crash <em>fast</em> and recognizably. Zig baking <code>0xAA</code> into ' +
			'Debug mode makes the pattern a language feature rather than an allocator ' +
			'option — and it is why <code>undefined</code> beats C’s uninitialized ' +
			'variables even before any checker runs: C gives you whatever the stack ' +
			'held (often a plausible stale value that <em>passes tests</em>); Zig ' +
			'Debug gives you a value that could only mean one thing. Go, again, chose ' +
			'the other end: everything is zero-initialized, which is safe and cheap ' +
			'but means a forgotten initialization is <em>indistinguishable</em> from ' +
			'a deliberate zero.</p>',
		],
		complexity: { time: 'O(1) per call — the machine is a mode predicate over constant outcomes', space: 'O(1)' },
	});
})();
