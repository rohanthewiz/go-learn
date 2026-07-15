/* Leader Election — Advanced (Medium). Lease-based leadership as a pure
 * function: acquire when empty, renew when holding, back off while fresh,
 * take over at expiry. The harness replays the cases that matter in
 * production — the exact-expiry boundary, the deposed leader who must not
 * steal back, and a full two-candidate failover.
 */
(function () {
	'use strict';
	var T = GoLearnK8s;

	// A lease timeline: A holds and then goes silent; B is rejected while the
	// lease is fresh and wins the moment it expires. Marker ids namespaced
	// (dgArrowKLEax*) because every track's SVGs share the page's id namespace.
	var DIAGRAM =
		'<svg class="dg" viewBox="0 0 560 200" width="560" height="200" role="img" aria-label="lease timeline: A acquires at t=0, stops renewing, the lease stays valid until RenewedAt plus Duration, and B takes over only after that expiry">' +
		// time axis
		'<path d="M 40 120 L 530 120" stroke="var(--edge)" stroke-width="1.6" marker-end="url(#dgArrowKLEax)"/>' +
		'<text x="536" y="138" class="lbl">t (s)</text>' +
		// A's held lease bar: 0..15
		'<rect x="40" y="90" width="300" height="22" rx="4" fill="var(--ok)" fill-opacity="0.25" stroke="var(--ok)"/>' +
		'<text x="190" y="105" text-anchor="middle" class="lbl">lease held by A (RenewedAt=0, Duration=15)</text>' +
		// B's held lease bar: 16..
		'<rect x="360" y="90" width="150" height="22" rx="4" fill="var(--accent)" fill-opacity="0.25" stroke="var(--accent)"/>' +
		'<text x="435" y="105" text-anchor="middle" class="lbl">held by B</text>' +
		// ticks
		'<path d="M 40 114 L 40 126" stroke="var(--edge)"/>' +
		'<text x="40" y="142" text-anchor="middle" class="lbl">0</text>' +
		'<path d="M 140 114 L 140 126" stroke="var(--edge)"/>' +
		'<text x="140" y="142" text-anchor="middle" class="lbl">5</text>' +
		'<path d="M 340 114 L 340 126" stroke="var(--err-edge)" stroke-width="2"/>' +
		'<text x="340" y="142" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">15 = expiry</text>' +
		'<path d="M 360 114 L 360 126" stroke="var(--edge)"/>' +
		'<text x="366" y="142" text-anchor="middle" class="lbl">16</text>' +
		// events
		'<path d="M 40 60 L 40 86" stroke="var(--ok)" stroke-width="1.6" marker-end="url(#dgArrowKLElead)"/>' +
		'<text x="44" y="52" class="lbl" style="fill:var(--ok)">A acquires… then goes silent (GC pause? crash?)</text>' +
		'<path d="M 140 170 L 140 116" stroke="var(--err-edge)" stroke-width="1.6" stroke-dasharray="5 4"/>' +
		'<text x="140" y="186" text-anchor="middle" class="lbl" style="fill:var(--err-fg)">B tries @5: fresh → rejected</text>' +
		'<path d="M 380 170 L 366 116" stroke="var(--accent)" stroke-width="1.6" marker-end="url(#dgArrowKLEacc)"/>' +
		'<text x="400" y="186" text-anchor="middle" class="lbl">B tries @16: expired → takeover</text>' +
		'<text x="40" y="24" class="lbl">nobody ever tells B it may lead — B infers it from timestamps on a shared object</text>' +
		'<defs>' +
		'<marker id="dgArrowKLEax" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--edge)"/></marker>' +
		'<marker id="dgArrowKLElead" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--ok)"/></marker>' +
		'<marker id="dgArrowKLEacc" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">' +
		'<path d="M0,0 L8,4 L0,8 z" fill="var(--accent)"/></marker>' +
		'</defs>' +
		'</svg>';

	T.problem({
		id: 'leader-election',
		title: 'Leader Election: The Lease',
		nav: 'Leader election',
		difficulty: 'Medium',
		category: 'Advanced',
		task: 'Implement TryAcquire — renew, acquire, back off, or take over an expired lease; all 6 tests.',

		prose: [
			'<h2>Leader Election: The Lease</h2>' +
			'<p>You run your controller with <code>replicas: 2</code> for availability, ' +
			'and now both replicas reconcile the same objects — every change happens ' +
			'twice, scale-ups race scale-downs, and your logs interleave two writers ' +
			'fighting over one Deployment. Controllers must be highly available ' +
			'<em>and</em> act as exactly one writer. Kubernetes squares that with ' +
			'<strong>leader election</strong>: all replicas run, one leads, the rest ' +
			'stand by, hot.</p>' +
			'<p>The mechanism is disarmingly small. There is no Raft, no Paxos in your ' +
			'process — just a <strong>Lease</strong> object ' +
			'(<code>coordination.k8s.io/v1</code>) that candidates fight over with ' +
			'plain optimistic writes; etcd\'s compare-and-swap underneath the API ' +
			'server does the actual arbitration. Each candidate periodically calls the ' +
			'same routine, and every call lands in one of four cases:</p>' +
			'<ul>' +
			'<li><strong>I already hold it</strong> → renew: bump ' +
			'<code>RenewedAt</code>, keep leading.</li>' +
			'<li><strong>Nobody holds it</strong> → acquire it.</li>' +
			'<li><strong>Someone else holds it and it is fresh</strong> ' +
			'(<code>now &lt; RenewedAt + Duration</code>) → back off, change ' +
			'<em>nothing</em>.</li>' +
			'<li><strong>Someone else holds it but it expired</strong> ' +
			'(<code>now &gt;= RenewedAt + Duration</code>) → the holder is presumed ' +
			'dead: take over.</li>' +
			'</ul>' +
			DIAGRAM +
			'<h3>Your job</h3>' +
			'<p>Implement <code>TryAcquire(l, me, now)</code> returning the resulting ' +
			'lease and whether <code>me</code> leads after the call. Treat ' +
			'<code>now == RenewedAt + Duration</code> as expired (the boundary is a ' +
			'test). When another holder\'s lease is fresh, return the lease ' +
			'<em>unchanged</em> — a follower never writes. <code>Duration</code> is ' +
			'part of the lease spec: carry it through untouched.</p>',
			{ code: 'l = {Holder:"", Duration:15}\nTryAcquire(l, "ctrl-a", 100) → {Holder:"ctrl-a", RenewedAt:100, Duration:15}, true\nTryAcquire(^, "ctrl-b", 110) → unchanged, false   (fresh until 115)\nTryAcquire(^, "ctrl-b", 115) → {Holder:"ctrl-b", RenewedAt:115, Duration:15}, true', lang: 'txt' },
		],

		starter: [
			'package main',
			'',
			'// Lease models coordination.k8s.io/v1 Lease: who holds it, when they',
			'// last renewed, and how long a renewal is good for. RenewedAt and the',
			'// now parameter are a simulated clock in seconds. The zero value',
			'// (Holder == "") is an unheld lease.',
			'type Lease struct {',
			'	Holder    string',
			'	RenewedAt int',
			'	Duration  int // seconds a renewal remains valid (leaseDurationSeconds)',
			'}',
			'',
			'// TryAcquire is one candidate\'s periodic attempt at the lease. It',
			'// returns the lease as it stands after the attempt and whether me is',
			'// the leader. Four cases:',
			'//   - l.Holder == me                     -> renew: RenewedAt = now, leader',
			'//   - l.Holder == ""                     -> acquire: Holder = me, RenewedAt = now, leader',
			'//   - other holder, now <  RenewedAt+Duration -> fresh: return l UNCHANGED, not leader',
			'//   - other holder, now >= RenewedAt+Duration -> expired: take over, leader',
			'// Duration is lease spec, never modified here.',
			'func TryAcquire(l Lease, me string, now int) (Lease, bool) {',
			'	// your code here',
			'	return l, false',
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
			'	results := make([]map[string]any, 0, 6)',
			'',
			'	// The first five cases are single calls: (lease, me, now) -> (lease, leader).',
			'	type tc struct {',
			'		name     string',
			'		l        Lease',
			'		me       string',
			'		now      int',
			'		wantL    Lease',
			'		wantLead bool',
			'	}',
			'	cases := []tc{',
			'		{"fresh acquire: empty lease is taken immediately",',
			'			Lease{Duration: 15}, "ctrl-a", 100,',
			'			Lease{Holder: "ctrl-a", RenewedAt: 100, Duration: 15}, true},',
			'		{"renew: the holder bumps RenewedAt and stays leader",',
			'			Lease{Holder: "ctrl-a", RenewedAt: 100, Duration: 15}, "ctrl-a", 110,',
			'			Lease{Holder: "ctrl-a", RenewedAt: 110, Duration: 15}, true},',
			'		{"contender vs fresh lease: rejected, holder AND RenewedAt untouched",',
			'			Lease{Holder: "ctrl-a", RenewedAt: 100, Duration: 15}, "ctrl-b", 110,',
			'			Lease{Holder: "ctrl-a", RenewedAt: 100, Duration: 15}, false},',
			'		{"takeover exactly AT expiry: now == RenewedAt+Duration counts as expired",',
			'			Lease{Holder: "ctrl-a", RenewedAt: 100, Duration: 15}, "ctrl-b", 115,',
			'			Lease{Holder: "ctrl-b", RenewedAt: 115, Duration: 15}, true},',
			'		{"deposed leader returns: must NOT steal back a fresh lease",',
			'			Lease{Holder: "ctrl-b", RenewedAt: 130, Duration: 15}, "ctrl-a", 140,',
			'			Lease{Holder: "ctrl-b", RenewedAt: 130, Duration: 15}, false},',
			'	}',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  fmt.Sprintf("%+v leader=%v", c.wantL, c.wantLead),',
			'		}',
			'		runCase(r, func() {',
			'			gotL, gotLead := TryAcquire(c.l, c.me, c.now)',
			'			r["got"] = fmt.Sprintf("%+v leader=%v", gotL, gotLead)',
			'			r["pass"] = gotL == c.wantL && gotLead == c.wantLead',
			'		})',
			'		results = append(results, r)',
			'	}',
			'',
			'	// Full failover replay: the lease is threaded through successive',
			'	// calls exactly as it would live in etcd between real requests.',
			'	raceWant := "A@0=true B@5=false B@15=true A@20=false holder=B"',
			'	r := map[string]any{',
			'		"input": "two-candidate race: A leads, goes silent, B takes over, A returns as follower",',
			'		"want":  raceWant,',
			'	}',
			'	runCase(r, func() {',
			'		l := Lease{Duration: 15}',
			'		l, a0 := TryAcquire(l, "A", 0)   // A acquires',
			'		l, b5 := TryAcquire(l, "B", 5)   // fresh -> B backs off',
			'		// A misses every renewal (crashed, partitioned, GC-paused...).',
			'		l, b15 := TryAcquire(l, "B", 15) // 0+15 expired -> B takes over',
			'		l, a20 := TryAcquire(l, "A", 20) // B renewed at 15, fresh until 30',
			'		got := fmt.Sprintf("A@0=%v B@5=%v B@15=%v A@20=%v holder=%s", a0, b5, b15, a20, l.Holder)',
			'		r["got"] = got',
			'		r["pass"] = got == raceWant',
			'	})',
			'	results = append(results, r)',
			'',
			'	emitResults(results)',
			'}',
			'',
		].join('\n'),

		solution: [
			'package main',
			'',
			'// Lease models coordination.k8s.io/v1 Lease: who holds it, when they',
			'// last renewed, and how long a renewal is good for. RenewedAt and the',
			'// now parameter are a simulated clock in seconds. The zero value',
			'// (Holder == "") is an unheld lease.',
			'type Lease struct {',
			'	Holder    string',
			'	RenewedAt int',
			'	Duration  int // seconds a renewal remains valid (leaseDurationSeconds)',
			'}',
			'',
			'// TryAcquire is one candidate\'s periodic attempt at the lease.',
			'//',
			'// The case order encodes the protocol\'s priorities: identity first',
			'// (the holder renews unconditionally — checking expiry on your own',
			'// lease would make a slow leader depose itself mid-write), then the',
			'// free acquire, and only then the freshness arithmetic that arbitrates',
			'// between strangers.',
			'func TryAcquire(l Lease, me string, now int) (Lease, bool) {',
			'	if l.Holder == me {',
			'		// Renewal. Only RenewedAt moves: Duration is lease SPEC',
			'		// (configuration), not state, and rewriting it on every',
			'		// heartbeat would let a candidate quietly change the rules.',
			'		l.RenewedAt = now',
			'		return l, true',
			'	}',
			'	if l.Holder == "" {',
			'		l.Holder = me',
			'		l.RenewedAt = now',
			'		return l, true',
			'	}',
			'	// Someone else holds it. now >= RenewedAt+Duration means expired:',
			'	// >= not >, because Duration promises validity for Duration seconds',
			'	// STARTING at RenewedAt — the interval is half-open, and one second',
			'	// of extra grace on every failover just prolongs the outage.',
			'	if now >= l.RenewedAt+l.Duration {',
			'		l.Holder = me',
			'		l.RenewedAt = now',
			'		return l, true',
			'	}',
			'	// Fresh lease held by another: return it byte-for-byte unchanged.',
			'	// A follower that writes ANYTHING would bump the object\'s',
			'	// resourceVersion and make every other candidate\'s',
			'	// compare-and-swap fail for no reason.',
			'	return l, false',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Optimistic concurrency does the hard part</h3>' +
			'<p>The function you wrote looks too simple to be safe: two candidates ' +
			'could both read an expired lease, both decide to take over, and both ' +
			'write. In the real cluster that race is closed not by your code but by ' +
			'the API server: every object carries a <code>resourceVersion</code>, an ' +
			'update must name the version it read, and etcd applies it with a ' +
			'compare-and-swap. Two writers racing from the same version → one wins, ' +
			'the other gets a <code>409 Conflict</code>, re-reads, and now sees a ' +
			'fresh lease held by the winner — your case 3. Leader election is just ' +
			'this pure function plus retry-on-conflict, which is why it needs no ' +
			'consensus library in your binary.</p>' +
			'<h3>Three timers, not one</h3>' +
			'<p>client-go\'s <code>leaderelection</code> package runs this loop with ' +
			'three durations: <code>leaseDuration</code> (how long a renewal is valid ' +
			'— your <code>Duration</code>), <code>renewDeadline</code> (how long the ' +
			'leader keeps trying to renew before voluntarily stepping down), and ' +
			'<code>retryPeriod</code> (how often everyone calls the equivalent of ' +
			'<code>TryAcquire</code>). The invariant ' +
			'<code>leaseDuration &gt; renewDeadline &gt; retryPeriod</code> gives a ' +
			'live leader several renewal attempts before anyone may seize the lease. ' +
			'And because expiry is judged by comparing <em>your</em> clock to a ' +
			'timestamp <em>someone else</em> wrote, clock skew between nodes eats ' +
			'directly into that safety margin — one more reason the defaults ' +
			'(15s/10s/2s) are conservative.</p>' +
			'<p>The load-bearing details in the solution:</p>',
			{ code: 'if l.Holder == me {        // identity BEFORE expiry: a slow leader\n\tl.RenewedAt = now      // renews rather than deposing itself\n\treturn l, true\n}\nif now >= l.RenewedAt+l.Duration { /* takeover */ }\nreturn l, false            // fresh + foreign: change NOTHING' },
			'<h3>On the cluster / when debugging</h3>' +
			'<p>The control plane itself runs this exact protocol — see it live:</p>' +
			'<p><code>kubectl get lease -n kube-system</code> lists ' +
			'<code>kube-scheduler</code> and <code>kube-controller-manager</code>, and ' +
			'<code>kubectl get lease kube-scheduler -n kube-system -o yaml</code> shows ' +
			'<code>holderIdentity</code>, <code>renewTime</code>, and ' +
			'<code>leaseDurationSeconds</code> — your three fields. Watch ' +
			'<code>renewTime</code> tick every few seconds; kill the holder and watch ' +
			'<code>holderIdentity</code> flip after the lease expires. When a ' +
			'controller logs <code>failed to renew lease ... timed out</code> it is ' +
			'stepping down past <code>renewDeadline</code> — expect a failover, not a ' +
			'crash.</p>' +
			'<p>The classic production trap is <strong>split brain by pause</strong>: ' +
			'a leader stalls (long GC, <code>SIGSTOP</code>, VM live-migration), the ' +
			'lease expires, a peer takes over — and then the old leader wakes and ' +
			'keeps executing its half-finished plan, because nothing interrupted it. ' +
			'The lease grants leadership; it cannot revoke CPU time already scheduled. ' +
			'Correct controllers therefore <em>fence</em>: re-check ' +
			'<code>holderIdentity == me</code> (or run every write through a ' +
			'resourceVersion precondition) before any side effect that must be ' +
			'leader-only. If you remember one thing: holding the lease is a claim ' +
			'about the <em>past</em> read, never a guarantee about the write you are ' +
			'about to make.</p>',
		],
		complexity: { time: 'O(1) — four constant-time cases', space: 'O(1)' },
	});
})();
