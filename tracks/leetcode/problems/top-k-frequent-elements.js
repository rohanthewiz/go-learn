/* Top K Frequent Elements — Arrays & Hashing (Medium). Frequency map plus
 * bucket sort: counts are bounded by len(nums), so "sort by count" needs
 * no comparison sort at all — index an array by count and walk it from the
 * top. The harness sorts both answers before comparing, because the
 * problem does not fix an output order.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="frequency map bucketed by count">' +
		'<text x="20" y="16" class="lbl">freq (value → count)</text>' +
		// frequency map
		'<g>' +
		'<rect x="20" y="26" width="110" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="35" y="45">1 → 3</text>' +
		'<rect x="20" y="60" width="110" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="35" y="79">2 → 2</text>' +
		'<rect x="20" y="94" width="110" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="35" y="113">3 → 1</text>' +
		'<text x="20" y="150" class="lbl">nums = [1,1,1,2,2,3]</text>' +
		'<text x="20" y="168" class="lbl">k = 2</text>' +
		'</g>' +
		// arrow map → buckets
		'<line x1="140" y1="74" x2="196" y2="74" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowTK)"/>' +
		'<text x="168" y="62" text-anchor="middle" class="lbl">bucket</text>' +
		// buckets indexed by count
		'<g>' +
		'<text x="210" y="16" class="lbl">buckets (index = count)</text>' +
		'<rect x="210" y="26" width="150" height="28" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'<text x="225" y="45" class="lbl">—</text>' +
		'<rect x="210" y="60" width="150" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="225" y="79">[3]</text>' +
		'<rect x="210" y="94" width="150" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="225" y="113">[2]</text>' +
		'<rect x="210" y="128" width="150" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="225" y="147">[1]</text>' +
		'<text x="378" y="45" class="lbl">count 0</text>' +
		'<text x="378" y="79" class="lbl">count 1</text>' +
		'<text x="378" y="113" class="lbl">count 2</text>' +
		'<text x="378" y="147" class="lbl">count 3</text>' +
		'</g>' +
		// collect arrow: walk from the highest count down
		'<path d="M 455 140 C 470 120 470 106 458 104" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowTK)"/>' +
		'<text x="290" y="180" style="fill:var(--ok)">walk top-down, take k = 2  →  [1, 2]</text>' +
		'<defs><marker id="dgArrowTK" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'top-k-frequent-elements',
		title: 'Top K Frequent Elements',
		nav: 'Top K Frequent',
		difficulty: 'Medium',
		category: 'Arrays & Hashing',
		task: 'Implement topKFrequent — make all 5 tests pass.',

		prose: [
			'<h2>Top K Frequent Elements</h2>' +
			'<p>Given a slice of integers <code>nums</code> and an integer <code>k</code>, ' +
			'return the <code>k</code> most frequent elements.</p>' +
			'<ul><li>The answer is guaranteed unique: no tie decides which values are in the ' +
			'top <code>k</code>.</li>' +
			'<li>You may return the elements in <em>any order</em> — the tests sort your ' +
			'answer and the expected answer before comparing.</li>' +
			'<li>Can you beat O(n log n)?</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'topKFrequent([]int{1, 1, 1, 2, 2, 3}, 2)  →  []int{1, 2}   // any order accepted\ntopKFrequent([]int{1}, 1)                  →  []int{1}', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Count occurrences with a map, then notice the counts live in a tiny range: ' +
			'a value can occur at most <code>len(nums)</code> times. So instead of sorting ' +
			'by count, <em>index</em> by count — bucket <code>buckets[c]</code> holds every ' +
			'value that occurred exactly <code>c</code> times — and walk the buckets from ' +
			'the highest count down until <code>k</code> values are collected:</p>' +
			DIAGRAM +
			'<p>Two linear passes and a bounded bucket walk — O(n) overall.</p>',
		],

		starter: [
			'package main',
			'',
			'// topKFrequent returns the k most frequent values in nums, in any',
			'// order. The answer is guaranteed to be unique.',
			'func topKFrequent(nums []int, k int) []int {',
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
			'func main() {',
			'	type tc struct {',
			'		nums []int',
			'		k    int',
			'		want []int',
			'	}',
			'	cases := []tc{',
			'		{[]int{1, 1, 1, 2, 2, 3}, 2, []int{1, 2}},',
			'		{[]int{1}, 1, []int{1}},',
			'		{[]int{4, 4, 4, 5, 5, 6}, 1, []int{4}},',
			'		{[]int{-1, -1, -2, -2, -2}, 2, []int{-2, -1}},',
			'		{[]int{7, 7, 7, 7}, 1, []int{7}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v, k=%d", c.nums, c.k),',
			'			"want":  fmt.Sprintf("%v (any order)", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := topKFrequent(append([]int(nil), c.nums...), c.k)',
			'			// Output order is unspecified, so normalize: sort copies of',
			'			// got and want and compare those, accepting any correct order.',
			'			gotN := append([]int{}, got...)',
			'			wantN := append([]int{}, c.want...)',
			'			sort.Ints(gotN)',
			'			sort.Ints(wantN)',
			'			r["pass"] = reflect.DeepEqual(gotN, wantN)',
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
			'// topKFrequent returns the k most frequent values in nums, in any',
			'// order.',
			'//',
			'// Two-phase plan: a frequency map (value → count), then a bucket',
			'// sort keyed by count. The crucial observation is that counts are',
			'// bounded — a value occurs between 1 and len(nums) times — so',
			'// "order by count" needs no comparison sort: make one bucket per',
			'// possible count and drop each value into buckets[count]. Walking',
			'// the buckets from the highest count down yields values in',
			'// most-frequent-first order, and both phases are linear.',
			'func topKFrequent(nums []int, k int) []int {',
			'	// Phase 1: count occurrences.',
			'	freq := make(map[int]int, len(nums))',
			'	for _, n := range nums {',
			'		freq[n]++',
			'	}',
			'',
			'	// Phase 2: bucket by count. Index c holds every value seen',
			'	// exactly c times; index 0 stays empty (nothing occurs 0 times)',
			'	// but keeping it makes the indexing direct: buckets[count].',
			'	buckets := make([][]int, len(nums)+1)',
			'	for v, c := range freq {',
			'		buckets[c] = append(buckets[c], v)',
			'	}',
			'',
			'	// Collect from the most frequent end until k values are taken.',
			'	// The problem guarantees a unique answer, so no tie can straddle',
			'	// the k boundary.',
			'	out := make([]int, 0, k)',
			'	for c := len(buckets) - 1; c >= 1 && len(out) < k; c-- {',
			'		for _, v := range buckets[c] {',
			'			out = append(out, v)',
			'			if len(out) == k {',
			'				break',
			'			}',
			'		}',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Sort by count first</h3>' +
			'<p>The obvious plan: build a frequency map, copy its keys into a slice, ' +
			'<code>sort.Slice</code> descending by count, take the first <code>k</code>. ' +
			'Perfectly correct and fine in an interview — but the sort makes it ' +
			'O(n log n), and it sorts <em>far</em> more precisely than needed: we only care ' +
			'which values land in the top <code>k</code>, not the full ranking.</p>' +
			'<h3>Counts are bounded — bucket them</h3>' +
			'<p>A value occurs at most <code>len(nums)</code> times, so the count itself is ' +
			'a valid array index. One bucket per possible count, and “sorting” by count ' +
			'becomes placing each value at <code>buckets[count]</code> — O(1) each:</p>',
			{ code: 'buckets := make([][]int, len(nums)+1) // index = count\nfor v, c := range freq {\n\tbuckets[c] = append(buckets[c], v)\n}\nout := make([]int, 0, k)\nfor c := len(buckets) - 1; c >= 1 && len(out) < k; c-- {\n\tfor _, v := range buckets[c] {\n\t\tout = append(out, v)\n\t\tif len(out) == k {\n\t\t\tbreak\n\t\t}\n\t}\n}' },
			'<p>The fine print:</p>' +
			'<ul>' +
			'<li><strong>Why O(n)?</strong> Counting is one pass; bucketing touches each ' +
			'distinct value once; the collection walk visits at most <code>n+1</code> ' +
			'buckets and stops as soon as <code>k</code> values are in hand.</li>' +
			'<li><strong>The uniqueness guarantee matters.</strong> If ties could straddle ' +
			'the top-k boundary the bucket walk would have to choose arbitrarily; the ' +
			'problem rules that out.</li>' +
			'<li><strong>Bucket index space is n+1, not max(nums).</strong> Bucketing is by ' +
			'<em>count</em>, not by value — negative or huge values cost nothing extra.</li>' +
			'<li><strong>Output order is free.</strong> The tests sort both sides before ' +
			'comparing, so <code>[1,2]</code> and <code>[2,1]</code> are equally right.</li>' +
			'<li><strong>A heap is the middle road:</strong> a size-k min-heap over counts ' +
			'gives O(n log k) — worth knowing, but the buckets are simpler <em>and</em> faster here.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(n)' },
	});
})();
