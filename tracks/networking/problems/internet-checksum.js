/* Internet Checksum — IP: Delivery (Medium). RFC 1071 ones\'-complement
 * checksum: the 16 bits that guard every IPv4 header, ICMP message, UDP and
 * TCP segment. The harness pins the RFC\'s own worked example (whose running
 * sum already overflows 16 bits, forcing the end-around carry), the odd-length
 * padding rule, and the Verify property — a correctly checksummed header sums
 * to 0xffff, and one flipped byte breaks it.
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// The end-around carry: bits that overflow the low 16 are not discarded —
	// they wrap around and are added back in. Marker id namespaced
	// (dgArrowNCK) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 190" width="520" height="190" role="img" aria-label="ones-complement addition: carries out of the low 16 bits wrap around and are added back in; the final sum is inverted">' +
		'<text x="20" y="24" class="lbl">ones’-complement sum: carries never fall off the end — they wrap around</text>' +
		// the high half: overflow carries
		'<rect x="40" y="44" width="170" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="125" y="71" text-anchor="middle">sum &gt;&gt; 16</text>' +
		'<text x="125" y="104" text-anchor="middle" class="lbl">carries that overflowed</text>' +
		// the low half: the 16 bits that survive
		'<rect x="300" y="44" width="180" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="390" y="71" text-anchor="middle">sum &amp; 0xffff</text>' +
		'<text x="390" y="104" text-anchor="middle" class="lbl">the 16 bits kept</text>' +
		// the wrap-around
		'<path d="M 125 116 C 125 158 390 158 390 96" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowNCK)"/>' +
		'<text x="258" y="152" text-anchor="middle" class="lbl" style="fill:var(--warn)">end-around carry: added back into the low half</text>' +
		'<text x="20" y="182" class="lbl">repeat until sum &gt;&gt; 16 == 0, then checksum = ^sum — and a correct packet re-sums to 0xffff</text>' +
		'<defs><marker id="dgArrowNCK" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'internet-checksum',
		title: 'The Internet Checksum (RFC 1071)',
		nav: 'internet checksum',
		difficulty: 'Medium',
		category: 'IP: Delivery',
		task: 'Implement Checksum (16-bit ones\'-complement sum, end-around carry, inverted) and Verify (a correct packet re-sums to 0xffff).',

		prose: [
			'<h2>The Internet Checksum (RFC 1071)</h2>' +
			'<p>A service starts throwing sporadic <code>connection reset</code>s, and ' +
			'<code>ethtool -S</code> on the host shows <code>rx_csum_err</code> ' +
			'climbing: somewhere between the peer and you, bits are flipping, and a ' +
			'16-bit field from 1981 is the only thing catching them. The same field ' +
			'explains why <code>tcpdump</code> on your own machine shows outgoing ' +
			'packets with “incorrect” checksums (the NIC fills them in later — ' +
			'checksum offload) and why a router can decrement TTL without recomputing ' +
			'anything. IPv4 headers, ICMP, UDP, and TCP all carry the same checksum, ' +
			'defined once in RFC&nbsp;1071:</p>' +
			'<ul>' +
			'<li><strong>Sum 16-bit words.</strong> Walk the data two bytes at a ' +
			'time, big-endian: <code>word = data[i]&lt;&lt;8 | data[i+1]</code>. ' +
			'Accumulate into something wider than 16 bits (a <code>uint32</code>).</li>' +
			'<li><strong>Odd length:</strong> the dangling last byte is treated as a ' +
			'word padded with a zero <em>low</em> byte — the byte you have is the ' +
			'<strong>high</strong> half: <code>data[n-1]&lt;&lt;8</code>.</li>' +
			'<li><strong>End-around carry.</strong> Ones’-complement arithmetic ' +
			'doesn’t discard overflow — a carry out of bit 15 wraps around and is ' +
			'added back at bit 0: <code>for sum&gt;&gt;16 != 0 { sum = sum&amp;0xffff + ' +
			'sum&gt;&gt;16 }</code>. (The fold itself can carry, hence the loop.)</li>' +
			'<li><strong>Invert:</strong> the transmitted checksum is ' +
			'<code>^sum</code>. That choice makes verification beautiful: sum the ' +
			'received bytes <em>with the checksum field in place</em>, and data + ' +
			'complement-of-data folds to all ones — <code>0xffff</code> — exactly ' +
			'when nothing changed in flight.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Checksum(data)</code> — the value a sender writes ' +
			'into the (zeroed) checksum field — and <code>Verify(data)</code>, the ' +
			'receiver’s check over the packet with the checksum already in place. ' +
			'Both are the same fold; only the final test differs.</p>',
			{ lang: 'txt', code: 'RFC 1071 example: 00 01 | f2 03 | f4 f5 | f6 f7\nsum   = 0x0001 + 0xf203 + 0xf4f5 + 0xf6f7 = 0x2ddf0   (overflows 16 bits)\nfold  = 0xddf0 + 0x2                      = 0xddf2   (end-around carry)\ncksum = ^0xddf2                           = 0x220d' },
			'<div class="tip">Note what the fold does <em>not</em> depend on: byte ' +
			'order. Summing the same bytes as little-endian words gives the ' +
			'byte-swapped result, so machines of either endianness can compute in ' +
			'native order and swap once at the end — a 1980s performance trick ' +
			'that is the reason ones’-complement was chosen at all.</div>',
		],

		starter: [
			'package main',
			'',
			'// Checksum computes the RFC 1071 Internet checksum over data: the',
			'// 16-bit ones\'-complement of the ones\'-complement sum of the data',
			'// taken as big-endian 16-bit words. This is the value a sender writes',
			'// into the packet\'s (zeroed) checksum field.',
			'//',
			'//   - words are data[i]<<8 | data[i+1]',
			'//   - an odd trailing byte is the HIGH half of a zero-padded word',
			'//   - carries out of bit 15 wrap around: sum = sum&0xffff + sum>>16',
			'//   - the result is ^sum, truncated to 16 bits',
			'func Checksum(data []byte) uint16 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Verify checks a received packet whose checksum field is already in',
			'// place: the same folded sum over ALL the bytes — data plus embedded',
			'// checksum — must come out 0xffff (all ones) iff nothing was corrupted.',
			'func Verify(data []byte) bool {',
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
			'	// A real-shaped 20-byte IPv4 header (TTL 64, proto TCP,',
			'	// 172.16.10.99 -> 172.16.10.12) with its checksum field — bytes',
			'	// 10 and 11 — zeroed, the state a sender computes over.',
			'	hdr := []byte{',
			'		0x45, 0x00, 0x00, 0x3c,',
			'		0x1c, 0x46, 0x40, 0x00,',
			'		0x40, 0x06, 0x00, 0x00,',
			'		0xac, 0x10, 0x0a, 0x63,',
			'		0xac, 0x10, 0x0a, 0x0c,',
			'	}',
			'	// The same header as it appears on the wire: checksum spliced in.',
			'	wire := append([]byte(nil), hdr...)',
			'	wire[10], wire[11] = 0xb1, 0xe6',
			'	// One flipped byte (TTL 0x40 -> 0x41): checksum now stale.',
			'	flipped := append([]byte(nil), wire...)',
			'	flipped[8] = 0x41',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	hx := func(v uint16) string { return fmt.Sprintf("0x%04x", v) }',
			'	cases := []tc{',
			'		{"RFC 1071 worked example — its running sum overflows 16 bits, forcing the fold",',
			'			"0x220d",',
			'			func() string { return hx(Checksum([]byte{0x00, 0x01, 0xf2, 0x03, 0xf4, 0xf5, 0xf6, 0xf7})) }},',
			'		{"odd length: the dangling byte is the HIGH half of a zero-padded word",',
			'			"0xfbfd",',
			'			func() string { return hx(Checksum([]byte{0x01, 0x02, 0x03})) }},',
			'		{"all-zero data: sum 0 complements to 0xffff",',
			'			"0xffff",',
			'			func() string { return hx(Checksum(make([]byte, 8))) }},',
			'		{"end-around carry: 0xffff + 0xffff must wrap back in, not fall off the end",',
			'			"0x0000",',
			'			func() string { return hx(Checksum([]byte{0xff, 0xff, 0xff, 0xff})) }},',
			'		{"IPv4 header with a zeroed checksum field: the value the sender writes",',
			'			"0xb1e6",',
			'			func() string { return hx(Checksum(append([]byte(nil), hdr...))) }},',
			'		{"Verify: header with its checksum in place re-sums to all ones",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", Verify(append([]byte(nil), wire...))) }},',
			'		{"Verify: one flipped byte (TTL 0x40 -> 0x41) breaks the property",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", Verify(append([]byte(nil), flipped...))) }},',
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
			'// onesSum is the shared core: the ones\'-complement sum of data as',
			'// big-endian 16-bit words, folded back into 16 bits. Checksum and',
			'// Verify are the same fold with different final steps, so the fold',
			'// lives in one place — exactly how kernel implementations factor it.',
			'func onesSum(data []byte) uint32 {',
			'	var sum uint32',
			'	// i+1 < len guards the pair read; a uint32 accumulator has 16 bits',
			'	// of headroom, so carries pile up harmlessly until the fold. (The',
			'	// biggest IP packet is 65535 bytes ≈ 32768 words of 0xffff — still',
			'	// far below 2^32.)',
			'	for i := 0; i+1 < len(data); i += 2 {',
			'		sum += uint32(data[i])<<8 | uint32(data[i+1])',
			'	}',
			'	// Odd length: RFC 1071 pads with a zero LOW byte, so the dangling',
			'	// byte sits in the high half — as if the packet had one more zero',
			'	// byte on the wire. Padding the other way is the classic bug: it',
			'	// verifies against itself and fails against every real peer.',
			'	if len(data)%2 == 1 {',
			'		sum += uint32(data[len(data)-1]) << 8',
			'	}',
			'	// End-around carry: ones\'-complement addition wraps overflow back',
			'	// to bit 0 instead of discarding it. A loop, not a single fold —',
			'	// adding the carries back can itself carry (0xffff + 0xffff =',
			'	// 0x1fffe -> 0xfffe + 1). Two passes always suffice, but the loop',
			'	// states the invariant: fold until the high half is empty.',
			'	for sum>>16 != 0 {',
			'		sum = sum&0xffff + sum>>16',
			'	}',
			'	return sum',
			'}',
			'',
			'// Checksum is what the sender transmits: the COMPLEMENT of the folded',
			'// sum. Sending the complement is the design trick — it lets the',
			'// receiver verify by summing everything, checksum included, and',
			'// comparing against a constant instead of splicing the field out.',
			'func Checksum(data []byte) uint16 {',
			'	return ^uint16(onesSum(data))',
			'}',
			'',
			'// Verify exploits that trick: sum(data) + ^sum(data) is all ones in',
			'// ones\'-complement arithmetic, so an intact packet — checksum field',
			'// in place — always folds to 0xffff. Any single flipped bit moves',
			'// the sum away from all ones.',
			'func Verify(data []byte) bool {',
			'	return onesSum(data) == 0xffff',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why ones’-complement, of all things</h3>' +
			'<p>By 1981 CRCs were well known and stronger. RFC 1071’s arithmetic won ' +
			'because it has algebraic properties a CRC lacks, and the internet’s ' +
			'architecture leans on all of them:</p>' +
			'<ul>' +
			'<li><strong>Endian independence.</strong> Sum the same bytes as ' +
			'little-endian words and you get the byte-swapped result — so a VAX and ' +
			'a 68000 could both add in native order and swap once at the end. ' +
			'Addition also associates and commutes, so implementations can sum 32 ' +
			'or 64 bits at a time and fold once; that is exactly what ' +
			'kernel <code>csum_partial</code> routines do.</li>' +
			'<li><strong>Incremental update (RFC 1141).</strong> Because the ' +
			'checksum is a sum, changing one 16-bit word doesn’t require ' +
			'recomputing: <code>new = old − change</code>, in ones’-complement. ' +
			'Every router decrements TTL on every packet it forwards — and ' +
			'<em>patches</em> the header checksum with the constant difference ' +
			'instead of re-summing 20 bytes. NAT does the same when it rewrites ' +
			'addresses and ports, fixing up the TCP/UDP checksum by the delta. The ' +
			'internet forwards at line rate partly because of this property.</li>' +
			'<li><strong>Verification against a constant.</strong> Transmitting the ' +
			'<em>complement</em> means the receiver never isolates the checksum ' +
			'field: sum the whole packet as-is and expect <code>0xffff</code>. One ' +
			'code path, no offsets that differ per protocol.</li>' +
			'</ul>' +
			'<h3>And why it’s weak</h3>' +
			'<p>Addition commutes — that was the point — so <strong>reordered words ' +
			'produce the same sum</strong>: swap two 16-bit words anywhere in the ' +
			'packet and the checksum is none the wiser. Offsetting errors cancel ' +
			'too (<code>+1</code> here, <code>−1</code> there). A CRC catches both; ' +
			'this is why Ethernet wraps every frame in a CRC32 and why the ' +
			'checksum survives mainly as a cheap end-to-end sanity check — famously ' +
			'cheap enough that a 2000 study (Stone &amp; Partridge) found real ' +
			'corrupted-but-checksum-valid TCP segments in the wild, and why ' +
			'checksum-exempt paths (some tunnel encapsulations, ' +
			'<code>UDP-Lite</code>) make people nervous.</p>' +
			'<h3>When debugging</h3>' +
			'<p>Two field notes. First: <code>tcpdump</code> showing ' +
			'<code>cksum incorrect</code> on every <em>outgoing</em> packet is ' +
			'almost never corruption — with checksum offload the kernel hands the ' +
			'NIC an unfinished header and the capture happens before the hardware ' +
			'fills it in (<code>ethtool -K eth0 tx off</code> to prove it). Second: ' +
			'the fold you implemented is the one in <code>ip_fast_csum</code> in ' +
			'the Linux kernel; when <code>netstat -s</code> shows ' +
			'<code>InCsumErrors</code> climbing, some device between the peer and ' +
			'you is flipping bits and this 16-bit sum is what noticed.</p>',
		],
		complexity: { time: 'O(n) — one pass over the bytes, plus a constant-bounded fold', space: 'O(1)' },
	});
})();
