/* Torn-Tail Recovery — btypedb: Durability (Hard). The crash-recovery walk
 * over RAW log bytes: scan frame by frame, and the first torn or
 * CRC-failing record marks the end of valid data — everything before it is
 * kept, the tail is truncated. A tear anywhere INSIDE a batch group rolls
 * the cut back to the batch header, keeping recovery all-or-nothing. The
 * harness cuts and corrupts real encoded logs at chosen byte offsets and
 * pins both the recovered state and the exact valid-byte count.
 */
(function () {
	'use strict';
	var T = GoLearnBT;

	// A log with a torn tail: intact frames survive, the cut lands at the
	// start of the first bad frame — and if the bad frame sits inside a
	// batch group, the cut rolls back to the group's header. Marker id
	// namespaced (dgArrowBT06) because every track's SVGs share the page's
	// id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="recovery scans frames left to right; the first torn or CRC-failing frame sets the truncation point, and a tear inside a batch rolls the cut back to the batch header">' +
		'<text x="20" y="24" class="lbl">crash mid-append: the file ends in half a record — where does valid data end?</text>' +
		'<rect x="30" y="44" width="86" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="73" y="64" text-anchor="middle">set a=1 ✓</text>' +
		'<rect x="124" y="44" width="86" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="167" y="64" text-anchor="middle">set b=2 ✓</text>' +
		'<rect x="218" y="44" width="120" height="30" rx="4" fill="none" stroke="var(--warn)" stroke-width="2" stroke-dasharray="5 3"/><text x="278" y="64" text-anchor="middle" style="fill:var(--warn)">set c=3 (torn)</text>' +
		'<path d="M 214 108 L 214 78" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowBT06)"/>' +
		'<text x="214" y="126" text-anchor="middle" class="lbl" style="fill:var(--warn)">validBytes: cut HERE — keep everything before, truncate the rest</text>' +
		// batch roll-back row
		'<rect x="30" y="146" width="86" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="73" y="166" text-anchor="middle">set a=1 ✓</text>' +
		'<rect x="124" y="146" width="80" height="30" rx="4" fill="none" stroke="var(--edge)"/><text x="164" y="166" text-anchor="middle">batch 2</text>' +
		'<rect x="212" y="146" width="80" height="30" rx="4" fill="none" stroke="var(--edge)"/><text x="252" y="166" text-anchor="middle">set b=2 ✓</text>' +
		'<rect x="300" y="146" width="100" height="30" rx="4" fill="none" stroke="var(--warn)" stroke-width="2" stroke-dasharray="5 3"/><text x="350" y="166" text-anchor="middle" style="fill:var(--warn)">set c (torn)</text>' +
		'<path d="M 340 190 C 260 210 150 200 122 182" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowBT06)"/>' +
		'<text x="290" y="212" text-anchor="middle" class="lbl" style="fill:var(--warn)">tear inside the group → the cut rolls back to the batch header: b=2 dies too</text>' +
		'<defs><marker id="dgArrowBT06" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'torn-tail-recovery',
		title: 'Torn-Tail Recovery',
		nav: 'torn tail recovery',
		difficulty: 'Hard',
		category: 'Durability',
		task: 'Implement Recover over raw log bytes: keep every intact frame, truncate at the first torn/CRC-failing one, and discard a batch group whole if it tears anywhere inside.',

		prose: [
			'<h2>Torn-Tail Recovery</h2>' +
			'<p>The rack loses power while your store is appending a record. On ' +
			'reboot the log file ends with a header promising 4&nbsp;096 value ' +
			'bytes, followed by 217 of them. Nothing in the filesystem flags this — ' +
			'the file opens, reads fine, and looks like data right up until you ' +
			'try to trust it. Recovering from exactly this file, byte-precisely, ' +
			'is what separates a durable store from a lucky one, and it is what ' +
			'btypedb’s <code>Open</code> does before returning:</p>',
			{ lang: 'go', code: '// From the btypedb README:\n//\n// On open the log is replayed into the B-tree. A torn or CRC-failing\n// record (crash mid-append) marks the end of valid data; the tail is\n// truncated and the database continues from the last good record.\n// A batch is applied all-or-nothing: a tear anywhere inside it\n// discards the whole group.\ndb, err := btypedb.Open("users.db", btypedb.StringCodec, btypedb.JSONCodec[User]())' },
			'<p>The scan is a loop over frames with three rules:</p>' +
			'<ul>' +
			'<li><strong>The first bad frame ends the log.</strong> “Bad” means ' +
			'torn (fewer bytes than the header promises, or not even a full ' +
			'header) or CRC-failing (a flipped bit anywhere in the frame). ' +
			'Crucially, recovery does <em>not</em> skip it and continue: after ' +
			'one bad frame the byte stream has no trustworthy alignment, so even ' +
			'physically intact records beyond it are unreachable. Append-only ' +
			'discipline makes this safe — corruption mid-file means the tail ' +
			'from that point was never durably completed.</li>' +
			'<li><strong>A batch tears as a unit.</strong> The header promised N ' +
			'records; if any of them is bad — or missing entirely — the cut ' +
			'rolls back to the <em>batch header</em>, discarding intact group ' +
			'members too. Half a transaction must never survive recovery.</li>' +
			'<li><strong>Report the cut.</strong> <code>validBytes</code> is where ' +
			'valid data ends: the engine truncates the file there and appends ' +
			'new records from that offset.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>The framing layer from the previous item is given (redeclared: ' +
			'<code>decodeFrame</code> validates one frame and says how many bytes ' +
			'it spans, <code>applyRec</code> folds a mutation into the state). ' +
			'Implement <code>Recover(log)</code> returning the recovered state ' +
			'map, the TTL table, and <code>validBytes</code>. Treat a batch ' +
			'header whose value is not exactly 8 count bytes, an unknown op, or ' +
			'a batch header nested in a group as corruption at that frame’s ' +
			'offset.</p>',
		],

		starter: [
			'package main',
			'',
			'// Ops, framing and fold — all given, straight from the previous item.',
			'const (',
			'	OpSet    = byte(1)',
			'	OpDelete = byte(2)',
			'	OpBatch  = byte(3) // val = uint64 count',
			'	OpSetTTL = byte(4) // val = 8-byte unix-nano deadline, then value bytes',
			')',
			'',
			'type Record struct {',
			'	Op  byte',
			'	Key []byte',
			'	Val []byte',
			'}',
			'',
			'func readU32(b []byte) uint32 {',
			'	return uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])',
			'}',
			'',
			'func readU64(b []byte) uint64 {',
			'	return uint64(readU32(b))<<32 | uint64(readU32(b[4:]))',
			'}',
			'',
			'var crcTable = makeCRCTable()',
			'',
			'func makeCRCTable() [256]uint32 {',
			'	var t [256]uint32',
			'	for i := 0; i < 256; i++ {',
			'		c := uint32(i)',
			'		for j := 0; j < 8; j++ {',
			'			if c&1 == 1 {',
			'				c = 0xEDB88320 ^ (c >> 1)',
			'			} else {',
			'				c >>= 1',
			'			}',
			'		}',
			'		t[i] = c',
			'	}',
			'	return t',
			'}',
			'',
			'func crc32IEEE(data []byte) uint32 {',
			'	crc := ^uint32(0)',
			'	for _, b := range data {',
			'		crc = crcTable[byte(crc)^b] ^ (crc >> 8)',
			'	}',
			'	return ^crc',
			'}',
			'',
			'// decodeFrame validates ONE frame at the start of buf: header',
			'// present, full span present, CRC matches. Returns the record, the',
			'// bytes it spans, and ok=false for a torn or corrupt frame.',
			'func decodeFrame(buf []byte) (Record, int, bool) {',
			'	if len(buf) < 9 {',
			'		return Record{}, 0, false',
			'	}',
			'	klen := int(readU32(buf[1:5]))',
			'	vlen := int(readU32(buf[5:9]))',
			'	need := 9 + klen + vlen + 4',
			'	if need < 13 || len(buf) < need {',
			'		return Record{}, 0, false',
			'	}',
			'	if readU32(buf[need-4:need]) != crc32IEEE(buf[:need-4]) {',
			'		return Record{}, 0, false',
			'	}',
			'	return Record{Op: buf[0], Key: buf[9 : 9+klen], Val: buf[9+klen : 9+klen+vlen]}, need, true',
			'}',
			'',
			'// applyRec folds one MUTATION record into the state; ok=false means',
			'// the op is unknown (corruption) or a batch header reached the fold.',
			'func applyRec(state map[string]string, ttl map[string]int64, r Record) bool {',
			'	switch r.Op {',
			'	case OpSet:',
			'		state[string(r.Key)] = string(r.Val)',
			'		delete(ttl, string(r.Key))',
			'		return true',
			'	case OpDelete:',
			'		delete(state, string(r.Key))',
			'		delete(ttl, string(r.Key))',
			'		return true',
			'	case OpSetTTL:',
			'		if len(r.Val) < 8 {',
			'			return false',
			'		}',
			'		state[string(r.Key)] = string(r.Val[8:])',
			'		ttl[string(r.Key)] = int64(readU64(r.Val[:8]))',
			'		return true',
			'	}',
			'	return false',
			'}',
			'',
			'// Recover scans raw log bytes and returns (state, ttl, validBytes).',
			'// This naive version stops at the first bad frame but treats batch',
			'// headers as no-ops — which quietly surfaces HALF-transactions when',
			'// a batch tears. Fix it: a batch group is all-or-nothing, and a tear',
			'// inside the group rolls validBytes back to the batch HEADER.',
			'func Recover(log []byte) (map[string]string, map[string]int64, int) {',
			'	state := make(map[string]string)',
			'	ttl := make(map[string]int64)',
			'	off := 0',
			'	for off < len(log) {',
			'		r, n, ok := decodeFrame(log[off:])',
			'		if !ok {',
			'			break',
			'		}',
			'		// your code here: handle OpBatch groups atomically',
			'		if r.Op != OpBatch {',
			'			applyRec(state, ttl, r)',
			'		}',
			'		off += n',
			'	}',
			'	return state, ttl, off',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"sort"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'// The harness carries its own encoder (h-prefixed to stay clear of',
			'// the learner\'s names) so every test log is built from real frames.',
			'var hTable = hMakeTable()',
			'',
			'func hMakeTable() [256]uint32 {',
			'	var t [256]uint32',
			'	for i := 0; i < 256; i++ {',
			'		c := uint32(i)',
			'		for j := 0; j < 8; j++ {',
			'			if c&1 == 1 {',
			'				c = 0xEDB88320 ^ (c >> 1)',
			'			} else {',
			'				c >>= 1',
			'			}',
			'		}',
			'		t[i] = c',
			'	}',
			'	return t',
			'}',
			'',
			'func hCRC(data []byte) uint32 {',
			'	crc := ^uint32(0)',
			'	for _, b := range data {',
			'		crc = hTable[byte(crc)^b] ^ (crc >> 8)',
			'	}',
			'	return ^crc',
			'}',
			'',
			'func hU32(dst []byte, v uint32) []byte {',
			'	return append(dst, byte(v>>24), byte(v>>16), byte(v>>8), byte(v))',
			'}',
			'',
			'func hU64(dst []byte, v uint64) []byte {',
			'	dst = hU32(dst, uint32(v>>32))',
			'	return hU32(dst, uint32(v))',
			'}',
			'',
			'func hEnc(op byte, key, val []byte) []byte {',
			'	out := append([]byte{op}, hU32(nil, uint32(len(key)))...)',
			'	out = hU32(out, uint32(len(val)))',
			'	out = append(out, key...)',
			'	out = append(out, val...)',
			'	return hU32(out, hCRC(out))',
			'}',
			'',
			'const hSecNs = int64(1000000000)',
			'',
			'func hAt(s int64) int64 { return int64(1700000000)*hSecNs + s*hSecNs }',
			'',
			'func hSet(k, v string) []byte  { return hEnc(OpSet, []byte(k), []byte(v)) }',
			'func hDel(k string) []byte     { return hEnc(OpDelete, []byte(k), nil) }',
			'func hBatch(n uint64) []byte   { return hEnc(OpBatch, nil, hU64(nil, n)) }',
			'func hTTLRec(k string, dlSec int64, v string) []byte {',
			'	val := hU64(nil, uint64(hAt(dlSec)))',
			'	return hEnc(OpSetTTL, []byte(k), append(val, []byte(v)...))',
			'}',
			'',
			'func hCat(parts ...[]byte) []byte {',
			'	out := []byte{}',
			'	for _, p := range parts {',
			'		out = append(out, p...)',
			'	}',
			'	return out',
			'}',
			'',
			'func hDump(state map[string]string, ttl map[string]int64) string {',
			'	ks := make([]string, 0, len(state))',
			'	for k := range state {',
			'		ks = append(ks, k)',
			'	}',
			'	sort.Strings(ks)',
			'	parts := make([]string, 0, len(ks))',
			'	for _, k := range ks {',
			'		parts = append(parts, k+"="+state[k])',
			'	}',
			'	ts := make([]string, 0, len(ttl))',
			'	for k := range ttl {',
			'		ts = append(ts, fmt.Sprintf("%s@%d", k, (ttl[k]-hAt(0))/hSecNs))',
			'	}',
			'	sort.Strings(ts)',
			'	return "{" + strings.Join(parts, ",") + "} ttl{" + strings.Join(ts, ",") + "}"',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		log  []byte',
			'	}',
			'	// Frame sizes for reference: set/del of 1-byte keys = 15/14 bytes,',
			'	// batch header = 21, the setttl below = 27.',
			'	tornC := hSet("c", "3")[:8] // cut mid-record',
			'	midFlip := hCat(hSet("a", "1"), hSet("b", "2"), hSet("c", "3"))',
			'	midFlip[24] ^= 0x01 // corrupt a payload byte of the SECOND record',
			'	cases := []tc{',
			'		{"clean log: every frame intact — full state, validBytes = len",',
			'			"{b=2,c=3} ttl{} valid=59/59",',
			'			hCat(hSet("a", "1"), hSet("b", "2"), hDel("a"), hSet("c", "3"))},',
			'		{"torn tail: last record cut mid-frame — keep the rest, cut at its start",',
			'			"{a=1,b=2} ttl{} valid=30/38",',
			'			hCat(hSet("a", "1"), hSet("b", "2"), tornC)},',
			'		{"one flipped bit mid-log: alignment is lost — even intact frames beyond die",',
			'			"{a=1} ttl{} valid=15/45",',
			'			midFlip},',
			'		{"tear INSIDE a batch: intact member b=2 is discarded with the group",',
			'			"{a=1} ttl{} valid=15/59",',
			'			hCat(hSet("a", "1"), hBatch(2), hSet("b", "2"), hSet("c", "3")[:8])},',
			'		{"complete batch: header + all members present — applied as one unit",',
			'			"{a=1,b=2,c=3} ttl{} valid=66/66",',
			'			hCat(hBatch(2), hSet("a", "1"), hSet("b", "2"), hSet("c", "3"))},',
			'		{"batch promises 2, log holds 1: cut rolls back to the header",',
			'			"{a=1} ttl{} valid=15/51",',
			'			hCat(hSet("a", "1"), hBatch(2), hSet("b", "2"))},',
			'		{"garbage tail: random bytes after the last good frame are truncated",',
			'			"{a=1} ttl{} valid=15/22",',
			'			hCat(hSet("a", "1"), []byte{0xde, 0xad, 0xbe, 0xef, 0x51, 0x0f, 0xa1})},',
			'		{"setttl in the recovered region: the absolute deadline survives",',
			'			"{s:1=tok} ttl{s:1@30} valid=27/27",',
			'			hTTLRec("s:1", 30, "tok")},',
			'		{"empty log: a brand-new database — empty state, zero valid bytes",',
			'			"{} ttl{} valid=0/0",',
			'			[]byte{}},',
			'		{"batch header with a 4-byte count field: corrupt — cut at the header",',
			'			"{a=1} ttl{} valid=15/32",',
			'			hCat(hSet("a", "1"), hEnc(OpBatch, nil, []byte{0, 0, 0, 2}))},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{"input": c.name, "want": c.want}',
			'		runCase(r, func() {',
			'			state, ttl, valid := Recover(c.log)',
			'			got := fmt.Sprintf("%s valid=%d/%d", hDump(state, ttl), valid, len(c.log))',
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
			'// Ops, framing and fold — redeclared so the solution stands alone.',
			'const (',
			'	OpSet    = byte(1)',
			'	OpDelete = byte(2)',
			'	OpBatch  = byte(3) // val = uint64 count',
			'	OpSetTTL = byte(4) // val = 8-byte unix-nano deadline, then value bytes',
			')',
			'',
			'type Record struct {',
			'	Op  byte',
			'	Key []byte',
			'	Val []byte',
			'}',
			'',
			'func readU32(b []byte) uint32 {',
			'	return uint32(b[0])<<24 | uint32(b[1])<<16 | uint32(b[2])<<8 | uint32(b[3])',
			'}',
			'',
			'func readU64(b []byte) uint64 {',
			'	return uint64(readU32(b))<<32 | uint64(readU32(b[4:]))',
			'}',
			'',
			'var crcTable = makeCRCTable()',
			'',
			'func makeCRCTable() [256]uint32 {',
			'	var t [256]uint32',
			'	for i := 0; i < 256; i++ {',
			'		c := uint32(i)',
			'		for j := 0; j < 8; j++ {',
			'			if c&1 == 1 {',
			'				c = 0xEDB88320 ^ (c >> 1)',
			'			} else {',
			'				c >>= 1',
			'			}',
			'		}',
			'		t[i] = c',
			'	}',
			'	return t',
			'}',
			'',
			'func crc32IEEE(data []byte) uint32 {',
			'	crc := ^uint32(0)',
			'	for _, b := range data {',
			'		crc = crcTable[byte(crc)^b] ^ (crc >> 8)',
			'	}',
			'	return ^crc',
			'}',
			'',
			'// decodeFrame validates ONE frame at the start of buf. The need<13',
			'// guard also catches length fields so large they overflow into',
			'// nonsense — corrupt lengths must read as "torn", never as a panic.',
			'func decodeFrame(buf []byte) (Record, int, bool) {',
			'	if len(buf) < 9 {',
			'		return Record{}, 0, false',
			'	}',
			'	klen := int(readU32(buf[1:5]))',
			'	vlen := int(readU32(buf[5:9]))',
			'	need := 9 + klen + vlen + 4',
			'	if need < 13 || len(buf) < need {',
			'		return Record{}, 0, false',
			'	}',
			'	if readU32(buf[need-4:need]) != crc32IEEE(buf[:need-4]) {',
			'		return Record{}, 0, false',
			'	}',
			'	return Record{Op: buf[0], Key: buf[9 : 9+klen], Val: buf[9+klen : 9+klen+vlen]}, need, true',
			'}',
			'',
			'// applyRec folds one MUTATION record into the state; ok=false means',
			'// the op is unknown (corruption) or a batch header reached the fold.',
			'func applyRec(state map[string]string, ttl map[string]int64, r Record) bool {',
			'	switch r.Op {',
			'	case OpSet:',
			'		state[string(r.Key)] = string(r.Val)',
			'		delete(ttl, string(r.Key))',
			'		return true',
			'	case OpDelete:',
			'		delete(state, string(r.Key))',
			'		delete(ttl, string(r.Key))',
			'		return true',
			'	case OpSetTTL:',
			'		if len(r.Val) < 8 {',
			'			return false',
			'		}',
			'		state[string(r.Key)] = string(r.Val[8:])',
			'		ttl[string(r.Key)] = int64(readU64(r.Val[:8]))',
			'		return true',
			'	}',
			'	return false',
			'}',
			'',
			'// Recover scans raw log bytes into (state, ttl, validBytes).',
			'//',
			'// The invariant that makes the code simple: `off` only ever advances',
			'// past bytes that are FULLY committed to the recovered state. A',
			'// plain record advances it after applying; a batch group advances it',
			'// only after the entire group decoded cleanly — so whenever the loop',
			'// breaks, `off` IS the truncation point, with no rollback math.',
			'func Recover(log []byte) (map[string]string, map[string]int64, int) {',
			'	state := make(map[string]string)',
			'	ttl := make(map[string]int64)',
			'	off := 0',
			'	for off < len(log) {',
			'		r, n, ok := decodeFrame(log[off:])',
			'		if !ok {',
			'			break',
			'		}',
			'		if r.Op != OpBatch {',
			'			// applyRec\'s false covers unknown ops: from the scanner\'s',
			'			// view an unrecognized op byte IS corruption — stop here.',
			'			if !applyRec(state, ttl, r) {',
			'				break',
			'			}',
			'			off += n',
			'			continue',
			'		}',
			'		// Batch group. The count must be exactly 8 bytes — a header',
			'		// with a malformed count cannot be trusted about anything,',
			'		// including how far to skip, so it is corruption at `off`.',
			'		if len(r.Val) != 8 {',
			'			break',
			'		}',
			'		count := int(readU64(r.Val))',
			'		// Two-phase apply: DECODE the whole group first, into a',
			'		// staging slice, and only fold it into state if every member',
			'		// is intact. Applying while scanning would leak a half',
			'		// transaction on the tear the group frame exists to contain.',
			'		groupEnd := off + n',
			'		staged := make([]Record, 0, count)',
			'		intact := true',
			'		for j := 0; j < count; j++ {',
			'			gr, gn, gok := decodeFrame(log[groupEnd:])',
			'			// A nested batch header can only appear if the log writer',
			'			// was corrupted mid-commit — treat as a tear.',
			'			if !gok || gr.Op == OpBatch {',
			'				intact = false',
			'				break',
			'			}',
			'			staged = append(staged, gr)',
			'			groupEnd += gn',
			'		}',
			'		if !intact {',
			'			break // off still points at the batch HEADER — the cut',
			'		}',
			'		applied := true',
			'		for _, gr := range staged {',
			'			if !applyRec(state, ttl, gr) {',
			'				applied = false',
			'				break',
			'			}',
			'		}',
			'		if !applied {',
			'			break',
			'		}',
			'		off = groupEnd',
			'	}',
			'	return state, ttl, off',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What the real btypedb does</h3>' +
			'<p>Your <code>Recover</code> is the heart of btypedb’s open path: ' +
			'scan, cut, then literally <code>Truncate</code> the file to ' +
			'<code>validBytes</code> so the next append starts on a clean frame ' +
			'boundary. Truncating (rather than remembering an offset) matters: if ' +
			'the torn tail were left in place, a later append would splice new ' +
			'bytes onto old garbage, and a <em>second</em> crash could leave that ' +
			'hybrid looking CRC-valid by accident.</p>' +
			'<p>How do you gain confidence in code like this? Not by review alone. ' +
			'btypedb attacks it three ways: a <strong>SIGKILL suite</strong> ' +
			're-execs the test binary as a write-hammering child and kills it at ' +
			'varied points, then verifies recovery; a <strong>power-loss ' +
			'harness</strong> models durable-vs-unsynced bytes with fsync as the ' +
			'promotion point and asserts that under <code>SyncAlways</code> every ' +
			'<em>acknowledged</em> write survives a cut at every ack boundary ' +
			'exactly — catching ack-before-fsync ordering bugs — plus torn ' +
			'mid-record cuts and garbage tails; and a <strong>consistency ' +
			'test</strong> opens every byte-length prefix of a real log, which is ' +
			'precisely your harness generalized from a few chosen offsets to all ' +
			'of them. Batch atomicity under tearing is an enumerated property, ' +
			'not a hope.</p>' +
			'<h3>Trade-offs</h3>' +
			'<p>Stopping at the first bad frame gives up data: physically intact ' +
			'records past the tear are discarded even though a smarter scanner ' +
			'might re-synchronize on a plausible next header. Engines choose ' +
			'truncate-at-first-error anyway — as LevelDB’s WAL reader and ' +
			'PostgreSQL’s replay both do — because resynchronization guesses, and ' +
			'a recovery that guesses can resurrect a record the writer never ' +
			'acknowledged, or splice two transactions into one. Losing an ' +
			'unacknowledged tail is correct behavior; inventing data is ' +
			'corruption. The append-only invariant is what makes the choice ' +
			'sound: bytes after a torn frame can only be later, unacknowledged ' +
			'writes.</p>' +
			'<p>The subtle case your two-phase batch loop handles — decode the ' +
			'whole group before applying any of it — is worth generalizing. ' +
			'Anywhere a format has a container frame (a transaction, a chunk, a ' +
			'message envelope), validate the container completely before its ' +
			'contents touch state. Interleaving validation with mutation is how ' +
			'systems end up needing an <em>undo</em> path, and undo paths under ' +
			'crash conditions are where storage engines go to die.</p>',
		],
		complexity: { time: 'O(n) over the log bytes — each frame CRC-checked once', space: 'O(live keys) plus one staged batch group' },
	});
})();
