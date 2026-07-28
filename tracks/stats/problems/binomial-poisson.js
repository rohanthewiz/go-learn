/* Binomial & Poisson — Probability (Medium). The two discrete workhorse
 * distributions, computed the numerically sane way: C(n,k) via the
 * multiplicative recurrence (no factorials, no overflow) and the Poisson
 * term built iteratively (term *= lambda/i). The harness pins textbook
 * values — BinomialPMF(10,3,0.5) = 120/1024, PoissonPMF(2,0) = e^−2 — the
 * k=0 and k=n edges, and a side-by-side Binomial(100, 0.02) vs Poisson(2)
 * pair showing the limit theorem at work.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// Paired bar PMFs: Binomial(20, 0.1) beside Poisson(2) at each k. The
	// bars are nearly the same height everywhere — the visual form of the
	// n→∞, p→0, np fixed limit. Marker id namespaced (dgArrowSTBP).
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="paired bar chart: the PMF of Binomial 20 trials p 0.1 next to the PMF of Poisson lambda 2 for k from 0 to 6; each pair of bars is nearly the same height">' +
		'<text x="20" y="20" class="lbl">Binomial(20, 0.1) vs Poisson(2) — same np = 2, nearly the same PMF</text>' +
		'<rect x="20" y="30" width="12" height="12" fill="var(--accent)" opacity="0.75"/>' +
		'<text x="38" y="41" class="lbl">Binomial(20, 0.1)</text>' +
		'<rect x="160" y="30" width="12" height="12" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<text x="178" y="41" class="lbl">Poisson(2)</text>' +
		// bars: filled = binomial, outlined = poisson; heights = P·400px
		'<rect x="55" y="111" width="18" height="49" fill="var(--accent)" opacity="0.75"/><rect x="75" y="106" width="18" height="54" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="117" y="52" width="18" height="108" fill="var(--accent)" opacity="0.75"/><rect x="137" y="52" width="18" height="108" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="179" y="46" width="18" height="114" fill="var(--accent)" opacity="0.75"/><rect x="199" y="52" width="18" height="108" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="241" y="84" width="18" height="76" fill="var(--accent)" opacity="0.75"/><rect x="261" y="88" width="18" height="72" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="303" y="124" width="18" height="36" fill="var(--accent)" opacity="0.75"/><rect x="323" y="124" width="18" height="36" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="365" y="147" width="18" height="13" fill="var(--accent)" opacity="0.75"/><rect x="385" y="146" width="18" height="14" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="427" y="156" width="18" height="4" fill="var(--accent)" opacity="0.75"/><rect x="447" y="155" width="18" height="5" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<line x1="45" y1="160" x2="480" y2="160" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>' +
		'<text x="74" y="176" text-anchor="middle" class="lbl">0</text>' +
		'<text x="136" y="176" text-anchor="middle" class="lbl">1</text>' +
		'<text x="198" y="176" text-anchor="middle" class="lbl">2</text>' +
		'<text x="260" y="176" text-anchor="middle" class="lbl">3</text>' +
		'<text x="322" y="176" text-anchor="middle" class="lbl">4</text>' +
		'<text x="384" y="176" text-anchor="middle" class="lbl">5</text>' +
		'<text x="446" y="176" text-anchor="middle" class="lbl">6</text>' +
		'<path d="M 320 198 C 270 202 220 190 205 168" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSTBP)"/>' +
		'<text x="326" y="202" class="lbl" style="fill:var(--warn)">n→∞, p→0, np fixed: the bars converge</text>' +
		'<defs><marker id="dgArrowSTBP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'binomial-poisson',
		title: 'Binomial & Poisson',
		nav: 'binomial & poisson',
		difficulty: 'Medium',
		category: 'Probability',
		task: 'Implement BinomialPMF/CDF (C(n,k) via the multiplicative loop, no factorials) and PoissonPMF/CDF (iterative term, never a factorial).',

		prose: [
			'<h2>Binomial &amp; Poisson</h2>' +
			'<p>Two capacity-planning questions, two distributions. “Of our 20 ' +
			'disks, each with a 10% annual failure rate, how likely is it that ' +
			'exactly 2 die this year?” — that’s <strong>binomial</strong>: a fixed ' +
			'number of independent trials, each succeeding with probability p. ' +
			'“How many requests hit this server in one second, given an average ' +
			'of 2/s?” — that’s <strong>Poisson</strong>: no fixed trial count, ' +
			'just events arriving at rate λ. And they’re secretly the same ' +
			'distribution: Poisson is the binomial’s limit as n→∞ and p→0 with ' +
			'np held fixed — a second is “infinitely many tiny instants, each ' +
			'with an infinitesimal chance of a request”.</p>' +
			'<ul>' +
			'<li><strong>Binomial PMF:</strong> P(exactly k successes in n ' +
			'trials) = C(n,k)·p<sup>k</sup>·(1−p)<sup>n−k</sup> — the probability ' +
			'of any one arrangement, times the number of arrangements.</li>' +
			'<li><strong>Never compute C(n,k) from factorials.</strong> 21! ' +
			'already overflows int64, and float64 loses exact integers past ' +
			'2<sup>53</sup> — yet C(100,2) is a modest 4950. The multiplicative ' +
			'recurrence <code>c = c·(n−i)/(i+1)</code> for i = 0…k−1 keeps every ' +
			'intermediate value the size of a real coefficient, because after ' +
			'step i the running value is exactly C(n, i+1).</li>' +
			'<li><strong>Poisson PMF:</strong> P(k events at rate λ) = ' +
			'e<sup>−λ</sup>·λ<sup>k</sup>/k! — same trap, same fix: start the ' +
			'running term at e<sup>−λ</sup> (that’s P(0)) and multiply by ' +
			'<code>λ/i</code> for i = 1…k. The <em>ratio</em> λ<sup>k</sup>/k! ' +
			'stays tame even when both parts would overflow alone.</li>' +
			'<li><strong>CDFs are just summed PMFs</strong>: P(at most k) = ' +
			'ΣP(0…k). “At most”, “at least”, and “more than” questions all reduce ' +
			'to CDF calls (often via the complement rule from two problems ' +
			'back).</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>BinomialPMF(n, k, p)</code> (0 when k is outside ' +
			'0…n) and <code>BinomialCDF(n, k, p)</code>, plus ' +
			'<code>PoissonPMF(lambda, k)</code> and <code>PoissonCDF(lambda, ' +
			'k)</code> — with C(n,k) from the multiplicative loop and the Poisson ' +
			'term built iteratively. No factorial function anywhere.</p>',
			{ lang: 'txt', code: 'C(10,3) by the multiplicative loop — every intermediate is a real coefficient:\n  c = 1\n  c = 1 · 10/1 = 10     (= C(10,1))\n  c = 10 ·  9/2 = 45    (= C(10,2))\n  c = 45 ·  8/3 = 120   (= C(10,3))\nPMF = 120 · 0.5³ · 0.5⁷ = 120/1024 ≈ 0.1172' },
			'<div class="tip">The rule of thumb for swapping distributions: with ' +
			'n ≥ 20 and p ≤ 0.05 (better: n ≥ 100, np ≤ 10), Poisson(np) ' +
			'approximates Binomial(n, p) closely — compare the 0.2734 and 0.2707 ' +
			'the harness pins for n = 100, p = 0.02.</div>',
		],

		starter: [
			'package main',
			'',
			'// BinomialPMF returns P(exactly k successes in n independent trials',
			'// with per-trial success probability p):',
			'//',
			'//   C(n,k) · p^k · (1−p)^(n−k)',
			'//',
			'// Returns 0 when k < 0 or k > n. Compute C(n,k) in float64 with the',
			'// multiplicative recurrence — NOT factorials (21! overflows int64):',
			'//',
			'//   c := 1.0',
			'//   for i := 0; i < k; i++ { c = c * float64(n-i) / float64(i+1) }',
			'//',
			'// After step i the running value is exactly C(n, i+1), so every',
			'// intermediate stays the size of a real coefficient.',
			'func BinomialPMF(n, k int, p float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// BinomialCDF returns P(at most k successes): the PMF summed over',
			'// 0..k. Values of k at or beyond n cover the whole distribution',
			'// (the sum reaches 1); k < 0 returns 0.',
			'func BinomialCDF(n, k int, p float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// PoissonPMF returns P(exactly k events at average rate lambda):',
			'//',
			'//   e^−λ · λ^k / k!',
			'//',
			'// Build it iteratively — never call a factorial: start the running',
			'// term at e^−λ (which IS P(0)) and multiply by λ/i for i = 1..k.',
			'// The ratio λ^k/k! stays finite even when numerator and denominator',
			'// would each overflow float64 alone. Returns 0 for k < 0.',
			'func PoissonPMF(lambda float64, k int) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// PoissonCDF returns P(at most k events at rate lambda): the PMF',
			'// summed over 0..k. Returns 0 for k < 0.',
			'func PoissonCDF(lambda float64, k int) float64 {',
			'	// your code here',
			'	return 0',
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
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	cases := []tc{',
			'		{"BinomialPMF(10, 3, 0.5): exactly 3 heads in 10 fair flips = C(10,3)/2^10 = 120/1024",',
			'			"0.1172",',
			'			func() string { return f4(BinomialPMF(10, 3, 0.5)) }},',
			'		{"BinomialCDF(10, 5, 0.5): at most 5 heads — the CDF is just PMFs summed 0..k",',
			'			"0.6230",',
			'			func() string { return f4(BinomialCDF(10, 5, 0.5)) }},',
			'		{"20 disks, 10% annual failure rate: P(exactly 2 fail this year)",',
			'			"0.2852",',
			'			func() string { return f4(BinomialPMF(20, 2, 0.1)) }},',
			'		{"PoissonPMF(2.0, 0) = e^−2: a silent second on a λ = 2 req/s server (and the loop\'s base case)",',
			'			"0.1353",',
			'			func() string { return f4(PoissonPMF(2.0, 0)) }},',
			'		{"the limit, left side: Binomial(100, 0.02) at k = 2 — many trials, tiny p, np = 2",',
			'			"0.2734",',
			'			func() string { return f4(BinomialPMF(100, 2, 0.02)) }},',
			'		{"the limit, right side: Poisson(2) at k = 2 — within 0.003 of the binomial above",',
			'			"0.2707",',
			'			func() string { return f4(PoissonPMF(2.0, 2)) }},',
			'		{"k = 0 edge: the coefficient loop runs zero times, leaving pure (1−p)^n = 0.7^5",',
			'			"0.1681",',
			'			func() string { return f4(BinomialPMF(5, 0, 0.3)) }},',
			'		{"k = n edge: every trial succeeds, pure p^n = 0.3^5",',
			'			"0.0024",',
			'			func() string { return f4(BinomialPMF(5, 5, 0.3)) }},',
			'		{"impossible k: 11 successes in 10 trials must be probability 0, not a wild coefficient",',
			'			"0.0000",',
			'			func() string { return f4(BinomialPMF(10, 11, 0.5)) }},',
			'		{"PoissonCDF(2.0, 4): P(at most 4 requests this second) — the capacity-planning number",',
			'			"0.9473",',
			'			func() string { return f4(PoissonCDF(2.0, 4)) }},',
			'		{"full-range CDF: BinomialCDF(20, 20, 0.1) sums the whole PMF to 1",',
			'			"1.0000",',
			'			func() string { return f4(BinomialCDF(20, 20, 0.1)) }},',
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
			'import "math"',
			'',
			'// binomCoeff computes C(n, k) in float64 via the multiplicative',
			'// recurrence c = c·(n−i)/(i+1). The invariant: after iteration i the',
			'// running value is exactly C(n, i+1) — each step is an exact integer',
			'// (C(n,i)·(n−i) is always divisible by i+1), so no rounding creeps',
			'// in while values stay below 2^53. Factorials would overflow int64',
			'// at 21! even though C(100,2) itself is a modest 4950; the recurrence',
			'// never builds anything bigger than the answer.',
			'func binomCoeff(n, k int) float64 {',
			'	if k < 0 || k > n {',
			'		return 0',
			'	}',
			'	c := 1.0',
			'	for i := 0; i < k; i++ {',
			'		c = c * float64(n-i) / float64(i+1)',
			'	}',
			'	return c',
			'}',
			'',
			'// BinomialPMF: the probability of any ONE specific arrangement of k',
			'// successes and n−k failures is p^k·(1−p)^(n−k); C(n,k) counts the',
			'// arrangements. Independence is what lets the single-arrangement',
			'// probability factor into a plain product.',
			'func BinomialPMF(n, k int, p float64) float64 {',
			'	if k < 0 || k > n {',
			'		// Outside the support the probability is exactly 0 — without',
			'		// this guard the coefficient loop would happily produce a',
			'		// meaningless value for k > n.',
			'		return 0',
			'	}',
			'	return binomCoeff(n, k) * math.Pow(p, float64(k)) * math.Pow(1-p, float64(n-k))',
			'}',
			'',
			'// BinomialCDF sums the PMF over 0..k. O(k·k) with the loop-based',
			'// coefficient is fine at teaching scale; production code shares the',
			'// coefficient recurrence across terms (or uses the regularized',
			'// incomplete beta function, which IS the binomial CDF in closed',
			'// form). The i <= n bound makes k >= n mean "the whole support".',
			'func BinomialCDF(n, k int, p float64) float64 {',
			'	sum := 0.0',
			'	for i := 0; i <= k && i <= n; i++ {',
			'		sum += BinomialPMF(n, i, p)',
			'	}',
			'	return sum',
			'}',
			'',
			'// PoissonPMF builds e^−λ·λ^k/k! as a running product. Starting at',
			'// e^−λ (= P(0)) and folding in λ/i per step means the k! never',
			'// exists as a standalone number — λ = 500, k = 400 works fine even',
			'// though 400! is astronomically beyond float64. Each step is the',
			'// recurrence P(k) = P(k−1)·λ/k that also powers streaming',
			'// implementations.',
			'func PoissonPMF(lambda float64, k int) float64 {',
			'	if k < 0 {',
			'		return 0',
			'	}',
			'	term := math.Exp(-lambda)',
			'	for i := 1; i <= k; i++ {',
			'		term *= lambda / float64(i)',
			'	}',
			'	return term',
			'}',
			'',
			'// PoissonCDF reuses the running term across the sum — one pass, no',
			'// recomputation: term is P(i) at the top of each iteration, and the',
			'// accumulator collects P(0)+...+P(k).',
			'func PoissonCDF(lambda float64, k int) float64 {',
			'	if k < 0 {',
			'		return 0',
			'	}',
			'	term := math.Exp(-lambda)',
			'	sum := term',
			'	for i := 1; i <= k; i++ {',
			'		term *= lambda / float64(i)',
			'		sum += term',
			'	}',
			'	return sum',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Horse kicks and switchboards</h3>' +
			'<p>The Poisson distribution earned its reputation in 1898 when ' +
			'Ladislaus Bortkiewicz showed it fit the number of Prussian cavalry ' +
			'soldiers kicked to death by horses each year — the canonical ' +
			'many-opportunities, tiny-probability process. Erlang then built ' +
			'telephone-switchboard capacity planning on it in 1909, and that ' +
			'lineage runs straight to your load balancer: requests per second, ' +
			'packets per interval, cache misses per window are all modeled as ' +
			'Poisson arrivals, and queueing theory’s M/M/1 results (the “M” is ' +
			'for the Poisson/Markov arrival process) are what turn “λ = 2/s, can ' +
			'one worker keep up?” into arithmetic. The binomial side is ' +
			'reliability engineering’s bread and butter: k-of-n disk failures, ' +
			'quorum survival, error counts in a batch of fixed size.</p>' +
			'<h3>The numerical lesson generalizes</h3>' +
			'<p>Both functions dodge overflow the same way: never materialize a ' +
			'huge intermediate when the <em>answer</em> is small. The ' +
			'multiplicative C(n,k) and the running λ/i term are instances of a ' +
			'pattern you’ll meet again and again — compute the ratio, not the ' +
			'parts. Production statistical code goes one step further and works ' +
			'in log-space (<code>lgamma</code> for log-factorials, summing logs ' +
			'instead of multiplying probabilities), because a PMF at k = 10,000 ' +
			'underflows float64 even though its logarithm is a perfectly ' +
			'ordinary −4000. If you ever see <code>math.Gamma</code> overflow or ' +
			'a probability hit exactly 0.0 in a likelihood loop, this is the ' +
			'fix.</p>' +
			'<h3>When the approximation is the point</h3>' +
			'<p>The n→∞, p→0 limit isn’t a curiosity — it’s a modeling ' +
			'decision. For Binomial(100, 0.02) the exact PMF and Poisson(2) ' +
			'differ by about 1% relative error, and the Poisson needs one ' +
			'parameter instead of two: you don’t need to know n (how many users ' +
			'<em>could</em> send a request this second?) to fit λ (how many ' +
			'<em>do</em>, on average). That’s why rare-event monitoring, error ' +
			'budgets, and alerting thresholds are set with Poisson math even ' +
			'when the underlying process is technically binomial. The rule of ' +
			'thumb — n ≥ 20 with p ≤ 0.05 — is the boundary where the two bar ' +
			'charts in the diagram become indistinguishable at the resolution ' +
			'anyone plans capacity at.</p>',
		],
		complexity: { time: 'O(k) per PMF; O(k²) for the binomial CDF as written (O(k) with a shared running coefficient)', space: 'O(1)' },
	});
})();
