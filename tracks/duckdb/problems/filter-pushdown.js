/* Filter Pushdown — Pruning (Medium). The optimizer rule that moves a WHERE
 * clause below a join so rows die before they cost anything: model a tiny
 * logical plan tree (Scan / Filter / Join / Project), implement the pushdown
 * rewrite for single-side predicates, and measure rows flowing across every
 * edge before and after. The harness pins the 100x shrink of the join input,
 * the cross-side filter that must stay put, and cardinality preservation —
 * a rewrite that changes the answer is not an optimization, it is a bug.
 */
(function () {
	'use strict';
	var T = GoLearnDK;

	// Two shapes of the same query: filter above the join (naive) vs pushed
	// onto the scan (optimized). Marker id namespaced (dgArrowDK06) because
	// every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 235" width="560" height="235" role="img" aria-label="the same query plan before and after filter pushdown: the filter node moves from above the join down onto the orders scan, shrinking the join input from ten million rows to one hundred thousand">' +
		'<text x="20" y="20" class="lbl">the same query, two shapes — where the filter sits decides what the join must chew</text>' +
		// ---- left tree: naive, filter above the join ----
		'<rect x="70" y="36" width="120" height="26" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<text x="130" y="53" text-anchor="middle" class="lbl">project</text>' +
		'<rect x="70" y="78" width="120" height="26" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="130" y="95" text-anchor="middle" class="lbl">filter &#247;100</text>' +
		'<rect x="70" y="120" width="120" height="26" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="130" y="137" text-anchor="middle" class="lbl">join</text>' +
		'<rect x="20" y="170" width="105" height="26" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<text x="72" y="187" text-anchor="middle" class="lbl">orders 10M</text>' +
		'<rect x="135" y="170" width="105" height="26" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<text x="187" y="187" text-anchor="middle" class="lbl">customers 500k</text>' +
		'<line x1="130" y1="62" x2="130" y2="78" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<line x1="130" y1="104" x2="130" y2="120" stroke="var(--warn)" stroke-width="1.4"/>' +
		'<line x1="100" y1="146" x2="72" y2="170" stroke="var(--warn)" stroke-width="2"/>' +
		'<line x1="160" y1="146" x2="187" y2="170" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<text x="52" y="162" class="lbl" style="fill:var(--warn)">10M in</text>' +
		// ---- the rewrite arrow ----
		'<path d="M 252 112 L 300 112" fill="none" stroke="var(--warn)" stroke-width="2" marker-end="url(#dgArrowDK06)"/>' +
		'<text x="276" y="102" text-anchor="middle" class="lbl" style="fill:var(--warn)">pushdown</text>' +
		// ---- right tree: filter pushed below the join ----
		'<rect x="370" y="36" width="120" height="26" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<text x="430" y="53" text-anchor="middle" class="lbl">project</text>' +
		'<rect x="370" y="78" width="120" height="26" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="430" y="95" text-anchor="middle" class="lbl">join</text>' +
		'<rect x="320" y="128" width="100" height="26" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="370" y="145" text-anchor="middle" class="lbl">filter &#247;100</text>' +
		'<rect x="440" y="128" width="100" height="26" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<text x="490" y="145" text-anchor="middle" class="lbl">customers 500k</text>' +
		'<rect x="320" y="178" width="100" height="26" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<text x="370" y="195" text-anchor="middle" class="lbl">orders 10M</text>' +
		'<line x1="430" y1="62" x2="430" y2="78" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<line x1="400" y1="104" x2="370" y2="128" stroke="var(--accent)" stroke-width="2"/>' +
		'<line x1="460" y1="104" x2="490" y2="128" stroke="var(--accent)" stroke-width="1.4"/>' +
		'<line x1="370" y1="154" x2="370" y2="178" stroke="var(--warn)" stroke-width="1.4"/>' +
		'<text x="422" y="121" class="lbl" style="fill:var(--accent)">100k in</text>' +
		'<text x="20" y="227" class="lbl">join hash table: 10,000,000 entries before the rewrite — 100,000 after. Same answer, 100&#215; less work.</text>' +
		'<defs><marker id="dgArrowDK06" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'filter-pushdown',
		title: 'Filter Pushdown',
		nav: 'filter pushdown',
		difficulty: 'Medium',
		category: 'Pruning',
		task: 'Implement the pushdown rewrite on a small logical plan tree: a Filter above a Join whose columns all come from one side sinks below the Join onto that side; cross-side filters stay. Edges report rows flowing through the plan.',

		prose: [
			'<h2>Filter Pushdown</h2>' +
			'<p>A dashboard query joins a 10-million-row <code>orders</code> table to ' +
			'500k <code>customers</code>, keeps the 1% of orders in one status, and ' +
			'takes 40 seconds. <code>EXPLAIN ANALYZE</code> shows why: the join hashes ' +
			'all 500k customers, probes with all 10 million orders, materializes 10 ' +
			'million joined rows — and <em>then</em> a filter node throws 99% of them ' +
			'away. Move the <code>WHERE</code> below the join and the same query runs ' +
			'in 400&nbsp;ms: the join now sees 100k orders, not 10 million. No index, ' +
			'no schema change — the optimizer just moved one node in a tree. That is ' +
			'what an optimizer rule <em>is</em>: a tree rewrite that provably keeps ' +
			'the answer and hopefully shrinks the work.</p>' +
			'<ul>' +
			'<li><strong>Plans are trees.</strong> <code>Scan</code> leaves produce ' +
			'rows; <code>Filter</code>, <code>Join</code>, <code>Project</code> nodes ' +
			'consume their children&rsquo;s rows. Every edge carries a cardinality — ' +
			'rows flowing from child to parent — and total cost tracks the sum of ' +
			'what flows across the edges.</li>' +
			'<li><strong>The rule.</strong> A <code>Filter</code> sitting on a ' +
			'<code>Join</code> may sink below it iff every column its predicate ' +
			'references comes from <em>one</em> side of the join. ' +
			'<code>o_status = &rsquo;open&rsquo;</code> only needs the orders side, so ' +
			'it slides down onto <code>scan(orders)</code>. A predicate touching both ' +
			'sides — <code>o_total &gt; c_credit</code> — needs joined rows to ' +
			'evaluate and must stay above.</li>' +
			'<li><strong>Selectivity as integer math.</strong> Each filter carries ' +
			'<code>KeepDiv</code>: it emits <code>rowsIn / KeepDiv</code> rows. ' +
			'<code>KeepDiv: 100</code> means keep 1 row in 100. The join uses the ' +
			'classic System&nbsp;R estimate <code>|L| &#183; |R| / KeyCard</code> ' +
			'where <code>KeyCard</code> is the distinct join-key count — and because ' +
			'that formula is linear in each input, dividing an input by 100 divides ' +
			'the output by 100 no matter which side of the join the filter sits on. ' +
			'The rewrite preserves cardinality by construction.</li>' +
			'</ul>',
			{ lang: 'txt', code: 'naive:  scan(orders) --10,000,000--> join --10,000,000--> filter ÷100 --100,000--> project\npushed: scan(orders) --10,000,000--> filter ÷100 --100,000--> join --100,000--> project\n\njoin input from the orders side: 10,000,000 -> 100,000   (100x smaller)\nrows the join materializes:      10,000,000 -> 100,000   (same final answer: 100,000)' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>The plan walk is done for you: <code>rowsOut</code> computes each ' +
			'node&rsquo;s cardinality and <code>Edges</code> renders every edge as ' +
			'<code>"child-&gt;parent: rows"</code> in a deterministic pre-order walk. ' +
			'Implement <code>Pushdown(n *Node) *Node</code>: rewrite the tree so ' +
			'every Filter whose columns all come from one side of the Join below it ' +
			'sinks onto that side (all the way to the scan), while cross-side ' +
			'filters stay put. Build new nodes — do not mutate the input tree.</p>',
			'<div class="tip">Recursion does the &ldquo;all the way down&rdquo; part ' +
			'for free: when a filter hops below a join, wrap its new child in a ' +
			'fresh Filter node and call <code>Pushdown</code> on <em>that</em> — if ' +
			'another join lurks beneath, the filter keeps sinking; if it hits the ' +
			'scan, the recursion bottoms out. Rewrite children before inspecting ' +
			'them, and stacked filters sort themselves out too.</div>',
		],

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'// Op tags a plan node. One struct with a kind tag (rather than an',
			'// interface per operator) keeps the tree literal-constructible in',
			'// tests and makes the rewrite a plain switch — the same trade',
			'// DuckDB makes with its LogicalOperator type field.',
			'type Op int',
			'',
			'const (',
			'	OpScan Op = iota',
			'	OpFilter',
			'	OpJoin',
			'	OpProject',
			')',
			'',
			'// Node is one operator in a logical plan tree. Only the fields for',
			'// the node\'s Op are meaningful; the rest stay zero.',
			'type Node struct {',
			'	Op      Op',
			'	Table   string   // Scan: table name',
			'	Rows    int64    // Scan: base cardinality',
			'	Cols    []string // Scan: columns produced; Filter: columns referenced',
			'	Label   string   // Filter: display name, e.g. "filter(o_status)"',
			'	KeepDiv int64    // Filter: emits rowsIn/KeepDiv rows (integer selectivity)',
			'	KeyCard int64    // Join: distinct join-key values (System R estimate)',
			'	Left    *Node    // Filter/Project child lives here too',
			'	Right   *Node    // Join only',
			'}',
			'',
			'// outCols is the set of columns a subtree can produce: scan columns,',
			'// unioned up through joins. Filters and projects pass their child',
			'// through untouched — this toy keeps projection pruning out of scope.',
			'// The map is only ever probed for membership, never iterated, so',
			'// map order cannot leak into output.',
			'func outCols(n *Node) map[string]bool {',
			'	cols := map[string]bool{}',
			'	var collect func(p *Node)',
			'	collect = func(p *Node) {',
			'		if p == nil {',
			'			return',
			'		}',
			'		if p.Op == OpScan {',
			'			for _, c := range p.Cols {',
			'				cols[c] = true',
			'			}',
			'			return',
			'		}',
			'		collect(p.Left)',
			'		collect(p.Right)',
			'	}',
			'	collect(n)',
			'	return cols',
			'}',
			'',
			'// hasAll reports whether every needed column is available. An empty',
			'// needs list is vacuously true — a constant predicate could go anywhere.',
			'func hasAll(needs []string, have map[string]bool) bool {',
			'	for _, c := range needs {',
			'		if !have[c] {',
			'			return false',
			'		}',
			'	}',
			'	return true',
			'}',
			'',
			'// rowsOut estimates the cardinality flowing OUT of a node. All integer',
			'// math: filters divide, joins use |L|*|R|/KeyCard. Divisors are',
			'// guarded so a malformed tree yields 0 rather than dividing by zero.',
			'func rowsOut(n *Node) int64 {',
			'	if n == nil {',
			'		return 0',
			'	}',
			'	switch n.Op {',
			'	case OpScan:',
			'		return n.Rows',
			'	case OpFilter:',
			'		if n.KeepDiv <= 0 {',
			'			return rowsOut(n.Left)',
			'		}',
			'		return rowsOut(n.Left) / n.KeepDiv',
			'	case OpJoin:',
			'		if n.KeyCard <= 0 {',
			'			return 0',
			'		}',
			'		return rowsOut(n.Left) * rowsOut(n.Right) / n.KeyCard',
			'	case OpProject:',
			'		return rowsOut(n.Left)',
			'	}',
			'	return 0',
			'}',
			'',
			'// nodeName renders a node for edge strings.',
			'func nodeName(n *Node) string {',
			'	switch n.Op {',
			'	case OpScan:',
			'		return "scan(" + n.Table + ")"',
			'	case OpFilter:',
			'		return n.Label',
			'	case OpJoin:',
			'		return "join"',
			'	case OpProject:',
			'		return "project"',
			'	}',
			'	return "?"',
			'}',
			'',
			'// Edges lists every edge as "child->parent: rows" in a pre-order walk',
			'// (left child before right) — deterministic because the tree is.',
			'func Edges(n *Node) []string {',
			'	edges := []string{}',
			'	var walk func(p *Node)',
			'	walk = func(p *Node) {',
			'		if p == nil {',
			'			return',
			'		}',
			'		for _, kid := range []*Node{p.Left, p.Right} {',
			'			if kid == nil {',
			'				continue',
			'			}',
			'			edges = append(edges, fmt.Sprintf("%s->%s: %d", nodeName(kid), nodeName(p), rowsOut(kid)))',
			'			walk(kid)',
			'		}',
			'	}',
			'	walk(n)',
			'	return edges',
			'}',
			'',
			'// Pushdown rewrites the tree: a Filter directly above a Join sinks',
			'// below it onto whichever side supplies ALL of the filter\'s columns',
			'// (recursively, so it lands on the scan); a filter referencing both',
			'// sides stays where it is. Must return a NEW tree, never mutate n.',
			'func Pushdown(n *Node) *Node {',
			'	// your code here — the stub returns the plan unchanged, so the',
			'	// join still chews 10M rows and the pushed-plan cases fail',
			'	return n',
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
			'func main() {',
			'	// Fresh trees per case: Pushdown must not mutate its input, but the',
			'	// harness does not rely on that — every case builds its own plan.',
			'	scanOrders := func() *Node {',
			'		return &Node{Op: OpScan, Table: "orders", Rows: 10000000, Cols: []string{"o_id", "o_cust", "o_status"}}',
			'	}',
			'	scanCust := func() *Node {',
			'		return &Node{Op: OpScan, Table: "customers", Rows: 500000, Cols: []string{"c_id", "c_region"}}',
			'	}',
			'	// KeyCard 500000 = distinct customer ids: the classic FK join where',
			'	// every order matches exactly one customer, so |L|*|R|/KeyCard = |L|.',
			'	mkJoin := func(l, r *Node) *Node {',
			'		return &Node{Op: OpJoin, KeyCard: 500000, Left: l, Right: r}',
			'	}',
			'	filtOrders := func(child *Node) *Node {',
			'		return &Node{Op: OpFilter, Label: "filter(o_status)", Cols: []string{"o_status"}, KeepDiv: 100, Left: child}',
			'	}',
			'	filtCust := func(child *Node) *Node {',
			'		return &Node{Op: OpFilter, Label: "filter(c_region)", Cols: []string{"c_region"}, KeepDiv: 10, Left: child}',
			'	}',
			'	filtCross := func(child *Node) *Node {',
			'		return &Node{Op: OpFilter, Label: "filter(o_status,c_region)", Cols: []string{"o_status", "c_region"}, KeepDiv: 2, Left: child}',
			'	}',
			'	proj := func(child *Node) *Node { return &Node{Op: OpProject, Left: child} }',
			'	edgeStr := func(n *Node) string { return strings.Join(Edges(n), " | ") }',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"naive plan edges: the join chews all 10M orders, the filter above discards 99%",',
			'			"filter(o_status)->project: 100000 | join->filter(o_status): 10000000 | scan(orders)->join: 10000000 | scan(customers)->join: 500000",',
			'			func() string {',
			'				return edgeStr(proj(filtOrders(mkJoin(scanOrders(), scanCust()))))',
			'			}},',
			'		{"pushdown: orders-only filter sinks onto scan(orders) — join input 100x smaller",',
			'			"join->project: 100000 | filter(o_status)->join: 100000 | scan(orders)->filter(o_status): 10000000 | scan(customers)->join: 500000",',
			'			func() string {',
			'				return edgeStr(Pushdown(proj(filtOrders(mkJoin(scanOrders(), scanCust())))))',
			'			}},',
			'		{"pushdown: customers-only filter sinks onto the build side — hash table 10x smaller",',
			'			"join->project: 1000000 | scan(orders)->join: 10000000 | filter(c_region)->join: 50000 | scan(customers)->filter(c_region): 500000",',
			'			func() string {',
			'				return edgeStr(Pushdown(proj(filtCust(mkJoin(scanOrders(), scanCust())))))',
			'			}},',
			'		{"cross-side predicate references both sides: it must NOT move",',
			'			"filter(o_status,c_region)->project: 5000000 | join->filter(o_status,c_region): 10000000 | scan(orders)->join: 10000000 | scan(customers)->join: 500000",',
			'			func() string {',
			'				return edgeStr(Pushdown(proj(filtCross(mkJoin(scanOrders(), scanCust())))))',
			'			}},',
			'		{"stacked filters: the pushable one sinks, the cross-side one stays above the join",',
			'			"filter(o_status,c_region)->project: 50000 | join->filter(o_status,c_region): 100000 | filter(o_status)->join: 100000 | scan(orders)->filter(o_status): 10000000 | scan(customers)->join: 500000",',
			'			func() string {',
			'				return edgeStr(Pushdown(proj(filtCross(filtOrders(mkJoin(scanOrders(), scanCust()))))))',
			'			}},',
			'		{"cardinality preserved: the rewrite changes work, never the answer",',
			'			"before=100000 after=100000",',
			'			func() string {',
			'				plan := proj(filtOrders(mkJoin(scanOrders(), scanCust())))',
			'				return fmt.Sprintf("before=%d after=%d", rowsOut(plan), rowsOut(Pushdown(plan)))',
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
			'import "fmt"',
			'',
			'// Op tags a plan node. One struct with a kind tag (rather than an',
			'// interface per operator) keeps the tree literal-constructible in',
			'// tests and makes the rewrite a plain switch — the same trade',
			'// DuckDB makes with its LogicalOperator type field.',
			'type Op int',
			'',
			'const (',
			'	OpScan Op = iota',
			'	OpFilter',
			'	OpJoin',
			'	OpProject',
			')',
			'',
			'// Node is one operator in a logical plan tree. Only the fields for',
			'// the node\'s Op are meaningful; the rest stay zero.',
			'type Node struct {',
			'	Op      Op',
			'	Table   string   // Scan: table name',
			'	Rows    int64    // Scan: base cardinality',
			'	Cols    []string // Scan: columns produced; Filter: columns referenced',
			'	Label   string   // Filter: display name, e.g. "filter(o_status)"',
			'	KeepDiv int64    // Filter: emits rowsIn/KeepDiv rows (integer selectivity)',
			'	KeyCard int64    // Join: distinct join-key values (System R estimate)',
			'	Left    *Node    // Filter/Project child lives here too',
			'	Right   *Node    // Join only',
			'}',
			'',
			'// outCols is the set of columns a subtree can produce: scan columns,',
			'// unioned up through joins. Probed for membership only, never',
			'// iterated, so map order cannot leak into output.',
			'func outCols(n *Node) map[string]bool {',
			'	cols := map[string]bool{}',
			'	var collect func(p *Node)',
			'	collect = func(p *Node) {',
			'		if p == nil {',
			'			return',
			'		}',
			'		if p.Op == OpScan {',
			'			for _, c := range p.Cols {',
			'				cols[c] = true',
			'			}',
			'			return',
			'		}',
			'		collect(p.Left)',
			'		collect(p.Right)',
			'	}',
			'	collect(n)',
			'	return cols',
			'}',
			'',
			'// hasAll reports whether every needed column is available.',
			'func hasAll(needs []string, have map[string]bool) bool {',
			'	for _, c := range needs {',
			'		if !have[c] {',
			'			return false',
			'		}',
			'	}',
			'	return true',
			'}',
			'',
			'// rowsOut estimates the cardinality flowing OUT of a node. All integer',
			'// math; divisors guarded so a malformed tree yields 0, never a panic.',
			'func rowsOut(n *Node) int64 {',
			'	if n == nil {',
			'		return 0',
			'	}',
			'	switch n.Op {',
			'	case OpScan:',
			'		return n.Rows',
			'	case OpFilter:',
			'		if n.KeepDiv <= 0 {',
			'			return rowsOut(n.Left)',
			'		}',
			'		return rowsOut(n.Left) / n.KeepDiv',
			'	case OpJoin:',
			'		if n.KeyCard <= 0 {',
			'			return 0',
			'		}',
			'		// |L| * |R| / distinct-keys: linear in each input, which is',
			'		// exactly why pushdown preserves the final cardinality — a',
			'		// factor of 100 divides out the same wherever it is applied.',
			'		return rowsOut(n.Left) * rowsOut(n.Right) / n.KeyCard',
			'	case OpProject:',
			'		return rowsOut(n.Left)',
			'	}',
			'	return 0',
			'}',
			'',
			'// nodeName renders a node for edge strings.',
			'func nodeName(n *Node) string {',
			'	switch n.Op {',
			'	case OpScan:',
			'		return "scan(" + n.Table + ")"',
			'	case OpFilter:',
			'		return n.Label',
			'	case OpJoin:',
			'		return "join"',
			'	case OpProject:',
			'		return "project"',
			'	}',
			'	return "?"',
			'}',
			'',
			'// Edges lists every edge as "child->parent: rows" in a pre-order walk',
			'// (left child before right) — deterministic because the tree is.',
			'func Edges(n *Node) []string {',
			'	edges := []string{}',
			'	var walk func(p *Node)',
			'	walk = func(p *Node) {',
			'		if p == nil {',
			'			return',
			'		}',
			'		for _, kid := range []*Node{p.Left, p.Right} {',
			'			if kid == nil {',
			'				continue',
			'			}',
			'			edges = append(edges, fmt.Sprintf("%s->%s: %d", nodeName(kid), nodeName(p), rowsOut(kid)))',
			'			walk(kid)',
			'		}',
			'	}',
			'	walk(n)',
			'	return edges',
			'}',
			'',
			'// Pushdown rewrites bottom-up and pure: children first, then this node,',
			'// always building fresh Nodes so the caller\'s tree survives intact.',
			'// (Optimizers keep the original plan around for costing alternatives;',
			'// mutating shared subtrees is a classic source of heisenbugs there.)',
			'//',
			'//	Filter(cols⊆left)          Join',
			'//	   |                      /    \\',
			'//	  Join          =>   Filter    right',
			'//	 /    \\                 |',
			'//	left  right           left',
			'func Pushdown(n *Node) *Node {',
			'	if n == nil {',
			'		return nil',
			'	}',
			'	switch n.Op {',
			'	case OpScan:',
			'		// Leaves are immutable and never rewritten — share them.',
			'		return n',
			'	case OpProject:',
			'		return &Node{Op: OpProject, Left: Pushdown(n.Left)}',
			'	case OpJoin:',
			'		return &Node{Op: OpJoin, KeyCard: n.KeyCard, Left: Pushdown(n.Left), Right: Pushdown(n.Right)}',
			'	case OpFilter:',
			'		// Rewrite the child FIRST: if a filter below us just sank',
			'		// through the join, our own child may now be the join itself',
			'		// (the stacked-filters case falls out of this ordering).',
			'		child := Pushdown(n.Left)',
			'		if child != nil && child.Op == OpJoin {',
			'			if hasAll(n.Cols, outCols(child.Left)) {',
			'				// Every referenced column comes from the left side:',
			'				// re-parent the filter there, then push AGAIN so it',
			'				// keeps sinking through any joins below until it',
			'				// rests on the scan. Recursion bottoms out at leaves.',
			'				sunk := Pushdown(&Node{Op: OpFilter, Label: n.Label, Cols: n.Cols, KeepDiv: n.KeepDiv, Left: child.Left})',
			'				return &Node{Op: OpJoin, KeyCard: child.KeyCard, Left: sunk, Right: child.Right}',
			'			}',
			'			if hasAll(n.Cols, outCols(child.Right)) {',
			'				sunk := Pushdown(&Node{Op: OpFilter, Label: n.Label, Cols: n.Cols, KeepDiv: n.KeepDiv, Left: child.Right})',
			'				return &Node{Op: OpJoin, KeyCard: child.KeyCard, Left: child.Left, Right: sunk}',
			'			}',
			'			// References both sides: only joined rows can evaluate it.',
			'		}',
			'		return &Node{Op: OpFilter, Label: n.Label, Cols: n.Cols, KeepDiv: n.KeepDiv, Left: child}',
			'	}',
			'	return n',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Optimizer rules are tree rewrites</h3>' +
			'<p>DuckDB&rsquo;s optimizer is a pipeline of passes, each a function ' +
			'from plan tree to plan tree: filter pushdown, filter <em>pullup</em> ' +
			'(to then push a merged filter elsewhere), join-order enumeration, ' +
			'projection pruning, common-subexpression elimination. Pushdown runs ' +
			'early because everything downstream benefits from smaller ' +
			'cardinalities — the join-order optimizer costs plans by estimated ' +
			'rows, and those estimates come from exactly the kind of arithmetic ' +
			'<code>rowsOut</code> does (real systems estimate selectivity from ' +
			'histograms and distinct counts instead of a given divisor; the ' +
			'<code>|L|&#183;|R|/max(NDV)</code> join estimate is straight out of ' +
			'System&nbsp;R, 1979).</p>' +
			'<h3>The rule goes further than the join</h3>' +
			'<p>Real pushdown does not stop at the scan node — it keeps going ' +
			'<em>into</em> the scan. DuckDB hands pushed predicates to its table ' +
			'functions: a Parquet reader gets <code>o_status = &rsquo;open&rsquo;</code> ' +
			'and checks it against row-group zone maps (min/max statistics), ' +
			'skipping entire 120k-row groups whose ranges cannot match — the ' +
			'filter now prunes I/O, not just tuples. Pushdown also multiplies ' +
			'with other rules: a filter pushed below a join can flip which side is ' +
			'smaller, changing the join-order optimizer&rsquo;s choice of build ' +
			'side; the 100&#215; smaller hash table then fits in L2 instead of ' +
			'spilling. And equality filters generate <em>new</em> filters: ' +
			'<code>o_cust = c_id AND c_id = 42</code> implies ' +
			'<code>o_cust = 42</code>, pushable to the other side — transitive ' +
			'filter derivation.</p>' +
			'<h3>When the rule must hold its fire</h3>' +
			'<p>Correctness carves out real exceptions. Below the <em>outer</em> ' +
			'side of an outer join, a filter changes the answer: rows the filter ' +
			'kills would have survived as NULL-padded rows, so ' +
			'<code>LEFT JOIN ... WHERE r.x = 1</code> can push into the left input ' +
			'but not the right (unless the predicate rejects NULLs, in which case ' +
			'the optimizer first simplifies the outer join to an inner one — ' +
			'another rewrite). Volatile predicates (<code>random() &lt; 0.01</code>) ' +
			'must not be pushed past operators that change how many times they run. ' +
			'And an <em>expensive</em> predicate — a regex, a UDF — pushed below a ' +
			'join that would have discarded most rows can be a pessimization: ' +
			'evaluation count matters, not just cardinality, which is why some ' +
			'systems cost predicates before moving them.</p>' +
			'<h3>Why this is the highest-leverage rule</h3>' +
			'<p>Every operator above the filter is linear-or-worse in its input: ' +
			'hashing 10M rows costs 100&#215; more than hashing 100k, the hash ' +
			'table is 100&#215; larger (cache misses compound the loss), and 10M ' +
			'materialized join rows have to be allocated just to be freed. The ' +
			'rewrite itself costs microseconds — one walk over a tree with tens of ' +
			'nodes. That asymmetry, milliseconds of planning against seconds of ' +
			'execution, is the entire business case for query optimizers.</p>',
		],
		complexity: { time: 'O(n) nodes for the rewrite; the Edges walk recomputes child cardinalities, O(n²) on a degenerate chain — irrelevant at plan sizes of tens of nodes', space: 'O(n) for the rewritten tree (scan leaves are shared)' },
	});
})();
