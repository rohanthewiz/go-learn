/* Base62 Shortener — Unique IDs & Encoding (Easy). The encoding step of every
 * URL shortener: turn a numeric row id into a short, URL-safe token and back.
 * Exact-table harness: base conversion is fully deterministic, and each case
 * also round-trips (decode(encode(n)) == n).
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 170" width="520" height="170" role="img" aria-label="base62 encoding: a numeric database id repeatedly divided by 62 becomes a short URL token">' +
		// numeric id
		'<rect x="14" y="34" width="150" height="34" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="89" y="56" text-anchor="middle">125000000000</text>' +
		'<text x="89" y="24" text-anchor="middle" class="lbl">auto-increment row id</text>' +
		// arrow
		'<path d="M 168 51 L 210 51" stroke="var(--dim)" stroke-width="1.6" marker-end="url(#dgArrowB62)" fill="none"/>' +
		'<text x="189" y="42" text-anchor="middle" class="lbl">÷62</text>' +
		// divmod chain
		'<rect x="214" y="34" width="130" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="279" y="56" text-anchor="middle">n%62 → digit</text>' +
		'<text x="279" y="82" text-anchor="middle" class="lbl">repeat until n = 0</text>' +
		// arrow to token
		'<path d="M 348 51 L 390 51" stroke="var(--dim)" stroke-width="1.6" marker-end="url(#dgArrowB62)" fill="none"/>' +
		// token
		'<rect x="394" y="34" width="112" height="34" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="450" y="56" text-anchor="middle">2crtgcg</text>' +
		'<text x="450" y="24" text-anchor="middle" class="lbl">sho.rt/2crtgcg</text>' +
		// alphabet legend
		'<text x="14" y="122" class="lbl">alphabet index = digit value:</text>' +
		'<text x="14" y="142" class="lbl">0–9 → 0..9&#160;&#160;&#160;a–z → 10..35&#160;&#160;&#160;A–Z → 36..61</text>' +
		'<text x="290" y="122" class="lbl">7 chars cover 62⁷ ≈ 3.5 trillion ids</text>' +
		'<defs><marker id="dgArrowB62" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'base62-shortener',
		title: 'Base62 URL Shortener',
		nav: 'Base62 Shortener',
		difficulty: 'Easy',
		category: 'Unique IDs & Encoding',
		task: 'Implement EncodeBase62 and DecodeBase62 — every case also round-trips.',

		prose: [
			'<h2>Base62 URL Shortener</h2>' +
			'<p>A URL shortener stores the long URL in a row and hands back a token like ' +
			'<code>sho.rt/2crtgcg</code>. The classic design: the token <em>is</em> the row id, ' +
			'just written in base 62 — the 62 characters that survive untouched in a URL ' +
			'path (digits, lowercase, uppercase). No lookup table for tokens, no collision ' +
			'checks: encoding is a bijection, so every id has exactly one token and back.</p>' +
			DIAGRAM +
			'<p>Use EXACTLY this alphabet — the character’s index is its digit value:</p>',
			{ code: '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ', lang: 'txt' },
			'<ul>' +
			'<li><code>EncodeBase62(n uint64) string</code> — most significant digit first; <code>Encode(0)</code> returns <code>"0"</code>.</li>' +
			'<li><code>DecodeBase62(s string) uint64</code> — the inverse; input is always a valid base62 string.</li>' +
			'</ul>' +
			'<p>Why base 62 and not 64? Base64 needs <code>+</code> and <code>/</code> (or ' +
			'<code>-</code>/<code>_</code>), which either require URL-encoding or look like path ' +
			'separators. Base62 is the densest encoding that is pure alphanumeric.</p>',
		],

		starter: [
			'package main',
			'',
			'// base62Alphabet maps digit value → character: index 0 is \'0\',',
			'// index 10 is \'a\', index 36 is \'A\', index 61 is \'Z\'.',
			'const base62Alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"',
			'',
			'// EncodeBase62 writes n in base 62 using base62Alphabet, most',
			'// significant digit first. EncodeBase62(0) returns "0".',
			'func EncodeBase62(n uint64) string {',
			'	return "" // your code here — hint: repeated n%62 / n/=62 builds digits in reverse',
			'}',
			'',
			'// DecodeBase62 parses a base62 string back to the number it encodes.',
			'// The input is always a valid, non-empty base62 string.',
			'func DecodeBase62(s string) uint64 {',
			'	return 0 // your code here — hint: n = n*62 + digitValue for each char',
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
			SD.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		n    uint64',
			'		want string',
			'	}',
			'	cases := []tc{',
			'		{0, "0"},                    // the special case every divmod loop forgets',
			'		{7, "7"},                    // single digit, digit range 0-9',
			'		{61, "Z"},                   // largest single digit — exercises the A-Z range',
			'		{62, "10"},                  // first two-digit value: digit order matters',
			'		{3843, "ZZ"},                // 62*62-1, largest two-digit value',
			'		{125000000000, "2crtgcg"},   // a realistic auto-increment id',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("n=%d", c.n),',
			'			"want":  fmt.Sprintf("encode=%q, decode(%q)=%d", c.want, c.want, c.n),',
			'		}',
			'		runCase(r, func() {',
			'			enc := EncodeBase62(c.n)',
			'			dec := DecodeBase62(c.want)',
			'			// Both directions must agree: enc matches the table AND',
			'			// decoding the expected token round-trips to n.',
			'			r["pass"] = enc == c.want && dec == c.n',
			'			r["got"] = fmt.Sprintf("encode=%q, decode(%q)=%d", enc, c.want, dec)',
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
			'import "strings"',
			'',
			'// base62Alphabet maps digit value → character: index 0 is \'0\',',
			'// index 10 is \'a\', index 36 is \'A\', index 61 is \'Z\'.',
			'const base62Alphabet = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"',
			'',
			'// EncodeBase62 writes n in base 62 using base62Alphabet, most',
			'// significant digit first. EncodeBase62(0) returns "0".',
			'//',
			'// Standard positional conversion: n%62 peels off the LEAST',
			'// significant digit, so digits come out backwards and the buffer is',
			'// reversed at the end. Zero is special-cased because the loop',
			'// condition (n > 0) would otherwise emit no digits at all.',
			'func EncodeBase62(n uint64) string {',
			'	if n == 0 {',
			'		return "0"',
			'	}',
			'	// 11 bytes is enough for any uint64 (62^11 > 2^64), so this',
			'	// buffer never reallocates.',
			'	buf := make([]byte, 0, 11)',
			'	for n > 0 {',
			'		buf = append(buf, base62Alphabet[n%62])',
			'		n /= 62',
			'	}',
			'	// Reverse in place: least-significant-first → most-significant-first.',
			'	for i, j := 0, len(buf)-1; i < j; i, j = i+1, j-1 {',
			'		buf[i], buf[j] = buf[j], buf[i]',
			'	}',
			'	return string(buf)',
			'}',
			'',
			'// DecodeBase62 parses a base62 string back to the number it encodes.',
			'// The input is always a valid, non-empty base62 string.',
			'//',
			'// Horner\'s rule: each character shifts the accumulator up one base62',
			'// "place" and adds the new digit. IndexByte over a 62-byte constant',
			'// is effectively O(1) and keeps the digit table in ONE place — a',
			'// second reverse-lookup table is a classic source of skew bugs.',
			'func DecodeBase62(s string) uint64 {',
			'	var n uint64',
			'	for i := 0; i < len(s); i++ {',
			'		n = n*62 + uint64(strings.IndexByte(base62Alphabet, s[i]))',
			'	}',
			'	return n',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>From “generate a random token” to a bijection</h3>' +
			'<p>The brute-force shortener generates a random 7-char string, checks the ' +
			'database for a collision, retries — extra reads, a uniqueness index, and a ' +
			'retry loop that degrades as the table fills. The insight: you already have a ' +
			'unique number (the auto-increment id), and <strong>bijective base conversion</strong> ' +
			'turns any number into a unique short string with zero collision checks. The ' +
			'same positional-numeral trick shows up anywhere ids meet URLs: YouTube-style ' +
			'video ids, Flickr short links, pagination cursors, and the ' +
			'<em>snowflake-id</em> problem next in this track.</p>',
			{ code: 'for n > 0 {\n\tbuf = append(buf, base62Alphabet[n%62]) // least significant digit first\n\tn /= 62\n}\n// reverse buf — and decode is Horner\'s rule: n = n*62 + digit' },
			'<h3>Length math</h3>' +
			'<p>Each character multiplies the space by 62: <code>62⁷ ≈ 3.5 trillion</code>, so ' +
			'7 characters cover a thousand times more ids than a 4-byte int can hold; ' +
			'11 characters cover all of <code>uint64</code>. That density is the point of ' +
			'base 62 — it is the largest alphabet that stays URL-safe without escaping.</p>' +
			'<h3>The leak</h3>' +
			'<p>Sequential ids are guessable: <code>/2crtgcg</code> tells a competitor roughly ' +
			'how many links you have ever created, and crawling <code>id-1, id-2, …</code> ' +
			'enumerates them all. Real shorteners either encrypt/permute the id before ' +
			'encoding (a Feistel round or modular multiply by a secret odd constant) or ' +
			'switch to structured random ids — which is exactly what the snowflake ' +
			'problem builds.</p>',
		],
		complexity: { time: 'O(log₆₂ n) per encode/decode', space: 'O(1)' },
	});
})();
