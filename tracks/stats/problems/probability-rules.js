/* Probability Rules — Probability (Easy). The four moves every probability
 * argument is built from: complement, union (inclusion–exclusion),
 * conditional, and the independence check. The harness pins card and dice
 * classics — P(ace or heart), the "at least one six" complement trick — a
 * two-way-table conditional, the divide-by-zero guard, and the case that
 * trips everyone: mutually exclusive events are NOT independent.
 */
(function () {
	'use strict';
	var T = GoLearnStats;

	// Venn diagram of the union rule: adding P(A) and P(B) counts the lens
	// in the middle twice, so inclusion–exclusion subtracts it once. Marker
	// id namespaced (dgArrowSTPR) — SVG ids share one page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 200" width="520" height="200" role="img" aria-label="Venn diagram: circles A and B overlap; the overlap P(A and B) is counted by both circles, so the union rule subtracts it once">' +
		'<text x="20" y="22" class="lbl">P(A ∪ B) = P(A) + P(B) − P(A ∩ B): the lens is inside BOTH circles</text>' +
		'<circle cx="210" cy="105" r="62" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<circle cx="292" cy="105" r="62" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="172" y="110" text-anchor="middle">A</text>' +
		'<text x="330" y="110" text-anchor="middle">B</text>' +
		'<text x="251" y="110" text-anchor="middle" style="fill:var(--warn)">A ∩ B</text>' +
		// the double-count arrow: from the caption up into the lens
		'<path d="M 415 172 C 340 180 270 165 256 130" fill="none" stroke="var(--warn)" stroke-width="1.6" marker-end="url(#dgArrowSTPR)"/>' +
		'<text x="418" y="176" class="lbl" style="fill:var(--warn)">counted twice — subtract once</text>' +
		'<text x="20" y="194" class="lbl">mutually exclusive: the circles do not touch, P(A ∩ B) = 0 — and the union is a plain sum</text>' +
		'<defs><marker id="dgArrowSTPR" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker></defs>' +
		'</svg>';

	T.problem({
		id: 'probability-rules',
		title: 'Probability Rules',
		nav: 'probability rules',
		difficulty: 'Easy',
		category: 'Probability',
		task: 'Implement PComplement, PUnion (inclusion–exclusion), PCond (with a zero-denominator guard), and IsIndependent.',

		prose: [
			'<h2>Probability Rules</h2>' +
			'<p>You’re sizing a hash table and someone asks: “what’s the chance at ' +
			'least one of these keys collides?” Computing that head-on means ' +
			'summing the probability of exactly one collision, exactly two, exactly ' +
			'three… a combinatorial swamp. The pro move is the <strong>complement ' +
			'trick</strong>: “at least one collision” is the opposite of “zero ' +
			'collisions”, and zero collisions is <em>one</em> easy product. All of ' +
			'probability runs on a handful of such rules:</p>' +
			'<ul>' +
			'<li><strong>Complement:</strong> P(not A) = 1 − P(A). The workhorse ' +
			'behind every “at least one” question — compute the one clean case and ' +
			'subtract. P(at least one six in 4 rolls) = 1 − (5/6)⁴, instead of ' +
			'enumerating the 671 of 1296 outcomes that contain a six.</li>' +
			'<li><strong>Union (inclusion–exclusion):</strong> P(A ∪ B) = P(A) + ' +
			'P(B) − P(A ∩ B). Adding the two probabilities counts the overlap ' +
			'twice — the ace of hearts is in “aces” <em>and</em> in “hearts” — so ' +
			'you subtract it once. When A and B are <em>mutually exclusive</em> the ' +
			'overlap is 0 and the union collapses to a plain sum.</li>' +
			'<li><strong>Conditional:</strong> P(A|B) = P(A ∩ B) / P(B) — shrink ' +
			'the universe to “B happened”, then renormalize so the shrunken world ' +
			'still sums to 1. Undefined when P(B) = 0: you cannot condition on the ' +
			'impossible (your function returns 0 as the guard).</li>' +
			'<li><strong>Independence:</strong> A and B are independent exactly ' +
			'when P(A ∩ B) = P(A)·P(B) — knowing B happened tells you nothing ' +
			'about A. Because these are floats, test with a tolerance, never ' +
			'<code>==</code>.</li>' +
			'<li><strong>The classic confusion:</strong> mutually exclusive and ' +
			'independent are near-opposites. Exclusive events are <em>maximally ' +
			'dependent</em> — if A happened, you know with certainty B did not. ' +
			'Independent events (with nonzero probabilities) always overlap.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>PComplement(p)</code>, <code>PUnion(pa, pb, ' +
			'pab)</code> (where <code>pab</code> = P(A ∩ B)), <code>PCond(pab, ' +
			'pb)</code> (P(A|B), returning 0 when <code>pb == 0</code>), and ' +
			'<code>IsIndependent(pa, pb, pab)</code>, which compares ' +
			'<code>|pab − pa·pb| &lt; 1e-9</code>.</p>',
			{ lang: 'txt', code: 'draw one card: P(ace) = 4/52, P(heart) = 13/52, P(ace of hearts) = 1/52\nP(ace or heart) = 4/52 + 13/52 − 1/52 = 16/52 ≈ 0.3077   (not 17/52!)\n\nindependence: 4/52 · 13/52 = 1/52 = P(ace ∩ heart)  ⇒  independent\nexclusive:    P(heads ∩ tails) = 0 ≠ 1/2 · 1/2      ⇒  dependent!' },
			'<div class="tip">Read the last line again — it’s the one exam graders ' +
			'weep over. “Can’t happen together” <em>feels</em> like “unrelated”, ' +
			'but it’s the strongest relationship there is: one event completely ' +
			'determines the other’s absence.</div>',
		],

		starter: [
			'package main',
			'',
			'// PComplement returns P(not A) = 1 − p, the probability the event',
			'// does NOT occur. The workhorse behind every "at least one" question:',
			'// compute the single clean complementary case and subtract from 1.',
			'func PComplement(p float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// PUnion returns P(A ∪ B) by inclusion–exclusion:',
			'//',
			'//   P(A ∪ B) = pa + pb − pab',
			'//',
			'// where pab is P(A ∩ B). The subtraction removes the overlap that',
			'// pa + pb counted twice. With pab = 0 (mutually exclusive events)',
			'// this degrades gracefully to a plain sum.',
			'func PUnion(pa, pb, pab float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// PCond returns the conditional probability P(A|B) = pab / pb —',
			'// the share of B\'s probability that also contains A. When pb == 0',
			'// the conditional is undefined (you cannot condition on an impossible',
			'// event); return 0 rather than dividing.',
			'func PCond(pab, pb float64) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// IsIndependent reports whether A and B are independent: whether',
			'// P(A ∩ B) equals P(A)·P(B). These are floats, so compare with a',
			'// tolerance instead of ==:',
			'//',
			'//   |pab − pa·pb| < 1e-9',
			'func IsIndependent(pa, pb, pab float64) bool {',
			'	// your code here',
			'	return false',
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
			'	// One draw from a standard 52-card deck: the canonical overlapping',
			'	// pair. The ace of hearts lives in BOTH events.',
			'	pAce := 4.0 / 52.0',
			'	pHeart := 13.0 / 52.0',
			'	pAceOfHearts := 1.0 / 52.0',
			'	// Four die rolls with no six: one clean product, (5/6)^4 — the',
			'	// complement of the "at least one six" question.',
			'	pNoSix := (5.0 / 6.0) * (5.0 / 6.0) * (5.0 / 6.0) * (5.0 / 6.0)',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	f4 := func(v float64) string { return fmt.Sprintf("%.4f", v) }',
			'	cases := []tc{',
			'		{"P(ace or heart): 4/52 + 13/52 double-counts the ace of hearts — subtract 1/52",',
			'			"0.3077",',
			'			func() string { return f4(PUnion(pAce, pHeart, pAceOfHearts)) }},',
			'		{"mutually exclusive events (P(A∩B) = 0): the union degrades to a plain sum",',
			'			"0.5000",',
			'			func() string { return f4(PUnion(0.3, 0.2, 0)) }},',
			'		{"complement trick: P(at least one six in 4 rolls) = 1 − (5/6)⁴ — one subtraction, not 671 cases",',
			'			"0.5177",',
			'			func() string { return f4(PComplement(pNoSix)) }},',
			'		{"plain complement: P(no rain) when P(rain) = 0.3",',
			'			"0.7000",',
			'			func() string { return f4(PComplement(0.3)) }},',
			'		{"two-way table: P(churn ∩ mobile) = 0.25, P(mobile) = 0.40 ⇒ P(churn | mobile) renormalizes",',
			'			"0.6250",',
			'			func() string { return f4(PCond(0.25, 0.40)) }},',
			'		{"conditioning on the impossible: P(B) = 0 must return 0, never divide",',
			'			"0.0000",',
			'			func() string { return f4(PCond(0.25, 0)) }},',
			'		{"independent: P(ace ∩ heart) = 1/52 = P(ace)·P(heart) exactly — suits carry no rank info",',
			'			"true",',
			'			func() string { return fmt.Sprintf("%v", IsIndependent(pAce, pHeart, pAceOfHearts)) }},',
			'		{"mutually exclusive is NOT independent: P(A∩B) = 0 ≠ 0.25 — knowing A forces B out",',
			'			"false",',
			'			func() string { return fmt.Sprintf("%v", IsIndependent(0.5, 0.5, 0)) }},',
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
			'// PComplement: the whole sample space has probability 1, so the',
			'// probability of "not A" is whatever A leaves behind. One-liner by',
			'// design — its value is in RECOGNIZING when to reach for it ("at',
			'// least one X" is nearly always 1 − P(no X at all)).',
			'func PComplement(p float64) float64 {',
			'	return 1 - p',
			'}',
			'',
			'// PUnion is inclusion–exclusion for two events. pa + pb counts every',
			'// outcome in the overlap twice — once as a member of A, once as a',
			'// member of B — so subtracting pab restores each outcome to exactly',
			'// one count. (For three or more events the correction alternates:',
			'// add singles, subtract pairs, add triples, ... — same idea, deeper.)',
			'func PUnion(pa, pb, pab float64) float64 {',
			'	return pa + pb - pab',
			'}',
			'',
			'// PCond renormalizes: given that B happened, the universe shrinks to',
			'// B, and A\'s share of that smaller universe is pab / pb. The guard',
			'// is not just defensive coding — conditioning on a probability-zero',
			'// event is mathematically undefined, and the contract picks 0 as the',
			'// explicit sentinel rather than letting the division produce ±Inf',
			'// or NaN that would poison downstream arithmetic silently.',
			'func PCond(pab, pb float64) float64 {',
			'	if pb == 0 {',
			'		return 0',
			'	}',
			'	return pab / pb',
			'}',
			'',
			'// IsIndependent tests the definition P(A ∩ B) = P(A)·P(B) with a',
			'// tolerance. The tolerance matters: pa and pb typically arrive as',
			'// quotients (4/52, 13/52) that are not exactly representable in',
			'// binary, so the product can differ from the true intersection by a',
			'// few ULPs even for genuinely independent events. 1e-9 is far above',
			'// float64 rounding noise and far below any real probability gap.',
			'func IsIndependent(pa, pb, pab float64) bool {',
			'	return math.Abs(pab-pa*pb) < 1e-9',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Three axioms, everything else derived</h3>' +
			'<p>Kolmogorov’s 1933 axiomatization needs only: probabilities are ' +
			'non-negative, the whole space has probability 1, and disjoint events ' +
			'add. Every rule you implemented falls out — the complement rule is ' +
			'“A and not-A are disjoint and cover everything”, and ' +
			'inclusion–exclusion is bookkeeping over disjoint pieces (A∖B, B∖A, ' +
			'A∩B). Conditional probability is the one genuinely new definition, ' +
			'and it’s the bridge to the next problem: rearranging P(A|B)·P(B) = ' +
			'P(A ∩ B) = P(B|A)·P(A) <em>is</em> Bayes’ theorem. You’ve already ' +
			'written most of it.</p>' +
			'<h3>Exclusive vs independent, one more time</h3>' +
			'<p>The confusion survives every intro course because the words sound ' +
			'alike in English while being near-opposites in math. Test it with ' +
			'information: independence means learning B changes nothing — ' +
			'P(A|B) = P(A). Exclusivity means learning B changes everything — ' +
			'P(A|B) = 0 no matter how likely A was before. A coin can’t land both ' +
			'heads and tails; the moment you see heads, tails went from 50% to ' +
			'impossible. That’s the strongest possible dependence. The only way an ' +
			'event pair is both exclusive and independent is the degenerate case ' +
			'where one has probability zero.</p>' +
			'<h3>The complement trick at scale</h3>' +
			'<p>The hash-collision hook is the birthday problem wearing an ' +
			'engineering costume, and it’s solved exactly the way you solved the ' +
			'dice case: P(some collision among k keys in m buckets) = 1 − P(all ' +
			'distinct) = 1 − ∏(1 − i/m). That formula is why 23 people suffice for ' +
			'a 50% shared birthday, why git worries about short hash prefixes, and ' +
			'why UUID collision math always starts with “one minus”. RAID ' +
			'reliability (“at least one disk fails this year”), retry logic (“at ' +
			'least one request succeeds”), monitoring (“at least one false alarm ' +
			'this week”) — the production questions are overwhelmingly ' +
			'“at-least-one” questions, and the complement rule turns each into a ' +
			'single multiplication loop.</p>',
		],
		complexity: { time: 'O(1) — each rule is constant-time arithmetic', space: 'O(1)' },
	});
})();
