/* lists-keys — .map from data to elements, and why React demands a key:
 * reconciliation matches children by identity, not position. The starter maps
 * three rows WITHOUT keys — it runs and renders fine, but the console section
 * captures React's dev warning ("warn: Each child in a list should have a
 * unique \"key\" prop…"), which IS the exhibit: the structure pane catches
 * what the browser console would. The check demands the warning gone plus a
 * ul > li > em outline with the three labels in order, reachable only by
 * restructuring the data to objects and keying by stable id.
 */
(function () {
	'use strict';

	GoLearnReact.lesson({
		id: 'lists-keys',
		title: 'Lists & Keys',
		nav: 'Lists & keys',
		category: 'Foundations',

		prose: [
			'<h2>From arrays to elements</h2>' +
			'<p>React has no loop syntax because it needs none: JSX braces take ' +
			'expressions, and <code>Array.prototype.map</code> is an expression ' +
			'that turns a data array into an element array. Drop that array into ' +
			'a parent and React renders each element in order. This is the single ' +
			'most common shape in real React code — data in, rows out:</p>',
			{ lang: 'js', code: 'const perms = [\n\t{ id: \'p1\', name: \'read\' },\n\t{ id: \'p2\', name: \'write\' },\n];\n\nfunction PermList() {\n\treturn (\n\t\t<ul>\n\t\t\t{perms.map(p => <li key={p.id}>{p.name}</li>)}\n\t\t</ul>\n\t);\n}' },
			'<p>That <code>key</code> prop is not decoration. On every re-render ' +
			'React must <em>reconcile</em> the new list against the old one — ' +
			'decide which rows are the same row moved, which are new, which are ' +
			'gone — so it can patch the DOM minimally and keep per-row state ' +
			'(input text, checkbox ticks, focus) attached to the right row. ' +
			'<code>key</code> is the identity it matches on. Without one React ' +
			'falls back to position and tells you so; run the starter and look ' +
			'under <code>-- console --</code>: the <code>warn:</code> line is the ' +
			'same warning a browser console would show, captured into the ' +
			'structure pane.</p>' +
			'<p><strong>Stable beats convenient.</strong> ' +
			'<code>map((item, i) =&gt; &lt;li key={i}&gt;</code> silences the ' +
			'warning but re-creates the bug the warning exists to prevent: an ' +
			'index <em>is</em> the position, so the identity lies the moment the ' +
			'list changes shape. Delete row one of three and every row after it ' +
			'inherits its predecessor&#39;s index — React thinks rows 0 and 1 ' +
			'"stayed", updates their text, and the checkbox you ticked on row two ' +
			'now sits beside row three&#39;s label. Index keys are only safe for ' +
			'lists that never reorder, insert, or delete; data ids are safe ' +
			'always, so reach for those first:</p>',
			{ lang: 'js', code: '// After deleting \'a\', index keys claim rows 0 and 1 "survived":\n// [\'a\', \'b\', \'c\']   →   [\'b\', \'c\']\n//   key=0 \'a\'             key=0 \'b\'  ← \'a\'s state now decorates \'b\'\n//   key=1 \'b\'             key=1 \'c\'\n//   key=2 \'c\'             (key=2 unmounted — \'c\'s state destroyed)\n//\n// Stable ids keep identity honest: key=\'b\' is \'b\' before and after.' },
			'<h3>Your job</h3>' +
			'<p>The starter maps three plain strings with no <code>key</code>. ' +
			'Promote the data to objects with a stable <code>id</code> and a ' +
			'<code>label</code>, key each row with <code>key={tool.id}</code>, and ' +
			'render each label inside an <code>&lt;em&gt;</code> nested in its ' +
			'<code>&lt;li&gt;</code> — keep <code>Trace</code>, ' +
			'<code>Bisect</code>, <code>Patch</code> in that order. The check ' +
			'wants the <code>ul &gt; li &gt; em</code> shape <em>and</em> a clean ' +
			'console: no <code>warn:</code> line anywhere.</p>' +
			'<div class="tip"><code>key</code> is consumed by React itself — ' +
			'notice it never appears as an attribute in the outline, and your ' +
			'component cannot read <code>props.key</code>. It exists purely on ' +
			'the reconciliation side of the fence. If a row component also needs ' +
			'the id, pass it again as a normal prop.</div>',
		],

		task: 'Key each mapped row with a stable data id (not the array index) and nest each label in an em — the warn: line must disappear.',

		starter: [
			'const tools = [\'Trace\', \'Bisect\', \'Patch\'];',
			'',
			'function App() {',
			'\t// Runs, renders, LOOKS fine — but read the console section below',
			'\t// the outline: the structure pane just caught what the browser',
			'\t// console would. React wants an identity per row.',
			'\treturn (',
			'\t\t<ul>',
			'\t\t\t{tools.map(tool => <li>{tool}</li>)}',
			'\t\t</ul>',
			'\t);',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes(
				'ul\n' +
				'  li\n' +
				'    em\n' +
				'      "Trace"\n' +
				'  li\n' +
				'    em\n' +
				'      "Bisect"\n' +
				'  li\n' +
				'    em\n' +
				'      "Patch"') &&
				!flat.includes('warn:');
		},

		solution: [
			'// Identity travels WITH the data: each row carries its own stable id,',
			'// so reordering / inserting / deleting never lies to reconciliation.',
			'const tools = [',
			'\t{ id: \'t-trace\', label: \'Trace\' },',
			'\t{ id: \'t-bisect\', label: \'Bisect\' },',
			'\t{ id: \'t-patch\', label: \'Patch\' },',
			'];',
			'',
			'function App() {',
			'\treturn (',
			'\t\t<ul>',
			'\t\t\t{tools.map(tool => (',
			'\t\t\t\t// key on the OUTERMOST mapped element — React consumes it;',
			'\t\t\t\t// it never reaches the DOM or the outline.',
			'\t\t\t\t<li key={tool.id}>',
			'\t\t\t\t\t<em>{tool.label}</em>',
			'\t\t\t\t</li>',
			'\t\t\t))}',
			'\t\t</ul>',
			'\t);',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<p>The data became objects so identity could live in the data: ' +
			'<code>{ id: \'t-trace\', label: \'Trace\' }</code>. The ' +
			'<code>.map</code> callback returns one <code>&lt;li&gt;</code> per ' +
			'object with <code>key={tool.id}</code> on the outermost element it ' +
			'returns — that placement matters: a key buried deeper (say on the ' +
			'<code>&lt;em&gt;</code>) would not satisfy reconciliation and the ' +
			'warning would stay.</p>',
			'<p>Compare stdout before and after: the rendered outline gained one ' +
			'<code>em</code> level, but the real change is the ' +
			'<code>warn:</code> line under <code>-- console --</code> being gone ' +
			'— and with it the whole console section, since nothing logs anymore. ' +
			'The fix is invisible in the markup precisely because ' +
			'<code>key</code> is for React, not the DOM.</p>',
			'<p>Why not <code>key={index}</code>? It compiles, it silences the ' +
			'warning, and it is wrong for any list that mutates: the index is the ' +
			'position, so after a deletion every later row is mis-identified and ' +
			'per-row state (inputs, checkboxes) sticks to the slot instead of the ' +
			'item. Stable ids make the cheap choice the correct one.</p>',
		],
	});
})();
