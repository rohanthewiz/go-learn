/* Balanced Binary Tree — Trees (Easy). Height-balance check, and the
 * track's showcase for bottom-up tree recursion: each subtree reports
 * its height UP the tree, with -1 as an "already unbalanced" sentinel
 * so the walk bails early. The contrast is the O(n²) top-down trap of
 * re-measuring heights at every node.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="a lopsided tree with per-node heights computed bottom-up; the root sees a skew of two">' +
		'<text x="20" y="16" class="lbl">heights reported bottom-up</text>' +
		// edges — under the nodes
		'<g stroke="var(--edge)">' +
		'<line x1="145" y1="36" x2="90" y2="84"/><line x1="145" y1="36" x2="200" y2="84"/>' +
		'<line x1="90" y1="84" x2="60" y2="132"/><line x1="90" y1="84" x2="120" y2="132"/>' +
		'<line x1="60" y1="132" x2="40" y2="178"/><line x1="60" y1="132" x2="85" y2="178"/>' +
		'</g>' +
		// nodes — root highlighted: that is where the skew becomes visible
		'<circle cx="145" cy="36" r="14" fill="var(--panel)" stroke="var(--accent)" stroke-width="2"/>' +
		'<g fill="var(--panel)" stroke="var(--edge)" stroke-width="1.6">' +
		'<circle cx="90" cy="84" r="14"/><circle cx="200" cy="84" r="14"/>' +
		'<circle cx="60" cy="132" r="14"/><circle cx="120" cy="132" r="14"/>' +
		'<circle cx="40" cy="178" r="13"/><circle cx="85" cy="178" r="13"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="145" y="41">1</text><text x="90" y="89">2</text><text x="200" y="89">2</text>' +
		'<text x="60" y="137">3</text><text x="120" y="137">3</text>' +
		'<text x="40" y="183">4</text><text x="85" y="183">4</text>' +
		'</g>' +
		// per-node heights, exactly what each recursive call returns
		'<g style="fill:var(--ok)">' +
		'<text x="8" y="182">h=1</text><text x="106" y="182">h=1</text>' +
		'<text x="18" y="136">h=2</text><text x="142" y="136">h=1</text>' +
		'<text x="48" y="80">h=3</text><text x="222" y="88">h=1</text>' +
		'</g>' +
		// the bottom-up contract
		'<text x="290" y="50" class="lbl">post-order: children report</text>' +
		'<text x="290" y="68" class="lbl">their height up the tree</text>' +
		'<text x="290" y="100" style="fill:var(--ok)">balanced subtree → its height</text>' +
		'<text x="290" y="122" style="fill:var(--accent)">unbalanced anywhere → −1</text>' +
		'<text x="290" y="158" style="fill:var(--accent)">root: left h=3, right h=1</text>' +
		'<text x="290" y="178" style="fill:var(--accent)">skew 2 → −1 → false</text>' +
		'</svg>';

	LC.problem({
		id: 'balanced-binary-tree',
		title: 'Balanced Binary Tree',
		nav: 'Balanced Binary Tree',
		difficulty: 'Easy',
		category: 'Trees',
		task: 'Implement isBalanced — make all 5 tests pass.',

		prose: [
			'<h2>Balanced Binary Tree</h2>' +
			'<p>Given the root of a binary tree, return <code>true</code> if it is ' +
			'<em>height-balanced</em>: at <strong>every</strong> node, the heights of the ' +
			'left and right subtrees differ by at most 1.</p>' +
			'<ul><li>The condition must hold at every node, not just the root.</li>' +
			'<li>An empty tree is balanced; its height is 0.</li>' +
			'<li>Tests encode trees in LeetCode level-order form: <code>[3,9,20,null,null,15,7]</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'isBalanced([3,9,20,null,null,15,7])    →  true\nisBalanced([1,2,2,3,3,null,null,4,4])  →  false  // left arm is 2 deeper\nisBalanced([])                         →  true', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Balance is defined in terms of heights, so compute heights — but ' +
			'<em>bottom-up</em>, in one pass. Each call returns its subtree’s height, ' +
			'unless anything below is already unbalanced: then it returns the sentinel ' +
			'<code>−1</code>, which every ancestor passes straight up without measuring ' +
			'another node:</p>' +
			DIAGRAM +
			'<p>One post-order walk answers both questions — “how tall?” and “still ' +
			'balanced?” — at once.</p>',
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
			'// isBalanced reports whether the tree is height-balanced: at every',
			'// node, the left and right subtree heights differ by at most 1.',
			'func isBalanced(root *TreeNode) bool {',
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
			LC.TREE_HELPERS,
			'',
			'func main() {',
			'	type tc struct {',
			'		in   []any',
			'		want bool',
			'	}',
			'	cases := []tc{',
			'		{[]any{3, 9, 20, nil, nil, 15, 7}, true},',
			'		{[]any{1, 2, 2, 3, 3, nil, nil, 4, 4}, false},',
			'		{[]any{}, true},',
			'		{[]any{1}, true},',
			'		{[]any{1, 2, nil, 3}, false},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.in),',
			'			"want":  fmt.Sprintf("%t", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := isBalanced(treeFromLevel(append([]any(nil), c.in...)))',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%t", got)',
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
			'// isBalanced reports whether every node\'s subtree heights differ by',
			'// at most 1. All the work happens in heightOrBail; -1 doubles as',
			'// "unbalanced" because a real height is never negative.',
			'func isBalanced(root *TreeNode) bool {',
			'	return heightOrBail(root) != -1',
			'}',
			'',
			'// heightOrBail returns the height of the subtree at n, or -1 the',
			'// moment any subtree turns out to be unbalanced.',
			'//',
			'// Bottom-up (post-order) is the whole trick: children report their',
			'// heights UP, so each node\'s height is computed exactly once. The',
			'// naive top-down version — "measure both children, compare, recurse"',
			'// — re-walks entire subtrees at every level and degrades to O(n²)',
			'// on a skewed tree. Folding the balance check into the height',
			'// computation keeps it one O(n) pass, and the -1 sentinel lets the',
			'// first violation short-circuit all remaining measurement.',
			'func heightOrBail(n *TreeNode) int {',
			'	if n == nil {',
			'		return 0 // empty subtree: height 0, trivially balanced',
			'	}',
			'	left := heightOrBail(n.Left)',
			'	if left == -1 {',
			'		return -1 // already lost — skip measuring the right side',
			'	}',
			'	right := heightOrBail(n.Right)',
			'	if right == -1 {',
			'		return -1',
			'	}',
			'	// |left - right| > 1 without math.Abs: two int comparisons.',
			'	if left-right > 1 || right-left > 1 {',
			'		return -1 // this node is the tipping point',
			'	}',
			'	// Balanced here: report the height. Explicit comparison rather',
			'	// than the max builtin — the playground interpreter predates it.',
			'	if left > right {',
			'		return 1 + left',
			'	}',
			'	return 1 + right',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The O(n²) trap: top-down</h3>' +
			'<p>The definition translates directly into code: at each node compute ' +
			'<code>height(Left)</code> and <code>height(Right)</code>, compare, then ' +
			'recurse into both children and ask the same question again. Correct — but ' +
			'<code>height()</code> itself walks the whole subtree, and then the ' +
			'recursion walks it <em>again</em> to check the nodes inside it. Every node ' +
			'gets re-measured once per ancestor; on a degenerate chain that’s O(n²).</p>' +
			'<h3>Measure once, from the bottom</h3>' +
			'<p>Flip the direction. A post-order walk already visits children before ' +
			'their parent, so let each call <em>return</em> its height and let the parent ' +
			'combine two already-computed numbers. Balance rides along on a sentinel: ' +
			'<code>−1</code> means “somewhere below me is unbalanced”:</p>',
			{ code: 'left := heightOrBail(n.Left)\nif left == -1 {\n\treturn -1 // verdict is in — stop measuring\n}\nright := heightOrBail(n.Right)\nif right == -1 {\n\treturn -1\n}\nif left-right > 1 || right-left > 1 {\n\treturn -1 // this node is the tipping point\n}' },
			'<p>What makes the sentinel clean:</p>' +
			'<ul>' +
			'<li><strong>−1 can’t collide with data.</strong> Real heights are ≥ 0 ' +
			'(nil is 0, a leaf is 1), so −1 is unambiguous — one return value carries ' +
			'both the height and the verdict, no extra bool plumbing.</li>' +
			'<li><strong>Check the left child’s answer before measuring the right.</strong> ' +
			'Once any subtree reports −1 the final answer is fixed; the early returns ' +
			'skip every remaining node.</li>' +
			'<li><strong>The skew test needs the abs of a difference</strong> — ' +
			'<code>left−right &gt; 1 || right−left &gt; 1</code> does it with two int ' +
			'comparisons, no float conversion for <code>math.Abs</code>.</li>' +
			'<li><strong>Still O(h) space:</strong> the only storage is the recursion ' +
			'stack, one frame per level.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(h)' },
	});
})();
