/* K Closest Points to Origin — Heap / Priority Queue (Medium). The
 * bounded-heap top-k pattern with the comparator INVERTED relative to
 * what you keep: to hold the k SMALLEST distances, use a MAX-heap whose
 * root is the farthest point kept — the one candidate eviction ever
 * needs. Distances stay squared throughout: sqrt is monotonic, so it
 * can never change a comparison.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// points = [[3,3],[5,-1],[-2,4]], k = 2. Left: the plane, with the
	// dashed circle through the kth-closest point separating kept from
	// discarded. Right: the max-heap of the k best — farthest at the root.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="max-heap of size k keeps the k points closest to the origin">' +
		'<text x="20" y="16" class="lbl">points = [[3,3],[5,-1],[-2,4]] · k = 2 · d² = x² + y²</text>' +
		// axes
		'<g stroke="var(--edge)" stroke-width="1">' +
		'<line x1="25" y1="115" x2="225" y2="115"/>' +
		'<line x1="115" y1="32" x2="115" y2="190"/>' +
		'</g>' +
		'<text x="121" y="128" class="lbl">0</text>' +
		// radius of the kth closest (d^2 = 20 -> r ~ 4.47 units at 18px/unit)
		'<circle cx="115" cy="115" r="80" fill="none" stroke="var(--ok)" stroke-dasharray="5 4"/>' +
		// kept points (inside): (3,3) d2=18, (-2,4) d2=20
		'<circle cx="169" cy="61" r="6" fill="var(--ok)"/>' +
		'<text x="180" y="56" class="lbl">(3,3) d²=18</text>' +
		'<circle cx="79" cy="43" r="6" fill="var(--ok)"/>' +
		'<text x="20" y="38" class="lbl">(-2,4) d²=20</text>' +
		// discarded point (outside): (5,-1) d2=26
		'<circle cx="205" cy="133" r="6" fill="none" stroke="var(--dim)" stroke-width="1.6"/>' +
		'<text x="150" y="152" class="lbl">(5,-1) d²=26 — out</text>' +
		// hand-off to the heap
		'<line x1="250" y1="90" x2="322" y2="90" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowKCP)"/>' +
		'<text x="286" y="76" text-anchor="middle" class="lbl">keep the k best</text>' +
		// the max-heap of the kept points
		'<text x="345" y="40" class="lbl">max-heap capped at k</text>' +
		'<line x1="400" y1="72" x2="365" y2="118" stroke="var(--edge)"/>' +
		'<g fill="var(--panel)">' +
		'<circle cx="400" cy="64" r="17" stroke="var(--accent)" stroke-width="2"/>' +
		'<circle cx="360" cy="130" r="17" stroke="var(--edge)" stroke-width="1.6"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="400" y="69">20</text><text x="360" y="135">18</text>' +
		'</g>' +
		'<text x="430" y="60" class="lbl">root = farthest kept</text>' +
		'<text x="430" y="76" class="lbl">= the gatekeeper</text>' +
		'<text x="345" y="168" class="lbl">newcomer closer than the root?</text>' +
		'<text x="345" y="184" class="lbl">evict the root · else discard it</text>' +
		'<defs><marker id="dgArrowKCP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'k-closest-points',
		title: 'K Closest Points to Origin',
		nav: 'K Closest Points',
		difficulty: 'Medium',
		category: 'Heap / Priority Queue',
		task: 'Implement kClosest — make all 5 tests pass.',

		prose: [
			'<h2>K Closest Points to Origin</h2>' +
			'<p>Given a slice of <code>points</code> on the plane (each ' +
			'<code>[x, y]</code>) and an integer <code>k</code>, return the <code>k</code> ' +
			'points closest to the origin <code>(0, 0)</code> by Euclidean distance.</p>' +
			'<ul><li>Compare <em>squared</em> distances <code>x² + y²</code> — ' +
			'<code>sqrt</code> is monotonic (it preserves order), so taking roots buys ' +
			'nothing and drags in floating point.</li>' +
			'<li>You may return the k points in <em>any order</em>; the tests sort both ' +
			'your answer and the expected one before comparing. The test data has no ' +
			'ties in distance, so the correct set is unique.</li>' +
			'<li>The <code>pointHeap</code> scaffolding in the starter is a ' +
			'<em>max</em>-heap by distance — keep its size capped at <code>k</code> via ' +
			'<code>container/heap</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'kClosest([][]int{{1, 3}, {-2, 2}}, 1)           →  [[-2, 2]]   // d²: 10 vs 8\nkClosest([][]int{{3, 3}, {5, -1}, {-2, 4}}, 2)  →  [[3, 3], [-2, 4]]', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>To keep the k <em>closest</em> points, the element you must have instant ' +
			'access to is the <em>farthest one you are keeping</em> — it is the only ' +
			'candidate for eviction. So the comparator is <strong>inverted relative to ' +
			'what you keep</strong>: a max-heap capped at k, its root the current ' +
			'gatekeeper. Any newcomer closer than the root replaces it; everything else ' +
			'is discarded in O(1):</p>' +
			DIAGRAM +
			'<p>The heap never grows past k — that bound is the entire advantage over ' +
			'sorting.</p>',
		],

		starter: [
			'package main',
			'',
			'// dist2 returns the squared distance of p from the origin. Squared,',
			'// not rooted: sqrt is monotonic, so comparisons come out identical',
			'// and everything stays in exact integer arithmetic.',
			'func dist2(p []int) int { return p[0]*p[0] + p[1]*p[1] }',
			'',
			'// pointHeap is a MAX-heap of points ordered by squared distance',
			'// from the origin, for use with container/heap.',
			'//',
			'// heap.Interface = sort.Interface (Len/Less/Swap) + Push/Pop.',
			'// Less is reversed (>) so the FARTHEST kept point surfaces at the',
			'// root — when the heap is capped at k points, the root is the one',
			'// a closer newcomer should evict. Push/Pop work on the slice TAIL',
			'// and need pointer receivers because they change the slice header.',
			'type pointHeap [][]int',
			'',
			'func (h pointHeap) Len() int           { return len(h) }',
			'func (h pointHeap) Less(i, j int) bool { return dist2(h[i]) > dist2(h[j]) } // reversed: max-heap',
			'func (h pointHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }',
			'',
			'// Push appends x at the tail; heap.Push sifts it into place after.',
			'func (h *pointHeap) Push(x any) { *h = append(*h, x.([]int)) }',
			'',
			'// Pop removes and returns the TAIL element; heap.Pop has already',
			'// swapped the root there and will hand this value back to you.',
			'func (h *pointHeap) Pop() any {',
			'	old := *h',
			'	n := len(old)',
			'	x := old[n-1]',
			'	*h = old[:n-1]',
			'	return x',
			'}',
			'',
			'// kClosest returns the k points closest to the origin, in any',
			'// order. 1 <= k <= len(points). Keep pointHeap capped at k',
			'// elements via container/heap.',
			'func kClosest(points [][]int, k int) [][]int {',
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
			'		points [][]int',
			'		k      int',
			'		want   [][]int',
			'	}',
			'	// Every case uses points with pairwise-DISTINCT squared distances,',
			'	// so the correct k-subset is unique and set comparison is exact.',
			'	cases := []tc{',
			'		{[][]int{{1, 3}, {-2, 2}}, 1, [][]int{{-2, 2}}},                          // d²: 10 vs 8',
			'		{[][]int{{3, 3}, {5, -1}, {-2, 4}}, 2, [][]int{{3, 3}, {-2, 4}}},         // 18, 26, 20',
			'		{[][]int{{1, 1}, {2, 2}, {3, 3}}, 3, [][]int{{1, 1}, {2, 2}, {3, 3}}},    // k = all points',
			'		{[][]int{{-1, -2}, {-3, -4}, {-2, -2}}, 2, [][]int{{-1, -2}, {-2, -2}}},  // all-negative quadrant: 5, 25, 8',
			'		{[][]int{{2, 2}, {2, 3}, {3, 1}, {1, 2}}, 1, [][]int{{1, 2}}},            // clustered: 8, 13, 10, 5',
			'	}',
			'	// The answer order is unspecified, so both got and want are',
			'	// normalized with the same deterministic comparator before the',
			'	// DeepEqual: by squared distance, then x, then y.',
			'	normalize := func(ps [][]int) [][]int {',
			'		out := append([][]int(nil), ps...)',
			'		sort.Slice(out, func(i, j int) bool {',
			'			di := out[i][0]*out[i][0] + out[i][1]*out[i][1]',
			'			dj := out[j][0]*out[j][0] + out[j][1]*out[j][1]',
			'			if di != dj {',
			'				return di < dj',
			'			}',
			'			if out[i][0] != out[j][0] {',
			'				return out[i][0] < out[j][0]',
			'			}',
			'			return out[i][1] < out[j][1]',
			'		})',
			'		return out',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("points=%v, k=%d", c.points, c.k),',
			'			"want":  fmt.Sprintf("%v (any order)", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Copy the outer slice: quickselect-style solutions reorder it.',
			'			got := kClosest(append([][]int(nil), c.points...), c.k)',
			'			r["pass"] = reflect.DeepEqual(normalize(got), normalize(c.want))',
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
			'import "container/heap"',
			'',
			'// dist2 returns the squared distance of p from the origin. Squared,',
			'// not rooted: sqrt is monotonic, so comparisons come out identical',
			'// and everything stays in exact integer arithmetic.',
			'func dist2(p []int) int { return p[0]*p[0] + p[1]*p[1] }',
			'',
			'// pointHeap is a MAX-heap of points by squared distance.',
			'//',
			'// The polarity is the interesting choice: the task keeps the k',
			'// SMALLEST distances, yet the heap is a MAX-heap. The element that',
			'// needs O(1) access is the weakest member of the kept set — the',
			'// farthest point, the only one a better candidate ever displaces —',
			'// and reversing Less puts exactly that element at the root.',
			'type pointHeap [][]int',
			'',
			'func (h pointHeap) Len() int           { return len(h) }',
			'func (h pointHeap) Less(i, j int) bool { return dist2(h[i]) > dist2(h[j]) } // reversed: max-heap',
			'func (h pointHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }',
			'',
			'// Push/Pop are tail plumbing for the heap package — call heap.Push',
			'// and heap.Pop, never these directly. Pointer receivers because',
			'// append and reslicing replace the slice header.',
			'func (h *pointHeap) Push(x any) { *h = append(*h, x.([]int)) }',
			'',
			'func (h *pointHeap) Pop() any {',
			'	old := *h',
			'	n := len(old)',
			'	x := old[n-1]',
			'	*h = old[:n-1]',
			'	return x',
			'}',
			'',
			'// kClosest keeps a max-heap of the k closest points seen so far.',
			'//',
			'// Invariant: after any prefix of points, the heap holds that',
			'// prefix’s k closest, so its root is the farthest kept. Each new',
			'// point costs one comparison against the root:',
			'//   - heap not yet full   → push (log k)',
			'//   - closer than root    → replace the root, one sift-down (log k)',
			'//   - farther than root   → provably not top-k; skip in O(1)',
			'// The heap never exceeds k entries: O(n log k) time, O(k) space,',
			'// versus O(n log n) for sorting everything by distance.',
			'func kClosest(points [][]int, k int) [][]int {',
			'	h := make(pointHeap, 0, k)',
			'	for _, p := range points {',
			'		if len(h) < k {',
			'			heap.Push(&h, p) // still filling to capacity',
			'		} else if dist2(p) < dist2(h[0]) {',
			'			// Evict the gatekeeper. Overwriting the root and calling',
			'			// heap.Fix is one sift-down — cheaper than pop-then-push,',
			'			// which sifts twice for the same result.',
			'			h[0] = p',
			'			heap.Fix(&h, 0)',
			'		}',
			'	}',
			'	// The heap slice IS the answer set; copy it out so the caller',
			'	// owns plain data, in whatever order heap shape left it (the',
			'	// problem allows any order).',
			'	return append([][]int(nil), h...)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Sort all n points by distance and slice off the first k — O(n log n), ' +
			'and perfectly fine as a baseline. But it computes a total order over ' +
			'<em>every</em> point when the question only asks for a k-element set, order ' +
			'within it irrelevant. Two observations sharpen it:</p>' +
			'<ul>' +
			'<li><strong>Never take square roots.</strong> <code>sqrt</code> is strictly ' +
			'increasing, so <code>sqrt(a) &lt; sqrt(b)</code> exactly when ' +
			'<code>a &lt; b</code> — comparing <code>x² + y²</code> directly gives the ' +
			'same ranking in exact integer math, with no float rounding to worry ' +
			'about.</li>' +
			'<li><strong>A point&rsquo;s fate depends on one comparison.</strong> If it is ' +
			'farther than the farthest of the current best k, it can never be in the ' +
			'answer — no other information needed.</li>' +
			'</ul>' +
			'<h3>The bounded heap, comparator inverted</h3>' +
			'<p>That second observation is the size-k heap pattern, with the polarity ' +
			'rule worth memorizing: <strong>the heap&rsquo;s comparator is inverted ' +
			'relative to what you keep</strong>. Keeping the k smallest distances means ' +
			'evicting the largest kept one, so the root must be the <em>max</em> — the ' +
			'mirror image of Kth Largest Element, which kept the k largest values behind ' +
			'a <em>min</em>-heap root:</p>',
			{ code: 'h := make(pointHeap, 0, k)\nfor _, p := range points {\n\tif len(h) < k {\n\t\theap.Push(&h, p)\n\t} else if dist2(p) < dist2(h[0]) {\n\t\th[0] = p        // closer than the farthest kept: evict it\n\t\theap.Fix(&h, 0) // one sift-down restores heap order\n\t}\n}\nreturn append([][]int(nil), h...) // the kept set, any order' },
			'<p>Why this wins: the heap never grows past k, so the scan is O(n log k) ' +
			'time and O(k) extra space — for k=10 over a million points, ~3 comparisons ' +
			'per sift instead of ~20, and most points exit at the single O(1) root ' +
			'comparison. It also works on a <em>stream</em>: points can arrive one at a ' +
			'time, unbounded, and memory stays O(k).</p>' +
			'<p>The follow-up answer is <strong>quickselect</strong>: partition around a ' +
			'pivot distance (as in quicksort) and recurse only into the side containing ' +
			'the k-boundary — O(n) average time, in place, but O(n²) worst case and it ' +
			'needs the whole slice resident and mutable. Interviews usually want the ' +
			'heap version first and quickselect named as the average-case optimum.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Bounded heap for top-k</strong> — the trigger is "the k ' +
			'largest / smallest / closest / most frequent" where k is small relative to ' +
			'n, or the data arrives as a stream you cannot sort. Keep a heap of the k ' +
			'best with the comparator inverted (min-heap to keep maxima, max-heap to ' +
			'keep minima) so the root is always the eviction candidate; cost O(n log k) ' +
			'time, O(k) space against O(n log n) for a full sort. The same idiom drives ' +
			'Kth Largest Element in an Array (min-heap of the k largest) and Top K ' +
			'Frequent Elements (heap keyed by count), and the heap-as-frontier idea ' +
			'reappears in Merge K Sorted Lists.</p>',
		],
		complexity: { time: 'O(n log k)', space: 'O(k)' },
	});
})();
