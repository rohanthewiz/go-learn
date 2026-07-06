/* Linked List Cycle — Linked List (Easy). Floyd's tortoise and hare:
 * two pointers at different speeds detect a loop in O(1) space, where
 * the obvious answer (a set of visited nodes) costs O(n).
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 180" width="500" height="180" role="img" aria-label="linked list whose tail loops back to an earlier node">' +
		'<text x="20" y="18" class="lbl">tail links back to index 1 — a plain walk never ends</text>' +
		// nodes 3 → 2 → 0 → -4
		'<g>' +
		'<rect x="70" y="50" width="56" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="170" y="50" width="56" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="270" y="50" width="56" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="370" y="50" width="56" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="98" y="72" text-anchor="middle">3</text>' +
		'<text x="198" y="72" text-anchor="middle">2</text>' +
		'<text x="298" y="72" text-anchor="middle">0</text>' +
		'<text x="398" y="72" text-anchor="middle">−4</text>' +
		'<text x="98" y="100" text-anchor="middle" class="lbl">0</text>' +
		'<text x="198" y="100" text-anchor="middle" class="lbl">1</text>' +
		'<text x="298" y="100" text-anchor="middle" class="lbl">2</text>' +
		'<text x="398" y="100" text-anchor="middle" class="lbl">3</text>' +
		'</g>' +
		// forward links
		'<path d="M 128 67 L 166 67" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowLLC)"/>' +
		'<path d="M 228 67 L 266 67" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowLLC)"/>' +
		'<path d="M 328 67 L 366 67" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowLLC)"/>' +
		// the back-edge that makes the cycle
		'<path d="M 398 86 C 398 145 198 145 198 88" fill="none" stroke="var(--accent)" stroke-width="1.8" marker-end="url(#dgArrowLLCa)"/>' +
		'<text x="298" y="152" text-anchor="middle" class="lbl">tail.Next = node 1</text>' +
		// the two runners, shown where they collide inside the loop
		'<text x="178" y="40" text-anchor="middle" style="fill:var(--ok)">slow</text>' +
		'<text x="222" y="40" text-anchor="middle" style="fill:var(--accent)">fast</text>' +
		'<text x="330" y="30" class="lbl">the gap shrinks by 1 each step → they meet</text>' +
		'<defs>' +
		'<marker id="dgArrowLLC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowLLCa" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'linked-list-cycle',
		title: 'Linked List Cycle',
		nav: 'Linked List Cycle',
		difficulty: 'Easy',
		category: 'Linked List',
		task: 'Implement hasCycle — make all 4 tests pass.',

		prose: [
			'<h2>Linked List Cycle</h2>' +
			'<p>Given the <code>head</code> of a linked list, return <code>true</code> if ' +
			'some node’s <code>Next</code> points back to an <em>earlier</em> node — i.e. ' +
			'following the links loops forever — and <code>false</code> if the list ends.</p>' +
			'<ul><li>Values can repeat, so comparing values proves nothing — only node ' +
			'<em>identity</em> (pointer equality) does.</li>' +
			'<li>Aim for O(1) extra space.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'hasCycle(3 → 2 → 0 → −4 ↩ back to index 1)  →  true\nhasCycle(1 → 2)                             →  false', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Send two runners down the list — <code>slow</code> moving one node per ' +
			'step, <code>fast</code> moving two. If there’s no cycle, <code>fast</code> ' +
			'falls off the end. If there is one, both runners eventually orbit inside it, ' +
			'and the gap between them shrinks by exactly one node per step — so they must ' +
			'collide:</p>' +
			DIAGRAM +
			'<p>No memory of where you’ve been — just two pointers.</p>',
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
			'// hasCycle reports whether following Next from head ever revisits',
			'// a node (true) or reaches the end of the list (false).',
			'func hasCycle(head *ListNode) bool {',
			'	// your code here',
			'	return false',
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
			LC.LIST_HELPERS,
			'',
			'// makeCycle builds a list and links the tail back to index pos (-1 = no cycle).',
			'func makeCycle(vals []int, pos int) *ListNode {',
			'	head := sliceToList(vals)',
			'	if pos < 0 || head == nil {',
			'		return head',
			'	}',
			'	var target, tail *ListNode',
			'	i := 0',
			'	for n := head; n != nil; n = n.Next {',
			'		if i == pos {',
			'			target = n',
			'		}',
			'		tail = n',
			'		i++',
			'	}',
			'	tail.Next = target',
			'	return head',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		vals []int',
			'		pos  int',
			'		want bool',
			'	}',
			'	cases := []tc{',
			'		{[]int{3, 2, 0, -4}, 1, true},',
			'		{[]int{1, 2}, 0, true},',
			'		{[]int{1}, -1, false},',
			'		{[]int{}, -1, false},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("vals=%v, pos=%d", c.vals, c.pos),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := hasCycle(makeCycle(c.vals, c.pos))',
			'			r["pass"] = got == c.want',
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
			'// hasCycle reports whether the list loops back on itself.',
			'//',
			'// Floyd’s tortoise and hare: slow advances 1 node per step, fast',
			'// advances 2. Once both are inside a cycle, fast gains exactly one',
			'// node on slow each step, so the gap between them walks down to',
			'// zero — they collide rather than leapfrog past each other. With',
			'// no cycle, fast simply falls off the end.',
			'//',
			'// The map-of-visited-nodes alternative is the same O(n) time but',
			'// pays O(n) memory and a hash per step; two pointers cost nothing.',
			'func hasCycle(head *ListNode) bool {',
			'	slow, fast := head, head',
			'	// Both nil-checks guard fast’s double step; slow can never',
			'	// outrun fast, so it needs no check of its own.',
			'	for fast != nil && fast.Next != nil {',
			'		slow = slow.Next',
			'		fast = fast.Next.Next',
			'		// Pointer identity, not value equality — values may repeat.',
			'		if slow == fast {',
			'			return true',
			'		}',
			'	}',
			'	return false // fast found an end, so there is one — no cycle',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Record every node you visit in a <code>map[*ListNode]bool</code>; if a node ' +
			'comes around twice, there’s a cycle. Correct and O(n) time — but it costs O(n) ' +
			'memory plus a hash on every step, for a question whose answer is one bit.</p>' +
			'<h3>Two speeds, no memory</h3>' +
			'<p>Floyd’s tortoise and hare replaces the map with a second pointer. ' +
			'<code>fast</code> moves two nodes for <code>slow</code>’s one; the moment both ' +
			'are inside the loop, <code>fast</code> gains exactly one node per step, so ' +
			'their gap counts down to zero and they land on the same node:</p>',
			{ code: 'slow, fast := head, head\nfor fast != nil && fast.Next != nil {\n\tslow = slow.Next\n\tfast = fast.Next.Next\n\tif slow == fast { // same node, not same value\n\t\treturn true\n\t}\n}\nreturn false // fast fell off the end' },
			'<p>The subtleties:</p>' +
			'<ul>' +
			'<li><strong>Compare pointers, not values.</strong> <code>slow == fast</code> asks ' +
			'“the same node?” — duplicate values like <code>[1, 1, 1]</code> can’t fool it.</li>' +
			'<li><strong>Guard both hops.</strong> <code>fast != nil && fast.Next != nil</code> ' +
			'protects the double step; it also handles empty and single-node lists with no ' +
			'special cases.</li>' +
			'<li><strong>Why they can’t leapfrog:</strong> the gap shrinks by exactly 1 each ' +
			'step, so it passes through every size down to 0 — a step-of-2 gain could never ' +
			'skip over the meeting.</li>' +
			'<li><strong>Check after moving.</strong> Both start at <code>head</code>, so ' +
			'testing before the first step would report a cycle on every non-empty list.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
