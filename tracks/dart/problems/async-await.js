/* async/await Ordering — Async (lesson). The rule that explains 90% of Dart
 * async confusion: calling an async function runs its body SYNCHRONOUSLY
 * until the first await, and only the rest is deferred. The learner
 * implements the split — prefix now, continuation onto the queue.
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	T.lesson({
		id: 'async-await',
		title: 'async/await Ordering',
		nav: 'async/await ordering',
		category: 'Async',

		prose: [
			'<h2>async/await Ordering</h2>' +
			'<p>In Go, <code>go f()</code> defers <em>all</em> of f to the scheduler — ' +
			'nothing of it runs at the call site. Dart\'s async functions make the ' +
			'opposite choice, and it surprises everyone once:</p>',
			{ lang: 'dart', code: "Future<void> fetchUser() async {\n  print('1: request sent');     // runs NOW, synchronously\n  await response;               // suspends here — control returns to caller\n  print('2: got response');     // runs later, from the event loop\n}\n\nvoid main() {\n  print('a: before call');\n  fetchUser();                  // no await — main keeps going\n  print('b: after call');\n}\n// a: before call\n// 1: request sent\n// b: after call\n// 2: got response" },
			'<p>An async function\'s body executes synchronously until the ' +
			'<strong>first await</strong>; the remainder — the <em>continuation</em> — ' +
			'is packaged up and scheduled for later. That is why side effects before ' +
			'the first await (logging, validation, taking a lock) happen immediately ' +
			'and in caller order, while everything after happens once the caller ' +
			'yields. Dart is single-threaded: nothing runs concurrently with your ' +
			'synchronous code, ever — concurrency only happens at the seams the ' +
			'<code>await</code>s cut.</p>' +
			'<h3>Your job</h3>' +
			'<p>The model splits an async body at its await: a <code>prefix</code> ' +
			'closure and a <code>rest</code> closure. <code>callAsync</code> currently ' +
			'runs both immediately — the Go-intuition bug. Fix it: run the prefix ' +
			'now, park <code>rest</code> on the <code>pending</code> queue (the event ' +
			'loop), which main drains after it finishes. The output must match the ' +
			'four-line comment above.</p>',
		],

		task: 'Fix callAsync: run prefix synchronously, queue rest on pending — so the order is a, 1, b, 2.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// pending is the event loop\'s queue: continuations parked by awaits,',
			'// run only after the current synchronous code gives up control.',
			'var pending []func()',
			'',
			'// callAsync invokes an async function whose body is split at its',
			'// first await: prefix is the code before it, rest the continuation.',
			'func callAsync(prefix, rest func()) {',
			'	// TODO: prefix runs synchronously, HERE. rest must not — park it',
			'	// on pending for the event loop.',
			'	prefix()',
			'	rest()',
			'}',
			'',
			'func main() {',
			'	fmt.Println("a: before call")',
			'	callAsync(',
			'		func() { fmt.Println("1: request sent") },',
			'		func() { fmt.Println("2: got response") },',
			'	)',
			'	fmt.Println("b: after call")',
			'',
			'	// The event loop: runs once main\'s synchronous code is done.',
			'	for len(pending) > 0 {',
			'		next := pending[0]',
			'		pending = pending[1:]',
			'		next()',
			'	}',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('a: before call 1: request sent b: after call 2: got response') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// pending is the event loop\'s queue: continuations parked by awaits,',
			'// run only after the current synchronous code gives up control.',
			'var pending []func()',
			'',
			'// callAsync invokes an async function whose body is split at its',
			'// first await: prefix is the code before it, rest the continuation.',
			'// The split IS the semantics: `async` doesn\'t move the body off the',
			'// caller\'s thread (there is only one thread) — it marks where the',
			'// body can be cut, and await makes the cut.',
			'func callAsync(prefix, rest func()) {',
			'	prefix()',
			'	pending = append(pending, rest)',
			'}',
			'',
			'func main() {',
			'	fmt.Println("a: before call")',
			'	callAsync(',
			'		func() { fmt.Println("1: request sent") },',
			'		func() { fmt.Println("2: got response") },',
			'	)',
			'	fmt.Println("b: after call")',
			'',
			'	// The event loop: runs once main\'s synchronous code is done.',
			'	for len(pending) > 0 {',
			'		next := pending[0]',
			'		pending = pending[1:]',
			'		next()',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
