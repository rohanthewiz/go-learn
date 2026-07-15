/* Streams — Async (lesson). A Future is one async value; a Stream is many.
 * The learner implements the async* generator (Go channel, one goroutine)
 * and the rule that trips everyone: a plain stream allows exactly ONE
 * listener — the second gets "Bad state".
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	T.lesson({
		id: 'streams',
		title: 'Streams & async*',
		nav: 'streams & async*',
		category: 'Async',

		prose: [
			'<h2>Streams &amp; <code>async*</code></h2>' +
			'<p>Where Go says "a sequence of values over time is a channel", Dart says ' +
			'<code>Stream</code>. Producing one is an <code>async*</code> generator — ' +
			'a function that <code>yield</code>s instead of returning — and consuming ' +
			'one is <code>await for</code>, Dart\'s <code>range</code>:</p>',
			{ lang: 'dart', code: "Stream<int> countdown(int from) async* {\n  for (var i = from; i > 0; i--) {\n    yield i;                      // emit one value, suspend until pulled\n  }\n}\n\nawait for (final n in countdown(3)) {\n  print(n);                       // 3, 2, 1\n}" },
			'<p>The mapping to Go is nearly mechanical: <code>async*</code> body → ' +
			'goroutine, <code>yield</code> → channel send, generator done → ' +
			'<code>close</code>, <code>await for</code> → <code>range</code>. One rule ' +
			'has no Go analogue, though: a plain (single-subscription) stream may be ' +
			'listened to <strong>once, ever</strong>:</p>',
			{ lang: 'dart', code: "final s = countdown(3);\ns.listen(print);\ns.listen(print);   // Bad state: Stream has already been listened to." },
			'<p>Because a stream is lazy — the generator only runs when someone ' +
			'listens — a second listener poses an unanswerable question: replay from ' +
			'the start? join mid-flight? Dart refuses to guess. (When fan-out is what ' +
			'you mean, you say so: <code>asBroadcastStream()</code>.)</p>' +
			'<h3>Your job</h3>' +
			'<p><code>countdown</code> and its generator body are done. Implement ' +
			'<code>listen</code>: the <em>first</em> call starts the generator ' +
			'goroutine and returns its channel; a <em>second</em> call must return the ' +
			'<code>Bad state</code> error instead of restarting the generator.</p>',
		],

		task: 'Implement listen: first call starts the generator, second returns the "Bad state" error.',

		starter: [
			'package main',
			'',
			'import (',
			'	"errors"',
			'	"fmt"',
			')',
			'',
			'// stream is a single-subscription stream: a generator body, lazy',
			'// until listen(), plus the one bit the runtime keeps about it.',
			'type stream struct {',
			'	source   func(chan<- int)',
			'	listened bool',
			'}',
			'',
			'// countdown is the async* generator from the lesson: each channel',
			'// send is a `yield`, closing the channel is the generator returning.',
			'func countdown(from int) *stream {',
			'	return &stream{source: func(out chan<- int) {',
			'		for i := from; i > 0; i-- {',
			'			out <- i // yield i',
			'		}',
			'		close(out)',
			'	}}',
			'}',
			'',
			'// listen subscribes to the stream, starting the generator.',
			'func (s *stream) listen() (<-chan int, error) {',
			'	// TODO: enforce single subscription — a second listen returns',
			'	// errors.New("Bad state: Stream has already been listened to.")',
			'	// and must NOT start the generator again.',
			'	ch := make(chan int)',
			'	go s.source(ch)',
			'	return ch, nil',
			'}',
			'',
			'func main() {',
			'	s := countdown(3)',
			'',
			'	ch, err := s.listen()',
			'	if err != nil {',
			'		fmt.Println("first listen:", err)',
			'		return',
			'	}',
			'	for n := range ch { // await for (final n in ...)',
			'		fmt.Println("got", n)',
			'	}',
			'',
			'	if _, err := s.listen(); err != nil {',
			'		fmt.Println("second listen:", err)',
			'	} else {',
			'		fmt.Println("second listen: ok (!?)")',
			'	}',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('got 3 got 2 got 1') !== -1 &&
				flat.indexOf('second listen: Bad state: Stream has already been listened to.') !== -1;
		},

		solution: [
			'package main',
			'',
			'import (',
			'	"errors"',
			'	"fmt"',
			')',
			'',
			'// stream is a single-subscription stream: a generator body, lazy',
			'// until listen(), plus the one bit the runtime keeps about it.',
			'type stream struct {',
			'	source   func(chan<- int)',
			'	listened bool',
			'}',
			'',
			'// countdown is the async* generator from the lesson: each channel',
			'// send is a `yield`, closing the channel is the generator returning.',
			'func countdown(from int) *stream {',
			'	return &stream{source: func(out chan<- int) {',
			'		for i := from; i > 0; i-- {',
			'			out <- i // yield i',
			'		}',
			'		close(out)',
			'	}}',
			'}',
			'',
			'// listen subscribes to the stream, starting the generator. The',
			'// listened bit makes laziness safe: the generator\'s side effects run',
			'// at most once, so there is never a "which subscriber sees what?"',
			'// question — the error surfaces the bug at the second listen, not as',
			'// mysteriously duplicated work.',
			'func (s *stream) listen() (<-chan int, error) {',
			'	if s.listened {',
			'		return nil, errors.New("Bad state: Stream has already been listened to.")',
			'	}',
			'	s.listened = true',
			'	ch := make(chan int)',
			'	go s.source(ch)',
			'	return ch, nil',
			'}',
			'',
			'func main() {',
			'	s := countdown(3)',
			'',
			'	ch, err := s.listen()',
			'	if err != nil {',
			'		fmt.Println("first listen:", err)',
			'		return',
			'	}',
			'	for n := range ch { // await for (final n in ...)',
			'		fmt.Println("got", n)',
			'	}',
			'',
			'	if _, err := s.listen(); err != nil {',
			'		fmt.Println("second listen:", err)',
			'	} else {',
			'		fmt.Println("second listen: ok (!?)")',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
