/* Copy List with Random Pointer — Linked List (Medium). Deep-copy a list
 * whose nodes carry an extra Random pointer to an arbitrary node (or nil).
 * The map original→clone is the identity bridge that translates pointers.
 * The harness builds lists from (vals, randomIdx), renders them as
 * "val(randomIdx)" pairs, and verifies BOTH structure and deep-copy-ness
 * (no returned node may be pointer-identical to an original).
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 230" width="520" height="230" role="img" aria-label="a hash map bridges each original node to its clone so Random pointers can be translated">' +
		'<text x="20" y="18" class="lbl">original list — Random (curved) can point anywhere, even backward</text>' +
		// original nodes
		'<g>' +
		'<rect x="60" y="30" width="56" height="32" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="180" y="30" width="56" height="32" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="300" y="30" width="56" height="32" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="88" y="51" text-anchor="middle">7</text>' +
		'<text x="208" y="51" text-anchor="middle">13</text>' +
		'<text x="328" y="51" text-anchor="middle">11</text>' +
		'</g>' +
		// original Next arrows
		'<path d="M 118 46 L 176 46" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowCLR)"/>' +
		'<path d="M 238 46 L 296 46" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowCLR)"/>' +
		// original Random arrow: 13 → 7 (curved above)
		'<path d="M 208 28 C 190 6 120 6 96 26" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowCLRr)"/>' +
		'<text x="152" y="14" text-anchor="middle" class="lbl" style="fill:var(--accent)">Random</text>' +
		// map bridge arrows (dashed, ok)
		'<path d="M 88 64 L 88 138" fill="none" stroke="var(--ok)" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#dgArrowCLRm)"/>' +
		'<path d="M 208 64 L 208 138" fill="none" stroke="var(--ok)" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#dgArrowCLRm)"/>' +
		'<path d="M 328 64 L 328 138" fill="none" stroke="var(--ok)" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#dgArrowCLRm)"/>' +
		'<text x="380" y="106" class="lbl" style="fill:var(--ok)">clone[orig] — the identity bridge</text>' +
		// clone nodes
		'<g>' +
		'<rect x="60" y="142" width="56" height="32" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="180" y="142" width="56" height="32" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="300" y="142" width="56" height="32" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="88" y="163" text-anchor="middle">7′</text>' +
		'<text x="208" y="163" text-anchor="middle">13′</text>' +
		'<text x="328" y="163" text-anchor="middle">11′</text>' +
		'</g>' +
		// clone Next arrows
		'<path d="M 118 158 L 176 158" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowCLR)"/>' +
		'<path d="M 238 158 L 296 158" fill="none" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowCLR)"/>' +
		// clone Random arrow: 13' → 7' (curved below)
		'<path d="M 208 176 C 190 198 120 198 96 178" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowCLRr)"/>' +
		'<text x="20" y="222" class="lbl">clone[n].Random = clone[n.Random] — pointer translation via the map, never a scan</text>' +
		'<defs>' +
		'<marker id="dgArrowCLR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowCLRr" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowCLRm" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'copy-list-with-random-pointer',
		title: 'Copy List with Random Pointer',
		nav: 'Copy Random List',
		difficulty: 'Medium',
		category: 'Linked List',
		task: 'Implement copyRandomList — make all 5 tests pass.',

		prose: [
			'<h2>Copy List with Random Pointer</h2>' +
			'<p>Each node of this list carries a second pointer, <code>Random</code>, which ' +
			'may point to <em>any</em> node in the list (including itself) or be nil. Build a ' +
			'<strong>deep copy</strong>: a brand-new list of brand-new nodes whose ' +
			'<code>Next</code> <em>and</em> <code>Random</code> shapes mirror the original.</p>' +
			'<ul><li>No returned node may be one of the original nodes — the tests compare ' +
			'pointers to catch shared nodes, not just values.</li>' +
			'<li>Every clone’s <code>Random</code> must point at a <em>clone</em>, never back ' +
			'into the original list.</li>' +
			'<li><code>nil</code> input copies to <code>nil</code>.</li></ul>' +
			'<h3>Example</h3>' +
			'<p>Tests render a list as <code>val(randomIdx)</code> pairs, where ' +
			'<code>randomIdx</code> is the position the Random pointer targets ' +
			'(<code>nil</code> if unset):</p>',
			{ code: 'original: [7(nil) 13(0) 11(4) 10(2) 1(0)]\ncopy:     [7(nil) 13(0) 11(4) 10(2) 1(0)]   // same shape, all-new nodes', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Cloning the <code>Next</code> chain is easy; the trouble is <code>Random</code>, ' +
			'which can point at a node whose clone doesn’t exist yet. So split the work: first ' +
			'create all clones with a map from each original node to its clone, then translate ' +
			'every pointer through that map:</p>' +
			DIAGRAM +
			'<p>Two passes, one map — no forward-reference problem, no scanning.</p>',
		],

		starter: [
			'package main',
			'',
			'// RandomNode is a list node with an extra Random pointer that may',
			'// target any node in the same list, or be nil.',
			'type RandomNode struct {',
			'	Val    int',
			'	Next   *RandomNode',
			'	Random *RandomNode',
			'}',
			'',
			'// copyRandomList returns a deep copy of the list: all-new nodes,',
			'// with both Next and Random wired to the corresponding NEW nodes.',
			'// The tests check pointer identity — returning (or reusing) any',
			'// original node fails. nil copies to nil.',
			'func copyRandomList(head *RandomNode) *RandomNode {',
			'	// your code here (hint: map[*RandomNode]*RandomNode)',
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
			'	"strconv"',
			'	"strings"',
			')',
			'',
			LC.HARNESS_RT,
			'',
			'// buildRandomList constructs a list from parallel slices: vals[i] is',
			'// the i-th node value, randomIdx[i] the index its Random points to',
			'// (−1 = nil). Nodes are created up front so forward references work.',
			'func buildRandomList(vals []int, randomIdx []int) *RandomNode {',
			'	if len(vals) == 0 {',
			'		return nil',
			'	}',
			'	nodes := make([]*RandomNode, len(vals))',
			'	for i, v := range vals {',
			'		nodes[i] = &RandomNode{Val: v}',
			'	}',
			'	for i := range nodes {',
			'		if i+1 < len(nodes) {',
			'			nodes[i].Next = nodes[i+1]',
			'		}',
			'		if randomIdx[i] >= 0 {',
			'			nodes[i].Random = nodes[randomIdx[i]]',
			'		}',
			'	}',
			'	return nodes[0]',
			'}',
			'',
			'// renderRandomList flattens a list to "[val(randomIdx) ...]" where',
			'// randomIdx is found by scanning THIS list’s nodes by pointer. A',
			'// Random that points outside the walked chain (e.g. back into the',
			'// original list from a half-copied clone) renders as "?" and can',
			'// never match a well-formed want string. Walk is capped so a',
			'// cyclic Next chain yields a wrong answer, not a hang.',
			'func renderRandomList(head *RandomNode) string {',
			'	nodes := []*RandomNode{}',
			'	for n := head; n != nil && len(nodes) <= 100; n = n.Next {',
			'		nodes = append(nodes, n)',
			'	}',
			'	parts := []string{}',
			'	for _, n := range nodes {',
			'		ri := "nil"',
			'		if n.Random != nil {',
			'			ri = "?"',
			'			for j, m := range nodes {',
			'				if m == n.Random {',
			'					ri = strconv.Itoa(j)',
			'					break',
			'				}',
			'			}',
			'		}',
			'		parts = append(parts, fmt.Sprintf("%d(%s)", n.Val, ri))',
			'	}',
			'	return "[" + strings.Join(parts, " ") + "]"',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		vals []int',
			'		rand []int // Random target index per node; -1 = nil',
			'	}',
			'	cases := []tc{',
			'		{[]int{7, 13, 11, 10, 1}, []int{-1, 0, 4, 2, 0}}, // classic LC example',
			'		{[]int{5, 6}, []int{0, 1}},                        // each node points to itself',
			'		{[]int{1, 2, 3}, []int{-1, -1, -1}},               // all Randoms nil',
			'		{[]int{42}, []int{0}},                             // single self-pointing node',
			'		{[]int{}, []int{}},                                // empty list → nil',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("vals=%v random=%v", c.vals, c.rand),',
			'		}',
			'		runCase(r, func() {',
			'			orig := buildRandomList(c.vals, c.rand)',
			'			// Snapshot the expected shape and the original node set',
			'			// BEFORE the call, in case the solution mutates the input.',
			'			want := renderRandomList(orig)',
			'			origNodes := []*RandomNode{}',
			'			for n := orig; n != nil; n = n.Next {',
			'				origNodes = append(origNodes, n)',
			'			}',
			'			r["want"] = want + " (all-new nodes)"',
			'',
			'			got := copyRandomList(orig)',
			'			gotStr := renderRandomList(got)',
			'',
			'			// Deep-copy check: no node in the returned chain may be',
			'			// pointer-identical to an original node. (A clone Random',
			'			// aimed at an original is caught by the "?" in gotStr.)',
			'			shared := false',
			'			cnt := 0',
			'			for n := got; n != nil && cnt <= 100; n = n.Next {',
			'				for _, o := range origNodes {',
			'					if n == o {',
			'						shared = true',
			'					}',
			'				}',
			'				cnt++',
			'			}',
			'			note := " (all-new nodes)"',
			'			if shared {',
			'				note = " (SHARES nodes with the original)"',
			'			}',
			'			r["pass"] = gotStr == want && !shared',
			'			r["got"] = gotStr + note',
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
			'// RandomNode is a list node with an extra Random pointer that may',
			'// target any node in the same list, or be nil.',
			'type RandomNode struct {',
			'	Val    int',
			'	Next   *RandomNode',
			'	Random *RandomNode',
			'}',
			'',
			'// copyRandomList returns a deep copy of the list.',
			'//',
			'// Two passes over the original with a map as the identity bridge:',
			'//',
			'//	pass 1: allocate a bare clone per node, record original → clone',
			'//	pass 2: wire clone pointers by TRANSLATING the original’s',
			'//	        pointers through the map',
			'//',
			'// Splitting allocation from wiring dissolves the forward-reference',
			'// problem: Random may point at a node far ahead in the chain, but',
			'// by pass 2 every clone already exists, so any target — ahead,',
			'// behind, or self — resolves with one map lookup.',
			'func copyRandomList(head *RandomNode) *RandomNode {',
			'	if head == nil {',
			'		return nil',
			'	}',
			'',
			'	clone := make(map[*RandomNode]*RandomNode)',
			'	for n := head; n != nil; n = n.Next {',
			'		clone[n] = &RandomNode{Val: n.Val}',
			'	}',
			'',
			'	for n := head; n != nil; n = n.Next {',
			'		// A missing key returns the map’s zero value — nil — so',
			'		// clone[nil] is nil and the tail’s Next and any nil Random',
			'		// wire themselves correctly with no branching.',
			'		clone[n].Next = clone[n.Next]',
			'		clone[n].Random = clone[n.Random]',
			'	}',
			'	return clone[head]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Clone the <code>Next</code> chain, then fix up each <code>Random</code> by ' +
			'measuring “my Random is the k-th node” in the original and walking k steps in the ' +
			'copy — an O(n) scan per node, O(n²) total. The waste is obvious: the position of ' +
			'a Random target is information the first pass already touched and threw away.</p>' +
			'<h3>A map as the identity bridge</h3>' +
			'<p>What the fix-up really needs is a function <em>original node → its clone</em>. ' +
			'Go map keys can be pointers, so build exactly that function as data. Allocate ' +
			'first, wire second — once every clone exists, forward references, back ' +
			'references, and self references all collapse into the same O(1) lookup:</p>',
			{ code: 'clone := make(map[*RandomNode]*RandomNode)\nfor n := head; n != nil; n = n.Next {\n\tclone[n] = &RandomNode{Val: n.Val} // pass 1: bodies only\n}\nfor n := head; n != nil; n = n.Next {\n\tclone[n].Next = clone[n.Next]      // pass 2: translate pointers —\n\tclone[n].Random = clone[n.Random]  // clone[nil] is nil for free\n}\nreturn clone[head]' },
			'<p>The quiet elegance: a missing map key yields the zero value, so ' +
			'<code>clone[nil]</code> is <code>nil</code> — the tail’s <code>Next</code> and ' +
			'every unset <code>Random</code> need no special case.</p>' +
			'<h3>The O(1)-space variant: interleave the clones</h3>' +
			'<p>The map costs O(n) space. The classic trick to drop it stores the bridge in ' +
			'the list itself: splice each clone directly after its original ' +
			'(<code>A→A′→B→B′→…</code>), so “the clone of n” becomes <code>n.Next</code> — ' +
			'pointer arithmetic instead of a hash lookup — then unzip the two chains:</p>',
			{ code: 'for n := head; n != nil; n = n.Next.Next { // 1: interleave A→A\'→B→B\'\n\tn.Next = &RandomNode{Val: n.Val, Next: n.Next}\n}\nfor n := head; n != nil; n = n.Next.Next { // 2: n.Next is n’s clone\n\tif n.Random != nil {\n\t\tn.Next.Random = n.Random.Next // clone’s Random = clone of n’s Random\n\t}\n}\n// 3: unzip the interleaved list back into original + copy (restoring\n//    the original’s Next pointers), then return the copy’s head.' },
			'<p>Same two-phase idea — create everything, then translate pointers — just with ' +
			'the map encoded positionally. Reach for it only when the O(n) map genuinely ' +
			'matters; the map version is clearer and equally fast asymptotically.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Hash map as an identity bridge between structures</strong> — when ' +
			'deep-copying or mirroring any pointer-linked structure, first build a complete ' +
			'old→new node map, then translate every edge through it. The trigger: pointers ' +
			'that can reference <em>arbitrary</em> nodes (cross edges, cycles, self-loops), ' +
			'which defeats one-pass copying because targets may not exist yet. Cost: O(n) ' +
			'time, O(n) space for the bridge. Cloning a graph is this exact algorithm with ' +
			'“Next” replaced by a neighbor list, and the map doubles as the visited-set — the ' +
			'same map-keyed-by-node-identity move that marks visited cells in ' +
			'<em>Number of Islands</em> and <em>Course Schedule</em>. The value→index map in ' +
			'<em>Two Sum</em> is the humbler cousin: a map that memoizes “where have I seen ' +
			'this before?” so a scan becomes a lookup.</p>',
		],
		complexity: { time: 'O(n)', space: 'O(n) — O(1) with the interleaving variant' },
	});
})();
