/* Stateless vs Stateful — State & Rebuilds (lesson). The State lifecycle:
 * createState/initState run ONCE per element; when the parent rebuilds with
 * a new widget instance, the existing State gets didUpdateWidget — its
 * fields survive. The learner fixes a replay that wrongly re-initializes,
 * which is exactly the "my counter reset!" bug in reverse.
 */
(function () {
	'use strict';
	var T = GoLearnFlutter;

	T.lesson({
		id: 'stateless-vs-stateful',
		title: 'Stateless vs Stateful',
		nav: 'stateless vs stateful',
		category: 'State & Rebuilds',

		prose: [
			'<h2>Stateless vs Stateful</h2>' +
			'<p>A <code>StatelessWidget</code> is a pure function: configuration in, ' +
			'child widgets out, nothing remembered. A <code>StatefulWidget</code> is ' +
			'still immutable and still rebuilt constantly — the memory lives in a ' +
			'separate <code>State</code> object that the framework creates ' +
			'<strong>once</strong> and keeps alive across rebuilds:</p>',
			{ lang: 'dart', code: "class Counter extends StatefulWidget {\n  final String label;              // config: immutable, from the parent\n  @override\n  State<Counter> createState() => _CounterState();   // called ONCE\n}\n\nclass _CounterState extends State<Counter> {\n  int count = 0;                   // state: survives every rebuild\n  @override\n  void initState() { super.initState(); /* once, before first build */ }\n  @override\n  void didUpdateWidget(Counter old) { /* parent rebuilt: new config, SAME state */ }\n  @override\n  void dispose() { /* once, on unmount */ }\n}" },
			'<p>The lifecycle has exactly four beats worth memorizing:</p>' +
			'<ul>' +
			'<li><strong>mount</strong> — <code>createState</code>, ' +
			'<code>initState</code>, first <code>build</code>;</li>' +
			'<li><strong>setState</strong> — mutate, then <code>build</code> again ' +
			'(nothing else re-runs);</li>' +
			'<li><strong>parent rebuild</strong> — the parent made a <em>new Counter ' +
			'instance</em>; canUpdate says yes, so the framework swaps the config in, ' +
			'calls <code>didUpdateWidget</code>, and rebuilds — <code>count</code> ' +
			'is untouched;</li>' +
			'<li><strong>unmount</strong> — <code>dispose</code>, state gone.</li>' +
			'</ul>' +
			'<h3>Your job</h3>' +
			'<p>The replay handles mount, setState, and unmount correctly. The ' +
			'<code>parentRebuild</code> case has the classic mental-model bug: it ' +
			'treats a new widget instance as a new <em>element</em> and re-runs ' +
			'<code>initState</code>, resetting the count. Fix it to do what the ' +
			'framework does — <code>didUpdateWidget</code> then <code>build</code>, ' +
			'count preserved.</p>' +
			'<div class="tip">This one distinction answers half of Flutter\'s FAQ: ' +
			'state resets come from the element being <em>replaced</em> (type or key ' +
			'changed — see canUpdate), never from mere parent rebuilds.</div>',
		],

		task: 'Fix the parentRebuild case: didUpdateWidget + build with count preserved — no re-init.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// counterState is the State object: created once per element, owner',
			'// of everything that must survive rebuilds.',
			'type counterState struct {',
			'	count int',
			'}',
			'',
			'func main() {',
			'	events := []string{"mount", "setState", "parentRebuild", "unmount"}',
			'',
			'	var state *counterState',
			'	for _, ev := range events {',
			'		switch ev {',
			'		case "mount":',
			'			state = &counterState{} // createState',
			'			state.count = 0         // initState',
			'			fmt.Printf("mount: createState initState build(count=%d)\\n", state.count)',
			'		case "setState":',
			'			state.count++ // the mutation inside setState(() {...})',
			'			fmt.Printf("setState: build(count=%d)\\n", state.count)',
			'		case "parentRebuild":',
			'			// TODO: the parent rebuilt with a NEW Counter widget, but',
			'			// canUpdate said yes — the element and its State survive.',
			'			// This must be didUpdateWidget + build with count intact,',
			'			// not a re-initialization.',
			'			state = &counterState{}',
			'			state.count = 0',
			'			fmt.Printf("parent rebuild: createState initState build(count=%d)\\n", state.count)',
			'		case "unmount":',
			'			fmt.Println("unmount: dispose")',
			'			state = nil',
			'		}',
			'	}',
			'	_ = state',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('parent rebuild: didUpdateWidget build(count=1)') !== -1 &&
				flat.indexOf('setState: build(count=1)') !== -1 &&
				flat.indexOf('unmount: dispose') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// counterState is the State object: created once per element, owner',
			'// of everything that must survive rebuilds.',
			'type counterState struct {',
			'	count int',
			'}',
			'',
			'func main() {',
			'	events := []string{"mount", "setState", "parentRebuild", "unmount"}',
			'',
			'	var state *counterState',
			'	for _, ev := range events {',
			'		switch ev {',
			'		case "mount":',
			'			state = &counterState{} // createState',
			'			state.count = 0         // initState',
			'			fmt.Printf("mount: createState initState build(count=%d)\\n", state.count)',
			'		case "setState":',
			'			state.count++ // the mutation inside setState(() {...})',
			'			fmt.Printf("setState: build(count=%d)\\n", state.count)',
			'		case "parentRebuild":',
			'			// The new widget instance only replaces the CONFIG. The',
			'			// element — and this State object with it — survives, so',
			'			// the framework offers didUpdateWidget (compare old vs new',
			'			// config) and rebuilds. No createState, no initState:',
			'			// those belong to the element\'s birth, not its updates.',
			'			fmt.Printf("parent rebuild: didUpdateWidget build(count=%d)\\n", state.count)',
			'		case "unmount":',
			'			fmt.Println("unmount: dispose")',
			'			state = nil',
			'		}',
			'	}',
			'	_ = state',
			'}',
			'',
		].join('\n'),
	});
})();
