/* Majority Element — Arrays & Hashing (Easy). Boyer–Moore voting: find
 * the >n/2 element in one pass with O(1) space by letting unequal pairs
 * annihilate each other. Starter sentinel is -1<<31 because negative
 * values are legitimate answers.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 210" width="540" height="210" role="img" aria-label="Boyer-Moore voting trace over 2,2,1,1,1,2,2">' +
		'<text x="20" y="20" class="lbl">nums = [2, 2, 1, 1, 1, 2, 2] — candidate/count trace</text>' +
		// element cells (7 cells, 56px pitch, at y=32)
		'<g>' +
		'<rect x="20" y="32" width="44" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="76" y="32" width="44" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="132" y="32" width="44" height="34" rx="4" fill="none" stroke="var(--err-edge)"/>' +
		'<rect x="188" y="32" width="44" height="34" rx="4" fill="none" stroke="var(--err-edge)"/>' +
		'<rect x="244" y="32" width="44" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="300" y="32" width="44" height="34" rx="4" fill="none" stroke="var(--err-edge)"/>' +
		'<rect x="356" y="32" width="44" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="42" y="54" text-anchor="middle">2</text>' +
		'<text x="98" y="54" text-anchor="middle">2</text>' +
		'<text x="154" y="54" text-anchor="middle">1</text>' +
		'<text x="210" y="54" text-anchor="middle">1</text>' +
		'<text x="266" y="54" text-anchor="middle">1</text>' +
		'<text x="322" y="54" text-anchor="middle">2</text>' +
		'<text x="378" y="54" text-anchor="middle">2</text>' +
		'</g>' +
		// candidate / count rows
		'<text x="20" y="96" class="lbl">cand</text>' +
		'<text x="20" y="118" class="lbl">count</text>' +
		'<g style="fill:var(--dim)">' +
		'<text x="42" y="96" text-anchor="middle">2</text><text x="42" y="118" text-anchor="middle">1</text>' +
		'<text x="98" y="96" text-anchor="middle">2</text><text x="98" y="118" text-anchor="middle">2</text>' +
		'<text x="154" y="96" text-anchor="middle">2</text><text x="154" y="118" text-anchor="middle">1</text>' +
		'<text x="210" y="96" text-anchor="middle">2</text><text x="210" y="118" text-anchor="middle">0</text>' +
		'<text x="322" y="96" text-anchor="middle">1</text><text x="322" y="118" text-anchor="middle">0</text>' +
		'</g>' +
		'<g style="fill:var(--accent)">' +
		'<text x="266" y="96" text-anchor="middle">1</text><text x="266" y="118" text-anchor="middle">1</text>' +
		'<text x="378" y="96" text-anchor="middle">2</text><text x="378" y="118" text-anchor="middle">1</text>' +
		'</g>' +
		// adopt arrows: count hit 0 → next element becomes candidate
		'<path d="M 210 126 C 220 150 245 150 260 130" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowMJE)"/>' +
		'<path d="M 322 126 C 332 150 360 150 374 130" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowMJE)"/>' +
		'<text x="230" y="166" class="lbl">count == 0 → prefix fully cancelled; adopt the next element</text>' +
		'<text x="20" y="196" style="fill:var(--ok)">last candidate standing = 2 ✓ (four 2s can’t be annihilated by three 1s)</text>' +
		'<defs><marker id="dgArrowMJE" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'majority-element',
		title: 'Majority Element',
		nav: 'Majority Element',
		difficulty: 'Easy',
		category: 'Arrays & Hashing',
		task: 'Implement majorityElement — make all 5 tests pass.',

		prose: [
			'<h2>Majority Element</h2>' +
			'<p>Given a non-empty slice <code>nums</code>, return the element that appears ' +
			'<strong>more than ⌊n/2⌋ times</strong>. The majority element is guaranteed to ' +
			'exist. Values may be negative.</p>' +
			'<h3>Example</h3>',
			{ code: 'majorityElement([]int{3, 2, 3})              →  3\nmajorityElement([]int{2, 2, 1, 1, 1, 2, 2})  →  2   // 4 of 7 > 7/2', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>A map of counts works in O(n) space. But “more than half” is a much ' +
			'stronger fact than “most frequent” — strong enough for O(1) space. Keep one ' +
			'<em>candidate</em> and a <em>count</em>: matching elements vote the count up, ' +
			'different elements cancel one vote; at zero, adopt the next element:</p>' +
			DIAGRAM +
			'<p>Every cancellation pairs one candidate occurrence against one different ' +
			'element. The majority owns more than half of all occurrences, so it can never ' +
			'be fully paired off — whoever survives the annihilation must be it.</p>',
		],

		starter: [
			'package main',
			'',
			'// majorityElement returns the element appearing MORE than len(nums)/2',
			'// times. nums is non-empty and the majority element always exists.',
			'// Values may be negative.',
			'func majorityElement(nums []int) int {',
			'	// your code here',
			'	return -1 << 31 // sentinel — negative answers are legitimate, so pick an extreme',
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
			'		nums []int',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{[]int{3, 2, 3}, 3},',
			'		// the classic trace: the count hits zero twice and the candidate',
			'		// flips to the minority mid-stream before the majority reclaims it.',
			'		{[]int{2, 2, 1, 1, 1, 2, 2}, 2},',
			'		{[]int{7}, 7},',
			'		{[]int{5, 5, 5, 5}, 5},',
			'		// negative majority — catches sentinel/zero-default confusions.',
			'		{[]int{-1, -1, 2, -1, 3}, -1},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%v", c.nums),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// Copy: a sorting-based solution may reorder its input.',
			'			got := majorityElement(append([]int(nil), c.nums...))',
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
			'// majorityElement returns the element appearing MORE than len(nums)/2',
			'// times, using Boyer–Moore voting: O(n) time, O(1) space.',
			'//',
			'// One candidate, one count. Equal elements vote the count up; unequal',
			'// ones cancel a vote. When the count reaches zero the prefix consumed',
			'// so far has annihilated itself in equal-and-opposite pairs — every',
			'// cancelled pair used up at most one MAJORITY occurrence and exactly',
			'// one other element. The majority holds >n/2 of all occurrences, so',
			'// it cannot be fully paired off across the whole slice; whatever',
			'// candidate is left standing at the end must be it.',
			'func majorityElement(nums []int) int {',
			'	candidate, count := 0, 0',
			'	for _, n := range nums {',
			'		if count == 0 {',
			'			// The prefix cancelled out completely: it contained at most',
			'			// half majority elements, so the REMAINDER still has a strict',
			'			// majority — the invariant restarts cleanly from here.',
			'			candidate = n',
			'		}',
			'		if n == candidate {',
			'			count++',
			'		} else {',
			'			count-- // one candidate vote annihilates one dissenting element',
			'		}',
			'	}',
			'	// The >n/2 guarantee makes verification unnecessary. Without it',
			'	// (element appears "at least" n/2, or may not exist) a second pass',
			'	// counting candidate occurrences would be required — the survivor',
			'	// of voting is only a CANDIDATE until confirmed.',
			'	return candidate',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Baseline: count everything</h3>' +
			'<p>A <code>map[int]int</code> of frequencies, then return the key whose count ' +
			'exceeds <code>n/2</code> — O(n) time but O(n) space. (Sorting and returning ' +
			'<code>nums[n/2]</code> also works — the majority must straddle the middle — ' +
			'but costs O(n log n).) The map treats this as a generic “most frequent ' +
			'element” problem and pays for generality it doesn’t need.</p>' +
			'<h3>Exploit the strength of “more than half”</h3>' +
			'<p>Imagine every majority occurrence pairing off against one non-majority ' +
			'occurrence and both vanishing. The majority has strictly more members than ' +
			'everyone else <em>combined</em>, so after all possible annihilation, only ' +
			'majority elements can remain. Boyer–Moore voting runs that thought experiment ' +
			'in one pass with two variables:</p>',
			{ code: 'candidate, count := 0, 0\nfor _, n := range nums {\n\tif count == 0 {\n\t\tcandidate = n // previous prefix self-destructed; restart\n\t}\n\tif n == candidate {\n\t\tcount++\n\t} else {\n\t\tcount-- // one-for-one annihilation\n\t}\n}\nreturn candidate' },
			'<p>Why restarting at <code>count == 0</code> is safe: the prefix consumed so ' +
			'far split evenly between the candidate and everything else, so it contained ' +
			'at most half majority occurrences. The suffix therefore still holds a strict ' +
			'majority, and the argument repeats on it — the invariant is self-healing. ' +
			'Note the mid-trace wobble in the diagram: the candidate briefly becomes the ' +
			'<em>minority</em> value 1, and that’s fine; the guarantee is only about who ' +
			'survives the <em>whole</em> slice.</p>' +
			'<p>One honest caveat: drop the “guaranteed to exist” premise and the survivor ' +
			'is merely a candidate — a second counting pass must confirm it. The voting ' +
			'pass proves “if a majority exists, it is this one”, never “a majority ' +
			'exists”.</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Boyer–Moore majority vote</strong> — reach for it when a frequency ' +
			'threshold guarantees a survivor: an element holding more than 1/2 (or, with k ' +
			'counters, more than 1/(k+1)) of a stream. Cost: one pass, O(1) space, plus a ' +
			'verification pass when existence isn’t promised. The generalization is ' +
			'exactly the <em>Misra–Gries heavy-hitters</em> sketch in the system-design ' +
			'track’s heavy-hitters item — k candidate/counter pairs, all decremented ' +
			'together on a non-match — which is how streaming systems find top talkers ' +
			'without a per-key table. The cancellation instinct has siblings in this ' +
			'track: Single Number (XOR pairs annihilate), Maximum Subarray (Kadane resets ' +
			'a running state when it stops helping), and Gas Station (a failed prefix is ' +
			'discarded whole and the candidate restarts after it).</p>',
		],
		complexity: { time: 'O(n) — one voting pass', space: 'O(1) — one candidate, one counter' },
	});
})();
