/* Promises — why they exist (escaping the callback pyramid), the three
 * states and one-way settling, .then chaining/flattening, .catch recovery,
 * the executor, and the Promise combinators. The exercise flattens a
 * nested-timer build pipeline into a sleep().then() chain, recovers from a
 * rejected step mid-chain, and fans out three artifact fetches with
 * Promise.all; the check pins the full line ORDER (indexOf comparisons),
 * the recovery line, a post-recovery line proving the chain continued,
 * and the joined Promise.all result — none reachable without the chain.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// The promise state machine. Marker ids are namespaced (dgArrowJSPM*)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-label="promise state machine: pending moves once to fulfilled via resolve or to rejected via reject; settled is final">' +
		'<text x="20" y="22" class="lbl">a promise settles exactly once — no arrow ever leaves a settled state</text>' +
		// pending
		'<rect x="30" y="80" width="140" height="60" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="100" y="106" text-anchor="middle">pending</text>' +
		'<text x="100" y="124" text-anchor="middle" class="lbl">work in flight</text>' +
		// fulfilled
		'<rect x="340" y="46" width="150" height="54" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="415" y="68" text-anchor="middle">fulfilled</text>' +
		'<text x="415" y="86" text-anchor="middle" class="lbl">has a value</text>' +
		'<path d="M 172 96 L 336 76" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSPM)"/>' +
		'<text x="254" y="72" text-anchor="middle" class="lbl">resolve(value)</text>' +
		// rejected
		'<rect x="340" y="122" width="150" height="54" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="415" y="144" text-anchor="middle">rejected</text>' +
		'<text x="415" y="162" text-anchor="middle" class="lbl">has a reason</text>' +
		'<path d="M 172 124 L 336 146" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowJSPMr)"/>' +
		'<text x="254" y="150" text-anchor="middle" class="lbl">reject(reason)</text>' +
		'<defs>' +
		'<marker id="dgArrowJSPM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowJSPMr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	J.lesson({
		id: 'promises',
		title: 'Promises',
		nav: 'promises',
		category: 'Async JavaScript',

		prose: [
			'<h2>Promises</h2>' +
			'<p>Before promises, async results arrived through callbacks — and ' +
			'every dependent step meant nesting one level deeper. Two steps in, ' +
			'the code is already drifting off the right edge of the screen; add ' +
			'error handling at each level and it collapses into the ' +
			'<em>callback pyramid</em>. A <strong>promise</strong> turns "call me ' +
			'back later" into an ordinary <em>value</em> you can hold, return, ' +
			'store, and chain:</p>',
			{ lang: 'js', code: '// the pyramid: each step nests inside the last\nstep1(function (a) {\n  step2(a, function (b) {\n    step3(b, function (c) { console.log(c); });\n  });\n});\n\n// the same flow as a flat promise chain\nstep1().then(step2).then(step3).then(console.log);' },
			DIAGRAM +
			'<p>A promise is in exactly one of three states: <code>pending</code> ' +
			'(the work is still in flight), <code>fulfilled</code> (it has a ' +
			'value), or <code>rejected</code> (it has a failure reason). Settling ' +
			'is <strong>one-way</strong>: the first call to <code>resolve</code> ' +
			'or <code>reject</code> wins, and every later call is silently ' +
			'ignored. That finality is the design point — a settled promise is a ' +
			'stable fact you can attach handlers to at any time, even long after ' +
			'it settled, and they still fire.</p>',
			'<p>The chaining magic: <code>.then</code> does not modify the ' +
			'promise it is called on — it returns a <strong>new</strong> promise ' +
			'for whatever the handler produces. Return a plain value and it flows ' +
			'to the next <code>.then</code>; return a <em>promise</em> and the ' +
			'chain waits for it and passes its settled value along. That ' +
			'auto-flattening is precisely what kills the pyramid: a dependent ' +
			'async step becomes a <code>return</code>, not another nest level.</p>',
			{ lang: 'js', code: 'fetchUser(1)\n  .then(function (user) { return user.name; })      // value: flows through\n  .then(function (name) { return fetchTeam(name); })  // promise: awaited into the chain\n  .then(function (team) { console.log(team); })\n  .catch(function (err) { console.log("failed:", err.message); })\n  .finally(function () { console.log("done either way"); });' },
			'<p><code>.catch</code> handles a rejection thrown <em>anywhere</em> ' +
			'upstream — one handler covers the whole chain above it, the way one ' +
			'<code>catch</code> block covers a whole <code>try</code>. And ' +
			'because <code>.catch</code> also returns a new promise, the chain ' +
			'<strong>continues</strong> after it: return a fallback value and the ' +
			'steps below run as if nothing failed. <code>.finally</code> runs on ' +
			'either outcome — cleanup, spinners off — and passes the result ' +
			'through untouched.</p>' +
			'<p>You build a promise from scratch with the ' +
			'<code>new Promise((resolve, reject) =&gt; ...)</code> executor. Its ' +
			'classic use is <em>promisifying</em> a callback API — here, the ' +
			'timer:</p>',
			{ lang: 'js', code: 'function sleep(ms) {\n  return new Promise(function (resolve) {\n    setTimeout(resolve, ms);   // the timer settles the promise later\n  });\n}\n\nsleep(100).then(function () { console.log("after 100 (virtual) ms"); });' },
			'<p>For concurrent work, <code>Promise.all(promises)</code> waits for ' +
			'every promise and fulfills with an array of results in the ' +
			'<em>input order</em> — never finish order. It is ' +
			'<strong>fail-fast</strong>: the first rejection rejects the whole ' +
			'thing immediately, which is what you want when the steps only make ' +
			'sense together.</p>' +
			'<p><code>Promise.allSettled(promises)</code> never rejects: it waits ' +
			'for everything and yields ' +
			'<code>{status: "fulfilled", value}</code> / ' +
			'<code>{status: "rejected", reason}</code> records — the right tool ' +
			'when you want every outcome, failures included, to inspect ' +
			'afterwards.</p>' +
			'<p><code>Promise.race(promises)</code> settles with whichever ' +
			'promise settles first, win or lose — the building block for ' +
			'timeouts.</p>',
			'<h3>Your job</h3>' +
			'<p>The starter is a build pipeline written as a callback pyramid. ' +
			'Implement <code>sleep(ms)</code> with the executor, rewrite the ' +
			'pyramid as a flat <code>sleep().then()</code> chain, add the failing ' +
			'step after <code>test ok</code> and recover from it with a ' +
			'<code>.catch</code> that prints exactly ' +
			'<code>recovered: disk full</code>, then after <code>package ok</code> ' +
			'fetch the three artifacts concurrently with <code>Promise.all</code> ' +
			'and print them joined, followed by <code>deploy ok</code>.</p>' +
			'<div class="tip">Timers here are <em>virtual</em>: ' +
			'<code>setTimeout(f, 500)</code> costs nothing and fires ' +
			'deterministically after the synchronous code, in due-time order. ' +
			'Delays are <em>ordering</em>, not waiting — so experiment freely.</div>',
		],

		task: 'Flatten the timer pyramid into a sleep().then() chain, recover from the disk-full step with .catch, and fetch the artifacts with Promise.all.',

		starter: [
			'// A tiny build pipeline, currently a callback pyramid. Delays are',
			'// virtual: they decide ORDER, they never make anyone wait.',
			'function fetchArtifact(name) {',
			'  return new Promise(function (resolve) {',
			"    setTimeout(function () { resolve(name + '.tar.gz'); }, 30);",
			'  });',
			'}',
			'',
			'// TODO 1: promisify the timer -- return a new Promise that the',
			'// timer resolves after ms, so the pipeline can become a flat chain.',
			'function sleep(ms) {',
			'}',
			'',
			'// TODO 2: rewrite this pyramid as a flat sleep(100).then() chain.',
			'// TODO 3: after test ok, add the failing step',
			"//     return Promise.reject(new Error('disk full'));",
			'//   and recover with .catch, printing exactly: recovered: disk full',
			"// TODO 4: after package ok, fetch 'app', 'docs' and 'assets'",
			'//   CONCURRENTLY with Promise.all, print',
			'//     artifacts: app.tar.gz, docs.tar.gz, assets.tar.gz',
			"//   and only then print deploy ok.",
			'setTimeout(function () {',
			"  console.log('compile ok');",
			'  setTimeout(function () {',
			"    console.log('test ok');",
			'    setTimeout(function () {',
			"      console.log('package ok');",
			"      console.log('deploy ok');",
			'    }, 100);',
			'  }, 100);',
			'}, 100);',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var compile = flat.indexOf('compile ok');
			var test = flat.indexOf('test ok');
			var rec = flat.indexOf('recovered: disk full');
			var pack = flat.indexOf('package ok');
			var art = flat.indexOf('artifacts: app.tar.gz, docs.tar.gz, assets.tar.gz');
			var deploy = flat.indexOf('deploy ok');
			return compile !== -1 && compile < test && test < rec &&
				rec < pack && pack < art && art < deploy;
		},

		solution: [
			'// A tiny build pipeline, currently a callback pyramid. Delays are',
			'// virtual: they decide ORDER, they never make anyone wait.',
			'function fetchArtifact(name) {',
			'  return new Promise(function (resolve) {',
			"    setTimeout(function () { resolve(name + '.tar.gz'); }, 30);",
			'  });',
			'}',
			'',
			'// The promisified timer: the executor runs immediately and hands',
			'// resolve to the timer -- the promise settles when the timer fires.',
			'function sleep(ms) {',
			'  return new Promise(function (resolve) {',
			'    setTimeout(resolve, ms);',
			'  });',
			'}',
			'',
			'// Flat chain: every .then RETURNS the next step\'s promise, so the',
			'// chain awaits it -- same ordering as the pyramid, zero nesting.',
			'sleep(100)',
			'  .then(function () {',
			"    console.log('compile ok');",
			'    return sleep(100);',
			'  })',
			'  .then(function () {',
			"    console.log('test ok');",
			'    // the failing step: a rejection skips every .then below it',
			'    // and lands on the nearest .catch downstream.',
			"    return Promise.reject(new Error('disk full'));",
			'  })',
			'  .catch(function (err) {',
			'    // recovery: .catch returns a fulfilled promise, so the chain',
			'    // CONTINUES below as if the step had succeeded.',
			"    console.log('recovered: ' + err.message);",
			'    return sleep(100);',
			'  })',
			'  .then(function () {',
			"    console.log('package ok');",
			'    // all three fetches start NOW; Promise.all keeps results in',
			'    // input order, not finish order.',
			'    return Promise.all([',
			"      fetchArtifact('app'),",
			"      fetchArtifact('docs'),",
			"      fetchArtifact('assets'),",
			'    ]);',
			'  })',
			'  .then(function (files) {',
			"    console.log('artifacts: ' + files.join(', '));",
			"    console.log('deploy ok');",
			'  });',
			'',
		].join('\n'),
	});
})();
