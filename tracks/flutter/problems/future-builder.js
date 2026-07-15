/* FutureBuilder — Async UI (lesson). Async data in a declarative UI: you
 * don't await and then build — you build NOW for whatever state the future
 * is in, and rebuild when it changes. The learner implements the snapshot
 * state machine, error branch first.
 */
(function () {
	'use strict';
	var T = GoLearnFlutter;

	T.lesson({
		id: 'future-builder',
		title: 'FutureBuilder & Snapshots',
		nav: 'FutureBuilder',
		category: 'Async UI',

		prose: [
			'<h2>FutureBuilder &amp; Snapshots</h2>' +
			'<p><code>build()</code> is synchronous and must return a widget ' +
			'<em>now</em> — but the data is a <code>Future</code>. The declarative ' +
			'answer is to render the future\'s <em>current status</em> and let ' +
			'completion trigger a rebuild (the setState machinery again, wired up ' +
			'for you):</p>',
			{ lang: 'dart', code: "FutureBuilder<List<Item>>(\n  future: itemsFuture,          // create this in initState, NOT here!\n  builder: (context, snapshot) {\n    if (snapshot.hasError)    return Text('error: ${snapshot.error}');\n    if (snapshot.hasData)     return ItemList(snapshot.data!);\n    return CircularProgressIndicator();   // still waiting\n  },\n)" },
			'<p>The <code>snapshot</code> is a tiny state machine: a connection state ' +
			'(<code>waiting</code> → <code>done</code>) plus, once done, either data ' +
			'or an error. Branch order is the part people get wrong: check ' +
			'<code>hasError</code> <em>before</em> <code>hasData</code>, or a failed ' +
			'future shows your spinner forever. And the comment in the snippet is the ' +
			'other classic: create the future once (in <code>initState</code>) — ' +
			'creating it inside <code>build</code> restarts the request on every ' +
			'rebuild, an infinite spinner powered by your own setState calls.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>buildSnapshot</code> — the builder\'s branch, in the ' +
			'right order: waiting → spinner; done with an error → the error text; ' +
			'done with data → the data text. The replay drives one widget through ' +
			'two frames (waiting, then data) and a second widget whose future ' +
			'fails.</p>',
		],

		task: 'Implement buildSnapshot: waiting → spinner; error (checked FIRST) → error text; data → data text.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// snapshot is AsyncSnapshot, reduced to the bits that decide the UI.',
			'type snapshot struct {',
			'	state string // "waiting" or "done"',
			'	data  string // set when the future completed with a value',
			'	err   string // set when the future completed with an error',
			'}',
			'',
			'// buildSnapshot is the builder callback: snapshot in, widget out.',
			'func buildSnapshot(s snapshot) string {',
			'	// TODO: three branches, in the RIGHT order:',
			'	//   waiting            -> "CircularProgressIndicator"',
			'	//   done with an error -> "Text(error: <err>)"',
			'	//   done with data     -> "Text(<data>)"',
			'	return "Text(" + s.data + ")"',
			'}',
			'',
			'func main() {',
			'	// One FutureBuilder across two frames: pending, then completed.',
			'	fmt.Println("frame 1:", buildSnapshot(snapshot{state: "waiting"}))',
			'	fmt.Println("frame 2:", buildSnapshot(snapshot{state: "done", data: "42 items"}))',
			'',
			'	// A second one whose future fails.',
			'	fmt.Println("failed future:", buildSnapshot(snapshot{state: "done", err: "timeout"}))',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('frame 1: CircularProgressIndicator') !== -1 &&
				flat.indexOf('frame 2: Text(42 items)') !== -1 &&
				flat.indexOf('failed future: Text(error: timeout)') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// snapshot is AsyncSnapshot, reduced to the bits that decide the UI.',
			'type snapshot struct {',
			'	state string // "waiting" or "done"',
			'	data  string // set when the future completed with a value',
			'	err   string // set when the future completed with an error',
			'}',
			'',
			'// buildSnapshot is the builder callback: snapshot in, widget out.',
			'// The error branch outranks the data branch on purpose: a snapshot',
			'// can carry stale data alongside a fresh error (StreamBuilder does',
			'// exactly that), and rendering data over an error hides failures.',
			'// The waiting branch is simply "neither outcome exists yet".',
			'func buildSnapshot(s snapshot) string {',
			'	if s.state == "waiting" {',
			'		return "CircularProgressIndicator"',
			'	}',
			'	if s.err != "" {',
			'		return "Text(error: " + s.err + ")"',
			'	}',
			'	return "Text(" + s.data + ")"',
			'}',
			'',
			'func main() {',
			'	// One FutureBuilder across two frames: pending, then completed.',
			'	fmt.Println("frame 1:", buildSnapshot(snapshot{state: "waiting"}))',
			'	fmt.Println("frame 2:", buildSnapshot(snapshot{state: "done", data: "42 items"}))',
			'',
			'	// A second one whose future fails.',
			'	fmt.Println("failed future:", buildSnapshot(snapshot{state: "done", err: "timeout"}))',
			'}',
			'',
		].join('\n'),
	});
})();
