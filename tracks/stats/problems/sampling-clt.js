/* Sampling & the CLT — Sampling & Estimation (Medium). Draw repeated
 * samples from a fixed skewed population with a deterministic LCG, take
 * each sample's mean, and watch the Central Limit Theorem show up in the
 * numbers: the means pile into a narrow bell whose spread is σ/√n no
 * matter how lopsided the population is. The harness pins the exact
 * sample means the LCG dictates (seeded, so browser and verifier agree
 * bit-for-bit) and checks the sd of 400 means against StdErr's σ/√30.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// Skewed population in, bell of means out — the CLT in one picture.
	// Marker id namespaced (dgArrowSTCL) because every track's SVGs share
	// the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="a right-skewed population histogram on the left, an arrow labeled distribution of the sample mean with n equals 30, and a narrow bell curve on the right centered at the population mean">' +
		'<text x="20" y="22" class="lbl">population: lopsided</text>' +
		// right-skewed histogram: tall bars near zero, long thin tail
		'<rect x="40" y="40" width="20" height="110" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="64" y="65" width="20" height="85" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="88" y="92" width="20" height="58" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="112" y="114" width="20" height="36" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="136" y="128" width="20" height="22" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="160" y="137" width="20" height="13" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="184" y="143" width="20" height="7" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<line x1="34" y1="150" x2="212" y2="150" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>' +
		'<text x="124" y="168" text-anchor="middle" class="lbl">one draw can land way out in the tail</text>' +
		// the CLT arrow
		'<path d="M 224 100 L 316 100" fill="none" stroke="var(--warn)" stroke-width="1.8" marker-end="url(#dgArrowSTCL)"/>' +
		'<text x="272" y="88" text-anchor="middle" class="lbl" style="fill:var(--warn)">distribution of x̄, n=30</text>' +
		// narrow bell of sample means
		'<polyline points="330,149.4 337,148.4 344,146.3 351,142.0 358,134.6 365,123.2 372,107.7 379,89.8 386,72.4 393,59.7 400,55.0 407,59.7 414,72.4 421,89.8 428,107.7 435,123.2 442,134.6 449,142.0 456,146.3 463,148.4 470,149.4" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<line x1="324" y1="150" x2="478" y2="150" stroke="var(--accent)" stroke-width="1" opacity="0.5"/>' +
		'<line x1="400" y1="55" x2="400" y2="150" stroke="var(--warn)" stroke-width="1" stroke-dasharray="3 3"/>' +
		'<text x="400" y="168" text-anchor="middle" class="lbl">centered on μ, sd = σ/√n</text>' +
		'<text x="20" y="192" class="lbl">averaging washes the skew out: the tail draw gets diluted by 29 ordinary ones</text>' +
		'<defs><marker id="dgArrowSTCL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'sampling-clt',
		title: 'Sampling & the CLT',
		nav: 'sampling & clt',
		difficulty: 'Medium',
		category: 'Sampling & Estimation',
		task: 'Implement SampleMeans (repeated LCG-driven samples, one mean each), MeanOf, and StdErr — and watch the sd of the means match σ/√n.',

		prose: [
			'<h2>Sampling &amp; the Central Limit Theorem</h2>' +
			'<p>A poll asks 1,000 people and claims to know what 300 million ' +
			'think, “±3 points”. On its face that is absurd — the poll reached ' +
			'0.0003% of the population. The resolution is one of the great facts ' +
			'of statistics: the accuracy of a sample mean depends on the ' +
			'<em>sample size</em>, essentially not on the population size. To ' +
			'see it you need a distribution most people never look at directly — ' +
			'not the population, not one sample, but the <strong>sampling ' +
			'distribution</strong>: take a sample of size n, record its mean, ' +
			'put everything back, repeat. The means themselves form a ' +
			'distribution, and the CLT says:</p>' +
			'<ul>' +
			'<li><strong>It centers on μ</strong> — sample means are an unbiased ' +
			'estimate of the population mean.</li>' +
			'<li><strong>Its standard deviation is σ/√n</strong> — the ' +
			'<em>standard error</em>. Note the consequence hiding in the √: ' +
			'quadrupling the sample only halves the error. Precision gets ' +
			'expensive fast, which is why polls stop near n=1,000 (±3%) instead ' +
			'of pushing to 10,000 (±1%).</li>' +
			'<li><strong>Its shape goes normal</strong> as n grows — even when ' +
			'the population is lopsided, like the one in the diagram. Averaging ' +
			'is addition, and addition builds bells (the previous problem’s ' +
			'promise). By n≈30 most skews are tamed.</li>' +
			'</ul>' +
			DIAGRAM +
			'<p>Simulating this needs randomness, and the harness needs the ' +
			'<em>same</em> randomness on every machine — so no ' +
			'<code>math/rand</code>. The starter ships a tiny deterministic ' +
			'generator (a linear congruential generator, the classic ' +
			'seed-scramble used by C’s <code>rand()</code> for decades):</p>',
			{ lang: 'go', code: 'func nextRand(seed *uint32) float64 {\n\t*seed = *seed*1664525 + 1013904223 // Numerical Recipes constants\n\treturn float64(*seed>>8) / float64(1<<24) // top 24 bits -> [0,1)\n}' },
			'<h3>Your job</h3>' +
			'<p>Implement <code>MeanOf(xs)</code> (the plain average), ' +
			'<code>StdErr(sigma, n)</code> = σ/√n, and ' +
			'<code>SampleMeans(pop, n, k, seed)</code>: draw k samples of size n ' +
			'<em>with replacement</em> — each draw is ' +
			'<code>index := int(nextRand(&amp;seed) * float64(len(pop)))</code> — ' +
			'and return the k sample means. Consume draws row by row: all n ' +
			'draws of sample 0, then all n of sample 1, and so on, so the ' +
			'sequence of LCG values is fully determined by the seed.</p>',
			'<div class="tip">With replacement matters: it makes every draw ' +
			'independent and identically distributed, which is the exact ' +
			'hypothesis the CLT needs — and it is also why the same element ' +
			'showing up twice in one sample is correct behavior, not a bug.</div>',
		],

		starter: [
			'package main',
			'',
			'import "math"',
			'',
			'// nextRand is a deterministic LCG (Numerical Recipes constants),',
			'// provided so the harness sees identical draws on every machine:',
			'// the seed scrambles by seed = seed*1664525 + 1013904223 (mod 2^32)',
			'// and the top 24 bits become a uniform float in [0,1).',
			'// Do not modify — the expected values depend on this exact sequence.',
			'func nextRand(seed *uint32) float64 {',
			'	*seed = *seed*1664525 + 1013904223',
			'	return float64(*seed>>8) / float64(1<<24)',
			'}',
			'',
			'// MeanOf returns the arithmetic mean of xs (assume len(xs) > 0).',
			'func MeanOf(xs []float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// StdErr returns the standard error of a sample mean: sigma/sqrt(n),',
			'// where sigma is the POPULATION standard deviation and n the sample',
			'// size. This is the CLT\'s promised spread for the distribution of',
			'// sample means.',
			'func StdErr(sigma float64, n int) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// SampleMeans draws k samples of size n from pop WITH replacement',
			'// and returns each sample\'s mean, in order. Each draw picks',
			'//',
			'//   index := int(nextRand(&seed) * float64(len(pop)))',
			'//',
			'// consuming LCG values row by row: all n draws of sample 0 first,',
			'// then all n draws of sample 1, and so on — so a given seed fixes',
			'// every sample exactly.',
			'func SampleMeans(pop []float64, n, k int, seed uint32) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// keep the import used while the stubs are empty',
			'var _ = math.Sqrt',
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
			'// hMean and hSD are the harness\'s own mean/sd (population form) so',
			'// the CLT check does not depend on the user\'s MeanOf being correct.',
			'func hMean(xs []float64) float64 {',
			'	s := 0.0',
			'	for _, x := range xs {',
			'		s += x',
			'	}',
			'	return s / float64(len(xs))',
			'}',
			'',
			'func hSD(xs []float64) float64 {',
			'	m := hMean(xs)',
			'	s := 0.0',
			'	for _, x := range xs {',
			'		s += (x - m) * (x - m)',
			'	}',
			'	// Newton iteration for sqrt keeps the harness free of extra',
			'	// imports; 40 rounds is far past float64 convergence.',
			'	v := s / float64(len(xs))',
			'	if v == 0 {',
			'		return 0',
			'	}',
			'	r := v',
			'	for i := 0; i < 40; i++ {',
			'		r = (r + v/r) / 2',
			'	}',
			'	return r',
			'}',
			'',
			'func main() {',
			'	// A deliberately right-skewed population: most values small, one',
			'	// far tail value (25). Mean 6.0, population sd ≈ 6.4936.',
			'	pop := []float64{1, 1, 2, 2, 3, 3, 4, 5, 6, 8, 12, 25}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	fmtMeans := func(ms []float64) string {',
			'		out := ""',
			'		for i, m := range ms {',
			'			if i > 0 {',
			'				out += " "',
			'			}',
			'			out += fmt.Sprintf("%.4f", m)',
			'		}',
			'		return out',
			'	}',
			'	cases := []tc{',
			'		{"MeanOf({1,2,3,4}) — the plain average, the statistic everything else is built on",',
			'			"2.5000",',
			'			func() string { return fmt.Sprintf("%.4f", MeanOf([]float64{1, 2, 3, 4})) }},',
			'		{"SampleMeans(pop, n=5, k=3, seed=1): the LCG fixes every draw, so all three means are exact (sample 0 draws indices 2,4,6,8,0)",',
			'			"3.2000 4.2000 4.8000",',
			'			func() string { return fmtMeans(SampleMeans(pop, 5, 3, 1)) }},',
			'		{"StdErr(σ=2, n=25) = 2/√25 — the CLT\'s promised spread for the mean of 25 draws",',
			'			"0.4000",',
			'			func() string { return fmt.Sprintf("%.4f", StdErr(2, 25)) }},',
			'		{"the √n tax: quadrupling n from 25 to 100 only halves the error — precision gets expensive",',
			'			"0.4000 -> 0.2000",',
			'			func() string { return fmt.Sprintf("%.4f -> %.4f", StdErr(2, 25), StdErr(2, 100)) }},',
			'		{"CLT, empirically: sd of 400 sample means (n=30, seed=7) from the SKEWED pop lands on StdErr(6.4936, 30) — shape of the population never entered the formula",',
			'			"k=400 sd 1.19 ~ se 1.19",',
			'			func() string {',
			'				ms := SampleMeans(pop, 30, 400, 7)',
			'				return fmt.Sprintf("k=%d sd %.2f ~ se %.2f", len(ms), hSD(ms), StdErr(6.4936, 30))',
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
			'import "math"',
			'',
			'// nextRand — redeclared here because the solution replaces the',
			'// starter wholesale. Same LCG, same constants, same [0,1) mapping:',
			'// the harness\'s expected means are computed from this exact stream.',
			'// Taking the TOP 24 bits (seed>>8) matters: an LCG\'s low bits cycle',
			'// with short periods (bit 0 alternates every step), so the high',
			'// bits are where the apparent randomness lives.',
			'func nextRand(seed *uint32) float64 {',
			'	*seed = *seed*1664525 + 1013904223',
			'	return float64(*seed>>8) / float64(1<<24)',
			'}',
			'',
			'// MeanOf: one pass, sum then divide. For the sizes here a plain',
			'// left-to-right sum is exact enough; Kahan compensation would only',
			'// matter at millions of elements with wildly mixed magnitudes.',
			'func MeanOf(xs []float64) float64 {',
			'	sum := 0.0',
			'	for _, x := range xs {',
			'		sum += x',
			'	}',
			'	return sum / float64(len(xs))',
			'}',
			'',
			'// StdErr is the CLT\'s quantitative promise: averaging n independent',
			'// draws shrinks the spread by √n. Why √n and not n: independent',
			'// VARIANCES add, so Var(x̄) = n·σ²/n² = σ²/n, and taking the square',
			'// root to get back to standard-deviation units leaves σ/√n. The',
			'// square root is the entire economics of sampling — 4× the data for',
			'// 2× the precision.',
			'func StdErr(sigma float64, n int) float64 {',
			'	return sigma / math.Sqrt(float64(n))',
			'}',
			'',
			'// SampleMeans materializes the sampling distribution: k samples of',
			'// size n, one mean each. Drawing WITH replacement keeps every draw',
			'// i.i.d. — the exact hypothesis the CLT needs — and scaling a [0,1)',
			'// value by len(pop) gives a uniform index (nextRand never returns',
			'// 1.0, so the index never lands out of range).',
			'func SampleMeans(pop []float64, n, k int, seed uint32) []float64 {',
			'	means := make([]float64, 0, k)',
			'	// Row-by-row consumption is part of the contract: sample j uses',
			'	// LCG values j*n .. j*n+n-1, so a given seed pins every sample.',
			'	// The single seed threads through all draws via the pointer.',
			'	for j := 0; j < k; j++ {',
			'		sum := 0.0',
			'		for i := 0; i < n; i++ {',
			'			idx := int(nextRand(&seed) * float64(len(pop)))',
			'			sum += pop[idx]',
			'		}',
			'		means = append(means, sum/float64(n))',
			'	}',
			'	return means',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Three distributions, and which one the CLT is about</h3>' +
			'<p>Every CLT confusion traces back to mixing up three different ' +
			'distributions: the <em>population</em> (spread σ — fixed, possibly ' +
			'ugly), <em>one sample</em> (spread ≈ σ — a sample resembles its ' +
			'population, skew and all), and the <em>sampling distribution of ' +
			'the mean</em> (spread σ/√n — the only one the CLT makes normal). ' +
			'Taking n=1,000,000 does not make your <em>data</em> bell-shaped; ' +
			'it makes your <em>estimate of the mean</em> precise. The ' +
			'simulation you wrote is the only one of the three you rarely get ' +
			'to see in real life — in practice you draw one sample, not 400 — ' +
			'which is exactly why simulating it once is so clarifying: the ' +
			'standard error stops being a formula and becomes the measured sd ' +
			'of a column of numbers you generated.</p>' +
			'<h3>Why population size never showed up</h3>' +
			'<p>Nothing in σ/√n mentions the population’s size — that is the ' +
			'poll paradox resolved. A well-mixed sample of 1,000 has the same ' +
			'standard error whether the population is Denmark or the planet, ' +
			'for the same reason a spoonful tells you how the soup tastes ' +
			'regardless of pot size, provided the soup is stirred. All the ' +
			'practical difficulty of polling hides in “well-mixed”: σ/√n prices ' +
			'in <em>sampling</em> error only, and no amount of n fixes a biased ' +
			'draw. The famous cautionary tale is the 1936 Literary Digest poll — ' +
			'2.4 million responses, drawn from car and telephone registries ' +
			'during the Depression, predicting a landslide for the wrong ' +
			'candidate while Gallup got it right with ~50,000 properly mixed ' +
			'ones. Bigger n shrinks the error bars around a wrong answer.</p>' +
			'<h3>The deterministic-randomness trick</h3>' +
			'<p>Seeded pseudo-randomness — the LCG here — is a workhorse well ' +
			'beyond this exercise: reproducible ML training runs, property-based ' +
			'testing (a failing case prints its seed so you can replay it), ' +
			'Monte Carlo simulations that must be auditable. The LCG family is ' +
			'the oldest and simplest: multiply, add, truncate. Its flaws are ' +
			'well documented — low bits cycle fast (hence <code>seed&gt;&gt;8</code>), ' +
			'consecutive values fall on lattice planes in high dimensions — and ' +
			'modern generators (PCG, xoshiro) fix them at barely more cost. For ' +
			'400 samples of 30 draws, none of that matters; for a serious Monte ' +
			'Carlo study, the generator choice is part of the methodology.</p>',
		],
		complexity: { time: 'O(n·k) — one LCG step and one add per draw; MeanOf and StdErr are O(n) and O(1)', space: 'O(k) for the returned means' },
	});
})();
