/* The Borrow Checker — Borrowing (Medium). The aliasing rule that defines
 * the language: any number of shared borrows XOR exactly one mutable borrow,
 * judged over non-lexical lifetimes (a borrow lives from creation to last
 * use, not to the closing brace). Implemented as interval-overlap detection,
 * which is genuinely all it is at this granularity.
 */
(function () {
	'use strict';
	var T = GoLearnRust;

	// Two timelines over the same statements: the rejected overlap and the
	// NLL-accepted sequential version.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="a mutable borrow overlapping a shared borrow is rejected; after the shared borrow ends it is fine">' +
		'<text x="20" y="24" class="lbl">borrows as intervals over statement time — created → last use</text>' +
		// axis
		'<path d="M 90 44 L 90 190" stroke="var(--edge)" stroke-width="1"/>' +
		'<text x="60" y="60" class="lbl" text-anchor="end">stmt 0</text>' +
		'<text x="60" y="180" class="lbl" text-anchor="end">stmt 6</text>' +
		// left: conflict
		'<text x="150" y="52" class="lbl" style="fill:var(--err-fg)">rejected: overlap</text>' +
		'<rect x="120" y="60" width="26" height="90" rx="5" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="133" y="168" text-anchor="middle" class="lbl">&amp;x</text>' +
		'<rect x="160" y="90" width="26" height="90" rx="5" fill="none" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="173" y="196" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">&amp;mut x</text>' +
		'<text x="200" y="130" class="lbl" style="fill:var(--err-fg)">E0502</text>' +
		// right: NLL ok
		'<text x="390" y="52" class="lbl" style="fill:var(--ok)">accepted: shared borrow ended</text>' +
		'<rect x="360" y="60" width="26" height="50" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="373" y="128" text-anchor="middle" class="lbl">&amp;x</text>' +
		'<rect x="400" y="120" width="26" height="60" rx="5" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="413" y="196" text-anchor="middle" class="lbl">&amp;mut x</text>' +
		'<text x="440" y="150" class="lbl" style="fill:var(--ok)">no overlap → ok</text>' +
		'</svg>';

	T.problem({
		id: 'borrow-checker',
		title: 'The Borrow Checker',
		nav: 'borrow checker',
		difficulty: 'Medium',
		category: 'Borrowing',
		task: 'Implement FirstConflict — find the first pair of overlapping borrows where at least one is mutable. All 7 tests.',

		prose: [
			'<h2>The Borrow Checker</h2>' +
			'<p>Go lets any number of goroutines hold pointers to the same value and ' +
			'trusts you (plus the race detector, after the fact) to coordinate writes. ' +
			'Rust moves that discipline to compile time with one rule — the most ' +
			'important sentence in the language:</p>' +
			'<p><strong>At any point, a value may have either any number of shared ' +
			'borrows (<code>&amp;T</code>) or exactly one mutable borrow ' +
			'(<code>&amp;mut T</code>) — never both.</strong></p>' +
			'<p>Readers never see a value mid-mutation, and two writers never interleave ' +
			'— data-race freedom as a type rule rather than a runtime tool:</p>',
			{ lang: 'rust', code: 'let mut x = vec![1, 2, 3];\nlet r = &x;             // shared borrow of x begins\nx.push(4);              // error[E0502]: cannot borrow `x` as mutable\n                        //   because it is also borrowed as immutable\nprintln!("{:?}", r);    // r\'s last use — the shared borrow ends HERE' },
			'<p>Since 2018 the checker uses <strong>non-lexical lifetimes</strong> (NLL): ' +
			'a borrow lives from creation to its <em>last use</em>, not to the closing ' +
			'brace. Reorder the two lines so <code>println!</code> comes before the ' +
			'<code>push</code>, and the same program compiles — the shared borrow is ' +
			'already over when the mutation happens.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>At this granularity the checker is interval logic. Each borrow of one ' +
			'variable is an interval <code>[Start, End]</code> over statement indices ' +
			'(created at <code>Start</code>, last used at <code>End</code>, inclusive). ' +
			'Implement <code>FirstConflict</code>: scan pairs in input order — for each ' +
			'borrow, check it against every earlier borrow — and return ' +
			'<code>"earlier,later"</code> for the first pair whose intervals overlap ' +
			'where at least one side is mutable. Return <code>""</code> if the program ' +
			'borrow-checks.</p>',
			{ code: '&x [0,4]  &x [1,5]                → ""            readers may pile up\n&x [0,4]  &mut x [2,5]            → "r,m"         E0502: overlap, one is mut\n&x [0,1]  &mut x [2,5]            → ""            NLL: reader ended first\n&mut x [0,2]  &mut x [3,5]        → ""            writers may take turns\n&mut x [0,3]  &mut x [2,5]        → "m1,m2"       E0499: two live &mut', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Borrow is one borrow of a single variable, alive over the closed',
			'// statement interval [Start, End] — creation to last use (NLL).',
			'type Borrow struct {',
			'	Name  string',
			'	Mut   bool',
			'	Start int',
			'	End   int',
			'}',
			'',
			'// FirstConflict returns "a,b" (earlier name, later name) for the first',
			'// conflicting pair, scanning each borrow against all earlier ones in',
			'// input order; "" if every pair coexists legally.',
			'//',
			'// Two borrows conflict iff their intervals overlap AND at least one',
			'// side is mutable. Touching endpoints (End == other.Start) count as',
			'// overlap: at that statement both borrows are live.',
			'func FirstConflict(borrows []Borrow) string {',
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
			'	sh := func(n string, s, e int) Borrow { return Borrow{Name: n, Start: s, End: e} }',
			'	mu := func(n string, s, e int) Borrow { return Borrow{Name: n, Mut: true, Start: s, End: e} }',
			'',
			'	type tc struct {',
			'		name    string',
			'		borrows []Borrow',
			'		want    string',
			'	}',
			'	cases := []tc{',
			'		{"two overlapping shared borrows: readers may pile up",',
			'			[]Borrow{sh("r1", 0, 4), sh("r2", 1, 5)}, ""},',
			'		{"E0502: mutable borrow overlaps a live shared borrow",',
			'			[]Borrow{sh("r", 0, 4), mu("m", 2, 5)}, "r,m"},',
			'		{"NLL: shared borrow\'s last use precedes the &mut — compiles",',
			'			[]Borrow{sh("r", 0, 1), mu("m", 2, 5)}, ""},',
			'		{"two mutable borrows taking turns: sequential is fine",',
			'			[]Borrow{mu("m1", 0, 2), mu("m2", 3, 5)}, ""},',
			'		{"E0499: two mutable borrows alive at once",',
			'			[]Borrow{mu("m1", 0, 3), mu("m2", 2, 5)}, "m1,m2"},',
			'		{"touching endpoints: last use of r IS the statement taking &mut",',
			'			[]Borrow{sh("r", 0, 2), mu("m", 2, 4)}, "r,m"},',
			'		{"first conflict wins: report r1,m not r2,m",',
			'			[]Borrow{sh("r1", 0, 5), sh("r2", 1, 5), mu("m", 3, 6)}, "r1,m"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%q", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := FirstConflict(append([]Borrow(nil), c.borrows...))',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%q", got)',
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
			'// Borrow is one borrow of a single variable, alive over the closed',
			'// statement interval [Start, End] — creation to last use (NLL).',
			'type Borrow struct {',
			'	Name  string',
			'	Mut   bool',
			'	Start int',
			'	End   int',
			'}',
			'',
			'// FirstConflict returns "a,b" (earlier name, later name) for the first',
			'// conflicting pair, "" if every pair coexists legally.',
			'//',
			'// The scan order matters for WHICH conflict is reported, so the loop',
			'// mirrors the spec directly: for each borrow j, check all earlier',
			'// borrows i in order. The outer index advancing one statement at a',
			'// time is also how rustc reports the first error it reaches.',
			'func FirstConflict(borrows []Borrow) string {',
			'	for j := 1; j < len(borrows); j++ {',
			'		for i := 0; i < j; i++ {',
			'			a, b := borrows[i], borrows[j]',
			'',
			'			// Closed intervals overlap iff each starts no later',
			'			// than the other ends. Touching endpoints overlap:',
			'			// at that statement both borrows are live at once.',
			'			overlap := a.Start <= b.End && b.Start <= a.End',
			'',
			'			// The aliasing rule in one expression: overlap is',
			'			// only illegal when someone in the overlap can write.',
			'			// Shared+shared is exactly the case left legal.',
			'			if overlap && (a.Mut || b.Mut) {',
			'				return a.Name + "," + b.Name',
			'			}',
			'		}',
			'	}',
			'	return ""',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The rule is one boolean expression</h3>' +
			'<p>Strip away the terminology and the borrow checker at this granularity is ' +
			'two conditions ANDed:</p>',
			{ code: 'overlap := a.Start <= b.End && b.Start <= a.End\nif overlap && (a.Mut || b.Mut) { /* E0502 or E0499 */ }' },
			'<p>Readers-and-writers is the familiar shape: this is an ' +
			'<code>RWMutex</code> whose lock/unlock pairs are inferred from your code and ' +
			'checked before it ever runs. <code>&amp;T</code> is <code>RLock</code>, ' +
			'<code>&amp;mut T</code> is <code>Lock</code>, and a would-be deadlock is a ' +
			'compile error instead of a hang.</p>' +
			'<h3>NLL is why the intervals end at last use</h3>' +
			'<p>Pre-2018, a borrow lasted to the closing brace — the left timeline in the ' +
			'diagram was the only timeline, and programmers added artificial ' +
			'<code>{ }</code> scopes just to end borrows early. Non-lexical lifetimes ' +
			'shrank every borrow to its last use, which is precisely why ' +
			'<code>End</code> in this model is “last use”, and why reordering a ' +
			'<code>println!</code> above a <code>push</code> can turn E0502 into a clean ' +
			'compile. When rustc rejects your code, the fix is usually not “restructure ' +
			'everything” but “end the borrow sooner”: use it, then mutate.</p>' +
			'<h3>What the real checker adds</h3>' +
			'<p>rustc runs this idea over a control-flow graph rather than a straight ' +
			'line: borrows have <em>sets</em> of live program points, branches make the ' +
			'sets diverge, and two-phase borrows let <code>v.push(v.len())</code> ' +
			'coexist with itself. But every one of those refinements is still deciding ' +
			'the same question you just implemented — do a writer’s live points ' +
			'intersect anyone else’s? The rule also explains why <code>&amp;mut</code> ' +
			'was not Copy back in the ownership problems: duplicating one would ' +
			'manufacture exactly the overlap this function exists to reject.</p>',
		],
		complexity: { time: 'O(n²) — every pair checked once; rustc does the same work over a CFG', space: 'O(1)' },
	});
})();
