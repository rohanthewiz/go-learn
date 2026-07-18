/* forms-controlled — value + onChange makes an input controlled: state is
 * the single source of truth and the DOM merely displays it. The outline is
 * the perfect x-ray here: it shows value="…" frozen at the INITIAL state
 * (handlers never fire in the grading render), so a controlled input's
 * starting state is literally visible as an attribute. Starter is the
 * uncontrolled version (defaultValue / defaultChecked, no state); solution
 * is a small signup form — text input seeded 'gopher', checkbox seeded true,
 * onSubmit with preventDefault. Check pins form > input value="gopher",
 * the checked boolean attr (serialized checked=""), and the submit button.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'forms-controlled',
		title: 'Controlled Forms',
		nav: 'Forms',
		category: 'State & Events',

		prose: [
			'<h2>Controlled forms</h2>' +
			'<p>A raw <code>&lt;input&gt;</code> keeps its own text inside the ' +
			'DOM — a second copy of truth your component cannot see. React&#39;s ' +
			'answer is the <em>controlled</em> input: wire ' +
			'<code>value</code> to state and <code>onChange</code> to its ' +
			'setter, and the DOM stops owning anything. Every keystroke flows ' +
			'<em>up</em> into state, the new state flows <em>back down</em> as ' +
			'the displayed value, and your component knows the field&#39;s ' +
			'contents at all times — validation, disabling the submit button, ' +
			'clearing the form are all just state reads and writes:</p>',
			{ lang: 'js', code: 'const [email, setEmail] = React.useState(\'\');\n\n// value: state decides what is shown. onChange: keystrokes update state.\n// Set value WITHOUT onChange and the field is read-only (React warns).\n<input value={email} onChange={e => setEmail(e.target.value)} />\n\n// checkboxes control `checked`, and read e.target.checked (a boolean):\n<input type="checkbox" checked={agreed}\n       onChange={e => setAgreed(e.target.checked)} />\n\n// selects are controlled the same way — value on the select itself:\n<select value={plan} onChange={e => setPlan(e.target.value)}>...' },
			'<p>Submission is an event like any other: put ' +
			'<code>onSubmit</code> on the <code>&lt;form&gt;</code> (not ' +
			'<code>onClick</code> on the button — Enter in a text field submits ' +
			'too) and call <code>e.preventDefault()</code> first, or the ' +
			'browser performs its ancient default: serialize the form and ' +
			'reload the page, throwing your state away. After that, the ' +
			'submit handler needs no DOM spelunking — the data is already in ' +
			'state.</p>' +
			'<p>The outline pane makes &quot;state is the source of truth&quot; ' +
			'concrete: the grading render is the initial frame, so a controlled ' +
			'input shows up as <code>input value=&quot;gopher&quot;</code> — ' +
			'the initial state, frozen as an attribute. A controlled checkbox ' +
			'seeded <code>true</code> serializes the boolean attribute as ' +
			'<code>checked=&quot;&quot;</code>. Type in the live preview and ' +
			'the field updates (state round-trip working); the outline stays at ' +
			'frame one.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter is the uncontrolled version: ' +
			'<code>defaultValue</code> / <code>defaultChecked</code> seed the ' +
			'DOM once, then React looks away. Convert both fields to controlled: ' +
			'name state initialized to <code>&#39;gopher&#39;</code> driving ' +
			'<code>value</code> + <code>onChange</code>, subscribe state ' +
			'initialized to <code>true</code> driving <code>checked</code> + ' +
			'<code>onChange</code>, and an <code>onSubmit</code> on the form ' +
			'that calls <code>e.preventDefault()</code> and logs the state. ' +
			'Keep the submit button.</p>' +
			'<div class="tip">Controlled input with <code>value</code> but no ' +
			'<code>onChange</code>? React freezes the field and warns. ' +
			'Uncontrolled with a one-time seed? That is what ' +
			'<code>defaultValue</code> is for. The pair you never write is ' +
			'<code>defaultValue</code> <em>plus</em> state — pick one owner per ' +
			'field.</div>',
		],

		task: 'Convert both fields to controlled: name state \'gopher\' + value/onChange, checkbox state true + checked/onChange, onSubmit with preventDefault.',

		starter: [
			'// Uncontrolled: defaultValue/defaultChecked seed the DOM once, then',
			'// the DOM owns the data — App cannot read what the user typed',
			'// without reaching into the DOM. No state anywhere.',
			'function App() {',
			'  // TODO 1: name state initialized \'gopher\'; wire value + onChange.',
			'  // TODO 2: subscribe state initialized true; wire checked + onChange.',
			'  // TODO 3: onSubmit on the form: e.preventDefault(), then log the state.',
			'  return (',
			'    <form>',
			'      <label>',
			'        name:',
			'        <input defaultValue="anon" />',
			'      </label>',
			'      <label>',
			'        <input type="checkbox" defaultChecked={false} />',
			'        subscribe',
			'      </label>',
			'      <button type="submit">sign up</button>',
			'    </form>',
			'  );',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('form\n') &&
				stdout.includes('input value="gopher"') &&
				stdout.includes('input type="checkbox" checked') &&
				stdout.includes('button type="submit"\n    "sign up"') &&
				!flat.includes('warn:');
		},

		solution: [
			'function App() {',
			'  // One state cell per field: state is the single source of truth,',
			'  // the DOM just displays it.',
			'  const [name, setName] = React.useState(\'gopher\');',
			'  const [subscribe, setSubscribe] = React.useState(true);',
			'',
			'  function handleSubmit(e) {',
			'    // Without this the browser serializes the form and RELOADS the',
			'    // page — state gone. Always first line of a React onSubmit.',
			'    e.preventDefault();',
			'    // No DOM reads needed: the data already lives in state.',
			'    console.log(\'signup: \' + name + (subscribe ? \' (subscribed)\' : \'\'));',
			'  }',
			'',
			'  return (',
			'    <form onSubmit={handleSubmit}>',
			'      <label>',
			'        name:',
			'        {/* value paints state; onChange writes it back. The outline',
			'            shows value="gopher" — the initial frame, frozen. */}',
			'        <input value={name} onChange={e => setName(e.target.value)} />',
			'      </label>',
			'      <label>',
			'        {/* checkboxes: checked (boolean), and read e.target.checked */}',
			'        <input type="checkbox" checked={subscribe}',
			'          onChange={e => setSubscribe(e.target.checked)} />',
			'        subscribe',
			'      </label>',
			'      <button type="submit">sign up</button>',
			'    </form>',
			'  );',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<p>Two state cells, two controlled fields. The text input&#39;s ' +
			'<code>value={name}</code> means the field displays exactly what ' +
			'state holds — the outline&#39;s <code>input value="gopher"</code> ' +
			'line is the initial state made visible. <code>onChange</code> ' +
			'fires per keystroke with the would-be new text in ' +
			'<code>e.target.value</code>; writing it into state re-renders, and ' +
			'the field shows the new state. That round trip is invisible when ' +
			'it works — try typing in the live preview — but it is why the ' +
			'component can validate or transform input on the way through.</p>',
			'<p>The checkbox is the same pattern with different names: ' +
			'<code>checked={subscribe}</code> down, ' +
			'<code>e.target.checked</code> (a boolean, not a string) up. ' +
			'Because the initial state is <code>true</code>, the serializer ' +
			'emits the boolean attribute — <code>checked=""</code> in the ' +
			'outline, an empty-valued attribute being how booleans ' +
			'serialize.</p>',
			'<p><code>handleSubmit</code> hangs on the <em>form</em>, so both ' +
			'the button and Enter-in-a-field trigger it. ' +
			'<code>e.preventDefault()</code> cancels the browser&#39;s ' +
			'navigate-and-reload default; the log line then reads the answer ' +
			'straight out of state. Neither the log nor any handler runs in ' +
			'the grading render — the outline stays the pristine first frame — ' +
			'but all of it works in the live preview.</p>',
		],
	});
})();
