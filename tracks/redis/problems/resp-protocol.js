/* RESP: The Wire Protocol — Protocol (Medium). RESP2, the wire format every
 * Redis client speaks: five type bytes (+ - : $ *), exact \r\n framing,
 * length-prefixed binary-safe bulk strings, and commands sent as arrays of
 * bulks. The harness pins the exact bytes redis-cli would put on the wire —
 * including the empty-vs-null bulk distinction and a bulk string with \r\n
 * INSIDE it, the case that breaks every line-oriented parser.
 */
(function () {
	'use strict';
	var T = GoLearnRD;

	// A command on the wire: an array header, then one length-prefixed bulk
	// string per argument. Marker id namespaced (dgArrowRD01) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 200" width="560" height="200" role="img" aria-label="SET user:1 alice encoded as a RESP array of three bulk strings, each length-prefixed and CRLF-framed">' +
		'<text x="20" y="24" class="lbl">SET user:1 alice — what the client actually sends</text>' +
		'<rect x="20" y="40" width="90" height="40" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="65" y="65" text-anchor="middle">*3\\r\\n</text>' +
		'<text x="65" y="98" text-anchor="middle" class="lbl">array of 3</text>' +
		'<rect x="130" y="40" width="130" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="195" y="65" text-anchor="middle">$3\\r\\nSET\\r\\n</text>' +
		'<rect x="280" y="40" width="130" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="345" y="65" text-anchor="middle">$6\\r\\nuser:1\\r\\n</text>' +
		'<rect x="430" y="40" width="120" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="490" y="65" text-anchor="middle">$5\\r\\nalice\\r\\n</text>' +
		'<text x="345" y="98" text-anchor="middle" class="lbl">every argument is a bulk string: $&lt;len&gt;, then exactly len bytes</text>' +
		'<path d="M 65 110 C 65 150 195 150 195 86" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowRD01)"/>' +
		'<text x="130" y="152" text-anchor="middle" class="lbl" style="fill:var(--warn)">header says how many follow</text>' +
		'<text x="20" y="186" class="lbl">the length prefix — not a delimiter — is what makes RESP binary-safe: len bytes are copied blind</text>' +
		'<defs><marker id="dgArrowRD01" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'resp-protocol',
		title: 'RESP: The Wire Protocol',
		nav: 'resp protocol',
		difficulty: 'Medium',
		category: 'Protocol',
		task: 'Implement RESP2 encoders (simple string, error, integer, bulk, null bulk, command-as-array) and DecodeReply, with exact \\r\\n framing.',

		prose: [
			'<h2>RESP: The Wire Protocol</h2>' +
			'<p>A connection-pool bug is eating your afternoon: under load, one ' +
			'service starts getting replies that belong to <em>someone else’s</em> ' +
			'request. You <code>tcpdump</code> port 6379 and stare at the bytes — and ' +
			'discover Redis’s protocol is so simple you can read it raw: ' +
			'<code>*3\\r\\n$3\\r\\nSET\\r\\n...</code>. Someone’s hand-rolled pipeline ' +
			'code miscounted a reply boundary once, and every reply after it is off ' +
			'by one. To find the bad boundary you need to know the framing exactly. ' +
			'RESP2 has five reply types, each announced by its first byte:</p>' +
			'<ul>' +
			'<li><strong><code>+</code> simple string</strong> — <code>+OK\\r\\n</code>. ' +
			'One line, no lengths, cannot contain <code>\\r\\n</code>.</li>' +
			'<li><strong><code>-</code> error</strong> — <code>-ERR unknown command\\r\\n</code>. ' +
			'Same framing as a simple string; the first word is a convention-only ' +
			'error class (<code>ERR</code>, <code>WRONGTYPE</code>, <code>OOM</code>).</li>' +
			'<li><strong><code>:</code> integer</strong> — <code>:1000\\r\\n</code>. ' +
			'What <code>INCR</code>, <code>DEL</code>, <code>LLEN</code> return.</li>' +
			'<li><strong><code>$</code> bulk string</strong> — <code>$5\\r\\nhello\\r\\n</code>: ' +
			'a declared byte length, then <em>exactly</em> that many bytes, then a ' +
			'closing <code>\\r\\n</code>. Because the parser copies <code>len</code> ' +
			'bytes blind, the payload may contain anything — including ' +
			'<code>\\r\\n</code>. <code>$0\\r\\n\\r\\n</code> is the empty string; ' +
			'<code>$-1\\r\\n</code> is the <strong>null</strong> bulk — what ' +
			'<code>GET missing-key</code> returns. Empty and null are different ' +
			'replies, and clients that conflate them cause real bugs.</li>' +
			'<li><strong><code>*</code> array</strong> — <code>*2\\r\\n</code> then two ' +
			'complete replies of any type, recursively. <code>*-1\\r\\n</code> is a ' +
			'null array. And here is the elegant part: <strong>a command is just an ' +
			'array of bulk strings</strong> — the same grammar in both directions.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the encoders — <code>EncodeSimple</code>, ' +
			'<code>EncodeError</code>, <code>EncodeInt</code>, <code>EncodeBulk</code>, ' +
			'<code>EncodeNullBulk</code>, <code>EncodeCommand</code> — and ' +
			'<code>DecodeReply</code>, which parses one complete reply and renders it ' +
			'redis-cli style:</p>',
			{ lang: 'txt', code: '+OK\\r\\n                       ->  OK\n-ERR bad thing\\r\\n            ->  (error) ERR bad thing\n:42\\r\\n                       ->  (integer) 42\n$5\\r\\nhello\\r\\n                ->  "hello"\n$-1\\r\\n                       ->  (nil)\n*2\\r\\n$3\\r\\nfoo\\r\\n:7\\r\\n       ->  ["foo", (integer) 7]' },
			'<p><code>DecodeReply</code> must consume the input exactly: truncated ' +
			'input, an unknown type byte, or trailing bytes after the reply are all ' +
			'errors (returned, never panicked) — trailing bytes are precisely the ' +
			'off-by-one-reply bug you are hunting.</p>' +
			'<div class="tip">Resist <code>strings.Split(resp, "\\r\\n")</code>. A ' +
			'bulk string’s body can contain <code>\\r\\n</code>, so line-splitting ' +
			'corrupts exactly the payloads the length prefix exists to protect. ' +
			'Read the length, then take that many bytes blind.</div>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// EncodeSimple frames s as a RESP simple string: +s\\r\\n.',
			'func EncodeSimple(s string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// EncodeError frames msg as a RESP error: -msg\\r\\n.',
			'func EncodeError(msg string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// EncodeInt frames n as a RESP integer: :n\\r\\n.',
			'func EncodeInt(n int64) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// EncodeBulk frames s as a bulk string: $<len>\\r\\n<bytes>\\r\\n.',
			'// len is the BYTE length; the body is copied verbatim, so it may',
			'// itself contain \\r\\n — that is the point of the length prefix.',
			'func EncodeBulk(s string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// EncodeNullBulk is the null bulk string $-1\\r\\n — what GET returns',
			'// for a missing key. Distinct from the EMPTY bulk $0\\r\\n\\r\\n.',
			'func EncodeNullBulk() string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// EncodeCommand encodes a client command the way every Redis client',
			'// does: an array header *<n>\\r\\n followed by each argument as a',
			'// bulk string.',
			'func EncodeCommand(args []string) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// DecodeReply parses ONE complete RESP reply and renders it',
			'// redis-cli style (see the prose table). It must consume the input',
			'// exactly: truncated input, unknown type bytes, or trailing bytes',
			'// are errors — returned, never panicked.',
			'func DecodeReply(resp string) (string, error) {',
			'	// your code here',
			'	return "", errors.New("not implemented")',
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
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	// %q makes the CRLF framing visible in the transcript — the whole',
			'	// point of this exercise is exact bytes.',
			'	q := func(s string) string { return fmt.Sprintf("%q", s) }',
			'	dec := func(resp string) string {',
			'		out, err := DecodeReply(resp)',
			'		if err != nil {',
			'			return "error: " + err.Error()',
			'		}',
			'		return out',
			'	}',
			'	cases := []tc{',
			'		{"EncodeSimple(OK): the +OK every SET returns", q("+OK\\r\\n"),',
			'			func() string { return q(EncodeSimple("OK")) }},',
			'		{"EncodeError: same framing, - type byte", q("-ERR unknown command \'GETT\'\\r\\n"),',
			'			func() string { return q(EncodeError("ERR unknown command \'GETT\'")) }},',
			'		{"EncodeInt(1000): what INCR replies", q(":1000\\r\\n"),',
			'			func() string { return q(EncodeInt(1000)) }},',
			'		{"EncodeBulk(hello): length-prefixed, CRLF-closed", q("$5\\r\\nhello\\r\\n"),',
			'			func() string { return q(EncodeBulk("hello")) }},',
			'		{"empty bulk is $0 with an empty body — NOT the null bulk", q("$0\\r\\n\\r\\n"),',
			'			func() string { return q(EncodeBulk("")) }},',
			'		{"null bulk $-1: GET on a missing key", q("$-1\\r\\n"),',
			'			func() string { return q(EncodeNullBulk()) }},',
			'		{"binary safety: the body may contain CRLF — length counts it", q("$4\\r\\na\\r\\nb\\r\\n"),',
			'			func() string { return q(EncodeBulk("a\\r\\nb")) }},',
			'		{"EncodeCommand(SET user:1 alice): an array of bulk strings",',
			'			q("*3\\r\\n$3\\r\\nSET\\r\\n$6\\r\\nuser:1\\r\\n$5\\r\\nalice\\r\\n"),',
			'			func() string { return q(EncodeCommand([]string{"SET", "user:1", "alice"})) }},',
			'		{"decode +OK", "OK", func() string { return dec("+OK\\r\\n") }},',
			'		{"decode an error reply", "(error) WRONGTYPE Operation against a key holding the wrong kind of value",',
			'			func() string { return dec("-WRONGTYPE Operation against a key holding the wrong kind of value\\r\\n") }},',
			'		{"decode :42", "(integer) 42", func() string { return dec(":42\\r\\n") }},',
			'		{"decode a bulk whose body contains CRLF — line-splitters break here", q("a\\r\\nb"),',
			'			func() string { return dec("$4\\r\\na\\r\\nb\\r\\n") }},',
			'		{"decode the null bulk", "(nil)", func() string { return dec("$-1\\r\\n") }},',
			'		{"decode a mixed array", "[\\"foo\\", (integer) 7]",',
			'			func() string { return dec("*2\\r\\n$3\\r\\nfoo\\r\\n:7\\r\\n") }},',
			'		{"decode a nested array (EXEC replies nest)", "[[(integer) 1, (integer) 2], \\"ok\\"]",',
			'			func() string { return dec("*2\\r\\n*2\\r\\n:1\\r\\n:2\\r\\n$2\\r\\nok\\r\\n") }},',
			'		{"truncated bulk body is an error, not a crash", "error: ERR protocol error: bulk body truncated",',
			'			func() string { return dec("$5\\r\\nhel") }},',
			'		{"trailing bytes after a complete reply — the off-by-one-reply bug", "error: ERR protocol error: trailing bytes after reply",',
			'			func() string { return dec("+OK\\r\\n+OK\\r\\n") }},',
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
			'import (',
			'	"errors"',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// The line-framed types share one shape: type byte, payload, CRLF.',
			'// Concatenation (not Sprintf) keeps the framing visible at the call',
			'// site — with a protocol this small, the code should read like the',
			'// spec.',
			'func EncodeSimple(s string) string {',
			'	return "+" + s + "\\r\\n"',
			'}',
			'',
			'func EncodeError(msg string) string {',
			'	return "-" + msg + "\\r\\n"',
			'}',
			'',
			'func EncodeInt(n int64) string {',
			'	return ":" + strconv.FormatInt(n, 10) + "\\r\\n"',
			'}',
			'',
			'// EncodeBulk declares the byte length up front, then copies the body',
			'// verbatim. len(s) is a BYTE count (Go strings are byte slices under',
			'// the hood), which is exactly what RESP wants — the payload is opaque',
			'// binary as far as the framing is concerned.',
			'func EncodeBulk(s string) string {',
			'	return "$" + strconv.Itoa(len(s)) + "\\r\\n" + s + "\\r\\n"',
			'}',
			'',
			'// The null bulk has a length of -1 and NO body — not even the closing',
			'// CRLF a real body would carry. It is a five-byte constant.',
			'func EncodeNullBulk() string {',
			'	return "$-1\\r\\n"',
			'}',
			'',
			'// EncodeCommand: a command is an array of bulk strings — the same',
			'// grammar as replies, reused in the client->server direction. Every',
			'// argument goes as a bulk (never a simple string) so arguments can',
			'// carry arbitrary bytes: binary values, spaces, even CRLF.',
			'func EncodeCommand(args []string) string {',
			'	var b strings.Builder',
			'	b.WriteString("*" + strconv.Itoa(len(args)) + "\\r\\n")',
			'	for _, a := range args {',
			'		b.WriteString(EncodeBulk(a))',
			'	}',
			'	return b.String()',
			'}',
			'',
			'// readLine consumes up to the next CRLF, returning the line and the',
			'// index just past the terminator. Only headers and line-framed types',
			'// go through here — bulk BODIES are read by length, never by line.',
			'func readLine(s string, i int) (string, int, error) {',
			'	j := strings.Index(s[i:], "\\r\\n")',
			'	if j < 0 {',
			'		return "", i, errors.New("ERR protocol error: missing CRLF")',
			'	}',
			'	return s[i : i+j], i + j + 2, nil',
			'}',
			'',
			'// parseReply parses one complete reply starting at i and returns its',
			'// rendering plus the index just past it. Returning the next index is',
			'// what makes arrays compose: the array case calls parseReply in a',
			'// loop, threading the cursor — a hand-rolled recursive descent',
			'// parser, which is all RESP needs.',
			'func parseReply(s string, i int) (string, int, error) {',
			'	if i >= len(s) {',
			'		return "", i, errors.New("ERR protocol error: unexpected end of input")',
			'	}',
			'	typeByte := s[i]',
			'	line, next, err := readLine(s, i+1)',
			'	if err != nil {',
			'		return "", i, err',
			'	}',
			'	switch typeByte {',
			'	case \'+\':',
			'		return line, next, nil',
			'	case \'-\':',
			'		return "(error) " + line, next, nil',
			'	case \':\':',
			'		if _, convErr := strconv.ParseInt(line, 10, 64); convErr != nil {',
			'			return "", i, errors.New("ERR protocol error: bad integer")',
			'		}',
			'		return "(integer) " + line, next, nil',
			'	case \'$\':',
			'		n, convErr := strconv.Atoi(line)',
			'		if convErr != nil || n < -1 {',
			'			return "", i, errors.New("ERR protocol error: bad bulk length")',
			'		}',
			'		if n == -1 {',
			'			return "(nil)", next, nil',
			'		}',
			'		// The load-bearing moment: take n bytes BLIND. No scanning',
			'		// for delimiters — the body may contain CRLF and that must',
			'		// not matter. The +2 is the mandatory trailing CRLF.',
			'		if next+n+2 > len(s) {',
			'			return "", i, errors.New("ERR protocol error: bulk body truncated")',
			'		}',
			'		if s[next+n:next+n+2] != "\\r\\n" {',
			'			return "", i, errors.New("ERR protocol error: bulk missing CRLF")',
			'		}',
			'		// Quote the body like redis-cli does: control bytes such as an',
			'		// embedded CRLF render as escapes, keeping the output one line.',
			'		return strconv.Quote(s[next : next+n]), next + n + 2, nil',
			'	case \'*\':',
			'		n, convErr := strconv.Atoi(line)',
			'		if convErr != nil || n < -1 {',
			'			return "", i, errors.New("ERR protocol error: bad array length")',
			'		}',
			'		if n == -1 {',
			'			return "(nil)", next, nil',
			'		}',
			'		parts := make([]string, 0, n)',
			'		pos := next',
			'		for k := 0; k < n; k++ {',
			'			el, after, elErr := parseReply(s, pos)',
			'			if elErr != nil {',
			'				return "", i, elErr',
			'			}',
			'			parts = append(parts, el)',
			'			pos = after',
			'		}',
			'		return "[" + strings.Join(parts, ", ") + "]", pos, nil',
			'	}',
			'	return "", i, errors.New("ERR protocol error: unknown type byte")',
			'}',
			'',
			'// DecodeReply parses exactly one reply. The full-consumption check is',
			'// deliberate: leftover bytes mean the caller\'s reply boundaries are',
			'// off by one — the pipelining bug from the prose — and silently',
			'// ignoring them is how that bug stays hidden for months.',
			'func DecodeReply(resp string) (string, error) {',
			'	out, pos, err := parseReply(resp, 0)',
			'	if err != nil {',
			'		return "", err',
			'	}',
			'	if pos != len(resp) {',
			'		return "", errors.New("ERR protocol error: trailing bytes after reply")',
			'	}',
			'	return out, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why a text protocol at all</h3>' +
			'<p>RESP is deliberately primitive: type dispatch on one byte, lengths ' +
			'in decimal ASCII, CRLF everywhere. The stated design goals were: ' +
			'trivial to implement in any language, trivial to debug over ' +
			'<code>telnet</code>, and fast to parse — the length prefix means the ' +
			'parser never scans a payload, it copies. That last property is why ' +
			'bulk strings are binary-safe and why Redis can store serialized ' +
			'protobufs, gzipped JSON, or raw image bytes as values without any ' +
			'escaping layer. (Server-side, incoming argument bytes land directly ' +
			'in the SDS strings the database stores — no transcoding step at ' +
			'all.)</p>' +
			'<h3>The reply-boundary bug, for real</h3>' +
			'<p>Redis connections are strictly request/reply <em>in order</em> — ' +
			'pipelining sends N commands and then reads exactly N replies. Any ' +
			'client that miscounts (a timeout that abandons a reply but returns the ' +
			'connection to the pool is the classic) leaves an unread reply in the ' +
			'socket, and the next borrower of that connection reads it as the ' +
			'answer to <em>its</em> command. Cross-request data leaks from exactly ' +
			'this bug have shipped in production clients more than once. The fix is ' +
			'always the same: on any protocol desync or timeout, close the ' +
			'connection — never return it to the pool. Your ' +
			'<code>DecodeReply</code>’s trailing-bytes error is that desync ' +
			'detector.</p>' +
			'<h3>RESP3</h3>' +
			'<p>Redis 6 added RESP3 (negotiated with <code>HELLO 3</code>): maps ' +
			'(<code>%</code>), sets (<code>~</code>), doubles (<code>,</code>), ' +
			'booleans (<code>#</code>), a dedicated null (<code>_</code>), and ' +
			'out-of-band push frames (<code>&gt;</code>) — the mechanism behind ' +
			'client-side caching invalidation. But RESP2 remains the wire baseline, ' +
			'every RESP3 type is still CRLF-framed with a leading type byte, and ' +
			'the parser you just wrote extends to it by adding switch cases, not by ' +
			'changing shape.</p>' +
			'<h3>Operational notes</h3>' +
			'<p>Inline commands (<code>PING\\r\\n</code> typed raw into ' +
			'<code>nc</code>, no array framing) are a separate server-side parser ' +
			'kept for exactly the debugging session in the prose. And the empty/' +
			'null distinction you pinned is observable at the CLI: ' +
			'<code>GET missing</code> prints <code>(nil)</code> while ' +
			'<code>GET empty</code> prints <code>""</code> — code that treats them ' +
			'the same turns “key exists with empty value” into “key ' +
			'absent”, which corrupts cache-aside logic.</p>',
		],
		complexity: { time: 'O(n) — each byte of the reply is visited once; bulk bodies are consumed by length, never scanned', space: 'O(n) for the render; recursion depth equals array nesting' },
	});
})();
