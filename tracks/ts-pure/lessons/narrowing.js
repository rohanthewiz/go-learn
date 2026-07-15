/* Narrowing — typeof / truthiness / equality / `in` guards, and control-flow
 * analysis. Starter intentionally fails to compile: calling a string method
 * on string|number is THE canonical narrowing error, and fixing it teaches
 * that plain if-statements are the type system's proof language.
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	T.lesson({
		id: 'narrowing',
		title: 'Narrowing',
		nav: 'narrowing',
		category: 'Unions & Narrowing',
		starterError: true,

		prose: [
			'<h2>Narrowing</h2>' +
			'<p>A union only lets you use what <em>every</em> member supports. To use ' +
			'member-specific parts you must <strong>narrow</strong>: write an ' +
			'ordinary runtime check, and the checker reads it as a proof, shrinking ' +
			'the type inside that branch. No casts, no new syntax — control flow ' +
			'<em>is</em> the mechanism:</p>',
			{ lang: 'ts', code: 'function pad(v: string | number): string {\n  if (typeof v === "string") {\n    return v.trim();     // here v: string\n  }\n  return v.toFixed(2);   // and here v: number — string was returned away\n}' },
			'<p>Note the second half: after the <code>if</code> returns, TypeScript ' +
			'knows only <code>number</code> can reach the last line. The guards the ' +
			'checker understands are the ones you already write:</p>' +
			'<ul>' +
			'<li><code>typeof v === "string"</code> — for primitives</li>' +
			'<li><code>v === undefined</code>, <code>v === null</code>, or plain ' +
			'truthiness <code>if (v)</code> — for optionals</li>' +
			'<li><code>"fieldName" in obj</code> — discriminating object shapes by ' +
			'their properties</li>' +
			'<li><code>v instanceof Date</code> — for class instances</li>' +
			'</ul>' +
			'<h3>Your job</h3>' +
			'<p>The starter calls <code>toUpperCase</code> on a ' +
			'<code>string | number</code>, and the compiler refuses — numbers have ' +
			'no such method. Narrow with <code>typeof</code>: uppercase strings, and ' +
			'give numbers two decimals with <code>toFixed(2)</code>.</p>' +
			'<div class="tip">This is why <code>any</code> is dangerous: it turns ' +
			'off narrowing (and every other check) for that value. When you truly ' +
			'do not know a type, prefer <code>unknown</code> — it forces you to ' +
			'narrow before use instead of letting anything through.</div>',
		],

		task: 'Narrow v with typeof: strings print uppercased, numbers print with toFixed(2).',

		starter: [
			'function format(v: string | number): string {',
			'  // The red pane: toUpperCase does not exist on string | number,',
			'  // because it does not exist on number. Prove which one v is first.',
			'  return v.toUpperCase();',
			'}',
			'',
			'console.log(format("go"));',
			'console.log(format(3.14159));',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('GO') !== -1 &&
				flat.indexOf('3.14') !== -1 &&
				flat.indexOf('3.14159') === -1;
		},

		solution: [
			'function format(v: string | number): string {',
			'  // typeof narrows: v is string inside the branch, and — because',
			'  // the branch returns — number after it. The checker follows your',
			'  // control flow line by line; no annotations needed.',
			'  if (typeof v === "string") {',
			'    return v.toUpperCase();',
			'  }',
			'  return v.toFixed(2);',
			'}',
			'',
			'console.log(format("go"));',
			'console.log(format(3.14159));',
			'',
		].join('\n'),
	});
})();
