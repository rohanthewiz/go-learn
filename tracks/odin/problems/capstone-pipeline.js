/* Capstone: An Odin-Shaped Pipeline — Capstone (Hard). One function that
 * exercises the track's core mechanics together: ZII (the zero record and
 * the zero report are both VALID), union-style dispatch on a record kind,
 * check-then-allocate against a bump arena, and or_return semantics when
 * the arena runs dry (stop immediately, keep partial results).
 */
(function () {
	'use strict';
	var T = GoLearnOdin;

	// The per-record decision ladder: validate (no allocation) → allocate
	// (may abort the whole batch) → dispatch. Order is the curriculum.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 200" width="560" height="200" role="img" aria-label="each record is validated first, then allocated from the arena, then dispatched by kind; a full arena stops the batch">' +
		'<text x="20" y="24" class="lbl">per record — the order of the three gates is the spec</text>' +
		'<rect x="20" y="44" width="120" height="40" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="80" y="69" text-anchor="middle">1. validate</text>' +
		'<path d="M 140 64 L 178 64" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="80" y="110" text-anchor="middle" class="lbl">&quot;bad&quot; → Skipped++</text>' +
		'<text x="80" y="128" text-anchor="middle" class="lbl">(0 arena bytes)</text>' +
		'<rect x="180" y="44" width="150" height="40" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="255" y="69" text-anchor="middle">2. arena_alloc(8)</text>' +
		'<path d="M 255 84 L 255 108" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<text x="255" y="126" text-anchor="middle" style="fill:var(--err-fg)">full → &quot;arena exhausted&quot;</text>' +
		'<text x="255" y="144" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">or_return: stop, keep partial sums</text>' +
		'<path d="M 330 64 L 368 64" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<rect x="370" y="44" width="170" height="40" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="455" y="69" text-anchor="middle">3. dispatch on kind</text>' +
		'<text x="455" y="110" text-anchor="middle" class="lbl">&quot;temp&quot;/&quot;&quot; → TempSum</text>' +
		'<text x="455" y="128" text-anchor="middle" class="lbl">&quot;hum&quot; → HumSum</text>' +
		'<text x="455" y="146" text-anchor="middle" class="lbl" style="fill:var(--ok)">&quot;&quot; is ZII: a real temp of 0</text>' +
		'</svg>';

	T.problem({
		id: 'capstone-pipeline',
		title: 'Capstone: An Odin-Shaped Pipeline',
		nav: 'capstone',
		difficulty: 'Hard',
		category: 'Capstone',
		task: 'Implement Process — ZII defaults, validate-then-allocate against a bump arena, or_return on exhaustion, kind dispatch. All 8 tests.',

		prose: [
			'<h2>Capstone: An Odin-Shaped Pipeline</h2>' +
			'<p>Every mechanic in this track was a small rule in isolation. Real Odin ' +
			'code is what happens when they stack: a batch processor that reads sensor ' +
			'records, allocates its working memory from an arena, dispatches on a ' +
			'tagged union, and bails out <code>or_return</code>-style when the arena ' +
			'runs dry. In Odin it reads like this:</p>',
			{ lang: 'odin', code: 'Temp :: distinct int\nHum  :: distinct int\nReading :: union { Temp, Hum }   // nil by default — ZII\n\nprocess :: proc(records: []Record, arena: ^Arena) -> (rep: Report, err: Alloc_Error) {\n\tfor rec in records {\n\t\tif rec.bad { rep.skipped += 1; continue }    // validate BEFORE allocating\n\t\t_ = alloc_bytes(arena, 8) or_return          // full arena aborts the batch\n\t\tswitch r in rec.reading {                    // union dispatch\n\t\tcase Temp: rep.temp_sum += int(r)\n\t\tcase Hum:  rep.hum_sum  += int(r)\n\t\tcase:      rep.temp_sum += 0                 // nil union: the ZII record\n\t\t}\n\t}\n\treturn\n}' },
			'<p>Three details carry the whole design, and each one is a lesson you ' +
			'have already done:</p>' +
			'<ul>' +
			'<li><strong>ZII</strong> — a zero record is not garbage; it is a valid ' +
			'reading of temperature 0. And because <code>rep</code> is a named result, ' +
			'the <code>or_return</code> that aborts the batch hands the caller the ' +
			'<em>partial</em> report accumulated so far, not a zeroed one — named ' +
			'results keep their values on early return.</li>' +
			'<li><strong>Validate, then allocate</strong> — the <code>bad</code> check ' +
			'comes before <code>alloc_bytes</code>. Invalid input must never consume ' +
			'arena space; get the order wrong and a stream of junk records can ' +
			'exhaust memory that valid records needed.</li>' +
			'<li><strong>The arena as backpressure</strong> — a bump allocator cannot ' +
			'free one item, so “full” is not an edge case to paper over; it is the ' +
			'batch’s natural stopping point, reported as an ordinary error value.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Process(records, arenaSize)</code> as pure Go. Per ' +
			'record, in this order: a <code>Kind</code> of <code>"bad"</code> ' +
			'increments <code>Skipped</code> and touches nothing else; otherwise ' +
			'bump-allocate 8 bytes (no alignment) — if they don’t fit, set ' +
			'<code>Err = "arena exhausted"</code> and stop immediately, keeping all ' +
			'partial sums and <code>Used</code>; otherwise dispatch — ' +
			'<code>"temp"</code> adds <code>Val</code> to <code>TempSum</code>, ' +
			'<code>"hum"</code> to <code>HumSum</code>, and the empty Kind ' +
			'<code>""</code> is the ZII record: a temp reading whose zero Val counts ' +
			'as 0.</p>',
			{ code: 'Process([temp 3, hum 40, temp 4], 64) → {TempSum:7 HumSum:40 Used:24}\nProcess([Record{}], 32)               → {TempSum:0 Used:8}       // ZII: valid, allocates\nProcess([bad, bad, temp 5], 8)        → {TempSum:5 Skipped:2 Used:8} // bads cost 0 bytes\nProcess([temp 1, hum 2, temp 4], 16)  → {TempSum:1 HumSum:2 Used:16\n                                         Err:"arena exhausted"}  // partial results kept', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Record is one raw sensor record. Kind is "temp", "hum", "bad", or ""',
			'// — the empty string being the zero value a ZII record arrives with.',
			'type Record struct {',
			'	Kind string',
			'	Val  int',
			'}',
			'',
			'// Report is the pipeline result. Its zero value is the CORRECT report',
			'// for an empty batch — ZII applies to outputs too.',
			'type Report struct {',
			'	TempSum int',
			'	HumSum  int',
			'	Skipped int',
			'	Used    int // bytes bump-allocated from the arena',
			'	Err     string',
			'}',
			'',
			'// Process runs the batch through the pipeline. Per record, in order:',
			'//',
			'//   1. Validate: Kind "bad" → Skipped++, nothing else happens (bad',
			'//      records must never consume arena bytes).',
			'//   2. Allocate: every valid record takes 8 bytes from a bump arena of',
			'//      arenaSize bytes (no alignment). If 8 bytes do not fit, set',
			'//      Err = "arena exhausted" and STOP immediately — or_return style:',
			'//      partial sums and Used are kept as-is.',
			'//   3. Dispatch: Kind "temp" adds Val to TempSum, "hum" adds Val to',
			'//      HumSum. Kind "" is the ZII record — a temp reading (its zero',
			'//      Val contributes 0; zero is VALID, not garbage).',
			'func Process(records []Record, arenaSize int) Report {',
			'	// your code here',
			'	return Report{}',
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
			'	rec := func(k string, v int) Record { return Record{Kind: k, Val: v} }',
			'	show := func(rep Report) string {',
			'		return fmt.Sprintf("temp=%d hum=%d skip=%d used=%d err=%q",',
			'			rep.TempSum, rep.HumSum, rep.Skipped, rep.Used, rep.Err)',
			'	}',
			'',
			'	type tc struct {',
			'		name  string',
			'		recs  []Record',
			'		arena int',
			'		want  Report',
			'	}',
			'	cases := []tc{',
			'		{"clean batch: sums split by kind, 8 bytes per record",',
			'			[]Record{rec("temp", 3), rec("hum", 40), rec("temp", 4)}, 64,',
			'			Report{TempSum: 7, HumSum: 40, Used: 24}},',
			'		{"ZII: the zero Record is a valid temp reading of 0 — and it allocates",',
			'			[]Record{{}}, 32,',
			'			Report{TempSum: 0, Used: 8}},',
			'		{"validate first: bad records are skipped for free — temp still fits in 8 bytes",',
			'			[]Record{rec("bad", 9), rec("bad", 1), rec("temp", 5)}, 8,',
			'			Report{TempSum: 5, Skipped: 2, Used: 8}},',
			'		{"exhaustion mid-batch: partial sums kept, Used stays at the limit",',
			'			[]Record{rec("temp", 1), rec("hum", 2), rec("temp", 4)}, 16,',
			'			Report{TempSum: 1, HumSum: 2, Used: 16, Err: "arena exhausted"}},',
			'		{"exactly full is not exhausted: 3 records into 24 bytes",',
			'			[]Record{rec("temp", 2), rec("temp", 3), rec("temp", 4)}, 24,',
			'			Report{TempSum: 9, Used: 24}},',
			'		{"empty batch: the zero Report IS the answer (ZII on the output)",',
			'			[]Record{}, 100,',
			'			Report{}},',
			'		{"zero-byte arena: the first valid record already fails",',
			'			[]Record{rec("temp", 7)}, 0,',
			'			Report{Err: "arena exhausted"}},',
			'		{"bad record while the arena is full: still just skipped, then next temp aborts",',
			'			[]Record{rec("temp", 1), rec("bad", 0), rec("temp", 2)}, 8,',
			'			Report{TempSum: 1, Skipped: 1, Used: 8, Err: "arena exhausted"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  show(c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := Process(append([]Record(nil), c.recs...), c.arena)',
			'			r["pass"] = got == c.want',
			'			r["got"] = show(got)',
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
			'// Record is one raw sensor record. Kind is "temp", "hum", "bad", or ""',
			'// — the empty string being the zero value a ZII record arrives with.',
			'type Record struct {',
			'	Kind string',
			'	Val  int',
			'}',
			'',
			'// Report is the pipeline result. Its zero value is the CORRECT report',
			'// for an empty batch — ZII applies to outputs too.',
			'type Report struct {',
			'	TempSum int',
			'	HumSum  int',
			'	Skipped int',
			'	Used    int // bytes bump-allocated from the arena',
			'	Err     string',
			'}',
			'',
			'// Process runs the batch through the pipeline: validate, allocate,',
			'// dispatch — in that order, per record.',
			'//',
			'// rep is built incrementally so an early exit naturally returns the',
			'// partial result — the Go rendering of Odin\'s named-result + or_return',
			'// pair, where the abort hands back whatever rep had accumulated. There',
			'// is deliberately no cleanup path: a bump arena has nothing to free',
			'// per item, so "stop and report" is the entire failure story.',
			'func Process(records []Record, arenaSize int) Report {',
			'	var rep Report // ZII: the zero Report is the empty-batch answer',
			'',
			'	for _, r := range records {',
			'		// Gate 1 — validate BEFORE allocating. Bad input must cost',
			'		// zero arena bytes; flipping gates 1 and 2 makes junk records',
			'		// eat memory that later valid records needed (and the "bad',
			'		// record while full" test would wrongly report exhaustion).',
			'		if r.Kind == "bad" {',
			'			rep.Skipped++',
			'			continue',
			'		}',
			'',
			'		// Gate 2 — the bump allocation. A bump arena is just a',
			'		// cursor: fits → advance; doesn\'t fit → the batch is over.',
			'		// No per-item free exists, so exhaustion is FINAL — which is',
			'		// why the response is or_return-shaped: record the error and',
			'		// return the partial report immediately.',
			'		if rep.Used+8 > arenaSize {',
			'			rep.Err = "arena exhausted"',
			'			return rep',
			'		}',
			'		rep.Used += 8',
			'',
			'		// Gate 3 — union dispatch. The empty Kind falls into the',
			'		// temp case on purpose: ZII means the zero record is a',
			'		// MEANINGFUL reading (temperature 0), not a sentinel to',
			'		// reject. Its zero Val adds 0 — correct by construction.',
			'		switch r.Kind {',
			'		case "hum":',
			'			rep.HumSum += r.Val',
			'		default: // "temp" and "" (the ZII record)',
			'			rep.TempSum += r.Val',
			'		}',
			'	}',
			'	return rep',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Every gate is a lesson</h3>' +
			'<p>The function is three gates in a loop, and each gate is one problem ' +
			'from this track, composed:</p>' +
			'<ul>' +
			'<li><strong>Gate 1 is the unions lesson plus defensive design</strong> — ' +
			'dispatching on <code>Kind</code> is the Go spelling of ' +
			'<code>switch r in reading</code>, and rejecting <code>"bad"</code> before ' +
			'spending any resource is the ordering discipline the test ' +
			'“bad record while the arena is full” pins: validation must not have side ' +
			'effects on memory.</li>' +
			'<li><strong>Gate 2 is the allocators lesson</strong> — ' +
			'<code>Used+8 &gt; arenaSize</code> is the entire bump allocator, and its ' +
			'inability to free one item is why exhaustion ends the batch instead of ' +
			'triggering a retry.</li>' +
			'<li><strong>The early return is the or_return lesson</strong> — error as ' +
			'a value, first failure stops execution, and everything computed so far ' +
			'survives, exactly like Odin’s named results on an ' +
			'<code>or_return</code>.</li>' +
			'</ul>',
			{ code: 'if rep.Used+8 > arenaSize {\n\trep.Err = "arena exhausted"\n\treturn rep // partial sums + Used survive — named-result or_return\n}' },
			'<h3>ZII bookends the design</h3>' +
			'<p>Zero shows up twice, and both times it is an <em>answer</em>, not an ' +
			'accident. The zero <code>Record</code> flows through as a temperature ' +
			'reading of 0 — Odin’s bet is that if every variable starts at zero, ' +
			'zero had better be a state your logic accepts, so the pipeline treats it ' +
			'as data rather than filtering it as noise. And the zero ' +
			'<code>Report</code> is the correct output for an empty batch: ' +
			'<code>var rep Report</code> followed by a loop that never runs is already ' +
			'right. Go shares this instinct (“make the zero value useful” — the empty ' +
			'<code>bytes.Buffer</code>, the ready-to-use <code>sync.Mutex</code>); ' +
			'Odin elevates it from proverb to language guarantee.</p>' +
			'<h3>Why check-then-allocate deserves its own test</h3>' +
			'<p>It is the capstone’s one genuinely order-sensitive rule, and the bug ' +
			'it guards against is real: log-ingestion services have fallen over ' +
			'because malformed events were buffered <em>before</em> validation, so a ' +
			'flood of garbage exhausted memory reserved for good data. In arena terms ' +
			'the rule is even sharper — arena bytes are unrecoverable until ' +
			'<code>free_all</code>, so a byte spent on junk is a byte no valid record ' +
			'can ever reclaim. Validate at the door; allocate only for guests.</p>',
		],
		complexity: { time: 'O(n) — one pass, early exit on exhaustion', space: 'O(1) — the report is the only state; the arena is a counter' },
	});
})();
