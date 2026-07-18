/* useeffect — effects are for AFTER render (subscriptions, DOM, timers), never
 * for computing render output. The platform's static render NEVER runs effects,
 * and this lesson weaponizes that: the starter derives a cart total inside a
 * useEffect + setState (the classic redundant-state antipattern), so the graded
 * outline shows the stale initial 0 and the effect's console.log never appears —
 * two pieces of hard evidence. The solution derives during render with a plain
 * const (outline shows 104, render-scope log lands in the console section) and
 * keeps ONE legitimate effect (document.title sync) that only runs in the live
 * preview. Check pins the correct total, the render-scope log, and the ABSENCE
 * of the effect's marker log.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'useeffect',
		title: 'useEffect',
		nav: 'useEffect',
		category: 'Hooks in Depth',

		prose: [
			'<h2>useEffect runs after render — not during it</h2>' +
			'<p>A component render is a pure computation: props and state in, ' +
			'JSX out. <code>useEffect</code> is the escape hatch for everything ' +
			'that is <em>not</em> that computation — talking to systems React ' +
			'does not own. Subscriptions, timers, network requests, syncing ' +
			'<code>document.title</code>: all of it happens <strong>after</strong> ' +
			'the frame is committed. React renders first, paints, <em>then</em> ' +
			'runs your effect. Which means an effect can never contribute to the ' +
			'render output of the frame it belongs to.</p>',
			{ lang: 'js', code: '// A LEGITIMATE effect: sync something outside React with state.\nReact.useEffect(() => {\n  const id = setInterval(() => console.log(\'tick\'), 1000);\n  return () => clearInterval(id); // cleanup when deps change / unmount\n}, []); // deps: [] = run once after the first render' },
			'<p>The most common misuse follows directly from missing that ' +
			'timeline: computing a value <em>from existing state</em> inside an ' +
			'effect and storing it with <code>setState</code>. Now the derived ' +
			'value is second-class state — born stale, updated one render late, ' +
			'and able to disagree with its source. If a value can be computed ' +
			'from what you already have, compute it <strong>during render</strong> ' +
			'with a plain <code>const</code>. No hook, no lag, no second copy of ' +
			'the truth.</p>' +
			'<ul>' +
			'<li><strong>Derived from props/state?</strong> Plain <code>const</code> in the component body.</li>' +
			'<li><strong>Owned by the user?</strong> (what they typed, what they clicked) — <code>useState</code>.</li>' +
			'<li><strong>Owned by the outside world?</strong> (DOM, timers, sockets) — <code>useEffect</code>.</li>' +
			'</ul>',
			'<p>This platform makes the timeline visible. The graded outline is ' +
			'the <em>initial static render only</em> — effects never run there ' +
			'at all. Run the starter and read the evidence: the total shows its ' +
			'stale initial <code>0</code>, and the effect&#39;s ' +
			'<code>console.log</code> line is simply absent from the console ' +
			'section. In the live preview the effect does fire and the number ' +
			'&quot;fixes itself&quot; a beat later — which is exactly the bug ' +
			'shipping to users as a flash of wrong data.</p>' +
			'<h3>Your job</h3>' +
			'<p>Delete the <code>total</code> state and the effect that fills ' +
			'it. Derive <code>total</code> during render with a plain ' +
			'<code>const</code> and log <code>derived during render</code> right ' +
			'where you compute it, so the log proves <em>when</em> the work ' +
			'happens. Keep exactly one <em>legitimate</em> effect: sync ' +
			'<code>document.title</code> to the total (DOM access is fine inside ' +
			'an effect — it only executes in the live preview, never in the ' +
			'graded run).</p>' +
			'<div class="tip">Litmus test before reaching for ' +
			'<code>useEffect</code>: &quot;does this code need to run when no ' +
			'render is happening?&quot; A subscription does. A sum of a list ' +
			'never does — that is just rendering.</div>',
		],

		task: 'Derive total during render (plain const + log), drop the redundant state, keep one legitimate document.title effect.',

		starter: [
			'function App() {',
			'	const [items] = React.useState([',
			'		{ name: \'keyboard\', price: 79 },',
			'		{ name: \'mouse\', price: 25 },',
			'	]);',
			'',
			'	// ANTIPATTERN: total is derived data stored as state, filled in',
			'	// by an effect AFTER render. The graded outline below never runs',
			'	// effects — so it shows the stale initial 0, and the log line',
			'	// inside the effect never appears. Both are evidence.',
			'	const [total, setTotal] = React.useState(0);',
			'',
			'	React.useEffect(() => {',
			'		console.log(\'effect: recomputing total\');',
			'		setTotal(items.reduce((sum, it) => sum + it.price, 0));',
			'	}, [items]);',
			'',
			'	return (',
			'		<div>',
			'			<ul>',
			'				{items.map(it => <li key={it.name}>{it.name}</li>)}',
			'			</ul>',
			'			<p>Total: {total}</p>',
			'		</div>',
			'	);',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('p\n    "Total: 104"') &&
				flat.includes('derived during render') &&
				!flat.includes('effect: recomputing');
		},

		solution: [
			'function App() {',
			'	const [items] = React.useState([',
			'		{ name: \'keyboard\', price: 79 },',
			'		{ name: \'mouse\', price: 25 },',
			'	]);',
			'',
			'	// Derived DURING render: a plain const, recomputed from items on',
			'	// every render. Always in sync, correct on the very first frame —',
			'	// the outline shows 104 and this log lands in the console section.',
			'	const total = items.reduce((sum, it) => sum + it.price, 0);',
			'	console.log(\'derived during render\');',
			'',
			'	// A legitimate effect: syncing something React does not own (the',
			'	// document title) with state. Runs only in the live preview —',
			'	// the graded static render never executes effects.',
			'	React.useEffect(() => {',
			'		document.title = \'Cart: \' + total;',
			'	}, [total]);',
			'',
			'	return (',
			'		<div>',
			'			<ul>',
			'				{items.map(it => <li key={it.name}>{it.name}</li>)}',
			'			</ul>',
			'			<p>Total: {total}</p>',
			'		</div>',
			'	);',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>State only for what the user owns</h3>' +
			'<p>The fix deletes state instead of adding code: <code>items</code> ' +
			'stays as state (it is the source of truth a user could edit), and ' +
			'<code>total</code> becomes <code>items.reduce(...)</code> — a plain ' +
			'expression evaluated as part of the render. It cannot be stale ' +
			'because it does not persist; it is recomputed from the truth every ' +
			'time the truth is rendered.</p>',
			{ lang: 'js', code: '// Before: two sources of truth, one of them late.\nconst [total, setTotal] = React.useState(0);\nReact.useEffect(() => { setTotal(sum(items)); }, [items]);\n\n// After: one source of truth, derived on demand.\nconst total = sum(items);' },
			'<h3>Reading the evidence</h3>' +
			'<p>The starter&#39;s outline said <code>&quot;Total: 0&quot;</code> ' +
			'with no console section at all — proof that neither the effect body ' +
			'nor its log participate in producing a frame. The solution&#39;s ' +
			'outline says <code>&quot;Total: 104&quot;</code> and logs ' +
			'<code>derived during render</code>, because derivation now ' +
			'<em>is</em> rendering. The one surviving effect touches ' +
			'<code>document.title</code> — real DOM, so it belongs after the ' +
			'commit, and it is invisible to the graded run by design. The ' +
			'starter also cost an extra render pass in the live preview: render ' +
			'with 0, effect fires, <code>setTotal</code> schedules render two. ' +
			'Derive-in-effect always pays that double-render tax.</p>',
		],
	});
})();
