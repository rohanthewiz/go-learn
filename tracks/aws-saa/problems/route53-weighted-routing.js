/* Route 53 Weighted Routing — Networking (Easy). How weighted record sets
 * pick an answer: cumulative-weight walk over an injected roll. The injected
 * roll is the testability lesson (production uses randomness; tests inject
 * it), and weight-0 draining is the operational lesson.
 */
(function () {
	'use strict';
	var T = GoLearnAWS;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 150" width="500" height="150" role="img" aria-label="weighted routing: a bar divided 90/10 with a roll arrow landing in the canary segment">' +
		'<text x="20" y="24" class="lbl">total weight = 100 · roll ∈ [0, 100)</text>' +
		// stable segment (90%)
		'<rect x="20" y="40" width="396" height="36" rx="4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="218" y="63" text-anchor="middle">stable · weight 90</text>' +
		// canary segment (10%)
		'<rect x="416" y="40" width="44" height="36" rx="4" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="438" y="63" text-anchor="middle" class="lbl">canary</text>' +
		// cumulative tick labels
		'<text x="20" y="94" class="lbl">0</text>' +
		'<text x="416" y="94" text-anchor="middle" class="lbl">90</text>' +
		'<text x="460" y="94" text-anchor="middle" class="lbl">100</text>' +
		// roll arrow landing at 93
		'<path d="M 430 130 L 430 82" fill="none" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowR53)"/>' +
		'<text x="360" y="144" class="lbl">roll = 93 → canary</text>' +
		'<defs><marker id="dgArrowR53" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'route53-weighted-routing',
		title: 'Route 53 Weighted Routing',
		nav: 'R53 Weighted',
		difficulty: 'Easy',
		category: 'Networking',
		task: 'Implement Pick — cumulative-weight selection over an injected roll. Make all 6 tests pass.',

		prose: [
			'<h2>Route 53 Weighted Routing</h2>' +
			'<p>You are rolling out version 2 of a web tier. The plan is a <em>canary</em>: ' +
			'send 10% of DNS queries to the new fleet and 90% to the old one, watch the ' +
			'error rate, then shift the weights. Route 53 does this with a <em>weighted ' +
			'routing policy</em>: several records share one name, each carries a weight, ' +
			'and each query is answered with record <em>i</em> with probability ' +
			'weight<sub>i</sub> ÷ total.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Pick(records []Record, roll int) string</code>, returning the ' +
			'<code>Name</code> of the selected record:</p>' +
			'<ul>' +
			'<li><code>total</code> is the sum of all weights; the harness guarantees ' +
			'<code>roll</code> is in <code>[0, total)</code>.</li>' +
			'<li>Walk the records <em>in the given order</em>, accumulating weights; return ' +
			'the first record where <code>roll &lt; cumulative</code>.</li>' +
			'<li>A record with <code>Weight 0</code> is <em>never</em> selected — skip it. ' +
			'This is not a corner case: setting a weight to 0 is exactly how AWS documents ' +
			'<em>draining traffic</em> away from a record without deleting it.</li>' +
			'</ul>' +
			'<p>Note the signature: production Route 53 rolls the dice itself, but the roll ' +
			'here is a <em>parameter</em>. Randomized behavior becomes deterministic — and ' +
			'therefore testable — the moment the randomness is injected instead of generated ' +
			'inside. The harness exercises exact boundary rolls no amount of ' +
			'<code>rand.Intn</code> sampling would reliably hit.</p>' +
			'<h3>Example</h3>',
			{ code: 'records = [{stable 90} {canary 10}]   // total = 100\nPick(records, 0)   →  "stable"    // rolls 0..89 land in stable\nPick(records, 89)  →  "stable"\nPick(records, 90)  →  "canary"    // rolls 90..99 land in canary\nPick(records, 99)  →  "canary"', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Record is one entry in a Route 53 weighted record set: several',
			'// records share a DNS name, and Weight controls what fraction of',
			'// queries each answers (Weight ÷ total). Weight 0 means "drain":',
			'// the record stays configured but receives no traffic.',
			'type Record struct {',
			'	Name   string',
			'	Weight int',
			'}',
			'',
			'// Pick returns the Name of the record selected by roll, where roll',
			'// is in [0, sum-of-weights). Walk the records in order, accumulate',
			'// weights, and return the first record with roll < cumulative.',
			'// Records with Weight 0 are never selected.',
			'func Pick(records []Record, roll int) string {',
			'	return "" // your code here',
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
			'		name    string',
			'		records []Record',
			'		rolls   []int',
			'		want    []string',
			'	}',
			'	blueGreen := []Record{{"blue", 70}, {"green", 30}}',
			'	canary := []Record{{"stable", 90}, {"canary", 10}}',
			'	cases := []tc{',
			'		{"roll 0 selects the first record", blueGreen,',
			'			[]int{0}, []string{"blue"}},',
			'		{"boundary: last roll of blue, first roll of green", blueGreen,',
			'			[]int{69, 70}, []string{"blue", "green"}},',
			'		{"last roll (total-1) selects the last record", blueGreen,',
			'			[]int{99}, []string{"green"}},',
			'		// The drained record sits between a and b; a naive roll <= cumulative',
			'		// (or a walk that does not skip zero weights) picks "drained" at roll 5.',
			'		{"weight-0 record is skipped (draining)", []Record{{"a", 5}, {"drained", 0}, {"b", 5}},',
			'			[]int{4, 5, 9}, []string{"a", "b", "b"}},',
			'		{"single record takes every roll", []Record{{"only", 3}},',
			'			[]int{0, 2}, []string{"only", "only"}},',
			'		{"90/10 canary spot checks", canary,',
			'			[]int{0, 45, 89, 90, 99}, []string{"stable", "stable", "stable", "canary", "canary"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%s · rolls=%v", c.name, c.rolls),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := make([]string, 0, len(c.rolls))',
			'			for _, roll := range c.rolls {',
			'				// Copy the records: Pick must not rely on mutating its input.',
			'				got = append(got, Pick(append([]Record(nil), c.records...), roll))',
			'			}',
			'			r["pass"] = reflect.DeepEqual(got, c.want)',
			'			r["got"] = fmt.Sprintf("%v", got)',
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
			'// Record is one entry in a Route 53 weighted record set: several',
			'// records share a DNS name, and Weight controls what fraction of',
			'// queries each answers (Weight ÷ total). Weight 0 means "drain":',
			'// the record stays configured but receives no traffic.',
			'type Record struct {',
			'	Name   string',
			'	Weight int',
			'}',
			'',
			'// Pick returns the Name of the record selected by roll, where roll',
			'// is in [0, sum-of-weights).',
			'//',
			'// The records partition [0, total) into consecutive half-open',
			'// intervals in list order: the first record owns [0, w0), the next',
			'// [w0, w0+w1), and so on. One pass accumulating weights finds the',
			'// interval containing roll — the strict < against the running',
			'// cumulative is what makes the intervals half-open, so boundary',
			'// rolls (e.g. roll == w0) fall to the NEXT record, never both.',
			'//',
			'// A Weight-0 record owns an empty interval, and the strict',
			'// comparison skips it automatically: its cumulative equals the',
			'// previous record\'s, so roll < cumulative was already false.',
			'// The explicit continue documents the intent (and guards the',
			'// degenerate all-zero prefix), matching AWS semantics: weight 0',
			'// drains a record without deleting its configuration.',
			'func Pick(records []Record, roll int) string {',
			'	cumulative := 0',
			'	for _, rec := range records {',
			'		if rec.Weight == 0 {',
			'			continue // drained: owns no slice of [0, total)',
			'		}',
			'		cumulative += rec.Weight',
			'		if roll < cumulative {',
			'			return rec.Name',
			'		}',
			'	}',
			'	return "" // unreachable: harness guarantees roll < total',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The mechanism: intervals on a number line</h3>' +
			'<p>Weighted selection sounds probabilistic, but the mechanism is plain ' +
			'bookkeeping: lay the weights end to end so the records partition ' +
			'<code>[0, total)</code> into half-open intervals, roll once, and return whoever ' +
			'owns that point. The strict <code>roll &lt; cumulative</code> is load-bearing — ' +
			'it makes each interval half-open, so a boundary roll (exactly the first ' +
			'record’s weight) belongs to the <em>second</em> record, never to both or ' +
			'neither.</p>',
			{ code: 'cumulative := 0\nfor _, rec := range records {\n\tif rec.Weight == 0 {\n\t\tcontinue // drained: owns no interval\n\t}\n\tcumulative += rec.Weight\n\tif roll < cumulative {\n\t\treturn rec.Name\n\t}\n}' },
			'<p>The general principle is <strong>weighted routing = controlled traffic ' +
			'shifting</strong>: the same cumulative-weight walk drives canary releases ' +
			'(90/10, watch, 50/50, 0/100), blue/green cutovers, A/B tests, and weighted ' +
			'load-balancer target groups. Draining is the operational half: set a weight ' +
			'to 0 and traffic stops <em>without deleting the record</em>, so rollback is ' +
			'“put the weight back”, not “re-create the config”.</p>' +
			'<p>The second lesson is why <code>Pick</code> takes <code>roll</code> as a ' +
			'parameter at all: <strong>testable randomness is injected randomness</strong>. ' +
			'Production wraps this with <code>rand.Intn(total)</code>; the tests instead ' +
			'aim exact rolls at the boundaries (69 vs 70, roll 5 beside a drained record) ' +
			'that random sampling would only hit by luck. It is the same move as injecting ' +
			'<code>nowMs</code> into a rate limiter.</p>' +
			'<h3>Exam takeaway</h3>' +
			'<p>Know the four Route 53 routing policies by <em>what question they answer</em>: ' +
			'<strong>weighted</strong> — “what fraction of traffic goes where?” (canary, ' +
			'blue/green, weight 0 to drain); <strong>latency</strong> — “which region answers ' +
			'fastest for this user?”; <strong>failover</strong> — “primary healthy? else ' +
			'secondary” (active–passive DR, paired with health checks); ' +
			'<strong>geolocation</strong> — “route by where the user <em>is</em>” (compliance, ' +
			'localized content). If the scenario says “gradually shift traffic to the new ' +
			'version”, the answer is weighted routing.</p>',
		],
		complexity: { time: 'O(n) per pick', space: 'O(1)' },
	});
})();
