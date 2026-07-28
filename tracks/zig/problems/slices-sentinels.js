/* Slices & Sentinels — Slices & Strings (Medium). Zig's []u8 is ptr+len
 * exactly like a Go slice, but [:0]u8 is a sentinel-terminated slice: the
 * TYPE promises a 0 byte at data[len]. C strings are the reason, and
 * conversions demand proof — std.mem.span scans for the sentinel,
 * buf[0..n :0] asserts buf[n]==0. The learner implements the proof
 * obligations: SpanLen (strlen), ToSentinel (validate + append the 0),
 * and CStrEqual (compare up to the sentinels).
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// Two ways to know where a string ends: a length carried NEXT TO the
	// pointer, or a promise buried AT THE END of the bytes. Marker id
	// namespaced (dgArrowZGSS) — SVG ids share one page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 224" width="560" height="224" role="img" aria-label="a ptr+len slice knows its length up front; a sentinel-terminated buffer ends at a 0 byte that SpanLen must scan to find">' +
		'<text x="20" y="24" class="lbl">[]u8 — the length rides with the pointer (Go and Zig slices)</text>' +
		'<rect x="40" y="36" width="64" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="72" y="58" text-anchor="middle">ptr</text>' +
		'<rect x="104" y="36" width="64" height="34" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="136" y="58" text-anchor="middle">len 5</text>' +
		'<path d="M 72 76 C 72 96 210 96 244 96" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowZGSS)"/>' +
		// the pointed-to bytes (no terminator needed)
		'<g>' +
		'<rect x="252" y="80" width="34" height="32" fill="none" stroke="var(--accent)" stroke-width="1.6"/><text x="269" y="101" text-anchor="middle">h</text>' +
		'<rect x="286" y="80" width="34" height="32" fill="none" stroke="var(--accent)" stroke-width="1.6"/><text x="303" y="101" text-anchor="middle">e</text>' +
		'<rect x="320" y="80" width="34" height="32" fill="none" stroke="var(--accent)" stroke-width="1.6"/><text x="337" y="101" text-anchor="middle">l</text>' +
		'<rect x="354" y="80" width="34" height="32" fill="none" stroke="var(--accent)" stroke-width="1.6"/><text x="371" y="101" text-anchor="middle">l</text>' +
		'<rect x="388" y="80" width="34" height="32" fill="none" stroke="var(--accent)" stroke-width="1.6"/><text x="405" y="101" text-anchor="middle">o</text>' +
		'</g>' +
		'<text x="20" y="146" class="lbl">[:0]u8 / C string — the end is a 0 byte the TYPE promises is there</text>' +
		'<g>' +
		'<rect x="40" y="158" width="34" height="32" fill="none" stroke="var(--accent)" stroke-width="1.6"/><text x="57" y="179" text-anchor="middle">h</text>' +
		'<rect x="74" y="158" width="34" height="32" fill="none" stroke="var(--accent)" stroke-width="1.6"/><text x="91" y="179" text-anchor="middle">e</text>' +
		'<rect x="108" y="158" width="34" height="32" fill="none" stroke="var(--accent)" stroke-width="1.6"/><text x="125" y="179" text-anchor="middle">l</text>' +
		'<rect x="142" y="158" width="34" height="32" fill="none" stroke="var(--accent)" stroke-width="1.6"/><text x="159" y="179" text-anchor="middle">l</text>' +
		'<rect x="176" y="158" width="34" height="32" fill="none" stroke="var(--accent)" stroke-width="1.6"/><text x="193" y="179" text-anchor="middle">o</text>' +
		'<rect x="210" y="158" width="34" height="32" fill="none" stroke="var(--warn)" stroke-width="2.4"/><text x="227" y="179" text-anchor="middle" style="fill:var(--warn)">0</text>' +
		'</g>' +
		'<text x="330" y="179" class="lbl" style="fill:var(--warn)">← the type\'s promise: data[len] == 0</text>' +
		'<path d="M 46 206 L 214 206" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowZGSS)"/>' +
		'<text x="260" y="210" class="lbl">SpanLen / strlen: scan until the 0 — the length lives at the end, so finding it is O(n)</text>' +
		'<defs><marker id="dgArrowZGSS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'slices-sentinels',
		title: 'Slices & Sentinels',
		nav: 'slices & sentinels',
		difficulty: 'Medium',
		category: 'Slices & Strings',
		task: 'Implement the sentinel proof obligations: SpanLen (find the 0 a C string implies), ToSentinel (validate + append the 0), CStrEqual (compare up to the sentinels).',

		prose: [
			'<h2>Slices &amp; Sentinels</h2>' +
			'<p>Your Go service calls a C library, passes it a filename, and the ' +
			'library opens the wrong file — the name truncated at some byte, or ' +
			'worse, extended with garbage from adjacent memory. The bug is a ' +
			'missing or misplaced NUL byte: C strings do not carry a length ' +
			'anywhere. A <code>char*</code> is a bare pointer plus a ' +
			'<em>convention</em> — "keep reading until you hit a 0" — and ' +
			'nothing in C\'s type system checks the convention. Zig, which ' +
			'interoperates with C for a living, moved the convention into the ' +
			'type:</p>',
			{ lang: 'txt', code: 'const s: []const u8 = "hello";     // slice: ptr + len, like a Go slice\nconst z: [:0]const u8 = "hello";   // sentinel-terminated: z[5] == 0, BY TYPE\n\nextern fn puts(msg: [*:0]const u8) c_int;\n_ = puts(z);   // fine — the type PROVES the NUL is there\n_ = puts(s);   // compile error: []const u8 makes no such promise\n\nconst n = std.mem.span(c_ptr).len; // scan for the 0 -> a real slice (strlen)\nconst t = buf[0..5 :0];            // asserts buf[5] == 0 (checked in safe builds)' },
			'<ul>' +
			'<li><strong><code>[]u8</code> is Go\'s slice:</strong> pointer + ' +
			'length, the length known in O(1), interior zero bytes perfectly ' +
			'legal. Both languages agree here.</li>' +
			'<li><strong><code>[:0]u8</code> adds one promise:</strong> ' +
			'<code>data[len] == 0</code> — a sentinel one past the end. The ' +
			'buffer is one byte bigger than the length says, and that final 0 is ' +
			'guaranteed <em>by the type</em>, so passing it to C needs no ' +
			'ceremony and no copy.</li>' +
			'<li><strong>Conversions demand proof.</strong> A C pointer becomes ' +
			'a slice only by scanning for the sentinel (<code>std.mem.span</code> ' +
			'— this is strlen, and it is O(n) <em>because the length lives at ' +
			'the end</em>). A plain slice becomes sentinel-terminated only if a ' +
			'0 actually sits at the boundary — <code>buf[0..n :0]</code> checks ' +
			'it in safe builds.</li>' +
			'<li><strong>Go\'s equivalent is a copy:</strong> cgo\'s ' +
			'<code>C.CString</code> allocates and appends the NUL every call, ' +
			'because nothing in Go\'s type system can record "this particular ' +
			'slice already ends in 0".</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the three proof obligations. <code>SpanLen(buf)</code>: ' +
			'the index of the first 0 byte — the length a sentinel-terminated ' +
			'pointer implies — or error <code>"no sentinel"</code> if the buffer ' +
			'has none. <code>ToSentinel(data)</code>: verify data contains no ' +
			'interior 0 (else error <code>"interior sentinel"</code>) and return ' +
			'a new slice with a 0 appended — building a <code>[:0]</code> slice ' +
			'from a plain one. <code>CStrEqual(a, b)</code>: compare two ' +
			'sentinel-terminated buffers <em>up to their sentinels</em> — bytes ' +
			'past the 0 are storage, not string, and must not affect the ' +
			'answer.</p>',
		],

		starter: [
			'package main',
			'',
			'// SpanLen is std.mem.span\'s core: given a buffer holding a',
			'// sentinel-terminated string, return the index of the FIRST 0 byte',
			'// — the length the C world means when it hands you a bare pointer.',
			'// If no 0 exists anywhere, return (0, error "no sentinel"): the',
			'// buffer does not hold a C string at all, and scanning past its',
			'// end is exactly the overrun strlen is infamous for.',
			'// (import "errors" when you implement this)',
			'func SpanLen(buf []byte) (int, error) {',
			'	// your code here',
			'	return 0, nil',
			'}',
			'',
			'// ToSentinel builds a [:0]-style buffer from a plain slice: verify',
			'// data contains NO interior 0 byte — an interior 0 would make the',
			'// C world see a shorter string than the slice holds — and return a',
			'// NEW slice of len(data)+1 with data followed by the sentinel 0.',
			'// On an interior 0, return (nil, error "interior sentinel").',
			'// Do not modify data itself.',
			'func ToSentinel(data []byte) ([]byte, error) {',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
			'// CStrEqual compares two sentinel-terminated buffers the way C\'s',
			'// strcmp()==0 would: byte by byte until a mismatch (false) or a',
			'// shared 0 sentinel (true). Bytes AFTER each buffer\'s first 0 are',
			'// spare storage, not string content — buffers of different total',
			'// lengths can still hold equal strings. Both inputs are guaranteed',
			'// to contain a sentinel.',
			'func CStrEqual(a, b []byte) bool {',
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
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// Buffers are built with append so the 0 bytes are visible in the',
			'	// source: cstr(s, tail...) is s, a sentinel, then tail bytes that',
			'	// a correct implementation must treat as invisible.',
			'	cstr := func(s string, tail string) []byte {',
			'		buf := append([]byte(s), 0)',
			'		return append(buf, []byte(tail)...)',
			'	}',
			'	spanS := func(buf []byte) string {',
			'		n, err := SpanLen(buf)',
			'		if err != nil {',
			'			return "err: " + err.Error()',
			'		}',
			'		return fmt.Sprint(n)',
			'	}',
			'	toS := func(data []byte) string {',
			'		out, err := ToSentinel(data)',
			'		if err != nil {',
			'			return "err: " + err.Error()',
			'		}',
			'		return fmt.Sprint(out)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"SpanLen of \\"hello\\"+0+\\"XYZ\\": the FIRST 0 wins — the 3 storage bytes past it are not string",',
			'			"5",',
			'			func() string { return spanS(cstr("hello", "XYZ")) }},',
			'		{"SpanLen of \\"hello\\" with no 0 anywhere: not a C string — this is the buffer strlen overruns",',
			'			"err: no sentinel",',
			'			func() string { return spanS([]byte("hello")) }},',
			'		{"SpanLen of a buffer starting with 0: the empty C string has length 0 — sentinel at index 0",',
			'			"0",',
			'			func() string { return spanS(cstr("", "junk")) }},',
			'		{"ToSentinel of \\"hi\\": a fresh 3-byte buffer, the promise byte appended at the end",',
			'			"[104 105 0]",',
			'			func() string { return toS([]byte("hi")) }},',
			'		{"ToSentinel of an empty slice: the empty C string is just the sentinel itself",',
			'			"[0]",',
			'			func() string { return toS([]byte{}) }},',
			'		{"ToSentinel of \\"ab\\"+0+\\"c\\": an interior 0 would make C see \\"ab\\" where Go sees 4 bytes — must refuse",',
			'			"err: interior sentinel",',
			'			func() string { return toS(cstr("ab", "c")) }},',
			'		{"CStrEqual \\"cat\\" vs \\"cat\\" with different junk after each sentinel: equal — tails are storage, not string",',
			'			"true",',
			'			func() string { return fmt.Sprint(CStrEqual(cstr("cat", "###"), cstr("cat", "ZZZZZZ"))) }},',
			'		{"CStrEqual \\"cat\\" vs \\"car\\": one differing byte before the sentinels",',
			'			"false",',
			'			func() string { return fmt.Sprint(CStrEqual(cstr("cat", ""), cstr("car", ""))) }},',
			'		{"CStrEqual \\"ca\\" vs \\"cat\\": a proper prefix — one string\\u0027s sentinel meets the other\\u0027s \\u0027t\\u0027",',
			'			"false",',
			'			func() string { return fmt.Sprint(CStrEqual(cstr("ca", "XX"), cstr("cat", ""))) }},',
			'		{"CStrEqual of two empty C strings in different-sized buffers: still equal",',
			'			"true",',
			'			func() string { return fmt.Sprint(CStrEqual(cstr("", ""), cstr("", "leftover"))) }},',
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
			'// SpanLen is strlen with the overrun made impossible: the scan is',
			'// bounded by the Go slice\'s length, so a missing sentinel becomes',
			'// a returned error instead of a walk into adjacent memory. The',
			'// FIRST 0 wins by construction — the loop returns at the earliest',
			'// hit, which is what makes bytes past the sentinel invisible.',
			'func SpanLen(buf []byte) (int, error) {',
			'	for i, c := range buf {',
			'		if c == 0 {',
			'			return i, nil',
			'		}',
			'	}',
			'	// No 0 in the entire buffer: the [:0] type\'s promise does not',
			'	// hold, so there is no length to report. C\'s strlen would keep',
			'	// reading here — this error IS the class of bug the sentinel',
			'	// type removes.',
			'	return 0, errors.New("no sentinel")',
			'}',
			'',
			'// ToSentinel is the plain-slice -> [:0] conversion, split into its',
			'// two halves: prove the invariant, then establish it.',
			'func ToSentinel(data []byte) ([]byte, error) {',
			'	// Proof first: an interior 0 would give the result TWO plausible',
			'	// lengths — C would stop at the interior 0, the slice header',
			'	// says otherwise. That ambiguity is a real attack class (NUL',
			'	// injection in filenames and certificate names), so it is an',
			'	// error, not a silent truncation.',
			'	for _, c := range data {',
			'		if c == 0 {',
			'			return nil, errors.New("interior sentinel")',
			'		}',
			'	}',
			'	// A fresh buffer rather than append(data, 0): append may write',
			'	// into data\'s spare capacity and publish the sentinel into a',
			'	// buffer someone else also slices — copying keeps the input',
			'	// untouched, matching how cgo\'s C.CString behaves. make() zeroes',
			'	// the memory, so out[len(data)] is already the sentinel.',
			'	out := make([]byte, len(data)+1)',
			'	copy(out, data)',
			'	return out, nil',
			'}',
			'',
			'// CStrEqual is strcmp()==0: advance while the bytes match; a',
			'// mismatch decides false, a matched 0 decides true. The sentinel',
			'// check runs only after the equality check, so the "one string is',
			'// a prefix of the other" case falls out for free — the shorter',
			'// string\'s 0 meets the longer one\'s next letter, and that pair',
			'// simply fails the equality test.',
			'func CStrEqual(a, b []byte) bool {',
			'	for i := 0; i < len(a) && i < len(b); i++ {',
			'		if a[i] != b[i] {',
			'			return false',
			'		}',
			'		if a[i] == 0 {',
			'			// Both bytes are 0 here (they just compared equal): the',
			'			// strings ended together with no differences. Whatever',
			'			// follows in either buffer is storage, never examined.',
			'			return true',
			'		}',
			'	}',
			'	// Unreachable when both inputs honor the sentinel contract; the',
			'	// bound above is defense in depth against malformed buffers.',
			'	return false',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The most expensive one-byte decision in computing</h3>' +
			'<p>C strings carry their length as a terminator because in 1972, on ' +
			'a PDP-11, one byte of NUL was cheaper than two bytes of length ' +
			'prefix. Dennis Ritchie later called the choice between the two ' +
			'approaches one of the language\'s fateful forks. The costs arrived ' +
			'on schedule: <code>strlen</code> is O(n) <em>because the length ' +
			'lives at the end</em>, so naive loops like <code>for (i = 0; i &lt; ' +
			'strlen(s); i++)</code> go quadratic; a missing terminator turns a ' +
			'read into a buffer overrun (gets(), the Morris worm); and NUL ' +
			'injection — the interior-sentinel case your <code>ToSentinel</code> ' +
			'rejects — let attackers present certificates for ' +
			'<code>paypal.com\\0.evil.com</code> that C code read as ' +
			'<code>paypal.com</code>. Go and Zig both answered with ptr+len ' +
			'slices, where length is data, not a treasure hunt.</p>' +
			'<h3>What the sentinel type actually buys</h3>' +
			'<p>Zig cannot abolish C strings — its whole pitch includes ' +
			'first-class C interop — so it did the next best thing: it made the ' +
			'convention checkable. <code>[:0]u8</code> versus <code>[]u8</code> ' +
			'is the difference between "there is a 0 at data[len], the compiler ' +
			'tracked it" and "who knows". A function taking ' +
			'<code>[*:0]const u8</code> simply cannot be handed an unterminated ' +
			'buffer by accident; the error moves from a runtime overrun in ' +
			'production to a type mismatch at compile time. The conversions you ' +
			'implemented are the only three doors between the worlds: scan and ' +
			'trust the result (<code>SpanLen</code>), copy and establish the ' +
			'invariant (<code>ToSentinel</code> — exactly what cgo\'s ' +
			'<code>C.CString</code> does, allocation and all), or stay inside ' +
			'the sentinel world and compare carefully (<code>CStrEqual</code>).</p>' +
			'<h3>Sentinels beyond strings</h3>' +
			'<p>The <code>:0</code> syntax generalizes: Zig lets you write ' +
			'<code>[:null]?*Node</code> for a null-terminated pointer array — ' +
			'which is precisely the shape of C\'s <code>argv</code> and ' +
			'<code>envp</code> — or any other sentinel value your format ends ' +
			'with. The deeper lesson transfers to Go directly: when a protocol ' +
			'or FFI boundary encodes length implicitly (terminators, ' +
			'delimiters, magic trailers), write the validating conversion ' +
			'<em>once</em>, at the boundary, and let everything inside operate ' +
			'on honest ptr+len values. Every place a Go codebase calls ' +
			'<code>bytes.IndexByte(buf, 0)</code> before handing data to a ' +
			'syscall — path arguments being the classic ' +
			'(<code>syscall.BytePtrFromString</code> returns EINVAL on interior ' +
			'NULs) — is this problem, deployed.</p>',
		],
		complexity: { time: 'O(n) — each function is a single bounded scan', space: 'O(n) for ToSentinel\'s fresh buffer; O(1) otherwise' },
	});
})();
