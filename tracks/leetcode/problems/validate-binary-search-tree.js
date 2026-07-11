/* Validate Binary Search Tree — Trees (Medium). The classic "a local
 * check is not enough" problem: every parent-child pair can look fine
 * while a deep node still violates a bound set generations up. The fix
 * — thread an open (lower, upper) window down the recursion — uses
 * *int bounds with nil meaning "unbounded", sidestepping math.MinInt
 * sentinels that a node could legitimately hold.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="the tree 5,4,6,null,null,3,7: every edge passes a local check but node 3 falls outside its inherited window (5, 6)">' +
		// edges — under the nodes
		'<g stroke="var(--edge)">' +
		'<line x1="150" y1="35" x2="90" y2="95"/><line x1="150" y1="35" x2="210" y2="95"/>' +
		'<line x1="210" y1="95" x2="170" y2="160"/><line x1="210" y1="95" x2="250" y2="160"/>' +
		'</g>' +
		// nodes — 3 is the violator
		'<g fill="var(--panel)" stroke="var(--edge)" stroke-width="1.6">' +
		'<circle cx="150" cy="35" r="14"/><circle cx="90" cy="95" r="14"/><circle cx="210" cy="95" r="14"/>' +
		'<circle cx="250" cy="160" r="14"/>' +
		'</g>' +
		'<circle cx="170" cy="160" r="14" fill="var(--panel)" stroke="var(--accent)" stroke-width="2"/>' +
		'<g text-anchor="middle">' +
		'<text x="150" y="40">5</text><text x="90" y="100">4</text><text x="210" y="100">6</text>' +
		'<text x="170" y="165">3</text><text x="250" y="165">7</text>' +
		'</g>' +
		// per-edge local checks — all green, that is the trap
		'<g style="fill:var(--ok)">' +
		'<text x="76" y="60">4 &lt; 5 ✓</text><text x="196" y="60">6 &gt; 5 ✓</text>' +
		'<text x="108" y="130">3 &lt; 6 ✓</text><text x="248" y="130">7 &gt; 6 ✓</text>' +
		'</g>' +
		// inherited windows
		'<text x="172" y="24" class="lbl">(−∞, +∞)</text>' +
		'<text x="18" y="99" class="lbl">(−∞, 5)</text>' +
		'<text x="232" y="88" class="lbl">(5, +∞)</text>' +
		'<text x="96" y="168" style="fill:var(--accent)">(5, 6)</text>' +
		'<text x="272" y="164" class="lbl">(6, +∞)</text>' +
		'<text x="130" y="192" style="fill:var(--accent)">3 ∉ (5, 6) ✗</text>' +
		// side panel: the lesson
		'<text x="340" y="40" class="lbl">every parent–child edge</text>' +
		'<text x="340" y="58" class="lbl">passes its local check…</text>' +
		'<text x="340" y="90" style="fill:var(--accent)">but 3 is inside 5’s right</text>' +
		'<text x="340" y="108" style="fill:var(--accent)">subtree → needs 3 &gt; 5 ✗</text>' +
		'<text x="340" y="146" class="lbl">the fix — pass a window:</text>' +
		'<text x="340" y="164" class="lbl">go left → upper = node</text>' +
		'<text x="340" y="182" class="lbl">go right → lower = node</text>' +
		'</svg>';

	LC.problem({
		id: 'validate-binary-search-tree',
		title: 'Validate Binary Search Tree',
		nav: 'Validate BST',
		difficulty: 'Medium',
		category: 'Trees',
		task: 'Implement isValidBST — make all 6 tests pass.',

		prose: [
			'<h2>Validate Binary Search Tree</h2>' +
			'<p>Given the root of a binary tree, return <code>true</code> if it is a ' +
			'valid <em>binary search tree</em>: at every node, all values in the left ' +
			'subtree are <em>strictly less</em> than the node and all values in the ' +
			'right subtree are <em>strictly greater</em>.</p>' +
			'<ul><li>Strict means duplicates are invalid: <code>[2,2,2]</code> is not a BST.</li>' +
			'<li>The constraint covers the <strong>entire</strong> subtree, not just the immediate children.</li>' +
			'<li>An empty tree is a valid BST.</li>' +
			'<li>Tests encode trees in LeetCode level-order form: <code>[5,4,6,null,null,3,7]</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'isValidBST([2,1,3])                →  true\nisValidBST([5,4,6,null,null,3,7])  →  false  // 3 is in 5\'s right subtree\nisValidBST([2,2,2])                →  false  // strict: duplicates fail', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>The tempting check — “is each left child smaller and each right child ' +
			'bigger than its parent?” — is <em>not</em> the BST property. In ' +
			'<code>[5,4,6,null,null,3,7]</code> every edge passes it, yet 3 sits in the ' +
			'root’s <em>right</em> subtree while being smaller than 5. What a node ' +
			'really inherits is an open window <code>(lower, upper)</code> built from ' +
			'<em>all</em> its ancestors: turning left caps the window at the node’s ' +
			'value, turning right raises the floor:</p>' +
			DIAGRAM +
			'<p>The bounds here are pointers with <code>nil</code> meaning “unbounded” — ' +
			'no <code>math.MinInt</code> sentinels that real data could collide with.</p>',
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
			'// isValidBST reports whether the tree is a strict binary search',
			'// tree: at every node, ALL values in the left subtree are less than',
			'// the node\'s value and ALL values in the right subtree are greater.',
			'func isValidBST(root *TreeNode) bool {',
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
			'		{[]any{2, 1, 3}, true},',
			'		{[]any{5, 1, 4, nil, nil, 3, 6}, false},',
			'		{[]any{5, 4, 6, nil, nil, 3, 7}, false},',
			'		{[]any{2, 2, 2}, false},',
			'		{[]any{8, 3, 10, 1, 6, nil, 14, nil, nil, 4, 7, 13}, true},',
			'		{[]any{}, true},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.in),',
			'			"want":  fmt.Sprintf("%t", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := isValidBST(treeFromLevel(append([]any(nil), c.in...)))',
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
			'// isValidBST reports whether the tree is a strict BST. The real work',
			'// is in inWindow; the root starts unbounded on both sides.',
			'func isValidBST(root *TreeNode) bool {',
			'	return inWindow(root, nil, nil)',
			'}',
			'',
			'// inWindow checks that every value in n\'s subtree lies strictly',
			'// inside the open interval (lower, upper).',
			'//',
			'// The bounds are *int with nil meaning "unbounded" — deliberately',
			'// NOT math.MinInt/MaxInt sentinels. Sentinels are values a node',
			'// could legitimately hold: a tree containing math.MinInt would be',
			'// judged against its own data. A nil pointer says "no bound yet"',
			'// with no such collision, and it makes the initial call read',
			'// honestly: inWindow(root, nil, nil) — no constraints inherited.',
			'//',
			'// Why a window at all? A node\'s constraint comes from EVERY',
			'// ancestor, not just its parent: turning right past 5 promises',
			'// "everything below is > 5" for the whole subtree. The window is',
			'// that promise, narrowed one side per edge on the way down.',
			'func inWindow(n *TreeNode, lower, upper *int) bool {',
			'	if n == nil {',
			'		return true // an empty subtree can\'t violate anything',
			'	}',
			'	// <= and >= make the check strict: equality is a violation,',
			'	// which is exactly what rejects duplicate values like [2,2,2].',
			'	if lower != nil && n.Val <= *lower {',
			'		return false // at or below the floor set by a right-turn ancestor',
			'	}',
			'	if upper != nil && n.Val >= *upper {',
			'		return false // at or above the cap set by a left-turn ancestor',
			'	}',
			'	// Each recursive call narrows exactly one side of the window:',
			'	// going left, this node becomes the cap; going right, the floor.',
			'	return inWindow(n.Left, lower, &n.Val) && inWindow(n.Right, &n.Val, upper)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The local-check trap</h3>' +
			'<p>The instinctive test — <code>Left.Val &lt; Val &amp;&amp; Right.Val &gt; ' +
			'Val</code> at each node — accepts <code>[5,4,6,null,null,3,7]</code>: ' +
			'4&nbsp;&lt;&nbsp;5, 6&nbsp;&gt;&nbsp;5, 3&nbsp;&lt;&nbsp;6, 7&nbsp;&gt;&nbsp;6, ' +
			'every edge fine. But 3 lives in the root’s <em>right</em> subtree, where the ' +
			'BST property demands everything exceed 5. The property is about whole ' +
			'subtrees; a parent-child comparison only ever sees one edge of it.</p>' +
			'<h3>Inherit a window, narrow it per edge</h3>' +
			'<p>Track what the ancestors have promised. Each node must lie strictly ' +
			'inside an open interval <code>(lower, upper)</code>; stepping to a left ' +
			'child caps the interval at this node’s value, stepping right raises the ' +
			'floor. A violation deep in the tree is then caught by the bound its ' +
			'far-away ancestor installed:</p>',
			{ code: 'if lower != nil && n.Val <= *lower {\n\treturn false // floor from a right-turn ancestor\n}\nif upper != nil && n.Val >= *upper {\n\treturn false // cap from a left-turn ancestor\n}\nreturn inWindow(n.Left, lower, &n.Val) && // going left: cap tightens\n\tinWindow(n.Right, &n.Val, upper) // going right: floor rises' },
			'<p>The choices worth defending:</p>' +
			'<ul>' +
			'<li><strong><code>*int</code> bounds, nil = unbounded.</strong> The usual ' +
			'shortcut seeds the window with <code>math.MinInt</code>/<code>MaxInt</code> — ' +
			'but those are values a node may legitimately hold, and with strict ' +
			'comparisons a real <code>MinInt</code> node would be falsely rejected. ' +
			'Nil pointers encode “no bound” without stealing any value from the domain.</li>' +
			'<li><strong>Strict <code>&lt;=</code> / <code>&gt;=</code> rejections.</strong> ' +
			'Equality with a bound is a violation, which is precisely how ' +
			'<code>[2,2,2]</code> fails — the middle 2 equals the floor its parent set.</li>' +
			'<li><strong>Each edge narrows exactly one side</strong> — the other bound ' +
			'passes through untouched, so the root’s promise survives all the way down ' +
			'to the node that breaks it.</li>' +
			'<li><strong>Alternative:</strong> an in-order traversal of a BST is strictly ' +
			'increasing; walking it while remembering the previous value also works in ' +
			'O(n). The window version generalizes better (it’s the same shape as ' +
			'range-constrained tree problems) and never needs the “first node” special ' +
			'case.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(h)' },
	});
})();
