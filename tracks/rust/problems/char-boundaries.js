/* Char Boundaries — Strings & Slices (Easy). Rust's &str is UTF-8 bytes,
 * s[a..b] indexes BYTES, and slicing mid-character panics at runtime — one
 * of the few checks Rust cannot do at compile time. The learner implements
 * str::is_char_boundary and floor_char_boundary, which is really a lesson
 * about UTF-8's self-synchronizing design — and Go strings work the same
 * way, so the knowledge transfers home.
 */
(function () {
	'use strict';
	var T = GoLearnRust;

	// The bytes of "héllo": the continuation byte at index 2 is the trap.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 190" width="540" height="190" role="img" aria-label="the bytes of héllo: h is one byte, é is two, slicing at index 2 lands inside é and panics">' +
		'<text x="20" y="24" class="lbl">"héllo" is 6 bytes — é encodes as two: 0xC3 0xA9</text>' +
		// byte cells
		'<rect x="40" y="44" width="70" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="75" y="71" text-anchor="middle">68 h</text>' +
		'<rect x="118" y="44" width="70" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="153" y="71" text-anchor="middle">C3 é…</text>' +
		'<rect x="196" y="44" width="70" height="44" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="231" y="71" text-anchor="middle">A9 …é</text>' +
		'<rect x="274" y="44" width="70" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="309" y="71" text-anchor="middle">6C l</text>' +
		'<rect x="352" y="44" width="70" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="387" y="71" text-anchor="middle">6C l</text>' +
		'<rect x="430" y="44" width="70" height="44" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="465" y="71" text-anchor="middle">6F o</text>' +
		// index labels
		'<text x="40" y="108" class="lbl">0 ✓</text>' +
		'<text x="118" y="108" class="lbl">1 ✓</text>' +
		'<text x="196" y="108" class="lbl" style="fill:var(--err-fg)">2 ✗ boundary? no</text>' +
		'<text x="352" y="108" class="lbl">3 ✓  4 ✓ …</text>' +
		'<text x="40" y="140" class="lbl" style="fill:var(--err-fg)">&amp;s[..2] → panic: byte index 2 is not a char boundary; it is inside \'é\'</text>' +
		'<text x="40" y="166" class="lbl">continuation bytes look like 10xxxxxx — a boundary is any byte that does NOT</text>' +
		'</svg>';

	T.problem({
		id: 'char-boundaries',
		title: 'UTF-8 Char Boundaries',
		nav: 'char boundaries',
		difficulty: 'Easy',
		category: 'Strings & Slices',
		task: 'Implement IsCharBoundary and FloorCharBoundary over raw UTF-8 bytes. All 8 tests.',

		prose: [
			'<h2>UTF-8 Char Boundaries</h2>' +
			'<p>A Rust <code>&amp;str</code> is exactly a Go <code>string</code>: ' +
			'immutable UTF-8 bytes, with <code>len()</code> and indexing counted in ' +
			'<em>bytes</em>, not characters. Both languages made the same bet. But ask ' +
			'for a prefix of <code>"héllo"</code> and they diverge:</p>',
			{ lang: 'rust', code: 'let s = "héllo";\nlet a = &s[..1];   // "h" — fine, byte 1 starts a character\nlet b = &s[..2];   // panics: byte index 2 is not a char boundary;\n                   //         it is inside \'é\' (bytes 1..3) of `héllo`' },
			'<p>Go would hand you the two bytes, invalid UTF-8 tail and all, and let the ' +
			'mojibake surface wherever the string is finally printed. Rust guarantees ' +
			'every <code>&amp;str</code> is valid UTF-8 — so slicing must refuse to cut ' +
			'a character in half, and since slice positions are runtime values, this is ' +
			'one of the few Rust safety checks that fires at <em>runtime</em>. The ' +
			'boundary test comes straight from UTF-8’s design:</p>' +
			'<ul>' +
			'<li>a character’s <em>first</em> byte is never of the form ' +
			'<code>10xxxxxx</code>;</li>' +
			'<li>every <em>continuation</em> byte is <code>10xxxxxx</code> (i.e. ' +
			'<code>b &amp; 0xC0 == 0x80</code>).</li>' +
			'</ul>' +
			'<p>So: index 0 and <code>len</code> are boundaries, anything past ' +
			'<code>len</code> is not, and otherwise an index is a boundary exactly when ' +
			'the byte at it is <em>not</em> a continuation byte. One byte answers the ' +
			'question — no scanning from the start of the string.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement both methods as Rust defines them: ' +
			'<code>IsCharBoundary(s, idx)</code>, and <code>FloorCharBoundary(s, ' +
			'idx)</code> — the largest boundary ≤ <code>idx</code> (clamping past-end ' +
			'indexes to <code>len</code>), which is how you truncate a string to “at ' +
			'most N bytes” without panicking.</p>',
			{ code: 's = "héllo" (6 bytes: 68 C3 A9 6C 6C 6F)\nIsCharBoundary(s, 0) → true     IsCharBoundary(s, 2) → false\nIsCharBoundary(s, 6) → true     IsCharBoundary(s, 7) → false  (past end)\nFloorCharBoundary(s, 2) → 1     back up out of é\nFloorCharBoundary(s, 99) → 6    clamp to len', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// IsCharBoundary reports whether idx is a char boundary of the UTF-8',
			'// bytes s, exactly as Rust\'s str::is_char_boundary:',
			'//   - 0 and len(s) are boundaries (the empty prefix/suffix cuts)',
			'//   - idx > len(s) is not a boundary',
			'//   - otherwise idx is a boundary iff s[idx] is NOT a continuation',
			'//     byte (continuation bytes match 10xxxxxx: b & 0xC0 == 0x80)',
			'func IsCharBoundary(s []byte, idx int) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// FloorCharBoundary returns the largest char boundary <= idx,',
			'// clamping idx to len(s) first (Rust\'s str::floor_char_boundary).',
			'// Because a character is at most 4 bytes, this backs up at most 3.',
			'func FloorCharBoundary(s []byte, idx int) int {',
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
			T.HARNESS_RT,
			'',
			'func main() {',
			'	heLLo := []byte("héllo")   // 6 bytes: 68 C3 A9 6C 6C 6F',
			'	crab := []byte("go🦀")     // 6 bytes: 67 6F F0 9F A6 80',
			'',
			'	type tc struct {',
			'		name string',
			'		run  func() (string, string)',
			'	}',
			'	boundary := func(s []byte, idx int, want bool) func() (string, string) {',
			'		return func() (string, string) {',
			'			return fmt.Sprintf("%v", IsCharBoundary(s, idx)), fmt.Sprintf("%v", want)',
			'		}',
			'	}',
			'	floor := func(s []byte, idx, want int) func() (string, string) {',
			'		return func() (string, string) {',
			'			return fmt.Sprintf("%d", FloorCharBoundary(s, idx)), fmt.Sprintf("%d", want)',
			'		}',
			'	}',
			'	cases := []tc{',
			'		{"héllo: 0 is always a boundary", boundary(heLLo, 0, true)},',
			'		{"héllo: 2 is inside é — not a boundary", boundary(heLLo, 2, false)},',
			'		{"héllo: len is a boundary", boundary(heLLo, 6, true)},',
			'		{"héllo: past the end is not", boundary(heLLo, 7, false)},',
			'		{"go🦀: 3 is inside the 4-byte crab", boundary(crab, 3, false)},',
			'		{"floor(héllo, 2) backs out of é", floor(heLLo, 2, 1)},',
			'		{"floor(go🦀, 5) backs up 3 bytes to the crab start", floor(crab, 5, 2)},',
			'		{"floor clamps past-end to len", floor(heLLo, 99, 6)},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name}',
			'		runCase(r, func() {',
			'			got, want := c.run()',
			'			r["want"] = want',
			'			r["pass"] = got == want',
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
			'// IsCharBoundary reports whether idx is a char boundary of the UTF-8',
			'// bytes s, exactly as Rust\'s str::is_char_boundary.',
			'func IsCharBoundary(s []byte, idx int) bool {',
			'	// The ends first: 0 and len are the empty cuts, and Rust defines',
			'	// past-the-end as false rather than a panic (the method exists so',
			'	// callers can AVOID panics).',
			'	if idx == 0 || idx == len(s) {',
			'		return true',
			'	}',
			'	if idx > len(s) || idx < 0 {',
			'		return false',
			'	}',
			'	// The heart of it: UTF-8 is self-synchronizing. Continuation',
			'	// bytes carry 10 in their top two bits and NOTHING else does, so',
			'	// one byte answers "does a character start here?" without ever',
			'	// looking left.',
			'	return s[idx]&0xC0 != 0x80',
			'}',
			'',
			'// FloorCharBoundary returns the largest char boundary <= idx,',
			'// clamping idx to len(s) first.',
			'func FloorCharBoundary(s []byte, idx int) int {',
			'	if idx > len(s) {',
			'		idx = len(s)',
			'	}',
			'	// Walk left past continuation bytes. UTF-8 caps characters at 4',
			'	// bytes, so this loop runs at most 3 times — and index 0 is a',
			'	// boundary by definition, so it always terminates.',
			'	for !IsCharBoundary(s, idx) {',
			'		idx--',
			'	}',
			'	return idx',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Self-synchronization is the whole algorithm</h3>' +
			'<p>UTF-8 reserves the bit pattern <code>10xxxxxx</code> exclusively for ' +
			'continuation bytes — ASCII is <code>0xxxxxxx</code>, and multi-byte leaders ' +
			'are <code>110…</code>/<code>1110…</code>/<code>11110…</code>. That single ' +
			'design decision means any byte, examined in isolation, tells you whether a ' +
			'character starts there:</p>',
			{ code: 'return s[idx]&0xC0 != 0x80 // 0xC0 keeps the top two bits; 0x80 = 10xxxxxx' },
			'<p>It is why a corrupted stream re-synchronizes at the next character, why ' +
			'you can <code>grep</code> UTF-8 with a byte-oriented tool, and why ' +
			'<code>FloorCharBoundary</code> backs up at most 3 bytes instead of scanning ' +
			'from the start. Very few variable-length encodings can answer a mid-stream ' +
			'question locally; UTF-8 was designed (on a placemat, famously) so it ' +
			'could.</p>' +
			'<h3>Same bytes, different philosophies</h3>' +
			'<p>Go and Rust store identical bytes but answer the bad slice differently. ' +
			'<code>s[:2]</code> in Go succeeds and yields invalid UTF-8 — the damage ' +
			'surfaces later, wherever those bytes are decoded. <code>&amp;s[..2]</code> ' +
			'in Rust panics at the cut, because <code>&amp;str</code>’s validity is an ' +
			'invariant every other string API gets to rely on. Neither language checks ' +
			'at compile time — the index is a runtime value — but Rust moves the failure ' +
			'to the earliest possible moment and names the exact byte. Idiomatic Rust ' +
			'avoids byte arithmetic altogether: <code>s.chars()</code>, ' +
			'<code>char_indices()</code>, and <code>get(a..b)</code> (which returns an ' +
			'<code>Option</code> instead of panicking — the <code>Result</code> lesson ' +
			'again) make most manual boundary math unnecessary.</p>' +
			'<h3>The Go translation you already know</h3>' +
			'<p>Go’s <code>utf8.RuneStart(b)</code> is byte-for-byte your boundary test ' +
			'(<code>b&amp;0xC0 != 0x80</code>), and <code>for i, r := range s</code> ' +
			'iterates exactly the boundaries. The knowledge round-trips: truncating a Go ' +
			'string to “at most N bytes, without splitting a rune” is precisely ' +
			'<code>FloorCharBoundary</code> — a function worth having in your Go toolbox ' +
			'now that Rust has made you write it.</p>',
		],
		complexity: { time: 'O(1) — one byte inspected; floor backs up ≤ 3', space: 'O(1)' },
	});
})();
