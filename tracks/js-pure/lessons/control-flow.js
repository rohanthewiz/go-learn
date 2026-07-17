/* Control Flow — if/else, switch fallthrough, the loop family, for...of vs
 * for...in, break/continue, and labeled break for nested loops. The
 * exercise scans a 2D grid: the starter keeps checking cells after the
 * target is found, so the check asserts the first post-hit "checking" line
 * is ABSENT (only a labeled break of the outer loop achieves that) and
 * pins a for...of + continue sum that skips negative readings.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	J.lesson({
		id: 'control-flow',
		title: 'Control Flow',
		nav: 'control flow',
		category: 'Foundations',

		prose: [
			'<h2>Branching: if/else and switch</h2>' +
			'<p><code>if</code>/<code>else if</code>/<code>else</code> is the ' +
			'workhorse — each condition is coerced to a boolean (truthiness ' +
			'applies). <code>switch</code> compares one value against ' +
			'<code>case</code> labels with <code>===</code> semantics, and it ' +
			'has a sharp edge: execution <em>falls through</em> to the next ' +
			'case unless you <code>break</code>. Forgetting the break is a ' +
			'classic bug; writing it deliberately (stacked cases sharing one ' +
			'body) is a classic idiom — the difference is a comment saying ' +
			'you meant it.</p>',
			{ lang: 'js', code: 'switch (status) {\n  case "queued":      // deliberate fallthrough — both mean "not done"\n  case "running":\n    console.log("in progress");\n    break;             // without this, "done" would run too\n  case "done":\n    console.log("finished");\n    break;\n  default:\n    console.log("unknown:", status);\n}' },
			'<h2>The loop family</h2>' +
			'<p><code>while</code> repeats while a condition holds; the classic ' +
			'<code>for (init; test; step)</code> bundles counter bookkeeping ' +
			'into one line and is still the right tool when you need the ' +
			'<em>index</em>. For walking <em>values</em>, prefer ' +
			'<code>for...of</code> — it iterates the elements of any iterable ' +
			'(arrays, strings, Maps, Sets) with no index arithmetic to get ' +
			'wrong. Its lookalike <code>for...in</code> iterates object ' +
			'<em>keys</em>, and using it on arrays is a trap: the "indexes" it ' +
			'yields are <em>strings</em> (<code>"0" + 1</code> is ' +
			'<code>"01"</code>!), it visits any inherited or manually added ' +
			'properties too, and order is not guaranteed by the spec for all ' +
			'keys. Rule of thumb: <code>of</code> for values, <code>in</code> ' +
			'only for plain-object keys (or use <code>Object.keys()</code>).</p>',
			{ lang: 'js', code: 'const xs = [10, 20];\nfor (const v of xs)  console.log(v);       // 10, 20      — values\nfor (const k in xs)  console.log(typeof k); // "string" x2 — keys, as strings!' },
			'<h2>break, continue, and labels</h2>' +
			'<p><code>break</code> exits the nearest enclosing loop; ' +
			'<code>continue</code> skips to its next iteration. But "nearest" ' +
			'is the catch in nested loops: a plain <code>break</code> in an ' +
			'inner loop only exits that inner loop — the outer one marches on. ' +
			'JavaScript\'s answer is the <em>labeled</em> break: name the ' +
			'outer loop with <code>label:</code> and <code>break label;</code> ' +
			'exits the whole nest in one bound. (It is a structured exit, not ' +
			'a goto — you can only break out of loops you are inside.)</p>',
			'<svg class="dg" viewBox="0 0 520 150" role="img" aria-label="A labeled break from the inner loop of a grid scan jumps past both loops at once; a plain break would only exit the current row">' +
			'<defs><marker id="dgArrowJSCF" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="var(--ok)"/></marker></defs>' +
			'<text x="16" y="28" fill="var(--accent)" font-size="13" font-family="monospace">scan: for (rows)</text>' +
			'<text x="36" y="52" fill="var(--accent)" font-size="13" font-family="monospace">for (cols)</text>' +
			'<text x="56" y="76" fill="var(--accent)" font-size="13" font-family="monospace">if (hit) break scan;</text>' +
			'<text x="36" y="100" class="lbl" font-size="12">...rest of row — skipped</text>' +
			'<text x="16" y="124" class="lbl" font-size="12">...remaining rows — skipped</text>' +
			'<path d="M 260 72 C 340 72 340 132 300 138" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowJSCF)"/>' +
			'<text x="330" y="120" fill="var(--ok)" font-size="12">break scan: out of BOTH loops</text>' +
			'</svg>',
			'<h3>Your job</h3>' +
			'<p>The starter scans a 3&times;3 grid for the value <code>7</code> ' +
			'— and wastefully keeps checking cells after finding it. First, ' +
			'label the outer loop (e.g. <code>scan:</code>) and ' +
			'<code>break scan;</code> right after the <code>found</code> line, ' +
			'so no cell after the hit prints a <code>checking</code> line. ' +
			'Second, rewrite the readings sum as a <code>for...of</code> loop ' +
			'that <code>continue</code>s past negative values, so the sum ' +
			'becomes <code>17</code> instead of <code>8</code>.</p>' +
			'<div class="tip">The checker verifies a negative: ' +
			'<code>checking 2,0</code> must NOT appear in your output. A plain ' +
			'<code>break</code> only ends row 1 — row 2 would still be ' +
			'scanned, and the check would fail.</div>',
		],

		task: 'Stop the grid scan at the first hit with a labeled break, and sum readings with for...of + continue.',

		starter: [
			'const grid = [',
			'  [3, 1, 4],',
			'  [1, 5, 7],',
			'  [9, 2, 6],',
			'];',
			'const target = 7;',
			'',
			'// TODO 1: label this outer loop (scan:) and break out of BOTH loops',
			'// right after the found line — a plain break only exits the inner one.',
			'for (let r = 0; r < grid.length; r++) {',
			'  for (let c = 0; c < grid[r].length; c++) {',
			"    console.log('checking', r + ',' + c, '=', grid[r][c]);",
			'    if (grid[r][c] === target) {',
			"      console.log('found ' + target + ' at row ' + r + ', col ' + c);",
			'    }',
			'  }',
			'}',
			'',
			'const readings = [4, -2, 10, -7, 3];',
			'let sum = 0;',
			'// TODO 2: rewrite as for...of and `continue` past negative readings',
			'// (sensor glitches) — the sum should become 17, not 8.',
			'for (let i = 0; i < readings.length; i++) {',
			'  sum += readings[i];',
			'}',
			"console.log('sum of valid readings:', sum);",
			'',
		].join('\n'),

		check: function (stdout, flat) {
			// The hit cell itself must have been examined and reported...
			return flat.indexOf('checking 1,2 = 7') !== -1 &&
				flat.indexOf('found 7 at row 1, col 2') !== -1 &&
				// ...and NOTHING after it: 2,0 is the first cell a plain (or
				// missing) break would still scan — labeled break skips it.
				flat.indexOf('checking 2,0') === -1 &&
				flat.indexOf('sum of valid readings: 17') !== -1;
		},

		solution: [
			'const grid = [',
			'  [3, 1, 4],',
			'  [1, 5, 7],',
			'  [9, 2, 6],',
			'];',
			'const target = 7;',
			'',
			'// The label names the OUTER loop so `break scan` unwinds the whole',
			'// nest at once — a plain break here would only end the current row',
			'// and the scan would resume at row 2.',
			'scan: for (let r = 0; r < grid.length; r++) {',
			'  for (let c = 0; c < grid[r].length; c++) {',
			"    console.log('checking', r + ',' + c, '=', grid[r][c]);",
			'    if (grid[r][c] === target) {',
			"      console.log('found ' + target + ' at row ' + r + ', col ' + c);",
			'      break scan;  // first hit is all we need — stop everything',
			'    }',
			'  }',
			'}',
			'',
			'const readings = [4, -2, 10, -7, 3];',
			'let sum = 0;',
			'// for...of walks values directly — no index bookkeeping to get',
			'// wrong; continue documents "skip this one" better than nesting',
			'// the addition inside an if.',
			'for (const v of readings) {',
			'  if (v < 0) continue;  // sensor glitch — ignore it',
			'  sum += v;',
			'}',
			"console.log('sum of valid readings:', sum);",
			'',
		].join('\n'),
	});
})();
