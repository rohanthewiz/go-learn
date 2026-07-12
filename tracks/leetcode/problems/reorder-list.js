/* Reorder List — Linked List (Medium). Fold a list into L0→Ln→L1→Ln−1→…
 * in place by composing three primitives the track already built:
 * fast/slow middle-finding, in-place reversal, and an interleaving merge.
 * The harness builds each list with sliceToList, mutates it via the
 * learner's function (no return value), and compares listToSlice(head).
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="merge step of reorder list: interleave the first half with the reversed second half">' +
		'<text x="20" y="18" class="lbl">after step 1 (find middle) and step 2 (reverse back half) — step 3 zips them</text>' +
		'<text x="330" y="52" class="lbl">first half: 1 → 2 → 3</text>' +
		'<text x="330" y="140" class="lbl">back half reversed: 5 → 4</text>' +
		// first half nodes (top row)
		'<g>' +
		'<rect x="60" y="44" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="150" y="44" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="240" y="44" width="44" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="82" y="64" text-anchor="middle">1</text>' +
		'<text x="172" y="64" text-anchor="middle">2</text>' +
		'<text x="262" y="64" text-anchor="middle">3</text>' +
		'</g>' +
		// reversed second half (bottom row)
		'<g>' +
		'<rect x="105" y="114" width="44" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<rect x="195" y="114" width="44" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="127" y="134" text-anchor="middle">5</text>' +
		'<text x="217" y="134" text-anchor="middle">4</text>' +
		'</g>' +
		// zig-zag merge arrows: 1→5→2→4→3
		'<path d="M 88 76 L 116 110" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowROL)"/>' +
		'<path d="M 138 110 L 164 78" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowROL)"/>' +
		'<path d="M 178 76 L 206 110" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowROL)"/>' +
		'<path d="M 228 110 L 254 78" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowROL)"/>' +
		'<text x="330" y="96" style="fill:var(--ok)">result: 1 → 5 → 2 → 4 → 3</text>' +
		'<text x="20" y="184" class="lbl">take nodes alternately — the first half is never shorter, so it always ends the list</text>' +
		'<defs><marker id="dgArrowROL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'reorder-list',
		title: 'Reorder List',
		nav: 'Reorder List',
		difficulty: 'Medium',
		category: 'Linked List',
		task: 'Implement reorderList — make all 5 tests pass.',

		prose: [
			'<h2>Reorder List</h2>' +
			'<p>Given the head of a singly linked list ' +
			'<code>L0 → L1 → … → Ln−1 → Ln</code>, reorder it <em>in place</em> to</p>' +
			'<p style="text-align:center"><code>L0 → Ln → L1 → Ln−1 → L2 → Ln−2 → …</code></p>' +
			'<ul><li>Rewire the <code>Next</code> pointers — do not change any node’s value.</li>' +
			'<li>The function returns nothing: the caller keeps its <code>head</code> pointer ' +
			'and expects the chain behind it to be reordered.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'reorderList(1 → 2 → 3 → 4)      ⇒  1 → 4 → 2 → 3\nreorderList(1 → 2 → 3 → 4 → 5)  ⇒  1 → 5 → 2 → 4 → 3', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>The target order alternates “next from the front” with “next from the back”. ' +
			'A singly linked list can’t walk backward — but the <em>reversed second half</em> ' +
			'can. That decomposes the problem into three primitives this track has already ' +
			'built: fast/slow pointers to find the middle (Linked List Cycle), in-place ' +
			'reversal of the back half (Reverse Linked List), and an alternating splice ' +
			'(cousin of Merge Two Sorted Lists):</p>' +
			DIAGRAM +
			'<p>Three O(n) passes, no extra nodes, no value copying.</p>',
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
			'// reorderList rewires L0→L1→…→Ln into L0→Ln→L1→Ln−1→… in place.',
			'// It returns nothing — the caller’s head stays the first node and',
			'// the chain behind it must be reordered. Only Next pointers may',
			'// change; node values must not.',
			'func reorderList(head *ListNode) {',
			'	// your code here (plan: find the middle, reverse the back',
			'	// half, then interleave the two halves)',
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
			'		{[]int{1, 2, 3, 4}, []int{1, 4, 2, 3}},',
			'		{[]int{1, 2, 3, 4, 5}, []int{1, 5, 2, 4, 3}},',
			'		{[]int{1, 2}, []int{1, 2}},       // two nodes: already reordered',
			'		{[]int{1}, []int{1}},             // single node',
			'		{[]int{1, 2, 3, 4, 5, 6}, []int{1, 6, 2, 5, 3, 4}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.in),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// reorderList mutates in place and returns nothing, so keep',
			'			// our own head pointer and read the chain back through it.',
			'			// (L0 stays first by definition, so head remains valid.)',
			'			head := sliceToList(c.in)',
			'			reorderList(head)',
			'			got := listToSlice(head)',
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
			'// reorderList rewires L0→L1→…→Ln into L0→Ln→L1→Ln−1→… in place.',
			'//',
			'// Three primitives composed, each one already a track problem:',
			'//',
			'//	1 → 2 → 3 → 4 → 5',
			'//	1 → 2 → 3   |   4 → 5      find middle (fast/slow), cut',
			'//	1 → 2 → 3   |   5 → 4      reverse the back half',
			'//	1 → 5 → 2 → 4 → 3          interleave, front list first',
			'func reorderList(head *ListNode) {',
			'	if head == nil || head.Next == nil {',
			'		return // 0 or 1 node: nothing to fold',
			'	}',
			'',
			'	// -- 1. find the end of the first half (fast/slow) -----------',
			'	// fast advances two for slow’s one, so slow stops at node',
			'	// ⌈n/2⌉ — the LAST node of the front half. Probing fast.Next',
			'	// and fast.Next.Next (rather than fast and fast.Next) is what',
			'	// biases an even-length split to give the front half the',
			'	// extra node, which the merge below relies on.',
			'	slow, fast := head, head',
			'	for fast.Next != nil && fast.Next.Next != nil {',
			'		slow = slow.Next',
			'		fast = fast.Next.Next',
			'	}',
			'',
			'	// -- 2. detach and reverse the back half ---------------------',
			'	// Cutting first keeps the two chains disjoint so the standard',
			'	// three-pointer reversal (reverse-linked-list verbatim) can',
			'	// run on the back half in isolation.',
			'	back := slow.Next',
			'	slow.Next = nil',
			'	var prev *ListNode',
			'	for cur := back; cur != nil; {',
			'		next := cur.Next',
			'		cur.Next = prev',
			'		prev = cur',
			'		cur = next',
			'	}',
			'	back = prev // reversed: old tail is now first',
			'',
			'	// -- 3. interleave: front node, back node, repeat ------------',
			'	// The front half is never shorter than the back half (step 1',
			'	// guaranteed that), so looping until back runs out is safe and',
			'	// leaves the front’s final node — already nil-terminated by',
			'	// the cut — as the tail of the whole list.',
			'	front := head',
			'	for back != nil {',
			'		fNext, bNext := front.Next, back.Next // save both continuations before splicing',
			'		front.Next = back',
			'		back.Next = fNext',
			'		front = fNext',
			'		back = bNext',
			'	}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Walk the list into a <code>[]*ListNode</code>, then rewire by index with two ' +
			'cursors (<code>0, n−1, 1, n−2, …</code>). That works in O(n) time but O(n) extra ' +
			'space — and it papers over the real skill, which is doing pointer surgery ' +
			'without the random-access crutch.</p>' +
			'<h3>Compose the primitives you already built</h3>' +
			'<p>The output alternates front-of-list and back-of-list nodes. Reading a singly ' +
			'linked list backward is impossible — unless the back half is <em>reversed</em>, ' +
			'after which both sequences run forward and a zip-merge finishes the job. Every ' +
			'piece is a problem this track has already solved:</p>' +
			'<ul>' +
			'<li><strong>Find the middle</strong> — the fast/slow pointer walk from ' +
			'<em>Linked List Cycle</em>, used here as a distance tool instead of a cycle ' +
			'detector. Probing <code>fast.Next.Next</code> makes even lengths split 2+2, ' +
			'giving the front half the extra node.</li>' +
			'<li><strong>Reverse the back half</strong> — the three-pointer flip from ' +
			'<em>Reverse Linked List</em>, verbatim, on the detached half.</li>' +
			'<li><strong>Interleave</strong> — the splice discipline of ' +
			'<em>Merge Two Sorted Lists</em>, except the “comparison” is just strict ' +
			'alternation.</li>' +
			'</ul>',
			{ code: '// cut, reverse, zip — the whole algorithm in three stanzas\nback := slow.Next\nslow.Next = nil // cut: front half is now nil-terminated\nvar prev *ListNode\nfor cur := back; cur != nil; { // reverse-linked-list, verbatim\n\tnext := cur.Next\n\tcur.Next = prev\n\tprev, cur = cur, next\n}\nback = prev\nfor back != nil { // zip: front never runs out first\n\tfNext, bNext := front.Next, back.Next\n\tfront.Next, back.Next = back, fNext\n\tfront, back = fNext, bNext\n}' },
			'<p>Two details carry the correctness: the cut (<code>slow.Next = nil</code>) is ' +
			'what terminates the final list — the last front node keeps its nil and becomes ' +
			'the tail; and saving <em>both</em> continuations (<code>fNext</code>, ' +
			'<code>bNext</code>) before splicing prevents the same lost-the-rest-of-the-list ' +
			'bug the reversal loop guards against.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Fast/slow pointers + in-place reversal as composable primitives</strong> ' +
			'— hard linked-list problems are rarely new algorithms; they are pipelines of ' +
			'three reusable O(n)/O(1) moves: locate a position (fast/slow), reverse a segment ' +
			'(three-pointer flip), splice chains (save-then-rewire). The trigger is any task ' +
			'phrased as “rearrange the list in place” or “…from the back of a singly linked ' +
			'list”. Cost: a constant number of linear passes, zero allocation. The same ' +
			'primitives, in other mixes, drive <em>Reverse Linked List</em> and ' +
			'<em>Linked List Cycle</em> (the ingredients themselves), ' +
			'<em>Remove Nth Node From End</em> (two pointers at a fixed gap), and ' +
			'<em>Merge Two Sorted Lists</em> (the splice step) — and outside this track, ' +
			'palindrome-checking a list is exactly find-middle + reverse-half + compare.</p>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
