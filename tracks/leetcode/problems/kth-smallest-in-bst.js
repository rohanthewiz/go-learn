/* Kth Smallest Element in a BST — Trees (Medium). The problem that makes
 * the BST's core payoff concrete: an in-order walk of a BST visits values
 * in ascending order, so "kth smallest" is just "the kth node the walk
 * touches". Taught with an explicit-stack iterative traversal so the walk
 * can stop the moment the answer appears instead of finishing the tree.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// The BST [3,1,4,null,2] flattened by an in-order walk into the sorted
	// stream 1,2,3,4 — the kth smallest is simply the kth element emitted.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="in-order traversal of a BST emits its values in sorted order">' +
		'<text x="20" y="16" class="lbl">BST · k = 1</text>' +
		// tree edges first, then nodes
		'<g stroke="var(--edge)">' +
		'<line x1="110" y1="46" x2="60" y2="74"/><line x1="110" y1="46" x2="160" y2="74"/>' +
		'<line x1="60" y1="102" x2="88" y2="130"/>' +
		'</g>' +
		'<g fill="var(--panel)">' +
		'<circle cx="110" cy="32" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="60" cy="88" r="14" stroke="var(--ok)" stroke-width="2"/>' +
		'<circle cx="160" cy="88" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="88" cy="144" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="110" y="37">3</text><text x="60" y="93">1</text><text x="160" y="93">4</text>' +
		'<text x="88" y="149">2</text>' +
		'</g>' +
		'<text x="96" y="180" text-anchor="middle" class="lbl">left &lt; node &lt; right at every node</text>' +
		// the walk
		'<line x1="196" y1="88" x2="268" y2="88" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowKSB)"/>' +
		'<text x="232" y="70" text-anchor="middle" style="fill:var(--accent)">in-order</text>' +
		'<text x="232" y="110" text-anchor="middle" class="lbl">left, node, right</text>' +
		// sorted strip
		'<text x="290" y="52" class="lbl">values in ascending order</text>' +
		'<g>' +
		'<rect x="290" y="64" width="44" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<rect x="340" y="64" width="44" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="390" y="64" width="44" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="440" y="64" width="44" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="312" y="86" text-anchor="middle">1</text>' +
		'<text x="362" y="86" text-anchor="middle">2</text>' +
		'<text x="412" y="86" text-anchor="middle">3</text>' +
		'<text x="462" y="86" text-anchor="middle">4</text>' +
		'<text x="312" y="116" text-anchor="middle" class="lbl">k=1</text>' +
		'<text x="362" y="116" text-anchor="middle" class="lbl">k=2</text>' +
		'<text x="412" y="116" text-anchor="middle" class="lbl">k=3</text>' +
		'<text x="462" y="116" text-anchor="middle" class="lbl">k=4</text>' +
		'</g>' +
		'<text x="290" y="146" style="fill:var(--ok)">stop at the kth value — no need to finish the walk</text>' +
		'<text x="290" y="166" class="lbl">here k=1 → answer 1, the leftmost node</text>' +
		'<defs><marker id="dgArrowKSB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'kth-smallest-in-bst',
		title: 'Kth Smallest Element in a BST',
		nav: 'Kth Smallest in BST',
		difficulty: 'Medium',
		category: 'Trees',
		task: 'Implement kthSmallest — make all 5 tests pass.',

		prose: [
			'<h2>Kth Smallest Element in a BST</h2>' +
			'<p>Given the root of a <em>binary search tree</em> and an integer <code>k</code>, ' +
			'return the <code>k</code>-th smallest value in the tree (1-indexed).</p>' +
			'<ul><li><code>k</code> is always valid: <code>1 ≤ k ≤</code> number of nodes.</li>' +
			'<li>BST invariant: at every node, all values in the left subtree are smaller ' +
			'and all values in the right subtree are larger.</li>' +
			'<li>Tests encode trees in LeetCode level-order form: <code>[3,1,4,null,2]</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'kthSmallest([3,1,4,null,2], 1)         →  1\nkthSmallest([5,3,6,2,4,null,null,1], 3) →  3', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p><strong>An in-order walk of a BST visits its values in ascending sorted ' +
			'order.</strong> That single fact turns "kth smallest" into "the kth node an ' +
			'in-order traversal touches" — no sorting, no extra array. Walk left-node-right, ' +
			'count down from k, and stop the instant the counter hits zero:</p>' +
			DIAGRAM +
			'<p>An explicit stack (instead of recursion) makes the early exit trivial: ' +
			'return from the loop and the walk simply ends.</p>',
		],

		starter: [
			'package main',
			'',
			'// TreeNode is a node in a binary search tree.',
			'type TreeNode struct {',
			'	Val   int',
			'	Left  *TreeNode',
			'	Right *TreeNode',
			'}',
			'',
			'// kthSmallest returns the kth smallest value in the BST rooted at',
			'// root. k is 1-indexed and always valid (1 <= k <= number of nodes).',
			'func kthSmallest(root *TreeNode, k int) int {',
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
			LC.TREE_HELPERS,
			'',
			'func main() {',
			'	type tc struct {',
			'		in   []any',
			'		k    int',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		// The classic: the minimum is the leftmost node, not the root.',
			'		{[]any{3, 1, 4, nil, 2}, 1, 1},',
			'		{[]any{5, 3, 6, 2, 4, nil, nil, 1}, 3, 3},',
			'		// k = tree size: the answer is the maximum (rightmost node).',
			'		{[]any{5, 3, 6, 2, 4, nil, nil, 1}, 6, 6},',
			'		// The answer sits at the root — the walk must pass through it.',
			'		{[]any{3, 1, 4, nil, 2}, 3, 3},',
			'		// Left-skewed chain: deepest node first; stack depth = tree height.',
			'		{[]any{5, 4, nil, 3, nil, 2, nil, 1}, 2, 2},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("tree=%v, k=%d", c.in, c.k),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := kthSmallest(treeFromLevel(append([]any(nil), c.in...)), c.k)',
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
			'// TreeNode is a node in a binary search tree.',
			'type TreeNode struct {',
			'	Val   int',
			'	Left  *TreeNode',
			'	Right *TreeNode',
			'}',
			'',
			'// kthSmallest returns the kth smallest value in the BST (k 1-indexed,',
			'// guaranteed valid).',
			'//',
			'// The BST invariant means an in-order walk (left, node, right) emits',
			'// values in ascending order, so the kth node visited IS the answer.',
			'// The traversal is iterative with an explicit stack rather than',
			'// recursive for one reason: early exit. A recursive walk has to',
			'// thread a "found it, stop" signal back up through every frame;',
			'// here, returning mid-loop just abandons the rest of the tree.',
			'// Only O(h + k) nodes are ever touched.',
			'func kthSmallest(root *TreeNode, k int) int {',
			'	stack := []*TreeNode{} // path of ancestors whose node+right half is still pending',
			'	cur := root',
			'	for cur != nil || len(stack) > 0 {',
			'		// Slide to the leftmost unvisited node, stacking the path.',
			'		// Everything on the stack is smaller than anything above it,',
			'		// so pops come off in ascending order.',
			'		for cur != nil {',
			'			stack = append(stack, cur)',
			'			cur = cur.Left',
			'		}',
			'		// Pop = visit the next value in sorted order.',
			'		cur = stack[len(stack)-1]',
			'		stack = stack[:len(stack)-1]',
			'		k--',
			'		if k == 0 {',
			'			return cur.Val // kth value emitted — stop, skip the rest of the tree',
			'		}',
			'		// The node is consumed; its right subtree holds the next-larger values.',
			'		cur = cur.Right',
			'	}',
			'	return -1 << 31 // unreachable: k is guaranteed valid',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Collect every value with any traversal, sort the slice, index ' +
			'<code>[k-1]</code> — O(n log n) time, O(n) space. One step better: an ' +
			'in-order traversal into a slice needs no sort at all (it comes out sorted), ' +
			'but still visits all n nodes and stores all n values when only the first k ' +
			'matter. The wasted work is everything after the kth visit.</p>' +
			'<h3>The BST fact that does all the work</h3>' +
			'<p><strong>In-order on a BST yields sorted order.</strong> Left subtree ' +
			'(all smaller) → node → right subtree (all larger), applied recursively, is ' +
			'exactly ascending order. So "kth smallest" needs no comparison logic at all — ' +
			'just a counter on the traversal. An explicit stack makes stopping early clean:</p>',
			{ code: 'stack := []*TreeNode{}\ncur := root\nfor cur != nil || len(stack) > 0 {\n\tfor cur != nil { // dive left, stacking the path\n\t\tstack = append(stack, cur)\n\t\tcur = cur.Left\n\t}\n\tcur = stack[len(stack)-1] // next value in sorted order\n\tstack = stack[:len(stack)-1]\n\tk--\n\tif k == 0 {\n\t\treturn cur.Val // early exit — rest of the tree never touched\n\t}\n\tcur = cur.Right\n}' },
			'<p>Why this shape:</p>' +
			'<ul>' +
			'<li><strong>The stack holds the "pending" ancestors.</strong> Each pop is the ' +
			'smallest not-yet-visited value; pushing the popped node&rsquo;s right subtree ' +
			'queues up the next-larger range. Stack depth never exceeds the tree height.</li>' +
			'<li><strong>Early exit is the point.</strong> The walk costs O(h) to reach the ' +
			'minimum plus O(1) amortized per step after, so the total is O(h + k) — for ' +
			'small k in a balanced tree, that is O(log n), far from visiting all n nodes.</li>' +
			'<li><strong>Follow-up: frequent queries.</strong> If kthSmallest is called ' +
			'often while the tree also takes inserts and deletes, augment each node with ' +
			'its subtree size. Then the query walks a single root-to-answer path: if the ' +
			'left subtree holds <code>size ≥ k</code> nodes, descend left; if ' +
			'<code>size == k-1</code>, the node itself is the answer; otherwise descend ' +
			'right with <code>k - size - 1</code>. O(h) per query, and the counts are ' +
			'maintainable in O(h) per update.</li>' +
			'</ul>' +
			'<h3>The pattern</h3>' +
			'<p><strong>In-order traversal = sorted stream</strong> — whenever a problem ' +
			'combines a BST with anything about order or rank ("kth", "successor", ' +
			'"closest value", "is it sorted?"), read the tree with an in-order walk and ' +
			'treat it as a sorted sequence arriving one value at a time. Cost: O(h + k) ' +
			'with early exit, O(h) stack. The same traversal drives Validate Binary Search ' +
			'Tree — identical walk, but the consumer checks each value exceeds the previous ' +
			'instead of counting — and Lowest Common Ancestor of a BST leans on the same ' +
			'invariant to steer a descent. When the data is <em>not</em> a BST, "kth" ' +
			'falls back to the heap idiom of Kth Largest Element in an Array.</p>',
		],
		complexity: { time: 'O(h + k)', space: 'O(h)' },
	});
})();
