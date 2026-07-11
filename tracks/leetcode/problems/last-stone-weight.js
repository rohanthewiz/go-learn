/* Last Stone Weight — Heap / Priority Queue (Easy). The track's
 * introduction to container/heap: the simulation repeatedly needs "the
 * two heaviest stones", which is exactly what a max-heap serves in
 * O(log n) per operation. Go has no built-in priority queue — you
 * implement heap.Interface on your own slice type (Less reversed for a
 * max-heap) and the heap package does all the sifting.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// One smash, shown as heap trees: pop the two heaviest (8 and 7),
	// push back the difference 1, and the heap re-forms around 4.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="one smash round on a max-heap of stones">' +
		'<text x="20" y="16" class="lbl">max-heap of [2,7,4,1,8,1]</text>' +
		'<text x="330" y="16" class="lbl">after one smash</text>' +
		// left tree — edges first, then nodes
		'<g stroke="var(--edge)">' +
		'<line x1="110" y1="46" x2="60" y2="74"/><line x1="110" y1="46" x2="160" y2="74"/>' +
		'<line x1="60" y1="102" x2="32" y2="130"/><line x1="60" y1="102" x2="88" y2="130"/>' +
		'<line x1="160" y1="102" x2="132" y2="130"/>' +
		'</g>' +
		'<g fill="var(--panel)">' +
		'<circle cx="110" cy="32" r="14" stroke="var(--accent)" stroke-width="2"/>' +
		'<circle cx="60" cy="88" r="14" stroke="var(--accent)" stroke-width="2"/>' +
		'<circle cx="160" cy="88" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="32" cy="144" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="88" cy="144" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="132" cy="144" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="110" y="37">8</text><text x="60" y="93">7</text><text x="160" y="93">4</text>' +
		'<text x="32" y="149">1</text><text x="88" y="149">2</text><text x="132" y="149">1</text>' +
		'</g>' +
		'<text x="96" y="180" text-anchor="middle" class="lbl">root is always the max</text>' +
		// middle: the smash
		'<line x1="200" y1="88" x2="286" y2="88" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowLSTW)"/>' +
		'<text x="243" y="62" text-anchor="middle" style="fill:var(--accent)">pop 8, pop 7</text>' +
		'<text x="243" y="78" text-anchor="middle" class="lbl">smash: 8 − 7 = 1</text>' +
		'<text x="243" y="110" text-anchor="middle" class="lbl">push 1 back</text>' +
		'<text x="243" y="126" text-anchor="middle" class="lbl">(equal → push nothing)</text>' +
		// right tree — heap of {4,2,1,1,1}
		'<g stroke="var(--edge)">' +
		'<line x1="390" y1="46" x2="340" y2="74"/><line x1="390" y1="46" x2="440" y2="74"/>' +
		'<line x1="340" y1="102" x2="312" y2="130"/><line x1="340" y1="102" x2="368" y2="130"/>' +
		'</g>' +
		'<g fill="var(--panel)">' +
		'<circle cx="390" cy="32" r="14" stroke="var(--ok)" stroke-width="2"/>' +
		'<circle cx="340" cy="88" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="440" cy="88" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="312" cy="144" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="368" cy="144" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="390" y="37">4</text><text x="340" y="93">2</text><text x="440" y="93">1</text>' +
		'<text x="312" y="149">1</text><text x="368" y="149">1</text>' +
		'</g>' +
		'<text x="390" y="180" text-anchor="middle" class="lbl">repeat until ≤ 1 stone</text>' +
		'<defs><marker id="dgArrowLSTW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'last-stone-weight',
		title: 'Last Stone Weight',
		nav: 'Last Stone Weight',
		difficulty: 'Easy',
		category: 'Heap / Priority Queue',
		task: 'Implement lastStoneWeight — make all 5 tests pass.',

		prose: [
			'<h2>Last Stone Weight</h2>' +
			'<p>You have a slice of stone weights. Each turn, take the <em>two heaviest</em> ' +
			'stones (weights <code>x ≤ y</code>) and smash them together: if ' +
			'<code>x == y</code> both are destroyed; otherwise both are destroyed and a new ' +
			'stone of weight <code>y − x</code> is added. Return the weight of the last ' +
			'remaining stone, or <code>0</code> if none remain.</p>' +
			'<ul><li>Use <code>container/heap</code>: the <code>intHeap</code> scaffolding in ' +
			'the starter already satisfies <code>heap.Interface</code> as a ' +
			'<em>max</em>-heap — your job is to drive it with <code>heap.Init</code>, ' +
			'<code>heap.Pop</code> and <code>heap.Push</code>.</li>' +
			'<li>Note <code>heap.Pop(&amp;h)</code> returns <code>any</code>; assert with ' +
			'<code>.(int)</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'lastStoneWeight([]int{2, 7, 4, 1, 8, 1})  →  1\n// 8,7 → 1 · 4,2 → 2 · 2,1 → 1 · 1,1 → gone · last stone: 1\nlastStoneWeight([]int{6, 6})              →  0', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>The simulation asks one question over and over: “which two stones are ' +
			'heaviest <em>right now</em>?” — while the answer keeps changing as smash ' +
			'results flow back in. That access pattern (repeatedly extract the max from a ' +
			'changing set, occasionally insert) is the textbook job of a ' +
			'<strong>max-heap</strong>: O(log n) per pop/push instead of re-sorting:</p>' +
			DIAGRAM +
			'<p>Every smash shrinks the stone count, so the loop always terminates.</p>',
		],

		starter: [
			'package main',
			'',
			'// intHeap is a MAX-heap of ints for use with container/heap.',
			'//',
			'// heap.Interface = sort.Interface (Len/Less/Swap) + Push/Pop.',
			'// The heap package owns the algorithm (sift-up/sift-down); these',
			'// methods only give it primitive access to the slice. Less is',
			'// deliberately reversed (>) — the heap package always surfaces the',
			'// "least" element, so inverting "less" turns its min-heap into a',
			'// max-heap. Push/Pop work on the slice TAIL and need pointer',
			'// receivers because they change the slice header (len/cap).',
			'type intHeap []int',
			'',
			'func (h intHeap) Len() int           { return len(h) }',
			'func (h intHeap) Less(i, j int) bool { return h[i] > h[j] } // reversed: max-heap',
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
			'// lastStoneWeight simulates smashing the two heaviest stones until',
			'// at most one remains, and returns its weight (0 if none remain).',
			'// Drive intHeap with heap.Init / heap.Pop / heap.Push.',
			'func lastStoneWeight(stones []int) int {',
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
			'		stones []int',
			'		want   int',
			'	}',
			'	cases := []tc{',
			'		{[]int{2, 7, 4, 1, 8, 1}, 1},',
			'		{[]int{3, 7, 2}, 2},',
			'		{[]int{5, 5, 3, 3}, 0},',
			'		{[]int{9}, 9},',
			'		{[]int{6, 6}, 0},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("stones=%v", c.stones),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := lastStoneWeight(append([]int(nil), c.stones...))',
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
			'// intHeap is a MAX-heap of ints for use with container/heap.',
			'//',
			'// Go has no built-in priority queue; instead, container/heap is an',
			'// ALGORITHM that runs on any type satisfying heap.Interface:',
			'//',
			'//   heap.Interface = sort.Interface (Len/Less/Swap) + Push/Pop',
			'//',
			'// The contract splits the work cleanly. Your methods provide dumb',
			'// primitive access to the backing slice; heap.Init/heap.Push/',
			'// heap.Pop own the actual heap algorithm (the O(log n) sift-up and',
			'// sift-down that maintain the heap-order invariant).',
			'type intHeap []int',
			'',
			'// Len/Less/Swap are plain sort.Interface. Less uses > instead of <:',
			'// the heap package always bubbles the “least” element to the root,',
			'// so lying about what “less” means flips its min-heap into the',
			'// max-heap this problem needs. One character, whole new data',
			'// structure. Value receivers suffice — these read and swap in',
			'// place without changing the slice header.',
			'func (h intHeap) Len() int           { return len(h) }',
			'func (h intHeap) Less(i, j int) bool { return h[i] > h[j] } // reversed → max-heap',
			'func (h intHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }',
			'',
			'// Push and Pop are NOT the operations you call — heap.Push and',
			'// heap.Pop are. These two only touch the slice TAIL:',
			'//   heap.Push(h, x): calls h.Push(x) to append, then sifts x up.',
			'//   heap.Pop(h):     swaps root and tail, sifts the new root down,',
			'//                    then calls h.Pop() to detach the old root',
			'//                    (now sitting at the tail) and return it.',
			'// Pointer receivers are required: append and reslicing replace the',
			'// slice header, and that change must survive the call.',
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
			'// lastStoneWeight simulates the smashing game and returns the final',
			'// stone’s weight (0 if the last two annihilate).',
			'//',
			'// A max-heap fits because each round needs the two current maxima',
			'// of a set that keeps changing: two O(log n) pops, and possibly one',
			'// O(log n) push of the difference. Re-sorting every round would pay',
			'// O(n log n) per smash for the same information.',
			'func lastStoneWeight(stones []int) int {',
			'	// Copy defensively, then heapify. heap.Init reorders the slice',
			'	// into heap order in O(n) — cheaper than n successive pushes.',
			'	h := intHeap(append([]int(nil), stones...))',
			'	heap.Init(&h)',
			'',
			'	for len(h) > 1 {',
			'		y := heap.Pop(&h).(int) // heaviest',
			'		x := heap.Pop(&h).(int) // second heaviest; x <= y by heap order',
			'		if y > x {',
			'			heap.Push(&h, y-x) // partial smash: remainder rejoins the pool',
			'		}',
			'		// x == y: both stones vanish, nothing to push.',
			'	}',
			'',
			'	if len(h) == 0 {',
			'		return 0 // everything annihilated',
			'	}',
			'	return h[0] // root of a 1-element heap: the survivor',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Sort descending, smash the top two, insert the remainder, re-sort, repeat. ' +
			'Each round costs O(n log n) for a sort that recomputes an ordering you ' +
			'already mostly knew — one new element landed in an otherwise-sorted pool. ' +
			'(A linear scan for the two maxima each round is O(n²) total; same story.) ' +
			'The pattern to recognize: <em>repeatedly extract the max of a changing ' +
			'set</em>. That sentence is the definition of a priority queue, and the ' +
			'standard implementation is a heap: O(log n) per pop and push.</p>' +
			'<h3>Go’s take: container/heap is an algorithm, not a container</h3>' +
			'<p>Unlike languages with a built-in <code>PriorityQueue</code>, Go ships the ' +
			'heap <em>algorithm</em> and asks you for the storage. You implement ' +
			'<code>heap.Interface</code> on your own slice type — ' +
			'<code>sort.Interface</code> (<code>Len/Less/Swap</code>) plus ' +
			'<code>Push/Pop</code> that grow and shrink the slice at its <em>tail</em>. ' +
			'The package functions do all the clever parts (sifting elements up and down ' +
			'to restore heap order); your methods never reason about parents or children:</p>',
			{ code: 'type intHeap []int\n\nfunc (h intHeap) Len() int           { return len(h) }\nfunc (h intHeap) Less(i, j int) bool { return h[i] > h[j] } // > not <: max-heap\nfunc (h intHeap) Swap(i, j int)      { h[i], h[j] = h[j], h[i] }\n\n// tail-only plumbing; heap.Push/heap.Pop do the sifting around these\nfunc (h *intHeap) Push(x any) { *h = append(*h, x.(int)) }\nfunc (h *intHeap) Pop() any {\n\told := *h\n\tn := len(old)\n\tx := old[n-1]\n\t*h = old[:n-1]\n\treturn x\n}' },
			'<p>With the plumbing in place, the game itself is four lines per round:</p>',
			{ code: 'h := intHeap(append([]int(nil), stones...))\nheap.Init(&h) // heapify in O(n)\nfor len(h) > 1 {\n\ty := heap.Pop(&h).(int) // max\n\tx := heap.Pop(&h).(int) // 2nd max\n\tif y > x {\n\t\theap.Push(&h, y-x)\n\t}\n}' },
			'<p>The contract details that bite newcomers:</p>' +
			'<ul>' +
			'<li><strong>Reversed <code>Less</code> = max-heap.</strong> The heap package ' +
			'only ever builds min-heaps — of whatever <em>you</em> define “less” to mean. ' +
			'<code>h[i] &gt; h[j]</code> makes “heavier” sort as “smaller”, so the heaviest ' +
			'stone surfaces at the root.</li>' +
			'<li><strong>Call <code>heap.Push</code>/<code>heap.Pop</code>, never your own ' +
			'methods.</strong> Your <code>Push</code>/<code>Pop</code> are tail plumbing ' +
			'the algorithm calls back into; invoking them directly skips the sifting and ' +
			'silently corrupts heap order.</li>' +
			'<li><strong>Pointer receivers on Push/Pop, and <code>&amp;h</code> at call ' +
			'sites.</strong> Both mutate the slice header (length changes); a value ' +
			'receiver would mutate a copy and the heap would never shrink.</li>' +
			'<li><strong><code>heap.Init</code> is O(n)</strong> — heapifying an existing ' +
			'slice beats n individual O(log n) pushes.</li>' +
			'<li><strong>Loop shape gives the edge cases for free:</strong> a single stone ' +
			'never enters the loop and is returned as-is; a final equal pair empties the ' +
			'heap and falls through to 0.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n log n)', space: 'O(n)' },
	});
})();
