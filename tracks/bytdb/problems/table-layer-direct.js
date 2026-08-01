/* Beneath SQL: The Table Layer — Engine (Hard). The API SQL compiles down
 * to: eng.CreateTable / Insert / Get / ScanRange on the bytdb.Engine, plus
 * the tuple package (Encode / Compare / PrefixEnd) that gives the ordered
 * key space its order. The centerpiece trap, probed live: "web-1" is a
 * string prefix of "web-10", but tuple encoding's terminator makes the
 * prefix range [Encode(host), PrefixEnd) exclude web-10 exactly — which a
 * naive HasPrefix scan (the starter) gets wrong.
 */
(function () {
	'use strict';
	var T = GoLearnBY;

	// The ordered key space with real encoded keys, and the prefix range
	// bracket. Marker ids namespaced dgArrowBY10*.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 240" width="560" height="240" role="img" aria-label="table rows live as encoded tuple keys in one ordered key space; string values end with a terminator so all web-1 keys sort together, before web-10; PrefixEnd of the encoded host is the exclusive upper bound of that host range">' +
		'<text x="20" y="22" class="lbl">the metrics table on disk: one ordered key space, keys = tuple(host, ts)</text>' +
		'<rect x="20" y="34" width="330" height="150" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="36" y="58" class="lbl">07 db-1  00 01 · ts 100   → row</text>' +
		'<text x="36" y="82" class="lbl" style="fill:var(--accent)">07 web-1 00 01 · ts 100   → row</text>' +
		'<text x="36" y="106" class="lbl" style="fill:var(--accent)">07 web-1 00 01 · ts 200   → row</text>' +
		'<text x="36" y="130" class="lbl">07 web-10 00 01 · ts 100  → row</text>' +
		'<text x="36" y="154" class="lbl">07 web-2 00 01 · ts 100   → row</text>' +
		'<path d="M 366 74 L 356 74" stroke="var(--accent)" stroke-width="1.8" marker-end="url(#dgArrowBY10)"/>' +
		'<text x="372" y="70" class="lbl">start = Encode("web-1")  (...00 01)</text>' +
		'<text x="372" y="86" class="lbl">every (web-1, ts) key ≥ start</text>' +
		'<path d="M 366 120 L 356 120" stroke="var(--warn)" stroke-width="1.8" marker-end="url(#dgArrowBY10w)"/>' +
		'<text x="372" y="112" class="lbl" style="fill:var(--warn)">end = PrefixEnd(start)  (...00 02)</text>' +
		'<text x="372" y="128" class="lbl" style="fill:var(--warn)">web-10 begins 00 FF-escaped past</text>' +
		'<text x="372" y="144" class="lbl" style="fill:var(--warn)">00 02? No — web-10\'s "0" byte (0x30)</text>' +
		'<text x="372" y="160" class="lbl" style="fill:var(--warn)">sorts AFTER the 00 01 terminator</text>' +
		'<text x="20" y="208" class="lbl">the 00 01 terminator ends every string key: all of web-1\'s keys huddle before ANY longer host,</text>' +
		'<text x="20" y="226" class="lbl">so [start, end) is exactly one host — the range scan SQL\'s WHERE host = $1 compiles to</text>' +
		'<defs>' +
		'<marker id="dgArrowBY10" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowBY10w" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'table-layer-direct',
		title: 'Beneath SQL: The Table Layer',
		nav: 'table layer direct',
		difficulty: 'Hard',
		category: 'Engine',
		task: 'Drive the engine without SQL: CreateTable with a composite (host, ts) key, Insert/Get, bounded ScanRange windows, an early-exit host scan that must NOT leak web-10 into web-1 — plus tuple.Encode/Compare/PrefixEnd to see the key order those scans ride on.',

		prose: [
			'<h2>Beneath SQL: the table layer</h2>' +
			'<p>Nine items of SQL, one question left: what does it compile ' +
			'<em>to</em>? A metrics collector gives us a reason to look — its ' +
			'hot path inserts a sample per host per tick and reads back windows ' +
			'(“web-1, ticks 100–300”), and it wants to skip the parser entirely. ' +
			'The <code>*bytdb.Engine</code> you get from <code>Open</code> — the ' +
			'same value you have been wrapping with <code>sql.New</code> all ' +
			'track — <em>is</em> the layer SQL executes against:</p>',
			{ lang: 'go', code: 'eng.CreateTable("metrics", []bytdb.Column{\n\t{Name: "host", Type: bytdb.TString},\n\t{Name: "ts",   Type: bytdb.TInt},\n\t{Name: "cpu",  Type: bytdb.TFloat},\n}, "host", "ts")                        // composite primary key\n\neng.Insert("metrics", "web-1", 100, 0.31) // vals in column order\nrow, ok, err := eng.Get("metrics", "web-1", 100) // point read by full PK\nfor the curious: row.Col("cpu"), row.Vals   // decoded, column order' },
			'<ul>' +
			'<li><strong>Every row is one key-value pair in one ordered key ' +
			'space.</strong> The key is a table prefix plus the primary-key ' +
			'columns encoded by the <code>tuple</code> package; the value is the ' +
			'rest of the row. <code>Get</code> is a point lookup; ' +
			'<code>ScanRange(table, fromPK, toPK)</code> walks ' +
			'<code>fromPK &lt;= pk &lt; toPK</code> in key order — bounds may be ' +
			'<em>prefixes</em> of a composite key, and nil means unbounded.</li>' +
			'<li><strong>Scans are push iterators.</strong> ' +
			'<code>eng.Scan(t)</code> returns a function you call with a yield ' +
			'callback: <code>seq(func(r bytdb.Row, err error) bool { ... })</code>. ' +
			'Return <code>false</code> to stop early — that early exit is your ' +
			'LIMIT.</li>' +
			'<li><strong><code>tuple.Encode</code> is the order-preserving ' +
			'serializer:</strong> <code>bytes.Compare(Encode(a...), ' +
			'Encode(b...))</code> always agrees with <code>tuple.Compare(a, ' +
			'b)</code> — ints sign-flipped into big-endian, strings terminated ' +
			'with a <code>00 01</code> marker (embedded zero bytes escaped as ' +
			'<code>00 FF</code>). That terminator is load-bearing: it is what ' +
			'makes <em>all</em> of <code>web-1</code>\'s keys sort before any of ' +
			'<code>web-10</code>\'s, even though <code>"web-1"</code> is a string ' +
			'prefix of <code>"web-10"</code>.</li>' +
			'<li><strong><code>tuple.PrefixEnd(k)</code></strong> returns the ' +
			'smallest key greater than everything prefixed by <code>k</code> — ' +
			'the exclusive upper bound that turns “one host” into a ' +
			'<code>[start, end)</code> byte range. <code>WHERE host = $1</code> ' +
			'compiles to exactly this bracket.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Seven functions: define the table (composite key!), record and ' +
			'read samples, scan a ts-window within one host, collect ' +
			'<em>all</em> of one host\'s samples with an early-exit scan, and — ' +
			'down at the bytes — encode keys and produce a host\'s ' +
			'<code>[start, end)</code> prefix range. The harness seeds hosts ' +
			'<code>web-1</code>, <code>web-10</code>, <code>web-2</code>, ' +
			'<code>db-1</code> and checks physical scan order, window bounds, ' +
			'and that byte order and value order agree.</p>' +
			'<div class="tip">The starter\'s two bugs are the item: a single-' +
			'column primary key (second sample per host → <code>duplicate ' +
			'primary key</code>), and a host filter done with ' +
			'<code>strings.HasPrefix</code> — which happily claims ' +
			'<code>web-10</code>\'s samples for <code>web-1</code>. Equality and ' +
			'prefix are different predicates; the tuple terminator is how the ' +
			'engine keeps them different at the byte level.</div>',
		],

		starter: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'	"strings"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/tuple"',
			')',
			'',
			'// DefineMetrics creates the metrics table: host TEXT, ts INT,',
			'// cpu FLOAT — keyed so ONE HOST can hold MANY ticks.',
			'//',
			'// CODE UNDER REVIEW: the primary key is host alone, so the second',
			'// sample from any host is refused as a duplicate. A time series',
			'// needs the composite key (host, ts).',
			'func DefineMetrics(eng *bytdb.Engine) error {',
			'	_, err := eng.CreateTable("metrics", []bytdb.Column{',
			'		{Name: "host", Type: bytdb.TString},',
			'		{Name: "ts", Type: bytdb.TInt},',
			'		{Name: "cpu", Type: bytdb.TFloat},',
			'	}, "host")',
			'	return err',
			'}',
			'',
			'// Record stores one sample. Engine inserts take values in declared',
			'// column order — no SQL, no parser.',
			'func Record(eng *bytdb.Engine, host string, ts int, cpu float64) error {',
			'	return eng.Insert("metrics", host, ts, cpu)',
			'}',
			'',
			'// CPUAt reads one sample by full primary key and formats the cpu as',
			'// "%.2f" — or returns "absent" (nil error) when no such row exists.',
			'func CPUAt(eng *bytdb.Engine, host string, ts int) (string, error) {',
			'	// your code here (eng.Get returns row, ok, err)',
			'	return "", nil',
			'}',
			'',
			'// Window returns "ts:cpu" strings (cpu as %.2f) for host\'s samples',
			'// with fromTs <= ts < toTs, in ts order — ONE ScanRange with',
			'// composite bounds, not a filtered full scan.',
			'func Window(eng *bytdb.Engine, host string, fromTs, toTs int) ([]string, error) {',
			'	// your code here',
			'	return nil, nil',
			'}',
			'',
			'// AllFor returns "ts:cpu" strings for ALL samples of exactly this',
			'// host, in ts order.',
			'//',
			'// CODE UNDER REVIEW: full scan + HasPrefix. Run it for "web-1" and',
			'// count web-10\'s samples in the answer. Scan from the host prefix',
			'// bound and STOP (yield false) when the host column changes.',
			'func AllFor(eng *bytdb.Engine, host string) ([]string, error) {',
			'	out := []string{}',
			'	var scanErr error',
			'	eng.Scan("metrics")(func(r bytdb.Row, err error) bool {',
			'		if err != nil {',
			'			scanErr = err',
			'			return false',
			'		}',
			'		if strings.HasPrefix(r.Vals[0].(string), host) {',
			'			out = append(out, fmt.Sprintf("%d:%.2f", r.Vals[1].(int64), r.Vals[2].(float64)))',
			'		}',
			'		return true',
			'	})',
			'	return out, scanErr',
			'}',
			'',
			'// KeyFor encodes (host, ts) as an order-preserving tuple key — the',
			'// byte string this row sorts by inside the key space.',
			'func KeyFor(host string, ts int) ([]byte, error) {',
			'	// your code here (tuple.Encode)',
			'	return nil, nil',
			'}',
			'',
			'// PrefixRange returns [start, end) bounding EXACTLY host\'s keys:',
			'// start = the encoded host prefix, end = its PrefixEnd.',
			'func PrefixRange(host string) ([]byte, []byte, error) {',
			'	// your code here (tuple.Encode + tuple.PrefixEnd)',
			'	_ = tuple.PrefixEnd',
			'	return nil, nil, nil',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"bytes"',
			'	"encoding/json"',
			'	"fmt"',
			'	"os"',
			'	"strings"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/tuple"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'// This item runs BENEATH the SQL layer, so instead of the usual',
			'// openDB it opens the raw engine at a fresh per-item path.',
			'func openEngine() (*bytdb.Engine, func()) {',
			'	path := os.TempDir() + "/golearn-bytdb-by-table-layer.db"',
			'	os.Remove(path)',
			'	eng, err := bytdb.Open(path)',
			'	if err != nil {',
			'		panic(fmt.Sprintf("bytdb.Open(%s): %v", path, err))',
			'	}',
			'	return eng, func() {',
			'		eng.Close()',
			'		os.Remove(path)',
			'	}',
			'}',
			'',
			'func main() {',
			'	eng, cleanup := openEngine()',
			'	defer cleanup()',
			'',
			'	results := make([]map[string]any, 0, 7)',
			'	newCase := func(name, want string) map[string]any {',
			'		r := map[string]any{"input": name, "want": want}',
			'		results = append(results, r)',
			'		return r',
			'	}',
			'',
			'	// Case 1: the descriptor. PKCols [0 1] is the composite key —',
			'	// the single-column starter shows [0] here and unravels below.',
			'	r := newCase("DefineMetrics: descriptor has composite PK (host, ts)", "table metrics: pk cols [0 1] of 3 columns")',
			'	runCase(r, func() {',
			'		if err := DefineMetrics(eng); err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "create error: " + err.Error()',
			'			return',
			'		}',
			'		d := eng.Table("metrics")',
			'		if d == nil {',
			'			r["pass"] = false',
			'			r["got"] = "no metrics table in the catalog"',
			'			return',
			'		}',
			'		got := fmt.Sprintf("table %s: pk cols %v of %d columns", d.Name, d.PKCols, len(d.Columns))',
			'		r["pass"] = got == "table metrics: pk cols [0 1] of 3 columns"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 2: five samples — including a second tick for web-1,',
			'	// which the host-only key refuses (duplicate primary key).',
			'	r = newCase("Record 5 samples incl. two ticks of web-1", "all 5 inserts ok")',
			'	runCase(r, func() {',
			'		type s struct {',
			'			host string',
			'			ts   int',
			'			cpu  float64',
			'		}',
			'		for _, x := range []s{',
			'			{"web-1", 100, 0.31}, {"web-1", 200, 0.55},',
			'			{"web-10", 100, 0.77}, {"web-2", 100, 0.12}, {"db-1", 100, 0.9},',
			'		} {',
			'			if err := Record(eng, x.host, x.ts, x.cpu); err != nil {',
			'				r["pass"] = false',
			'				r["got"] = fmt.Sprintf("Record(%s, %d): %v", x.host, x.ts, err)',
			'				return',
			'			}',
			'		}',
			'		r["pass"] = true',
			'		r["got"] = "all 5 inserts ok"',
			'	})',
			'',
			'	// Case 3: point reads through the composite key — a hit and a',
			'	// clean miss.',
			'	r = newCase("CPUAt: (web-1, 200) hits, (web-1, 999) is absent", "0.55 / absent")',
			'	runCase(r, func() {',
			'		hit, err := CPUAt(eng, "web-1", 200)',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "hit error: " + err.Error()',
			'			return',
			'		}',
			'		miss, err := CPUAt(eng, "web-1", 999)',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "miss error: " + err.Error()',
			'			return',
			'		}',
			'		got := hit + " / " + miss',
			'		r["pass"] = got == "0.55 / absent"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 4: physical order. A full engine scan yields rows in',
			'	// encoded-key order — host lexicographically (web-1 BEFORE',
			'	// web-10 BEFORE web-2, thanks to the terminator), ts within host.',
			'	r = newCase("harness full Scan: rows come back in key order", "db-1@100 web-1@100 web-1@200 web-10@100 web-2@100")',
			'	runCase(r, func() {',
			'		order := []string{}',
			'		var scanErr error',
			'		eng.Scan("metrics")(func(row bytdb.Row, err error) bool {',
			'			if err != nil {',
			'				scanErr = err',
			'				return false',
			'			}',
			'			order = append(order, fmt.Sprintf("%v@%v", row.Vals[0], row.Vals[1]))',
			'			return true',
			'		})',
			'		if scanErr != nil {',
			'			r["pass"] = false',
			'			r["got"] = "scan error: " + scanErr.Error()',
			'			return',
			'		}',
			'		got := strings.Join(order, " ")',
			'		r["pass"] = got == "db-1@100 web-1@100 web-1@200 web-10@100 web-2@100"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 5: the window — from inclusive, to exclusive, so ts 200',
			'	// stays out of [100, 200).',
			'	r = newCase("Window(web-1, 100, 200): half-open, ts 200 excluded", "[100:0.31]")',
			'	runCase(r, func() {',
			'		w, err := Window(eng, "web-1", 100, 200)',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "error: " + err.Error()',
			'			return',
			'		}',
			'		got := fmt.Sprintf("%v", w)',
			'		r["pass"] = got == "[100:0.31]"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 6: THE trap. web-1\'s samples, and only web-1\'s — the',
			'	// HasPrefix starter answers three (web-10\'s 0.77 leaks in).',
			'	r = newCase("AllFor(web-1) must not claim web-10\'s samples", "[100:0.31 200:0.55]")',
			'	runCase(r, func() {',
			'		all, err := AllFor(eng, "web-1")',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "error: " + err.Error()',
			'			return',
			'		}',
			'		got := fmt.Sprintf("%v", all)',
			'		r["pass"] = got == "[100:0.31 200:0.55]"',
			'		r["got"] = got',
			'	})',
			'',
			'	// Case 7: down at the bytes — byte order and value order agree,',
			'	// and the prefix range brackets exactly one host.',
			'	r = newCase("tuple: bytes.Compare == tuple.Compare; PrefixRange isolates web-1", "key order -1 -1, value order -1 -1; in in out out")',
			'	runCase(r, func() {',
			'		kA, err := KeyFor("web-1", 200)',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "KeyFor error: " + err.Error()',
			'			return',
			'		}',
			'		kB, err := KeyFor("web-10", 100)',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "KeyFor error: " + err.Error()',
			'			return',
			'		}',
			'		kC, err := KeyFor("web-2", 100)',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "KeyFor error: " + err.Error()',
			'			return',
			'		}',
			'		start, end, err := PrefixRange("web-1")',
			'		if err != nil || start == nil || end == nil {',
			'			r["pass"] = false',
			'			r["got"] = fmt.Sprintf("PrefixRange: start=%x end=%x err=%v", start, end, err)',
			'			return',
			'		}',
			'		inRange := func(k []byte) string {',
			'			if bytes.Compare(k, start) >= 0 && bytes.Compare(k, end) < 0 {',
			'				return "in"',
			'			}',
			'			return "out"',
			'		}',
			'		kA100, err := KeyFor("web-1", 100)',
			'		if err != nil {',
			'			r["pass"] = false',
			'			r["got"] = "KeyFor error: " + err.Error()',
			'			return',
			'		}',
			'		got := fmt.Sprintf("key order %d %d, value order %d %d; %s %s %s %s",',
			'			bytes.Compare(kA, kB), bytes.Compare(kB, kC),',
			'			tuple.Compare([]any{"web-1", 200}, []any{"web-10", 100}),',
			'			tuple.Compare([]any{"web-10", 100}, []any{"web-2", 100}),',
			'			inRange(kA100), inRange(kA), inRange(kB), inRange(kC))',
			'		r["pass"] = got == "key order -1 -1, value order -1 -1; in in out out"',
			'		r["got"] = got',
			'	})',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'import (',
			'	"fmt"',
			'',
			'	"github.com/rohanthewiz/bytdb"',
			'	"github.com/rohanthewiz/bytdb/tuple"',
			')',
			'',
			'// The composite key (host, ts) is the schema decision the whole',
			'// item hangs on: the key IS the physical sort order, so choosing',
			'// it chooses which reads are ranges. (host, ts) clusters each',
			'// host\'s ticks contiguously — windows and per-host scans become',
			'// byte ranges. (ts, host) would instead cluster by time across',
			'// hosts: better for "everything at tick T", useless for "web-1\'s',
			'// history". Key design at this layer is query design.',
			'func DefineMetrics(eng *bytdb.Engine) error {',
			'	_, err := eng.CreateTable("metrics", []bytdb.Column{',
			'		{Name: "host", Type: bytdb.TString},',
			'		{Name: "ts", Type: bytdb.TInt},',
			'		{Name: "cpu", Type: bytdb.TFloat},',
			'	}, "host", "ts")',
			'	return err',
			'}',
			'',
			'// Insert takes values in declared column order and coerces Go',
			'// widths onto column types (int -> the INT column here). This is',
			'// the exact call an SQL INSERT bottoms out in — minus the parser.',
			'func Record(eng *bytdb.Engine, host string, ts int, cpu float64) error {',
			'	return eng.Insert("metrics", host, ts, cpu)',
			'}',
			'',
			'// Get is a point lookup by full primary key: encode (host, ts),',
			'// one ordered-key-space read. The three-way return separates "no',
			'// row" (ok=false, a normal answer) from real failures — the same',
			'// distinction the SQL layer renders as zero rows vs an error.',
			'func CPUAt(eng *bytdb.Engine, host string, ts int) (string, error) {',
			'	row, ok, err := eng.Get("metrics", host, ts)',
			'	if err != nil {',
			'		return "", err',
			'	}',
			'	if !ok {',
			'		return "absent", nil',
			'	}',
			'	return fmt.Sprintf("%.2f", row.Col("cpu").(float64)), nil',
			'}',
			'',
			'// ScanRange with full composite bounds: fromPK <= pk < toPK, so',
			'// [host fromTs] .. [host toTs] is the half-open ts window within',
			'// one host — the engine seeks straight to the first key and stops',
			'// at the bound; rows outside are never touched, let alone decoded.',
			'// The iterator is a plain function: call it with a yield callback.',
			'func Window(eng *bytdb.Engine, host string, fromTs, toTs int) ([]string, error) {',
			'	out := []string{}',
			'	var scanErr error',
			'	eng.ScanRange("metrics", []any{host, fromTs}, []any{host, toTs})(',
			'		func(r bytdb.Row, err error) bool {',
			'			if err != nil {',
			'				scanErr = err',
			'				return false',
			'			}',
			'			out = append(out, fmt.Sprintf("%d:%.2f", r.Vals[1].(int64), r.Vals[2].(float64)))',
			'			return true',
			'		})',
			'	return out, scanErr',
			'}',
			'',
			'// AllFor: a PREFIX bound plus an early exit. The partial fromPK',
			'// [host] seeks to the host\'s first key; because the key space',
			'// clusters the host contiguously (terminator!), the first row with',
			'// a different host means we are past the group — yield false stops',
			'// the scan right there. Cost: this host\'s rows + 1, regardless of',
			'// table size. Equality on the column, not HasPrefix on its text,',
			'// is what keeps web-10 out of web-1\'s answer.',
			'func AllFor(eng *bytdb.Engine, host string) ([]string, error) {',
			'	out := []string{}',
			'	var scanErr error',
			'	eng.ScanRange("metrics", []any{host}, nil)(',
			'		func(r bytdb.Row, err error) bool {',
			'			if err != nil {',
			'				scanErr = err',
			'				return false',
			'			}',
			'			if r.Vals[0].(string) != host {',
			'				return false // past the host\'s contiguous run: stop',
			'			}',
			'			out = append(out, fmt.Sprintf("%d:%.2f", r.Vals[1].(int64), r.Vals[2].(float64)))',
			'			return true',
			'		})',
			'	return out, scanErr',
			'}',
			'',
			'// KeyFor: the serializer itself. Encode normalizes Go widths',
			'// (int -> int64), sign-flips ints into big-endian, and terminates',
			'// strings with 00 01 (escaping embedded zeros as 00 FF) — all so',
			'// that one rule holds: bytes.Compare on encodings == tuple.Compare',
			'// on values. Every scan in this item rode on that rule.',
			'func KeyFor(host string, ts int) ([]byte, error) {',
			'	return tuple.Encode(host, ts)',
			'}',
			'',
			'// PrefixRange: Encode(host) is a complete tuple ending in the',
			'// terminator, so it sorts <= every (host, ts) key; PrefixEnd bumps',
			'// the last non-0xFF byte (00 01 -> 00 02), the smallest byte string',
			'// greater than everything the prefix begins. web-10\'s keys carry',
			'// 0x30 (\'0\') where web-1\'s carry the terminator\'s 0x00, so they',
			'// sort outside [start, end) — string-prefix confusion is impossible',
			'// by construction.',
			'func PrefixRange(host string) ([]byte, []byte, error) {',
			'	start, err := tuple.Encode(host)',
			'	if err != nil {',
			'		return nil, nil, err',
			'	}',
			'	return start, tuple.PrefixEnd(start), nil',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The whole engine in one sentence</h3>' +
			'<p>A bytdb table is a contiguous band of an ordered key space: ' +
			'<code>tablePrefix · tuple(pk...) → encodedRow</code>, plus one more ' +
			'band per secondary index (<code>indexPrefix · tuple(indexed cols) · ' +
			'pk</code>). Every operator you met in this track is a walk over ' +
			'those bands. Point Get: seek one key. Seq Scan: walk the table ' +
			'band. Index Scan with an Index Cond: bracket a sub-range of an ' +
			'index band exactly the way your <code>PrefixRange</code> did, then ' +
			'hop to rows by primary key. The order-serving DESC scan from the ' +
			'indexes item: the same walk, relying on DESC columns being ' +
			'byte-inverted at encode time so the key space\'s single sort order ' +
			'can serve both directions. This is the CockroachDB/FoundationDB ' +
			'lineage — SQL as a compiler onto an ordered KV store — and you have ' +
			'now used both ends of the compiler.</p>' +
			'<h3>Why the terminator design is subtle and right</h3>' +
			'<p>An order-preserving string encoding has to answer one hard ' +
			'question: how does <code>("web-1", 200)</code> sort against ' +
			'<code>("web-10", 100)</code>? Concatenating raw bytes fails — the ' +
			'tuple boundary bleeds into the next column and <code>web-1</code>\'s ' +
			'keys interleave with <code>web-10</code>\'s (your HasPrefix starter ' +
			'made the same category error one layer up). The <code>00 01</code> ' +
			'terminator ends every string with a byte pair that sorts below any ' +
			'real continuation byte, so a shorter string closes its column ' +
			'before a longer string\'s next character can compete; embedded zero ' +
			'bytes are escaped to <code>00 FF</code> to keep the terminator ' +
			'unambiguous. <code>PrefixEnd</code> then gives the complementary ' +
			'bound — increment the last non-<code>0xFF</code> byte — and ' +
			'equality-on-a-prefix becomes a clean <code>[start, end)</code> ' +
			'bracket. FoundationDB\'s tuple layer and CockroachDB\'s key encoding ' +
			'make the same choices for the same reasons; it is close to a ' +
			'convergent design.</p>' +
			'<h3>When to drop below SQL — and when not to</h3>' +
			'<p>The engine layer buys you: no parse/plan cost on hot paths, ' +
			'streaming iteration with early exit (your <code>AllFor</code> never ' +
			'materialized a result set), and key-order guarantees stated in ' +
			'terms of your own schema. It costs you everything the SQL layer ' +
			'was quietly doing: DEFAULTs and SERIAL (engine inserts take every ' +
			'column, explicitly), CHECK evaluation ordering, view expansion, ' +
			'parameter binding, the planner\'s access-path choices. The sane ' +
			'split in a real service: SQL for schema, migrations, and every ' +
			'query a human iterates on; the table layer for the one or two ' +
			'measured hot paths shaped like this item\'s collector — and even ' +
			'then, both layers over the <em>same</em> Engine value, sharing one ' +
			'transaction machinery, so dropping down is a refactor, not a ' +
			'rewrite.</p>',
		],
		complexity: { time: 'O(log n) per Get/seek; O(k) per window or host scan for k rows returned — table size cancels out of bounded scans', space: 'O(1) per scan — push iteration streams rows; only the caller accumulates' },
	});
})();
