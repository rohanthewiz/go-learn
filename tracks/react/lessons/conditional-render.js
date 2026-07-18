/* conditional-render — the three idioms for "render this or don't": ternary
 * (exactly one of two subtrees), && short-circuit (a subtree or nothing) with
 * its famous `0 &&` footgun (0 is a renderable value, so it PRINTS), and
 * returning null from a component. Starter renders BOTH status branches
 * unconditionally and trips the 0-footgun live, so the outline shows the
 * offline line and a stray "0". Check pins the online line present, the
 * offline line absent as a whole line, and no `"0"` text node anywhere —
 * reachable only by actually wiring the conditions.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'conditional-render',
		title: 'Conditional Rendering',
		nav: 'Conditionals',
		category: 'Foundations',

		prose: [
			'<h2>Conditional rendering</h2>' +
			'<p>JSX braces hold <em>expressions</em>, and an <code>if</code> ' +
			'statement is not one — so React has no special conditional syntax at ' +
			'all. You use the expression forms JavaScript already has. The ' +
			'workhorse is the ternary: <code>cond ? &lt;A /&gt; : &lt;B /&gt;</code> ' +
			'evaluates to exactly one of two subtrees, and the other one is never ' +
			'built. Not hidden with CSS, not disabled — it does not exist in the ' +
			'output:</p>',
			{ lang: 'js', code: 'function Greeting({ user }) {\n\treturn (\n\t\t<header>\n\t\t\t{user\n\t\t\t\t? <h1>Welcome back, {user.name}</h1>\n\t\t\t\t: <h1>Sign in to continue</h1>}\n\t\t</header>\n\t);\n}' },
			'<p>When there is no "else" branch, <code>&amp;&amp;</code> ' +
			'short-circuit is the idiom: <code>cond &amp;&amp; &lt;X /&gt;</code> ' +
			'yields the subtree when <code>cond</code> is truthy and yields ' +
			'<code>cond</code> itself when it is falsy. React skips ' +
			'<code>false</code>, <code>null</code> and <code>undefined</code> — ' +
			'but <strong>not the number 0</strong>. Zero is a perfectly renderable ' +
			'value, so this classic prints a stray <code>0</code> into your page:</p>',
			{ lang: 'js', code: 'const msgs = 0;\n\n// FOOTGUN: 0 && anything === 0, and React renders 0 as text.\n<div>{msgs && <span>{msgs} new messages</span>}</div>\n// outline:  div\n//             "0"        ← the bug, visible as a text node\n\n// FIX: make the left side a real boolean.\n<div>{msgs > 0 && <span>{msgs} new messages</span>}</div>\n// outline:  div          ← empty, as intended' },
			'<p>The third idiom lives one level up: a component can decide to ' +
			'render nothing by returning <code>null</code>. That keeps the ' +
			'decision <em>inside</em> the component — callers just write ' +
			'<code>&lt;UnreadBadge unread={n} /&gt;</code> and never repeat the ' +
			'guard. Rendering nothing is a return value, not an omission.</p>' +
			'<ul>' +
			'<li><code>cond ? &lt;A /&gt; : &lt;B /&gt;</code> — pick one of two</li>' +
			'<li><code>cond &amp;&amp; &lt;X /&gt;</code> — something or nothing; ' +
			'keep the left side boolean (<code>count &gt; 0</code>, ' +
			'<code>items.length &gt; 0</code>), never a bare number</li>' +
			'<li><code>return null</code> — the component itself opts out</li>' +
			'</ul>' +
			'<h3>Your job</h3>' +
			'<p>The starter&#39;s status panel has the flag ' +
			'(<code>isOnline = true</code>) but ignores it: both the online and ' +
			'offline paragraphs render, and <code>{count &amp;&amp; …}</code> with ' +
			'<code>count = 0</code> plants a bare <code>"0"</code> in the outline. ' +
			'Make the ternary choose exactly one branch, guard the count with ' +
			'<code>count &gt; 0</code> so zero renders <em>nothing</em>, and add an ' +
			'<code>UnreadBadge</code> component that returns <code>null</code> when ' +
			'<code>unread</code> is 0.</p>' +
			'<div class="tip">Read the structure outline after each run: the ' +
			'offline paragraph and the <code>"0"</code> text node must vanish ' +
			'entirely — conditional rendering removes subtrees, it does not hide ' +
			'them. Then flip <code>isOnline</code> to <code>false</code> and run ' +
			'again: the outline swaps to the other branch, because it is ' +
			're-rendered from scratch each run.</div>',
		],

		task: 'Render exactly one status branch with a ternary, guard count with count > 0, and make UnreadBadge return null at zero.',

		starter: [
			'function App() {',
			'\tconst isOnline = true; // the flag exists…',
			'\tconst count = 0;',
			'',
			'\treturn (',
			'\t\t<section className="status">',
			'\t\t\t{/* …but nothing consults it: BOTH branches render. */}',
			'\t\t\t<p className="ok">Online — all systems go</p>',
			'\t\t\t<p className="down">Offline — reconnecting</p>',
			'',
			'\t\t\t{/* count is 0, and 0 && X is 0 — find the "0" in the outline. */}',
			'\t\t\t{count && <span>{count} new results</span>}',
			'\t\t</section>',
			'\t);',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('  p class="ok"\n    "Online — all systems go"') &&
				!stdout.includes('"Offline — reconnecting"') &&
				!/(^|\n)\s*"0"/.test(stdout);
		},

		solution: [
			'// A component that renders NOTHING is still a component: it returns',
			'// null. Callers never repeat the guard — the decision lives here.',
			'function UnreadBadge({ unread }) {',
			'\tif (unread === 0) return null;',
			'\treturn <strong className="badge">{unread} unread</strong>;',
			'}',
			'',
			'function App() {',
			'\tconst isOnline = true;',
			'\tconst count = 0;',
			'',
			'\treturn (',
			'\t\t<section className="status">',
			'\t\t\t{/* Ternary: exactly one subtree exists in the output. */}',
			'\t\t\t{isOnline',
			'\t\t\t\t? <p className="ok">Online — all systems go</p>',
			'\t\t\t\t: <p className="down">Offline — reconnecting</p>}',
			'',
			'\t\t\t{/* count > 0 is a boolean, so 0 renders nothing — not "0". */}',
			'\t\t\t{count > 0 && <span>{count} new results</span>}',
			'',
			'\t\t\t{/* Renders null → absent from the outline entirely. */}',
			'\t\t\t<UnreadBadge unread={0} />',
			'\t\t</section>',
			'\t);',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<p>The ternary <code>{isOnline ? … : …}</code> is one expression that ' +
			'evaluates to one subtree — the offline paragraph is not hidden, it ' +
			'was never created, which is why its whole line disappears from the ' +
			'outline.</p>',
			'<p><code>count &gt; 0 &amp;&amp; &lt;span&gt;…&lt;/span&gt;</code> ' +
			'fixes the footgun by making the left operand a real boolean: ' +
			'<code>false</code> is one of the values React silently skips, while ' +
			'the starter&#39;s bare <code>count</code> evaluated to <code>0</code> ' +
			'— a number, which React dutifully prints as text.</p>',
			'<p><code>UnreadBadge</code> shows the third idiom: ' +
			'<code>return null</code> inside the component. The call site stays a ' +
			'plain <code>&lt;UnreadBadge unread={0} /&gt;</code>; the zero-case ' +
			'policy is encapsulated where the badge is defined. Flip any of the ' +
			'three inputs and re-run — the outline re-renders the consequences, ' +
			'branch by branch.</p>',
		],
	});
})();
