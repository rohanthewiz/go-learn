/* Maps & Sets — why Map beats a plain object as a dictionary (any key type,
 * insertion-order iteration, .size, no prototype baggage) and Set for O(1)
 * uniqueness. The exercise is an honest prototype-pollution bug: counting
 * the word "constructor" in a plain object starts the tally from an
 * inherited FUNCTION, so the count comes out as garbage string concat. The
 * check pins the runner's byte-stable `Map(3) { ... }` rendering — only a
 * real Map prints that — plus a Set-based dedupe the starter's adjacent-only
 * loop cannot produce.
 */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// A "fresh, empty" object still has a populated prototype chain behind
	// it; a Map holds own entries only. Marker ids namespaced dgArrowJSMS*.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-label="a plain object lookup falls through to Object.prototype and finds constructor; a Map has own entries only">' +
		'<text x="20" y="22" class="lbl">counts = {} is not empty to the lookup — the prototype chain answers too</text>' +
		'<rect x="30" y="40" width="210" height="52" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="135" y="62" text-anchor="middle">Object.prototype</text>' +
		'<text x="135" y="80" text-anchor="middle" class="lbl">constructor, toString, ...</text>' +
		'<rect x="30" y="122" width="210" height="52" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="135" y="144" text-anchor="middle">counts["constructor"]</text>' +
		'<text x="135" y="162" text-anchor="middle" class="lbl">no own key — chain finds a function</text>' +
		'<path d="M 135 118 L 135 96" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowJSMSup)"/>' +
		'<rect x="300" y="122" width="190" height="52" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="395" y="144" text-anchor="middle">Map(2) { map =&gt; 2, set =&gt; 1 }</text>' +
		'<text x="395" y="162" text-anchor="middle" class="lbl">own entries only, nothing inherited</text>' +
		'<defs><marker id="dgArrowJSMSup" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	J.lesson({
		id: 'maps-sets',
		title: 'Maps & Sets',
		nav: 'maps & sets',
		category: 'Collections & Data',

		prose: [
			'<h2>Maps &amp; Sets</h2>' +
			'<p>A plain object looks like a dictionary but was never quite one. ' +
			'Its keys can only be strings or symbols — everything else gets ' +
			'coerced — and it is born with baggage: every <code>{}</code> inherits ' +
			'from <code>Object.prototype</code>, so <code>counts["constructor"]</code> ' +
			'on a "fresh, empty" object finds a <em>function</em> you never put ' +
			'there. <code>Map</code> is the real dictionary: <strong>any</strong> ' +
			'key type (objects included), guaranteed insertion-order iteration, a ' +
			'<code>.size</code> property instead of ' +
			'<code>Object.keys(o).length</code>, and no inherited keys — ever.</p>' +
			DIAGRAM,
			{ lang: 'js', code: 'const m = new Map();\nm.set("a", 1).set("b", 2);  // set returns the map — chainable\nm.get("a");                 // 1\nm.get("zzz");               // undefined (use ?? for a default)\nm.has("b");                 // true\nm.delete("b");              // true — and m.size is now 1\nfor (const [k, v] of m) {   // entries, always in insertion order\n  console.log(k, v);\n}' },
			'<p><code>Set</code> is the same idea for bare values: each value is ' +
			'stored once, so uniqueness is free. Its quiet superpower is ' +
			'<code>has</code> — membership is an O(1) hash lookup, where ' +
			'<code>array.includes</code> scans O(n); inside a loop that is the ' +
			'difference between linear and quadratic. Conversions in both ' +
			'directions are one-liners:</p>',
			{ lang: 'js', code: 'const seen = new Set(["a", "b", "a"]);  // Set(2) { a, b } — repeat dropped\nseen.has("a");                          // true, O(1)\nconst arr = [...seen];                  // Set -> array\nconst m = new Map(Object.entries({ a: 1, b: 2 }));  // object -> Map' },
			'<p>This console renders both natively and stably: ' +
			'<code>console.log(map)</code> prints ' +
			'<code>Map(2) { a =&gt; 1, b =&gt; 2 }</code> and a set prints ' +
			'<code>Set(3) { 1, 2, 3 }</code> — so log the structure directly ' +
			'rather than converting it first.</p>' +
			'<p>One paragraph on <code>WeakMap</code>: keys must be objects, and ' +
			'they are held <em>weakly</em> — when the key object is garbage-' +
			'collected, the entry silently vanishes, which is also why a WeakMap ' +
			'is not iterable and has no <code>.size</code>. That trade makes it ' +
			'the tool for attaching metadata to objects you do not own (DOM nodes, ' +
			'library instances) without leaking memory by keeping them alive.</p>',
			'<h3>Your job</h3>' +
			'<p>The starter counts word frequencies into a plain object, and the ' +
			'word <code>"constructor"</code> wrecks it: the tally starts from the ' +
			'inherited function, so <code>+ 1</code> becomes string concatenation ' +
			'and prints garbage. It also "dedupes" tags by comparing each item ' +
			'only to its neighbor, which misses every non-adjacent repeat. Replace ' +
			'the counter with a <code>Map</code> (and log the Map directly), read ' +
			'the fixed count back with <code>get</code>, and dedupe with ' +
			'<code>[...new Set(tags)]</code>.</p>' +
			'<div class="tip">The broken counter is not contrived — ' +
			'<code>counts[w] = (counts[w] || 0) + 1</code> appears in real bug ' +
			'reports whenever user input can contain <code>constructor</code>, ' +
			'<code>toString</code>, or <code>hasOwnProperty</code>. A Map makes ' +
			'the whole class of bug unrepresentable.</div>',
		],

		task: 'Count word frequencies in a Map (log it directly, read one count with get) and dedupe the tags with [...new Set(tags)].',

		starter: [
			'const words = ["map", "constructor", "map", "set", "constructor"];',
			'',
			'// TODO: replace the plain object with a Map:',
			'//   const counts = new Map();',
			'//   counts.set(w, (counts.get(w) ?? 0) + 1);',
			'const counts = {};',
			'for (const w of words) {',
			'  counts[w] = (counts[w] || 0) + 1;  // "constructor" inherits a function!',
			'}',
			'console.log(counts);',
			'',
			'// TODO: read it back with counts.get("constructor")',
			'console.log("constructor count:", counts["constructor"]);',
			'',
			'const tags = ["js", "map", "js", "set", "map", "weak"];',
			'// TODO: dedupe with a Set instead: const unique = [...new Set(tags)];',
			'const unique = [];',
			'for (const t of tags) {',
			'  if (unique[unique.length - 1] !== t) unique.push(t);  // only catches ADJACENT repeats',
			'}',
			'console.log("unique:", unique.length);',
			'console.log("tags:", unique.join(", "));',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('Map(3) { map => 2, constructor => 2, set => 1 }') !== -1 &&
				flat.indexOf('constructor count: 2') !== -1 &&
				flat.indexOf('unique: 4') !== -1 &&
				flat.indexOf('tags: js, map, set, weak') !== -1;
		},

		solution: [
			'const words = ["map", "constructor", "map", "set", "constructor"];',
			'',
			'// A Map holds own data only - no prototype chain for "constructor" to',
			'// collide with - and iterates in insertion order. ?? (not ||) keeps the',
			'// habit honest: a legitimate 0 count would survive it.',
			'const counts = new Map();',
			'for (const w of words) {',
			'  counts.set(w, (counts.get(w) ?? 0) + 1);',
			'}',
			'console.log(counts);',
			'',
			'// get() reads only real entries, so this is the true tally: 2.',
			'console.log("constructor count:", counts.get("constructor"));',
			'',
			'const tags = ["js", "map", "js", "set", "map", "weak"];',
			'// Set drops repeats on construction (O(1) membership, insertion order',
			'// preserved); spread turns it straight back into an array.',
			'const unique = [...new Set(tags)];',
			'console.log("unique:", unique.length);',
			'console.log("tags:", unique.join(", "));',
			'',
		].join('\n'),
	});
})();
