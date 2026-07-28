/* defer & errdefer — Values & Errors (Medium). Zig's defer runs at SCOPE
 * exit (an inner block's defers fire at its closing brace, LIFO), and
 * errdefer runs only when the scope exits with an error — the undo-on-
 * failure half of the ownership-transfer pattern Go fakes with a success
 * flag. The learner builds the execution-order machine twice: RunZig
 * (block-scoped defers + conditional errdefer) and RunGo (everything
 * waits for function exit). The harness pins LIFO, the inner-block defer
 * firing BEFORE later function-body ops, errdefer skipped/fired in stack
 * position, block-1 errdefers never firing, and RunGo flattening blocks.
 */
(function () {
	'use strict';
	var T = GoLearnZig;

	// Two runs of the same registrations: on success the errdefer is a hole
	// in the unwind; on error it fires in its stack position. Marker id
	// namespaced (dgArrowZGDE) — SVG ids share one page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 214" width="560" height="214" role="img" aria-label="the same defer and errdefer registrations unwind differently: on success the errdefer is skipped; on an error exit it fires in its stack position">' +
		'<text x="20" y="22" class="lbl">registered top to bottom: errdefer undo(id) — then defer log() — unwind is LIFO</text>' +
		// success timeline
		'<text x="20" y="52" class="lbl" style="fill:var(--ok)">success exit</text>' +
		'<rect x="130" y="34" width="88" height="30" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="174" y="54" text-anchor="middle">return u</text>' +
		'<path d="M 218 49 L 256 49" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowZGDE)"/>' +
		'<rect x="260" y="34" width="80" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="300" y="54" text-anchor="middle">log()</text>' +
		'<path d="M 340 49 L 378 49" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowZGDE)"/>' +
		'<rect x="382" y="34" width="110" height="30" rx="5" fill="none" stroke="var(--edge)" stroke-width="1" stroke-dasharray="4 3"/>' +
		'<text x="437" y="54" text-anchor="middle" class="lbl">undo(id) skipped</text>' +
		'<text x="382" y="82" class="lbl">ownership transferred — the undo must NOT run</text>' +
		// error timeline
		'<text x="20" y="130" class="lbl" style="fill:var(--warn)">error exit</text>' +
		'<rect x="130" y="112" width="88" height="30" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="174" y="132" text-anchor="middle" style="fill:var(--warn)">return err</text>' +
		'<path d="M 218 127 L 256 127" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowZGDE)"/>' +
		'<rect x="260" y="112" width="80" height="30" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="300" y="132" text-anchor="middle">log()</text>' +
		'<path d="M 340 127 L 378 127" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowZGDE)"/>' +
		'<rect x="382" y="112" width="110" height="30" rx="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="437" y="132" text-anchor="middle" style="fill:var(--warn)">undo(id) fires</text>' +
		'<text x="382" y="160" class="lbl" style="fill:var(--warn)">half-built state rolled back, in LIFO position</text>' +
		'<text x="20" y="200" class="lbl">defer always unwinds; errdefer is conditional on HOW the scope exits</text>' +
		'<defs><marker id="dgArrowZGDE" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'defer-errdefer',
		title: 'defer & errdefer',
		nav: 'defer',
		difficulty: 'Medium',
		category: 'Values & Errors',
		task: 'Implement RunZig (block-scoped defer, error-only errdefer) and RunGo (function-exit defer) — the same ops, two unwind machines.',

		prose: [
			'<h2>defer &amp; errdefer</h2>' +
			'<p>Two cleanup bugs every Go team eventually ships. The first: ' +
			'<code>defer f.Close()</code> inside a loop over 10,000 files — Go’s ' +
			'<code>defer</code> waits for <em>function</em> exit, so every descriptor ' +
			'stays open until the end and the process dies with ' +
			'<code>too many open files</code>. The second: a constructor inserts a DB ' +
			'row, then fails building the object — and the row stays behind, because ' +
			'cleanup was only written for the success path’s <code>Close</code>, not ' +
			'the failure path’s <em>undo</em>. Zig’s <code>defer</code> fixes the ' +
			'first by running at <strong>scope</strong> exit; <code>errdefer</code> ' +
			'fixes the second by running <strong>only on the error path</strong>:</p>',
			{ lang: 'txt', code: 'fn makeUser(db: *DB, name: []const u8) !User {\n    const id = try db.insert(name);\n    errdefer db.remove(id);   // undo the insert — ONLY if we fail below\n\n    {\n        const tmp = try openTemp();\n        defer tmp.close();     // fires at this BLOCK\'s closing brace...\n        try stage(tmp, id);\n    }                          // ...which is here — not at function exit\n\n    const u = try finish(id);  // fails? errdefer removes the row\n    return u;                  // succeeds? errdefer does NOT run:\n}                              // the row now belongs to the caller' },
			'<p>That <code>errdefer</code> is the <em>ownership-transfer</em> pattern: ' +
			'cleanup that must run on every failure but must <strong>not</strong> run ' +
			'on success, because the resource is being handed to the caller. Go has ' +
			'no primitive for it — the idiomatic workaround is the success-flag ' +
			'dance:</p>',
			{ code: 'id, err := db.insert(name)\nif err != nil {\n\treturn User{}, err\n}\nsuccess := false\ndefer func() {\n\tif !success {\n\t\tdb.remove(id) // undo — unless we made it to the end\n\t}\n}()\n// ... every later error return is covered ...\nsuccess = true // disarm the undo; ownership transfers to the caller\nreturn u, nil' },
			'<ul>' +
			'<li><strong>Scope, not function.</strong> A Zig <code>defer</code> in an ' +
			'inner block fires at that block’s closing brace — <em>before</em> any ' +
			'code after the block. Go’s fires at function exit, full stop (hence the ' +
			'wrap-the-loop-body-in-a-func idiom).</li>' +
			'<li><strong>LIFO unwind.</strong> Both languages agree here: last ' +
			'registered, first fired — teardown mirrors setup order.</li>' +
			'<li><strong><code>errdefer</code> is conditional on the exit.</strong> ' +
			'It sits in the same LIFO stack as <code>defer</code>, but during the ' +
			'unwind it fires only when the scope is exiting with an error; on a ' +
			'clean exit it is simply skipped in place.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Build both unwind machines over a list of <code>Op</code>s — ' +
			'<code>Kind</code> is <code>"do"</code> (runs immediately), ' +
			'<code>"defer"</code>, or <code>"errdefer"</code>; <code>Block</code> is 0 ' +
			'(function body) or 1 (an inner block; all Block-1 ops are contiguous, ' +
			'and the block closes after its last one). <code>RunZig(ops, fails)</code> ' +
			'applies Zig’s rules — <code>fails</code> means the <em>function</em> ' +
			'returns an error at the very end, so Block-0 errdefers fire; Block-1 ' +
			'errdefers <em>never</em> fire, because the inner block always closes ' +
			'normally before that final error. <code>RunGo(ops)</code> applies Go’s: ' +
			'every <code>defer</code> waits for function exit, whatever its block.</p>',
			{ lang: 'txt', code: 'ops: do(open) errdefer(undo) defer(log) do(use)\nRunZig(ops, false) → [open use log]         // errdefer skipped in place\nRunZig(ops, true)  → [open use log undo]    // fires in its LIFO position\n\nops: do(enter) defer(inner!1) do(work!1) do(after) defer(fnEnd)\nRunZig(ops, false) → [enter work inner after fnEnd]  // inner fires at its brace\nRunGo(ops)         → [enter work after fnEnd inner]  // Go: everything waits' },
		],

		starter: [
			'package main',
			'',
			'// Op is one step of a function body. Kind is "do" (runs immediately,',
			'// appending Label to the output), "defer", or "errdefer" (both register',
			'// Label for later). Block is the nesting depth: 0 = the function body,',
			'// 1 = an inner block. All Block-1 ops are contiguous, and the inner',
			'// block closes right after its last op.',
			'type Op struct {',
			'	Kind  string',
			'	Label string',
			'	Block int',
			'}',
			'',
			'// RunZig executes ops under Zig semantics and returns the labels in',
			'// execution order:',
			'//   - "do" appends its label immediately.',
			'//   - "defer"/"errdefer" push onto their block\'s stack.',
			'//   - When block 1 closes (after its last Block-1 op), its stack',
			'//     unwinds LIFO: defers fire; errdefers do NOT (the block exits',
			'//     normally — only the function as a whole may fail, at the end).',
			'//   - At function end, block 0\'s stack unwinds LIFO: defers always',
			'//     fire; errdefers fire only when fails is true, in their stack',
			'//     position (a non-firing errdefer is skipped, not reordered).',
			'func RunZig(ops []Op, fails bool) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// RunGo executes ops under Go semantics: "do" appends immediately, and',
			'// EVERY "defer" — regardless of Block — waits in one function-level',
			'// stack that unwinds LIFO at function end. (Ops here are only "do" and',
			'// "defer": Go has no errdefer, and the tests never send one.)',
			'func RunGo(ops []Op) []string {',
			'	// your code here',
			'	return nil',
			'}',
			'',
		].join('\n'),

		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// Op constructor and a printer: execution order renders as a',
			'	// space-joined trace so off-by-one reorderings are easy to spot.',
			'	op := func(kind, label string, block int) Op { return Op{Kind: kind, Label: label, Block: block} }',
			'	show := func(trace []string) string { return "[" + strings.Join(trace, " ") + "]" }',
			'',
			'	// The registrations used by the skipped-vs-fired pair: one errdefer',
			'	// UNDER a later defer, so its stack position is observable.',
			'	undoOps := []Op{op("do", "open", 0), op("errdefer", "undo", 0), op("defer", "log", 0), op("do", "use", 0)}',
			'	// The scope-rule ops: an inner-block defer registered BEFORE',
			'	// function-body work that follows the block.',
			'	scopeOps := []Op{op("do", "enter", 0), op("defer", "inner-cleanup", 1), op("do", "inner-work", 1), op("do", "after-block", 0), op("defer", "fn-cleanup", 0)}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"LIFO: two body defers unwind in reverse registration order",',
			'			"[A B d2 d1]",',
			'			func() string {',
			'				return show(RunZig([]Op{op("do", "A", 0), op("defer", "d1", 0), op("defer", "d2", 0), op("do", "B", 0)}, false))',
			'			}},',
			'		{"THE SCOPE RULE: the block-1 defer fires at its closing brace — BEFORE after-block runs",',
			'			"[enter inner-work inner-cleanup after-block fn-cleanup]",',
			'			func() string { return show(RunZig(scopeOps, false)) }},',
			'		{"RunGo on the SAME ops: Go holds every defer until function exit — inner-cleanup fires last",',
			'			"[enter inner-work after-block fn-cleanup inner-cleanup]",',
			'			func() string { return show(RunGo(scopeOps)) }},',
			'		{"success exit: the errdefer is skipped in place — ownership transferred, no undo",',
			'			"[open use log]",',
			'			func() string { return show(RunZig(undoOps, false)) }},',
			'		{"error exit, SAME registrations: the errdefer fires in its LIFO position (after log)",',
			'			"[open use log undo]",',
			'			func() string { return show(RunZig(undoOps, true)) }},',
			'		{"interleaved unwind on failure: e1 d1 e2 d2 registered -> d2 e2 d1 e1 fired",',
			'			"[d2 e2 d1 e1]",',
			'			func() string {',
			'				return show(RunZig([]Op{op("errdefer", "e1", 0), op("defer", "d1", 0), op("errdefer", "e2", 0), op("defer", "d2", 0)}, true))',
			'			}},',
			'		{"block-1 errdefer NEVER fires — the block exited normally before the function failed",',
			'			"[work blkD tail fnD]",',
			'			func() string {',
			'				return show(RunZig([]Op{op("defer", "fnD", 0), op("errdefer", "blkE", 1), op("defer", "blkD", 1), op("do", "work", 1), op("do", "tail", 0)}, true))',
			'			}},',
			'		{"ops end inside block 1: the block still closes (d1), then the function unwinds (d0)",',
			'			"[x d1 d0]",',
			'			func() string {',
			'				return show(RunZig([]Op{op("defer", "d0", 0), op("do", "x", 1), op("defer", "d1", 1)}, false))',
			'			}},',
			'		{"RunGo baseline: do then two defers -> LIFO at exit",',
			'			"[A d2 d1]",',
			'			func() string {',
			'				return show(RunGo([]Op{op("do", "A", 0), op("defer", "d1", 0), op("defer", "d2", 0)}))',
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
			'// Op is one step of a function body: Kind "do" runs immediately;',
			'// "defer"/"errdefer" register for later. Block 0 is the function body,',
			'// Block 1 an inner block whose ops are contiguous. Redeclared here',
			'// because the solution replaces the starter wholesale.',
			'type Op struct {',
			'	Kind  string',
			'	Label string',
			'	Block int',
			'}',
			'',
			'// unwind fires a deferred-op stack LIFO, appending fired labels to',
			'// trace. withErr tells the unwind HOW its scope is exiting: errdefer',
			'// entries fire only on an error exit; on a clean exit they are skipped',
			'// IN PLACE — the surrounding defers keep their positions, which is why',
			'// this is one walk with a per-entry condition rather than two passes.',
			'func unwind(trace []string, stack []Op, withErr bool) []string {',
			'	for i := len(stack) - 1; i >= 0; i-- {',
			'		entry := stack[i]',
			'		if entry.Kind == "defer" || (entry.Kind == "errdefer" && withErr) {',
			'			trace = append(trace, entry.Label)',
			'		}',
			'	}',
			'	return trace',
			'}',
			'',
			'// RunZig models Zig\'s scope-exit machinery. Two stacks — one per',
			'// scope — because that is literally what the semantics are: each',
			'// block owns its deferred work and settles it at its own closing',
			'// brace, not at some distant function epilogue.',
			'//',
			'//   registration:            unwind points:',
			'//   do ....... trace now     block 1 brace: block-1 stack, LIFO',
			'//   defer .... push          function end:  block-0 stack, LIFO',
			'//   errdefer . push          (errdefer: only if that scope errored)',
			'func RunZig(ops []Op, fails bool) []string {',
			'	trace := []string{}',
			'	block0 := []Op{} // function-scope registrations',
			'	block1 := []Op{} // inner-block registrations',
			'',
			'	for i, o := range ops {',
			'		switch o.Kind {',
			'		case "do":',
			'			trace = append(trace, o.Label)',
			'		case "defer", "errdefer":',
			'			if o.Block == 1 {',
			'				block1 = append(block1, o)',
			'			} else {',
			'				block0 = append(block0, o)',
			'			}',
			'		}',
			'',
			'		// The inner block closes right after its last op — either the',
			'		// next op belongs to the function body again, or the ops ran',
			'		// out while we were still inside. Its defers fire HERE, before',
			'		// any later function-body op executes: this is the scope rule',
			'		// Go lacks. withErr is false unconditionally — the function\'s',
			'		// eventual error (fails) happens at the very end, AFTER this',
			'		// block has already exited normally, so a block-1 errdefer has',
			'		// no error exit to observe and can never fire.',
			'		if o.Block == 1 && (i == len(ops)-1 || ops[i+1].Block == 0) {',
			'			trace = unwind(trace, block1, false)',
			'			block1 = block1[:0]',
			'		}',
			'	}',
			'',
			'	// Function exit: block 0 unwinds LIFO. Only here does fails matter',
			'	// — this is the scope that exits with the error, so its errdefers',
			'	// fire (or are skipped in place) according to it.',
			'	return unwind(trace, block0, fails)',
			'}',
			'',
			'// RunGo models Go\'s rule: defer is FUNCTION-scoped, so there is',
			'// exactly one stack and Block is ignored — an inner-block defer waits',
			'// just as long as a top-level one. (The famous consequence: defer',
			'// f.Close() in a loop holds every file open until return.) Kinds here',
			'// are only "do" and "defer" by contract; Go has no errdefer.',
			'func RunGo(ops []Op) []string {',
			'	trace := []string{}',
			'	stack := []string{}',
			'	for _, o := range ops {',
			'		if o.Kind == "do" {',
			'			trace = append(trace, o.Label)',
			'		} else {',
			'			stack = append(stack, o.Label)',
			'		}',
			'	}',
			'	for i := len(stack) - 1; i >= 0; i-- {',
			'		trace = append(trace, stack[i])',
			'	}',
			'	return trace',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why scope-exit matters more than it sounds</h3>' +
			'<p>The harness’s “scope rule” case — <code>inner-cleanup</code> firing ' +
			'<em>before</em> <code>after-block</code> — looks like a curiosity until ' +
			'you map it onto resources. In Zig, “open a temp file, use it, and be ' +
			'done with it before the next phase” is a braced block with a ' +
			'<code>defer</code>; the resource’s lifetime is drawn in the source as ' +
			'indentation. In Go, the same intent needs a helper function or an ' +
			'explicit <code>Close</code> mid-function, because <code>defer</code> ' +
			'only knows one unwind point. The loop version is the one that pages ' +
			'people: <code>for _, p := range paths { f, _ := os.Open(p); defer ' +
			'f.Close() }</code> accumulates every close until return — the standard ' +
			'fix, wrapping the body in <code>func() { ... }()</code>, is manually ' +
			'reintroducing the block scoping you just implemented in ' +
			'<code>RunZig</code>.</p>' +
			'<h3>errdefer is about ownership, not cleanup</h3>' +
			'<p>Read <code>errdefer db.remove(id)</code> as a statement about ' +
			'<em>who owns the row right now</em>: from the insert until the return, ' +
			'the function owns it and must destroy it on any failure; at a ' +
			'successful return, ownership transfers to the caller and the undo must ' +
			'be disarmed. Your <code>unwind</code> models the disarming as ' +
			'skip-in-place, which is exactly right — an errdefer never reorders its ' +
			'neighbors, it just declines to fire. The pattern generalizes to every ' +
			'multi-step constructor (allocate A, errdefer free A, allocate B, ' +
			'errdefer free B, …): on the first failure, the LIFO unwind releases ' +
			'precisely the steps that succeeded, in reverse order. C programmers ' +
			'recognize this as the <code>goto fail</code> cleanup ladder; Zig turned ' +
			'the ladder into a one-word declaration per rung.</p>' +
			'<h3>Why block-1 errdefers never fired</h3>' +
			'<p>The subtlest pin in the harness: even with <code>fails=true</code>, ' +
			'the inner block’s errdefer stays silent. The reason is that ' +
			'<code>errdefer</code> watches <em>its own scope’s</em> exit, not the ' +
			'function’s fate. Our model’s inner block always runs to its closing ' +
			'brace — a normal exit — and the function’s error happens later, in a ' +
			'scope the block no longer exists in. Real Zig behaves the same way: an ' +
			'<code>errdefer</code> inside a block whose <code>try</code>s all succeed ' +
			'is dead weight the moment the brace closes. (Two Zig details this model ' +
			'omits: <code>errdefer |err| { ... }</code> can capture the error value, ' +
			'and a <code>defer</code> body may not itself <code>return</code> or ' +
			'<code>try</code> — the unwind is not allowed to change the verdict, a ' +
			'restriction Go does not share, since a Go deferred closure can rewrite ' +
			'named results.)</p>',
		],
		complexity: { time: 'O(n) — each op is registered once and unwound at most once', space: 'O(n) for the per-scope defer stacks' },
	});
})();
