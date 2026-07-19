/* Combine: Cold Publishers & Subjects — Concurrency & the Main Thread
 * (Hard). A Combine publisher is a RECIPE: cold — the generator runs once
 * per subscriber, operators are lazy wrappers, and prefix(n) cancels the
 * upstream cooperatively (emit returns false → the generator stops).
 * Subjects are HOT: CurrentValueSubject replays its current value to a new
 * subscriber (and, unlike Kotlin's StateFlow, does NOT dedupe — that is
 * removeDuplicates(), an operator), PassthroughSubject replays nothing,
 * and after send(completion:) later sends are dropped. The harness counts
 * generator side effects to pin all of it.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// Cold vs hot in one picture: each sink on a cold publisher re-runs the
	// generator; a subject is one shared value/stream that sinks observe.
	// Marker ids namespaced (dgArrowIOSCP*) because every track's SVGs
	// share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="cold publisher: two sinks each trigger their own run of the generator; hot CurrentValueSubject: one current value shared by all sinks, replayed to late subscribers, no dedupe">' +
		'<text x="20" y="24" class="lbl">cold: the recipe runs per sink — hot: the value exists whether anyone subscribes or not</text>' +
		// ---- left: cold ----
		'<text x="140" y="48" text-anchor="middle" class="lbl">Deferred { hit /users; emit }</text>' +
		'<rect x="75" y="58" width="130" height="34" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="140" y="80" text-anchor="middle">generator</text>' +
		'<rect x="35" y="150" width="95" height="30" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="82" y="170" text-anchor="middle" class="lbl">sink #1</text>' +
		'<rect x="150" y="150" width="95" height="30" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="197" y="170" text-anchor="middle" class="lbl">sink #2</text>' +
		'<path d="M 82 150 L 115 96" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowIOSCPa)"/>' +
		'<path d="M 197 150 L 165 96" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowIOSCPa)"/>' +
		'<text x="140" y="122" text-anchor="middle" class="lbl" style="fill:var(--warn)">run #1&nbsp;&nbsp;&nbsp;run #2</text>' +
		'<text x="140" y="200" text-anchor="middle" class="lbl" style="fill:var(--warn)">two sinks = the request fires twice</text>' +
		'<!-- right: hot -->' +
		'<text x="420" y="48" text-anchor="middle" class="lbl">CurrentValueSubject(value)</text>' +
		'<rect x="355" y="58" width="130" height="34" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="420" y="80" text-anchor="middle">current value</text>' +
		'<rect x="315" y="150" width="95" height="30" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="362" y="170" text-anchor="middle" class="lbl">sink #1</text>' +
		'<rect x="430" y="150" width="95" height="30" rx="6" fill="none" stroke="var(--muted)" stroke-width="1.6"/>' +
		'<text x="477" y="170" text-anchor="middle" class="lbl">late sink</text>' +
		'<path d="M 395 96 L 366 146" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowIOSCPo)"/>' +
		'<path d="M 445 96 L 473 146" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowIOSCPo)"/>' +
		'<text x="420" y="122" text-anchor="middle" class="lbl">replayed on subscribe</text>' +
		'<text x="420" y="200" text-anchor="middle" class="lbl" style="fill:var(--ok)">send(equal value) → delivered AGAIN: no built-in dedupe</text>' +
		'<defs>' +
		'<marker id="dgArrowIOSCPa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowIOSCPo" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'combine-publishers',
		title: 'Combine: Cold Publishers & Hot Subjects',
		nav: 'combine publishers',
		difficulty: 'Hard',
		category: 'Concurrency & the Main Thread',
		task: 'Implement a mini-Combine: cold publishers whose generator runs per subscriber, lazy Map/Filter/Prefix/RemoveDuplicates operators (Prefix cancels the upstream), and hot subjects — CurrentValueSubject replays and never dedupes, PassthroughSubject replays nothing, completion drops later sends.',

		prose: [
			'<h2>Combine: Cold Publishers &amp; Hot Subjects</h2>' +
			'<p>The backend team pings you: “why does the app hit ' +
			'<code>/users</code> twice on every screen load?” You added one debug ' +
			'panel. Charles Proxy confirms: two identical requests, milliseconds ' +
			'apart. Nothing is cached wrong — you have just met the defining ' +
			'property of a cold publisher:</p>',
			{ lang: 'swift', code: 'let users = Deferred {\n    Future { promise in\n        print("hitting /users…")        // runs once PER SUBSCRIBER\n        api.fetchUsers(promise)\n    }\n}\n\nusers.sink { _ in } receiveValue: { render($0) }     // hitting /users…\nusers.sink { _ in } receiveValue: { debugList($0) }  // hitting /users…  ← again!' },
			'<p>A publisher is not a running thing — it is a <em>recipe</em>. ' +
			'Construction executes nothing; <code>map</code>, <code>filter</code>, ' +
			'<code>prefix</code> wrap the recipe in another recipe; only ' +
			'<code>sink</code> (subscription) runs the generator, from the top, ' +
			'once per subscriber. Attach Combine\'s <code>.print()</code> operator ' +
			'and the whole lifecycle becomes visible, including the cancellation ' +
			'that <code>prefix(2)</code> sends upstream after the second value:</p>',
			{ lang: 'txt', code: '(1...100).publisher.print().prefix(2).sink { _ in }\n\nreceive subscription: (1...)\nrequest unlimited\nreceive value: (1)\nreceive value: (2)\nreceive cancel            ← prefix(2) stops the upstream, mid-sequence' },
			'<p>Subjects are the hot half — values exist independent of any ' +
			'subscriber, and everyone shares one stream:</p>',
			{ lang: 'swift', code: 'let state = CurrentValueSubject<Int, Never>(0)\nstate.send(5)\nstate.sink { print("late sink sees:", $0) }   // late sink sees: 5  ← replay\nstate.send(5)                                  // late sink sees: 5  ← AGAIN\n// CurrentValueSubject does NOT dedupe. Want distinct values? That is an\n// operator you opt into:\nstate.removeDuplicates().sink { render($0) }\n\nlet taps = PassthroughSubject<Void, Never>()   // replays NOTHING:\ntaps.send()                                    // a subscriber arriving now\ntaps.sink { … }                                // has missed this forever' },
			'<p>The rules, precisely:</p>' +
			'<ul>' +
			'<li><strong>Cold = per subscriber.</strong> Each subscription runs the ' +
			'generator again. Two sinks, two network calls.</li>' +
			'<li><strong>Operators are lazy wrappers</strong> — building a chain ' +
			'runs nothing until something subscribes to its end.</li>' +
			'<li><strong>Prefix cancels upstream, cooperatively.</strong> In this ' +
			'model the signal is explicit: <code>emit</code> returns ' +
			'<code>false</code> once downstream is done, and a well-behaved ' +
			'generator checks it and stops. (Real Combine sends ' +
			'<code>cancel()</code> up the subscription — same contract, different ' +
			'plumbing.)</li>' +
			'<li><strong><code>CurrentValueSubject</code> replays its current ' +
			'value</strong> to each new subscriber, then live values — and dedupes ' +
			'nothing. <strong><code>PassthroughSubject</code> replays nothing.</strong> ' +
			'After <code>send(completion:)</code>, both drop later sends.</li>' +
			'<li><strong><code>removeDuplicates()</code> drops consecutive ' +
			'equals</strong> — returning to an earlier value still emits.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the machine, synchronously — no goroutines; the ' +
			'concurrency-free model is what makes the semantics visible. A ' +
			'<code>Publisher</code> is its attach function; <code>Sink</code> is ' +
			'the only place recipes run; the two subjects keep subscriber lists ' +
			'in registration order.</p>' +
			'<div class="tip">Disclosed simplification: real Combine has ' +
			'<em>demand</em> — a subscriber requests N values and the publisher ' +
			'may not exceed it (backpressure). This model collapses demand to the ' +
			'boolean “keep going?”, which is exactly the part of the protocol ' +
			'<code>prefix</code> and <code>first()</code> live on.</div>',
		],

		starter: [
			'package main',
			'',
			'// Publisher is a COLD stream of ints: a recipe, not a running thing.',
			'// The attach function receives emit and calls it once per value;',
			'// emit returns false when downstream has stopped (Prefix), and a',
			'// well-behaved generator checks it and stops producing.',
			'type Publisher struct {',
			'	// your fields here (a Publisher is just its attach function)',
			'}',
			'',
			'// NewPublisher wraps a generator. Nothing runs here — cold semantics',
			'// live or die on construction being free.',
			'func NewPublisher(attach func(emit func(int) bool)) *Publisher {',
			'	return &Publisher{}',
			'}',
			'',
			'// Sequence is a convenience cold publisher over fixed values, like',
			'// (1...n).publisher. (Provided — build it on NewPublisher; note it',
			'// respects emit\'s stop signal.)',
			'func Sequence(vals ...int) *Publisher {',
			'	return NewPublisher(func(emit func(int) bool) {',
			'		for _, v := range vals {',
			'			if !emit(v) {',
			'				return',
			'			}',
			'		}',
			'	})',
			'}',
			'',
			'// Sink subscribes: run the recipe NOW, from the top, feeding every',
			'// value to receive. A plain sink never stops early, so the emit it',
			'// supplies always answers true.',
			'func (p *Publisher) Sink(receive func(int)) {',
			'	// your code here',
			'}',
			'',
			'// Map returns a LAZY publisher of fn(v). Wrapping only — the',
			'// upstream must not run until the result is subscribed.',
			'func (p *Publisher) Map(fn func(int) int) *Publisher {',
			'	// your code here',
			'	return p',
			'}',
			'',
			'// Filter returns a lazy publisher of upstream values with',
			'// fn(v)==true. Dropping a value must NOT stop the stream.',
			'func (p *Publisher) Filter(fn func(int) bool) *Publisher {',
			'	// your code here',
			'	return p',
			'}',
			'',
			'// Prefix returns a lazy publisher of the first n upstream values.',
			'// After the nth delivery it signals stop (emit returns false',
			'// upstream) so an eager generator does not keep producing.',
			'func (p *Publisher) Prefix(n int) *Publisher {',
			'	// your code here',
			'	return p',
			'}',
			'',
			'// RemoveDuplicates drops values equal to the IMMEDIATELY PREVIOUS',
			'// emitted value. Returning to an earlier value emits again.',
			'func (p *Publisher) RemoveDuplicates() *Publisher {',
			'	// your code here',
			'	return p',
			'}',
			'',
			'// PassthroughSubject is HOT and replays nothing: subscribers see',
			'// only values sent after they subscribed. After Finish',
			'// (send(completion:)), Send is a no-op.',
			'type PassthroughSubject struct {',
			'	// your fields here (subscriber list + finished flag)',
			'}',
			'',
			'func NewPassthroughSubject() *PassthroughSubject {',
			'	return &PassthroughSubject{}',
			'}',
			'',
			'func (s *PassthroughSubject) Sink(receive func(int)) {',
			'	// your code here',
			'}',
			'',
			'func (s *PassthroughSubject) Send(v int) {',
			'	// your code here',
			'}',
			'',
			'func (s *PassthroughSubject) Finish() {',
			'	// your code here',
			'}',
			'',
			'// CurrentValueSubject is hot STATE: it always has a current value,',
			'// REPLAYS it to each new subscriber, and does NOT dedupe — equal',
			'// consecutive sends are all delivered. After Finish, Send is a',
			'// no-op (the value stays frozen).',
			'type CurrentValueSubject struct {',
			'	// your fields here (value + subscriber list + finished flag)',
			'}',
			'',
			'func NewCurrentValueSubject(initial int) *CurrentValueSubject {',
			'	return &CurrentValueSubject{}',
			'}',
			'',
			'// Sink registers AND immediately replays the current value.',
			'func (s *CurrentValueSubject) Sink(receive func(int)) {',
			'	// your code here',
			'}',
			'',
			'func (s *CurrentValueSubject) Send(v int) {',
			'	// your code here',
			'}',
			'',
			'func (s *CurrentValueSubject) Finish() {',
			'	// your code here',
			'}',
			'',
			'func (s *CurrentValueSubject) Value() int {',
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
			'	// eager builds the 1..100 generator with an attempt counter — the',
			'	// side effect that PROVES whether the upstream was stopped.',
			'	eager := func(attempts *int) *Publisher {',
			'		return NewPublisher(func(emit func(int) bool) {',
			'			for i := 1; i <= 100; i++ {',
			'				*attempts++',
			'				if !emit(i) {',
			'					return',
			'				}',
			'			}',
			'		})',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"cold means per-subscriber: two sinks on one publisher run the generator twice — the doubled /users request",',
			'			"runs=2 first=[10 20] second=[10 20]",',
			'			func() string {',
			'				runs := 0',
			'				p := NewPublisher(func(emit func(int) bool) {',
			'					runs++',
			'					emit(10)',
			'					emit(20)',
			'				})',
			'				var first, second []int',
			'				p.Sink(func(v int) { first = append(first, v) })',
			'				p.Sink(func(v int) { second = append(second, v) })',
			'				return fmt.Sprintf("runs=%d first=%v second=%v", runs, first, second)',
			'			}},',
			'		{"operators are lazy: building Filter(...).Map(...) subscribes to NOTHING — the generator never fires",',
			'			"runs=0",',
			'			func() string {',
			'				runs := 0',
			'				p := NewPublisher(func(emit func(int) bool) {',
			'					runs++',
			'					emit(1)',
			'				})',
			'				_ = p.Filter(func(v int) bool { return v > 0 }).Map(func(v int) int { return v * 2 })',
			'				return fmt.Sprintf("runs=%d", runs)',
			'			}},',
			'		{"Map transforms every value on the way through: 1 2 3 through *10",',
			'			"got=[10 20 30]",',
			'			func() string {',
			'				var got []int',
			'				Sequence(1, 2, 3).Map(func(v int) int { return v * 10 }).Sink(func(v int) { got = append(got, v) })',
			'				return fmt.Sprintf("got=%v", got)',
			'			}},',
			'		{"Filter drops values without stopping the stream: evens of 1..6",',
			'			"got=[2 4 6]",',
			'			func() string {',
			'				var got []int',
			'				Sequence(1, 2, 3, 4, 5, 6).Filter(func(v int) bool { return v%2 == 0 }).Sink(func(v int) { got = append(got, v) })',
			'				return fmt.Sprintf("got=%v", got)',
			'			}},',
			'		{"Prefix(2) cancels the upstream: the eager 1..100 generator attempts exactly 2 emits, sees false, and stops — receive cancel",',
			'			"collected=[1 2] attempts=2",',
			'			func() string {',
			'				attempts := 0',
			'				var got []int',
			'				eager(&attempts).Prefix(2).Sink(func(v int) { got = append(got, v) })',
			'				return fmt.Sprintf("collected=%v attempts=%d", got, attempts)',
			'			}},',
			'		{"Prefix larger than the stream: everything is delivered and the publisher completes normally — the stop signal never fires",',
			'			"got=[1 2 3]",',
			'			func() string {',
			'				var got []int',
			'				Sequence(1, 2, 3).Prefix(5).Sink(func(v int) { got = append(got, v) })',
			'				return fmt.Sprintf("got=%v", got)',
			'			}},',
			'		{"operator order matters: Filter(even) then Prefix(2) counts SURVIVORS — the upstream must emit 4 values to satisfy it",',
			'			"collected=[2 4] attempts=4",',
			'			func() string {',
			'				attempts := 0',
			'				var got []int',
			'				eager(&attempts).Filter(func(v int) bool { return v%2 == 0 }).Prefix(2).Sink(func(v int) { got = append(got, v) })',
			'				return fmt.Sprintf("collected=%v attempts=%d", got, attempts)',
			'			}},',
			'		{"RemoveDuplicates drops CONSECUTIVE equals only: 1 1 2 2 1 keeps the return to 1",',
			'			"got=[1 2 1]",',
			'			func() string {',
			'				var got []int',
			'				Sequence(1, 1, 2, 2, 1).RemoveDuplicates().Sink(func(v int) { got = append(got, v) })',
			'				return fmt.Sprintf("got=%v", got)',
			'			}},',
			'		{"PassthroughSubject replays nothing: the late sink missed send(1) forever and sees only what came after",',
			'			"early=[1 2] late=[2]",',
			'			func() string {',
			'				s := NewPassthroughSubject()',
			'				var early, late []int',
			'				s.Sink(func(v int) { early = append(early, v) })',
			'				s.Send(1)',
			'				s.Sink(func(v int) { late = append(late, v) })',
			'				s.Send(2)',
			'				return fmt.Sprintf("early=%v late=%v", early, late)',
			'			}},',
			'		{"CurrentValueSubject replays its CURRENT value on subscribe: the late sink gets 1 immediately, then the live 2",',
			'			"early=[0 1 2] late=[1 2] value=2",',
			'			func() string {',
			'				s := NewCurrentValueSubject(0)',
			'				var early, late []int',
			'				s.Sink(func(v int) { early = append(early, v) })',
			'				s.Send(1)',
			'				s.Sink(func(v int) { late = append(late, v) })',
			'				s.Send(2)',
			'				return fmt.Sprintf("early=%v late=%v value=%d", early, late, s.Value())',
			'			}},',
			'		{"CurrentValueSubject does NOT dedupe (unlike Kotlin\'s StateFlow): send(5) twice is delivered twice — distinct is an operator you opt into",',
			'			"got=[0 5 5]",',
			'			func() string {',
			'				s := NewCurrentValueSubject(0)',
			'				var got []int',
			'				s.Sink(func(v int) { got = append(got, v) })',
			'				s.Send(5)',
			'				s.Send(5)',
			'				return fmt.Sprintf("got=%v", got)',
			'			}},',
			'		{"completion is terminal: after Finish, sends are dropped — the Passthrough sink never sees 2, the CurrentValue stays frozen at 3",',
			'			"pass=[1] value=3",',
			'			func() string {',
			'				pass := NewPassthroughSubject()',
			'				var got []int',
			'				pass.Sink(func(v int) { got = append(got, v) })',
			'				pass.Send(1)',
			'				pass.Finish()',
			'				pass.Send(2)',
			'				cvs := NewCurrentValueSubject(3)',
			'				cvs.Finish()',
			'				cvs.Send(9)',
			'				return fmt.Sprintf("pass=%v value=%d", got, cvs.Value())',
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
			'// Publisher is a COLD stream: nothing but the recipe. One function',
			'// field is the honest truth about Combine too — the Publisher',
			'// protocol has a single requirement, receive(subscriber:), and',
			'// everything else is composition over it.',
			'type Publisher struct {',
			'	attach func(emit func(int) bool)',
			'}',
			'',
			'// NewPublisher stores the generator. Deliberately NO execution:',
			'// construction being free is what "cold" means.',
			'func NewPublisher(attach func(emit func(int) bool)) *Publisher {',
			'	return &Publisher{attach: attach}',
			'}',
			'',
			'// Sequence is (vals...).publisher — a generator that also honors the',
			'// stop signal, so Prefix can cut a fixed sequence short too.',
			'func Sequence(vals ...int) *Publisher {',
			'	return NewPublisher(func(emit func(int) bool) {',
			'		for _, v := range vals {',
			'			if !emit(v) {',
			'				return',
			'			}',
			'		}',
			'	})',
			'}',
			'',
			'// Sink is the terminal operator — the ONLY place a recipe runs.',
			'// Each call re-runs the generator from the top: two sinks, two',
			'// network requests. The emit it supplies always answers true; a',
			'// plain sink consumes to the end.',
			'func (p *Publisher) Sink(receive func(int)) {',
			'	p.attach(func(v int) bool {',
			'		receive(v)',
			'		return true',
			'	})',
			'}',
			'',
			'// Map wraps: the new publisher\'s generator runs the upstream with',
			'// an emit that transforms first. It passes the DOWNSTREAM verdict',
			'// back upstream unchanged — operators are transparent conduits for',
			'// the stop signal, which is why cancellation reaches the source',
			'// through any depth of chain.',
			'func (p *Publisher) Map(fn func(int) int) *Publisher {',
			'	return NewPublisher(func(emit func(int) bool) {',
			'		p.attach(func(v int) bool {',
			'			return emit(fn(v))',
			'		})',
			'	})',
			'}',
			'',
			'// Filter wraps likewise; a dropped value answers true — "keep',
			'// producing" — because dropping is not stopping.',
			'func (p *Publisher) Filter(fn func(int) bool) *Publisher {',
			'	return NewPublisher(func(emit func(int) bool) {',
			'		p.attach(func(v int) bool {',
			'			if !fn(v) {',
			'				return true',
			'			}',
			'			return emit(v)',
			'		})',
			'	})',
			'}',
			'',
			'// Prefix delivers n values, then reports false upstream — the',
			'// model\'s version of the "receive cancel" the .print() operator',
			'// shows. Either encoding, stopping is COOPERATIVE: a generator that',
			'// ignores the signal computes values nobody will ever see.',
			'func (p *Publisher) Prefix(n int) *Publisher {',
			'	return NewPublisher(func(emit func(int) bool) {',
			'		if n <= 0 {',
			'			return // nothing wanted: never even start the upstream',
			'		}',
			'		taken := 0',
			'		p.attach(func(v int) bool {',
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
			'// RemoveDuplicates keeps one value of lookback — consecutive equals',
			'// only. The has flag distinguishes "no previous value" from "the',
			'// previous value was 0"; comparing against a zero-valued sentinel',
			'// is the classic bug this flag avoids.',
			'func (p *Publisher) RemoveDuplicates() *Publisher {',
			'	return NewPublisher(func(emit func(int) bool) {',
			'		has := false',
			'		last := 0',
			'		p.attach(func(v int) bool {',
			'			if has && v == last {',
			'				return true // dropped, not stopped',
			'			}',
			'			has = true',
			'			last = v',
			'			return emit(v)',
			'		})',
			'	})',
			'}',
			'',
			'// PassthroughSubject: hot, no storage. Just a fan-out list and the',
			'// terminal flag — events, not state, which is why a late subscriber',
			'// has simply missed what came before.',
			'type PassthroughSubject struct {',
			'	subs     []func(int)',
			'	finished bool',
			'}',
			'',
			'func NewPassthroughSubject() *PassthroughSubject {',
			'	return &PassthroughSubject{}',
			'}',
			'',
			'// Sink registers, replays nothing. Registration order is delivery',
			'// order — deterministic, like Combine\'s subscriber list.',
			'func (s *PassthroughSubject) Sink(receive func(int)) {',
			'	s.subs = append(s.subs, receive)',
			'}',
			'',
			'// Send fans out to every subscriber — unless the subject already',
			'// completed: completion is terminal, later sends are dropped.',
			'func (s *PassthroughSubject) Send(v int) {',
			'	if s.finished {',
			'		return',
			'	}',
			'	for _, sub := range s.subs {',
			'		sub(v)',
			'	}',
			'}',
			'',
			'func (s *PassthroughSubject) Finish() {',
			'	s.finished = true',
			'}',
			'',
			'// CurrentValueSubject: hot STATE. Everything Passthrough has, plus',
			'// one stored value — and that one field changes the contract: new',
			'// subscribers replay it, and Value() reads it synchronously.',
			'type CurrentValueSubject struct {',
			'	value    int',
			'	subs     []func(int)',
			'	finished bool',
			'}',
			'',
			'func NewCurrentValueSubject(initial int) *CurrentValueSubject {',
			'	return &CurrentValueSubject{value: initial}',
			'}',
			'',
			'// Sink registers and IMMEDIATELY replays the current value — a late',
			'// subscriber never renders blank. Note what is absent versus',
			'// Kotlin\'s StateFlow: no equality check anywhere. Deduping is',
			'// removeDuplicates(), an operator you opt into.',
			'func (s *CurrentValueSubject) Sink(receive func(int)) {',
			'	s.subs = append(s.subs, receive)',
			'	receive(s.value)',
			'}',
			'',
			'// Send updates the stored value, then fans out. After Finish the',
			'// subject is frozen: no delivery, and the value stops changing too.',
			'func (s *CurrentValueSubject) Send(v int) {',
			'	if s.finished {',
			'		return',
			'	}',
			'	s.value = v',
			'	for _, sub := range s.subs {',
			'		sub(v)',
			'	}',
			'}',
			'',
			'func (s *CurrentValueSubject) Finish() {',
			'	s.finished = true',
			'}',
			'',
			'func (s *CurrentValueSubject) Value() int {',
			'	return s.value',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why cold-per-subscriber surprises every iOS team once</h3>' +
			'<p><code>URLSession.dataTaskPublisher</code>, a <code>Future</code> ' +
			'wrapped in <code>Deferred</code>, a Core Data fetch bridged into a ' +
			'publisher — all cold. Every <code>sink</code>, every ' +
			'<code>assign(to:on:)</code>, every debug attachment is another run of ' +
			'the generator: another request, another query. The standard fix is to ' +
			'make the stream hot exactly once at the boundary — ' +
			'<code>.share()</code> (one upstream subscription fanned out) or ' +
			'<code>.multicast(subject:)</code> when you need replay control — the ' +
			'same move as Kotlin\'s <code>stateIn</code>, which you may recognize ' +
			'from this track\'s Android sibling. A subtlety worth knowing: bare ' +
			'<code>Future</code> is actually <em>eager and shared</em> (it runs its ' +
			'closure at creation, once); it is <code>Deferred { Future { … } }</code> ' +
			'that restores cold semantics — a pairing interviewers love to probe.</p>' +
			'<h3>The subjects, and the dedupe trap that runs the other way</h3>' +
			'<p><code>CurrentValueSubject</code> is UI state (a late subscriber — a ' +
			'view appearing after the data loaded — must render <em>now</em>, hence ' +
			'the replay); <code>PassthroughSubject</code> is UI events (a tap that ' +
			'happened before you subscribed should not replay). The asymmetry with ' +
			'Kotlin is the exam question: StateFlow dedupes built-in, Combine does ' +
			'not — so the same architecture ported to Swift re-renders on every ' +
			'<code>send</code> of an unchanged model until someone adds ' +
			'<code>.removeDuplicates()</code> before the UI. <code>@Published</code> ' +
			'adds its own quirk: it emits on <code>willSet</code>, so a subscriber ' +
			'reading the property inside its own sink sees the <em>old</em> value — ' +
			'a bug generator famous enough to be a WWDC slide. And the most common ' +
			'Combine bug of all is not semantic but lifetime: <code>sink</code> ' +
			'returns an <code>AnyCancellable</code>, and if you do not store it, ' +
			'deallocation cancels the subscription instantly — the “my sink fires ' +
			'zero times” ticket is almost always a discarded cancellable.</p>' +
			'<h3>Demand, cancellation, and where this all went</h3>' +
			'<p>Your <code>emit → bool</code> collapses two real mechanisms: ' +
			'<code>Subscription.request(_ demand:)</code> — backpressure, the ' +
			'subscriber pulling N values — and <code>cancel()</code>, which ' +
			'<code>prefix</code> issues after delivering its quota (the ' +
			'<code>receive cancel</code> line in the prose trace). Go\'s ' +
			'<code>iter.Seq</code> made the identical simplification officially: ' +
			'<code>yield func(V) bool</code>, where returning false stops the ' +
			'producer — your model is that idiom, verbatim. As for Combine itself: ' +
			'Apple has quietly frozen it in favor of ' +
			'<code>AsyncSequence</code>/<code>AsyncStream</code> (every publisher ' +
			'bridges via <code>.values</code>), but the cold/hot distinction, the ' +
			'replay question, and cooperative cancellation transfer unchanged — ' +
			'they are properties of streams, not of frameworks. SwiftUI\'s ' +
			'<code>@Published</code>/<code>ObservableObject</code> plumbing still ' +
			'runs on Combine, which is why the next chapter (SwiftUI state) keeps ' +
			'meeting these semantics under new names.</p>',
		],
		complexity: { time: 'O(n·k) per Sink — each value crosses k operator wrappers; O(s) fan-out per subject Send', space: 'O(k) closures per chain; O(s) subscriber lists' },
	});
})();
