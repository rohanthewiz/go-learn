/* Rollback Journal vs WAL — Durability (Medium). SQLite's two commit
 * protocols, modeled over a page store: the rollback journal copies
 * ORIGINAL pages aside and commits by deleting the journal, so a crash
 * with a journal present rolls back — even if every db page was already
 * written. WAL appends NEW page versions and commits with a commit
 * frame; readers take the newest committed frame, else the db file.
 * The harness crashes a transaction at every phase of both protocols
 * and pins what recovery must return.
 */
(function () {
	'use strict';
	var T = GoLearnSQ;

	// The two timelines, with the commit point marked — everything before
	// it rolls back, everything after is durable. Marker id namespaced
	// (dgArrowSQ08) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="rollback journal timeline: copy originals to journal, overwrite db pages, then DELETING the journal is the commit point; WAL timeline: append new page versions, then the commit frame is the commit point; checkpoint later copies frames into the db">' +
		'<text x="20" y="22" class="lbl">rollback journal — the COMMIT is the journal delete</text>' +
		'<rect x="20" y="34" width="130" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="85" y="57" text-anchor="middle" style="font-size:12px">copy originals → journal</text>' +
		'<path d="M 150 52 L 172 52" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ08)"/>' +
		'<rect x="176" y="34" width="130" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="241" y="57" text-anchor="middle" style="font-size:12px">overwrite db in place</text>' +
		'<path d="M 306 52 L 328 52" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ08)"/>' +
		'<rect x="332" y="34" width="130" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="397" y="57" text-anchor="middle" style="font-size:12px">DELETE journal ★</text>' +
		'<text x="20" y="92" class="lbl" style="fill:var(--warn)">crash anywhere left of ★ → journal exists → recovery copies originals back: ROLLBACK</text>' +
		'<text x="20" y="126" class="lbl">WAL — the commit is one appended frame; the db file is untouched</text>' +
		'<rect x="20" y="138" width="130" height="36" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="85" y="161" text-anchor="middle" style="font-size:12px">append new versions</text>' +
		'<path d="M 150 156 L 172 156" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ08)"/>' +
		'<rect x="176" y="138" width="130" height="36" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="241" y="161" text-anchor="middle" style="font-size:12px">commit frame ★</text>' +
		'<path d="M 306 156 L 328 156" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowSQ08)"/>' +
		'<rect x="332" y="138" width="130" height="36" rx="5" fill="none" stroke="var(--edge)" stroke-width="2" stroke-dasharray="5 4"/>' +
		'<text x="397" y="161" text-anchor="middle" style="font-size:12px">checkpoint (later)</text>' +
		'<text x="20" y="198" class="lbl" style="fill:var(--warn)">crash left of ★ → frames have no commit record → recovery IGNORES them: rollback for free</text>' +
		'<defs><marker id="dgArrowSQ08" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'journal-vs-wal',
		title: 'Rollback Journal vs WAL',
		nav: 'journal vs wal',
		difficulty: 'Medium',
		category: 'Durability',
		task: 'Model both commit protocols over a page store: Recover returns the page contents visible after a crash at each protocol phase; WALRead resolves a page to its newest committed WAL frame, else the db file.',

		prose: [
			'<h2>Rollback Journal vs WAL</h2>' +
			'<p>After a power cut, a server comes back up and next to ' +
			'<code>app.db</code> sits a file you did not create: ' +
			'<code>app.db-journal</code>. A well-meaning cleanup script wants to ' +
			'delete it. <strong>That delete would corrupt the database.</strong> ' +
			'The journal holds the <em>original</em> content of every page a ' +
			'crashed transaction touched — it is the undo log, and opening the ' +
			'database replays it. Understanding why requires seeing both commit ' +
			'protocols as page-level algorithms:</p>',
			{ lang: 'txt', code: 'ROLLBACK JOURNAL (the default)\n  1. copy each to-be-modified page\'s ORIGINAL bytes into db-journal; sync\n  2. overwrite the db pages in place; sync\n  3. delete the journal            <- THIS is the commit point\n  crash recovery: journal present? copy originals back, then delete it.\n  a fully-written db file still rolls back if the journal survives.\n\nWAL (write-ahead log)\n  1. append NEW versions of modified pages as frames to db-wal\n  2. append the last frame marked as a COMMIT frame   <- commit point\n  3. (later) checkpoint: copy committed frames into the db, reset the wal\n  crash recovery: frames after the last commit frame never happened.\n  readers: newest committed frame for a page wins, else the db file.' },
			'<ul>' +
			'<li><strong>The commit points could not be more different.</strong> ' +
			'Journal mode commits by <em>deleting a file</em> — an atomic ' +
			'filesystem operation. WAL commits by <em>appending one frame</em> — ' +
			'an atomic-enough write. Everything else in each protocol exists to ' +
			'make that single step the boundary between "never happened" and ' +
			'"durable".</li>' +
			'<li><strong>Journal mode writes twice, in place.</strong> Original ' +
			'pages go to the journal, new pages over the old — so readers must ' +
			'be locked out while the db file is inconsistent (the locking ' +
			'lesson). </li>' +
			'<li><strong>WAL never touches the db file during a commit.</strong> ' +
			'New versions pile up in the log; the db file stays consistent, so ' +
			'readers keep reading it <em>during</em> a write. The price is the ' +
			'read-path indirection you will implement in ' +
			'<code>WALRead</code>, and an eventual checkpoint.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p><code>Recover(mode, initial, writes, crash)</code> returns the ' +
			'page map a fresh process sees after crashing at a named phase — ' +
			'journal phases <code>before-journal</code>, ' +
			'<code>journal-written</code>, <code>db-written</code> (db fully ' +
			'overwritten, journal still present!), <code>committed</code>; WAL ' +
			'phases <code>before-append</code>, <code>frames-appended</code>, ' +
			'<code>committed</code>, <code>checkpointed</code>. Unknown modes or ' +
			'phases are errors. <code>WALRead(db, frames, page)</code> resolves ' +
			'one page against a WAL: the newest frame for that page at or before ' +
			'the last commit frame, else the db file’s copy.</p>' +
			'<div class="tip">The teaching case is <code>db-written</code>: every ' +
			'data page already holds the new bytes, and recovery still must ' +
			'return the old ones. Durability is decided by the journal’s ' +
			'existence, not by what the data pages say.</div>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// Frame is one page version appended to the WAL. A frame with',
			'// Commit=true ends a transaction: it and everything before it are',
			'// durable; frames after the last commit frame never happened.',
			'type Frame struct {',
			'	Page    int',
			'	Content string',
			'	Commit  bool',
			'}',
			'',
			'// Recover returns the page contents visible after crash recovery.',
			'//',
			'//   mode "journal": before-journal | journal-written | db-written | committed',
			'//   mode "wal":     before-append | frames-appended | committed | checkpointed',
			'//',
			'// initial is the db before the transaction; writes are the pages the',
			'// transaction changed. Return a FRESH map (never alias the inputs).',
			'// Unknown mode or crash phase: error.',
			'func Recover(mode string, initial map[int]string, writes map[int]string, crash string) (map[int]string, error) {',
			'	_ = errors.New // keep the import while the body is unwritten',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
			'// WALRead resolves one page against a WAL: scan for the last commit',
			'// frame; the newest frame for the page at or before it wins;',
			'// otherwise the db file\'s copy. (Real SQLite builds a hash index',
			'// over the frames — the wal-index — instead of scanning.)',
			'func WALRead(db map[int]string, frames []Frame, page int) string {',
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
			'	"sort"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'// fmtPages renders a page map deterministically: keys sorted.',
			'func fmtPages(m map[int]string, err error) string {',
			'	if err != nil {',
			'		return "error"',
			'	}',
			'	keys := make([]int, 0, len(m))',
			'	for k := range m {',
			'		keys = append(keys, k)',
			'	}',
			'	sort.Ints(keys)',
			'	out := ""',
			'	for i, k := range keys {',
			'		if i > 0 {',
			'			out += " "',
			'		}',
			'		out += fmt.Sprintf("p%d=%s", k, m[k])',
			'	}',
			'	return out',
			'}',
			'',
			'func main() {',
			'	// A 3-page db; the transaction rewrites pages 2 and 3.',
			'	initial := map[int]string{1: "hdr", 2: "alice", 3: "bob"}',
			'	writes := map[int]string{2: "ALICE", 3: "BOB"}',
			'	old := "p1=hdr p2=alice p3=bob"',
			'	fresh := "p1=hdr p2=ALICE p3=BOB"',
			'',
			'	// A WAL with two committed transactions touching page 2, then an',
			'	// uncommitted tail frame that must be invisible.',
			'	wal := []Frame{',
			'		{Page: 2, Content: "v1", Commit: false},',
			'		{Page: 3, Content: "x1", Commit: true},  // txn 1 commits',
			'		{Page: 2, Content: "v2", Commit: true},  // txn 2 commits',
			'		{Page: 2, Content: "v3-uncommitted", Commit: false},',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"journal: crash before anything was journaled — old data",',
			'			old,',
			'			func() string { return fmtPages(Recover("journal", initial, writes, "before-journal")) }},',
			'		{"journal: crash with journal written, db untouched — rollback to old",',
			'			old,',
			'			func() string { return fmtPages(Recover("journal", initial, writes, "journal-written")) }},',
			'		{"journal: db FULLY overwritten but journal still present — STILL rolls back",',
			'			old,',
			'			func() string { return fmtPages(Recover("journal", initial, writes, "db-written")) }},',
			'		{"journal: journal deleted = committed — new data",',
			'			fresh,',
			'			func() string { return fmtPages(Recover("journal", initial, writes, "committed")) }},',
			'		{"wal: crash before any frame was appended — old data",',
			'			old,',
			'			func() string { return fmtPages(Recover("wal", initial, writes, "before-append")) }},',
			'		{"wal: frames appended but no commit frame — recovery ignores them",',
			'			old,',
			'			func() string { return fmtPages(Recover("wal", initial, writes, "frames-appended")) }},',
			'		{"wal: commit frame written — durable, even though the db file is stale",',
			'			fresh,',
			'			func() string { return fmtPages(Recover("wal", initial, writes, "committed")) }},',
			'		{"wal: after checkpoint — same contents, now in the db file itself",',
			'			fresh,',
			'			func() string { return fmtPages(Recover("wal", initial, writes, "checkpointed")) }},',
			'		{"phase names are per-protocol: journal has no \'frames-appended\'",',
			'			"error",',
			'			func() string { return fmtPages(Recover("journal", initial, writes, "frames-appended")) }},',
			'		{"unknown mode is an error",',
			'			"error",',
			'			func() string { return fmtPages(Recover("memory", initial, writes, "committed")) }},',
			'		{"WALRead: newest COMMITTED frame for page 2 wins (v2, not v1)",',
			'			"v2",',
			'			func() string { return WALRead(initial, wal, 2) }},',
			'		{"WALRead: the uncommitted tail frame (v3) must be invisible",',
			'			"v2",',
			'			func() string { return WALRead(initial, wal, 2) }},',
			'		{"WALRead: page 1 has no committed frame — served from the db file",',
			'			"hdr",',
			'			func() string { return WALRead(initial, wal, 1) }},',
			'		{"WALRead: empty WAL — everything comes from the db file",',
			'			"bob",',
			'			func() string { return WALRead(initial, nil, 3) }},',
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
			'// Frame is one page version appended to the WAL; Commit=true marks',
			'// the frame that ends (and durably commits) a transaction.',
			'type Frame struct {',
			'	Page    int',
			'	Content string',
			'	Commit  bool',
			'}',
			'',
			'// pagesCopy / pagesApply build result maps. Recovery must return',
			'// fresh maps: recovery REconstructs state, it never hands back a',
			'// live reference the caller could mutate into the "crashed" inputs.',
			'func pagesCopy(m map[int]string) map[int]string {',
			'	out := make(map[int]string, len(m))',
			'	for k, v := range m {',
			'		out[k] = v',
			'	}',
			'	return out',
			'}',
			'',
			'func pagesApply(initial, writes map[int]string) map[int]string {',
			'	out := pagesCopy(initial)',
			'	for k, v := range writes {',
			'		out[k] = v',
			'	}',
			'	return out',
			'}',
			'',
			'// Recover maps (protocol, crash phase) -> visible pages. Each',
			'// protocol reduces to ONE question, which is the entire lesson:',
			'//   journal: does the journal file still exist?  yes -> old state',
			'//   wal:     was the commit frame appended?      no  -> old state',
			'func Recover(mode string, initial map[int]string, writes map[int]string, crash string) (map[int]string, error) {',
			'	if mode == "journal" {',
			'		if crash == "before-journal" || crash == "journal-written" || crash == "db-written" {',
			'			// All three pre-commit phases converge: the journal',
			'			// exists, so recovery copies the originals back over',
			'			// whatever the data pages currently hold. db-written is',
			'			// the striking one — every page already has new bytes,',
			'			// and they are all discarded.',
			'			return pagesCopy(initial), nil',
			'		}',
			'		if crash == "committed" {',
			'			// The journal delete happened; there is nothing to undo.',
			'			return pagesApply(initial, writes), nil',
			'		}',
			'		return nil, errors.New("journal: unknown crash phase " + crash)',
			'	}',
			'	if mode == "wal" {',
			'		if crash == "before-append" || crash == "frames-appended" {',
			'			// Frames without a commit frame are trailing garbage;',
			'			// recovery truncates them. Note the symmetry inversion:',
			'			// the journal must ACT to undo, the WAL undoes by',
			'			// IGNORING — rollback is free in WAL mode.',
			'			return pagesCopy(initial), nil',
			'		}',
			'		if crash == "committed" || crash == "checkpointed" {',
			'			// Committed frames are durable whether or not the',
			'			// checkpoint copied them into the db file yet — readers',
			'			// resolve through the WAL either way (see WALRead).',
			'			return pagesApply(initial, writes), nil',
			'		}',
			'		return nil, errors.New("wal: unknown crash phase " + crash)',
			'	}',
			'	return nil, errors.New("unknown journal mode " + mode)',
			'}',
			'',
			'// WALRead is the WAL-mode read path for one page. Two backward',
			'// scans: find the last commit frame (the durability horizon), then',
			'// the newest frame for this page at or before it. Backwards,',
			'// because "newest wins" makes the first match from the tail the',
			'// answer.',
			'func WALRead(db map[int]string, frames []Frame, page int) string {',
			'	horizon := -1',
			'	for i := len(frames) - 1; i >= 0; i-- {',
			'		if frames[i].Commit {',
			'			horizon = i',
			'			break',
			'		}',
			'	}',
			'	for i := horizon; i >= 0; i-- {',
			'		if frames[i].Page == page {',
			'			return frames[i].Content',
			'		}',
			'	}',
			'	// No committed version in the log: the db file is authoritative.',
			'	return db[page]',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why WAL took over</h3>' +
			'<p>In journal mode a writer must exclude all readers while the db ' +
			'file is inconsistent (steps 2–3), and every reader excludes the ' +
			'writer’s final step — on a busy mixed workload this shows up as the ' +
			'infamous <code>database is locked</code>. WAL inverts the data flow: ' +
			'the db file is never inconsistent, so <strong>readers never block ' +
			'the writer and the writer never blocks readers</strong> — each ' +
			'reader just fixes its durability horizon (the last commit frame at ' +
			'the moment it starts) and reads a stable snapshot through your ' +
			'<code>WALRead</code> logic. Commits are also faster: one fsync of ' +
			'an append-only file instead of journal-sync + db-sync + delete. ' +
			'That is why nearly every framework ships <code>PRAGMA ' +
			'journal_mode=WAL</code> as its first tuning step.</p>' +
			'<h3>What WAL costs</h3>' +
			'<p>The checkpoint is deferred work: someone must eventually fold ' +
			'frames back into the db (by default automatically at ~1000 pages, ' +
			'visible via <code>PRAGMA wal_checkpoint(TRUNCATE)</code>), and a ' +
			'long-lived reader pins its horizon, letting <code>-wal</code> grow ' +
			'unboundedly — the classic “my WAL file is 40× the database” ' +
			'incident. WAL also needs the <code>-shm</code> shared-memory index ' +
			'so readers can find “the newest committed frame for page P” without ' +
			'your linear scan, which is why WAL databases cannot live on ' +
			'filesystems without shared memory (many network mounts). And a ' +
			'crashed WAL database now has TWO sidecar files that must travel ' +
			'with it — copying <code>app.db</code> without <code>app.db-wal</code> ' +
			'silently drops every committed-but-uncheckpointed transaction.</p>' +
			'<h3>Back to the hook</h3>' +
			'<p>The answer to the cleanup script: a <code>-journal</code> file ' +
			'after a crash is a <em>hot journal</em> — the undo record recovery ' +
			'needs. Delete it and the half-written pages in the db file become ' +
			'permanent: silent corruption, found weeks later by ' +
			'<code>PRAGMA integrity_check</code>. The only correct cleanup is to ' +
			'open the database with sqlite3 itself, which replays and removes ' +
			'the journal atomically. The same rule holds for <code>-wal</code>: ' +
			'sidecar files are part of the database, and the pair (db, sidecar) ' +
			'must be copied, moved, and deleted as one unit.</p>',
		],
		complexity: { time: 'O(pages) per recovery; O(frames) per WALRead (the real wal-index makes it O(1))', space: 'O(pages) for the recovered map' },
	});
})();
