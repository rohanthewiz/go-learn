/* Kth Largest Element in an Array — Heap / Priority Queue (Medium). The
 * size-k min-heap pattern: keep only the k largest values seen so far, with
 * the SMALLEST of them at the root as the gatekeeper. Any newcomer bigger
 * than the root evicts it; when the stream ends the root IS the kth
 * largest. O(n log k) — the heap never grows past k, which is the whole
 * point versus sorting (O(n log n)) when k is small.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// Final state on nums = [3,2,1,5,6,4] with k = 3: the heap holds the
	// three largest {4,5,6}; the root 4 (the smallest of them) is the 3rd
	// largest overall. Small values never displaced the root.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="size-k min-heap keeping the k largest values, root is the kth largest">' +
		'<text x="20" y="16" class="lbl">nums = [3, 2, 1, 5, 6, 4] · k = 3 · heap capped at k values</text>' +
		// rejected values, dashed — they never beat the root
		'<text x="20" y="52" class="lbl">too small to enter</text>' +
		'<g fill="none" stroke="var(--edge)" stroke-dasharray="4 3">' +
		'<rect x="24" y="64" width="34" height="30" rx="4"/>' +
		'<rect x="66" y="64" width="34" height="30" rx="4"/>' +
		'<rect x="108" y="64" width="34" height="30" rx="4"/>' +
		'</g>' +
		'<g text-anchor="middle" class="lbl">' +
		'<text x="41" y="84">3</text><text x="83" y="84">2</text><text x="125" y="84">1</text>' +
		'</g>' +
		'<text x="20" y="118" class="lbl">n ≤ root → discard</text>' +
		// gate arrow into the heap
		'<path d="M 150 79 C 200 79 230 68 262 60" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowKLE)"/>' +
		'<text x="205" y="52" text-anchor="middle" style="fill:var(--accent)">n &gt; root → evict root, insert n</text>' +
		// the min-heap of the k largest: root 4, children 5 and 6
		'<g stroke="var(--edge)">' +
		'<line x1="330" y1="66" x2="290" y2="118"/><line x1="330" y1="66" x2="370" y2="118"/>' +
		'</g>' +
		'<g fill="var(--panel)">' +
		'<circle cx="330" cy="58" r="16" stroke="var(--ok)" stroke-width="2"/>' +
		'<circle cx="290" cy="126" r="16" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="370" cy="126" r="16" stroke="var(--edge)" stroke-width="1.6"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="330" y="63">4</text><text x="290" y="131">5</text><text x="370" y="131">6</text>' +
		'</g>' +
		'<text x="330" y="30" text-anchor="middle" class="lbl">min-heap of the k largest</text>' +
		// answer callout
		'<path d="M 352 46 C 400 32 430 40 452 62" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowKLEok)"/>' +
		'<text x="452" y="84" text-anchor="middle" style="fill:var(--ok)">root = 4</text>' +
		'<text x="452" y="102" text-anchor="middle" class="lbl">3rd largest</text>' +
		'<text x="20" y="172" class="lbl">the root is the smallest of the k largest — exactly the kth largest of the whole array</text>' +
		'<defs>' +
		'<marker id="dgArrowKLE" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowKLEok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'kth-largest-element',
		title: 'Kth Largest Element in an Array',
		nav: 'Kth Largest',
		difficulty: 'Medium',
		category: 'Heap / Priority Queue',
		task: 'Implement findKthLargest — make all 5 tests pass.',

		prose: [
			'<h2>Kth Largest Element in an Array</h2>' +
			'<p>Given an integer slice <code>nums</code> and an integer <code>k</code>, ' +
			'return the <em>k-th largest</em> element. Note this is the k-th largest in ' +
			'<em>sorted order</em>, not the k-th distinct value — duplicates count ' +
			'separately.</p>' +
			'<ul><li><code>1 ≤ k ≤ len(nums)</code>; values may be negative.</li>' +
			'<li>Can you do better than sorting the whole slice? Use ' +
			'<code>container/heap</code>: the <code>intHeap</code> scaffolding in the ' +
			'starter is a <em>min</em>-heap this time — keep its size capped at ' +
			'<code>k</code>.</li>' +
			'<li>Remember <code>heap.Pop(&amp;h)</code> returns <code>any</code>; assert ' +
			'with <code>.(int)</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'findKthLargest([]int{3, 2, 1, 5, 6, 4}, 2)           →  5\nfindKthLargest([]int{3, 2, 3, 1, 2, 4, 5, 5, 6}, 4)  →  4   // duplicates count', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>You do not need the full sorted order — only the boundary between “the k ' +
			'largest” and everything else. A <strong>min-heap capped at k values</strong> ' +
			'maintains exactly that boundary: its root is the <em>smallest of the k ' +
			'largest so far</em>, so any newcomer that beats the root bumps it out, and ' +
			'anything that can’t was never a candidate:</p>' +
			DIAGRAM +
			'<p>When every element has filed past the gate, the root is the answer.</p>',
		],

		starter: [
			'package main',
			'',
			'// intHeap is a MIN-heap of ints for use with container/heap.',
			'//',
			'// heap.Interface = sort.Interface (Len/Less/Swap) + Push/Pop.',
			'// Unlike Last Stone Weight (which reversed Less for a max-heap),',
			'// this problem wants the natural min-heap: the root h[0] is the',
			'// SMALLEST element, which is exactly the gatekeeper a "keep the k',
			'// largest" strategy needs. Push/Pop work on the slice TAIL and',
			'// need pointer receivers because they change the slice header.',
			'type intHeap []int',
			'',
			'func (h intHeap) Len() int           { return len(h) }',
			'func (h intHeap) Less(i, j int) bool { return h[i] < h[j] } // natural order: min-heap',
			'func (h intHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }',
			'',
			'// Push appends x at the tail; heap.Push sifts it into place after.',
			'func (h *intHeap) Push(x any) { *h = append(*h, x.(int)) }',
			'',
			'// Pop removes and returns the TAIL element; heap.Pop has already',
			'// swapped the root there and will hand this value back to you.',
			'func (h *intHeap) Pop() any {',
			'	old := *h',
			'	n := len(old)',
			'	x := old[n-1]',
			'	*h = old[:n-1]',
			'	return x',
			'}',
			'',
			'// findKthLargest returns the kth largest element of nums (kth in',
			'// sorted order, duplicates count). 1 <= k <= len(nums); values may',
			'// be negative. Keep intHeap capped at k elements via container/heap.',
			'func findKthLargest(nums []int, k int) int {',
			'	// your code here',
			'	return -1 << 31 // sentinel: no test expects this value',
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
			'		nums []int',
			'		k    int',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{[]int{3, 2, 1, 5, 6, 4}, 2, 5},',
			'		{[]int{3, 2, 3, 1, 2, 4, 5, 5, 6}, 4, 4}, // duplicates count separately',
			'		{[]int{7, 6, 5, 4, 3, 2, 1}, 7, 1},       // k = len(nums): the minimum',
			'		{[]int{-1, -2, -3}, 2, -2},               // negatives',
			'		{[]int{2, 1}, 1, 2},                      // k = 1: the maximum',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v, k=%d", c.nums, c.k),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := findKthLargest(append([]int(nil), c.nums...), c.k)',
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
			'import "container/heap"',
			'',
			'// intHeap is a MIN-heap of ints for use with container/heap.',
			'//',
			'// Natural Less (<) this time: the heap package surfaces the least',
			'// element, and "least of the k largest" is precisely the value we',
			'// want instant access to. Your methods provide primitive slice',
			'// access; heap.Push/heap.Pop/heap.Fix own the O(log k) sifting.',
			'type intHeap []int',
			'',
			'func (h intHeap) Len() int           { return len(h) }',
			'func (h intHeap) Less(i, j int) bool { return h[i] < h[j] } // min-heap',
			'func (h intHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }',
			'',
			'// Push/Pop are tail plumbing for the heap package — call heap.Push',
			'// and heap.Pop, never these directly. Pointer receivers because',
			'// append and reslicing replace the slice header.',
			'func (h *intHeap) Push(x any) { *h = append(*h, x.(int)) }',
			'',
			'func (h *intHeap) Pop() any {',
			'	old := *h',
			'	n := len(old)',
			'	x := old[n-1]',
			'	*h = old[:n-1]',
			'	return x',
			'}',
			'',
			'// findKthLargest keeps a min-heap of the k largest values seen.',
			'//',
			'// Invariant: after processing any prefix of nums, the heap holds',
			'// the k largest values of that prefix, so its root h[0] is the',
			'// kth largest so far. Maintaining it is one comparison per',
			'// element:',
			'//   - heap not yet full → push (log k)',
			'//   - n > root          → n belongs in the top k; the root (the',
			'//     smallest of the current top k) is the one it displaces',
			'//   - n <= root         → n can’t be in the top k; skip in O(1)',
			'//',
			'// Why not sort? Sorting computes the FULL order for O(n log n);',
			'// we only need the top-k boundary, and the heap never grows past',
			'// k, so the whole scan is O(n log k) time and O(k) space — a real',
			'// win when k << n, and the only viable shape when nums is a',
			'// stream too large to hold in memory.',
			'func findKthLargest(nums []int, k int) int {',
			'	h := make(intHeap, 0, k)',
			'	for _, n := range nums {',
			'		if len(h) < k {',
			'			heap.Push(&h, n) // still filling to capacity',
			'		} else if n > h[0] {',
			'			// Evict the gatekeeper. Overwriting the root and calling',
			'			// heap.Fix is one sift-down (log k) — cheaper than the',
			'			// pop-then-push pair, which sifts twice.',
			'			h[0] = n',
			'			heap.Fix(&h, 0)',
			'		}',
			'	}',
			'	// k <= len(nums) guarantees the heap filled up: h[0] is the',
			'	// smallest of the k largest, i.e. the kth largest overall.',
			'	return h[0]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p><code>sort.Ints(nums)</code> and return <code>nums[len(nums)-k]</code> — ' +
			'five seconds to write, O(n log n) time, and it computes far more than the ' +
			'question asks: the entire sorted order, when all we need is one boundary ' +
			'value. That over-computation is the optimization target.</p>' +
			'<h3>The size-k min-heap</h3>' +
			'<p>Keep a min-heap holding <em>only the k largest values seen so far</em>. ' +
			'The counter-intuitive part is the polarity: to track the k <em>largest</em>, ' +
			'you want a <em>min</em>-heap, because the element you compare against — and ' +
			'evict — is always the <em>weakest member of the elite</em>, and a min-heap ' +
			'keeps exactly that element at the root, h[0]:</p>',
			{ code: 'h := make(intHeap, 0, k)\nfor _, n := range nums {\n\tif len(h) < k {\n\t\theap.Push(&h, n)\n\t} else if n > h[0] {\n\t\th[0] = n        // replace the weakest of the top k\n\t\theap.Fix(&h, 0) // one sift-down restores heap order\n\t}\n}\nreturn h[0] // smallest of the k largest = kth largest' },
			'<p>Details worth internalizing:</p>' +
			'<ul>' +
			'<li><strong>Why O(n log k) beats O(n log n).</strong> The heap never exceeds ' +
			'k elements, so each push/fix costs log k, not log n — for k=10 over a ' +
			'million elements that is the difference between ~3 and ~20 comparisons per ' +
			'step, plus only O(k) memory. And elements ≤ root are rejected in O(1) ' +
			'without touching the heap at all.</li>' +
			'<li><strong><code>heap.Fix</code> over pop-then-push.</strong> ' +
			'<code>heap.Pop</code> + <code>heap.Push</code> is correct but sifts twice; ' +
			'overwriting the root and calling <code>heap.Fix(&amp;h, 0)</code> does one ' +
			'sift-down. Same asymptotics, half the constant.</li>' +
			'<li><strong>Duplicates need no special handling.</strong> “4th largest” ' +
			'counts positions in sorted order, and the heap stores values with ' +
			'repetition — <code>[3,2,3,1,2,4,5,5,6]</code>, k=4 keeps {4,5,5,6} and ' +
			'correctly answers 4.</li>' +
			'<li><strong>k = len(nums) still works:</strong> every element enters the ' +
			'heap, nothing is evicted, and the root is the minimum — which is indeed the ' +
			'len(nums)-th largest.</li>' +
			'</ul>' +
			'<p>The other classic answer is quickselect — average O(n), worst O(n²), ' +
			'in-place and partition-based. The heap version is the one that generalizes: ' +
			'it works on streams you cannot re-read, and it is the same pattern as ' +
			'Top-K-Frequent earlier in the track.</p>',
		],
		complexity: { time: 'O(n log k)', space: 'O(k)' },
	});
})();
