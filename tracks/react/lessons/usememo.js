/* usememo — memoization is referential identity + skipped recompute, not magic
 * speed. useMemo DOES run during render, so this lesson grades it directly: an
 * expensive-looking computeStats(list) logs 'computing stats…' every time it is
 * invoked. The starter calls it unconditionally in TWO places (two log lines in
 * the console section — the double compute is visible); the solution wraps it
 * in React.useMemo(() => computeStats(list), [list]) and reuses the one result
 * everywhere (exactly one log line). Check pins the stats text in the outline
 * and exactly-once semantics via stdout.split('computing stats').length === 2.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'usememo',
		title: 'useMemo & useCallback',
		nav: 'useMemo',
		category: 'Hooks in Depth',

		prose: [
			'<h2>useMemo: cache a computation across renders</h2>' +
			'<p>Unlike <code>useEffect</code>, <code>useMemo</code> runs ' +
			'<em>during</em> render — it is part of computing the frame, not a ' +
			'follow-up to it. <code>useMemo(fn, deps)</code> calls ' +
			'<code>fn</code> on the first render, remembers the result, and on ' +
			'later renders returns the <strong>same value</strong> without ' +
			'calling <code>fn</code> again — until something in ' +
			'<code>deps</code> changes. Two things follow, and the second is the ' +
			'one people miss:</p>' +
			'<ul>' +
			'<li><strong>Skipped recompute</strong> — the obvious win, and only ' +
			'worth having when <code>fn</code> is genuinely expensive.</li>' +
			'<li><strong>Referential identity</strong> — the returned object is ' +
			'the <em>same reference</em> across renders, which is what ' +
			'<code>React.memo</code> children and other hooks&#39; ' +
			'<code>deps</code> arrays compare with <code>===</code>. This is the ' +
			'reason to memoize far more often than raw speed.</li>' +
			'</ul>' +
			'<p>It is <em>not</em> magic speed. The cache itself costs memory ' +
			'and a deps comparison per render; wrapping every expression in ' +
			'<code>useMemo</code> makes code slower and harder to read. And the ' +
			'deps array must be <strong>honest</strong>: list everything the ' +
			'callback reads. Lie by omission and you serve stale results; React ' +
			'trusts your deps completely.</p>',
			{ lang: 'js', code: 'const visible = React.useMemo(\n  () => rows.filter(r => r.status === filter), // reads rows AND filter…\n  [rows, filter]                               // …so both are deps. Honesty.\n);' },
			'<p><code>useCallback</code> is the same hook wearing a jacket: ' +
			'<code>useCallback(fn, deps)</code> is exactly ' +
			'<code>useMemo(() =&gt; fn, deps)</code> — it memoizes the ' +
			'<em>function itself</em> rather than its result, so a child that ' +
			'receives it as a prop sees the same reference and can skip ' +
			're-rendering. One mental model, two spellings.</p>',
			{ lang: 'js', code: 'const onSave = React.useCallback(() => save(draft), [draft]);\n// identical to:\nconst onSave = React.useMemo(() => (() => save(draft)), [draft]);' },
			'<h3>Your job</h3>' +
			'<p>The starter computes stats over the readings <em>twice</em> per ' +
			'render — once for the summary line, once more just to pull ' +
			'<code>max</code> for the badge. <code>computeStats</code> logs ' +
			'<code>computing stats…</code> on every invocation, so the console ' +
			'section shows the double compute in plain text: two identical ' +
			'lines. Wrap the call in ' +
			'<code>React.useMemo(() =&gt; computeStats(readings), [readings])</code> ' +
			'and reuse that one result for both the summary and the badge. ' +
			'Solved output computes exactly once — one log line.</p>' +
			'<div class="tip">Profile before you memoize: a ' +
			'<code>console.log</code> inside the &quot;expensive&quot; function ' +
			'is the cheapest profiler there is. If you never see the line ' +
			'repeat, <code>useMemo</code> is buying you nothing but a deps ' +
			'array to maintain.</div>',
		],

		task: 'Compute stats exactly once per render: React.useMemo(() => computeStats(readings), [readings]), reuse the result everywhere.',

		starter: [
			'// Expensive-looking work. The log line is the profiler: every',
			'// invocation prints once, so the console section counts our calls.',
			'function computeStats(list) {',
			'	console.log(\'computing stats…\');',
			'	const sum = list.reduce((a, b) => a + b, 0);',
			'	return { sum: sum, avg: sum / list.length, max: Math.max(...list) };',
			'}',
			'',
			'function App() {',
			'	const [readings] = React.useState([12, 7, 22, 15, 9]);',
			'',
			'	// Call #1: the summary. Call #2: recomputes EVERYTHING just to',
			'	// read .max for the badge. Two log lines per render — and in a',
			'	// real app, twice the work on every keystroke that re-renders.',
			'	const stats = computeStats(readings);',
			'	const peak = computeStats(readings).max;',
			'',
			'	return (',
			'		<div>',
			'			<p>sum {stats.sum} · avg {stats.avg} · max {stats.max}</p>',
			'			<span className="badge">peak {peak}</span>',
			'		</div>',
			'	);',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.includes('"sum 65 · avg 13 · max 22"') &&
				flat.includes('"peak 22"') &&
				stdout.split('computing stats').length === 2;
		},

		solution: [
			'// Unchanged — the function stays honest and pure; caching is the',
			'// CALLER\'s decision, made with useMemo at the call site.',
			'function computeStats(list) {',
			'	console.log(\'computing stats…\');',
			'	const sum = list.reduce((a, b) => a + b, 0);',
			'	return { sum: sum, avg: sum / list.length, max: Math.max(...list) };',
			'}',
			'',
			'function App() {',
			'	const [readings] = React.useState([12, 7, 22, 15, 9]);',
			'',
			'	// One compute per readings-value: useMemo runs the callback during',
			'	// this render, caches the object, and hands the SAME reference',
			'	// back on re-renders until readings changes. Deps are honest:',
			'	// the callback reads readings, so readings is listed.',
			'	const stats = React.useMemo(() => computeStats(readings), [readings]);',
			'',
			'	// The badge reuses the memoized result — no second call anywhere.',
			'	return (',
			'		<div>',
			'			<p>sum {stats.sum} · avg {stats.avg} · max {stats.max}</p>',
			'			<span className="badge">peak {stats.max}</span>',
			'		</div>',
			'	);',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Count the log lines</h3>' +
			'<p>The starter&#39;s console section had <code>computing stats…</code> ' +
			'twice — once for <code>stats</code>, once for the badge&#39;s ' +
			'throwaway recompute. The solution has it exactly once: ' +
			'<code>useMemo</code> ran the callback during this render, and the ' +
			'badge reads <code>stats.max</code> off the cached object instead of ' +
			'paying for a fresh one. The rendered outline is byte-identical in ' +
			'both versions — memoization changes <em>how</em> a frame is ' +
			'computed, never <em>what</em> it shows. That invariant is the ' +
			'safety property: if adding <code>useMemo</code> changes your ' +
			'output, your deps array is lying.</p>',
			{ lang: 'js', code: '// The identity payoff: because `stats` is the same reference\n// across renders, it is safe in another hook\'s deps — this effect\n// fires when the DATA changes, not on every render.\nReact.useEffect(() => { report(stats); }, [stats]);' },
			'<h3>When to reach for it</h3>' +
			'<p>Memoize when the work is provably repeated (your profiler — or a ' +
			'log line — says so), or when a child / another hook needs a stable ' +
			'reference. Otherwise skip it: the deps comparison is not free, and ' +
			'every deps array is a small maintenance contract. ' +
			'<code>useCallback</code> follows the same rule for functions you ' +
			'pass down as props.</p>',
		],
	});
})();
