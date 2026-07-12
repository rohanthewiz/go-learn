/* Encode and Decode Strings — Arrays & Hashing (Medium). Length-prefix
 * framing: serialize a []string into one string so that Decode(Encode(x))
 * == x for ANY payload — "#", digits, empty strings, multi-byte UTF-8.
 * The harness tests ROUND-TRIPS only (never the encoded bytes), so any
 * correct self-delimiting scheme passes.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="length-prefix framing of two strings including one containing a hash">' +
		'<text x="20" y="20" class="lbl">Encode(["ab", "2#ab"])  —  each frame: &lt;len&gt; # &lt;payload&gt;</text>' +
		// frame 1: 2 # a b   (cells 34px wide, y=34..70)
		'<g>' +
		'<rect x="20" y="34" width="34" height="36" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="58" y="34" width="34" height="36" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="96" y="34" width="72" height="36" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="37" y="57" text-anchor="middle">2</text>' +
		'<text x="75" y="57" text-anchor="middle">#</text>' +
		'<text x="132" y="57" text-anchor="middle">ab</text>' +
		'<text x="56" y="86" text-anchor="middle" class="lbl">header</text>' +
		'<text x="132" y="86" text-anchor="middle" class="lbl">payload (2 bytes)</text>' +
		'</g>' +
		// frame 2: 4 # 2 # a b
		'<g>' +
		'<rect x="188" y="34" width="34" height="36" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="226" y="34" width="34" height="36" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="264" y="34" width="132" height="36" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="205" y="57" text-anchor="middle">4</text>' +
		'<text x="243" y="57" text-anchor="middle">#</text>' +
		'<text x="330" y="57" text-anchor="middle">2#ab</text>' +
		'<text x="224" y="86" text-anchor="middle" class="lbl">header</text>' +
		'<text x="330" y="86" text-anchor="middle" class="lbl">payload (4 bytes)</text>' +
		'</g>' +
		// decode hop arrows: header read, then jump len bytes
		'<path d="M 37 108 C 60 132 100 132 130 112" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowEDS)"/>' +
		'<path d="M 205 108 C 240 136 290 136 328 112" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowEDS)"/>' +
		'<text x="80" y="150" class="lbl">read len, skip exactly len bytes —</text>' +
		'<text x="80" y="166" class="lbl">the # inside "2#ab" is never even looked at</text>' +
		'<text x="20" y="192" style="fill:var(--ok)">no reserved characters, no escaping: the payload is opaque bytes</text>' +
		'<defs><marker id="dgArrowEDS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'encode-decode-strings',
		title: 'Encode and Decode Strings',
		nav: 'Encode/Decode Strings',
		difficulty: 'Medium',
		category: 'Arrays & Hashing',
		task: 'Implement Encode and Decode — make all 6 round-trip tests pass.',

		prose: [
			'<h2>Encode and Decode Strings</h2>' +
			'<p>Design two functions:</p>' +
			'<ul>' +
			'<li><code>Encode(strs []string) string</code> — serialize a list of strings ' +
			'into <em>one</em> string;</li>' +
			'<li><code>Decode(s string) []string</code> — reconstruct the original list.</li>' +
			'</ul>' +
			'<p><code>Decode(Encode(x))</code> must equal <code>x</code> for <strong>any</strong> ' +
			'input — elements may contain <code>"#"</code>, digits, be empty, or be any other ' +
			'bytes. There is no character you can assume never appears in a payload, so a ' +
			'plain delimiter like <code>","</code> cannot work unescaped.</p>' +
			'<h3>Example</h3>',
			{ code: 'Decode(Encode([]string{"go", "learn"}))      →  []string{"go", "learn"}\nDecode(Encode([]string{"2#ab", "", "#"}))    →  []string{"2#ab", "", "#"}   // tricky payloads survive', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Instead of separating items, <em>announce</em> each item’s length up front — ' +
			'<code>"&lt;len&gt;#&lt;payload&gt;"</code>. The decoder reads the number, then blindly ' +
			'consumes exactly that many bytes; the payload’s content is never inspected:</p>' +
			DIAGRAM +
			'<p>One byte-level caveat in Go: <code>len(s)</code> counts <strong>bytes</strong>, not ' +
			'runes — and that is exactly what you want. Slice by byte offsets and multi-byte ' +
			'UTF-8 payloads round-trip untouched; count runes and they will not.</p>' +
			'<p>The tests only compare <code>Decode(Encode(x))</code> against <code>x</code> — ' +
			'your wire format is your own business, as long as it is unambiguous.</p>',
		],

		starter: [
			'package main',
			'',
			'// Encode serializes strs into a single string. No character is off-',
			'// limits in the payloads: elements may contain "#", digits, or be',
			'// empty, so the encoding itself must mark where each element ends.',
			'func Encode(strs []string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// Decode reverses Encode: Decode(Encode(x)) == x for any x. It may',
			'// assume s was produced by Encode.',
			'func Decode(s string) []string {',
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
			'		strs []string',
			'	}',
			'	cases := []tc{',
			'		{[]string{"go", "learn", "rocks"}},',
			'		// payloads full of the framing characters themselves: an element',
			'		// that LOOKS like an encoded frame ("2#ab") must survive intact.',
			'		{[]string{"2#ab", "#", "12#34"}},',
			'		{[]string{"", "a", ""}},',
			'		{[]string{}},',
			'		// one empty string is NOT the same as no strings — Encode must',
			'		// distinguish []string{""} from []string{}.',
			'		{[]string{""}},',
			'		// multi-byte UTF-8: correct byte-length framing round-trips it.',
			'		{[]string{"héllo", "日本語", "ok"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%q", c.strs),',
			'			"want":  fmt.Sprintf("round-trip → %q", c.strs),',
			'		}',
			'		runCase(r, func() {',
			'			// Round-trip only: the encoded bytes are never inspected, so',
			'			// any correct self-delimiting format passes. Pass a copy in',
			'			// case Encode mutates its argument.',
			'			enc := Encode(append([]string(nil), c.strs...))',
			'			got := Decode(enc)',
			'			// Normalize nil → empty slice before comparing: "no elements"',
			'			// may legitimately come back as nil, and reflect.DeepEqual',
			'			// treats nil and []string{} as different.',
			'			if got == nil {',
			'				got = []string{}',
			'			}',
			'			r["pass"] = reflect.DeepEqual(got, c.strs)',
			'			r["got"] = fmt.Sprintf("%q (encoded as %q)", got, enc)',
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
			'import (',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// Encode frames every element as "<len>#<payload>": the byte length',
			'// in decimal, one \'#\' terminating the header, then the raw bytes.',
			'//',
			'//	["ab", "2#ab", ""]  →  "2#ab4#2#ab0#"',
			'//',
			'// The length tells Decode exactly how many bytes to consume, so the',
			'// payload never needs escaping — it is opaque. The \'#\' is not a',
			'// delimiter between items; it only ends the digit run of the header',
			'// (lengths are digits, so the first non-digit is unambiguous).',
			'//',
			'// len(s) counts BYTES and s[i:j] slices bytes, which is exactly',
			'// right: multi-byte UTF-8 payloads round-trip without ever being',
			'// decoded into runes.',
			'func Encode(strs []string) string {',
			'	// strings.Builder amortizes growth; naive += concatenation would',
			'	// re-copy the accumulated result on every append (O(n²) bytes).',
			'	var b strings.Builder',
			'	for _, s := range strs {',
			'		b.WriteString(strconv.Itoa(len(s)))',
			'		b.WriteByte(\'#\')',
			'		b.WriteString(s)',
			'	}',
			'	return b.String()',
			'}',
			'',
			'// Decode walks the frames left to right: parse the digit run up to',
			'// the first \'#\', then jump over exactly that many payload bytes.',
			'// Payload bytes are never examined, so a payload containing "#" or',
			'// digits cannot confuse the parser.',
			'func Decode(s string) []string {',
			'	// Start non-nil so an empty encoding decodes to an empty LIST,',
			'	// keeping Decode(Encode([]string{})) exactly round-trip clean.',
			'	out := []string{}',
			'	i := 0',
			'	for i < len(s) {',
			'		// Header: digits end at the first \'#\'. Input is trusted to be',
			'		// well-formed (it came from Encode), so no bounds paranoia.',
			'		j := i',
			'		for s[j] != \'#\' {',
			'			j++',
			'		}',
			'		n, _ := strconv.Atoi(s[i:j])',
			'		out = append(out, s[j+1:j+1+n])',
			'		i = j + 1 + n // skip header, \'#\', and the whole payload',
			'	}',
			'	return out',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the obvious ideas break</h3>' +
			'<p>Joining with a delimiter — <code>strings.Join(strs, ",")</code> — corrupts ' +
			'any payload that contains a comma, and the problem guarantees no safe ' +
			'character exists. The classic fix is <em>escaping</em> (double every delimiter ' +
			'inside payloads, like CSV’s <code>""</code>), but escaping forces the decoder ' +
			'to inspect every byte, grows the output unpredictably, and is notoriously easy ' +
			'to get subtly wrong.</p>' +
			'<h3>Announce the length instead</h3>' +
			'<p>Length-prefixing sidesteps content entirely: write each element as ' +
			'<code>&lt;len&gt;#&lt;payload&gt;</code>. The decoder reads the decimal header, then ' +
			'consumes exactly that many bytes <em>without looking at them</em> — a payload ' +
			'of <code>"2#ab"</code> sails through because the parser is already past it ' +
			'before any <code>#</code> could mislead:</p>',
			{ code: 'for i < len(s) {\n\tj := i\n\tfor s[j] != \'#\' { j++ }            // header ends at first \'#\'\n\tn, _ := strconv.Atoi(s[i:j])\n\tout = append(out, s[j+1:j+1+n])    // consume n bytes blindly\n\ti = j + 1 + n\n}' },
			'<p>Details that carry the correctness:</p>' +
			'<ul>' +
			'<li><strong>Bytes, not runes.</strong> <code>len(s)</code> and slicing are ' +
			'byte-based in Go — precisely what framing needs. <code>"日本語"</code> encodes ' +
			'as <code>9#日本語</code> and round-trips; counting runes (3) would truncate it.</li>' +
			'<li><strong>Empty is a frame too.</strong> <code>""</code> becomes ' +
			'<code>0#</code>, so <code>[]string{""}</code> and <code>[]string{}</code> encode ' +
			'differently (<code>"0#"</code> vs <code>""</code>) — the information survives.</li>' +
			'<li><strong>The header is self-terminating.</strong> Lengths are digits, so ' +
			'the first non-digit (<code>#</code>) unambiguously ends the header — the format ' +
			'needs no lookahead and no state.</li>' +
			'</ul>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Self-delimiting encoding (length-prefix framing)</strong> — reach ' +
			'for it whenever data must carry <em>structure</em> through a channel that only ' +
			'transports flat bytes and no byte value can be reserved. Cost: O(total bytes) ' +
			'each way and a few header bytes per item; in exchange the payload is opaque — ' +
			'no escaping, no re-scanning. This is how real protocols frame messages on a ' +
			'TCP byte stream: HTTP’s <code>Content-Length</code>, protobuf’s length-' +
			'delimited fields, and Redis’ RESP <code>$5\\r\\nhello</code> are all ' +
			'<code>&lt;len&gt;#&lt;payload&gt;</code> wearing different hats — versus ' +
			'delimiter-plus-escaping formats like CSV, which pay with per-byte inspection. ' +
			'In this track the same “build an unambiguous canonical key” move appears in ' +
			'Group Anagrams (encoding a word’s letter counts as a map key — a count-based ' +
			'frame) and Valid Anagram; the framing mindset also underlies serializing ' +
			'trees or graphs to strings in harder problems.</p>',
		],
		complexity: { time: 'O(n) — n total bytes, each written and read once', space: 'O(n) for the encoded string / decoded list' },
	});
})();
