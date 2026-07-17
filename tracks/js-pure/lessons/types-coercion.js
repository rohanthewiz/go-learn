/* Types & Coercion — the 7 primitives, typeof's famous null bug, why ==
 * coerces and === does not, the exact falsy list, and NaN's self-inequality
 * with Number.isNaN vs the coercing global isNaN. The exercise is a
 * truth-table printer: the starter shows only the treacherous == / global
 * isNaN rows; the check pins the strict rows (0 === "" -> false,
 * NaN === NaN -> false), Number.isNaN("abc") -> false, a bare NaN printed
 * via Number("abc") (fmt prints top-level numbers via String, so NaN is
 * faithful — never nested in an object), and an 8-of-8 falsy audit count.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	J.lesson({
		id: 'types-coercion',
		title: 'Types & Coercion',
		nav: 'types & coercion',
		category: 'Foundations',

		prose: [
			'<h2>Seven primitives, one object</h2>' +
			'<p>Every JavaScript value is one of seven <em>primitives</em> — ' +
			'<code>string</code>, <code>number</code>, <code>boolean</code>, ' +
			'<code>undefined</code>, <code>null</code>, <code>symbol</code>, ' +
			'<code>bigint</code> — or an <code>object</code> (arrays and ' +
			'functions included). <code>typeof</code> reports the category, ' +
			'with one legendary exception: <code>typeof null</code> answers ' +
			'<code>"object"</code>. That is a bug from the very first 1995 ' +
			'engine (null\'s type tag collided with the object tag), and it can ' +
			'never be fixed — too much of the web now depends on it. Test null ' +
			'with <code>x === null</code>, never with <code>typeof</code>.</p>',
			'<h2>Coercion and the two equalities</h2>' +
			'<p>JavaScript happily converts values between types on its own — ' +
			'<em>implicit coercion</em>. Loose equality <code>==</code> is ' +
			'where that bites hardest: before comparing, it coerces both sides ' +
			'toward numbers by an arcane rulebook, so <code>0 == ""</code> is ' +
			'true (empty string becomes <code>0</code>) and ' +
			'<code>"1" == 1</code> is true. Strict equality <code>===</code> ' +
			'refuses to coerce: if the types differ, the answer is ' +
			'<code>false</code>, end of story. That predictability is why ' +
			'modern style is <code>===</code> everywhere.</p>',
			{ lang: 'js', code: '0 == ""        // true  — "" coerced to the number 0\n"1" == 1       // true  — "1" coerced to the number 1\n0 === ""       // false — number vs string: types differ, no coercion\n"1" === 1      // false — same reason\nNumber("")     // 0     — the coercion == did behind your back' },
			'<svg class="dg" viewBox="0 0 520 130" role="img" aria-label="Loose equality coerces the empty string to the number 0 and answers true; strict equality sees the types differ and answers false without coercing">' +
			'<defs><marker id="dgArrowJSTC" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--accent)"/></marker></defs>' +
			'<text x="16" y="42" fill="var(--accent)" font-size="14" font-family="monospace">0 == ""</text>' +
			'<line x1="100" y1="37" x2="180" y2="37" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowJSTC)"/>' +
			'<text x="190" y="42" class="lbl" font-size="12">coerce: Number("") is 0, so 0 == 0</text>' +
			'<line x1="420" y1="37" x2="460" y2="37" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowJSTC)"/>' +
			'<text x="468" y="42" fill="var(--ok)" font-size="14" font-family="monospace">true</text>' +
			'<text x="16" y="97" fill="var(--accent)" font-size="14" font-family="monospace">0 === ""</text>' +
			'<line x1="100" y1="92" x2="180" y2="92" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowJSTC)"/>' +
			'<text x="190" y="97" class="lbl" font-size="12">types differ (number vs string) — stop</text>' +
			'<line x1="420" y1="92" x2="460" y2="92" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowJSTC)"/>' +
			'<text x="468" y="97" fill="var(--ok)" font-size="14" font-family="monospace">false</text>' +
			'</svg>',
			'<h2>Truthiness — the complete falsy list</h2>' +
			'<p>Where a boolean is expected (<code>if</code>, <code>!</code>, ' +
			'<code>&amp;&amp;</code>), every value coerces to true or false. ' +
			'The falsy list is short and exact — memorize it and everything ' +
			'else is truthy: <code>false</code>, <code>0</code>, ' +
			'<code>-0</code>, <code>0n</code> (bigint zero), <code>""</code>, ' +
			'<code>null</code>, <code>undefined</code>, <code>NaN</code>. ' +
			'Beware the classics that are <em>truthy</em>: <code>"0"</code>, ' +
			'<code>"false"</code>, <code>[]</code>, <code>{}</code>.</p>',
			'<h2>NaN, the unequal number</h2>' +
			'<p><code>NaN</code> ("not a number" — yet ' +
			'<code>typeof NaN</code> is <code>"number"</code>) is the result ' +
			'of a failed numeric operation, and by IEEE 754 decree it is not ' +
			'equal to anything, <em>including itself</em>: ' +
			'<code>NaN === NaN</code> is false. So you cannot test for it with ' +
			'equality. The global <code>isNaN()</code> is a trap too — it ' +
			'coerces its argument first, so <code>isNaN("abc")</code> is true ' +
			'even though <code>"abc"</code> is a string, not <code>NaN</code>. ' +
			'ES2015\'s <code>Number.isNaN()</code> fixes it: no coercion, true ' +
			'only for the actual value <code>NaN</code>.</p>',
			{ lang: 'js', code: 'NaN === NaN            // false — unequal even to itself\nisNaN("abc")           // true  — coerces "abc" first: Number("abc") is NaN\nNumber.isNaN("abc")    // false — a string is simply not NaN\nNumber.isNaN(Number("abc"))  // true — the honest test\n// Explicit conversion beats implicit: Number(x), String(x), Boolean(x)' },
			'<h3>Your job</h3>' +
			'<p>The starter prints a comparison table using only the ' +
			'treacherous tools. Complete it: add the strict rows ' +
			'<code>0 === ""</code>, <code>"1" === 1</code> and ' +
			'<code>NaN === NaN</code>; add a <code>Number.isNaN("abc")</code> ' +
			'row next to the global <code>isNaN</code> one; then finish the ' +
			'falsy audit so it counts (via <code>Boolean()</code> or ' +
			'<code>!</code>) how many of the 8 listed values are falsy and ' +
			'prints <code>falsy values confirmed: 8 of 8</code>.</p>' +
			'<div class="tip">The <code>row()</code> helper passes the result ' +
			'to <code>console.log</code> as a raw value — this runner prints ' +
			'top-level numbers via <code>String()</code>, so the ' +
			'<code>Number("abc")</code> row shows a faithful bare ' +
			'<code>NaN</code>. (Inside an object it would print as ' +
			'<code>null</code> — JSON has no NaN.)</div>',
		],

		task: 'Add the === rows and Number.isNaN row to the table, then complete the falsy audit.',

		starter: [
			'// A tiny truth-table printer: expression label -> actual result.',
			'function row(label, result) {',
			"  console.log(label, '->', result);",
			'}',
			'',
			"row('0 == \"\"', 0 == '');       // loose: coerces, lies",
			'row(\'"1" == 1\', \'1\' == 1);',
			'// TODO 1: add the strict rows — same operands, === instead:',
			'//   0 === ""   and   "1" === 1   and   NaN === NaN',
			'',
			"row('isNaN(\"abc\")', isNaN('abc'));  // global isNaN coerces first!",
			'// TODO 2: add the non-coercing check: Number.isNaN("abc")',
			'',
			"row('Number(\"abc\")', Number('abc'));  // explicit conversion -> bare NaN",
			'',
			'// TODO 3: the falsy audit — count how many of these 8 values are',
			'// falsy and print exactly:  falsy values confirmed: 8 of 8',
			"const falsies = [false, 0, -0, 0n, '', null, undefined, NaN];",
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('0 == "" -> true') !== -1 &&
				flat.indexOf('0 === "" -> false') !== -1 &&
				flat.indexOf('"1" === 1 -> false') !== -1 &&
				flat.indexOf('NaN === NaN -> false') !== -1 &&
				flat.indexOf('isNaN("abc") -> true') !== -1 &&
				flat.indexOf('Number.isNaN("abc") -> false') !== -1 &&
				flat.indexOf('Number("abc") -> NaN') !== -1 &&
				flat.indexOf('falsy values confirmed: 8 of 8') !== -1;
		},

		solution: [
			'// A tiny truth-table printer: expression label -> actual result.',
			'function row(label, result) {',
			"  console.log(label, '->', result);",
			'}',
			'',
			"row('0 == \"\"', 0 == '');       // loose: coerces, lies",
			'row(\'"1" == 1\', \'1\' == 1);',
			'// Strict rows: types differ, so === answers false with NO coercion —',
			'// the answer depends only on the operands, never on a rulebook.',
			"row('0 === \"\"', 0 === '');",
			'row(\'"1" === 1\', \'1\' === 1);',
			"row('NaN === NaN', NaN === NaN);  // IEEE 754: NaN equals nothing",
			'',
			"row('isNaN(\"abc\")', isNaN('abc'));  // global isNaN coerces first!",
			'// Number.isNaN never coerces: only the genuine NaN value passes,',
			'// so a plain string is (correctly) not "NaN".',
			"row('Number.isNaN(\"abc\")', Number.isNaN('abc'));",
			'',
			"row('Number(\"abc\")', Number('abc'));  // explicit conversion -> bare NaN",
			'',
			'// The audit trusts the runtime, not our memory: Boolean(v) applies',
			'// the real ToBoolean coercion to each of the 8 canonical falsies.',
			"const falsies = [false, 0, -0, 0n, '', null, undefined, NaN];",
			'let count = 0;',
			'for (const v of falsies) {',
			'  if (Boolean(v) === false) count++;',
			'}',
			"console.log('falsy values confirmed:', count, 'of', falsies.length);",
			'',
		].join('\n'),
	});
})();
