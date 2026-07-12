/* Availability math — Resilient Architectures (lesson). Nines arithmetic:
 * serial chains multiply availabilities down, parallel redundancy drives the
 * failure probability down exponentially. Lesson-style: the learner fills in
 * two TODO computations in a runnable program and check() matches the
 * printed lines (values verified against native Go beforehand).
 */
(function () {
	'use strict';
	var T = GoLearnAWS;

	// Serial chain vs parallel app tier. Serial: one dead box kills the
	// request path. Parallel: both app servers must die at once.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="serial three-tier chain versus the same chain with two app servers in parallel">' +
		'<defs><marker id="dgArrowAVM" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>' +
		// --- serial row ---
		'<text x="16" y="22" class="lbl">serial — every hop must be up (availabilities multiply)</text>' +
		'<rect x="16" y="34" width="86" height="34" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="59" y="56" text-anchor="middle">ALB</text>' +
		'<text x="59" y="82" text-anchor="middle" class="lbl">0.9999</text>' +
		'<path d="M 102 51 L 138 51" fill="none" stroke="var(--dim)" stroke-width="1.5" marker-end="url(#dgArrowAVM)"/>' +
		'<rect x="140" y="34" width="86" height="34" rx="5" fill="none" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<text x="183" y="56" text-anchor="middle">app</text>' +
		'<text x="183" y="82" text-anchor="middle" class="lbl">0.995 ← weakest link</text>' +
		'<path d="M 226 51 L 262 51" fill="none" stroke="var(--dim)" stroke-width="1.5" marker-end="url(#dgArrowAVM)"/>' +
		'<rect x="264" y="34" width="86" height="34" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="307" y="56" text-anchor="middle">DB</text>' +
		'<text x="307" y="82" text-anchor="middle" class="lbl">0.9995</text>' +
		'<text x="380" y="56" style="fill:var(--err-edge)">≈ 0.9944</text>' +
		// --- parallel row ---
		'<text x="16" y="116" class="lbl">app tier doubled — tier fails only if BOTH fail: 1 − (1−0.995)²</text>' +
		'<rect x="16" y="128" width="86" height="34" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="59" y="150" text-anchor="middle">ALB</text>' +
		'<path d="M 102 145 L 138 133" fill="none" stroke="var(--dim)" stroke-width="1.5" marker-end="url(#dgArrowAVM)"/>' +
		'<path d="M 102 145 L 138 173" fill="none" stroke="var(--dim)" stroke-width="1.5" marker-end="url(#dgArrowAVM)"/>' +
		'<rect x="140" y="120" width="86" height="26" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="183" y="138" text-anchor="middle" class="lbl">app · AZ-a</text>' +
		'<rect x="140" y="162" width="86" height="26" rx="5" fill="none" stroke="var(--ok)" stroke-width="1.6"/>' +
		'<text x="183" y="180" text-anchor="middle" class="lbl">app · AZ-b</text>' +
		'<path d="M 226 133 L 262 145" fill="none" stroke="var(--dim)" stroke-width="1.5" marker-end="url(#dgArrowAVM)"/>' +
		'<path d="M 226 173 L 262 145" fill="none" stroke="var(--dim)" stroke-width="1.5" marker-end="url(#dgArrowAVM)"/>' +
		'<rect x="264" y="128" width="86" height="34" rx="5" fill="none" stroke="var(--edge)"/>' +
		'<text x="307" y="150" text-anchor="middle">DB</text>' +
		'<text x="380" y="150" style="fill:var(--ok)">≈ 0.99938</text>' +
		'</svg>';

	T.lesson({
		id: 'availability-math',
		title: 'Availability math (nines)',
		nav: 'Availability math',
		category: 'Resilient Architectures',
		prose: [
			'<h2>Availability math</h2>' +
			'<p>You are designing a three-tier web application — load balancer, ' +
			'app server, database — and the business asks for “four nines.” Before ' +
			'reaching for any AWS service, you need to know what the <em>architecture</em> ' +
			'can deliver, because availability is a property of the topology, not of ' +
			'any one component.</p>' +
			'<h3>What a nine costs you</h3>' +
			'<p>Availability is the fraction of time a system answers. Each extra ' +
			'nine cuts allowed downtime by 10×:</p>',
			{ code: '99%      →  ~3.65 days/yr down\n99.9%    →  ~8.77 h/yr\n99.99%   →  ~52.6 min/yr\n99.999%  →  ~5.26 min/yr', lang: 'txt' },
			'<h3>Chains multiply, redundancy exponentiates</h3>' +
			'<p>Two rules cover almost every exam scenario:</p>' +
			'<ul>' +
			'<li><strong>Serial:</strong> a request that must traverse every component ' +
			'is up only when <em>all</em> are up — availabilities multiply: ' +
			'<code>A = a₁ × a₂ × … × aₙ</code>. Every hop you add makes the system ' +
			'<em>worse</em> than its weakest link.</li>' +
			'<li><strong>Parallel:</strong> a tier with n redundant copies is down only ' +
			'when <em>all n</em> fail together — <code>A = 1 − Π(1 − aᵢ)</code>. ' +
			'Failure probabilities multiply, so a mediocre 99.5% server doubled ' +
			'becomes 99.9975%.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>This is exactly why <strong>Multi-AZ deployment</strong> is the exam’s ' +
			'canonical answer to “increase availability”: placing instances in two ' +
			'Availability Zones behind an ELB is the parallel formula applied to ' +
			'independent failure domains. (The availabilities below are teaching ' +
			'constants, not published SLAs — the arithmetic is the skill.)</p>' +
			'<div class="tip">Run the numbers yourself below. Doubling only the weakest ' +
			'tier cuts the whole system’s downtime by roughly 9× — redundancy anywhere ' +
			'else would be wasted money.</div>' +
			'<h3>Exam takeaway</h3>' +
			'<p>Serial components multiply availabilities — the chain is always worse ' +
			'than its weakest link. Parallel redundancy multiplies <em>failure</em> ' +
			'probabilities — each copy adds nines to that tier. When the SAA exam asks ' +
			'how to raise availability, the answer is redundancy across independent ' +
			'failure domains — <strong>Multi-AZ behind a load balancer</strong> — ' +
			'applied to the weakest tier, not a bigger single instance.</p>',
		],
		task: 'Compute the serial three-tier availability, then the same chain with two parallel app servers.',
		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	// Per-component availabilities for the three-tier stack.',
			'	// Teaching constants — real SLAs drift; the formulas do not.',
			'	const alb = 0.9999 // load balancer',
			'	const app = 0.995  // ONE app server (the weak link)',
			'	const db = 0.9995  // database',
			'',
			'	// (a) Serial chain: ALB → app → DB. The request needs all three,',
			'	// so the availabilities multiply.',
			'	serial := 0.0 // TODO: alb × app × db',
			'',
			'	// (b) Same chain, but TWO app servers in parallel (only the app',
			'	// tier is redundant). The tier fails only when BOTH servers are',
			'	// down: tier availability = 1 − (1−app)². Then chain as before.',
			'	appRedundant := 0.0 // TODO',
			'',
			'	fmt.Printf("serial: %.6f\\n", serial)',
			'	fmt.Printf("app redundant: %.6f\\n", appRedundant)',
			'}',
			'',
		].join('\n'),
		check: function (stdout, flat) {
			// Expected values computed with native Go: 0.9999*0.995*0.9995 and
			// 0.9999*(1-0.005^2)*0.9995 rendered with %.6f.
			return flat.indexOf('serial: 0.994403') !== -1 &&
				flat.indexOf('app redundant: 0.999375') !== -1;
		},
		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	// Per-component availabilities for the three-tier stack.',
			'	// Teaching constants — real SLAs drift; the formulas do not.',
			'	const alb = 0.9999 // load balancer',
			'	const app = 0.995  // ONE app server (the weak link)',
			'	const db = 0.9995  // database',
			'',
			'	// (a) Serial: every hop must be up, so P(all up) is the product.',
			'	// Note the result is WORSE than the worst component — chaining',
			'	// can only lose nines, never gain them.',
			'	serial := alb * app * db',
			'',
			'	// (b) Redundant app tier: the tier is down only when both copies',
			'	// fail at once, so multiply the FAILURE probabilities and invert.',
			'	// (1−0.995)² = 0.000025 → the 99.5% tier becomes 99.9975%, and',
			'	// the chain jumps from ~0.9944 to ~0.9994 without touching the',
			'	// other tiers. Redundancy attacks the weakest link exponentially.',
			'	appTier := 1 - (1-app)*(1-app)',
			'	appRedundant := alb * appTier * db',
			'',
			'	fmt.Printf("serial: %.6f\\n", serial)',
			'	fmt.Printf("app redundant: %.6f\\n", appRedundant)',
			'}',
			'',
		].join('\n'),
	});
})();
