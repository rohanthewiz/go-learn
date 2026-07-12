/* Implement Trie (Prefix Tree) — Tries (Medium). The track's introduction
 * to the trie: a tree whose EDGES are characters, so all words sharing a
 * prefix share a path. Design-problem format like Min Stack: the learner
 * fills in a Trie type plus Insert/Search/StartsWith, and the harness
 * drives operation scripts, comparing every boolean the queries return.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	// Fan-out for "car", "card", "care": one shared path c→a→r, then two
	// branches. Thick ok-colored outlines mark isEnd (a stored word ends
	// there) — that ring is the whole difference between Search and
	// StartsWith.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 210" width="500" height="210" role="img" aria-label="trie storing car, card and care with isEnd markers">' +
		'<text x="20" y="16" class="lbl">after Insert("car"), Insert("card"), Insert("care") — letters live on the edges</text>' +
		// edges with letter labels
		'<g stroke="var(--edge)">' +
		'<line x1="75" y1="105" x2="115" y2="105"/>' +
		'<line x1="159" y1="105" x2="205" y2="105"/>' +
		'<line x1="249" y1="105" x2="295" y2="105"/>' +
		'<line x1="349" y1="98" x2="405" y2="60"/>' +
		'<line x1="349" y1="112" x2="405" y2="150"/>' +
		'</g>' +
		'<g text-anchor="middle" style="fill:var(--accent)">' +
		'<text x="95" y="97">c</text><text x="182" y="97">a</text><text x="272" y="97">r</text>' +
		'<text x="374" y="70">d</text><text x="374" y="146">e</text>' +
		'</g>' +
		// nodes: rounded rects; isEnd nodes get the thick ok outline
		'<g fill="var(--panel)">' +
		'<rect x="25" y="92" width="50" height="26" rx="13" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<rect x="115" y="92" width="44" height="26" rx="13" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<rect x="205" y="92" width="44" height="26" rx="13" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<rect x="295" y="92" width="54" height="26" rx="13" stroke="var(--ok)" stroke-width="2.4"/>' +
		'<rect x="405" y="45" width="58" height="26" rx="13" stroke="var(--ok)" stroke-width="2.4"/>' +
		'<rect x="405" y="137" width="58" height="26" rx="13" stroke="var(--ok)" stroke-width="2.4"/>' +
		'</g>' +
		'<g text-anchor="middle" class="lbl">' +
		'<text x="50" y="109">root</text><text x="137" y="109">c</text><text x="227" y="109">ca</text>' +
		'<text x="322" y="109">car</text><text x="434" y="62">card</text><text x="434" y="154">care</text>' +
		'</g>' +
		// query path for Search("ca")
		'<path d="M 50 122 C 90 152 190 152 224 124" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowTRI)"/>' +
		'<text x="137" y="160" text-anchor="middle" class="lbl">walk "c", then "a"</text>' +
		'<text x="20" y="186" class="lbl">thick outline = isEnd (a stored word ends here)</text>' +
		'<text x="20" y="203" class="lbl">Search("ca") → false (node exists, no isEnd) · StartsWith("ca") → true (the path exists)</text>' +
		'<defs><marker id="dgArrowTRI" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'implement-trie',
		title: 'Implement Trie (Prefix Tree)',
		nav: 'Implement Trie',
		difficulty: 'Medium',
		category: 'Tries',
		task: 'Implement Trie (Insert, Search, StartsWith) — make all 5 tests pass.',

		prose: [
			'<h2>Implement Trie (Prefix Tree)</h2>' +
			'<p>Design a <em>trie</em> — a tree keyed by characters — supporting:</p>' +
			'<ul><li><code>Insert(word)</code> — store <code>word</code>.</li>' +
			'<li><code>Search(word) bool</code> — true iff <code>word</code> was previously ' +
			'inserted (the <em>exact</em> word, not just a prefix of one).</li>' +
			'<li><code>StartsWith(prefix) bool</code> — true iff some inserted word starts ' +
			'with <code>prefix</code>.</li></ul>' +
			'<p>Conventions for these tests:</p>' +
			'<ul><li>The starter&rsquo;s <code>Trie</code> node holds a ' +
			'<code>map[byte]*Trie</code> of children plus an <code>isEnd</code> flag.</li>' +
			'<li>Empty strings are defined, not dodged: <code>Insert("")</code> marks the ' +
			'root as a word end, so <code>Search("")</code> is true afterwards (false ' +
			'before), and <code>StartsWith("")</code> is trivially true.</li>' +
			'<li>The tests run scripts of operations and compare every boolean returned ' +
			'by <code>Search</code> and <code>StartsWith</code> along the way.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 't := NewTrie()\nt.Insert("apple")\nt.Search("apple")      →  true\nt.Search("app")        →  false   // prefix of a word ≠ a word\nt.StartsWith("app")    →  true\nt.Insert("app")\nt.Search("app")        →  true', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Store words <em>one character per edge</em>. Every node is a prefix; ' +
			'words sharing a prefix share that path, and a boolean on the node records ' +
			'"a stored word ends exactly here". All three operations are the same walk — ' +
			'they differ only in what they do at the end of it:</p>' +
			DIAGRAM +
			'<p>Insert creates missing children as it walks; Search demands the final ' +
			'node exist <em>and</em> be marked; StartsWith only demands it exist.</p>',
		],

		starter: [
			'package main',
			'',
			'// Trie is one node of a prefix tree: a child edge per next byte,',
			'// plus a flag marking that a stored word ends at this node. A',
			'// map keeps the node sparse — only edges that exist take space',
			'// (the classic fixed-alphabet alternative is a [26]*Trie array).',
			'type Trie struct {',
			'	children map[byte]*Trie',
			'	isEnd    bool',
			'}',
			'',
			'// NewTrie returns an empty trie (also used to create child nodes).',
			'func NewTrie() *Trie {',
			'	return &Trie{children: make(map[byte]*Trie)}',
			'}',
			'',
			'// Insert stores word in the trie.',
			'func (t *Trie) Insert(word string) {',
			'	// your code here',
			'}',
			'',
			'// Search reports whether word was previously inserted — the exact',
			'// word, not merely a prefix of one.',
			'func (t *Trie) Search(word string) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// StartsWith reports whether any inserted word starts with prefix.',
			'func (t *Trie) StartsWith(prefix string) bool {',
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
			'	"reflect"',
			'	"strings"',
			')',
			'',
			LC.HARNESS_RT,
			'',
			'func main() {',
			'	// Each case is a script of operations against a fresh trie;',
			'	// "search" and "starts" record the boolean they return, and the',
			'	// recorded sequence is what we compare.',
			'	type op struct {',
			'		name string // "insert", "search", "starts"',
			'		arg  string',
			'	}',
			'	type tc struct {',
			'		ops  []op',
			'		want []bool',
			'	}',
			'	cases := []tc{',
			'		// The classic LeetCode script: "app" is a prefix until inserted.',
			'		{[]op{{"insert", "apple"}, {"search", "apple"}, {"search", "app"}, {"starts", "app"}, {"insert", "app"}, {"search", "app"}},',
			'			[]bool{true, false, true, true}},',
			'		// Word vs prefix: the path to "car" exists inside "card", but no word ends there.',
			'		{[]op{{"insert", "card"}, {"search", "car"}, {"starts", "car"}, {"search", "card"}, {"starts", "cards"}},',
			'			[]bool{false, true, true, false}},',
			'		// Empty-string semantics: Insert("") marks the root as a word end.',
			'		{[]op{{"search", ""}, {"insert", ""}, {"search", ""}, {"starts", ""}, {"search", "a"}},',
			'			[]bool{false, true, true, false}},',
			'		// Shared-prefix fan-out: three words on one c-a-r spine.',
			'		{[]op{{"insert", "car"}, {"insert", "card"}, {"insert", "care"}, {"search", "car"}, {"search", "card"}, {"search", "care"}, {"search", "ca"}, {"starts", "cari"}, {"starts", "care"}},',
			'			[]bool{true, true, true, false, false, true}},',
			'		// StartsWith on an absent branch must not invent edges.',
			'		{[]op{{"insert", "dog"}, {"starts", "do"}, {"starts", "da"}, {"search", "do"}, {"starts", "dogs"}},',
			'			[]bool{true, false, false, false}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		// Render the op script as a human-readable trace for the UI.',
			'		trace := make([]string, 0, len(c.ops))',
			'		for _, o := range c.ops {',
			'			switch o.name {',
			'			case "insert":',
			'				trace = append(trace, fmt.Sprintf("Insert(%q)", o.arg))',
			'			case "search":',
			'				trace = append(trace, fmt.Sprintf("Search(%q)", o.arg))',
			'			case "starts":',
			'				trace = append(trace, fmt.Sprintf("StartsWith(%q)", o.arg))',
			'			}',
			'		}',
			'		r := map[string]any{',
			'			"input": strings.Join(trace, " "),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			t := NewTrie()',
			'			got := []bool{}',
			'			for _, o := range c.ops {',
			'				switch o.name {',
			'				case "insert":',
			'					t.Insert(o.arg)',
			'				case "search":',
			'					got = append(got, t.Search(o.arg))',
			'				case "starts":',
			'					got = append(got, t.StartsWith(o.arg))',
			'				}',
			'			}',
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
			'// Trie is one node of a prefix tree: a child edge per next byte,',
			'// plus a flag marking that a stored word ends at this node.',
			'//',
			'// Every node IS a prefix (the concatenation of edge bytes from the',
			'// root), so words sharing a prefix share a path — that sharing is',
			'// the entire value proposition over a hash set. A map keeps nodes',
			'// sparse and byte-general; the [26]*Trie array variant trades that',
			'// for cache-friendly, allocation-free child lookup when the',
			'// alphabet is known to be a-z.',
			'type Trie struct {',
			'	children map[byte]*Trie',
			'	isEnd    bool',
			'}',
			'',
			'// NewTrie returns an empty trie (also used to create child nodes).',
			'func NewTrie() *Trie {',
			'	return &Trie{children: make(map[byte]*Trie)}',
			'}',
			'',
			'// Insert stores word, creating missing edges as it walks. Indexing',
			'// the string by position yields bytes, matching the map key type',
			'// (fine for the ASCII inputs here; runes would need range).',
			'func (t *Trie) Insert(word string) {',
			'	node := t',
			'	for i := 0; i < len(word); i++ {',
			'		next, ok := node.children[word[i]]',
			'		if !ok {',
			'			next = NewTrie()',
			'			node.children[word[i]] = next',
			'		}',
			'		node = next',
			'	}',
			'	// Mark the terminal node. For word == "" the loop body never runs',
			'	// and this marks the root — Search("") then reports true, which is',
			'	// exactly the semantics the problem statement defines.',
			'	node.isEnd = true',
			'}',
			'',
			'// walk follows s edge by edge and returns the node it lands on, or',
			'// nil if the path breaks. Search and StartsWith are the SAME walk;',
			'// factoring it out makes their one-line difference visible.',
			'func (t *Trie) walk(s string) *Trie {',
			'	node := t',
			'	for i := 0; i < len(s); i++ {',
			'		next, ok := node.children[s[i]]',
			'		if !ok {',
			'			return nil // path breaks: no stored word passes through here',
			'		}',
			'		node = next',
			'	}',
			'	return node',
			'}',
			'',
			'// Search reports whether word was inserted: the path must exist AND',
			'// a word must end at its last node. Without the isEnd check, "car"',
			'// would falsely match after Insert("card").',
			'func (t *Trie) Search(word string) bool {',
			'	n := t.walk(word)',
			'	return n != nil && n.isEnd',
			'}',
			'',
			'// StartsWith reports whether any inserted word starts with prefix —',
			'// the path existing is enough, because every node was created by',
			'// some insertion whose word continues through (or ends at) it.',
			'func (t *Trie) StartsWith(prefix string) bool {',
			'	return t.walk(prefix) != nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why not a hash set?</h3>' +
			'<p>A <code>map[string]bool</code> of inserted words answers ' +
			'<code>Search</code> in O(1) — but <code>StartsWith</code> collapses to ' +
			'"scan every stored word and test <code>strings.HasPrefix</code>": O(total ' +
			'stored characters) per query. Patching that by also storing every prefix of ' +
			'every word makes queries fast but duplicates each word once per character. ' +
			'The hash set&rsquo;s real flaw is structural: hashing scatters ' +
			'<code>"car"</code>, <code>"card"</code> and <code>"care"</code> to unrelated ' +
			'buckets, destroying precisely the relationship a prefix query needs.</p>' +
			'<h3>Make the prefix relationship the data structure</h3>' +
			'<p>A trie stores one character per <em>edge</em>, so every node is a prefix ' +
			'and words sharing a prefix share a path — <code>"card"</code> and ' +
			'<code>"care"</code> pay for their common <code>c-a-r</code> spine once. All ' +
			'three operations are the same O(L) walk with different endings:</p>',
			{ code: '// the shared walk\nfunc (t *Trie) walk(s string) *Trie {\n\tnode := t\n\tfor i := 0; i < len(s); i++ {\n\t\tnext, ok := node.children[s[i]]\n\t\tif !ok {\n\t\t\treturn nil\n\t\t}\n\t\tnode = next\n\t}\n\treturn node\n}\n\nn := t.walk(word)\nreturn n != nil && n.isEnd // Search: path exists AND word ends here\nreturn t.walk(prefix) != nil // StartsWith: path exists' },
			'<p>The load-bearing details:</p>' +
			'<ul>' +
			'<li><strong><code>isEnd</code> separates words from prefixes.</strong> After ' +
			'<code>Insert("card")</code>, the node for <code>"car"</code> exists but is ' +
			'unmarked — <code>Search("car")</code> is false while ' +
			'<code>StartsWith("car")</code> is true. One boolean per node encodes the ' +
			'entire distinction.</li>' +
			'<li><strong>Cost is per character, not per word count.</strong> Insert, ' +
			'Search and StartsWith are all O(L) for a string of length L, independent of ' +
			'how many words are stored — a dictionary of a million words answers a ' +
			'5-letter prefix query in 5 steps.</li>' +
			'<li><strong>map vs array children.</strong> <code>map[byte]*Trie</code> is ' +
			'sparse and works for any byte; the <code>[26]*Trie</code> variant wins on ' +
			'speed (direct index, no hashing, cache-friendly) when the alphabet is fixed ' +
			'lowercase — the standard competitive-programming choice.</li>' +
			'<li><strong>The empty string falls out of the loop shape.</strong> A ' +
			'zero-iteration walk lands on the root, so <code>Insert("")</code> marks the ' +
			'root and <code>StartsWith("")</code> is trivially true — defined behavior, ' +
			'not an accident to special-case.</li>' +
			'</ul>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Prefix tree (trie edges) — pay per character, share prefixes</strong> ' +
			'— reach for it when a problem stores many strings and asks prefix-shaped ' +
			'questions: autocomplete, spell-check, word games, longest-common-prefix, or ' +
			'IP routing&rsquo;s longest-prefix match (the same structure over bit edges). ' +
			'Cost: O(L) per operation, O(total characters) space, versus a hash set that ' +
			'answers exact membership fast but cannot see prefixes at all. The heavyweight ' +
			'combination is trie + backtracking with undo — Word Search II prunes a grid ' +
			'DFS by walking the trie in lockstep, killing branches no dictionary word ' +
			'starts with, an idea this track&rsquo;s Word Search sets up.</p>',
		],
		complexity: { time: 'O(L) per operation', space: 'O(total characters stored)' },
	});
})();
