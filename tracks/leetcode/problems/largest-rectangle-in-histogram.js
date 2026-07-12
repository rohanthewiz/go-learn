/* Largest Rectangle in Histogram — Stack (Hard). The capstone monotonic-
 * stack problem: an increasing stack of indices settles each bar's maximal
 * rectangle the moment a lower bar arrives, with a sentinel 0-height bar
 * draining the stack at the end. Starter sentinel is -1 (empty input has
 * a legitimate answer of 0).
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 210" width="540" height="210" role="img" aria-label="histogram 2,1,5,6,2,3 with the winning 5 by 2 rectangle shaded">' +
		'<text x="30" y="20" class="lbl">heights = [2, 1, 5, 6, 2, 3]</text>' +
		// winning rectangle first, so bar outlines draw on top of the fill
		'<rect x="110" y="75" width="80" height="75" fill="var(--ok)" fill-opacity="0.22" stroke="var(--ok)" stroke-width="2"/>' +
		// bars (baseline y=150, 15px per height unit, 40px wide)
		'<g fill="none" stroke="var(--edge)" stroke-width="1.4">' +
		'<rect x="30" y="120" width="40" height="30"/>' +
		'<rect x="70" y="135" width="40" height="15"/>' +
		'<rect x="110" y="75" width="40" height="75"/>' +
		'<rect x="150" y="60" width="40" height="90"/>' +
		'<rect x="190" y="120" width="40" height="30"/>' +
		'<rect x="230" y="105" width="40" height="45"/>' +
		'</g>' +
		'<path d="M 30 150 h 250" stroke="var(--edge)"/>' +
		// index labels under the baseline
		'<g class="lbl">' +
		'<text x="50" y="168" text-anchor="middle">2</text>' +
		'<text x="90" y="168" text-anchor="middle">1</text>' +
		'<text x="130" y="168" text-anchor="middle">5</text>' +
		'<text x="170" y="168" text-anchor="middle">6</text>' +
		'<text x="210" y="168" text-anchor="middle">2</text>' +
		'<text x="250" y="168" text-anchor="middle">3</text>' +
		'</g>' +
		// annotation: the rectangle is bounded by nearest smaller bars
		'<path d="M 320 96 C 260 90 220 88 196 92" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowLRH)"/>' +
		'<text x="328" y="92">best = 5 × 2 = 10</text>' +
		'<text x="328" y="112" class="lbl">height 5 stretches from the bar of 1</text>' +
		'<text x="328" y="128" class="lbl">(nearest smaller on the left) to the bar</text>' +
		'<text x="328" y="144" class="lbl">of 2 (nearest smaller on the right)</text>' +
		'<text x="30" y="196" class="lbl">every bar owns one such maximal rectangle — the answer is the best of them</text>' +
		'<defs><marker id="dgArrowLRH" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'largest-rectangle-in-histogram',
		title: 'Largest Rectangle in Histogram',
		nav: 'Largest Rectangle',
		difficulty: 'Hard',
		category: 'Stack',
		task: 'Implement largestRectangleArea — make all 6 tests pass.',

		prose: [
			'<h2>Largest Rectangle in Histogram</h2>' +
			'<p>Given <code>heights</code>, where bar <code>i</code> has width 1 and height ' +
			'<code>heights[i]</code>, return the area of the largest axis-aligned rectangle ' +
			'that fits entirely inside the histogram. An empty histogram has area 0.</p>' +
			'<h3>Example</h3>',
			{ code: 'largestRectangleArea([]int{2, 1, 5, 6, 2, 3})  →  10   // height 5, spanning bars 5 and 6\nlargestRectangleArea([]int{1, 2, 3, 4, 5})     →  9    // height 3 × width 3', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Fix the <em>height</em> instead of the corners: the best rectangle of ' +
			'height <code>heights[i]</code> stretches from the nearest smaller bar on the ' +
			'left to the nearest smaller bar on the right — smaller bars are walls; ' +
			'taller ones pass through. Compute that maximal span for every bar and take ' +
			'the best:</p>' +
			DIAGRAM +
			'<p>A stack of indices with <em>increasing</em> heights finds both walls in one ' +
			'sweep: when a lower bar arrives, every taller bar on the stack has just met ' +
			'its right wall (the newcomer), and its left wall is the entry beneath it. ' +
			'Pop, settle its area, move on — each index is pushed and popped once.</p>',
		],

		starter: [
			'package main',
			'',
			'// largestRectangleArea returns the area of the largest axis-aligned',
			'// rectangle inside the histogram: bar i has width 1 and height',
			'// heights[i]. An empty histogram has area 0.',
			'func largestRectangleArea(heights []int) int {',
			'	// your code here',
			'	return -1 // sentinel — 0 is a legitimate answer (empty input)',
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
			'		heights []int',
			'		want    int',
			'	}',
			'	cases := []tc{',
			'		{[]int{2, 1, 5, 6, 2, 3}, 10},',
			'		// strictly increasing: nothing pops until the very end — the',
			'		// sentinel/drain phase must settle every bar or this fails.',
			'		{[]int{1, 2, 3, 4, 5}, 9},',
			'		// strictly decreasing: every new bar pops its predecessor;',
			'		// widths after a pop must reach back past the popped bars.',
			'		{[]int{5, 4, 3, 2, 1}, 9},',
			'		{[]int{6}, 6},',
			'		// equal heights: the rectangle must span ALL equal bars (9, not 3).',
			'		{[]int{3, 3, 3}, 9},',
			'		{[]int{}, 0},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.heights),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Copy: the slice survives even if the user solution mutates it.',
			'			got := largestRectangleArea(append([]int(nil), c.heights...))',
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
			'// largestRectangleArea returns the area of the largest axis-aligned',
			'// rectangle inside the histogram (bar i is 1 wide, heights[i] tall).',
			'//',
			'// Monotonic increasing stack of bar INDICES. Invariant: the heights',
			'// at stacked indices strictly increase, so every stacked bar is still',
			'// "open" — its rectangle could still grow to the right. A lower',
			'// incoming bar is the right WALL for every taller open bar: pop each',
			'// one and settle its area immediately. The left wall is whatever',
			'// remains beneath it on the stack (the nearest smaller bar to its',
			'// left), so the settled rectangle is maximal on both sides.',
			'//',
			'// Indices, not heights, go on the stack because widths are computed',
			'// from POSITIONS; the height is always recoverable as heights[idx].',
			'func largestRectangleArea(heights []int) int {',
			'	best := 0',
			'	stack := []int{} // indices; heights[stack[0]] < ... < heights[stack[top]]',
			'',
			'	// The loop runs one step PAST the end: i == len(heights) acts as a',
			'	// sentinel bar of height 0. Being lower than every real bar, it',
			'	// forces the stack to drain, so bars still open at the end (e.g. a',
			'	// fully increasing histogram) get settled by the same pop logic —',
			'	// no duplicated flush loop after the sweep.',
			'	for i := 0; i <= len(heights); i++ {',
			'		h := 0 // sentinel height once i walks off the end',
			'		if i < len(heights) {',
			'			h = heights[i]',
			'		}',
			'',
			'		// Strict > keeps equal bars stacked: the LAST equal bar pops',
			'		// first with a small width, but the earliest one eventually',
			'		// settles the full run ([3,3,3] → width 3, area 9).',
			'		for len(stack) > 0 && heights[stack[len(stack)-1]] > h {',
			'			top := stack[len(stack)-1]',
			'			stack = stack[:len(stack)-1]',
			'',
			'			// Width spans (leftWall, i) exclusive on both ends. With an',
			'			// empty stack there is no smaller bar to the left at all —',
			'			// the rectangle reaches back to the wall at index -1, i.e.',
			'			// width i. Bars between top and i were all taller (they were',
			'			// popped earlier), so height heights[top] fits across.',
			'			width := i',
			'			if len(stack) > 0 {',
			'				width = i - stack[len(stack)-1] - 1',
			'			}',
			'			if area := heights[top] * width; area > best {',
			'				best = area',
			'			}',
			'		}',
			'		stack = append(stack, i)',
			'	}',
			'	return best',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Try every pair of walls: for each (left, right), the rectangle’s height is ' +
			'the minimum bar between them — O(n²) pairs (O(n³) if the minimum is rescanned). ' +
			'A better frame: every maximal rectangle is pinned by some bar at full height, ' +
			'so for each bar find the nearest <em>smaller</em> bar on each side and take ' +
			'<code>heights[i] × (right − left − 1)</code>. Scanning outward per bar is ' +
			'still O(n²) in the worst case (think of a plateau).</p>' +
			'<h3>The stack finds both walls in one sweep</h3>' +
			'<p>Walk left to right keeping a stack of indices whose heights increase. An ' +
			'incoming bar <em>lower</em> than the stack top answers two questions at once: ' +
			'it is the nearest-smaller-to-the-<em>right</em> for every taller stacked bar, ' +
			'and after popping one, the new stack top is that bar’s ' +
			'nearest-smaller-to-the-<em>left</em>. So each pop settles one bar’s maximal ' +
			'rectangle, permanently:</p>',
			{ code: 'for i := 0; i <= len(heights); i++ {\n\th := 0                       // i == len: sentinel bar of height 0\n\tif i < len(heights) {\n\t\th = heights[i]\n\t}\n\tfor len(stack) > 0 && heights[stack[len(stack)-1]] > h {\n\t\ttop := stack[len(stack)-1]   // this bar just met its right wall (i)\n\t\tstack = stack[:len(stack)-1]\n\t\twidth := i                   // no left wall → reaches index -1\n\t\tif len(stack) > 0 {\n\t\t\twidth = i - stack[len(stack)-1] - 1\n\t\t}\n\t\tbest = max(best, heights[top]*width)\n\t}\n\tstack = append(stack, i)\n}' },
			'<p>Two details carry the algorithm:</p>' +
			'<ul>' +
			'<li><strong>The sentinel bar.</strong> A strictly increasing histogram never ' +
			'pops during the sweep; every bar is still open at the end. Letting <code>i</code> ' +
			'run one step past the end with height 0 — lower than everything — reuses the ' +
			'pop logic as the drain, instead of a second hand-rolled flush loop with its ' +
			'own width bugs.</li>' +
			'<li><strong>Width after popping.</strong> The bars between the popped index and ' +
			'<code>i</code> are gone from the stack precisely <em>because they were taller</em>, ' +
			'so the popped height spans them all: width runs wall-to-wall, ' +
			'<code>i − stack[top] − 1</code>, or all the way back to −1 when the stack ' +
			'empties. Getting this exclusive-both-ends arithmetic right is the whole ' +
			'battle.</li>' +
			'</ul>' +
			'<p>Every index is pushed once and popped once — amortized O(n) despite the ' +
			'nested loop.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Monotonic stack</strong> — the tool for “nearest smaller (or ' +
			'greater) element” questions: whenever each element needs the closest element ' +
			'to its left/right that breaks an ordering, a stack kept sorted by popping ' +
			'violators answers all n queries in O(n) total, O(n) space. The trigger ' +
			'phrases: <em>nearest smaller</em>, <em>next greater</em>, <em>how far until ' +
			'X exceeds this</em>, <em>span</em>. In this track the same idea drives Daily ' +
			'Temperatures (nearest greater to the right — a decreasing stack) and pairs ' +
			'with Trapping Rain Water (bounded-by-smaller-walls thinking); Min Stack is ' +
			'the warm-up in stack invariants. It also scales up: LeetCode’s Maximal ' +
			'Rectangle in a binary matrix is solved by running this exact function on each ' +
			'row’s accumulated-heights histogram.</p>',
		],
		complexity: { time: 'O(n) — each index pushed and popped once', space: 'O(n) — the stack (worst case: increasing heights)' },
	});
})();
