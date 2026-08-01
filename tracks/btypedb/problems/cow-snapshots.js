/* COW Snapshots — btypedb: Transactions (Hard). The trick that makes
 * db.View() free: a persistent (path-copying) search tree where Set never
 * mutates a node — it copies the root-to-target spine and shares every
 * untouched subtree. A snapshot is then just a root pointer, taken in
 * O(1). The harness pins value correctness, frozen-view semantics under
 * concurrent-style writes, and — by POINTER EQUALITY — that unchanged
 * subtrees really are shared, not cloned.
 */
(function () {
	'use strict';
	var T = GoLearnBT;

	// Path copying: setting "t" copies the spine root->t and shares the
	// untouched left subtree between the old and new roots. Marker id
	// namespaced (dgArrowBT07) because every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 230" width="560" height="230" role="img" aria-label="path copying: a new root and copied spine point at a fresh node, while the untouched left subtree is shared by both the old and new roots">' +
		'<text x="20" y="24" class="lbl">Set("t", …) — copy the spine, share the rest</text>' +
		// old tree
		'<circle cx="140" cy="70" r="20" fill="none" stroke="var(--edge)" stroke-width="2"/><text x="140" y="75" text-anchor="middle">m</text>' +
		'<circle cx="80" cy="140" r="20" fill="none" stroke="var(--edge)" stroke-width="2"/><text x="80" y="145" text-anchor="middle">f</text>' +
		'<circle cx="200" cy="140" r="20" fill="none" stroke="var(--edge)" stroke-width="2"/><text x="200" y="145" text-anchor="middle">t</text>' +
		'<line x1="128" y1="86" x2="92" y2="124" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<line x1="152" y1="86" x2="188" y2="124" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="140" y="42" text-anchor="middle" class="lbl">old root — the snapshot</text>' +
		// new tree
		'<circle cx="400" cy="70" r="20" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="400" y="75" text-anchor="middle">m′</text>' +
		'<circle cx="460" cy="140" r="20" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="460" y="145" text-anchor="middle">t′</text>' +
		'<line x1="412" y1="86" x2="448" y2="124" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="400" y="42" text-anchor="middle" class="lbl" style="fill:var(--accent)">new root — after Set</text>' +
		// the shared subtree
		'<path d="M 388 86 C 300 130 160 130 104 132" fill="none" stroke="var(--accent)" stroke-width="1.6" stroke-dasharray="6 4" marker-end="url(#dgArrowBT07)"/>' +
		'<text x="268" y="112" text-anchor="middle" class="lbl" style="fill:var(--accent)">m′.Left == m.Left — the SAME node, shared</text>' +
		'<text x="20" y="190" class="lbl">nodes are never mutated after creation, so the old root still describes a complete,</text>' +
		'<text x="20" y="208" class="lbl">consistent tree forever — a snapshot is one pointer, taken in O(1), no locks held</text>' +
		'<defs><marker id="dgArrowBT07" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'cow-snapshots',
		title: 'Copy-on-Write Snapshots in O(1)',
		nav: 'cow snapshots',
		difficulty: 'Hard',
		category: 'Transactions',
		task: 'Implement a path-copying persistent BST: Set returns a NEW root sharing untouched subtrees, so any old root is a free, frozen snapshot.',

		prose: [
			'<h2>Copy-on-Write Snapshots in O(1)</h2>' +
			'<p>Your store needs a consistent backup while writes continue. The ' +
			'blunt options are all bad: lock everything and stall writers for the ' +
			'whole dump; or copy the entire dataset first — O(n) memory and time ' +
			'<em>before the backup even starts</em>. btypedb’s ' +
			'<code>db.View</code> does neither, and yet the reader sees a ' +
			'perfectly frozen database:</p>',
			{ lang: 'go', code: '// Read-only: a frozen, lock-free view — later commits are invisible to it.\nerr = db.View(func(tx *btypedb.Tx[string, User]) error {\n\tu, ok := tx.Get("ada")\n\tfor k, v := range tx.All() { /* consistent snapshot */ }\n\treturn nil\n})\n// Writers never blocked. Readers never blocked. No copy was made.' },
			'<p>The machinery is a <strong>persistent tree</strong> — persistent ' +
			'in the functional-programming sense: old versions stay valid. Two ' +
			'rules build it:</p>' +
			'<ul>' +
			'<li><strong>Nodes are immutable after creation.</strong> Nobody ever ' +
			'assigns to a reachable node’s fields.</li>' +
			'<li><strong>Set copies the spine.</strong> To write key ' +
			'<code>t</code>, walk from the root toward it, and allocate a ' +
			'<em>fresh copy</em> of each node on that path — the copy’s child ' +
			'pointer on the walk side points at the next fresh copy, while every ' +
			'other pointer is taken over <em>unchanged</em>, sharing whole ' +
			'untouched subtrees with the old version. <code>Set</code> returns ' +
			'the new root; the old root still describes the complete pre-write ' +
			'tree.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>A snapshot is now literally one pointer read — O(1), no lock, no ' +
			'copy. A reader holding an old root can iterate for an hour while ' +
			'thousands of Sets produce new roots; none of them can touch a node ' +
			'the reader can reach. Cost: a Set allocates the spine — O(log n) ' +
			'nodes for a balanced tree — instead of mutating one node in ' +
			'place.</p>' +
			'<h3>Your job</h3>' +
			'<p><code>Get</code> and <code>Ascend</code> (in-order walk) are ' +
			'given. Implement <code>Set(root, k, v) *Node</code> as a ' +
			'path-copying insert-or-update on a plain BST (no balancing here — ' +
			'the shape, not the height, is the lesson). The harness checks ' +
			'sharing by pointer equality: after setting a key in the right ' +
			'subtree, <code>newRoot.Left</code> must be <em>the same node</em> as ' +
			'<code>oldRoot.Left</code>.</p>',
		],

		starter: [
			'package main',
			'',
			'// Node is one immutable tree node. In the persistent discipline,',
			'// fields are written ONCE, at allocation — never after the node',
			'// becomes reachable from a root.',
			'type Node struct {',
			'	Key, Val    string',
			'	Left, Right *Node',
			'}',
			'',
			'// Get walks the BST — given, complete. It works unchanged on any',
			'// root, old or new: that indifference is the whole point.',
			'func Get(n *Node, k string) (string, bool) {',
			'	for n != nil {',
			'		if k < n.Key {',
			'			n = n.Left',
			'		} else if k > n.Key {',
			'			n = n.Right',
			'		} else {',
			'			return n.Val, true',
			'		}',
			'	}',
			'	return "", false',
			'}',
			'',
			'// Ascend appends "k=v" pairs in key order — given, complete.',
			'func Ascend(n *Node) []string {',
			'	if n == nil {',
			'		return nil',
			'	}',
			'	out := Ascend(n.Left)',
			'	out = append(out, n.Key+"="+n.Val)',
			'	return append(out, Ascend(n.Right)...)',
			'}',
			'',
			'// Set inserts or updates k, returning the root of the resulting',
			'// tree. THIS version mutates in place — the classic ephemeral BST.',
			'// It returns the same root it was given, so every "snapshot" sees',
			'// every later write. Rewrite it as a path-copying persistent Set:',
			'//',
			'//   - never assign to an existing node\'s fields',
			'//   - copy each node on the root-to-target path',
			'//   - take unchanged child pointers over as-is (subtree sharing)',
			'//   - return the NEW root',
			'func Set(root *Node, k, v string) *Node {',
			'	if root == nil {',
			'		return &Node{Key: k, Val: v}',
			'	}',
			'	n := root',
			'	for {',
			'		if k < n.Key {',
			'			if n.Left == nil {',
			'				n.Left = &Node{Key: k, Val: v}',
			'				return root',
			'			}',
			'			n = n.Left',
			'		} else if k > n.Key {',
			'			if n.Right == nil {',
			'				n.Right = &Node{Key: k, Val: v}',
			'				return root',
			'			}',
			'			n = n.Right',
			'		} else {',
			'			n.Val = v',
			'			return root',
			'		}',
			'	}',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'// hBuild sets keys left to right onto a nil root.',
			'func hBuild(pairs ...string) *Node {',
			'	var root *Node',
			'	for _, p := range pairs {',
			'		kv := strings.SplitN(p, "=", 2)',
			'		root = Set(root, kv[0], kv[1])',
			'	}',
			'	return root',
			'}',
			'',
			'func hJoin(ss []string) string { return strings.Join(ss, ",") }',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"Set on a nil root creates a single-node tree",',
			'			"a=1",',
			'			func() string { return hJoin(Ascend(Set(nil, "a", "1"))) }},',
			'		{"inserts in scrambled order, Ascend comes out sorted",',
			'			"a=1,f=2,m=3,t=4,z=5",',
			'			func() string { return hJoin(Ascend(hBuild("m=3", "z=5", "a=1", "t=4", "f=2"))) }},',
			'		{"update replaces the value in the NEW tree",',
			'			`"F2" true`,',
			'			func() string {',
			'				root := hBuild("m=1", "f=F1", "t=3")',
			'				root2 := Set(root, "f", "F2")',
			'				v, ok := Get(root2, "f")',
			'				return fmt.Sprintf("%q %v", v, ok)',
			'			}},',
			'		{"snapshot freeze: an old root never sees later Sets",',
			'			"snap=[f=1,m=2,t=3] live=[f=1,m=2,t=3,z=9]",',
			'			func() string {',
			'				snap := hBuild("m=2", "f=1", "t=3")',
			'				live := Set(snap, "z", "9")',
			'				return fmt.Sprintf("snap=[%s] live=[%s]", hJoin(Ascend(snap)), hJoin(Ascend(live)))',
			'			}},',
			'		{"snapshot freeze under UPDATE: the old root keeps the old value",',
			'			`old="F1" new="F2"`,',
			'			func() string {',
			'				snap := hBuild("m=2", "f=F1", "t=3")',
			'				live := Set(snap, "f", "F2")',
			'				ov, _ := Get(snap, "f")',
			'				nv, _ := Get(live, "f")',
			'				return fmt.Sprintf("old=%q new=%q", ov, nv)',
			'			}},',
			'		{"Set returns a NEW root — the snapshot is a different pointer",',
			'			"distinct",',
			'			func() string {',
			'				root := hBuild("m=2", "f=1", "t=3")',
			'				root2 := Set(root, "z", "9")',
			'				if root2 == root {',
			'					return "same pointer: tree was mutated in place"',
			'				}',
			'				return "distinct"',
			'			}},',
			'		{"structural sharing: writing into the right subtree SHARES the left",',
			'			"left shared, right copied",',
			'			func() string {',
			'				root := hBuild("m=2", "f=1", "t=3")',
			'				root2 := Set(root, "z", "9")',
			'				if root2.Left != root.Left {',
			'					return "left subtree was needlessly copied"',
			'				}',
			'				if root2.Right == root.Right {',
			'					return "right spine was NOT copied — old root is not frozen"',
			'				}',
			'				return "left shared, right copied"',
			'			}},',
			'		{"a reader mid-iteration: writes between visits change nothing it sees",',
			'			"a=1,f=2,m=3",',
			'			func() string {',
			'				snap := hBuild("m=3", "a=1", "f=2")',
			'				out := []string{}',
			'				live := snap',
			'				// Interleave: after each visited pair, a "concurrent"',
			'				// writer adds a key. The frozen view must not notice.',
			'				for _, kv := range Ascend(snap) {',
			'					out = append(out, kv)',
			'					live = Set(live, "zz"+kv[:1], "!")',
			'				}',
			'				_ = live',
			'				return hJoin(Ascend(snap))',
			'			}},',
			'		{"three generations coexist: each root is its own version",',
			'			"g0=[m=1] g1=[f=2,m=1] g2=[f=2,m=1,t=3]",',
			'			func() string {',
			'				g0 := Set(nil, "m", "1")',
			'				g1 := Set(g0, "f", "2")',
			'				g2 := Set(g1, "t", "3")',
			'				return fmt.Sprintf("g0=[%s] g1=[%s] g2=[%s]", hJoin(Ascend(g0)), hJoin(Ascend(g1)), hJoin(Ascend(g2)))',
			'			}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			got := c.got()',
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
			'// Node is one immutable tree node: fields are written once, at',
			'// allocation, never after the node becomes reachable from a root.',
			'// Immutability is not enforced by the compiler here — it is a',
			'// discipline the Set below upholds, and everything (free snapshots,',
			'// lock-free readers) follows from it.',
			'type Node struct {',
			'	Key, Val    string',
			'	Left, Right *Node',
			'}',
			'',
			'// Get walks the BST. It works unchanged on any root, old or new —',
			'// a reader cannot even tell whether "its" tree is the latest.',
			'func Get(n *Node, k string) (string, bool) {',
			'	for n != nil {',
			'		if k < n.Key {',
			'			n = n.Left',
			'		} else if k > n.Key {',
			'			n = n.Right',
			'		} else {',
			'			return n.Val, true',
			'		}',
			'	}',
			'	return "", false',
			'}',
			'',
			'// Ascend appends "k=v" pairs in key order.',
			'func Ascend(n *Node) []string {',
			'	if n == nil {',
			'		return nil',
			'	}',
			'	out := Ascend(n.Left)',
			'	out = append(out, n.Key+"="+n.Val)',
			'	return append(out, Ascend(n.Right)...)',
			'}',
			'',
			'// Set: path-copying insert-or-update. Recursion mirrors the shape of',
			'// the result exactly: each frame copies ITS node and grafts the',
			'// recursive result into one side of the copy — so precisely the',
			'// root-to-target spine is new, and every pointer not on the walk is',
			'// taken over unchanged (that assignment IS the structural sharing).',
			'//',
			'//	Set(m, "z"):    m′            allocations: m′ and z only;',
			'//	               /  \\           f and its whole subtree are',
			'//	          (shared) t′         shared via the copied pointers',
			'//	              f     \\',
			'//	                     z',
			'//',
			'// Cost: O(depth) allocations per write — the price of making every',
			'// old root a permanently valid snapshot.',
			'func Set(root *Node, k, v string) *Node {',
			'	if root == nil {',
			'		return &Node{Key: k, Val: v}',
			'	}',
			'	// Copy first: after this line the original is never touched.',
			'	// The copy starts as a field-for-field clone, so both children',
			'	// are shared by default; exactly one pointer (or Val) is then',
			'	// redirected at the fresh subtree.',
			'	c := &Node{Key: root.Key, Val: root.Val, Left: root.Left, Right: root.Right}',
			'	if k < root.Key {',
			'		c.Left = Set(root.Left, k, v)',
			'	} else if k > root.Key {',
			'		c.Right = Set(root.Right, k, v)',
			'	} else {',
			'		// Update: even value changes allocate a fresh node — writing',
			'		// root.Val in place would leak the new value into every',
			'		// snapshot that can reach this node.',
			'		c.Val = v',
			'	}',
			'	return c',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What the real btypedb does</h3>' +
			'<p>Scale this up and you have btypedb’s concurrency story. The ' +
			'engine’s tree is a copy-on-write <strong>B-tree</strong> ' +
			'(tidwall/btype), so a “node” holds dozens of keys and the spine is ' +
			'short and cache-friendly, with atomic refcounts deciding when shared ' +
			'nodes can finally be freed — but the write path is your ' +
			'<code>Set</code> verbatim: copy the spine, share the rest. ' +
			'<code>db.View</code> grabs the current root pointer — that is the ' +
			'entire cost of a snapshot — and iterates lock-free; ' +
			'<code>db.Update</code> builds new spines privately, and commit is ' +
			'<strong>one root-pointer swap</strong> after the batched log append. ' +
			'Readers holding the old root keep it valid for as long as they need ' +
			'it. Savepoints ride the same machinery: a savepoint is a remembered ' +
			'root (O(1)), and <code>RollbackTo</code> is a pointer restore.</p>' +
			'<p>The dependency is deep enough that btypedb <em>pins</em> its ' +
			'btype version and ships a guard test: the lock-free reads rely on ' +
			'source-inspected properties (shared nodes are copied, never mutated ' +
			'in place) that are not part of btype’s documented contract. When ' +
			'your correctness rests on someone else’s invariant, pin it and test ' +
			'for drift.</p>' +
			'<h3>Trade-offs</h3>' +
			'<p>Persistence is paid for in allocation and garbage. Every write ' +
			'allocates a spine — O(log n) nodes — where an ephemeral tree would ' +
			'mutate one; old spines become garbage the moment no snapshot needs ' +
			'them, so write-heavy workloads lean on the collector (or on ' +
			'refcounts, as btype does). A long-lived snapshot also pins memory: ' +
			'hold a root for an hour and every node it can reach survives an ' +
			'hour of overwrites. That is the RAM-resident engine’s version of ' +
			'PostgreSQL’s “long-running transaction blocks vacuum”.</p>' +
			'<p>The pattern is everywhere once you see it: Clojure’s and Scala’s ' +
			'immutable maps (HAMTs), Git’s object graph (a commit is a root ' +
			'pointer; unchanged trees are shared between commits), btrfs and ZFS ' +
			'snapshots, LMDB’s copy-on-write pages. One idea — <em>never mutate ' +
			'reachable data; publish by swapping a root</em> — replaces a whole ' +
			'zoo of reader-writer locks, and it is the reason btypedb can promise ' +
			'“readers never block and never take locks while iterating” with a ' +
			'straight face.</p>',
		],
		complexity: { time: 'O(depth) per Set (copied spine); O(1) to take a snapshot', space: 'O(depth) new nodes per write; snapshots pin only what they can reach' },
	});
})();
