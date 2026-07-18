/* styling — className composition and the style object, no bundler in
 * sight. Pedagogy: the starter builds the class string with concatenation
 * and a ternary chain, producing a stray "undefined" token (visible in the
 * outline) and a doubled space in the real DOM — it runs, it looks wrong.
 * The solution is a cls(...parts) filter/join helper plus a style={{...}}
 * object on a status chip; the check pins the exact clean class attr
 * (class="chip active" followed by style=, so no stray token can hide) and
 * the SERIALIZED style attribute (background-color:#eef;padding:4px 8px) —
 * outline-visible proof that React turns camelCase keys into real CSS.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'styling',
		title: 'Styling Without a Bundler',
		nav: 'Styling',
		category: 'Patterns',

		prose: [
			'<h2>Two knobs: className and style</h2>' +
			'<p>This sandbox has no bundler, so CSS-in-JS libraries and CSS ' +
			'modules are off the table — which is clarifying, because React ' +
			'itself only ever had two styling knobs. The first is ' +
			'<code>className</code>: a plain string of space-separated classes, ' +
			'usually <em>composed conditionally</em>. Concatenating it by hand ' +
			'breeds bugs (you will meet one in the starter); the idiomatic move ' +
			'is build-an-array, drop the falsy parts, join:</p>',
			{ lang: 'js', code: '// The filter/join pattern. false, undefined, and \'\' vanish,\n// so conditions read as `cond && \'name\'` with no else-branch.\nfunction cls(...parts) {\n\treturn parts.filter(Boolean).join(\' \');\n}\n\ncls(\'btn\', isPrimary && \'primary\', isBusy && \'busy\');\n// isPrimary=true, isBusy=false  ->  "btn primary"' },
			'<p>The second knob is the <code>style</code> prop — and it does ' +
			'<strong>not</strong> take a CSS string. It takes an ' +
			'<strong>object</strong> with camelCase property names, and React ' +
			'serializes it to real CSS at render time: ' +
			'<code>backgroundColor</code> becomes ' +
			'<code>background-color</code>, and bare numbers get ' +
			'<code>px</code> appended where CSS expects a length ' +
			'(<code>width: 120</code> → <code>width:120px</code>; unitless ' +
			'properties like <code>fontWeight</code> or <code>lineHeight</code> ' +
			'stay bare). You can watch the serialization happen: the outline ' +
			'prints the rendered <code>style="…"</code> attribute, camelCase ' +
			'gone, semicolon-joined.</p>',
			{ lang: 'js', code: '<div style={{ backgroundColor: \'#fee\', width: 120, fontWeight: 600 }} />\n// renders as:\n// div style="background-color:#fee;width:120px;font-weight:600"' },
			'<p>Which knob when? Classes for anything reusable, themeable, or ' +
			'pseudo-state-dependent (<code>:hover</code> and media queries are ' +
			'unreachable from inline styles); the <code>style</code> object for ' +
			'values that are <em>computed per render</em> — a progress bar&#39;s ' +
			'width, a color pulled from data. Inline styles also win specificity ' +
			'fights, which is exactly why they should be rare.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter builds <code>Chip</code>&#39;s class with string ' +
			'concatenation — run it and find the stray <code>undefined</code> ' +
			'class in the outline. Replace that with a ' +
			'<code>cls(...parts)</code> helper (filter <code>Boolean</code>, ' +
			'join with a space) so the active chip renders exactly ' +
			'<code>class="chip active"</code> and the inactive one ' +
			'<code>class="chip"</code>. Then give both chips a ' +
			'<code>style</code> object — ' +
			'<code>backgroundColor: \'#eef\'</code>, ' +
			'<code>padding: \'4px 8px\'</code> — and confirm the outline shows ' +
			'<code>style="background-color:#eef;padding:4px 8px"</code>.</p>' +
			'<div class="tip">The outline collapses runs of whitespace, so the ' +
			'starter&#39;s doubled space hides there — but it is real: inspect ' +
			'the live preview&#39;s DOM and the class attribute carries it. ' +
			'<code>undefined</code>, being a word, has nowhere to hide in ' +
			'either view.</div>',
		],

		task: 'Replace the concat-built class with a cls() filter/join helper and add a style object; outline must show class="chip active" and the serialized style attr.',

		starter: [
			'// Hand-rolled class string: a ternary chain plus concatenation.',
			'// Run it — the outline shows a stray "undefined" class on both',
			'// chips, and the real DOM (live preview) also carries a doubled',
			'// space. It runs. It is wrong. Every hand-concat grows these.',
			'// TODO: write cls(...parts) => parts.filter(Boolean).join(\' \'),',
			'// use it for className, and add a style object:',
			'//   { backgroundColor: \'#eef\', padding: \'4px 8px\' }',
			'function Chip({ label, active, tone }) {',
			'\tconst classes = \'chip \' + (active ? \'active\' : \'\') + \' \' + tone;',
			'\treturn <span className={classes}>{label}</span>;',
			'}',
			'',
			'function App() {',
			'\treturn (',
			'\t\t<main>',
			'\t\t\t<Chip label="build" active={true} />',
			'\t\t\t<Chip label="deploy" active={false} />',
			'\t\t</main>',
			'\t);',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// Exact attr text: class="chip active" immediately followed by
			// style= leaves no room for stray tokens or doubled spaces, and
			// the style value is the SERIALIZED form — camelCase gone.
			return stdout.includes('  span class="chip active" style="background-color:#eef;padding:4px 8px"\n    "build"') &&
				stdout.includes('  span class="chip" style="background-color:#eef;padding:4px 8px"\n    "deploy"') &&
				!flat.includes('undefined') &&
				!flat.includes('warn:');
		},

		solution: [
			'// filter(Boolean) drops false, undefined, null, and \'\' — so every',
			'// conditional part is just `cond && \'name\'`, and join(\' \') can',
			'// never emit doubled spaces or stray tokens. Three lines, reused',
			'// by every component in the app.',
			'function cls(...parts) {',
			'\treturn parts.filter(Boolean).join(\' \');',
			'}',
			'',
			'function Chip({ label, active }) {',
			'\t// style is an OBJECT: camelCase keys, values as strings (or',
			'\t// numbers, which get px where CSS takes a length). React',
			'\t// serializes it at render time — the outline\'s style="…" attr',
			'\t// is the proof: background-color, not backgroundColor.',
			'\tconst chipStyle = { backgroundColor: \'#eef\', padding: \'4px 8px\' };',
			'\treturn (',
			'\t\t<span className={cls(\'chip\', active && \'active\')} style={chipStyle}>',
			'\t\t\t{label}',
			'\t\t</span>',
			'\t);',
			'}',
			'',
			'function App() {',
			'\treturn (',
			'\t\t<main>',
			'\t\t\t<Chip label="build" active={true} />',
			'\t\t\t<Chip label="deploy" active={false} />',
			'\t\t</main>',
			'\t);',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<p><code>cls(\'chip\', active && \'active\')</code> evaluates to ' +
			'<code>[\'chip\', \'active\']</code> for the active chip and ' +
			'<code>[\'chip\', false]</code> for the inactive one; ' +
			'<code>filter(Boolean)</code> deletes the <code>false</code>, and ' +
			'<code>join(\' \')</code> emits exactly one space per boundary. ' +
			'That is why the check can pin the <em>exact</em> attribute text — ' +
			'the pattern is incapable of producing <code>undefined</code> or a ' +
			'doubled space, where the starter&#39;s concatenation produced both ' +
			'(the missing <code>tone</code> prop arrived as ' +
			'<code>undefined</code> and was stringified straight into the ' +
			'class).</p>',
			'<p>The <code>style</code> object never touches the DOM as an ' +
			'object: React serializes it during render, mapping ' +
			'<code>backgroundColor</code> to <code>background-color</code> and ' +
			'joining pairs with semicolons — the outline shows the finished ' +
			'<code>style="background-color:#eef;padding:4px 8px"</code>. Because ' +
			'it is a per-render JavaScript value, anything computed can flow in: ' +
			'<code>style={{ width: pct + \'%\' }}</code> on a progress bar ' +
			're-serializes on every render.</p>',
			'<p>Both chips share one style object here, which is fine — it is ' +
			'read, not mutated. The division of labor stands: classes for the ' +
			'stable vocabulary of your UI (and everything ' +
			'<code>:hover</code>-shaped), inline style for the handful of values ' +
			'only the running program knows.</p>',
		],
	});
})();
