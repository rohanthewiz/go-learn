/* Typing Functions — parameter and return annotations, optional and default
 * parameters, and the first taste of narrowing: an optional parameter's type
 * is `T | undefined`, and strict mode makes you deal with that before using
 * it. The exercise is designed so the checker forces the undefined-guard.
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	T.lesson({
		id: 'functions',
		title: 'Typing Functions',
		nav: 'functions',
		category: 'Foundations',

		prose: [
			'<h2>Typing Functions</h2>' +
			'<p>Functions are where types earn their keep: annotate the parameters ' +
			'and (usually) the return, and every call site is checked for you — ' +
			'wrong argument types, wrong argument <em>counts</em>, and misuse of the ' +
			'result all become compile errors:</p>',
			{ lang: 'ts', code: 'function repeat(word: string, times: number): string {\n  return word.repeat(times);\n}\n\nrepeat("go", 3);      // ok\nrepeat("go");         // error TS2554: Expected 2 arguments, but got 1\nrepeat(3, "go");      // error TS2345: number is not assignable to string' },
			'<p>Unlike JavaScript, an omitted argument is an error — unless you ' +
			'declare the parameter <strong>optional</strong> with <code>?</code>, or ' +
			'give it a <strong>default</strong>:</p>',
			{ lang: 'ts', code: 'function greet(name: string, punct?: string) { /* punct: string | undefined */ }\nfunction shout(name: string, punct = "!") { /* punct: string — never undefined */ }' },
			'<p>Read the comment on <code>greet</code> carefully: inside the body, ' +
			'<code>punct</code> is <code>string | undefined</code>. Strict mode will ' +
			'not let you call string methods on it until you have handled the ' +
			'<code>undefined</code> case — a check like <code>if (punct !== ' +
			'undefined)</code> <em>narrows</em> the type within that branch. This is ' +
			'the single most common everyday interaction with the checker, and a ' +
			'preview of the whole Narrowing section.</p>' +
			'<h3>Your job</h3>' +
			'<p>Complete <code>describe</code> so a person with a role prints as ' +
			'<code>name (role)</code> and one without prints just the name. If you ' +
			'try to concatenate <code>role</code> without guarding it first, the ' +
			'checker will stop you — that is the lesson working as intended.</p>' +
			'<div class="tip">A function that returns nothing has return type ' +
			'<code>void</code>. You rarely write it — inference handles it — but you ' +
			'will see it constantly in signatures and callbacks.</div>',
		],

		task: 'Make describe return "name (role)" when a role is given, and just the name otherwise.',

		starter: [
			'// role is OPTIONAL: inside the body its type is string | undefined.',
			'function describe(name: string, role?: string): string {',
			'  // TODO: when role is given, return name + " (" + role + ")".',
			'  // Note the checker will reject using role until you rule out undefined.',
			'  return name;',
			'}',
			'',
			'console.log(describe("ada"));',
			'console.log(describe("grace", "admiral"));',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('grace (admiral)') !== -1 &&
				flat.indexOf('ada') !== -1;
		},

		solution: [
			'function describe(name: string, role?: string): string {',
			'  // The comparison NARROWS: inside this branch role is plain string,',
			'  // so concatenation type-checks. Outside it, role is still',
			'  // string | undefined and the checker would refuse the +.',
			'  if (role !== undefined) {',
			'    return name + " (" + role + ")";',
			'  }',
			'  return name;',
			'}',
			'',
			'console.log(describe("ada"));',
			'console.log(describe("grace", "admiral"));',
			'',
		].join('\n'),
	});
})();
