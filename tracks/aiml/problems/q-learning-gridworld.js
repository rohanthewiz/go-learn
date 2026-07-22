/* Q-Learning in a Gridworld — Applied AI & RL (Hard). Tabular Q-learning on a
 * pinned 4x4 world: Bellman updates, epsilon-greedy exploration driven by an
 * explicit LCG, and the gamma-as-horizon lesson — a myopic agent grabs the +2
 * snack next door while a far-sighted one walks six -1 steps to the +10 goal.
 * Every number (first-episode trajectory, converged Q cells, the optimal
 * greedy path) is deterministic under the pinned seed.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// The world plus the two policies the item pins: the gamma=0.95 greedy
	// path down column 0 and along row 2, and the gamma=0.5 dive into the
	// snack. Ids namespaced AIQL — every track shares the page namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 236" width="520" height="236" role="img" aria-label="4 by 4 gridworld: start top left, pit at row 1 column 3, snack at row 3 column 0, goal bottom right; the learned greedy path goes down column 0, right along row 2, then down into the goal; a dashed arrow shows the gamma 0.5 policy diving into the snack">' +
		'<text x="16" y="20" class="lbl">the world — and the greedy policy Q-learning finds (γ=0.95)</text>' +
		// grid frame + inner lines
		'<rect x="36" y="32" width="176" height="176" rx="4" fill="none" stroke="var(--accent)" stroke-opacity="0.35" stroke-width="1.4"/>' +
		'<path d="M80 32 V208 M124 32 V208 M168 32 V208 M36 76 H212 M36 120 H212 M36 164 H212" stroke="var(--accent)" stroke-opacity="0.18" stroke-width="1"/>' +
		// special cells
		'<rect x="168" y="76" width="44" height="44" fill="none" stroke="var(--warn)" stroke-width="2"/>' +
		'<rect x="36" y="164" width="44" height="44" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="4 3"/>' +
		'<rect x="168" y="164" width="44" height="44" fill="none" stroke="var(--accent)" stroke-width="2.2"/>' +
		'<text x="58" y="59" text-anchor="middle">S</text>' +
		'<text x="190" y="103" text-anchor="middle" style="fill:var(--warn)">−10</text>' +
		'<text x="58" y="191" text-anchor="middle" style="fill:var(--warn)">+2</text>' +
		'<text x="190" y="191" text-anchor="middle" style="fill:var(--accent)">+10</text>' +
		// gamma=0.95 greedy path: 0 -> 4 -> 8 -> 9 -> 10 -> 11 -> 15
		'<polyline points="58,64 58,142 190,142 190,166" fill="none" stroke="var(--accent)" stroke-width="2" marker-end="url(#dgArrowAIQL)"/>' +
		// gamma=0.5 at state 8: dive into the snack below
		'<path d="M64 148 L64 166" fill="none" stroke="var(--warn)" stroke-width="1.8" stroke-dasharray="4 3" marker-end="url(#dgArrowAIQLw)"/>' +
		// annotations
		'<text x="232" y="58">Q(s,a) += α·(r + γ·maxQ(s′) − Q(s,a))</text>' +
		'<text x="232" y="82" class="lbl">every step −1 · off-grid = stay put · terminals end the episode</text>' +
		'<text x="232" y="102" class="lbl">α=0.5, ε=0.4, 400 episodes, LCG seed 42</text>' +
		'<text x="232" y="140" style="fill:var(--accent)">γ=0.95: six −1 steps, then +10</text>' +
		'<text x="232" y="162" style="fill:var(--warn)">γ=0.5: the +2 next door wins</text>' +
		'<text x="232" y="196" class="lbl">same world, same rewards — the horizon γ decides the policy</text>' +
		'<defs>' +
		'<marker id="dgArrowAIQL" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowAIQLw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'q-learning-gridworld',
		title: 'Q-Learning in a Gridworld',
		nav: 'Q-learning',
		difficulty: 'Hard',
		category: 'Applied AI & Reinforcement Learning',
		task: 'Implement tabular Q-learning on a pinned 4x4 gridworld: the environment step, the Bellman update, LCG-driven epsilon-greedy exploration, the training loop, and greedy policy extraction.',

		prose: [
			'<h2>Q-Learning in a Gridworld</h2>' +
			'<p>Everything else in this track learned from labeled examples: here is ' +
			'an input, here is the right answer, minimize the gap. Reinforcement ' +
			'learning drops the answer key. An agent acts, the world responds, and ' +
			'the only feedback is a scalar reward that usually arrives <em>late</em> ' +
			'— the warehouse robot finds out its route was good when it docks, not ' +
			'when it picks a corridor. Which of the forty moves deserves the credit? ' +
			'That is the <strong>credit assignment problem</strong>, and Q-learning ' +
			'answers it with one of the great ideas in computer science: the ' +
			'<strong>Bellman equation</strong>.</p>' +
			'<ul>' +
			'<li><strong>The world</strong>: a 4×4 grid, state = <code>row*4+col</code>, ' +
			'start at (0,0). Three terminal cells: the goal (3,3) pays <strong>+10</strong>, ' +
			'the pit (1,3) pays <strong>−10</strong>, and a snack at (3,0) pays a ' +
			'tempting little <strong>+2</strong>. Every other move costs −1, and ' +
			'walking off the grid leaves you where you stood (still −1).</li>' +
			'<li><strong>The table</strong>: <code>Q[s][a]</code> estimates the total ' +
			'discounted reward from taking action <code>a</code> in state ' +
			'<code>s</code> and acting greedily ever after. 16 states × 4 actions ' +
			'(0=up 1=down 2=left 3=right) — 64 numbers that, once learned, ' +
			'<em>are</em> the policy.</li>' +
			'<li><strong>The update</strong>: after every single step, pull ' +
			'<code>Q[s][a]</code> toward the <em>bootstrapped</em> target ' +
			'<code>r + γ·maxQ(s′)</code> — reward now, plus discounted best-case ' +
			'later, with the future term dropped when the episode is done.</li>' +
			'</ul>',
			{ lang: 'txt', code: 'one update, by hand (α=0.5, γ=0.9):\n  s=(0,2), a=down, r=−1, Q[s][a]=2.0, best Q at s′ is 4.0, not done\n  target = −1 + 0.9·4.0            = 2.6\n  Q[s][a] = 2.0 + 0.5·(2.6 − 2.0)  = 2.30' },
			'<p>Exploration is the other half. Always act greedily on a zero table ' +
			'and you never discover the goal; act randomly forever and you never ' +
			'<em>use</em> what you learned. <strong>ε-greedy</strong> splits the ' +
			'difference — with probability ε take a random action, otherwise the ' +
			'argmax — and because every test needs exactly one right answer, the ' +
			'randomness comes from an explicit LCG you implement yourself ' +
			'(<code>state*1664525 + 1013904223</code> in uint32, uniform = ' +
			'<code>state/2³²</code>). Real libraries hide this in ' +
			'<code>rand</code>; pinning it is what makes a 400-episode training run ' +
			'reproduce bit-for-bit.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement the seven pieces: <code>Step</code> (the environment), ' +
			'<code>NextU</code> (the LCG), <code>QUpdate</code> (the Bellman step), ' +
			'<code>EpsilonGreedy</code>, <code>Train</code> (the loop, exactly as ' +
			'specified in the doc comment — the harness replays your first episode ' +
			'against a pinned trajectory), <code>Policy</code>, and ' +
			'<code>GreedyPath</code>. Simplifications, disclosed: transitions are ' +
			'deterministic (real gridworlds often add action noise), ε is fixed ' +
			'rather than decayed, the table is exact rather than a neural net, and ' +
			'terminal states are never updated so their Q rows stay 0.</p>' +
			'<div class="tip">Q-learning is <strong>off-policy</strong>: the agent ' +
			'<em>behaves</em> with a sloppy ε=0.4 explorer, but the <code>max</code> ' +
			'inside the update learns the value of the <em>greedy</em> policy. That ' +
			'is why you can train with wild exploration and still read a clean ' +
			'optimal path out of the finished table — and it is the same property ' +
			'that lets DQN learn from a replay buffer of stale experience.</div>',
		],

		starter: [
			'package main',
			'',
			'// ── The world ────────────────────────────────────────────────────────',
			'// 4x4 grid, state = row*4 + col, row 0 on top:',
			'//',
			'//	col →     0        1     2     3',
			'//	row 0:   S=0       1     2     3',
			'//	row 1:    4        5     6     7  PIT   (enter: -10, terminal)',
			'//	row 2:    8        9    10    11',
			'//	row 3:  12 SNACK  13    14    15 GOAL  (+2 / +10, both terminal)',
			'//',
			'// Actions: 0=up 1=down 2=left 3=right.',
			'',
			'// Step applies action a in state s and returns (next state, reward,',
			'// done). Rules:',
			'//   - a move off the grid leaves the agent in place: (s, -1, false)',
			'//   - entering GOAL(15) returns (15, +10, true); PIT(7) (7, -10, true);',
			'//     SNACK(12) (12, +2, true) — the terminal reward REPLACES the -1',
			'//   - any other move costs -1 and is not done',
			'// Step is never called with s already terminal.',
			'func Step(s, a int) (int, float64, bool) {',
			'	// your code here',
			'	return 0, 0, false',
			'}',
			'',
			'// NextU advances the pinned LCG one tick and returns the new state',
			'// plus a uniform sample in [0,1):',
			'//',
			'//	next = state*1664525 + 1013904223   // uint32, wraps mod 2^32',
			'//	u    = float64(next) / 4294967296.0',
			'func NextU(state uint32) (uint32, float64) {',
			'	// your code here',
			'	return 0, 0',
			'}',
			'',
			'// QUpdate applies one tabular Q-learning update IN PLACE and returns',
			'// the updated q[s][a]:',
			'//',
			'//	target = r                              if done',
			'//	target = r + gamma * max_a q[sNext][a]  otherwise',
			'//	q[s][a] += alpha * (target - q[s][a])',
			'func QUpdate(q [][]float64, s, a int, r float64, sNext int, alpha, gamma float64, done bool) float64 {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// EpsilonGreedy picks an action from row q[s] using two pre-drawn',
			'// uniforms:',
			'//   - u1 <  eps → explore: return int(u2*4), clamped to 3',
			'//   - u1 >= eps → exploit: argmax over q[s]; ties go to the LOWEST',
			'//     action index',
			'func EpsilonGreedy(q [][]float64, s int, eps, u1, u2 float64) int {',
			'	// your code here',
			'	return 0',
			'}',
			'',
			'// Train runs Q-learning from a zeroed 16x4 table and returns it.',
			'// ONE LCG stream, threaded through all episodes. Exact loop order',
			'// (the harness replays your first episode step for step):',
			'//',
			'//	rng := seed',
			'//	for each episode:',
			'//		s := 0',
			'//		for step := 0; step < 50; step++ {',
			'//			rng, u1 = NextU(rng)   // u1 first, u2 second,',
			'//			rng, u2 = NextU(rng)   // BOTH drawn every step',
			'//			a := EpsilonGreedy(q, s, eps, u1, u2)',
			'//			sNext, r, done := Step(s, a)',
			'//			QUpdate(q, s, a, r, sNext, alpha, gamma, done)',
			'//			s = sNext',
			'//			if done { break }',
			'//		}',
			'func Train(episodes int, alpha, gamma, eps float64, seed uint32) [][]float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// Policy returns the greedy action per state: argmax over q[s], ties',
			'// to the LOWEST action index.',
			'func Policy(q [][]float64) []int {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// GreedyPath rolls out the greedy policy from the start state and',
			'// returns every state visited, start included. It stops after',
			'// appending a terminal state (12, 7, or 15) or after maxSteps moves.',
			'func GreedyPath(q [][]float64, maxSteps int) []int {',
			'	// your code here',
			'	return nil',
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
			'	// mk allocates the zeroed 16x4 table used by hand-check cases.',
			'	mk := func() [][]float64 {',
			'		q := make([][]float64, 16)',
			'		for i := range q {',
			'			q[i] = make([]float64, 4)',
			'		}',
			'		return q',
			'	}',
			'	fs := func(s, a int) string {',
			'		next, r, done := Step(s, a)',
			'		return fmt.Sprintf("%d,%.1f,%v", next, r, done)',
			'	}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"Step: an off-grid move stays put and still pays the -1 step cost (up from the start corner)",',
			'			"0,-1.0,false",',
			'			func() string { return fs(0, 0) }},',
			'		{"Step: entering a terminal REPLACES the step cost and ends the episode — goal, pit, snack",',
			'			"15,10.0,true 7,-10.0,true 12,2.0,true",',
			'			func() string { return fs(14, 3) + " " + fs(3, 1) + " " + fs(8, 1) }},',
			'		{"NextU: the pinned LCG stream from seed 42 — one wrong constant and every later number drifts",',
			'			"0.2523 0.0881 0.5773",',
			'			func() string {',
			'				rng := uint32(42)',
			'				out := ""',
			'				for i := 0; i < 3; i++ {',
			'					var u float64',
			'					rng, u = NextU(rng)',
			'					if i > 0 {',
			'						out += " "',
			'					}',
			'					out += fmt.Sprintf("%.4f", u)',
			'				}',
			'				return out',
			'			}},',
			'		{"QUpdate by hand: terminal target is just r; non-terminal bootstraps gamma*maxQ(next)",',
			'			"5.00 2.30",',
			'			func() string {',
			'				qa := mk()',
			'				v1 := QUpdate(qa, 14, 3, 10, 15, 0.5, 0.9, true)',
			'				qb := mk()',
			'				qb[2][1] = 2.0',
			'				qb[6][0] = 4.0',
			'				v2 := QUpdate(qb, 2, 1, -1, 6, 0.5, 0.9, false)',
			'				return fmt.Sprintf("%.2f %.2f", v1, v2)',
			'			}},',
			'		{"EpsilonGreedy: exploit-argmax ties go to the LOWEST action; explore picks int(u2*4)",',
			'			"1 2",',
			'			func() string {',
			'				qe := mk()',
			'				qe[5] = []float64{1, 3, 3, 0}',
			'				return fmt.Sprintf("%d %d",',
			'					EpsilonGreedy(qe, 5, 0.2, 0.9, 0.0),',
			'					EpsilonGreedy(qe, 5, 0.2, 0.1, 0.6))',
			'			}},',
			'		{"first episode, seed 42, replayed from YOUR Step/NextU/EpsilonGreedy/QUpdate: the exact wander into the snack",',
			'			"0 0 4 0 0 1 1 5 1 2 2 6 2 1 2 3 2 2 6 10 6 5 1 0 0 4 8 12",',
			'			func() string {',
			'				q := mk()',
			'				rng := uint32(42)',
			'				s := 0',
			'				traj := fmt.Sprintf("%d", s)',
			'				for step := 0; step < 50; step++ {',
			'					var u1, u2 float64',
			'					rng, u1 = NextU(rng)',
			'					rng, u2 = NextU(rng)',
			'					a := EpsilonGreedy(q, s, 0.4, u1, u2)',
			'					sNext, r, done := Step(s, a)',
			'					QUpdate(q, s, a, r, sNext, 0.5, 0.95, done)',
			'					s = sNext',
			'					traj += fmt.Sprintf(" %d", s)',
			'					if done {',
			'						break',
			'					}',
			'				}',
			'				return traj',
			'			}},',
			'		{"after 400 episodes (gamma=0.95) the greedy path is the optimal 6-move route past pit AND snack",',
			'			"0 4 8 9 10 11 15",',
			'			func() string {',
			'				q := Train(400, 0.5, 0.95, 0.4, 42)',
			'				out := ""',
			'				for i, p := range GreedyPath(q, 20) {',
			'					if i > 0 {',
			'						out += " "',
			'					}',
			'					out += fmt.Sprintf("%d", p)',
			'				}',
			'				return out',
			'			}},',
			'		{"learned Q sits on Bellman-optimal truth: Q(14,R) Q(8,R) Q(8,D) Q(0,D), and terminal rows stay 0.00",',
			'			"9.98 5.72 2.00 3.21 0.00",',
			'			func() string {',
			'				q := Train(400, 0.5, 0.95, 0.4, 42)',
			'				return fmt.Sprintf("%.2f %.2f %.2f %.2f %.2f",',
			'					q[14][3], q[8][3], q[8][1], q[0][1], q[15][0])',
			'			}},',
			'		{"gamma is the horizon: at (2,0) gamma=0.5 dives down to the +2 snack, gamma=0.95 turns right for the +10 goal",',
			'			"1 3",',
			'			func() string {',
			'				q05 := Train(400, 0.5, 0.5, 0.4, 42)',
			'				q95 := Train(400, 0.5, 0.95, 0.4, 42)',
			'				return fmt.Sprintf("%d %d", Policy(q05)[8], Policy(q95)[8])',
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
			'// Step is the entire environment: a pure function from (state, action)',
			'// to (next state, reward, done). Everything the agent will ever know',
			'// about the world arrives through these three values — Q-learning',
			'// never sees the grid, only the stream of transitions.',
			'func Step(s, a int) (int, float64, bool) {',
			'	row := s / 4',
			'	col := s % 4',
			'	switch a {',
			'	case 0:',
			'		row--',
			'	case 1:',
			'		row++',
			'	case 2:',
			'		col--',
			'	case 3:',
			'		col++',
			'	}',
			'	// Walls: an off-grid move is a no-op that still burns the step',
			'	// cost. Returning s (not clamping coordinates) keeps the agent',
			'	// exactly where it stood.',
			'	if row < 0 || row > 3 || col < 0 || col > 3 {',
			'		return s, -1.0, false',
			'	}',
			'	next := row*4 + col',
			'	// Terminal rewards REPLACE the step cost: the episode ends on the',
			'	// transition INTO the cell, so no action is ever taken from a',
			'	// terminal state and its Q row stays zero forever.',
			'	switch next {',
			'	case 15:',
			'		return next, 10.0, true',
			'	case 7:',
			'		return next, -10.0, true',
			'	case 12:',
			'		return next, 2.0, true',
			'	}',
			'	return next, -1.0, false',
			'}',
			'',
			'// NextU is a Lehmer-style LCG with the classic Numerical Recipes',
			'// constants. uint32 arithmetic wraps mod 2^32 for free, and dividing',
			'// by 2^32 maps the state onto [0,1). Threading the state explicitly',
			'// (instead of hiding it in a package var) is what makes every',
			'// training run reproducible bit for bit.',
			'func NextU(state uint32) (uint32, float64) {',
			'	next := state*1664525 + 1013904223',
			'	return next, float64(next) / 4294967296.0',
			'}',
			'',
			'// QUpdate is the Bellman update — the single line all of tabular RL',
			'// rests on. The target bootstraps: reward now plus the discounted',
			'// value of the BEST next action (that max is what makes Q-learning',
			'// off-policy). When done, there is no future, so the (1-done) factor',
			'// from the textbook formula appears here as the if.',
			'func QUpdate(q [][]float64, s, a int, r float64, sNext int, alpha, gamma float64, done bool) float64 {',
			'	target := r',
			'	if !done {',
			'		best := q[sNext][0]',
			'		for _, v := range q[sNext][1:] {',
			'			if v > best {',
			'				best = v',
			'			}',
			'		}',
			'		target += gamma * best',
			'	}',
			'	// Move a fraction alpha of the way to the target: an exponential',
			'	// moving average over noisy targets. alpha=1 would trust each',
			'	// sample completely; small alpha averages out stochasticity.',
			'	q[s][a] += alpha * (target - q[s][a])',
			'	return q[s][a]',
			'}',
			'',
			'// EpsilonGreedy consumes two pre-drawn uniforms so the caller owns',
			'// the RNG stream: u1 gates explore-vs-exploit, u2 picks the random',
			'// action. int(u2*4) partitions [0,1) into four equal buckets; the',
			'// clamp guards the (impossible for u2<1, but cheap) edge u2*4 == 4.',
			'func EpsilonGreedy(q [][]float64, s int, eps, u1, u2 float64) int {',
			'	if u1 < eps {',
			'		a := int(u2 * 4)',
			'		if a > 3 {',
			'			a = 3',
			'		}',
			'		return a',
			'	}',
			'	// Strict > keeps the FIRST maximum, giving the documented',
			'	// lowest-index tie-break.',
			'	best := 0',
			'	for a := 1; a < 4; a++ {',
			'		if q[s][a] > q[s][best] {',
			'			best = a',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
			'// Train is the canonical Q-learning loop. Note what it is NOT: no',
			'// model of the world, no planning, no episode memory — just one',
			'// table updated one transition at a time. The 50-step cap bounds',
			'// early episodes that wander before the table knows anything.',
			'func Train(episodes int, alpha, gamma, eps float64, seed uint32) [][]float64 {',
			'	q := make([][]float64, 16)',
			'	for i := range q {',
			'		q[i] = make([]float64, 4)',
			'	}',
			'	// One RNG stream across ALL episodes: episode boundaries do not',
			'	// reset exploration, which is exactly how a live agent behaves.',
			'	rng := seed',
			'	for ep := 0; ep < episodes; ep++ {',
			'		s := 0',
			'		for step := 0; step < 50; step++ {',
			'			// Both uniforms are drawn every step — even when the',
			'			// exploit branch never looks at u2 — so the stream',
			'			// position depends only on the step count, not on',
			'			// which branch ran. Conditional draws would make the',
			'			// trajectory unpinnable.',
			'			var u1, u2 float64',
			'			rng, u1 = NextU(rng)',
			'			rng, u2 = NextU(rng)',
			'			a := EpsilonGreedy(q, s, eps, u1, u2)',
			'			sNext, r, done := Step(s, a)',
			'			QUpdate(q, s, a, r, sNext, alpha, gamma, done)',
			'			s = sNext',
			'			if done {',
			'				break',
			'			}',
			'		}',
			'	}',
			'	return q',
			'}',
			'',
			'// Policy collapses the table to a deterministic controller: the',
			'// greedy action per state. This is the artifact you ship — the Q',
			'// numbers themselves exist only to produce these argmaxes.',
			'func Policy(q [][]float64) []int {',
			'	p := make([]int, len(q))',
			'	for s := range q {',
			'		best := 0',
			'		for a := 1; a < 4; a++ {',
			'			if q[s][a] > q[s][best] {',
			'				best = a',
			'			}',
			'		}',
			'		p[s] = best',
			'	}',
			'	return p',
			'}',
			'',
			'// GreedyPath rolls the greedy policy forward from the start — pure',
			'// evaluation, no learning, no exploration. The maxSteps cap matters:',
			'// a half-trained table can send the greedy agent into a wall loop,',
			'// and evaluation must terminate anyway.',
			'func GreedyPath(q [][]float64, maxSteps int) []int {',
			'	path := []int{0}',
			'	s := 0',
			'	for i := 0; i < maxSteps; i++ {',
			'		if s == 12 || s == 7 || s == 15 {',
			'			break',
			'		}',
			'		a := 0',
			'		for c := 1; c < 4; c++ {',
			'			if q[s][c] > q[s][a] {',
			'				a = c',
			'			}',
			'		}',
			'		sNext, _, _ := Step(s, a)',
			'		path = append(path, sNext)',
			'		s = sNext',
			'	}',
			'	return path',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Reading the finished table</h3>' +
			'<p>The pinned Q-values are not arbitrary — they sit on the ' +
			'<em>Bellman-optimal</em> truth you could compute with dynamic ' +
			'programming. Q(0,down)=3.21 is exactly ' +
			'−(1+γ+γ²+γ³+γ⁴)+10γ⁵ at γ=0.95: five more −1 steps, then +10. ' +
			'Q(8,right)=5.72 is the same sum three steps from the goal, and ' +
			'Q(8,down)=2.00 is the snack, learned to convergence because the ' +
			'terminal target has no bootstrap term to chase. That is the quiet ' +
			'magic of temporal-difference learning: value flows backward from the ' +
			'goal one transition at a time, episode after episode, until the whole ' +
			'table agrees with itself. And the γ pair case is worth internalizing: ' +
			'γ sets the effective horizon (roughly 1/(1−γ) steps — 20 at 0.95, 2 at ' +
			'0.5). Discounting is not a numerical nicety; it is a statement about ' +
			'how far into the future this agent is allowed to care.</p>' +
			'<h3>Off-policy, and why DQN exists</h3>' +
			'<p>The <code>max</code> in the target makes Q-learning ' +
			'<strong>off-policy</strong>: it evaluates the greedy policy while ' +
			'behaving ε-greedily. Its on-policy sibling SARSA uses the action ' +
			'actually taken next — on the classic cliff-walking grid SARSA learns ' +
			'the safe path away from the edge (because its values account for its ' +
			'own exploration stumbles) while Q-learning learns the optimal but ' +
			'risky one. Off-policy is also the license behind <strong>DQN</strong> ' +
			'(DeepMind, Atari 2013): replace the 16×4 table with a neural network ' +
			'Q(s,·;w), train on transitions replayed from a buffer of old ' +
			'experience (legal precisely because the update never asks who chose ' +
			'the action), and stabilize the moving bootstrap target with a frozen ' +
			'<em>target network</em>. Every piece of that system is a scaled-up ' +
			'version of a line you just wrote — the replay buffer feeds ' +
			'<code>QUpdate</code>, the target network is the ' +
			'<code>gamma*maxQ(sNext)</code> term, and ε-greedy survives verbatim.</p>' +
			'<h3>Reward design is where RL projects die</h3>' +
			'<p>The +2 snack is a toy version of a real failure mode: an agent that ' +
			'maximizes the reward you <em>wrote</em>, not the behavior you ' +
			'<em>meant</em>. The classic public example is the CoastRunners boat ' +
			'endlessly circling three power-ups instead of finishing the race. ' +
			'Shaping rewards to speed up learning is legitimate but delicate — ' +
			'potential-based shaping (adding γΦ(s′)−Φ(s)) is the provably-safe form ' +
			'that cannot change the optimal policy, and almost anything else can. ' +
			'Note also that our zero-initialized table with −1 step costs is ' +
			'accidentally <em>optimistic</em>: untried actions look better (0) than ' +
			'tried ones (negative), so the agent systematically sweeps the grid ' +
			'early. Optimistic initialization is a real exploration technique, and ' +
			'its cousins — decaying ε, UCB bonuses, curiosity — are what you reach ' +
			'for when ε-greedy stalls. In interviews, the checklist is: Bellman ' +
			'update from memory, on- vs off-policy, what γ controls, and why ' +
			'exploration cannot be greedy from step one.</p>',
		],
		complexity: { time: 'O(episodes × steps) — each env step scans 4 actions and touches one Q cell', space: 'O(|S| × |A|) — the 16×4 table' },
	});
})();
