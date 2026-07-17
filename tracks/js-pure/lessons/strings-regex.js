/* Strings & Regex — the everyday string method belt, then regular
 * expressions: test/match/replace, group references, and named capture
 * groups. The exercise finishes a slugify (the starter only lowercases,
 * so punctuation and spaces survive) and replaces a brittle split-based
 * date parser with named groups. The check pins "slug: hello-world-again"
 * (unreachable without the collapsing regex + edge trim), the single
 * "year 2026 / month 07 / day 16" line built from m.groups, and a
 * $-group-reference replace output ("eu date: 16.07.2026"). */
(function () {
	'use strict';
	var J = GoLearnJSP;

	// Marker id is namespaced (dgArrowJSSR) because every lesson's SVGs
	// share the page's global id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 130" width="520" height="130" role="img" aria-label="slugify pipeline: lowercase, collapse non-alphanumeric runs to dashes, trim edge dashes">' +
		'<text x="20" y="24" class="lbl">slugify: each pass returns a NEW string — the original is never touched</text>' +
		'<rect x="20" y="48" width="150" height="44" rx="6" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="95" y="68" text-anchor="middle">" Hello,  World! "</text>' +
		'<text x="95" y="85" text-anchor="middle" class="lbl">.toLowerCase()</text>' +
		'<path d="M 174 70 L 204 70" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSSR)"/>' +
		'<rect x="208" y="48" width="150" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="283" y="68" text-anchor="middle">"-hello-world-"</text>' +
		'<text x="283" y="85" text-anchor="middle" class="lbl">/[^a-z0-9]+/g → "-"</text>' +
		'<path d="M 362 70 L 392 70" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowJSSR)"/>' +
		'<rect x="396" y="48" width="108" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="450" y="68" text-anchor="middle">"hello-world"</text>' +
		'<text x="450" y="85" text-anchor="middle" class="lbl">/^-+|-+$/g → ""</text>' +
		'<defs><marker id="dgArrowJSSR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	J.lesson({
		id: 'strings-regex',
		title: 'Strings & Regex',
		nav: 'strings & regex',
		category: 'Collections & Data',

		prose: [
			'<h2>Strings &amp; Regex</h2>' +
			'<p>Strings are <strong>immutable</strong>: no method ever edits one ' +
			'in place — every operation returns a <em>new</em> string, which is ' +
			'why string code chains so naturally (and why forgetting to keep the ' +
			'return value is the classic beginner bug: <code>s.trim()</code> ' +
			'alone does nothing to <code>s</code>). The everyday belt:</p>',
			{ lang: 'js', code: 'const s = "  JavaScript  ";\ns.trim();                    // "JavaScript" — s itself unchanged\ns.trim().toLowerCase();      // "javascript"\n"hello".slice(1, 3);          // "el"   (end is exclusive)\n"a,b,c".split(",");           // ["a", "b", "c"]\n["a", "b"].join("-");         // "a-b" — split\'s inverse\n"hello".includes("ell");      // true\n"hello".startsWith("he");     // true\n"7".padStart(3, "0");         // "007"\n"ab".repeat(3);               // "ababab"' },
			'<p>When the pattern is more interesting than a fixed substring, you ' +
			'reach for a <strong>regular expression</strong>. The literal syntax ' +
			'is <code>/pattern/flags</code> — the <code>g</code> flag means ' +
			'"all matches, not just the first". <code>re.test(s)</code> answers ' +
			'yes/no; <code>s.match(re)</code> hands back what matched; ' +
			'<code>s.replace(re, sub)</code> rewrites it. In the replacement ' +
			'string, <code>$1</code>, <code>$2</code>&hellip; refer back to the ' +
			'parenthesized capture groups — replace can <em>rearrange</em> what ' +
			'it matched, not just substitute it. The replacer can even be a ' +
			'function, called once per match:</p>',
			{ lang: 'js', code: '/\\d+/.test("order 42");            // true\n"order 42".match(/\\d+/)[0];         // "42"\n\n"2026-07-16".replace(/(\\d{4})-(\\d{2})/, "$2/$1"); // "07/2026-16"\n"a-b-c".replaceAll("-", ".");       // "a.b.c" — no regex needed\n"3 + 4".replace(/\\d/g, n => n * 2); // "6 + 8" — function replacer' },
			'<p>Numbered groups get fragile as patterns grow — insert one ' +
			'parenthesis and every <code>$2</code> shifts. <strong>Named capture ' +
			'groups</strong> fix that: <code>(?&lt;year&gt;\\d{4})</code> gives ' +
			'the group a name, and after <code>const m = s.match(re)</code> you ' +
			'read <code>m.groups.year</code> — the pattern documents itself. ' +
			'Character classes round out the toolkit: <code>[^a-z0-9]</code> ' +
			'means "anything that is NOT a lowercase letter or digit", and the ' +
			'<code>+</code> quantifier makes it match a whole <em>run</em> of ' +
			'them at once — the trick behind every slugifier.</p>',
			DIAGRAM,
			'<h3>Your job</h3>' +
			'<p>Finish <code>slugify</code>: after lowercasing, collapse every ' +
			'run of non-alphanumerics into one dash with ' +
			'<code>.replace(/[^a-z0-9]+/g, \'-\')</code>, then strip leading and ' +
			'trailing dashes with <code>.replace(/^-+|-+$/g, \'\')</code>. Then ' +
			'replace the brittle <code>split</code> in <code>describeDate</code> ' +
			'with a named-group match ' +
			'(<code>(?&lt;year&gt;\\d{4})-(?&lt;month&gt;\\d{2})-(?&lt;day&gt;' +
			'\\d{2})</code>) and build the full ' +
			'<code>year &hellip; / month &hellip; / day &hellip;</code> line ' +
			'from <code>m.groups</code>. Finally, use <code>$</code>-group refs ' +
			'in a <code>replace</code> to flip the ISO date into ' +
			'<code>16.07.2026</code>.</p>' +
			'<div class="tip">Without the <code>g</code> flag, ' +
			'<code>replace</code> rewrites only the FIRST match — the slug ' +
			'would keep its later spaces and commas. And the <code>+</code> ' +
			'matters: <code>/[^a-z0-9]/g</code> (no plus) turns ",&nbsp;&nbsp;" ' +
			'into three dashes instead of one.</div>',
		],

		task: 'Finish slugify with a collapsing regex + edge trim, and parse the date with named capture groups.',

		starter: [
			'function slugify(title) {',
			'  // TODO: collapse runs of non-alphanumerics into single dashes:',
			'  //   .replace(/[^a-z0-9]+/g, \'-\')',
			'  // then strip leading/trailing dashes: .replace(/^-+|-+$/g, \'\')',
			'  return title.toLowerCase();',
			'}',
			'',
			'function describeDate(iso) {',
			'  // TODO: match with NAMED groups instead of this brittle split:',
			'  //   const m = iso.match(/(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})/);',
			'  // then return \'year … / month … / day …\' built from m.groups.',
			'  const parts = iso.split(\'-\');',
			'  return \'year \' + parts[0];',
			'}',
			'',
			'const iso = \'2026-07-16\';',
			'console.log(\'slug:\', slugify(\' Hello,  World! Again \'));',
			'console.log(describeDate(iso));',
			'',
			'// TODO: flip iso to day.month.year with $-group refs:',
			'//   iso.replace(/(\\d{4})-(\\d{2})-(\\d{2})/, \'$3.$2.$1\')',
			'console.log(\'eu date:\', iso);',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('slug: hello-world-again') !== -1 &&
				flat.indexOf('year 2026 / month 07 / day 16') !== -1 &&
				flat.indexOf('eu date: 16.07.2026') !== -1;
		},

		solution: [
			'function slugify(title) {',
			'  // One pass collapses each RUN of junk to a single dash (the +',
			'  // does the collapsing; g means every run, not just the first).',
			'  // The second pass trims dashes the first left at the edges.',
			'  return title',
			'    .toLowerCase()',
			'    .replace(/[^a-z0-9]+/g, \'-\')',
			'    .replace(/^-+|-+$/g, \'\');',
			'}',
			'',
			'function describeDate(iso) {',
			'  // Named groups make the pattern self-documenting and immune to',
			'  // group renumbering — no counting parentheses to find index 2.',
			'  const m = iso.match(/(?<year>\\d{4})-(?<month>\\d{2})-(?<day>\\d{2})/);',
			'  return \'year \' + m.groups.year +',
			'    \' / month \' + m.groups.month +',
			'    \' / day \' + m.groups.day;',
			'}',
			'',
			'const iso = \'2026-07-16\';',
			'console.log(\'slug:\', slugify(\' Hello,  World! Again \'));',
			'console.log(describeDate(iso));',
			'',
			'// $1/$2/$3 refer back to the numbered capture groups, so replace',
			'// can REARRANGE the match — day first, dots instead of dashes.',
			'console.log(\'eu date:\', iso.replace(/(\\d{4})-(\\d{2})-(\\d{2})/, \'$3.$2.$1\'));',
			'',
		].join('\n'),
	});
})();
