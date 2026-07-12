/* Rolling Update Math — Workloads (Medium). The deployment controller's
 * rollout loop under maxSurge/maxUnavailable, as a pure state machine.
 * Exact-table harness: the step sequence is fully deterministic, so the
 * tests compare the whole recorded trace.
 */
(function () {
	'use strict';
	var T = GoLearnCKA;

	// The diagram is generated: nine stacked-bar columns, one per recorded
	// state of the classic 4-replica / surge=1 / unavailable=0 rollout,
	// pinched between the surge ceiling and the availability floor.
	var DIAGRAM = (function () {
		var states = [[4, 0], [4, 1], [3, 1], [3, 2], [2, 2], [2, 3], [1, 3], [1, 4], [0, 4]];
		var cellH = 15, cellW = 32, gap = 50, baseX = 20, baseY = 158;
		var s = '<svg class="dg" viewBox="0 0 640 218" width="640" height="218" role="img" aria-label="rolling update: pod counts stepping between the surge ceiling and the availability floor">';
		// legend + parameters
		s += '<rect x="20" y="14" width="12" height="12" rx="2" fill="none" stroke="var(--ok)" stroke-width="1.6"/>';
		s += '<text x="38" y="25" class="lbl">new (ready)</text>';
		s += '<rect x="122" y="14" width="12" height="12" rx="2" fill="none" stroke="var(--edge)"/>';
		s += '<text x="140" y="25" class="lbl">old</text>';
		s += '<text x="250" y="25" class="lbl">replicas=4 · maxSurge=1 · maxUnavailable=0</text>';
		// ceiling (5 pods) and floor (4 pods)
		s += '<line x1="14" y1="83" x2="466" y2="83" stroke="var(--dim)" stroke-dasharray="6 4"/>';
		s += '<line x1="14" y1="98" x2="466" y2="98" stroke="var(--dim)" stroke-dasharray="2 3"/>';
		s += '<text x="472" y="87" class="lbl">ceiling = replicas+surge = 5</text>';
		s += '<text x="472" y="102" class="lbl">floor = replicas−unavail = 4</text>';
		for (var i = 0; i < states.length; i++) {
			var x = baseX + i * gap;
			var level = 0, n;
			for (n = 0; n < states[i][1]; n++) { // new pods at the bottom
				s += '<rect x="' + x + '" y="' + (baseY - (level + 1) * cellH + 2) + '" width="' + (cellW - 2) + '" height="' + (cellH - 3) + '" rx="2" fill="none" stroke="var(--ok)" stroke-width="1.6"/>';
				level++;
			}
			for (n = 0; n < states[i][0]; n++) { // old pods stacked above
				s += '<rect x="' + x + '" y="' + (baseY - (level + 1) * cellH + 2) + '" width="' + (cellW - 2) + '" height="' + (cellH - 3) + '" rx="2" fill="none" stroke="var(--edge)"/>';
				level++;
			}
			s += '<text x="' + (x + cellW / 2) + '" y="' + (baseY + 15) + '" text-anchor="middle" class="lbl">' + i + '</text>';
		}
		s += '<path d="M 20 192 L 460 192" stroke="var(--dim)" stroke-width="1.4" marker-end="url(#dgArrowRUP)" fill="none"/>';
		s += '<text x="20" y="209" class="lbl">each iteration: new ↑ to the ceiling, then old ↓ to the floor — never below the floor, never above the ceiling</text>';
		s += '<defs><marker id="dgArrowRUP" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">';
		s += '<path d="M0,0 L8,4 L0,8 z" fill="var(--dim)"/></marker></defs>';
		s += '</svg>';
		return s;
	})();

	T.problem({
		id: 'rolling-update',
		title: 'Rolling Update Math',
		nav: 'Rolling Update',
		difficulty: 'Medium',
		category: 'Workloads',
		task: 'Implement Steps — replay the rollout loop and record every state change. Make all 5 tests pass.',

		prose: [
			'<h2>Rolling Update Math</h2>' +
			'<p>You run <code>kubectl set image deployment/web app=web:v2</code>. Nothing restarts ' +
			'in place — the deployment controller creates a second ReplicaSet and walks pod ' +
			'counts from <em>all-old</em> to <em>all-new</em>, constrained by two knobs:</p>' +
			'<ul>' +
			'<li><code>maxSurge</code> — how many pods may exist <em>above</em> the desired replica count (temporary extra capacity for the swap).</li>' +
			'<li><code>maxUnavailable</code> — how many pods may be missing <em>below</em> the desired count.</li>' +
			'</ul>' +
			'<p>Both are absolute counts here. In real manifests they may also be percentages ' +
			'of <code>replicas</code>; those convert to counts by rounding <strong>surge up</strong> and ' +
			'<strong>unavailable down</strong> — Kubernetes always errs toward more pods running.</p>' +
			'<h3>The controller loop</h3>' +
			'<p>Implement <code>Steps(replicas, maxSurge, maxUnavailable)</code>, reproducing the ' +
			'controller\'s decision procedure exactly:</p>' +
			'<ol>' +
			'<li>Start with <code>old = replicas</code>, <code>new = 0</code>. Record this initial state as the first entry.</li>' +
			'<li>Loop until <code>old == 0</code> and <code>new == replicas</code>. Each iteration:' +
			'<ol type="a">' +
			'<li><strong>Scale up first:</strong> raise <code>new</code> to <code>min(replicas, replicas + maxSurge − old)</code> ' +
			'— as many new pods as fit under the total-pod ceiling, but never more than the desired count. ' +
			'If <code>new</code> changed, record a step.</li>' +
			'<li><strong>Then scale down:</strong> remove <code>min(old, old + new − (replicas − maxUnavailable))</code> ' +
			'old pods — only as many as keep the total at or above the availability floor ' +
			'(if that count is zero or negative, remove nothing). If <code>old</code> changed, record a step.</li>' +
			'</ol></li>' +
			'</ol>' +
			'<p>Every recorded entry is the string <code>"old=X new=Y"</code>, so the first entry is ' +
			'always <code>"old=replicas new=0"</code> and the last is <code>"old=0 new=replicas"</code>.</p>' +
			'<p><strong>Simplification:</strong> we assume every new pod becomes Ready the instant it is ' +
			'created. The real controller only counts <em>ready</em> pods against the floor — a slow or ' +
			'failing readiness probe stalls the scale-down, which is exactly what stops a rollout from ' +
			'replacing a healthy fleet with a broken image. The counting logic is otherwise identical.</p>' +
			'<h3>Example</h3>',
			{ code: 'Steps(4, 1, 0) → ["old=4 new=0", "old=4 new=1", "old=3 new=1", "old=3 new=2",\n                  "old=2 new=2", "old=2 new=3", "old=1 new=3", "old=1 new=4",\n                  "old=0 new=4"]\nSteps(3, 3, 0) → ["old=3 new=0", "old=3 new=3", "old=0 new=3"]', lang: 'txt' },
			DIAGRAM,
		],

		starter: [
			'package main',
			'',
			'// Steps simulates the deployment controller\'s rollout loop for a',
			'// Deployment of `replicas` pods being replaced under maxSurge /',
			'// maxUnavailable (absolute counts).',
			'//',
			'// Starting from old=replicas, new=0, each iteration first scales the',
			'// new ReplicaSet up to the ceiling (old+new <= replicas+maxSurge and',
			'// new <= replicas), then scales the old one down to the floor',
			'// (old+new >= replicas-maxUnavailable). Every scale action that',
			'// changed a count appends "old=X new=Y"; the initial state is the',
			'// first entry. New pods are assumed Ready immediately.',
			'func Steps(replicas, maxSurge, maxUnavailable int) []string {',
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
			'	"reflect"',
			'	"strings"',
			')',
			'',
			T.HARNESS_RT,
			'',
			'func main() {',
			'	type tc struct {',
			'		name                             string',
			'		replicas, maxSurge, maxUnavail   int',
			'		want                             []string',
			'	}',
			'	cases := []tc{',
			'		{"zero-downtime classic: 4 replicas, surge=1, unavailable=0", 4, 1, 0,',
			'			[]string{"old=4 new=0", "old=4 new=1", "old=3 new=1", "old=3 new=2",',
			'				"old=2 new=2", "old=2 new=3", "old=1 new=3", "old=1 new=4", "old=0 new=4"}},',
			'		{"capacity-constrained: 4 replicas, surge=0, unavailable=1 (down first)", 4, 0, 1,',
			'			[]string{"old=4 new=0", "old=3 new=0", "old=3 new=1", "old=2 new=1",',
			'				"old=2 new=2", "old=1 new=2", "old=1 new=3", "old=0 new=3", "old=0 new=4"}},',
			'		{"both knobs: 4 replicas, surge=1, unavailable=1", 4, 1, 1,',
			'			[]string{"old=4 new=0", "old=4 new=1", "old=2 new=1", "old=2 new=3",',
			'				"old=0 new=3", "old=0 new=4"}},',
			'		{"blue/green-ish: 3 replicas, surge=3, unavailable=0", 3, 3, 0,',
			'			[]string{"old=3 new=0", "old=3 new=3", "old=0 new=3"}},',
			'		{"recreate-like: 2 replicas, surge=0, unavailable=2", 2, 0, 2,',
			'			[]string{"old=2 new=0", "old=0 new=0", "old=0 new=2"}},',
			'	}',
			'	results := make([]map[string]any, 0, len(cases))',
			'	for _, c := range cases {',
			'		r := map[string]any{',
			'			"input": c.name,',
			'			"want":  strings.Join(c.want, " → "),',
			'		}',
			'		runCase(r, func() {',
			'			got := Steps(c.replicas, c.maxSurge, c.maxUnavail)',
			'			r["pass"] = reflect.DeepEqual(got, c.want)',
			'			r["got"] = strings.Join(got, " → ")',
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
			'import "fmt"',
			'',
			'// Steps simulates the deployment controller\'s rollout loop for a',
			'// Deployment of `replicas` pods being replaced under maxSurge /',
			'// maxUnavailable (absolute counts).',
			'//',
			'// The loop enforces two invariants and nothing else:',
			'//   old + new <= replicas + maxSurge        (the ceiling)',
			'//   old + new >= replicas - maxUnavailable  (the floor)',
			'// Scale-up runs before scale-down each iteration because the real',
			'// controller reconciles the same way: create replacements first,',
			'// then retire what the floor no longer requires. New pods are',
			'// assumed Ready immediately (the real floor counts ready pods).',
			'func Steps(replicas, maxSurge, maxUnavailable int) []string {',
			'	old, neu := replicas, 0 // "new" is a keyword-adjacent name; neu avoids shadowing confusion',
			'	steps := []string{fmt.Sprintf("old=%d new=%d", old, neu)}',
			'',
			'	for old != 0 || neu != replicas {',
			'		// Scale up: fill the headroom under the ceiling, but never',
			'		// create more new pods than the desired replica count — surge',
			'		// bounds the TOTAL, it is not an invitation to over-provision',
			'		// the new ReplicaSet itself.',
			'		up := replicas + maxSurge - old',
			'		if up > replicas {',
			'			up = replicas',
			'		}',
			'		if up > neu {',
			'			neu = up',
			'			steps = append(steps, fmt.Sprintf("old=%d new=%d", old, neu))',
			'		}',
			'',
			'		// Scale down: remove exactly the old pods the floor lets go of.',
			'		// old+new-(replicas-maxUnavailable) is the slack above the floor;',
			'		// capping at `old` matters near the end, when the slack can',
			'		// exceed the old pods that still exist.',
			'		down := old + neu - (replicas - maxUnavailable)',
			'		if down > old {',
			'			down = old',
			'		}',
			'		if down > 0 {',
			'			old -= down',
			'			steps = append(steps, fmt.Sprintf("old=%d new=%d", old, neu))',
			'		}',
			'	}',
			'	return steps',
			'}',
			'',
		].join('\n'),

		explanation: [
			'<h3>Two invariants, one loop</h3>' +
			'<p>Strip away ReplicaSets and pod-template hashes and a rolling update is ' +
			'<strong>bounded-capacity incremental replacement</strong>: swap a fleet one slice at a ' +
			'time while never exceeding a resource ceiling and never dropping below a ' +
			'service floor. The same shape appears in node-pool upgrades, database ' +
			'connection-pool recycling, and canary fleet swaps — anywhere you replace ' +
			'live capacity without an outage window.</p>',
			{ code: 'up := replicas + maxSurge - old        // headroom under the ceiling\nif up > replicas { up = replicas }     // never over-provision the new set\nif up > neu { neu = up; record() }\n\ndown := old + neu - (replicas - maxUnavailable) // slack above the floor\nif down > old { down = old }\nif down > 0 { old -= down; record() }' },
			'<p>The two knobs trade against each other. <code>maxSurge</code> spends <em>extra ' +
			'capacity</em> (more pods than desired, briefly); <code>maxUnavailable</code> spends ' +
			'<em>availability</em> (fewer serving pods, briefly). Set both to zero and the loop ' +
			'deadlocks: scale-up cannot create a pod (the ceiling is already full of old pods) ' +
			'and scale-down cannot remove one (the floor needs every pod it has) — which is ' +
			'why the API server rejects a rollout where both values resolve to zero.</p>' +
			'<p>Percentages convert asymmetrically for the same reason the loop orders ' +
			'scale-up first: surge rounds <em>up</em>, unavailable rounds <em>down</em>, so rounding ' +
			'error always lands on the side of more running pods.</p>' +
			'<h3>On the exam</h3>' +
			'<p>This loop is what <code>kubectl rollout status deployment/web</code> is narrating ' +
			'("3 out of 4 new replicas have been updated…"), what <code>kubectl rollout history</code> ' +
			'versions, and what <code>kubectl rollout undo</code> replays in reverse (the old ' +
			'ReplicaSet is kept at 0 replicas precisely so undo can rehydrate it). When a ' +
			'question says <em>"no loss of serving capacity"</em>, it is dictating ' +
			'<code>maxUnavailable: 0</code> (so you need surge headroom); when it says <em>"the ' +
			'cluster cannot run any extra pods"</em> or <em>"no additional nodes"</em>, it is dictating ' +
			'<code>maxSurge: 0</code> (so you must give up capacity during the rollout). Read the ' +
			'constraint, pick the knob it pins, and let the other one provide the progress.</p>',
		],
		complexity: { time: 'O(replicas) states recorded', space: 'O(replicas)' },
	});
})();
