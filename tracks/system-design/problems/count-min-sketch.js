/* Count-Min Sketch — Probabilistic Structures (Medium). "How many times has
 * this key appeared?" in constant memory — the counting cousin of the Bloom
 * filter, with the same one-sided error (never undercounts). Mixed harness:
 * the never-undercount guarantee is checked for every streamed key, and
 * overestimate bounds were validated against the reference natively.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="count-min sketch: each of 4 rows increments one counter; Count is the min across rows">' +
		'<text x="20" y="18" class="lbl">Add("get") — each of d=4 rows bumps ONE counter (its own hash of "get")</text>' +
		'<text x="30" y="52">"get"</text>' +
		// four rows of counters (a slice of each 64-wide row)
		'<g>' +
		'<rect x="150" y="34" width="30" height="22" fill="none" stroke="var(--edge)"/><rect x="180" y="34" width="30" height="22" fill="var(--accent)" fill-opacity="0.3" stroke="var(--accent)"/><rect x="210" y="34" width="30" height="22" fill="none" stroke="var(--edge)"/><rect x="240" y="34" width="30" height="22" fill="none" stroke="var(--edge)"/><rect x="270" y="34" width="30" height="22" fill="none" stroke="var(--edge)"/>' +
		'<rect x="150" y="62" width="30" height="22" fill="none" stroke="var(--edge)"/><rect x="180" y="62" width="30" height="22" fill="none" stroke="var(--edge)"/><rect x="210" y="62" width="30" height="22" fill="none" stroke="var(--edge)"/><rect x="240" y="62" width="30" height="22" fill="var(--accent)" fill-opacity="0.3" stroke="var(--accent)"/><rect x="270" y="62" width="30" height="22" fill="none" stroke="var(--edge)"/>' +
		'<rect x="150" y="90" width="30" height="22" fill="var(--accent)" fill-opacity="0.3" stroke="var(--accent)"/><rect x="180" y="90" width="30" height="22" fill="none" stroke="var(--edge)"/><rect x="210" y="90" width="30" height="22" fill="none" stroke="var(--edge)"/><rect x="240" y="90" width="30" height="22" fill="none" stroke="var(--edge)"/><rect x="270" y="90" width="30" height="22" fill="none" stroke="var(--edge)"/>' +
		'<rect x="150" y="118" width="30" height="22" fill="none" stroke="var(--edge)"/><rect x="180" y="118" width="30" height="22" fill="none" stroke="var(--edge)"/><rect x="210" y="118" width="30" height="22" fill="var(--warn)" fill-opacity="0.3" stroke="var(--warn)"/><rect x="240" y="118" width="30" height="22" fill="none" stroke="var(--edge)"/><rect x="270" y="118" width="30" height="22" fill="none" stroke="var(--edge)"/>' +
		'</g>' +
		'<text x="195" y="50" text-anchor="middle">50</text>' +
		'<text x="255" y="78" text-anchor="middle">50</text>' +
		'<text x="165" y="106" text-anchor="middle">50</text>' +
		'<text x="225" y="134" text-anchor="middle">53</text>' +
		'<text x="316" y="50" class="lbl">row 0</text>' +
		'<text x="316" y="78" class="lbl">row 1</text>' +
		'<text x="316" y="106" class="lbl">row 2</text>' +
		'<text x="316" y="134" class="lbl">row 3 — shared with "del" (collision inflates it)</text>' +
		'<path d="M 66 48 C 100 44 120 42 144 42" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowCMS)"/>' +
		'<path d="M 66 52 C 110 58 150 68 174 71" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowCMS)"/>' +
		'<path d="M 66 56 C 100 74 120 92 144 99" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowCMS)"/>' +
		'<path d="M 66 60 C 110 92 160 118 204 127" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowCMS)"/>' +
		'<text x="20" y="170" class="lbl">Count("get") = min(50, 50, 50, 53) = 50 — collisions only ever ADD, so min is the least-damaged row</text>' +
		'<defs><marker id="dgArrowCMS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'count-min-sketch',
		title: 'Count-Min Sketch',
		nav: 'Count-Min Sketch',
		difficulty: 'Medium',
		category: 'Probabilistic Structures',
		task: 'Implement Add and Count over a fixed 4×64 counter matrix.',

		prose: [
			'<h2>Count-Min Sketch</h2>' +
			'<p>A Bloom filter answers “have I seen this key?” — a Count-Min sketch answers ' +
			'“<em>how many times</em> have I seen it?”, still in fixed memory no matter how ' +
			'many distinct keys stream past. The price is the same one-sided error, now on ' +
			'counts: estimates may be <strong>too high</strong> (collisions add strangers’ ' +
			'increments) but <strong>never too low</strong>.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>The sketch is a fixed <code>depth=4</code> × <code>width=64</code> matrix of ' +
			'<code>uint32</code> counters (constants in the starter). Row <code>i</code>’s ' +
			'counter index for a string <code>s</code> uses double hashing — the same ' +
			'Kirsch–Mitzenmacher trick as the Bloom filter, both hash helpers provided:</p>',
			{ code: 'index(i, s) = (fnv1a(s) + uint32(i)*(fnv1(s)|1)) % width', lang: 'txt' },
			'<ul>' +
			'<li><code>NewSketch()</code> — provided: allocates the 4×64 matrix.</li>' +
			'<li><code>Add(s)</code> — increment one counter per row, at <code>index(i, s)</code>.</li>' +
			'<li><code>Count(s)</code> — the <strong>minimum</strong> across the 4 rows’ counters ' +
			'for <code>s</code>. Each row alone overestimates (other keys collide into it); ' +
			'the min keeps only the least-inflated estimate.</li>' +
			'</ul>',
		],

		starter: [
			'package main',
			'',
			SD.FNV_HELPERS,
			'',
			SD.FNV1_HELPER,
			'',
			'// Sketch dimensions. Depth rows give depth independent estimates;',
			'// width counters per row set how often strangers collide. Fixed',
			'// here so the tests and your implementation agree exactly.',
			'const depth = 4',
			'const width = 64',
			'',
			'// Sketch is a Count-Min sketch: a depth×width matrix of counters.',
			'// Add bumps one counter per row; Count takes the min across rows.',
			'type Sketch struct {',
			'	rows [][]uint32 // depth rows, width counters each',
			'}',
			'',
			'func NewSketch() *Sketch {',
			'	s := &Sketch{rows: make([][]uint32, depth)}',
			'	for i := range s.rows {',
			'		s.rows[i] = make([]uint32, width)',
			'	}',
			'	return s',
			'}',
			'',
			'// Add records one occurrence of s: for each row i, increment the',
			'// counter at (fnv1a(s) + uint32(i)*(fnv1(s)|1)) % width.',
			'func (s *Sketch) Add(str string) {',
			'	// your code here',
			'}',
			'',
			'// Count estimates how many times s was added: the MINIMUM of the',
			'// depth counters that Add would touch for s. Never undercounts.',
			'func (s *Sketch) Count(str string) uint32 {',
			'	return 999999 // your code here',
			'}',
			'',
		].join('\n'),

		// Mixed property/exact harness over a fixed stream (105 items,
		// 33 distinct keys). Validated with native Go against the reference:
		// at 4×64 the heavy keys ("get" 50, "put" 20, "del" 5) estimate
		// EXACTLY their true counts (max overestimate across all streamed
		// keys = 0), so the +8 slack only fails genuinely broken indexing.
		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"sort"',
			'	"strconv"',
			')',
			'',
			SD.HARNESS_RT,
			'',
			'// buildStream returns the fixed test stream and its true counts:',
			'// get×50, put×20, del×5, plus 30 distinct noise keys ×1.',
			'func buildStream() ([]string, map[string]int) {',
			'	truth := map[string]int{}',
			'	stream := []string{}',
			'	push := func(s string, n int) {',
			'		for i := 0; i < n; i++ {',
			'			stream = append(stream, s)',
			'		}',
			'		truth[s] += n',
			'	}',
			'	push("get", 50)',
			'	push("put", 20)',
			'	push("del", 5)',
			'	for i := 0; i < 30; i++ {',
			'		push("noise:"+strconv.Itoa(i), 1)',
			'	}',
			'	return stream, truth',
			'}',
			'',
			'func loaded() (*Sketch, map[string]int) {',
			'	s := NewSketch()',
			'	stream, truth := buildStream()',
			'	for _, item := range stream {',
			'		s.Add(item)',
			'	}',
			'	return s, truth',
			'}',
			'',
			'func main() {',
			'	results := make([]map[string]any, 0, 5)',
			'	check := func(name string, body func() string) {',
			'		r := map[string]any{"input": name, "want": "ok"}',
			'		runCase(r, func() {',
			'			msg := body()',
			'			r["pass"] = msg == ""',
			'			if msg == "" {',
			'				msg = "ok"',
			'			}',
			'			r["got"] = msg',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	check("never undercounts: Count(s) >= true count for every streamed key", func() string {',
			'		s, truth := loaded()',
			'		keys := make([]string, 0, len(truth))',
			'		for k := range truth {',
			'			keys = append(keys, k)',
			'		}',
			'		sort.Strings(keys) // deterministic first-failure reporting',
			'		for _, k := range keys {',
			'			if got := s.Count(k); got < uint32(truth[k]) {',
			'				return fmt.Sprintf("Count(%q) = %d, below true count %d — undercounting is forbidden", k, got, truth[k])',
			'			}',
			'		}',
			'		return ""',
			'	})',
			'',
			'	check("heavy keys stay tight: true <= Count <= true+8 for get/put/del", func() string {',
			'		s, truth := loaded()',
			'		for _, k := range []string{"get", "put", "del"} {',
			'			got := s.Count(k)',
			'			if got < uint32(truth[k]) || got > uint32(truth[k])+8 {',
			'				return fmt.Sprintf("Count(%q) = %d, want within [%d, %d]", k, got, truth[k], truth[k]+8)',
			'			}',
			'		}',
			'		return ""',
			'	})',
			'',
			'	check("estimates are deterministic (Count does not mutate)", func() string {',
			'		s, _ := loaded()',
			'		for _, k := range []string{"get", "noise:7", "absent"} {',
			'			a, b := s.Count(k), s.Count(k)',
			'			if a != b {',
			'				return fmt.Sprintf("Count(%q) returned %d then %d", k, a, b)',
			'			}',
			'		}',
			'		return ""',
			'	})',
			'',
			'	check("fresh sketch returns 0 for everything", func() string {',
			'		s := NewSketch()',
			'		for _, k := range []string{"get", "put", "absent", "noise:0"} {',
			'			if got := s.Count(k); got != 0 {',
			'				return fmt.Sprintf("empty sketch Count(%q) = %d, want 0", k, got)',
			'			}',
			'		}',
			'		return ""',
			'	})',
			'',
			'	check("never-added key overestimates only slightly: Count(\\"absent\\") <= 8", func() string {',
			'		s, _ := loaded()',
			'		if got := s.Count("absent"); got > 8 {',
			'			return fmt.Sprintf("Count(%q) = %d after 105 adds — collisions should stay small at 4x64", "absent", got)',
			'		}',
			'		return ""',
			'	})',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			SD.FNV_HELPERS,
			'',
			SD.FNV1_HELPER,
			'',
			'// Sketch dimensions. Depth rows give depth independent estimates;',
			'// width counters per row set how often strangers collide.',
			'const depth = 4',
			'const width = 64',
			'',
			'// Sketch is a Count-Min sketch: a depth×width matrix of counters.',
			'type Sketch struct {',
			'	rows [][]uint32 // depth rows, width counters each',
			'}',
			'',
			'func NewSketch() *Sketch {',
			'	s := &Sketch{rows: make([][]uint32, depth)}',
			'	for i := range s.rows {',
			'		s.rows[i] = make([]uint32, width)',
			'	}',
			'	return s',
			'}',
			'',
			'// index derives row i\'s counter slot by double hashing: two real',
			'// hashes simulate depth independent ones (Kirsch–Mitzenmacher).',
			'// The |1 forces an odd stride so row offsets never collapse onto',
			'// one slot, and uint32 overflow is harmless — only the value mod',
			'// width matters.',
			'func index(str string, i int) int {',
			'	return int((fnv1a(str) + uint32(i)*(fnv1(str)|1)) % width)',
			'}',
			'',
			'// Add bumps one counter in every row. Counters only ever grow,',
			'// which is what makes the estimate one-sided: a collision can',
			'// inflate a row\'s counter but nothing can ever drain it below the',
			'// key\'s true count.',
			'func (s *Sketch) Add(str string) {',
			'	for i := 0; i < depth; i++ {',
			'		s.rows[i][index(str, i)]++',
			'	}',
			'}',
			'',
			'// Count returns the minimum across rows. Every row\'s counter is',
			'// (true count) + (whatever collided there), so each row is an',
			'// overestimate — taking the min keeps the estimate from the row',
			'// that suffered the least collision damage. A key needs the bad',
			'// luck of a collision in ALL depth rows to be overestimated.',
			'func (s *Sketch) Count(str string) uint32 {',
			'	min := s.rows[0][index(str, 0)]',
			'	for i := 1; i < depth; i++ {',
			'		if c := s.rows[i][index(str, i)]; c < min {',
			'			min = c',
			'		}',
			'	}',
			'	return min',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>From bits to counters</h3>' +
			'<p>Take a Bloom filter and replace each bit with a counter: <code>Add</code> ' +
			'increments instead of setting, and the query returns a number instead of a ' +
			'boolean. The one-sided error survives the upgrade intact — bits could never ' +
			'be unset, counters can never shrink — so “definitely no” becomes “never below ' +
			'the true count”. The general principle is worth naming: <strong>sketching — ' +
			'hashing a stream into fixed-size state that answers queries approximately, ' +
			'with a bounded, one-sided error</strong>.</p>',
			{ code: 'row_i[(fnv1a(s) + uint32(i)*(fnv1(s)|1)) % width]++ // Add\nestimate = min over rows                            // Count' },
			'<h3>Why min works</h3>' +
			'<p>Every counter a key touches holds <em>its</em> count plus any colliding ' +
			'keys’ counts — always an overestimate, never under. The rows hash ' +
			'independently, so a key only stays overestimated if it is unlucky in ' +
			'<em>all</em> depth rows at once. Formally: with width w and depth d, the ' +
			'estimate exceeds truth by more than <code>2n/w</code> (n = stream length) with ' +
			'probability at most <code>2⁻ᵈ</code>-ish — error scales with <em>total traffic</em>, ' +
			'not with the number of distinct keys. That’s the whole pitch: memory is ' +
			'O(w·d) forever, even for a million distinct keys.</p>' +
			'<p>Note the asymmetry with a hash map: the sketch trades <em>which keys ' +
			'exist</em> away entirely — it can estimate a count for a key never seen ' +
			'(the harness’s <code>"absent"</code> gets 1, a collision) but it cannot ' +
			'enumerate keys. Pair it with a small top-K list when you need names, not just ' +
			'counts — that’s exactly the heavy-hitters problem next door.</p>' +
			'<h3>Where it runs</h3>' +
			'<p>Per-key rate limiting at the edge (millions of client IDs, kilobytes of ' +
			'state), heavy-hitter <em>prefilters</em> (only keys the sketch says are hot get ' +
			'a real counter), network flow accounting in switches, and trending-topic ' +
			'counters. Anywhere the key space is unbounded but the interesting keys are ' +
			'few, a CMS is the cheap first pass.</p>',
		],
		complexity: { time: 'O(d) per op', space: 'O(w·d) counters — fixed' },
	});
})();
