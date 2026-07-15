/* keyof & Indexed Access — the type-level operators (keyof, typeof, T[K])
 * and the classic pluck signature that combines them. The exercise types an
 * any-based helper properly; the check requires DELETING a bogus call that
 * only the correctly-typed version rejects, so "it happens to run" isn't
 * enough — the type has to do its job.
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	T.lesson({
		id: 'keyof-indexed',
		title: 'keyof & Indexed Access',
		nav: 'keyof & T[K]',
		category: 'Generics',

		prose: [
			'<h2>keyof &amp; Indexed Access</h2>' +
			'<p>Types have operators too. Three of them unlock most of intermediate ' +
			'TypeScript:</p>',
			{ lang: 'ts', code: 'type User = { name: string; age: number };\n\ntype Key = keyof User;        // "name" | "age" — the keys, as a literal union\ntype Age = User["age"];       // number — indexed access: the type AT a key\n\nconst u = { name: "ada", age: 36 };\ntype U = typeof u;            // the type OF a value, lifted for reuse' },
			'<p>(<code>typeof</code> in a type position is the type-level one — ' +
			'distinct from the runtime <code>typeof</code> string you narrowed with ' +
			'earlier.)</p>' +
			'<p>Their power move is combining with generics. This signature is ' +
			'worth memorizing — it appears in every data-access layer, ORM, and ' +
			'form library you will ever read:</p>',
			{ lang: 'ts', code: 'function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {\n  return obj[key];\n}' },
			'<p>Read it slowly: <code>K</code> is constrained to the keys of ' +
			'<code>T</code>, so a misspelled key is a compile error; the return type ' +
			'<code>T[K]</code> is the type at that exact key, so ' +
			'<code>pluck(u, "age")</code> is a <code>number</code> and ' +
			'<code>pluck(u, "name")</code> is a <code>string</code> — from one ' +
			'implementation.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter\'s <code>pluck</code> is typed with <code>any</code>, ' +
			'which is why the nonsense call at the bottom sails through and prints ' +
			'<code>undefined</code>. Give it the real signature, then delete the ' +
			'nonsense call — with proper types it no longer compiles, which is the ' +
			'entire point.</p>' +
			'<div class="tip">This is the honest test of a good type: not "does ' +
			'correct code compile" but "does <em>incorrect</em> code fail". ' +
			'<code>any</code> passes the first test and flunks the second.</div>',
		],

		task: 'Type pluck as <T, K extends keyof T>(obj: T, key: K): T[K], then remove the bogus call it now rejects.',

		starter: [
			'type User = { name: string; age: number };',
			'',
			'// TODO: replace the any-typing with the real signature:',
			'//   pluck<T, K extends keyof T>(obj: T, key: K): T[K]',
			'function pluck(obj: any, key: string): any {',
			'  return obj[key];',
			'}',
			'',
			'const user: User = { name: "ada", age: 36 };',
			'',
			'console.log("name", pluck(user, "name"));',
			'console.log("age", pluck(user, "age"));',
			'',
			'// TODO: delete — "nope" is not a key of User. With any it "works"',
			'// and prints undefined; with the real signature it is TS2345.',
			'console.log("oops", pluck(user, "nope"));',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('name ada') !== -1 &&
				flat.indexOf('age 36') !== -1 &&
				flat.indexOf('undefined') === -1;
		},

		solution: [
			'type User = { name: string; age: number };',
			'',
			'// K extends keyof T: the key must exist on T. T[K]: the return is',
			'// the type at that key — string for "name", number for "age" —',
			'// all checked per call site from this one implementation.',
			'function pluck<T, K extends keyof T>(obj: T, key: K): T[K] {',
			'  return obj[key];',
			'}',
			'',
			'const user: User = { name: "ada", age: 36 };',
			'',
			'console.log("name", pluck(user, "name"));',
			'console.log("age", pluck(user, "age"));',
			'',
		].join('\n'),
	});
})();
