/* MVCC Snapshots — Inside the Engine (Hard). Readers never block writers
 * because a write APPENDS a version instead of overwriting, and a snapshot
 * is nothing but a number. The learner builds the versioned store — Put
 * stamps a monotonic version, Snapshot() returns the counter in O(1),
 * Get(key, snap) binary-searches for the latest version <= snap — and the
 * final case shows the real engine's sessions doing exactly the same thing
 * (an uncommitted UPDATE invisible to a concurrent reader).
 */
(function () {
	'use strict';
	var T = GoLearnDB;

	// One key, many versions: two snapshot lines pinned at different counter
	// values keep reading different versions of the same key, forever.
	// Marker ids namespaced (dgArrowDBMV*) because every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 580 232" width="580" height="232" role="img" aria-label="versions 3, 5 and 9 of one key on a version axis; snapshot A at 6 reads version 5, snapshot B at 10 reads version 9">' +
		'<text x="16" y="20" class="lbl">one key, many versions — a write APPENDS, it never overwrites</text>' +
		// the version chain for key "color"
		'<rect x="40" y="56" width="110" height="44" rx="6" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="95" y="74" text-anchor="middle">ver 3</text>' +
		'<text x="95" y="92" text-anchor="middle" class="lbl">color = red</text>' +
		'<rect x="210" y="56" width="110" height="44" rx="6" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="265" y="74" text-anchor="middle">ver 5</text>' +
		'<text x="265" y="92" text-anchor="middle" class="lbl">color = blue</text>' +
		'<rect x="380" y="56" width="110" height="44" rx="6" fill="none" stroke="var(--edge)" stroke-width="2"/>' +
		'<text x="435" y="74" text-anchor="middle">ver 9</text>' +
		'<text x="435" y="92" text-anchor="middle" class="lbl">color = green</text>' +
		// snapshot A = 6: pinned between ver 5 and ver 9, reads ver 5
		'<path d="M 350 40 L 350 176" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="350" y="34" text-anchor="middle" class="lbl" style="fill:var(--warn)">snapshot A = 6</text>' +
		'<path d="M 350 122 C 330 128 310 116 326 102" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowDBMVw)"/>' +
		'<text x="346" y="140" text-anchor="end" class="lbl" style="fill:var(--warn)">latest ver &#8804; 6 &#8594; ver 5</text>' +
		// snapshot B = 10: after ver 9, reads ver 9
		'<path d="M 520 40 L 520 176" stroke="var(--ok)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="520" y="34" text-anchor="middle" class="lbl" style="fill:var(--ok)">snapshot B = 10</text>' +
		'<path d="M 520 122 C 500 128 480 116 496 102" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowDBMVok)"/>' +
		'<text x="516" y="140" text-anchor="end" class="lbl" style="fill:var(--ok)">latest ver &#8804; 10 &#8594; ver 9</text>' +
		// the version axis
		'<path d="M 20 176 L 560 176" stroke="var(--edge)" stroke-width="1.2" marker-end="url(#dgArrowDBMV)"/>' +
		'<path d="M 95 100 L 95 176" stroke="var(--edge)" stroke-width="1" stroke-dasharray="2 4"/>' +
		'<path d="M 265 100 L 265 176" stroke="var(--edge)" stroke-width="1" stroke-dasharray="2 4"/>' +
		'<path d="M 435 100 L 435 176" stroke="var(--edge)" stroke-width="1" stroke-dasharray="2 4"/>' +
		'<text x="556" y="192" text-anchor="end" class="lbl">version counter (monotonic)</text>' +
		'<text x="16" y="216" class="lbl">Snapshot() just returns the counter — O(1), no copy, no lock. Later Puts append ver 11, 12, &#8230; and neither A nor B ever notices.</text>' +
		'<defs>' +
		'<marker id="dgArrowDBMV" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowDBMVw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'<marker id="dgArrowDBMVok" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'mvcc-snapshots',
		title: 'MVCC: Snapshots Without Locks',
		nav: 'MVCC snapshots',
		difficulty: 'Hard',
		category: 'Inside the Engine',
		task: 'Build the versioned store: Put stamps a monotonically increasing version, Snapshot() returns the counter in O(1), Get(key, snap) reads the latest version <= snap.',

		prose: [
			'<h2>MVCC: Snapshots Without Locks</h2>' +
			'<p>Friday, 4pm: analytics kicks off its hour-long revenue report ' +
			'while checkout keeps writing thousands of rows a second — and ' +
			'neither notices the other. In the lock-based mental model this is ' +
			'impossible: a reader that wants a consistent hour-long view must ' +
			'lock everything it reads, and every writer piles up behind it. Yet ' +
			'<code>pg_dump</code> backs up a live multi-terabyte Postgres the same ' +
			'way every night. The trick is that modern engines almost never let a ' +
			'write <em>overwrite</em> anything:</p>' +
			'<ul>' +
			'<li><strong>Writes create versions.</strong> An UPDATE does not ' +
			'touch the old value — it appends a new version of the row, stamped ' +
			'with a number from a monotonically increasing counter. The old ' +
			'version stays exactly where it was.</li>' +
			'<li><strong>A snapshot is just a number.</strong> Because state ' +
			'&ldquo;as of counter value S&rdquo; can never change again — later ' +
			'writes only add versions with <em>larger</em> stamps — remembering S ' +
			'is remembering the entire database at that instant. Taking a ' +
			'snapshot is O(1): no copy, no lock, no coordination.</li>' +
			'<li><strong>Reading at a snapshot</strong> means: for each key, the ' +
			'latest version whose stamp is &#8804; S. Uncommitted or later writes ' +
			'have larger stamps, so they are invisible — which is why readers ' +
			'never block writers and writers never block readers.</li>' +
			'<li><strong>The bill arrives as garbage.</strong> Versions nobody ' +
			'can see anymore (older than every live snapshot) are dead weight; ' +
			'some background process must reclaim them. That process is the ' +
			'engine&rsquo;s Achilles&rsquo; heel — hold a snapshot for a day and ' +
			'nothing written since can be cleaned up.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Build that store. <code>Put</code> stamps the write with the next ' +
			'counter value and appends it to the key&rsquo;s version chain; ' +
			'<code>Snapshot</code> returns the counter — O(1), by contract; ' +
			'<code>Get(key, snap)</code> returns the latest version of ' +
			'<code>key</code> with stamp &#8804; <code>snap</code>, reporting ' +
			'<code>false</code> when the key had no version yet. Chains are ' +
			'appended in stamp order, so they are always sorted — ' +
			'<code>Get</code> should exploit that.</p>' +
			'<div class="tip">The last test aims the same idea at the real ' +
			'engine: a session holding an open transaction UPDATEs a row, and a ' +
			'second session — reading on its own snapshot — still sees the old ' +
			'value until COMMIT. Your toy and bytdb give the same answers ' +
			'because they run the same design.</div>',
		],

		starter: [
			'package main',
			'',
			'// version is one stamped write: the value plus the global write',
			'// counter at the moment Put ran. A key\'s versions are appended in',
			'// counter order, so each chain is always sorted ascending by ver —',
			'// a fact Get is allowed to exploit.',
			'type version struct {',
			'	ver int',
			'	val string',
			'}',
			'',
			'// Store is a toy MVCC store. The struct IS the design:',
			'//',
			'//   - writes never overwrite: they append to the key\'s version chain',
			'//   - a "snapshot" is NOT a copy of anything — it is just the counter',
			'//     value at the moment it was taken (that is why it can be O(1))',
			'//   - a read at snapshot S sees, per key, the latest version with',
			'//     ver <= S, and is therefore immune to every later write',
			'type Store struct {',
			'	versions map[string][]version // per-key version chains, oldest first',
			'	current  int                  // last version stamped; 0 = before any write',
			'}',
			'',
			'func NewStore() *Store {',
			'	return &Store{versions: make(map[string][]version)}',
			'}',
			'',
			'// Put stamps the write with the next version number and appends it',
			'// to key\'s chain. It must never modify or remove existing versions:',
			'// live snapshots may still be pointed at them.',
			'func (s *Store) Put(key, val string) {',
			'	// your code here',
			'}',
			'',
			'// Snapshot returns a token with which a reader sees the store',
			'// exactly as it is at this instant — forever. Must be O(1): no',
			'// copying, no iteration.',
			'func (s *Store) Snapshot() int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Get returns the value key had at snapshot snap: the latest version',
			'// of key with ver <= snap. ok is false if key had no version yet at',
			'// that snapshot (never written, or written only after snap).',
			'func (s *Store) Get(key string, snap int) (string, bool) {',
			'	// your code here',
			'	return "", false',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"os"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/sql"',
			')',
			'',
			T.HARNESS_RT,
			'',
			T.DB_RT,
			'',
			'// sessExec mirrors mustExec for session-scoped SQL — transaction',
			'// blocks (BEGIN/COMMIT) require a session; a bare db.Exec autocommits',
			'// and refuses them.',
			'func sessExec(s *sql.Session, q string) *sql.Result {',
			'	res, err := s.Exec(q)',
			'	if err != nil {',
			'		panic(fmt.Sprintf("session SQL %q: %v", q, err))',
			'	}',
			'	return res',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"a snapshot taken before an overwrite keeps reading the old value",',
			'			"before=red,true now=blue,true",',
			'			func() string {',
			'				st := NewStore()',
			'				st.Put("color", "red")',
			'				before := st.Snapshot()',
			'				st.Put("color", "blue") // overwrite AFTER the snapshot',
			'				v1, ok1 := st.Get("color", before)',
			'				v2, ok2 := st.Get("color", st.Snapshot())',
			'				return fmt.Sprintf("before=%s,%v now=%s,%v", v1, ok1, v2, ok2)',
			'			}},',
			'		{"a snapshot never sees keys created after it was taken",',
			'			"atSnap=false now=true",',
			'			func() string {',
			'				st := NewStore()',
			'				st.Put("existing", "x")',
			'				snap := st.Snapshot()',
			'				st.Put("later", "y")',
			'				_, okThen := st.Get("later", snap)',
			'				_, okNow := st.Get("later", st.Snapshot())',
			'				return fmt.Sprintf("atSnap=%v now=%v", okThen, okNow)',
			'			}},',
			'		{"two interleaved snapshots read independently",',
			'			"A=v1 B=v2 latest=v3",',
			'			func() string {',
			'				st := NewStore()',
			'				st.Put("x", "v1")',
			'				snapA := st.Snapshot()',
			'				st.Put("x", "v2")',
			'				snapB := st.Snapshot()',
			'				st.Put("x", "v3")',
			'				a, _ := st.Get("x", snapA)',
			'				b, _ := st.Get("x", snapB)',
			'				latest, _ := st.Get("x", st.Snapshot())',
			'				return fmt.Sprintf("A=%s B=%s latest=%s", a, b, latest)',
			'			}},',
			'		{"a key that was never written is absent at every snapshot",',
			'			"val=\\"\\" ok=false",',
			'			func() string {',
			'				st := NewStore()',
			'				st.Put("real", "1")',
			'				v, ok := st.Get("ghost", st.Snapshot())',
			'				return fmt.Sprintf("val=%q ok=%v", v, ok)',
			'			}},',
			'		{"the empty snapshot (version 0, before any write) sees nothing",',
			'			"ok=false",',
			'			func() string {',
			'				st := NewStore()',
			'				snap0 := st.Snapshot() // taken on a virgin store',
			'				st.Put("k", "v")',
			'				_, ok := st.Get("k", snap0)',
			'				return fmt.Sprintf("ok=%v", ok)',
			'			}},',
			'		{"versions are stamped monotonically: each of 60 snapshots replays its own moment",',
			'			"monotonic=true everySnapshotReadsItsOwnWrite=true",',
			'			func() string {',
			'				st := NewStore()',
			'				snaps := make([]int, 0, 60)',
			'				for i := 0; i < 60; i++ {',
			'					st.Put("counter", fmt.Sprintf("v%d", i))',
			'					snaps = append(snaps, st.Snapshot())',
			'				}',
			'				monotonic := true',
			'				for i := 1; i < 60; i++ {',
			'					if snaps[i] <= snaps[i-1] {',
			'						monotonic = false',
			'					}',
			'				}',
			'				readsOwn := true',
			'				for i := 0; i < 60; i++ {',
			'					v, ok := st.Get("counter", snaps[i])',
			'					if !ok || v != fmt.Sprintf("v%d", i) {',
			'						readsOwn = false',
			'					}',
			'				}',
			'				return fmt.Sprintf("monotonic=%v everySnapshotReadsItsOwnWrite=%v", monotonic, readsOwn)',
			'			}},',
			'		{"the real engine: an uncommitted UPDATE is invisible to another session\'s snapshot",',
			'			"uncommitted: writer=[[blue]] reader=[[red]]; after commit: reader=[[blue]]",',
			'			func() string {',
			'				db, cleanup := openDB("mvcc-snapshots")',
			'				defer cleanup()',
			'				mustExec(db, "CREATE TABLE kv (k TEXT PRIMARY KEY, v TEXT)")',
			'				mustExec(db, "INSERT INTO kv VALUES (\'color\', \'red\')")',
			'				writer := db.NewSession()',
			'				reader := db.NewSession()',
			'				sessExec(writer, "BEGIN")',
			'				sessExec(writer, "UPDATE kv SET v = \'blue\' WHERE k = \'color\'")',
			'				// The writer reads its own uncommitted version; the',
			'				// reader\'s snapshot predates it — same rule as the toy.',
			'				w := sessExec(writer, "SELECT v FROM kv WHERE k = \'color\'")',
			'				r1 := sessExec(reader, "SELECT v FROM kv WHERE k = \'color\'")',
			'				sessExec(writer, "COMMIT")',
			'				r2 := sessExec(reader, "SELECT v FROM kv WHERE k = \'color\'")',
			'				return fmt.Sprintf("uncommitted: writer=%s reader=%s; after commit: reader=%s",',
			'					rowsStr(w), rowsStr(r1), rowsStr(r2))',
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
			'// version is one stamped write: the value plus the global write',
			'// counter at the moment Put ran. A key\'s versions are appended in',
			'// counter order, so each chain is always sorted ascending by ver —',
			'// a fact Get is allowed to exploit.',
			'type version struct {',
			'	ver int',
			'	val string',
			'}',
			'',
			'// Store is a toy MVCC store. The struct IS the design:',
			'//',
			'//   - writes never overwrite: they append to the key\'s version chain',
			'//   - a "snapshot" is NOT a copy of anything — it is just the counter',
			'//     value at the moment it was taken (that is why it can be O(1))',
			'//   - a read at snapshot S sees, per key, the latest version with',
			'//     ver <= S, and is therefore immune to every later write',
			'type Store struct {',
			'	versions map[string][]version // per-key version chains, oldest first',
			'	current  int                  // last version stamped; 0 = before any write',
			'}',
			'',
			'func NewStore() *Store {',
			'	return &Store{versions: make(map[string][]version)}',
			'}',
			'',
			'// Put stamps the write with the next version number and appends it',
			'// to key\'s chain.',
			'//',
			'// Increment BEFORE appending, so the first write is version 1 and',
			'// version 0 stays reserved for "the empty store" — that reservation',
			'// is what lets a snapshot taken before any write fall out of Get',
			'// with no special case (no version has ver <= 0). Append-only is',
			'// the invariant everything else rests on: old versions are frozen',
			'// because live snapshots may still resolve to them.',
			'func (s *Store) Put(key, val string) {',
			'	s.current++',
			'	s.versions[key] = append(s.versions[key], version{ver: s.current, val: val})',
			'}',
			'',
			'// Snapshot is the punchline of MVCC. Because writes only ever ADD',
			'// versions with larger stamps, "the state at counter value S" is',
			'// immutable the instant S is in the past — so remembering S is',
			'// remembering the whole database at that moment. No copy, no lock.',
			'func (s *Store) Snapshot() int {',
			'	return s.current',
			'}',
			'',
			'// Get resolves key at snapshot snap: the latest version with',
			'// ver <= snap.',
			'//',
			'// The chain is sorted ascending (Put appends with an increasing',
			'// stamp), so binary search applies: find the first version AFTER',
			'// the snapshot; everything left of it is visible. lo lands on the',
			'// count of visible versions —',
			'//',
			'//	chain: [ver 3] [ver 5] [ver 9]     snap = 6',
			'//	                        ^ first ver > 6, lo = 2',
			'//	answer = chain[lo-1] = ver 5',
			'//',
			'// and lo == 0 means no version existed yet at snap: the key is',
			'// absent from that snapshot\'s world, however many later versions',
			'// exist.',
			'func (s *Store) Get(key string, snap int) (string, bool) {',
			'	chain := s.versions[key]',
			'	lo := 0',
			'	hi := len(chain)',
			'	for lo < hi {',
			'		mid := (lo + hi) / 2',
			'		if chain[mid].ver <= snap {',
			'			lo = mid + 1',
			'		} else {',
			'			hi = mid',
			'		}',
			'	}',
			'	if lo == 0 {',
			'		return "", false',
			'	}',
			'	return chain[lo-1].val, true',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The same design, three engines</h3>' +
			'<p>Your <code>Store</code> is the skeleton of what answered the last ' +
			'test case. bytdb&rsquo;s key-value layer (btypedb) keeps its tree ' +
			'copy-on-write: a writer never mutates a node a reader could be ' +
			'holding, so a snapshot really is O(1) — pin the current root and ' +
			'counter, and every read through that root sees one frozen moment. ' +
			'That is why the reader session answered <code>red</code> instantly ' +
			'while the writer&rsquo;s transaction held the single-writer lock: ' +
			'reads on snapshots need no lock at all.</p>' +
			'<p>Postgres runs the same idea with different plumbing: row versions ' +
			'(&ldquo;tuples&rdquo;) live <em>in the heap table itself</em>, each ' +
			'stamped with the creating and deleting transaction ids ' +
			'(<code>xmin</code>/<code>xmax</code>), and a snapshot is the set of ' +
			'transaction ids in flight at the moment it was taken. Visibility is ' +
			'your <code>ver &#8804; snap</code> test, generalized to ' +
			'&ldquo;committed before my snapshot and not deleted before it&rdquo;. ' +
			'InnoDB inverts the layout — the heap holds only the newest version ' +
			'and old ones are reconstructed from undo logs — but the contract is ' +
			'identical.</p>' +
			'<h3>What it costs</h3>' +
			'<p>MVCC trades write amplification for read concurrency. Every ' +
			'UPDATE grows storage even when the value shrinks; a counter row ' +
			'updated a million times is a million dead tuples until something ' +
			'reclaims them. That something — Postgres <code>VACUUM</code>, ' +
			'InnoDB&rsquo;s purge threads, btypedb&rsquo;s compaction — can only ' +
			'free versions older than <em>every</em> live snapshot. Hence the ' +
			'classic production incident: one forgotten ' +
			'<code>idle in transaction</code> connection pins a snapshot for a ' +
			'weekend, vacuum silently reclaims nothing, tables bloat to several ' +
			'times their size, and the &ldquo;database is slow&rdquo; page goes ' +
			'out Monday morning. Monitoring long-lived transactions ' +
			'(<code>pg_stat_activity.xact_start</code>, InnoDB history list ' +
			'length) is monitoring exactly the number your ' +
			'<code>Snapshot()</code> returns.</p>' +
			'<h3>Why lo == 0 mattered</h3>' +
			'<p>The empty-snapshot case is not pedantry — it is the difference ' +
			'between &ldquo;key absent&rdquo; and &ldquo;key not yet visible&rdquo; ' +
			'collapsing into one rule. Real engines lean on the same collapse: a ' +
			'row inserted after your snapshot and a row that never existed are ' +
			'indistinguishable to your transaction, which is precisely what makes ' +
			'a snapshot a <em>consistent</em> read and not merely a cached ' +
			'one.</p>',
		],
		complexity: { time: 'Put/Snapshot O(1); Get O(log V) over a key’s V versions', space: 'O(total versions retained) — the MVCC bill, until GC reclaims dead ones' },
	});
})();
