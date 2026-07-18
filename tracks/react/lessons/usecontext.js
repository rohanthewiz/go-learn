/* usecontext — context solves prop drilling for wide-shared values. The
 * starter threads a `theme` prop through Page → Toolbar → Button, each layer
 * forwarding a prop it never uses — the drilling IS the visible pain. The
 * solution creates ThemeContext = React.createContext('light'), App provides
 * 'dark', the intermediate layers drop the prop entirely, and Button reads
 * React.useContext(ThemeContext). A sibling Button rendered OUTSIDE the
 * provider demonstrates the createContext default ('light'). Check pins the
 * deep `button class="btn dark"` at its provider-subtree indentation (the
 * starter's shallower tree can't match) plus the default-light sibling line.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'usecontext',
		title: 'useContext',
		nav: 'useContext',
		category: 'Hooks in Depth',

		prose: [
			'<h2>useContext: values for a whole subtree</h2>' +
			'<p>Props are point-to-point: parent hands to child. That is ' +
			'exactly right for data a component actually uses — and exactly ' +
			'wrong for ambient values like the current theme, locale, or ' +
			'logged-in user that <em>dozens</em> of leaves need. Threading such ' +
			'a value down as a prop means every intermediate layer must accept ' +
			'it and forward it, touching components that never read it. That is ' +
			'<strong>prop drilling</strong>, and its real cost is coupling: add ' +
			'one themed button five levels deep and you edit five signatures.</p>' +
			'<p>Context is broadcast instead of relay. Three parts:</p>' +
			'<ul>' +
			'<li><code>const ThemeContext = React.createContext(&#39;light&#39;)</code> ' +
			'— creates the channel, at module scope, with a <strong>default</strong> ' +
			'for components rendered under no provider at all.</li>' +
			'<li><code>&lt;ThemeContext.Provider value=&quot;dark&quot;&gt;</code> ' +
			'— publishes a value to everything below it in the tree.</li>' +
			'<li><code>React.useContext(ThemeContext)</code> — reads the nearest ' +
			'provider&#39;s value from <em>any</em> depth; no props involved.</li>' +
			'</ul>',
			{ lang: 'js', code: 'const UserContext = React.createContext(null);\n\nfunction Avatar() {\n  const user = React.useContext(UserContext); // nearest provider wins\n  return <img alt={user ? user.name : \'guest\'} />;\n}\n// anywhere above: <UserContext.Provider value={user}>…</UserContext.Provider>' },
			'<p>Know when <em>not</em> to use it. Context is not a state ' +
			'manager and not a way to avoid typing props: every consumer ' +
			're-renders when the provided value changes, and a component that ' +
			'reads context is harder to reuse because its output depends on ' +
			'invisible ancestry. Data used by one child is a prop. Lists you ' +
			'map over are props. Reach for context only when a value is truly ' +
			'<em>ambient</em> — needed wide and deep, changed rarely.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter drills <code>theme</code> through ' +
			'<code>Page → Toolbar → Button</code>; the two middle layers only ' +
			'forward it. Create a module-scope ' +
			'<code>ThemeContext = React.createContext(&#39;light&#39;)</code>; ' +
			'have <code>App</code> wrap the page in a provider with ' +
			'<code>value=&quot;dark&quot;</code>; strip the <code>theme</code> ' +
			'prop from every layer; make <code>Button</code> read ' +
			'<code>React.useContext(ThemeContext)</code>. Then prove you ' +
			'understand the default: render one extra ' +
			'<code>&lt;Button label=&quot;Log in&quot; /&gt;</code> ' +
			'<em>outside</em> the provider — it should come out ' +
			'<code>btn light</code> with no provider in sight.</p>' +
			'<div class="tip">Read the solved outline like a map: the ' +
			'<code>btn dark</code> button sits deep inside the provider&#39;s ' +
			'subtree, the <code>btn light</code> one hangs directly off the ' +
			'root — same component, different ancestry, different value. ' +
			'That is the whole mechanism in two lines.</div>',
		],

		task: 'Replace the drilled theme prop with ThemeContext (default light, provider dark); add one Button outside the provider showing the default.',

		starter: [
			'// PROP DRILLING: theme enters at App and must be RELAYED through',
			'// Page and Toolbar — two components that never use it — to reach',
			'// the one component that does. Every layer\'s signature is coupled',
			'// to a value it does not care about.',
			'function Button({ theme }) {',
			'	return <button className={\'btn \' + theme}>Save</button>;',
			'}',
			'',
			'function Toolbar({ theme }) {',
			'	// forwards theme, uses nothing',
			'	return (',
			'		<div className="toolbar">',
			'			<Button theme={theme} />',
			'		</div>',
			'	);',
			'}',
			'',
			'function Page({ theme }) {',
			'	// forwards theme, uses nothing',
			'	return (',
			'		<main>',
			'			<Toolbar theme={theme} />',
			'		</main>',
			'	);',
			'}',
			'',
			'function App() {',
			'	return <Page theme="dark" />;',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('div class="toolbar"\n      button class="btn dark"\n        "Save"') &&
				stdout.includes('\n  button class="btn light"\n    "Log in"');
		},

		solution: [
			'// The channel: module scope, one per ambient value. The argument is',
			'// the DEFAULT — what useContext returns when no provider is above.',
			'const ThemeContext = React.createContext(\'light\');',
			'',
			'function Button({ label }) {',
			'	// Read from the nearest provider, at any depth. Note the split:',
			'	// theme is ambient (context), label varies per use (still a prop).',
			'	const theme = React.useContext(ThemeContext);',
			'	return <button className={\'btn \' + theme}>{label}</button>;',
			'}',
			'',
			'// The middle layers no longer know theme exists — signatures',
			'// decoupled, which was the entire point.',
			'function Toolbar() {',
			'	return (',
			'		<div className="toolbar">',
			'			<Button label="Save" />',
			'		</div>',
			'	);',
			'}',
			'',
			'function Page() {',
			'	return (',
			'		<main>',
			'			<Toolbar />',
			'		</main>',
			'	);',
			'}',
			'',
			'function App() {',
			'	return (',
			'		<div>',
			'			{/* Everything under the provider reads "dark"… */}',
			'			<ThemeContext.Provider value="dark">',
			'				<Page />',
			'			</ThemeContext.Provider>',
			'			{/* …and outside it, useContext falls back to the',
			'			    createContext default: "light". */}',
			'			<Button label="Log in" />',
			'		</div>',
			'	);',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What actually changed</h3>' +
			'<p><code>Toolbar</code> and <code>Page</code> lost their ' +
			'<code>theme</code> prop and with it their coupling to theming — ' +
			'they can be moved, reused, or wrapped without ceremony. ' +
			'<code>Button</code> now pulls the theme from the nearest ' +
			'<code>ThemeContext.Provider</code> above it, however far up that ' +
			'is. The outline shows both ends of the mechanism at once: the ' +
			'<code>Save</code> button deep in the provider&#39;s subtree renders ' +
			'<code>class=&quot;btn dark&quot;</code>, while the ' +
			'<code>Log in</code> button — same component, rendered outside the ' +
			'provider — falls back to the <code>createContext</code> default ' +
			'and renders <code>class=&quot;btn light&quot;</code>. Ancestry, ' +
			'not arguments, selects the value.</p>',
			{ lang: 'js', code: '// Nesting providers re-scopes the value for a subtree —\n// nearest one wins, exactly like variable shadowing:\n<ThemeContext.Provider value="dark">\n  <Page />\n  <ThemeContext.Provider value="light">\n    <Dialog />   {/* reads "light" */}\n  </ThemeContext.Provider>\n</ThemeContext.Provider>' },
			'<h3>Keeping the split honest</h3>' +
			'<p>Notice <code>label</code> stayed a prop. That is the design ' +
			'rule worth keeping: context for values that are ambient to a whole ' +
			'subtree (theme, locale, current user, a reducer&#39;s ' +
			'<code>dispatch</code>), props for everything that varies per use. ' +
			'If you find yourself creating a context so one parent can talk to ' +
			'one child, you wanted a prop; if a provider&#39;s value is a fresh ' +
			'object literal every render, every consumer re-renders every time ' +
			'— memoize the value or split the context.</p>',
		],
	});
})();
