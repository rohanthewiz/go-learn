/* Koko Eating Bananas — Binary Search (Medium). The track's introduction
 * to binary search over an ANSWER SPACE rather than an array: the
 * candidate speeds 1..max(piles) form a line where a monotone yes/no
 * predicate ("can Koko finish in h hours at speed k?") flips exactly
 * once from false to true — and binary search finds that boundary.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// The answer space k = 1..11 drawn as a number line, hours(k) beneath
	// each candidate, the feasible region in green. Cell centers at
	// x = 38 + 40*i.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="binary search over eating speeds for piles 3 6 7 11 with h = 8">' +
		'<text x="20" y="14" class="lbl">piles = [3, 6, 7, 11] · h = 8 · answer space k = 1..max(piles)</text>' +
		// infeasible cells k = 1..3
		'<g>' +
		'<rect x="20" y="26" width="36" height="28" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'<rect x="60" y="26" width="36" height="28" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'<rect x="100" y="26" width="36" height="28" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="4 3"/>' +
		'</g>' +
		// feasible cells k = 4..11 (k = 4 is the boundary, accented)
		'<g>' +
		'<rect x="140" y="26" width="36" height="28" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="180" y="26" width="36" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="220" y="26" width="36" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="260" y="26" width="36" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="300" y="26" width="36" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="340" y="26" width="36" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="380" y="26" width="36" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="420" y="26" width="36" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'</g>' +
		// k values
		'<g text-anchor="middle">' +
		'<text x="38" y="45" class="lbl">1</text><text x="78" y="45" class="lbl">2</text>' +
		'<text x="118" y="45" class="lbl">3</text><text x="158" y="45" style="fill:var(--accent)">4</text>' +
		'<text x="198" y="45">5</text><text x="238" y="45">6</text><text x="278" y="45">7</text>' +
		'<text x="318" y="45">8</text><text x="358" y="45">9</text><text x="398" y="45">10</text>' +
		'<text x="438" y="45">11</text>' +
		'</g>' +
		// hours(k) beneath each speed
		'<text x="20" y="76" class="lbl">hours(k):</text>' +
		'<g text-anchor="middle">' +
		'<text x="38" y="94" class="lbl">27</text><text x="78" y="94" class="lbl">15</text>' +
		'<text x="118" y="94" class="lbl">10</text><text x="158" y="94" style="fill:var(--accent)">8</text>' +
		'<text x="198" y="94" class="lbl">8</text><text x="238" y="94" class="lbl">6</text>' +
		'<text x="278" y="94" class="lbl">5</text><text x="318" y="94" class="lbl">5</text>' +
		'<text x="358" y="94" class="lbl">5</text><text x="398" y="94" class="lbl">5</text>' +
		'<text x="438" y="94" class="lbl">4</text>' +
		'</g>' +
		// the monotone predicate row
		'<g text-anchor="middle">' +
		'<text x="38" y="120" class="lbl">✗</text><text x="78" y="120" class="lbl">✗</text>' +
		'<text x="118" y="120" class="lbl">✗</text><text x="158" y="120" style="fill:var(--ok)">✓</text>' +
		'<text x="198" y="120" style="fill:var(--ok)">✓</text><text x="238" y="120" style="fill:var(--ok)">✓</text>' +
		'<text x="278" y="120" style="fill:var(--ok)">✓</text><text x="318" y="120" style="fill:var(--ok)">✓</text>' +
		'<text x="358" y="120" style="fill:var(--ok)">✓</text><text x="398" y="120" style="fill:var(--ok)">✓</text>' +
		'<text x="438" y="120" style="fill:var(--ok)">✓</text>' +
		'</g>' +
		'<text x="20" y="148" class="lbl">feasible(k) = hours(k) ≤ h flips false→true exactly once — it is monotone</text>' +
		'<text x="20" y="170" style="fill:var(--accent)">binary search the flip point: the first ✓ is the answer, k = 4</text>' +
		'</svg>';

	LC.problem({
		id: 'koko-eating-bananas',
		title: 'Koko Eating Bananas',
		nav: 'Koko Bananas',
		difficulty: 'Medium',
		category: 'Binary Search',
		task: 'Implement minEatingSpeed — make all 5 tests pass.',

		prose: [
			'<h2>Koko Eating Bananas</h2>' +
			'<p>Koko has <code>piles</code> of bananas and <code>h</code> hours before the ' +
			'guards return. Each hour she picks one pile and eats <code>k</code> bananas ' +
			'from it; if the pile holds fewer than <code>k</code>, she finishes it and eats ' +
			'nothing more that hour (a pile of size <code>p</code> takes ' +
			'<code>ceil(p / k)</code> hours). Return the <em>minimum</em> integer speed ' +
			'<code>k ≥ 1</code> that finishes every pile within <code>h</code> hours.</p>' +
			'<ul><li><code>h ≥ len(piles)</code> always — a solution is guaranteed to exist.</li>' +
			'<li>She never splits an hour across two piles: 4 leftover bananas at speed 10 still cost a full hour.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'minEatingSpeed([]int{3, 6, 7, 11}, 8)        →  4\nminEatingSpeed([]int{30, 11, 23, 4, 20}, 5)  →  30', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>There is nothing to binary-search in <code>piles</code> itself — the sorted ' +
			'thing here is the <em>answer space</em>. Eating faster never hurts, so the ' +
			'question “can speed k finish in h hours?” is <strong>monotone</strong>: all ' +
			'false up to some boundary, all true after it. That boundary is the answer, and ' +
			'a monotone yes/no line is exactly what binary search bisects:</p>' +
			DIAGRAM +
			'<p>O(log max(piles)) probes, each costing one O(n) feasibility scan.</p>',
		],

		starter: [
			'package main',
			'',
			'// minEatingSpeed returns the minimum integer speed k (bananas per',
			'// hour, k >= 1) at which every pile can be finished within h hours.',
			'// A pile of size p takes ceil(p/k) hours; hours are never split',
			'// across piles. h >= len(piles) is guaranteed.',
			'func minEatingSpeed(piles []int, h int) int {',
			'	// your code here',
			'	return 0',
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
			'		piles []int',
			'		h     int',
			'		want  int',
			'	}',
			'	cases := []tc{',
			'		{[]int{3, 6, 7, 11}, 8, 4},',
			'		{[]int{30, 11, 23, 4, 20}, 5, 30},',
			'		{[]int{30, 11, 23, 4, 20}, 6, 23},',
			'		{[]int{10}, 3, 4},',
			'		{[]int{1, 1, 1, 1}, 4, 1},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("piles=%v, h=%d", c.piles, c.h),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := minEatingSpeed(append([]int(nil), c.piles...), c.h)',
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
			'// hoursAt reports how many hours it takes to eat every pile at',
			'// speed k. Each pile costs ceil(p/k) hours; with integers that is',
			'// (p + k - 1) / k — adding k-1 bumps any nonzero remainder into',
			'// one extra unit while leaving exact multiples alone. This avoids',
			'// the float round-trip of math.Ceil entirely.',
			'func hoursAt(piles []int, k int) int {',
			'	hours := 0',
			'	for _, p := range piles {',
			'		hours += (p + k - 1) / k',
			'	}',
			'	return hours',
			'}',
			'',
			'// minEatingSpeed returns the minimum speed k that finishes all',
			'// piles within h hours.',
			'//',
			'// Binary search on the ANSWER, not the input. The candidate speeds',
			'// 1..max(piles) are implicitly “sorted” by the monotone predicate',
			'// feasible(k) = hoursAt(k) <= h: eating faster never takes longer,',
			'// so the predicate is false…false,true…true and we bisect for the',
			'// first true. max(piles) is a sufficient upper bound because at',
			'// that speed every pile takes exactly one hour and h >= len(piles)',
			'// is guaranteed — faster speeds cannot beat one hour per pile.',
			'func minEatingSpeed(piles []int, h int) int {',
			'	maxPile := 0',
			'	for _, p := range piles {',
			'		if p > maxPile {',
			'			maxPile = p',
			'		}',
			'	}',
			'	// Invariant: the answer is always inside [lo, hi]. This is the',
			'	// “find first true” shape — hi is a KNOWN-feasible candidate, so',
			'	// a feasible mid becomes the new hi (mid itself may be the',
			'	// answer, we must not skip past it) while an infeasible mid is',
			'	// excluded with lo = mid+1. The window shrinks every step',
			'	// because mid < hi whenever lo < hi, so lo == hi terminates.',
			'	lo, hi := 1, maxPile',
			'	for lo < hi {',
			'		mid := lo + (hi-lo)/2',
			'		if hoursAt(piles, mid) <= h {',
			'			hi = mid // feasible: keep mid as a live candidate',
			'		} else {',
			'			lo = mid + 1 // too slow: everything <= mid is too slow too',
			'		}',
			'	}',
			'	return lo // lo == hi: the first feasible speed',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Try k = 1, 2, 3, … and return the first speed whose total hours fit in ' +
			'<code>h</code>. Correct, and each check is a cheap O(n) scan — but the answer ' +
			'can be as large as max(piles), so this is O(n · max) probes. With piles in the ' +
			'billions that’s a dead end. The waste is glaring: after learning k = 500 is too ' +
			'slow, the linear scan still dutifully tries 501.</p>' +
			'<h3>The insight: binary search the answer space</h3>' +
			'<p>Nothing in <code>piles</code> is sorted — but the <em>candidate answers</em> ' +
			'behave as if they were. Define <code>feasible(k) = hoursAt(k) ≤ h</code>. ' +
			'Eating faster never takes more hours, so feasible is monotone: ' +
			'<code>✗ ✗ ✗ ✓ ✓ ✓ …</code>. A monotone predicate over a range is exactly the ' +
			'structure binary search needs; the “array” 1..max(piles) never has to exist. ' +
			'This one reframing — <em>search the answers, verify with a predicate</em> — ' +
			'solves a whole family of problems (ship capacity, split array, minimum days).</p>',
			{ code: 'lo, hi := 1, maxPile // answer is guaranteed inside [lo, hi]\nfor lo < hi {\n\tmid := lo + (hi-lo)/2\n\tif hoursAt(piles, mid) <= h {\n\t\thi = mid // mid works — but a smaller k might too\n\t} else {\n\t\tlo = mid + 1 // mid fails — so does everything below it\n\t}\n}\nreturn lo // first k where feasible flips to true' },
			'<p>The details that matter:</p>' +
			'<ul>' +
			'<li><strong><code>hi = mid</code>, not <code>mid - 1</code>.</strong> A feasible ' +
			'mid might BE the minimum — discard it and you can return an answer one too ' +
			'high. This “first true” variant pairs <code>lo &lt; hi</code> with ' +
			'<code>hi = mid</code>; progress is still guaranteed because mid always lands ' +
			'strictly below hi.</li>' +
			'<li><strong>Integer ceiling: <code>(p + k - 1) / k</code>.</strong> Go’s integer ' +
			'division truncates, so add <code>k-1</code> first: any nonzero remainder tips ' +
			'over into one extra hour, exact multiples don’t. No float conversion, no ' +
			'<code>math.Ceil</code> precision worries.</li>' +
			'<li><strong>Bounds are part of the proof.</strong> lo = 1 (speeds below 1 are ' +
			'meaningless), hi = max(piles) (at that speed each pile is one hour, and ' +
			'<code>h ≥ len(piles)</code> makes that feasible — going faster can’t improve ' +
			'a 1-hour pile).</li>' +
			'<li><strong>Cost:</strong> O(n log max(piles)) — each of the ~log(max) probes ' +
			'pays one O(n) feasibility scan.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n log max(piles))', space: 'O(1)' },
	});
})();
