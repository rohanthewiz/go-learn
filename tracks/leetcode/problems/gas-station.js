/* Gas Station — Greedy (Medium). The showcase problem for greedy proofs:
 * the O(n) one-pass answer rests on TWO separate arguments — a feasibility
 * lemma (total gas ≥ total cost ⇒ some start works) and a skip-ahead proof
 * (a failed stretch cannot contain the start). The starter returns −2
 * because −1 is a legitimate expected answer for infeasible circuits.
 */
(function () {
	'use strict';
	var LC = GoLearnLeet;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 210" width="500" height="210" role="img" aria-label="net-fuel scan over gas=[1 2 3 4 5], cost=[3 4 5 1 2]">' +
		'<text x="20" y="16" class="lbl">gas = [1 2 3 4 5], cost = [3 4 5 1 2] → net = gas − cost per station</text>' +
		// station boxes with per-station net values
		'<g fill="var(--panel)">' +
		'<rect x="30" y="36" width="56" height="34" rx="4" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<rect x="120" y="36" width="56" height="34" rx="4" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<rect x="210" y="36" width="56" height="34" rx="4" stroke="var(--err-edge)" stroke-width="1.6"/>' +
		'<rect x="300" y="36" width="56" height="34" rx="4" stroke="var(--accent)" stroke-width="2"/>' +
		'<rect x="390" y="36" width="56" height="34" rx="4" stroke="var(--ok)" stroke-width="1.6"/>' +
		'</g>' +
		'<g text-anchor="middle">' +
		'<text x="58" y="58">−2</text><text x="148" y="58">−2</text><text x="238" y="58">−2</text>' +
		'<text x="328" y="58" style="fill:var(--accent)">+3</text><text x="418" y="58" style="fill:var(--ok)">+3</text>' +
		'</g>' +
		'<g text-anchor="middle" class="lbl">' +
		'<text x="58" y="86">0</text><text x="148" y="86">1</text><text x="238" y="86">2</text>' +
		'<text x="328" y="86">3 = start</text><text x="418" y="86">4</text>' +
		'</g>' +
		// failed candidates: each of 0,1,2 dies on its very first hop
		'<text x="30" y="116" class="lbl">candidates 0, 1, 2 all go negative — tank &lt; 0 means the whole stretch is dead:</text>' +
		'<path d="M 58 126 C 130 156 240 156 320 130" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowGS)"/>' +
		'<text x="190" y="170" text-anchor="middle" class="lbl">candidate = i + 1, tank = 0 (skip past the failure, never re-scan)</text>' +
		// feasibility lemma note
		'<text x="30" y="196">total net = −2 −2 −2 +3 +3 = 0 ≥ 0 ⇒ an answer exists — the scan finds start = 3</text>' +
		'<defs><marker id="dgArrowGS" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	LC.problem({
		id: 'gas-station',
		title: 'Gas Station',
		nav: 'Gas Station',
		difficulty: 'Medium',
		category: 'Greedy',
		task: 'Implement canCompleteCircuit — make all 6 tests pass.',

		prose: [
			'<h2>Gas Station</h2>' +
			'<p>There are <code>n</code> gas stations around a circular route. Filling up at ' +
			'station i gives <code>gas[i]</code> fuel, and driving from station i to station ' +
			'i+1 burns <code>cost[i]</code> fuel. You start with an empty tank at a station ' +
			'of your choice. Return the index of the unique station from which you can ' +
			'travel the full circle clockwise, or <code>−1</code> if no such station exists.</p>' +
			'<ul><li>If a valid start exists, it is guaranteed to be unique.</li>' +
			'<li>The tank must never go below zero between stations.</li>' +
			'<li><code>gas</code> and <code>cost</code> have the same non-zero length.</li></ul>' +
			'<h3>Example</h3>',
			{ code: 'canCompleteCircuit([]int{1, 2, 3, 4, 5}, []int{3, 4, 5, 1, 2})  →  3\ncanCompleteCircuit([]int{2, 3, 4}, []int{3, 4, 3})              →  -1  // burns more than it gains', lang: 'txt' },
			'<h3>The idea</h3>' +
			'<p>Only the <em>net</em> per station matters: <code>gas[i] − cost[i]</code>. ' +
			'Two facts turn this into a single pass. First, if the total net over the whole ' +
			'circle is ≥ 0, some start must work. Second, when a candidate start fails at ' +
			'station i, <em>every</em> station in the failed stretch fails too — so the next ' +
			'candidate is i+1, and no index is ever revisited:</p>' +
			DIAGRAM +
			'<p>One pass, two running sums — no simulation of n different starts.</p>',
		],

		starter: [
			'package main',
			'',
			'// canCompleteCircuit returns the index of the unique station from which',
			'// the full circular route can be completed clockwise (tank never drops',
			'// below zero), or -1 if no station works. gas[i] is the fuel gained at',
			'// station i; cost[i] is the fuel burned driving from i to i+1.',
			'func canCompleteCircuit(gas []int, cost []int) int {',
			'	// your code here',
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
			LC.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		gas  []int',
			'		cost []int',
			'		want int',
			'	}',
			'	cases := []tc{',
			'		{[]int{1, 2, 3, 4, 5}, []int{3, 4, 5, 1, 2}, 3},  // classic: only 3 works',
			'		{[]int{2, 3, 4}, []int{3, 4, 3}, -1},             // total cost > total gas',
			'		{[]int{3, 1, 1}, []int{1, 2, 2}, 0},              // the very first station works',
			'		{[]int{5}, []int{4}, 0},                          // single station, feasible',
			'		{[]int{1}, []int{2}, -1},                         // single station, infeasible',
			'		{[]int{2, 2, 2}, []int{1, 1, 1}, 0},              // surplus everywhere → earliest index',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("gas=%v, cost=%v", c.gas, c.cost),',
			'			"want":  fmt.Sprintf("%d", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := canCompleteCircuit(append([]int(nil), c.gas...), append([]int(nil), c.cost...))',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%d", got)',
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
			'// canCompleteCircuit returns the unique feasible starting station, or -1.',
			'//',
			'// One pass built on two separate arguments:',
			'//',
			'//  1. Feasibility lemma: if sum(gas) ≥ sum(cost), SOME start works, so',
			'//     checking the grand total answers "is it −1?" all by itself.',
			'//  2. Skip-ahead: if a candidate start s first drives the tank negative',
			'//     at station i, then no station in (s..i] can be the start either,',
			'//     so the next candidate worth trying is i+1 — the scan never backs up.',
			'//',
			'// Together they mean the last surviving candidate IS the answer whenever',
			'// the total says one exists. No station is simulated twice: O(n).',
			'func canCompleteCircuit(gas []int, cost []int) int {',
			'	total := 0 // net fuel over the WHOLE circle — decides feasibility',
			'	tank := 0  // net fuel accumulated since the current candidate start',
			'	start := 0 // current candidate starting station',
			'	for i := range gas {',
			'		net := gas[i] - cost[i]',
			'		total += net',
			'		tank += net',
			'		if tank < 0 {',
			'			// Candidate start failed somewhere in [start, i]. Any later',
			'			// station t in that stretch would arrive at i with even LESS',
			'			// fuel (it forfeits the non-negative tank the candidate still',
			'			// had when passing t), so the whole stretch is dead — jump',
			'			// the candidate past it and restart the local sum.',
			'			start = i + 1',
			'			tank = 0',
			'		}',
			'	}',
			'	if total < 0 {',
			'		return -1 // burns more than it gains — no start can ever work',
			'	}',
			'	// total ≥ 0 guarantees an answer exists (lemma), and every index',
			'	// before start was eliminated by a proof, so start is it. Note we',
			'	// never had to simulate the wrap-around leg explicitly.',
			'	return start',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force first</h3>' +
			'<p>Try each of the n stations as a start and simulate the full circle: O(n²). ' +
			'The wasted work is glaring — when start 0 dies at station 40, trying start 1 ' +
			're-drives almost the same road. The one-pass answer comes from two claims that ' +
			'deserve to be proved separately, because each does a different job.</p>' +
			'<h3>Claim 1 — the feasibility lemma</h3>' +
			'<p><strong>If total gas ≥ total cost, an answer exists.</strong> Sketch: walk the ' +
			'circle from station 0 keeping a running sum of <code>net = gas − cost</code>, and ' +
			'let m be a point where that running sum is at its <em>minimum</em>. Start the trip ' +
			'just after m: every prefix of the new trip is a difference of running sums against ' +
			'the minimum, so it is never negative — the tank never dips below empty. So the grand ' +
			'total alone decides between "some index" and −1; the scan only has to find ' +
			'<em>which</em> index.</p>' +
			'<h3>Claim 2 — a failed stretch cannot contain the start</h3>' +
			'<p>Suppose candidate s first goes negative at station i, and consider any station ' +
			't with s &lt; t ≤ i. When the trip from s passed through t it still had ' +
			'<code>tank ≥ 0</code> (i was the <em>first</em> failure). A trip starting fresh at t ' +
			'therefore arrives at every subsequent station with <em>less or equal</em> fuel than ' +
			'the trip from s had — it forfeits that non-negative head start. Since the trip from ' +
			's went negative by i, the trip from t does too. Every station in (s..i] is dead, and ' +
			'the next candidate is i+1:</p>',
			{ code: 'total, tank, start := 0, 0, 0\nfor i := range gas {\n\tnet := gas[i] - cost[i]\n\ttotal += net\n\ttank += net\n\tif tank < 0 {\n\t\tstart = i + 1 // nothing in [start, i] can work — proven, not guessed\n\t\ttank = 0\n\t}\n}\nif total < 0 {\n\treturn -1\n}\nreturn start' },
			'<p>Notice the division of labor: <code>tank</code> only ever eliminates candidates ' +
			'(claim 2), and <code>total</code> alone certifies that the surviving candidate ' +
			'succeeds (claim 1) — the code never simulates the wrap-around leg, because the ' +
			'lemma makes that unnecessary. Dropping either claim breaks the algorithm: without ' +
			'the lemma you would have to verify the final candidate; without skip-ahead you are ' +
			'back to O(n²).</p>' +
			'<h3>The pattern</h3>' +
			'<p><strong>Greedy with a feasibility invariant plus a skip-ahead proof</strong> — ' +
			'reach for it when a problem asks for a valid starting point and a failed attempt ' +
			'poisons everything it covered. The trigger phrase is "if start s fails at i, every ' +
			'start between them fails too": once you can prove that exchange-style argument, a ' +
			'single O(n) pass with a reset replaces n simulations. It is the same reasoning that ' +
			'drives <em>Jump Game</em> (the furthest-reach frontier silently skips every ' +
			'doomed index) and it is Kadane’s reset in <em>Maximum Subarray</em> in disguise: ' +
			'there, when a running prefix sum goes negative you drop it and restart at the next ' +
			'element — dropping a negative prefix can only help, exactly as a negative ' +
			'<code>tank</code> stretch can never help a later start here. Cost: O(n) time, O(1) ' +
			'space, but the correctness burden shifts from the code to the proof — write the ' +
			'proof down before trusting the reset.</p>',
		],
		complexity: { time: 'O(n)', space: 'O(1)' },
	});
})();
