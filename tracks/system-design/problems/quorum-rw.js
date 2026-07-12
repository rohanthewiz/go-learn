/* Quorum Reads & Writes — Replication & Consistency (Easy). The two
 * inequalities behind every "tunable consistency" dial (Dynamo, Cassandra),
 * plus the read-side resolution step that picks a winner from the replies.
 * Exact-table harness: quorum math and resolution are fully deterministic.
 */
(function () {
	'use strict';
	var SD = GoLearnSD;

	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 520 210" width="520" height="210" role="img" aria-label="read and write quorums overlapping on one replica">' +
		// five replicas, first three hold the new write v2
		'<circle cx="70" cy="95" r="18" fill="none" stroke="var(--accent)" stroke-width="1.8"/>' +
		'<circle cx="150" cy="95" r="18" fill="none" stroke="var(--accent)" stroke-width="1.8"/>' +
		'<circle cx="230" cy="95" r="18" fill="none" stroke="var(--ok)" stroke-width="2.4"/>' +
		'<circle cx="310" cy="95" r="18" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<circle cx="390" cy="95" r="18" fill="none" stroke="var(--edge)" stroke-width="1.6"/>' +
		'<text x="70" y="100" text-anchor="middle">v2</text>' +
		'<text x="150" y="100" text-anchor="middle">v2</text>' +
		'<text x="230" y="100" text-anchor="middle">v2</text>' +
		'<text x="310" y="100" text-anchor="middle" style="fill:var(--dim)">v1</text>' +
		'<text x="390" y="100" text-anchor="middle" style="fill:var(--dim)">v1</text>' +
		'<text x="70" y="135" text-anchor="middle" class="lbl">R1</text>' +
		'<text x="150" y="135" text-anchor="middle" class="lbl">R2</text>' +
		'<text x="230" y="135" text-anchor="middle" class="lbl">R3</text>' +
		'<text x="310" y="135" text-anchor="middle" class="lbl">R4</text>' +
		'<text x="390" y="135" text-anchor="middle" class="lbl">R5</text>' +
		// write quorum (R1..R3) and read quorum (R3..R5)
		'<rect x="40" y="60" width="220" height="70" rx="14" fill="none" stroke="var(--accent)" stroke-width="1.6"/>' +
		'<rect x="200" y="52" width="220" height="86" rx="14" fill="none" stroke="var(--ok)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="40" y="48" class="lbl" style="fill:var(--accent)">write v2 waited for w = 3 acks</text>' +
		'<text x="420" y="48" text-anchor="end" class="lbl" style="fill:var(--ok)">read collects r = 3 replies</text>' +
		// arrow onto the overlap replica
		'<path d="M 250 165 C 240 155 234 138 231 118" fill="none" stroke="var(--ok)" stroke-width="1.5" marker-end="url(#dgArrowQRW)"/>' +
		'<text x="258" y="176" class="lbl">R3 is in both quorums — the read cannot miss v2</text>' +
		'<text x="258" y="196" class="lbl">n=5, r=3, w=3:  r+w=6 &gt; 5  and  2w=6 &gt; 5</text>' +
		'<defs><marker id="dgArrowQRW" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker></defs>' +
		'</svg>';

	SD.problem({
		id: 'quorum-rw',
		title: 'Quorum Reads & Writes',
		nav: 'Quorum R/W',
		difficulty: 'Easy',
		category: 'Replication & Consistency',
		task: 'Implement StronglyConsistent and ResolveRead — make all 6 tests pass.',

		prose: [
			'<h2>Quorum Reads &amp; Writes</h2>' +
			'<p>A leaderless store replicates every key to <code>n</code> nodes. A write is ' +
			'acknowledged after <code>w</code> replicas accept it; a read fans out and waits ' +
			'for <code>r</code> replies. Dynamo-style databases expose <code>(n, r, w)</code> ' +
			'as a per-request dial — the question is which settings buy you ' +
			'<em>strong consistency</em>, meaning every read returns the latest completed write.</p>' +
			'<p>Two inequalities, each closing a different hole:</p>' +
			'<ul>' +
			'<li><code>r + w &gt; n</code> — <strong>reads overlap writes.</strong> By pigeonhole, ' +
			'any <code>r</code> replies must include at least one of the <code>w</code> replicas ' +
			'that acknowledged the newest write, so the new value is always somewhere in ' +
			'the reply set. Without it a read can land entirely on stale replicas.</li>' +
			'<li><code>2w &gt; n</code> — <strong>writes overlap writes.</strong> Two concurrent ' +
			'writes must share at least one replica, so they cannot both complete on ' +
			'disjoint node sets, each oblivious of the other; the shared replica sees both ' +
			'and orders their versions. Without it, two "successful" writes can conflict ' +
			'with no single node able to arbitrate.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<ul>' +
			'<li><code>StronglyConsistent(n, r, w)</code> — true iff <em>both</em> inequalities hold.</li>' +
			'<li><code>ResolveRead(replies)</code> — the overlap only guarantees the newest value ' +
			'is <em>somewhere</em> in the replies; this picks it. Highest <code>Version</code> ' +
			'wins; on a Version tie the lexicographically largest <code>Value</code> wins. ' +
			'The tie-break is admittedly arbitrary — it is a deterministic stand-in for ' +
			'last-write-wins. Real systems attach causality metadata instead of trusting one ' +
			'counter (see the <em>Vector Clocks</em> problem).</li>' +
			'</ul>',
			{ code: 'StronglyConsistent(3, 2, 2)  →  true    // the classic QUORUM/QUORUM\nStronglyConsistent(3, 1, 1)  →  false   // fast, but reads can miss writes\nResolveRead([]Reply{{"b", 2}, {"a", 1}})  →  "b"', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Reply is one replica\'s answer to a read: the value it holds and',
			'// the version counter attached when that value was written.',
			'type Reply struct {',
			'	Value   string',
			'	Version int',
			'}',
			'',
			'// StronglyConsistent reports whether an (n, r, w) configuration',
			'// guarantees that every read sees the latest completed write:',
			'//   r+w > n  — every read quorum intersects every write quorum',
			'//   2w  > n  — two write quorums always intersect (no disjoint writes)',
			'func StronglyConsistent(n, r, w int) bool {',
			'	return false // your code here',
			'}',
			'',
			'// ResolveRead picks the winning value from quorum read replies:',
			'// highest Version wins; on a Version tie the lexicographically',
			'// largest Value wins (a deterministic last-write-wins stand-in).',
			'func ResolveRead(replies []Reply) string {',
			'	return "" // your code here',
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
			SD.HARNESS_RT,
			'',
			'func main() {',
			'	results := make([]map[string]any, 0, 6)',
			'',
			'	// StronglyConsistent: exact truth table over the classic configs.',
			'	type qc struct {',
			'		name    string',
			'		n, r, w int',
			'		want    bool',
			'	}',
			'	qcs := []qc{',
			'		{"classic quorum", 3, 2, 2, true},          // r+w=4>3, 2w=4>3',
			'		{"sloppy ONE/ONE", 3, 1, 1, false},         // reads can miss writes entirely',
			'		{"read-heavy: cheap reads", 3, 1, 3, true}, // r+w=4>3, 2w=6>3',
			'		{"r+w>n but writes can split", 4, 3, 2, false}, // r+w=5>4 ok, 2w=4 NOT > 4',
			'	}',
			'	for _, c := range qcs {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%s: StronglyConsistent(n=%d, r=%d, w=%d)", c.name, c.n, c.r, c.w),',
			'			"want":  fmt.Sprintf("%v", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			got := StronglyConsistent(c.n, c.r, c.w)',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%v", got)',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	// ResolveRead: stale minority, then the version tie-break.',
			'	type rc struct {',
			'		name    string',
			'		replies []Reply',
			'		want    string',
			'	}',
			'	rcs := []rc{',
			'		{"stale minority loses", []Reply{{"cart-v2", 2}, {"cart-v2", 2}, {"cart-v1", 1}}, "cart-v2"},',
			'		{"version tie → lexicographically largest", []Reply{{"apple", 7}, {"banana", 7}, {"apple", 7}}, "banana"},',
			'	}',
			'	for _, c := range rcs {',
			'		r := map[string]any{',
			'			"input": fmt.Sprintf("%s: ResolveRead(%v)", c.name, c.replies),',
			'			"want":  fmt.Sprintf("%q", c.want),',
			'		}',
			'		runCase(r, func() {',
			'			// pass a copy — a sorting implementation must not corrupt the table',
			'			got := ResolveRead(append([]Reply(nil), c.replies...))',
			'			r["pass"] = got == c.want',
			'			r["got"] = fmt.Sprintf("%q", got)',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// Reply is one replica\'s answer to a read: the value it holds and',
			'// the version counter attached when that value was written.',
			'type Reply struct {',
			'	Value   string',
			'	Version int',
			'}',
			'',
			'// StronglyConsistent reports whether an (n, r, w) configuration',
			'// guarantees that every read sees the latest completed write.',
			'//',
			'// Both conditions are pigeonhole arguments about set intersection:',
			'//   r+w > n — an r-node read set and a w-node write set cannot fit',
			'//     disjointly inside n nodes, so every read includes at least one',
			'//     replica holding the newest acknowledged write.',
			'//   2w > n — likewise two w-node write sets must share a replica,',
			'//     so concurrent writes cannot both complete on disjoint sets',
			'//     with neither aware of the other; the shared replica version-',
			'//     orders them. r+w > n alone still allows this split (n=4,',
			'//     r=3, w=2: writes to {R1,R2} and {R3,R4} both "succeed").',
			'func StronglyConsistent(n, r, w int) bool {',
			'	return r+w > n && 2*w > n',
			'}',
			'',
			'// ResolveRead picks the winning value from quorum read replies.',
			'//',
			'// A single linear scan keeps the best reply seen so far, ordering',
			'// by (Version, Value) lexicographically. Seeding Version at -1 lets',
			'// the first real reply (versions are non-negative) always win the',
			'// seat, so no special empty/first-element handling is needed.',
			'func ResolveRead(replies []Reply) string {',
			'	best := Reply{Version: -1}',
			'	for _, rep := range replies {',
			'		if rep.Version > best.Version ||',
			'			(rep.Version == best.Version && rep.Value > best.Value) {',
			'			best = rep',
			'		}',
			'	}',
			'	return best.Value',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>The general principle: quorum intersection</h3>' +
			'<p>Strong consistency without a leader comes from making <em>any two operations ' +
			'that must see each other share a node</em>. That is the whole trick, and it is ' +
			'pure pigeonhole: <strong>quorum intersection</strong> — if two subsets of an ' +
			'n-node set have sizes summing to more than n, they overlap. ' +
			'<code>r + w &gt; n</code> makes reads overlap writes; <code>2w &gt; n</code> makes ' +
			'writes overlap each other. Drop either and a specific failure appears: drop the ' +
			'first and a read can land on all-stale replicas; drop the second and two writers ' +
			'can both get acknowledged on disjoint sets — split brain with no arbiter.</p>' +
			'<h3>The dial: latency vs. safety</h3>' +
			'<p>The inequalities are a budget you can spend either way. ' +
			'<code>w=n, r=1</code> makes reads blazing fast but writes wait for every replica ' +
			'(and stall if one is down). <code>w=1, r=n</code> is the reverse. ' +
			'<code>r = w = ⌈(n+1)/2⌉</code> balances both — that is Cassandra\'s ' +
			'<code>QUORUM</code>, versus <code>ONE</code> (fast, eventually consistent) and ' +
			'<code>ALL</code> (slow, fragile). Dynamo-style stores let every request choose, ' +
			'which is why the interview phrase is <em>tunable consistency</em>.</p>',
			{ code: 'best := Reply{Version: -1}\nfor _, rep := range replies {\n\tif rep.Version > best.Version ||\n\t\t(rep.Version == best.Version && rep.Value > best.Value) {\n\t\tbest = rep\n\t}\n}' },
			'<h3>Read repair, and what the tie-break papers over</h3>' +
			'<p>ResolveRead is half of <em>read repair</em>: having spotted stale replicas in ' +
			'the reply set, real systems write the winning value back to them, healing entropy ' +
			'on the read path. The Value tie-break here is deliberately arbitrary — a single ' +
			'integer version cannot tell "newer" from "concurrent". Vector clocks (the next ' +
			'problem) detect true concurrency, and Merkle trees (after that) repair replicas ' +
			'that reads never touch.</p>',
		],
		complexity: { time: 'O(len(replies))', space: 'O(1)' },
	});
})();
