/* Closures & Capture Lists — Swift: Memory & Closures (Medium). The three
 * capture behaviors every iOS code review argues about: Swift closures
 * capture variables BY REFERENCE (a shared heap box, so two closures over one
 * var see each other's writes), a capture list `[x]` copies the value AT
 * CREATION, and `[weak self]` reads nil once the referent deallocates. The
 * harness pins the live-vs-snapshot head-to-head, shared-box counters, and
 * the zeroing-weak guarantee (every registered weak ref nils on Dealloc).
 * The unowned-after-dealloc crash is a prose/comment contract only — yaegi
 * writes recovered panics to stderr, so no harness case may panic.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// The whole item in one picture: the default capture shares ONE heap box
	// (both closures point at it), a capture list copies the value into the
	// closure at creation, so the later `total += 10` is invisible to it.
	// Marker id namespaced (dgArrowIOSCC) because every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 224" width="560" height="224" role="img" aria-label="default capture: two closures share one heap box holding total; a capture list closure holds its own copied value">' +
		'<text x="20" y="24" class="lbl">what a closure holds: the BOX (default) or a COPY (capture list)</text>' +
		// the shared heap box
		'<rect x="220" y="52" width="130" height="48" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="285" y="73" text-anchor="middle">heap box</text>' +
		'<text x="285" y="91" text-anchor="middle" class="lbl">total = 10</text>' +
		// two default-capture closures pointing at the same box
		'<rect x="20" y="52" width="130" height="40" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="85" y="77" text-anchor="middle">inc { total += 1 }</text>' +
		'<rect x="20" y="120" width="130" height="40" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="85" y="145" text-anchor="middle">live { total }</text>' +
		'<path d="M 150 72 L 216 74" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowIOSCC)"/>' +
		'<path d="M 150 140 C 190 140 200 110 216 92" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowIOSCC)"/>' +
		'<text x="183" y="122" class="lbl" style="fill:var(--accent)">same box</text>' +
		// the capture-list closure with its own frozen copy
		'<rect x="400" y="120" width="140" height="64" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="470" y="141" text-anchor="middle">snap { [total] in }</text>' +
		'<text x="470" y="159" text-anchor="middle" class="lbl" style="fill:var(--warn)">copy = 0 (frozen)</text>' +
		'<text x="470" y="175" text-anchor="middle" class="lbl">taken at CREATION</text>' +
		'<path d="M 350 84 C 400 96 420 104 448 116" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#dgArrowIOSCCw)"/>' +
		'<text x="404" y="92" class="lbl" style="fill:var(--warn)">copied once</text>' +
		'<text x="20" y="212" class="lbl">after total += 10:  inc/live see 10 — snap still answers 0</text>' +
		'<defs>' +
		'<marker id="dgArrowIOSCC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowIOSCCw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'closure-captures',
		title: 'Closures & Capture Lists',
		nav: 'closure captures',
		difficulty: 'Medium',
		category: 'Swift: Memory & Closures',
		task: 'Implement Swift\'s three capture behaviors: shared-box capture (MakeCounter, Live), the creation-time copy of a capture list (Snapshot), and a zeroing [weak self] handler (WeakRef/Dealloc/MakeOnTap).',

		prose: [
			'<h2>Closures &amp; Capture Lists</h2>' +
			'<p>You pop a detail screen and its <code>deinit</code> never prints. The ' +
			'memory-graph debugger shows the dismissed view controller still alive, ' +
			'held by a closure — which the view controller itself owns:</p>',
			{ lang: 'swift', code: 'final class DetailVC: UIViewController {\n    var onRefresh: (() -> Void)?\n\n    override func viewDidLoad() {\n        super.viewDidLoad()\n        onRefresh = {\n            self.reload()   // closure -> self (strong capture)\n        }                   // self.onRefresh -> closure: a cycle\n    }\n    deinit { print("deinit DetailVC") }   // never prints\n}' },
			'<p>The compiler even made the author type <code>self.</code> — that ' +
			'mandatory prefix inside escaping closures is Swift forcing you to ' +
			'acknowledge a capture is happening. To reason about the fix you need ' +
			'the three capture behaviors, and they are exactly three:</p>' +
			'<ul>' +
			'<li><strong>Default: capture by reference.</strong> A closure captures ' +
			'the <em>variable</em>, not its value. Swift promotes a captured ' +
			'<code>var</code> to a heap box, and every closure over it shares that ' +
			'box — mutations made anywhere are visible everywhere:</li>' +
			'</ul>',
			{ lang: 'swift', code: 'func makeCounter(step: Int) -> (inc: () -> Int, peek: () -> Int) {\n    var total = 0\n    return ({ total += step; return total },   // both closures close\n            { total })                          // over the SAME total\n}\nlet c = makeCounter(step: 1)\nc.inc()    // 1\nc.inc()    // 2\nc.peek()   // 2  — peek sees increments it never performed' },
			'<ul>' +
			'<li><strong>A capture list copies at creation.</strong> ' +
			'<code>[total]</code> declares a fresh constant inside the closure, ' +
			'initialized from <code>total</code> the moment the closure ' +
			'<em>expression</em> is evaluated — not when the closure is first ' +
			'called. Later writes to the variable are invisible to it:</li>' +
			'</ul>',
			{ lang: 'swift', code: 'var total = 0\nlet live = { total }              // captures the variable (the box)\nlet snap = { [total] in total }   // capture list: copies the value NOW\ntotal += 10\nprint(live())   // 10\nprint(snap())   // 0   — the copy from creation time' },
			'<ul>' +
			'<li><strong><code>[weak self]</code> captures an Optional.</strong> ' +
			'The closure holds a <em>weak</em> reference: it does not keep the ' +
			'object alive, and ARC <strong>zeroes</strong> it when the object ' +
			'deallocates — every weak reference to the object reads ' +
			'<code>nil</code> from that instant. The idiomatic guard turns "self ' +
			'is gone" into a clean early exit, and the leak above into two lines:</li>' +
			'</ul>',
			{ lang: 'swift', code: 'onRefresh = { [weak self] in\n    guard let self else { return }   // self deallocated: bail out\n    self.reload()\n}\n// pop the screen:\n// deinit DetailVC        <- prints now: the cycle is broken' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the three behaviors as a tiny closure-record model:</p>' +
			'<ul>' +
			'<li><code>MakeCounter(step)</code> — return <code>(inc, peek)</code> ' +
			'closing over <em>one</em> shared <code>total</code>: <code>inc</code> ' +
			'adds <code>step</code> and returns the new total, <code>peek</code> ' +
			'reads it without changing it.</li>' +
			'<li><code>Live(total)</code> / <code>Snapshot(total)</code> — the ' +
			'default capture vs the capture list: <code>Live</code> reads the ' +
			'variable\'s <em>current</em> value on every call; ' +
			'<code>Snapshot</code> copies it once, at creation.</li>' +
			'<li><code>WeakRef</code> / <code>Get</code> / <code>Dealloc</code> / ' +
			'<code>MakeOnTap</code> — the zeroing-weak machinery: ' +
			'<code>Dealloc</code> nils every weak reference registered to the ' +
			'object, and the <code>MakeOnTap</code> handler takes its weak ' +
			'reference at <em>creation</em>, then answers ' +
			'<code>"reloading &lt;name&gt;"</code> while self lives and ' +
			'<code>"self is gone"</code> after — a branch, never a crash.</li>' +
			'</ul>' +
			'<div class="tip">The third capture-list mode, <code>[unowned self]</code>, ' +
			'skips the Optional: same non-owning reference, but reading it after ' +
			'dealloc crashes with <code>Fatal error: Attempted to read an unowned ' +
			'reference but object 0x... was already deallocated</code>. Use it only ' +
			'when the closure provably cannot outlive the object; this model (and ' +
			'this harness) stays on the safe <code>weak</code> path.</div>',
		],

		starter: [
			'package main',
			'',
			'// ---- Part 1: the default capture is BY REFERENCE ---------------------',
			'',
			'// MakeCounter models the classic Swift demo:',
			'//',
			'//	func makeCounter(step: Int) -> (() -> Int, () -> Int) {',
			'//	    var total = 0',
			'//	    return ({ total += step; return total }, { total })',
			'//	}',
			'//',
			'// Both returned closures must close over the SAME total (Swift promotes',
			'// a captured var to one shared heap box). inc adds step and returns the',
			'// new total; peek returns the current total without changing it.',
			'func MakeCounter(step int) (func() int, func() int) {',
			'	// your code here',
			'	return func() int { return 0 }, func() int { return 0 }',
			'}',
			'',
			'// ---- Part 2: live capture vs capture list ----------------------------',
			'',
			'// Live models Swift\'s default `{ total }`: the closure captures the',
			'// VARIABLE (the box), so every call must observe the caller\'s current',
			'// value — including mutations made after the closure was created.',
			'func Live(total *int) func() int {',
			'	// your code here',
			'	return func() int { return 0 }',
			'}',
			'',
			'// Snapshot models a capture list `{ [total] in total }`: the value is',
			'// copied ONCE, when the closure is created. Mutations of the variable',
			'// after creation are invisible to the closure.',
			'func Snapshot(total *int) func() int {',
			'	// your code here',
			'	return func() int { return 0 }',
			'}',
			'',
			'// ---- Part 3: [weak self] and the zeroing guarantee -------------------',
			'',
			'// VC models a class instance (say, a view controller). weaks is the',
			'// model\'s ARC side table: every weak reference to this object registers',
			'// here so Dealloc can zero them all.',
			'type VC struct {',
			'	Name  string',
			'	weaks []*Weak',
			'}',
			'',
			'func NewVC(name string) *VC {',
			'	return &VC{Name: name}',
			'}',
			'',
			'// Weak models `weak var x: VC?` — a reference that does NOT keep its',
			'// referent alive and reads nil after the referent deallocates.',
			'type Weak struct {',
			'	ref *VC',
			'}',
			'',
			'// WeakRef creates a weak reference to v, registered with v so a later',
			'// Dealloc can zero it.',
			'func WeakRef(v *VC) *Weak {',
			'	// your code here',
			'	return &Weak{}',
			'}',
			'',
			'// Get reads the weak reference: the referent while it lives, nil after',
			'// it deallocated. (Reading a dead weak is SAFE — it is unowned that',
			'// crashes: "Fatal error: Attempted to read an unowned reference but',
			'// object 0x... was already deallocated". No unowned path exists in',
			'// this model, so nothing here may panic.)',
			'func (w *Weak) Get() *VC {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Dealloc models the object dying (last strong reference gone): every',
			'// weak reference registered to v must read nil from now on.',
			'func (v *VC) Dealloc() {',
			'	// your code here',
			'}',
			'',
			'// MakeOnTap models wiring a handler with a weak capture:',
			'//',
			'//	onTap = { [weak self] in',
			'//	    guard let self else { return "self is gone" }',
			'//	    return "reloading \\(self.name)"',
			'//	}',
			'//',
			'// The weak reference is taken at CLOSURE CREATION (capture lists',
			'// evaluate then, not at first call). While v lives the closure returns',
			'// "reloading <Name>"; after v.Dealloc() it returns "self is gone".',
			'func MakeOnTap(v *VC) func() string {',
			'	// your code here',
			'	return func() string { return "" }',
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
			'// fmtVC renders a possibly-nil weak read the way the cases pin it.',
			'func fmtVC(v *VC) string {',
			'	if v == nil {',
			'		return "nil"',
			'	}',
			'	return v.Name',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"makeCounter: inc and peek close over ONE shared total — peek sees increments it never performed",',
			'			"inc=1 inc=2 peek=2",',
			'			func() string {',
			'				inc, peek := MakeCounter(1)',
			'				return fmt.Sprintf("inc=%d inc=%d peek=%d", inc(), inc(), peek())',
			'			}},',
			'		{"each MakeCounter call makes a fresh box: two counters never interfere",',
			'			"a=3 b=10",',
			'			func() string {',
			'				aInc, _ := MakeCounter(1)',
			'				bInc, _ := MakeCounter(10)',
			'				aInc()',
			'				aInc()',
			'				a := aInc()',
			'				b := bInc()',
			'				return fmt.Sprintf("a=%d b=%d", a, b)',
			'			}},',
			'		{"the step is captured too: MakeCounter(5) counts by fives",',
			'			"5 10",',
			'			func() string {',
			'				inc, _ := MakeCounter(5)',
			'				return fmt.Sprintf("%d %d", inc(), inc())',
			'			}},',
			'		{"live capture (the Swift default): the closure reads the variable, so it sees a later += 10",',
			'			"before=0 after=10",',
			'			func() string {',
			'				total := 0',
			'				live := Live(&total)',
			'				before := live()',
			'				total += 10',
			'				return fmt.Sprintf("before=%d after=%d", before, live())',
			'			}},',
			'		{"capture list [total]: the copy is taken at closure creation — later writes are invisible",',
			'			"snap=3 var=13",',
			'			func() string {',
			'				total := 3',
			'				snap := Snapshot(&total)',
			'				total += 10',
			'				return fmt.Sprintf("snap=%d var=%d", snap(), total)',
			'			}},',
			'		{"head-to-head on one variable: live sees the += 10, the snapshot still answers 0",',
			'			"live=10 snap=0",',
			'			func() string {',
			'				total := 0',
			'				live := Live(&total)',
			'				snap := Snapshot(&total)',
			'				total += 10',
			'				return fmt.Sprintf("live=%d snap=%d", live(), snap())',
			'			}},',
			'		{"snapshot timing: it copies the value AS OF creation, not the variable\'s initial value",',
			'			"snap=7",',
			'			func() string {',
			'				total := 0',
			'				total += 7',
			'				snap := Snapshot(&total)',
			'				total++',
			'				return fmt.Sprintf("snap=%d", snap())',
			'			}},',
			'		{"[weak self] while self is alive: the guard binds and the body runs",',
			'			"reloading Detail",',
			'			func() string {',
			'				v := NewVC("Detail")',
			'				onTap := MakeOnTap(v)',
			'				return onTap()',
			'			}},',
			'		{"[weak self] after Dealloc: the closure takes the guard-else branch — a clean no-op, not a crash",',
			'			"before=reloading Detail after=self is gone",',
			'			func() string {',
			'				v := NewVC("Detail")',
			'				onTap := MakeOnTap(v)',
			'				before := onTap()',
			'				v.Dealloc()',
			'				return fmt.Sprintf("before=%s after=%s", before, onTap())',
			'			}},',
			'		{"zeroing weak: Get returns the object before Dealloc and nil after",',
			'			"before=Detail after=nil",',
			'			func() string {',
			'				v := NewVC("Detail")',
			'				w := WeakRef(v)',
			'				before := fmtVC(w.Get())',
			'				v.Dealloc()',
			'				return fmt.Sprintf("before=%s after=%s", before, fmtVC(w.Get()))',
			'			}},',
			'		{"EVERY weak ref to the object is zeroed — the side table nils them all, not just the first",',
			'			"w1=nil w2=nil",',
			'			func() string {',
			'				v := NewVC("Detail")',
			'				w1 := WeakRef(v)',
			'				w2 := WeakRef(v)',
			'				v.Dealloc()',
			'				return fmt.Sprintf("w1=%s w2=%s", fmtVC(w1.Get()), fmtVC(w2.Get()))',
			'			}},',
			'		{"Dealloc zeroes only ITS object\'s weak refs: a weak to a different VC is untouched",',
			'			"a=nil b=Feed",',
			'			func() string {',
			'				a := NewVC("Detail")',
			'				b := NewVC("Feed")',
			'				wa := WeakRef(a)',
			'				wb := WeakRef(b)',
			'				a.Dealloc()',
			'				return fmt.Sprintf("a=%s b=%s", fmtVC(wa.Get()), fmtVC(wb.Get()))',
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
			'// ---- Part 1: the default capture is BY REFERENCE ---------------------',
			'',
			'// MakeCounter: total is declared ONCE and both closures close over that',
			'// one variable. Go\'s closures capture variables — the compiler hoists',
			'// total to the heap because it escapes — which is exactly Swift\'s',
			'// model: a captured var becomes a shared, reference-counted heap box',
			'// (SIL calls the instruction alloc_box). Two closures over one var are',
			'// two references to one box, which is why peek observes inc\'s writes.',
			'func MakeCounter(step int) (func() int, func() int) {',
			'	total := 0',
			'	inc := func() int {',
			'		total += step',
			'		return total',
			'	}',
			'	peek := func() int {',
			'		return total',
			'	}',
			'	return inc, peek',
			'}',
			'',
			'// ---- Part 2: live capture vs capture list ----------------------------',
			'',
			'// Live: keep the POINTER, dereference at call time. Modeling Swift\'s',
			'// default capture with a *int is honest — the closure owns the box,',
			'// not a number, so every call reads whatever the variable holds now.',
			'func Live(total *int) func() int {',
			'	return func() int {',
			'		return *total',
			'	}',
			'}',
			'',
			'// Snapshot: dereference NOW, close over the copy. The whole semantics',
			'// of a capture list is this one line moving: *total evaluated at',
			'// CREATION instead of at call. Swift\'s [total] declares a fresh',
			'// constant initialized when the closure expression runs — after that,',
			'// the closure and the variable have nothing to do with each other.',
			'func Snapshot(total *int) func() int {',
			'	copied := *total',
			'	return func() int {',
			'		return copied',
			'	}',
			'}',
			'',
			'// ---- Part 3: [weak self] and the zeroing guarantee -------------------',
			'',
			'type VC struct {',
			'	Name  string',
			'	weaks []*Weak',
			'}',
			'',
			'func NewVC(name string) *VC {',
			'	return &VC{Name: name}',
			'}',
			'',
			'type Weak struct {',
			'	ref *VC',
			'}',
			'',
			'// WeakRef registers the new reference with its referent — the moral',
			'// equivalent of ARC\'s weak side table, where the runtime records every',
			'// weak reference so dealloc can find and zero them. The object owns',
			'// the list because dealloc is the only operation that needs it.',
			'func WeakRef(v *VC) *Weak {',
			'	w := &Weak{ref: v}',
			'	v.weaks = append(v.weaks, w)',
			'	return w',
			'}',
			'',
			'// Get is a plain read: alive means the pointer, dead means nil. No',
			'// liveness check happens here — Dealloc already rewrote the refs, so',
			'// a weak read is O(1) and cannot observe a half-dead object. That is',
			'// the real design too: ARC zeroes eagerly at dealloc rather than',
			'// making every weak load consult liveness.',
			'func (w *Weak) Get() *VC {',
			'	return w.ref',
			'}',
			'',
			'// Dealloc walks the side table and zeroes every registered reference —',
			'// ARC\'s "zeroing weak" guarantee: all weak refs to a dead object read',
			'// nil from the instant it dies, atomically from the program\'s point of',
			'// view. The list is cleared afterwards so the dead object does not',
			'// keep the Weak records themselves alive in the model.',
			'func (v *VC) Dealloc() {',
			'	for _, w := range v.weaks {',
			'		w.ref = nil',
			'	}',
			'	v.weaks = nil',
			'}',
			'',
			'// MakeOnTap: the capture list evaluates at closure CREATION, so the',
			'// weak reference is taken here — not lazily on first call. Note what',
			'// the returned closure deliberately does NOT hold: a *VC. Capturing v',
			'// directly would model a strong capture and rebuild the retain cycle',
			'// this idiom exists to break; everything after creation goes through',
			'// the weak record and its nil-after-dealloc contract.',
			'func MakeOnTap(v *VC) func() string {',
			'	self := WeakRef(v)',
			'	return func() string {',
			'		s := self.Get()',
			'		if s == nil {',
			'			// The guard-else branch: self deallocated between wiring',
			'			// the handler and the tap. A branch, never a crash — that',
			'			// safety is the entire argument for weak over unowned.',
			'			return "self is gone"',
			'		}',
			'		return "reloading " + s.Name',
			'	}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What the compiler actually builds</h3>' +
			'<p>A Swift closure that captures a <code>var</code> gets a heap box: ' +
			'SIL emits <code>alloc_box</code>, the variable moves into it, and both ' +
			'the enclosing scope and the closure hold references to the box. That ' +
			'is why <code>makeCounter</code>\'s two closures stay in sync after the ' +
			'enclosing function has <em>returned</em> — the stack frame is gone, ' +
			'the box is not. It is also why closures can extend object lifetimes ' +
			'by accident: the box is reference-counted like any object, and a ' +
			'captured <code>self</code> is a +1 on the real thing. Swift only pays ' +
			'for the box when a capture is actually mutated or escapes; a captured ' +
			'<code>let</code> of a value type is just copied into the closure — a ' +
			'capture list forces that copying behavior for a <code>var</code> too.</p>' +
			'<h3>Capture lists evaluate eagerly — that is their whole point</h3>' +
			'<p><code>[total]</code>, <code>[weak self]</code>, and ' +
			'<code>[x = expensive()]</code> all run when the closure ' +
			'<em>expression</em> is evaluated. This is the tool for the classic ' +
			'"my callback saw the wrong iteration" family of bugs — though modern ' +
			'Swift already gives each <code>for</code> iteration a fresh constant, ' +
			'so the textbook loop bug mostly survives in <code>while</code> loops ' +
			'and captured mutable accumulators. The eager evaluation is also why ' +
			'<code>[weak self]</code> takes its weak reference at wiring time: the ' +
			'closure can outlive the wiring scope and still safely ask "is self ' +
			'still around?" on every call.</p>' +
			'<h3>weak, unowned, and the side table</h3>' +
			'<p>The model\'s <code>weaks</code> slice is a faithful miniature of ' +
			'the real mechanism: ARC tracks weak references in a side table so ' +
			'that deallocation can <em>zero</em> them — that is the "zeroing weak ' +
			'reference" guarantee, and it is why <code>weak</code> variables must ' +
			'be Optional. <code>unowned</code> skips the Optional and most of the ' +
			'bookkeeping: cheaper and non-optional, but a read after dealloc traps ' +
			'with <code>Fatal error: Attempted to read an unowned reference but ' +
			'object 0x... was already deallocated</code>. The house rule most iOS ' +
			'teams converge on: <code>weak</code> by default; <code>unowned</code> ' +
			'only where lifetime containment is provable (a closure stored ' +
			'<em>by</em> the object it references and never handed out).</p>' +
			'<h3>Simplifications in this model</h3>' +
			'<p>Two disclosed simplifications. First, real ARC frees the object\'s ' +
			'memory at dealloc; the model\'s <code>Dealloc</code> only zeroes weak ' +
			'refs (Go\'s GC owns actual memory), so a strong <code>*VC</code> held ' +
			'elsewhere would still "work" here where Swift would have freed it — ' +
			'the retain-cycle item next in this track models refcounts properly. ' +
			'Second, <code>[weak self]</code> reads in real Swift race against ' +
			'deallocation on other threads (the side table takes a lock); this ' +
			'model is single-threaded, so zeroing is trivially atomic.</p>' +
			'<h3>Field notes</h3>' +
			'<ul>' +
			'<li><strong>Not every closure needs <code>[weak self]</code>.</strong> ' +
			'A non-escaping closure (most <code>map</code>/<code>filter</code> ' +
			'arguments) cannot outlive the call, and a cycle needs the object to ' +
			'(transitively) own the closure. Blanket <code>[weak self]</code> in a ' +
			'<code>UIView.animate</code> block is cargo cult — harmless, but it ' +
			'signals the author is pattern-matching, not reasoning about ' +
			'ownership.</li>' +
			'<li><strong>The <code>guard let self</code> dance</strong> (upgrading ' +
			'weak to strong for the closure body) exists so self cannot deallocate ' +
			'<em>mid-body</em>: the strong local pins it for the duration. ' +
			'Checking <code>self?.foo()</code> repeatedly instead allows each call ' +
			'to see a different liveness answer.</li>' +
			'<li><strong>In review</strong>, the question to ask about any stored ' +
			'closure is the one this item drills: who owns the closure, what does ' +
			'the closure capture, and is there a path from the captures back to ' +
			'the owner? If yes — capture list, weak, break the path.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(1) per closure call — a read or bump through one shared box; Dealloc is O(w) in registered weak refs', space: 'O(1) per closure — one box reference or one copied value' },
	});
})();
