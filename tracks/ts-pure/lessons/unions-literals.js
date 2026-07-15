/* Unions & Literal Types — the "or" type, and literal types that shrink
 * string/number down to exact values. Together they replace loose string
 * arguments with closed sets the compiler can spell-check.
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	T.lesson({
		id: 'unions-literals',
		title: 'Unions & Literal Types',
		nav: 'unions & literals',
		category: 'Unions & Narrowing',

		prose: [
			'<h2>Unions &amp; Literal Types</h2>' +
			'<p>A <strong>union</strong> type says a value is one of several ' +
			'possibilities: <code>string | number</code> is "a string or a number". ' +
			'The pipe reads as <em>or</em>, and you can only use the members that ' +
			'every possibility supports (more on escaping that in the next ' +
			'lesson).</p>' +
			'<p>The real workhorse is unions of <strong>literal types</strong>. A ' +
			'literal type is a single exact value used as a type — <code>"small"' +
			'</code> is the type whose only inhabitant is that string. Union a few ' +
			'together and you have an enum-without-the-enum:</p>',
			{ lang: 'ts', code: 'type Size = "small" | "medium" | "large";\n\nlet cup: Size = "medium";   // ok\ncup = "jumbo";              // error TS2322: \'"jumbo"\' is not assignable to Size' },
			'<p>Every call site is now spell-checked, autocomplete knows the three ' +
			'valid values, and renaming one is a compiler-guided refactor instead of ' +
			'a codebase-wide grep. This is the single most idiomatic pattern in ' +
			'TypeScript APIs — you will see <code>"GET" | "POST"</code>, ' +
			'<code>"asc" | "desc"</code>, and friends everywhere.</p>' +
			'<p>A <code>switch</code> over a union works exactly as you would hope: ' +
			'inside <code>case "small":</code> the checker knows <code>size</code> ' +
			'is precisely <code>"small"</code>.</p>' +
			'<h3>Your job</h3>' +
			'<p>The menu below forgot large drinks: <code>price</code> falls through ' +
			'to <code>0</code> for them. Handle <code>"large"</code> (7 coins) as a ' +
			'proper <code>case</code> and delete the fallback — every member of the ' +
			'union deserves a real answer.</p>' +
			'<div class="tip">After the switch handles all three sizes, the trailing ' +
			'<code>return 0</code> is unreachable — TypeScript knows the function ' +
			'always returned inside the switch. The next two lessons turn that ' +
			'"checker knows what is left over" ability into a tool.</div>',
		],

		task: 'Handle "large" (7 coins) in the switch so no size falls through to 0.',

		starter: [
			'type Size = "small" | "medium" | "large";',
			'',
			'function price(size: Size): number {',
			'  switch (size) {',
			'    case "small": return 3;',
			'    case "medium": return 5;',
			'    // TODO: case "large" costs 7 — try misspelling it "lorge" and',
			'    // watch TS2678 reject a case that is not in the union.',
			'  }',
			'  return 0;',
			'}',
			'',
			'const order: Size[] = ["small", "large"];',
			'for (const s of order) {',
			'  console.log(s, "costs", price(s));',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('small costs 3') !== -1 &&
				flat.indexOf('large costs 7') !== -1;
		},

		solution: [
			'type Size = "small" | "medium" | "large";',
			'',
			'function price(size: Size): number {',
			'  // All three members handled: the switch is exhaustive, so the',
			'  // function needs no fallback return — and a future fourth size',
			'  // will surface here as a missing-return error, not a silent 0.',
			'  switch (size) {',
			'    case "small": return 3;',
			'    case "medium": return 5;',
			'    case "large": return 7;',
			'  }',
			'}',
			'',
			'const order: Size[] = ["small", "large"];',
			'for (const s of order) {',
			'  console.log(s, "costs", price(s));',
			'}',
			'',
		].join('\n'),
	});
})();
