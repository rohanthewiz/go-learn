/* Diameter of Binary Tree — Trees (Easy). THE tree-DP shape: postorder
 * DFS where the recursion returns one thing (height) while the answer
 * (longest path) is harvested at every join point along the way.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// A tree whose diameter does NOT pass through the root: the long path
	// joins at node 2, where leftH + rightH beats anything through node 1.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 230" width="500" height="230" role="img" aria-label="diameter path joining at an inner node, not the root">' +
		'<text x="20" y="16" class="lbl">diameter = 6 edges — and the root isn’t even on the path</text>' +
		// edges: the diameter path in ok, the root link dimmed
		'<g stroke="var(--dim)">' +
		'<line x1="280" y1="40" x2="225" y2="62"/>' +
		'</g>' +
		'<g stroke="var(--ok)" stroke-width="2">' +
		'<line x1="215" y1="78" x2="165" y2="102"/><line x1="225" y1="78" x2="275" y2="102"/>' +
		'<line x1="155" y1="118" x2="125" y2="142"/><line x1="285" y1="118" x2="315" y2="142"/>' +
		'<line x1="115" y1="158" x2="85" y2="182"/><line x1="325" y1="158" x2="355" y2="182"/>' +
		'</g>' +
		// nodes
		'<g fill="var(--panel)">' +
		'<circle cx="284" cy="32" r="14" stroke="var(--dim)" stroke-width="1.4"/>' +
		'<circle cx="220" cy="70" r="14" stroke="var(--accent)" stroke-width="2.2"/>' +
		'<circle cx="160" cy="110" r="14" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<circle cx="280" cy="110" r="14" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<circle cx="120" cy="150" r="14" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<circle cx="320" cy="150" r="14" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<circle cx="80" cy="190" r="14" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<circle cx="360" cy="190" r="14" stroke="var(--ok)" stroke-width="1.6"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="284" y="37">1</text><text x="220" y="75">2</text>' +
		'<text x="160" y="115">3</text><text x="280" y="115">4</text>' +
		'<text x="120" y="155">5</text><text x="320" y="155">6</text>' +
		'<text x="80" y="195">7</text><text x="360" y="195">8</text>' +
		'</g>' +
		// join-point annotation
		'<path d="M 420 60 C 380 44 320 50 242 64" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowDBT)"/>' +
		'<text x="424" y="58" class="lbl">join point:</text>' +
		'<text x="424" y="74" class="lbl">leftH 3 + rightH 3</text>' +
		'<text x="424" y="90" class="lbl">= 6 edges</text>' +
		'<text x="20" y="220" class="lbl">postorder returns each subtree’s height; every node checks leftH + rightH as a candidate</text>' +
		'<defs><marker id="dgArrowDBT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'diameter-of-binary-tree',
		title: 'Diameter of Binary Tree',
		nav: 'Diameter of Binary Tree',
		difficulty: 'Easy',
		category: 'Trees',
		task: 'Implement diameterOfBinaryTree — make all 5 tests pass.',

		prose: [
			'<h2>Diameter of Binary Tree</h2>' +
			'<p>Given the root of a binary tree, return its <em>diameter</em>: the number ' +
			'of <strong>edges</strong> on the longest path between any two nodes.</p>' +
			'<ul><li>The path may or may not pass through the root.</li>' +
			'<li>Edges, not nodes: a single-node tree (and an empty tree) has diameter 0.</li>' +
			'<li>Tests encode trees in LeetCode level-order form: <code>[1,2,3,4,5]</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'diameterOfBinaryTree([1,2,3,4,5])  →  3   // path 4 → 2 → 1 → 3 (3 edges)\ndiameterOfBinaryTree([1])          →  0', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Every path has a highest node — its <em>join point</em> — where it bends: ' +
			'it comes up through the left subtree and goes down the right. At that node ' +
			'the path length is exactly <code>height(left) + height(right)</code>. So one ' +
			'postorder walk that computes heights can check every possible join point ' +
			'along the way:</p>' +
			DIAGRAM +
			'<p>The recursion <em>returns</em> height; the diameter is a side effect ' +
			'collected at every node. Don’t confuse the two.</p>',
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
			'// diameterOfBinaryTree returns the number of EDGES on the longest',
			'// path between any two nodes (0 for a single node or empty tree).',
			'// The path need not pass through the root.',
			'//',
			'// Hint: a postorder helper that returns a subtree’s HEIGHT can',
			'// update the best answer (leftH + rightH) at every node it visits.',
			'func diameterOfBinaryTree(root *TreeNode) int {',
			'	// your code here',
			'	return -1',
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
			'		{[]any{1, 2, 3, 4, 5}, 3},',
			'		{[]any{1}, 0},',
			'		// Diameter (6) lives entirely inside node 2’s subtree — any',
			'		// solution that only measures paths through the root gets 4.',
			'		{[]any{1, 2, nil, 3, 4, 5, nil, nil, 6, 7, nil, nil, 8}, 6},',
			'		{[]any{1, nil, 2, nil, 3, nil, 4}, 3},',
			'		{[]any{}, 0},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.in),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := diameterOfBinaryTree(treeFromLevel(append([]any(nil), c.in...)))',
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
			'// diameterOfBinaryTree returns the longest path between any two',
			'// nodes, measured in edges.',
			'//',
			'// Key observation: every path has a unique highest node (its join',
			'// point), and there the path length is height(left) + height(right).',
			'// So checking leftH + rightH at EVERY node covers every possible',
			'// path — including ones that never touch the root.',
			'//',
			'// The design split that makes this clean: the recursion RETURNS',
			'// height (the ingredient a parent needs to keep the walk going),',
			'// while the ANSWER accumulates in a closure-captured best. Trying',
			'// to return the diameter itself instead forces a second recursion',
			'// per node (the naive O(n²) trap).',
			'func diameterOfBinaryTree(root *TreeNode) int {',
			'	best := 0',
			'',
			'	// Declared before assignment so the closure can recurse into',
			'	// itself. height counts NODES on the longest downward path',
			'	// (leaf = 1, nil = 0) — that convention makes the nil base case',
			'	// trivially 0 and, as noted below, makes leftH+rightH an EDGE count.',
			'	var height func(n *TreeNode) int',
			'	height = func(n *TreeNode) int {',
			'		if n == nil {',
			'			return 0 // empty subtree: height 0 in node-count terms',
			'		}',
			'		leftH := height(n.Left)',
			'		rightH := height(n.Right)',
			'',
			'		// Heights are counted in NODES (leaf = 1), which makes',
			'		// leftH + rightH exactly the EDGE count of the best path',
			'		// bending at n: each subtree contributes one edge per node',
			'		// on its spine, including the edge from n down into it.',
			'		if leftH+rightH > best {',
			'			best = leftH + rightH',
			'		}',
			'',
			'		// The parent only cares about the taller arm — a path',
			'		// continuing upward can use at most one of my subtrees.',
			'		if leftH > rightH {',
			'			return leftH + 1',
			'		}',
			'		return rightH + 1',
			'	}',
			'',
			'	height(root)',
			'	return best // 0 survives for single-node and empty trees',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>For every node, compute the height of its left and right subtrees and take ' +
			'the best <code>leftH + rightH</code>. Correct — but calling a standalone ' +
			'<code>height()</code> from every node re-walks each subtree once per ' +
			'ancestor: O(n²) on a skewed tree. The wasted work is obvious in hindsight: ' +
			'height and diameter want to visit the exact same nodes in the exact same ' +
			'postorder — so compute both in one pass.</p>' +
			'<h3>Return the ingredient, harvest the answer</h3>' +
			'<p>The single-pass version rests on one structural fact: <em>every path has ' +
			'a unique highest node</em>, the join point where it stops climbing and turns ' +
			'back down. At that node the path is “left arm + right arm”, which is ' +
			'<code>height(left) + height(right)</code>. Checking that sum at every node ' +
			'covers every path in the tree:</p>',
			{ code: 'best := 0\nvar height func(n *TreeNode) int\nheight = func(n *TreeNode) int {\n\tif n == nil {\n\t\treturn 0\n\t}\n\tleftH := height(n.Left)\n\trightH := height(n.Right)\n\tif leftH+rightH > best {\n\t\tbest = leftH + rightH // candidate path bending HERE\n\t}\n\tif leftH > rightH {\n\t\treturn leftH + 1 // parent gets the taller arm only\n\t}\n\treturn rightH + 1\n}\nheight(root)\nreturn best' },
			'<p>Notice the deliberate asymmetry — it is the whole trick:</p>' +
			'<ul>' +
			'<li><strong>The return value is height, not diameter.</strong> A parent ' +
			'extending a path upward can use at most <em>one</em> of my arms, so that is ' +
			'all it gets told.</li>' +
			'<li><strong>The answer is a side effect.</strong> <code>best</code> lives in ' +
			'the enclosing function; every node deposits its <code>leftH + rightH</code> ' +
			'candidate on the way back up. The bent path is never “returned” anywhere.</li>' +
			'<li><strong>Postorder is forced,</strong> not chosen: a node can’t know its ' +
			'height until both children have reported theirs.</li>' +
			'</ul>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Postorder DFS where the return value ≠ the answer</strong> — the ' +
			'defining tree-DP shape. Reach for it when the quantity you must report ' +
			'(here: a path through a join point) is built from a simpler per-subtree ' +
			'quantity (here: height) that recursion can return; the trigger is any ' +
			'“best path / best structure anywhere in the tree” phrasing where the ' +
			'candidate is evaluated at each node from its children’s summaries. Cost: ' +
			'one O(n) walk, O(h) stack. Balanced Binary Tree in this track is the same ' +
			'shape (return height, judge balance as the side effect), Maximum Depth of ' +
			'Binary Tree is the degenerate case where the ingredient <em>is</em> the ' +
			'answer, and LeetCode’s Binary Tree Maximum Path Sum is this exact problem ' +
			'with node values instead of edge counts.</p>',
		],
		complexity: { time: 'O(n)', space: 'O(h)' },
	});
})();
