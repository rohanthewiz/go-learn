/* Proxy & Reflect — a Proxy wraps a target and intercepts fundamental
 * operations through handler traps (get/set/has are the everyday trio);
 * Reflect mirrors every trap with the default behavior, which is how a trap
 * does "the normal thing, plus". The exercise hardens a settings object:
 * a get trap that logs reads and fills in defaults for missing keys, and a
 * set trap that vetoes a type-corrupting write (returning false, which
 * strict mode escalates to a TypeError at the assignment site). The check
 * pins the defaulted read, the preserved real value, the interception log,
 * and the rejected write — none reachable without real traps.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// Caller → proxy (traps) → target, with Reflect as the pass-through.
	// Marker ids are namespaced (dgArrowJSPX*) — SVG ids are global page-wide.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 150" width="520" height="150" role="img" aria-label="property operations from the caller route through the proxy traps; Reflect forwards the default behavior to the target">' +
		'<text x="20" y="24" class="lbl">every property operation on the proxy routes through a trap — the target never sees the caller directly</text>' +
		// caller
		'<rect x="20" y="58" width="110" height="48" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="75" y="79" text-anchor="middle">caller</text>' +
		'<text x="75" y="97" text-anchor="middle" class="lbl">settings.timeout</text>' +
		// proxy
		'<rect x="205" y="58" width="110" height="48" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="260" y="79" text-anchor="middle">Proxy</text>' +
		'<text x="260" y="97" text-anchor="middle" class="lbl">get / set / has</text>' +
		// target
		'<rect x="390" y="58" width="110" height="48" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="445" y="79" text-anchor="middle">target</text>' +
		'<text x="445" y="97" text-anchor="middle" class="lbl">plain object</text>' +
		// arrows
		'<path d="M 132 82 L 201 82" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowJSPX)"/>' +
		'<path d="M 317 82 L 386 82" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSPXok)"/>' +
		'<text x="352" y="128" text-anchor="middle" class="lbl">Reflect.get / Reflect.set = the default behavior</text>' +
		'<defs>' +
		'<marker id="dgArrowJSPX" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowJSPXok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	J.lesson({
		id: 'proxy-reflect',
		title: 'Proxy & Reflect',
		nav: 'proxy & reflect',
		category: 'Advanced',

		prose: [
			'<h2>Proxy &amp; Reflect</h2>' +
			'<p>A <code>Proxy</code> wraps a target object and intercepts the ' +
			'language\'s <em>fundamental operations</em> on it — property reads, ' +
			'writes, <code>in</code> checks, deletion, enumeration — via handler ' +
			'functions called <strong>traps</strong>. The everyday trio is ' +
			'<code>get</code>, <code>set</code>, and <code>has</code>: once ' +
			'trapped, <code>obj.x</code> is no longer a memory lookup, it is ' +
			'<em>your function call</em>, and you decide what it means:</p>',
			{ lang: 'js', code: 'const logged = new Proxy(target, {\n  get(t, prop, receiver) {\n    console.log("read:", prop);\n    return Reflect.get(t, prop, receiver);  // then do the normal thing\n  },\n});' },
			DIAGRAM +
			'<p>That <code>Reflect.get</code> is the other half of the pattern. ' +
			'<code>Reflect</code> mirrors every trap one-for-one with the ' +
			'<em>default</em> behavior — <code>Reflect.get</code> is what an ' +
			'untrapped read would have done, <code>Reflect.set</code> an ' +
			'untrapped write. Forwarding through <code>Reflect</code> (passing ' +
			'<code>receiver</code> along, which keeps getters and inheritance ' +
			'honest) is the correct way to write "the normal thing, plus my ' +
			'extra". Hand-rolling <code>t[prop]</code> instead works until a ' +
			'getter or a prototype chain shows up — then it subtly lies.</p>' +
			'<p>The golden rule of trap design: <strong>stay transparent unless ' +
			'deviation is the point</strong>. Code holding a proxy should not be ' +
			'able to tell — except exactly where you intend it to. A ' +
			'<code>set</code> trap signals refusal by returning ' +
			'<code>false</code>, and in strict mode (this sandbox, all modules) ' +
			'the engine escalates that to a <code>TypeError</code> at the ' +
			'assignment site — a silent corruption becomes a loud, catchable ' +
			'error:</p>',
			{ lang: 'js', code: 'const guarded = new Proxy(target, {\n  set(t, prop, value, receiver) {\n    if (prop === "retries" && typeof value !== "number") {\n      return false;               // strict mode: assignment THROWS TypeError\n    }\n    return Reflect.set(t, prop, value, receiver);\n  },\n  has(t, prop) {                    // traps  prop in obj\n    return Reflect.has(t, prop);\n  },\n});' },
			'<p>This is not an academic toy: Vue 3\'s reactivity is a ' +
			'<code>get</code> trap recording who read what and a ' +
			'<code>set</code> trap notifying them; validation layers and ORMs ' +
			'ride the same rails. The honest cost: every trapped operation pays ' +
			'a function call where a plain read paid none — wrap configuration ' +
			'and models, not the hot inner loop.</p>',
			'<h3>Your job</h3>' +
			'<p>The starter\'s plain <code>settings</code> object fails twice: a ' +
			'missing key reads as <code>undefined</code>, and a bogus write ' +
			'(<code>retries = \'lots\'</code>) corrupts state silently. Wrap it ' +
			'in a Proxy: the <code>get</code> trap logs ' +
			'<code>read: &lt;prop&gt;</code>, returns the entry from a ' +
			'<code>defaults</code> object for missing keys, and ' +
			'<code>Reflect.get</code>s existing ones; the <code>set</code> trap ' +
			'returns <code>false</code> for a non-number <code>retries</code>. ' +
			'Then catch the now-throwing write and print ' +
			'<code>rejected write: retries</code>.</p>' +
			'<div class="tip">Missing vs existing is <code>prop in t</code> — ' +
			'the <code>in</code> operator against the <em>target</em>. Expect ' +
			'<code>timeout: 30</code> (defaulted), <code>theme: dark</code> ' +
			'(real value untouched), and <code>retries: 3</code> surviving the ' +
			'rejected write.</div>',
		],

		task: 'Wrap settings in a Proxy whose get trap logs reads and serves defaults, and whose set trap rejects the corrupting write.',

		starter: [
			'// Plain object: no interception, no safety net.',
			'const target = {',
			"  theme: 'dark',",
			'  retries: 3,',
			'};',
			'',
			"// TODO 1: add   const defaults = { timeout: 30 };   and wrap target:",
			'//   const settings = new Proxy(target, { ... });',
			"// get trap: log 'read: ' + prop, return defaults[prop] when the key is",
			'// missing from the target, and Reflect.get existing keys as normal.',
			'const settings = target;',
			'',
			"console.log('timeout:', settings.timeout);  // typo/missing key -> undefined",
			"console.log('theme:', settings.theme);",
			'',
			'// TODO 2: add a set trap that returns false for a non-number retries',
			'// write — strict mode turns that refusal into a TypeError right here.',
			'// TODO 3: this write corrupts state silently today; once the trap',
			"// rejects it, wrap it in try/catch and print 'rejected write: retries'.",
			"settings.retries = 'lots';",
			'',
			"console.log('retries:', settings.retries);",
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('timeout: 30') !== -1 &&          // defaulted read
				flat.indexOf('theme: dark') !== -1 &&             // real value passes through
				flat.indexOf('read: theme') !== -1 &&             // get trap really intercepts
				flat.indexOf('rejected write: retries') !== -1 && // set trap veto was caught
				flat.indexOf('retries: 3') !== -1 &&              // state survived the attack
				flat.indexOf('retries: lots') === -1 &&
				flat.indexOf('rejected write: retries') < flat.indexOf('retries: 3');
		},

		solution: [
			'// Plain object: no interception, no safety net.',
			'const target = {',
			"  theme: 'dark',",
			'  retries: 3,',
			'};',
			'',
			'// Fallbacks live OUTSIDE the target so a default never masquerades',
			'// as real state — the target stays the single source of truth.',
			'const defaults = { timeout: 30 };',
			'',
			'const settings = new Proxy(target, {',
			'  get(t, prop, receiver) {',
			"    console.log('read: ' + String(prop));  // interception, made visible",
			'    if (!(prop in t) && prop in defaults) {',
			'      return defaults[prop];               // deviation, on purpose',
			'    }',
			'    // Reflect.get IS the untrapped behavior — forwarding receiver',
			'    // keeps getters and prototype chains honest.',
			'    return Reflect.get(t, prop, receiver);',
			'  },',
			'  set(t, prop, value, receiver) {',
			"    if (prop === 'retries' && typeof value !== 'number') {",
			'      return false;  // strict mode escalates this to a TypeError',
			'    }',
			'    return Reflect.set(t, prop, value, receiver);',
			'  },',
			'});',
			'',
			"console.log('timeout:', settings.timeout);  // missing on target -> default 30",
			"console.log('theme:', settings.theme);      // existing key -> Reflect.get",
			'',
			'// The corrupting write is now a loud, catchable TypeError instead of',
			'// silent state damage — exactly the trade a set trap buys you.',
			'try {',
			"  settings.retries = 'lots';",
			'} catch (err) {',
			"  console.log('rejected write: retries');",
			'}',
			'',
			"console.log('retries:', settings.retries);  // still 3 — state protected",
			'',
		].join('\n'),
	});
})();
