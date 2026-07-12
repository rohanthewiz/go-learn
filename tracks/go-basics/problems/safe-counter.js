/* Mutexes: Safe Counter — Concurrency (Medium). The shared-memory side of
 * Go concurrency: when goroutines touch the SAME data, channels give way to
 * sync.Mutex. A map guarded by a lock is the canonical example because an
 * unguarded concurrent map write is not a wrong answer — it is a runtime
 * crash ("fatal error: concurrent map writes") that no recover() catches.
 *
 * Honesty constraint baked into the prose: this sandbox is single-threaded
 * and cooperatively scheduled, so a lock-free impl can pass these tests
 * here while being fatally wrong on real hardware. The tests check
 * correctness; the -race discussion carries the rest.
 */
(function () {
	'use strict';
	var T = GoLearnGoBasics;

	// Two goroutines, one map, the mutex as the single doorway.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 190" width="540" height="190" role="img" aria-label="two goroutines both want to write the shared map; the mutex admits one at a time, the other waits at Lock">' +
		'<text x="20" y="24" class="lbl">one doorway to the data: Lock() admits a single goroutine at a time</text>' +
		'<rect x="30" y="52" width="120" height="38" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="90" y="76" text-anchor="middle" class="lbl">goroutine A</text>' +
		'<rect x="30" y="120" width="120" height="38" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="90" y="144" text-anchor="middle" class="lbl">goroutine B</text>' +
		'<path d="M 150 71 L 226 92" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowGBSC)"/>' +
		'<path d="M 150 139 L 226 112" stroke="var(--err-edge)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<text x="176" y="146" class="lbl" style="fill:var(--err-fg)">waits at Lock()</text>' +
		'<rect x="230" y="82" width="110" height="40" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="285" y="107" text-anchor="middle">mu.Lock()</text>' +
		'<path d="M 340 102 L 396 102" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowGBSC)"/>' +
		'<rect x="400" y="76" width="116" height="52" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="458" y="99" text-anchor="middle">counts</text>' +
		'<text x="458" y="117" text-anchor="middle" class="lbl">map[string]int</text>' +
		'<defs><marker id="dgArrowGBSC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'safe-counter',
		title: 'Mutexes: Safe Counter',
		nav: 'mutex (safe counter)',
		difficulty: 'Medium',
		category: 'Concurrency',
		task: 'Make Counter safe for concurrent use: implement Inc and Get with the mutex. All 4 tests.',

		prose: [
			'<h2>Mutexes: Safe Counter</h2>' +
			'<p>Channels move data <em>between</em> goroutines. But sometimes there is ' +
			'no flow — just several goroutines that all need to update the same map or ' +
			'counter. Reaching for channels there produces ceremony; the right tool is ' +
			'a <code>sync.Mutex</code>: a lock only one goroutine can hold.</p>' +
			'<p>The stakes are higher than a wrong count. <code>counts[key]++</code> is ' +
			'a read-modify-write on a hash table that may be mid-rehash when the next ' +
			'goroutine barges in. Two goroutines incrementing an int without ' +
			'synchronization lose updates; two goroutines writing a <em>map</em> crash ' +
			'the program outright — <code>fatal error: concurrent map writes</code>, ' +
			'not a panic, not recoverable. The Go runtime detects it and pulls the ' +
			'plug on purpose.</p>',
			{ code: 'type Counter struct {\n\tmu     sync.Mutex\n\tcounts map[string]int\n}\n\nfunc (c *Counter) Inc(key string) {\n\tc.mu.Lock()\n\tc.counts[key]++   // only one goroutine can be on this line\n\tc.mu.Unlock()\n}' },
			DIAGRAM +
			'<p>The discipline that makes mutexes manageable: <strong>the lock lives ' +
			'next to the data it guards</strong> (same struct, field above it, by ' +
			'convention), every access — <em>reads included</em> — goes through a ' +
			'method that holds the lock, and the critical section stays tiny. For ' +
			'anything longer than a line or two, <code>defer c.mu.Unlock()</code> ' +
			'right after the Lock guarantees the lock is released even if the code ' +
			'between panics.</p>' +
			'<div class="tip">Full disclosure: this playground runs single-threaded, ' +
			'so a lock-free implementation can pass these tests here — and still crash ' +
			'on real hardware. The tests check your counter counts; the lock is what ' +
			'makes it <em>true</em> on a real machine. Run concurrent code locally ' +
			'with <code>go test -race</code>, which catches what no sandbox can.</div>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Inc</code> and <code>Get</code> so the counter is ' +
			'correct under concurrent use. Reads lock too — a read during a map write ' +
			'is the same fatal error.</p>',
		],

		starter: [
			'package main',
			'',
			'import "sync"',
			'',
			'// Counter counts occurrences by key, safely callable from many',
			'// goroutines at once. The mutex is declared above the map it guards —',
			'// the conventional signal for "mu protects everything below it".',
			'type Counter struct {',
			'	mu     sync.Mutex',
			'	counts map[string]int',
			'}',
			'',
			'func NewCounter() *Counter {',
			'	return &Counter{counts: map[string]int{}}',
			'}',
			'',
			'// Inc adds 1 to key. Must be safe under concurrent callers.',
			'func (c *Counter) Inc(key string) {',
			'	// your code here',
			'}',
			'',
			'// Get returns the current count for key (0 if never incremented).',
			'// Reads need the lock too: a read during a map write is fatal.',
			'func (c *Counter) Get(key string) int {',
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
			'	"sync"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'// hammer runs g goroutines, each calling body reps times, and joins',
			'// them — the standard fork/join skeleton from the goroutines lesson.',
			'func hammer(g, reps int, body func()) {',
			'	var wg sync.WaitGroup',
			'	for i := 0; i < g; i++ {',
			'		wg.Add(1)',
			'		go func() {',
			'			defer wg.Done()',
			'			for r := 0; r < reps; r++ {',
			'				body()',
			'			}',
			'		}()',
			'	}',
			'	wg.Wait()',
			'}',
			'',
			'func main() {',
			'	results := make([]map[string]any, 0, 4)',
			'	add := func(name, want string, body func() string) {',
			'		r := map[string]any{"input": name, "want": want}',
			'		runCase(r, func() {',
			'			got := body()',
			'			r["pass"] = got == want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	add("sequential: a a a b", "a=3 b=1", func() string {',
			'		c := NewCounter()',
			'		c.Inc("a")',
			'		c.Inc("a")',
			'		c.Inc("a")',
			'		c.Inc("b")',
			'		return fmt.Sprintf("a=%d b=%d", c.Get("a"), c.Get("b"))',
			'	})',
			'	add("missing key reads as zero", "0", func() string {',
			'		return fmt.Sprint(NewCounter().Get("never"))',
			'	})',
			'	add("8 goroutines x 50 Inc(hits)", "400", func() string {',
			'		c := NewCounter()',
			'		hammer(8, 50, func() { c.Inc("hits") })',
			'		return fmt.Sprint(c.Get("hits"))',
			'	})',
			'	add("two keys hammered together + reads in between", "x=100 y=100", func() string {',
			'		c := NewCounter()',
			'		var wg sync.WaitGroup',
			'		wg.Add(2)',
			'		go func() {',
			'			defer wg.Done()',
			'			hammer(4, 25, func() { c.Inc("x") })',
			'		}()',
			'		go func() {',
			'			defer wg.Done()',
			'			hammer(4, 25, func() { c.Inc("y"); _ = c.Get("x") })',
			'		}()',
			'		wg.Wait()',
			'		return fmt.Sprintf("x=%d y=%d", c.Get("x"), c.Get("y"))',
			'	})',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'import "sync"',
			'',
			'// Counter counts occurrences by key, safely callable from many',
			'// goroutines at once.',
			'type Counter struct {',
			'	mu     sync.Mutex',
			'	counts map[string]int',
			'}',
			'',
			'func NewCounter() *Counter {',
			'	return &Counter{counts: map[string]int{}}',
			'}',
			'',
			'// Inc adds 1 to key. Lock/Unlock without defer is fine for a',
			'// one-line critical section that cannot panic between them.',
			'func (c *Counter) Inc(key string) {',
			'	c.mu.Lock()',
			'	c.counts[key]++',
			'	c.mu.Unlock()',
			'}',
			'',
			'// Get returns the current count for key. The read takes the same',
			'// lock: a map read concurrent with a write is the same fatal error',
			'// as two writes, and the lock is also what makes the value COHERENT',
			'// — without it, a caller could observe a count from mid-update.',
			'func (c *Counter) Get(key string) int {',
			'	c.mu.Lock()',
			'	defer c.mu.Unlock()',
			'	return c.counts[key]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why methods, not a naked map + lock</h3>' +
			'<p>The struct is the design: callers cannot reach <code>counts</code> ' +
			'without going through <code>Inc</code>/<code>Get</code>, so the locking ' +
			'discipline is enforced by the API instead of by everyone remembering. The ' +
			'moment a lock and its data travel separately, someone eventually accesses ' +
			'one without the other. Note also that both methods have pointer ' +
			'receivers — a value receiver would copy the struct, <em>including the ' +
			'mutex</em>, and each call would lock a private copy that guards nothing ' +
			'(<code>go vet</code> flags mutex copies for exactly this reason).</p>' +
			'<h3>The escalation ladder</h3>' +
			'<p>For a single integer counter, <code>sync/atomic</code> ' +
			'(<code>atomic.AddInt64</code>) beats a mutex — no lock, one CPU ' +
			'instruction. For read-heavy maps, <code>sync.RWMutex</code> lets any ' +
			'number of <code>RLock</code> readers proceed together while writers get ' +
			'exclusivity. And <code>sync.Map</code> exists for two narrow shapes ' +
			'(write-once-read-many keys, disjoint key sets per goroutine) — the docs ' +
			'themselves steer everyone else back to <code>Mutex</code> + map, which is ' +
			'the right default.</p>' +
			'<h3>What -race actually does</h3>' +
			'<p><code>go test -race</code> instruments every memory access and reports ' +
			'the moment two goroutines touch the same address unsynchronized — with ' +
			'both stack traces. It only catches races that <em>execute</em>, so it ' +
			'complements tests like these rather than replacing thought. The deeper ' +
			'model is worth knowing by name: a data race in Go is not &ldquo;you might ' +
			'get a stale value&rdquo; but undefined behavior — the memory model only ' +
			'promises sane results for programs with no races at all. The lock is not ' +
			'slowing your program down; it is what makes it a program.</p>',
		],
		complexity: { time: 'O(1) per Inc/Get (amortized map access)', space: 'O(k) distinct keys' },
	});
})();
