/* Merge Two Sorted Lists — Linked List (Easy). The classic dummy-head
 * pattern: a throwaway node in front of the result means "append to
 * tail" is the only operation the loop ever needs.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="merging two sorted linked lists">' +
		// l1 row
		'<text x="30" y="45" class="lbl">l1</text>' +
		'<rect x="70" y="25" width="44" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="130" y="25" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="190" y="25" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="92" y="45" text-anchor="middle">1</text>' +
		'<text x="152" y="45" text-anchor="middle">2</text>' +
		'<text x="212" y="45" text-anchor="middle">4</text>' +
		'<path d="M 116 40 L 128 40" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowMTL)"/>' +
		'<path d="M 176 40 L 188 40" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowMTL)"/>' +
		// l2 row
		'<text x="30" y="95" class="lbl">l2</text>' +
		'<rect x="70" y="75" width="44" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<rect x="130" y="75" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="190" y="75" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="92" y="95" text-anchor="middle">1</text>' +
		'<text x="152" y="95" text-anchor="middle">3</text>' +
		'<text x="212" y="95" text-anchor="middle">4</text>' +
		'<path d="M 116 90 L 128 90" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowMTL)"/>' +
		'<path d="M 176 90 L 188 90" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowMTL)"/>' +
		// pick arrows: the two heads are compared, smaller goes first
		'<path d="M 92 57 C 80 110 80 130 88 146" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowMTLo)"/>' +
		'<path d="M 100 107 C 120 125 135 135 142 146" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowMTLa)"/>' +
		'<text x="280" y="125" class="lbl">tail takes the smaller head each step</text>' +
		// merged row
		'<text x="20" y="170" class="lbl">out</text>' +
		'<rect x="70" y="150" width="44" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="124" y="150" width="44" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<rect x="178" y="150" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="232" y="150" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="286" y="150" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="340" y="150" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="92" y="170" text-anchor="middle">1</text>' +
		'<text x="146" y="170" text-anchor="middle">1</text>' +
		'<text x="200" y="170" text-anchor="middle">2</text>' +
		'<text x="254" y="170" text-anchor="middle">3</text>' +
		'<text x="308" y="170" text-anchor="middle">4</text>' +
		'<text x="362" y="170" text-anchor="middle">4</text>' +
		'<defs>' +
		'<marker id="dgArrowMTL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowMTLo" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowMTLa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'merge-two-sorted-lists',
		title: 'Merge Two Sorted Lists',
		nav: 'Merge Two Sorted Lists',
		difficulty: 'Easy',
		category: 'Linked List',
		task: 'Implement mergeTwoLists — make all 4 tests pass.',

		prose: [
			'<h2>Merge Two Sorted Lists</h2>' +
			'<p>Given the heads of two sorted linked lists <code>l1</code> and ' +
			'<code>l2</code>, merge them into one sorted list by <em>splicing the ' +
			'existing nodes together</em>, and return its head.</p>' +
			'<ul><li>Both inputs are sorted ascending; either may be empty.</li>' +
			'<li>Reuse the given nodes — don’t allocate new ones for the result.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'mergeTwoLists(1 → 2 → 4, 1 → 3 → 4)  →  1 → 1 → 2 → 3 → 4 → 4\nmergeTwoLists(nil, 0)                →  0', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Both lists are already sorted, so the next node of the answer is always ' +
			'one of the two current heads — whichever is smaller. Keep a <code>tail</code> ' +
			'pointer on the merged list and append the winner, over and over:</p>' +
			DIAGRAM +
			'<p>A throwaway <em>dummy head</em> in front of the result makes “append to ' +
			'tail” the only operation you ever need — no special case for the first node.</p>',
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
			'// mergeTwoLists merges two sorted lists into one sorted list by',
			'// splicing their nodes together, and returns the merged head.',
			'func mergeTwoLists(l1 *ListNode, l2 *ListNode) *ListNode {',
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
			'		l1   []int',
			'		l2   []int',
			'		want []int',
			'	}',
			'	cases := []tc{',
			'		{[]int{1, 2, 4}, []int{1, 3, 4}, []int{1, 1, 2, 3, 4, 4}},',
			'		{[]int{}, []int{}, []int{}},',
			'		{[]int{}, []int{0}, []int{0}},',
			'		{[]int{5}, []int{1, 2, 3}, []int{1, 2, 3, 5}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("l1=%v, l2=%v", c.l1, c.l2),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Each case gets freshly built nodes, so the solution is',
			'			// free to rewire them — splicing is the whole point here.',
			'			got := listToSlice(mergeTwoLists(sliceToList(c.l1), sliceToList(c.l2)))',
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
			'// ListNode is a node in a singly linked list.',
			'type ListNode struct {',
			'	Val  int',
			'	Next *ListNode',
			'}',
			'',
			'// mergeTwoLists splices two sorted lists into one sorted list,',
			'// reusing the existing nodes.',
			'//',
			'// The dummy head is the trick worth remembering: without it, "which',
			'// list supplies the first node?" needs its own branch and empty',
			'// inputs need more. With it, every node — including the first — is',
			'// appended the same way, and dummy.Next is the answer at the end.',
			'// The dummy lives on the stack; nothing is allocated per node.',
			'func mergeTwoLists(l1 *ListNode, l2 *ListNode) *ListNode {',
			'	dummy := &ListNode{}',
			'	tail := dummy',
			'	for l1 != nil && l2 != nil {',
			'		// <= keeps the merge stable: on ties l1’s node goes first.',
			'		if l1.Val <= l2.Val {',
			'			tail.Next = l1',
			'			l1 = l1.Next',
			'		} else {',
			'			tail.Next = l2',
			'			l2 = l2.Next',
			'		}',
			'		tail = tail.Next',
			'	}',
			'	// One list ran out. The survivor is already sorted and already',
			'	// linked, so splice the whole remainder in one assignment',
			'	// instead of walking it node by node.',
			'	if l1 != nil {',
			'		tail.Next = l1',
			'	} else {',
			'		tail.Next = l2',
			'	}',
			'	return dummy.Next',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Dump both lists into a slice, <code>sort.Ints</code> it, rebuild a list — ' +
			'O((n+m) log (n+m)) time plus a full copy of every node. It throws away the ' +
			'one thing we were given for free: <em>both inputs are already sorted</em>.</p>' +
			'<h3>Walk both heads, take the smaller</h3>' +
			'<p>Because the inputs are sorted, the smallest remaining value is always ' +
			'sitting at one of the two heads. So keep a <code>tail</code> pointer on the ' +
			'merged list and repeatedly splice in the winner:</p>',
			{ code: 'dummy := &ListNode{}\ntail := dummy\nfor l1 != nil && l2 != nil {\n\tif l1.Val <= l2.Val {\n\t\ttail.Next = l1\n\t\tl1 = l1.Next\n\t} else {\n\t\ttail.Next = l2\n\t\tl2 = l2.Next\n\t}\n\ttail = tail.Next\n}\nif l1 != nil {\n\ttail.Next = l1 // splice the whole remainder at once\n} else {\n\ttail.Next = l2\n}\nreturn dummy.Next' },
			'<p>What makes this version clean:</p>' +
			'<ul>' +
			'<li><strong>The dummy head removes every edge case.</strong> No “is the result ' +
			'still empty?” branch, and empty inputs fall straight through to the splice — ' +
			'<code>dummy.Next</code> is simply nil.</li>' +
			'<li><strong>Splice the leftover list wholesale.</strong> When one list runs out, ' +
			'the other is already sorted and linked — one assignment, not a loop.</li>' +
			'<li><strong><code>&lt;=</code> keeps the merge stable.</strong> Ties take from ' +
			'<code>l1</code> first, the same convention merge sort relies on.</li>' +
			'<li><strong>No allocation per node.</strong> The output is rewired from the ' +
			'input nodes; only the one stack-side dummy is created.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n + m)', space: 'O(1)' },
	});
})();
