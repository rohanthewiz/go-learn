/* usereducer — a reducer is a pure (state, action) => state function, which
 * makes it testable OUTSIDE React entirely. The lesson exploits that: a
 * module-scope script replays [add, toggle, remove] through the reducer with
 * .reduce-style stepping and logs a JSON snapshot after each step, while App
 * renders the INITIAL state via React.useReducer. The starter reducer mutates
 * state and has no 'remove' case (switch falls through to undefined) — it
 * still RUNS, but the log ends in 'remove -> undefined' and the mutation
 * pollutes `initial`, so the "initial" render shows toggled/added wreckage.
 * The solution is an immutable switch with default: return state. Check pins
 * the three exact JSON transition lines plus the clean two-item initial
 * outline directly abutting the console marker.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'usereducer',
		title: 'useReducer',
		nav: 'useReducer',
		category: 'Hooks in Depth',

		prose: [
			'<h2>useReducer: state transitions as a pure function</h2>' +
			'<p>When one interaction updates three <code>useState</code> pairs, ' +
			'or the next state depends on the previous one in nontrivial ways, ' +
			'sprawling setters stop scaling. <code>useReducer</code> centralizes ' +
			'every transition in a single <strong>reducer</strong> — a pure ' +
			'function <code>(state, action) =&gt; newState</code>. Components ' +
			'stop mutating state and instead <em>describe events</em> with ' +
			'action objects (<code>{ type: &#39;add&#39;, text: &#39;ship&#39; }</code>); ' +
			'the reducer is the one place that decides what each event means.</p>',
			{ lang: 'js', code: 'const [state, dispatch] = React.useReducer(reducer, initial);\n// in an event handler — describe WHAT happened, not how to update:\ndispatch({ type: \'toggle\', id: 3 });' },
			'<p><em>Pure</em> is a contract with two clauses, and React relies ' +
			'on both. <strong>Never mutate</strong>: return a new object built ' +
			'with spreads / <code>map</code> / <code>filter</code>, because ' +
			'React detects change by reference (<code>===</code>) — mutate and ' +
			'return the same object, and React may skip the re-render entirely, ' +
			'while every other holder of that reference sees your edits. ' +
			'<strong>Always return a state</strong>: a <code>switch</code> with ' +
			'no <code>default</code> silently returns <code>undefined</code> ' +
			'for unknown actions, and your next state is now ' +
			'<code>undefined</code>. The professional default clause is ' +
			'<code>return state</code> — unknown action, unchanged state.</p>' +
			'<p>The payoff of purity: a reducer is just a function, so you can ' +
			'test it with <em>no React at all</em>. Replaying a scripted list ' +
			'of actions is a fold over time:</p>',
			{ lang: 'js', code: '// Yesterday\'s bug report, replayed in one line — no component,\n// no DOM, no mocking. This is why reducers are the most testable\n// state pattern React has.\nconst final = actions.reduce(reducer, initial);' },
			'<h3>Your job</h3>' +
			'<p>This lesson runs exactly that test: module-scope code replays ' +
			'<code>add → toggle → remove</code> through your reducer and logs a ' +
			'JSON snapshot after each step, while <code>App</code> renders the ' +
			'<em>initial</em> state through <code>React.useReducer</code>. The ' +
			'starter breaks both clauses: it mutates <code>state.todos</code> ' +
			'in place (watch the &quot;initial&quot; render — it shows a toggled ' +
			'item and a third todo that were never supposed to exist yet) and ' +
			'has no <code>remove</code> case, so the last snapshot is ' +
			'<code>remove -&gt; undefined</code>. Rewrite the reducer as an ' +
			'immutable <code>switch</code> — spread for <code>add</code>, ' +
			'<code>map</code> for <code>toggle</code>, <code>filter</code> for ' +
			'<code>remove</code>, <code>default: return state</code>.</p>' +
			'<div class="tip">Read the console section as a state-machine ' +
			'trace: three actions in, three valid states out. If any snapshot ' +
			'is <code>undefined</code>, a case fell through; if the initial ' +
			'render looks like the final snapshot, something mutated.</div>',
		],

		task: 'Make the reducer pure: immutable add/toggle/remove cases, default returns state — three clean JSON snapshots, untouched initial render.',

		starter: [
			'const initial = {',
			'	todos: [',
			'		{ id: 1, text: \'write reducer\', done: false },',
			'		{ id: 2, text: \'stay pure\', done: false },',
			'	],',
			'	nextId: 3,',
			'};',
			'',
			'// BROKEN twice over: every case MUTATES the incoming state (push,',
			'// property write), and there is no \'remove\' case and no default —',
			'// unknown actions return undefined. Watch the log AND the render.',
			'function reducer(state, action) {',
			'	switch (action.type) {',
			'		case \'add\':',
			'			state.todos.push({ id: state.nextId, text: action.text, done: false });',
			'			state.nextId = state.nextId + 1;',
			'			return state;',
			'		case \'toggle\':',
			'			const hit = state.todos.find(t => t.id === action.id);',
			'			hit.done = !hit.done;',
			'			return state;',
			'	}',
			'}',
			'',
			'// Pure functions are testable without React: replay a scripted',
			'// day of actions and snapshot the state after each transition.',
			'const script = [',
			'	{ type: \'add\', text: \'ship\' },',
			'	{ type: \'toggle\', id: 1 },',
			'	{ type: \'remove\', id: 2 },',
			'];',
			'let state = initial;',
			'for (const action of script) {',
			'	state = reducer(state, action);',
			'	console.log(action.type + \' -> \' + JSON.stringify(state && state.todos));',
			'}',
			'',
			'function App() {',
			'	// Renders the INITIAL state… unless the replay above mutated it.',
			'	const [state, dispatch] = React.useReducer(reducer, initial);',
			'	return (',
			'		<ul>',
			'			{state.todos.map(t => (',
			'				<li key={t.id} className={t.done ? \'done\' : \'todo\'}',
			'					onClick={() => dispatch({ type: \'toggle\', id: t.id })}>',
			'					{t.text}',
			'				</li>',
			'			))}',
			'		</ul>',
			'	);',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.includes('add -> [{"id":1,"text":"write reducer","done":false},{"id":2,"text":"stay pure","done":false},{"id":3,"text":"ship","done":false}]') &&
				flat.includes('toggle -> [{"id":1,"text":"write reducer","done":true},{"id":2,"text":"stay pure","done":false},{"id":3,"text":"ship","done":false}]') &&
				flat.includes('remove -> [{"id":1,"text":"write reducer","done":true},{"id":3,"text":"ship","done":false}]') &&
				stdout.includes('ul\n  li class="todo"\n    "write reducer"\n  li class="todo"\n    "stay pure"\n-- console --');
		},

		solution: [
			'const initial = {',
			'	todos: [',
			'		{ id: 1, text: \'write reducer\', done: false },',
			'		{ id: 2, text: \'stay pure\', done: false },',
			'	],',
			'	nextId: 3,',
			'};',
			'',
			'// Pure: every case builds a NEW state (spread / map / filter) and',
			'// the default returns the state unchanged for unknown actions.',
			'// The incoming state is never touched — `initial` survives the',
			'// replay untouched, which is why the render below stays clean.',
			'function reducer(state, action) {',
			'	switch (action.type) {',
			'		case \'add\':',
			'			return {',
			'				...state,',
			'				todos: [...state.todos, { id: state.nextId, text: action.text, done: false }],',
			'				nextId: state.nextId + 1,',
			'			};',
			'		case \'toggle\':',
			'			return {',
			'				...state,',
			'				todos: state.todos.map(t => t.id === action.id ? { ...t, done: !t.done } : t),',
			'			};',
			'		case \'remove\':',
			'			return {',
			'				...state,',
			'				todos: state.todos.filter(t => t.id !== action.id),',
			'			};',
			'		default:',
			'			return state; // unknown action: unchanged state, never undefined',
			'	}',
			'}',
			'',
			'// The same replay now yields three valid snapshots — a reducer is',
			'// just a function, so testing it needs no component and no DOM.',
			'const script = [',
			'	{ type: \'add\', text: \'ship\' },',
			'	{ type: \'toggle\', id: 1 },',
			'	{ type: \'remove\', id: 2 },',
			'];',
			'let state = initial;',
			'for (const action of script) {',
			'	state = reducer(state, action);',
			'	console.log(action.type + \' -> \' + JSON.stringify(state && state.todos));',
			'}',
			'',
			'function App() {',
			'	// The graded outline shows the initial state (dispatch never runs',
			'	// in the static render); clicking items in the live preview',
			'	// dispatches toggle actions through the same reducer.',
			'	const [state, dispatch] = React.useReducer(reducer, initial);',
			'	return (',
			'		<ul>',
			'			{state.todos.map(t => (',
			'				<li key={t.id} className={t.done ? \'done\' : \'todo\'}',
			'					onClick={() => dispatch({ type: \'toggle\', id: t.id })}>',
			'					{t.text}',
			'				</li>',
			'			))}',
			'		</ul>',
			'	);',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Two bugs, two kinds of evidence</h3>' +
			'<p>The starter&#39;s trace ended in <code>remove -&gt; undefined</code> ' +
			'— the missing case fell off the end of the <code>switch</code>, and ' +
			'JavaScript&#39;s answer to a function with no <code>return</code> is ' +
			'<code>undefined</code>. In a live app that poisons every subsequent ' +
			'dispatch: the next action receives <code>undefined</code> as its ' +
			'state and crashes on the first property access. The subtler bug was ' +
			'in the <em>outline</em>: <code>App</code> renders the initial state, ' +
			'yet the starter showed three todos with the first marked done. The ' +
			'mutating cases edited <code>initial</code> itself, so &quot;the ' +
			'initial state&quot; no longer existed — mutation destroys history, ' +
			'and reference-equality checks (<code>===</code>) can no longer even ' +
			'detect that anything changed.</p>',
			{ lang: 'js', code: '// The three immutable verbs, one per action type:\n[...state.todos, newTodo]                      // add: new array + one\nstate.todos.map(t => t.id === id ? {...t, done: !t.done} : t) // toggle\nstate.todos.filter(t => t.id !== id)           // remove' },
			'<h3>Why the ceremony pays</h3>' +
			'<p>Every transition now lives in one pure function: new features ' +
			'are new <code>case</code> labels, bug reports are replayable as ' +
			'action arrays (<code>actions.reduce(reducer, initial)</code>), and ' +
			'components shrink to <em>describing events</em>. When several ' +
			'<code>useState</code> calls always change together, that is the ' +
			'signal to fold them into one reducer. The next lesson&#39;s ' +
			'<code>useContext</code> pairs naturally with <code>dispatch</code> ' +
			'— pass it down once, and any descendant can report events without ' +
			'prop-drilling callbacks.</p>',
		],
	});
})();
