/* Same Tree — Trees (Easy). The first tree problem where one recursion
 * carries TWO cursors at once. Everything hinges on the three-way base
 * case — both nil, exactly one nil, values differ — a pattern that
 * returns in symmetric-tree and subtree-of-another-tree. The harness
 * passes two level-order encodings per case.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 180" width="500" height="180" role="img" aria-label="two trees compared in lockstep; a node faces a nil and the comparison fails">' +
		'<text x="40" y="16" class="lbl">p = [1,2]</text>' +
		'<text x="230" y="16" class="lbl">q = [1,null,2]</text>' +
		// edges — drawn first so the panel-filled nodes sit on top
		'<g stroke="var(--edge)">' +
		'<line x1="90" y1="45" x2="55" y2="115"/>' +
		'<line x1="280" y1="45" x2="315" y2="115"/>' +
		'<line x1="280" y1="45" x2="245" y2="115" stroke-dasharray="4 3"/>' +
		'</g>' +
		// nodes
		'<g fill="var(--panel)" stroke="var(--edge)" stroke-width="1.6">' +
		'<circle cx="90" cy="45" r="14"/><circle cx="280" cy="45" r="14"/><circle cx="315" cy="115" r="14"/>' +
		'</g>' +
		// the mismatched pair: a real node on p\'s side, a nil on q\'s
		'<circle cx="55" cy="115" r="14" fill="var(--panel)" stroke="var(--accent)" stroke-width="2"/>' +
		'<circle cx="245" cy="115" r="14" fill="none" stroke="var(--accent)" stroke-width="2" stroke-dasharray="4 3"/>' +
		'<g text-anchor="middle">' +
		'<text x="90" y="50">1</text><text x="55" y="120">2</text>' +
		'<text x="280" y="50">1</text><text x="315" y="120">2</text>' +
		'<text x="245" y="120" class="lbl">nil</text>' +
		'</g>' +
		// lockstep comparisons
		'<line x1="108" y1="45" x2="262" y2="45" stroke="var(--ok)" stroke-width="1.5" stroke-dasharray="4 3"/>' +
		'<text x="185" y="38" text-anchor="middle" style="fill:var(--ok)">1 = 1 ✓</text>' +
		'<line x1="73" y1="115" x2="227" y2="115" stroke="var(--accent)" stroke-width="1.5" stroke-dasharray="4 3"/>' +
		'<text x="150" y="108" text-anchor="middle" style="fill:var(--accent)">node vs nil ✗</text>' +
		// the three-way base case, spelled out
		'<text x="345" y="45" class="lbl">three-way base case:</text>' +
		'<text x="345" y="70" style="fill:var(--ok)">both nil → true</text>' +
		'<text x="345" y="92" style="fill:var(--accent)">one nil → false</text>' +
		'<text x="345" y="114" style="fill:var(--accent)">vals differ → false</text>' +
		'<text x="40" y="165" style="fill:var(--accent)">same values, different shape → false</text>' +
		'</svg>';

	LC.problem({
		id: 'same-tree',
		title: 'Same Tree',
		nav: 'Same Tree',
		difficulty: 'Easy',
		category: 'Trees',
		task: 'Implement isSameTree — make all 6 tests pass.',

		prose: [
			'<h2>Same Tree</h2>' +
			'<p>Given the roots of two binary trees <code>p</code> and <code>q</code>, ' +
			'return <code>true</code> if the trees are <em>identical</em>: the same shape, ' +
			'with equal values at every position.</p>' +
			'<ul><li>Shape counts. Two trees holding the same values in different positions are not the same.</li>' +
			'<li>Two empty trees are the same tree.</li>' +
			'<li>Tests pass <em>two</em> level-order encodings: <code>[1,2]</code> vs <code>[1,null,2]</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'isSameTree([1,2,3], [1,2,3])     →  true\nisSameTree([1,2],   [1,null,2])  →  false  // same values, mirrored shape', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Walk both trees at once — one recursion holding two cursors. At each ' +
			'step there are exactly three ways to stop: <em>both</em> cursors are nil ' +
			'(matching absence — that’s a match), exactly <em>one</em> is nil (the shapes ' +
			'diverged), or the values differ. Only if none of those fire do we recurse, ' +
			'left-with-left and right-with-right:</p>' +
			DIAGRAM +
			'<p>The <code>[1,2]</code> vs <code>[1,null,2]</code> pair is the classic trap: ' +
			'identical values, but the 2 hangs off different sides.</p>',
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
			'// isSameTree reports whether the trees rooted at p and q are',
			'// structurally identical with equal values at every position.',
			'func isSameTree(p *TreeNode, q *TreeNode) bool {',
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
			'		p    []any',
			'		q    []any',
			'		want bool',
			'	}',
			'	cases := []tc{',
			'		{[]any{1, 2, 3}, []any{1, 2, 3}, true},',
			'		{[]any{1, 2}, []any{1, nil, 2}, false},',
			'		{[]any{1, 2, 1}, []any{1, 1, 2}, false},',
			'		{[]any{}, []any{}, true},',
			'		{[]any{}, []any{1}, false},',
			'		{[]any{10, 5, 15, 3, 7, 12, 18}, []any{10, 5, 15, 3, 7, 12, 18}, true},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("p=%v, q=%v", c.p, c.q),',
			'			"want":  fmt.Sprintf("%t", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := isSameTree(',
			'				treeFromLevel(append([]any(nil), c.p...)),',
			'				treeFromLevel(append([]any(nil), c.q...)),',
			'			)',
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
			'// isSameTree walks both trees in lockstep — one recursion, two',
			'// cursors that always sit at the same position in their trees.',
			'//',
			'// The base cases must run in this order:',
			'//  1. both nil        → true  (matching absence IS a match)',
			'//  2. exactly one nil → false (shape mismatch — this is what',
			'//     catches [1,2] vs [1,null,2], where the values alone agree)',
			'//  3. values differ   → false',
			'// Checking both-nil before one-nil means case 2 can safely be the',
			'// simple || test, and after both cases every dereference is safe.',
			'func isSameTree(p *TreeNode, q *TreeNode) bool {',
			'	if p == nil && q == nil {',
			'		return true',
			'	}',
			'	if p == nil || q == nil {',
			'		return false // one side ended where the other kept going',
			'	}',
			'	if p.Val != q.Val {',
			'		return false',
			'	}',
			'	// && short-circuits: the first mismatch anywhere in the left',
			'	// subtrees stops the walk before the right subtrees are touched.',
			'	return isSameTree(p.Left, q.Left) && isSameTree(p.Right, q.Right)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why not just compare serializations?</h3>' +
			'<p>A tempting shortcut: flatten both trees to slices and compare those. ' +
			'But a plain preorder walk of <code>[1,2]</code> and <code>[1,null,2]</code> ' +
			'produces the same <code>[1, 2]</code> for both — without explicit nil markers ' +
			'the <em>shape</em> is lost, and that pair is precisely the trap. It also ' +
			'builds two full slices before comparing byte one.</p>' +
			'<h3>One recursion, two cursors</h3>' +
			'<p>The definition of “same tree” is already recursive: equal root values, ' +
			'same left subtrees, same right subtrees. So walk both trees together and ' +
			'let three base cases do all the thinking:</p>',
			{ code: 'if p == nil && q == nil {\n\treturn true // matching absence is a match\n}\nif p == nil || q == nil {\n\treturn false // shapes diverged\n}\nif p.Val != q.Val {\n\treturn false\n}\nreturn isSameTree(p.Left, q.Left) && isSameTree(p.Right, q.Right)' },
			'<p>The details that matter:</p>' +
			'<ul>' +
			'<li><strong>Base-case order.</strong> Both-nil must be tested before one-nil; ' +
			'flip them and every pair of empty subtrees reports “different”. After the two ' +
			'nil checks, dereferencing both nodes is provably safe.</li>' +
			'<li><strong>Nil-vs-node is the shape check.</strong> No separate structure ' +
			'comparison exists — the one-nil case <em>is</em> it, caught the moment the ' +
			'trees diverge.</li>' +
			'<li><strong>Short-circuit early exit.</strong> The <code>&amp;&amp;</code> stops ' +
			'at the first mismatch, so the walk visits at most the nodes of the smaller ' +
			'tree: O(min(m, n)) time, O(h) stack.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(min(m, n))', space: 'O(h)' },
	});
})();
