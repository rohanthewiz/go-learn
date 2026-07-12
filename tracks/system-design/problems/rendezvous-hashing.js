/* Rendezvous Hashing — Partitioning (Medium). Highest-Random-Weight: every
 * key scores every node and the top score wins — minimal disruption with no
 * ring, no vnodes, no sorted state. Property-based harness: exact key→node
 * assignments depend on hash values, so the tests assert the guarantees —
 * validity, determinism, balance, and single-node blast radius.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 180" width="500" height="180" role="img" aria-label="rendezvous hashing: the key scores every node and the highest score wins">' +
		'<text x="30" y="30" class="lbl">Owner("user:17", nodes)</text>' +
		'<text x="30" y="52">"user:17"</text>' +
		// node score boxes
		'<rect x="220" y="20" width="180" height="24" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="220" y="52" width="180" height="24" rx="4" fill="var(--ok)" fill-opacity="0.18" stroke="var(--ok)" stroke-width="1.8"/>' +
		'<rect x="220" y="84" width="180" height="24" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<rect x="220" y="116" width="180" height="24" rx="4" fill="none" stroke="var(--edge)"/>' +
		'<text x="230" y="37">alpha</text><text x="392" y="37" text-anchor="end" class="lbl">score 41c9…</text>' +
		'<text x="230" y="69">bravo</text><text x="392" y="69" text-anchor="end" class="lbl">score f03a… ★ max</text>' +
		'<text x="230" y="101">charlie</text><text x="392" y="101" text-anchor="end" class="lbl">score 88d1…</text>' +
		'<text x="230" y="133">delta</text><text x="392" y="133" text-anchor="end" class="lbl">score 2b57…</text>' +
		// arrows from key to each node score
		'<path d="M 110 48 C 160 34 185 32 214 32" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowRVH)"/>' +
		'<path d="M 110 52 C 160 56 185 62 214 64" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowRVH)"/>' +
		'<path d="M 110 56 C 160 76 185 92 214 96" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowRVH)"/>' +
		'<path d="M 110 60 C 160 96 185 124 214 128" fill="none" stroke="var(--accent)" stroke-width="1.5" marker-end="url(#dgArrowRVH)"/>' +
		'<text x="120" y="90" class="lbl">fnv1a(node + "|" + key)</text>' +
		'<text x="30" y="166" class="lbl">remove bravo: only bravo’s keys re-run the contest — every other key’s max is unchanged</text>' +
		'<defs><marker id="dgArrowRVH" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'rendezvous-hashing',
		title: 'Rendezvous (HRW) Hashing',
		nav: 'Rendezvous Hashing',
		difficulty: 'Medium',
		category: 'Partitioning',
		task: 'Implement Owner: score every node for the key, highest score wins.',

		prose: [
			'<h2>Rendezvous (Highest-Random-Weight) Hashing</h2>' +
			'<p>Consistent hashing solved the <code>hash % n</code> reshuffling disaster with a ' +
			'ring — but the ring costs you: virtual nodes to fix balance, a sorted structure ' +
			'to maintain, binary search to look up. Rendezvous hashing gets the <em>same ' +
			'minimal-disruption guarantee</em> with no state at all: for each lookup, hash the ' +
			'key <em>together with every node</em> and pick the node with the highest score.</p>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>Owner(key, nodes)</code>:</p>' +
			'<ul>' +
			'<li>Each node’s score for the key is <code>fnv1a(node + "|" + key)</code> ' +
			'(the <code>fnv1a</code> helper is provided in the starter).</li>' +
			'<li>Return the node with the <strong>highest</strong> score.</li>' +
			'<li>On a score tie, the <strong>lexicographically smaller</strong> node name wins ' +
			'— every caller must agree on the owner, so ties need a deterministic rule.</li>' +
			'<li>Return <code>""</code> for an empty node list.</li>' +
			'</ul>' +
			'<p>Why this gives minimal disruption: a node’s score for a key never depends ' +
			'on which <em>other</em> nodes exist. Remove a node and only the keys whose ' +
			'<em>maximum</em> just vanished re-run the contest (they fall to their second-place ' +
			'node); every other key’s winner is untouched. Add a node and it can only ' +
			'<em>win</em> keys, never cause two old nodes to swap.</p>',
		],

		starter: [
			'package main',
			'',
			SD.FNV_HELPERS,
			'',
			'// Owner returns the node that owns key under highest-random-weight',
			'// hashing: the node maximizing fnv1a(node + "|" + key). Ties go to',
			'// the lexicographically smaller node name so that every caller,',
			'// on every machine, picks the same owner. Returns "" when nodes',
			'// is empty.',
			'func Owner(key string, nodes []string) string {',
			'	return "" // your code here',
			'}',
			'',
		].join('\n'),

		// Property harness: 300 keys across 5 nodes. The balance floor was
		// validated against the reference solution with native Go: the worst
		// node ("bravo") owns 40/300 keys, so the >=30 (10%) floor has margin
		// while still catching broken scoring. Disruption checks examine
		// EVERY key — that guarantee is exact, not statistical.
		harness: [
			'package main',
			'',
			'import (',
			'	"encoding/json"',
			'	"fmt"',
			'	"strconv"',
			')',
			'',
			SD.HARNESS_RT,
			'',
			'func main() {',
			'	nodes := []string{"alpha", "bravo", "charlie", "delta", "echo"}',
			'	keys := make([]string, 300)',
			'	for i := range keys {',
			'		keys[i] = "user:" + strconv.Itoa(i)',
			'	}',
			'	results := make([]map[string]any, 0, 5)',
			'	check := func(name string, body func() string) {',
			'		r := map[string]any{"input": name, "want": "ok"}',
			'		runCase(r, func() {',
			'			msg := body()',
			'			r["pass"] = msg == ""',
			'			if msg == "" {',
			'				msg = "ok"',
			'			}',
			'			r["got"] = msg',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	check("owner is always one of the given nodes", func() string {',
			'		valid := map[string]bool{}',
			'		for _, n := range nodes {',
			'			valid[n] = true',
			'		}',
			'		for _, k := range keys {',
			'			if o := Owner(k, append([]string(nil), nodes...)); !valid[o] {',
			'				return fmt.Sprintf("Owner(%q) = %q, not in the node list", k, o)',
			'			}',
			'		}',
			'		return ""',
			'	})',
			'',
			'	check("owners are deterministic across calls", func() string {',
			'		for _, k := range keys {',
			'			a := Owner(k, append([]string(nil), nodes...))',
			'			b := Owner(k, append([]string(nil), nodes...))',
			'			if a != b {',
			'				return fmt.Sprintf("Owner(%q) returned %q then %q", k, a, b)',
			'			}',
			'		}',
			'		return ""',
			'	})',
			'',
			'	check("balance: every node owns >= 10% of 300 keys", func() string {',
			'		counts := map[string]int{}',
			'		for _, k := range keys {',
			'			counts[Owner(k, nodes)]++',
			'		}',
			'		for _, n := range nodes {',
			'			if counts[n] < 30 {',
			'				return fmt.Sprintf("distribution %v — %s owns %d keys (< 30)", counts, n, counts[n])',
			'			}',
			'		}',
			'		return ""',
			'	})',
			'',
			'	check("removing a node relocates ONLY that node\'s keys (every key checked)", func() string {',
			'		rest := []string{"alpha", "charlie", "delta", "echo"} // bravo removed',
			'		for _, k := range keys {',
			'			before := Owner(k, nodes)',
			'			after := Owner(k, rest)',
			'			if after == "bravo" {',
			'				return fmt.Sprintf("Owner(%q) = bravo, but bravo is not in the list", k)',
			'			}',
			'			if before != "bravo" && after != before {',
			'				return fmt.Sprintf("%q moved %s→%s but was not on the removed node", k, before, after)',
			'			}',
			'		}',
			'		return ""',
			'	})',
			'',
			'	check("adding a node only steals keys (no key moves between old nodes)", func() string {',
			'		plus := []string{"alpha", "bravo", "charlie", "delta", "echo", "foxtrot"}',
			'		stolen := 0',
			'		for _, k := range keys {',
			'			before := Owner(k, nodes)',
			'			after := Owner(k, plus)',
			'			if after != before && after != "foxtrot" {',
			'				return fmt.Sprintf("%q moved %s→%s instead of to the new node", k, before, after)',
			'			}',
			'			if after == "foxtrot" {',
			'				stolen++',
			'			}',
			'		}',
			'		if stolen == 0 {',
			'			return "new node foxtrot won no keys — is it being scored?"',
			'		}',
			'		return ""',
			'	})',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			SD.FNV_HELPERS,
			'',
			'// Owner returns the highest-random-weight node for key. One linear',
			'// scan, no state: each node\'s score depends only on (node, key), so',
			'// membership changes can never perturb the scores of surviving',
			'// nodes — that independence IS the minimal-disruption guarantee.',
			'func Owner(key string, nodes []string) string {',
			'	best := ""',
			'	var bestScore uint32',
			'	for _, node := range nodes {',
			'		// The "|" separator keeps (node, key) pairs unambiguous:',
			'		// without it ("ab", "c") and ("a", "bc") would collide.',
			'		score := fnv1a(node + "|" + key)',
			'		switch {',
			'		case best == "":',
			'			// First candidate always seeds the running max — this also',
			'			// makes the empty-list case fall through to return "".',
			'			best, bestScore = node, score',
			'		case score > bestScore:',
			'			best, bestScore = node, score',
			'		case score == bestScore && node < best:',
			'			// Tie-break lexicographically so every caller agrees on the',
			'			// owner even in the (rare) event of a hash collision.',
			'			best = node',
			'		}',
			'	}',
			'	return best',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Brute force was already broken</h3>' +
			'<p><code>hash(key) % n</code> is O(1) and perfectly balanced — and reshuffles ' +
			'nearly every key when n changes. The fix in the ring problem was geometric: ' +
			'freeze key positions, move only ownership boundaries. Rendezvous hashing is the ' +
			'algebraic version of the same idea, and the general principle is worth naming: ' +
			'<strong>make each key’s placement a function of independent per-node scores, ' +
			'so membership changes only affect keys whose winning score appeared or ' +
			'disappeared</strong>.</p>',
			{ code: 'score := fnv1a(node + "|" + key) // depends ONLY on (node, key)\n// remove a node: other scores unchanged → only its keys re-run the max\n// add a node:   it can only WIN keys → old nodes never swap keys' },
			'<h3>Rendezvous vs the ring</h3>' +
			'<p>Both bound disruption to ~K/n keys. The trade is lookup cost against ' +
			'machinery:</p>' +
			'<ul>' +
			'<li><strong>Ring:</strong> O(log p) lookups after building a sorted structure, ' +
			'but you need 50–200 virtual nodes per server just to fix balance, plus careful ' +
			'add/remove code. Wins when n is large or lookups are extremely hot ' +
			'(DynamoDB/Cassandra-scale clusters).</li>' +
			'<li><strong>Rendezvous:</strong> O(n) per lookup, but zero state, trivially ' +
			'correct, and balanced by construction — every node has an equal chance of ' +
			'scoring highest, no vnodes needed. Wins when n is small-to-moderate: ' +
			'Kubernetes’ rendezvous-based service routing, cache-client sharding across a ' +
			'handful of memcached boxes, Ceph’s CRUSH ancestry.</li>' +
			'</ul>' +
			'<p>With 5–50 nodes, hashing n small strings is nanoseconds — the O(n) scan is ' +
			'cheaper than the ring’s pointer-chasing until n gets big. A bonus the ring ' +
			'can’t match cheaply: the <em>full score order</em> gives each key a natural ' +
			'replica list (top-2, top-3 nodes) with the same disruption bound per replica.</p>' +
			'<p>The interview phrase worth owning: <em>“HRW trades O(n) lookups for ' +
			'statelessness — same K/n disruption bound as the ring, no virtual nodes, and ' +
			'ties broken deterministically so all clients agree.”</em></p>',
		],
		complexity: { time: 'O(n) per lookup, n = nodes', space: 'O(1)' },
	});
})();
