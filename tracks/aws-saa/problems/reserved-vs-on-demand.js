/* Reserved vs On-Demand — Cost Optimization (Easy). The break-even
 * calculation behind every "should we reserve?" exam question: an upfront
 * commitment plus a lower hourly rate against a pure hourly rate, crossed
 * over a 36-month horizon. Rates in the harness are teaching constants
 * passed as inputs; the month-5 equality boundary case uses binary-exact
 * rates (0.125/0.0625) so the strict-< comparison is deterministic.
 */
(function () {
	'use strict';
	var T = GoLearnAWS;

	// Two cumulative-cost lines: on-demand from the origin, reserved from
	// the upfront intercept with a shallower slope, crossing at break-even.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="cumulative cost versus months: the on-demand line starts at zero and climbs steeply; the reserved line starts at the upfront cost and climbs slowly; they cross at the break-even month">' +
		// axes
		'<line x1="50" y1="160" x2="490" y2="160" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowRVO)"/>' +
		'<line x1="50" y1="160" x2="50" y2="20" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowRVO)"/>' +
		'<text x="480" y="178" text-anchor="end" class="lbl">months →</text>' +
		'<text x="56" y="30" class="lbl">cumulative cost</text>' +
		// on-demand line: origin, steep
		'<line x1="50" y1="160" x2="430" y2="40" stroke="var(--accent)" stroke-width="1.8"/>' +
		'<text x="436" y="40" class="lbl" style="fill:var(--accent)">on-demand</text>' +
		// reserved line: upfront intercept, shallow
		'<line x1="50" y1="112" x2="470" y2="58" stroke="var(--ok)" stroke-width="1.8"/>' +
		'<text x="474" y="60" class="lbl" style="fill:var(--ok)">reserved</text>' +
		'<text x="56" y="116" class="lbl">upfront</text>' +
		// crossover
		'<circle cx="266" cy="92" r="5" fill="none" stroke="var(--err-edge)" stroke-width="1.8"/>' +
		'<line x1="266" y1="97" x2="266" y2="160" stroke="var(--err-edge)" stroke-width="1.2" stroke-dasharray="4 3"/>' +
		'<text x="266" y="176" text-anchor="middle" class="lbl" style="fill:var(--err-edge)">break-even</text>' +
		'<text x="290" y="140" class="lbl">right of the crossing, every month</text>' +
		'<text x="290" y="154" class="lbl">of steady usage is savings</text>' +
		'<defs><marker id="dgArrowRVO" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'reserved-vs-on-demand',
		title: 'Reserved vs On-Demand Break-Even',
		nav: 'Reserved vs On-Demand',
		difficulty: 'Easy',
		category: 'Cost Optimization',
		task: 'Implement TotalCost and BreakEvenMonth — find when a reservation starts saving money. Make all 6 tests pass.',

		prose: [
			'<h2>Reserved vs On-Demand Break-Even</h2>' +
			'<p><strong>Exam scenario.</strong> A steady production workload runs an instance ' +
			'24/7 at $0.10/hour on-demand. A reserved instance costs $200 upfront plus ' +
			'$0.06/hour. When does the reservation start saving money — and should a batch job ' +
			'that runs 100 hours a month ever reserve? Every RI/Savings-Plan question is this ' +
			'same <em>fixed-vs-variable cost crossover</em>.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement two functions (the dollar rates are teaching constants the harness ' +
			'passes in — close to real us-east-1 numbers, but they are <em>inputs</em> to the ' +
			'procedure, not facts to memorize):</p>' +
			'<ul>' +
			'<li><code>TotalCost(hourlyRate, upfront, hoursPerMonth, months)</code> — cumulative ' +
			'cost: <code>upfront + hourlyRate × hoursPerMonth × months</code>.</li>' +
			'<li><code>BreakEvenMonth(onDemandHourly, reservedHourly, reservedUpfront, ' +
			'hoursPerMonth)</code> — the smallest month <code>m</code> in 1..36 where the reserved ' +
			'total is <em>strictly less</em> than the on-demand total, or <code>-1</code> if it ' +
			'never happens within 36 months. 36 months is the exam’s commitment horizon: the ' +
			'longest term AWS sells.</li>' +
			'</ul>',
			{ code: '// $0.10/h on-demand vs $0.06/h + $200 upfront, 730 h/mo (24/7):\n// month 6: reserved 462.80 > on-demand 438.00  — not yet\n// month 7: reserved 506.60 < on-demand 511.00  — break-even\nBreakEvenMonth(0.10, 0.06, 200, 730) → 7\n\n// same deal at 100 h/mo never catches up inside 36 months:\nBreakEvenMonth(0.10, 0.06, 200, 100) → -1', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// TotalCost returns the cumulative cost of running an instance for the',
			'// given number of months:',
			'//',
			'//	upfront + hourlyRate*hoursPerMonth*months',
			'//',
			'// On-demand pricing is the special case upfront == 0.',
			'func TotalCost(hourlyRate, upfront float64, hoursPerMonth, months int) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// BreakEvenMonth returns the smallest month m in 1..36 at which the',
			'// reserved option (reservedHourly + reservedUpfront) becomes STRICTLY',
			'// cheaper than on-demand, or -1 if that never happens within 36',
			'// months (the longest reservation term).',
			'func BreakEvenMonth(onDemandHourly, reservedHourly, reservedUpfront float64, hoursPerMonth int) int {',
			'	// your code here (hint: TotalCost does the arithmetic)',
			'	return -2',
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
			'		name             string',
			'		onDemand, resHr  float64',
			'		upfront          float64',
			'		hoursPerMonth    int',
			'		want             int',
			'	}',
			'	// Margins at the deciding months are decisive (verified natively:',
			'	// m=6 462.80 vs 438.00, m=7 506.60 vs 511.00). The boundary case',
			'	// uses binary-exact rates so "equal at month 5" is exact equality',
			'	// and strict-< must reject it.',
			'	cases := []tc{',
			'		{"24/7 steady state: $0.10 vs $0.06 + $200 up, 730 h/mo", 0.10, 0.06, 200, 730, 7},',
			'		{"instant win: no upfront, cheaper hourly", 0.10, 0.08, 0, 730, 1},',
			'		{"never: reserved hourly ABOVE on-demand", 0.10, 0.12, 0, 730, -1},',
			'		{"part-time trap: same deal at 100 h/mo", 0.10, 0.06, 200, 100, -1},',
			'		{"strictly less: costs exactly EQUAL at month 5", 0.125, 0.0625, 200, 640, 6},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases)+1)',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%s — BreakEvenMonth(%.2f, %.2f, %.2f, %d)", c.name, c.onDemand, c.resHr, c.upfront, c.hoursPerMonth),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := BreakEvenMonth(c.onDemand, c.resHr, c.upfront, c.hoursPerMonth)',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%d", got)',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	// Direct TotalCost check: a year of 24/7 on-demand at $0.10/h.',
			'	// Compared via %.2f rendering — a correct implementation can\'t',
			'	// fail on a last-bit float difference.',
			'	r := map[string]any{',
			'		"input": "TotalCost(0.10, 0, 730, 12) — a year of 24/7 on-demand",',
			'		"want":  "$876.00",',
			'	}',
			'	runCase(r, func() {',
			'		got := TotalCost(0.10, 0, 730, 12)',
			'		gotStr := fmt.Sprintf("$%.2f", got)',
			'		r["pass"] = gotStr == "$876.00"',
			'		r["got"] = gotStr',
			'	})',
			'	results = append(results, r)',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// TotalCost returns the cumulative cost of running an instance for the',
			'// given number of months. Upfront is a one-time fixed cost; the hourly',
			'// term is the variable cost that scales with usage. On-demand pricing',
			'// is the special case upfront == 0.',
			'func TotalCost(hourlyRate, upfront float64, hoursPerMonth, months int) float64 {',
			'	return upfront + hourlyRate*float64(hoursPerMonth)*float64(months)',
			'}',
			'',
			'// BreakEvenMonth returns the smallest month m in 1..36 at which the',
			'// reserved option becomes STRICTLY cheaper than on-demand, or -1 if',
			'// that never happens within 36 months.',
			'//',
			'// A closed form exists (m > upfront / monthlySavings), but the scan is',
			'// chosen deliberately: 36 iterations is nothing, the loop states the',
			'// definition directly instead of re-deriving it, and it is immune to',
			'// the divide-by-zero and negative-savings edge cases the formula has',
			'// to special-case (reserved hourly >= on-demand -> savings <= 0).',
			'func BreakEvenMonth(onDemandHourly, reservedHourly, reservedUpfront float64, hoursPerMonth int) int {',
			'	for m := 1; m <= 36; m++ {',
			'		reserved := TotalCost(reservedHourly, reservedUpfront, hoursPerMonth, m)',
			'		onDemand := TotalCost(onDemandHourly, 0, hoursPerMonth, m)',
			'		// Strict <: a month where the two options merely tie has not',
			'		// paid back the commitment yet.',
			'		if reserved < onDemand {',
			'			return m',
			'		}',
			'	}',
			'	// Never inside the longest term AWS sells — the reservation is a',
			'	// loss for this usage pattern.',
			'	return -1',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Two lines, one crossing</h3>' +
			'<p>The principle is the <strong>fixed-vs-variable cost crossover</strong>: on-demand ' +
			'is a line through the origin with slope <code>rate × hours</code>; a reservation is a ' +
			'line starting at the upfront cost with a shallower slope. If the reserved slope is ' +
			'smaller, the lines must cross — the only questions are <em>when</em>, and whether ' +
			'“when” fits inside the commitment you’re buying:</p>',
			{ code: 'for m := 1; m <= 36; m++ { // 36 = longest term AWS sells\n\tif TotalCost(reservedHourly, upfront, hours, m) <\n\t\tTotalCost(onDemandHourly, 0, hours, m) {\n\t\treturn m\n\t}\n}\nreturn -1 // never pays back inside the term' },
			'<p>The scan beats the closed form (<code>ceil(upfront / monthlySavings)</code>) on ' +
			'robustness: no divide-by-zero when the rates tie, no sign juggling when the ' +
			'“discounted” rate is actually higher. Notice what the part-time case shows: cutting ' +
			'usage from 730 to 100 hours a month shrinks the monthly savings 7×, pushing ' +
			'break-even from month 7 to month 50 — past the longest term you can buy. ' +
			'<em>The discount didn’t change; the usage did.</em> The same crossover analysis ' +
			'prices gym memberships, transit passes, and the S3 storage-class problem in this ' +
			'track.</p>' +
			'<h3>Exam takeaway</h3>' +
			'<p>Map the workload to the pricing model: <strong>Reserved Instances / Savings ' +
			'Plans</strong> for steady, predictable, long-running usage; <strong>Spot</strong> for ' +
			'interruptible batch work (biggest discount, can be reclaimed); ' +
			'<strong>on-demand</strong> for spiky or short-lived workloads. And the trap this ' +
			'problem drills: <em>part-time workloads don’t reserve</em> — a reservation bills the ' +
			'commitment whether you run the instance or not, so low utilization silently turns ' +
			'the “discount” into a loss.</p>',
		],
		complexity: { time: 'O(1) — at most 36 iterations', space: 'O(1)' },
	});
})();
