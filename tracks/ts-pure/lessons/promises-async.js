/* Promises & Async — Promise<T>, async/await typing, and Promise.all's
 * tuple-aware signature. The capstone exercise: fan out lookups with
 * Promise.all inside a properly typed async function. The runner settles a
 * macrotask before collecting output, so awaited results really print —
 * and this environment has no setTimeout, keeping every promise chain
 * deterministic (the type checker itself enforces that).
 */
(function () {
	'use strict';
	var T = GoLearnTSP;

	T.lesson({
		id: 'promises-async',
		title: 'Promises & Async',
		nav: 'promises & async',
		category: 'Async',

		prose: [
			'<h2>Promises &amp; Async</h2>' +
			'<p><code>Promise&lt;T&gt;</code> is just a generic type: a promise ' +
			'<em>of</em> a <code>T</code>. Every async annotation you will ever ' +
			'write hangs off that one idea:</p>',
			{ lang: 'ts', code: 'function fetchName(id: number): Promise<string> {\n  return Promise.resolve("user-" + id);   // stand-in for a network call\n}\n\nasync function main(): Promise<void> {\n  const name = await fetchName(7);   // await unwraps: Promise<string> → string\n  console.log(name.toUpperCase());   // string methods available — it is a string\n}' },
			'<p>The rules, in one breath: an <code>async</code> function\'s return ' +
			'type is always <code>Promise&lt;something&gt;</code> (returning a bare ' +
			'<code>T</code> inside is fine — it gets wrapped); <code>await</code> ' +
			'peels one <code>Promise&lt;&gt;</code> layer off; and — the classic ' +
			'bug the checker now catches — a <em>forgotten</em> ' +
			'<code>await</code> leaves you holding a ' +
			'<code>Promise&lt;string&gt;</code>, so calling ' +
			'<code>.toUpperCase()</code> on it is error TS2339 instead of a runtime ' +
			'surprise.</p>' +
			'<p>For concurrent work there is <code>Promise.all</code>, whose typing ' +
			'is smarter than it first looks: given an array of ' +
			'<code>Promise&lt;string&gt;</code> it yields <code>string[]</code>, ' +
			'and given a mixed tuple it yields a typed tuple back:</p>',
			{ lang: 'ts', code: 'const [n, s] = await Promise.all([\n  Promise.resolve(42),        // Promise<number>\n  Promise.resolve("hi"),      // Promise<string>\n]);                            // n: number, s: string — positions preserved' },
			'<h3>Your job</h3>' +
			'<p>Implement <code>loadAll</code>: map the ids through ' +
			'<code>fetchName</code>, <code>Promise.all</code> the lot, and return ' +
			'the names. The declared return type ' +
			'<code>Promise&lt;string[]&gt;</code> is your guardrail — forget the ' +
			'<code>await</code> (or return the promises themselves) and the checker ' +
			'reports the exact mismatch.</p>' +
			'<div class="tip">This sandbox deliberately has no ' +
			'<code>setTimeout</code> — try it: the checker cannot find the name. ' +
			'Everything async here resolves deterministically, which is also why ' +
			'the output pane can capture prints from <em>after</em> an await.</div>',
		],

		task: 'Implement loadAll with ids.map(fetchName) + Promise.all, then await it in main.',

		starter: [
			'function fetchName(id: number): Promise<string> {',
			'  return Promise.resolve("user-" + id);  // stand-in for a network call',
			'}',
			'',
			'async function loadAll(ids: number[]): Promise<string[]>  {',
			'  // TODO: fetch every id CONCURRENTLY (map + Promise.all) and',
			'  // return the resolved names.',
			'  return [];',
			'}',
			'',
			'async function main(): Promise<void> {',
			'  const names = await loadAll([1, 2, 3]);',
			'  console.log("loaded:", names.join(", "));',
			'  console.log("count:", names.length);',
			'}',
			'',
			'main();',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('loaded: user-1, user-2, user-3') !== -1 &&
				flat.indexOf('count: 3') !== -1;
		},

		solution: [
			'function fetchName(id: number): Promise<string> {',
			'  return Promise.resolve("user-" + id);  // stand-in for a network call',
			'}',
			'',
			'async function loadAll(ids: number[]): Promise<string[]>  {',
			'  // map produces Promise<string>[] — all lookups in flight at once;',
			'  // Promise.all gathers them into one Promise<string[]>; await',
			'  // unwraps it so the return matches string[] inside the async fn.',
			'  return await Promise.all(ids.map(fetchName));',
			'}',
			'',
			'async function main(): Promise<void> {',
			'  const names = await loadAll([1, 2, 3]);',
			'  console.log("loaded:", names.join(", "));',
			'  console.log("count:", names.length);',
			'}',
			'',
			'main();',
			'',
		].join('\n'),
	});
})();
