/* hello-jsx — the track's contract lesson: every run must leave a component
 * named App, and the preview renders <App />. Pedagogy: demystify JSX on
 * day one by showing the compiled React.createElement form, so angle
 * brackets read as function calls, not magic strings; establish the
 * one-root rule and "JSX is an expression" before any state exists. The
 * starter is a bare <p> placeholder; the check pins the main > h1 > text
 * nesting via outline indentation, unreachable without a real element tree.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'hello-jsx',
		title: 'Hello, JSX',
		nav: 'Hello JSX',
		category: 'Foundations',

		prose: [
			'<h2>Hello, JSX</h2>' +
			'<p>Every lesson in this track has the same contract: your code must ' +
			'define a component named <code>App</code> — a plain function that ' +
			'returns markup — and the runner renders <code>&lt;App /&gt;</code>. ' +
			'No <code>import React from &#39;react&#39;</code> here (there is no ' +
			'module system in this sandbox; the import would be a runtime error) — ' +
			'<code>React</code> is already in scope. What <code>App</code> returns ' +
			'is <strong>JSX</strong>: HTML-shaped syntax embedded in JavaScript. ' +
			'It looks like a template language. It is not — it is syntax sugar ' +
			'that compiles to ordinary function calls:</p>',
			{ lang: 'js', code: '// What you write:\nconst el = <h1 id="hi">Hello, React</h1>;\n\n// What the compiler emits — a plain function call:\nconst el = React.createElement("h1", { id: "hi" }, "Hello, React");' },
			'<p>That compiled form explains most JSX rules for free. ' +
			'<code>createElement</code> returns a lightweight description object ' +
			'(an <em>element</em>, not a DOM node), so JSX is an ' +
			'<strong>expression</strong> — you can assign it to a variable, pass ' +
			'it to a function, return it. And because a function returns exactly ' +
			'one value, a component must return exactly <strong>one root ' +
			'element</strong>; siblings need a shared wrapper (the next lesson ' +
			'shows what happens when you forget, and the fix).</p>' +
			'<p>When you run, the pane below the editor shows two things: the ' +
			'<em>live preview</em> — your component actually mounted in a real ' +
			'page — and the <em>outline</em>, a 2-space-indented structure dump ' +
			'of the initial render (<code>main</code>, then <code>h1</code> ' +
			'indented under it, then its text in quotes). Checks in this track ' +
			'grade the outline, so nesting is never a matter of squinting at ' +
			'pixels: if the <code>h1</code> is really inside the ' +
			'<code>main</code>, it sits one level deeper.</p>' +
			'<p>Elsewhere in go-learn, the <em>TypeScript + Go Web</em> track ' +
			'builds this same markup server-side in Go with the ' +
			'<code>github.com/rohanthewiz/element</code> builder — ' +
			'<code>b.H1().T("Hello")</code> is a method call that emits ' +
			'<code>&lt;h1&gt;Hello&lt;/h1&gt;</code>. Same idea as ' +
			'<code>createElement</code>: markup as function calls, no template ' +
			'files. JSX just hides the calls behind angle brackets.</p>' +
			'<h3>Your job</h3>' +
			'<p>Replace the placeholder so <code>App</code> returns a ' +
			'<code>&lt;main&gt;</code> containing an ' +
			'<code>&lt;h1&gt;Hello, React&lt;/h1&gt;</code> followed by a ' +
			'<code>&lt;p&gt;</code> with a one-line tagline of your choosing. One ' +
			'root, two children inside it.</p>' +
			'<div class="tip">Multi-line JSX after <code>return</code> needs ' +
			'parentheses: <code>return (</code> … <code>);</code>. Without them, ' +
			'automatic semicolon insertion turns <code>return</code> on its own ' +
			'line into <code>return;</code> — and your component returns ' +
			'nothing.</div>',
		],

		task: 'Make App return a <main> wrapping an <h1>Hello, React</h1> and a <p> tagline.',

		starter: [
			'// The contract: define App; the preview renders <App />.',
			'// TODO: return ONE root <main> containing an <h1>Hello, React</h1>',
			'// and a <p> with a short tagline.',
			'function App() {',
			'\treturn <p>placeholder</p>;',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// Pin the nesting through outline indentation: h1 one level inside
			// main, its text one level deeper, and a sibling p back at h1 depth.
			return stdout.includes('main\n  h1\n    "Hello, React"\n  p\n') &&
				flat.indexOf('placeholder') === -1;
		},

		solution: [
			'function App() {',
			'\t// One root element (main); h1 and p are its children. The',
			'\t// parentheses keep the multi-line return safe from ASI.',
			'\t// This whole block compiles to nested React.createElement calls',
			'\t// and evaluates to a single element object — an expression,',
			'\t// which is why a function can return it.',
			'\treturn (',
			'\t\t<main>',
			'\t\t\t<h1>Hello, React</h1>',
			'\t\t\t<p>UI as a function of data.</p>',
			'\t\t</main>',
			'\t);',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<p><code>App</code> is just a function — no class, no registration ' +
			'call. The runner sees a function named <code>App</code> and renders ' +
			'<code>&lt;App /&gt;</code>, which compiles to ' +
			'<code>React.createElement(App)</code>: React calls your function ' +
			'and renders whatever it returns.</p>',
			'<p>The return value is one <code>&lt;main&gt;</code> element whose ' +
			'children array holds the <code>&lt;h1&gt;</code> and the ' +
			'<code>&lt;p&gt;</code>. In the outline that reads as ' +
			'<code>main</code> at the left margin, both children indented one ' +
			'level, and each text node quoted one level deeper still — the ' +
			'indentation <em>is</em> the tree.</p>',
			'<p>Try deleting the <code>&lt;main&gt;</code> wrapper and running ' +
			'again: two adjacent roots refuse to compile, because a function ' +
			'cannot return two values. That error is the whole next lesson.</p>',
		],
	});
})();
