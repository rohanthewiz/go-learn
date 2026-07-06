/* Group Anagrams — Arrays & Hashing (Medium). The canonical-key pattern:
 * design a key so that all equivalent inputs (here, anagrams) collide,
 * then let a map do the grouping. Answer order is unspecified, so the
 * harness normalizes both sides before comparing.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 180" width="500" height="180" role="img" aria-label="words flowing into buckets keyed by their sorted letters">' +
		// input words
		'<text x="20" y="18" class="lbl">strs · sort each word’s letters → bucket key</text>' +
		'<text x="40" y="44">eat</text>' +
		'<text x="40" y="67">tea</text>' +
		'<text x="40" y="90">tan</text>' +
		'<text x="40" y="113">ate</text>' +
		'<text x="40" y="136">nat</text>' +
		'<text x="40" y="159">bat</text>' +
		// arrows: word → its bucket
		'<path d="M 80 40 C 180 40 240 40 312 43" fill="none" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowGA)"/>' +
		'<path d="M 80 63 C 180 63 240 50 312 47" fill="none" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowGA)"/>' +
		'<path d="M 80 109 C 180 109 240 62 312 51" fill="none" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowGA)"/>' +
		'<path d="M 80 155 C 180 155 240 105 312 95" fill="none" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowGA)"/>' +
		'<path d="M 80 86 C 180 86 240 130 312 139" fill="none" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowGA)"/>' +
		'<path d="M 80 132 C 180 132 240 143 312 143" fill="none" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowGA)"/>' +
		// the three buckets, labeled with their canonical keys
		'<g>' +
		'<text x="322" y="24" class="lbl">key “aet”</text>' +
		'<rect x="320" y="28" width="160" height="38" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="332" y="52">ate · eat · tea</text>' +
		'<text x="322" y="72" class="lbl">key “abt”</text>' +
		'<rect x="320" y="76" width="160" height="38" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="332" y="100">bat</text>' +
		'<text x="322" y="120" class="lbl">key “ant”</text>' +
		'<rect x="320" y="124" width="160" height="38" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="332" y="148">nat · tan</text>' +
		'</g>' +
		'<defs><marker id="dgArrowGA" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'group-anagrams',
		title: 'Group Anagrams',
		nav: 'Group Anagrams',
		difficulty: 'Medium',
		category: 'Arrays & Hashing',
		task: 'Implement groupAnagrams — make all 3 tests pass.',

		prose: [
			'<h2>Group Anagrams</h2>' +
			'<p>Given a slice of strings <code>strs</code>, group the anagrams together and ' +
			'return the groups as <code>[][]string</code>.</p>' +
			'<ul><li>All strings contain only lowercase letters <code>a</code>–<code>z</code>.</li>' +
			'<li>The order of the groups, and of the words within a group, does not matter ' +
			'— the tests normalize both before comparing.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'groupAnagrams([]string{"eat", "tea", "tan", "ate", "nat", "bat"})\n→ [][]string{{"ate", "eat", "tea"}, {"bat"}, {"nat", "tan"}}   // any order', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Anagrams become <em>identical</em> once you sort their letters: ' +
			'<code>"eat"</code>, <code>"tea"</code> and <code>"ate"</code> all sort to ' +
			'<code>"aet"</code>. That sorted form is a canonical key — use it in a map and ' +
			'the grouping happens by itself:</p>' +
			DIAGRAM +
			'<p>One pass to bucket, one pass to collect the buckets.</p>',
		],

		starter: [
			'package main',
			'',
			'// groupAnagrams groups the anagrams in strs together. The order of',
			'// the groups (and of the words within each group) does not matter.',
			'func groupAnagrams(strs []string) [][]string {',
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
			'	"sort"',
			'	"strings"',
			')',
			'',
			LC.HARNESS_RT,
			'',
			'// normalizeGroups brings a [][]string into a canonical form so answers',
			'// compare equal regardless of ordering: sort the words inside each',
			'// group, then sort the groups by a NUL-joined key. Joining is the',
			'// empty-safe way to order groups — comparing first elements alone',
			'// would panic on an empty group.',
			'func normalizeGroups(groups [][]string) [][]string {',
			'	out := make([][]string, 0, len(groups))',
			'	for _, g := range groups {',
			'		cp := append([]string(nil), g...) // never mutate the answer under test',
			'		sort.Strings(cp)',
			'		out = append(out, cp)',
			'	}',
			'	sort.Slice(out, func(i, j int) bool {',
			'		return strings.Join(out[i], "\\x00") < strings.Join(out[j], "\\x00")',
			'	})',
			'	return out',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		strs []string',
			'		want [][]string',
			'	}',
			'	cases := []tc{',
			'		{[]string{"eat", "tea", "tan", "ate", "nat", "bat"},',
			'			[][]string{{"ate", "eat", "tea"}, {"bat"}, {"nat", "tan"}}},',
			'		{[]string{""}, [][]string{{""}}},',
			'		{[]string{"a"}, [][]string{{"a"}}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		want := normalizeGroups(c.want)',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("strs=%v", c.strs),',
			'			"want":  fmt.Sprintf("%v", want),',
			'		}',
			'		runCase(r, func() {',
			'			got := normalizeGroups(groupAnagrams(append([]string(nil), c.strs...)))',
			'			r["pass"] = reflect.DeepEqual(got, want)',
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
			'// groupAnagrams buckets the words in a map keyed by each word’s',
			'// letters in sorted order. Sorted letters are a canonical anagram',
			'// key: every anagram of a word sorts to the exact same string',
			'// ("eat", "tea", "ate" → "aet"), so anagram families collide in the',
			'// map by construction and the grouping falls out of one pass.',
			'//',
			'// Sorting a k-letter word costs O(k log k). The O(k) alternative is',
			'// a [26]int letter-count key (stringified via fmt.Sprint); the',
			'// sorted key wins on simplicity and is plenty fast at these sizes.',
			'func groupAnagrams(strs []string) [][]string {',
			'	groups := make(map[string][]string)',
			'	for _, w := range strs {',
			'		// Sort a byte copy — strings are immutable, and lowercase',
			'		// ASCII means byte order and letter order agree.',
			'		b := []byte(w)',
			'		sort.Slice(b, func(i, j int) bool { return b[i] < b[j] })',
			'		key := string(b)',
			'		groups[key] = append(groups[key], w)',
			'	}',
			'	out := make([][]string, 0, len(groups))',
			'	for _, g := range groups {',
			'		out = append(out, g)',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Compare every word against every other with an <code>isAnagram</code> check ' +
			'and merge matches into groups — O(n²·k) for n words of length k, plus fiddly ' +
			'bookkeeping about which words are already grouped. The wasted work: each pair ' +
			'is re-analyzed from scratch when one summary per word would do.</p>' +
			'<h3>Design a canonical key</h3>' +
			'<p>Compute that summary once per word: its letters in sorted order. Anagrams ' +
			'— and <em>only</em> anagrams — share it, so a <code>map[string][]string</code> ' +
			'does the grouping in a single pass:</p>',
			{ code: 'groups := make(map[string][]string)\nfor _, w := range strs {\n\tb := []byte(w)\n\tsort.Slice(b, func(i, j int) bool { return b[i] < b[j] })\n\tgroups[string(b)] = append(groups[string(b)], w) // "eat","tea","ate" → key "aet"\n}' },
			'<p>The details worth noticing:</p>' +
			'<ul>' +
			'<li><strong>Why the sorted key is canonical.</strong> Sorting erases exactly the ' +
			'information anagrams disagree on (letter order) and keeps exactly what they share ' +
			'(letter multiset) — two words map to the same key <em>iff</em> they are anagrams.</li>' +
			'<li><strong>Sort a copy.</strong> Go strings are immutable; convert to ' +
			'<code>[]byte</code> (which copies) and sort that.</li>' +
			'<li><strong>The O(k) key.</strong> A stringified <code>[26]int</code> letter count ' +
			'also works and skips the per-word sort — worth it when words are long.</li>' +
			'<li><strong>Order is unspecified</strong> because Go randomizes map iteration; ' +
			'the harness normalizes both sides before comparing.</li>' +
			'</ul>',
		],
		complexity: { time: 'O(n·k log k)', space: 'O(n·k)' },
	});
})();
