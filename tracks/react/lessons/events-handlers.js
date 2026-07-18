/* events-handlers — camelCase event props, and the pass-vs-call distinction:
 * onClick wants a FUNCTION for later, and onClick={fn()} executes fn NOW,
 * during render. The starter commits exactly that bug on the Save button, so
 * "announcing save" appears in the console section at render time — evidence
 * sitting right under the outline before the learner clicks anything. The
 * solution wraps the call in an arrow; the console shrinks to the deliberate
 * module-scope "toolbar ready" line. Check pins the three button lines, the
 * ready line present, and the render-time log absent. The static-outline /
 * live-preview split IS the pedagogy here: handlers never fire in the worker
 * render, but the same compilation mounted live in the preview clicks fine.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'events-handlers',
		title: 'Events & Handlers',
		nav: 'Events',
		category: 'State & Events',

		prose: [
			'<h2>Events &amp; handlers</h2>' +
			'<p>React events look like HTML attributes but follow JavaScript ' +
			'conventions: the prop is camelCase — <code>onClick</code>, ' +
			'<code>onChange</code>, <code>onSubmit</code> — and its value is a ' +
			'<em>function</em>, not a string of code. Write the lowercase DOM ' +
			'spelling <code>onclick</code> and React&#39;s dev build warns you ' +
			'(<code>Did you mean `onClick`?</code> — in this track that ' +
			'would land as a <code>warn:</code> line in the console section).</p>' +
			'<p>The mistake that bites everyone once: <strong>pass the function, ' +
			'don&#39;t call it</strong>. <code>onClick={fn}</code> hands React a ' +
			'function to invoke on a future click; <code>onClick={fn()}</code> ' +
			'invokes <code>fn</code> <em>right now, while rendering</em>, and ' +
			'hands React whatever it returned. The log ordering proves when each ' +
			'piece runs:</p>',
			{ lang: 'js', code: 'function ping() { console.log(\'clicked!\'); }\n\nfunction App() {\n\tconsole.log(\'rendering\');\n\treturn <button onClick={ping()}>Hit me</button>; // ping() runs NOW\n}\n\n// console, before any click exists anywhere:\n//   rendering\n//   clicked!        ← fired during render, not by a user' },
			'<p>So how do you pass an argument? You cannot write ' +
			'<code>onClick={announce(\'save\')}</code> — that is a call. Wrap it: ' +
			'<code>onClick={() =&gt; announce(\'save\')}</code> builds a new ' +
			'function whose <em>body</em> is the call. Rendering evaluates the ' +
			'arrow expression (cheap — it just creates the function), and only a ' +
			'click runs its body. One rule covers every case:</p>' +
			'<ul>' +
			'<li>No arguments: pass the reference — <code>onClick={reset}</code></li>' +
			'<li>Arguments needed: pass an arrow — ' +
			'<code>onClick={() =&gt; announce(\'save\')}</code></li>' +
			'<li>Parentheses directly after the name inside <code>{}</code> ' +
			'means it runs during render — almost never what you want</li>' +
			'</ul>' +
			'<p>One more thing this track makes unusually visible: the structure ' +
			'outline is a <em>static</em> render — no DOM, no clicks, handlers ' +
			'never fire there, and <code>onClick</code> never even appears as an ' +
			'attribute. The live preview mounts the very same compilation with a ' +
			'real DOM, so clicking there runs your handlers for real. If a ' +
			'handler&#39;s log shows up in the console section <em>without</em> ' +
			'you touching the preview, it did not run as a handler — it ran ' +
			'during render, and you have found the bug of this lesson.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter&#39;s Save button uses ' +
			'<code>onClick={announce(\'save\')}</code> — a call. Run it and look ' +
			'at the console section: <code>announcing save</code> is already ' +
			'there, at render time; the evidence is right under the outline — ' +
			'and Undo and Share, already wrapped in arrows, logged nothing. Fix ' +
			'Save the same way so the console shows only the deliberate ' +
			'module-scope <code>toolbar ready</code> line, and the announcement ' +
			'moves to where it belongs: the live preview&#39;s click.</p>' +
			'<div class="tip">After fixing, click each button in the live ' +
			'preview and watch its console — <code>announcing save</code> fires ' +
			'per click there, while the outline&#39;s console section stays at ' +
			'just <code>toolbar ready</code>. Same code, two renders: static for ' +
			'grading, live for behavior.</div>',
		],

		task: 'Pass functions, not calls: wrap the Save handler in an arrow so nothing announces during render.',

		starter: [
			'function announce(action) {',
			'\tconsole.log(\'announcing \' + action);',
			'}',
			'',
			'function App() {',
			'\treturn (',
			'\t\t<div className="toolbar">',
			'\t\t\t{/* BUG: announce(\'save\') is a CALL — it runs during render.',
			'\t\t\t   Its log is already in the console section below. */}',
			'\t\t\t<button onClick={announce(\'save\')}>Save</button>',
			'\t\t\t{/* These two are correct: the arrow defers the call. */}',
			'\t\t\t<button onClick={() => announce(\'undo\')}>Undo</button>',
			'\t\t\t<button onClick={() => announce(\'share\')}>Share</button>',
			'\t\t</div>',
			'\t);',
			'}',
			'',
			'console.log(\'toolbar ready\');',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('  button\n    "Save"') &&
				stdout.includes('  button\n    "Undo"') &&
				stdout.includes('  button\n    "Share"') &&
				flat.includes('toolbar ready') &&
				!flat.includes('announcing save');
		},

		solution: [
			'function announce(action) {',
			'\tconsole.log(\'announcing \' + action);',
			'}',
			'',
			'function App() {',
			'\treturn (',
			'\t\t<div className="toolbar">',
			'\t\t\t{/* Each arrow is a NEW function; rendering only creates it.',
			'\t\t\t   The body — the announce call — waits for a real click,',
			'\t\t\t   which exists only in the live preview. */}',
			'\t\t\t<button onClick={() => announce(\'save\')}>Save</button>',
			'\t\t\t<button onClick={() => announce(\'undo\')}>Undo</button>',
			'\t\t\t<button onClick={() => announce(\'share\')}>Share</button>',
			'\t\t</div>',
			'\t);',
			'}',
			'',
			'// Module scope runs once at execute time — this line is the only',
			'// thing that should reach the console section of the static render.',
			'console.log(\'toolbar ready\');',
			'',
		].join('\n'),

		explanation: [
			'<p>The starter&#39;s console section read <code>toolbar ready</code> ' +
			'then <code>announcing save</code> — in that order because the script ' +
			'body executes first (defining <code>App</code>, logging ready) and ' +
			'the render happens after, evaluating every JSX prop expression ' +
			'including the accidental <code>announce(\'save\')</code> call. The ' +
			'ordering itself is the diagnosis: a "click" log with no click.</p>',
			'<p><code>onClick={() =&gt; announce(\'save\')}</code> changes what ' +
			'the expression <em>evaluates to</em>: an arrow function. Render-time ' +
			'evaluation now just constructs that function and hands it to React; ' +
			'the <code>announce</code> call sits inert in its body until a click ' +
			'dispatches it. That is also why the fixed console shows only ' +
			'<code>toolbar ready</code> — the static render has no events, so ' +
			'handler bodies are dead code there by design.</p>',
			'<p>A subtlety worth keeping: the starter still <em>rendered</em> ' +
			'fine, because <code>announce</code> returns <code>undefined</code> ' +
			'and React quietly accepts <code>onClick={undefined}</code>. The bug ' +
			'was invisible in the markup and loud in the console — which is ' +
			'exactly where you should look for it in real apps too.</p>',
		],
	});
})();
