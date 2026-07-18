/* capstone-taskboard — everything at once, honestly (no context: three
 * levels of tree don't earn a provider). useReducer owns the task list
 * (add/toggle/remove, every branch a new array), useState owns a controlled
 * filter select, the visible list is DERIVED during render (no effect, no
 * mirror state), keys on the mapped rows, TaskItem receives callbacks, a
 * footer counts remaining. Module scope also scripts the reducer directly
 * (add → toggle → remove, JSON after each) proving transitions are pure
 * functions, testable without a renderer. Check pins the seeded ul (3 li,
 * one class-marked done), the controlled select (static markup expresses
 * value="all" as selected="" on the matching option — that's what the
 * outline can show, so that's what we pin), the footer count, the three
 * JSON transition lines, and warning absence (keys present).
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'capstone-taskboard',
		title: 'Capstone: Task Board',
		nav: 'Capstone',
		category: 'Patterns',

		prose: [
			'<h2>Capstone: a task board</h2>' +
			'<p>One component tree, every tool from the track, each doing the ' +
			'one job it is best at. The shape of the solution before you write ' +
			'it:</p>' +
			'<ul>' +
			'<li><strong>useReducer</strong> for the task list — three action ' +
			'types (<code>add</code>, <code>toggle</code>, <code>remove</code>), ' +
			'each returning a <em>new</em> array. Multi-action collection state ' +
			'is the reducer sweet spot: transitions live in one pure function ' +
			'instead of scattered setter calls.</li>' +
			'<li><strong>useState</strong> for the filter — one string, one ' +
			'setter, a <em>controlled</em> <code>&lt;select&gt;</code> ' +
			'(<code>value={filter}</code> + <code>onChange</code>).</li>' +
			'<li><strong>Derived data, not effect data</strong> — the visible ' +
			'list and the remaining count are computed <em>during render</em>. ' +
			'No <code>useEffect</code> copying tasks into a second state ' +
			'variable: that is the redundant-state bug from the useEffect ' +
			'lesson, and this board needs zero effects.</li>' +
			'<li><strong>Keys and callbacks down</strong> — the mapped rows get ' +
			'<code>key={task.id}</code>; <code>TaskItem</code> owns no state and ' +
			'reports clicks through <code>onToggle</code>/<code>onRemove</code> ' +
			'props, dispatching in the parent.</li>' +
			'</ul>',
			{ lang: 'js', code: '// A reducer is a pure function: (state, action) => next state.\n// That makes it testable with NO renderer — call it like any function:\nlet s = [];\ns = tasksReducer(s, { type: \'add\', id: 1, text: \'x\' });\ns = tasksReducer(s, { type: \'toggle\', id: 1 });\n// s is now [{ id: 1, text: \'x\', done: true }] — provable in the console.' },
			'<p>That snippet is part of the assignment: after defining the ' +
			'board, script the reducer at module scope — <code>add</code>, then ' +
			'<code>toggle</code>, then <code>remove</code> — logging ' +
			'<code>JSON.stringify</code> after each step. The three JSON lines ' +
			'in the console section are your proof that state transitions are ' +
			'plain data-in, data-out, before React ever renders them.</p>' +
			'<p>One honest omission: no <code>useContext</code>. The tree is ' +
			'three levels deep and passes two props — threading them explicitly ' +
			'is <em>clearer</em> than a provider. Context earns its place when ' +
			'many distant components need the same value; reaching for it by ' +
			'reflex is how apps end up with everything-global state.</p>' +
			'<p>Elsewhere in go-learn, the <em>TypeScript + Go Web</em> track ' +
			'renders this same board server-side in Go with ' +
			'<code>github.com/rohanthewiz/element</code>: a ' +
			'<code>TaskItem</code> struct satisfying the ' +
			'<code>Component</code> interface (<code>Render(b *Builder)</code>) ' +
			'and <code>b.Ul().R(element.ForEach(tasks, …))</code> for the list — ' +
			'the same component-per-row decomposition, as Go method calls ' +
			'emitting the markup directly.</p>' +
			'<h3>Your job</h3>' +
			'<p>Build the board over the seed data (three tasks, the first ' +
			'already done; keep ids, texts, and done flags exactly as given). ' +
			'Rows render as <code>li</code> with class <code>task</code>, plus ' +
			'<code>done</code> when completed; the select offers All / Active / ' +
			'Done (values <code>all</code>/<code>active</code>/' +
			'<code>done</code>, starting on <code>all</code>); the footer reads ' +
			'like <code>2 of 3 remaining</code>. Then the scripted reducer run: ' +
			'add <code>{ id: 9, text: \'demo task\' }</code>, toggle it, remove ' +
			'it, logging JSON after each.</p>' +
			'<div class="tip">The outline is the initial frame: all three tasks ' +
			'visible, filter at <code>all</code> (static markup shows a ' +
			'controlled select&#39;s value as <code>selected=""</code> on the ' +
			'matching option). Everything interactive — filtering, toggling, ' +
			'removing — works in the live preview, and the footer recounts ' +
			'because it is derived, not stored.</div>',
		],

		task: 'Build the board: tasksReducer + useReducer, controlled filter select, derived visible list with keys, footer count, and a scripted add→toggle→remove reducer run logging JSON.',

		starter: [
			'// TODO roadmap — build the board in this order:',
			'//  1. tasksReducer(state, action): \'add\' appends {id, text, done:false};',
			'//     \'toggle\' flips done immutably (map + spread); \'remove\' filters.',
			'//  2. App: const [tasks, dispatch] = React.useReducer(tasksReducer, seed)',
			'//  3. const [filter, setFilter] = React.useState(\'all\') driving a',
			'//     controlled <select> — options All/Active/Done (all/active/done).',
			'//  4. DERIVE the visible rows from tasks + filter during render.',
			'//     No useEffect anywhere on this board.',
			'//  5. visible.map(...) -> <TaskItem key={t.id} task={t} onToggle onRemove />',
			'//     TaskItem: <li class="task"/"task done">, text, a remove button.',
			'//  6. <footer>: "2 of 3 remaining" (active count of total).',
			'//  7. Module scope: script the reducer add(id:9,\'demo task\') -> toggle',
			'//     -> remove, console.log(JSON.stringify(state)) after each.',
			'const seed = [',
			'\t{ id: 1, text: \'Write the reducer\', done: true },',
			'\t{ id: 2, text: \'Wire the filter\', done: false },',
			'\t{ id: 3, text: \'Render with keys\', done: false },',
			'];',
			'',
			'function App() {',
			'\t// Static skeleton — no state, no reducer, nothing derived yet.',
			'\treturn (',
			'\t\t<main>',
			'\t\t\t<ul>',
			'\t\t\t\t<li>Write the reducer</li>',
			'\t\t\t\t<li>Wire the filter</li>',
			'\t\t\t\t<li>Render with keys</li>',
			'\t\t\t</ul>',
			'\t\t</main>',
			'\t);',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// Controlled select at 'all' (static markup: selected on the
			// matching option); 3 seeded li's, exactly one marked done; the
			// derived footer count; the three pure-transition JSON lines; and
			// no warnings — which is how "keys present" is graded.
			return stdout.includes('  select\n    option value="all" selected=""\n      "All"') &&
				stdout.includes('  ul\n    li class="task done"\n') &&
				(stdout.split('li class="task"\n').length - 1) === 2 &&
				stdout.includes('  footer\n    "2 of 3 remaining"') &&
				flat.includes('[{"id":9,"text":"demo task","done":false}]') &&
				flat.includes('[{"id":9,"text":"demo task","done":true}]') &&
				/\n\[\]\s*$/.test(stdout) &&
				!flat.includes('warn:');
		},

		solution: [
			'// Pure transitions: every branch returns a NEW array; no push, no',
			'// mutation. (state, action) => state — testable without React.',
			'function tasksReducer(state, action) {',
			'\tswitch (action.type) {',
			'\t\tcase \'add\':',
			'\t\t\treturn [...state, { id: action.id, text: action.text, done: false }];',
			'\t\tcase \'toggle\':',
			'\t\t\treturn state.map(t => (t.id === action.id ? { ...t, done: !t.done } : t));',
			'\t\tcase \'remove\':',
			'\t\t\treturn state.filter(t => t.id !== action.id);',
			'\t\tdefault:',
			'\t\t\treturn state;',
			'\t}',
			'}',
			'',
			'const seed = [',
			'\t{ id: 1, text: \'Write the reducer\', done: true },',
			'\t{ id: 2, text: \'Wire the filter\', done: false },',
			'\t{ id: 3, text: \'Render with keys\', done: false },',
			'];',
			'',
			'// Stateless child: data + callbacks in, clicks reported up.',
			'function TaskItem({ task, onToggle, onRemove }) {',
			'\treturn (',
			'\t\t<li className={task.done ? \'task done\' : \'task\'}>',
			'\t\t\t<span onClick={() => onToggle(task.id)}>{task.text}</span>',
			'\t\t\t<button onClick={() => onRemove(task.id)}>remove</button>',
			'\t\t</li>',
			'\t);',
			'}',
			'',
			'function App() {',
			'\tconst [tasks, dispatch] = React.useReducer(tasksReducer, seed);',
			'\tconst [filter, setFilter] = React.useState(\'all\');',
			'',
			'\t// DERIVED during render — recomputed from source state each',
			'\t// frame. No effect, no mirrored copy that could drift.',
			'\tconst visible = tasks.filter(t =>',
			'\t\tfilter === \'all\' ? true : filter === \'done\' ? t.done : !t.done);',
			'\tconst remaining = tasks.filter(t => !t.done).length;',
			'',
			'\treturn (',
			'\t\t<main>',
			'\t\t\t<select value={filter} onChange={e => setFilter(e.target.value)}>',
			'\t\t\t\t<option value="all">All</option>',
			'\t\t\t\t<option value="active">Active</option>',
			'\t\t\t\t<option value="done">Done</option>',
			'\t\t\t</select>',
			'\t\t\t<ul>',
			'\t\t\t\t{visible.map(t => (',
			'\t\t\t\t\t<TaskItem',
			'\t\t\t\t\t\tkey={t.id}',
			'\t\t\t\t\t\ttask={t}',
			'\t\t\t\t\t\tonToggle={id => dispatch({ type: \'toggle\', id: id })}',
			'\t\t\t\t\t\tonRemove={id => dispatch({ type: \'remove\', id: id })}',
			'\t\t\t\t\t/>',
			'\t\t\t\t))}',
			'\t\t\t</ul>',
			'\t\t\t<footer>{remaining} of {tasks.length} remaining</footer>',
			'\t\t</main>',
			'\t);',
			'}',
			'',
			'// The reducer, proven pure with no renderer in sight: three',
			'// transitions, JSON after each. Same function React drives above.',
			'let demo = [];',
			'demo = tasksReducer(demo, { type: \'add\', id: 9, text: \'demo task\' });',
			'console.log(JSON.stringify(demo));',
			'demo = tasksReducer(demo, { type: \'toggle\', id: 9 });',
			'console.log(JSON.stringify(demo));',
			'demo = tasksReducer(demo, { type: \'remove\', id: 9 });',
			'console.log(JSON.stringify(demo));',
			'',
		].join('\n'),

		explanation: [
			'<p><strong>State layout.</strong> Two hooks, two concerns: the ' +
			'reducer owns the collection (because its transitions are a family ' +
			'of related operations that belong in one place), plain ' +
			'<code>useState</code> owns the filter (one independent string — a ' +
			'reducer would be ceremony). Everything else on screen — ' +
			'<code>visible</code>, <code>remaining</code> — is derived during ' +
			'render, so it can never disagree with the source data and needs no ' +
			'hook at all.</p>',
			'<p><strong>The initial frame.</strong> The outline shows the seed: ' +
			'three <code>li</code> rows under the <code>ul</code>, the first ' +
			'carrying <code>class="task done"</code>, the select&#39;s ' +
			'<code>all</code> option marked <code>selected=""</code> (static ' +
			'markup&#39;s spelling of a controlled <code>value="all"</code>), ' +
			'and the footer&#39;s derived <code>2 of 3 remaining</code>. In the ' +
			'live preview the same compilation runs with real state: switch the ' +
			'filter to Done and one row remains, toggle a checkbox-less row by ' +
			'clicking its text, remove one and the footer recounts — all ' +
			'without a single effect.</p>',
			'<p><strong>The console lines.</strong> ' +
			'<code>[{"id":9,…,"done":false}]</code> → <code>done:true</code> → ' +
			'<code>[]</code>: the same <code>tasksReducer</code> React calls on ' +
			'dispatch, driven by hand at module scope. Pure functions make the ' +
			'interesting part of the app — what changes when — testable as ' +
			'plain data, which is the reducer pattern&#39;s real payoff.</p>',
			'<p><strong>Keys.</strong> <code>key={t.id}</code> on the mapped ' +
			'<code>TaskItem</code> is graded by silence: remove it and the ' +
			'console section grows a <code>warn:</code> line, and the check ' +
			'fails. Identity from data, never from array index — removal ' +
			're-indexes everything after the removed row.</p>',
		],
	});
})();
