/* Match Exhaustiveness — Enums & Matching (Medium). The check that makes
 * Rust enums more than Go iota constants: a match must cover every variant
 * (E0004, hard error) and dead arms are flagged. Implemented as one ordered
 * walk with a covered-set — the same walk rustc's usefulness analysis does
 * at the single-variant granularity.
 */
(function () {
	'use strict';
	var T = GoLearnRust;

	// A match statement with coverage annotations: two covered, one missing,
	// one unreachable.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 540 200" width="540" height="200" role="img" aria-label="a match over a three-variant enum: two arms covered, one variant missing makes E0004, an arm after the wildcard is unreachable">' +
		'<text x="20" y="24" class="lbl">enum Status { Active, Idle, Banned }   —   match s { … }</text>' +
		'<rect x="40" y="40" width="200" height="30" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="140" y="60" text-anchor="middle">Active =&gt; …</text>' +
		'<text x="260" y="60" class="lbl" style="fill:var(--ok)">covers Active</text>' +
		'<rect x="40" y="78" width="200" height="30" rx="6" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="140" y="98" text-anchor="middle">Idle =&gt; …</text>' +
		'<text x="260" y="98" class="lbl" style="fill:var(--ok)">covers Idle</text>' +
		'<rect x="40" y="116" width="200" height="30" rx="6" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="140" y="136" text-anchor="middle">_ =&gt; …</text>' +
		'<text x="260" y="136" class="lbl">absorbs Banned — match is exhaustive</text>' +
		'<rect x="40" y="154" width="200" height="30" rx="6" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="140" y="174" text-anchor="middle" class="lbl">Banned =&gt; …</text>' +
		'<text x="260" y="174" class="lbl" style="fill:var(--err-fg)">unreachable: the _ above already took it</text>' +
		'</svg>';

	T.problem({
		id: 'match-exhaustiveness',
		title: 'Match Exhaustiveness',
		nav: 'match exhaustiveness',
		difficulty: 'Medium',
		category: 'Enums & Matching',
		task: 'Implement CheckMatch — report missing variants and unreachable arms, exactly as rustc would. All 7 tests.',

		prose: [
			'<h2>Match Exhaustiveness</h2>' +
			'<p>Go models “one of a fixed set” with iota constants and a ' +
			'<code>switch</code> — and when someone adds a fourth constant, every ' +
			'forgotten <code>switch</code> silently falls through to nothing. Rust ' +
			'enums close that hole: <code>match</code> must handle <em>every</em> ' +
			'variant, and forgetting one is a hard compile error, not a lint:</p>',
			{ lang: 'rust', code: 'enum Status { Active, Idle, Banned }\n\nmatch s {\n    Status::Active => greet(),\n    Status::Idle   => nudge(),\n}   // error[E0004]: non-exhaustive patterns: `Status::Banned` not covered' },
			'<p>This is the property that makes “add a variant, chase the compile ' +
			'errors” a reliable refactoring strategy — every match in the codebase that ' +
			'needs a decision <em>is</em> an error until you decide. The wildcard ' +
			'<code>_</code> opts a match out (“everything else”), and arms are tried top ' +
			'to bottom, which cuts both ways: an arm that can never win its race is dead ' +
			'code, and rustc flags it:</p>' +
			'<ul>' +
			'<li>an arm <em>after</em> <code>_</code> — the wildcard already took ' +
			'everything;</li>' +
			'<li>a <em>duplicate</em> of an already-covered variant;</li>' +
			'<li>a <code>_</code> when every variant is already covered — the wildcard ' +
			'itself is dead.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>CheckMatch(variants, arms)</code>: walk the arms in ' +
			'order and return the <strong>missing</strong> variants (in enum declaration ' +
			'order; none if a live <code>_</code> is present) and the ' +
			'<strong>unreachable</strong> arms (as <code>"arm:INDEX"</code>, in arm ' +
			'order). An unreachable arm still does <em>not</em> cover anything — dead ' +
			'code contributes nothing to exhaustiveness.</p>',
			{ code: 'variants [A B C], arms [A B C]      → missing []       unreachable []\nvariants [A B C], arms [A]          → missing [B C]    unreachable []\nvariants [A B C], arms [A _]        → missing []       unreachable []\nvariants [A B C], arms [A _ B]      → missing []       unreachable [arm:2]\nvariants [A B C], arms [A A]        → missing [B C]    unreachable [arm:1]\nvariants [A B C], arms [A B C _]    → missing []       unreachable [arm:3]', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// CheckMatch analyzes a match over an enum.',
			'//   variants — the enum\'s variants, in declaration order',
			'//   arms     — the match arms, in source order; "_" is the wildcard',
			'// It returns:',
			'//   missing     — variants no live arm covers, in declaration order',
			'//                 (empty if a live "_" absorbs the rest)',
			'//   unreachable — dead arms as "arm:INDEX" (0-based), in arm order:',
			'//                 any arm after a live "_", a duplicate of a covered',
			'//                 variant, or a "_" when all variants are covered.',
			'// Unreachable arms cover nothing.',
			'func CheckMatch(variants, arms []string) (missing, unreachable []string) {',
			'	// your code here',
			'	return nil, nil',
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
			'	type tc struct {',
			'		name     string',
			'		variants []string',
			'		arms     []string',
			'		wantMiss []string',
			'		wantDead []string',
			'	}',
			'	abc := []string{"A", "B", "C"}',
			'	cases := []tc{',
			'		{"every variant covered once: clean", abc,',
			'			[]string{"A", "B", "C"}, []string{}, []string{}},',
			'		{"E0004: two variants not covered", abc,',
			'			[]string{"A"}, []string{"B", "C"}, []string{}},',
			'		{"wildcard absorbs the rest: exhaustive", abc,',
			'			[]string{"A", "_"}, []string{}, []string{}},',
			'		{"arm after the wildcard is unreachable", abc,',
			'			[]string{"A", "_", "B"}, []string{}, []string{"arm:2"}},',
			'		{"duplicate arm is unreachable AND covers nothing new", abc,',
			'			[]string{"A", "A"}, []string{"B", "C"}, []string{"arm:1"}},',
			'		{"wildcard after full coverage is itself dead", abc,',
			'			[]string{"A", "B", "C", "_"}, []string{}, []string{"arm:3"}},',
			'		{"missing list preserves declaration order, not arm order", abc,',
			'			[]string{"B"}, []string{"A", "C"}, []string{}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("missing=%v dead=%v", c.wantMiss, c.wantDead),',
			'		}',
			'		runCase(r, func() {',
			'			miss, dead := CheckMatch(append([]string(nil), c.variants...), append([]string(nil), c.arms...))',
			'			got := fmt.Sprintf("missing=%v dead=%v", miss, dead)',
			'			want := fmt.Sprintf("missing=%v dead=%v", c.wantMiss, c.wantDead)',
			'			r["pass"] = got == want',
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
			'// CheckMatch analyzes a match over an enum, returning the variants no',
			'// live arm covers and the arms that can never run.',
			'//',
			'// One ordered walk with two pieces of state — covered (set of',
			'// variants some live arm owns) and wildcard (a live "_" was seen).',
			'// Each arm is judged against the state BEFORE it, then allowed to',
			'// extend that state only if it was reachable: dead code must not',
			'// count toward exhaustiveness, or [A, _, B] would report B covered',
			'// by an arm that can never run.',
			'func CheckMatch(variants, arms []string) (missing, unreachable []string) {',
			'	covered := map[string]bool{}',
			'	wildcard := false',
			'	missing = []string{}',
			'	unreachable = []string{}',
			'',
			'	for i, arm := range arms {',
			'		// Reachability first: is anything left for this arm?',
			'		dead := wildcard // a live _ above took everything',
			'		if arm == "_" {',
			'			// A wildcard is dead when it has nothing to absorb:',
			'			// every variant already has an owner.',
			'			dead = dead || len(covered) == len(variants)',
			'		} else {',
			'			dead = dead || covered[arm]',
			'		}',
			'		if dead {',
			'			unreachable = append(unreachable, fmt.Sprintf("arm:%d", i))',
			'			continue // dead arms contribute nothing',
			'		}',
			'		if arm == "_" {',
			'			wildcard = true',
			'		} else {',
			'			covered[arm] = true',
			'		}',
			'	}',
			'',
			'	// Exhaustiveness is judged against the enum declaration, not the',
			'	// arms — iterating variants (not covered) is what puts missing in',
			'	// declaration order for free.',
			'	if !wildcard {',
			'		for _, v := range variants {',
			'			if !covered[v] {',
			'				missing = append(missing, v)',
			'			}',
			'		}',
			'	}',
			'	return missing, unreachable',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Judge, then extend</h3>' +
			'<p>The subtle case is <code>[A, _, B]</code>: the <code>B</code> arm is ' +
			'unreachable, and it must <em>also</em> not mark B covered — reachability is ' +
			'judged against the state before the arm, and only reachable arms get to ' +
			'extend that state. The <code>continue</code> carries that rule:</p>',
			{ code: 'if dead {\n\tunreachable = append(unreachable, fmt.Sprintf("arm:%d", i))\n\tcontinue // dead arms contribute nothing\n}' },
			'<p>Here it makes no difference to <code>missing</code> (the wildcard already ' +
			'made the match exhaustive), but the principle is what rustc actually ' +
			'implements: an arm’s <em>usefulness</em> — does it match anything the arms ' +
			'above leave behind? — is computed first, and coverage grows only from useful ' +
			'arms.</p>' +
			'<h3>Two diagnostics, two severities</h3>' +
			'<p>Missing variants are a hard error (E0004): the match expression would ' +
			'have no value for some input, and Rust has no “fall through and do nothing”. ' +
			'Unreachable arms are a warning: the program is well-defined, just carrying ' +
			'dead code. That asymmetry is why <code>missing</code> respects a live ' +
			'wildcard (the error genuinely goes away) while <code>unreachable</code> ' +
			'keeps accumulating after one.</p>' +
			'<h3>The refactoring superpower — and the _ tax</h3>' +
			'<p>Exhaustiveness turns the compiler into a todo list: add ' +
			'<code>Suspended</code> to <code>Status</code> and every match without a ' +
			'wildcard becomes an E0004 pointing at exactly the code that needs a ' +
			'decision. This is also the argument for <em>avoiding</em> <code>_</code> in ' +
			'your own matches: each wildcard is a match that will silently absorb future ' +
			'variants instead of asking you about them. The real checker goes far deeper ' +
			'than variant names — patterns nest (<code>Some(Status::Active)</code>), ' +
			'carry guards, and destructure — but every layer answers this same ' +
			'usefulness question over a richer pattern algebra.</p>',
		],
		complexity: { time: 'O(a + v) — one pass over arms, one over variants', space: 'O(v) for the covered set' },
	});
})();
