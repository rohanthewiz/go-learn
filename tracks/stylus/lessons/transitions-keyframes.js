/* Transitions & Keyframes — Responsive & Motion (lesson). Two kinds of
 * motion: transitions interpolate BETWEEN two states you already defined;
 * keyframe animations run on their own clock. Animate transform and
 * opacity, and the compositor does it for free.
 */
(function () {
	'use strict';
	var T = GoLearnStylus;

	T.lesson({
		id: 'transitions-keyframes',
		title: 'Transitions & Keyframes',
		nav: 'motion',
		category: 'Responsive & Motion',

		prose: [
			'<h2>Transitions &amp; Keyframes</h2>' +
			'<p>CSS motion comes in two shapes, and choosing is easy once you name ' +
			'the trigger:</p>' +
			'<ul>' +
			'<li><strong>Transition</strong> — "when this property changes, ' +
			'interpolate instead of jumping." It needs a state change to run: ' +
			'hover, focus, a class toggled by script. You declare it on the ' +
			'<em>base</em> state so it animates both directions;</li>' +
			'<li><strong>Animation</strong> — a <code>@keyframes</code> timeline ' +
			'with its own clock: it plays on load, loops, and needs no trigger — ' +
			'spinners, pulsing dots, toast entrances.</li>' +
			'</ul>',
			{ lang: 'css', code: "button\n\ttransition transform 0.2s ease   // on the base state — animates in AND out\n\n\t&:hover\n\t\ttransform translateY(-2px)   // the destination state\n\n@keyframes fade\n\tfrom\n\t\topacity 0\n\tto\n\t\topacity 1\n\n.toast\n\tanimation fade 0.3s ease" },
			'<p>The performance principle: prefer animating ' +
			'<strong><code>transform</code> and <code>opacity</code></strong>. Both ' +
			'run on the compositor thread — the browser slides a finished picture ' +
			'around. Animating <code>width</code>, <code>height</code>, or ' +
			'<code>top</code> re-runs layout every frame, and a busy main thread ' +
			'turns the motion to syrup. <code>translateY(-2px)</code> over ' +
			'<code>top: -2px</code>, every time.</p>' +
			'<div class="tip">Some users ask for less motion, and the request ' +
			'arrives as a media query: wrap decorative animation in ' +
			'<code>@media (prefers-reduced-motion: no-preference)</code>, or zero ' +
			'durations when <code>reduce</code> is set.</div>' +
			'<h3>Your job</h3>' +
			'<p>Both motions: give the button a <code>transform</code> transition ' +
			'(<code>0.2s ease</code>) and a hover state of ' +
			'<code>translateY(-2px)</code>; then define the <code>fade</code> ' +
			'keyframes (opacity 0 → 1) and play them on <code>.toast</code> ' +
			'(<code>0.3s ease</code>).</p>',
		],

		task: 'Button: transition transform 0.2s ease + hover translateY(-2px). Toast: @keyframes fade, animation fade 0.3s ease.',

		starter: T.program([
			'button',
			'	background #06c',
			'	color #fff',
			'',
			'.toast',
			'	background #14161a',
			'	color #fff',
		]),

		check: function (stdout, flat) {
			return flat.indexOf('transition: transform 0.2s ease;') !== -1 &&
				flat.indexOf('button:hover {') !== -1 &&
				flat.indexOf('transform: translateY(-2px);') !== -1 &&
				flat.indexOf('@keyframes fade {') !== -1 &&
				flat.indexOf('animation: fade 0.3s ease;') !== -1;
		},

		solution: T.program([
			'button',
			'	background #06c',
			'	color #fff',
			'	// on the base state, so the lift eases in AND settles back out',
			'	transition transform 0.2s ease',
			'',
			'	&:hover',
			'		// transform, not top: composited, no layout work per frame',
			'		transform translateY(-2px)',
			'',
			'@keyframes fade',
			'	from',
			'		opacity 0',
			'	to',
			'		opacity 1',
			'',
			'.toast',
			'	background #14161a',
			'	color #fff',
			'	animation fade 0.3s ease',
		]),
	});
})();
