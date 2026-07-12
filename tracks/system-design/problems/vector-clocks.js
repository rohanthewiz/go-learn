/* Vector Clocks — Replication & Consistency (Medium). Causality tracking
 * for leaderless replication: detect whether two versions are ordered or
 * concurrent, and merge histories. Exact-table harness; clocks are printed
 * through a sorted-key formatter so map iteration order can never leak in.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="two node timelines with vector clocks and a concurrent fork">' +
		// node timelines
		'<line x1="40" y1="55" x2="490" y2="55" stroke="var(--edge)" stroke-width="1.4"/>' +
		'<line x1="40" y1="145" x2="490" y2="145" stroke="var(--edge)" stroke-width="1.4"/>' +
		'<text x="10" y="60" class="lbl">A</text>' +
		'<text x="10" y="150" class="lbl">B</text>' +
		// events on A',
		'<circle cx="100" cy="55" r="6" fill="var(--accent)"/>' +
		'<text x="100" y="35" text-anchor="middle" class="lbl">{A:1}</text>' +
		'<circle cx="190" cy="55" r="6" fill="var(--accent)"/>' +
		'<text x="190" y="35" text-anchor="middle" class="lbl">{A:2}</text>' +
		// replication message A → B',
		'<path d="M 196 61 L 264 138" fill="none" stroke="var(--dim)" stroke-width="1.5" marker-end="url(#dgArrowVC)"/>' +
		'<text x="205" y="105" class="lbl">replicate</text>' +
		// B receives, merges, ticks its own counter',
		'<circle cx="270" cy="145" r="6" fill="var(--ok)"/>' +
		'<text x="270" y="170" text-anchor="middle" class="lbl">{A:2 B:1}</text>' +
		// the fork: both sides write without hearing from each other',
		'<circle cx="380" cy="55" r="6" fill="var(--err-edge)"/>' +
		'<text x="380" y="35" text-anchor="middle" class="lbl">{A:3}</text>' +
		'<circle cx="380" cy="145" r="6" fill="var(--err-edge)"/>' +
		'<text x="380" y="170" text-anchor="middle" class="lbl">{A:2 B:2}</text>' +
		'<text x="452" y="104" text-anchor="middle" style="fill:var(--err-edge)">concurrent</text>' +
		'<text x="452" y="122" text-anchor="middle" class="lbl">neither ≤ the other</text>' +
		'<defs><marker id="dgArrowVC" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'vector-clocks',
		title: 'Vector Clocks',
		nav: 'Vector Clocks',
		difficulty: 'Medium',
		category: 'Replication & Consistency',
		task: 'Implement Compare and Merge — make all 6 tests pass.',

		prose: [
			'<h2>Vector Clocks</h2>' +
			'<p>A single version counter cannot tell <em>newer</em> from <em>concurrent</em>: ' +
			'if two replicas both bump version 1 to version 2 while partitioned, the counters ' +
			'look identical although the writes conflict. A vector clock fixes this by keeping ' +
			'<strong>one counter per node</strong> — <code>type VClock map[string]int</code>. ' +
			'A node increments its own entry on each local write, and every replicated update ' +
			'carries the whole vector, so causality travels with the data:</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<ul>' +
			'<li><code>Compare(a, b)</code> — returns <code>"before"</code>, <code>"after"</code>, ' +
			'<code>"equal"</code>, or <code>"concurrent"</code>. A missing key counts as 0. ' +
			'Define <code>a ≤ b</code> as <code>a[k] ≤ b[k]</code> for every key: if only ' +
			'<code>a ≤ b</code> holds → <code>"before"</code>; only <code>b ≤ a</code> → ' +
			'<code>"after"</code>; both → <code>"equal"</code>; neither → ' +
			'<code>"concurrent"</code>.</li>' +
			'<li><code>Merge(a, b)</code> — the elementwise maximum over the union of keys: ' +
			'the smallest clock that has "seen" both histories. It must return a ' +
			'<em>new</em> map — the harness checks that neither input was mutated.</li>' +
			'</ul>' +
			'<p>The harness prints clocks through its own sorted-key formatter, so you never ' +
			'need to worry about map iteration order — but do not rely on it either.</p>',
			{ code: 'Compare(VClock{"A": 1}, VClock{"A": 2, "B": 1})  →  "before"\nCompare(VClock{"A": 2, "B": 1}, VClock{"A": 1, "B": 2})  →  "concurrent"\nMerge(VClock{"A": 2, "B": 1}, VClock{"B": 3, "C": 4})  →  {A:2 B:3 C:4}', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// VClock is a vector clock: one logical counter per node ID.',
			'// A key that is absent means that node\'s counter is 0.',
			'type VClock map[string]int',
			'',
			'// Compare reports the causal relation of a to b:',
			'//   "before"     a happened-before b   (a ≤ b elementwise, a ≠ b)',
			'//   "after"      b happened-before a',
			'//   "equal"      identical histories',
			'//   "concurrent" neither dominates — a genuine conflict',
			'// Missing keys count as 0 on either side.',
			'func Compare(a, b VClock) string {',
			'	return "" // your code here',
			'}',
			'',
			'// Merge returns a NEW clock: the elementwise max over the union of',
			'// keys of a and b. It must not mutate either input.',
			'func Merge(a, b VClock) VClock {',
			'	return nil // your code here',
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
			'	"strconv"',
			'	"strings"',
			')',
			'',
			SD.HARNESS_RT,
			'',
			'// fmtClock renders a clock with SORTED keys — deterministic output',
			'// regardless of Go\'s randomized map iteration order.',
			'func fmtClock(c VClock) string {',
			'	keys := make([]string, 0, len(c))',
			'	for k := range c {',
			'		keys = append(keys, k)',
			'	}',
			'	sort.Strings(keys)',
			'	parts := make([]string, 0, len(keys))',
			'	for _, k := range keys {',
			'		parts = append(parts, k+":"+strconv.Itoa(c[k]))',
			'	}',
			'	return "{" + strings.Join(parts, " ") + "}"',
			'}',
			'',
			'func main() {',
			'	results := make([]map[string]any, 0, 6)',
			'	check := func(input, want string, body func() string) {',
			'		r := map[string]any{"input": input, "want": want}',
			'		runCase(r, func() {',
			'			got := body()',
			'			r["pass"] = got == want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	check("causal chain: Compare({A:1},{A:2 B:1}) / reversed", "before/after", func() string {',
			'		return Compare(VClock{"A": 1}, VClock{"A": 2, "B": 1}) + "/" +',
			'			Compare(VClock{"A": 2, "B": 1}, VClock{"A": 1})',
			'	})',
			'',
			'	check("identical histories: Compare({A:2 B:1},{A:2 B:1})", "equal", func() string {',
			'		return Compare(VClock{"A": 2, "B": 1}, VClock{"A": 2, "B": 1})',
			'	})',
			'',
			'	check("classic siblings: Compare({A:2 B:1},{A:1 B:2})", "concurrent", func() string {',
			'		return Compare(VClock{"A": 2, "B": 1}, VClock{"A": 1, "B": 2})',
			'	})',
			'',
			'	check("missing key means zero: Compare({A:1},{B:1})", "concurrent", func() string {',
			'		return Compare(VClock{"A": 1}, VClock{"B": 1})',
			'	})',
			'',
			'	check("Merge({A:2 B:1},{B:3 C:4})", "{A:2 B:3 C:4}", func() string {',
			'		return fmtClock(Merge(VClock{"A": 2, "B": 1}, VClock{"B": 3, "C": 4}))',
			'	})',
			'',
			'	check("Merge must not mutate its inputs", "m={A:2 B:3} a={A:2 B:1} b={A:1 B:3}", func() string {',
			'		a := VClock{"A": 2, "B": 1}',
			'		b := VClock{"A": 1, "B": 3}',
			'		m := Merge(a, b)',
			'		return "m=" + fmtClock(m) + " a=" + fmtClock(a) + " b=" + fmtClock(b)',
			'	})',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// VClock is a vector clock: one logical counter per node ID.',
			'// A key that is absent means that node\'s counter is 0.',
			'type VClock map[string]int',
			'',
			'// Compare reports the causal relation of a to b.',
			'//',
			'// The comparison is a partial order: compute "a ≤ b elementwise"',
			'// and "b ≤ a elementwise" independently, then read the four cases',
			'// off the pair of booleans. Two loops (one over each map\'s keys)',
			'// handle the union of keys without building it: a key missing from',
			'// the other map reads as 0 via Go\'s zero-value map lookup, which',
			'// is exactly the semantics vector clocks want.',
			'func Compare(a, b VClock) string {',
			'	aLeB, bLeA := true, true',
			'	for k, av := range a {',
			'		if av > b[k] { // b[k] is 0 when absent',
			'			aLeB = false',
			'		}',
			'	}',
			'	for k, bv := range b {',
			'		if bv > a[k] {',
			'			bLeA = false',
			'		}',
			'	}',
			'	switch {',
			'	case aLeB && bLeA:',
			'		return "equal"',
			'	case aLeB:',
			'		return "before"',
			'	case bLeA:',
			'		return "after"',
			'	default:',
			'		return "concurrent" // neither dominates: a real conflict',
			'	}',
			'}',
			'',
			'// Merge returns the elementwise max over the union of keys — the',
			'// least upper bound of the two histories: the smallest clock that',
			'// causally follows both inputs.',
			'//',
			'// A fresh map is allocated and both inputs are only read, never',
			'// written: clocks travel attached to stored values, so mutating an',
			'// argument would silently rewrite another version\'s history.',
			'func Merge(a, b VClock) VClock {',
			'	m := make(VClock, len(a)+len(b))',
			'	for k, v := range a {',
			'		m[k] = v',
			'	}',
			'	for k, v := range b {',
			'		if v > m[k] {',
			'			m[k] = v',
			'		}',
			'	}',
			'	return m',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Happens-before, made mechanical</h3>' +
			'<p>The general principle is <strong>causality tracking via logical clocks</strong>: ' +
			'order events by <em>what information could have reached them</em>, not by wall ' +
			'time. Wall clocks are useless here — replicas\' clocks skew by milliseconds while ' +
			'conflicting writes land microseconds apart, and NTP steps time backwards. So each ' +
			'node counts its <em>own</em> events, and a vector of those counters encodes exactly ' +
			'which prefix of every node\'s history a version has seen. <code>a ≤ b</code> ' +
			'elementwise means everything that led to <code>a</code> also reached ' +
			'<code>b</code> — the happens-before relation, computed with two loops.</p>',
			{ code: 'for k, av := range a {\n\tif av > b[k] { // missing key reads as 0\n\t\taLeB = false\n\t}\n}\n// ...same in reverse for bLeA, then:\n// both ≤ → equal · one ≤ → before/after · neither → concurrent' },
			'<h3>Why per-node counters, and what "concurrent" buys you</h3>' +
			'<p>Because only node A ever increments <code>A</code>, the vector components never ' +
			'race — each is a single-writer counter, which is what makes the elementwise ' +
			'comparison meaningful. The payoff is the fourth verdict: <em>concurrent</em>. ' +
			'Dynamo used exactly this to detect conflicting shopping-cart writes: ordered ' +
			'versions are silently superseded, concurrent ones are kept as <em>siblings</em> ' +
			'and surfaced to the application (or a CRDT) to reconcile, with ' +
			'<code>Merge</code> producing the clock for the reconciled value. Riak shipped the ' +
			'same design; the quorum problem\'s "highest version wins" is the lossy shortcut ' +
			'this machinery exists to avoid.</p>' +
			'<h3>Contrast: Lamport clocks</h3>' +
			'<p>A Lamport clock is a single scalar (<code>tick = max(local, received) + 1</code>). ' +
			'It gives a total order consistent with causality — handy for tie-breaking — but it ' +
			'cannot <em>detect</em> concurrency: <code>L(a) &lt; L(b)</code> does not imply a ' +
			'caused b. Vector clocks pay O(nodes) space per value to answer that question ' +
			'precisely; that cost is why systems prune old entries or fall back to ' +
			'last-write-wins when the vector grows.</p>',
		],
		complexity: { time: 'O(|a| + |b|)', space: 'O(|a| + |b|) for Merge' },
	});
})();
