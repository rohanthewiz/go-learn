/* IP Fragmentation — IP: Delivery (Medium). The router's slicing procedure
 * as a pure function: one datagram vs. a smaller MTU becomes N fragments
 * whose offsets count 8-byte units, MF set on all but the last — or, with
 * DF set, the drop + ICMP that Path MTU Discovery is built on. The harness
 * pins the canonical 3980-over-1500 example, the round-down-to-8 trap, and
 * conservation (fragment payloads must tile the original exactly).
 */
(function () {
	'use strict';
	var T = GoLearnNet;

	// One large datagram sliced into three fragments: each fragment repeats
	// the 20-byte header, offsets are 8-byte units of the ORIGINAL payload.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 224" width="560" height="224" role="img" aria-label="a 4000-byte datagram fragmented for a 1500-byte MTU: three fragments with offsets 0, 185, 370 (8-byte units); MF set on all but the last">' +
		'<text x="20" y="18" class="lbl">one 4000-byte datagram (20B header + 3980B payload) meets a 1500-byte link</text>' +
		// original datagram: header slice + payload
		'<rect x="40" y="30" width="22" height="36" rx="3" fill="var(--accent)" fill-opacity="0.5" stroke="var(--accent)"/>' +
		'<rect x="62" y="30" width="458" height="36" rx="3" fill="var(--edge)" fill-opacity="0.25" stroke="var(--edge)"/>' +
		'<text x="291" y="53" text-anchor="middle" class="lbl">3980B payload</text>' +
		'<text x="51" y="79" text-anchor="middle" class="lbl">hdr</text>' +
		// slice arrows
		'<path d="M 160 70 C 150 92 125 96 112 112" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowNFR)"/>' +
		'<path d="M 291 70 C 291 88 296 96 298 112" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowNFR)"/>' +
		'<path d="M 420 70 C 432 92 456 96 468 112" fill="none" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowNFR)"/>' +
		// fragment 1
		'<rect x="20" y="116" width="22" height="36" rx="3" fill="var(--accent)" fill-opacity="0.5" stroke="var(--accent)"/>' +
		'<rect x="42" y="116" width="156" height="36" rx="3" fill="var(--edge)" fill-opacity="0.25" stroke="var(--edge)"/>' +
		'<text x="120" y="139" text-anchor="middle" class="lbl">1480B</text>' +
		// fragment 2
		'<rect x="210" y="116" width="22" height="36" rx="3" fill="var(--accent)" fill-opacity="0.5" stroke="var(--accent)"/>' +
		'<rect x="232" y="116" width="156" height="36" rx="3" fill="var(--edge)" fill-opacity="0.25" stroke="var(--edge)"/>' +
		'<text x="310" y="139" text-anchor="middle" class="lbl">1480B</text>' +
		// fragment 3
		'<rect x="400" y="116" width="22" height="36" rx="3" fill="var(--accent)" fill-opacity="0.5" stroke="var(--accent)"/>' +
		'<rect x="422" y="116" width="118" height="36" rx="3" fill="var(--edge)" fill-opacity="0.25" stroke="var(--edge)"/>' +
		'<text x="481" y="139" text-anchor="middle" class="lbl">1020B</text>' +
		// offset + MF labels, warn while more fragments follow, ok on the last
		'<text x="109" y="172" text-anchor="middle" class="lbl" style="fill:var(--warn)">off=0 · MF=1</text>' +
		'<text x="299" y="172" text-anchor="middle" class="lbl" style="fill:var(--warn)">off=185 · MF=1</text>' +
		'<text x="470" y="172" text-anchor="middle" class="lbl" style="fill:var(--ok)">off=370 · MF=0</text>' +
		'<text x="109" y="188" text-anchor="middle" class="lbl">= payload byte 0</text>' +
		'<text x="299" y="188" text-anchor="middle" class="lbl">= byte 1480 (185×8)</text>' +
		'<text x="470" y="188" text-anchor="middle" class="lbl">= byte 2960 (370×8)</text>' +
		'<text x="20" y="212" class="lbl">offsets count 8-byte units of the ORIGINAL payload — and every fragment pays the 20-byte header again</text>' +
		'<defs>' +
		'<marker id="dgArrowNFR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'ip-fragmentation',
		title: 'IP Fragmentation: Slicing a Datagram',
		nav: 'IP fragmentation',
		difficulty: 'Medium',
		category: 'IP: Delivery',
		task: 'Implement Fragment — split a payload for an MTU: 8-byte offset units, MF flags, and the DF error, all 6 tests.',

		prose: [
			'<h2>IP Fragmentation: Slicing a Datagram</h2>' +
			'<p>A service behind a VPN starts timing out — but only for <em>large</em> ' +
			'responses. Small API replies arrive instantly; the 4&nbsp;KB ones vanish. ' +
			'<code>ping</code> works, <code>curl</code> hangs forever. The tunnel shaved ' +
			'the path MTU down to 1400 bytes, and somewhere a datagram that no longer ' +
			'fits is being dealt with — either sliced up, or silently dropped. Which of ' +
			'the two happens is decided by one bit in the IP header.</p>' +
			'<p>IP promises to carry datagrams up to 65535 bytes, but every link has an ' +
			'<strong>MTU</strong> — Ethernet’s is 1500. When a datagram is bigger than ' +
			'the next link, a router (or the sender) <strong>fragments</strong> it: the ' +
			'payload is sliced, and each slice is shipped as a complete IP packet with ' +
			'its own copy of the 20-byte header. Three header fields make reassembly ' +
			'possible at the destination:</p>' +
			'<ul>' +
			'<li><strong>Fragment Offset</strong> — where this slice’s payload sits in ' +
			'the original payload, measured in <strong>8-byte units</strong>. The field ' +
			'is only 13 bits wide, yet must address up to 65535 bytes: 2¹³ × 8 = 65536. ' +
			'The price: every fragment except the last must carry a multiple of 8 ' +
			'payload bytes.</li>' +
			'<li><strong>MF (More Fragments)</strong> — set on every fragment except the ' +
			'last, so the receiver knows when the jigsaw is complete.</li>' +
			'<li><strong>DF (Don’t Fragment)</strong> — if set and the datagram doesn’t ' +
			'fit, the router must <em>drop</em> it and send back ICMP ' +
			'“fragmentation needed and DF set”. That error message is not a failure ' +
			'mode — it is the signal <strong>Path MTU Discovery</strong> deliberately ' +
			'provokes to learn how big it may send.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Fragment(payloadLen, mtu, df)</code>. If the payload fits ' +
			'(<code>payloadLen &lt;= mtu - headerLen</code>), return a single ' +
			'<code>Frag{0, payloadLen, false}</code>. Otherwise: with <code>df</code> set, ' +
			'return <code>nil</code> and <code>errors.New("fragmentation needed and DF set")</code>. ' +
			'Without it, every fragment carries <code>(mtu-headerLen)/8*8</code> payload ' +
			'bytes except the last (which takes the remainder); <code>Offset</code> is ' +
			'the bytes already sent divided by 8; <code>MF</code> is true on all but the ' +
			'last fragment.</p>',
			{ code: 'Fragment(3980, 1500, false) →\n  {Offset: 0,   Len: 1480, MF: true}    // payload bytes 0–1479\n  {Offset: 185, Len: 1480, MF: true}    // bytes 1480–2959 (185×8 = 1480)\n  {Offset: 370, Len: 1020, MF: false}   // bytes 2960–3979 — the remainder\n\nFragment(3980, 1500, true) → nil, "fragmentation needed and DF set"', lang: 'txt' },
			'<div class="tip">Round the per-fragment capacity <em>down</em> to a multiple ' +
			'of 8. With <code>mtu=1006</code> there is room for 986 payload bytes, but a ' +
			'986-byte fragment would put the next fragment at byte 986 — not expressible ' +
			'in 8-byte units. Only 984 are usable.</div>',
		],

		starter: [
			'package main',
			'',
			'// headerLen is the size of an IPv4 header without options. Every',
			'// fragment is a complete IP packet, so every fragment pays these 20',
			'// bytes again — fragmentation shrinks the usable payload per packet.',
			'const headerLen = 20',
			'',
			'// Frag describes one fragment of an IP datagram.',
			'//   Offset — position of this fragment\'s payload within the ORIGINAL',
			'//            payload, in 8-BYTE UNITS (the on-wire field is 13 bits;',
			'//            counting units of 8 lets it address all 65535 bytes).',
			'//   Len    — payload bytes carried by this fragment (header excluded).',
			'//   MF     — More Fragments: set on every fragment except the last.',
			'type Frag struct {',
			'	Offset int',
			'	Len    int',
			'	MF     bool',
			'}',
			'',
			'// Fragment splits a payload of payloadLen bytes for a link with the',
			'// given mtu. Rules:',
			'//   1. payloadLen <= mtu-headerLen → one Frag{0, payloadLen, false}.',
			'//   2. otherwise, if df → nil, errors.New("fragmentation needed and DF set")',
			'//      (import "errors" when you implement this).',
			'//   3. otherwise each fragment carries (mtu-headerLen)/8*8 payload bytes',
			'//      — a multiple of 8 — except the last, which takes the remainder.',
			'//      Offset = bytes already sent / 8; MF = true on all but the last.',
			'func Fragment(payloadLen, mtu int, df bool) ([]Frag, error) {',
			'	// TODO: implement the three rules above.',
			'	return nil, nil',
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
			'// describe renders a Fragment result one way for comparison: the',
			'// fragment list as {offset len MF} triples, or the error text.',
			'func describe(frags []Frag, err error) string {',
			'	if err != nil {',
			'		return "error: " + err.Error()',
			'	}',
			'	return fmt.Sprintf("%v", frags)',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name       string',
			'		payloadLen int',
			'		mtu        int',
			'		df         bool',
			'		want       string',
			'	}',
			'	cases := []tc{',
			'		{"canonical: 3980 bytes over MTU 1500 → 1480+1480+1020, offsets 0/185/370",',
			'			3980, 1500, false,',
			'			"[{0 1480 true} {185 1480 true} {370 1020 false}]"},',
			'		{"fits exactly: payload == MTU-20 → one fragment, MF clear, DF harmless",',
			'			1480, 1500, true,',
			'			"[{0 1480 false}]"},',
			'		{"DF set + too big → drop with error (the ICMP that PMTUD listens for)",',
			'			4000, 1500, true,',
			'			"error: fragmentation needed and DF set"},',
			'		{"8-byte rule: MTU 1006 leaves 986 bytes of room but only 984 are usable",',
			'			2000, 1006, false,',
			'			"[{0 984 true} {123 984 true} {246 32 false}]"},',
			'		{"minimum-MTU 68 link: many fragments, offsets accumulate in 8-byte units",',
			'			200, 68, false,',
			'			"[{0 48 true} {6 48 true} {12 48 true} {18 48 true} {24 8 false}]"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases)+1)',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			frags, err := Fragment(c.payloadLen, c.mtu, c.df)',
			'			got := describe(frags, err)',
			'			r["pass"] = got == c.want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	// Conservation: reassembly only works if the fragment payloads tile',
			'	// the original exactly — no gap, no overlap, nothing dropped. This',
			'	// case checks the invariant rather than a literal fragment list.',
			'	r := map[string]any{',
			'		"input": "conservation: 5000 bytes over MTU 576 — fragment Lens sum back to 5000",',
			'		"want":  "frags=10 sum=5000 lastMF=false",',
			'	}',
			'	runCase(r, func() {',
			'		frags, err := Fragment(5000, 576, false)',
			'		if err != nil || len(frags) == 0 {',
			'			r["pass"] = false',
			'			r["got"] = describe(frags, err)',
			'			return',
			'		}',
			'		sum := 0',
			'		for _, f := range frags {',
			'			sum += f.Len',
			'		}',
			'		got := fmt.Sprintf("frags=%d sum=%d lastMF=%v", len(frags), sum, frags[len(frags)-1].MF)',
			'		r["pass"] = got == "frags=10 sum=5000 lastMF=false"',
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
			'// headerLen is the size of an IPv4 header without options. Every',
			'// fragment is a complete IP packet, so every fragment pays these 20',
			'// bytes again — fragmentation shrinks the usable payload per packet.',
			'const headerLen = 20',
			'',
			'// Frag describes one fragment of an IP datagram.',
			'//   Offset — position of this fragment\'s payload within the ORIGINAL',
			'//            payload, in 8-BYTE UNITS (the on-wire field is 13 bits;',
			'//            counting units of 8 lets it address all 65535 bytes).',
			'//   Len    — payload bytes carried by this fragment (header excluded).',
			'//   MF     — More Fragments: set on every fragment except the last.',
			'type Frag struct {',
			'	Offset int',
			'	Len    int',
			'	MF     bool',
			'}',
			'',
			'// Fragment splits a payload of payloadLen bytes for a link with the',
			'// given mtu, mirroring the procedure in RFC 791.',
			'func Fragment(payloadLen, mtu int, df bool) ([]Frag, error) {',
			'	// Fast path: the whole payload fits behind one header. DF is',
			'	// irrelevant here — the flag forbids SPLITTING, not sending.',
			'	if payloadLen <= mtu-headerLen {',
			'		return []Frag{{Offset: 0, Len: payloadLen, MF: false}}, nil',
			'	}',
			'',
			'	// DF set and the datagram does not fit: the router MUST drop it',
			'	// and answer with ICMP "fragmentation needed and DF set". Path MTU',
			'	// Discovery works by provoking exactly this error — the sender',
			'	// probes with DF on, shrinks on each error, and thereby never',
			'	// fragments at all.',
			'	if df {',
			'		return nil, errors.New("fragmentation needed and DF set")',
			'	}',
			'',
			'	// Per-fragment payload capacity, rounded DOWN to a multiple of 8.',
			'	// The receiver rebuilds the payload at Offset*8, so every non-final',
			'	// fragment must end on an 8-byte boundary — the 13-bit offset field',
			'	// simply cannot express "byte 986". With mtu=1006 there is room for',
			'	// 986 bytes but only 984 are usable; the slack is the cost of the',
			'	// header\'s bit budget.',
			'	chunk := (mtu - headerLen) / 8 * 8',
			'',
			'	frags := []Frag{}',
			'	sent := 0',
			'	for sent < payloadLen {',
			'		n := payloadLen - sent // the final fragment takes the remainder',
			'		if n > chunk {',
			'			n = chunk',
			'		}',
			'		frags = append(frags, Frag{',
			'			// sent is always a sum of chunk-sized (multiple-of-8) pieces,',
			'			// so this division is exact — no unit is ever lost.',
			'			Offset: sent / 8,',
			'			Len:    n,',
			'			// MF answers "is more of the original still in flight?" —',
			'			// which is precisely "does this slice end before the payload',
			'			// does?". The last fragment carries MF=0 and thereby tells',
			'			// the receiver the total length for the first time.',
			'			MF: sent+n < payloadLen,',
			'		})',
			'		sent += n',
			'	}',
			'	return frags, nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why offsets count 8-byte units</h3>' +
			'<p>The IPv4 header spends 16 bits on Total Length, so a datagram can be ' +
			'65535 bytes — but Flags took 3 bits out of the 16-bit word shared with ' +
			'Fragment Offset, leaving the offset only <strong>13 bits</strong>. ' +
			'2¹³ = 8192 positions cannot address 65535 bytes… unless each position ' +
			'means 8 bytes: 8192 × 8 = 65536. The header trades granularity for range, ' +
			'and the constraint ripples into the slicing rule you implemented: every ' +
			'non-final fragment must carry a multiple of 8 payload bytes, so the ' +
			'capacity is rounded down (<code>mtu=1006</code> → 984, not 986).</p>',
			{ code: 'chunk := (mtu - headerLen) / 8 * 8 // round DOWN to an 8-byte boundary\n\nfrags = append(frags, Frag{\n\tOffset: sent / 8,           // exact: sent is a sum of multiple-of-8 chunks\n\tLen:    n,\n\tMF:     sent+n < payloadLen, // "is more of the original still in flight?"\n})' },
			'<h3>Why nobody wants fragmentation anymore</h3>' +
			'<p>Fragmentation works, but it amplifies loss: IP has no per-fragment ' +
			'retransmission, so <strong>losing one fragment loses the whole ' +
			'datagram</strong> — the receiver times out its reassembly buffer and the ' +
			'transport layer must resend everything. Worse, only the first fragment ' +
			'carries the TCP/UDP header, so firewalls, NATs, and load balancers cannot ' +
			'classify the rest; many middleboxes just drop non-first fragments. The ' +
			'modern answer is to never fragment: TCP advertises an <strong>MSS</strong> ' +
			'sized to the link, and Path MTU Discovery sends everything with DF set, ' +
			'treating “fragmentation needed” errors as instructions to shrink. IPv6 went ' +
			'all the way — routers there are forbidden to fragment; only the sender ' +
			'may.</p>' +
			'<h3>In the real world</h3>' +
			'<p>The VPN symptom from the intro is a <strong>PMTUD black hole</strong>: a ' +
			'firewall drops the ICMP “fragmentation needed” messages, so the sender ' +
			'never learns to shrink and large packets silently die. You can reproduce ' +
			'the probe by hand: <code>ping -D -s 1472 host</code> sends a 1500-byte ' +
			'packet (1472 payload + 8 ICMP + 20 IP) with DF set — if the path MTU is ' +
			'smaller you get the ICMP error back (or, in a black hole, nothing). Binary ' +
			'search the <code>-s</code> value and you have measured the path MTU; ' +
			'<code>tracepath</code> automates exactly this. The standard fix on routers ' +
			'is <strong>MSS clamping</strong> — rewriting the MSS option in transiting ' +
			'SYNs so TCP never builds a packet that would need fragmenting.</p>',
		],
		complexity: { time: 'O(payloadLen / mtu) — one Frag per fragment', space: 'O(payloadLen / mtu)' },
	});
})();
