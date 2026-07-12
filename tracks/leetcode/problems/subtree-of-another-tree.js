/* Subtree of Another Tree — Trees (Easy). Composition of two classic
 * recursions: a Same Tree equality predicate, tried at every node of the
 * host tree by an outer DFS. The trap case (matching values, extra child)
 * kills any "contains the same values" shortcut.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// Left: the match — the subtree rooted at 4 is structurally identical
	// to subRoot. Right: the trap — same values, but a stray child under 2.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 220" width="500" height="220" role="img" aria-label="subtree match versus the extra-child trap">' +
		'<text x="20" y="16" class="lbl">match: subtree at 4 ≡ subRoot</text>' +
		'<text x="300" y="16" class="lbl">trap: extra child under 2 → NOT a subtree</text>' +
		// left tree [3,4,5,1,2] with subtree at 4 highlighted
		'<g stroke="var(--edge)">' +
		'<line x1="120" y1="46" x2="75" y2="72"/><line x1="120" y1="46" x2="165" y2="72"/>' +
		'</g>' +
		'<g stroke="var(--ok)" stroke-width="2">' +
		'<line x1="75" y1="100" x2="45" y2="128"/><line x1="75" y1="100" x2="105" y2="128"/>' +
		'</g>' +
		'<g fill="var(--panel)">' +
		'<circle cx="120" cy="34" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="75" cy="86" r="14" stroke="var(--ok)" stroke-width="2.2"/>' +
		'<circle cx="165" cy="86" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="45" cy="142" r="14" stroke="var(--ok)" stroke-width="2"/>' +
		'<circle cx="105" cy="142" r="14" stroke="var(--ok)" stroke-width="2"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="120" y="39">3</text><text x="75" y="91">4</text><text x="165" y="91">5</text>' +
		'<text x="45" y="147">1</text><text x="105" y="147">2</text>' +
		'</g>' +
		'<text x="75" y="188" text-anchor="middle" style="fill:var(--ok)">isSameTree here ✓</text>' +
		// right tree [3,4,5,1,2,null,null,null,null,0] — the trap
		'<g stroke="var(--edge)">' +
		'<line x1="380" y1="46" x2="335" y2="72"/><line x1="380" y1="46" x2="425" y2="72"/>' +
		'<line x1="335" y1="100" x2="305" y2="128"/><line x1="335" y1="100" x2="365" y2="128"/>' +
		'</g>' +
		'<g stroke="var(--err-edge)" stroke-width="2">' +
		'<line x1="365" y1="156" x2="345" y2="184"/>' +
		'</g>' +
		'<g fill="var(--panel)">' +
		'<circle cx="380" cy="34" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="335" cy="86" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="425" cy="86" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="305" cy="142" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="365" cy="142" r="14" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="345" cy="198" r="14" stroke="var(--err-edge)" stroke-width="2"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="380" y="39">3</text><text x="335" y="91">4</text><text x="425" y="91">5</text>' +
		'<text x="305" y="147">1</text><text x="365" y="147">2</text>' +
		'<text x="345" y="203">0</text>' +
		'</g>' +
		'<text x="440" y="188" text-anchor="middle" class="lbl">values match,</text>' +
		'<text x="440" y="204" text-anchor="middle" class="lbl">shape doesn’t</text>' +
		'</svg>';

	LC.problem({
		id: 'subtree-of-another-tree',
		title: 'Subtree of Another Tree',
		nav: 'Subtree of Another Tree',
		difficulty: 'Easy',
		category: 'Trees',
		task: 'Implement isSubtree — make all 5 tests pass.',

		prose: [
			'<h2>Subtree of Another Tree</h2>' +
			'<p>Given the roots of two binary trees <code>root</code> and ' +
			'<code>subRoot</code>, return <code>true</code> if some node of ' +
			'<code>root</code> heads a subtree <em>identical</em> to <code>subRoot</code> ' +
			'— same structure <strong>and</strong> same values, all the way down.</p>' +
			'<ul><li>A subtree of <code>root</code> is a node plus <em>all</em> of its ' +
			'descendants — you can’t stop early or skip children.</li>' +
			'<li>A tree counts as a subtree of itself.</li>' +
			'<li>Tests encode trees in LeetCode level-order form: <code>[3,4,5,1,2]</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'isSubtree([3,4,5,1,2], [4,1,2])                       →  true\nisSubtree([3,4,5,1,2,null,null,null,null,0], [4,1,2])  →  false  // extra 0 under the 2', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Split the problem in two: an equality predicate (“are these two trees ' +
			'identical?” — that’s exactly Same Tree) and a search that tries the ' +
			'predicate anchored at every node of <code>root</code>:</p>' +
			DIAGRAM +
			'<p>The trap on the right is why value-collecting shortcuts fail: identical ' +
			'means identical <em>shape</em>, not just the same multiset of values.</p>',
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
			'// isSubtree reports whether some node of root heads a subtree that',
			'// is IDENTICAL to subRoot — same structure and same values all the',
			'// way down (a node plus all of its descendants; a tree is a',
			'// subtree of itself).',
			'//',
			'// Hint: write an isSameTree(a, b) helper first, then search root',
			'// for a node where it holds.',
			'func isSubtree(root, subRoot *TreeNode) bool {',
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
			'		root []any',
			'		sub  []any',
			'		want bool',
			'	}',
			'	cases := []tc{',
			'		{[]any{3, 4, 5, 1, 2}, []any{4, 1, 2}, true},',
			'		// The classic trap: node 2 has an extra child 0, so the',
			'		// subtree at 4 contains the right VALUES but the wrong SHAPE.',
			'		{[]any{3, 4, 5, 1, 2, nil, nil, nil, nil, 0}, []any{4, 1, 2}, false},',
			'		{[]any{1, 2, 3}, []any{1, 2, 3}, true},',
			'		{[]any{3, 4, 5, 1, 2}, []any{2}, true},',
			'		{[]any{1, 2}, []any{1, 2, 3}, false},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("root=%v subRoot=%v", c.root, c.sub),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := isSubtree(',
			'				treeFromLevel(append([]any(nil), c.root...)),',
			'				treeFromLevel(append([]any(nil), c.sub...)),',
			'			)',
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
			'// TreeNode is a node in a binary tree.',
			'type TreeNode struct {',
			'	Val   int',
			'	Left  *TreeNode',
			'	Right *TreeNode',
			'}',
			'',
			'// isSameTree reports whether a and b are structurally identical',
			'// with equal values — the reusable predicate this problem composes.',
			'//',
			'// The base case does double duty: if either side is nil, they are',
			'// the same tree only when BOTH are nil. That single line is what',
			'// rejects the extra-child trap — a stray node on one side meets a',
			'// nil on the other and the comparison collapses to false.',
			'func isSameTree(a, b *TreeNode) bool {',
			'	if a == nil || b == nil {',
			'		return a == b // same only if both ran out together',
			'	}',
			'	return a.Val == b.Val &&',
			'		isSameTree(a.Left, b.Left) &&',
			'		isSameTree(a.Right, b.Right)',
			'}',
			'',
			'// isSubtree anchors the equality predicate at every node of root.',
			'//',
			'// Outer recursion = the search (which anchor to try); inner',
			'// recursion = the check (does subRoot match here?). Keeping them',
			'// separate keeps each one trivial — fusing them into a single',
			'// recursion is a well-known source of subtle bugs, because “still',
			'// searching” and “mid-comparison” need different rules at a',
			'// value mismatch (the search may continue, the comparison must fail).',
			'func isSubtree(root, subRoot *TreeNode) bool {',
			'	if root == nil {',
			'		// Ran out of anchors. (An empty subRoot would match an',
			'		// empty tree, hence the equality rather than plain false.)',
			'		return subRoot == nil',
			'	}',
			'	if isSameTree(root, subRoot) {',
			'		return true // match anchored at this node',
			'	}',
			'	// Otherwise the match, if any, is anchored strictly below.',
			'	return isSubtree(root.Left, subRoot) || isSubtree(root.Right, subRoot)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What “subtree” really demands</h3>' +
			'<p>The tempting shortcut — collect the values under each candidate node and ' +
			'compare — dies on the trap case: <code>[3,4,5,1,2,null,null,null,null,0]</code> ' +
			'contains a node 4 whose subtree has values {4,1,2,0}… and even trimmed ' +
			'clever ways of comparing value sets can’t distinguish an extra child from a ' +
			'rearranged one. Identical means identical <em>shape</em>: every node, every ' +
			'nil, in the same places.</p>' +
			'<h3>Compose two tiny recursions</h3>' +
			'<p>Shape-and-value equality of two trees is its own classic (Same Tree), and ' +
			'it makes a perfect reusable predicate. The rest is a plain DFS that tries ' +
			'the predicate anchored at every node of the host tree:</p>',
			{ code: 'func isSameTree(a, b *TreeNode) bool {\n\tif a == nil || b == nil {\n\t\treturn a == b // both nil, or shape mismatch\n\t}\n\treturn a.Val == b.Val &&\n\t\tisSameTree(a.Left, b.Left) &&\n\t\tisSameTree(a.Right, b.Right)\n}\n\nfunc isSubtree(root, subRoot *TreeNode) bool {\n\tif root == nil {\n\t\treturn subRoot == nil\n\t}\n\tif isSameTree(root, subRoot) {\n\t\treturn true\n\t}\n\treturn isSubtree(root.Left, subRoot) || isSubtree(root.Right, subRoot)\n}' },
			'<p>Worst case, the predicate runs at each of the n host nodes and each run ' +
			'costs up to O(m) — O(n·m) total, though most anchors fail on the first ' +
			'value comparison in practice. Two known upgrades if that ever matters: ' +
			'<strong>serialize both trees</strong> (preorder, with explicit nil markers ' +
			'and value delimiters — both essential, or "12" and "1,2" collide) and run a ' +
			'linear substring search, or <strong>hash every subtree</strong> bottom-up ' +
			'(Merkle-tree style) so candidate anchors are filtered by hash in O(1). Both ' +
			'reach roughly O(n + m); neither is worth the code here.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Tree equality as a reusable predicate, composed under a search</strong> ' +
			'— when a problem asks “does structure X appear anywhere inside Y?”, don’t ' +
			'write one tangled recursion; write the exact-match check as its own ' +
			'function and drive it from a DFS over candidate anchors. The trigger is any ' +
			'“identical / mirror / matching subtree” phrasing; the cost is (anchors × ' +
			'check), here O(n·m). Same Tree in this track is literally the inner loop of ' +
			'this problem; Invert Binary Tree and Balanced Binary Tree use the same ' +
			'one-simple-rule-per-node recursion shape, and Symmetric Tree is the ' +
			'predicate again with left/right swapped.</p>',
		],
		complexity: { time: 'O(n · m)', space: 'O(h)' },
	});
})();
