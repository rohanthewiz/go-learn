/* S3 Storage Classes — Storage (Medium). The exam's storage-class picker is
 * one inequality: monthly cost = storage + retrieval, minimized over the
 * class table. Prices in the harness are teaching constants (near real
 * us-east-1 numbers) passed in as inputs — the procedure, not the prices,
 * is the skill. Winners are chosen with decisive margins so no verdict
 * rides on float rounding; costs are only rounded (%.2f) for display.
 */
(function () {
	'use strict';
	var T = GoLearnAWS;

	// Cost-vs-retrieval crossover: each class is a line (intercept = storage
	// cost, slope = retrieval price). The cheapest class flips as the
	// monthly retrieval volume grows.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="monthly cost versus GB retrieved: DEEP_ARCHIVE is cheapest near zero retrieval, then GLACIER_IR, then STANDARD_IA, then STANDARD as retrieval grows">' +
		// axes
		'<line x1="50" y1="160" x2="490" y2="160" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowS3C)"/>' +
		'<line x1="50" y1="160" x2="50" y2="20" stroke="var(--edge)" stroke-width="1.5" marker-end="url(#dgArrowS3C)"/>' +
		'<text x="480" y="178" text-anchor="end" class="lbl">GB retrieved / month →</text>' +
		'<text x="40" y="30" text-anchor="end" class="lbl" transform="rotate(-90 40 30)"></text>' +
		'<text x="56" y="30" class="lbl">monthly cost</text>' +
		// STANDARD: high intercept, flat (zero retrieval fee)
		'<line x1="50" y1="70" x2="470" y2="70" stroke="var(--accent)" stroke-width="1.8"/>' +
		'<text x="474" y="74" class="lbl" style="fill:var(--accent)">STANDARD</text>' +
		// STANDARD_IA: mid intercept, gentle slope
		'<line x1="50" y1="110" x2="470" y2="52" stroke="var(--ok)" stroke-width="1.8"/>' +
		'<text x="474" y="52" class="lbl" style="fill:var(--ok)">IA</text>' +
		// GLACIER_IR: low intercept, steeper slope
		'<line x1="50" y1="140" x2="470" y2="30" stroke="var(--dim)" stroke-width="1.8"/>' +
		'<text x="440" y="26" class="lbl">GLACIER_IR</text>' +
		// DEEP_ARCHIVE: lowest intercept, steepest slope
		'<line x1="50" y1="152" x2="380" y2="24" stroke="var(--err-edge)" stroke-width="1.8" stroke-dasharray="5 3"/>' +
		'<text x="330" y="20" class="lbl">DEEP_ARCHIVE</text>' +
		// crossover annotation
		'<circle cx="122" cy="125" r="4" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="60" y="192" class="lbl">intercept = storage cost · slope = retrieval price · cheapest class flips at each crossover</text>' +
		'<defs><marker id="dgArrowS3C" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 's3-storage-classes',
		title: 'S3 Storage Class Economics',
		nav: 'S3 Storage Classes',
		difficulty: 'Medium',
		category: 'Storage',
		task: 'Implement MonthlyCost and CheapestClass — pick the cheapest storage class for a workload. Make all 6 tests pass.',

		prose: [
			'<h2>S3 Storage Class Economics</h2>' +
			'<p><strong>Exam scenario.</strong> A media company keeps 1&nbsp;TB of assets in S3. ' +
			'Editors pull about 100&nbsp;GB a month. Which storage class minimizes cost? Every ' +
			'storage-class question on the exam is this same trade: cold classes charge less to ' +
			'<em>store</em> but more to <em>retrieve</em>. The right answer is never “the ' +
			'cheapest per-GB class” — it’s the class that minimizes the <strong>total</strong>:</p>',
			{ code: 'monthly cost = sizeGB × storage price + retrievedGB × retrieval price', lang: 'txt' },
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>MonthlyCost(sizeGB, retrievedGB, c)</code> (the formula above) and ' +
			'<code>CheapestClass(sizeGB, retrievedGB, classes)</code>, which returns the name of ' +
			'the class with the minimum monthly cost. On a tie, the earliest class in the slice ' +
			'wins; an empty slice returns <code>""</code>.</p>' +
			'<p>The harness feeds a four-class table with per-GB prices close to real us-east-1 ' +
			'numbers — but treat them as <em>inputs</em>, not facts to memorize; prices drift, ' +
			'the procedure doesn’t:</p>',
			{ code: 'class          storage $/GB·mo   retrieval $/GB\nSTANDARD       0.023             0\nSTANDARD_IA    0.0125            0.01\nGLACIER_IR     0.004             0.03\nDEEP_ARCHIVE   0.00099           0.10', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Class is one S3 storage class with its two price dimensions.',
			'// Prices are inputs supplied by the caller (they drift in real life);',
			'// the decision procedure is what stays constant.',
			'type Class struct {',
			'	Name           string',
			'	StoragePerGB   float64 // $ per GB-month stored',
			'	RetrievalPerGB float64 // $ per GB retrieved',
			'}',
			'',
			'// MonthlyCost returns the total monthly cost of keeping sizeGB in',
			'// class c while retrieving retrievedGB during the month:',
			'//',
			'//	sizeGB*StoragePerGB + retrievedGB*RetrievalPerGB',
			'func MonthlyCost(sizeGB, retrievedGB float64, c Class) float64 {',
			'	// your code here',
			'	return -1',
			'}',
			'',
			'// CheapestClass returns the Name of the class with the minimum',
			'// MonthlyCost for the workload. Ties go to the earliest class in the',
			'// slice; an empty slice returns "".',
			'func CheapestClass(sizeGB, retrievedGB float64, classes []Class) string {',
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
			'	// Teaching constants near real us-east-1 prices — passed as inputs.',
			'	table := []Class{',
			'		{"STANDARD", 0.023, 0},',
			'		{"STANDARD_IA", 0.0125, 0.01},',
			'		{"GLACIER_IR", 0.004, 0.03},',
			'		{"DEEP_ARCHIVE", 0.00099, 0.10},',
			'	}',
			'	// Exactly representable prices (0.25, 0.125) so the tie is exact:',
			'	// both cost 8*0.25 + 8*0.125 mirrored = 3.00 vs 3.00.',
			'	tiePair := []Class{{"REPLICA_A", 0.25, 0.125}, {"REPLICA_B", 0.125, 0.25}}',
			'',
			'	type tc struct {',
			'		name      string',
			'		size, ret float64',
			'		classes   []Class',
			'		want      string',
			'	}',
			'	// Winner margins are decisive (verified: 2.30 vs 3.25, 4.00 vs 4.60,',
			'	// 7.00 vs 10.99, 10.14 vs 40.96) — no verdict rides on float noise.',
			'	cases := []tc{',
			'		{"hot data: 100 GB stored, 200 GB retrieved/mo", 100, 200, table, "STANDARD"},',
			'		{"warm data: 200 GB stored, 150 GB retrieved/mo", 200, 150, table, "STANDARD_IA"},',
			'		{"cool archive: 1000 GB stored, 100 GB retrieved/mo", 1000, 100, table, "GLACIER_IR"},',
			'		{"frozen archive: 10240 GB stored, 0 retrieved", 10240, 0, table, "DEEP_ARCHIVE"},',
			'		{"exact tie goes to earliest: 8 GB stored, 8 GB retrieved", 8, 8, tiePair, "REPLICA_A"},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases)+1)',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  c.want,',
			'		}',
			'		runCase(r, func() {',
			'			// Copy: the case table (and shared price table) must survive',
			'			// a user function that reorders its argument.',
			'			got := CheapestClass(c.size, c.ret, append([]Class(nil), c.classes...))',
			'			r["pass"] = got == c.want',
			'			r["got"] = got',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	// Direct MonthlyCost check: 400 GB in STANDARD_IA, 50 GB retrieved',
			'	// = 400*0.0125 + 50*0.01 = 5.50. Compared via %.2f rendering so a',
			'	// last-bit float difference cannot fail a correct implementation.',
			'	r := map[string]any{',
			'		"input": "MonthlyCost(400, 50, STANDARD_IA{0.0125, 0.01})",',
			'		"want":  "$5.50",',
			'	}',
			'	runCase(r, func() {',
			'		got := MonthlyCost(400, 50, Class{"STANDARD_IA", 0.0125, 0.01})',
			'		gotStr := fmt.Sprintf("$%.2f", got)',
			'		r["pass"] = gotStr == "$5.50"',
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
			'// Class is one S3 storage class with its two price dimensions.',
			'// Prices are inputs supplied by the caller (they drift in real life);',
			'// the decision procedure is what stays constant.',
			'type Class struct {',
			'	Name           string',
			'	StoragePerGB   float64 // $ per GB-month stored',
			'	RetrievalPerGB float64 // $ per GB retrieved',
			'}',
			'',
			'// MonthlyCost returns the total monthly cost of keeping sizeGB in',
			'// class c while retrieving retrievedGB during the month.',
			'//',
			'// Two terms, and both matter: storage scales with what you keep,',
			'// retrieval with what you touch. Cold classes trade a lower first',
			'// term for a higher second one.',
			'func MonthlyCost(sizeGB, retrievedGB float64, c Class) float64 {',
			'	return sizeGB*c.StoragePerGB + retrievedGB*c.RetrievalPerGB',
			'}',
			'',
			'// CheapestClass returns the Name of the class minimizing MonthlyCost.',
			'// Ties go to the earliest class in the slice; empty slice returns "".',
			'//',
			'// A plain min-scan with strict less-than: a later class must be',
			'// strictly cheaper to displace the incumbent, which implements the',
			'// earliest-wins tie rule for free — no epsilon comparisons, no',
			'// sorting, no special tie handling.',
			'func CheapestClass(sizeGB, retrievedGB float64, classes []Class) string {',
			'	if len(classes) == 0 {',
			'		return ""',
			'	}',
			'	bestName := classes[0].Name',
			'	bestCost := MonthlyCost(sizeGB, retrievedGB, classes[0])',
			'	for _, c := range classes[1:] {',
			'		if cost := MonthlyCost(sizeGB, retrievedGB, c); cost < bestCost {',
			'			bestName, bestCost = c.Name, cost',
			'		}',
			'	}',
			'	return bestName',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>One inequality, four classes</h3>' +
			'<p>The principle is <strong>total cost = storage + access</strong> — every ' +
			'storage-class question on the exam reduces to this one inequality. Each class is a ' +
			'line in (retrieval, cost) space: intercept = storage cost, slope = retrieval price. ' +
			'Cold classes start lower and climb faster, so the cheapest class flips as monthly ' +
			'retrieval grows. Computing the winner is a min-scan:</p>',
			{ code: 'bestName := classes[0].Name\nbestCost := MonthlyCost(sizeGB, retrievedGB, classes[0])\nfor _, c := range classes[1:] {\n\tif cost := MonthlyCost(sizeGB, retrievedGB, c); cost < bestCost {\n\t\tbestName, bestCost = c.Name, cost // strict < → earliest wins ties\n\t}\n}' },
			'<p>Note what the strict <code>&lt;</code> buys: the earliest-in-slice tie rule falls ' +
			'out of the comparison direction, with no epsilon logic. The same ' +
			'fixed-cost-vs-variable-cost line-crossing analysis prices EBS volume types, data ' +
			'transfer tiers, and the reserved-vs-on-demand decision elsewhere in this track.</p>' +
			'<h3>Exam takeaway</h3>' +
			'<p>When a question gives you a data size <em>and</em> an access pattern, compute (or ' +
			'estimate) both terms — heavy retrieval flips “archive” answers back to Standard-IA ' +
			'or even Standard, and near-zero retrieval makes Deep Archive unbeatable. When the ' +
			'access pattern is <em>unknown or changing</em>, the answer is ' +
			'<strong>S3 Intelligent-Tiering</strong>: it monitors access and moves objects between ' +
			'tiers automatically, with no retrieval fees. And remember the prices in any ' +
			'question are inputs to the formula, not constants to memorize.</p>',
		],
		complexity: { time: 'O(n) over the class table', space: 'O(1)' },
	});
})();
