/* Generate Parentheses — Backtracking (Medium). The cleanest demonstration
 * that in backtracking the CONSTRAINTS are the algorithm: two if-guards
 * (open < n, close < open) prune the 2^(2n) brute-force tree down to
 * exactly the Catalan-many valid strings — nothing invalid is ever built.
 * Output order is unspecified, so the harness sorts copies of both got
 * and want before comparing.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 230" width="500" height="230" role="img" aria-label="pruned decision tree generating balanced parentheses for n=2">' +
		'<text x="20" y="16" class="lbl">decision tree for n = 2 — invalid branches are never entered</text>' +
		// edges (legal, solid)
		'<g stroke="var(--edge)" fill="none">' +
		'<line x1="240" y1="42" x2="180" y2="64"/>' +      // root -> "("
		'<line x1="162" y1="84" x2="105" y2="106"/>' +     // "(" -> "(("
		'<line x1="178" y1="84" x2="232" y2="106"/>' +     // "(" -> "()"
		'<line x1="100" y1="126" x2="102" y2="148"/>' +    // "((" -> "(()"
		'<line x1="240" y1="126" x2="242" y2="148"/>' +    // "()" -> "()("
		'<line x1="102" y1="168" x2="102" y2="190"/>' +    // "(()" -> "(())"
		'<line x1="242" y1="168" x2="242" y2="190"/>' +    // "()(" -> "()()"
		'</g>' +
		// pruned edges (dashed, err)
		'<g stroke="var(--err-edge)" stroke-dasharray="4 3" fill="none">' +
		'<line x1="260" y1="42" x2="320" y2="64"/>' +      // root -> ")"
		'<line x1="90" y1="126" x2="36" y2="148"/>' +      // "((" -> "((("
		'</g>' +
		// root
		'<rect x="232" y="22" width="36" height="20" rx="4" fill="var(--panel)" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="250" y="37" text-anchor="middle" class="lbl">“”</text>' +
		// level 1
		'<rect x="152" y="64" width="36" height="20" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="170" y="79" text-anchor="middle">(</text>' +
		'<rect x="312" y="64" width="36" height="20" rx="4" fill="var(--panel)" stroke="var(--err-edge)" stroke-dasharray="4 3"/>' +
		'<text x="330" y="79" text-anchor="middle" style="fill:var(--err-edge)">)</text>' +
		'<text x="358" y="79" class="lbl">✗ close &lt; open fails — never recurse</text>' +
		// level 2
		'<rect x="82" y="106" width="36" height="20" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="100" y="121" text-anchor="middle">((</text>' +
		'<rect x="222" y="106" width="36" height="20" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="240" y="121" text-anchor="middle">()</text>' +
		// level 3
		'<rect x="12" y="148" width="44" height="20" rx="4" fill="var(--panel)" stroke="var(--err-edge)" stroke-dasharray="4 3"/>' +
		'<text x="34" y="163" text-anchor="middle" style="fill:var(--err-edge)">(((</text>' +
		'<rect x="80" y="148" width="44" height="20" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="102" y="163" text-anchor="middle">(()</text>' +
		'<rect x="220" y="148" width="44" height="20" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="242" y="163" text-anchor="middle">()(</text>' +
		// annotation arrow to the pruned "(((" node
		'<path d="M 120 210 C 70 208 45 190 36 172" fill="none" stroke="var(--err-edge)" stroke-width="1.2" marker-end="url(#dgArrowGP)"/>' +
		'<text x="126" y="214" class="lbl">✗ open = n already — no third ‘(’</text>' +
		// leaves
		'<g fill="var(--panel)" stroke="var(--ok)" stroke-width="1.6">' +
		'<rect x="76" y="190" width="52" height="20" rx="4"/>' +
		'<rect x="216" y="190" width="52" height="20" rx="4"/>' +
		'</g>' +
		'<text x="102" y="205" text-anchor="middle" style="fill:var(--ok)">(())</text>' +
		'<text x="242" y="205" text-anchor="middle" style="fill:var(--ok)">()()</text>' +
		'<text x="330" y="150" class="lbl">every leaf reached is valid —</text>' +
		'<text x="330" y="166" class="lbl">no generate-then-filter step</text>' +
		'<defs><marker id="dgArrowGP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'generate-parentheses',
		title: 'Generate Parentheses',
		nav: 'Generate Parentheses',
		difficulty: 'Medium',
		category: 'Backtracking',
		task: 'Implement generateParenthesis — make all 4 tests pass.',

		prose: [
			'<h2>Generate Parentheses</h2>' +
			'<p>Given <code>n ≥ 1</code>, return <em>all</em> strings of <code>n</code> pairs ' +
			'of well-formed (balanced) parentheses.</p>' +
			'<ul><li>Every string has exactly <code>2n</code> characters.</li>' +
			'<li>Return the strings in <em>any order</em> — the tests sort copies of both ' +
			'your answer and the expected list before comparing.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'generateParenthesis(1)  →  ["()"]\ngenerateParenthesis(3)  →  ["((()))" "(()())" "(())()" "()(())" "()()()"]   // any order', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Build the string one character at a time. At every step there are only two ' +
			'moves, and each has one legality rule: place <code>\'(\'</code> while ' +
			'<code>open &lt; n</code> (pairs left to start), place <code>\')\'</code> while ' +
			'<code>close &lt; open</code> (an unmatched <code>\'(\'</code> exists to close). ' +
			'Follow only legal moves and every path of length 2n is a valid answer:</p>' +
			DIAGRAM +
			'<p>The rules don’t just <em>check</em> answers — they <em>steer</em> the search ' +
			'so invalid strings are never even started.</p>',
		],

		starter: [
			'package main',
			'',
			'// generateParenthesis returns all strings of n pairs of well-formed',
			'// parentheses, n >= 1. The strings may be returned in any order;',
			'// the tests sort before comparing.',
			'func generateParenthesis(n int) []string {',
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
			'	"sort"',
			')',
			'',
			LC.HARNESS_RT,
			'',
			'// sortedStrings returns a sorted COPY (never mutate what the user',
			'// returned). Output order is unspecified, so got and want are both',
			'// normalized this way before comparing — any correct answer passes.',
			'func sortedStrings(ss []string) []string {',
			'	cp := append([]string(nil), ss...)',
			'	sort.Strings(cp)',
			'	return cp',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		n    int',
			'		want []string',
			'	}',
			'	cases := []tc{',
			'		{1, []string{"()"}},',
			'		{2, []string{"(())", "()()"}},',
			'		{3, []string{"((()))", "(()())", "(())()", "()(())", "()()()"}},',
			'		// Catalan(4) = 14 — big enough to catch pruning bugs (a wrong',
			'		// guard like close <= open silently inflates the count).',
			'		{4, []string{',
			'			"(((())))", "((()()))", "((())())", "((()))()", "(()(()))",',
			'			"(()()())", "(()())()", "(())(())", "(())()()", "()((()))",',
			'			"()(()())", "()(())()", "()()(())", "()()()()",',
			'		}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("n=%d", c.n),',
			'			"want":  fmt.Sprintf("%v (any order)", sortedStrings(c.want)),',
			'		}',
			'		runCase(r, func() {',
			'			got := generateParenthesis(c.n)',
			'			r["pass"] = fmt.Sprintf("%v", sortedStrings(got)) == fmt.Sprintf("%v", sortedStrings(c.want))',
			'			r["got"] = fmt.Sprintf("%v", sortedStrings(got))',
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
			'// generateParenthesis returns all strings of n well-formed bracket',
			'// pairs.',
			'//',
			'// Constrained backtracking: the two legality rules are checked BEFORE',
			'// recursing, so the search tree contains only prefixes of valid',
			'// strings and every length-2n path is an answer — no generate-then-',
			'// filter pass, no validity check at the leaf.',
			'//',
			'//   open  < n     → a pair is still unstarted, \'(\' is legal',
			'//   close < open  → an unmatched \'(\' exists, \')\' is legal',
			'//',
			'// One shared byte buffer holds the branch being explored; push,',
			'// recurse, pop. string(buf) at the leaf copies the bytes, so the',
			'// recorded answer is immune to later pops.',
			'func generateParenthesis(n int) []string {',
			'	res := []string{}',
			'	buf := make([]byte, 0, 2*n) // the prefix built so far on this branch',
			'',
			'	var place func(open, close int)',
			'	place = func(open, close int) {',
			'		if len(buf) == 2*n {',
			'			// Leaf: n opens and n closes placed, every prefix was legal',
			'			// — by construction this is balanced. string() snapshots.',
			'			res = append(res, string(buf))',
			'			return',
			'		}',
			'		if open < n { // prune: never start more than n pairs',
			'			buf = append(buf, \'(\')',
			'			place(open+1, close)',
			'			buf = buf[:len(buf)-1] // backtrack: undo the choice',
			'		}',
			'		if close < open { // prune: never close what isn\'t open',
			'			buf = append(buf, \')\')',
			'			place(open, close+1)',
			'			buf = buf[:len(buf)-1]',
			'		}',
			'	}',
			'	place(0, 0)',
			'	return res',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force: generate, then filter</h3>' +
			'<p>Every position is <code>\'(\'</code> or <code>\')\'</code>, so enumerate all ' +
			'2<sup>2n</sup> strings and keep the balanced ones. At n=4 that is 256 candidates ' +
			'for 14 answers; at n=10, over a million candidates for 16,796. Almost all the ' +
			'work builds garbage — strings that were doomed from their very first character ' +
			'(anything starting with <code>\')\'</code>).</p>' +
			'<h3>Insight: let the constraints steer, not filter</h3>' +
			'<p>A prefix can be extended to a balanced string exactly when it has never ' +
			'closed more than it opened and hasn’t opened more than n. So check the rules ' +
			'<em>before recursing</em> — an illegal branch is never entered, and every leaf ' +
			'reached is valid by construction:</p>',
			{ code: 'if open < n {        // \'(\' legal: a pair is still unstarted\n\tbuf = append(buf, \'(\')\n\tplace(open+1, close)\n\tbuf = buf[:len(buf)-1] // backtrack\n}\nif close < open {    // \')\' legal: an unmatched \'(\' exists\n\tbuf = append(buf, \')\')\n\tplace(open, close+1)\n\tbuf = buf[:len(buf)-1]\n}' },
			'<p>Compare with Subsets, where both branches are always legal: here the guards ' +
			'do all the shaping. The number of leaves is the n-th <strong>Catalan ' +
			'number</strong> C(n) = (2n choose n)/(n+1) — 1, 2, 5, 14, 42, … — so the ' +
			'pruned tree is exponentially smaller than the 2<sup>2n</sup> brute-force one, ' +
			'and the work done is proportional to answers produced, not candidates ' +
			'discarded.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Constrained backtracking — prune before recursing, not after</strong> ' +
			'— reach for it whenever a problem says “generate all valid X” and validity has ' +
			'a <em>prefix-checkable</em> rule (a partial answer already tells you it can never ' +
			'become legal). Cost: O(answer count × answer length) instead of O(all ' +
			'candidates); here Catalan-number growth instead of 2<sup>2n</sup>. The same ' +
			'choose–recurse–undo skeleton drives <em>Subsets</em> (no pruning — both branches ' +
			'always legal), <em>Combination Sum</em> (prune when the running sum exceeds the ' +
			'target), and <em>Word Search</em> (prune on letter mismatch); it is also how ' +
			'N-Queens and Sudoku solvers stay tractable.</p>',
		],
		complexity: { time: 'O(Catalan(n) · n)', space: 'O(n) beyond the output' },
	});
})();
