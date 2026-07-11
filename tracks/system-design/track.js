/* system-design — building blocks of large systems, as runnable Go.
 *
 * The premise: system-design interviews reward people who have *built* the
 * primitives, not just name-dropped them. Each item here takes one classic
 * infrastructure component (cache eviction, rate limiting, partitioning,
 * membership testing, load balancing) and has the learner implement its
 * core algorithm against a test harness — same kind:'problem' machinery
 * the LeetCode track uses, so the engine needs no changes.
 *
 * Two testing styles appear in the harnesses:
 *   - exact tables (LRU, token bucket, WRR) where the algorithm is
 *     deterministic and the expected sequence is part of the lesson;
 *   - property checks (consistent hashing, bloom filter) where exact
 *     outputs depend on hash values — the harness asserts the *guarantees*
 *     (determinism, balance, minimal disruption, no false negatives)
 *     because those guarantees are literally the point of the component.
 *
 * Problems live in problems/<slug>.js and register through
 * GoLearnSD.problem(). HARNESS_RT is duplicated from the leetcode track on
 * purpose: tracks are independent plugins, and sharing runtime snippets
 * across tracks would couple their load order.
 */
(function () {
	'use strict';

	GoLearn.registerTrack({
		id: 'system-design',
		title: 'System Design in Go',
		runner: 'go-wasm',
		order: [
			// Foundations
			'back-of-envelope',
			// Caching
			'lru-cache',
			// Rate Limiting
			'token-bucket',
			// Partitioning
			'consistent-hashing',
			// Probabilistic Structures
			'bloom-filter',
			// Load Balancing
			'smooth-wrr',
		],
	});

	// Every harness splices this in, so every harness import block includes
	// fmt and encoding/json. runCase isolates one test: a panicking user
	// implementation records a failure for that case but the harness still
	// reports every result (the sentinel must always print).
	var HARNESS_RT = [
		'// runCase executes one test body, converting a panic into a failed case.',
		'func runCase(r map[string]any, body func()) {',
		'	defer func() {',
		'		if p := recover(); p != nil {',
		'			r["pass"] = false',
		'			r["got"] = fmt.Sprintf("panic: %v", p)',
		'		}',
		'	}()',
		'	body()',
		'}',
		'',
		'// emitResults prints the sentinel-delimited JSON block the UI parses.',
		'// Printed last, so user output can never spoof it (the parser splits',
		'// on the LAST marker).',
		'func emitResults(results []map[string]any) {',
		'	buf, _ := json.Marshal(results)',
		'	fmt.Println("\\n__GOLEARN_RESULTS__")',
		'	fmt.Println(string(buf))',
		'	fmt.Println("__GOLEARN_END__")',
		'}',
	].join('\n');

	// FNV hashing, hand-rolled: the wasm interpreter's trimmed stdlib has no
	// hash/fnv, and seeing the algorithm spelled out (8 lines) demystifies
	// "just hash it" anyway. Problems that hash (consistent-hashing, bloom)
	// splice these into their STARTER so learners read what they're calling.
	var FNV_HELPERS = [
		'// fnv1a hashes s with 32-bit FNV-1a: XOR the byte in, then multiply',
		'// by the FNV prime. Small, fast, and well-spread — plenty for a ring.',
		'func fnv1a(s string) uint32 {',
		'	var h uint32 = 2166136261',
		'	for i := 0; i < len(s); i++ {',
		'		h ^= uint32(s[i])',
		'		h *= 16777619',
		'	}',
		'	return h',
		'}',
	].join('\n');

	// FNV-1 is FNV-1a with the multiply and XOR swapped — a cheap second,
	// independent hash for double hashing in the bloom filter.
	var FNV1_HELPER = [
		'// fnv1 is the multiply-first FNV variant — independent enough from',
		'// fnv1a to serve as the second hash in double hashing.',
		'func fnv1(s string) uint32 {',
		'	var h uint32 = 2166136261',
		'	for i := 0; i < len(s); i++ {',
		'		h *= 16777619',
		'		h ^= uint32(s[i])',
		'	}',
		'	return h',
		'}',
	].join('\n');

	// globalThis (not window) so the Node verification harness can load
	// track files unchanged.
	globalThis.GoLearnSD = {
		HARNESS_RT: HARNESS_RT,
		FNV_HELPERS: FNV_HELPERS,
		FNV1_HELPER: FNV1_HELPER,
		problem: function (def) {
			def.kind = 'problem';
			GoLearn.registerItem('system-design', def);
		},
	};

	// --- Foundations: back-of-envelope estimation ---------------------------
	// A lesson, not a problem: the "algorithm" is arithmetic, and the habit
	// being taught is turning fuzzy product numbers into load numbers before
	// designing anything.
	GoLearn.registerItem('system-design', {
		id: 'back-of-envelope',
		kind: 'lesson',
		title: 'Back-of-envelope estimation',
		nav: 'Back-of-envelope',
		category: 'Foundations',
		prose: [
			'<h2>Back-of-envelope estimation</h2>' +
			'<p>Every design conversation starts the same way: <em>how big is the ' +
			'problem?</em> Requests per second, bytes per day — rough numbers decide ' +
			'whether you need one Postgres box or a partitioned fleet, so estimate ' +
			'<em>before</em> you architect.</p>' +
			'<p>The arithmetic is deliberately crude. Two numbers carry most of it:</p>' +
			'<ul>' +
			'<li>A day is <code>86,400</code> seconds — call it 10<sup>5</sup>. ' +
			'So <strong>1M requests/day ≈ 12 QPS</strong>. Traffic that sounds huge often isn’t.</li>' +
			'<li>Traffic is not flat: a common rule of thumb is ' +
			'<strong>peak ≈ 2× average</strong> (spikier products use more).</li>' +
			'</ul>',
			{ code: 'avgQPS  = dailyRequests / 86400\npeakQPS = 2 * avgQPS\nstorage/day = items/day × avg item size', lang: 'txt' },
			'<div class="tip">Precision is a trap here: the inputs are guesses, so round ' +
			'aggressively and keep units visible. You are estimating the <em>order of ' +
			'magnitude</em>, deciding between designs — not invoicing anyone.</div>' +
			'<p>Try it on a photo-sharing service: 50M daily active users, each making ' +
			'about 10 requests a day.</p>',
		],
		task: 'Compute avgQPS and peakQPS from the constants (peak = 2× average).',
		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	// A photo-sharing service, from the product team\'s slide deck:',
			'	const dau = 50_000_000      // daily active users',
			'	const reqPerUser = 10       // requests per user per day',
			'	const secondsPerDay = 86_400',
			'',
			'	// Average load: total requests spread over the day.',
			'	avgQPS := 0 // TODO: compute from the constants above',
			'',
			'	// Rule of thumb: peak traffic runs about twice the average.',
			'	peakQPS := 0 // TODO',
			'',
			'	fmt.Println("avg qps:", avgQPS)',
			'	fmt.Println("peak qps:", peakQPS)',
			'}',
			'',
		].join('\n'),
		check: function (stdout, flat) {
			return flat.indexOf('avg qps: 5787') !== -1 && flat.indexOf('peak qps: 11574') !== -1;
		},
		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	// A photo-sharing service, from the product team\'s slide deck:',
			'	const dau = 50_000_000      // daily active users',
			'	const reqPerUser = 10       // requests per user per day',
			'	const secondsPerDay = 86_400',
			'',
			'	// Integer division is exactly the right tool: the inputs are',
			'	// guesses, so fractional QPS would be false precision.',
			'	avgQPS := dau * reqPerUser / secondsPerDay',
			'',
			'	// Rule of thumb: peak traffic runs about twice the average.',
			'	peakQPS := 2 * avgQPS',
			'',
			'	fmt.Println("avg qps:", avgQPS)',
			'	fmt.Println("peak qps:", peakQPS)',
			'}',
			'',
		].join('\n'),
	});
})();
