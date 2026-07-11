/* Course Schedule — Graphs (Medium). Cycle detection in a directed graph
 * dressed up as course prerequisites: all courses can be finished iff the
 * prerequisite digraph has no cycle. Teaches the DFS three-color scheme
 * (unvisited / in-stack / done) — a cycle exists exactly when an edge leads
 * back to a node still on the current recursion stack. The explanation
 * contrasts it with Kahn's BFS topological sort.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="DFS three-color states finding a cycle in a course graph">' +
		'<text x="20" y="16" class="lbl">DFS mid-run · edge meaning: course → its prerequisite</text>' +
		// left component: 0 -> 1 -> 2, fully processed (done/ok)
		'<g fill="none" stroke="var(--ok)" stroke-width="1.5">' +
		'<line x1="52" y1="60" x2="92" y2="60" marker-end="url(#dgArrowCSDok)"/>' +
		'<line x1="132" y1="60" x2="172" y2="60" marker-end="url(#dgArrowCSDok)"/>' +
		'</g>' +
		'<g fill="var(--panel)" stroke="var(--ok)" stroke-width="1.6">' +
		'<circle cx="36" cy="60" r="16"/><circle cx="112" cy="60" r="16"/><circle cx="192" cy="60" r="16"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="36" y="65">0</text><text x="112" y="65">1</text><text x="192" y="65">2</text>' +
		'</g>' +
		'<text x="112" y="100" text-anchor="middle" style="fill:var(--ok)">done — no cycle through here</text>' +
		// right component: 3 -> 4 -> 5 -> 3, cycle (in-stack/accent)
		'<g fill="none" stroke="var(--accent)" stroke-width="1.5">' +
		'<line x1="336" y1="52" x2="396" y2="52" marker-end="url(#dgArrowCSD)"/>' +
		'<path d="M 416 66 C 410 96 386 116 366 124" marker-end="url(#dgArrowCSD)"/>' +
		'</g>' +
		// the back edge 5 -> 3, drawn heavier
		'<path d="M 336 128 C 300 116 296 84 310 66" fill="none" stroke="var(--accent)" stroke-width="2.5" marker-end="url(#dgArrowCSD)"/>' +
		'<g fill="var(--panel)" stroke="var(--accent)" stroke-width="2">' +
		'<circle cx="320" cy="52" r="16"/><circle cx="416" cy="52" r="16"/><circle cx="352" cy="130" r="16"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="320" y="57">3</text><text x="416" y="57">4</text><text x="352" y="135">5</text>' +
		'</g>' +
		'<text x="285" y="96" text-anchor="middle" style="fill:var(--accent)">back edge!</text>' +
		'<text x="416" y="170" text-anchor="middle" class="lbl">5’s edge reaches 3, which is still in-stack → cycle → false</text>' +
		// legend
		'<circle cx="30" cy="140" r="8" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="46" y="145" class="lbl">unvisited</text>' +
		'<circle cx="30" cy="162" r="8" fill="var(--panel)" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="46" y="167" class="lbl">in-stack (current DFS path)</text>' +
		'<circle cx="30" cy="184" r="8" fill="var(--panel)" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="46" y="189" class="lbl">done (proven cycle-free)</text>' +
		'<defs>' +
		'<marker id="dgArrowCSD" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowCSDok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'course-schedule',
		title: 'Course Schedule',
		nav: 'Course Schedule',
		difficulty: 'Medium',
		category: 'Graphs',
		task: 'Implement canFinish — make all 5 tests pass.',

		prose: [
			'<h2>Course Schedule</h2>' +
			'<p>There are <code>numCourses</code> courses labeled <code>0…numCourses−1</code>. ' +
			'Each pair <code>[a, b]</code> in <code>prerequisites</code> means: to take course ' +
			'<code>a</code> you must first finish course <code>b</code>. Return whether it is ' +
			'possible to finish <em>all</em> courses.</p>' +
			'<ul><li>Equivalent question: is the prerequisite digraph <em>acyclic</em>?</li>' +
			'<li>A course may appear in many pairs; pairs may reference the same course ' +
			'twice (<code>[0, 0]</code> is a self-loop — instantly impossible).</li>' +
			'<li>No prerequisites at all means every course is free to take: <code>true</code>.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'canFinish(3, [][]int{{1, 0}, {2, 1}})  →  true    // 0, then 1, then 2\ncanFinish(2, [][]int{{0, 1}, {1, 0}})  →  false   // each requires the other', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>You can finish everything exactly when no course (transitively) requires ' +
			'itself — no <em>cycle</em>. DFS finds cycles with three node states: ' +
			'<em>unvisited</em>, <em>in-stack</em> (on the current recursion path), and ' +
			'<em>done</em> (fully explored, proven safe). Meeting an <em>in-stack</em> node ' +
			'again means the path looped back on itself:</p>' +
			DIAGRAM +
			'<p>Meeting a <em>done</em> node is harmless — it was already proven cycle-free, ' +
			'so the DFS just skips it.</p>',
		],

		starter: [
			'package main',
			'',
			'// canFinish reports whether all numCourses courses can be completed.',
			'// Each prerequisites[i] = [a, b] means course a requires course b',
			'// first. Equivalent: does the prerequisite digraph contain no cycle?',
			'func canFinish(numCourses int, prerequisites [][]int) bool {',
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
			'func main() {',
			'	type tc struct {',
			'		n       int',
			'		prereqs [][]int',
			'		want    bool',
			'	}',
			'	cases := []tc{',
			'		{3, [][]int{{1, 0}, {2, 1}}, true},           // simple chain 2→1→0',
			'		{2, [][]int{{0, 1}, {1, 0}}, false},          // 2-cycle',
			'		{1, [][]int{{0, 0}}, false},                  // self-loop',
			'		{5, [][]int{{1, 0}, {3, 2}}, true},           // disconnected DAG + isolated node',
			'		{4, [][]int{}, true},                         // no prerequisites at all',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("numCourses=%d, prerequisites=%v", c.n, c.prereqs),',
			'			"want":  fmt.Sprintf("%t", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Clone the pair list (outer + inner) so a solution that',
			'			// reorders or edits pairs cannot affect later cases.',
			'			prereqs := make([][]int, len(c.prereqs))',
			'			for i, p := range c.prereqs {',
			'				prereqs[i] = append([]int(nil), p...)',
			'			}',
			'			got := canFinish(c.n, prereqs)',
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
			'// DFS node states. Three states — not a boolean visited flag —',
			'// because the question is not “was this node ever seen?” but “is it',
			'// on the CURRENT path?”. Only an edge back into the current path',
			'// closes a cycle; an edge into a finished subtree is fine.',
			'const (',
			'	unvisited = 0 // never touched',
			'	inStack   = 1 // on the current recursion path',
			'	done      = 2 // fully explored: no cycle reachable from here',
			')',
			'',
			'// canFinish reports whether the prerequisite digraph is acyclic.',
			'func canFinish(numCourses int, prerequisites [][]int) bool {',
			'	// Adjacency list: course → the courses it requires. Direction is',
			'	// arbitrary as long as it is consistent — a cycle is a cycle',
			'	// whichever way the edges point.',
			'	adj := make([][]int, numCourses)',
			'	for _, p := range prerequisites {',
			'		adj[p[0]] = append(adj[p[0]], p[1])',
			'	}',
			'',
			'	state := make([]int, numCourses) // zero value == unvisited',
			'',
			'	// dfs returns false the moment any cycle is reachable from n.',
			'	var dfs func(n int) bool',
			'	dfs = func(n int) bool {',
			'		switch state[n] {',
			'		case inStack:',
			'			return false // reached a node still being explored → cycle',
			'		case done:',
			'			return true // already proven safe; skip the whole subtree',
			'		}',
			'		state[n] = inStack',
			'		for _, m := range adj[n] {',
			'			if !dfs(m) {',
			'				return false // propagate the cycle verdict up unchanged',
			'			}',
			'		}',
			'		state[n] = done // popped off the path with no cycle found',
			'		return true',
			'	}',
			'',
			'	// The graph may be disconnected, so every course must be tried as',
			'	// a DFS root. done-marking keeps the total work O(V+E): each node',
			'	// is fully explored at most once across ALL these calls.',
			'	for n := 0; n < numCourses; n++ {',
			'		if !dfs(n) {',
			'			return false',
			'		}',
			'	}',
			'	return true',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why a plain visited flag fails</h3>' +
			'<p>First instinct: DFS with a boolean <code>visited</code> set, and report a ' +
			'cycle when you meet a visited node. That is wrong for <em>directed</em> graphs: ' +
			'two courses sharing a prerequisite (<code>1→0</code>, <code>2→0</code>) makes ' +
			'the DFS from 2 meet the already-visited 0 — a “diamond”, not a cycle. The fix ' +
			'is to distinguish <em>where</em> the revisited node lives:</p>' +
			'<ul>' +
			'<li><strong>in-stack</strong> — on the recursion path you are standing on right ' +
			'now. Reaching it again means the path loops: a real cycle.</li>' +
			'<li><strong>done</strong> — explored on some earlier path and proven cycle-free. ' +
			'Reaching it is harmless, and skipping it is what keeps DFS linear.</li>' +
			'</ul>' +
			'<h3>The three-color DFS</h3>',
			{ code: 'dfs = func(n int) bool {\n\tswitch state[n] {\n\tcase inStack:\n\t\treturn false // back edge into the current path → cycle\n\tcase done:\n\t\treturn true // proven safe earlier — skip\n\t}\n\tstate[n] = inStack\n\tfor _, m := range adj[n] {\n\t\tif !dfs(m) {\n\t\t\treturn false\n\t\t}\n\t}\n\tstate[n] = done // leaves the path only after all descendants clear\n\treturn true\n}' },
			'<p>Subtleties worth pausing on:</p>' +
			'<ul>' +
			'<li><strong>in-stack ≠ visited.</strong> A node is <code>inStack</code> only while ' +
			'the recursion that entered it has not returned — it mirrors the call stack ' +
			'exactly. The self-loop test (<code>[0,0]</code>) is the minimal case: 0 is ' +
			'in-stack when its own edge is examined.</li>' +
			'<li><strong>Every node must be a root.</strong> The graph can be disconnected ' +
			'(one test has two separate chains plus an isolated course), so the outer loop ' +
			'tries all of them; <code>done</code> nodes return instantly, so total work stays ' +
			'O(V+E).</li>' +
			'<li><strong>Edge direction doesn’t matter</strong> — course→prereq or ' +
			'prereq→course both preserve cycles; only consistency matters.</li>' +
			'</ul>' +
			'<h3>The BFS alternative: Kahn’s algorithm</h3>' +
			'<p>The same question has a bottom-up answer: repeatedly take any course with ' +
			'<em>zero unmet prerequisites</em>, and “complete” it by decrementing the in-degree ' +
			'of courses that depend on it. If every course eventually gets taken, there is no ' +
			'cycle; a cycle starves its members at in-degree ≥ 1 forever, so the count comes ' +
			'up short. Kahn’s is iterative (no recursion depth concerns) and produces an actual ' +
			'valid course order as a by-product; three-color DFS uses less scaffolding and ' +
			'pinpoints the cycle path. Both are O(V+E) — knowing both is the point.</p>',
		],
		complexity: { time: 'O(V + E)', space: 'O(V + E)' },
	});
})();
