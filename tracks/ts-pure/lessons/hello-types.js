/* Hello, Types — the annotation syntax, inference, and the core experience
 * of TypeScript: a real compiler rejecting a real mistake before anything
 * runs. This is the track's only "broken on arrival" starter that greets
 * the learner — the red pane is the first thing they must read, because
 * reading diagnostics is the actual skill being installed.
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	T.lesson({
		id: 'hello-types',
		title: 'Hello, Types',
		nav: 'hello, types',
		category: 'Foundations',
		starterError: true,

		prose: [
			'<h2>Hello, Types</h2>' +
			'<p>TypeScript is JavaScript plus a <strong>static type checker</strong>: ' +
			'you annotate what a value is allowed to be, the compiler proves your ' +
			'program respects that everywhere, and then it <em>erases</em> the ' +
			'annotations and hands plain JavaScript to the runtime. The annotation ' +
			'syntax is a colon after the name:</p>',
			{ lang: 'ts', code: 'let greeting: string = "hello";\nlet year: number = 2026;\nlet shipped: boolean = true;' },
			'<p>You will write far fewer annotations than you might expect, because ' +
			'TypeScript <strong>infers</strong> types from initializers. These two ' +
			'lines mean exactly the same thing:</p>',
			{ lang: 'ts', code: 'let city: string = "Osaka";\nlet town = "Kyoto";        // inferred as string — annotation unnecessary' },
			'<p>The payoff is what happens when code and types disagree. This editor ' +
			'runs the <em>actual</em> TypeScript compiler in strict mode, and a type ' +
			'error is fatal: the program does not run at all, and the diagnostic ' +
			'appears in the red pane with its <code>TS</code> error code — the same ' +
			'message <code>tsc</code> would print in CI.</p>' +
			'<h3>Your job</h3>' +
			'<p>The program on the right does not compile. Read the diagnostic — it ' +
			'names the line, what was expected, and what was found — and fix the ' +
			'<em>value</em> so it satisfies its declared type. (You could also ' +
			'"fix" it by weakening the type to <code>string</code>; resist that ' +
			'instinct. The annotation documents intent — a year is a number you ' +
			'can do arithmetic on.)</p>' +
			'<div class="tip">Everything in this track runs under <code>strict: true</code>. ' +
			'Strict mode is not an advanced setting — it is the default experience of ' +
			'every serious TypeScript codebase, and most of what this track teaches ' +
			'only works (or only errors) because of it.</div>',
		],

		task: 'Fix the type error so the program prints the greeting and the next year.',

		starter: [
			'// This file has one type error. Read the red pane below the editor,',
			'// then fix the VALUE (not the annotation) so the program compiles.',
			'',
			'let greeting: string = "hello, types";',
			'let year: number = "2026";',
			'',
			'// Types are erased at runtime — what runs is plain JavaScript.',
			'console.log(greeting);',
			'console.log("next year is", year + 1);',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('hello, types') !== -1 &&
				flat.indexOf('next year is 2027') !== -1;
		},

		solution: [
			'// The annotation said number; the value was the STRING "2026".',
			'// With quotes, year + 1 would have been "20261" — string concat.',
			'// The checker catches the mismatch before that bug can exist.',
			'',
			'let greeting: string = "hello, types";',
			'let year: number = 2026;',
			'',
			'// Types are erased at runtime — what runs is plain JavaScript.',
			'console.log(greeting);',
			'console.log("next year is", year + 1);',
			'',
		].join('\n'),
	});
})();
