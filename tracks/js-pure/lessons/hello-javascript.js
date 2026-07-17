/* Hello, JavaScript — values, let vs const (and why var is history),
 * dynamic typing via typeof, and template literals vs concatenation. The
 * exercise upgrades a clumsy concatenated greeting to a template literal
 * and const bindings, then prints typeof for two values; the check pins
 * the interpolated greeting (em dash — unreachable by the starter's
 * hyphen concatenation) plus the two typeof lines.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	J.lesson({
		id: 'hello-javascript',
		title: 'Hello, JavaScript',
		nav: 'hello, javascript',
		category: 'Foundations',

		prose: [
			'<h2>Values and bindings</h2>' +
			'<p>Everything a JavaScript program computes is a <em>value</em>: ' +
			'the number <code>3</code>, the string <code>"Ada"</code>, the ' +
			'boolean <code>true</code>, an object, a function. A ' +
			'<em>variable</em> is just a name bound to a value — and modern JS ' +
			'gives you two ways to make that binding:</p>',
			{ lang: 'js', code: 'const name = "Ada";   // binding never changes — the default choice\nlet lessons = 0;      // binding WILL be reassigned\nlessons = 3;          // fine: let allows it\n// name = "Grace";    // TypeError: Assignment to constant variable' },
			'<p>Reach for <code>const</code> first and downgrade to ' +
			'<code>let</code> only when you actually reassign. That is not ' +
			'stylistic fussiness: a reader who sees <code>const</code> can stop ' +
			'tracking that name — its value is settled for the rest of the ' +
			'scope. Note <code>const</code> freezes the <em>binding</em>, not ' +
			'the value: a <code>const</code> array can still be pushed to.</p>' +
			'<p>You will also meet <code>var</code> in older code. It is avoided ' +
			'today because of how it scopes: <code>var</code> ignores block ' +
			'braces (it is <em>function</em>-scoped, so a <code>var</code> ' +
			'inside an <code>if</code> leaks out of it) and it is ' +
			'<em>hoisted</em> — the declaration is silently moved to the top of ' +
			'the function, so you can read the variable before its line runs ' +
			'and get <code>undefined</code> instead of an error. ' +
			'<code>let</code>/<code>const</code> fixed both: block scope, and a ' +
			'ReferenceError if touched before the declaration.</p>',
			'<h2>Dynamic typing and typeof</h2>' +
			'<p>JavaScript is <em>dynamically typed</em>: the value carries the ' +
			'type, not the variable. The same <code>let</code> could hold a ' +
			'number now and a string later (usually a bad idea — but legal). ' +
			'The <code>typeof</code> operator asks a value what it is at ' +
			'runtime and answers with a string:</p>',
			{ lang: 'js', code: 'typeof "Ada"      // "string"\ntypeof 3          // "number"\ntypeof true       // "boolean"\ntypeof undefined  // "undefined"' },
			'<h2>Template literals</h2>' +
			'<p>Building strings with <code>+</code> works but reads badly and ' +
			'invites bugs (a stray space, a number silently glued to a string). ' +
			'Backtick <em>template literals</em> interpolate any expression ' +
			'with <code>${...}</code> and may span multiple lines:</p>',
			{ lang: 'js', code: 'const name = "Ada", lessons = 3;\nconsole.log("Hello, " + name + " - " + lessons + " lessons in"); // clumsy\nconsole.log(`Hello, ${name} — ${lessons} lessons in`);           // reads like the sentence' },
			'<h3>Your job</h3>' +
			'<p>The starter greets with clumsy concatenation and declares its ' +
			'never-reassigned bindings with <code>let</code>. Change both ' +
			'declarations to <code>const</code>, replace the concatenation with ' +
			'one template literal printing exactly ' +
			'<code>Hello, Ada — 3 lessons in</code> (note the em dash ' +
			'<code>—</code>), then add two <code>typeof</code> report lines: ' +
			'<code>name is a string</code> and <code>lessons is a number</code>.</p>' +
			'<div class="tip">Interpolate <code>typeof</code> directly: ' +
			'<code>`name is a ${typeof name}`</code> — <code>typeof</code> is ' +
			'an operator, not a function, so no parentheses are needed.</div>',
		],

		task: 'Switch the bindings to const, greet via one template literal, and print typeof for both values.',

		starter: [
			'// TODO 1: neither binding is ever reassigned — declare both with const.',
			"let name = 'Ada';",
			'let lessons = 3;',
			'',
			'// TODO 2: replace this concatenation with ONE template literal that',
			'// prints exactly:  Hello, Ada — 3 lessons in   (em dash, not hyphen)',
			"console.log('Hello, ' + name + ' - ' + lessons + ' lessons in');",
			'',
			'// TODO 3: using typeof inside template literals, print exactly:',
			'//   name is a string',
			'//   lessons is a number',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('Hello, Ada — 3 lessons in') !== -1 &&
				flat.indexOf('name is a string') !== -1 &&
				flat.indexOf('lessons is a number') !== -1;
		},

		solution: [
			'// const: these bindings never change, so say so — accidental',
			'// reassignment becomes a loud TypeError instead of a silent bug.',
			"const name = 'Ada';",
			'const lessons = 3;',
			'',
			'// One template literal: the code reads like the sentence it prints,',
			'// and interpolation handles the number without manual + gluing.',
			'console.log(`Hello, ${name} — ${lessons} lessons in`);',
			'',
			'// typeof reports the type of the VALUE at runtime — dynamic typing',
			'// means the value carries the type, the variable is just a name.',
			'console.log(`name is a ${typeof name}`);',
			'console.log(`lessons is a ${typeof lessons}`);',
			'',
		].join('\n'),
	});
})();
