/* custom-hooks — extraction, not magic: a custom hook is a plain function
 * whose name starts with `use` and which calls other hooks. Pedagogy: the
 * starter duplicates identical useState toggle wiring in two components (the
 * copy-paste smell named in prose); the solution extracts useToggle(initial)
 * returning [on, toggle] and consumes it with DIFFERENT initial values
 * (true/false), so the outline's aria-pressed="true"/"false" pair proves
 * each call site owns an independent state slot. A module-scope
 * `typeof useToggle` log pins that the hook is just a function — which is
 * also what keeps the starter (no useToggle at all) from pre-passing.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'custom-hooks',
		title: 'Custom Hooks',
		nav: 'Custom hooks',
		category: 'Hooks in Depth',

		prose: [
			'<h2>Custom hooks: extraction, not magic</h2>' +
			'<p>Every hook lesson so far used a hook React ships. Here is the ' +
			'punchline of the whole hooks design: <strong>you can write your ' +
			'own</strong>, and there is no API for it. A custom hook is a plain ' +
			'function that (1) has a name starting with <code>use</code> and ' +
			'(2) calls other hooks. That is the entire definition. No ' +
			'registration, no wrapper, no framework ceremony — you take the ' +
			'stateful wiring two components share, cut it out, and paste it into ' +
			'a function:</p>',
			{ lang: 'js', code: '// Shared wiring, extracted. Nothing here is new syntax —\n// it is the same useState call, now living in a reusable function.\nfunction useCounter(start) {\n\tconst [n, setN] = React.useState(start);\n\tconst bump = () => setN(v => v + 1);\n\treturn { n, bump };   // return whatever shape callers need\n}' },
			'<p>Why does this work? Because hooks track state by <em>call ' +
			'order per component instance</em>, not by which function the call ' +
			'is written in. When <code>WifiToggle</code> renders and its body ' +
			'calls <code>useToggle</code>, which calls <code>useState</code>, ' +
			'that state slot belongs to <em>that</em> <code>WifiToggle</code>. ' +
			'Another component calling the same hook gets its own slot. Custom ' +
			'hooks share <strong>logic</strong>, never <strong>state</strong> — ' +
			'two calls are two independent instances, which this lesson proves ' +
			'in the outline by starting one toggle <code>true</code> and the ' +
			'other <code>false</code>.</p>' +
			'<p>The <code>use</code> prefix is not decoration. The rules of ' +
			'hooks — call hooks only at the top level of a component or another ' +
			'hook, never inside <code>if</code>/loops/callbacks — are enforced ' +
			'by lint tooling, and the prefix is how that tooling <em>knows</em> ' +
			'a function is a hook and must obey (and be checked against) the ' +
			'rules. Name it <code>getToggle</code> and the linter goes blind. ' +
			'The return shape, by contrast, is entirely yours:</p>' +
			'<ul>' +
			'<li><code>return [on, toggle]</code> — array, so callers pick ' +
			'names, like <code>useState</code> itself</li>' +
			'<li><code>return { on, toggle }</code> — object, when there are ' +
			'many fields and positional order would be error-prone</li>' +
			'<li><code>return on</code> — a single value is fine too</li>' +
			'</ul>' +
			'<h3>Your job</h3>' +
			'<p>The starter has two components, each hand-rolling the same ' +
			'<code>useState</code>-plus-toggle-callback pair. Extract ' +
			'<code>function useToggle(initial)</code> returning ' +
			'<code>[on, toggle]</code>, and rewire both components to use it — ' +
			'<code>WifiToggle</code> starting <code>true</code>, ' +
			'<code>DarkModeToggle</code> starting <code>false</code>. Keep the ' +
			'module-scope <code>console.log</code> line from the roadmap comment ' +
			'so the run proves the hook is just a function.</p>' +
			'<div class="tip">Click both buttons in the live preview — each ' +
			'flips independently, because each <code>useToggle</code> call owns ' +
			'its own slot. The outline stays at the initial frame: ' +
			'<code>aria-pressed="true"</code> for Wi-Fi, ' +
			'<code>"false"</code> for dark mode — the two different initials, ' +
			'frozen at render one.</div>',
		],

		task: 'Extract useToggle(initial) returning [on, toggle]; use it in both components with initials true and false.',

		starter: [
			'// Two components, ONE behavior, twice the wiring. The useState +',
			'// toggle-callback pair below is copy-pasted verbatim between them —',
			'// the smell a custom hook exists to remove.',
			'//',
			'// TODO: extract function useToggle(initial) that returns [on, toggle],',
			'// switch WifiToggle to useToggle(true) and DarkModeToggle to',
			'// useToggle(false), then add at module scope:',
			'//   console.log(\'useToggle is just a\', typeof useToggle);',
			'function WifiToggle() {',
			'\tconst [on, setOn] = React.useState(false);',
			'\tconst toggle = () => setOn(v => !v);',
			'\treturn (',
			'\t\t<button aria-pressed={on} onClick={toggle}>',
			'\t\t\tWi-Fi: {on ? \'on\' : \'off\'}',
			'\t\t</button>',
			'\t);',
			'}',
			'',
			'function DarkModeToggle() {',
			'\tconst [on, setOn] = React.useState(false);',
			'\tconst toggle = () => setOn(v => !v);',
			'\treturn (',
			'\t\t<button aria-pressed={on} onClick={toggle}>',
			'\t\t\tDark mode: {on ? \'on\' : \'off\'}',
			'\t\t</button>',
			'\t);',
			'}',
			'',
			'function App() {',
			'\treturn (',
			'\t\t<main>',
			'\t\t\t<WifiToggle />',
			'\t\t\t<DarkModeToggle />',
			'\t\t</main>',
			'\t);',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// Two different initial values through ONE hook: aria-pressed
			// "true" on the Wi-Fi button, "false" on dark mode — plus the
			// module-scope proof that useToggle is an ordinary function.
			return stdout.includes('  button aria-pressed="true"\n    "Wi-Fi: on"') &&
				stdout.includes('  button aria-pressed="false"\n    "Dark mode: off"') &&
				flat.includes('useToggle is just a function') &&
				!flat.includes('warn:');
		},

		solution: [
			'// The extraction. Name starts with `use` (that is how tooling knows',
			'// to enforce the rules of hooks against it); body calls a real hook;',
			'// returns the [value, action] pair callers need. No React API was',
			'// involved in creating this — it is a function.',
			'function useToggle(initial) {',
			'\tconst [on, setOn] = React.useState(initial);',
			'\tconst toggle = () => setOn(v => !v);',
			'\treturn [on, toggle];',
			'}',
			'',
			'function WifiToggle() {',
			'\t// Array return means the caller picks the names — the same',
			'\t// convention useState itself uses.',
			'\tconst [on, toggle] = useToggle(true);   // this instance starts ON',
			'\treturn (',
			'\t\t<button aria-pressed={on} onClick={toggle}>',
			'\t\t\tWi-Fi: {on ? \'on\' : \'off\'}',
			'\t\t</button>',
			'\t);',
			'}',
			'',
			'function DarkModeToggle() {',
			'\t// …and this one starts OFF: two calls, two independent state',
			'\t// slots. Logic is shared; state never is.',
			'\tconst [on, toggle] = useToggle(false);',
			'\treturn (',
			'\t\t<button aria-pressed={on} onClick={toggle}>',
			'\t\t\tDark mode: {on ? \'on\' : \'off\'}',
			'\t\t</button>',
			'\t);',
			'}',
			'',
			'function App() {',
			'\treturn (',
			'\t\t<main>',
			'\t\t\t<WifiToggle />',
			'\t\t\t<DarkModeToggle />',
			'\t\t</main>',
			'\t);',
			'}',
			'',
			'// No renderer needed to inspect it — proof it is just a function.',
			'console.log(\'useToggle is just a\', typeof useToggle);',
			'',
		].join('\n'),

		explanation: [
			'<p><code>useToggle</code> contains the exact lines both components ' +
			'used to duplicate — <code>useState</code> plus the flip callback — ' +
			'moved into a function and returned as <code>[on, toggle]</code>. ' +
			'The components shrink to one line of wiring each, and the behavior ' +
			'is now fixable in one place.</p>',
			'<p>The outline shows <code>aria-pressed="true"</code> on the Wi-Fi ' +
			'button and <code>"false"</code> on dark mode: same hook, different ' +
			'<code>initial</code> argument, independent state. If the two calls ' +
			'shared state, both buttons would have to render the same value — ' +
			'they cannot, because each <code>useState</code> inside a hook call ' +
			'is slotted to the component instance that rendered it.</p>',
			'<p>The console line <code>useToggle is just a function</code> is ' +
			'the demystification: <code>typeof</code> reports a plain function. ' +
			'The <code>use</code> prefix and the top-level-only rule exist so ' +
			'tooling can verify hook call order stays stable across renders — ' +
			'break either and the linter (and eventually React) will tell you — ' +
			'but nothing about the extraction itself is framework machinery.</p>',
		],
	});
})();
