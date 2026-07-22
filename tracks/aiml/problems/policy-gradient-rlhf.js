/* Policy Gradients & RLHF — Applied AI & RL (Hard). REINFORCE over a softmax
 * policy on pinned episode data: the score function (1[a=i] − p_i), the
 * baseline trick, mode collapse on a fixed batch (the reason RLHF carries a
 * KL leash), and the Bradley-Terry preference probability that reward models
 * are trained on. Episodes are supplied as data, so every number pins.
 */
(function () {
	'use strict';
	var T = GoLearnAIML;

	// The RLHF pipeline, with the two pieces this item implements starred.
	// Ids namespaced AIPG — all tracks share the page's SVG id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 205" width="520" height="205" role="img" aria-label="RLHF pipeline: an SFT policy produces answer pairs, a human picks the better one, a reward model is fit with the Bradley-Terry sigmoid, and a policy-gradient update pushes the policy toward high reward while a KL leash holds it near the reference model">' +
		'<text x="16" y="20" class="lbl">the RLHF loop — this item builds the two starred pieces</text>' +
		'<rect x="20" y="32" width="120" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="80" y="56" text-anchor="middle">SFT policy</text>' +
		'<rect x="185" y="32" width="130" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="250" y="56" text-anchor="middle">answer pairs (A,B)</text>' +
		'<rect x="360" y="32" width="140" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<text x="430" y="56" text-anchor="middle">human: A &#8827; B</text>' +
		'<path d="M140 52 L180 52" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIPG)"/>' +
		'<path d="M315 52 L355 52" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIPG)"/>' +
		'<rect x="95" y="125" width="175" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="182" y="149" text-anchor="middle">&#9733; reward model &#963;(r&#8320;&#8722;r&#8321;)</text>' +
		'<rect x="325" y="125" width="175" height="40" rx="5" fill="none" stroke="var(--accent)" stroke-width="2"/>' +
		'<text x="412" y="149" text-anchor="middle">&#9733; &#952; += lr&#183;adv&#183;&#8711;log&#960;(a)</text>' +
		'<path d="M430 72 L430 90 L182 90 L182 120" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIPG)"/>' +
		'<path d="M270 145 L320 145" fill="none" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowAIPG)"/>' +
		'<path d="M412 125 C 360 98 130 110 84 76" fill="none" stroke="var(--warn)" stroke-width="1.6" stroke-dasharray="5 3" marker-end="url(#dgArrowAIPGw)"/>' +
		'<text x="258" y="115" text-anchor="middle" class="lbl" style="fill:var(--warn)">KL leash: stay near the reference</text>' +
		'<text x="16" y="192" class="lbl">REINFORCE (this item) is the raw form of the update — PPO adds clipping and a critic on top</text>' +
		'<defs>' +
		'<marker id="dgArrowAIPG" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'<marker id="dgArrowAIPGw" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="var(--warn)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'policy-gradient-rlhf',
		title: 'Policy Gradients & RLHF',
		nav: 'policy gradient',
		difficulty: 'Hard',
		category: 'Applied AI & Reinforcement Learning',
		task: 'Implement REINFORCE for a softmax policy — probs, the score function, the baseline-corrected batch update — plus the Bradley-Terry preference probability behind reward models.',

		prose: [
			'<h2>Policy Gradients &amp; RLHF</h2>' +
			'<p>Your support chatbot has three reply styles: <strong>0</strong> a ' +
			'canned template, <strong>1</strong> a concise answer with citations, ' +
			'<strong>2</strong> a long speculative essay. Nobody labels individual ' +
			'turns; all you get is a thumbs rating at the end of each chat. ' +
			'Q-learning wanted a value per state-action — but here the natural ' +
			'object is the <em>policy itself</em>: a probability distribution over ' +
			'actions, nudged directly toward whatever earned praise. That is a ' +
			'<strong>policy gradient</strong>, and it is the algorithmic core of ' +
			'RLHF — the technique that turned raw language models into ' +
			'assistants.</p>' +
			'<p>The policy is a softmax over parameters θ (one score per action — ' +
			'a stateless bandit policy; a real LLM computes these logits from the ' +
			'whole conversation with a transformer, but the update rule is ' +
			'identical). <strong>REINFORCE</strong> says: increase the log-probability ' +
			'of every action taken, in proportion to how good the episode turned ' +
			'out. All the calculus you need is the softmax score function:</p>',
			{ lang: 'txt', code: '∇θ log π(a):  1 at the chosen action, minus the probs everywhere\n  θ=(0,0,0) → p = (0.3333, 0.3333, 0.3333)\n  ∇ log π(1) = (0,1,0) − p = (−0.3333, 0.6667, −0.3333)\npush every action of an episode by its advantage:\n  θ += lr · (R − baseline) · ∇ log π(a)\n  R=+3, baseline=0.5, lr=0.1  →  Δθ = (−0.0833, 0.1667, −0.0833)' },
			'<p>Two refinements carry the whole field. First, the ' +
			'<strong>baseline</strong>: subtracting a constant b from every return ' +
			'leaves the expected gradient unchanged — because the score-function ' +
			'components always sum to zero, b·Σᵢ(1[a=i]−pᵢ) = 0 — but it slashes ' +
			'variance. Second, the <strong>preference probability</strong>. Humans ' +
			'cannot emit calibrated scalar rewards, but they can compare two ' +
			'answers; the <strong>Bradley-Terry</strong> model turns hidden scores ' +
			'into a choice probability, P(A ≻ B) = σ(r_A − r_B), and fitting r to ' +
			'thousands of human picks is exactly how reward models are trained.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>PolicyProbs</code> (softmax with max-subtraction — ' +
			'logits in the thousands must not overflow <code>exp</code>), ' +
			'<code>GradLogProb</code> (the score function), ' +
			'<code>ReinforceUpdate</code> (one batch update over supplied episodes ' +
			'— real REINFORCE <em>samples</em> them from the live policy; pinning ' +
			'them as data is what makes every answer exact), and ' +
			'<code>PrefProb</code>. One reward per episode, no per-step ' +
			'discounting: the chat is rated once, at the end.</p>' +
			'<div class="tip">The sum-to-zero identity is the deep one: it is why ' +
			'the baseline is statistically free, and its expectation form ' +
			'E[∇log π] = 0 is why REINFORCE is unbiased — the policy only moves ' +
			'because rewards <em>weight</em> the scores asymmetrically. When an ' +
			'update looks wrong, check this invariant first.</div>',
		],

		starter: [
			'package main',
			'',
			'// A stateless softmax policy over K=3 actions, parameterized by',
			'// theta (one logit per action): pi(a) = exp(theta[a]) / sum_i',
			'// exp(theta[i]).',
			'',
			'// PolicyProbs returns the softmax of theta as a NEW slice.',
			'// Subtract max(theta) from every logit before exponentiating:',
			'// softmax is shift-invariant, and without the subtraction logits in',
			'// the thousands overflow exp() into +Inf and the probs turn NaN.',
			'func PolicyProbs(theta []float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// GradLogProb returns the gradient of log pi(action) w.r.t. theta',
			'// as a NEW slice — the softmax score function:',
			'//',
			'//	grad[i] = 1 - p[i]   if i == action',
			'//	grad[i] =   - p[i]   otherwise',
			'//',
			'// Its components always sum to 0 (the probabilities sum to 1).',
			'func GradLogProb(theta []float64, action int) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// ReinforceUpdate applies ONE batch REINFORCE step and returns the',
			'// new theta as a NEW slice (the input must not be mutated).',
			'//',
			'// episodes[e] is the action sequence of episode e; rewards[e] is its',
			'// single end-of-episode return (no per-step discounting). Compute',
			'// the whole gradient at the INPUT theta, then apply it once:',
			'//',
			'//	g[i] = sum_e (rewards[e]-baseline) * sum_t gradLogProb(theta, a_t)[i]',
			'//	next[i] = theta[i] + lr * g[i]',
			'//',
			'// (Real REINFORCE samples the episodes from the current policy;',
			'// here they arrive as pinned data so every number is exact.)',
			'func ReinforceUpdate(theta []float64, episodes [][]int, rewards []float64, lr, baseline float64) []float64 {',
			'	// your code here',
			'	return nil',
			'}',
			'',
			'// PrefProb is the Bradley-Terry preference probability: given hidden',
			'// quality scores rA and rB, the chance a rater picks A over B is',
			'//',
			'//	P(A beats B) = 1 / (1 + exp(-(rA-rB)))    // sigmoid(rA-rB)',
			'//',
			'// This is the primitive reward models are trained on.',
			'func PrefProb(rA, rB float64) float64 {',
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
			'	"math"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	// f4 renders a vector as space-joined %.4f — float comparisons in',
			'	// this track are always string comparisons at fixed precision.',
			'	f4 := func(xs []float64) string {',
			'		out := ""',
			'		for i, v := range xs {',
			'			if i > 0 {',
			'				out += " "',
			'			}',
			'			out += fmt.Sprintf("%.4f", v)',
			'		}',
			'		return out',
			'	}',
			'',
			'	// Four rated chat transcripts (styles: 0 template, 1 concise+cited,',
			'	// 2 rambling essay). Style 1 keeps landing in praised chats.',
			'	episodes := [][]int{{1, 1}, {0}, {2, 1}, {2, 2}}',
			'	rewards := []float64{3, -1, 2, -2}',
			'',
			'	type tc struct {',
			'		name string',
			'		want string',
			'		got  func() string',
			'	}',
			'	cases := []tc{',
			'		{"a fresh policy is agnostic: theta=0 gives uniform probabilities",',
			'			"0.3333 0.3333 0.3333",',
			'			func() string { return f4(PolicyProbs([]float64{0, 0, 0})) }},',
			'		{"worked softmax at theta=(1,2,0)",',
			'			"0.2447 0.6652 0.0900",',
			'			func() string { return f4(PolicyProbs([]float64{1, 2, 0})) }},',
			'		{"max-subtraction: logits in the thousands must not overflow exp — softmax is shift-invariant",',
			'			"0.2119 0.5761 0.2119 shift-invariant=true",',
			'			func() string {',
			'				big := f4(PolicyProbs([]float64{1000, 1001, 1000}))',
			'				small := f4(PolicyProbs([]float64{0, 1, 0}))',
			'				return fmt.Sprintf("%s shift-invariant=%v", big, big == small)',
			'			}},',
			'		{"score function at theta=0, action 1: +1 at the action, minus p everywhere — components sum to 0",',
			'			"-0.3333 0.6667 -0.3333 sum0=true",',
			'			func() string {',
			'				g1 := f4(GradLogProb([]float64{0, 0, 0}, 1))',
			'				g2 := GradLogProb([]float64{0.7, -0.2, 0.4}, 2)',
			'				sum := g2[0] + g2[1] + g2[2]',
			'				return fmt.Sprintf("%s sum0=%v", g1, math.Abs(sum) < 1e-9)',
			'			}},',
			'		{"one REINFORCE update (baseline 0): theta moves toward the praised style, input untouched",',
			'			"new=-0.2667 0.6333 -0.3667 input=0.0000 0.0000 0.0000",',
			'			func() string {',
			'				theta := []float64{0, 0, 0}',
			'				next := ReinforceUpdate(theta, episodes, rewards, 0.1, 0)',
			'				return fmt.Sprintf("new=%s input=%s", f4(next), f4(theta))',
			'			}},',
			'		{"a baseline changes variance, not direction: theta[1] after one update, b=0 vs b=mean(R)=0.5",',
			'			"0.6333 0.6000 same-direction=true",',
			'			func() string {',
			'				t0 := ReinforceUpdate([]float64{0, 0, 0}, episodes, rewards, 0.1, 0)',
			'				tb := ReinforceUpdate([]float64{0, 0, 0}, episodes, rewards, 0.1, 0.5)',
			'				return fmt.Sprintf("%.4f %.4f same-direction=%v",',
			'					t0[1], tb[1], (t0[1] > 0) == (tb[1] > 0))',
			'			}},',
			'		{"on a FIXED batch the policy collapses to determinism: probs after 3 then 60 updates — why RLHF adds a KL leash",',
			'			"0.0892 0.8611 0.0497 -> 0.0000 1.0000 0.0000",',
			'			func() string {',
			'				theta := []float64{0, 0, 0}',
			'				after3 := ""',
			'				for i := 0; i < 60; i++ {',
			'					theta = ReinforceUpdate(theta, episodes, rewards, 0.1, 0.5)',
			'					if i == 2 {',
			'						after3 = f4(PolicyProbs(theta))',
			'					}',
			'				}',
			'				return after3 + " -> " + f4(PolicyProbs(theta))',
			'			}},',
			'		{"Bradley-Terry: equal scores toss a coin, a 1.5 gap gives 82%, and P(A,B)+P(B,A)=1",',
			'			"0.5000 0.8176 0.1824 sum=1.0000",',
			'			func() string {',
			'				pAB := PrefProb(1.2, -0.3)',
			'				pBA := PrefProb(-0.3, 1.2)',
			'				return fmt.Sprintf("%.4f %.4f %.4f sum=%.4f",',
			'					PrefProb(0, 0), pAB, pBA, pAB+pBA)',
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
			'// PolicyProbs is softmax with the max-subtraction trick. Softmax is',
			'// shift-invariant — exp(x-c)/sum exp(xi-c) cancels the c — so',
			'// subtracting the max costs nothing mathematically and guarantees',
			'// every exponent is <= 0: exp never overflows, the largest term is',
			'// exactly 1, and the sum is always >= 1 (no division by zero).',
			'// Every serious framework (PyTorch log_softmax included) does this.',
			'func PolicyProbs(theta []float64) []float64 {',
			'	maxLogit := theta[0]',
			'	for _, v := range theta[1:] {',
			'		if v > maxLogit {',
			'			maxLogit = v',
			'		}',
			'	}',
			'	probs := make([]float64, len(theta))',
			'	sum := 0.0',
			'	for i, v := range theta {',
			'		probs[i] = math.Exp(v - maxLogit)',
			'		sum += probs[i]',
			'	}',
			'	for i := range probs {',
			'		probs[i] /= sum',
			'	}',
			'	return probs',
			'}',
			'',
			'// GradLogProb is the softmax score function. Derivation in one line:',
			'// log pi(a) = theta[a] - log sum_i exp(theta[i]), and the derivative',
			'// of the log-sum-exp w.r.t. theta[i] is exactly p[i] — so the',
			'// gradient is the one-hot of the action minus the full prob vector.',
			'// The components sum to zero, which is what makes any constant',
			'// baseline expectation-free.',
			'func GradLogProb(theta []float64, action int) []float64 {',
			'	probs := PolicyProbs(theta)',
			'	grad := make([]float64, len(theta))',
			'	for i := range grad {',
			'		grad[i] = -probs[i]',
			'	}',
			'	grad[action] += 1.0',
			'	return grad',
			'}',
			'',
			'// ReinforceUpdate is one batch step of vanilla REINFORCE with a',
			'// baseline. Design choices that matter:',
			'//   - the gradient is computed entirely at the INPUT theta (a true',
			'//     batch gradient), then applied once — updating theta mid-batch',
			'//     would make the result depend on episode order;',
			'//   - the advantage (reward - baseline) multiplies EVERY action of',
			'//     the episode identically: with one terminal reward and no',
			'//     discounting, each action gets equal credit — the crudest',
			'//     possible credit assignment, and exactly what makes REINFORCE',
			'//     high-variance;',
			'//   - a fresh slice is returned so callers can diff old vs new.',
			'func ReinforceUpdate(theta []float64, episodes [][]int, rewards []float64, lr, baseline float64) []float64 {',
			'	grad := make([]float64, len(theta))',
			'	for e, ep := range episodes {',
			'		advantage := rewards[e] - baseline',
			'		for _, a := range ep {',
			'			g := GradLogProb(theta, a)',
			'			for i := range grad {',
			'				grad[i] += advantage * g[i]',
			'			}',
			'		}',
			'	}',
			'	next := make([]float64, len(theta))',
			'	for i := range theta {',
			'		next[i] = theta[i] + lr*grad[i]',
			'	}',
			'	return next',
			'}',
			'',
			'// PrefProb is the Bradley-Terry model (1952): hidden per-item scores,',
			'// observed pairwise choices, sigmoid of the score gap. Reward-model',
			'// training maximizes log PrefProb(chosen, rejected) over human',
			'// comparison data — this one-liner is the loss primitive underneath',
			'// every RLHF reward model. Note exp(-(rA-rB)) never overflows for',
			'// sane score gaps, and the sigmoid saturates gracefully either way.',
			'func PrefProb(rA, rB float64) float64 {',
			'	return 1.0 / (1.0 + math.Exp(-(rA-rB)))',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The full RLHF recipe</h3>' +
			'<p>What you built maps piece for piece onto the InstructGPT/ChatGPT ' +
			'pipeline. <strong>Step 1 — SFT</strong>: fine-tune a pretrained LM on ' +
			'demonstrations (plain supervised learning; no RL yet). <strong>Step 2 ' +
			'— reward model</strong>: show humans pairs of model answers, record ' +
			'which they prefer, and fit a scalar scorer r(prompt, answer) by ' +
			'maximizing log σ(r_chosen − r_rejected) — literally the log of your ' +
			'<code>PrefProb</code>, summed over a few hundred thousand comparisons. ' +
			'Bradley-Terry (1952) predates RLHF by seventy years; it is the same ' +
			'model behind chess Elo, and it is how the industry converts unreliable ' +
			'human judgment into a differentiable training signal. <strong>Step 3 — ' +
			'RL</strong>: generate answers with the current policy, score them with ' +
			'the reward model, and push log-probabilities by advantage — your ' +
			'<code>ReinforceUpdate</code>, with the LLM as the policy network and ' +
			'per-token log-probs in place of the 3-vector.</p>' +
			'<h3>Why the KL leash exists</h3>' +
			'<p>Your collapse case is the warning in miniature: optimizing a fixed ' +
			'reward signal drives the policy to a deterministic point ' +
			'(probs → 0/1/0), and a real reward model is only trustworthy ' +
			'<em>near the data it was trained on</em>. Push past that neighborhood ' +
			'and the policy finds the scorer&rsquo;s bugs instead of quality — ' +
			'reward hacking: ever-longer answers because length correlated with ' +
			'preference, confident sycophancy because raters rewarded agreement. ' +
			'Goodhart&rsquo;s law, operationalized. Production RLHF therefore adds a ' +
			'per-token KL penalty against the frozen SFT reference — reward − ' +
			'β·KL(π‖π_ref) — an explicit leash that keeps generations ' +
			'on-distribution. When you read that a model was &ldquo;over-optimized ' +
			'against its reward model,&rdquo; this is the failure, and the fix is a ' +
			'bigger β or earlier stopping.</p>' +
			'<h3>From REINFORCE to PPO to DPO</h3>' +
			'<p>REINFORCE is unbiased but noisy: one scalar reward smeared equally ' +
			'over every action of an episode is the crudest credit assignment ' +
			'possible. The fixes, in order of sophistication: a constant baseline ' +
			'(your case — free variance reduction because Σᵢ(1[a=i]−pᵢ)=0); a ' +
			'<em>learned</em> state-dependent baseline, i.e. a critic, giving ' +
			'actor-critic methods and GAE for per-step advantages; and ' +
			'<strong>PPO</strong>, which additionally clips the policy ratio ' +
			'π_new/π_old per token so that a batch can be reused for several ' +
			'epochs without the update running away — named here, not implemented: ' +
			'what you wrote is the gradient PPO clips. <strong>DPO</strong> (2023) ' +
			'then collapsed the whole pipeline for the preference case: a ' +
			'closed-form loss on preference pairs whose optimum provably matches ' +
			'the KL-leashed RLHF objective — no reward model, no sampling loop. ' +
			'Interview checklist: derive 1[a=i]−p_i from log-softmax, explain why ' +
			'a baseline is unbiased, state what PPO clips and why the KL term ' +
			'exists, and know when DPO is the pragmatic choice.</p>',
		],
		complexity: { time: 'O(updates × Σ|episode| × K) — each action taken contributes one K-vector to the batch gradient', space: 'O(K) — probs, gradient, and θ' },
	});
})();
