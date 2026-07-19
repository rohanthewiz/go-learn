/* Delegated Properties — Kotlin: Functions & Delegation (Medium). `by lazy`,
 * Delegates.observable, Delegates.vetoable, and lateinit — four ways a Kotlin
 * property can intercept its own reads and writes. The learner implements the
 * four protocols in Go, and the harness pins the timing rules that matter:
 * lazy runs its block exactly once and only on first read, observable fires
 * AFTER the write (and never dedupes), vetoable runs BEFORE the write and can
 * block it, lateinit throws on read-before-write.
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// The write path through the two callback delegates: vetoable's predicate
	// sits BEFORE the backing field (it can bounce the write), observable's
	// callback sits AFTER it (the change is already real). Marker id
	// namespaced (dgArrowAndDP) because every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 190" width="560" height="190" role="img" aria-label="a write flows through the vetoable predicate before the backing field and the observable callback after it">' +
		'<text x="20" y="24" class="lbl">where each delegate sits on the write path: name = value</text>' +
		'<rect x="20" y="60" width="110" height="44" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="75" y="87" text-anchor="middle">write v</text>' +
		'<rect x="180" y="60" width="140" height="44" rx="6" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="250" y="81" text-anchor="middle">veto(old, v)?</text>' +
		'<text x="250" y="97" text-anchor="middle" class="lbl">BEFORE — can block</text>' +
		'<rect x="370" y="60" width="80" height="44" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="410" y="87" text-anchor="middle">field</text>' +
		'<rect x="300" y="132" width="230" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="415" y="153" text-anchor="middle">onChange(old, v)</text>' +
		'<text x="415" y="169" text-anchor="middle" class="lbl">AFTER — change already real</text>' +
		'<path d="M 130 82 L 176 82" fill="none" stroke="var(--muted)" stroke-width="1.6" marker-end="url(#dgArrowAndDP)"/>' +
		'<path d="M 320 82 L 366 82" fill="none" stroke="var(--muted)" stroke-width="1.6" marker-end="url(#dgArrowAndDP)"/>' +
		'<text x="343" y="74" text-anchor="middle" class="lbl" style="fill:var(--ok)">true</text>' +
		'<path d="M 250 108 L 250 154 L 130 154" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="130" y="146" text-anchor="middle" class="lbl" style="fill:var(--warn)">false: field untouched</text>' +
		'<path d="M 410 108 L 410 128" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowAndDP)"/>' +
		'<defs><marker id="dgArrowAndDP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--muted)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'delegated-properties',
		title: 'Property Delegation: lazy, observable, vetoable',
		nav: 'delegated properties',
		difficulty: 'Medium',
		category: 'Kotlin: Functions & Delegation',
		task: 'Implement the four delegate protocols — Lazy (init exactly once, on first read), Observable (callback after every write), Vetoable (predicate before the write), Lateinit (panic on read-before-write).',

		prose: [
			'<h2>Property Delegation: lazy, observable, vetoable</h2>' +
			'<p>A cold-start trace shows your <code>Application.onCreate</code> ' +
			'opening a database, parsing a config file, and building three singletons ' +
			'the user may never touch. The Kotlin fix is one keyword: hand the ' +
			'property to a <em>delegate</em> with <code>by</code>, and the delegate\'s ' +
			'code runs on every read and write of the property instead of a plain ' +
			'backing field:</p>',
			{ lang: 'kotlin', code: 'val db: AppDatabase by lazy {\n    Room.databaseBuilder(ctx, AppDatabase::class.java, "app").build()\n}\n\nvar query: String by Delegates.observable("") { _, old, new ->\n    Log.d("Search", "$old -> $new")   // fires AFTER the value changed\n}\n\nvar volume: Int by Delegates.vetoable(50) { _, _, new ->\n    new in 0..100                     // runs BEFORE — false rejects the write\n}\n\nlateinit var analytics: Analytics     // no delegate: a promise to assign later' },
			'<p>Each of these is a small, precisely-timed protocol, and the timing is ' +
			'exactly what people get wrong in review:</p>' +
			'<ul>' +
			'<li><strong><code>lazy</code></strong> — the block runs on the ' +
			'<em>first read</em>, exactly once, and the result is cached forever. ' +
			'Construction costs nothing; if nobody reads the property, the block ' +
			'never runs at all.</li>' +
			'<li><strong><code>observable</code></strong> — the callback fires ' +
			'<em>after</em> the assignment, receiving old and new. It does ' +
			'<strong>not</strong> dedupe: setting the same value again fires again ' +
			'(that filtering job belongs to StateFlow, later in this track).</li>' +
			'<li><strong><code>vetoable</code></strong> — the predicate runs ' +
			'<em>before</em> the assignment; returning <code>true</code> accepts the ' +
			'write, <code>false</code> leaves the old value in place, silently.</li>' +
			'<li><strong><code>lateinit</code></strong> — not a delegate at all, and ' +
			'that is the point of the contrast: no caching, no thread-safety, ' +
			'<code>var</code> only, and a read before the first write throws ' +
			'<code>UninitializedPropertyAccessException: lateinit property db has ' +
			'not been initialized</code> — a crash you will meet in Play Console the ' +
			'first time an injected dependency races a callback.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the four protocols over <code>int</code> values: ' +
			'<code>Lazy</code> (init exactly once, on first <code>Value()</code>), ' +
			'<code>Observable</code> (callback after every <code>Set</code>, old and ' +
			'new, no dedupe), <code>Vetoable</code> (predicate before the write, ' +
			'<code>true</code> accepts), and <code>Lateinit</code> (<code>Get</code> ' +
			'panics with the exact Kotlin message before the first <code>Set</code> — ' +
			'and tracks set-ness with a flag, because <code>0</code> is a legal ' +
			'value). The harness spies on timing with closures — it counts init ' +
			'calls and reads the property from <em>inside</em> the callbacks, so ' +
			'before-vs-after is directly observable, not taken on faith.</p>' +
			'<div class="tip">In Go you would write the lazy pattern with ' +
			'<code>sync.Once</code>; Kotlin\'s <code>lazy</code> is exactly a ' +
			'<code>Once</code> plus a cached result (its default mode even takes a ' +
			'lock on first evaluation, like <code>Once</code> does). The delegate ' +
			'machinery is just the compiler rewriting <code>x</code> into ' +
			'<code>delegate.getValue(...)</code> — operator conventions, no runtime ' +
			'magic.</div>',
		],

		starter: [
			'package main',
			'',
			'// Lazy models `val x by lazy { ... }`: init runs on the FIRST Value()',
			'// call only; the result is cached and init is never called again.',
			'// Construction alone must not run init.',
			'type Lazy struct {',
			'	init func() int',
			'	done bool',
			'	v    int',
			'}',
			'',
			'func NewLazy(init func() int) *Lazy {',
			'	return &Lazy{init: init}',
			'}',
			'',
			'func (l *Lazy) Value() int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Observable models `var x by Delegates.observable(initial) { ... }`:',
			'// Set stores the value FIRST, then fires onChange(old, new) — the',
			'// callback observes the property already changed. It fires on EVERY',
			'// Set, even when old == new (Kotlin does not dedupe).',
			'type Observable struct {',
			'	v        int',
			'	onChange func(oldV, newV int)',
			'}',
			'',
			'func NewObservable(initial int, onChange func(oldV, newV int)) *Observable {',
			'	return &Observable{v: initial, onChange: onChange}',
			'}',
			'',
			'func (o *Observable) Get() int {',
			'	return o.v',
			'}',
			'',
			'func (o *Observable) Set(v int) {',
			'	// your code here',
			'}',
			'',
			'// Vetoable models `var x by Delegates.vetoable(initial) { ... }`: the',
			'// predicate runs BEFORE the assignment, seeing (old, new) while the',
			'// property still holds old. Returning true ACCEPTS the write; false',
			'// leaves the value unchanged, silently.',
			'type Vetoable struct {',
			'	v    int',
			'	veto func(oldV, newV int) bool',
			'}',
			'',
			'func NewVetoable(initial int, veto func(oldV, newV int) bool) *Vetoable {',
			'	return &Vetoable{v: initial, veto: veto}',
			'}',
			'',
			'func (vt *Vetoable) Get() int {',
			'	return vt.v',
			'}',
			'',
			'func (vt *Vetoable) Set(v int) {',
			'	// your code here',
			'}',
			'',
			'// Lateinit models `lateinit var db: T`: Get before the first Set must',
			'// panic with a message containing exactly',
			'//   "lateinit property db has not been initialized"',
			'// (Kotlin\'s UninitializedPropertyAccessException text). After Set,',
			'// Get returns the stored value. Note the flag: 0 is a legal value,',
			'// so "is it set?" cannot be inferred from v itself.',
			'type Lateinit struct {',
			'	set bool',
			'	v   int',
			'}',
			'',
			'func NewLateinit() *Lateinit {',
			'	return &Lateinit{}',
			'}',
			'',
			'func (l *Lateinit) Set(v int) {',
			'	// your code here',
			'}',
			'',
			'func (l *Lateinit) Get() int {',
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
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"lazy: constructing the delegate runs NOTHING — the block waits for the first read",',
			'			"inits before first read=0, after=1",',
			'			func() string {',
			'				count := 0',
			'				l := NewLazy(func() int { count++; return 7 })',
			'				before := count',
			'				_ = l.Value()',
			'				return fmt.Sprintf("inits before first read=%d, after=%d", before, count)',
			'			}},',
			'		{"lazy: three reads, one initialization — the result is cached and the block never re-runs",',
			'			"values=42,42,42 inits=1",',
			'			func() string {',
			'				count := 0',
			'				l := NewLazy(func() int { count++; return 42 })',
			'				a := l.Value()',
			'				b := l.Value()',
			'				c := l.Value()',
			'				return fmt.Sprintf("values=%d,%d,%d inits=%d", a, b, c, count)',
			'			}},',
			'		{"observable: onChange fires AFTER the write — reading the property inside the callback sees the NEW value",',
			'			"1->5 get=5",',
			'			func() string {',
			'				log := []string{}',
			'				var o *Observable',
			'				o = NewObservable(1, func(oldV, newV int) {',
			'					log = append(log, fmt.Sprintf("%d->%d get=%d", oldV, newV, o.Get()))',
			'				})',
			'				o.Set(5)',
			'				return strings.Join(log, " ")',
			'			}},',
			'		{"observable does NOT dedupe: setting the current value again still fires — distinct-until-changed is StateFlow\'s job, not this delegate\'s",',
			'			"calls=2 value=3",',
			'			func() string {',
			'				calls := 0',
			'				o := NewObservable(3, func(oldV, newV int) { calls++ })',
			'				o.Set(3)',
			'				o.Set(3)',
			'				return fmt.Sprintf("calls=%d value=%d", calls, o.Get())',
			'			}},',
			'		{"observable: a sequence of writes reports each old/new pair, in order",',
			'			"10->20 20->20 20->5",',
			'			func() string {',
			'				log := []string{}',
			'				o := NewObservable(10, func(oldV, newV int) {',
			'					log = append(log, fmt.Sprintf("%d->%d", oldV, newV))',
			'				})',
			'				o.Set(20)',
			'				o.Set(20)',
			'				o.Set(5)',
			'				return strings.Join(log, " ")',
			'			}},',
			'		{"vetoable: the predicate rejects (returns false) — the write silently never happens",',
			'			"10",',
			'			func() string {',
			'				vt := NewVetoable(10, func(oldV, newV int) bool { return newV >= 0 })',
			'				vt.Set(-4)',
			'				return fmt.Sprintf("%d", vt.Get())',
			'			}},',
			'		{"vetoable: the predicate runs BEFORE the assignment — Get inside the predicate still sees the OLD value",',
			'			"old=10 cur=10 new=25 final=25",',
			'			func() string {',
			'				seen := ""',
			'				var vt *Vetoable',
			'				vt = NewVetoable(10, func(oldV, newV int) bool {',
			'					seen = fmt.Sprintf("old=%d cur=%d new=%d", oldV, vt.Get(), newV)',
			'					return true',
			'				})',
			'				vt.Set(25)',
			'				return seen + fmt.Sprintf(" final=%d", vt.Get())',
			'			}},',
			'		{"observable: constructing the delegate with its initial value fires NOTHING — only assignments notify",',
			'			"calls at construction=0",',
			'			func() string {',
			'				calls := 0',
			'				_ = NewObservable(99, func(oldV, newV int) { calls++ })',
			'				return fmt.Sprintf("calls at construction=%d", calls)',
			'			}},',
			'		{"lateinit: after Set, Get just works — even for the zero value, because set-ness is a flag, not a sentinel",',
			'			"first=0 then=9",',
			'			func() string {',
			'				l := NewLateinit()',
			'				l.Set(0)',
			'				first := l.Get()',
			'				l.Set(9)',
			'				return fmt.Sprintf("first=%d then=%d", first, l.Get())',
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
			'// Lazy models `val x by lazy { ... }`. A one-shot memoizer: the Go',
			'// analogue is sync.Once plus a cached result, and Kotlin\'s default',
			'// LazyThreadSafetyMode.SYNCHRONIZED is literally that (a lock around',
			'// the first evaluation). Everything here is single-threaded, so the',
			'// protocol reduces to a done flag guarding one call.',
			'type Lazy struct {',
			'	init func() int',
			'	done bool',
			'	v    int',
			'}',
			'',
			'func NewLazy(init func() int) *Lazy {',
			'	// Construction stores the closure and nothing else — laziness',
			'	// means the cost lives at the first READ, not at declaration.',
			'	// That deferral is the entire cold-start win.',
			'	return &Lazy{init: init}',
			'}',
			'',
			'func (l *Lazy) Value() int {',
			'	if !l.done {',
			'		l.v = l.init()',
			'		l.done = true',
			'		// Drop the closure so anything it captured can be collected —',
			'		// Kotlin\'s SynchronizedLazyImpl nulls its initializer for the',
			'		// same reason (lazy blocks love to capture Contexts). The',
			'		// cached value is now the only state.',
			'		l.init = nil',
			'	}',
			'	return l.v',
			'}',
			'',
			'// Observable models `var x by Delegates.observable(initial) { ... }`.',
			'// Kotlin\'s ObservableProperty calls afterChange once the backing',
			'// field already holds the new value — so the order below (store,',
			'// THEN notify) is the contract, not an implementation accident:',
			'// listeners may re-read the property and must see the new state.',
			'type Observable struct {',
			'	v        int',
			'	onChange func(oldV, newV int)',
			'}',
			'',
			'func NewObservable(initial int, onChange func(oldV, newV int)) *Observable {',
			'	// The initial value does NOT fire the callback — only assignments',
			'	// do. (Same in Kotlin: the delegate is constructed, not "set".)',
			'	return &Observable{v: initial, onChange: onChange}',
			'}',
			'',
			'func (o *Observable) Get() int {',
			'	return o.v',
			'}',
			'',
			'func (o *Observable) Set(v int) {',
			'	oldV := o.v',
			'	// Write first: by the time user code hears about the change, the',
			'	// change is already real.',
			'	o.v = v',
			'	// No oldV != v guard — Kotlin\'s observable notifies on every',
			'	// assignment. Deduping is a policy decision this delegate refuses',
			'	// to make for you (StateFlow makes the opposite choice).',
			'	o.onChange(oldV, v)',
			'}',
			'',
			'// Vetoable models `var x by Delegates.vetoable(initial) { ... }`.',
			'// The same delegate class as Observable in Kotlin, opposite hook:',
			'// beforeChange runs while the field still holds the OLD value, and a',
			'// false return aborts the store entirely — validation, not reaction.',
			'type Vetoable struct {',
			'	v    int',
			'	veto func(oldV, newV int) bool',
			'}',
			'',
			'func NewVetoable(initial int, veto func(oldV, newV int) bool) *Vetoable {',
			'	// The initial value is never vetoed — the predicate guards',
			'	// CHANGES, and construction is not a change.',
			'	return &Vetoable{v: initial, veto: veto}',
			'}',
			'',
			'func (vt *Vetoable) Get() int {',
			'	return vt.v',
			'}',
			'',
			'func (vt *Vetoable) Set(v int) {',
			'	// Predicate BEFORE the write: it can re-read the property (still',
			'	// the old value) and sees both sides of the proposed change.',
			'	// true accepts — matching Kotlin, where the lambda answers the',
			'	// question "allow this change?".',
			'	if !vt.veto(vt.v, v) {',
			'		return // rejected: the old value stays, and nothing signals it',
			'	}',
			'	vt.v = v',
			'}',
			'',
			'// Lateinit models `lateinit var`. Not a delegate — the Kotlin',
			'// compiler just emits a null check on every read of the backing',
			'// field. The explicit set flag matters because 0 is a perfectly',
			'// legal value: like Kotlin (which uses null as the unset sentinel',
			'// and therefore forbids lateinit on primitives), "assigned yet?"',
			'// must be tracked out of band, never inferred from the value.',
			'type Lateinit struct {',
			'	set bool',
			'	v   int',
			'}',
			'',
			'func NewLateinit() *Lateinit {',
			'	return &Lateinit{}',
			'}',
			'',
			'func (l *Lateinit) Set(v int) {',
			'	l.v = v',
			'	l.set = true',
			'}',
			'',
			'func (l *Lateinit) Get() int {',
			'	if !l.set {',
			'		// The exact production message: Kotlin throws',
			'		// UninitializedPropertyAccessException with this text, and',
			'		// crash-reporting tools group whole clusters on it.',
			'		panic("lateinit property db has not been initialized")',
			'	}',
			'	return l.v',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What <code>by</code> actually does</h3>' +
			'<p>There is no runtime magic: <code>val x by d</code> compiles reads of ' +
			'<code>x</code> into <code>d.getValue(thisRef, ::x)</code> and writes ' +
			'into <code>d.setValue(thisRef, ::x, v)</code> — plain operator-convention ' +
			'method calls, resolved at compile time. <code>lazy {}</code> returns a ' +
			'<code>Lazy&lt;T&gt;</code> whose <code>getValue</code> is the memoizer ' +
			'you just wrote; <code>Delegates.observable</code> and ' +
			'<code>vetoable</code> are one class (<code>ObservableProperty</code>) ' +
			'with two hooks — <code>beforeChange</code> (can veto, field still old) ' +
			'and <code>afterChange</code> (field already new). Once you have ' +
			'implemented both hooks yourself, the timing rules stop being trivia ' +
			'and start being the obvious consequence of where each hook sits.</p>' +
			'<h3>Where each one earns its keep on Android</h3>' +
			'<ul>' +
			'<li><strong><code>by lazy</code></strong> is the standard cold-start ' +
			'tool: Room databases, Retrofit services, anything expensive hangs off ' +
			'a lazy property so launch pays nothing. The classic review catch: a ' +
			'<code>by lazy</code> in a singleton capturing an Activity ' +
			'<code>context</code> — the closure (and the Activity behind it) lives ' +
			'until first read, or forever if the read never comes. Kotlin nulls the ' +
			'initializer after evaluation for exactly this reason; so does the ' +
			'solution.</li>' +
			'<li><strong><code>observable</code></strong> shows up in settings ' +
			'objects and adapters (<code>var items by Delegates.observable(...)</code> ' +
			'calling <code>notifyDataSetChanged</code>). Because it never dedupes, ' +
			're-assigning the same list re-renders the world — teams either add the ' +
			'equality check inside the callback or move to StateFlow, which dedupes ' +
			'by contract.</li>' +
			'<li><strong><code>vetoable</code></strong> is validation at the ' +
			'property boundary — clamping a volume, refusing an illegal state ' +
			'transition. Its silence on rejection is the sharp edge: the caller ' +
			'gets no error, the write just vanishes. Fine for UI knobs; wrong for ' +
			'anything that must report failure.</li>' +
			'<li><strong><code>lateinit</code></strong> is the contrast that makes ' +
			'delegation legible: no laziness, no callback, just a compiler-inserted ' +
			'check. It exists for dependency injection and test fixtures, where the ' +
			'value provably arrives before use — and every Play Console has an ' +
			'<code>UninitializedPropertyAccessException</code> cluster proving the ' +
			'"provably" wrong: a listener fired before <code>onCreate</code> ' +
			'finished wiring, a test that forgot its <code>@Before</code>. ' +
			'<code>::x.isInitialized</code> exists as the escape hatch, and its ' +
			'appearance in a diff is usually a design smell worth flagging.</li>' +
			'</ul>' +
			'<h3>The interview one-liner</h3>' +
			'<p>"observable or vetoable?" is really "after or before?": one reacts ' +
			'to a change that already happened, the other gatekeeps a change that ' +
			'might not happen. And "lazy or lateinit?" is "who initializes?": lazy ' +
			'owns its initialization (pull-based, cached, thread-safe by default); ' +
			'lateinit outsources it to someone else\'s timeline (push-based, ' +
			'unguarded) — which is why one returns a value and the other throws.</p>',
		],
		complexity: { time: 'O(1) per property access — each protocol adds a flag check or one callback', space: 'O(1) per delegate' },
	});
})();
