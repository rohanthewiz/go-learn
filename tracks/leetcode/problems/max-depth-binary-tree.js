/* Maximum Depth of Binary Tree — Trees (Easy). The gentlest possible
 * introduction to "a tree property is a recursion": the depth of a tree
 * is one more than the depth of its deeper child. Also the place where
 * the nil-means-height-0 convention gets cemented.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="tree levels marked with horizontal depth bands">' +
		// depth bands — drawn first so nodes (panel-filled) sit on top
		'<g stroke="var(--edge)" stroke-dasharray="4 3">' +
		'<line x1="30" y1="40" x2="460" y2="40"/>' +
		'<line x1="30" y1="100" x2="460" y2="100"/>' +
		'<line x1="30" y1="160" x2="460" y2="160"/>' +
		'</g>' +
		'<text x="350" y="34" class="lbl">depth 1</text>' +
		'<text x="350" y="94" class="lbl">depth 2</text>' +
		'<text x="350" y="154" class="lbl">depth 3</text>' +
		// tree edges
		'<g stroke="var(--edge)">' +
		'<line x1="140" y1="54" x2="80" y2="86"/><line x1="140" y1="54" x2="200" y2="86"/>' +
		'<line x1="200" y1="114" x2="160" y2="146"/><line x1="200" y1="114" x2="240" y2="146"/>' +
		'</g>' +
		// nodes — the depth-3 leaves are the ones that set the answer
		'<g fill="var(--panel)" stroke="var(--edge)" stroke-width="1.6">' +
		'<circle cx="140" cy="40" r="14"/><circle cx="80" cy="100" r="14"/><circle cx="200" cy="100" r="14"/>' +
		'</g>' +
		'<g fill="var(--panel)" stroke="var(--accent)" stroke-width="2">' +
		'<circle cx="160" cy="160" r="14"/><circle cx="240" cy="160" r="14"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="140" y="45">3</text><text x="80" y="105">9</text><text x="200" y="105">20</text>' +
		'<text x="160" y="165">15</text><text x="240" y="165">7</text>' +
		'</g>' +
		'<text x="350" y="182" style="fill:var(--ok)">maxDepth = 3</text>' +
		'</svg>';

	LC.problem({
		id: 'max-depth-binary-tree',
		title: 'Maximum Depth of Binary Tree',
		nav: 'Max Depth of Binary Tree',
		difficulty: 'Easy',
		category: 'Trees',
		task: 'Implement maxDepth — make all 4 tests pass.',

		prose: [
			'<h2>Maximum Depth of Binary Tree</h2>' +
			'<p>Given the root of a binary tree, return its <em>maximum depth</em>: ' +
			'the number of nodes on the longest path from the root down to a leaf.</p>' +
			'<ul><li>An empty tree has depth 0; a single node has depth 1.</li>' +
			'<li>Tests encode trees in LeetCode level-order form: <code>[3,9,20,null,null,15,7]</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'maxDepth([3,9,20,null,null,15,7])  →  3\nmaxDepth([1,null,2])               →  2\nmaxDepth([])                       →  0', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>The depth of a tree is one (for the root) plus the depth of its ' +
			'<em>deeper</em> child. That single sentence is the whole algorithm — ' +
			'recursion carries it to every level:</p>' +
			DIAGRAM +
			'<p>The longest root-to-leaf path here runs 3 → 20 → 15 (or 7): three nodes deep.</p>',
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
			'// maxDepth returns the number of nodes along the longest path from',
			'// the root down to the farthest leaf (0 for an empty tree).',
			'func maxDepth(root *TreeNode) int {',
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
			LC.TREE_HELPERS,
			'',
			'func main() {',
			'	type tc struct {',
			'		in   []any',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{[]any{3, 9, 20, nil, nil, 15, 7}, 3},',
			'		{[]any{1, nil, 2}, 2},',
			'		{[]any{}, 0},',
			'		{[]any{0}, 1},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.in),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := maxDepth(treeFromLevel(append([]any(nil), c.in...)))',
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
			'// TreeNode is a node in a binary tree.',
			'type TreeNode struct {',
			'	Val   int',
			'	Left  *TreeNode',
			'	Right *TreeNode',
			'}',
			'',
			'// maxDepth returns the node count of the longest root-to-leaf path.',
			'//',
			'// The recursion leans on one convention: a nil subtree has height 0.',
			'// That base case is what makes a leaf come out as 1 (itself plus an',
			'// empty deeper child) without any special-casing — leaves, single',
			'// nodes, and the empty tree all fall out of the same two lines.',
			'func maxDepth(root *TreeNode) int {',
			'	if root == nil {',
			'		return 0 // empty tree = height 0, the anchor of the recursion',
			'	}',
			'	left := maxDepth(root.Left)',
			'	right := maxDepth(root.Right)',
			'	// Explicit comparison rather than the max builtin — the playground',
			'	// interpreter predates it, and the intent is just as clear.',
			'	if left > right {',
			'		return 1 + left',
			'	}',
			'	return 1 + right',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Counting levels by hand</h3>' +
			'<p>The iterative instinct is level-order traversal: walk the tree with a ' +
			'queue, bump a counter each time a level is exhausted. It works, and it’s ' +
			'a fine BFS exercise — but it needs a queue, a per-level loop, and careful ' +
			'bookkeeping, all to compute a number the tree’s <em>shape</em> already ' +
			'encodes.</p>' +
			'<h3>Depth is a recurrence</h3>' +
			'<p>A tree’s depth is 1 (the root) plus the depth of whichever child is ' +
			'deeper. Empty tree: 0. That definition <em>is</em> the code:</p>',
			{ code: 'if root == nil {\n\treturn 0 // the convention everything hangs on\n}\nleft := maxDepth(root.Left)\nright := maxDepth(root.Right)\nif left > right { // explicit — no max builtin here\n\treturn 1 + left\n}\nreturn 1 + right' },
			'<p>What’s doing the quiet work:</p>' +
			'<ul>' +
			'<li><strong>nil = 0 is the whole contract.</strong> A leaf asks both nil ' +
			'children, gets 0 + 0, returns 1. No leaf special case needed.</li>' +
			'<li><strong>Skewed trees just work.</strong> <code>[1,null,2]</code>: the ' +
			'missing left child contributes 0, the right chain contributes 1, answer 2.</li>' +
			'<li><strong>Space is the recursion stack</strong> — O(h), which is O(log n) ' +
			'for a balanced tree but O(n) for a degenerate chain.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(h)' },
	});
})();
