/* The Query Planner: Index Choice — Planner (Medium). An index on
 * (a,b) is a phone book sorted by a then b: usable for WHERE a=?, for
 * a=? AND b=?, for a=? AND b>? — and USELESS for WHERE b=? alone. The
 * usable prefix is leading equality columns plus at most one range
 * column; a covering index also contains every selected column and
 * skips the table probe entirely. The harness pins prefix computation,
 * covering detection, and a documented rows-examined cost proxy
 * choosing between full scan, index scan, and covering index scan.
 */
(function () {
	'use strict';
	var T = GoLearnSQ;

	// The usable prefix of a composite index: equalities march left to
	// right, one range may follow, everything after is dead weight.
	// Marker id namespaced (dgArrowSQ10) because every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="index on columns a, b, c with WHERE a=1 AND b>5: column a is a usable equality, b is the one usable range, c is unusable after the range; WHERE b=5 alone matches no leading column and cannot use the index">' +
		'<text x="20" y="22" class="lbl">index on (a, b, c)   —   WHERE a = 1 AND b &gt; 5 AND c = 9</text>' +
		'<rect x="20" y="38" width="120" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="80" y="60" text-anchor="middle">a = 1</text>' +
		'<text x="80" y="76" text-anchor="middle" class="lbl">equality: narrows</text>' +
		'<path d="M 140 60 L 162 60" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ10)"/>' +
		'<rect x="166" y="38" width="120" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="226" y="60" text-anchor="middle">b &gt; 5</text>' +
		'<text x="226" y="76" text-anchor="middle" class="lbl" style="fill:var(--warn)">ONE range: last usable</text>' +
		'<path d="M 286 60 L 308 60" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ10)"/>' +
		'<rect x="312" y="38" width="120" height="44" rx="5" fill="none" stroke="var(--edge)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<text x="372" y="60" text-anchor="middle">c = 9</text>' +
		'<text x="372" y="76" text-anchor="middle" class="lbl">after a range: unusable</text>' +
		'<text x="20" y="118" class="lbl">why: entries are sorted by a, then b, then c. Fixing a keeps b sorted —</text>' +
		'<text x="20" y="136" class="lbl">but within "b &gt; 5" the c values are scattered, so c cannot be sought.</text>' +
		'<text x="20" y="166" class="lbl" style="fill:var(--warn)">WHERE b = 5 alone: no leading column constrained — the index cannot be entered at all.</text>' +
		'<text x="20" y="186" class="lbl">an index on (a,b) is useless for b=? — the single most common indexing mistake</text>' +
		'<defs><marker id="dgArrowSQ10" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'query-planner-choices',
		title: 'The Query Planner: Index Choice',
		nav: 'query planner',
		difficulty: 'Medium',
		category: 'Planner',
		task: 'Implement UsablePrefix (leading equalities + at most one range), Covering (index contains all selected columns; rowid rides free), and ChoosePlan — a documented rows-examined cost proxy picking full scan, index scan, or covering index scan.',

		prose: [
			'<h2>The Query Planner: Index Choice</h2>' +
			'<p>A dashboard query takes 4 seconds. “But we have an index on ' +
			'<code>(org_id, created_at)</code>!” — and ' +
			'<code>EXPLAIN QUERY PLAN</code> says <code>SCAN events</code> ' +
			'anyway, because the WHERE clause only constrains ' +
			'<code>created_at</code>. A composite index is a phone book: sorted ' +
			'by last name, then first name. It finds every <em>Smith</em> ' +
			'instantly, every <em>Smith,&nbsp;John</em> faster — and it is ' +
			'worthless for finding everyone named John. The planner’s rules for ' +
			'what an index can do are mechanical, and you can implement them:</p>' +
			'<ul>' +
			'<li><strong>Usable prefix.</strong> Walk the index columns left to ' +
			'right. Each column with an equality (<code>=</code>) term extends ' +
			'the prefix. The first column with only a range term ' +
			'(<code>&lt;</code>, <code>&gt;</code>, <code>&lt;=</code>, ' +
			'<code>&gt;=</code>) is usable too — but it is the <em>last</em> ' +
			'usable column: within a range, later columns are unsorted. A ' +
			'column with no term stops the walk. No usable columns → the index ' +
			'cannot be entered.</li>' +
			'<li><strong>Covering index.</strong> If every selected column is in ' +
			'the index (the rowid rides along free in every index entry), the ' +
			'answer comes straight out of the index B-tree — no table probe per ' +
			'row. Same probes-halved logic as the rowid lesson.</li>' +
			'<li><strong>Cost is rows examined.</strong> The real planner uses ' +
			'collected statistics (<code>ANALYZE</code>); this lesson uses its ' +
			'documented default-shaped proxy:</li>' +
			'</ul>',
			{ lang: 'txt', code: 'cost proxy (rows examined; integer division, floor 1):\n\n  full scan:            cost = tableRows\n  index scan:  est = tableRows / 10 per equality column\n               est = est / 3    if a range column is used\n               cost = 2 * est   (index rows + one table probe each)\n  covering:    cost = est       (no table probes)\n\n  an index with NO usable column is not a candidate at all.\n  candidates in order: full scan, then each index as given;\n  strictly lower cost wins — ties keep the earlier candidate.' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p><code>UsablePrefix(idx, where)</code> returns (equality columns ' +
			'used, range column used?). <code>Covering(idx, selectCols)</code> ' +
			'treats <code>"rowid"</code> as always present. ' +
			'<code>ChoosePlan(tableRows, indexes, where, selectCols)</code> ' +
			'returns the winner formatted exactly as ' +
			'<code>"full-scan cost=N"</code>, ' +
			'<code>"index-scan(NAME) cost=N"</code>, or ' +
			'<code>"covering-index(NAME) cost=N"</code>.</p>',
		],

		starter: [
			'package main',
			'',
			'// Term is one WHERE conjunct: Col Op ?, with Op one of',
			'// "=", "<", ">", "<=", ">=".',
			'type Term struct {',
			'	Col string',
			'	Op  string',
			'}',
			'',
			'// Index is a named index over an ordered column list.',
			'type Index struct {',
			'	Name string',
			'	Cols []string',
			'}',
			'',
			'// UsablePrefix walks idx.Cols left to right: equality terms extend',
			'// the prefix; the first range-only column is used too but ends the',
			'// walk; a column with no term ends it immediately. Returns the',
			'// number of equality columns used and whether a range column is.',
			'func UsablePrefix(idx Index, where []Term) (int, bool) {',
			'	// your code here',
			'	return 0, false',
			'}',
			'',
			'// Covering reports whether every selected column is available in',
			'// the index. "rowid" is always available: every index entry',
			'// carries the rowid to find its table row.',
			'func Covering(idx Index, selectCols []string) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// ChoosePlan applies the documented cost proxy: full scan costs',
			'// tableRows; a usable index estimates tableRows/10 per equality',
			'// column, /3 more for a range (integer division, floor 1), and',
			'// costs 2*est — or est alone when covering. Candidates in order:',
			'// full scan, then each index; strictly lower cost wins.',
			'// Format: "full-scan cost=N" | "index-scan(NAME) cost=N" |',
			'// "covering-index(NAME) cost=N".',
			'func ChoosePlan(tableRows int, indexes []Index, where []Term, selectCols []string) string {',
			'	// your code here',
			'	return ""',
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
			T.HARNESS_RT,
			'',
			'func main() {',
			'	idxAB := Index{Name: "idx_ab", Cols: []string{"a", "b"}}',
			'	idxABC := Index{Name: "idx_abc", Cols: []string{"a", "b", "c"}}',
			'	idxA := Index{Name: "idx_a", Cols: []string{"a"}}',
			'',
			'	eq := func(col string) Term { return Term{Col: col, Op: "="} }',
			'	gt := func(col string) Term { return Term{Col: col, Op: ">"} }',
			'',
			'	pfx := func(idx Index, where ...Term) string {',
			'		e, r := UsablePrefix(idx, where)',
			'		return fmt.Sprintf("%d/%v", e, r)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"full equality prefix: (a,b) with a= AND b= uses both",',
			'			"2/false",',
			'			func() string { return pfx(idxAB, eq("a"), eq("b")) }},',
			'		{"THE classic: (a,b) with WHERE b=? alone is unusable — 0 columns",',
			'			"0/false",',
			'			func() string { return pfx(idxAB, eq("b")) }},',
			'		{"equality then range: (a,b) with a= AND b> uses one eq + the range",',
			'			"1/true",',
			'			func() string { return pfx(idxAB, eq("a"), gt("b")) }},',
			'		{"a range ends the walk: (a,b,c) with a=, b>, c= — c is wasted",',
			'			"1/true",',
			'			func() string { return pfx(idxABC, eq("a"), gt("b"), eq("c")) }},',
			'		{"range on the FIRST column still enters the index: (a,b) with a>",',
			'			"0/true",',
			'			func() string { return pfx(idxAB, gt("a")) }},',
			'		{"a gap stops everything: (a,b,c) with a= AND c= uses only a",',
			'			"1/false",',
			'			func() string { return pfx(idxABC, eq("a"), eq("c")) }},',
			'		{"term order in WHERE is irrelevant: b=, a= still fills (a,b)",',
			'			"2/false",',
			'			func() string { return pfx(idxAB, eq("b"), eq("a")) }},',
			'		{"covering: (a,b) covers SELECT a,b and SELECT b — but not SELECT a,x",',
			'			"true true false",',
			'			func() string {',
			'				return fmt.Sprintf("%v %v %v",',
			'					Covering(idxAB, []string{"a", "b"}),',
			'					Covering(idxAB, []string{"b"}),',
			'					Covering(idxAB, []string{"a", "x"}))',
			'			}},',
			'		{"rowid rides free: (a) covers SELECT rowid, a",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", Covering(idxA, []string{"rowid", "a"})) }},',
			'		{"no usable index (WHERE b=? against idx_ab): full scan of 1000 rows",',
			'			"full-scan cost=1000",',
			'			func() string {',
			'				return ChoosePlan(1000, []Index{idxAB}, []Term{eq("b")}, []string{"x"})',
			'			}},',
			'		{"plain index scan: a=? narrows 1000 to 100, doubled for table probes",',
			'			"index-scan(idx_a) cost=200",',
			'			func() string {',
			'				return ChoosePlan(1000, []Index{idxA}, []Term{eq("a")}, []string{"x"})',
			'			}},',
			'		{"covering beats plain: idx_ab answers SELECT a,b without table probes",',
			'			"covering-index(idx_ab) cost=100",',
			'			func() string {',
			'				return ChoosePlan(1000, []Index{idxA, idxAB}, []Term{eq("a")}, []string{"a", "b"})',
			'			}},',
			'		{"equality + range compound: a=? AND b>? on idx_ab, covering",',
			'			"covering-index(idx_ab) cost=33",',
			'			func() string {',
			'				return ChoosePlan(1000, []Index{idxAB}, []Term{eq("a"), gt("b")}, []string{"b"})',
			'			}},',
			'		{"tiny table: index est floors at 1, cost 2 ties full scan — tie keeps full scan",',
			'			"full-scan cost=2",',
			'			func() string {',
			'				return ChoosePlan(2, []Index{idxA}, []Term{eq("a")}, []string{"x"})',
			'			}},',
			'		{"no WHERE at all: nothing to seek, full scan",',
			'			"full-scan cost=500",',
			'			func() string { return ChoosePlan(500, []Index{idxA, idxAB}, nil, []string{"x"}) }},',
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
			'// Term is one WHERE conjunct: Col Op ?.',
			'type Term struct {',
			'	Col string',
			'	Op  string',
			'}',
			'',
			'// Index is a named index over an ordered column list.',
			'type Index struct {',
			'	Name string',
			'	Cols []string',
			'}',
			'',
			'// isRange classifies the operators that can start an index range',
			'// scan. Anything else (LIKE, !=, IS NULL...) is out of scope here —',
			'// the real planner has per-operator rules, same skeleton.',
			'func isRange(op string) bool {',
			'	return op == "<" || op == ">" || op == "<=" || op == ">="',
			'}',
			'',
			'// UsablePrefix walks index columns left to right. The loop encodes',
			'// the physical argument, not a heuristic: fixing a column by',
			'// equality keeps the NEXT column sorted (so the walk continues);',
			'// a range keeps this column seekable but scatters all later ones',
			'// (so the walk must stop); an unconstrained column was never',
			'// sorted from the reader\'s point of view at all.',
			'func UsablePrefix(idx Index, where []Term) (int, bool) {',
			'	eqCols := 0',
			'	for _, col := range idx.Cols {',
			'		hasEq := false',
			'		hasRange := false',
			'		for _, t := range where {',
			'			if t.Col != col {',
			'				continue',
			'			}',
			'			if t.Op == "=" {',
			'				hasEq = true',
			'			} else if isRange(t.Op) {',
			'				hasRange = true',
			'			}',
			'		}',
			'		// Equality wins when both exist (a=5 AND a>3): the planner',
			'		// prefers the tighter constraint and the walk continues.',
			'		if hasEq {',
			'			eqCols++',
			'			continue',
			'		}',
			'		if hasRange {',
			'			return eqCols, true // the range column is the last usable one',
			'		}',
			'		break // no term on this column: nothing further can be used',
			'	}',
			'	return eqCols, false',
			'}',
			'',
			'// Covering: every selected column must live in the index. The',
			'// rowid exception is structural, not a favor — table-tree rowids',
			'// are what index entries point WITH, so every entry carries one.',
			'func Covering(idx Index, selectCols []string) bool {',
			'	for _, want := range selectCols {',
			'		if want == "rowid" {',
			'			continue',
			'		}',
			'		found := false',
			'		for _, col := range idx.Cols {',
			'			if col == want {',
			'				found = true',
			'				break',
			'			}',
			'		}',
			'		if !found {',
			'			return false',
			'		}',
			'	}',
			'	return true',
			'}',
			'',
			'// ChoosePlan runs the documented cost proxy over the candidates.',
			'// Full scan is candidate zero and ties keep the earlier candidate,',
			'// which encodes a real planner bias: never pick a fancier plan',
			'// without a strictly better estimate.',
			'func ChoosePlan(tableRows int, indexes []Index, where []Term, selectCols []string) string {',
			'	best := fmt.Sprintf("full-scan cost=%d", tableRows)',
			'	bestCost := tableRows',
			'	for _, idx := range indexes {',
			'		eqCols, hasRange := UsablePrefix(idx, where)',
			'		if eqCols == 0 && !hasRange {',
			'			continue // cannot even enter this index',
			'		}',
			'		// The selectivity guesses are SQLite\'s own ANALYZE-less',
			'		// defaults in spirit: an equality keeps ~1/10 of rows, a',
			'		// range ~1/3. Floor at 1 — an index never yields less than',
			'		// the row it finds.',
			'		est := tableRows',
			'		for i := 0; i < eqCols; i++ {',
			'			est = est / 10',
			'		}',
			'		if hasRange {',
			'			est = est / 3',
			'		}',
			'		if est < 1 {',
			'			est = 1',
			'		}',
			'		cost := 2 * est // index row + table probe, per row',
			'		label := "index-scan"',
			'		if Covering(idx, selectCols) {',
			'			cost = est // the table tree is never touched',
			'			label = "covering-index"',
			'		}',
			'		if cost < bestCost {',
			'			bestCost = cost',
			'			best = fmt.Sprintf("%s(%s) cost=%d", label, idx.Name, cost)',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why "one range then stop" is physics, not policy</h3>' +
			'<p>An index B-tree stores entries sorted by its column list, ' +
			'compared left to right — the record-comparison rules from the ' +
			'record lesson. Equality on the leading columns pins the search to ' +
			'one contiguous run of entries in which the next column is sorted; ' +
			'a range term selects a contiguous <em>sub-run</em> — but inside it, ' +
			'later columns cycle through their values in no useful order. Any ' +
			'further term can only <em>filter</em> rows the scan already ' +
			'touched, never reduce what is touched. That is also why column ' +
			'ORDER inside an index matters more than which columns are in it: ' +
			'(org_id, created_at) serves the dashboard query; (created_at, ' +
			'org_id) does not. The fix for the hook is a one-liner — reorder ' +
			'the index — and rows examined drops by orders of magnitude.</p>' +
			'<h3>What the real planner adds</h3>' +
			'<p>Your /10 and /3 guesses are the shape of SQLite’s defaults when ' +
			'it knows nothing about the data. <code>ANALYZE</code> replaces them ' +
			'with measured selectivity in the <code>sqlite_stat1</code> table ' +
			'(and <code>sqlite_stat4</code> histograms), which is how the ' +
			'planner learns that <code>status=\'deleted\'</code> matches 0.1% ' +
			'of rows while <code>status=\'active\'</code> matches 90%. The real ' +
			'cost model also weighs ordering (an index that delivers rows ' +
			'pre-sorted can delete an ORDER BY sort step), OR-clause ' +
			'decomposition, and partial indexes. But the skeleton is exactly ' +
			'what you built: enumerate candidates, estimate rows examined, keep ' +
			'the cheapest — and the tie-break toward the simpler plan is real ' +
			'too.</p>' +
			'<h3>Reading the planner’s mind</h3>' +
			'<p><code>EXPLAIN QUERY PLAN</code> prints your function’s output in ' +
			'sqlite3’s dialect: <code>SCAN t</code> is your full scan; ' +
			'<code>SEARCH t USING INDEX idx_ab (a=?)</code> is an index scan ' +
			'with its usable prefix in parentheses; <code>USING COVERING ' +
			'INDEX</code> is the no-table-probe case. When a query is slow, ' +
			'diff the parenthesized prefix against your WHERE clause — a ' +
			'missing leading column, or a range where you expected an equality ' +
			'(<code>LIKE \'abc%\'</code> is a range!), is the answer nine times ' +
			'out of ten. And <code>.expert</code> in the sqlite3 shell will ' +
			'propose the index the planner wishes it had.</p>',
		],
		complexity: { time: 'O(indexes × index-cols × where-terms) — tiny, run once per query at plan time', space: 'O(1)' },
	});
})();
