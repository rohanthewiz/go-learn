/* Merkle Tree — Replication & Consistency (Medium). The anti-entropy
 * structure that lets two replicas find their differing keys with
 * logarithmically few hash exchanges instead of shipping everything.
 * Exact-table harness: every expected root was computed with a native Go
 * reference implementation of the exact spec below.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 220" width="520" height="220" role="img" aria-label="merkle tree diff descending only into the subtree whose hashes differ">' +
		// edges
		'<line x1="250" y1="52" x2="140" y2="102" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<line x1="250" y1="52" x2="360" y2="102" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<line x1="140" y1="128" x2="75" y2="168" stroke="var(--edge)" stroke-width="1.2"/>' +
		'<line x1="140" y1="128" x2="205" y2="168" stroke="var(--edge)" stroke-width="1.2"/>' +
		'<line x1="360" y1="128" x2="295" y2="168" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<line x1="360" y1="128" x2="425" y2="168" stroke="var(--ok)" stroke-width="1.6"/>' +
		// root
		'<rect x="215" y="26" width="70" height="26" rx="5" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="250" y="44" text-anchor="middle" class="lbl">root ≠</text>' +
		// level 1
		'<rect x="105" y="102" width="70" height="26" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="140" y="120" text-anchor="middle" class="lbl">h01 =</text>' +
		'<rect x="325" y="102" width="70" height="26" rx="5" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="360" y="120" text-anchor="middle" class="lbl">h23 ≠</text>' +
		// leaves
		'<rect x="45" y="168" width="60" height="26" rx="5" fill="none" stroke="var(--dim)"/>' +
		'<text x="75" y="186" text-anchor="middle" class="lbl">L0</text>' +
		'<rect x="175" y="168" width="60" height="26" rx="5" fill="none" stroke="var(--dim)"/>' +
		'<text x="205" y="186" text-anchor="middle" class="lbl">L1</text>' +
		'<rect x="265" y="168" width="60" height="26" rx="5" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="295" y="186" text-anchor="middle" class="lbl">L2 ≠</text>' +
		'<rect x="395" y="168" width="60" height="26" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="425" y="186" text-anchor="middle" class="lbl">L3</text>' +
		// annotations
		'<text x="30" y="80" class="lbl" style="fill:var(--ok)">left hashes match →</text>' +
		'<text x="30" y="96" class="lbl" style="fill:var(--ok)">whole half pruned</text>' +
		'<path d="M 455 60 C 430 70 410 84 392 100" fill="none" stroke="var(--err-edge)" stroke-width="1.4" marker-end="url(#dgArrowMKT)"/>' +
		'<text x="392" y="52" class="lbl" style="fill:var(--err-edge)">descend only where</text>' +
		'<text x="392" y="68" class="lbl" style="fill:var(--err-edge)">hashes differ</text>' +
		'<text x="250" y="214" text-anchor="middle" class="lbl">one divergent key found with 3 comparisons, not 4 leaf transfers</text>' +
		'<defs><marker id="dgArrowMKT" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'merkle-tree',
		title: 'Merkle Tree',
		nav: 'Merkle Tree',
		difficulty: 'Medium',
		category: 'Replication & Consistency',
		task: 'Implement Root and DiffLeaves — make all 6 tests pass.',

		prose: [
			'<h2>Merkle Tree</h2>' +
			'<p>Two replicas each hold the same ordered key range — say a million entries — ' +
			'and one of them missed a few writes. How do they find <em>which</em> entries ' +
			'differ? Shipping all keys (or even all per-key hashes) costs O(n) network for ' +
			'what might be three divergent rows. A <strong>Merkle tree</strong> summarizes ' +
			'the range hierarchically: leaves hash entries, parents hash their children, and ' +
			'the root is a fingerprint of everything. Equal roots → provably in sync, one ' +
			'comparison. Different roots → descend, but only into children whose hashes ' +
			'differ:</p>' +
			DIAGRAM +
			'<h3>The exact tree shape</h3>' +
			'<p>Entries are strings; hashes are the <code>fnv1a</code> in your starter ' +
			'(the same hand-rolled FNV-1a the consistent-hashing ring uses):</p>' +
			'<ul>' +
			'<li>Leaf i: <code>fnv1a("leaf:" + data[i])</code> — the domain prefix keeps a ' +
			'leaf from ever colliding with an interior node by construction.</li>' +
			'<li>Parent of children <code>left</code>, <code>right</code>: ' +
			'<code>fnv1a("node:" + strconv.FormatUint(uint64(left), 10) + "," + ' +
			'strconv.FormatUint(uint64(right), 10))</code>.</li>' +
			'<li>A level with an odd node count promotes its last node <em>unchanged</em> to ' +
			'the next level.</li>' +
			'<li><code>Root(nil)</code> (or any empty slice) is defined as ' +
			'<code>fnv1a("empty")</code> — an empty range still needs a comparable ' +
			'fingerprint.</li>' +
			'</ul>' +
			'<h3>Your job</h3>' +
			'<ul>' +
			'<li><code>Root(data []string) uint32</code> — build the tree bottom-up, return ' +
			'the root hash.</li>' +
			'<li><code>DiffLeaves(a, b []string) []int</code> — the two replicas have ' +
			'equal-length entry slices; return the <em>sorted</em> indices where they differ. ' +
			'Implement it the anti-entropy way: build both trees and <em>descend from the ' +
			'roots, recursing only into child pairs whose hashes differ</em> — that pruning ' +
			'is what makes real repairs cost O(log n) round-trips per divergent range instead ' +
			'of a full scan. Return an empty (or nil) slice when the replicas agree.</li>' +
			'</ul>',
			{ code: 'Root(nil)                                  →  fnv1a("empty")\nDiffLeaves(sameA, sameA)                   →  []\nDiffLeaves({"x=1","y=2"}, {"x=1","y=9"})   →  [1]', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'import "strconv"',
			'',
			SD.FNV_HELPERS,
			'',
			'// leafHash fingerprints one entry. The "leaf:" domain prefix keeps',
			'// leaf hashes disjoint from interior-node hashes by construction.',
			'func leafHash(entry string) uint32 {',
			'	return fnv1a("leaf:" + entry)',
			'}',
			'',
			'// parentHash combines two child hashes into their parent, again in',
			'// its own "node:" domain, children rendered in decimal.',
			'func parentHash(left, right uint32) uint32 {',
			'	return fnv1a("node:" + strconv.FormatUint(uint64(left), 10) + "," + strconv.FormatUint(uint64(right), 10))',
			'}',
			'',
			'// Root returns the Merkle root of data: hash each entry with',
			'// leafHash, then repeatedly pair up with parentHash; a level with',
			'// an odd node count promotes its LAST node unchanged. An empty',
			'// slice hashes to fnv1a("empty").',
			'func Root(data []string) uint32 {',
			'	return 1 // your code here (1 is a sentinel no real root equals)',
			'}',
			'',
			'// DiffLeaves returns the sorted indices at which the equal-length',
			'// replicas a and b hold different entries. Build both trees, then',
			'// walk down from the roots, recursing only into children whose',
			'// hashes differ. Return an empty slice when the replicas agree.',
			'func DiffLeaves(a, b []string) []int {',
			'	return []int{-1} // your code here (-1 is an impossible index)',
			'}',
			'',
		].join('\n'),

		// Every want value below was computed by running a native Go
		// reference implementation of the spec (leaf:/node:/empty domains,
		// odd-node promotion) — they are exact, not approximations.
		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			')',
			'',
			SD.HARNESS_RT,
			'',
			'func main() {',
			'	base := []string{"user:1=ann", "user:2=bo", "user:3=cy", "user:4=dee"}',
			'	oneOff := []string{"user:1=ann", "user:2=bo", "user:3=CY!", "user:4=dee"}',
			'	twoOff := []string{"user:1=ANN", "user:2=bo", "user:3=cy", "user:4=DEE"}',
			'	odd := []string{"k1=a", "k2=b", "k3=c", "k4=d", "k5=e"}',
			'',
			'	cp := func(s []string) []string { return append([]string(nil), s...) }',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		run  func() string',
			'	}',
			'	cases := []tc{',
			'		{"Root(base) — 4 entries", "1474256369", func() string {',
			'			return fmt.Sprintf("%d", Root(cp(base)))',
			'		}},',
			'		{"Root(odd) — 5 entries, last node promoted", "215395182", func() string {',
			'			return fmt.Sprintf("%d", Root(cp(odd)))',
			'		}},',
			'		{"Root(nil) — empty range", "413646574", func() string {',
			'			return fmt.Sprintf("%d", Root(nil))',
			'		}},',
			'		{"DiffLeaves(base, base) — identical replicas", "[]", func() string {',
			'			return fmt.Sprintf("%v", DiffLeaves(cp(base), cp(base)))',
			'		}},',
			'		{"DiffLeaves(base, oneOff) — one divergent key", "[2]", func() string {',
			'			return fmt.Sprintf("%v", DiffLeaves(cp(base), cp(oneOff)))',
			'		}},',
			'		{"DiffLeaves(base, twoOff) — divergence in both halves", "[0 3]", func() string {',
			'			return fmt.Sprintf("%v", DiffLeaves(cp(base), cp(twoOff)))',
			'		}},',
			'	}',
			'',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			got := c.run()',
			'			r["pass"] = got == c.want',
			'			r["got"] = got',
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
			'import "strconv"',
			'',
			SD.FNV_HELPERS,
			'',
			'// leafHash fingerprints one entry. The "leaf:" domain prefix keeps',
			'// leaf hashes disjoint from interior-node hashes by construction.',
			'func leafHash(entry string) uint32 {',
			'	return fnv1a("leaf:" + entry)',
			'}',
			'',
			'// parentHash combines two child hashes into their parent, again in',
			'// its own "node:" domain, children rendered in decimal.',
			'func parentHash(left, right uint32) uint32 {',
			'	return fnv1a("node:" + strconv.FormatUint(uint64(left), 10) + "," + strconv.FormatUint(uint64(right), 10))',
			'}',
			'',
			'// buildLevels materializes the whole tree bottom-up as one slice',
			'// per level: levels[0] is the leaves, the last level is [root].',
			'// Keeping every level (rather than just folding to the root) is a',
			'// deliberate choice — DiffLeaves needs to revisit interior nodes,',
			'// and index arithmetic on flat levels (children of node i live at',
			'// 2i and 2i+1 one level down) replaces pointer plumbing entirely.',
			'func buildLevels(data []string) [][]uint32 {',
			'	leaves := make([]uint32, len(data))',
			'	for i, entry := range data {',
			'		leaves[i] = leafHash(entry)',
			'	}',
			'	levels := [][]uint32{leaves}',
			'	for len(levels[len(levels)-1]) > 1 {',
			'		cur := levels[len(levels)-1]',
			'		next := make([]uint32, 0, (len(cur)+1)/2)',
			'		for i := 0; i+1 < len(cur); i += 2 {',
			'			next = append(next, parentHash(cur[i], cur[i+1]))',
			'		}',
			'		if len(cur)%2 == 1 {',
			'			// Odd node out: promote it unchanged. Simpler than',
			'			// duplicating it as its own sibling, and it keeps the',
			'			// child-index rule intact (its only child is 2i).',
			'			next = append(next, cur[len(cur)-1])',
			'		}',
			'		levels = append(levels, next)',
			'	}',
			'	return levels',
			'}',
			'',
			'// Root returns the Merkle root of data; an empty range hashes to',
			'// the fixed sentinel fnv1a("empty") so it is still comparable.',
			'func Root(data []string) uint32 {',
			'	if len(data) == 0 {',
			'		return fnv1a("empty")',
			'	}',
			'	levels := buildLevels(data)',
			'	return levels[len(levels)-1][0]',
			'}',
			'',
			'// DiffLeaves finds the divergent indices between two equal-length',
			'// replicas by descending both trees in lockstep and recursing ONLY',
			'// where hashes differ — matching subtrees are pruned in O(1),',
			'// which is the entire economics of anti-entropy repair.',
			'func DiffLeaves(a, b []string) []int {',
			'	diffs := []int{}',
			'	if len(a) == 0 {',
			'		return diffs',
			'	}',
			'	la, lb := buildLevels(a), buildLevels(b)',
			'',
			'	// walk visits node idx at the given level in both trees. Left',
			'	// child before right keeps discoveries in ascending index order,',
			'	// so the result comes out sorted with no post-sort.',
			'	var walk func(level, idx int)',
			'	walk = func(level, idx int) {',
			'		if la[level][idx] == lb[level][idx] {',
			'			return // identical subtree — prune the whole descent',
			'		}',
			'		if level == 0 {',
			'			diffs = append(diffs, idx) // a real divergent leaf',
			'			return',
			'		}',
			'		child := 2 * idx',
			'		walk(level-1, child)',
			'		if child+1 < len(la[level-1]) {',
			'			// The right child exists only when idx was not a',
			'			// promoted odd node (whose sole child is 2*idx).',
			'			walk(level-1, child+1)',
			'		}',
			'	}',
			'	walk(len(la)-1, 0)',
			'	return diffs',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force: ship everything</h3>' +
			'<p>The naive replica sync sends all n per-key hashes (or worse, all values) and ' +
			'compares — O(n) network every repair cycle, even when nothing changed, which is ' +
			'the overwhelmingly common case. Anti-entropy runs continuously in the background; ' +
			'paying a full scan per round does not scale.</p>' +
			'<h3>The insight: hierarchical fingerprinting</h3>' +
			'<p>The general technique is the <strong>Merkle tree (hash tree)</strong>: summarize ' +
			'recursively so that one comparison can vouch for an entire subtree. Equal root ' +
			'hashes prove the whole range matches — the everything-is-fine case costs one hash ' +
			'exchange. When roots differ, each level of descent halves the suspect range, so ' +
			'locating k divergent leaves costs about O(k log n) comparisons — for a replica ' +
			'pair on opposite sides of a network, O(log n) <em>round-trips</em> per divergent ' +
			'range instead of shipping the world:</p>',
			{ code: 'walk = func(level, idx int) {\n\tif la[level][idx] == lb[level][idx] {\n\t\treturn // matching subtree: pruned in O(1)\n\t}\n\tif level == 0 {\n\t\tdiffs = append(diffs, idx)\n\t\treturn\n\t}\n\twalk(level-1, 2*idx)\n\tif 2*idx+1 < len(la[level-1]) {\n\t\twalk(level-1, 2*idx+1)\n\t}\n}' },
			'<p>Two spec details earn their keep: the <code>"leaf:"</code> / <code>"node:"</code> ' +
			'domain prefixes stop an attacker (or an unlucky coincidence) from passing an ' +
			'interior node off as a leaf, and promoting the odd node unchanged keeps the shape ' +
			'deterministic for any n without inventing padding leaves.</p>' +
			'<h3>Where you have met it</h3>' +
			'<p>Cassandra and Dynamo build per-partition Merkle trees during repair so replicas ' +
			'exchange O(tree) instead of O(data); git\'s object model is a Merkle DAG (a commit ' +
			'hash vouches for every byte reachable from it, which is why <code>git fetch</code> ' +
			'can skip whole subtrees); Bitcoin and Ethereum put Merkle roots in block headers so ' +
			'a light client can verify one transaction with a log-sized proof; Certificate ' +
			'Transparency logs prove append-only history the same way. Same primitive every ' +
			'time: a hash that vouches for a tree.</p>',
		],
		complexity: { time: 'O(n) build, O(k log n) diff for k divergences', space: 'O(n)' },
	});
})();
