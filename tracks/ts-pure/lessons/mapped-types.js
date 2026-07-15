/* Mapped Types — [K in keyof T] loops at the type level; writing your own
 * Partial/Readonly demystifies the utility types from the previous lesson.
 * The exercise writes Nullable<T>: the draft object with body: null only
 * compiles once the mapped type exists, so the transformation is what
 * unlocks the required output.
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	T.lesson({
		id: 'mapped-types',
		title: 'Mapped Types',
		nav: 'mapped types',
		category: 'Type Transformation',

		prose: [
			'<h2>Mapped Types</h2>' +
			'<p>A mapped type is a <code>for</code> loop over an object type\'s ' +
			'keys: <code>[K in keyof T]</code> visits each key, and the right-hand ' +
			'side says what its type becomes. With it, the standard utilities stop ' +
			'being magic:</p>',
			{ lang: 'ts', code: '// These are (essentially) the real definitions from lib.d.ts:\ntype MyPartial<T> = { [K in keyof T]?: T[K] };            // add ? to every key\ntype MyReadonly<T> = { readonly [K in keyof T]: T[K] };    // add readonly\ntype Flags<T> = { [K in keyof T]: boolean };               // every value: boolean' },
			'<p>The pieces are all operators you already have: <code>keyof T</code> ' +
			'supplies the keys, <code>T[K]</code> reads the original type at each ' +
			'key, and modifiers (<code>?</code>, <code>readonly</code>) can be added ' +
			'— or removed with a <code>-</code> prefix, as in ' +
			'<code>-readonly</code> / <code>-?</code>, which is how ' +
			'<code>Required&lt;T&gt;</code> strips optionality.</p>' +
			'<p>Like every type-level construct, the transformation is erased: a ' +
			'mapped type generates no code, it only changes what the checker will ' +
			'accept. That makes them free to use and impossible to overuse at ' +
			'runtime.</p>' +
			'<h3>Your job</h3>' +
			'<p>Write <code>Nullable&lt;T&gt;</code>: same keys, each value ' +
			'<code>T[K] | null</code> — the classic shape of a form or draft where ' +
			'every field exists but may not be filled in yet. Then retype ' +
			'<code>draft</code> as <code>Nullable&lt;Post&gt;</code> with a ' +
			'<code>null</code> body: as plain <code>Post</code> that assignment is ' +
			'a type error, which is why the starter ships it fully filled in.</p>' +
			'<div class="tip">Beyond intermediate, the same bracket syntax grows ' +
			'key <em>remapping</em> — <code>[K in keyof T as `get${string & K}`]' +
			'</code> — which is how libraries conjure getter names from field ' +
			'names. File under "recognize it when you see it".</div>',
		],

		task: 'Define Nullable<T> with a mapped type, retype draft as Nullable<Post>, set body to null.',

		starter: [
			'type Post = { title: string; body: string };',
			'',
			'// TODO: Nullable<T> — every key kept, every value T[K] | null.',
			'',
			'// TODO: retype as Nullable<Post> and set body: null — the draft is',
			'// titled but unwritten. As a plain Post, null here cannot compile.',
			'const draft: Post = { title: "why types", body: "(all of it)" };',
			'',
			'for (const [field, value] of Object.entries(draft)) {',
			'  console.log(field, value === null ? "is empty" : "is set");',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('title is set') !== -1 &&
				flat.indexOf('body is empty') !== -1;
		},

		solution: [
			'type Post = { title: string; body: string };',
			'',
			'// [K in keyof T] visits "title" then "body"; T[K] | null widens each',
			'// value to allow null. Same skeleton as lib.d.ts\'s own Partial.',
			'type Nullable<T> = { [K in keyof T]: T[K] | null };',
			'',
			'// Nullable<Post> = { title: string | null; body: string | null } —',
			'// both fields must still be PRESENT (unlike Partial, nothing is',
			'// optional); they may just hold null.',
			'const draft: Nullable<Post> = { title: "why types", body: null };',
			'',
			'for (const [field, value] of Object.entries(draft)) {',
			'  console.log(field, value === null ? "is empty" : "is set");',
			'}',
			'',
		].join('\n'),
	});
})();
