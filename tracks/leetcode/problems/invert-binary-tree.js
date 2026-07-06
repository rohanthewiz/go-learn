/* Invert Binary Tree — Trees (Easy). The classic "mirror the tree" problem:
 * swap the children at every node and the whole tree flips. First tree
 * problem in the track, so the starter introduces the TreeNode type and
 * the harness introduces the level-order encoding helpers.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="a binary tree and its mirror image">' +
		'<text x="20" y="16" class="lbl">original</text>' +
		'<text x="330" y="16" class="lbl">inverted (mirror)</text>' +
		// original tree — edges first, then nodes
		'<g stroke="var(--edge)">' +
		'<line x1="110" y1="46" x2="60" y2="74"/><line x1="110" y1="46" x2="160" y2="74"/>' +
		'<line x1="60" y1="102" x2="32" y2="130"/><line x1="60" y1="102" x2="88" y2="130"/>' +
		'<line x1="160" y1="102" x2="132" y2="130"/><line x1="160" y1="102" x2="188" y2="130"/>' +
		'</g>' +
		'<g fill="var(--panel)" stroke="var(--edge)" stroke-width="1.6">' +
		'<circle cx="110" cy="32" r="14"/><circle cx="60" cy="88" r="14"/><circle cx="160" cy="88" r="14"/>' +
		'<circle cx="32" cy="144" r="14"/><circle cx="88" cy="144" r="14"/><circle cx="132" cy="144" r="14"/><circle cx="188" cy="144" r="14"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="110" y="37">4</text><text x="60" y="93">2</text><text x="160" y="93">7</text>' +
		'<text x="32" y="149">1</text><text x="88" y="149">3</text><text x="132" y="149">6</text><text x="188" y="149">9</text>' +
		'</g>' +
		// swap arcs between each sibling pair
		'<g fill="none" stroke="var(--accent)" stroke-width="1.5">' +
		'<path d="M 74 98 C 95 118 125 118 146 98" marker-end="url(#dgArrowIBT)"/>' +
		'<path d="M 44 156 C 55 174 65 174 76 156" marker-end="url(#dgArrowIBT)"/>' +
		'<path d="M 144 156 C 155 174 165 174 176 156" marker-end="url(#dgArrowIBT)"/>' +
		'</g>' +
		// original → mirrored
		'<line x1="218" y1="88" x2="286" y2="88" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowIBT)"/>' +
		'<text x="252" y="76" text-anchor="middle" class="lbl">invert</text>' +
		'<text x="252" y="112" text-anchor="middle" class="lbl">swap children</text>' +
		'<text x="252" y="128" text-anchor="middle" class="lbl">at every node</text>' +
		// mirrored tree
		'<g stroke="var(--edge)">' +
		'<line x1="390" y1="46" x2="340" y2="74"/><line x1="390" y1="46" x2="440" y2="74"/>' +
		'<line x1="340" y1="102" x2="312" y2="130"/><line x1="340" y1="102" x2="368" y2="130"/>' +
		'<line x1="440" y1="102" x2="412" y2="130"/><line x1="440" y1="102" x2="468" y2="130"/>' +
		'</g>' +
		'<g fill="var(--panel)" stroke="var(--ok)" stroke-width="1.6">' +
		'<circle cx="390" cy="32" r="14"/><circle cx="340" cy="88" r="14"/><circle cx="440" cy="88" r="14"/>' +
		'<circle cx="312" cy="144" r="14"/><circle cx="368" cy="144" r="14"/><circle cx="412" cy="144" r="14"/><circle cx="468" cy="144" r="14"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="390" y="37">4</text><text x="340" y="93">7</text><text x="440" y="93">2</text>' +
		'<text x="312" y="149">9</text><text x="368" y="149">6</text><text x="412" y="149">3</text><text x="468" y="149">1</text>' +
		'</g>' +
		'<defs><marker id="dgArrowIBT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'invert-binary-tree',
		title: 'Invert Binary Tree',
		nav: 'Invert Binary Tree',
		difficulty: 'Easy',
		category: 'Trees',
		task: 'Implement invertTree — make all 3 tests pass.',

		prose: [
			'<h2>Invert Binary Tree</h2>' +
			'<p>Given the root of a binary tree, <em>invert</em> it (mirror it left-to-right) ' +
			'and return its root.</p>' +
			'<ul><li>Every left subtree becomes the right subtree, and vice versa — at every level.</li>' +
			'<li>Tests encode trees in LeetCode level-order form: <code>[4,2,7,1,3,6,9]</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'invertTree([4,2,7,1,3,6,9])  →  [4,7,2,9,6,3,1]\ninvertTree([2,1,3])          →  [2,3,1]', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>A mirror image is nothing more than “left and right traded places” — ' +
			'applied at <em>every</em> node. Swap the two child pointers, then let ' +
			'recursion do the same to each subtree:</p>' +
			DIAGRAM +
			'<p>Each node is touched exactly once; the tree flips in place.</p>',
		],

		starter: [
			'package main',
			'',
			'// TreeNode is a node in a binary tree.',
			'type TreeNode struct {',
			'	Val   int',
			'	Left  *TreeNode',
			'	Right *TreeNode',
			'}',
			'',
			'// invertTree mirrors the tree rooted at root (left and right',
			'// subtrees swap at every node) and returns its root.',
			'func invertTree(root *TreeNode) *TreeNode {',
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
			')',
			'',
			LC.HARNESS_RT,
			'',
			LC.TREE_HELPERS,
			'',
			'func main() {',
			'	type tc struct {',
			'		in   []any',
			'		want []any',
			'	}',
			'	cases := []tc{',
			'		{[]any{4, 2, 7, 1, 3, 6, 9}, []any{4, 7, 2, 9, 6, 3, 1}},',
			'		{[]any{2, 1, 3}, []any{2, 3, 1}},',
			'		{[]any{}, []any{}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.in),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := treeToLevel(invertTree(treeFromLevel(append([]any(nil), c.in...))))',
			'			r["pass"] = fmt.Sprintf("%v", got) == fmt.Sprintf("%v", c.want)',
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
			'// TreeNode is a node in a binary tree.',
			'type TreeNode struct {',
			'	Val   int',
			'	Left  *TreeNode',
			'	Right *TreeNode',
			'}',
			'',
			'// invertTree mirrors the tree in place and returns its root.',
			'//',
			'// The swap at a node is independent of whether its subtrees have',
			'// been mirrored yet, so pre-order (swap, then recurse) and',
			'// post-order (recurse, then swap) are both correct — every node is',
			'// visited exactly once either way. Swap-first is used here because',
			'// after the swap the two recursive calls read naturally as',
			'// “finish the (new) left, finish the (new) right”.',
			'func invertTree(root *TreeNode) *TreeNode {',
			'	if root == nil {',
			'		return nil // empty subtree: nothing to mirror',
			'	}',
			'	// Parallel assignment swaps the pointers without a temp variable.',
			'	root.Left, root.Right = root.Right, root.Left',
			'	invertTree(root.Left)',
			'	invertTree(root.Right)',
			'	return root',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What does “mirror” actually require?</h3>' +
			'<p>A first instinct is to rebuild the tree — allocate a fresh mirrored copy, ' +
			'or walk it level by level with a queue rearranging nodes. All workable, but ' +
			'over-engineered: a mirror image is fully described by one local rule. ' +
			'<em>At every node, left and right trade places.</em> Nothing else moves.</p>' +
			'<h3>One swap per node</h3>' +
			'<p>So the whole algorithm is: swap the two child pointers, recurse into both ' +
			'subtrees, done. No new nodes, no queue:</p>',
			{ code: 'if root == nil {\n\treturn nil\n}\nroot.Left, root.Right = root.Right, root.Left // the one local rule\ninvertTree(root.Left)\ninvertTree(root.Right)\nreturn root' },
			'<p>Small points worth noticing:</p>' +
			'<ul>' +
			'<li><strong>The nil base case carries the leaves.</strong> A leaf’s children are ' +
			'both nil; swapping them is a no-op and the recursion bottoms out cleanly.</li>' +
			'<li><strong>Order doesn’t matter.</strong> Swapping before or after the recursive ' +
			'calls gives the same tree — the swap only touches this node’s pointers.</li>' +
			'<li><strong>In place.</strong> The tree is mutated and its own root returned; ' +
			'O(h) space is just the recursion stack (h = tree height).</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(h)' },
	});
})();
