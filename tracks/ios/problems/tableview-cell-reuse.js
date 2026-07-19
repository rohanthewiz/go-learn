/* UITableView Cell Reuse — UI: SwiftUI, Lists & Layout (Medium). The reuse
 * pool that makes a 10,000-row table scroll at 60fps with a handful of
 * cells: dequeueReusableCell pops a LIFO pool, cells leaving the visible
 * window feed it, and init runs only when the pool is dry — so total cells
 * created is bounded by window+1, forever. The harness pins that bound, the
 * LIFO shuffle a reloadData causes, and THE classic iOS interview bug: a
 * configure path that sets an accessory but never clears it paints a
 * phantom checkmark on the exact row the recycled cell lands on.
 */
(function () {
	'use strict';
	var T = GoLearnIOS;

	// The steady-state loop while scrolling down: the incoming row dequeues
	// (pool dry -> init), the outgoing top cell drops into the pool, and
	// from then on every dequeue is a pool hit. Marker id namespaced
	// (dgArrowIOSTV) because every track's SVGs share the page's id space.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 208" width="520" height="208" role="img" aria-label="a visible window of three rows scrolls down: the incoming bottom row dequeues a cell, the outgoing top cell is pushed onto the LIFO reuse pool, and later dequeues pop that pool instead of creating cells">' +
		'<text x="20" y="22" class="lbl">scroll down: incoming row dequeues FIRST, then the outgoing cell joins the pool</text>' +
		// visible window
		'<rect x="60" y="40" width="180" height="34" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="150" y="62" text-anchor="middle">row 3 · cell c1</text>' +
		'<rect x="60" y="82" width="180" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="150" y="104" text-anchor="middle">row 4 · cell c2</text>' +
		'<rect x="60" y="124" width="180" height="34" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="150" y="146" text-anchor="middle">row 5 · cell c3</text>' +
		'<text x="150" y="182" text-anchor="middle" class="lbl">visible window (3 rows)</text>' +
		// incoming row
		'<rect x="60" y="160" width="180" height="0" rx="0" fill="none"/>' +
		// pool
		'<rect x="360" y="82" width="130" height="34" rx="5" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<text x="425" y="104" text-anchor="middle">reuse pool</text>' +
		'<text x="425" y="130" text-anchor="middle" class="lbl">a LIFO stack —</text>' +
		'<text x="425" y="144" text-anchor="middle" class="lbl">last recycled, first out</text>' +
		// out arrow: top cell to pool
		'<path d="M 244 57 C 310 57 340 80 358 92" fill="none" stroke="var(--warn)" stroke-width="1.8" marker-end="url(#dgArrowIOSTV)"/>' +
		'<text x="300" y="48" class="lbl" style="fill:var(--warn)">2. c1 leaves → push</text>' +
		// in arrow: pool to incoming row
		'<path d="M 358 112 C 330 150 280 168 250 172" fill="none" stroke="var(--ok)" stroke-width="1.8" marker-end="url(#dgArrowIOSTVin)"/>' +
		'<text x="330" y="176" class="lbl" style="fill:var(--ok)">1. row 6 dequeues (pool dry → init c4)</text>' +
		'<text x="20" y="202" class="lbl">the cell carries its subviews\' STATE with it — configure must overwrite every property, every time</text>' +
		'<defs>' +
		'<marker id="dgArrowIOSTV" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowIOSTVin" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'tableview-cell-reuse',
		title: 'UITableView: The Reuse Pool & the Phantom Checkmark',
		nav: 'cell reuse',
		difficulty: 'Medium',
		category: 'UI: SwiftUI, Lists & Layout',
		task: 'Implement Simulate: scroll a visible window over the rows, recycle outgoing cells through a LIFO pool, and show how the set-but-never-clear configure bug paints phantom checkmarks on recycled cells.',

		prose: [
			'<h2>UITableView: The Reuse Pool &amp; the Phantom Checkmark</h2>' +
			'<p>The bug report: “scroll the task list and checkmarks appear on ' +
			'tasks I never completed — different ones each time.” The data is ' +
			'clean; the model has exactly one <code>isDone</code> row. The bug is ' +
			'in six innocuous lines of <code>cellForRowAt</code>:</p>',
			{ lang: 'swift', code: 'func tableView(_ tableView: UITableView,\n               cellForRowAt indexPath: IndexPath) -> UITableViewCell {\n    let cell = tableView.dequeueReusableCell(withIdentifier: "Task", for: indexPath)\n    let task = tasks[indexPath.row]\n    cell.textLabel?.text = task.title\n    // BUG: sets, never clears. A recycled cell KEEPS its old checkmark.\n    if task.isDone {\n        cell.accessoryType = .checkmark\n    }\n    return cell\n}\n\n// The fix — every property, every time:\ncell.accessoryType = task.isDone ? .checkmark : .none\n// (or clear it in the cell\'s prepareForReuse() override)' },
			'<p><code>dequeueReusableCell</code> is the whole reason a 10,000-row ' +
			'table scrolls at 60fps: the table never holds 10,000 cells. It holds ' +
			'roughly <em>one screenful plus one</em>, and recycles. Log the cell ' +
			'pointer while scrolling and you watch it happen:</p>',
			{ lang: 'txt', code: '// print("row \\(indexPath.row) -> \\(Unmanaged.passUnretained(cell).toOpaque())")\nrow 0 -> 0x7f8a2d80e600\nrow 1 -> 0x7f8a2d80f200\nrow 2 -> 0x7f8a2d810000\nrow 3 -> 0x7f8a2d810a00   // one extra cell while row 0 slides off...\nrow 4 -> 0x7f8a2d80e600   // ...then row 0\'s cell comes back from the pool\nrow 5 -> 0x7f8a2d80f200   // and the table never allocates again' },
			'<p>The mechanics, pinned exactly as this model implements them:</p>' +
			'<ul>' +
			'<li><strong>The window.</strong> The table shows a window of ' +
			'<code>H</code> whole rows; scrolling moves the window one row at a ' +
			'time.</li>' +
			'<li><strong>Dequeue.</strong> An incoming row asks the reuse pool ' +
			'first. Pool non-empty → <strong>pop</strong> (the pool is a LIFO ' +
			'stack — last cell recycled is the first handed back). Pool empty → ' +
			'<code>init</code> a fresh cell (creation counter increments; cells ' +
			'are named <code>c1, c2, …</code> in creation order).</li>' +
			'<li><strong>Scroll order.</strong> On each one-row scroll the ' +
			'<em>incoming</em> row dequeues <em>first</em> (its cell must be laid ' +
			'out while the outgoing one is still sliding off-screen), and only ' +
			'then does the outgoing edge cell drop into the pool. That ordering ' +
			'is why steady-state scrolling settles at <strong>window + 1</strong> ' +
			'cells created — never more, no matter how far you scroll.</li>' +
			'<li><strong>reloadData.</strong> All visible cells are recycled ' +
			'top-to-bottom, then every visible row re-dequeues top-to-bottom — ' +
			'popping the LIFO pool, so the cells come back <em>reversed</em>: the ' +
			'top row gets the cell that was at the bottom.</li>' +
			'<li><strong>State rides along.</strong> A cell keeps its subview ' +
			'state (here: a <code>Shown</code> checkmark flag) across recycling. ' +
			'The <em>correct</em> configure strategy assigns unconditionally; the ' +
			'<em>buggy</em> one only sets when the model says checked — so a ' +
			'recycled cell that once showed a checkmark shows it again on ' +
			'whatever row it lands on.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Simulate(checked, window, events, buggy)</code>: ' +
			'fill the initial window (rows <code>0..window-1</code>, dequeued in ' +
			'order), fold the scroll events (<code>"down"</code>, <code>"up"</code>, ' +
			'<code>"reload"</code>), and return the creation count, the pool-hit ' +
			'count, and the final visible rows as ' +
			'<code>r&lt;row&gt;=c&lt;cellID&gt;</code> strings top-to-bottom, with a ' +
			'<code>*</code> suffix when the cell is <em>displaying</em> a ' +
			'checkmark — which, under the buggy strategy, is not the same thing ' +
			'as the model being checked.</p>' +
			'<div class="tip">Real UITableView keeps one pool per ' +
			'<code>reuseIdentifier</code>, prefetches a little further than one ' +
			'row, and (since iOS 15) can defer cell creation with ' +
			'<code>UITableView.automaticDimension</code> prefetching — so the real ' +
			'created-count is “about a screenful, plus a small constant”, not a ' +
			'law. The window+1 bound is this model’s deterministic version of ' +
			'that; the LIFO pool and the stale-state hazard are the real ' +
			'thing.</div>',
		],

		starter: [
			'package main',
			'',
			'// Cell is one UITableViewCell: ID is its creation order (c1, c2, ...),',
			'// Shown is the accessory its subviews currently DISPLAY. Shown',
			'// survives recycling — that persistence is the entire hazard this',
			'// item is about.',
			'type Cell struct {',
			'	ID    int',
			'	Shown bool',
			'}',
			'',
			'// Stats is what Simulate reports.',
			'//   Created  — cells ever init\'ed (the pool bound to verify)',
			'//   PoolHits — dequeues satisfied by popping the reuse pool',
			'//   Visible  — final window, top to bottom: "r<row>=c<id>" plus "*"',
			'//              when the cell is DISPLAYING a checkmark',
			'type Stats struct {',
			'	Created  int',
			'	PoolHits int',
			'	Visible  []string',
			'}',
			'',
			'// Simulate scrolls a window of `window` whole rows over len(checked)',
			'// rows and returns the stats. checked[i] is the MODEL: is row i done?',
			'//',
			'// Rules (pinned):',
			'//   dequeue: pool non-empty -> pop the TOP (LIFO stack), count a pool',
			'//            hit; pool empty -> create (Created++, ID = Created).',
			'//   initial fill: rows 0..window-1 dequeue+configure in order.',
			'//   "down": the incoming row (bottom edge) dequeues+configures FIRST,',
			'//           then the outgoing TOP cell is pushed onto the pool.',
			'//   "up":   mirror image — incoming top row dequeues+configures',
			'//           first, then the outgoing BOTTOM cell is pushed.',
			'//   "reload": all visible cells are pushed top-to-bottom, then every',
			'//           visible row re-dequeues+configures top-to-bottom.',
			'//   configure, correct (buggy=false): cell.Shown = checked[row].',
			'//   configure, buggy   (buggy=true):  only `if checked[row] {',
			'//           cell.Shown = true }` — stale true values are never',
			'//           cleared, so recycled cells show phantom checkmarks.',
			'//',
			'// Events never scroll past either end (the harness guarantees it).',
			'func Simulate(checked []bool, window int, events []string, buggy bool) Stats {',
			'	// your code here',
			'	return Stats{}',
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
			'	// show folds a Stats into one comparable line; a zero-value Stats',
			'	// from the stub reads clearly as "created=0 hits=0 | ".',
			'	show := func(s Stats) string {',
			'		return fmt.Sprintf("created=%d hits=%d | %s", s.Created, s.PoolHits, strings.Join(s.Visible, " "))',
			'	}',
			'	// dn builds a run of k "down" events.',
			'	dn := func(k int) []string {',
			'		evs := []string{}',
			'		for i := 0; i < k; i++ {',
			'			evs = append(evs, "down")',
			'		}',
			'		return evs',
			'	}',
			'	// mk builds a checked-model of n rows with the given rows done.',
			'	mk := func(n int, done ...int) []bool {',
			'		m := make([]bool, n)',
			'		for _, d := range done {',
			'			m[d] = true',
			'		}',
			'		return m',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"initial fill: window rows dequeue in order, pool dry, so exactly `window` cells are created",',
			'			"created=3 hits=0 | r0=c1 r1=c2 r2=c3",',
			'			func() string { return show(Simulate(mk(6), 3, []string{}, false)) }},',
			'		{"one scroll down: the incoming row dequeues BEFORE the top cell recycles, so a 4th cell is created",',
			'			"created=4 hits=0 | r1=c2 r2=c3 r3=c4",',
			'			func() string { return show(Simulate(mk(6), 3, dn(1), false)) }},',
			'		{"steady-state scroll (7 rows deep): creation stops at window+1 = 4, every later dequeue is a pool hit",',
			'			"created=4 hits=6 | r7=c4 r8=c1 r9=c2",',
			'			func() string { return show(Simulate(mk(12), 3, dn(7), false)) }},',
			'		{"reloadData shuffles: cells recycle top-to-bottom then pop LIFO, so the top row gets the BOTTOM row\'s cell",',
			'			"created=3 hits=3 | r0=c3 r1=c2 r2=c1",',
			'			func() string { return show(Simulate(mk(6), 3, []string{"reload"}, false)) }},',
			'		{"down one, back up one: c1 comes straight back off the pool for row 0 — created stays 4, one pool hit",',
			'			"created=4 hits=1 | r0=c1 r1=c2 r2=c3",',
			'			func() string { return show(Simulate(mk(6), 3, []string{"down", "up"}, false)) }},',
			'		{"THE bug: row 0 is checked; scroll down 3 and its recycled cell c1 paints a PHANTOM checkmark on row 4",',
			'			"created=4 hits=2 | r3=c4 r4=c1* r5=c2",',
			'			func() string { return show(Simulate(mk(6, 0), 3, dn(3), true)) }},',
			'		{"same scroll, correct strategy (assign every time): c1 lands on row 4 clean",',
			'			"created=4 hits=2 | r3=c4 r4=c1 r5=c2",',
			'			func() string { return show(Simulate(mk(6, 0), 3, dn(3), false)) }},',
			'		{"buggy + reload: row 2\'s checked cell c3 resurfaces at row 0 with a phantom; r2\'s * on c1 is genuine",',
			'			"created=3 hits=3 | r0=c3* r1=c2 r2=c1*",',
			'			func() string { return show(Simulate(mk(6, 2), 3, []string{"reload"}, true)) }},',
			'		{"correct + reload: same LIFO shuffle, but the unconditional assign clears c3 — only the true checkmark shows",',
			'			"created=3 hits=3 | r0=c3 r1=c2 r2=c1*",',
			'			func() string { return show(Simulate(mk(6, 2), 3, []string{"reload"}, false)) }},',
			'		{"why it ships: buggy strategy, down 3 and back up 3 — every stale cell happens to land on its old row; looks fine",',
			'			"created=4 hits=5 | r0=c1* r1=c2 r2=c3",',
			'			func() string {',
			'				return show(Simulate(mk(6, 0), 3, []string{"down", "down", "down", "up", "up", "up"}, true))',
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
			'// Cell is one UITableViewCell; Shown persists across recycling, which',
			'// is what makes the buggy configure strategy observable at all.',
			'type Cell struct {',
			'	ID    int',
			'	Shown bool',
			'}',
			'',
			'// Stats is Simulate\'s report.',
			'type Stats struct {',
			'	Created  int',
			'	PoolHits int',
			'	Visible  []string',
			'}',
			'',
			'// Simulate is the whole reuse machine. State is three small pieces:',
			'// the visible slice (index 0 = top row of the window), the pool (a',
			'// slice used strictly as a stack), and `top`, the model row shown at',
			'// visible[0]. Everything else is bookkeeping on top of one dequeue',
			'// closure.',
			'func Simulate(checked []bool, window int, events []string, buggy bool) Stats {',
			'	created := 0',
			'	poolHits := 0',
			'	pool := []*Cell{}',
			'',
			'	// dequeue is dequeueReusableCell: pop the pool LIFO, or init.',
			'	// LIFO is deliberate (and pinned): the most recently recycled',
			'	// cell is the warmest — most likely still in CPU cache and, in',
			'	// the real framework, the one whose subviews were laid out most',
			'	// recently. It is also why reloadData visibly REVERSES the',
			'	// cell/row pairing — the tell the harness checks for.',
			'	dequeue := func() *Cell {',
			'		if len(pool) > 0 {',
			'			c := pool[len(pool)-1]',
			'			pool = pool[:len(pool)-1]',
			'			poolHits++',
			'			return c',
			'		}',
			'		created++',
			'		return &Cell{ID: created}',
			'	}',
			'',
			'	// configure is cellForRowAt\'s body — the two strategies from the',
			'	// prose. The buggy branch is faithful to the classic bug: it',
			'	// touches Shown only when the model is checked, so a stale true',
			'	// riding in on a recycled cell is never cleared.',
			'	configure := func(c *Cell, row int) {',
			'		if buggy {',
			'			if checked[row] {',
			'				c.Shown = true',
			'			}',
			'			return',
			'		}',
			'		// Correct: every property, every time. Equivalent to clearing',
			'		// in prepareForReuse — either way no state leaks between rows.',
			'		c.Shown = checked[row]',
			'	}',
			'',
			'	// Initial fill: the table lays out its first screenful, top to',
			'	// bottom, with a dry pool — this is where `window` cells get made.',
			'	top := 0',
			'	visible := []*Cell{}',
			'	for i := 0; i < window; i++ {',
			'		c := dequeue()',
			'		configure(c, top+i)',
			'		visible = append(visible, c)',
			'	}',
			'',
			'	for _, ev := range events {',
			'		switch ev {',
			'		case "down":',
			'			// Incoming BEFORE outgoing: the new bottom row must be',
			'			// composited while the old top row is still sliding off',
			'			// screen, so its dequeue finds the pool empty exactly',
			'			// once — the +1 in the window+1 creation bound. After',
			'			// that, each scroll\'s push feeds the next scroll\'s pop.',
			'			c := dequeue()',
			'			configure(c, top+window)',
			'			out := visible[0]',
			'			visible = append(visible[1:], c)',
			'			pool = append(pool, out)',
			'			top++',
			'		case "up":',
			'			// Mirror image of "down": incoming top row first, then',
			'			// the bottom cell recycles.',
			'			c := dequeue()',
			'			configure(c, top-1)',
			'			out := visible[len(visible)-1]',
			'			shifted := []*Cell{c}',
			'			shifted = append(shifted, visible[:len(visible)-1]...)',
			'			visible = shifted',
			'			pool = append(pool, out)',
			'			top--',
			'		case "reload":',
			'			// reloadData: everything visible is recycled first (top',
			'			// to bottom), THEN the rows re-dequeue (top to bottom).',
			'			// Push order + LIFO pop = the top row receives the cell',
			'			// pushed last, i.e. the old bottom cell: the pairing',
			'			// reverses, carrying any stale state to a new row even',
			'			// without scrolling.',
			'			for _, c := range visible {',
			'				pool = append(pool, c)',
			'			}',
			'			visible = visible[:0]',
			'			for i := 0; i < window; i++ {',
			'				c := dequeue()',
			'				configure(c, top+i)',
			'				visible = append(visible, c)',
			'			}',
			'		}',
			'	}',
			'',
			'	// Report the window top-to-bottom. The "*" reflects what the cell',
			'	// DISPLAYS (c.Shown), not what the model says — under the buggy',
			'	// strategy those disagree, and that disagreement IS the bug.',
			'	out := []string{}',
			'	for i, c := range visible {',
			'		mark := ""',
			'		if c.Shown {',
			'			mark = "*"',
			'		}',
			'		out = append(out, fmt.Sprintf("r%d=c%d%s", top+i, c.ID, mark))',
			'	}',
			'	return Stats{Created: created, PoolHits: poolHits, Visible: out}',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why reuse exists at all</h3>' +
			'<p>A UITableViewCell is expensive: a view hierarchy, Auto Layout ' +
			'constraints, maybe an image pipeline. Allocating one per row was ' +
			'never an option on the original iPhone (128&nbsp;MB of RAM), and the ' +
			'reuse pool is the founding performance pattern of iOS — the same ' +
			'idea resurfaces as <code>UICollectionView</code>’s pool, SwiftUI’s ' +
			'<code>List</code> row recycling, and (on the other platform) ' +
			'RecyclerView, whose name says it out loud. The contract it imposes ' +
			'is exactly what you implemented: <strong>a dequeued cell is dirty ' +
			'until proven clean</strong>. Configure must be a pure function of ' +
			'the row’s model — every property, every time.</p>' +
			'<h3>The three real-world variants of the phantom</h3>' +
			'<ul>' +
			'<li><strong>The checkmark/label variant</strong> — what you modeled. ' +
			'Any conditional that only ever sets (<code>if unread { bold() }</code>, ' +
			'<code>if isPremium { badge.isHidden = false }</code>) leaks its state ' +
			'to whatever row inherits the cell.</li>' +
			'<li><strong>The async-image variant</strong> — the expensive one in ' +
			'production: a cell kicks off an image download, gets recycled, and ' +
			'the completion handler paints the <em>old</em> row’s avatar onto the ' +
			'<em>new</em> row. The fix is checking that the cell still represents ' +
			'the row (<code>if cell.taskID == task.id</code>) or cancelling in ' +
			'<code>prepareForReuse()</code>.</li>' +
			'<li><strong>The delegate/target variant</strong> — a button target ' +
			'added in configure with <code>addTarget</code> accumulates: after ' +
			'three recyclings one tap fires three handlers. Same rule — remove or ' +
			'reset unconditionally.</li>' +
			'</ul>' +
			'<h3><code>prepareForReuse</code> and who clears what</h3>' +
			'<p>UIKit’s own hook runs on the cell just before it is handed back ' +
			'from the pool. Apple’s guidance is narrower than folklore: reset ' +
			'<em>content</em> in <code>cellForRowAt</code> (you have the model ' +
			'there), use <code>prepareForReuse</code> for state the data source ' +
			'can’t know — cancel in-flight work, stop animations, reset ' +
			'selection. Either discipline satisfies the invariant; the buggy ' +
			'strategy satisfies neither.</p>' +
			'<h3>Where this model simplifies</h3>' +
			'<p>Real tables scroll by pixels, not whole rows; keep one pool per ' +
			'<code>reuseIdentifier</code>; and the exact created-count depends on ' +
			'row heights, prefetching, and iOS version — “window plus a small ' +
			'constant” is the honest statement, and this model pins the cleanest ' +
			'version of it (incoming-dequeues-first ⇒ exactly window+1). The ' +
			'reloadData-reverses-the-pairing effect is real and observable with ' +
			'the pointer-logging trick in the prose, though the framework makes ' +
			'no ordering promise — which is itself the deeper lesson: ' +
			'<strong>you may assume nothing about which cell you get</strong>.</p>',
		],
		complexity: { time: 'O(e + w) — one pass over events (reload costs O(w)), plus the final window report', space: 'O(w) — the window and a pool that never exceeds it' },
	});
})();
