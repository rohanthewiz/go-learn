/* Constraints — Layout (lesson). Flutter layout in one sentence:
 * constraints go down, sizes come up, the parent sets the position. The
 * learner implements the clamp at the heart of it — and with it, the answer
 * to "why is my width: 500 being ignored?".
 */
(function () {
	'use strict';
	var T = GoLearnFlutter;

	// Constraints flowing down the tree, sizes flowing back up. Marker ids
	// namespaced (dgArrowFLC down / dgArrowFLCu up).
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-label="parent passes constraints down to the child; the child returns a size up; the parent then positions the child">' +
		'<text x="20" y="22" class="lbl">one layout pass: constraints down, sizes up, parent positions</text>' +
		'<rect x="40" y="40" width="180" height="44" rx="7" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="130" y="60" text-anchor="middle">parent</text>' +
		'<text x="130" y="76" text-anchor="middle" class="lbl">has [0..300] to give</text>' +
		'<rect x="40" y="130" width="180" height="44" rx="7" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="130" y="150" text-anchor="middle">child (wants 500)</text>' +
		'<text x="130" y="166" text-anchor="middle" class="lbl">must answer within limits</text>' +
		'<path d="M 90 84 L 90 126" stroke="var(--accent)" stroke-width="2" marker-end="url(#dgArrowFLC)"/>' +
		'<text x="84" y="108" text-anchor="end" class="lbl" style="fill:var(--accent)">maxWidth: 300</text>' +
		'<path d="M 170 126 L 170 84" stroke="var(--ok)" stroke-width="2" marker-end="url(#dgArrowFLCu)"/>' +
		'<text x="178" y="108" class="lbl" style="fill:var(--ok)">size: 300 (clamped)</text>' +
		'<text x="360" y="60" class="lbl">the child never learns its</text>' +
		'<text x="360" y="74" class="lbl">position — the parent places</text>' +
		'<text x="360" y="88" class="lbl">it using the returned size</text>' +
		'<defs>' +
		'<marker id="dgArrowFLC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowFLCu" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.lesson({
		id: 'constraints',
		title: 'Constraints Down, Sizes Up',
		nav: 'constraints',
		category: 'Layout',

		prose: [
			'<h2>Constraints Down, Sizes Up</h2>' +
			'<p>Flutter\'s layout protocol is a single depth-first pass with a strict ' +
			'division of power. The parent hands the child a ' +
			'<code>BoxConstraints</code> — a min/max range per axis. The child picks ' +
			'any size <em>inside that range</em> and reports it back. The parent then ' +
			'decides where the child sits. Three rules, endlessly quoted because they ' +
			'explain every layout surprise:</p>' +
			'<p style="text-align:center"><strong>Constraints go down. Sizes go up. ' +
			'The parent sets the position.</strong></p>' +
			DIAGRAM +
			'<p>The consequence people meet first: a widget\'s "size" is a ' +
			'<em>request</em>, and the constraint always wins:</p>',
			{ lang: 'dart', code: "SizedBox(\n  width: 500,          // a wish…\n  child: ...,\n)\n// inside a parent that gives maxWidth: 300 → the box IS 300 wide.\n// Layout never overflows the constraint; it clamps." },
			'<p>A <em>tight</em> constraint (min == max) leaves the child no say at ' +
			'all — that is how the screen sizes the root. A <em>loose</em> one ' +
			'(min 0) lets the child be its natural size. Widgets like ' +
			'<code>Center</code> exist mostly to loosen: they absorb a tight ' +
			'constraint, pass a loose one down, and use the leftover room for ' +
			'positioning.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>layout</code> — the child\'s side of the bargain: ' +
			'clamp the desired width into <code>[min, max]</code>. Three cases run: ' +
			'a wish over the max (clamped down), one under the min (stretched up — ' +
			'tight-ish constraints do that), and one comfortably inside (granted ' +
			'as-is).</p>',
		],

		task: 'Implement layout: clamp desired into [c.min, c.max] — the constraint always wins.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// constraints is one axis of BoxConstraints: the range the parent',
			'// hands down. min == max is a "tight" constraint — no choice at all.',
			'type constraints struct {',
			'	min, max int',
			'}',
			'',
			'// layout is the child\'s side of the protocol: pick a size inside the',
			'// range, as close to desired as the range allows.',
			'func layout(c constraints, desired int) int {',
			'	// TODO: clamp desired into [c.min, c.max].',
			'	return desired',
			'}',
			'',
			'func main() {',
			'	cases := []struct {',
			'		c       constraints',
			'		desired int',
			'	}{',
			'		{constraints{0, 300}, 500},   // SizedBox(width: 500) in a 300 slot',
			'		{constraints{100, 300}, 50},  // wish below the minimum',
			'		{constraints{0, 300}, 120},   // fits — granted as-is',
			'	}',
			'	for _, tc := range cases {',
			'		fmt.Printf("wants %d within [%d,%d] -> %d\\n",',
			'			tc.desired, tc.c.min, tc.c.max, layout(tc.c, tc.desired))',
			'	}',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('wants 500 within [0,300] -> 300') !== -1 &&
				flat.indexOf('wants 50 within [100,300] -> 100') !== -1 &&
				flat.indexOf('wants 120 within [0,300] -> 120') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// constraints is one axis of BoxConstraints: the range the parent',
			'// hands down. min == max is a "tight" constraint — no choice at all.',
			'type constraints struct {',
			'	min, max int',
			'}',
			'',
			'// layout is the child\'s side of the protocol. The clamp order matters',
			'// conceptually: the child consults its wish only AFTER the range has',
			'// had its say — which is why no widget can ever overflow the',
			'// constraint its parent gave it (overflow stripes come from painting',
			'// outside your size, not from layout granting too much).',
			'func layout(c constraints, desired int) int {',
			'	if desired > c.max {',
			'		return c.max',
			'	}',
			'	if desired < c.min {',
			'		return c.min',
			'	}',
			'	return desired',
			'}',
			'',
			'func main() {',
			'	cases := []struct {',
			'		c       constraints',
			'		desired int',
			'	}{',
			'		{constraints{0, 300}, 500},   // SizedBox(width: 500) in a 300 slot',
			'		{constraints{100, 300}, 50},  // wish below the minimum',
			'		{constraints{0, 300}, 120},   // fits — granted as-is',
			'	}',
			'	for _, tc := range cases {',
			'		fmt.Printf("wants %d within [%d,%d] -> %d\\n",',
			'			tc.desired, tc.c.min, tc.c.max, layout(tc.c, tc.desired))',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
