/* Isolates — Isolates (lesson). Dart's answer to threads shares NOTHING:
 * each isolate has its own heap and event loop, and messages between them
 * are copied. The learner implements the copy — and sees why "no data races,
 * by construction" is the honest version of that claim.
 */
(function () {
	'use strict';
	var T = GoLearnDart;

	T.lesson({
		id: 'isolates',
		title: 'Isolates vs Goroutines',
		nav: 'isolates',
		category: 'Isolates',

		prose: [
			'<h2>Isolates vs Goroutines</h2>' +
			'<p>Goroutines share one heap. That is their superpower (pass a pointer, ' +
			'zero copies) and their tax: any two goroutines touching the same data ' +
			'need a mutex or a channel discipline, and the race detector exists ' +
			'because humans lose that game. Dart\'s unit of concurrency, the ' +
			'<strong>isolate</strong>, refuses to play: separate heap, separate event ' +
			'loop, <em>no shared memory at all</em>. The only bridge is message ' +
			'passing — and the message is <strong>copied</strong>:</p>',
			{ lang: 'dart', code: "final msg = [1, 2, 3];\nsendPort.send(msg);   // msg is deep-copied into the other isolate's heap\nmsg[0] = 99;          // the receiver's copy still reads [1, 2, 3]" },
			'<p>Go\'s slogan — "don\'t communicate by sharing memory; share memory by ' +
			'communicating" — is a <em>convention</em>: the channel sends a pointer, ' +
			'and nothing stops both sides from using it. Dart enforces the slogan ' +
			'physically. No mutexes exist in the language because there is nothing to ' +
			'lock; a data race is not "detected", it is unrepresentable. The price is ' +
			'the copy (big messages cost real time) and the ceremony of ports — which ' +
			'is why day-to-day code uses the wrapped forms, <code>Isolate.run()</code> ' +
			'and Flutter\'s <code>compute()</code>, for "run this function on its own ' +
			'heap and send me the result".</p>' +
			'<h3>Your job</h3>' +
			'<p>The model is a Go channel standing in for a <code>SendPort</code>. ' +
			'<code>send</code> currently does what a goroutine would do — it sends the ' +
			'slice itself, sharing the backing array across the "isolate" boundary, so ' +
			'the sender\'s later mutation leaks into the receiver. Fix it: copy the ' +
			'message before sending, like a real isolate boundary does. The receiver ' +
			'must keep <code>[1 2 3]</code> no matter what the sender does ' +
			'afterward.</p>',
		],

		task: 'Fix send: copy the message across the boundary so the sender\'s later mutation never reaches the receiver.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// send models SendPort.send across an isolate boundary. The channel',
			'// is buffered so the send completes without a waiting receiver —',
			'// isolate sends never block the sender.',
			'func send(port chan []int, msg []int) {',
			'	// TODO: an isolate boundary COPIES the message. Sending the slice',
			'	// itself shares its backing array — that\'s goroutine behavior,',
			'	// exactly what isolates forbid.',
			'	port <- msg',
			'}',
			'',
			'func main() {',
			'	port := make(chan []int, 1)',
			'',
			'	msg := []int{1, 2, 3}',
			'	send(port, msg)',
			'	msg[0] = 99 // sender mutates AFTER sending',
			'',
			'	received := <-port // the other isolate reads its copy',
			'	fmt.Println("received:", received)',
			'	fmt.Println("sender mutation visible to receiver:", received[0] == 99)',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('received: [1 2 3]') !== -1 &&
				flat.indexOf('sender mutation visible to receiver: false') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// send models SendPort.send across an isolate boundary. The channel',
			'// is buffered so the send completes without a waiting receiver —',
			'// isolate sends never block the sender.',
			'//',
			'// The copy is the entire isolation model: once the message is',
			'// duplicated into the receiver\'s heap, no later action of the sender',
			'// can be observed on the other side — which is precisely the property',
			'// that makes locks unnecessary. (Real Dart deep-copies object graphs;',
			'// a flat slice needs only this one level.)',
			'func send(port chan []int, msg []int) {',
			'	copied := append([]int(nil), msg...)',
			'	port <- copied',
			'}',
			'',
			'func main() {',
			'	port := make(chan []int, 1)',
			'',
			'	msg := []int{1, 2, 3}',
			'	send(port, msg)',
			'	msg[0] = 99 // sender mutates AFTER sending',
			'',
			'	received := <-port // the other isolate reads its copy',
			'	fmt.Println("received:", received)',
			'	fmt.Println("sender mutation visible to receiver:", received[0] == 99)',
			'}',
			'',
		].join('\n'),
	});
})();
