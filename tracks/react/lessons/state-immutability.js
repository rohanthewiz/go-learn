/* state-immutability — never mutate state in place; React compares by
 * reference, so a pushed-into array or assigned-onto object looks unchanged
 * and the update is skipped. Grading trick: the update logic lives in PURE
 * top-level functions (addTag, toggleDone) exercised at module scope with
 * before/after JSON.stringify logs — the "before" lines are the pin, because
 * only a non-mutating implementation leaves the originals untouched. The
 * starter's functions mutate (push / direct field assignment), so its
 * "before" logs show the corruption; the solution spreads, and App renders
 * the still-pristine original list.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'state-immutability',
		title: 'Immutable Updates',
		nav: 'Immutability',
		category: 'State & Events',

		prose: [
			'<h2>Immutable updates</h2>' +
			'<p>React decides whether anything changed with a reference ' +
			'comparison: <code>oldState === newState</code>. Push onto an array ' +
			'or assign onto an object and you have changed the <em>contents</em> ' +
			'but not the <em>reference</em> — <code>setTags(tags)</code> after a ' +
			'<code>tags.push(t)</code> hands React the same array it already ' +
			'has, and it bails out: no re-render, or a re-render that later ' +
			'reads corrupted history. Worse, you have edited the previous ' +
			'render&#39;s snapshot behind its back. The rule is absolute: ' +
			'<strong>treat state as read-only; every update builds a new ' +
			'value</strong>.</p>' +
			'<p>The spread operator makes new-value construction cheap. The ' +
			'three array moves and the object move cover almost everything:</p>',
			{ lang: 'js', code: '// add    — new array, old elements copied, one appended\nsetTags([...tags, \'hooks\']);\n\n// remove — filter already returns a new array\nsetTags(tags.filter(t => t !== \'draft\'));\n\n// update — map returns a new array; REBUILD the matching row with\n// object spread, pass the rest through untouched\nsetTodos(todos.map(td => td.id === id ? { ...td, done: !td.done } : td));\n\n// object field — copy, then override\nsetUser({ ...user, name: \'gopher\' });' },
			'<p>Never these: <code>tags.push(t)</code>, <code>tags[0] = t</code>, ' +
			'<code>tags.sort()</code> (sorts in place!), <code>todo.done = ' +
			'true</code>, <code>Object.assign(user, patch)</code>. Each mutates ' +
			'the value React is holding. Note the asymmetry in the ' +
			'<code>map</code> pattern: only the row being changed is rebuilt; ' +
			'untouched rows keep their old references, which is what lets React ' +
			'(and later, <code>React.memo</code>) skip re-rendering them.</p>' +
			'<p>The discipline is easiest to test when updates are <em>pure ' +
			'functions</em>: take the old value, return the new one, touch ' +
			'nothing. A pure updater is provable in isolation — log the input ' +
			'before and after the call; if the &quot;before&quot; changed, the ' +
			'function mutated. That is exactly how this lesson grades you.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter defines <code>addTag(tags, t)</code> and ' +
			'<code>toggleDone(todos, id)</code> — both cheat. ' +
			'<code>addTag</code> pushes onto its argument; ' +
			'<code>toggleDone</code> flips the field in place. Run it and read ' +
			'the console: the <code>tags before:</code> line already contains ' +
			'<code>&quot;hooks&quot;</code> and the <code>todos before:</code> ' +
			'line already shows <code>done: true</code> — the &quot;before&quot; ' +
			'data was vandalized by the call. Rewrite both as pure spread-based ' +
			'updaters so the before-logs show the originals untouched and the ' +
			'after-logs show the new values. Leave the logging and ' +
			'<code>App</code> as they are.</p>' +
			'<div class="tip">The rendered list is the original ' +
			'<code>tags</code> array. With mutating updaters it shows three ' +
			'items; fixed, it shows the two it was born with — the outline is ' +
			'a mutation detector.</div>',
		],

		task: 'Make addTag and toggleDone pure: return NEW arrays/objects via spread; the before-logs must show the originals unchanged.',

		starter: [
			'// Two "updaters" that cheat: they hand back a value, but they built',
			'// it by vandalizing their input. Watch the before-logs.',
			'function addTag(tags, t) {',
			'  tags.push(t);   // mutates the caller\'s array in place!',
			'  return tags;    // ...and returns the SAME reference',
			'}',
			'',
			'function toggleDone(todos, id) {',
			'  for (const todo of todos) {',
			'    if (todo.id === id) todo.done = !todo.done; // edits the row in place',
			'  }',
			'  return todos;',
			'}',
			'',
			'// Prove (or disprove) purity: snapshot the inputs before and after.',
			'const tags = [\'react\', \'state\'];',
			'const withHooks = addTag(tags, \'hooks\');',
			'console.log(\'tags before: \' + JSON.stringify(tags));',
			'console.log(\'tags after: \' + JSON.stringify(withHooks));',
			'',
			'const todos = [{ id: 1, text: \'learn spread\', done: false }];',
			'const toggled = toggleDone(todos, 1);',
			'console.log(\'todos before: \' + JSON.stringify(todos));',
			'console.log(\'todos after: \' + JSON.stringify(toggled));',
			'',
			'// Renders the ORIGINAL tags array — three items means it was mutated.',
			'function App() {',
			'  return (',
			'    <ul className="tags">',
			'      {tags.map(t => <li key={t}>{t}</li>)}',
			'    </ul>',
			'  );',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.includes('tags before: ["react","state"]') &&
				flat.includes('tags after: ["react","state","hooks"]') &&
				flat.includes('todos before: [{"id":1,"text":"learn spread","done":false}]') &&
				flat.includes('todos after: [{"id":1,"text":"learn spread","done":true}]') &&
				stdout.includes('ul class="tags"\n  li\n    "react"\n  li\n    "state"') &&
				!flat.includes('warn:');
		},

		solution: [
			'// Pure updaters: read the old value, RETURN a new one, touch nothing.',
			'function addTag(tags, t) {',
			'  // New array literal: spread copies the elements, then append.',
			'  // The input array never hears about it.',
			'  return [...tags, t];',
			'}',
			'',
			'function toggleDone(todos, id) {',
			'  // map returns a new array. Only the matching row is REBUILT',
			'  // (object spread + field override); the rest pass through by',
			'  // reference — cheap, and lets React skip unchanged rows later.',
			'  return todos.map(todo =>',
			'    todo.id === id ? { ...todo, done: !todo.done } : todo',
			'  );',
			'}',
			'',
			'// Same probes: now the before-logs show the inputs untouched.',
			'const tags = [\'react\', \'state\'];',
			'const withHooks = addTag(tags, \'hooks\');',
			'console.log(\'tags before: \' + JSON.stringify(tags));',
			'console.log(\'tags after: \' + JSON.stringify(withHooks));',
			'',
			'const todos = [{ id: 1, text: \'learn spread\', done: false }];',
			'const toggled = toggleDone(todos, 1);',
			'console.log(\'todos before: \' + JSON.stringify(todos));',
			'console.log(\'todos after: \' + JSON.stringify(toggled));',
			'',
			'// Renders the original tags — still exactly two items.',
			'function App() {',
			'  return (',
			'    <ul className="tags">',
			'      {tags.map(t => <li key={t}>{t}</li>)}',
			'    </ul>',
			'  );',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<p><code>addTag</code> became a one-liner: <code>[...tags, t]</code> ' +
			'allocates a fresh array, copies the old elements into it, and ' +
			'appends. The caller&#39;s array is never touched — the ' +
			'<code>tags before:</code> log still reads ' +
			'<code>["react","state"]</code> while <code>tags after:</code> shows ' +
			'the three-element result under a brand-new reference React would ' +
			'recognize as changed.</p>',
			'<p><code>toggleDone</code> uses the map-and-rebuild pattern: ' +
			'<code>todos.map(...)</code> yields a new outer array, and the row ' +
			'whose <code>id</code> matches is reconstructed with ' +
			'<code>{ ...todo, done: !todo.done }</code> — copy the fields, ' +
			'override one. Rows that do not match are returned as-is: same ' +
			'reference, deliberately, so downstream reference checks can prove ' +
			'they are unchanged.</p>',
			'<p>The rendered <code>ul</code> is the courtroom exhibit: it maps ' +
			'over the <em>original</em> <code>tags</code>, so two ' +
			'<code>li</code> rows mean the original survived the updates. In a ' +
			'real component these pure functions slot straight into setters — ' +
			'<code>setTags(prev =&gt; addTag(prev, t))</code> — combining last ' +
			'lesson&#39;s updater form with this lesson&#39;s immutability.</p>',
		],
	});
})();
