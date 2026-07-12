/* Lowest Common Ancestor of a BST — Trees (Medium). The BST ordering
 * makes LCA a guided descent: while both targets sit on the same side of
 * the current node, go that way; the first node where they split (or
 * that equals one of them) IS the LCA. Values in, value out — the
 * harness never plumbs node pointers.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// The classic BST, showing the descent for p=0, q=5: both < 6 → go
	// left; at 2 they straddle (0 < 2 < 5) → 2 is the split point / LCA.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 230" width="500" height="230" role="img" aria-label="descent through a BST to the split point, which is the LCA">' +
		'<text x="20" y="16" class="lbl">p = 0, q = 5 — follow the side they share, stop where they split</text>' +
		// plain tree edges
		'<g stroke="var(--edge)">' +
		'<line x1="250" y1="48" x2="350" y2="74"/>' +
		'<line x1="150" y1="100" x2="95" y2="126"/><line x1="150" y1="100" x2="205" y2="126"/>' +
		'<line x1="350" y1="100" x2="305" y2="126"/><line x1="350" y1="100" x2="405" y2="126"/>' +
		'<line x1="205" y1="152" x2="175" y2="178"/><line x1="205" y1="152" x2="235" y2="178"/>' +
		'</g>' +
		// the descent edge 6 → 2, highlighted
		'<line x1="238" y1="46" x2="166" y2="76" stroke="var(--accent)" stroke-width="2.2" marker-end="url(#dgArrowLCA)"/>' +
		// nodes
		'<g fill="var(--panel)">' +
		'<circle cx="250" cy="34" r="15" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="150" cy="86" r="15" stroke="var(--accent)" stroke-width="2.4"/>' +
		'<circle cx="350" cy="86" r="15" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="95" cy="140" r="15" stroke="var(--ok)" stroke-width="2"/>' +
		'<circle cx="205" cy="140" r="15" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="305" cy="140" r="15" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="405" cy="140" r="15" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="175" cy="192" r="15" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="235" cy="192" r="15" stroke="var(--ok)" stroke-width="2"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="250" y="39">6</text>' +
		'<text x="150" y="91">2</text><text x="350" y="91">8</text>' +
		'<text x="95" y="145">0</text><text x="205" y="145">4</text>' +
		'<text x="305" y="145">7</text><text x="405" y="145">9</text>' +
		'<text x="175" y="197">3</text><text x="235" y="197">5</text>' +
		'</g>' +
		// annotations
		'<text x="290" y="30" class="lbl">0 &lt; 6 and 5 &lt; 6 → both left</text>' +
		'<text x="42" y="86" class="lbl" style="fill:var(--accent)">split!</text>' +
		'<text x="20" y="110" class="lbl">0 &lt; 2 &lt; 5</text>' +
		'<text x="95" y="176" text-anchor="middle" class="lbl" style="fill:var(--ok)">p</text>' +
		'<text x="272" y="197" class="lbl" style="fill:var(--ok)">q</text>' +
		'<text x="20" y="222" class="lbl">the first node the two targets straddle is the LCA — here, 2</text>' +
		'<defs><marker id="dgArrowLCA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'lowest-common-ancestor-bst',
		title: 'Lowest Common Ancestor of a BST',
		nav: 'LCA of a BST',
		difficulty: 'Medium',
		category: 'Trees',
		task: 'Implement lowestCommonAncestorBST — make all 6 tests pass.',

		prose: [
			'<h2>Lowest Common Ancestor of a BST</h2>' +
			'<p>Given the root of a <em>binary search tree</em> and two target values ' +
			'<code>p</code> and <code>q</code>, return the <strong>value</strong> of their ' +
			'lowest common ancestor: the deepest node that has both targets in its ' +
			'subtree.</p>' +
			'<ul><li>All values in the tree are unique; <code>p</code> and <code>q</code> ' +
			'are guaranteed present (so the function takes and returns plain ' +
			'<code>int</code> values, no node plumbing).</li>' +
			'<li>A node counts as an ancestor of itself — the LCA of ' +
			'<code>(2, 4)</code> in the example below is <code>2</code>.</li>' +
			'<li>BST property: everything in a left subtree is smaller than the node, ' +
			'everything in a right subtree larger.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'tree = [6,2,8,0,4,7,9,null,null,3,5]\n\nlowestCommonAncestorBST(tree, 2, 8)  →  6   // split at the root\nlowestCommonAncestorBST(tree, 2, 4)  →  2   // ancestor of itself', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>In a BST you never have to search for the targets — their positions are ' +
			'encoded in the ordering. From the root: if both targets are smaller than ' +
			'the current node, the LCA is in the left subtree; both larger, right ' +
			'subtree. The first node they <em>straddle</em> (or hit) is the answer:</p>' +
			DIAGRAM +
			'<p>One walk from root toward a leaf — O(h), no recursion needed.</p>',
		],

		starter: [
			'package main',
			'',
			'// TreeNode is a node in a binary tree (here: a binary search tree).',
			'type TreeNode struct {',
			'	Val   int',
			'	Left  *TreeNode',
			'	Right *TreeNode',
			'}',
			'',
			'// lowestCommonAncestorBST returns the VALUE of the lowest common',
			'// ancestor of the nodes holding values p and q. The tree is a BST',
			'// with unique values, and both p and q are guaranteed present.',
			'// A node is an ancestor of itself.',
			'//',
			'// Hint: no search required — the BST ordering tells you which way',
			'// the LCA lies from any node. Descend while p and q are on the',
			'// same side.',
			'func lowestCommonAncestorBST(root *TreeNode, p, q int) int {',
			'	// your code here',
			'	return -1 << 31',
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
			'	// All cases run against the classic LeetCode BST.',
			'	tree := []any{6, 2, 8, 0, 4, 7, 9, nil, nil, 3, 5}',
			'	type tc struct {',
			'		p, q int',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{2, 8, 6},  // split at the root',
			'		{2, 4, 2},  // ancestor of itself: p is q’s ancestor',
			'		{3, 9, 6},  // leaves on opposite sides of the root',
			'		{0, 5, 2},  // deep pair, both under the root’s left child',
			'		{3, 5, 4},  // sibling leaves',
			'		{5, 2, 2},  // deeper node passed first — order must not matter',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("tree=%v p=%d q=%d", tree, c.p, c.q),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := lowestCommonAncestorBST(treeFromLevel(append([]any(nil), tree...)), c.p, c.q)',
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
			'// TreeNode is a node in a binary tree (here: a binary search tree).',
			'type TreeNode struct {',
			'	Val   int',
			'	Left  *TreeNode',
			'	Right *TreeNode',
			'}',
			'',
			'// lowestCommonAncestorBST returns the value of the LCA of p and q.',
			'//',
			'// Why the first divergence is the answer: at any node cur, the BST',
			'// ordering pins down where each target lives. If both p and q are',
			'// less than cur.Val, both nodes sit strictly inside the left',
			'// subtree — cur is a common ancestor, but so is cur.Left’s subtree',
			'// root, so cur cannot be the LOWEST one; descend. Symmetrically',
			'// for greater. The moment the targets straddle cur (one ≤, one ≥),',
			'// any deeper step would abandon one of them: left loses q, right',
			'// loses p. So cur is the deepest node containing both — the LCA.',
			'// Equality is folded into the same stop condition, which is',
			'// exactly the “a node is an ancestor of itself” rule: if',
			'// cur.Val == p, then q is somewhere in cur’s subtree (we only',
			'// descended while BOTH were on the same side), so cur is the LCA.',
			'//',
			'// Iterative on purpose — the walk visits one node per level with',
			'// no backtracking, so a loop expresses it with O(1) space where',
			'// recursion would spend O(h) stack saying the same thing.',
			'func lowestCommonAncestorBST(root *TreeNode, p, q int) int {',
			'	cur := root',
			'	for cur != nil {',
			'		switch {',
			'		case p < cur.Val && q < cur.Val:',
			'			cur = cur.Left // both targets in the left subtree',
			'		case p > cur.Val && q > cur.Val:',
			'			cur = cur.Right // both targets in the right subtree',
			'		default:',
			'			// Split point (p ≤ cur.Val ≤ q or vice versa), or cur',
			'			// IS one of the targets. Either way: the LCA.',
			'			return cur.Val',
			'		}',
			'	}',
			'	// Unreachable: the problem guarantees p and q are present, so',
			'	// the loop always returns before falling off the tree.',
			'	return -1 << 31',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The general-tree way (and why it’s overkill here)</h3>' +
			'<p>In an arbitrary binary tree, LCA needs real machinery: a postorder DFS ' +
			'that reports “found p / found q / found both” up the tree, with the LCA ' +
			'crystallizing at the first node where both sides report a hit — O(n), every ' +
			'node potentially visited, because with no ordering <em>anything</em> could ' +
			'be anywhere. (That harder sibling is LeetCode 236, worth doing after this ' +
			'one.) But this tree is a BST, and the B in BST is a promise: left subtree ' +
			'&lt; node &lt; right subtree, everywhere.</p>' +
			'<h3>Let the invariant steer</h3>' +
			'<p>That promise means a single comparison at any node tells you which ' +
			'subtree each target lives in — no searching. So compare both targets ' +
			'against the current node and act:</p>',
			{ code: 'cur := root\nfor cur != nil {\n\tswitch {\n\tcase p < cur.Val && q < cur.Val:\n\t\tcur = cur.Left // both smaller → LCA is further left\n\tcase p > cur.Val && q > cur.Val:\n\t\tcur = cur.Right // both larger → LCA is further right\n\tdefault:\n\t\treturn cur.Val // straddled (or matched) → this is it\n\t}\n}' },
			'<p>Why the first divergence is provably the LCA: while both targets are on ' +
			'the same side, the current node is a common ancestor but not the ' +
			'<em>lowest</em> — a lower one exists on that shared side. The first time ' +
			'they straddle <code>cur</code>, descending either way would abandon one ' +
			'target, so no deeper common ancestor exists. Equality needs no special ' +
			'case: if <code>cur.Val == p</code>, the other target is still inside ' +
			'<code>cur</code>’s subtree (that’s the only way the descent got here), and ' +
			'“a node is an ancestor of itself” makes <code>cur</code> the answer — the ' +
			'harness case <code>(2, 4) → 2</code> checks exactly this.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Exploit the invariant before reaching for general machinery</strong> ' +
			'— when a problem hands you a BST (or anything sorted), the ordering usually ' +
			'replaces search with steering: an O(n) visit-everything algorithm collapses ' +
			'into one guided O(h) descent with O(1) space, the same way binary search ' +
			'collapses a scan. The trigger is the phrase “binary <em>search</em> tree” ' +
			'itself — if a solution never uses the ordering, something was left on the ' +
			'table. Validate Binary Search Tree and Kth Smallest in a BST in this track ' +
			'are the same lesson (bounds-passing and in-order order, respectively), and ' +
			'Search in Rotated Sorted Array plays the identical game with a bent ' +
			'invariant instead of a tree.</p>',
		],
		complexity: { time: 'O(h)', space: 'O(1)' },
	});
})();
