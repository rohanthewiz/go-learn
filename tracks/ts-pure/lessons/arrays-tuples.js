/* Arrays & Tuples — T[] vs the fixed-shape tuple, destructuring, and
 * readonly arrays. The exercise returns a [min, max] tuple: position, not
 * property names, carries the meaning, and the destructuring at the call
 * site is checked against exactly two numbers.
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	T.lesson({
		id: 'arrays-tuples',
		title: 'Arrays & Tuples',
		nav: 'arrays & tuples',
		category: 'Foundations',

		prose: [
			'<h2>Arrays &amp; Tuples</h2>' +
			'<p>An array type is the element type plus <code>[]</code>, and every ' +
			'read and write is checked against it:</p>',
			{ lang: 'ts', code: 'const scores: number[] = [7, 2, 9];\nscores.push(4);        // ok\nscores.push("ten");    // error TS2345\nconst first = scores[0]; // number' },
			'<p>A <strong>tuple</strong> is different: a fixed-length array where ' +
			'each <em>position</em> has its own type. Use it when a function ' +
			'naturally returns two or three things and a named object would be ' +
			'ceremony:</p>',
			{ lang: 'ts', code: 'const entry: [string, number] = ["ada", 36];\nconst [name, age] = entry;   // name: string, age: number — by position\nentry[2];                    // error TS2493: no element at index 2' },
			'<p>Destructuring works on both, and on tuples it is fully typed: the ' +
			'checker knows the first binding is a <code>string</code> and the second ' +
			'a <code>number</code>, with no annotations at the call site.</p>' +
			'<p>One more modifier you will meet in signatures everywhere: ' +
			'<code>readonly number[]</code> is an array the function promises not to ' +
			'mutate — <code>push</code>, <code>sort</code>, and friends simply do ' +
			'not exist on it. Accepting <code>readonly</code> arrays is the polite ' +
			'default for functions that only read.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>bounds</code>: return the smallest and largest ' +
			'number as a <code>[number, number]</code> tuple. The starter returns ' +
			'<code>[0, 0]</code>; the destructured call site below it is already ' +
			'written and will light up with correct values the moment you are done.</p>' +
			'<div class="tip">Spread flattens an array into arguments: ' +
			'<code>Math.min(...xs)</code>. It type-checks because ' +
			'<code>Math.min</code> accepts any number of <code>number</code>s.</div>',
		],

		task: 'Return the real [min, max] of xs as a tuple.',

		starter: [
			'// readonly: this function promises not to mutate its input —',
			'// xs.push(...) inside the body would be a compile error.',
			'function bounds(xs: readonly number[]): [number, number] {',
			'  // TODO: return the smallest and largest element.',
			'  // Math.min / Math.max with spread is the direct route.',
			'  return [0, 0];',
			'}',
			'',
			'const readings = [7, 2, 9, 4];',
			'const [min, max] = bounds(readings); // typed by position',
			'console.log("min", min, "max", max);',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('min 2 max 9') !== -1;
		},

		solution: [
			'function bounds(xs: readonly number[]): [number, number] {',
			'  // Spread turns the array into individual arguments. The tuple',
			'  // return type guarantees callers get exactly two numbers, in a',
			'  // known order — try returning [Math.min(...xs)] and watch TS2322.',
			'  return [Math.min(...xs), Math.max(...xs)];',
			'}',
			'',
			'const readings = [7, 2, 9, 4];',
			'const [min, max] = bounds(readings); // typed by position',
			'console.log("min", min, "max", max);',
			'',
		].join('\n'),
	});
})();
