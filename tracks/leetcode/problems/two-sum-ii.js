/* Two Sum II — Two Pointers (Medium). Two Sum again, but the input is SORTED —
 * and that one word changes the right tool: converging pointers from both ends
 * replace the hash map, dropping extra space from O(n) to O(1).
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 190" width="500" height="190" role="img" aria-label="sorted array with two pointers converging from both ends">' +
		'<text x="20" y="18" class="lbl">numbers · target = 9 (1-indexed)</text>' +
		'<text x="200" y="18" class="lbl">sorted ↑</text>' +
		// array cells: l and r highlighted
		'<g>' +
		'<rect x="20" y="30" width="48" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="76" y="30" width="48" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="132" y="30" width="48" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="188" y="30" width="48" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="44" y="52" text-anchor="middle">2</text>' +
		'<text x="100" y="52" text-anchor="middle">7</text>' +
		'<text x="156" y="52" text-anchor="middle">11</text>' +
		'<text x="212" y="52" text-anchor="middle">15</text>' +
		'<text x="44" y="80" text-anchor="middle" class="lbl">1</text>' +
		'<text x="100" y="80" text-anchor="middle" class="lbl">2</text>' +
		'<text x="156" y="80" text-anchor="middle" class="lbl">3</text>' +
		'<text x="212" y="80" text-anchor="middle" class="lbl">4</text>' +
		'</g>' +
		// converging pointers
		'<text x="44" y="104" text-anchor="middle" style="fill:var(--ok)">l</text>' +
		'<path d="M 54 100 h 20" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowTS2)"/>' +
		'<text x="212" y="104" text-anchor="middle" style="fill:var(--accent)">r</text>' +
		'<path d="M 200 100 h -20" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowTS2a)"/>' +
		// the elimination steps
		'<text x="300" y="48" class="lbl">2 + 15 = 17 &gt; 9 → r--</text>' +
		'<text x="300" y="70" class="lbl">2 + 11 = 13 &gt; 9 → r--</text>' +
		'<text x="300" y="92" style="fill:var(--ok)">2 + 7 = 9 ✓ → [1, 2]</text>' +
		// why discarding r is safe
		'<text x="20" y="138" class="lbl">17 &gt; 9 with the SMALLEST partner available —</text>' +
		'<text x="20" y="156" class="lbl">so 15 can never be in the answer: discard it for good.</text>' +
		'<defs>' +
		'<marker id="dgArrowTS2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowTS2a" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	LC.problem({
		id: 'two-sum-ii',
		title: 'Two Sum II — Input Array Is Sorted',
		nav: 'Two Sum II',
		difficulty: 'Medium',
		category: 'Two Pointers',
		task: 'Implement twoSumII — make all 5 tests pass.',

		prose: [
			'<h2>Two Sum II — Input Array Is Sorted</h2>' +
			'<p>Given a <strong>1-indexed</strong> slice <code>numbers</code>, sorted in ' +
			'<em>non-decreasing</em> order, and an integer <code>target</code>, return the ' +
			'1-based indices <code>[i, j]</code> (with <code>i &lt; j</code>) of the two ' +
			'numbers that add up to <code>target</code>.</p>' +
			'<ul><li>Exactly one solution exists; an element may not be used twice.</li>' +
			'<li>The intended solution uses <strong>O(1) extra space</strong> — no map.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'twoSumII([]int{2, 7, 11, 15}, 9)  →  []int{1, 2}   // numbers[0] + numbers[1] == 9 (1-indexed answer)\ntwoSumII([]int{1, 3, 3, 4}, 6)    →  []int{2, 3}', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Plain <em>Two Sum</em> hands you an unsorted slice, so a hash map of ' +
			'seen values is the right tool. Here the statement says <em>sorted</em> — and ' +
			'that word is the trigger to switch tools. Start a pointer at each end: the ' +
			'sum of the two extremes tells you which pointer is <em>provably useless</em> ' +
			'and can be discarded:</p>' +
			DIAGRAM +
			'<p>Each step throws away one element forever, so the scan is O(n) with two ' +
			'index variables — no map, no extra memory.</p>',
		],

		starter: [
			'package main',
			'',
			'// twoSumII returns the 1-based indices [i, j] (i < j) of the two',
			'// numbers in the sorted (non-decreasing) slice numbers that add up',
			'// to target. Exactly one solution exists; an element may not be',
			'// used twice. Aim for O(1) extra space — the input is sorted.',
			'func twoSumII(numbers []int, target int) []int {',
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
			'	"reflect"',
			')',
			'',
			LC.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		numbers []int',
			'		target  int',
			'		want    []int',
			'	}',
			'	cases := []tc{',
			'		{[]int{2, 7, 11, 15}, 9, []int{1, 2}},',
			'		{[]int{1, 2, 3, 4, 10}, 11, []int{1, 5}},   // answer at both extremes',
			'		{[]int{-8, -3, 1, 5, 7}, 4, []int{2, 5}},   // negatives',
			'		{[]int{1, 3, 3, 4}, 6, []int{2, 3}},        // duplicate values form the pair',
			'		{[]int{1, 4}, 5, []int{1, 2}},              // smallest possible input',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("numbers=%v, target=%d", c.numbers, c.target),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := twoSumII(append([]int(nil), c.numbers...), c.target)',
			'			r["pass"] = reflect.DeepEqual(got, c.want)',
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
			'// twoSumII returns the 1-based indices [i, j] (i < j) of the two',
			'// numbers in the sorted slice numbers that add up to target.',
			'//',
			'// Converging pointers, one at each end. The key exchange argument',
			'// that makes every move SAFE (never discards the answer):',
			'//',
			'//   sum < target: numbers[l] is too small even when paired with the',
			'//   LARGEST value still in play (numbers[r]). Any other remaining',
			'//   partner is ≤ numbers[r], so every pair containing l undershoots.',
			'//   l cannot be in the answer — discard it (l++).',
			'//',
			'//   sum > target: symmetric. numbers[r] overshoots even with the',
			'//   SMALLEST remaining partner, so r is out of the running (r--).',
			'//',
			'// Sortedness is what powers the proof: only then are numbers[l] and',
			'// numbers[r] the extremes of the remaining window. Each iteration',
			'// permanently eliminates one index, so the loop runs at most n-1',
			'// times using two ints of state — no hash map needed.',
			'func twoSumII(numbers []int, target int) []int {',
			'	l, r := 0, len(numbers)-1',
			'	for l < r {',
			'		sum := numbers[l] + numbers[r]',
			'		switch {',
			'		case sum < target:',
			'			l++ // l undershoots with every remaining partner',
			'		case sum > target:',
			'			r-- // r overshoots with every remaining partner',
			'		default:',
			'			return []int{l + 1, r + 1} // convert to the required 1-based indices',
			'		}',
			'	}',
			'	return nil // unreachable: the problem guarantees a solution',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Two nested loops test every pair — O(n²). The <em>Two Sum</em> hash map ' +
			'gets that down to O(n) time but pays O(n) space, and it completely ignores ' +
			'the one new fact in the statement: the input is <strong>sorted</strong>.</p>' +
			'<h3>Let the sort do the searching</h3>' +
			'<p>Put a pointer at each end. Their sum is built from the smallest and the ' +
			'largest values still in play, which makes the comparison against ' +
			'<code>target</code> a <em>proof</em>, not a guess:</p>',
			{ code: 'l, r := 0, len(numbers)-1\nfor l < r {\n\tsum := numbers[l] + numbers[r]\n\tswitch {\n\tcase sum < target:\n\t\tl++ // numbers[l] fails even with the largest partner → eliminated\n\tcase sum > target:\n\t\tr-- // numbers[r] fails even with the smallest partner → eliminated\n\tdefault:\n\t\treturn []int{l + 1, r + 1}\n\t}\n}' },
			'<p>Why each move is safe — the elimination argument:</p>' +
			'<ul>' +
			'<li><strong>Too small → drop l.</strong> If <code>numbers[l] + numbers[r] &lt; ' +
			'target</code>, then pairing <code>l</code> with <em>any</em> remaining index ' +
			'gives an even smaller sum (everything else is ≤ <code>numbers[r]</code>). So ' +
			'no valid pair contains <code>l</code>; advancing past it loses nothing.</li>' +
			'<li><strong>Too big → drop r.</strong> Mirror image: <code>r</code> overshoots ' +
			'even against the smallest remaining value.</li>' +
			'<li><strong>Contrast with Two Sum.</strong> Unsorted input gives no such proof — ' +
			'there the map is the right tool. Sorted input is the trigger that changes the ' +
			'tool: same problem, different structure, different algorithm.</li>' +
			'</ul>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Converging two pointers on sorted data</strong> — reach for it when ' +
			'the input is sorted (or cheap to sort) and you need a pair judged by a ' +
			'condition that moves <em>monotonically</em> as either pointer moves: each ' +
			'comparison then eliminates one end for good, giving O(n) time and O(1) space. ' +
			'The trigger words are “sorted array” plus “find a pair/two numbers”. The same ' +
			'squeeze is the inner loop of <em>3Sum</em> (fix an anchor and the rest ' +
			'<em>is</em> this problem) and drives <em>Container With Most Water</em>, where ' +
			'the shorter wall is the provably useless end.</p>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
