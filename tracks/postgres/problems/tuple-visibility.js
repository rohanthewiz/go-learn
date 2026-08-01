/* MVCC: Which Tuple Version Do I See? — MVCC (Hard). PostgreSQL never
 * updates a row in place: every version carries xmin/xmax stamps, and each
 * query decides per tuple whether its snapshot can see it. The harness pins
 * the full documented decision procedure: own uncommitted inserts, xids in
 * the snapshot's in-progress list, aborted inserters, committed deleters,
 * and deletes that committed after the snapshot was taken.
 */
(function () {
	'use strict';
	var T = GoLearnPG;

	// The snapshot as a window over the xid line: everything below xmin is
	// decided, everything at/after xmax is future, and the xip list carves
	// in-progress holes out of the middle. Marker id namespaced (dgArrowPG02)
	// because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 200" width="560" height="200" role="img" aria-label="a snapshot over the xid line: xids below snapshot xmin are decided, xids at or after xmax are invisible future, xids in the xip list are invisible in-progress holes">' +
		'<text x="20" y="24" class="lbl">a snapshot is a window over the transaction-id line</text>' +
		'<line x1="30" y1="90" x2="540" y2="90" stroke="var(--edge)" stroke-width="1.5"/>' +
		// decided region
		'<rect x="30" y="70" width="150" height="40" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="105" y="63" text-anchor="middle" class="lbl">xid &lt; snap.xmin: outcome decided</text>' +
		'<text x="105" y="95" text-anchor="middle">use commit status</text>' +
		// window region
		'<rect x="180" y="70" width="220" height="40" rx="4" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="290" y="95" text-anchor="middle">maybe running: check xip</text>' +
		// xip holes
		'<circle cx="230" cy="130" r="5" fill="var(--warn)"/>' +
		'<circle cx="310" cy="130" r="5" fill="var(--warn)"/>' +
		'<text x="270" y="152" text-anchor="middle" class="lbl" style="fill:var(--warn)">xip[] — running when the snapshot was taken: invisible</text>' +
		'<path d="M 230 124 L 230 106" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowPG02)"/>' +
		'<path d="M 310 124 L 310 106" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowPG02)"/>' +
		// future region
		'<text x="470" y="63" text-anchor="middle" class="lbl">xid ≥ snap.xmax: future</text>' +
		'<text x="470" y="95" text-anchor="middle">invisible</text>' +
		'<line x1="400" y1="66" x2="400" y2="114" stroke="var(--edge)" stroke-width="1.5" stroke-dasharray="4 3"/>' +
		'<text x="20" y="184" class="lbl">a committed xid can still be invisible — commit AFTER the snapshot leaves it in xip or past xmax</text>' +
		'<defs><marker id="dgArrowPG02" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'tuple-visibility',
		title: 'MVCC: Which Tuple Version Do I See?',
		nav: 'tuple visibility',
		difficulty: 'Hard',
		category: 'MVCC',
		task: 'Implement Visible(tuple, snapshot, commitStatus, myXid): the MVCC rule deciding whether a snapshot sees a given tuple version.',

		prose: [
			'<h2>MVCC: Which Tuple Version Do I See?</h2>' +
			'<p>Two sessions, one row. Session A runs a long report; session B ' +
			'updates the row and commits mid-report. A’s query keeps returning the ' +
			'<em>old</em> value — no locks, no blocking, no error. Meanwhile ' +
			'<code>pg_stat_user_tables.n_dead_tup</code> ticks up by one. Both ' +
			'facts have the same cause: PostgreSQL never overwrites a row. An ' +
			'UPDATE writes a <em>new tuple version</em> and stamps the old one as ' +
			'deleted, and every query decides, tuple by tuple, which versions its ' +
			'snapshot is allowed to see. That decision is the heart of MVCC, and ' +
			'it is a pure function you can implement:</p>' +
			'<ul>' +
			'<li><strong>Every tuple carries two stamps.</strong> <code>xmin</code> ' +
			'— the transaction that inserted it; <code>xmax</code> — the ' +
			'transaction that deleted (or updated) it, 0 if none. You can see them: ' +
			'<code>SELECT xmin, xmax, * FROM t</code>.</li>' +
			'<li><strong>A snapshot freezes “who counts as finished”.</strong> It ' +
			'records <code>xmin</code> (every xid below this was finished when the ' +
			'snapshot was taken), <code>xmax</code> (every xid at or above this had ' +
			'not started — the future), and <code>xip[]</code>, the xids in between ' +
			'that were still running.</li>' +
			'<li><strong>Commit status is separate.</strong> The clog records ' +
			'whether each xid committed or aborted. A committed xid can still be ' +
			'invisible — it committed <em>after</em> the snapshot was taken, so the ' +
			'snapshot has it in <code>xip</code> or past its <code>xmax</code>.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>The decision procedure</h3>' +
			'<p>Insert side first: if <code>xmin</code> is my own transaction, I see ' +
			'my own uncommitted work (unless I also deleted it). Otherwise ' +
			'<code>xmin</code> must have committed <em>and</em> be visible to the ' +
			'snapshot (below <code>snap.Xmax</code>, not in <code>xip</code>). Then ' +
			'the delete side: <code>xmax = 0</code> means never deleted — visible. A ' +
			'delete by me hides it from me. A delete that aborted, is still ' +
			'running, or committed after my snapshot does <em>not</em> hide it: I ' +
			'still see the old version.</p>' +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Visible</code> and its helper ' +
			'<code>xidVisibleInSnapshot</code>. Statuses arrive as a map: ' +
			'<code>"committed"</code>, <code>"aborted"</code>, or ' +
			'<code>"in-progress"</code> (treat a missing xid as not committed).</p>',
			{ lang: 'txt', code: 'snapshot {Xmin: 100, Xmax: 110, XIP: [103, 105, 107]}   me = 107\n\ntuple {xmin: 95,  xmax: 0}    inserted long ago, committed      -> visible\ntuple {xmin: 103, xmax: 0}    committed, but in my xip          -> invisible\ntuple {xmin: 95,  xmax: 105}  deleter committed after snapshot  -> STILL visible' },
			'<div class="tip">Order matters: check “is it mine?” before consulting ' +
			'commit status — my own xid is by definition in progress, yet I must ' +
			'see my own inserts. This is why the real code ' +
			'(<code>HeapTupleSatisfiesMVCC</code>) starts every branch with a ' +
			'<code>TransactionIdIsCurrentTransactionId</code> test.</div>',
		],

		starter: [
			'package main',
			'',
			'// Tuple is one row version as stored on a heap page: the inserting',
			'// and deleting transaction ids. Xmax 0 means "never deleted".',
			'type Tuple struct {',
			'	Xmin uint32',
			'	Xmax uint32',
			'}',
			'',
			'// Snapshot is what GetSnapshotData captures: xids below Xmin were',
			'// finished at snapshot time, xids at/after Xmax had not started, and',
			'// XIP lists the in-between xids that were still running.',
			'type Snapshot struct {',
			'	Xmin uint32',
			'	Xmax uint32',
			'	XIP  []uint32',
			'}',
			'',
			'// xidVisibleInSnapshot reports whether xid\'s effects can count for',
			'// this snapshot at all: it must be below snap.Xmax and not in the',
			'// in-progress list. (Commit status is checked separately.)',
			'func xidVisibleInSnapshot(xid uint32, snap Snapshot) bool {',
			'	// your code here',
			'	return false',
			'}',
			'',
			'// Visible implements the MVCC visibility rule for one tuple version.',
			'// status maps xid -> "committed" | "aborted" | "in-progress"; treat',
			'// a missing xid as not committed. myXid is the viewing transaction.',
			'func Visible(t Tuple, snap Snapshot, status map[uint32]string, myXid uint32) bool {',
			'	// your code here: insert side (xmin) first, then delete side (xmax)',
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
			'	// One shared world: my transaction is 107; 103, 105, 107 were',
			'	// running when the snapshot was taken. The status map is "now" —',
			'	// 103 and 105 committed after the snapshot, which is exactly the',
			'	// interesting disagreement the snapshot must override.',
			'	snap := Snapshot{Xmin: 100, Xmax: 110, XIP: []uint32{103, 105, 107}}',
			'	me := uint32(107)',
			'	status := map[uint32]string{',
			'		95:  "committed",',
			'		99:  "committed",',
			'		101: "aborted",',
			'		103: "committed",   // committed AFTER the snapshot: in xip',
			'		105: "committed",   // committed AFTER the snapshot: in xip',
			'		107: "in-progress", // me',
			'		108: "in-progress",',
			'		112: "committed",   // committed, but >= snap.Xmax: the future',
			'	}',
			'	vis := func(xmin, xmax uint32) string {',
			'		return fmt.Sprintf("%v", Visible(Tuple{Xmin: xmin, Xmax: xmax}, snap, status, me))',
			'	}',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"my own uncommitted INSERT (xmin=me) is visible to me",',
			'			"true", func() string { return vis(107, 0) }},',
			'		{"inserted AND deleted by me in the same transaction: gone",',
			'			"false", func() string { return vis(107, 107) }},',
			'		{"xmin 103 committed, but it is in my xip: invisible (it was running when I looked)",',
			'			"false", func() string { return vis(103, 0) }},',
			'		{"xmin 101 aborted: the insert never happened",',
			'			"false", func() string { return vis(101, 0) }},',
			'		{"xmin 95 committed before my snapshot, never deleted: visible",',
			'			"true", func() string { return vis(95, 0) }},',
			'		{"deleted by 99, committed before my snapshot: invisible",',
			'			"false", func() string { return vis(95, 99) }},',
			'		{"deleted by 108, still in progress: I keep seeing the old version",',
			'			"true", func() string { return vis(95, 108) }},',
			'		{"deleted by 101, which aborted: the delete never happened",',
			'			"true", func() string { return vis(95, 101) }},',
			'		{"deleted by 105 — committed, but AFTER my snapshot (in xip): still visible",',
			'			"true", func() string { return vis(95, 105) }},',
			'		{"deleted by me: invisible to me even though I have not committed",',
			'			"false", func() string { return vis(95, 107) }},',
			'		{"xmin 112 committed but >= snap.Xmax: from the future, invisible",',
			'			"false", func() string { return vis(112, 0) }},',
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
			'// Tuple is one row version as stored on a heap page: the inserting',
			'// and deleting transaction ids. Xmax 0 means "never deleted".',
			'type Tuple struct {',
			'	Xmin uint32',
			'	Xmax uint32',
			'}',
			'',
			'// Snapshot is what GetSnapshotData captures: xids below Xmin were',
			'// finished at snapshot time, xids at/after Xmax had not started, and',
			'// XIP lists the in-between xids that were still running.',
			'type Snapshot struct {',
			'	Xmin uint32',
			'	Xmax uint32',
			'	XIP  []uint32',
			'}',
			'',
			'// xidVisibleInSnapshot: can xid\'s effects count for this snapshot?',
			'// Three bands, cheapest tests first — the same fast path the server',
			'// takes, because this runs once per tuple per scan:',
			'//   xid >= Xmax   -> future, never visible',
			'//   xid <  Xmin   -> finished before the snapshot, visible',
			'//   otherwise     -> visible unless it was still running (xip)',
			'// The Xmin short-circuit is why the xip scan stays cheap: only the',
			'// narrow [Xmin, Xmax) band ever reaches the list.',
			'func xidVisibleInSnapshot(xid uint32, snap Snapshot) bool {',
			'	if xid >= snap.Xmax {',
			'		return false',
			'	}',
			'	if xid < snap.Xmin {',
			'		return true',
			'	}',
			'	for _, x := range snap.XIP {',
			'		if x == xid {',
			'			return false',
			'		}',
			'	}',
			'	return true',
			'}',
			'',
			'// Visible implements HeapTupleSatisfiesMVCC in miniature: insert',
			'// side first (does this version exist for me?), then delete side',
			'// (has it been taken away from me?). Each side asks the same two',
			'// questions — did the xid commit, and did it commit before my',
			'// snapshot? — but the answers act in opposite directions: a dubious',
			'// INSERT hides the tuple, a dubious DELETE keeps it visible.',
			'func Visible(t Tuple, snap Snapshot, status map[uint32]string, myXid uint32) bool {',
			'	// --- insert side (xmin) ---',
			'	if t.Xmin == myXid {',
			'		// My own transaction: I see my uncommitted inserts. Checked',
			'		// BEFORE commit status — my xid is by definition in progress,',
			'		// yet my own work must be visible to me. The one exception:',
			'		// I also deleted it myself, so it is gone from my view.',
			'		return t.Xmax != myXid',
			'	}',
			'	if status[t.Xmin] != "committed" {',
			'		// Aborted or still running (or unknown — same thing to a',
			'		// reader): the insert has not happened as far as anyone',
			'		// else is concerned.',
			'		return false',
			'	}',
			'	if !xidVisibleInSnapshot(t.Xmin, snap) {',
			'		// Committed, but after my snapshot was taken. The clog says',
			'		// yes; my snapshot says "not for you". Snapshot wins — this',
			'		// disagreement IS snapshot isolation.',
			'		return false',
			'	}',
			'	// --- delete side (xmax) ---',
			'	if t.Xmax == 0 {',
			'		return true // never deleted',
			'	}',
			'	if t.Xmax == myXid {',
			'		return false // I deleted it; my own delete hides it from me',
			'	}',
			'	if status[t.Xmax] != "committed" {',
			'		// The deleter aborted or is still running: the delete does',
			'		// not count, the old version remains visible. This is why',
			'		// readers never block on writers.',
			'		return true',
			'	}',
			'	if !xidVisibleInSnapshot(t.Xmax, snap) {',
			'		// Delete committed after my snapshot: I keep the old view.',
			'		return true',
			'	}',
			'	// Deleted by a transaction that committed before my snapshot.',
			'	return false',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why stamps in the row instead of an undo log</h3>' +
			'<p>Oracle and MySQL/InnoDB update in place and reconstruct old ' +
			'versions from an undo log. PostgreSQL made the opposite bet: old ' +
			'versions stay in the heap, stamped with <code>xmin</code>/' +
			'<code>xmax</code>, and visibility is computed per reader. The wins: ' +
			'readers never block writers and never chase undo chains (no ' +
			'“snapshot too old” failures from undo running out), rollback is ' +
			'instant (abort just marks the xid aborted in clog — nothing to undo), ' +
			'and crash recovery never reconstructs anything. The cost is the one ' +
			'you now understand mechanically: dead tuples accumulate in the heap ' +
			'itself, and something (VACUUM) must find and reclaim them. Every ' +
			'PostgreSQL war story about bloat is downstream of this single design ' +
			'choice.</p>' +
			'<h3>What breaks in production</h3>' +
			'<ul>' +
			'<li><strong>Long-running transactions hold back the horizon.</strong> ' +
			'A dead tuple is only <em>removable</em> when no live snapshot could ' +
			'see it. One idle-in-transaction session with an old snapshot forces ' +
			'VACUUM to keep every version since — watch ' +
			'<code>pg_stat_activity.backend_xmin</code> and set ' +
			'<code>idle_in_transaction_session_timeout</code>; it exists precisely ' +
			'for this failure mode.</li>' +
			'<li><strong>Hint bits make the first read after a big load slow.</strong> ' +
			'Consulting clog per tuple is expensive, so the first reader to ' +
			'resolve a tuple’s commit status writes the answer back into the tuple ' +
			'header as a hint bit — dirtying the page. A freshly loaded table can ' +
			'generate a surprise <em>write</em> storm on its first sequential ' +
			'scan.</li>' +
			'<li><strong>Snapshot lifetime, not the visibility rule, defines the ' +
			'isolation level.</strong> READ COMMITTED takes a new snapshot per ' +
			'statement; REPEATABLE READ takes one per transaction and keeps it. ' +
			'Same <code>Visible</code> function, different snapshot lifetime — ' +
			'that is the entire difference between the two levels.</li>' +
			'</ul>' +
			'<h3>Where to see it</h3>' +
			'<p><code>SELECT xmin, xmax, ctid, * FROM t</code> shows the stamps ' +
			'live; run it from two sessions around an uncommitted UPDATE and watch ' +
			'<code>xmax</code> appear for one session while the other still reads ' +
			'the old version. <code>pg_current_snapshot()</code> prints your ' +
			'snapshot as <code>xmin:xmax:xip</code> — the exact struct you coded ' +
			'against. The real implementation is ' +
			'<code>HeapTupleSatisfiesMVCC</code> in ' +
			'<code>heapam_visibility.c</code>, plus infomask hint bits and ' +
			'subtransaction handling this exercise deliberately omits.</p>',
		],
		complexity: { time: 'O(|xip|) per tuple — two banded range checks plus a scan of the in-progress list', space: 'O(1)' },
	});
})();
