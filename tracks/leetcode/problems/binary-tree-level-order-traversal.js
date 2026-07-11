/* Binary Tree Level Order Traversal — Trees (Medium). The canonical
 * BFS-on-a-tree problem. The one move that separates it from a plain
 * queue walk: snapshot len(queue) before draining, so the queue's
 * contents split cleanly into "this level" and "the next". Output
 * order is fully determined, so the harness compares the printed
 * fmt.Sprintf("%v", ...) forms directly.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="BFS queue mid-run: the two level-2 nodes are snapshotted as levelSize while their children queue up behind">' +
		// tree — edges under nodes
		'<g stroke="var(--edge)">' +
		'<line x1="80" y1="38" x2="45" y2="98"/><line x1="80" y1="38" x2="120" y2="98"/>' +
		'<line x1="120" y1="98" x2="95" y2="158"/><line x1="120" y1="98" x2="150" y2="158"/>' +
		'</g>' +
		// root already emitted (ok), current level highlighted (accent)
		'<circle cx="80" cy="38" r="14" fill="var(--panel)" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<g fill="var(--panel)" stroke="var(--accent)" stroke-width="2">' +
		'<circle cx="45" cy="98" r="14"/><circle cx="120" cy="98" r="14"/>' +
		'</g>' +
		'<g fill="var(--panel)" stroke="var(--edge)" stroke-width="1.6">' +
		'<circle cx="95" cy="158" r="14"/><circle cx="150" cy="158" r="14"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="80" y="43">3</text><text x="45" y="103">9</text><text x="120" y="103">20</text>' +
		'<text x="95" y="163">15</text><text x="150" y="163">7</text>' +
		'</g>' +
		// queue state at the start of the level-2 round
		'<text x="215" y="20" class="lbl">mid-run: level 2 about to drain</text>' +
		'<text x="215" y="48" class="lbl">queue</text>' +
		'<g fill="none" stroke="var(--accent)" stroke-width="2">' +
		'<rect x="215" y="58" width="36" height="30" rx="4"/><rect x="255" y="58" width="36" height="30" rx="4"/>' +
		'</g>' +
		'<g fill="none" stroke="var(--edge)" stroke-dasharray="4 3">' +
		'<rect x="305" y="58" width="36" height="30" rx="4"/><rect x="345" y="58" width="36" height="30" rx="4"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="233" y="78">9</text><text x="273" y="78">20</text>' +
		'<text x="323" y="78" class="lbl">15</text><text x="363" y="78" class="lbl">7</text>' +
		'</g>' +
		'<text x="305" y="48" class="lbl">children join during the drain</text>' +
		// the levelSize bracket — the heart of the algorithm
		'<path d="M 215 94 L 215 100 L 291 100 L 291 94" fill="none" stroke="var(--accent)" stroke-width="1.5"/>' +
		'<text x="253" y="116" text-anchor="middle" style="fill:var(--accent)">levelSize = 2</text>' +
		'<text x="215" y="142" class="lbl">drain exactly levelSize nodes → one level</text>' +
		'<text x="215" y="162" style="fill:var(--ok)">out = [[3], [9,20]] so far</text>' +
		'<text x="215" y="180" class="lbl">15 and 7 stay queued for round 3</text>' +
		'</svg>';

	LC.problem({
		id: 'binary-tree-level-order-traversal',
		title: 'Binary Tree Level Order Traversal',
		nav: 'Level Order Traversal',
		difficulty: 'Medium',
		category: 'Trees',
		task: 'Implement levelOrder — make all 5 tests pass.',

		prose: [
			'<h2>Binary Tree Level Order Traversal</h2>' +
			'<p>Given the root of a binary tree, return its nodes’ values grouped ' +
			'<em>level by level</em> as a <code>[][]int</code> — one inner slice per ' +
			'level, values left to right.</p>' +
			'<ul><li>An empty tree yields an empty (zero-level) result.</li>' +
			'<li>The order is fully determined — top level first, left to right within a level.</li>' +
			'<li>Tests encode trees in LeetCode level-order form: <code>[3,9,20,null,null,15,7]</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'levelOrder([3,9,20,null,null,15,7])  →  [[3] [9 20] [15 7]]\nlevelOrder([1])                      →  [[1]]\nlevelOrder([])                       →  []', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>A queue visits nodes in exactly the right order — that’s BFS. The ' +
			'missing piece is the level <em>boundaries</em>: children get appended while ' +
			'parents are still being served, so the queue blurs two levels together. ' +
			'The fix is one line: at the top of each round, <code>levelSize := ' +
			'len(queue)</code>. Everything queued <em>right now</em> is exactly one ' +
			'level — drain that many and no more:</p>' +
			DIAGRAM +
			'<p>Each round of the outer loop emits one complete level.</p>',
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
			'// levelOrder returns the tree\'s values grouped level by level,',
			'// top to bottom, left to right within each level.',
			'func levelOrder(root *TreeNode) [][]int {',
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
			'		want [][]int',
			'	}',
			'	cases := []tc{',
			'		{[]any{3, 9, 20, nil, nil, 15, 7}, [][]int{{3}, {9, 20}, {15, 7}}},',
			'		{[]any{1}, [][]int{{1}}},',
			'		{[]any{}, [][]int{}},',
			'		{[]any{1, 2, 3, 4, nil, nil, 5}, [][]int{{1}, {2, 3}, {4, 5}}},',
			'		{[]any{1, nil, 2, nil, 3}, [][]int{{1}, {2}, {3}}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.in),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := levelOrder(treeFromLevel(append([]any(nil), c.in...)))',
			'			// Printed-form equality: [][]int has a deterministic %v',
			'			// rendering, and it treats a nil and an empty outer slice',
			'			// the same ("[]") — either spelling of "no levels" passes.',
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
			'// levelOrder walks the tree breadth-first, emitting one []int per',
			'// level.',
			'//',
			'// The queue always holds a mix of "this level\'s remaining nodes"',
			'// followed by "next level\'s nodes appended so far". Snapshotting',
			'// levelSize := len(queue) BEFORE the inner loop freezes the',
			'// boundary between the two: exactly levelSize dequeues belong to',
			'// the current level, and everything appended during those dequeues',
			'// is, by construction, the next level.',
			'func levelOrder(root *TreeNode) [][]int {',
			'	out := [][]int{} // non-nil so an empty tree renders as [], not a nil slice',
			'	if root == nil {',
			'		return out',
			'	}',
			'	queue := []*TreeNode{root}',
			'	for len(queue) > 0 {',
			'		levelSize := len(queue) // freeze: this many nodes ARE the level',
			'		level := make([]int, 0, levelSize)',
			'		for i := 0; i < levelSize; i++ {',
			'			n := queue[0]',
			'			queue = queue[1:]',
			'			level = append(level, n.Val)',
			'			// Enqueue children for the NEXT round; the inner loop',
			'			// won\'t touch them because its bound was taken above.',
			'			if n.Left != nil {',
			'				queue = append(queue, n.Left)',
			'			}',
			'			if n.Right != nil {',
			'				queue = append(queue, n.Right)',
			'			}',
			'		}',
			'		out = append(out, level)',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>A queue almost does it</h3>' +
			'<p>Plain BFS — pop a node, record it, push its children — already visits ' +
			'nodes in perfect level order. But it produces one flat list; the level ' +
			'<em>boundaries</em> are gone, because children are appended while their ' +
			'parents’ level is still being served. Classic workarounds: push a ' +
			'<code>nil</code> marker between levels (fragile bookkeeping), or run DFS ' +
			'carrying a depth parameter and append into <code>out[depth]</code> (works, ' +
			'but the “level by level” structure becomes implicit).</p>' +
			'<h3>Freeze the boundary with <code>len(queue)</code></h3>' +
			'<p>The queue at the top of a round contains <em>exactly</em> the current ' +
			'level — nothing more, nothing less. So take its length as a snapshot and ' +
			'drain precisely that many:</p>',
			{ code: 'for len(queue) > 0 {\n\tlevelSize := len(queue) // snapshot BEFORE children arrive\n\tlevel := make([]int, 0, levelSize)\n\tfor i := 0; i < levelSize; i++ {\n\t\tn := queue[0]\n\t\tqueue = queue[1:]\n\t\tlevel = append(level, n.Val)\n\t\tif n.Left != nil {\n\t\t\tqueue = append(queue, n.Left)\n\t\t}\n\t\tif n.Right != nil {\n\t\t\tqueue = append(queue, n.Right)\n\t\t}\n\t}\n\tout = append(out, level)\n}' },
			'<p>The load-bearing details:</p>' +
			'<ul>' +
			'<li><strong>Snapshot, don’t re-read.</strong> <code>len(queue)</code> grows ' +
			'during the inner loop as children arrive; looping to a <em>stored</em> ' +
			'<code>levelSize</code> is what keeps the levels separate. Writing ' +
			'<code>i &lt; len(queue)</code> in the loop condition collapses everything ' +
			'back into a blur.</li>' +
			'<li><strong>Skip nil children at enqueue time.</strong> Filtering before ' +
			'the push keeps the invariant “the queue holds only real nodes”, so the ' +
			'snapshot count is meaningful.</li>' +
			'<li><strong>Start from <code>[][]int{}</code>, not nil.</strong> An empty ' +
			'tree should report zero levels; the empty non-nil slice makes that explicit ' +
			'(the harness’s printed-form compare treats both as <code>[]</code>).</li>' +
			'<li><strong>Space is O(w)</strong> — the widest level dominates the queue; ' +
			'for a full bottom level that’s about n/2 nodes, so O(n) worst case.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(w)' },
	});
})();
