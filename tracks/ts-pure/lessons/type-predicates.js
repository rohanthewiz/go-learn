/* Type Predicates — user-defined guards (`pet is Fish`). The missing piece
 * once narrowing logic moves into a helper function: a plain boolean return
 * throws the proof away, the predicate return type keeps it. The exercise
 * is built so accessing the narrowed-only field (depth) FORCES the
 * predicate — an inline-boolean filter leaves the union type and errors.
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	T.lesson({
		id: 'type-predicates',
		title: 'Type Predicates',
		nav: 'type predicates',
		category: 'Unions & Narrowing',

		prose: [
			'<h2>Type Predicates</h2>' +
			'<p>Narrowing follows checks the compiler can see. The moment you ' +
			'factor a check into a helper, the proof stops traveling:</p>',
			{ lang: 'ts', code: 'function isFish(pet: Fish | Bird): boolean {\n  return "fin" in pet;\n}\n\nif (isFish(pet)) {\n  pet.depth; // error — a boolean told the caller nothing about the TYPE\n}' },
			'<p>The fix is a <strong>type predicate</strong> return type: ' +
			'<code>pet is Fish</code> declares "when this returns true, the ' +
			'argument was a Fish", and the checker propagates that to every call ' +
			'site:</p>',
			{ lang: 'ts', code: 'function isFish(pet: Fish | Bird): pet is Fish {\n  return "fin" in pet;\n}' },
			'<p>The body still returns a boolean — you are responsible for it ' +
			'actually being the right boolean. What you get in exchange is ' +
			'first-class narrowing, including the standard-library integration ' +
			'that makes this pattern ubiquitous: ' +
			'<code>array.filter(isFish)</code> returns <code>Fish[]</code>, not ' +
			'<code>(Fish | Bird)[]</code> — filter has an overload specifically for ' +
			'predicate functions.</p>' +
			'<h3>Your job</h3>' +
			'<p>Write <code>isFish</code> as a proper predicate and use it to filter ' +
			'the pets, then print each fish\'s swimming depth. <code>depth</code> ' +
			'only exists on <code>Fish</code>, so a filter with a plain boolean ' +
			'callback leaves you holding the union — the checker will insist on the ' +
			'predicate.</p>' +
			'<div class="tip">Related and worth knowing: <code>asserts pet is ' +
			'Fish</code> on a function that <em>throws</em> instead of returning ' +
			'false. Same idea, exception-shaped — common in validation code.</div>',
		],

		task: 'Write isFish as a type predicate, filter with it, and print each fish\'s depth.',

		starter: [
			'type Fish = { name: string; depth: number }; // depth: fish only',
			'type Bird = { name: string; wingspan: number };',
			'',
			'// TODO: change the return type to the predicate `pet is Fish` —',
			'// as written, callers learn nothing they can narrow with.',
			'function isFish(pet: Fish | Bird): boolean {',
			'  return "depth" in pet;',
			'}',
			'',
			'const pets: (Fish | Bird)[] = [',
			'  { name: "nemo", depth: 20 },',
			'  { name: "tweety", wingspan: 12 },',
			'  { name: "dory", depth: 110 },',
			'];',
			'',
			'// TODO: filter to just the fish and print "<name> swims at <depth>m".',
			'// With the boolean version, the filtered array is still (Fish|Bird)[]',
			'// and .depth is a compile error — the predicate is what fixes that.',
			'for (const p of pets) {',
			'  console.log(p.name);',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('nemo swims at 20m') !== -1 &&
				flat.indexOf('dory swims at 110m') !== -1 &&
				flat.indexOf('tweety swims') === -1;
		},

		solution: [
			'type Fish = { name: string; depth: number }; // depth: fish only',
			'type Bird = { name: string; wingspan: number };',
			'',
			'// `pet is Fish` makes the boolean carry its meaning into the type',
			'// system: true narrows the argument to Fish at the call site.',
			'function isFish(pet: Fish | Bird): pet is Fish {',
			'  return "depth" in pet;',
			'}',
			'',
			'const pets: (Fish | Bird)[] = [',
			'  { name: "nemo", depth: 20 },',
			'  { name: "tweety", wingspan: 12 },',
			'  { name: "dory", depth: 110 },',
			'];',
			'',
			'// filter has a predicate-aware overload: the result is Fish[],',
			'// so .depth is available with no casts.',
			'for (const f of pets.filter(isFish)) {',
			'  console.log(f.name, "swims at", f.depth + "m");',
			'}',
			'',
		].join('\n'),
	});
})();
