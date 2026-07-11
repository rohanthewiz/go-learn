/* Contains Duplicate — Arrays & Hashing (Easy). The gentlest possible
 * introduction to "trade space for time": a set of everything already
 * seen turns a quadratic pairwise scan into one linear pass. Also the
 * track's first look at map[int]struct{} as Go's idiomatic set.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 170" width="500" height="170" role="img" aria-label="a seen-set catching a duplicate">' +
		// array cells — the walk is sitting on the second 1
		'<g>' +
		'<rect x="20" y="30" width="44" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="70" y="30" width="44" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="120" y="30" width="44" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<rect x="170" y="30" width="44" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="42" y="52" text-anchor="middle">1</text>' +
		'<text x="92" y="52" text-anchor="middle">2</text>' +
		'<text x="142" y="52" text-anchor="middle">3</text>' +
		'<text x="192" y="52" text-anchor="middle">1</text>' +
		'<text x="42" y="80" text-anchor="middle" class="lbl">0</text>' +
		'<text x="92" y="80" text-anchor="middle" class="lbl">1</text>' +
		'<text x="142" y="80" text-anchor="middle" class="lbl">2</text>' +
		'<text x="192" y="80" text-anchor="middle" class="lbl">3</text>' +
		'<text x="20" y="18" class="lbl">nums</text>' +
		'</g>' +
		// current-element annotation
		'<text x="192" y="110" text-anchor="middle" style="fill:var(--accent)">cur = 1</text>' +
		'<text x="192" y="128" text-anchor="middle" class="lbl">seen before?</text>' +
		// seen set
		'<g>' +
		'<text x="340" y="18" class="lbl">seen (a set)</text>' +
		'<rect x="340" y="28" width="110" height="28" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="355" y="47">1</text>' +
		'<rect x="340" y="62" width="110" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="355" y="81">2</text>' +
		'<rect x="340" y="96" width="110" height="28" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="355" y="115">3</text>' +
		'</g>' +
		// lookup arrow from cur to the matching set entry
		'<path d="M 240 122 C 290 120 305 60 332 44" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowCD)"/>' +
		'<text x="272" y="90" class="lbl">already there ✓</text>' +
		'<text x="340" y="148" style="fill:var(--ok)">answer: true</text>' +
		'<defs><marker id="dgArrowCD" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'contains-duplicate',
		title: 'Contains Duplicate',
		nav: 'Contains Duplicate',
		difficulty: 'Easy',
		category: 'Arrays & Hashing',
		task: 'Implement containsDuplicate — make all 5 tests pass.',

		prose: [
			'<h2>Contains Duplicate</h2>' +
			'<p>Given a slice of integers <code>nums</code>, return <code>true</code> if any ' +
			'value appears <em>at least twice</em>, and <code>false</code> if every element ' +
			'is distinct.</p>' +
			'<ul><li>The slice may be empty — an empty slice has no duplicates.</li>' +
			'<li>Values may be negative.</li>' +
			'<li>Aim for a single pass over the input.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'containsDuplicate([]int{1, 2, 3, 1})  →  true    // 1 appears twice\ncontainsDuplicate([]int{1, 2, 3, 4})  →  false   // all distinct', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>A duplicate is just “a value I have <em>already seen</em>”. Keep a set of ' +
			'everything walked past so far; the moment the current value is already in the ' +
			'set, stop — the answer is <code>true</code>:</p>' +
			DIAGRAM +
			'<p>Go has no set type; a <code>map[int]struct{}</code> plays the role — keys ' +
			'are the members, the empty-struct values take zero bytes.</p>',
		],

		starter: [
			'package main',
			'',
			'// containsDuplicate reports whether any value appears in nums at',
			'// least twice. An empty slice has no duplicates.',
			'func containsDuplicate(nums []int) bool {',
			'	// your code here',
			'	return false',
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
			'		want bool',
			'	}',
			'	cases := []tc{',
			'		{[]int{1, 2, 3, 1}, true},',
			'		{[]int{1, 2, 3, 4}, false},',
			'		{[]int{}, false},',
			'		{[]int{1, 1, 1, 3, 3, 4, 3, 2, 4, 2}, true},',
			'		{[]int{-1, 0, -1}, true},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("nums=%v", c.nums),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := containsDuplicate(append([]int(nil), c.nums...))',
			'			r["pass"] = got == c.want',
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
			'// containsDuplicate reports whether any value appears in nums at',
			'// least twice.',
			'//',
			'// One pass with a set of the values already walked past. The set is',
			'// a map[int]struct{}: keys carry the membership, and the empty',
			'// struct{} value occupies zero bytes — Go\'s idiomatic "set" when',
			'// only presence matters (map[int]bool works too, but stores a byte',
			'// per entry that nothing ever reads).',
			'func containsDuplicate(nums []int) bool {',
			'	seen := make(map[int]struct{}, len(nums))',
			'	for _, n := range nums {',
			'		if _, ok := seen[n]; ok {',
			'			return true // n was seen earlier — a duplicate, stop immediately',
			'		}',
			'		seen[n] = struct{}{}',
			'	}',
			'	return false // walked the whole slice without a repeat',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Compare every pair with two nested loops — O(n²) time. Or sort a copy and ' +
			'scan for equal neighbours — O(n log n), and it mutates (or copies) the input. ' +
			'Both re-derive the same fact over and over: whether the current value occurred ' +
			'<em>anywhere earlier</em>.</p>' +
			'<h3>Remember instead of re-scan</h3>' +
			'<p>Record each value in a set as you pass it. “Occurred earlier?” becomes one ' +
			'O(1) membership test, and the whole problem collapses to a single pass:</p>',
			{ code: 'seen := make(map[int]struct{}, len(nums))\nfor _, n := range nums {\n\tif _, ok := seen[n]; ok {\n\t\treturn true // first repeat wins\n\t}\n\tseen[n] = struct{}{}\n}\nreturn false' },
			'<p>Details worth noticing:</p>' +
			'<ul>' +
			'<li><strong><code>map[int]struct{}</code> is the set idiom.</strong> The empty ' +
			'struct is zero-sized, so only the keys cost memory. <code>map[int]bool</code> ' +
			'reads slightly nicer (<code>if seen[n]</code>) at the price of one unused byte ' +
			'per entry — either is accepted here.</li>' +
			'<li><strong>Early return.</strong> The first repeat decides the answer; there is ' +
			'no reason to finish the pass.</li>' +
			'<li><strong>Pre-sizing the map</strong> with <code>len(nums)</code> avoids ' +
			'rehashing as it grows — a free micro-win when the final size is known.</li>' +
			'<li><strong>Empty input falls out naturally.</strong> The loop body never runs ' +
			'and the function returns <code>false</code>.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n)', space: 'O(n)' },
	});
})();
