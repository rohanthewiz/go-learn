/* Transactions — btypedb: Transactions (Medium). The write path: a tx
 * stages ops privately (own-write visibility for Get), Commit applies them
 * to the base atomically as one batch, Rollback discards. Savepoints are
 * positions in the staged-op log: RollbackTo truncates past the mark — so
 * the eventual commit logs exactly the surviving writes — and rolling back
 * to an earlier mark destroys later ones. The harness pins isolation,
 * own-write reads, batch contents after savepoint rewinds, and nesting.
 */
(function () {
	'use strict';
	var T = GoLearnBT;

	// The staged-op log with savepoint marks: RollbackTo(sp) truncates the
	// tail after the mark; Commit ships what survived as one atomic batch.
	// Marker id namespaced (dgArrowBT08) because every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 220" width="560" height="220" role="img" aria-label="a transaction stages ops in a private list with savepoint marks; RollbackTo truncates ops after the mark, and Commit applies the surviving ops to the base as one atomic batch">' +
		'<text x="20" y="24" class="lbl">a writable tx = a private op log; savepoints are positions in it</text>' +
		'<rect x="30" y="44" width="90" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="75" y="64" text-anchor="middle">set a=1</text>' +
		'<rect x="128" y="44" width="90" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/><text x="173" y="64" text-anchor="middle">del b</text>' +
		'<rect x="226" y="44" width="90" height="30" rx="4" fill="none" stroke="var(--warn)" stroke-dasharray="5 3"/><text x="271" y="64" text-anchor="middle">set c=9</text>' +
		'<rect x="324" y="44" width="90" height="30" rx="4" fill="none" stroke="var(--warn)" stroke-dasharray="5 3"/><text x="369" y="64" text-anchor="middle">set d=7</text>' +
		'<line x1="223" y1="36" x2="223" y2="84" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="223" y="100" text-anchor="middle" class="lbl" style="fill:var(--warn)">sp := Savepoint()  (mark = position 2)</text>' +
		'<path d="M 420 60 C 460 60 470 90 420 104 C 350 122 280 116 240 108" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowBT08w)"/>' +
		'<text x="420" y="136" text-anchor="middle" class="lbl" style="fill:var(--warn)">RollbackTo(sp): truncate past the mark — c and d never happened</text>' +
		'<path d="M 120 156 L 120 176" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowBT08)"/>' +
		'<text x="20" y="172" class="lbl">Commit:</text>' +
		'<rect x="60" y="182" width="260" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="190" y="202" text-anchor="middle">batch(2) · set a=1 · del b — one atomic append</text>' +
		'<text x="340" y="202" class="lbl">exactly the SURVIVING writes</text>' +
		'<defs>' +
		'<marker id="dgArrowBT08" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowBT08w" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'tx-batch-commit',
		title: 'Transactions: Stage, Commit, Savepoint',
		nav: 'tx batch commit',
		difficulty: 'Medium',
		category: 'Transactions',
		task: 'Implement a write transaction: privately staged ops with own-write Gets, atomic Commit, Rollback, and position-based savepoints that truncate the staged log.',

		prose: [
			'<h2>Transactions: Stage, Commit, Savepoint</h2>' +
			'<p>An order-processing handler must decrement stock, write an order ' +
			'row, and bump a counter — and if the payment check halfway through ' +
			'fails, <em>none</em> of it may remain. With bare <code>Set</code> ' +
			'calls you are one error-return away from a database that says the ' +
			'stock left but no order exists. Transactions solve this with a ' +
			'simple shape: <strong>stage privately, publish atomically</strong>:</p>',
			{ lang: 'go', code: '// Writable: stages changes privately, then commits them atomically —\n// one batched log append + fsync, one root-pointer swap.\nerr = db.Update(func(tx *btypedb.Tx[string, User]) error {\n\tif err := tx.Set("grace", User{Name: "Grace", Age: 45}); err != nil {\n\t\treturn err\n\t}\n\t_, err := tx.Delete("ada")\n\treturn err // non-nil → rollback\n})\n\n// Or manage explicitly:\ntx, err := db.Begin(true) // true = writable\n// ... tx.Set / tx.Delete / tx.Get ...\nerr = tx.Commit() // or tx.Rollback()\n\n// Savepoints: mark a point, keep working, rewind if needed.\nsp, err := tx.Savepoint()\n// ... more tx writes ...\nerr = tx.RollbackTo(sp) // discard writes since the mark; sp stays valid\nerr = tx.Release(sp)    // or: drop the mark, keep the writes' },
			'<p>Model the transaction as a <strong>private op log</strong> over a ' +
			'base map:</p>' +
			'<ul>' +
			'<li><strong>Set/Delete append ops</strong> — the base is untouched ' +
			'until commit, so concurrent readers see nothing.</li>' +
			'<li><strong>Get reads your own writes</strong>: scan the staged ops ' +
			'<em>newest first</em> — the last op on a key wins — and fall through ' +
			'to the base only if the tx never touched the key. A staged delete ' +
			'means “absent”, even if the base still has the key.</li>' +
			'<li><strong>Commit</strong> applies the staged ops to the base in ' +
			'order and returns them — in the real engine this is the one atomic ' +
			'batch append. <strong>Rollback</strong> just drops the list.</li>' +
			'<li><strong>Savepoints are positions.</strong> <code>Savepoint()</code> ' +
			'records <code>len(ops)</code>. <code>RollbackTo(mark)</code> ' +
			'truncates every op after the mark — so the eventual commit logs ' +
			'exactly the surviving writes — and any <em>later</em> mark now ' +
			'points past the end: destroyed, and using it must return an error. ' +
			'<code>Release(mark)</code> validates the mark but keeps the ops.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Set</code>, <code>Delete</code>, <code>Get</code>, ' +
			'<code>Savepoint</code>, <code>RollbackTo</code>, <code>Release</code>, ' +
			'<code>Commit</code> and <code>Rollback</code> on <code>Tx</code>. ' +
			'Errors are values: an invalid (destroyed) mark returns an error, ' +
			'never panics.</p>',
		],

		starter: [
			'package main',
			'',
			'import "errors"',
			'',
			'// Op is one staged mutation. Del=true means "delete Key"; otherwise',
			'// "set Key=Val".',
			'type Op struct {',
			'	Del      bool',
			'	Key, Val string',
			'}',
			'',
			'// Tx stages ops against a base map. The base must not change until',
			'// Commit — that is the entire isolation story.',
			'type Tx struct {',
			'	base map[string]string',
			'	ops  []Op',
			'}',
			'',
			'// Begin opens a transaction over base — given, complete.',
			'func Begin(base map[string]string) *Tx {',
			'	return &Tx{base: base}',
			'}',
			'',
			'// Set stages a write. THIS version writes through to the base —',
			'// no isolation at all. Fix it to stage instead.',
			'func (t *Tx) Set(k, v string) {',
			'	t.base[k] = v // BUG: visible to everyone before Commit',
			'}',
			'',
			'// Delete stages a removal.',
			'func (t *Tx) Delete(k string) {',
			'	delete(t.base, k) // BUG: same problem',
			'}',
			'',
			'// Get must see the tx\'s own staged writes first (latest op on the',
			'// key wins), then fall through to the base.',
			'func (t *Tx) Get(k string) (string, bool) {',
			'	// your code here (own-write visibility)',
			'	v, ok := t.base[k]',
			'	return v, ok',
			'}',
			'',
			'// Savepoint returns a mark: the current staged-op position.',
			'func (t *Tx) Savepoint() int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// RollbackTo discards every op staged after mark. A mark past the',
			'// current op count was destroyed by an earlier rollback — error.',
			'func (t *Tx) RollbackTo(mark int) error {',
			'	// your code here',
			'	_ = errors.New',
			'	return nil',
			'}',
			'',
			'// Release validates the mark and keeps the writes.',
			'func (t *Tx) Release(mark int) error {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Commit applies the staged ops to the base IN ORDER and returns',
			'// the batch that would be logged.',
			'func (t *Tx) Commit() []Op {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Rollback discards everything staged.',
			'func (t *Tx) Rollback() {',
			'	// your code here',
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
			'func hBase() map[string]string {',
			'	return map[string]string{"ada": "36", "bob": "50"}',
			'}',
			'',
			'func hDumpMap(m map[string]string) string {',
			'	ks := make([]string, 0, len(m))',
			'	for k := range m {',
			'		ks = append(ks, k)',
			'	}',
			'	sort.Strings(ks)',
			'	parts := make([]string, 0, len(ks))',
			'	for _, k := range ks {',
			'		parts = append(parts, k+"="+m[k])',
			'	}',
			'	return "{" + strings.Join(parts, ",") + "}"',
			'}',
			'',
			'func hDumpOps(ops []Op) string {',
			'	parts := make([]string, 0, len(ops))',
			'	for _, o := range ops {',
			'		if o.Del {',
			'			parts = append(parts, "del "+o.Key)',
			'		} else {',
			'			parts = append(parts, "set "+o.Key+"="+o.Val)',
			'		}',
			'	}',
			'	return "[" + strings.Join(parts, "; ") + "]"',
			'}',
			'',
			'func main() {',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"isolation: staged writes leave the base untouched before Commit",',
			'			"{ada=36,bob=50}",',
			'			func() string {',
			'				base := hBase()',
			'				tx := Begin(base)',
			'				tx.Set("grace", "45")',
			'				tx.Delete("ada")',
			'				return hDumpMap(base)',
			'			}},',
			'		{"own-write visibility: the tx Gets what it staged",',
			'			`"45" true`,',
			'			func() string {',
			'				tx := Begin(hBase())',
			'				tx.Set("grace", "45")',
			'				v, ok := tx.Get("grace")',
			'				return fmt.Sprintf("%q %v", v, ok)',
			'			}},',
			'		{"latest staged op wins: set, then overwrite, then Get",',
			'			`"46" true`,',
			'			func() string {',
			'				tx := Begin(hBase())',
			'				tx.Set("grace", "45")',
			'				tx.Set("grace", "46")',
			'				v, ok := tx.Get("grace")',
			'				return fmt.Sprintf("%q %v", v, ok)',
			'			}},',
			'		{"a staged delete hides a base key from the tx itself",',
			'			`"" false`,',
			'			func() string {',
			'				tx := Begin(hBase())',
			'				tx.Delete("ada")',
			'				v, ok := tx.Get("ada")',
			'				return fmt.Sprintf("%q %v", v, ok)',
			'			}},',
			'		{"untouched keys fall through to the base",',
			'			`"50" true`,',
			'			func() string {',
			'				tx := Begin(hBase())',
			'				tx.Set("grace", "45")',
			'				v, ok := tx.Get("bob")',
			'				return fmt.Sprintf("%q %v", v, ok)',
			'			}},',
			'		{"Commit applies in order and returns the batch",',
			'			"batch=[set grace=45; del ada] base={bob=50,grace=45}",',
			'			func() string {',
			'				base := hBase()',
			'				tx := Begin(base)',
			'				tx.Set("grace", "45")',
			'				tx.Delete("ada")',
			'				batch := tx.Commit()',
			'				return fmt.Sprintf("batch=%s base=%s", hDumpOps(batch), hDumpMap(base))',
			'			}},',
			'		{"Rollback discards everything — the base never learns",',
			'			"{ada=36,bob=50}",',
			'			func() string {',
			'				base := hBase()',
			'				tx := Begin(base)',
			'				tx.Set("grace", "45")',
			'				tx.Delete("bob")',
			'				tx.Rollback()',
			'				return hDumpMap(base)',
			'			}},',
			'		{"RollbackTo(sp): the commit logs EXACTLY the surviving writes",',
			'			"batch=[set grace=45] base={ada=36,bob=50,grace=45}",',
			'			func() string {',
			'				base := hBase()',
			'				tx := Begin(base)',
			'				tx.Set("grace", "45")',
			'				sp := tx.Savepoint()',
			'				tx.Set("hopper", "9000")',
			'				tx.Delete("ada")',
			'				if err := tx.RollbackTo(sp); err != nil {',
			'					return "unexpected error: " + err.Error()',
			'				}',
			'				batch := tx.Commit()',
			'				return fmt.Sprintf("batch=%s base=%s", hDumpOps(batch), hDumpMap(base))',
			'			}},',
			'		{"sp stays valid after RollbackTo: rewind, write again, rewind again",',
			'			"batch=[set a=1]",',
			'			func() string {',
			'				tx := Begin(hBase())',
			'				tx.Set("a", "1")',
			'				sp := tx.Savepoint()',
			'				tx.Set("b", "2")',
			'				if err := tx.RollbackTo(sp); err != nil {',
			'					return "first rollback: " + err.Error()',
			'				}',
			'				tx.Set("c", "3")',
			'				if err := tx.RollbackTo(sp); err != nil {',
			'					return "second rollback: " + err.Error()',
			'				}',
			'				return "batch=" + hDumpOps(tx.Commit())',
			'			}},',
			'		{"nesting: rolling back to an EARLIER mark destroys later ones",',
			'			"inner mark rejected",',
			'			func() string {',
			'				tx := Begin(hBase())',
			'				sp1 := tx.Savepoint()',
			'				tx.Set("a", "1")',
			'				sp2 := tx.Savepoint()',
			'				tx.Set("b", "2")',
			'				if err := tx.RollbackTo(sp1); err != nil {',
			'					return "outer rollback failed: " + err.Error()',
			'				}',
			'				if err := tx.RollbackTo(sp2); err != nil {',
			'					return "inner mark rejected"',
			'				}',
			'				return "destroyed savepoint was accepted"',
			'			}},',
			'		{"Release keeps the writes: the batch still contains them",',
			'			"batch=[set a=1; set b=2]",',
			'			func() string {',
			'				tx := Begin(hBase())',
			'				tx.Set("a", "1")',
			'				sp := tx.Savepoint()',
			'				tx.Set("b", "2")',
			'				if err := tx.Release(sp); err != nil {',
			'					return "release: " + err.Error()',
			'				}',
			'				return "batch=" + hDumpOps(tx.Commit())',
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
			'import "errors"',
			'',
			'// Op is one staged mutation. Del=true means "delete Key"; otherwise',
			'// "set Key=Val".',
			'type Op struct {',
			'	Del      bool',
			'	Key, Val string',
			'}',
			'',
			'// Tx stages ops against a base map. An ordered op LIST (not a map of',
			'// pending values) is the representation that makes savepoints',
			'// trivial: a savepoint is a position, and rewinding is truncation.',
			'// The cost is O(staged) own-write lookups — see the explanation for',
			'// how the real engine avoids that.',
			'type Tx struct {',
			'	base map[string]string',
			'	ops  []Op',
			'}',
			'',
			'// Begin opens a transaction over base.',
			'func Begin(base map[string]string) *Tx {',
			'	return &Tx{base: base}',
			'}',
			'',
			'// Set stages a write — the base is untouched until Commit.',
			'func (t *Tx) Set(k, v string) {',
			'	t.ops = append(t.ops, Op{Key: k, Val: v})',
			'}',
			'',
			'// Delete stages a removal. Staging (not applying) keeps rollback',
			'// free: there is nothing to undo, only a list to drop.',
			'func (t *Tx) Delete(k string) {',
			'	t.ops = append(t.ops, Op{Del: true, Key: k})',
			'}',
			'',
			'// Get: own writes first, newest first — the LAST op on a key is the',
			'// tx\'s current truth, so scan backward and stop at the first hit.',
			'// A staged delete answers "absent" even though the base still holds',
			'// the key. Only a key the tx never touched falls through to base.',
			'func (t *Tx) Get(k string) (string, bool) {',
			'	for i := len(t.ops) - 1; i >= 0; i-- {',
			'		if t.ops[i].Key == k {',
			'			if t.ops[i].Del {',
			'				return "", false',
			'			}',
			'			return t.ops[i].Val, true',
			'		}',
			'	}',
			'	v, ok := t.base[k]',
			'	return v, ok',
			'}',
			'',
			'// Savepoint is a position in the staged-op log. Recording nothing',
			'// but len(ops) is what makes nesting destruction automatic below.',
			'func (t *Tx) Savepoint() int {',
			'	return len(t.ops)',
			'}',
			'',
			'// RollbackTo truncates the staged log at the mark. Validity check',
			'// first: a mark BEYOND the current length can only be a later',
			'// savepoint that an earlier rollback already destroyed — position',
			'// marks encode the nesting discipline with a single comparison.',
			'// The mark itself survives (ops[:mark] keeps position mark valid),',
			'// so rewind-write-rewind loops work.',
			'func (t *Tx) RollbackTo(mark int) error {',
			'	if mark < 0 || mark > len(t.ops) {',
			'		return errors.New("savepoint no longer valid")',
			'	}',
			'	t.ops = t.ops[:mark]',
			'	return nil',
			'}',
			'',
			'// Release validates the mark and keeps the writes — the "commit this',
			'// inner scope" half of the savepoint pair.',
			'func (t *Tx) Release(mark int) error {',
			'	if mark < 0 || mark > len(t.ops) {',
			'		return errors.New("savepoint no longer valid")',
			'	}',
			'	return nil',
			'}',
			'',
			'// Commit publishes: apply in order (later ops on a key overwrite',
			'// earlier ones — same last-writer-wins the Get implements) and hand',
			'// back the batch, which is precisely what the engine appends to the',
			'// log under one batch header. Because RollbackTo already truncated',
			'// abandoned ops, the batch contains ONLY writes that survived.',
			'func (t *Tx) Commit() []Op {',
			'	for _, o := range t.ops {',
			'		if o.Del {',
			'			delete(t.base, o.Key)',
			'		} else {',
			'			t.base[o.Key] = o.Val',
			'		}',
			'	}',
			'	batch := t.ops',
			'	t.ops = nil',
			'	return batch',
			'}',
			'',
			'// Rollback: the beauty of staging — undo is dropping a slice.',
			'func (t *Tx) Rollback() {',
			'	t.ops = nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>What the real btypedb does</h3>' +
			'<p>Your op list is one half of the real transaction; the other half ' +
			'is the previous item. A btypedb write tx stages into a ' +
			'<strong>private copy-on-write tree</strong> (so own-write ' +
			'<code>Get</code> and even <code>tx.Ascend</code> are O(log n), not a ' +
			'backward scan) <em>and</em> keeps the pending op log for the disk ' +
			'side. Commit then does three things in strict order: append the ops ' +
			'under one <code>batch(N)</code> header, fsync (shared with other ' +
			'committers — group commit), and swap the root pointer. Crash before ' +
			'the batch is fully on disk and replay discards it whole; crash after ' +
			'and it replays whole — the all-or-nothing you built in the recovery ' +
			'items is exactly what makes this commit atomic.</p>' +
			'<p>Savepoints combine both halves: a mark is an O(1) COW snapshot of ' +
			'the staged tree <em>plus</em> the op-log position you implemented. ' +
			'<code>RollbackTo</code> restores the tree pointer and truncates the ' +
			'pending batch — the README calls out that the eventual commit logs ' +
			'exactly the surviving writes, which is precisely the property your ' +
			'batch-content test pinned. Writable transactions serialize with each ' +
			'other (single writer); readers run against frozen snapshots and ' +
			'never queue behind them.</p>' +
			'<h3>Trade-offs</h3>' +
			'<p>The op-list representation you wrote is honest about its costs: ' +
			'own-write reads scan O(staged ops), and a transaction that stages a ' +
			'million writes holds them all in memory until commit. Engines pick ' +
			'their staging structure by workload — SQLite’s savepoints rewind a ' +
			'journal, PostgreSQL implements savepoints as subtransactions with ' +
			'their own visibility IDs, and btypedb stages into a COW tree because ' +
			'it already has one lying around. The position-mark idea survives in ' +
			'all of them: nested savepoint destruction falls out of “a mark is a ' +
			'place in a sequence”, one comparison, no bookkeeping.</p>' +
			'<p>The subtler lesson is the split between <em>state</em> and ' +
			'<em>intent</em>. The staged tree answers reads; the op log is the ' +
			'intent that gets published. Keeping both consistent under rewinds is ' +
			'why <code>RollbackTo</code> must truncate the pending batch, not ' +
			'just restore the tree: forget that, and a rolled-back delete still ' +
			'reaches the log — invisible in memory, resurrected by the next ' +
			'replay. Crash-consistency bugs love the gap between what a system ' +
			'remembers and what it writes down.</p>',
		],
		complexity: { time: 'O(1) stage; O(staged) Get worst case; O(staged) Commit', space: 'O(staged ops) per open transaction' },
	});
})();
