/* jsx-expressions — braces embed expressions (never statements), attribute
 * values as expressions, className vs class, and fragments. Pedagogy: the
 * starter is a REAL compile diagnostic — two adjacent JSX roots — so the
 * learner meets "JSX expressions must have one parent element" as a lesson,
 * not an accident, and the fragment is introduced as its fix. The check
 * pins an h2 carrying a class attribute, text only reachable by evaluating
 * braces ("REACT scores 21"), and warning ABSENCE — class= instead of
 * className renders fine but leaves a captured warn: line, so the negative
 * pin forces the idiomatic attribute.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'jsx-expressions',
		title: 'JSX Is Expressions',
		nav: 'Expressions',
		category: 'Foundations',
		starterError: true,

		prose: [
			'<h2>JSX is expressions all the way down</h2>' +
			'<p>Inside JSX, curly braces are an escape hatch back to ' +
			'JavaScript: <code>{…}</code> holds any <strong>expression</strong> ' +
			'— arithmetic, a method call, a ternary, a variable — and its value ' +
			'is rendered in place. <em>Statements</em> are not expressions: an ' +
			'<code>if</code>, a <code>for</code>, a <code>const</code> ' +
			'declaration have no value, so they cannot appear in braces. (This ' +
			'falls straight out of the compiled form — braces become ' +
			'<em>arguments</em> to <code>React.createElement</code>, and you ' +
			'cannot pass a statement as an argument.) Attributes take ' +
			'expressions the same way — braces instead of quotes:</p>',
			{ lang: 'js', code: 'const user = { name: "ada", admin: true };\nconst el = (\n  <p title={user.name}>\n    {user.name.toUpperCase()} has {user.admin ? "full" : "read-only"} access\n  </p>\n);\n// renders: <p title="ada">ADA has full access</p>' },
			'<p>One naming trap: in JSX the CSS-class attribute is spelled ' +
			'<code>className</code>, because props are JavaScript object keys ' +
			'and <code>class</code> is a reserved word. Writing ' +
			'<code>class=</code> anyway is instructive here: the attribute ' +
			'still <em>renders</em>, but React&#39;s dev build complains, and ' +
			'this runner captures that complaint into the output&#39;s console ' +
			'section as a <code>warn:</code> line. This lesson&#39;s check ' +
			'requires that line to be <em>absent</em> — the outline must show ' +
			'<code>class="…"</code> with no <code>warn:</code> below it, which ' +
			'only <code>className</code> achieves.</p>' +
			'<p>Now the starter&#39;s red pane: <code>App</code> tries to ' +
			'return an <code>&lt;h2&gt;</code> <em>and</em> a ' +
			'<code>&lt;p&gt;</code> as siblings, and the compiler refuses — ' +
			'<em>JSX expressions must have one parent element</em>. A function ' +
			'returns one value. When the siblings belong together but no ' +
			'wrapper element is semantically justified (an extra ' +
			'<code>&lt;div&gt;</code> would pollute the tree), use a ' +
			'<strong>fragment</strong>: <code>&lt;&gt;…&lt;/&gt;</code> groups ' +
			'children into one expression yet renders <em>no</em> element — ' +
			'the outline shows <code>h2</code> and <code>p</code> both at the ' +
			'left margin, wrapper-free.</p>',
			{ lang: 'js', code: '// One value, zero wrapper elements:\nreturn (\n  <>\n    <h2>Title</h2>\n    <p>Body</p>\n  </>\n);' },
			'<h3>Your job</h3>' +
			'<p>Fix the compile error with a fragment, then make the content ' +
			'earn its braces: give the <code>&lt;h2&gt;</code> a ' +
			'<code>className="deck"</code>, and have the <code>&lt;p&gt;</code> ' +
			'compute its text — render ' +
			'<code>&#39;react&#39;.toUpperCase()</code> and <code>3 * 7</code> ' +
			'in braces so the output reads <code>REACT scores 21</code>. ' +
			'Neither <code>REACT</code> nor <code>21</code> may appear as ' +
			'literals in your source; the braces do the work.</p>' +
			'<div class="tip">Keep the run warning-free. If a ' +
			'<code>-- console --</code> section with a <code>warn:</code> line ' +
			'appears under your outline, you spelled it <code>class=</code> — ' +
			'the markup rendered anyway, which is exactly why the warning, not ' +
			'the render, is what tells you.</div>',
		],

		task: 'Wrap the two roots in a fragment; className="deck" on the h2; the p computes "REACT scores 21" in braces.',

		starter: [
			'function App() {',
			'\t// Red pane on purpose: TWO adjacent roots. A function returns ONE',
			'\t// value — wrap both in a fragment <>…</>, then do the TODOs below.',
			'\t// TODO: className="deck" on the h2 (class= renders but warns).',
			'\t// TODO: make the p COMPUTE its text in braces:',
			"\t//       {'react'.toUpperCase()} scores {3 * 7}",
			'\treturn (',
			'\t\t<h2>Expressions</h2>',
			'\t\t<p>REACT scores 21</p>',
			'\t);',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// Pin: the class attribute rendered on the h2; the p's text (only
			// reachable by evaluating braces once the literals are gone); and
			// no captured React warning — class= would leave a warn: line.
			return stdout.includes('h2 class="deck"\n  "Expressions"') &&
				stdout.includes('p\n  "REACT scores 21"') &&
				flat.indexOf('warn:') === -1;
		},

		solution: [
			'function App() {',
			'\t// The fragment <>…</> makes the two siblings ONE expression while',
			'\t// rendering no element of its own — check the outline: h2 and p',
			'\t// both sit at the left margin, no wrapper between them and root.',
			'\treturn (',
			'\t\t<>',
			'\t\t\t{/* className, not class: props are JS object keys and',
			"\t\t\t   'class' is reserved. class= renders but logs warn:. */}",
			'\t\t\t<h2 className="deck">Expressions</h2>',
			'\t\t\t{/* Braces evaluate any expression in place — a method call',
			'\t\t\t   and arithmetic here. Statements (if, for) have no value',
			'\t\t\t   and cannot appear in braces. */}',
			"\t\t\t<p>{'react'.toUpperCase()} scores {3 * 7}</p>",
			'\t\t</>',
			'\t);',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<p>The fragment fixes the compile error without touching the ' +
			'rendered tree: <code>&lt;&gt;…&lt;/&gt;</code> compiles to ' +
			'<code>React.createElement(React.Fragment, …)</code> — one return ' +
			'value for the function, zero extra elements in the outline.</p>',
			'<p>The <code>&lt;p&gt;</code> shows braces doing real work: ' +
			'<code>{&#39;react&#39;.toUpperCase()}</code> and ' +
			'<code>{3 * 7}</code> evaluate at render time, and their results ' +
			'are stitched into one text node — <code>"REACT scores 21"</code> ' +
			'in the outline, though neither token appears literally in the ' +
			'source.</p>',
			'<p><code>className="deck"</code> renders as ' +
			'<code>class="deck"</code> in the HTML (the outline shows the real ' +
			'attribute name). Swap it back to <code>class=</code> and re-run: ' +
			'same outline, plus a <code>-- console --</code> section with a ' +
			'<code>warn:</code> line — the check fails on that line alone. ' +
			'Warnings are curriculum in this track, not noise.</p>',
		],
	});
})();
