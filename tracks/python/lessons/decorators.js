/* decorators — functions are values; a decorator is a callable f -> wrapper
 * with the closure capturing f; `@` is pure sugar. The starter wires
 * traced_add = trace(add) by hand and shows the identity cost: __name__ is
 * 'wrapper'. The solution applies the sugar plus functools.wraps (check pins
 * the preserved name and asserts 'name: wrapper' is gone), and adds @memoize
 * whose "computing" line printing exactly once is the cache evidence
 * (indexOf === lastIndexOf). A small SVG shows the three nested defs of a
 * decorator factory; ids namespaced dgPYDC*.
 */
(function () {
	'use strict';

	// Decorator WITH arguments = three layers: factory(arg) -> decorator(f)
	// -> wrapper(*args). Each arrow is one call; @retries(3) fires the first
	// two at def time. Ids/markers namespaced dgPYDC — SVG ids are page-global.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 190" width="540" height="190" role="img" aria-label="decorator factory: three nested defs, applied as two calls at def time">' +
		'<text x="20" y="22" class="lbl">@retries(3) — the factory call, then the decorator call, both at def time</text>' +
		'<rect x="20" y="40" width="500" height="130" rx="8" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="36" y="62">retries(times)</text>' +
		'<text x="36" y="80" class="lbl">factory: takes the ARGUMENT</text>' +
		'<rect x="50" y="92" width="440" height="66" rx="6" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="66" y="114">deco(f)</text>' +
		'<text x="66" y="132" class="lbl">the real decorator: takes the FUNCTION</text>' +
		'<rect x="280" y="102" width="190" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="375" y="122" text-anchor="middle">wrapper(*args)</text>' +
		'<text x="375" y="138" text-anchor="middle" class="lbl">runs per CALL; sees times &amp; f</text>' +
		'<path d="M 160 118 L 274 118" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgPYDCarrow)"/>' +
		'<defs><marker id="dgPYDCarrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	GoLearnPy.lesson({
		id: 'decorators',
		title: 'Decorators',
		nav: 'Decorators',
		category: 'Power Features',

		prose: [
			'<h2>Decorators</h2>' +
			'<p>Functions are ordinary values: you can pass one to a function and ' +
			'return one from a function. A <strong>decorator</strong> is nothing ' +
			'more than a callable that takes a function <code>f</code> and returns ' +
			'a replacement — usually a <code>wrapper</code> that does something ' +
			'extra, then calls <code>f</code>. The wrapper reaches <code>f</code> ' +
			'through its closure, so the pair travels together forever. The ' +
			'<code>@</code> line is pure sugar:</p>',
			{ lang: 'py', code: '@trace\ndef add(a, b): ...\n\n# is EXACTLY:\ndef add(a, b): ...\nadd = trace(add)   # rebind the name to the wrapper' },
			'<p>Sugar has a hidden cost: after decoration, the name ' +
			'<code>add</code> points at <code>wrapper</code>, so ' +
			'<code>add.__name__</code> reports <code>wrapper</code> — which ruins ' +
			'logs, tracebacks, and <code>help()</code>. ' +
			'<code>functools.wraps(f)</code> (itself a decorator, applied to the ' +
			'wrapper) copies <code>__name__</code>, <code>__doc__</code>, and ' +
			'friends across. Use it in every decorator you write; the check here ' +
			'refuses to pass without it.</p>' +
			'<p>Want a decorator that takes arguments, like ' +
			'<code>@retries(3)</code>? That needs one more layer: a ' +
			'<em>factory</em> whose call returns the decorator — three nested ' +
			'<code>def</code>s, two calls at definition time:</p>',
			DIAGRAM,
			{ lang: 'py', code: 'def retries(times):            # factory: takes the argument\n    def deco(f):               # decorator: takes the function\n        @functools.wraps(f)\n        def wrapper(*args):    # runs per call; closes over times AND f\n            for _ in range(times):\n                ...\n        return wrapper\n    return deco' },
			'<p><em>Coming from Go:</em> the shape exists there too — ' +
			'<code>func(http.HandlerFunc) http.HandlerFunc</code> middleware is a ' +
			'decorator by hand. Python just gives the rebinding a syntax and makes ' +
			'it idiomatic for cross-cutting concerns: tracing, caching, auth, ' +
			'retry.</p>' +
			'<h3>Your job</h3>' +
			'<p>The starter wires <code>traced_add = trace(add)</code> manually and ' +
			'prints the identity damage: <code>name: wrapper</code>. Apply the ' +
			'<code>@trace</code> sugar, add <code>@functools.wraps(f)</code> so the ' +
			'name survives, then write <code>@memoize</code>: a closure-owned cache ' +
			'dict where <code>computing n</code> prints only on a miss — call it ' +
			'twice with the same argument to prove the second call never touches ' +
			'the real function.</p>' +
			'<div class="tip">Decoration happens once, at <code>def</code> time; ' +
			'the wrapper runs on every call. Keep per-call work in the wrapper and ' +
			'one-time setup (like the cache dict) in the decorator body — that ' +
			'split is the whole design.</div>',
		],

		task: 'Use @trace with functools.wraps so __name__ survives, then add @memoize with a "computing" line that prints only on cache misses.',

		starter: [
			'# A decorator is just a function taking a function. No sugar yet.',
			'def trace(f):',
			'    # TODO: @functools.wraps(f) here — without it the wrapper',
			'    # steals f\'s identity (watch the "name:" line print "wrapper").',
			'    def wrapper(*args, **kwargs):',
			'        result = f(*args, **kwargs)',
			'        print(f"trace: {f.__name__}{args} -> {result}")',
			'        return result',
			'    return wrapper',
			'',
			'# TODO: replace the manual wiring below with the @trace sugar on add.',
			'def add(a, b):',
			'    return a + b',
			'',
			'traced_add = trace(add)      # what @trace does, spelled out',
			'traced_add(2, 3)',
			'print("name:", traced_add.__name__)   # "wrapper" — identity lost',
			'',
			'# TODO: write memoize(f): closure-owned cache dict; print("computing", n)',
			'# ONLY on a miss; decorate slow_square with it and call it twice with 4.',
			'def slow_square(n):',
			'    return n * n',
			'',
			'print("result:", slow_square(4))',
			'print("result:", slow_square(4))   # recomputed — no cache yet',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			var iComputing = flat.indexOf('computing 4');
			return flat.indexOf('trace: add(2, 3) -> 5') !== -1 &&   // the @trace line
				flat.indexOf('name: add') !== -1 &&                  // wraps preserved identity
				flat.indexOf('name: wrapper') === -1 &&              // ...and the theft is gone
				iComputing !== -1 &&
				iComputing === flat.lastIndexOf('computing 4') &&    // computed exactly ONCE
				/result: 16.*result: 16/.test(flat) &&               // both calls still answer
				iComputing < flat.indexOf('result: 16');
		},

		solution: [
			'import functools',
			'',
			'# A decorator: takes a function, returns a replacement. The wrapper',
			'# reaches f through its closure — the pair travels together.',
			'def trace(f):',
			'    @functools.wraps(f)          # copy __name__/__doc__ onto the wrapper',
			'    def wrapper(*args, **kwargs):',
			'        result = f(*args, **kwargs)',
			'        print(f"trace: {f.__name__}{args} -> {result}")',
			'        return result',
			'    return wrapper',
			'',
			'@trace                            # sugar for: add = trace(add)',
			'def add(a, b):',
			'    return a + b',
			'',
			'add(2, 3)',
			'print("name:", add.__name__)      # "add" — wraps preserved the identity',
			'',
			'# Memoize: the CLOSURE owns the cache (one dict per decorated function,',
			'# created at def time). "computing" prints only when the real f runs.',
			'def memoize(f):',
			'    cache = {}',
			'    @functools.wraps(f)',
			'    def wrapper(n):',
			'        if n not in cache:',
			'            print("computing", n)',
			'            cache[n] = f(n)',
			'        return cache[n]',
			'    return wrapper',
			'',
			'@memoize',
			'def slow_square(n):',
			'    return n * n',
			'',
			'print("result:", slow_square(4))',
			'print("result:", slow_square(4))   # cache hit — no second "computing" line',
			'',
		].join('\n'),

		explanation: [
			'<p><code>@trace</code> rebinds <code>add</code> to the wrapper at ' +
			'<code>def</code> time — the exact moral equivalent of the starter\'s ' +
			'<code>traced_add = trace(add)</code>, just under the original name. ' +
			'Inside, <code>@functools.wraps(f)</code> decorates the wrapper itself, ' +
			'copying <code>f</code>\'s metadata across, which is why ' +
			'<code>add.__name__</code> now prints <code>add</code> instead of ' +
			'<code>wrapper</code>.</p>',
			'<p><code>memoize</code> shows the def-time/call-time split: ' +
			'<code>cache = {}</code> runs once per decorated function, so each gets ' +
			'a private dict via the closure — no globals, no class. The wrapper ' +
			'consults it per call; <code>computing 4</code> appearing exactly once ' +
			'while <code>result: 16</code> appears twice is the proof the second ' +
			'call never reached <code>slow_square</code>. (The stdlib ships this as ' +
			'<code>functools.lru_cache</code> — same shape, plus eviction.)</p>',
		],
	});
})();
