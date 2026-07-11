/* Trapping Rain Water — Two Pointers (Hard). The capstone of the
 * two-pointer section: water above each bar is min(leftMax, rightMax) − h,
 * and the pointer trick is realizing that whichever SIDE currently has the
 * smaller max is fully decided — its bound can only grow, so the min can't
 * shrink. The prefix/suffix-max two-array solution collapses to O(1) space.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// Elevation [0,1,0,2,1,0,1,3,2,1,2,1] with the 6 trapped units shaded.
	// Scale: 1 unit = 40px, baseline y=160, bars 24px wide on a 32px pitch.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="elevation map with trapped rain water shaded between the bars">' +
		'<text x="30" y="16" class="lbl">height = [0,1,0,2,1,0,1,3,2,1,2,1] → traps 6 units</text>' +
		// water pockets (drawn under the bar strokes)
		'<g fill="var(--accent)" opacity="0.3">' +
		'<rect x="94" y="120" width="24" height="40"/>' +   // i=2, level 1
		'<rect x="158" y="80" width="24" height="40"/>' +   // i=4, level 2
		'<rect x="190" y="80" width="24" height="80"/>' +   // i=5, level 2
		'<rect x="222" y="80" width="24" height="40"/>' +   // i=6, level 2
		'<rect x="318" y="80" width="24" height="40"/>' +   // i=9, level 2
		'</g>' +
		// the bars
		'<g fill="var(--panel)" stroke="var(--edge)" stroke-width="1.4">' +
		'<rect x="62" y="120" width="24" height="40"/>' +
		'<rect x="126" y="80" width="24" height="80"/>' +
		'<rect x="158" y="120" width="24" height="40"/>' +
		'<rect x="222" y="120" width="24" height="40"/>' +
		'<rect x="254" y="40" width="24" height="120"/>' +
		'<rect x="286" y="80" width="24" height="80"/>' +
		'<rect x="318" y="120" width="24" height="40"/>' +
		'<rect x="350" y="80" width="24" height="80"/>' +
		'<rect x="382" y="120" width="24" height="40"/>' +
		'</g>' +
		// baseline
		'<line x1="24" y1="160" x2="412" y2="160" stroke="var(--edge)"/>' +
		// the walls that decide the big pocket
		'<text x="138" y="70" text-anchor="middle" style="fill:var(--accent)">maxL=2</text>' +
		'<text x="266" y="30" text-anchor="middle" style="fill:var(--ok)">maxR=3</text>' +
		'<line x1="126" y1="80" x2="254" y2="80" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="5 4"/>' +
		// per-column formula, pointing at column i=5
		'<text x="202" y="186" text-anchor="middle" class="lbl">column 5: min(maxL, maxR) − h = min(2, 3) − 0 = 2</text>' +
		'<text x="440" y="120" text-anchor="middle" class="lbl">water level =</text>' +
		'<text x="440" y="136" text-anchor="middle" class="lbl">lower of the</text>' +
		'<text x="440" y="152" text-anchor="middle" class="lbl">two best walls</text>' +
		'</svg>';

	LC.problem({
		id: 'trapping-rain-water',
		title: 'Trapping Rain Water',
		nav: 'Trapping Rain Water',
		difficulty: 'Hard',
		category: 'Two Pointers',
		task: 'Implement trap — make all 5 tests pass.',

		prose: [
			'<h2>Trapping Rain Water</h2>' +
			'<p>Given <code>height</code>, an elevation map where each bar has width 1, ' +
			'compute how much water it traps after raining.</p>' +
			'<ul><li>Water sits on top of a bar wherever both a taller-or-equal wall exists ' +
			'somewhere to its left <em>and</em> somewhere to its right.</li>' +
			'<li>Each column independently holds ' +
			'<code>min(leftMax, rightMax) − height[i]</code> units (never negative).</li>' +
			'<li>A monotone slope or an empty map traps nothing.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'trap([]int{0,1,0,2,1,0,1,3,2,1,2,1})  →  6\ntrap([]int{4,2,0,3,2,5})              →  9\ntrap([]int{1,2,3,4,5})                →  0   // water runs off a slope', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Think per column, not per pocket: the water above column <code>i</code> is ' +
			'set by the best wall on each side — <code>min(leftMax, rightMax) − h[i]</code>. ' +
			'Two prefix/suffix-max sweeps make that O(n) time with two extra arrays; the ' +
			'two-pointer refinement notices you only ever need the <em>smaller</em> of the ' +
			'two maxes, and the side that owns it is already fully decided:</p>' +
			DIAGRAM +
			'<p>Walk pointers inward, settling whichever side currently has the lower ' +
			'best-wall — one pass, no extra arrays.</p>',
		],

		starter: [
			'package main',
			'',
			'// trap returns the total units of rain water the elevation map',
			'// height can hold. Each column holds min(bestWallLeft, bestWallRight)',
			'// minus its own height, never negative; slopes and empty maps hold 0.',
			'func trap(height []int) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			')',
			'',
			LC.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		height []int',
			'		want   int',
			'	}',
			'	cases := []tc{',
			'		{[]int{0, 1, 0, 2, 1, 0, 1, 3, 2, 1, 2, 1}, 6},',
			'		{[]int{4, 2, 0, 3, 2, 5}, 9},',
			'		{[]int{1, 2, 3, 4, 5}, 0},',
			'		{[]int{}, 0},',
			'		{[]int{3, 0, 0, 3}, 6},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("height=%v", c.height),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := trap(append([]int(nil), c.height...))',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%d", got)',
			'		})',
			'		results = append(results, r)',
			'	}',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// trap returns the total rain water held by the elevation map.',
			'//',
			'// Per column the answer is min(leftMax, rightMax) − h. The two-array',
			'// version precomputes both maxes; here two running scalars replace',
			'// them, and columns are settled from the ends inward. The rule:',
			'// always settle the side whose running max is SMALLER. That side is',
			'// fully decided, because its own max is exact for everything its',
			'// pointer has covered, while the other side\'s max can only GROW as',
			'// its pointer moves inward — so the min() at this column is already',
			'// pinned to the smaller max, middle bars unseen or not.',
			'func trap(height []int) int {',
			'	l, r := 0, len(height)-1 // empty input: l > r, loop never runs',
			'	leftMax, rightMax := 0, 0',
			'	total := 0',
			'	for l <= r {',
			'		// Fold the pointer columns into their maxes FIRST, so each',
			'		// max is exact over the span its pointer has walked (and the',
			'		// water term below can never go negative: max ≥ own height).',
			'		if height[l] > leftMax {',
			'			leftMax = height[l]',
			'		}',
			'		if height[r] > rightMax {',
			'			rightMax = height[r]',
			'		}',
			'		if leftMax < rightMax {',
			'			// Left owns the smaller max → column l is decided.',
			'			// A record-setting bar contributes leftMax − h = 0.',
			'			total += leftMax - height[l]',
			'			l++',
			'		} else {',
			'			// Right\'s max is the smaller (or tied) → settle column r.',
			'			total += rightMax - height[r]',
			'			r--',
			'		}',
			'	}',
			'	return total',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Per column, not per pocket</h3>' +
			'<p>Trying to find “pockets” of water leads to fiddly geometry. The clean ' +
			'decomposition: each column <code>i</code> holds water up to the lower of the ' +
			'two best walls flanking it — ' +
			'<code>water[i] = min(leftMax[i], rightMax[i]) − height[i]</code>, clamped at 0. ' +
			'Sum over all columns and every pocket is accounted for automatically.</p>' +
			'<h3>Step 1: the two-array O(n)</h3>' +
			'<p>Both maxes are classic prefix/suffix sweeps:</p>',
			{ code: 'n := len(height)\nleftMax := make([]int, n)  // tallest bar in height[0..i]\nrightMax := make([]int, n) // tallest bar in height[i..n-1]\nfor i := 1; i < n; i++ {\n\tleftMax[i] = maxOf(leftMax[i-1], height[i-1])\n}\nfor i := n - 2; i >= 0; i-- {\n\trightMax[i] = maxOf(rightMax[i+1], height[i+1])\n}\nfor i := 0; i < n; i++ {\n\tif lvl := minOf(leftMax[i], rightMax[i]); lvl > height[i] {\n\t\ttotal += lvl - height[i]\n\t}\n}' },
			'<p>Three passes, O(n) time — already optimal in time. The two arrays are the ' +
			'only blemish: O(n) extra space to answer a question whose final combining step ' +
			'is just a <code>min</code>.</p>' +
			'<h3>Step 2: collapse to two pointers</h3>' +
			'<p>The key observation: to settle a column you never need <em>both</em> maxes ' +
			'exactly — only the <strong>smaller</strong> one, plus the guarantee that the ' +
			'other side is at least that tall. So process columns from the ends, keeping ' +
			'running scalars <code>leftMax</code> and <code>rightMax</code>. ' +
			'<code>leftMax</code> is <em>exact</em> for the span the left pointer has ' +
			'walked; the true right-side max can only be ≥ <code>rightMax</code>, because ' +
			'unseen middle bars can only push it up. So when ' +
			'<code>leftMax &lt; rightMax</code>, the <code>min()</code> at column ' +
			'<code>l</code> is already pinned to <code>leftMax</code> — settle it now:</p>',
			{ code: 'for l <= r {\n\tif height[l] > leftMax {\n\t\tleftMax = height[l] // fold current bars in first:\n\t}\n\tif height[r] > rightMax {\n\t\trightMax = height[r] // each max is exact for its span\n\t}\n\tif leftMax < rightMax {\n\t\ttotal += leftMax - height[l] // left owns the smaller max: decided\n\t\tl++\n\t} else {\n\t\ttotal += rightMax - height[r]\n\t\tr--\n\t}\n}' },
			'<p>The subtleties:</p>' +
			'<ul>' +
			'<li><strong>The smaller max decides, not the smaller bar.</strong> Comparing ' +
			'the running maxes (rather than <code>height[l]</code> vs ' +
			'<code>height[r]</code>) is what makes the argument airtight: the settled ' +
			'side’s level is its own exact max, and the other side provably can’t undercut it.</li>' +
			'<li><strong>Fold before settling.</strong> Absorbing the pointer’s own bar into ' +
			'its max first keeps every water term ≥ 0 — a record-setting bar contributes ' +
			'exactly 0. That is why a monotone slope totals 0: every bar is a new record on ' +
			'its side.</li>' +
			'<li><strong>Ties settle the right column.</strong> With equal maxes both sides ' +
			'cap each other, so either choice is safe; <code>&lt;</code> vs ' +
			'<code>&lt;=</code> just picks which pointer moves.</li>' +
			'<li><strong>Same sum, different order.</strong> The pointer version adds ' +
			'exactly the per-column terms the arrays version would — it just discovers them ' +
			'from the outside in, in O(1) extra space.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
