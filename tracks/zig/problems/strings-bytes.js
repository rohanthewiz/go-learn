/* Strings Are Bytes — Slices & Strings (Medium). Zig has no string type:
 * literals are *const [N:0]u8, "strings" are []const u8, and std.mem
 * supplies eql/indexOf/startsWith over raw bytes; UTF-8 awareness is
 * opt-in via std.unicode. The learner hand-rolls all four — including a
 * real UTF-8 decoder that counts codepoints and rejects truncated
 * sequences and stray continuation bytes.
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// The bytes of "héllo": six cells on the wire, five codepoints after
	// decoding — the é occupies two bytes. Marker id namespaced (dgArrowZGSB)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 208" width="520" height="208" role="img" aria-label="the six bytes of héllo laid out in cells; the two-byte é is bracketed; byte length 6 versus codepoint count 5">' +
		'<text x="20" y="24" class="lbl">"héllo" on the wire: len == 6 bytes, but 5 codepoints</text>' +
		// six byte cells: ASCII in accent, the two é bytes in warn
		'<rect x="40" y="40" width="60" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="70" y="65" text-anchor="middle">0x68</text>' +
		'<rect x="104" y="40" width="60" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="134" y="65" text-anchor="middle">0xc3</text>' +
		'<rect x="168" y="40" width="60" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="198" y="65" text-anchor="middle">0xa9</text>' +
		'<rect x="232" y="40" width="60" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="262" y="65" text-anchor="middle">0x6c</text>' +
		'<rect x="296" y="40" width="60" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="326" y="65" text-anchor="middle">0x6c</text>' +
		'<rect x="360" y="40" width="60" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="390" y="65" text-anchor="middle">0x6f</text>' +
		// decoded characters under the cells
		'<text x="70" y="100" text-anchor="middle" class="lbl">h</text>' +
		'<text x="262" y="100" text-anchor="middle" class="lbl">l</text>' +
		'<text x="326" y="100" text-anchor="middle" class="lbl">l</text>' +
		'<text x="390" y="100" text-anchor="middle" class="lbl">o</text>' +
		// bracket spanning the two é bytes
		'<path d="M 108 92 L 108 102 L 224 102 L 224 92" fill="none" stroke="var(--warn)" stroke-width="1.6"/>' +
		'<path d="M 166 128 L 166 108" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowZGSB)"/>' +
		'<text x="166" y="144" text-anchor="middle" class="lbl" style="fill:var(--warn)">é = 110xxxxx + 10xxxxxx — TWO bytes, ONE codepoint</text>' +
		'<text x="20" y="176" class="lbl">lead byte tells the width: 0xxxxxxx=1  110xxxxx=2  1110xxxx=3  11110xxx=4</text>' +
		'<text x="20" y="196" class="lbl">every following byte must match 10xxxxxx — or the sequence is invalid</text>' +
		'<defs><marker id="dgArrowZGSB" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'strings-bytes',
		title: 'Strings Are Bytes',
		nav: 'strings as bytes',
		difficulty: 'Medium',
		category: 'Slices & Strings',
		task: 'Hand-roll Eql, IndexOf, StartsWith, and a UTF-8 CodepointCount — no strings or unicode/utf8 packages — the way Zig treats all text: as bytes.',

		prose: [
			'<h2>Strings Are Bytes</h2>' +
			'<p>You open the Zig language reference and search for the string ' +
			'type. There is no chapter, because there is no type: a string ' +
			'literal like <code>"héllo"</code> is a <code>*const [6:0]u8</code> ' +
			'— a pointer to six bytes with a zero sentinel — and the thing ' +
			'every function actually passes around is <code>[]const u8</code>, ' +
			'a plain byte slice. Equality, search, and prefix tests live in ' +
			'<code>std.mem</code> — a library named for <em>memory</em>, not ' +
			'text:</p>',
			{ lang: 'txt', code: 'const s: []const u8 = "héllo";     // a "string" is just a byte slice\n\nstd.mem.eql(u8, s, "héllo")        // true  — byte-by-byte compare\nstd.mem.indexOf(u8, s, "llo")      // ?usize — 3 (null when absent)\nstd.mem.startsWith(u8, s, "h")     // true\n\ns.len                              // 6 — BYTES, never "characters"\ntry std.unicode.utf8CountCodepoints(s)  // 5 — UTF-8 is opt-in' },
			'<p>Here is the part Go developers get to feel smug about: Go ' +
			'agrees far more than people think. <code>len("héllo")</code> is ' +
			'<strong>6</strong> in Go too, <code>s[i]</code> yields a byte, and ' +
			'<code>==</code> compares bytes — a Go <code>string</code> is an ' +
			'immutable byte slice wearing a nicer coat. The difference is that ' +
			'Go dresses it up: a dedicated type, built-in <code>==</code>, and ' +
			'a <code>for range</code> loop that quietly decodes UTF-8 as it ' +
			'walks. Zig refuses to pretend. There is no text — only bytes, and ' +
			'whatever encoding you consciously apply. This problem makes you ' +
			'apply it by hand:</p>' +
			'<ul>' +
			'<li><strong>Equality and search are memory operations.</strong> ' +
			'<code>Eql</code> is length-then-bytes; <code>IndexOf</code> is the ' +
			'naive scan — slide the needle across the haystack, compare at each ' +
			'offset. An empty needle matches at 0 (everything starts with ' +
			'nothing).</li>' +
			'<li><strong>UTF-8 is a self-describing framing.</strong> The lead ' +
			'byte declares the sequence width by its high bits — ' +
			'<code>0xxxxxxx</code> is 1 byte, <code>110xxxxx</code> 2, ' +
			'<code>1110xxxx</code> 3, <code>11110xxx</code> 4 — and every ' +
			'following byte must match <code>10xxxxxx</code>.</li>' +
			'<li><strong>Three ways bytes go bad:</strong> a lead byte matching ' +
			'none of the four patterns (<code>10xxxxxx</code> where a lead ' +
			'should be — a <em>stray continuation</em> — or ' +
			'<code>11111xxx</code>), a sequence <em>truncated</em> by the end ' +
			'of the slice, or a non-continuation byte where <code>10xxxxxx</code> ' +
			'was promised. All three are <code>"invalid utf-8"</code>.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Eql</code>, <code>IndexOf</code>, ' +
			'<code>StartsWith</code>, and <code>CodepointCount</code> — ' +
			'<strong>without</strong> importing <code>strings</code>, ' +
			'<code>bytes</code>, or <code>unicode/utf8</code>. Hand-rolling ' +
			'them is the point: afterward, <code>std.mem.eql(u8, a, b)</code> ' +
			'holds no mystery.</p>',
		],

		starter: [
			'package main',
			'',
			'// Eql reports whether a and b hold identical bytes — the hand-rolled',
			'// std.mem.eql(u8, a, b), and exactly what Go\'s == does on strings.',
			'// Different lengths are never equal; two empty slices are.',
			'func Eql(a, b []byte) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// IndexOf returns the byte offset of the first occurrence of needle',
			'// in haystack, or -1 if absent. An empty needle matches at 0. Use a',
			'// plain sliding scan — no strings/bytes package.',
			'func IndexOf(haystack, needle []byte) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// StartsWith reports whether s begins with prefix. A prefix longer',
			'// than s can never match; an empty prefix always does.',
			'func StartsWith(s, prefix []byte) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// CodepointCount decodes s as UTF-8 by hand and returns the number of',
			'// codepoints, or the error "invalid utf-8" if the bytes are not valid',
			'// UTF-8 framing.',
			'//',
			'// Decode rules — the lead byte\'s high bits declare the width:',
			'//   0xxxxxxx -> 1 byte     110xxxxx -> 2 bytes',
			'//   1110xxxx -> 3 bytes    11110xxx -> 4 bytes',
			'// and every continuation byte must match 10xxxxxx.',
			'//',
			'// Errors: a lead byte matching no pattern (including a stray',
			'// 10xxxxxx continuation where a lead should be), a sequence cut off',
			'// by the end of s, or a promised continuation that is not 10xxxxxx.',
			'// This checker validates FRAMING only — overlong encodings and',
			'// surrogate ranges are deliberately out of scope here.',
			'func CodepointCount(s []byte) (int, error) {',
			'	// your code here',
			'	return 0, nil',
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
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// cc renders CodepointCount\'s (n, err) pair as one comparable',
			'	// string so error cases and count cases share a column.',
			'	cc := func(s []byte) string {',
			'		n, err := CodepointCount(s)',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return fmt.Sprintf("%d", n)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"Eql: identical bytes compare equal — std.mem.eql(u8, ...) is just this loop",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", Eql([]byte("héllo"), []byte("héllo"))) }},',
			'		{"Eql: same length, one differing byte — and a length mismatch — both false",',
			'			"false false",',
			'			func() string {',
			'				return fmt.Sprintf("%v %v", Eql([]byte("zig"), []byte("zag")), Eql([]byte("go"), []byte("gopher")))',
			'			}},',
			'		{"IndexOf: needle present — the sliding scan finds the FIRST occurrence",',
			'			"11",',
			'			func() string { return fmt.Sprintf("%d", IndexOf([]byte("connection reset"), []byte("reset"))) }},',
			'		{"IndexOf: needle absent -> -1 (Zig\'s indexOf returns null; Go\'s convention is -1)",',
			'			"-1",',
			'			func() string { return fmt.Sprintf("%d", IndexOf([]byte("connection reset"), []byte("refused"))) }},',
			'		{"IndexOf: empty needle matches at 0 — everything starts with nothing",',
			'			"0",',
			'			func() string { return fmt.Sprintf("%d", IndexOf([]byte("abc"), []byte{})) }},',
			'		{"StartsWith: real prefix true; a prefix LONGER than s can never match",',
			'			"true false",',
			'			func() string {',
			'				return fmt.Sprintf("%v %v", StartsWith([]byte("héllo"), []byte("h")), StartsWith([]byte("h"), []byte("héllo")))',
			'			}},',
			'		{"CodepointCount: pure ASCII — one byte per codepoint, count == len",',
			'			"5",',
			'			func() string { return cc([]byte("hello")) }},',
			'		{"CodepointCount: \\"héllo\\" is 6 bytes but 5 codepoints — the é spans two",',
			'			"5",',
			'			func() string { return cc([]byte("héllo")) }},',
			'		{"CodepointCount: a 3-byte char (euro sign) — \\"€5\\" is 4 bytes, 2 codepoints",',
			'			"2",',
			'			func() string { return cc([]byte{0xe2, 0x82, 0xac, 0x35}) }},',
			'		{"CodepointCount: a 4-byte char (emoji) — \\"go\\" + U+1F600 is 6 bytes, 3 codepoints",',
			'			"3",',
			'			func() string { return cc([]byte{0x67, 0x6f, 0xf0, 0x9f, 0x98, 0x80}) }},',
			'		{"CodepointCount: truncated sequence — a 2-byte lead with no byte after it",',
			'			"error: invalid utf-8",',
			'			func() string { return cc([]byte{0x68, 0xc3}) }},',
			'		{"CodepointCount: stray continuation — 10xxxxxx where a lead byte should be",',
			'			"error: invalid utf-8",',
			'			func() string { return cc([]byte{0xa9, 0x68}) }},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			got := c.got()',
			'			r["pass"] = got == c.want',
			'			r["got"] = got',
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
			'import "errors"',
			'',
			'// Eql is length-then-bytes. Comparing lengths first is not just an',
			'// optimization — it makes the byte loop\'s bounds safe with a single',
			'// index. This is what Go\'s == on strings compiles to (memequal),',
			'// and exactly what Zig\'s std.mem.eql does for []const u8.',
			'func Eql(a, b []byte) bool {',
			'	if len(a) != len(b) {',
			'		return false',
			'	}',
			'	for i := 0; i < len(a); i++ {',
			'		if a[i] != b[i] {',
			'			return false',
			'		}',
			'	}',
			'	return true',
			'}',
			'',
			'// IndexOf is the naive O(n·m) sliding scan. Real libraries (Go\'s',
			'// strings.Index, Zig\'s std.mem.indexOf) layer tricks on top —',
			'// single-byte fast paths, Rabin-Karp for long needles — but every',
			'// one of them falls back to exactly this loop for short inputs,',
			'// because the setup cost of the clever algorithms loses below a',
			'// few dozen bytes.',
			'func IndexOf(haystack, needle []byte) int {',
			'	// i ranges over every offset where the needle could still fit;',
			'	// for an empty needle that is offset 0 alone, which yields the',
			'	// required "empty needle matches at 0" for free.',
			'	for i := 0; i+len(needle) <= len(haystack); i++ {',
			'		match := true',
			'		for j := 0; j < len(needle); j++ {',
			'			if haystack[i+j] != needle[j] {',
			'				match = false',
			'				break',
			'			}',
			'		}',
			'		if match {',
			'			return i',
			'		}',
			'	}',
			'	return -1',
			'}',
			'',
			'// StartsWith is Eql against the first len(prefix) bytes. The length',
			'// guard doubles as the "prefix longer than s" rejection — slicing',
			'// without it would be an out-of-range panic.',
			'func StartsWith(s, prefix []byte) bool {',
			'	if len(prefix) > len(s) {',
			'		return false',
			'	}',
			'	return Eql(s[:len(prefix)], prefix)',
			'}',
			'',
			'// CodepointCount walks s one UTF-8 sequence at a time: classify the',
			'// lead byte, verify the promised continuations, hop forward. It',
			'// validates FRAMING only — overlong encodings and surrogates are',
			'// deliberately out of scope (a production validator like Go\'s',
			'// utf8.Valid rejects those too).',
			'func CodepointCount(s []byte) (int, error) {',
			'	count := 0',
			'	i := 0',
			'	for i < len(s) {',
			'		b := s[i]',
			'		// Classify the lead byte by masking just enough high bits to',
			'		// check the pattern: 0xxxxxxx, 110xxxxx, 1110xxxx, 11110xxx.',
			'		// The masks grow one bit per arm because each pattern is one',
			'		// bit longer than the last.',
			'		size := 0',
			'		if b&0x80 == 0x00 {',
			'			size = 1 // ASCII: the 1-byte fast path real decoders optimize',
			'		} else if b&0xe0 == 0xc0 {',
			'			size = 2',
			'		} else if b&0xf0 == 0xe0 {',
			'			size = 3',
			'		} else if b&0xf8 == 0xf0 {',
			'			size = 4',
			'		} else {',
			'			// Two distinct failures collapse here: 10xxxxxx (a stray',
			'			// continuation with no lead before it) and 11111xxx (a',
			'			// width UTF-8 never assigned — 5- and 6-byte forms were',
			'			// abolished when Unicode capped itself at U+10FFFF).',
			'			return 0, errors.New("invalid utf-8")',
			'		}',
			'		// The lead promised size-1 continuations; the slice must',
			'		// actually contain them (truncation check) ...',
			'		if i+size > len(s) {',
			'			return 0, errors.New("invalid utf-8")',
			'		}',
			'		// ... and each one must carry the 10xxxxxx signature. This is',
			'		// what makes UTF-8 self-synchronizing: land anywhere in a',
			'		// stream and the high bits tell you if you are mid-character.',
			'		for j := i + 1; j < i+size; j++ {',
			'			if s[j]&0xc0 != 0x80 {',
			'				return 0, errors.New("invalid utf-8")',
			'			}',
			'		}',
			'		count++',
			'		i += size',
			'	}',
			'	return count, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why Zig refuses to have a string type</h3>' +
			'<p>It is a deliberate stance, not a missing feature. A blessed ' +
			'string type must answer questions the language cannot answer for ' +
			'you: is indexing by byte, codepoint, or grapheme? Is comparison ' +
			'byte-wise or normalized? Every answer is wrong for someone — ' +
			'filenames on Linux are arbitrary bytes, Windows paths are ' +
			'WTF-16, network protocols are ASCII with byte-exact framing. Zig ' +
			'hands you <code>[]const u8</code> and makes every encoding ' +
			'decision visible at the call site: <code>std.mem</code> for bytes, ' +
			'<code>std.unicode</code> when you opt into UTF-8. Go landed one ' +
			'notch away: <code>string</code> is bytes with no enforced ' +
			'encoding (<code>len</code>, <code>s[i]</code>, <code>==</code> ' +
			'are all byte operations), but <code>for range</code> decodes ' +
			'runes silently — the exact convenience that surprises people ' +
			'when <code>len(s)</code> and the loop\'s iteration count ' +
			'disagree.</p>' +
			'<h3>The decoder you just wrote, weaponized</h3>' +
			'<p>Your framing checker skips overlong and surrogate rejection, ' +
			'and that gap has history: an <em>overlong</em> encoding spells a ' +
			'codepoint with more bytes than needed (<code>0xc0 0xaf</code> is ' +
			'an illegal 2-byte spelling of <code>/</code>). Decoders that ' +
			'accepted overlongs gave the 2001 IIS directory-traversal worm its ' +
			'opening — <code>..%c0%af..</code> sailed past path checks that ' +
			'looked for the 1-byte <code>/</code>, then decoded to it. Modern ' +
			'validators (Go\'s <code>utf8.Valid</code>, Zig\'s ' +
			'<code>std.unicode.utf8ValidateSlice</code>) reject overlongs, ' +
			'surrogates (<code>U+D800–DFFF</code>), and values past ' +
			'<code>U+10FFFF</code> — the full RFC 3629 rules your doc comment ' +
			'explicitly scoped out.</p>' +
			'<h3>Self-synchronization is the design masterstroke</h3>' +
			'<p>The <code>10xxxxxx</code> signature you verified is why UTF-8 ' +
			'won: no lead byte can be mistaken for a continuation and vice ' +
			'versa, so a decoder dropped into the middle of a stream resyncs ' +
			'at the next lead byte, and byte-oriented tools — your ' +
			'<code>IndexOf</code> included — work unchanged on UTF-8 text. ' +
			'Searching for a multi-byte needle with a byte-level scan can ' +
			'never false-match across character boundaries, precisely because ' +
			'a valid sequence can\'t appear at an offset inside another one. ' +
			'Ken Thompson sketched the encoding on a placemat in 1992; your ' +
			'four functions are the reason it needed no string type to be ' +
			'useful.</p>',
		],
		complexity: { time: 'O(n·m) for IndexOf\'s sliding scan; the other three are single O(n) passes', space: 'O(1)' },
	});
})();
