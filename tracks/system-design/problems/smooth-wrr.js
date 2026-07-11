/* Smooth Weighted Round-Robin — Load Balancing (Medium). The nginx
 * algorithm: honor weights exactly while interleaving picks so heavy
 * servers don't get hammered in unbroken runs. Exact-table harness — the
 * pick sequence is deterministic and famous (5,1,1 → a a b a c a a).
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	SD.problem({
		id: 'smooth-wrr',
		title: 'Smooth Weighted Round-Robin',
		nav: 'Smooth Weighted RR',
		difficulty: 'Medium',
		category: 'Load Balancing',
		task: 'Implement Next using the smooth WRR algorithm — make all 4 tests pass.',

		prose: [
			'<h2>Smooth Weighted Round-Robin</h2>' +
			'<p>A load balancer with unequal backends — one big box, two small ones — ' +
			'should send more traffic to the big one. Weights express that: ' +
			'<code>a=5, b=1, c=1</code> means a takes 5 of every 7 requests.</p>' +
			'<p>The naive scheme (send 5 in a row to <code>a</code>, then one each to ' +
			'<code>b</code>, <code>c</code>) honors the ratio but produces ' +
			'<code>a a a a a b c</code> — a burst of 5 at one server, which is exactly the ' +
			'hot-spotting a balancer exists to prevent. Nginx’s <em>smooth</em> variant ' +
			'yields <code>a a b a c a a</code>: same totals, picks spread out.</p>' +
			'<h3>The algorithm</h3>' +
			'<p>Each server carries a running score, <code>current</code>, starting at 0. ' +
			'On every <code>Next()</code>:</p>' +
			'<ol>' +
			'<li>Add each server’s <code>weight</code> to its <code>current</code> ' +
			'(deserving servers accumulate claim).</li>' +
			'<li>Pick the server with the highest <code>current</code> ' +
			'(keep the first on ties — strict <code>&gt;</code> to beat the incumbent).</li>' +
			'<li>Subtract the <em>total</em> of all weights from the winner’s ' +
			'<code>current</code> (it spends its claim, sending it to the back of the moral queue).</li>' +
			'</ol>',
			{ code: 'weights a=5 b=1 c=1, total=7      current after step 1 → pick\ncall 1:  a=5  b=1  c=1   → a  (a: 5-7 = -2)\ncall 2:  a=3  b=2  c=2   → a  (a: 3-7 = -4)\ncall 3:  a=1  b=3  c=3   → b  (first max wins the tie)\ncall 4:  a=6  b=-4 c=3   → a  …and so on: a a b a c a a', lang: 'txt' },
			'<p>Over any window of <code>total</code> calls, each server is picked exactly ' +
			'<code>weight</code> times — the subtraction guarantees it — and the sum of all ' +
			'<code>current</code> values returns to zero after each full cycle.</p>',
		],

		starter: [
			'package main',
			'',
			'// server is one weighted backend. current is its running claim on',
			'// the next pick — the heart of the smooth algorithm.',
			'type server struct {',
			'	name    string',
			'	weight  int',
			'	current int',
			'}',
			'',
			'// Balancer picks servers in smooth weighted round-robin order:',
			'// exact weight proportions, maximally interleaved.',
			'type Balancer struct {',
			'	servers []*server',
			'}',
			'',
			'func NewBalancer() *Balancer {',
			'	return &Balancer{}',
			'}',
			'',
			'// Add registers a backend with the given weight (weight >= 1).',
			'func (b *Balancer) Add(name string, weight int) {',
			'	b.servers = append(b.servers, &server{name: name, weight: weight})',
			'}',
			'',
			'// Next returns the name of the server that should receive the next',
			'// request, or "" if no servers are registered.',
			'func (b *Balancer) Next() string {',
			'	if len(b.servers) == 0 {',
			'		return ""',
			'	}',
			'	return b.servers[0].name // your code here — this hammers server 0',
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
			SD.HARNESS_RT,
			'',
			'func main() {',
			'	type backend struct {',
			'		name   string',
			'		weight int',
			'	}',
			'	type tc struct {',
			'		name     string',
			'		backends []backend',
			'		calls    int',
			'		want     []string',
			'	}',
			'	cases := []tc{',
			'		{"a=5 b=1 c=1, 7 calls (the classic nginx sequence)",',
			'			[]backend{{"a", 5}, {"b", 1}, {"c", 1}}, 7,',
			'			[]string{"a", "a", "b", "a", "c", "a", "a"}},',
			'		{"equal weights degrade to plain round-robin",',
			'			[]backend{{"a", 1}, {"b", 1}, {"c", 1}}, 6,',
			'			[]string{"a", "b", "c", "a", "b", "c"}},',
			'		{"a=3 b=1, 4 calls — interleaved, not a a a b",',
			'			[]backend{{"a", 3}, {"b", 1}}, 4,',
			'			[]string{"a", "a", "b", "a"}},',
			'		{"single backend takes everything",',
			'			[]backend{{"solo", 7}}, 3,',
			'			[]string{"solo", "solo", "solo"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			b := NewBalancer()',
			'			for _, s := range c.backends {',
			'				b.Add(s.name, s.weight)',
			'			}',
			'			got := make([]string, 0, c.calls)',
			'			for i := 0; i < c.calls; i++ {',
			'				got = append(got, b.Next())',
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
			'// server is one weighted backend. current is its running claim on',
			'// the next pick — the heart of the smooth algorithm.',
			'type server struct {',
			'	name    string',
			'	weight  int',
			'	current int',
			'}',
			'',
			'// Balancer picks servers in smooth weighted round-robin order.',
			'type Balancer struct {',
			'	servers []*server',
			'}',
			'',
			'func NewBalancer() *Balancer {',
			'	return &Balancer{}',
			'}',
			'',
			'// Add registers a backend with the given weight (weight >= 1).',
			'func (b *Balancer) Add(name string, weight int) {',
			'	b.servers = append(b.servers, &server{name: name, weight: weight})',
			'}',
			'',
			'// Next implements nginx\'s smooth WRR. Invariant worth knowing: the',
			'// currents always sum to zero between calls (we add total across all',
			'// servers, then subtract total from one), which is why the pattern',
			'// repeats every `total` calls with each server picked `weight` times.',
			'func (b *Balancer) Next() string {',
			'	if len(b.servers) == 0 {',
			'		return ""',
			'	}',
			'	total := 0',
			'	var best *server',
			'	for _, s := range b.servers {',
			'		s.current += s.weight // every server accrues claim…',
			'		total += s.weight',
			'		// …and the largest claim wins. Strict > keeps the earliest',
			'		// max on ties, making the order deterministic.',
			'		if best == nil || s.current > best.current {',
			'			best = s',
			'		}',
			'	}',
			'	best.current -= total // the winner spends its claim',
			'	return best.name',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Why it comes out smooth</h3>' +
			'<p>Think of <code>current</code> as an account balance. Every round, each ' +
			'server earns its weight; the pick costs <code>total</code>. A weight-5 server ' +
			'earns back a pick’s cost in 7/5 rounds, a weight-1 server in 7 — so the heavy ' +
			'server wins often but must <em>re-earn</em> its turn each time, letting light ' +
			'servers through in between. Bursts can’t form because winning immediately ' +
			'pushes the winner’s balance <code>total</code> below its rivals.</p>',
			{ code: 's.current += s.weight        // earn\nif s.current > best.current { best = s }\nbest.current -= total        // spend' },
			'<p>Two exactness properties fall out of the arithmetic (not luck):</p>' +
			'<ul>' +
			'<li><strong>Exact proportions:</strong> over <code>total</code> consecutive calls, ' +
			'net change per server is <code>total×weight − picks×total</code>; the balances ' +
			'are bounded, so <code>picks = weight</code>. No drift, ever.</li>' +
			'<li><strong>Determinism:</strong> no randomness — a fleet of balancers with the ' +
			'same config produces the same schedule, which makes traffic reproducible in ' +
			'incident forensics.</li>' +
			'</ul>' +
			'<h3>Context</h3>' +
			'<p>This is nginx’s <code>upstream</code> default (added 2012) and shows up in ' +
			'LVS and Envoy variants. Alternatives trade different things: <em>random-two-choices</em> ' +
			'(pick two at random, take the less loaded) adapts to <em>actual</em> load rather ' +
			'than static weights; <em>consistent hashing</em> (previous exercise) pins clients ' +
			'to servers for cache affinity. Smooth WRR is the answer when weights are known ' +
			'and stability matters.</p>',
		],
		complexity: { time: 'O(n) per pick', space: 'O(n) servers' },
	});
})();
