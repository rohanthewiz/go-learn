/* functions-args — Python's calling convention as a spectrum: positional,
 * keyword, defaults, *args (tuple), **kwargs (dict), keyword-only after *,
 * positional-only after /, and unpacking at the CALL site. Starter ships a
 * brittle describe(name, tag1, tag2) with a hardcoded " | " join; solution
 * generalizes to describe(name, *tags, sep=", ", **meta) and calls it three
 * ways, the last via **opts unpacking. Check pins the joined-tags line, the
 * alphabetically-sorted meta lines (sorted() on kwargs items keeps the pin
 * independent of call order), and the unpacked call's distinctive " + "
 * separator + engine=columnar — none reachable with the fixed signature.
 */
(function () {
	'use strict';

	GoLearnPy.lesson({
		id: 'functions-args',
		title: 'Function Arguments',
		nav: 'Arguments',
		category: 'Functions',

		prose: [
			'<h2>Function Arguments</h2>' +
			'<p>Go gives you exactly one way to call a function: every argument, ' +
			'in order. Python gives you a spectrum. Any parameter can be passed ' +
			'<em>positionally</em> or <em>by keyword</em> ' +
			'(<code>f(host, port=5433)</code>), parameters can declare defaults, ' +
			'and two collector forms soak up whatever else arrives: ' +
			'<code>*args</code> packs surplus positionals into a ' +
			'<strong>tuple</strong>, and <code>**kwargs</code> packs surplus ' +
			'keyword arguments into a <strong>dict</strong>.</p>',
			{ lang: 'py', code: 'def connect(host, /, port=5432, *, timeout=1.0):\n    ...\n\n# host is positional-only (before /), timeout keyword-only (after *):\nconnect("db.local", 5433)\nconnect("db.local", timeout=2.5)   # skip port, NAME what you change\n\npair = ("db.local", 5433)\nconnect(*pair)                     # unpack a sequence into positionals' },
			'<p>Two markers refine the spectrum. A bare <code>*</code> in the ' +
			'parameter list (or a <code>*args</code>) makes everything after it ' +
			'<strong>keyword-only</strong> — callers must write ' +
			'<code>timeout=2.5</code>, which keeps call sites self-documenting ' +
			'and lets you reorder or add options without breaking anyone. A ' +
			'<code>/</code> makes everything before it ' +
			'<strong>positional-only</strong> — rarer, used when the parameter ' +
			'name is meaningless to callers. The same stars work in reverse at ' +
			'the <em>call site</em>: <code>f(*pair)</code> sprays a sequence into ' +
			'positionals, <code>f(**opts)</code> sprays a dict into keyword ' +
			'arguments.</p>' +
			'<p>Coming from Go: <code>**kwargs</code> plus keyword-only defaults ' +
			'is what you reach for option structs or functional options for — one ' +
			'<code>def</code> line replaces the config struct, its zero-value ' +
			'ceremony, and the stack of <code>WithTimeout(...)</code> ' +
			'constructors.</p>' +
			'<h3>Your job</h3>' +
			'<p>Generalize <code>describe</code> to ' +
			'<code>def describe(name, *tags, sep=", ", **meta)</code>: print the ' +
			'name, the tags joined with <code>sep</code>, and each meta entry as ' +
			'an indented <code>key=value</code> line — iterate ' +
			'<code>sorted(meta.items())</code> so the output order is stable. ' +
			'Then make the three calls listed in the starter, the last one ' +
			'unpacking an <code>opts</code> dict with <code>**</code>.</p>' +
			'<div class="tip"><code>*tags</code> is a tuple and ' +
			'<code>**meta</code> is a plain dict — nothing magic once inside the ' +
			'function. kwargs dicts do preserve call order, but sorting before ' +
			'printing means your output never depends on how a caller happened to ' +
			'spell the call.</div>',
		],

		task: 'Generalize describe(name, *tags, sep=", ", **meta) and call it three ways — the last via **opts unpacking.',

		starter: [
			'# Brittle: exactly two tags, hardcoded separator, no metadata.',
			'# TODO: def describe(name, *tags, sep=", ", **meta) — *tags collects',
			'# any number of positionals; sep becomes keyword-only; **meta',
			'# collects unknown keyword args into a dict.',
			'def describe(name, tag1, tag2):',
			'    print("name:", name)',
			'    print("tags:", tag1 + " | " + tag2)',
			'',
			'describe("redis", "cache", "fast")',
			'',
			'# TODO: once generalized, replace the call above with these three:',
			'#   describe("redis", "cache", "fast", "kv")',
			'#   describe("sqlite", "embedded", sep=" / ", pages=4096, lang="c")',
			'#   opts = {"sep": " + ", "engine": "columnar"}',
			'#   describe("duckdb", "olap", "fast", **opts)',
			'# In describe, print the tags joined with sep, and each meta entry',
			'# as an indented k=v line — iterate sorted(meta.items()).',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('tags: cache, fast, kv') !== -1 &&
				// sorted(meta.items()) puts lang before pages:
				flat.indexOf('lang=c') !== -1 &&
				flat.indexOf('pages=4096') !== -1 &&
				flat.indexOf('lang=c') < flat.indexOf('pages=4096') &&
				// the **opts call: sep " + " and the meta it carried:
				flat.indexOf('tags: olap + fast') !== -1 &&
				flat.indexOf('engine=columnar') !== -1;
		},

		solution: [
			'def describe(name, *tags, sep=", ", **meta):',
			'    # *tags collects surplus positionals into a TUPLE.',
			'    # sep sits after *tags, so it is keyword-only: callers must',
			'    # write sep=..., which keeps call sites readable.',
			'    # **meta collects unknown keyword args into a DICT.',
			'    print("name:", name)',
			'    print("tags:", sep.join(tags))',
			'    # sorted() so output never depends on the caller\'s arg order.',
			'    for k, v in sorted(meta.items()):',
			'        print(f"  {k}={v}")',
			'',
			'# 1) all positional — the extra tags flow into *tags:',
			'describe("redis", "cache", "fast", "kv")',
			'',
			'# 2) mixed — sep named (it must be), surplus keywords into **meta:',
			'describe("sqlite", "embedded", sep=" / ", pages=4096, lang="c")',
			'',
			'# 3) unpacking at the CALL site: **opts sprays the dict into',
			'# keyword args, exactly as if each pair were typed out.',
			'opts = {"sep": " + ", "engine": "columnar"}',
			'describe("duckdb", "olap", "fast", **opts)',
			'',
		].join('\n'),

		explanation: [
			'<p>One signature now serves every caller. ' +
			'<code>*tags</code> made the tag count flexible — the redis call\'s ' +
			'three tags arrive as the tuple <code>("cache", "fast", "kv")</code> ' +
			'and <code>sep.join(tags)</code> prints them. Because ' +
			'<code>sep</code> is declared <em>after</em> <code>*tags</code>, it ' +
			'is keyword-only: <code>sep=" / "</code> in the sqlite call could ' +
			'never be swallowed as a fourth tag by mistake.</p>',
			'<p>The sqlite call\'s <code>pages=4096, lang="c"</code> match no ' +
			'named parameter, so they land in <code>meta</code>; iterating ' +
			'<code>sorted(meta.items())</code> prints <code>lang=c</code> before ' +
			'<code>pages=4096</code> regardless of call order — that stability is ' +
			'what the check pins. The duckdb call shows the mirror image of ' +
			'collection: <code>**opts</code> unpacks a dict <em>at the call ' +
			'site</em>, so <code>sep</code> is found by name and ' +
			'<code>engine</code> flows through to <code>meta</code>.</p>',
		],
	});
})();
