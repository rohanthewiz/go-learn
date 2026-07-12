/* Letter Combinations of a Phone Number — Backtracking (Medium). The
 * cartesian-product-via-DFS problem: recursion depth = position in the
 * digit string, branching factor = letters on that key. Output order is
 * unspecified, so the harness sorts copies of got and want; nil and empty
 * normalize to the same display, so the empty-digits case is order-proof
 * too.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 210" width="500" height="210" role="img" aria-label="DFS tree for letter combinations of digits 23">' +
		'<text x="20" y="16" class="lbl">digits = “23” — depth = digit position, branching = letters on that key</text>' +
		// key mapping, left side
		'<g>' +
		'<rect x="20" y="40" width="64" height="30" rx="4" fill="var(--panel)" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="52" y="60" text-anchor="middle">2 → abc</text>' +
		'<rect x="20" y="100" width="64" height="30" rx="4" fill="var(--panel)" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="52" y="120" text-anchor="middle">3 → def</text>' +
		'</g>' +
		// arrow from the "2" key to level 1 of the tree
		'<path d="M 88 55 C 130 50 160 44 194 40" fill="none" stroke="var(--accent)" stroke-width="1.4" marker-end="url(#dgArrowLCO)"/>' +
		// tree edges root -> level 1
		'<g stroke="var(--edge)" fill="none">' +
		'<line x1="278" y1="52" x2="218" y2="76"/>' +
		'<line x1="290" y1="56" x2="290" y2="76"/>' +
		'<line x1="302" y1="52" x2="362" y2="76"/>' +
		// "a" -> its three children
		'<line x1="200" y1="96" x2="160" y2="120"/>' +
		'<line x1="210" y1="100" x2="210" y2="120"/>' +
		'<line x1="220" y1="96" x2="260" y2="120"/>' +
		'</g>' +
		// root
		'<rect x="272" y="32" width="36" height="20" rx="4" fill="var(--panel)" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="290" y="47" text-anchor="middle" class="lbl">“”</text>' +
		// level 1: a b c
		'<rect x="192" y="76" width="36" height="20" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="210" y="91" text-anchor="middle">a</text>' +
		'<rect x="272" y="76" width="36" height="20" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="290" y="91" text-anchor="middle">b</text>' +
		'<rect x="352" y="76" width="36" height="20" rx="4" fill="var(--panel)" stroke="var(--edge)"/>' +
		'<text x="370" y="91" text-anchor="middle">c</text>' +
		// level 2 under "a": ad ae af (leaves, ok)
		'<g fill="var(--panel)" stroke="var(--ok)" stroke-width="1.6">' +
		'<rect x="138" y="120" width="40" height="20" rx="4"/>' +
		'<rect x="190" y="120" width="40" height="20" rx="4"/>' +
		'<rect x="242" y="120" width="40" height="20" rx="4"/>' +
		'</g>' +
		'<g text-anchor="middle" style="fill:var(--ok)">' +
		'<text x="158" y="135">ad</text><text x="210" y="135">ae</text><text x="262" y="135">af</text>' +
		'</g>' +
		// collapsed subtrees under b and c
		'<text x="290" y="132" text-anchor="middle" class="lbl">bd be bf</text>' +
		'<text x="370" y="132" text-anchor="middle" class="lbl">cd ce cf</text>' +
		'<text x="250" y="170" text-anchor="middle" class="lbl">3 × 3 = 9 leaves — the full cartesian product, each exactly once</text>' +
		'<text x="250" y="192" text-anchor="middle" class="lbl">keys 7 and 9 carry FOUR letters (pqrs, wxyz) — don’t hard-code 3</text>' +
		'<defs><marker id="dgArrowLCO" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'letter-combinations',
		title: 'Letter Combinations of a Phone Number',
		nav: 'Letter Combinations',
		difficulty: 'Medium',
		category: 'Backtracking',
		task: 'Implement letterCombinations — make all 5 tests pass.',

		prose: [
			'<h2>Letter Combinations of a Phone Number</h2>' +
			'<p>Given a string <code>digits</code> containing digits <code>\'2\'</code>–' +
			'<code>\'9\'</code>, return <em>all</em> letter strings the digits could spell on ' +
			'a phone keypad, one letter per digit, in the digits’ order.</p>' +
			'<ul><li>Keypad: 2→abc, 3→def, 4→ghi, 5→jkl, 6→mno, 7→pqrs, 8→tuv, 9→wxyz. ' +
			'Note keys 7 and 9 carry <em>four</em> letters.</li>' +
			'<li>Empty <code>digits</code> → empty result (no combinations, not ' +
			'<code>[""]</code>).</li>' +
			'<li>Return the strings in <em>any order</em> — the tests sort copies of both ' +
			'sides before comparing.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'letterCombinations("23")  →  ["ad" "ae" "af" "bd" "be" "bf" "cd" "ce" "cf"]   // any order\nletterCombinations("")    →  []', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>The answer is a <em>cartesian product</em>: (letters of digit 0) × (letters ' +
			'of digit 1) × … Walk it with DFS where the recursion <strong>depth is the ' +
			'position</strong> in <code>digits</code> and the <strong>branching is that ' +
			'key’s letters</strong>:</p>' +
			DIAGRAM +
			'<p>Every root-to-leaf path spells exactly one combination.</p>',
		],

		starter: [
			'package main',
			'',
			'// letterCombinations returns all letter strings that digits (each in',
			"// '2'..'9') could represent on a phone keypad — one letter per digit,",
			'// in order. Empty digits yields an empty result. Any output order is',
			'// fine; the tests sort before comparing.',
			'func letterCombinations(digits string) []string {',
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
			'	"sort"',
			')',
			'',
			LC.HARNESS_RT,
			'',
			'// sortedStrings returns a sorted COPY of ss. Applied to both got and',
			'// want so any generation order passes. Formatting the sorted copy',
			'// with %v also makes nil and []string{} identical ("[]"), so the',
			'// empty-digits case accepts either — the one normalization quirk of',
			'// a nil-returning starter is handled here, not in the user code.',
			'func sortedStrings(ss []string) []string {',
			'	cp := append([]string(nil), ss...)',
			'	sort.Strings(cp)',
			'	return cp',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		digits string',
			'		want   []string',
			'	}',
			'	cases := []tc{',
			'		{"23", []string{"ad", "ae", "af", "bd", "be", "bf", "cd", "ce", "cf"}},',
			'		{"2", []string{"a", "b", "c"}},',
			'		{"", []string{}}, // empty in → empty out (vacuously passes a nil starter; the rest don\'t)',
			'		// 7 and 9 both carry FOUR letters — 4×4 = 16 combos. Catches',
			'		// any table that hard-codes 3 letters per key.',
			'		{"79", []string{',
			'			"pw", "px", "py", "pz", "qw", "qx", "qy", "qz",',
			'			"rw", "rx", "ry", "rz", "sw", "sx", "sy", "sz",',
			'		}},',
			'		// Repeated digit: positions are independent, aa..cc all appear.',
			'		{"22", []string{"aa", "ab", "ac", "ba", "bb", "bc", "ca", "cb", "cc"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("digits=%q", c.digits),',
			'			"want":  fmt.Sprintf("%v (any order)", sortedStrings(c.want)),',
			'		}',
			'		runCase(r, func() {',
			'			got := letterCombinations(c.digits)',
			'			r["pass"] = fmt.Sprintf("%v", sortedStrings(got)) == fmt.Sprintf("%v", sortedStrings(c.want))',
			'			r["got"] = fmt.Sprintf("%v", sortedStrings(got))',
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
			'// letterCombinations returns every keypad spelling of digits.',
			'//',
			'// DFS over positions: depth pos decides the letter for digits[pos],',
			'// so a root-to-leaf path IS one combination. The keypad lives in a',
			'// fixed array indexed by digit-\'2\' — an array, not a map, so',
			'// iteration order can never sneak in and lookup is a subtraction.',
			'// One shared byte buffer holds the branch; because each level',
			'// OVERWRITES its own slot (assign, not append), no explicit pop is',
			'// needed — the undo is implicit in the next iteration.',
			'func letterCombinations(digits string) []string {',
			'	if len(digits) == 0 {',
			'		return nil // no digits → no combinations (NOT [""])',
			'	}',
			'',
			'	// Index 0 = key \'2\'. Keys 7 and 9 have four letters — sizing',
			'	// anything to 3 per key is the classic bug here.',
			'	pad := [...]string{"abc", "def", "ghi", "jkl", "mno", "pqrs", "tuv", "wxyz"}',
			'',
			'	res := []string{}',
			'	buf := make([]byte, len(digits)) // buf[pos] = chosen letter for digits[pos]',
			'',
			'	var walk func(pos int)',
			'	walk = func(pos int) {',
			'		if pos == len(digits) {',
			'			// Leaf: one letter chosen per digit. string() copies the',
			'			// bytes, so later overwrites can\'t corrupt stored answers.',
			'			res = append(res, string(buf))',
			'			return',
			'		}',
			'		letters := pad[digits[pos]-\'2\']',
			'		for i := 0; i < len(letters); i++ {',
			'			buf[pos] = letters[i] // choose (overwrite = implicit undo)',
			'			walk(pos + 1)         // explore deeper positions',
			'		}',
			'	}',
			'	walk(0)',
			'	return res',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The shape of the answer space</h3>' +
			'<p>Each digit contributes an independent choice, so the answer is a cartesian ' +
			'product with 3<sup>k</sup>–4<sup>k</sup> members. You cannot write nested loops ' +
			'for it — the nesting depth would have to equal <code>len(digits)</code>, which ' +
			'is only known at runtime. There are two standard ways out.</p>' +
			'<h3>Iterative: grow the product level by level</h3>' +
			'<p>Start from <code>[""]</code> and, for each digit, rebuild the list by ' +
			'extending every prefix with every letter of that key:</p>',
			{ code: 'out := []string{""}\nfor i := 0; i < len(digits); i++ {\n\tletters := pad[digits[i]-\'2\']\n\tnext := make([]string, 0, len(out)*len(letters))\n\tfor _, prefix := range out {\n\t\tfor j := 0; j < len(letters); j++ {\n\t\t\tnext = append(next, prefix+string(letters[j]))\n\t\t}\n\t}\n\tout = next\n}' },
			'<p>Correct, but every level re-allocates the whole intermediate list and the ' +
			'<code>[""]</code> seed must be special-cased for empty input (it would ' +
			'wrongly return <code>[""]</code>). The DFS version keeps one O(k) buffer, ' +
			'allocates only final answers, and generalizes the moment a constraint appears ' +
			'(“…but no two vowels adjacent” just becomes a prune before the recursive ' +
			'call — the iterative rebuild has nowhere natural to put it).</p>' +
			'<h3>Details that bite</h3>' +
			'<ul>' +
			'<li><strong>Keys 7 and 9 have four letters.</strong> Any “3 letters per key” ' +
			'assumption fails the <code>"79"</code> test (4×4 = 16 combos, not 9).</li>' +
			'<li><strong>Empty input is empty output.</strong> Zero digits spell zero ' +
			'combinations — <code>[]</code>, not <code>[""]</code> (contrast Subsets, where ' +
			'the empty set is a real subset).</li>' +
			'<li><strong>Copy at the leaf.</strong> <code>string(buf)</code> snapshots the ' +
			'shared buffer; storing the buffer itself would alias memory the DFS keeps ' +
			'rewriting.</li>' +
			'</ul>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Cartesian product via DFS — recursion depth = input position, ' +
			'branching = that position’s choices</strong> — reach for it whenever “all ' +
			'combinations of one pick per slot” appears and the number of slots is a ' +
			'runtime value (spellings, config matrices, test-case grids). Cost: ' +
			'O(product size × answer length), with only O(depth) working memory. It is the ' +
			'same position-indexed skeleton as <em>Subsets</em> (two fixed choices per ' +
			'position: take or skip) and <em>Combination Sum</em> (choices may repeat, with ' +
			'a sum prune); <em>Generate Parentheses</em> adds legality guards on each ' +
			'branch. Once a constraint shows up, the DFS form is the one that absorbs it ' +
			'gracefully.</p>',
		],
		complexity: { time: 'O(k · 4ᵏ) for k digits', space: 'O(k) beyond the output' },
	});
})();
