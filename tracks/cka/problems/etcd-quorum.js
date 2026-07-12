/* etcd Quorum — Cluster Architecture (lesson). Why every etcd write needs a
 * majority, and why control planes come in odd sizes. A lesson, not a
 * problem: the "algorithm" is one line of integer arithmetic, and the habit
 * being taught is reasoning about failure tolerance BEFORE sizing a cluster.
 */
(function () {
	'use strict';
	var T = GoLearnCKA;

	// Five members, three highlighted: the smallest majority of five. No
	// arrows, so no marker ids to claim from the global namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 500 150" width="500" height="150" role="img" aria-label="a 5-member etcd cluster: 3 members form a quorum, 2 may fail">' +
		'<text x="20" y="24" class="lbl">5-member etcd cluster — a write commits once a majority has it</text>' +
		// quorum members (solid, ok)
		'<circle cx="70" cy="70" r="22" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<circle cx="140" cy="70" r="22" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<circle cx="210" cy="70" r="22" fill="none" stroke="var(--ok)" stroke-width="2"/>' +
		'<text x="70" y="76" text-anchor="middle">m1</text>' +
		'<text x="140" y="76" text-anchor="middle">m2</text>' +
		'<text x="210" y="76" text-anchor="middle">m3</text>' +
		'<text x="140" y="122" text-anchor="middle" class="lbl" style="fill:var(--ok)">quorum = 3 (majority) — cluster keeps serving</text>' +
		// failed members (dashed, err)
		'<circle cx="330" cy="70" r="22" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<circle cx="400" cy="70" r="22" fill="none" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="330" y="76" text-anchor="middle" class="lbl">m4</text>' +
		'<text x="400" y="76" text-anchor="middle" class="lbl">m5</text>' +
		'<text x="365" y="122" text-anchor="middle" class="lbl">tolerates 2 failures</text>' +
		'</svg>';

	T.lesson({
		id: 'etcd-quorum',
		title: 'etcd Quorum & Failure Tolerance',
		nav: 'etcd quorum',
		category: 'Cluster Architecture',

		prose: [
			'<h2>etcd Quorum &amp; Failure Tolerance</h2>' +
			'<p>Your three-node control plane loses a machine and everything keeps ' +
			'working. It loses a second one and suddenly <code>kubectl</code> hangs, ' +
			'no pod can be created, and every controller freezes — even though one ' +
			'perfectly healthy etcd member is still up. Why?</p>' +
			'<p>etcd is the cluster’s only source of truth, and it uses the ' +
			'<strong>raft</strong> consensus protocol. Raft commits a write only after a ' +
			'<em>strict majority</em> of members — the <strong>quorum</strong> — has ' +
			'accepted it. The majority rule is what prevents <em>split-brain</em>: if the ' +
			'network partitions, at most <em>one</em> side can contain a majority, so at ' +
			'most one side can keep committing writes. Two halves of a cluster can never ' +
			'both believe they own the data. A member that cannot reach a quorum refuses ' +
			'writes — that lone healthy member above is protecting you, not failing you.</p>' +
			DIAGRAM +
			'<p>Quorum for <code>n</code> members is <code>n/2 + 1</code> (integer ' +
			'division), and the cluster tolerates <code>n − quorum</code> failures:</p>',
			{ code: 'members   quorum   tolerates\n   1        1         0\n   3        2         1\n   5        3         2\n   7        4         3', lang: 'txt' },
			'<p>Notice what happens between the rows: going from 3 members to 4 raises ' +
			'quorum from 2 to 3 but tolerance stays at 1 — the fourth member ' +
			'<em>costs</em> a machine and buys nothing. Even sizes always waste a node ' +
			'(4 tolerates no more than 3; 6 no more than 5), which is why etcd clusters ' +
			'are odd-sized, and why production control planes run 3 (tolerate one loss) ' +
			'or 5 (tolerate two, e.g. one per availability zone plus headroom). Beyond 7, ' +
			'every write waits on more followers and latency climbs for no practical ' +
			'gain in safety.</p>' +
			'<p>Fill in the two TODOs so the program prints the real table.</p>' +
			'<h3>On the exam</h3>' +
			'<p>The CKA leans on etcd two ways. First, <strong>backup and restore</strong>: ' +
			'<code>etcdctl snapshot save /backup/snap.db</code> (with ' +
			'<code>--endpoints</code>, <code>--cacert</code>, <code>--cert</code>, ' +
			'<code>--key</code> pointing at the certs from the etcd static-pod manifest) ' +
			'and <code>etcdctl snapshot restore</code> into a fresh data dir, then point ' +
			'the etcd manifest’s volume at it. Second, <strong>topology</strong>: ' +
			'<em>stacked</em> etcd runs on the control-plane nodes themselves (the ' +
			'kubeadm default — fewer machines, but losing a node costs you a control ' +
			'plane <em>and</em> an etcd member at once), while <em>external</em> etcd ' +
			'lives on its own machines so the two failure domains are independent. ' +
			'Either way, the quorum math above is what decides whether the cluster is ' +
			'still alive.</p>',
		],

		task: 'For each cluster size, compute quorum = n/2 + 1 and tolerates = n − quorum.',

		starter: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	// Common etcd cluster sizes. The entire cluster state lives in',
			'	// etcd, so its failure math IS the control plane\'s failure math.',
			'	sizes := []int{1, 3, 5, 7}',
			'',
			'	for _, n := range sizes {',
			'		// TODO: quorum is a strict majority: n/2 + 1 (integer',
			'		// division). The cluster survives as long as a quorum is',
			'		// reachable, so it tolerates n - quorum member failures.',
			'		quorum := 0    // TODO',
			'		tolerates := 0 // TODO',
			'',
			'		fmt.Printf("members=%d quorum=%d tolerates=%d\\n", n, quorum, tolerates)',
			'	}',
			'}',
			'',
		].join('\n'),

		check: function (stdout, flat) {
			return flat.indexOf('members=1 quorum=1 tolerates=0') !== -1 &&
				flat.indexOf('members=3 quorum=2 tolerates=1') !== -1 &&
				flat.indexOf('members=5 quorum=3 tolerates=2') !== -1 &&
				flat.indexOf('members=7 quorum=4 tolerates=3') !== -1;
		},

		solution: [
			'package main',
			'',
			'import "fmt"',
			'',
			'func main() {',
			'	// Common etcd cluster sizes. The entire cluster state lives in',
			'	// etcd, so its failure math IS the control plane\'s failure math.',
			'	sizes := []int{1, 3, 5, 7}',
			'',
			'	for _, n := range sizes {',
			'		// Integer division makes n/2+1 a STRICT majority for both',
			'		// parities: 4/2+1 = 3 of 4, 5/2+1 = 3 of 5. That is exactly',
			'		// why even sizes are wasted — 4 members need 3 alive, same',
			'		// tolerance as 3 members needing 2.',
			'		quorum := n/2 + 1',
			'',
			'		// Every member beyond the quorum is pure failure budget.',
			'		tolerates := n - quorum',
			'',
			'		fmt.Printf("members=%d quorum=%d tolerates=%d\\n", n, quorum, tolerates)',
			'	}',
			'}',
			'',
		].join('\n'),
	});
})();
