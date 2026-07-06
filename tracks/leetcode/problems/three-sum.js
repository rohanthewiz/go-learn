/* 3Sum — Two Pointers (Medium). Sort, fix one element, and squeeze the other
 * two with converging pointers. The algorithm is the easy half; the three
 * dedupe rules (skip repeated i, l, r values) are the real problem.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 170" width="500" height="170" role="img" aria-label="sorted array with a fixed index and two converging pointers">' +
		'<text x="380" y="20" class="lbl">sorted</text>' +
		// pin above the fixed i
		'<path d="M 100 46 V 28" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="100" y="20" text-anchor="middle" style="fill:var(--accent)">i (fixed)</text>' +
		// sorted array cells: i in accent, l and r (the current hit) in ok
		'<g>' +
		'<rect x="20" y="50" width="48" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="76" y="50" width="48" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="132" y="50" width="48" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="188" y="50" width="48" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="244" y="50" width="48" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="300" y="50" width="48" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="44" y="72" text-anchor="middle">-4</text>' +
		'<text x="100" y="72" text-anchor="middle">-1</text>' +
		'<text x="156" y="72" text-anchor="middle">-1</text>' +
		'<text x="212" y="72" text-anchor="middle">0</text>' +
		'<text x="268" y="72" text-anchor="middle">1</text>' +
		'<text x="324" y="72" text-anchor="middle">2</text>' +
		'<text x="44" y="98" text-anchor="middle" class="lbl">0</text>' +
		'<text x="100" y="98" text-anchor="middle" class="lbl">1</text>' +
		'<text x="156" y="98" text-anchor="middle" class="lbl">2</text>' +
		'<text x="212" y="98" text-anchor="middle" class="lbl">3</text>' +
		'<text x="268" y="98" text-anchor="middle" class="lbl">4</text>' +
		'<text x="324" y="98" text-anchor="middle" class="lbl">5</text>' +
		'</g>' +
		// converging pointers beneath
		'<text x="156" y="120" text-anchor="middle" style="fill:var(--ok)">l</text>' +
		'<path d="M 168 116 h 22" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrow3S)"/>' +
		'<text x="324" y="120" text-anchor="middle" style="fill:var(--ok)">r</text>' +
		'<path d="M 312 116 h -22" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrow3S)"/>' +
		'<text x="240" y="138" text-anchor="middle" class="lbl">sum &lt; 0 → l++ · sum &gt; 0 → r--</text>' +
		'<text x="240" y="160" text-anchor="middle" style="fill:var(--ok)">(-1) + (-1) + 2 = 0 ✓</text>' +
		'<defs><marker id="dgArrow3S" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'three-sum',
		title: '3Sum',
		nav: '3Sum',
		difficulty: 'Medium',
		category: 'Two Pointers',
		task: 'Implement threeSum — make all 4 tests pass.',

		prose: [
			'<h2>3Sum</h2>' +
			'<p>Given a slice of integers <code>nums</code>, return <em>all unique ' +
			'triplets</em> <code>[a, b, c]</code> from it such that ' +
			'<code>a + b + c == 0</code>.</p>' +
			'<ul><li>A triplet uses three <em>distinct positions</em> (values may repeat).</li>' +
			'<li>The result must not contain duplicate triplets.</li>' +
			'<li>Triplet order and order within a triplet don’t matter — the tests ' +
			'normalize both before comparing.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'threeSum([]int{-1, 0, 1, 2, -1, -4})  →  [[-1, -1, 2], [-1, 0, 1]]\nthreeSum([]int{0, 1, 1})              →  []', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Sort first. Then fix one element <code>nums[i]</code> and the problem ' +
			'collapses to Two Sum on the sorted tail: two pointers squeeze inward, ' +
			'steered by whether the sum is under or over zero:</p>' +
			DIAGRAM +
			'<p>Sorting also puts equal values side by side — which is what makes ' +
			'skipping duplicates possible at all.</p>',
		],

		starter: [
			'package main',
			'',
			'// threeSum returns all unique triplets [a, b, c] from nums with',
			'// a + b + c == 0. Order of triplets (and within a triplet) is up',
			'// to you — the tests normalize before comparing.',
			'func threeSum(nums []int) [][]int {',
			'	// your code here',
			'	return nil',
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
			'	"sort"',
			')',
			'',
			LC.HARNESS_RT,
			'',
			'// normalizeTriplets sorts each triplet ascending, then the list',
			'// lexicographically, so any valid answer order compares equal.',
			'// Always returns a non-nil slice: a nil result and an empty result',
			'// both normalize to [][]int{}, keeping DeepEqual honest on the',
			'// no-solution cases.',
			'func normalizeTriplets(ts [][]int) [][]int {',
			'	out := make([][]int, 0, len(ts))',
			'	for _, t := range ts {',
			'		c := append([]int(nil), t...) // don’t mutate the solver’s memory',
			'		sort.Ints(c)',
			'		out = append(out, c)',
			'	}',
			'	sort.Slice(out, func(i, j int) bool {',
			'		a, b := out[i], out[j]',
			'		for k := 0; k < len(a) && k < len(b); k++ {',
			'			if a[k] != b[k] {',
			'				return a[k] < b[k]',
			'			}',
			'		}',
			'		return len(a) < len(b)',
			'	})',
			'	return out',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		nums []int',
			'		want [][]int',
			'	}',
			'	cases := []tc{',
			'		{[]int{-1, 0, 1, 2, -1, -4}, [][]int{{-1, -1, 2}, {-1, 0, 1}}},',
			'		{[]int{0, 1, 1}, [][]int{}},',
			'		{[]int{0, 0, 0}, [][]int{{0, 0, 0}}},',
			'		{[]int{}, [][]int{}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		want := normalizeTriplets(c.want)',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v", c.nums),',
			'			"want":  fmt.Sprintf("%v", want),',
			'		}',
			'		runCase(r, func() {',
			'			// Defensive copy: the canonical solution sorts its input.',
			'			got := normalizeTriplets(threeSum(append([]int(nil), c.nums...)))',
			'			r["pass"] = reflect.DeepEqual(got, want)',
			'			r["got"] = fmt.Sprintf("%v", got)',
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
			'import "sort"',
			'',
			'// threeSum returns all unique triplets from nums summing to zero.',
			'//',
			'// Sort + fix-one + two pointers. Sorting buys three things at once:',
			'// the pointer squeeze becomes directional (sum too low → only moving',
			'// l up can help; too high → only r down), duplicates become adjacent',
			'// so uniqueness is a neighbor check instead of a set of triplets,',
			'// and a positive nums[i] ends the search early.',
			'func threeSum(nums []int) [][]int {',
			'	sorted := append([]int(nil), nums...) // callers keep their order',
			'	sort.Ints(sorted)',
			'',
			'	res := [][]int{} // non-nil so "no triplets" is [] rather than null',
			'	for i := 0; i < len(sorted)-2; i++ {',
			'		if sorted[i] > 0 {',
			'			break // everything from here is positive — no zero sum left',
			'		}',
			'		// Dedupe rule 1: a repeated anchor value would rediscover the',
			'		// exact same triplet set. Comparing i to i-1 (not i to i+1)',
			'		// still allows triplets that USE duplicates, like [-1, -1, 2].',
			'		if i > 0 && sorted[i] == sorted[i-1] {',
			'			continue',
			'		}',
			'		l, r := i+1, len(sorted)-1',
			'		for l < r {',
			'			sum := sorted[i] + sorted[l] + sorted[r]',
			'			switch {',
			'			case sum < 0:',
			'				l++ // need a bigger number; only l can supply it',
			'			case sum > 0:',
			'				r-- // need a smaller number; only r can supply it',
			'			default:',
			'				res = append(res, []int{sorted[i], sorted[l], sorted[r]})',
			'				l++',
			'				r--',
			'				// Dedupe rules 2 and 3: hop over runs of the values just',
			'				// used. Skipping only ONE side would still emit dupes',
			'				// like (-1, 0, 1) twice when both 0 and 1 repeat.',
			'				for l < r && sorted[l] == sorted[l-1] {',
			'					l++',
			'				}',
			'				for l < r && sorted[r] == sorted[r+1] {',
			'					r--',
			'				}',
			'			}',
			'		}',
			'	}',
			'	return res',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Three nested loops test every index triple — O(n³) — and you <em>still</em> ' +
			'need a set keyed on the sorted triplet to weed out duplicates. Both problems ' +
			'(the cubic scan and the dedupe bookkeeping) dissolve once the slice is ' +
			'sorted.</p>' +
			'<h3>Sort, fix one, squeeze two</h3>' +
			'<p>After sorting, fix an anchor <code>nums[i]</code>; the remaining task — find ' +
			'two later elements summing to <code>-nums[i]</code> — is Two Sum on a sorted ' +
			'range, solvable with converging pointers because the sum moves monotonically ' +
			'with each pointer:</p>',
			{ code: 'l, r := i+1, len(sorted)-1\nfor l < r {\n\tsum := sorted[i] + sorted[l] + sorted[r]\n\tswitch {\n\tcase sum < 0:\n\t\tl++\n\tcase sum > 0:\n\t\tr--\n\tdefault:\n\t\tres = append(res, []int{sorted[i], sorted[l], sorted[r]})\n\t\tl++\n\t\tr--\n\t\tfor l < r && sorted[l] == sorted[l-1] {\n\t\t\tl++ // hop the run of equal values just used\n\t\t}\n\t\tfor l < r && sorted[r] == sorted[r+1] {\n\t\t\tr--\n\t\t}\n\t}\n}' },
			'<p>The dedupe rules are the whole difficulty:</p>' +
			'<ul>' +
			'<li><strong>Anchor skip looks backward.</strong> ' +
			'<code>sorted[i] == sorted[i-1]</code> skips <em>re-anchoring</em> on a value ' +
			'already fully explored, while still permitting duplicates <em>inside</em> one ' +
			'triplet — <code>[-1, -1, 2]</code> survives; a forward-looking check would ' +
			'kill it.</li>' +
			'<li><strong>Skip both pointers after a hit.</strong> Advancing past runs on ' +
			'only one side re-pairs the other side’s duplicate into the same triplet ' +
			'again.</li>' +
			'<li><strong>Early break on <code>sorted[i] &gt; 0</code>.</strong> Three ' +
			'positives can’t sum to zero — correctness aside, it’s free pruning.</li>' +
			'<li><strong>Return <code>[][]int{}</code>, not nil.</strong> “No triplets” is ' +
			'an empty answer, not an absent one.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n²)', space: 'O(1) extra (O(n) for the sorted copy)' },
	});
})();
