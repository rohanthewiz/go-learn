/* WAL: LSN Arithmetic & Replication Lag — WAL & Recovery (Medium). Every
 * byte PostgreSQL ever writes gets a Log Sequence Number: a plain uint64
 * byte offset into the write-ahead log, displayed in the odd "X/Y" hex
 * form. Replication lag in bytes is one subtraction; which 16 MB segment
 * file holds an LSN is one division. The harness pins parse/format
 * round-trips, lag math across the hi-word boundary, and the documented
 * 24-hex-digit WAL filename layout.
 */
(function () {
	'use strict';
	var T = GoLearnPG;

	// One uint64, three costumes: the X/Y display form, the byte offset, and
	// the segment filename. Marker id namespaced (dgArrowPG06) because every
	// track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 210" width="560" height="210" role="img" aria-label="an LSN is a 64-bit byte position: the display form X/Y splits it into high and low 32-bit words, and dividing by the 16 MB segment size gives the WAL segment number and filename">' +
		'<text x="20" y="24" class="lbl">one uint64 byte position, three costumes</text>' +
		// 64-bit box split hi/lo
		'<rect x="40" y="40" width="240" height="44" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<line x1="160" y1="40" x2="160" y2="84" stroke="var(--accent)" stroke-width="1.5"/>' +
		'<text x="100" y="67" text-anchor="middle">hi 32 bits</text>' +
		'<text x="220" y="67" text-anchor="middle">lo 32 bits</text>' +
		'<text x="160" y="100" text-anchor="middle" class="lbl">display: hex(hi) “/” hex(lo) → 16/B374D848</text>' +
		// arrow to segment math
		'<path d="M 160 112 L 160 136" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowPG06)"/>' +
		'<rect x="40" y="142" width="240" height="44" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="160" y="163" text-anchor="middle">segment = lsn / 16 MB</text>' +
		'<text x="160" y="180" text-anchor="middle" class="lbl">byte position ÷ segment size</text>' +
		// filename
		'<rect x="330" y="40" width="210" height="146" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.5"/>' +
		'<text x="435" y="64" text-anchor="middle" class="lbl">pg_wal filename (24 hex digits)</text>' +
		'<text x="435" y="92" text-anchor="middle">00000003</text>' +
		'<text x="435" y="110" text-anchor="middle" class="lbl">timeline</text>' +
		'<text x="435" y="136" text-anchor="middle">00000016 000000B3</text>' +
		'<text x="435" y="154" text-anchor="middle" class="lbl">segment / 256, segment % 256</text>' +
		'<text x="435" y="178" text-anchor="middle" class="lbl">lag bytes = lsnA − lsnB: plain subtraction</text>' +
		'<defs><marker id="dgArrowPG06" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'wal-lsn-math',
		title: 'WAL: LSN Arithmetic & Replication Lag',
		nav: 'wal lsn math',
		difficulty: 'Medium',
		category: 'WAL & Recovery',
		task: 'Implement ParseLSN/FormatLSN for the X/Y hex form, byte-lag subtraction, segment numbers, and the 24-hex-digit WAL filename.',

		prose: [
			'<h2>WAL: LSN Arithmetic &amp; Replication Lag</h2>' +
			'<p>The dashboard says the replica is “behind”, and ' +
			'<code>pg_stat_replication</code> hands you the evidence in a strange ' +
			'notation: <code>sent_lsn 16/B374D848</code>, <code>replay_lsn ' +
			'16/B374D000</code>. Behind by <em>how much</em>? Minutes? No — ' +
			'2,120 <em>bytes</em>, and you can compute that by hand, because a ' +
			'Log Sequence Number is nothing exotic:</p>' +
			'<ul>' +
			'<li><strong>An LSN is a uint64 byte position</strong> in the ' +
			'write-ahead log — the single append-only stream every change is ' +
			'written to before any data page. LSN 0 was the beginning of the ' +
			'cluster’s history; the LSN only ever grows.</li>' +
			'<li><strong>The <code>X/Y</code> form is just display.</strong> ' +
			'High 32 bits in hex, a slash, low 32 bits in hex — neither half ' +
			'zero-padded. <code>16/B374D848</code> is ' +
			'<code>0x16B374D848</code> = 97,500,059,720: this cluster has written ' +
			'~90 GB of WAL, ever. Lag in bytes is plain subtraction of two ' +
			'parsed LSNs.</li>' +
			'<li><strong>Segment files carve the stream into 16 MB pieces.</strong> ' +
			'The files in <code>pg_wal/</code> are consecutive 16 MB windows of ' +
			'the stream: segment number = <code>lsn / 16MB</code>. The filename ' +
			'is 24 hex digits in three fields of 8: the <em>timeline</em>, then ' +
			'<code>segment/256</code>, then <code>segment%256</code> — 256 ' +
			'segments per “log id” because 256 × 16 MB = 4 GB = one full ' +
			'low word.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>ParseLSN</code> (return an error for anything ' +
			'that is not two hex halves joined by a slash), <code>FormatLSN</code> ' +
			'(uppercase hex, no padding — match <code>pg_current_wal_lsn()</code> ' +
			'exactly), <code>LagBytes(newer, older)</code>, ' +
			'<code>SegmentNo</code>, and <code>WalFileName(timeline, lsn)</code>. ' +
			'No <code>encoding/binary</code> needed — <code>strconv.ParseUint</code> ' +
			'with base 16 and shifts do everything.</p>',
			{ lang: 'txt', code: 'sent   16/B374D848  ->  0x16B374D848\nreplay 16/B374D000  ->  0x16B374D000\nlag = 0x848 - 0x000 = 2120 bytes            (pg_wal_lsn_diff does exactly this)\n\nsegment(0x16B374D848) = 0x16B374D848 / 16MB = 0x16B3\nfilename(timeline 3)  = 00000003 | 00000016 | 000000B3' },
			'<div class="tip">Every restore point, replication slot, backup label, ' +
			'and <code>pg_rewind</code> conversation is phrased in LSNs. The ' +
			'skill being drilled here — “X/Y is just a uint64” — is what lets ' +
			'you read <code>pg_controldata</code> output or a recovery log and ' +
			'know instantly how far apart two positions are.</div>',
		],

		starter: [
			'package main',
			'',
			'// WalSegSize is the compiled default WAL segment size: 16 MB.',
			'const WalSegSize = 16 * 1024 * 1024',
			'',
			'// ParseLSN converts the display form "X/Y" (hi and lo 32-bit words',
			'// in hex) into the underlying uint64 byte position. Reject strings',
			'// without exactly two hex halves.',
			'func ParseLSN(s string) (uint64, error) {',
			'	// your code here',
			'	return 0, nil',
			'}',
			'',
			'// FormatLSN renders a byte position back to the "X/Y" display form:',
			'// uppercase hex, no zero padding (FormatLSN(23408272) = "0/1652E90").',
			'func FormatLSN(lsn uint64) string {',
			'	// your code here',
			'	return ""',
			'}',
			'',
			'// LagBytes is how far older trails newer, in bytes — the number',
			'// behind pg_wal_lsn_diff(newer, older).',
			'func LagBytes(newer, older uint64) int64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// SegmentNo is which 16 MB WAL segment the byte position falls in.',
			'func SegmentNo(lsn uint64) uint64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// WalFileName is the 24-hex-digit name of the pg_wal file holding',
			'// lsn: three zero-padded 8-digit fields — timeline, segment/256,',
			'// segment%256.',
			'func WalFileName(timeline uint32, lsn uint64) string {',
			'	// your code here',
			'	return ""',
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
			'	// mustParse keeps case bodies terse; parse errors surface as',
			'	// wrong got-values rather than panics (solution stderr must stay',
			'	// clean, so no panicking path is ever exercised).',
			'	mustParse := func(s string) uint64 {',
			'		v, err := ParseLSN(s)',
			'		if err != nil {',
			'			return 0',
			'		}',
			'		return v',
			'	}',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"ParseLSN(\\"0/10\\"): the halves are hex — this is byte 16, not 10",',
			'			"16",',
			'			func() string { return fmt.Sprintf("%d", mustParse("0/10")) }},',
			'		{"ParseLSN(\\"0/1652E90\\") = 23408272 (hi word zero)",',
			'			"23408272",',
			'			func() string { return fmt.Sprintf("%d", mustParse("0/1652E90")) }},',
			'		{"round trip: FormatLSN(ParseLSN(\\"16/B374D848\\")) preserves the form",',
			'			"16/B374D848",',
			'			func() string { return FormatLSN(mustParse("16/B374D848")) }},',
			'		{"FormatLSN(23408272): uppercase, unpadded, hi word prints as 0",',
			'			"0/1652E90",',
			'			func() string { return FormatLSN(23408272) }},',
			'		{"replication lag: sent 16/B374D848 vs replay 16/B374D000 = 2120 bytes",',
			'			"2120",',
			'			func() string { return fmt.Sprintf("%d", LagBytes(mustParse("16/B374D848"), mustParse("16/B374D000"))) }},',
			'		{"lag across the hi-word boundary: 2/0 minus 1/FF000000 = 16 MB, not garbage",',
			'			"16777216",',
			'			func() string { return fmt.Sprintf("%d", LagBytes(mustParse("2/0"), mustParse("1/FF000000"))) }},',
			'		{"SegmentNo: byte 0xFFFFFF is still segment 0; byte 0x1000000 starts segment 1",',
			'			"0 1",',
			'			func() string { return fmt.Sprintf("%d %d", SegmentNo(mustParse("0/FFFFFF")), SegmentNo(mustParse("0/1000000"))) }},',
			'		{"WalFileName(1, 0/1652E90): timeline 1, segment 1",',
			'			"000000010000000000000001",',
			'			func() string { return WalFileName(1, mustParse("0/1652E90")) }},',
			'		{"WalFileName(3, 16/B374D848): segment 0x16B3 splits into fields 16 and B3",',
			'			"0000000300000016000000B3",',
			'			func() string { return WalFileName(3, mustParse("16/B374D848")) }},',
			'		{"ParseLSN rejects a slash-less string with an error",',
			'			"true",',
			'			func() string {',
			'				_, err := ParseLSN("junk")',
			'				return fmt.Sprintf("%v", err != nil)',
			'			}},',
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
			'	"fmt"',
			'	"strconv"',
			'	"strings"',
			')',
			'',
			'// WalSegSize is the compiled default WAL segment size: 16 MB.',
			'// (Changeable only at initdb via --wal-segsize, so treated as a',
			'// constant — but the SEGMENT math below derives everything from it',
			'// rather than hard-coding 256, so a different size still works.)',
			'const WalSegSize = 16 * 1024 * 1024',
			'',
			'// ParseLSN: split on the slash, parse each half as base-16 into 32',
			'// bits, recombine with a shift. ParseUint\'s bitSize 32 does the',
			'// range policing (a 9-digit half fails) so no manual bounds checks',
			'// are needed.',
			'func ParseLSN(s string) (uint64, error) {',
			'	parts := strings.Split(s, "/")',
			'	if len(parts) != 2 {',
			'		return 0, errors.New("bad LSN (want X/Y): " + s)',
			'	}',
			'	hi, err := strconv.ParseUint(parts[0], 16, 32)',
			'	if err != nil {',
			'		return 0, errors.New("bad LSN hi word: " + s)',
			'	}',
			'	lo, err := strconv.ParseUint(parts[1], 16, 32)',
			'	if err != nil {',
			'		return 0, errors.New("bad LSN lo word: " + s)',
			'	}',
			'	return hi<<32 | lo, nil',
			'}',
			'',
			'// FormatLSN: %X on each word matches the server\'s own %X/%X printf',
			'// — uppercase and unpadded, so "0/1652E90" not "0/01652E90". Byte-',
			'// identical output matters: these strings get compared and grepped',
			'// against real pg output.',
			'func FormatLSN(lsn uint64) string {',
			'	return fmt.Sprintf("%X/%X", lsn>>32, lsn&0xFFFFFFFF)',
			'}',
			'',
			'// LagBytes: LSNs are byte positions in one monotonically growing',
			'// stream, so lag really is a subtraction. Signed result on purpose:',
			'// pg_wal_lsn_diff is negative when the "newer" argument is actually',
			'// behind, and that sign is diagnostic (a replica AHEAD of what you',
			'// thought was the primary is a split-brain smell).',
			'func LagBytes(newer, older uint64) int64 {',
			'	return int64(newer) - int64(older)',
			'}',
			'',
			'// SegmentNo: the stream is cut into fixed windows, so position /',
			'// window-size names the window. Integer division floors — position',
			'// 0xFFFFFF is still inside segment 0.',
			'func SegmentNo(lsn uint64) uint64 {',
			'	return lsn / WalSegSize',
			'}',
			'',
			'// WalFileName: three fixed-width fields so names sort in WAL order',
			'// with plain ls. The middle/last split is segment / and % "segments',
			'// per log id" — how many 16 MB windows fit in one 4 GB hi-word tick',
			'// (256) — a historical artifact of the pre-9.3 two-number LSN kept',
			'// for filename compatibility. %08X pads each field to 8 digits.',
			'func WalFileName(timeline uint32, lsn uint64) string {',
			'	segsPerID := uint64(0x100000000) / WalSegSize',
			'	seg := SegmentNo(lsn)',
			'	return fmt.Sprintf("%08X%08X%08X", timeline, seg/segsPerID, seg%segsPerID)',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why the WAL is the center of everything</h3>' +
			'<p>The write-ahead log is the one durability mechanism: a change is ' +
			'durable when its WAL record is fsynced, and everything else — ' +
			'checkpoints, replication, PITR, logical decoding — is a consumer of ' +
			'the same stream. That is why LSNs appear everywhere: a data page ' +
			'stores the LSN of the last record that touched it (so recovery knows ' +
			'whether to re-apply), a replica reports how far it has replayed, a ' +
			'backup is “consistent as of” an LSN, a replication slot pins WAL ' +
			'from an LSN onward. One coordinate system for all of time.</p>' +
			'<h3>Field notes on the arithmetic</h3>' +
			'<ul>' +
			'<li><strong>Byte lag vs. time lag.</strong> ' +
			'<code>pg_wal_lsn_diff(sent_lsn, replay_lsn)</code> is exactly your ' +
			'<code>LagBytes</code>; <code>pg_stat_replication</code>’s ' +
			'<code>replay_lag</code> converts to seconds by timestamping. Bytes ' +
			'is the honest metric under bursty load — “5 seconds behind” means ' +
			'nothing during a bulk load writing 500 MB/min.</li>' +
			'<li><strong>Filenames are not consecutive integers.</strong> After ' +
			'<code>0000000100000000000000FF</code> comes ' +
			'<code>000000010000000100000000</code> — the third field wraps at ' +
			'0xFF because only 256 segments fit per 4 GB log id. Scripts that ' +
			'“increment the filename” corrupt archives; scripts that use ' +
			'<code>pg_walfile_name()</code> (your <code>WalFileName</code>) do ' +
			'not.</li>' +
			'<li><strong>The timeline field is the recovery story.</strong> ' +
			'Every promotion or PITR divergence increments the timeline, so two ' +
			'histories that share a past cannot overwrite each other’s files in ' +
			'the archive. When <code>pg_rewind</code> talks about “diverged at ' +
			'LSN X on timeline N”, it is naming a point in this coordinate ' +
			'system.</li>' +
			'<li><strong>Slots pin WAL by LSN — forever.</strong> A replication ' +
			'slot’s <code>restart_lsn</code> forbids recycling any segment at or ' +
			'after it. A dead consumer means <code>pg_wal/</code> grows until ' +
			'the disk fills; <code>max_slot_wal_keep_size</code> (v13+) is the ' +
			'circuit breaker, and the monitoring query is ' +
			'<code>pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)</code> per ' +
			'slot — again your subtraction.</li>' +
			'</ul>' +
			'<h3>Related GUCs and views</h3>' +
			'<p><code>wal_level</code> (how much is logged), ' +
			'<code>max_wal_size</code>/<code>min_wal_size</code> (checkpoint ' +
			'spacing — soft limits on pg_wal growth between checkpoints), ' +
			'<code>archive_command</code>/<code>archive_library</code> (segment ' +
			'shipping), and the function family ' +
			'<code>pg_current_wal_lsn()</code>, <code>pg_walfile_name()</code>, ' +
			'<code>pg_wal_lsn_diff()</code> — the three functions this item ' +
			'reimplements.</p>',
		],
		complexity: { time: 'O(1) — fixed-width parsing and integer arithmetic', space: 'O(1)' },
	});
})();
