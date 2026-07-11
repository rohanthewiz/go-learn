/* Remove Nth Node From End of List — Linked List (Medium). One-pass
 * two-pointer technique: keep a front and back pointer exactly n apart,
 * walk them together until front falls off the end — back is then parked
 * just before the victim. A dummy head makes "remove the first node"
 * indistinguishable from any other removal.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// Final state of the walk on 1→2→3→4→5 with n = 2: front has hit nil,
	// so back (which started n+1 ahead of front... i.e. the gap is fixed at
	// n+1 links) stands on 3, one node before the victim 4. Box left edges
	// at x = 16 + 74*i, width 50.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="two pointers a fixed gap apart removing the 2nd node from the end">' +
		'<text x="16" y="16" class="lbl">n = 2 · front just hit nil — the fixed gap parks back one node before the victim</text>' +
		// nodes: dummy, 1..5
		'<g>' +
		'<rect x="16" y="60" width="50" height="34" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'<rect x="90" y="60" width="50" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="164" y="60" width="50" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="238" y="60" width="50" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<rect x="312" y="60" width="50" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="386" y="60" width="50" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="41" y="82" text-anchor="middle" class="lbl">dummy</text>' +
		'<text x="115" y="82" text-anchor="middle">1</text>' +
		'<text x="189" y="82" text-anchor="middle">2</text>' +
		'<text x="263" y="82" text-anchor="middle">3</text>' +
		'<text x="337" y="82" text-anchor="middle">4</text>' +
		'<text x="411" y="82" text-anchor="middle">5</text>' +
		'</g>' +
		// forward links
		'<g fill="none" stroke="var(--edge)" stroke-width="1.5">' +
		'<path d="M 68 77 L 86 77" marker-end="url(#dgArrowRN)"/>' +
		'<path d="M 142 77 L 160 77" marker-end="url(#dgArrowRN)"/>' +
		'<path d="M 216 77 L 234 77" marker-end="url(#dgArrowRN)"/>' +
		'<path d="M 290 77 L 308 77" marker-end="url(#dgArrowRN)"/>' +
		'<path d="M 364 77 L 382 77" marker-end="url(#dgArrowRN)"/>' +
		'<path d="M 438 77 L 460 77" marker-end="url(#dgArrowRN)"/>' +
		'</g>' +
		'<text x="474" y="82" text-anchor="middle" class="lbl">nil</text>' +
		// pointer labels
		'<text x="263" y="118" text-anchor="middle" style="fill:var(--ok)">back</text>' +
		'<text x="474" y="118" text-anchor="middle" style="fill:var(--accent)">front</text>' +
		'<text x="337" y="118" text-anchor="middle" class="lbl">victim (2nd from end)</text>' +
		// the bypass splice
		'<path d="M 263 58 C 290 26 384 26 411 58" fill="none" stroke="var(--ok)" stroke-width="1.6" stroke-dasharray="5 3" marker-end="url(#dgArrowRNok)"/>' +
		'<text x="337" y="30" text-anchor="middle" style="fill:var(--ok)">back.Next = back.Next.Next</text>' +
		'<text x="16" y="152" class="lbl">both pointers started at dummy; front got an n-node head start, then they walked in step —</text>' +
		'<text x="16" y="170" class="lbl">the gap never changes, so “front at nil” pins back exactly n+1 nodes from the end</text>' +
		'<defs>' +
		'<marker id="dgArrowRN" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowRNok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'remove-nth-node-from-end',
		title: 'Remove Nth Node From End of List',
		nav: 'Remove Nth From End',
		difficulty: 'Medium',
		category: 'Linked List',
		task: 'Implement removeNthFromEnd — make all 4 tests pass.',

		prose: [
			'<h2>Remove Nth Node From End of List</h2>' +
			'<p>Given the <code>head</code> of a singly linked list, remove the ' +
			'<code>n</code>-th node <em>counting from the end</em> and return the head of ' +
			'the resulting list.</p>' +
			'<ul><li><code>n</code> is always valid: <code>1 ≤ n ≤ length</code> ' +
			'(<code>n = 1</code> is the tail, <code>n = length</code> is the head).</li>' +
			'<li>Do it in <em>one pass</em> — no counting the length first.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'removeNthFromEnd(1 → 2 → 3 → 4 → 5, 2)  →  1 → 2 → 3 → 5\nremoveNthFromEnd(1 → 2, 2)              →  2   // n == length removes the head', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>“n-th from the end” is awkward in a singly linked list because you can’t ' +
			'walk backward — but a <em>fixed gap</em> converts it into a front-facing walk. ' +
			'Send a <code>front</code> pointer n nodes ahead, then advance ' +
			'<code>front</code> and <code>back</code> together: when front falls off the ' +
			'end, back is standing exactly one node before the victim. Starting back at a ' +
			'<code>dummy</code> node stitched before the head means even “remove the first ' +
			'node” is just an ordinary splice:</p>' +
			DIAGRAM +
			'<p>One pass, O(1) extra space, and zero special cases.</p>',
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
			'// removeNthFromEnd removes the n-th node counting from the end',
			'// (n = 1 is the tail) and returns the head of the resulting list.',
			'// n is always valid: 1 <= n <= length of the list.',
			'func removeNthFromEnd(head *ListNode, n int) *ListNode {',
			'	// your code here',
			'	return head',
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
			'		n    int',
			'		want []int',
			'	}',
			'	cases := []tc{',
			'		{[]int{1, 2, 3, 4, 5}, 2, []int{1, 2, 3, 5}},',
			'		{[]int{1, 2}, 2, []int{2}},',
			'		{[]int{1, 2, 3}, 1, []int{1, 2}},',
			'		{[]int{1}, 1, []int{}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("list=%v, n=%d", c.in, c.n),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// sliceToList builds fresh nodes per case, so the solution',
			'			// may rewire links freely without poisoning later cases.',
			'			got := listToSlice(removeNthFromEnd(sliceToList(c.in), c.n))',
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
			'// removeNthFromEnd removes the n-th node from the end in one pass.',
			'//',
			'// Two pointers a fixed gap apart. front gets an n-node head start;',
			'// then front and back advance in lockstep, so the gap between them',
			'// never changes. The moment front steps off the end (nil), back is',
			'// pinned exactly n+1 nodes from the end — i.e. one node BEFORE the',
			'// one to delete, which is precisely where a splice has to happen',
			'// in a singly linked list (you can only unlink what you stand in',
			'// front of, never the node you are on).',
			'//',
			'// The dummy node is the other half of the trick: back starts on it,',
			'// not on head. When n equals the list length, front’s head start',
			'// consumes the whole list, the lockstep loop never runs, and back',
			'// is still on dummy — so “remove the head” is the same splice as',
			'// any other, and dummy.Next is the surviving head either way.',
			'func removeNthFromEnd(head *ListNode, n int) *ListNode {',
			'	dummy := &ListNode{Next: head}',
			'',
			'	// Head start: front ends up n links ahead of back. n is',
			'	// guaranteed valid, so this never walks past nil.',
			'	front := head',
			'	for i := 0; i < n; i++ {',
			'		front = front.Next',
			'	}',
			'',
			'	// Lockstep walk: the gap is preserved every iteration.',
			'	back := dummy',
			'	for front != nil {',
			'		front = front.Next',
			'		back = back.Next',
			'	}',
			'',
			'	// back.Next is the victim; route around it. The removed node',
			'	// becomes unreachable and is garbage-collected.',
			'	back.Next = back.Next.Next',
			'',
			'	// Never return head directly — if the head was removed, dummy.Next',
			'	// is the new head; otherwise dummy.Next is still the old head.',
			'	return dummy.Next',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Two passes: walk once to count the length L, then walk again ' +
			'<code>L − n</code> steps and splice. Correct, O(n), honestly fine in ' +
			'production — but the follow-up asks for <em>one</em> pass, and the one-pass ' +
			'answer teaches a reusable pattern. (Copying values into a slice and rebuilding ' +
			'also works and is strictly worse: O(n) extra memory to avoid thinking about ' +
			'pointers.)</p>' +
			'<h3>The fixed-gap insight</h3>' +
			'<p>The problem with “n-th from the end” is that a singly linked list only ' +
			'reveals the end when you hit it — too late. So carry the measurement with ' +
			'you: keep two pointers exactly n apart. When the front one hits nil, the back ' +
			'one <em>must</em> be n nodes from the end, no counting required. The gap is a ' +
			'ruler you drag along the list:</p>',
			{ code: 'dummy := &ListNode{Next: head}\n\nfront := head\nfor i := 0; i < n; i++ { // head start of n links\n\tfront = front.Next\n}\n\nback := dummy // one BEHIND head — see below\nfor front != nil { // lockstep: the gap never changes\n\tfront = front.Next\n\tback = back.Next\n}\n\nback.Next = back.Next.Next // splice the victim out\nreturn dummy.Next          // works even when the head was removed' },
			'<p>The subtle details:</p>' +
			'<ul>' +
			'<li><strong>Why a dummy head?</strong> Deleting in a singly linked list means ' +
			'standing on the <em>predecessor</em> — and the real head has none. With ' +
			'<code>n = length</code> (remove the head), front’s head start exhausts the ' +
			'list, the lockstep loop runs zero times, and back is still on dummy: the ' +
			'head’s freshly minted predecessor. One code path handles every position.</li>' +
			'<li><strong>Why back starts at dummy, not head.</strong> Front starts at head ' +
			'with an n-step head start; measuring from dummy makes the effective gap n+1, ' +
			'which is what lands back <em>before</em> the victim instead of on it.</li>' +
			'<li><strong>Return <code>dummy.Next</code>, never <code>head</code>.</strong> ' +
			'If the head was the victim, <code>head</code> still points at the removed ' +
			'node; <code>dummy.Next</code> is correct in both worlds. A single-node list ' +
			'returns nil this way, for free.</li>' +
			'<li><strong>Validity of n does real work.</strong> Because ' +
			'<code>1 ≤ n ≤ length</code>, the head-start loop cannot run off the list and ' +
			'<code>back.Next</code> is never nil at the splice.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
