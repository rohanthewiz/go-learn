/* Reverse Linked List — Linked List (Easy). The canonical pointer-flip
 * exercise: walk the chain once, turning every Next arrow around with
 * three pointers (prev / cur / next) and no extra memory.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 170" width="500" height="170" role="img" aria-label="iterative pointer flip on a linked list">' +
		'<text x="20" y="18" class="lbl">mid-iteration: node 1 already points backward</text>' +
		// nodes
		'<g>' +
		'<rect x="80" y="60" width="56" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="200" y="60" width="56" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="320" y="60" width="56" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="108" y="82" text-anchor="middle">1</text>' +
		'<text x="228" y="82" text-anchor="middle">2</text>' +
		'<text x="348" y="82" text-anchor="middle">3</text>' +
		'</g>' +
		// flipped arrow: node 1 now points back at nil (done last step)
		'<path d="M 78 77 L 52 77" fill="none" stroke="var(--accent)" stroke-width="1.8" marker-end="url(#dgArrowRLLa)"/>' +
		'<text x="30" y="82" text-anchor="middle" class="lbl">nil</text>' +
		'<text x="64" y="52" text-anchor="middle" class="lbl">flipped ✓</text>' +
		// original arrows still in place further right
		'<path d="M 258 77 L 316 77" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowRLL)"/>' +
		'<path d="M 378 77 L 406 77" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowRLL)"/>' +
		'<text x="418" y="82" text-anchor="middle" class="lbl">nil</text>' +
		// the three pointers
		'<text x="108" y="118" text-anchor="middle" style="fill:var(--ok)">prev</text>' +
		'<text x="228" y="118" text-anchor="middle" style="fill:var(--accent)">cur</text>' +
		'<text x="348" y="118" text-anchor="middle" class="lbl">next</text>' +
		'<text x="20" y="152" class="lbl">next is saved first, then cur.Next = prev — one arrow flipped per step</text>' +
		'<defs>' +
		'<marker id="dgArrowRLL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowRLLa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'reverse-linked-list',
		title: 'Reverse Linked List',
		nav: 'Reverse Linked List',
		difficulty: 'Easy',
		category: 'Linked List',
		task: 'Implement reverseList — make all 4 tests pass.',

		prose: [
			'<h2>Reverse Linked List</h2>' +
			'<p>Given the <code>head</code> of a singly linked list, reverse the list ' +
			'and return the <em>new head</em>.</p>' +
			'<ul><li>Reverse the <em>links</em>, not the values — reuse the existing nodes.</li>' +
			'<li>An empty list reverses to an empty list.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'reverseList(1 → 2 → 3 → 4 → 5)  →  5 → 4 → 3 → 2 → 1\nreverseList(1 → 2)              →  2 → 1', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Walk the list once, turning each <code>Next</code> arrow around as you go. ' +
			'Three pointers carry all the state: <code>prev</code> (the already-reversed ' +
			'part), <code>cur</code> (the node being flipped), and a saved <code>next</code> ' +
			'so the rest of the list isn’t lost when <code>cur.Next</code> is overwritten:</p>' +
			DIAGRAM +
			'<p>One pass, zero extra nodes — the list reverses in place.</p>',
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
			'// reverseList reverses the list in place and returns the new head.',
			'// An empty list (nil head) reverses to nil.',
			'func reverseList(head *ListNode) *ListNode {',
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
			'		in   []int',
			'		want []int',
			'	}',
			'	cases := []tc{',
			'		{[]int{1, 2, 3, 4, 5}, []int{5, 4, 3, 2, 1}},',
			'		{[]int{1, 2}, []int{2, 1}},',
			'		{[]int{1}, []int{1}},',
			'		{[]int{}, []int{}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.in),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// sliceToList builds fresh nodes, so the solution may',
			'			// rewire links freely without touching the case data.',
			'			got := listToSlice(reverseList(sliceToList(c.in)))',
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
			'// reverseList reverses the list in place and returns the new head.',
			'//',
			'// Iterative pointer flip: one pass, redirecting each node’s Next',
			'// from “the node after me” to “the node before me”. Three pointers',
			'// are the entire state — prev (reversed prefix), cur (node being',
			'// flipped), and a saved next, because overwriting cur.Next is the',
			'// one move that would otherwise lose the rest of the list.',
			'func reverseList(head *ListNode) *ListNode {',
			'	var prev *ListNode // nil is exactly right: the old head must end up pointing at nothing',
			'	cur := head',
			'	for cur != nil {',
			'		next := cur.Next // save before the flip severs the link',
			'		cur.Next = prev',
			'		prev = cur',
			'		cur = next',
			'	}',
			'	// Loop exits with cur == nil; prev sits on the last real node,',
			'	// which is the new head. Empty input never enters the loop and',
			'	// returns nil, as it should.',
			'	return prev',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Copy the values into a slice, reverse the slice, rebuild a list — works, ' +
			'but allocates n new nodes and walks the data twice. Recursion is tidier ' +
			'(<code>reverse(rest)</code>, then hang <code>head</code> off the old tail) yet ' +
			'still costs O(n) space, just hidden in the call stack.</p>' +
			'<h3>Flip the arrows in place</h3>' +
			'<p>Nothing about the nodes needs to change except the direction of each ' +
			'<code>Next</code> pointer. So walk once and flip as you go:</p>',
			{ code: 'var prev *ListNode\ncur := head\nfor cur != nil {\n\tnext := cur.Next // save — the flip below severs this link\n\tcur.Next = prev  // the actual reversal, one arrow per step\n\tprev = cur\n\tcur = next\n}\nreturn prev // cur is nil; prev is the new head' },
			'<p>The details that trip people up:</p>' +
			'<ul>' +
			'<li><strong>Save <code>next</code> before the flip.</strong> ' +
			'<code>cur.Next = prev</code> destroys the only route to the rest of the list.</li>' +
			'<li><strong><code>prev</code> starts as nil on purpose.</strong> The old head ' +
			'becomes the tail, and a tail’s <code>Next</code> must be nil — no special case needed.</li>' +
			'<li><strong>Return <code>prev</code>, not <code>cur</code>.</strong> The loop ends ' +
			'when <code>cur</code> walks off the end; <code>prev</code> is the last real node.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
