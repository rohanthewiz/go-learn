/* Sort Colors — Two Pointers (Medium). The Dutch national flag: partition an
 * array of 0s/1s/2s in place in ONE pass with three pointers. The harness
 * passes a copy of each input and inspects the mutated copy — sortColors
 * returns nothing.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 170" width="500" height="170" role="img" aria-label="Dutch national flag invariant: four regions tracked by low, mid and high pointers">' +
		'<text x="20" y="18" class="lbl">the invariant, mid-scan</text>' +
		// four region blocks
		'<g>' +
		'<rect x="20" y="30" width="110" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="130" y="30" width="100" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<rect x="230" y="30" width="140" height="34" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'<rect x="370" y="30" width="110" height="34" rx="4" fill="none" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<text x="75" y="52" text-anchor="middle" style="fill:var(--ok)">all 0s</text>' +
		'<text x="180" y="52" text-anchor="middle" style="fill:var(--accent)">all 1s</text>' +
		'<text x="300" y="52" text-anchor="middle" class="lbl">unexamined ?</text>' +
		'<text x="425" y="52" text-anchor="middle" style="fill:var(--err-edge)">all 2s</text>' +
		'</g>' +
		// pointer ticks
		'<path d="M 130 64 V 84" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="130" y="100" text-anchor="middle" style="fill:var(--ok)">low</text>' +
		'<path d="M 230 64 V 84" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="230" y="100" text-anchor="middle" style="fill:var(--accent)">mid</text>' +
		'<path d="M 370 64 V 84" fill="none" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<text x="370" y="100" text-anchor="middle" style="fill:var(--err-edge)">high</text>' +
		// mid advances into the unknown
		'<path d="M 244 78 h 30" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowSCL)"/>' +
		// the three moves
		'<text x="20" y="130" class="lbl">nums[mid]==0 → swap with low, low++, mid++</text>' +
		'<text x="20" y="147" class="lbl">nums[mid]==1 → mid++</text>' +
		'<text x="20" y="164" class="lbl">nums[mid]==2 → swap with high, high-- — but do NOT advance mid</text>' +
		'<defs><marker id="dgArrowSCL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'sort-colors',
		title: 'Sort Colors',
		nav: 'Sort Colors',
		difficulty: 'Medium',
		category: 'Two Pointers',
		task: 'Implement sortColors (in place, one pass) — make all 6 tests pass.',

		prose: [
			'<h2>Sort Colors</h2>' +
			'<p>Given a slice <code>nums</code> containing only <code>0</code>s, ' +
			'<code>1</code>s and <code>2</code>s (red, white, blue), sort it ' +
			'<strong>in place</strong> so all 0s come first, then all 1s, then all 2s.</p>' +
			'<ul><li><code>sortColors</code> mutates its argument and returns nothing — ' +
			'the tests pass in a copy and inspect it afterwards.</li>' +
			'<li>You may not call a library sort. The target is <strong>one pass</strong>, ' +
			'O(1) extra space.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'nums := []int{2, 0, 2, 1, 1, 0}\nsortColors(nums)\n// nums is now [0, 0, 1, 1, 2, 2]', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Three values means three buckets — so maintain three <em>regions</em> and ' +
			'grow them as one scanner walks the unknown middle. This is Dijkstra’s ' +
			'<em>Dutch national flag</em> partition:</p>' +
			DIAGRAM +
			'<p>Everything left of <code>low</code> is 0, between <code>low</code> and ' +
			'<code>mid</code> is 1, right of <code>high</code> is 2 — and the loop ends ' +
			'exactly when the unexamined gap between <code>mid</code> and <code>high</code> ' +
			'closes.</p>',
		],

		starter: [
			'package main',
			'',
			'// sortColors sorts nums — containing only 0s, 1s and 2s — in place:',
			'// all 0s first, then 1s, then 2s. One pass, O(1) extra space; no',
			'// library sort. It returns nothing: callers observe the mutation.',
			'func sortColors(nums []int) {',
			'	// your code here (rearrange nums in place)',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"reflect"',
			')',
			'',
			LC.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		nums []int',
			'		want []int',
			'	}',
			'	cases := []tc{',
			'		{[]int{2, 0, 2, 1, 1, 0}, []int{0, 0, 1, 1, 2, 2}},',
			'		{[]int{2, 0, 1}, []int{0, 1, 2}},',
			'		{[]int{1, 2, 0}, []int{0, 1, 2}},          // catches advancing mid after the high swap',
			'		{[]int{2, 2, 1, 1, 0, 0}, []int{0, 0, 1, 1, 2, 2}}, // fully reversed',
			'		{[]int{0, 1, 2}, []int{0, 1, 2}},          // already sorted',
			'		{[]int{0}, []int{0}},                       // single element / one color',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v", c.nums),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// sortColors mutates in place and returns nothing, so hand it',
			'			// a copy (keeping c.nums pristine for the display string) and',
			'			// compare the mutated copy against want.',
			'			cp := append([]int(nil), c.nums...)',
			'			sortColors(cp)',
			'			r["pass"] = reflect.DeepEqual(cp, c.want)',
			'			r["got"] = fmt.Sprintf("%v", cp)',
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
			'// sortColors sorts nums (0s, 1s, 2s only) in place in one pass',
			'// using the Dutch national flag partition.',
			'//',
			'// Loop invariant — four regions, maintained by every step:',
			'//',
			'//	[0, low)     all 0s',
			'//	[low, mid)   all 1s',
			'//	[mid, high]  unexamined',
			'//	(high, len)  all 2s',
			'//',
			'// mid is the scanner. The loop runs while mid <= high because the',
			'// element AT high is still unexamined; stopping at mid < high would',
			'// leave one value unclassified.',
			'func sortColors(nums []int) {',
			'	low, mid, high := 0, 0, len(nums)-1',
			'	for mid <= high {',
			'		switch nums[mid] {',
			'		case 0:',
			'			// Send the 0 down to the 1s/0s boundary. The value coming',
			'			// back is from [low, mid), which the invariant says is a 1',
			'			// (or mid == low and we swap with ourselves) — already',
			'			// classified, so advancing mid here is safe.',
			'			nums[low], nums[mid] = nums[mid], nums[low]',
			'			low++',
			'			mid++',
			'		case 1:',
			'			mid++ // already in its region; just extend it',
			'		case 2:',
			'			// Send the 2 up to the blue boundary. Crucially, do NOT',
			'			// advance mid: the value swapped in comes from the',
			'			// UNEXAMINED region and could be a 0 that still needs to',
			'			// travel left. Advancing here is the classic bug — on',
			'			// [1, 2, 0] it strands the 0 in the middle: [1, 0, 2].',
			'			nums[mid], nums[high] = nums[high], nums[mid]',
			'			high--',
			'		}',
			'	}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Any comparison sort is O(n log n) — and banned anyway. With only three ' +
			'distinct values, <em>counting sort</em> is the natural two-pass answer: count ' +
			'the 0s, 1s and 2s, then overwrite the slice region by region. O(n) time, O(1) ' +
			'space… but two passes, and it rewrites values rather than moving them (a ' +
			'dealbreaker if the elements were records keyed by color).</p>' +
			'<h3>One pass: grow three regions at once</h3>' +
			'<p>The Dutch national flag partition keeps the slice split into four zones — ' +
			'0s, 1s, unexamined, 2s — and classifies one unexamined element per step:</p>',
			{ code: 'low, mid, high := 0, 0, len(nums)-1\nfor mid <= high {\n\tswitch nums[mid] {\n\tcase 0:\n\t\tnums[low], nums[mid] = nums[mid], nums[low]\n\t\tlow++\n\t\tmid++ // swapped-in value came from [low,mid): a known 1\n\tcase 1:\n\t\tmid++\n\tcase 2:\n\t\tnums[mid], nums[high] = nums[high], nums[mid]\n\t\thigh-- // NO mid++: the swapped-in value is unexamined\n\t}\n}' },
			'<p>The two asymmetries are where the thinking lives:</p>' +
			'<ul>' +
			'<li><strong>Why mid advances after the low swap but not the high swap.</strong> ' +
			'A swap with <code>low</code> pulls a value from <code>[low, mid)</code> — by ' +
			'the invariant, a known 1 — so it needs no re-inspection. A swap with ' +
			'<code>high</code> pulls a value from the <em>unexamined</em> zone; it could be ' +
			'a 0 that must keep moving. Advance mid there and <code>[1, 2, 0]</code> ends ' +
			'up as <code>[1, 0, 2]</code> — the test table includes exactly that case.</li>' +
			'<li><strong>Why the loop runs while <code>mid &lt;= high</code>.</strong> ' +
			'<code>high</code> points at an unexamined element, not past it; ' +
			'<code>mid &lt; high</code> would quit with one value never classified.</li>' +
			'</ul>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Three-way partitioning (Dutch national flag)</strong> — reach for it ' +
			'when elements fall into a small number of ordered classes and “sorted” really ' +
			'means “grouped”: one pass, O(1) space, driven by region invariants rather than ' +
			'comparisons. It is literally the partition step of 3-way quicksort (the ' +
			'variant that stays fast under many duplicate keys), and the simpler 2-way form ' +
			'is the move-matching-elements step in <em>Move Zeroes</em>-style problems. The ' +
			'squeeze-from-both-ends bookkeeping is the same family as <em>Two Sum II</em> ' +
			'and <em>3Sum</em>; counting sort remains the honest two-pass fallback when ' +
			'stability of a single pass doesn’t matter.</p>',
		],
		complexity: { time: 'O(n) — one pass', space: 'O(1)' },
	});
})();
