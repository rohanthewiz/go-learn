/* UDP Header — UDP (Easy). The entire UDP protocol is an 8-byte header:
 * src port, dst port, length, checksum. Encode/Decode it and you have
 * implemented UDP. The harness pins big-endian byte order on the wire and
 * the fact that trips real parsers: Length counts HEADER + PAYLOAD, so its
 * minimum legal value is 8, never 0.
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// The whole protocol in one row: four 16-bit fields, then payload.
	// Marker id namespaced (dgArrowNUH) — SVG ids share the page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 176" width="560" height="176" role="img" aria-label="UDP header layout: SrcPort, DstPort, Length, Checksum — two bytes each, big-endian — followed by the payload; Length spans header plus payload">' +
		'<text x="20" y="18" class="lbl">the entire UDP protocol: 8 bytes, then your data</text>' +
		'<rect x="40" y="30" width="110" height="38" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="95" y="54" text-anchor="middle">SrcPort</text>' +
		'<rect x="150" y="30" width="110" height="38" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="205" y="54" text-anchor="middle">DstPort</text>' +
		'<rect x="260" y="30" width="110" height="38" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="315" y="54" text-anchor="middle">Length</text>' +
		'<rect x="370" y="30" width="110" height="38" rx="4" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="425" y="54" text-anchor="middle">Checksum</text>' +
		'<rect x="480" y="30" width="60" height="38" rx="4" fill="none" stroke="var(--edge)" stroke-dasharray="5 4"/>' +
		'<text x="510" y="54" text-anchor="middle" class="lbl">payload…</text>' +
		'<text x="95" y="86" text-anchor="middle" class="lbl">bytes 0–1</text>' +
		'<text x="205" y="86" text-anchor="middle" class="lbl">2–3</text>' +
		'<text x="315" y="86" text-anchor="middle" class="lbl">4–5</text>' +
		'<text x="425" y="86" text-anchor="middle" class="lbl">6–7</text>' +
		'<text x="95" y="104" text-anchor="middle" class="lbl">0x1F90 → 1F 90 (big-endian)</text>' +
		// the Length span: header AND payload
		'<text x="290" y="124" text-anchor="middle" class="lbl" style="fill:var(--warn)">Length = header (8) + payload — minimum 8, never 0</text>' +
		'<path d="M 290 136 L 44 136" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowNUH)"/>' +
		'<path d="M 290 136 L 536 136" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowNUH)"/>' +
		'<text x="290" y="164" text-anchor="middle" class="lbl">checksum is optional in IPv4 (0 = not computed) — mandatory in IPv6</text>' +
		'<defs>' +
		'<marker id="dgArrowNUH" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'udp-header',
		title: 'The UDP Header: 8 Bytes, the Whole Protocol',
		nav: 'UDP header',
		difficulty: 'Easy',
		category: 'UDP',
		task: 'Implement Encode and Decode for the 8-byte UDP header — big-endian fields, Length counts header + payload, all 6 tests.',

		prose: [
			'<h2>The UDP Header: 8 Bytes, the Whole Protocol</h2>' +
			'<p>Run <code>tcpdump -X</code> on a DNS lookup and count the bytes between ' +
			'the IP header and the query: eight. That is not a summary of UDP — that ' +
			'<em>is</em> UDP. Four 16-bit fields: source port, destination port, length, ' +
			'checksum. No sequence numbers, no ACKs, no connection state, no handshake. ' +
			'RFC 768 fits on three pages, and if you implement this header you have ' +
			'implemented the protocol.</p>' +
			DIAGRAM +
			'<p>Two conventions do all the work:</p>' +
			'<ul>' +
			'<li><strong>Network byte order is big-endian.</strong> Every field goes on ' +
			'the wire most-significant byte first: port 8080 (<code>0x1F90</code>) is ' +
			'the bytes <code>1F 90</code>, in that order, regardless of the CPU on ' +
			'either end. Byte <code>i</code> is <code>field &gt;&gt; 8</code>, byte ' +
			'<code>i+1</code> is <code>field &amp; 0xff</code>.</li>' +
			'<li><strong>Length counts the header too.</strong> It is the size of the ' +
			'whole datagram — 8 header bytes <em>plus</em> payload — so an empty ' +
			'datagram has Length 8, never 0. Treating it as a payload length is a ' +
			'classic parser bug that shifts every read by eight bytes.</li>' +
			'</ul>' +
			'<h3>Your job</h3>' +
			'<p>Implement both directions. <code>Encode(h, payload)</code> returns ' +
			'<code>8+len(payload)</code> bytes: the four fields big-endian, then the ' +
			'payload verbatim. <code>Decode(b)</code> reverses it, with two guards: ' +
			'fewer than 8 bytes is <code>"short datagram"</code> (there isn’t even a ' +
			'whole header to read), and a Length field that disagrees with ' +
			'<code>len(b)</code> is <code>"length mismatch"</code> (the datagram was ' +
			'truncated in flight, or the sender lied).</p>',
			{ code: 'h := UDPHeader{SrcPort: 8080, DstPort: 53, Length: 17, Checksum: 0xBEEF}\nwire := Encode(h, []byte("hello DNS"))\n// wire: 1F 90 | 00 35 | 00 11 | BE EF | 68 65 6C 6C 6F 20 44 4E 53\n//       src    dst     len=17  sum     "hello DNS"\nh2, payload, err := Decode(wire)   // round-trips exactly', lang: 'txt' },
			'<div class="tip">Encode writes <code>h.Length</code> exactly as given — it ' +
			'is the caller’s job to set it to <code>8 + len(payload)</code>. Real ' +
			'stacks compute it at send time; keeping Encode dumb lets the tests hand ' +
			'you deliberately lying headers.</div>',
		],

		starter: [
			'package main',
			'',
			'// UDPHeader is the ENTIRE UDP protocol: four 16-bit fields, 8 bytes.',
			'//   Length   — size of the whole datagram: header (8) + payload.',
			'//              Minimum legal value is therefore 8, never 0.',
			'//   Checksum — optional in IPv4 (0 means "not computed"); carried',
			'//              verbatim here, not validated.',
			'type UDPHeader struct {',
			'	SrcPort  uint16',
			'	DstPort  uint16',
			'	Length   uint16',
			'	Checksum uint16',
			'}',
			'',
			'// Encode serializes header + payload into one datagram: 8 header bytes',
			'// followed by the payload. Every field is big-endian ("network byte',
			'// order"): byte i is the high half (field >> 8), byte i+1 the low',
			'// (field & 0xff). Length is written exactly as given.',
			'func Encode(h UDPHeader, payload []byte) []byte {',
			'	// TODO: build the 8+len(payload) byte datagram.',
			'	return nil',
			'}',
			'',
			'// Decode parses a datagram back into header + payload. Errors:',
			'//   len(b) < 8              → errors.New("short datagram")',
			'//   int(h.Length) != len(b) → errors.New("length mismatch")',
			'// (import "errors" when you implement this)',
			'func Decode(b []byte) (UDPHeader, []byte, error) {',
			'	// TODO: read the four fields, validate, return header + payload.',
			'	return UDPHeader{}, nil, nil',
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
			'// describe renders a Decode result one way for comparison.',
			'func describe(h UDPHeader, payload []byte, err error) string {',
			'	if err != nil {',
			'		return "error: " + err.Error()',
			'	}',
			'	return fmt.Sprintf("src=%d dst=%d len=%d sum=%d payload=%q",',
			'		h.SrcPort, h.DstPort, h.Length, h.Checksum, string(payload))',
			'}',
			'',
			'func main() {',
	'	results := make([]map[string]any, 0, 6)',
			'',
			'	want := `src=8080 dst=53 len=17 sum=48879 payload="hello DNS"`',
			'	r := map[string]any{',
			'		"input": "round-trip: Encode then Decode preserves every field and the payload",',
			'		"want":  want,',
			'	}',
			'	runCase(r, func() {',
			'		wire := Encode(UDPHeader{SrcPort: 8080, DstPort: 53, Length: 17, Checksum: 0xBEEF}, []byte("hello DNS"))',
			'		h, p, err := Decode(wire)',
			'		got := describe(h, p, err)',
			'		r["pass"] = got == want',
			'		r["got"] = got',
			'	})',
			'	results = append(results, r)',
			'',
			'	want = "wire[0..1]=0x1f 0x90 (13 bytes total)"',
			'	r = map[string]any{',
			'		"input": "big-endian on the wire: port 0x1F90 (8080) is bytes 1F then 90",',
			'		"want":  want,',
			'	}',
			'	runCase(r, func() {',
			'		wire := Encode(UDPHeader{SrcPort: 0x1F90, DstPort: 9, Length: 13, Checksum: 0}, []byte("hello"))',
			'		got := fmt.Sprintf("wire[0..1]=%#02x %#02x (%d bytes total)", wire[0], wire[1], len(wire))',
			'		r["pass"] = got == want',
			'		r["got"] = got',
			'	})',
			'	results = append(results, r)',
			'',
			'	want = `src=68 dst=67 len=8 sum=0 payload=""`',
			'	r = map[string]any{',
			'		"input": "empty payload: Length counts the header, so the minimum is 8, not 0",',
			'		"want":  want,',
			'	}',
			'	runCase(r, func() {',
			'		wire := Encode(UDPHeader{SrcPort: 68, DstPort: 67, Length: 8, Checksum: 0}, nil)',
			'		if len(wire) != 8 {',
			'			r["pass"] = false',
			'			r["got"] = fmt.Sprintf("Encode produced %d bytes, want 8", len(wire))',
			'			return',
			'		}',
			'		h, p, err := Decode(wire)',
			'		got := describe(h, p, err)',
			'		r["pass"] = got == want',
			'		r["got"] = got',
			'	})',
			'	results = append(results, r)',
			'',
			'	want = "error: short datagram"',
			'	r = map[string]any{',
			'		"input": "short buffer: 3 bytes cannot even hold a header",',
			'		"want":  want,',
			'	}',
			'	runCase(r, func() {',
			'		h, p, err := Decode([]byte{0x00, 0x35, 0x00})',
			'		got := describe(h, p, err)',
			'		r["pass"] = got == want',
			'		r["got"] = got',
			'	})',
			'	results = append(results, r)',
			'',
			'	want = "error: length mismatch"',
			'	r = map[string]any{',
			'		"input": "length mismatch: header claims 20 bytes but only 12 arrived (truncated)",',
			'		"want":  want,',
			'	}',
			'	runCase(r, func() {',
			'		// Hand-built so this case never depends on the user\'s Encode:',
			'		// src 53, dst 12345, Length says 0x0014 = 20 — but len(b) is 12.',
			'		wire := []byte{0x00, 0x35, 0x30, 0x39, 0x00, 0x14, 0x00, 0x00, \'a\', \'b\', \'c\', \'d\'}',
			'		h, p, err := Decode(wire)',
			'		got := describe(h, p, err)',
			'		r["pass"] = got == want',
			'		r["got"] = got',
			'	})',
			'	results = append(results, r)',
			'',
			'	want = `src=53 dst=1024 len=12 sum=6699 payload="dns!"`',
			'	r = map[string]any{',
			'		"input": "decode a hand-built datagram: src 53, dst 1024, len 12, sum 0x1A2B",',
			'		"want":  want,',
			'	}',
			'	runCase(r, func() {',
			'		wire := []byte{0x00, 0x35, 0x04, 0x00, 0x00, 0x0c, 0x1a, 0x2b, \'d\', \'n\', \'s\', \'!\'}',
			'		h, p, err := Decode(wire)',
			'		got := describe(h, p, err)',
			'		r["pass"] = got == want',
			'		r["got"] = got',
			'	})',
			'	results = append(results, r)',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'import "errors"',
			'',
			'// UDPHeader is the ENTIRE UDP protocol: four 16-bit fields, 8 bytes.',
			'//   Length   — size of the whole datagram: header (8) + payload.',
			'//              Minimum legal value is therefore 8, never 0.',
			'//   Checksum — optional in IPv4 (0 means "not computed"); carried',
			'//              verbatim here, not validated.',
			'type UDPHeader struct {',
			'	SrcPort  uint16',
			'	DstPort  uint16',
			'	Length   uint16',
			'	Checksum uint16',
			'}',
			'',
			'// put16 writes v big-endian at b[i:i+2]. Network byte order is',
			'// big-endian by decades-old convention: the most significant byte',
			'// travels first, so a human reading a packet capture left to right',
			'// reads the number as written. Two shifts are the whole trick —',
			'// encoding/binary would wrap exactly these lines.',
			'func put16(b []byte, i int, v uint16) {',
			'	b[i] = byte(v >> 8)',
			'	b[i+1] = byte(v)',
			'}',
			'',
			'// get16 reads a big-endian uint16 from b[i:i+2].',
			'func get16(b []byte, i int) uint16 {',
			'	return uint16(b[i])<<8 | uint16(b[i+1])',
			'}',
			'',
			'// Encode serializes header + payload into one datagram. Length is',
			'// written exactly as given: real stacks compute it at send time, but',
			'// keeping the encoder dumb means a lying header can be constructed —',
			'// which is exactly what Decode\'s validation exists to catch.',
			'func Encode(h UDPHeader, payload []byte) []byte {',
			'	b := make([]byte, 8+len(payload))',
			'	put16(b, 0, h.SrcPort)',
			'	put16(b, 2, h.DstPort)',
			'	put16(b, 4, h.Length)',
			'	put16(b, 6, h.Checksum)',
			'	copy(b[8:], payload)',
			'	return b',
			'}',
			'',
			'// Decode parses a datagram back into header + payload.',
			'func Decode(b []byte) (UDPHeader, []byte, error) {',
			'	// Guard the reads first: 8 bytes is the smallest possible datagram',
			'	// (empty payload); anything shorter cannot even contain a header.',
			'	if len(b) < 8 {',
			'		return UDPHeader{}, nil, errors.New("short datagram")',
			'	}',
			'	h := UDPHeader{',
			'		SrcPort:  get16(b, 0),',
			'		DstPort:  get16(b, 2),',
			'		Length:   get16(b, 4),',
			'		Checksum: get16(b, 6),',
			'	}',
			'	// The Length field must agree with what actually arrived. A',
			'	// mismatch means truncation in transit or a corrupt/lying header —',
			'	// either way the payload boundary is untrustworthy, so the only',
			'	// safe move is to drop the datagram (which is what kernels do).',
			'	if int(h.Length) != len(b) {',
			'		return UDPHeader{}, nil, errors.New("length mismatch")',
			'	}',
			'	// The payload is everything after the fixed header. Returning the',
			'	// sub-slice (no copy) mirrors how kernels hand payloads up: the',
			'	// header is peeled off, the bytes are never touched.',
			'	return h, b[8:], nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Ports, a length, a checksum — and nothing else</h3>' +
			'<p>UDP adds exactly one idea to raw IP: <strong>ports</strong>, so a ' +
			'datagram can be delivered to a process instead of just a machine. The ' +
			'length makes the datagram self-delimiting; the checksum (optional in IPv4, ' +
			'mandatory in IPv6) catches corruption. That is the complete feature list. ' +
			'No ordering, no retransmission, no connection, no congestion control — if ' +
			'a datagram is lost, reordered, or duplicated, that is now <em>your</em> ' +
			'problem, which is precisely why UDP’s header is 8 bytes while TCP’s starts ' +
			'at 20 and grows options from there.</p>' +
			'<p>The core of both directions is two lines of shifting:</p>',
			{ code: 'b[i] = byte(v >> 8)   // high byte first — "network byte order"\nb[i+1] = byte(v)      // then the low byte\n\nv := uint16(b[i])<<8 | uint16(b[i+1]) // and back' },
			'<h3>Who builds on this, and why</h3>' +
			'<p>Being featureless is the feature. <strong>DNS</strong> wants one ' +
			'request/one reply with no handshake tax — a TCP setup would triple the ' +
			'latency of every lookup. <strong>Games and voice</strong> prefer losing a ' +
			'stale position update to stalling behind its retransmission (TCP’s ' +
			'head-of-line blocking). <strong>QUIC</strong> — the transport under ' +
			'HTTP/3 — runs over UDP not because reliability is unwanted but because it ' +
			'reimplements reliability <em>in userspace</em>, where it can evolve without ' +
			'waiting for every kernel and middlebox on Earth to upgrade. The 8-byte ' +
			'header is the escape hatch from transport-protocol ossification.</p>' +
			'<h3>When debugging</h3>' +
			'<p>The two Decode errors you implemented are real drop reasons: a ' +
			'<code>length mismatch</code> datagram is silently discarded by the kernel ' +
			'(watch <code>InErrors</code> in <code>netstat -su</code> climb), and ' +
			'nothing tells the sender. Also remember what Length’s 16 bits imply: ' +
			'~65507 bytes of payload max (65535 minus IP and UDP headers) — a big DNS ' +
			'response over UDP either truncates (the <code>TC</code> bit) or the client ' +
			'retries over TCP. And because UDP never acknowledges, a “successful” ' +
			'<code>WriteToUDP</code> in Go tells you only that the datagram left the ' +
			'socket — delivery is a rumor.</p>',
		],
		complexity: { time: 'O(n) — one pass to copy the payload', space: 'O(n) for the encoded buffer' },
	});
})();
