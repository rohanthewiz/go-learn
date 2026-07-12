/* S3 Lifecycle Policies — Storage (Easy). Which storage class is an object
 * in on day N? Lifecycle rules are a tiny state machine over object age;
 * the learner implements the resolution order AWS documents (latest
 * applicable transition wins, expiration beats everything). Exact-table
 * harness; one case verifies the input slice is not mutated.
 */
(function () {
	'use strict';
	var T = GoLearnAWS;

	// Object-age timeline with the class band each rule window produces.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 150" width="520" height="150" role="img" aria-label="object age timeline: STANDARD until day 30, STANDARD_IA until day 90, GLACIER_IR until day 365, then EXPIRED">' +
		// timeline axis
		'<line x1="30" y1="95" x2="500" y2="95" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowS3L)"/>' +
		// class bands (widths loosely proportional, compressed after day 90)
		'<rect x="30" y="55" width="90" height="30" rx="4" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="75" y="75" text-anchor="middle" class="lbl">STANDARD</text>' +
		'<rect x="124" y="55" width="110" height="30" rx="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="179" y="75" text-anchor="middle" class="lbl">STANDARD_IA</text>' +
		'<rect x="238" y="55" width="160" height="30" rx="4" fill="none" stroke="var(--dim)" stroke-width="1.6"/>' +
		'<text x="318" y="75" text-anchor="middle" class="lbl">GLACIER_IR</text>' +
		'<rect x="402" y="55" width="80" height="30" rx="4" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="4 3"/>' +
		'<text x="442" y="75" text-anchor="middle" class="lbl">EXPIRED</text>' +
		// tick labels
		'<text x="30" y="112" class="lbl">day 0</text>' +
		'<text x="124" y="112" text-anchor="middle" class="lbl">30</text>' +
		'<text x="238" y="112" text-anchor="middle" class="lbl">90</text>' +
		'<text x="402" y="112" text-anchor="middle" class="lbl">365</text>' +
		'<text x="490" y="112" text-anchor="end" class="lbl">object age →</text>' +
		// rule annotations
		'<text x="30" y="30" class="lbl">rules: after 30d → STANDARD_IA · after 90d → GLACIER_IR · expire after 365d</text>' +
		'<text x="30" y="140" class="lbl">latest rule whose AfterDays ≤ age wins; expiration beats any transition</text>' +
		'<defs><marker id="dgArrowS3L" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 's3-lifecycle',
		title: 'S3 Lifecycle Policies',
		nav: 'S3 Lifecycle',
		difficulty: 'Easy',
		category: 'Storage',
		task: 'Implement ClassAt — resolve an object’s storage class from its age and the lifecycle rules. Make all 6 tests pass.',

		prose: [
			'<h2>S3 Lifecycle Policies</h2>' +
			'<p><strong>Exam scenario.</strong> A company stores application logs in S3. Logs are ' +
			'analyzed heavily for 30 days, referenced occasionally for 90, kept for compliance ' +
			'for a year, then must be deleted. The architect should configure… a <em>lifecycle ' +
			'policy</em> — and the exam expects you to know exactly which class an object is in ' +
			'on any given day.</p>' +
			'<p>A lifecycle configuration is a set of <em>transition rules</em> (“after N days, ' +
			'move to class X”) plus an optional <em>expiration</em> (“after E days, delete”). ' +
			'AWS resolves them with a simple, documented procedure:</p>' +
			'<ul>' +
			'<li>Every object starts in <code>STANDARD</code>.</li>' +
			'<li>Among all transitions whose <code>AfterDays ≤ age</code>, the one with the ' +
			'<strong>largest</strong> <code>AfterDays</code> wins — the object has already flowed ' +
			'through the earlier ones.</li>' +
			'<li>If <code>expireAfterDays &gt; 0</code> and <code>age ≥ expireAfterDays</code>, the ' +
			'object is <code>EXPIRED</code> — expiration beats any transition.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>ClassAt(ageDays, transitions, expireAfterDays)</code>. The rules ' +
			'may arrive in any order — sort a <em>copy</em>; the tests check you don’t mutate ' +
			'the caller’s slice. A transition applies on its boundary day (age 30 with ' +
			'<code>AfterDays: 30</code> has already transitioned).</p>',
			{ code: 'rules := []Transition{{30, "STANDARD_IA"}, {90, "GLACIER_IR"}}\nClassAt(0, rules, 365)   → "STANDARD"\nClassAt(60, rules, 365)  → "STANDARD_IA"\nClassAt(365, rules, 365) → "EXPIRED"', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Transition moves an object to a colder storage class once the object',
			'// is at least AfterDays old.',
			'type Transition struct {',
			'	AfterDays int    // object age (days) at which the rule takes effect',
			'	Class     string // destination class, e.g. "STANDARD_IA"',
			'}',
			'',
			'// ClassAt returns the storage class of an object ageDays old under the',
			'// given lifecycle configuration.',
			'//',
			'//   - Objects start in "STANDARD".',
			'//   - Among transitions with AfterDays <= ageDays, the LARGEST AfterDays',
			'//     wins. transitions may be unsorted — sort a copy, never mutate the',
			'//     caller\'s slice.',
			'//   - If expireAfterDays > 0 and ageDays >= expireAfterDays, return',
			'//     "EXPIRED" (expiration beats any transition).',
			'func ClassAt(ageDays int, transitions []Transition, expireAfterDays int) string {',
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
			'	"reflect"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		name        string',
			'		age         int',
			'		transitions []Transition',
			'		expire      int',
			'		want        string',
			'	}',
			'	sorted := []Transition{{30, "STANDARD_IA"}, {90, "GLACIER_IR"}}',
			'	// Unsorted on purpose: a scan that returns the FIRST rule with',
			'	// AfterDays <= age (instead of the largest) picks STANDARD_IA here.',
			'	unsorted := []Transition{{180, "DEEP_ARCHIVE"}, {30, "STANDARD_IA"}, {90, "GLACIER_IR"}}',
			'	cases := []tc{',
			'		{"new object: age 0", 0, sorted, 365, "STANDARD"},',
			'		{"boundary day: age 30, rule AfterDays=30", 30, sorted, 365, "STANDARD_IA"},',
			'		{"between rules: age 60", 60, sorted, 365, "STANDARD_IA"},',
			'		{"unsorted rules: age 120", 120, unsorted, 365, "GLACIER_IR"},',
			'		{"expiration beats transition: age 365", 365, sorted, 365, "EXPIRED"},',
			'		{"no expiration (0): age 400", 400, sorted, 0, "GLACIER_IR"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%s — transitions=%v expire=%d", c.name, c.transitions, c.expire),',
			'			"want":  c.want,',
			'		}',
			'		runCase(r, func() {',
			'			// Hand the user a fresh copy, keep the original to detect',
			'			// in-place sorting (the classic sort.Slice-on-the-argument bug).',
			'			in := append([]Transition(nil), c.transitions...)',
			'			got := ClassAt(c.age, in, c.expire)',
			'			mutated := !reflect.DeepEqual(in, c.transitions)',
			'			r["pass"] = got == c.want && !mutated',
			'			if mutated {',
			'				r["got"] = fmt.Sprintf("%s (input slice was reordered — sort a copy)", got)',
			'			} else {',
			'				r["got"] = got',
			'			}',
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
			'import "sort"',
			'',
			'// Transition moves an object to a colder storage class once the object',
			'// is at least AfterDays old.',
			'type Transition struct {',
			'	AfterDays int    // object age (days) at which the rule takes effect',
			'	Class     string // destination class, e.g. "STANDARD_IA"',
			'}',
			'',
			'// ClassAt returns the storage class of an object ageDays old under the',
			'// given lifecycle configuration.',
			'//',
			'// The rule set is a state machine keyed on age, so resolution is just',
			'// "last state whose entry day has passed". Expiration is checked first',
			'// because a deleted object has no storage class — it beats any',
			'// transition that would otherwise apply on the same day.',
			'func ClassAt(ageDays int, transitions []Transition, expireAfterDays int) string {',
			'	if expireAfterDays > 0 && ageDays >= expireAfterDays {',
			'		return "EXPIRED"',
			'	}',
			'',
			'	// Sort a COPY: callers own their rule slice, and lifecycle configs',
			'	// are shared, read-mostly data — mutating an argument as a side',
			'	// effect of a query is how subtle ordering bugs get shipped.',
			'	rules := append([]Transition(nil), transitions...)',
			'	sort.Slice(rules, func(i, j int) bool { return rules[i].AfterDays < rules[j].AfterDays })',
			'',
			'	// Walk the sorted rules and remember the last one that has taken',
			'	// effect. Ascending order means the final match is automatically',
			'	// the largest AfterDays <= ageDays — no second pass needed.',
			'	class := "STANDARD" // the state every object starts in',
			'	for _, t := range rules {',
			'		if t.AfterDays <= ageDays {',
			'			class = t.Class',
			'		} else {',
			'			break // sorted: every later rule is in the future too',
			'		}',
			'	}',
			'	return class',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Policy as state machine</h3>' +
			'<p>The insight that makes this trivial is reading the rule set as a ' +
			'<strong>policy-as-state-machine</strong>: each transition is a state with an entry ' +
			'day, and an object’s class is simply the last state whose entry day has passed. ' +
			'Sort the rules by <code>AfterDays</code> and the answer is the final rule the age ' +
			'walks past:</p>',
			{ code: 'rules := append([]Transition(nil), transitions...) // copy — never mutate input\nsort.Slice(rules, func(i, j int) bool { return rules[i].AfterDays < rules[j].AfterDays })\nclass := "STANDARD"\nfor _, t := range rules {\n\tif t.AfterDays <= ageDays {\n\t\tclass = t.Class // keep overwriting: last match = largest AfterDays\n\t}\n}' },
			'<p>Two details carry the semantics: expiration is checked <em>first</em> (a deleted ' +
			'object has no class, whatever the transitions say), and the boundary is inclusive — ' +
			'on day 30 a <code>AfterDays: 30</code> rule has already fired. The same ' +
			'latest-applicable-rule resolution appears anywhere config is layered by threshold: ' +
			'tiered pricing brackets, log-retention schedules, TTL cascades.</p>' +
			'<h3>Exam takeaway</h3>' +
			'<p>Lifecycle policies are <em>the</em> answer to “reduce S3 storage cost ' +
			'automatically as data ages.” Remember the guardrails the exam loves: transitions ' +
			'only flow <em>colder</em> (never Glacier back to Standard), and the infrequent tiers ' +
			'carry <em>minimum storage-duration charges</em> — 30 days for Standard-IA, 90 days ' +
			'for Glacier tiers — so transitioning data you’ll delete next week costs more ' +
			'than leaving it alone. Expiration always wins over any transition scheduled for ' +
			'the same day.</p>',
		],
		complexity: { time: 'O(n log n) — sorting the rules', space: 'O(n) — the sorted copy' },
	});
})();
