/* Anatomy of a Rule — Foundations (lesson). What CSS fundamentally is:
 * rules that MATCH elements and declare properties. Stylus strips the
 * ceremony so the anatomy is all that's left on screen.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	// One rule, labeled: selector, property, value. The vocabulary every
	// later lesson leans on.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 170" width="520" height="170" role="img" aria-label="a CSS rule: the selector picks elements, each declaration is a property and a value">' +
		'<text x="20" y="24" class="lbl">one rule — Stylus on the left, the CSS it compiles to on the right</text>' +
		'<text x="40" y="66" style="font-size:13px">h1</text>' +
		'<text x="60" y="90" style="font-size:13px">color #223</text>' +
		'<text x="60" y="114" style="font-size:13px">font-size 2rem</text>' +
		'<text x="270" y="66" style="font-size:13px">h1 {</text>' +
		'<text x="290" y="90" style="font-size:13px">color: #223;</text>' +
		'<text x="290" y="114" style="font-size:13px">font-size: 2rem;</text>' +
		'<text x="270" y="138" style="font-size:13px">}</text>' +
		'<path d="M 40 72 L 40 132" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="30" y="156" class="lbl" style="fill:var(--accent)">selector — which elements</text>' +
		'<rect x="284" y="78" width="46" height="16" rx="3" fill="none" stroke="var(--ok)" stroke-width="1.4"/>' +
		'<rect x="334" y="78" width="42" height="16" rx="3" fill="none" stroke="var(--warn)" stroke-width="1.4"/>' +
		'<text x="392" y="90" class="lbl"><tspan style="fill:var(--ok)">property</tspan> : <tspan style="fill:var(--warn)">value</tspan></text>' +
		'</svg>';

	T.lesson({
		id: 'hello-css',
		title: 'Anatomy of a Rule',
		nav: 'anatomy of a rule',
		category: 'Foundations',

		prose: [
			'<h2>Anatomy of a Rule</h2>' +
			'<p>CSS is one idea repeated: a <strong>rule</strong> names some elements ' +
			'(the <em>selector</em>) and declares how they look (<em>property: ' +
			'value</em> pairs). The browser reads your document, and for every ' +
			'element asks "which rules match this?" — matching declarations apply, ' +
			'layered over the browser\'s own defaults (headings are already bold and ' +
			'large before you write a thing).</p>' +
			DIAGRAM +
			'<p>This track writes styles in <strong>Stylus</strong>: the same ' +
			'properties and values, with indentation doing the work of braces and ' +
			'semicolons — less punctuation between you and the principle. The sheet ' +
			'compiles to plain CSS (via <a href="https://github.com/rohanthewiz/go-styl">go-styl</a>, ' +
			'running live in this page), and the output pane always shows the ' +
			'<em>real CSS</em> the browser would receive. That output is what each ' +
			'lesson checks.</p>',
			{ lang: 'css', code: 'h1\n\tcolor #223\n\tfont-size 2rem\n\np\n\tline-height 1.6' },
			'<p>Two style notes that carry through the whole track: values like ' +
			'<code>2rem</code> are relative units (a later lesson); and ' +
			'<code>line-height 1.6</code> is deliberately unitless — comfortable ' +
			'body-text leading is the single cheapest readability win in CSS.</p>' +
			'<h3>Your job</h3>' +
			'<p>The sheet styles <code>h1</code>\'s color only. Give the heading a ' +
			'<code>font-size</code> of <code>2rem</code>, and add a second rule: ' +
			'<code>p</code> with <code>line-height 1.6</code>. Watch the compiled ' +
			'CSS appear as you type.</p>',
		],

		task: 'Add font-size 2rem to h1, and a p rule with line-height 1.6.',

		starter: T.program([
			'h1',
			'	color #223',
		]),

		check: function (stdout, flat) {
			return flat.indexOf('font-size: 2rem;') !== -1 &&
				flat.indexOf('p {') !== -1 &&
				flat.indexOf('line-height: 1.6;') !== -1;
		},

		solution: T.program([
			'h1',
			'	color #223',
			'	font-size 2rem',
			'',
			'// a second rule: selectors are independent — each matches on its own',
			'p',
			'	line-height 1.6',
		]),
	});
})();
