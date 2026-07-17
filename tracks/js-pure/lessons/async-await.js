/* Async & Await — async functions always return promises, await unwraps
 * and pauses the function (never the program), rejections become ordinary
 * throws so try/catch works, and the sequential-vs-concurrent distinction
 * made VISIBLE through log interleaving instead of clock time. The
 * exercise converts three strictly sequential user fetches to map +
 * Promise.all and handles a bad-id rejection with try/catch; the check
 * pins the interleaving (every start line before the first done line via
 * indexOf comparisons), the exact error line, and a summary line that
 * proves execution continued past the handled failure.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	J.lesson({
		id: 'async-await',
		title: 'Async & Await',
		nav: 'async / await',
		category: 'Async JavaScript',

		prose: [
			'<h2>Async &amp; Await</h2>' +
			'<p><code>async</code> and <code>await</code> are syntax over the ' +
			'promise chains of the last lesson — the machinery is identical, but ' +
			'the code reads top-to-bottom like the synchronous version. Two ' +
			'rules cover almost everything. First: an <code>async</code> ' +
			'function <strong>always</strong> returns a promise. Return a bare ' +
			'value and it gets wrapped; throw and the returned promise ' +
			'rejects:</p>',
			{ lang: 'js', code: 'async function answer() {\n  return 42;               // caller receives Promise<42>, not 42\n}\nanswer().then(function (n) { console.log(n); });  // 42' },
			'<p>Second: <code>await</code> unwraps <em>one</em> promise layer — ' +
			'and <strong>pauses the function</strong> at that point until the ' +
			'promise settles. Only the function pauses, never the whole ' +
			'program: while one <code>async</code> function is parked at an ' +
			'<code>await</code>, other queued work runs in the gap. (How that ' +
			'scheduling actually works is the next lesson — the event loop.)</p>' +
			'<p>The payoff of the whole model: a rejected promise ' +
			'<em>re-throws</em> at the <code>await</code>, so plain ' +
			'<code>try/catch</code> — the error tool you already know — now ' +
			'works on async code. No more per-step error callbacks:</p>',
			{ lang: 'js', code: 'async function main() {\n  try {\n    const user = await fetchUser(99);   // rejection surfaces HERE as a throw\n    console.log(user);\n  } catch (err) {\n    console.log("lookup failed:", err.message);\n  }\n}\nmain();   // no top-level await in this runner -- kick off and let it run' },
			'<p>The classic performance trap: <code>await</code> in a row makes ' +
			'independent work <em>sequential</em> — step two does not even ' +
			'start until step one finishes. To run tasks concurrently, start ' +
			'them all <em>first</em> (calling an async function begins its work ' +
			'and hands you a promise immediately), then <code>await ' +
			'Promise.all</code>. You cannot see the difference on a clock here, ' +
			'but you can see it in the <strong>log interleaving</strong>, which ' +
			'is better evidence anyway:</p>',
			{ lang: 'js', code: '// sequential:  start a, done a, start b, done b\nawait task("a");\nawait task("b");\n\n// concurrent:  start a, start b, done a, done b\nawait Promise.all([task("a"), task("b")]);   // both in flight at once' },
			'<p>One environment note: this runner executes your code inside a ' +
			'function body, so there is no top-level <code>await</code>. Put ' +
			'the async work in <code>async function main()</code> and call ' +
			'<code>main();</code> at the end — the runner waits for dangling ' +
			'promises before collecting output.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter fetches users 1, 2 and 3 strictly one-by-one, and a ' +
			'bad id escapes all the way out of <code>main</code> to a safety ' +
			'net that only prints a generic failure. Make the three fetches ' +
			'concurrent (map the ids and <code>await Promise.all</code>), and ' +
			'wrap the bad-id call in <code>try/catch</code> printing exactly ' +
			'<code>no such user: 99</code> so the summary line still runs.</p>' +
			'<div class="tip">Proof of concurrency is in the log: all three ' +
			'<code>start</code> lines must appear <em>before</em> the first ' +
			'<code>done</code> line. Sequentially they alternate.</div>',
		],

		task: 'Make the three fetches concurrent with map + Promise.all, and try/catch the bad id so the summary still prints.',

		starter: [
			'function sleep(ms) {',
			'  return new Promise(function (resolve) { setTimeout(resolve, ms); });',
			'}',
			'',
			'async function fetchUser(id) {',
			"  console.log('start ' + id);",
			'  await sleep(50);',
			"  if (id === 99) throw new Error('no such user: ' + id);",
			"  console.log('done ' + id);",
			"  return 'user-' + id;",
			'}',
			'',
			'async function main() {',
			'  // TODO 1: these awaits run one-by-one -- user 2 does not even START',
			'  // until user 1 is done. Make them CONCURRENT: map the ids through',
			'  // fetchUser first, then await Promise.all.',
			'  const users = [];',
			'  users.push(await fetchUser(1));',
			'  users.push(await fetchUser(2));',
			'  users.push(await fetchUser(3));',
			"  console.log('loaded: ' + users.join(', '));",
			'',
			'  // TODO 2: wrap this call in try/catch and print err.message, so the',
			'  // failure is handled HERE and the summary below still runs.',
			'  await fetchUser(99);',
			'',
			"  console.log('all requests handled');",
			'}',
			'',
			'main().catch(function () {',
			'  // safety net: the unhandled rejection from the bad id lands here',
			"  console.log('pipeline failed');",
			'});',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var s1 = flat.indexOf('start 1');
			var s2 = flat.indexOf('start 2');
			var s3 = flat.indexOf('start 3');
			var firstDone = flat.indexOf('done ');
			var missing = flat.indexOf('no such user: 99');
			var summary = flat.indexOf('all requests handled');
			return s1 !== -1 && s2 !== -1 && s3 !== -1 && firstDone !== -1 &&
				s1 < firstDone && s2 < firstDone && s3 < firstDone &&
				flat.indexOf('loaded: user-1, user-2, user-3') !== -1 &&
				missing !== -1 && summary !== -1 && missing < summary;
		},

		solution: [
			'function sleep(ms) {',
			'  return new Promise(function (resolve) { setTimeout(resolve, ms); });',
			'}',
			'',
			'async function fetchUser(id) {',
			"  console.log('start ' + id);",
			'  await sleep(50);',
			"  if (id === 99) throw new Error('no such user: ' + id);",
			"  console.log('done ' + id);",
			"  return 'user-' + id;",
			'}',
			'',
			'async function main() {',
			'  // Concurrent: calling fetchUser starts its work IMMEDIATELY and',
			'  // returns a promise -- map fires all three before any await, and',
			'  // Promise.all gathers the results in input order. The proof is in',
			'  // the log: every start line lands before the first done line.',
			'  const users = await Promise.all([1, 2, 3].map(function (id) {',
			'    return fetchUser(id);',
			'  }));',
			"  console.log('loaded: ' + users.join(', '));",
			'',
			'  // The rejection re-throws at the await, so plain try/catch handles',
			'  // it locally and execution continues to the summary below.',
			'  try {',
			'    await fetchUser(99);',
			'  } catch (err) {',
			'    console.log(err.message);',
			'  }',
			'',
			"  console.log('all requests handled');",
			'}',
			'',
			'main().catch(function () {',
			'  // safety net: unreachable now -- main handles its own failure',
			"  console.log('pipeline failed');",
			'});',
			'',
		].join('\n'),
	});
})();
