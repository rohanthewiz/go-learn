/* Objects — literals, shorthand and computed keys, entries iteration, and
 * the two modern safety operators: optional chaining ?. and nullish
 * coalescing ??. The exercise merges a user config over defaults; the check
 * pins `retries: 0` because that line is unreachable with || (which clobbers
 * the intentional 0 back to the default 3) — the exact bug ?? was added to
 * the language to fix — plus a ?.-guarded nested lookup and an
 * Object.entries loop with destructuring.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// The same falsy-but-real 0 sent through || and ??. Marker ids are
	// namespaced (dgArrowJSOB*) because all tracks share one id space.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 170" width="520" height="170" role="img" aria-label="config.retries is 0; the || operator clobbers it to the default 3, while ?? keeps the 0">' +
		'<text x="20" y="22" class="lbl">the same 0 through both fallback operators</text>' +
		'<rect x="30" y="70" width="170" height="52" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="115" y="92" text-anchor="middle">config.retries</text>' +
		'<text x="115" y="110" text-anchor="middle" class="lbl">0 — falsy, but real</text>' +
		'<path d="M 202 84 L 316 60" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowJSOBbad)"/>' +
		'<text x="258" y="58" text-anchor="middle" class="lbl">|| 3</text>' +
		'<rect x="320" y="34" width="170" height="50" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="405" y="55" text-anchor="middle">3</text>' +
		'<text x="405" y="73" text-anchor="middle" class="lbl">clobbered: any falsy falls through</text>' +
		'<path d="M 202 108 L 316 132" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSOB)"/>' +
		'<text x="258" y="140" text-anchor="middle" class="lbl">?? 3</text>' +
		'<rect x="320" y="108" width="170" height="50" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="405" y="129" text-anchor="middle">0</text>' +
		'<text x="405" y="147" text-anchor="middle" class="lbl">kept: not null/undefined</text>' +
		'<defs>' +
		'<marker id="dgArrowJSOB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowJSOBbad" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	J.lesson({
		id: 'objects',
		title: 'Objects',
		nav: 'objects',
		category: 'Collections & Data',

		prose: [
			'<h2>Objects</h2>' +
			'<p>The object literal is JavaScript\'s workhorse record: braces around ' +
			'<code>key: value</code> pairs. Two modern conveniences make literals ' +
			'terser: <strong>property shorthand</strong> — when a variable and the ' +
			'key share a name, <code>{ name }</code> means <code>{ name: name }</code> ' +
			'— and <strong>computed keys</strong>, where <code>[expr]</code> in key ' +
			'position evaluates the expression and uses the <em>result</em> as the ' +
			'property name:</p>',
			{ lang: 'js', code: 'const name = "ada";\nconst key = "role";\n\nconst user = {\n  name,                 // shorthand: same as name: name\n  [key]: "admin",       // computed: the value of key becomes the property name\n  "hyphen-ated": true,  // quoted keys allow any string\n};' },
			'<p>Dot access (<code>user.name</code>) works when the key is a valid ' +
			'identifier you know at write-time; bracket access ' +
			'(<code>user["hyphen-ated"]</code>, <code>user[key]</code>) covers ' +
			'everything else — punctuation in keys, and keys held in variables. To ' +
			'walk an object there are three sibling helpers: <code>Object.keys</code>, ' +
			'<code>Object.values</code>, and <code>Object.entries</code>. The last ' +
			'returns <code>[key, value]</code> pairs, which pairs perfectly with ' +
			'destructuring in a <code>for...of</code> loop:</p>',
			{ lang: 'js', code: 'const cfg = { retries: 3, theme: "dark" };\nObject.keys(cfg);     // ["retries", "theme"]\nObject.values(cfg);   // [3, "dark"]\nfor (const [key, value] of Object.entries(cfg)) {\n  console.log(key + " = " + value);\n}' },
			'<p>Deep access is where objects bite. ' +
			'<code>user.settings.display.theme</code> throws the moment any link in ' +
			'the chain is <code>null</code> or <code>undefined</code>. ' +
			'<strong>Optional chaining</strong> <code>?.</code> short-circuits ' +
			'instead: <code>user.settings?.display?.theme</code> yields ' +
			'<code>undefined</code> at the first missing link and never throws. It ' +
			'works for calls too — <code>onReady?.()</code> invokes the callback ' +
			'only if one was actually supplied.</p>' +
			'<p>Its partner is <strong>nullish coalescing</strong> <code>??</code>: ' +
			'<code>a ?? b</code> produces <code>b</code> only when <code>a</code> is ' +
			'<code>null</code> or <code>undefined</code>. That precision is the whole ' +
			'point — the older idiom <code>a || b</code> falls back on <em>any</em> ' +
			'falsy value, and <code>0</code>, <code>""</code>, and <code>false</code> ' +
			'are often perfectly meaningful settings ("no retries", "empty prefix", ' +
			'"feature off") that <code>||</code> silently overwrites:</p>',
			{ lang: 'js', code: 'const config = { retries: 0 };   // 0 on purpose: never retry\nconfig.retries || 3;   // 3 — WRONG: the real 0 was thrown away\nconfig.retries ?? 3;   // 0 — only null/undefined fall through' },
			DIAGRAM +
			'<p>Two small tools round out the kit: <code>delete cfg.theme</code> ' +
			'removes a property entirely, and the <code>in</code> operator ' +
			'(<code>"theme" in cfg</code>) asks whether the key <em>exists</em> — ' +
			'subtly different from checking the value, because a key can exist and ' +
			'hold <code>undefined</code>.</p>',
			'<h3>Your job</h3>' +
			'<p>The starter merges a user config over defaults with <code>||</code>, ' +
			'which destroys the intentional <code>retries: 0</code>, and guards a ' +
			'nested lookup with a clumsy <code>&amp;&amp;</code> chain. Switch the ' +
			'fallbacks to <code>??</code>, the nested lookup to <code>?.</code>, and ' +
			'convert the key-only loop to <code>Object.entries</code> with ' +
			'<code>[key, value]</code> destructuring, printing each line as ' +
			'<code>key = value</code>.</p>' +
			'<div class="tip"><code>a ?? b</code> reads as: use <code>a</code> ' +
			'unless it is <em>absent</em>. <code>a || b</code> reads as: use ' +
			'<code>a</code> unless it is <em>falsy</em>. Config merging almost ' +
			'always means the first.</div>',
		],

		task: 'Switch the || fallbacks to ??, guard the nested theme lookup with ?., and print defaults via an Object.entries destructuring loop.',

		starter: [
			'const defaults = { retries: 3, timeout: 5000, theme: "dark" };',
			'const config = { retries: 0, timeout: 8000 };  // 0 is intentional: never retry!',
			'',
			'// TODO: || treats 0 as "missing" — switch both fallbacks to ?? so the',
			'// explicit 0 survives the merge.',
			'const retries = config.retries || defaults.retries;',
			'const timeout = config.timeout || defaults.timeout;',
			'console.log("retries:", retries);',
			'console.log("timeout:", timeout);',
			'',
			'const user = { name: "ada", settings: { volume: 7 } };  // no .display yet',
			'',
			'// TODO: replace this && guard chain with user.settings?.display?.theme',
			'// and use ?? defaults.theme for the fallback.',
			'const theme = (user.settings && user.settings.display && user.settings.display.theme) || defaults.theme;',
			'console.log("theme:", theme);',
			'',
			'// TODO: loop over Object.entries(defaults) with [key, value]',
			'// destructuring and print each line as: key = value',
			'for (const key of Object.keys(defaults)) {',
			'  console.log(key);',
			'}',
			'',
			'const summary = { retries, theme };  // property shorthand',
			'console.log(summary);',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('retries: 0') !== -1 &&
				flat.indexOf('timeout: 8000') !== -1 &&
				flat.indexOf('theme: dark') !== -1 &&
				flat.indexOf('retries = 3') !== -1 &&
				flat.indexOf('timeout = 5000') !== -1 &&
				flat.indexOf('theme = dark') !== -1 &&
				flat.indexOf('{"retries":0,"theme":"dark"}') !== -1;
		},

		solution: [
			'const defaults = { retries: 3, timeout: 5000, theme: "dark" };',
			'const config = { retries: 0, timeout: 8000 };  // 0 is intentional: never retry!',
			'',
			'// ?? falls back ONLY on null/undefined, so the explicit 0 survives.',
			'// || would have treated 0 as missing and silently restored 3.',
			'const retries = config.retries ?? defaults.retries;',
			'const timeout = config.timeout ?? defaults.timeout;',
			'console.log("retries:", retries);',
			'console.log("timeout:", timeout);',
			'',
			'const user = { name: "ada", settings: { volume: 7 } };  // no .display yet',
			'',
			'// ?. stops at the first missing link and yields undefined instead of',
			'// throwing; ?? then supplies the default for exactly that case.',
			'const theme = user.settings?.display?.theme ?? defaults.theme;',
			'console.log("theme:", theme);',
			'',
			'// entries + destructuring: one loop gives key AND value — no second',
			'// lookup back into the object.',
			'for (const [key, value] of Object.entries(defaults)) {',
			'  console.log(key + " = " + value);',
			'}',
			'',
			'const summary = { retries, theme };  // property shorthand',
			'console.log(summary);',
			'',
		].join('\n'),
	});
})();
