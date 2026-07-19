/* Flows: Cold Streams, Hot StateFlow — Coroutines & the Main Thread
 * (Medium). Cold: the builder block runs once PER COLLECTOR, and operators
 * are lazy wrappers — nothing executes until Collect. Hot StateFlow: always
 * has a value, conflates, and skips equal sets (distinctUntilChanged built
 * in). The harness counts builder invocations to pin per-collector
 * execution and laziness, pins Take's cooperative upstream stop (emit
 * returns false — kotlinx uses an internal AbortFlowException for the same
 * job), and pins StateFlow's dedupe against the CURRENT value only.
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// Cold vs hot in one picture: each collector of a cold flow triggers its
	// own run of the builder; a StateFlow is one shared value that collectors
	// observe. Marker id namespaced (dgArrowAndCF) because every track's
	// SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="cold flow: two collectors each cause their own run of the builder block; hot StateFlow: one current value shared by all collectors, equal sets skipped">' +
		'<text x="20" y="24" class="lbl">cold: the code runs per collector — hot: the value exists without collectors</text>' +
		// ---- left: cold ----
		'<text x="140" y="48" text-anchor="middle" class="lbl">flow { query(); emit(...) }</text>' +
		'<rect x="75" y="58" width="130" height="34" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="140" y="80" text-anchor="middle">builder block</text>' +
		'<rect x="35" y="150" width="95" height="30" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="82" y="170" text-anchor="middle" class="lbl">collector #1</text>' +
		'<rect x="150" y="150" width="95" height="30" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="197" y="170" text-anchor="middle" class="lbl">collector #2</text>' +
		'<path d="M 82 150 L 115 96" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndCF)"/>' +
		'<path d="M 197 150 L 165 96" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAndCF)"/>' +
		'<text x="140" y="122" text-anchor="middle" class="lbl" style="fill:var(--warn)">run #1&nbsp;&nbsp;&nbsp;run #2</text>' +
		'<text x="140" y="200" text-anchor="middle" class="lbl" style="fill:var(--warn)">two collectors = the query runs twice</text>' +
		// ---- right: hot ----
		'<text x="420" y="48" text-anchor="middle" class="lbl">MutableStateFlow(value)</text>' +
		'<rect x="355" y="58" width="130" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="420" y="80" text-anchor="middle">current value</text>' +
		'<rect x="315" y="150" width="95" height="30" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="362" y="170" text-anchor="middle" class="lbl">collector #1</text>' +
		'<rect x="430" y="150" width="95" height="30" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="477" y="170" text-anchor="middle" class="lbl">collector #2</text>' +
		'<path d="M 395 96 L 366 146" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowAndCF2)"/>' +
		'<path d="M 445 96 L 473 146" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowAndCF2)"/>' +
		'<text x="420" y="122" text-anchor="middle" class="lbl">one value, observed</text>' +
		'<text x="420" y="200" text-anchor="middle" class="lbl" style="fill:var(--ok)">Set(equal value) → skipped: distinctUntilChanged built in</text>' +
		'<defs>' +
		'<marker id="dgArrowAndCF" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowAndCF2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'cold-flows',
		title: 'Flows: Cold Streams, Hot StateFlow',
		nav: 'cold flows',
		difficulty: 'Medium',
		category: 'Coroutines & the Main Thread',
		task: 'Implement a cold Flow (builder runs per Collect; Map/Filter/Take are lazy wrappers; Take stops the upstream) and a hot StateFlow (always has a value, dedupes equal Sets).',

		prose: [
			'<h2>Flows: Cold Streams, Hot StateFlow</h2>' +
			'<p>You wire a debug panel to the same flow the screen already ' +
			'collects, and the database query count doubles. Nothing is cached ' +
			'wrong and nothing leaks — you have just met the defining property of a ' +
			'cold stream:</p>',
			{ lang: 'kotlin', code: 'val users: Flow<List<User>> = flow {\n    println("querying Room…")       // runs once PER COLLECTOR\n    emit(dao.loadUsers())\n}\n\nusers.collect { render(it) }        // querying Room…\nusers.collect { debugPanel(it) }    // querying Room…  ← again!' },
			'<p>A <code>Flow</code> is not a running thing — it is a <em>recipe</em>. ' +
			'Construction executes nothing; operators like <code>map</code> and ' +
			'<code>filter</code> just wrap the recipe in another recipe; only ' +
			'<code>collect</code> runs the builder block, from the top, once per ' +
			'collector. Contrast the hot side, the UI-state default:</p>',
			{ lang: 'kotlin', code: 'val uiState = MutableStateFlow&lt;UiState&gt;(UiState.Loading)\n\nuiState.value = UiState.Loading    // equal to current → collectors NOT woken\nuiState.value = UiState.Ready(x)   // distinct → everyone sees it\n// A late collector doesn\'t re-run anything: it just receives the\n// CURRENT value, then changes. State, not events.' },
			'<p>The rules, precisely:</p>' +
			'<ul>' +
			'<li><strong>Cold = per collector.</strong> Each <code>Collect</code> ' +
			'runs the builder block again. Two collectors, two runs — two Room ' +
			'queries, two network calls.</li>' +
			'<li><strong>Operators are lazy.</strong> <code>Map</code>, ' +
			'<code>Filter</code>, <code>Take</code> return a new Flow wrapping the ' +
			'old; the builder must not run until someone collects.</li>' +
			'<li><strong>Take stops the upstream.</strong> <code>Take(n)</code> ' +
			'delivers n values and then tells the producer to stop — the builder ' +
			'must not keep emitting into the void. In this model the stop signal is ' +
			'explicit: <code>emit</code> returns <code>false</code> when downstream ' +
			'is done, and a well-behaved builder checks it. (kotlinx does the same ' +
			'job with an internal <code>AbortFlowException</code>; either way, ' +
			'stopping a flow is cooperative.)</li>' +
			'<li><strong>StateFlow always has a value and skips equal sets.</strong> ' +
			'Constructed with an initial value, <code>Set</code> of an equal value ' +
			'is a no-op (compared against the <em>current</em> value only) — ' +
			'<code>distinctUntilChanged</code> is built into the type.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement both halves — synchronously, no goroutines; the ' +
			'concurrency-free model is exactly what makes the semantics visible. ' +
			'For <code>StateFlow</code>, <code>CollectHistory()</code> is the pinned ' +
			'observable contract: the value at construction plus every accepted ' +
			'(distinct) <code>Set</code>, in order — what a collector subscribed ' +
			'from the start would have seen.</p>',
		],

		starter: [
			'package main',
			'',
			'// Flow is a COLD stream of ints: a recipe, not a running thing. The',
			'// builder block receives emit and calls it once per value; emit',
			'// returns false when downstream has stopped (Take), and a well-',
			'// behaved builder checks it and stops producing.',
			'type Flow struct {',
			'	// your fields here (a Flow is just its block)',
			'}',
			'',
			'// NewFlow wraps a builder block. Nothing runs here.',
			'func NewFlow(block func(emit func(int) bool)) *Flow {',
			'	return &Flow{}',
			'}',
			'',
			'// Collect runs the builder NOW — from the top, once per call — and',
			'// feeds every emitted value to sink. (A plain collector never stops',
			'// early, so the emit it supplies always returns true.)',
			'func (f *Flow) Collect(sink func(int)) {',
			'	// your code here',
			'}',
			'',
			'// Map returns a LAZY flow of fn(v) for every upstream v. Wrapping',
			'// only — the upstream must not run until the result is collected.',
			'func (f *Flow) Map(fn func(int) int) *Flow {',
			'	// your code here',
			'	return f',
			'}',
			'',
			'// Filter returns a lazy flow of the upstream values with fn(v)==true.',
			'// Dropping a value must NOT stop the stream.',
			'func (f *Flow) Filter(fn func(int) bool) *Flow {',
			'	// your code here',
			'	return f',
			'}',
			'',
			'// Take returns a lazy flow of the first n upstream values. After the',
			'// nth delivery it signals stop (emit returns false upstream), so an',
			'// eager builder does not keep producing values nobody wants.',
			'func (f *Flow) Take(n int) *Flow {',
			'	// your code here',
			'	return f',
			'}',
			'',
			'// StateFlow is HOT state: it always has a current value, and Set of',
			'// a value equal to the CURRENT one is a no-op (conflation /',
			'// distinctUntilChanged built in).',
			'type StateFlow struct {',
			'	// your fields here (current value + accepted history)',
			'}',
			'',
			'func NewStateFlow(initial int) *StateFlow {',
			'	return &StateFlow{}',
			'}',
			'',
			'// Set updates the value; equal to current → no-op, nothing recorded.',
			'func (s *StateFlow) Set(v int) {',
			'	// your code here',
			'}',
			'',
			'func (s *StateFlow) Value() int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// CollectHistory returns what a collector subscribed at construction',
			'// saw: the initial value, then every accepted (distinct) Set, in',
			'// order. Return a copy.',
			'func (s *StateFlow) CollectHistory() []int {',
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
			'	// oneTwoThree is the simplest finite builder; ignoring emit\'s',
			'	// return is fine for a builder that ends anyway.',
			'	oneTwoThree := func(emit func(int) bool) {',
			'		emit(1)',
			'		emit(2)',
			'		emit(3)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"cold means per-collector: collecting the same flow twice runs the builder twice — two Room queries, not one",',
			'			"runs=2 first=[1 2] second=[1 2]",',
			'			func() string {',
			'				runs := 0',
			'				f := NewFlow(func(emit func(int) bool) {',
			'					runs++',
			'					emit(1)',
			'					emit(2)',
			'				})',
			'				var first, second []int',
			'				f.Collect(func(v int) { first = append(first, v) })',
			'				f.Collect(func(v int) { second = append(second, v) })',
			'				return fmt.Sprintf("runs=%d first=%v second=%v", runs, first, second)',
			'			}},',
			'		{"operators are lazy: building Map(Filter(flow)) runs NOTHING until someone collects",',
			'			"runs=0",',
			'			func() string {',
			'				runs := 0',
			'				f := NewFlow(func(emit func(int) bool) {',
			'					runs++',
			'					emit(1)',
			'				})',
			'				_ = f.Filter(func(v int) bool { return v > 0 }).Map(func(v int) int { return v * 2 })',
			'				return fmt.Sprintf("runs=%d", runs)',
			'			}},',
			'		{"Map transforms every value on the way through: 1 2 3 through *10",',
			'			"got=[10 20 30]",',
			'			func() string {',
			'				var got []int',
			'				NewFlow(oneTwoThree).Map(func(v int) int { return v * 10 }).Collect(func(v int) { got = append(got, v) })',
			'				return fmt.Sprintf("got=%v", got)',
			'			}},',
			'		{"Filter drops values without stopping the stream: evens of 1..6",',
			'			"got=[2 4 6]",',
			'			func() string {',
			'				var got []int',
			'				f := NewFlow(func(emit func(int) bool) {',
			'					for i := 1; i <= 6; i++ {',
			'						if !emit(i) {',
			'							return',
			'						}',
			'					}',
			'				})',
			'				f.Filter(func(v int) bool { return v%2 == 0 }).Collect(func(v int) { got = append(got, v) })',
			'				return fmt.Sprintf("got=%v", got)',
			'			}},',
			'		{"Take(2) stops the upstream: an eager 1..100 builder attempts exactly 2 emits, then sees false and breaks",',
			'			"collected=[1 2] attempts=2",',
			'			func() string {',
			'				attempts := 0',
			'				f := NewFlow(func(emit func(int) bool) {',
			'					for i := 1; i <= 100; i++ {',
			'						attempts++',
			'						if !emit(i) {',
			'							return',
			'						}',
			'					}',
			'				})',
			'				var got []int',
			'				f.Take(2).Collect(func(v int) { got = append(got, v) })',
			'				return fmt.Sprintf("collected=%v attempts=%d", got, attempts)',
			'			}},',
			'		{"Take larger than the stream: the flow completes normally with everything — the stop signal never fires",',
			'			"got=[1 2 3]",',
			'			func() string {',
			'				var got []int',
			'				NewFlow(oneTwoThree).Take(10).Collect(func(v int) { got = append(got, v) })',
			'				return fmt.Sprintf("got=%v", got)',
			'			}},',
			'		{"operator order matters: Filter(even) then Take(2) counts SURVIVORS — the upstream emits 4 values to satisfy it",',
			'			"collected=[2 4] attempts=4",',
			'			func() string {',
			'				attempts := 0',
			'				f := NewFlow(func(emit func(int) bool) {',
			'					for i := 1; i <= 100; i++ {',
			'						attempts++',
			'						if !emit(i) {',
			'							return',
			'						}',
			'					}',
			'				})',
			'				var got []int',
			'				f.Filter(func(v int) bool { return v%2 == 0 }).Take(2).Collect(func(v int) { got = append(got, v) })',
			'				return fmt.Sprintf("collected=%v attempts=%d", got, attempts)',
			'			}},',
			'		{"StateFlow always has a value: Value() and the history exist before any Set",',
			'			"value=7 history=[7]",',
			'			func() string {',
			'				s := NewStateFlow(7)',
			'				return fmt.Sprintf("value=%d history=%v", s.Value(), s.CollectHistory())',
			'			}},',
			'		{"StateFlow conflates equal Sets: 1,1,2,2 records only the distinct changes — distinctUntilChanged built in",',
			'			"value=2 history=[0 1 2]",',
			'			func() string {',
			'				s := NewStateFlow(0)',
			'				s.Set(1)',
			'				s.Set(1)',
			'				s.Set(2)',
			'				s.Set(2)',
			'				return fmt.Sprintf("value=%d history=%v", s.Value(), s.CollectHistory())',
			'			}},',
			'		{"the dedupe compares against the CURRENT value only: returning to an earlier value IS a change",',
			'			"value=0 history=[0 1 0]",',
			'			func() string {',
			'				s := NewStateFlow(0)',
			'				s.Set(1)',
			'				s.Set(0)',
			'				return fmt.Sprintf("value=%d history=%v", s.Value(), s.CollectHistory())',
			'			}},',
			'		{"Set equal to the initial value: a no-op — loading state re-posted on rotation wakes nobody",',
			'			"value=5 history=[5]",',
			'			func() string {',
			'				s := NewStateFlow(5)',
			'				s.Set(5)',
			'				return fmt.Sprintf("value=%d history=%v", s.Value(), s.CollectHistory())',
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
			'// Flow is a COLD stream: nothing but the recipe. All the machinery',
			'// is one function field — which is the honest truth about kotlinx',
			'// Flow too: the interface is a single suspend collect(collector).',
			'type Flow struct {',
			'	block func(emit func(int) bool)',
			'}',
			'',
			'// NewFlow stores the block. Deliberately NO execution here: cold',
			'// semantics live or die on construction being free.',
			'func NewFlow(block func(emit func(int) bool)) *Flow {',
			'	return &Flow{block: block}',
			'}',
			'',
			'// Collect is the terminal operator — the ONLY place the recipe runs.',
			'// Each call invokes the block afresh, which is exactly why two',
			'// collectors mean two queries. The emit it hands the block always',
			'// returns true: a plain collector consumes to the end.',
			'func (f *Flow) Collect(sink func(int)) {',
			'	f.block(func(v int) bool {',
			'		sink(v)',
			'		return true',
			'	})',
			'}',
			'',
			'// Map wraps: the new flow\'s block runs the upstream block with an',
			'// emit that transforms first. Note it passes the DOWNSTREAM\'s',
			'// verdict back upstream unchanged — operators are transparent to',
			'// the stop signal.',
			'func (f *Flow) Map(fn func(int) int) *Flow {',
			'	return NewFlow(func(emit func(int) bool) {',
			'		f.block(func(v int) bool {',
			'			return emit(fn(v))',
			'		})',
			'	})',
			'}',
			'',
			'// Filter wraps likewise; a dropped value returns true — "keep',
			'// producing" — because dropping is not stopping.',
			'func (f *Flow) Filter(fn func(int) bool) *Flow {',
			'	return NewFlow(func(emit func(int) bool) {',
			'		f.block(func(v int) bool {',
			'			if !fn(v) {',
			'				return true',
			'			}',
			'			return emit(v)',
			'		})',
			'	})',
			'}',
			'',
			'// Take delivers n values, then reports false upstream. The signal',
			'// choice is worth a note: kotlinx\'s take throws AbortFlowException',
			'// through the builder and catches it in the operator — control flow',
			'// by exception, hidden from you. This model surfaces the same',
			'// contract as emit\'s return value, because either way flow',
			'// cancellation is COOPERATIVE: a builder that ignores the signal',
			'// keeps computing values nobody will see.',
			'func (f *Flow) Take(n int) *Flow {',
			'	return NewFlow(func(emit func(int) bool) {',
			'		if n <= 0 {',
			'			return // nothing wanted: never even start the upstream',
			'		}',
			'		taken := 0',
			'		f.block(func(v int) bool {',
			'			taken++',
			'			if !emit(v) {',
			'				return false // downstream stopped first',
			'			}',
			'			// False exactly AFTER the nth delivery: the value',
			'			// already reached the sink; the upstream just must',
			'			// not produce another.',
			'			return taken < n',
			'		})',
			'	})',
			'}',
			'',
			'// StateFlow is the hot half: a current value plus the log of',
			'// accepted changes. No blocks, no laziness — state simply exists,',
			'// which is why it is the UI-state default.',
			'type StateFlow struct {',
			'	value   int',
			'	history []int',
			'}',
			'',
			'// NewStateFlow seeds both the value and the history: a collector',
			'// subscribing at construction immediately sees the initial value —',
			'// StateFlow has no "empty" state, by design.',
			'func NewStateFlow(initial int) *StateFlow {',
			'	return &StateFlow{value: initial, history: []int{initial}}',
			'}',
			'',
			'// Set implements the built-in distinctUntilChanged: equality against',
			'// the CURRENT value only. A==B==A records A,B,A — conflation is not',
			'// memory of everything ever seen, just of now.',
			'func (s *StateFlow) Set(v int) {',
			'	if v == s.value {',
			'		return',
			'	}',
			'	s.value = v',
			'	s.history = append(s.history, v)',
			'}',
			'',
			'func (s *StateFlow) Value() int {',
			'	return s.value',
			'}',
			'',
			'// CollectHistory returns a copy — observers must not be able to',
			'// rewrite state history out from under the owner.',
			'func (s *StateFlow) CollectHistory() []int {',
			'	return append([]int(nil), s.history...)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why cold-per-collector surprises everyone once</h3>' +
			'<p>Room DAOs returning <code>Flow&lt;List&lt;T&gt;&gt;</code>, Retrofit ' +
			'wrapped in <code>flow { emit(api.fetch()) }</code>, a location provider ' +
			'bridged with <code>callbackFlow</code> — all cold. Every screen, ' +
			'widget, and analytics hook that collects is another query, another ' +
			'network call, another GPS registration. The standard fix is to make ' +
			'the stream hot exactly once, at the boundary: ' +
			'<code>stateIn(viewModelScope, SharingStarted.WhileSubscribed(5000), ' +
			'initial)</code> — one upstream run shared by all collectors, kept warm ' +
			'across rotation by the 5-second grace period. When you see a doubled ' +
			'query in the SQL log, the question is always “who collected twice?”, ' +
			'and the answer is always a cold flow doing precisely what it ' +
			'promises.</p>' +
			'<h3>Why StateFlow is the UI default</h3>' +
			'<p>UI wants <em>state</em>, not events: a late subscriber (a fragment ' +
			're-created after rotation) must get the current value immediately, not ' +
			'replay a history or miss everything. That is StateFlow\'s contract — ' +
			'always-has-value, conflated, equality-skipping — and each property ' +
			'maps to a UI bug it prevents: no “blank until next emission” after ' +
			'rotation; no backlog of stale frames when the producer outruns the ' +
			'main thread; no needless recomposition/re-render when the same value ' +
			'is set again. The dedupe is also the one that bites: if your state is ' +
			'a mutable object and you mutate-then-Set the same reference, ' +
			'<code>equals</code> says “no change” and the UI never updates — the ' +
			'reason UI state should be immutable data classes and every update a ' +
			'<code>copy()</code>.</p>' +
			'<h3>The cooperative stop, in real code</h3>' +
			'<p>Your <code>emit returns bool</code> is kotlinx\'s ' +
			'<code>AbortFlowException</code> with the mask off. <code>take</code>, ' +
			'<code>first()</code>, and friends abort the upstream by throwing ' +
			'through <code>emit</code>; a builder that swallows exceptions with a ' +
			'blanket <code>catch (e: Exception)</code> around its loop breaks ' +
			'<code>first()</code> in ways that look supernatural in review. Same ' +
			'lesson either encoding: emission is a call <em>into</em> downstream, ' +
			'and downstream can answer “stop” — a producer that ignores the answer ' +
			'wastes work at best and never terminates at worst. (Go\'s closest ' +
			'idiom is the <code>yield func(V) bool</code> of <code>iter.Seq</code> ' +
			'— range-over-func made the identical choice, explicitly.)</p>',
		],
		complexity: { time: 'O(n·k) per Collect — each value crosses k operator wrappers', space: 'O(k) closures per chain; O(n) history in StateFlow' },
	});
})();
