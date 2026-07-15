/* Utility Types — Partial, Pick, Omit, Record, ReturnType: the built-in
 * type transformers. The exercise converts an update function to take a
 * Partial patch; the check pins the printed patch to JUST the changed
 * field, which is only expressible at the call site once the parameter
 * actually is Partial<User>.
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	T.lesson({
		id: 'utility-types',
		title: 'Utility Types',
		nav: 'utility types',
		category: 'Type Transformation',

		prose: [
			'<h2>Utility Types</h2>' +
			'<p>TypeScript ships a standard library of <em>type</em> functions — ' +
			'generics that take a type and produce a transformed one. Five cover ' +
			'most daily work:</p>',
			{ lang: 'ts', code: 'type User = { id: number; name: string; email: string };\n\ntype Draft = Partial<User>;          // every field optional\ntype Card = Pick<User, "id" | "name">;   // just these fields\ntype Public = Omit<User, "email">;       // everything but these\ntype Tally = Record<"yes" | "no", number>; // { yes: number; no: number }\ntype R = ReturnType<typeof makeUser>;    // what a function returns' },
			'<p>They earn their keep by <em>deriving</em> types from one source of ' +
			'truth instead of duplicating them. When <code>User</code> gains a ' +
			'field, <code>Partial&lt;User&gt;</code>, <code>Pick</code>, and ' +
			'<code>Omit</code> all update themselves; hand-written copies would ' +
			'drift silently.</p>' +
			'<p>The signature pattern this lesson installs — <em>the update ' +
			'function</em> — appears in every state store and API client:</p>',
			{ lang: 'ts', code: 'function updateUser(u: User, patch: Partial<User>): User {\n  return { ...u, ...patch };   // spread: patch fields win, rest carried over\n}' },
			'<p>Callers pass only what changed; the checker still rejects unknown ' +
			'fields and wrong value types inside the patch. Compare the ' +
			'alternative — <code>patch: User</code> — which forces every caller to ' +
			'restate the whole object just to change an email.</p>' +
			'<h3>Your job</h3>' +
			'<p>That inferior alternative is exactly what the starter does. Loosen ' +
			'the patch parameter to <code>Partial&lt;User&gt;</code> and slim the ' +
			'call site down to only the field that changed — the printed patch ' +
			'should shrink to just the email.</p>' +
			'<div class="tip">These utilities are not compiler magic — each is a ' +
			'one-line mapped or conditional type you could write yourself. The next ' +
			'lesson does precisely that.</div>',
		],

		task: 'Make patch a Partial<User> and pass only the changed email at the call site.',

		starter: [
			'type User = { id: number; name: string; email: string };',
			'',
			'// TODO: patch should be Partial<User> — callers send only changes.',
			'function updateUser(u: User, patch: User): User {',
			'  console.log("patch", JSON.stringify(patch));',
			'  return { ...u, ...patch };',
			'}',
			'',
			'const ada: User = { id: 1, name: "ada", email: "ada@old.dev" };',
			'',
			'// TODO: once patch is Partial, trim this to just the new email —',
			'// today the type forces restating the entire user.',
			'const next = updateUser(ada, { id: 1, name: "ada", email: "ada@new.dev" });',
			'console.log("updated", JSON.stringify(next));',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('patch {"email":"ada@new.dev"}') !== -1 &&
				flat.indexOf('"name":"ada","email":"ada@new.dev"') !== -1;
		},

		solution: [
			'type User = { id: number; name: string; email: string };',
			'',
			'// Partial<User> = { id?: number; name?: string; email?: string }.',
			'// Unknown fields and wrong types in a patch still fail to compile;',
			'// only the obligation to restate everything is gone.',
			'function updateUser(u: User, patch: Partial<User>): User {',
			'  console.log("patch", JSON.stringify(patch));',
			'  return { ...u, ...patch };',
			'}',
			'',
			'const ada: User = { id: 1, name: "ada", email: "ada@old.dev" };',
			'',
			'const next = updateUser(ada, { email: "ada@new.dev" });',
			'console.log("updated", JSON.stringify(next));',
			'',
		].join('\n'),
	});
})();
