/* usestate — THE lesson for the outline-vs-preview split. The outline is the
 * INITIAL frame (state at first render); the live preview is where clicks
 * advance it. The starter is a counter driven by a plain `let count = 0`
 * mutated in the handler: the variable changes, but nothing re-renders, so
 * preview clicks do nothing — proving that React re-renders on setState, not
 * on mutation. Solution switches to useState(5) with the updater form; the
 * check pins the initial-frame button text "count: 5" plus the render log
 * "render with 5", both unreachable from the starter's 0.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'usestate',
		title: 'useState',
		nav: 'useState',
		category: 'State & Events',

		prose: [
			'<h2>useState</h2>' +
			'<p>A component is a function, and a function&#39;s output can only ' +
			'change if something it reads changes <em>and someone calls it ' +
			'again</em>. Mutating a variable does half the job: the value moves, ' +
			'but React has no idea it happened, so the function is never re-run ' +
			'and the screen keeps showing the old render. <code>useState</code> ' +
			'closes the loop — it gives you a value <em>and</em> a setter, and ' +
			'calling the setter is the signal that schedules a re-render:</p>',
			{ lang: 'js', code: 'const [n, setN] = React.useState(0);\n// n     — the value for THIS render (a constant snapshot)\n// setN  — call it with the next value; React re-renders with it\n// 0     — the initial value, used only on the first render' },
			'<p>Read that destructuring literally: <code>n</code> is a ' +
			'<code>const</code>. It never changes within a render. When you call ' +
			'<code>setN(1)</code>, React runs your component function again, and ' +
			'<em>that</em> call gets <code>n === 1</code>. Each render is a ' +
			'frozen photograph of state at one instant — which is exactly what ' +
			'this page shows you twice: the <strong>outline pane is the first ' +
			'photograph</strong> (initial state, handlers never fired), while ' +
			'the <strong>live preview keeps taking new ones</strong> as you ' +
			'click. Click the counter in the preview and watch it advance while ' +
			'the outline stays put — that is not a bug, it is the definition of ' +
			'a render.</p>' +
			'<p>Because <code>n</code> is a snapshot, computing the next value ' +
			'from it can go stale. The classic bug — two increments that add ' +
			'one:</p>',
			{ lang: 'js', code: 'function PlusTwo() {\n  const [n, setN] = React.useState(0);\n  const bump2 = () => {\n    setN(n + 1); // reads this render\'s snapshot: 0 -> schedules 1\n    setN(n + 1); // reads the SAME snapshot:     0 -> schedules 1 again!\n  };\n  // Fix: pass a function. React feeds it the LATEST value:\n  //   setN(c => c + 1); setN(c => c + 1);  // 0 -> 1 -> 2\n  return <button onClick={bump2}>n: {n}</button>;\n}' },
			'<ul>' +
			'<li><code>setN(value)</code> — fine when the next state does not ' +
			'depend on the previous one.</li>' +
			'<li><code>setN(prev =&gt; next)</code> — the <em>updater form</em>; ' +
			'always correct when the next state is computed from the old, and ' +
			'the habit to default to in handlers.</li>' +
			'<li>The initial value argument only matters once; on every later ' +
			'render React returns the current state and ignores it.</li>' +
			'</ul>' +
			'<h3>Your job</h3>' +
			'<p>The starter counter stores its count in a plain module-level ' +
			'<code>let</code> and mutates it in the click handler. Run it, then ' +
			'click it in the live preview: the console (in the preview) proves ' +
			'the variable moves, but the label never does — no setter, no ' +
			're-render. Replace it with <code>React.useState(5)</code> so the ' +
			'button starts at <code>count: 5</code>, and increment with the ' +
			'updater form <code>setCount(c =&gt; c + 1)</code>. Keep the ' +
			'<code>console.log(&#39;render with &#39; + count)</code> line — in ' +
			'the preview it fires once per click, making each re-render ' +
			'visible.</p>' +
			'<div class="tip">The outline below the editor will always say ' +
			'<code>"count: 5"</code> no matter how much you click — it is the ' +
			'first frame, rendered before any event can fire. If you want proof ' +
			'the setter works, the live preview is the place to look.</div>',
		],

		task: 'Replace the mutated `let` with React.useState(5) and increment via the updater form.',

		starter: [
			'// A counter with no useState: the handler mutates a plain variable.',
			'// Click it in the live preview — the variable moves (watch the',
			'// preview console), but React never re-runs App, so the label',
			'// is stuck at the frame it was first rendered with.',
			'let count = 0;',
			'',
			'function App() {',
			'  console.log(\'render with \' + count); // fires once per RENDER, not per click',
			'  return (',
			'    <button onClick={() => { count = count + 1; console.log(\'count is now \' + count); }}>',
			'      count: {count}',
			'    </button>',
			'  );',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('button\n  "count: 5"') &&
				flat.includes('render with 5') &&
				!flat.includes('render with 0') &&
				!flat.includes('warn:');
		},

		solution: [
			'function App() {',
			'  // One state cell: count is THIS render\'s snapshot (a const!),',
			'  // setCount schedules a re-render with the next value. 5 is only',
			'  // read on the very first render.',
			'  const [count, setCount] = React.useState(5);',
			'',
			'  // One log per render: the worker/outline run logs it exactly once',
			'  // (the initial frame); the live preview logs it again per click.',
			'  console.log(\'render with \' + count);',
			'',
			'  return (',
			'    // Updater form: compute from the value React hands you, not from',
			'    // the render\'s snapshot — immune to the stale double-increment bug.',
			'    <button onClick={() => setCount(c => c + 1)}>',
			'      count: {count}',
			'    </button>',
			'  );',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<p><code>React.useState(5)</code> returns a pair: the current value ' +
			'and a setter. The array destructuring <code>const [count, ' +
			'setCount]</code> names both. On the first render <code>count</code> ' +
			'is <code>5</code>; the outline pins that frame — ' +
			'<code>button</code> / <code>"count: 5"</code> — and the single ' +
			'<code>render with 5</code> console line proves App ran exactly ' +
			'once.</p>',
			'<p>The click handler calls <code>setCount(c =&gt; c + 1)</code>. ' +
			'The updater form matters: <code>setCount(count + 1)</code> reads ' +
			'the snapshot the handler closed over, so two such calls in one ' +
			'handler both compute the same next value. The function form is fed ' +
			'the latest state by React, so it composes — every call advances ' +
			'from wherever the previous one landed.</p>',
			'<p>Why the starter failed: assigning to a <code>let</code> changes ' +
			'memory nobody is watching. React re-renders when a setter runs, ' +
			'not when data changes — state that should reach the screen must ' +
			'live in a hook, so the change and the re-render are the same ' +
			'event.</p>',
		],
	});
})();
