/* Task Scheduler — Heap / Priority Queue (Medium). Greedy scheduling by
 * the scarcest resource: the most frequent task determines a frame grid
 * whose arithmetic — max(len(tasks), (maxFreq-1)*(n+1)+maxCount) — IS the
 * answer. The general tool for problems like this is a max-heap plus a
 * cooldown queue; here a counting argument shortcuts the whole simulation.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// The frame grid for tasks="AAABBB", n=2: the most frequent task A
	// anchors rows of width n+1; other tasks fill the columns after it,
	// idles pad what nothing fills. The last row stops after the tasks
	// tied at maxFreq.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 210" width="500" height="210" role="img" aria-label="frame grid for task scheduling: rows of width n+1 anchored by the most frequent task">' +
		'<text x="20" y="16" class="lbl">tasks = "AAABBB", n = 2 → frames of width n+1 = 3, anchored by A (maxFreq = 3)</text>' +
		// row labels
		'<g class="lbl">' +
		'<text x="20" y="70">frame 1</text>' +
		'<text x="20" y="112">frame 2</text>' +
		'<text x="20" y="154">tail</text>' +
		'</g>' +
		// frame 1: A B idle
		'<g text-anchor="middle">' +
		'<rect x="90" y="50" width="40" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="110" y="70">A</text>' +
		'<rect x="136" y="50" width="40" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="156" y="70">B</text>' +
		'<rect x="182" y="50" width="40" height="30" rx="4" fill="none" stroke="var(--dim)" stroke-dasharray="4 3"/>' +
		'<text x="202" y="70" class="lbl">idle</text>' +
		// frame 2: A B idle
		'<rect x="90" y="92" width="40" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="110" y="112">A</text>' +
		'<rect x="136" y="92" width="40" height="30" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="156" y="112">B</text>' +
		'<rect x="182" y="92" width="40" height="30" rx="4" fill="none" stroke="var(--dim)" stroke-dasharray="4 3"/>' +
		'<text x="202" y="112" class="lbl">idle</text>' +
		// tail: A B (maxCount = 2 tasks tied at maxFreq)
		'<rect x="90" y="134" width="40" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="110" y="154">A</text>' +
		'<rect x="136" y="134" width="40" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="156" y="154">B</text>' +
		'</g>' +
		// cooldown arc between consecutive A's
		'<path d="M 110 84 C 92 88 92 88 110 92" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowTSK)"/>' +
		'<text x="60" y="90" class="lbl">gap ≥ n</text>' +
		// the formula, annotated
		'<g class="lbl">' +
		'<text x="280" y="70">(maxFreq − 1) full frames,</text>' +
		'<text x="280" y="86">each n+1 wide (A + cooldown)</text>' +
		'<text x="280" y="150">tail = maxCount tasks</text>' +
		'<text x="280" y="166">tied at maxFreq (A and B)</text>' +
		'</g>' +
		'<text x="90" y="192">(3−1) × (2+1) + 2 = 8 intervals</text>' +
		'<text x="20" y="209" class="lbl">enough task variety fills every idle slot — then the answer is just len(tasks)</text>' +
		'<defs><marker id="dgArrowTSK" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'task-scheduler',
		title: 'Task Scheduler',
		nav: 'Task Scheduler',
		difficulty: 'Medium',
		category: 'Heap / Priority Queue',
		task: 'Implement leastInterval — make all 6 tests pass.',

		prose: [
			'<h2>Task Scheduler</h2>' +
			'<p>A CPU runs one task per interval. Given <code>tasks</code> (bytes ' +
			'<code>\'A\'</code>–<code>\'Z\'</code>; equal letters are the same task type) ' +
			'and a cooldown <code>n</code>, two runs of the <em>same</em> task type must ' +
			'be at least <code>n</code> intervals apart. The CPU may idle. Return the ' +
			'<em>minimum</em> number of intervals (working + idle) to finish every ' +
			'task.</p>' +
			'<ul><li>Tasks may run in any order.</li>' +
			'<li>Idle intervals count toward the total.</li>' +
			'<li><code>n = 0</code> means no cooldown at all.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'leastInterval([]byte("AAABBB"), 2)  →  8   // A B _ A B _ A B\nleastInterval([]byte("AAABBB"), 0)  →  6   // no cooldown: any order\nleastInterval([]byte("AAAA"), 2)    →  10  // A _ _ A _ _ A _ _ A', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>The <em>most frequent</em> task is the bottleneck: its runs must sit at ' +
			'least <code>n+1</code> apart, pinning down a skeleton of frames that ' +
			'everything else merely fills. Count the frames instead of simulating the ' +
			'schedule:</p>' +
			DIAGRAM +
			'<p>Two regimes: when idles exist, the frame arithmetic ' +
			'<code>(maxFreq−1)·(n+1) + maxCount</code> is exact; when task variety fills ' +
			'every slot, no idles remain and the answer is simply <code>len(tasks)</code>. ' +
			'The max of the two covers both.</p>',
		],

		starter: [
			'package main',
			'',
			'// leastInterval returns the minimum number of CPU intervals needed',
			'// to run every task, where equal task types (bytes \'A\'..\'Z\') must',
			'// be at least n intervals apart. Idle intervals count.',
			'func leastInterval(tasks []byte, n int) int {',
			'	// your code here',
			'	return -1 // sentinel: every valid schedule has positive length',
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
			'	// Tasks are given as strings for readability and converted to',
			'	// []byte at the call site, matching the function signature.',
			'	type tc struct {',
			'		tasks string',
			'		n     int',
			'		want  int',
			'	}',
			'	cases := []tc{',
			'		// The classic: A B _ A B _ A B.',
			'		{"AAABBB", 2, 8},',
			'		// n = 0: no cooldown, answer is just the task count.',
			'		{"AAABBB", 0, 6},',
			'		// Single task type: pure frames, idles dominate.',
			'		{"AAAA", 2, 10},',
			'		// Tie at maxFreq: BOTH A and B extend the tail (catches +1 instead of +maxCount).',
			'		{"AAABBBCC", 2, 8},',
			'		// Busy schedule: variety fills every slot, no idles — len(tasks) wins over the frame formula (6).',
			'		{"AABBCCDD", 1, 8},',
			'		// Cooldown far larger than variety: idles dominate again.',
			'		{"AAB", 42, 44},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("tasks=%q, n=%d", c.tasks, c.n),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := leastInterval([]byte(c.tasks), c.n)',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%d", got)',
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
			'// leastInterval returns the minimum number of intervals (working +',
			'// idle) to run all tasks with equal types at least n apart.',
			'//',
			'// Counting argument instead of simulation. Let maxFreq be the',
			'// highest task count and maxCount how many types are tied at it.',
			'// The most frequent task pins down a skeleton:',
			'//',
			'//	A . . | A . . | A          maxFreq rows; the first maxFreq-1',
			'//	└ n+1 ┘                    are frames of width n+1 (A plus its',
			'//	                           cooldown), the last row is just A —',
			'//	                           plus the other tasks tied at maxFreq,',
			'//	                           which must also appear in every row.',
			'//',
			'// That grid has (maxFreq-1)*(n+1) + maxCount slots and no schedule',
			'// can be shorter: the maxCount tied tasks each need maxFreq runs',
			'// spaced n+1 apart, and this layout is the tightest packing. Other',
			'// tasks (fewer runs than maxFreq) slot into the frames’ idle',
			'// columns round-robin without ever violating their own cooldown.',
			'//',
			'// If variety OVERFLOWS the idle columns, the frames stretch — but',
			'// then no idles remain at all, and a round-robin over task types',
			'// schedules everything back-to-back: the answer is len(tasks).',
			'// max() of the two covers both regimes exactly.',
			'func leastInterval(tasks []byte, n int) int {',
			'	// Fixed 26-letter alphabet: an array beats a map (no hashing,',
			'	// deterministic iteration, zero allocations).',
			'	var counts [26]int',
			'	for _, t := range tasks {',
			'		counts[t-\'A\']++',
			'	}',
			'',
			'	maxFreq := 0',
			'	for _, c := range counts {',
			'		if c > maxFreq {',
			'			maxFreq = c',
			'		}',
			'	}',
			'	maxCount := 0 // task types tied at maxFreq — they ALL extend the tail',
			'	for _, c := range counts {',
			'		if c == maxFreq {',
			'			maxCount++',
			'		}',
			'	}',
			'',
			'	// The frame lower bound vs the trivial lower bound; the larger',
			'	// of the two is achievable, hence optimal.',
			'	framed := (maxFreq-1)*(n+1) + maxCount',
			'	if framed < len(tasks) {',
			'		return len(tasks)',
			'	}',
			'	return framed',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The general method: heap + cooldown queue</h3>' +
			'<p>Task Scheduler is, on its face, a simulation: at every interval, run the ' +
			'task that is <em>available</em> (off cooldown) with the <em>most runs ' +
			'remaining</em> — greedy by scarcest resource, since the most frequent task ' +
			'is the one that can force idles later. The natural machinery is a max-heap ' +
			'of remaining counts plus a FIFO queue of cooling-down tasks stamped with ' +
			'when they re-enter:</p>',
			{ code: '// sketch of the general simulation (works for any cooldown rule)\n// heap: remaining counts, max on top · queue: (count, readyTime)\ntime := 0\nfor heap.Len() > 0 || queue not empty {\n\ttime++\n\tif front of queue has readyTime == time {\n\t\tpush its count back on the heap\n\t}\n\tif heap.Len() > 0 {\n\t\tc := heap.Pop()  // run the most-remaining available task\n\t\tif c-1 > 0 {\n\t\t\tqueue.Push(c-1, time+n+1) // cools down until then\n\t\t}\n\t} // else: idle interval\n}', lang: 'txt' },
			'<p>O(total intervals · log 26) and fully general. But this problem only asks ' +
			'for the schedule&rsquo;s <em>length</em>, and the greedy&rsquo;s structure is ' +
			'so regular that arithmetic replaces the whole loop.</p>' +
			'<h3>Deriving the frame formula</h3>' +
			'<p>Let <code>maxFreq</code> be the highest count and <code>maxCount</code> ' +
			'the number of task types tied at it. Lay the most frequent task&rsquo;s runs ' +
			'as row anchors: each of the first <code>maxFreq − 1</code> rows is a ' +
			'<em>frame</em> of width <code>n+1</code> (the task plus its cooldown), and ' +
			'the final row holds just the anchors — one column per task tied at ' +
			'<code>maxFreq</code>, since each of those must also appear in every row:</p>',
			{ code: '"AAABBBCC", n = 2  →  maxFreq = 3 (A, B), maxCount = 2\n\nA B C      ← frame, width n+1 = 3\nA B C\nA B        ← tail: the maxCount tied tasks\n\n(3−1)·(2+1) + 2 = 8 = len(tasks): every slot filled, zero idles', lang: 'txt' },
			'<p>This is a genuine <em>lower bound</em>: the tied tasks each need ' +
			'<code>maxFreq</code> runs with <code>n+1</code>-wide spacing, and no packing ' +
			'is tighter. It is also <em>achievable</em>: filling the frames&rsquo; free ' +
			'columns with the remaining task types round-robin (most frequent first) ' +
			'never puts two equal tasks within <code>n</code> — a task with fewer than ' +
			'<code>maxFreq</code> runs appears at most once per frame, and consecutive ' +
			'frames keep its copies <code>n+1</code> apart.</p>' +
			'<p>One regime remains. With lots of variety, the fillers overflow the idle ' +
			'columns — frames widen past <code>n+1</code>, meaning no interval idles, and ' +
			'a round-robin over types runs everything back to back. Then the schedule ' +
			'length is exactly <code>len(tasks)</code>, which is why the answer is:</p>',
			{ code: 'framed := (maxFreq-1)*(n+1) + maxCount\nif framed < len(tasks) {\n\treturn len(tasks) // variety filled every idle slot\n}\nreturn framed // idles exist: the frame grid is exact' },
			'<p>Details the tests are watching for: the tail is <code>+maxCount</code>, ' +
			'not <code>+1</code> (a tie at maxFreq extends the last row — ' +
			'<code>"AAABBBCC"</code>, n=2 is 8, not 7); <code>n = 0</code> degenerates to ' +
			'<code>len(tasks)</code> through either branch; and a huge <code>n</code> with ' +
			'few task types is pure frames (<code>"AAB"</code>, n=42 → 44).</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Greedy by scarcest resource + counting lower bound</strong> — ' +
			'when a scheduling or arrangement problem has a separation constraint, ' +
			'anchor the layout on the most frequent element, then <em>prove</em> the ' +
			'greedy optimal with arithmetic: exhibit a lower bound every schedule must ' +
			'respect, and a construction that meets it. The proof style is the exchange ' +
			'argument that drives Gas Station and Jump Game in this track (show any ' +
			'other schedule can be massaged into the greedy one without getting worse); ' +
			'the "grab the heaviest remaining item" mechanic is the same heap discipline ' +
			'as Last Stone Weight and Top K Frequent Elements, which is what makes the ' +
			'heap + cooldown-queue simulation the fallback whenever the cost structure ' +
			'is too irregular for a closed-form count.</p>',
		],
		complexity: { time: 'O(n + 26) — one pass over tasks', space: 'O(1) — 26 counters' },
	});
})();
