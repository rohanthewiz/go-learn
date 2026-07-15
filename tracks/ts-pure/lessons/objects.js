/* Object Types — type aliases for object shapes, optional properties,
 * readonly, and excess property checking. The exercise makes the learner
 * EDIT THE TYPE first: the call site they must add only compiles once the
 * optional field exists on the alias, so the type is the load-bearing part.
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	T.lesson({
		id: 'objects',
		title: 'Object Types',
		nav: 'object types',
		category: 'Foundations',

		prose: [
			'<h2>Object Types</h2>' +
			'<p>Most real data is an object, and a <code>type</code> alias names its ' +
			'shape once so every function can share it:</p>',
			{ lang: 'ts', code: 'type User = {\n  readonly id: number;   // readonly: assignment after creation is an error\n  name: string;\n  active?: boolean;      // optional: may be absent (boolean | undefined)\n};' },
			'<p>Three modifiers do most of the work in practice:</p>' +
			'<ul>' +
			'<li><code>?</code> marks a property <strong>optional</strong> — objects ' +
			'may omit it, and reads produce <code>T | undefined</code> until you ' +
			'guard.</li>' +
			'<li><code>readonly</code> forbids assignment after construction: ' +
			'<code>u.id = 5</code> is error TS2540. It is shallow and compile-time ' +
			'only — the emitted JavaScript has no locks — but it documents and ' +
			'enforces intent across a whole codebase for free.</li>' +
			'<li>Object <em>literals</em> are checked <strong>exactly</strong>: ' +
			'passing <code>{ id: 1, name: "ada", admin: true }</code> where a ' +
			'<code>User</code> is expected is error TS2353 ("Object literal may only ' +
			'specify known properties"). Misspelled and stale fields die here ' +
			'instead of silently riding along.</li>' +
			'</ul>' +
			'<h3>Your job</h3>' +
			'<p>Give <code>User</code> an optional <code>active</code> field, make ' +
			'the second user explicitly inactive, and have <code>label</code> append ' +
			'<code> (inactive)</code> for it. Note the order of operations the ' +
			'checker imposes: until the field exists on the type, both the call site ' +
			'and the guard are compile errors.</p>' +
			'<div class="tip">Absent and explicitly-false are different: ' +
			'<code>u.active === false</code> is true only for the explicit case, ' +
			'while <code>!u.active</code> is true for both. APIs lean on that ' +
			'distinction constantly — "not yet answered" vs "answered no".</div>',
		],

		task: 'Add active?: boolean to User, mark bob inactive, and print "#2 bob (inactive)".',

		starter: [
			'type User = {',
			'  readonly id: number;  // try assigning to it — TS2540',
			'  name: string;',
			'  // TODO: add an optional active flag to the shape',
			'};',
			'',
			'function label(u: User): string {',
			'  // TODO: when u.active is exactly false, append " (inactive)"',
			'  return "#" + u.id + " " + u.name;',
			'}',
			'',
			'console.log(label({ id: 1, name: "ada" }));',
			'// TODO: pass active: false here — excess property checking rejects it',
			'// until the field is part of the User type above.',
			'console.log(label({ id: 2, name: "bob" }));',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('#1 ada') !== -1 &&
				flat.indexOf('#2 bob (inactive)') !== -1 &&
				flat.indexOf('#1 ada (inactive)') === -1;
		},

		solution: [
			'type User = {',
			'  readonly id: number;',
			'  name: string;',
			'  active?: boolean; // boolean | undefined at every read',
			'};',
			'',
			'function label(u: User): string {',
			'  // === false deliberately excludes undefined: a user who was never',
			'  // flagged either way is not "inactive", just unknown.',
			'  if (u.active === false) {',
			'    return "#" + u.id + " " + u.name + " (inactive)";',
			'  }',
			'  return "#" + u.id + " " + u.name;',
			'}',
			'',
			'console.log(label({ id: 1, name: "ada" }));',
			'console.log(label({ id: 2, name: "bob", active: false }));',
			'',
		].join('\n'),
	});
})();
