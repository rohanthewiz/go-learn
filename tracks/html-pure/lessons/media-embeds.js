/* Media & Embeds — video with stacked source children (first playable
 * type wins), captions via track, audio, and iframe embedding with
 * sandbox/title notes. Exercise upgrades a bare src-attribute video to
 * the full source/track/fallback shape plus an audio player and a
 * srcdoc iframe; the check pins the controls+width video line, both
 * source lines in mp4-then-webm order, the captions track, audio
 * controls, and the exact iframe line — none reachable from the bare
 * starter.
 */
(function () {
	'use strict';
	var H = GoLearnHTMLP;

	H.lesson({
		id: 'media-embeds',
		title: 'Media & Embeds',
		nav: 'media and embeds',
		category: 'Rich Content',

		prose: [
			'<h2>Video is a container, not a void</h2>' +
			'<p>Unlike <code>&lt;img&gt;</code>, the <code>&lt;video&gt;</code> ' +
			'element is <em>not</em> void &mdash; it takes a closing tag, and ' +
			'what goes between the tags is the interesting part. The attributes ' +
			'handle presentation: <code>controls</code> asks the browser for its ' +
			'built-in play/pause/scrub bar (without it the video is a mute ' +
			'rectangle), <code>width</code> sizes it, and <code>poster</code> ' +
			'names an image to show before playback starts.</p>',
			{ lang: 'html', code: '<video controls width="320" poster="/media/cover.png">\n  <source src="/media/intro.mp4" type="video/mp4">\n  <source src="/media/intro.webm" type="video/webm">\n  Your browser does not support video.\n</video>' },
			'<h2>Stacked sources: the browser picks, in order</h2>' +
			'<p>Why children instead of one <code>src</code>? Codec politics. No ' +
			'single format plays everywhere, so you stack ' +
			'<code>&lt;source&gt;</code> elements (these <em>are</em> void) and ' +
			'the browser walks them top to bottom, taking the <em>first</em> ' +
			'<code>type</code> it can play. That is exactly what the ' +
			'<code>type</code> attribute is for: the browser can reject ' +
			'<code>video/webm</code> from the label alone, without downloading a ' +
			'byte. Order is a statement of preference &mdash; put your best ' +
			'format first. The loose text at the bottom is the fallback, shown ' +
			'only by browsers too old to know <code>&lt;video&gt;</code> at ' +
			'all.</p>',
			'<h2>Captions: track is not optional garnish</h2>' +
			'<p>A <code>&lt;track&gt;</code> child (void, like source) attaches ' +
			'timed text &mdash; <code>kind="captions"</code> for dialogue and ' +
			'sound cues, pointing at a <code>.vtt</code> subtitle file, with ' +
			'<code>srclang</code> naming the language and <code>label</code> ' +
			'naming the menu entry a viewer picks:</p>',
			{ lang: 'html', code: '<track kind="captions" src="/media/intro.vtt" srclang="en" label="English">' },
			'<p>Captions serve deaf and hard-of-hearing viewers, anyone in a ' +
			'loud room, and anyone watching muted &mdash; which is most people. ' +
			'Ship video without captions and you have shipped half a video.</p>',
			'<h2>Audio: the same idea, smaller</h2>' +
			'<p><code>&lt;audio controls&gt;</code> works identically: stacked ' +
			'<code>&lt;source&gt;</code> children with <code>type</code> labels ' +
			'(<code>audio/mpeg</code> for mp3, <code>audio/ogg</code>, ...), ' +
			'fallback text, closing tag required.</p>',
			'<h2>iframe: a page within the page</h2>' +
			'<p>An <code>&lt;iframe&gt;</code> embeds a whole <em>other ' +
			'document</em> &mdash; its own tree, styles, and scripts &mdash; in ' +
			'a rectangle of yours. Two habits matter. Always give it a ' +
			'<code>title</code>: to a screen reader an untitled iframe is just ' +
			'&ldquo;frame&rdquo;, a door with no sign. And when the content is ' +
			'third-party, add <code>sandbox</code>, which strips the embedded ' +
			'page&rsquo;s powers (scripts, popups, form submission) until you ' +
			'grant them back one by one &mdash; you are inviting someone ' +
			'else&rsquo;s code onto your page, so it starts with empty ' +
			'pockets. Besides <code>src</code>, an iframe can carry its ' +
			'document <em>inline</em> via <code>srcdoc</code> &mdash; handy ' +
			'here, where there is no network to fetch from.</p>',
			'<h3>Your job</h3>' +
			'<p>The starter has a bare working video. Upgrade it: add ' +
			'<code>controls</code> and <code>width="320"</code>, move the file ' +
			'into two <code>&lt;source&gt;</code> children (mp4 first, then ' +
			'<code>/media/intro.webm</code>, each with its <code>type</code>), ' +
			'add a captions <code>&lt;track&gt;</code> and fallback text. Then ' +
			'add an <code>&lt;audio controls&gt;</code> with one source ' +
			'(<code>/media/intro.mp3</code>, <code>type="audio/mpeg"</code>) ' +
			'and an <code>&lt;iframe title="greeting" srcdoc="Hello from ' +
			'inside"&gt;&lt;/iframe&gt;</code>. In this preview there are no ' +
			'real media files &mdash; the player chrome renders but nothing ' +
			'plays, which is fine: the structure is the lesson.</p>' +
			'<div class="tip">Inside a double-quoted <code>srcdoc</code> value, ' +
			'any nested quotes must be single, and <code>&amp;</code> / ' +
			'<code>&lt;</code> follow the usual entity rules &mdash; keep ' +
			'srcdoc content trivial, or use <code>src</code> and a real ' +
			'file.</div>',
		],

		task: 'Give the video controls, sources, captions, and fallback; then add an audio player and a srcdoc iframe.',

		starter: [
			'<h1>Field recordings</h1>',
			'',
			'<!-- TODO 1: add controls and a width of 320; replace the src attribute',
			'     with two source children: /media/intro.mp4 (video/mp4) then',
			'     /media/intro.webm (video/webm) -->',
			'<!-- TODO 2: add a captions track: src /media/intro.vtt, srclang en,',
			'     label English - then fallback text before the closing tag -->',
			'<video src="/media/intro.mp4"></video>',
			'',
			'<!-- TODO 3: an audio element with controls and one source:',
			'     /media/intro.mp3, type audio/mpeg -->',
			'',
			'<!-- TODO 4: an iframe, title greeting, srcdoc Hello from inside -->',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return stdout.includes('video controls width="320"') &&
				stdout.includes('source src="/media/intro.mp4" type="video/mp4"') &&
				stdout.includes('source src="/media/intro.webm" type="video/webm"') &&
				// preference order: mp4 listed before webm
				flat.indexOf('type="video/mp4"') < flat.indexOf('type="video/webm"') &&
				stdout.includes('track kind="captions"') &&
				stdout.includes('srclang="en"') &&
				stdout.includes('audio controls') &&
				stdout.includes('iframe title="greeting" srcdoc="Hello from inside"');
		},

		solution: [
			'<h1>Field recordings</h1>',
			'',
			'<!-- controls: browser player chrome; sources stacked best-first -->',
			'<video controls width="320">',
			'  <source src="/media/intro.mp4" type="video/mp4">',
			'  <source src="/media/intro.webm" type="video/webm">',
			'  <!-- captions: timed text for viewers who cannot hear the audio -->',
			'  <track kind="captions" src="/media/intro.vtt" srclang="en" label="English">',
			'  Your browser does not support video.',
			'</video>',
			'',
			'<!-- same pattern, smaller: audio/mpeg is the mp3 type label -->',
			'<audio controls>',
			'  <source src="/media/intro.mp3" type="audio/mpeg">',
			'  Your browser does not support audio.',
			'</audio>',
			'',
			'<!-- srcdoc carries the embedded document inline; title names the frame -->',
			'<iframe title="greeting" srcdoc="Hello from inside"></iframe>',
			'',
		].join('\n'),
	});
})();
