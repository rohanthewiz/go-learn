/* Container With Most Water — Two Pointers (Medium). The problem where
 * converging pointers stop being a trick and become an ARGUMENT: at each
 * step you may safely discard the shorter line, because no container
 * keeping it can ever beat the one you just measured (the exchange
 * argument). Width shrinks; only a taller limiting wall can pay for it.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// Bars for height = [1,8,6,2,5,4,8,3,7], pointers at l=1 (h=8) and
	// r=8 (h=7): the water surface sits at min(8,7)=7 across width 7.
	// Scale: 1 unit = 17px, baseline y=180.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 210" width="500" height="210" role="img" aria-label="vertical lines with the two-pointer water area shaded">' +
		'<text x="20" y="16" class="lbl">height = [1, 8, 6, 2, 5, 4, 8, 3, 7]</text>' +
		// water: spans from the left line to the right line at min height 7 (119px)
		'<rect x="90" y="61" width="336" height="119" fill="var(--accent)" opacity="0.18"/>' +
		'<line x1="90" y1="61" x2="426" y2="61" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="5 4"/>' +
		// the nine bars (fills panel, edges neutral; pointer bars highlighted)
		'<g fill="var(--panel)" stroke="var(--edge)" stroke-width="1.4">' +
		'<rect x="30" y="162.5" width="28" height="17.5"/>' +
		'<rect x="122" y="78" width="28" height="102"/>' +
		'<rect x="168" y="146" width="28" height="34"/>' +
		'<rect x="214" y="95" width="28" height="85"/>' +
		'<rect x="260" y="112" width="28" height="68"/>' +
		'<rect x="306" y="44" width="28" height="136"/>' +
		'<rect x="352" y="129" width="28" height="51"/>' +
		'</g>' +
		'<rect x="76" y="44" width="28" height="136" fill="var(--panel)" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="398" y="61" width="28" height="119" fill="var(--panel)" stroke="var(--accent)" stroke-width="2"/>' +
		// baseline
		'<line x1="20" y1="180" x2="440" y2="180" stroke="var(--edge)"/>' +
		// pointer labels
		'<text x="90" y="198" text-anchor="middle" style="fill:var(--accent)">l (h=8)</text>' +
		'<text x="412" y="198" text-anchor="middle" style="fill:var(--accent)">r (h=7)</text>' +
		'<text x="251" y="198" text-anchor="middle" class="lbl">width = 8 − 1 = 7</text>' +
		// the area callout
		'<text x="251" y="130" text-anchor="middle" style="fill:var(--accent)">area = min(8, 7) × 7 = 49</text>' +
		'<text x="251" y="52" text-anchor="middle" class="lbl">water level = the SHORTER wall</text>' +
		// the move
		'<text x="412" y="30" text-anchor="middle" style="fill:var(--ok)">shorter side → move r</text>' +
		'</svg>';

	LC.problem({
		id: 'container-with-most-water',
		title: 'Container With Most Water',
		nav: 'Container / Water',
		difficulty: 'Medium',
		category: 'Two Pointers',
		task: 'Implement maxArea — make all 5 tests pass.',

		prose: [
			'<h2>Container With Most Water</h2>' +
			'<p>You are given a slice <code>height</code> where <code>height[i]</code> is ' +
			'the height of a vertical line drawn at position <code>i</code>. Pick two lines ' +
			'that, together with the x-axis, form a container holding the most water. ' +
			'Return that maximum area.</p>' +
			'<ul><li>The water level is set by the <em>shorter</em> of the two lines: ' +
			'<code>area = min(height[l], height[r]) × (r − l)</code>.</li>' +
			'<li>The container may not be slanted — lines between the two walls don’t block water.</li>' +
			'<li>Fewer than two lines means no container: return <code>0</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'maxArea([]int{1, 8, 6, 2, 5, 4, 8, 3, 7})  →  49  // walls at i=1 (h=8) and i=8 (h=7)\nmaxArea([]int{1, 1})                       →  1   // min(1,1) × 1', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Start with the <em>widest</em> possible container — pointers at both ends — ' +
			'and walk them inward. Moving either pointer makes the container narrower, so ' +
			'the only hope of a bigger area is a taller limiting wall. That means the ' +
			'<strong>shorter side</strong> is the one to give up on:</p>' +
			DIAGRAM +
			'<p>Every step discards one wall for good, so n − 1 steps see every candidate ' +
			'that could matter.</p>',
		],

		starter: [
			'package main',
			'',
			'// maxArea returns the largest water area formed by two of the',
			'// vertical lines in height together with the x-axis:',
			'// min(height[l], height[r]) * (r - l), maximized over all pairs.',
			'// Fewer than two lines hold no water.',
			'func maxArea(height []int) int {',
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
			'		{[]int{1, 8, 6, 2, 5, 4, 8, 3, 7}, 49},',
			'		{[]int{1, 1}, 1},',
			'		{[]int{4, 3, 2, 1, 4}, 16},',
			'		{[]int{1, 2, 1}, 2},',
			'		{[]int{5}, 0},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("height=%v", c.height),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := maxArea(append([]int(nil), c.height...))',
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
			'// maxArea returns the largest water area formed by two lines.',
			'//',
			'// Converging pointers starting at maximum width. The invariant that',
			'// makes this O(n): when we move a pointer inward we permanently',
			'// discard that wall, and that is only safe for the SHORTER wall.',
			'// Why: every container still using the shorter wall is narrower than',
			'// the one just measured, and its level is still capped by that same',
			'// short wall — so none of them can exceed the area we already',
			'// recorded. The taller wall, by contrast, might yet pair with',
			'// something even taller. (The exchange argument.)',
			'func maxArea(height []int) int {',
			'	best := 0',
			'	l, r := 0, len(height)-1 // widest container first',
			'	for l < r {',
			'		// Water level is set by the shorter wall.',
			'		h := height[l]',
			'		if height[r] < h {',
			'			h = height[r]',
			'		}',
			'		if area := h * (r - l); area > best {',
			'			best = area',
			'		}',
			'		// Give up on the shorter side; on a tie either is safe',
			'		// (both walls are the level, and any container keeping',
			'		// one of them is capped by it while being narrower).',
			'		if height[l] <= height[r] {',
			'			l++',
			'		} else {',
			'			r--',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Try every pair of walls: two nested loops, ' +
			'<code>min(height[i], height[j]) × (j − i)</code>, keep the max. O(n²) — and ' +
			'almost all of that work is provably pointless, because most pairs are ' +
			'dominated by a pair we could have identified cheaply.</p>' +
			'<h3>The exchange argument</h3>' +
			'<p>Start at maximum width, <code>l = 0</code>, <code>r = n−1</code>, and ask: ' +
			'which pointer can we move without ever regretting it? Say ' +
			'<code>height[l] ≤ height[r]</code>. Consider <em>any</em> container that keeps ' +
			'wall <code>l</code> and uses some <code>r′ &lt; r</code> instead:</p>' +
			'<ul>' +
			'<li>its width <code>r′ − l</code> is strictly smaller, and</li>' +
			'<li>its level is still at most <code>height[l]</code> — the short wall caps it ' +
			'no matter how tall <code>r′</code> is.</li>' +
			'</ul>' +
			'<p>Both factors got worse or stayed equal, so every such container is ≤ the ' +
			'area we <em>just measured</em> for <code>(l, r)</code>. Wall <code>l</code> is ' +
			'exhausted: nothing it participates in can beat what’s already recorded. ' +
			'Discard it. Symmetrically, if the right wall is shorter, discard that. ' +
			'One wall retires per step, so the true best pair is never skipped — when its ' +
			'first wall is discarded, both of its walls were at the pointers and it had ' +
			'already been measured.</p>',
			{ code: 'l, r := 0, len(height)-1\nfor l < r {\n\th := height[l] // water level = shorter wall\n\tif height[r] < h {\n\t\th = height[r]\n\t}\n\tif area := h * (r - l); area > best {\n\t\tbest = area\n\t}\n\tif height[l] <= height[r] {\n\t\tl++ // shorter side can never do better than it just did\n\t} else {\n\t\tr--\n\t}\n}' },
			'<p>Worth pinning down:</p>' +
			'<ul>' +
			'<li><strong>Always move the shorter side.</strong> Moving the taller one is ' +
			'the classic mistake: width shrinks and the level is still capped by the wall ' +
			'you kept — you can only lose.</li>' +
			'<li><strong>Ties: either move is safe.</strong> When ' +
			'<code>height[l] == height[r]</code> both walls equal the level, so the ' +
			'argument above applies to whichever one you retire.</li>' +
			'<li><strong>Measure before you move.</strong> The proof leans on the current ' +
			'pair having been recorded before its shorter wall is discarded.</li>' +
			'<li><strong>Greedy discard, not greedy answer.</strong> The best pair may show ' +
			'up mid-run; <code>best</code> tracks it while the pointers keep going.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
