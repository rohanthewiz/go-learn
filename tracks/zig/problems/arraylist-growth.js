/* ArrayList Growth — Memory & Runtime (Medium). std.ArrayList is Zig's
 * growable buffer, and because allocation is explicit, its growth policy is
 * something you can read, test, and count. The learner implements the
 * capacity rule (cap + cap/2 + 8), counts reallocations to see amortized
 * O(1) fall out, and models toOwnedSlice — Zig's explicit ownership
 * transfer, where the list hands over its buffer and resets itself.
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// Capacity staircase over append count: flat while spare capacity
	// lasts, a jump at each reallocation (marked with a dot). The riser
	// heights grow ~1.5x — that geometry is where amortized O(1) comes
	// from. No marker defs needed, but any ids would carry the ZGAL
	// suffix: all tracks' SVGs share one page id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 210" width="540" height="210" role="img" aria-label="capacity staircase over append count: capacity jumps to 8, 20, 38, 65 at appends 1, 9, 21, 39, flat between jumps">' +
		'<text x="20" y="20" class="lbl">capacity over 40 appends — each dot is ONE reallocation (allocate bigger, copy, continue)</text>' +
		// axes
		'<path d="M 70 40 L 70 170 L 510 170" fill="none" stroke="var(--accent)" stroke-width="1.2" opacity="0.55"/>' +
		// staircase: cap 8 @ append 1, 20 @ 9, 38 @ 21, 65 @ 39 (y = 170 - 1.6*cap)
		'<path d="M 70 170 L 80 170 L 80 157 L 160 157 L 160 138 L 280 138 L 280 109 L 460 109 L 460 66 L 505 66" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		// reallocation points
		'<circle cx="80" cy="157" r="4" fill="var(--warn)"/>' +
		'<circle cx="160" cy="138" r="4" fill="var(--warn)"/>' +
		'<circle cx="280" cy="109" r="4" fill="var(--warn)"/>' +
		'<circle cx="460" cy="66" r="4" fill="var(--warn)"/>' +
		// capacity labels beside each tread
		'<text x="62" y="161" text-anchor="end" class="lbl">8</text>' +
		'<text x="62" y="142" text-anchor="end" class="lbl">20</text>' +
		'<text x="62" y="113" text-anchor="end" class="lbl">38</text>' +
		'<text x="62" y="70" text-anchor="end" class="lbl">65</text>' +
		// append-count labels under the jumps
		'<text x="80" y="186" text-anchor="middle" class="lbl">1</text>' +
		'<text x="160" y="186" text-anchor="middle" class="lbl">9</text>' +
		'<text x="280" y="186" text-anchor="middle" class="lbl">21</text>' +
		'<text x="460" y="186" text-anchor="middle" class="lbl">39</text>' +
		'<text x="290" y="204" text-anchor="middle" class="lbl">append count — treads widen ~1.5x, so reallocations get rarer as the list grows</text>' +
		'</svg>';

	T.problem({
		id: 'arraylist-growth',
		title: 'ArrayList Growth',
		nav: 'arraylist growth',
		difficulty: 'Medium',
		category: 'Memory & Runtime',
		task: 'Implement the ArrayList capacity rule (cap + cap/2 + 8), count reallocations, and model toOwnedSlice’s explicit ownership transfer.',

		prose: [
			'<h2>ArrayList Growth</h2>' +
			'<p>A Go profile shows 30% of a hot loop inside <code>growslice</code>, and ' +
			'the fix — <code>make([]T, 0, n)</code> — works without your ever knowing ' +
			'what the growth factor was. Zig refuses to let you not know. ' +
			'<code>std.ArrayList</code> is the same growable buffer, but because every ' +
			'allocation is explicit, appending is spelled <code>try</code> — it can ' +
			'fail, it may reallocate, and the policy that decides <em>when</em> is ' +
			'ordinary code you can read in the standard library:</p>',
			{ lang: 'txt', code: 'var list = std.ArrayList(u8).init(allocator);\ndefer list.deinit();\n\ntry list.append(\'a\');       // may grow: allocate bigger, copy, free old\ntry list.appendSlice("bc"); // ensureTotalCapacity runs the growth rule\n\n// Ownership transfer, made explicit: the buffer is now YOURS to free,\n// and the list resets to empty — one owner at every moment.\nconst owned = try list.toOwnedSlice();' },
			'<p>This problem models that machinery with a definite growth rule ' +
			'(modeled on the policy Zig’s ArrayList used for years):</p>' +
			'<ul>' +
			'<li><strong>The rule.</strong> An append needs <code>needed = len+1</code>. ' +
			'If <code>cap &lt; needed</code>, grow: repeat <code>cap = cap + cap/2 + ' +
			'8</code> (integer division) until <code>cap ≥ needed</code> — counting ' +
			'<strong>one</strong> reallocation for that append, however many loop steps ' +
			'the rule takes. From zero the capacities run 8, 20, 38, 65, 105…</li>' +
			'<li><strong>Why ×1.5 + 8.</strong> The geometric factor makes total copy ' +
			'work over n appends O(n) — amortized O(1) per append. The <code>+8</code> ' +
			'floor is for tiny lists: pure ×1.5 from cap 1 would crawl through ' +
			'1, 2, 3, 4, 6, 9… reallocating constantly exactly where lists are most ' +
			'common. One additive pad buys small lists a working size in one step.</li>' +
			'<li><strong>toOwnedSlice.</strong> The list surrenders its buffer — ' +
			'returns what it held, then resets to empty. The caller now owns the ' +
			'memory; the list starts over from capacity 0. Ownership moves at an ' +
			'explicit, visible line of code.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Append</code> (apply the rule), <code>AppendN</code> ' +
			'(n single appends), <code>ToOwnedSlice</code> (return the surrendered ' +
			'<code>(Len, Cap)</code>, then zero every field), and ' +
			'<code>GrowthTrace(n)</code> — the sequence of distinct capacities a fresh ' +
			'list passes through during n appends (the initial 0 excluded): ' +
			'<code>GrowthTrace(1) = [8]</code>, <code>GrowthTrace(9) = [8 20]</code>.</p>' +
			'<div class="tip">Go’s <code>append</code> plays the same amortized game — ' +
			'doubling up to 256 elements, easing toward ×1.25 beyond — but a ' +
			'reallocation is invisible unless you compare <code>cap()</code> before ' +
			'and after. That invisibility is the trade this track keeps pointing at: ' +
			'Go hides the machinery to keep code short; Zig shows it so cost is never ' +
			'a surprise.</div>',
		],

		starter: [
			'package main',
			'',
			'// List models std.ArrayList\'s bookkeeping — the elements themselves',
			'// are irrelevant to the growth policy, so only the three counters',
			'// are kept. Reallocs counts appends that had to grow (allocate a',
			'// bigger buffer and copy), NOT the loop steps inside the growth rule.',
			'type List struct {',
			'	Len      int',
			'	Cap      int',
			'	Reallocs int',
			'}',
			'',
			'// Append adds one element, growing first if needed:',
			'//',
			'//   needed := l.Len + 1',
			'//   if l.Cap < needed: repeat l.Cap = l.Cap + l.Cap/2 + 8 until',
			'//   l.Cap >= needed, and count ONE reallocation for this append',
			'//   (however many loop steps the rule takes). Then Len++.',
			'//',
			'// From a fresh list the capacities run 8, 20, 38, 65, 105, ...',
			'func (l *List) Append() {',
			'	// your code here',
			'}',
			'',
			'// AppendN performs n single Appends (each applies the rule).',
			'func (l *List) AppendN(n int) {',
			'	// your code here',
			'}',
			'',
			'// ToOwnedSlice surrenders the buffer to the caller: it returns the',
			'// (Len, Cap) it held — positionally, in that order — and then resets',
			'// Len, Cap, and Reallocs all to 0. The next Append starts over from',
			'// an empty list.',
			'func (l *List) ToOwnedSlice() (int, int) {',
			'	// your code here',
			'	return 0, 0',
			'}',
			'',
			'// GrowthTrace appends n times to a fresh List and returns the',
			'// sequence of distinct capacities it passed through, excluding the',
			'// initial 0. GrowthTrace(1) = [8]; GrowthTrace(9) = [8, 20];',
			'// GrowthTrace(0) = [] (no appends, no capacities).',
			'func GrowthTrace(n int) []int {',
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
			'	state := func(l *List) string {',
			'		return fmt.Sprintf("len=%d cap=%d reallocs=%d", l.Len, l.Cap, l.Reallocs)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"GrowthTrace(1): the very first append triggers the 0 -> 8 grow (the +8 floor at work)",',
			'			"[8]",',
			'			func() string { return fmt.Sprint(GrowthTrace(1)) }},',
			'		{"GrowthTrace(9): appends 2..8 ride the spare capacity; the 9th forces 8 -> 20",',
			'			"[8 20]",',
			'			func() string { return fmt.Sprint(GrowthTrace(9)) }},',
			'		{"GrowthTrace(50): the full staircase — 20+10+8=38, then 38+19+8=65 covers 50",',
			'			"[8 20 38 65]",',
			'			func() string { return fmt.Sprint(GrowthTrace(50)) }},',
			'		{"GrowthTrace(0): no appends means no capacities at all",',
			'			"[]",',
			'			func() string { return fmt.Sprint(GrowthTrace(0)) }},',
			'		{"one Append on a fresh list: len 1, cap 8, exactly one reallocation",',
			'			"len=1 cap=8 reallocs=1",',
			'			func() string { l := &List{}; l.Append(); return state(l) }},',
			'		{"AppendN(20): 20 elements fill cap 20 exactly — still only two reallocations",',
			'			"len=20 cap=20 reallocs=2",',
			'			func() string { l := &List{}; l.AppendN(20); return state(l) }},',
			'		{"the 21st append breaks cap 20: third reallocation, cap jumps to 38",',
			'			"len=21 cap=38 reallocs=3",',
			'			func() string { l := &List{}; l.AppendN(21); return state(l) }},',
			'		{"ToOwnedSlice: returns the surrendered (Len, Cap), then the list is fully reset",',
			'			"owned=21,38 | len=0 cap=0 reallocs=0",',
			'			func() string {',
			'				l := &List{}',
			'				l.AppendN(21)',
			'				length, capacity := l.ToOwnedSlice()',
			'				return fmt.Sprintf("owned=%d,%d | %s", length, capacity, state(l))',
			'			}},',
			'		{"appending after ToOwnedSlice starts the staircase over from zero",',
			'			"len=9 cap=20 reallocs=2",',
			'			func() string {',
			'				l := &List{}',
			'				l.AppendN(21)',
			'				l.ToOwnedSlice()',
			'				l.AppendN(9)',
			'				return state(l)',
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
			'// List models std.ArrayList\'s bookkeeping: length, capacity, and how',
			'// many appends had to reallocate. The elements are irrelevant to the',
			'// growth policy, so they are not stored — the counters ARE the model.',
			'type List struct {',
			'	Len      int',
			'	Cap      int',
			'	Reallocs int',
			'}',
			'',
			'// Append adds one element, growing capacity first when it is full.',
			'//',
			'// The growth rule is cap = cap + cap/2 + 8: a 1.5x geometric factor',
			'// (which makes total copy work over n appends a geometric series,',
			'// i.e. O(n) overall and amortized O(1) per append) plus an additive',
			'// 8 so tiny lists reach a useful size in one step instead of',
			'// crawling through 1, 2, 3, 4...',
			'func (l *List) Append() {',
			'	needed := l.Len + 1',
			'	if l.Cap < needed {',
			'		// The loop expresses the rule\'s contract — grow until the',
			'		// request fits. For single appends one step always suffices',
			'		// (cap + cap/2 + 8 > cap + 1), but the loop is what a real',
			'		// ensureTotalCapacity does, because a bulk reserve can demand',
			'		// more than one step\'s worth of growth.',
			'		for l.Cap < needed {',
			'			l.Cap = l.Cap + l.Cap/2 + 8',
			'		}',
			'		// One reallocation per GROWING append, counted outside the',
			'		// loop: however far capacity ran, the allocator was asked for',
			'		// a new buffer exactly once and the elements copied once.',
			'		l.Reallocs++',
			'	}',
			'	l.Len++',
			'}',
			'',
			'// AppendN is n single appends. Deliberately NOT a bulk reserve: the',
			'// point of the model is watching the per-append rule fire, and a',
			'// real appendSlice would take the ensureTotalCapacity fast path and',
			'// change the reallocation count.',
			'func (l *List) AppendN(n int) {',
			'	for i := 0; i < n; i++ {',
			'		l.Append()',
			'	}',
			'}',
			'',
			'// ToOwnedSlice models Zig\'s explicit ownership transfer: the list',
			'// hands its buffer to the caller and RESETS itself. Reading the old',
			'// values before zeroing is the whole dance — after the reset the',
			'// list has genuinely forgotten the buffer, which is what guarantees',
			'// a single owner at every moment (the aliasing hazard Go\'s "the',
			'// slice escapes, the GC will sort it out" approach never names).',
			'func (l *List) ToOwnedSlice() (int, int) {',
			'	length := l.Len',
			'	capacity := l.Cap',
			'	l.Len = 0',
			'	l.Cap = 0',
			'	l.Reallocs = 0',
			'	return length, capacity',
			'}',
			'',
			'// GrowthTrace records the distinct capacities a fresh list passes',
			'// through over n appends. It watches Cap around each Append rather',
			'// than re-deriving the formula: the trace reports what the machine',
			'// DID, so a bug in Append shows up as a wrong trace instead of being',
			'// masked by a second copy of the arithmetic.',
			'func GrowthTrace(n int) []int {',
			'	l := &List{}',
			'	trace := []int{}',
			'	for i := 0; i < n; i++ {',
			'		before := l.Cap',
			'		l.Append()',
			'		if l.Cap != before {',
			'			trace = append(trace, l.Cap)',
			'		}',
			'	}',
			'	return trace',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The amortized argument, concretely</h3>' +
			'<p>Your trace for 50 appends is <code>[8 20 38 65]</code> — four ' +
			'reallocations, copying at most 8+20+38 = 66 elements in total across all ' +
			'of them. Grow geometrically and the copies form a geometric series ' +
			'bounded by a constant times n; grow by a <em>fixed</em> increment instead ' +
			'and you reallocate Θ(n) times for Θ(n²) total copy work. Every growable ' +
			'buffer you have ever used — C++ <code>vector</code> (×2 or ×1.5), Python ' +
			'<code>list</code> (×1.125 + k), Go slices, Zig’s ArrayList — is the same ' +
			'theorem wearing different constants. The <code>+8</code> floor is the ' +
			'practical seasoning: most lists in real programs hold a handful of ' +
			'elements, and the additive pad gets them to a working size in one ' +
			'allocation instead of four.</p>' +
			'<h3>Go’s version of the same policy</h3>' +
			'<p>Go’s <code>growslice</code> doubles capacity up to 256 elements, then ' +
			'eases toward ×1.25 — same amortized argument, different constants. The ' +
			'difference this track cares about is <em>visibility</em>: in Go a ' +
			'reallocation is silent, and the classic bug is silent with it — append to ' +
			'a shared slice and, depending on whether spare capacity happened to ' +
			'exist, your write either lands in memory another slice header still sees ' +
			'or vanishes into a fresh buffer nobody else holds. Zig’s ' +
			'<code>try list.append</code> can’t hide any of that: the possible ' +
			'reallocation is in the signature (it can fail with ' +
			'<code>OutOfMemory</code>), and the buffer’s owner is always exactly one ' +
			'of “the list” or “you.”</p>' +
			'<h3>toOwnedSlice as an ownership idiom</h3>' +
			'<p>The build-then-surrender pattern — accumulate into an ArrayList, ' +
			'<code>toOwnedSlice</code> at the end — is Zig’s standard way to return a ' +
			'variable-length result. The reset-to-empty is not bookkeeping trivia: it ' +
			'is what makes ownership single. After the call, freeing the slice is the ' +
			'caller’s job and the list provably holds nothing (your model forgets even ' +
			'<code>Reallocs</code> — the history belongs to the surrendered buffer). ' +
			'Go solves the same problem by not having it: return any slice, share it ' +
			'freely, the GC collects whatever falls out of reach. Convenient — and ' +
			'precisely the machinery Zig’s no-hidden-costs creed refuses to buy.</p>',
		],
		complexity: { time: 'O(1) amortized per Append — geometric growth bounds total copy work at O(n)', space: 'O(1) for the model; O(cap) for the real list it stands for' },
	});
})();
