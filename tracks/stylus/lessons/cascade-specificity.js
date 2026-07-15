/* The Cascade & Specificity — Foundations (lesson). What happens when two
 * rules disagree: specificity decides, source order breaks ties. The
 * learner wins a fight the polite way — by writing a more specific
 * selector, not by reaching for !important.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	T.lesson({
		id: 'cascade-specificity',
		title: 'The Cascade & Specificity',
		nav: 'cascade & specificity',
		category: 'Foundations',

		prose: [
			'<h2>The Cascade &amp; Specificity</h2>' +
			'<p>The "C" in CSS is the conflict-resolution algorithm. Several rules ' +
			'usually match the same element; when their declarations disagree, the ' +
			'browser picks a winner in strict order:</p>' +
			'<ol>' +
			'<li><strong>Origin &amp; importance</strong> — your stylesheet beats ' +
			'the browser default; <code>!important</code> inverts things (and starts ' +
			'an arms race — treat it as a fire axe, not a tool);</li>' +
			'<li><strong>Specificity</strong> — the more precise selector wins;</li>' +
			'<li><strong>Source order</strong> — at equal specificity, the later ' +
			'rule wins.</li>' +
			'</ol>' +
			'<p>Specificity is a three-part count over the selector — IDs, then ' +
			'classes (plus attributes and pseudo-classes), then elements — compared ' +
			'left to right like a version number:</p>',
			{ lang: 'txt', code: 'selector              (id, class, element)\n#header               (1, 0, 0)\n.nav a.cta            (0, 2, 1)\n.nav a                (0, 1, 1)\n.cta                  (0, 1, 0)\na                     (0, 0, 1)\n\n(1,0,0) beats any number of classes; (0,1,1) beats (0,1,0)' },
			'<p>Now the fight in this lesson\'s sheet. The nav styles all its links ' +
			'blue with <code>.nav a</code> — that\'s (0,1,1). The call-to-action ' +
			'button tries to go white with <code>.cta</code> — only (0,1,0). Both ' +
			'match <code>&lt;a class="cta"&gt;</code> inside the nav, so the CTA ' +
			'<em>loses</em> and renders blue. Writing the override <em>later</em> ' +
			'changes nothing: source order only breaks exact ties.</p>' +
			'<h3>Your job</h3>' +
			'<p>Make the CTA rule win honestly: scope it as <code>.nav .cta</code> ' +
			'(0,2,0) or <code>.nav a.cta</code> (0,2,1) — either out-counts (0,1,1). ' +
			'This is the durable habit: when you need to win, <em>add context</em>, ' +
			'don\'t add <code>!important</code>.</p>' +
			'<div class="tip">Keeping specificity LOW everywhere is the real ' +
			'strategy — flat single-class selectors leave you room to override ' +
			'later. You escalate only at the point of conflict, exactly like ' +
			'here.</div>',
		],

		task: 'Rescope the .cta rule so it beats .nav a — e.g. .nav .cta or .nav a.cta.',

		starter: T.program([
			'.nav a',
			'	color #06c',
			'',
			'// (0,1,0) — loses to (0,1,1) above, even though it comes later',
			'.cta',
			'	color #fff',
			'	background #06c',
		]),

		check: function (stdout, flat) {
			return (flat.indexOf('.nav .cta {') !== -1 || flat.indexOf('.nav a.cta {') !== -1) &&
				flat.indexOf('color: #fff;') !== -1;
		},

		solution: T.program([
			'.nav a',
			'	color #06c',
			'',
			'// (0,2,0) — one class of added context out-counts (0,1,1).',
			'// Same declarations, more specific address.',
			'.nav .cta',
			'	color #fff',
			'	background #06c',
		]),
	});
})();
