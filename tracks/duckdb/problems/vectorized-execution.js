/* Vectorized Execution: 2048 at a Time — Execution (Medium). The engine
 * design between row-at-a-time Volcano iterators and full-column
 * materialization: process data in 2048-value chunks, and represent a
 * filter's survivors as a selection vector of indices instead of a copied
 * slice. The harness pins FilterChunk (indices, no copying), SumSelected
 * (aggregate through the selection vector), and a multi-chunk driver whose
 * partial last chunk must not be dropped. 2048 is a teaching constant the
 * harness passes in — it is DuckDB's actual vector size.
 */
(function () {
	'use strict';
	var T = GoLearnDK;

	// One chunk flows filter -> aggregate: the data vector never moves; only
	// a small index vector passes between operators. Marker id namespaced
	// (dgArrowDK02) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="a 2048-value chunk enters the filter, which emits a selection vector of surviving indices; the aggregate reads the original chunk through that selection vector without any copy">' +
		'<text x="20" y="24" class="lbl">one chunk through the pipeline — the data stays put, indices travel</text>' +
		// the data chunk
		'<rect x="30" y="44" width="150" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="105" y="66" text-anchor="middle">chunk [2048]</text>' +
		'<text x="105" y="82" text-anchor="middle" class="lbl">…9 3 41 7 88 5…</text>' +
		// the filter operator
		'<rect x="220" y="44" width="120" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="280" y="66" text-anchor="middle">Filter</text>' +
		'<text x="280" y="82" text-anchor="middle" class="lbl">pred(v) per value</text>' +
		'<path d="M 184 66 L 216 66" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDK02)"/>' +
		// the selection vector it emits
		'<rect x="380" y="44" width="120" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="440" y="66" text-anchor="middle">sel []int</text>' +
		'<text x="440" y="82" text-anchor="middle" class="lbl">[3 6 …] indices</text>' +
		'<path d="M 344 66 L 376 66" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDK02)"/>' +
		// the aggregate reads the ORIGINAL chunk through sel
		'<rect x="220" y="130" width="120" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="280" y="152" text-anchor="middle">Sum</text>' +
		'<text x="280" y="168" text-anchor="middle" class="lbl">chunk[sel[i]]</text>' +
		'<path d="M 440 92 C 440 140 380 152 344 152" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDK02)"/>' +
		'<path d="M 105 92 C 105 150 160 152 216 152" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowDK02)"/>' +
		'<text x="20" y="194" class="lbl">no filtered copy is ever materialized — the survivors exist only as indices</text>' +
		'<defs><marker id="dgArrowDK02" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'vectorized-execution',
		title: 'Vectorized Execution: 2048 at a Time',
		nav: 'vectorized execution',
		difficulty: 'Medium',
		category: 'Execution',
		task: 'Implement FilterChunk (selection vector of passing indices, no copying), SumSelected (aggregate through the selection vector), and a chunked driver over multi-chunk input.',

		prose: [
			'<h2>Vectorized Execution: 2048 at a Time</h2>' +
			'<p>Profile a classic row-at-a-time engine running ' +
			'<code>SELECT SUM(x) WHERE x % 7 = 0</code> over 100 million rows and ' +
			'the flame graph is humiliating: most of the CPU is not arithmetic but ' +
			'<em>plumbing</em> — a virtual <code>Next()</code> call per row per ' +
			'operator, tuple headers unpacked per row, a branch misprediction on ' +
			'every hop between operators. That is the Volcano iterator model, and ' +
			'it is why the same query runs 10–100x faster in a vectorized engine ' +
			'that moves <strong>2048 values per call</strong> instead of one:</p>' +
			'<ul>' +
			'<li><strong>Amortized dispatch.</strong> One <code>Next()</code> now ' +
			'produces a whole chunk, so the per-call overhead — virtual dispatch, ' +
			'operator bookkeeping, interpretation — is divided by 2048. Inside ' +
			'the call sits a tight loop over a plain array, exactly the shape ' +
			'compilers auto-vectorize and branch predictors learn.</li>' +
			'<li><strong>Cache-resident working set.</strong> 2048 × 8 B = 16 KB ' +
			'per vector — a few vectors fit comfortably in a 32–48 KB L1 cache. ' +
			'The chunk is still hot when the next operator touches it. Whole ' +
			'columns (the other extreme) would be streamed through cache and ' +
			'evicted between operators.</li>' +
			'<li><strong>Selection vectors instead of copies.</strong> A filter ' +
			'that copied survivors into a fresh slice would pay allocation and ' +
			'memcpy in every operator. Instead it emits a <em>selection ' +
			'vector</em> — the indices of passing values — and downstream ' +
			'operators read the original chunk through it: ' +
			'<code>chunk[sel[i]]</code>. The data never moves.</li>' +
			'</ul>',
			{ lang: 'txt', code: 'chunk (first 8 of 2048): [ 9  3  41  7  88  5  14  6 ]\npred : v % 7 == 0\n\nFilterChunk  -> sel = [3 6]          two indices, zero values copied\nSumSelected  -> chunk[3] + chunk[6] = 7 + 14 = 21\n\ndriver over 10,000 values in 2048-chunks: 2048,2048,2048,2048,1808\n(the 1808-value tail is a legal, shorter chunk — never dropped)' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>FilterChunk(data, pred)</code> returning the ' +
			'selection vector — indices into <code>data</code> whose values pass ' +
			'<code>pred</code>, in increasing order, without copying any values. ' +
			'Implement <code>SumSelected(data, sel)</code>, the aggregate that ' +
			'reads through the selection vector (skip any out-of-range index ' +
			'defensively — never panic). Then write the driver ' +
			'<code>ProcessChunks(data, chunkSize, pred)</code>: walk ' +
			'<code>data</code> in <code>chunkSize</code> windows, chain filter ' +
			'into sum per chunk, and return the total selected count and total ' +
			'sum. A non-positive <code>chunkSize</code> returns zeros.</p>' +
			'<div class="tip">Note what a selection vector preserves that a copy ' +
			'would too — order — and what it keeps that a copy loses: the ' +
			'<em>positions</em>. Downstream operators can still fetch sibling ' +
			'columns by the same indices, which is how a filter on one column ' +
			'drives a projection of another without re-aligning anything.</div>',
		],

		starter: [
			'package main',
			'',
			'// FilterChunk evaluates pred over one chunk and returns the selection',
			'// vector: the indices (in increasing order) of the values that pass.',
			'// No values are copied — survivors exist only as indices into data.',
			'func FilterChunk(data []int64, pred func(int64) bool) []int {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// SumSelected aggregates through a selection vector: the sum of',
			'// data[sel[i]] for every index in sel. An index outside',
			'// [0, len(data)) is skipped — an aggregate must be robust to a',
			'// malformed selection, and must never panic.',
			'func SumSelected(data []int64, sel []int) int64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// ProcessChunks is the pipeline driver: walk data in chunkSize',
			'// windows (the last window may be shorter), run FilterChunk then',
			'// SumSelected on each, and return the total number of selected',
			'// values and their total sum. chunkSize <= 0 returns (0, 0).',
			'func ProcessChunks(data []int64, chunkSize int, pred func(int64) bool) (int, int64) {',
			'	// your code here',
			'	return 0, 0',
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
			'	// The worked example from the prose: one small "chunk".',
			'	chunk := []int64{9, 3, 41, 7, 88, 5, 14, 6}',
			'	div7 := func(v int64) bool { return v%7 == 0 }',
			'	// Multi-chunk input: 0..9999. With chunkSize 2048 that is four',
			'	// full vectors plus a 1808-value tail — the boundary a naive',
			'	// driver drops. Multiples of 7 in [0,9999]: 1429 of them,',
			'	// summing 7 * (0+1+...+1428) = 7142142.',
			'	big := make([]int64, 10000)',
			'	for i := range big {',
			'		big[i] = int64(i)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"FilterChunk: v%7==0 over the worked chunk — indices, not values",',
			'			"[3 6]",',
			'			func() string { return fmt.Sprint(FilterChunk(chunk, div7)) }},',
			'		{"FilterChunk: nothing passes — an empty selection vector",',
			'			"[] (len 0)",',
			'			func() string {',
			'				sel := FilterChunk(chunk, func(v int64) bool { return v > 1000 })',
			'				return fmt.Sprintf("%v (len %d)", sel, len(sel))',
			'			}},',
			'		{"FilterChunk: everything passes — the identity selection",',
			'			"[0 1 2 3 4 5 6 7]",',
			'			func() string {',
			'				return fmt.Sprint(FilterChunk(chunk, func(v int64) bool { return true }))',
			'			}},',
			'		{"SumSelected reads the ORIGINAL chunk through sel: chunk[3]+chunk[6]",',
			'			"21",',
			'			func() string { return fmt.Sprintf("%d", SumSelected(chunk, []int{3, 6})) }},',
			'		{"SumSelected: the empty selection sums to 0",',
			'			"0",',
			'			func() string { return fmt.Sprintf("%d", SumSelected(chunk, []int{})) }},',
			'		{"driver: 10,000 values in 2048-chunks (4 full + 1808 tail), v%7==0",',
			'			"count=1429 sum=7142142",',
			'			func() string {',
			'				n, s := ProcessChunks(big, 2048, div7)',
			'				return fmt.Sprintf("count=%d sum=%d", n, s)',
			'			}},',
			'		{"driver: chunkSize 3 over 7 values — the partial last chunk must count",',
			'			"count=4 sum=16",',
			'			func() string {',
			'				n, s := ProcessChunks([]int64{1, 2, 3, 4, 5, 6, 7}, 3, func(v int64) bool { return v%2 == 1 })',
			'				return fmt.Sprintf("count=%d sum=%d", n, s)',
			'			}},',
			'		{"driver agrees with one giant chunk: chunking changes cost, never the answer",',
			'			"true",',
			'			func() string {',
			'				n1, s1 := ProcessChunks(big, 2048, div7)',
			'				n2, s2 := ProcessChunks(big, len(big), div7)',
			'				return fmt.Sprintf("%v", n1 == n2 && s1 == s2)',
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
			'// FilterChunk emits indices, not values. Capacity len(data) trades a',
			'// possibly-oversized allocation for zero re-allocs inside the loop —',
			'// the right call when a real engine would reuse the same buffer for',
			'// every chunk. The body is a tight scan over a plain array; a real',
			'// engine also specializes the predicate per type to remove the',
			'// indirect call, but the batching win is already the big one.',
			'func FilterChunk(data []int64, pred func(int64) bool) []int {',
			'	sel := make([]int, 0, len(data))',
			'	for i, v := range data {',
			'		if pred(v) {',
			'			sel = append(sel, i)',
			'		}',
			'	}',
			'	return sel',
			'}',
			'',
			'// SumSelected is the "read through the selection" pattern: the',
			'// gather data[sel[i]] touches only survivors, and because sel is',
			'// ascending the accesses stay in address order — cache-friendly',
			'// even when the filter was selective. The bounds guard downgrades',
			'// a malformed index to a no-op: an aggregate that skips one bad',
			'// index beats one that panics mid-pipeline.',
			'func SumSelected(data []int64, sel []int) int64 {',
			'	var sum int64',
			'	for _, idx := range sel {',
			'		if idx < 0 || idx >= len(data) {',
			'			continue',
			'		}',
			'		sum += data[idx]',
			'	}',
			'	return sum',
			'}',
			'',
			'// ProcessChunks is the vectorized pipeline in miniature: one',
			'// operator call per CHUNK, not per row. Each window is a subslice',
			'// — a view, no copy — so the chunk-local indices in sel line up',
			'// with it directly. Clamping end (rather than padding the tail)',
			'// makes the last window a legal shorter vector, exactly how a real',
			'// scan\'s final DataChunk carries count < 2048 instead of garbage',
			'// rows.',
			'func ProcessChunks(data []int64, chunkSize int, pred func(int64) bool) (int, int64) {',
			'	if chunkSize <= 0 {',
			'		return 0, 0',
			'	}',
			'	total := 0',
			'	var sum int64',
			'	for start := 0; start < len(data); start += chunkSize {',
			'		end := start + chunkSize',
			'		if end > len(data) {',
			'			end = len(data)',
			'		}',
			'		window := data[start:end]',
			'		sel := FilterChunk(window, pred)',
			'		total += len(sel)',
			'		sum += SumSelected(window, sel)',
			'	}',
			'	return total, sum',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why 2048, exactly</h3>' +
			'<p>DuckDB\'s <code>STANDARD_VECTOR_SIZE</code> is 2048, and the ' +
			'number is a deliberate compromise between the two designs it ' +
			'replaces. Too small (the limit is 1 — Volcano) and per-batch ' +
			'overhead — operator dispatch, chunk metadata, the call itself — ' +
			'dominates again. Too large (the limit is whole-column ' +
			'materialization, as in early MonetDB) and intermediates stop ' +
			'fitting in cache: each operator streams megabytes through L1/L2, ' +
			'evicting its own input, and memory bandwidth becomes the ceiling. ' +
			'At 2048 × 8 B = 16 KB per vector, a handful of vectors — input, ' +
			'selection, output, a sibling column — stay resident in a 32–48 KB ' +
			'L1 while a whole operator pipeline runs over them. This ' +
			'"vectorized Volcano" comes from the MonetDB/X100–VectorWise line ' +
			'of research; essentially every serious analytical engine since has ' +
			'adopted a form of it.</p>' +
			'<h3>What a DataChunk really carries</h3>' +
			'<p>Your <code>[]int64</code> + <code>[]int</code> pair is a faithful ' +
			'miniature of DuckDB\'s <code>Vector</code> plus ' +
			'<code>SelectionVector</code>. Three refinements in the real thing:</p>' +
			'<ul>' +
			'<li><strong>Selections compose lazily.</strong> Two stacked filters ' +
			'do not gather twice — the second filter evaluates only at the ' +
			'first\'s surviving indices and emits a new selection over the ' +
			'<em>same</em> untouched data. Values move at most once, when an ' +
			'operator genuinely needs dense output (before hashing, say).</li>' +
			'<li><strong>Vectors have formats.</strong> Besides flat arrays there ' +
			'are constant vectors (one value logically repeated 2048 times — a ' +
			'literal costs 8 bytes, not 16 KB) and dictionary vectors (indices ' +
			'into a distinct-value child — compression that survives ' +
			'<em>into</em> execution, so a predicate over a dictionary vector ' +
			'can be evaluated once per distinct value).</li>' +
			'<li><strong>Chunks are the unit of parallelism.</strong> ' +
			'Morsel-driven scheduling hands each worker a morsel (~120K rows) ' +
			'that it processes as a private stream of 2048-value chunks through ' +
			'its own pipeline state — no locks on the hot path, and a thread ' +
			'that finishes early steals the next morsel.</li>' +
			'</ul>' +
			'<h3>When vectorization loses</h3>' +
			'<p>Per-batch amortization assumes there is a batch. A point query ' +
			'(<code>WHERE id = 42</code>, one row out) gains nothing from ' +
			'2048-row machinery, which is why OLTP engines keep row iterators. ' +
			'Highly selective filters are the soft spot inside analytics too: ' +
			'when 3 of 2048 values survive, downstream operators still pay ' +
			'per-chunk overhead on nearly-empty chunks — engines counter by ' +
			'buffering survivors across chunks until a vector refills. The other ' +
			'ceiling is compilation: engines like HyPer JIT-compile the whole ' +
			'pipeline into one fused loop, eliminating even the per-vector ' +
			'interpretation DuckDB pays. Vectorization won the market anyway — ' +
			'it lands within a small factor of compiled code with none of the ' +
			'compile latency, portability, or debuggability pain.</p>',
		],
		complexity: { time: 'O(n) — the filter visits every value once; the aggregate touches only survivors', space: 'O(chunkSize) — one selection vector per in-flight chunk, never a filtered copy of the data' },
	});
})();
