/* Redundant Connection — Graphs (Medium). The track's introduction to
 * union-find (disjoint sets): n nodes and n edges means a tree plus exactly
 * one extra edge, and processing edges in order, the first edge whose two
 * endpoints are ALREADY in the same set is the one to remove — which is also
 * the last valid answer in input order, as the problem requires.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 210" width="500" height="210" role="img" aria-label="union-find parent pointers detecting the edge that closes a cycle">' +
		'<text x="20" y="16" class="lbl">edges [1,2] [2,3] [3,4] unioned · node 5 still alone · now edge [1,4] arrives</text>' +
		// root node 1
		'<circle cx="110" cy="62" r="15" fill="var(--panel)" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="110" y="67" text-anchor="middle">1</text>' +
		'<text x="110" y="36" text-anchor="middle" class="lbl">root (parent[1] = 1)</text>' +
		// children 2, 3, 4 with parent pointers up to 1
		'<circle cx="50" cy="140" r="15" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="50" y="145" text-anchor="middle">2</text>' +
		'<circle cx="110" cy="140" r="15" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="110" y="145" text-anchor="middle">3</text>' +
		'<circle cx="170" cy="140" r="15" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="170" y="145" text-anchor="middle">4</text>' +
		'<g fill="none" stroke="var(--accent)" stroke-width="1.5">' +
		'<path d="M 56 127 L 100 74" marker-end="url(#dgArrowRC)"/>' +
		'<path d="M 110 125 L 110 79" marker-end="url(#dgArrowRC)"/>' +
		'<path d="M 164 127 L 120 74" marker-end="url(#dgArrowRC)"/>' +
		'</g>' +
		'<text x="150" y="105" class="lbl">parent pointers</text>' +
		// lone node 5
		'<circle cx="240" cy="140" r="15" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'<text x="240" y="145" text-anchor="middle" class="lbl">5</text>' +
		'<text x="240" y="176" text-anchor="middle" class="lbl">own set</text>' +
		// the offending edge 1-4, dashed err
		'<path d="M 122 74 C 160 100 176 112 174 124" fill="none" stroke="var(--err-edge)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<text x="20" y="196" class="lbl">edge [1,4]: find(1) = 1 and find(4) = 1 — same root, so 1 and 4 are already connected</text>' +
		// verdict
		'<text x="310" y="70" style="fill:var(--err-edge)">union(1, 4) refused:</text>' +
		'<text x="310" y="88" style="fill:var(--err-edge)">[1,4] closes a cycle</text>' +
		'<text x="310" y="116" class="lbl">every earlier edge joined two</text>' +
		'<text x="310" y="132" class="lbl">different sets; this is the first</text>' +
		'<text x="310" y="148" class="lbl">(and only) one that does not</text>' +
		'<defs><marker id="dgArrowRC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'redundant-connection',
		title: 'Redundant Connection',
		nav: 'Redundant Connection',
		difficulty: 'Medium',
		category: 'Graphs',
		task: 'Implement findRedundantConnection — make all 6 tests pass.',

		prose: [
			'<h2>Redundant Connection</h2>' +
			'<p>A graph started as a tree of <code>n</code> nodes labeled <code>1…n</code>, ' +
			'then <em>one extra edge</em> was added, giving <code>n</code> edges total. ' +
			'<code>edges[i] = [a, b]</code> is an undirected edge. Return the edge that can be ' +
			'removed so the remaining graph is a tree again.</p>' +
			'<ul><li>If several edges qualify, return the one that appears <em>last</em> in ' +
			'the input.</li>' +
			'<li>No self-loops or duplicate edges; the graph is connected.</li>' +
			'<li>Return the edge exactly as given, e.g. <code>[]int{a, b}</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'findRedundantConnection([][]int{{1, 2}, {1, 3}, {2, 3}})                  →  []int{2, 3}\nfindRedundantConnection([][]int{{1, 2}, {2, 3}, {3, 4}, {1, 4}, {1, 5}})  →  []int{1, 4}', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>A tree never connects two nodes that already have a path between them. So feed ' +
			'the edges one by one into a <em>disjoint-set</em> (union-find) structure: each ' +
			'node points at a parent, chains of parents lead to a set’s root, and an edge ' +
			'whose endpoints share a root is the culprit:</p>' +
			DIAGRAM +
			'<p>Because every earlier edge merged two different sets, the first ' +
			'already-connected edge found is automatically the last valid answer in input ' +
			'order.</p>',
		],

		starter: [
			'package main',
			'',
			'// findRedundantConnection returns the edge (as given, e.g. []int{a, b})',
			'// whose removal turns the n-node, n-edge graph back into a tree. If',
			'// several edges qualify, return the one appearing last in edges.',
			'// Nodes are labeled 1..n where n == len(edges).',
			'func findRedundantConnection(edges [][]int) []int {',
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
			'func main() {',
			'	type tc struct {',
			'		edges [][]int',
			'		want  []int',
			'	}',
			'	cases := []tc{',
			'		// smallest possible: triangle, last edge closes it',
			'		{[][]int{{1, 2}, {1, 3}, {2, 3}}, []int{2, 3}},',
			'		// the classic LC example: cycle 1-2-3-4, then a harmless leaf edge',
			'		// AFTER it — returning the last input edge [1,5] is wrong',
			'		{[][]int{{1, 2}, {2, 3}, {3, 4}, {1, 4}, {1, 5}}, []int{1, 4}},',
			'		// plain ring: the final edge closes the cycle',
			'		{[][]int{{1, 2}, {2, 3}, {3, 4}, {4, 1}}, []int{4, 1}},',
			'		// two separate components merge mid-stream before the cycle closes',
			'		{[][]int{{1, 2}, {3, 4}, {2, 3}, {2, 4}}, []int{2, 4}},',
			'		// star plus a chord between two leaves',
			'		{[][]int{{1, 2}, {1, 3}, {1, 4}, {1, 5}, {2, 5}}, []int{2, 5}},',
			'		// 6 nodes, cycle 2-3-6-5-4-2 closed in the middle of the list',
			'		{[][]int{{1, 2}, {2, 3}, {2, 4}, {4, 5}, {5, 6}, {3, 6}}, []int{3, 6}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("edges=%v", c.edges),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Deep copy (outer slice AND each pair) — the returned edge',
			'			// may alias the input, and a solution is free to reorder.',
			'			in := make([][]int, len(c.edges))',
			'			for i, e := range c.edges {',
			'				in[i] = append([]int(nil), e...)',
			'			}',
			'			got := findRedundantConnection(in)',
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
			'// findRedundantConnection feeds the edges, in input order, into a',
			'// union-find (disjoint-set) structure. Invariant: after processing k',
			'// edges, two nodes share a set root exactly when the first k edges',
			'// connect them. So the first edge whose endpoints already share a',
			'// root is the redundant one — and since the graph is a tree plus ONE',
			'// extra edge, it is also the answer the problem wants (any later',
			'// "alternative" answer would require a second cycle).',
			'func findRedundantConnection(edges [][]int) []int {',
			'	n := len(edges) // nodes are labeled 1..n, and there are n edges',
			'',
			'	// parent[x] points one step toward x\'s set root; a root points at',
			'	// itself. size[x] is only meaningful at roots and drives the',
			'	// union-by-size balancing below. Index 0 is unused padding so the',
			'	// 1-based node labels index directly.',
			'	parent := make([]int, n+1)',
			'	size := make([]int, n+1)',
			'	for i := range parent {',
			'		parent[i] = i',
			'		size[i] = 1',
			'	}',
			'',
			'	// find walks parent pointers to the root, halving the path as it',
			'	// goes: pointing every visited node at its grandparent. That one',
			'	// extra assignment keeps trees so shallow that, combined with',
			'	// union by size, each find is effectively O(1) amortized (inverse',
			'	// Ackermann). Iterative on purpose — no recursion to blow.',
			'	find := func(x int) int {',
			'		for parent[x] != x {',
			'			parent[x] = parent[parent[x]] // path halving: skip a level',
			'			x = parent[x]',
			'		}',
			'		return x',
			'	}',
			'',
			'	for _, e := range edges {',
			'		ra, rb := find(e[0]), find(e[1])',
			'		if ra == rb {',
			'			// Both endpoints already reachable from each other through',
			'			// earlier edges — this edge closes the cycle. Return it in',
			'			// its original orientation.',
			'			return e',
			'		}',
			'		// Union by size: hang the smaller tree under the larger root so',
			'		// depth grows only when sizes double — trees stay O(log n) deep',
			'		// even before path compression flattens them further.',
			'		if size[ra] < size[rb] {',
			'			ra, rb = rb, ra',
			'		}',
			'		parent[rb] = ra',
			'		size[ra] += size[rb]',
			'	}',
			'	return nil // unreachable: a tree plus one edge always has a cycle',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force: re-check connectivity per edge</h3>' +
			'<p>For each edge, ask "were its endpoints already connected by the edges before ' +
			'it?" — answerable with a DFS over the earlier edges. That is a fresh O(n) ' +
			'traversal per edge, O(n²) total, and it rebuilds an adjacency structure it just ' +
			'threw away. The shape of the waste is telling: connectivity only ever ' +
			'<em>grows</em> as edges arrive, yet the DFS recomputes it from scratch each ' +
			'time.</p>' +
			'<h3>Union-find: connectivity as a merge of sets</h3>' +
			'<p>A <em>disjoint-set</em> structure maintains a partition of the nodes under ' +
			'exactly two operations: <code>find(x)</code> — which set is x in? — and ' +
			'<code>union(a, b)</code> — merge two sets. The whole thing is one integer array: ' +
			'<code>parent[x]</code> points one step toward the set’s <em>root</em> (a node ' +
			'that points at itself), so <code>find</code> just walks pointers upward, and ' +
			'<code>union</code> points one root at the other. Two nodes are connected iff ' +
			'<code>find</code> lands on the same root.</p>',
			{ code: 'find := func(x int) int {\n\tfor parent[x] != x {\n\t\tparent[x] = parent[parent[x]] // path halving: point at grandparent\n\t\tx = parent[x]\n\t}\n\treturn x\n}\n\n// union by size: smaller tree hangs under the bigger root\nif size[ra] < size[rb] {\n\tra, rb = rb, ra\n}\nparent[rb] = ra\nsize[ra] += size[rb]' },
			'<p>Two cheap refinements make it near-constant time. <strong>Union by ' +
			'size</strong>: always hang the smaller tree under the larger root, so a node’s ' +
			'depth increases only when its set at least doubles — depth is O(log n). ' +
			'<strong>Path compression</strong> (here the path-halving variant): while walking ' +
			'to the root, repoint each visited node at its grandparent, flattening the tree ' +
			'for every future query. Together they make a sequence of m operations cost ' +
			'O(m·α(n)), where the inverse-Ackermann α(n) ≤ 4 for any input that fits in the ' +
			'universe — effectively O(1) per operation.</p>' +
			'<p>The problem then solves itself: process edges in order; the first edge whose ' +
			'endpoints share a root is redundant. Why is "first already-connected" the same ' +
			'as the required "last valid answer"? Because the graph is a tree plus one edge, ' +
			'it contains exactly one cycle, and the removable edges are precisely that ' +
			'cycle’s edges — the one processed when the cycle <em>closes</em> is the latest ' +
			'of them in input order. The second test guards this: a harmless leaf edge ' +
			'<code>[1,5]</code> arrives after the cycle closes at <code>[1,4]</code>, so ' +
			'"return the last input edge" fails it.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Union-find (disjoint sets) — incremental connectivity</strong> — reach ' +
			'for it when edges arrive one at a time and each step asks "already connected?" ' +
			'or "how many components now?". A DFS answers one such query in O(V+E); ' +
			'union-find answers a whole <em>stream</em> of them in near-O(1) amortized each ' +
			'(O(α(n)) with union by size + path compression), which is why it powers ' +
			'Kruskal’s minimum-spanning-tree algorithm (add edges cheapest-first, skip those ' +
			'that close a cycle), friend-circle/account-merge problems, and cycle detection ' +
			'exactly like this one. In this track, Graph Valid Tree is the sibling — same ' +
			'structure, asking whether n−1 edges union cleanly — while Number of Islands ' +
			'shows the DFS alternative that wins when the graph is static.</p>',
		],
		complexity: { time: 'O(n·α(n)) ≈ O(n)', space: 'O(n)' },
	});
})();
