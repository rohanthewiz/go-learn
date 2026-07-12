/* Merge k Sorted Lists — Linked List (Hard). The canonical k-way merge:
 * a min-heap of the k current heads always knows the globally smallest
 * remaining node, so the output is stitched together in O(N log k).
 * Tests build each list with sliceToList and compare listToSlice output.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="min-heap of the k current heads driving a k-way merge">' +
		'<text x="20" y="16" class="lbl">k = 3 sorted lists (heads highlighted)</text>' +
		// the three input lists, heads in accent
		'<g>' +
		'<rect x="20" y="30" width="34" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="66" y="30" width="34" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="112" y="30" width="34" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="37" y="48" text-anchor="middle">1</text>' +
		'<text x="83" y="48" text-anchor="middle">4</text>' +
		'<text x="129" y="48" text-anchor="middle">5</text>' +
		'<rect x="20" y="72" width="34" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="66" y="72" width="34" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="112" y="72" width="34" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="37" y="90" text-anchor="middle">1</text>' +
		'<text x="83" y="90" text-anchor="middle">3</text>' +
		'<text x="129" y="90" text-anchor="middle">4</text>' +
		'<rect x="20" y="114" width="34" height="26" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="66" y="114" width="34" height="26" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="37" y="132" text-anchor="middle">2</text>' +
		'<text x="83" y="132" text-anchor="middle">6</text>' +
		'</g>' +
		// heads flow into the heap
		'<path d="M 150 43 C 200 43 220 60 246 68" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowMKL)"/>' +
		'<path d="M 150 85 C 190 85 215 82 246 78" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowMKL)"/>' +
		'<path d="M 104 127 C 180 127 215 100 246 88" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowMKL)"/>' +
		// the min-heap of size k
		'<text x="262" y="30" class="lbl">min-heap (size ≤ k)</text>' +
		'<g stroke="var(--edge)">' +
		'<line x1="300" y1="66" x2="275" y2="106"/><line x1="300" y1="66" x2="325" y2="106"/>' +
		'</g>' +
		'<g fill="var(--panel)">' +
		'<circle cx="300" cy="60" r="14" stroke="var(--ok)" stroke-width="2"/>' +
		'<circle cx="275" cy="112" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="325" cy="112" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="300" y="65">1</text><text x="275" y="117">1</text><text x="325" y="117">2</text>' +
		'</g>' +
		'<text x="300" y="150" text-anchor="middle" class="lbl">root = smallest head overall</text>' +
		// pop → output
		'<path d="M 318 52 C 370 40 390 50 418 60" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowMKLok)"/>' +
		'<text x="378" y="34" text-anchor="middle" class="lbl">pop min, append</text>' +
		'<text x="430" y="72" style="fill:var(--ok)">out: 1 → …</text>' +
		'<text x="382" y="104" class="lbl">then push that</text>' +
		'<text x="382" y="120" class="lbl">node’s successor</text>' +
		'<text x="20" y="182" class="lbl">every node passes through a heap of only k entries — N pops × O(log k)</text>' +
		'<defs>' +
		'<marker id="dgArrowMKL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowMKLok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'merge-k-sorted-lists',
		title: 'Merge k Sorted Lists',
		nav: 'Merge k Sorted Lists',
		difficulty: 'Hard',
		category: 'Linked List',
		task: 'Implement mergeKLists — make all 6 tests pass.',

		prose: [
			'<h2>Merge k Sorted Lists</h2>' +
			'<p>Given a slice of <code>k</code> linked lists, each sorted ascending, merge ' +
			'them into <em>one</em> sorted list and return its head.</p>' +
			'<ul><li>Reuse the existing nodes — rewire links, don’t copy values.</li>' +
			'<li><code>lists</code> may be empty, and any of its lists may be nil.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'mergeKLists([1→4→5, 1→3→4, 2→6])  →  1→1→2→3→4→4→5→6\nmergeKLists([])                    →  nil', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>At any moment, the next output node must be the smallest of the k ' +
			'<em>current heads</em> — nothing deeper in any list can beat its own head. ' +
			'A min-heap of at most k nodes answers “which head is smallest?” in ' +
			'O(log k) per pop, and each pop is replaced by that node’s successor:</p>' +
			DIAGRAM +
			'<p>Simpler fallback: merge the lists pairwise (list 1 + list 2, then + list 3, …) ' +
			'— correct, but the early nodes get re-walked on every later merge.</p>',
		],

		starter: [
			'package main',
			'',
			'// ListNode is a node in a singly linked list.',
			'type ListNode struct {',
			'	Val  int',
			'	Next *ListNode',
			'}',
			'',
			'// mergeKLists merges k ascending lists into one ascending list,',
			'// reusing the existing nodes, and returns the new head (nil when',
			'// there are no nodes at all).',
			'//',
			'// Two solid strategies — both are accepted by the tests:',
			'//   1. container/heap over the k current heads (declare your own',
			'//      type satisfying heap.Interface, as in Last Stone Weight),',
			'//      popping the min and pushing its successor: O(N log k).',
			'//   2. Pairwise merging — fold the lists together one at a time',
			'//      with a two-list merge: O(N·k) but very little code.',
			'func mergeKLists(lists []*ListNode) *ListNode {',
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
			')',
			'',
			LC.HARNESS_RT,
			'',
			LC.LIST_HELPERS,
			'',
			'func main() {',
			'	type tc struct {',
			'		in   [][]int',
			'		want []int',
			'	}',
			'	cases := []tc{',
			'		{[][]int{{1, 4, 5}, {1, 3, 4}, {2, 6}}, []int{1, 1, 2, 3, 4, 4, 5, 6}},',
			'		{[][]int{{}, {}}, []int{}},',
			'		{[][]int{}, []int{}},',
			'		{[][]int{{1, 2, 3}}, []int{1, 2, 3}},',
			'		{[][]int{{5}, {1}, {3}, {2}, {4}}, []int{1, 2, 3, 4, 5}},',
			'		{[][]int{{-10, -5, 0}, {-7, 3}, {-6, -6}}, []int{-10, -7, -6, -6, -5, 0, 3}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.in),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Fresh nodes per case: the solution rewires Next pointers,',
			'			// so lists are rebuilt from the case data every run.',
			'			lists := make([]*ListNode, len(c.in))',
			'			for i, s := range c.in {',
			'				lists[i] = sliceToList(append([]int(nil), s...))',
			'			}',
			'			got := listToSlice(mergeKLists(lists))',
			'			r["pass"] = reflect.DeepEqual(got, c.want)',
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
			'// ListNode is a node in a singly linked list.',
			'type ListNode struct {',
			'	Val  int',
			'	Next *ListNode',
			'}',
			'',
			'// nodeHeap is a MIN-heap of list nodes ordered by Val, for use with',
			'// container/heap. Same scaffolding shape as an int heap — the only',
			'// difference is that the elements are node pointers, so popping the',
			'// root hands back the node itself, ready to be linked into the',
			'// output without any copying.',
			'type nodeHeap []*ListNode',
			'',
			'func (h nodeHeap) Len() int           { return len(h) }',
			'func (h nodeHeap) Less(i, j int) bool { return h[i].Val < h[j].Val } // min-heap: smallest Val at root',
			'func (h nodeHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }',
			'',
			'// Push/Pop are the tail plumbing container/heap calls back into;',
			'// pointer receivers because both replace the slice header.',
			'func (h *nodeHeap) Push(x any) { *h = append(*h, x.(*ListNode)) }',
			'',
			'func (h *nodeHeap) Pop() any {',
			'	old := *h',
			'	n := len(old)',
			'	x := old[n-1]',
			'	old[n-1] = nil // drop the reference so the popped node isn’t pinned by the backing array',
			'	*h = old[:n-1]',
			'	return x',
			'}',
			'',
			'// mergeKLists merges k ascending lists into one, reusing the nodes.',
			'//',
			'// Invariant: the heap holds exactly one node per non-exhausted list',
			'// — that list’s current head. The next output node must be the',
			'// minimum of those heads (anything deeper in a list is ≥ its own',
			'// head, by sortedness), so popping the heap root is always correct.',
			'// After a pop, the popped list’s successor takes its seat in the',
			'// heap. The heap therefore never exceeds k entries, which is what',
			'// makes this O(N log k) rather than O(N log N).',
			'func mergeKLists(lists []*ListNode) *ListNode {',
			'	// Seed with the k heads, skipping nil (empty) lists so the heap',
			'	// never has to reason about missing entries.',
			'	h := nodeHeap{}',
			'	for _, head := range lists {',
			'		if head != nil {',
			'			h = append(h, head)',
			'		}',
			'	}',
			'	heap.Init(&h) // heapify in O(k), cheaper than k pushes',
			'',
			'	// Dummy head avoids special-casing the first append; tail always',
			'	// points at the last node stitched into the output.',
			'	dummy := &ListNode{}',
			'	tail := dummy',
			'	for h.Len() > 0 {',
			'		n := heap.Pop(&h).(*ListNode) // globally smallest remaining node',
			'		tail.Next = n',
			'		tail = n',
			'		if n.Next != nil {',
			'			heap.Push(&h, n.Next) // its list’s new head replaces it',
			'		}',
			'	}',
			'	// No trailing fix-up needed: the last node popped is the global',
			'	// maximum, so its Next was already nil (a non-nil Next would have',
			'	// been pushed and popped after it — a contradiction).',
			'	return dummy.Next',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Three ways in, one clear winner</h3>' +
			'<p><strong>Concatenate and sort:</strong> collect every value, sort, rebuild — ' +
			'O(N log N) and it throws away the one thing you were given for free: each ' +
			'list is <em>already sorted</em>.</p>' +
			'<p><strong>Sequential pairwise merging:</strong> merge list 1 into list 2, the ' +
			'result into list 3, and so on. Each step is the classic two-list merge, but ' +
			'the early nodes get dragged through every later merge — the first list’s ' +
			'nodes are re-compared k−1 times, giving O(N·k) total.</p>' +
			'<p><strong>Divide and conquer</strong> fixes that by merging in rounds — pair ' +
			'up the lists, merge each pair, repeat on the halved collection. Each node ' +
			'participates in log k rounds: O(N log k).</p>' +
			'<h3>The heap gets the same bound with a sharper invariant</h3>' +
			'<p>Only the k <em>current heads</em> can possibly be the next output node ' +
			'(sortedness guarantees everything behind a head is no smaller). Keep exactly ' +
			'those candidates in a min-heap: pop the root, stitch it onto the output, and ' +
			'push its successor to keep the invariant alive:</p>',
			{ code: 'h := nodeHeap{}\nfor _, head := range lists {\n\tif head != nil {\n\t\th = append(h, head)\n\t}\n}\nheap.Init(&h)\n\ndummy := &ListNode{}\ntail := dummy\nfor h.Len() > 0 {\n\tn := heap.Pop(&h).(*ListNode) // smallest of the k heads\n\ttail.Next = n\n\ttail = n\n\tif n.Next != nil {\n\t\theap.Push(&h, n.Next) // successor takes its seat\n\t}\n}\nreturn dummy.Next' },
			'<p>Every one of the N nodes is pushed and popped exactly once through a heap ' +
			'that never grows past k entries — O(N log k) time, O(k) extra space. The ' +
			'dummy node kills the “is this the first node?” special case, and skipping ' +
			'nil heads up front means empty lists (or an empty outer slice) simply seed ' +
			'an empty heap and fall straight through to nil.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>K-way merge with a min-heap</strong> — reach for it whenever the ' +
			'trigger “merge k already-sorted sources” appears: the heap tracks one ' +
			'candidate per source, costs O(log k) per element, and turns k sorted streams ' +
			'into one in O(N log k) with O(k) memory. Merge Two Sorted Lists is literally ' +
			'the k=2 base case, and the same heap-scaffolding mechanics drive Last Stone ' +
			'Weight, Kth Largest Element and K Closest Points in this track. In real ' +
			'systems it is everywhere data is too big to sort in memory: external ' +
			'sorting’s merge passes stream sorted runs from disk through exactly this ' +
			'heap, and LSM-tree compaction (see the system-design track) merges sorted ' +
			'SSTable segments the same way.</p>',
		],
		complexity: { time: 'O(N log k)', space: 'O(k)' },
	});
})();
