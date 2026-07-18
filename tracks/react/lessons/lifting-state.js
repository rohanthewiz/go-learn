/* lifting-state — siblings cannot share local state; two useState cells are
 * two truths that drift. The fix: move the state to the closest common
 * parent, pass the value down as a prop and a callback down for changes —
 * "props down, events up". Starter: two sensor displays each owning a
 * private copy of the current unit, seeded differently, so the very first
 * frame shows them disagreeing (A: celsius / B: fahrenheit). Solution: App
 * owns one 'celsius' cell and both children render the SAME prop, so the
 * outline shows them agreeing; the onSelect callback is wired but (as the
 * prose says) never fires in the static frame. Check pins the panel wrapper,
 * both identical child lines, and the ABSENCE of 'fahrenheit'.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'lifting-state',
		title: 'Lifting State Up',
		nav: 'Lifting state',
		category: 'State & Events',

		prose: [
			'<h2>Lifting state up</h2>' +
			'<p>State declared with <code>useState</code> is <em>private</em> to ' +
			'its component. That is usually a feature — but the moment two ' +
			'siblings need the <em>same</em> piece of data, private state ' +
			'becomes two independent copies with nothing keeping them honest. ' +
			'They start out of sync or drift out of sync; either way, the UI ' +
			'shows two truths. React&#39;s data flow is strictly top-down, so ' +
			'siblings have no channel to each other — the only path between ' +
			'them runs <em>through a shared ancestor</em>.</p>' +
			'<p>Hence the pattern: <strong>lift the state up</strong> to the ' +
			'closest common parent. The parent owns the single ' +
			'<code>useState</code> cell; each child receives the value as a ' +
			'prop, and receives a <em>callback</em> prop to request changes. ' +
			'&quot;Props down, events up&quot; — data flows down the tree, ' +
			'change requests bubble up as function calls:</p>',
			{ lang: 'js', code: 'function Parent() {\n  const [color, setColor] = React.useState(\'red\');\n  return (\n    <div>\n      {/* both children read ONE cell — they cannot disagree */}\n      <Swatch color={color} onPick={setColor} />\n      <Swatch color={color} onPick={setColor} />\n    </div>\n  );\n}\n\nfunction Swatch({ color, onPick }) {\n  // no useState here: this component is now STATELESS — it renders\n  // what it is told and reports clicks upward via the callback\n  return <button onClick={() => onPick(\'blue\')}>{color}</button>;\n}' },
			'<p>Notice what lifting did to the children: they lost their ' +
			'<code>useState</code> entirely. A lifted child is just a function ' +
			'of its props — easier to test, reusable anywhere, incapable of ' +
			'disagreeing with its twin. When the callback fires, the ' +
			'<em>parent&#39;s</em> setter runs, the parent re-renders, and both ' +
			'children get the new value on the same pass. One cell, one ' +
			'truth.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter shows two temperature sensors that each hold their ' +
			'own <code>unit</code> state — seeded differently, so the first ' +
			'frame already disagrees: <code>A: celsius</code> next to ' +
			'<code>B: fahrenheit</code>. Lift the unit into <code>App</code>: ' +
			'one <code>useState(&#39;celsius&#39;)</code> cell there, a single ' +
			'reusable <code>Sensor</code> child taking <code>name</code>, ' +
			'<code>unit</code>, and an <code>onSelect</code> callback, and a ' +
			'wrapping <code>&lt;div className=&quot;panel&quot;&gt;</code>. ' +
			'Both sensors must render the same prop — the outline should show ' +
			'<code>A: celsius</code> and <code>B: celsius</code>, with ' +
			'<code>fahrenheit</code> nowhere in the frame. Wire each ' +
			'sensor&#39;s button to <code>onSelect</code> with the toggled ' +
			'unit.</p>' +
			'<div class="tip">The outline is the initial frame, so ' +
			'<code>onSelect</code> never fires there — it exists in the static ' +
			'render only as wiring. Click either switch button in the live ' +
			'preview instead and watch <em>both</em> sensors flip together: ' +
			'that is one parent cell re-rendering two children, the whole ' +
			'point of the lift.</div>',
		],

		task: 'Lift unit state into App (one useState(\'celsius\')); one Sensor child renders name/unit props and reports changes via onSelect.',

		starter: [
			'// Two siblings, two PRIVATE copies of "the current unit". Nothing',
			'// connects them, so nothing stops them disagreeing — and they',
			'// already do on the very first frame.',
			'function SensorA() {',
			'  const [unit, setUnit] = React.useState(\'celsius\');',
			'  return (',
			'    <p className="sensor">',
			'      A: {unit}',
			'      <button onClick={() => setUnit(\'fahrenheit\')}>switch</button>',
			'    </p>',
			'  );',
			'}',
			'',
			'function SensorB() {',
			'  const [unit, setUnit] = React.useState(\'fahrenheit\'); // out of sync already!',
			'  return (',
			'    <p className="sensor">',
			'      B: {unit}',
			'      <button onClick={() => setUnit(\'celsius\')}>switch</button>',
			'    </p>',
			'  );',
			'}',
			'',
			'// App has no state to give them — the truth is scattered below it.',
			'function App() {',
			'  return (',
			'    <div>',
			'      <SensorA />',
			'      <SensorB />',
			'    </div>',
			'  );',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('div class="panel"') &&
				stdout.includes('  p class="sensor"\n    "A: celsius"\n    button') &&
				stdout.includes('  p class="sensor"\n    "B: celsius"\n    button') &&
				!flat.includes('fahrenheit') &&
				!flat.includes('warn:');
		},

		solution: [
			'// One reusable, STATELESS sensor: renders what it is told (props',
			'// down), reports the unit the user wants via onSelect (events up).',
			'function Sensor({ name, unit, onSelect }) {',
			'  return (',
			'    <p className="sensor">',
			'      {name}: {unit}',
			'      <button onClick={() => onSelect(unit === \'celsius\' ? \'fahrenheit\' : \'celsius\')}>',
			'        switch',
			'      </button>',
			'    </p>',
			'  );',
			'}',
			'',
			'function App() {',
			'  // The lift: the closest common parent owns the ONE unit cell.',
			'  // Both children read it, so they cannot disagree; both change',
			'  // requests land on the same setter.',
			'  const [unit, setUnit] = React.useState(\'celsius\');',
			'  return (',
			'    <div className="panel">',
			'      <Sensor name="A" unit={unit} onSelect={setUnit} />',
			'      <Sensor name="B" unit={unit} onSelect={setUnit} />',
			'    </div>',
			'  );',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<p>The two hand-written sensors collapsed into one ' +
			'<code>Sensor</code> component with no state at all: it renders ' +
			'<code>{name}: {unit}</code> from props and calls ' +
			'<code>onSelect</code> with the opposite unit when clicked. ' +
			'Stateless children are the telltale sign of a correct lift — if a ' +
			'child still has its own copy of the shared value, the lift is not ' +
			'finished.</p>',
			'<p><code>App</code> owns the single ' +
			'<code>useState(&#39;celsius&#39;)</code> cell and passes the same ' +
			'<code>unit</code> to both children, plus <code>setUnit</code> ' +
			'itself as <code>onSelect</code> — a setter is already a function ' +
			'of the next value, so it can be handed down unwrapped. The outline ' +
			'proves the sharing: both <code>p class="sensor"</code> blocks read ' +
			'<code>celsius</code>, and <code>fahrenheit</code> — the starter&#39;s ' +
			'second truth — appears nowhere in the frame.</p>',
			'<p>In the static render <code>onSelect</code> is inert wiring: ' +
			'handlers never fire in the initial frame, which is why the check ' +
			'can pin agreement without ever clicking. In the live preview, ' +
			'clicking either switch calls <code>setUnit</code> in the ' +
			'<em>parent</em>, and the re-render delivers the new unit to both ' +
			'children at once — one cell, one truth, two views.</p>',
		],
	});
})();
