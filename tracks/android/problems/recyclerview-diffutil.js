/* DiffUtil — UI: Lists, Compose & Layout (Hard). The minimal edit script
 * behind every animated RecyclerView update: identity (areItemsTheSame) vs
 * equality (areContentsTheSame), the pinned remove/move/change/insert
 * emission order, and the classic LIS trick — the minimal move set is the
 * complement of the longest strictly increasing subsequence of old
 * positions taken in new order. The harness pins the canonical
 * [a b c d] -> [d a b c] one-move case and an ambiguous-LIS case that
 * forces the deterministic smallest-tail construction.
 */
(function () {
	'use strict';
	var T = GoLearnAndroid;

	// Old row on top, new row below: a,b,c keep their relative order (the
	// LIS) and never emit a move; only d does. Marker id namespaced
	// (dgArrowAndRD) because every track's SVGs share the page's id space.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 214" width="520" height="214" role="img" aria-label="old list a b c d becomes new list d a b c: a, b, c form the longest increasing subsequence of old positions and stay put; only d moves to the front">' +
		'<text x="20" y="22" class="lbl">old [a b c d] → new [d a b c]: one move, not three</text>' +
		// old row
		'<rect x="40" y="40" width="60" height="32" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="70" y="61" text-anchor="middle">a</text>' +
		'<rect x="115" y="40" width="60" height="32" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="145" y="61" text-anchor="middle">b</text>' +
		'<rect x="190" y="40" width="60" height="32" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="220" y="61" text-anchor="middle">c</text>' +
		'<rect x="265" y="40" width="60" height="32" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="295" y="61" text-anchor="middle">d</text>' +
		'<text x="345" y="61" class="lbl">old (positions 0..3)</text>' +
		// new row
		'<rect x="40" y="130" width="60" height="32" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="70" y="151" text-anchor="middle">d</text>' +
		'<rect x="115" y="130" width="60" height="32" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="145" y="151" text-anchor="middle">a</text>' +
		'<rect x="190" y="130" width="60" height="32" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="220" y="151" text-anchor="middle">b</text>' +
		'<rect x="265" y="130" width="60" height="32" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="295" y="151" text-anchor="middle">c</text>' +
		'<text x="345" y="151" class="lbl">new</text>' +
		// stationary rows slide, they are not "moved"
		'<path d="M 70 74 L 143 128" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="4 4"/>' +
		'<path d="M 145 74 L 218 128" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="4 4"/>' +
		'<path d="M 220 74 L 293 128" stroke="var(--muted)" stroke-width="1.4" stroke-dasharray="4 4"/>' +
		// the one real move
		'<path d="M 295 74 C 295 108 70 96 70 126" fill="none" stroke="var(--warn)" stroke-width="1.8" marker-end="url(#dgArrowAndRD)"/>' +
		'<text x="20" y="190" class="lbl">a b c: old positions 0,1,2 read in new order — still increasing → stationary (the LIS)</text>' +
		'<text x="20" y="206" class="lbl" style="fill:var(--warn)">d: old position 3 breaks the run → the complement of the LIS → move:d@0, the only op</text>' +
		'<defs><marker id="dgArrowAndRD" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'recyclerview-diffutil',
		title: 'DiffUtil: The Minimal Edit Script',
		nav: 'diffutil',
		difficulty: 'Hard',
		category: 'UI: Lists, Compose & Layout',
		task: 'Implement Diff(old, new): removes, then minimal moves (complement of the LIS of old positions in new order), then changes, then inserts.',

		prose: [
			'<h2>DiffUtil: The Minimal Edit Script</h2>' +
			'<p>A pull request updates a chat screen with ' +
			'<code>adapter.notifyDataSetChanged()</code> and review blocks it on ' +
			'sight: that call throws away everything RecyclerView knows. Every ' +
			'visible row rebinds, item animations are impossible (no row identity ' +
			'means no way to say “this row <em>moved</em>”), scroll position ' +
			'drifts, and the recycled-view pool churns. The platform’s answer is ' +
			'<code>DiffUtil</code>: give it the old list, the new list, and two ' +
			'questions answered per pair of rows, and it computes the ' +
			'<strong>minimal edit script</strong> — the smallest set of ' +
			'insert/remove/move/change notifications that turns one list into the ' +
			'other:</p>',
			{ lang: 'kotlin', code: 'class ChatDiff(\n    private val old: List<Message>,\n    private val new: List<Message>,\n) : DiffUtil.Callback() {\n    override fun getOldListSize() = old.size\n    override fun getNewListSize() = new.size\n\n    // identity: is this the SAME row across the update?\n    override fun areItemsTheSame(oldPos: Int, newPos: Int) =\n        old[oldPos].id == new[newPos].id\n\n    // equality: does the same row still show the same content?\n    override fun areContentsTheSame(oldPos: Int, newPos: Int) =\n        old[oldPos] == new[newPos]\n}\n\nval result = DiffUtil.calculateDiff(ChatDiff(current, incoming), /*detectMoves=*/true)\nresult.dispatchUpdatesTo(adapter)   // insert/remove/move/change — never a full reload' },
			'<p>The two callbacks are the whole API surface, and mixing them up is ' +
			'the classic bug: <code>areItemsTheSame</code> is <strong>identity</strong> ' +
			'(stable ID — “same row?”), <code>areContentsTheSame</code> is ' +
			'<strong>equality</strong> (“same pixels once bound?”). Identity decides ' +
			'insert/remove/move; equality, asked only for rows already matched by ' +
			'identity, decides change.</p>' +
			'<h3>Moves are the interesting part</h3>' +
			'<p>Rows present in both lists but reordered do <em>not</em> each need a ' +
			'move. Rows that kept their <strong>relative order</strong> can stay ' +
			'put — the list slides them as neighbors shift. So the minimal move set ' +
			'is the complement of the <strong>longest strictly increasing ' +
			'subsequence</strong> (LIS) of old positions, taken in new order: the ' +
			'LIS is the largest set of rows you may declare stationary, and only ' +
			'the leftovers move.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Diff(old, new)</code> over items with an ' +
			'<code>ID</code> (identity) and <code>Content</code> (equality). IDs are ' +
			'unique within each list. Emission order is pinned: ' +
			'<code>remove:&lt;id&gt;</code> (old order), then ' +
			'<code>move:&lt;id&gt;@&lt;newIndex&gt;</code> (new order), then ' +
			'<code>change:&lt;id&gt;</code> (new order), then ' +
			'<code>insert:&lt;id&gt;@&lt;newIndex&gt;</code> (new order). A row that ' +
			'both moved and changed emits <strong>both</strong> ops.</p>' +
			'<div class="tip">When several LIS exist, the harness pins the ' +
			'deterministic <strong>smallest-tail</strong> construction (patience ' +
			'sorting): scan old positions left to right in new order, keep for each ' +
			'run length the smallest tail that can end it, and reconstruct through ' +
			'predecessor links from the final longest run’s tail. For ' +
			'<code>[x y z] → [y x z]</code> that keeps x,z (old 0,2) and moves y — ' +
			'not the equally-sized alternative that moves x.</div>',
		],

		starter: [
			'package main',
			'',
			'// Item is one row as DiffUtil\'s Callback sees it:',
			'//   ID      — identity, what areItemsTheSame compares (stable, unique per list)',
			'//   Content — equality, what areContentsTheSame compares once identity matched',
			'type Item struct {',
			'	ID      string',
			'	Content string',
			'}',
			'',
			'// Diff computes the update ops that turn oldList into newList, in this',
			'// pinned emission order:',
			'//',
			'//   1. "remove:<id>"            id in old, not in new     — in OLD order',
			'//   2. "move:<id>@<newIndex>"   retained id out of order  — in NEW order',
			'//   3. "change:<id>"            retained id, Content differs — in NEW order',
			'//   4. "insert:<id>@<newIndex>" id in new, not in old     — in NEW order',
			'//',
			'// <newIndex> is the id\'s index in the NEW list. A row that both moved',
			'// and changed emits BOTH a move and a change.',
			'//',
			'// The move set must be MINIMAL: retained ids NOT in the longest',
			'// STRICTLY increasing subsequence of old positions taken in new order.',
			'// When several LIS exist, use the smallest-tail (patience) build: for',
			'// each run length keep the smallest tail seen so far, link each element',
			'// to the tail of the next-shorter run, and reconstruct backwards from',
			'// the final longest run\'s tail.',
			'func Diff(oldList, newList []Item) []string {',
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
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// Ops are joined with single spaces; an empty script prints "(no ops)"',
			'	// so a nil-returning stub reads clearly in the results table.',
			'	fmtOps := func(ops []string) string {',
			'		if len(ops) == 0 {',
			'			return "(no ops)"',
			'		}',
			'		return strings.Join(ops, " ")',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"two identical lists: no ops — dispatching nothing is the point of diffing before notifying",',
			'			"(no ops)",',
			'			func() string {',
			'				return fmtOps(Diff([]Item{{"a", "a"}, {"b", "b"}, {"c", "c"}}, []Item{{"a", "a"}, {"b", "b"}, {"c", "c"}}))',
			'			}},',
			'		{"content edit only: same ids in the same order emit a single change (rebind one row)",',
			'			"change:b",',
			'			func() string {',
			'				return fmtOps(Diff([]Item{{"a", "a"}, {"b", "b"}, {"c", "c"}}, []Item{{"a", "a"}, {"b", "B2"}, {"c", "c"}}))',
			'			}},',
			'		{"pure inserts are reported in NEW order, each @ its index in the new list",',
			'			"insert:b@1 insert:d@3",',
			'			func() string {',
			'				return fmtOps(Diff([]Item{{"a", "a"}, {"c", "c"}}, []Item{{"a", "a"}, {"b", "b"}, {"c", "c"}, {"d", "d"}}))',
			'			}},',
			'		{"pure removes are reported in OLD order",',
			'			"remove:a remove:c",',
			'			func() string {',
			'				return fmtOps(Diff([]Item{{"a", "a"}, {"b", "b"}, {"c", "c"}, {"d", "d"}}, []Item{{"b", "b"}, {"d", "d"}}))',
			'			}},',
			'		{"pinned: [a b c d] -> [d a b c] is ONE move (move:d@0) — a,b,c are the LIS and never move",',
			'			"move:d@0",',
			'			func() string {',
			'				return fmtOps(Diff([]Item{{"a", "a"}, {"b", "b"}, {"c", "c"}, {"d", "d"}}, []Item{{"d", "d"}, {"a", "a"}, {"b", "b"}, {"c", "c"}}))',
			'			}},',
			'		{"ambiguous LIS: [x y z] -> [y x z] has two size-2 LIS — smallest-tail keeps x,z (old 0,2), so y is the mover",',
			'			"move:y@0",',
			'			func() string {',
			'				return fmtOps(Diff([]Item{{"x", "x"}, {"y", "y"}, {"z", "z"}}, []Item{{"y", "y"}, {"x", "x"}, {"z", "z"}}))',
			'			}},',
			'		{"adjacent swap [a b c] -> [a c b]: smallest-tail keeps a,b (old 0,1), so c — not b — is the mover",',
			'			"move:c@1",',
			'			func() string {',
			'				return fmtOps(Diff([]Item{{"a", "a"}, {"b", "b"}, {"c", "c"}}, []Item{{"a", "a"}, {"c", "c"}, {"b", "b"}}))',
			'			}},',
			'		{"a row that moved AND changed emits both ops: the move in the move block, the change in the change block",',
			'			"move:d@0 change:d",',
			'			func() string {',
			'				return fmtOps(Diff([]Item{{"a", "a"}, {"b", "b"}, {"c", "c"}, {"d", "d"}}, []Item{{"d", "D2"}, {"a", "a"}, {"b", "b"}, {"c", "c"}}))',
			'			}},',
			'		{"move indices count inserted rows: old [a b] -> new [n b a] gives move:b@1 behind the insert at 0",',
			'			"move:b@1 insert:n@0",',
			'			func() string {',
			'				return fmtOps(Diff([]Item{{"a", "a"}, {"b", "b"}}, []Item{{"n", "n"}, {"b", "b"}, {"a", "a"}}))',
			'			}},',
			'		{"kitchen sink: removes, then moves, then changes, then inserts — the pinned emission order",',
			'			"remove:b move:e@0 change:e change:d insert:x@2",',
			'			func() string {',
			'				return fmtOps(Diff(',
			'					[]Item{{"a", "a"}, {"b", "b"}, {"c", "c"}, {"d", "d"}, {"e", "e"}},',
			'					[]Item{{"e", "E2"}, {"a", "a"}, {"x", "x"}, {"c", "c"}, {"d", "D2"}}))',
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
			'// Item is one row as DiffUtil\'s Callback sees it: ID answers',
			'// areItemsTheSame (identity), Content answers areContentsTheSame',
			'// (equality, asked only for identity-matched rows).',
			'type Item struct {',
			'	ID      string',
			'	Content string',
			'}',
			'',
			'// lisKeep marks which positions of seq belong to the longest STRICTLY',
			'// increasing subsequence, built with the smallest-tail (patience)',
			'// construction so the choice is deterministic when several LIS tie:',
			'//',
			'//   tails[l] = index into seq of the SMALLEST value that can end an',
			'//              increasing run of length l+1 seen so far',
			'//   prev[i]  = the element seq[i] chains after (for reconstruction)',
			'//',
			'// Keeping every tail as small as possible is the greedy invariant that',
			'// (a) lets a binary search place each element and (b) maximizes the',
			'// room for future elements to extend a run — which is exactly why the',
			'// final tails array reconstructs a genuine longest subsequence.',
			'func lisKeep(seq []int) map[int]bool {',
			'	tails := []int{}',
			'	prev := make([]int, len(seq))',
			'	for i, v := range seq {',
			'		// First run length whose tail is >= v: v replaces that tail.',
			'		// ">=" (not ">") enforces STRICT increase — an equal value may',
			'		// not extend a run, it can only become a smaller-or-equal tail.',
			'		lo, hi := 0, len(tails)',
			'		for lo < hi {',
			'			mid := (lo + hi) / 2',
			'			if seq[tails[mid]] >= v {',
			'				hi = mid',
			'			} else {',
			'				lo = mid + 1',
			'			}',
			'		}',
			'		if lo > 0 {',
			'			prev[i] = tails[lo-1]',
			'		} else {',
			'			prev[i] = -1',
			'		}',
			'		if lo == len(tails) {',
			'			tails = append(tails, i)',
			'		} else {',
			'			tails[lo] = i',
			'		}',
			'	}',
			'	// Reconstruct backwards from the longest run\'s (smallest) tail.',
			'	// This is the pinned tie-break: of all maximum-length subsequences,',
			'	// the one whose members were kept as smallest tails wins.',
			'	keep := map[int]bool{}',
			'	if len(tails) > 0 {',
			'		i := tails[len(tails)-1]',
			'		for i >= 0 {',
			'			keep[i] = true',
			'			i = prev[i]',
			'		}',
			'	}',
			'	return keep',
			'}',
			'',
			'// Diff emits the pinned edit script: removes (old order), moves (new',
			'// order), changes (new order), inserts (new order).',
			'//',
			'// The move set is the heart of it. Retained rows that keep their',
			'// RELATIVE order need no move op at all — the list slides them as',
			'// neighbors shift around them. So the minimal move set is the',
			'// complement of the LIS of old positions taken in new order: the LIS',
			'// is the largest set of rows we may declare stationary, and only the',
			'// leftovers pay for a move. One misplaced row costs one op, not n.',
			'func Diff(oldList, newList []Item) []string {',
			'	// Index the old list once: position feeds the LIS, content feeds',
			'	// the change detection. Maps are used for LOOKUP only — every loop',
			'	// that appends ops ranges over a slice, so output order is',
			'	// deterministic (never a map iteration).',
			'	oldPos := make(map[string]int, len(oldList))',
			'	oldContent := make(map[string]string, len(oldList))',
			'	for i, it := range oldList {',
			'		oldPos[it.ID] = i',
			'		oldContent[it.ID] = it.Content',
			'	}',
			'	inNew := make(map[string]bool, len(newList))',
			'	for _, it := range newList {',
			'		inNew[it.ID] = true',
			'	}',
			'',
			'	ops := []string{}',
			'',
			'	// 1. Removes — scanned in OLD order.',
			'	for _, it := range oldList {',
			'		if !inNew[it.ID] {',
			'			ops = append(ops, "remove:"+it.ID)',
			'		}',
			'	}',
			'',
			'	// Retained rows in NEW order; their old positions are the sequence',
			'	// whose LIS decides who gets to stand still.',
			'	type retainedRow struct {',
			'		id      string',
			'		newIdx  int',
			'		changed bool',
			'	}',
			'	retained := []retainedRow{}',
			'	seq := []int{}',
			'	for i, it := range newList {',
			'		if pos, ok := oldPos[it.ID]; ok {',
			'			retained = append(retained, retainedRow{it.ID, i, it.Content != oldContent[it.ID]})',
			'			seq = append(seq, pos)',
			'		}',
			'	}',
			'	stay := lisKeep(seq)',
			'',
			'	// 2. Moves — the complement of the LIS, in new order. @newIdx is',
			'	//    the index in the NEW list, so it counts inserted rows too: the',
			'	//    script describes the list as it will finally stand.',
			'	for i, r := range retained {',
			'		if !stay[i] {',
			'			ops = append(ops, fmt.Sprintf("move:%s@%d", r.id, r.newIdx))',
			'		}',
			'	}',
			'	// 3. Changes — new order. A row that moved AND changed appears in',
			'	//    both blocks; DiffUtil likewise dispatches moved and changed as',
			'	//    separate adapter notifications.',
			'	for _, r := range retained {',
			'		if r.changed {',
			'			ops = append(ops, "change:"+r.id)',
			'		}',
			'	}',
			'	// 4. Inserts — new order, @ index in the new list.',
			'	for i, it := range newList {',
			'		if _, ok := oldPos[it.ID]; !ok {',
			'			ops = append(ops, fmt.Sprintf("insert:%s@%d", it.ID, i))',
			'		}',
			'	}',
			'	return ops',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What the real DiffUtil does</h3>' +
			'<p>AOSP’s <code>DiffUtil</code> runs Eugene Myers’ O(ND) difference ' +
			'algorithm over <code>areItemsTheSame</code>, then — when ' +
			'<code>detectMoves</code> is true — a second pass that pairs up ' +
			'removals with insertions of the same item and rewrites them as moves. ' +
			'The ID-map + LIS formulation you just wrote is the classic way to ' +
			'state the same goal (it is literally the “minimum moves to sort” ' +
			'interview problem), and it exposes the property that matters in ' +
			'review: <strong>rows that keep their relative order are free</strong>. ' +
			'A single row dragged to the top of a 500-row list is one move, not ' +
			'499.</p>' +
			'<h3>Why stable IDs are non-negotiable</h3>' +
			'<p>Everything above hangs on <code>areItemsTheSame</code> meaning ' +
			'identity. Teams that fake it — comparing positions, or comparing the ' +
			'whole object — get the two signature bugs: every reorder animates as ' +
			'remove-everything-insert-everything (identity churns, so nothing ' +
			'“moves”), and the wrong row animates or gets deleted after a reorder, ' +
			'because position 3 no longer names the row the user long-pressed. ' +
			'The same requirement shows up as <code>setHasStableIds(true)</code> ' +
			'on adapters and as the <code>key = { it.id }</code> parameter of a ' +
			'Compose <code>LazyColumn</code> — same algorithm, same reason.</p>' +
			'<h3>Field notes</h3>' +
			'<ul>' +
			'<li><strong>Never diff big lists on the main thread.</strong> The ' +
			'diff’s cost grows with list size and edit distance; ' +
			'<code>ListAdapter</code>/<code>AsyncListDiffer</code> exist to run ' +
			'<code>calculateDiff</code> on a background executor and dispatch on ' +
			'main. Submitting a <em>fresh</em> <code>List</code> instance is the ' +
			'contract — mutating the list you already submitted makes the diff ' +
			'compare a list against itself and see “no change”.</li>' +
			'<li><strong>Change payloads</strong> (<code>getChangePayload</code>) ' +
			'are the next refinement: a change op can carry <em>which field</em> ' +
			'changed, so <code>onBindViewHolder</code> updates one TextView ' +
			'instead of rebinding the row. Out of scope here, but the ' +
			'identity/equality split you implemented is what makes it possible.</li>' +
			'<li><strong>The LIS tie-break matters for tests, not users.</strong> ' +
			'Both size-2 LIS choices in <code>[x y z] → [y x z]</code> yield one ' +
			'move; pinning smallest-tail just makes the algorithm a function ' +
			'instead of a relation — the same reason gofmt pins one formatting.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n log n) — patience LIS over retained rows; everything else is linear passes', space: 'O(n) for the index maps and predecessor links' },
	});
})();
