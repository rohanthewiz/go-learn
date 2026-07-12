/* Partition Labels — Greedy (Medium). Greedy window extension driven by a
 * precomputed last-occurrence table: the current part must stretch at least
 * to last[c] for every letter c seen so far, and the moment the scan index
 * catches up with that boundary the part is provably closed. Merge-intervals
 * in disguise — each letter is the interval [first, last].
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 200" width="500" height="200" role="img" aria-label="partitioning ababcbacadefegdehijhklij by last occurrences">' +
		'<text x="10" y="16" class="lbl">s = "ababcbacadefegdehijhklij" — each part is closed when i catches the furthest last[c] seen</text>' +
		// three part rects around the character row
		'<g fill="var(--panel)">' +
		'<rect x="8" y="50" width="180" height="34" rx="4" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="192" y="50" width="136" height="34" rx="4" stroke="var(--edge)"/>' +
		'<rect x="332" y="50" width="156" height="34" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'</g>' +
		// the 24 characters, 20px apart
		'<g text-anchor="middle">' +
		'<text x="18" y="72">a</text><text x="38" y="72">b</text><text x="58" y="72">a</text>' +
		'<text x="78" y="72">b</text><text x="98" y="72">c</text><text x="118" y="72">b</text>' +
		'<text x="138" y="72">a</text><text x="158" y="72">c</text><text x="178" y="72">a</text>' +
		'<text x="198" y="72">d</text><text x="218" y="72">e</text><text x="238" y="72">f</text>' +
		'<text x="258" y="72">e</text><text x="278" y="72">g</text><text x="298" y="72">d</text>' +
		'<text x="318" y="72">e</text>' +
		'<text x="338" y="72">h</text><text x="358" y="72">i</text><text x="378" y="72">j</text>' +
		'<text x="398" y="72">h</text><text x="418" y="72">k</text><text x="438" y="72">l</text>' +
		'<text x="458" y="72">i</text><text x="478" y="72">j</text>' +
		'</g>' +
		// index labels under part boundaries
		'<g text-anchor="middle" class="lbl">' +
		'<text x="18" y="100">0</text><text x="178" y="100">8</text>' +
		'<text x="198" y="100">9</text><text x="318" y="100">15</text>' +
		'<text x="338" y="100">16</text><text x="478" y="100">23</text>' +
		'</g>' +
		// arc: the first a drags end out to last[a] = 8
		'<path d="M 18 46 C 60 14 140 14 176 44" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowPL)"/>' +
		'<text x="97" y="32" text-anchor="middle" class="lbl">a stretches end to last[a] = 8</text>' +
		// part sizes
		'<g text-anchor="middle">' +
		'<text x="98" y="128" style="fill:var(--accent)">size 9</text>' +
		'<text x="260" y="128">size 7</text>' +
		'<text x="410" y="128" style="fill:var(--ok)">size 8</text>' +
		'</g>' +
		'<text x="10" y="158" class="lbl">sweep: end = max(end, last[s[i]]) for every character seen;</text>' +
		'<text x="10" y="176" class="lbl">when i == end nothing seen so far reaches further — cut here, answer [9 7 8]</text>' +
		'<defs><marker id="dgArrowPL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'partition-labels',
		title: 'Partition Labels',
		nav: 'Partition Labels',
		difficulty: 'Medium',
		category: 'Greedy',
		task: 'Implement partitionLabels — make all 6 tests pass.',

		prose: [
			'<h2>Partition Labels</h2>' +
			'<p>Split the string <code>s</code> into as <em>many</em> parts as possible so ' +
			'that each letter appears in at most one part. Concatenating the parts in order ' +
			'must give back <code>s</code>. Return the sizes of the parts.</p>' +
			'<ul><li><code>s</code> is non-empty lowercase ASCII (<code>a</code>–<code>z</code>).</li>' +
			'<li>Every occurrence of a letter must land in the same part.</li>' +
			'<li>Among all valid splits, yours must have the maximum number of parts.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'partitionLabels("ababcbacadefegdehijhklij")  →  []int{9, 7, 8}\npartitionLabels("abcde")                     →  []int{1, 1, 1, 1, 1}', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>A part that contains a letter must run at least to that letter’s <em>last</em> ' +
			'occurrence. So precompute <code>last[c]</code> for all 26 letters, then sweep: keep ' +
			'extending the current part’s <code>end</code> to the furthest <code>last[c]</code> ' +
			'of any character seen, and the instant the index <em>reaches</em> that boundary, ' +
			'nothing inside points past it — cut:</p>' +
			DIAGRAM +
			'<p>Cutting at the first legal opportunity is what makes the part count maximal.</p>',
		],

		starter: [
			'package main',
			'',
			'// partitionLabels splits s (lowercase ASCII) into the maximum number of',
			'// parts such that each letter appears in at most one part, and returns',
			'// the part sizes in order.',
			'func partitionLabels(s string) []int {',
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
			'		s    string',
			'		want []int',
			'	}',
			'	cases := []tc{',
			'		{"ababcbacadefegdehijhklij", []int{9, 7, 8}}, // classic',
			'		{"abcde", []int{1, 1, 1, 1, 1}},              // all distinct → all singletons',
			'		{"aaaa", []int{4}},                           // one letter → one part',
			'		{"abccba", []int{6}},                         // nested intervals never split',
			'		{"eccbbbbdec", []int{10}},                    // first letter\'s last occurrence pins the whole string',
			'		{"ababcdcd", []int{4, 4}},                    // two clean halves',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("s=%q", c.s),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := partitionLabels(c.s)',
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
			'// partitionLabels returns the sizes of the maximum-count split of s',
			'// where each letter lives in exactly one part.',
			'//',
			'// Two-phase greedy. Phase 1 precomputes last[c], the final index of',
			'// each letter — that table is the only global knowledge the sweep',
			'// needs. Phase 2 sweeps once: the current part cannot end before',
			'// last[c] of ANY letter it contains, so end ratchets forward to the',
			'// furthest such boundary. When i itself reaches end, no letter seen',
			'// in the part points past i, so cutting here is safe — and cutting',
			'// at the FIRST safe index is what maximizes the number of parts',
			'// (delaying a cut can only merge parts, never create more).',
			'func partitionLabels(s string) []int {',
			'	// last[c] = index of the final occurrence of letter c. A fixed',
			'	// [26]int is enough for lowercase ASCII — no map, no allocation.',
			'	var last [26]int',
			'	for i := 0; i < len(s); i++ {',
			'		last[s[i]-\'a\'] = i // later writes overwrite earlier ones',
			'	}',
			'',
			'	sizes := []int{}',
			'	start, end := 0, 0 // current part is s[start..end], end still growing',
			'	for i := 0; i < len(s); i++ {',
			'		if l := last[s[i]-\'a\']; l > end {',
			'			end = l // this letter forces the part to reach further',
			'		}',
			'		if i == end {',
			'			// Nothing in s[start..i] occurs after i — the part is',
			'			// self-contained, and the earliest legal cut is here.',
			'			sizes = append(sizes, i-start+1)',
			'			start = i + 1',
			'		}',
			'	}',
			'	return sizes',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Try every split point and check the "each letter in one part" rule — exponential ' +
			'in the number of cuts, with repeated full scans for each check. Even the smarter ' +
			'brute force (for each prefix, scan the rest of the string for letter leaks) is ' +
			'O(n²). The waste is recomputing the same question: <em>does anything in this ' +
			'prefix occur later?</em></p>' +
			'<h3>Insight — each letter is an interval, and the answer is their merge</h3>' +
			'<p>A letter c occurring at first(c) and last(c) forces the whole range ' +
			'[first(c), last(c)] into one part. So the problem is really: merge the 26 letter ' +
			'intervals wherever they overlap, and the merged blocks are the parts. Because the ' +
			'sweep visits positions in order, one precomputed table answers "how far does this ' +
			'part have to reach?" in O(1):</p>',
			{ code: 'var last [26]int\nfor i := 0; i < len(s); i++ {\n\tlast[s[i]-\'a\'] = i\n}\nstart, end := 0, 0\nfor i := 0; i < len(s); i++ {\n\tif l := last[s[i]-\'a\']; l > end {\n\t\tend = l // ratchet: the part must reach at least this far\n\t}\n\tif i == end {\n\t\tsizes = append(sizes, i-start+1) // earliest legal cut → max parts\n\t\tstart = i + 1\n\t}\n}' },
			'<p>The two moving parts:</p>' +
			'<ul>' +
			'<li><strong><code>end</code> only ratchets forward.</strong> Every character seen ' +
			'inside the part is a new constraint, and constraints only ever push the boundary ' +
			'out (<code>"abccba"</code>: the a at index 0 pins end to 5 immediately, so the ' +
			'nested b/c intervals never get a chance to split it).</li>' +
			'<li><strong><code>i == end</code> is both safe and optimal.</strong> Safe: no ' +
			'letter in <code>s[start..i]</code> occurs after i, by definition of the ratchet. ' +
			'Optimal: any valid split must cut at or after every constraint, so the first legal ' +
			'cut can only be moved <em>later</em> — which merges parts and lowers the count. ' +
			'Greedy earliest-cut is therefore maximal, an exchange argument in one line.</li>' +
			'</ul>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Greedy window extension driven by precomputed reach</strong> — reach for ' +
			'it when each element carries an obligation about how far the current group must ' +
			'extend, and the trigger in the statement is "everything of kind X must stay ' +
			'together" or "split into the most/fewest groups". Cost: one precomputation pass to ' +
			'build the reach table, one sweep, O(n) time and O(1) extra space (the table is a ' +
			'constant 26 slots). It is the same "furthest boundary" idea as <em>Jump Game</em> — ' +
			'there <code>reach = max(reach, i+nums[i])</code> and stalling means failure; here ' +
			'<code>end = max(end, last[c])</code> and catching up means a cut. And it is ' +
			'<em>Merge Intervals</em> in disguise: each letter is the interval ' +
			'[first, last], and the parts are exactly the merged blocks — <em>Insert ' +
			'Interval</em> and <em>Non-overlapping Intervals</em> lean on the same ' +
			'sort-and-sweep instinct.</p>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
