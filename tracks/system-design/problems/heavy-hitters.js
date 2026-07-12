/* Heavy Hitters (Misra–Gries) — Probabilistic Structures (Medium). Find the
 * frequent elements of a stream with k counters instead of one per distinct
 * key. Fully deterministic exact-table harness: the algorithm has no hashing
 * and a fixed decrement rule, so each stream pins one exact candidate set
 * (all traces hand-verified against a native Go reference).
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="Misra-Gries: k counters; a new element with all counters busy decrements every counter">' +
		'<text x="20" y="18" class="lbl">k=2 counters, stream: a a b c …</text>' +
		// state after a a b
		'<text x="20" y="46" class="lbl">after "a a b"</text>' +
		'<rect x="130" y="30" width="70" height="26" rx="4" fill="var(--accent)" fill-opacity="0.18" stroke="var(--accent)"/>' +
		'<rect x="210" y="30" width="70" height="26" rx="4" fill="var(--accent)" fill-opacity="0.18" stroke="var(--accent)"/>' +
		'<text x="165" y="48" text-anchor="middle">a : 2</text>' +
		'<text x="245" y="48" text-anchor="middle">b : 1</text>' +
		// c arrives
		'<text x="330" y="48">"c" arrives — no counter free</text>' +
		'<path d="M 330 56 C 300 76 280 84 262 88" fill="none" stroke="var(--err-edge)" stroke-width="1.5" marker-end="url(#dgArrowHH)"/>' +
		// state after decrement
		'<text x="20" y="106" class="lbl">decrement ALL</text>' +
		'<rect x="130" y="90" width="70" height="26" rx="4" fill="var(--accent)" fill-opacity="0.18" stroke="var(--accent)"/>' +
		'<rect x="210" y="90" width="70" height="26" rx="4" fill="none" stroke="var(--err-edge)" stroke-dasharray="4 3"/>' +
		'<text x="165" y="108" text-anchor="middle">a : 1</text>' +
		'<text x="245" y="108" text-anchor="middle" class="lbl">b : 0 → drop</text>' +
		'<text x="330" y="108" class="lbl">"c" is NOT tracked — its one</text>' +
		'<text x="330" y="122" class="lbl">occurrence paid to cancel b</text>' +
		'<text x="20" y="160" class="lbl">a decrement erases k+1 different elements at once (c, and one count of each tracked one) —</text>' +
		'<text x="20" y="176" class="lbl">it can happen at most n/(k+1) times, so anything more frequent than n/(k+1) MUST survive</text>' +
		'<defs><marker id="dgArrowHH" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--err-edge)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'heavy-hitters',
		title: 'Heavy Hitters (Misra–Gries)',
		nav: 'Heavy Hitters',
		difficulty: 'Medium',
		category: 'Probabilistic Structures',
		task: 'Implement the Misra–Gries summary — make all 6 tests pass.',

		prose: [
			'<h2>Heavy Hitters — the Misra–Gries summary</h2>' +
			'<p>“Which API endpoints get the most traffic?” over a billion-request stream. ' +
			'Exact counting needs a counter per distinct key — unbounded. Misra–Gries finds ' +
			'every <em>frequent</em> element with just <code>k</code> counters, by making rare ' +
			'elements pay for their appearances by canceling counts of tracked ones:</p>' +
			DIAGRAM +
			'<h3>The algorithm (implement exactly this)</h3>' +
			'<p><code>HeavyHitters(stream, k)</code> processes the stream one element at a ' +
			'time against at most <code>k</code> counters:</p>' +
			'<ul>' +
			'<li>If the element is already tracked → <strong>increment</strong> its counter.</li>' +
			'<li>Else if fewer than <code>k</code> elements are tracked → <strong>track it</strong> ' +
			'with count 1.</li>' +
			'<li>Else (all <code>k</code> counters busy) → <strong>decrement every</strong> counter ' +
			'and drop any that reach zero. The new element is <em>not</em> tracked.</li>' +
			'</ul>' +
			'<p>Return the tracked elements — the <em>candidate set</em> — <strong>sorted ' +
			'lexicographically</strong> (the tests expect sorted output; map iteration order ' +
			'is random, so sort before returning). The guarantee is one-sided: every element ' +
			'occurring <em>more than</em> <code>n/(k+1)</code> times is guaranteed present, but ' +
			'the set may also contain infrequent stragglers — candidates, not answers.</p>',
		],

		starter: [
			'package main',
			'',
			'// HeavyHitters runs the Misra–Gries summary over stream with at',
			'// most k counters and returns the tracked elements sorted',
			'// lexicographically. Every element appearing more than',
			'// len(stream)/(k+1) times is guaranteed to be in the result;',
			'// infrequent elements MAY also appear (it is a candidate set).',
			'//',
			'// Per element:',
			'//   tracked            -> increment its counter',
			'//   untracked, room    -> track with count 1',
			'//   untracked, no room -> decrement ALL counters, drop zeros;',
			'//                         the new element is not tracked',
			'func HeavyHitters(stream []string, k int) []string {',
			'	return nil // your code here',
			'}',
			'',
		].join('\n'),

		// Exact table: no hashing anywhere, so each stream has ONE correct
		// candidate set. Every expected value below was verified against a
		// native Go reference implementation. Results are compared as the
		// fmt "%v" rendering of the sorted slice.
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
			'type tc struct {',
			'	note   string',
			'	stream []string',
			'	k      int',
			'	want   []string',
			'}',
			'',
			'func main() {',
			'	cases := []tc{',
			'		{note: "frequent a survives", stream: []string{"a", "a", "b", "c", "a", "b", "a"}, k: 2, want: []string{"a", "b"}},',
			'		{note: "k=1 = Boyer–Moore: majority x outlasts distinct noise", stream: []string{"x", "y", "x", "z", "x", "w", "x"}, k: 1, want: []string{"x"}},',
			'		{note: "false candidate: b occurs once (<= n/(k+1)) yet is tracked", stream: []string{"a", "a", "a", "b"}, k: 2, want: []string{"a", "b"}},',
			'		{note: "all-distinct stream: only the last arrival lingers", stream: []string{"a", "b", "c", "d"}, k: 2, want: []string{"d"}},',
			'		{note: "k >= distinct elements: everything is tracked exactly", stream: []string{"b", "a", "b", "a", "c"}, k: 3, want: []string{"a", "b", "c"}},',
			'		{note: "balanced stream cancels out to an empty candidate set", stream: []string{"a", "a", "b", "b", "c", "d"}, k: 2, want: []string{}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%s: HeavyHitters(%v, k=%d)", c.note, c.stream, c.k),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := HeavyHitters(append([]string(nil), c.stream...), c.k)',
			'			r["pass"] = fmt.Sprintf("%v", got) == fmt.Sprintf("%v", c.want)',
			'			r["got"] = fmt.Sprintf("%v", got)',
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
			'import "sort"',
			'',
			'// HeavyHitters runs the Misra–Gries summary over stream with at',
			'// most k counters and returns the tracked elements sorted',
			'// lexicographically.',
			'func HeavyHitters(stream []string, k int) []string {',
			'	counters := map[string]int{}',
			'	for _, x := range stream {',
			'		if _, tracked := counters[x]; tracked {',
			'			counters[x]++',
			'			continue',
			'		}',
			'		if len(counters) < k {',
			'			counters[x] = 1',
			'			continue',
			'		}',
			'		// All k counters busy and x is a stranger: decrement every',
			'		// counter instead. Conceptually this deletes k+1 DIFFERENT',
			'		// elements from the stream at once (x plus one occurrence of',
			'		// each tracked element), which is why it can happen at most',
			'		// n/(k+1) times — the source of the frequency guarantee.',
			'		// Iteration order over the map does not matter here: every',
			'		// key is decremented uniformly, so the final state is the',
			'		// same whatever order Go visits them in.',
			'		for key := range counters {',
			'			counters[key]--',
			'			if counters[key] == 0 {',
			'				// Deleting during range is safe in Go, and freeing the',
			'				// slot is the point: the next stranger can be tracked.',
			'				delete(counters, key)',
			'			}',
			'		}',
			'	}',
			'	// Map iteration order is deliberately random in Go; the result',
			'	// contract is a SORTED candidate set, so collect then sort.',
			'	out := make([]string, 0, len(counters))',
			'	for key := range counters {',
			'		out = append(out, key)',
			'	}',
			'	sort.Strings(out)',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force → paying with decrements</h3>' +
			'<p>A <code>map[string]int</code> over the whole stream is exact but grows with ' +
			'the number of <em>distinct</em> keys — hopeless for URLs or IP addresses. The ' +
			'insight is an accounting trick, and the general principle deserves a name: ' +
			'<strong>frequent elements can afford to lose one count per rare element, ' +
			'because rare elements run out first</strong>. Each decrement step destroys one ' +
			'occurrence of <em>k+1 different</em> elements simultaneously (the stranger plus ' +
			'one of each tracked element). A stream of length n can fund at most ' +
			'<code>n/(k+1)</code> such steps, so any element with more than ' +
			'<code>n/(k+1)</code> occurrences cannot be fully canceled — <em>it is guaranteed ' +
			'to survive</em>. That one-sided guarantee (no false negatives, possible false ' +
			'positives) is the same shape as the Bloom filter’s and Count-Min’s.</p>' +
			'<h3>Candidates, then a second pass</h3>' +
			'<p>The tests include a stream where a once-seen element sits in the output — ' +
			'the summary promises “nothing frequent is missing”, not “everything present ' +
			'is frequent”. Production use is therefore two-pass: Misra–Gries shrinks a ' +
			'billion keys to k candidates, then one more pass (or an exact counter kept ' +
			'only for candidates) verifies real frequencies. Same pattern as a Bloom ' +
			'filter gating a disk read, or a Count-Min sketch gating a real counter.</p>' +
			'<h3>k = 1 is an old friend</h3>',
			{ code: '// one counter: increment on match, decrement on mismatch,\n// adopt when empty — the Boyer–Moore majority vote.\nHeavyHitters(stream, 1) // returns the only possible >n/2 element' },
			'<p>With a single counter the decrement rule collapses to Boyer–Moore majority ' +
			'vote (LeetCode 169): a true majority element (&gt; n/2 = n/(k+1)) always ' +
			'survives, as the harness’s noisy-majority case shows. Misra–Gries is that ' +
			'idea generalized from “the majority” to “the top-1/(k+1) fraction”.</p>' +
			'<p>In the wild: per-endpoint traffic top-K in API gateways, hot-key detection ' +
			'in caches and shard balancers (a heavy hitter is tomorrow’s hotspot), DDoS ' +
			'source identification, and trending queries — usually with the sibling ' +
			'Count-Min sketch supplying estimated counts for the candidates this summary ' +
			'names.</p>',
		],
		complexity: { time: 'O(n) amortized — each occurrence is added once and canceled at most once', space: 'O(k)' },
	});
})();
